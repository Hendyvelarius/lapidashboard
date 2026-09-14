// ---------------------------------------------------------------------------
// Batches Report (Laporan Turun PPI) workbook.
//
// Kept apart from the modal so the layout can be exercised without React: the
// modal owns the period and the fetch, this owns what the sheet looks like.
// Uses xlsx-js-style (a declared dependency, same as the sibling exports)
// because plain `xlsx` drops cell styling on write.
//
// The column order is the one the manual report already uses: identity, then
// each of the three PPI sections as a block of four -- formula, availability,
// PPI date, stock-cut date -- then the registration details.
// ---------------------------------------------------------------------------

// `align` drives the body cell style, `date` marks columns written as Excel
// serials, `num` those written as numbers, and `band` groups columns under the
// merged banner above the headers.
export const COLUMNS = [
  { header: 'Product', key: 'ProductName', width: 42, align: 'left', band: 'Identitas Batch' },
  { header: 'No Batch', key: 'BatchNo', width: 13, band: 'Identitas Batch' },
  { header: 'Batch Status', key: 'BatchStatus', width: 12, band: 'Identitas Batch' },

  { header: 'Formula Proses', key: 'FormulaProses', width: 16, align: 'left', band: 'Pengolahan (BB)' },
  { header: 'Ketersediaan BB', key: 'KetersediaanBB', width: 26, align: 'left', avail: true, band: 'Pengolahan (BB)' },
  { header: 'Tanggal Turun PPI Proses', key: 'TurunPPIProses', width: 14, date: true, band: 'Pengolahan (BB)' },
  { header: 'Tanggal Potong Stock BB', key: 'PotongStockBB', width: 14, date: true, band: 'Pengolahan (BB)' },

  { header: 'Formula Kemas Primer', key: 'FormulaKemasPrimer', width: 16, align: 'left', band: 'Kemas Primer (BKP)' },
  { header: 'Ketersediaan BKP', key: 'KetersediaanBKP', width: 26, align: 'left', avail: true, band: 'Kemas Primer (BKP)' },
  { header: 'Tanggal Turun PPI Kemas Primer', key: 'TurunPPIKemasPrimer', width: 14, date: true, band: 'Kemas Primer (BKP)' },
  { header: 'Tanggal Potong Stock BKP', key: 'PotongStockBKP', width: 14, date: true, band: 'Kemas Primer (BKP)' },

  { header: 'Formula Kemas Sekunder', key: 'FormulaKemasSekunder', width: 16, align: 'left', band: 'Kemas Sekunder (BKS)' },
  { header: 'Ketersediaan BKS', key: 'KetersediaanBKS', width: 26, align: 'left', avail: true, band: 'Kemas Sekunder (BKS)' },
  { header: 'Tanggal Turun PPI Kemas Sekunder', key: 'TurunPPIKemasSekunder', width: 14, date: true, band: 'Kemas Sekunder (BKS)' },
  { header: 'Tanggal Potong Stock BKS', key: 'PotongStockBKS', width: 14, date: true, band: 'Kemas Sekunder (BKS)' },

  { header: 'Expire Date', key: 'ExpireDate', width: 13, date: true, band: 'Registrasi Batch' },
  { header: 'Mfg Date', key: 'MfgDate', width: 13, date: true, band: 'Registrasi Batch' },
  { header: 'HET Primer', key: 'HETPrimer', width: 13, num: true, band: 'Registrasi Batch' },
  { header: 'HET Sekunder', key: 'HETSekunder', width: 13, num: true, band: 'Registrasi Batch' },
  { header: 'Batch Size', key: 'BatchSize', width: 12, num: true, band: 'Registrasi Batch' },
  { header: 'UOM', key: 'UOM', width: 11, band: 'Registrasi Batch' },
];

// Fills are auto-prefixed to ARGB by xlsx-js-style; font and border colours are
// passed through verbatim, so those carry an explicit FF alpha channel.
const NAVY = '1F3864', BAND = '2F5597', ZEBRA = 'F4F6FB', RULE = 'C7CEDB';
const OK_FILL = 'E7F6EC', SHORT_FILL = 'FDECEC', DONE_FILL = 'EEF1F6';
const F_NAVY = 'FF1F3864', F_SUB = 'FF5A6478', F_WHITE = 'FFFFFFFF', F_BODY = 'FF1F2937';
const F_OK = 'FF166534', F_SHORT = 'FF991B1B', F_DONE = 'FF64748B';

const border = (rgb) => {
  const s = { style: 'thin', color: { rgb: rgb.length === 6 ? 'FF' + rgb : rgb } };
  return { top: s, bottom: s, left: s, right: s };
};

const ST = {
  title: { font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: F_NAVY } } },
  sub: { font: { name: 'Calibri', sz: 10, color: { rgb: F_SUB } } },
  band: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: F_WHITE } },
    fill: { fgColor: { rgb: BAND } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: border(BAND),
  },
  head: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: F_WHITE } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: border(NAVY),
  },
};

/** Body cell style, varying by alignment, zebra stripe and number format. */
function bodyStyle({ align = 'center', zebra = false, date = false, num = false }) {
  const s = {
    font: { name: 'Calibri', sz: 10, color: { rgb: F_BODY } },
    alignment: { horizontal: align, vertical: 'center', wrapText: align === 'left' },
    border: border(RULE),
  };
  if (zebra) s.fill = { fgColor: { rgb: ZEBRA } };
  if (date) s.numFmt = 'dd/mm/yyyy';
  if (num) s.numFmt = '#,##0';
  return s;
}

