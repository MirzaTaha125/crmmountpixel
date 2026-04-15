import React, { useEffect, useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaUsers, FaUserTie, FaUser, FaBoxOpen, FaEnvelope, FaCreditCard, FaDollarSign, FaChartLine, FaTachometerAlt, FaUserCog, FaMoneyCheckAlt, FaCalendarAlt, FaShieldAlt, FaArrowUp, FaArrowDown, FaCheckCircle, FaClock, FaTimesCircle, FaFileInvoice, FaUserCheck, FaUserTimes, FaBell } from 'react-icons/fa';

function UserDashboardPage({ clients, users, employees, colors: colorsProp, user, setActiveTab, canView }) {
  const colors = colorsProp || getColors();
  const [_mostPopularPackage, setMostPopularPackage] = useState('');
  const [_recentInquiries, setRecentInquiries] = useState([]);
  const [_recentPaymentLinks, setRecentPaymentLinks] = useState([]);
  const [allCustomPackages, setAllCustomPackages] = useState([]);
  const [allPaymentLinks, setAllPaymentLinks] = useState([]);
  const [allPaymentHistory, setAllPaymentHistory] = useState([]);
  const [allInquiries, setAllInquiries] = useState([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [allTime, setAllTime] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);

  const API_URL = getApiBaseUrl();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    // Only fetch data if user has permission to view the related module
    if (canView('custom_packages')) {
      fetchCustomPackages();
    }
    if (canView('payments')) {
      fetchPaymentLinks();
      fetchPaymentHistory();
    }
    if (canView('inquiries')) {
      fetchInquiries();
      fetchRecentInquiries();
    }
    if (canView('payments')) {
      fetchPopularPackage();
      fetchRecentPaymentLinks();
    }
    
    if (canView('clients')) {
      fetchAssignments();
    }
    fetchNotifications();
    
    // Poll for notifications every 30 seconds
    const notificationInterval = setInterval(() => {
      fetchNotifications();
    }, 30000);
    
    return () => clearInterval(notificationInterval);
  }, [canView]);

  const fetchCustomPackages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/custom-packages`, { headers: getAuthHeaders() });
      setAllCustomPackages(res.data || []);
    } catch {}
  };

  const fetchPaymentLinks = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/payment-links`, { headers: getAuthHeaders() });
      setAllPaymentLinks(res.data || []);
    } catch {}
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/payment-history`, { headers: getAuthHeaders() });
      setAllPaymentHistory(res.data || []);
    } catch {}
  };

  const fetchInquiries = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inquiries`, { headers: getAuthHeaders() });
      setAllInquiries(res.data.inquiries || res.data || []);
    } catch {}
  };

  const fetchPopularPackage = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/payment-links`, { headers: getAuthHeaders() });
      const counts = {};
      res.data.forEach(l => { counts[l.packageName] = (counts[l.packageName] || 0) + 1; });
      let max = 0, popular = '';
      Object.entries(counts).forEach(([name, count]) => { if (count > max) { max = count; popular = name; } });
      setMostPopularPackage(popular || 'N/A');
    } catch {}
  };

  const fetchRecentInquiries = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/inquiries`, { headers: getAuthHeaders() });
      setRecentInquiries((res.data.inquiries || res.data).slice(0, 5));
    } catch {}
  };

  const fetchRecentPaymentLinks = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/payment-links`, { headers: getAuthHeaders() });
      setRecentPaymentLinks(res.data.slice(0, 5));
    } catch {}
  };

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/assignments`, { headers: getAuthHeaders() });
      setAssignments(res.data || []);
    } catch {}
  };

  const fetchNotifications = async () => {
    try {
      // Get current user to check if admin
      const currentUser = JSON.parse(localStorage.getItem('crm_user') || '{}');
      const isAdmin = currentUser.Role === 'Admin';
      
      // Fetch assignments if not admin (to filter notifications)
      let assignedClientIds = [];
      if (!isAdmin) {
        try {
          const assignmentsRes = await axios.get(`${API_URL}/api/assignments`, { headers: getAuthHeaders() });
          const userAssignments = assignmentsRes.data || [];
          assignedClientIds = userAssignments.map(a => {
            const clientId = a.clientId?._id || a.clientId;
            return clientId ? (clientId.toString ? clientId.toString() : String(clientId)) : null;
          }).filter(Boolean);
        } catch (err) {
          console.error('Error fetching assignments for notifications:', err);
        }
      }
      
      // Fetch recent activity logs for payments
      const paymentRes = await axios.get(`${API_URL}/api/activity-logs?limit=20&action=payment_completed`, { headers: getAuthHeaders() }).catch((err) => {
        console.error('Error fetching payment notifications:', err);
        return { data: { logs: [] } };
      });
      
      const paymentLogs = paymentRes.data.logs || paymentRes.data || [];
      
      
      // For non-admin users, filter to only show notifications for assigned clients
      if (!isAdmin && assignedClientIds.length > 0) {
        
        // Also filter payment logs by assigned clients
        const filteredPaymentLogs = paymentLogs.filter(log => {
          const logClientId = log.details?.clientId;
          if (!logClientId) return false;
          const clientIdStr = logClientId.toString ? logClientId.toString() : String(logClientId);
          return assignedClientIds.includes(clientIdStr);
        });
        
        // Combine filtered logs
        const allLogs = [...filteredPaymentLogs]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20);
        
        // Get the last checked time from localStorage
        const lastChecked = localStorage.getItem('dashboardNotificationsLastChecked');
        const lastCheckedTime = lastChecked ? new Date(lastChecked) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Mark as unread if created after last checked time
        const notificationsWithUnread = allLogs.map(log => ({
          ...log,
          isUnread: new Date(log.createdAt) > lastCheckedTime
        }));
        
        setNotifications(notificationsWithUnread);
        setUnreadCount(notificationsWithUnread.filter(n => n.isUnread).length);
      } else {
        // Admin sees all notifications
        const allLogs = [...paymentLogs]
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
          .slice(0, 20);
        
        // Get the last checked time from localStorage
        const lastChecked = localStorage.getItem('dashboardNotificationsLastChecked');
        const lastCheckedTime = lastChecked ? new Date(lastChecked) : new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        // Mark as unread if created after last checked time
        const notificationsWithUnread = allLogs.map(log => ({
          ...log,
          isUnread: new Date(log.createdAt) > lastCheckedTime
        }));
        
        setNotifications(notificationsWithUnread);
        setUnreadCount(notificationsWithUnread.filter(n => n.isUnread).length);
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      console.error('Error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      // Set empty arrays on error to prevent crashes
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markNotificationsAsRead = () => {
    localStorage.setItem('dashboardNotificationsLastChecked', new Date().toISOString());
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, isUnread: false })));
  };

  const filterByDate = (arr, dateField = 'createdAt') => {
    if (allTime || (!dateFrom && !dateTo)) return arr;
    const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
    const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
    return arr.filter(item => {
      if (!item || !item[dateField]) return false;
      const d = new Date(item[dateField]);
      if (isNaN(d.getTime())) return false;
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };

  // Apply date filters to all data
  const filteredClients = filterByDate(clients || []);
  const filteredEmployees = filterByDate(employees || [], 'createdAt');
  const filteredUsers = filterByDate(users || [], 'createdAt');
  const filteredCustomPackages = filterByDate(allCustomPackages);
  const filteredInquiriesData = filterByDate(allInquiries);
  const filteredPaymentLinksData = filterByDate(allPaymentLinks);

  // Get recent items
  const filteredRecentClients = [...filteredClients].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const filteredInquiries = [...filteredInquiriesData].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  const _filteredPaymentLinks = [...filteredPaymentLinksData].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);

  // Calculate statistics
  const totalClients = filteredClients.length;
  const totalEmployees = filteredEmployees.length;
  const _totalUsers = filteredUsers.length;
  const customPackagesCount = filteredCustomPackages.length;
  const inquiriesCount = filteredInquiriesData.length;
  
  // Calculate assigned and unassigned clients
  const assignedClientIds = new Set(
    assignments
      .map(a => {
        const clientId = a.clientId?._id || a.clientId;
        return clientId ? (clientId.toString ? clientId.toString() : String(clientId)) : null;
      })
      .filter(Boolean)
  );
  const assignedClients = filteredClients.filter(c => {
    const clientId = c._id?.toString() || c._id?.toString() || String(c._id);
    return assignedClientIds.has(clientId);
  }).length;
  const _unassignedClients = totalClients - assignedClients;
  
  // Payment Analytics
  // Revenue is calculated from PaymentHistory (actual money received with status "Completed")
  const allCompletedPayments = (allPaymentHistory || []).filter(p => p.status === 'Completed');
  
  // Filter completed payments by date if filters are active
  const filteredCompletedPaymentsByDate = allTime || (!dateFrom && !dateTo) 
    ? allCompletedPayments 
    : allCompletedPayments.filter(p => {
        const paymentDate = p.paymentDate;
        if (!paymentDate) return false;
        const from = dateFrom ? new Date(dateFrom + 'T00:00:00') : null;
        const to = dateTo ? new Date(dateTo + 'T23:59:59') : null;
        const d = new Date(paymentDate);
        if (isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
  
  const completedPayments = filteredCompletedPaymentsByDate;
  const pendingPayments = filteredPaymentLinksData.filter(p => p.status === 'Pending');
  const expiredPayments = filteredPaymentLinksData.filter(p => p.status === 'Expired');
  
  // Calculate revenue from PaymentHistory (actual money received)
  const totalRevenue = completedPayments.reduce((sum, p) => {
    const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount || 0);
    const taxFee = typeof p.taxFee === 'number' ? p.taxFee : parseFloat(p.taxFee || 0);
    const total = (isNaN(amount) ? 0 : amount) + (isNaN(taxFee) ? 0 : taxFee);
    return sum + total;
  }, 0);
  
  const pendingRevenue = pendingPayments.reduce((sum, p) => {
    const amount = typeof p.total === 'number' ? p.total : parseFloat(p.total);
    return sum + (isNaN(amount) ? 0 : amount);
  }, 0);
  const totalPayments = filteredPaymentLinksData.length;
  const paidPaymentsCount = filteredPaymentLinksData.filter(p => p.status === 'Paid').length;
  const paymentSuccessRate = totalPayments > 0 ? ((paidPaymentsCount / totalPayments) * 100).toFixed(1) : 0;

  // Calculate growth (comparing current month vs last month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Current month: first day of current month to now
  const currentMonthStart = new Date(currentYear, currentMonth, 1);
  const currentMonthEnd = now;
  
  // Last month: first day to last day of previous month
  const lastMonthStart = new Date(currentYear, currentMonth - 1, 1);
  const lastMonthEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);
  
  const recentClients = filteredClients.filter(c => {
    const date = new Date(c.createdAt || 0);
    return date >= currentMonthStart && date <= currentMonthEnd;
  }).length;
  const previousClients = filteredClients.filter(c => {
    const date = new Date(c.createdAt || 0);
    return date >= lastMonthStart && date <= lastMonthEnd;
  }).length;
  const _clientGrowth = previousClients > 0 ? (((recentClients - previousClients) / previousClients) * 100).toFixed(1) : recentClients > 0 ? 100 : 0;

  // Calculate revenue growth: current month vs last month
  const currentMonthRevenue = (allCompletedPayments || []).filter(p => {
    const paidDate = p.paymentDate ? new Date(p.paymentDate) : null;
    if (!paidDate) return false;
    return paidDate >= currentMonthStart && paidDate <= currentMonthEnd;
  }).reduce((sum, p) => {
    const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount || 0);
    const taxFee = typeof p.taxFee === 'number' ? p.taxFee : parseFloat(p.taxFee || 0);
    return sum + (isNaN(amount) ? 0 : amount) + (isNaN(taxFee) ? 0 : taxFee);
  }, 0);
  
  const lastMonthRevenue = (allCompletedPayments || []).filter(p => {
    const paidDate = p.paymentDate ? new Date(p.paymentDate) : null;
    if (!paidDate) return false;
    return paidDate >= lastMonthStart && paidDate <= lastMonthEnd;
  }).reduce((sum, p) => {
    const amount = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount || 0);
    const taxFee = typeof p.taxFee === 'number' ? p.taxFee : parseFloat(p.taxFee || 0);
    return sum + (isNaN(amount) ? 0 : amount) + (isNaN(taxFee) ? 0 : taxFee);
  }, 0);
  const revenueGrowth = lastMonthRevenue > 0 ? (((currentMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100).toFixed(1) : currentMonthRevenue > 0 ? 100 : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };
  
  // Map tabId to permission module
  const _getPermissionForTab = (tabId) => {
    const tabPermissionMap = {
      'clients': 'clients',
      'payment-generator': 'payments',
      'employees': 'employees',
      'inquiries': 'inquiries',
      'custom-packages': 'custom_packages'
    };
    return tabPermissionMap[tabId] || null;
  };

  // Define all stats cards
  const allStats = [
    { 
      icon: FaUserCheck, 
      label: 'Assigned Clients', 
      value: assignedClients, 
      color: '#10b981', 
      bg: '#d1fae5',
      tabId: 'clients',
      filterValue: 'assigned',
      requiredPermission: 'clients'
    },
    { 
      icon: FaDollarSign, 
      label: 'Total Revenue', 
      value: formatCurrency(totalRevenue), 
      color: '#10b981', 
      bg: '#d1fae5',
      growth: revenueGrowth,
      growthLabel: 'vs last month',
      currentMonthValue: formatCurrency(currentMonthRevenue),
      lastMonthValue: formatCurrency(lastMonthRevenue),
      tabId: 'payment-generator',
      requiredPermission: 'payments'
    },
    { 
      icon: FaFileInvoice, 
      label: 'Total Payments', 
      value: totalPayments, 
      color: '#f59e0b', 
      bg: '#fef3c7',
      subValue: `${completedPayments.length} completed`,
      tabId: 'payment-generator',
      requiredPermission: 'payments'
    },
    { 
      icon: FaUserTie, 
      label: 'Total Employees', 
      value: totalEmployees, 
      color: '#3b82f6', 
      bg: '#dbeafe',
      tabId: 'employees',
      requiredPermission: 'employees'
    },
    { 
      icon: FaEnvelope, 
      label: 'Inquiries', 
      value: inquiriesCount, 
      color: '#8b5cf6', 
      bg: '#ede9fe',
      tabId: 'inquiries',
      requiredPermission: 'inquiries'
    },
    { 
      icon: FaBoxOpen, 
      label: 'Custom Packages', 
      value: customPackagesCount, 
      color: '#ec4899', 
      bg: '#fce7f3',
      tabId: 'custom-packages',
      requiredPermission: 'custom_packages'
    },
  ];

  // Filter stats based on permissions
  const stats = allStats.filter(stat => {
    if (!stat.requiredPermission) return true;
    return canView(stat.requiredPermission);
  });

  // Payment Status Distribution (for PaymentLinks)
  const paymentStatusData = [
    { label: 'Paid', value: filteredPaymentLinksData.filter(p => p.status === 'Paid').length, color: '#10b981', percentage: totalPayments > 0 ? (filteredPaymentLinksData.filter(p => p.status === 'Paid').length / totalPayments * 100).toFixed(0) : 0 },
    { label: 'Pending', value: pendingPayments.length, color: '#f59e0b', percentage: totalPayments > 0 ? (pendingPayments.length / totalPayments * 100).toFixed(0) : 0 },
    { label: 'Expired', value: expiredPayments.length, color: '#dc2626', percentage: totalPayments > 0 ? (expiredPayments.length / totalPayments * 100).toFixed(0) : 0 },
  ];

  return (
    <div 
      style={{ width: '100%', fontFamily: theme.typography.fontFamily }}
      onClick={(e) => {
        if (showNotifications && !e.target.closest('[data-notification-container]')) {
          setShowNotifications(false);
        }
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
        }
        @media (max-width: 768px) {
          .card-hover:hover {
            transform: none;
          }
        }
      `}</style>
    <div style={{ width: '100%', fontFamily: theme.typography.fontFamily }}>
      {/* Header */}
        <div className="fade-in" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
          marginBottom: theme.spacing['2xl'],
        flexWrap: 'wrap',
        gap: theme.spacing.md,
      }}>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSizes['3xl'],
            fontWeight: theme.typography.fontWeights.bold,
            color: colors.textPrimary,
            margin: 0,
            marginBottom: theme.spacing.xs,
            lineHeight: theme.typography.lineHeights.tight,
              background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
          }}>
            Welcome back, {user?.First_Name}!
          </h2>
          <p style={{
            fontSize: theme.typography.fontSizes.base,
            color: colors.textSecondary,
            margin: 0,
            fontWeight: theme.typography.fontWeights.medium,
          }}>
              Here's what's happening with your business today
          </p>
        </div>

        {/* Notifications and Date Filter */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          flexWrap: 'wrap',
        }}>
          {/* Notification Icon */}
          <div style={{ position: 'relative' }} data-notification-container>
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications && unreadCount > 0) {
                  markNotificationsAsRead();
                }
              }}
              style={{
                position: 'relative',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: theme.spacing.sm,
                borderRadius: theme.radius.md,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: colors.textPrimary,
                fontSize: '20px',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.primaryBg;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <FaBell />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: colors.error,
                  color: colors.white,
                  borderRadius: '50%',
                  width: '18px',
                  height: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  border: `2px solid ${colors.white}`
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: theme.spacing.sm,
                background: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: theme.radius.lg,
                boxShadow: theme.shadows.xl,
                width: '380px',
                maxHeight: '500px',
                overflowY: 'auto',
                zIndex: 1000,
              }}>
                <div style={{
                  padding: theme.spacing.md,
                  borderBottom: `1px solid ${colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: colors.primaryBg,
                }}>
                  <h3 style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.lg,
                    fontWeight: theme.typography.fontWeights.bold,
                    color: colors.textPrimary,
                  }}>
                    Notifications
                  </h3>
                  {unreadCount > 0 && (
                    <span style={{
                      background: colors.error,
                      color: colors.white,
                      padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                      borderRadius: theme.radius.full,
                      fontSize: theme.typography.fontSizes.xs,
                      fontWeight: theme.typography.fontWeights.bold,
                    }}>
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div>
                  {notifications.length === 0 ? (
                    <div style={{
                      padding: theme.spacing.xl,
                      textAlign: 'center',
                      color: colors.textSecondary,
                    }}>
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif._id}
                        onClick={() => {
                          setShowNotifications(false);
                          if (setActiveTab) {
                            if (notif.action === 'payment_completed') {
                              setActiveTab('payment-generator');
                            }
                          }
                        }}
                        style={{
                          padding: theme.spacing.md,
                          borderBottom: `1px solid ${colors.borderLight}`,
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          background: notif.isUnread ? colors.primaryBg : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = colors.hover;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = notif.isUnread ? colors.primaryBg : 'transparent';
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          gap: theme.spacing.sm,
                          alignItems: 'flex-start',
                        }}>
                          <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: theme.radius.md,
                            background: notif.action === 'payment_completed' ? colors.successBg : colors.infoBg,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            color: notif.action === 'payment_completed' ? colors.success : colors.info,
                            fontSize: '18px',
                          }}>
                            {notif.action === 'payment_completed' ? <FaDollarSign /> : <FaEnvelope />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: theme.typography.fontSizes.sm,
                              fontWeight: theme.typography.fontWeights.bold,
                              color: colors.textPrimary,
                              marginBottom: theme.spacing.xs,
                            }}>
                              {notif.action === 'payment_completed' 
                                ? 'Payment Completed' 
                                : 'New Client Message'}
                            </div>
                            <div style={{
                              fontSize: theme.typography.fontSizes.sm,
                              color: colors.textSecondary,
                              marginBottom: theme.spacing.xs,
                            }}>
                              {notif.description || notif.details?.clientName || 'Notification'}
                            </div>
                            {notif.details?.amount && (
                              <div style={{
                                fontSize: theme.typography.fontSizes.xs,
                                color: colors.success,
                                fontWeight: theme.typography.fontWeights.semibold,
                                marginBottom: theme.spacing.xs,
                              }}>
                                Amount: ${notif.details.amount}
                              </div>
                            )}
                            <div style={{
                              fontSize: theme.typography.fontSizes.xs,
                              color: colors.textTertiary,
                            }}>
                              {new Date(notif.createdAt).toLocaleString()}
                            </div>
                          </div>
                          {notif.isUnread && (
                            <div style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: colors.primary,
                              flexShrink: 0,
                              marginTop: '4px',
                            }} />
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <input
            type="date"
            value={dateFrom}
            onChange={e => { setDateFrom(e.target.value); setAllTime(false); }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.sm,
                background: colors.white,
                color: colors.textPrimary
            }}
          />
          <input
            type="date"
            value={dateTo}
            onChange={e => { setDateTo(e.target.value); setAllTime(false); }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.sm,
                background: colors.white,
                color: colors.textPrimary
            }}
          />
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); setAllTime(true); }}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                background: allTime ? `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)` : colors.white,
              color: allTime ? colors.white : colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.sm,
              cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
          >
            All Time
          </button>
        </div>
      </div>

      {/* Stats Grid */}
        <div className="fade-in" style={{
        display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 400px))',
          gap: theme.spacing.xl,
          marginBottom: theme.spacing['2xl'],
          maxWidth: '100%',
          justifyContent: 'start'
      }}>
        {stats.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: theme.spacing['2xl'],
            color: colors.textSecondary,
          }}>
            <p>No dashboard cards available based on your permissions.</p>
          </div>
        ) : (
          stats.map((stat, idx) => {
            const Icon = stat.icon;
            return (
              <div
                key={idx}
                  className="card-hover"
                onClick={() => {
                  if (setActiveTab && stat.tabId) {
                    setActiveTab(stat.tabId);
                    // Store filter value in localStorage if it exists
                    if (stat.filterValue) {
                      localStorage.setItem('clientsPageFilterAssignment', stat.filterValue);
                    }
                  }
                }}
                style={{
                    background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
                  borderRadius: theme.radius.xl,
                  padding: theme.spacing.xl,
                  border: `1px solid ${colors.borderLight}`,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: stat.tabId ? 'pointer' : 'default',
                    maxWidth: '400px',
                    width: '100%'
                  }}
                >
                  {/* Decorative corner icon shadow */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '140px',
                    height: '140px',
                    opacity: 0.15,
                    zIndex: 0
                  }}>
                    <Icon style={{ 
                      fontSize: '140px', 
                      color: stat.color,
                      transform: 'rotate(-15deg)'
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
                    background: `linear-gradient(135deg, ${stat.bg} 0%, transparent 100%)`,
                    borderRadius: '0 0 0 100%',
                    opacity: 0.3
                  }} />
                  
                  <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                      marginBottom: theme.spacing.md
                }}>
                  <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                    background: stat.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: stat.color,
                        fontSize: '24px',
                        boxShadow: `0 4px 12px ${stat.color}30`
                  }}>
                    <Icon />
                  </div>
                      {stat.growth !== undefined && (
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs,
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.radius.full,
                          background: parseFloat(stat.growth) >= 0 ? colors.successBg : colors.errorBg,
                          color: parseFloat(stat.growth) >= 0 ? colors.success : colors.error,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.semibold
                        }}>
                          {parseFloat(stat.growth) >= 0 ? <FaArrowUp style={{ fontSize: '10px' }} /> : <FaArrowDown style={{ fontSize: '10px' }} />}
                          {Math.abs(parseFloat(stat.growth))}%
                        </div>
                      )}
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: theme.spacing.md,
                  marginBottom: theme.spacing.xs,
                  flexWrap: 'wrap'
                }}>
                  <div style={{
                    fontSize: theme.typography.fontSizes['3xl'],
                    fontWeight: theme.typography.fontWeights.bold,
                    color: colors.textPrimary,
                    lineHeight: 1.2
                  }}>
                    {stat.value}
                  </div>
                  {stat.currentMonthValue && stat.lastMonthValue && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.spacing.xs,
                      alignItems: 'flex-start'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs
                      }}>
                        <span style={{
                          fontSize: theme.typography.fontSizes.xs,
                          color: colors.textSecondary,
                          fontWeight: theme.typography.fontWeights.medium
                        }}>
                          This Month:
                        </span>
                        <span style={{
                          fontSize: theme.typography.fontSizes.sm,
                          color: colors.success,
                          fontWeight: theme.typography.fontWeights.semibold
                        }}>
                          {stat.currentMonthValue}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs
                      }}>
                        <span style={{
                          fontSize: theme.typography.fontSizes.xs,
                          color: colors.textSecondary,
                          fontWeight: theme.typography.fontWeights.medium
                        }}>
                          Last Month:
                        </span>
                        <span style={{
                          fontSize: theme.typography.fontSizes.sm,
                          color: colors.textSecondary,
                          fontWeight: theme.typography.fontWeights.medium
                        }}>
                          {stat.lastMonthValue}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{
                      fontSize: theme.typography.fontSizes.base,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.medium,
                      marginBottom: theme.spacing.xs
                }}>
                  {stat.label}
                    </div>
                    {stat.subValue && (
                      <div style={{
                        fontSize: theme.typography.fontSizes.sm,
                        color: colors.textSecondary,
                        marginTop: theme.spacing.xs
                      }}>
                        {stat.subValue}
                      </div>
                    )}
                    {stat.growthLabel && (
                      <div style={{
                        fontSize: theme.typography.fontSizes.xs,
                        color: colors.textSecondary,
                        marginTop: theme.spacing.xs,
                        opacity: 0.7
                      }}>
                        {stat.growthLabel}
                      </div>
                    )}
                </div>
              </div>
            );
          })
        )}
      </div>

        {/* Analytics Section - Only show if user has payment permission */}
        {canView('payments') && (
        <div className="fade-in" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: theme.spacing.xl,
          marginBottom: theme.spacing['2xl']
        }}>
          {/* Revenue Analytics Card */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
            borderRadius: theme.radius.xl,
            border: `1px solid ${colors.borderLight}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Decorative corner icon */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '140px',
              height: '140px',
              opacity: 0.1,
              zIndex: 0
            }}>
              <FaChartLine style={{ 
                fontSize: '140px', 
                color: '#10b981',
                transform: 'rotate(-15deg)'
              }} />
            </div>
            
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${colors.borderLight}`,
              background: `linear-gradient(135deg, ${colors.successBg} 0%, transparent 100%)`,
              position: 'relative',
              zIndex: 1
            }}>
              <h3 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes.xl,
                fontWeight: theme.typography.fontWeights.bold,
                color: colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm
              }}>
                <FaChartLine style={{ color: '#10b981' }} />
                Revenue Analytics
              </h3>
            </div>
            <div style={{ padding: theme.spacing.xl, position: 'relative', zIndex: 1 }}>
      <div style={{
                display: 'grid',
                gap: theme.spacing.lg
              }}>
                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing.sm
                  }}>
                    <span style={{
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textSecondary,
                      fontWeight: theme.typography.fontWeights.medium
                    }}>
                      Total Revenue
                    </span>
                    <span style={{
                      fontSize: theme.typography.fontSizes['2xl'],
                      fontWeight: theme.typography.fontWeights.bold,
                      color: '#10b981'
                    }}>
                      {formatCurrency(totalRevenue)}
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: colors.borderLight,
                    borderRadius: theme.radius.full,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: '100%',
                      background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`,
                      borderRadius: theme.radius.full
                    }} />
                  </div>
                </div>

                <div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: theme.spacing.sm
                  }}>
                    <span style={{
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textSecondary,
                      fontWeight: theme.typography.fontWeights.medium
                    }}>
                      Pending Revenue
                    </span>
                    <span style={{
                      fontSize: theme.typography.fontSizes.lg,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: '#d97706'
                    }}>
                      {formatCurrency(pendingRevenue)}
                    </span>
                  </div>
                  <div style={{
                    height: '8px',
                    background: colors.borderLight,
                    borderRadius: theme.radius.full,
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${totalRevenue > 0 ? (pendingRevenue / totalRevenue * 100) : 0}%`,
                      background: `linear-gradient(90deg, #d97706 0%, #f59e0b 100%)`,
                      borderRadius: theme.radius.full,
                      maxWidth: '100%'
                    }} />
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing.md,
                  marginTop: theme.spacing.md
                }}>
                  <div style={{
                    padding: theme.spacing.md,
                    background: colors.successBg,
                    borderRadius: theme.radius.md,
                    textAlign: 'center'
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSizes['2xl'],
                      fontWeight: theme.typography.fontWeights.bold,
                      color: colors.success,
                      marginBottom: theme.spacing.xs
                    }}>
                      {completedPayments.length}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSizes.xs,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Completed Payments
                    </div>
                  </div>
                  <div style={{
                    padding: theme.spacing.md,
                    background: colors.warningBg,
                    borderRadius: theme.radius.md,
                    textAlign: 'center'
                  }}>
              <div style={{
                fontSize: theme.typography.fontSizes['2xl'],
                      fontWeight: theme.typography.fontWeights.bold,
                      color: '#d97706',
                      marginBottom: theme.spacing.xs
                    }}>
                      {pendingPayments.length}
                    </div>
                    <div style={{
                      fontSize: theme.typography.fontSizes.xs,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Pending
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Status Distribution */}
          <div style={{
            background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
            borderRadius: theme.radius.xl,
            border: `1px solid ${colors.borderLight}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Decorative corner icon */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '140px',
              height: '140px',
              opacity: 0.1,
              zIndex: 0
            }}>
              <FaCreditCard style={{ 
                fontSize: '140px', 
                color: '#667eea',
                transform: 'rotate(-15deg)'
              }} />
            </div>
            
            <div style={{
              padding: theme.spacing.xl,
              borderBottom: `1px solid ${colors.borderLight}`,
              background: `linear-gradient(135deg, ${colors.primaryBg} 0%, transparent 100%)`,
              position: 'relative',
              zIndex: 1
            }}>
              <h3 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes.xl,
                fontWeight: theme.typography.fontWeights.bold,
                color: colors.textPrimary,
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm
              }}>
                <FaCreditCard style={{ color: colors.primary }} />
                Payment Status
              </h3>
            </div>
            <div style={{ padding: theme.spacing.xl, position: 'relative', zIndex: 1 }}>
              <div style={{
                marginBottom: theme.spacing.lg
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: theme.spacing.md
                }}>
                  <span style={{
                    fontSize: theme.typography.fontSizes['2xl'],
                    fontWeight: theme.typography.fontWeights.bold,
                    color: colors.textPrimary
                  }}>
                    {paymentSuccessRate}%
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSizes.sm,
                    color: colors.textSecondary
                  }}>
                    Success Rate
                  </span>
                </div>
                <div style={{
                  height: '12px',
                  background: colors.borderLight,
                  borderRadius: theme.radius.full,
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${paymentSuccessRate}%`,
                    background: `linear-gradient(90deg, #10b981 0%, #34d399 100%)`,
                    borderRadius: theme.radius.full,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
              </div>

              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: theme.spacing.md
              }}>
                {paymentStatusData.map((status, idx) => (
                  <div key={idx}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing.xs
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm
                      }}>
                        <div style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          background: status.color
                        }} />
                        <span style={{
                          fontSize: theme.typography.fontSizes.base,
                          fontWeight: theme.typography.fontWeights.medium,
                          color: colors.textPrimary
                        }}>
                          {status.label}
                        </span>
                      </div>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm
                      }}>
                        <span style={{
                          fontSize: theme.typography.fontSizes.base,
                          fontWeight: theme.typography.fontWeights.bold,
                          color: colors.textPrimary
                        }}>
                          {status.value}
                        </span>
                        <span style={{
                          fontSize: theme.typography.fontSizes.sm,
                          color: colors.textSecondary
                        }}>
                          ({status.percentage}%)
                        </span>
                      </div>
                    </div>
                    <div style={{
                      height: '8px',
                      background: colors.borderLight,
                      borderRadius: theme.radius.full,
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        height: '100%',
                        width: `${status.percentage}%`,
                        background: status.color,
                        borderRadius: theme.radius.full,
                        transition: 'width 0.5s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
      </div>
        )}

      {/* Recent Activity */}
        <div className="fade-in" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: theme.spacing.xl,
          marginBottom: theme.spacing.xl
      }}>
        {/* Recent Inquiries - Only show if user has permission */}
        {canView('inquiries') && (
        <div style={{
            background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
          borderRadius: theme.radius.xl,
          border: `1px solid ${colors.borderLight}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Decorative corner icon */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '140px',
              height: '140px',
              opacity: 0.1,
              zIndex: 0
            }}>
              <FaEnvelope style={{ 
                fontSize: '140px', 
                color: '#8b5cf6',
                transform: 'rotate(-15deg)'
              }} />
            </div>
            
          <div style={{
            padding: theme.spacing.xl,
            borderBottom: `1px solid ${colors.borderLight}`,
              background: `linear-gradient(135deg, ${colors.primaryBg} 0%, transparent 100%)`,
              position: 'relative',
              zIndex: 1
          }}>
            <h3 style={{
              margin: 0,
              fontSize: theme.typography.fontSizes.xl,
              fontWeight: theme.typography.fontWeights.bold,
              color: colors.textPrimary,
              display: 'flex',
              alignItems: 'center',
                gap: theme.spacing.sm
            }}>
              <FaEnvelope style={{ color: colors.primary }} />
              Recent Inquiries
            </h3>
          </div>
            <div style={{ overflowX: 'auto', position: 'relative', zIndex: 1 }}>
            <table style={{
              width: '100%',
                borderCollapse: 'collapse'
            }}>
              <thead style={{
                background: colors.primaryBg,
                  borderBottom: `1px solid ${colors.border}`
              }}>
                <tr>
                  {['Name', 'Email', 'Phone', 'Reason'].map(header => (
                    <th key={header} style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontWeight: theme.typography.fontWeights.semibold,
                      fontSize: theme.typography.fontSizes.xs,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredInquiries.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{
                      padding: theme.spacing.xl,
                      textAlign: 'center',
                        color: colors.textSecondary
                    }}>
                      No recent inquiries
                    </td>
                  </tr>
                ) : (
                  filteredInquiries.map(inq => (
                    <tr key={inq._id} style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.primaryBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      >
                      <td style={{
                        padding: theme.spacing.md,
                        fontWeight: theme.typography.fontWeights.medium,
                          color: colors.textPrimary
                      }}>
                        {inq.name}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {inq.email}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {inq.phone}
                      </td>
                      <td style={{
                        padding: theme.spacing.md,
                        color: colors.textSecondary,
                        maxWidth: '150px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                      }}>
                        {inq.reason || inq.message || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Recent Clients - Only show if user has permission */}
        {canView('clients') && (
        <div style={{
            background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
          borderRadius: theme.radius.xl,
          border: `1px solid ${colors.borderLight}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Decorative corner icon */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              width: '140px',
              height: '140px',
              opacity: 0.1,
              zIndex: 0
            }}>
              <FaUsers style={{ 
                fontSize: '140px', 
                color: '#667eea',
                transform: 'rotate(-15deg)'
              }} />
            </div>
            
          <div style={{
            padding: theme.spacing.xl,
            borderBottom: `1px solid ${colors.borderLight}`,
              background: `linear-gradient(135deg, ${colors.successBg} 0%, transparent 100%)`,
              position: 'relative',
              zIndex: 1
          }}>
            <h3 style={{
              margin: 0,
              fontSize: theme.typography.fontSizes.xl,
              fontWeight: theme.typography.fontWeights.bold,
              color: colors.textPrimary,
              display: 'flex',
              alignItems: 'center',
                gap: theme.spacing.sm
            }}>
              <FaUsers style={{ color: colors.success }} />
              Recent Clients
            </h3>
          </div>
            <div style={{ overflowX: 'auto', position: 'relative', zIndex: 1 }}>
            <table style={{
              width: '100%',
                borderCollapse: 'collapse'
            }}>
              <thead style={{
                  background: colors.successBg,
                  borderBottom: `1px solid ${colors.border}`
              }}>
                <tr>
                  {['Name', 'Email', 'Status', 'Joined'].map(header => (
                    <th key={header} style={{
                      padding: theme.spacing.md,
                      textAlign: 'left',
                      fontWeight: theme.typography.fontWeights.semibold,
                      fontSize: theme.typography.fontSizes.xs,
                      color: colors.textSecondary,
                      textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRecentClients.length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{
                      padding: theme.spacing.xl,
                      textAlign: 'center',
                        color: colors.textSecondary
                    }}>
                      No recent clients
                    </td>
                  </tr>
                ) : (
                  filteredRecentClients.map(client => (
                    <tr key={client._id} style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                        transition: 'background 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.successBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                      >
                      <td style={{
                        padding: theme.spacing.md,
                        fontWeight: theme.typography.fontWeights.medium,
                          color: colors.textPrimary
                      }}>
                        {client.name}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {client.email}
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.medium,
                            background: client.status === 'Active' ? colors.successBg : colors.warningBg,
                            color: client.status === 'Active' ? colors.success : colors.warning
                        }}>
                          {client.status || 'Processing'}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {client.createdAt ? new Date(client.createdAt).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        )}
      </div>

     </div>
    </div>
  );
}

export default UserDashboardPage;

