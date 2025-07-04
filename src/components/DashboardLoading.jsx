import React from 'react';
import { useLoading, BallTriangle } from '@agney/react-loading';

const DashboardLoading = ({ loading, text = 'Loading Dashboard...', subtext = 'Sedang mengambil data...' }) => {
  const { containerProps, indicatorEl } = useLoading({ loading, indicator: <BallTriangle width="48" /> });
  if (!loading) return null;
  return (
    <div style={{
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
      transition: 'opacity 0.3s',
    }}>
      <div style={{ marginBottom: 32 }}>
        <img src="/src/assets/LAPILOGO_White.png" alt="Logo" style={{ width: 120, filter: 'drop-shadow(0 2px 8px #4f8cff44)' }} onError={e => { e.target.onerror = null; e.target.src = '/src/assets/LAPILOGO_White.png'; }} />
      </div>
      <div {...containerProps} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {indicatorEl}
        <div style={{ marginTop: 24, fontSize: 22, color: '#4f8cff', fontWeight: 600, letterSpacing: 1 }}>{text}</div>
        <div style={{ marginTop: 8, color: '#b0b8c9', fontSize: 15 }}>{subtext}</div>
      </div>
    </div>
  );
};

export default DashboardLoading;
