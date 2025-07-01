import { useState } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Calendar, 
  Settings, 
  HelpCircle,
  ChevronDown,
  User,
  LogOut
} from 'lucide-react'
import logoImage from '../assets/LAPILOGO_White.png'

function Sidebar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <aside className="sidebar sidebar-dark sidebar-fixed">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <img src={logoImage} alt="LAPI Logo" className="logo-image" />
      </div>

      {/* Main Menu Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">MAIN MENU</div>
        <nav className="sidebar-nav">
          <button className="sidebar-btn active">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </button>
          <button className="sidebar-btn" disabled>
            <FileText size={20} />
            <span>Reports</span>
          </button>
          <button className="sidebar-btn" disabled>
            <Users size={20} />
            <span>Employees</span>
          </button>
          <button className="sidebar-btn" disabled>
            <Calendar size={20} />
            <span>Meetings</span>
          </button>
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
