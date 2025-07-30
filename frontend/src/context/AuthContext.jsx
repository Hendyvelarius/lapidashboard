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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isDecrypting, setIsDecrypting] = useState(false);

  // Function to decrypt and get user info
  const decryptUserInfo = async () => {
    setIsDecrypting(true);

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
