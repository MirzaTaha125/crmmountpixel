import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './session';
import { FaSignOutAlt, FaFileInvoice, FaSpinner, FaExclamationCircle, FaCheckCircle, FaDollarSign, FaCalendarAlt, FaTag, FaServer, FaGlobe, FaCloud, FaComments, FaPaperPlane, FaEnvelope, FaClock, FaCheck, FaTimes, FaBoxOpen } from 'react-icons/fa';
import axios from 'axios';
import getApiBaseUrl from './apiBase';
import { theme, getColors } from './theme';
import { Button } from './components/Button';
import { LoadingScreen } from './components/LoadingScreen';
import ChatPage from './adminpages/ChatPage';

const colors = getColors();
const API_URL = getApiBaseUrl();

// Brand configuration with colors and logos
const getBrandConfig = (brand) => {
  const brandConfigs = {
    'Webdevelopers Inc': {
      name: 'Webdevelopers Inc',
      logo: '/webdevelopersinc.webp',
      primaryColor: '#073536', // Dark teal
      secondaryColor: '#E3FF91', // Light green/yellow
      textColor: '#E3FF91',
      headerBg: 'linear-gradient(135deg, #073536 0%, #0a4a4c 100%)',
      iconBg: 'rgba(227, 255, 145, 0.2)',
      buttonBg: 'rgba(227, 255, 145, 0.2)',
      buttonBorder: 'rgba(227, 255, 145, 0.3)'
    },
    'American Design Eagle': {
      name: 'American Design Eagle',
      logo: '/main_logo.webp',
      primaryColor: '#CA0F38', // Red
      secondaryColor: '#FFFFFF', // White
      textColor: '#FFFFFF',
      headerBg: 'linear-gradient(135deg, #CA0F38 0%, #a00c2e 100%)',
      iconBg: 'rgba(255, 255, 255, 0.2)',
      buttonBg: 'rgba(255, 255, 255, 0.2)',
      buttonBorder: 'rgba(255, 255, 255, 0.3)'
    },
    'Mount Pixels': {
      name: 'Mount Pixels',
      logo: '/mountpixels.webp',
      primaryColor: '#EF275A', // Pink/Red
      secondaryColor: '#FFFFFF', // White
      textColor: '#FFFFFF',
      headerBg: 'linear-gradient(135deg, #EF275A 0%, #d11f4a 100%)',
      iconBg: 'rgba(255, 255, 255, 0.2)',
      buttonBg: 'rgba(255, 255, 255, 0.2)',
      buttonBorder: 'rgba(255, 255, 255, 0.3)'
    }
  };
  return brandConfigs[brand] || {
    name: 'Client Portal',
    logo: '/main_logo.webp',
    primaryColor: colors.primary,
    secondaryColor: colors.white,
    textColor: colors.white,
    headerBg: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
    iconBg: 'rgba(255, 255, 255, 0.2)',
    buttonBg: 'rgba(255, 255, 255, 0.2)',
    buttonBorder: 'rgba(255, 255, 255, 0.3)'
  };
};

