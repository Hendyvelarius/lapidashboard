const sql = require('mssql');
require('dotenv').config();

const config = {
  user: process.env.LFSQL_User,
  password: process.env.LFSQL_Password,
  server: process.env.LFSQL_Server,
  port: parseInt(process.env.LFSQL_Port, 10) || 1433,
  database: process.env.LFSQL_Database,
  options: {
    encrypt: false, 
    trustServerCertificate: true 
  }
};

async function connect() {
  try {
    const pool = await sql.connect(config);
    return pool;
  } catch (err) {
    console.error('SQL Server connection error:', err);
    throw err;
  }
}

module.exports = { connect, sql };