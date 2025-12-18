const { connect } = require('../../config/sqlserver');
const sql = require('mssql');

/**
 * Save or update a dashboard snapshot
 * If a snapshot exists for the same date, it will be overwritten
 */
async function saveSnapshot(periode, snapshotDate, rawData, processedData, createdBy = 'SYSTEM', isMonthEnd = false, notes = null) {
  const db = await connect();
  const request = db.request();
  
  request.input('periode', sql.VarChar(6), periode);
  request.input('snapshot_date', sql.Date, snapshotDate);
  request.input('raw_data', sql.NVarChar(sql.MAX), JSON.stringify(rawData));
  request.input('processed_data', sql.NVarChar(sql.MAX), JSON.stringify(processedData));
  request.input('created_by', sql.VarChar(100), createdBy);
  request.input('is_month_end', sql.Bit, isMonthEnd ? 1 : 0);
  request.input('notes', sql.NVarChar(500), notes);
  
  const result = await request.execute('sp_Dashboard_SaveSnapshot');
  return result.recordset[0];
}

/**
 * Get a snapshot by date or periode
 * @param {string} periode - YYYYMM format (optional)
 * @param {Date} snapshotDate - specific date (optional)
 */
async function getSnapshot(periode = null, snapshotDate = null) {
  const db = await connect();
  const request = db.request();
  
  request.input('periode', sql.VarChar(6), periode);
  request.input('snapshot_date', sql.Date, snapshotDate);
  
  const result = await request.execute('sp_Dashboard_GetSnapshot');
  
  if (result.recordset.length === 0) {
    return null;
  }
  
  const snapshot = result.recordset[0];
  
  // Parse JSON data
  return {
    ...snapshot,
    raw_data: JSON.parse(snapshot.raw_data),
    processed_data: JSON.parse(snapshot.processed_data)
  };
}

/**
 * Get list of all available periods with snapshots
 */
async function getAvailableSnapshots() {
  const db = await connect();
  const result = await db.request().execute('sp_Dashboard_GetAvailableSnapshots');
  return result.recordset;
}

/**
 * Delete a snapshot by ID or date
 */
async function deleteSnapshot(id = null, snapshotDate = null) {
  const db = await connect();
  const request = db.request();
  
  request.input('id', sql.Int, id);
  request.input('snapshot_date', sql.Date, snapshotDate);
  
  const result = await request.execute('sp_Dashboard_DeleteSnapshot');
  return result.recordset[0];
}

/**
 * Check if a snapshot exists for a specific date
 */
async function snapshotExists(snapshotDate) {
  const db = await connect();
  const request = db.request();
  
  request.input('snapshot_date', sql.Date, snapshotDate);
  
  const result = await request.query(`
    SELECT COUNT(*) as count 
    FROM t_dashboard_snapshots 
    WHERE snapshot_date = @snapshot_date
  `);
  
  return result.recordset[0].count > 0;
}

/**
 * Get all snapshots for a specific periode (for history view)
 */
async function getSnapshotsForPeriode(periode) {
  const db = await connect();
  const request = db.request();
  
  request.input('periode', sql.VarChar(6), periode);
  
  const result = await request.query(`
    SELECT 
      id,
      periode,
      snapshot_date,
      created_at,
      created_by,
      is_month_end,
      notes
    FROM t_dashboard_snapshots 
    WHERE periode = @periode
    ORDER BY snapshot_date DESC
  `);
  
  return result.recordset;
}

module.exports = {
  saveSnapshot,
  getSnapshot,
  getAvailableSnapshots,
  deleteSnapshot,
  snapshotExists,
  getSnapshotsForPeriode
};
