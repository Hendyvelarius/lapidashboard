// ---------------------------------------------------------------------------
// Production Monitoring report workbook.
//
// Kept apart from the modal so the layout can be exercised without React: the
// modal owns the filters and the fetch, this owns what the sheet looks like.
// Uses xlsx-js-style (a declared dependency, same as the Summary export) because
// plain `xlsx` drops cell styling on write.
// ---------------------------------------------------------------------------

// `align` drives the body cell style, `date` marks columns written as Excel
// serials, and `band` groups columns under the merged banner above the headers.
export const COLUMNS = [
  { header: 'Nomor', key: 'Nomor', width: 7, align: 'center', band: 'Identitas Batch' },
  { header: 'Nama Produk', key: 'ProductName', width: 44, align: 'left', band: 'Identitas Batch' },
  { header: 'Nomor Batch', key: 'BatchNo', width: 13, align: 'center', band: 'Identitas Batch' },
  { header: 'Turun PPI', key: 'TurunPPI', width: 13, date: true, band: 'PPI' },
  { header: 'Formula PPI', key: 'FormulaPPI', width: 34, align: 'left', band: 'PPI' },
  { header: 'Granulasi', key: 'Granulasi', width: 13, date: true, band: 'Proses Produksi' },
  { header: 'Mixing', key: 'Mixing', width: 13, date: true, band: 'Proses Produksi' },
  { header: 'Filling Kapsul', key: 'FillingKapsul', width: 13, date: true, band: 'Proses Produksi' },
  { header: 'Cetak', key: 'Cetak', width: 13, date: true, band: 'Proses Produksi' },
  { header: 'Coating', key: 'Coating', width: 13, date: true, band: 'Proses Produksi' },
  { header: 'Kemas Primer', key: 'KemasPrimer', width: 14, date: true, band: 'Proses Produksi' },
  { header: 'Penyerahan Sample QC', key: 'SampleQC', width: 15, date: true, band: 'QC / MC / QA' },
  { header: 'Penyerahan Sample MC', key: 'SampleMC', width: 15, date: true, band: 'QC / MC / QA' },
  { header: 'Penyerahan Pengujian QA', key: 'PengujianQA', width: 15, date: true, band: 'QC / MC / QA' },
  { header: 'Rilis Produk Jadi', key: 'ReleaseDate', width: 14, date: true, band: 'QC / MC / QA' },
];

// Fills are auto-prefixed to ARGB by xlsx-js-style; font and border colours are
// passed through verbatim, so those carry an explicit FF alpha channel.
const NAVY = '1F3864', BAND = '2F5597', ZEBRA = 'F4F6FB', RULE = 'C7CEDB';
const F_NAVY = 'FF1F3864', F_SUB = 'FF5A6478', F_WHITE = 'FFFFFFFF', F_BODY = 'FF1F2937';

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

/** Body cell style, varying by alignment, zebra stripe and date format. */
function bodyStyle({ align = 'center', zebra = false, date = false }) {
  const s = {
    font: { name: 'Calibri', sz: 10, color: { rgb: F_BODY } },
    alignment: { horizontal: align, vertical: 'center', wrapText: align === 'left' },
    border: border(RULE),
  };
  if (zebra) s.fill = { fgColor: { rgb: ZEBRA } };
  if (date) s.numFmt = 'dd/mm/yyyy';
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
 * @param {object} XLSX   the xlsx-js-style module
 * @param {Array}  rows   API rows from /api/productionMonitoring
 * @param {object} meta   { from, to, line, categories: string[], generatedOn }
 */
export function buildWorkbook(XLSXModule, rows, meta) {
  // Vite's CJS interop hoists the named exports onto the namespace, plain Node
  // ESM leaves them under .default -- accept either shape.
  const XLSX = XLSXModule.utils ? XLSXModule : XLSXModule.default;
  const cell = (v, s) => ({ v, t: typeof v === 'number' ? 'n' : 's', s });
  const SPAN = COLUMNS.length;
  const aoa = [];
  const merges = [];

  const scopeLine = [
    `Periode ${fmtID(meta.from)} – ${fmtID(meta.to)}`,
    meta.line === 'ALL' ? 'Semua line' : `Line ${meta.line}`,
    meta.categories && meta.categories.length ? meta.categories.join(', ') : 'Semua jenis sediaan',
    `${rows.length} batch`,
  ].join('  ·  ');

  aoa.push([cell('PRODUCTION MONITORING', ST.title)]);
  aoa.push([cell(scopeLine, ST.sub)]);
  aoa.push([cell(
    `Difilter berdasarkan tanggal batch mulai proses produksi · dibuat ${fmtID(meta.generatedOn)}`,
    ST.sub)]);
  aoa.push([cell(
    'Formula PPI dibaca PP; KP; KS — Pengolahan Inti dan Salut digabung bila sama. '
    + 'Bila keduanya berbeda kolom menampilkan empat bagian (PI; PS; KP; KS). '
    + '"-" = tidak ada formula terdaftar, spasi kosong = formula tanpa nama.',
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
      const style = bodyStyle({ align: c.align || 'center', zebra, date: c.date });
      if (c.key === 'Nomor') return cell(i + 1, style);
      if (!c.date) return cell(r[c.key] == null ? '' : String(r[c.key]), style);
      const iso = dateOnly(r[c.key]);
      return iso ? cell(excelSerial(iso), style) : cell('', style);
    }));
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = COLUMNS.map((c) => ({ wch: c.width }));
  // title, scope, source, formula legend, spacer, band, header
  ws['!rows'] = [{ hpt: 24 }, { hpt: 15 }, { hpt: 15 }, { hpt: 15 }, { hpt: 6 }, { hpt: 18 }, { hpt: 32 }];
  ws['!merges'] = merges;
  ws['!autofilter'] = {
    ref: XLSX.utils.encode_range({
      s: { r: headRow, c: 0 },
      e: { r: headRow + rows.length, c: SPAN - 1 },
    }),
  };
  ws['!margins'] = { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Production Monitoring');
  return wb;
}
