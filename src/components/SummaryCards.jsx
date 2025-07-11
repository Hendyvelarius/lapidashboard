import React from 'react';

const SummaryCards = ({ 
  fulfillmentMetrics, 
  fulfillmentLoading, 
  wipTerlambatCount, 
  totalWipCount, 
  onWipTableClick 
}) => {
  return (
    <div className="dashboard-summary-row">
      <div className="summary-card">
        <div className="summary-title">Fulfillment Target</div>
        <div className="summary-value">
          {fulfillmentLoading ? (
            <span className="summary-loading">...</span>
          ) : (
            fulfillmentMetrics.fulfillmentTarget
          )}
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-title">Fulfillment Release</div>
        <div className="summary-value">
          {fulfillmentLoading ? (
            <span className="summary-loading">...</span>
          ) : (
            fulfillmentMetrics.fulfillmentRelease
          )}
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-title">Proses Karantina</div>
        <div className="summary-value">
          {fulfillmentLoading ? (
            <span className="summary-loading">...</span>
          ) : (
            fulfillmentMetrics.quarantined
          )}
        </div>
      </div>
      
      <div className="summary-card">
        <div className="summary-title">WIP Terlambat</div>
        <div className="summary-value">{wipTerlambatCount}</div>
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
