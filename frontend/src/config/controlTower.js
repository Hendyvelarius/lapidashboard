// ---------------------------------------------------------------------------
// Processing Control Tower -- shared vocabulary.
//
// Used by the page, its modals and the report workbook so that scope rules,
// severity labels and formatting stay identical everywhere.
// ---------------------------------------------------------------------------

/** Departments whose members see every process (with a dept selector). */
export const ALL_SEEING_DEPTS = ['NT', 'PL', 'HQ', 'HD', 'MS', 'DS'];

/** Departments that own process steps; also the selector options. */
export const SCOPED_DEPTS = ['PN1', 'PN2', 'PC', 'QC', 'QA', 'MC'];

/** User IDs that always get the all-seeing view (mirrors AccessSettings overrides). */
export const ALL_SEEING_USERS = ['HWA', 'JDV'];

/** Who may edit the yellow thresholds. */
export const THRESHOLD_EDITOR_DEPTS = ['NT'];

/**
 * Resolve what a user is allowed to monitor.
 * @returns {{ mode: 'all'|'dept', depts: string[] }}
 *   mode 'all'  -> may pick any dept (depts = [] means everything)
 *   mode 'dept' -> pinned to their own department
 */
export function resolveScope(user) {
  const dept = String(user?.emp_DeptID || '').toUpperCase();
  const nik = String(user?.log_NIK || '').toUpperCase();
  if (ALL_SEEING_DEPTS.includes(dept) || ALL_SEEING_USERS.includes(nik)) return { mode: 'all', depts: [] };
  if (SCOPED_DEPTS.includes(dept)) return { mode: 'dept', depts: [dept] };
  return { mode: 'dept', depts: [] }; // access is gated by PAGE_ACCESS; this is a safe fallback
}

export const RED_MAX_MINUTES = 2;

export const SEVERITY = {
  red: { key: 'red', label: 'Instant tap', short: 'Red', color: '#d03b3b', soft: '#fbe7e7', icon: '⛔' },
  yellow: { key: 'yellow', label: 'Deviasi', short: 'Yellow', color: '#e6a817', soft: '#fdf3d7', icon: '⚠️' },
  green: { key: 'green', label: 'Normal', short: 'Green', color: '#2e9c86', soft: '#e3f3ee', icon: '✅' },
  nostd: { key: 'nostd', label: 'Tanpa standar', short: 'No std', color: '#94a3b8', soft: '#eef2f6', icon: '❔' },
};

export const DEVIATION_LABEL = {
  instant: 'Instant tap',
  fast: 'Terlalu cepat',
  slow: 'Terlalu lama',
  ok: 'Normal',
  nostd: 'Tanpa standar',
};

export const ACK_STATUS = {
  mistap: { key: 'mistap', label: 'Salah tap', hint: 'PIC tidak menekan start/finish pada waktu sebenarnya' },
  valid: { key: 'valid', label: 'Durasi valid', hint: 'Durasi memang benar, standar yang perlu ditinjau' },
  followup: { key: 'followup', label: 'Perlu follow-up', hint: 'Sudah dicek, perlu tindak lanjut ke PIC / atasan' },
  other: { key: 'other', label: 'Lainnya', hint: 'Lihat catatan' },
};

/** Fixed colour per department, so a dept keeps its hue across every chart. */
export const DEPT_COLOR = {
  PN1: '#3f78c0', PN2: '#6d5eb0', PC: '#cc8b5c', QC: '#5a9438', QA: '#bd6b92', MC: '#6b7f99',
  PN: '#9aa5b5', EG: '#8a8f4a',
};

/** Ratio buckets (actual / standard) for the report and the distribution view. */
export const RATIO_BUCKETS = [
  { key: '<10', label: '< 10%', test: (r) => r < 10 },
  { key: '10-50', label: '10 – 50%', test: (r) => r >= 10 && r < 50 },
  { key: '50-100', label: '50 – 100%', test: (r) => r >= 50 && r < 100 },
  { key: '100-200', label: '100 – 200%', test: (r) => r >= 100 && r < 200 },
  { key: '200-500', label: '200 – 500%', test: (r) => r >= 200 && r < 500 },
  { key: '>500', label: '> 500%', test: (r) => r >= 500 },
];
export const ratioBucket = (r) => (r == null ? null : (RATIO_BUCKETS.find((b) => b.test(Number(r))) || {}).label || null);

// ---------------------------------------------------------------------------
// Dates. The API serialises SQL datetimes as ISO strings with a trailing Z,
// but the values are plant wall-clock time; read them back with the UTC
// accessors so they are never shifted by the browser's zone.
// ---------------------------------------------------------------------------
export function wallTime(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
}

const pad = (n) => String(n).padStart(2, '0');
export const toISODate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

/** Format a local Date (already wall time) as dd/mm hh:mm. */
export const fmtLocalDateTime = (d) => (d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}` : '-');

export function fmtDateTime(iso) {
  return fmtLocalDateTime(wallTime(iso));
}
export function fmtDateTimeFull(iso) {
  const d = wallTime(iso);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '-';
}
export function fmtTime(iso) {
  const d = wallTime(iso);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : '-';
}
export function fmtDate(iso) {
  const d = wallTime(iso);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '-';
}

/** Minutes -> '2d 3h 14m' / '2h 5m' / '14m' / '12s'. */
export function fmtDuration(min) {
  if (min == null || isNaN(min)) return '-';
  const m = Number(min);
  if (m < 1) return `${Math.round(m * 60)}s`;
  const h = Math.floor(m / 60);
  const mm = Math.round(m - h * 60);
  if (h >= 24) { const d = Math.floor(h / 24); return `${d}d ${h - d * 24}h ${mm}m`; }
  if (h > 0) return `${h}h ${mm}m`;
  return `${mm}m`;
}

const intFmt = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });
export const fmtInt = (v) => intFmt.format(Math.round(Number(v) || 0));
export const fmtRatio = (v) => (v == null || isNaN(v) ? '-' : `${intFmt.format(Math.round(Number(v)))}%`);

/** 'A|B' -> 'A, B' */
export const picList = (s) => (s ? String(s).split('|').filter(Boolean) : []);
export const stepKey = (r) => `${r.Batch_No}|${r.seq_id}|${r.No_urut}`;
