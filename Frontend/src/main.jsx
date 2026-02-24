import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { SessionProvider } from './session';
import { PermissionProvider } from './contexts/PermissionContext';
import axios from 'axios';
import './App.css';
// Add axios interceptor to attach JWT token to all requests
axios.interceptors.request.use(
  (config) => {
    // Check multiple token sources for compatibility
    const token = localStorage.getItem('token') || 
                  (() => {
                    try {
                      const user = JSON.parse(localStorage.getItem('crm_user') || 'null');
                      return user?.token;
                    } catch {
                      return null;
                    }
                  })();
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <SessionProvider>
      <PermissionProvider>
        <App />
      </PermissionProvider>
    </SessionProvider>
  </StrictMode>,
)
