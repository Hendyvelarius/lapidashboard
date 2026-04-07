import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { hasPageAccess } from '../config/AccessSettings';
import { FaChartLine, FaClipboardList, FaBoxOpen, FaRegFileAlt, FaFlask, FaIndustry, FaArchive, FaTachometerAlt } from 'react-icons/fa';
import Sidebar from './Sidebar';
import Modal from './Modal';
import './LandingPage.css';

const dashboardCards = [
  {
    Icon: FaTachometerAlt,
    title: "Summary",
    desc: "Dashboard ringkasan keseluruhan performa pabrik.",
    route: "/summary",
    pageName: "summary",
    color: "#4f8cff",
  },
  {
    Icon: FaClipboardList,
    title: "Production",
    desc: "Informasi proses produksi secara keseluruhan.",
    route: "/production",
    pageName: "production",
    color: "#38e6c5",
  },
  {
    Icon: FaIndustry,
    title: "Line PN1",
    desc: "Dashboard produksi pabrik untuk production line PN1.",
    route: "/line-pn1",
    pageName: "line-pn1",
    color: "#8b5cf6",
  },
  {
    Icon: FaIndustry,
    title: "Line PN2",
    desc: "Dashboard produksi pabrik untuk production line PN2.",
    route: "/line-pn2",
    pageName: "line-pn2",
    color: "#ec4899",
  },
  {
    Icon: FaFlask,
    title: "Quality",
    desc: "Dashboard quality: monitoring produk dan material.",
    color: "#22c55e",
    group: true,
    items: [
      { key: "product", label: "Product", desc: "Quality monitoring untuk produk jadi.", icon: <FaFlask size={20} color="#22c55e" />, route: "/quality", pageName: "quality" },
      { key: "material", label: "Material", desc: "Quality Control: monitoring material masuk, inspeksi, dan release.", icon: <FaClipboardList size={20} color="#e57373" />, route: "/quality-control", pageName: "quality-control" },
    ],
  },
  {
    Icon: FaArchive,
    title: "Legacy",
    desc: "Laporan PCT, Finished Goods, dan Work In Progress.",
    color: "#94a3b8",
    group: true,
    items: [
      { key: "pct", label: "Product Cycle Time", desc: "Waktu produksi dari awal hingga akhir.", icon: <FaChartLine size={20} color="#a259ff" />, modal: true, pageName: "pct-reports" },
      { key: "fg", label: "Finished Goods", desc: "Laporan prediksi, penjualan, dan stok produk.", icon: <FaRegFileAlt size={20} color="#ffb347" />, route: "/stock-forecast", pageName: "stock-forecast" },
      { key: "wip", label: "Work In Progress", desc: "Batch produk dalam proses pengerjaan.", icon: <FaBoxOpen size={20} color="#4f8cff" />, route: "/wip", pageName: "wip" },
    ],
  },
];

const pctReports = [
  { title: "PCT Yearly", desc: "Informasi PCT tiap jenis produk dalam 12 bulan terakhir." },
  { title: "PCT Monthly", desc: "Informasi PCT setiap produk dalam periode 1 bulan terakhir." },
];

