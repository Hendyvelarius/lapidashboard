const { connect } = require('./config/sqlserver');
(async () => {
  const db = await connect();
  const def = (await db.request().query(
    `SELECT m.definition FROM sys.sql_modules m JOIN sys.objects o ON m.object_id=o.object_id WHERE o.name='sp_Dashboard_WIP'`
  )).recordset;
  const text = def[0] ? def[0].definition : '(not found)';
  const lines = text.split(/\r?\n/);
  console.log(`Total lines: ${lines.length}\n`);
  // Print only ACTIVE (non-commented) lines with their numbers
  lines.forEach((ln, i) => {
    const trimmed = ln.trim();
    if (trimmed === '' ) return;
    if (trimmed.startsWith('--')) return; // skip fully-commented lines
    console.log(String(i+1).padStart(4), ln);
  });
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
