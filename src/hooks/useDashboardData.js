import { useState, useEffect } from 'react';
import { apiUrl } from '../api';

const useDashboardData = () => {
  // State declarations
  const [wipData, setWipData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fulfillmentRawData, setFulfillmentRawData] = useState([]);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(true);
  const [pctRawData, setPctRawData] = useState([]);
  const [pctLoading, setPctLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // LocalStorage helper functions
  const STORAGE_KEY = 'DashboardData';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  const getStoredData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      
      const parsed = JSON.parse(stored);
      const now = Date.now();
      
      // Check if data is older than 1 hour
      if (now - parsed.timestamp > CACHE_DURATION) {
        localStorage.removeItem(STORAGE_KEY);
        return null;
      }
      
      return parsed;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
  };

  const saveToStorage = (wipData, fulfillmentData, pctData) => {
    try {
      const dataToStore = {
        wipData,
        fulfillmentData,
        pctData,
        timestamp: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  };

  const fetchFreshData = async (force = false) => {
    if (!force) {
      // Check localStorage first
      const storedData = getStoredData();
      if (storedData) {
        setWipData(storedData.wipData || []);
        setFulfillmentRawData(storedData.fulfillmentData || []);
        setPctRawData(storedData.pctData || []);
        setLastUpdated(new Date(storedData.timestamp));
        setLoading(false);
        setFulfillmentLoading(false);
        setPctLoading(false);
        return;
      }
    }

    // Fetch fresh data from APIs
    setLoading(true);
    setFulfillmentLoading(true);
    setPctLoading(true);
    setRefreshing(force);

    try {
      const [wipResponse, fulfillmentResponse, pctResponse] = await Promise.all([
        fetch(apiUrl('/api/wip')),
        fetch(apiUrl('/api/of')),
        fetch(apiUrl('/api/pctAverage'))
      ]);

      const [wipResult, fulfillmentResult, pctResult] = await Promise.all([
        wipResponse.json(),
        fulfillmentResponse.json(),
        pctResponse.json()
      ]);

      const wipData = wipResult.data || [];
      const fulfillmentData = fulfillmentResult.data || fulfillmentResult || [];
      const pctData = pctResult.processed || pctResult.data || pctResult || [];

      console.log('PCT API Response:', pctResult); // Debug log

      setWipData(wipData);
      setFulfillmentRawData(fulfillmentData);
      setPctRawData(pctData);
      
      // Save to localStorage
      saveToStorage(wipData, fulfillmentData, pctData);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setWipData([]);
      setFulfillmentRawData([]);
      setPctRawData([]);
    } finally {
      setLoading(false);
      setFulfillmentLoading(false);
      setPctLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchFreshData(true);
  };

  // Format timestamp for display
  const formatTimestamp = (date) => {
    if (!date) return '';
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Effect to fetch data on mount
  useEffect(() => {
    fetchFreshData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Return all the data and functions needed by components
  return {
    // Data states
    wipData,
    fulfillmentRawData,
    pctRawData,
    
    // Loading states
    loading,
    fulfillmentLoading,
    pctLoading,
    refreshing,
    
    // Metadata
    lastUpdated,
    
    // Functions
    handleRefresh,
    formatTimestamp,
    fetchFreshData
  };
};

export default useDashboardData;
