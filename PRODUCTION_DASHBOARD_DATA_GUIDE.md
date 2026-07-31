# Panduan Sumber Data - Dashboard Produksi

**Untuk Manajer Produksi dan Pengguna Non-Teknis**

Dokumen ini menjelaskan dari mana setiap metrik dan grafik di Dashboard Produksi mendapatkan data.

---

## 📊 Gambaran Umum Dashboard

Dashboard Produksi secara otomatis melakukan refresh setiap jam dan menampilkan status produksi real-time di semua departemen.

---

## 1. 🔄 Bagian WIP (Work-in-Progress / Barang Dalam Proses)

### Yang Ditampilkan
- Batch yang sedang dalam proses produksi
- Tahap mana setiap batch saat ini berada
- Berapa lama batch sudah berada di setiap tahap
- Alur produksi per departemen (PN1, PN2, dll.)

### Sumber Data

**Tabel Utama:** `t_alur_proses` (Alur Proses Produksi)
- Berisi semua langkah produksi untuk setiap batch
- Melacak tanggal mulai, tanggal selesai, dan status saat ini
- Menunjukkan batch sedang berada di tahap mana

**Tabel Pendukung:**
- `m_tahapan_group` - Mengelompokkan langkah-langkah individual menjadi tahap utama (Timbang, Proses, QC, Mikro, QA)
- `m_product` - Nama dan detail produk
- `m_product_pn_group` - Penugasan departemen (PN1/PN2, kolom `Group_Dept`) **dan** jenis sediaan (kolom `jenis_sediaan`) untuk setiap produk, per periode
- `t_rfid_batch_card` - Batch aktif yang saat ini berstatus "Open" dalam produksi
- `t_dnc_product` - Batch yang sudah dirilis/diselesaikan

### Logika Utama

**Batch dianggap "dalam WIP" jika:**
- Memiliki status open di `t_rfid_batch_card`
- BELUM menyelesaikan tahap "Tempel Label Realese"
- Dimulai dalam 12 bulan terakhir
- Merupakan produk jadi (bukan granulat)

**Batch dikeluarkan dari WIP ketika:**
- Tahap "Tempel Label Realese" memiliki EndDate
- ATAU muncul di tabel `t_dnc_product` (batch yang sudah dirilis)
- ATAU jenis sediaannya `Import FG` / `Toll Out` — produk ini tidak diproduksi di pabrik sendiri sehingga tidak punya proses produksi

**Pengelompokan Jenis Sediaan:**
- Sumbernya `m_product_pn_group.jenis_sediaan`, bukan lagi `m_product_sediaan_produksi`
- Kelompok resmi: Liquid & DS, Injeksi, Tablet Biasa Kapsul, Tablet Salut, Probiotik & Hormon (+ Import FG & Toll Out yang dikecualikan dari WIP)
- Dept (`Group_Dept`) mengikuti periode yang sedang dilihat, tetapi jenis sediaan selalu diambil dari periode **berjalan** — kolom `jenis_sediaan` baru mulai diisi pada periode 2026 07, jadi periode sebelumnya masih kosong
- Produk yang `Group_Dept` atau `jenis_sediaan`-nya kosong akan muncul di peringatan "PN Group Missing!" di header dashboard

**Perhitungan Durasi Tahap:**
- Menggunakan `IdleStartDate` dari `t_alur_proses`
- `IdleStartDate` = ketika tahap sebelumnya selesai (batch siap untuk tahap ini)
- "Hari di Tahap" = Hari ini dikurangi IdleStartDate paling awal untuk tahap tersebut

**Kasus Khusus - Tahap QA:**
- Batch hanya muncul di QA setelah SEMUA 4 pengecekan dokumen dimulai:
  1. Cek Dokumen PC oleh QA
  2. Cek Dokumen PN oleh QA
  3. Cek Dokumen MC oleh QA
  4. Cek Dokumen QC oleh QA
- Durasi menggunakan IdleStartDate TERBARU dari 4 langkah ini

**Flag Display:**
- Batch dengan `Display='1'` di `t_alur_proses` ditampilkan sebagai "terjadwal" meskipun belum dimulai
- Batch ini muncul di hitungan speedometer tetapi menampilkan "Not Started" untuk durasi

