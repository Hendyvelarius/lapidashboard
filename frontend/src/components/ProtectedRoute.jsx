import React from 'react';
import { useAuth } from '../context/AuthContext';
import UnauthorizedPage from './UnauthorizedPage';
import DashboardLoading from './DashboardLoading';
import { checkPageAccess } from '../config/AccessSettings';

const ProtectedRoute = ({ children, pageName = 'default' }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <DashboardLoading />;
  }

  // First, check if user is authenticated (logged in)
  // This applies to ALL pages - even if a page doesn't require specific permissions,
  // users must still be logged in to access the application
  if (!isAuthenticated) {
    return <UnauthorizedPage message="Silakan login terlebih dahulu untuk mengakses aplikasi." />;
  }

  // Then check page-specific access using the new settings
  const accessCheck = checkPageAccess(pageName, user);

  // If user doesn't have access to this specific page
  if (!accessCheck.hasAccess) {
    return <UnauthorizedPage message={`Akses ditolak: ${accessCheck.reason}`} />;
  }

  return children;
};

export default ProtectedRoute;
