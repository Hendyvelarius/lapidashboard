// ---------------------------------------------------------------------------
// Production Output report workbook.
//
// Four sheets: a product x year matrix, a product x month matrix, a summary of
// cross-tabs, and the data-source notes. Kept apart from the modal so the
// layout can be exercised without React.
//
// Uses xlsx-js-style because plain `xlsx` drops cell styling on write, plus
// jszip to inject the frozen panes SheetJS has no writer for.
// ---------------------------------------------------------------------------

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
export const MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const LOB_ORDER = ['Ethical', 'Generic', 'OTC', 'Toll In', 'Toll Out', 'Import', 'Export'];

// Fills are auto-prefixed to ARGB by xlsx-js-style; font and border colours are
// passed through verbatim, so those carry an explicit FF alpha channel.
const NAVY = '1F3864', LIGHT = 'F2F5FA', RULE = 'C7CEDB';
const F_NAVY = 'FF1F3864', F_SUB = 'FF5A6478', F_WHITE = 'FFFFFFFF', F_MUTE = 'FF8A93A5';

function box(rgb) {
  const s = { style: 'thin', color: { rgb: rgb.length === 6 ? 'FF' + rgb : rgb } };
  return { top: s, bottom: s, left: s, right: s };
}

const S = {
  title: { font: { name: 'Calibri', sz: 16, bold: true, color: { rgb: F_NAVY } } },
  subtitle: { font: { name: 'Calibri', sz: 10, color: { rgb: F_SUB } } },
  header: {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: F_WHITE } },
    fill: { fgColor: { rgb: NAVY } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: box(NAVY),
  },
  text: { font: { name: 'Calibri', sz: 10 }, alignment: { vertical: 'center' }, border: box(RULE) },
  textWrap: { font: { name: 'Calibri', sz: 10 }, alignment: { vertical: 'center', wrapText: true }, border: box(RULE) },
  center: { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'center', vertical: 'center' }, border: box(RULE) },
  num: { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '#,##0', border: box(RULE) },
  numMute: { font: { name: 'Calibri', sz: 10, color: { rgb: F_MUTE } }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '#,##0', border: box(RULE) },
  rowTot: { font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: F_NAVY } }, fill: { fgColor: { rgb: LIGHT } }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '#,##0', border: box(RULE) },
  totLabel: { font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: F_NAVY } }, fill: { fgColor: { rgb: LIGHT } }, alignment: { vertical: 'center' }, border: box(RULE) },
  totNum: { font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: F_NAVY } }, fill: { fgColor: { rgb: LIGHT } }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '#,##0', border: box(RULE) },
  secHead: { font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: F_NAVY } } },
  pct: { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '0.0%', border: box(RULE) },
  totPct: { font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: F_NAVY } }, fill: { fgColor: { rgb: LIGHT } }, alignment: { horizontal: 'right', vertical: 'center' }, numFmt: '0.0%', border: box(RULE) },
  noteKey: { font: { name: 'Calibri', sz: 10, bold: true }, alignment: { vertical: 'top' } },
  noteVal: { font: { name: 'Calibri', sz: 10 }, alignment: { vertical: 'top', wrapText: true } },
};

const C = (v, style) => ({ v, t: typeof v === 'number' ? 'n' : 's', s: style });

const titleCase = (s) => String(s == null ? '' : s).trim().toLowerCase()
  .replace(/\b[a-z]/g, (m) => m.toUpperCase())
  .replace(/\bOdt\b/g, 'ODT').replace(/\bTss\b/g, 'TSS').replace(/\bDs\b/g, 'DS');

const mergeSpan = (rows, span) => rows.map((r) => ({ s: { r, c: 0 }, e: { r, c: span - 1 } }));

/** Title, subtitle lines, blank spacer. */
function titleBlock(A, merges, span, title, lines) {
  A.push([C(title, S.title)]);
  lines.forEach((l) => A.push([C(l, S.subtitle)]));
  A.push([]);
  mergeSpan([...Array(1 + lines.length).keys()], span).forEach((m) => merges.push(m));
}

/**
 * Shapes the API rows into the two roll-ups the sheets need.
 * @param {Array} apiRows rows from /api/productionOutput
 */