### Rincian Tahap

**7 Tahap Utama:**
1. **Timbang** - Penimbangan bahan baku
2. **Proses** - Proses produksi (termasuk: Terima Bahan, Mixing, Filling, Granulasi, Cetak, Coating)
3. **Kemas Primer** - Pengemasan primer
4. **Kemas Sekunder** - Pengemasan sekunder
5. **QC** - Pengujian Quality Control
6. **Mikro** - Pengujian mikrobiologi
7. **QA** - Pemeriksaan akhir Quality Assurance

---

## 2. ⏱️ Bagian PCT (Production Cycle Time / Waktu Siklus Produksi)

### Yang Ditampilkan
- Rata-rata waktu yang dihabiskan di setiap tahap produksi
- Total waktu produksi dari awal hingga selesai
- Rincian per tahap (Timbang, Proses, QC, Mikro, QA)
- Tampilan MTD (Month-to-Date / Bulan Berjalan) atau YTD (Year-to-Date / Tahun Berjalan)

### Sumber Data

**Query SQL Custom:** Menggabungkan beberapa tabel
- `t_alur_proses` - Pelacakan proses produksi
- `m_Product` - Informasi produk
- `m_tahapan_group` - Pengelompokan tahap

### Logika Utama

**Hanya mencakup batch yang:**
- Telah menyelesaikan "Tempel Label Realese" dengan EndDate
- Selesai bulan ini (MTD) atau tahun ini (YTD)
- BUKAN produk granulat
- Memiliki tanggal batch yang valid

**Perhitungan:**
- **Total_Days** = Hari dari StartDate pertama hingga EndDate "Tempel Label Realese"
- **Hari per Tahap** = DATEDIFF antara StartDate paling awal dan EndDate paling akhir untuk tahap tersebut
- **Rata-rata** = Mean dari semua durasi batch untuk setiap tahap

**5 Tahap yang Dilacak:**
1. Timbang
2. Proses (Mixing, Filling, Granulasi, Cetak, Coating)
3. QC
4. Mikro
5. QA

### MTD vs YTD

**MTD (Month-to-Date / Bulan Berjalan):**
- Menampilkan batch yang selesai BULAN INI
- Filter: `YEAR(EndDate) = Tahun Sekarang AND MONTH(EndDate) = Bulan Sekarang`

**YTD (Year-to-Date / Tahun Berjalan):**
- Menampilkan batch yang selesai TAHUN INI
- Filter: `YEAR(EndDate) = Tahun Sekarang`

**Logika Auto-Switch:**
- Jika MTD tidak memiliki data (belum ada batch yang selesai bulan ini), dashboard otomatis beralih ke YTD setelah 3 detik
- Menampilkan notifikasi: "PCT MTD is currently empty. Switching to YTD data"

---

## 3. 📈 Bagian Production Output (Output Produksi)

### Yang Ditampilkan
- Produksi bulanan vs forecast
- Perbandingan year-over-year
- Pelacakan produksi per produk

### Sumber Data

**Stored Procedure:** `sp_Dashboard_DataReportManHours`
- Berisi data forecast vs produksi aktual
- Rincian bulanan untuk tahun berjalan
- Data historis untuk perbandingan

**Tabel Pendukung:**
- `m_product_otc` - Klasifikasi produk OTC
- Kategorisasi produk (Generik, OTC, ETH)

### Metrik Utama
- **Target** - Jumlah produksi yang direncanakan
- **Production** - Jumlah produksi yang diselesaikan
- **Achievement** - Persentase produksi

---

## 4. 🏷️ Kategori Produk

### Yang Ditampilkan
- Klasifikasi produk menjadi ETH, OTC, atau Generik
- Digunakan untuk filtering dan pengelompokan di semua grafik

### Sumber Data

**Tabel:**
- `m_Product` - Semua produk dengan nama
- `m_product_otc` - Daftar produk OTC

### Logika Klasifikasi
1. Jika `Product_ID` ada di `m_product_otc` → **OTC**
2. Jika `Product_Name` mengandung "generik" atau "generic" → **Generik**
3. Selain itu → **ETH** (Ethical/Resep)

