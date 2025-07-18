/**
 * Chart Data Processing Utilities
 * 
 * This module contains all chart data preparation functions for the dashboard.
 * These functions transform raw API data into chart-ready datasets.
 */

/**
 * Prepares fulfillment category data for stacked bar chart
 * @param {Array} rawData - Raw data from API
 * @returns {Object} Chart data object with labels and datasets
 */
export const prepareFulfillmentCategoryData = (rawData) => {
  if (!rawData || rawData.length === 0) {
    return { labels: [], datasets: [] };
  }
  // Group data by Pengelompokan
  const groupedData = {};
  rawData.forEach(item => {
    const category = item.pengelompokan || 'Uncategorized';
    if (!groupedData[category]) {
      groupedData[category] = {
        target: 0,
        released: 0,
        quarantined: 0,
        wip: 0,
        unprocessed: 0
      };
    }

    // Map fields directly from API
    const target = Number(item.jlhTarget) || 0;
    const released = Number(item.release) || 0;
    const quarantined = Number(item.karantina) || 0;
    const wip = Number(item.wip) || 0;
    
    // Calculate Unprocessed: jlhTarget - (release + karantina + wip)
    const unprocessed = Math.max(0, target - (released + quarantined + wip));

    groupedData[category].target += target;
    groupedData[category].released += released;
    groupedData[category].quarantined += quarantined;
    groupedData[category].wip += wip;
    groupedData[category].unprocessed += unprocessed;
  });

  const categories = Object.keys(groupedData);
  const releasedData = categories.map(cat => groupedData[cat].released);
  const quarantinedData = categories.map(cat => groupedData[cat].quarantined);
  const wipData = categories.map(cat => groupedData[cat].wip);
  const unprocessedData = categories.map(cat => groupedData[cat].unprocessed);

  return {
    labels: categories,
    datasets: [
      {
        label: 'Released',
        data: releasedData,
        backgroundColor: '#43a047',
        borderColor: '#43a047',
        borderWidth: 1,
        type: 'bar',
        stack: 'stack1',
      },
      {
        label: 'Quarantined',
        data: quarantinedData,
        backgroundColor: '#ffb347',
        borderColor: '#ffb347',
        borderWidth: 1,
        type: 'bar',
        stack: 'stack1',
      },
      {
        label: 'WIP',
        data: wipData,
        backgroundColor: '#4f8cff',
        borderColor: '#4f8cff',
        borderWidth: 1,
        type: 'bar',
        stack: 'stack1',
      },
      {
        label: 'Unprocessed',
        data: unprocessedData,
        backgroundColor: '#38e6c5',
        borderColor: '#38e6c5',
        borderWidth: 1,
        type: 'bar',
        stack: 'stack1',
      },
    ]
  };
};

/**
 * Prepares fulfillment department data for horizontal stacked bar chart
 * @param {Array} rawData - Raw data from API
 * @returns {Object} Chart data object with labels and datasets
 */
