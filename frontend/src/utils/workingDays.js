/**
 * Working Days Calculator Utility
 * 
 * This module provides functions to calculate working days between two dates,
 * excluding weekends (Saturday and Sunday) and holidays.
 * 
 * Based on the factory's SQL function fn_JumlahHariKerja logic.
 */

// Holiday data - dates when the factory is closed
// Format: 'YYYYMMDD' to match the SQL function's convert(nvarchar(8), date, 112) format
// This can be updated or fetched from an API in the future
let holidayList = new Set();

/**
 * Initialize holidays from an array of date strings or Date objects
 * @param {Array<string|Date>} holidays - Array of holiday dates
 */
export const setHolidays = (holidays) => {
  holidayList = new Set();
  holidays.forEach(date => {
    const formatted = formatDateToKey(date);
    if (formatted) {
      holidayList.add(formatted);
    }
  });
};

/**
 * Add a single holiday
 * @param {string|Date} date - Holiday date to add
 */
export const addHoliday = (date) => {
  const formatted = formatDateToKey(date);
  if (formatted) {
    holidayList.add(formatted);
  }
};

/**
 * Get current holiday list
 * @returns {Array<string>} Array of holiday date keys
 */
export const getHolidays = () => {
  return Array.from(holidayList);
};

/**
 * Clear all holidays
 */
export const clearHolidays = () => {
  holidayList = new Set();
};

/**
 * Format a date to 'YYYYMMDD' key format
 * @param {string|Date} date - Date to format
 * @returns {string|null} Formatted date string or null if invalid
 */
const formatDateToKey = (date) => {
  if (!date) return null;
  
  let dateObj;
  if (date instanceof Date) {
    dateObj = date;
  } else {
    dateObj = new Date(date);
  }
  
  if (isNaN(dateObj.getTime())) return null;
  
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}${month}${day}`;
};

/**
 * Check if a date is a weekend (Saturday = 6, Sunday = 0)
 * @param {Date} date - Date to check
 * @returns {boolean} True if weekend
 */
const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
};

/**
 * Check if a date is a holiday
 * @param {Date} date - Date to check
 * @returns {boolean} True if holiday
 */
const isHoliday = (date) => {
  const key = formatDateToKey(date);
  return holidayList.has(key);
};

/**
 * Check if a date is a working day (not weekend and not holiday)
 * @param {Date} date - Date to check
 * @returns {boolean} True if working day
 */
export const isWorkingDay = (date) => {
  return !isWeekend(date) && !isHoliday(date);
};

/**
 * Calculate the number of working days between two dates.
 * This function mimics the SQL fn_JumlahHariKerja logic:
 * - Counts days from DateFrom to DateTo (inclusive)
 * - Excludes weekends (Saturday and Sunday)
 * - Excludes holidays from the holiday list
 * - Returns count - 1 (to match SQL function behavior)
 * 
 * @param {string|Date} dateFrom - Start date
 * @param {string|Date} dateTo - End date
 * @returns {number} Number of working days (excluding start day, like SQL function)
 */
export const calculateWorkingDays = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return 0;
  
  let startDate, endDate;
  
  // Parse dates
  if (dateFrom instanceof Date) {
    startDate = new Date(dateFrom);
  } else {
    startDate = new Date(dateFrom);
  }
  
  if (dateTo instanceof Date) {
    endDate = new Date(dateTo);
  } else {
    endDate = new Date(dateTo);
  }
  
  // Validate dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }
  
  // Normalize to start of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  // If dates are the same, return 0 (matching SQL function behavior)
  if (startDate.getTime() === endDate.getTime()) {
    return 0;
  }
  
  // Ensure startDate is before endDate
  if (startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }
  
  // Calculate total days between dates
  const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
  
  let workingDaysCount = 0;
  const currentDate = new Date(startDate);
  
  // Iterate through each day (matching SQL WHILE loop)
  for (let counter = 0; counter <= totalDays; counter++) {
    if (isWorkingDay(currentDate)) {
      workingDaysCount++;
    }
    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // Return count - 1 to match SQL function behavior
  // (SQL function returns @CounterFix - 1)
  return Math.max(0, workingDaysCount - 1);
};

/**
 * Calculate working days from a start date to today
 * Convenience function for WIP calculations
 * 
 * @param {string|Date} startDate - Start date
 * @returns {number} Number of working days from startDate to today
 */
export const calculateWorkingDaysToToday = (startDate) => {
  if (!startDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return calculateWorkingDays(startDate, today);
};

/**
 * Simple calendar days calculation (original behavior)
 * Keep this for comparison or if working days calculation is disabled
 * 
 * @param {string|Date} dateFrom - Start date
 * @param {string|Date} dateTo - End date  
 * @returns {number} Number of calendar days
 */
export const calculateCalendarDays = (dateFrom, dateTo) => {
  if (!dateFrom || !dateTo) return 0;
  
  let startDate = dateFrom instanceof Date ? new Date(dateFrom) : new Date(dateFrom);
  let endDate = dateTo instanceof Date ? new Date(dateTo) : new Date(dateTo);
  
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return 0;
  }
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate - startDate;
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
};

/**
 * Calculate working days from a start date to today
 * Using calendar days (original behavior)
 * 
 * @param {string|Date} startDate - Start date
 * @returns {number} Number of calendar days from startDate to today
 */
export const calculateCalendarDaysToToday = (startDate) => {
  if (!startDate) return 0;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return calculateCalendarDays(startDate, today);
};

// Default export with all functions
export default {
  setHolidays,
  addHoliday,
  getHolidays,
  clearHolidays,
  isWorkingDay,
  calculateWorkingDays,
  calculateWorkingDaysToToday,
  calculateCalendarDays,
  calculateCalendarDaysToToday
};