---

## 5. 🏢 Penugasan Departemen

### Yang Ditampilkan
- Departemen mana (PN1/PN2) yang menangani setiap produk
- Digunakan untuk speedometer khusus departemen

### Sumber Data

**Tabel:** `m_Product_PN_Group`
- Pemetaan produk ke departemen
- **Filter:** Hanya bulan sekarang (`Group_Periode = 'YYYY MM'`)

**Contoh:**
- Jika hari ini November 2025, hanya pemetaan dengan `Group_Periode = '2025 11'` yang digunakan
- Ini memungkinkan penugasan departemen berubah setiap bulan

---

## 📝 Catatan Penting untuk Manajer Produksi

### Kesegaran Data
- Dashboard auto-refresh setiap **1 jam**
- Tombol refresh manual tersedia untuk update langsung
- Data diambil langsung dari database produksi

### Siklus Hidup Batch
```
Batch Baru → Timbang → Proses → Kemas Primer → Kemas Sekunder 
→ QC → Mikro → QA → Tempel Label Realese → Released (Keluar dari WIP)
```

### Pertanyaan Umum

**T: Mengapa batch menampilkan "Not Started" di QA?**
J: Untuk tahap QA, SEMUA 4 pengecekan dokumen harus memiliki IdleStartDate sebelum durasi dihitung. Jika ada yang kosong, akan menampilkan "Not Started".

**T: Mengapa PCT menampilkan YTD bukan MTD?**
J: Jika tidak ada batch yang diselesaikan dengan "Tempel Label Realese" bulan ini, dashboard otomatis beralih ke YTD untuk menampilkan data terbaru.

**T: Apa arti flag "Display"?**
J: Batch dengan Display='1' adalah batch yang dijadwalkan/direncanakan yang muncul dalam hitungan tetapi belum memulai produksi.

**T: Kapan batch dianggap "selesai"?**
J: Ketika tahap "Tempel Label Realese" memiliki EndDate di `t_alur_proses`.

**T: Mengapa saya tidak melihat batch di WIP lagi?**
J: Batch telah:
   - Menyelesaikan "Tempel Label Realese" (selesai produksi)
   - Ditambahkan ke tabel `t_dnc_product` (dirilis)
   - Tidak aktif lebih dari 12 bulan

### Tips Akurasi Data

✅ **Pastikan ini diupdate secara berkala:**
- `t_alur_proses` - Tanggal Mulai dan Selesai untuk setiap langkah produksi
- `IdleStartDate` - Dihitung dari penyelesaian tahap sebelumnya
- `t_rfid_batch_card` - Status batch (Open/Closed)
- `m_Product_PN_Group` - Penugasan departemen bulanan

❌ **Masalah data umum:**
- EndDate kosong pada tahap yang sudah selesai → Batch tetap di WIP
- IdleStartDate kosong → Menampilkan "Not Started"
- Pemetaan departemen salah → Batch muncul di speedometer yang salah
- EndDate "Tempel Label Realese" kosong → Batch tidak pernah keluar dari WIP

---

## 🔍 Referensi Cepat Tabel Database

| Nama Tabel | Tujuan | Field Penting |
|------------|---------|---------------|
| `t_alur_proses` | Pelacakan proses produksi | Batch_No, nama_tahapan, StartDate, EndDate, IdleStartDate, Display |
| `m_tahapan_group` | Pengelompokan tahap | kode_tahapan, tahapan_group |
| `m_product` | Master produk | Product_ID, Product_Name |
| `m_product_pn_group` | Penugasan departemen + jenis sediaan | Group_ProductID, Group_Dept, jenis_sediaan, Group_Periode |
| `t_rfid_batch_card` | Status batch | Batch_No, Batch_Status, isActive |
| `t_dnc_product` | Batch yang dirilis | DNc_BatchNo, DNC_TempelLabel |
| `m_product_otc` | Produk OTC | Product_ID |

---

**Terakhir Diupdate:** November 2025  
**Versi Dashboard:** Production Dashboard v2.0
