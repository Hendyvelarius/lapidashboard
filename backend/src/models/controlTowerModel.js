const { connect } = require('../../config/sqlserver');
const { connectSnapshot } = require('../../config/sqlserverSnapshot');
const sql = require('mssql');

// ============================================================================
// Processing Control Tower
//
// Live monitoring of every process step in t_alur_proses, scored against the
// standard lead time so that "start-tap / finish-tap" misconduct and abnormal
// durations surface as alerts.
//
// Vocabulary used throughout this file:
//
//   logical step   one (Batch_No, seq_id, No_urut). When an operator taps
//                  "pending" the app writes the step as several physical rows
//                  (distinct Urutan); those are merged here and only the
//                  working segments are summed -- the pause between two
//                  segments is NOT counted as work time.
//   standard       m_alur_detail.lead_time (minutes) for the product's flow,
//                  keyed on (Seq_ID, No_urut, kode_tahapan); falls back to the
//                  global default m_tahapan.lead_time. t_alur_proses.lead_time
//                  is deliberately ignored: it is a snapshot copied at batch
//                  creation and has been bulk-rewritten before.
//   ratio          actual minutes / standard minutes (shown as a percentage,
//                  e.g. 300-min standard done in 60 min = 20%).
//   severity       clerical  the dept marked this process as clerical
//                            (LAPI_Report.ct_clerical): an admin tap such as
//                            "Approve Timbang" that may legitimately take a
//                            second. Never scored, never alerted.
//                  red       work time under RED_MAX_MINUTES regardless of the
//                            standard (an instant tap) -- not configurable
//                  yellow    at least fast_factor times faster than the standard
//                            (ratio <= 1/fast_factor) or at least slow_factor
//                            times slower (ratio >= slow_factor); per-dept
//                            factors in LAPI_Report.ct_threshold
//                  green     everything else
//                  nostd     no standard anywhere -> excluded from scoring and
//                            listed on the department's To-Do instead
//   dept           t_alur_proses.dept, except that 'PN' is resolved to PN1/PN2
//                  through m_product_pn_group.Group_Dept of the batch's product.
//                  Configuration (thresholds, clerical list) is keyed on this
//                  resolved dept, so PN1 and PN2 are configured independently
//                  even though they share m_tahapan rows with dept = 'PN'.
//
// The database is SQL Server 2008 R2: no IIF/CONCAT/STRING_AGG/OFFSET, and a
// CTE is re-evaluated per reference, so the pipeline is staged in temp tables.
// ============================================================================

const RED_MAX_MINUTES = 2;
const DEFAULT_THRESHOLD = { fast_factor: 2, slow_factor: 2 };
const SCOPED_DEPTS = ['PN1', 'PN2', 'PC', 'QC', 'QA', 'MC'];
/** Departments that own the configuration (thresholds; their managers may edit any clerical list). */
const CONFIG_ADMIN_DEPTS = ['NT', 'PL', 'MS'];
/** Users who bypass every configuration gate. */
const CONFIG_SUPERUSERS = ['HWA'];
/** emp_JobLevelID values that count as a department manager ('PL' = the Plant heads). */
const MANAGER_JOB_LEVELS = ['MGR', 'PL'];
const SEVERITIES = ['red', 'yellow', 'green', 'nostd', 'clerical'];
const ACK_STATUSES = ['mistap', 'valid', 'followup', 'other'];
const MAX_FACTOR = 100;

/** m_tahapan.dept behind a resolved dept: PN1/PN2 both read the 'PN' rows. */
const baseDept = (dept) => (dept === 'PN1' || dept === 'PN2' ? 'PN' : dept);

const ACK_DB = process.env.LFSQL_Snapshot_Database || 'LAPI_Report';

