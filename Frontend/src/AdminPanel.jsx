import React, { useEffect, useState, useRef } from 'react';
import { useSession } from './session.jsx';
import { useNavigate } from 'react-router-dom';
import { usePermissions } from './contexts/PermissionContext';
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
import getApiBaseUrl from './apiBase';
import { FaTachometerAlt, FaUsers, FaUserTie, FaBoxOpen, FaMoneyCheckAlt, FaUserCog, FaBars, FaTimes, FaCalendarAlt, FaShieldAlt, FaSignOutAlt, FaUserCircle, FaDollarSign, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaChartBar, FaHistory, FaKey, FaComments } from 'react-icons/fa';
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
  // Sidebar profile ref
  const profileRef = useRef();
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

  // Tab/page state
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('adminActiveTab') || 'dashboard');
  // Remove dropdown state
  const [profileDropdown, setProfileDropdown] = useState(false);
  // Sidebar responsive state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Logout loading state
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Unread message count
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Save active tab to localStorage on change
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

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
    } catch (error) {
      // Error fetching unread count
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
  const fetchClients = async () => { try { const res = await axios.get(`${API_URL}/api/clients`); setClients(res.data.clients); } catch {} };
  const fetchPackages = async () => { try { const res = await axios.get(`${API_URL}/api/packages`); setPackages(res.data); } catch {} };
  const fetchEmployees = async () => { try { const res = await axios.get(`${API_URL}/api/employees`); setEmployees(res.data.employees); } catch {} };
  const fetchSalaries = async () => { try { const res = await axios.get(`${API_URL}/api/salaries`); setSalaries(res.data.salaries); } catch {} };

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

  // Sidebar click handlers
  const handleShowDashboard = () => { setActiveTab('dashboard'); };
  // Remove dropdown handlers

  // Sidebar dropdown close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (profileRef.current && !profileRef.current.contains(event.target)) setProfileDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: theme.shadows.lg,
          transition: `all ${theme.transitions.slow}`,
          transform: sidebarOpen || window.innerWidth > 900 ? 'translateX(0)' : 'translateX(-100%)',
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
            borderRadius: theme.radius.md,
            background: colors.primary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.white,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: theme.typography.fontSizes.base,
            flexShrink: 0,
          }}>
            C
          </div>
          {!sidebarCollapsed && (
            <div>
              <div style={{ color: colors.sidebarTextActive, fontWeight: theme.typography.fontWeights.bold, fontSize: theme.typography.fontSizes.lg }}>
                CRM Admin
              </div>
              <div style={{ color: colors.sidebarText, fontSize: theme.typography.fontSizes.xs, marginTop: '2px' }}>
                Management System
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav style={{ flex: 1, padding: `${theme.spacing.xs} ${theme.spacing.xs}`, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {[
              { id: 'dashboard', icon: FaTachometerAlt, label: 'Dashboard', permission: 'view_dashboard' },
              { id: 'users', icon: FaUserCog, label: 'Users', permission: 'view_users' },
              { id: 'clients', icon: FaUsers, label: 'Clients', permission: 'view_clients' },
              { id: 'packages', icon: FaBoxOpen, label: 'Packages', permission: 'view_packages' },
              { id: 'employees', icon: FaUserTie, label: 'Employees', permission: 'view_employees' },
              { id: 'custom-packages', icon: FaBoxOpen, label: 'Custom Packages', permission: 'view_custom_packages' },
              { id: 'inquiries', icon: FaUserTie, label: 'Inquiries', permission: 'view_inquiries' },
              { id: 'call-schedule', icon: FaCalendarAlt, label: 'Call Schedule', permission: 'view_schedule_calls' },
              { id: 'payment-generator', icon: FaMoneyCheckAlt, label: 'Invoice Generator', permission: 'view_payment_generator' },
              { id: 'salary', icon: FaMoneyCheckAlt, label: 'Salary', permission: 'view_salary' },
              { id: 'disputes', icon: FaExclamationTriangle, label: 'Disputes', permission: 'view_disputes' },
              { id: 'reports', icon: FaChartBar, label: 'Reports', permission: 'view_reports' },
              { id: 'expenses', icon: FaDollarSign, label: 'Expenses', permission: 'view_expenses' },
              { id: 'permissions', icon: FaShieldAlt, label: 'Permissions', permission: 'view_permissions' },
              { id: 'activity-logs', icon: FaHistory, label: 'Activity Logs', permission: 'view_activity_logs' },
              { id: '2fa-settings', icon: FaKey, label: '2FA Settings', permission: 'view_2fa_settings' },
            ].filter(({ permission }) => !permission || canDo(permission) || user?.Role === 'Admin')
            .map(({ id, icon: Icon, label }) => (
                <li
                  key={id}
                  onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
                  onMouseEnter={() => setHoveredNavItem(id)}
                  onMouseLeave={() => setHoveredNavItem(null)}
                  style={{
                    marginBottom: '2px',
                    cursor: 'pointer',
                    borderRadius: theme.radius.sm,
                    background: activeTab === id ? colors.sidebarActive : 'transparent',
                    transition: `all ${theme.transitions.normal}`,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: sidebarCollapsed ? 0 : theme.spacing.xs,
                    padding: `${theme.spacing.xs} ${sidebarCollapsed ? theme.spacing.xs : theme.spacing.sm}`,
                    color: activeTab === id ? colors.sidebarTextActive : colors.sidebarText,
                    fontWeight: activeTab === id ? theme.typography.fontWeights.semibold : theme.typography.fontWeights.normal,
                    fontSize: theme.typography.fontSizes.sm,
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                  }}>
                    <Icon style={{ fontSize: '0.95rem', width: '18px', textAlign: 'center', flexShrink: 0 }} />
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
                      fontSize: theme.typography.fontSizes.sm,
                      fontWeight: theme.typography.fontWeights.medium,
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
                borderRadius: theme.radius.sm,
                color: colors.sidebarText,
                cursor: 'pointer',
                fontSize: theme.typography.fontSizes.xs,
                fontWeight: theme.typography.fontWeights.medium,
                transition: `all ${theme.transitions.normal}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = colors.sidebarHover;
                e.currentTarget.style.borderColor = colors.error;
                e.currentTarget.style.color = colors.error;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = colors.sidebarHover;
                e.currentTarget.style.color = colors.sidebarText;
              }}
              title={sidebarCollapsed ? 'Logout' : ''}
            >
              <FaSignOutAlt />
              {!sidebarCollapsed && <span>Logout</span>}
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
                borderRadius: theme.radius.sm,
                color: colors.sidebarText,
                cursor: 'pointer',
                fontSize: theme.typography.fontSizes.xs,
                fontWeight: theme.typography.fontWeights.medium,
                transition: `all ${theme.transitions.normal}`,
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
              {!sidebarCollapsed && <span>Collapse</span>}
            </button>
          </div>
        </div>
      </aside>
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && window.innerWidth <= 900 && (
        <div
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
          }}
        />
      )}
      
      {/* Mobile sidebar overlay - make sidebar fixed on mobile */}
      {window.innerWidth <= 900 && (
        <style>{`
          @media (max-width: 900px) {
            .sidebar {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
            }
          }
        `}</style>
      )}
      
      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: theme.spacing.xl,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        width: window.innerWidth > 900 ? 'calc(100% - 280px)' : '100%',
      }}>
        {/* Header */}
        {activeTab !== 'chat' && (
          <div style={{ 
            marginBottom: theme.spacing.xl,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md
          }}>
            {/* Mobile Hamburger Menu */}
            <button
              className="sidebar-hamburger"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                display: 'none',
                background: colors.white,
                border: `1px solid ${colors.border}`,
                borderRadius: theme.radius.md,
                padding: theme.spacing.sm,
                cursor: 'pointer',
                fontSize: '20px',
                color: colors.textPrimary,
                boxShadow: theme.shadows.sm,
              }}
            >
              {sidebarOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        )}

        
        {/* Content Section */}
        <section style={{
          background: (activeTab === 'chat' || activeTab === 'dashboard') ? 'transparent' : colors.cardBg,
          borderRadius: (activeTab === 'chat' || activeTab === 'dashboard') ? 0 : theme.radius['2xl'],
          boxShadow: (activeTab === 'chat' || activeTab === 'dashboard') ? 'none' : theme.shadows.sm,
          border: (activeTab === 'chat' || activeTab === 'dashboard') ? 'none' : `1px solid ${colors.borderLight}`,
          padding: activeTab === 'chat' ? 0 : theme.spacing['2xl'],
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: activeTab === 'chat' ? '100vh' : 400,
          position: activeTab === 'chat' ? 'fixed' : 'relative',
          top: activeTab === 'chat' ? 0 : 'auto',
          left: activeTab === 'chat' ? (window.innerWidth > 900 ? '280px' : 0) : 'auto',
          right: activeTab === 'chat' ? 0 : 'auto',
          bottom: activeTab === 'chat' ? 0 : 'auto',
          width: activeTab === 'chat' ? (window.innerWidth > 900 ? 'calc(100% - 280px)' : '100%') : 'auto',
          height: activeTab === 'chat' ? '100vh' : 'auto',
          zIndex: activeTab === 'chat' ? 998 : 'auto',
        }}>
          {activeTab === 'users' ? (
            <UsersPage users={users} colors={colors} />
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
        /* Custom Scrollbar Styling for Sidebar */
        .sidebar nav::-webkit-scrollbar {
          width: 6px;
        }
        
        .sidebar nav::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .sidebar nav::-webkit-scrollbar-thumb {
          background: rgba(226, 232, 240, 0.3);
          border-radius: 3px;
        }
        
        .sidebar nav::-webkit-scrollbar-thumb:hover {
          background: rgba(226, 232, 240, 0.5);
        }
        
        /* Firefox scrollbar */
        .sidebar nav {
          scrollbar-width: thin;
          scrollbar-color: rgba(226, 232, 240, 0.3) transparent;
        }
        
        @media (min-width: 901px) {
          .sidebar {
            transform: translateX(0) !important;
            position: sticky !important;
            top: 0 !important;
            height: 100vh !important;
            max-height: 100vh !important;
            align-self: flex-start !important;
          }
          .sidebar-hamburger {
            display: none !important;
          }
        }
        @media (max-width: 900px) {
          .sidebar {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
          }
          .sidebar-hamburger {
            display: flex !important;
          }
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
    </div>
  );
}

export default AdminPanel; 