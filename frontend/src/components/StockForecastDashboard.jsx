import React, { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { apiUrl } from '../api';
import Sidebar from './Sidebar';
import Modal from './Modal';
import DashboardLoading from './DashboardLoading';
import * as XLSX from 'xlsx';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, ArcElement);

// Helper to format numbers with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

// Helper to format currency with Rp prefix and short notation
function formatCurrency(num) {
  if (num === null || num === undefined || num === 0) return 'Rp 0';
  
  const absNum = Math.abs(num);
  if (absNum >= 1e12) {
    return `Rp ${(num / 1e12).toFixed(1)} T`;
  } else if (absNum >= 1e9) {
    return `Rp ${(num / 1e9).toFixed(1)} B`;
  } else if (absNum >= 1e6) {
    return `Rp ${(num / 1e6).toFixed(1)} M`;
  } else if (absNum >= 1e3) {
    return `Rp ${(num / 1e3).toFixed(1)} K`;
  } else {
    return `Rp ${formatNumber(num)}`;
  }
}

// Helper to format units with unit suffix
function formatUnits(num) {
  if (num === null || num === undefined) return '0 unit';
  return `${formatNumber(num)} unit`;
}

// Helper to convert period (202502) to readable month
function formatPeriod(periode) {
  if (!periode || periode.length !== 6) return periode;
  const year = periode.substring(0, 4);
  const month = periode.substring(4, 6);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}

// InfoCard component for the 4 info cards at the top
function InfoCard({ title, value, icon, change, changeType }) {
  return (
    <div className="modular-info-card">
      <div className="info-card-header">
        <div className="info-card-icon">{icon}</div>
        <div className="info-card-value">{value}</div>
      </div>
      <div className="info-card-title">{title}</div>
      {change && (
        <div className={`info-card-change ${changeType}`}>
          {change}
        </div>
      )}
    </div>
  );
}

