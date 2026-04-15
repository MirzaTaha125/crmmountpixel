import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaTrash, FaEdit, FaTimes, FaUser, FaEnvelope, FaPhone, FaBuilding, FaSave, FaProjectDiagram, FaCreditCard, FaUserPlus, FaCalendarAlt, FaDollarSign, FaSpinner, FaLock, FaTag, FaEllipsisV, FaComments, FaPaperPlane, FaCheckCircle, FaFilePdf } from 'react-icons/fa';
import { theme } from '../theme';
import { usePermissions } from '../contexts/PermissionContext';

const API_URL = getApiBaseUrl();

// TABS will be defined conditionally based on user role

function ClientDetailsModal({ client, open, onClose, colors, userRole }) {
  const { canDo } = usePermissions();
  // Define tabs conditionally based on user role and permissions
  const TABS = [
    'Personal Info',
    ...(canDo('view_projects') ? ['Project Details'] : []),
    ...(canDo('view_payment_history') ? ['Payment History'] : []),
    ...(canDo('view_hosting_domain') ? ['Hosting & Domain'] : []),
    'Assets',
    ...(userRole === 'Admin' ? ['Assigning'] : [])
  ];
  
  const [activeTab, setActiveTab] = useState(0);
  const [projectDetails, setProjectDetails] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [hostingDomains, setHostingDomains] = useState([]);
  const [clientAssets, setClientAssets] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers] = useState([]);
  const [roleSelect, setRoleSelect] = useState('Front');
  const [userSelect, setUserSelect] = useState('');
  const [packages, setPackages] = useState([]);
  const [newProject, setNewProject] = useState({ packageId: '', description: '', deliveryDate: '', status: 'In Development', amount: '' });
  const [newPayment, setNewPayment] = useState({ invoiceNumber: '', amount: '', taxFee: '', status: 'Pending', paymentMethod: 'Credit Card', description: '', paymentDate: new Date().toISOString().slice(0, 10) });
  const [newHostingDomain, setNewHostingDomain] = useState({ 
    type: 'Hosting', 
    name: '', 
    duration: '', 
    startDate: '', 
    endDate: '', 
    notes: '' 
  });
  const [newAsset, setNewAsset] = useState({ category: '', name: '', link: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [editPaymentId, setEditPaymentId] = useState(null);
  const [editPayment, setEditPayment] = useState(null);
  const [editProjectId, setEditProjectId] = useState(null);
  const [editProject, setEditProject] = useState(null);
  const [editHostingDomainId, setEditHostingDomainId] = useState(null);
  const [editHostingDomain, setEditHostingDomain] = useState(null);
  const [editAssetId, setEditAssetId] = useState(null);
  const [editAsset, setEditAsset] = useState(null);
  const [editPersonal, setEditPersonal] = useState(false);
  const [openProjectMenuId, setOpenProjectMenuId] = useState(null);
  const [openPaymentMenuId, setOpenPaymentMenuId] = useState(null);
  const [projectMenuPosition, setProjectMenuPosition] = useState({ top: 0, right: 0 });
  const [paymentMenuPosition, setPaymentMenuPosition] = useState({ top: 0, right: 0 });
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [personalForm, setPersonalForm] = useState(
    client
      ? { name: client.name, email: client.email, phone: client.phone, companyName: client.companyName || '', brand: client.brand || '', password: '', status: client.status || 'Active', clientId: client.clientId || '' }
      : { name: '', email: '', phone: '', companyName: '', brand: '', password: '', status: 'Active', clientId: '' }
  );

  // Fetch related data on open
  useEffect(() => {
    if (!open || !client) {
      // Reset state when modal closes
      setProjectDetails([]);
      setPaymentHistory([]);
      setHostingDomains([]);
      setClientAssets([]);
      setAssignments([]);
      setEditProjectId(null);
      setEditProject(null);
      setEditPaymentId(null);
      setEditPayment(null);
      setEditHostingDomainId(null);
      setEditHostingDomain(null);
      setEditAssetId(null);
      setEditAsset(null);
      setError('');
      setOpenProjectMenuId(null);
      setOpenPaymentMenuId(null);
      return;
    }
    fetchAll();
  }, [open, client?._id]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openProjectMenuId && !event.target.closest('[data-project-menu-container]')) {
        setOpenProjectMenuId(null);
      }
      if (openPaymentMenuId && !event.target.closest('[data-payment-menu-container]')) {
        setOpenPaymentMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openProjectMenuId, openPaymentMenuId]);

  useEffect(() => {
    if (client) {
      setPersonalForm({ name: client.name, email: client.email, phone: client.phone, companyName: client.companyName || '', brand: client.brand || '', password: '', status: client.status || 'Active', clientId: client.clientId || '' });
    }
  }, [client]);

  const fetchAll = async () => {
    if (!client?._id) return;
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Add cache busting timestamp to ensure fresh data
      const timestamp = Date.now();
      const fetchPromises = [
        axios.get(`${API_URL}/api/project-details?clientId=${client._id}&_t=${timestamp}`, { headers }),
        axios.get(`${API_URL}/api/payment-history/client/${client._id}?_t=${timestamp}`, { headers }),
        axios.get(`${API_URL}/api/assignments?clientId=${client._id}&_t=${timestamp}`, { headers }),
        axios.get(`${API_URL}/api/packages?_t=${timestamp}`, { headers }),
        axios.get(`${API_URL}/api/users?_t=${timestamp}`, { headers }),
      ];
      
      // Conditionally add hosting and notes based on permissions
      if (canDo('view_hosting_domain')) {
        fetchPromises.push(axios.get(`${API_URL}/api/hosting-domains/client/${client._id}?_t=${timestamp}`, { headers }));
      }
      fetchPromises.push(axios.get(`${API_URL}/api/client-assets/client/${client._id}?_t=${timestamp}`, { headers }));
      
      const results = await Promise.all(fetchPromises);
      let resultIndex = 0;
      
      setProjectDetails(results[resultIndex++].data || []);
      setPaymentHistory(results[resultIndex++].data || []);
      setAssignments(results[resultIndex++].data || []);
      setPackages(results[resultIndex++].data || []);
      setUsers(results[resultIndex++].data || []);
      
      if (canDo('view_hosting_domain')) {
        setHostingDomains(results[resultIndex++].data || []);
      }
      setClientAssets(results[resultIndex++].data || []);
    } catch (err) {
      console.error('Error fetching client details:', err);
      setError('Failed to fetch client details');
    } finally {
      setLoading(false);
    }
  };

  // --- Project Details CRUD ---
  const handleAddProject = async () => {
    if (!canDo('add_projects')) {
      setError('You do not have permission to add projects');
      return;
    }
    if (!newProject.packageId) return setError('Select a package');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(`${API_URL}/api/project-details`, {
        clientId: client._id,
        packageId: newProject.packageId,
        description: newProject.description || '',
        deliveryDate: newProject.deliveryDate ? new Date(newProject.deliveryDate).toISOString() : null,
        status: newProject.status || 'In Development',
        amount: newProject.amount ? parseFloat(newProject.amount) : null,
      }, { headers });
      setProjectDetails(prev => [res.data, ...prev]);
      setNewProject({ packageId: '', description: '', deliveryDate: '', status: 'In Development', amount: '' });
      setError('');
    } catch (err) {
      console.error('Error adding project:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to add project');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteProject = async (id) => {
    if (!canDo('delete_projects')) {
      setError('You do not have permission to delete projects');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.delete(`${API_URL}/api/project-details/${id}`, { headers });
      fetchAll();
      setError('');
    } catch (err) {
      console.error('Error deleting project:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to delete project');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (row) => {
    if (!canDo('edit_projects')) {
      setError('You do not have permission to edit projects');
      return;
    }
    setEditProjectId(row._id);
    setEditProject({
      packageId: row.packageId?._id || '',
      description: row.description || '',
      deliveryDate: row.deliveryDate ? row.deliveryDate.slice(0, 10) : '',
      status: row.status || 'In Development',
      amount: row.amount || (row.packageId?.price || ''),
    });
  };
  const handleSaveEditProject = async (id) => {
    if (!canDo('edit_projects')) {
      setError('You do not have permission to edit projects');
      return;
    }
    if (!editProject) {
      setError('Please fill in the project details');
      return;
    }
    if (!editProject.packageId) {
      setError('Please select a package');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const updateData = {
        packageId: editProject.packageId,
        description: editProject.description || '',
        deliveryDate: editProject.deliveryDate ? new Date(editProject.deliveryDate).toISOString() : null,
        status: editProject.status || 'In Development',
        amount: editProject.amount ? parseFloat(editProject.amount) : null,
        clientId: client._id,
      };
      const res = await axios.put(`${API_URL}/api/project-details/${id}`, updateData, { headers });
      setEditProjectId(null);
      setEditProject(null);
      setError('');
      await fetchAll();
    } catch (err) {
      console.error('Error updating project:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to update project';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- Payment History CRUD ---
  const handleAddPayment = async () => {
    if (!canDo('add_payment_history')) {
      setError('You do not have permission to add payment history');
      return;
    }
    if (!newPayment.invoiceNumber || !newPayment.amount) return setError('Fill all payment fields');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/payment-history`, {
        clientId: client._id,
        invoiceNumber: newPayment.invoiceNumber,
        amount: parseFloat(newPayment.amount),
        taxFee: parseFloat(newPayment.taxFee || 0),
        status: newPayment.status,
        paymentMethod: newPayment.paymentMethod,
        description: newPayment.description,
        paymentDate: newPayment.paymentDate ? new Date(newPayment.paymentDate).toISOString() : new Date().toISOString(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPaymentHistory(prev => [res.data.payment, ...prev]);
      setNewPayment({ invoiceNumber: '', amount: '', taxFee: '', status: 'Pending', paymentMethod: 'Credit Card', description: '', paymentDate: new Date().toISOString().slice(0, 10) });
      setError('');
    } catch (err) {
      console.error('Error adding payment:', err);
      setError('Failed to add payment');
    } finally {
      setLoading(false);
    }
  };
  const handleDeletePayment = async (id) => {
    if (!canDo('delete_payment_history')) {
      setError('You do not have permission to delete payment history');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/payment-history/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchAll();
      setError('');
    } catch (err) {
      console.error('Error deleting payment:', err);
      setError('Failed to delete payment');
    } finally {
      setLoading(false);
    }
  };
  const handleEditPayment = (row) => {
    if (!canDo('edit_payment_history')) {
      setError('You do not have permission to edit payment history');
      return;
    }
    setEditPaymentId(row._id);
    setEditPayment({ 
      ...row,
      amount: row.amount ? String(row.amount) : '',
      paymentDate: row.paymentDate ? row.paymentDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      taxFee: row.taxFee ? String(row.taxFee) : '',
    });
  };
  const handleSaveEditPayment = async () => {
    if (!canDo('edit_payment_history')) {
      setError('You do not have permission to edit payment history');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/payment-history/${editPaymentId}`, {
        ...editPayment,
        amount: parseFloat(editPayment.amount),
        taxFee: parseFloat(editPayment.taxFee || 0),
        paymentDate: editPayment.paymentDate ? new Date(editPayment.paymentDate).toISOString() : new Date().toISOString(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setEditPaymentId(null);
      setEditPayment(null);
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error updating payment:', err);
      setError('Failed to update payment');
    } finally {
      setLoading(false);
    }
  };

  // --- Hosting/Domain CRUD ---
  const handleAddHostingDomain = async () => {
    if (!canDo('add_hosting_domain')) {
      setError('You do not have permission to add hosting/domain records');
      return;
    }
    if (!newHostingDomain.type || !newHostingDomain.name || !newHostingDomain.startDate || !newHostingDomain.endDate) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/hosting-domains`, {
        clientId: client._id,
        ...newHostingDomain,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNewHostingDomain({ 
        type: 'Hosting', 
        name: '', 
        duration: '', 
        startDate: '', 
        endDate: '', 
        notes: '' 
      });
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error adding hosting/domain:', err);
      setError(err.response?.data?.message || 'Failed to add hosting/domain record');
    } finally {
      setLoading(false);
    }
  };

  const handleEditHostingDomain = (row) => {
    if (!canDo('edit_hosting_domain')) {
      setError('You do not have permission to edit hosting/domain records');
      return;
    }
    setEditHostingDomainId(row._id);
    setEditHostingDomain({
      type: row.type,
      name: row.name,
      duration: row.duration || '',
      startDate: row.startDate ? row.startDate.slice(0, 10) : '',
      endDate: row.endDate ? row.endDate.slice(0, 10) : '',
      notes: row.notes || '',
    });
  };

  const handleSaveEditHostingDomain = async () => {
    if (!canDo('edit_hosting_domain')) {
      setError('You do not have permission to edit hosting/domain records');
      return;
    }
    if (!editHostingDomain.type || !editHostingDomain.name || !editHostingDomain.startDate || !editHostingDomain.endDate) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/hosting-domains/${editHostingDomainId}`, {
        ...editHostingDomain,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setEditHostingDomainId(null);
      setEditHostingDomain(null);
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error updating hosting/domain:', err);
      setError(err.response?.data?.message || 'Failed to update hosting/domain record');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteHostingDomain = async (id) => {
    if (!canDo('delete_hosting_domain')) {
      setError('You do not have permission to delete hosting/domain records');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/hosting-domains/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error deleting hosting/domain:', err);
      setError('Failed to delete record');
    } finally {
      setLoading(false);
    }
  };

  // --- Assets CRUD ---
  const handleAddAsset = async () => {
    if (!canDo('add_client_assets')) {
      setError('You do not have permission to add client assets');
      return;
    }
    if (!newAsset.category || !newAsset.name || !newAsset.link) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/api/client-assets`, {
        clientId: client._id,
        category: newAsset.category.trim(),
        name: newAsset.name.trim(),
        link: newAsset.link.trim(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setNewAsset({ category: '', name: '', link: '' });
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error adding asset:', err);
      setError(err.response?.data?.message || 'Failed to add asset');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAsset = (row) => {
    if (!canDo('edit_client_assets')) {
      setError('You do not have permission to edit client assets');
      return;
    }
    setEditAssetId(row._id);
    setEditAsset({
      category: row.category,
      name: row.name,
      link: row.link,
    });
  };

  const handleSaveEditAsset = async () => {
    if (!canDo('edit_client_assets')) {
      setError('You do not have permission to edit client assets');
      return;
    }
    if (!editAsset.category || !editAsset.name || !editAsset.link) {
      setError('Please fill in all required fields');
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/client-assets/${editAssetId}`, {
        category: editAsset.category.trim(),
        name: editAsset.name.trim(),
        link: editAsset.link.trim(),
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setEditAssetId(null);
      setEditAsset(null);
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error updating asset:', err);
      setError(err.response?.data?.message || 'Failed to update asset');
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!client?._id) return;
    setGeneratingPDF(true);
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const response = await axios.get(`${API_URL}/api/clients/${client._id}/pdf`, {
        headers,
        responseType: 'blob', // Important for PDF download
      });
      
      // Create blob URL and trigger download
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Client_Report_${client.clientId || client.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating PDF:', err);
      setError('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDeleteAsset = async (id) => {
    if (!canDo('delete_client_assets')) {
      setError('You do not have permission to delete client assets');
      return;
    }
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/client-assets/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setError('');
      fetchAll();
    } catch (err) {
      console.error('Error deleting asset:', err);
      setError('Failed to delete asset');
    } finally {
      setLoading(false);
    }
  };


  // --- Assignment CRUD ---
  const handleAddAssignment = async () => {
    if (!roleSelect || !userSelect) return setError('Select role and user');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`${API_URL}/api/assignments`, {
        clientId: client._id,
        role: roleSelect,
        userId: userSelect,
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setAssignments(prev => [res.data, ...prev]);
      setRoleSelect('Front');
      setUserSelect('');
      setError('');
    } catch (err) {
      console.error('Error adding assignment:', err);
      setError('Failed to assign user');
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAssignment = async (id) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/assignments/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchAll();
      setError('');
    } catch (err) {
      console.error('Error deleting assignment:', err);
      setError('Failed to delete assignment');
    } finally {
      setLoading(false);
    }
  };

  const handlePersonalEdit = () => setEditPersonal(true);
  const handlePersonalCancel = () => { setEditPersonal(false); setPersonalForm({ name: client.name, email: client.email, phone: client.phone, companyName: client.companyName || '', brand: client.brand || '', password: '', status: client.status || 'Active', clientId: client.clientId || '' }); };
  const handlePersonalChange = e => setPersonalForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const handlePersonalSave = async () => {
    if (!canDo('edit_clients')) {
      setError('You do not have permission to edit clients');
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`${API_URL}/api/clients/${client._id}`, personalForm, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setEditPersonal(false);
      // Update the local client object so UI updates immediately
      if (res.data && res.data.client) {
        Object.assign(client, res.data.client);
      } else {
        // Fallback or if the API returns the updated data differently
        Object.assign(client, personalForm);
      }
      setPersonalForm({ ...personalForm });
      setError('');
    } catch (err) {
      console.error('Error updating personal info:', err);
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to update personal info');
    } finally {
      setLoading(false);
    }
  };

  const getPaymentRowColor = (status) => {
    if (status === 'Paid' || status === 'Completed') return '#d4f8e8'; // Light green
    if (status === 'Pending') return '#fff9d6'; // Light yellow
    if (status === 'Failed') return '#ffe0e0'; // Light red
    if (status === 'Dispute') return '#ffe4e1'; // Light orange/red for disputes
    return '';
  };
  const getDaysLeft = (paymentDate) => {
    if (!paymentDate) return '-';
    // Assume paymentDate is the creation date of the payment record
    const created = new Date(paymentDate);
    const now = new Date();
    const diff = Math.floor((now - created) / (1000 * 60 * 60 * 24)); // Difference in days
    const left = 180 - diff; // Assuming a 180-day validity/tracking period
    return left > 0 ? `${left} days left` : 'Expired';
  };

  // Valid roles according to Assignment model enum - always show all valid roles
  const VALID_ASSIGNMENT_ROLES = ['Admin', 'Front', 'Upsell', 'Production', 'Employee'];
  
  // Use all valid roles in the dropdown (not just roles from existing users)
  // This allows admins to assign any valid role type
  const rolesToShow = VALID_ASSIGNMENT_ROLES;

  // --- Tab Content Renderers ---
  const renderPersonalInfo = () => (
    <div style={{
      /* Clean card style */
      background: colors.white,
      borderRadius: theme.radius.xl,
      padding: theme.spacing['2xl'],
      border: `1px solid ${colors.borderLight}`,
      boxShadow: theme.shadows.md,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        <h3 style={{
          margin: 0,
          fontSize: theme.typography.fontSizes['2xl'],
          fontWeight: theme.typography.fontWeights.bold,
          color: colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <FaUser style={{ color: colors.primary }} />
          Personal Information
        </h3>
        {!editPersonal && canDo('edit_clients') && (
          <button
            onClick={handlePersonalEdit}
            style={{
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              transition: `all ${theme.transitions.normal}`,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.primaryDark;
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.primary;
              e.target.style.transform = 'translateY(0)';
            }}
          >
            <FaEdit />
            Edit
          </button>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: theme.spacing.lg,
      }}>
        {/* Name Field */}
        {canDo('view_client_name') && (
        <div style={{
          background: colors.background, /* Subtle contrast for fields */
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaUser style={{ fontSize: '0.875rem' }} />
            Name
          </label>
          {editPersonal ? (
            <input
              name="name"
              value={personalForm.name}
              onChange={handlePersonalChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
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
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.lg,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
            }}>
              {client.name}
            </div>
          )}
        </div>
        )}

        {/* Client ID Field */}
        <div style={{
          background: colors.background,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaUser style={{ fontSize: '0.875rem' }} />
            Client ID
          </label>
          {editPersonal ? (
            <input
              name="clientId"
              value={personalForm.clientId}
              onChange={handlePersonalChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary;
                e.target.style.boxShadow = `0 0 0 3px ${colors.primaryBg}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.boxShadow = 'none';
              }}
              placeholder="e.g., ADE001, WDI001, MP001"
            />
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.lg,
              fontWeight: theme.typography.fontWeights.semibold,
              color: colors.textPrimary,
            }}>
              {client.clientId || 'N/A'}
            </div>
          )}
        </div>

        {/* Email Field */}
        {canDo('view_client_email') && (
        <div style={{
          background: colors.background,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaEnvelope style={{ fontSize: '0.875rem' }} />
            Email
          </label>
          {editPersonal ? (
            <input
              name="email"
              type="email"
              value={personalForm.email}
              onChange={handlePersonalChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
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
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
              wordBreak: 'break-word',
            }}>
              {client.email}
            </div>
          )}
        </div>
        )}

        {/* Phone Field */}
        {canDo('view_client_phone') && (
        <div style={{
          background: colors.background,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaPhone style={{ fontSize: '0.875rem' }} />
            Phone
          </label>
          {editPersonal ? (
            <input
              name="phone"
              value={personalForm.phone}
              onChange={handlePersonalChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
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
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
            }}>
              {client.phone}
            </div>
          )}
        </div>
        )}

        {/* Company Field */}
        <div style={{
          background: colors.background,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaBuilding style={{ fontSize: '0.875rem' }} />
            Company
          </label>
          {editPersonal ? (
            <input
              name="companyName"
              value={personalForm.companyName}
              onChange={handlePersonalChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
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
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
            }}>
              {client.companyName || '-'}
            </div>
          )}
        </div>

        {/* Brand Field */}
        <div style={{
          background: colors.background,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaTag style={{ fontSize: '0.875rem' }} />
            Brand
          </label>
          {editPersonal ? (
            <select
              name="brand"
              value={personalForm.brand}
              onChange={handlePersonalChange}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
                background: colors.white,
                cursor: 'pointer',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = colors.primary;
                e.target.style.boxShadow = `0 0 0 3px ${colors.primaryBg}`;
              }}
              onBlur={(e) => {
                e.target.style.borderColor = colors.border;
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="">Select Brand</option>
              <option value="Webdevelopers Inc">Webdevelopers Inc</option>
              <option value="American Design Eagle">American Design Eagle</option>
              <option value="Mount Pixels">Mount Pixels</option>
            </select>
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
            }}>
              {client.brand || '-'}
            </div>
          )}
        </div>

        {/* Password Field */}
        <div style={{
          background: colors.background,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
          transition: `all ${theme.transitions.normal}`,
        }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            fontSize: theme.typography.fontSizes.sm,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textSecondary,
            marginBottom: theme.spacing.sm,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            <FaLock style={{ fontSize: '0.875rem' }} />
            Password
          </label>
          {editPersonal ? (
            <>
              <input
                type="password"
                name="password"
                value={personalForm.password}
                onChange={handlePersonalChange}
                placeholder="Enter new password (leave blank to keep current)"
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                  color: colors.textPrimary,
                  fontFamily: theme.typography.fontFamily,
                  outline: 'none',
                  transition: `all ${theme.transitions.normal}`,
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
              <p style={{
                margin: `${theme.spacing.xs} 0 0 0`,
                fontSize: theme.typography.fontSizes.xs,
                color: colors.textSecondary,
                fontStyle: 'italic'
              }}>
                Leave blank to keep current password. Set a password to enable client panel access.
              </p>
            </>
          ) : (
            <div style={{
              fontSize: theme.typography.fontSizes.base,
              color: colors.textPrimary,
            }}>
              {client.password ? '••••••••' : 'Not set'}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {editPersonal && (
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: theme.spacing.md,
          marginTop: theme.spacing.xl,
          paddingTop: theme.spacing.xl,
          borderTop: `1px solid ${colors.borderLight}`,
        }}>
          <button
            onClick={handlePersonalCancel}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: colors.white,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              transition: `all ${theme.transitions.normal}`,
            }}
            onMouseEnter={(e) => {
              e.target.style.background = colors.hover;
            }}
            onMouseLeave={(e) => {
              e.target.style.background = colors.white;
            }}
          >
            <FaTimes />
            Cancel
          </button>
          <button
            onClick={handlePersonalSave}
            disabled={loading}
            style={{
              padding: `${theme.spacing.md} ${theme.spacing.xl}`,
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              opacity: loading ? 0.6 : 1,
              transition: `all ${theme.transitions.normal}`,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = colors.primaryDark;
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = colors.primary;
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            <FaSave />
            Save Changes
          </button>
        </div>
      )}
    </div>
  );

  const renderProjectDetails = () => (
    <div style={{
      /* Clean card style */
      background: colors.white,
      borderRadius: theme.radius.xl,
      padding: theme.spacing['2xl'],
      border: `1px solid ${colors.borderLight}`,
      boxShadow: theme.shadows.md,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        <h3 style={{
          margin: 0,
          color: colors.textPrimary,
          fontWeight: theme.typography.fontWeights.bold,
          fontSize: theme.typography.fontSizes['2xl'],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <FaProjectDiagram style={{ color: colors.primary }} />
          Project Details
        </h3>
        <div style={{
          fontSize: theme.typography.fontSizes.sm,
          color: colors.textSecondary,
          fontWeight: theme.typography.fontWeights.medium,
        }}>
          {projectDetails.length} {projectDetails.length === 1 ? 'project' : 'projects'}
        </div>
      </div>
        <div style={{
          background: colors.white,
          borderRadius: theme.radius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          border: `1px solid ${colors.borderLight}`,
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}>
            <select
              value={newProject.packageId}
              onChange={e => {
                const selectedPackage = packages.find(pkg => pkg._id === e.target.value);
                setNewProject(p => ({ 
                  ...p, 
                  packageId: e.target.value,
                  amount: selectedPackage ? selectedPackage.price : ''
                }));
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                background: colors.white,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
              }}
            >
              <option value="">Select Package</option>
              {packages.map(pkg => (
                <option key={pkg._id} value={pkg._id}>{pkg.name} (${pkg.price})</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={newProject.amount}
              onChange={e => setNewProject(p => ({ ...p, amount: e.target.value }))}
              min="0"
              step="0.01"
              style={{
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
            <input
              placeholder="Description"
              value={newProject.description}
              onChange={e => setNewProject(p => ({ ...p, description: e.target.value }))}
              style={{
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
            <input
              type="date"
              value={newProject.deliveryDate}
              onChange={e => setNewProject(p => ({ ...p, deliveryDate: e.target.value }))}
              style={{
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
            <select
              value={newProject.status}
              onChange={e => setNewProject(p => ({ ...p, status: e.target.value }))}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                background: colors.white,
                color: colors.textPrimary,
                fontFamily: theme.typography.fontFamily,
                outline: 'none',
              }}
            >
              <option value="In Development">In Development</option>
              <option value="Out For Review">Out For Review</option>
              <option value="All Done">All Done</option>
            </select>
          </div>
          {canDo('add_projects') && (
          <button
            onClick={handleAddProject}
            disabled={loading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: `all ${theme.transitions.normal}`,
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = colors.primaryDark;
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = colors.primary;
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            Add Project
          </button>
          )}
        </div>
      <div style={{
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.sm,
        background: colors.white,
        border: `1px solid ${colors.borderLight}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ minWidth: '800px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'transparent',
          }}>
            <thead style={{
              background: colors.primaryBg,
              borderBottom: `2px solid ${colors.border}`,
            }}>
              <tr>
                <th style={{
                  padding: theme.spacing.md,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>Package</th>
                <th style={{
                  padding: theme.spacing.md,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>Amount</th>
                <th style={{
                  padding: theme.spacing.md,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>Description</th>
                <th style={{
                  padding: theme.spacing.md,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>Delivery Date</th>
                <th style={{
                  padding: theme.spacing.md,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  textAlign: 'left',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>Status</th>
                <th style={{
                  padding: theme.spacing.md,
                  color: colors.textSecondary,
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  textAlign: 'right',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>Actions</th>
              </tr>
            </thead>
          <tbody>
            {projectDetails.length === 0 ? (
              <tr>
                  <td colSpan="6" style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.textSecondary }}>No projects found.</td>
                </tr>
              ) : (
                projectDetails.map(row => (
                  <tr key={row._id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: `background ${theme.transitions.normal}` }} onMouseEnter={(e) => e.currentTarget.style.background = colors.hover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editProjectId === row._id ? (
                        <select
                          value={editProject.packageId}
                          onChange={e => {
                            const selectedPackage = packages.find(pkg => pkg._id === e.target.value);
                            setEditProject(p => ({ 
                              ...p, 
                              packageId: e.target.value,
                              amount: selectedPackage ? selectedPackage.price : (p.amount || '')
                            }));
                          }}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        >
                          <option value="">Select Package</option>
                          {packages.map(pkg => (
                            <option key={pkg._id} value={pkg._id}>{pkg.name} (${pkg.price})</option>
                          ))}
                        </select>
                      ) : (
                        row.packageId?.name || 'N/A'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editProjectId === row._id ? (
                        <input
                          type="number"
                          value={editProject.amount}
                          onChange={e => setEditProject(p => ({ ...p, amount: e.target.value }))}
                          min="0"
                          step="0.01"
                          placeholder="Amount"
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        row.amount ? `$${parseFloat(row.amount).toFixed(2)}` : (row.packageId?.price ? `$${parseFloat(row.packageId.price).toFixed(2)}` : '-')
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editProjectId === row._id ? (
                        <input
                          type="text"
                          value={editProject.description}
                          onChange={e => setEditProject(p => ({ ...p, description: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        row.description || '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editProjectId === row._id ? (
                        <input
                          type="date"
                          value={editProject.deliveryDate}
                          onChange={e => setEditProject(p => ({ ...p, deliveryDate: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        row.deliveryDate ? new Date(row.deliveryDate).toLocaleDateString() : '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.base }}>
                      {editProjectId === row._id ? (
                        <select
                          value={editProject.status}
                          onChange={e => setEditProject(p => ({ ...p, status: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        >
                          <option value="In Development">In Development</option>
                          <option value="Out For Review">Out For Review</option>
                          <option value="All Done">All Done</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.sm,
                          fontWeight: theme.typography.fontWeights.semibold,
                          color: row.status === 'All Done' ? '#10B981' : row.status === 'Out For Review' ? '#F59E0B' : '#3B82F6',
                          background: row.status === 'All Done' ? '#D1FAE5' : row.status === 'Out For Review' ? '#FFFBEB' : '#DBEAFE',
                        }}>
                          {row.status}
                        </span>
                      )}
                </td>
                    <td style={{ padding: theme.spacing.md, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {editProjectId === row._id ? (
                        <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => handleSaveEditProject(row._id)}
                            disabled={loading}
                            title="Save"
                            style={{ background: colors.success, color: colors.white, border: 'none', borderRadius: theme.radius.md, padding: theme.spacing.sm, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', transition: `all ${theme.transitions.normal}` }}
                            onMouseEnter={(e) => { if (!loading) e.target.style.background = colors.successDark; }}
                            onMouseLeave={(e) => { if (!loading) e.target.style.background = colors.success; }}
                          >
                            <FaSave />
                          </button>
                          <button
                            onClick={() => { setEditProjectId(null); setEditProject(null); }}
                            title="Cancel"
                            style={{ background: colors.danger, color: colors.white, border: 'none', borderRadius: theme.radius.md, padding: theme.spacing.sm, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: `all ${theme.transitions.normal}` }}
                            onMouseEnter={(e) => { e.target.style.background = colors.dangerDark; }}
                            onMouseLeave={(e) => { e.target.style.background = colors.danger; }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', display: 'inline-block' }} data-project-menu-container>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();
                              const dropdownHeight = 100;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const spaceAbove = rect.top;
                              
                              if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                                setProjectMenuPosition({
                                  top: rect.top - dropdownHeight - 4,
                                  right: window.innerWidth - rect.right
                                });
                              } else {
                                setProjectMenuPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right
                                });
                              }
                              setOpenProjectMenuId(openProjectMenuId === row._id ? null : row._id);
                            }}
                  style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: theme.radius.sm,
                              fontSize: '18px',
                              color: colors.textPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.primaryBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FaEllipsisV />
                          </button>
                          {openProjectMenuId === row._id && (
                            <div
                              style={{
                                position: 'fixed',
                                top: `${projectMenuPosition.top}px`,
                                right: `${projectMenuPosition.right}px`,
                                background: colors.white,
                                border: `1px solid ${colors.border}`,
                                borderRadius: theme.radius.md,
                                boxShadow: theme.shadows.md,
                                zIndex: 10000,
                                minWidth: '150px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canDo('edit_projects') && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditProject(row);
                                    setOpenProjectMenuId(null);
                                  }}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: theme.spacing.sm,
                                    color: colors.textPrimary,
                    borderBottom: `1px solid ${colors.borderLight}`,
                  }}
                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.primaryBg;
                  }}
                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <FaEdit style={{ fontSize: '14px' }} />
                                  <span>Edit</span>
                                </div>
                              )}
                              {canDo('delete_projects') && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteProject(row._id);
                                    setOpenProjectMenuId(null);
                                  }}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: theme.spacing.sm,
                                    color: colors.error,
                                    opacity: loading ? 0.6 : 1,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading) e.currentTarget.style.backgroundColor = colors.errorLight;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <FaTrash style={{ fontSize: '14px' }} />
                                  <span>Delete</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPaymentHistory = () => (
    <div style={{
      /* Clean card style */
      background: colors.white,
      borderRadius: theme.radius.xl,
      padding: theme.spacing['2xl'],
      border: `1px solid ${colors.borderLight}`,
      boxShadow: theme.shadows.md,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        <h3 style={{
          margin: 0,
          color: colors.textPrimary,
          fontWeight: theme.typography.fontWeights.bold,
          fontSize: theme.typography.fontSizes['2xl'],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <FaCreditCard style={{ color: colors.primary }} />
          Payment History
        </h3>
        <div style={{
          fontSize: theme.typography.fontSizes.sm,
          color: colors.textSecondary,
          fontWeight: theme.typography.fontWeights.medium,
        }}>
          {paymentHistory.length} {paymentHistory.length === 1 ? 'record' : 'records'}
        </div>
      </div>
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        border: `1px solid ${colors.borderLight}`,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.md,
        }}>
          <input
            placeholder="Invoice Number"
            value={newPayment.invoiceNumber}
            onChange={e => setNewPayment(p => ({ ...p, invoiceNumber: e.target.value }))}
                  style={{
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
          <input
            type="number"
            placeholder="Amount"
            value={newPayment.amount}
            onChange={e => setNewPayment(p => ({ ...p, amount: e.target.value }))}
            min="0"
            step="0.01"
            style={{
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
          <input
            type="number"
            placeholder="Tax/Fee"
            value={newPayment.taxFee}
            onChange={e => setNewPayment(p => ({ ...p, taxFee: e.target.value }))}
            min="0"
            step="0.01"
            style={{
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
          <div style={{
            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.base,
            background: colors.successLight,
            color: colors.successDark,
            fontFamily: theme.typography.fontFamily,
            fontWeight: theme.typography.fontWeights.bold,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.xs,
          }}>
            <FaDollarSign style={{ fontSize: '0.875rem' }} />
            Amount Received: {((parseFloat(newPayment.amount || 0)) - (parseFloat(newPayment.taxFee || 0))).toFixed(2)}
          </div>
                      <select
            value={newPayment.status}
            onChange={e => setNewPayment(p => ({ ...p, status: e.target.value }))}
                        style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
                          background: colors.white,
                          color: colors.textPrimary,
                          fontFamily: theme.typography.fontFamily,
                          outline: 'none',
            }}
          >
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
            <option value="Refunded">Refunded</option>
            <option value="Dispute">Dispute</option>
                      </select>
                      <select
            value={newPayment.paymentMethod}
            onChange={e => setNewPayment(p => ({ ...p, paymentMethod: e.target.value }))}
                        style={{
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
                          background: colors.white,
                          color: colors.textPrimary,
                          fontFamily: theme.typography.fontFamily,
                          outline: 'none',
            }}
          >
            <option value="Credit Card">Credit Card</option>
            <option value="PayPal">PayPal</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Zelle">Zelle</option>
            <option value="Other">Other</option>
                      </select>
                      <input
            placeholder="Description"
            value={newPayment.description}
            onChange={e => setNewPayment(p => ({ ...p, description: e.target.value }))}
                        style={{
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
          <input
            type="date"
            placeholder="Payment Date"
            value={newPayment.paymentDate}
            onChange={e => setNewPayment(p => ({ ...p, paymentDate: e.target.value }))}
            style={{
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
        {canDo('add_payment_history') && (
          <button
            onClick={handleAddPayment}
            disabled={loading}
          style={{
            padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
            background: colors.primary,
            color: colors.white,
            border: 'none',
            borderRadius: theme.radius.md,
            fontWeight: theme.typography.fontWeights.semibold,
            fontSize: theme.typography.fontSizes.base,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            transition: `all ${theme.transitions.normal}`,
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.target.style.background = colors.primaryDark;
              e.target.style.transform = 'translateY(-1px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.target.style.background = colors.primary;
              e.target.style.transform = 'translateY(0)';
            }
          }}
        >
          Add Payment
        </button>
        )}
      </div>
      <div style={{
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.sm,
        background: colors.white,
        border: `1px solid ${colors.borderLight}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ minWidth: '800px' }}>
          <table style={{
                          width: '100%',
            borderCollapse: 'collapse',
            background: 'transparent',
          }}>
            <thead style={{
              background: colors.primaryBg,
              borderBottom: `2px solid ${colors.border}`,
            }}>
              <tr>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice #</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Tax/Fee</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Amount Received</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Method</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days Left</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paymentHistory.length === 0 ? (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.textSecondary }}>No payment records found.</td>
                </tr>
              ) : (
                paymentHistory.map(row => (
                  <tr
                    key={row._id}
                    style={{
                      borderBottom: `1px solid ${colors.borderLight}`,
                      background: getPaymentRowColor(row.status),
                      transition: `background ${theme.transitions.normal}`
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = getPaymentRowColor(row.status) || colors.hover}
                    onMouseLeave={(e) => e.currentTarget.style.background = getPaymentRowColor(row.status)}
                  >
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <input
                          type="text"
                          value={editPayment?.invoiceNumber || ''}
                          onChange={e => setEditPayment(p => ({ ...p, invoiceNumber: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        row.invoiceNumber || '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                      <input
                          type="number"
                          value={editPayment?.amount || ''}
                          onChange={e => setEditPayment(p => ({ ...p, amount: e.target.value }))}
                          min="0"
                          step="0.01"
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        <span style={{ fontWeight: theme.typography.fontWeights.semibold }}>
                          <FaDollarSign style={{ marginRight: theme.spacing.xs, fontSize: '0.75rem' }} />
                          {parseFloat(row.amount || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <input
                          type="number"
                          value={editPayment?.taxFee || ''}
                          onChange={e => setEditPayment(p => ({ ...p, taxFee: e.target.value }))}
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        <span style={{ fontWeight: theme.typography.fontWeights.medium, color: colors.textSecondary }}>
                          <FaDollarSign style={{ marginRight: theme.spacing.xs, fontSize: '0.75rem' }} />
                          {parseFloat(row.taxFee || 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <span style={{ fontWeight: theme.typography.fontWeights.bold, color: colors.successDark }}>
                          <FaDollarSign style={{ marginRight: theme.spacing.xs, fontSize: '0.75rem' }} />
                          {((parseFloat(editPayment?.amount || 0)) - (parseFloat(editPayment?.taxFee || 0))).toFixed(2)}
                        </span>
                      ) : (
                        <span style={{ fontWeight: theme.typography.fontWeights.bold, color: colors.successDark }}>
                          <FaDollarSign style={{ marginRight: theme.spacing.xs, fontSize: '0.75rem' }} />
                          {((parseFloat(row.amount || 0)) - (parseFloat(row.taxFee || 0))).toFixed(2)}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <select
                          value={editPayment?.paymentMethod || 'Credit Card'}
                          onChange={e => setEditPayment(p => ({ ...p, paymentMethod: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        >
                          <option value="Credit Card">Credit Card</option>
                          <option value="PayPal">PayPal</option>
                          <option value="Bank Transfer">Bank Transfer</option>
                          <option value="Zelle">Zelle</option>
                          <option value="Cash">Cash</option>
                          <option value="Other">Other</option>
                        </select>
                      ) : (
                        row.paymentMethod
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <input
                          type="text"
                          value={editPayment?.description || ''}
                          onChange={e => setEditPayment(p => ({ ...p, description: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        row.description || '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <select
                          value={editPayment?.status || 'Pending'}
                          onChange={e => setEditPayment(p => ({ ...p, status: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Completed">Completed</option>
                          <option value="Failed">Failed</option>
                          <option value="Refunded">Refunded</option>
                          <option value="Dispute">Dispute</option>
                        </select>
                      ) : (
                        <span style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.sm,
                          fontWeight: theme.typography.fontWeights.semibold,
                          color: row.status === 'Paid' || row.status === 'Completed' ? colors.successDark : 
                                 row.status === 'Pending' ? colors.warningDark : 
                                 row.status === 'Dispute' ? '#f97316' :
                                 colors.dangerDark,
                          background: row.status === 'Paid' || row.status === 'Completed' ? colors.successLight : 
                                      row.status === 'Pending' ? colors.warningLight : 
                                      row.status === 'Dispute' ? '#fff4e6' :
                                      colors.dangerLight,
                        }}>
                          {row.status}
                        </span>
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {editPaymentId === row._id ? (
                        <input
                          type="date"
                          value={editPayment?.paymentDate || ''}
                          onChange={e => setEditPayment(p => ({ ...p, paymentDate: e.target.value }))}
                          style={{ padding: theme.spacing.xs, borderRadius: theme.radius.sm, border: `1px solid ${colors.border}`, width: '100%' }}
                        />
                      ) : (
                        row.paymentDate ? new Date(row.paymentDate).toLocaleDateString() : '-'
                      )}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm }}>
                      {getDaysLeft(row.paymentDate)}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {editPaymentId === row._id ? (
                        <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                          <button
                            onClick={handleSaveEditPayment}
                            disabled={loading}
                            title="Save"
                            style={{ background: colors.success, color: colors.white, border: 'none', borderRadius: theme.radius.md, padding: theme.spacing.sm, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', transition: `all ${theme.transitions.normal}` }}
                            onMouseEnter={(e) => { if (!loading) e.target.style.background = colors.successDark; }}
                            onMouseLeave={(e) => { if (!loading) e.target.style.background = colors.success; }}
                          >
                            <FaSave />
                          </button>
                          <button
                            onClick={() => { setEditPaymentId(null); setEditPayment(null); }}
                            title="Cancel"
                            style={{ background: colors.danger, color: colors.white, border: 'none', borderRadius: theme.radius.md, padding: theme.spacing.sm, cursor: 'pointer', display: 'flex', alignItems: 'center', transition: `all ${theme.transitions.normal}` }}
                            onMouseEnter={(e) => { e.target.style.background = colors.dangerDark; }}
                            onMouseLeave={(e) => { e.target.style.background = colors.danger; }}
                          >
                            <FaTimes />
                          </button>
                        </div>
                      ) : (
                        <div style={{ position: 'relative', display: 'inline-block' }} data-payment-menu-container>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const button = e.currentTarget;
                              const rect = button.getBoundingClientRect();
                              const dropdownHeight = 100;
                              const spaceBelow = window.innerHeight - rect.bottom;
                              const spaceAbove = rect.top;
                              
                              if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                                setPaymentMenuPosition({
                                  top: rect.top - dropdownHeight - 4,
                                  right: window.innerWidth - rect.right
                                });
                              } else {
                                setPaymentMenuPosition({
                                  top: rect.bottom + 4,
                                  right: window.innerWidth - rect.right
                                });
                              }
                              setOpenPaymentMenuId(openPaymentMenuId === row._id ? null : row._id);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px 8px',
                              borderRadius: theme.radius.sm,
                              fontSize: '18px',
                              color: colors.textPrimary,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.primaryBg;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FaEllipsisV />
                          </button>
                          {openPaymentMenuId === row._id && (
                            <div
                              style={{
                                position: 'fixed',
                                top: `${paymentMenuPosition.top}px`,
                                right: `${paymentMenuPosition.right}px`,
                                background: colors.white,
                          border: `1px solid ${colors.border}`,
                                borderRadius: theme.radius.md,
                                boxShadow: theme.shadows.md,
                                zIndex: 10000,
                                minWidth: '150px',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {canDo('edit_payment_history') && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditPayment(row);
                                    setOpenPaymentMenuId(null);
                                  }}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: theme.spacing.sm,
                                    color: colors.textPrimary,
                                    borderBottom: `1px solid ${colors.borderLight}`,
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = colors.primaryBg;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <FaEdit style={{ fontSize: '14px' }} />
                                  <span>Edit</span>
                                </div>
                              )}
                              {canDo('delete_payment_history') && (
                                <div
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePayment(row._id);
                                    setOpenPaymentMenuId(null);
                                  }}
                                  style={{
                                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: theme.spacing.sm,
                                    color: colors.error,
                                    opacity: loading ? 0.6 : 1,
                                  }}
                                  onMouseEnter={(e) => {
                                    if (!loading) e.currentTarget.style.backgroundColor = colors.errorLight;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                  }}
                                >
                                  <FaTrash style={{ fontSize: '14px' }} />
                                  <span>Delete</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderHostingerTab = () => {
    if (!canDo('view_hosting_domain')) {
      return (
    <div style={{
      background: colors.primaryBg,
      borderRadius: theme.radius.xl,
      padding: theme.spacing['2xl'],
      border: `1px solid ${colors.borderLight}`,
      boxShadow: theme.shadows.sm,
          textAlign: 'center',
          color: colors.textSecondary,
        }}>
          <FaLock style={{ fontSize: '48px', marginBottom: theme.spacing.md, opacity: 0.5 }} />
          <p>You do not have permission to view hosting & domain information.</p>
        </div>
      );
    }
    
    return (
    <div style={{
      background: colors.white,
      borderRadius: theme.radius.xl,
      padding: theme.spacing['2xl'],
      border: `1px solid ${colors.borderLight}`,
      boxShadow: theme.shadows.md,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        <h3 style={{
          margin: 0,
          fontSize: theme.typography.fontSizes['2xl'],
          fontWeight: theme.typography.fontWeights.bold,
          color: colors.textPrimary,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <FaTag style={{ color: colors.primary }} />
          Hosting & Domain
        </h3>
      </div>

      {/* Add New Form */}
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.xl,
        border: `1px solid ${colors.borderLight}`,
      }}>
        <h4 style={{
          margin: `0 0 ${theme.spacing.md} 0`,
          fontSize: theme.typography.fontSizes.lg,
          fontWeight: theme.typography.fontWeights.semibold,
          color: colors.textPrimary,
        }}>
          {editHostingDomainId ? 'Edit Record' : 'Add New Record'}
        </h4>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: theme.spacing.md, 
          marginBottom: theme.spacing.md 
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: colors.textPrimary }}>
              Type <span style={{ color: colors.error }}>*</span>
            </label>
            <select
              value={editHostingDomainId ? editHostingDomain.type : newHostingDomain.type}
              onChange={(e) => editHostingDomainId 
                ? setEditHostingDomain({ ...editHostingDomain, type: e.target.value })
                : setNewHostingDomain({ ...newHostingDomain, type: e.target.value })
              }
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
                cursor: 'pointer',
                background: colors.white,
              }}
            >
              <option value="Hosting">Hosting</option>
              <option value="Domain">Domain</option>
              <option value="VPS">VPS</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: colors.textPrimary }}>
              Name <span style={{ color: colors.error }}>*</span>
            </label>
            <input
              type="text"
              value={editHostingDomainId ? editHostingDomain.name : newHostingDomain.name}
              onChange={(e) => editHostingDomainId 
                ? setEditHostingDomain({ ...editHostingDomain, name: e.target.value })
                : setNewHostingDomain({ ...newHostingDomain, name: e.target.value })
              }
              placeholder={editHostingDomainId ? editHostingDomain.type === 'Domain' ? 'example.com' : 'Hosting name' : newHostingDomain.type === 'Domain' ? 'example.com' : 'Hosting name'}
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
              }}
            />
          </div>
        </div>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
          gap: theme.spacing.md, 
          marginBottom: theme.spacing.md 
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: colors.textPrimary }}>
              Duration
            </label>
            <input
              type="text"
              value={editHostingDomainId ? editHostingDomain.duration : newHostingDomain.duration}
              onChange={(e) => editHostingDomainId 
                ? setEditHostingDomain({ ...editHostingDomain, duration: e.target.value })
                : setNewHostingDomain({ ...newHostingDomain, duration: e.target.value })
              }
              placeholder="e.g., 1 Year, 2 Years"
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: colors.textPrimary }}>
              Start Date <span style={{ color: colors.error }}>*</span>
            </label>
            <input
              type="date"
              value={editHostingDomainId ? editHostingDomain.startDate : newHostingDomain.startDate}
              onChange={(e) => editHostingDomainId 
                ? setEditHostingDomain({ ...editHostingDomain, startDate: e.target.value })
                : setNewHostingDomain({ ...newHostingDomain, startDate: e.target.value })
              }
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: colors.textPrimary }}>
              End Date <span style={{ color: colors.error }}>*</span>
            </label>
            <input
              type="date"
              value={editHostingDomainId ? editHostingDomain.endDate : newHostingDomain.endDate}
              onChange={(e) => editHostingDomainId 
                ? setEditHostingDomain({ ...editHostingDomain, endDate: e.target.value })
                : setNewHostingDomain({ ...newHostingDomain, endDate: e.target.value })
              }
              style={{
                width: '100%',
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                borderRadius: theme.radius.md,
                border: `1px solid ${colors.border}`,
                fontSize: theme.typography.fontSizes.base,
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: theme.spacing.md }}>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.sm, fontWeight: theme.typography.fontWeights.semibold, color: colors.textPrimary }}>
            Notes
          </label>
          <textarea
            value={editHostingDomainId ? editHostingDomain.notes : newHostingDomain.notes}
            onChange={(e) => editHostingDomainId 
              ? setEditHostingDomain({ ...editHostingDomain, notes: e.target.value })
              : setNewHostingDomain({ ...newHostingDomain, notes: e.target.value })
            }
            placeholder="Additional notes..."
            rows={3}
            style={{
              width: '100%',
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
              fontFamily: theme.typography.fontFamily,
              resize: 'vertical',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
          {editHostingDomainId && (
            <button
              onClick={() => {
                setEditHostingDomainId(null);
                setEditHostingDomain(null);
              }}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                background: colors.border,
                color: colors.textPrimary,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          )}
          <button
            onClick={editHostingDomainId ? handleSaveEditHostingDomain : handleAddHostingDomain}
            disabled={loading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : (editHostingDomainId ? 'Update' : 'Add')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.sm,
        background: colors.white,
        border: `1px solid ${colors.borderLight}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ minWidth: '800px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'transparent',
          }}>
            <thead style={{
              background: colors.primaryBg,
              borderBottom: `2px solid ${colors.border}`,
            }}>
              <tr>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Duration</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Start Date</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>End Date</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {hostingDomains.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ padding: theme.spacing['3xl'], textAlign: 'center', color: colors.textSecondary }}>
                    No records found
                  </td>
                </tr>
              ) : (
                hostingDomains.map((row) => {
                  const endDate = row.endDate ? new Date(row.endDate) : null;
                  const isExpired = endDate && endDate < new Date();
                  const status = isExpired ? 'Expired' : 'Active';
                  
                  return (
                    <tr
                      key={row._id}
                      style={{
                        borderBottom: `1px solid ${colors.borderLight}`,
                        opacity: isExpired ? 0.7 : 1,
                      }}
                    >
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.medium,
                          background: row.type === 'Hosting' ? colors.primaryBg : row.type === 'Domain' ? colors.successLight : colors.infoLight,
                          color: row.type === 'Hosting' ? colors.primary : row.type === 'Domain' ? colors.success : colors.info,
                        }}>
                          {row.type}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.semibold }}>
                        {row.name}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {row.duration || '-'}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {row.startDate ? new Date(row.startDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: theme.spacing.md, color: colors.textSecondary }}>
                        {row.endDate ? new Date(row.endDate).toLocaleDateString() : '-'}
                      </td>
                      <td style={{ padding: theme.spacing.md }}>
                        <span style={{
                          display: 'inline-block',
                          padding: `${theme.spacing.xs} ${theme.spacing.md}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.xs,
                          fontWeight: theme.typography.fontWeights.medium,
                          background: isExpired ? colors.errorLight : colors.successLight,
                          color: isExpired ? colors.error : colors.success,
                        }}>
                          {status}
                        </span>
                      </td>
                      <td style={{ padding: theme.spacing.md, textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditHostingDomain(row)}
                          disabled={loading}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            background: colors.primary,
                            color: colors.white,
                            border: 'none',
                            borderRadius: theme.radius.md,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteHostingDomain(row._id)}
                          disabled={loading}
                          style={{
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            background: colors.error,
                            color: colors.white,
                            border: 'none',
                            borderRadius: theme.radius.md,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
  };


  const renderAssignmentTab = () => (
    <div style={{
      background: colors.white,
      borderRadius: theme.radius.xl,
      padding: theme.spacing['2xl'],
      border: `1px solid ${colors.borderLight}`,
      boxShadow: theme.shadows.md,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        paddingBottom: theme.spacing.lg,
        borderBottom: `1px solid ${colors.borderLight}`,
      }}>
        <h3 style={{
          margin: 0,
          color: colors.textPrimary,
          fontWeight: theme.typography.fontWeights.bold,
          fontSize: theme.typography.fontSizes['2xl'],
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.sm,
        }}>
          <FaUserPlus style={{ color: colors.primary }} />
          Assign Team Members
        </h3>
        <div style={{
                          fontSize: theme.typography.fontSizes.sm,
          color: colors.textSecondary,
          fontWeight: theme.typography.fontWeights.medium,
        }}>
          {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
        </div>
      </div>

      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        padding: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
        border: `1px solid ${colors.borderLight}`,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing.md,
          alignItems: 'end',
          marginBottom: theme.spacing.md,
        }}>
          <select
            value={roleSelect}
            onChange={e => {
              setRoleSelect(e.target.value);
              setUserSelect(''); // Clear user selection when role changes
            }}
            style={{
              flex: 1,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                          borderRadius: theme.radius.md,
                          border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
                          background: colors.white,
                          color: colors.textPrimary,
                          fontFamily: theme.typography.fontFamily,
              outline: 'none',
            }}
          >
            {rolesToShow.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>

          <select
            value={userSelect}
            onChange={e => setUserSelect(e.target.value)}
            style={{
              flex: 2,
              padding: `${theme.spacing.sm} ${theme.spacing.md}`,
              borderRadius: theme.radius.md,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.base,
              background: colors.white,
              color: colors.textPrimary,
              fontFamily: theme.typography.fontFamily,
              outline: 'none',
            }}
          >
            <option value="">Select User</option>
            {users
              .filter(user => user.Role === roleSelect)
              .map(user => (
                <option key={user._id} value={user._id}>
                  {user.workEmailName || `${user.First_Name || ''} ${user.Last_Name || ''}`.trim() || user.Email || 'N/A'}
                  {user.Email ? ` (${user.Email})` : ''}
                </option>
              ))}
          </select>
          
          <button
            onClick={handleAddAssignment}
            disabled={loading}
            style={{
              padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
              background: colors.primary,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.md,
              fontWeight: theme.typography.fontWeights.semibold,
              fontSize: theme.typography.fontSizes.base,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              transition: `all ${theme.transitions.normal}`,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.xs,
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.background = colors.primaryDark;
                e.target.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.background = colors.primary;
                e.target.style.transform = 'translateY(0)';
              }
            }}
          >
            <FaUserPlus />
            Assign
          </button>
        </div>
      </div>

      <div style={{
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.sm,
        background: colors.white,
        border: `1px solid ${colors.borderLight}`,
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch'
      }}>
        <div style={{ minWidth: '600px' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'transparent',
          }}>
            <thead style={{
              background: colors.primaryBg,
              borderBottom: `2px solid ${colors.border}`,
            }}>
              <tr>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Name</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Role</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Assigned Date</th>
                <th style={{ padding: theme.spacing.md, color: colors.textSecondary, fontWeight: theme.typography.fontWeights.semibold, fontSize: theme.typography.fontSizes.sm, textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.textSecondary }}>No team members assigned.</td>
                </tr>
              ) : (
                assignments.map(row => (
                  <tr key={row._id} style={{ borderBottom: `1px solid ${colors.borderLight}`, transition: `background ${theme.transitions.normal}` }} onMouseEnter={(e) => e.currentTarget.style.background = colors.hover} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {row.userId 
                        ? (() => {
                            // Use workEmailName if available, otherwise use First_Name + Last_Name, fallback to Email
                            if (row.userId.workEmailName) {
                              return row.userId.workEmailName;
                            }
                            const fullName = `${row.userId.First_Name || ''} ${row.userId.Last_Name || ''}`.trim();
                            return fullName || row.userId.Email || 'N/A';
                          })()
                        : 'N/A'}
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      <span style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.radius.full,
                          fontSize: theme.typography.fontSizes.sm,
                          fontWeight: theme.typography.fontWeights.semibold,
                          color: colors.primaryDark, // Example color logic
                          background: colors.primaryLight, // Example color logic
                        }}>
                        {row.role}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md, color: colors.textPrimary, fontSize: theme.typography.fontSizes.base }}>
                      {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td style={{ padding: theme.spacing.md, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => handleDeleteAssignment(row._id)}
                        disabled={loading}
                        title="Remove Assignment"
                        style={{ background: 'transparent', border: 'none', borderRadius: theme.radius.md, padding: theme.spacing.sm, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', marginLeft: 'auto', transition: `all ${theme.transitions.normal}` }}
                        onMouseEnter={(e) => { if (!loading) { e.target.style.background = colors.errorBg; e.target.querySelector('svg').style.color = colors.danger; } }}
                        onMouseLeave={(e) => { if (!loading) { e.target.style.background = 'transparent'; e.target.querySelector('svg').style.color = colors.danger; } }}
                      >
                        <FaTrash style={{ color: colors.danger, fontSize: theme.typography.fontSizes.base }} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderAssetsTab = () => {
    return (
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.xl,
        padding: theme.spacing['2xl'],
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.md,
        display: 'flex',
        flexDirection: 'column',
        minHeight: '400px',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: theme.spacing.xl,
          paddingBottom: theme.spacing.lg,
          borderBottom: `1px solid ${colors.borderLight}`,
        }}>
          <h3 style={{
            fontSize: theme.typography.fontSizes['2xl'],
            fontWeight: theme.typography.fontWeights.bold,
            color: colors.textPrimary,
            margin: 0,
          }}>
            Assets
          </h3>
        </div>

        {error && (
          <div style={{
            padding: theme.spacing.md,
            background: colors.errorLight,
            color: colors.error,
            borderRadius: theme.radius.md,
            marginBottom: theme.spacing.lg,
            border: `1px solid ${colors.error}`,
          }}>
            {error}
          </div>
        )}

        {/* Add Asset Form */}
        <div style={{
          background: colors.white,
          padding: theme.spacing.xl,
          borderRadius: theme.radius.lg,
          marginBottom: theme.spacing.xl,
          border: `1px solid ${colors.border}`,
        }}>
          <h4 style={{
            fontSize: theme.typography.fontSizes.lg,
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textPrimary,
            marginBottom: theme.spacing.lg,
          }}>
            {editAssetId ? 'Edit Asset' : 'Add New Asset'}
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.md,
            marginBottom: theme.spacing.md,
          }}>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                color: colors.textSecondary,
              }}>
                Category <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="text"
                value={editAssetId ? editAsset.category : newAsset.category}
                onChange={e => editAssetId ? setEditAsset(p => ({ ...p, category: e.target.value })) : setNewAsset(p => ({ ...p, category: e.target.value }))}
                placeholder="e.g., Design, Development, Marketing"
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                  color: colors.textPrimary,
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                color: colors.textSecondary,
              }}>
                Name <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="text"
                value={editAssetId ? editAsset.name : newAsset.name}
                onChange={e => editAssetId ? setEditAsset(p => ({ ...p, name: e.target.value })) : setNewAsset(p => ({ ...p, name: e.target.value }))}
                placeholder="Asset name"
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                  color: colors.textPrimary,
                }}
              />
            </div>
            <div>
              <label style={{
                display: 'block',
                marginBottom: theme.spacing.xs,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                color: colors.textSecondary,
              }}>
                Link <span style={{ color: colors.error }}>*</span>
              </label>
              <input
                type="url"
                value={editAssetId ? editAsset.link : newAsset.link}
                onChange={e => editAssetId ? setEditAsset(p => ({ ...p, link: e.target.value })) : setNewAsset(p => ({ ...p, link: e.target.value }))}
                placeholder="https://example.com"
                style={{
                  width: '100%',
                  padding: theme.spacing.sm,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                  color: colors.textPrimary,
                }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'flex-end' }}>
            {editAssetId && (
              <button
                onClick={() => {
                  setEditAssetId(null);
                  setEditAsset(null);
                  setError('');
                }}
                style={{
                  padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                  background: colors.white,
                  color: colors.textPrimary,
                  border: `1px solid ${colors.border}`,
                  borderRadius: theme.radius.md,
                  cursor: 'pointer',
                  fontWeight: theme.typography.fontWeights.medium,
                }}
              >
                Cancel
              </button>
            )}
            <button
              onClick={editAssetId ? handleSaveEditAsset : handleAddAsset}
              disabled={loading}
              style={{
                padding: `${theme.spacing.sm} ${theme.spacing.xl}`,
                background: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontWeight: theme.typography.fontWeights.semibold,
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : editAssetId ? 'Save Changes' : 'Add Asset'}
            </button>
          </div>
        </div>

        {/* Assets List */}
        <div style={{
          background: colors.white,
          borderRadius: theme.radius.lg,
          border: `1px solid ${colors.border}`,
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            background: 'transparent',
          }}>
            <thead style={{
              background: colors.primaryBg,
              borderBottom: `2px solid ${colors.border}`,
            }}>
              <tr>
                <th style={{
                  padding: theme.spacing.md,
                  textAlign: 'left',
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                }}>
                  Category
                </th>
                <th style={{
                  padding: theme.spacing.md,
                  textAlign: 'left',
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                }}>
                  Name
                </th>
                <th style={{
                  padding: theme.spacing.md,
                  textAlign: 'left',
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                }}>
                  Link
                </th>
                <th style={{
                  padding: theme.spacing.md,
                  textAlign: 'right',
                  fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: theme.typography.fontSizes.sm,
                  color: colors.textSecondary,
                  textTransform: 'uppercase',
                }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clientAssets.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{
                    padding: theme.spacing['2xl'],
                    textAlign: 'center',
                    color: colors.textSecondary,
                  }}>
                    No assets added yet
                  </td>
                </tr>
              ) : (
                clientAssets.map((asset) => (
                  <tr key={asset._id} style={{
                    borderBottom: `1px solid ${colors.borderLight}`,
                  }}>
                    <td style={{
                      padding: theme.spacing.md,
                      color: colors.textPrimary,
                      fontSize: theme.typography.fontSizes.base,
                    }}>
                      {asset.category}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      color: colors.textPrimary,
                      fontSize: theme.typography.fontSizes.base,
                      fontWeight: theme.typography.fontWeights.medium,
                    }}>
                      {asset.name}
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      color: colors.primary,
                      fontSize: theme.typography.fontSizes.base,
                    }}>
                      <a
                        href={asset.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: colors.primary,
                          textDecoration: 'none',
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.textDecoration = 'none';
                        }}
                      >
                        {asset.link}
                      </a>
                    </td>
                    <td style={{
                      padding: theme.spacing.md,
                      textAlign: 'right',
                    }}>
                      <div style={{ display: 'flex', gap: theme.spacing.sm, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => handleEditAsset(asset)}
                          disabled={loading}
                          title="Edit"
                          style={{
                            background: colors.primary,
                            color: colors.white,
                            border: 'none',
                            borderRadius: theme.radius.md,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                          }}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset._id)}
                          disabled={loading}
                          title="Delete"
                          style={{
                            background: colors.error,
                            color: colors.white,
                            border: 'none',
                            borderRadius: theme.radius.md,
                            padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1,
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.xs,
                          }}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (TABS[activeTab]) {
      case 'Personal Info':
        return renderPersonalInfo();
      case 'Project Details':
        return renderProjectDetails();
      case 'Payment History':
          return renderPaymentHistory();
      case 'Hosting & Domain':
          return renderHostingerTab();
      case 'Assets':
          return renderAssetsTab();
      case 'Assigning':
          return renderAssignmentTab();
      default:
        return <p>Select a tab</p>;
    }
  };

  if (!open || !client) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
    }}>
      <div style={{
        background: colors.white,
        borderRadius: theme.radius['3xl'],
        width: '95%',
        maxWidth: '1200px',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: theme.shadows['2xl'],
        display: 'flex',
        flexDirection: 'column',
        margin: theme.spacing.sm,
      }}>
        <header style={{
          padding: `${theme.spacing.lg} ${theme.spacing.xl}`,
          borderBottom: `1px solid ${colors.borderLight}`,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: colors.white,
          flexWrap: 'wrap',
          gap: theme.spacing.md,
        }}>
          <h2 style={{
            margin: 0,
            fontSize: theme.typography.fontSizes['xl'],
            fontWeight: theme.typography.fontWeights.bold,
            color: colors.primary,
            flex: '1 1 auto',
            minWidth: '200px',
          }}>
            {client.name} Details
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md }}>
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                background: generatingPDF ? colors.border : colors.error,
                color: colors.white,
                border: 'none',
                borderRadius: theme.radius.md,
                fontSize: theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.semibold,
                cursor: generatingPDF ? 'not-allowed' : 'pointer',
                transition: `all ${theme.transitions.normal}`,
                opacity: generatingPDF ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                if (!generatingPDF) e.target.style.background = '#dc2626';
              }}
              onMouseLeave={(e) => {
                if (!generatingPDF) e.target.style.background = colors.error;
              }}
            >
              {generatingPDF ? <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> : <FaFilePdf />}
              {generatingPDF ? 'Generating...' : 'Export PDF'}
            </button>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: theme.typography.fontSizes['2xl'],
              color: colors.textSecondary,
              cursor: 'pointer',
              transition: `color ${theme.transitions.normal}`,
            }}
            onMouseEnter={(e) => e.target.style.color = colors.danger}
            onMouseLeave={(e) => e.target.style.color = colors.textSecondary}
          >
            <FaTimes />
          </button>
          </div>
        </header>

        <div style={{
          display: 'flex',
          borderBottom: `1px solid ${colors.border}`,
          padding: `0 ${theme.spacing.xl}`,
          background: colors.white,
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none', // Hide scrollbar for Chrome/Safari
          msOverflowStyle: 'none' // Hide scrollbar for IE/Edge
        }}>
          {TABS.map((tab, index) => (
            <button
              key={tab}
              onClick={() => setActiveTab(index)}
              style={{
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: theme.typography.fontSizes.base,
                fontWeight: theme.typography.fontWeights.semibold,
                color: activeTab === index ? colors.primary : colors.textSecondary,
                borderBottom: activeTab === index ? `3px solid ${colors.primary}` : `3px solid transparent`,
                transition: `all ${theme.transitions.normal}`,
                outline: 'none',
                marginRight: theme.spacing.lg,
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        <main style={{
          padding: theme.spacing['2xl'],
          overflowY: 'auto',
          flex: 1,
          background: colors.background, /* Light gray background to contrast with white cards */
        }}>
          {error && (
            <div style={{
              background: colors.dangerLight,
              color: colors.dangerDark,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.xl,
              border: `1px solid ${colors.danger}`,
              fontWeight: theme.typography.fontWeights.medium,
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
            }}>
              Error: {error}
            </div>
          )}
          {loading && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: theme.spacing.xl,
              color: colors.primary,
            }}>
              <FaSpinner className="animate-spin" style={{ marginRight: theme.spacing.sm }} />
              Loading...
            </div>
          )}
          {!loading && renderContent()}
        </main>
      </div>
    </div>
  );
}

export default ClientDetailsModal;