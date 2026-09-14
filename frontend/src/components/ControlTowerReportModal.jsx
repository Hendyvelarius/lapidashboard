import React, { useState, useMemo } from 'react';
import { X, FileSpreadsheet } from 'lucide-react';
import { apiUrl, fetchWithTimeout } from '../api';
import { useAuth } from '../context/AuthContext';
import { SCOPED_DEPTS, toISODate, daysAgo } from '../config/controlTower';
import { SHEETS, buildWorkbook } from '../utils/controlTowerWorkbook';

// ---------------------------------------------------------------------------
// Deviation report export.
//
// The user picks the window, the departments (within their scope) and which
// sheets to include; the rows are fetched once (red + yellow + green, so flag
// rates on the summary sheets are real) and the workbook is built in the
// browser. Windows are capped at ~13 months by the API.
// ---------------------------------------------------------------------------

const PERIODS = [
  { key: 'MTD', label: 'Bulan ini' },
  { key: 'LAST_MONTH', label: 'Bulan lalu' },
  { key: 'YTD', label: 'YTD' },
  { key: 'CUSTOM', label: 'Custom' },
];

function resolveRange(period, customFrom, customTo) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  if (period === 'MTD') return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: toISODate(now) };
  if (period === 'YTD') return { from: `${now.getFullYear()}-01-01`, to: toISODate(now) };
  if (period === 'LAST_MONTH') {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: toISODate(first), to: toISODate(last) };
  }
  return { from: customFrom, to: customTo };
}

export default function ControlTowerReportModal({ open, onClose, scope }) {
  const { user } = useAuth();
  const [period, setPeriod] = useState('MTD');
  const [customFrom, setCustomFrom] = useState(toISODate(daysAgo(29)));
  const [customTo, setCustomTo] = useState(toISODate(new Date()));
  const [depts, setDepts] = useState(() => (scope.mode === 'all' ? [] : scope.depts));
  const [sheets, setSheets] = useState(() => new Set(SHEETS.map((s) => s.key)));
  const [includeGreenRaw, setIncludeGreenRaw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const range = useMemo(() => resolveRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const rangeValid = Boolean(range.from && range.to && range.from <= range.to);
  const deptOptions = scope.mode === 'all' ? SCOPED_DEPTS : scope.depts;
  const canPickDept = scope.mode === 'all';

  if (!open) return null;

  const toggleDept = (d) => setDepts((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  const toggleSheet = (k) => setSheets((prev) => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n; });

  async function handleExport() {
    setBusy(true); setError('');
    try {
      setProgress('Mengambil data…');
      const effectiveDepts = canPickDept ? depts : scope.depts;
      const params = new URLSearchParams({ from: range.from, to: range.to, severities: 'red,yellow,green,nostd' });
      if (effectiveDepts.length) params.set('depts', effectiveDepts.join(','));
      const [res, thrRes] = await Promise.all([
        fetchWithTimeout(apiUrl(`/api/controlTower/report?${params}`), {}, 300000),
        fetchWithTimeout(apiUrl('/api/controlTower/thresholds')),
      ]);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (status ${res.status})`);
      }
      const data = (await res.json()).data || { rows: [], acks: [] };
      const thresholds = thrRes.ok ? (await thrRes.json()).data : null;
      if (!data.rows.length) { setError('Tidak ada proses pada rentang dan filter tersebut.'); return; }

      setProgress(`Menyusun workbook (${data.rows.length.toLocaleString('id-ID')} baris)…`);
      // Styled writer, loaded on demand so it stays out of the main bundle.
      const XLSX = await import('xlsx-js-style');
      const wb = buildWorkbook(XLSX, data, {
        from: range.from, to: range.to, depts: effectiveDepts, sheets: [...sheets], includeGreenRaw, thresholds,
        generatedOn: toISODate(new Date()), generatedBy: user?.Nama || user?.nama || user?.log_NIK || '',
      });
      const scopeName = effectiveDepts.length ? effectiveDepts.join('-') : 'All';
      const name = `Control Tower Deviation ${scopeName} ${range.from} to ${range.to}.xlsx`;
      XLSX.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, '-'));
      onClose();
    } catch (err) {
      setError(err.message || 'Export gagal');
    } finally { setBusy(false); setProgress(''); }
  }

  return (
    <div className="ct-modal-overlay" onClick={busy ? undefined : onClose}>
      <div className="ct-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-head">
          <div className="ct-modal-title"><FileSpreadsheet size={16} /> Deviation report (.xlsx)</div>
          <button className="ct-icon-btn" onClick={onClose} disabled={busy}><X size={16} /></button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-field-label">Periode (tanggal selesai proses)</div>
          <div className="ct-chips">
            {PERIODS.map((p) => (
              <button key={p.key} className={`ct-chip${period === p.key ? ' active' : ''}`} onClick={() => setPeriod(p.key)}>{p.label}</button>
            ))}
            {period === 'CUSTOM' && (
              <>
                <input type="date" className="ct-date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
                <span className="ct-muted">–</span>
                <input type="date" className="ct-date" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
              </>
            )}
            <span className="ct-muted">{range.from} → {range.to}</span>
          </div>

          <div className="ct-field-label">Departemen {canPickDept && <span className="ct-muted">(kosong = semua)</span>}</div>
          <div className="ct-chips">
            {deptOptions.map((d) => (
              <button key={d} className={`ct-chip${(canPickDept ? depts.includes(d) : true) ? ' active' : ''}`} onClick={() => canPickDept && toggleDept(d)} disabled={!canPickDept}>{d}</button>
            ))}
          </div>

          <div className="ct-field-label">Sheet yang disertakan</div>
          <div className="ct-sheet-grid">
            {SHEETS.map((s) => (
              <label key={s.key} className={`ct-check${sheets.has(s.key) ? ' active' : ''}`}>
                <input type="checkbox" checked={sheets.has(s.key)} onChange={() => toggleSheet(s.key)} />
                <span className="ct-check-label">{s.label}</span>
                <span className="ct-check-hint">{s.desc}</span>
              </label>
            ))}
          </div>
          <label className={`ct-check inline${includeGreenRaw ? ' active' : ''}`} style={{ marginTop: 8 }}>
            <input type="checkbox" checked={includeGreenRaw} onChange={(e) => setIncludeGreenRaw(e.target.checked)} disabled={!sheets.has('raw')} />
            <span className="ct-check-label">Sertakan proses normal (green) di Raw Data</span>
            <span className="ct-check-hint">file jadi jauh lebih besar; sheet ringkasan tetap menghitung green untuk flag rate</span>
          </label>

          {progress && <div className="ct-muted" style={{ marginTop: 10 }}>{progress}</div>}
          {error && <div className="ct-error">⚠️ {error}</div>}
        </div>
        <div className="ct-modal-foot">
          <span className="ct-muted">Rentang maksimal ±13 bulan. Rentang setahun bisa memakan waktu 10–30 detik.</span>
          <div>
            <button className="ct-btn ghost" onClick={onClose} disabled={busy}>Batal</button>
            <button className="ct-btn primary" onClick={handleExport} disabled={busy || !rangeValid || sheets.size === 0}>
              {busy ? 'Memproses…' : 'Download .xlsx'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