// ----------------------------------------------------------------------------
// App-owned tables (LAPI_Report). Created on first use so a fresh environment
// needs no manual migration; the same DDL lives in backend/migrations for docs.
// ----------------------------------------------------------------------------
let tablesEnsured = false;
async function ensureTables() {
  if (tablesEnsured) return;
  const db = await connectSnapshot();

  // v1 stored the yellow rule as ratios (fast_ratio 0.5 = "half the standard").
  // Users think in "N times faster / slower", so the factors are now stored as
  // typed; existing rows are converted in place (fast_factor = 1 / fast_ratio).
  // Runs as its own batch: SQL Server binds column names of an existing table
  // at compile time, so the CREATE batch below would not even compile against
  // the old shape.
  await db.request().batch(`
    IF OBJECT_ID('dbo.ct_threshold', 'U') IS NOT NULL AND COL_LENGTH('dbo.ct_threshold', 'fast_factor') IS NULL
    BEGIN
      ALTER TABLE dbo.ct_threshold ADD fast_factor DECIMAL(6,2) NULL, slow_factor DECIMAL(6,2) NULL;
      EXEC('UPDATE dbo.ct_threshold
            SET fast_factor = CASE WHEN fast_ratio > 0 THEN ROUND(1.0 / fast_ratio, 2) ELSE ${DEFAULT_THRESHOLD.fast_factor} END,
                slow_factor = slow_ratio');
      EXEC('ALTER TABLE dbo.ct_threshold ALTER COLUMN fast_factor DECIMAL(6,2) NOT NULL;
            ALTER TABLE dbo.ct_threshold ALTER COLUMN slow_factor DECIMAL(6,2) NOT NULL;
            ALTER TABLE dbo.ct_threshold DROP COLUMN fast_ratio, slow_ratio');
    END;
  `);

  await db.request().batch(`
    IF OBJECT_ID('dbo.ct_threshold', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ct_threshold (
        dept            VARCHAR(10)   NOT NULL PRIMARY KEY,  -- '*' = default for every dept
        fast_factor     DECIMAL(6,2)  NOT NULL,              -- yellow when >= this many times faster than standard
        slow_factor     DECIMAL(6,2)  NOT NULL,              -- yellow when >= this many times slower than standard
        updated_by      VARCHAR(20)   NULL,
        updated_by_name NVARCHAR(100) NULL,
        updated_at      DATETIME      NOT NULL DEFAULT GETDATE()
      );
      INSERT INTO dbo.ct_threshold (dept, fast_factor, slow_factor)
      VALUES ('*', ${DEFAULT_THRESHOLD.fast_factor}, ${DEFAULT_THRESHOLD.slow_factor});
    END;

    -- Processes a department chose not to monitor. Keyed on the resolved dept
    -- (PN1 and PN2 keep separate lists even though both draw from m_tahapan
    -- rows with dept = 'PN').
    IF OBJECT_ID('dbo.ct_clerical', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ct_clerical (
        dept          VARCHAR(10)   NOT NULL,   -- PN1 | PN2 | PC | QC | QA | MC
        kode_tahapan  INT           NOT NULL,
        nama_tahapan  NVARCHAR(200) NULL,       -- snapshot for display / audit
        added_by      VARCHAR(20)   NULL,
        added_by_name NVARCHAR(100) NULL,
        added_at      DATETIME      NOT NULL DEFAULT GETDATE(),
        CONSTRAINT PK_ct_clerical PRIMARY KEY (dept, kode_tahapan)
      );
    END;

    IF OBJECT_ID('dbo.ct_alert_ack', 'U') IS NULL
    BEGIN
      CREATE TABLE dbo.ct_alert_ack (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        -- logical step key
        batch_no      NVARCHAR(50)  NOT NULL,
        seq_id        INT           NOT NULL,
        no_urut       INT           NOT NULL,
        -- snapshot of the alert as it was acknowledged, so the record stays
        -- meaningful even if thresholds or masters change later
        product_id    VARCHAR(50)   NULL,
        product_name  NVARCHAR(200) NULL,
        kode_tahapan  INT           NULL,
        nama_tahapan  NVARCHAR(200) NULL,
        dept          VARCHAR(10)   NULL,
        severity      VARCHAR(10)   NULL,
        duration_min  DECIMAL(12,1) NULL,
        standard_min  INT           NULL,
        ratio_pct     DECIMAL(12,1) NULL,
        start_date    DATETIME      NULL,
        end_date      DATETIME      NULL,
        pic           NVARCHAR(400) NULL,
        -- the acknowledgement itself
        ack_status    VARCHAR(20)   NOT NULL,   -- mistap | valid | followup | other
        ack_note      NVARCHAR(1000) NULL,
        ack_by        VARCHAR(20)   NOT NULL,
        ack_by_name   NVARCHAR(100) NULL,
        ack_dept      VARCHAR(10)   NULL,
        ack_at        DATETIME      NOT NULL DEFAULT GETDATE()
      );
      CREATE UNIQUE INDEX UX_ct_alert_ack_step ON dbo.ct_alert_ack (batch_no, seq_id, no_urut);
      CREATE INDEX IX_ct_alert_ack_end ON dbo.ct_alert_ack (dept, end_date);
      CREATE INDEX IX_ct_alert_ack_at ON dbo.ct_alert_ack (ack_at);
    END;
  `);
  tablesEnsured = true;
}

// ----------------------------------------------------------------------------
// Thresholds
// ----------------------------------------------------------------------------
async function getThresholds() {
  await ensureTables();
  const db = await connectSnapshot();
  const r = await db.request().query(`
    SELECT dept, fast_factor, slow_factor, updated_by, updated_by_name, updated_at
    FROM dbo.ct_threshold ORDER BY CASE WHEN dept = '*' THEN 0 ELSE 1 END, dept`);
  const rows = r.recordset.map((x) => ({
    dept: x.dept,
    fast_factor: Number(x.fast_factor),
    slow_factor: Number(x.slow_factor),
    updated_by: x.updated_by,
    updated_by_name: x.updated_by_name,
    updated_at: x.updated_at,
  }));
  if (!rows.some((x) => x.dept === '*')) rows.unshift({ dept: '*', ...DEFAULT_THRESHOLD });
  return { red_max_minutes: RED_MAX_MINUTES, depts: SCOPED_DEPTS, rows };
}

