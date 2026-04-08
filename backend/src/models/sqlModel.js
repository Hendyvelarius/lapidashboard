const { connect } = require('../../config/sqlserver');
const sql = require('mssql');

async function getFulfillmentPerDept() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_OF1 'SummaryTotalPerDept';`);
  return result.recordset;
}

async function WorkInProgress() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_WIP 'RAW';`);
  return result.recordset;
}

async function WorkInProgressAlur() {
  const query = `
    SELECT *
    FROM t_alur_proses
    WHERE 
      LEN(Batch_Date) = 10
      AND Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
      AND ISDATE(Batch_Date) = 1
      AND CONVERT(date, Batch_Date, 111) >= DATEADD(month, -12, GETDATE())
  `;
  const db = await connect();
  const result = await db.request().query(query);
  return result.recordset;
}

async function AlurProsesBatch(batchNo) {
  const db = await connect();
  const request = db.request();
  request.input('batchNo', batchNo);
  const query = `
    SELECT * FROM t_alur_proses WHERE Batch_No = @batchNo
  `;
  const result = await request.query(query);
  return result.recordset;
}

async function getFulfillment() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_OF1 'SummaryTotal';`);
  return result.recordset;
}

async function getFulfillmentPerKelompok() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_OF1 'SummaryTotalPerKelompok';`);
  return result.recordset;
}

async function getWipProdByDept() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_WIP 'WIPProdByDept';`);
  return result.recordset;
}

async function getWipByGroup() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_WIP 'WIPProdByPCGroup';`);
  return result.recordset;
}

