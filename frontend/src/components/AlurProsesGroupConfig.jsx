import React, { useEffect, useMemo, useState } from 'react';
import { Workflow, Search, Save, RotateCcw, Info, CheckCircle2, AlertTriangle, ArrowRight, X } from 'lucide-react';
import Sidebar from './Sidebar';
import DashboardLoading from './DashboardLoading';
import { apiUrl } from '../api';
import { TAHAPAN_GROUP_TO_DISPLAY, GROUP_ORDER } from '../utils/stageBoundaries';
import './AlurProsesGroupConfig.css';

// Colour per display stage (the 7 stages the dashboards actually show).
const STAGE_COLORS = {
  'Timbang': '#0ea5e9',
  'Proses': '#6366f1',
  'Kemas Primer': '#f59e0b',
  'Kemas Sekunder': '#f97316',
  'QC': '#10b981',
  'Mikro': '#14b8a6',
  'QA': '#8b5cf6',
};

const UNASSIGNED = 'Tanpa kategori';
const OTHER_STAGE = 'Lainnya (tidak tampil di dashboard)';

// Which display stage a category rolls up into (null = not shown on dashboards).
const stageOf = (group) => (group ? TAHAPAN_GROUP_TO_DISPLAY[group] || null : null);

const AlurProsesGroupConfig = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [rows, setRows] = useState([]);            // { kode_tahapan, nama_tahapan, tahapan_group (original) }
  const [edits, setEdits] = useState({});          // kode_tahapan -> new group
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [toast, setToast] = useState(null);        // { type, msg }

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catRes, asgRes] = await Promise.all([
        fetch(apiUrl('/api/tahapanGroupCategories')),
        fetch(apiUrl('/api/tahapanGroupAssignments')),
      ]);
      if (!catRes.ok || !asgRes.ok) throw new Error('Gagal memuat data konfigurasi.');
      const catJson = await catRes.json();
      const asgJson = await asgRes.json();
      setCategories((catJson.data || []).slice().sort());
      setRows((asgJson.data || []).map(r => ({
        kode_tahapan: r.kode_tahapan,
        nama_tahapan: r.nama_tahapan || `(tanpa nama · ${r.kode_tahapan})`,
        dept: r.dept || null,
        tahapan_group: r.tahapan_group || null,
      })));
      setEdits({});
    } catch (e) {
      setError(e.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const currentGroupOf = (row) => (row.kode_tahapan in edits ? edits[row.kode_tahapan] : row.tahapan_group);

  const handleChange = (row, value) => {
    setEdits(prev => {
      const next = { ...prev };
      if (value === (row.tahapan_group || '')) {
        delete next[row.kode_tahapan]; // reverted to original -> not a change
      } else {
        next[row.kode_tahapan] = value;
      }
      return next;
    });
  };

  // Rows that genuinely changed. handleChange only keeps entries that differ from the
  // original, so every key left in `edits` is a real change — including an empty value,
  // which means "unassign" (remove the category).
  const changedRows = useMemo(() => {
    return rows
      .filter(r => r.kode_tahapan in edits)
      .map(r => ({ ...r, newGroup: edits[r.kode_tahapan] }));
  }, [rows, edits]);

  // Inverted rollup for the info panel: display stage -> [categories].
  const rollup = useMemo(() => {
    const map = {};
    GROUP_ORDER.forEach(s => { map[s] = []; });
    Object.entries(TAHAPAN_GROUP_TO_DISPLAY).forEach(([cat, stage]) => {
      if (!map[stage]) map[stage] = [];
      if (categories.length === 0 || categories.includes(cat)) map[stage].push(cat);
    });
    return map;
  }, [categories]);

  // Filter + group by current display stage for readability.
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = rows.filter(r => {
      const g = currentGroupOf(r);
      if (unassignedOnly && g) return false;
      if (categoryFilter !== 'all' && g !== categoryFilter) return false;
      if (q && !(`${r.nama_tahapan} ${r.kode_tahapan} ${r.dept || ''}`.toLowerCase().includes(q))) return false;
      return true;
    });

    const buckets = new Map();
    for (const r of filtered) {
      const g = currentGroupOf(r);
      const stage = g ? (stageOf(g) || OTHER_STAGE) : UNASSIGNED;
      if (!buckets.has(stage)) buckets.set(stage, []);
      buckets.get(stage).push(r);
    }
    // Ordering: unassigned first, then the 7 display stages, then "other".
    const order = [UNASSIGNED, ...GROUP_ORDER, OTHER_STAGE];
    const result = [];
    for (const stage of order) {
      if (!buckets.has(stage)) continue;
      const list = buckets.get(stage).sort((a, b) => {
        const ca = currentGroupOf(a) || '', cb = currentGroupOf(b) || '';
        return ca.localeCompare(cb) || a.nama_tahapan.localeCompare(b.nama_tahapan);
      });
      result.push({ stage, rows: list });
      buckets.delete(stage);
    }
    // Any leftover (shouldn't happen) appended.
    for (const [stage, list] of buckets) result.push({ stage, rows: list });
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, edits, search, categoryFilter, unassignedOnly]);

  const totalShown = grouped.reduce((n, g) => n + g.rows.length, 0);

  const doSave = async () => {
    setSaving(true);
    try {
      // Empty newGroup -> null tells the backend to unassign (remove the category).
      const assignments = changedRows.map(r => ({ kode_tahapan: r.kode_tahapan, tahapan_group: r.newGroup || null }));
      const res = await fetch(apiUrl('/api/tahapanGroups/bulk'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignments }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Gagal menyimpan.');
      setShowConfirm(false);
      setToast({ type: 'success', msg: `Berhasil menyimpan ${assignments.length} perubahan.` });
      await loadData();
    } catch (e) {
      setShowConfirm(false);
      setToast({ type: 'error', msg: e.message || 'Gagal menyimpan perubahan.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <Sidebar />
        <main className="content-area">
          <DashboardLoading loading text="Memuat konfigurasi alur proses..." coverContentArea={true} />
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <main className="content-area">
        <div className="apg-page">
          {/* Header */}
          <div className="apg-header">
            <div className="apg-breadcrumb">Pengaturan › Konfigurasi Alur Proses Group</div>
            <h1 className="apg-title"><Workflow size={26} /> Konfigurasi Alur Proses Group</h1>
            <p className="apg-subtitle">
              Tentukan setiap tahapan proses masuk ke <strong>kategori</strong> yang mana. Kategori inilah
              yang menentukan di <strong>tahap</strong> mana sebuah batch dihitung pada dashboard Production, PN1, PN2, dan Quality.
            </p>
          </div>

          {/* Critical info: how categories roll up into the 7 dashboard stages */}
          <div className="apg-info">
            <div className="apg-info-title"><Info size={16} /> Penting — bagaimana kategori dikelompokkan</div>
            <p className="apg-info-text">
              Dashboard hanya menampilkan <strong>7 tahap utama</strong>. Beberapa kategori digabung ke dalam satu tahap —
              misalnya <strong>Granulasi, Mixing, Filling, Cetak, Coating,</strong> dan <strong>Terima Bahan</strong> semuanya
              termasuk dalam tahap <strong>Proses</strong>. Jadi bila Anda memindahkan sebuah tahapan ke kategori <em>Granulasi</em>,
              tahapan itu akan tampil di bawah <em>Proses</em>. Peta lengkapnya:
            </p>
            <p className="apg-info-text" style={{ marginBottom: 0 }}>
              <strong>Tidak semua tahapan harus punya kategori.</strong> Sebagian tahapan memang sengaja
              dibiarkan <em>tanpa kategori</em> — misalnya proses yang ditangani tim eksternal (seperti sebagian
              tahapan pengiriman) sehingga bukan tanggung jawab tim manapun. Tahapan tanpa kategori tidak
              dihitung pada tahap manapun di dashboard, dan itu wajar. Anda bebas memberi maupun menghapus
              kategori kapan saja.
            </p>
            <p></p>
            <div className="apg-rollup">
              {[...GROUP_ORDER, OTHER_STAGE].map(stage => {
                const cats = stage === OTHER_STAGE ? [] : (rollup[stage] || []);
                if (stage === OTHER_STAGE) return null;
                return (
                  <div className="apg-rollup-stage" key={stage} style={{ '--stage-color': STAGE_COLORS[stage] || '#94a3b8' }}>
                    <div className="apg-rollup-stage-name">{stage}</div>
                    <div className="apg-rollup-cats">
                      {cats.length ? cats.map(c => <span className="apg-cat-chip" key={c}>{c}</span>)
                        : <span className="apg-cat-chip">—</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="apg-info" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
              <div className="apg-info-title" style={{ color: '#b91c1c' }}><AlertTriangle size={16} /> {error}</div>
              <button className="apg-btn ghost" onClick={loadData}>Coba lagi</button>
            </div>
          )}

          {/* Toolbar */}
          <div className="apg-toolbar">
            <div className="apg-search">
              <Search size={15} />
              <input
                type="text"
                placeholder="Cari nama tahapan, kode, atau departemen..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="apg-filter-select" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="all">Semua kategori</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <label className="apg-check">
              <input type="checkbox" checked={unassignedOnly} onChange={(e) => setUnassignedOnly(e.target.checked)} />
              Hanya tanpa kategori
            </label>

            <span className="apg-spacer" />

            {changedRows.length > 0 && (
              <>
                <span className="apg-changes-pill">{changedRows.length} perubahan belum disimpan</span>
                <button className="apg-btn ghost" onClick={() => setEdits({})} disabled={saving}>
                  <RotateCcw size={15} /> Reset
                </button>
              </>
            )}
            <button className="apg-btn primary" onClick={() => setShowConfirm(true)} disabled={changedRows.length === 0 || saving}>
              <Save size={15} /> Simpan Perubahan
            </button>
          </div>

          {/* Table */}
          <div className="apg-table-wrap">
            <table className="apg-table">
              <thead>
                <tr>
                  <th style={{ width: '46%' }}>Tahapan Proses</th>
                  <th style={{ width: '28%' }}>Kategori</th>
                  <th style={{ width: '26%' }}>Tampil di Tahap</th>
                </tr>
              </thead>
              <tbody>
                {totalShown === 0 && (
                  <tr><td colSpan={3} className="apg-empty">Tidak ada tahapan yang cocok dengan filter.</td></tr>
                )}
                {grouped.map(group => (
                  <React.Fragment key={group.stage}>
                    <tr className="apg-section-row">
                      <td colSpan={3}>
                        {group.stage}
                        <span className="apg-count-muted">{group.rows.length} tahapan</span>
                      </td>
                    </tr>
                    {group.rows.map(row => {
                      const g = currentGroupOf(row);
                      const changed = row.kode_tahapan in edits && edits[row.kode_tahapan] !== (row.tahapan_group || '');
                      const stage = stageOf(g);
                      return (
                        <tr key={row.kode_tahapan} className={changed ? 'apg-row-changed' : ''}>
                          <td>
                            <div className="apg-step-name">
                              {row.nama_tahapan}
                              {row.dept && <span className="apg-dept-chip" title="Departemen penanggung jawab">{row.dept}</span>}
                              {!g && <span className="apg-unassigned-tag">Tanpa kategori</span>}
                            </div>
                            <div className="apg-step-kode">kode: {row.kode_tahapan}</div>
                          </td>
                          <td>
                            <select
                              className={`apg-cat-select${!g ? ' is-empty' : ''}`}
                              value={g || ''}
                              onChange={(e) => handleChange(row, e.target.value)}
                            >
                              <option value="">— Tanpa kategori —</option>
                              {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </td>
                          <td>
                            {stage ? (
                              <span className="apg-stage-badge" style={{ '--stage-color': STAGE_COLORS[stage] || '#94a3b8' }}>{stage}</span>
                            ) : (
                              <span className="apg-stage-badge none">{g ? 'Tidak tampil' : '—'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal-content apg-confirm">
            <div className="modal-header">
              <span className="modal-title">Simpan {changedRows.length} perubahan?</span>
              <button className="modal-close" onClick={() => setShowConfirm(false)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <div className="settings-note warn" style={{ marginBottom: 12 }}>
                <AlertTriangle size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} />
                Perubahan ini memengaruhi perhitungan tahap di <strong>semua dashboard</strong> (Production, PN1, PN2, Quality).
                Efeknya muncul setelah data WIP di-refresh.
              </div>
              <div className="apg-confirm-list">
                {changedRows.map(r => (
                  <div className="apg-confirm-list-item" key={r.kode_tahapan}>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nama_tahapan}</span>
                    <span className="apg-mini-badge">{r.tahapan_group || 'Tanpa kategori'}</span>
                    <ArrowRight size={14} className="apg-confirm-arrow" />
                    <span
                      className="apg-mini-badge"
                      style={r.newGroup ? { background: '#dcfce7', color: '#166534' } : { background: '#f1f5f9', color: '#475569' }}
                    >
                      {r.newGroup || 'Tanpa kategori'}
                    </span>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                <button className="apg-btn ghost" onClick={() => setShowConfirm(false)} disabled={saving}>Batal</button>
                <button className="apg-btn primary" onClick={doSave} disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Ya, Simpan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`apg-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={17} /> : <X size={17} />}
          {toast.msg}
        </div>
      )}
    </div>
  );
};

export default AlurProsesGroupConfig;
