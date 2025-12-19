const SnapshotModel = require('../models/snapshotModel');
const SqlModel = require('../models/sqlModel');
const converterModel = require('../models/converterModel');

/**
 * Save a dashboard snapshot
 * POST /api/snapshots
 */
async function saveSnapshot(req, res) {
  try {
    const { notes, isMonthEnd, isManual } = req.body;
    const createdBy = req.body.createdBy || 'MANUAL';
    
    // Get current date and period
    const now = new Date();
    const snapshotDate = now.toISOString().split('T')[0]; // YYYY-MM-DD format
    const periode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Fetch all current data from the database
    console.log('📸 Fetching current data for snapshot...');
    
    const [
      wipData,
      ofData,
      pctData,
      forecastData,
      bbbkData,
      dailySalesData,
      lostSalesData,
      otaData,
      materialData,
      batchExpiryData
    ] = await Promise.all([
      SqlModel.WorkInProgress(),
      SqlModel.getofsummary(),
      SqlModel.getPCTSummary(),
      SqlModel.getForecast(),
      SqlModel.getbbbk(),
      SqlModel.getDailySales(),
      SqlModel.getLostSales(),
      SqlModel.getOTA(),
      SqlModel.getMaterial(),
      SqlModel.getBatchExpiry()
    ]);

    // Convert WIP data
    const convertedWipData = converterModel.WipConverter(wipData);

    // Structure raw data (same format as frontend cache)
    const rawData = {
      ofData: ofData || [],
      forecastData: forecastData || [],
      lostSalesData: lostSalesData || [],
      bbbkData: bbbkData || [],
      wipData: convertedWipData || [],
      pctData: pctData || [],
      otaData: otaData || [],
      materialData: materialData || [],
      batchExpiryData: batchExpiryData || [],
      dailySalesData: dailySalesData || []
    };

    // Store processed/summary data for quick display
    // These are aggregated values that don't need re-processing
    const processedData = {
      snapshotInfo: {
        timestamp: now.toISOString(),
        periode: periode,
        date: snapshotDate
      },
      summaryStats: {
        totalProducts: forecastData?.length || 0,
        totalWipBatches: convertedWipData?.length || 0,
        totalOFItems: ofData?.length || 0
      }
    };

    // Save to database
    const result = await SnapshotModel.saveSnapshot(
      periode,
      snapshotDate,
      rawData,
      processedData,
      createdBy,
      isMonthEnd || false,
      isManual || false,
      notes
    );

    console.log(`✅ Snapshot saved successfully: ${result.result} (manual: ${isManual || false})`);
    
    res.json({
      success: true,
      message: result.result === 'updated' ? 'Snapshot updated successfully' : 'Snapshot created successfully',
      result: result,
      periode: periode,
      date: snapshotDate,
      isManual: isManual || false
    });

  } catch (err) {
    console.error('❌ Error saving snapshot:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to save snapshot',
      message: err.message 
    });
  }
}

/**
 * Get a snapshot by periode, date, or ID
 * GET /api/snapshots/:periode?date=YYYY-MM-DD&id=123
 */
async function getSnapshot(req, res) {
  try {
    const { periode } = req.params;
    const { date, id } = req.query;
    
    let snapshot;
    
    if (id) {
      // Get by specific ID (for manual saves)
      snapshot = await SnapshotModel.getSnapshotById(parseInt(id));
    } else if (date) {
      // Get by specific date
      snapshot = await SnapshotModel.getSnapshot(null, date);
    } else if (periode) {
      // Get by periode (returns latest for that period)
      snapshot = await SnapshotModel.getSnapshot(periode, null);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Either periode, date, or id parameter is required' 
      });
    }

    if (!snapshot) {
      return res.status(404).json({ 
        success: false, 
        error: 'Snapshot not found',
        periode: periode,
        date: date,
        id: id
      });
    }

    res.json({
      success: true,
      snapshot: snapshot
    });

  } catch (err) {
    console.error('❌ Error getting snapshot:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get snapshot',
      message: err.message 
    });
  }
}

/**
 * Get list of all available snapshots
 * GET /api/snapshots/available
 */
