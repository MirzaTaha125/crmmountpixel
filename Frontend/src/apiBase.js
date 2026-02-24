const getApiBaseUrl = () => {
  // If running on localhost, use local backend
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  // If running on a LAN IP, use the same IP for backend
  if (/^192\.168\./.test(window.location.hostname) || /^10\./.test(window.location.hostname)) {
    return `http://${window.location.hostname}:3000`;
  }
  // Otherwise, use the same domain as the frontend (for production)
  return `${window.location.protocol}//${window.location.hostname}`;
};

export default getApiBaseUrl; 