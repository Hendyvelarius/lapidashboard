import React, { useState, useMemo } from 'react';
import './WipTable.css'; // Reuse WipTable styling
import WipTableDetail from './WipTableDetail';
import { apiUrl } from '../api';

// Helper to format numbers with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

function OfTable({ data }) {
  const [expanded, setExpanded] = useState(null); // Product_ID of expanded row
  const [detail, setDetail] = useState(null);
  const [batchExpanded, setBatchExpanded] = useState(null); // batchNo of expanded batch
  const [batchDetail, setBatchDetail] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  
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
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string sorting
      const aStr = String(aVal || '').toLowerCase();
      const bStr = String(bVal || '').toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr < bStr ? -1 : aStr > bStr ? 1 : 0;
      } else {
        return aStr > bStr ? -1 : aStr < bStr ? 1 : 0;
      }
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

  // Handle row click to show batch details
  const handleRowClick = async (item) => {
    const productId = item.Product_ID;
    
    if (expanded === productId) {
      // Collapse if already expanded
      setExpanded(null);
      setDetail(null);
    } else {
      // Expand and set detail data
      setExpanded(productId);
      setDetail(item);
    }
  };

  // Helper function to get batch status and parse batch lists
  const getBatchDetails = (item) => {
    if (!item) return [];
    
    // Parse batch lists
    const allBatches = item.ListBetsBaru ? item.ListBetsBaru.split(',').map(b => b.trim()) : [];
    const releasedBatches = item.BatchNo_List_SudahRelease ? item.BatchNo_List_SudahRelease.split(',').map(b => b.trim()) : [];
    const quarantinedBatches = item.BatchNo_List_SudahKarantina ? item.BatchNo_List_SudahKarantina.split(',').map(b => b.trim()) : [];
    const wipBatches = item.BatchNo_List_SudahWIP ? item.BatchNo_List_SudahWIP.split(',').map(b => b.trim()) : [];
    
    // Create batch details with status
    const batchDetails = allBatches.map(batchNo => {
      let status = 'Unprocessed';
      let badgeClass = 'badge-gray';
      
      if (releasedBatches.includes(batchNo)) {
        status = 'Released';
        badgeClass = 'badge-green';
      } else if (quarantinedBatches.includes(batchNo)) {
        status = 'Quarantined';
        badgeClass = 'badge-yellow';
      } else if (wipBatches.includes(batchNo)) {
        status = 'WIP';
        badgeClass = 'badge-red';
      }
      
      return {
        batchNo,
        status,
        badgeClass
      };
    });
    
    return batchDetails;
  };

  // Calculate unprocessed value
  const calculateUnprocessed = (item) => {
    const target = Number(item.jlhTarget) || 0;
    const release = Number(item.release) || 0;
    const karantina = Number(item.karantina) || 0;
    const wip = Number(item.wip) || 0;
    return Math.max(0, target - release - karantina - wip);
  };

  // Handle batch click to show batch process details
  const handleBatchClick = async (batchNo, status, productId) => {
    // Don't allow clicks on unprocessed batches
    if (status === 'Unprocessed') {
      return;
    }

    // Create a unique key for this batch within this product
    const batchKey = `${productId}-${batchNo}`;

    if (batchExpanded === batchKey) {
      // Collapse if already expanded
      setBatchExpanded(null);
      setBatchDetail([]);
      setBatchLoading(false);
      return;
    }

    setBatchExpanded(batchKey);
    setBatchLoading(true);
    setBatchDetail([]);

    try {
      const res = await fetch(apiUrl(`/api/batch?batchNo=${encodeURIComponent(batchNo)}`));
      const data = await res.json();
      setBatchDetail(data.data || []);
    } catch (error) {
      console.error('Error fetching batch details:', error);
      setBatchDetail([]);
    }
    setBatchLoading(false);
  };

  return (
    <div className="wip-table-container">
      <div className="table-wrapper">
        <table className="wip-table">
          <thead>
            <tr>
              <th 
                className="sortable" 
                onClick={() => handleSort('Product_ID')}
              >
                Product ID {getSortIndicator('Product_ID')}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('Product_Name')}
              >
                Product Name {getSortIndicator('Product_Name')}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('jlhTarget')}
              >
                Target Batch {getSortIndicator('jlhTarget')}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('release')}
              >
                Released {getSortIndicator('release')}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('karantina')}
              >
                Quarantined {getSortIndicator('karantina')}
              </th>
              <th 
                className="sortable" 
                onClick={() => handleSort('wip')}
              >
                WIP {getSortIndicator('wip')}
              </th>
              <th>
                Unprocessed
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedData.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  No data available
                </td>
              </tr>
            ) : (
              sortedData.map((item) => {
                const unprocessed = calculateUnprocessed(item);
                const isExpanded = expanded === item.Product_ID;
                
                return (
                  <React.Fragment key={item.Product_ID}>
                    <tr 
                      className={`clickable-row ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => handleRowClick(item)}
                    >
                      <td>{item.Product_ID}</td>
                      <td>{item.Product_Name}</td>
                      <td>{formatNumber(item.jlhTarget)}</td>
                      <td>{formatNumber(item.release)}</td>
                      <td>{formatNumber(item.karantina)}</td>
                      <td>{formatNumber(item.wip)}</td>
                      <td>{formatNumber(unprocessed)}</td>
                    </tr>
                    {isExpanded && detail && (
                      <tr className="detail-row">
                        <td colSpan="7">
                          <div className="detail-content">
                            <h4>Product Name: {detail.Product_Name}</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <strong>Category:</strong> {detail.pengelompokan || '-'}
                              </div>
                              <div className="detail-item">
                                <strong>Department:</strong> {detail.Group_Dept || '-'}
                              </div>
                            </div>
                            
                            <div className="batch-status-section">
                              <h5>Batch Status</h5>
                              <div className="batch-status-grid">
                                {getBatchDetails(detail).map((batch, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`batch-status-item ${batch.status === 'Unprocessed' ? 'disabled' : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleBatchClick(batch.batchNo, batch.status, detail.Product_ID);
                                    }}
                                    style={{
                                      cursor: batch.status === 'Unprocessed' ? 'not-allowed' : 'pointer',
                                      opacity: batch.status === 'Unprocessed' ? 0.6 : 1
                                    }}
                                  >
                                    <span className="batch-number">{batch.batchNo}</span>
                                    <span className={`badge ${batch.badgeClass}`}>{batch.status}</span>
                                  </div>
                                ))}
                              </div>
                              {batchExpanded && batchExpanded.startsWith(`${detail.Product_ID}-`) && (
                                <div className="batch-detail-section">
                                  <h5 style={{ marginTop: '20px', marginBottom: '10px' }}>
                                    Batch Detail: {batchExpanded.split('-').slice(1).join('-')}
                                  </h5>
                                  <div className="batch-detail-table-container">
                                    {batchLoading ? (
                                      <div className="wip-detail-loading" style={{ padding: '20px', textAlign: 'center' }}>
                                        Loading detail...
                                      </div>
                                    ) : !batchDetail || batchDetail.length === 0 ? (
                                      <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                                        Tidak ada data detail
                                      </div>
                                    ) : (
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
                                            {(() => {
                                              // Sort by No_urut (Urutan)
                                              const sorted = [...batchDetail].sort((a, b) => a.Urutan - b.Urutan);
                                              
                                              // Calculate cumulative Waktu Pengerjaan for each Urutan
                                              const urutanTotals = {};
                                              const cumulativeRows = sorted.map((row, idx) => {
                                                const minutesBetween = (start, end) => {
                                                  if (!start || !end) return '-';
                                                  const s = new Date(start);
                                                  const e = new Date(end);
                                                  return Math.round((e - s) / 60000); // ms to minutes
                                                };
                                                
                                                const waktu = minutesBetween(row.StartDate, row.EndDate);
                                                const urutan = row.No_urut;
                                                const waktuNum = typeof waktu === 'number' ? waktu : 0;
                                                if (!urutanTotals[urutan]) {
                                                  urutanTotals[urutan] = 0;
                                                }
                                                urutanTotals[urutan] += waktuNum;
                                                const displayWaktu = waktu === '-' ? '-' : urutanTotals[urutan];
                                                return {
                                                  ...row,
                                                  cumulativeWaktu: displayWaktu,
                                                  waktuRaw: waktu,
                                                };
                                              });
                                              
                                              return cumulativeRows.map((row, idx) => {
                                                const est = row.lead_time;
                                                const waktu = row.cumulativeWaktu;
                                                let waktuBadge = 'badge-green';
                                                if (waktu === '-') waktuBadge = 'badge-yellow';
                                                else if (est && waktu > est) waktuBadge = 'badge-red';
                                                else if (est && waktu <= est) waktuBadge = 'badge-green';
                                                return (
                                                  <tr key={row.PK_ID || idx} style={{ color: '#111', fontSize: '13px', height: 14 }}>
                                                    <td>{row.Urutan}</td>
                                                    <td>{row.kode_tahapan}</td>
                                                    <td>{row.nama_tahapan}</td>
                                                    <td>{row.dept}</td>
                                                    <td><span className="badge badge-green">{est}</span></td>
                                                    <td><span className={`badge ${waktuBadge}`}>{waktu}</span></td>
                                                  </tr>
                                                );
                                              });
                                            })()}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
      <div className="table-summary">
        <span>Total Products: {sortedData.length}</span>
      </div>
    </div>
  );
}

export default OfTable;
