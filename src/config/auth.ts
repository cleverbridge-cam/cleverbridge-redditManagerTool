// Authentication configuration
// This fetches credentials from the backend at runtime for better security

export const getAuthConfig = async () => {
  try {
    // Always fetch from backend API for credentials
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
    throw new Error('No authentication credentials available');
  }
};
