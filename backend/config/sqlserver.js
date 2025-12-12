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
  },
  // Connection pool settings for better performance
  pool: {
    max: 10,           // Maximum number of connections in pool
    min: 2,            // Minimum number of connections in pool
    idleTimeoutMillis: 30000  // Close idle connections after 30 seconds
  },
  // Request timeout settings
  requestTimeout: 60000,     // 60 seconds timeout for queries
  connectionTimeout: 30000   // 30 seconds timeout for connection
};

// Global connection pool (singleton pattern)
let globalPool = null;

async function connect() {
  try {
    // Reuse existing pool if available and connected
    if (globalPool && globalPool.connected) {
      return globalPool;
    }
    
    // Close any existing pool that's not connected
    if (globalPool) {
      try {
        await globalPool.close();
      } catch (e) {
        // Ignore errors when closing
      }
    }
    
    // Create new pool
    globalPool = await sql.connect(config);
    
    // Handle pool errors
    globalPool.on('error', err => {
      console.error('SQL Pool Error:', err);
      globalPool = null;
    });
    
    return globalPool;
  } catch (err) {
    console.error('SQL Server connection error:', err);
    globalPool = null;
    throw err;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (globalPool) {
    try {
      await globalPool.close();
      console.log('SQL Server pool closed');
    } catch (e) {
      console.error('Error closing SQL pool:', e);
    }
  }
  process.exit(0);
});

module.exports = { connect, sql };