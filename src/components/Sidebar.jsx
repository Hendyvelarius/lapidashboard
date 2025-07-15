import { useState } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronDown,
  User,
  LogOut,
  MessageCircle
} from 'lucide-react'

import { Link, useLocation } from 'react-router';
import logoImage from '../assets/LAPILOGO_White.png'

function Sidebar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const location = useLocation();
  return (
    <aside className="sidebar sidebar-dark sidebar-fixed">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <img src={logoImage} alt="LAPI Logo" className="logo-image" />
      </div>

      {/* Main Menu Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">MENU UTAMA</div>
        <nav className="sidebar-nav">
          <Link to="/" className={`sidebar-btn${location.pathname === '/' ? ' active' : ''}`}> 
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/reports" className={`sidebar-btn${location.pathname === '/reports' ? ' active' : ''}`}> 
            <FileText size={20} />
            <span>Reports</span>
          </Link>
          <Link to="/ai" className={`sidebar-btn${location.pathname === '/ai' ? ' active' : ''}`}> 
            <MessageCircle size={20} />
            <span>AI Assistant</span>
          </Link>
        </nav>
      </div>

      {/* Settings Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">PENGATURAN</div>
        <nav className="sidebar-nav">
          <button className="sidebar-btn" disabled>
            <Settings size={20} />
            <span>Settings</span>
          </button>
          <button className="sidebar-btn" disabled>
            <HelpCircle size={20} />
            <span>Help</span>
          </button>
        </nav>
      </div>

      {/* User Info Section at Bottom */}
      <div className="sidebar-user-section">
        <div 
          className="sidebar-user-info"
          onClick={() => setUserMenuOpen(!userMenuOpen)}
        >
          <div className="user-avatar">R</div>
          <div className="user-details">
            <div className="user-name">Mr. Risang</div>
            <div className="user-role">Head of Plant</div>
          </div>
          <ChevronDown 
            size={16} 
            className={`user-chevron ${userMenuOpen ? 'open' : ''}`}
          />
        </div>
        
        {/* User Dropdown Menu */}
        {userMenuOpen && (
          <div className="user-dropdown">
            <button className="user-menu-item" onClick={() => console.log('Profile clicked')}>
              <User size={16} />
              <span>Profile</span>
            </button>
            <button className="user-menu-item" onClick={() => console.log('Logout clicked')}>
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}

export default Sidebar
