/**
 * Centralized Help Content Configuration
 * 
 * This file contains all help content for the dashboard system.
 * Admins can easily edit text, add new topics, or modify existing ones here.
 * 
 * Structure:
 * - Each dashboard type (summary, production, quality, etc.) has its own section
 * - Each topic can have 1 or more pages (flexible)
 * - Pages and details are optional - add as needed
 * - Content is in simple Indonesian for non-technical users
 * 
 * Page Structure (all fields optional except description):
 * {
 *   subtitle: 'Optional subtitle',
 *   description: 'Main content (required)',
 *   details: ['Optional bullet point 1', 'Optional bullet point 2']
 * }
 */

export const helpContent = {
  // ====================================
  // SUMMARY DASHBOARD
  // ====================================
  summary: {
    dashboardTitle: 'Dashboard Ringkasan',
    topics: {
      sales: {
        id: 'sales',
        title: 'Selling In - Target Penjualan',
        icon: 'Target',
        description: 'Target penjualan & pencapaian',
        pages: [
          {
            subtitle: 'Apa itu Selling In (Target Penjualan)?',
            description: 'Membandingkan target penjualan bulan berjalan dengan realisasi penjualan aktual (dalam nilai Rupiah), agar performa penjualan mudah dipantau.',
            details: [
              'Target: nilai forecast penjualan bulan ini (unit × harga)',
              'Realisasi (MTD): total penjualan sampai hari ini bulan ini',
              'Achievement: persentase realisasi terhadap target',
              'Dipecah per grup: Produk Fokus vs Non-Fokus'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Nilai penjualan dan target dihitung dari jumlah unit dikali harga jual (HNA), lalu dibandingkan.',
            details: [
              'Realisasi MTD = jumlah (unit terjual × harga HNA) untuk periode berjalan',
              'Target = jumlah (unit forecast × harga HNA) untuk periode berjalan',
              'Achievement = Realisasi ÷ Target × 100%',
              'Achievement Fokus & Non-Fokus dihitung terpisah berdasarkan grup produk'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari laporan penjualan & forecast produk.',
            details: [
              'Laporan Penjualan, Forecast & Stok Produk (sp_Dashboard_DataReportManHours): unit forecast, unit terjual, harga HNA, dan grup produk per periode',
              'Penjualan Harian (sp_Dashboard_SalesNPending "Sales"): nilai penjualan harian untuk tren mingguan/harian'
            ]
          }
        ]
      },
      
      coverage: {
        id: 'coverage',
        title: 'Coverage Stock Barang Jadi',
        icon: 'Package',
        description: 'Persediaan barang jadi',
        pages: [
          {
            subtitle: 'Apa itu Coverage Stock Barang Jadi?',
            description: 'Menunjukkan seberapa besar stok barang jadi saat ini dibanding kebutuhan (forecast) bulan berjalan, dinyatakan sebagai persentase.',
            details: [
              'Coverage: persentase stok terhadap forecast bulan ini',
              'Under Coverage: produk dengan coverage < 130% (stok relatif kurang)',
              'Over Coverage: produk dengan coverage ≥ 300% (stok berlebih)',
              'Coverage 130%–299% dianggap normal'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Coverage dihitung per produk sebagai perbandingan stok terhadap forecast, lalu dirata-ratakan.',
            details: [
              'Coverage per produk = (Stok tersedia ÷ Forecast) × 100%',
              'Angka utama = rata-rata coverage seluruh produk pada periode berjalan',
              'Under = jumlah produk < 130%; Over = jumlah produk ≥ 300%',
              'Catatan: ukuran ini adalah rasio stok-terhadap-forecast, bukan jumlah hari'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari laporan stok & forecast produk.',
            details: [
              'Laporan Penjualan, Forecast & Stok Produk (sp_Dashboard_DataReportManHours): stok tersedia (Release) dan forecast per produk per periode'
            ]
          }
        ]
      },
      
      ota: {
        id: 'ota',
        title: 'OTA - On Time Arrival',
        icon: 'Truck',
        description: 'Ketepatan kedatangan material',
        pages: [
          {
            subtitle: 'Apa itu OTA (On Time Arrival)?',
            description: 'Mengukur ketepatan waktu kedatangan material dari supplier, dipisah antara Bahan Baku (BB) dan Bahan Kemas (BK).',
            details: [
              'Early: material datang lebih cepat dari jadwal',
              'On Time: material datang tepat waktu (paling ideal)',
              'Late: material terlambat — yang harus dihindari',
              '% Not Late = Early + On Time; target ideal minimal 95%'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Setiap kedatangan material dinilai statusnya (Early / On Time / Late), lalu dihitung persentasenya.',
            details: [
              '% Not Late = (jumlah Early + On Time) ÷ total kedatangan × 100%, dihitung terpisah untuk BB & BK',
              'On Time keseluruhan = On Time ÷ (On Time + Early + Late)',
              'Status "On Delivery" (masih dalam pengiriman) dihitung terpisah, tidak masuk perbandingan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari sistem penilaian ketepatan kedatangan material.',
            details: [
              'Ketepatan Kedatangan Material / OTA (sp_Dashboard_OTA): tipe material (BB/BK) dan status kedatangan (Early / On Time / Late) tiap material'
            ]
          }
        ]
      },
      
      wip: {
        id: 'wip',
        title: 'WIP - Work In Progress',
        icon: 'Box',
        description: 'Work in progress',
        pages: [
          {
            subtitle: 'Apa itu WIP (Work In Progress)?',
            description: 'Ringkasan batch yang sedang dalam proses produksi beserta status dan nilainya.',
            details: [
              'Total batch yang sedang diproses',
              'Distribusi status: Proses, Kemas, dan Karantina',
              'Batch terlambat = yang sudah lebih dari 38 hari dalam proses',
              'Donut menampilkan proporsi nilai (Rupiah) tiap status'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Batch dikelompokkan berdasarkan status; proporsi donut dihitung dari nilai tiap status.',
            details: [
              'Nilai batch = harga × jumlah (pakai jumlah aktual bila ada, jika tidak pakai standar)',
              'Proporsi status = nilai status ÷ total nilai seluruh batch',
              'Batch terlambat = durasi lebih dari 38 hari'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari sistem pelacakan batch produksi.',
            details: [
              'Data WIP (/api/wip): status, durasi, jumlah, dan harga tiap batch yang sedang aktif'
            ]
          }
        ]
      },
      
      stockout: {
        id: 'stockout',
        title: 'Stock Out - Kehabisan Stok',
        icon: 'AlertCircle',
        description: 'Kehabisan stok & lost sales',
        pages: [
          {
            subtitle: 'Apa itu Stock Out?',
            description: 'Kondisi produk benar-benar habis sehingga permintaan customer tidak bisa dipenuhi, yang mengakibatkan kehilangan penjualan (lost sales).',
            details: [
              'Jumlah SKU: berapa jenis produk yang punya permintaan tak terpenuhi',
              'Lost Sales: total nilai penjualan yang hilang (Rupiah)',
              'Fokus vs Non-Fokus: prioritas produk',
              '⚠️ Hanya produk yang benar-benar kosong (stok = 0) dengan pesanan tertahan yang dihitung'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Lost sales dihitung dari nilai pesanan yang tidak bisa dipenuhi karena stok kurang.',
            details: [
              'Lost Sales = jumlah nilai pesanan tertahan (produk dengan jumlah dipesan > stok tersedia)',
              'Jumlah SKU = produk dengan pesanan tertahan lebih dari 0',
              'Benar-benar habis = stok = 0 DAN ada pesanan (jumlah dipesan > 0); dipisah Fokus / Non-Fokus'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari sistem penjualan & pesanan tertahan.',
            details: [
              'Pending / Lost Sales (sp_Dashboard_SalesNPending "Pending"): stok tersedia (Saldo), jumlah dipesan (Qty_Booked), nilai tertahan (TotalPending), dan grup produk'
            ]
          }
        ]
      },
      
      material: {
        id: 'material',
        title: 'Ketersediaan Bahan Baku',
        icon: 'Package',
        description: 'Ketersediaan bahan baku',
        pages: [
          {
            subtitle: 'Apa itu Ketersediaan Bahan Baku?',
            description: 'Menunjukkan seberapa cukup material yang tersedia dibanding kebutuhan produksi, dipisah antara Bahan Baku (BB) dan Bahan Kemas (BK).',
            details: [
              'Bahan Baku (BB): persentase ketersediaan bahan baku',
              'Bahan Kemas (BK): persentase ketersediaan bahan kemas',
              'Overall: rata-rata gabungan keduanya',
              'Makin tinggi makin baik agar produksi tidak terhambat'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Ketersediaan dihitung per item sebagai perbandingan stok terhadap kebutuhan, lalu dirata-ratakan.',
            details: [
              'Ketersediaan per item = (stok terakhir ÷ kebutuhan) × 100%, dibatasi maksimal 100%',
              'Angka BB / BK = rata-rata ketersediaan seluruh item pada tipe tersebut',
              'Item tanpa kebutuhan (needed = 0) tidak dihitung'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari sistem ketersediaan material.',
            details: [
              'Ketersediaan Material (sp_Dashboard_MA): tipe item (BB/BK), stok terakhir (last_stock), dan kebutuhan (needed) tiap material'
            ]
          }
        ]
      },
      
      of1: {
        id: 'of1',
        title: 'OF1 - Order Fulfillment',
        icon: 'Target',
        description: 'Order fulfillment',
        pages: [
          {
            subtitle: 'Apa itu Order Fulfillment (OF1)?',
            description: 'Menunjukkan sejauh mana pesanan produksi sudah menyelesaikan tiap tahap pemenuhan, dari turun PPI hingga rilis QA.',
            details: [
              'Tahapan: Turun PPI → Potong Stock → Proses → Kemas → Dokumen → Rilis QC → Rilis QA',
              'Tiap tahap ditampilkan sebagai persentase penyelesaian',
              'Makin ke kanan (Rilis QA) makin dekat siap dikirim'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Untuk tiap tahap, dihitung persentase batch yang sudah menyelesaikannya, lalu dirata-rata antar produk.',
            details: [
              'Persentase tahap per produk = batch yang selesai tahap ÷ total batch produk itu',
              'Angka tiap tahap = rata-rata persentase seluruh produk',
              'Untuk produk TOLL OUT / IMPOR yang QA-nya sudah selesai, tahap-tahap antara dianggap selesai'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari sistem order fulfillment.',
            details: [
              'Order Fulfillment (sp_Dashboard_OF1): status penyelesaian tiap tahap (Turun PPI, Potong Stock, Proses, Kemas, Dokumen, QC, QA) per batch'
            ]
          }
        ]
      },
      
      cycletime: {
        id: 'cycletime',
        title: 'PCT - Production Cycle Time',
        icon: 'Clock',
        description: 'Production cycle time',
        pages: [
          {
            subtitle: 'Apa itu Production Cycle Time (PCT)?',
            description: 'Rata-rata waktu (hari) yang dibutuhkan untuk menyelesaikan produksi satu batch, dari awal proses hingga siap dirilis.',
            details: [
              'PCT rata-rata: makin rendah makin cepat',
              'PCT terlama: produk dengan siklus terpanjang',
              'Sumber & definisi tahap sama dengan PCT di Dashboard Produksi'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'PCT rata-rata dihitung sebagai rata-rata tertimbang berdasarkan jumlah batch, agar konsisten dengan Dashboard Produksi.',
            details: [
              'PCT rata-rata = jumlah (PCT rata-rata produk × jumlah batch) ÷ total batch',
              'PCT terlama = nilai PCT rata-rata produk tertinggi',
              'Hanya batch yang sudah selesai (lulus "Tempel Label Realese") yang dihitung'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari ringkasan PCT per produk.',
            details: [
              'Ringkasan PCT (/api/pct): PCT rata-rata & jumlah batch per produk, dari data pelacakan proses yang sama dengan Dashboard Produksi (t_alur_proses)'
            ]
          }
        ]
      },
      
      inventory: {
        id: 'inventory',
        title: 'Inventory - Kondisi Persediaan',
        icon: 'Archive',
        description: 'Kondisi persediaan',
        pages: [
          {
            subtitle: 'Apa itu Inventory (Kondisi Persediaan)?',
            description: 'Menunjukkan kesehatan persediaan barang jadi: berapa nilai stok yang lambat bergerak, mati, dan yang diretur.',
            details: [
              'Slow Moving: produk yang penjualannya lambat (stok menumpuk)',
              'Dead Stock: produk yang praktis tidak laku',
              'Return: nilai produk yang dikembalikan customer',
              'Ditampilkan dalam nilai (Rupiah) dan persentase terhadap total nilai persediaan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem menilai riwayat penjualan tiap produk terhadap forecast untuk menandai slow moving / dead stock, lalu menghitung nilainya.',
            details: [
              'Dead Stock: penjualan < 60% forecast selama 6 bulan terakhir DAN masih ada stok di awal & akhir periode',
              'Slow Moving: (bukan dead stock) penjualan < 60% forecast selama 3 bulan terakhir DAN masih ada stok',
              'Return: total (jumlah retur × harga HNA) sepanjang tahun berjalan (YTD)',
              'Persentase = nilai masing-masing ÷ total nilai persediaan bulan berjalan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari laporan penjualan, stok & retur produk.',
            details: [
              'Laporan Penjualan, Forecast & Stok Produk (sp_Dashboard_DataReportManHours): penjualan, forecast, stok (Release), retur, dan harga (HNA) per produk per periode'
            ]
          }
        ]
      }
    }
  },

  // ====================================
  // PRODUCTION DASHBOARD
  // ====================================
  production: {
    dashboardTitle: 'Dashboard Produksi',
    topics: {
      output: {
        id: 'output',
        title: 'Production Output',
        icon: 'Target',
        description: 'Target & realisasi produksi',
        pages: [
          {
            subtitle: 'Apa itu Production Output?',
            description: 'Membandingkan target produksi dengan realisasi (jumlah yang benar-benar diproduksi) selama 13 bulan terakhir, sehingga performa produksi mudah dipantau dari bulan ke bulan sekaligus dibandingkan dengan bulan yang sama tahun lalu.',
            details: [
              'Target: jumlah unit yang direncanakan untuk diproduksi pada bulan tersebut',
              'Realisasi: jumlah unit yang benar-benar selesai diproduksi, dipecah per kategori Generik, OTC, dan ETH',
              'Achievement: persentase pencapaian realisasi terhadap target',
              'Klik bar sebuah bulan untuk melihat rincian per produk',
              'Bulan berjalan bersifat sementara karena belum penuh satu bulan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Target dihitung dari forecast (perkiraan) penjualan yang diberi penyangga, lalu dikurangi stok yang sudah tersedia. Realisasi adalah penjumlahan hasil produksi tiap produk.',
            details: [
              'Target per produk = (Forecast penjualan × 1,3) − Stok yang sudah tersedia di awal bulan',
              'Faktor 1,3 adalah penyangga (buffer) 30% untuk mengantisipasi permintaan lebih',
              'Jika hasilnya negatif dianggap 0 — artinya stok sudah cukup sehingga tidak perlu produksi',
              'Target bulan = jumlah target seluruh produk pada bulan itu',
              'Realisasi = jumlah kolom Produksi seluruh produk, dikelompokkan ke Generik / OTC / ETH',
              'Achievement = Realisasi ÷ Target × 100%',
              'Contoh: Forecast 1.000, stok awal 200 → Target = (1.000 × 1,3) − 200 = 1.100 unit'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari laporan perencanaan & output produksi, digabung dengan penetapan kategori produk.',
            details: [
              'Laporan Perencanaan & Output Produksi (sp_Dashboard_DataReportManHours): menyediakan Forecast penjualan, Stok awal bulan, dan jumlah Produksi per produk per bulan',
              'Daftar & Kategori Produk (productList / otcProducts): menentukan produk masuk kategori Generik, OTC, atau ETH',
              'Periode: 13 bulan terakhir hingga bulan berjalan (agar bulan yang sama tahun lalu ikut tampil)'
            ]
          }
        ]
      },

      pct: {
        id: 'pct',
        title: 'PCT Breakdown',
        icon: 'Clock',
        description: 'Waktu proses per tahapan',
        pages: [
          {
            subtitle: 'Apa itu PCT (Production Cycle Time) Breakdown?',
            description: 'Menampilkan rata-rata waktu (dalam hari) yang dihabiskan pada tiap tahapan besar proses, dari Timbang hingga QA. Hanya batch yang sudah selesai penuh (sudah "Tempel Label Realese") yang dihitung.',
            details: [
              'Timbang: penyiapan & penimbangan bahan baku',
              'Produksi: proses inti — dari terima bahan baku hingga barang jadi dikirim (mencakup Proses, Kemas Primer, dan Kemas Sekunder)',
              'QC: pemeriksaan Quality Control',
              'Mikro: pengujian mikrobiologi',
              'QA: pelulusan/approval akhir Quality Assurance',
              'Donut chart menampilkan proporsi waktu tiap tahap — makin kecil makin cepat'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Untuk tiap batch, lama sebuah tahap = selisih hari kalender antara langkah awal dan langkah akhir tahap tersebut. Angka pada dashboard adalah rata-rata dari seluruh batch yang selesai pada periode terpilih (MTD/YTD).',
            details: [
              'Timbang: mulai "Penyiapan BB" → selesai "Pengiriman Bahan Baku"',
              'Produksi: mulai "Terima Bahan Baku" → selesai "Pengiriman Obat Jadi"',
              'QC: mulai "Pickup Sample QC" → selesai "Penyerahan Hasil Uji QC"',
              'Mikro: dari uji pertama sampai uji terakhir ("Pengujian MC" / "Pengujian Sterilitas MC")',
              'QA: mulai "Penyerahan PPI ke QA" / "Penyerahan Hasil Uji QC" → selesai "Tempel Label Realese"',
              'Memakai hari kalender (termasuk akhir pekan & libur)',
              'Periode: MTD = batch selesai bulan ini; YTD = batch selesai tahun ini'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari pelacakan langkah proses per batch, dipetakan ke kelompok tahapan.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): waktu mulai & selesai tiap langkah pada tiap batch',
              'Master Produk (m_Product): nama & informasi produk',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke kelompok tahapan',
              'Filter: hanya batch yang sudah menyelesaikan "Tempel Label Realese" pada periode terpilih; produk "Granulat" dikecualikan'
            ]
          }
        ]
      },

      wip: {
        id: 'wip',
        title: 'WIP - Active Batches',
        icon: 'Box',
        description: 'Batch dalam produksi',
        pages: [
          {
            subtitle: 'Apa itu WIP (Work In Progress)?',
            description: 'Menampilkan seluruh batch yang sedang dalam proses produksi (belum selesai dilulus/dilabeli), beserta tahapan saat ini dan lama waktunya.',
            details: [
              'Status/Tahapan: posisi batch saat ini (Timbang, Proses, Kemas Primer, Kemas Sekunder, QC, Mikro, QA)',
              'Durasi: berapa hari batch berada di tahapan saat ini',
              'Sebuah batch bisa berada di beberapa tahap sekaligus karena jendela tahap dapat tumpang tindih'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem mengambil batch yang masih aktif, menentukan tahap tiap batch dari langkah proses yang sudah/belum berjalan, lalu menghitung lama di tahap = hari kalender sejak tahap dimulai hingga hari ini.',
            details: [
              'Batch aktif = batch berstatus "Open" yang belum menyelesaikan "Tempel Label Realese" (belum dilulus & belum dibatalkan)',
              'Awal & akhir tiap tahap ditentukan dari langkah proses spesifik (contoh: Proses dimulai saat "Terima Bahan Baku"), bukan sekadar pengelompokan kasar',
              'Durasi di tahap = jumlah hari kalender dari tahap dimulai sampai hari ini',
              '"Menunggu" vs "Berjalan": jendela tahap sudah terbuka tetapi langkahnya belum dimulai = Menunggu; sudah dimulai = Berjalan',
              'Ambang warna (hijau/kuning/merah) berbeda-beda per departemen dan per tahap'
            ]
          },
          {
            subtitle: 'Batas Tiap Tahap (Kapan Mulai & Selesai)',
            description: 'Setiap tahap punya titik mulai dan selesai yang jelas, ditentukan dari langkah proses tertentu:',
            details: [
              'Timbang: mulai "Penyiapan BB" → selesai "Pengiriman Bahan Baku"',
              'Proses: mulai "Terima Bahan Baku" → selesai tepat saat Kemas Primer dimulai',
              'Kemas Primer: mulai saat semua prasyarat pengemasan primer selesai → selesai saat proses pengemasan primer selesai',
              'Kemas Sekunder: mulai saat prasyarat pengemasan sekunder selesai → selesai "Pengiriman Obat Jadi"',
              'QC: mulai "Pickup Sample QC" → selesai "Penyerahan Hasil Uji QC"',
              'Mikro: dari uji pertama hingga uji terakhir ("Pengujian MC" / "Pengujian Sterilitas MC")',
              'QA: mulai "Penyerahan PPI ke QA" / "Penyerahan Hasil Uji QC" → selesai "Tempel Label Realese"'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time berasal dari pelacakan langkah proses dan daftar batch aktif.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): langkah & waktu mulai/selesai tiap batch',
              'Kartu Batch (t_rfid_batch_card): daftar batch aktif beserta statusnya (Open/Close)',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke kelompok tahapan',
              'Master Produk (m_Product): nama & informasi produk',
              'Dikecualikan: batch yang sudah dilulus (t_dnc_product), batch yang dibatalkan (t_wip_batal), dan produk "Granulat"; rentang 12 bulan terakhir'
            ]
          }
        ]
      }
    }
  },

  // ====================================
  // LINE PN1 DASHBOARD
  // ====================================
  linepn1: {
    dashboardTitle: 'Line PN1 Dashboard',
    topics: {
      sidebar: {
        id: 'sidebar',
        title: 'Sidebar - Hide/Show Feature',
        icon: 'LayoutPanelLeft',
        description: 'Fitur hide/show sidebar',
        pages: [
          {
            subtitle: 'Sidebar bisa di Hide / Expand.',
            description: 'Di beberapa dashboard, beberapa grafik akan tersembunyi jika sidebar tidak di Hide dikarenakan keterbatasan ruang.',
            details: [
              'Klik tombol Hide (<) di tengah Sidebar untuk menyembunyikan/menampilkan sidebar',
              'Layout berubah dari 2 kolom menjadi 3 kolom saat sidebar disembunyikan',
              'Grafik WIP Summary muncul sebagai grafik ketiga saat sidebar disembunyikan',
              'Berguna saat ingin fokus melihat data produksi dengan layar lebih luas'
            ]
          }
        ]
      },
      
      output: {
        id: 'output',
        title: 'Monthly/Daily Output',
        icon: 'Target',
        description: 'Output produksi (auto-rotate)',
        pages: [
          {
            subtitle: 'Apa itu Output Chart?',
            description: 'Menampilkan output produksi Line PN1. Grafik berganti otomatis antara tampilan Bulanan (Monthly) dan Harian (Daily) untuk memberi gambaran yang lengkap.',
            details: [
              'Monthly Output: total produksi per bulan selama 12 bulan terakhir, dibandingkan target',
              'Daily Output: jumlah produksi per hari pada bulan berjalan',
              'Auto-rotate: Bar chart (Monthly) & Line chart (Daily) bergantian otomatis',
              'Hanya produk milik Line PN1 yang dihitung'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Output harian dihitung dari jumlah hasil produksi yang sudah disetujui pada hari itu; output bulanan adalah akumulasinya. Target memakai rumus berbasis forecast.',
            details: [
              'Output harian = jumlah hasil produksi seluruh produk Line PN1 yang sudah disetujui pada tanggal tersebut',
              'Hanya laporan produksi yang sudah di-approve (bukan yang ditolak) yang dihitung',
              'Output bulanan = total output seluruh hari dalam bulan itu',
              'Target bulan = jumlah (Forecast × 1,3 − stok awal bulan) tiap produk; nilai negatif dianggap 0'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari laporan hasil produksi yang sudah disetujui, digabung dengan rencana produksi.',
            details: [
              'Laporan Hasil Produksi / BPHP (t_bphp_detail, t_bphp_header, t_bphp_status): jumlah produksi harian yang sudah disetujui',
              'Laporan Perencanaan & Output Produksi (sp_Dashboard_DataReportManHours): Forecast & stok awal bulan untuk target',
              'Pemetaan Produk ke Departemen (m_product_pn_group): menentukan produk milik Line PN1'
            ]
          }
        ]
      },
      
      of1: {
        id: 'of1',
        title: 'Daily OF1',
        icon: 'Target',
        description: 'Order fulfillment harian',
        pages: [
          {
            subtitle: 'Apa itu Daily OF1?',
            description: 'Menampilkan status pemenuhan order (Order Fulfillment) batch bulan ini di Line PN1: berapa yang sudah Released, masih Quarantined, dan masih WIP, per hari.',
            details: [
              'Released (hijau): batch sudah lulus & siap dikirim',
              'Quarantined (kuning): batch dalam karantina/pemeriksaan Quality Control',
              'WIP (biru): batch masih dalam proses produksi',
              'Line chart menunjukkan tren pemenuhan order dari hari ke hari terhadap target'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem membandingkan jumlah batch yang ditargetkan bulan ini dengan yang sudah dilulus; sisanya dikelompokkan sebagai karantina atau WIP per tanggal.',
            details: [
              'Target batch bulan ini berasal dari daftar target OF1 per produk',
              'Released = batch berstatus "DILULUSKAN" pada bulan berjalan, dihitung akumulatif per hari',
              'Sisa target yang belum lulus dipetakan ke Quarantined (sudah di QC) atau WIP (masih diproses)',
              'Hanya batch milik Line PN1'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time dari sistem order fulfillment yang melacak status setiap batch per hari.',
            details: [
              'Target Order Fulfillment (r_target_of1_dashboard): target & release per produk per periode',
              'Ringkasan Order Fulfillment (sp_Dashboard_OF1): daftar batch target bulan berjalan',
              'Catatan Pelulusan Batch (t_dnc_product): batch berstatus "DILULUSKAN"'
            ]
          }
        ]
      },
      
      wip: {
        id: 'wip',
        title: 'WIP - Batch Progress',
        icon: 'Box',
        description: 'Progress batch dalam produksi',
        pages: [
          {
            subtitle: 'Apa itu WIP Section?',
            description: 'Menampilkan seluruh batch yang sedang diproses di Line PN1. Speedometer menunjukkan jumlah batch aktif per tahapan, dan tabel di bawahnya memuat detail tiap batch.',
            details: [
              'Speedometer: jumlah batch aktif di tiap tahapan (Timbang, Proses, Kemas Primer, Kemas Sekunder, QC, Mikro, QA)',
              'Tabel Batch: nama produk, tahapan saat ini, dan durasi tiap batch',
              'Klik batch untuk melihat timeline detail prosesnya',
              'Sebuah batch bisa berada di beberapa tahap sekaligus karena jendela tahap dapat tumpang tindih'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem mengambil batch aktif Line PN1, menentukan tahap tiap batch dari langkah proses yang sudah/belum berjalan, lalu menghitung lama di tahap = hari kalender sejak tahap dimulai hingga hari ini.',
            details: [
              'Batch aktif = batch berstatus "Open" yang belum menyelesaikan "Tempel Label Realese"',
              'Awal & akhir tiap tahap ditentukan dari langkah proses spesifik (mis. Proses dimulai saat "Terima Bahan Baku")',
              'Durasi di tahap = jumlah hari kalender dari tahap dimulai sampai hari ini',
              '"Menunggu" vs "Berjalan": jendela tahap terbuka tetapi langkahnya belum dimulai = Menunggu; sudah dimulai = Berjalan',
              'Hanya batch milik Line PN1'
            ]
          },
          {
            subtitle: 'Batas Tiap Tahap (Kapan Mulai & Selesai)',
            description: 'Setiap tahap punya titik mulai dan selesai yang jelas, ditentukan dari langkah proses tertentu:',
            details: [
              'Timbang: mulai "Penyiapan BB" → selesai "Pengiriman Bahan Baku"',
              'Proses: mulai "Terima Bahan Baku" → selesai tepat saat Kemas Primer dimulai',
              'Kemas Primer: mulai saat semua prasyarat pengemasan primer selesai → selesai saat proses pengemasan primer selesai',
              'Kemas Sekunder: mulai saat prasyarat pengemasan sekunder selesai → selesai "Pengiriman Obat Jadi"',
              'QC: mulai "Pickup Sample QC" → selesai "Penyerahan Hasil Uji QC"',
              'Mikro: dari uji pertama hingga uji terakhir ("Pengujian MC" / "Pengujian Sterilitas MC")',
              'QA: mulai "Penyerahan PPI ke QA" / "Penyerahan Hasil Uji QC" → selesai "Tempel Label Realese"'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time berasal dari pelacakan langkah proses dan daftar batch aktif.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): langkah & waktu mulai/selesai tiap batch',
              'Kartu Batch (t_rfid_batch_card): daftar batch aktif beserta statusnya (Open/Close)',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke kelompok tahapan',
              'Pemetaan Produk ke Departemen (m_product_pn_group): memfilter batch milik Line PN1',
              'Dikecualikan: batch yang sudah dilulus (t_dnc_product), dibatalkan (t_wip_batal), dan produk "Granulat"'
            ]
          }
        ]
      },
      
      wipsummary: {
        id: 'wipsummary',
        title: 'WIP Summary',
        icon: 'Archive',
        description: 'Ringkasan WIP per tahapan',
        pages: [
          {
            subtitle: 'Apa itu WIP Summary?',
            description: 'Donut chart yang menampilkan sebaran batch aktif Line PN1 per tahapan produksi. Hanya muncul saat sidebar disembunyikan, untuk overview cepat.',
            details: [
              'Menampilkan jumlah batch di tiap tahapan (Timbang, Proses, Kemas Primer, Kemas Sekunder, QC, Mikro, QA)',
              'Membantu melihat di tahap mana batch paling banyak berada',
              '💡 Grafik ini hanya terlihat saat sidebar disembunyikan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Menggunakan data WIP yang sama dengan tabel batch; tiap batch aktif dihitung ke tahapan tempat ia sedang berada.',
            details: [
              'Sumber & aturan penentuan tahapan sama persis dengan bagian WIP di atas',
              'Satu batch dapat terhitung di lebih dari satu tahap bila jendela tahapnya tumpang tindih',
              'Hanya batch aktif milik Line PN1'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Sama dengan bagian WIP: pelacakan langkah proses per batch.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): langkah & waktu tiap batch',
              'Kartu Batch (t_rfid_batch_card): daftar batch aktif',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke tahapan'
            ]
          }
        ]
      }
    }
  },

  // ====================================
  // LINE PN2 DASHBOARD
  // ====================================
  linepn2: {
    dashboardTitle: 'Line PN2 Dashboard',
    topics: {
      sidebar: {
        id: 'sidebar',
        title: 'Sidebar - Hide/Show Feature',
        icon: 'LayoutPanelLeft',
        description: 'Fitur hide/show sidebar',
        pages: [
          {
            subtitle: 'Sidebar bisa di Hide / Expand.',
            description: 'Di beberapa dashboard, beberapa grafik akan tersembunyi jika sidebar tidak di Hide dikarenakan keterbatasan ruang.',
            details: [
              'Klik tombol Hide (<) di tengah Sidebar untuk menyembunyikan/menampilkan sidebar',
              'Layout berubah dari 2 kolom menjadi 3 kolom saat sidebar disembunyikan',
              'Grafik WIP Summary muncul sebagai grafik ketiga saat sidebar disembunyikan',
              'Berguna saat ingin fokus melihat data produksi dengan layar lebih luas'
            ]
          }
        ]
      },
      
      output: {
        id: 'output',
        title: 'Monthly/Daily Output',
        icon: 'Target',
        description: 'Output produksi (auto-rotate)',
        pages: [
          {
            subtitle: 'Apa itu Output Chart?',
            description: 'Menampilkan output produksi Line PN2. Grafik berganti otomatis antara tampilan Bulanan (Monthly) dan Harian (Daily) untuk memberi gambaran yang lengkap.',
            details: [
              'Monthly Output: total produksi per bulan selama 12 bulan terakhir, dibandingkan target',
              'Daily Output: jumlah produksi per hari pada bulan berjalan',
              'Auto-rotate: Bar chart (Monthly) & Line chart (Daily) bergantian otomatis',
              'Hanya produk milik Line PN2 yang dihitung'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Output harian dihitung dari jumlah hasil produksi yang sudah disetujui pada hari itu; output bulanan adalah akumulasinya. Target memakai rumus berbasis forecast.',
            details: [
              'Output harian = jumlah hasil produksi seluruh produk Line PN2 yang sudah disetujui pada tanggal tersebut',
              'Hanya laporan produksi yang sudah di-approve (bukan yang ditolak) yang dihitung',
              'Output bulanan = total output seluruh hari dalam bulan itu',
              'Target bulan = jumlah (Forecast × 1,3 − stok awal bulan) tiap produk; nilai negatif dianggap 0'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari laporan hasil produksi yang sudah disetujui, digabung dengan rencana produksi.',
            details: [
              'Laporan Hasil Produksi / BPHP (t_bphp_detail, t_bphp_header, t_bphp_status): jumlah produksi harian yang sudah disetujui',
              'Laporan Perencanaan & Output Produksi (sp_Dashboard_DataReportManHours): Forecast & stok awal bulan untuk target',
              'Pemetaan Produk ke Departemen (m_product_pn_group): menentukan produk milik Line PN2'
            ]
          }
        ]
      },
      
      of1: {
        id: 'of1',
        title: 'Daily OF1',
        icon: 'Target',
        description: 'Order fulfillment harian',
        pages: [
          {
            subtitle: 'Apa itu Daily OF1?',
            description: 'Menampilkan status pemenuhan order (Order Fulfillment) batch bulan ini di Line PN2: berapa yang sudah Released, masih Quarantined, dan masih WIP, per hari.',
            details: [
              'Released (hijau): batch sudah lulus & siap dikirim',
              'Quarantined (kuning): batch dalam karantina/pemeriksaan Quality Control',
              'WIP (biru): batch masih dalam proses produksi',
              'Line chart menunjukkan tren pemenuhan order dari hari ke hari terhadap target'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem membandingkan jumlah batch yang ditargetkan bulan ini dengan yang sudah dilulus; sisanya dikelompokkan sebagai karantina atau WIP per tanggal.',
            details: [
              'Target batch bulan ini berasal dari daftar target OF1 per produk',
              'Released = batch berstatus "DILULUSKAN" pada bulan berjalan, dihitung akumulatif per hari',
              'Sisa target yang belum lulus dipetakan ke Quarantined (sudah di QC) atau WIP (masih diproses)',
              'Hanya batch milik Line PN2'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time dari sistem order fulfillment yang melacak status setiap batch per hari.',
            details: [
              'Target Order Fulfillment (r_target_of1_dashboard): target & release per produk per periode',
              'Ringkasan Order Fulfillment (sp_Dashboard_OF1): daftar batch target bulan berjalan',
              'Catatan Pelulusan Batch (t_dnc_product): batch berstatus "DILULUSKAN"'
            ]
          }
        ]
      },
      
      wip: {
        id: 'wip',
        title: 'WIP - Batch Progress',
        icon: 'Box',
        description: 'Progress batch dalam produksi',
        pages: [
          {
            subtitle: 'Apa itu WIP Section?',
            description: 'Menampilkan seluruh batch yang sedang diproses di Line PN2. Speedometer menunjukkan jumlah batch aktif per tahapan, dan tabel di bawahnya memuat detail tiap batch.',
            details: [
              'Speedometer: jumlah batch aktif di tiap tahapan (Timbang, Proses, Kemas Primer, Kemas Sekunder, QC, Mikro, QA)',
              'Tabel Batch: nama produk, tahapan saat ini, dan durasi tiap batch',
              'Klik batch untuk melihat timeline detail prosesnya',
              'Sebuah batch bisa berada di beberapa tahap sekaligus karena jendela tahap dapat tumpang tindih'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem mengambil batch aktif Line PN2, menentukan tahap tiap batch dari langkah proses yang sudah/belum berjalan, lalu menghitung lama di tahap = hari kalender sejak tahap dimulai hingga hari ini.',
            details: [
              'Batch aktif = batch berstatus "Open" yang belum menyelesaikan "Tempel Label Realese"',
              'Awal & akhir tiap tahap ditentukan dari langkah proses spesifik (mis. Proses dimulai saat "Terima Bahan Baku")',
              'Durasi di tahap = jumlah hari kalender dari tahap dimulai sampai hari ini',
              '"Menunggu" vs "Berjalan": jendela tahap terbuka tetapi langkahnya belum dimulai = Menunggu; sudah dimulai = Berjalan',
              'Hanya batch milik Line PN2'
            ]
          },
          {
            subtitle: 'Batas Tiap Tahap (Kapan Mulai & Selesai)',
            description: 'Setiap tahap punya titik mulai dan selesai yang jelas, ditentukan dari langkah proses tertentu:',
            details: [
              'Timbang: mulai "Penyiapan BB" → selesai "Pengiriman Bahan Baku"',
              'Proses: mulai "Terima Bahan Baku" → selesai tepat saat Kemas Primer dimulai',
              'Kemas Primer: mulai saat semua prasyarat pengemasan primer selesai → selesai saat proses pengemasan primer selesai',
              'Kemas Sekunder: mulai saat prasyarat pengemasan sekunder selesai → selesai "Pengiriman Obat Jadi"',
              'QC: mulai "Pickup Sample QC" → selesai "Penyerahan Hasil Uji QC"',
              'Mikro: dari uji pertama hingga uji terakhir ("Pengujian MC" / "Pengujian Sterilitas MC")',
              'QA: mulai "Penyerahan PPI ke QA" / "Penyerahan Hasil Uji QC" → selesai "Tempel Label Realese"'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time berasal dari pelacakan langkah proses dan daftar batch aktif.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): langkah & waktu mulai/selesai tiap batch',
              'Kartu Batch (t_rfid_batch_card): daftar batch aktif beserta statusnya (Open/Close)',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke kelompok tahapan',
              'Pemetaan Produk ke Departemen (m_product_pn_group): memfilter batch milik Line PN2',
              'Dikecualikan: batch yang sudah dilulus (t_dnc_product), dibatalkan (t_wip_batal), dan produk "Granulat"'
            ]
          }
        ]
      },
      
      wipsummary: {
        id: 'wipsummary',
        title: 'WIP Summary',
        icon: 'Archive',
        description: 'Ringkasan WIP per tahapan',
        pages: [
          {
            subtitle: 'Apa itu WIP Summary?',
            description: 'Donut chart yang menampilkan sebaran batch aktif Line PN2 per tahapan produksi. Hanya muncul saat sidebar disembunyikan, untuk overview cepat.',
            details: [
              'Menampilkan jumlah batch di tiap tahapan (Timbang, Proses, Kemas Primer, Kemas Sekunder, QC, Mikro, QA)',
              'Membantu melihat di tahap mana batch paling banyak berada',
              '💡 Grafik ini hanya terlihat saat sidebar disembunyikan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Menggunakan data WIP yang sama dengan tabel batch; tiap batch aktif dihitung ke tahapan tempat ia sedang berada.',
            details: [
              'Sumber & aturan penentuan tahapan sama persis dengan bagian WIP di atas',
              'Satu batch dapat terhitung di lebih dari satu tahap bila jendela tahapnya tumpang tindih',
              'Hanya batch aktif milik Line PN2'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Sama dengan bagian WIP: pelacakan langkah proses per batch.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): langkah & waktu tiap batch',
              'Kartu Batch (t_rfid_batch_card): daftar batch aktif',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke tahapan'
            ]
          }
        ]
      }
    }
  },

  // ====================================
  // QUALITY DASHBOARD
  // ====================================
  quality: {
    dashboardTitle: 'Dashboard Quality',
    topics: {
      sidebar: {
        id: 'sidebar',
        title: 'Sidebar - Hide/Show Feature',
        icon: 'LayoutPanelLeft',
        description: 'Fitur hide/show sidebar',
        pages: [
          {
            subtitle: 'Sidebar bisa di Hide / Expand.',
            description: 'Di beberapa dashboard, beberapa grafik akan tersembunyi jika sidebar tidak di Hide dikarenakan keterbatasan ruang.',
            details: [
              'Klik tombol Hide (<) di tengah Sidebar untuk menyembunyikan/menampilkan sidebar',
              'Layout berubah dari 2 kolom menjadi 3 kolom saat sidebar disembunyikan',
              'Grafik Daily OF1 muncul sebagai grafik ketiga saat sidebar disembunyikan',
              'Berguna saat ingin fokus melihat data quality control dengan layar lebih luas'
            ]
          }
        ]
      },
      
      released: {
        id: 'released',
        title: 'Daily/Monthly Released',
        icon: 'Target',
        description: 'Batch yang di-release (auto-rotate)',
        pages: [
          {
            subtitle: 'Apa itu Released Chart?',
            description: 'Menampilkan jumlah batch yang telah di-release (lulus QC). Grafik berganti otomatis antara tampilan Bulanan (Monthly) dan Harian (Daily).',
            details: [
              'Monthly Released: total batch yang di-release per bulan sepanjang tahun berjalan (YTD)',
              'Daily Released: batch yang di-release per hari pada bulan berjalan (MTD)',
              'Released = batch yang sudah lulus Quality Control dan siap dikirim',
              'Auto-rotate: Bar chart (Monthly) & Line chart (Daily) bergantian otomatis'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Dihitung dari jumlah batch yang berstatus "DILULUSKAN", berdasarkan tanggal pelulusannya.',
            details: [
              'Released = batch dengan status "DILULUSKAN" (lulus QC)',
              'Daily = jumlah batch dilulus per tanggal pada bulan berjalan',
              'Monthly = jumlah batch dilulus per bulan sepanjang tahun berjalan',
              'Tanggal acuan adalah tanggal proses pelulusan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan pelulusan batch oleh Quality Control.',
            details: [
              'Catatan Pelulusan Batch (t_dnc_product): batch berstatus "DILULUSKAN" beserta tanggal pelulusannya'
            ]
          }
        ]
      },
      
      leadtime: {
        id: 'leadtime',
        title: 'Lead Time QC/Mikro',
        icon: 'Clock',
        description: 'Waktu proses QC & Mikro',
        pages: [
          {
            subtitle: 'Apa itu Lead Time?',
            description: 'Rata-rata waktu (dalam hari) yang dibutuhkan untuk menyelesaikan proses Quality Control (QC) atau Mikrobiologi (Mikro). Grafik berganti otomatis antara QC dan Mikro.',
            details: [
              'Lead Time QC: lama pemeriksaan Quality Control per batch',
              'Lead Time Mikro: lama pengujian mikrobiologi per batch',
              'Line chart menampilkan tren lead time dari hari ke hari',
              'Makin rendah lead time, makin cepat batch bisa di-release'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Untuk tiap batch, lead time sebuah tahap = selisih hari kalender dari langkah pertama mulai hingga langkah terakhir tahap itu selesai. Hanya batch yang seluruh langkah tahapnya sudah selesai yang dihitung, lalu dirata-ratakan per tanggal penyelesaian.',
            details: [
              'Lead time = hari kalender dari awal tahap (langkah pertama mulai) sampai tahap selesai (langkah terakhir selesai)',
              'QC mencakup seluruh langkah kelompok QC; Mikro mencakup seluruh langkah kelompok Mikro',
              'Hanya dihitung bila SEMUA langkah pada tahap tersebut sudah selesai',
              'Dikelompokkan berdasarkan tanggal penyelesaian; periode MTD (bulan ini) atau YTD (tahun ini)'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari pelacakan langkah proses QC & Mikro per batch.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): waktu mulai & selesai tiap langkah QC/Mikro',
              'Master Kelompok Tahapan (m_tahapan_group): menandai langkah sebagai QC atau Mikro',
              'Master Produk (m_Product): nama & informasi produk'
            ]
          }
        ]
      },
      
      of1: {
        id: 'of1',
        title: 'Daily OF1',
        icon: 'Target',
        description: 'Order fulfillment harian',
        pages: [
          {
            subtitle: 'Apa itu Daily OF1?',
            description: 'Menampilkan status pemenuhan order (Order Fulfillment) batch bulan ini dari sisi Quality: Released, Quarantined, dan WIP per hari. Hanya muncul saat sidebar disembunyikan.',
            details: [
              'Released (hijau): batch sudah lulus QC & siap dikirim',
              'Quarantined (kuning): batch dalam karantina/pemeriksaan Quality Control',
              'WIP (biru): batch masih dalam proses produksi',
              '💡 Grafik ini hanya terlihat saat sidebar disembunyikan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem membandingkan jumlah batch yang ditargetkan bulan ini dengan yang sudah dilulus; sisanya dikelompokkan sebagai karantina atau WIP per tanggal.',
            details: [
              'Target batch bulan ini berasal dari daftar target OF1 per produk',
              'Released = batch berstatus "DILULUSKAN" pada bulan berjalan, dihitung akumulatif per hari',
              'Sisa target yang belum lulus dipetakan ke Quarantined (sudah di QC) atau WIP (masih diproses)'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time dari sistem order fulfillment yang melacak status setiap batch per hari.',
            details: [
              'Target Order Fulfillment (r_target_of1_dashboard): target & release per produk per periode',
              'Ringkasan Order Fulfillment (sp_Dashboard_OF1): daftar batch target bulan berjalan',
              'Catatan Pelulusan Batch (t_dnc_product): batch berstatus "DILULUSKAN"'
            ]
          }
        ]
      },
      
      wip: {
        id: 'wip',
        title: 'WIP - Batch Progress',
        icon: 'Box',
        description: 'Progress batch dalam QC',
        pages: [
          {
            subtitle: 'Apa itu WIP Section?',
            description: 'Menampilkan seluruh batch yang sedang dalam proses, dilihat dari sisi Quality. Speedometer menampilkan jumlah batch aktif per tahapan, dan tabel di bawahnya memuat detail tiap batch.',
            details: [
              'Speedometer: jumlah batch aktif per tahapan (dengan fokus pada QC, Mikro, dan QA)',
              'Tabel Batch: nama produk, tahapan saat ini, dan durasi tiap batch',
              'Klik batch untuk melihat timeline detail prosesnya',
              'Sebuah batch bisa berada di beberapa tahap sekaligus karena jendela tahap dapat tumpang tindih'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Sistem mengambil batch aktif, menentukan tahap tiap batch dari langkah proses yang sudah/belum berjalan, lalu menghitung lama di tahap = hari kalender sejak tahap dimulai hingga hari ini.',
            details: [
              'Batch aktif = batch berstatus "Open" yang belum menyelesaikan "Tempel Label Realese"',
              'Awal & akhir tiap tahap ditentukan dari langkah proses spesifik (mis. QC dimulai saat "Pickup Sample QC")',
              'Durasi di tahap = jumlah hari kalender dari tahap dimulai sampai hari ini',
              '"Menunggu" vs "Berjalan": jendela tahap terbuka tetapi langkahnya belum dimulai = Menunggu; sudah dimulai = Berjalan'
            ]
          },
          {
            subtitle: 'Batas Tiap Tahap (Kapan Mulai & Selesai)',
            description: 'Setiap tahap punya titik mulai dan selesai yang jelas, ditentukan dari langkah proses tertentu:',
            details: [
              'Timbang: mulai "Penyiapan BB" → selesai "Pengiriman Bahan Baku"',
              'Proses: mulai "Terima Bahan Baku" → selesai tepat saat Kemas Primer dimulai',
              'Kemas Primer: mulai saat semua prasyarat pengemasan primer selesai → selesai saat proses pengemasan primer selesai',
              'Kemas Sekunder: mulai saat prasyarat pengemasan sekunder selesai → selesai "Pengiriman Obat Jadi"',
              'QC: mulai "Pickup Sample QC" → selesai "Penyerahan Hasil Uji QC"',
              'Mikro: dari uji pertama hingga uji terakhir ("Pengujian MC" / "Pengujian Sterilitas MC")',
              'QA: mulai "Penyerahan PPI ke QA" / "Penyerahan Hasil Uji QC" → selesai "Tempel Label Realese"'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data real-time berasal dari pelacakan langkah proses dan daftar batch aktif.',
            details: [
              'Pelacakan Proses Produksi (t_alur_proses): langkah & waktu mulai/selesai tiap batch',
              'Kartu Batch (t_rfid_batch_card): daftar batch aktif beserta statusnya (Open/Close)',
              'Master Kelompok Tahapan (m_tahapan_group): pemetaan langkah ke kelompok tahapan',
              'Master Produk (m_Product): nama & informasi produk',
              'Dikecualikan: batch yang sudah dilulus (t_dnc_product), dibatalkan (t_wip_batal), dan produk "Granulat"'
            ]
          }
        ]
      }
    }
  },

  // ====================================
  // QUALITY CONTROL (QC) DASHBOARD
  // Covers both scopes of the dashboard: Material (BB/BK) and Finished Goods.
  // ====================================
  qc: {
    dashboardTitle: 'Quality Control Dashboard',
    topics: {
      kpi: {
        id: 'kpi',
        title: 'Ringkasan QC (BB & BK)',
        icon: 'Target',
        description: 'Kartu ringkasan QC material',
        pages: [
          {
            subtitle: 'Apa itu Kartu Ringkasan QC?',
            description: 'Delapan kartu di atas merangkum kondisi QC material, dipisah antara Bahan Baku (BB) dan Bahan Kemas (BK).',
            details: [
              'In Progress: jumlah material yang masih dalam proses QC (belum selesai)',
              'Leadtime: rata-rata lama proses QC (hari) untuk periode terpilih',
              'Released: jumlah material yang selesai/diluluskan pada periode',
              'Reject Rate: persentase jumlah yang ditolak',
              'Klik kartu untuk melihat rincian datanya'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Angka dihitung dari catatan QC material pada periode terpilih, dipisah per tipe (BB/BK).',
            details: [
              'In Progress = material yang tanggal selesainya masih kosong (belum dilabeli/dilulus)',
              'Leadtime = rata-rata selisih hari dari tanggal masuk QC hingga tanggal selesai',
              'Released = jumlah material yang selesai pada periode',
              'Reject Rate = jumlah reject ÷ (jumlah release + reject) × 100%'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan QC material.',
            details: [
              'Catatan QC Material (t_dnc_manufacturing): tanggal masuk QC, tanggal selesai, qty release & reject per item',
              'Master Item Material (m_item_manufacturing): tipe material (BB/BK) dan nama item'
            ]
          }
        ]
      },

      leadtime: {
        id: 'leadtime',
        title: 'Leadtime 12 Bulan',
        icon: 'Clock',
        description: 'Rata-rata turnaround QC per bulan',
        pages: [
          {
            subtitle: 'Apa itu Leadtime 12 Months?',
            description: 'Menampilkan rata-rata waktu proses QC (turnaround) per bulan selama 12 bulan terakhir, membandingkan BB dan BK.',
            details: [
              'Sumbu tegak = rata-rata hari QC; batang per bulan',
              'BB dan BK ditampilkan berdampingan',
              'Makin rendah makin cepat material lolos QC'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Untuk tiap material yang selesai, dihitung lama QC-nya, lalu dirata-rata per bulan penyelesaian dan per tipe.',
            details: [
              'Leadtime per material = selisih hari dari tanggal masuk QC sampai tanggal selesai',
              'Angka bulanan = rata-rata leadtime seluruh material yang selesai pada bulan itu',
              'Dikelompokkan berdasarkan bulan penyelesaian dan tipe (BB/BK)'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan QC material.',
            details: [
              'Catatan QC Material (t_dnc_manufacturing): tanggal masuk & tanggal selesai QC',
              'Master Item Material (m_item_manufacturing): tipe material (BB/BK)'
            ]
          }
        ]
      },

      dailyflow: {
        id: 'dailyflow',
        title: 'Daily QC Flow',
        icon: 'Box',
        description: 'Material masuk vs selesai per hari',
        pages: [
          {
            subtitle: 'Apa itu Daily QC Flow?',
            description: 'Membandingkan jumlah material yang MASUK QC dengan yang SELESAI QC per hari pada periode terpilih. Grafik dapat berganti otomatis (Auto) atau manual antara BB dan BK.',
            details: [
              'Masuk: material yang mulai QC pada hari itu',
              'Selesai: material yang lolos/selesai QC pada hari itu',
              'Tab BB/BK untuk memilih tipe; mode Auto memutar otomatis'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Dihitung dari jumlah catatan QC per hari, dipisah masuk dan selesai, untuk periode terpilih.',
            details: [
              'Masuk = jumlah material dengan tanggal masuk QC pada hari tersebut',
              'Selesai = jumlah material dengan tanggal selesai pada hari tersebut',
              'Dihitung terpisah untuk BB dan BK'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan QC material.',
            details: [
              'Catatan QC Material (t_dnc_manufacturing): tanggal masuk & tanggal selesai QC per item',
              'Master Item Material (m_item_manufacturing): tipe material (BB/BK)'
            ]
          }
        ]
      },

      monthly: {
        id: 'monthly',
        title: 'Monthly QC Trend',
        icon: 'Archive',
        description: 'Tren volume, rilis & reject 13 bulan',
        pages: [
          {
            subtitle: 'Apa itu Monthly QC Trend?',
            description: 'Tren 13 bulan terakhir untuk volume material, jumlah rilis, dan reject rate — dapat difilter All / BB / BK.',
            details: [
              'Volume: total material yang masuk QC per bulan',
              'Release: jumlah yang diluluskan',
              'Reject rate: persentase penolakan per bulan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Data dikelompokkan per bulan masuk QC selama 13 bulan terakhir, dipisah tipe bila difilter.',
            details: [
              'Volume = jumlah material yang masuk QC pada bulan itu',
              'Reject rate = jumlah reject ÷ (release + reject) × 100%',
              'Filter All / BB / BK memilih tipe material yang ditampilkan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan QC material.',
            details: [
              'Catatan QC Material (t_dnc_manufacturing): tanggal masuk, qty release & reject',
              'Master Item Material (m_item_manufacturing): tipe material (BB/BK)'
            ]
          }
        ]
      },

      aging: {
        id: 'aging',
        title: 'QC Aging Distribution',
        icon: 'AlertCircle',
        description: 'Sebaran umur proses QC',
        pages: [
          {
            subtitle: 'Apa itu QC Aging Distribution?',
            description: 'Menunjukkan sebaran umur proses QC (berapa lama material berada di QC), dipisah BB dan BK, dalam kelompok 0-3, 4-7, 8-14, 15-30, dan 30+ hari.',
            details: [
              'Tiap donut menampilkan proporsi material per rentang umur',
              'Mode Month: material yang selesai pada bulan terpilih',
              'Mode YTD: 13 bulan terakhir',
              'Makin banyak di 30+ hari, makin banyak yang lama di QC'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Umur QC tiap material dihitung dalam hari, lalu dikelompokkan ke rentang umur.',
            details: [
              'Umur QC = selisih hari dari tanggal masuk QC sampai tanggal selesai',
              'Dikelompokkan: 0-3, 4-7, 8-14, 15-30, dan 30+ hari',
              'Month = material selesai pada bulan terpilih; YTD = 13 bulan terakhir',
              'Dipisah per tipe (BB/BK)'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan QC material.',
            details: [
              'Catatan QC Material (t_dnc_manufacturing): tanggal masuk & tanggal selesai QC',
              'Master Item Material (m_item_manufacturing): tipe material (BB/BK)'
            ]
          }
        ]
      },

      tables: {
        id: 'tables',
        title: 'Tabel Detail QC',
        icon: 'Package',
        description: 'Daftar rinci material QC',
        pages: [
          {
            subtitle: 'Apa itu Tabel Detail?',
            description: 'Menampilkan daftar rinci material QC. Tab "In Process" = yang masih di QC; tab "Period" = yang masuk QC pada periode terpilih. Dapat difilter All / BB / BK.',
            details: [
              'In Process: material yang belum selesai QC, dengan lama hari di QC',
              'Period: seluruh material yang masuk QC pada bulan terpilih, dengan turnaround',
              'Klik baris untuk melihat detail; kolom bisa diurutkan'
            ]
          },
          {
            subtitle: 'Bagaimana Cara Menghitungnya?',
            description: 'Data diambil langsung dari catatan QC, disaring berdasarkan status dan periode.',
            details: [
              'In Process = material dengan tanggal selesai masih kosong; "Days In QC" = hari dari masuk sampai hari ini',
              'Period = material dengan tanggal masuk pada bulan terpilih; "Turnaround" = hari dari masuk sampai selesai',
              'Filter BB/BK menyaring berdasarkan tipe material'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data berasal dari catatan QC material.',
            details: [
              'Material sedang QC & per periode (getQCInProcess / getQCByPeriod), dari Catatan QC Material (t_dnc_manufacturing)',
              'Master Item Material (m_item_manufacturing): nama & tipe item'
            ]
          }
        ]
      }
    }
  }
};

/**
 * Helper function to get help content for a specific dashboard
 * @param {string} dashboardType - The type of dashboard ('summary', 'production', 'quality', etc.)
 * @returns {object} The help content for that dashboard
 */
export const getHelpContentForDashboard = (dashboardType) => {
  return helpContent[dashboardType] || null;
};

/**
 * Helper function to get a specific topic's content
 * @param {string} dashboardType - The type of dashboard
 * @param {string} topicId - The ID of the topic
 * @returns {object} The topic content
 */
export const getTopicContent = (dashboardType, topicId) => {
  const dashboardContent = helpContent[dashboardType];
  if (!dashboardContent || !dashboardContent.topics) return null;
  return dashboardContent.topics[topicId] || null;
};

/**
 * Helper function to get all topic IDs for a dashboard
 * @param {string} dashboardType - The type of dashboard
 * @returns {array} Array of topic IDs
 */
export const getTopicIds = (dashboardType) => {
  const dashboardContent = helpContent[dashboardType];
  if (!dashboardContent || !dashboardContent.topics) return [];
  return Object.keys(dashboardContent.topics);
};