/**
 * Replace the threshold set. `rows` is [{ dept, fast_factor, slow_factor }]; a
 * dept absent from the list falls back to '*'. The '*' row is always kept.
 * A factor of 2 means "twice as fast" (actual <= half the standard) or "twice
 * as slow" (actual >= double the standard); 1 would flag every deviation, so
 * factors must be above 1.
 */
async function saveThresholds(rows, user) {
  await ensureTables();
  const clean = [];
  for (const r of rows || []) {
    const dept = String(r.dept || '').trim();
    if (dept !== '*' && !SCOPED_DEPTS.includes(dept)) throw new Error(`Dept tidak dikenal: '${dept}'`);
    const fast = Number(r.fast_factor), slow = Number(r.slow_factor);
    if (!(fast > 1 && fast <= MAX_FACTOR)) throw new Error(`${dept}: faktor "terlalu cepat" harus lebih dari 1 dan maksimal ${MAX_FACTOR}`);
    if (!(slow > 1 && slow <= MAX_FACTOR)) throw new Error(`${dept}: faktor "terlalu lama" harus lebih dari 1 dan maksimal ${MAX_FACTOR}`);
    clean.push({ dept, fast: Math.round(fast * 100) / 100, slow: Math.round(slow * 100) / 100 });
  }
  if (!clean.some((r) => r.dept === '*')) throw new Error('Default (*) threshold wajib ada');

  const db = await connectSnapshot();
  const tx = new sql.Transaction(db);
  await tx.begin();
  try {
    await new sql.Request(tx).query('DELETE FROM dbo.ct_threshold');
    for (const r of clean) {
      const req = new sql.Request(tx);
      req.input('dept', sql.VarChar(10), r.dept);
      req.input('fast', sql.Decimal(6, 2), r.fast);
      req.input('slow', sql.Decimal(6, 2), r.slow);
      req.input('by', sql.VarChar(20), user?.nik || null);
      req.input('byName', sql.NVarChar(100), user?.name || null);
      await req.query(`INSERT INTO dbo.ct_threshold (dept, fast_factor, slow_factor, updated_by, updated_by_name, updated_at)
                       VALUES (@dept, @fast, @slow, @by, @byName, GETDATE())`);
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return getThresholds();
}

// ----------------------------------------------------------------------------
// SQL building blocks
// ----------------------------------------------------------------------------

/** VALUES list for the #thr temp table -- numbers and whitelisted depts only. */
function thresholdValues(thr) {
  const byDept = new Map(thr.rows.map((r) => [r.dept, r]));
  const def = byDept.get('*') || DEFAULT_THRESHOLD;
  const lines = [`('*', ${Number(def.fast_factor)}, ${Number(def.slow_factor)})`];
  for (const d of SCOPED_DEPTS) {
    const r = byDept.get(d) || def;
    lines.push(`('${d}', ${Number(r.fast_factor)}, ${Number(r.slow_factor)})`);
  }
  return lines.join(',\n      ');
}

/** `dept IN (...)` predicate for a whitelisted scope, or '1 = 1' for everything. */
function deptPredicate(depts, col) {
  const list = (depts || []).filter((d) => SCOPED_DEPTS.includes(d));
  if (!list.length) return '1 = 1';
  return `${col} IN (${list.map((d) => `'${d}'`).join(', ')})`;
}

/**
 * Shared lookups: thresholds, clerical processes, PN1/PN2 line per product,
 * worker names. Leaves #thr, #cler, #pn, #emp behind for the caller's script.
 */
function lookupsSql(thr) {
  return `
    CREATE TABLE #thr (dept VARCHAR(10) PRIMARY KEY, fast DECIMAL(6,2), slow DECIMAL(6,2));
    INSERT INTO #thr (dept, fast, slow) VALUES
      ${thresholdValues(thr)};

    -- Processes each (resolved) dept has excluded from monitoring.
    SELECT  dept, kode_tahapan
    INTO    #cler
    FROM    ${ACK_DB}.dbo.ct_clerical;
    CREATE UNIQUE CLUSTERED INDEX ix_cler ON #cler (dept, kode_tahapan);

    -- PN1/PN2 per product: the latest grouping period that is not in the
    -- future; a product that only exists in future periods takes its earliest.
    SELECT  Group_ProductID AS Product_ID,
            MAX(CASE WHEN REPLACE(Group_Periode, ' ', '') <= CONVERT(NVARCHAR(6), GETDATE(), 112)
                     THEN REPLACE(Group_Periode, ' ', '') END) AS per_past,
            MIN(REPLACE(Group_Periode, ' ', '')) AS per_min
    INTO    #pnper
    FROM    m_product_pn_group
    WHERE   Group_Dept IN ('PN1', 'PN2')
    GROUP BY Group_ProductID;

    SELECT  pp.Product_ID, MAX(g.Group_Dept) AS Group_Dept
    INTO    #pn
    FROM    #pnper pp
    JOIN    m_product_pn_group g
            ON g.Group_ProductID = pp.Product_ID
           AND REPLACE(g.Group_Periode, ' ', '') = ISNULL(pp.per_past, pp.per_min)
    WHERE   g.Group_Dept IN ('PN1', 'PN2')
    GROUP BY pp.Product_ID;
    CREATE UNIQUE CLUSTERED INDEX ix_pn ON #pn (Product_ID);

    -- Worker initials -> name (active employees win when an initial is reused).
    SELECT  LTRIM(RTRIM(inisialName)) AS nik,
            ISNULL(MAX(CASE WHEN isActive = 1 THEN Nama END), MAX(Nama)) AS Nama
    INTO    #emp
    FROM    m_karyawan
    WHERE   inisialName IS NOT NULL AND LTRIM(RTRIM(inisialName)) <> ''
    GROUP BY LTRIM(RTRIM(inisialName));
    CREATE UNIQUE CLUSTERED INDEX ix_emp ON #emp (nik);
  `;
}

/**
 * Enrich a temp table of grouped logical steps (#src, which must carry
 * Batch_No, seq_id, No_urut, Product_ID, Batch_Date, kode_tahapan, dept_raw,
 * StartDate, EndDate, work_sec, segments) into #sev with dept, names, standard,
 * ratio and severity. #phys (physical segments with PK_ID) is used to collect
 * the PICs of every segment.
 */
function scoreSql(src) {
  return `
    SELECT  s.*,
            CASE WHEN s.dept_raw = 'PN' THEN ISNULL(pn.Group_Dept, 'PN') ELSE s.dept_raw END AS dept,
            CASE WHEN c.kode_tahapan IS NULL THEN 0 ELSE 1 END AS is_clerical,
            LTRIM(RTRIM(ISNULL(t.nama_tahapan, 'kode_tahapan ' + CAST(s.kode_tahapan AS VARCHAR(10))))) AS nama_tahapan,
            p.Product_Name,
            CASE WHEN ISNULL(d.lead_time, 0) > 0 THEN d.lead_time
                 WHEN ISNULL(t.lead_time, 0) > 0 THEN t.lead_time END AS std_min,
            CASE WHEN ISNULL(d.lead_time, 0) > 0 THEN 'master'
                 WHEN ISNULL(t.lead_time, 0) > 0 THEN 'default' END AS std_source,
            CASE WHEN d.Seq_ID IS NULL THEN 0 ELSE 1 END AS has_master_row
    INTO    #enr
    FROM    ${src} s
    LEFT JOIN #pn pn ON pn.Product_ID = s.Product_ID
    LEFT JOIN #cler c ON c.kode_tahapan = s.kode_tahapan
                     AND c.dept = CASE WHEN s.dept_raw = 'PN' THEN ISNULL(pn.Group_Dept, 'PN') ELSE s.dept_raw END
    LEFT JOIN m_tahapan t ON t.kode_tahapan = s.kode_tahapan
    LEFT JOIN m_alur_detail d ON d.Seq_ID = s.seq_id AND d.No_urut = s.No_urut AND d.kode_tahapan = s.kode_tahapan
    LEFT JOIN m_Product p ON p.Product_ID = s.Product_ID;

    SELECT  e.*,
            ROUND(e.work_sec / 60.0, 1) AS duration_min,
            CASE WHEN e.std_min IS NULL THEN NULL
                 ELSE ROUND(e.work_sec / 60.0 / e.std_min * 100, 1) END AS ratio_pct,
            ISNULL(th.fast, thd.fast) AS fast_factor,
            ISNULL(th.slow, thd.slow) AS slow_factor,
            -- "N times faster" = actual * N <= standard; "N times slower" = actual >= standard * N
            CASE WHEN e.is_clerical = 1 THEN 'clerical'
                 WHEN e.std_min IS NULL THEN 'nostd'
                 WHEN e.work_sec < ${RED_MAX_MINUTES * 60} THEN 'red'
                 WHEN e.work_sec / 60.0 * ISNULL(th.fast, thd.fast) <= e.std_min THEN 'yellow'
                 WHEN e.work_sec / 60.0 >= e.std_min * ISNULL(th.slow, thd.slow) THEN 'yellow'
                 ELSE 'green' END AS severity,
            CASE WHEN e.is_clerical = 1 THEN 'clerical'
                 WHEN e.std_min IS NULL THEN 'nostd'
                 WHEN e.work_sec < ${RED_MAX_MINUTES * 60} THEN 'instant'
                 WHEN e.work_sec / 60.0 * ISNULL(th.fast, thd.fast) <= e.std_min THEN 'fast'
                 WHEN e.work_sec / 60.0 >= e.std_min * ISNULL(th.slow, thd.slow) THEN 'slow'
                 ELSE 'ok' END AS deviation
    INTO    #sev
    FROM    #enr e
    LEFT JOIN #thr th  ON th.dept = e.dept
    LEFT JOIN #thr thd ON thd.dept = '*';
    CREATE CLUSTERED INDEX ix_sev ON #sev (Batch_No, seq_id, No_urut);

    -- Distinct workers per logical step, across all of its segments.
    SELECT  ph.Batch_No, ph.seq_id, ph.No_urut, LTRIM(RTRIM(w.emp_nik)) AS nik
    INTO    #w
    FROM    #phys ph
    JOIN    t_Alur_Proses_List_Pekerja w ON w.PK_ID = ph.PK_ID
    WHERE   w.emp_nik IS NOT NULL
    GROUP BY ph.Batch_No, ph.seq_id, ph.No_urut, LTRIM(RTRIM(w.emp_nik));
    CREATE CLUSTERED INDEX ix_w ON #w (Batch_No, seq_id, No_urut);
  `;
}

/** Column list for detail rows (used by live feed, alert log and report). */
const DETAIL_COLUMNS = `
            v.Batch_No, v.seq_id, v.No_urut, v.Product_ID, v.Product_Name, v.Batch_Date,
            v.kode_tahapan, v.nama_tahapan, v.dept_raw, v.dept,
            v.StartDate, v.EndDate, v.segments, v.duration_min, v.std_min, v.std_source,
            v.ratio_pct, v.severity, v.deviation,
            STUFF((SELECT '|' + w.nik FROM #w w
                   WHERE w.Batch_No = v.Batch_No AND w.seq_id = v.seq_id AND w.No_urut = v.No_urut
                   ORDER BY w.nik FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 1, '') AS pic_ids,
            STUFF((SELECT '|' + ISNULL(e.Nama, w.nik) FROM #w w LEFT JOIN #emp e ON e.nik = w.nik
                   WHERE w.Batch_No = v.Batch_No AND w.seq_id = v.seq_id AND w.No_urut = v.No_urut
                   ORDER BY w.nik FOR XML PATH(''), TYPE).value('.', 'nvarchar(max)'), 1, 1, '') AS pic_names`;

const ACK_COLUMNS = `
            ak.id AS ack_id, ak.ack_status, ak.ack_note, ak.ack_by, ak.ack_by_name, ak.ack_at`;
const ACK_JOIN = `
    LEFT JOIN ${ACK_DB}.dbo.ct_alert_ack ak
           ON ak.batch_no = v.Batch_No AND ak.seq_id = v.seq_id AND ak.no_urut = v.No_urut`;

/**
 * Completed logical steps whose last segment ended inside [from, to).
 * Segments are read from up to 14 days before the window so a step paused
 * across days is still merged whole. Steps that still have an open or
 * not-yet-resumed segment are dropped -- they are not finished.
 */
function completedStepsSql() {
  return `
    SELECT  a.Batch_No, a.seq_id, a.No_urut, a.PK_ID, a.Product_ID, a.Batch_Date,
            a.kode_tahapan, a.dept, a.StartDate, a.EndDate
    INTO    #phys
    FROM    t_alur_proses a
    WHERE   a.EndDate >= DATEADD(day, -14, @from)
      AND   a.EndDate <  @to
      AND   a.StartDate IS NOT NULL;
    CREATE CLUSTERED INDEX ix_phys ON #phys (Batch_No, seq_id, No_urut);

    SELECT  p.Batch_No, p.seq_id, p.No_urut,
            MIN(p.Product_ID)   AS Product_ID,
            MIN(p.Batch_Date)   AS Batch_Date,
            MIN(p.kode_tahapan) AS kode_tahapan,
            MIN(p.dept)         AS dept_raw,
            MIN(p.StartDate)    AS StartDate,
            MAX(p.EndDate)      AS EndDate,
            SUM(DATEDIFF(second, p.StartDate, p.EndDate)) AS work_sec,
            COUNT(*)            AS segments
    INTO    #steps
    FROM    #phys p
    GROUP BY p.Batch_No, p.seq_id, p.No_urut
    HAVING  MAX(p.EndDate) >= @from;

    DELETE s FROM #steps s
    WHERE EXISTS (SELECT 1 FROM t_alur_proses x
                  WHERE x.Batch_No = s.Batch_No AND x.seq_id = s.seq_id AND x.No_urut = s.No_urut
                    AND x.EndDate IS NULL);
  `;
}

/**
 * mssql sends a JS Date as its UTC components (useUTC defaults to true), while
 * t_alur_proses holds plant wall-clock time. Re-base the Date so that its UTC
 * fields equal the local wall time we actually mean.
 */
const asDbDate = (d) => new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()));

