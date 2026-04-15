const getApiBaseUrl = () => {
  // Check if API URL is provided via environment variable (Vite)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, ''); // Remove trailing slash if present
  }

  // Fallback logic for local development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:5001';
  }

  if (/^192\.168\./.test(window.location.hostname) || /^10\./.test(window.location.hostname)) {
    return `http://${window.location.hostname}:5001`;
  }

  return `${window.location.protocol}//${window.location.hostname}`;
};

export default getApiBaseUrl; 