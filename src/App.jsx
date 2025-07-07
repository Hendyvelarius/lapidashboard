import { useState, useEffect } from 'react'
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
  ArcElement // <-- Add this for Pie chart
} from 'chart.js'
import Sidebar from './components/Sidebar'
import WipTable from './components/WipTable';
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
  ArcElement // <-- Register ArcElement for Pie chart
)



// Hardcoded PPE report data for 30 days
const ppeDays = Array.from({ length: 30 }, (_, i) => (i + 1).toString())
const ppeJumlahLaporan = [5, 8, 12, 15, 18, 22, 25, 28, 32, 35, 38, 41, 45, 48, 52, 55, 59, 62, 65, 68, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80]
const ppeMenungguApproval = [2, 3, 4, 4, 5, 6, 7, 7, 8, 8, 8, 8, 9, 9, 10, 10, 10, 10, 10, 10, 10, 10, 9, 8, 7, 6, 5, 4, 3, 2]
const ppeProsesPerbaikan = [1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 10, 10, 11, 12, 12, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13, 13]
const ppeMenungguKonfirmasi = [1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15]
const ppePerbaikanSelesai = ppeJumlahLaporan.map((val, i) => val - ppeMenungguApproval[i] - ppeProsesPerbaikan[i] - ppeMenungguKonfirmasi[i])

const ppeChartData = {
  labels: ppeDays,
  datasets: [
    {
      label: 'Jumlah Laporan',
      data: ppeJumlahLaporan,
      borderColor: '#4f8cff',
      backgroundColor: 'rgba(79,140,255,0.10)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
    },
    {
      label: 'Menunggu Approval',
      data: ppeMenungguApproval,
      borderColor: '#ffb347',
      backgroundColor: 'rgba(255,179,71,0.10)',
      fill: false,
      tension: 0.3,
      pointRadius: 2,
    },
    {
      label: 'Proses Perbaikan',
      data: ppeProsesPerbaikan,
      borderColor: '#38e6c5',
      backgroundColor: 'rgba(56,230,197,0.10)',
      fill: false,
      tension: 0.3,
      pointRadius: 2,
    },
    {
      label: 'Menunggu Konfirmasi',
      data: ppeMenungguKonfirmasi,
      borderColor: '#6a5acd',
      backgroundColor: 'rgba(106,90,205,0.10)',
      fill: false,
      tension: 0.3,
      pointRadius: 2,
    },
    {
      label: 'Perbaikan Selesai',
      data: ppePerbaikanSelesai,
      borderColor: '#43a047',
      backgroundColor: 'rgba(67,160,71,0.10)',
      fill: false,
      tension: 0.3,
      pointRadius: 2,
    },
  ],
}

const ppeChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'top' } },
  scales: {
    y: { beginAtZero: true, title: { display: true, text: 'Jumlah' } },
    x: { title: { display: true, text: 'Tanggal' } },
  },
}

// PPE Pie chart data (latest values)
const ppePieData = {
  labels: [
    'Menunggu Approval',
    'Proses Perbaikan',
    'Menunggu Konfirmasi',
    'Perbaikan Selesai',
  ],
  datasets: [
    {
      data: [
        ppeMenungguApproval[ppeMenungguApproval.length-1],
        ppeProsesPerbaikan[ppeProsesPerbaikan.length-1],
        ppeMenungguKonfirmasi[ppeMenungguKonfirmasi.length-1],
        ppePerbaikanSelesai[ppePerbaikanSelesai.length-1],
      ],
      backgroundColor: [
        '#ffb347',
        '#38e6c5',
        '#6a5acd',
        '#43a047',
      ],
      borderColor: '#fff',
      borderWidth: 2,
    },
  ],
}

const ppePieOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'bottom' },
  },
}

