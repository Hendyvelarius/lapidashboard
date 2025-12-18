/**
 * Daily Snapshot Scheduler
 * 
 * Automatically saves dashboard snapshots every day.
 * - First run at 18:00 every day (retries at 18:10, 18:20, etc.)
 * - Second run at 23:30 every day (retries at 23:40, 23:50)
 * - Month-end snapshots are marked specially on the last day of the month
 */

const { createMonthEndSnapshot } = require('../controllers/SnapshotController');

// Configuration
const SCHEDULED_TIMES = [
  { hour: 18, minute: 0, name: 'evening', maxRetries: 6, retryIntervalMs: 10 * 60 * 1000 }, // 18:00, retry every 10 min, max 6 times
  { hour: 23, minute: 30, name: 'night', maxRetries: 2, retryIntervalMs: 10 * 60 * 1000 }   // 23:30, retry at 23:40, 23:50
];

// Track scheduler state
let schedulerInterval = null;
let isRunning = false;
let lastSuccessfulRuns = {}; // Track per schedule: { 'evening': Date, 'night': Date }
let retryCounts = {}; // Track per schedule: { 'evening': 0, 'night': 0 }
let retryTimeouts = {}; // Track per schedule

/**
 * Check if today is the last day of the month
 */
function isLastDayOfMonth() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // If tomorrow is a different month, today is the last day
  return tomorrow.getMonth() !== now.getMonth();
}

/**
 * Check if current time is at or past a scheduled time
 */
function isAtOrPastScheduledTime(schedule) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const scheduledMinutes = schedule.hour * 60 + schedule.minute;
  return currentMinutes >= scheduledMinutes;
}

/**
 * Check if current time is before the next scheduled window (to avoid running night schedule during evening window)
 */
function isBeforeNextSchedule(currentSchedule) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  // Find next schedule after current one
  const currentIndex = SCHEDULED_TIMES.findIndex(s => s.name === currentSchedule.name);
  const nextSchedule = SCHEDULED_TIMES[currentIndex + 1];
  
  if (!nextSchedule) return true; // No next schedule, always valid
  
  const nextScheduleMinutes = nextSchedule.hour * 60 + nextSchedule.minute;
  return currentMinutes < nextScheduleMinutes;
}

/**
 * Get current period string (YYYYMM)
 */
