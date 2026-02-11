const { connectSnapshot } = require('../../config/sqlserverSnapshot');
const sql = require('mssql');

/**
 * Save or update a dashboard snapshot
 * If a snapshot exists for the same date, it will be overwritten (for auto-saves)
 * Manual saves always create new entries
 */
async function saveSnapshot(periode, snapshotDate, rawData, processedData, createdBy = 'SYSTEM', isMonthEnd = false, isManual = false, notes = null) {
  const db = await connectSnapshot();
  const request = db.request();
  
  request.input('periode', sql.VarChar(6), periode);
  request.input('snapshot_date', sql.Date, snapshotDate);
  request.input('raw_data', sql.NVarChar(sql.MAX), JSON.stringify(rawData));
  request.input('processed_data', sql.NVarChar(sql.MAX), JSON.stringify(processedData));
  request.input('created_by', sql.VarChar(100), createdBy);
  request.input('is_month_end', sql.Bit, isMonthEnd ? 1 : 0);
  request.input('is_manual', sql.Bit, isManual ? 1 : 0);
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
  const db = await connectSnapshot();
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
 * Returns: { periods: [], autoSaves: [], manualSaves: [] }
 */
async function getAvailableSnapshots() {
  const db = await connectSnapshot();
  const result = await db.request().execute('sp_Dashboard_GetAvailableSnapshots');
  
  // The stored procedure returns multiple result sets
  return {
    periods: result.recordsets[0] || [],      // Period summaries
    autoSaves: result.recordsets[1] || [],    // All auto-save dates
    manualSaves: result.recordsets[2] || []   // All manual saves
  };
}

/**
 * Delete a snapshot by ID or date
 */
async function deleteSnapshot(id = null, snapshotDate = null) {
  const db = await connectSnapshot();
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
  const db = await connectSnapshot();
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
  const db = await connectSnapshot();
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
      is_manual,
      notes
    FROM t_dashboard_snapshots 
    WHERE periode = @periode
    ORDER BY snapshot_date DESC
  `);
  
  return result.recordset;
}

/**
 * Get a snapshot by ID (used for manual saves)
 */
async function getSnapshotById(id) {
  const db = await connectSnapshot();
  const request = db.request();
  
  request.input('id', sql.Int, id);
  
  const result = await request.query(`
    SELECT 
      id,
      periode,
      snapshot_date,
      raw_data,
      processed_data,
      created_at,
      created_by,
      is_month_end,
      is_manual,
      notes
    FROM t_dashboard_snapshots 
    WHERE id = @id
  `);
  
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

module.exports = {
  saveSnapshot,
  getSnapshot,
  getSnapshotById,
  getAvailableSnapshots,
  deleteSnapshot,
  snapshotExists,
  getSnapshotsForPeriode
};
