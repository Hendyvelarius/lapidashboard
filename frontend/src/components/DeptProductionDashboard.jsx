import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Play, Pause, ChevronDown } from 'lucide-react';
import Sidebar from './Sidebar';
import DashboardLoading from './DashboardLoading';
import { apiUrlWithRefresh, fetchWithTimeout } from '../api';
import './DeptProductionDashboard.css';

// NOTE: ChartDataLabels is registered *locally* per <Bar> (via the plugins prop),
// never globally, so it does not leak onto the other dashboards' charts.
ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const DEPT_OPTIONS = [
  { key: 'ALL', label: 'All' },
  { key: 'PN1', label: 'PN1' },
  { key: 'PN2', label: 'PN2' },
];

const CHART_MODES = [
  { key: 'month', label: 'By Month' },
  { key: 'sediaan', label: 'By Sediaan' },
];

const METRIC_ORDER = ['output', 'yield', 'fulfillment'];
const ROTATE_MS = 20000;      // details tab auto-rotate cadence
const SCROLL_HOLD_MS = 1500;  // pause at top/bottom of the auto-scroll
const SCROLL_SPEED = 22;      // px per second

// Muted, professional categorical palette. The first 8 hues are validated
// (dataviz skill: chroma-floor + CVD floor-band pass, relieved by the shared
// chip legend + Details table). The rest are muted extensions for the long tail.
const PALETTE = [
  '#3f78c0', '#2e9c86', '#c9a227', '#5a9438', '#6d5eb0', '#b5584f', '#bd6b92', '#cc8b5c',
  '#6b7f99', '#8a8f4a', '#9c7a5c', '#5f8f8a', '#97739c', '#4b8fa6', '#7a9464', '#b57a63',
  '#8a5f7a', '#7d8ca0', '#a58f4f', '#6f9a7d',
];

// Shorter, still-clear display labels for the long sediaan names (charts get
// cramped otherwise). Anything not listed shows as-is. Full name stays in
// tooltips / title attributes.
const SHORT_SEDIAAN = {
  'Tablet Biasa Kapsul': 'Tablet Kapsul',
  'Tablet Effervescent': 'Tablet EV',
  'Serbuk Effervescent': 'Serbuk EV',
  'Probiotik & Hormon': 'Prob & Hormon',
  'Kapsul Lunak': 'Kaps Lunak',
  'Suppositoria': 'Suppo',
  'Pangan Olahan': 'Pangan',
  'Soft Capsule': 'Soft Cap',
};
const shortSediaan = (s) => SHORT_SEDIAAN[s] || s;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPeriode(periode) {
  const p = String(periode);
  if (p.length !== 6) return p;
  const year = p.slice(2, 4);
  const month = parseInt(p.slice(4, 6), 10);
  return `${MONTH_NAMES[month - 1]} '${year}`;
}

const numberFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
const fmtInt = (v) => numberFmt.format(Math.round(v || 0));
const fmtPct = (v) => (v === null || v === undefined || isNaN(v) ? '-' : `${v.toFixed(1)}%`);

// Concise output magnitude: 13M, 1.3M, 271k, 45k, 830.
function fmtBarOutput(v) {
  const n = Math.round(v || 0);
  const a = Math.abs(n);
  if (a >= 1e6) return `${(n / 1e6).toFixed(a % 1e6 === 0 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}k`;
  return String(n);
}