function windowRequest(db, from, to) {
  const req = db.request();
  req.input('from', sql.DateTime, asDbDate(from));
  req.input('to', sql.DateTime, asDbDate(to));
  return req;
}

// ----------------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------------

/**
 * Detail rows for completed steps in [from, to) within the dept scope.
 * `severities` limits the result (default: everything incl. green/nostd).
 */
async function getSteps({ from, to, depts, severities }) {
  const thr = await getThresholds();
  const db = await connect();
  const sevList = (severities || []).filter((s) => SEVERITIES.includes(s));
  const sevPred = sevList.length ? `v.severity IN (${sevList.map((s) => `'${s}'`).join(', ')})` : '1 = 1';
  const script = `
    SET NOCOUNT ON;
    ${lookupsSql(thr)}
    ${completedStepsSql()}
    ${scoreSql('#steps')}
    SELECT ${DETAIL_COLUMNS}, ${ACK_COLUMNS}
    FROM   #sev v
    ${ACK_JOIN}
    WHERE  ${deptPredicate(depts, 'v.dept')}
      AND  ${sevPred}
    ORDER BY v.EndDate DESC;
  `;
  const r = await windowRequest(db, from, to).query(script);
  return r.recordset;
}

/**
 * Steps currently running (a segment started and not ended) in the scope,
 * with cumulative work time so far. Limited to segments started in the last
 * 60 days so abandoned rows do not clutter the board.
 */
