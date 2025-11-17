import React, { useState } from 'react';
import './HelpModal.css';

const HelpModal = ({ isOpen, onClose, dashboardType = 'summary' }) => {
  const [expandedSection, setExpandedSection] = useState(null);

  if (!isOpen) return null;

  const toggleSection = (sectionId) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Indonesian help content for Summary Dashboard
  const summaryHelpContent = {
    title: "Panduan Dashboard Ringkasan",
    sections: [
      {
        id: 'sales',
        title: '📊 SELLING IN - Target Penjualan',
        content: [
          {
            subtitle: 'Apa itu Target Penjualan?',
            text: 'Bagian ini menampilkan target penjualan dan pencapaian aktual perusahaan. Data ini membantu Anda memahami seberapa baik performa penjualan dibandingkan dengan target yang ditetapkan.'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data target penjualan diambil dari sistem perencanaan penjualan (forecast) yang dibuat oleh tim marketing dan sales. Data pencapaian aktual berasal dari laporan penjualan harian yang diinput oleh tim sales.'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Target bulanan: Jumlah yang harus dicapai dalam bulan ini\n• Pencapaian MTD (Month To Date): Total yang sudah terjual sampai hari ini\n• Persentase: Seberapa besar pencapaian dibanding target (contoh: 75% berarti sudah mencapai 75% dari target)\n• Warna hijau = target tercapai atau hampir tercapai\n• Warna kuning = perlu ditingkatkan\n• Warna merah = jauh dari target'
          }
        ]
      },
      {
        id: 'coverage',
        title: '📦 Coverage Stock Barang Jadi',
        content: [
          {
            subtitle: 'Apa itu Coverage Stock?',
            text: 'Coverage menunjukkan berapa lama stok barang jadi yang ada saat ini bisa memenuhi kebutuhan penjualan. Dihitung dalam satuan hari.'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data stok barang jadi diambil dari sistem gudang yang mencatat jumlah produk yang sudah selesai diproduksi dan siap dijual. Data rata-rata penjualan harian dihitung dari history penjualan 30 hari terakhir.'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Coverage (hari): Berapa hari stok saat ini bisa mencukupi penjualan\n  - Contoh: "45 hari" artinya dengan penjualan normal, stok akan habis dalam 45 hari\n• Under Coverage: Produk dengan stok kurang (di bawah 30 hari) - perlu produksi segera\n• On Target: Produk dengan stok ideal (30-60 hari)\n• Over Coverage: Produk dengan stok berlebih (lebih dari 60 hari) - hindari produksi berlebihan\n\nTip: Perhatikan produk Under Coverage agar tidak kehabisan stok!'
          }
        ]
      },
      {
        id: 'stockout',
        title: '🚫 Stock Out - Kehabisan Stok',
        content: [
          {
            subtitle: 'Apa itu Stock Out?',
            text: 'Stock Out adalah kondisi dimana produk tertentu benar-benar habis (stok = 0) sehingga permintaan customer tidak bisa dipenuhi. Ini mengakibatkan kehilangan penjualan (lost sales).'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data diambil dari dua sumber:\n1. Sistem gudang yang menunjukkan produk mana yang stoknya 0 (kosong)\n2. Sistem penjualan yang mencatat permintaan customer yang tidak bisa dipenuhi karena stok habis'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Jumlah SKU Stock Out: Berapa banyak jenis produk yang habis stoknya\n  - Contoh: "5 SKU" artinya ada 5 jenis produk yang kosong\n• Lost Sales: Total penjualan yang hilang karena tidak ada stok (dalam rupiah)\n  - Contoh: "Rp 50.000.000" artinya perusahaan kehilangan potensi penjualan 50 juta karena stok habis\n• Fokus vs Non-Fokus: Produk fokus adalah produk utama/prioritas tinggi, Non-Fokus adalah produk sekunder\n\n⚠️ Catatan Penting: Sistem hanya menghitung lost sales untuk produk yang BENAR-BENAR kosong (Release = 0). Produk yang masih ada stoknya tidak dihitung sebagai lost sales meskipun ada pending order.'
          }
        ]
      },
      {
        id: 'material',
        title: '🧱 Ketersediaan Bahan Baku',
        content: [
          {
            subtitle: 'Apa itu Ketersediaan Bahan Baku?',
            text: 'Bagian ini menunjukkan status bahan baku (material) yang diperlukan untuk produksi. Memastikan bahan baku cukup agar produksi tidak terhambat.'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data diambil dari sistem manajemen gudang bahan baku yang mencatat stok material, tanggal kedatangan material, dan kebutuhan material untuk produksi yang dijadwalkan.'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Available: Persentase bahan baku yang sudah tersedia dan siap digunakan\n• On Progress: Persentase bahan baku yang sedang dalam proses pengiriman/on the way\n• Not Available: Persentase bahan baku yang belum ada sama sekali - ini yang perlu diperhatikan!\n\nTarget ideal: Available minimal 80%, Not Available maksimal 5%\n\n💡 Tips: Jika Not Available tinggi, koordinasikan dengan tim purchasing untuk mempercepat pengadaan.'
          }
        ]
      },
      {
        id: 'ota',
        title: '🚚 OTA - Ketepatan Waktu Kedatangan Material',
        content: [
          {
            subtitle: 'Apa itu OTA (On Time Arrival)?',
            text: 'OTA mengukur seberapa tepat waktu kedatangan material dari supplier. Ini penting karena keterlambatan material bisa menghambat jadwal produksi.'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data diambil dari sistem penerimaan barang (BBBK - Bukti Berita Barang Keluar) yang mencatat:\n• Tanggal material seharusnya datang (janji supplier)\n• Tanggal material benar-benar diterima di gudang'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Early (Lebih Awal): Material datang lebih cepat dari jadwal\n  - Bisa positif (ready lebih awal) atau negatif (stok menumpuk terlalu cepat)\n• On Time (Tepat Waktu): Material datang sesuai jadwal - INI YANG PALING IDEAL\n• Late (Terlambat): Material datang lebih lambat dari jadwal - INI YANG HARUS DIHINDARI\n\n% Not Late: Persentase kedatangan yang tidak terlambat (Early + On Time)\n- Target ideal: minimal 95%\n- Jika di bawah 90%: perlu evaluasi performa supplier\n\n💡 Tips: Monitor supplier yang sering terlambat, pertimbangkan untuk mencari alternatif supplier.'
          }
        ]
      },
      {
        id: 'inventory',
        title: '📋 Inventory - Kondisi Persediaan',
        content: [
          {
            subtitle: 'Apa itu Inventory Dashboard?',
            text: 'Bagian ini menampilkan kondisi kesehatan persediaan barang jadi. Membantu mengidentifikasi produk-produk yang bermasalah atau tidak efisien.'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data diambil dari sistem inventory yang melacak:\n• Pergerakan stok setiap produk (berapa lama tidak bergerak)\n• History penjualan produk\n• Produk yang diretur/dikembalikan oleh customer'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Slow Moving: Produk yang penjualannya sangat lambat (jarang laku)\n  - Biasanya produk yang sudah 3-6 bulan stoknya tidak bergerak banyak\n  - Perlu strategi promosi atau diskon untuk menghabiskan stok\n\n• Dead Stock: Produk yang sudah tidak laku sama sekali\n  - Biasanya produk yang lebih dari 6 bulan tidak ada penjualan\n  - Pertimbangkan untuk stop produksi atau liquidation\n\n• Return Item: Produk yang dikembalikan oleh customer\n  - Bisa karena rusak, expired, atau tidak sesuai pesanan\n  - Perlu investigasi quality control dan penanganan khusus\n\n⚠️ Perhatian: Semakin tinggi nilai-nilai ini, semakin tidak sehat inventory perusahaan. Target ideal: Slow Moving <5%, Dead Stock <2%, Return <1%'
          }
        ]
      },
      {
        id: 'cycletime',
        title: '⏱️ Production Cycle Time - Waktu Produksi',
        content: [
          {
            subtitle: 'Apa itu Production Cycle Time?',
            text: 'Cycle Time adalah waktu yang dibutuhkan untuk menyelesaikan produksi satu batch produk, dihitung dari awal proses sampai selesai dikemas dan siap dikirim.'
          },
          {
            subtitle: 'Dari mana data ini berasal?',
            text: 'Data diambil dari sistem produksi (WIP - Work In Progress) yang mencatat:\n• Kapan batch mulai diproduksi (masuk proses)\n• Kapan batch selesai diproduksi dan released\n• Semua tahapan proses yang dilalui (Mixing, Filling, Granulasi, dll)'
          },
          {
            subtitle: 'Bagaimana cara membacanya?',
            text: '• Cycle Time (hari): Rata-rata waktu yang dibutuhkan untuk selesaikan produksi\n  - Contoh: "7 hari" artinya rata-rata butuh 7 hari dari mulai sampai selesai\n  - Semakin rendah semakin baik (produksi lebih cepat)\n\n• Breakdown per Line/Proses:\n  - Line PN1: Lini produksi 1 (biasanya produk tertentu)\n  - Line PN2: Lini produksi 2 (produk lain)\n  - Quality Release: Waktu yang dibutuhkan QC untuk approve produk\n\n💡 Tips: Jika cycle time meningkat, periksa bottleneck di tahapan mana yang paling lama. Mungkin perlu tambahan resources atau perbaikan proses.'
          }
        ]
      },
      {
        id: 'general',
        title: '❓ Pertanyaan Umum',
        content: [
          {
            subtitle: 'Bagaimana cara melihat detail lebih lanjut?',
            text: 'Klik pada angka atau grafik di setiap kartu untuk membuka popup detail yang menampilkan breakdown lebih lengkap per produk, per kategori, atau per periode.'
          },
          {
            subtitle: 'Seberapa sering data diperbarui?',
            text: 'Data diperbarui secara otomatis setiap 5 menit. Anda juga bisa klik tombol refresh manual jika ingin memperbarui data sekarang juga.'
          },
          {
            subtitle: 'Apa arti warna-warna pada dashboard?',
            text: '• Hijau: Target tercapai, kondisi baik\n• Kuning/Orange: Perlu perhatian, mendekati masalah\n• Merah: Masalah serius, perlu tindakan segera\n• Biru: Informasi netral'
          },
          {
            subtitle: 'Siapa yang harus saya hubungi jika ada pertanyaan?',
            text: '• Masalah penjualan/forecast: Hubungi tim Sales & Marketing\n• Masalah stok/gudang: Hubungi tim Warehouse/Inventory\n• Masalah produksi: Hubungi PPIC atau Supervisor Produksi\n• Masalah material: Hubungi tim Purchasing\n• Masalah teknis sistem: Hubungi tim IT'
          }
        ]
      }
    ]
  };

  const content = summaryHelpContent;

  return (
    <div className="help-modal-overlay" onClick={onClose}>
      <div className="help-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>{content.title}</h2>
          <button className="help-modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="help-modal-body">
          <div className="help-intro">
            <p>Panduan ini menjelaskan setiap bagian dari Dashboard Ringkasan dengan bahasa yang mudah dipahami. Klik pada setiap bagian untuk melihat penjelasan lengkap.</p>
          </div>

          <div className="help-sections">
            {content.sections.map((section) => (
              <div key={section.id} className="help-section">
                <button
                  className={`help-section-header ${expandedSection === section.id ? 'expanded' : ''}`}
                  onClick={() => toggleSection(section.id)}
                >
                  <span className="help-section-title">{section.title}</span>
                  <span className="help-section-toggle">
                    {expandedSection === section.id ? '▼' : '▶'}
                  </span>
                </button>
                
                {expandedSection === section.id && (
                  <div className="help-section-content">
                    {section.content.map((item, index) => (
                      <div key={index} className="help-content-block">
                        <h4>{item.subtitle}</h4>
                        <p style={{ whiteSpace: 'pre-line' }}>{item.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
