import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router';
import { Chart as ChartJS, ArcElement, BarElement, CategoryScale, LinearScale, LineElement, PointElement, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
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
  const navigate = useNavigate();
  // Data states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);
  const [inProcessData, setInProcessData] = useState([]);
  const [periodData, setPeriodData] = useState([]);
  const [completedData, setCompletedData] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(getCurrentPeriod());
  const [lastRefreshTime, setLastRefreshTime] = useState(null);

  // UI states
  const [activeTab, setActiveTab] = useState('inprocess');
  const [tableTypeFilter, setTableTypeFilter] = useState('all'); // 'all' | 'BB' | 'BK'
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);

  // Modal states
  const [detailModal, setDetailModal] = useState({ open: false, item: null });
  const [drilldownModal, setDrilldownModal] = useState({ open: false, title: '', items: [], type: '' });

  // Daily Flow BB/BK states
  const [dailyFlowMode, setDailyFlowMode] = useState('auto');
  const [dailyFlowRender, setDailyFlowRender] = useState('BB');
  const [dailyFlowSpin, setDailyFlowSpin] = useState('');
  const dailyFlowRenderRef = useRef('BB');
  const spinTimerRef = useRef(null);

  // Monthly trend filter
  const [monthlyFilter, setMonthlyFilter] = useState('all');

  // Aging distribution mode: 'month' (selected period) or 'ytd' (last 13 months)
  const [agingMode, setAgingMode] = useState('month');

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
      if (cached && cached.completedData && cached.summaryData?.releasedByType) {
        setSummaryData(cached.summaryData);
        setInProcessData(cached.inProcessData || []);
        setPeriodData(cached.periodData || []);
        setCompletedData(cached.completedData || []);
        setLastRefreshTime(cached.fetchTime);
        setLoading(false);
        return;
      }
    }

    try {
      const buildUrl = (path) => skipCache ? apiUrlWithRefresh(path, true) : apiUrl(path);

      // Fetch all four endpoints in parallel
      const [summaryRes, inProcessRes, periodRes, completedRes] = await Promise.all([
        fetch(buildUrl(`/api/qcSummary?period=${selectedPeriod}`)),
        fetch(buildUrl('/api/qcInProcess')),
        fetch(buildUrl(`/api/qcByPeriod?period=${selectedPeriod}`)),
        fetch(buildUrl(`/api/qcCompletedByPeriod?period=${selectedPeriod}`))
      ]);

      const [summaryJson, inProcessJson, periodJson, completedJson] = await Promise.all([
        summaryRes.json(),
        inProcessRes.json(),
        periodRes.json(),
        completedRes.json()
      ]);

      const summary = summaryJson.data;
      const inProcess = inProcessJson.data || [];
      const period = periodJson.data || [];
      const completed = completedJson.data || [];

      setSummaryData(summary);
      setInProcessData(inProcess);
      setPeriodData(period);
      setCompletedData(completed);
      setLastRefreshTime(new Date());

      // Save to cache
      saveQCCache({ summaryData: summary, inProcessData: inProcess, periodData: period, completedData: completed });
    } catch (err) {
      console.error('Error fetching QC data:', err);
      setError('Gagal mengambil data QC. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  // Fetch period-dependent data when period changes (summary + period table)
  const fetchPeriodData = useCallback(async () => {
    try {
      const [summaryRes, periodRes, completedRes] = await Promise.all([
        fetch(apiUrl(`/api/qcSummary?period=${selectedPeriod}`)),
        fetch(apiUrl(`/api/qcByPeriod?period=${selectedPeriod}`)),
        fetch(apiUrl(`/api/qcCompletedByPeriod?period=${selectedPeriod}`))
      ]);
      const [summaryJson, periodJson, completedJson] = await Promise.all([
        summaryRes.json(),
        periodRes.json(),
        completedRes.json()
      ]);
      setSummaryData(summaryJson.data);
      setPeriodData(periodJson.data || []);
      setCompletedData(completedJson.data || []);
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

  // Reset page when tab/search/type filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery, tableTypeFilter]);

  // Daily Flow - spin switch logic
  const triggerDailyFlowSwitch = useCallback((newType) => {
    if (newType === dailyFlowRenderRef.current && !dailyFlowSpin) return;
    if (spinTimerRef.current) { clearTimeout(spinTimerRef.current); spinTimerRef.current = null; }
    setDailyFlowSpin('spin-out');
    spinTimerRef.current = setTimeout(() => {
      dailyFlowRenderRef.current = newType;
      setDailyFlowRender(newType);
      setDailyFlowSpin('spin-in');
      spinTimerRef.current = setTimeout(() => {
        setDailyFlowSpin('');
        spinTimerRef.current = null;
      }, 400);
    }, 400);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-rotate daily flow every 15 seconds
  useEffect(() => {
    if (dailyFlowMode !== 'auto') return;
    const interval = setInterval(() => {
      const next = dailyFlowRenderRef.current === 'BB' ? 'BK' : 'BB';
      triggerDailyFlowSwitch(next);
    }, 15000);
    return () => clearInterval(interval);
  }, [dailyFlowMode, triggerDailyFlowSwitch]);

  // Cleanup spin timers
  useEffect(() => {
    return () => { if (spinTimerRef.current) clearTimeout(spinTimerRef.current); };
  }, []);

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
  const typeFilteredData = useMemo(() => {
    if (tableTypeFilter === 'all') return currentTableData;
    return currentTableData.filter((item) => item.Item_Type === tableTypeFilter);
  }, [currentTableData, tableTypeFilter]);
  const filteredData = useMemo(() => applySort(filterData(typeFilteredData)), [typeFilteredData, searchQuery, sortConfig]); // eslint-disable-line react-hooks/exhaustive-deps
  const totalPages = Math.max(1, Math.ceil(filteredData.length / ROWS_PER_PAGE));
  const paginatedData = filteredData.slice((currentPage - 1) * ROWS_PER_PAGE, currentPage * ROWS_PER_PAGE);

  // Per-type counts for tab badges
  const bbCount = useMemo(() => currentTableData.filter((item) => item.Item_Type === 'BB').length, [currentTableData]);
  const bkCount = useMemo(() => currentTableData.filter((item) => item.Item_Type === 'BK').length, [currentTableData]);

  // ============================================
  // KPI Data
  // ============================================

  const kpiData = useMemo(() => {
    const empty = { bb: { pending: 0, avgDays: 0, completed: 0, rejectPct: 0 }, bk: { pending: 0, avgDays: 0, completed: 0, rejectPct: 0 } };
    if (!summaryData) return empty;
    const cp = summaryData.currentPeriod;

    // In-progress count by type (from inProcessData – items still awaiting QC completion)
    const bbPending = inProcessData.filter((d) => d.Item_Type === 'BB').length;
    const bkPending = inProcessData.filter((d) => d.Item_Type === 'BK').length;

    // Leadtime by type (from leadtimeMonthly for current period)
    const bbLead = (summaryData.leadtimeMonthly || []).find((d) => d.material_type === 'BB' && d.period === cp);
    const bkLead = (summaryData.leadtimeMonthly || []).find((d) => d.material_type === 'BK' && d.period === cp);

    // Released by type (grouped by completion month, not entry month)
    const bbReleased = (summaryData.releasedByType || []).find((d) => d.material_type === 'BB' && d.period === cp);
    const bkReleased = (summaryData.releasedByType || []).find((d) => d.material_type === 'BK' && d.period === cp);

    return {
      bb: {
        pending: bbPending,
        avgDays: bbLead ? Math.round(bbLead.avg_turnaround * 10) / 10 : 0,
        completed: bbReleased?.completed || 0,
        rejectPct: bbReleased?.reject_pct || 0
      },
      bk: {
        pending: bkPending,
        avgDays: bkLead ? Math.round(bkLead.avg_turnaround * 10) / 10 : 0,
        completed: bkReleased?.completed || 0,
        rejectPct: bkReleased?.reject_pct || 0
      }
    };
  }, [summaryData, inProcessData]);

  // ============================================
  // KPI Click Handlers (drilldowns)
  // ============================================

  const handleBBInProgressClick = () => {
    const items = inProcessData.filter((d) => d.Item_Type === 'BB');
    setDrilldownModal({ open: true, title: `BB In Progress (${items.length})`, type: 'item-inprogress', items });
  };

  const handleBKInProgressClick = () => {
    const items = inProcessData.filter((d) => d.Item_Type === 'BK');
    setDrilldownModal({ open: true, title: `BK In Progress (${items.length})`, type: 'item-inprogress', items });
  };

  const handleBBLeadtimeClick = () => {
    const cp = summaryData?.currentPeriod;
    const items = completedData.filter((d) => d.Item_Type === 'BB');
    setDrilldownModal({ open: true, title: `Leadtime BB – ${periodToLabel(cp)} (${items.length} selesai)`, type: 'item-leadtime', items });
  };

  const handleBKLeadtimeClick = () => {
    const cp = summaryData?.currentPeriod;
    const items = completedData.filter((d) => d.Item_Type === 'BK');
    setDrilldownModal({ open: true, title: `Leadtime BK – ${periodToLabel(cp)} (${items.length} selesai)`, type: 'item-leadtime', items });
  };

  const handleBBReleasedClick = () => {
    const cp = summaryData?.currentPeriod;
    const items = completedData.filter((d) => d.Item_Type === 'BB');
    setDrilldownModal({ open: true, title: `BB Released – ${periodToLabel(cp)} (${items.length} batch)`, type: 'item-released', items });
  };

  const handleBKReleasedClick = () => {
    const cp = summaryData?.currentPeriod;
    const items = completedData.filter((d) => d.Item_Type === 'BK');
    setDrilldownModal({ open: true, title: `BK Released – ${periodToLabel(cp)} (${items.length} batch)`, type: 'item-released', items });
  };

  const handleBBRejectClick = () => {
    const cp = summaryData?.currentPeriod;
    const items = completedData.filter((d) => d.Item_Type === 'BB' && d.DNc_RejectQTY > 0);
    setDrilldownModal({ open: true, title: `Reject Rate BB – ${periodToLabel(cp)} (${items.length} batch)`, type: 'item-reject', items });
  };

  const handleBKRejectClick = () => {
    const cp = summaryData?.currentPeriod;
    const items = completedData.filter((d) => d.Item_Type === 'BK' && d.DNc_RejectQTY > 0);
    setDrilldownModal({ open: true, title: `Reject Rate BK – ${periodToLabel(cp)} (${items.length} batch)`, type: 'item-reject', items });
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

  // Aging chart data (kept for backward compat)
  const agingChartData = useMemo(() => {
    if (!summaryData?.aging) return null;
    const order = ['0-3 days', '4-7 days', '8-14 days', '15-30 days', '30+ days'];
    const sorted = order.map((b) => summaryData.aging.find((a) => a.aging_bucket === b) || { aging_bucket: b, count: 0 });
    return {
      labels: sorted.map((a) => a.aging_bucket),
      datasets: [{
        data: sorted.map((a) => a.count),
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(249, 115, 22, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'],
        borderWidth: 2
      }]
    };
  }, [summaryData]);

  // Aging by material type (BB and BK separate donuts) - supports Month and YTD modes
  const agingByTypeChartData = useMemo(() => {
    const source = agingMode === 'ytd' ? summaryData?.agingByTypeYTD : summaryData?.agingByType;
    if (!source) return {};
    const order = ['0-3 days', '4-7 days', '8-14 days', '15-30 days', '30+ days'];
    const colors = [
      'rgba(34, 197, 94, 0.8)',
      'rgba(59, 130, 246, 0.8)',
      'rgba(245, 158, 11, 0.8)',
      'rgba(249, 115, 22, 0.8)',
      'rgba(239, 68, 68, 0.8)',
    ];
    const borders = ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'];
    const result = {};
    ['BB', 'BK'].forEach((type) => {
      const items = source.filter((a) => a.material_type === type);
      const sorted = order.map((b) => items.find((a) => a.aging_bucket === b) || { aging_bucket: b, count: 0 });
      const total = sorted.reduce((sum, a) => sum + a.count, 0);
      result[type] = {
        labels: sorted.map((a) => a.aging_bucket),
        datasets: [{
          data: sorted.map((a) => a.count),
          backgroundColor: colors,
          borderColor: borders,
          borderWidth: 2
        }],
        total
      };
    });
    return result;
  }, [summaryData, agingMode]);

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

  const agingByTypeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '55%',
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.raw} items`
        }
      }
    }
  };

  // Daily flow data separated by BB/BK
  const dailyFlowByType = useMemo(() => {
    if (!summaryData?.dailyIntakeByType || !summaryData?.dailyCompletionsByType) return {};
    const result = {};
    ['BB', 'BK'].forEach((type) => {
      const dateMap = {};
      (summaryData.dailyIntakeByType || [])
        .filter((d) => d.material_type === type)
        .forEach((d) => {
          const key = new Date(d.entry_date).toISOString().slice(0, 10);
          dateMap[key] = { ...(dateMap[key] || {}), intake: d.cnt };
        });
      (summaryData.dailyCompletionsByType || [])
        .filter((d) => d.material_type === type)
        .forEach((d) => {
          const key = new Date(d.completion_date).toISOString().slice(0, 10);
          dateMap[key] = { ...(dateMap[key] || {}), completed: d.cnt };
        });
      const dates = Object.keys(dateMap).sort();
      result[type] = dates.length > 0 ? {
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
            order: 1
          },
          {
            label: 'Selesai QC',
            data: dates.map((d) => dateMap[d].completed || 0),
            backgroundColor: 'rgba(102, 187, 106, 0.7)',
            borderColor: '#66bb6a',
            borderWidth: 1,
            borderRadius: 4,
            order: 2
          }
        ]
      } : null;
    });
    return result;
  }, [summaryData]);

  const dailyFlowOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: { mode: 'index', intersect: false },
      datalabels: {
        anchor: 'end',
        align: 'top',
        font: { size: 10, weight: 600 },
        color: '#334155',
        formatter: (value) => value > 0 ? value : ''
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } }
    }
  };

  // Monthly trend data - combined BB/BK when "All", otherwise single type
  const monthlyTrendByTypeData = useMemo(() => {
    if (!summaryData?.monthlyByType) return null;
    const allData = summaryData.monthlyByType;
    const periods = [...new Set(allData.map((d) => d.period))].sort();

    const getTypeData = (type) => ({
      total: periods.map((p) => { const item = allData.find((d) => d.period === p && d.material_type === type); return item ? item.total : 0; }),
      completed: periods.map((p) => { const item = allData.find((d) => d.period === p && d.material_type === type); return item ? item.completed : 0; }),
      rejectPct: periods.map((p) => { const item = allData.find((d) => d.period === p && d.material_type === type); return item ? (item.reject_pct || 0) : 0; })
    });

    const bb = getTypeData('BB');
    const bk = getTypeData('BK');

    // Combined data: sum totals/completed, weighted-average reject %
    const combined = {
      total: periods.map((_, i) => bb.total[i] + bk.total[i]),
      completed: periods.map((_, i) => bb.completed[i] + bk.completed[i]),
      rejectPct: periods.map((_, i) => {
        const totalAll = bb.total[i] + bk.total[i];
        if (totalAll === 0) return 0;
        const rejectCount = (bb.total[i] * bb.rejectPct[i] + bk.total[i] * bk.rejectPct[i]) / 100;
        return Math.round((rejectCount / totalAll) * 100 * 100) / 100;
      })
    };

    const source = monthlyFilter === 'BB' ? bb : monthlyFilter === 'BK' ? bk : combined;
    const suffix = monthlyFilter === 'all' ? '' : ` ${monthlyFilter}`;

    return {
      labels: periods.map((p) => periodToLabel(p)),
      datasets: [
        { label: `Total${suffix}`, data: source.total, borderColor: '#4f8cff', backgroundColor: 'rgba(79, 140, 255, 0.15)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#4f8cff' },
        { label: `Released${suffix}`, data: source.completed, borderColor: '#22c55e', backgroundColor: 'rgba(34, 197, 94, 0.15)', fill: true, tension: 0.3, pointRadius: 4, pointBackgroundColor: '#22c55e' },
        { label: `Reject %${suffix}`, data: source.rejectPct, borderColor: '#ef4444', borderDash: [5, 5], tension: 0.3, pointRadius: 4, pointBackgroundColor: '#ef4444', yAxisID: 'y1' }
      ]
    };
  }, [summaryData, monthlyFilter]);

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

  // Leadtime 13 months by BB/BK (replaces Supplier chart)
  const leadtimeChartData = useMemo(() => {
    if (!summaryData?.leadtimeMonthly) return null;
    const data = summaryData.leadtimeMonthly;

    // Calculate 13-month range ending at selectedPeriod
    const endYear = parseInt(selectedPeriod.slice(0, 4));
    const endMonth = parseInt(selectedPeriod.slice(4, 6));
    const periods = [];
    for (let i = 12; i >= 0; i--) {
      const d = new Date(endYear, endMonth - 1 - i, 1);
      periods.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const bbData = periods.map((p) => {
      const item = data.find((d) => d.period === p && d.material_type === 'BB');
      return item ? Math.round(item.avg_turnaround * 10) / 10 : 0;
    });
    const bkData = periods.map((p) => {
      const item = data.find((d) => d.period === p && d.material_type === 'BK');
      return item ? Math.round(item.avg_turnaround * 10) / 10 : 0;
    });

    return {
      labels: periods.map((p) => periodToLabel(p)),
      datasets: [
        {
          label: 'BB (Bahan Baku)',
          data: bbData,
          backgroundColor: 'rgba(79, 140, 255, 0.7)',
          borderColor: '#4f8cff',
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: 'BK (Bahan Kemas)',
          data: bkData,
          backgroundColor: 'rgba(255, 167, 38, 0.7)',
          borderColor: '#ffa726',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    };
  }, [summaryData, selectedPeriod]);

  const leadtimeChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} hari`
        }
      },
      datalabels: {
        anchor: 'end',
        align: 'top',
        font: { size: 9, weight: 600 },
        color: '#334155',
        formatter: (value) => value > 0 ? Math.round(value) : ''
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 9 }, maxRotation: 45 } },
      y: { beginAtZero: true, ticks: { font: { size: 10 }, callback: (v) => `${v}d` }, title: { display: true, text: 'Avg Turnaround (hari)', font: { size: 10 } } }
    }
  };

  /* Supplier chart data/options kept but hidden from UI */
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
    const itemTableTypes = ['item-inprogress', 'item-leadtime', 'item-released', 'item-reject'];
    if (itemTableTypes.includes(drilldownModal.type)) {
      const rows = drilldownModal.items;
      const type = drilldownModal.type;
      const isInProgress = type === 'item-inprogress';
      const isReject = type === 'item-reject';
      return (
        <Modal open={drilldownModal.open} onClose={() => setDrilldownModal({ open: false, title: '', items: [], type: '' })} title={drilldownModal.title}>
          <div className="qc-drilldown-table-wrapper">
            <table className="qc-drilldown-table">
              <thead>
                <tr>
                  <th>Kode</th>
                  <th>Nama Material</th>
                  <th>Batch No</th>
                  {isInProgress && <><th>Supplier</th><th>Masuk QC</th><th>Hari di QC</th></>}
                  {!isInProgress && !isReject && <><th>Released Qty</th><th>Masuk QC</th><th>Selesai</th><th>Turnaround</th></>}
                  {isReject && <><th>Released Qty</th><th>Reject Qty</th><th>Masuk QC</th><th>Selesai</th></>}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8', padding: '1.5rem' }}>Tidak ada data.</td></tr>
                )}
                {rows.map((d, idx) => (
                  <tr
                    key={idx}
                    className="qc-drilldown-table-row"
                    onClick={() => { setDrilldownModal({ open: false, title: '', items: [], type: '' }); setDetailModal({ open: true, item: d }); }}
                  >
                    <td className="qc-td-mono">{d.DNc_ItemID}</td>
                    <td>{d.Item_Name || '-'}</td>
                    <td className="qc-td-mono">{d.DNC_BatchNo || '-'}</td>
                    {isInProgress && (
                      <>
                        <td>{d.DNc_SuppName || '-'}</td>
                        <td>{formatDate(d.DNc_Date)}</td>
                        <td><span className={`qc-aging-badge ${getAgingColor(d.DaysInQC)}`}>{d.DaysInQC} hari</span></td>
                      </>
                    )}
                    {!isInProgress && !isReject && (
                      <>
                        <td className="qc-td-right">{d.DNc_ReleaseQTY > 0 ? `${formatNumber(d.DNc_ReleaseQTY)} ${d.DNc_UnitID || ''}` : '-'}</td>
                        <td>{formatDate(d.DNc_Date)}</td>
                        <td>{formatDate(d.DNC_tempellabelDate)}</td>
                        <td className="qc-td-right">{d.TurnaroundDays != null ? `${d.TurnaroundDays} hari` : '-'}</td>
                      </>
                    )}
                    {isReject && (
                      <>
                        <td className="qc-td-right">{d.DNc_ReleaseQTY > 0 ? `${formatNumber(d.DNc_ReleaseQTY)} ${d.DNc_UnitID || ''}` : '-'}</td>
                        <td className="qc-td-right qc-td-reject">{formatNumber(d.DNc_RejectQTY)} {d.DNc_UnitID || ''}</td>
                        <td>{formatDate(d.DNc_Date)}</td>
                        <td>{formatDate(d.DNC_tempellabelDate)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Modal>
      );
    }

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
              <h1><span>Quality - Materials</span> Dashboard</h1>
              <div className="quality-toggle-switch" onClick={() => navigate('/quality')}>
                <div className="quality-toggle-track active-material">
                  <span className="quality-toggle-label">Product</span>
                  <span className="quality-toggle-label active">Material</span>
                  <div className="quality-toggle-thumb" />
                </div>
              </div>
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

          {/* ====== KPI Cards (BB/BK split) ====== */}
          <div className="qc-kpi-row">
            <div className="qc-kpi-card" onClick={handleBBInProgressClick}>
              <div className="qc-kpi-icon pending">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">BB In Progress</div>
                <div className="qc-kpi-value">{formatNumber(kpiData.bb.pending)}</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBBLeadtimeClick}>
              <div className="qc-kpi-icon turnaround">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Leadtime BB</div>
                <div className="qc-kpi-value">{kpiData.bb.avgDays} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>hari</span></div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBBReleasedClick}>
              <div className="qc-kpi-icon completed">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">BB Released</div>
                <div className="qc-kpi-value">{formatNumber(kpiData.bb.completed)}</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBBRejectClick}>
              <div className="qc-kpi-icon rejected">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Reject Rate BB</div>
                <div className="qc-kpi-value">{kpiData.bb.rejectPct}<span style={{ fontSize: '0.8rem', fontWeight: 500 }}>%</span></div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBKInProgressClick}>
              <div className="qc-kpi-icon pending">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">BK In Progress</div>
                <div className="qc-kpi-value">{formatNumber(kpiData.bk.pending)}</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBKLeadtimeClick}>
              <div className="qc-kpi-icon turnaround">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Leadtime BK</div>
                <div className="qc-kpi-value">{kpiData.bk.avgDays} <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>hari</span></div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBKReleasedClick}>
              <div className="qc-kpi-icon completed">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">BK Released</div>
                <div className="qc-kpi-value">{formatNumber(kpiData.bk.completed)}</div>
              </div>
            </div>

            <div className="qc-kpi-card" onClick={handleBKRejectClick}>
              <div className="qc-kpi-icon rejected">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              </div>
              <div className="qc-kpi-info">
                <div className="qc-kpi-label">Reject Rate BK</div>
                <div className="qc-kpi-value">{kpiData.bk.rejectPct}<span style={{ fontSize: '0.8rem', fontWeight: 500 }}>%</span></div>
              </div>
            </div>
          </div>

          {/* ====== Charts Row 1: Leadtime 12 Months + Daily Flow ====== */}
          <div className="qc-charts-row">
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">Leadtime 12 Months</div>
                  <div className="qc-chart-subtitle">Rata-rata turnaround QC per bulan (BB vs BK)</div>
                </div>
              </div>
              <div className="qc-chart-container">
                {leadtimeChartData && <Bar data={leadtimeChartData} options={leadtimeChartOptions} plugins={[ChartDataLabels]} />}
              </div>
            </div>
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">Daily QC Flow</div>
                  <div className="qc-chart-subtitle">Masuk vs Selesai - {periodToLabel(summaryData?.currentPeriod)}</div>
                </div>
                <div className="qc-daily-flow-controls">
                  <div className="qc-type-tabs">
                    <button
                      className={`qc-type-tab ${dailyFlowRender === 'BB' ? 'active' : ''}`}
                      onClick={() => { setDailyFlowMode('manual'); triggerDailyFlowSwitch('BB'); }}
                    >BB</button>
                    <button
                      className={`qc-type-tab ${dailyFlowRender === 'BK' ? 'active' : ''}`}
                      onClick={() => { setDailyFlowMode('manual'); triggerDailyFlowSwitch('BK'); }}
                    >BK</button>
                  </div>
                  <div className="qc-mode-toggle">
                    <button
                      className={`qc-mode-btn ${dailyFlowMode === 'auto' ? 'active' : ''}`}
                      onClick={() => setDailyFlowMode('auto')}
                    >Auto</button>
                    <button
                      className={`qc-mode-btn ${dailyFlowMode === 'manual' ? 'active' : ''}`}
                      onClick={() => setDailyFlowMode('manual')}
                    >Manual</button>
                  </div>
                </div>
              </div>
              <div className="qc-daily-flow-viewport">
                <div className={`qc-daily-flow-content ${dailyFlowSpin}`}>
                  <div className="qc-chart-container">
                    {dailyFlowByType[dailyFlowRender] ? (
                      <Bar data={dailyFlowByType[dailyFlowRender]} options={dailyFlowOptions} plugins={[ChartDataLabels]} />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', fontSize: '0.875rem' }}>
                        Tidak ada data {dailyFlowRender}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ====== Charts Row 2: Monthly Trend + QC Aging Distribution ====== */}
          <div className="qc-charts-row">
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">Monthly QC Trend</div>
                  <div className="qc-chart-subtitle">Volume, release, dan reject rate 13 bulan terakhir (BB &amp; BK)</div>
                </div>
                <div className="qc-monthly-filter">
                  {['all', 'BB', 'BK'].map((f) => (
                    <button
                      key={f}
                      className={`qc-filter-btn ${monthlyFilter === f ? 'active' : ''}`}
                      onClick={() => setMonthlyFilter(f)}
                    >{f === 'all' ? 'All' : f}</button>
                  ))}
                </div>
              </div>
              <div className="qc-chart-container">
                {monthlyTrendByTypeData && <Line data={monthlyTrendByTypeData} options={monthlyTrendOptions} />}
              </div>
            </div>
            <div className="qc-chart-card">
              <div className="qc-chart-header">
                <div>
                  <div className="qc-chart-title">QC Aging Distribution</div>
                  <div className="qc-chart-subtitle">{agingMode === 'ytd' ? 'Data 13 bulan terakhir' : `Data bulan ${periodToLabel(selectedPeriod)}`}</div>
                </div>
                <div className="qc-monthly-filter">
                  {[{ key: 'month', label: 'Month' }, { key: 'ytd', label: 'YTD' }].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`qc-filter-btn ${agingMode === key ? 'active' : ''}`}
                      onClick={() => setAgingMode(key)}
                    >{label}</button>
                  ))}
                </div>
              </div>
              <div className="qc-aging-dual-container">
                <div className="qc-aging-donut-wrapper">
                  <div className="qc-aging-donut-label">BB <span>({agingByTypeChartData.BB?.total || 0})</span></div>
                  <div className="qc-aging-donut-chart">
                    {agingByTypeChartData.BB && <Doughnut data={agingByTypeChartData.BB} options={agingByTypeChartOptions} />}
                  </div>
                </div>
                <div className="qc-aging-donut-wrapper">
                  <div className="qc-aging-donut-label">BK <span>({agingByTypeChartData.BK?.total || 0})</span></div>
                  <div className="qc-aging-donut-chart">
                    {agingByTypeChartData.BK && <Doughnut data={agingByTypeChartData.BK} options={agingByTypeChartOptions} />}
                  </div>
                </div>
                <div className="qc-aging-legend">
                  {['0-3 days', '4-7 days', '8-14 days', '15-30 days', '30+ days'].map((label, i) => (
                    <div key={label} className="qc-aging-legend-item">
                      <span className="qc-aging-legend-color" style={{ background: ['#22c55e', '#3b82f6', '#f59e0b', '#f97316', '#ef4444'][i] }} />
                      <span className="qc-aging-legend-text">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ====== Tables Section ====== */}
          <div className="qc-tables-section">
            <div className="qc-tabs">
              <button className={`qc-tab ${activeTab === 'inprocess' ? 'active' : ''}`} onClick={() => { setActiveTab('inprocess'); setTableTypeFilter('all'); }}>
                In Process ({formatNumber(inProcessData.length)})
              </button>
              <button className={`qc-tab ${activeTab === 'period' ? 'active' : ''}`} onClick={() => { setActiveTab('period'); setTableTypeFilter('all'); }}>
                Period: {periodToLabel(selectedPeriod)} ({formatNumber(periodData.length)})
              </button>
            </div>

            {/* BB / BK sub-filter tabs */}
            <div className="qc-table-type-tabs">
              <button className={`qc-table-type-btn ${tableTypeFilter === 'all' ? 'active' : ''}`} onClick={() => setTableTypeFilter('all')}>
                All ({formatNumber(currentTableData.length)})
              </button>
              <button className={`qc-table-type-btn bb ${tableTypeFilter === 'BB' ? 'active' : ''}`} onClick={() => setTableTypeFilter('BB')}>
                BB ({formatNumber(bbCount)})
              </button>
              <button className={`qc-table-type-btn bk ${tableTypeFilter === 'BK' ? 'active' : ''}`} onClick={() => setTableTypeFilter('BK')}>
                BK ({formatNumber(bkCount)})
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
