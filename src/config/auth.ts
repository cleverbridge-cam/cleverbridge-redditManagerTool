// Authentication configuration
// This fetches credentials from the backend at runtime for better security

export const getAuthConfig = async () => {
  try {
    // First try environment variables (for local development)
    let username = import.meta.env.VITE_AUTH_USERNAME;
    let password = import.meta.env.VITE_AUTH_PASSWORD;

    // If environment variables are available, use them
    if (username && password) {
      return { username, password };
    }

    // Otherwise, fetch from backend API
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const response = await fetch(`${apiUrl}/api/config`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch config');
    }
    
    const config = await response.json();
    return {
      username: config.auth.username,
      password: config.auth.password
    };
    
  } catch (error) {
    console.error('Failed to get auth config:', error);
    // Fallback - but this should rarely be used now
    console.warn('Using fallback authentication credentials');
    return {
      username: 'admin',
      password: 'reddit123'
    };
  }
};
