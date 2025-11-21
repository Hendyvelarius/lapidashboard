// Authentication utility functions

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

// Verify auth token with backend
export const verifyAuthToken = async () => {
  try {
    // Get current token using our secure method
    const userInfo = getCurrentUser();
    if (!userInfo) {
      throw new Error('No authentication token found');
    }

    // Get the raw token for verification
    let authToken = sessionStorage.getItem('access_token') || localStorage.getItem('access_token');
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/verify?auth=${encodeURIComponent(authToken)}`);

    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Authentication verification failed:', error);
    throw error;
  }
};

// Store access token securely (localStorage for persistence)
export const storeAccessToken = (token) => {
  try {
    // Store in localStorage (persists across browser sessions)
    localStorage.setItem('access_token', token);
    
    // Also store in sessionStorage for backward compatibility
    sessionStorage.setItem('access_token', token);
    
    return true;
  } catch (error) {
    console.error('Error storing access token:', error);
    return false;
  }
};

// Check if user has valid authentication
export const hasValidAuth = () => {
  try {
    const userInfo = getCurrentUser();
    if (!userInfo) return false;
    
    // Check if token is expired
    const currentTime = Math.floor(Date.now() / 1000);
    if (userInfo.exp && userInfo.exp < currentTime) {
      clearAuthData();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Get current user info from stored token (client-side decode)
export const getCurrentUser = () => {
  try {
    // Primary: get from localStorage (persists across browser sessions)
    let authToken = localStorage.getItem('access_token');
    
    // Fallback to sessionStorage if not in localStorage
    if (!authToken) {
      authToken = sessionStorage.getItem('access_token');
      // If found in sessionStorage, also store in localStorage for persistence
      if (authToken) {
        localStorage.setItem('access_token', authToken);
      }
    }
    
    if (!authToken) {
      return null;
    }

    // Simple JWT decode (payload only, no verification)
    const parts = authToken.split('.');
    if (parts.length !== 3) {
      console.error('Invalid JWT format');
      return null;
    }
    
    const payload = parts[1];
    // Add padding if needed for proper base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    const decodedPayload = atob(paddedPayload);
    const tokenData = JSON.parse(decodedPayload);
    
    const userInfo = {
      user: tokenData.user,
      delegatedTo: tokenData.delegatedTo,
      exp: tokenData.exp,
      iat: tokenData.iat
    };
    
    return userInfo;
  } catch (error) {
    console.error('Error decoding token:', error);
    return null;
  }
};

// Check if token is expired
export const isTokenExpired = () => {
  try {
    const user = getCurrentUser();
    if (!user || !user.exp) {
      return true;
    }
    
    const currentTime = Math.floor(Date.now() / 1000);
    return user.exp < currentTime;
  } catch (error) {
    console.error('Error checking token expiration:', error);
    return true;
  }
};

// Handle URL authentication parameter
export const handleUrlAuth = () => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const authParam = urlParams.get('auth');
    
    if (authParam) {
      // Store the token using our secure storage function
      if (storeAccessToken(authParam)) {
        // Clean up the URL by removing the auth parameter
        const url = new URL(window.location);
        url.searchParams.delete('auth');
        window.history.replaceState({}, document.title, url.pathname + url.search);
        
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error handling URL authentication:', error);
    return false;
  }
};

// Clear all authentication data
export const clearAuthData = () => {
  try {
    // Clear from both storages
    localStorage.removeItem('access_token');
    sessionStorage.removeItem('access_token');
    
    // Clear legacy tokens if they exist
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error clearing authentication data:', error);
  }
};

// Generate TV Mode token with custom expiry
export const generateTVModeToken = (division, expiryOption) => {
  try {
    // Get current user info
    const currentUserInfo = getCurrentUser();
    if (!currentUserInfo || !currentUserInfo.user) {
      console.error('No current user info found');
      return false;
    }

    // Check if user has NT access
    if (currentUserInfo.user.emp_DeptID !== 'NT') {
      console.error('User does not have permission for TV Mode');
      return false;
    }

    const now = new Date();
    const issuedAt = Math.floor(now.getTime() / 1000); // Current time in seconds

    // Calculate expiry based on selection
    let expiryDate = new Date(now);
    switch (expiryOption) {
      case '1week':
        expiryDate.setDate(expiryDate.getDate() + 7);
        break;
      case '1month':
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        break;
      case '6months':
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        break;
      case '1year':
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
      default:
        expiryDate.setDate(expiryDate.getDate() + 7); // Default to 1 week
    }
    
    const expiresAt = Math.floor(expiryDate.getTime() / 1000); // Expiry time in seconds

    // Create new TV Mode user payload
    const tvModeUser = {
      log_NIK: 'TV',
      Nama: 'TV Mode',
      Jabatan: `${division} TV Mode`,
      emp_DeptID: division,
      emp_JobLevelID: 'MGR',
      Pk_ID: currentUserInfo.user.Pk_ID,
      Job_LevelID: currentUserInfo.user.Job_LevelID,
      Inisial_Name: 'TV',
      tokenValid: true,
      expiresAt: expiryDate.toLocaleString('en-US'),
      issuedAt: now.toLocaleString('en-US')
    };

    // Create JWT payload
    const payload = {
      user: tvModeUser,
      delegatedTo: currentUserInfo.delegatedTo,
      exp: expiresAt,
      iat: issuedAt
    };

    // Create a simple JWT-like token (header.payload.signature format)
    // Note: This is NOT cryptographically secure, but matches your existing pattern
    const header = { alg: 'none', typ: 'JWT' };
    
    const base64UrlEncode = (obj) => {
      const jsonString = JSON.stringify(obj);
      const base64 = btoa(jsonString);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };

    const encodedHeader = base64UrlEncode(header);
    const encodedPayload = base64UrlEncode(payload);
    const signature = 'tv-mode-token'; // Simple signature since we're not verifying server-side

    const tvToken = `${encodedHeader}.${encodedPayload}.${signature}`;

    // Store the new token
    const success = storeAccessToken(tvToken);
    
    if (success) {
      console.log('✅ TV Mode token generated successfully');
      console.log('Division:', division);
      console.log('Expires:', expiryDate.toLocaleString());
    }

    return success;
  } catch (error) {
    console.error('Error generating TV Mode token:', error);
    return false;
  }
};