function LandingGroupCard({ card, onItemClick, user }) {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef(null);
  const Icon = card.Icon;

  // Check if ALL sub-items are unauthorized
  const allUnauthorized = card.items.every(item => !hasPageAccess(item.pageName, user));

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 200);
  };

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  return (
    <div
      className={`lp-card lp-card-group${allUnauthorized ? ' lp-card-unauthorized' : ''}`}
      style={{ '--card-accent': card.color }}
      tabIndex={0}
      role="button"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {allUnauthorized && <span className="unauthorized-badge">Unauthorized</span>}
      <div className="lp-card-body">
        <div className="lp-card-text">
          <h3 className="lp-card-title">{card.title}</h3>
          <p className="lp-card-desc">{card.desc}</p>
          <span className="lp-card-arrow">▾</span>
        </div>
        <div className="lp-card-icon-bg">
          <Icon size={64} color={card.color} />
        </div>
      </div>

      {open && (
        <div className="group-popup" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
          <div className="group-popup-header">
            <span className="group-popup-title">{card.title}</span>
            <button className="group-popup-close" onClick={(e) => { e.stopPropagation(); setOpen(false); }} aria-label="Close">✕</button>
          </div>
          <div className="group-popup-items">
            {card.items.map((item) => {
              const itemAuthorized = hasPageAccess(item.pageName, user);
              return (
                <div
                  key={item.key}
                  className={`group-popup-item${!itemAuthorized ? ' landing-popup-item-unauthorized' : ''}`}
                  tabIndex={0}
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (itemAuthorized) {
                      onItemClick(item);
                      setOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && itemAuthorized) {
                      e.stopPropagation();
                      onItemClick(item);
                      setOpen(false);
                    }
                  }}
                >
                  <div className="group-popup-item-icon">{item.icon}</div>
                  <div className="group-popup-item-text">
                    <div className="group-popup-item-label">
                      {item.label}
                      {!itemAuthorized && <span className="unauthorized-badge-small">Unauthorized</span>}
                    </div>
                    <div className="group-popup-item-desc">{item.desc}</div>
                  </div>
                  {itemAuthorized && <div className="group-popup-item-arrow">→</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [greeting, setGreeting] = useState('');
  const [pctModalOpen, setPctModalOpen] = useState(false);

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

  const handleCardClick = (card) => {
    if (!hasPageAccess(card.pageName, user)) return;
    if (card.route) {
      navigate(card.route);
    }
  };

  const handleGroupItemClick = (item) => {
    if (item.modal) {
      setPctModalOpen(true);
    } else if (item.route) {
      navigate(item.route);
    }
  };

  const handlePctReportClick = (reportTitle) => {
    setPctModalOpen(false);
    if (reportTitle === "PCT Yearly") {
      navigate("/reports/pcttahunan");
    }
    if (reportTitle === "PCT Monthly") {
      navigate("/reports/pct-monthly");
    }
  };

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

        {/* Quick Access Section */}
        <section className="quick-access-section">
          <div className="landing-dashboard-grid">
            {dashboardCards.map((card, idx) => {
              if (card.group) {
                return (
                  <LandingGroupCard key={idx} card={card} onItemClick={handleGroupItemClick} user={user} />
                );
              }
              const authorized = hasPageAccess(card.pageName, user);
              const Icon = card.Icon;
              return (
                <div
                  key={idx}
                  className={`lp-card${!authorized ? ' lp-card-unauthorized' : ''}`}
                  style={{ '--card-accent': card.color }}
                  tabIndex={0}
                  role="button"
                  onClick={() => handleCardClick(card)}
                >
                  {!authorized && <span className="unauthorized-badge">Unauthorized</span>}
                  <div className="lp-card-body">
                    <div className="lp-card-text">
                      <h3 className="lp-card-title">{card.title}</h3>
                      <p className="lp-card-desc">{card.desc}</p>
                      <span className="lp-card-arrow">→</span>
                    </div>
                    <div className="lp-card-icon-bg">
                      <Icon size={64} color={card.color} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <Modal open={pctModalOpen} onClose={() => setPctModalOpen(false)} title="Laporan PCT (Product Cycle Time)">
          <div className="modal-list">
            {pctReports.map((r, i) => (
              <div 
                className="modal-list-item" 
                key={i} 
                tabIndex={0} 
                role="button"
                onClick={() => handlePctReportClick(r.title)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handlePctReportClick(r.title);
                  }
                }}
              >
                <div className="modal-list-item-title">{r.title}</div>
                <div className="modal-list-item-desc">{r.desc}</div>
              </div>
            ))}
          </div>
        </Modal>

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

        {/* Footer */}
        <footer className="landing-footer">
          <p>© {currentTime.getFullYear()} LAPI Manager Dashboard. All rights reserved.</p>
          <p className="footer-version">Version 2.0.0</p>
        </footer>
      </div>
    </div>
  );
}