/**
 * The availability cells carry the one judgement in the report, so they get
 * their own colour: covered, already issued, or the list of items that fall
 * short. The shortage colour has to survive the zebra stripe, so it replaces
 * the fill rather than layering on it.
 */
function availabilityStyle(value, zebra) {
  const s = bodyStyle({ align: 'left', zebra });
  if (value === 'ALL OK') {
    s.fill = { fgColor: { rgb: OK_FILL } };
    s.font = { ...s.font, bold: true, color: { rgb: F_OK } };
  } else if (value === 'SELESAI') {
    s.fill = { fgColor: { rgb: DONE_FILL } };
    s.font = { ...s.font, color: { rgb: F_DONE } };
  } else if (value) {
    s.fill = { fgColor: { rgb: SHORT_FILL } };
    s.font = { ...s.font, bold: true, color: { rgb: F_SHORT } };
  }
  return s;
}

/** Excel serial date (1900 system) so the cell sorts and formats as a real date. */
export const excelSerial = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 86400000);
};
/** The API returns UTC ISO strings; take the calendar date as stored. */
export const dateOnly = (value) => (value ? String(value).slice(0, 10) : '');
/** 'YYYY-MM-DD' -> 'DD/MM/YYYY' for the human-readable header lines. */
export const fmtID = (iso) => (iso ? iso.split('-').reverse().join('/') : '');

/**
 * @param {object} XLSXModule the xlsx-js-style module
 * @param {Array}  rows       API rows from /api/batchesReport
 * @param {object} meta       { from, to, generatedOn }
 */
export function buildWorkbook(XLSXModule, rows, meta) {
  // Vite's CJS interop hoists the named exports onto the namespace, plain Node
  // ESM leaves them under .default -- accept either shape.
  const XLSX = XLSXModule.utils ? XLSXModule : XLSXModule.default;
  const cell = (v, s) => ({ v, t: typeof v === 'number' ? 'n' : 's', s });
  const SPAN = COLUMNS.length;
  const aoa = [];
  const merges = [];

  const shortBatches = rows.filter((r) => [r.KetersediaanBB, r.KetersediaanBKP, r.KetersediaanBKS]
    .some((v) => v && v !== 'ALL OK' && v !== 'SELESAI')).length;

  const scopeLine = [
    `Periode ${fmtID(meta.from)} – ${fmtID(meta.to)}`,
    `${rows.length} batch`,
    shortBatches ? `${shortBatches} batch dengan material kurang` : 'Material lengkap untuk semua batch',
  ].join('  ·  ');

  aoa.push([cell('LAPORAN TURUN PPI', ST.title)]);
  aoa.push([cell(scopeLine, ST.sub)]);
  aoa.push([cell(
    `Difilter berdasarkan tanggal turun PPI · dibuat ${fmtID(meta.generatedOn)}`,
    ST.sub)]);
  aoa.push([cell(
    'Ketersediaan dibaca terhadap saldo gudang periode berjalan, dialokasikan '
    + 'menurut urutan turun PPI — batch yang PPI-nya lebih dulu turun mengambil '
    + 'stock lebih dulu. "ALL OK" = seluruh material tercukupi, "SELESAI" = '
    + 'material sudah diserahterimakan, selain itu berisi kode item yang kurang.',
    ST.sub)]);
  aoa.push([]);
  [0, 1, 2, 3].forEach((r) => merges.push({ s: { r, c: 0 }, e: { r, c: SPAN - 1 } }));

  // Banner row grouping the columns, then the header row.
  const bandRow = aoa.length;
  aoa.push(COLUMNS.map((c) => cell(c.band, ST.band)));
  for (let i = 0; i < SPAN;) {
    let j = i;
    while (j + 1 < SPAN && COLUMNS[j + 1].band === COLUMNS[i].band) j++;
    if (j > i) merges.push({ s: { r: bandRow, c: i }, e: { r: bandRow, c: j } });
    i = j + 1;
  }
  const headRow = aoa.length;
  aoa.push(COLUMNS.map((c) => cell(c.header, ST.head)));

  rows.forEach((r, i) => {
    const zebra = i % 2 === 1;
    aoa.push(COLUMNS.map((c) => {
      const raw = r[c.key];
      if (c.avail) return cell(raw == null ? '' : String(raw), availabilityStyle(raw, zebra));
      const style = bodyStyle({ align: c.align || 'center', zebra, date: c.date, num: c.num });
      if (c.date) {
        const iso = dateOnly(raw);
        return iso ? cell(excelSerial(iso), style) : cell('', style);
      }
      if (c.num) return typeof raw === 'number' ? cell(raw, style) : cell('', style);
      return cell(raw == null ? '' : String(raw), style);
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));
  // title, scope, source, legend, spacer, band, header
  ws['!rows'] = [{ hpt: 24 }, { hpt: 15 }, { hpt: 15 }, { hpt: 28 }, { hpt: 6 }, { hpt: 18 }, { hpt: 34 }];
  ws['!merges'] = merges;
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headRow, c: 0 },
      e: { r: headRow + rows.length, c: SPAN - 1 },
    }),
  };
  ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Turun PPI');
  return wb;
}
