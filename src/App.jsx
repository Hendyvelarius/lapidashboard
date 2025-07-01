import { useState } from 'react'
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

// Fake HR dashboard data
const summaryData = {
  totalAbsence: 18,
  pendingMeetings: 3,
  totalEmployees: 32,
  newHires: 2,
  avgAbsence: 1.2,
}

// Generate incremental sum for absence chart
const absencePerDay = [2, 1, 0, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 2, 1, 0, 0, 1, 0, 0, 2, 1];
const incrementalAbsence = absencePerDay.reduce((acc, curr) => {
  acc.push((acc.length ? acc[acc.length - 1] : 0) + curr);
  return acc;
}, []);

const absenceChartData = {
  labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()), // Only day of the month
  datasets: [
    {
      label: 'Absence Count',
      data: incrementalAbsence,
      fill: true,
      backgroundColor: 'rgba(79,140,255,0.15)',
      borderColor: '#4f8cff',
      tension: 0.3,
      pointRadius: 2,
    },
  ],
}

const absenceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, stepSize: 1, title: { display: true, text: 'Jumlah Absen' } },
    x: { title: { display: true, text: 'Tanggal' } },
  },
}

const pendingMeetings = [
  { subject: 'Pengumuman Aturan Baru HRD', date: '2025-06-20', time: '10:00', with: 'HRD' },
  { subject: 'Performance Review', date: '2025-06-22', time: '14:00', with: 'Hendy Wijaya' },
  { subject: 'Peringatan Terlambat', date: '2025-06-25', time: '09:00', with: 'Kasmian' },
]

const recentAbsences = [
  { name: 'Gunawan', jobTitle: 'Supervisor', reason: 'Health Checkup', date: '2025-06-18' },
  { name: 'Hendy', jobTitle: 'Engineer', reason: 'Kebanjiran', date: '2025-06-17' },
  { name: 'Melvin', jobTitle: 'Engineer', reason: 'Kosan Mati Lampu', date: '2025-06-16' },
  { name: 'Kevin', jobTitle: 'Intern', reason: 'Duit Habis', date: '2025-06-15' },
  { name: 'Kevin', jobTitle: 'Intern', reason: 'Jatoh Dari Sepeda', date: '2025-06-14' },
]

const employeeAbsenceData = [
  { name: 'Gunawan', total: 1 },
  { name: 'Hendy', total: 2 },
  { name: 'Melvin', total: 3 },
  { name: 'Kevin', total: 1 },
  { name: 'Seven', total: 2 },
  { name: 'Wahyu', total: 1 },
  { name: 'Jeli', total: 2 },
  { name: 'Hardian', total: 1 },
  { name: 'Budi', total: 1 },
  { name: 'Amir', total: 1 },
]

const employeeAbsenceChartData = {
  labels: employeeAbsenceData.map(e => e.name),
  datasets: [
    {
      label: 'Total Absence',
      data: employeeAbsenceData.map(e => e.total),
      backgroundColor: 'rgba(56,230,197,0.5)',
      borderColor: '#38e6c5',
      borderWidth: 2,
    },
  ],
}

const employeeAbsenceChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, stepSize: 1, title: { display: true, text: 'Total Absence' } },
    x: { title: { display: true, text: 'Employee' } },
  },
}

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
const wipLabels = ['Total', 'Penyediaan', 'Produksi', 'Packaging', 'Labeling', 'Transport']
const wipRaw = [
  1200, // Total
  300,  // Penyediaan
  350,  // Produksi
  250,  // Packaging
  180,  // Labeling
  120   // Transport
]
const wipBarData = {
  labels: wipLabels,
  datasets: [
    {
      label: 'Jumlah WIP',
      data: wipRaw,
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

function App() {
  const [chartType, setChartType] = useState('monthly')
  const [chartDropdownOpen, setChartDropdownOpen] = useState(false)
  const [sideCardType, setSideCardType] = useState('meeting')
  const [ppeDropdownOpen, setPpeDropdownOpen] = useState(false)
  const [ppeMode, setPpeMode] = useState('line')
  const [ppeChartKey, setPpeChartKey] = useState(0)
  const [orderChartType, setOrderChartType] = useState('order');
  
  function handlePpeModeChange(mode) {
    setPpeMode(mode)
    setPpeDropdownOpen(false)
    setPpeChartKey(prev => prev + 1)
  }

  const avgFulfillment = Math.round(orderFulfillmentPercent.reduce((a, b) => a + b, 0) / orderFulfillmentPercent.length);

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area">
        <div className="dashboard-header">
          <h1>Dashboard</h1>
          <div className="dashboard-tabs">
            <span className="active">Summary</span>
            <span className="disabled">Customize</span>
          </div>
        </div>
        <div className="dashboard-summary-row">
          <div className="summary-card">
            <div className="summary-title">Jumlah Absen</div>
            <div className="summary-value">{summaryData.totalAbsence}</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Jadwal Meeting</div>
            <div className="summary-value">{summaryData.pendingMeetings}</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Jumlah Pegawai Divisi</div>
            <div className="summary-value">{summaryData.totalEmployees}</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Rata-rata Fulfillment</div>
            <div className="summary-value">{avgFulfillment}%</div>
          </div>
          <div className="summary-card">
            <div className="summary-title">Total WIP</div>
            <div className="summary-value">{wipRaw[0]}</div>
          </div>
        </div>
        <div className="dashboard-main-row">
          <div className="dashboard-chart-card">
            <div className="chart-title chart-title-dropdown">
              <span
                className="chart-title-clickable"
                onClick={() => setChartDropdownOpen((open) => !open)}
                tabIndex={0}
                style={{ cursor: 'pointer', color: '#4f8cff', fontWeight: 600 }}
              >
                {chartType === 'employee'
                  ? 'Grafik Absen Per Karyawan'
                  : chartType === 'order'
                    ? orderChartType === 'order'
                      ? 'Order Fulfillment'
                      : orderCategoryCharts.find(c => c.key === orderChartType)?.label || 'Order Fulfillment'
                    : 'Grafik Absen Bulanan'}
                <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
              </span>
              {chartDropdownOpen && (
                <div className="chart-dropdown">
                  {/* <div onClick={() => { setChartType('monthly'); setChartDropdownOpen(false); }}>Grafik Absen Bulanan</div>
                  <div onClick={() => { setChartType('employee'); setChartDropdownOpen(false); }}>Grafik Absen Per Karyawan</div> */}
                  <div onClick={() => { setChartType('order'); setOrderChartType('order'); setChartDropdownOpen(false); }}>Order Fulfillment</div>
                  {orderCategories.map(cat => (
                    <div key={cat} onClick={() => { setChartType('order'); setOrderChartType(cat); setChartDropdownOpen(false); }}>
                      {orderCategoryCharts.find(c => c.key === cat)?.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              {chartType === 'employee' ? (
                <Bar data={employeeAbsenceChartData} options={employeeAbsenceChartOptions} />
              ) : chartType === 'order' ? (
                orderChartType === 'order' ? (
                  <Bar data={orderFulfillmentChartData} options={orderFulfillmentChartOptions} />
                ) : (
                  <Line data={orderCategoryCharts.find(c => c.key === orderChartType)?.chartData} options={orderCategoryCharts.find(c => c.key === orderChartType)?.chartOptions} />
                )
              ) : (
                <Line data={absenceChartData} options={absenceChartOptions} />
              )}
            </div>
          </div>
          <div className="dashboard-side-card">
            <div className="side-card-title side-card-title-dropdown">
              <span
                className="side-card-title-clickable"
                onClick={() => setSideCardType(sideCardType === 'dropdown' ? 'meeting' : 'dropdown')}
                tabIndex={0}
                style={{ cursor: 'pointer', color: '#4f8cff', fontWeight: 600 }}
              >
                {sideCardType === 'absen'
                  ? 'Absen Terakhir'
                  : sideCardType === 'wip'
                  ? 'Laporan WIP'
                  : 'Jadwal Meeting'}
                <span style={{ marginLeft: 8, fontSize: 16 }}>▼</span>
              </span>
              {sideCardType === 'dropdown' && (
                <div className="side-dropdown">
                  <div onClick={() => setSideCardType('meeting')}>Jadwal Meeting</div>
                  <div onClick={() => setSideCardType('absen')}>Absen Terakhir</div>
                  <div onClick={() => setSideCardType('wip')}>Laporan WIP</div>
                </div>
              )}
            </div>
            {sideCardType === 'absen' ? (
              <ul className="meeting-list">
                {recentAbsences.map((row, idx) => (
                  <li key={idx}>
                    <div className="meeting-subject">{row.name} ({row.jobTitle})</div>
                    <div className="meeting-meta">{row.reason} &bull; {row.date}</div>
                  </li>
                ))}
              </ul>
            ) : sideCardType === 'wip' ? (
              <div style={{ 
                padding: '0', 
                flex: 1, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                height: '100%'
              }}>
                <div style={{ width: '100%', height: '350px' }}>
                  <Bar data={wipBarData} options={wipBarOptions} />
                </div>
              </div>
            ) : (
              <ul className="meeting-list">
                {pendingMeetings.map((m, i) => (
                  <li key={i}>
                    <div className="meeting-subject">{m.subject}</div>
                    <div className="meeting-meta">{m.date} &bull; {m.time} &bull; {m.with}</div>
                  </li>
                ))}
              </ul>
            )}
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
      </main>
    </div>
  )
}

export default App
