import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler } from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { useNavigate } from 'react-router';
import { apiUrl } from '../api';
import Sidebar from './Sidebar';
import DashboardLoading from './DashboardLoading';
import './SummaryDashboard.css';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement, Filler);

// Helper function to format numbers
const formatNumber = (num) => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num?.toLocaleString() || '0';
};

// Helper function to determine color based on coverage percentage
const getCoverageColor = (percentage) => {
  if (percentage < 50) return '#ef4444'; // red
  if (percentage < 100) return '#f59e0b'; // yellow/orange
  return '#10b981'; // green
};

// Helper function to create donut chart data for OTA
const createOTADonutData = (onTime, early, late) => {
  const total = onTime + early + late;
  if (total === 0) {
    return {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: ['#e5e7eb'],
        borderWidth: 0,
        cutout: '70%'
      }],
      notLatePercentage: 0
    };
  }

  const notLatePercentage = Math.round(((onTime + early) / total) * 100);

  return {
    labels: [
      `On Time: ${onTime} (${Math.round((onTime / total) * 100)}%)`,
      `Early: ${early} (${Math.round((early / total) * 100)}%)`,
      `Late: ${late} (${Math.round((late / total) * 100)}%)`
    ],
    datasets: [{
      data: [onTime, early, late],
      backgroundColor: ['#10b981', '#3b82f6', '#ef4444'], // green, blue, red
      borderWidth: 0,
      cutout: '70%'
    }],
    // Store total and notLate percentage for center text
    _total: total,
    notLatePercentage: notLatePercentage
  };
};

// Circular Progress Chart Component with Custom Center Content
const CircularProgress = ({ percentage, size = 120, strokeWidth = 12, color = '#4f8cff', backgroundColor = '#e5e7eb', title, onClick, className = '', centerContent, showPercentage = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  // Cap visual percentage at 100% while keeping actual percentage for display
  const visualPercentage = Math.min(percentage, 100);
  const strokeDashoffset = circumference - (visualPercentage / 100) * circumference;

  return (
    <div 
      className={`circular-progress ${onClick ? 'clickable' : ''} ${className}`} 
      style={{ width: size, height: size, position: 'relative', cursor: onClick ? 'pointer' : 'default' }}
      onClick={onClick}
      title={title}
    >
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
        />
      </svg>
      <div 
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          fontSize: centerContent ? '16px' : '24px',
          fontWeight: 'bold',
          color: '#1f2937',
          lineHeight: '1.2'
        }}
      >
        {centerContent || (showPercentage ? `${percentage.toFixed(0)}%` : '')}
      </div>
    </div>
  );
};

// KPI Card Component
const KPICard = ({ title, children, className = '', headerComponent = null }) => (
  <div className={`summary-kpi-card ${className}`}>
    <div className="summary-kpi-header">
      <div className="summary-kpi-title">{title}</div>
      {headerComponent && (
        <div className="summary-kpi-header-component">
          {headerComponent}
        </div>
      )}
    </div>
    <div className="summary-kpi-content">
      {children}
    </div>
  </div>
);

// Metric Box Component (for smaller metrics)
const MetricBox = ({ label, value, color = '#4f8cff' }) => (
  <div className="summary-metric-box" style={{ borderColor: color }}>
    <div className="summary-metric-value" style={{ color }}>{value}</div>
    <div className="summary-metric-label">{label}</div>
  </div>
);

