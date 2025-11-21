import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { generateTVModeToken, clearAuthData } from '../utils/auth';


const SettingsModal = ({ onClose }) => {
  const { user, decryptUserInfo } = useAuth();
  const [tvModeEnabled, setTvModeEnabled] = useState(false);
  const [division, setDivision] = useState('PL');
  const [expiry, setExpiry] = useState('1week');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Check if currently in TV Mode
  const isInTVMode = user?.log_NIK === 'TV';
  
  // Check if user has access to TV Mode (NT department only OR already in TV Mode)
  const hasNTAccess = user?.emp_DeptID === 'NT' || isInTVMode;

  useEffect(() => {
    if (user && isInTVMode) {
      // Restore previous settings if in TV mode
      setDivision(user.emp_DeptID || 'PL');
    }
  }, [user, isInTVMode]);

  const handleSaveSettings = async () => {
    setIsSubmitting(true);

    try {
      // Generate TV Mode token
      const success = generateTVModeToken(division, expiry);
      
      if (success) {
        // Refresh auth context to load new token
        await decryptUserInfo();
        onClose();
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisableTVMode = () => {
    setShowDisableConfirm(true);
  };

  const confirmDisableTVMode = () => {
    // Clear all authentication data
    clearAuthData();
    // Redirect to LMS login page
    window.location.href = 'http://192.168.1.24/lms/';
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content settings-modal-pro">
        <div className="modal-header">
          <span className="modal-title">⚙️ Settings</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>
        <div className="modal-body">
          {/* TV Mode Section */}
          <div className="setting-section">
            <div className="setting-section-header">
              <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                📺 TV Mode
                {!hasNTAccess && (
                  <span style={{ 
                    fontSize: '0.7rem', 
                    backgroundColor: '#ef4444', 
                    color: 'white', 
                    padding: '2px 8px', 
                    borderRadius: '4px',
                    fontWeight: 'normal'
                  }}>
                    Restricted
                  </span>
                )}
              </h3>
            </div>

            {hasNTAccess ? (
              <>
                {isInTVMode ? (
                  <>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      color: '#059669', 
                      backgroundColor: '#d1fae5',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #34d399',
                      marginBottom: '1rem'
                    }}>
                      <strong>✓ TV Mode is currently active</strong>
                      <div style={{ marginTop: '0.5rem' }}>Division: {user?.emp_DeptID || 'Unknown'}</div>
                    </div>
                    <button
                      onClick={handleDisableTVMode}
                      style={{
                        width: '100%',
                        padding: '0.75rem',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '0.9rem',
                        fontWeight: '500',
                        cursor: 'pointer'
                      }}
                    >
                      Disable TV Mode
                    </button>
                  </>
                ) : (
                  <>
                    <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                      Enable TV Mode for extended dashboard display on television screens.
                    </p>

                    <div className="setting-row">
                      <span className="setting-label">Enable TV Mode</span>
                      <label className="switch">
                        <input
                          type="checkbox"
                          checked={tvModeEnabled}
                          onChange={(e) => setTvModeEnabled(e.target.checked)}
                        />
                        <span className="slider round"></span>
                      </label>
                    </div>

                    {tvModeEnabled && (
                  <div style={{ 
                    marginTop: '1rem', 
                    padding: '1rem', 
                    backgroundColor: '#f3f4f6', 
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
                        Division
                      </label>
                      <select
                        value={division}
                        onChange={(e) => setDivision(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="PL">PL</option>
                        <option value="PN1">PN1</option>
                        <option value="PN2">PN2</option>
                        <option value="Quality">Quality</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', fontWeight: '500' }}>
                        Session Expiry
                      </label>
                      <select
                        value={expiry}
                        onChange={(e) => setExpiry(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '6px',
                          border: '1px solid #d1d5db',
                          fontSize: '0.9rem'
                        }}
                      >
                        <option value="1week">1 Week</option>
                        <option value="1month">1 Month</option>
                        <option value="6months">6 Months</option>
                        <option value="1year">1 Year</option>
                      </select>
                    </div>

                    <div style={{ 
                      fontSize: '0.8rem', 
                      color: '#f59e0b', 
                      backgroundColor: '#fffbeb',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #fcd34d'
                    }}>
                      <strong>Note:</strong> Activating TV Mode will create a new session 
                      for the selected division. The session will expire after the chosen duration.
                    </div>
                  </div>
                )}
                  </>
                )}
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#ef4444', fontStyle: 'italic' }}>
                You do not have permission to access TV Mode settings. 
                This feature is only available for IT (NT) department users.
              </p>
            )}
          </div>

          {/* Save Button */}
          {hasNTAccess && !isInTVMode && (
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  fontSize: '0.9rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                disabled={isSubmitting}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  fontSize: '0.9rem',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1
                }}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Disable TV Mode Confirmation Modal */}
      {showDisableConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1001 }}>
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <span className="modal-title">⚠️ Disable TV Mode</span>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', lineHeight: '1.6' }}>
                Disabling TV Mode will log you out and redirect you to the LMS login page.
              </p>
              <p style={{ marginBottom: '1.5rem', lineHeight: '1.6', color: '#6b7280' }}>
                You will need to log in again with your credentials to access the dashboard.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: 'white',
                    color: '#374151',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDisableTVMode}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    fontSize: '0.9rem',
                    cursor: 'pointer'
                  }}
                >
                  Disable & Log Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsModal;
