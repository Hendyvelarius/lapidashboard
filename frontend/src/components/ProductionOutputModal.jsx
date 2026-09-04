import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { apiUrl, fetchWithTimeout } from '../api';
import { buildWorkbook, writeWithFrozenPanes, MONTHS_ID } from '../utils/productionOutputWorkbook';

// ---------------------------------------------------------------------------
// Production Output export
//
// Output per product from the QA-release report table, which reaches back to
// January 2017. The period is chosen by month, not by day: the source is keyed
// on the tempel-label month, so a part-month has no meaning here.
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { key: 'ALL', label: 'Semua periode', hint: 'Sejak data tersedia' },
  { key: 'YTD', label: 'YTD', hint: 'Januari s/d bulan terakhir' },
  { key: 'MTD', label: 'Bulan terakhir', hint: 'Bulan terakhir yang ada datanya' },
  { key: 'LAST12', label: '12 bulan terakhir', hint: 'Rolling 12 bulan' },
  { key: 'CUSTOM', label: 'Pilih sendiri', hint: 'Rentang bulan & tahun' },
];

const pad = (n) => String(n).padStart(2, '0');
/** 'YYYYMM' -> 'Agustus 2026' */
const periodLabel = (p) => (p && p.length === 6
  ? `${MONTHS_ID[parseInt(p.slice(4), 10) - 1]} ${p.slice(0, 4)}`
  : '');
