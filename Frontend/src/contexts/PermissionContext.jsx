import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSession } from '../session';
import getApiBaseUrl from '../apiBase';

const PermissionContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};

export const PermissionProvider = ({ children }) => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useSession();
  const API_URL = getApiBaseUrl();

  // Fetch user permissions - memoized to prevent infinite loops
  const fetchPermissions = useCallback(async () => {
    // Support both user.id and user._id for compatibility
    const userId = user?.id || user?._id;
    if (!userId) {
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token') || user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${API_URL}/api/roles/user/${userId}/permissions`, {
        headers
      });
      const fetchedPermissions = response.data.permissions || [];
      setPermissions(fetchedPermissions);
      
      // Debug logging in development
      if (import.meta.env.MODE === 'development') {
        console.log('Fetched permissions for user:', userId, fetchedPermissions);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
      console.error('Error details:', error.response?.data);
      console.error('User ID used:', userId);
      console.error('API URL:', `${API_URL}/api/roles/user/${userId}/permissions`);
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?._id, user?.token, API_URL]);

  // Fetch permissions when user changes
  useEffect(() => {
    fetchPermissions();
  }, [user?.id, user?._id, user?.token, fetchPermissions]); // Include fetchPermissions in dependencies

  // Check if user has a specific permission
  const hasPermission = (permissionName) => {
    if (!user) return false;
    if (user.Role === 'Admin') return true; // Admin has all permissions
    return permissions.includes(permissionName);
  };

  // Check if user can view a specific module
  const canView = (module) => {
    const modulePermissions = {
      'clients': 'view_clients',
      'packages': 'view_packages',
      'inquiries': 'view_inquiries',
      'emails': 'view_emails',
      'schedule_calls': 'view_schedule_calls',
      'payments': 'view_payment_generator',
      'projects': 'view_projects',
      'custom_packages': 'view_custom_packages',
      'disputes': 'view_disputes',
      'employees': 'view_employees',
      'expenses': 'view_expenses',
      'users': 'view_users',
      'salary': 'view_salary',
      'reports': 'view_reports',
      'permissions': 'view_permissions',
      '2fa_settings': 'view_2fa_settings',
      'activity_logs': 'view_activity_logs',
      'dashboard': 'view_dashboard'
    };

    const permissionName = modulePermissions[module];
    return permissionName ? hasPermission(permissionName) : false;
  };

  // Check if user can perform a specific action
  const canDo = (action) => {
    return hasPermission(action);
  };

  const value = {
    permissions,
    loading,
    hasPermission,
    canView,
    canDo,
    refreshPermissions: fetchPermissions // This is now memoized via useCallback
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
