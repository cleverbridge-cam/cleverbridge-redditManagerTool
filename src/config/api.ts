// API Configuration
// Automatically detects environment and uses appropriate base URL

const getApiBaseUrl = (): string => {
  // In production (Railway), use environment variable
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  
  // In development, use localhost
  if (import.meta.env.DEV) {
    return "http://localhost:8000";
  }
  
  // Fallback for production if env var not set
  // You'll replace this with your Railway backend URL
  return "https://your-backend-app.railway.app";
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to build full API URLs
export const apiUrl = (path: string): string => {
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};
