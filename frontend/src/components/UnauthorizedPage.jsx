import React from 'react';

const UnauthorizedPage = ({ message }) => {
  const defaultMessage = "Mohon Maaf, Kamu tidak memiliki otoritas untuk mengakses aplikasi ini.";
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      background: 'linear-gradient(120deg, #e0e7ff 0%, #f0f4f8 100%)',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'white',
        padding: '3rem',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '500px',
        margin: '2rem'
      }}>
        <div style={{
          fontSize: '3rem',
          marginBottom: '1rem',
          color: '#ef4444'
        }}>
          🚫
        </div>
        <h1 style={{
          fontSize: '1.5rem',
          color: '#1f2937',
          marginBottom: '1rem',
          fontWeight: 600
        }}>
          Akses Ditolak
        </h1>
        <p style={{
          fontSize: '1rem',
          color: '#6b7280',
          lineHeight: '1.6',
          margin: 0
        }}>
          {message || defaultMessage}
        </p>
        <div style={{
          marginTop: '2rem',
          padding: '1rem',
          background: '#f3f4f6',
          borderRadius: '8px',
          fontSize: '0.875rem',
          color: '#374151'
        }}>
          Silakan hubungi administrator sistem jika Anda merasa ini adalah kesalahan.
        </div>
      </div>
    </div>
  );
};

export default UnauthorizedPage;
