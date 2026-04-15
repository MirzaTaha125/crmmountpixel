import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './session';
import { usePermissions } from './contexts/PermissionContext';
import { FaBars, FaTimes, FaSignOutAlt, FaTachometerAlt, FaUsers, FaUserTie, FaBoxOpen, FaMoneyCheckAlt, FaEnvelope, FaPhone, FaProjectDiagram, FaPlus, FaEdit, FaTrash, FaEye, FaSearch, FaUserCircle, FaUserPlus, FaCheck, FaSpinner, FaChevronLeft, FaChevronRight, FaExclamationTriangle, FaShieldAlt, FaFileAlt, FaDollarSign, FaUserShield, FaChartBar, FaCog, FaHistory, FaClipboardList, FaComments } from 'react-icons/fa';
import axios from 'axios';
import getApiBaseUrl from './apiBase';
import { sendEmail } from './services/emailService';
import PaymentGeneratorPage from './adminpages/PaymentGeneratorPage';
import ClientDetailsModal from './adminpages/ClientDetailsModal';
import CustomPackagesPage from './adminpages/CustomPackagesPage';
import DisputesPage from './adminpages/DisputesPage';
import EmployeesPage from './adminpages/EmployeesPage';
import ExpensesPage from './adminpages/ExpensesPage';
import UsersPage from './adminpages/UsersPage';
import SalaryPage from './adminpages/SalaryPage';
import ReportsPage from './adminpages/ReportsPage';
import PermissionsPage from './adminpages/PermissionsPage';
import TwoFactorSettings from './adminpages/TwoFactorSettings';
import ActivityLogsPage from './adminpages/ActivityLogsPage';
import ChatPage from './adminpages/ChatPage';
import UserPackagesPanel from './panels/UserPackagesPanel';
import UserInquiriesPanel from './panels/UserInquiriesPanel';
import UserSchedulesPanel from './panels/UserSchedulesPanel';
import UserDashboardPage from './userpages/UserDashboardPage';
import { theme, getColors } from './theme';
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Modal } from './components/Modal';
import { LoadingScreen } from './components/LoadingScreen';

const colors = getColors();

const API_URL = getApiBaseUrl();

