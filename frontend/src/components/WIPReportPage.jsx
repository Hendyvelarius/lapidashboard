import React, { useState, useEffect, useMemo } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import Sidebar from './Sidebar';
import Modal from './Modal';
import DashboardLoading from './DashboardLoading';
import { apiUrl } from '../api';
import * as XLSX from 'xlsx';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// InfoCard component for the 5 info cards at the top
function InfoCard({ title, value, icon, change, changeType }) {
  const getChangeIcon = () => {
    if (changeType === 'neutral') return ''; // No icon for neutral
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

// TableCard component for displaying WIP data in a modern table
function TableCard({ title, columns, data, loading, error, sortConfig, onSort, onSearch, searchTerm }) {
  
  // Export to Excel handler
  const exportToExcel = () => {
    if (!data || !columns || data.length === 0) return;
    const exportData = data.map(row => {
      const obj = {};
      columns.forEach(col => {
        obj[col.label] = row[col.key];
      });
      return obj;
    });
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "WIP_Data");
    XLSX.writeFile(workbook, `WIP_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return '⇅';
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  return (
    <div className="modular-table-card">
      <div className="modular-table-header">
        <h3 className="modular-table-title">{title}</h3>
        <div className="modular-table-actions">
          <input
            type="text"
            className="table-search-input"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => onSearch(e.target.value)}
            style={{ padding: '0.4rem 0.8rem', borderRadius: 6, border: '1px solid #e0e7ef', fontSize: '0.95rem', minWidth: 120 }}
            aria-label="Search table"
          />
          <button className="table-export-btn" onClick={exportToExcel}>Export</button>
        </div>
      </div>
      <div className="modular-table-content">
        {loading ? (
          <div style={{ position: 'relative', height: '280px' }}>
            <DashboardLoading 
              loading={true} 
              text="Loading WIP data..." 
              subtext="Processing batch information..." 
            />
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
                      onClick={() => onSort(col.key)}
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
                {data && data.length > 0 ? (
                  data.map((row, i) => (
                    <tr key={i}>
                      {columns.map((col) => (
                        <td key={col.key}>{row[col.key] || '-'}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="no-data">
                      No WIP data available
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

// Main WIPReportPage component
export default function WIPReportPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tableFilter, setTableFilter] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [searchTerm, setSearchTerm] = useState("");
  
  // Chart selection states
  const [smallChartModalOpen, setSmallChartModalOpen] = useState(false);
  const [largeChartModalOpen, setLargeChartModalOpen] = useState(false);
  const [selectedSmallChart, setSelectedSmallChart] = useState('statusDistribution');
  const [selectedLargeChart, setSelectedLargeChart] = useState('durationByStatus');

  // Calculate WIP statistics for info cards
  const calculateWIPStats = (data) => {
    if (!data || data.length === 0) {
      return {
        totalBatches: 0,
        averageDuration: 0,
        longestBatch: { name: '-', duration: 0 },
        fastestBatch: { name: '-', duration: 0 },
        totalValue: 0
      };
    }

    // 1. Total batches
    const totalBatches = data.length;

    // 2. Calculate average duration
    const totalDuration = data.reduce((sum, item) => sum + (item.duration || 0), 0);
    const averageDuration = Math.round(totalDuration / data.length);

    // 3. Find longest batch and highest value batch
    const longestBatch = data.reduce((max, item) => 
      (item.duration || 0) > (max.duration || 0) ? 
        { name: `${item.name} (${item.batch})`, duration: item.duration || 0 } : max, 
      { name: '-', duration: 0 });

    const highestValueBatch = data.reduce((max, item) => {
      const currentValue = (item.actual || item.standard || 0) * (item.price || 0);
      const maxValue = (max.value || 0);
      return currentValue > maxValue ? 
        { name: `${item.name} (${item.batch})`, value: currentValue } : max;
    }, { name: '-', value: 0 });

    // 4. Calculate total value
    const totalValue = data.reduce((sum, item) => {
      const value = (item.actual || item.standard || 0) * (item.price || 0);
      return sum + value;
    }, 0);

    return {
      totalBatches,
      averageDuration,
      longestBatch,
      highestValueBatch,
      totalValue
    };
  };

  const wipStats = calculateWIPStats(data);

  // Sort handler
  const handleSort = (columnKey) => {
    let direction = 'asc';
    if (sortConfig.key === columnKey && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key: columnKey, direction });
  };

  // Search handler
  const handleSearch = (term) => {
    setSearchTerm(term);
  };

  // Helper function to format numbers
  const formatNumber = (num) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toLocaleString() || '0';
  };

  // Chart click handlers
  const handleCategoryChartClick = (type, elements, chart) => {
    if (elements.length > 0) {
      const idx = elements[0].index;
      const label = chart.data.labels[idx];
      if (tableFilter && tableFilter.type === type && tableFilter.value === label) {
        setTableFilter(null); // Toggle off
      } else {
        setTableFilter({ type, value: label });
      }
    }
  };

  const handleDurationDistributionClick = (elements, chart) => {
    if (elements.length > 0) {
      const idx = elements[0].index;
      const durationRanges = [
        { label: 'Quick (≤7 days)', min: 0, max: 7 },
        { label: 'Normal (8-21 days)', min: 8, max: 21 },
        { label: 'Slow (22-38 days)', min: 22, max: 38 },
        { label: 'Critical (>38 days)', min: 39, max: Infinity }
      ];
      const range = durationRanges[idx];
      if (tableFilter && tableFilter.type === 'durationRange' && tableFilter.min === range.min && tableFilter.max === range.max) {
        setTableFilter(null);
      } else {
        setTableFilter({ type: 'durationRange', min: range.min, max: range.max });
      }
    }
  };

  // Chart data preparation functions
  const getStatusDistribution = () => {
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

    // Count batches by status
    const statusCount = {};
    data.forEach(item => {
      const status = item.status || 'Unknown';
      statusCount[status] = (statusCount[status] || 0) + 1;
    });

    const labels = Object.keys(statusCount);
    const counts = Object.values(statusCount);
    
    // Status-specific colors
    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'proses': return '#10b981'; // Green
        case 'kemas': return '#f59e0b'; // Orange
        case 'karantina': return '#ef4444'; // Red
        default: return '#6b7280'; // Gray
      }
    };

    const colors = labels.map(status => getStatusColor(status));

    return {
      labels,
      datasets: [{
        data: counts,
        backgroundColor: colors,
        borderColor: colors.map(color => color + '80'),
        borderWidth: 2,
        hoverOffset: 4,
      }]
    };
  };

  const getDurationDistribution = () => {
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

    let quick = 0, normal = 0, slow = 0, critical = 0;
    data.forEach(item => {
      const duration = item.duration || 0;
      if (duration <= 7) quick++;
      else if (duration <= 21) normal++;
      else if (duration <= 38) slow++;
      else critical++;
    });

    return {
      labels: ['Quick (≤7 days)', 'Normal (8-21 days)', 'Slow (22-38 days)', 'Critical (>38 days)'],
      datasets: [{
        data: [quick, normal, slow, critical],
        backgroundColor: ['#10b981', '#22d3ee', '#f59e0b', '#ef4444'],
        borderColor: ['#10b98180', '#22d3ee80', '#f59e0b80', '#ef444480'],
        borderWidth: 2,
        hoverOffset: 4,
      }]
    };
  };

  const getKelompokDistribution = () => {
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

    const kelompokCount = {};
    data.forEach(item => {
      const kelompok = item.kelompok || 'Unknown';
      kelompokCount[kelompok] = (kelompokCount[kelompok] || 0) + 1;
    });

    const labels = Object.keys(kelompokCount);
    const counts = Object.values(kelompokCount);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

  const getDepartmentDistribution = () => {
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

    const deptCount = {};
    data.forEach(item => {
      const dept = item.dept || 'Unknown';
      deptCount[dept] = (deptCount[dept] || 0) + 1;
    });

    const labels = Object.keys(deptCount);
    const counts = Object.values(deptCount);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

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

  const getAverageDurationByKelompok = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Average Duration (Days)',
          data: [0],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    const kelompokStats = {};
    data.forEach(item => {
      const kelompok = item.kelompok || 'Unknown';
      if (!kelompokStats[kelompok]) {
        kelompokStats[kelompok] = { total: 0, count: 0 };
      }
      kelompokStats[kelompok].total += item.duration || 0;
      kelompokStats[kelompok].count += 1;
    });

    const labels = Object.keys(kelompokStats);
    const averages = labels.map(kelompok => 
      Math.round(kelompokStats[kelompok].total / kelompokStats[kelompok].count)
    );

    const maxDuration = Math.max(...averages);
    const colors = averages.map(duration => {
      const intensity = duration / maxDuration;
      if (intensity > 0.7) return '#ef4444';
      if (intensity > 0.4) return '#f59e0b';
      return '#10b981';
    });

    return {
      labels,
      datasets: [{
        label: 'Average Duration (Days)',
        data: averages,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  // Large Chart Options
  const getAverageDurationByDepartment = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Average Duration (Days)',
          data: [0],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    const deptStats = {};
    data.forEach(item => {
      const dept = item.dept || 'Unknown';
      if (!deptStats[dept]) {
        deptStats[dept] = { total: 0, count: 0 };
      }
      deptStats[dept].total += item.duration || 0;
      deptStats[dept].count += 1;
    });

    const labels = Object.keys(deptStats);
    const averages = labels.map(dept => 
      Math.round(deptStats[dept].total / deptStats[dept].count)
    );

    const maxDuration = Math.max(...averages);
    const colors = averages.map(duration => {
      const intensity = duration / maxDuration;
      if (intensity > 0.7) return '#ef4444';
      if (intensity > 0.4) return '#f59e0b';
      return '#10b981';
    });

    return {
      labels,
      datasets: [{
        label: 'Average Duration (Days)',
        data: averages,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  const getAverageDurationByStatus = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Average Status Duration (Days)',
          data: [0],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    const statusStats = {};
    data.forEach(item => {
      const status = item.status || 'Unknown';
      if (!statusStats[status]) {
        statusStats[status] = { total: 0, count: 0 };
      }
      statusStats[status].total += item.statusDuration || 0;
      statusStats[status].count += 1;
    });

    // Define the order for status display
    const statusOrder = ['Proses', 'Kemas', 'Karantina'];
    const labels = statusOrder.filter(status => statusStats[status]);
    const averages = labels.map(status => 
      Math.round(statusStats[status].total / statusStats[status].count)
    );

    // Status-specific colors
    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'proses': return '#10b981'; // Green
        case 'kemas': return '#f59e0b'; // Orange
        case 'karantina': return '#ef4444'; // Red
        default: return '#6b7280'; // Gray
      }
    };

    const colors = labels.map(status => getStatusColor(status));

    return {
      labels,
      datasets: [{
        label: 'Average Status Duration (Days)',
        data: averages,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  const getTop10LongestBatches = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Duration (Days)',
          data: [0],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    const sortedData = [...data]
      .sort((a, b) => (b.duration || 0) - (a.duration || 0))
      .slice(0, 10);

    const labels = sortedData.map(item => item.batch || 'N/A');
    
    const durations = sortedData.map(item => item.duration || 0);

    const colors = durations.map(duration => {
      if (duration > 38) return '#ef4444';
      if (duration > 21) return '#f59e0b';
      return '#10b981';
    });

    return {
      labels,
      datasets: [{
        label: 'Duration (Days)',
        data: durations,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  const getValueByStatus = () => {
    if (!data || data.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          label: 'Total Value',
          data: [0],
          backgroundColor: ['#e5e7eb'],
          borderColor: ['#d1d5db'],
          borderWidth: 1,
        }]
      };
    }

    const statusValues = {};
    data.forEach(item => {
      const status = item.status || 'Unknown';
      const value = (item.actual || item.standard || 0) * (item.price || 0);
      if (!statusValues[status]) {
        statusValues[status] = 0;
      }
      statusValues[status] += value;
    });

    const labels = Object.keys(statusValues);
    const values = Object.values(statusValues);

    const getStatusColor = (status) => {
      switch (status.toLowerCase()) {
        case 'proses': return '#10b981';
        case 'kemas': return '#f59e0b';
        case 'karantina': return '#ef4444';
        default: return '#6b7280';
      }
    };

    const colors = labels.map(status => getStatusColor(status));

    return {
      labels,
      datasets: [{
        label: 'Total Value (IDR)',
        data: values,
        backgroundColor: colors.map(color => color + '80'),
        borderColor: colors,
        borderWidth: 2,
      }]
    };
  };

  // Chart selection options
  const smallChartOptions = [
    { id: 'statusDistribution', title: 'Distribusi Status WIP', desc: 'Pembagian batch berdasarkan status produksi' },
    { id: 'durationDistribution', title: 'Distribusi Durasi', desc: 'Pembagian batch berdasarkan lamanya proses' },
    { id: 'kelompokDistribution', title: 'Distribusi Kelompok Produk', desc: 'Total batch dalam setiap kelompok produk' },
    { id: 'departmentDistribution', title: 'Distribusi Departemen', desc: 'Total batch dalam setiap departemen' }
  ];

  const largeChartOptions = [
    { id: 'durationByStatus', title: 'Rata-rata Durasi per Tahapan', desc: 'Perbandingan waktu rata-rata pada setiap tahapan status' },
    { id: 'durationByDepartment', title: 'Rata-rata Durasi per Departemen', desc: 'Perbandingan waktu proses rata-rata per departemen' },
    { id: 'longestBatches', title: '10 Batch Terlama', desc: 'Batch dengan durasi proses terpanjang' },
    { id: 'valueByStatus', title: 'Total Nilai per Status', desc: 'Nilai total batch berdasarkan status produksi' },
    { id: 'durationByKelompok', title: 'Rata-rata Durasi per Kelompok', desc: 'Perbandingan waktu proses per kelompok produk' }
  ];

  // Get chart data based on selection
  const getSmallChartData = () => {
    switch (selectedSmallChart) {
      case 'durationDistribution': return getDurationDistribution();
      case 'kelompokDistribution': return getKelompokDistribution();
      case 'departmentDistribution': return getDepartmentDistribution();
      default: return getStatusDistribution();
    }
  };

  const getLargeChartData = () => {
    switch (selectedLargeChart) {
      case 'durationByDepartment': return getAverageDurationByDepartment();
      case 'longestBatches': return getTop10LongestBatches();
      case 'valueByStatus': return getValueByStatus();
      case 'durationByKelompok': return getAverageDurationByKelompok();
      default: return getAverageDurationByStatus();
    }
  };

  // Get chart titles based on selection
  const getSmallChartTitle = () => {
    const option = smallChartOptions.find(opt => opt.id === selectedSmallChart);
    return option ? option.title : 'Chart';
  };

  const getLargeChartTitle = () => {
    const option = largeChartOptions.find(opt => opt.id === selectedLargeChart);
    return option ? option.title : 'Chart';
  };

  const getSmallChartSubtitle = () => {
    const option = smallChartOptions.find(opt => opt.id === selectedSmallChart);
    return option ? option.desc : '';
  };

  const getLargeChartSubtitle = () => {
    const option = largeChartOptions.find(opt => opt.id === selectedLargeChart);
    return option ? option.desc : '';
  };

  // Chart component selection
  const renderSmallChart = () => {
    return <Doughnut data={getSmallChartData()} options={donutChartOptions} />;
  };

  const renderLargeChart = () => {
    return <Bar data={getLargeChartData()} options={barChartOptions} />;
  };

  // Chart options
  const donutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements, chart) => {
      if (selectedSmallChart === 'statusDistribution') {
        handleCategoryChartClick('status', elements, chart);
      } else if (selectedSmallChart === 'durationDistribution') {
        handleDurationDistributionClick(elements, chart);
      } else if (selectedSmallChart === 'kelompokDistribution') {
        handleCategoryChartClick('kelompok', elements, chart);
      } else if (selectedSmallChart === 'departmentDistribution') {
        handleCategoryChartClick('dept', elements, chart);
      }
    },
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
            return `${label}: ${value} batch (${percentage}%)`;
          }
        }
      }
    },
    cutout: '60%',
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements, chart) => {
      if (selectedLargeChart === 'durationByDepartment') {
        handleCategoryChartClick('dept', elements, chart);
      } else if (selectedLargeChart === 'valueByStatus') {
        handleCategoryChartClick('status', elements, chart);
      } else if (selectedLargeChart === 'durationByStatus') {
        handleCategoryChartClick('status', elements, chart);
      } else if (selectedLargeChart === 'durationByKelompok') {
        handleCategoryChartClick('kelompok', elements, chart);
      }
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            if (selectedLargeChart === 'valueByStatus') {
              return `Total Value: IDR ${formatNumber(context.parsed.y)}`;
            } else if (selectedLargeChart === 'durationByStatus') {
              return `Average Status Duration: ${context.parsed.y} hari`;
            }
            return `${context.dataset.label}: ${context.parsed.y} hari`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: selectedLargeChart === 'valueByStatus' ? 'Total Value (IDR)' : 
                selectedLargeChart === 'durationByStatus' ? 'Average Status Duration (Days)' : 
                'Duration (Days)'
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

  // Table columns for WIP data
  const tableColumns = [
    { key: 'id', label: 'Product ID' },
    { key: 'name', label: 'Product Name' },
    { key: 'batch', label: 'Batch Number' },
    { key: 'status', label: 'Status' },
    { key: 'duration', label: 'Duration (Days)' },
    { key: 'statusDuration', label: 'Status Duration (Days)' },
    { key: 'kelompok', label: 'Product Group' },
    { key: 'dept', label: 'Department' },
    { key: 'standard', label: 'Standard Qty' },
    { key: 'actual', label: 'Actual Qty' },
    { key: 'formattedValue', label: 'Total Value' }
  ];

  // Process data for table display
  const processedTableData = useMemo(() => {
    return data.map(item => {
      const rawValue = (item.actual || item.standard || 0) * (item.price || 0);
      return {
        ...item,
        rawValue: rawValue, // Store raw numeric value for sorting
        formattedValue: formatNumber(rawValue) // Store formatted value for display
      };
    });
  }, [data]);

  // Table filtering logic - work with processedTableData directly
  const getFilteredTableData = useMemo(() => {
    if (!tableFilter) return processedTableData;
    
    switch (tableFilter.type) {
      case 'status':
        return processedTableData.filter(item => item.status === tableFilter.value);
      case 'kelompok':
        return processedTableData.filter(item => item.kelompok === tableFilter.value);
      case 'dept':
        return processedTableData.filter(item => item.dept === tableFilter.value);
      case 'durationRange':
        return processedTableData.filter(item => {
          const duration = item.duration || 0;
          return duration >= tableFilter.min && duration <= tableFilter.max;
        });
      default:
        return processedTableData;
    }
  }, [processedTableData, tableFilter]);

  // Search filtering
  const searchFilteredData = useMemo(() => {
    if (!searchTerm) return getFilteredTableData;
    const lower = searchTerm.toLowerCase();
    return getFilteredTableData.filter(row =>
      tableColumns.some(col =>
        String(row[col.key] ?? "").toLowerCase().includes(lower)
      )
    );
  }, [getFilteredTableData, searchTerm]);

  // Sorting logic
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return searchFilteredData;
    const sorted = [...searchFilteredData].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Special handling for formattedValue - use rawValue for sorting
      if (sortConfig.key === 'formattedValue') {
        aVal = a.rawValue || 0;
        bVal = b.rawValue || 0;
      }
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
    return sorted;
  }, [searchFilteredData, sortConfig]);

  // Fetch data when component mounts
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const fullUrl = apiUrl('/api/wip');
    
    fetch(fullUrl)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then((responseData) => {
        const wipData = responseData.data || responseData || [];
        setData(wipData);
        setLoading(false);
      })
      .catch((e) => {
        console.error('API fetch error:', e);
        setError(`Failed to load WIP data: ${e.message}`);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <DashboardLoading 
            loading={true} 
            text="Loading Work In Progress..." 
            subtext="Sedang menarik data batch produksi..." 
            coverContentArea={true}
          />
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
              Work In Progress Dashboard
            </div>
          </div>

          {/* Info Cards Row - WIP data */}
          <div className="modular-info-cards-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px' }}>
            <InfoCard
              title="Total Batches"
              value={wipStats.totalBatches}
              icon="📦"
              change={data.length > 0 ? `Active batches` : "No data"}
              changeType="neutral"
            />
            <InfoCard
              title="Rata-rata Durasi"
              value={`${wipStats.averageDuration} Hari`}
              icon="⏱️"
              change="Overall average"
              changeType="neutral"
            />
            <InfoCard
              title="Batch Terlama"
              value={`${wipStats.longestBatch.duration} Hari`}
              icon="🐌"
              change={wipStats.longestBatch.name}
              changeType="negative"
            />
            <InfoCard
              title="Batch Value Tertinggi"
              value={`IDR ${formatNumber(wipStats.highestValueBatch.value)}`}
              icon="💎"
              change={wipStats.highestValueBatch.name}
              changeType="positive"
            />
            <InfoCard
              title="Total Nilai WIP"
              value={`IDR ${formatNumber(wipStats.totalValue)}`}
              icon="💰"
              change="Production value"
              changeType="neutral"
            />
          </div>

          {/* Charts Row */}
          <div className="modular-charts-row">
            <div className="modular-small-card">
              <div className="chart-card-header">
                <h3 
                  style={{ cursor: 'pointer', color: '#4f8cff', userSelect: 'none' }}
                  onClick={() => setSmallChartModalOpen(true)}
                  title="Click to change chart type"
                >
                  {getSmallChartTitle()} <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
                </h3>
                <span className="chart-subtitle">{getSmallChartSubtitle()}</span>
              </div>
              <div className="chart-container small-chart" style={{ cursor: 'pointer' }}>
                {renderSmallChart()}
              </div>
            </div>
            <div className="modular-big-graph-card">
              <div className="chart-card-header">
                <h3 
                  style={{ cursor: 'pointer', color: '#4f8cff', userSelect: 'none' }}
                  onClick={() => setLargeChartModalOpen(true)}
                  title="Click to change chart type"
                >
                  {getLargeChartTitle()} <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
                </h3>
                <span className="chart-subtitle">{getLargeChartSubtitle()}</span>
              </div>
              <div className="chart-container big-chart" style={{ cursor: 'pointer' }}>
                {renderLargeChart()}
              </div>
            </div>
          </div>

          {/* Modal for chart selection */}
          <Modal open={smallChartModalOpen} onClose={() => setSmallChartModalOpen(false)} title="Pilih Jenis Chart Kecil">
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

          <Modal open={largeChartModalOpen} onClose={() => setLargeChartModalOpen(false)} title="Pilih Jenis Chart Besar">
            <div className="modal-list">
              {largeChartOptions.map((option, i) => (
                <div 
                  className="modal-list-item" 
                  key={i} 
                  tabIndex={0} 
                  role="button"
                  onClick={() => {
                    setSelectedLargeChart(option.id);
                    setLargeChartModalOpen(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedLargeChart(option.id);
                      setLargeChartModalOpen(false);
                    }
                  }}
                  style={{ 
                    backgroundColor: selectedLargeChart === option.id ? '#f0f4ff' : 'transparent',
                    borderLeft: selectedLargeChart === option.id ? '3px solid #4f8cff' : '3px solid transparent'
                  }}
                >
                  <div className="modal-list-item-title">{option.title}</div>
                  <div className="modal-list-item-desc">{option.desc}</div>
                </div>
              ))}
            </div>
          </Modal>

          {/* Filter Status Indicator */}
          {tableFilter && (
            <div className="filter-indicator" style={{
              backgroundColor: '#f0f4ff',
              border: '1px solid #4f8cff',
              borderRadius: '8px',
              padding: '12px 16px',
              margin: '16px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ color: '#4f8cff', fontWeight: '500' }}>
                  🔍 Filter aktif: {
                    tableFilter.type === 'status' ? `Status = "${tableFilter.value}"` :
                    tableFilter.type === 'kelompok' ? `Kelompok = "${tableFilter.value}"` :
                    tableFilter.type === 'dept' ? `Departemen = "${tableFilter.value}"` :
                    tableFilter.type === 'durationRange' ? `Duration ${tableFilter.min} - ${tableFilter.max === Infinity ? '∞' : tableFilter.max} hari` :
                    'Unknown Filter'
                  }
                </span>
                <span style={{ color: '#6b7280', fontSize: '14px' }}>
                  ({sortedData.length} dari {data.length} item)
                </span>
              </div>
              <button
                onClick={() => setTableFilter(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f8cff',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}
                title="Clear filter"
              >
                ✕
              </button>
            </div>
          )}

          {/* Table Row */}
          <div className="modular-table-row">
            <TableCard
              title="WIP Batch Data"
              columns={tableColumns}
              data={sortedData}
              loading={loading}
              error={error}
              sortConfig={sortConfig}
              onSort={handleSort}
              onSearch={handleSearch}
              searchTerm={searchTerm}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