export function shapeRows(apiRows) {
  const recs = apiRows.map((r) => ({
    kode: String(r.ProductID).trim(),
    nama: String(r.ProductName).trim(),
    sediaan: titleCase(r.BentukSediaan),
    kemasan: r.Kemasan ? titleCase(r.Kemasan) : '-',
    isi: Number(r.IsiPerKemasan) || 0,
    satuanIsi: (r.SatuanIsi || '').trim(),
    ketKemasan: (r.KeteranganKemasan || '').trim(),
    lob: r.LOB,
    tahun: String(r.Tahun),
    bulan: Number(r.Bulan),
    qty: Number(r.JumlahUnit) || 0,
    batch: Number(r.JumlahBatch) || 0,
  }));

  const years = [...new Set(recs.map((r) => r.tahun))].sort();

  // product x year, keeping the twelve monthly buckets
  const pyMap = new Map();
  for (const r of recs) {
    const key = r.kode + '|' + r.tahun;
    let e = pyMap.get(key);
    if (!e) {
      e = { kode: r.kode, nama: r.nama, sediaan: r.sediaan, kemasan: r.kemasan,
            isi: r.isi, satuanIsi: r.satuanIsi, ketKemasan: r.ketKemasan,
            lob: r.lob, tahun: r.tahun, qty: 0, batch: 0, months: new Array(12).fill(0) };
      pyMap.set(key, e);
    }
    e.qty += r.qty; e.batch += r.batch; e.months[r.bulan - 1] += r.qty;
  }
  const py = [...pyMap.values()].sort((a, b) =>
    a.tahun.localeCompare(b.tahun)
    || (LOB_ORDER.indexOf(a.lob) - LOB_ORDER.indexOf(b.lob))
    || a.nama.localeCompare(b.nama));

  // one row per product, a bucket per year. Identity comes from the most recent
  // year the product ran, so a reclassified product shows its current category.
  const prodMap = new Map();
  for (const e of py) {
    let p = prodMap.get(e.kode);
    if (!p) {
      p = { kode: e.kode, nama: e.nama, sediaan: e.sediaan, kemasan: e.kemasan,
            isi: e.isi, satuanIsi: e.satuanIsi, ketKemasan: e.ketKemasan,
            lob: e.lob, latest: e.tahun, qty: 0, batch: 0, byYear: {} };
      prodMap.set(e.kode, p);
    }
    if (e.tahun >= p.latest) {
      p.latest = e.tahun; p.nama = e.nama; p.sediaan = e.sediaan;
      p.kemasan = e.kemasan; p.lob = e.lob;
      p.isi = e.isi; p.satuanIsi = e.satuanIsi; p.ketKemasan = e.ketKemasan;
    }
    p.qty += e.qty; p.batch += e.batch;
    p.byYear[e.tahun] = (p.byYear[e.tahun] || 0) + e.qty;
  }
  const products = [...prodMap.values()].sort((a, b) =>
    (LOB_ORDER.indexOf(a.lob) - LOB_ORDER.indexOf(b.lob))
    || a.sediaan.localeCompare(b.sediaan)
    || a.nama.localeCompare(b.nama));

  return { recs, years, py, products };
}

/**
 * @param {object} XLSXModule the xlsx-js-style module
 * @param {Array}  apiRows    rows from /api/productionOutput
 * @param {object} meta       { generatedOn: 'YYYY-MM-DD' }
 */
