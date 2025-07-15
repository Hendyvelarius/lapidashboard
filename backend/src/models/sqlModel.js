const { connect } = require('../../config/sqlserver');

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
        AND CONVERT(date, ap.Batch_Date, 111) >= DATEADD(month, -1, GETDATE())
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

module.exports = { WorkInProgress, WorkInProgressAlur, AlurProsesBatch, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getOrderFulfillment, getWipProdByDept, getWipByGroup, getProductCycleTime, getProductCycleTimeYearly };