import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Doughnut } from 'react-chartjs-2';
import Sidebar from './Sidebar';
import Modal from './Modal';
import DashboardLoading from './DashboardLoading';
import { loadQCCache, saveQCCache, clearQCCache, isQCCacheValid } from '../utils/dashboardCache';
import { apiUrl, apiUrlWithRefresh } from '../api';
import './QCDashboard.css';

ChartJS.register(ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend);

// ============================================
// Helper functions
// ============================================

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatNumber = (num) => {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('id-ID');
};

const getAgingColor = (days) => {
  if (days <= 7) return 'green';
  if (days <= 14) return 'yellow';
  if (days <= 30) return 'orange';
  return 'red';
};

const getAgingClass = (days) => {
  if (days > 30) return 'qc-overdue';
  if (days > 14) return 'qc-warning';
  return '';
};

const periodToLabel = (period) => {
  if (!period) return '';
  const year = period.slice(0, 4);
  const month = parseInt(period.slice(4, 6), 10);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[month - 1]} ${year}`;
};

const getCurrentPeriod = () => {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
};

// Generate period options (last 12 months)
const getPeriodOptions = () => {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`;
    options.push({ value: val, label: periodToLabel(val) });
  }
  return options;
};

const ROWS_PER_PAGE = 25;

// ============================================
// Main Component
// ============================================