const METRICS = {
  output: {
    key: 'output', label: 'Output', unit: 'units produced', stacked: true,
    num: (r) => Number(r.SumOutput) || 0, den: () => 0,
    value: (acc) => acc.num,
    format: fmtInt, barFmt: fmtBarOutput, axisFmt: fmtBarOutput, isPct: false, axisMax: null,
  },
  yield: {
    key: 'yield', label: 'Yield', unit: 'avg actual yield %', stacked: false,
    num: (r) => Number(r.SumRendemenActual) || 0, den: (r) => Number(r.YieldBatchCount) || 0,
    value: (acc) => (acc.den > 0 ? acc.num / acc.den : null),
    format: fmtPct, barFmt: fmtPct, axisFmt: (v) => `${v}%`, isPct: true, axisMax: null,
  },
  fulfillment: {
    key: 'fulfillment', label: 'Order Fulfillment', unit: 'released / target', stacked: false,
    num: (r) => Number(r.SumRelease) || 0, den: (r) => Number(r.SumTarget) || 0,
    value: (acc) => (acc.den > 0 ? (100 * acc.num) / acc.den : null),
    format: fmtPct, barFmt: fmtPct, axisFmt: (v) => `${v}%`, isPct: true, axisMax: 100,
  },
};

const deptMatches = (rowDept, filter) => (filter === 'ALL' ? true : rowDept === filter);

function useAggregate(rows, periods, metric, deptFilter) {
  return useMemo(() => {
    const cellMap = new Map();
    const totalMap = new Map();
    const weight = new Map();
    const add = (map, key, r) => {
      const cur = map.get(key) || { num: 0, den: 0 };
      cur.num += metric.num(r); cur.den += metric.den(r); map.set(key, cur);
    };
    for (const r of rows) {
      if (!deptMatches(r.Dept, deptFilter)) continue;
      const sediaan = r.Sediaan || 'Belum Ada';
      add(cellMap, `${sediaan}|${r.Periode}`, r);
      add(totalMap, sediaan, r);
      const w = (Number(r.SumOutput) || 0) + (Number(r.YieldBatchCount) || 0) + (Number(r.SumTarget) || 0);
      weight.set(sediaan, (weight.get(sediaan) || 0) + w);
    }
    const sediaanList = [...weight.keys()].sort((a, b) => (weight.get(b) || 0) - (weight.get(a) || 0));
    const cell = (s, p) => {
      const acc = cellMap.get(`${s}|${p}`);
      return acc ? metric.value(acc) : (metric.key === 'output' ? 0 : null);
    };
    const combined = (s) => {
      const acc = totalMap.get(s);
      return acc ? metric.value(acc) : (metric.key === 'output' ? 0 : null);
    };
    let gnum = 0, gden = 0;
    for (const acc of totalMap.values()) { gnum += acc.num; gden += acc.den; }
    const overall = metric.value({ num: gnum, den: gden });
    return { sediaanList, cell, combined, overall };
  }, [rows, periods, metric, deptFilter]);
}

function useColorMap(masterSediaan) {
  return useMemo(() => {
    const map = {};
    masterSediaan.forEach((s, i) => { map[s] = PALETTE[i % PALETTE.length]; });
    return map;
  }, [masterSediaan]);
}