export function buildWorkbook(XLSXModule, apiRows, meta) {
  // Vite's CJS interop hoists the named exports onto the namespace, plain Node
  // ESM leaves them under .default -- accept either shape.
  const XLSX = XLSXModule.utils ? XLSXModule : XLSXModule.default;
  const { recs, years, py, products } = shapeRows(apiRows);

  const firstYear = years[0], lastYear = years[years.length - 1];
  const firstMonth = Math.min(...recs.filter((r) => r.tahun === firstYear).map((r) => r.bulan));
  const lastMonth = Math.max(...recs.filter((r) => r.tahun === lastYear).map((r) => r.bulan));
  const grandQty = recs.reduce((a, r) => a + r.qty, 0);
  const grandBatch = recs.reduce((a, r) => a + r.batch, 0);

  const period = MONTHS_ID[firstMonth - 1] + ' ' + firstYear + ' – ' + MONTHS_ID[lastMonth - 1] + ' ' + lastYear;
  const srcLine = 'Sumber: tmp_spLapProduksi_GWN_ReleaseQA (rilis QA, per bulan tempel label). Batch granulat dikecualikan.';

  const wb = XLSX.utils.book_new();

  // ================================================ Sheet 1: yearly matrix ===
  {
    const A = [], merges = [];
    const span = 9 + years.length + 1;
    titleBlock(A, merges, span, 'PRODUCTION OUTPUT — TAHUNAN',
      [period + ' · ' + products.length + ' produk · ' + grandBatch.toLocaleString('id-ID') + ' batch',
       srcLine + ' Tahun tanpa output dibiarkan kosong.']);

    const HEAD = ['No.', 'Kode Produk', 'Nama Produk', 'Bentuk Sediaan', 'Kemasan',
                  'Isi per Kemasan', 'Satuan Isi', 'Keterangan Kemasan', 'LOB']
      .concat(years).concat(['Total']);
    A.push(HEAD.map((h) => C(/^\d{4}$/.test(h) ? Number(h) : h, S.header)));
    const headerRow = A.length;

    products.forEach((p, i) => {
      const row = [
        C(i + 1, S.center), C(p.kode, S.center), C(p.nama, S.textWrap),
        C(p.sediaan, S.text), C(p.kemasan, S.text),
        p.isi ? C(p.isi, S.num) : C('', S.numMute), C(p.satuanIsi, S.center),
        C(p.ketKemasan, S.textWrap), C(p.lob, S.center),
      ];
      years.forEach((y) => {
        const q = p.byYear[y] || 0;
        row.push(q ? C(q, S.num) : C('', S.numMute));
      });
      row.push(C(p.qty, S.rowTot));
      A.push(row);
    });

    // One leading cell per identity column, or the year totals land under the
    // wrong headers.
    const IDENTITY_COLS = 9;
    const yearTotals = years.map((y) => products.reduce((a, p) => a + (p.byYear[y] || 0), 0));
    A.push(new Array(IDENTITY_COLS).fill(null)
             .map((_, i) => C(i === 2 ? 'TOTAL — ' + products.length + ' produk' : '', S.totLabel))
           .concat(yearTotals.map((q) => C(q, S.totNum)))
           .concat([C(grandQty, S.totNum)]));

    const ws = XLSX.utils.aoa_to_sheet(A);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 48 }, { wch: 25 }, { wch: 10 },
                   { wch: 9 }, { wch: 12 }, { wch: 46 }, { wch: 10 }]
      .concat(years.map(() => ({ wch: 13 }))).concat([{ wch: 15 }]);
    ws['!rows'] = [{ hpt: 24 }, { hpt: 15 }, { hpt: 15 }, { hpt: 8 }, { hpt: 30 }];
    ws['!merges'] = merges.concat([{ s: { r: A.length - 1, c: 2 }, e: { r: A.length - 1, c: 8 } }]);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow - 1, c: 0 }, e: { r: A.length - 2, c: span - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, 'Output Tahunan');
  }

  // =============================================== Sheet 2: monthly matrix ===
  {
    const A = [], merges = [];
    const span = 23;
    titleBlock(A, merges, span, 'PRODUCTION OUTPUT — BULANAN',
      [period + ' · satu baris per produk per tahun, kolom Jan–Des',
       srcLine + ' Bulan tanpa output dibiarkan kosong.']);

    const HEAD = ['No.', 'Kode Produk', 'Nama Produk', 'Bentuk Sediaan', 'Kemasan',
                  'Isi per Kemasan', 'Satuan Isi', 'Keterangan Kemasan', 'LOB', 'Tahun']
      .concat(MONTHS_SHORT).concat(['Total']);
    A.push(HEAD.map((h) => C(h, S.header)));
    const headerRow = A.length;

    py.forEach((r, i) => {
      const row = [
        C(i + 1, S.center), C(r.kode, S.center), C(r.nama, S.textWrap),
        C(r.sediaan, S.text), C(r.kemasan, S.text),
        r.isi ? C(r.isi, S.num) : C('', S.numMute), C(r.satuanIsi, S.center),
        C(r.ketKemasan, S.textWrap), C(r.lob, S.center), C(Number(r.tahun), S.center),
      ];
      r.months.forEach((m) => row.push(m ? C(m, S.num) : C('', S.numMute)));
      row.push(C(r.qty, S.rowTot));
      A.push(row);
    });

    const monthTotals = new Array(12).fill(0);
    py.forEach((r) => r.months.forEach((m, i) => { monthTotals[i] += m; }));
    const IDENTITY_COLS = 10;
    A.push(new Array(IDENTITY_COLS).fill(null)
             .map((_, i) => C(i === 2 ? 'TOTAL SEMUA TAHUN' : '', S.totLabel))
           .concat(monthTotals.map((m) => C(m, S.totNum)))
           .concat([C(grandQty, S.totNum)]));

    const ws = XLSX.utils.aoa_to_sheet(A);
    ws['!cols'] = [{ wch: 6 }, { wch: 12 }, { wch: 46 }, { wch: 24 }, { wch: 10 },
                   { wch: 9 }, { wch: 12 }, { wch: 44 }, { wch: 10 }, { wch: 8 }]
      .concat(new Array(12).fill({ wch: 11 })).concat([{ wch: 14 }]);
    ws['!rows'] = [{ hpt: 24 }, { hpt: 15 }, { hpt: 15 }, { hpt: 8 }, { hpt: 30 }];
    ws['!merges'] = merges.concat([{ s: { r: A.length - 1, c: 2 }, e: { r: A.length - 1, c: 9 } }]);
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRow - 1, c: 0 }, e: { r: A.length - 2, c: span - 1 } }) };
    XLSX.utils.book_append_sheet(wb, ws, 'Output Bulanan');
  }

  // ====================================================== Sheet 3: summary ===
  {
    const A = [], merges = [];
    const span = years.length + 3;
    titleBlock(A, merges, span, 'RINGKASAN', [period, srcLine]);

    A.push([C('Output per Tahun', S.secHead)]);
    A.push([C('Tahun', S.header), C('Produk', S.header), C('Batch', S.header),
            C('Jumlah Unit', S.header), C('% Total', S.header)]);
    years.forEach((y) => {
      const rs = recs.filter((r) => r.tahun === y);
      const q = rs.reduce((a, r) => a + r.qty, 0);
      A.push([C(Number(y), S.center), C(new Set(rs.map((r) => r.kode)).size, S.num),
              C(rs.reduce((a, r) => a + r.batch, 0), S.num), C(q, S.num),
              C(grandQty ? q / grandQty : 0, S.pct)]);
    });
    A.push([C('Total', S.totLabel), C(new Set(recs.map((r) => r.kode)).size, S.totNum),
            C(grandBatch, S.totNum), C(grandQty, S.totNum), C(1, S.totPct)]);
    A.push([]);

    const matrix = (heading, keyHeader, keyOf, order) => {
      A.push([C(heading, S.secHead)]);
      A.push([C(keyHeader, S.header)].concat(years.map((y) => C(Number(y), S.header))).concat([C('Total', S.header)]));
      const keys = [...new Set(recs.map(keyOf))];
      keys.sort((a, b) => order
        ? (order.indexOf(a) - order.indexOf(b))
        : recs.filter((r) => keyOf(r) === b).reduce((s, r) => s + r.qty, 0)
          - recs.filter((r) => keyOf(r) === a).reduce((s, r) => s + r.qty, 0));
      const colTot = new Array(years.length).fill(0);
      keys.forEach((k) => {
        const row = [C(k, S.text)];
        let rowTot = 0;
        years.forEach((y, i) => {
          const q = recs.filter((r) => keyOf(r) === k && r.tahun === y).reduce((s, r) => s + r.qty, 0);
          rowTot += q; colTot[i] += q;
          row.push(q ? C(q, S.num) : C('', S.numMute));
        });
        row.push(C(rowTot, S.rowTot));
        A.push(row);
      });
      A.push([C('Total', S.totLabel)].concat(colTot.map((q) => C(q, S.totNum)))
             .concat([C(colTot.reduce((a, b) => a + b, 0), S.totNum)]));
      A.push([]);
    };

    matrix('Output per LOB per Tahun', 'LOB', (r) => r.lob, LOB_ORDER);
    matrix('Output per Bentuk Sediaan per Tahun', 'Bentuk Sediaan', (r) => r.sediaan, null);
    matrix('Output per Kemasan per Tahun', 'Kemasan', (r) => r.kemasan, null);

    const ws = XLSX.utils.aoa_to_sheet(A);
    ws['!cols'] = [{ wch: 34 }].concat(new Array(years.length).fill({ wch: 13 })).concat([{ wch: 15 }]);
    ws['!rows'] = [{ hpt: 24 }, { hpt: 15 }, { hpt: 15 }];
    ws['!merges'] = merges;
    XLSX.utils.book_append_sheet(wb, ws, 'Ringkasan');
  }

  // ======================================================== Sheet 4: notes ===
  {
    const notes = [
      ['Jumlah Unit', 'SUM(Output) dari tmp_spLapProduksi_GWN_ReleaseQA — tabel laporan produksi yang mencatat setiap batch yang diluluskan QA. Satu baris per batch; seluruh batch produk dijumlahkan per bulan dan per tahun.'],
      ['Tahun / Bulan', 'Diambil dari kolom Periode (format "YYYY MM"), yaitu bulan Dnc_Tempellabel — saat label ditempel dan batch resmi lepas karantina. Jadi angka ini berbasis RILIS, bukan tanggal produksi: batch yang dibuat Desember dan dirilis Januari masuk ke tahun berikutnya.'],
      ['Cakupan', MONTHS_ID[firstMonth - 1] + ' ' + firstYear + ' s/d ' + MONTHS_ID[lastMonth - 1] + ' ' + lastYear
        + '. Tabel sumber tersedia mulai Januari 2017. Bila periode berjalan disertakan, angkanya masih parsial — tabel ini di-refresh berkala sehingga batch paling akhir bisa belum masuk.'],
      ['Granulat dikecualikan', 'Semua batch GRANULAT (kode produk äx / ëx) dibuang. Granulat adalah produk antara yang nantinya dipakai oleh produk jadi, sehingga menghitungnya akan menjadi dobel. Ini juga menyamakan dasar dengan dashboard Line Metrics.'],
      ['Kode & Nama Produk', 'm_Product (Product_ID, Product_Name). Bila produk sudah tidak ada di master, nama diambil dari kolom Product_Name pada tabel sumber.'],
      ['Bentuk Sediaan', 'm_Product.Product_BentukSediaan di-lookup ke master m_Product_Sediaan (Sediaan_Nama). Sebagian produk lama tidak lagi punya isian ini dan tampil sebagai "(belum ditentukan)".'],
      ['Kemasan', 'Satuan serah-terima ke gudang: nilai BPHP_JumlahUnitID yang paling sering dipakai produk tersebut pada t_BPHP_Detail (seluruh riwayat). Fallback: kata pertama m_Product.Product_Kemasan; bila keduanya kosong ditulis "-". Ini satuan yang dipakai kolom Jumlah Unit (kotak / botol), bukan satuan dosis (tablet / kapsul).'],
      ['LOB', 'Ditentukan berurutan, yang pertama cocok dipakai:\n1. Import — m_product_pn_group.jenis_sediaan = "Import FG"\n2. Toll Out — m_product_pn_group.jenis_sediaan = "Toll Out"\n3. Toll In — produk terdaftar di m_product_tollin_HNA pada tahun ybs (akurat per tahun, master ini punya periode bulanan sejak 2018 11)\n4. Generic / OTC / Ethical / Export — kolom LOB pada vw_COGS_Product_Group untuk tahun ybs\n5. Bila kosong — m_product_otc → OTC, nama mengandung "GENERIK" → Generic, sisanya Ethical\nCara sourcing (Import / Toll Out / Toll In) diprioritaskan di atas kategori pasar, agar setiap produk hanya masuk satu LOB.'],
      ['Isi per Kemasan', 'm_Product.Product_VolumeInBox — jumlah satuan yang ada di dalam satu Kemasan, dengan satuannya pada kolom Satuan Isi. Perhatikan bahwa satuannya mengikuti bentuk sediaan: produk tablet berisi 100 tablet per kotak, tetapi produk cair tertulis 1 botol per kotak — volume mL-nya hanya ada di kolom Keterangan Kemasan. Dicek silang terhadap teks Product_Kemasan: 527 dari 544 produk cocok persis (96,9%); sisanya perlu dikonfirmasi ke bagian terkait karena salah satu dari kedua sumber sudah usang.'],
      ['Keterangan Kemasan', 'm_Product.Product_Kemasan — deskripsi kemasan lengkap, misalnya "Kotak @ 10 strip @ 10 tablet". Ini satu-satunya tempat volume atau bobot per wadah (mL, mg, gram) tercatat.'],
      ['LOB pada sheet Tahunan', 'Sheet Output Tahunan memuat satu baris per produk, sehingga LOB, Bentuk Sediaan dan Kemasan diambil dari tahun terakhir produk tersebut berproduksi — yaitu klasifikasi termutakhir. Sheet Output Bulanan tetap satu baris per produk per tahun, sehingga di sana LOB masih mengikuti tahun masing-masing. Untuk sebagian besar produk keduanya identik; bedanya hanya muncul pada produk yang pernah berpindah kategori.'],
      ['Keterbatasan LOB historis', 'vw_COGS_Product_Group hanya memuat periode 2024, 2025 dan 2026. Untuk tahun-tahun sebelumnya dipakai klasifikasi paling awal yang tersedia (2024) dan diberlakukan mundur. Demikian pula Import dan Toll Out memakai penetapan periode berjalan, karena kolom jenis_sediaan baru diisi mulai periode 2026 07. Artinya, produk yang hari ini Toll Out akan tampil Toll Out juga di tahun-tahun sebelumnya.'],
      ['Export', 'vw_COGS_Product_Group memuat satu nilai LOB tambahan, EXPORT, yang tidak termasuk enam kategori utama. Nilainya sangat kecil dan tetap ditampilkan apa adanya daripada digabungkan ke Ethical.'],
      ['Perbandingan dengan t_dnc_product', 'Kedua sumber mencatat peristiwa yang sama (rilis QA, ditanggali tempel label). Setelah granulat dikecualikan selisihnya kecil — di bawah 1% untuk tahun-tahun terakhir. t_dnc_product tidak dapat dipakai sebelum 2022 (kosong untuk 2017–2018), sehingga tabel laporan ini adalah satu-satunya sumber yang menjangkau 2017.'],
    ];

    const A = [];
    A.push([C('CATATAN SUMBER DATA', S.title)]);
    A.push([C('Dibuat ' + meta.generatedOn + ' · Database eSBM (LFSQL) · eDashboard', S.subtitle)]);
    A.push([]);
    A.push([C('Kolom / Aturan', S.header), C('Definisi', S.header)]);
    notes.forEach((nt) => A.push([C(nt[0], S.noteKey), C(nt[1], S.noteVal)]));

    const ws = XLSX.utils.aoa_to_sheet(A);
    ws['!cols'] = [{ wch: 26 }, { wch: 112 }];
    ws['!rows'] = [{ hpt: 24 }, { hpt: 15 }, { hpt: 8 }, { hpt: 20 }].concat(
      notes.map((nt) => ({ hpt: Math.max(18, Math.ceil(nt[1].length / 97) * 15 + (nt[1].split('\n').length - 1) * 15) })));
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }, { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Catatan Sumber Data');
  }

  return { wb, meta: { firstYear, lastYear, firstMonth, lastMonth, products: products.length, batches: grandBatch, units: grandQty } };
}