/** Shift a 'YYYYMM' period by n months. */
function addMonths(p, n) {
  const y = parseInt(p.slice(0, 4), 10);
  const m = parseInt(p.slice(4), 10) - 1 + n;
  const d = new Date(y, m, 1);
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}`;
}

/** Resolve the chosen preset against the range the source data actually covers. */
function resolveRange(preset, min, max, customFrom, customTo) {
  if (!min || !max) return { from: '', to: '' };
  switch (preset) {
    case 'ALL': return { from: min, to: max };
    case 'YTD': return { from: max.slice(0, 4) + '01', to: max };
    case 'MTD': return { from: max, to: max };
    case 'LAST12': {
      const from = addMonths(max, -11);
      return { from: from < min ? min : from, to: max };
    }
    default: return { from: customFrom, to: customTo };
  }
}

export default function ProductionOutputModal({ open, onClose }) {
  const [preset, setPreset] = useState('ALL');
  const [range, setRange] = useState({ min: '', max: '' });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadingRange, setLoadingRange] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    setLoadingRange(true);
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(apiUrl('/api/productionOutputRange'));
        if (!res.ok) throw new Error(`status ${res.status}`);
        const { data } = await res.json();
        if (cancelled) return;
        setRange({ min: data.MinPeriode || '', max: data.MaxPeriode || '' });
        setCustomFrom(data.MaxPeriode ? data.MaxPeriode.slice(0, 4) + '01' : '');
        setCustomTo(data.MaxPeriode || '');
      } catch (err) {
        if (!cancelled) setError(`Gagal memuat rentang data: ${err.message}`);
      } finally {
        if (!cancelled) setLoadingRange(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const sel = useMemo(
    () => resolveRange(preset, range.min, range.max, customFrom, customTo),
    [preset, range, customFrom, customTo]
  );
  const valid = Boolean(sel.from && sel.to && sel.from <= sel.to);

  const years = useMemo(() => {
    if (!range.min || !range.max) return [];
    const a = parseInt(range.min.slice(0, 4), 10), b = parseInt(range.max.slice(0, 4), 10);
    return Array.from({ length: b - a + 1 }, (_, i) => a + i);
  }, [range]);

  async function handleExport() {
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithTimeout(
        apiUrl(`/api/productionOutput?from=${sel.from}&to=${sel.to}`), {}, 180000);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Permintaan gagal (status ${res.status})`);
      }
      const rows = (await res.json()).data || [];
      if (!rows.length) {
        setError('Tidak ada output produksi pada rentang tersebut.');
        return;
      }

      // Loaded on demand so the styled writer stays out of the main bundle.
      const [XLSXmod, JSZipMod] = await Promise.all([
        import('xlsx-js-style'),
        import('jszip'),
      ]);
      const generatedOn = new Date().toLocaleDateString('id-ID',
        { day: 'numeric', month: 'long', year: 'numeric' });
      const { wb } = buildWorkbook(XLSXmod, rows, { generatedOn });
      const blob = await writeWithFrozenPanes(XLSXmod, JSZipMod, wb, [
        { sheet: 1, ySplit: 5, xSplit: 3 },
        { sheet: 2, ySplit: 5, xSplit: 3 },
      ]);

      const span = sel.from === sel.to ? sel.from : `${sel.from}-${sel.to}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Production Output ${span}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError(err.message || 'Export gagal');
    } finally {
      setBusy(false);
    }
  }

  const chip = (active) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    border: `1px solid ${active ? '#0f766e' : '#e5e7eb'}`,
    backgroundColor: active ? '#ecfdf5' : '#fff',
    color: active ? '#0f766e' : '#374151',
    fontWeight: active ? 700 : 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });
  const label = { fontWeight: 600, color: '#374151', fontSize: '0.85rem', marginBottom: '8px', display: 'block' };
  const select = { padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' };

  const monthYearPicker = (value, onChange, key) => {
    const y = value ? value.slice(0, 4) : '';
    const m = value ? value.slice(4) : '';
    return (
      <span style={{ display: 'inline-flex', gap: '6px' }} key={key}>
        <select value={m} style={select}
          onChange={(e) => onChange(`${y}${e.target.value}`)}>
          {MONTHS_ID.map((name, i) => (
            <option key={name} value={pad(i + 1)}>{name}</option>
          ))}
        </select>
        <select value={y} style={select}
          onChange={(e) => onChange(`${e.target.value}${m}`)}>
          {years.map((yr) => <option key={yr} value={String(yr)}>{yr}</option>)}
        </select>
      </span>
    );
  };

  return (
    <Modal open={open} onClose={onClose} title="Export Production Output ke Excel">
      <div style={{ padding: '8px' }}>
        <p style={{ marginBottom: '18px', color: '#6b7280', fontSize: '0.9rem' }}>
          Output per produk, berbasis <strong>bulan rilis QA</strong>. Pilih periode yang diinginkan.
        </p>

        <div style={{ marginBottom: '18px' }}>
          <span style={label}>Periode</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PERIOD_OPTIONS.map((p) => (
              <button key={p.key} onClick={() => setPreset(p.key)} style={chip(preset === p.key)} title={p.hint}>
                {p.label}
              </button>
            ))}
          </div>

          {preset === 'CUSTOM' && years.length > 0 && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
              {monthYearPicker(customFrom, setCustomFrom, 'from')}
              <span style={{ color: '#9ca3af' }}>s/d</span>
              {monthYearPicker(customTo, setCustomTo, 'to')}
            </div>
          )}

          <div style={{ marginTop: '10px', color: '#9ca3af', fontSize: '0.8rem' }}>
            {loadingRange ? 'Memuat rentang data…'
              : valid ? `${periodLabel(sel.from)} → ${periodLabel(sel.to)}`
              : 'Rentang belum valid — bulan awal harus sebelum bulan akhir.'}
          </div>
          {range.min && range.max && (
            <div style={{ marginTop: '4px', color: '#9ca3af', fontSize: '0.75rem' }}>
              Data tersedia {periodLabel(range.min)} – {periodLabel(range.max)}.
            </div>
          )}
        </div>

        <div style={{
          backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px',
          padding: '12px 14px', marginBottom: '20px', fontSize: '0.82rem', color: '#115e59',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Isi file — 4 sheet</div>
          <div>Output Tahunan (satu baris per produk, kolom per tahun) · Output Bulanan
            (kolom Jan–Des) · Ringkasan (per LOB, bentuk sediaan, kemasan) · Catatan Sumber Data.
            Batch granulat dikecualikan.</div>
        </div>

        {error && (
          <div style={{ marginBottom: '16px', padding: '10px 12px', backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca', borderRadius: '6px', color: '#b91c1c', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} disabled={busy}
            style={{ padding: '10px 24px', backgroundColor: '#f3f4f6', color: '#374151',
                     border: '1px solid #e5e7eb', borderRadius: '6px',
                     cursor: busy ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            Batal
          </button>
          <button onClick={handleExport} disabled={busy || !valid || loadingRange}
            style={{ padding: '10px 24px',
                     backgroundColor: busy || !valid || loadingRange ? '#99f6e4' : '#0f766e',
                     color: '#fff', border: 'none', borderRadius: '6px',
                     cursor: busy || !valid || loadingRange ? 'default' : 'pointer',
                     fontSize: '0.9rem', fontWeight: 600 }}>
            {busy ? 'Menyiapkan…' : 'Export ke Excel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