async function getAvailableSnapshots(req, res) {
  try {
    const result = await SnapshotModel.getAvailableSnapshots();
    
    // Also get current period info
    const now = new Date();
    const currentPeriode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    res.json({
      success: true,
      currentPeriode: currentPeriode,
      periods: result.periods,         // Period summaries for dropdown
      autoSaves: result.autoSaves,     // All auto-save dates (for calendar view)
      manualSaves: result.manualSaves, // All manual saves
      // Legacy field for backward compatibility
      snapshots: result.periods
    });

  } catch (err) {
    console.error('❌ Error getting available snapshots:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get available snapshots',
      message: err.message 
    });
  }
}

/**
 * Get all snapshots for a specific periode
 * GET /api/snapshots/history/:periode
 */
async function getSnapshotHistory(req, res) {
  try {
    const { periode } = req.params;
    
    if (!periode) {
      return res.status(400).json({ 
        success: false, 
        error: 'Periode parameter is required' 
      });
    }

    const snapshots = await SnapshotModel.getSnapshotsForPeriode(periode);
    
    res.json({
      success: true,
      periode: periode,
      snapshots: snapshots
    });

  } catch (err) {
    console.error('❌ Error getting snapshot history:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to get snapshot history',
      message: err.message 
    });
  }
}

/**
 * Delete a snapshot
 * DELETE /api/snapshots/:id
 */
async function deleteSnapshot(req, res) {
  try {
    const { id } = req.params;
    const { date } = req.query;
    
    let result;
    
    if (id && id !== 'undefined') {
      result = await SnapshotModel.deleteSnapshot(parseInt(id), null);
    } else if (date) {
      result = await SnapshotModel.deleteSnapshot(null, date);
    } else {
      return res.status(400).json({ 
        success: false, 
        error: 'Either id or date parameter is required' 
      });
    }

    if (result.deleted_rows === 0) {
      return res.status(404).json({ 
        success: false, 
        error: 'Snapshot not found' 
      });
    }

    res.json({
      success: true,
      message: 'Snapshot deleted successfully',
      deletedRows: result.deleted_rows
    });

  } catch (err) {
    console.error('❌ Error deleting snapshot:', err);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete snapshot',
      message: err.message 
    });
  }
}

/**
 * Trigger month-end snapshot (used by scheduler)
 * This is an internal function, not directly exposed as API
 */
async function createMonthEndSnapshot() {
  const now = new Date();
  const snapshotDate = now.toISOString().split('T')[0];
  const periode = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  console.log(`🗓️ Creating month-end snapshot for ${periode}...`);
  
  try {
    // Fetch all current data
    const [
      wipData,
      ofData,
      pctData,
      forecastData,
      bbbkData,
      dailySalesData,
      lostSalesData,
      otaData,
      materialData,
      batchExpiryData
    ] = await Promise.all([
      SqlModel.WorkInProgress(),
      SqlModel.getofsummary(),
      SqlModel.getPCTSummary(),
      SqlModel.getForecast(),
      SqlModel.getbbbk(),
      SqlModel.getDailySales(),
      SqlModel.getLostSales(),
      SqlModel.getOTA(),
      SqlModel.getMaterial(),
      SqlModel.getBatchExpiry()
    ]);

    const convertedWipData = converterModel.WipConverter(wipData);

    const rawData = {
      ofData: ofData || [],
      forecastData: forecastData || [],
      lostSalesData: lostSalesData || [],
      bbbkData: bbbkData || [],
      wipData: convertedWipData || [],
      pctData: pctData || [],
      otaData: otaData || [],
      materialData: materialData || [],
      batchExpiryData: batchExpiryData || [],
      dailySalesData: dailySalesData || []
    };

    const processedData = {
      snapshotInfo: {
        timestamp: now.toISOString(),
        periode: periode,
        date: snapshotDate,
        isMonthEnd: true
      },
      summaryStats: {
        totalProducts: forecastData?.length || 0,
        totalWipBatches: convertedWipData?.length || 0,
        totalOFItems: ofData?.length || 0
      }
    };

    const result = await SnapshotModel.saveSnapshot(
      periode,
      snapshotDate,
      rawData,
      processedData,
      'SYSTEM_MONTHEND',
      true, // isMonthEnd = true
      `Automatic month-end snapshot for ${periode}`
    );

    console.log(`✅ Month-end snapshot created successfully: ${result.result}`);
    return { success: true, result };

  } catch (error) {
    console.error(`❌ Failed to create month-end snapshot:`, error);
    throw error;
  }
}

module.exports = {
  saveSnapshot,
  getSnapshot,
  getAvailableSnapshots,
  getSnapshotHistory,
  deleteSnapshot,
  createMonthEndSnapshot
};
