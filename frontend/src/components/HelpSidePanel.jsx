import React from 'react';
import { X, Target, Package, AlertCircle, Box, Truck, Archive, Clock, LayoutPanelLeft } from 'lucide-react';
import { getHelpContentForDashboard } from '../config/helpContent';
import './HelpSidePanel.css';

const HelpSidePanel = ({ dashboardType, onTopicSelect, onClose }) => {
  // Get help content from centralized config
  const dashboardContent = getHelpContentForDashboard(dashboardType);

  // Icon mapping
  const iconMap = {
    Target,
    Package,
    AlertCircle,
    Box,
    Truck,
    Archive,
    Clock,
    LayoutPanelLeft
  };

  if (!dashboardContent || !dashboardContent.topics) {
    return (
      <div className="help-side-panel">
        <div className="help-panel-header">
          <h3>Bantuan</h3>
          <button onClick={onClose} className="help-close-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className="help-panel-body">
          <p className="no-help-message">Belum ada panduan untuk halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="help-side-panel">
      <div className="help-panel-header">
        <div>
          <h3>Bantuan Dashboard</h3>
          <p className="help-panel-subtitle">Pilih topik untuk melihat penjelasan</p>
        </div>
        <button onClick={onClose} className="help-close-btn" title="Tutup bantuan">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div className="help-panel-body">
        {Object.values(dashboardContent.topics).map((topic) => {
          const IconComponent = iconMap[topic.icon];
          return (
            <button
              key={topic.id}
              className="help-topic-btn"
              onClick={() => onTopicSelect(topic.id)}
            >
              <div className="help-topic-icon">
                {IconComponent && <IconComponent size={24} />}
              </div>
              <div className="help-topic-content">
                <div className="help-topic-label">{topic.title}</div>
                <div className="help-topic-description">{topic.description}</div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="help-panel-footer">
        <p className="help-footer-text">
          Klik topik untuk melihat penjelasan detail dan sumber data
        </p>
      </div>
    </div>
  );
};

export default HelpSidePanel;
