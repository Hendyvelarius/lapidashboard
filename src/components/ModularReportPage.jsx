import React, { useEffect, useState, useMemo } from "react";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import Sidebar from "./Sidebar";
import "../App.css";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// InfoCard component for the 4 info cards at the top
function InfoCard({ title, value, icon, change, changeType }) {
  const getChangeIcon = () => {
    if (changeType === 'neutral') return ''; // No icon for neutral
    // Remove arrows for negative and positive, just keep the color
    return '';
  };

  return (
    <div className="modular-info-card">
      <div className="info-card-header">
        <div className="info-card-icon">{icon}</div>
        <div className="info-card-value">{value}</div>
      </div>
      <div className="info-card-title">{title}</div>
      {change && (
        <div className={`info-card-change ${changeType}`}>
          {getChangeIcon()}{change}
        </div>
      )}
    </div>
  );
}

// TableCard component for displaying data in a modern table
function TableCard({ title, columns, data, loading, error }) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle numeric values
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string values
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    
    return sorted;
  }, [data, sortConfig]);

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };
  return (
    <div className="modular-table-card">
      <div className="modular-table-header">
        <h3 className="modular-table-title">{title}</h3>
        <div className="modular-table-actions">
          <button className="table-filter-btn">Filter</button>
          <button className="table-export-btn">Export</button>
        </div>
      </div>
      <div className="modular-table-content">
        {loading ? (
          <div className="table-loading">
            <div className="loading-spinner"></div>
            <span>Loading data...</span>
          </div>
        ) : error ? (
          <div className="table-error">
            <div className="error-icon">⚠️</div>
            <div className="error-content">
              <strong>Data Loading Issue</strong>
              <p>{error}</p>
              <button 
                className="retry-btn"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  // Trigger re-fetch by updating a state
                  window.location.reload();
                }}
              >
                Retry
              </button>
            </div>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="modern-table">
              <thead>
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
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col.key}>{row[col.key] || '-'}</td>
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

