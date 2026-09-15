import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Chart as ChartJS, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import {
  Activity, AlertTriangle, CheckCircle2, Clock, FileSpreadsheet, ListChecks, Pause, Play,
  RefreshCw, Search, Settings, Undo2, X,
} from 'lucide-react';
import Sidebar from './Sidebar';
import DashboardLoading from './DashboardLoading';
import ControlTowerReportModal from './ControlTowerReportModal';
import ControlTowerConfigModal from './ControlTowerConfigModal';
import { useAuth } from '../context/AuthContext';
import { apiUrl, fetchWithTimeout } from '../api';
import {
  resolveScope, resolveConfigAccess, SCOPED_DEPTS, SCORED_SEVERITIES, SEVERITY, DEVIATION_LABEL, ACK_STATUS, DEPT_COLOR,
  RED_MAX_MINUTES, fmtDateTime, fmtDateTimeFull, fmtTime, fmtDate, fmtDuration, fmtInt, fmtRatio, picList, stepKey,
  toISODate, daysAgo, wallTime, fmtLocalDateTime,
} from '../config/controlTower';
import './ProcessingControlTower.css';

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const LIVE_POLL_MS = 60000;
const LIVE_HOURS = 8;
const TODO_DAYS = 90;
const PAGE_SIZE = 50;

const GRANULARITY = [
  { key: 'day', label: 'Daily', days: 30, fmt: (d) => `${d.getDate()}/${d.getMonth() + 1}` },
  { key: 'week', label: 'Weekly', days: 182, fmt: (d) => `${d.getDate()}/${d.getMonth() + 1}` },
  { key: 'month', label: 'Monthly', days: 365, fmt: (d) => d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) },
  { key: 'year', label: 'Yearly', days: 1800, fmt: (d) => String(d.getFullYear()) },
];

const ACK_FILTERS = [
  { key: 'open', label: 'Open' },
  { key: 'acked', label: 'Acknowledged' },
  { key: 'all', label: 'All' },
];

const CHART_FONT = { family: 'inherit', size: 11 };
const GRID = 'rgba(148, 163, 184, 0.18)';
const AXIS_INK = '#64748b';

