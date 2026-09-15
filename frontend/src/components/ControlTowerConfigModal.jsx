import React, { useState, useEffect, useMemo } from 'react';
import { X, Settings, Search, Paperclip } from 'lucide-react';
import { apiUrl, fetchWithTimeout } from '../api';
import { SCOPED_DEPTS, CONFIG_ADMIN_DEPTS, RED_MAX_MINUTES, fmtDateTime, fmtDuration, fmtInt } from '../config/controlTower';

// ---------------------------------------------------------------------------
// Configuration modal -- two tabs.
//
//   Threshold   The yellow rule, expressed as "how many times faster / slower
//               than the standard" (fast_factor / slow_factor). One default
//               row ('*') plus optional overrides per department. Editable by
//               NT / PL / MS; everyone else sees it read-only so the rule set
//               is never a mystery. Red (< RED_MAX_MINUTES) is fixed in the
//               backend and only displayed.
//   Clerical    Processes a department does not want monitored (admin taps
//               such as "Approve Timbang"). Only a department's manager
//               (emp_JobLevelID MGR, or PL for the Plant heads) edits its list; managers of NT / PL / MS
//               may edit any; HWA bypasses the gate. PN1 and PN2 pick from
//               the same m_tahapan rows (dept 'PN') but keep separate lists.
//
// `access` comes from resolveConfigAccess(user): { thresholds, clericalDepts }.
// ---------------------------------------------------------------------------