// Main ModularReportPage component
export default function ModularReportPage({ title, apiEndpoint, tableColumns, dataMapper }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Calculate PCT statistics for info cards
  const calculatePCTStats = (data) => {
    if (!data || data.length === 0) {
      return {
        averagePCT: 0,
        slowestCategory: { name: '-', avgPCT: 0 },
        fastestCategory: { name: '-', avgPCT: 0 },
        slowestProduct: { name: '-', pct: 0 }
      };
    }

    // Helper function to properly capitalize product names
    const capitalizeProductName = (name) => {
      if (!name) return '-';
      return name
        .toLowerCase()
        .split(' ')
        .map(word => {
          // Handle special cases like MG, ML, etc.
          if (['mg', 'ml', 'g', 'l', 'cc'].includes(word)) {
            return word.toUpperCase();
          }
          // Capitalize first letter of each word
          return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
    };

    // 1. Calculate overall average PCT
    const totalPCT = data.reduce((sum, item) => sum + (item.rataRataPCT || 0), 0);
    const averagePCT = Math.round(totalPCT / data.length);

    // 2. Calculate category averages
    const categoryStats = {};
    data.forEach(item => {
      const category = item.kategori || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, count: 0 };
      }
      categoryStats[category].total += item.rataRataPCT || 0;
      categoryStats[category].count += 1;
    });

    const categoryAverages = Object.entries(categoryStats).map(([name, stats]) => ({
      name,
      avgPCT: Math.round(stats.total / stats.count)
    }));

    // 3. Find slowest and fastest categories
    const slowestCategory = categoryAverages.reduce((max, cat) => 
      cat.avgPCT > max.avgPCT ? cat : max, { name: '-', avgPCT: 0 });
    
    const fastestCategory = categoryAverages.reduce((min, cat) => 
      cat.avgPCT < min.avgPCT ? cat : min, { name: '-', avgPCT: Infinity });
    
    if (fastestCategory.avgPCT === Infinity) {
      fastestCategory.avgPCT = 0;
    }

    // 4. Find slowest product
    const slowestProduct = data.reduce((max, item) => 
      (item.rataRataPCT || 0) > (max.pct || 0) ? 
        { name: capitalizeProductName(item.namaProduk || '-'), pct: item.rataRataPCT || 0 } : max, 
      { name: '-', pct: 0 });

    return {
      averagePCT,
      slowestCategory,
      fastestCategory,
      slowestProduct
    };
  };

  const pctStats = calculatePCTStats(data);

  // Chart data preparation functions
  const getProductCountByCategory = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    // Count products by category
    const categoryCount = {};
    data.forEach(item => {
      const category = item.kategori || 'Unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    const labels = Object.keys(categoryCount);
    const counts = Object.values(categoryCount);
    
    // Modern color palette
    const colors = [
      '#3b82f6', // blue
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
    ];

    return {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4,
      }]
    };
  };

  const getAveragePCTByCategory = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Average PCT (Days)',
          data: [0],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    // Calculate average PCT by category
    const categoryStats = {};
    data.forEach(item => {
      const category = item.kategori || 'Unknown';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, count: 0 };
      }
      categoryStats[category].total += item.rataRataPCT || 0;
      categoryStats[category].count += 1;
    });

    const labels = Object.keys(categoryStats);
    const averages = labels.map(category => 
      Math.round(categoryStats[category].total / categoryStats[category].count)
    );

    // Color gradient based on PCT values
    const maxPCT = Math.max(...averages);
    const colors = averages.map(pct => {
      const intensity = pct / maxPCT;
      if (intensity > 0.7) return '#ef4444'; // red for high PCT
      if (intensity > 0.4) return '#f59e0b'; // amber for medium PCT
      return '#10b981'; // green for low PCT
    });

    return {
      labels,
      datasets: [{
        label: 'Average PCT (Days)',
        data: averages,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  // Chart options
  const donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} produk (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Average PCT: ${context.parsed.y} hari`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Average PCT (Days)'
        },
        grid: {
          color: '#f3f4f6'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Category'
        },
        grid: {
          display: false
        }
      }
    }
  };

  // Mock data for PCT Per Produk as fallback
  const getMockData = () => {
    if (title === "PCT Per Produk") {
      return [
        {
          kode: "01",
          namaProduk: "LAMESON-4 TABLET",
          kategori: "Tablet Biasa Kapsul",
          departemen: "PN2",
          batch: 19,
          rataRataPCT: 70,
        },
        {
          kode: "01LFXB",
          namaProduk: "LANFIX 200 MG KAPSUL",
          kategori: "Kapsul",
          departemen: "PN1",
          batch: 3,
          rataRataPCT: 23,
        },
        {
          kode: "02",
          namaProduk: "LAPISIV SIRUP (botol kaca)",
          kategori: "Liquid & DS",
          departemen: "PN2",
          batch: 6,
          rataRataPCT: 36,
        },
      ];
    }
    return [];
  };

  useEffect(() => {
    if (!apiEndpoint) {
      setData(getMockData());
      setLoading(false);
      return;
    }
    
    // Check localStorage first
    const cacheKey = `reportData_${apiEndpoint.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        const mappedData = dataMapper ? dataMapper(parsed) : parsed;
        setData(mappedData);
        setLoading(false);
        return;
      } catch (e) {
        console.warn('Failed to parse cached data:', e);
        localStorage.removeItem(cacheKey);
      }
    }
    
    setLoading(true);
    setError(null);
    
    // Add full URL for API calls
    const fullUrl = apiEndpoint.startsWith('http') ? apiEndpoint : `http://localhost:4000${apiEndpoint}`;
    
    fetch(fullUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        }
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          throw new Error('Server returned HTML instead of JSON. Backend server may not be running or endpoint may not exist.');
        }
        return res.json();
      })
      .then((responseData) => {
        console.log('API Response:', responseData);
        
        // Handle different response structures
        const actualData = responseData.processed || responseData.data || responseData || [];
        
        // Apply data mapper if provided
        const mappedData = dataMapper ? dataMapper(actualData) : actualData;
        
        // Cache the original data
        localStorage.setItem(cacheKey, JSON.stringify(actualData));
        
        setData(mappedData);
        setLoading(false);
      })
      .catch((e) => {
        console.error('API fetch error:', e);
        console.log('Falling back to mock data...');
        
        // Fall back to mock data
        const mockData = getMockData();
        setData(mockData);
        setError(`API Error: ${e.message}. Using mock data.`);
        setLoading(false);
      });
  }, [apiEndpoint, dataMapper, title]);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area">
        <div className="modular-report-container">
          {/* Header */}
          <div className="modular-report-header">
            <div className="modular-report-breadcrumb">
              {title}
            </div>
          </div>

          {/* Info Cards Row - Real PCT data */}
          <div className="modular-info-cards-row">
            <InfoCard
              title="Rata-rata PCT Keseluruhan"
              value={`${pctStats.averagePCT} Hari`}
              icon="⏱️"
              change={data.length > 0 ? `${data.length} produk` : "No data"}
              changeType="neutral"
            />
            <InfoCard
              title="Kategori PCT Terlama"
              value={pctStats.slowestCategory.name}
              icon="🐌"
              change={`${pctStats.slowestCategory.avgPCT} Hari`}
              changeType="negative"
            />
            <InfoCard
              title="Kategori PCT Tercepat"
              value={pctStats.fastestCategory.name}
              icon="🚀"
              change={`${pctStats.fastestCategory.avgPCT} Hari`}
              changeType="positive"
            />
            <InfoCard
              title="Produk Dengan PCT Terlama"
              value={pctStats.slowestProduct.name}
              icon="📦"
              change={`${pctStats.slowestProduct.pct} Hari`}
              changeType="negative"
            />
          </div>

          {/* Charts Row - Donut chart and Bar chart */}
          <div className="modular-charts-row">
            <div className="modular-small-card">
              <div className="chart-card-header">
                <h3>Distribusi Produk per Kategori</h3>
                <span className="chart-subtitle">Total produk dalam setiap kategori</span>
              </div>
              <div className="chart-container small-chart">
                <Doughnut 
                  data={getProductCountByCategory()} 
                  options={donutChartOptions}
                />
              </div>
            </div>
            <div className="modular-big-graph-card">
              <div className="chart-card-header">
                <h3>Rata-rata PCT per Kategori</h3>
                <span className="chart-subtitle">Perbandingan waktu siklus produksi rata-rata</span>
              </div>
              <div className="chart-container big-chart">
                <Bar 
                  data={getAveragePCTByCategory()} 
                  options={barChartOptions}
                />
              </div>
            </div>
          </div>

          {/* Table Card */}
          <div className="modular-table-row">
            <TableCard
              title="Data Table"
              columns={tableColumns || []}
              data={data}
              loading={loading}
              error={error}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
