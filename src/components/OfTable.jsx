import React, { useState, useMemo } from 'react';
import './WipTable.css'; // Reuse WipTable styling

// Helper to format numbers with commas
function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString();
}

function OfTable({ data }) {
  const [expanded, setExpanded] = useState(null); // Product_ID of expanded row
  const [detail, setDetail] = useState(null);
  
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
  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return '↕️';
    if (sortConfig.direction === 'asc') return '↑';
    if (sortConfig.direction === 'desc') return '↓';
    return '↕️';
  };

  // Handle row click to show details
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

  // Calculate unprocessed value
  const calculateUnprocessed = (item) => {
    const target = Number(item.jlhTarget) || 0;
    const release = Number(item.release) || 0;
    const karantina = Number(item.karantina) || 0;
    const wip = Number(item.wip) || 0;
    return Math.max(0, target - release - karantina - wip);
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
                            <h4>Product Details</h4>
                            <div className="detail-grid">
                              <div className="detail-item">
                                <strong>Category:</strong> {detail.pengelompokan || '-'}
                              </div>
                              <div className="detail-item">
                                <strong>Department:</strong> {detail.Group_Dept || '-'}
                              </div>
                              <div className="detail-item">
                                <strong>Last Batch Real:</strong> {detail['Last Batch Real'] || '-'}
                              </div>
                              <div className="detail-item">
                                <strong>Target:</strong> {detail.Target || '-'}
                              </div>
                              <div className="detail-item">
                                <strong>New Batches:</strong> {detail.BetsBaru || 0}
                              </div>
                              <div className="detail-item">
                                <strong>Previous Month Quarantine:</strong> {detail.BetsKarantinaBulanSblmnya || '-'}
                              </div>
                            </div>
                            
                            {detail.ListBetsBaru && (
                              <div className="batch-lists">
                                <div className="batch-list">
                                  <strong>New Batch List:</strong>
                                  <div className="batch-numbers">
                                    {detail.ListBetsBaru.split(',').map((batch, idx) => (
                                      <span key={idx} className="batch-badge">{batch.trim()}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {detail.BatchNo_List_SudahWIP && (
                              <div className="batch-lists">
                                <div className="batch-list">
                                  <strong>WIP Batch List:</strong>
                                  <div className="batch-numbers">
                                    {detail.BatchNo_List_SudahWIP.split(',').map((batch, idx) => (
                                      <span key={idx} className="batch-badge batch-wip">{batch.trim()}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
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