async function getRunningSteps({ depts }) {
  const thr = await getThresholds();
  const db = await connect();
  const script = `
    SET NOCOUNT ON;
    ${lookupsSql(thr)}

    SELECT  o.Batch_No, o.seq_id, o.No_urut
    INTO    #open
    FROM    t_alur_proses o
    WHERE   o.StartDate IS NOT NULL AND o.EndDate IS NULL
      AND   o.StartDate >= DATEADD(day, -60, GETDATE())
    GROUP BY o.Batch_No, o.seq_id, o.No_urut;
    CREATE CLUSTERED INDEX ix_open ON #open (Batch_No, seq_id, No_urut);

    SELECT  a.Batch_No, a.seq_id, a.No_urut, a.PK_ID, a.Product_ID, a.Batch_Date,
            a.kode_tahapan, a.dept, a.StartDate, a.EndDate
    INTO    #phys
    FROM    t_alur_proses a
    JOIN    #open k ON k.Batch_No = a.Batch_No AND k.seq_id = a.seq_id AND k.No_urut = a.No_urut
    WHERE   a.StartDate IS NOT NULL;

    SELECT  p.Batch_No, p.seq_id, p.No_urut,
            MIN(p.Product_ID)   AS Product_ID,
            MIN(p.Batch_Date)   AS Batch_Date,
            MIN(p.kode_tahapan) AS kode_tahapan,
            MIN(p.dept)         AS dept_raw,
            MIN(p.StartDate)    AS StartDate,
            MAX(CASE WHEN p.EndDate IS NULL THEN p.StartDate END) AS EndDate,   -- current segment start
            SUM(DATEDIFF(second, p.StartDate, ISNULL(p.EndDate, GETDATE()))) AS work_sec,
            COUNT(*)            AS segments
    INTO    #steps
    FROM    #phys p
    GROUP BY p.Batch_No, p.seq_id, p.No_urut;

    ${scoreSql('#steps')}

    SELECT ${DETAIL_COLUMNS},
           v.EndDate AS CurrentSegmentStart,
           CASE WHEN v.is_clerical = 0 AND v.std_min IS NOT NULL AND v.work_sec / 60.0 >= v.std_min * v.slow_factor THEN 'overdue'
                ELSE 'running' END AS run_status
    FROM   #sev v
    WHERE  ${deptPredicate(depts, 'v.dept')}
    ORDER BY CASE WHEN v.std_min IS NULL THEN 1 ELSE 0 END,
             CASE WHEN v.std_min IS NULL THEN 0 ELSE v.work_sec / 60.0 / v.std_min END DESC,
             v.StartDate;
  `;
  const r = await db.request().query(script);
  return r.recordset.map((row) => {
    const { EndDate, ...rest } = row;
    return rest;
  });
}

