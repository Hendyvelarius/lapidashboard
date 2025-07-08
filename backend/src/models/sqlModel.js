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

module.exports = { WorkInProgress, WorkInProgressAlur, AlurProsesBatch, getFulfillmentPerKelompok, getFulfillment, getFulfillmentPerDept, getWipProdByDept, getWipByGroup};