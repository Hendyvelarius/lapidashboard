import React from 'react';
import './WipTable.css';

function minutesBetween(start, end) {
  if (!start || !end) return '-';
  const s = new Date(start);
  const e = new Date(end);
  return Math.round((e - s) / 60000); // ms to minutes
}

function WipTableDetail({ detail, loading }) {
  if (loading) {
    return (
      <tr className="wip-detail-row">
        <td colSpan={7} style={{ textAlign: 'center', padding: 24 }}>
          <div className="wip-detail-loading">Loading detail...</div>
        </td>
      </tr>
    );
  }
  if (!detail || detail.length === 0) {
    return (
      <tr className="wip-detail-row">
        <td colSpan={7} style={{ textAlign: 'center', padding: 24, color: '#888' }}>
          Tidak ada data detail
        </td>
      </tr>
    );
  }
  // Sort by No_urut (Urutan)
  const sorted = [...detail].sort((a, b) => a.No_urut - b.No_urut);

  // Calculate cumulative Waktu Pengerjaan for each Urutan
  const urutanTotals = {};
  const cumulativeRows = sorted.map((row, idx) => {
    const waktu = minutesBetween(row.StartDate, row.EndDate);
    const urutan = row.No_urut;
    // If waktu is not a number, treat as 0 for summing, but show '-' in UI
    const waktuNum = typeof waktu === 'number' ? waktu : 0;
    if (!urutanTotals[urutan]) {
      urutanTotals[urutan] = 0;
    }
    urutanTotals[urutan] += waktuNum;
    // For display, if waktu is '-', show '-', else show cumulative
    const displayWaktu = waktu === '-' ? '-' : urutanTotals[urutan];
    return {
      ...row,
      cumulativeWaktu: displayWaktu,
      waktuRaw: waktu,
    };
  });

  return (
    <tr className="wip-detail-row">
      <td colSpan={7} style={{ background: '#f9f9f9', padding: 0 }}>
        <div className="wip-detail-table-wrap">
          <table className="wip-detail-table">
            <thead>
              <tr style={{ color: '#111', fontSize: '13px', height: 20 }}>
                <th>Urutan</th>
                <th>Kode</th>
                <th>Tahapan</th>
                <th>Departemen</th>
                <th>Estimasi (menit)</th>
                <th>Waktu Pengerjaan (menit)</th>
              </tr>
            </thead>
            <tbody>
              {cumulativeRows.map((row, idx) => {
                const est = row.lead_time;
                const waktu = row.cumulativeWaktu;
                let waktuBadge = 'badge-green';
                if (waktu === '-') waktuBadge = 'badge-yellow';
                else if (est && waktu > est) waktuBadge = 'badge-red';
                else if (est && waktu <= est) waktuBadge = 'badge-green';
                return (
                  <tr key={row.PK_ID || idx} style={{ color: '#111', fontSize: '13px', height: 14 }}>
                    <td>{row.No_urut}</td>
                    <td>{row.kode_tahapan}</td>
                    <td>{row.nama_tahapan}</td>
                    <td>{row.dept}</td>
                    <td><span className="badge badge-green">{est}</span></td>
                    <td><span className={`badge ${waktuBadge}`}>{waktu}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

export default WipTableDetail;
