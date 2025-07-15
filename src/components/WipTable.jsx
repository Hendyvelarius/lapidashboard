import React, { useState, useMemo } from 'react';
import './WipTable.css';

import WipTableDetail from './WipTableDetail';
import { apiUrl } from '../api';

// Helper to format date as dd/mm/yy
function formatDateDDMMYY(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '-';
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString().slice(-2);
  
  return `${day}/${month}/${year}`;
}

// Helper to format date as badge with color
function getDateBadge(startDate) {
  if (!startDate) return <span className="badge badge-green">-</span>;
  return <span className="badge badge-green">{formatDateDDMMYY(startDate)}</span>;
}

function WipTable({ data }) {
  const [expanded, setExpanded] = useState(null); // batchNo of expanded row
  const [detail, setDetail] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Sort function
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  // Sorted data using useMemo for performance
  const sortedData = useMemo(() => {
    if (!data || !sortConfig.key || !sortConfig.direction) {
      return data || [];
    }

    return [...data].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle different data types
      if (sortConfig.key === 'startDate' || sortConfig.key === 'physicalDate') {
        // Date sorting
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortConfig.key === 'duration') {
        // Numeric sorting
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        // String sorting
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  }, [data, sortConfig]);

  // Get sort indicator
  const getSortIndicator = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <span style={{ color: '#ccc', marginLeft: 4 }}>↕</span>;
    }
    if (sortConfig.direction === 'asc') {
      return <span style={{ color: '#4f8cff', marginLeft: 4 }}>↑</span>;
    }
    if (sortConfig.direction === 'desc') {
      return <span style={{ color: '#4f8cff', marginLeft: 4 }}>↓</span>;
    }
    return <span style={{ color: '#ccc', marginLeft: 4 }}>↕</span>;
  };

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
            <th 
              onClick={() => handleSort('startDate')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Tanggal{getSortIndicator('startDate')}
            </th>
            <th 
              onClick={() => handleSort('name')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Nama{getSortIndicator('name')}
            </th>
            <th 
              onClick={() => handleSort('batch')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Batch{getSortIndicator('batch')}
            </th>
            <th 
              onClick={() => handleSort('duration')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              Durasi (Hari){getSortIndicator('duration')}
            </th>
            <th 
              onClick={() => handleSort('physicalDate')}
              style={{ cursor: 'pointer', userSelect: 'none' }}
            >
              BPHP{getSortIndicator('physicalDate')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedData && sortedData.length > 0 ? (
            sortedData.map((row, idx) => (
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
                  <td>{row.physicalDate ? formatDateDDMMYY(row.physicalDate) : <span className="bphp-belum">Belum</span>}</td>
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