/**
 * Alert counts per period x dept x severity for the charts.
 * granularity: day | week | month | year. Weeks start on Monday.
 */
async function getStats({ from, to, depts, granularity }) {
  const thr = await getThresholds();
  const db = await connect();
  const bucket = {
    day: 'DATEADD(day, DATEDIFF(day, 0, v.EndDate), 0)',
    week: 'DATEADD(day, (DATEDIFF(day, 0, v.EndDate) / 7) * 7, 0)',
    month: 'DATEADD(month, DATEDIFF(month, 0, v.EndDate), 0)',
    year: 'DATEADD(year, DATEDIFF(year, 0, v.EndDate), 0)',
  }[granularity] || 'DATEADD(day, DATEDIFF(day, 0, v.EndDate), 0)';

  const script = `
    SET NOCOUNT ON;
    ${lookupsSql(thr)}
    ${completedStepsSql()}
    ${scoreSql('#steps')}
    SELECT  ${bucket} AS period, v.dept, v.severity, v.deviation, COUNT(*) AS n
    FROM    #sev v
    WHERE   ${deptPredicate(depts, 'v.dept')}
      AND   v.severity <> 'clerical'
    GROUP BY ${bucket}, v.dept, v.severity, v.deviation
    ORDER BY period, v.dept;
  `;
  const r = await windowRequest(db, from, to).query(script);
  return r.recordset;
}

/**
 * Process steps that could not be scored because no standard exists (neither
 * the product's master flow nor the global default), grouped per dept /
 * process / product over the window. Surfaced as a To-Do for the department.
 */
