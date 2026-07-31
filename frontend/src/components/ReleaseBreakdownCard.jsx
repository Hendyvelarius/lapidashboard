import React, { useState } from 'react';

/**
 * One category card (ETH / OTC / Generik) inside the Quality Release Breakdown modal.
 *
 * A row is a product: how many of its batches cleared quarantine in the period and how
 * many units those batches carried. Clicking a row expands it to the individual
 * batches, each showing what QA released and how many units the warehouse received
 * (BPHP). Those two normally match; a gap means part of the batch was held back.
 *
 * Expects products shaped as:
 *   { productId, productName, batches, units, batchList: [{ batchNo, released, warehouse }] }
 */

const THEMES = {
  ETH: {
    icon: '💊',
    label: 'ETH Products',
    border: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    shadow: 'rgba(16, 185, 129, 0.15)',
    headRow: '#f0fdf4',
    headText: '#065f46',
    value: '#059669'
  },
  OTC: {
    icon: '🏪',
    label: 'OTC Products',
    border: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    shadow: 'rgba(59, 130, 246, 0.15)',
    headRow: '#eff6ff',
    headText: '#1e40af',
    value: '#2563eb'
  },
  Generik: {
    icon: '🧪',
    label: 'Generik Products',
    border: '#22c55e',
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    shadow: 'rgba(34, 197, 94, 0.15)',
    headRow: '#f0fdf4',
    headText: '#166534',
    value: '#16a34a'
  }
};

const thStyle = (theme, align) => ({
  padding: '12px 16px',
  textAlign: align,
  fontSize: '13px',
  fontWeight: '600',
  color: theme.headText,
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
});

function BatchTable({ theme, batches }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
      <thead>
        <tr style={{ color: '#6b7280' }}>
          <th style={{ padding: '6px 10px', textAlign: 'left', fontWeight: '600' }}>Batch</th>
          <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600' }}>Released</th>
          <th style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '600' }}>To Warehouse</th>
        </tr>
      </thead>
      <tbody>
        {batches.map(batch => {
          const differs = batch.warehouse > 0 && batch.warehouse !== batch.released;

          return (
            <tr key={batch.batchNo} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: '6px 10px', color: '#374151', fontFamily: 'monospace' }}>
                {batch.batchNo}
              </td>
              <td style={{ padding: '6px 10px', textAlign: 'right', color: theme.value, fontWeight: '600' }}>
                {batch.released.toLocaleString()}
              </td>
              <td
                style={{
                  padding: '6px 10px',
                  textAlign: 'right',
                  color: differs ? '#b45309' : '#6b7280',
                  fontWeight: differs ? '600' : '400'
                }}
                title={differs
                  ? `${(batch.warehouse - batch.released).toLocaleString()} units difference vs released`
                  : undefined}
              >
                {batch.warehouse > 0 ? batch.warehouse.toLocaleString() : '—'}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function ReleaseBreakdownCard({ category, products, totalBatches, totalUnits }) {
  const [expanded, setExpanded] = useState({});
  const theme = THEMES[category];

  if (!theme || !products || products.length === 0) return null;

  const toggle = (productId) => {
    setExpanded(prev => ({ ...prev, [productId]: !prev[productId] }));
  };

  return (
    <div style={{
      border: `2px solid ${theme.border}`,
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white',
      boxShadow: `0 4px 12px ${theme.shadow}`,
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '500px'
    }}>
      {/* Category Header */}
      <div style={{
        background: theme.gradient,
        padding: '16px 20px',
        color: 'white',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '10px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{theme.icon}</span>
          <span style={{ fontSize: '18px', fontWeight: '600' }}>{theme.label}</span>
        </div>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.25)',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '13px',
          fontWeight: '600',
          textAlign: 'right',
          whiteSpace: 'nowrap'
        }}>
          <div>{totalBatches.toLocaleString()} {totalBatches === 1 ? 'batch' : 'batches'}</div>
          <div style={{ fontSize: '11px', opacity: 0.85 }}>{totalUnits.toLocaleString()} units</div>
        </div>
      </div>

      {/* Products Table */}
      <div style={{ padding: '20px', overflowY: 'auto', flexGrow: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
          <thead>
            <tr style={{ backgroundColor: theme.headRow, borderBottom: `2px solid ${theme.border}` }}>
              <th style={thStyle(theme, 'left')}>Product</th>
              <th style={thStyle(theme, 'right')}>Batches</th>
              <th style={thStyle(theme, 'right')}>Units</th>
            </tr>
          </thead>
          <tbody>
            {products.map(product => {
              const batchList = product.batchList || [];
              const canExpand = batchList.length > 0;
              const isOpen = !!expanded[product.productId];

              return (
                <React.Fragment key={product.productId}>
                  <tr
                    style={{
                      borderBottom: '1px solid #e5e7eb',
                      cursor: canExpand ? 'pointer' : 'default',
                      backgroundColor: isOpen ? theme.headRow : 'transparent',
                      transition: 'background-color 0.15s'
                    }}
                    onClick={canExpand ? () => toggle(product.productId) : undefined}
                    onMouseEnter={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = '#f9fafb'; }}
                    onMouseLeave={(e) => { if (!isOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#1f2937' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {canExpand ? (
                          <span style={{
                            fontSize: '10px',
                            color: theme.border,
                            width: '10px',
                            display: 'inline-block',
                            transform: isOpen ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.15s'
                          }}>▶</span>
                        ) : (
                          <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: theme.border,
                            display: 'inline-block'
                          }}></span>
                        )}
                        <div>
                          <div style={{
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            color: '#6b7280',
                            letterSpacing: '0.5px'
                          }}>
                            {product.productId}
                          </div>
                          <div>{product.productName}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '15px',
                      fontWeight: '600',
                      color: theme.value,
                      verticalAlign: 'top'
                    }}>
                      {product.batches.toLocaleString()}
                    </td>
                    <td style={{
                      padding: '12px 16px',
                      textAlign: 'right',
                      fontSize: '13px',
                      color: '#6b7280',
                      verticalAlign: 'top'
                    }}>
                      {product.units.toLocaleString()}
                    </td>
                  </tr>

                  {canExpand && isOpen && (
                    <tr>
                      <td colSpan="3" style={{ padding: '0 16px 12px 34px', backgroundColor: theme.headRow }}>
                        <BatchTable theme={theme} batches={batchList} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
