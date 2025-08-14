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
    
    // Return the data as is
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