function UserPanel() {
  const { user, setUser } = useSession();
  const { canView, canDo } = usePermissions();
  const navigate = useNavigate();
  const inactivityTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  
  // Initialize activeTab from localStorage or default to 'dashboard'
  const [activeTab, setActiveTabState] = useState(() => {
    return localStorage.getItem('userPanelActiveTab') || 'dashboard';
  });

  // Wrapper to update both state and localStorage
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    localStorage.setItem('userPanelActiveTab', tab);
  };

  const [totalUnreadCount, setTotalUnreadCount] = useState(0);

  // Data states
  const [clients, setClients] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [packages, setPackages] = useState([]);
  const [inquiries, setInquiries] = useState([]); // eslint-disable-line no-unused-vars
  // eslint-disable-next-line no-unused-vars
  const [projects, setProjects] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [schedules, setSchedules] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [assignedClients, setAssignedClients] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Loading states
  const [clientsLoading, setClientsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [packagesLoading, setPackagesLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [inquiriesLoading, setInquiriesLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [projectsLoading, setProjectsLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [schedulesLoading, setSchedulesLoading] = useState(false);

  // Error states
  const [clientsError, setClientsError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [packagesError, setPackagesError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [inquiriesError, setInquiriesError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [projectsError, setProjectsError] = useState('');
  // eslint-disable-next-line no-unused-vars
  const [schedulesError, setSchedulesError] = useState('');
  
  // Search states
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [_inquirySearchTerm, _setInquirySearchTerm] = useState('');
  
  // Logout loading state
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
  
  // Schedule form states
  // eslint-disable-next-line no-unused-vars
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [scheduleForm, setScheduleForm] = useState({
    clientId: '',
    scheduledDate: '',
    scheduledTime: '',
    reason: '',
    notes: '',
    status: 'scheduled'
  });
  // eslint-disable-next-line no-unused-vars
  const [scheduleLoading, setScheduleLoading] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [scheduleError, setScheduleError] = useState('');

  // Client form states
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: ''
  });
  const [clientFormLoading, setClientFormLoading] = useState(false);
  const [clientFormError, setClientFormError] = useState('');



  // Client details modal states
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsClient, setDetailsClient] = useState(null);

  // Email modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ to_name: '', to_email: '', subject: '', message: '' });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token') || user?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Data fetching functions
  const fetchClients = async () => {
    if (!canView('clients')) return;
    
    setClientsLoading(true);
    setClientsError('');
    try {
      const res = await axios.get(`${API_URL}/api/clients`, { headers: getAuthHeaders() });
      setClients(res.data.clients || []);
    } catch {
      setClientsError('Failed to fetch clients');
    } finally {
      setClientsLoading(false);
    }
  };





  const fetchProjects = async () => {
    if (!canView('projects')) return;
    
    setProjectsLoading(true);
    setProjectsError('');
    try {
      const res = await axios.get(`${API_URL}/api/projects`, { headers: getAuthHeaders() });
      setProjects(res.data.projects || []);
    } catch {
      setProjectsError('Failed to fetch projects');
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchSalaries = async () => {
    if (!canView('salary')) return;
    
    try {
      const res = await axios.get(`${API_URL}/api/salaries`, { headers: getAuthHeaders() });
      setSalaries(res.data.salaries || []);
    } catch { /* ignore */ }
  };

  const fetchEmployees = async () => {
    if (!canView('employees')) return;
    
    try {
      const res = await axios.get(`${API_URL}/api/employees`, { headers: getAuthHeaders() });
      setEmployees(res.data.employees || []);
    } catch { /* ignore */ }
  };

  const fetchUsers = async () => {
    if (!canView('users')) return;
    
    try {
      const res = await axios.get(`${API_URL}/api/users`, { headers: getAuthHeaders() });
      setUsers(res.data.users || res.data || []);
    } catch { /* ignore */ }
  };

  const fetchSchedules = async () => {
    if (!canView('schedule_calls')) return;
    
    setSchedulesLoading(true);
    setSchedulesError('');
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/my-schedules`, { headers: getAuthHeaders() });
      setSchedules(res.data || []);
    } catch {
      setSchedulesError('Failed to fetch schedules');
    } finally {
      setSchedulesLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const fetchAssignedClients = async () => {
    if (!canView('schedule_calls')) return;
    
    try {
      const res = await axios.get(`${API_URL}/api/call-schedules/assigned-clients`, { headers: getAuthHeaders() });
      setAssignedClients(res.data || []);
    } catch { /* ignore */ }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'dashboard') {
      // Fetch data needed for dashboard based on permissions
      if (canView('clients')) {
        fetchClients();
      }
      if (canView('employees')) {
        fetchEmployees();
      }
      if (canView('salary')) {
        fetchSalaries();
      }
      if (canView('users')) {
        fetchUsers();
      }
    } else if (activeTab === 'clients') {
      fetchClients();
    } else if (activeTab === 'projects') {
      fetchProjects();
    } else if (activeTab === 'salary') {
      fetchSalaries();
      fetchEmployees();
    } else if (activeTab === 'employees') {
      fetchEmployees();
    }
  }, [activeTab, canView]);

  const handleLogout = () => {
    setIsLoggingOut(true);
    // Small delay to show loading screen, then logout
    setTimeout(() => {
      localStorage.removeItem('crm_user');
      localStorage.removeItem('token');
      setUser(null);
      navigate('/signin');
    }, 800);
  };

  // Client modal handlers
  const openClientModal = () => {
    setClientForm({ name: '', email: '', phone: '', companyName: '' });
    setClientFormError('');
    setShowClientModal(true);
  };

  const closeClientModal = () => {
    setShowClientModal(false);
    setClientForm({ name: '', email: '', phone: '', companyName: '' });
    setClientFormError('');
  };

  const handleClientFormChange = (e) => {
    const { name, value } = e.target;
    setClientForm(prev => ({ ...prev, [name]: value }));
  };

  const handleClientSubmit = async (e) => {
    e.preventDefault();
    
    if (!canDo('add_clients')) {
      setClientFormError('You do not have permission to add clients');
      return;
    }

    // Validate form
    if (!clientForm.name || !clientForm.email || !clientForm.phone) {
      setClientFormError('Please fill in all required fields (Name, Email, Phone)');
      return;
    }

    setClientFormLoading(true);
    setClientFormError('');

    try {
      const headers = getAuthHeaders();
      const response = await axios.post(`${API_URL}/api/clients`, clientForm, { headers });
      
      // Show success message if assignment was created
      if (response.data.assignment) {
        // You could show a toast/notification here if you want
      }
      
      closeClientModal();
      fetchClients(); // Refresh the list
    } catch (err) {
      let errorMsg = 'Failed to add client. Please try again.';
      if (err.response?.data) {
        errorMsg = err.response.data.error || err.response.data.message || errorMsg;
      } else if (err.message) {
        errorMsg = err.message;
      }
      setClientFormError(errorMsg);
    } finally {
      setClientFormLoading(false);
    }
  };



  const handleOpenEmailModal = (client) => {
    setEmailForm({
      to_name: client.name || '',
      to_email: client.email || '',
      subject: '',
      message: ''
    });
    setEmailStatus('');
    setShowEmailModal(true);
  };

  const handleEmailFormChange = (e) => {
    setEmailForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!canDo('send_emails')) {
      setEmailStatus('You do not have permission to send emails');
      return;
    }
    if (!emailForm.to_email || !emailForm.message) {
      setEmailStatus('Please fill in recipient email and message.');
      return;
    }
    setEmailLoading(true);
    setEmailStatus('');
    try {
      await sendEmail({
        to: emailForm.to_email,
        toName: emailForm.to_name,
        subject: emailForm.subject || 'Message from CRM',
        html: emailForm.message.replace(/\n/g, '<br>'),
        text: emailForm.message
      });
      setEmailStatus('Email sent successfully!');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailForm({ to_name: '', to_email: '', subject: '', message: '' });
      }, 1500);
    } catch (err) {
      setEmailStatus(err.message || 'Failed to send email. Please check your work email configuration.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false);
  };

  // eslint-disable-next-line no-unused-vars
    const handleScheduleSubmit = async (e) => {
    e.preventDefault();
    if (editingSchedule && !canDo('edit_schedule_calls')) {
      setScheduleError('You do not have permission to edit schedule calls');
      return;
    }
    if (!editingSchedule && !canDo('add_schedule_calls')) {
      setScheduleError('You do not have permission to add schedule calls');
      return;
    }
    setScheduleLoading(true);
    setScheduleError('');
    
    try {
      if (editingSchedule) {
        await axios.put(`${API_URL}/api/call-schedules/${editingSchedule._id}`, scheduleForm, { headers: getAuthHeaders() });
      } else {
        await axios.post(`${API_URL}/api/call-schedules`, scheduleForm, { headers: getAuthHeaders() });
      }
      setShowScheduleModal(false);
      setEditingSchedule(null);
      setScheduleForm({
        clientId: '',
        scheduledDate: '',
        scheduledTime: '',
        reason: '',
        notes: '',
        status: 'scheduled'
      });
      fetchSchedules(); // Refresh the schedules list
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Failed to save schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
    const openScheduleModal = () => {
    setEditingSchedule(null);
    setScheduleForm({
      clientId: '',
      scheduledDate: '',
      scheduledTime: '',
      reason: '',
      notes: '',
      status: 'scheduled'
    });
    setScheduleError('');
    setShowScheduleModal(true);
  };

  // eslint-disable-next-line no-unused-vars
    const closeScheduleModal = () => {
    setShowScheduleModal(false);
    setEditingSchedule(null);
    setScheduleForm({
      clientId: '',
      scheduledDate: '',
      scheduledTime: '',
      reason: '',
      notes: '',
      status: 'scheduled'
    });
    setScheduleError('');
  };

  // eslint-disable-next-line no-unused-vars
    const handleEditSchedule = (schedule) => {
    if (!canDo('edit_schedule_calls')) {
      alert('You do not have permission to edit schedule calls');
      return;
    }
    setEditingSchedule(schedule);
    setScheduleForm({
      clientId: schedule.clientId?._id || schedule.clientId || '',
      scheduledDate: schedule.scheduledDate ? new Date(schedule.scheduledDate).toISOString().split('T')[0] : '',
      scheduledTime: schedule.scheduledTime || '',
      reason: schedule.reason || '',
      notes: schedule.notes || '',
      status: schedule.status || 'scheduled'
    });
    setShowScheduleModal(true);
    setScheduleError('');
  };

  // eslint-disable-next-line no-unused-vars
    const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!canDo('edit_schedule_calls')) {
      setScheduleError('You do not have permission to edit schedule calls');
      return;
    }
    
    setScheduleLoading(true);
    setScheduleError('');
    
    try {
      await axios.put(`${API_URL}/api/call-schedules/${editingSchedule._id}`, scheduleForm, { headers: getAuthHeaders() });
      setShowScheduleModal(false);
      setEditingSchedule(null);
      setScheduleForm({
        clientId: '',
        scheduledDate: '',
        scheduledTime: '',
        reason: '',
        notes: '',
        status: 'scheduled'
      });
      fetchSchedules(); // Refresh the schedules list
    } catch (err) {
      setScheduleError(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
    const handleDeleteSchedule = async (scheduleId) => {
    if (!canDo('delete_schedule_calls')) {
      alert('You do not have permission to delete schedule calls');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this schedule?')) return;
    
    try {
      await axios.delete(`${API_URL}/api/call-schedules/${scheduleId}`, { headers: getAuthHeaders() });
      fetchSchedules(); // Refresh the schedules list
    } catch {
      alert('Failed to delete schedule');
    }
  };

  // Permissions are automatically refreshed by PermissionContext when user changes
  // No need to manually refresh here as it causes infinite loops

  const getNavigationItems = () => {
    const sections = [
      { category: 'Main', items: [] },
      { category: 'Communication & CRM', items: [] },
      { category: 'Enterprise Services', items: [] },
      { category: 'Management', items: [] },
      { category: 'Preferences & System', items: [] },
    ];

    const addItem = (category, item) => {
      const section = sections.find(s => s.category === category);
      if (section) section.items.push(item);
    };

    // Dashboard - always show at the top
    addItem('Main', { id: 'dashboard', label: 'Dashboard', icon: FaTachometerAlt, permission: 'view_dashboard' });

    // Communication & CRM
    if (canView('emails')) {
      addItem('Communication & CRM', { id: 'emails', label: 'My Emails', icon: FaEnvelope, permission: 'view_emails' });
    }
    if (canView('clients')) {
      addItem('Communication & CRM', { id: 'clients', label: 'Clients', icon: FaUsers, permission: 'view_clients' });
    }
    if (canView('inquiries')) {
      addItem('Communication & CRM', { id: 'inquiries', label: 'Inquiries', icon: FaUserTie, permission: 'view_inquiries' });
    }
    if (canView('schedule_calls')) {
      addItem('Communication & CRM', { id: 'schedule-calls', label: 'Schedule Calls', icon: FaPhone, permission: 'view_schedule_calls' });
    }
    if (canView('disputes')) {
      addItem('Communication & CRM', { id: 'disputes', label: 'Disputes', icon: FaExclamationTriangle, permission: 'view_disputes' });
    }

    // Enterprise Services
    if (canView('packages')) {
      addItem('Enterprise Services', { id: 'packages', label: 'Packages', icon: FaBoxOpen, permission: 'view_packages' });
    }
    if (canView('custom_packages')) {
      addItem('Enterprise Services', { id: 'custom-packages', label: 'Custom Packages', icon: FaBoxOpen, permission: 'view_custom_packages' });
    }
    if (canView('payments')) {
      addItem('Enterprise Services', { id: 'payment-generator', label: 'Payment Generator', icon: FaMoneyCheckAlt, permission: 'view_payment_generator' });
    }
    if (canView('reports')) {
      addItem('Enterprise Services', { id: 'reports', label: 'Reports', icon: FaChartBar, permission: 'view_reports' });
    }

    // Management
    if (canView('employees')) {
      addItem('Management', { id: 'employees', label: 'Employees', icon: FaUserCircle, permission: 'view_employees' });
    }
    if (canView('expenses')) {
      addItem('Management', { id: 'expenses', label: 'Expenses', icon: FaDollarSign, permission: 'view_expenses' });
    }
    if (canView('salary')) {
      addItem('Management', { id: 'salary', label: 'Salary', icon: FaMoneyCheckAlt, permission: 'view_salary' });
    }
    if (canView('users')) {
      addItem('Management', { id: 'users', label: 'Users', icon: FaUserShield, permission: 'view_users' });
    }

    // Preferences & System
    if (canView('permissions')) {
      addItem('Preferences & System', { id: 'permissions', label: 'Permissions', icon: FaShieldAlt, permission: 'view_permissions' });
    }
    if (canView('2fa_settings')) {
      addItem('Preferences & System', { id: '2fa-settings', label: '2FA Settings', icon: FaCog, permission: 'view_2fa_settings' });
    }
    if (canView('activity_logs')) {
      addItem('Preferences & System', { id: 'activity-logs', label: 'Activity Logs', icon: FaHistory, permission: 'view_activity_logs' });
    }

    return sections.filter(section => section.items.length > 0);
  };

  const renderDashboard = () => (
    <UserDashboardPage
      clients={clients}
      users={users}
      employees={employees}
      salaries={salaries}
      colors={colors}
      user={user}
      setActiveTab={setActiveTab}
      canView={canView}
    />
  );

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return renderDashboard();
    } else if (activeTab === 'clients' && canView('clients')) {
      const filteredClients = (clients || []).filter(client => {
        if (!clientSearchTerm) return true;
        const searchLower = clientSearchTerm.toLowerCase();
        return (
          client.name?.toLowerCase().includes(searchLower) ||
          client.email?.toLowerCase().includes(searchLower) ||
          client.phone?.toLowerCase().includes(searchLower) ||
          client.company?.toLowerCase().includes(searchLower)
        );
      });

      return (
        <>
          <div style={{ 
            display: 'flex',
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: theme.spacing.xl,
            flexWrap: 'wrap',
            gap: theme.spacing.md
          }}>
            <h2 style={{ 
              fontSize: theme.typography.fontSizes['2xl'], 
              fontWeight: theme.typography.fontWeights.bold, 
              color: colors.textPrimary, 
              margin: 0 
            }}>
              Clients ({filteredClients.length})
            </h2>
            {canDo('add_clients') && (
              <Button
                onClick={openClientModal}
                variant="primary"
                style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}
              >
                <FaPlus />
                Add Client
              </Button>
            )}
          </div>

          {/* Search */}
          <div style={{ marginBottom: theme.spacing.lg }}>
            <div style={{ position: 'relative', maxWidth: '400px' }}>
              <FaSearch style={{
                position: 'absolute',
                left: theme.spacing.md,
                top: '50%',
                transform: 'translateY(-50%)',
                color: colors.textSecondary,
                fontSize: theme.typography.fontSizes.sm
              }} />
              <input
                type="text"
                placeholder="Search clients..."
                value={clientSearchTerm}
                onChange={(e) => setClientSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md} ${theme.spacing.sm} ${theme.spacing['2xl']}`,
                  border: `1px solid ${colors.border}`,
                  borderRadius: theme.radius.md,
                  fontSize: theme.typography.fontSizes.base,
                  fontFamily: theme.typography.fontFamily,
                  background: theme.colors.white,
                  color: theme.colors.textPrimary,
                  transition: `all ${theme.transitions.normal}`,
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = colors.primary;
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primaryBg}`;
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = colors.border;
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* Error Message */}
          {clientsError && (
            <div style={{
              background: colors.errorLight,
              color: colors.error,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              border: `1px solid ${colors.error}`
            }}>
              {clientsError}
            </div>
          )}

          {/* Loading */}
          {clientsLoading ? (
            <div style={{ textAlign: 'center', padding: theme.spacing['2xl'] }}>
              <div style={{ color: colors.textSecondary }}>Loading clients...</div>
            </div>
          ) : filteredClients.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: theme.spacing['2xl'],
              color: colors.textSecondary 
            }}>
              <FaUsers style={{ fontSize: '48px', marginBottom: theme.spacing.md, color: colors.primary }} />
              <p style={{ margin: 0, fontSize: theme.typography.fontSizes.base }}>
                {clientSearchTerm ? 'No clients found matching your search.' : 'No clients found.'}
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                background: theme.colors.white,
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
                boxShadow: theme.shadows.sm
              }}>
                <thead>
                  <tr style={{ 
                    background: colors.primaryBg,
                    borderBottom: `2px solid ${colors.border}`
                  }}>
                    {canDo('view_client_name') && (
                      <th style={{ 
                        padding: theme.spacing.md, 
                        textAlign: 'left', 
                        color: colors.textSecondary,
                        fontWeight: theme.typography.fontWeights.semibold,
                        fontSize: theme.typography.fontSizes.sm,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Name</th>
                    )}
                    {canDo('view_client_email') && (
                      <th style={{ 
                        padding: theme.spacing.md, 
                        textAlign: 'left', 
                        color: colors.textSecondary,
                        fontWeight: theme.typography.fontWeights.semibold,
                        fontSize: theme.typography.fontSizes.sm,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Email</th>
                    )}
                    {canDo('view_client_phone') && (
                      <th style={{ 
                        padding: theme.spacing.md, 
                        textAlign: 'left', 
                        color: colors.textSecondary,
                        fontWeight: theme.typography.fontWeights.semibold,
                        fontSize: theme.typography.fontSizes.sm,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Phone</th>
                    )}
                    {(canDo('view_client_details') || canDo('edit_clients') || canDo('delete_clients')) && (
                      <th style={{ 
                        padding: theme.spacing.md, 
                        textAlign: 'left', 
                        color: colors.textSecondary,
                        fontWeight: theme.typography.fontWeights.semibold,
                        fontSize: theme.typography.fontSizes.sm,
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client._id} style={{ 
                      borderBottom: `1px solid ${colors.borderLight}`,
                      transition: `background ${theme.transitions.normal}`
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = colors.hover}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {canDo('view_client_name') && (
                        <td style={{ 
                          padding: theme.spacing.md,
                          color: colors.textPrimary
                        }}>{client.name || 'N/A'}</td>
                      )}
                      {canDo('view_client_email') && (
                        <td style={{ 
                          padding: theme.spacing.md,
                          color: colors.textPrimary
                        }}>{client.email || 'N/A'}</td>
                      )}
                      {canDo('view_client_phone') && (
                        <td style={{ 
                          padding: theme.spacing.md,
                          color: colors.textPrimary
                        }}>{client.phone || 'N/A'}</td>
                      )}
                      {(canDo('view_client_details') || canDo('edit_clients') || canDo('delete_clients')) && (
                        <td style={{ padding: theme.spacing.md }}>
                          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                            {canDo('view_client_details') && (
                              <button
                                onClick={() => {
                                  setDetailsClient(client);
                                  setDetailsModalOpen(true);
                                }}
                                style={{
                                  background: colors.primary,
                                  color: 'white',
                                  border: 'none',
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.md,
                                  cursor: 'pointer',
                                  fontSize: theme.typography.fontSizes.sm,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.xs,
                                  transition: `all ${theme.transitions.normal}`
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = colors.primaryDark;
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = colors.primary;
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="View Details"
                              >
                                <FaEye />
                              </button>
                            )}
                            {client.email && (
                              <button
                                onClick={() => handleOpenEmailModal(client)}
                                style={{
                                  background: colors.info,
                                  color: 'white',
                                  border: 'none',
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.md,
                                  cursor: 'pointer',
                                  fontSize: theme.typography.fontSizes.sm,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.xs,
                                  transition: `all ${theme.transitions.normal}`
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.background = colors.primaryDark;
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.background = colors.info;
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title="Send Email"
                              >
                                <FaEnvelope />
                              </button>
                            )}
                            {canDo('edit_clients') && (
                              <button
                                style={{
                                  background: colors.warning,
                                  color: 'white',
                                  border: 'none',
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.md,
                                  cursor: 'pointer',
                                  fontSize: theme.typography.fontSizes.sm,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.xs,
                                  transition: `all ${theme.transitions.normal}`
                                }}
                                title="Edit Client"
                              >
                                <FaEdit />
                              </button>
                            )}
                            {canDo('delete_clients') && (
                              <button
                                style={{
                                  background: colors.error,
                                  color: 'white',
                                  border: 'none',
                                  padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                                  borderRadius: theme.radius.md,
                                  cursor: 'pointer',
                                  fontSize: theme.typography.fontSizes.sm,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: theme.spacing.xs,
                                  transition: `all ${theme.transitions.normal}`
                                }}
                                title="Delete Client"
                              >
                                <FaTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      );
    } else if (activeTab === 'packages' && canView('packages')) {
      return (
        <UserPackagesPanel colors={colors} />
      );
    } else if (activeTab === 'inquiries' && canView('inquiries')) {
      return (
        <UserInquiriesPanel colors={colors} user={user} />
      );
    } else if (activeTab === 'emails' && canView('emails')) {
      return (
        <div style={{
          background: colors.cardBg,
          borderRadius: 18,
          boxShadow: colors.cardShadow,
          padding: 40,
          minHeight: 'calc(100vh - 48px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center'
        }}>
      <h2 style={{ color: colors.text, marginBottom: 24 }}>My Emails</h2>
      <div style={{ 
        color: colors.muted, 
        fontSize: 16,
        textAlign: 'center',
        padding: 40
      }}>
        <FaEnvelope style={{ fontSize: 48, marginBottom: 16, color: colors.accent }} />
        <br />
            Email management will be available here.
        <br />
            You can manage your assigned email accounts.
      </div>
    </div>
  );
    } else if (activeTab === 'schedule-calls' && canView('schedule_calls')) {
      return <UserSchedulesPanel colors={colors} user={user} />;
    } else if (activeTab === 'payment-generator' && canView('payments') && canDo('view_payment_generator')) {
      return <PaymentGeneratorPage colors={colors} />;
    } else if (activeTab === 'custom-packages' && canView('custom_packages')) {
      return <CustomPackagesPage colors={colors} />;
    } else if (activeTab === 'disputes' && canView('disputes')) {
      return <DisputesPage colors={colors} />;
    } else if (activeTab === 'employees' && canView('employees')) {
      return <EmployeesPage colors={colors} />;
    } else if (activeTab === 'expenses' && canView('expenses')) {
      return <ExpensesPage colors={colors} />;
    } else if (activeTab === 'users' && canView('users')) {
      return <UsersPage colors={colors} />;
    } else if (activeTab === 'salary' && canView('salary')) {
      return <SalaryPage salaries={salaries} employees={employees} colors={colors} refreshSalaries={fetchSalaries} />;
    } else if (activeTab === 'reports' && canView('reports')) {
      return <ReportsPage colors={colors} />;
    } else if (activeTab === 'permissions' && canView('permissions')) {
      return <PermissionsPage colors={colors} />;
    } else if (activeTab === '2fa-settings' && canView('2fa_settings')) {
      return <TwoFactorSettings colors={colors} />;
    } else if (activeTab === 'activity-logs' && canView('activity_logs')) {
      return <ActivityLogsPage colors={colors} />;
    } else if (activeTab === 'chat' && canDo('allow_message')) {
      return <ChatPage colors={colors} onBack={() => setActiveTab('dashboard')} onMessagesViewed={() => setTotalUnreadCount(0)} />;
    } else {
      return renderDashboard();
    }
  };

  if (isLoggingOut) {
    return <LoadingScreen message="Signing you out..." />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: colors.mainBg, fontFamily: theme.typography.fontFamily }}>
      {/* Sidebar */}
      <aside
        className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}
        style={{
          width: sidebarCollapsed ? '80px' : '280px',
          height: '100vh',
          maxHeight: '100vh',
          background: colors.sidebarBg,
          position: 'sticky',
          top: 0,
          alignSelf: 'flex-start',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'none',
          borderRight: `1px solid ${colors.sidebarHover}`,
          transition: `all ${theme.transitions.normal}`,
          transform: sidebarOpen || window.innerWidth > 900 ? 'translateX(0)' : 'translateX(-100%)',
          overflow: 'hidden',
          flexShrink: 0,
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
            borderRadius: 0,
            background: colors.sidebarActive,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.white,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: theme.typography.fontSizes.lg,
            flexShrink: 0,
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
                User Dashboard
              </div>
            </div>
          )}
        </div>
        
        {/* Navigation */}
        <nav style={{ flex: 1, padding: 0, overflowY: 'auto', overflowX: 'hidden', minHeight: 0 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {getNavigationItems().map(section => (
              <React.Fragment key={section.category}>
                {!sidebarCollapsed && (
                  <div style={{
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
                {section.items.map(({ id, icon: Icon, label }) => (
                  <li
                    key={id}
                    onClick={() => { handleTabClick(id); setSidebarOpen(false); }}
                    onMouseEnter={() => setHoveredNavItem(id)}
                    onMouseLeave={() => setHoveredNavItem(null)}
                    style={{
                      marginBottom: 0,
                      cursor: 'pointer',
                      borderRadius: 0,
                      background: activeTab === id ? colors.sidebarHover : 'transparent',
                      borderLeft: `4px solid ${activeTab === id ? colors.sidebarActive : 'transparent'}`,
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
                      <Icon style={{ fontSize: '1.1rem', width: '24px', textAlign: 'center', flexShrink: 0 }} />
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
                        borderRadius: 0,
                        fontSize: theme.typography.fontSizes.xs,
                        fontWeight: theme.typography.fontWeights.bold,
                        whiteSpace: 'nowrap',
                        pointerEvents: 'none',
                        boxShadow: '4px 4px 0px rgba(0,0,0,0.2)',
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
                  {user?.Role || 'Employee'}
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
                gap: 0,
                padding: `${theme.spacing.sm} ${sidebarCollapsed ? theme.spacing.xs : theme.spacing.sm}`,
                background: 'transparent',
                border: `1px solid ${colors.sidebarHover}`,
                borderRadius: 0,
                color: colors.sidebarText,
                cursor: 'pointer',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: theme.typography.fontWeights.bold,
                transition: `all ${theme.transitions.fast}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#7f1d1d';
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
                gap: 0,
                padding: `${theme.spacing.sm} ${sidebarCollapsed ? theme.spacing.xs : theme.spacing.sm}`,
                background: 'transparent',
                border: `1px solid ${colors.sidebarHover}`,
                borderRadius: 0,
                color: colors.sidebarText,
                cursor: 'pointer',
                fontSize: '0.7rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
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

      {/* Main Content */}
      <main style={{
        flex: 1,
        padding: activeTab === 'chat' ? 0 : theme.spacing.xl,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        width: window.innerWidth > 900 ? 'calc(100% - 280px)' : '100%',
        overflowY: activeTab === 'chat' ? 'hidden' : 'auto',
        overflowX: 'hidden',
        position: 'relative',
      }}>
        {/* Header */}
        {activeTab !== 'chat' && (
        <header style={{
          marginBottom: theme.spacing.xl,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: theme.spacing.md,
        }}>

        </header>
        )}
        
        {/* Content Section */}
        <section style={{
          background: activeTab === 'chat' ? 'transparent' : colors.cardBg,
          borderRadius: activeTab === 'chat' ? 0 : theme.radius['2xl'],
          boxShadow: activeTab === 'chat' ? 'none' : theme.shadows.sm,
          border: activeTab === 'chat' ? 'none' : `1px solid ${colors.border}`,
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
          {renderContent()}
        </section>
      </main>

      {/* Client Modal */}
      <Modal
        open={showClientModal}
        onClose={closeClientModal}
        title="Add Client"
        maxWidth="500px"
      >
        <form onSubmit={handleClientSubmit}>
          <Input
            label="Name"
            name="name"
            value={clientForm.name}
            onChange={handleClientFormChange}
            required
            placeholder="Enter client name"
          />
          <Input
            label="Email"
            type="email"
            name="email"
            value={clientForm.email}
            onChange={handleClientFormChange}
            required
            placeholder="Enter client email"
          />
          <Input
            label="Phone"
            name="phone"
            value={clientForm.phone}
            onChange={handleClientFormChange}
            required
            placeholder="Enter client phone"
          />
          <Input
            label="Company Name"
            name="companyName"
            value={clientForm.companyName}
            onChange={handleClientFormChange}
            placeholder="Enter company name (optional)"
          />
          {clientFormError && (
            <div style={{ 
              background: colors.errorLight,
              color: colors.error,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              fontSize: theme.typography.fontSizes.sm,
              border: `1px solid ${colors.error}`
            }}>
              {clientFormError}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
            <Button
              type="button"
              variant="secondary"
              onClick={closeClientModal}
              disabled={clientFormLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={clientFormLoading}
            >
              {clientFormLoading ? 'Adding...' : 'Add Client'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Client Details Modal */}
      <ClientDetailsModal 
        client={detailsClient} 
        open={detailsModalOpen} 
        onClose={() => {
          setDetailsModalOpen(false);
          setDetailsClient(null);
        }} 
        colors={colors} 
        userRole={user?.Role || 'Employee'} 
      />

      {/* Email Modal */}
      {showEmailModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={() => setShowEmailModal(false)}
        >
          <div
            style={{
              background: colors.cardBg,
              borderRadius: theme.radius.xl,
              padding: theme.spacing['2xl'],
              minWidth: 400,
              maxWidth: 600,
              width: '90%',
              boxShadow: theme.shadows.xl,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{
              marginBottom: theme.spacing.xl,
              fontWeight: theme.typography.fontWeights.bold,
              fontSize: theme.typography.fontSizes['2xl'],
              color: colors.textPrimary,
            }}>
              Send Email
            </h2>
            <form onSubmit={handleSendEmail}>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontWeight: theme.typography.fontWeights.semibold,
                  marginBottom: theme.spacing.sm,
                  color: colors.textPrimary,
                }}>
                  Recipient Name
                </label>
                <input
                  name="to_name"
                  type="text"
                  value={emailForm.to_name}
                  onChange={handleEmailFormChange}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    background: colors.white,
                    color: colors.textPrimary,
                    fontFamily: theme.typography.fontFamily,
                    outline: 'none',
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontWeight: theme.typography.fontWeights.semibold,
                  marginBottom: theme.spacing.sm,
                  color: colors.textPrimary,
                }}>
                  Recipient Email
                </label>
                <input
                  name="to_email"
                  type="email"
                  value={emailForm.to_email}
                  onChange={handleEmailFormChange}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    background: colors.white,
                    color: colors.textPrimary,
                    fontFamily: theme.typography.fontFamily,
                    outline: 'none',
                  }}
                  required
                />
              </div>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontWeight: theme.typography.fontWeights.semibold,
                  marginBottom: theme.spacing.sm,
                  color: colors.textPrimary,
                }}>
                  Subject
                </label>
                <input
                  name="subject"
                  type="text"
                  value={emailForm.subject}
                  onChange={handleEmailFormChange}
                  placeholder="Email subject (optional)"
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    background: colors.white,
                    color: colors.textPrimary,
                    fontFamily: theme.typography.fontFamily,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ marginBottom: theme.spacing.lg }}>
                <label style={{
                  display: 'block',
                  fontWeight: theme.typography.fontWeights.semibold,
                  marginBottom: theme.spacing.sm,
                  color: colors.textPrimary,
                }}>
                  Message
                </label>
                <textarea
                  name="message"
                  value={emailForm.message}
                  onChange={handleEmailFormChange}
                  placeholder="Enter your message"
                  rows={8}
                  style={{
                    width: '100%',
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    borderRadius: theme.radius.md,
                    border: `1px solid ${colors.border}`,
                    fontSize: theme.typography.fontSizes.base,
                    background: colors.white,
                    color: colors.textPrimary,
                    fontFamily: theme.typography.fontFamily,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                  required
                />
              </div>
              {emailStatus && (
                <div style={{
                  marginBottom: theme.spacing.lg,
                  padding: theme.spacing.md,
                  borderRadius: theme.radius.md,
                  background: emailStatus.includes('success') ? colors.successLight : colors.errorLight,
                  color: emailStatus.includes('success') ? colors.success : colors.error,
                  fontWeight: theme.typography.fontWeights.medium,
                }}>
                  {emailStatus}
                </div>
              )}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: theme.spacing.md,
              }}>
                <Button
                  type="button"
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailForm({ to_name: '', to_email: '', subject: '', message: '' });
                    setEmailStatus('');
                  }}
                  variant="secondary"
                  disabled={emailLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={emailLoading}
                >
                  {emailLoading ? (
                    <>
                      <FaSpinner style={{ animation: 'spin 1s linear infinite', marginRight: theme.spacing.xs }} />
                      Sending...
                    </>
                  ) : (
                    <>
                      <FaEnvelope style={{ marginRight: theme.spacing.xs }} />
                      Send Email
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
            maxHeight: 100vh !important;
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

export default UserPanel;
