import React, { useState, useEffect, useMemo } from 'react';
import Modal from './Modal';
import { apiUrl, fetchWithTimeout } from '../api';
import { buildWorkbook } from '../utils/productionMonitoringWorkbook';

// ---------------------------------------------------------------------------
// Production Monitoring export
//
// One row per batch that went into process inside the chosen window, with the
// milestone dates production managers currently track by hand. The window is on
// the production start date -- the first genuine processing step -- not on the
// batch date, so "August" means "batches that started running in August".
// ---------------------------------------------------------------------------

const LINE_OPTIONS = [
  { key: 'ALL', label: 'All lines' },
  { key: 'PN1', label: 'PN1' },
  { key: 'PN2', label: 'PN2' },
];

const PERIOD_OPTIONS = [
  { key: 'YTD', label: 'YTD', hint: 'Since 1 January' },
  { key: 'MTD', label: 'MTD', hint: 'Since the 1st' },
  { key: 'CUSTOM', label: 'Custom', hint: 'Pick a range' },
];

const pad = (n) => String(n).padStart(2, '0');
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function resolveRange(period, customFrom, customTo) {
  const now = new Date();
  if (period === 'YTD') return { from: `${now.getFullYear()}-01-01`, to: toISO(now) };
  if (period === 'MTD') return { from: `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`, to: toISO(now) };
  return { from: customFrom, to: customTo };
}

export default function ProductionMonitoringModal({ open, onClose }) {
  const today = toISO(new Date());
  const [period, setPeriod] = useState('MTD');
  const [customFrom, setCustomFrom] = useState(today.slice(0, 8) + '01');
  const [customTo, setCustomTo] = useState(today);
  const [line, setLine] = useState('ALL');
  const [groups, setGroups] = useState([]);          // selected ID_master values
  const [groupOptions, setGroupOptions] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTimeout(apiUrl('/api/productCategoryGroups'));
        if (!res.ok) throw new Error(`status ${res.status}`);
        const json = await res.json();
        if (!cancelled) setGroupOptions(json.data || []);
      } catch (err) {
        if (!cancelled) setError(`Could not load product categories: ${err.message}`);
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  const range = useMemo(
    () => resolveRange(period, customFrom, customTo),
    [period, customFrom, customTo]
  );
  const rangeValid = Boolean(range.from && range.to && range.from <= range.to);

  const toggleGroup = (id) =>
    setGroups((prev) => (prev.includes(id) ? prev.filter((g) => g !== id) : [...prev, id]));

  async function handleExport() {
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams({ from: range.from, to: range.to, dept: line });
      if (groups.length) params.set('groups', groups.join(','));

      const res = await fetchWithTimeout(apiUrl(`/api/productionMonitoring?${params}`), {}, 120000);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (status ${res.status})`);
      }
      const rows = (await res.json()).data || [];
      if (!rows.length) {
        setError('No batches started production in that range with those filters.');
        return;
      }

      // Styled writer, loaded on demand so it stays out of the main bundle.
      const XLSX = await import('xlsx-js-style');

      const selectedNames = groups
        .map((id) => (groupOptions.find((g) => g.ID_master === id) || {}).pengelompokan)
        .filter(Boolean);

      const wb = buildWorkbook(XLSX, rows, {
        from: range.from,
        to: range.to,
        line,
        categories: selectedNames,
        generatedOn: toISO(new Date()),
      });

      const scope = [line === 'ALL' ? null : line,
                     selectedNames.length === 1 ? selectedNames[0]
                       : selectedNames.length > 1 ? `${selectedNames.length} kategori` : null]
        .filter(Boolean).join(' ');
      const name = `Production Monitoring${scope ? ' ' + scope : ''} ${range.from} to ${range.to}.xlsx`;
      XLSX.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, '-'));
      onClose();
    } catch (err) {
      setError(err.message || 'Export failed');
    } finally {
      setBusy(false);
    }
  }

  const chip = (active) => ({
    padding: '8px 14px',
    borderRadius: '6px',
    border: `1px solid ${active ? '#7c3aed' : '#e5e7eb'}`,
    backgroundColor: active ? '#f5f3ff' : '#fff',
    color: active ? '#6d28d9' : '#374151',
    fontWeight: active ? 700 : 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  });
  const label = { fontWeight: 600, color: '#374151', fontSize: '0.85rem', marginBottom: '8px', display: 'block' };

  return (
    <Modal open={open} onClose={onClose} title="Export Production Monitoring to Excel">
      <div style={{ padding: '8px' }}>
        <p style={{ marginBottom: '18px', color: '#6b7280', fontSize: '0.9rem' }}>
          One row per batch, filtered by the date the batch <strong>started production</strong>.
        </p>

        {/* Period */}
        <div style={{ marginBottom: '18px' }}>
          <span style={label}>Period</span>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {PERIOD_OPTIONS.map((p) => (
              <button key={p.key} onClick={() => setPeriod(p.key)} style={chip(period === p.key)} title={p.hint}>
                {p.label}
              </button>
            ))}
          </div>
          {period === 'CUSTOM' && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '12px' }}>
              <input type="date" value={customFrom} max={customTo}
                onChange={(e) => setCustomFrom(e.target.value)}
                style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
              <span style={{ color: '#9ca3af' }}>to</span>
              <input type="date" value={customTo} min={customFrom}
                onChange={(e) => setCustomTo(e.target.value)}
                style={{ padding: '8px', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '0.85rem' }} />
            </div>
          )}
          {period !== 'CUSTOM' && (
            <div style={{ marginTop: '8px', color: '#9ca3af', fontSize: '0.8rem' }}>
              {range.from} &rarr; {range.to}
            </div>
          )}
        </div>

        {/* Line */}
        <div style={{ marginBottom: '18px' }}>
          <span style={label}>Production line</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {LINE_OPTIONS.map((l) => (
              <button key={l.key} onClick={() => setLine(l.key)} style={chip(line === l.key)}>{l.label}</button>
            ))}
          </div>
        </div>

        {/* Sediaan */}
        <div style={{ marginBottom: '20px' }}>
          <span style={label}>
            Jenis sediaan{' '}
            <span style={{ fontWeight: 400, color: '#9ca3af' }}>
              {groups.length ? `(${groups.length} selected)` : '(all)'}
            </span>
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', maxHeight: '150px', overflowY: 'auto' }}>
            {groupOptions.map((g) => (
              <button key={g.ID_master} onClick={() => toggleGroup(g.ID_master)}
                style={{ ...chip(groups.includes(g.ID_master)), padding: '6px 10px', fontSize: '0.78rem' }}>
                {g.pengelompokan}
              </button>
            ))}
          </div>
          {groups.length > 0 && (
            <button onClick={() => setGroups([])}
              style={{ marginTop: '8px', background: 'none', border: 'none', color: '#7c3aed',
                       cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}>
              Clear selection
            </button>
          )}
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
                     border: '1px solid #e5e7eb', borderRadius: '6px', cursor: busy ? 'default' : 'pointer',
                     fontSize: '0.9rem', fontWeight: 600 }}>
            Cancel
          </button>
          <button onClick={handleExport} disabled={busy || !rangeValid}
            style={{ padding: '10px 24px', backgroundColor: busy || !rangeValid ? '#c4b5fd' : '#7c3aed',
                     color: '#fff', border: 'none', borderRadius: '6px',
                     cursor: busy || !rangeValid ? 'default' : 'pointer', fontSize: '0.9rem', fontWeight: 600 }}>
            {busy ? 'Preparing…' : 'Export to Excel'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