async function getProductCycleTime() {
  const db = await connect();
  const query = `
    WITH FilteredAlur AS (
      SELECT ap.*, mp.Product_Name
      FROM t_alur_proses ap
      JOIN m_Product mp ON ap.Product_ID = mp.Product_ID
      WHERE 
        ap.Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
        AND LEN(ap.Batch_Date) = 10
        AND ISDATE(ap.Batch_Date) = 1
        AND CONVERT(date, ap.Batch_Date, 111) >= DATEADD(month, -2, GETDATE())
        AND mp.Product_Name NOT LIKE '%granulat%'
    ),
    BatchesWithLabel AS (
      SELECT Batch_No
      FROM FilteredAlur
      WHERE LOWER(nama_tahapan) LIKE '%tempel label%'
      GROUP BY Batch_No
    ),
    FinalAlur AS (
      SELECT fa.*
      FROM FilteredAlur fa
      JOIN BatchesWithLabel b ON fa.Batch_No = b.Batch_No
    )
    SELECT 
      fa.Product_ID,
      fa.Product_Name,
      fa.Batch_No,
      fa.Batch_Date,
      -- Join m_alur_jenis_sediaan_produk for Jenis_Sediaan and Dept
      ISNULL(ms.Jenis_Sediaan, 'Belum Ada') AS Kategori,
      ISNULL(ms.Dept, 'Belum Ada') AS Dept,
      MIN(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%timbang bb%' THEN fa.EndDate END) AS SelesaiTimbang,
      MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel label%' THEN fa.EndDate END) AS SelesaiLabel,
      -- Using DATEDIFF for calendar days calculation (no exclusions)
      DATEDIFF(
        DAY,
        MIN(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%timbang bb%' THEN fa.EndDate END),
        MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel label%' THEN fa.EndDate END)
      ) AS PCT
    FROM FinalAlur fa
    LEFT JOIN m_alur_jenis_sediaan_produk ms ON fa.Product_ID = ms.Product_ID
    GROUP BY fa.Product_ID, fa.Product_Name, fa.Batch_No, fa.Batch_Date, ms.Jenis_Sediaan, ms.Dept
    HAVING MIN(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%timbang bb%' THEN fa.EndDate END) IS NOT NULL
       AND MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel label%' THEN fa.EndDate END) IS NOT NULL
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

async function getProductCycleTimeYearly() {
  const db = await connect();
  const query = `
    WITH FilteredAlur AS (
      SELECT ap.*, mp.Product_Name
      FROM t_alur_proses ap
      JOIN m_Product mp ON ap.Product_ID = mp.Product_ID
      WHERE 
        ap.Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
        AND LEN(ap.Batch_Date) = 10
        AND ISDATE(ap.Batch_Date) = 1
        AND CONVERT(date, ap.Batch_Date, 111) >= DATEADD(month, -12, GETDATE())
        AND mp.Product_Name NOT LIKE '%granulat%'
    ),
    BatchesWithLabel AS (
      SELECT Batch_No
      FROM FilteredAlur
      WHERE LOWER(nama_tahapan) LIKE '%tempel label%'
      GROUP BY Batch_No
    ),
    FinalAlur AS (
      SELECT fa.*
      FROM FilteredAlur fa
      JOIN BatchesWithLabel b ON fa.Batch_No = b.Batch_No
    )
    SELECT 
      fa.Product_ID,
      fa.Product_Name,
      fa.Batch_No,
      fa.Batch_Date,
      -- Join m_alur_jenis_sediaan_produk for Jenis_Sediaan and Dept
      ISNULL(ms.Jenis_Sediaan, 'Belum Ada') AS Kategori,
      ISNULL(ms.Dept, 'Belum Ada') AS Dept,
      MIN(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%timbang bb%' THEN fa.EndDate END) AS SelesaiTimbang,
      MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel label%' THEN fa.EndDate END) AS SelesaiLabel,
      -- Using DATEDIFF for calendar days calculation (no exclusions)
      DATEDIFF(
        DAY,
        MIN(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%timbang bb%' THEN fa.EndDate END),
        MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel label%' THEN fa.EndDate END)
      ) AS PCT
    FROM FinalAlur fa
    LEFT JOIN m_alur_jenis_sediaan_produk ms ON fa.Product_ID = ms.Product_ID
    GROUP BY fa.Product_ID, fa.Product_Name, fa.Batch_No, fa.Batch_Date, ms.Jenis_Sediaan, ms.Dept
    HAVING MIN(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%timbang bb%' THEN fa.EndDate END) IS NOT NULL
       AND MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel label%' THEN fa.EndDate END) IS NOT NULL
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

async function getOrderFulfillment() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_OF1 'RAW';`);
  return result.recordset;
}

async function getStockReport() {
  const db = await connect();
  const result = await db.request().query(`
    SELECT 
      trmh.*,
      ms.Jenis_Sediaan AS Kategori
    FROM temp_Report_ManHours trmh
    LEFT JOIN m_alur_jenis_sediaan_produk ms ON trmh.Product_ID = ms.Product_ID
  `);
  return result.recordset;
}

async function getMonthlyForecast(month, year) {
  const db = await connect();
  const result = await db
    .request()
    .input('month', sql.VarChar, month)
    .input('year', sql.VarChar, year)
    .query(`
      SELECT 
          a.Product_ID,
          a.product_shortname AS Product_NM,
          ISNULL(ccc.stockRelease, 0) AS Release,
          ISNULL(ggg.Forecast, 0) AS Forecast,
          ISNULL(fff.sales, 0) AS Sales,
          ISNULL(iii.Produksi, 0) AS Produksi
      FROM v_m_Product_aktif a

      -- Release
      LEFT JOIN (
          SELECT 
              st_productid, 
              SUM(CASE 
                  WHEN lock_batchno IS NULL 
                  THEN st_awalrelease + st_terimarelease + st_terimalangsung - st_keluarrelease 
                  ELSE 0 
              END) AS stockRelease
          FROM (
              SELECT psp.*, lock_batchno 
              FROM t_product_stock_position psp
              LEFT JOIN vwbatchlock bl 
                  ON bl.Lock_ProductID = psp.St_ProductID AND bl.Lock_Batchno = psp.St_BatchNo
              WHERE psp.st_periode = @year + ' ' + @month
          ) AS stock
          GROUP BY st_productid
      ) ccc ON ccc.st_productid = a.Product_ID

      -- Forecast
      LEFT JOIN (
          SELECT 
              Product_ID, 
              CASE @month
                  WHEN '01' THEN qty1
                  WHEN '02' THEN qty2
                  WHEN '03' THEN qty3
                  WHEN '04' THEN qty4
                  WHEN '05' THEN qty5
                  WHEN '06' THEN qty6
                  WHEN '07' THEN qty7
                  WHEN '08' THEN qty8
                  WHEN '09' THEN qty9
                  WHEN '10' THEN qty10
                  WHEN '11' THEN qty11
                  WHEN '12' THEN qty12
              END AS Forecast
          FROM m_forecast
          WHERE tahun = @year
      ) ggg ON ggg.Product_ID = a.Product_ID

      -- Sales
      LEFT JOIN (
          SELECT 
              d.spb_productid, 
              SUM(d.spb_qty) AS sales
          FROM t_spb_detail d
          INNER JOIN t_spb_header h ON d.spb_no = h.spb_no
          WHERE 
              CONVERT(VARCHAR(6), h.spb_date, 112) = @year + @month
              AND h.spb_type IN ('501', '502')
              AND d.spb_bonusQty <> 1
          GROUP BY d.spb_productid
      ) fff ON fff.spb_productid = a.Product_ID

      -- Produksi
      LEFT JOIN (
          SELECT 
              d.bphp_productid, 
              SUM(d.bphp_jumlah) AS Produksi
          FROM t_bphp_detail d
          INNER JOIN t_bphp_header h ON d.bphp_no = h.bphp_no
          WHERE d.bphp_no IN (
              SELECT bphp_no 
              FROM t_bphp_status 
              WHERE 
                  Approver_No = '3' 
                  AND isReject = 0 
                  AND CONVERT(VARCHAR(6), process_date, 112) = @year + @month
          )
          GROUP BY d.bphp_productid
      ) iii ON iii.bphp_productid = a.Product_ID

      WHERE 
          ISNULL(a.Product_SalesID, '') <> ''
          AND a.product_saleshna <> 0
      ORDER BY a.product_shortname
    `);

  return result.recordset;
}

async function getForecast() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_DataReportManHours;`);
  return result.recordset;
}

async function getofsummary() {
  const db = await connect();
  const result = await db.request().query(`EXEC sp_Dashboard_OF1 'SummaryByProsesGroup';`);
  return result.recordset;
}

async function getbbbk() {
  const db = await connect();
  const result = await db.request().query(`sp_Dashboard_InventoryBBBK`);
  return result.recordset;
}

async function getDailySales() {
  const db = await connect();
//   const result = await db.request().query(`DECLARE @TargetMonth NVARCHAR(6) = CONVERT(VARCHAR(6), GETDATE(), 112)
// DECLARE @Tahun NVARCHAR(4) = LEFT(@TargetMonth, 4)
// DECLARE @Bulan NVARCHAR(2) = RIGHT(@TargetMonth, 2)
// DECLARE @StartDate DATE = CAST(@Tahun + '-' + @Bulan + '-01' AS DATE)
// DECLARE @EndDate DATE = DATEADD(DAY, -1, DATEADD(MONTH, 1, @StartDate))

// SELECT 
//     b.spb_date AS SalesDate,
//     a.spb_productid AS Product_ID,
//     p.Product_SalesID AS Product_Code,
//     p.product_shortname AS Product_Name,
//     SUM(a.spb_qty) AS DailySales,
//     DAY(b.spb_date) AS DayOfMonth,
//     CEILING(CAST(DAY(b.spb_date) AS FLOAT) / 7.0) AS WeekOfMonth,
//     m.Product_SalesHNA AS Price,
//     SUM(a.spb_qty) * m.Product_SalesHNA AS TotalPrice
// FROM t_spb_detail a
// INNER JOIN t_spb_header b ON a.spb_no = b.spb_no
// INNER JOIN v_m_Product_aktif p ON a.spb_productid = p.Product_ID 
//                                AND a.spb_productinit = p.Product_init
// INNER JOIN m_Product m ON a.spb_productid = m.Product_ID
// WHERE b.spb_date >= @StartDate 
//   AND b.spb_date <= @EndDate
//   AND b.spb_type IN ('501','502')
//   AND a.spb_bonusQty <> 1
//   AND ISNULL(p.product_SalesID, '') <> '' 
//   AND p.product_saleshna <> 0
// GROUP BY 
//     b.spb_date,
//     a.spb_productid,
//     p.Product_SalesID,
//     p.product_shortname,
//     m.Product_SalesHNA
// ORDER BY 
//     b.spb_date DESC,
//     p.product_shortname ASC;`)
  const result = await db.request().query(`exec sp_Dashboard_SalesNPending 'Sales'`);
  return result.recordset;
}

async function getLostSales() {
  const db = await connect();
  const result = await db.request().query(`exec sp_Dashboard_SalesNPending 'Pending'`);
  return result.recordset;
}

async function getOTA() {
  const db = await connect();
  const result = await db.request().query(`exec sp_Dashboard_OTA`);
  return result.recordset;
}

async function getMaterial() {
  const db = await connect();
  const result = await db.request().query(`exec sp_Dashboard_MA`);
  return result.recordset;
}

async function getPCTBreakdown(period = 'MTD') {
  const db = await connect();
  
  // Determine the date filter based on period
  let dateFilter;
  if (period === 'YTD') {
    // Year-to-Date: filter by year only
    dateFilter = `AND YEAR(EndDate) = YEAR(GETDATE())`;
  } else {
    // Month-to-Date (default): filter by year and month
    dateFilter = `AND YEAR(EndDate) = YEAR(GETDATE())
        AND MONTH(EndDate) = MONTH(GETDATE())`;
  }
  
  // Using DATEDIFF to calculate calendar days (no exclusions)
  // Changed from fn_JumlahHariKerja per management request
  const query = `
    WITH FilteredAlur AS (
      SELECT 
        ap.*,
        mp.Product_Name,
        ISNULL(mtg.tahapan_group, 'Other') AS tahapan_group
      FROM t_alur_proses ap
      JOIN m_Product mp ON ap.Product_ID = mp.Product_ID
      LEFT JOIN m_tahapan_group mtg ON ap.kode_tahapan = mtg.kode_tahapan
      WHERE 
        ap.Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
        AND LEN(ap.Batch_Date) = 10
        AND ISDATE(ap.Batch_Date) = 1
        AND mp.Product_Name NOT LIKE '%granulat%'
    ),
    -- Get only batches that have completed "Tempel Label Realese" with EndDate based on period (MTD or YTD)
    CompletedBatches AS (
      SELECT DISTINCT Batch_No
      FROM FilteredAlur
      WHERE LOWER(nama_tahapan) LIKE '%tempel%label%realese%'
        AND EndDate IS NOT NULL
        ${dateFilter}
    )
    -- Return batch-level details with stage durations using working days calculation
    SELECT 
      fa.Batch_No,
      fa.Batch_Date,
      fa.Product_ID,
      fa.Product_Name,
      -- Total calendar days from earliest StartDate to Tempel Label Realese EndDate
      DATEDIFF(
        DAY,
        MIN(fa.StartDate),
        MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel%label%realese%' THEN fa.EndDate END)
      ) AS Total_Days,
      -- Timbang stage calendar days
      DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.EndDate END)
      ) AS Timbang_Days,
      -- QC stage calendar days
      DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'QC' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QC' THEN fa.EndDate END)
      ) AS QC_Days,
      -- Mikro stage calendar days
      DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.EndDate END)
      ) AS Mikro_Days,
      -- QA stage calendar days
      DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'QA' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QA' THEN fa.EndDate END)
      ) AS QA_Days,
      -- Proses stage calendar days (everything else that's not null and not the above categories)
      DATEDIFF(
        DAY,
        MIN(CASE 
          WHEN fa.tahapan_group NOT IN ('Timbang', 'QC', 'Mikro', 'QA') 
            AND fa.tahapan_group <> 'Other'
            AND fa.tahapan_group IS NOT NULL 
          THEN fa.StartDate 
        END),
        MAX(CASE 
          WHEN fa.tahapan_group NOT IN ('Timbang', 'QC', 'Mikro', 'QA') 
            AND fa.tahapan_group <> 'Other'
            AND fa.tahapan_group IS NOT NULL 
          THEN fa.EndDate 
        END)
      ) AS Proses_Days
    FROM FilteredAlur fa
    INNER JOIN CompletedBatches cb ON fa.Batch_No = cb.Batch_No
    GROUP BY fa.Batch_No, fa.Batch_Date, fa.Product_ID, fa.Product_Name
    HAVING (
      DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.EndDate END)
      ) IS NOT NULL
      OR DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'QC' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QC' THEN fa.EndDate END)
      ) IS NOT NULL
      OR DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.EndDate END)
      ) IS NOT NULL
      OR DATEDIFF(
        DAY,
        MIN(CASE WHEN fa.tahapan_group = 'QA' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QA' THEN fa.EndDate END)
      ) IS NOT NULL
      OR DATEDIFF(
        DAY,
        MIN(CASE 
          WHEN fa.tahapan_group NOT IN ('Timbang', 'QC', 'Mikro', 'QA') 
            AND fa.tahapan_group <> 'Other'
            AND fa.tahapan_group IS NOT NULL 
          THEN fa.StartDate 
        END),
        MAX(CASE 
          WHEN fa.tahapan_group NOT IN ('Timbang', 'QC', 'Mikro', 'QA') 
            AND fa.tahapan_group <> 'Other'
            AND fa.tahapan_group IS NOT NULL 
          THEN fa.EndDate 
        END)
      ) IS NOT NULL
    )
    ORDER BY fa.Batch_No
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

async function getLeadTime(period = 'MTD') {
  const db = await connect();
  
  // Determine the date filter based on period
  let dateFilter;
  if (period === 'YTD') {
    // Year-to-Date: filter by year only
    dateFilter = `AND YEAR(sc.Stage_Completion_Date) = YEAR(GETDATE())`;
  } else {
    // Month-to-Date (default): filter by year and month
    dateFilter = `AND YEAR(sc.Stage_Completion_Date) = YEAR(GETDATE())
        AND MONTH(sc.Stage_Completion_Date) = MONTH(GETDATE())`;
  }
  
  const query = `
    WITH FilteredAlur AS (
      SELECT 
        ap.Product_ID,
        ap.Batch_No,
        ap.Batch_Date,
        ap.nama_tahapan,
        ap.kode_tahapan,
        ap.StartDate,
        ap.EndDate,
        mp.Product_Name,
        ISNULL(mtg.tahapan_group, 'Other') AS tahapan_group
      FROM t_alur_proses ap
      JOIN m_Product mp ON ap.Product_ID = mp.Product_ID
      LEFT JOIN m_tahapan_group mtg ON ap.kode_tahapan = mtg.kode_tahapan
      WHERE 
        ap.Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
        AND LEN(ap.Batch_Date) = 10
        AND ISDATE(ap.Batch_Date) = 1
        AND mp.Product_Name NOT LIKE '%granulat%'
        AND mtg.tahapan_group IN ('QC', 'Mikro')
    ),
    -- Group by batch and stage, find completion date (MAX EndDate) for each stage
    StageCompletions AS (
      SELECT 
        fa.Product_ID,
        fa.Batch_No,
        fa.Batch_Date,
        fa.Product_Name,
        fa.tahapan_group,
        MAX(fa.EndDate) AS Stage_Completion_Date,
        MIN(fa.StartDate) AS Stage_Start_Date,
        COUNT(*) AS Total_Steps,
        COUNT(fa.EndDate) AS Completed_Steps
      FROM FilteredAlur fa
      GROUP BY fa.Product_ID, fa.Batch_No, fa.Batch_Date, fa.Product_Name, fa.tahapan_group
    )
    -- Return only batches where ALL steps in the stage are completed (Completed_Steps = Total_Steps)
    -- and the completion date is within the specified period
    SELECT 
      sc.Product_ID,
      sc.Batch_No,
      sc.Batch_Date,
      sc.Product_Name,
      sc.tahapan_group AS Stage_Name,
      sc.Stage_Completion_Date,
      sc.Stage_Start_Date,
      DATEDIFF(DAY, sc.Stage_Start_Date, sc.Stage_Completion_Date) AS Stage_Duration_Days,
      sc.Total_Steps,
      sc.Completed_Steps
    FROM StageCompletions sc
    WHERE sc.Completed_Steps = sc.Total_Steps
      AND sc.Stage_Completion_Date IS NOT NULL
      ${dateFilter}
    ORDER BY sc.Stage_Completion_Date, sc.Batch_No
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

async function getWIPData() {
  const db = await connect();
  // Optimized: broken into temp-table steps to avoid SQL Server 2008 R2 optimizer
  // picking a bad execution plan when 10+ tables are joined in a single statement.
  // Original single-statement query timed out at >300s; this approach runs in ~10s.
  const query = `
    -- Step 1: Core data - join only the essential indexed tables first
    SELECT a.Product_ID, a.Batch_No, a.Batch_Date, a.nama_tahapan, a.kode_tahapan,
           a.StartDate, a.EndDate, a.urutan, a.Prev_Step, a.Display,
           prod.Product_Name
    INTO #tmpData
    FROM t_alur_proses a
    JOIN (SELECT DISTINCT Batch_No, Batch_Date, Product_ID FROM t_rfid_batch_card WHERE isActive=1 AND Batch_Status='Open') c
      ON c.Product_ID = a.Product_ID AND c.Batch_Date = a.Batch_Date AND c.Batch_No = a.Batch_No
    JOIN m_product prod ON a.Product_ID = prod.Product_ID
    WHERE REPLACE(LEFT(a.Batch_Date, 7), '/', '')
      BETWEEN CONVERT(nvarchar(6), DATEADD(month,-12,GETDATE()), 112) AND CONVERT(nvarchar(6), GETDATE(), 112)
      AND prod.Product_Name NOT LIKE '%Granulat%'
      AND NOT (a.Batch_No = 'CY3A01' OR a.Batch_No = 'BI063' OR a.Batch_No = 'PI3L01');

    -- Step 2: Remove batches where tempel label is already completed
    DELETE FROM #tmpData
    WHERE EXISTS (
      SELECT 1 FROM t_alur_proses xy
      WHERE xy.Product_ID = #tmpData.Product_ID AND xy.Batch_No = #tmpData.Batch_No AND xy.Batch_Date = #tmpData.Batch_Date
        AND xy.nama_tahapan LIKE '%tempel%label' AND xy.EndDate IS NOT NULL
    );

    -- Step 3: Remove DNC products with TempelLabel filled
    DELETE FROM #tmpData
    WHERE EXISTS (
      SELECT 1 FROM t_dnc_product b
      WHERE ISNULL(b.DNC_TempelLabel, '') <> ''
        AND #tmpData.Batch_No = b.DNc_BatchNo AND #tmpData.Product_ID = b.DNc_ProductID
    );

    -- Step 4: Remove cancelled (batal) batches
    DELETE FROM #tmpData
    WHERE EXISTS (
      SELECT 1 FROM t_wip_batal wb
      WHERE #tmpData.Batch_No = wb.wip_batchno AND #tmpData.Product_ID = wb.wip_productID
    );

    -- Step 5: Keep only batches where Timbang has started OR Terima Bahan Baku is completed
    DELETE FROM #tmpData
    WHERE NOT EXISTS (
      SELECT 1 FROM t_alur_proses ap
      INNER JOIN m_tahapan_group mtg ON ap.kode_tahapan = mtg.kode_tahapan
      WHERE mtg.tahapan_group = 'Timbang' AND ap.StartDate IS NOT NULL
        AND ap.Batch_Date = #tmpData.Batch_Date AND ap.Batch_No = #tmpData.Batch_No AND ap.Product_ID = #tmpData.Product_ID
    )
    AND NOT EXISTS (
      SELECT 1 FROM t_alur_proses ap2
      WHERE LTRIM(RTRIM(ap2.nama_tahapan)) = 'Terima Bahan Baku' AND ap2.EndDate IS NOT NULL
        AND ap2.Batch_Date = #tmpData.Batch_Date AND ap2.Batch_No = #tmpData.Batch_No AND ap2.Product_ID = #tmpData.Product_ID
    );

    -- Step 6: Add lookup columns
    ALTER TABLE #tmpData ADD tahapan_group NVARCHAR(100) NULL;
    ALTER TABLE #tmpData ADD Group_Dept NVARCHAR(10) NULL;
    ALTER TABLE #tmpData ADD Jenis_Sediaan NVARCHAR(200) NULL;
    ALTER TABLE #tmpData ADD IdleStartDate DATETIME NULL;

    UPDATE t SET t.tahapan_group = grp.tahapan_group
    FROM #tmpData t
    LEFT JOIN m_tahapan_group grp ON t.kode_tahapan = grp.kode_tahapan;

    UPDATE t SET t.Group_Dept = gp.Group_Dept
    FROM #tmpData t
    LEFT JOIN m_product_pn_group gp ON gp.Group_ProductID = t.Product_ID
      AND REPLACE(gp.Group_Periode, ' ', '') = CONVERT(varchar(6), GETDATE(), 112);

    UPDATE t SET t.Jenis_Sediaan = s.Jenis_Sediaan
    FROM #tmpData t
    LEFT JOIN m_product_sediaan_produksi s ON s.Product_ID = t.Product_ID;

    -- Step 7: Update IdleStartDate berdasarkan prev step
    UPDATE a
    SET a.IdleStartDate = (
        SELECT MIN(b.EndDate)
        FROM #tmpData b
        INNER JOIN split(a.Prev_Step, ';') AS ps
            ON LTRIM(RTRIM(ps.items)) = LTRIM(RTRIM(b.nama_tahapan))
        WHERE a.Product_ID = b.Product_ID
          AND a.Batch_No = b.Batch_No
    )
    FROM #tmpData a;

    -- Final result: same columns as original query
    SELECT Product_ID, Batch_No, Batch_Date, nama_tahapan, kode_tahapan,
           StartDate, EndDate, urutan, tahapan_group,
           Product_Name, Group_Dept, Jenis_Sediaan, Prev_Step, Display,
           IdleStartDate
    FROM #tmpData;

    DROP TABLE #tmpData;
  `;

  const result = await db.request().query(query);
  return result.recordset;
}

async function getPCTSummary() {
  const db = await connect();
  
  // MTD only for summary dashboard
  const dateFilter = `AND YEAR(EndDate) = YEAR(GETDATE())
        AND MONTH(EndDate) = MONTH(GETDATE())`;
  
  const query = `
    WITH FilteredAlur AS (
      SELECT 
        ap.*,
        mp.Product_Name,
        ISNULL(mtg.tahapan_group, 'Other') AS tahapan_group
      FROM t_alur_proses ap
      JOIN m_Product mp ON ap.Product_ID = mp.Product_ID
      LEFT JOIN m_tahapan_group mtg ON ap.kode_tahapan = mtg.kode_tahapan
      WHERE 
        ap.Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
        AND LEN(ap.Batch_Date) = 10
        AND ISDATE(ap.Batch_Date) = 1
        AND mp.Product_Name NOT LIKE '%granulat%'
    ),
    -- Get only batches that have completed "Tempel Label Realese" with EndDate (MTD)
    CompletedBatches AS (
      SELECT DISTINCT Batch_No
      FROM FilteredAlur
      WHERE LOWER(nama_tahapan) LIKE '%tempel%label%realese%'
        AND EndDate IS NOT NULL
        ${dateFilter}
    ),
    -- Batch-level details with Total_Days using calendar days calculation
    BatchDetails AS (
      SELECT 
        fa.Batch_No,
        fa.Product_ID,
        fa.Product_Name,
        -- Total calendar days from earliest StartDate to Tempel Label Realese EndDate (no holiday exclusions)
        CAST(DATEDIFF(
          DAY,
          MIN(fa.StartDate),
          MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel%label%realese%' THEN fa.EndDate END)
        ) AS FLOAT) AS Total_Days
      FROM FilteredAlur fa
      INNER JOIN CompletedBatches cb ON fa.Batch_No = cb.Batch_No
      GROUP BY fa.Batch_No, fa.Product_ID, fa.Product_Name
    )
    -- Group by Product and calculate average PCT
    SELECT 
      bd.Product_ID,
      bd.Product_Name,
      AVG(bd.Total_Days) AS PCTAverage,
      COUNT(bd.Batch_No) AS BatchCount,
      STUFF((
        SELECT ', ' + b2.Batch_No
        FROM BatchDetails b2
        WHERE b2.Product_ID = bd.Product_ID
        FOR XML PATH(''), TYPE
      ).value('.', 'NVARCHAR(MAX)'), 1, 2, '') AS Batch_Nos,
      ISNULL(ms.Dept, 'Belum Ada') AS Dept,
      ISNULL(ms.Jenis_Sediaan, 'Belum Ada') AS Kategori
    FROM BatchDetails bd
    LEFT JOIN m_alur_jenis_sediaan_produk ms ON ms.Product_ID = bd.Product_ID
    GROUP BY bd.Product_ID, bd.Product_Name, ms.Dept, ms.Jenis_Sediaan
    ORDER BY bd.Product_ID
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

async function getProductList() {
  const db = await connect();
  const query = `SELECT mp.Product_ID, mp.Product_Name FROM m_Product mp`;
  const result = await db.request().query(query);
  return result.recordset;
}

async function getOTCProducts() {
  const db = await connect();
  const query = `SELECT Product_ID FROM m_product_otc`;
  const result = await db.request().query(query);
  return result.recordset;
}

async function getProductGroupDept() {
  const db = await connect();
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  const currentPeriod = `${currentYear} ${currentMonth}`;
  
  const query = `
    SELECT Group_ProductID, Group_Dept 
    FROM m_Product_PN_Group 
    WHERE Group_Periode = '${currentPeriod}'
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

async function getReleasedBatches() {
  const db = await connect();
  
  // Get current month in YYYY-MM format for filtering
  const currentMonth = new Date().toISOString().slice(0, 7); // e.g., "2025-01"
  
  const query = `
    SELECT 
      DNc_ProductID, 
      DNc_BatchNo, 
      DNC_Diluluskan,
      dnc_status,
      Process_Date
    FROM t_dnc_product
    WHERE dnc_status = 'DILULUSKAN'
      AND CONVERT(VARCHAR(7), Process_Date, 120) = '${currentMonth}'
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

async function getReleasedBatchesYTD() {
  const db = await connect();
  
  // Get current year for filtering
  const currentYear = new Date().getFullYear();
  
  const query = `
    SELECT 
      DNc_ProductID, 
      DNc_BatchNo, 
      DNC_Diluluskan,
      dnc_status,
      Process_Date
    FROM t_dnc_product
    WHERE dnc_status = 'DILULUSKAN'
      AND YEAR(Process_Date) = ${currentYear}
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

async function getDailyProduction() {
  const db = await connect();
  
  // Get current month in YYYYMM format
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
  const targetMonth = `${currentYear}${currentMonth}`;
  
  const query = `
    SELECT 
      CONVERT(DATE, s.process_date) AS ProductionDate,
      d.bphp_productid AS Product_ID,
      SUM(d.bphp_jumlah) AS DailyProduction
    FROM t_bphp_detail d
    INNER JOIN t_bphp_header h ON d.bphp_no = h.bphp_no
    INNER JOIN t_bphp_status s ON d.bphp_no = s.bphp_no
    WHERE 
      s.Approver_No = '3' 
      AND s.isReject = 0
      AND CONVERT(VARCHAR(6), s.process_date, 112) = '${targetMonth}'
    GROUP BY 
      CONVERT(DATE, s.process_date),
      d.bphp_productid
    ORDER BY ProductionDate, Product_ID
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

async function getOF1Target() {
  const db = await connect();
  
  // Calculate the last 12 month periods (including current month)
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-indexed
  
  // Generate list of last 12 periods in YYYYMM format
  // Include both string ('202512') and numeric (202512) versions for compatibility
  const periods = [];
  for (let i = 11; i >= 0; i--) {
    const targetDate = new Date(currentYear, currentMonth - 1 - i, 1);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const period = `${targetYear}${targetMonth.toString().padStart(2, '0')}`;
    periods.push(`'${period}'`);
  }
  
  const query = `
    SELECT 
      periode,
      product_id,
      target,
      release
    FROM r_target_of1_dashboard
    WHERE CAST(periode AS VARCHAR(6)) IN (${periods.join(', ')})
    ORDER BY periode, product_id
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

async function getBatchExpiry() {
  const db = await connect();
  
  const query = `
    DECLARE @Periode2 AS NVARCHAR(7)
    SET @Periode2 = CONVERT(VARCHAR(4), YEAR(GETDATE())) + ' ' + RIGHT('0' + CONVERT(VARCHAR(2), MONTH(GETDATE())), 2)

    -- Get first day of current month for comparison (compatible with older SQL Server)
    DECLARE @CurrentMonthStart AS DATETIME
    SET @CurrentMonthStart = CAST(CONVERT(VARCHAR(6), GETDATE(), 112) + '01' AS DATETIME)

    -- CTE to get the latest production record per batch (by Reg_Date)
    ;WITH LatestBatchRecords AS (
        SELECT 
            Reg_BatchNo,
            Reg_ProductID,
            Reg_ManufDate,
            Reg_ExpDate,
            Reg_Date,
            ROW_NUMBER() OVER (
                PARTITION BY Reg_BatchNo, Reg_ProductID 
                ORDER BY Reg_Date DESC
            ) AS RowNum
        FROM t_Register_Perintah_Produksi_Header
    )

    SELECT 
        psp.St_ProductID AS Product_ID,
        psp.St_BatchNo AS Batch_No,
        psp.St_Periode AS Periode,
        -- Product info
        mp.Product_Name,
        mp.Product_SalesHNA AS HNA,
        -- Available released stock for this batch
        CASE 
            WHEN lock.Lock_BatchNo IS NOT NULL THEN 0
            ELSE psp.st_awalrelease + psp.st_terimarelease + psp.st_terimalangsung - psp.st_keluarrelease 
        END AS BatchStockRelease,
        -- Quarantine stock for this batch
        CASE 
            WHEN lock.Lock_BatchNo IS NOT NULL THEN 0
            ELSE psp.st_awalkarantina + psp.st_terimakarantina - psp.st_keluarkarantina 
        END AS BatchStockKarantina,
        -- Total stock for this batch
        CASE 
            WHEN lock.Lock_BatchNo IS NOT NULL THEN 0
            ELSE (psp.st_awalrelease + psp.st_terimarelease + psp.st_terimalangsung - psp.st_keluarrelease)
                 + (psp.st_awalkarantina + psp.st_terimakarantina - psp.st_keluarkarantina)
        END AS BatchStockTotal,
        -- Expiry date info from t_Register_Perintah_Produksi_Header
        rpp.Reg_ManufDate AS ManufDate,
        rpp.Reg_ExpDate AS ExpDate,
        -- Days until expiry
        DATEDIFF(DAY, GETDATE(), rpp.Reg_ExpDate) AS DaysUntilExpiry,
        -- Months until expiry
        DATEDIFF(MONTH, GETDATE(), rpp.Reg_ExpDate) AS MonthsUntilExpiry,
        -- Is batch locked?
        CASE WHEN lock.Lock_BatchNo IS NOT NULL THEN 1 ELSE 0 END AS IsLocked
    FROM t_product_stock_position psp
    -- Join to get product details
    LEFT JOIN m_product mp 
        ON mp.Product_ID = psp.St_ProductID
    -- Join to get expiry date (using latest record per batch)
    LEFT JOIN LatestBatchRecords rpp 
        ON rpp.Reg_BatchNo = psp.St_BatchNo 
        AND rpp.Reg_ProductID = psp.St_ProductID
        AND rpp.RowNum = 1
    -- Join to check locked batches
    LEFT JOIN dbo.vwbatchlock lock 
        ON lock.Lock_ProductID = psp.St_ProductID 
        AND lock.Lock_Batchno = psp.St_BatchNo
    WHERE psp.st_periode = @Periode2
      -- Only batches with stock > 0
      AND (psp.st_awalrelease + psp.st_terimarelease + psp.st_terimalangsung - psp.st_keluarrelease 
           + psp.st_awalkarantina + psp.st_terimakarantina - psp.st_keluarkarantina) > 0
      -- Exclude locked batches
      AND lock.Lock_BatchNo IS NULL
    ORDER BY 
        rpp.Reg_ExpDate ASC,
        psp.St_ProductID, 
        psp.St_BatchNo
  `;
  
  const result = await db.request().query(query);
  return result.recordset;
}

/**
 * Get holidays from m_holiday table for working days calculation
 * Returns active holidays that can be used by frontend to skip non-working days
 */
async function getHolidays() {
  const db = await connect();
  const query = `
    SELECT 
      Day_Date,
      process_date
    FROM m_holiday 
    WHERE isActive = 1
    ORDER BY Day_Date DESC
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

// Get raw t_alur_proses data for PCT-eligible batches (batches that completed Tempel Label Realese)
async function getPCTRawData(period = 'MTD') {
  const db = await connect();
  
  // Determine the date filter based on period
  let dateFilter;
  if (period === 'YTD') {
    dateFilter = `AND YEAR(EndDate) = YEAR(GETDATE())`;
  } else {
    dateFilter = `AND YEAR(EndDate) = YEAR(GETDATE())
        AND MONTH(EndDate) = MONTH(GETDATE())`;
  }
  
  const query = `
    WITH FilteredAlur AS (
      SELECT 
        ap.*,
        mp.Product_Name,
        ISNULL(mtg.tahapan_group, 'Other') AS tahapan_group
      FROM t_alur_proses ap
      JOIN m_Product mp ON ap.Product_ID = mp.Product_ID
      LEFT JOIN m_tahapan_group mtg ON ap.kode_tahapan = mtg.kode_tahapan
      WHERE 
        ap.Batch_Date LIKE '[1-2][0-9][0-9][0-9]/[0-1][0-9]/[0-3][0-9]'
        AND LEN(ap.Batch_Date) = 10
        AND ISDATE(ap.Batch_Date) = 1
        AND mp.Product_Name NOT LIKE '%granulat%'
    ),
    -- Get only batches that have completed "Tempel Label Realese" with EndDate based on period
    CompletedBatches AS (
      SELECT DISTINCT Batch_No
      FROM FilteredAlur
      WHERE LOWER(nama_tahapan) LIKE '%tempel%label%realese%'
        AND EndDate IS NOT NULL
        ${dateFilter}
    )
    -- Return all raw alur_proses entries for the completed batches
    SELECT 
      fa.Product_ID,
      fa.Product_Name,
      fa.Batch_No,
      fa.Batch_Date,
      fa.kode_tahapan,
      fa.nama_tahapan,
      fa.tahapan_group,
      fa.StartDate,
      fa.EndDate,
      fa.urutan
    FROM FilteredAlur fa
    INNER JOIN CompletedBatches cb ON fa.Batch_No = cb.Batch_No
    ORDER BY fa.Batch_No, fa.urutan
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

// ============================================
// Product Type (Jenis Sediaan) CRUD Operations
// ============================================

// Get all product types (distinct Jenis_Sediaan values)
async function getProductTypes() {
  const db = await connect();
  const query = `
    SELECT DISTINCT Jenis_Sediaan 
    FROM m_product_sediaan_produksi 
    WHERE Jenis_Sediaan IS NOT NULL
    ORDER BY Jenis_Sediaan
  `;
  const result = await db.request().query(query);
  return result.recordset.map(r => r.Jenis_Sediaan);
}

// Get all product type assignments
async function getProductTypeAssignments() {
  const db = await connect();
  const query = `
    SELECT 
      psp.Product_ID,
      psp.Jenis_Sediaan,
      mp.Product_Name
    FROM m_product_sediaan_produksi psp
    LEFT JOIN m_Product mp ON psp.Product_ID = mp.Product_ID
    ORDER BY psp.Product_ID
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

// Get products without type assignment (for notification)
async function getProductsWithoutType() {
  const db = await connect();
  const query = `
    SELECT DISTINCT 
      mp.Product_ID,
      mp.Product_Name
    FROM m_Product mp
    WHERE mp.Product_ID NOT IN (
      SELECT Product_ID FROM m_product_sediaan_produksi WHERE Product_ID IS NOT NULL
    )
    AND mp.Product_Name NOT LIKE '%Granulat%'
    ORDER BY mp.Product_ID
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

// Get products in current WIP without type assignment
// Simplified query for better performance
async function getWIPProductsWithoutType() {
  const db = await connect();
  const query = `
    -- Get active WIP products (simplified for performance)
    SELECT DISTINCT 
      a.Product_ID,
      prod.Product_Name
    FROM t_alur_proses a
    INNER JOIN t_rfid_batch_card rbc 
      ON rbc.Product_ID = a.Product_ID 
      AND rbc.Batch_No = a.Batch_No 
      AND rbc.Batch_Date = a.Batch_Date
      AND rbc.isActive = 1 
      AND rbc.Batch_Status = 'Open'
    INNER JOIN m_product prod 
      ON a.Product_ID = prod.Product_ID
    LEFT JOIN m_product_sediaan_produksi psp 
      ON a.Product_ID = psp.Product_ID
    WHERE psp.Product_ID IS NULL
      AND prod.Product_Name NOT LIKE '%Granulat%'
      AND a.Batch_Date >= CONVERT(varchar(10), DATEADD(month, -12, GETDATE()), 111)
    ORDER BY a.Product_ID
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

// Create/Update product type assignment
async function upsertProductType(productId, jenisSediaan) {
  const db = await connect();
  const request = db.request();
  request.input('productId', sql.VarChar(255), productId);
  request.input('jenisSediaan', sql.VarChar(255), jenisSediaan);
  
  // Check if exists
  const checkQuery = `SELECT COUNT(*) as count FROM m_product_sediaan_produksi WHERE Product_ID = @productId`;
  const checkResult = await request.query(checkQuery);
  
  if (checkResult.recordset[0].count > 0) {
    // Update
    const updateQuery = `UPDATE m_product_sediaan_produksi SET Jenis_Sediaan = @jenisSediaan WHERE Product_ID = @productId`;
    await request.query(updateQuery);
    return { action: 'updated', productId, jenisSediaan };
  } else {
    // Insert
    const insertQuery = `INSERT INTO m_product_sediaan_produksi (Product_ID, Jenis_Sediaan) VALUES (@productId, @jenisSediaan)`;
    await request.query(insertQuery);
    return { action: 'created', productId, jenisSediaan };
  }
}

// Bulk create/update product type assignments
async function bulkUpsertProductTypes(assignments) {
  const db = await connect();
  const results = [];
  
  for (const assignment of assignments) {
    const request = db.request();
    request.input('productId', sql.VarChar(255), assignment.productId);
    request.input('jenisSediaan', sql.VarChar(255), assignment.jenisSediaan);
    
    // Check if exists
    const checkQuery = `SELECT COUNT(*) as count FROM m_product_sediaan_produksi WHERE Product_ID = @productId`;
    const checkResult = await request.query(checkQuery);
    
    if (checkResult.recordset[0].count > 0) {
      // Update
      const updateQuery = `UPDATE m_product_sediaan_produksi SET Jenis_Sediaan = @jenisSediaan WHERE Product_ID = @productId`;
      await request.query(updateQuery);
      results.push({ action: 'updated', productId: assignment.productId, jenisSediaan: assignment.jenisSediaan });
    } else {
      // Insert
      const insertQuery = `INSERT INTO m_product_sediaan_produksi (Product_ID, Jenis_Sediaan) VALUES (@productId, @jenisSediaan)`;
      await request.query(insertQuery);
      results.push({ action: 'created', productId: assignment.productId, jenisSediaan: assignment.jenisSediaan });
    }
  }
  
  return results;
}

// Delete product type assignment
async function deleteProductType(productId) {
  const db = await connect();
  const request = db.request();
  request.input('productId', sql.VarChar(255), productId);
  
  const query = `DELETE FROM m_product_sediaan_produksi WHERE Product_ID = @productId`;
  const result = await request.query(query);
  return { deleted: result.rowsAffected[0] > 0, productId };
}

// ============================================
// QC (Quality Control) Dashboard Functions
// ============================================

/**
 * Get all items currently in QC (tempellabelDate is NULL)
 * Joins with m_item_manufacturing to get item names
 */
async function getQCInProcess() {
  const db = await connect();
  const result = await db.request().query(`
    SELECT 
      d.DNc_No,
      d.DNc_Date,
      d.DNc_ItemID,
      m.Item_Name,
      m.Item_Group,
      ISNULL(m.Item_Type, 'Unknown') as Item_Type,
      d.DNc_SuppName,
      d.DNc_PrcName,
      d.DNC_BatchNo,
      d.DNc_ReleaseQTY,
      d.DNc_RejectQTY,
      d.DNc_UnitID,
      d.DNc_InspectionDate,
      d.DNc_Inspektor,
      d.DNc_SampleDate,
      d.DNc_SampleBy,
      d.DNc_ReleaseRemark,
      d.DNc_RejectRemark,
      DATEDIFF(day, d.DNc_Date, GETDATE()) as DaysInQC
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NULL
    ORDER BY d.DNc_Date ASC
  `);
  return result.recordset;
}

/**
 * Get items that entered/completed QC in a specific period (YYYYMM)
 * Joins with m_item_manufacturing to get item names
 */
async function getQCByPeriod(period) {
  const db = await connect();
  const request = db.request();
  request.input('period', sql.NVarChar(6), period);
  const result = await request.query(`
    SELECT 
      d.DNc_No,
      d.DNc_Date,
      d.DNc_ItemID,
      m.Item_Name,
      m.Item_Group,
      ISNULL(m.Item_Type, 'Unknown') as Item_Type,
      d.DNc_SuppName,
      d.DNc_PrcName,
      d.DNC_BatchNo,
      d.DNc_ReleaseQTY,
      d.DNc_RejectQTY,
      d.DNc_UnitID,
      d.DNc_InspectionDate,
      d.DNc_Inspektor,
      d.DNC_tempellabelDate,
      d.DNc_SampleDate,
      d.DNc_SampleBy,
      d.DNc_ReleaseRemark,
      d.DNc_RejectRemark,
      d.alasan_Reject,
      DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) as TurnaroundDays
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE CONVERT(nvarchar(6), d.DNc_Date, 112) = @period
    ORDER BY d.DNc_Date DESC
  `);
  return result.recordset;
}

/**
 * Get items completed in QC during a specific period (by completion date, YYYYMM)
 */
async function getQCCompletedByPeriod(period) {
  const db = await connect();
  const request = db.request();
  request.input('period', sql.NVarChar(6), period);
  const result = await request.query(`
    SELECT 
      d.DNc_No,
      d.DNc_Date,
      d.DNc_ItemID,
      m.Item_Name,
      m.Item_Group,
      ISNULL(m.Item_Type, 'Unknown') as Item_Type,
      d.DNc_SuppName,
      d.DNc_PrcName,
      d.DNC_BatchNo,
      d.DNc_ReleaseQTY,
      d.DNc_RejectQTY,
      d.DNc_UnitID,
      d.DNc_InspectionDate,
      d.DNc_Inspektor,
      d.DNC_tempellabelDate,
      d.DNc_SampleDate,
      d.DNc_SampleBy,
      d.DNc_ReleaseRemark,
      d.DNc_RejectRemark,
      d.alasan_Reject,
      DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) as TurnaroundDays
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NOT NULL
      AND CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112) = @period
    ORDER BY d.DNC_tempellabelDate DESC
  `);
  return result.recordset;
}

/**
 * Get QC summary statistics for dashboard cards and charts.
 * Returns monthly volume, aging, supplier breakdown, and turnaround in one call.
 */
async function getQCSummary(period) {
  const db = await connect();

  // Use provided period or default to current month
  const targetPeriod = period || new Date().toISOString().slice(0, 7).replace('-', '');

  // 1. Aging buckets for items that entered QC in the selected period
  const agingReq = db.request();
  agingReq.input('agingPeriod', sql.NVarChar(6), targetPeriod);
  const agingResult = await agingReq.query(`
    SELECT 
      CASE 
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 3 THEN '0-3 days'
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 7 THEN '4-7 days'
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 14 THEN '8-14 days'
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 30 THEN '15-30 days'
        ELSE '30+ days'
      END as aging_bucket,
      COUNT(*) as count
    FROM t_dnc_manufacturing
    WHERE CONVERT(nvarchar(6), DNc_Date, 112) = @agingPeriod
    GROUP BY 
      CASE 
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 3 THEN '0-3 days'
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 7 THEN '4-7 days'
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 14 THEN '8-14 days'
        WHEN DATEDIFF(day, DNc_Date, COALESCE(DNC_tempellabelDate, GETDATE())) <= 30 THEN '15-30 days'
        ELSE '30+ days'
      END
  `);

  // 2. Monthly volume (last 13 months)
  const monthlyResult = await db.request().query(`
    SELECT 
      CONVERT(nvarchar(6), DNc_Date, 112) as period,
      COUNT(*) as total,
      SUM(CASE WHEN DNC_tempellabelDate IS NULL THEN 1 ELSE 0 END) as still_in_qc,
      SUM(CASE WHEN DNC_tempellabelDate IS NOT NULL THEN 1 ELSE 0 END) as completed,
      SUM(DNc_ReleaseQTY) as total_released,
      SUM(DNc_RejectQTY) as total_rejected,
      SUM(CASE WHEN DNc_RejectQTY > 0 THEN 1 ELSE 0 END) as has_reject,
      ROUND(SUM(DNc_RejectQTY) * 100.0 / NULLIF(SUM(DNc_ReleaseQTY + DNc_RejectQTY), 0), 2) as reject_pct
    FROM t_dnc_manufacturing
    WHERE DNc_Date >= DATEADD(month, -13, GETDATE())
    GROUP BY CONVERT(nvarchar(6), DNc_Date, 112)
    ORDER BY period ASC
  `);

  // 3. Turnaround stats for selected period
  const turnaroundReq = db.request();
  turnaroundReq.input('currentPeriod', sql.NVarChar(6), targetPeriod);
  const turnaroundResult = await turnaroundReq.query(`
    SELECT 
      AVG(DATEDIFF(day, DNc_Date, DNC_tempellabelDate)) as avg_days,
      MIN(DATEDIFF(day, DNc_Date, DNC_tempellabelDate)) as min_days,
      MAX(DATEDIFF(day, DNc_Date, DNC_tempellabelDate)) as max_days
    FROM t_dnc_manufacturing
    WHERE DNC_tempellabelDate IS NOT NULL
      AND CONVERT(nvarchar(6), DNC_tempellabelDate, 112) = @currentPeriod
  `);

  // 4. Top suppliers with pending QC
  const supplierResult = await db.request().query(`
    SELECT TOP 10 
      DNc_SuppName as supplier,
      COUNT(*) as in_qc
    FROM t_dnc_manufacturing
    WHERE DNC_tempellabelDate IS NULL AND DNc_SuppName != ''
    GROUP BY DNc_SuppName
    ORDER BY in_qc DESC
  `);

  // 5. Pending by item group
  const groupResult = await db.request().query(`
    SELECT 
      m.Item_Group as item_group,
      COUNT(*) as count
    FROM t_dnc_manufacturing d
    JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NULL
    GROUP BY m.Item_Group
    ORDER BY count DESC
  `);

  // 6. Daily intake & completions for selected period
  const dailyReq = db.request();
  dailyReq.input('curPeriod', sql.NVarChar(6), targetPeriod);
  const dailyIntakeResult = await dailyReq.query(`
    SELECT 
      CONVERT(date, DNc_Date) as entry_date,
      COUNT(*) as cnt
    FROM t_dnc_manufacturing
    WHERE CONVERT(nvarchar(6), DNc_Date, 112) = @curPeriod
    GROUP BY CONVERT(date, DNc_Date)
    ORDER BY entry_date
  `);

  const dailyCompReq = db.request();
  dailyCompReq.input('curPeriod2', sql.NVarChar(6), targetPeriod);
  const dailyCompResult = await dailyCompReq.query(`
    SELECT 
      CONVERT(date, DNC_tempellabelDate) as completion_date,
      COUNT(*) as cnt
    FROM t_dnc_manufacturing
    WHERE DNC_tempellabelDate IS NOT NULL
      AND CONVERT(nvarchar(6), DNC_tempellabelDate, 112) = @curPeriod2
    GROUP BY CONVERT(date, DNC_tempellabelDate)
    ORDER BY completion_date
  `);

  // 7. Total currently in QC
  const totalInQC = await db.request().query(`
    SELECT COUNT(*) as total FROM t_dnc_manufacturing WHERE DNC_tempellabelDate IS NULL
  `);

  // 8. Aging by material type (BB/BK split) for items entering in selected period
  const agingByTypeReq = db.request();
  agingByTypeReq.input('agingByTypePeriod', sql.NVarChar(6), targetPeriod);
  const agingByTypeResult = await agingByTypeReq.query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CASE 
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 3 THEN '0-3 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 7 THEN '4-7 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 14 THEN '8-14 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 30 THEN '15-30 days'
        ELSE '30+ days'
      END as aging_bucket,
      COUNT(*) as count
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NOT NULL
      AND CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112) = @agingByTypePeriod
    GROUP BY 
      ISNULL(m.Item_Type, 'Unknown'),
      CASE 
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 3 THEN '0-3 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 7 THEN '4-7 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 14 THEN '8-14 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 30 THEN '15-30 days'
        ELSE '30+ days'
      END
  `);

  // 9. Daily intake by material type for selected period
  const dailyIntakeByTypeReq = db.request();
  dailyIntakeByTypeReq.input('curPeriodByType1', sql.NVarChar(6), targetPeriod);
  const dailyIntakeByTypeResult = await dailyIntakeByTypeReq.query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CONVERT(date, d.DNc_Date) as entry_date,
      COUNT(*) as cnt
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE CONVERT(nvarchar(6), d.DNc_Date, 112) = @curPeriodByType1
    GROUP BY ISNULL(m.Item_Type, 'Unknown'), CONVERT(date, d.DNc_Date)
    ORDER BY entry_date
  `);

  // 10. Daily completions by material type for selected period
  const dailyCompByTypeReq = db.request();
  dailyCompByTypeReq.input('curPeriodByType2', sql.NVarChar(6), targetPeriod);
  const dailyCompByTypeResult = await dailyCompByTypeReq.query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CONVERT(date, d.DNC_tempellabelDate) as completion_date,
      COUNT(*) as cnt
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NOT NULL
      AND CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112) = @curPeriodByType2
    GROUP BY ISNULL(m.Item_Type, 'Unknown'), CONVERT(date, d.DNC_tempellabelDate)
    ORDER BY completion_date
  `);

  // 11. Monthly volume by material type (last 13 months)
  const monthlyByTypeResult = await db.request().query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CONVERT(nvarchar(6), d.DNc_Date, 112) as period,
      COUNT(*) as total,
      SUM(CASE WHEN d.DNC_tempellabelDate IS NOT NULL THEN 1 ELSE 0 END) as completed,
      SUM(d.DNc_ReleaseQTY) as total_released,
      SUM(d.DNc_RejectQTY) as total_rejected,
      SUM(CASE WHEN d.DNc_RejectQTY > 0 THEN 1 ELSE 0 END) as has_reject,
      ROUND(SUM(d.DNc_RejectQTY) * 100.0 / NULLIF(SUM(d.DNc_ReleaseQTY + d.DNc_RejectQTY), 0), 2) as reject_pct
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNc_Date >= DATEADD(month, -13, GETDATE())
    GROUP BY ISNULL(m.Item_Type, 'Unknown'), CONVERT(nvarchar(6), d.DNc_Date, 112)
    ORDER BY material_type, period ASC
  `);

  // 11b. Aging by material type YTD (last 13 months) for YTD view
  const agingByTypeYTDResult = await db.request().query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CASE 
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 3 THEN '0-3 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 7 THEN '4-7 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 14 THEN '8-14 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 30 THEN '15-30 days'
        ELSE '30+ days'
      END as aging_bucket,
      COUNT(*) as count
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NOT NULL
      AND d.DNC_tempellabelDate >= DATEADD(month, -13, GETDATE())
    GROUP BY 
      ISNULL(m.Item_Type, 'Unknown'),
      CASE 
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 3 THEN '0-3 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 7 THEN '4-7 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 14 THEN '8-14 days'
        WHEN DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) <= 30 THEN '15-30 days'
        ELSE '30+ days'
      END
  `);

  // 12. Leadtime by month and material type (last 18 months for frontend filtering)
  const leadtimeMonthlyResult = await db.request().query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112) as period,
      AVG(CAST(DATEDIFF(day, d.DNc_Date, d.DNC_tempellabelDate) AS FLOAT)) as avg_turnaround,
      COUNT(*) as sample_count
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NOT NULL
      AND d.DNC_tempellabelDate >= DATEADD(month, -18, GETDATE())
    GROUP BY ISNULL(m.Item_Type, 'Unknown'), CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112)
    ORDER BY period ASC, material_type
  `);

  // 13. Released count by material type grouped by completion month (for KPI cards)
  const releasedByTypeResult = await db.request().query(`
    SELECT 
      ISNULL(m.Item_Type, 'Unknown') as material_type,
      CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112) as period,
      COUNT(*) as completed,
      SUM(d.DNc_ReleaseQTY) as total_released,
      SUM(d.DNc_RejectQTY) as total_rejected,
      SUM(CASE WHEN d.DNc_RejectQTY > 0 THEN 1 ELSE 0 END) as has_reject,
      ROUND(SUM(d.DNc_RejectQTY) * 100.0 / NULLIF(SUM(d.DNc_ReleaseQTY + d.DNc_RejectQTY), 0), 2) as reject_pct
    FROM t_dnc_manufacturing d
    LEFT JOIN m_item_manufacturing m ON d.DNc_ItemID = m.Item_ID
    WHERE d.DNC_tempellabelDate IS NOT NULL
      AND d.DNC_tempellabelDate >= DATEADD(month, -13, GETDATE())
    GROUP BY ISNULL(m.Item_Type, 'Unknown'), CONVERT(nvarchar(6), d.DNC_tempellabelDate, 112)
    ORDER BY material_type, period ASC
  `);

  return {
    totalInQC: totalInQC.recordset[0].total,
    aging: agingResult.recordset,
    monthly: monthlyResult.recordset,
    turnaround: turnaroundResult.recordset[0],
    topSuppliers: supplierResult.recordset,
    itemGroups: groupResult.recordset,
    dailyIntake: dailyIntakeResult.recordset,
    dailyCompletions: dailyCompResult.recordset,
    currentPeriod: targetPeriod,
    agingByType: agingByTypeResult.recordset,
    agingByTypeYTD: agingByTypeYTDResult.recordset,
    dailyIntakeByType: dailyIntakeByTypeResult.recordset,
    dailyCompletionsByType: dailyCompByTypeResult.recordset,
    monthlyByType: monthlyByTypeResult.recordset,
    leadtimeMonthly: leadtimeMonthlyResult.recordset,
    releasedByType: releasedByTypeResult.recordset
  };
}

// ============================================
// OF1 Target Configuration
// ============================================

async function getOF1TargetProducts(periode) {
  const db = await connect();
  // Use the same SP that powers the dashboard to ensure product list consistency
  const spResult = await db.request().query('EXEC sp_Dashboard_DataReportManHours');
  const allData = spResult.recordset;
  
  // Filter to the requested period
  let filtered = allData.filter(r => String(r.Periode) === periode);
  
  // If requested period has no data (beyond SP range), fall back to current month's data
  if (filtered.length === 0) {
    const now = new Date();
    const currentPeriode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    filtered = allData.filter(r => String(r.Periode) === currentPeriode);
  }
  
  // Extract unique products with their group
  const seen = new Set();
  const products = [];
  for (const r of filtered) {
    if (!seen.has(r.Product_ID)) {
      seen.add(r.Product_ID);
      products.push({
        Product_ID: r.Product_ID,
        Product_Code: r.Product_Code,
        Product_Name: r.Product_NM,
        Product_Group: r.Product_Group
      });
    }
  }
  // Sort: Fokus first, then by name
  products.sort((a, b) => {
    if (a.Product_Group !== b.Product_Group) return a.Product_Group.localeCompare(b.Product_Group);
    return (a.Product_Name || '').localeCompare(b.Product_Name || '');
  });
  return products;
}

async function getOF1TargetConfig(periodes) {
  const db = await connect();
  // periodes is an array of YYYYMM strings
  const conditions = periodes.map((p, i) => `@p${i}`).join(', ');
  const request = db.request();
  periodes.forEach((p, i) => {
    request.input(`p${i}`, sql.VarChar, p);
  });
  const result = await request.query(`
    SELECT Periode, Product_ID, PersenTarget
    FROM m_target_of1_dashboard
    WHERE Periode IN (${conditions})
    ORDER BY Periode, Product_ID
  `);
  return result.recordset;
}

async function saveOF1TargetConfig(periode, targets) {
  // targets is an array of { Product_ID, PersenTarget }
  const db = await connect();
  const transaction = new sql.Transaction(db);
  await transaction.begin();
  
  try {
    // Delete existing entries for this period
    const deleteReq = new sql.Request(transaction);
    deleteReq.input('Periode', sql.VarChar, periode);
    await deleteReq.query('DELETE FROM m_target_of1_dashboard WHERE Periode = @Periode');
    
    // Insert new entries in batches of 100
    for (let i = 0; i < targets.length; i += 100) {
      const batch = targets.slice(i, i + 100);
      const values = batch.map((t, idx) => `(@Periode, @pid${i + idx}, @pct${i + idx}, 0, '')`).join(', ');
      const insertReq = new sql.Request(transaction);
      insertReq.input('Periode', sql.VarChar, periode);
      batch.forEach((t, idx) => {
        insertReq.input(`pid${i + idx}`, sql.NVarChar, t.Product_ID);
        insertReq.input(`pct${i + idx}`, sql.Int, t.PersenTarget);
      });
      await insertReq.query(`INSERT INTO m_target_of1_dashboard (Periode, Product_ID, PersenTarget, TargetBets, ListBets) VALUES ${values}`);
    }
    
    await transaction.commit();
    return { success: true };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

module.exports = { WorkInProgress, getMaterial ,getOTA, getDailySales, getLostSales, getbbbk, WorkInProgressAlur, AlurProsesBatch, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getOrderFulfillment, getWipProdByDept, getWipByGroup, getProductCycleTime, getProductCycleTimeYearly, getStockReport, getMonthlyForecast, getForecast, getofsummary, getPCTBreakdown, getPCTSummary, getPCTRawData, getWIPData, getProductList, getOTCProducts, getProductGroupDept, getReleasedBatches, getReleasedBatchesYTD, getDailyProduction, getLeadTime, getOF1Target, getBatchExpiry, getHolidays, getProductTypes, getProductTypeAssignments, getProductsWithoutType, getWIPProductsWithoutType, upsertProductType, bulkUpsertProductTypes, deleteProductType, getQCInProcess, getQCByPeriod, getQCCompletedByPeriod, getQCSummary, getOF1TargetProducts, getOF1TargetConfig, saveOF1TargetConfig};