/**
 * SheetJS has no frozen-pane writer, so the <pane> element is injected into the
 * sheet XML after the workbook is serialised.
 * @returns {Promise<Blob>} the finished .xlsx
 */
export async function writeWithFrozenPanes(XLSXModule, JSZipModule, wb, panes) {
  const XLSX = XLSXModule.utils ? XLSXModule : XLSXModule.default;
  const JSZip = JSZipModule.default || JSZipModule;

  const buf = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'array' });
  const zip = await JSZip.loadAsync(buf);
  for (const p of panes) {
    const entry = 'xl/worksheets/sheet' + p.sheet + '.xml';
    const file = zip.file(entry);
    if (!file) continue;
    const xml = await file.async('string');
    const xs = p.xSplit || 0, ys = p.ySplit || 0;
    const top = XLSX.utils.encode_cell({ c: xs, r: ys });
    const active = xs && ys ? 'bottomRight' : (xs ? 'topRight' : 'bottomLeft');
    const pane = '<sheetView workbookViewId="0">'
      + '<pane' + (xs ? ' xSplit="' + xs + '"' : '') + (ys ? ' ySplit="' + ys + '"' : '')
      + ' topLeftCell="' + top + '" activePane="' + active + '" state="frozen"/>'
      + '<selection pane="' + active + '" activeCell="' + top + '" sqref="' + top + '"/>'
      + '</sheetView>';
    zip.file(entry, xml.replace('<sheetView workbookViewId="0"/>', pane));
  }
  return zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