async function getJSON(path, timeout = 90000) {
  const res = await fetchWithTimeout(apiUrl(path), {}, timeout);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function postJSON(path, body, method = 'POST') {
  const res = await fetchWithTimeout(apiUrl(path), {
    method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }, 60000);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const deptsParam = (depts) => (depts && depts.length ? `&depts=${depts.join(',')}` : '');

// ---------------------------------------------------------------------------
// Small presentational bits
// ---------------------------------------------------------------------------
function SevDot({ severity, title }) {
  const s = SEVERITY[severity] || SEVERITY.nostd;
  return <span className="ct-dot" style={{ background: s.color }} title={title || s.label} />;
}

function SevBadge({ severity }) {
  const s = SEVERITY[severity] || SEVERITY.nostd;
  return (
    <span className="ct-badge" style={{ background: s.soft, color: s.color, borderColor: `${s.color}55` }}>
      {s.label}
    </span>
  );
}

function DeptTag({ dept }) {
  return <span className="ct-dept" style={{ background: `${DEPT_COLOR[dept] || '#94a3b8'}22`, color: DEPT_COLOR[dept] || '#64748b' }}>{dept || '?'}</span>;
}

function Pic({ row }) {
  const names = picList(row.pic_names);
  if (!names.length) return <span className="ct-muted">-</span>;
  return (
    <span title={names.join(', ')}>
      {names[0]}{names.length > 1 && <span className="ct-muted"> +{names.length - 1}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// KPI strip
// ---------------------------------------------------------------------------
function KpiStrip({ live, openAlerts, hours }) {
  const c = live?.completed || [];
  const count = (sev) => c.filter((r) => r.severity === sev).length;
  const scored = c.filter((r) => SCORED_SEVERITIES.includes(r.severity)).length;
  const flagged = count('red') + count('yellow');
  const running = live?.running || [];
  const overdue = running.filter((r) => r.run_status === 'overdue').length;

  const tiles = [
    { label: `Selesai ${hours} jam terakhir`, value: fmtInt(c.length), sub: `${fmtInt(scored)} scored`, icon: <Activity size={16} /> },
    { label: 'Instant tap', value: fmtInt(count('red')), sub: `< ${RED_MAX_MINUTES} menit`, color: SEVERITY.red.color, icon: <AlertTriangle size={16} /> },
    { label: 'Deviasi', value: fmtInt(count('yellow')), sub: 'terlalu cepat / lama', color: SEVERITY.yellow.color, icon: <AlertTriangle size={16} /> },
    { label: 'Normal', value: fmtInt(count('green')), sub: scored ? `${Math.round((100 * count('green')) / scored)}% dari scored` : '-', color: SEVERITY.green.color, icon: <CheckCircle2 size={16} /> },
    { label: 'Sedang berjalan', value: fmtInt(running.length), sub: overdue ? `${overdue} overdue` : 'tidak ada overdue', color: overdue ? SEVERITY.yellow.color : undefined, icon: <Clock size={16} /> },
    { label: 'Alert belum di-ack', value: openAlerts == null ? '…' : fmtInt(openAlerts), sub: 'pada rentang log', icon: <ListChecks size={16} /> },
  ];
  return (
    <div className="ct-kpis">
      {tiles.map((t) => (
        <div className="ct-kpi" key={t.label}>
          <div className="ct-kpi-head">{t.icon}<span>{t.label}</span></div>
          <div className="ct-kpi-value" style={t.color ? { color: t.color } : undefined}>{t.value}</div>
          <div className="ct-kpi-sub">{t.sub}</div>
        </div>
      ))}
      <div className="ct-kpi ct-kpi-note">
        <div className="ct-kpi-head"><span>Flag rate</span></div>
        <div className="ct-kpi-value">{scored ? `${Math.round((100 * flagged) / scored)}%` : '-'}</div>
        <div className="ct-kpi-sub">red + yellow / scored</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live feed (completed steps, newest first) and running board
// ---------------------------------------------------------------------------
function LiveFeed({ rows, showDept, paused, onTogglePause, hours }) {
  return (
    <div className="ct-card ct-feed-card">
      <div className="ct-card-head">
        <div className="ct-card-title">
          <span className="ct-live-dot" /> Live feed
          <span className="ct-card-sub">proses selesai {hours} jam terakhir · {rows.length}</span>
        </div>
        <button className="ct-icon-btn" onClick={onTogglePause} title={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}>
          {paused ? <Play size={14} /> : <Pause size={14} />}<span>{paused ? 'Paused' : 'Auto'}</span>
        </button>
      </div>
      <div className="ct-feed">
        {rows.length === 0 && <div className="ct-empty">Belum ada proses yang selesai pada rentang ini.</div>}
        {rows.map((r) => (
          <div className={`ct-feed-row sev-${r.severity}`} key={stepKey(r)}>
            <SevDot severity={r.severity} />
            <span className="ct-feed-time">{fmtTime(r.EndDate)}</span>
            <span className="ct-feed-dept">{showDept && <DeptTag dept={r.dept} />}</span>
            <span className="ct-feed-batch">{r.Batch_No}</span>
            <span className="ct-feed-proc" title={`${r.Product_Name || r.Product_ID} · ${r.nama_tahapan}`}>
              {r.nama_tahapan}<span className="ct-muted"> · {r.Product_ID}</span>
            </span>
            <span className="ct-feed-dur" title={r.std_min ? `standar ${fmtDuration(r.std_min)}` : 'tanpa standar'}>
              {fmtDuration(r.duration_min)}
              {r.std_min ? <span className="ct-muted"> / {fmtDuration(r.std_min)}</span> : null}
            </span>
            <span className="ct-feed-ratio" style={{ color: SEVERITY[r.severity]?.color }}>{fmtRatio(r.ratio_pct)}</span>
            <span className="ct-feed-pic"><Pic row={r} /></span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RunningBoard({ rows, showDept }) {
  return (
    <div className="ct-card ct-run-card">
      <div className="ct-card-head">
        <div className="ct-card-title">
          <Clock size={15} /> Sedang berjalan
          <span className="ct-card-sub">{rows.length} proses · diurutkan dari yang paling overdue</span>
        </div>
      </div>
      <div className="ct-run">
        {rows.length === 0 && <div className="ct-empty">Tidak ada proses yang sedang berjalan.</div>}
        {rows.map((r) => {
          const pct = r.std_min ? Math.min(100, (100 * r.duration_min) / r.std_min) : null;
          const over = r.run_status === 'overdue';
          return (
            <div className={`ct-run-row${over ? ' overdue' : ''}`} key={stepKey(r)}>
              <div className="ct-run-main">
                {showDept && <DeptTag dept={r.dept} />}
                <span className="ct-feed-batch">{r.Batch_No}</span>
                <span className="ct-feed-proc" title={`${r.Product_Name || r.Product_ID} · ${r.nama_tahapan}`}>
                  {r.nama_tahapan}<span className="ct-muted"> · {r.Product_ID}</span>
                </span>
                <span className="ct-run-pic"><Pic row={r} /></span>
              </div>
              <div className="ct-run-meta">
                <span className="ct-muted">mulai {fmtDateTime(r.StartDate)}{r.segments > 1 ? ` · ${r.segments} segmen` : ''}</span>
                <span className={over ? 'ct-over' : ''}>
                  {fmtDuration(r.duration_min)}{r.std_min ? ` / ${fmtDuration(r.std_min)}` : ' · tanpa standar'}
                  {over && ' · OVERDUE'}
                </span>
              </div>
              <div className="ct-bar-track">
                <div className="ct-bar-fill" style={{ width: `${pct ?? 0}%`, background: over ? SEVERITY.yellow.color : pct == null ? '#cbd5e1' : SEVERITY.green.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend charts
// ---------------------------------------------------------------------------
function useStats(granularity, depts, refreshToken) {
  const [state, setState] = useState({ rows: [], loading: true, error: '' });
  const g = GRANULARITY.find((x) => x.key === granularity) || GRANULARITY[0];
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: '' }));
    const from = toISODate(daysAgo(g.days));
    const to = toISODate(new Date());
    getJSON(`/api/controlTower/stats?from=${from}&to=${to}&granularity=${g.key}${deptsParam(depts)}`, 180000)
      .then((json) => { if (!cancelled) setState({ rows: json.data || [], loading: false, error: '' }); })
      .catch((e) => { if (!cancelled) setState({ rows: [], loading: false, error: e.message }); });
    return () => { cancelled = true; };
  }, [g.key, g.days, depts.join(','), refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps
  return { ...state, g };
}

function TrendCharts({ granularity, setGranularity, depts, showDept, refreshToken }) {
  const { rows, loading, error, g } = useStats(granularity, depts, refreshToken);

  const agg = useMemo(() => {
    const periods = new Map(); // iso -> { red, yellow, green, nostd }
    const deptTot = new Map(); // dept -> { red, yellow, green }
    for (const r of rows) {
      const iso = String(r.period).slice(0, 10);
      if (!periods.has(iso)) periods.set(iso, { red: 0, yellow: 0, green: 0, nostd: 0 });
      periods.get(iso)[r.severity] += Number(r.n) || 0;
      if (!deptTot.has(r.dept)) deptTot.set(r.dept, { red: 0, yellow: 0, green: 0, nostd: 0 });
      deptTot.get(r.dept)[r.severity] += Number(r.n) || 0;
    }
    const keys = [...periods.keys()].sort();
    const labels = keys.map((k) => g.fmt(new Date(`${k}T00:00:00`)));
    const red = keys.map((k) => periods.get(k).red);
    const yellow = keys.map((k) => periods.get(k).yellow);
    const rate = keys.map((k) => {
      const p = periods.get(k); const scored = p.red + p.yellow + p.green;
      return scored ? Math.round((1000 * (p.red + p.yellow)) / scored) / 10 : null;
    });
    const deptRows = [...deptTot.entries()]
      .map(([dept, v]) => ({ dept, ...v, scored: v.red + v.yellow + v.green }))
      .sort((a, b) => (b.red + b.yellow) - (a.red + a.yellow));
    return { keys, labels, red, yellow, rate, deptRows };
  }, [rows, g]);

  const baseOpts = (extra = {}) => ({
    responsive: true, maintainAspectRatio: false, animation: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, font: CHART_FONT, color: AXIS_INK, usePointStyle: true } },
      tooltip: { backgroundColor: '#0f172a', titleFont: CHART_FONT, bodyFont: CHART_FONT, padding: 8 },
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: CHART_FONT, color: AXIS_INK, maxRotation: 0, autoSkip: true } },
      y: { beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { font: CHART_FONT, color: AXIS_INK, precision: 0 } },
    },
    ...extra,
  });

  const alertsData = {
    labels: agg.labels,
    datasets: [
      { label: 'Instant tap (red)', data: agg.red, backgroundColor: SEVERITY.red.color, borderRadius: 3, borderSkipped: 'bottom', maxBarThickness: 34 },
      { label: 'Deviasi (yellow)', data: agg.yellow, backgroundColor: SEVERITY.yellow.color, borderRadius: 3, borderSkipped: 'bottom', maxBarThickness: 34 },
    ],
  };
  const alertsOpts = baseOpts();
  alertsOpts.scales.x.stacked = true; alertsOpts.scales.y.stacked = true;

  const rateData = {
    labels: agg.labels,
    datasets: [{
      label: '% proses yang ter-flag', data: agg.rate, borderColor: '#3f78c0', backgroundColor: '#3f78c0',
      borderWidth: 2, pointRadius: agg.rate.length > 40 ? 0 : 3, pointHoverRadius: 5, tension: 0.25, spanGaps: true,
    }],
  };
  const rateOpts = baseOpts();
  rateOpts.plugins.legend.display = false;
  rateOpts.scales.y.max = 100;
  rateOpts.scales.y.ticks.callback = (v) => `${v}%`;
  rateOpts.plugins.tooltip.callbacks = { label: (c) => ` ${c.parsed.y == null ? '-' : c.parsed.y + '%'} ter-flag` };

  const deptData = {
    labels: agg.deptRows.map((d) => d.dept),
    datasets: [
      { label: 'Instant tap (red)', data: agg.deptRows.map((d) => d.red), backgroundColor: SEVERITY.red.color, borderRadius: 3, borderSkipped: 'left', maxBarThickness: 22 },
      { label: 'Deviasi (yellow)', data: agg.deptRows.map((d) => d.yellow), backgroundColor: SEVERITY.yellow.color, borderRadius: 3, borderSkipped: 'left', maxBarThickness: 22 },
    ],
  };
  const deptOpts = baseOpts({ indexAxis: 'y' });
  deptOpts.scales.x = { stacked: true, beginAtZero: true, grid: { color: GRID }, border: { display: false }, ticks: { font: CHART_FONT, color: AXIS_INK, precision: 0 } };
  deptOpts.scales.y = { stacked: true, grid: { display: false }, ticks: { font: CHART_FONT, color: AXIS_INK } };
  deptOpts.plugins.tooltip.callbacks = {
    afterBody: (items) => {
      const d = agg.deptRows[items[0]?.dataIndex];
      return d ? [`Scored: ${fmtInt(d.scored)} · flag rate ${d.scored ? Math.round((100 * (d.red + d.yellow)) / d.scored) : 0}%`] : [];
    },
  };

  const total = agg.red.reduce((a, b) => a + b, 0) + agg.yellow.reduce((a, b) => a + b, 0);

  return (
    <div className="ct-card ct-trend-card">
      <div className="ct-card-head">
        <div className="ct-card-title">
          <Activity size={15} /> Tren potential misconduct
          <span className="ct-card-sub">{g.label.toLowerCase()} · {agg.keys.length} periode · {fmtInt(total)} alert</span>
        </div>
        <div className="ct-toggle" role="group" aria-label="Granularity">
          {GRANULARITY.map((o) => (
            <button key={o.key} className={`ct-toggle-btn${granularity === o.key ? ' active' : ''}`} onClick={() => setGranularity(o.key)}>{o.label}</button>
          ))}
        </div>
      </div>
      {error && <div className="ct-error">⚠️ {error}</div>}
      <div className={`ct-trend-grid${showDept ? ' three' : ''}`}>
        <div className="ct-chart">
          <div className="ct-chart-title">Jumlah alert per periode</div>
          <div className="ct-chart-body">{loading ? <div className="ct-empty">Loading…</div> : <Bar data={alertsData} options={alertsOpts} />}</div>
        </div>
        <div className="ct-chart">
          <div className="ct-chart-title">Flag rate — % dari proses ber-standar</div>
          <div className="ct-chart-body">{loading ? <div className="ct-empty">Loading…</div> : <Line data={rateData} options={rateOpts} />}</div>
        </div>
        {showDept && (
          <div className="ct-chart">
            <div className="ct-chart-title">Per departemen (total periode)</div>
            <div className="ct-chart-body">{loading ? <div className="ct-empty">Loading…</div> : <Bar data={deptData} options={deptOpts} />}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Acknowledge modal
// ---------------------------------------------------------------------------
function AckModal({ items, onClose, onDone, user }) {
  const [status, setStatus] = useState('mistap');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true); setError('');
    try {
      await postJSON('/api/controlTower/ack', {
        items: items.map((r) => ({
          Batch_No: r.Batch_No, seq_id: r.seq_id, No_urut: r.No_urut, Product_ID: r.Product_ID, Product_Name: r.Product_Name,
          kode_tahapan: r.kode_tahapan, nama_tahapan: r.nama_tahapan, dept: r.dept, severity: r.severity,
          duration_min: r.duration_min, std_min: r.std_min, ratio_pct: r.ratio_pct, StartDate: r.StartDate, EndDate: r.EndDate,
          pic_names: r.pic_names,
        })),
        status, note, user,
      });
      onDone();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-head">
          <div className="ct-modal-title">Acknowledge {items.length} alert</div>
          <button className="ct-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-ack-list">
            {items.slice(0, 6).map((r) => (
              <div key={stepKey(r)} className="ct-ack-item">
                <SevDot severity={r.severity} /><strong>{r.Batch_No}</strong> · {r.nama_tahapan} · {fmtDuration(r.duration_min)} ({fmtRatio(r.ratio_pct)})
              </div>
            ))}
            {items.length > 6 && <div className="ct-muted">… dan {items.length - 6} lainnya</div>}
          </div>
          <div className="ct-field-label">Hasil pengecekan</div>
          <div className="ct-radio-grid">
            {Object.values(ACK_STATUS).map((s) => (
              <label key={s.key} className={`ct-radio${status === s.key ? ' active' : ''}`}>
                <input type="radio" name="ackstatus" value={s.key} checked={status === s.key} onChange={() => setStatus(s.key)} />
                <span className="ct-radio-label">{s.label}</span>
                <span className="ct-radio-hint">{s.hint}</span>
              </label>
            ))}
          </div>
          <div className="ct-field-label">Catatan (opsional)</div>
          <textarea className="ct-textarea" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: sudah dikonfirmasi ke PIC, proses sebenarnya 45 menit." maxLength={1000} />
          {error && <div className="ct-error">⚠️ {error}</div>}
        </div>
        <div className="ct-modal-foot">
          <span className="ct-muted">Sebagai {user.name || user.nik} ({user.dept})</span>
          <div>
            <button className="ct-btn ghost" onClick={onClose} disabled={busy}>Batal</button>
            <button className="ct-btn primary" onClick={submit} disabled={busy}>{busy ? 'Menyimpan…' : 'Acknowledge'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Alert log
// ---------------------------------------------------------------------------
function AlertLog({ depts, showDept, user, onOpenCount, refreshToken }) {
  const [from, setFrom] = useState(toISODate(daysAgo(6)));
  const [to, setTo] = useState(toISODate(new Date()));
  const [sevFilter, setSevFilter] = useState(new Set(['red', 'yellow']));
  const [ackFilter, setAckFilter] = useState('open');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(new Set());
  const [ackItems, setAckItems] = useState(null);
  const [reload, setReload] = useState(0);

  const rangeValid = from && to && from <= to;

  useEffect(() => {
    if (!rangeValid) return undefined;
    let cancelled = false;
    setLoading(true); setError('');
    getJSON(`/api/controlTower/alerts?from=${from}&to=${to}&severities=red,yellow${deptsParam(depts)}${reload ? '&refresh=true' : ''}`, 180000)
      .then((json) => { if (!cancelled) { setRows(json.data || []); setSelected(new Set()); setPage(0); } })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [from, to, depts.join(','), reload, refreshToken, rangeValid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onOpenCount(rows.filter((r) => !r.ack_id).length); }, [rows, onOpenCount]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (!sevFilter.has(r.severity)) return false;
      if (ackFilter === 'open' && r.ack_id) return false;
      if (ackFilter === 'acked' && !r.ack_id) return false;
      if (deptFilter !== 'ALL' && r.dept !== deptFilter) return false;
      if (q) {
        const hay = `${r.Batch_No} ${r.Product_ID} ${r.Product_Name || ''} ${r.nama_tahapan} ${r.pic_names || ''} ${r.pic_ids || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, sevFilter, ackFilter, deptFilter, search]);

  useEffect(() => { setPage(0); }, [sevFilter, ackFilter, deptFilter, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selected.has(stepKey(r)));

  const toggleSev = (k) => setSevFilter((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleRow = (r) => setSelected((prev) => { const n = new Set(prev); const k = stepKey(r); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const togglePage = () => setSelected((prev) => {
    const n = new Set(prev);
    if (allPageSelected) pageRows.forEach((r) => n.delete(stepKey(r))); else pageRows.forEach((r) => n.add(stepKey(r)));
    return n;
  });

  const selectedRows = useMemo(() => rows.filter((r) => selected.has(stepKey(r))), [rows, selected]);

  async function undoAck(r) {
    try {
      await postJSON('/api/controlTower/unack', { keys: [{ Batch_No: r.Batch_No, seq_id: r.seq_id, No_urut: r.No_urut }] });
      setReload((x) => x + 1);
    } catch (e) { setError(e.message); }
  }

  const presets = [
    { label: 'Hari ini', from: toISODate(new Date()), to: toISODate(new Date()) },
    { label: '7 hari', from: toISODate(daysAgo(6)), to: toISODate(new Date()) },
    { label: '30 hari', from: toISODate(daysAgo(29)), to: toISODate(new Date()) },
    { label: 'Bulan ini', from: toISODate(new Date()).slice(0, 8) + '01', to: toISODate(new Date()) },
  ];

  const sevCount = (k) => rows.filter((r) => r.severity === k && (ackFilter === 'all' || (ackFilter === 'open' ? !r.ack_id : !!r.ack_id))).length;

  return (
    <div className="ct-card ct-log-card">
      <div className="ct-card-head wrap">
        <div className="ct-card-title">
          <AlertTriangle size={15} /> Alert log
          <span className="ct-card-sub">{fmtInt(filtered.length)} dari {fmtInt(rows.length)} alert · {fmtDate(from)} – {fmtDate(to)}</span>
        </div>
        <div className="ct-filters">
          <div className="ct-toggle">
            {presets.map((p) => (
              <button key={p.label} className={`ct-toggle-btn${from === p.from && to === p.to ? ' active' : ''}`} onClick={() => { setFrom(p.from); setTo(p.to); }}>{p.label}</button>
            ))}
          </div>
          <input type="date" className="ct-date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <span className="ct-muted">–</span>
          <input type="date" className="ct-date" value={to} min={from} max={toISODate(new Date())} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      <div className="ct-log-tools">
        <div className="ct-chips">
          {['red', 'yellow'].map((k) => (
            <button key={k} className={`ct-chip${sevFilter.has(k) ? ' active' : ''}`} onClick={() => toggleSev(k)}
              style={sevFilter.has(k) ? { borderColor: SEVERITY[k].color, background: SEVERITY[k].soft, color: SEVERITY[k].color } : undefined}>
              <SevDot severity={k} /> {SEVERITY[k].label} <strong>{fmtInt(sevCount(k))}</strong>
            </button>
          ))}
        </div>
        <div className="ct-toggle">
          {ACK_FILTERS.map((o) => (
            <button key={o.key} className={`ct-toggle-btn${ackFilter === o.key ? ' active' : ''}`} onClick={() => setAckFilter(o.key)}>{o.label}</button>
          ))}
        </div>
        {showDept && (
          <select className="ct-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">Semua dept</option>
            {SCOPED_DEPTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <div className="ct-search">
          <Search size={14} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari batch, produk, proses, PIC…" />
          {search && <button className="ct-icon-btn" onClick={() => setSearch('')}><X size={12} /></button>}
        </div>
        <div className="ct-log-actions">
          {selected.size > 0 && <span className="ct-muted">{selected.size} dipilih</span>}
          <button className="ct-btn primary" disabled={!selected.size} onClick={() => setAckItems(selectedRows)}>
            <ListChecks size={14} /> Acknowledge{selected.size ? ` (${selected.size})` : ''}
          </button>
        </div>
      </div>

      {error && <div className="ct-error">⚠️ {error}</div>}

      <div className="ct-table-wrap">
        <table className="ct-table">
          <thead>
            <tr>
              <th className="ct-th-check"><input type="checkbox" checked={allPageSelected} onChange={togglePage} disabled={!pageRows.length} /></th>
              {showDept && <th>Dept</th>}
              <th>Batch</th>
              <th>Produk</th>
              <th>Proses</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th className="num">Durasi</th>
              <th className="num">Standar</th>
              <th className="num">% vs std</th>
              <th>Severity</th>
              <th>PIC</th>
              <th>Ack</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={13} className="ct-empty">Loading alert…</td></tr>}
            {!loading && pageRows.length === 0 && <tr><td colSpan={13} className="ct-empty">Tidak ada alert yang cocok dengan filter.</td></tr>}
            {!loading && pageRows.map((r) => {
              const names = picList(r.pic_names);
              return (
                <tr key={stepKey(r)} className={`${selected.has(stepKey(r)) ? 'selected' : ''}${r.ack_id ? ' acked' : ''}`}>
                  <td className="ct-th-check"><input type="checkbox" checked={selected.has(stepKey(r))} onChange={() => toggleRow(r)} /></td>
                  {showDept && <td><DeptTag dept={r.dept} /></td>}
                  <td className="mono"><strong>{r.Batch_No}</strong></td>
                  <td className="ct-td-prod" title={r.Product_Name || ''}>{r.Product_ID} <span className="ct-muted">{r.Product_Name}</span></td>
                  <td className="ct-td-proc" title={`${DEVIATION_LABEL[r.deviation] || ''}${r.segments > 1 ? ` · ${r.segments} segmen (pending)` : ''}`}>
                    {r.nama_tahapan}{r.segments > 1 && <span className="ct-seg" title="digabung dari beberapa segmen pending">×{r.segments}</span>}
                  </td>
                  <td className="mono" title={fmtDateTimeFull(r.StartDate)}>{fmtDateTime(r.StartDate)}</td>
                  <td className="mono" title={fmtDateTimeFull(r.EndDate)}>{fmtDateTime(r.EndDate)}</td>
                  <td className="num mono">{fmtDuration(r.duration_min)}</td>
                  <td className="num mono">{fmtDuration(r.std_min)}<span className="ct-muted ct-src">{r.std_source === 'default' ? ' (default)' : ''}</span></td>
                  <td className="num mono" style={{ color: SEVERITY[r.severity]?.color, fontWeight: 600 }}>{fmtRatio(r.ratio_pct)}</td>
                  <td><SevBadge severity={r.severity} /></td>
                  <td className="ct-td-pic" title={names.join(', ')}>{names.join(', ') || '-'}</td>
                  <td className="ct-td-ack">
                    {r.ack_id ? (
                      <span className="ct-ack" title={`${ACK_STATUS[r.ack_status]?.label || r.ack_status} · ${r.ack_by_name || r.ack_by} · ${fmtDateTime(r.ack_at)}${r.ack_note ? `\n${r.ack_note}` : ''}`}>
                        <CheckCircle2 size={13} /> {ACK_STATUS[r.ack_status]?.label || r.ack_status}
                        <span className="ct-muted"> · {r.ack_by}</span>
                        <button className="ct-icon-btn tiny" title="Undo acknowledge" onClick={() => undoAck(r)}><Undo2 size={12} /></button>
                      </span>
                    ) : (
                      <button className="ct-btn tiny" onClick={() => setAckItems([r])}>Ack</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="ct-pager">
        <span className="ct-muted">Halaman {page + 1} / {pageCount} · {PAGE_SIZE} per halaman</span>
        <div>
          <button className="ct-btn ghost" disabled={page === 0} onClick={() => setPage(0)}>«</button>
          <button className="ct-btn ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>‹</button>
          <button className="ct-btn ghost" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>›</button>
          <button className="ct-btn ghost" disabled={page >= pageCount - 1} onClick={() => setPage(pageCount - 1)}>»</button>
        </div>
      </div>

      {ackItems && (
        <AckModal items={ackItems} user={user} onClose={() => setAckItems(null)}
          onDone={() => { setAckItems(null); setSelected(new Set()); setReload((x) => x + 1); }} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// To-Do: steps with no standard
// ---------------------------------------------------------------------------
function TodoPanel({ depts, showDept, refreshToken }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openDept, setOpenDept] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const from = toISODate(daysAgo(TODO_DAYS)); const to = toISODate(new Date());
    getJSON(`/api/controlTower/todo?from=${from}&to=${to}${deptsParam(depts)}`, 180000)
      .then((json) => { if (!cancelled) setRows(json.data || []); })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [depts.join(','), refreshToken]); // eslint-disable-line react-hooks/exhaustive-deps

  // dept -> process -> { products[], occurrences, lastSeen, avg }
  const grouped = useMemo(() => {
    const byDept = new Map();
    for (const r of rows) {
      if (!byDept.has(r.dept)) byDept.set(r.dept, new Map());
      const procs = byDept.get(r.dept);
      const pk = `${r.kode_tahapan}|${r.nama_tahapan}`;
      if (!procs.has(pk)) procs.set(pk, { kode: r.kode_tahapan, nama: r.nama_tahapan, products: [], occurrences: 0, lastSeen: null, durSum: 0 });
      const p = procs.get(pk);
      p.products.push(r);
      p.occurrences += Number(r.occurrences) || 0;
      p.durSum += (Number(r.avg_duration_min) || 0) * (Number(r.occurrences) || 0);
      const ls = wallTime(r.last_seen);
      if (ls && (!p.lastSeen || ls > p.lastSeen)) p.lastSeen = ls;
    }
    return [...byDept.entries()].map(([dept, procs]) => ({
      dept,
      procs: [...procs.values()].sort((a, b) => b.occurrences - a.occurrences),
      occurrences: [...procs.values()].reduce((a, p) => a + p.occurrences, 0),
    })).sort((a, b) => b.occurrences - a.occurrences);
  }, [rows]);

  useEffect(() => { if (grouped.length && (openDept == null || !grouped.some((g) => g.dept === openDept))) setOpenDept(grouped[0].dept); }, [grouped, openDept]);
  const active = grouped.find((g) => g.dept === openDept);

  return (
    <div className="ct-card ct-todo-card">
      <div className="ct-card-head">
        <div className="ct-card-title">
          <ListChecks size={15} /> To-Do: proses tanpa standar
          <span className="ct-card-sub">{TODO_DAYS} hari terakhir · lead time 0 di m_alur_detail dan m_tahapan · tidak ikut di-score</span>
        </div>
      </div>
      {error && <div className="ct-error">⚠️ {error}</div>}
      {loading ? <div className="ct-empty">Loading…</div> : grouped.length === 0 ? (
        <div className="ct-empty">Semua proses pada scope ini sudah memiliki standar. 🎉</div>
      ) : (
        <div className="ct-todo">
          <div className="ct-todo-depts">
            {grouped.map((g) => (
              <button key={g.dept} className={`ct-todo-dept${openDept === g.dept ? ' active' : ''}`} onClick={() => setOpenDept(g.dept)}>
                {showDept ? <DeptTag dept={g.dept} /> : <span>{g.dept}</span>}
                <span className="ct-todo-count">{g.procs.length} proses · {fmtInt(g.occurrences)} kejadian</span>
              </button>
            ))}
          </div>
          <div className="ct-table-wrap ct-todo-table">
            <table className="ct-table">
              <thead><tr><th>Proses</th><th className="num">Kode</th><th className="num">Produk</th><th className="num">Kejadian</th><th className="num">Rata-rata durasi</th><th>Terakhir</th><th>Produk terdampak (seq_id)</th></tr></thead>
              <tbody>
                {active?.procs.map((p) => (
                  <tr key={p.kode}>
                    <td>{p.nama}</td>
                    <td className="num mono">{p.kode}</td>
                    <td className="num mono">{p.products.length}</td>
                    <td className="num mono">{fmtInt(p.occurrences)}</td>
                    <td className="num mono">{fmtDuration(p.occurrences ? p.durSum / p.occurrences : null)}</td>
                    <td className="mono">{fmtLocalDateTime(p.lastSeen)}</td>
                    <td className="ct-td-products" title={p.products.map((x) => `${x.Product_ID} ${x.Product_Name || ''} (seq ${x.seq_id}/${x.No_urut}${x.has_master_row ? '' : ', tanpa baris master'})`).join('\n')}>
                      {p.products.slice(0, 8).map((x) => `${x.Product_ID} (${x.seq_id})`).join(', ')}{p.products.length > 8 ? ` … +${p.products.length - 8}` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ProcessingControlTower() {
  const { user } = useAuth();
  const scope = useMemo(() => resolveScope(user), [user]);
  const [deptPick, setDeptPick] = useState('ALL');
  const depts = scope.mode === 'all' ? (deptPick === 'ALL' ? [] : [deptPick]) : scope.depts;
  const showDept = scope.mode === 'all' && deptPick === 'ALL';
  const configAccess = useMemo(() => resolveConfigAccess(user), [user]);
  const ackUser = { nik: user?.log_NIK || '', name: user?.Nama || user?.nama || '', dept: user?.emp_DeptID || '', jobLevel: user?.emp_JobLevelID || '' };

  const [live, setLive] = useState(null);
  const [liveError, setLiveError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [granularity, setGranularity] = useState('day');
  const [openAlerts, setOpenAlerts] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const timerRef = useRef(null);

  const fetchLive = useCallback(async () => {
    setRefreshing(true);
    try {
      const json = await getJSON(`/api/controlTower/live?hours=${LIVE_HOURS}${deptsParam(depts)}`);
      setLive(json.data); setLiveError(''); setLastUpdated(new Date());
    } catch (e) { setLiveError(e.message); }
    finally { setRefreshing(false); setInitialLoading(false); }
  }, [depts.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchLive(); }, [fetchLive]);
  useEffect(() => {
    if (paused) return undefined;
    timerRef.current = setInterval(fetchLive, LIVE_POLL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchLive, paused]);

  const onOpenCount = useCallback((n) => setOpenAlerts(n), []);
  const fmtClock = (d) => d?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <main className="content-area" style={{ position: 'relative' }}>
        <DashboardLoading loading={initialLoading} text="Loading Control Tower..." coverContentArea />
        <div className="ct-root">
          <header className="ct-topbar">
            <div className="ct-title-block">
              <h1 className="ct-title">Processing Control Tower</h1>
              <span className="ct-range">
                {scope.mode === 'all' ? 'semua departemen' : `scope ${scope.depts.join(', ') || '-'}`} · red = selesai &lt; {RED_MAX_MINUTES} menit · yellow = terlalu cepat / lama vs standar · clerical tidak di-score
              </span>
            </div>
            <div className="ct-filters">
              {scope.mode === 'all' && (
                <div className="ct-toggle" role="group" aria-label="Department">
                  {['ALL', ...SCOPED_DEPTS].map((d) => (
                    <button key={d} className={`ct-toggle-btn${deptPick === d ? ' active' : ''}`} onClick={() => setDeptPick(d)}>{d === 'ALL' ? 'All' : d}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="ct-topbar-right">
              {lastUpdated && (
                <span className="ct-updated">
                  <span className={`ct-live-dot${paused ? ' off' : ''}`} /> {paused ? 'paused' : 'live'} · {fmtClock(lastUpdated)}
                </span>
              )}
              <button className="ct-btn ghost" onClick={() => { fetchLive(); setRefreshToken((x) => x + 1); }} disabled={refreshing} title="Refresh now">
                <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> Refresh
              </button>
              <button className="ct-btn" onClick={() => setReportOpen(true)}><FileSpreadsheet size={14} /> Report</button>
              <button className="ct-btn" onClick={() => setConfigOpen(true)} title="Threshold & clerical processes"><Settings size={14} /> Configuration</button>
            </div>
          </header>

          {liveError && <div className="ct-error">⚠️ {liveError}</div>}

          <KpiStrip live={live} openAlerts={openAlerts} hours={LIVE_HOURS} />

          <div className="ct-live-grid">
            <LiveFeed rows={live?.completed || []} showDept={showDept} paused={paused} onTogglePause={() => setPaused((p) => !p)} hours={LIVE_HOURS} />
            <RunningBoard rows={live?.running || []} showDept={showDept} />
          </div>

          <TrendCharts granularity={granularity} setGranularity={setGranularity} depts={depts} showDept={showDept} refreshToken={refreshToken} />

          <AlertLog depts={depts} showDept={showDept} user={ackUser} onOpenCount={onOpenCount} refreshToken={refreshToken} />

          <TodoPanel depts={depts} showDept={showDept} refreshToken={refreshToken} />
        </div>

        <ControlTowerReportModal open={reportOpen} onClose={() => setReportOpen(false)} scope={scope} />
        <ControlTowerConfigModal open={configOpen} onClose={() => setConfigOpen(false)} user={ackUser} access={configAccess}
          onSaved={() => { fetchLive(); setRefreshToken((x) => x + 1); }} />
      </main>
    </div>
  );
}
