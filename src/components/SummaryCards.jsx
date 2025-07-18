import React from 'react';

const SummaryCards = ({ 
  fulfillmentMetrics, 
  loading, 
  pctAverageValue, 
  totalWipCount, 
  onWipTableClick 
}) => {
  return (
    <div className="dashboard-summary-row">
      <div className="summary-card">
        <div className="summary-title">Fulfillment Target</div>
        <div className="summary-value">
          {loading ? (
            <span className="summary-loading">...</span>
          ) : (
            fulfillmentMetrics.fulfillmentTarget
          )}
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-title">Fulfillment Release</div>
        <div className="summary-value">
          {loading ? (
            <span className="summary-loading">...</span>
          ) : (
            fulfillmentMetrics.fulfillmentRelease
          )}
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-title">Proses Karantina</div>
        <div className="summary-value">
          {loading ? (
            <span className="summary-loading">...</span>
          ) : (
            fulfillmentMetrics.quarantined
          )}
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-title">PCT Average</div>
        <div className="summary-value">
          {loading ? (
            <span className="summary-loading">...</span>
          ) : (
            `${pctAverageValue} Hari`
          )}
        </div>
      </div>
      
      <div 
        className="summary-card summary-card-clickable" 
        style={{ cursor: 'pointer' }} 
        onClick={onWipTableClick}
      >
        <div className="summary-title">Total WIP</div>
        <div className="summary-value">{totalWipCount}</div>
      </div>
    </div>
  );
};

export default SummaryCards;