async function getNoStandard({ from, to, depts }) {
  const thr = await getThresholds();
  const db = await connect();
  const script = `
    SET NOCOUNT ON;
    ${lookupsSql(thr)}
    ${completedStepsSql()}
    ${scoreSql('#steps')}
    SELECT  v.dept, v.kode_tahapan, v.nama_tahapan, v.Product_ID, v.Product_Name, v.seq_id, v.No_urut,
            MAX(v.has_master_row) AS has_master_row,
            COUNT(*) AS occurrences,
            MAX(v.EndDate) AS last_seen,
            ROUND(AVG(v.duration_min), 0) AS avg_duration_min
    FROM    #sev v
    WHERE   v.severity = 'nostd'
      AND   ${deptPredicate(depts, 'v.dept')}
    GROUP BY v.dept, v.kode_tahapan, v.nama_tahapan, v.Product_ID, v.Product_Name, v.seq_id, v.No_urut
    ORDER BY v.dept, occurrences DESC, v.nama_tahapan;
  `;
  const r = await windowRequest(db, from, to).query(script);
  return r.recordset;
}

// ----------------------------------------------------------------------------
// Clerical processes
// ----------------------------------------------------------------------------

/**
 * Candidate processes for a dept's clerical list: every m_tahapan row of the
 * underlying dept (PN for PN1/PN2), with how often it ran in the last 90 days
 * so the manager can spot the admin taps.
 */
async function getProcesses(dept) {
  if (!SCOPED_DEPTS.includes(dept)) throw new Error(`Dept tidak dikenal: '${dept}'`);
  const db = await connect();
  const req = db.request();
  req.input('dept', sql.NVarChar(10), baseDept(dept));
  const r = await req.query(`
    SELECT  t.kode_tahapan, LTRIM(RTRIM(t.nama_tahapan)) AS nama_tahapan, LTRIM(RTRIM(t.alias)) AS alias, t.lead_time,
            (SELECT COUNT(*) FROM t_alur_proses a
             WHERE a.kode_tahapan = t.kode_tahapan AND a.EndDate >= DATEADD(day, -90, GETDATE())) AS runs_90d
    FROM    m_tahapan t
    WHERE   t.dept = @dept
    ORDER BY t.nama_tahapan`);
  return r.recordset;
}

/** Clerical rows (all depts, or the given scope). Small table; no cache. */
async function getClerical({ depts }) {
  await ensureTables();
  const db = await connectSnapshot();
  const r = await db.request().query(`
    SELECT dept, kode_tahapan, nama_tahapan, added_by, added_by_name, added_at
    FROM dbo.ct_clerical
    WHERE ${deptPredicate(depts, 'dept')}
    ORDER BY dept, nama_tahapan`);
  return r.recordset;
}

/**
 * Replace one dept's clerical list with `codes` (kode_tahapan[]). Codes must
 * exist in m_tahapan under the dept's base dept. Rows that were already on the
 * list keep their original added_by / added_at.
 */
