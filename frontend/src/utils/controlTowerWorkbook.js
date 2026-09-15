// ---------------------------------------------------------------------------
// Processing Control Tower -- deviation report workbook.
//
// The modal owns the filters and the fetch; this owns the sheets. Every sheet
// is derived from the same detail rows (/api/controlTower/report) so the
// numbers reconcile across sheets: filter Raw Data to one dept and one month
// and you get exactly the count on Per Departemen.
//
// Uses xlsx-js-style (same as the other exports) because plain `xlsx` drops
// cell styling on write.
// ---------------------------------------------------------------------------
import {
  SEVERITY, DEVIATION_LABEL, ACK_STATUS, RATIO_BUCKETS, ratioBucket, picList, wallTime,
} from '../config/controlTower';

export const SHEETS = [
  { key: 'summary', label: 'Ringkasan', desc: 'Total per severity, per dept, per jenis deviasi' },
  { key: 'dept', label: 'Per Departemen', desc: 'Dept × bulan: red, yellow, scored, flag rate' },
  { key: 'process', label: 'Per Proses', desc: 'Proses mana yang paling sering ter-flag' },
  { key: 'user', label: 'Per User', desc: 'PIC × severity (proses dengan >1 PIC dihitung untuk setiap PIC)' },
  { key: 'bucket', label: 'Per % Deviasi', desc: 'Distribusi rasio aktual/standar per dept' },
  { key: 'product', label: 'Per Produk', desc: 'Produk × severity' },
  { key: 'ack', label: 'Acknowledgement', desc: 'Alert yang sudah di-ack beserta hasil pengecekan' },
  { key: 'raw', label: 'Raw Data', desc: 'Satu baris per proses (logical step)' },
];

// Fills are auto-prefixed to ARGB by xlsx-js-style; font and border colours are
// passed through verbatim, so those carry an explicit FF alpha channel.
const NAVY = '1F3864', ZEBRA = 'F4F6FB', RULE = 'C7CEDB';
const F_NAVY = 'FF1F3864', F_SUB = 'FF5A6478', F_WHITE = 'FFFFFFFF', F_BODY = 'FF1F2937';
const SEV_FILL = { red: 'FBE7E7', yellow: 'FDF3D7', green: 'E3F3EE', nostd: 'EEF2F6' };

const border = (rgb) => {
  const s = { style: 'thin', color: { rgb: rgb.length === 6 ? 'FF' + rgb : rgb } };
  return { top: s, bottom: s, left: s, right: s };
};

const ST = {
  title: { font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: F_NAVY } } },
  sub: { font: { name: 'Calibri', sz: 10, color: { rgb: F_SUB } } },
  section: { font: { name: 'Calibri', sz: 12, bold: true, color: { rgb: F_NAVY } } },
  head: {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: F_WHITE } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: border(NAVY),
  },
};

function bodyStyle({ align = 'center', zebra = false, numFmt = null, fill = null, bold = false }) {
  const s = {
    font: { name: 'Calibri', sz: 10, bold, color: { rgb: F_BODY } },
    alignment: { horizontal: align, vertical: 'center', wrapText: align === 'left' },
    border: border(RULE),
  };
  if (fill) s.fill = { fgColor: { rgb: fill } };
  else if (zebra) s.fill = { fgColor: { rgb: ZEBRA } };
  if (numFmt) s.numFmt = numFmt;
  return s;
}

