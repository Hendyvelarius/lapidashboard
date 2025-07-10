import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext.jsx';


const SettingsModal = ({ onClose }) => {
  const { theme, toggleTheme } = useContext(ThemeContext);

  return (
    <div className="modal-overlay">
      <div className="modal-content settings-modal-pro">
        <div className="modal-header">
          <span className="modal-title">Settings</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          <div className="setting-row">
            <span className="setting-label">Dark Mode</span>
            <label className="switch">
              <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
