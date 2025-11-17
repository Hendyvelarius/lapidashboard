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
            subtitle: 'Apa itu Target Penjualan?',
            description: 'Bagian ini menampilkan target penjualan dan pencapaian aktual perusahaan. Data ini membantu Anda memahami seberapa baik performa penjualan dibandingkan dengan target yang ditetapkan.',
            details: [
              'Target bulanan: Jumlah yang harus dicapai dalam bulan ini',
              'Pencapaian MTD (Month To Date): Total yang sudah terjual sampai hari ini',
              'Persentase: Seberapa besar pencapaian dibanding target',
              'Warna hijau = target tercapai, kuning = perlu ditingkatkan, merah = jauh dari target'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data target penjualan diambil dari sistem perencanaan penjualan (forecast) yang dibuat oleh tim Marketing dan Sales. Data pencapaian aktual berasal dari laporan penjualan harian.',
            details: [
              'Target Bulanan: Jumlah yang harus dicapai dalam bulan ini',
              'Pencapaian MTD: Total yang sudah terjual sampai hari ini',
              'Persentase pencapaian dibandingkan dengan target'
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
            subtitle: 'Apa itu Coverage Stock?',
            description: 'Coverage menunjukkan berapa lama stok barang jadi yang ada saat ini bisa memenuhi kebutuhan penjualan. Dihitung dalam satuan hari.',
            details: [
              'Coverage (hari): Berapa hari stok saat ini bisa mencukupi penjualan',
              'Under Coverage: Produk dengan stok kurang (di bawah 30 hari) - perlu produksi segera',
              'On Target: Produk dengan stok ideal (30-60 hari)',
              'Over Coverage: Produk dengan stok berlebih (lebih dari 60 hari) - hindari produksi berlebihan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data stok barang jadi diambil dari sistem gudang. Coverage dihitung berdasarkan rata-rata penjualan harian dari 30 hari terakhir.',
            details: [
              'Coverage (hari): Berapa lama stok bisa mencukupi penjualan',
              'Under Coverage: Produk dengan stok kurang dari 30 hari',
              'Over Coverage: Produk dengan stok lebih dari 60 hari'
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
            description: 'OTA mengukur seberapa tepat waktu kedatangan material dari supplier. Ini penting karena keterlambatan material bisa menghambat jadwal produksi.',
            details: [
              'Early (Lebih Awal): Material datang lebih cepat dari jadwal',
              'On Time (Tepat Waktu): Material datang sesuai jadwal - INI YANG PALING IDEAL',
              'Late (Terlambat): Material datang lebih lambat dari jadwal - INI YANG HARUS DIHINDARI',
              '% Not Late: Persentase kedatangan yang tidak terlambat (Early + On Time) - Target ideal: minimal 95%'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem penerimaan barang (BBBK) yang mencatat tanggal janji supplier dan tanggal kedatangan aktual material.',
            details: [
              'Early: Material datang lebih cepat',
              'On Time: Material datang tepat waktu',
              'Late: Material terlambat - ini yang harus dihindari'
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
            subtitle: 'Apa itu WIP?',
            description: 'WIP (Work In Progress) adalah batch produk yang sedang dalam proses produksi di berbagai tahapan. Membantu memantau berapa banyak batch yang sedang dikerjakan.',
            details: [
              'Total WIP: Jumlah batch yang sedang dalam proses',
              'Status per tahapan: Penyediaan, Produksi, Packaging, dll',
              'Durasi: Berapa lama batch sudah dalam proses',
              'Target ideal: WIP tidak menumpuk terlalu banyak di satu tahapan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem produksi yang melacak batch yang sedang dalam proses produksi di berbagai tahapan.',
            details: [
              'Total WIP: Jumlah batch yang sedang dalam proses',
              'Status per tahapan: Penyediaan, Produksi, Packaging, dll',
              'Durasi: Berapa lama batch sudah dalam proses'
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
            description: 'Stock Out adalah kondisi dimana produk tertentu benar-benar habis (stok = 0) sehingga permintaan customer tidak bisa dipenuhi. Ini mengakibatkan kehilangan penjualan (lost sales).',
            details: [
              'Jumlah SKU Stock Out: Berapa banyak jenis produk yang habis stoknya',
              'Lost Sales: Total penjualan yang hilang karena tidak ada stok (dalam rupiah)',
              'Fokus vs Non-Fokus: Produk fokus adalah produk utama/prioritas tinggi',
              '⚠️ Catatan: Sistem hanya menghitung lost sales untuk produk yang BENAR-BENAR kosong (Release = 0)'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem gudang (produk dengan stok = 0) dan sistem penjualan (permintaan yang tidak terpenuhi). Hanya menghitung lost sales untuk produk yang benar-benar kosong.',
            details: [
              'Jumlah SKU: Berapa banyak jenis produk yang habis',
              'Lost Sales: Potensi penjualan yang hilang (Rupiah)',
              'Fokus vs Non-Fokus: Prioritas produk'
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
            description: 'Bagian ini menunjukkan status bahan baku (material) yang diperlukan untuk produksi. Memastikan bahan baku cukup agar produksi tidak terhambat.',
            details: [
              'Available: Persentase bahan baku yang sudah tersedia dan siap digunakan',
              'On Progress: Persentase bahan baku yang sedang dalam proses pengiriman',
              'Not Available: Persentase bahan baku yang belum ada sama sekali - ini yang perlu diperhatikan!',
              'Target ideal: Available minimal 80%, Not Available maksimal 5%'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem manajemen gudang bahan baku yang mencatat stok material dan jadwal kedatangan.',
            details: [
              'Available: Bahan baku sudah tersedia',
              'On Progress: Bahan baku dalam pengiriman',
              'Not Available: Bahan baku belum ada'
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
            subtitle: 'Apa itu Order Fulfillment?',
            description: 'Order Fulfillment menunjukkan status pemenuhan pesanan dari customer. Melacak berapa banyak order yang sudah selesai, sedang proses, atau sedang dalam QC.',
            details: [
              'Released: Order yang sudah selesai diproduksi dan siap dikirim',
              'Quarantined: Order yang sedang dalam pemeriksaan Quality Control',
              'WIP: Order yang sedang dalam proses produksi',
              'Target ideal: Released tinggi, Quarantined dan WIP rendah'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem order fulfillment yang melacak status pemenuhan pesanan dari customer.',
            details: [
              'Released: Order yang sudah selesai diproduksi',
              'Quarantined: Order yang sedang dalam pemeriksaan QC',
              'WIP: Order yang sedang dalam proses produksi'
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
            subtitle: 'Apa itu Production Cycle Time?',
            description: 'Cycle Time adalah waktu yang dibutuhkan untuk menyelesaikan produksi satu batch produk, dihitung dari awal proses sampai selesai dikemas dan siap dikirim.',
            details: [
              'Cycle Time (hari): Rata-rata waktu yang dibutuhkan untuk selesaikan produksi',
              'Semakin rendah semakin baik (produksi lebih cepat)',
              'Breakdown per Line: PN1, PN2 (lini produksi berbeda)',
              'Quality Release: Waktu yang dibutuhkan QC untuk approve produk'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem produksi (WIP) yang mencatat waktu batch mulai sampai selesai released.',
            details: [
              'Cycle Time: Rata-rata waktu produksi (hari)',
              'Breakdown per Line: PN1, PN2, dll',
              'Quality Release: Waktu untuk QC approval'
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
            subtitle: 'Apa itu Inventory Dashboard?',
            description: 'Bagian ini menampilkan kondisi kesehatan persediaan barang jadi. Membantu mengidentifikasi produk-produk yang bermasalah atau tidak efisien.',
            details: [
              'Slow Moving: Produk yang penjualannya sangat lambat (3-6 bulan tidak bergerak banyak)',
              'Dead Stock: Produk yang sudah tidak laku sama sekali (>6 bulan tidak ada penjualan)',
              'Return Item: Produk yang dikembalikan oleh customer (bisa karena rusak, expired, dll)',
              '⚠️ Target ideal: Slow Moving <5%, Dead Stock <2%, Return <1%'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem gudang yang melacak pergerakan stok barang jadi. Klasifikasi berdasarkan analisis sales history 6 bulan terakhir.',
            details: [
              'Slow Moving: Produk dengan penjualan lambat (3-6 bulan)',
              'Dead Stock: Produk tidak bergerak sama sekali (>6 bulan)',
              'Return: Produk yang dikembalikan dari customer'
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
            description: 'Menampilkan target produksi bulanan dan realisasi aktual untuk memantau performa produksi sepanjang tahun.',
            details: [
              'Target: Jumlah unit yang harus diproduksi setiap bulan',
              'Realisasi: Jumlah unit yang berhasil diproduksi',
              'Grafik menunjukkan tren produksi dari bulan ke bulan',
              'Klik bar untuk melihat detail per produk'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem produksi dan sistem perencanaan (forecast) yang mencatat target bulanan dan output produksi harian.'
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
            subtitle: 'Apa itu PCT (Production Cycle Time)?',
            description: 'Menampilkan rata-rata waktu (dalam hari) yang dibutuhkan untuk setiap tahapan proses produksi, dari timbang hingga quality assurance.',
            details: [
              'Timbang: Waktu proses penimbangan bahan',
              'Proses: Waktu produksi utama (mixing, granulasi, dll)',
              'QC: Waktu pemeriksaan Quality Control',
              'Mikro: Waktu uji mikrobiologi',
              'QA: Waktu approval Quality Assurance final',
              'Donut chart menampilkan proporsi waktu per tahap'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem WIP yang melacak timestamp setiap batch di setiap tahapan. Hanya batch yang sudah complete dengan "Tempel Label Release" yang dihitung.'
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
            description: 'Menampilkan semua batch produk yang sedang dalam proses produksi, beserta tahapan dan durasi masing-masing batch.',
            details: [
              'Status: Tahapan saat ini (Penyediaan, Produksi, Packaging, dll)',
              'Durasi: Berapa lama batch sudah dalam proses (hari)',
              'Timeline visual menunjukkan progress setiap batch',
              'Warna indikator: hijau (< 7 hari), kuning (7-14 hari), merah (> 14 hari)'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem produksi yang melacak status batch di setiap departemen dan lini produksi.'
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
            subtitle: 'Mengapa Sidebar Bisa Disembunyikan?',
            description: 'Sidebar dapat disembunyikan untuk memberikan ruang lebih luas pada grafik. Saat sidebar disembunyikan, layout otomatis berubah dan menampilkan grafik WIP Summary yang tidak terlihat saat sidebar aktif.',
            details: [
              'Klik tombol toggle (☰) di kanan atas untuk menyembunyikan/menampilkan sidebar',
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
            description: 'Grafik ini menampilkan output produksi Line PN1. Grafik akan otomatis berganti antara tampilan bulanan (Monthly) dan harian (Daily) setiap beberapa detik untuk memberikan perspektif yang lengkap.',
            details: [
              'Monthly Output: Total produksi per bulan dalam setahun',
              'Daily Output: Produksi harian dalam bulan berjalan',
              'Auto-rotate: Grafik berganti otomatis antara Monthly dan Daily',
              'Bar chart (Monthly) dan Line chart (Daily) untuk visualisasi yang optimal'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem produksi Line PN1 yang mencatat output harian. Data bulanan adalah agregasi dari output harian per bulan.'
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
            description: 'Menampilkan status pemenuhan order (Order Fulfillment) untuk batch-batch bulan ini di Line PN1. Grafik menunjukkan perkembangan harian dari Released, Quarantined, dan WIP.',
            details: [
              'Released (hijau): Batch yang sudah selesai dan siap dikirim',
              'Quarantined (kuning): Batch dalam pemeriksaan Quality Control',
              'WIP (biru): Batch yang masih dalam proses produksi',
              'Line chart menunjukkan tren pemenuhan order dari hari ke hari'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem order fulfillment Line PN1 yang melacak status setiap batch per hari.'
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
            description: 'Bagian ini menampilkan detail semua batch yang sedang dalam proses produksi di Line PN1. Speedometer menunjukkan jumlah batch per tahapan, dan tabel di bawahnya menampilkan informasi lengkap setiap batch.',
            details: [
              'Speedometer: Jumlah batch aktif di setiap tahapan (Timbang, Proses, Kemas, QC, dll)',
              'Warna speedometer: Hijau (lancar), Kuning (perhatian), Merah (bottleneck)',
              'Tabel Batch: Detail setiap batch termasuk nama produk, status, dan durasi',
              'Klik batch untuk melihat timeline detail proses produksi',
              'Durasi menunjukkan berapa lama batch sudah dalam proses'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem WIP yang melacak pergerakan setiap batch dari tahap ke tahap. Timeline detail diambil dari sistem task management produksi.'
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
            description: 'Donut chart yang menampilkan distribusi batch aktif Line PN1 berdasarkan tahapan produksi. Grafik ini HANYA muncul saat sidebar disembunyikan untuk memberikan overview cepat.',
            details: [
              'Menampilkan jumlah batch di setiap tahapan (Timbang, Proses, Kemas, dll)',
              'Proporsi visual membantu identifikasi bottleneck',
              'Warna berbeda untuk setiap tahapan produksi',
              '💡 Grafik ini hanya terlihat saat sidebar disembunyikan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data dari sistem WIP Line PN1 yang melacak posisi setiap batch dalam alur produksi.'
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
            subtitle: 'Mengapa Sidebar Bisa Disembunyikan?',
            description: 'Sidebar dapat disembunyikan untuk memberikan ruang lebih luas pada grafik. Saat sidebar disembunyikan, layout otomatis berubah dan menampilkan grafik WIP Summary yang tidak terlihat saat sidebar aktif.',
            details: [
              'Klik tombol toggle (☰) di kanan atas untuk menyembunyikan/menampilkan sidebar',
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
            description: 'Grafik ini menampilkan output produksi Line PN2. Grafik akan otomatis berganti antara tampilan bulanan (Monthly) dan harian (Daily) setiap beberapa detik untuk memberikan perspektif yang lengkap.',
            details: [
              'Monthly Output: Total produksi per bulan dalam setahun',
              'Daily Output: Produksi harian dalam bulan berjalan',
              'Auto-rotate: Grafik berganti otomatis antara Monthly dan Daily',
              'Bar chart (Monthly) dan Line chart (Daily) untuk visualisasi yang optimal'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem produksi Line PN2 yang mencatat output harian. Data bulanan adalah agregasi dari output harian per bulan.'
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
            description: 'Menampilkan status pemenuhan order (Order Fulfillment) untuk batch-batch bulan ini di Line PN2. Grafik menunjukkan perkembangan harian dari Released, Quarantined, dan WIP.',
            details: [
              'Released (hijau): Batch yang sudah selesai dan siap dikirim',
              'Quarantined (kuning): Batch dalam pemeriksaan Quality Control',
              'WIP (biru): Batch yang masih dalam proses produksi',
              'Line chart menunjukkan tren pemenuhan order dari hari ke hari'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem order fulfillment Line PN2 yang melacak status setiap batch per hari.'
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
            description: 'Bagian ini menampilkan detail semua batch yang sedang dalam proses produksi di Line PN2. Speedometer menunjukkan jumlah batch per tahapan, dan tabel di bawahnya menampilkan informasi lengkap setiap batch.',
            details: [
              'Speedometer: Jumlah batch aktif di setiap tahapan (Timbang, Proses, Kemas, QC, dll)',
              'Warna speedometer: Hijau (lancar), Kuning (perhatian), Merah (bottleneck)',
              'Tabel Batch: Detail setiap batch termasuk nama produk, status, dan durasi',
              'Klik batch untuk melihat timeline detail proses produksi',
              'Durasi menunjukkan berapa lama batch sudah dalam proses'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem WIP yang melacak pergerakan setiap batch dari tahap ke tahap. Timeline detail diambil dari sistem task management produksi.'
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
            description: 'Donut chart yang menampilkan distribusi batch aktif Line PN2 berdasarkan tahapan produksi. Grafik ini HANYA muncul saat sidebar disembunyikan untuk memberikan overview cepat.',
            details: [
              'Menampilkan jumlah batch di setiap tahapan (Timbang, Proses, Kemas, dll)',
              'Proporsi visual membantu identifikasi bottleneck',
              'Warna berbeda untuk setiap tahapan produksi',
              '💡 Grafik ini hanya terlihat saat sidebar disembunyikan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data dari sistem WIP Line PN2 yang melacak posisi setiap batch dalam alur produksi.'
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
            subtitle: 'Mengapa Sidebar Bisa Disembunyikan?',
            description: 'Sidebar dapat disembunyikan untuk memberikan ruang lebih luas pada grafik. Saat sidebar disembunyikan, layout otomatis berubah dan menampilkan grafik Daily OF1 yang tidak terlihat saat sidebar aktif.',
            details: [
              'Klik tombol toggle (☰) di kanan atas untuk menyembunyikan/menampilkan sidebar',
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
            description: 'Grafik ini menampilkan jumlah batch yang telah di-release (lulus QC) dari Quality Dashboard. Grafik akan otomatis berganti antara tampilan bulanan (Monthly) dan harian (Daily) setiap beberapa detik.',
            details: [
              'Monthly Released: Total batch yang di-release per bulan dalam setahun',
              'Daily Released: Batch yang di-release harian dalam bulan berjalan (MTD)',
              'Auto-rotate: Grafik berganti otomatis antara Monthly dan Daily',
              'Bar chart (Monthly) dan Line chart (Daily) untuk visualisasi optimal',
              'Released = batch yang sudah lulus Quality Control dan siap dikirim'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem Quality Control yang mencatat batch yang sudah di-release. Data bulanan adalah agregasi dari release harian per bulan.'
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
            description: 'Lead Time menunjukkan rata-rata waktu (dalam hari) yang dibutuhkan untuk proses Quality Control (QC) atau Mikrobiologi (Mikro) per hari. Grafik akan otomatis berganti antara QC dan Mikro untuk memberikan pandangan lengkap.',
            details: [
              'Lead Time QC: Waktu yang dibutuhkan untuk pemeriksaan Quality Control',
              'Lead Time Mikro: Waktu yang dibutuhkan untuk uji mikrobiologi',
              'Auto-rotate: Grafik berganti otomatis antara QC dan Mikro',
              'Line chart menunjukkan tren harian lead time',
              'Semakin rendah lead time, semakin cepat batch bisa di-release'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data diambil dari sistem WIP yang melacak timestamp batch masuk dan keluar dari tahapan QC dan Mikro. Lead time dihitung dari selisih waktu proses.'
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
            description: 'Menampilkan status pemenuhan order (Order Fulfillment) untuk batch-batch bulan ini di Quality Dashboard. Grafik ini HANYA muncul saat sidebar disembunyikan. Menunjukkan perkembangan harian dari Released, Quarantined, dan WIP.',
            details: [
              'Released (hijau): Batch yang sudah selesai QC dan siap dikirim',
              'Quarantined (kuning): Batch dalam pemeriksaan Quality Control',
              'WIP (biru): Batch yang masih dalam proses produksi',
              'Line chart menunjukkan tren pemenuhan order dari hari ke hari',
              '💡 Grafik ini hanya terlihat saat sidebar disembunyikan'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem order fulfillment Quality yang melacak status setiap batch per hari.'
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
            description: 'Bagian ini menampilkan detail semua batch yang sedang dalam proses Quality Control. Speedometer menunjukkan jumlah batch per tahapan QC, dan tabel di bawahnya menampilkan informasi lengkap setiap batch.',
            details: [
              'Speedometer: Jumlah batch aktif di setiap tahapan (Inspeksi, QC, Mikro, QA, dll)',
              'Warna speedometer: Hijau (lancar), Kuning (perhatian), Merah (bottleneck)',
              'Tabel Batch: Detail setiap batch termasuk nama produk, status QC, dan durasi',
              'Klik batch untuk melihat timeline detail proses Quality Control',
              'Durasi menunjukkan berapa lama batch sudah dalam proses QC'
            ]
          },
          {
            subtitle: 'Sumber Data',
            description: 'Data realtime dari sistem WIP Quality yang melacak pergerakan setiap batch dari tahap ke tahap dalam Quality Control. Timeline detail diambil dari sistem task management QC.'
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