// Inventory OJ Details Modal Component
const InventoryOJDetailsModal = ({ isOpen, onClose, forecastData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !forecastData) return null;

  // Calculate current period dynamically based on actual date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Calculate period ranges dynamically
  const last6MonthsPeriods = [];
  const last3MonthsPeriods = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const period = date.getFullYear() * 100 + (date.getMonth() + 1);
    last6MonthsPeriods.push(period);
    
    if (i < 3) {
      last3MonthsPeriods.push(period);
    }
  }
  
  // Group data by Product_ID to analyze each product's sales and release history
  const productHistory = {};
  const productDetails = {};
  
  forecastData.forEach(item => {
    const productId = item.Product_ID;
    const period = parseInt(item.Periode);
    const sales = item.Sales || 0;
    const release = item.Release || 0;
    
    if (!productHistory[productId]) {
      productHistory[productId] = {};
      productDetails[productId] = {
        Product_ID: productId,
        Product_Name: item.Product_Name || item.Product_NM || 'N/A',
        Product_Group: item.Product_Group || 'Unknown'
      };
    }
    productHistory[productId][period] = { sales, release };
  });
  
  const productIds = Object.keys(productHistory);
  
  let allDeadStockProducts = [];
  let allSlowMovingProducts = [];
  
  productIds.forEach(productId => {
    const history = productHistory[productId];
    const productDetail = productDetails[productId];
    
    // Check for dead stock (0 sales for last 6 months AND stock available in earliest and current periods)
    const hasSalesInLast6Months = last6MonthsPeriods.some(period => 
      (history[period]?.sales || 0) > 0
    );
    
    const earliestPeriod = last6MonthsPeriods[0];
    const currentPeriod = last6MonthsPeriods[last6MonthsPeriods.length - 1];
    
    const hasStockInEarliestPeriod = (history[earliestPeriod]?.release || 0) > 0;
    const hasStockInCurrentPeriod = (history[currentPeriod]?.release || 0) > 0;
    
    const isDeadStock = !hasSalesInLast6Months && hasStockInEarliestPeriod && hasStockInCurrentPeriod;
    
    if (isDeadStock) {
      allDeadStockProducts.push(productDetail);
    } else {
      // Check for slow moving (0 sales for last 3 months AND stock available in earliest and current periods)
      const hasSalesInLast3Months = last3MonthsPeriods.some(period => 
        (history[period]?.sales || 0) > 0
      );
      
      const earliestPeriod3M = last3MonthsPeriods[0];
      const currentPeriod3M = last3MonthsPeriods[last3MonthsPeriods.length - 1];
      
      const hasStockInEarliestPeriod3M = (history[earliestPeriod3M]?.release || 0) > 0;
      const hasStockInCurrentPeriod3M = (history[currentPeriod3M]?.release || 0) > 0;
      
      const isSlowMoving = !hasSalesInLast3Months && hasStockInEarliestPeriod3M && hasStockInCurrentPeriod3M;
      
      if (isSlowMoving) {
        allSlowMovingProducts.push(productDetail);
      }
    }
  });

  // Filter based on search term
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    
    return products.filter(product => {
      const productId = (product.Product_ID || '').toString().toLowerCase();
      const productName = (product.Product_Name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return productId.includes(search) || productName.includes(search);
    });
  };

  const slowMovingProducts = filterProducts(allSlowMovingProducts);
  const deadStockProducts = filterProducts(allDeadStockProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Inventory OJ</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product ID or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {slowMovingProducts.length + deadStockProducts.length} results for "{searchTerm}"
              {slowMovingProducts.length + deadStockProducts.length !== allSlowMovingProducts.length + allDeadStockProducts.length && 
                ` (filtered from ${allSlowMovingProducts.length + allDeadStockProducts.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Slow Moving Products */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                🐌 Slow Moving ({slowMovingProducts.length})
              </h3>
              <div className="of-batch-list">
                {slowMovingProducts.length > 0 ? (
                  slowMovingProducts.map((product, index) => (
                    <div key={index} className="of-batch-item completed">
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_Name}</span>
                        <span className="product-id">Group: {product.Product_Group}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk slow moving</div>
                )}
              </div>
            </div>

            {/* Dead Stock Products */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                💀 Dead Stock ({deadStockProducts.length})
              </h3>
              <div className="of-batch-list">
                {deadStockProducts.length > 0 ? (
                  deadStockProducts.map((product, index) => (
                    <div key={index} className="of-batch-item pending">
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_Name}</span>
                        <span className="product-id">Group: {product.Product_Group}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk dead stock</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory OJ Return Details Modal Component
const InventoryOJReturnDetailsModal = ({ isOpen, onClose, forecastData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !forecastData) return null;

  // Calculate current period dynamically based on actual date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentPeriod = currentYear * 100 + currentMonth;
  
  // Filter data for current month and items with returns
  const currentMonthData = forecastData.filter(item => 
    parseInt(item.Periode) === currentPeriod && (item.retur || 0) > 0
  );
  
  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const productCode = (item.Product_Code || '').toString().toLowerCase();
      const productName = (item.Product_NM || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return productCode.includes(search) || productName.includes(search);
    });
  };

  const returnItems = filterItems(currentMonthData)
    .sort((a, b) => {
      const aValue = (a.retur || 0) * (a.HNA || 0);
      const bValue = (b.retur || 0) * (b.HNA || 0);
      return bValue - aValue; // Descending order (highest value first)
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: '800px', 
        width: '90vw' 
      }}>
        <div className="modal-header">
          <h2>Detail Return Obat Jadi - {currentMonth}/{currentYear}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product code or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {returnItems.length} results for "{searchTerm}"
              {returnItems.length !== currentMonthData.length && 
                ` (filtered from ${currentMonthData.length} total)`}
            </div>
          )}
          
          <div className="of-details-container-full">
            {/* Return Items */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                🔄 Return Items ({returnItems.length})
              </h3>
              <div className="of-batch-list">
                {returnItems.length > 0 ? (
                  returnItems.map((item, index) => (
                    <div key={index} className="of-batch-item pending">
                      <div className="batch-code">Code: {item.Product_Code || 'N/A'}</div>
                      <div className="product-info">
                        <span className="product-name">{item.Product_NM || 'N/A'}</span>
                        <span className="product-id">
                          Unit Price: {formatNumber(item.HNA || 0)} | 
                          Returned: {item.retur || 0} | 
                          Total Value: {formatNumber((item.retur || 0) * (item.HNA || 0))}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada item return pada periode ini</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory OJ Slow Moving & Dead Stock Details Modal Component
const InventoryOJSlowDeadStockDetailsModal = ({ isOpen, onClose, forecastData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !forecastData) return null;

  // Calculate current period dynamically based on actual date
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Calculate period ranges dynamically
  const last6MonthsPeriods = [];
  const last3MonthsPeriods = [];
  
  for (let i = 5; i >= 0; i--) {
    const date = new Date(currentYear, currentMonth - 1 - i, 1);
    const period = date.getFullYear() * 100 + (date.getMonth() + 1);
    last6MonthsPeriods.push(period);
    
    if (i < 3) {
      last3MonthsPeriods.push(period);
    }
  }
  
  // Group data by Product_ID to analyze each product's sales and release history
  const productHistory = {};
  const productDetails = {};
  
  forecastData.forEach(item => {
    const productId = item.Product_ID;
    const period = parseInt(item.Periode);
    const sales = item.Sales || 0;
    const forecast = item.Forecast || 0;
    const release = item.Release || 0;
    const hna = item.HNA || 0;
    
    if (!productHistory[productId]) {
      productHistory[productId] = {};
      productDetails[productId] = {
        Product_ID: productId,
        Product_Code: item.Product_Code || 'N/A',
        Product_Name: item.Product_Name || item.Product_NM || 'N/A',
        HNA: hna
      };
    }
    productHistory[productId][period] = { sales, forecast, release };
  });
  
  const productIds = Object.keys(productHistory);
  
  let allSlowMovingProducts = [];
  let allDeadStockProducts = [];
  
  productIds.forEach(productId => {
    const history = productHistory[productId];
    const productDetail = productDetails[productId];
    
    // Check for dead stock (sales < 60% of forecast for last 6 months AND stock available in earliest and current periods)
    const isBelowThresholdLast6Months = last6MonthsPeriods.every(period => {
      const periodData = history[period];
      if (!periodData) return false; // If no data for this period, not considered below threshold
      
      const sales = periodData.sales || 0;
      const forecast = periodData.forecast || 0;
      
      // If forecast is 0, we can't determine the ratio, so skip this product
      if (forecast === 0) return false;
      
      // Check if sales is less than 60% of forecast
      return sales < (forecast * 0.6);
    });
    
    // Check if stock was available in earliest (6 months ago) and current periods
    const earliestPeriod = last6MonthsPeriods[0]; // First period in the 6-month range
    const currentPeriod = last6MonthsPeriods[last6MonthsPeriods.length - 1]; // Last period (current)
    
    const hasStockInEarliestPeriod = (history[earliestPeriod]?.release || 0) > 0;
    const hasStockInCurrentPeriod = (history[currentPeriod]?.release || 0) > 0;
    const currentStock = history[currentPeriod]?.release || 0;
    
    const isDeadStock = isBelowThresholdLast6Months && hasStockInEarliestPeriod && hasStockInCurrentPeriod;
    
    if (isDeadStock) {
      allDeadStockProducts.push({
        ...productDetail,
        currentStock,
        totalValue: currentStock * (productDetail.HNA || 0)
      });
    } else {
      // Only check for slow moving if not dead stock
      // Check for slow moving (sales < 60% of forecast for last 3 months AND stock available in earliest and current periods)
      const isBelowThresholdLast3Months = last3MonthsPeriods.every(period => {
        const periodData = history[period];
        if (!periodData) return false; // If no data for this period, not considered below threshold
        
        const sales = periodData.sales || 0;
        const forecast = periodData.forecast || 0;
        
        // If forecast is 0, we can't determine the ratio, so skip this product
        if (forecast === 0) return false;
        
        // Check if sales is less than 60% of forecast
        return sales < (forecast * 0.6);
      });
      
      // Check if stock was available in earliest (3 months ago) and current periods for slow moving
      const earliestPeriod3M = last3MonthsPeriods[0]; // First period in the 3-month range
      const currentPeriod3M = last3MonthsPeriods[last3MonthsPeriods.length - 1]; // Last period (current)
      
      const hasStockInEarliestPeriod3M = (history[earliestPeriod3M]?.release || 0) > 0;
      const hasStockInCurrentPeriod3M = (history[currentPeriod3M]?.release || 0) > 0;
      const currentStock3M = history[currentPeriod3M]?.release || 0;
      
      const isSlowMoving = isBelowThresholdLast3Months && hasStockInEarliestPeriod3M && hasStockInCurrentPeriod3M;
      
      if (isSlowMoving) {
        allSlowMovingProducts.push({
          ...productDetail,
          currentStock: currentStock3M,
          totalValue: currentStock3M * (productDetail.HNA || 0)
        });
      }
    }
  });
  
  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const productCode = (item.Product_Code || '').toString().toLowerCase();
      const productName = (item.Product_Name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return productCode.includes(search) || productName.includes(search);
    });
  };

  const slowMovingItems = filterItems(allSlowMovingProducts)
    .sort((a, b) => b.totalValue - a.totalValue); // Descending order (highest value first)
    
  const deadStockItems = filterItems(allDeadStockProducts)
    .sort((a, b) => b.totalValue - a.totalValue); // Descending order (highest value first)

  const totalFiltered = slowMovingItems.length + deadStockItems.length;
  const totalItems = allSlowMovingProducts.length + allDeadStockProducts.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: '1200px', 
        width: '90vw' 
      }}>
        <div className="modal-header">
          <h2>Detail Slow Moving & Dead Stock Obat Jadi</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Products:</strong> {totalItems}
            </div>
            <div style={{ color: '#f59e0b' }}>
              <strong>Slow Moving:</strong> {allSlowMovingProducts.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>Dead Stock:</strong> {allDeadStockProducts.length}
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product code or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {totalFiltered} results for "{searchTerm}"
              {totalFiltered !== totalItems && ` (filtered from ${totalItems} total)`}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '400px' }}>
            {/* Slow Moving Products */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                🐌 Slow Moving ({slowMovingItems.length})
              </h3>
              <div className="of-batch-list">
                {slowMovingItems.length > 0 ? (
                  slowMovingItems.map((item, index) => (
                    <div key={index} className="of-batch-item completed">
                      <div className="batch-code">Code: {item.Product_Code}</div>
                      <div className="product-info">
                        <span className="product-name">{item.Product_Name}</span>
                        <span className="product-id">
                          Unit Price: {formatNumber(item.HNA || 0)} | 
                          Stock: {item.currentStock} | 
                          Total Value: {formatNumber(item.totalValue)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk slow moving</div>
                )}
              </div>
            </div>

            {/* Dead Stock Products */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                💀 Dead Stock ({deadStockItems.length})
              </h3>
              <div className="of-batch-list">
                {deadStockItems.length > 0 ? (
                  deadStockItems.map((item, index) => (
                    <div key={index} className="of-batch-item pending">
                      <div className="batch-code">Code: {item.Product_Code}</div>
                      <div className="product-info">
                        <span className="product-name">{item.Product_Name}</span>
                        <span className="product-id">
                          Unit Price: {formatNumber(item.HNA || 0)} | 
                          Stock: {item.currentStock} | 
                          Total Value: {formatNumber(item.totalValue)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk dead stock</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sales Target Details Modal Component
const SalesTargetDetailsModal = ({ isOpen, onClose, forecastData, modalTitle, productGroupFilter }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !forecastData) return null;

  // Get current period for filtering
  const currentDate = new Date();
  const currentPeriod = currentDate.getFullYear() * 100 + (currentDate.getMonth() + 1);
  
  // Filter forecast data by current period and product group if specified
  let currentPeriodData = forecastData.filter(item => 
    parseInt(item.Periode) === currentPeriod
  );

  // Apply product group filter if specified
  if (productGroupFilter) {
    currentPeriodData = currentPeriodData.filter(item => 
      item.Product_Group === productGroupFilter
    );
  }

  // Split products by target achievement
  const allMetTargetProducts = currentPeriodData.filter(item => {
    const sales = item.Sales || 0;
    const forecast = item.Forecast || 0;
    return sales >= forecast;
  });

  const allNotMetTargetProducts = currentPeriodData.filter(item => {
    const sales = item.Sales || 0;
    const forecast = item.Forecast || 0;
    return sales < forecast;
  });

  // Filter based on search term
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    
    return products.filter(product => {
      const productId = (product.Product_ID || '').toString().toLowerCase();
      const productName = (product.Product_NM || '').toString().toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return productId.includes(searchLower) || productName.includes(searchLower);
    });
  };

  const metTargetProducts = filterProducts(allMetTargetProducts);
  const notMetTargetProducts = filterProducts(allNotMetTargetProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '90vw' }}>
        <div className="modal-header">
          <h2>{modalTitle || 'Detail Sales Target Achievement'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Products:</strong> {currentPeriodData.length}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>Met Target:</strong> {allMetTargetProducts.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>Target Not Met:</strong> {allNotMetTargetProducts.length}
            </div>
            <div>
              <strong>Achievement Rate:</strong> {currentPeriodData.length > 0 ? Math.round((allMetTargetProducts.length / currentPeriodData.length) * 100) : 0}%
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product ID or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {metTargetProducts.length + notMetTargetProducts.length} results for "{searchTerm}"
              {metTargetProducts.length + notMetTargetProducts.length !== allMetTargetProducts.length + allNotMetTargetProducts.length && 
                ` (filtered from ${allMetTargetProducts.length + allNotMetTargetProducts.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Met Target Products */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#10b981' }}>
                ✅ Met Target ({metTargetProducts.length})
              </h3>
              <div className="of-batch-list">
                {metTargetProducts.length > 0 ? (
                  metTargetProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #10b981', marginBottom: '8px' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name" style={{ fontSize: '12px' }}>{product.Product_NM || 'N/A'}</span>
                        <span className="product-id" style={{ fontSize: '11px' }}>
                          Sales: {formatNumber(product.Sales || 0)} | Forecast: {formatNumber(product.Forecast || 0)} 
                          | Achievement: {product.Forecast > 0 ? Math.round(((product.Sales || 0) / product.Forecast) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk yang mencapai target</div>
                )}
              </div>
            </div>

            {/* Target Not Met Products */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                ❌ Target Not Met ({notMetTargetProducts.length})
              </h3>
              <div className="of-batch-list">
                {notMetTargetProducts.length > 0 ? (
                  notMetTargetProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444', marginBottom: '8px' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name" style={{ fontSize: '12px' }}>{product.Product_NM || 'N/A'}</span>
                        <span className="product-id" style={{ fontSize: '11px' }}>
                          Sales: {formatNumber(product.Sales || 0)} | Forecast: {formatNumber(product.Forecast || 0)} 
                          | Achievement: {product.Forecast > 0 ? Math.round(((product.Sales || 0) / product.Forecast) * 100) : 0}%
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Semua produk mencapai target</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Coverage Details Modal Component
const CoverageDetailsModal = ({ isOpen, onClose, forecastData, productGroupFilter = null, modalTitle = "Detail Coverage Stock FG" }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !forecastData) return null;

  // Get current period for filtering
  const currentDate = new Date();
  const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter forecast data by current period and optionally by product group
  let currentPeriodData = forecastData.filter(item => 
    String(item.Periode || '').toString() === currentPeriod
  );

  // Apply product group filter if provided
  if (productGroupFilter) {
    currentPeriodData = currentPeriodData.filter(item => 
      item.Product_Group === productGroupFilter
    );
  }

  // Calculate coverage percentage for a product
  const getCoverage = (product) => {
    const forecast = product.Forecast || 0;
    const stock = product.Release || 0;
    return forecast > 0 ? Math.round((stock / forecast) * 100) : 0;
  };

  // Categorize products based on coverage percentage and sort by coverage descending
  const allUnderProducts = currentPeriodData
    .filter(item => {
      const coverage = getCoverage(item);
      return coverage < 130;
    })
    .sort((a, b) => getCoverage(b) - getCoverage(a));

  const allNormalProducts = currentPeriodData
    .filter(item => {
      const coverage = getCoverage(item);
      return coverage >= 130 && coverage <= 299;
    })
    .sort((a, b) => getCoverage(b) - getCoverage(a));

  const allOverProducts = currentPeriodData
    .filter(item => {
      const coverage = getCoverage(item);
      return coverage >= 300;
    })
    .sort((a, b) => getCoverage(b) - getCoverage(a));

  // Filter based on search term and maintain sorting by coverage
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    
    return products
      .filter(product => {
        const productId = (product.Product_ID || '').toString().toLowerCase();
        const productName = (product.Product_NM || '').toString().toLowerCase();
        const searchLower = searchTerm.toLowerCase();
        
        return productId.includes(searchLower) || productName.includes(searchLower);
      })
      .sort((a, b) => getCoverage(b) - getCoverage(a));
  };

  const underProducts = filterProducts(allUnderProducts);
  const normalProducts = filterProducts(allNormalProducts);
  const overProducts = filterProducts(allOverProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90vw' }}>
        <div className="modal-header">
          <h2>{modalTitle}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Products:</strong> {currentPeriodData.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>SKU Under (&lt;130%):</strong> {allUnderProducts.length}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>SKU Normal (130-299%):</strong> {allNormalProducts.length}
            </div>
            <div style={{ color: '#f59e0b' }}>
              <strong>SKU Over (≥300%):</strong> {allOverProducts.length}
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product ID or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {underProducts.length + normalProducts.length + overProducts.length} results for "{searchTerm}"
              {underProducts.length + normalProducts.length + overProducts.length !== allUnderProducts.length + allNormalProducts.length + allOverProducts.length && 
                ` (filtered from ${allUnderProducts.length + allNormalProducts.length + allOverProducts.length} total)`}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', minHeight: '400px' }}>
            {/* SKU Under */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                📉 SKU Under (&lt;130%) ({underProducts.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {underProducts.length > 0 ? (
                  underProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444', marginBottom: '8px' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name" style={{ fontSize: '12px' }}>{product.Product_NM || 'N/A'}</span>
                        <span className="product-id" style={{ fontSize: '11px' }}>
                          Coverage: {getCoverage(product)}% | Stock: {product.Release || 0} | Forecast: {product.Forecast || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk SKU Under</div>
                )}
              </div>
            </div>

            {/* SKU Normal */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#10b981' }}>
                📊 SKU Normal (130-299%) ({normalProducts.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {normalProducts.length > 0 ? (
                  normalProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #10b981', marginBottom: '8px' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name" style={{ fontSize: '12px' }}>{product.Product_NM || 'N/A'}</span>
                        <span className="product-id" style={{ fontSize: '11px' }}>
                          Coverage: {getCoverage(product)}% | Stock: {product.Release || 0} | Forecast: {product.Forecast || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk SKU Normal</div>
                )}
              </div>
            </div>

            {/* SKU Over */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#f59e0b' }}>
                📈 SKU Over (≥300%) ({overProducts.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {overProducts.length > 0 ? (
                  overProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #f59e0b', marginBottom: '8px' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name" style={{ fontSize: '12px' }}>{product.Product_NM || 'N/A'}</span>
                        <span className="product-id" style={{ fontSize: '11px' }}>
                          Coverage: {getCoverage(product)}% | Stock: {product.Release || 0} | Forecast: {product.Forecast || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk SKU Over</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// WIP Details Modal Component
const WIPDetailsModal = ({ isOpen, onClose, wipData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !wipData) return null;

  // Group batches by status
  const groupByStatus = (data) => {
    const groups = {};
    data.forEach(item => {
      const status = item.status || 'Unknown';
      if (!groups[status]) {
        groups[status] = [];
      }
      groups[status].push(item);
    });
    return groups;
  };

  const allGroupedData = groupByStatus(wipData);

  // Filter based on search term
  const filterBatches = (batches) => {
    if (!searchTerm.trim()) return batches;
    
    return batches.filter(batch => {
      const batchNo = (batch.batch || '').toString().toLowerCase();
      const productName = (batch.name || '').toString().toLowerCase();
      const code = (batch.id || '').toString().toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return batchNo.includes(searchLower) || 
             productName.includes(searchLower) || 
             code.includes(searchLower);
    });
  };

  // Get filtered groups
  const filteredGroups = {};
  Object.keys(allGroupedData).forEach(status => {
    filteredGroups[status] = filterBatches(allGroupedData[status]);
  });

  // Get status colors
  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'proses': return '#10b981'; // Green
      case 'kemas': return '#f59e0b'; // Orange
      case 'karantina': return '#ef4444'; // Red
      default: return '#6b7280'; // Gray
    }
  };

  // Calculate total batches
  const totalBatches = wipData.length;
  const totalFilteredBatches = Object.values(filteredGroups).reduce((sum, batches) => sum + batches.length, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90vw' }}>
        <div className="modal-header">
          <h2>Detail WIP Batches</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Batches:</strong> {totalBatches}
            </div>
            {/* Display status counts in specific order: Proses, Kemas, Karantina */}
            {['Proses', 'Kemas', 'Karantina'].filter(status => allGroupedData[status]).map(status => (
              <div key={status} style={{ color: getStatusColor(status) }}>
                <strong>{status}:</strong> {allGroupedData[status].length}
              </div>
            ))}
            {/* Display any additional statuses not in the predefined order */}
            {Object.keys(allGroupedData).filter(status => !['Proses', 'Kemas', 'Karantina'].includes(status)).map(status => (
              <div key={status} style={{ color: getStatusColor(status) }}>
                <strong>{status}:</strong> {allGroupedData[status].length}
              </div>
            ))}
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by batch number, product name, or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {totalFilteredBatches} results for "{searchTerm}"
              {totalFilteredBatches !== totalBatches && ` (filtered from ${totalBatches} total)`}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', minHeight: '400px' }}>
            {/* Display in specific order: Proses, Kemas, Karantina */}
            {['Proses', 'Kemas', 'Karantina'].filter(status => filteredGroups[status]).map(status => (
              <div key={status} className="of-details-section">
                <h3 className="of-section-title" style={{ color: getStatusColor(status) }}>
                  📦 {status} ({filteredGroups[status].length})
                </h3>
                <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredGroups[status].length > 0 ? (
                    filteredGroups[status].map((batch, index) => {
                      const units = batch.actual !== null && batch.actual !== undefined ? batch.actual : (batch.standard || 0);
                      const price = batch.price || 0;
                      const value = price * units;
                      
                      return (
                        <div key={index} className="of-batch-item" style={{ borderLeft: `4px solid ${getStatusColor(status)}`, marginBottom: '8px' }}>
                          <div className="batch-code">Batch: {batch.batch || 'N/A'}</div>
                          <div className="product-info">
                            <span className="product-name" style={{ fontSize: '12px', fontWeight: '500' }}>
                              {batch.name || 'Unknown Product'}
                            </span>
                            <span className="product-id" style={{ fontSize: '11px', color: '#6b7280' }}>
                              Code: {batch.id || 'N/A'} | Status Duration: {batch.statusDuration || 0} days | Duration: {batch.duration || 0} days | Units: {formatNumber(units)} | Price: {formatNumber(price)} | Value: {formatNumber(value)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-data">Tidak ada batch {status}</div>
                  )}
                </div>
              </div>
            ))}
            {/* Display any additional statuses not in the predefined order */}
            {Object.keys(filteredGroups).filter(status => !['Proses', 'Kemas', 'Karantina'].includes(status)).map(status => (
              <div key={status} className="of-details-section">
                <h3 className="of-section-title" style={{ color: getStatusColor(status) }}>
                  📦 {status} ({filteredGroups[status].length})
                </h3>
                <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredGroups[status].length > 0 ? (
                    filteredGroups[status].map((batch, index) => {
                      const units = batch.actual !== null && batch.actual !== undefined ? batch.actual : (batch.standard || 0);
                      const price = batch.price || 0;
                      const value = price * units;
                      
                      return (
                        <div key={index} className="of-batch-item" style={{ borderLeft: `4px solid ${getStatusColor(status)}`, marginBottom: '8px' }}>
                          <div className="batch-code">Batch: {batch.batch || 'N/A'}</div>
                          <div className="product-info">
                            <span className="product-name" style={{ fontSize: '12px', fontWeight: '500' }}>
                              {batch.name || 'Unknown Product'}
                            </span>
                            <span className="product-id" style={{ fontSize: '11px', color: '#6b7280' }}>
                              Code: {batch.id || 'N/A'} | Status Duration: {batch.statusDuration || 0} days | Duration: {batch.duration || 0} days | Units: {formatNumber(units)} | Price: {formatNumber(price)} | Value: {formatNumber(value)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-data">Tidak ada batch {status}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// WIP Batches Modal Component
const WIPBatchesModal = ({ isOpen, onClose, wipData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !wipData) return null;

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = String(date.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch (error) {
      return 'N/A';
    }
  };

  // Categorize batches based on duration
  const onTrackBatches = wipData.filter(batch => (batch.duration || 0) <= 38);
  const lateBatches = wipData.filter(batch => (batch.duration || 0) > 38);

  // Filter based on search term
  const filterBatches = (batches) => {
    if (!searchTerm.trim()) return batches;
    
    return batches.filter(batch => {
      const batchId = (batch.id || '').toString().toLowerCase();
      const productName = (batch.name || '').toString().toLowerCase();
      const searchLower = searchTerm.toLowerCase();
      
      return batchId.includes(searchLower) || productName.includes(searchLower);
    });
  };

  const filteredOnTrack = filterBatches(onTrackBatches);
  const filteredLate = filterBatches(lateBatches);
  const totalFiltered = filteredOnTrack.length + filteredLate.length;
  const totalBatches = wipData.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '90vw' }}>
        <div className="modal-header">
          <h2>Detail WIP Batches - Production Timeline</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Batches:</strong> {totalBatches}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>On Track (≤38 days):</strong> {onTrackBatches.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>Late (&gt;38 days):</strong> {lateBatches.length}
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by batch ID or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {totalFiltered} results for "{searchTerm}"
              {totalFiltered !== totalBatches && ` (filtered from ${totalBatches} total)`}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', minHeight: '400px' }}>
            {/* On Track Batches */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#10b981' }}>
                ✅ On Track (≤38 days) ({filteredOnTrack.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredOnTrack.length > 0 ? (
                  filteredOnTrack
                    .sort((a, b) => (a.duration || 0) - (b.duration || 0)) // Sort by duration ascending
                    .map((batch, index) => (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #10b981', marginBottom: '8px' }}>
                        <div className="batch-code">Batch: {batch.id || 'N/A'}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px', fontWeight: '500' }}>
                            {batch.name || 'Unknown Product'}
                          </span>
                          <span className="product-id" style={{ fontSize: '11px', color: '#6b7280' }}>
                            Start Date: {formatDate(batch.startDate)} | Days in Production: {batch.duration || 0} days
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="no-data">Tidak ada batch On Track</div>
                )}
              </div>
            </div>

            {/* Late Batches */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                ⚠️ Late (&gt;38 days) ({filteredLate.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredLate.length > 0 ? (
                  filteredLate
                    .sort((a, b) => (b.duration || 0) - (a.duration || 0)) // Sort by duration descending (most late first)
                    .map((batch, index) => (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444', marginBottom: '8px' }}>
                        <div className="batch-code">Batch: {batch.id || 'N/A'}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px', fontWeight: '500' }}>
                            {batch.name || 'Unknown Product'}
                          </span>
                          <span className="product-id" style={{ fontSize: '11px', color: '#6b7280' }}>
                            Start Date: {formatDate(batch.startDate)} | Days in Production: {batch.duration || 0} days
                          </span>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="no-data">Tidak ada batch Late</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory Bahan Baku Details Modal Component
const InventoryBahanBakuDetailsModal = ({ isOpen, onClose, bbData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !bbData) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Calculate date thresholds
  const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);
  const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
  const sixMonthsAgoYYYYMM = sixMonthsAgo.getFullYear() * 100 + (sixMonthsAgo.getMonth() + 1);
  const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
  
  // Calculate Dead Stock (null last_transaction_period or older than 6 months, but must have stock)
  const allDeadStockItems = bbData.filter(item => {
    const lastStock = item.last_stock || 0;
    if (lastStock === 0) return false; // Filter out items with zero stock
    
    return item.last_transaction_period === null || 
           item.last_transaction_period === '' ||
           (item.last_transaction_period && parseInt(item.last_transaction_period) < sixMonthsAgoYYYYMM);
  });
  
  // Calculate Slow Moving (3-6 months old, but must have stock)
  const allSlowMovingItems = bbData.filter(item => {
    const lastStock = item.last_stock || 0;
    if (lastStock === 0) return false; // Filter out items with zero stock
    
    if (!item.last_transaction_period || item.last_transaction_period === null) {
      return false; // Already counted as dead stock
    }
    const transactionPeriod = parseInt(item.last_transaction_period);
    return transactionPeriod >= sixMonthsAgoYYYYMM && transactionPeriod <= threeMonthsAgoYYYYMM;
  });

  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const itemCode = (item.item_code || '').toString().toLowerCase();
      const itemName = (item.item_name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return itemCode.includes(search) || itemName.includes(search);
    });
  };

  const slowMovingItems = filterItems(allSlowMovingItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });
  const deadStockItems = filterItems(allDeadStockItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Inventory Bahan Baku</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by item code or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {slowMovingItems.length + deadStockItems.length} results for "{searchTerm}"
              {slowMovingItems.length + deadStockItems.length !== allSlowMovingItems.length + allDeadStockItems.length && 
                ` (filtered from ${allSlowMovingItems.length + allDeadStockItems.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Slow Moving Items */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                🐌 Slow Moving ({slowMovingItems.length})
              </h3>
              <div className="of-batch-list">
                {slowMovingItems.length > 0 ? (
                  slowMovingItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item completed">
                        <div className="batch-code">Code: {item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name">{item.item_name || 'N/A'}</span>
                          <span className="product-id">
                            Last Transaction: {item.last_transaction_period || 'N/A'} | 
                            Stock: {(item.last_stock || 0).toLocaleString()} | 
                            Total Value: {formatNumber(totalValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item slow moving</div>
                )}
              </div>
            </div>

            {/* Dead Stock Items */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                💀 Dead Stock ({deadStockItems.length})
              </h3>
              <div className="of-batch-list">
                {deadStockItems.length > 0 ? (
                  deadStockItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item pending">
                        <div className="batch-code">Code: {item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name">{item.item_name || 'N/A'}</span>
                          <span className="product-id">
                            Last Transaction: {item.last_transaction_period || 'None'} | 
                            Stock: {(item.last_stock || 0).toLocaleString()} | 
                            Total Value: {formatNumber(totalValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item dead stock</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory Bahan Kemas Details Modal Component
const InventoryBahanKemasDetailsModal = ({ isOpen, onClose, bkData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !bkData) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  
  // Calculate date thresholds
  const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);
  const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
  const sixMonthsAgoYYYYMM = sixMonthsAgo.getFullYear() * 100 + (sixMonthsAgo.getMonth() + 1);
  const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
  
  // Calculate Dead Stock (null last_transaction_period or older than 6 months, but must have stock)
  const allDeadStockItems = bkData.filter(item => {
    const lastStock = item.last_stock || 0;
    if (lastStock === 0) return false; // Filter out items with zero stock
    
    return item.last_transaction_period === null || 
           item.last_transaction_period === '' ||
           (item.last_transaction_period && parseInt(item.last_transaction_period) < sixMonthsAgoYYYYMM);
  });
  
  // Calculate Slow Moving (3-6 months old, but must have stock)
  const allSlowMovingItems = bkData.filter(item => {
    const lastStock = item.last_stock || 0;
    if (lastStock === 0) return false; // Filter out items with zero stock
    
    if (!item.last_transaction_period || item.last_transaction_period === null) {
      return false; // Already counted as dead stock
    }
    const transactionPeriod = parseInt(item.last_transaction_period);
    return transactionPeriod >= sixMonthsAgoYYYYMM && transactionPeriod <= threeMonthsAgoYYYYMM;
  });

  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const itemCode = (item.item_code || '').toString().toLowerCase();
      const itemName = (item.item_name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return itemCode.includes(search) || itemName.includes(search);
    });
  };

  const slowMovingItems = filterItems(allSlowMovingItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });
  const deadStockItems = filterItems(allDeadStockItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Inventory Bahan Kemas</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by item code or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {slowMovingItems.length + deadStockItems.length} results for "{searchTerm}"
              {slowMovingItems.length + deadStockItems.length !== allSlowMovingItems.length + allDeadStockItems.length && 
                ` (filtered from ${allSlowMovingItems.length + allDeadStockItems.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Slow Moving Items */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                🐌 Slow Moving ({slowMovingItems.length})
              </h3>
              <div className="of-batch-list">
                {slowMovingItems.length > 0 ? (
                  slowMovingItems.map((item, index) => (
                    <div key={index} className="of-batch-item completed">
                      <div className="batch-code">Code: {item.item_code}</div>
                      <div className="product-info">
                        <span className="product-name">{item.item_name || 'N/A'}</span>
                        <span className="product-id">
                          Last Transaction: {item.last_transaction_period || 'N/A'} | 
                          Stock: {item.last_stock || 0} | 
                          Total Value: {formatNumber((item.last_stock || 0) * (item.UnitPrice || 0))}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada item slow moving</div>
                )}
              </div>
            </div>

            {/* Dead Stock Items */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                💀 Dead Stock ({deadStockItems.length})
              </h3>
              <div className="of-batch-list">
                {deadStockItems.length > 0 ? (
                  deadStockItems.map((item, index) => (
                    <div key={index} className="of-batch-item pending">
                      <div className="batch-code">Code: {item.item_code}</div>
                      <div className="product-info">
                        <span className="product-name">{item.item_name || 'N/A'}</span>
                        <span className="product-id">
                          Last Transaction: {item.last_transaction_period || 'None'} | 
                          Stock: {item.last_stock || 0} | 
                          Total Value: {formatNumber((item.last_stock || 0) * (item.UnitPrice || 0))}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada item dead stock</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory BB-BK Details Modal Component
const InventoryBBBKDetailsModal = ({ isOpen, onClose, bbbkData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !bbbkData) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
  const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
  
  // Calculate Dead Stock (null last_transaction_period, but must have stock)
  const allDeadStockItems = bbbkData.filter(item => {
    const lastStock = item.last_stock || 0;
    if (lastStock === 0) return false; // Filter out items with zero stock
    
    return item.last_transaction_period === null || item.last_transaction_period === '';
  });
  
  // Calculate Slow Moving (last_transaction_period older than 3 months, but must have stock)
  const allSlowMovingItems = bbbkData.filter(item => {
    const lastStock = item.last_stock || 0;
    if (lastStock === 0) return false; // Filter out items with zero stock
    
    if (!item.last_transaction_period || item.last_transaction_period === null) {
      return false; // Already counted as dead stock
    }
    const transactionPeriod = parseInt(item.last_transaction_period);
    return transactionPeriod <= threeMonthsAgoYYYYMM;
  });

  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const itemCode = (item.item_code || '').toString().toLowerCase();
      const itemName = (item.item_name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return itemCode.includes(search) || itemName.includes(search);
    });
  };

  const slowMovingItems = filterItems(allSlowMovingItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });
  const deadStockItems = filterItems(allDeadStockItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Inventory BB-BK</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by item code or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {slowMovingItems.length + deadStockItems.length} results for "{searchTerm}"
              {slowMovingItems.length + deadStockItems.length !== allSlowMovingItems.length + allDeadStockItems.length && 
                ` (filtered from ${allSlowMovingItems.length + allDeadStockItems.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Slow Moving Items */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                🐌 Slow Moving ({slowMovingItems.length})
              </h3>
              <div className="of-batch-list">
                {slowMovingItems.length > 0 ? (
                  slowMovingItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item completed">
                        <div className="batch-code">Code: {item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name">{item.item_name || 'N/A'}</span>
                          <span className="product-id">
                            Last Transaction: {item.last_transaction_period || 'N/A'} | 
                            Stock: {(item.last_stock || 0).toLocaleString()} | 
                            Total Value: {formatNumber(totalValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item slow moving</div>
                )}
              </div>
            </div>

            {/* Dead Stock Items */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                💀 Dead Stock ({deadStockItems.length})
              </h3>
              <div className="of-batch-list">
                {deadStockItems.length > 0 ? (
                  deadStockItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item pending">
                        <div className="batch-code">Code: {item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name">{item.item_name || 'N/A'}</span>
                          <span className="product-id">
                            Last Transaction: None | 
                            Stock: {(item.last_stock || 0).toLocaleString()} | 
                            Total Value: {formatNumber(totalValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item dead stock</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Inventory Return/Reject Details Modal Component
const InventoryReturnRejectDetailsModal = ({ isOpen, onClose, bbbkData, itemType }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !bbbkData) return null;

  // Filter by item type (BB or BK)
  const filteredData = bbbkData.filter(item => item.item_type === itemType);

  // Categorize items
  const allNoReturnRejectItems = filteredData.filter(item => 
    (!item.totalRetur || item.totalRetur === 0) && 
    (!item.totalReject || item.totalReject === 0)
  );

  const allReturnItems = filteredData.filter(item => 
    item.totalRetur && item.totalRetur > 0
  );

  const allRejectItems = filteredData.filter(item => 
    item.totalReject && item.totalReject > 0
  );

  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => {
      const itemCode = (item.item_code || '').toString().toLowerCase();
      const itemName = (item.item_name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return itemCode.includes(search) || itemName.includes(search);
    });
  };

  const noReturnRejectItems = filterItems(allNoReturnRejectItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });
  const returnItems = filterItems(allReturnItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });
  const rejectItems = filterItems(allRejectItems)
    .sort((a, b) => {
      const aValue = (a.last_stock || 0) * (a.UnitPrice || 0);
      const bValue = (b.last_stock || 0) * (b.UnitPrice || 0);
      return bValue - aValue; // Descending order (highest value first)
    });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90vw' }}>
        <div className="modal-header">
          <h2>Detail Return/Reject - {itemType === 'BB' ? 'Bahan Baku' : 'Bahan Kemas'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Items:</strong> {filteredData.length}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>No Return/Reject:</strong> {allNoReturnRejectItems.length}
            </div>
            <div style={{ color: '#f59e0b' }}>
              <strong>Return Items:</strong> {allReturnItems.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>Reject Items:</strong> {allRejectItems.length}
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by item code or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {noReturnRejectItems.length + returnItems.length + rejectItems.length} results for "{searchTerm}"
              {noReturnRejectItems.length + returnItems.length + rejectItems.length !== allNoReturnRejectItems.length + allReturnItems.length + allRejectItems.length && 
                ` (filtered from ${allNoReturnRejectItems.length + allReturnItems.length + allRejectItems.length} total)`}
            </div>
          )}
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', minHeight: '400px' }}>
            {/* No Return/Reject */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#10b981' }}>
                ✅ No Return/Reject ({noReturnRejectItems.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {noReturnRejectItems.length > 0 ? (
                  noReturnRejectItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #10b981', marginBottom: '8px' }}>
                        <div className="batch-code">{item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px' }}>{item.item_name || 'N/A'}</span>
                          <span className="product-id" style={{ fontSize: '11px' }}>
                            Stock: {item.last_stock?.toLocaleString() || 0} | Return: 0 | Reject: 0
                          </span>
                          <span className="product-id" style={{ fontSize: '11px', color: '#10b981' }}>
                            Total Value: {formatNumber(totalValue)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item tanpa return/reject</div>
                )}
              </div>
            </div>

            {/* Return Items */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#f59e0b' }}>
                📤 Return Items ({returnItems.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {returnItems.length > 0 ? (
                  returnItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #f59e0b', marginBottom: '8px' }}>
                        <div className="batch-code">{item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px' }}>{item.item_name || 'N/A'}</span>
                          <span className="product-id" style={{ fontSize: '11px' }}>
                            Stock: {item.last_stock?.toLocaleString() || 0} | Return: {item.totalRetur?.toLocaleString() || 0} | Reject: {item.totalReject?.toLocaleString() || 0}
                          </span>
                          <span className="product-id" style={{ fontSize: '11px', color: '#f59e0b' }}>
                            Total Value: {formatNumber(totalValue)}
                          </span>
                          {item.last_stock > 0 && (
                            <span className="product-id" style={{ fontSize: '11px', color: '#f59e0b' }}>
                              Return/Reject %: {(((item.totalRetur || 0) + (item.totalReject || 0)) / item.last_stock * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item dengan return</div>
                )}
              </div>
            </div>

            {/* Reject Items */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                ❌ Reject Items ({rejectItems.length})
              </h3>
              <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                {rejectItems.length > 0 ? (
                  rejectItems.map((item, index) => {
                    const totalValue = (item.last_stock || 0) * (item.UnitPrice || 0);
                    return (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444', marginBottom: '8px' }}>
                        <div className="batch-code">{item.item_code}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px' }}>{item.item_name || 'N/A'}</span>
                          <span className="product-id" style={{ fontSize: '11px' }}>
                            Stock: {item.last_stock?.toLocaleString() || 0} | Return: {item.totalRetur?.toLocaleString() || 0} | Reject: {item.totalReject?.toLocaleString() || 0}
                          </span>
                          <span className="product-id" style={{ fontSize: '11px', color: '#ef4444' }}>
                            Total Value: {formatNumber(totalValue)}
                          </span>
                          {item.last_stock > 0 && (
                            <span className="product-id" style={{ fontSize: '11px', color: '#ef4444' }}>
                              Return/Reject %: {(((item.totalRetur || 0) + (item.totalReject || 0)) / item.last_stock * 100).toFixed(2)}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="no-data">Tidak ada item dengan reject</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// PCT Details Modal Component
const PCTDetailsModal = ({ isOpen, onClose, pctData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !pctData) return null;

  // Split products by PCT performance (under 38 days = on time, 38+ days = past deadline)
  // Sort both lists with longest PCT times first (descending order)
  const allOnTimeProducts = pctData
    .filter(item => (item.PCTAverage || 0) < 38)
    .sort((a, b) => (b.PCTAverage || 0) - (a.PCTAverage || 0));
  const allPastDeadlineProducts = pctData
    .filter(item => (item.PCTAverage || 0) >= 38)
    .sort((a, b) => (b.PCTAverage || 0) - (a.PCTAverage || 0));

  // Filter based on search term while maintaining sort order (longest PCT first)
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    const lower = searchTerm.toLowerCase();
    return products
      .filter(product =>
        (product.Product_ID || '').toLowerCase().includes(lower) ||
        (product.Product_Name || '').toLowerCase().includes(lower) ||
        (product.Kategori || '').toLowerCase().includes(lower) ||
        (product.Dept || '').toLowerCase().includes(lower)
      )
      .sort((a, b) => (b.PCTAverage || 0) - (a.PCTAverage || 0));
  };

  const onTimeProducts = filterProducts(allOnTimeProducts);
  const pastDeadlineProducts = filterProducts(allPastDeadlineProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail PCT Performance</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Products:</strong> {pctData.length}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>On Time (&lt;38 days):</strong> {allOnTimeProducts.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>Past Deadline (≥38 days):</strong> {allPastDeadlineProducts.length}
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product ID, name, category, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {onTimeProducts.length + pastDeadlineProducts.length} results for "{searchTerm}"
              {onTimeProducts.length + pastDeadlineProducts.length !== allOnTimeProducts.length + allPastDeadlineProducts.length && 
                ` (filtered from ${allOnTimeProducts.length + allPastDeadlineProducts.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* On Time Products */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                ✅ PCT On Time - Under 38 Days ({onTimeProducts.length})
              </h3>
              <div className="of-batch-list">
                {onTimeProducts.length > 0 ? (
                  onTimeProducts.map((product, index) => (
                    <div key={index} className="of-batch-item completed">
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_Name || 'N/A'}</span>
                        <span className="product-id">
                          PCT: {product.PCTAverage} hari | {product.Kategori} | {product.Dept}
                        </span>
                        {product.Batch_Nos && product.Batch_Nos.length > 0 && (
                          <span className="product-id">
                            Batches: {product.Batch_Nos.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk dengan PCT on time</div>
                )}
              </div>
            </div>

            {/* Past Deadline Products */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                ⏰ PCT Past Deadline - 38+ Days ({pastDeadlineProducts.length})
              </h3>
              <div className="of-batch-list">
                {pastDeadlineProducts.length > 0 ? (
                  pastDeadlineProducts.map((product, index) => (
                    <div key={index} className="of-batch-item pending">
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_Name || 'N/A'}</span>
                        <span className="product-id">
                          PCT: {product.PCTAverage} hari | {product.Kategori} | {product.Dept}
                        </span>
                        {product.Batch_Nos && product.Batch_Nos.length > 0 && (
                          <span className="product-id">
                            Batches: {product.Batch_Nos.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Semua produk memiliki PCT on time</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// OTA Details Modal Component
const OTADetailsModal = ({ isOpen, onClose, otaData, modalConfig }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !otaData || !modalConfig) return null;

  // Debug logs
  console.log('🚚 OTA Modal - Total OTA Data:', otaData.length);
  console.log('🚚 OTA Modal - Modal Config:', modalConfig);
  console.log('🚚 OTA Modal - Sample Data:', otaData.slice(0, 3));

  // Filter and process data based on modal type
  let filteredData = [];
  let title = modalConfig.title;
  
  if (modalConfig.type === 'BB' || modalConfig.type === 'BK') {
    // For BB/BK clicks: show three lists (Early/OnTime/Late) for specific item_type
    // Check both possible field names for robustness
    filteredData = otaData.filter(item => 
      item.item_type === modalConfig.type || item.Item_Type === modalConfig.type
    );
  } else if (modalConfig.type === 'OnDelivery') {
    // For OnDelivery click: show items with Status 'On Delivery'
    filteredData = otaData.filter(item => 
      item.Status === 'On Delivery'
    );
  } else if (modalConfig.type === 'OnTime' || modalConfig.type === 'Early' || modalConfig.type === 'Late') {
    // For OnTime, Early, Late clicks: show three-list format with all OTA data (excluding On Delivery)
    filteredData = otaData.filter(item => 
      item.Status === 'Early' || item.Status === 'On Time' || item.Status === 'Late'
    );
  }

  // Split data by status for three-list display (for BB/BK) or show filtered list
  const earlyItems = filteredData.filter(item => item.Status === 'Early');
  const onTimeItems = filteredData.filter(item => item.Status === 'On Time');
  const lateItems = filteredData.filter(item => item.Status === 'Late');

  // Filter based on search term
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(item =>
      (item.Item_Name || '').toLowerCase().includes(lower) ||
      (item.PO_No || '').toLowerCase().includes(lower) ||
      (item.TTBA_QTY || '').toString().toLowerCase().includes(lower)
    );
  };

  const filteredEarlyItems = filterItems(earlyItems);
  const filteredOnTimeItems = filterItems(onTimeItems);
  const filteredLateItems = filterItems(lateItems);

  // For OnDelivery modal, combine the relevant filtered items
  let combinedItems = [];
  if (modalConfig.type === 'OnDelivery') {
    combinedItems = filterItems(filteredData); // Apply search filter to OnDelivery items
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ 
        maxWidth: (modalConfig.type === 'BB' || modalConfig.type === 'BK' || modalConfig.type === 'Early' || modalConfig.type === 'Late' || modalConfig.type === 'OnTime') ? '1200px' : '800px', 
        width: '90vw' 
      }}>
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body" style={{ padding: '20px' }}>
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Items:</strong> {filteredData.length}
            </div>
            {(modalConfig.type === 'BB' || modalConfig.type === 'BK' || modalConfig.type === 'Early' || modalConfig.type === 'Late' || modalConfig.type === 'OnTime') && (
              <>
                <div style={{ color: '#10b981' }}>
                  <strong>Early:</strong> {earlyItems.length}
                </div>
                <div style={{ color: '#3b82f6' }}>
                  <strong>On Time:</strong> {onTimeItems.length}
                </div>
                <div style={{ color: '#ef4444' }}>
                  <strong>Late:</strong> {lateItems.length}
                </div>
              </>
            )}
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by item name, PO number, or quantity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {
                modalConfig.type === 'OnDelivery' ? combinedItems.length :
                filteredEarlyItems.length + filteredOnTimeItems.length + filteredLateItems.length
              } results for "{searchTerm}"
            </div>
          )}
          
          {/* For BB/BK/OnTime/Early/Late: Show three lists in grid layout like Coverage modal */}
          {(modalConfig.type === 'BB' || modalConfig.type === 'BK' || modalConfig.type === 'OnTime' || modalConfig.type === 'Early' || modalConfig.type === 'Late') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', minHeight: '400px' }}>
              {/* Early Items */}
              <div className="of-details-section">
                <h3 className="of-section-title" style={{ color: '#10b981' }}>
                  🚀 Early Delivery ({filteredEarlyItems.length})
                </h3>
                <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredEarlyItems.length > 0 ? (
                    filteredEarlyItems.map((item, index) => (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #10b981', marginBottom: '8px' }}>
                        <div className="batch-code">PO: {item.PO_No}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px' }}>{item.Item_Name || 'N/A'}</span>
                          <span className="product-id" style={{ fontSize: '11px' }}>
                            Qty: {item.TTBA_QTY} | Needed: {item.PO_NeededDate || 'N/A'} | TTBA: {item.TTBA_Date || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No early deliveries</div>
                  )}
                </div>
              </div>

              {/* On Time Items */}
              <div className="of-details-section">
                <h3 className="of-section-title" style={{ color: '#3b82f6' }}>
                  ✅ On Time Delivery ({filteredOnTimeItems.length})
                </h3>
                <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredOnTimeItems.length > 0 ? (
                    filteredOnTimeItems.map((item, index) => (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #3b82f6', marginBottom: '8px' }}>
                        <div className="batch-code">PO: {item.PO_No}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px' }}>{item.Item_Name || 'N/A'}</span>
                          <span className="product-id" style={{ fontSize: '11px' }}>
                            Qty: {item.TTBA_QTY} | Needed: {item.PO_NeededDate || 'N/A'} | TTBA: {item.TTBA_Date || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No on-time deliveries</div>
                  )}
                </div>
              </div>

              {/* Late Items */}
              <div className="of-details-section">
                <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                  ⏰ Late Delivery ({filteredLateItems.length})
                </h3>
                <div className="of-batch-list" style={{ maxHeight: '350px', overflowY: 'auto' }}>
                  {filteredLateItems.length > 0 ? (
                    filteredLateItems.map((item, index) => (
                      <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444', marginBottom: '8px' }}>
                        <div className="batch-code">PO: {item.PO_No}</div>
                        <div className="product-info">
                          <span className="product-name" style={{ fontSize: '12px' }}>{item.Item_Name || 'N/A'}</span>
                          <span className="product-id" style={{ fontSize: '11px' }}>
                            Qty: {item.TTBA_QTY} | Needed: {item.PO_NeededDate || 'N/A'} | TTBA: {item.TTBA_Date || 'N/A'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No late deliveries</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* For OnDelivery: Show single filtered list */}
          {(modalConfig.type === 'OnDelivery') && (
            <div className="of-details-container-full">
              <div className="of-details-section">
                <h3 className="of-section-title completed">
                  📦 On Delivery Items ({combinedItems.length})
                </h3>
                <div className="of-batch-list">
                  {combinedItems.length > 0 ? (
                    combinedItems.map((item, index) => (
                      <div key={index} className={`of-batch-item ${item.Status === 'Late' ? 'pending' : 'completed'}`}>
                        <div className="batch-code">PO: {item.PO_No}</div>
                        <div className="product-info">
                          <span className="product-name">{item.Item_Name || 'N/A'}</span>
                          <span className="product-id">
                            Qty: {item.TTBA_QTY} | Needed: {item.PO_NeededDate || 'N/A'} | TTBA: {item.TTBA_Date || 'N/A'} | Status: {item.Status}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-data">No items found</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Lost Sales Details Modal Component
const LostSalesDetailsModal = ({ isOpen, onClose, lostSalesData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !lostSalesData) return null;

  // Split by Product_Group and sort by potential (TotalPending) in descending order
  const allFokusProducts = lostSalesData
    .filter(item => item.Product_Group === "1. PRODUK FOKUS")
    .sort((a, b) => (b.TotalPending || 0) - (a.TotalPending || 0));
  
  const allNonFokusProducts = lostSalesData
    .filter(item => item.Product_Group === "2. PRODUK NON FOKUS")
    .sort((a, b) => (b.TotalPending || 0) - (a.TotalPending || 0));

  // Filter based on search term and maintain sorting by potential
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    
    return products
      .filter(product => {
        const productId = (product.MSO_ProductID || '').toString().toLowerCase();
        const productName = (product.Product_Name || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return productId.includes(search) || productName.includes(search);
      })
      .sort((a, b) => (b.TotalPending || 0) - (a.TotalPending || 0));
  };

  const fokusProducts = filterProducts(allFokusProducts);
  const nonFokusProducts = filterProducts(allNonFokusProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Lost Sales</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product ID or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {fokusProducts.length + nonFokusProducts.length} results for "{searchTerm}"
              {fokusProducts.length + nonFokusProducts.length !== allFokusProducts.length + allNonFokusProducts.length && 
                ` (filtered from ${allFokusProducts.length + allNonFokusProducts.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Fokus Products */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                🎯 Produk Fokus ({fokusProducts.length})
              </h3>
              <div className="of-batch-list">
                {fokusProducts.length > 0 ? (
                  fokusProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444' }}>
                      <div className="batch-code">ID: {product.MSO_ProductID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_Name || 'N/A'}</span>
                        <span className="product-id">
                          Booked: {product.Qty_Booked || 0} | 
                          Price: {formatNumber(product.Product_SalesHNA || 0)} | 
                          Potential: {formatNumber(product.TotalPending || 0)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk fokus dengan lost sales</div>
                )}
              </div>
            </div>

            {/* Non Fokus Products */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#f59e0b' }}>
                📦 Produk Non Fokus ({nonFokusProducts.length})
              </h3>
              <div className="of-batch-list">
                {nonFokusProducts.length > 0 ? (
                  nonFokusProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="batch-code">ID: {product.MSO_ProductID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_Name || 'N/A'}</span>
                        <span className="product-id">
                          Booked: {product.Qty_Booked || 0} | 
                          Price: {formatNumber(product.Product_SalesHNA || 0)} | 
                          Potential: {formatNumber(product.TotalPending || 0)}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk non fokus dengan lost sales</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Stock Out Details Modal Component
const StockOutDetailsModal = ({ isOpen, onClose, stockOutData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !stockOutData) return null;

  // Get current period for filtering
  const currentDate = new Date();
  const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter forecast data by current period and stock out products (Release = 0)
  const currentPeriodData = stockOutData.filter(item => 
    String(item.Periode || '').toString() === currentPeriod
  );
  const stockOutProducts = currentPeriodData.filter(item => (item.Release || 0) === 0);
  
  // Split by Product_Group
  const allFokusProducts = stockOutProducts.filter(item => 
    item.Product_Group === "1. PRODUK FOKUS"
  );
  const allNonFokusProducts = stockOutProducts.filter(item => 
    item.Product_Group === "2. PRODUK NON FOKUS"
  );

  // Filter based on search term
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    
    return products.filter(product => {
      const productId = (product.Product_ID || '').toString().toLowerCase();
      const productName = (product.Product_NM || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return productId.includes(search) || productName.includes(search);
    });
  };

  const fokusProducts = filterProducts(allFokusProducts);
  const nonFokusProducts = filterProducts(allNonFokusProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail Stock Out</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by product ID or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {fokusProducts.length + nonFokusProducts.length} results for "{searchTerm}"
              {fokusProducts.length + nonFokusProducts.length !== allFokusProducts.length + allNonFokusProducts.length && 
                ` (filtered from ${allFokusProducts.length + allNonFokusProducts.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Fokus Products */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                🎯 Produk Fokus ({fokusProducts.length})
              </h3>
              <div className="of-batch-list">
                {fokusProducts.length > 0 ? (
                  fokusProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_NM || 'N/A'}</span>
                        <span className="product-id">
                          Produksi: {product.Produksi || 0} | 
                          WIP: {product.WIP || 0} | 
                          Quarantine: {product.StockKarantinaNotRekapBPHP || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk fokus yang stock out</div>
                )}
              </div>
            </div>

            {/* Non Fokus Products */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#f59e0b' }}>
                📦 Produk Non Fokus ({nonFokusProducts.length})
              </h3>
              <div className="of-batch-list">
                {nonFokusProducts.length > 0 ? (
                  nonFokusProducts.map((product, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #f59e0b' }}>
                      <div className="batch-code">ID: {product.Product_ID}</div>
                      <div className="product-info">
                        <span className="product-name">{product.Product_NM || 'N/A'}</span>
                        <span className="product-id">
                          Produksi: {product.Produksi || 0} | 
                          WIP: {product.WIP || 0} | 
                          Quarantine: {product.StockKarantinaNotRekapBPHP || 0}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada produk non fokus yang stock out</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// OF Details Modal Component
const OFDetailsModal = ({ isOpen, onClose, stageName, ofRawData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !stageName) return null;

  const stageFieldMap = {
    'Turun PPI': 'TurunPPI',
    'Potong Stock': 'PotongStock', 
    'Proses': 'Proses',
    'Kemas': 'Kemas',
    'Dokumen': 'Dok',
    'Rilis QC': 'QC',
    'Rilis QA': 'QA'
  };
  
  const fieldName = stageFieldMap[stageName];
  if (!fieldName) return null;
  
  const allCompleted = ofRawData.filter(item => item[fieldName] === 1);
  const allPending = ofRawData.filter(item => item[fieldName] === 0);

  // Filter based on search term
  const filterBatches = (batches) => {
    if (!searchTerm.trim()) return batches;
    
    return batches.filter(batch => {
      const batchNo = (batch.ListBet || '').toLowerCase();
      const productId = (batch.ProductID || '').toString().toLowerCase();
      const productName = (batch.Product_Name || '').toLowerCase();
      const search = searchTerm.toLowerCase();
      
      return batchNo.includes(search) || 
             productId.includes(search) || 
             productName.includes(search);
    });
  };

  const completed = filterBatches(allCompleted);
  const pending = filterBatches(allPending);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Detail {stageName}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          {/* Search Bar */}
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by batch number, product ID, or product name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {/* Search Results Summary */}
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {completed.length + pending.length} results for "{searchTerm}"
              {completed.length + pending.length !== allCompleted.length + allPending.length && 
                ` (filtered from ${allCompleted.length + allPending.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Completed Batches */}
            <div className="of-details-section">
              <h3 className="of-section-title completed">
                ✅ Batch sudah {stageName} ({completed.length})
              </h3>
              <div className="of-batch-list">
                {completed.length > 0 ? (
                  completed.map((batch, index) => (
                    <div key={index} className="of-batch-item completed">
                      <div className="batch-code">Batch: {batch.ListBet}</div>
                      <div className="product-info">
                        <span className="product-id">ID: {batch.ProductID}</span>
                        <span className="product-name">{batch.Product_Name || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Tidak ada batch yang telah selesai</div>
                )}
              </div>
            </div>

            {/* Pending Batches */}
            <div className="of-details-section">
              <h3 className="of-section-title pending">
                ⏳ Batch belum {stageName} ({pending.length})
              </h3>
              <div className="of-batch-list">
                {pending.length > 0 ? (
                  pending.map((batch, index) => (
                    <div key={index} className="of-batch-item pending">
                      <div className="batch-code">Batch: {batch.ListBet}</div>
                      <div className="product-info">
                        <span className="product-id">ID: {batch.ProductID}</span>
                        <span className="product-name">{batch.Product_Name || 'N/A'}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">Semua batch telah selesai</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Material Availability Details Modal Component
const MaterialAvailabilityDetailsModal = ({ isOpen, onClose, materialData, modalConfig }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !materialData || !modalConfig) return null;

  // Filter by Item_Type based on modal configuration
  const filteredMaterials = materialData.filter(item => 
    modalConfig.type === 'ALL' || item.Item_Type === modalConfig.type
  );

  // Split by fulfillment status and sort by needed quantity descending
  const allFulfilledItems = filteredMaterials
    .filter(item => (item.last_stock || 0) >= (item.needed || 0))
    .sort((a, b) => (b.needed || 0) - (a.needed || 0));
  
  const allNotFulfilledItems = filteredMaterials
    .filter(item => (item.last_stock || 0) < (item.needed || 0))
    .sort((a, b) => (b.needed || 0) - (a.needed || 0));

  // Filter based on search term and maintain sorting
  const filterItems = (items) => {
    if (!searchTerm.trim()) return items;
    
    return items
      .filter(item => {
        const itemId = (item.PPI_ItemID || '').toString().toLowerCase();
        const itemName = (item.Item_Name || '').toLowerCase();
        const search = searchTerm.toLowerCase();
        
        return itemId.includes(search) || itemName.includes(search);
      })
      .sort((a, b) => (b.needed || 0) - (a.needed || 0));
  };

  const fulfilledItems = filterItems(allFulfilledItems);
  const notFulfilledItems = filterItems(allNotFulfilledItems);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{modalConfig.title}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="modal-body">
          <div className="modal-summary" style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            <div>
              <strong>Total Items:</strong> {filteredMaterials.length}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>Fulfilled:</strong> {allFulfilledItems.length}
            </div>
            <div style={{ color: '#ef4444' }}>
              <strong>Not Fulfilled:</strong> {allNotFulfilledItems.length}
            </div>
            <div>
              <strong>Fulfillment Rate:</strong> {filteredMaterials.length > 0 ? Math.round((allFulfilledItems.length / filteredMaterials.length) * 100) : 0}%
            </div>
          </div>
          
          <div className="search-container" style={{ marginBottom: '20px' }}>
            <input
              type="text"
              placeholder="Search by item ID or item name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 15px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
          
          {searchTerm.trim() && (
            <div style={{ marginBottom: '15px', fontSize: '14px', color: '#6b7280' }}>
              Found {fulfilledItems.length + notFulfilledItems.length} results for "{searchTerm}"
              {fulfilledItems.length + notFulfilledItems.length !== allFulfilledItems.length + allNotFulfilledItems.length && 
                ` (filtered from ${allFulfilledItems.length + allNotFulfilledItems.length} total)`}
            </div>
          )}
          
          <div className="of-details-container">
            {/* Fulfilled Items */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#10b981' }}>
                ✅ Fulfilled ({fulfilledItems.length})
              </h3>
              <div className="of-batch-list">
                {fulfilledItems.length > 0 ? (
                  fulfilledItems.map((item, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #10b981' }}>
                      <div className="batch-code">ID: {item.PPI_ItemID}</div>
                      <div className="product-info">
                        <span className="product-name">{item.Item_Name || 'N/A'}</span>
                        <span className="product-id">
                          Stock: {formatNumber(item.last_stock || 0)} {item.Item_Unit} | 
                          Needed: {formatNumber(item.needed || 0)} {item.Item_Unit} | 
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">No fulfilled materials</div>
                )}
              </div>
            </div>

            {/* Not Fulfilled Items */}
            <div className="of-details-section">
              <h3 className="of-section-title" style={{ color: '#ef4444' }}>
                ❌ Not Fulfilled ({notFulfilledItems.length})
              </h3>
              <div className="of-batch-list">
                {notFulfilledItems.length > 0 ? (
                  notFulfilledItems.map((item, index) => (
                    <div key={index} className="of-batch-item" style={{ borderLeft: '4px solid #ef4444' }}>
                      <div className="batch-code">ID: {item.PPI_ItemID}</div>
                      <div className="product-info">
                        <span className="product-name">{item.Item_Name || 'N/A'}</span>
                        <span className="product-id">
                          Stock: {formatNumber(item.last_stock || 0)} {item.Item_Unit} | 
                          Needed: {formatNumber(item.needed || 0)} {item.Item_Unit} | 
                          Shortage: {formatNumber((item.needed || 0) - (item.last_stock || 0))} {item.Item_Unit} | 
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-data">All materials are fulfilled</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

function SummaryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [salesChartType, setSalesChartType] = useState('Monthly'); // 'Weekly', 'Daily', or 'Monthly'
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [ofModalOpen, setOfModalOpen] = useState(false);
  const [selectedOfStage, setSelectedOfStage] = useState(null);
  const [ofRawData, setOfRawData] = useState([]);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [forecastRawData, setForecastRawData] = useState([]);
  const [lostSalesModalOpen, setLostSalesModalOpen] = useState(false);
  const [lostSalesRawData, setLostSalesRawData] = useState([]);
  const [inventoryOJModalOpen, setInventoryOJModalOpen] = useState(false);
  const [inventoryOJSlowDeadStockModalOpen, setInventoryOJSlowDeadStockModalOpen] = useState(false);
  const [inventoryOJReturnModalOpen, setInventoryOJReturnModalOpen] = useState(false);
  const [inventoryBBBKModalOpen, setInventoryBBBKModalOpen] = useState(false);
  const [inventoryBBModalOpen, setInventoryBBModalOpen] = useState(false);
  const [inventoryBKModalOpen, setInventoryBKModalOpen] = useState(false);
  const [inventoryBBReturnModalOpen, setInventoryBBReturnModalOpen] = useState(false);
  const [inventoryBKReturnModalOpen, setInventoryBKReturnModalOpen] = useState(false);
  const [bbbkRawData, setBbbkRawData] = useState([]);
  const [wipRawData, setWipRawData] = useState([]);
  const [wipModalOpen, setWipModalOpen] = useState(false);
  const [wipBatchesModalOpen, setWipBatchesModalOpen] = useState(false);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [coverageFokusModalOpen, setCoverageFokusModalOpen] = useState(false);
  const [coverageNonFokusModalOpen, setCoverageNonFokusModalOpen] = useState(false);
  const [pctModalOpen, setPctModalOpen] = useState(false);
  const [pctRawData, setPctRawData] = useState([]);
  const [otaRawData, setOtaRawData] = useState([]);
  const [otaModalOpen, setOtaModalOpen] = useState(false);
  const [otaModalConfig, setOtaModalConfig] = useState({
    title: 'Detail OTA',
    type: null
  });
  const [salesTargetModalOpen, setSalesTargetModalOpen] = useState(false);
  const [salesTargetModalConfig, setSalesTargetModalConfig] = useState({
    title: 'Detail Sales Target Achievement',
    productGroupFilter: null
  });
  const [materialRawData, setMaterialRawData] = useState([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [materialModalConfig, setMaterialModalConfig] = useState({
    title: 'Detail Material Availability',
    type: null
  });
  const [data, setData] = useState({
    sales: null,
    inventory: null,
    stockOut: null,
    coverage: null,
    whOccupancy: null,
    orderFulfillment: null,
    materialAvailability: null
  });

  // Helper functions for data caching
  const CACHE_KEY = 'SummaryDashboardData';
  const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

  const saveDataToCache = (data, rawData) => {
    const cacheData = {
      data,
      rawData,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  };

  const getCachedData = () => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (!cached) return null;
      
      const parsedCache = JSON.parse(cached);
      const now = Date.now();
      const isExpired = (now - parsedCache.timestamp) > CACHE_DURATION;
      
      return {
        ...parsedCache,
        isExpired
      };
    } catch (error) {
      console.error('Error reading cache:', error);
      return null;
    }
  };

  const formatLastUpdateTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      month: 'short',
      day: 'numeric'
    });
  };

  const handleManualRefresh = () => {
    fetchAllData(true);
  };

  const fetchAllData = async (forceRefresh = false) => {
    try {
      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedData = getCachedData();
        if (cachedData && !cachedData.isExpired) {
          console.log('📦 Using cached data');
          setData(cachedData.data);
          setOfRawData(applyOFBusinessLogic(cachedData.rawData.ofData || []));
          setForecastRawData(cachedData.rawData.forecastData || []);
          setLostSalesRawData(cachedData.rawData.lostSalesData || []);
          setBbbkRawData(cachedData.rawData.bbbkData || []);
          setWipRawData(cachedData.rawData.wipData || []);
          setPctRawData(cachedData.rawData.pctData || []);
          setOtaRawData(cachedData.rawData.otaData || []);
          setMaterialRawData(cachedData.rawData.materialData || []);
          setLastFetchTime(cachedData.timestamp);
          setLoading(false);
          return;
        }
      }

      console.log('🔄 Fetching fresh data');
      if (forceRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const [wipRes, ofRes, pctRes, forecastRes, bbbkRes, dailySalesRes, lostSalesRes, otaRes, materialRes] = await Promise.all([
        fetch(apiUrl('/api/wip')),
        fetch(apiUrl('/api/ofsummary')),
        fetch(apiUrl('/api/pctAverage')),
        fetch(apiUrl('/api/forecast')),
        fetch(apiUrl('/api/bbbk')),
        fetch(apiUrl('/api/dailySales')),
        fetch(apiUrl('/api/lostSales')),
        fetch(apiUrl('/api/ota')),
        fetch(apiUrl('/api/material'))
      ]);

      const wipData = await wipRes.json();
      const ofData = await ofRes.json();
      const pctData = await pctRes.json();
      const forecastData = await forecastRes.json();
      const bbbkData = await bbbkRes.json();
      const dailySalesData = await dailySalesRes.json();
      const lostSalesData = await lostSalesRes.json();
      const otaData = await otaRes.json();
      const materialData = await materialRes.json();
      
      // Store raw data
      const rawData = {
        ofData: ofData || [],
        forecastData: forecastData || [],
        lostSalesData: lostSalesData || [],
        bbbkData: bbbkData || [],
        wipData: wipData?.data || wipData || [],
        pctData: pctData?.data || pctData || [],
        otaData: otaData || [],
        materialData: materialData || []
      };

      setOfRawData(applyOFBusinessLogic(rawData.ofData));
      setForecastRawData(rawData.forecastData);
      setLostSalesRawData(rawData.lostSalesData);
      setBbbkRawData(rawData.bbbkData);
      setWipRawData(rawData.wipData);
      setPctRawData(rawData.pctData);
      setOtaRawData(rawData.otaData);
      setMaterialRawData(rawData.materialData);
      
      // Process and set data
      const processedData = {
        sales: processSalesData(forecastData || [], dailySalesData || []),
        inventory: processInventoryData(forecastData || []),
        stockOut: processStockOutData(forecastData || [], lostSalesData || []),
        coverage: processCoverageData(forecastData || []),
        coverageFokus: processCoverageFokusData(forecastData || []),
        coverageNonFokus: processCoverageNonFokusData(forecastData || []),
        whOccupancy: processWHOccupancyData(wipData.data || []),
        orderFulfillment: processOrderFulfillmentData(ofData || []),
        materialAvailability: processMaterialAvailabilityData(materialData || []),
        inventoryOJ: processInventoryOJData(forecastData || []),
        inventoryBB: processInventoryBBData(bbbkData || []),
        inventoryBK: processInventoryBKData(bbbkData || []),
        inventoryBBBK: processInventoryBBBKData(bbbkData || []),
        pct: processPCTData(pctData || []),
        ota: processOTAData(otaData || []),
        wip: processWIPData(wipData?.data || wipData || [])
      };

      setData(processedData);
      
      // Save to cache
      const timestamp = Date.now();
      saveDataToCache(processedData, rawData);
      setLastFetchTime(timestamp);
      setError(null); // Clear any previous errors on successful fetch
      
    } catch (error) {
      console.error('❌ Error fetching summary data:', error);
      
      // Determine if this is a timeout error
      const isTimeout = error.name === 'TypeError' || 
                       error.message?.toLowerCase().includes('timeout') ||
                       error.message?.toLowerCase().includes('failed to fetch');
      
      setError({
        type: isTimeout ? 'timeout' : 'general',
        message: error.message || 'An error occurred while loading data',
        timestamp: Date.now()
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Helper functions for OF stage analysis
  const getOfStageDetails = (stageName) => {
    if (!ofRawData || ofRawData.length === 0) return { completed: [], pending: [] };
    
    const stageFieldMap = {
      'Turun PPI': 'TurunPPI',
      'Potong Stock': 'PotongStock', 
      'Proses': 'Proses',
      'Kemas': 'Kemas',
      'Dokumen': 'Dok',
      'Rilis QC': 'QC',
      'Rilis QA': 'QA'
    };
    
    const fieldName = stageFieldMap[stageName];
    if (!fieldName) return { completed: [], pending: [] };
    
    const completed = ofRawData.filter(item => item[fieldName] === 1);
    const pending = ofRawData.filter(item => item[fieldName] === 0);
    
    return { completed, pending };
  };

  const getOfStageTooltip = (stageName) => {
    const { completed, pending } = getOfStageDetails(stageName);
    return `Completed: ${completed.length}\nPending: ${pending.length}\nTotal: ${completed.length + pending.length}`;
  };

  const handleOfStageClick = (stageName) => {
    setSelectedOfStage(stageName);
    setOfModalOpen(true);
  };

  const handleStockOutClick = () => {
    setStockOutModalOpen(true);
  };

  const handleLostSalesClick = () => {
    setLostSalesModalOpen(true);
  };

  const handleInventoryOJClick = () => {
    setInventoryOJModalOpen(true);
  };

  const handleInventoryOJSlowMovingClick = () => {
    setInventoryOJSlowDeadStockModalOpen(true);
  };

  const handleInventoryOJDeadStockClick = () => {
    setInventoryOJSlowDeadStockModalOpen(true);
  };

  const handleInventoryOJReturnClick = () => {
    setInventoryOJReturnModalOpen(true);
  };

  const handleInventoryBBBKClick = () => {
    setInventoryBBBKModalOpen(true);
  };

  const handleInventoryBBClick = () => {
    setInventoryBBModalOpen(true);
  };

  const handleInventoryBKClick = () => {
    setInventoryBKModalOpen(true);
  };

  const handleInventoryBBReturnClick = () => {
    setInventoryBBReturnModalOpen(true);
  };

  const handleInventoryBKReturnClick = () => {
    setInventoryBKReturnModalOpen(true);
  };

  const handleCoverageClick = () => {
    setCoverageModalOpen(true);
  };

  const handleCoverageFokusClick = () => {
    setCoverageFokusModalOpen(true);
  };

  const handleCoverageNonFokusClick = () => {
    setCoverageNonFokusModalOpen(true);
  };

  const handleWIPClick = () => {
    setWipModalOpen(true);
  };

  const handleWIPBatchesClick = () => {
    setWipBatchesModalOpen(true);
  };

  const handlePCTClick = () => {
    setPctModalOpen(true);
  };

  const handleOTABahanBakuClick = () => {
    setOtaModalConfig({
      title: 'Detail OTA - Bahan Baku',
      type: 'BB'
    });
    setOtaModalOpen(true);
  };

  const handleOTABahanKemasClick = () => {
    setOtaModalConfig({
      title: 'Detail OTA - Bahan Kemas',
      type: 'BK'
    });
    setOtaModalOpen(true);
  };

  // Removed unused OTA handlers since we now use donut charts instead of individual cards
  // const handleOTAOnDeliveryClick = () => { ... };
  // const handleOTAOnTimeClick = () => { ... };
  // const handleOTAEarlyClick = () => { ... };
  // const handleOTALateClick = () => { ... };

  const handleMaterialBahanBakuClick = () => {
    setMaterialModalConfig({
      title: 'Detail Material Availability - Bahan Baku',
      type: 'BB'
    });
    setMaterialModalOpen(true);
  };

  const handleMaterialBahanKemasClick = () => {
    setMaterialModalConfig({
      title: 'Detail Material Availability - Bahan Kemas',
      type: 'BK'
    });
    setMaterialModalOpen(true);
  };

  const handleSalesTargetClick = () => {
    setSalesTargetModalConfig({
      title: 'Detail Sales Target Achievement',
      productGroupFilter: null
    });
    setSalesTargetModalOpen(true);
  };

  const handleFokusProductsClick = () => {
    setSalesTargetModalConfig({
      title: 'Detail Sales Target Achievement - Fokus Products',
      productGroupFilter: '1. PRODUK FOKUS'
    });
    setSalesTargetModalOpen(true);
  };

  const handleNonFokusProductsClick = () => {
    setSalesTargetModalConfig({
      title: 'Detail Sales Target Achievement - Non Fokus Products',
      productGroupFilter: '2. PRODUK NON FOKUS'
    });
    setSalesTargetModalOpen(true);
  };

  const handleSalesClick = () => {
    navigate("/stock-forecast");
  };

  useEffect(() => {
    // Initial load
    fetchAllData();

    // Set up periodic check for cache expiration
    const intervalId = setInterval(() => {
      const cachedData = getCachedData();
      if (cachedData && cachedData.isExpired) {
        console.log('⏰ Cache expired, fetching fresh data');
        fetchAllData(true);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (salesDropdownOpen && 
          !event.target.closest('.sales-chart-dropdown-trigger') && 
          !event.target.closest('.sales-chart-dropdown-menu')) {
        setSalesDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [salesDropdownOpen]);

  // Helper function to get color based on percentage
  const getPercentageColor = (percentage) => {
    if (percentage < 50) return '#ef4444';      // Red
    if (percentage >= 50 && percentage <= 79) return '#f59e0b';  // Yellow
    return '#10b981';                           // Green
  };

  // Data processing functions
  // Helper function to calculate week boundaries according to business rules
  const calculateWeekBoundaries = (year, month) => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    
    // Find the first Sunday of the month or before
    const firstSunday = new Date(firstDayOfMonth);
    const dayOfWeek = firstSunday.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // If month doesn't start on Sunday, include the days before the first full week in Week 1
    let week1Start = 1;
    let week1End;
    
    if (dayOfWeek === 0) {
      // Month starts on Sunday - Week 1 starts normally
      week1End = 7;
    } else {
      // Month doesn't start on Sunday - absorb earlier days into Week 1
      week1End = 7 + (7 - dayOfWeek);
      if (week1End > daysInMonth) week1End = daysInMonth;
    }
    
    const weeks = [];
    weeks.push({ start: week1Start, end: Math.min(week1End, daysInMonth) });
    
    // Calculate Week 2 and Week 3 (full weeks)
    let currentStart = week1End + 1;
    for (let weekNum = 2; weekNum <= 3; weekNum++) {
      if (currentStart <= daysInMonth) {
        const weekEnd = Math.min(currentStart + 6, daysInMonth);
        weeks.push({ start: currentStart, end: weekEnd });
        currentStart = weekEnd + 1;
      } else {
        weeks.push({ start: daysInMonth + 1, end: daysInMonth }); // Empty week
      }
    }
    
    // Week 4 gets all remaining days
    if (currentStart <= daysInMonth) {
      weeks.push({ start: currentStart, end: daysInMonth });
    } else {
      weeks.push({ start: daysInMonth + 1, end: daysInMonth }); // Empty week
    }
    
    return weeks;
  };

  const processSalesData = (stockData, dailySalesData) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const todayDateString = today.toISOString().split('T')[0];

    // Calculate MTD (Month-to-Date) total sales value from stock data based on current Periode
    const currentPeriod = currentYear * 100 + currentMonth;
    const mtdTotalSales = stockData
      .filter(item => parseInt(item.Periode) === currentPeriod)
      .reduce((sum, item) => {
        const salesUnits = item.Sales || 0;
        const hnaPrice = item.HNA || 0;
        const salesValue = salesUnits * hnaPrice;
        return sum + salesValue;
      }, 0);

    // Calculate cumulative monthly sales value from daily sales data
    const cumulativeMonthlySales = dailySalesData
      .filter(item => {
        const itemDate = new Date(item.SalesDate);
        const itemMonth = itemDate.getMonth() + 1;
        const itemYear = itemDate.getFullYear();
        return itemMonth === currentMonth && itemYear === currentYear;
      })
      .reduce((sum, item) => sum + (item.TotalPrice || 0), 0);

    // Calculate monthly forecast value from stock data
    const monthlyForecast = stockData
      .filter(item => parseInt(item.Periode) === currentPeriod)
      .reduce((sum, item) => {
        const forecastUnits = item.Forecast || 0;
        const hnaPrice = item.HNA || 0;
        const forecastValue = forecastUnits * hnaPrice;
        return sum + forecastValue;
      }, 0);

    // Calculate achievement percentage (MTD sales vs monthly forecast)
    const achievement = monthlyForecast > 0 ? (mtdTotalSales / monthlyForecast) * 100 : 0;

    // Calculate sales target achievement for current period
    const currentPeriodData = stockData.filter(item => parseInt(item.Periode) === currentPeriod);
    const totalProducts = currentPeriodData.length;
    const metTargetProducts = currentPeriodData.filter(item => {
      const sales = item.Sales || 0;
      const forecast = item.Forecast || 0;
      return sales >= forecast;
    });
    const targetAchievementPercentage = totalProducts > 0 ? (metTargetProducts.length / totalProducts) * 100 : 0;

    // Calculate weekly sales data using new business logic
    const weekBoundaries = calculateWeekBoundaries(currentYear, currentMonth);
    const weeklyData = [0, 0, 0, 0]; // W1, W2, W3, W4
    const weeklyForecastData = [0, 0, 0, 0]; // Weekly forecast = monthly forecast / 4
    const weeklyForecast = monthlyForecast / 4;
    
    // Fill weekly forecast for all 4 weeks
    for (let i = 0; i < 4; i++) {
      weeklyForecastData[i] = weeklyForecast;
    }
    
    // Group sales by the new week boundaries
    dailySalesData.forEach(item => {
      const itemDate = new Date(item.SalesDate);
      const itemMonth = itemDate.getMonth() + 1;
      const itemYear = itemDate.getFullYear();
      const itemDay = itemDate.getDate();
      
      // Only include current month data
      if (itemMonth === currentMonth && itemYear === currentYear) {
        // Find which week this day belongs to
        for (let weekIndex = 0; weekIndex < weekBoundaries.length; weekIndex++) {
          const week = weekBoundaries[weekIndex];
          if (itemDay >= week.start && itemDay <= week.end) {
            weeklyData[weekIndex] += item.TotalPrice || 0;
            break;
          }
        }
      }
    });

    // Calculate current week's daily sales value data
    const currentWeekStart = new Date(today);
    const dayOfWeek = currentWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust to get Monday
    currentWeekStart.setDate(currentWeekStart.getDate() + mondayOffset);
    
    const dailyWeekData = [];
    const dailyWeekLabels = [];
    
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(currentWeekStart);
      currentDay.setDate(currentWeekStart.getDate() + i);
      
      const dayString = currentDay.toISOString().split('T')[0];
      const dayLabel = currentDay.getDate().toString();
      
      const daySales = dailySalesData
        .filter(item => {
          const itemDate = new Date(item.SalesDate).toISOString().split('T')[0];
          return itemDate === dayString;
        })
        .reduce((sum, item) => sum + (item.TotalPrice || 0), 0);
      
      dailyWeekData.push(daySales);
      dailyWeekLabels.push(dayLabel);
    }
    
    // Calculate yearly sales and forecast data for chart
    const yearlyData = {};
    const yearlyForecastData = {};
    
    // Process forecast data for yearly chart
    stockData.forEach(item => {
      const periode = parseInt(item.Periode);
      const year = Math.floor(periode / 100);
      const month = periode % 100;
      
      // Only include current year data (2025)
      if (year === currentYear) {
        const salesValue = (item.Sales || 0) * (item.HNA || 0);
        const forecastValue = (item.Forecast || 0) * (item.HNA || 0);
        
        if (!yearlyData[month]) {
          yearlyData[month] = 0;
        }
        if (!yearlyForecastData[month]) {
          yearlyForecastData[month] = 0;
        }
        
        yearlyData[month] += salesValue;
        yearlyForecastData[month] += forecastValue;
      }
    });
    
    // Convert to arrays for chart (January to current month)
    const monthlyLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const yearlySalesData = [];
    const yearlyForecastArray = [];
    
    for (let month = 1; month <= currentMonth; month++) {
      yearlySalesData.push(yearlyData[month] || 0);
      yearlyForecastArray.push(yearlyForecastData[month] || 0);
    }
    
    // Calculate Fokus and Non Fokus achievement percentages based on sales value vs forecast value
    const fokusProducts = currentPeriodData.filter(item => 
      item.Product_Group === "1. PRODUK FOKUS"
    );
    const nonFokusProducts = currentPeriodData.filter(item => 
      item.Product_Group === "2. PRODUK NON FOKUS"
    );

    // Calculate total sales value and forecast value for Fokus products
    const fokusTotalSalesValue = fokusProducts.reduce((sum, item) => {
      const salesUnits = item.Sales || 0;
      const hnaPrice = item.HNA || 0;
      return sum + (salesUnits * hnaPrice);
    }, 0);

    const fokusTotalForecastValue = fokusProducts.reduce((sum, item) => {
      const forecastUnits = item.Forecast || 0;
      const hnaPrice = item.HNA || 0;
      return sum + (forecastUnits * hnaPrice);
    }, 0);

    // Calculate total sales value and forecast value for Non Fokus products
    const nonFokusTotalSalesValue = nonFokusProducts.reduce((sum, item) => {
      const salesUnits = item.Sales || 0;
      const hnaPrice = item.HNA || 0;
      return sum + (salesUnits * hnaPrice);
    }, 0);

    const nonFokusTotalForecastValue = nonFokusProducts.reduce((sum, item) => {
      const forecastUnits = item.Forecast || 0;
      const hnaPrice = item.HNA || 0;
      return sum + (forecastUnits * hnaPrice);
    }, 0);

    // Calculate achievement percentages based on sales value vs forecast value
    const fokusAchievementPercentage = fokusTotalForecastValue > 0 ? 
      (fokusTotalSalesValue / fokusTotalForecastValue) * 100 : 0;
    const nonFokusAchievementPercentage = nonFokusTotalForecastValue > 0 ? 
      (nonFokusTotalSalesValue / nonFokusTotalForecastValue) * 100 : 0;
    
    return {
      mtdSales: mtdTotalSales,
      achievement: achievement,
      targetAchievementPercentage: targetAchievementPercentage,
      metTargetCount: metTargetProducts.length,
      totalProductCount: totalProducts,
      fokusAchievementPercentage: fokusAchievementPercentage,
      nonFokusAchievementPercentage: nonFokusAchievementPercentage,
      fokusProductCount: fokusProducts.length,
      nonFokusProductCount: nonFokusProducts.length,
      weeklyData: weeklyData,
      weeklyForecastData: weeklyForecastData,
      dailyWeekData: dailyWeekData,
      dailyWeekLabels: dailyWeekLabels,
      monthlyForecast: monthlyForecast,
      yearlySalesData: yearlySalesData,
      yearlyForecastData: yearlyForecastArray,
      yearlyLabels: monthlyLabels.slice(0, currentMonth)
    };
  };

  const processInventoryData = (stockData) => {
    // Mock inventory calculations
    const totalProducts = stockData.length;
    const slowMoving = Math.floor(totalProducts * 0.15);
    const deadStock = Math.floor(totalProducts * 0.08);
    const returnItems = Math.floor(totalProducts * 0.05);
    
    return {
      slowMoving: (slowMoving / totalProducts) * 100,
      deadStock: (deadStock / totalProducts) * 100,
      returnItems: (returnItems / totalProducts) * 100
    };
  };

  const processStockOutData = (forecastData, lostSalesData) => {
    // Calculate total lost sales from lostSales API
    const totalLostSales = lostSalesData.reduce((sum, item) => sum + (item.TotalPending || 0), 0);
    
    // Get current period (YYYYMM format)
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter forecast data by current period
    const currentPeriodData = forecastData.filter(item => 
      String(item.Periode || '').toString() === currentPeriod
    );
    
    // Calculate stock out products from forecast API (Release = 0) for current period only
    const totalProducts = currentPeriodData.length;
    const stockOutProducts = currentPeriodData.filter(item => (item.Release || 0) === 0);
    
    // Count focus and non-focus products based on Product_Group for current period
    const focusProducts = stockOutProducts.filter(item => 
      item.Product_Group === "1. PRODUK FOKUS"
    ).length;
    
    const nonFocusProducts = stockOutProducts.filter(item => 
      item.Product_Group === "2. PRODUK NON FOKUS"
    ).length;
    
    const totalStockOut = stockOutProducts.length;
    
    return {
      total: totalStockOut,
      percentage: totalProducts > 0 ? (totalStockOut / totalProducts) * 100 : 0,
      focus: focusProducts,
      nonFocus: nonFocusProducts,
      lostSales: totalLostSales,
      lostSalesFormatted: formatNumber(totalLostSales)
    };
  };

  const processCoverageData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        percentage: 0,
        under: 0,
        over: 0
      };
    }

    // Get current period (YYYYMM format)
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter data by current period
    const currentPeriodData = stockData.filter(item => 
      String(item.Periode || '').toString() === currentPeriod
    );
    
    if (currentPeriodData.length === 0) {
      return {
        percentage: 0,
        under: 0,
        over: 0
      };
    }
    
    let underCount = 0;
    let overCount = 0;
    let totalCoveragePercentage = 0;
    let validProductsCount = 0;
    
    currentPeriodData.forEach(item => {
      const forecast = item.Forecast || 0;
      const stock = item.Release || 0;
      
      if (forecast > 0) {
        const coveragePercentage = (stock / forecast) * 100;
        
        // Count Under/Over stock based on new criteria
        if (coveragePercentage < 130) {
          underCount++;
        } else if (coveragePercentage >= 300) {
          overCount++;
        }
        // Note: Products with 130-299% coverage are considered "normal" and not counted in under/over
        
        totalCoveragePercentage += coveragePercentage;
        validProductsCount++;
      }
    });
    
    // Calculate average coverage percentage across all products
    const averageCoverage = validProductsCount > 0 ? totalCoveragePercentage / validProductsCount : 0;
    
    return {
      percentage: Math.round(averageCoverage),
      under: underCount,
      over: overCount
    };
  };

  const processCoverageFokusData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        percentage: 0,
        under: 0,
        over: 0
      };
    }

    // Get current period (YYYYMM format)
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter data by current period and Focus products only
    const currentPeriodData = stockData.filter(item => 
      String(item.Periode || '').toString() === currentPeriod &&
      item.Product_Group === "1. PRODUK FOKUS"
    );
    
    if (currentPeriodData.length === 0) {
      return {
        percentage: 0,
        under: 0,
        over: 0
      };
    }
    
    let underCount = 0;
    let overCount = 0;
    let totalCoveragePercentage = 0;
    let validProductsCount = 0;
    
    currentPeriodData.forEach(item => {
      const forecast = item.Forecast || 0;
      const stock = item.Release || 0;
      
      if (forecast > 0) {
        const coveragePercentage = (stock / forecast) * 100;
        
        // Count Under/Over stock based on new criteria
        if (coveragePercentage < 130) {
          underCount++;
        } else if (coveragePercentage >= 300) {
          overCount++;
        }
        // Note: Products with 130-299% coverage are considered "normal" and not counted in under/over
        
        totalCoveragePercentage += coveragePercentage;
        validProductsCount++;
      }
    });
    
    // Calculate average coverage percentage across all products
    const averageCoverage = validProductsCount > 0 ? totalCoveragePercentage / validProductsCount : 0;
    
    return {
      percentage: Math.round(averageCoverage),
      under: underCount,
      over: overCount
    };
  };

  const processCoverageNonFokusData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        percentage: 0,
        under: 0,
        over: 0
      };
    }

    // Get current period (YYYYMM format)
    const currentDate = new Date();
    const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
    
    // Filter data by current period and Non Focus products only
    const currentPeriodData = stockData.filter(item => 
      String(item.Periode || '').toString() === currentPeriod &&
      item.Product_Group === "2. PRODUK NON FOKUS"
    );
    
    if (currentPeriodData.length === 0) {
      return {
        percentage: 0,
        under: 0,
        over: 0
      };
    }
    
    let underCount = 0;
    let overCount = 0;
    let totalCoveragePercentage = 0;
    let validProductsCount = 0;
    
    currentPeriodData.forEach(item => {
      const forecast = item.Forecast || 0;
      const stock = item.Release || 0;
      
      if (forecast > 0) {
        const coveragePercentage = (stock / forecast) * 100;
        
        // Count Under/Over stock based on new criteria
        if (coveragePercentage < 130) {
          underCount++;
        } else if (coveragePercentage >= 300) {
          overCount++;
        }
        // Note: Products with 130-299% coverage are considered "normal" and not counted in under/over
        
        totalCoveragePercentage += coveragePercentage;
        validProductsCount++;
      }
    });
    
    // Calculate average coverage percentage across all products
    const averageCoverage = validProductsCount > 0 ? totalCoveragePercentage / validProductsCount : 0;
    
    return {
      percentage: Math.round(averageCoverage),
      under: underCount,
      over: overCount
    };
  };

  const processWHOccupancyData = (wipData) => {
    // Mock warehouse occupancy data
    return {
      oj: 45,
      bb: 72,
      bk: 38,
      doiOj: 85,
      doiBb: 67,
      doiBk: 92
    };
  };

  const processWIPData = (wipData) => {
    if (!wipData || wipData.length === 0) {
      return {
        statusDistribution: [],
        totalBatches: 0,
        lateBatches: 0,
        chartData: {
          labels: [],
          datasets: []
        }
      };
    }

    // Group batches by status and calculate values
    const statusGroups = {};
    let totalBatches = 0;
    let lateBatches = 0;

    wipData.forEach(item => {
      const status = item.status || 'Unknown';
      const price = item.price || 0;
      const quantity = item.actual !== null ? item.actual : (item.standard || 0);
      const value = price * quantity;
      const duration = item.duration || 0;

      // Count total batches
      totalBatches++;

      // Count late batches (duration > 38)
      if (duration > 38) {
        lateBatches++;
      }

      // Group by status
      if (!statusGroups[status]) {
        statusGroups[status] = {
          count: 0,
          totalValue: 0,
          totalStatusDuration: 0
        };
      }
      statusGroups[status].count++;
      statusGroups[status].totalValue += value;
      statusGroups[status].totalStatusDuration += (item.statusDuration || 0);
    });

    // Convert to array for chart with specific order: Proses, Kemas, Karantina
    const statusOrder = ['Proses', 'Kemas', 'Karantina'];
    const statusDistribution = statusOrder
      .filter(status => statusGroups[status]) // Only include statuses that exist in data
      .map(status => ({
        status,
        count: statusGroups[status].count,
        value: statusGroups[status].totalValue,
        avgDuration: Math.round(statusGroups[status].totalStatusDuration / statusGroups[status].count)
      }))
      .concat(
        // Add any additional statuses not in the predefined order
        Object.entries(statusGroups)
          .filter(([status]) => !statusOrder.includes(status))
          .map(([status, data]) => ({
            status,
            count: data.count,
            value: data.totalValue,
            avgDuration: Math.round(data.totalStatusDuration / data.count)
          }))
      );

    // Calculate total value for percentages
    const totalValue = statusDistribution.reduce((sum, item) => sum + item.value, 0);

    // Create chart data with colors matching the status order
    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'proses': return '#10b981'; // Green
        case 'kemas': return '#f59e0b'; // Orange
        case 'karantina': return '#ef4444'; // Red
        default: return '#6b7280'; // Gray
      }
    };

    const chartData = {
      labels: statusDistribution.map(item => item.status),
      datasets: [{
        data: statusDistribution.map(item => 
          totalValue > 0 ? ((item.value / totalValue) * 100) : 0
        ),
        backgroundColor: statusDistribution.map(item => getStatusColor(item.status)),
        borderWidth: 0,
        cutout: '60%'
      }]
    };

    return {
      statusDistribution,
      totalBatches,
      lateBatches,
      chartData,
      totalValue
    };
  };

  // Helper function to apply OF business logic
  const applyOFBusinessLogic = (ofData) => {
    if (!ofData || ofData.length === 0) return [];
    
    return ofData.map(item => {
      const ruangLingkup = item.RuangLingkup || '';
      const isSpecialType = ruangLingkup === 'TOLL OUT JASA' || ruangLingkup === 'IMPOR PRODUK' || ruangLingkup === 'TOLL OUT BELI';
      const qaCompleted = item.QA === 1;
      
      if (isSpecialType && qaCompleted) {
        // If it's a special type and QA is completed, mark all intermediate steps as completed
        return {
          ...item,
          PotongStock: 1,
          Proses: 1,
          Kemas: 1,
          Dok: 1,
          QC: 1
        };
      }
      
      // Otherwise, return the item as-is
      return item;
    });
  };

  const processOrderFulfillmentData = (ofData) => {
    if (!ofData || ofData.length === 0) {
      return {
        turunPpi: 0,
        potongStock: 0,
        proses: 0,
        kemas: 0,
        dokumen: 0,
        rilisQc: 0,
        rilisQa: 0
      };
    }

    // Apply business logic
    const processedOfData = applyOFBusinessLogic(ofData);

    const total = processedOfData.length;
    
    // Calculate percentages for each OF stage using the processed data
    const turunPpiTrue = processedOfData.filter(item => item.TurunPPI === 1).length;
    const potongStockTrue = processedOfData.filter(item => item.PotongStock === 1).length;
    const prosesTrue = processedOfData.filter(item => item.Proses === 1).length;
    const kemasTrue = processedOfData.filter(item => item.Kemas === 1).length;
    const dokumenTrue = processedOfData.filter(item => item.Dok === 1).length;
    const qcTrue = processedOfData.filter(item => item.QC === 1).length;
    const qaTrue = processedOfData.filter(item => item.QA === 1).length;


    const result = {
      turunPpi: Math.round((turunPpiTrue / total) * 100),
      potongStock: Math.round((potongStockTrue / total) * 100),
      proses: Math.round((prosesTrue / total) * 100),
      kemas: Math.round((kemasTrue / total) * 100),
      dokumen: Math.round((dokumenTrue / total) * 100),
      rilisQc: Math.round((qcTrue / total) * 100),
      rilisQa: Math.round((qaTrue / total) * 100)
    };

    return result;
  };

  const processMaterialAvailabilityData = (materialData) => {
    if (!materialData || materialData.length === 0) {
      return {
        bahanBaku: 0,
        bahanKemas: 0
      };
    }

    // Filter by Item_Type
    const bahanBakuItems = materialData.filter(item => item.Item_Type === 'BB');
    const bahanKemasItems = materialData.filter(item => item.Item_Type === 'BK');

    // Calculate average availability percentage
    const calculateAverageAvailabilityPercentage = (items) => {
      if (items.length === 0) return 0;
      
      // Filter out items where needed is 0 or undefined to avoid division by zero
      const validItems = items.filter(item => (item.needed || 0) > 0);
      
      if (validItems.length === 0) return 0;
      
      // Calculate individual availability percentages
      const percentages = validItems.map(item => {
        const lastStock = item.last_stock || 0;
        const needed = item.needed || 0;
        // Cap at 100% to avoid skewing the average with overstocked items
        return Math.min((lastStock / needed) * 100, 100);
      });
      
      // Calculate average percentage
      const totalPercentage = percentages.reduce((sum, percentage) => sum + percentage, 0);
      return Math.round(totalPercentage / percentages.length);
    };

    return {
      bahanBaku: calculateAverageAvailabilityPercentage(bahanBakuItems),
      bahanKemas: calculateAverageAvailabilityPercentage(bahanKemasItems)
    };
  };

  const processInventoryOJData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        slowMoving: 0,
        deadStock: 0,
        return: 0
      };
    }

    // Calculate current period dynamically based on actual date
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const currentPeriod = currentYear * 100 + currentMonth;
    
    // Filter data for current month only for return calculation
    const currentMonthData = stockData.filter(item => 
      parseInt(item.Periode) === currentPeriod
    );
    
    // Calculate return value for current month
    let totalReturnValue = 0;
    currentMonthData.forEach(item => {
      const returnQty = item.retur || 0;
      const unitPrice = item.HNA || 0;
      totalReturnValue += returnQty * unitPrice;
    });
    
    // Calculate period ranges dynamically for slow moving and dead stock
    const last6MonthsPeriods = [];
    const last3MonthsPeriods = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentYear, currentMonth - 1 - i, 1);
      const period = date.getFullYear() * 100 + (date.getMonth() + 1);
      last6MonthsPeriods.push(period);
      
      if (i < 3) {
        last3MonthsPeriods.push(period);
      }
    }
    
    // Group data by Product_ID to analyze each product's sales and release history
    const productHistory = {};
    
    stockData.forEach(item => {
      const productId = item.Product_ID;
      const period = parseInt(item.Periode);
      const sales = item.Sales || 0;
      const forecast = item.Forecast || 0;
      const release = item.Release || 0;
      const hna = item.HNA || 0;
      
      if (!productHistory[productId]) {
        productHistory[productId] = { hna };
      }
      productHistory[productId][period] = { sales, forecast, release };
    });
    
    const productIds = Object.keys(productHistory);
    
    let deadStockValue = 0;
    let slowMovingValue = 0;
    
    productIds.forEach(productId => {
      const history = productHistory[productId];
      const unitPrice = history.hna || 0;
      
      // Check for dead stock (sales < 60% of forecast for last 6 months AND stock available in earliest and current periods)
      const isBelowThresholdLast6Months = last6MonthsPeriods.every(period => {
        const periodData = history[period];
        if (!periodData) return false; // If no data for this period, not considered below threshold
        
        const sales = periodData.sales || 0;
        const forecast = periodData.forecast || 0;
        
        // If forecast is 0, we can't determine the ratio, so skip this product
        if (forecast === 0) return false;
        
        // Check if sales is less than 60% of forecast
        return sales < (forecast * 0.6);
      });
      
      // Check if stock was available in earliest (6 months ago) and current periods
      const earliestPeriod = last6MonthsPeriods[0]; // First period in the 6-month range
      const currentPeriod = last6MonthsPeriods[last6MonthsPeriods.length - 1]; // Last period (current)
      
      const hasStockInEarliestPeriod = (history[earliestPeriod]?.release || 0) > 0;
      const hasStockInCurrentPeriod = (history[currentPeriod]?.release || 0) > 0;
      const currentStock = history[currentPeriod]?.release || 0;
      
      const isDeadStock = isBelowThresholdLast6Months && hasStockInEarliestPeriod && hasStockInCurrentPeriod;
      
      if (isDeadStock) {
        deadStockValue += currentStock * unitPrice;
      } else {
        // Only check for slow moving if not dead stock
        // Check for slow moving (sales < 60% of forecast for last 3 months AND stock available in earliest and current periods)
        const isBelowThresholdLast3Months = last3MonthsPeriods.every(period => {
          const periodData = history[period];
          if (!periodData) return false; // If no data for this period, not considered below threshold
          
          const sales = periodData.sales || 0;
          const forecast = periodData.forecast || 0;
          
          // If forecast is 0, we can't determine the ratio, so skip this product
          if (forecast === 0) return false;
          
          // Check if sales is less than 60% of forecast
          return sales < (forecast * 0.6);
        });
        
        // Check if stock was available in earliest (3 months ago) and current periods for slow moving
        const earliestPeriod3M = last3MonthsPeriods[0]; // First period in the 3-month range
        const currentPeriod3M = last3MonthsPeriods[last3MonthsPeriods.length - 1]; // Last period (current)
        
        const hasStockInEarliestPeriod3M = (history[earliestPeriod3M]?.release || 0) > 0;
        const hasStockInCurrentPeriod3M = (history[currentPeriod3M]?.release || 0) > 0;
        const currentStock3M = history[currentPeriod3M]?.release || 0;
        
        const isSlowMoving = isBelowThresholdLast3Months && hasStockInEarliestPeriod3M && hasStockInCurrentPeriod3M;
        
        if (isSlowMoving) {
          slowMovingValue += currentStock3M * unitPrice;
        }
      }
    });
    
    // Calculate total inventory value for current period
    let totalInventoryValue = 0;
    currentMonthData.forEach(item => {
      const stock = item.Release || 0;
      const unitPrice = item.HNA || 0;
      totalInventoryValue += stock * unitPrice;
    });
    
    const result = {
      slowMoving: slowMovingValue,
      deadStock: deadStockValue,
      return: totalReturnValue,
      totalValue: totalInventoryValue,
      slowMovingPercentage: totalInventoryValue > 0 ? (slowMovingValue / totalInventoryValue) * 100 : 0,
      deadStockPercentage: totalInventoryValue > 0 ? (deadStockValue / totalInventoryValue) * 100 : 0,
      returnPercentage: totalInventoryValue > 0 ? (totalReturnValue / totalInventoryValue) * 100 : 0
    };
    
    return result;
  };

  const processInventoryBBData = (bbbkData) => {
    // Filter only BB items
    const bbData = bbbkData.filter(item => item.item_type === 'BB');
    
    if (!bbData || bbData.length === 0) {
      return {
        slowMoving: 0,
        deadStock: 0,
        return: 0
      };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate date thresholds
    const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);
    const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
    const sixMonthsAgoYYYYMM = sixMonthsAgo.getFullYear() * 100 + (sixMonthsAgo.getMonth() + 1);
    const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
    
    // Calculate Dead Stock (null last_transaction_period or older than 6 months, but must have stock)
    const deadStockItems = bbData.filter(item => {
      const lastStock = item.last_stock || 0;
      if (lastStock === 0) return false; // Filter out items with zero stock
      
      return item.last_transaction_period === null || 
             item.last_transaction_period === '' ||
             (item.last_transaction_period && parseInt(item.last_transaction_period) < sixMonthsAgoYYYYMM);
    });
    
    // Calculate Slow Moving (3-6 months old, but must have stock)
    const slowMovingItems = bbData.filter(item => {
      const lastStock = item.last_stock || 0;
      if (lastStock === 0) return false; // Filter out items with zero stock
      
      if (!item.last_transaction_period || item.last_transaction_period === null) {
        return false; // Already counted as dead stock
      }
      const transactionPeriod = parseInt(item.last_transaction_period);
      return transactionPeriod >= sixMonthsAgoYYYYMM && transactionPeriod <= threeMonthsAgoYYYYMM;
    });
    
    // Calculate Return/Reject items (items with return or reject)
    const returnRejectItems = bbData.filter(item => {
      const totalRetur = item.totalRetur || 0;
      const totalReject = item.totalReject || 0;
      return totalRetur > 0 || totalReject > 0;
    });
    
    // Calculate total values (last_stock * UnitPrice for each category)
    const calculateCategoryValue = (items) => {
      return items.reduce((total, item) => {
        const lastStock = item.last_stock || 0;
        const unitPrice = item.UnitPrice || 0;
        return total + (lastStock * unitPrice);
      }, 0);
    };
    
    // Calculate total inventory value for all BB items with stock
    const totalInventoryValue = bbData
      .filter(item => (item.last_stock || 0) > 0)
      .reduce((total, item) => {
        const lastStock = item.last_stock || 0;
        const unitPrice = item.UnitPrice || 0;
        return total + (lastStock * unitPrice);
      }, 0);
    
    const slowMovingValue = calculateCategoryValue(slowMovingItems);
    const deadStockValue = calculateCategoryValue(deadStockItems);
    const returnValue = calculateCategoryValue(returnRejectItems);
    
    return {
      slowMoving: slowMovingValue,
      deadStock: deadStockValue,
      return: returnValue,
      totalValue: totalInventoryValue,
      slowMovingPercentage: totalInventoryValue > 0 ? (slowMovingValue / totalInventoryValue) * 100 : 0,
      deadStockPercentage: totalInventoryValue > 0 ? (deadStockValue / totalInventoryValue) * 100 : 0,
      returnPercentage: totalInventoryValue > 0 ? (returnValue / totalInventoryValue) * 100 : 0
    };
  };

  const processInventoryBKData = (bbbkData) => {
    // Filter only BK items
    const bkData = bbbkData.filter(item => item.item_type === 'BK');
    
    if (!bkData || bkData.length === 0) {
      return {
        slowMoving: 0,
        deadStock: 0,
        return: 0
      };
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    // Calculate date thresholds
    const sixMonthsAgo = new Date(currentYear, currentMonth - 7, 1);
    const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
    const sixMonthsAgoYYYYMM = sixMonthsAgo.getFullYear() * 100 + (sixMonthsAgo.getMonth() + 1);
    const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
    
    // Calculate Dead Stock (null last_transaction_period or older than 6 months, but must have stock)
    const deadStockItems = bkData.filter(item => {
      const lastStock = item.last_stock || 0;
      if (lastStock === 0) return false; // Filter out items with zero stock
      
      return item.last_transaction_period === null || 
             item.last_transaction_period === '' ||
             (item.last_transaction_period && parseInt(item.last_transaction_period) < sixMonthsAgoYYYYMM);
    });
    
    // Calculate Slow Moving (3-6 months old, but must have stock)
    const slowMovingItems = bkData.filter(item => {
      const lastStock = item.last_stock || 0;
      if (lastStock === 0) return false; // Filter out items with zero stock
      
      if (!item.last_transaction_period || item.last_transaction_period === null) {
        return false; // Already counted as dead stock
      }
      const transactionPeriod = parseInt(item.last_transaction_period);
      return transactionPeriod >= sixMonthsAgoYYYYMM && transactionPeriod <= threeMonthsAgoYYYYMM;
    });
    
    // Calculate Return/Reject items (items with return or reject)
    const returnRejectItems = bkData.filter(item => {
      const totalRetur = item.totalRetur || 0;
      const totalReject = item.totalReject || 0;
      return totalRetur > 0 || totalReject > 0;
    });
    
    // Calculate total values (last_stock * UnitPrice for each category)
    const calculateCategoryValue = (items) => {
      return items.reduce((total, item) => {
        const lastStock = item.last_stock || 0;
        const unitPrice = item.UnitPrice || 0;
        return total + (lastStock * unitPrice);
      }, 0);
    };
    
    // Calculate total inventory value for all BK items with stock
    const totalInventoryValue = bkData
      .filter(item => (item.last_stock || 0) > 0)
      .reduce((total, item) => {
        const lastStock = item.last_stock || 0;
        const unitPrice = item.UnitPrice || 0;
        return total + (lastStock * unitPrice);
      }, 0);
    
    const slowMovingValue = calculateCategoryValue(slowMovingItems);
    const deadStockValue = calculateCategoryValue(deadStockItems);
    const returnValue = calculateCategoryValue(returnRejectItems);
    
    return {
      slowMoving: slowMovingValue,
      deadStock: deadStockValue,
      return: returnValue,
      totalValue: totalInventoryValue,
      slowMovingPercentage: totalInventoryValue > 0 ? (slowMovingValue / totalInventoryValue) * 100 : 0,
      deadStockPercentage: totalInventoryValue > 0 ? (deadStockValue / totalInventoryValue) * 100 : 0,
      returnPercentage: totalInventoryValue > 0 ? (returnValue / totalInventoryValue) * 100 : 0
    };
  };

  const processInventoryBBBKData = (bbbkData) => {
    if (!bbbkData || bbbkData.length === 0) {
      return {
        slowMoving: 0,
        deadStock: 0,
        return: 0
      };
    }

    const totalItems = bbbkData.length;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
    const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1); // 3 months ago
    const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
    
    // Calculate Dead Stock (null last_transaction_period, but must have stock)
    const deadStockItems = bbbkData.filter(item => {
      const lastStock = item.last_stock || 0;
      if (lastStock === 0) return false; // Filter out items with zero stock
      
      return item.last_transaction_period === null || item.last_transaction_period === '';
    });
    
    // Calculate Slow Moving (last_transaction_period older than 3 months, but must have stock)
    const slowMovingItems = bbbkData.filter(item => {
      const lastStock = item.last_stock || 0;
      if (lastStock === 0) return false; // Filter out items with zero stock
      
      if (!item.last_transaction_period || item.last_transaction_period === null) {
        return false; // Already counted as dead stock
      }
      const transactionPeriod = parseInt(item.last_transaction_period);
      return transactionPeriod <= threeMonthsAgoYYYYMM;
    });
    
    // Calculate Return Percentage
    let totalReturnPercentages = 0;
    let validItemsCount = 0;
    
    bbbkData.forEach(item => {
      const totalRetur = item.totalRetur || 0;
      const totalPO = item.totalPO || 0;
      const totalClose = item.totalClose || 0;
      const denominator = totalPO - totalClose;
      
      if (denominator > 0) {
        const itemReturnPercentage = (totalRetur / denominator) * 100;
        totalReturnPercentages += itemReturnPercentage;
        validItemsCount++;
      }
    });
    
    const returnPercentage = validItemsCount > 0 ? (totalReturnPercentages / validItemsCount) : 0;
    const slowMovingPercentage = (slowMovingItems.length / totalItems) * 100;
    const deadStockPercentage = (deadStockItems.length / totalItems) * 100;
    
    const result = {
      slowMoving: Math.round(slowMovingPercentage),
      deadStock: Math.round(deadStockPercentage),
      return: Math.round(returnPercentage)
    };
    
    return result;
  };

  const processPCTData = (pctData) => {
    if (!pctData) {
      return {
        average: 0,
        longest: 0,
        percentage: 0
      };
    }

    // Handle both array and object responses from the API
    let dataArray = [];
    if (Array.isArray(pctData)) {
      dataArray = pctData;
    } else if (pctData.data && Array.isArray(pctData.data)) {
      dataArray = pctData.data;
    } else if (typeof pctData === 'object') {
      // If it's a single object, convert to array
      dataArray = [pctData];
    }

    if (dataArray.length === 0) {
      return {
        average: 0,
        longest: 0,
        percentage: 0
      };
    }

    // Calculate average PCT from all PCTAverage values
    const totalPCT = dataArray.reduce((sum, item) => sum + (item.PCTAverage || 0), 0);
    const averagePCT = dataArray.length > 0 ? totalPCT / dataArray.length : 0;
    
    // Find the longest PCT
    const longestPCT = Math.max(...dataArray.map(item => item.PCTAverage || 0));
    
    // Calculate percentage (average against longest)
    const percentage = longestPCT > 0 ? (averagePCT / longestPCT) * 100 : 0;
    
    return {
      average: Math.round(averagePCT * 10) / 10, // Round to 1 decimal place
      longest: Math.round(longestPCT * 10) / 10, // Round to 1 decimal place
      percentage: Math.round(percentage)
    };
  };

  const processOTAData = (otaData) => {
    if (!otaData || otaData.length === 0) {
      return {
        bahanBakuPercentage: 0,
        bahanKemasPercentage: 0,
        onDeliveryCount: 0,
        onTimePercentage: 0,
        bahanBaku: { onTime: 0, early: 0, late: 0 },
        bahanKemas: { onTime: 0, early: 0, late: 0 }
      };
    }

    // Split data by item_type
    const bahanBakuData = otaData.filter(item => item.item_type === "BB");
    const bahanKemasData = otaData.filter(item => item.item_type === "BK");

    // Calculate Bahan Baku data
    const bbOnTime = bahanBakuData.filter(item => item.Status === "On Time").length;
    const bbEarly = bahanBakuData.filter(item => item.Status === "Early").length;
    const bbLate = bahanBakuData.filter(item => item.Status === "Late").length;
    const bbTotal = bbOnTime + bbEarly + bbLate;
    const bahanBakuPercentage = bbTotal > 0 ? ((bbOnTime + bbEarly) / bbTotal) * 100 : 0; // "Not Late" = Early + On Time

    // Calculate Bahan Kemas data
    const bkOnTime = bahanKemasData.filter(item => item.Status === "On Time").length;
    const bkEarly = bahanKemasData.filter(item => item.Status === "Early").length;
    const bkLate = bahanKemasData.filter(item => item.Status === "Late").length;
    const bkTotal = bkOnTime + bkEarly + bkLate;
    const bahanKemasPercentage = bkTotal > 0 ? ((bkOnTime + bkEarly) / bkTotal) * 100 : 0; // "Not Late" = Early + On Time

    // Count On Delivery items
    const onDeliveryCount = otaData.filter(item => item.Status === "On Delivery").length;

    // Count Early and Late items
    const earlyCount = otaData.filter(item => item.Status === "Early").length;
    const lateCount = otaData.filter(item => item.Status === "Late").length;

    // Calculate overall On Time percentage
    const totalOnTime = otaData.filter(item => item.Status === "On Time").length;
    const totalEarlyLate = otaData.filter(item => item.Status === "Early" || item.Status === "Late").length;
    const totalComparable = totalOnTime + totalEarlyLate;
    const onTimePercentage = totalComparable > 0 ? (totalOnTime / totalComparable) * 100 : 0;

    // Calculate Early and Late percentages
    const earlyPercentage = totalComparable > 0 ? (earlyCount / totalComparable) * 100 : 0;
    const latePercentage = totalComparable > 0 ? (lateCount / totalComparable) * 100 : 0;

    return {
      bahanBakuPercentage: Math.round(bahanBakuPercentage),
      bahanKemasPercentage: Math.round(bahanKemasPercentage),
      onDeliveryCount: onDeliveryCount,
      earlyCount: earlyCount,
      lateCount: lateCount,
      onTimePercentage: Math.round(onTimePercentage),
      earlyPercentage: Math.round(earlyPercentage),
      latePercentage: Math.round(latePercentage),
      bahanBaku: {
        onTime: bbOnTime,
        early: bbEarly,
        late: bbLate
      },
      bahanKemas: {
        onTime: bkOnTime,
        early: bkEarly,
        late: bkLate
      }
    };
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <DashboardLoading 
            loading={true} 
            text="Loading Summary Dashboard..." 
            subtext="Sedang memuat data ringkasan..." 
            coverContentArea={true}
          />
        </main>
      </div>
    );
  }

  // Chart configurations
  const getSalesChartData = () => {
    if (salesChartType === 'Daily') {
      return {
        labels: data.sales?.dailyWeekLabels || [],
        datasets: [
          {
            label: 'Daily Sales Value',
            data: data.sales?.dailyWeekData || [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          }
        ]
      };
    } else if (salesChartType === 'Monthly') {
      return {
        labels: data.sales?.yearlyLabels || [],
        datasets: [
          {
            label: 'Monthly Sales Value',
            data: data.sales?.yearlySalesData || [],
            type: 'bar',
            backgroundColor: 'rgba(59, 130, 246, 0.6)',
            borderColor: '#3b82f6',
            borderWidth: 1
          },
          {
            label: 'Monthly Forecast Value',
            data: data.sales?.yearlyForecastData || [],
            type: 'line',
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0,
            borderDash: [5, 5],
            pointBackgroundColor: '#ef4444',
            pointBorderColor: '#ef4444'
          }
        ]
      };
    } else {
      return {
        labels: ['W1', 'W2', 'W3', 'W4'],
        datasets: [
          {
            label: 'Weekly Sales',
            data: data.sales?.weeklyData || [],
            borderColor: '#9333ea',
            backgroundColor: 'rgba(147, 51, 234, 0.3)',
            borderWidth: 2,
            fill: true,
            tension: 0.4
          },
          {
            label: 'Weekly Forecast',
            data: data.sales?.weeklyForecastData || [],
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.3)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
          }
        ]
      };
    }
  };

  const salesLineData = getSalesChartData();

  const salesLineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      // Navigate to stock forecast when chart is clicked
      navigate("/stock-forecast");
    },
    plugins: {
      legend: { position: 'top', labels: { font: { size: 10 } } },
      tooltip: { 
        enabled: true,
        callbacks: {
          label: function(context) {
            const datasetLabel = context.dataset.label;
            const value = formatNumber(context.parsed.y);
            
            if (salesChartType === 'Daily') {
              return `${datasetLabel}: ${value}`;
            } else if (salesChartType === 'Monthly') {
              return `${datasetLabel}: ${value}`;
            } else if (datasetLabel === 'Weekly Sales') {
              return `${datasetLabel}: ${value}`;
            } else if (datasetLabel === 'Weekly Forecast') {
              return `${datasetLabel}: ${value}`;
            }
            return `${datasetLabel}: ${value}`;
          }
        }
      }
    },
    scales: {
      x: { display: true, ticks: { font: { size: 10 } } },
      y: { 
        display: true, 
        ticks: { 
          font: { size: 10 },
          callback: function(value) {
            return formatNumber(value);
          }
        } 
      }
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <DashboardLoading 
            loading={true} 
            text="Loading Summary Dashboard..." 
            subtext="Sedang memuat data ringkasan..." 
            coverContentArea={true}
          />
        </main>
      </div>
    );
  }

  // Show error page if there's an error
  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '80vh',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            margin: '20px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)'
          }}>
            {/* Error Icon */}
            <div style={{
              fontSize: '80px',
              marginBottom: '24px',
              animation: 'pulse 2s infinite'
            }}>
              ⏱️
            </div>

            {/* Error Title */}
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: 'white',
              marginBottom: '16px',
              textAlign: 'center',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.2)'
            }}>
              Request Timed Out
            </h1>

            {/* Error Message */}
            <p style={{
              fontSize: '1.125rem',
              color: 'rgba(255, 255, 255, 0.9)',
              marginBottom: '12px',
              textAlign: 'center',
              maxWidth: '600px',
              lineHeight: '1.6'
            }}>
              We sincerely apologize for the inconvenience. The server is currently experiencing high load and was unable to process your request in time.
            </p>

            <p style={{
              fontSize: '0.95rem',
              color: 'rgba(255, 255, 255, 0.75)',
              marginBottom: '32px',
              textAlign: 'center',
              maxWidth: '500px'
            }}>
              Please try refreshing the page. If the problem persists, please contact the system administrator.
            </p>

            {/* Error Details (for debugging) */}
            {error.message && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '12px 20px',
                marginBottom: '32px',
                maxWidth: '600px',
                width: '100%'
              }}>
                <p style={{
                  fontSize: '0.85rem',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontFamily: 'monospace',
                  margin: 0,
                  wordBreak: 'break-word'
                }}>
                  <strong>Technical Details:</strong> {error.message}
                </p>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={() => {
                setError(null);
                fetchAllData(true);
              }}
              style={{
                background: 'white',
                color: '#667eea',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 48px',
                fontSize: '1.125rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                transition: 'all 0.3s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0, 0, 0, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.2)';
              }}
            >
              🔄 Refresh Page
            </button>

            {/* Additional Info */}
            <div style={{
              marginTop: '40px',
              padding: '16px 24px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{
                fontSize: '0.85rem',
                color: 'rgba(255, 255, 255, 0.7)',
                margin: 0,
                textAlign: 'center'
              }}>
                💡 Tip: If this error occurs frequently, the server may be under heavy load during peak hours.
                <br />
                Consider accessing the dashboard during off-peak times for better performance.
              </p>
            </div>

            {/* Animation Keyframes */}
            <style>{`
              @keyframes pulse {
                0%, 100% {
                  opacity: 1;
                  transform: scale(1);
                }
                50% {
                  opacity: 0.7;
                  transform: scale(1.05);
                }
              }
            `}</style>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area">
        <div className="summary-dashboard">
          {/* Grid Layout */}
          <div className="summary-grid">
            {/* Sales Section */}
            <KPICard 
              title="SELLING IN" 
              className="sales-card"
              headerComponent={
                <div className="data-status-container" style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  gap: '10px'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {refreshing && (
                      <div className="loading-spinner" style={{
                        width: '14px',
                        height: '14px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                    )}
                    <span style={{ 
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      color: 'white',
                      letterSpacing: '0.5px'
                    }}>
                      Data Updated: {formatLastUpdateTime(lastFetchTime)}
                    </span>
                  </div>
                  <button
                    onClick={handleManualRefresh}
                    disabled={refreshing}
                    style={{
                      background: 'rgba(255, 255, 255, 0.2)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: 'white',
                      cursor: refreshing ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      opacity: refreshing ? 0.5 : 1,
                      transition: 'all 0.2s',
                      letterSpacing: '0.3px'
                    }}
                    onMouseEnter={(e) => {
                      if (!refreshing) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!refreshing) {
                        e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                      }
                    }}
                    title="Refresh data"
                  >
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </button>
                </div>
              }
            >
              <div className="sales-content">
                {/* 4x2 grid layout: first 2x2 for circles, last 2x2 for chart */}
                <div className="sales-grid-4x2">
                  {/* Achievement Circle */}
                  <div className="sales-circle-item">
                    <CircularProgress 
                      percentage={Math.round(data.sales?.achievement || 0)} 
                      color={getPercentageColor(Math.round(data.sales?.achievement || 0))}
                      size={70}
                      onClick={handleSalesTargetClick}
                      title="Click to view sales achievement details"
                    />
                    <div className="sales-circle-label">Achievement</div>
                  </div>

                  {/* Fokus Products Circle */}
                  <div className="sales-circle-item">
                    <CircularProgress 
                      percentage={Math.round(data.sales?.fokusAchievementPercentage || 0)} 
                      color={getPercentageColor(Math.round(data.sales?.fokusAchievementPercentage || 0))}
                      size={70}
                      onClick={handleFokusProductsClick}
                      title="Click to view fokus products achievement details"
                    />
                    <div className="sales-circle-label">Focus</div>
                  </div>

                  {/* Chart section spanning 2x2 */}
                  <div className="sales-chart-section">
                    <div className="sales-chart-controls" style={{ position: 'relative' }}>
                      <div 
                        className="sales-chart-dropdown-trigger clickable" 
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSalesDropdownOpen(!salesDropdownOpen);
                        }}
                        style={{
                          padding: '6px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          border: '1px solid rgba(0, 0, 0, 0.1)',
                          borderRadius: '6px',
                          color: '#1f2937',
                          fontSize: '12px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          minWidth: '120px',
                          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
                        }}
                      >
                        <span>{salesChartType} Sales</span>
                        <span style={{ marginLeft: '6px', fontSize: '10px' }}>
                          {salesDropdownOpen ? '▲' : '▼'}
                        </span>
                      </div>
                      
                      {salesDropdownOpen && (
                        <div 
                          className="sales-chart-dropdown-menu"
                          style={{
                            position: 'absolute',
                            top: '100%',
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                            zIndex: 1000,
                            marginTop: '2px'
                          }}
                        >
                          {['Daily', 'Weekly', 'Monthly'].map((option) => (
                            <div
                              key={option}
                              className="dropdown-option"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSalesChartType(option);
                                setSalesDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                color: salesChartType === option ? '#3b82f6' : '#374151',
                                backgroundColor: salesChartType === option ? '#eff6ff' : 'white',
                                cursor: 'pointer',
                                borderBottom: option !== 'Monthly' ? '1px solid #e5e7eb' : 'none',
                                fontWeight: salesChartType === option ? 'bold' : 'normal',
                                borderRadius: option === 'Daily' ? '6px 6px 0 0' : option === 'Monthly' ? '0 0 6px 6px' : '0'
                              }}
                              onMouseEnter={(e) => {
                                if (salesChartType !== option) {
                                  e.target.style.backgroundColor = '#f9fafb';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (salesChartType !== option) {
                                  e.target.style.backgroundColor = 'white';
                                }
                              }}
                            >
                              {option} Sales
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="sales-chart">
                      <Line 
                        key={salesChartType} 
                        data={salesLineData} 
                        options={salesLineOptions} 
                      />
                    </div>
                  </div>

                  {/* Daily Sales Value */}
                  <div 
                    className="sales-daily-value-item clickable" 
                    onClick={handleSalesClick}
                    title="Click to view forecast details"
                  >
                    <div className="sales-daily-content">
                      <div className="sales-circle-label">Total Sales MTD</div>
                      <div className="sales-value-extra-large">{formatNumber(data.sales?.mtdSales || 0)}</div>
                    </div>
                  </div>

                  {/* Non Fokus Products Circle */}
                  <div className="sales-circle-item">
                    <CircularProgress 
                      percentage={Math.round(data.sales?.nonFokusAchievementPercentage || 0)} 
                      color={getPercentageColor(Math.round(data.sales?.nonFokusAchievementPercentage || 0))}
                      size={70}
                      onClick={handleNonFokusProductsClick}
                      title="Click to view non fokus products achievement details"
                    />
                    <div className="sales-circle-label">Non Focus</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* OF1 */}
            <KPICard title="OF1" className="of1-card">
              <div className="of1-content">
                <div className="of1-grid">
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.turunPpi || 0} 
                      color="#f59e0b"
                      size={80}
                      title={getOfStageTooltip('Turun PPI')}
                      onClick={() => handleOfStageClick('Turun PPI')}
                    />
                    <div className="of1-label">Turun PPI</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.potongStock || 0} 
                      color="#10b981"
                      size={80}
                      title={getOfStageTooltip('Potong Stock')}
                      onClick={() => handleOfStageClick('Potong Stock')}
                    />
                    <div className="of1-label">Potong Stock</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.proses || 0} 
                      color="#6b7280"
                      size={80}
                      title={getOfStageTooltip('Proses')}
                      onClick={() => handleOfStageClick('Proses')}
                    />
                    <div className="of1-label">Proses</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.kemas || 0} 
                      color="#8b5cf6"
                      size={80}
                      title={getOfStageTooltip('Kemas')}
                      onClick={() => handleOfStageClick('Kemas')}
                    />
                    <div className="of1-label">Kemas</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.rilisQc || 0} 
                      color="#f97316"
                      size={80}
                      title={getOfStageTooltip('Rilis QC')}
                      onClick={() => handleOfStageClick('Rilis QC')}
                    />
                    <div className="of1-label">Rilis QC</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.dokumen || 0} 
                      color="#06b6d4"
                      size={80}
                      title={getOfStageTooltip('Dokumen')}
                      onClick={() => handleOfStageClick('Dokumen')}
                    />
                    <div className="of1-label">Dokumen</div>
                  </div>
                  <div className="of1-item">
                    <CircularProgress 
                      percentage={data.orderFulfillment?.rilisQa || 0} 
                      color="#ef4444"
                      size={80}
                      title={getOfStageTooltip('Rilis QA')}
                      onClick={() => handleOfStageClick('Rilis QA')}
                    />
                    <div className="of1-label">Rilis QA</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Coverage Stock FG */}
            <KPICard title="COVERAGE STOCK FG" className="coverage-card">
              <div className="coverage-content-split">
                {/* Focus Products Section */}
                <div className="coverage-section">
                  <div className="coverage-content">
                    <div className="coverage-main">
                      <div className="coverage-section-title">PRODUK FOKUS</div>
                      <CircularProgress 
                        percentage={data.coverageFokus?.percentage || 0} 
                        color={getCoverageColor(data.coverageFokus?.percentage || 0)}
                        size={80}
                        onClick={handleCoverageFokusClick}
                        title="Click to view focus coverage details"
                      />
                    </div>
                    <div className="coverage-info-cards">
                      <div className="coverage-info-card" onClick={handleCoverageFokusClick} style={{ cursor: 'pointer' }} title="Click to view focus coverage details">
                        <div className="coverage-info-value">{data.coverageFokus?.under || 0}</div>
                        <div className="coverage-info-label">SKU Under</div>
                      </div>
                      <div className="coverage-info-card" onClick={handleCoverageFokusClick} style={{ cursor: 'pointer' }} title="Click to view focus coverage details">
                        <div className="coverage-info-value">{data.coverageFokus?.over || 0}</div>
                        <div className="coverage-info-label">SKU Over</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Non Focus Products Section */}
                <div className="coverage-section">
                  <div className="coverage-content">
                    <div className="coverage-main">
                      <div className="coverage-section-title">PRODUK NON FOKUS</div>
                      <CircularProgress 
                        percentage={data.coverageNonFokus?.percentage || 0} 
                        color={getCoverageColor(data.coverageNonFokus?.percentage || 0)}
                        size={80}
                        onClick={handleCoverageNonFokusClick}
                        title="Click to view non-focus coverage details"
                      />
                    </div>
                    <div className="coverage-info-cards">
                      <div className="coverage-info-card" onClick={handleCoverageNonFokusClick} style={{ cursor: 'pointer' }} title="Click to view non-focus coverage details">
                        <div className="coverage-info-value">{data.coverageNonFokus?.under || 0}</div>
                        <div className="coverage-info-label">SKU Under</div>
                      </div>
                      <div className="coverage-info-card" onClick={handleCoverageNonFokusClick} style={{ cursor: 'pointer' }} title="Click to view non-focus coverage details">
                        <div className="coverage-info-value">{data.coverageNonFokus?.over || 0}</div>
                        <div className="coverage-info-label">SKU Over</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* OTA */}
            <KPICard title="OTA" className="ota-card">
              <div className="ota-content-split">
                {/* Bahan Baku Section */}
                <div className="ota-section">
                  <div className="ota-section-title">BAHAN BAKU</div>
                  <div className="ota-chart-container">
                    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                      <div 
                        onClick={handleOTABahanBakuClick} 
                        style={{ 
                          position: 'absolute', 
                          top: '0', 
                          left: '0', 
                          width: '65%', // Cover only chart area, not legend
                          height: '100%', 
                          cursor: 'pointer',
                          zIndex: 5
                        }} 
                        title="Click to view Bahan Baku OTA details"
                      />
                      <Doughnut 
                        data={createOTADonutData(
                          data.ota?.bahanBaku?.onTime || 0,
                          data.ota?.bahanBaku?.early || 0,
                          data.ota?.bahanBaku?.late || 0
                        )}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'right',
                              labels: {
                                boxWidth: 10,
                                padding: 8,
                                font: {
                                  size: 12
                                },
                                usePointStyle: true
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const label = context.label || '';
                                  return label; // Already formatted with count and percentage
                                }
                              }
                            }
                          }
                        }}
                      />
                      {/* Center Text Overlay - Also clickable */}
                      <div 
                        className="ota-center-text"
                        onClick={handleOTABahanBakuClick}
                        style={{ cursor: 'pointer', zIndex: 10 }}
                        title="Click to view Bahan Baku OTA details"
                      >
                        <div className="ota-center-percentage">
                          {(() => {
                            const onTime = data.ota?.bahanBaku?.onTime || 0;
                            const early = data.ota?.bahanBaku?.early || 0;
                            const late = data.ota?.bahanBaku?.late || 0;
                            const total = onTime + early + late;
                            return total > 0 ? Math.round(((onTime + early) / total) * 100) : 0;
                          })()}%
                        </div>
                        <div className="ota-center-label">Not Late</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bahan Kemas Section */}
                <div className="ota-section">
                  <div className="ota-section-title">BAHAN KEMAS</div>
                  <div className="ota-chart-container">
                    <div style={{ height: '100%', width: '100%', position: 'relative' }}>
                      <div 
                        onClick={handleOTABahanKemasClick} 
                        style={{ 
                          position: 'absolute', 
                          top: '0', 
                          left: '0', 
                          width: '65%', // Cover only chart area, not legend
                          height: '100%', 
                          cursor: 'pointer',
                          zIndex: 5
                        }} 
                        title="Click to view Bahan Kemas OTA details"
                      />
                      <Doughnut 
                        data={createOTADonutData(
                          data.ota?.bahanKemas?.onTime || 0,
                          data.ota?.bahanKemas?.early || 0,
                          data.ota?.bahanKemas?.late || 0
                        )}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              display: true,
                              position: 'right',
                              labels: {
                                boxWidth: 10,
                                padding: 8,
                                font: {
                                  size: 12
                                },
                                usePointStyle: true
                              }
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const label = context.label || '';
                                  return label; // Already formatted with count and percentage
                                }
                              }
                            }
                          }
                        }}
                      />
                      {/* Center Text Overlay - Also clickable */}
                      <div 
                        className="ota-center-text"
                        onClick={handleOTABahanKemasClick}
                        style={{ cursor: 'pointer', zIndex: 10 }}
                        title="Click to view Bahan Kemas OTA details"
                      >
                        <div className="ota-center-percentage">
                          {(() => {
                            const onTime = data.ota?.bahanKemas?.onTime || 0;
                            const early = data.ota?.bahanKemas?.early || 0;
                            const late = data.ota?.bahanKemas?.late || 0;
                            const total = onTime + early + late;
                            return total > 0 ? Math.round(((onTime + early) / total) * 100) : 0;
                          })()}%
                        </div>
                        <div className="ota-center-label">Not Late</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Stock Out */}
            <KPICard title="STOCK OUT" className="stock-out-card">
              <div className="stock-out-content">
                <div className="stock-out-main">
                  <CircularProgress 
                    percentage={data.stockOut?.percentage || 0} 
                    color="#1f2937"
                    size={90}
                    centerContent={
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937' }}>
                          {data.stockOut?.lostSalesFormatted || '0'}
                        </div>
                      </div>
                    }
                    showPercentage={false}
                    onClick={handleLostSalesClick}
                    title="Click to view lost sales details"
                  />
                </div>
                <div className="stock-out-info-cards">
                  <div className="stock-out-info-card" onClick={handleStockOutClick} style={{ cursor: 'pointer' }} title="Click to view stock out products">
                    <div className="stock-out-info-value">{data.stockOut?.focus || 0}</div>
                    <div className="stock-out-info-label">Fokus</div>
                  </div>
                  <div className="stock-out-info-card" onClick={handleStockOutClick} style={{ cursor: 'pointer' }} title="Click to view stock out products">
                    <div className="stock-out-info-value">{data.stockOut?.nonFocus || 0}</div>
                    <div className="stock-out-info-label">Non Fokus</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Material Availability */}
            <KPICard title="MATERIAL AVAILABILITY" className="material-availability-card">
              <div className="material-availability-content">
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanBaku || 0} 
                    color="#10b981"
                    size={60}
                    onClick={handleMaterialBahanBakuClick}
                    title="Click to view Bahan Baku details"
                  />
                  <div className="material-info-label">Bahan Baku</div>
                </div>
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanKemas || 0} 
                    color="#f59e0b"
                    size={60}
                    onClick={handleMaterialBahanKemasClick}
                    title="Click to view Bahan Kemas details"
                  />
                  <div className="material-info-label">Bahan Kemas</div>
                </div>
              </div>
            </KPICard>

            {/* WIP */}
            <KPICard title="WIP" className="wip-card">
              <div className="wip-content" style={{ 
                height: '100%', 
                display: 'grid', 
                gridTemplateColumns: '1.6fr 1fr 0.9fr',
                gridTemplateRows: '1fr 1fr',
                gap: '8px',
              }}>
                {/* Donut Chart with Center Value (2x2) */}
                <div style={{ 
                  gridColumn: '1', 
                  gridRow: '1 / span 2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  maxHeight: '140px'
                }}>
                  {data.wip?.chartData && data.wip?.statusDistribution.length > 0 ? (
                    <div 
                      style={{ 
                        position: 'relative', 
                        width: '100%', 
                        height: '100%', 
                        maxWidth: '130px', 
                        maxHeight: '130px',
                        cursor: 'pointer'
                      }}
                      onClick={handleWIPClick}
                      title="Click to view WIP details"
                    >
                      <Doughnut 
                        data={data.wip.chartData}
                        options={{
                          responsive: true,
                          maintainAspectRatio: true,
                          aspectRatio: 1,
                          plugins: {
                            legend: {
                              display: false
                            },
                            tooltip: {
                              callbacks: {
                                label: function(context) {
                                  const statusData = data.wip?.statusDistribution[context.dataIndex];
                                  return `${context.label}: ${context.parsed.toFixed(1)}% (${formatNumber(statusData?.value || 0)}) - Avg: ${statusData?.avgDuration || 0} days`;
                                }
                              }
                            }
                          },
                          onClick: handleWIPClick
                        }}
                      />
                      {/* Center Value Display */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: '-20px',
                        right: '0',
                        bottom: '0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none'
                      }}>
                        <div style={{
                          fontSize: '13px',
                          fontWeight: 'bold',
                          color: '#1f2937',
                          textAlign: 'center'
                        }}>
                          {formatNumber(data.wip?.totalValue || 0)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>
                      No WIP data
                    </div>
                  )}
                </div>

                {/* Chart Legend (1x2) */}
                <div style={{ 
                  gridColumn: '2', 
                  gridRow: '1 / span 2',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  justifyContent: 'center',
                  marginLeft: '-90px'
                }}>
                  {data.wip?.statusDistribution.slice(0, 3).map((item, index) => (
                    <div 
                      key={index} 
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '14px',
                        color: '#374151',
                        cursor: 'pointer',
                        padding: '4px',
                        borderRadius: '4px',
                        transition: 'background-color 0.2s'
                      }}
                      onClick={handleWIPClick}
                      title="Click to view WIP details"
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                    >
                      <div style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: data.wip?.chartData.datasets[0].backgroundColor[index],
                        flexShrink: 0
                      }}></div>
                      <div style={{ flex: 1, fontWeight: '500' }}>
                        {item.status} - {item.count} batch ({formatNumber(item.value)}) {item.avgDuration} days
                      </div>
                    </div>
                  ))}
                </div>

                {/* WIP Batches Info Card (1x1) */}
                <div 
                  style={{ 
                    gridColumn: '3', 
                    gridRow: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    padding: '8px',
                    border: '1px solid #e2e8f0',
                    minHeight: '50px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={handleWIPBatchesClick}
                  title="Click to view WIP batches timeline"
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#e2e8f0'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#f8fafc'}
                >
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#1f2937', 
                    lineHeight: '1',
                    marginBottom: '3px'
                  }}>
                    {data.wip?.totalBatches || 0}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#6b7280', 
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    WIP Batches
                  </div>
                </div>

                {/* Late Batches Info Card (1x1) */}
                <div 
                  style={{ 
                    gridColumn: '3', 
                    gridRow: '2',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#fef2f2',
                    borderRadius: '6px',
                    padding: '8px',
                    border: '1px solid #fecaca',
                    minHeight: '50px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s'
                  }}
                  onClick={handleWIPBatchesClick}
                  title="Click to view WIP batches timeline"
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#fecaca'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#fef2f2'}
                >
                  <div style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold', 
                    color: '#dc2626', 
                    lineHeight: '1',
                    marginBottom: '3px'
                  }}>
                    {data.wip?.lateBatches || 0}
                  </div>
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#6b7280', 
                    textAlign: 'center',
                    fontWeight: '500'
                  }}>
                    Late Batches
                  </div>
                </div>
              </div>
            </KPICard>

            {/* PCT */}
            <KPICard title="PCT" className="pct-card">
              <div className="pct-content">
                <div className="pct-speedometer">
                  <div 
                    className="circular-progress clickable"
                    style={{ width: 70, height: 70, position: 'relative', cursor: 'pointer' }}
                    title={`Average PCT: ${data.pct?.average || 0} hari\nPCT Terlama: ${data.pct?.longest || 0} hari`}
                    onClick={handlePCTClick}
                  >
                    <svg width={70} height={70} style={{ transform: 'rotate(-90deg)' }}>
                      <circle
                        cx={35}
                        cy={35}
                        r={29}
                        stroke="#e5e7eb"
                        strokeWidth={12}
                        fill="transparent"
                      />
                      <circle
                        cx={35}
                        cy={35}
                        r={29}
                        stroke="#3b82f6"
                        strokeWidth={12}
                        fill="transparent"
                        strokeDasharray={182.2}
                        strokeDashoffset={182.2 - ((data.pct?.percentage || 0) / 100) * 182.2}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
                      />
                    </svg>
                    <div 
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        textAlign: 'center',
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1f2937'
                      }}
                    >
                      {data.pct?.average || 0}
                    </div>
                  </div>
                  <div className="pct-label">PCT Average (hari)</div>
                </div>
              </div>
            </KPICard>

            {/* Inventory Obat Jadi */}
            <KPICard title="INVENTORY OBAT JADI" className="inventory-oj-card">
              <div className="inventory-oj-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.slowMovingPercentage || 0} 
                      color="#f59e0b"
                      size={60}
                      onClick={handleInventoryOJSlowMovingClick}
                      title="Click to view slow moving products"
                      centerContent={formatNumber(data.inventoryOJ?.slowMoving || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.deadStockPercentage || 0} 
                      color="#ef4444"
                      size={60}
                      onClick={handleInventoryOJDeadStockClick}
                      title="Click to view dead stock products"
                      centerContent={formatNumber(data.inventoryOJ?.deadStock || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.returnPercentage || 0} 
                      color="#8b5cf6"
                      size={60}
                      onClick={handleInventoryOJReturnClick}
                      title="Click to view returned products"
                      centerContent={formatNumber(data.inventoryOJ?.return || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Return</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Inventory Bahan Baku */}
            <KPICard title="INVENTORY BAHAN BAKU" className="inventory-bb-card">
              <div className="inventory-bb-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBB?.slowMovingPercentage || 0} 
                      color="#f59e0b"
                      size={60}
                      onClick={handleInventoryBBClick}
                      title="Click to view slow moving items"
                      centerContent={formatNumber(data.inventoryBB?.slowMoving || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBB?.deadStockPercentage || 0} 
                      color="#ef4444"
                      size={60}
                      onClick={handleInventoryBBClick}
                      title="Click to view dead stock items"
                      centerContent={formatNumber(data.inventoryBB?.deadStock || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBB?.returnPercentage || 0} 
                      color="#8b5cf6"
                      size={60}
                      onClick={handleInventoryBBReturnClick}
                      title="Click to view return/reject items"
                      centerContent={formatNumber(data.inventoryBB?.return || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Return/Reject</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Inventory Bahan Kemas */}
            <KPICard title="INVENTORY BAHAN KEMAS" className="inventory-bk-card">
              <div className="inventory-bk-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBK?.slowMovingPercentage || 0} 
                      color="#f59e0b"
                      size={60}
                      onClick={handleInventoryBKClick}
                      title="Click to view slow moving items"
                      centerContent={formatNumber(data.inventoryBK?.slowMoving || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBK?.deadStockPercentage || 0} 
                      color="#ef4444"
                      size={60}
                      onClick={handleInventoryBKClick}
                      title="Click to view dead stock items"
                      centerContent={formatNumber(data.inventoryBK?.deadStock || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBK?.returnPercentage || 0} 
                      color="#8b5cf6"
                      size={60}
                      onClick={handleInventoryBKReturnClick}
                      title="Click to view return/reject items"
                      centerContent={formatNumber(data.inventoryBK?.return || 0)}
                      showPercentage={false}
                    />
                    <div className="inventory-label">Return/Reject</div>
                  </div>
                </div>
              </div>
            </KPICard>
          </div>
        </div>
        
        {/* OF Details Modal */}
        <OFDetailsModal 
          isOpen={ofModalOpen}
          onClose={() => setOfModalOpen(false)}
          stageName={selectedOfStage}
          ofRawData={ofRawData}
        />
        
        {/* Stock Out Details Modal */}
        <StockOutDetailsModal 
          isOpen={stockOutModalOpen}
          onClose={() => setStockOutModalOpen(false)}
          stockOutData={forecastRawData}
        />
        
        {/* Lost Sales Details Modal */}
        <LostSalesDetailsModal 
          isOpen={lostSalesModalOpen}
          onClose={() => setLostSalesModalOpen(false)}
          lostSalesData={lostSalesRawData}
        />
        
        {/* Inventory OJ Details Modal */}
        <InventoryOJDetailsModal 
          isOpen={inventoryOJModalOpen}
          onClose={() => setInventoryOJModalOpen(false)}
          forecastData={forecastRawData}
        />
        
        {/* Inventory OJ Return Details Modal */}
        <InventoryOJReturnDetailsModal 
          isOpen={inventoryOJReturnModalOpen}
          onClose={() => setInventoryOJReturnModalOpen(false)}
          forecastData={forecastRawData}
        />
        
        {/* Inventory OJ Slow Moving & Dead Stock Details Modal */}
        <InventoryOJSlowDeadStockDetailsModal 
          isOpen={inventoryOJSlowDeadStockModalOpen}
          onClose={() => setInventoryOJSlowDeadStockModalOpen(false)}
          forecastData={forecastRawData}
        />
        
        {/* Coverage Details Modal */}
        <CoverageDetailsModal 
          isOpen={coverageModalOpen}
          onClose={() => setCoverageModalOpen(false)}
          forecastData={forecastRawData}
        />
        
        {/* Coverage Fokus Details Modal */}
        <CoverageDetailsModal 
          isOpen={coverageFokusModalOpen}
          onClose={() => setCoverageFokusModalOpen(false)}
          forecastData={forecastRawData}
          productGroupFilter="1. PRODUK FOKUS"
          modalTitle="Detail Coverage Stock FG - Produk Fokus"
        />
        
        {/* Coverage Non-Fokus Details Modal */}
        <CoverageDetailsModal 
          isOpen={coverageNonFokusModalOpen}
          onClose={() => setCoverageNonFokusModalOpen(false)}
          forecastData={forecastRawData}
          productGroupFilter="2. PRODUK NON FOKUS"
          modalTitle="Detail Coverage Stock FG - Produk Non Fokus"
        />
        
        {/* WIP Details Modal */}
        <WIPDetailsModal 
          isOpen={wipModalOpen}
          onClose={() => setWipModalOpen(false)}
          wipData={wipRawData}
        />
        
        {/* WIP Batches Modal */}
        <WIPBatchesModal 
          isOpen={wipBatchesModalOpen}
          onClose={() => setWipBatchesModalOpen(false)}
          wipData={wipRawData}
        />
        
        {/* Sales Target Details Modal */}
        <SalesTargetDetailsModal 
          isOpen={salesTargetModalOpen}
          onClose={() => setSalesTargetModalOpen(false)}
          forecastData={forecastRawData}
          modalTitle={salesTargetModalConfig.title}
          productGroupFilter={salesTargetModalConfig.productGroupFilter}
        />
        
        {/* Inventory Bahan Baku Details Modal */}
        <InventoryBahanBakuDetailsModal 
          isOpen={inventoryBBModalOpen}
          onClose={() => setInventoryBBModalOpen(false)}
          bbData={bbbkRawData.filter(item => item.item_type === 'BB')}
        />
        
        {/* Inventory Bahan Kemas Details Modal */}
        <InventoryBahanKemasDetailsModal 
          isOpen={inventoryBKModalOpen}
          onClose={() => setInventoryBKModalOpen(false)}
          bkData={bbbkRawData.filter(item => item.item_type === 'BK')}
        />
        
        {/* Inventory BB-BK Details Modal */}
        <InventoryBBBKDetailsModal 
          isOpen={inventoryBBBKModalOpen}
          onClose={() => setInventoryBBBKModalOpen(false)}
          bbbkData={bbbkRawData}
        />
        
        {/* PCT Details Modal */}
        <PCTDetailsModal 
          isOpen={pctModalOpen}
          onClose={() => setPctModalOpen(false)}
          pctData={pctRawData}
        />
        
        {/* OTA Details Modal */}
        <OTADetailsModal 
          isOpen={otaModalOpen}
          onClose={() => setOtaModalOpen(false)}
          otaData={otaRawData}
          modalConfig={otaModalConfig}
        />
        
        {/* Material Availability Details Modal */}
        <MaterialAvailabilityDetailsModal 
          isOpen={materialModalOpen}
          onClose={() => setMaterialModalOpen(false)}
          materialData={materialRawData}
          modalConfig={materialModalConfig}
        />

        {/* Inventory BB Return/Reject Details Modal */}
        <InventoryReturnRejectDetailsModal 
          isOpen={inventoryBBReturnModalOpen}
          onClose={() => setInventoryBBReturnModalOpen(false)}
          bbbkData={bbbkRawData}
          itemType="BB"
        />

        {/* Inventory BK Return/Reject Details Modal */}
        <InventoryReturnRejectDetailsModal 
          isOpen={inventoryBKReturnModalOpen}
          onClose={() => setInventoryBKReturnModalOpen(false)}
          bbbkData={bbbkRawData}
          itemType="BK"
        />
      </main>
    </div>
  );
}

export default SummaryDashboard;
