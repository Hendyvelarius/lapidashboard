import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { apiUrl } from '../api';
import './BatchRouteModal.css';

// A batch's full alur proses (t_alur_proses, every planned step) with where the
// batch is right now.
//
//   green  - done:        the step has an EndDate
//   yellow - in progress: StartDate but no EndDate
//   red    - not started: neither
//
// Where it "is": every step in progress. If nothing is in progress, the next
// step is the earliest one (by Urutan) that hasn't started. The list opens
// scrolled to that point.

// SQL datetimes are local times that arrive with a 'Z'; read them as local.
const parseSqlDate = (value) => {
  if (!value) return null;
  const d = new Date(String(value).replace('Z', ''));
  return isNaN(d.getTime()) ? null : d;
};

const fmtDateTime = (d) => (d
  ? d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '-');

// Minutes -> "45m", "3j 20m", "2h 4j" (hari / jam / menit).
const fmtDuration = (from, to) => {
  if (!from || !to) return null;
  const mins = Math.max(0, Math.round((to - from) / 60000));
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}j ${mins % 60}m`;
  return `${Math.floor(hours / 24)}h ${hours % 24}j`;
};

// Department and group, without repeating a group that is just the department again (QA, QC).
const stepWhere = (s) => [s.dept, s.tahapan_group && s.tahapan_group !== s.dept ? s.tahapan_group : null].filter(Boolean);

const STATUS_LABEL = { done: 'Selesai', running: 'Sedang berjalan', waiting: 'Belum mulai' };

const BatchRouteModal = ({ productId, batchNo, productName, onClose, historical = false }) => {
  const [steps, setSteps] = useState(null);
  const [error, setError] = useState(null);
  const [hideDone, setHideDone] = useState(false);
  const listRef = useRef(null);
  const focusRef = useRef(null);

  // A few released batches come back as '84066.'; planned batches that are not
  // registered yet look like 'B2--186' and have no route at all.
  const cleanBatchNo = String(batchNo ?? '').trim().replace(/\.+$/, '');
  const isPlanned = cleanBatchNo.includes('--');

  useEffect(() => {
    if (isPlanned) return undefined;
    let cancelled = false;
    const q = new URLSearchParams({ productId: String(productId ?? '').trim(), batchNo: cleanBatchNo });
    fetch(apiUrl(`/api/batchRoute?${q}`))
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(json => { if (!cancelled) setSteps(json.data || []); })
      .catch(err => { if (!cancelled) setError(err.message || 'Gagal memuat alur proses'); });
    return () => { cancelled = true; };
  }, [productId, cleanBatchNo, isPlanned]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const now = new Date();
  // Route order is Urutan (not No_urut). The server already sorts on it; sorting
  // again here keeps the list right whatever order the rows arrive in.
  const rows = [...(steps || [])]
    .sort((a, b) => (a.Urutan ?? 0) - (b.Urutan ?? 0) || (a.PK_ID ?? 0) - (b.PK_ID ?? 0))
    .map(s => {
      const start = parseSqlDate(s.StartDate);
      const end = parseSqlDate(s.EndDate);
      const status = end ? 'done' : (start ? 'running' : 'waiting');
      return { ...s, start, end, status };
    });

  const running = rows.filter(r => r.status === 'running');
  const nextStep = running.length === 0 ? rows.find(r => r.status === 'waiting') : null;
  const focusKeys = new Set((running.length ? running : nextStep ? [nextStep] : []).map(r => r.PK_ID));
  const doneCount = rows.filter(r => r.status === 'done').length;
  const waitingCount = rows.filter(r => r.status === 'waiting').length;
  // The step that finished last: what the batch has been waiting on since.
  const lastDone = rows.reduce((latest, r) => (r.end && (!latest || r.end > latest.end) ? r : latest), null);

  const visible = hideDone ? rows.filter(r => r.status !== 'done') : rows;
  const firstFocusKey = visible.find(r => focusKeys.has(r.PK_ID))?.PK_ID;

  // Snap the list to where the batch is.
  useLayoutEffect(() => {
    const list = listRef.current;
    const el = focusRef.current;
    if (!list || !el) return;
    list.scrollTop = Math.max(0, el.offsetTop - list.clientHeight / 3);
  }, [steps, hideDone]);

  const name = productName || rows[0]?.Product_Name || productId;
  const batchDate = rows[0]?.Batch_Date;

  let focusCard = null;
  if (rows.length > 0) {
    if (running.length > 0) {
      focusCard = (
        <div className="brm-focus running">
          <div className="brm-focus-title">
            <span className="brm-dot running" /> Sedang berjalan
            {running.length > 1 && <span className="brm-focus-count">{running.length} langkah</span>}
          </div>
          {running.map(r => (
            <div key={r.PK_ID} className="brm-focus-step">
              <span className="brm-focus-name">{r.nama_tahapan}</span>
              <span className="brm-focus-meta">
                {stepWhere(r).join(' · ')}
                {' · '}mulai {fmtDateTime(r.start)} · berjalan {fmtDuration(r.start, now)}
              </span>
            </div>
          ))}
        </div>
      );
    } else if (nextStep) {
      focusCard = (
        <div className="brm-focus next">
          <div className="brm-focus-title">
            <span className="brm-dot waiting" /> Langkah berikutnya
          </div>
          <div className="brm-focus-step">
            <span className="brm-focus-name">{nextStep.nama_tahapan}</span>
            <span className="brm-focus-meta">
              {stepWhere(nextStep).join(' · ') || 'Belum mulai'}
              {lastDone && ` · menunggu sejak ${lastDone.nama_tahapan} selesai ${fmtDateTime(lastDone.end)} (${fmtDuration(lastDone.end, now)} lalu)`}
            </span>
          </div>
        </div>
      );
    } else {
      focusCard = (
        <div className="brm-focus complete">
          <div className="brm-focus-title">
            <span className="brm-dot done" /> Semua langkah selesai
          </div>
          {lastDone && (
            <div className="brm-focus-step">
              <span className="brm-focus-meta">
                Langkah terakhir: {lastDone.nama_tahapan} · {fmtDateTime(lastDone.end)}
              </span>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    // Clicks stop here: this modal usually sits inside another modal's overlay,
    // which would otherwise close too.
    <div className="brm-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="brm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label={`Alur proses ${batchNo}`}>
        <div className="brm-header">
          <div className="brm-heading">
            <h2>Alur Proses <span className="brm-batch">{batchNo}</span></h2>
            <div className="brm-sub">
              {name}{productId ? ` · ${productId}` : ''}{batchDate ? ` · tgl batch ${batchDate}` : ''}
            </div>
          </div>
          <button className="brm-close" onClick={onClose} aria-label="Tutup">&times;</button>
        </div>

        {isPlanned ? (
          <div className="brm-empty">
            Batch ini masih rencana dan belum terdaftar, jadi belum punya alur proses.
          </div>
        ) : error ? (
          <div className="brm-empty brm-error">Gagal memuat alur proses: {error}</div>
        ) : steps === null ? (
          <div className="brm-empty">Memuat alur proses...</div>
        ) : rows.length === 0 ? (
          <div className="brm-empty">Tidak ada alur proses untuk batch ini.</div>
        ) : (
          <>
            <div className="brm-top">
              {focusCard}

              <div className="brm-progress">
                <div className="brm-progress-bar" title={`${doneCount} selesai · ${running.length} berjalan · ${waitingCount} belum mulai`}>
                  <span className="done" style={{ width: `${(doneCount / rows.length) * 100}%` }} />
                  <span className="running" style={{ width: `${(running.length / rows.length) * 100}%` }} />
                </div>
                <div className="brm-legend">
                  <span><span className="brm-dot done" /> Selesai {doneCount}</span>
                  <span><span className="brm-dot running" /> Sedang berjalan {running.length}</span>
                  <span><span className="brm-dot waiting" /> Belum mulai {waitingCount}</span>
                  <label className="brm-toggle">
                    <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
                    Sembunyikan yang selesai
                  </label>
                </div>
              </div>
            </div>

            <ol className="brm-list" ref={listRef}>
              {visible.map(r => {
                const isFocus = focusKeys.has(r.PK_ID);
                const duration = r.status === 'done'
                  ? fmtDuration(r.start, r.end)
                  : r.status === 'running' ? fmtDuration(r.start, now) : null;
                return (
                  <li
                    key={r.PK_ID}
                    ref={r.PK_ID === firstFocusKey ? focusRef : null}
                    className={`brm-step ${r.status} ${isFocus ? 'focus' : ''}`}
                  >
                    <span className="brm-step-no" title="Urutan">{r.Urutan}</span>
                    <span className="brm-step-rail"><span className={`brm-dot ${r.status}`} /></span>
                    <div className="brm-step-main">
                      <div className="brm-step-name">
                        {r.nama_tahapan}
                        {isFocus && (
                          <span className={`brm-here ${r.status}`}>
                            {r.status === 'running' ? 'Di sini' : 'Berikutnya'}
                          </span>
                        )}
                      </div>
                      <div className="brm-step-tags">
                        {r.dept && <span className="brm-tag">{r.dept}</span>}
                        {r.tahapan_group && r.tahapan_group !== r.dept && <span className="brm-tag group">{r.tahapan_group}</span>}
                        <span className={`brm-status ${r.status}`}>{STATUS_LABEL[r.status]}</span>
                      </div>
                    </div>
                    <div className="brm-step-time">
                      {r.status === 'waiting' ? (
                        <span className="brm-muted">-</span>
                      ) : (
                        <>
                          <span>{fmtDateTime(r.start)} → {r.end ? fmtDateTime(r.end) : '…'}</span>
                          {duration && <span className="brm-muted">{duration}</span>}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className="brm-footer">
              {historical
                ? 'Status terkini (live), bukan status pada tanggal snapshot yang sedang dilihat.'
                : 'Status terkini (live) dari alur proses.'}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BatchRouteModal;
