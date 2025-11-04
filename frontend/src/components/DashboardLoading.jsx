import React from 'react';

// Simple CSS animation spinner component
const LoadingSpinner = ({ size = 48, color = '#4f8cff' }) => {
  const spinnerStyle = {
    width: size,
    height: size,
    border: `4px solid rgba(79, 140, 255, 0.2)`,
    borderTop: `4px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  return (
    <div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={spinnerStyle}></div>
    </div>
  );
};

const DashboardLoading = ({ loading, text = 'Loading Dashboard...', subtext = 'Sedang mengambil data...', fullscreen = false, coverContentArea = false }) => {
  if (!loading) return null;
  
  // Determine positioning based on props
  let containerStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(26,35,50,0.92)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'auto',
    transition: 'opacity 0.3s, left 0.3s ease, width 0.3s ease',
  };
  
  if (fullscreen) {
    containerStyle.position = 'fixed';
    containerStyle.width = '100vw';
    containerStyle.height = '100vh';
  } else if (coverContentArea) {
    containerStyle.position = 'fixed';
    containerStyle.top = 0;
    containerStyle.left = '240px'; // sidebar width (will be overridden by CSS for minimized state)
    containerStyle.width = 'calc(100vw - 240px)';
    containerStyle.height = '100vh';
  }
  
  // Add class name for content area coverage to enable CSS-based responsive adjustments
  const className = coverContentArea ? 'dashboard-loading-content-area' : '';
  
  return (
    <div style={containerStyle} className={className}>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Adjust loading screen when sidebar is minimized */
        .sidebar-minimized .dashboard-loading-content-area {
          left: 70px !important;
          width: calc(100vw - 70px) !important;
        }
      `}</style>
      <div style={{ marginBottom: 32 }}>
        <img src="./LAPILOGO_White.png" alt="Logo" style={{ width: 120, filter: 'drop-shadow(0 2px 8px #4f8cff44)' }} onError={e => { e.target.onerror = null; e.target.src = '/src/assets/LAPILOGO_White.png'; }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <LoadingSpinner size={48} color="#4f8cff" />
        <div style={{ marginTop: 24, fontSize: 22, color: '#4f8cff', fontWeight: 600, letterSpacing: 1 }}>{text}</div>
        <div style={{ marginTop: 8, color: '#b0b8c9', fontSize: 15 }}>{subtext}</div>
      </div>
    </div>
  );
};

export default DashboardLoading;
