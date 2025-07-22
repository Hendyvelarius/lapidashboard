import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import DashboardLoading from './components/DashboardLoading';
import { Line, Bar, Pie } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js'
import Sidebar from './components/Sidebar'
import WipTable from './components/WipTable';
import OfTable from './components/OfTable';
import SummaryCards from './components/SummaryCards';
import DashboardHeader from './components/DashboardHeader';
import useDashboardData from './hooks/useDashboardData';
import { 
  prepareFulfillmentCategoryData, 
  prepareFulfillmentDepartmentData, 
  prepareFulfillmentDepartmentPercentData, 
  preparePctCategoryData,
  preparePctDepartmentData,
  preparePctHighestData
} from './utils/chartDataProcessors';
import { apiUrl } from './api';
import './App.css'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  BarElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

function App() {
  // Navigation hook
  const navigate = useNavigate();
  
  // Use custom hook for data management
  const {
    wipData,
    fulfillmentRawData,
    pctRawData,
    stockReportData,
    loading,
    refreshing,
    lastUpdated,
    handleRefresh,
    formatTimestamp
  } = useDashboardData();

  // Dropdown for stock report chart type
  const [stockChartType, setStockChartType] = useState('top10'); // 'top10' or 'category'
  const [stockDropdownOpen, setStockDropdownOpen] = useState(false);

  // --- WIP Category Progress aggregation (from unified wipData) ---
  // Group by item.kelompok, count occurrences
  const wipGroupAgg = {};
  wipData.forEach(item => {
    const kelompok = item.kelompok || 'Uncategorized';
    if (!wipGroupAgg[kelompok]) wipGroupAgg[kelompok] = 0;
    wipGroupAgg[kelompok]++;
  });

  // Calculate PCT Average from pctRawData
  const calculatePctAverage = () => {
    if (!pctRawData || pctRawData.length === 0) return 0;
    const validPctValues = pctRawData
      .map(item => Number(item.PCTAverage) || 0)
      .filter(value => value > 0);
    
    if (validPctValues.length === 0) return 0;
    
    const sum = validPctValues.reduce((total, value) => total + value, 0);
    return Math.round(sum / validPctValues.length);
  };

  const pctAverageValue = calculatePctAverage();

  function capitalizeWords(str) {
    if (str === undefined || str === null) return 'Uncategorized';
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
  }
  const wipGroupLabels = Object.keys(wipGroupAgg).map(capitalizeWords);
  const wipGroupCounts = Object.values(wipGroupAgg);
  const wipGroupBarData = {
    labels: wipGroupLabels,
    datasets: [
      {
        label: 'Total',
        data: wipGroupCounts,
        backgroundColor: '#4f8cff',
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };
  const wipGroupBarOptions = {
    indexAxis: 'x',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.y} item`
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Kategori' },
        ticks: { font: { size: 13 }, autoSkip: false, maxRotation: 30, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Total' },
        ticks: { stepSize: 1 },
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
  };
  // --- WIP Department Tracker & Category Progress (from unified WIP data) ---
  // All WIP data from /api/wip
  // (Re-use the main wipData state, remove duplicate declarations)

  // WIP Department Tracker aggregation
  const wipDeptAgg = {};
  wipData.forEach(item => {
    const dept = item.dept || 'Unknown';
    if (!wipDeptAgg[dept]) wipDeptAgg[dept] = 0;
    wipDeptAgg[dept]++;
  });
  const wipDeptLabels = Object.keys(wipDeptAgg);
  const wipDeptCounts = Object.values(wipDeptAgg);
  const wipDeptBarData = {
    labels: wipDeptLabels,
    datasets: [
      {
        label: 'Total WIP',
        data: wipDeptCounts,
        backgroundColor: '#4f8cff',
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
      },
    ],
  };
  const wipDeptBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x} item`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Jumlah' },
        ticks: { stepSize: 1 }
      },
      y: {
        title: { display: true, text: 'Department' },
        ticks: { font: { size: 13 } }
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
  };

  // WIP Category Progress aggregation (see below for chart data)
  // --- Chart data preparation functions ---

  // Prepare chart data for Order Fulfillment By Category using new /api/of data
  const fulfillmentChartData = prepareFulfillmentCategoryData(fulfillmentRawData);

  // Chart options for fulfillment category chart
  const fulfillmentChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(ctx) {
            if (ctx.dataset.label === 'Total') {
              return `Total: ${ctx.parsed.y}`;
            }
            return `${ctx.dataset.label}: ${ctx.parsed.y}`;
          }
        }
      }
    },
    scales: {
      x: {
        stacked: true,
        title: { display: true, text: 'Category' },
        ticks: { font: { size: 13 } },
      },
      y: {
        stacked: true,
        beginAtZero: true,
        title: { display: true, text: 'Jumlah' },
        ticks: { stepSize: 10 },
      },
    },
    indexAxis: 'x', // vertical bar chart
    onClick: (event, activeElements) => {
      if (activeElements && activeElements.length > 0) {
        const idx = activeElements[0].index;
        const category = fulfillmentChartData.labels[idx];
        if (category) {
          handleShowOfTable({ dept: null, category });
        }
      }
    },
  };

  // Prepare department data from new /api/of data
  const newFulfillmentDeptChartData = prepareFulfillmentDepartmentData(fulfillmentRawData);
  const newFulfillmentDeptPercentData = prepareFulfillmentDepartmentPercentData(fulfillmentRawData);

  // Chart options for new department chart
  const newFulfillmentDeptChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        enabled: true,
        mode: 'nearest',
        intersect: true,
        callbacks: {
          title: (ctx) => {
            if (ctx && ctx.length > 0) {
              const idx = ctx[0].dataIndex;
              const dept = newFulfillmentDeptChartData.labels[idx];
              return dept || '';
            }
            return '';
          },
          label: (ctx) => {
            return `${ctx.dataset.label}: ${ctx.parsed.x}`;
          },
        },
        displayColors: false,
        backgroundColor: 'rgba(255,255,255,0.98)',
        titleColor: '#222',
        bodyColor: '#333',
        borderColor: '#4f8cff',
        borderWidth: 1.5,
        titleFont: { weight: 'bold', size: 15 },
        bodyFont: { size: 14 },
        padding: 14,
        caretSize: 7,
        cornerRadius: 8,
        boxPadding: 6,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.10)',
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Jumlah' },
        ticks: { stepSize: 1 },
        stacked: true,
      },
      y: {
        title: { display: true, text: 'Department' },
        ticks: { font: { size: 13 } },
        stacked: true,
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
    onClick: (event, activeElements) => {
      if (activeElements && activeElements.length > 0) {
        const idx = activeElements[0].index;
        const dept = newFulfillmentDeptChartData.labels[idx];
        if (dept) {
          handleShowOfTable({ dept, category: null });
        }
      }
    },
  };

  // Prepare PCT category chart data
  const pctCategoryChartData = preparePctCategoryData(pctRawData);
  const pctDepartmentChartData = preparePctDepartmentData(pctRawData);
  const pctHighestChartData = preparePctHighestData(pctRawData);

  // PCT chart options
  const pctCategoryChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.parsed.y.toFixed(1)} days`
        }
      }
    },
    scales: {
      x: {
        title: { display: true, text: 'Category' },
        ticks: { font: { size: 13 }, maxRotation: 45, minRotation: 0 },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Average' },
        ticks: { stepSize: 5 },
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
    onClick: (evt, elements) => {
      if (elements && elements.length > 0) {
        // Navigate to pct-per-produk page when any bar is clicked
        navigate('/reports/pcttahunan');
      }
    },
    onHover: (evt, elements) => {
      evt.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
    },
  };

  // --- WIP Report Data ---
  const wipLabels = ['Total', 'Penyediaan', 'Produksi', 'Packaging', 'Labeling', 'Transport'];
  const wipHistogramLabels = [
    'Minggu 1',        // 1 week
    'Minggu 2',      // 2 weeks
    'Bulan 1',     // 4 weeks
    'Bulan 2',     // 1-2 months
    '2 Bulan+'        // more than 2 months
  ];

  function getWipHistogram(data) {
    const buckets = [0, 0, 0, 0, 0];
    data.forEach(item => {
      let dur = Number(item.duration);
      if (isNaN(dur) || dur < 0) dur = 0;
      if (dur <= 7) buckets[0]++;
      else if (dur <= 14) buckets[1]++;
      else if (dur <= 28) buckets[2]++;
      else if (dur <= 56) buckets[3]++;
      else buckets[4]++;
    });
    return buckets;
  }

  const [chartType] = useState('order');
  const [orderChartType, setOrderChartType] = useState('order');

  // --- Percentage Fulfillment By Department ---
  const newFulfillmentDeptPercentChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        enabled: true,
        mode: 'nearest',
        intersect: true,
        callbacks: {
          title: (ctx) => {
            if (ctx && ctx.length > 0) {
              const idx = ctx[0].dataIndex;
              const dept = newFulfillmentDeptPercentData.labels[idx];
              return dept || '';
            }
            return '';
          },
          label: (ctx) => {
            const idx = ctx.dataIndex;
            const dept = newFulfillmentDeptPercentData.labels[idx];
            const groupedData = newFulfillmentDeptPercentData.groupedData;
            const val = ctx.parsed.x;
            let count = 0;
            if (ctx.dataset.label === 'Released') count = groupedData[dept]?.released ?? 0;
            else if (ctx.dataset.label === 'Quarantined') count = groupedData[dept]?.quarantined ?? 0;
            else if (ctx.dataset.label === 'WIP') count = groupedData[dept]?.wip ?? 0;
            else if (ctx.dataset.label === 'Unprocessed') count = groupedData[dept]?.unprocessed ?? 0;
            const total = groupedData[dept]?.total ?? 0;
            return `${ctx.dataset.label}: ${count}/${total} item`;
          },
          afterBody: (ctx) => {
            if (!ctx || ctx.length === 0) return '';
            const val = ctx[0].parsed.x;
            return [`${val.toFixed(1)}%`];
          },
        },
        displayColors: false,
        backgroundColor: 'rgba(255,255,255,0.98)',
        titleColor: '#222',
        bodyColor: '#333',
        borderColor: '#4f8cff',
        borderWidth: 1.5,
        titleFont: { weight: 'bold', size: 15 },
        bodyFont: { size: 14 },
        padding: 14,
        caretSize: 7,
        cornerRadius: 8,
        boxPadding: 6,
        shadowOffsetX: 0,
        shadowOffsetY: 2,
        shadowBlur: 8,
        shadowColor: 'rgba(0,0,0,0.10)',
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        max: 100,
        title: { display: true, text: 'Persentase (%)' },
        ticks: { stepSize: 10 },
        stacked: true,
      },
      y: {
        title: { display: true, text: 'Department' },
        ticks: { font: { size: 13 } },
        stacked: true,
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
    onClick: (event, activeElements) => {
      if (activeElements && activeElements.length > 0) {
        const idx = activeElements[0].index;
        const dept = newFulfillmentDeptPercentData.labels[idx];
        if (dept) {
          handleShowOfTable({ dept, category: null });
        }
      }
    },
  };

  // --- WIP Category Progress (WIP Group) ---
  // Only show Histogram WIP Aktif in side card
  const [sideCardType] = useState('wip');
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false);

  // State for PCT Chart Dropdown
  const [pctDropdownOpen, setPctDropdownOpen] = useState(false);
  const [pctChartType, setPctChartType] = useState('category');

  // State for WIP Histogram Dropdown (fix: ensure defined before use)
  const [wipDropdownOpen, setWipDropdownOpen] = useState(false);
  const [wipDropdownValue, setWipDropdownValue] = useState('histogram');

  const wipBarData = {
    labels: wipLabels,
    datasets: [
      {
        label: 'Jumlah WIP',
        data: [wipData.length, 0, 0, 0, 0, 0],
        backgroundColor: [
          '#4f8cff', '#38e6c5', '#ffb347', '#6a5acd', '#43a047', '#e57373'
        ],
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30
      },
    ],
  }
  const wipBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x} item`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Jumlah' },
        ticks: { stepSize: 100 }
      },
      y: { 
        title: { display: false },
        ticks: {
          font: {
            size: 12
          }
        }
      },
    },
    layout: {
      padding: {
        left: 10,
        right: 10,
        top: 10,
        bottom: 10
      }
    }
  }

  // Helper to get cumulative sum array
  function getCumulative(arr) {
    let sum = 0;
    return arr.map(v => (sum += v));
  }

  // Calculate fulfillment metrics from new raw data
  const calculateFulfillmentMetrics = (rawData) => {
    if (!rawData || rawData.length === 0) {
      return { fulfillmentTarget: 0, fulfillmentRelease: 0, quarantined: 0 };
    }

    // Calculate Fulfillment Target by summing all "jlhTarget"
    const fulfillmentTarget = rawData.reduce((sum, item) => {
      return sum + (Number(item.jlhTarget) || 0);
    }, 0);

    // Calculate Fulfillment Release by summing "release" field
    const fulfillmentRelease = rawData.reduce((sum, item) => {
      const release = Number(item.release) || 0;
      return sum + release;
    }, 0);

    // Calculate Quarantined by summing "karantina" field
    const quarantined = rawData.reduce((sum, item) => {
      const karantina = Number(item.karantina) || 0;
      return sum + karantina;
    }, 0);

    return { fulfillmentTarget, fulfillmentRelease, quarantined };
  };

  const fulfillmentMetrics = calculateFulfillmentMetrics(fulfillmentRawData);

  const wipHistogramData = getWipHistogram(wipData);
  const wipHistogramBarData = {
    labels: wipHistogramLabels,
    datasets: [
      {
        label: 'Jumlah WIP',
        data: wipHistogramData,
        backgroundColor: [
          '#4f8cff', '#38e6c5', '#ffb347', '#6a5acd', '#e57373'
        ],
        borderColor: '#fff',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30
      },
    ],
  };
  const wipHistogramBarOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: ctx => `${ctx.parsed.x} item`
        }
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        title: { display: true, text: 'Jumlah' },
        ticks: { stepSize: 1 }
      },
      y: {
        title: { display: false },
        ticks: { font: { size: 12 } }
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } }
  }

  // Loading overlay for main content area
  const loadingOverlay = <DashboardLoading loading={loading} />;

  // State for navigation to WIP table page
  const [showWipTable, setShowWipTable] = useState(false);
  const [wipTableLoading, setWipTableLoading] = useState(false);
  const [wipTableData, setWipTableData] = useState([]);
  // New: filter for WIP table (null = no filter, 0-4 = bucket index)
  const [wipTableFilter, setWipTableFilter] = useState(null);
  
  // State for navigation to OF table page
  const [showOfTable, setShowOfTable] = useState(false);
  const [ofTableLoading, setOfTableLoading] = useState(false);
  const [ofTableData, setOfTableData] = useState([]);
  const [ofTableFilter, setOfTableFilter] = useState(null);
  const [ofTableFilterObj, setOfTableFilterObj] = useState(null);
  
  // Handler for opening WIP Table page
  // filterIdx: for histogram bucket, filterObj: { dept, kelompok }
  const [wipTableFilterObj, setWipTableFilterObj] = useState(null);
  const handleShowWipTable = async (filterIdx = null, filterObj = null) => {
    setShowWipTable(true);
    setWipTableLoading(true);
    setWipTableFilter(filterIdx);
    setWipTableFilterObj(filterObj);
    try {
      const res = await fetch(apiUrl('/api/wip'));
      const data = await res.json();
      setWipTableData(data.data || []);
    } catch {
      setWipTableData([]);
    }
    setWipTableLoading(false);
  };

  // Handler for opening OF Table page
  const handleShowOfTable = async (filterObj = null) => {
    setShowOfTable(true);
    setOfTableLoading(true);
    setOfTableFilterObj(filterObj);
    try {
      const res = await fetch(apiUrl('/api/of'));
      const data = await res.json();
      setOfTableData(data.data || data || []);
    } catch (error) {
      setOfTableData([]);
    }
    setOfTableLoading(false);
  };

  if (showWipTable) {
    // If filter is set, filter the data according to the bucket logic or department/kelompok
    let filteredData = wipTableData;
    let filterLabel = null;
    if (wipTableFilter !== null) {
      filterLabel = wipHistogramLabels[wipTableFilter];
      filteredData = wipTableData.filter(item => {
        let dur = Number(item.duration);
        if (isNaN(dur) || dur < 0) dur = 0;
        if (wipTableFilter === 0) return dur <= 7;
        if (wipTableFilter === 1) return dur > 7 && dur <= 14;
        if (wipTableFilter === 2) return dur > 14 && dur <= 28;
        if (wipTableFilter === 3) return dur > 28 && dur <= 56;
        if (wipTableFilter === 4) return dur > 56;
        return true;
      });
    } else if (wipTableFilterObj && (wipTableFilterObj.dept || wipTableFilterObj.kelompok)) {
      if (wipTableFilterObj.dept) {
        filterLabel = `Department: ${wipTableFilterObj.dept}`;
        filteredData = wipTableData.filter(item => (item.dept || 'Unknown') === wipTableFilterObj.dept);
      } else if (wipTableFilterObj.kelompok) {
        filterLabel = `Kategori: ${wipTableFilterObj.kelompok}`;
        filteredData = wipTableData.filter(item => (item.kelompok || 'Uncategorized') === wipTableFilterObj.kelompok);
      }
    }
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area" style={{ position: 'relative' }}>
          <div className="dashboard-header">
            <h1>Daftar WIP</h1>
            <button className="btn" style={{marginBottom: 16}} onClick={() => { setShowWipTable(false); setWipTableFilter(null); setWipTableFilterObj(null); }}>&larr; Kembali</button>
          </div>
          {(wipTableFilter !== null || wipTableFilterObj) && (
            <div style={{marginBottom: 12}}>
              <span className="badge badge-green" style={{fontSize:14, minWidth:0, padding:'4px 16px'}}>
                Filter: {filterLabel}
              </span>
              <button className="btn" style={{marginLeft: 12, fontSize:12, padding:'2px 10px'}} onClick={() => { setWipTableFilter(null); setWipTableFilterObj(null); }}>Hapus Filter</button>
            </div>
          )}
          {wipTableLoading ? (
            <DashboardLoading loading={true} text="Loading WIP Data..." subtext="Sedang mengambil data WIP..." coverContentArea={true} />
          ) : (
            <WipTable data={filteredData} />
          )}
        </main>
      </div>
    );
  }

  if (showOfTable) {
    // Filter the data according to department or category
    let filteredData = ofTableData;
    let filterLabel = null;
    if (ofTableFilterObj && (ofTableFilterObj.dept || ofTableFilterObj.category)) {
      if (ofTableFilterObj.dept) {
        filterLabel = `Department: ${ofTableFilterObj.dept}`;
        filteredData = ofTableData.filter(item => (item.Group_Dept || 'Unknown') === ofTableFilterObj.dept);
      } else if (ofTableFilterObj.category) {
        filterLabel = `Kategori: ${ofTableFilterObj.category}`;
        filteredData = ofTableData.filter(item => (item.pengelompokan || 'Uncategorized') === ofTableFilterObj.category);
      }
    }
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area" style={{ position: 'relative' }}>
          <div className="dashboard-header">
            <h1>Daftar Order Fulfillment</h1>
            <button className="btn" style={{marginBottom: 16}} onClick={() => { setShowOfTable(false); setOfTableFilterObj(null); }}>&larr; Kembali</button>
          </div>
          {ofTableFilterObj && (
            <div style={{marginBottom: 12}}>
              <span className="badge badge-green" style={{fontSize:14, minWidth:0, padding:'4px 16px'}}>
                Filter: {filterLabel}
              </span>
              <button className="btn" style={{marginLeft: 12, fontSize:12, padding:'2px 10px'}} onClick={() => { setOfTableFilterObj(null); }}>Hapus Filter</button>
            </div>
          )}
          {ofTableLoading ? (
            <DashboardLoading loading={true} text="Loading Order Fulfillment Data..." subtext="Sedang mengambil data order fulfillment..." coverContentArea={true} />
          ) : (
            <OfTable data={filteredData} />
          )}
        </main>
      </div>
    );
  }

  // Prepare Stock Report chart data - Forecast vs Finished Goods (Top 10)
  const prepareStockReportChartData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        labels: [],
        datasets: [],
        productInfo: []
      };
    }

    // Sort by Forecast descending and take top 10
    const sortedData = [...stockData]
      .sort((a, b) => (b.Forecast || 0) - (a.Forecast || 0))
      .slice(0, 10);

    const labels = sortedData.map(item => item.Product_ID);
    const forecastData = sortedData.map(item => item.Forecast || 0);
    const releaseData = sortedData.map(item => item.Release || 0);
    const salesData = sortedData.map(item => item.Sales || 0);
    
    // Store product info for tooltips
    const productInfo = sortedData.map(item => ({
      code: item.Product_ID,
      name: item.Product_NM || 'Unknown Product'
    }));

    return {
      labels,
      datasets: [
        {
          label: 'Forecast',
          data: forecastData,
          backgroundColor: '#ff9500',
          borderColor: '#ff9500',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Stock (Release)',
          data: releaseData,
          backgroundColor: '#1e3a8a',
          borderColor: '#1e3a8a',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Sales',
          data: salesData,
          backgroundColor: '#22c55e',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 4,
        }
      ],
      productInfo
    };
  };

  // Prepare Stock Report chart data - Forecast by Category
  const prepareStockReportCategoryChartData = (stockData) => {
    if (!stockData || stockData.length === 0) {
      return {
        labels: [],
        datasets: [],
        categoryInfo: []
      };
    }

    // Aggregate by Kategori
    const categoryAgg = {};
    stockData.forEach(item => {
      const cat = item.Kategori || 'Uncategorized';
      if (!categoryAgg[cat]) {
        categoryAgg[cat] = { Forecast: 0, Release: 0, Sales: 0 };
      }
      categoryAgg[cat].Forecast += item.Forecast || 0;
      categoryAgg[cat].Release += item.Release || 0;
      categoryAgg[cat].Sales += item.Sales || 0;
    });

    const labels = Object.keys(categoryAgg);
    const forecastData = labels.map(cat => categoryAgg[cat].Forecast);
    const releaseData = labels.map(cat => categoryAgg[cat].Release);
    const salesData = labels.map(cat => categoryAgg[cat].Sales);

    // Store category info for tooltips
    const categoryInfo = labels.map(cat => ({ name: cat }));

    return {
      labels,
      datasets: [
        {
          label: 'Forecast',
          data: forecastData,
          backgroundColor: '#ff9500',
          borderColor: '#ff9500',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Stock (Release)',
          data: releaseData,
          backgroundColor: '#1e3a8a',
          borderColor: '#1e3a8a',
          borderWidth: 1,
          borderRadius: 4,
        },
        {
          label: 'Sales',
          data: salesData,
          backgroundColor: '#22c55e',
          borderColor: '#22c55e',
          borderWidth: 1,
          borderRadius: 4,
        }
      ],
      categoryInfo
    };
  };

  const stockReportChartData = stockChartType === 'category' 
    ? prepareStockReportCategoryChartData(stockReportData)
    : prepareStockReportChartData(stockReportData);

  // Stock Report chart options
  const stockReportChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (event, elements) => {
      // Navigate to Stock Forecast page when any part of the chart is clicked
      navigate('/stock-forecast');
    },
    plugins: {
      legend: { 
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: { size: 11 }
        }
      },
      tooltip: {
        callbacks: {
          title: (ctx) => {
            if (ctx && ctx.length > 0) {
              const dataIndex = ctx[0].dataIndex;
              if (stockChartType === 'category') {
                const categoryInfo = stockReportChartData.categoryInfo;
                if (categoryInfo && categoryInfo[dataIndex]) {
                  return `Category: ${categoryInfo[dataIndex].name}`;
                }
              } else {
                const productInfo = stockReportChartData.productInfo;
                if (productInfo && productInfo[dataIndex]) {
                  return [
                    `Code: ${productInfo[dataIndex].code}`,
                    `Product: ${productInfo[dataIndex].name}`
                  ];
                }
              }
            }
            return ctx[0]?.label || '';
          },
          label: (ctx) => {
            const label = ctx.dataset.label || '';
            const value = ctx.parsed.y;
            return `${label}: ${value.toLocaleString()}`;
          }
        },
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 11 },
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.95)',
        titleColor: '#333',
        bodyColor: '#555',
        borderColor: '#ddd',
        borderWidth: 1,
        cornerRadius: 6
      }
    },
    scales: {
      x: {
        title: { display: true, text: stockChartType === 'category' ? 'Category' : 'Product Code' },
        ticks: { 
          font: { size: 11 }, 
          maxRotation: 45, 
          minRotation: 0 
        },
      },
      y: {
        beginAtZero: true,
        title: { display: true, text: 'Quantity' },
        ticks: { 
          callback: (value) => value.toLocaleString()
        },
      },
    },
    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
  };

  // --- Main render ---
  return (
    <>
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
      <div className="dashboard-container">
      <Sidebar />
      <main className="content-area" style={{ position: 'relative' }}>
        <DashboardHeader
          lastUpdated={lastUpdated}
          refreshing={refreshing}
          loading={loading}
          onRefresh={handleRefresh}
          formatTimestamp={formatTimestamp}
        />
        <SummaryCards
          fulfillmentMetrics={fulfillmentMetrics}
          loading={loading}
          pctAverageValue={pctAverageValue}
          totalWipCount={wipData.length}
          onWipTableClick={handleShowWipTable}
        />
        <div className="dashboard-main-row">
          <div className="dashboard-chart-card">
            <div className="chart-title" style={{ position: 'relative' }}>
              <span
                className="chart-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setChartDropdownOpen(open => !open)}
                tabIndex={0}
              >
                {orderChartType === 'department' ? 'Fulfillment By Department' : orderChartType === 'departmentPercent' ? 'Percentage Fulfillment By Department' : 'Order Fulfillment By Category'}
                <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
              </span>
              {chartDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8, zIndex: 10, minWidth: 220, marginTop: 4, padding: '6px 0', fontSize: 15 }}>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setOrderChartType('category'); setChartDropdownOpen(false); }}
                  >Order Fulfillment By Category</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setOrderChartType('department'); setChartDropdownOpen(false); }}
                  >Fulfillment By Department</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setOrderChartType('departmentPercent'); setChartDropdownOpen(false); }}
                  >Percentage Fulfillment By Department</div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {orderChartType === 'department' ? (
                <Bar data={newFulfillmentDeptChartData} options={newFulfillmentDeptChartOptions} />
              ) : orderChartType === 'departmentPercent' ? (
                <Bar data={newFulfillmentDeptPercentData} options={newFulfillmentDeptPercentChartOptions} />
              ) : (
                <Bar data={fulfillmentChartData} options={fulfillmentChartOptions} />
              )}
            </div>
          </div>
          <div className="dashboard-side-card">
            <div className="side-card-title side-card-title-dropdown" style={{ position: 'relative' }}>
              <span
                className="side-card-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setWipDropdownOpen(open => !open)}
                tabIndex={0}
              >
                {wipDropdownValue === 'histogram' && 'Active WIP Histogram'}
                {wipDropdownValue === 'department' && 'WIP Department Tracker'}
                {wipDropdownValue === 'category' && 'WIP Category Progress'}
                <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
              </span>
              {wipDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8, zIndex: 10, minWidth: 220, marginTop: 4, padding: '6px 0', fontSize: 15 }}>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setWipDropdownValue('histogram'); setWipDropdownOpen(false); }}
                  >Active WIP Histogram</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setWipDropdownValue('department'); setWipDropdownOpen(false); }}
                  >WIP Department Tracker</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setWipDropdownValue('category'); setWipDropdownOpen(false); }}
                  >WIP Category Progress</div>
                </div>
              )}
            </div>
            <div style={{ 
              padding: '0', 
              flex: 1, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              height: '100%'
            }}>
              <div style={{ width: '100%', height: '350px' }}>
                {/* Only the histogram chart is implemented for now */}
                {wipDropdownValue === 'histogram' && (
                  <Bar
                    data={wipHistogramBarData}
                    options={{
                      ...wipHistogramBarOptions,
                      onClick: (evt, elements) => {
                        if (elements && elements.length > 0) {
                          const idx = elements[0].index;
                          handleShowWipTable(idx);
                        }
                      },
                      onHover: (e, el) => {
                        e.native.target.style.cursor = el && el.length ? 'pointer' : 'default';
                      },
                    }}
                  />
                )}
                {wipDropdownValue === 'department' && (
                  <Bar
                    data={wipDeptBarData}
                    options={{
                      ...wipDeptBarOptions,
                      onClick: (evt, elements) => {
                        if (elements && elements.length > 0) {
                          const idx = elements[0].index;
                          const dept = wipDeptBarData.labels[idx];
                          handleShowWipTable(null, { dept });
                        }
                      },
                      onHover: (e, el) => {
                        e.native.target.style.cursor = el && el.length ? 'pointer' : 'default';
                      },
                    }}
                  />
                )}
                {wipDropdownValue === 'category' && (
                  <Bar
                    data={wipGroupBarData}
                    options={{
                      ...wipGroupBarOptions,
                      onClick: (evt, elements) => {
                        if (elements && elements.length > 0) {
                          const idx = elements[0].index;
                          const kelompok = Object.keys(wipGroupAgg)[idx];
                          handleShowWipTable(null, { kelompok });
                        }
                      },
                      onHover: (e, el) => {
                        e.native.target.style.cursor = el && el.length ? 'pointer' : 'default';
                      },
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="dashboard-main-row">
          <div className="dashboard-chart-card">
            <div className="chart-title" style={{ position: 'relative' }}>
              <span
                className="chart-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setPctDropdownOpen(open => !open)}
                tabIndex={0}
              >
                {pctChartType === 'department' ? 'Average PCT Per Department' : pctChartType === 'highest' ? '10 Highest PCT' : 'Average PCT Per Category'}
                <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
              </span>
              {pctDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8, zIndex: 10, minWidth: 220, marginTop: 4, padding: '6px 0', fontSize: 15 }}>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setPctChartType('category'); setPctDropdownOpen(false); }}
                  >Average PCT Per Category</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setPctChartType('department'); setPctDropdownOpen(false); }}
                  >Average PCT Per Department</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setPctChartType('highest'); setPctDropdownOpen(false); }}
                  >10 Highest PCT</div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {pctChartType === 'department' ? (
                <Bar data={pctDepartmentChartData} options={pctCategoryChartOptions} />
              ) : pctChartType === 'highest' ? (
                <Bar data={pctHighestChartData} options={pctCategoryChartOptions} />
              ) : (
                <Bar data={pctCategoryChartData} options={pctCategoryChartOptions} />
              )}
            </div>
          </div>
          <div className="dashboard-side-card">
            <div className="side-card-title side-card-title-dropdown" style={{ position: 'relative' }}>
              <span
                className="side-card-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setStockDropdownOpen(open => !open)}
                tabIndex={0}
                title="Click chart to view detailed Stock & Forecast Dashboard"
              >
                {stockChartType === 'top10' ? 'Forecast vs Finished Goods (Top 10)' : 'Forecast by Category'}
                <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
              </span>
              {stockDropdownOpen && (
                <div style={{ position: 'absolute', top: '100%', left: 0, background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderRadius: 8, zIndex: 10, minWidth: 220, marginTop: 4, padding: '6px 0', fontSize: 15 }}>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setStockChartType('top10'); setStockDropdownOpen(false); }}
                  >Forecast vs Finished Goods (Top 10)</div>
                  <div
                    className="chart-dropdown-option"
                    style={{ padding: '10px 20px', cursor: 'pointer', color: '#222', fontWeight: 500, transition: 'color 0.15s' }}
                    onClick={() => { setStockChartType('category'); setStockDropdownOpen(false); }}
                  >Forecast by Category</div>
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative', cursor: 'pointer' }} title="Click to view detailed Stock & Forecast Dashboard">
              <Bar data={stockReportChartData} options={stockReportChartOptions} />
            </div>
          </div>
        </div>
        {loadingOverlay}
      </main>
    </div>
    </>
  )
}

export default App
