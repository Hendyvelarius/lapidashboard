const sql = require('mssql');
require('dotenv').config();

/**
 * Separate SQL Server connection pool for the Snapshot feature.
 * Uses the same server/port/credentials as the main connection,
 * but targets the LAPI_Report database instead of lapifactory.
 */
const snapshotConfig = {
  user: process.env.LFSQL_User,
  password: process.env.LFSQL_Password,
  server: process.env.LFSQL_Server,
  port: parseInt(process.env.LFSQL_Port, 10) || 1433,
  database: process.env.LFSQL_Snapshot_Database || 'LAPI_Report',
  options: {
    encrypt: false,
    trustServerCertificate: true
  },
  // Connection pool settings
  pool: {
    max: 5,            // Fewer connections since snapshots are less frequent
    min: 1,
    idleTimeoutMillis: 30000
  },
  // Request timeout settings
  requestTimeout: 120000,    // 120 seconds – snapshot payloads can be large
  connectionTimeout: 30000
};

// Dedicated connection pool for snapshots (singleton)
let snapshotPool = null;

async function connectSnapshot() {
  try {
    if (snapshotPool && snapshotPool.connected) {
      return snapshotPool;
    }

    if (snapshotPool) {
      try {
        await snapshotPool.close();
      } catch (e) {
        // Ignore errors when closing
      }
    }

    // Create a new ConnectionPool (not the global sql.connect)
    snapshotPool = new sql.ConnectionPool(snapshotConfig);
    await snapshotPool.connect();

    snapshotPool.on('error', err => {
      console.error('Snapshot SQL Pool Error:', err);
      snapshotPool = null;
    });

    console.log(`✅ Snapshot DB connected to ${snapshotConfig.database}`);
    return snapshotPool;
  } catch (err) {
    console.error('Snapshot SQL Server connection error:', err);
    snapshotPool = null;
    throw err;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (snapshotPool) {
    try {
      await snapshotPool.close();
      console.log('Snapshot SQL Server pool closed');
    } catch (e) {
      console.error('Error closing snapshot SQL pool:', e);
    }
  }
});

module.exports = { connectSnapshot, sql };
