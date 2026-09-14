import React, { useState, useMemo } from 'react';
import Modal from './Modal';
import { apiUrl, fetchWithTimeout } from '../api';
import { buildWorkbook, fmtID } from '../utils/batchesReportWorkbook';
import { writeWithFrozenPanes } from '../utils/productionOutputWorkbook';

// ---------------------------------------------------------------------------
// Batches Report (Laporan Turun PPI) export
//
// One row per batch whose PPI came down inside the chosen window, with the
// three PPI sections side by side. The window is on the PPI issue date, so
// "September" means "batches whose PPI was issued in September" -- not when
// they run, and not the batch date.
// ---------------------------------------------------------------------------

const PERIOD_OPTIONS = [
  { key: 'MTD', label: 'MTD', hint: 'Sejak tanggal 1 bulan ini' },
  { key: 'YTD', label: 'YTD', hint: 'Sejak 1 Januari' },
  { key: 'CUSTOM', label: 'Pilih tanggal', hint: 'Rentang tanggal sendiri' },
];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function resolveRange(period, customFrom, customTo) {
  const now = new Date();
  if (period === 'MTD') return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: toISO(now) };
  if (period === 'YTD') return { from: `${now.getFullYear()}-01-01`, to: toISO(now) };
  return { from: customFrom, to: customTo };
}

export default function BatchesReportModal({ open, onClose }) {
  const today = toISO(new Date());
  const [period, setPeriod] = useState('MTD');
  const [customFrom, setCustomFrom] = useState(today.slice(0, 8) + '01');
  const [customTo, setCustomTo] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const range = useMemo(
    () => resolveRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );
  const valid = Boolean(range.from && range.to && range.from <= range.to);

  async function handleExport() {
    setBusy(true);
    setError('');
    try {
      const res = await fetchWithTimeout(
        apiUrl(`/api/batchesReport?from=${range.from}&to=${range.to}`), {}, 180000);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Permintaan gagal (status ${res.status})`);
      }
      const rows = (await res.json()).data || [];
      if (!rows.length) {
        setError('Tidak ada PPI yang turun pada rentang tersebut.');
        return;
      }

      // Loaded on demand so the styled writer stays out of the main bundle.
      const [XLSXmod, JSZipMod] = await Promise.all([
        import('xlsx-js-style'),
        import('jszip'),
      ]);
      const wb = buildWorkbook(XLSXmod, rows, { ...range, generatedOn: today });
      // Header block plus the batch identity columns stay put while the three
      // section blocks scroll.
      const blob = await writeWithFrozenPanes(XLSXmod, JSZipMod, wb, [
        { sheet: 1, ySplit: 7, xSplit: 3 },
      ]);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Laporan Turun PPI ${range.from} sd ${range.to}.xlsx`;
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
  const dateInput = { padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' };

  return (
    <Modal open={open} onClose={onClose} title="Export Batches Report ke Excel">
      <div style={{ padding: '8px' }}>
        <p style={{ marginBottom: '18px', color: '#6b7280', fontSize: '0.9rem' }}>
          Satu baris per batch, berdasarkan <strong>tanggal turun PPI</strong>. Pilih periode yang diinginkan.
        </p>

        <div style={{ marginBottom: '18px' }}>
          <span style={label}>Periode</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PERIOD_OPTIONS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={chip(period === p.key)} title={p.hint}>
                {p.label}
              </button>
            ))}
          </div>

          {period === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
              <input type="date" value={customFrom} max={customTo} style={dateInput}
                onChange={(e) => setCustomFrom(e.target.value)} />
              <span style={{ color: '#9ca3af' }}>s/d</span>
              <input type="date" value={customTo} min={customFrom} style={dateInput}
                onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}

          <div style={{ marginTop: '10px', color: '#9ca3af', fontSize: '0.8rem' }}>
            {valid ? `${fmtID(range.from)} → ${fmtID(range.to)}`
              : 'Rentang belum valid — tanggal awal harus sebelum tanggal akhir.'}
          </div>
        </div>

        <div style={{
          backgroundColor: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: '8px',
          padding: '12px 14px', marginBottom: '20px', fontSize: '0.82rem', color: '#115e59',
        }}>
          <div style={{ fontWeight: 700, marginBottom: '6px' }}>Isi file</div>
          <div>Formula, ketersediaan material, tanggal turun PPI dan tanggal potong stock untuk
            tiap bagian — Pengolahan (BB), Kemas Primer (BKP), Kemas Sekunder (BKS) — beserta
            mfg date, expired date, HET, batch size dan UOM. Ketersediaan dihitung terhadap saldo
            gudang periode berjalan menurut urutan turun PPI, dan kolomnya berisi kode item yang
            kurang bila stock tidak mencukupi.</div>
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
          <button onClick={handleExport} disabled={busy || !valid}
            style={{ padding: '10px 24px',
                     backgroundColor: busy || !valid ? '#99f6e4' : '#0f766e',
                     color: '#fff', border: 'none', borderRadius: '6px',
                     cursor: busy || !valid ? 'default' : 'pointer',
                     fontSize: '0.9rem', fontWeight: 600 }}>
            {busy ? 'Menyiapkan…' : 'Export ke Excel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
