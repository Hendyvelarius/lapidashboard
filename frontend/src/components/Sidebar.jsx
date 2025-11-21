import { useState, useEffect } from 'react'
import { 
  LayoutDashboard, 
  FileText, 
  Settings, 
  HelpCircle,
  ChevronDown,
  User,
  LogOut,
  BarChart,
  ChevronLeft,
  ChevronRight,
  Home
} from 'lucide-react'

import { Link, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useHelp } from '../context/HelpContext';
import { clearAuthData } from '../utils/auth';
import HelpSidePanel from './HelpSidePanel';
import SettingsModal from './SettingsModal';

function Sidebar() {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sidebarMinimized, setSidebarMinimized] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const { user, setIsAuthenticated, isLoading, isDecrypting } = useAuth();
  const { helpMode, currentDashboard, isHelpAvailable, toggleHelpMode, selectTopic, closeHelp } = useHelp();
  
  // Extract user information with fallbacks (handle both uppercase and lowercase field names)
  const userName = user?.nama || user?.Nama || 'User';
  const userRole = user?.jabatan || user?.Jabatan || 'Staff';
  
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
    // Redirect first, then clear data
    window.location.href = 'http://192.168.1.24/lms/';
    // Clear auth data after redirect is initiated
    clearAuthData();
  };

  // Toggle sidebar minimize
  const toggleSidebar = () => {
    setSidebarMinimized(!sidebarMinimized);
    setUserMenuOpen(false); // Close user menu when toggling
  };

  // Effect to manage body class for layout adjustments
  useEffect(() => {
    if (sidebarMinimized) {
      document.body.classList.add('sidebar-minimized');
    } else {
      document.body.classList.remove('sidebar-minimized');
    }

    // Cleanup on unmount
    return () => {
      document.body.classList.remove('sidebar-minimized');
    };
  }, [sidebarMinimized]);

  const location = useLocation();

  const handleTopicSelect = (topicId) => {
    selectTopic(topicId);
  };

  return (
    <>
    <aside className={`sidebar sidebar-dark sidebar-fixed ${sidebarMinimized ? 'sidebar-minimized' : ''} ${helpMode ? 'help-mode-active' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        {sidebarMinimized ? (
          <div className="logo-mini">L</div>
        ) : (
          <img src="./LAPILOGO_White.png" alt="LAPI Logo" className="logo-image" />
        )}
      </div>

      {/* Main Menu Section */}
      <div className="sidebar-section">
        {!sidebarMinimized && <div className="sidebar-section-title">MENU UTAMA</div>}
        <nav className="sidebar-nav">
          <Link 
            to="/" 
            className={`sidebar-btn${location.pathname === '/' ? ' active' : ''}`}
            title={sidebarMinimized ? 'Home' : ''}
          > 
            <Home size={20} />
            {!sidebarMinimized && <span>Home</span>}
          </Link>
          <Link 
            to="/summary" 
            className={`sidebar-btn${location.pathname === '/summary' || location.pathname === '/eDashboard' ? ' active' : ''}`}
            title={sidebarMinimized ? 'Summary' : ''}
          > 
            <BarChart size={20} />
            {!sidebarMinimized && <span>Summary</span>}
          </Link>
          {/* Beta Dashboard - Hidden but kept for future use
          <Link 
            to="/beta" 
            className={`sidebar-btn${location.pathname === '/beta' ? ' active' : ''}`}
            title={sidebarMinimized ? 'Beta' : ''}
          > 
            <LayoutDashboard size={20} />
            {!sidebarMinimized && <span>Beta</span>}
          </Link>
          */}
          <Link 
            to="/reports" 
            className={`sidebar-btn${location.pathname === '/reports' ? ' active' : ''}`}
            title={sidebarMinimized ? 'Dashboards' : ''}
          > 
            <FileText size={20} />
            {!sidebarMinimized && <span>Dashboards</span>}
          </Link>
          
          {/* Toggle Button - Styled as navigation item but with distinct appearance */}
          <button 
            className="sidebar-btn sidebar-toggle-btn"
            onClick={toggleSidebar}
            title={sidebarMinimized ? 'Expand sidebar' : 'Minimize sidebar'}
          >
            {sidebarMinimized ? (
              <>
                <ChevronRight size={20} strokeWidth={2.5} />
                {!sidebarMinimized && <span>EXPAND</span>}
              </>
            ) : (
              <>
                <ChevronLeft size={20} strokeWidth={2.5} />
                <span>Hide</span>
              </>
            )}
          </button>
        </nav>
      </div>

      {/* Settings Section */}
      <div className="sidebar-section">
        {!sidebarMinimized && <div className="sidebar-section-title">PENGATURAN</div>}
        <nav className="sidebar-nav">
          <button 
            className="sidebar-btn" 
            onClick={() => setSettingsModalOpen(true)}
            title={sidebarMinimized ? 'Settings' : ''}
          >
            <Settings size={20} />
            {!sidebarMinimized && <span>Settings</span>}
          </button>
          <button 
            className={`sidebar-btn${helpMode ? ' active' : ''}${!isHelpAvailable ? ' disabled' : ''}`}
            onClick={toggleHelpMode}
            disabled={!isHelpAvailable}
            title={sidebarMinimized ? (isHelpAvailable ? 'Help' : 'Help not available for this page') : ''}
          >
            <HelpCircle size={20} />
            {!sidebarMinimized && <span>Help</span>}
          </button>
        </nav>
      </div>

      {/* User Info Section at Bottom */}
      <div className="sidebar-user-section">
        <div 
          className="sidebar-user-info"
          onClick={() => !sidebarMinimized && setUserMenuOpen(!userMenuOpen)}
          title={isLoading || isDecrypting ? 'Loading user info...' : `${userName} - ${userRole}`}
        >
          <div className="user-avatar">
            {isLoading || isDecrypting ? '⋯' : getUserInitials(userName)}
          </div>
          {!sidebarMinimized && (
            <>
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
            </>
          )}
        </div>
        
        {/* User Dropdown Menu */}
        {userMenuOpen && !sidebarMinimized && (
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
    
    {/* Help Side Panel */}
    {helpMode && currentDashboard && (
      <HelpSidePanel 
        dashboardType={currentDashboard}
        onTopicSelect={handleTopicSelect}
        onClose={closeHelp}
      />
    )}
    
    {/* Settings Modal */}
    {settingsModalOpen && (
      <SettingsModal onClose={() => setSettingsModalOpen(false)} />
    )}
    </>
  )
}

export default Sidebar