export const prepareFulfillmentDepartmentData = (rawData) => {
  if (!rawData || rawData.length === 0) return { labels: [], datasets: [] };

  // Group data by department
  const groupedData = {};
  rawData.forEach(item => {
    const dept = item.Group_Dept || 'Unknown';
    if (!groupedData[dept]) {
      groupedData[dept] = {
        released: 0,
        quarantined: 0,
        wip: 0,
        unprocessed: 0
      };
    }

    // Map fields directly from API
    const target = Number(item.jlhTarget) || 0;
    const released = Number(item.release) || 0;
    const quarantined = Number(item.karantina) || 0;
    const wip = Number(item.wip) || 0;
    
    // Calculate Unprocessed: jlhTarget - (release + karantina + wip)
    const unprocessed = Math.max(0, target - (released + quarantined + wip));

    groupedData[dept].released += released;
    groupedData[dept].quarantined += quarantined;
    groupedData[dept].wip += wip;
    groupedData[dept].unprocessed += unprocessed;
  });

  const departments = Object.keys(groupedData);
  
  return {
    labels: departments,
    datasets: [
      {
        label: 'Released',
        data: departments.map(dept => groupedData[dept].released),
        backgroundColor: '#43a047',
        borderColor: '#43a047',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'Quarantined',
        data: departments.map(dept => groupedData[dept].quarantined),
        backgroundColor: '#ffb347',
        borderColor: '#ffb347',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'WIP',
        data: departments.map(dept => groupedData[dept].wip),
        backgroundColor: '#4f8cff',
        borderColor: '#4f8cff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'Unprocessed',
        data: departments.map(dept => groupedData[dept].unprocessed),
        backgroundColor: '#38e6c5',
        borderColor: '#38e6c5',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
    ],
  };
};

/**
 * Prepares fulfillment department percentage data for horizontal stacked bar chart
 * @param {Array} rawData - Raw data from API
 * @returns {Object} Chart data object with labels and datasets, including groupedData for tooltips
 */
export const prepareFulfillmentDepartmentPercentData = (rawData) => {
  if (!rawData || rawData.length === 0) return { labels: [], datasets: [] };

  // Group data by department
  const groupedData = {};
  rawData.forEach(item => {
    const dept = item.Group_Dept || 'Unknown';
    if (!groupedData[dept]) {
      groupedData[dept] = {
        released: 0,
        quarantined: 0,
        wip: 0,
        unprocessed: 0,
        total: 0
      };
    }

    // Map fields directly from API
    const target = Number(item.jlhTarget) || 0;
    const released = Number(item.release) || 0;
    const quarantined = Number(item.karantina) || 0;
    const wip = Number(item.wip) || 0;
    
    // Calculate Unprocessed: jlhTarget - (release + karantina + wip)
    const unprocessed = Math.max(0, target - (released + quarantined + wip));

    groupedData[dept].released += released;
    groupedData[dept].quarantined += quarantined;
    groupedData[dept].wip += wip;
    groupedData[dept].unprocessed += unprocessed;
    groupedData[dept].total += released + quarantined + wip + unprocessed;
  });

  const departments = Object.keys(groupedData);
  
  return {
    labels: departments,
    datasets: [
      {
        label: 'Released',
        data: departments.map(dept => {
          const total = groupedData[dept].total;
          return total ? (groupedData[dept].released / total) * 100 : 0;
        }),
        backgroundColor: '#43a047',
        borderColor: '#43a047',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'Quarantined',
        data: departments.map(dept => {
          const total = groupedData[dept].total;
          return total ? (groupedData[dept].quarantined / total) * 100 : 0;
        }),
        backgroundColor: '#ffb347',
        borderColor: '#ffb347',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'WIP',
        data: departments.map(dept => {
          const total = groupedData[dept].total;
          return total ? (groupedData[dept].wip / total) * 100 : 0;
        }),
        backgroundColor: '#4f8cff',
        borderColor: '#4f8cff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'Unprocessed',
        data: departments.map(dept => {
          const total = groupedData[dept].total;
          return total ? (groupedData[dept].unprocessed / total) * 100 : 0;
        }),
        backgroundColor: '#38e6c5',
        borderColor: '#38e6c5',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
    ],
    groupedData, // Include for tooltip calculations
  };
};

/**
 * Prepares PCT (Processing Cycle Time) category data for bar chart
 * @param {Array|Object} rawData - Raw data from API (can be array or object with data/processed arrays)
 * @returns {Object} Chart data object with labels and datasets
 */
/**
 * Generate gradient colors based on PCT values
 * @param {number} pctValue - PCT value in days
 * @returns {string} Color string
 */
const getBarColor = (pctValue) => {
  if (pctValue < 20) return 'rgba(144, 238, 144, 0.8)'; // Light green
  if (pctValue < 25) return 'rgba(0, 128, 0, 0.8)';     // Green
  if (pctValue < 35) return 'rgba(255, 165, 0, 0.8)';   // Orange
  if (pctValue < 40) return 'rgba(255, 99, 71, 0.8)';   // Red-orange
  return 'rgba(255, 0, 0, 0.8)';                        // Red
};

export const preparePctCategoryData = (rawData) => {
  if (!rawData) {
    return { labels: [], datasets: [] };
  }

  // Handle different API response structures
  let dataArray = rawData;
  if (rawData.processed && Array.isArray(rawData.processed)) {
    dataArray = rawData.processed;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    dataArray = rawData.data;
  } else if (!Array.isArray(rawData)) {
    console.warn('PCT data is not an array:', rawData);
    return { labels: [], datasets: [] };
  }

  if (dataArray.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Group data by Kategori and calculate average PCT
  const groupedData = {};
  dataArray.forEach(item => {
    const kategori = item.Kategori || 'Uncategorized';
    if (!groupedData[kategori]) {
      groupedData[kategori] = {
        totalPct: 0,
        count: 0
      };
    }
    
    // Use PCTAverage field from the API response
    const pct = Number(item.PCTAverage) || 0;
    groupedData[kategori].totalPct += pct;
    groupedData[kategori].count += 1;
  });

  // Calculate averages
  const categories = Object.keys(groupedData);
  const averages = categories.map(cat => {
    const data = groupedData[cat];
    return data.count > 0 ? data.totalPct / data.count : 0;
  });

  // Generate colors based on PCT values
  const backgroundColors = averages.map(avg => getBarColor(avg));

  return {
    labels: categories,
    datasets: [
      {
        label: 'Average PCT (days)',
        data: averages,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 40,
      },
    ]
  };
};

/**
 * Prepares PCT department data for bar chart
 * @param {Array} rawData - Raw data from API
 * @returns {Object} Chart data object with labels and datasets
 */
export const preparePctDepartmentData = (rawData) => {
  if (!rawData) {
    return { labels: [], datasets: [] };
  }

  // Handle different API response structures
  let dataArray = rawData;
  if (rawData.processed && Array.isArray(rawData.processed)) {
    dataArray = rawData.processed;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    dataArray = rawData.data;
  } else if (!Array.isArray(rawData)) {
    console.warn('PCT data is not an array:', rawData);
    return { labels: [], datasets: [] };
  }

  if (dataArray.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Group data by Dept and calculate average PCT
  const groupedData = {};
  dataArray.forEach(item => {
    const department = item.Dept || 'Uncategorized';
    if (!groupedData[department]) {
      groupedData[department] = {
        totalPct: 0,
        count: 0
      };
    }
    
    const pct = Number(item.PCTAverage) || 0;
    groupedData[department].totalPct += pct;
    groupedData[department].count += 1;
  });

  // Calculate averages
  const departments = Object.keys(groupedData);
  const averages = departments.map(dept => {
    const data = groupedData[dept];
    return data.count > 0 ? data.totalPct / data.count : 0;
  });

  // Generate colors based on PCT values
  const backgroundColors = averages.map(avg => getBarColor(avg));

  return {
    labels: departments,
    datasets: [
      {
        label: 'Average PCT (days)',
        data: averages,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 40,
      },
    ]
  };
};

/**
 * Prepares top 10 highest PCT data for bar chart
 * @param {Array} rawData - Raw data from API
 * @returns {Object} Chart data object with labels and datasets
 */
export const preparePctHighestData = (rawData) => {
  if (!rawData) {
    return { labels: [], datasets: [] };
  }

  // Handle different API response structures
  let dataArray = rawData;
  if (rawData.processed && Array.isArray(rawData.processed)) {
    dataArray = rawData.processed;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    dataArray = rawData.data;
  } else if (!Array.isArray(rawData)) {
    console.warn('PCT data is not an array:', rawData);
    return { labels: [], datasets: [] };
  }

  if (dataArray.length === 0) {
    return { labels: [], datasets: [] };
  }

  // Get all items with their PCT values and sort by highest
  const itemsWithPct = dataArray
    .map(item => ({
      label: item.Product_Name || item.Product_Code || 'Unknown',
      pct: Number(item.PCTAverage) || 0
    }))
    .filter(item => item.pct > 0)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10); // Take top 10

  const labels = itemsWithPct.map(item => item.label);
  const pctValues = itemsWithPct.map(item => item.pct);

  // Generate colors based on PCT values
  const backgroundColors = pctValues.map(pct => getBarColor(pct));

  return {
    labels: labels,
    datasets: [
      {
        label: 'PCT (days)',
        data: pctValues,
        backgroundColor: backgroundColors,
        borderColor: backgroundColors,
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 40,
      },
    ]
  };
};