async function getJSON(path) {
  const res = await fetchWithTimeout(apiUrl(path));
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}
async function putJSON(path, body) {
  const res = await fetchWithTimeout(apiUrl(path), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, 60000);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

const EXAMPLE_STD_MIN = 60;

// ---------------------------------------------------------------------------
// Threshold tab
// ---------------------------------------------------------------------------
function ThresholdTab({ user, canEdit, onClose, onSaved }) {
  const [rows, setRows] = useState([]);       // [{ dept, fast_factor, slow_factor }] as strings while editing
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    getJSON('/api/controlTower/thresholds')
      .then((json) => {
        if (cancelled) return;
        setRows(json.data.rows.map((r) => ({ dept: r.dept, fast_factor: String(r.fast_factor), slow_factor: String(r.slow_factor) })));
        const last = json.data.rows.find((r) => r.updated_by);
        setMeta(last ? { by: last.updated_by_name || last.updated_by, at: last.updated_at } : null);
      })
      .catch((e) => { if (!cancelled) setError(e.message); });
    return () => { cancelled = true; };
  }, []);

  const def = rows.find((r) => r.dept === '*') || { dept: '*', fast_factor: '2', slow_factor: '2' };
  const overridden = new Set(rows.filter((r) => r.dept !== '*').map((r) => r.dept));

  const setVal = (dept, key, val) => setRows((prev) => prev.map((r) => (r.dept === dept ? { ...r, [key]: val } : r)));
  const addOverride = (dept) => setRows((prev) => [...prev, { dept, fast_factor: def.fast_factor, slow_factor: def.slow_factor }]);
  const removeOverride = (dept) => setRows((prev) => prev.filter((r) => r.dept !== dept));

  async function save() {
    setBusy(true); setError('');
    try {
      const payload = rows.map((r) => ({ dept: r.dept, fast_factor: Number(r.fast_factor), slow_factor: Number(r.slow_factor) }));
      await putJSON('/api/controlTower/thresholds', { rows: payload, user });
      onSaved?.();
      onClose();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  // "Standar 60 menit -> yellow bila <= 30 menit atau >= 120 menit"
  const example = (r) => {
    const f = Number(r.fast_factor), s = Number(r.slow_factor);
    if (!(f > 1) || !(s > 1)) return <span className="ct-muted">faktor harus lebih dari 1</span>;
    return (
      <span className="ct-muted">
        standar {EXAMPLE_STD_MIN} mnt → yellow bila ≤ <strong>{fmtDuration(EXAMPLE_STD_MIN / f)}</strong> atau ≥ <strong>{fmtDuration(EXAMPLE_STD_MIN * s)}</strong>
      </span>
    );
  };

  // A plain render function (not a nested component) so inputs keep focus while typing.
  const renderRow = (r, isDefault) => (
    <tr key={r.dept}>
      <td><strong>{isDefault ? 'Default (semua dept)' : r.dept}</strong></td>
      <td className="ct-factor-cell">
        <input type="number" step="0.5" min="1.1" max="100" className="ct-input" value={r.fast_factor} disabled={!canEdit}
          onChange={(e) => setVal(r.dept, 'fast_factor', e.target.value)} />
        <span>× lebih cepat</span>
      </td>
      <td className="ct-factor-cell">
        <input type="number" step="0.5" min="1.1" max="100" className="ct-input" value={r.slow_factor} disabled={!canEdit}
          onChange={(e) => setVal(r.dept, 'slow_factor', e.target.value)} />
        <span>× lebih lama</span>
      </td>
      <td className="ct-factor-example">{example(r)}</td>
      <td>{isDefault ? <span className="ct-muted">wajib</span> : canEdit && <button className="ct-btn ghost tiny" onClick={() => removeOverride(r.dept)}>Hapus</button>}</td>
    </tr>
  );

  return (
    <>
      <div className="ct-modal-body">
        <div className="ct-rule-box">
          <div><strong>Red — Instant tap.</strong> Durasi kerja &lt; {RED_MAX_MINUTES} menit, apa pun standarnya. Aturan ini tetap dan tidak bisa diubah.</div>
          <div>
            <strong>Yellow — Deviasi.</strong> Isi <em>berapa kali</em> lebih cepat atau lebih lama dari standar sebuah proses baru dianggap menyimpang.
            Contoh: <strong>2</strong>× lebih lama = durasi ≥ 2 × standar; <strong>2</strong>× lebih cepat = durasi ≤ ½ standar.
          </div>
          <div><strong>Green — Normal.</strong> Sisanya. Proses tanpa standar masuk To-Do; proses clerical tidak di-score sama sekali.</div>
        </div>
        <table className="ct-table ct-settings-table">
          <thead><tr><th>Dept</th><th>Terlalu cepat</th><th>Terlalu lama</th><th>Contoh</th><th /></tr></thead>
          <tbody>
            {renderRow(def, true)}
            {rows.filter((r) => r.dept !== '*').map((r) => renderRow(r, false))}
          </tbody>
        </table>
        {canEdit && (
          <div className="ct-chips" style={{ marginTop: 10 }}>
            <span className="ct-muted">Override per dept:</span>
            {SCOPED_DEPTS.filter((d) => !overridden.has(d)).map((d) => (
              <button key={d} className="ct-chip" onClick={() => addOverride(d)}>+ {d}</button>
            ))}
          </div>
        )}
        {meta && <div className="ct-muted" style={{ marginTop: 10 }}>Terakhir diubah oleh {meta.by} · {fmtDateTime(meta.at)}</div>}
        {error && <div className="ct-error">⚠️ {error}</div>}
      </div>
      <div className="ct-modal-foot">
        <span className="ct-muted">
          {canEdit ? 'Perubahan langsung berlaku untuk semua perhitungan (live, chart, log, report).' : `Hanya ${CONFIG_ADMIN_DEPTS.join(' / ')} yang dapat mengubah threshold.`}
        </span>
        <div>
          <button className="ct-btn ghost" onClick={onClose} disabled={busy}>{canEdit ? 'Batal' : 'Tutup'}</button>
          {canEdit && <button className="ct-btn primary" onClick={save} disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</button>}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Clerical processes tab
// ---------------------------------------------------------------------------
function ClericalTab({ user, editableDepts, onClose, onSaved }) {
  // Read-only viewers (HQ / HD / DS) can browse every dept's list.
  const viewDepts = editableDepts.length ? editableDepts : SCOPED_DEPTS;
  const [dept, setDept] = useState(viewDepts[0]);
  const [processes, setProcesses] = useState([]);
  const [saved, setSaved] = useState(new Map());       // kode -> ct_clerical row as stored
  const [selected, setSelected] = useState(new Set()); // kode being edited
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canEdit = editableDepts.includes(dept);

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(''); setSearch('');
    Promise.all([getJSON(`/api/controlTower/processes?dept=${dept}`), getJSON(`/api/controlTower/clerical?depts=${dept}`)])
      .then(([p, c]) => {
        if (cancelled) return;
        setProcesses(p.data || []);
        const m = new Map((c.data || []).map((r) => [r.kode_tahapan, r]));
        setSaved(m); setSelected(new Set(m.keys()));
      })
      .catch((e) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dept]);

  const dirty = useMemo(() => selected.size !== saved.size || [...selected].some((k) => !saved.has(k)), [selected, saved]);
  const byCode = useMemo(() => new Map(processes.map((p) => [p.kode_tahapan, p])), [processes]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return processes;
    return processes.filter((p) => `${p.kode_tahapan} ${p.nama_tahapan} ${p.alias || ''}`.toLowerCase().includes(q));
  }, [processes, search]);

  const toggle = (code) => {
    if (!canEdit) return;
    setSelected((prev) => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  };

  async function save() {
    setBusy(true); setError('');
    try {
      const json = await putJSON('/api/controlTower/clerical', { dept, codes: [...selected], user });
      const m = new Map((json.data || []).map((r) => [r.kode_tahapan, r]));
      setSaved(m); setSelected(new Set(m.keys()));
      onSaved?.();
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const selectedList = [...selected].map((k) => byCode.get(k) || { kode_tahapan: k, nama_tahapan: saved.get(k)?.nama_tahapan || `kode ${k}` })
    .sort((a, b) => String(a.nama_tahapan).localeCompare(String(b.nama_tahapan)));
  const isPN = dept === 'PN1' || dept === 'PN2';

  return (
    <>
      <div className="ct-modal-body">
        <div className="ct-rule-box">
          <div>
            <strong>Clerical process</strong> = proses administratif (mis. <em>Approve Timbang</em>) yang wajar selesai seketika dan tidak perlu dimonitor.
            Proses yang ditandai <strong>tidak di-score</strong>: tidak masuk alert, chart, KPI, maupun To-Do, tetapi tetap tampil di live feed sebagai <em>Clerical</em>.
          </div>
          <div className="ct-muted">
            Hanya <strong>Manager</strong> departemen yang dapat mengubah daftar departemennya; Manager {CONFIG_ADMIN_DEPTS.join(' / ')} dapat mengubah semua.
            {isPN && ' PN1 dan PN2 memilih dari daftar proses yang sama (dept PN), tetapi penandaannya disimpan terpisah per line.'}
          </div>
        </div>

        <div className="ct-cler-toolbar">
          <div className="ct-toggle" role="group" aria-label="Department">
            {viewDepts.map((d) => (
              <button key={d} className={`ct-toggle-btn${dept === d ? ' active' : ''}`} onClick={() => setDept(d)} disabled={busy}>{d}</button>
            ))}
          </div>
          <div className="ct-search">
            <Search size={14} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari nama / kode proses…" />
            {search && <button className="ct-icon-btn" onClick={() => setSearch('')}><X size={12} /></button>}
          </div>
        </div>

        <div className="ct-field-label">Ditandai clerical untuk {dept} · {selected.size}</div>
        <div className="ct-chips ct-cler-selected">
          {selectedList.length === 0 && <span className="ct-muted">Belum ada. {canEdit ? 'Centang proses pada daftar di bawah.' : ''}</span>}
          {selectedList.map((p) => {
            const s = saved.get(p.kode_tahapan);
            return (
              <span key={p.kode_tahapan} className={`ct-chip active${s ? '' : ' pending'}`}
                title={s ? `ditandai oleh ${s.added_by_name || s.added_by || '?'} · ${fmtDateTime(s.added_at)}` : 'belum disimpan'}>
                <Paperclip size={11} /> {p.nama_tahapan}
                {canEdit && <button className="ct-chip-x" onClick={() => toggle(p.kode_tahapan)} title="Hapus dari daftar"><X size={11} /></button>}
              </span>
            );
          })}
        </div>

        <div className="ct-field-label">Daftar proses {isPN ? 'PN' : dept} · {fmtInt(visible.length)} dari {fmtInt(processes.length)}</div>
        <div className="ct-table-wrap ct-cler-table">
          <table className="ct-table">
            <thead>
              <tr><th className="ct-th-check" /><th>Proses</th><th>Alias</th><th className="num">Kode</th><th className="num">Std</th><th className="num" title="jumlah eksekusi 90 hari terakhir">90 hari</th></tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} className="ct-empty">Loading…</td></tr>}
              {!loading && visible.length === 0 && <tr><td colSpan={6} className="ct-empty">Tidak ada proses yang cocok.</td></tr>}
              {!loading && visible.map((p) => {
                const on = selected.has(p.kode_tahapan);
                return (
                  <tr key={p.kode_tahapan} className={on ? 'selected' : ''} onClick={() => toggle(p.kode_tahapan)} style={{ cursor: canEdit ? 'pointer' : 'default' }}>
                    <td className="ct-th-check"><input type="checkbox" checked={on} disabled={!canEdit} onChange={() => toggle(p.kode_tahapan)} onClick={(e) => e.stopPropagation()} /></td>
                    <td>{p.nama_tahapan}</td>
                    <td className="ct-muted">{p.alias || ''}</td>
                    <td className="num mono">{p.kode_tahapan}</td>
                    <td className="num mono">{p.lead_time ? fmtDuration(p.lead_time) : <span className="ct-muted">-</span>}</td>
                    <td className="num mono">{fmtInt(p.runs_90d)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {error && <div className="ct-error">⚠️ {error}</div>}
      </div>
      <div className="ct-modal-foot">
        <span className="ct-muted">
          {canEdit
            ? (dirty ? `Perubahan ${dept} belum disimpan.` : `Sebagai ${user.name || user.nik} (${user.dept})`)
            : `Hanya Manager ${dept} (atau ${CONFIG_ADMIN_DEPTS.join(' / ')}) yang dapat mengubah daftar ini.`}
        </span>
        <div>
          <button className="ct-btn ghost" onClick={onClose} disabled={busy}>{canEdit ? 'Batal' : 'Tutup'}</button>
          {canEdit && <button className="ct-btn primary" onClick={save} disabled={busy || !dirty || loading}>{busy ? 'Menyimpan…' : `Simpan ${dept}`}</button>}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------
const TABS = [
  { key: 'threshold', label: 'Threshold' },
  { key: 'clerical', label: 'Clerical Processes' },
];

export default function ControlTowerConfigModal({ open, onClose, user, access, onSaved }) {
  // Land on the tab the user can actually act on.
  const [tab, setTab] = useState(() => (access.thresholds || !access.clericalDepts.length ? 'threshold' : 'clerical'));
  useEffect(() => { if (open) setTab(access.thresholds || !access.clericalDepts.length ? 'threshold' : 'clerical'); }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  return (
    <div className="ct-modal-overlay" onClick={onClose}>
      <div className="ct-modal wide ct-config-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ct-modal-head">
          <div className="ct-modal-title"><Settings size={16} /> Configuration</div>
          <div className="ct-toggle" role="tablist">
            {TABS.map((t) => (
              <button key={t.key} role="tab" aria-selected={tab === t.key} className={`ct-toggle-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <button className="ct-icon-btn" onClick={onClose}><X size={16} /></button>
        </div>
        {tab === 'threshold'
          ? <ThresholdTab key="threshold" user={user} canEdit={access.thresholds} onClose={onClose} onSaved={onSaved} />
          : <ClericalTab key="clerical" user={user} editableDepts={access.clericalDepts} onClose={onClose} onSaved={onSaved} />}
      </div>
    </div>
  );
}