function getCurrentPeriode() {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Get current date string (YYYY-MM-DD)
 */
function getCurrentDateString() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * Check if we've already successfully run today for this schedule
 */
function hasAlreadyRunToday(scheduleName) {
  const lastRun = lastSuccessfulRuns[scheduleName];
  if (!lastRun) return false;
  
  const lastRunDate = `${lastRun.getFullYear()}-${String(lastRun.getMonth() + 1).padStart(2, '0')}-${String(lastRun.getDate()).padStart(2, '0')}`;
  return lastRunDate === getCurrentDateString();
}

/**
 * Attempt to create daily snapshot with retry logic
 */
async function attemptDailySnapshot(schedule) {
  const { name, maxRetries, retryIntervalMs } = schedule;
  
  // Skip if already run today for this schedule
  if (hasAlreadyRunToday(name)) {
    console.log(`⏭️ Daily snapshot (${name}) already created for ${getCurrentDateString()}, skipping...`);
    return;
  }

  const retryCount = retryCounts[name] || 0;
  const isMonthEnd = isLastDayOfMonth();
  
  console.log(`\n🗓️ ===== DAILY SNAPSHOT ATTEMPT (${name.toUpperCase()}) =====`);
  console.log(`📅 Date: ${getCurrentDateString()}`);
  console.log(`📊 Period: ${getCurrentPeriode()}`);
  console.log(`⏰ Schedule: ${schedule.hour}:${String(schedule.minute).padStart(2, '0')}`);
  console.log(`🔄 Retry count: ${retryCount}/${maxRetries}`);
  if (isMonthEnd) {
    console.log(`📌 This is a MONTH-END snapshot`);
  }

  try {
    // createMonthEndSnapshot will mark it as month-end if it's the last day
    const result = await createMonthEndSnapshot();
    
    if (result.success) {
      console.log(`✅ Daily snapshot (${name}) created successfully!`);
      lastSuccessfulRuns[name] = new Date();
      retryCounts[name] = 0;
      
      // Clear any pending retry for this schedule
      if (retryTimeouts[name]) {
        clearTimeout(retryTimeouts[name]);
        retryTimeouts[name] = null;
      }
    }
  } catch (error) {
    console.error(`❌ Daily snapshot (${name}) failed:`, error.message);
    
    retryCounts[name] = (retryCounts[name] || 0) + 1;
    
    if (retryCounts[name] < maxRetries) {
      console.log(`⏳ Scheduling retry in ${retryIntervalMs / 60000} minutes (attempt ${retryCounts[name] + 1}/${maxRetries})...`);
      
      // Schedule retry
      retryTimeouts[name] = setTimeout(() => attemptDailySnapshot(schedule), retryIntervalMs);
    } else {
      console.error(`🚫 Max retries reached for ${name} schedule. Daily snapshot for ${getCurrentDateString()} failed.`);
      console.error(`   Manual intervention may be required.`);
      retryCounts[name] = 0; // Reset for next attempt
    }
  }
  
  console.log(`========================================\n`);
}

/**
 * Main scheduler check - runs every minute
 */
function schedulerCheck() {
  // Check each scheduled time (runs every day)
  for (const schedule of SCHEDULED_TIMES) {
    if (isAtOrPastScheduledTime(schedule) && 
        isBeforeNextSchedule(schedule) && 
        !hasAlreadyRunToday(schedule.name)) {
      console.log(`🔔 Daily snapshot trigger (${schedule.name}) conditions met!`);
      attemptDailySnapshot(schedule);
    }
  }
}

/**
 * Start the daily scheduler
 */
function startScheduler() {
  if (isRunning) {
    console.log('⚠️ Daily scheduler is already running');
    return;
  }

  console.log(`\n🚀 Starting Daily Snapshot Scheduler`);
  console.log(`   Schedules:`);
  SCHEDULED_TIMES.forEach(s => {
    console.log(`   - ${s.name}: ${s.hour}:${String(s.minute).padStart(2, '0')} (max ${s.maxRetries} retries)`);
  });
  console.log(`   Current date: ${getCurrentDateString()}`);
  console.log(`   Current period: ${getCurrentPeriode()}`);
  console.log(`   Is last day of month: ${isLastDayOfMonth()}`);
  
  // Check every minute
  schedulerInterval = setInterval(schedulerCheck, 60 * 1000);
  isRunning = true;
  
  // Run initial check
  schedulerCheck();
  
  console.log(`✅ Scheduler started successfully\n`);
}

/**
 * Stop the daily scheduler
 */
function stopScheduler() {
  if (!isRunning) {
    console.log('⚠️ Daily scheduler is not running');
    return;
  }

  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
  
  // Clear all retry timeouts
  Object.keys(retryTimeouts).forEach(key => {
    if (retryTimeouts[key]) {
      clearTimeout(retryTimeouts[key]);
      retryTimeouts[key] = null;
    }
  });
  
  isRunning = false;
  retryCounts = {};
  
  console.log('🛑 Daily scheduler stopped');
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  const scheduleStatus = SCHEDULED_TIMES.map(s => ({
    name: s.name,
    time: `${s.hour}:${String(s.minute).padStart(2, '0')}`,
    maxRetries: s.maxRetries,
    lastSuccessfulRun: lastSuccessfulRuns[s.name] ? lastSuccessfulRuns[s.name].toISOString() : null,
    retryCount: retryCounts[s.name] || 0,
    hasRunToday: hasAlreadyRunToday(s.name)
  }));

  return {
    isRunning,
    schedules: scheduleStatus,
    currentDate: getCurrentDateString(),
    currentPeriode: getCurrentPeriode(),
    isLastDayOfMonth: isLastDayOfMonth()
  };
}

/**
 * Manually trigger a daily snapshot (for testing or manual override)
 */
async function triggerManualSnapshot() {
  console.log(`🔧 Manual daily snapshot triggered`);
  // Reset all states to allow manual trigger
  Object.keys(lastSuccessfulRuns).forEach(key => {
    lastSuccessfulRuns[key] = null;
  });
  Object.keys(retryCounts).forEach(key => {
    retryCounts[key] = 0;
  });
  
  // Use evening schedule for manual trigger
  const eveningSchedule = SCHEDULED_TIMES.find(s => s.name === 'evening') || SCHEDULED_TIMES[0];
  await attemptDailySnapshot(eveningSchedule);
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerManualSnapshot,
  // Keep old name for backward compatibility
  triggerManualMonthEnd: triggerManualSnapshot
};
