import React from 'react';
import { useAuth } from '../context/AuthContext';
import UnauthorizedPage from './UnauthorizedPage';
import DashboardLoading from './DashboardLoading';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return <DashboardLoading />;
  }

  if (!isAuthenticated) {
    return <UnauthorizedPage />;
  }

  // Department-based authorization check
  const allowedDepartments = ['PL', 'NT'];
  const userDepartment = user?.emp_DeptID;
  
  if (!userDepartment || !allowedDepartments.includes(userDepartment)) {
    return <UnauthorizedPage message="Kamu belum memiliki izin untuk mengakses aplikasi ini." />;
  }

  return children;
};

export default ProtectedRoute;