// TableCard component for displaying data in a modern table
function TableCard({ title, columns, data, loading, error, onProductClick, selectedProduct, viewMode, selectedMonth, rawData }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [localViewMode, setLocalViewMode] = useState(viewMode || 'year');
  const [localSelectedMonth, setLocalSelectedMonth] = useState(selectedMonth || '01');
  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  // Process data based on view mode
  const processedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return data || [];

    if (localViewMode === 'month') {
      // Filter data by selected month and year (2025)
      const targetPeriod = `2025${localSelectedMonth}`;
      const filteredRawData = rawData.filter(item => item.Periode === targetPeriod);
      
      // Group by product ID for the specific month
      const productMap = {};
      filteredRawData.forEach(item => {
        const key = item.Product_ID;
        if (!productMap[key]) {
          productMap[key] = {
            Product_ID: item.Product_ID,
            Product_NM: item.Product_NM,
            totalForecast: 0,
            totalStock: 0,
            totalSales: 0,
            totalProduksi: 0
          };
        }
        
        productMap[key].totalForecast += Number(item.Forecast) || 0;
        productMap[key].totalStock += Number(item.Release) || 0;
        productMap[key].totalSales += Number(item.Sales) || 0;
        productMap[key].totalProduksi += Number(item.Produksi) || 0;
      });

      return Object.values(productMap);
    } else {
      // Year mode - use the already processed data but update stock to latest
      return (data || []).map(item => ({
        ...item,
        totalStock: item.latestStock || item.totalStock // Use latest stock for year mode
      }));
    }
  }, [data, rawData, localViewMode, localSelectedMonth]);

  // Export to Excel handler
  const exportToExcel = () => {
    if (!processedData || !columns || processedData.length === 0) return;
    const exportData = processedData.map(row => {
      const obj = {};
      columns.forEach(col => {
        obj[col.label] = row[col.key];
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    XLSX.writeFile(workbook, `${title.replace(/\s+/g, '_') || 'table'}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Filter and sort data
  const filteredData = useMemo(() => {
    if (!searchTerm) return processedData;
    const lower = searchTerm.toLowerCase();
    return processedData.filter(row =>
      columns.some(col =>
        String(row[col.key] ?? "").toLowerCase().includes(lower)
      )
    );
  }, [processedData, columns, searchTerm]);

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span style={{ color: '#9ca3af', fontSize: '12px' }}>⇅</span>;
    }
    return sortConfig.direction === 'asc' 
      ? <span style={{ color: '#4f8cff', fontSize: '12px' }}>↑</span>
      : <span style={{ color: '#4f8cff', fontSize: '12px' }}>↓</span>;
  };

  return (
    <div className="modular-table-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="table-card-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '20px 20px 16px 20px',
        borderBottom: '1px solid #f0f2f5',
        position: 'sticky',
        top: 0,
        backgroundColor: 'white',
        zIndex: 20
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>{title}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setLocalViewMode('year')}
              style={{
                padding: '6px 12px',
                backgroundColor: localViewMode === 'year' ? '#4f8cff' : '#f8f9fa',
                color: localViewMode === 'year' ? 'white' : '#6c757d',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              Year
            </button>
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => {
                  setLocalViewMode('month');
                  setMonthDropdownOpen(!monthDropdownOpen);
                }}
                style={{
                  padding: '6px 12px',
                  backgroundColor: localViewMode === 'month' ? '#4f8cff' : '#f8f9fa',
                  color: localViewMode === 'month' ? 'white' : '#6c757d',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                Month {localViewMode === 'month' && `(${months.find(m => m.value === localSelectedMonth)?.label})`}
                <span style={{ fontSize: '10px' }}>▼</span>
              </button>
              {monthDropdownOpen && localViewMode === 'month' && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  backgroundColor: 'white',
                  border: '1px solid #e9ecef',
                  borderRadius: '4px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                  zIndex: 1000,
                  minWidth: '120px',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {months.map(month => (
                    <div
                      key={month.value}
                      onClick={() => {
                        setLocalSelectedMonth(month.value);
                        setMonthDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        backgroundColor: localSelectedMonth === month.value ? '#f0f4ff' : 'transparent',
                        color: localSelectedMonth === month.value ? '#4f8cff' : '#374151',
                        borderLeft: localSelectedMonth === month.value ? '3px solid #4f8cff' : '3px solid transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (localSelectedMonth !== month.value) {
                          e.target.style.backgroundColor = '#f8f9fa';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (localSelectedMonth !== month.value) {
                          e.target.style.backgroundColor = 'transparent';
                        }
                      }}
                    >
                      {month.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="table-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button onClick={exportToExcel} className="export-btn">
            Export Excel
          </button>
        </div>
      </div>
      <div className="table-card-body" style={{ flex: 1, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ position: 'relative', height: '280px' }}>
            <DashboardLoading 
              loading={true} 
              text="Loading table data..." 
              subtext="Processing product information..." 
            />
          </div>
        ) : error ? (
          <div className="error-state">
            <p>Error: {error}</p>
            <button 
              className="retry-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="table-wrapper" style={{ maxHeight: '280px', overflowY: 'auto', margin: '0' }}>
            <table className="modern-table">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 10 }}>
                <tr>
                  {columns.map((col) => (
                    <th 
                      key={col.key}
                      className="sortable-header"
                      onClick={() => handleSort(col.key)}
                    >
                      <div className="header-content">
                        <span>{col.label}</span>
                        <span className="sort-icon">{getSortIcon(col.key)}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedData && sortedData.length > 0 ? (
                  sortedData.map((row, i) => (
                    <tr 
                      key={i}
                      className={`table-row ${selectedProduct && selectedProduct.Product_ID === row.Product_ID ? 'selected' : ''}`}
                      onClick={() => onProductClick && onProductClick(row)}
                      style={{ cursor: onProductClick ? 'pointer' : 'default' }}
                    >
                      {columns.map((col) => (
                        <td key={col.key}>
                          {col.key.includes('total') && row[col.key] !== undefined && row[col.key] !== null
                            ? formatNumber(row[col.key])
                            : row[col.key] || '-'
                          }
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="no-data">
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StockForecastDashboard() {
  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [chartModalOpen, setChartModalOpen] = useState(false);
  const [selectedChartType, setSelectedChartType] = useState('monthlyValue');
  const [smallChartModalOpen, setSmallChartModalOpen] = useState(false);
  const [selectedSmallChart, setSelectedSmallChart] = useState('topSales');

  // Chart options for main chart modal
  const chartOptions = [
    { id: 'monthly', title: 'Monthly Overview', desc: 'Monthly unit data for all products or selected product' },
    { id: 'monthlyValue', title: 'Monthly Value', desc: 'Monthly value data (Rp) for all products or selected product' }
  ];

  // Chart options for small chart modal
  const smallChartOptions = [
    { id: 'topSales', title: 'Top Sales Value', desc: 'Top 10 products with highest sales value' },
    { id: 'slowMoving', title: 'Slow Moving Products', desc: 'Top 10 products with lowest sales value' },
    { id: 'lowStock', title: 'Low Stock Value', desc: 'Top 10 products with lowest stock value' }
  ];

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(apiUrl('/api/forecast'));
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        setData(result.data || result || []);
      } catch (err) {
        console.error('Error fetching forecast data:', err);
        setError(`Failed to load data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate statistics for info cards
  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      return {
        totalProducts: 0,
        totalForecastValue: 0,
        totalStockValue: 0,
        totalSalesValue: 0,
        totalProduksi: 0,
        forecastAccuracy: 0
      };
    }

    // Get current date to determine the latest valid period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    const currentPeriod = `${currentYear}${currentMonth.toString().padStart(2, '0')}`;

    // Group by product to get unique products
    const productMap = {};
    data.forEach(item => {
      const key = item.Product_ID;
      if (!productMap[key]) {
        productMap[key] = {
          Product_ID: item.Product_ID,
          Product_NM: item.Product_NM,
          totalForecast: 0,
          totalStock: 0,
          totalSales: 0,
          totalProduksi: 0,
          latestStock: 0,
          latestPeriod: '',
          hna: item.HNA || 0 // Store HNA price
        };
      }
      productMap[key].totalForecast += Number(item.Forecast) || 0;
      productMap[key].totalSales += Number(item.Sales) || 0;
      productMap[key].totalProduksi += Number(item.Produksi) || 0;
      
      // Update HNA if newer data has it
      if (item.HNA) {
        productMap[key].hna = item.HNA;
      }
      
      // For stock, track the latest period up to current month with actual stock data
      const itemPeriod = item.Periode;
      const stockValue = Number(item.Release) || 0;
      
      // Only consider periods up to current month and with actual stock data
      if (itemPeriod <= currentPeriod && stockValue > 0) {
        if (!productMap[key].latestPeriod || itemPeriod > productMap[key].latestPeriod) {
          productMap[key].latestPeriod = itemPeriod;
          productMap[key].latestStock = stockValue;
        }
      }
      
      // If no stock found yet, try to find the most recent period with any data (even 0)
      if (productMap[key].latestStock === 0 && itemPeriod <= currentPeriod) {
        if (!productMap[key].latestPeriod || itemPeriod > productMap[key].latestPeriod) {
          productMap[key].latestPeriod = itemPeriod;
          productMap[key].latestStock = stockValue;
        }
      }
      
      // Also keep cumulative stock for backward compatibility
      productMap[key].totalStock += Number(item.Release) || 0;
    });

    const products = Object.values(productMap);
    const totalProducts = products.length;
    
    // Calculate values using HNA prices
    const totalForecastValue = products.reduce((sum, p) => sum + (p.totalForecast * p.hna), 0);
    const totalStockValue = products.reduce((sum, p) => sum + (p.latestStock * p.hna), 0); // Use latest stock instead of cumulative
    const totalSalesValue = products.reduce((sum, p) => sum + (p.totalSales * p.hna), 0);
    const totalProduksi = products.reduce((sum, p) => sum + p.totalProduksi, 0); // Keep as units
    
    // Calculate forecast accuracy (simplified) - using values instead of units
    const forecastAccuracy = totalForecastValue > 0 ? Math.round((totalSalesValue / totalForecastValue) * 100) : 0;

    return {
      totalProducts,
      totalForecastValue,
      totalStockValue,
      totalSalesValue,
      totalProduksi,
      forecastAccuracy
    };
  };

  const stats = calculateStats(data);

  // Process data for small chart
  const getSmallChartData = () => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    // Get current date to determine the latest valid period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    const currentPeriod = `${currentYear}${currentMonth.toString().padStart(2, '0')}`;

    // Group by product ID and aggregate totals
    const productMap = {};
    data.forEach(item => {
      const key = item.Product_ID;
      if (!productMap[key]) {
        productMap[key] = {
          Product_ID: item.Product_ID,
          Product_NM: item.Product_NM,
          totalSales: 0,
          totalSalesValue: 0,
          totalStock: 0,
          totalStockValue: 0,
          latestStock: 0,
          latestStockValue: 0,
          latestPeriod: '',
          hna: item.HNA || 0
        };
      }
      
      const hna = item.HNA || 0;
      const sales = Number(item.Sales) || 0;
      const stockValue = Number(item.Release) || 0;
      
      productMap[key].totalSales += sales;
      productMap[key].totalSalesValue += sales * hna;
      productMap[key].hna = hna; // Update HNA if available
      
      // For latest stock, use the same logic as other functions
      const itemPeriod = item.Periode;
      
      // Only consider periods up to current month and with actual stock data
      if (itemPeriod <= currentPeriod && stockValue > 0) {
        if (!productMap[key].latestPeriod || itemPeriod > productMap[key].latestPeriod) {
          productMap[key].latestPeriod = itemPeriod;
          productMap[key].latestStock = stockValue;
          productMap[key].latestStockValue = stockValue * hna;
        }
      }
      
      // If no stock found yet, try to find the most recent period with any data (even 0)
      if (productMap[key].latestStock === 0 && itemPeriod <= currentPeriod) {
        if (!productMap[key].latestPeriod || itemPeriod > productMap[key].latestPeriod) {
          productMap[key].latestPeriod = itemPeriod;
          productMap[key].latestStock = stockValue;
          productMap[key].latestStockValue = stockValue * hna;
        }
      }
      
      // Keep cumulative stock for backward compatibility
      productMap[key].totalStock += stockValue;
    });

    const products = Object.values(productMap);

    let sortedProducts = [];
    let chartTitle = '';
    let dataKey = '';
    let colors = [];

    switch (selectedSmallChart) {
      case 'topSales':
        sortedProducts = products
          .sort((a, b) => b.totalSalesValue - a.totalSalesValue)
          .slice(0, 10);
        chartTitle = 'Sales Value';
        dataKey = 'totalSalesValue';
        colors = ['#4f8cff', '#3b82f6', '#2563eb', '#1d4ed8', '#1e40af', '#1e3a8a', '#1e3a8a', '#312e81', '#312e81', '#312e81'];
        break;
      case 'slowMoving':
        sortedProducts = products
          .filter(p => p.totalSalesValue > 0)
          .sort((a, b) => a.totalSalesValue - b.totalSalesValue)
          .slice(0, 10);
        chartTitle = 'Sales Value (Slow Moving)';
        dataKey = 'totalSalesValue';
        colors = ['#ef4444', '#dc2626', '#b91c1c', '#991b1b', '#7f1d1d', '#7f1d1d', '#7f1d1d', '#7f1d1d', '#7f1d1d', '#7f1d1d'];
        break;
      case 'lowStock':
        sortedProducts = products
          .filter(p => p.latestStockValue > 0)
          .sort((a, b) => a.latestStockValue - b.latestStockValue)
          .slice(0, 10);
        chartTitle = 'Stock Value (Low Stock)';
        dataKey = 'latestStockValue';
        colors = ['#f59e0b', '#d97706', '#b45309', '#92400e', '#78350f', '#78350f', '#78350f', '#78350f', '#78350f', '#78350f'];
        break;
      default:
        return { labels: [], datasets: [] };
    }

    const labels = sortedProducts.map(product => {
      const name = product.Product_ID || 'Unknown';
      return name.length > 8 ? name.substring(0, 8) + '...' : name;
    });

    const values = sortedProducts.map(product => product[dataKey]);

    return {
      labels,
      datasets: [{
        label: chartTitle,
        data: values,
        backgroundColor: colors.slice(0, values.length),
        borderColor: colors.slice(0, values.length),
        borderWidth: 1,
        // Store additional data for tooltips
        productNames: sortedProducts.map(product => product.Product_NM || 'Unknown Product'),
        productUnits: sortedProducts.map(product => {
          switch (selectedSmallChart) {
            case 'topSales':
            case 'slowMoving':
              return product.totalSales;
            case 'lowStock':
              return product.latestStock;
            default:
              return 0;
          }
        }),
        productHNA: sortedProducts.map(product => product.hna || 0)
      }]
    };
  };

  const getSmallChartTitle = () => {
    const option = smallChartOptions.find(opt => opt.id === selectedSmallChart);
    return option ? option.title : 'Chart';
  };

  const getSmallChartSubtitle = () => {
    const option = smallChartOptions.find(opt => opt.id === selectedSmallChart);
    return option ? option.desc : '';
  };

  // Bar chart options for small chart
  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: function(context) {
            // Show product name instead of code in tooltip title
            const datasetIndex = context[0].datasetIndex;
            const dataIndex = context[0].dataIndex;
            const dataset = getSmallChartData().datasets[datasetIndex];
            return dataset.productNames ? dataset.productNames[dataIndex] : context[0].label;
          },
          label: function(context) {
            const datasetIndex = context.datasetIndex;
            const dataIndex = context.dataIndex;
            const dataset = getSmallChartData().datasets[datasetIndex];
            
            if (dataset.productHNA && dataset.productUnits) {
              const hna = dataset.productHNA[dataIndex];
              const units = dataset.productUnits[dataIndex];
              const totalValue = context.parsed.y;
              
              return [
                `${formatCurrency(hna)}, ${formatNumber(units)} unit`,
                `Total: ${formatCurrency(totalValue)}`
              ];
            } else {
              // Fallback to original format
              const datasetLabel = context.dataset.label;
              if (datasetLabel.includes('Value')) {
                return `${datasetLabel}: ${formatCurrency(context.parsed.y)}`;
              } else {
                return `${datasetLabel}: ${formatNumber(context.parsed.y)}`;
              }
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            // Check if current chart is showing values (currency) or units
            const chartTitle = getSmallChartTitle();
            if (chartTitle.includes('Sales') || chartTitle.includes('Stock')) {
              return formatCurrency(value);
            } else {
              return formatNumber(value);
            }
          },
          font: {
            size: 10
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            size: 10
          }
        }
      }
    }
  };

  // Process data for monthly chart (all products or specific product)
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    // Filter data based on selected product
    const filteredData = selectedProduct 
      ? data.filter(item => item.Product_ID === selectedProduct.Product_ID)
      : data;

    // Get all unique periods and sort them
    const periods = [...new Set(filteredData.map(item => item.Periode))].sort();
    
    // Create monthly aggregates
    const monthlyData = periods.map(period => {
      const periodData = filteredData.filter(item => item.Periode === period);
      
      if (selectedChartType === 'monthlyValue') {
        // Calculate values using HNA prices
        return {
          period,
          forecast: periodData.reduce((sum, item) => sum + ((Number(item.Forecast) || 0) * (item.HNA || 0)), 0),
          stock: periodData.reduce((sum, item) => sum + ((Number(item.Release) || 0) * (item.HNA || 0)), 0),
          sales: periodData.reduce((sum, item) => sum + ((Number(item.Sales) || 0) * (item.HNA || 0)), 0),
          produksi: periodData.reduce((sum, item) => sum + ((Number(item.Produksi) || 0) * (item.HNA || 0)), 0)
        };
      } else {
        // Calculate units (original logic)
        return {
          period,
          forecast: periodData.reduce((sum, item) => sum + (Number(item.Forecast) || 0), 0),
          stock: periodData.reduce((sum, item) => sum + (Number(item.Release) || 0), 0),
          sales: periodData.reduce((sum, item) => sum + (Number(item.Sales) || 0), 0),
          produksi: periodData.reduce((sum, item) => sum + (Number(item.Produksi) || 0), 0)
        };
      }
    });

    // Generate all months from Jan to Dec 2025
    const allMonths = [];
    for (let i = 1; i <= 12; i++) {
      const monthPeriod = `2025${i.toString().padStart(2, '0')}`;
      allMonths.push(monthPeriod);
    }

    // Map data to all months (fill with 0 for missing months)
    const forecastValues = allMonths.map(month => {
      const found = monthlyData.find(item => item.period === month);
      return found ? found.forecast : 0;
    });

    const stockValues = allMonths.map(month => {
      const found = monthlyData.find(item => item.period === month);
      return found ? found.stock : 0;
    });

    const salesValues = allMonths.map(month => {
      const found = monthlyData.find(item => item.period === month);
      return found ? found.sales : 0;
    });

    const produksiValues = allMonths.map(month => {
      const found = monthlyData.find(item => item.period === month);
      return found ? found.produksi : 0;
    });

    return {
      labels: allMonths.map(formatPeriod),
      datasets: [
        {
          label: 'Forecast',
          data: forecastValues,
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79, 140, 255, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Produksi',
          data: produksiValues,
          borderColor: '#ff6b6b',
          backgroundColor: 'rgba(255, 107, 107, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Stock (Release)',
          data: stockValues,
          borderColor: '#28a745',
          backgroundColor: 'rgba(40, 167, 69, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        },
        {
          label: 'Sales',
          data: salesValues,
          borderColor: '#ffc107',
          backgroundColor: 'rgba(255, 193, 7, 0.1)',
          borderWidth: 3,
          fill: false,
          tension: 0.4
        }
      ]
    };
  }, [data, selectedProduct, selectedChartType]);

  // Process data for product table
  const tableData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Get current date to determine the latest valid period
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // getMonth() returns 0-11
    const currentPeriod = `${currentYear}${currentMonth.toString().padStart(2, '0')}`;

    // Group by product ID and aggregate totals
    const productMap = {};
    
    data.forEach(item => {
      const key = item.Product_ID;
      if (!productMap[key]) {
        productMap[key] = {
          Product_ID: item.Product_ID,
          Product_NM: item.Product_NM,
          totalForecast: 0,
          totalStock: 0,
          totalSales: 0,
          totalProduksi: 0,
          latestStock: 0,
          latestPeriod: ''
        };
      }
      
      productMap[key].totalForecast += Number(item.Forecast) || 0;
      productMap[key].totalSales += Number(item.Sales) || 0;
      productMap[key].totalProduksi += Number(item.Produksi) || 0;
      
      // For stock, track the latest period up to current month with actual stock data
      const itemPeriod = item.Periode;
      const stockValue = Number(item.Release) || 0;
      
      // Only consider periods up to current month and with actual stock data
      if (itemPeriod <= currentPeriod && stockValue > 0) {
        if (!productMap[key].latestPeriod || itemPeriod > productMap[key].latestPeriod) {
          productMap[key].latestPeriod = itemPeriod;
          productMap[key].latestStock = stockValue;
        }
      }
      
      // If no stock found yet, try to find the most recent period with any data (even 0)
      if (productMap[key].latestStock === 0 && itemPeriod <= currentPeriod) {
        if (!productMap[key].latestPeriod || itemPeriod > productMap[key].latestPeriod) {
          productMap[key].latestPeriod = itemPeriod;
          productMap[key].latestStock = stockValue;
        }
      }
      
      // Also keep cumulative stock for backward compatibility
      productMap[key].totalStock += Number(item.Release) || 0;
    });

    return Object.values(productMap);
  }, [data]);

  // Handle product selection
  const handleProductClick = (product) => {
    if (selectedProduct && selectedProduct.Product_ID === product.Product_ID) {
      setSelectedProduct(null);
    } else {
      setSelectedProduct(product);
    }
  };

  // Table columns definition
  const tableColumns = [
    { key: 'Product_ID', label: 'Product ID' },
    { key: 'Product_NM', label: 'Product Name' },
    { key: 'totalForecast', label: 'Total Forecast' },
    { key: 'totalProduksi', label: 'Total Produksi' },
    { key: 'totalStock', label: 'Total Stock' },
    { key: 'totalSales', label: 'Total Sales' }
  ];

  // Chart options for Chart.js
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: '#4f8cff',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            if (selectedChartType === 'monthlyValue') {
              return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            } else {
              return `${context.dataset.label}: ${formatNumber(context.parsed.y)}`;
            }
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            if (selectedChartType === 'monthlyValue') {
              return formatCurrency(value);
            } else {
              return formatNumber(value);
            }
          }
        }
      },
      x: {
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area modular-main">
          <DashboardLoading 
            loading={true} 
            text="Loading Stock & Forecast Dashboard..." 
            subtext="Sedang menarik data forecast dan stok dari server..." 
            coverContentArea={true}
          />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area modular-main">
          <div className="error-state">
            <h3>Error Loading Data</h3>
            <p>{error}</p>
            <button 
              className="retry-btn"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area">
        <div className="modular-report-container">
          {/* Header */}
          <div className="modular-report-header">
            <div className="modular-report-breadcrumb">
              Stock & Forecast Dashboard
            </div>
          </div>

          {/* Info Cards Row */}
          <div className="modular-info-cards-row">
            <InfoCard
              title="Total Sales Value"
              value={formatCurrency(stats.totalSalesValue)}
              icon="💰"
              change={`Cumulative Sales Value`}
              changeType="positive"
            />
            <InfoCard
              title="Total Produksi"
              value={formatUnits(stats.totalProduksi)}
              icon="🏭"
              change={`Production Output`}
              changeType="positive"
            />
            <InfoCard
              title="Current Stock Value"
              value={formatCurrency(stats.totalStockValue)}
              icon="📦"
              change={`Latest Month Stock Value`}
              changeType="neutral"
            />
            <InfoCard
              title="Forecast Accuracy"
              value={`${stats.forecastAccuracy}%`}
              icon="🎯"
              change={`Sales vs Forecast Value`}
              changeType={stats.forecastAccuracy >= 80 ? "positive" : stats.forecastAccuracy >= 60 ? "neutral" : "negative"}
            />
          </div>

          {/* Charts Row - Large chart on right, small chart on left */}
          <div className="modular-charts-row">
            <div className="modular-small-card">
              <div className="chart-card-header">
                <h3 
                  style={{ cursor: 'pointer', color: '#4f8cff', userSelect: 'none', margin: '0 0 0.25rem 0' }}
                  onClick={() => setSmallChartModalOpen(true)}
                  title="Click to change chart type"
                >
                  {getSmallChartTitle()} <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
                </h3>
                <span className="chart-subtitle">{getSmallChartSubtitle()}</span>
              </div>
              <div className="chart-container small-chart">
                <Bar data={getSmallChartData()} options={barChartOptions} />
              </div>
            </div>
            <div className="modular-big-graph-card">
              <div className="chart-card-header">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                  <div>
                    <h3 
                      style={{ cursor: 'pointer', color: '#4f8cff', userSelect: 'none', margin: '0 0 0.25rem 0' }}
                      onClick={() => setChartModalOpen(true)}
                      title="Click to change chart type"
                    >
                      {selectedProduct 
                        ? `${selectedChartType === 'monthlyValue' ? 'Monthly Value' : 'Monthly Overview'} - ${selectedProduct.Product_NM}`
                        : `${selectedChartType === 'monthlyValue' ? 'Monthly Value' : 'Monthly Overview'} - All Products`
                      } <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
                    </h3>
                    <span className="chart-subtitle">
                      {selectedProduct 
                        ? `Product-specific ${selectedChartType === 'monthlyValue' ? 'value' : 'unit'} trends`
                        : `Aggregated monthly ${selectedChartType === 'monthlyValue' ? 'value' : 'unit'} data across all products`
                      }
                    </span>
                  </div>
                  {selectedProduct && (
                    <button
                      onClick={() => setSelectedProduct(null)}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flexShrink: 0,
                        marginLeft: '10px'
                      }}
                    >
                      Show All Products
                    </button>
                  )}
                </div>
              </div>
              <div className="chart-container big-chart">
                <Line data={chartData} options={lineChartOptions} />
              </div>
            </div>
          </div>

          {/* Modal for main chart options */}
          <Modal open={chartModalOpen} onClose={() => setChartModalOpen(false)} title="Chart Options">
            <div className="modal-list">
              {chartOptions.map((option, i) => (
                <div 
                  className="modal-list-item" 
                  key={i} 
                  tabIndex={0} 
                  role="button"
                  onClick={() => {
                    setSelectedChartType(option.id);
                    setChartModalOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedChartType(option.id);
                      setChartModalOpen(false);
                    }
                  }}
                  style={{ 
                    backgroundColor: selectedChartType === option.id ? '#f0f4ff' : 'transparent',
                    borderLeft: selectedChartType === option.id ? '3px solid #4f8cff' : '3px solid transparent'
                  }}
                >
                  <div className="modal-list-item-title">{option.title}</div>
                  <div className="modal-list-item-desc">{option.desc}</div>
                </div>
              ))}
            </div>
          </Modal>

          {/* Modal for small chart options */}
          <Modal open={smallChartModalOpen} onClose={() => setSmallChartModalOpen(false)} title="Select Chart Type">
            <div className="modal-list">
              {smallChartOptions.map((option, i) => (
                <div 
                  className="modal-list-item" 
                  key={i} 
                  tabIndex={0} 
                  role="button"
                  onClick={() => {
                    setSelectedSmallChart(option.id);
                    setSmallChartModalOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedSmallChart(option.id);
                      setSmallChartModalOpen(false);
                    }
                  }}
                  style={{ 
                    backgroundColor: selectedSmallChart === option.id ? '#f0f4ff' : 'transparent',
                    borderLeft: selectedSmallChart === option.id ? '3px solid #4f8cff' : '3px solid transparent'
                  }}
                >
                  <div className="modal-list-item-title">{option.title}</div>
                  <div className="modal-list-item-desc">{option.desc}</div>
                </div>
              ))}
            </div>
          </Modal>

          {/* Table Row */}
          <div className="modular-table-row" style={{ paddingTop: '20px' }}>
            <TableCard
              title="Product Summary"
              columns={tableColumns}
              data={tableData}
              rawData={data}
              loading={loading}
              error={error}
              onProductClick={handleProductClick}
              selectedProduct={selectedProduct}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default StockForecastDashboard;
