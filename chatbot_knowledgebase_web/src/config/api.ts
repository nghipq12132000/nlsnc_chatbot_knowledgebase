// API Configuration
const API_CONFIG = {
  // Base URL for the API - can be overridden by environment variables
  BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000',
  
  // API endpoints
  ENDPOINTS: {
    FILES_UPLOAD: '/admin/files-upload',
    HEALTH: '/health',
    INVOKE: '/invoke',
    SETTINGS: '/admin/settings',
  }
};

export default API_CONFIG;