function App() {
  // --- Order Fulfillment Data (from API) ---
  const [fulfillmentData, setFulfillmentData] = useState([]);
  const [fulfillmentLoading, setFulfillmentLoading] = useState(true);
  // --- Order Fulfillment Summary Data (for cards) ---
  const [ofSummary, setOfSummary] = useState(null);
  const [ofSummaryLoading, setOfSummaryLoading] = useState(true);
  // --- Fulfillment By Department Data ---
  const [fulfillmentDeptData, setFulfillmentDeptData] = useState([]);
  const [fulfillmentDeptLoading, setFulfillmentDeptLoading] = useState(true);

  useEffect(() => {
    setFulfillmentLoading(true);
    fetch(apiUrl('/api/fulfillmentKelompok'))
      .then(res => res.json())
      .then(data => {
        setFulfillmentData(data.data || []);
        setFulfillmentLoading(false);
      })
      .catch(() => {
        setFulfillmentData([]);
        setFulfillmentLoading(false);
      });
    // Fetch Order Fulfillment summary for cards
    setOfSummaryLoading(true);
    fetch(apiUrl('/api/fulfillment'))
      .then(res => res.json())
      .then(data => {
        setOfSummary((data && data.data && data.data[0]) || null);
        setOfSummaryLoading(false);
      })
      .catch(() => {
        setOfSummary(null);
        setOfSummaryLoading(false);
      });
    // Fetch Fulfillment By Department for chart
    setFulfillmentDeptLoading(true);
    fetch(apiUrl('/api/fulfillmentDept'))
      .then(res => res.json())
      .then(data => {
        setFulfillmentDeptData(data.data || []);
        setFulfillmentDeptLoading(false);
      })
      .catch(() => {
        setFulfillmentDeptData([]);
        setFulfillmentDeptLoading(false);
      });
  }, []);

  // Prepare chart data for Order Fulfillment By Category
  const fulfillmentChartData = {
    labels: fulfillmentData.map(d => d.Kelompok),
    datasets: [
      {
        label: 'Release',
        data: fulfillmentData.map(d => d.Release),
        backgroundColor: '#4f8cff',
        borderColor: '#4f8cff',
        borderWidth: 3,
        type: 'bar',
        stack: 'stack1',
        order: 2,
      },
      {
        label: 'Karantina',
        data: fulfillmentData.map(d => d.Karantina),
        backgroundColor: '#ffb347',
        borderColor: '#ffb347',
        borderWidth: 3,
        type: 'bar',
        stack: 'stack1',
        order: 2,
      },
      {
        label: 'Menunggu Proses',
        data: fulfillmentData.map(d => d.MenungguProses),
        backgroundColor: '#38e6c5',
        borderColor: '#38e6c5',
        borderWidth: 3,
        type: 'bar',
        stack: 'stack1',
        order: 2,
      },
    ],
  };

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
        title: { display: true, text: 'Kelompok' },
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

  const [wipData, setWipData] = useState([]);
  const [loading, setLoading] = useState(true);
  // Only show order fulfillment chart, no HR/employee chart
  const [chartType] = useState('order');
  const [orderChartType, setOrderChartType] = useState('order');
  // Only show Histogram WIP Aktif in side card
  const [sideCardType] = useState('wip');
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false);
  const [ppeDropdownOpen, setPpeDropdownOpen] = useState(false);
  const [ppeMode, setPpeMode] = useState('line');
  const [ppeChartKey, setPpeChartKey] = useState(Date.now());

  // Handler for PPE chart mode change (line/pie)
  function handlePpeModeChange(mode) {
    setPpeMode(mode);
    setPpeChartKey(Date.now()); // force chart re-render
  }

  // State for WIP Histogram Dropdown (fix: ensure defined before use)
  const [wipDropdownOpen, setWipDropdownOpen] = useState(false);
  const [wipDropdownValue, setWipDropdownValue] = useState('histogram');

  useEffect(() => {
    setLoading(true);
    fetch(apiUrl('/api/wip'))
      .then(res => res.json())
      .then(data => {
        setWipData(data.data || []);
        setLoading(false);
      })
      .catch(() => {
        setWipData([]);
        setLoading(false);
      });
  }, []);

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

  // Count WIP items with duration > 38
  const wipTerlambatCount = wipData.filter(item => Number(item.duration) > 38).length;

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

  // Handler for opening WIP Table page
  const handleShowWipTable = async (filterIdx = null) => {
    setShowWipTable(true);
    setWipTableLoading(true);
    setWipTableFilter(filterIdx);
    try {
      const res = await fetch(apiUrl('/api/wip'));
      const data = await res.json();
      setWipTableData(data.data || []);
    } catch {
      setWipTableData([]);
    }
    setWipTableLoading(false);
  };

  if (showWipTable) {
    // If filter is set, filter the data according to the bucket logic
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
    }
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area" style={{ position: 'relative' }}>
          <div className="dashboard-header">
            <h1>Daftar WIP</h1>
            <button className="btn" style={{marginBottom: 16}} onClick={() => setShowWipTable(false)}>&larr; Kembali</button>
          </div>
          {wipTableFilter !== null && (
            <div style={{marginBottom: 12}}>
              <span className="badge badge-green" style={{fontSize:14, minWidth:0, padding:'4px 16px'}}>
                Filter: {filterLabel}
              </span>
              <button className="btn" style={{marginLeft: 12, fontSize:12, padding:'2px 10px'}} onClick={() => setWipTableFilter(null)}>Hapus Filter</button>
            </div>
          )}
          {wipTableLoading ? (
            <DashboardLoading loading={true} />
          ) : (
            <WipTable data={filteredData} />
          )}
        </main>
      </div>
    );
  }

  // --- Fulfillment By Department Chart Data (Stacked Bar, same as Active WIP Histogram) ---
  const fulfillmentDeptChartData = {
    labels: fulfillmentDeptData.map(d => d.Dept),
    datasets: [
      {
        label: 'Release',
        data: fulfillmentDeptData.map(d => d.Release),
        backgroundColor: '#38e6c5',
        borderColor: '#38e6c5',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'Karantina',
        data: fulfillmentDeptData.map(d => d.Karantina),
        backgroundColor: '#ffb347',
        borderColor: '#ffb347',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
      {
        label: 'Menunggu Proses',
        data: fulfillmentDeptData.map(d => d.MenungguProses),
        backgroundColor: '#6a5acd',
        borderColor: '#6a5acd',
        borderWidth: 1,
        borderRadius: 6,
        barThickness: 30,
        stack: 'stack1',
        type: 'bar',
      },
    ],
  };
  const fulfillmentDeptChartOptions = {
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
          // Show all department data in a custom tooltip
          title: (ctx) => {
            // Show department name as title
            if (ctx && ctx.length > 0) {
              // ctx[0].dataIndex is the department index
              const idx = ctx[0].dataIndex;
              const d = fulfillmentDeptData[idx];
              return d && d.Dept ? d.Dept : '';
            }
            return '';
          },
          label: () => '', // We'll show nothing here, all info in afterBody
          afterBody: (ctx) => {
            // Find the department index from the hovered element
            if (!ctx || ctx.length === 0) return '';
            // ctx[0].dataIndex is the correct department index for the hovered bar
            const idx = ctx[0].dataIndex;
            const d = fulfillmentDeptData[idx];
            if (!d) return '';
            // Compose detailed info for this department
            const lines = [];
            lines.push(`Total: ${d.Total ?? 0} item`);
            lines.push(`Release: ${d.Release ?? 0} item`);
            lines.push(`Karantina: ${d.Karantina ?? 0} item`);
            lines.push(`Menunggu Proses: ${d.MenungguProses ?? 0} item`);
            if (d.Catatan) lines.push(`Catatan: ${d.Catatan}`);
            return lines;
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
  };

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area" style={{ position: 'relative' }}>
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="dashboard-tabs">
            <span className="active">Summary</span>
            <span className="disabled">Customize</span>
          </div>
        </div>
        <div className="dashboard-summary-row">
          <div className="summary-card">
            <div className="summary-title">Target Fulfillment</div>
            <div className="summary-value">
              {ofSummaryLoading ? <span className="summary-loading">...</span> : (ofSummary?.Total ?? 0)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Produk Release</div>
            <div className="summary-value">
              {ofSummaryLoading ? <span className="summary-loading">...</span> : (ofSummary?.Release ?? 0)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Proses Karantina</div>
            <div className="summary-value">
              {ofSummaryLoading ? <span className="summary-loading">...</span> : (ofSummary?.Karantina ?? 0)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-title">WIP Terlambat</div>
            <div className="summary-value">{wipTerlambatCount}</div>
          </div>
          <div className="summary-card summary-card-clickable" style={{cursor:'pointer'}} onClick={handleShowWipTable}>
            <div className="summary-title">Total WIP</div>
            <div className="summary-value">{wipData.length}</div>
          </div>
        </div>
        <div className="dashboard-main-row">
          <div className="dashboard-chart-card">
            <div className="chart-title" style={{ position: 'relative' }}>
              <span
                className="chart-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
                onClick={() => setChartDropdownOpen(open => !open)}
                tabIndex={0}
              >
                {orderChartType === 'department' ? 'Fulfillment By Department' : 'Order Fulfillment By Category'}
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
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {orderChartType === 'department' ? (
                fulfillmentDeptLoading ? (
                  <DashboardLoading loading={true} />
                ) : (
                  <Bar data={fulfillmentDeptChartData} options={fulfillmentDeptChartOptions} />
                )
              ) : (
                fulfillmentLoading ? (
                  <DashboardLoading loading={true} />
                ) : (
                  <Bar data={fulfillmentChartData} options={fulfillmentChartOptions} />
                )
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
                      hover: { ...wipHistogramBarOptions.hover, onHover: (e, el) => {
                        e.native.target.style.cursor = el && el.length ? 'pointer' : 'default';
                      }},
                    }}
                  />
                )}
                {wipDropdownValue === 'department' && (
                  <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#aaa',fontSize:18,fontWeight:500}}>
                    {/* Placeholder for WIP Department Tracker */}
                    WIP Department Tracker (coming soon)
                  </div>
                )}
                {wipDropdownValue === 'category' && (
                  <div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:'#aaa',fontSize:18,fontWeight:500}}>
                    {/* Placeholder for WIP Category Progress */}
                    WIP Category Progress (coming soon)
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="dashboard-ppe-row">
          <div className="ppe-unified-card">
            <div className="ppe-stats">
              <div className="ppe-stats-title ppe-title-dropdown">
                <span
                  className="ppe-title-clickable"
                  onClick={() => setPpeDropdownOpen(p => !p)}
                  tabIndex={0}
                  style={{ cursor: 'pointer', color: '#4f8cff', fontWeight: 600 }}
                >
                  {ppeMode === 'pie' ? 'Laporan PPE Bulanan' : 'Laporan PPE'}
                  <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
                </span>
                {ppeDropdownOpen && (
                  <div className="ppe-dropdown">
                    <div onClick={() => handlePpeModeChange('line')}>Laporan PPE</div>
                    <div onClick={() => handlePpeModeChange('pie')}>Laporan PPE Bulanan</div>
                  </div>
                )}
              </div>
              <ul className="ppe-stats-list">
                <li><span className="ppe-dot ppe-dot-blue"></span>Jumlah Laporan: <b>{ppeJumlahLaporan[ppeJumlahLaporan.length-1]}</b></li>
                <li><span className="ppe-dot ppe-dot-orange"></span>Menunggu Approval: <b>{ppeMenungguApproval[ppeMenungguApproval.length-1]}</b></li>
                <li><span className="ppe-dot ppe-dot-green"></span>Proses Perbaikan: <b>{ppeProsesPerbaikan[ppeProsesPerbaikan.length-1]}</b></li>
                <li><span className="ppe-dot ppe-dot-purple"></span>Menunggu Konfirmasi: <b>{ppeMenungguKonfirmasi[ppeMenungguKonfirmasi.length-1]}</b></li>
                <li><span className="ppe-dot ppe-dot-darkgreen"></span>Perbaikan Selesai: <b>{ppePerbaikanSelesai[ppePerbaikanSelesai.length-1]}</b></li>
              </ul>
            </div>
            <div className="dashboard-ppe-chart"> 
            <div style={{ 
              width: '100%', 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              position: 'relative',
              marginTop:0,
              padding: 0,
            }}>
              <div 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {ppeMode === 'pie' ? (
                  <Pie key={ppeChartKey} data={ppePieData} options={{...ppePieOptions, plugins: {...ppePieOptions.plugins, legend: {position: 'top'}}, layout: {padding: 0}}} />
                ) : (
                  <Line key={ppeChartKey} data={ppeChartData} options={{
                    ...ppeChartOptions,
                    layout: {padding: 0},
                    scales: {
                      ...ppeChartOptions.scales,
                      x: {
                        ...ppeChartOptions.scales.x,
                        ticks: {
                          ...ppeChartOptions.scales.x?.ticks,
                          autoSkip: false,
                          maxRotation: 0,
                          minRotation: 0,
                        }
                      }
                    }
                  }} />
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
        {loadingOverlay}
      </main>
    </div>
  )
}

export default App
