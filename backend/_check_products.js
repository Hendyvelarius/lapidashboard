const sql = require('mssql');
require('dotenv').config();
const { connect } = require('./config/sqlserver');
const { getOF1TargetProducts } = require('./src/models/sqlModel');

async function run() {
  const db = await connect();

  // SP result for 202604
  const spResult = await db.request().query('EXEC sp_Dashboard_DataReportManHours');
  const spCurrent = spResult.recordset.filter(r => r.Periode === '202604');
  const spIDs = new Set(spCurrent.map(r => r.Product_ID));

  // Current modal (v_m_Product_aktif)
  const modalProducts = await getOF1TargetProducts('202604');
  const modalIDs = new Set(modalProducts.map(r => r.Product_ID));

  console.log('SP 202604 products:', spIDs.size);
  console.log('Modal products:', modalIDs.size);

  // In SP but not modal
  const inSpNotModal = [...spIDs].filter(id => !modalIDs.has(id));
  console.log('\n=== In SP but NOT in current modal (' + inSpNotModal.length + ') ===');
  inSpNotModal.forEach(id => {
    const r = spCurrent.find(x => x.Product_ID === id);
    console.log('  ' + id + ' | ' + r.Product_NM + ' | ' + r.Product_Group);
  });

  // In modal but not SP
  const inModalNotSp = [...modalIDs].filter(id => !spIDs.has(id));
  console.log('\n=== In current modal but NOT in SP (' + inModalNotSp.length + ') ===');
  inModalNotSp.forEach(id => {
    const r = modalProducts.find(x => x.Product_ID === id);
    console.log('  ' + id + ' | ' + r.Product_Name + ' | ' + r.Product_Group);
  });

  process.exit(0);
}
run().catch(e => { console.error(e); process.exit(1); });
