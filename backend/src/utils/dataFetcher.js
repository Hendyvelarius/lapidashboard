const axios = require('axios');

// Helper functions to fetch data from your existing APIs
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';

async function fetchWipData(type = 'raw') {
  try {
    let endpoint;
    switch (type) {
      case 'by_dept':
        endpoint = '/wipDept';
        break;
      case 'by_category':
        endpoint = '/wipGroup';
        break;
      default:
        endpoint = '/wip';
    }
    
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    const data = response.data;
    
    // If it's raw WIP data and too large, provide summary
    if (type === 'raw' && data.data && data.data.length > 50) {
      const items = data.data;
      const summary = {
        total_items: items.length,
        categories: {},
        departments: {},
        avg_duration: Math.round(items.reduce((sum, item) => sum + (item.duration || 0), 0) / items.length),
        recent_items: items.slice(0, 10).map(item => ({
          name: item.name,
          batch: item.batch,
          duration: item.duration,
          kelompok: item.kelompok,
          dept: item.dept
        }))
      };
      
      // Count by categories
      items.forEach(item => {
        const category = item.kelompok || 'Unknown';
        summary.categories[category] = (summary.categories[category] || 0) + 1;
      });
      
      // Count by departments
      items.forEach(item => {
        const dept = item.dept || 'Unknown';
        summary.departments[dept] = (summary.departments[dept] || 0) + 1;
      });
      
      return { summary, note: "Data summarized to avoid token limits" };
    }
    
    return response.data;
  } catch (error) {
    console.error('Error fetching WIP data:', error.message);
    return null;
  }
}

async function fetchFulfillmentData(type = 'raw') {
  try {
    let endpoint;
    switch (type) {
      case 'by_category':
        endpoint = '/fulfillmentKelompok';
        break;
      case 'by_dept':
        endpoint = '/fulfillmentDept';
        break;
      default:
        endpoint = '/of';
    }
    
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching fulfillment data:', error.message);
    return null;
  }
}

async function fetchPctData(period = 'monthly') {
  try {
    const endpoint = period === 'yearly' ? '/pctYearly' : '/pct';
    const response = await axios.get(`${API_BASE_URL}${endpoint}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching PCT data:', error.message);
    return null;
  }
}

// Function calling handler
async function handleFunctionCall(functionCall) {
  const { name, arguments: args } = functionCall;
  const parsedArgs = JSON.parse(args);
  
  switch (name) {
    case 'fetch_wip_data':
      return await fetchWipData(parsedArgs.type);
    case 'fetch_fulfillment_data':
      return await fetchFulfillmentData(parsedArgs.type);
    case 'fetch_pct_data':
      return await fetchPctData(parsedArgs.period);
    default:
      return null;
  }
}

module.exports = {
  fetchWipData,
  fetchFulfillmentData,
  fetchPctData,
  handleFunctionCall
};
