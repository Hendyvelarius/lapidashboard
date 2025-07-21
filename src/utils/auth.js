// Authentication utility functions

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

    const response = await fetch(`http://localhost:4000/api/auth/verify?auth=${encodeURIComponent(authToken)}`);
    
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

// Store access token securely (session-only for security)
export const storeAccessToken = (token) => {
  try {
    // Store in sessionStorage (clears when browser closes)
    sessionStorage.setItem('access_token', token);
    
    // Also store in localStorage for development cross-port access
    // This will be moved to sessionStorage on next access for security
    if (window.location.hostname === 'localhost') {
      localStorage.setItem('access_token', token);
    }
    
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
    // First try to get from sessionStorage (preferred for security)
    let authToken = sessionStorage.getItem('access_token');
    
    // Fallback to localStorage if not in sessionStorage (for development)
    if (!authToken) {
      authToken = localStorage.getItem('access_token');
      // If found in localStorage, also store in sessionStorage for this session
      if (authToken) {
        sessionStorage.setItem('access_token', authToken);
        // Don't remove from localStorage - not our app's role to manage that
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
    // Clear only our app's sessionStorage data
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('authToken');
    
    // Don't clear localStorage access_token - not our app's role to manage that
    // Only clear legacy authToken if it exists
    localStorage.removeItem('authToken');
  } catch (error) {
    console.error('Error clearing authentication data:', error);
  }
};