function ClientPanel() {
  const { user, setUser } = useSession();
  const navigate = useNavigate();
  const brandConfig = getBrandConfig(user?.brand || '');
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [hostingDomains, setHostingDomains] = useState([]);
  const [clientAssets, setClientAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hostingLoading, setHostingLoading] = useState(false);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [logoError, setLogoError] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Fetch unread message count
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/chat/user/chats`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const chats = res.data.chats || [];
      const total = chats.reduce((sum, chat) => sum + (chat.unreadCount || 0), 0);
      setTotalUnreadCount(total);
    } catch (error) {
      // Error fetching unread count
    }
  };

  // Poll for unread messages every 10 seconds
  useEffect(() => {
    if (!showChat) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    } else {
      setTotalUnreadCount(0); // Reset when chat is open
    }
  }, [showChat]);

  // Reset pending filter when switching away from invoices tab
  useEffect(() => {
    if (activeTab !== 'invoices') {
      setShowPendingOnly(false);
    }
  }, [activeTab]);

  // Redirect if not a client
  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    if (user.type !== 'Client') {
      navigate('/signin');
      return;
    }
  }, [user, navigate]);

  // Fetch client profile to get brand
  useEffect(() => {
    if (user && user.type === 'Client') {
      // Always fetch profile to ensure we have the latest brand info
      fetchClientProfile();
    }
  }, [user?.id]); // Only run when user ID changes

  // Fetch pending invoices and hosting/domain data
  useEffect(() => {
    if (user && user.type === 'Client') {
      fetchPendingInvoices();
      fetchHostingDomains();
      fetchClientAssets();
    }
  }, [user]);


  // Track window width for responsive behavior
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const fetchClientProfile = async () => {
    try {
      const token = localStorage.getItem('token') || user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/clients/my-profile`, { headers });
      if (response.data.client) {
        // Update user object with brand
        setUser({
          ...user,
          brand: response.data.client.brand || ''
        });
      }
    } catch (err) {
      console.error('Error fetching client profile:', err);
      // Don't show error, just silently fail
    }
  };

  const fetchPendingInvoices = async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token') || user?.token;
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/clients/pending-invoices`, { headers });
      setInvoices(response.data.invoices || []);
      setPayments(response.data.payments || []);
    } catch (err) {
      console.error('Error fetching pending invoices:', err);
      if (err.response?.status === 401) {
        setError('Session expired. Please sign in again.');
        setTimeout(() => {
          setUser(null);
          localStorage.removeItem('token');
          navigate('/signin');
        }, 2000);
      } else {
        setError(err.response?.data?.error || 'Failed to load pending invoices');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchHostingDomains = async () => {
    try {
      setHostingLoading(true);
      const token = localStorage.getItem('token') || user?.token;
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/hosting-domains/my-services`, { headers });
      
      if (Array.isArray(response.data)) {
        setHostingDomains(response.data);
      } else {
        setHostingDomains([]);
      }
    } catch (err) {
      console.error('Error fetching hosting/domain:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        setError(err.response?.data?.message || 'Access denied. Please contact support.');
      }
      setHostingDomains([]);
    } finally {
      setHostingLoading(false);
    }
  };

  const fetchClientAssets = async () => {
    try {
      setAssetsLoading(true);
      const token = localStorage.getItem('token') || user?.token;
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.get(`${API_URL}/api/client-assets/my-assets`, { headers });
      
      if (Array.isArray(response.data)) {
        setClientAssets(response.data);
      } else {
        setClientAssets([]);
      }
    } catch (err) {
      console.error('Error fetching client assets:', err);
      setClientAssets([]);
    } finally {
      setAssetsLoading(false);
    }
  };

  const fetchClientNotes = async () => {
    try {
      setNotesLoading(true);
      const token = localStorage.getItem('token') || user?.token;
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const clientId = user._id || user.id || (user.clientId ? user.clientId.toString() : null);
      
      if (!clientId) {
        setClientNotes([]);
        return;
      }
      
      const response = await axios.get(`${API_URL}/api/client-notes/${clientId}`, { headers });
      
      if (Array.isArray(response.data)) {
        setClientNotes(response.data);
      } else {
        setClientNotes([]);
      }
    } catch (err) {
      console.error('Error fetching client notes:', err);
      setClientNotes([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const markMessagesAsRead = async () => {
    try {
      const token = localStorage.getItem('token') || user?.token;
      if (!token) return;
      
      const headers = { Authorization: `Bearer ${token}` };
      const clientId = user._id || user.id || (user.clientId ? user.clientId.toString() : null);
      
      if (!clientId) return;
      
      await axios.post(`${API_URL}/api/client-notes/${clientId}/mark-read`, {}, { headers });
      // Refresh notes to get updated read status
    } catch (err) {
      console.error('Error marking messages as read:', err);
      // Don't show error to user, just silently fail
    }
  };

  const handleSendNote = async (parentNoteId = null) => {
    try {
      if (!newNote.message.trim()) {
        setError('Please enter a message');
        return;
      }

      setSendingNote(true);
      setError('');
      const token = localStorage.getItem('token') || user?.token;
      if (!token) {
        setError('Authentication required');
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };
      const clientId = user._id || user.id || (user.clientId ? user.clientId.toString() : null);
      
      if (!clientId) {
        setError('Client ID not found');
        return;
      }

      await axios.post(`${API_URL}/api/client-notes/${clientId}`, {
        message: newNote.message.trim(),
        parentNoteId: parentNoteId || null
      }, { headers });

      await fetchClientNotes();
      setNewNote({ message: '', parentNoteId: null });
      setReplyingTo(null);
    } catch (err) {
      console.error('Error sending note:', err);
      setError(err.response?.data?.message || 'Failed to send note');
    } finally {
      setSendingNote(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      setUser(null);
      navigate('/signin');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setIsLoggingOut(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Paid':
      case 'Completed':
        return colors.success;
      case 'Pending':
        return '#6366f1'; // Indigo/primary color
      case 'Expired':
      case 'Failed':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusBg = (status) => {
    switch (status) {
      case 'Paid':
      case 'Completed':
        return colors.successBg;
      case 'Pending':
        return '#e0e7ff'; // Light indigo background
      case 'Expired':
      case 'Failed':
        return colors.errorBg;
      default:
        return colors.background;
    }
  };

  if (loading && invoices.length === 0 && payments.length === 0) {
    return <LoadingScreen message="Loading your dashboard..." />;
  }

  if (!user || user.type !== 'Client') {
    return null;
  }

  const invoiceNumbers = new Set(invoices.map(inv => inv.invoiceNumber).filter(Boolean));
  const uniquePayments = payments.filter(p => 
    p.invoiceNumber && !invoiceNumbers.has(p.invoiceNumber)
  );
  
  const allInvoices = [
    ...invoices,
    ...uniquePayments.map(p => ({
      ...p,
      isPaymentHistory: true,
      packageName: p.description || 'Payment',
      total: p.amount,
      invoiceNumber: p.invoiceNumber
    }))
  ].sort((a, b) => new Date(b.createdAt || b.paymentDate) - new Date(a.createdAt || a.paymentDate));

  const pendingInvoices = allInvoices.filter(inv => inv.status === 'Pending');
  const totalPending = pendingInvoices.reduce((sum, inv) => sum + (inv.total || inv.amount || 0), 0);
  const activeServices = hostingDomains.filter(s => {
    const endDate = s.endDate ? new Date(s.endDate) : null;
    return !endDate || endDate >= new Date();
  });


  const tabs = [
    { id: 'overview', label: 'Overview', icon: FaFileInvoice },
    { id: 'services', label: 'Services', icon: FaServer },
    { id: 'assets', label: 'Assets', icon: FaBoxOpen }
  ];

  return (
    <>
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .card-hover {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .card-hover:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
        }
        
        /* Responsive Styles */
        @media (max-width: 768px) {
          .card-hover:hover {
            transform: none;
          }
          
          .mobile-bottom-nav {
            display: flex !important;
          }
          
          .desktop-tabs {
            display: none !important;
          }
          
          .mobile-main-content {
            padding-bottom: 80px !important;
          }
        }
        
        @media (min-width: 769px) {
          .mobile-bottom-nav {
            display: none !important;
          }
          
          .desktop-tabs {
            display: flex !important;
          }
        }
        
        @media (max-width: 640px) {
          .responsive-header {
            flex-direction: row !important;
            align-items: center !important;
            gap: 0.75rem !important;
          }
          
          .responsive-header-content {
            flex: 1 !important;
            min-width: 0 !important;
          }
          
          .responsive-header-title {
            font-size: 1.125rem !important;
            line-height: 1.2 !important;
          }
          
          .responsive-header-subtitle {
            font-size: 0.75rem !important;
            display: -webkit-box !important;
            -webkit-line-clamp: 1 !important;
            -webkit-box-orient: vertical !important;
            overflow: hidden !important;
          }
          
          .responsive-header-icon {
            width: 40px !important;
            height: 40px !important;
          }
          
          .responsive-header-icon svg {
            font-size: 20px !important;
          }
          
          .responsive-tabs {
            display: none !important;
          }
          
          .responsive-summary-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .responsive-content-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .responsive-service-grid {
            grid-template-columns: 1fr !important;
            gap: 1rem !important;
          }
          
          .responsive-invoice-card {
            flex-direction: column !important;
            align-items: flex-start !important;
            gap: 0.75rem !important;
          }
          
          .responsive-message-avatar {
            width: 40px !important;
            height: 40px !important;
            font-size: 1rem !important;
          }
          
          .responsive-reply-margin {
            margin-left: 52px !important;
          }
          
          .mobile-card-icon {
            width: 48px !important;
            height: 48px !important;
          }
          
          .mobile-card-icon svg {
            font-size: 20px !important;
          }
          
          .mobile-card-number {
            font-size: 2rem !important;
          }
          
          .mobile-card-label {
            font-size: 0.875rem !important;
          }
        }
        
        @media (max-width: 480px) {
          .responsive-main-padding {
            padding: 0.75rem !important;
          }
          
          .responsive-header-padding {
            padding: 0.875rem 1rem !important;
          }
          
          .responsive-card-padding {
            padding: 1rem !important;
          }
          
          .responsive-text-xl {
            font-size: 1.125rem !important;
          }
          
          .responsive-text-2xl {
            font-size: 1.25rem !important;
          }
          
          .responsive-text-3xl {
            font-size: 1.5rem !important;
          }
          
          .mobile-bottom-nav {
            height: 70px !important;
            padding: 0.5rem 0 !important;
          }
          
          .mobile-nav-item {
            padding: 0.5rem 0.75rem !important;
            font-size: 0.75rem !important;
          }
          
          .mobile-nav-item svg {
            font-size: 18px !important;
          }
        }
        
        @media (min-width: 641px) and (max-width: 1024px) {
          .responsive-summary-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        
        /* Mobile Bottom Navigation */
        .mobile-bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: ${colors.white};
          border-top: 1px solid ${colors.border};
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          display: flex;
          justify-content: space-around;
          align-items: center;
          height: 65px;
          padding: 0.5rem 0;
          backdrop-filter: blur(10px);
        }
        
        .mobile-nav-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.25rem;
          padding: 0.5rem 1rem;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          color: ${colors.textSecondary};
          flex: 1;
          max-width: 100px;
          min-width: 60px;
        }
        
        .mobile-nav-item.active {
          color: ${colors.primary};
          background: #1e293b;
        }
        
        .mobile-nav-item:active {
          transform: scale(0.95);
        }
        
        .mobile-nav-item svg {
          font-size: 20px;
        }
        
        .mobile-nav-label {
          font-size: 0.7rem;
          font-weight: 500;
          margin-top: 2px;
        }
      `}</style>
    <div style={{
      minHeight: '100vh',
        background: `linear-gradient(135deg, ${colors.background} 0%, ${colors.background} 100%)`,
      fontFamily: theme.typography.fontFamily
    }}>
        {/* Modern Header */}
        <header className="responsive-header-padding" style={{
          background: brandConfig.headerBg,
          padding: `${theme.spacing.xl} ${theme.spacing['2xl']}`,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
          <div className="responsive-header" style={{
            maxWidth: '1400px',
            margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
            width: '100%'
        }}>
            <div className="responsive-header-content" style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, flex: 1, minWidth: 0 }}>
              <div className="responsive-header-icon" style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: brandConfig.iconBg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(10px)',
                flexShrink: 0,
                overflow: 'hidden'
              }}>
                {!logoError ? (
                  <img 
                    src={brandConfig.logo} 
                    alt={brandConfig.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      padding: '8px'
                    }}
                    onError={() => setLogoError(true)}
                  />
                ) : (
                  <FaFileInvoice style={{ fontSize: '24px', color: brandConfig.textColor }} />
                )}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <h1 className="responsive-text-2xl responsive-header-title" style={{
                margin: 0,
                fontSize: theme.typography.fontSizes['2xl'],
                fontWeight: theme.typography.fontWeights.bold,
                  color: brandConfig.textColor,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
              }}>
                {brandConfig.name}
              </h1>
                <p className="responsive-header-subtitle" style={{
                margin: 0,
                fontSize: theme.typography.fontSizes.sm,
                  color: brandConfig.textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.9)' : brandConfig.textColor,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
              }}>
                {user.name} • {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={handleLogout}
            disabled={isLoggingOut}
            style={{
                background: brandConfig.buttonBg,
                color: brandConfig.textColor,
                border: `1px solid ${brandConfig.buttonBorder}`,
                backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
                justifyContent: 'center',
                gap: windowWidth <= 640 ? 0 : theme.spacing.xs,
                flexShrink: 0,
                whiteSpace: 'nowrap',
                padding: windowWidth <= 640 ? `${theme.spacing.sm} ${theme.spacing.md}` : undefined,
                minWidth: windowWidth <= 640 ? '44px' : undefined,
                minHeight: windowWidth <= 640 ? '44px' : undefined
            }}
          >
            {isLoggingOut ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaSignOutAlt />}
              {windowWidth > 640 && (
                <span>
            {isLoggingOut ? 'Logging out...' : 'Logout'}
                </span>
              )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
        <main className="responsive-main-padding mobile-main-content" style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: theme.spacing['2xl']
      }}>
        {/* Error Message */}
        {error && (
          <div style={{
            background: colors.errorBg,
            color: colors.error,
            padding: theme.spacing.lg,
              borderRadius: theme.radius.lg,
              marginBottom: theme.spacing.xl,
            border: `1px solid ${colors.error}`,
            display: 'flex',
            alignItems: 'center',
              gap: theme.spacing.sm,
              boxShadow: `0 4px 12px ${colors.error}20`
            }} className="fade-in">
            <FaExclamationCircle />
              <span>{error}</span>
          </div>
        )}

          {/* Tab Navigation - Desktop */}
          <div className="responsive-tabs desktop-tabs" style={{
            display: 'flex',
            gap: theme.spacing.sm,
            marginBottom: theme.spacing.xl,
            borderBottom: `2px solid ${colors.border}`,
            overflowX: 'auto',
            paddingBottom: theme.spacing.sm,
            WebkitOverflowScrolling: 'touch'
          }}>
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                    background: 'transparent',
                    border: 'none',
                    borderBottom: `3px solid ${isActive ? colors.primary : 'transparent'}`,
                    color: isActive ? colors.primary : colors.textSecondary,
                    fontSize: windowWidth <= 480 ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                    fontWeight: isActive ? theme.typography.fontWeights.semibold : theme.typography.fontWeights.medium,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    whiteSpace: 'nowrap',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.target.style.color = colors.primary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.target.style.color = colors.textSecondary;
                    }
                  }}
                >
                  <Icon />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="fade-in">
              {/* Summary Cards */}
              <div className="responsive-summary-grid" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: theme.spacing.xl,
                marginBottom: theme.spacing['2xl']
              }}>
                {/* Pending Invoices Card */}
                <div 
                  className="responsive-card-padding card-hover" 
                  onClick={() => {
                    if (totalPending > 0) {
                      setShowPendingOnly(true);
                      setActiveTab('invoices');
                    }
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
                    borderRadius: theme.radius.xl,
                    padding: theme.spacing.xl,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: `1px solid ${colors.border}`,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: totalPending > 0 ? 'pointer' : 'default',
                    opacity: totalPending > 0 ? 1 : 0.6
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
                    <FaClock style={{ 
                      fontSize: '140px', 
                      color: '#1e293b',
                      transform: 'rotate(-15deg)'
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
              
                    borderRadius: '0 0 0 100%',
                    opacity: 0.3
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="mobile-card-icon" style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: theme.spacing.md
                    }}>
                      <FaClock style={{ fontSize: '24px', color: '#f59e0b' }} />
                    </div>
                    <h3 className="responsive-text-3xl mobile-card-number" style={{
            margin: 0,
            fontSize: theme.typography.fontSizes['3xl'],
            fontWeight: theme.typography.fontWeights.bold,
                      color: '#f59e0b',
            marginBottom: theme.spacing.xs
                    }}>
                      {pendingInvoices.length}
                    </h3>
                    <p className="mobile-card-label" style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.base,
                      color: colors.textSecondary,
                      marginBottom: theme.spacing.sm
          }}>
            Pending Invoices
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.lg,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.primary
                    }}>
                      {formatCurrency(totalPending)}
                    </p>
                  </div>
                </div>

                {/* Active Services Card */}
                <div className="responsive-card-padding card-hover" style={{
                  background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
                  borderRadius: theme.radius.xl,
                  padding: theme.spacing.xl,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: `1px solid ${colors.border}`,
                  position: 'relative',
                  overflow: 'hidden'
                }}>
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
                    <FaServer style={{ 
                      fontSize: '140px', 
                      color: colors.success,
                      transform: 'rotate(-15deg)'
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
                    background: `linear-gradient(135deg, ${colors.successBg} 0%, transparent 100%)`,
                    borderRadius: '0 0 0 100%',
                    opacity: 0.3
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="mobile-card-icon" style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: colors.successBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: theme.spacing.md
                    }}>
                      <FaServer style={{ fontSize: '24px', color: colors.success }} />
                    </div>
                    <h3 className="mobile-card-number" style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes['3xl'],
                      fontWeight: theme.typography.fontWeights.bold,
                      color: colors.textPrimary,
                      marginBottom: theme.spacing.xs
                    }}>
                      {activeServices.length}
                    </h3>
                    <p className="mobile-card-label" style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.base,
                      color: colors.textSecondary,
                      marginBottom: theme.spacing.sm
                    }}>
                      Active Services
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textSecondary
                    }}>
                      {hostingDomains.length} total services
                    </p>
                  </div>
                </div>


                {/* Assets Card */}
                <div 
                  className="responsive-card-padding card-hover" 
                  onClick={() => {
                    if (clientAssets.length > 0) {
                      setActiveTab('assets');
                    }
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${colors.white} 0%, ${colors.white} 100%)`,
                    borderRadius: theme.radius.xl,
                    padding: theme.spacing.xl,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: `1px solid ${colors.border}`,
                    position: 'relative',
                    overflow: 'hidden',
                    cursor: clientAssets.length > 0 ? 'pointer' : 'default',
                    opacity: clientAssets.length > 0 ? 1 : 0.6
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
                    <FaBoxOpen style={{ 
                      fontSize: '140px', 
                      color: '#8b5cf6',
                      transform: 'rotate(-15deg)'
                    }} />
                  </div>
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '120px',
                    height: '120px',
                    background: `linear-gradient(135deg, #ede9fe 0%, transparent 100%)`,
                    borderRadius: '0 0 0 100%',
                    opacity: 0.3
                  }} />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div className="mobile-card-icon" style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '16px',
                      background: '#ede9fe',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: theme.spacing.md
                    }}>
                      <FaBoxOpen style={{ fontSize: '24px', color: '#8b5cf6' }} />
                    </div>
                    <h3 className="mobile-card-number" style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes['3xl'],
                      fontWeight: theme.typography.fontWeights.bold,
                      color: colors.textPrimary,
                      marginBottom: theme.spacing.xs
                    }}>
                      {clientAssets.length}
                    </h3>
                    <p className="mobile-card-label" style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.base,
                      color: colors.textSecondary,
                      marginBottom: theme.spacing.sm
                    }}>
                      Assets
                    </p>
                    <p style={{
                      margin: 0,
                      fontSize: theme.typography.fontSizes.sm,
                      color: colors.textSecondary
                    }}>
                      {clientAssets.length === 0 ? 'No assets yet' : `${clientAssets.length} ${clientAssets.length === 1 ? 'asset' : 'assets'} available`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="responsive-card-padding" style={{
                background: colors.white,
                borderRadius: theme.radius.xl,
                padding: theme.spacing.xl,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: `1px solid ${colors.border}`
              }}>
                <h2 className="responsive-text-xl" style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.xl,
                  fontWeight: theme.typography.fontWeights.bold,
                  color: colors.textPrimary,
                  marginBottom: theme.spacing.xl
                }}>
                  Recent Activity
          </h2>
                {allInvoices.slice(0, 5).length === 0 ? (
                  <p style={{ color: colors.textSecondary, textAlign: 'center', padding: theme.spacing.xl }}>
                    No recent activity
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
                    {allInvoices.slice(0, 5).map((invoice, index) => (
                      <div key={invoice._id || invoice.linkId || index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.md,
                        padding: theme.spacing.md,
                        borderRadius: theme.radius.md,
                        background: index % 2 === 0 ? colors.background : 'transparent',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = colors.primaryBg;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = index % 2 === 0 ? colors.background : 'transparent';
                      }}
                      >
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '10px',
                          background: getStatusBg(invoice.status),
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {invoice.status === 'Paid' ? (
                            <FaCheck style={{ color: colors.success }} />
                          ) : invoice.status === 'Pending' ? (
                            <FaClock style={{ color: colors.warning }} />
                          ) : (
                            <FaTimes style={{ color: colors.error }} />
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSizes.base,
                            fontWeight: theme.typography.fontWeights.semibold,
                            color: colors.textPrimary
                          }}>
                            {invoice.packageName || invoice.description || 'Invoice'}
                          </p>
                          <p style={{
                            margin: 0,
                            fontSize: theme.typography.fontSizes.sm,
            color: colors.textSecondary
          }}>
                            {formatDate(invoice.createdAt || invoice.paymentDate)}
          </p>
        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{
                            margin: 0,
                            fontSize: theme.typography.fontSizes.base,
                            fontWeight: theme.typography.fontWeights.semibold,
                            color: colors.primary
                          }}>
                            {formatCurrency(invoice.total || invoice.amount)}
                          </p>
                          <span style={{
                            padding: `2px ${theme.spacing.xs}`,
                            borderRadius: theme.radius.sm,
                            fontSize: theme.typography.fontSizes.xs,
                            fontWeight: theme.typography.fontWeights.medium,
                            background: getStatusBg(invoice.status),
                            color: getStatusColor(invoice.status)
                          }}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div className="fade-in">
              <div style={{ marginBottom: theme.spacing.xl, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.md }}>
                <div>
                  <h2 className="responsive-text-2xl" style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes['2xl'],
                    fontWeight: theme.typography.fontWeights.bold,
                    color: colors.textPrimary,
                    marginBottom: theme.spacing.xs
                  }}>
                    {showPendingOnly ? 'Pending Invoices' : 'All Invoices'}
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.base,
                    color: colors.textSecondary
                  }}>
                    {showPendingOnly ? 'View and pay your pending invoices' : 'View and manage all your invoices and payments'}
                  </p>
                </div>
                {showPendingOnly && (
                  <button
                    onClick={() => setShowPendingOnly(false)}
                    style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                      background: colors.white,
                      color: colors.textPrimary,
                      border: `1px solid ${colors.border}`,
                      borderRadius: theme.radius.md,
                      cursor: 'pointer',
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: theme.typography.fontWeights.medium
                    }}
                  >
                    Show All
                  </button>
                )}
              </div>

        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing['3xl'],
            minHeight: '400px'
          }}>
            <FaSpinner style={{
              fontSize: '48px',
              color: colors.primary,
              animation: 'spin 1s linear infinite'
            }} />
          </div>
        ) : (showPendingOnly ? pendingInvoices : allInvoices).length === 0 ? (
          <div style={{
            background: colors.white,
            padding: theme.spacing['3xl'],
                  borderRadius: theme.radius.xl,
            textAlign: 'center',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: colors.successBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
              marginBottom: theme.spacing.lg
                  }}>
                    <FaCheckCircle style={{ fontSize: '40px', color: colors.success }} />
                  </div>
            <h3 style={{
              margin: 0,
              fontSize: theme.typography.fontSizes.xl,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
              marginBottom: theme.spacing.sm
            }}>
                    No Invoices Found
            </h3>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSizes.base,
              color: colors.textSecondary
            }}>
                    You don't have any invoices at this time.
            </p>
          </div>
        ) : (
                <div className="responsive-content-grid" style={{ display: 'grid', gap: theme.spacing.lg }}>
            {(showPendingOnly ? pendingInvoices : allInvoices).map((invoice, index) => (
              <div
                key={invoice._id || invoice.linkId || index}
                      className="responsive-card-padding card-hover"
                style={{
                  background: colors.white,
                        borderRadius: theme.radius.xl,
                  border: `1px solid ${colors.border}`,
                  padding: theme.spacing.xl,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                        opacity: invoice.status === 'Expired' ? 0.8 : 1
                }}
              >
                      <div className="responsive-invoice-card" style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: theme.spacing.lg,
                  flexWrap: 'wrap',
                  gap: theme.spacing.md
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm,
                            marginBottom: theme.spacing.sm,
                            flexWrap: 'wrap'
                    }}>
                      <h3 style={{
                        margin: 0,
                        fontSize: theme.typography.fontSizes.xl,
                              fontWeight: theme.typography.fontWeights.bold,
                        color: colors.textPrimary
                      }}>
                        {invoice.packageName || invoice.description || 'Invoice'}
                      </h3>
                      <span style={{
                        padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                              borderRadius: theme.radius.full,
                        fontSize: theme.typography.fontSizes.xs,
                              fontWeight: theme.typography.fontWeights.semibold,
                        background: getStatusBg(invoice.status),
                              color: getStatusColor(invoice.status)
                      }}>
                        {invoice.status}
                      </span>
                    </div>
                    {invoice.invoiceNumber && (
                      <p style={{
                        margin: 0,
                        fontSize: theme.typography.fontSizes.sm,
                        color: colors.textSecondary,
                        marginBottom: theme.spacing.xs
                      }}>
                        Invoice #: {invoice.invoiceNumber}
                      </p>
                    )}
                    {invoice.packageDescription && (
                      <p style={{
                        margin: 0,
                        fontSize: theme.typography.fontSizes.base,
                        color: colors.textSecondary,
                              marginTop: theme.spacing.sm,
                              lineHeight: '1.6'
                      }}>
                        {invoice.packageDescription}
                      </p>
                    )}
                  </div>
                        <div style={{ textAlign: 'right' }}>
                    <div style={{
                      fontSize: theme.typography.fontSizes['2xl'],
                      fontWeight: theme.typography.fontWeights.bold,
                      color: colors.primary,
                            marginBottom: theme.spacing.xs
                    }}>
                      {formatCurrency(invoice.total || invoice.amount)}
                    </div>
                    {invoice.createdAt || invoice.paymentDate ? (
                      <div style={{
                        fontSize: theme.typography.fontSizes.sm,
                        color: colors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.xs,
                              justifyContent: 'flex-end'
                      }}>
                              <FaCalendarAlt style={{ fontSize: '12px' }} />
                        {formatDate(invoice.createdAt || invoice.paymentDate)}
                      </div>
                    ) : null}
                  </div>
                </div>

                {invoice.linkId && invoice.status === 'Pending' && (
                  <div style={{
                    marginTop: theme.spacing.lg,
                    paddingTop: theme.spacing.lg,
                    borderTop: `1px solid ${colors.border}`
                  }}>
                    <Button
                      variant="primary"
                      onClick={() => navigate(`/pay/${invoice.linkId}`)}
                      style={{
                        width: '100%',
                        justifyContent: 'center',
                        padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                              fontSize: theme.typography.fontSizes.base,
                        fontWeight: theme.typography.fontWeights.semibold
                      }}
                    >
                      Pay Now
                    </Button>
                  </div>
                )}

                {invoice.status === 'Expired' && (
                  <div style={{
                    marginTop: theme.spacing.lg,
                    padding: theme.spacing.md,
                    background: colors.errorBg,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.error}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    color: colors.error
                  }}>
                    <FaExclamationCircle />
                    <span style={{ fontSize: theme.typography.fontSizes.sm }}>
                      This invoice has expired. Please contact support for assistance.
                    </span>
                  </div>
                )}
              </div>
            ))}
                </div>
              )}
          </div>
        )}

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div className="fade-in">
          <div style={{ marginBottom: theme.spacing.xl }}>
                <h2 className="responsive-text-2xl" style={{
              margin: 0,
                  fontSize: theme.typography.fontSizes['2xl'],
              fontWeight: theme.typography.fontWeights.bold,
              color: colors.textPrimary,
                  marginBottom: theme.spacing.xs
            }}>
                  Your Services
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSizes.base,
              color: colors.textSecondary
            }}>
                  Manage your hosting, domain, and VPS services
            </p>
          </div>

          {hostingLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: theme.spacing['3xl'],
              background: colors.white,
                  borderRadius: theme.radius.xl,
              border: `1px solid ${colors.border}`
            }}>
              <FaSpinner style={{
                fontSize: '32px',
                color: colors.primary,
                animation: 'spin 1s linear infinite'
              }} />
            </div>
          ) : hostingDomains.length === 0 ? (
            <div style={{
              background: colors.white,
              padding: theme.spacing['3xl'],
                  borderRadius: theme.radius.xl,
              textAlign: 'center',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
            }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: colors.primaryBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: theme.spacing.lg
                  }}>
                    <FaServer style={{ fontSize: '40px', color: colors.primary, opacity: 0.6 }} />
                  </div>
              <h3 style={{
                margin: 0,
                fontSize: theme.typography.fontSizes.xl,
                fontWeight: theme.typography.fontWeights.semibold,
                color: colors.textPrimary,
                marginBottom: theme.spacing.sm
              }}>
                No Services Found
              </h3>
              <p style={{
                margin: 0,
                fontSize: theme.typography.fontSizes.base,
                    color: colors.textSecondary
              }}>
                You don't have any hosting, domain, or VPS services registered.
              </p>
            </div>
          ) : (
                <div className="responsive-service-grid" style={{ display: 'grid', gap: theme.spacing.lg }}>
              {hostingDomains.map((record) => {
                const endDate = record.endDate ? new Date(record.endDate) : null;
                const isExpired = endDate && endDate < new Date();
                const status = isExpired ? 'Expired' : 'Active';
                const daysUntilExpiry = endDate ? Math.ceil((endDate - new Date()) / (1000 * 60 * 60 * 24)) : null;

                const getTypeIcon = () => {
                  switch (record.type) {
                        case 'Hosting': return <FaServer style={{ fontSize: '20px' }} />;
                        case 'Domain': return <FaGlobe style={{ fontSize: '20px' }} />;
                        case 'VPS': return <FaCloud style={{ fontSize: '20px' }} />;
                        default: return <FaTag style={{ fontSize: '20px' }} />;
                  }
                };

                const getTypeColor = () => {
                  switch (record.type) {
                        case 'Hosting': return colors.primary;
                        case 'Domain': return colors.success;
                        case 'VPS': return colors.info;
                        default: return colors.textSecondary;
                  }
                };

                return (
                  <div
                    key={record._id}
                        className="responsive-card-padding card-hover"
                    style={{
                      background: colors.white,
                          borderRadius: theme.radius.xl,
                      border: `1px solid ${colors.border}`,
                      padding: theme.spacing.xl,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                      opacity: isExpired ? 0.7 : 1,
                          transition: 'all 0.3s ease'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: theme.spacing.lg,
                      flexWrap: 'wrap',
                      gap: theme.spacing.md
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                              marginBottom: theme.spacing.sm,
                              flexWrap: 'wrap'
                        }}>
                          <div style={{
                            color: getTypeColor(),
                            display: 'flex',
                            alignItems: 'center'
                          }}>
                            {getTypeIcon()}
                          </div>
                          <h3 style={{
                            margin: 0,
                            fontSize: theme.typography.fontSizes.xl,
                                fontWeight: theme.typography.fontWeights.bold,
                            color: colors.textPrimary
                          }}>
                            {record.name}
                          </h3>
                          <span style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.radius.full,
                            fontSize: theme.typography.fontSizes.xs,
                                fontWeight: theme.typography.fontWeights.semibold,
                                background: record.type === 'Hosting' ? '#1e293b' : record.type === 'Domain' ? colors.successBg : colors.infoBg,
                            color: getTypeColor()
                          }}>
                            {record.type}
                          </span>
                          <span style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            borderRadius: theme.radius.full,
                            fontSize: theme.typography.fontSizes.xs,
                                fontWeight: theme.typography.fontWeights.semibold,
                                background: isExpired ? colors.errorBg : colors.successBg,
                            color: isExpired ? colors.error : colors.success
                          }}>
                            {status}
                          </span>
                        </div>
                        {record.duration && (
                          <p style={{
                            margin: 0,
                            fontSize: theme.typography.fontSizes.sm,
                            color: colors.textSecondary,
                            marginBottom: theme.spacing.xs
                          }}>
                            Duration: {record.duration}
                          </p>
                        )}
                        {record.notes && (
                          <p style={{
                            margin: 0,
                            fontSize: theme.typography.fontSizes.sm,
                            color: colors.textSecondary,
                            marginTop: theme.spacing.sm,
                            fontStyle: 'italic'
                          }}>
                            {record.notes}
                          </p>
                        )}
                      </div>
                    </div>

                        <div className="responsive-content-grid" style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: theme.spacing.md,
                      paddingTop: theme.spacing.lg,
                      borderTop: `1px solid ${colors.border}`
                    }}>
                      <div>
                        <div style={{
                          fontSize: theme.typography.fontSizes.xs,
                          color: colors.textSecondary,
                          marginBottom: theme.spacing.xs,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: theme.typography.fontWeights.semibold
                        }}>
                          Start Date
                        </div>
                        <div style={{
                          fontSize: theme.typography.fontSizes.base,
                          color: colors.textPrimary,
                          fontWeight: theme.typography.fontWeights.medium,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs
                        }}>
                          <FaCalendarAlt style={{ fontSize: '14px', color: colors.textSecondary }} />
                          {record.startDate ? formatDate(record.startDate) : '-'}
                        </div>
                      </div>
                      <div>
                        <div style={{
                          fontSize: theme.typography.fontSizes.xs,
                          color: colors.textSecondary,
                          marginBottom: theme.spacing.xs,
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          fontWeight: theme.typography.fontWeights.semibold
                        }}>
                          End Date
                        </div>
                        <div style={{
                          fontSize: theme.typography.fontSizes.base,
                          color: isExpired ? colors.error : colors.textPrimary,
                          fontWeight: theme.typography.fontWeights.medium,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.xs
                        }}>
                          <FaCalendarAlt style={{ fontSize: '14px', color: colors.textSecondary }} />
                          {record.endDate ? formatDate(record.endDate) : '-'}
                        </div>
                      </div>
                      {daysUntilExpiry !== null && (
                        <div>
                          <div style={{
                            fontSize: theme.typography.fontSizes.xs,
                            color: colors.textSecondary,
                            marginBottom: theme.spacing.xs,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            fontWeight: theme.typography.fontWeights.semibold
                          }}>
                            {isExpired ? 'Days Expired' : 'Days Remaining'}
                          </div>
                          <div style={{
                            fontSize: theme.typography.fontSizes.base,
                            color: isExpired ? colors.error : daysUntilExpiry <= 30 ? colors.warning : colors.textPrimary,
                            fontWeight: theme.typography.fontWeights.bold
                          }}>
                            {isExpired ? Math.abs(daysUntilExpiry) : daysUntilExpiry} days
                          </div>
                        </div>
                      )}
                    </div>

                    {isExpired && (
                      <div style={{
                        marginTop: theme.spacing.lg,
                        padding: theme.spacing.md,
                        background: colors.errorBg,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${colors.error}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        color: colors.error
                      }}>
                        <FaExclamationCircle />
                        <span style={{ fontSize: theme.typography.fontSizes.sm }}>
                          This service has expired. Please contact support to renew.
                        </span>
                      </div>
                    )}
                    {!isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                      <div style={{
                        marginTop: theme.spacing.lg,
                        padding: theme.spacing.md,
                        background: colors.warningBg,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${colors.warning}`,
                        display: 'flex',
                        alignItems: 'center',
                        gap: theme.spacing.sm,
                        color: colors.warning
                      }}>
                        <FaExclamationCircle />
                        <span style={{ fontSize: theme.typography.fontSizes.sm }}>
                          This service will expire in {daysUntilExpiry} day{daysUntilExpiry !== 1 ? 's' : ''}. Please renew soon.
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="fade-in">
              <div style={{ marginBottom: theme.spacing.xl }}>
                <h2 className="responsive-text-2xl" style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes['2xl'],
                  fontWeight: theme.typography.fontWeights.bold,
                  color: colors.textPrimary,
                  marginBottom: theme.spacing.xs
                }}>
                  Your Assets
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.base,
                  color: colors.textSecondary
                }}>
                  View all your assets and resources
                </p>
              </div>

              {assetsLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: theme.spacing['3xl'],
                  background: colors.white,
                  borderRadius: theme.radius.xl,
                  border: `1px solid ${colors.border}`
                }}>
                  <FaSpinner style={{
                    fontSize: '32px',
                    color: colors.primary,
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : clientAssets.length === 0 ? (
                <div style={{
                  background: colors.white,
                  padding: theme.spacing['3xl'],
                  borderRadius: theme.radius.xl,
                  textAlign: 'center',
                  border: `1px solid ${colors.border}`,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: colors.primaryBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: theme.spacing.lg
                  }}>
                    <FaBoxOpen style={{ fontSize: '40px', color: colors.primary, opacity: 0.6 }} />
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.xl,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                    marginBottom: theme.spacing.sm
                  }}>
                    No Assets Found
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.base,
                    color: colors.textSecondary
                  }}>
                    You don't have any assets assigned yet.
                  </p>
                </div>
              ) : (
                <div className="responsive-content-grid" style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: theme.spacing.lg
                }}>
                  {clientAssets.map((asset) => (
                    <div
                      key={asset._id}
                      className="responsive-card-padding card-hover"
                      style={{
                        background: colors.white,
                        borderRadius: theme.radius.xl,
                        padding: theme.spacing.xl,
                        border: `1px solid ${colors.border}`,
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: theme.spacing.md
                      }}
                    >
                      <div>
                        <h4 style={{
                          margin: 0,
                          fontSize: theme.typography.fontSizes.lg,
                          fontWeight: theme.typography.fontWeights.semibold,
                          color: colors.textPrimary,
                          marginBottom: theme.spacing.sm
                        }}>
                          {asset.name}
                        </h4>
                        <a
                          href={asset.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: colors.primary,
                            textDecoration: 'none',
                            fontSize: theme.typography.fontSizes.sm,
                            wordBreak: 'break-all',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.textDecoration = 'underline';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.textDecoration = 'none';
                          }}
                        >
                          <FaGlobe style={{ fontSize: '14px', flexShrink: 0 }} />
                          {asset.link}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {false && activeTab === 'messages' && (
            <div className="fade-in">
              <div style={{ marginBottom: theme.spacing.xl }}>
                <h2 className="responsive-text-2xl" style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes['2xl'],
                  fontWeight: theme.typography.fontWeights.bold,
                  color: colors.textPrimary,
                  marginBottom: theme.spacing.xs
                }}>
                  Messages
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.base,
                  color: colors.textSecondary
                }}>
                  Communicate with your support team
                </p>
              </div>

              {notesLoading ? (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: theme.spacing['3xl'],
                  background: colors.white,
                  borderRadius: theme.radius.xl,
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                }}>
                  <FaSpinner style={{
                    fontSize: '24px',
                    color: colors.primary,
                    animation: 'spin 1s linear infinite'
                  }} />
                </div>
              ) : clientNotes.length === 0 ? (
                <div style={{
                  background: colors.white,
                  padding: theme.spacing['3xl'],
                  borderRadius: theme.radius.xl,
                  textAlign: 'center',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  border: `1px solid ${colors.border}`
                }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: colors.primaryBg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto',
                    marginBottom: theme.spacing.lg
                  }}>
                    <FaComments style={{ fontSize: '40px', color: colors.primary, opacity: 0.6 }} />
                  </div>
                  <h3 style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.xl,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: colors.textPrimary,
                    marginBottom: theme.spacing.sm
                  }}>
                    No Messages Yet
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.base,
                    color: colors.textSecondary
                  }}>
                    Start a conversation with your support team!
                  </p>
                </div>
              ) : (
                <>
                  <div className="responsive-card-padding" style={{
                    background: colors.white,
                    borderRadius: theme.radius.xl,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                    border: `1px solid ${colors.border}`,
                    padding: theme.spacing.xl,
                    maxHeight: windowWidth <= 640 ? '400px' : '600px',
                    overflowY: 'auto',
                    marginBottom: theme.spacing.lg
                  }}>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: theme.spacing.xl
                    }}>
                      {clientNotes.map((note) => (
                        <div key={note._id}>
                          {/* Main Note */}
                          <div style={{
                            display: 'flex',
                            gap: theme.spacing.md,
                            alignItems: 'flex-start'
                          }}>
                            {/* Avatar */}
                            <div className="responsive-message-avatar" style={{
                              width: '44px',
                              height: '44px',
                              borderRadius: '50%',
                              background: note.isFromClient 
                                ? `linear-gradient(135deg, ${colors.success} 0%, ${colors.successDark} 100%)`
                                : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              boxShadow: `0 2px 8px rgba(0,0,0,0.15)`,
                              fontWeight: theme.typography.fontWeights.bold,
                              color: colors.white,
                              fontSize: theme.typography.fontSizes.base
                            }}>
                              {(note.userName || (note.userId ? `${note.userId.First_Name || ''} ${note.userId.Last_Name || ''}`.trim() : 'TM')).charAt(0).toUpperCase()}
                            </div>
                            
                            {/* Message Content */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{
                                background: 'transparent',
                                borderRadius: theme.radius.xl,
                                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                                boxShadow: `0 2px 8px rgba(0,0,0,0.08)`,
                                border: `1px solid ${note.isFromClient ? colors.successLight : colors.primaryLight}`,
                                marginBottom: theme.spacing.xs
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.sm,
                                  marginBottom: theme.spacing.xs,
                                  flexWrap: 'wrap'
                                }}>
                                  <strong style={{
                                    fontSize: theme.typography.fontSizes.sm,
                                    fontWeight: theme.typography.fontWeights.bold,
                                    color: colors.textPrimary
                                  }}>
                                    {note.userName || (note.userId ? `${note.userId.First_Name || ''} ${note.userId.Last_Name || ''}`.trim() : 'Team Member')}
                                  </strong>
                                  {note.userRole && (
                                    <span style={{
                                      padding: `3px ${theme.spacing.xs}`,
                                      borderRadius: theme.radius.full,
                                      fontSize: theme.typography.fontSizes.xs,
                                      fontWeight: theme.typography.fontWeights.semibold,
                                      background: note.isFromClient ? colors.success : colors.primary,
                                      color: colors.white,
                                      textTransform: 'uppercase',
                                      letterSpacing: '0.5px'
                                    }}>
                                      {note.userRole}
                                    </span>
                                  )}
                                  <span style={{
                                    fontSize: theme.typography.fontSizes.xs,
                                    color: colors.textSecondary,
                                    marginLeft: 'auto',
                                    fontWeight: theme.typography.fontWeights.medium
                                  }}>
                                    {formatDate(note.createdAt)} {formatTime(note.createdAt)}
                                  </span>
                                </div>
                                <p style={{
                                  margin: 0,
                                  fontSize: theme.typography.fontSizes.base,
                                  color: colors.textPrimary,
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  lineHeight: '1.6'
                                }}>
                                  {note.message}
                                </p>
                              </div>
                              
                              {/* Reply Button */}
                              <button
                                onClick={() => setReplyingTo(replyingTo === note._id ? null : note._id)}
                                style={{
                                  background: 'transparent',
                                  border: 'none',
                                  color: colors.primary,
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.sm,
                                  cursor: 'pointer',
                                  fontSize: theme.typography.fontSizes.xs,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.xs,
                                  fontWeight: theme.typography.fontWeights.medium,
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.background = '#1e293b';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.background = 'transparent';
                                }}
                              >
                                <FaComments style={{ fontSize: '11px' }} />
                                {replyingTo === note._id ? 'Cancel' : 'Reply'}
                              </button>
                            </div>
                          </div>

                          {/* Reply Form */}
                          {replyingTo === note._id && (
                            <div className="responsive-reply-margin" style={{
                              marginLeft: '60px',
                              marginTop: theme.spacing.md,
                              background: colors.white,
                              borderRadius: theme.radius.xl,
                              padding: theme.spacing.md,
                              border: `2px solid ${colors.primaryLight}`,
                              boxShadow: `0 4px 12px rgba(0,0,0,0.1)`
                            }}>
                              <div style={{
                                fontSize: theme.typography.fontSizes.xs,
                                color: colors.textSecondary,
                                marginBottom: theme.spacing.xs,
                                fontWeight: theme.typography.fontWeights.medium
                              }}>
                                Replying to {note.userName || 'this message'}
                              </div>
                              <textarea
                                value={newNote.message}
                                onChange={(e) => setNewNote({ ...newNote, message: e.target.value })}
                                placeholder="Type your reply..."
                                rows={3}
                                style={{
                                  width: '100%',
                                  padding: theme.spacing.md,
                                  borderRadius: theme.radius.md,
                                  border: `1px solid ${colors.border}`,
                                  fontSize: theme.typography.fontSizes.base,
                                  fontFamily: theme.typography.fontFamily,
                                  resize: 'vertical',
                                  marginBottom: theme.spacing.sm,
                                  outline: 'none',
                                  transition: 'all 0.2s ease'
                                }}
                                onFocus={(e) => {
                                  e.target.style.borderColor = colors.primary;
                                  e.target.style.boxShadow = `0 0 0 3px #1e293b`;
                                }}
                                onBlur={(e) => {
                                  e.target.style.borderColor = colors.border;
                                  e.target.style.boxShadow = 'none';
                                }}
                              />
                              <div style={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: theme.spacing.sm
                              }}>
                                <button
                                  onClick={() => {
                                    setReplyingTo(null);
                                    setNewNote({ message: '', parentNoteId: null });
                                  }}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    background: colors.white,
                                    color: colors.textSecondary,
                                    border: `1px solid ${colors.border}`,
                                    borderRadius: theme.radius.md,
                                    cursor: 'pointer',
                                    fontSize: theme.typography.fontSizes.sm,
                                    fontWeight: theme.typography.fontWeights.medium,
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.background = '#1e293b';
                                    e.target.style.borderColor = colors.primary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.background = colors.white;
                                    e.target.style.borderColor = colors.border;
                                  }}
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() => handleSendNote(note._id)}
                                  disabled={sendingNote || !newNote.message.trim()}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                                    background: sendingNote || !newNote.message.trim() ? colors.muted : colors.primary,
                                    color: colors.white,
                                    border: 'none',
                                    borderRadius: theme.radius.md,
                                    cursor: sendingNote || !newNote.message.trim() ? 'not-allowed' : 'pointer',
                                    opacity: sendingNote || !newNote.message.trim() ? 0.6 : 1,
                                    fontSize: theme.typography.fontSizes.sm,
                                    fontWeight: theme.typography.fontWeights.semibold,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: theme.spacing.xs,
                                    boxShadow: sendingNote || !newNote.message.trim() ? 'none' : `0 2px 8px rgba(0,0,0,0.15)`,
                                    transition: 'all 0.2s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!sendingNote && newNote.message.trim()) {
                                      e.target.style.transform = 'translateY(-1px)';
                                      e.target.style.boxShadow = `0 4px 12px rgba(0,0,0,0.2)`;
                                    }
                                  }}
                                  onMouseLeave={(e) => {
                                    if (!sendingNote && newNote.message.trim()) {
                                      e.target.style.transform = 'translateY(0)';
                                      e.target.style.boxShadow = `0 2px 8px rgba(0,0,0,0.15)`;
                                    }
                                  }}
                                >
                                  {sendingNote ? <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '12px' }} /> : <FaComments style={{ fontSize: '12px' }} />}
                                  Send Reply
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Replies */}
                          {note.replies && note.replies.length > 0 && (
                            <div className="responsive-reply-margin" style={{
                              marginLeft: '60px',
                              marginTop: theme.spacing.md,
                              paddingLeft: theme.spacing.lg,
                              borderLeft: `3px solid ${colors.borderLight}`,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: theme.spacing.md
                            }}>
                              {note.replies.map((reply) => (
                                <div key={reply._id} style={{
                                  display: 'flex',
                                  gap: theme.spacing.sm,
                                  alignItems: 'flex-start'
                                }}>
                                  {/* Reply Avatar */}
                                  <div style={{
                                    width: '36px',
                                    height: '36px',
                                    borderRadius: '50%',
                                    background: reply.isFromClient 
                                      ? `linear-gradient(135deg, ${colors.success} 0%, ${colors.successDark} 100%)`
                                      : `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                    boxShadow: `0 2px 6px rgba(0,0,0,0.1)`,
                                    fontWeight: theme.typography.fontWeights.bold,
                                    color: colors.white,
                                    fontSize: theme.typography.fontSizes.xs
                                  }}>
                                    {(reply.userName || (reply.userId ? `${reply.userId.First_Name || ''} ${reply.userId.Last_Name || ''}`.trim() : 'TM')).charAt(0).toUpperCase()}
                                  </div>
                                  
                                  {/* Reply Content */}
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                      background: 'transparent',
                                      borderRadius: theme.radius.lg,
                                      padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                      boxShadow: `0 1px 4px rgba(0,0,0,0.08)`,
                                      border: `1px solid ${reply.isFromClient ? colors.successLight : colors.primaryLight}`
                                    }}>
                                      <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: theme.spacing.xs,
                                        marginBottom: theme.spacing.xs,
                                        flexWrap: 'wrap'
                                      }}>
                                        <strong style={{
                                          fontSize: theme.typography.fontSizes.xs,
                                          fontWeight: theme.typography.fontWeights.bold,
                                          color: colors.textPrimary
                                        }}>
                                          {reply.userName || (reply.userId ? `${reply.userId.First_Name || ''} ${reply.userId.Last_Name || ''}`.trim() : 'Team Member')}
                                        </strong>
                                        {reply.userRole && (
                                          <span style={{
                                            padding: `2px ${theme.spacing.xs}`,
                                            borderRadius: theme.radius.full,
                                            fontSize: theme.typography.fontSizes.xs,
                                            fontWeight: theme.typography.fontWeights.semibold,
                                            background: reply.isFromClient ? colors.success : colors.primary,
                                            color: colors.white,
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                          }}>
                                            {reply.userRole}
                                          </span>
                                        )}
                                        <span style={{
                                          fontSize: theme.typography.fontSizes.xs,
                                          color: colors.textSecondary,
                                          marginLeft: 'auto',
                                          fontWeight: theme.typography.fontWeights.medium
                                        }}>
                                          {formatDate(reply.createdAt)} {formatTime(reply.createdAt)}
                                        </span>
                                      </div>
                                      <p style={{
                                        margin: 0,
                                        fontSize: theme.typography.fontSizes.sm,
                                        color: colors.textPrimary,
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        lineHeight: '1.5'
                                      }}>
                                        {reply.message}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* New Message Form */}
                  <div className="responsive-card-padding" style={{
                    background: colors.white,
                    borderRadius: theme.radius.xl,
                    padding: theme.spacing.xl,
                    border: `2px solid ${colors.borderLight}`,
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
                  }}>
                    <div style={{
                      fontSize: theme.typography.fontSizes.base,
                      fontWeight: theme.typography.fontWeights.semibold,
                      color: colors.textPrimary,
                      marginBottom: theme.spacing.md,
                      display: 'flex',
                      alignItems: 'center',
                      gap: theme.spacing.sm
                    }}>
                      <FaPaperPlane style={{ color: colors.primary }} />
                      New Message
                    </div>
                    <textarea
                      value={newNote.message}
                      onChange={(e) => setNewNote({ ...newNote, message: e.target.value })}
                      placeholder="Type your message here..."
                      rows={4}
                      style={{
                        width: '100%',
                        padding: theme.spacing.md,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${colors.border}`,
                        fontSize: theme.typography.fontSizes.base,
                        fontFamily: theme.typography.fontFamily,
                        resize: 'vertical',
                        marginBottom: theme.spacing.md,
                        outline: 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = colors.primary;
                        e.target.style.boxShadow = `0 0 0 3px ${colors.primaryBg}`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end'
                    }}>
                      <button
                        onClick={() => handleSendNote()}
                        disabled={sendingNote || !newNote.message.trim()}
                        style={{
                          padding: `${theme.spacing.md} ${theme.spacing.xl}`,
                          background: sendingNote || !newNote.message.trim() ? colors.muted : colors.primary,
                          color: colors.white,
                          border: 'none',
                          borderRadius: theme.radius.md,
                          cursor: sendingNote || !newNote.message.trim() ? 'not-allowed' : 'pointer',
                          opacity: sendingNote || !newNote.message.trim() ? 0.6 : 1,
                          fontSize: theme.typography.fontSizes.base,
                          fontWeight: theme.typography.fontWeights.semibold,
                          display: 'flex',
                          alignItems: 'center',
                          gap: theme.spacing.sm,
                          boxShadow: sendingNote || !newNote.message.trim() ? 'none' : `0 4px 12px rgba(0,0,0,0.2)`,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!sendingNote && newNote.message.trim()) {
                            e.target.style.transform = 'translateY(-2px)';
                            e.target.style.boxShadow = `0 6px 16px rgba(0,0,0,0.25)`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!sendingNote && newNote.message.trim()) {
                            e.target.style.transform = 'translateY(0)';
                            e.target.style.boxShadow = `0 4px 12px rgba(0,0,0,0.2)`;
                          }
                        }}
                      >
                        {sendingNote ? <FaSpinner style={{ animation: 'spin 1s linear infinite', fontSize: '14px' }} /> : <FaPaperPlane style={{ fontSize: '14px' }} />}
                        Send Message
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
      </main>

        {/* Mobile Bottom Navigation - Hide when chat is open */}
        {!showChat && (
          <nav className="mobile-bottom-nav">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    // Smooth scroll to top on mobile
                    if (windowWidth <= 768) {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`mobile-nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none'
                  }}
                >
                  <Icon />
                  <span className="mobile-nav-label">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        )}

      {/* Chat Page */}
      {showChat && (
        <ChatPage 
          colors={colors} 
          onBack={() => setShowChat(false)} 
          hideGroups={true}
          onMessagesViewed={() => setTotalUnreadCount(0)}
        />
      )}

      {/* Floating Chat Icon */}
      {!showChat && (
        <button
          onClick={() => setShowChat(true)}
          style={{
            position: 'fixed',
            bottom: windowWidth <= 768 ? '86px' : '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: brandConfig.primaryColor || colors.primary,
            color: brandConfig.secondaryColor || colors.white,
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          }}
          title="Open Messages"
        >
          <FaComments />
          {!showChat && totalUnreadCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                background: '#ef4444',
                color: 'white',
                borderRadius: '50%',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 'bold',
                border: '2px solid white',
                minWidth: '20px',
                padding: totalUnreadCount > 9 ? '0 4px' : '0'
              }}
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </span>
          )}
        </button>
      )}
    </div>
    </>
  );
}

export default ClientPanel;
