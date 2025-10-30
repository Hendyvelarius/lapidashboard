import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import Sidebar from './Sidebar';
import './LandingPage.css';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set greeting based on time of day
  useEffect(() => {
    const hour = currentTime.getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 18) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, [currentTime]);

  // Format time
  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  // Format date
  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get user's first name
  const getFirstName = () => {
    if (!user?.Nama) return 'User';
    const nameParts = user.Nama.split(' ');
    return nameParts[0];
  };

  // Quick access cards
  const quickAccessCards = [
    {
      title: 'Production Dashboard',
      description: 'Pantau status WIP, breakdown PCT, dan output produksi',
      icon: '🏭',
      color: '#3b82f6',
      path: '/production',
      stats: 'Real-time monitoring'
    },
    {
      title: 'Summary Dashboard',
      description: 'Ringkasan metrik utama dan indikator performa',
      icon: '📊',
      color: '#10b981',
      path: '/summary',
      stats: 'Comprehensive view'
    },
    {
      title: 'Reports',
      description: 'Akses laporan detail untuk PCT, WIP, dan analitik',
      icon: '📈',
      color: '#f59e0b',
      path: '/reports',
      stats: 'In-depth analysis'
    },
    {
      title: 'Stock Forecast',
      description: 'Perencanaan inventori dan prediksi permintaan',
      icon: '📦',
      color: '#8b5cf6',
      path: '/stock-forecast',
      stats: 'Planning tools'
    },
  ];

  return (
    <div className="landing-page">
      <Sidebar />
      <div className="landing-content">
        {/* Hero Section */}
        <section className="landing-hero">
          <div className="hero-overlay"></div>
          <div className="hero-content">
            <div className="greeting-section">
              <h1 className="greeting-text">
                {greeting}, <span className="user-name">{getFirstName()}</span>!
              </h1>
              <p className="welcome-subtext">Welcome back to LAPI Manager Dashboard</p>
            </div>

            {/* Live Clock */}
            <div className="clock-widget">
              <div className="clock-time">{formatTime(currentTime)}</div>
              <div className="clock-date">{formatDate(currentTime)}</div>
            </div>
          </div>
        </section>

        {/* Quick Stats Section */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">👤</div>
            <div className="stat-content">
              <div className="stat-label">Logged in as</div>
              <div className="stat-value">{user?.Nama || 'User'}</div>
            </div>
          </div>
          <div className="stat-card job-title-card">
            <div className="stat-icon">💼</div>
            <div className="stat-content">
              <div className="stat-label">Job Title</div>
              <div className="stat-value">{user?.Jabatan || 'Staff'}</div>
            </div>
          </div>
        </section>

        {/* Information Section */}
        <section className="info-section">
          <div className="info-card">
            <div className="info-header">
              <div className="info-icon">💡</div>
              <h3>Getting Started</h3>
            </div>
            <div className="info-body">
              <p>Gunakan sidebar untuk navigasi antar modul, atau klik kartu quick access di bawah untuk langsung ke dashboard yang diinginkan.</p>
            </div>
          </div>

          <div className="info-card">
            <div className="info-header">
              <div className="info-icon">📱</div>
              <h3>Need Help?</h3>
            </div>
            <div className="info-body">
              <p>Jika Anda mengalami kendala atau memerlukan bantuan, silakan hubungi administrator sistem.</p>
              <div className="help-actions">
                <button className="help-btn">Documentation</button>
                <button className="help-btn">Support</button>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Access Section */}
        <section className="quick-access-section">
          <div className="quick-access-grid">
            {quickAccessCards.map((card, index) => (
              <div
                key={index}
                className="access-card"
                onClick={() => navigate(card.path)}
                style={{ '--card-color': card.color }}
              >
                <div className="card-icon">{card.icon}</div>
                <div className="card-content">
                  <h3 className="card-title">{card.title}</h3>
                  <p className="card-description">{card.description}</p>
                  <div className="card-stats">{card.stats}</div>
                </div>
                <div className="card-arrow">→</div>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p>© {currentTime.getFullYear()} LAPI Manager Dashboard. All rights reserved.</p>
          <p className="footer-version">Version 2.0.0</p>
        </footer>
      </div>
    </div>
  );
}
