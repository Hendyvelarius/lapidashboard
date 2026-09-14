import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiUrl, fetchWithTimeout } from '../api';
import { SCOPED_DEPTS, RED_MAX_MINUTES, fmtDateTime } from '../config/controlTower';

// ---------------------------------------------------------------------------
// Threshold settings (NT only).
//
// Yellow = actual/standard <= fast or >= slow. One default row ('*') plus an
// optional override per department. Red (< RED_MAX_MINUTES) is fixed in the
// backend and only displayed here so the rule set reads as a whole.
// ---------------------------------------------------------------------------

export default function ControlTowerSettingsModal({ open, onClose, user, onSaved }) {
  const [rows, setRows] = useState([]);       // [{ dept, fast_ratio, slow_ratio }]
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setError('');
    (async () => {
      try {
        const res = await fetchWithTimeout(apiUrl('/api/controlTower/thresholds'));
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || `status ${res.status}`);
        if (cancelled) return;
        setRows(json.data.rows.map((r) => ({ dept: r.dept, fast_ratio: String(r.fast_ratio), slow_ratio: String(r.slow_ratio) })));
        const last = json.data.rows.find((r) => r.updated_by);
        setMeta(last ? { by: last.updated_by_name || last.updated_by, at: last.updated_at } : null);
      } catch (e) { if (!cancelled) setError(e.message); }
    })();
    return () => { cancelled = true; };
  }, [open]);

  if (!open) return null;

  const def = rows.find((r) => r.dept === '*') || { fast_ratio: '0.5', slow_ratio: '2' };
  const overridden = new Set(rows.filter((r) => r.dept !== '*').map((r) => r.dept));

  const setVal = (dept, key, val) => setRows((prev) => prev.map((r) => (r.dept === dept ? { ...r, [key]: val } : r)));
  const addOverride = (dept) => setRows((prev) => [...prev, { dept, fast_ratio: def.fast_ratio, slow_ratio: def.slow_ratio }]);
  const removeOverride = (dept) => setRows((prev) => prev.filter((r) => r.dept !== dept));

  async function save() {
    setBusy(true); setError('');
    try {
      const payload = rows.map((r) => ({ dept: r.dept, fast_ratio: Number(r.fast_ratio), slow_ratio: Number(r.slow_ratio) }));
      const res = await fetchWithTimeout(apiUrl('/api/controlTower/thresholds'), {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rows: payload, user }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `status ${res.status}`);
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const pct = (v) => { const n = Number(v); return isNaN(n) ? '-' : `${Math.round(n * 100)}%`; };

  // A plain render function (not a nested component) so inputs keep focus while typing.
  const renderRow = (r, isDefault) => (
    <tr key={r.dept}>
      <td><strong>{isDefault ? 'Default (semua dept)' : r.dept}</strong></td>
      <td className="num">
        <input type="number" step="0.05" min="0.05" max="0.95" className="ct-input" value={r.fast_ratio} onChange={(e) => setVal(r.dept, 'fast_ratio', e.target.value)} />
        <span className="ct-muted"> ×  ({pct(r.fast_ratio)})</span>
      </td>
      <td className="num">
        <input type="number" step="0.5" min="1.1" max="100" className="ct-input" value={r.slow_ratio} onChange={(e) => setVal(r.dept, 'slow_ratio', e.target.value)} />
        <span className="ct-muted"> ×  ({pct(r.slow_ratio)})</span>
      </td>
      <td>{isDefault ? <span className="ct-muted">wajib</span> : <button className="ct-btn ghost tiny" onClick={() => removeOverride(r.dept)}>Hapus</button>}</td>
    </tr>
  );

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-head">
          <div className="ct-modal-title">Threshold alert</div>
          <button className="ct-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="ct-modal-body">
          <div className="ct-rule-box">
            <div><strong>Red — Instant tap.</strong> Durasi kerja &lt; {RED_MAX_MINUTES} menit, apa pun standarnya. Aturan ini tetap dan tidak bisa diubah.</div>
            <div><strong>Yellow — Deviasi.</strong> Rasio aktual/standar ≤ <em>fast</em> (terlalu cepat) atau ≥ <em>slow</em> (terlalu lama). Angka di bawah ini yang menentukan.</div>
            <div><strong>Green — Normal.</strong> Sisanya. Proses tanpa standar tidak di-score dan masuk To-Do.</div>
          </div>
          <table className="ct-table ct-settings-table">
            <thead><tr><th>Dept</th><th className="num">Fast ratio (≤)</th><th className="num">Slow ratio (≥)</th><th /></tr></thead>
            <tbody>
              {renderRow(def, true)}
              {rows.filter((r) => r.dept !== "*").map((r) => renderRow(r, false))}
            </tbody>
          </table>
          <div className="ct-chips" style={{ marginTop: 10 }}>
            <span className="ct-muted">Override per dept:</span>
            {SCOPED_DEPTS.filter((d) => !overridden.has(d)).map((d) => (
              <button key={d} className="ct-chip" onClick={() => addOverride(d)}>+ {d}</button>
            ))}
          </div>
          {meta && <div className="ct-muted" style={{ marginTop: 10 }}>Terakhir diubah oleh {meta.by} · {fmtDateTime(meta.at)}</div>}
          {error && <div className="ct-error">⚠️ {error}</div>}
        </div>
        <div className="ct-modal-foot">
          <span className="ct-muted">Perubahan langsung berlaku untuk semua perhitungan (live, chart, log, report).</span>
          <div>
            <button className="ct-btn ghost" onClick={onClose} disabled={busy}>Batal</button>
            <button className="ct-btn primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
