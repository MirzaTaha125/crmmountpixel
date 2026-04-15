import React, { useEffect, useState, useRef } from 'react';
import { useSession } from './session.jsx';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePermissions } from './contexts/PermissionContext';
import { io } from 'socket.io-client';
import axios from 'axios';
import UsersPage from './adminpages/UsersPage';
import ClientsPage from './adminpages/ClientsPage';
import PackagesPage from './adminpages/PackagesPage';
import EmployeesPage from './adminpages/EmployeesPage';
import SalaryPage from './adminpages/SalaryPage';
import DashboardPage from './adminpages/DashboardPage';
import PaymentGeneratorPage from './adminpages/PaymentGeneratorPage';
import CustomPackagesPage from './adminpages/CustomPackagesPage';
import InquiriesPage from './adminpages/InquiriesPage';
import CallSchedulePage from './adminpages/CallSchedulePage';
import PermissionsPage from './adminpages/PermissionsPage';
import ExpensesPage from './adminpages/ExpensesPage';
import DisputesPage from './adminpages/DisputesPage';
import ReportsPage from './adminpages/ReportsPage';
import ActivityLogsPage from './adminpages/ActivityLogsPage';
import TwoFactorSettings from './adminpages/TwoFactorSettings';
import ChatPage from './adminpages/ChatPage';
import AdminAssetsPage from './adminpages/AdminAssetsPage';
import getApiBaseUrl from './apiBase';
import { FaTachometerAlt, FaUsers, FaUserTie, FaBoxOpen, FaMoneyCheckAlt, FaUserCog, FaBars, FaTimes, FaCalendarAlt, FaShieldAlt, FaSignOutAlt, FaUserCircle, FaDollarSign, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaChartBar, FaHistory, FaKey, FaComments, FaBoxes } from 'react-icons/fa';
import notificationService from './services/notificationService';
import { getColors, theme } from './theme';
import { LoadingScreen } from './components/LoadingScreen';
const API_URL = getApiBaseUrl();


