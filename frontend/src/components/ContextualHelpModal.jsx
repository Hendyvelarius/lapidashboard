import React, { useEffect, useRef, useState } from 'react';
import { getTopicContent } from '../config/helpContent';
import './ContextualHelpModal.css';

const ContextualHelpModal = ({ topic, onClose, targetRef, dashboardType = 'summary' }) => {
  const modalRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(0); // 0 = "What is", 1 = "Data Source"

  useEffect(() => {
    if (targetRef && targetRef.current && modalRef.current) {
      // Position modal near the target element
      const targetRect = targetRef.current.getBoundingClientRect();
      const modal = modalRef.current;
      const modalHeight = modal.offsetHeight || 400; // estimated height
      const modalWidth = modal.offsetWidth || 400;
      
      // Calculate available space
      const spaceOnRight = window.innerWidth - targetRect.right;
      const spaceOnLeft = targetRect.left;
      const spaceBelow = window.innerHeight - targetRect.bottom;
      const spaceAbove = targetRect.top;
      
      let left, top;
      
      // Horizontal positioning: prefer right, fallback to left
      if (spaceOnRight > modalWidth + 20) {
        left = targetRect.right + 20;
      } else if (spaceOnLeft > modalWidth + 20) {
        left = targetRect.left - modalWidth - 20;
      } else {
        // Center horizontally if no space on sides
        left = Math.max(20, (window.innerWidth - modalWidth) / 2);
      }
      
      // Vertical positioning: try to align with target, but adjust if cut off
      top = targetRect.top;
      
      // If modal would go off bottom, adjust upward
      if (top + modalHeight > window.innerHeight - 20) {
        top = Math.max(20, window.innerHeight - modalHeight - 20);
      }
      
      // If modal would go off top, adjust downward
      if (top < 20) {
        top = 20;
      }
      
      modal.style.left = `${left}px`;
      modal.style.top = `${top}px`;
    }
  }, [targetRef]);

  if (!topic) return null;

  // Reset page when topic changes
  useEffect(() => {
    setCurrentPage(0);
  }, [topic]);

  // Get topic content from centralized config
  const content = getTopicContent(dashboardType, topic);
  if (!content) return null;

  const currentPageData = content.pages[currentPage];
  const totalPages = content.pages.length;

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <>
      <div className="contextual-help-overlay" onClick={onClose}>
        {/* Spotlight effect - highlight target section */}
        {targetRef && targetRef.current && (
          <div 
            className="spotlight-cutout"
            style={{
              top: `${targetRef.current.getBoundingClientRect().top}px`,
              left: `${targetRef.current.getBoundingClientRect().left}px`,
              width: `${targetRef.current.getBoundingClientRect().width}px`,
              height: `${targetRef.current.getBoundingClientRect().height}px`
            }}
          />
        )}
      </div>
      <div ref={modalRef} className="contextual-help-modal">
        <div className="contextual-help-header">
          <h3>{content.title}</h3>
          <button onClick={onClose} className="contextual-help-close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="contextual-help-body">
          {currentPageData.subtitle && (
            <div className="contextual-help-subtitle">{currentPageData.subtitle}</div>
          )}
          <p className="contextual-help-description">{currentPageData.description}</p>
          {currentPageData.details && currentPageData.details.length > 0 && (
            <div className="contextual-help-details">
              <strong>Informasi:</strong>
              <ul>
                {currentPageData.details.map((detail, idx) => (
                  <li key={idx}>{detail}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <div className="contextual-help-pagination">
            <button 
              onClick={goToPrevPage} 
              disabled={currentPage === 0}
              className="pagination-btn"
            >
              ← Sebelumnya
            </button>
            <span className="pagination-indicator">
              {currentPage + 1} / {totalPages}
            </span>
            <button 
              onClick={goToNextPage} 
              disabled={currentPage === totalPages - 1}
              className="pagination-btn"
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default ContextualHelpModal;