const QCDashboard = () => {
  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [inProcessData, setInProcessData] = useState([]);
  const [periodData, setPeriodData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState('inprocess');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [detailModal, setDetailModal] = useState({ open: false, item: null });
  const [drilldownModal, setDrilldownModal] = useState({ open: false, title: '', items: [], type: '' });

  const periodOptions = useMemo(() => getPeriodOptions(), []);

  // ============================================
  // Data Fetching
  // ============================================

  const fetchData = useCallback(async (skipCache = false) => {
    setLoading(true);
    setError(null);

    // Try cache first
    if (!skipCache) {
      const cached = loadQCCache();
      if (cached) {
        setSummaryData(cached.summaryData);
        setInProcessData(cached.inProcessData || []);
        setPeriodData(cached.periodData || []);
        setLastRefreshTime(cached.fetchTime);
        setLoading(false);
        return;
      }
    }

    try {
      const buildUrl = (path) => skipCache ? apiUrlWithRefresh(path, true) : apiUrl(path);

      // Fetch all three endpoints in parallel
      const [summaryRes, inProcessRes, periodRes] = await Promise.all([
        fetch(buildUrl('/api/qcSummary')),
        fetch(buildUrl('/api/qcInProcess')),
        fetch(buildUrl(`/api/qcByPeriod?period=${selectedPeriod}`))
      ]);

      const [summaryJson, inProcessJson, periodJson] = await Promise.all([
        summaryRes.json(),
        inProcessRes.json(),
        periodRes.json()
      ]);

      const summary = summaryJson.data;
      const inProcess = inProcessJson.data || [];
      const period = periodJson.data || [];

      setSummaryData(summary);
      setInProcessData(inProcess);
      setPeriodData(period);
      setLastRefreshTime(new Date());

      // Save to cache
      saveQCCache({ summaryData: summary, inProcessData: inProcess, periodData: period });
    } catch (err) {
      console.error('Error fetching QC data:', err);
      setError('Gagal mengambil data QC. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  // Fetch period data when period changes
  const fetchPeriodData = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/qcByPeriod?period=${selectedPeriod}`));
      const json = await res.json();
      setPeriodData(json.data || []);
    } catch (err) {
      console.error('Error fetching period data:', err);
    }
  }, [selectedPeriod]);

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!loading) {
      fetchPeriodData();
    }
  }, [selectedPeriod]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset page when tab/search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  // ============================================
  // Sorting & Filtering
  // ============================================

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return <span className="sort-indicator">↕</span>;
    return <span className="sort-indicator active">{sortConfig.direction === 'asc' ? '▲' : '▼'}</span>;
  };

  const applySort = (data) => {
    if (!sortConfig.key) return data;
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      // Handle nulls
      if (aVal == null) aVal = '';
      if (bVal == null) bVal = '';
      // Numeric sort
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      // String sort
      aVal = String(aVal).toLowerCase();
      bVal = String(bVal).toLowerCase();
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const filterData = (data) => {
    if (!searchQuery.trim()) return data;
    const q = searchQuery.toLowerCase();
    return data.filter((item) =>
      (item.DNc_No && item.DNc_No.toLowerCase().includes(q)) ||
      (item.Item_Name && item.Item_Name.toLowerCase().includes(q)) ||
      (item.DNc_ItemID && item.DNc_ItemID.toLowerCase().includes(q)) ||
      (item.DNc_SuppName && item.DNc_SuppName.toLowerCase().includes(q)) ||
      (item.DNC_BatchNo && item.DNC_BatchNo.toLowerCase().includes(q))
    );
  };

  // Current display data
  const currentTableData = activeTab === 'inprocess' ? inProcessData : periodData;
  const filteredData = useMemo(() => applySort(filterData(currentTableData)), [currentTableData, searchQuery, sortConfig]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // ============================================
  // KPI Data
  // ============================================

  const kpiData = useMemo(() => {
    if (!summaryData) return { pending: 0, avgDays: 0, completed: 0, rejectPct: 0 };
    const currentMonth = summaryData.monthly?.find((m) => m.period === summaryData.currentPeriod);
    return {
      pending: summaryData.totalInQC || 0,
      avgDays: summaryData.turnaround?.avg_days || 0,
      completed: currentMonth?.completed || 0,
      rejectPct: currentMonth?.reject_pct || 0,
      totalRejected: currentMonth?.total_rejected || 0,
      totalReleased: currentMonth?.total_released || 0,
      hasReject: currentMonth?.has_reject || 0
    };
  }, [summaryData]);

  // ============================================
  // KPI Click Handlers (drilldowns)
  // ============================================

  const handleKPIPendingClick = () => {
    if (!summaryData?.aging) return;
    setDrilldownModal({
      open: true,
      title: `Items Currently In QC (${kpiData.pending})`,
      type: 'aging',
      items: summaryData.aging.map((a) => ({ name: a.aging_bucket, count: a.count }))
    });
  };

  const handleKPITurnaroundClick = () => {
    if (!summaryData?.turnaround) return;
    const t = summaryData.turnaround;
    setDrilldownModal({
      open: true,
      title: `QC Turnaround - ${periodToLabel(summaryData.currentPeriod)}`,
      type: 'turnaround',
      items: [
        { name: 'Average', count: `${t.avg_days || 0} hari` },
        { name: 'Minimum', count: `${t.min_days || 0} hari` },
        { name: 'Maximum', count: `${t.max_days || 0} hari` }
      ]
    });
  };

  const handleKPICompletedClick = () => {
    if (!summaryData?.monthly) return;
    setDrilldownModal({
      open: true,
      title: 'Monthly Completion Trend',
      type: 'completed',
      items: summaryData.monthly.map((m) => ({ name: periodToLabel(m.period), count: m.completed }))
    });
  };

  const handleKPIRejectClick = () => {
    if (!summaryData?.monthly) return;
    setDrilldownModal({
      open: true,
      title: 'Monthly Reject Rate Trend',
      type: 'reject',
      items: summaryData.monthly.map((m) => ({
        name: periodToLabel(m.period),
        count: `${m.reject_pct || 0}%  (${formatNumber(m.total_rejected)} rejected)`
      }))
    });
  };

  // ============================================
  // Chart click handlers
  // ============================================

  const handleAgingChartClick = (evt, elements) => {
    if (!elements.length || !summaryData?.aging) return;
    const idx = elements[0].index;
    const bucket = summaryData.aging[idx];
    if (!bucket) return;
    // Filter inProcessData for items matching this aging bucket
    const bucketRanges = { '0-3 days': [0, 3], '4-7 days': [4, 7], '8-14 days': [8, 14], '15-30 days': [15, 30], '30+ days': [31, 99999] };
    const range = bucketRanges[bucket.aging_bucket];
    if (!range) return;
    const items = inProcessData.filter((d) => d.DaysInQC >= range[0] && d.DaysInQC <= range[1]);
    setDrilldownModal({
      open: true,
      title: `Items In QC: ${bucket.aging_bucket} (${items.length})`,
      type: 'aging-detail',
      items: items.map((d) => ({
        name: `${d.DNc_ItemID} - ${d.Item_Name || 'N/A'}`,
        count: `${d.DaysInQC}d`,
        raw: d
      }))
    });
  };

  const handleSupplierChartClick = (evt, elements) => {
    if (!elements.length || !summaryData?.topSuppliers) return;
    const idx = elements[0].index;
    const supplier = summaryData.topSuppliers[idx];
    if (!supplier) return;
    const items = inProcessData.filter((d) => d.DNc_SuppName === supplier.supplier);
    setDrilldownModal({
      open: true,
      title: `${supplier.supplier} - Items In QC (${items.length})`,
      type: 'supplier-detail',
      items: items.map((d) => ({
        name: `${d.DNc_ItemID} - ${d.Item_Name || 'N/A'}`,
        count: `${d.DaysInQC}d`,
        raw: d
      }))
    });
  };

  // ============================================
  // Chart Configurations
  // ============================================

  const agingChartData = useMemo(() => {
    if (!summaryData?.aging) return null;
    const order = ['0-3 days', '4-7 days', '8-14 days', '15-30 days', '30+ days'];
    const sorted = order.map((b) => summaryData.aging.find((a) => a.aging_bucket === b) || { aging_bucket: b, count: 0 });
    return {
      labels: sorted.map((a) => a.aging_bucket),
      datasets: [{
        data: sorted.map((a) => a.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',   // green
          'rgba(59, 130, 246, 0.8)',   // blue
          'rgba(245, 158, 11, 0.8)',   // yellow
          'rgba(249, 115, 22, 0.8)',   // orange
          'rgba(239, 68, 68, 0.8)',    // red
        ],
        borderColor: ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
        borderWidth: 2
      }]
    };
  }, [summaryData]);

  const agingChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%',
    onClick: handleAgingChartClick,
    plugins: {
      legend: {
        position: 'right',
        labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} items`
        }
      }
    }
  };

  const dailyFlowChartData = useMemo(() => {
    if (!summaryData?.dailyIntake || !summaryData?.dailyCompletions) return null;
    // Build a union of all dates
    const dateMap = {};
    summaryData.dailyIntake.forEach((d) => {
      const key = new Date(d.entry_date).toISOString().slice(0, 10);
      dateMap[key] = { ...(dateMap[key] || {}), intake: d.cnt };
    });
    summaryData.dailyCompletions.forEach((d) => {
      const key = new Date(d.completion_date).toISOString().slice(0, 10);
      dateMap[key] = { ...(dateMap[key] || {}), completed: d.cnt };
    });
    const dates = Object.keys(dateMap).sort();
    return {
      labels: dates.map((d) => {
        const dt = new Date(d);
        return `${dt.getDate()}/${dt.getMonth() + 1}`;
      }),
      datasets: [
        {
          label: 'Masuk QC',
          data: dates.map((d) => dateMap[d].intake || 0),
          backgroundColor: 'rgba(229, 115, 115, 0.7)',
          borderColor: '#e57373',
          borderWidth: 1,
          borderRadius: 4,
          order: 2
        },
        {
          label: 'Selesai QC',
          data: dates.map((d) => dateMap[d].completed || 0),
          backgroundColor: 'rgba(102, 187, 106, 0.7)',
          borderColor: '#66bb6a',
          borderWidth: 1,
          borderRadius: 4,
          order: 1
        }
      ]
    };
  }, [summaryData]);

  const dailyFlowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } }
    }
  };

  const monthlyTrendData = useMemo(() => {
    if (!summaryData?.monthly) return null;
    const data = summaryData.monthly;
    return {
      labels: data.map((m) => periodToLabel(m.period)),
      datasets: [
        {
          label: 'Total',
          data: data.map((m) => m.total),
          borderColor: '#4f8cff',
          backgroundColor: 'rgba(79, 140, 255, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#4f8cff'
        },
        {
          label: 'Completed',
          data: data.map((m) => m.completed),
          borderColor: '#22c55e',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          fill: true,
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#22c55e'
        },
        {
          label: 'Reject Rate %',
          data: data.map((m) => m.reject_pct || 0),
          borderColor: '#ef4444',
          borderDash: [5, 5],
          tension: 0.3,
          pointRadius: 4,
          pointBackgroundColor: '#ef4444',
          yAxisID: 'y1'
        }
      ]
    };
  }, [summaryData]);

  const monthlyTrendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            if (ctx.dataset.yAxisID === 'y1') return `${ctx.dataset.label}: ${ctx.raw}%`;
            return `${ctx.dataset.label}: ${formatNumber(ctx.raw)}`;
          }
        }
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, position: 'left', ticks: { font: { size: 10 } } },
      y1: { beginAtZero: true, position: 'right', max: 10, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 }, callback: (v) => `${v}%` } }
    }
  };

  const supplierChartData = useMemo(() => {
    if (!summaryData?.topSuppliers) return null;
    const data = summaryData.topSuppliers;
    return {
      labels: data.map((s) => s.supplier.length > 25 ? s.supplier.slice(0, 25) + '...' : s.supplier),
      datasets: [{
        label: 'Items In QC',
        data: data.map((s) => s.in_qc),
        backgroundColor: 'rgba(229, 115, 115, 0.7)',
        borderColor: '#e57373',
        borderWidth: 1,
        borderRadius: 4
      }]
    };
  }, [summaryData]);

  const supplierChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    onClick: handleSupplierChartClick,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (items) => {
            const idx = items[0]?.dataIndex;
            return summaryData?.topSuppliers?.[idx]?.supplier || '';
          }
        }
      }
    },
    scales: {
      x: { beginAtZero: true, ticks: { font: { size: 10 } } },
      y: { ticks: { font: { size: 10 } } }
    }
  };

  // ============================================
  // Render Detail Modal
  // ============================================

  const renderDetailModal = () => {
    const item = detailModal.item;
    if (!item) return null;
    return (
      <Modal open={detailModal.open} onClose={() => setDetailModal({ open: false, item: null })} title={`Detail: ${item.DNc_No}`}>
        <div className="qc-detail-modal-content">
          <div className="qc-detail-grid">
            <div className="qc-detail-item">
              <span className="qc-detail-label">DNC No</span>
              <span className="qc-detail-value">{item.DNc_No}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Item ID</span>
              <span className="qc-detail-value">{item.DNc_ItemID}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Item Name</span>
              <span className="qc-detail-value">{item.Item_Name || '-'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Item Group</span>
              <span className="qc-detail-value">{item.Item_Group || '-'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Supplier</span>
              <span className="qc-detail-value">{item.DNc_SuppName || '-'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Batch No</span>
              <span className="qc-detail-value">{item.DNC_BatchNo || '-'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Entry Date</span>
              <span className="qc-detail-value">{formatDate(item.DNc_Date)}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Inspection Date</span>
              <span className="qc-detail-value">{formatDate(item.DNc_InspectionDate)}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Sample By</span>
              <span className="qc-detail-value">{item.DNc_SampleBy || '-'}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Sample Date</span>
              <span className="qc-detail-value">{formatDate(item.DNc_SampleDate)}</span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Release Qty</span>
              <span className="qc-detail-value">
                {item.DNc_ReleaseQTY > 0 
                  ? <span className="qc-release-badge">{formatNumber(item.DNc_ReleaseQTY)} {item.DNc_UnitID}</span> 
                  : '-'}
              </span>
            </div>
            <div className="qc-detail-item">
              <span className="qc-detail-label">Reject Qty</span>
              <span className="qc-detail-value">
                {item.DNc_RejectQTY > 0 
                  ? <span className="qc-reject-badge">{formatNumber(item.DNc_RejectQTY)} {item.DNc_UnitID}</span>
                  : '-'}
              </span>
            </div>
            {item.DNC_tempellabelDate && (
              <>
                <div className="qc-detail-item">
                  <span className="qc-detail-label">Completion Date</span>
                  <span className="qc-detail-value">{formatDate(item.DNC_tempellabelDate)}</span>
                </div>
                <div className="qc-detail-item">
                  <span className="qc-detail-label">Turnaround</span>
                  <span className="qc-detail-value">{item.TurnaroundDays != null ? `${item.TurnaroundDays} hari` : '-'}</span>
                </div>
              </>
            )}
            {item.DaysInQC != null && !item.DNC_tempellabelDate && (
              <div className="qc-detail-item">
                <span className="qc-detail-label">Days In QC</span>
                <span className="qc-detail-value">
                  <span className={`qc-aging-badge ${getAgingColor(item.DaysInQC)}`}>{item.DaysInQC} hari</span>
                </span>
              </div>
            )}
          </div>
          {(item.DNc_ReleaseRemark || item.DNc_RejectRemark || item.alasan_Reject) && (
            <div className="qc-detail-remarks">
              <h4>Remarks</h4>
              {item.DNc_ReleaseRemark && item.DNc_ReleaseRemark !== '' && (
                <p><strong>Release:</strong> {item.DNc_ReleaseRemark}</p>
              )}
              {item.DNc_RejectRemark && item.DNc_RejectRemark !== '' && (
                <p><strong>Reject:</strong> {item.DNc_RejectRemark}</p>
              )}
              {item.alasan_Reject && item.alasan_Reject !== '' && (
                <p><strong>Alasan Reject:</strong> {item.alasan_Reject}</p>
              )}
            </div>
          )}
        </div>
      </Modal>
    );
  };

  // ============================================
  // Render Drilldown Modal
  // ============================================

  const renderDrilldownModal = () => {
    return (
      <Modal open={drilldownModal.open} onClose={() => setDrilldownModal({ open: false, title: '', items: [], type: '' })} title={drilldownModal.title}>
        <div className="qc-drilldown-list">
          {drilldownModal.items.map((item, idx) => (
            <div
              className="qc-drilldown-item"
              key={idx}
              onClick={() => {
                if (item.raw) {
                  setDrilldownModal({ open: false, title: '', items: [], type: '' });
                  setDetailModal({ open: true, item: item.raw });
                }
              }}
              style={{ cursor: item.raw ? 'pointer' : 'default' }}
            >
              <span className="qc-drilldown-name">{item.name}</span>
              <span className="qc-drilldown-count">{item.count}</span>
            </div>
          ))}
          {drilldownModal.items.length === 0 && (
            <div style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Tidak ada data.</div>
          )}
        </div>
      </Modal>
    );
  };

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="qc-dashboard">
        <Sidebar />
        <DashboardLoading loading={true} text="Loading QC Dashboard..." subtext="Mengambil data Quality Control..." coverContentArea />
      </div>
    );
  }

  if (error) {
    return (
      <div className="qc-dashboard">
        <Sidebar />
        <div className="qc-main-content">
          <div className="qc-content" style={{ justifyContent: 'center', alignItems: 'center' }}>
            <div style={{ textAlign: 'center', color: '#ef4444' }}>
              <h2>Error</h2>
              <p>{error}</p>
              <button className="qc-refresh-btn" onClick={() => fetchData(true)}>Coba Lagi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qc-dashboard">
      <Sidebar />
      <div className="qc-main-content">
        <div className="qc-content">

          {/* ====== Header ====== */}
          <div className="qc-header">
            <div className="qc-header-left">
              <h1><span>Quality Control</span> Dashboard</h1>
            </div>
            <div className="qc-header-right">
              <select
                className="qc-period-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {periodOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                className="qc-refresh-btn"
                onClick={() => { clearQCCache(); fetchData(true); }}
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>
                Refresh
              </button>
              {lastRefreshTime && (
                <span className="qc-last-refresh">
                  Updated: {new Date(lastRefreshTime).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          {/* ====== KPI Cards ====== */}
          <div className="qc-kpi-row">
            <div className="qc-kpi-card" onClick={handleKPIPendingClick} title="Klik untuk melihat detail aging">
              <div className="qc-kpi-icon pending">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Currently In QC</div>
                <div className="qc-kpi-value">{formatNumber(kpiData.pending)}</div>
                <div className="qc-kpi-sub">material menunggu release</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleKPITurnaroundClick} title="Klik untuk melihat detail turnaround">
              <div className="qc-kpi-icon turnaround">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Avg Turnaround</div>
                <div className="qc-kpi-value">{kpiData.avgDays} <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>hari</span></div>
                <div className="qc-kpi-sub">bulan {periodToLabel(summaryData?.currentPeriod)}</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleKPICompletedClick} title="Klik untuk melihat trend completion">
              <div className="qc-kpi-icon completed">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Completed This Month</div>
                <div className="qc-kpi-value">{formatNumber(kpiData.completed)}</div>
                <div className="qc-kpi-sub">material sudah release</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleKPIRejectClick} title="Klik untuk melihat trend reject">
              <div className="qc-kpi-icon rejected">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Reject Rate</div>
                <div className="qc-kpi-value">{kpiData.rejectPct}<span style={{ fontSize: '0.9rem', fontWeight: 500 }}>%</span></div>
                <div className="qc-kpi-sub">{formatNumber(kpiData.totalRejected)} rejected dari {formatNumber(kpiData.hasReject)} batch</div>
              </div>
            </div>
          </div>

          {/* ====== Charts Row 1: Aging Doughnut + Daily Flow ====== */}
          <div className="qc-charts-row">
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">QC Aging Distribution</div>
                  <div className="qc-chart-subtitle">Berapa lama material menunggu di QC</div>
                </div>
              </div>
              <div className="qc-chart-container">
                {agingChartData && <Doughnut data={agingChartData} options={agingChartOptions} />}
              </div>
            </div>
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">Daily QC Flow</div>
                  <div className="qc-chart-subtitle">Masuk vs Selesai - {periodToLabel(summaryData?.currentPeriod)}</div>
                </div>
              </div>
              <div className="qc-chart-container">
                {dailyFlowChartData && <Bar data={dailyFlowChartData} options={dailyFlowOptions} />}
              </div>
            </div>
          </div>

          {/* ====== Charts Row 2: Monthly Trend + Supplier ====== */}
          <div className="qc-charts-row">
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">Monthly QC Trend</div>
                  <div className="qc-chart-subtitle">Volume, completion, dan reject rate 6 bulan terakhir</div>
                </div>
              </div>
              <div className="qc-chart-container">
                {monthlyTrendData && <Line data={monthlyTrendData} options={monthlyTrendOptions} />}
              </div>
            </div>
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">Pending QC by Supplier</div>
                  <div className="qc-chart-subtitle">Top 10 supplier dengan material terbanyak di QC</div>
                </div>
              </div>
              <div className="qc-chart-container">
                {supplierChartData && <Bar data={supplierChartData} options={supplierChartOptions} />}
              </div>
            </div>
          </div>

          {/* ====== Tables Section ====== */}
          <div className="qc-tables-section">
            <div className="qc-tabs">
              <button className={`qc-tab ${activeTab === 'inprocess' ? 'active' : ''}`} onClick={() => setActiveTab('inprocess')}>
                In Process ({formatNumber(inProcessData.length)})
              </button>
              <button className={`qc-tab ${activeTab === 'period' ? 'active' : ''}`} onClick={() => setActiveTab('period')}>
                Period: {periodToLabel(selectedPeriod)} ({formatNumber(periodData.length)})
              </button>
            </div>

            <div className="qc-table-controls">
              <input
                className="qc-search-input"
                type="text"
                placeholder="Cari DNC No, Item, Supplier, Batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="qc-table-info">
                Menampilkan {Math.min(filteredData.length, ROWS_PER_PAGE * currentPage)} dari {filteredData.length} item
              </span>
            </div>

            <div className="qc-table-wrapper">
              <table className="qc-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('DNc_No')}>DNC No {sortIndicator('DNc_No')}</th>
                    <th onClick={() => handleSort('DNc_ItemID')}>Item ID {sortIndicator('DNc_ItemID')}</th>
                    <th onClick={() => handleSort('Item_Name')}>Item Name {sortIndicator('Item_Name')}</th>
                    <th onClick={() => handleSort('DNc_SuppName')}>Supplier {sortIndicator('DNc_SuppName')}</th>
                    <th onClick={() => handleSort('DNC_BatchNo')}>Batch No {sortIndicator('DNC_BatchNo')}</th>
                    <th onClick={() => handleSort('DNc_Date')}>Entry Date {sortIndicator('DNc_Date')}</th>
                    {activeTab === 'inprocess' ? (
                      <th onClick={() => handleSort('DaysInQC')}>Days In QC {sortIndicator('DaysInQC')}</th>
                    ) : (
                      <>
                        <th onClick={() => handleSort('DNC_tempellabelDate')}>Completion {sortIndicator('DNC_tempellabelDate')}</th>
                        <th onClick={() => handleSort('TurnaroundDays')}>Turnaround {sortIndicator('TurnaroundDays')}</th>
                      </>
                    )}
                    <th onClick={() => handleSort('DNc_ReleaseQTY')}>Release {sortIndicator('DNc_ReleaseQTY')}</th>
                    <th onClick={() => handleSort('DNc_RejectQTY')}>Reject {sortIndicator('DNc_RejectQTY')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedData.length === 0 ? (
                    <tr><td colSpan={activeTab === 'inprocess' ? 9 : 10} style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Tidak ada data ditemukan.</td></tr>
                  ) : (
                    paginatedData.map((item, idx) => (
                      <tr
                        key={`${item.DNc_No}-${idx}`}
                        className={activeTab === 'inprocess' ? getAgingClass(item.DaysInQC) : (item.DNc_RejectQTY > 0 ? 'qc-warning' : '')}
                        onClick={() => setDetailModal({ open: true, item })}
                        title="Klik untuk melihat detail"
                      >
                        <td style={{ fontWeight: 600 }}>{item.DNc_No}</td>
                        <td>{item.DNc_ItemID}</td>
                        <td>{item.Item_Name || '-'}</td>
                        <td>{item.DNc_SuppName || '-'}</td>
                        <td>{item.DNC_BatchNo || '-'}</td>
                        <td>{formatDate(item.DNc_Date)}</td>
                        {activeTab === 'inprocess' ? (
                          <td>
                            <span className={`qc-aging-badge ${getAgingColor(item.DaysInQC)}`}>
                              {item.DaysInQC} hari
                            </span>
                          </td>
                        ) : (
                          <>
                            <td>{formatDate(item.DNC_tempellabelDate)}</td>
                            <td>{item.TurnaroundDays != null ? `${item.TurnaroundDays} hari` : '-'}</td>
                          </>
                        )}
                        <td>
                          {item.DNc_ReleaseQTY > 0 
                            ? <span className="qc-release-badge">{formatNumber(item.DNc_ReleaseQTY)}</span>
                            : '-'}
                        </td>
                        <td>
                          {item.DNc_RejectQTY > 0 
                            ? <span className="qc-reject-badge">{formatNumber(item.DNc_RejectQTY)}</span> 
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="qc-pagination">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(1)}>{'<<'}</button>
                <button disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}>{'<'}</button>
                <span className="qc-pagination-info">Page {currentPage} of {totalPages}</span>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}>{'>'}</button>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}>{'>>'}</button>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ====== Modals ====== */}
      {renderDetailModal()}
      {renderDrilldownModal()}
    </div>
  );
};

export default QCDashboard;