// ---------------------------------------------------------------------------
// Chart card
// ---------------------------------------------------------------------------
function MetricChart({ metric, rows, periods, deptFilter, chartMode, selectedSediaan, colorMap }) {
  const agg = useAggregate(rows, periods, metric, deptFilter);
  const shown = agg.sediaanList.filter((s) => selectedSediaan.has(s));
  const bySediaan = chartMode === 'sediaan';
  const stacked = metric.stacked && !bySediaan;

  const data = useMemo(() => {
    const clean = (v) => (v === null || v === undefined ? null : Number(v.toFixed ? +v.toFixed(4) : v));
    if (!bySediaan) {
      return {
        labels: periods.map(formatPeriode),
        datasets: shown.map((s) => ({
          label: s,
          data: periods.map((p) => clean(agg.cell(s, p))),
          backgroundColor: colorMap[s], borderColor: colorMap[s], borderWidth: 0,
          borderRadius: 3, borderSkipped: false, maxBarThickness: 46,
        })),
      };
    }
    return {
      labels: shown,
      datasets: [{
        label: metric.label,
        data: shown.map((s) => clean(agg.combined(s))),
        backgroundColor: shown.map((s) => colorMap[s]),
        borderRadius: 4, borderSkipped: false, maxBarThickness: 60,
      }],
    };
  }, [bySediaan, periods, shown, agg, colorMap, metric]);

  const options = useMemo(() => {
    // Data-label visibility: always in By Sediaan; for By Month keep it readable
    // (stacked output auto-thins overlaps; grouped yield/OF only when ≤3 series).
    const labelDisplay = (ctx) => {
      const v = ctx.dataset.data[ctx.dataIndex];
      if (v === null || v === undefined) return false;
      if (bySediaan) return true;
      if (stacked) return 'auto';
      return shown.length <= 3;
    };
    return {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 300 },
      layout: { padding: { top: 18 } },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const v = ctx.parsed.y;
              const name = bySediaan ? metric.label : ctx.dataset.label;
              return `${name}: ${v === null || v === undefined ? '-' : metric.format(v)}`;
            },
          },
        },
        datalabels: {
          display: labelDisplay,
          formatter: (v) => (v === null || v === undefined ? '' : metric.barFmt(v)),
          anchor: stacked ? 'center' : 'end',
          align: stacked ? 'center' : 'end',
          offset: stacked ? 0 : 1,
          clamp: true,
          color: stacked ? '#ffffff' : '#334155',
          font: { size: 11, weight: '700' },
        },
      },
      scales: {
        x: {
          stacked, grid: { display: false },
          ticks: {
            font: { size: 12 }, color: '#334155', autoSkip: false,
            maxRotation: bySediaan ? 45 : 0, minRotation: bySediaan ? 45 : 0,
            callback(value) {
              const lbl = this.getLabelForValue(value);
              return bySediaan ? shortSediaan(lbl) : lbl;
            },
          },
        },
        y: {
          stacked, beginAtZero: true, suggestedMax: metric.axisMax || undefined,
          grace: '8%', grid: { color: '#eef2f6' },
          ticks: { font: { size: 10 }, maxTicksLimit: 5, callback: (val) => metric.axisFmt(val) },
        },
      },
    };
  }, [metric, bySediaan, stacked, shown]);

  return (
    <div className="dp-card dp-chart-card">
      <div className="dp-card-head">
        <h3>{metric.label}</h3>
        <span className="dp-card-metric">
          {metric.overall === null ? '' : metric.isPct ? metric.format(agg.overall) : `${fmtBarOutput(agg.overall)} total`}
        </span>
      </div>
      <div className="dp-chart-body">
        {shown.length === 0
          ? <div className="dp-empty">Select at least one sediaan.</div>
          : <Bar data={data} options={options} plugins={[ChartDataLabels]} />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Details table (rendered inside the auto-rotating / auto-scrolling panel)
// ---------------------------------------------------------------------------
function MetricTable({ metric, rows, periods, deptFilter, colorMap }) {
  const agg = useAggregate(rows, periods, metric, deptFilter);
  const { isPct } = metric;
  const cellFmt = isPct ? fmtPct : fmtBarOutput;   // compact so all months fit
  const tableRows = agg.sediaanList.map((s) => ({
    sediaan: s,
    cells: periods.map((p) => agg.cell(s, p)),
    summary: agg.combined(s),
  }));
  const footer = periods.map((p) =>
    isPct ? null : agg.sediaanList.reduce((sum, s) => sum + (agg.cell(s, p) || 0), 0));

  return (
    <table className="dp-table">
      <thead>
        <tr>
          <th className="dp-sticky-col">Sediaan</th>
          {periods.map((p) => <th key={p}>{formatPeriode(p)}</th>)}
          <th className="dp-summary-col">{isPct ? 'Avg' : 'Total'}</th>
        </tr>
      </thead>
      <tbody>
        {tableRows.map((row) => (
          <tr key={row.sediaan}>
            <td className="dp-sticky-col" title={row.sediaan}>
              <span className="dp-dot" style={{ background: colorMap[row.sediaan] }} />
              <span className="dp-sed-name">{shortSediaan(row.sediaan)}</span>
            </td>
            {row.cells.map((v, i) => <td key={i}>{v === null || v === undefined ? '-' : cellFmt(v)}</td>)}
            <td className="dp-summary-col">{row.summary === null ? '-' : cellFmt(row.summary)}</td>
          </tr>
        ))}
      </tbody>
      {!isPct && (
        <tfoot>
          <tr>
            <td className="dp-sticky-col">Total</td>
            {footer.map((v, i) => <td key={i}>{cellFmt(v)}</td>)}
            <td className="dp-summary-col">{cellFmt(footer.reduce((s, v) => s + (v || 0), 0))}</td>
          </tr>
        </tfoot>
      )}
    </table>
  );
}

// ---------------------------------------------------------------------------
// Main dashboard
// ---------------------------------------------------------------------------
export default function DeptProductionDashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [outputYield, setOutputYield] = useState({ periods: [], rows: [] });
  const [fulfillment, setFulfillment] = useState({ periods: [], rows: [] });
  const [lastUpdated, setLastUpdated] = useState(null);

  const [deptFilter, setDeptFilter] = useState('ALL');
  const [chartMode, setChartMode] = useState('sediaan');   // default: compare sediaan
  const [selectedSediaan, setSelectedSediaan] = useState(new Set());
  const [sediaanMenuOpen, setSediaanMenuOpen] = useState(false);

  const [detailMetric, setDetailMetric] = useState('output');
  const [autoRotate, setAutoRotate] = useState(true);

  const sediaanMenuRef = useRef(null);
  const tableScrollRef = useRef(null);

  const fetchData = useCallback(async (skipCache = false) => {
    try {
      skipCache ? setRefreshing(true) : setLoading(true);
      setError(null);
      const [oyRes, ofRes] = await Promise.all([
        fetchWithTimeout(apiUrlWithRefresh('/api/deptProduction/outputYield', skipCache)),
        fetchWithTimeout(apiUrlWithRefresh('/api/deptProduction/fulfillment', skipCache)),
      ]);
      const oyJson = await oyRes.json();
      const ofJson = await ofRes.json();
      setOutputYield(oyJson.data || { periods: [], rows: [] });
      setFulfillment(ofJson.data || { periods: [], rows: [] });
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading Dept Production data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(false); }, [fetchData]);

  // Auto-rotate the details metric every ROTATE_MS.
  useEffect(() => {
    if (!autoRotate) return undefined;
    const id = setInterval(() => {
      setDetailMetric((m) => METRIC_ORDER[(METRIC_ORDER.indexOf(m) + 1) % METRIC_ORDER.length]);
    }, ROTATE_MS);
    return () => clearInterval(id);
  }, [autoRotate]);

  // Jump the details table back to the top when its content changes.
  useEffect(() => {
    if (tableScrollRef.current) tableScrollRef.current.scrollTop = 0;
  }, [detailMetric, deptFilter, periodsKey(outputYield, fulfillment), selectedSediaan]);

  // Auto-scroll the details table (ping-pong, with a pause at each end).
  // Pausing keeps the current position; resuming continues from there.
  // NOTE: the scroll position is tracked in a float (`pos`) and written to
  // scrollTop — never read back — because on 1x displays the browser rounds
  // scrollTop to whole pixels, so `scrollTop += 0.35` would never accumulate.
  useEffect(() => {
    const el = tableScrollRef.current;
    if (!el || !autoRotate) return undefined;
    let raf, dir = 1, last = performance.now(), holdUntil = last + 700;
    let pos = el.scrollTop;
    const tick = (now) => {
      const max = el.scrollHeight - el.clientHeight;
      if (max > 4 && now >= holdUntil) {
        const dt = Math.min(now - last, 50) / 1000;
        pos += dir * SCROLL_SPEED * dt;
        if (pos >= max) { pos = max; dir = -1; holdUntil = now + SCROLL_HOLD_MS; }
        else if (pos <= 0) { pos = 0; dir = 1; holdUntil = now + SCROLL_HOLD_MS; }
        el.scrollTop = pos;
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoRotate, detailMetric, deptFilter, periodsKey(outputYield, fulfillment), selectedSediaan]);

  // Close the sediaan popover on outside click.
  useEffect(() => {
    if (!sediaanMenuOpen) return undefined;
    const onDocClick = (e) => {
      if (sediaanMenuRef.current && !sediaanMenuRef.current.contains(e.target)) setSediaanMenuOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [sediaanMenuOpen]);

  const periods = outputYield.periods?.length ? outputYield.periods : fulfillment.periods;

  const masterSediaan = useMemo(() => {
    const weight = new Map();
    const bump = (s, w) => weight.set(s, (weight.get(s) || 0) + w);
    for (const r of outputYield.rows) bump(r.Sediaan || 'Belum Ada', (Number(r.SumOutput) || 0) + (Number(r.BatchCount) || 0));
    for (const r of fulfillment.rows) bump(r.Sediaan || 'Belum Ada', Number(r.SumTarget) || 0);
    return [...weight.keys()].sort((a, b) => (weight.get(b) || 0) - (weight.get(a) || 0));
  }, [outputYield.rows, fulfillment.rows]);

  const colorMap = useColorMap(masterSediaan);

  // Default: everything except "Belum Ada".
  const seededRef = useRef(false);
  useEffect(() => {
    if (!seededRef.current && masterSediaan.length) {
      seededRef.current = true;
      setSelectedSediaan(new Set(masterSediaan.filter((s) => s !== 'Belum Ada')));
    }
  }, [masterSediaan]);

  const toggleSediaan = (s) => setSelectedSediaan((prev) => {
    const next = new Set(prev);
    next.has(s) ? next.delete(s) : next.add(s);
    return next;
  });
  const selectAllSediaan = () => setSelectedSediaan(new Set(masterSediaan));
  const clearSediaan = () => setSelectedSediaan(new Set());

  const pickDetail = (key) => { setDetailMetric(key); setAutoRotate(false); };
  const formatTimestamp = (d) => d?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const rowsFor = (m) => (m === 'fulfillment' ? fulfillment.rows : outputYield.rows);
  const activeMetric = METRICS[detailMetric];

  return (
    <div className="dashboard-container" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <main className="content-area" style={{ position: 'relative' }}>
        <DashboardLoading loading={loading} text="Loading Line Metrics..." coverContentArea />

        <div className="dp-root">
          {/* ---- Compact header with integrated filters ---- */}
          <header className="dp-topbar">
            <div className="dp-title-block">
              <h1 className="dp-title">Line Metrics</h1>
              <span className="dp-range">
                {periods.length ? `${formatPeriode(periods[0])} – ${formatPeriode(periods[periods.length - 1])}` : 'last 13 months'}
              </span>
            </div>

            <div className="dp-filters">
              <div className="dp-toggle" role="group" aria-label="Department">
                {DEPT_OPTIONS.map((o) => (
                  <button key={o.key} className={`dp-toggle-btn${deptFilter === o.key ? ' active' : ''}`}
                    onClick={() => setDeptFilter(o.key)}>{o.label}</button>
                ))}
              </div>
              <div className="dp-toggle" role="group" aria-label="Chart view">
                {CHART_MODES.map((o) => (
                  <button key={o.key} className={`dp-toggle-btn${chartMode === o.key ? ' active' : ''}`}
                    onClick={() => setChartMode(o.key)}>{o.label}</button>
                ))}
              </div>

              <div className="dp-sediaan-picker" ref={sediaanMenuRef}>
                <button className="dp-picker-btn" onClick={() => setSediaanMenuOpen((v) => !v)}>
                  Sediaan <strong>{selectedSediaan.size}</strong>
                  <ChevronDown size={14} />
                </button>
                {sediaanMenuOpen && (
                  <div className="dp-picker-popover">
                    <div className="dp-picker-actions">
                      <span>Select sediaan</span>
                      <div>
                        <button className="dp-link-btn" onClick={selectAllSediaan}>all</button>
                        <button className="dp-link-btn" onClick={clearSediaan}>none</button>
                      </div>
                    </div>
                    <div className="dp-chips">
                      {masterSediaan.map((s) => (
                        <button key={s} className={`dp-chip${selectedSediaan.has(s) ? ' active' : ''}`}
                          onClick={() => toggleSediaan(s)} title={s}
                          style={selectedSediaan.has(s) ? { borderColor: colorMap[s], background: `${colorMap[s]}1f` } : undefined}>
                          <span className="dp-dot" style={{ background: colorMap[s] }} />
                          {shortSediaan(s)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="dp-topbar-right">
              {lastUpdated && <span className="dp-updated">Updated {formatTimestamp(lastUpdated)}</span>}
              <button className="dp-refresh" onClick={() => fetchData(true)} disabled={refreshing || loading}>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            </div>
          </header>

          {/* Shared chip legend strip */}
          <div className="dp-legend-strip">
            {masterSediaan.filter((s) => selectedSediaan.has(s)).map((s) => (
              <span key={s} className="dp-legend-item" title={s}>
                <span className="dp-dot" style={{ background: colorMap[s] }} />{shortSediaan(s)}
              </span>
            ))}
            {selectedSediaan.size === 0 && <span className="dp-legend-empty">No sediaan selected</span>}
          </div>

          {error && <div className="dp-error">⚠️ {error}</div>}

          {/* ---- 2x2 grid ---- */}
          {!loading && (
            <div className="dp-grid">
              <MetricChart metric={METRICS.output} rows={outputYield.rows} periods={periods}
                deptFilter={deptFilter} chartMode={chartMode} selectedSediaan={selectedSediaan} colorMap={colorMap} />
              <MetricChart metric={METRICS.yield} rows={outputYield.rows} periods={periods}
                deptFilter={deptFilter} chartMode={chartMode} selectedSediaan={selectedSediaan} colorMap={colorMap} />
              <MetricChart metric={METRICS.fulfillment} rows={fulfillment.rows} periods={periods}
                deptFilter={deptFilter} chartMode={chartMode} selectedSediaan={selectedSediaan} colorMap={colorMap} />

              {/* Details quadrant */}
              <div className="dp-card dp-detail-card">
                <div className="dp-detail-head">
                  <div className="dp-detail-tabs">
                    {METRIC_ORDER.map((k) => (
                      <button key={k} className={`dp-detail-tab${detailMetric === k ? ' active' : ''}`}
                        onClick={() => pickDetail(k)}>{METRICS[k].label}</button>
                    ))}
                  </div>
                  <button className="dp-rotate-btn" title={autoRotate ? 'Pause auto-rotate & auto-scroll' : 'Resume auto-rotate'}
                    onClick={() => setAutoRotate((v) => !v)}>
                    {autoRotate ? <Pause size={14} /> : <Play size={14} />}
                    <span>{autoRotate ? 'Auto' : 'Paused'}</span>
                  </button>
                </div>
                <div className="dp-detail-subhead">
                  <span className="dp-detail-title">{activeMetric.label} details</span>
                  <span className="dp-detail-unit">{activeMetric.unit} · {deptFilter === 'ALL' ? 'All depts' : deptFilter}</span>
                </div>
                <div className="dp-detail-table-scroll" ref={tableScrollRef}>
                  <div className="dp-detail-anim" key={detailMetric}>
                    <MetricTable metric={activeMetric} rows={rowsFor(detailMetric)} periods={periods}
                      deptFilter={deptFilter} colorMap={colorMap} />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Stable dependency signal for the auto-scroll effect (re-run when data volume changes).
function periodsKey(oy, of) {
  return `${oy.periods?.length || 0}:${oy.rows?.length || 0}:${of.rows?.length || 0}`;
}
