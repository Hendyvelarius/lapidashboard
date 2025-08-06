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

  // Debug: Log user object to see available attributes
  console.log('🔍 User object attributes:', user);

  /*   
    Inisial_Name: "GWN"
    Jabatan: "IT Application Development & Implementation Supervisor"
    Job_LevelID: "5"
    Nama: "Gunawan"
    Pk_ID: "0000000997"
    emp_DeptID: "NT"
    emp_JobLevelID: "SPV"
    log_NIK: "GWN"
  */

  // Department-based authorization check
  const allowedDepartments = ['PL', 'NT'];
  const userDepartment = user?.emp_DeptID;
  
  // User ID check for specific users (checking multiple possible ID field names)
  const userId = user?.log_NIK;
  const allowedUserIds = ['JDV'];
  
  // Check if user has access (either by department OR by specific user ID)
  const hasDepartmentAccess = userDepartment && allowedDepartments.includes(userDepartment);
  const hasUserIdAccess = userId && allowedUserIds.includes(userId);
  
  if (!hasDepartmentAccess && !hasUserIdAccess) {
    return <UnauthorizedPage message="Kamu belum memiliki izin untuk mengakses aplikasi ini." />;
  }

  return children;
};

export default ProtectedRoute;
