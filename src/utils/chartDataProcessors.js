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

    // Sum Target (jlhTarget)
    groupedData[category].target += Number(item.jlhTarget) || 0;
    
    // Sum Released (Release + Release2)
    groupedData[category].released += (Number(item.Release) || 0) + (Number(item.Release2) || 0);
    
    // Sum WIP (JlhBetsSudahWIP)
    groupedData[category].wip += Number(item.JlhBetsSudahWIP) || 0;
    
    // Calculate Unprocessed (BetsBaru - JlhBetsSudahWIP)
    const betsBaru = Number(item.BetsBaru) || 0;
    const betsSudahWIP = Number(item.JlhBetsSudahWIP) || 0;
    groupedData[category].unprocessed += Math.max(0, betsBaru - betsSudahWIP);
    
    // Calculate Quarantined: (count of BetsKarantinaBulanSblmnya) - Release + karantina2 - release2
    const betsKarantinaCount = item.BetsKarantinaBulanSblmnya 
      ? item.BetsKarantinaBulanSblmnya.split(',').filter(bet => bet.trim()).length 
      : 0;
    const release = Number(item.Release) || 0;
    const karantina2 = Number(item.karantina2) || 0;
    const release2 = Number(item.release2) || 0;
    const quarantined = Math.max(0, betsKarantinaCount - release + karantina2 - release2);
    groupedData[category].quarantined += quarantined;
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

    // Aggregate values for each department
    groupedData[dept].released += (Number(item.Release) || 0) + (Number(item.Release2) || 0);
    
    // Calculate Quarantined: (count of BetsKarantinaBulanSblmnya) - Release + karantina2 - release2
    const betsKarantinaCount = item.BetsKarantinaBulanSblmnya 
      ? item.BetsKarantinaBulanSblmnya.split(',').filter(bet => bet.trim()).length 
      : 0;
    const release = Number(item.Release) || 0;
    const karantina2 = Number(item.karantina2) || 0;
    const release2 = Number(item.release2) || 0;
    const quarantined = Math.max(0, betsKarantinaCount - release + karantina2 - release2);
    groupedData[dept].quarantined += quarantined;
    
    // Sum WIP (JlhBetsSudahWIP)
    groupedData[dept].wip += Number(item.JlhBetsSudahWIP) || 0;
    
    // Unprocessed = BetsBaru - JlhBetsSudahWip
    const betsBaru = Number(item.BetsBaru) || 0;
    const betsSudahWip = Number(item.JlhBetsSudahWIP) || 0;
    groupedData[dept].unprocessed += Math.max(0, betsBaru - betsSudahWip);
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

    const release1 = Number(item.Release) || 0;
    const release2 = Number(item.Release2) || 0;
    const betsBaru = Number(item.BetsBaru) || 0;
    const betsSudahWip = Number(item.JlhBetsSudahWIP) || 0;
    const unprocessed = Math.max(0, betsBaru - betsSudahWip);
    const wip = Number(item.JlhBetsSudahWIP) || 0;

    // Calculate Quarantined: (count of BetsKarantinaBulanSblmnya) - Release + karantina2 - release2
    const betsKarantinaCount = item.BetsKarantinaBulanSblmnya 
      ? item.BetsKarantinaBulanSblmnya.split(',').filter(bet => bet.trim()).length 
      : 0;
    const release = Number(item.Release) || 0;
    const karantina2 = Number(item.karantina2) || 0;
    const release2Field = Number(item.release2) || 0;
    const quarantined = Math.max(0, betsKarantinaCount - release + karantina2 - release2Field);

    groupedData[dept].released += release1 + release2;
    groupedData[dept].quarantined += quarantined;
    groupedData[dept].wip += wip;
    groupedData[dept].unprocessed += unprocessed;
    groupedData[dept].total += (release1 + release2) + quarantined + wip + unprocessed; // released + quarantined + wip + unprocessed
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

  return {
    labels: categories,
    datasets: [
      {
        label: 'Average PCT (days)',
        data: averages,
        backgroundColor: '#4f8cff',
        borderColor: '#4f8cff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 40,
      },
    ]
  };
};
