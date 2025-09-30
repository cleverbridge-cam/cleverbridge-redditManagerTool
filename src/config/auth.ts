// Authentication configuration
// Export API URL for use in login requests

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Use API_URL in your login logic, e.g.:
// fetch(`${API_URL}/api/login`, { ... })
