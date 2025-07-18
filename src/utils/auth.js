// Authentication utility functions

// Verify auth token with backend
export const verifyAuthToken = async () => {
  try {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`http://localhost:4000/api/auth/verify?auth=${encodeURIComponent(authToken)}`);
    
    if (!response.ok) {
      throw new Error(`Authentication failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Authentication verification successful:', data);
    return data;
  } catch (error) {
    console.error('Authentication verification failed:', error);
    throw error;
  }
};

// Get current user info from stored token (client-side decode)
export const getCurrentUser = () => {
  try {
    const authToken = localStorage.getItem('authToken');
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
    
    return {
      user: tokenData.user,
      delegatedTo: tokenData.delegatedTo,
      exp: tokenData.exp,
      iat: tokenData.iat
    };
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