async function saveClerical({ dept, codes, user }) {
  await ensureTables();
  if (!SCOPED_DEPTS.includes(dept)) throw new Error(`Dept tidak dikenal: '${dept}'`);
  if (!user?.nik) throw new Error('User tidak dikenal');
  const wanted = [...new Set((Array.isArray(codes) ? codes : []).map((c) => Number(c)).filter((c) => Number.isInteger(c) && c > 0))];
  const valid = new Map((await getProcesses(dept)).map((p) => [p.kode_tahapan, p.nama_tahapan]));
  const unknown = wanted.filter((c) => !valid.has(c));
  if (unknown.length) throw new Error(`Proses tidak dikenal untuk ${dept}: ${unknown.join(', ')}`);

  const db = await connectSnapshot();
  const tx = new sql.Transaction(db);
  await tx.begin();
  try {
    const del = new sql.Request(tx);
    del.input('dept', sql.VarChar(10), dept);
    const keep = wanted.length ? `AND kode_tahapan NOT IN (${wanted.join(', ')})` : '';
    await del.query(`DELETE FROM dbo.ct_clerical WHERE dept = @dept ${keep}`);
    for (const code of wanted) {
      const req = new sql.Request(tx);
      req.input('dept', sql.VarChar(10), dept);
      req.input('kode', sql.Int, code);
      req.input('nama', sql.NVarChar(200), valid.get(code) || null);
      req.input('by', sql.VarChar(20), String(user.nik).slice(0, 20));
      req.input('byName', sql.NVarChar(100), user.name || null);
      await req.query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.ct_clerical WHERE dept = @dept AND kode_tahapan = @kode)
          INSERT INTO dbo.ct_clerical (dept, kode_tahapan, nama_tahapan, added_by, added_by_name)
          VALUES (@dept, @kode, @nama, @by, @byName)`);
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return getClerical({ depts: [dept] });
}

// ----------------------------------------------------------------------------
// Acknowledgements
// ----------------------------------------------------------------------------

/**
 * Upsert an acknowledgement for each step in `items` (one status/note for the
 * whole set -- bulk acknowledgement from the alert log).
 */
async function acknowledge({ items, status, note, user }) {
  await ensureTables();
  if (!ACK_STATUSES.includes(status)) throw new Error(`Status tidak dikenal: '${status}'`);
  if (!user?.nik) throw new Error('User tidak dikenal');
  if (!Array.isArray(items) || !items.length) throw new Error('Tidak ada alert yang dipilih');
  if (items.length > 500) throw new Error('Maksimal 500 alert per acknowledge');

  const db = await connectSnapshot();
  const tx = new sql.Transaction(db);
  await tx.begin();
  const results = [];
  try {
    for (const it of items) {
      const req = new sql.Request(tx);
      req.input('batch', sql.NVarChar(50), String(it.Batch_No));
      req.input('seq', sql.Int, Number(it.seq_id));
      req.input('urut', sql.Int, Number(it.No_urut));
      req.input('pid', sql.VarChar(50), it.Product_ID || null);
      req.input('pname', sql.NVarChar(200), it.Product_Name || null);
      req.input('kode', sql.Int, it.kode_tahapan == null ? null : Number(it.kode_tahapan));
      req.input('nama', sql.NVarChar(200), it.nama_tahapan || null);
      req.input('dept', sql.VarChar(10), it.dept || null);
      req.input('sev', sql.VarChar(10), it.severity || null);
      req.input('dur', sql.Decimal(12, 1), it.duration_min == null ? null : Number(it.duration_min));
      req.input('std', sql.Int, it.std_min == null ? null : Number(it.std_min));
      req.input('ratio', sql.Decimal(12, 1), it.ratio_pct == null ? null : Number(it.ratio_pct));
      req.input('sd', sql.DateTime, it.StartDate ? new Date(it.StartDate) : null);
      req.input('ed', sql.DateTime, it.EndDate ? new Date(it.EndDate) : null);
      req.input('pic', sql.NVarChar(400), it.pic_names || null);
      req.input('status', sql.VarChar(20), status);
      req.input('note', sql.NVarChar(1000), note ? String(note).slice(0, 1000) : null);
      req.input('by', sql.VarChar(20), String(user.nik).slice(0, 20));
      req.input('byName', sql.NVarChar(100), user.name || null);
      req.input('byDept', sql.VarChar(10), user.dept || null);

      const upd = await req.query(`
        UPDATE dbo.ct_alert_ack
        SET ack_status = @status, ack_note = @note, ack_by = @by, ack_by_name = @byName,
            ack_dept = @byDept, ack_at = GETDATE()
        WHERE batch_no = @batch AND seq_id = @seq AND no_urut = @urut;
        IF @@ROWCOUNT = 0
          INSERT INTO dbo.ct_alert_ack
            (batch_no, seq_id, no_urut, product_id, product_name, kode_tahapan, nama_tahapan, dept,
             severity, duration_min, standard_min, ratio_pct, start_date, end_date, pic,
             ack_status, ack_note, ack_by, ack_by_name, ack_dept)
          VALUES
            (@batch, @seq, @urut, @pid, @pname, @kode, @nama, @dept,
             @sev, @dur, @std, @ratio, @sd, @ed, @pic,
             @status, @note, @by, @byName, @byDept);
        SELECT id, ack_status, ack_note, ack_by, ack_by_name, ack_at
        FROM dbo.ct_alert_ack WHERE batch_no = @batch AND seq_id = @seq AND no_urut = @urut;
      `);
      results.push({ Batch_No: it.Batch_No, seq_id: it.seq_id, No_urut: it.No_urut, ...upd.recordset[0] });
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    throw e;
  }
  return results;
}

/** Remove acknowledgements (undo). `keys` = [{ Batch_No, seq_id, No_urut }]. */
async function unacknowledge({ keys }) {
  await ensureTables();
  if (!Array.isArray(keys) || !keys.length) return { removed: 0 };
  const db = await connectSnapshot();
  let removed = 0;
  for (const k of keys.slice(0, 500)) {
    const req = db.request();
    req.input('batch', sql.NVarChar(50), String(k.Batch_No));
    req.input('seq', sql.Int, Number(k.seq_id));
    req.input('urut', sql.Int, Number(k.No_urut));
    const r = await req.query('DELETE FROM dbo.ct_alert_ack WHERE batch_no = @batch AND seq_id = @seq AND no_urut = @urut');
    removed += r.rowsAffected[0] || 0;
  }
  return { removed };
}

/** Acknowledgement records in a window (by the alert's end_date) for the report. */
async function getAcknowledgements({ from, to, depts }) {
  await ensureTables();
  const db = await connectSnapshot();
  const req = db.request();
  req.input('from', sql.DateTime, asDbDate(from));
  req.input('to', sql.DateTime, asDbDate(to));
  const r = await req.query(`
    SELECT * FROM dbo.ct_alert_ack
    WHERE end_date >= @from AND end_date < @to
      AND ${deptPredicate(depts, 'dept')}
    ORDER BY ack_at DESC`);
  return r.recordset;
}

module.exports = {
  RED_MAX_MINUTES,
  SCOPED_DEPTS,
  CONFIG_ADMIN_DEPTS,
  CONFIG_SUPERUSERS,
  MANAGER_JOB_LEVELS,
  SEVERITIES,
  ACK_STATUSES,
  getThresholds,
  saveThresholds,
  getProcesses,
  getClerical,
  saveClerical,
  getSteps,
  getRunningSteps,
  getStats,
  getNoStandard,
  acknowledge,
  unacknowledge,
  getAcknowledgements,
};
