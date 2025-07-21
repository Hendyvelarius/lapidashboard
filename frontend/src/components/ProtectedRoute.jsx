import React from 'react';
import { useAuth } from '../context/AuthContext';
import UnauthorizedPage from './UnauthorizedPage';
import DashboardLoading from './DashboardLoading';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!isAuthenticated) {
    return <UnauthorizedPage />;
  }

  return children;
};

export default ProtectedRoute;
