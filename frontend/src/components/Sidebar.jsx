import { useState } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronDown,
  User,
  LogOut,
  MessageCircle,
  BarChart
} from 'lucide-react'

import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { clearAuthData } from '../utils/auth';

function Sidebar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { user, setIsAuthenticated, isLoading, isDecrypting } = useAuth();
  
  // Extract user information with fallbacks
  const userName = user?.Nama || 'User';
  const userRole = user?.Jabatan || 'Staff';
  
  // Function to truncate long job titles
  const truncateRole = (role, maxLength = 20) => {
    if (role.length <= maxLength) return role;
    return role.substring(0, maxLength) + '...';
  };
  
  // Get user initials for avatar
  const getUserInitials = (name) => {
    if (!name) return 'U';
    const words = name.split(' ');
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
  };
  
  // Handle logout
  const handleLogout = () => {
    clearAuthData();
    setIsAuthenticated(false);
    setUserMenuOpen(false);
    window.location.reload(); // Refresh to trigger auth check
  };

  const location = useLocation();
  return (
    <aside className="sidebar sidebar-dark sidebar-fixed">
      {/* Logo Section */}
      <div className="sidebar-logo">
        <img src="./LAPILOGO_White.png" alt="LAPI Logo" className="logo-image" />
      </div>

      {/* Main Menu Section */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">MENU UTAMA</div>
        <nav className="sidebar-nav">
          <Link to="/" className={`sidebar-btn${location.pathname === '/' ? ' active' : ''}`}> 
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link to="/summary" className={`sidebar-btn${location.pathname === '/summary' ? ' active' : ''}`}> 
            <BarChart size={20} />
            <span>Summary</span>
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
          title={isLoading || isDecrypting ? 'Loading user info...' : `${userName} - ${userRole}`}
        >
          <div className="user-avatar">
            {isLoading || isDecrypting ? '⋯' : getUserInitials(userName)}
          </div>
          <div className="user-details">
            <div className="user-name">
              {isLoading || isDecrypting ? 'Loading...' : userName}
            </div>
            <div className="user-role" title={userRole}>
              {isLoading || isDecrypting ? 'Please wait...' : truncateRole(userRole)}
            </div>
          </div>
          <ChevronDown 
            size={16} 
            className={`user-chevron ${userMenuOpen ? 'open' : ''}`}
          />
        </div>
        
        {/* User Dropdown Menu */}
        {userMenuOpen && (
          <div className="user-dropdown">
            <button className="user-menu-item" onClick={() => {}}>
              <User size={16} />
              <span>Profile</span>
            </button>
            <button className="user-menu-item" onClick={handleLogout}>
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
