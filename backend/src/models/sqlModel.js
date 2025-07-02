const { connect } = require('../../config/sqlserver');

// Model buat tarik data WIP
async function WorkInProgress() {
  const query = `
IF OBJECT_ID('tempdb..#tmp') IS NOT NULL
    DROP TABLE #tmp;

SELECT DISTINCT
    CAST(a.Product_ID
         + a.Batch_No
         + CONVERT(varchar(8), a.Batch_Date, 112)
    AS varchar(255))                            AS ID,
    a.nama_tahapan,
    CASE 
      WHEN a.StartDate IS NULL 
           AND a.EndDate   IS NULL 
           AND EXISTS(
             SELECT 1 
             FROM t_alur_proses b
             WHERE ISNULL(a.Prev_Step,'') = b.nama_tahapan
               AND a.Product_ID   = b.Product_ID
               AND a.Batch_No     = b.Batch_No
               AND a.Batch_Date   = b.Batch_Date
               AND b.StatusPending IS NOT NULL
               AND b.nama_tahapan  IS NOT NULL
           ) THEN 'Pending'
      WHEN a.StartDate IS NOT NULL
           AND a.EndDate   IS NULL 
           THEN 'On Progress'
      WHEN a.Display = 1
           AND a.StartDate IS NULL 
           AND a.EndDate   IS NULL 
           THEN 'Idle'
      ELSE NULL
    END                                           AS Status,
    a.kode_tahapan,
    a.Urutan,
    a.dept
INTO #tmp
FROM t_alur_proses AS a
LEFT JOIN t_alur_proses_batch_status AS sts
  ON a.Product_ID = sts.product_id
 AND a.Batch_No   = sts.Batch_No
 AND a.Batch_Date = sts.Batch_Date
LEFT JOIN m_product AS prod
  ON a.Product_ID = prod.Product_ID
WHERE
    (a.StartDate IS NULL AND a.EndDate IS NULL)
 OR (a.StartDate IS NOT NULL AND a.EndDate IS NULL)
 OR (a.Display = 1 AND a.StartDate IS NULL AND a.EndDate IS NULL);

SELECT
  f.Product_Name,
  b.Batch_No,
  CONVERT(varchar(10), d.EndDate, 120) 
    + ' ' +
  CONVERT(varchar(5),  d.EndDate, 108)         AS [Tgl Timbang],
  DATEDIFF(DAY, d.EndDate, GETDATE())          AS [Hari WIP],
  ta.TahapanBerjalan                          AS [Tahapan Berjalan],
  CONVERT(varchar(10), i.Process_Date, 120) 
    + ' ' +
  CONVERT(varchar(5),  i.Process_Date, 108)    AS [Close BPHP],
  CONVERT(varchar(10), GETDATE(), 120) 
    + ' ' +
  CONVERT(varchar(5),  GETDATE(), 108)         AS [Tanggal Penarikan]
FROM t_alur_proses AS b

JOIN (
  SELECT DISTINCT Batch_No, Batch_Date, Product_ID
  FROM t_rfid_batch_card
  WHERE Batch_Status = 'Open'
    AND isActive     = 1
    AND Batch_No    <> ''
) AS c
  ON c.Batch_No   = b.Batch_No
 AND c.Batch_Date = b.Batch_Date
 AND c.Product_ID = b.Product_ID

JOIN (
  SELECT DISTINCT Batch_No, Batch_Date, Product_ID, EndDate
  FROM t_alur_proses
  WHERE nama_tahapan LIKE 'Timbang BB'
    AND EndDate IS NOT NULL
) AS d
  ON d.Batch_No   = b.Batch_No
 AND d.Batch_Date = b.Batch_Date
 AND d.Product_ID = b.Product_ID

JOIN m_product AS f
  ON f.Product_ID = b.Product_ID

LEFT JOIN (
  SELECT DNc_BatchNo, DNc_ProductID
  FROM t_dnc_product
  WHERE ISNULL(DNC_TempelLabel,'') <> ''
) AS g
  ON g.DNc_BatchNo   = b.Batch_No
 AND g.DNc_ProductID = b.Product_ID

LEFT JOIN (
  SELECT BatchNo, ProductID, Process_Date
  FROM t_bphprekap_status
  WHERE Approver_No = 2
    AND YEAR(Process_Date) >= 2023
) AS i
  ON i.BatchNo   = b.Batch_No
 AND i.ProductID = b.Product_ID

LEFT JOIN (
  SELECT
    t1.ID,
    STUFF(
      (
        SELECT
          ';' 
          + t2.Status
          + '#(' + t2.dept + ') ' + t2.nama_tahapan
        FROM #tmp AS t2
        WHERE t2.ID = t1.ID
        ORDER BY t2.Urutan
        FOR XML PATH(''), TYPE
      ).value('.', 'nvarchar(max)')
    , 1, 1, '')
      AS TahapanBerjalan
  FROM (
    SELECT DISTINCT ID
    FROM #tmp
  ) AS t1
) AS ta
  ON ta.ID = CAST(
               b.Product_ID
               + b.Batch_No
               + CONVERT(varchar(8), b.Batch_Date, 112)
             AS varchar(255))
WHERE b.nama_tahapan LIKE '%tempel label%'
  AND b.EndDate       IS NULL
  AND f.Product_Name NOT LIKE '%Granulat%'
  AND g.DNc_BatchNo   IS NULL
  AND b.Batch_No NOT IN ('CY3A01','BI063','PI3L01');

DROP TABLE #tmp;
  `;

  const db = await connect();
  const result = await db.request().query(query);
  return result.recordset;
}

module.exports = { WorkInProgress };