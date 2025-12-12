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
      -- Using fn_JumlahHariKerja for working days calculation (excluding weekends and holidays)
      dbo.fn_JumlahHariKerja(
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
      -- Using fn_JumlahHariKerja for working days calculation (excluding weekends and holidays)
      dbo.fn_JumlahHariKerja(
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
  
  // Using fn_JumlahHariKerja to calculate working days (excluding weekends and holidays)
  // This replaces the simple DATEDIFF calculation
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
      -- Total working days from earliest StartDate to Tempel Label Realese EndDate
      dbo.fn_JumlahHariKerja(
        MIN(fa.StartDate),
        MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel%label%realese%' THEN fa.EndDate END)
      ) AS Total_Days,
      -- Timbang stage working days
      dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.EndDate END)
      ) AS Timbang_Days,
      -- QC stage working days
      dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'QC' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QC' THEN fa.EndDate END)
      ) AS QC_Days,
      -- Mikro stage working days
      dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.EndDate END)
      ) AS Mikro_Days,
      -- QA stage working days
      dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'QA' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QA' THEN fa.EndDate END)
      ) AS QA_Days,
      -- Proses stage working days (everything else that's not null and not the above categories)
      dbo.fn_JumlahHariKerja(
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
      dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Timbang' THEN fa.EndDate END)
      ) IS NOT NULL
      OR dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'QC' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QC' THEN fa.EndDate END)
      ) IS NOT NULL
      OR dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'Mikro' THEN fa.EndDate END)
      ) IS NOT NULL
      OR dbo.fn_JumlahHariKerja(
        MIN(CASE WHEN fa.tahapan_group = 'QA' THEN fa.StartDate END),
        MAX(CASE WHEN fa.tahapan_group = 'QA' THEN fa.EndDate END)
      ) IS NOT NULL
      OR dbo.fn_JumlahHariKerja(
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
  const query = `
 select a.Product_ID, a.Batch_No, a.Batch_Date, a.nama_tahapan, a.kode_tahapan, a.StartDate, a.EndDate, urutan,  grp.tahapan_group,
 Product_Name, gp.Group_Dept, sediaan.Jenis_Sediaan, Prev_Step, Display
 into #tmpData
 from t_alur_proses a 
 left join (select Product_ID, Batch_No, Batch_Date from t_alur_proses where nama_tahapan like '%tempel%label' and EndDate is not null) xy on xy.Product_ID=a.Product_ID and xy.Batch_No = a.Batch_No and xy.Batch_Date=a.Batch_Date
 left join (select * from t_dnc_product where isnull(DNC_TempelLabel,'')<>'') b on a.Batch_No=b.DNc_BatchNo and a.Product_ID = b.DNc_ProductID --and a.Batch_Date =b.DNC_BatchDate
 join (select distinct Batch_No, Batch_Date, Product_ID from t_rfid_batch_card where isActive=1 and Batch_Status='Open') c on c.Product_ID = a.Product_ID and c.Batch_Date=a.Batch_Date and c.Batch_No = a.Batch_No
 left join m_tahapan_group grp on a.kode_tahapan= grp.kode_tahapan
 join m_product prod on a.Product_ID = prod.Product_ID
 left join m_product_pn_group gp on gp.Group_ProductID = a.Product_ID and replace(Group_Periode,' ','') = CONVERT(varchar(6), getdate(),112)
 left join m_product_sediaan_produksi sediaan on sediaan.Product_ID=a.Product_ID
 left join (
			select distinct Batch_No, Batch_Date, Product_ID, EndDate from t_alur_proses where ltrim(rtrim(nama_tahapan)) like 'Timbang BB'
            and EndDate is not null
            ) d on d.Batch_Date=a.Batch_Date and d.Batch_No=a.Batch_No and d.Product_ID=a.Product_ID
        left join (
			select distinct Batch_No, Batch_Date, Product_ID, EndDate from t_alur_proses where ltrim(rtrim(nama_tahapan)) like 'Terima Bahan Baku'
            and EndDate is not null
            ) mulaiProd on mulaiProd.Batch_Date=a.Batch_Date and mulaiProd.Batch_No=a.Batch_No and mulaiProd.Product_ID=a.Product_ID    
 where
  --a.Batch_No='FP025' and
 b.DNc_BatchNo is null and
 CONVERT(nvarchar(6), a.Batch_Date, 112) between  CONVERT(nvarchar(6), dateadd(month,-12,GETDATE()), 112) and CONVERT(nvarchar(6), GETDATE(), 112)
and (prod.Product_Name  not like '%Granulat%') 
and not (a.Batch_No ='CY3A01' or a.Batch_No ='BI063' or a.Batch_No ='PI3L01')
and xy.Product_ID is null
and (d.Batch_No is not null or mulaiProd.Batch_No is not null)
--select * from #tmpData

-- pastikan kolomnya ada dulu
ALTER TABLE #tmpData ADD IdleStartDate DATETIME NULL;

-- update IdleStartDate berdasarkan prev step
UPDATE a
SET a.IdleStartDate = (
    SELECT MIN(b.EndDate)
    FROM #tmpData b
    INNER JOIN split(a.Prev_Step, ';') AS ps
        ON LTRIM(RTRIM(ps.items)) = ltrim(rtrim(b.nama_tahapan))
    WHERE a.Product_ID = b.Product_ID
      AND a.Batch_No = b.Batch_No
)
FROM #tmpData a;
select * from #tmpData;
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
    -- Batch-level details with Total_Days using working days calculation
    BatchDetails AS (
      SELECT 
        fa.Batch_No,
        fa.Product_ID,
        fa.Product_Name,
        -- Total working days from earliest StartDate to Tempel Label Realese EndDate
        dbo.fn_JumlahHariKerja(
          MIN(fa.StartDate),
          MAX(CASE WHEN LOWER(fa.nama_tahapan) LIKE '%tempel%label%realese%' THEN fa.EndDate END)
        ) AS Total_Days
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
      ISNULL(mpg.Group_Dept, 'Unknown') AS Dept,
      CASE 
        WHEN EXISTS (SELECT 1 FROM m_product_otc otc WHERE otc.Product_ID = bd.Product_ID) THEN 'OTC'
        WHEN bd.Product_Name LIKE '%generik%' OR bd.Product_Name LIKE '%generic%' THEN 'Generik'
        ELSE 'ETH'
      END AS Kategori
    FROM BatchDetails bd
    LEFT JOIN m_Product_PN_Group mpg ON mpg.Group_ProductID = bd.Product_ID 
      AND mpg.Group_Periode = CONVERT(VARCHAR(7), GETDATE(), 120)
    GROUP BY bd.Product_ID, bd.Product_Name, mpg.Group_Dept
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
  
  // Get current year to filter data
  const currentYear = new Date().getFullYear();
  
  const query = `
    SELECT 
      periode,
      product_id,
      target,
      release
    FROM r_target_of1_dashboard
    WHERE periode LIKE '${currentYear}%'
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
      day_date,
      day_name,
      day_description
    FROM m_holiday 
    WHERE isActive = 1
    ORDER BY day_date DESC
  `;
  const result = await db.request().query(query);
  return result.recordset;
}

module.exports = { WorkInProgress, getMaterial ,getOTA, getDailySales, getLostSales, getbbbk, WorkInProgressAlur, AlurProsesBatch, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getOrderFulfillment, getWipProdByDept, getWipByGroup, getProductCycleTime, getProductCycleTimeYearly, getStockReport, getMonthlyForecast, getForecast, getofsummary, getPCTBreakdown, getPCTSummary, getWIPData, getProductList, getOTCProducts, getProductGroupDept, getReleasedBatches, getReleasedBatchesYTD, getDailyProduction, getLeadTime, getOF1Target, getBatchExpiry, getHolidays};