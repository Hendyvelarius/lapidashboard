import React from 'react';

const DashboardHeader = ({ 
  lastUpdated, 
  refreshing, 
  loading, 
  onRefresh,
  formatTimestamp 
}) => {
  return (
    <div className="dashboard-header">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1 style={{ margin: 0 }}>Dashboard</h1>
          {lastUpdated && (
            <div style={{ 
              fontSize: '14px', 
              color: '#666', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              backgroundColor: '#f8f9fa',
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{ fontSize: '12px' }}>📊</span>
              <span>Last updated: {formatTimestamp(lastUpdated)}</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div className="dashboard-tabs">
            <span className="active">Summary</span>
          </div>
          <button 
            onClick={onRefresh}
            disabled={refreshing || loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px 24px',
              backgroundColor: refreshing ? '#f8f9fa' : '#4f8cff',
              color: refreshing ? '#666' : 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: refreshing ? 'none' : '0 2px 4px rgba(79, 140, 255, 0.2)',
              minHeight: '44px',
              minWidth: '120px'
            }}
            onMouseOver={(e) => {
              if (!refreshing) {
                e.target.style.backgroundColor = '#3a7ae4';
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseOut={(e) => {
              if (!refreshing) {
                e.target.style.backgroundColor = '#4f8cff';
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
