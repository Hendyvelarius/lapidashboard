import React, { useState } from 'react';
import './WipTable.css';

import WipTableDetail from './WipTableDetail';
import { apiUrl } from '../api';

// Helper to format date as badge with color
function getDateBadge(startDate) {
  if (!startDate) return <span className="badge badge-green">-</span>;
  const date = new Date(startDate);
  return <span className="badge badge-green">{date.toLocaleDateString()}</span>;
}
function WipTable({ data }) {
  const [expanded, setExpanded] = useState(null); // batchNo of expanded row
  const [detail, setDetail] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleExpand = async (row) => {
    if (expanded === row.batch) {
      setExpanded(null);
      setDetail([]);
      setLoading(false);
      return;
    }
    setExpanded(row.batch);
    setLoading(true);
    setDetail([]);
    try {
      const res = await fetch(apiUrl(`/api/batch?batchNo=${encodeURIComponent(row.batch)}`));
      const data = await res.json();
      setDetail(data.data || []);
    } catch {
      setDetail([]);
    }
    setLoading(false);
  };

  return (
    <div className="wip-table-container">
      <table className="wip-table">
        <thead>
          <tr>
            <th>Tanggal</th>
            <th>Nama</th>
            <th>Batch</th>
            <th>Durasi (Hari)</th>
            <th>BPHP</th>
          </tr>
        </thead>
        <tbody>
          {data && data.length > 0 ? (
            data.map((row, idx) => (
              <React.Fragment key={idx}>
                <tr
                  style={{ color: '#111', cursor: 'pointer', background: expanded === row.batch ? '#f5faff' : undefined }}
                  onClick={() => handleExpand(row)}
                  className={expanded === row.batch ? 'expanded-row' : ''}
                >
                  <td>{getDateBadge(row.startDate)}</td>
                  <td>{row.name}</td>
                  <td>{row.batch}</td>
                  <td>{row.duration}</td>
                  <td>{row.physicalDate ? new Date(row.physicalDate).toLocaleDateString() : <span className="bphp-belum">Belum</span>}</td>
                </tr>
                {expanded === row.batch && (
                  <WipTableDetail detail={detail} loading={loading} />
                )}
              </React.Fragment>
            ))
          ) : (
            <tr><td colSpan={5} style={{ textAlign: 'center', color: '#888' }}>Tidak ada data</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default WipTable;