/** Excel serial (1900 system) for a wall-clock Date, with time of day. */
function excelDateTime(iso) {
  const d = wallTime(iso);
  if (!d) return null;
  const utc = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds());
  return (utc - Date.UTC(1899, 11, 30)) / 86400000;
}
const fmtID = (iso) => (iso ? iso.split('-').reverse().join('/') : '');
const monthKey = (iso) => { const d = wallTime(iso); return d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` : ''; };
const median = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (n, d) => (d ? n / d : null);

// ---------------------------------------------------------------------------
// Generic table sheet: title lines, header row, body rows, autofilter.
// columns: [{ header, key, width, align, numFmt, fillBy }]
// ---------------------------------------------------------------------------
function tableSheet(XLSX, { title, lines = [], columns, rows, sections = null, freeze = true }) {
  const cell = (v, s) => ({ v, t: typeof v === 'number' ? 'n' : 's', s });
  const aoa = [];
  const merges = [];
  const SPAN = Math.max(sections ? Math.max(...sections.map((s) => s.columns.length)) : columns.length, 1);

  aoa.push([cell(title, ST.title)]);
  lines.forEach((l) => aoa.push([cell(l, ST.sub)]));
  aoa.push([]);
  for (let r = 0; r < aoa.length - 1; r++) merges.push({ s: { r, c: 0 }, e: { r, c: SPAN - 1 } });

  const pushTable = (cols, body) => {
    const headRow = aoa.length;
    aoa.push(cols.map((c) => cell(c.header, ST.head)));
    body.forEach((row, i) => {
      aoa.push(cols.map((c) => {
        const v = row[c.key];
        const fill = c.fillBy ? SEV_FILL[row[c.fillBy]] || null : null;
        const style = bodyStyle({ align: c.align || (typeof v === 'number' ? 'right' : 'center'), zebra: i % 2 === 1, numFmt: c.numFmt, fill, bold: row.__bold });
        if (v == null || v === '') return cell('', style);
        return cell(typeof v === 'number' ? v : String(v), style);
      }));
    });
    return headRow;
  };

  let headRow;
  if (sections) {
    sections.forEach((sec, idx) => {
      if (idx) aoa.push([]);
      aoa.push([cell(sec.title, ST.section)]);
      const hr = pushTable(sec.columns, sec.rows);
      if (idx === 0) headRow = hr;
    });
  } else {
    headRow = pushTable(columns, rows);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const widthCols = sections ? sections.reduce((a, s) => (s.columns.length > a.length ? s.columns : a), []) : columns;
  ws['!cols'] = widthCols.map((c) => ({ wch: c.width || 14 }));
  ws['!merges'] = merges;
  if (!sections && rows.length) {
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headRow, c: 0 }, e: { r: headRow + rows.length, c: columns.length - 1 } }) };
    if (freeze) ws['!freeze'] = { xSplit: 0, ySplit: headRow + 1 };
  }
  return ws;
}

// ---------------------------------------------------------------------------
// Aggregations
// ---------------------------------------------------------------------------
const emptyAgg = () => ({ red: 0, yellow: 0, green: 0, nostd: 0, ratios: [], instant: 0, fast: 0, slow: 0 });
function addTo(agg, r) {
  agg[r.severity] = (agg[r.severity] || 0) + 1;
  if (r.deviation && r.deviation !== 'ok' && r.deviation !== 'nostd') agg[r.deviation] += 1;
  if (r.ratio_pct != null) agg.ratios.push(Number(r.ratio_pct));
}
const finish = (agg) => {
  const scored = agg.red + agg.yellow + agg.green;
  const alerts = agg.red + agg.yellow;
  return {
    ...agg, scored, alerts,
    flagRate: pct(alerts, scored),
    instantShare: pct(agg.red, scored),
    medianRatio: median(agg.ratios),
    avgRatio: agg.ratios.length ? agg.ratios.reduce((a, b) => a + b, 0) / agg.ratios.length : null,
  };
};
function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, { key: k, sample: r, agg: emptyAgg(), productSet: new Set(), batchSet: new Set() });
    const g = m.get(k);
    g.productSet.add(r.Product_ID); g.batchSet.add(r.Batch_No);
    addTo(g.agg, r);
  }
  return [...m.values()].map((g) => ({ ...g, ...finish(g.agg) }));
}

const AGG_COLS = [
  { header: 'Red\n(instant)', key: 'red', width: 9 },
  { header: 'Yellow\n(deviasi)', key: 'yellow', width: 9 },
  { header: 'Alert\n(red+yellow)', key: 'alerts', width: 10 },
  { header: 'Green', key: 'green', width: 8 },
  { header: 'Scored\nsteps', key: 'scored', width: 8 },
  { header: 'Flag rate', key: 'flagRate', width: 9, numFmt: '0.0%' },
  { header: 'Terlalu\ncepat', key: 'fast', width: 8 },
  { header: 'Terlalu\nlama', key: 'slow', width: 8 },
  { header: 'Median\n% vs std', key: 'medianRatio', width: 9, numFmt: '0' },
];

// ---------------------------------------------------------------------------
// Workbook
// ---------------------------------------------------------------------------
/**
 * @param {object} XLSXModule  xlsx-js-style
 * @param {object} data        { rows, acks } from /api/controlTower/report (rows incl. green)
 * @param {object} meta        { from, to, depts: string[], sheets: string[], includeGreenRaw, thresholds, generatedOn, generatedBy }
 */
export function buildWorkbook(XLSXModule, data, meta) {
  const XLSX = XLSXModule.utils ? XLSXModule : XLSXModule.default;
  const rows = data.rows || [];
  const acks = data.acks || [];
  const alerts = rows.filter((r) => r.severity === 'red' || r.severity === 'yellow');
  const wanted = new Set(meta.sheets);

  const scope = meta.depts && meta.depts.length ? meta.depts.join(', ') : 'Semua departemen';
  const thr = meta.thresholds;
  const def = thr?.rows.find((t) => t.dept === '*');
  const overrides = thr ? thr.rows.filter((t) => t.dept !== '*') : [];
  const thrLine = thr
    ? `Red = durasi < ${thr.red_max_minutes} menit · Yellow = ≥ ${def?.fast_factor ?? '?'}× lebih cepat atau ≥ ${def?.slow_factor ?? '?'}× lebih lama dari standar` +
      (overrides.length ? ` (override: ${overrides.map((t) => `${t.dept} ${t.fast_factor}×/${t.slow_factor}×`).join(', ')})` : '') +
      ' · proses clerical tidak disertakan'
    : '';
  const baseLines = [
    `Periode ${fmtID(meta.from)} – ${fmtID(meta.to)} (tanggal selesai proses)  ·  ${scope}  ·  ${rows.length} proses, ${alerts.length} alert`,
    thrLine,
    `% vs std = durasi aktual ÷ standar × 100. Standar dari m_alur_detail (fallback m_tahapan). Proses pending digabung; jeda antar segmen tidak dihitung.`,
    `Dibuat ${fmtID(meta.generatedOn)}${meta.generatedBy ? ` oleh ${meta.generatedBy}` : ''}`,
  ];

  const wb = XLSX.utils.book_new();

  // ---- Ringkasan ------------------------------------------------------------
  if (wanted.has('summary')) {
    const total = finish(rows.reduce((a, r) => { addTo(a, r); return a; }, emptyAgg()));
    const sevRows = ['red', 'yellow', 'green', 'nostd'].map((k) => ({
      severity: k, label: `${SEVERITY[k].label} (${k})`, count: total[k], share: pct(total[k], rows.length),
    }));
    const deptRows = groupBy(rows, (r) => r.dept).sort((a, b) => b.alerts - a.alerts).map((g) => ({ dept: g.key, ...g }));
    const devRows = ['instant', 'fast', 'slow', 'ok', 'nostd'].map((k) => ({
      label: DEVIATION_LABEL[k], count: rows.filter((r) => r.deviation === k).length,
    }));
    const ackCount = alerts.filter((r) => r.ack_id).length;
    const ackRows = [
      { label: 'Alert (red + yellow)', count: alerts.length },
      { label: 'Sudah di-acknowledge', count: ackCount },
      { label: 'Belum di-acknowledge', count: alerts.length - ackCount },
      ...Object.values(ACK_STATUS).map((s) => ({ label: `  ↳ ${s.label}`, count: alerts.filter((r) => r.ack_status === s.key).length })),
    ];
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'PROCESSING CONTROL TOWER — RINGKASAN DEVIASI',
      lines: baseLines,
      columns: [],
      rows: [],
      sections: [
        { title: 'Per severity', columns: [
          { header: 'Severity', key: 'label', width: 26, align: 'left', fillBy: 'severity' },
          { header: 'Proses', key: 'count', width: 10 },
          { header: 'Share', key: 'share', width: 10, numFmt: '0.0%' },
        ], rows: sevRows },
        { title: 'Per departemen', columns: [{ header: 'Dept', key: 'dept', width: 26, align: 'left' }, ...AGG_COLS], rows: deptRows },
        { title: 'Per jenis deviasi', columns: [
          { header: 'Jenis', key: 'label', width: 26, align: 'left' }, { header: 'Proses', key: 'count', width: 10 },
        ], rows: devRows },
        { title: 'Acknowledgement', columns: [
          { header: 'Status', key: 'label', width: 26, align: 'left' }, { header: 'Alert', key: 'count', width: 10 },
        ], rows: ackRows },
      ],
    }), 'Ringkasan');
  }

  // ---- Per Departemen (dept × bulan) -----------------------------------------
  if (wanted.has('dept')) {
    const g = groupBy(rows, (r) => `${r.dept}|${monthKey(r.EndDate)}`)
      .map((x) => ({ dept: x.sample.dept, month: monthKey(x.sample.EndDate), ...x }))
      .sort((a, b) => (a.dept === b.dept ? a.month.localeCompare(b.month) : String(a.dept).localeCompare(String(b.dept))));
    // subtotal per dept
    const out = [];
    let cur = null, acc = null;
    const flush = () => { if (acc) out.push({ dept: cur, month: 'TOTAL', ...finish(acc), __bold: true }); };
    for (const r of g) {
      if (r.dept !== cur) { flush(); cur = r.dept; acc = emptyAgg(); }
      out.push(r);
      ['red', 'yellow', 'green', 'nostd', 'instant', 'fast', 'slow'].forEach((k) => { acc[k] += r[k]; });
      for (const v of r.ratios) acc.ratios.push(v); // no spread: a month can hold tens of thousands of ratios
    }
    flush();
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Per Departemen — per bulan', lines: baseLines,
      columns: [{ header: 'Dept', key: 'dept', width: 8 }, { header: 'Bulan', key: 'month', width: 10 }, ...AGG_COLS],
      rows: out,
    }), 'Per Departemen');
  }

  // ---- Per Proses -------------------------------------------------------------
  if (wanted.has('process')) {
    const g = groupBy(rows, (r) => `${r.dept}|${r.kode_tahapan}`)
      .map((x) => ({
        dept: x.sample.dept, kode: x.sample.kode_tahapan, proses: x.sample.nama_tahapan,
        std: x.sample.std_min, products: x.productSet.size,
        ...x,
      }))
      .sort((a, b) => b.alerts - a.alerts || b.scored - a.scored);
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Per Proses', lines: [...baseLines, 'Standar yang ditampilkan adalah contoh dari salah satu batch; standar bisa berbeda antar produk.'],
      columns: [
        { header: 'Dept', key: 'dept', width: 8 }, { header: 'Kode', key: 'kode', width: 7 },
        { header: 'Proses', key: 'proses', width: 36, align: 'left' }, { header: 'Produk', key: 'products', width: 8 },
        { header: 'Std (contoh)\nmenit', key: 'std', width: 10 }, ...AGG_COLS,
        { header: '% instant\ndari scored', key: 'instantShare', width: 10, numFmt: '0.0%' },
      ],
      rows: g,
    }), 'Per Proses');
  }

  // ---- Per User ---------------------------------------------------------------
  if (wanted.has('user')) {
    const expanded = [];
    for (const r of rows) {
      const ids = picList(r.pic_ids), names = picList(r.pic_names);
      if (!ids.length) { expanded.push({ ...r, __nik: '(tanpa PIC)', __name: '(tanpa PIC)' }); continue; }
      ids.forEach((id, i) => expanded.push({ ...r, __nik: id, __name: names[i] || id }));
    }
    const g = groupBy(expanded, (r) => r.__nik).map((x) => {
      const mine = expanded.filter((r) => r.__nik === x.key);
      const depts = [...new Set(mine.map((r) => r.dept))].join(', ');
      const top = groupBy(mine.filter((r) => r.severity === 'red' || r.severity === 'yellow'), (r) => r.nama_tahapan).sort((a, b) => b.alerts - a.alerts)[0];
      return { nik: x.key, name: x.sample.__name, depts, topProcess: top ? `${top.key} (${top.alerts})` : '', ...x };
    }).sort((a, b) => b.alerts - a.alerts || b.scored - a.scored);
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Per User (PIC)', lines: [...baseLines, 'Proses yang dikerjakan lebih dari satu PIC dihitung untuk setiap PIC, jadi total di sini lebih besar dari jumlah proses.'],
      columns: [
        { header: 'NIK', key: 'nik', width: 9 }, { header: 'Nama', key: 'name', width: 28, align: 'left' },
        { header: 'Dept proses', key: 'depts', width: 14 }, ...AGG_COLS,
        { header: '% instant\ndari scored', key: 'instantShare', width: 10, numFmt: '0.0%' },
        { header: 'Proses paling sering ter-flag', key: 'topProcess', width: 34, align: 'left' },
      ],
      rows: g,
    }), 'Per User');
  }

  // ---- Per % Deviasi ----------------------------------------------------------
  if (wanted.has('bucket')) {
    const depts = [...new Set(rows.map((r) => r.dept))].sort();
    const scoredRows = rows.filter((r) => r.ratio_pct != null);
    const out = RATIO_BUCKETS.map((b) => {
      const row = { bucket: b.label, total: 0 };
      depts.forEach((d) => { row[d] = scoredRows.filter((r) => r.dept === d && b.test(Number(r.ratio_pct))).length; row.total += row[d]; });
      row.share = pct(row.total, scoredRows.length);
      return row;
    });
    const tot = { bucket: 'TOTAL', total: scoredRows.length, share: 1, __bold: true };
    depts.forEach((d) => { tot[d] = scoredRows.filter((r) => r.dept === d).length; });
    out.push(tot);
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Distribusi % vs standar', lines: [...baseLines, '100% = tepat sesuai standar. < 100% lebih cepat dari standar, > 100% lebih lama. Hanya proses ber-standar.'],
      columns: [
        { header: 'Bucket % vs std', key: 'bucket', width: 16, align: 'left' },
        ...depts.map((d) => ({ header: d, key: d, width: 9 })),
        { header: 'Total', key: 'total', width: 9 }, { header: 'Share', key: 'share', width: 9, numFmt: '0.0%' },
      ],
      rows: out,
    }), 'Per % Deviasi');
  }

  // ---- Per Produk -------------------------------------------------------------
  if (wanted.has('product')) {
    const g = groupBy(rows, (r) => `${r.Product_ID}|${r.dept}`)
      .map((x) => ({ product: x.sample.Product_ID, name: x.sample.Product_Name, dept: x.sample.dept, batches: x.batchSet.size, ...x }))
      .sort((a, b) => b.alerts - a.alerts);
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Per Produk', lines: baseLines,
      columns: [
        { header: 'Produk', key: 'product', width: 8 }, { header: 'Nama produk', key: 'name', width: 36, align: 'left' },
        { header: 'Dept', key: 'dept', width: 8 }, { header: 'Batch', key: 'batches', width: 8 }, ...AGG_COLS,
      ],
      rows: g,
    }), 'Per Produk');
  }

  // ---- Acknowledgement --------------------------------------------------------
  if (wanted.has('ack')) {
    const out = acks.map((a) => ({
      ack_at: excelDateTime(a.ack_at), status: ACK_STATUS[a.ack_status]?.label || a.ack_status, by: a.ack_by_name ? `${a.ack_by_name} (${a.ack_by})` : a.ack_by, ackDept: a.ack_dept,
      note: a.ack_note, dept: a.dept, batch: a.batch_no, product: a.product_id, productName: a.product_name, process: a.nama_tahapan,
      severity: a.severity, sevLabel: SEVERITY[a.severity]?.label || a.severity, start: excelDateTime(a.start_date), end: excelDateTime(a.end_date),
      dur: a.duration_min == null ? null : Number(a.duration_min), std: a.standard_min, ratio: a.ratio_pct == null ? null : Number(a.ratio_pct), pic: picList(a.pic).join(', '),
    }));
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Acknowledgement', lines: [...baseLines, 'Data alert di sini adalah snapshot saat di-acknowledge.'],
      columns: [
        { header: 'Waktu ack', key: 'ack_at', width: 15, numFmt: 'dd/mm/yyyy hh:mm' }, { header: 'Hasil', key: 'status', width: 15 },
        { header: 'Oleh', key: 'by', width: 24, align: 'left' }, { header: 'Dept ack', key: 'ackDept', width: 8 },
        { header: 'Catatan', key: 'note', width: 40, align: 'left' },
        { header: 'Dept', key: 'dept', width: 7 }, { header: 'Batch', key: 'batch', width: 10 }, { header: 'Produk', key: 'product', width: 8 },
        { header: 'Nama produk', key: 'productName', width: 30, align: 'left' }, { header: 'Proses', key: 'process', width: 30, align: 'left' },
        { header: 'Severity', key: 'sevLabel', width: 11, fillBy: 'severity' },
        { header: 'Mulai', key: 'start', width: 15, numFmt: 'dd/mm/yyyy hh:mm' }, { header: 'Selesai', key: 'end', width: 15, numFmt: 'dd/mm/yyyy hh:mm' },
        { header: 'Durasi\n(menit)', key: 'dur', width: 9, numFmt: '0.0' }, { header: 'Standar\n(menit)', key: 'std', width: 9 },
        { header: '% vs std', key: 'ratio', width: 9, numFmt: '0' }, { header: 'PIC', key: 'pic', width: 28, align: 'left' },
      ],
      rows: out,
    }), 'Acknowledgement');
  }

  // ---- Raw Data ---------------------------------------------------------------
  if (wanted.has('raw')) {
    const src = meta.includeGreenRaw ? rows : rows.filter((r) => r.severity !== 'green');
    const out = src.map((r) => ({
      month: monthKey(r.EndDate), dept: r.dept, deptRaw: r.dept_raw, batch: r.Batch_No, batchDate: r.Batch_Date, product: r.Product_ID, productName: r.Product_Name,
      kode: r.kode_tahapan, process: r.nama_tahapan, seq: r.seq_id, urut: r.No_urut, segments: r.segments,
      start: excelDateTime(r.StartDate), end: excelDateTime(r.EndDate), dur: r.duration_min == null ? null : Number(r.duration_min),
      std: r.std_min, stdSource: r.std_source === 'master' ? 'm_alur_detail' : r.std_source === 'default' ? 'm_tahapan' : '(none)',
      ratio: r.ratio_pct == null ? null : Number(r.ratio_pct), bucket: ratioBucket(r.ratio_pct),
      severity: r.severity, sevLabel: SEVERITY[r.severity]?.label || r.severity, deviation: DEVIATION_LABEL[r.deviation] || r.deviation,
      picIds: picList(r.pic_ids).join(', '), pic: picList(r.pic_names).join(', '),
      ack: r.ack_id ? (ACK_STATUS[r.ack_status]?.label || r.ack_status) : '', ackBy: r.ack_by_name || r.ack_by || '', ackAt: r.ack_at ? excelDateTime(r.ack_at) : null, ackNote: r.ack_note || '',
    }));
    XLSX.utils.book_append_sheet(wb, tableSheet(XLSX, {
      title: 'Raw Data — satu baris per proses', lines: [...baseLines, meta.includeGreenRaw ? 'Termasuk proses normal (green).' : 'Hanya alert (red / yellow) dan proses tanpa standar; proses normal tidak disertakan.'],
      columns: [
        { header: 'Bulan', key: 'month', width: 9 }, { header: 'Dept', key: 'dept', width: 7 }, { header: 'Dept\n(raw)', key: 'deptRaw', width: 7 },
        { header: 'Batch', key: 'batch', width: 10 }, { header: 'Batch date', key: 'batchDate', width: 11 },
        { header: 'Produk', key: 'product', width: 8 }, { header: 'Nama produk', key: 'productName', width: 32, align: 'left' },
        { header: 'Kode', key: 'kode', width: 7 }, { header: 'Proses', key: 'process', width: 32, align: 'left' },
        { header: 'seq_id', key: 'seq', width: 7 }, { header: 'No_urut', key: 'urut', width: 7 }, { header: 'Segmen', key: 'segments', width: 7 },
        { header: 'Mulai', key: 'start', width: 15, numFmt: 'dd/mm/yyyy hh:mm' }, { header: 'Selesai', key: 'end', width: 15, numFmt: 'dd/mm/yyyy hh:mm' },
        { header: 'Durasi\n(menit)', key: 'dur', width: 9, numFmt: '0.0' }, { header: 'Standar\n(menit)', key: 'std', width: 9 }, { header: 'Sumber\nstandar', key: 'stdSource', width: 12 },
        { header: '% vs std', key: 'ratio', width: 9, numFmt: '0' }, { header: 'Bucket', key: 'bucket', width: 11 },
        { header: 'Severity', key: 'sevLabel', width: 12, fillBy: 'severity' }, { header: 'Jenis deviasi', key: 'deviation', width: 13 },
        { header: 'PIC (NIK)', key: 'picIds', width: 14 }, { header: 'PIC', key: 'pic', width: 30, align: 'left' },
        { header: 'Ack', key: 'ack', width: 14 }, { header: 'Ack oleh', key: 'ackBy', width: 18 }, { header: 'Ack pada', key: 'ackAt', width: 15, numFmt: 'dd/mm/yyyy hh:mm' },
        { header: 'Catatan ack', key: 'ackNote', width: 36, align: 'left' },
      ],
      rows: out,
    }), 'Raw Data');
  }

  return wb;
}
