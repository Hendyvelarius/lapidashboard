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

// Circular Progress Chart Component with Custom Center Content
const CircularProgress = ({ percentage, size = 120, strokeWidth = 12, color = '#4f8cff', backgroundColor = '#e5e7eb', title, onClick, className = '', centerContent, showPercentage = true }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

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
const CoverageDetailsModal = ({ isOpen, onClose, forecastData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !forecastData) return null;

  // Get current period for filtering
  const currentDate = new Date();
  const currentPeriod = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
  
  // Filter forecast data by current period
  const currentPeriodData = forecastData.filter(item => 
    String(item.Periode || '').toString() === currentPeriod
  );

  // Calculate coverage percentage for a product
  const getCoverage = (product) => {
    const forecast = product.Forecast || 0;
    const stock = product.Release || 0;
    return forecast > 0 ? Math.round((stock / forecast) * 100) : 0;
  };

  // Categorize products based on coverage percentage
  const allUnderProducts = currentPeriodData.filter(item => {
    const coverage = getCoverage(item);
    return coverage < 100;
  });

  const allNormalProducts = currentPeriodData.filter(item => {
    const coverage = getCoverage(item);
    return coverage >= 100 && coverage <= 299;
  });

  const allOverProducts = currentPeriodData.filter(item => {
    const coverage = getCoverage(item);
    return coverage >= 300;
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

  const underProducts = filterProducts(allUnderProducts);
  const normalProducts = filterProducts(allNormalProducts);
  const overProducts = filterProducts(allOverProducts);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content of-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90vw' }}>
        <div className="modal-header">
          <h2>Detail Coverage Stock FG</h2>
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
              <strong>SKU Under (&lt;100%):</strong> {allUnderProducts.length}
            </div>
            <div style={{ color: '#10b981' }}>
              <strong>SKU Normal (100-299%):</strong> {allNormalProducts.length}
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
                📉 SKU Under (&lt;100%) ({underProducts.length})
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
                📊 SKU Normal (100-299%) ({normalProducts.length})
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

// Inventory BB-BK Details Modal Component
const InventoryBBBKDetailsModal = ({ isOpen, onClose, bbbkData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !bbbkData) return null;

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const threeMonthsAgo = new Date(currentYear, currentMonth - 4, 1);
  const threeMonthsAgoYYYYMM = threeMonthsAgo.getFullYear() * 100 + (threeMonthsAgo.getMonth() + 1);
  
  // Calculate Dead Stock (null last_transaction_period)
  const allDeadStockItems = bbbkData.filter(item => 
    item.last_transaction_period === null || item.last_transaction_period === ''
  );
  
  // Calculate Slow Moving (last_transaction_period older than 3 months)
  const allSlowMovingItems = bbbkData.filter(item => {
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

  const slowMovingItems = filterItems(allSlowMovingItems);
  const deadStockItems = filterItems(allDeadStockItems);

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
                  slowMovingItems.map((item, index) => (
                    <div key={index} className="of-batch-item completed">
                      <div className="batch-code">Code: {item.item_code}</div>
                      <div className="product-info">
                        <span className="product-name">{item.item_name || 'N/A'}</span>
                        <span className="product-id">Last Transaction: {item.last_transaction_period || 'N/A'}</span>
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
                        <span className="product-id">Last Transaction: None</span>
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

// PCT Details Modal Component
const PCTDetailsModal = ({ isOpen, onClose, pctData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !pctData) return null;

  // Split products by PCT performance (under 38 days = on time, 38+ days = past deadline)
  const allOnTimeProducts = pctData.filter(item => (item.PCTAverage || 0) < 38);
  const allPastDeadlineProducts = pctData.filter(item => (item.PCTAverage || 0) >= 38);

  // Filter based on search term
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(product =>
      (product.Product_ID || '').toLowerCase().includes(lower) ||
      (product.Product_Name || '').toLowerCase().includes(lower) ||
      (product.Kategori || '').toLowerCase().includes(lower) ||
      (product.Dept || '').toLowerCase().includes(lower)
    );
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

// Lost Sales Details Modal Component
const LostSalesDetailsModal = ({ isOpen, onClose, lostSalesData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!isOpen || !lostSalesData) return null;

  // Split by Product_Group
  const allFokusProducts = lostSalesData.filter(item => 
    item.Product_Group === "1. PRODUK FOKUS"
  );
  const allNonFokusProducts = lostSalesData.filter(item => 
    item.Product_Group === "2. PRODUK NON FOKUS"
  );

  // Filter based on search term
  const filterProducts = (products) => {
    if (!searchTerm.trim()) return products;
    
    return products.filter(product => {
      const productId = (product.MSO_ProductID || '').toString().toLowerCase();
      const productName = (product.Product_Name || '').toLowerCase();
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
      const productName = (product.Product_Name || '').toLowerCase();
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
                        <span className="product-id">Produksi: {product.Produksi || 0} | WIP: {product.WIP || 0}</span>
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
                        <span className="product-id">Produksi: {product.Produksi || 0} | WIP: {product.WIP || 0}</span>
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

function SummaryDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const [salesChartType, setSalesChartType] = useState('Yearly'); // 'Weekly', 'Daily', or 'Yearly'
  const [salesDropdownOpen, setSalesDropdownOpen] = useState(false);
  const [ofModalOpen, setOfModalOpen] = useState(false);
  const [selectedOfStage, setSelectedOfStage] = useState(null);
  const [ofRawData, setOfRawData] = useState([]);
  const [stockOutModalOpen, setStockOutModalOpen] = useState(false);
  const [forecastRawData, setForecastRawData] = useState([]);
  const [lostSalesModalOpen, setLostSalesModalOpen] = useState(false);
  const [lostSalesRawData, setLostSalesRawData] = useState([]);
  const [inventoryOJModalOpen, setInventoryOJModalOpen] = useState(false);
  const [inventoryBBBKModalOpen, setInventoryBBBKModalOpen] = useState(false);
  const [bbbkRawData, setBbbkRawData] = useState([]);
  const [coverageModalOpen, setCoverageModalOpen] = useState(false);
  const [pctModalOpen, setPctModalOpen] = useState(false);
  const [pctRawData, setPctRawData] = useState([]);
  const [salesTargetModalOpen, setSalesTargetModalOpen] = useState(false);
  const [salesTargetModalConfig, setSalesTargetModalConfig] = useState({
    title: 'Detail Sales Target Achievement',
    productGroupFilter: null
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
          setOfRawData(cachedData.rawData.ofData || []);
          setForecastRawData(cachedData.rawData.forecastData || []);
          setLostSalesRawData(cachedData.rawData.lostSalesData || []);
          setBbbkRawData(cachedData.rawData.bbbkData || []);
          setPctRawData(cachedData.rawData.pctData || []);
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
      
      const [wipRes, ofRes, pctRes, forecastRes, bbbkRes, dailySalesRes, lostSalesRes] = await Promise.all([
        fetch(apiUrl('/api/wip')),
        fetch(apiUrl('/api/ofsummary')),
        fetch(apiUrl('/api/pctAverage')),
        fetch(apiUrl('/api/forecast')),
        fetch(apiUrl('/api/bbbk')),
        fetch(apiUrl('/api/dailySales')),
        fetch(apiUrl('/api/lostSales'))
      ]);

      const wipData = await wipRes.json();
      const ofData = await ofRes.json();
      const pctData = await pctRes.json();
      const forecastData = await forecastRes.json();
      const bbbkData = await bbbkRes.json();
      const dailySalesData = await dailySalesRes.json();
      const lostSalesData = await lostSalesRes.json();
      
      console.log('📊 Lost Sales Data:', lostSalesData);
      console.log('📈 Forecast Data Sample:', forecastData?.slice(0, 3));
      
      // Store raw data
      const rawData = {
        ofData: ofData || [],
        forecastData: forecastData || [],
        lostSalesData: lostSalesData || [],
        bbbkData: bbbkData || [],
        pctData: pctData?.data || pctData || []
      };

      setOfRawData(rawData.ofData);
      setForecastRawData(rawData.forecastData);
      setLostSalesRawData(rawData.lostSalesData);
      setBbbkRawData(rawData.bbbkData);
      setPctRawData(rawData.pctData);
      
      // Process and set data
      const processedData = {
        sales: processSalesData(forecastData || [], dailySalesData || []),
        inventory: processInventoryData(forecastData || []),
        stockOut: processStockOutData(forecastData || [], lostSalesData || []),
        coverage: processCoverageData(forecastData || []),
        whOccupancy: processWHOccupancyData(wipData.data || []),
        orderFulfillment: processOrderFulfillmentData(ofData || []),
        materialAvailability: processMaterialAvailabilityData(forecastData || []),
        inventoryOJ: processInventoryOJData(forecastData || []),
        inventoryBBBK: processInventoryBBBKData(bbbkData || []),
        pct: processPCTData(pctData || [])
      };

      setData(processedData);
      
      // Save to cache
      const timestamp = Date.now();
      saveDataToCache(processedData, rawData);
      setLastFetchTime(timestamp);
      
    } catch (error) {
      console.error('❌ Error fetching summary data:', error);
      // Fallback to mock data on error
      setData({
        sales: processSalesData([], []),
        inventory: processInventoryData([]),
        stockOut: processStockOutData([], []),
        coverage: processCoverageData([]),
        whOccupancy: processWHOccupancyData([]),
        orderFulfillment: {
          turunPpi: 78,
          potongStock: 65,
          proses: 88,
          kemas: 92,
          dokumen: 76,
          rilisQc: 89,
          rilisQa: 84
        },
        materialAvailability: processMaterialAvailabilityData([]),
        inventoryOJ: processInventoryOJData([]),
        inventoryBBBK: processInventoryBBBKData([]),
        pct: { average: 5.2, longest: 12.8, percentage: 40.6 }
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

  const handleInventoryBBBKClick = () => {
    setInventoryBBBKModalOpen(true);
  };

  const handleCoverageClick = () => {
    setCoverageModalOpen(true);
  };

  const handlePCTClick = () => {
    setPctModalOpen(true);
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
      if (salesDropdownOpen && !event.target.closest('.sales-chart-dropdown-container')) {
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
  const processSalesData = (stockData, dailySalesData) => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();
    const todayDateString = today.toISOString().split('T')[0];

    // Calculate today's total sales value from daily sales data
    const todaysSales = dailySalesData
      .filter(item => {
        const itemDate = new Date(item.SalesDate).toISOString().split('T')[0];
        return itemDate === todayDateString;
      })
      .reduce((sum, item) => sum + (item.TotalPrice || 0), 0);

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
    const currentPeriod = currentYear * 100 + currentMonth;
    const monthlyForecast = stockData
      .filter(item => parseInt(item.Periode) === currentPeriod)
      .reduce((sum, item) => {
        const forecastUnits = item.Forecast || 0;
        const hnaPrice = item.HNA || 0;
        const forecastValue = forecastUnits * hnaPrice;
        return sum + forecastValue;
      }, 0);

    // Calculate achievement percentage (cumulative monthly sales vs monthly forecast)
    const achievement = monthlyForecast > 0 ? (cumulativeMonthlySales / monthlyForecast) * 100 : 0;

    // Calculate sales target achievement for current period
    const currentPeriodData = stockData.filter(item => parseInt(item.Periode) === currentPeriod);
    const totalProducts = currentPeriodData.length;
    const metTargetProducts = currentPeriodData.filter(item => {
      const sales = item.Sales || 0;
      const forecast = item.Forecast || 0;
      return sales >= forecast;
    });
    const targetAchievementPercentage = totalProducts > 0 ? (metTargetProducts.length / totalProducts) * 100 : 0;

    // Calculate weekly cumulative sales value data for chart
    const weeklyData = {};
    const cumulativeWeeklyData = [];
    
    // Group sales by week for current month
    dailySalesData.forEach(item => {
      const itemDate = new Date(item.SalesDate);
      const itemMonth = itemDate.getMonth() + 1;
      const itemYear = itemDate.getFullYear();
      
      // Only include current month data
      if (itemMonth === currentMonth && itemYear === currentYear) {
        const week = item.WeekOfMonth;
        if (!weeklyData[week]) {
          weeklyData[week] = 0;
        }
        weeklyData[week] += item.TotalPrice || 0;
      }
    });

    // Convert to cumulative chart data
    let cumulativeTotal = 0;
    for (let week = 1; week <= 5; week++) {
      const weeklyAmount = weeklyData[week] || 0;
      cumulativeTotal += weeklyAmount;
      
      cumulativeWeeklyData.push(cumulativeTotal);
    }

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
    
    // Calculate Fokus and Non Fokus achievement percentages
    const fokusProducts = currentPeriodData.filter(item => 
      item.Product_Group === "1. PRODUK FOKUS"
    );
    const nonFokusProducts = currentPeriodData.filter(item => 
      item.Product_Group === "2. PRODUK NON FOKUS"
    );

    const fokusMetTarget = fokusProducts.filter(item => {
      const sales = item.Sales || 0;
      const forecast = item.Forecast || 0;
      return sales >= forecast;
    });

    const nonFokusMetTarget = nonFokusProducts.filter(item => {
      const sales = item.Sales || 0;
      const forecast = item.Forecast || 0;
      return sales >= forecast;
    });

    const fokusAchievementPercentage = fokusProducts.length > 0 ? 
      (fokusMetTarget.length / fokusProducts.length) * 100 : 0;
    const nonFokusAchievementPercentage = nonFokusProducts.length > 0 ? 
      (nonFokusMetTarget.length / nonFokusProducts.length) * 100 : 0;
    
    return {
      dailySales: todaysSales,
      achievement: achievement,
      targetAchievementPercentage: targetAchievementPercentage,
      metTargetCount: metTargetProducts.length,
      totalProductCount: totalProducts,
      fokusAchievementPercentage: fokusAchievementPercentage,
      nonFokusAchievementPercentage: nonFokusAchievementPercentage,
      fokusProductCount: fokusProducts.length,
      nonFokusProductCount: nonFokusProducts.length,
      weeklyData: cumulativeWeeklyData,
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
        if (coveragePercentage < 100) {
          underCount++;
        } else if (coveragePercentage >= 300) {
          overCount++;
        }
        // Note: Products with 100-299% coverage are considered "normal" and not counted in under/over
        
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

    const total = ofData.length;
    
    // Calculate percentages for each OF stage
    const turunPpiTrue = ofData.filter(item => item.TurunPPI === 1).length;
    const potongStockTrue = ofData.filter(item => item.PotongStock === 1).length;
    const prosesTrue = ofData.filter(item => item.Proses === 1).length;
    const kemasTrue = ofData.filter(item => item.Kemas === 1).length;
    const dokumenTrue = ofData.filter(item => item.Dok === 1).length;
    const qcTrue = ofData.filter(item => item.QC === 1).length;
    const qaTrue = ofData.filter(item => item.QA === 1).length;


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

  const processMaterialAvailabilityData = (stockData) => {
    // Mock material availability
    return {
      bahanBaku: 78,
      bahanKemas: 85,
      ota: 67
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
    
    stockData.forEach(item => {
      const productId = item.Product_ID;
      const period = parseInt(item.Periode);
      const sales = item.Sales || 0;
      const release = item.Release || 0;
      
      if (!productHistory[productId]) {
        productHistory[productId] = {};
      }
      productHistory[productId][period] = { sales, release };
    });
    
    const productIds = Object.keys(productHistory);
    const totalProducts = productIds.length;
    
    let deadStockCount = 0;
    let slowMovingCount = 0;
    
    productIds.forEach(productId => {
      const history = productHistory[productId];
      
      // Check for dead stock (0 sales for last 6 months AND stock available in earliest and current periods)
      const hasSalesInLast6Months = last6MonthsPeriods.some(period => 
        (history[period]?.sales || 0) > 0
      );
      
      // Check if stock was available in earliest (6 months ago) and current periods
      const earliestPeriod = last6MonthsPeriods[0]; // First period in the 6-month range
      const currentPeriod = last6MonthsPeriods[last6MonthsPeriods.length - 1]; // Last period (current)
      
      const hasStockInEarliestPeriod = (history[earliestPeriod]?.release || 0) > 0;
      const hasStockInCurrentPeriod = (history[currentPeriod]?.release || 0) > 0;
      
      const isDeadStock = !hasSalesInLast6Months && hasStockInEarliestPeriod && hasStockInCurrentPeriod;
      
      if (isDeadStock) {
        deadStockCount++;
      } else {
        // Only check for slow moving if not dead stock
        // Check for slow moving (0 sales for last 3 months AND stock available in earliest and current periods)
        const hasSalesInLast3Months = last3MonthsPeriods.some(period => 
          (history[period]?.sales || 0) > 0
        );
        
        // Check if stock was available in earliest (3 months ago) and current periods for slow moving
        const earliestPeriod3M = last3MonthsPeriods[0]; // First period in the 3-month range
        const currentPeriod3M = last3MonthsPeriods[last3MonthsPeriods.length - 1]; // Last period (current)
        
        const hasStockInEarliestPeriod3M = (history[earliestPeriod3M]?.release || 0) > 0;
        const hasStockInCurrentPeriod3M = (history[currentPeriod3M]?.release || 0) > 0;
        
        const isSlowMoving = !hasSalesInLast3Months && hasStockInEarliestPeriod3M && hasStockInCurrentPeriod3M;
        
        if (isSlowMoving) {
          slowMovingCount++;
        }
      }
    });
    
    const deadStockPercentage = totalProducts > 0 ? (deadStockCount / totalProducts) * 100 : 0;
    const slowMovingPercentage = totalProducts > 0 ? (slowMovingCount / totalProducts) * 100 : 0;
    
    // For return percentage, we'll use a mock calculation for now
    // as the return logic wasn't specified for OJ inventory
    const returnPercentage = 8; // Mock value
    
    const result = {
      slowMoving: Math.round(slowMovingPercentage),
      deadStock: Math.round(deadStockPercentage),
      return: returnPercentage
    };
    
    return result;
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
    
    // Calculate Dead Stock (null last_transaction_period)
    const deadStockItems = bbbkData.filter(item => 
      item.last_transaction_period === null || item.last_transaction_period === ''
    );
    
    // Calculate Slow Moving (last_transaction_period older than 3 months)
    const slowMovingItems = bbbkData.filter(item => {
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
    } else if (salesChartType === 'Yearly') {
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
        labels: ['W1', 'W2', 'W3', 'W4', 'W5'],
        datasets: [
          {
            label: 'Cumulative Sales Value',
            data: data.sales?.weeklyData || [],
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4
          },
          {
            label: 'Monthly Forecast',
            data: new Array(5).fill(data.sales?.monthlyForecast || 0),
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            fill: false,
            tension: 0,
            borderDash: [5, 5]
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
            } else if (salesChartType === 'Yearly') {
              return `${datasetLabel}: ${value}`;
            } else if (datasetLabel === 'Cumulative Sales Value') {
              // Calculate weekly sales value (difference from previous week)
              const weekIndex = context.dataIndex;
              const weeklyData = data.sales?.weeklyData || [];
              const currentWeekTotal = weeklyData[weekIndex] || 0;
              const previousWeekTotal = weekIndex > 0 ? (weeklyData[weekIndex - 1] || 0) : 0;
              const weeklySales = currentWeekTotal - previousWeekTotal;
              
              return [
                `Weekly Sales Value: ${formatNumber(weeklySales)}`,
                `Monthly Sales Value: ${value}`
              ];
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
                    <div className="sales-circle-label">Fokus</div>
                  </div>

                  {/* Chart section spanning 2x2 */}
                  <div className="sales-chart-section">
                    <div className="sales-chart-controls">
                      <div 
                        className="sales-chart-dropdown-trigger clickable" 
                        onClick={() => setSalesDropdownOpen(!salesDropdownOpen)}
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
                          {['Daily', 'Weekly', 'Yearly'].map((option) => (
                            <div
                              key={option}
                              className="dropdown-option"
                              onClick={() => {
                                setSalesChartType(option);
                                setSalesDropdownOpen(false);
                              }}
                              style={{
                                padding: '8px 12px',
                                fontSize: '12px',
                                color: salesChartType === option ? '#3b82f6' : '#374151',
                                backgroundColor: salesChartType === option ? '#eff6ff' : 'white',
                                cursor: 'pointer',
                                borderBottom: option !== 'Yearly' ? '1px solid #e5e7eb' : 'none',
                                fontWeight: salesChartType === option ? 'bold' : 'normal',
                                borderRadius: option === 'Daily' ? '6px 6px 0 0' : option === 'Yearly' ? '0 0 6px 6px' : '0'
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
                      <Line data={salesLineData} options={salesLineOptions} />
                    </div>
                  </div>

                  {/* Daily Sales Value */}
                  <div 
                    className="sales-daily-value-item clickable" 
                    onClick={handleSalesClick}
                    title="Click to view forecast details"
                  >
                    <div className="sales-daily-content">
                      <div className="sales-circle-label">Daily Sales</div>
                      <div className="sales-value-extra-large">{formatNumber(data.sales?.dailySales || 0)}</div>
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
                    <div className="sales-circle-label">Non Fokus</div>
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

            {/* Material Availability */}
            <KPICard title="MATERIAL AVAILABILITY" className="material-availability-card">
              <div className="material-availability-content">
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanBaku || 0} 
                    color="#10b981"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Baku</div>
                </div>
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanKemas || 0} 
                    color="#f59e0b"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Kemas</div>
                </div>
              </div>
            </KPICard>

            {/* OTA */}
            <KPICard title="OTA" className="ota-card">
              <div className="ota-content">
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanBaku || 0} 
                    color="#10b981"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Baku</div>
                </div>
                <div className="material-info-card">
                  <CircularProgress 
                    percentage={data.materialAvailability?.bahanKemas || 0} 
                    color="#f59e0b"
                    size={60}
                  />
                  <div className="material-info-label">Bahan Kemas</div>
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

            {/* Coverage Stock FG */}
            <KPICard title="COVERAGE STOCK FG" className="coverage-card">
              <div className="coverage-content">
                <div className="coverage-main">
                  <CircularProgress 
                    percentage={data.coverage?.percentage || 0} 
                    color="#1f2937"
                    size={90}
                    onClick={handleCoverageClick}
                    title="Click to view coverage details"
                  />
                </div>
                <div className="coverage-info-cards">
                  <div className="coverage-info-card" onClick={handleCoverageClick} style={{ cursor: 'pointer' }} title="Click to view coverage details">
                    <div className="coverage-info-value">{data.coverage?.under || 0}</div>
                    <div className="coverage-info-label">SKU Under</div>
                  </div>
                  <div className="coverage-info-card" onClick={handleCoverageClick} style={{ cursor: 'pointer' }} title="Click to view coverage details">
                    <div className="coverage-info-value">{data.coverage?.over || 0}</div>
                    <div className="coverage-info-label">SKU Over</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* WH Occupancy */}
            <KPICard title="WH OCCUPANCY" className="wh-occupancy-card">
              <div className="wh-occupancy-content">
                <div className="wh-occupancy-top">
                  <div className="wh-item">
                    <CircularProgress 
                      percentage={data.whOccupancy?.oj || 0} 
                      color="#f59e0b"
                      size={60}
                    />
                    <div className="wh-label">OJ</div>
                  </div>
                  <div className="wh-item">
                    <CircularProgress 
                      percentage={data.whOccupancy?.bb || 0} 
                      color="#10b981"
                      size={60}
                    />
                    <div className="wh-label">BB</div>
                  </div>
                  <div className="wh-item">
                    <CircularProgress 
                      percentage={data.whOccupancy?.bk || 0} 
                      color="#6b7280"
                      size={60}
                    />
                    <div className="wh-label">BK</div>
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

            {/* Inventory OJ */}
            <KPICard title="INVENTORY OJ" className="inventory-oj-card">
              <div className="inventory-oj-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.slowMoving || 0} 
                      color="#f59e0b"
                      size={60}
                      onClick={handleInventoryOJClick}
                      title="Click to view slow moving products"
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.deadStock || 0} 
                      color="#ef4444"
                      size={60}
                      onClick={handleInventoryOJClick}
                      title="Click to view dead stock products"
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryOJ?.return || 0} 
                      color="#8b5cf6"
                      size={60}
                    />
                    <div className="inventory-label">Return</div>
                  </div>
                </div>
              </div>
            </KPICard>

            {/* Inventory BB-BK */}
            <KPICard title="INVENTORY BB-BK" className="inventory-bb-bk-card">
              <div className="inventory-bb-bk-content">
                <div className="inventory-grid">
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBBBK?.slowMoving || 0} 
                      color="#f59e0b"
                      size={60}
                      onClick={handleInventoryBBBKClick}
                      title="Click to view slow moving items"
                    />
                    <div className="inventory-label">Slow Moving</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBBBK?.deadStock || 0} 
                      color="#ef4444"
                      size={60}
                      onClick={handleInventoryBBBKClick}
                      title="Click to view dead stock items"
                    />
                    <div className="inventory-label">Dead Stock</div>
                  </div>
                  <div className="inventory-item">
                    <CircularProgress 
                      percentage={data.inventoryBBBK?.return || 0} 
                      color="#8b5cf6"
                      size={60}
                    />
                    <div className="inventory-label">Return</div>
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
        
        {/* Coverage Details Modal */}
        <CoverageDetailsModal 
          isOpen={coverageModalOpen}
          onClose={() => setCoverageModalOpen(false)}
          forecastData={forecastRawData}
        />
        
        {/* Sales Target Details Modal */}
        <SalesTargetDetailsModal 
          isOpen={salesTargetModalOpen}
          onClose={() => setSalesTargetModalOpen(false)}
          forecastData={forecastRawData}
          modalTitle={salesTargetModalConfig.title}
          productGroupFilter={salesTargetModalConfig.productGroupFilter}
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
      </main>
    </div>
  );
}

export default SummaryDashboard;