function AdminPanel() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const { user, setUser } = useSession();
  const { canDo } = usePermissions();
  const navigate = useNavigate();
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Auto-refresh on inactivity (15 minutes)
  useEffect(() => {
    const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const resetInactivityTimer = () => {
      lastActivityRef.current = Date.now();
      
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }

      inactivityTimerRef.current = setTimeout(() => {
        const timeSinceLastActivity = Date.now() - lastActivityRef.current;
        if (timeSinceLastActivity >= INACTIVITY_TIMEOUT) {
          // User has been inactive for 15 minutes, refresh the page
          window.location.reload();
        }
      }, INACTIVITY_TIMEOUT);
    };

    // Track user activity events
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    // Initialize timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, []);

  const [searchParams, setSearchParams] = useSearchParams();

  // Tab/page state — read from URL first, fallback to localStorage
  const [activeTab, setActiveTab] = useState(() => searchParams.get('tab') || localStorage.getItem('adminActiveTab') || 'dashboard');
  // Sidebar responsive state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  // Track window resize for responsive visibility
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 900;
  // Logout loading state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Unread message count
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  // Payment Toast state
  const [paymentToast, setPaymentToast] = useState(null);

  // Sync active tab to URL and localStorage on change
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab]); // eslint-disable-line

  // Data state (to be passed as props)
  const [users, setUsers] = useState([]);
  const [clients, setClients] = useState([]);
  const [packages, setPackages] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [salaries, setSalaries] = useState([]);

  // Get colors from theme
  const colors = getColors();

  // Fetch data (minimal, just for demo)
  useEffect(() => { fetchUsers(); fetchClients(); fetchPackages(); fetchEmployees(); fetchSalaries(); }, []);

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
    } catch {
      // ignore
    }
  };

  // Poll for unread messages every 10 seconds
  useEffect(() => {
    if (activeTab !== 'chat') {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 10000);
      return () => clearInterval(interval);
    } else {
      setTotalUnreadCount(0); // Reset when chat is open
    }
  }, [activeTab]);
  
  // Socket: listen for global payment notifications
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const socket = io(API_URL, { auth: { token } });
    
    socket.on('invoice_paid', (data) => {
      setPaymentToast({
        message: `Payment received from ${data.clientName}!`,
        sub: `${data.title} — $${parseFloat(data.amount).toFixed(2)}${data.invoiceNumber ? ` (${data.invoiceNumber})` : ''}`,
      });
      // Auto-dismiss after 8 seconds (slightly longer for global visibility)
      setTimeout(() => setPaymentToast(null), 8000);
    });
    
    return () => socket.disconnect();
  }, []);

  // Initialize notification service
  useEffect(() => {
    notificationService.init();
    return () => {
      notificationService.destroy();
    };
  }, []);
  const fetchUsers = async () => { 
    try { 
      const token = localStorage.getItem('token') || (() => {
        try {
          const user = JSON.parse(localStorage.getItem('crm_user') || 'null');
          return user?.token;
        } catch {
          return null;
        }
      })();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.get(`${API_URL}/api/users`, { headers }); 
      setUsers(res.data || []); 
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsers([]);
    }
  };
  const fetchClients = async () => { try { const res = await axios.get(`${API_URL}/api/clients`); setClients(res.data.clients); } catch { /* ignore */ } };
  const fetchPackages = async () => { try { const res = await axios.get(`${API_URL}/api/packages`); setPackages(res.data); } catch { /* ignore */ } };
  const fetchEmployees = async () => { try { const res = await axios.get(`${API_URL}/api/employees`); setEmployees(res.data.employees); } catch { /* ignore */ } };
  const fetchSalaries = async () => { try { const res = await axios.get(`${API_URL}/api/salaries`); setSalaries(res.data.salaries); } catch { /* ignore */ } };

  // Sidebar navigation handlers
  const handleLogout = () => {
    setIsLoggingOut(true);
    // Small delay to show loading screen, then logout
    setTimeout(() => {
      setUser(null);
      localStorage.removeItem('crm_user');
      localStorage.removeItem('token');
      navigate('/signin');
    }, 800);
  };

  // Sidebar dropdown close on outside click

  if (isLoggingOut) {
    return <LoadingScreen message="Signing you out..." />;
  }

  return (
    <div style={{ display: 'flex', background: colors.mainBg, fontFamily: theme.typography.fontFamily }}>
      {/* Sidebar */}
      <aside
        className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
        style={{
          width: sidebarCollapsed ? '80px' : '280px',
          background: colors.sidebarGradient || colors.sidebarBg,
          position: isMobile ? 'fixed' : 'sticky',
          top: 0,
          left: 0,
          bottom: 0,
          alignSelf: 'flex-start',
          zIndex: theme.zIndex.modalBackdrop + 20,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none', // Removed heavy shadow for a flatter, cleaner look
          borderRight: `1px solid ${colors.sidebarHover}`,
          transition: `transform ${theme.transitions.normal}, width ${theme.transitions.normal}`,
          transform: isMobile ? (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)') : 'translateX(0)',
          overflow: 'hidden',
          flexShrink: 0,
          height: '100vh',
          maxHeight: '100vh',
        }}
        id="sidebar-nav"
        aria-hidden={!sidebarOpen && window.innerWidth <= 900}
      >
        {/* Logo */}
        <div style={{
          padding: `${theme.spacing.md} ${theme.spacing.md}`,
          borderBottom: `1px solid ${colors.sidebarHover}`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
          justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          position: 'relative',
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: theme.radius.sm,
            background: colors.sidebarActive,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.white,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: theme.typography.fontSizes.lg,
            flexShrink: 0,
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)',
          }}>
            M
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ 
                color: colors.sidebarTextActive, 
                fontWeight: theme.typography.fontWeights.bold, 
                fontSize: theme.typography.fontSizes.xl,
                letterSpacing: '-0.02em',
                lineHeight: 1.1
              }}>
                MinuteSheet
              </div>
              <div style={{ 
                color: colors.sidebarText, 
                fontSize: '0.6rem', 
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginTop: '4px',
                fontWeight: theme.typography.fontWeights.bold,
                opacity: 0.8
              }}>
                Admin Terminal
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav className="sidebar-nav-scroll" style={{ flex: 1, padding: 0, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              { category: 'Main', items: [
                { id: 'dashboard', icon: FaTachometerAlt, label: 'Dashboard', permission: 'view_dashboard' },
              ]},
              { category: 'Market & Sales', items: [
                { id: 'reports', icon: FaChartBar, label: 'Sales Report', permission: 'view_reports' },
                { id: 'payment-generator', icon: FaMoneyCheckAlt, label: 'Invoice Generator', permission: 'view_payment_generator' },
                { id: 'packages', icon: FaBoxOpen, label: 'Packages', permission: 'view_packages' },
                { id: 'custom-packages', icon: FaBoxOpen, label: 'Custom Packages', permission: 'view_custom_packages' },
              ]},
              { category: 'Customers & CRM', items: [
                { id: 'inquiries', icon: FaUserTie, label: 'Inquiries', permission: 'view_inquiries' },
                { id: 'call-schedule', icon: FaCalendarAlt, label: 'Call Schedule', permission: 'view_schedule_calls' },
                { id: 'clients', icon: FaUsers, label: 'Clients', permission: 'view_clients' },
                { id: 'disputes', icon: FaExclamationTriangle, label: 'Disputes', permission: 'view_disputes' },
              ]},
              { category: 'Management', items: [
                { id: 'employees', icon: FaUserTie, label: 'Employees', permission: 'view_employees' },
                { id: 'salary', icon: FaMoneyCheckAlt, label: 'Salary', permission: 'view_salary' },
                { id: 'expenses', icon: FaDollarSign, label: 'Expenses', permission: 'view_expenses' },
              ]},
              { category: 'System & Security', items: [
                { id: 'users', icon: FaUserCog, label: 'Users', permission: 'view_users' },
                { id: 'permissions', icon: FaShieldAlt, label: 'Permissions', permission: 'view_permissions' },
                { id: 'activity-logs', icon: FaHistory, label: 'Activity Logs', permission: 'view_activity_logs' },
                { id: 'admin-assets', icon: FaBoxes, label: 'Admin Assets', permission: 'view_users' },
                { id: '2fa-settings', icon: FaKey, label: '2FA Settings', permission: 'view_2fa_settings' },
              ]},
            ].map(section => (
              <React.Fragment key={section.category}>
                {!sidebarCollapsed && (
                  <div style={{
                    padding: `${theme.spacing.lg} ${theme.spacing.lg} ${theme.spacing.xs}`,
                    fontSize: '0.6rem',
                    fontWeight: theme.typography.fontWeights.bold,
                    color: colors.sidebarText,
                    textTransform: 'none',
                    letterSpacing: '0.05em',
                    opacity: 0.6,
                    borderTop: section.category !== 'Main' ? `1px solid ${colors.sidebarHover}` : 'none',
                    marginTop: section.category !== 'Main' ? theme.spacing.sm : 0,
                  }}>
                    {section.category}
                  </div>
                )}
                {section.items.filter(({ permission }) => !permission || canDo(permission) || user?.Role === 'Admin').map(({ id, icon: Icon, label }) => (
                  <li
                    key={id}
                    onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                    onMouseEnter={() => setHoveredNavItem(id)}
                    onMouseLeave={() => setHoveredNavItem(null)}
                    style={{
                      marginBottom: '4px',
                      mx: theme.spacing.sm,
                      cursor: 'pointer',
                      borderRadius: theme.radius.md,
                      margin: `0 ${theme.spacing.sm} 4px`,
                      background: activeTab === id ? colors.sidebarHover : 'transparent',
                      transition: `all ${theme.transitions.fast}`,
                      position: 'relative',
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: sidebarCollapsed ? 0 : theme.spacing.md,
                      padding: `${theme.spacing.md} ${sidebarCollapsed ? theme.spacing.xs : theme.spacing.lg}`,
                      color: activeTab === id ? colors.sidebarTextActive : colors.sidebarText,
                      fontWeight: activeTab === id ? theme.typography.fontWeights.bold : theme.typography.fontWeights.semibold,
                      fontSize: '0.85rem',
                      textTransform: 'none',
                      letterSpacing: '0.02em',
                      justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    }}>
                      <Icon style={{ 
                        fontSize: '1.1rem', 
                        width: '24px', 
                        textAlign: 'center', 
                        flexShrink: 0,
                        color: activeTab === id ? colors.sidebarActive : 'inherit'
                      }} />
                      {!sidebarCollapsed && <span>{label}</span>}
                    </div>
                    {/* Tooltip when collapsed */}
                    {sidebarCollapsed && hoveredNavItem === id && (
                      <div style={{
                        position: 'absolute',
                        left: '100%',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        marginLeft: theme.spacing.sm,
                        background: colors.textPrimary,
                        color: colors.white,
                        padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                        borderRadius: theme.radius.md,
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: theme.typography.fontWeights.bold,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: theme.shadows.md,
                        zIndex: 1002,
                      }}>
                        {label}
                      </div>
                    )}
                  </li>
                ))}
              </React.Fragment>
            ))}
          </ul>
        </nav>
        
        {/* User Section */}
        <div style={{
          padding: sidebarCollapsed ? theme.spacing.sm : theme.spacing.md,
          borderTop: `1px solid ${colors.sidebarHover}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: sidebarCollapsed ? 0 : theme.spacing.sm,
            color: colors.sidebarText,
            marginBottom: theme.spacing.sm,
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
          }}>
            <FaUserCircle style={{ fontSize: '1.2rem', flexShrink: 0 }} />
            {!sidebarCollapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.xs,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {user?.First_Name} {user?.Last_Name}
                </div>
                <div style={{
                  fontSize: theme.typography.fontSizes['2xs'] || '0.65rem',
                  color: colors.sidebarText,
                  opacity: 0.7,
                  marginTop: '1px',
                }}>
                  {user?.Role || 'Admin'}
                </div>
              </div>
            )}
          </div>
          <div style={{
            display: 'flex',
            gap: theme.spacing.xs,
          }}>
            <button
              onClick={handleLogout}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: sidebarCollapsed ? 0 : theme.spacing.xs,
                padding: `${theme.spacing.xs} ${sidebarCollapsed ? theme.spacing.xs : theme.spacing.sm}`,
                background: 'transparent',
                border: `1px solid ${colors.sidebarHover}`,
                borderRadius: 0,
                color: colors.sidebarText,
                cursor: 'pointer',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
                fontWeight: theme.typography.fontWeights.bold,
                transition: `all ${theme.transitions.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7f1d1d'; // Deep red for logout hover
                e.currentTarget.style.borderColor = '#991b1b';
                e.currentTarget.style.color = colors.white;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = colors.sidebarHover;
                e.currentTarget.style.color = colors.sidebarText;
              }}
              title={sidebarCollapsed ? 'Logout' : ''}
            >
              <FaSignOutAlt />
              {!sidebarCollapsed && <span style={{ marginLeft: '4px' }}>Logout</span>}
            </button>
            
            {/* Collapse Button */}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: sidebarCollapsed ? 0 : theme.spacing.xs,
                padding: `${theme.spacing.xs} ${sidebarCollapsed ? theme.spacing.xs : theme.spacing.sm}`,
                background: 'transparent',
                border: `1px solid ${colors.sidebarHover}`,
                borderRadius: 0,
                color: colors.sidebarText,
                cursor: 'pointer',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.025em',
                fontWeight: theme.typography.fontWeights.bold,
                transition: `all ${theme.transitions.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.sidebarHover;
                e.currentTarget.style.color = colors.sidebarTextActive;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = colors.sidebarText;
              }}
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
              {!sidebarCollapsed && <span style={{ marginLeft: '4px' }}>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      <div
        className={`mobile-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(15, 23, 42, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: theme.zIndex.modalBackdrop - 1,
          opacity: 0,
          visibility: 'hidden',
          transition: `all ${theme.transitions.normal}`,
        }}
      />
      
      {/* Styles moved to the bottom style tag */}
      
      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: `${theme.spacing.md} ${isMobile ? theme.spacing.sm : theme.spacing.lg}`,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        animation: 'fadeIn 0.4s ease-out',
        transition: `all ${theme.transitions.normal}`,
        marginLeft: 0,
      }} className="main-content">
        {/* Mobile Hamburger Menu - Fixed position for accessibility */}
        {activeTab !== 'chat' && (
          <button
            className="sidebar-hamburger"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              position: 'fixed',
              top: theme.spacing.md,
              left: theme.spacing.md,
              zIndex: 1100, // Explicitly high to beat any content cards
              background: colors.white,
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radius.md,
              padding: theme.spacing.sm,
              cursor: 'pointer',
              fontSize: '20px',
              color: colors.textPrimary,
              boxShadow: theme.shadows.md,
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              transition: `all ${theme.transitions.fast}`,
            }}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>
        )}

        <div style={{ height: isMobile ? '50px' : 0 }} />

        
        {/* Content Section */}
        <section style={{
          background: (activeTab === 'chat' || activeTab === 'dashboard') ? 'transparent' : colors.cardBg,
          borderRadius: theme.radius.lg,
          boxShadow: (activeTab === 'chat' || activeTab === 'dashboard') ? 'none' : theme.shadows.sm,
          border: (activeTab === 'chat' || activeTab === 'dashboard') ? 'none' : `1px solid ${colors.border}`,
          padding: activeTab === 'chat' ? 0 : theme.spacing.lg,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: activeTab === 'chat' ? '100vh' : 400,
          position: activeTab === 'chat' ? 'fixed' : 'relative',
          top: activeTab === 'chat' ? 0 : 'auto',
          left: activeTab === 'chat' ? 'auto' : 'auto', // Handled by CSS
          right: activeTab === 'chat' ? 0 : 'auto',
          bottom: activeTab === 'chat' ? 0 : 'auto',
          width: 'auto', // Handled by CSS classes
          height: activeTab === 'chat' ? '100vh' : 'auto',
          zIndex: activeTab === 'chat' ? 998 : 'auto',
        }} className={`content-section ${activeTab === 'chat' ? 'is-chat' : ''}`}>
          {activeTab === 'users' ? (
            <UsersPage users={users} colors={colors} />
          ) : activeTab === 'admin-assets' ? (
            <AdminAssetsPage colors={colors} />
          ) : activeTab === 'clients' ? (
            <ClientsPage clients={clients} packages={packages} colors={colors} />
          ) : activeTab === 'packages' ? (
            <PackagesPage packages={packages} colors={colors} />
          ) : activeTab === 'employees' && (canDo('view_employees') || user?.Role === 'Admin') ? (
            <EmployeesPage employees={employees} colors={colors} />
          ) : activeTab === 'salary' && (canDo('view_salary') || user?.Role === 'Admin') ? (
            <SalaryPage salaries={salaries} employees={employees} colors={colors} refreshSalaries={fetchSalaries} />
          ) : activeTab === 'payment-generator' && (canDo('view_payment_generator') || user?.Role === 'Admin') ? (
            <PaymentGeneratorPage colors={colors} />
          ) : activeTab === 'custom-packages' && (canDo('view_custom_packages') || user?.Role === 'Admin') ? (
            <CustomPackagesPage colors={colors} />
          ) : activeTab === 'inquiries' && (canDo('view_inquiries') || user?.Role === 'Admin') ? (
            <InquiriesPage colors={colors} />
          ) : activeTab === 'call-schedule' && (canDo('view_schedule_calls') || user?.Role === 'Admin') ? (
            <CallSchedulePage colors={colors} />
          ) : activeTab === 'expenses' && (canDo('view_expenses') || user?.Role === 'Admin') ? (
            <ExpensesPage colors={colors} />
          ) : activeTab === 'disputes' && (canDo('view_disputes') || user?.Role === 'Admin') ? (
            <DisputesPage colors={colors} />
          ) : activeTab === 'reports' && (canDo('view_reports') || user?.Role === 'Admin') ? (
            <ReportsPage colors={colors} />
          ) : activeTab === 'permissions' && (canDo('view_permissions') || user?.Role === 'Admin') ? (
            <PermissionsPage colors={colors} />
          ) : activeTab === 'activity-logs' && (canDo('view_activity_logs') || user?.Role === 'Admin') ? (
            <ActivityLogsPage colors={colors} />
          ) : activeTab === '2fa-settings' && (canDo('view_2fa_settings') || user?.Role === 'Admin') ? (
            <TwoFactorSettings colors={colors} />
          ) : activeTab === 'chat' && canDo('allow_message') ? (
            <ChatPage colors={colors} onBack={() => setActiveTab('dashboard')} onMessagesViewed={() => setTotalUnreadCount(0)} />
          ) : (
            <DashboardPage 
              clients={clients} 
              users={users} 
              employees={employees} 
              salaries={salaries} 
              colors={colors} 
              user={user}
              setActiveTab={setActiveTab}
            />
          )}
        </section>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .mobile-overlay.active {
          opacity: 1 !important;
          visibility: visible !important;
        }

        @media (min-width: 901px) {
          .main-content {
            margin-left: 0 !important;
            width: calc(100% - ${sidebarCollapsed ? '80px' : '280px'}) !important;
          }
          .content-section.is-chat {
            left: ${sidebarCollapsed ? '80px' : '280px'} !important;
            width: calc(100% - ${sidebarCollapsed ? '80px' : '280px'}) !important;
          }
        }

        @media (max-width: 900px) {
          .main-content {
            width: 100% !important;
            margin-left: 0 !important;
            padding: ${theme.spacing.sm} !important;
          }
          .content-section.is-chat {
            left: 0 !important;
            width: 100% !important;
          }
          .sidebar-hamburger {
            display: flex !important;
          }
        }

        @media (min-width: 901px) {
          .sidebar-hamburger {
            display: none !important;
          }
        }

        /* Custom Subtle Scrollbar for Sidebar */
        .sidebar-nav-scroll::-webkit-scrollbar {
          width: 5px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .sidebar-nav-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Floating Chat Button */}
      {activeTab !== 'chat' && canDo('allow_message') && (
        <button
          onClick={() => setActiveTab('chat')}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: colors.primary || '#667eea',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 1000,
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
          }}
          title="Open Chat"
        >
          <FaComments />
          {activeTab !== 'chat' && totalUnreadCount > 0 && (
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

      {/* Global Payment Received Toast */}
      {paymentToast && (
        <div 
          onClick={() => {
            setActiveTab('payment-generator');
            setPaymentToast(null);
          }}
          style={{
            position: 'fixed', bottom: 32, right: 32, zIndex: 10000,
            background: '#fff',
            color: '#111', borderRadius: 12, padding: '16px 20px',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)', maxWidth: 360,
            animation: 'slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            cursor: 'pointer', border: '1px solid rgba(0, 0, 0, 0.08)',
            display: 'flex', alignItems: 'flex-start', gap: 14,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 14px 40px rgba(0, 0, 0, 0.12)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 0, 0, 0.1)'; }}
        >
          <style>{`
            @keyframes slideInUp {
              from { transform: translateY(100px); opacity: 0; }
              to { transform: translateY(0); opacity: 1; }
            }
          `}</style>
          
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2, letterSpacing: '-0.01em', color: '#111' }}>
              {paymentToast.message}
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.4 }}>
              {paymentToast.sub}
            </div>
            <div style={{ fontSize: 11, fontWeight: 700, marginTop: 10, color: colors.primary || '#6366f1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Click to view details
            </div>
          </div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); setPaymentToast(null); }}
            style={{ 
              background: 'transparent', border: 'none', color: '#9ca3af', 
              cursor: 'pointer', padding: 4, transition: 'color 0.2s' 
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#111'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            <FaTimes fontSize={14} />
          </button>
        </div>
      )}
    </div>
  );
}

export default AdminPanel; 