// Ordering for batch numbers in exports.
//
// A batch number is <product code><2-char sequence><last digit of the year>,
// built by dbo.convert_to_batchNo: sequences 0-99 are two digits ("HI206" =
// HI, 20, 2026); from 100 on the first character becomes a letter, A = 10,
// B = 11, ... ("I1D36" = I1, D3 = 133, 2026). Planned batches that are not
// registered yet look like "B2--186" (B2, 18, 2026). Plain string order gets
// these wrong ("I1D36" would land among the 30s, 2025 batches mix with 2026),
// so batches are decoded to (year, sequence) and compared on that.

const PLACEHOLDER = /^(.+)--(\d+)(\d)$/;
const CODE = /^(\d{2}|[A-Z]\d)(\d)$/;

const decodeSequence = (code) => {
  if (/^\d{2}$/.test(code)) return parseInt(code, 10);
  return (code.charCodeAt(0) - 65 + 10) * 10 + parseInt(code[1], 10);
};

// The year digit is read relative to refYear: the most recent year ending in it.
const fullYear = (digit, refYear) => refYear - ((refYear % 10) - digit + 10) % 10;

/**
 * Decode a batch number to { year, seq }, or null when it does not follow the
 * pattern (imports and other external numbers). productId, when known, marks
 * where the sequence starts; without it a 2-character product code is assumed,
 * which is what nearly every product uses.
 */
export function decodeBatchNo(batchNo, productId, refYear = new Date().getFullYear()) {
  const batch = String(batchNo ?? '').trim().toUpperCase();
  if (!batch) return null;

  const placeholder = batch.match(PLACEHOLDER);
  if (placeholder) {
    return { year: fullYear(parseInt(placeholder[3], 10), refYear), seq: parseInt(placeholder[2], 10) };
  }

  const pid = String(productId ?? '').trim().toUpperCase();
  const rest = pid && batch.startsWith(pid) ? batch.slice(pid.length) : (!pid ? batch.slice(2) : null);
  const m = rest !== null ? rest.match(CODE) : null;
  if (!m) return null;
  return { year: fullYear(parseInt(m[2], 10), refYear), seq: decodeSequence(m[1]) };
}

const natural = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Compare two batch numbers of the same product: decoded ones by (year, sequence), the rest after them. */
export function compareBatchNo(a, b, productId, refYear) {
  const da = decodeBatchNo(a, productId, refYear);
  const db = decodeBatchNo(b, productId, refYear);
  if (da && db) return da.year - db.year || da.seq - db.seq || natural.compare(String(a), String(b));
  if (da) return -1;
  if (db) return 1;
  return natural.compare(String(a ?? ''), String(b ?? ''));
}

/**
 * Sorted copy of rows: by product name (then product ID), then batch number.
 * keys names the fields holding { name, id, batch } in these rows.
 */
export function sortByProductThenBatch(rows, keys, refYear = new Date().getFullYear()) {
  return [...rows].sort((x, y) => {
    const byName = natural.compare(String(x[keys.name] ?? ''), String(y[keys.name] ?? ''));
    if (byName) return byName;
    const byId = natural.compare(String(x[keys.id] ?? ''), String(y[keys.id] ?? ''));
    if (byId) return byId;
    return compareBatchNo(x[keys.batch], y[keys.batch], keys.id ? x[keys.id] : null, refYear);
  });
}
