// ---------------------------------------------------------------------------
// Sediaan groups — the single product-grouping vocabulary shared by the
// dashboards (Line Metrics, Production/WIP, ...).
//
// Source of truth is m_product_pn_group.jenis_sediaan, resolved per period
// (backend). `key` is the raw DB value; `label` is what users read; `short`
// keeps crowded chart axes and stepper headers legible.
//
// This replaces the old m_product_sediaan_produksi master, whose ~16
// finer-grained values (Liquid BFS, Liquid PFS, Softgel, Serbuk, Suppositoria,
// ...) fragmented the WIP breakdown into one-product cards and left every
// product missing from that table sitting in "Unknown".
// ---------------------------------------------------------------------------

export const SEDIAAN_GROUPS = [
  { key: 'Liquid & DS',         label: 'Liquid & Dry Syrup',    short: 'Liquid & DS' },
  { key: 'Injeksi',             label: 'Injeksi',               short: 'Injeksi' },
  { key: 'Tablet Biasa Kapsul', label: 'Tablet Biasa & Kapsul', short: 'Tab & Kapsul' },
  { key: 'Tablet Salut',        label: 'Tablet Salut',          short: 'Tab Salut' },
  { key: 'Probiotik & Hormon',  label: 'Probiotik & Hormon',    short: 'Prob & Hormon' },
  { key: 'Import FG',           label: 'Import FG',             short: 'Import FG' },
  { key: 'Toll Out',            label: 'Toll Out',              short: 'Toll Out' },
];

export const SEDIAAN_ORDER = SEDIAAN_GROUPS.map((g) => g.key);

// Groups produced outside our own factory, so they never run through the
// production line and are excluded from every WIP / process view. The backend
// drops them from /api/wipData; this list is the frontend's matching guard.
export const NON_PRODUCED_SEDIAAN = ['Import FG', 'Toll Out'];

const LABELS = Object.fromEntries(SEDIAAN_GROUPS.map((g) => [g.key, g.label]));
const SHORTS = Object.fromEntries(SEDIAAN_GROUPS.map((g) => [g.key, g.short]));

export const sediaanLabel = (s) => LABELS[s] || s;
export const shortSediaan = (s) => SHORTS[s] || s;

/** Rank used for ordering: official groups first (in order), everything else after. */
export const sediaanRank = (s) => {
  const i = SEDIAAN_ORDER.indexOf(s);
  return i === -1 ? SEDIAAN_ORDER.length : i;
};

/**
 * Canonical order. Off-list values (a product with no group for the period —
 * "Belum Ada" / "Unknown" — or a stray group like Granulat Dasar) sort last,
 * alphabetically.
 */
export const sortSediaan = (list) => [...list].sort((a, b) => {
  const ra = sediaanRank(a), rb = sediaanRank(b);
  return ra !== rb ? ra - rb : a.localeCompare(b);
});
