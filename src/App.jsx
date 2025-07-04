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

// --- Order Fulfillment Data ---
const orderCategories = [
  'OralPowder',
  'OralLiquid',
  'OralDrop',
  'SolidTablet',
  'SolidCapsule',
  'PowderInjection',
  'VolumeInjection',
]
const TargetOrder = 10000
const orderData = {
  OralPowder: [320, 350, 300, 310, 340, 330, 360, 370, 320, 340, 350, 360, 330, 340, 350, 360, 340, 350, 360, 370, 340, 350, 360, 370, 340, 350, 360, 370, 340, 350],
  OralLiquid: [300, 320, 310, 330, 340, 320, 310, 330, 340, 320, 310, 330, 340, 320, 310, 330, 340, 320, 310, 330, 340, 320, 310, 330, 340, 320, 310, 330, 340, 320],
  OralDrop: [250, 260, 270, 280, 290, 260, 270, 280, 290, 260, 270, 280, 290, 260, 270, 280, 290, 260, 270, 280, 290, 260, 270, 280, 290, 260, 270, 280, 290, 260],
  SolidTablet: [400, 420, 410, 430, 440, 420, 410, 430, 440, 420, 410, 430, 440, 420, 410, 430, 440, 420, 410, 430, 440, 420, 410, 430, 440, 420, 410, 430, 440, 420],
  SolidCapsule: [380, 390, 400, 410, 420, 390, 400, 410, 420, 390, 400, 410, 420, 390, 400, 410, 420, 390, 400, 410, 420, 390, 400, 410, 420, 390, 400, 410, 420, 390],
  PowderInjection: [200, 210, 220, 230, 240, 210, 220, 230, 240, 210, 220, 230, 240, 210, 220, 230, 240, 210, 220, 230, 240, 210, 220, 230, 240, 210, 220, 230, 240, 210],
  VolumeInjection: [150, 160, 170, 180, 190, 160, 170, 180, 190, 160, 170, 180, 190, 160, 170, 180, 190, 160, 170, 180, 190, 160, 170, 180, 190, 160, 170, 180, 190, 160],
}
// Calculate fulfillment percentage for each category
const orderFulfillmentPercent = orderCategories.map(cat => {
  const total = orderData[cat].reduce((a, b) => a + b, 0)
  return Math.round((total / TargetOrder) * 100)
})
const orderFulfillmentChartData = {
  labels: orderCategories,
  datasets: [
    {
      label: 'Order Fulfillment (%)',
      data: orderFulfillmentPercent,
      backgroundColor: [
        '#4f8cff', '#38e6c5', '#ffb347', '#6a5acd', '#43a047', '#e57373', '#ba68c8'
      ],
      borderColor: '#fff',
      borderWidth: 2,
    },
  ],
}
const orderFulfillmentChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => `${ctx.parsed.y}% terpenuhi`
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100,
      title: { display: true, text: 'Fulfillment (%)' },
      ticks: { stepSize: 10 }
    },
    x: { title: { display: false, text: 'Product Category' } },
  },
}

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
  // Subtract 180 from all durations before bucketing
  const buckets = [0, 0, 0, 0, 0];
  data.forEach(item => {
    let dur = Number(item.duration) - 180;
    if (isNaN(dur) || dur < 0) dur = 0;
    if (dur <= 7) buckets[0]++;
    else if (dur <= 14) buckets[1]++;
    else if (dur <= 28) buckets[2]++;
    else if (dur <= 56) buckets[3]++;
    else buckets[4]++;
  });
  return buckets;
}


function App() {
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

  const orderCategoryCharts = orderCategories.map((cat, idx) => {
    const label =
      cat === 'OralPowder' ? 'Oral Powder' :
      cat === 'OralLiquid' ? 'Oral Liquid' :
      cat === 'OralDrop' ? 'Oral Drop' :
      cat === 'SolidTablet' ? 'Solid Tablet' :
      cat === 'SolidCapsule' ? 'Solid Capsule' :
      cat === 'PowderInjection' ? 'Powder Injection' :
      cat === 'VolumeInjection' ? 'Volume Injection' : cat;
    const data = getCumulative(orderData[cat]);
    return {
      key: cat,
      label,
      chartData: {
        labels: Array.from({ length: data.length }, (_, i) => (i + 1).toString()),
        datasets: [
          {
            label: label + ' (Cumulative)',
            data,
            backgroundColor: '#4f8cff',
            borderColor: '#4f8cff',
            fill: true,
            tension: 0.3,
            pointRadius: 2,
          },
          {
            label: 'Target Order',
            data: Array(data.length).fill(TargetOrder),
            borderColor: '#ffb347',
            borderDash: [8, 4],
            borderWidth: 2,
            pointRadius: 0,
            type: 'line',
            fill: false,
          },
        ],
      },
      chartOptions: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: 'Cumulative Order' } },
          x: { title: { display: true, text: 'Tanggal' } },
        },
      },
    };
  });

  // Count WIP items with duration > 38
  const wipTerlambatCount = wipData.filter(item => (Number(item.duration)-180) > 38).length;

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
        let dur = Number(item.duration) - 180;
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
            <div className="summary-title">Lorem Ipsum</div>
            <div className="summary-value">0</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Lorem Ipsum</div>
            <div className="summary-value">0</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Lorem Ipsum</div>
            <div className="summary-value">0</div>
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
            <div className="chart-title">
              <span
                className="chart-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600 }}
              >
                {orderChartType === 'order'
                  ? 'Order Fulfillment'
                  : orderCategoryCharts.find(c => c.key === orderChartType)?.label || 'Order Fulfillment'}
              </span>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {orderChartType === 'order' ? (
                <Bar data={orderFulfillmentChartData} options={orderFulfillmentChartOptions} />
              ) : (
                <Line data={orderCategoryCharts.find(c => c.key === orderChartType)?.chartData} options={orderCategoryCharts.find(c => c.key === orderChartType)?.chartOptions} />
              )}
            </div>
          </div>
          <div className="dashboard-side-card">
            <div className="side-card-title">
              <span
                className="side-card-title-clickable"
                style={{ color: '#4f8cff', fontWeight: 600 }}
              >
                Histogram WIP Aktif
              </span>
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
