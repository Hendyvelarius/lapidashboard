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
      DATEDIFF(DAY, 
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
      DATEDIFF(DAY, 
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

module.exports = { WorkInProgress, getDailySales, getLostSales, getbbbk, WorkInProgressAlur, AlurProsesBatch, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getOrderFulfillment, getWipProdByDept, getWipByGroup, getProductCycleTime, getProductCycleTimeYearly, getStockReport, getMonthlyForecast, getForecast, getofsummary};