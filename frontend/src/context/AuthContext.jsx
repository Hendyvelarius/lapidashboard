import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrentUser, handleUrlAuth } from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const DEMO_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImxvZ19OSUsiOiJUUlMiLCJOYW1hIjoiVGFyc2lzaXVzIFJpc2FuZyBTYXJ0b25kbyIsIkphYmF0YW4iOiJIZWFkIG9mIFBsYW50IiwiSm9iX0xldmVsSUQiOiIxIiwiUGtfSUQiOiIwMDAwMDAyMzQ4IiwiSW5pc2lhbF9OYW1lIjoiVFJTIiwiZW1wX0RlcHRJRCI6IlBMIiwiZW1wX0pvYkxldmVsSUQiOiJQTCJ9LCJkZWxlZ2F0ZWRUbyI6eyJsb2dfTklLIjoiR1dOIiwiTmFtYSI6Ikd1bmF3YW4iLCJKYWJhdGFuIjoiSVQgQXBwbGljYXRpb24gRGV2ZWxvcG1lbnQgJiBJbXBsZW1lbnRhdGlvbiBTdXBlcnZpc29yIiwiSm9iX0xldmVsSUQiOiI1IiwiUGtfSUQiOiIwMDAwMDAwOTk3IiwiSW5pc2lhbF9OYW1lIjoiR1dOIiwiZW1wX0RlcHRJRCI6Ik5UIiwiZW1wX0pvYkxldmVsSUQiOiJTUFYifSwiaWF0IjoxNzUzMDg1MjYxLCJleHAiOjE3NTMxNzE2NjF9.CIns3GY-cLBDwLv2BCMXQrPY770ES63aPlHfj1ylO-Q";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Function to decrypt and get user info
  const decryptUserInfo = async () => {
    setIsDecrypting(true);

    const hasUrlAuth = await handleUrlAuth();
    let currentUser = getCurrentUser();
    if (!currentUser && !hasUrlAuth) {
      localStorage.setItem('access_token', DEMO_TOKEN)
    }

    try {
      const userInfo = getCurrentUser();
      
      if (userInfo && userInfo.user) {
        setUser(userInfo.user);
        setIsAuthenticated(true);
        return userInfo.user;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (error) {
      console.error('❌ Authentication check failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      return null;
    } finally {
      setIsDecrypting(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      
      // First, check for URL auth parameter
      const foundUrlAuth = handleUrlAuth();
      
      // Then check for existing authentication
      await decryptUserInfo();
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isDecrypting,
    setUser,
    setIsAuthenticated,
    decryptUserInfo // Expose function for manual refresh
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
