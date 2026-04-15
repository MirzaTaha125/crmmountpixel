import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaEdit, FaTrash, FaEllipsisV, FaPlus } from 'react-icons/fa';
import { theme } from '../theme';

function EmployeesPage({ colors }) {
  const [employees, setEmployees] = useState([]);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({ Name: '', Email: '', Pass: '', address: '', cnic: '', joiningDate: '', salary: '', accountNumber: '', bankName: '', designation: '' });
  const [_employeeError, setEmployeeError] = useState('');
  const [_loading, setLoading] = useState(false);
  const [filterName, setFilterName] = useState('');
  const [filterDesignation, setFilterDesignation] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const API_URL = getApiBaseUrl();

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      let url = `${API_URL}/api/employees?`;
      if (filterName) url += `name=${encodeURIComponent(filterName)}&`;
      if (filterDesignation) url += `designation=${encodeURIComponent(filterDesignation)}&`;
      const res = await axios.get(url);
      setEmployees(res.data.employees);
    } catch {
      setEmployeeError('Failed to fetch employees');
    }
  };
  useEffect(() => { fetchEmployees(); }, [filterName, filterDesignation]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openMenuId && !event.target.closest('[data-menu-container]')) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openMenuId]);

  // Open add modal
  const openEmployeeModal = (emp) => {
    if (emp) {
      setEmployeeForm({
        Name: emp.Name,
        Email: emp.Email,
        address: emp.address,
        cnic: emp.cnic,
        joiningDate: emp.joiningDate ? emp.joiningDate.slice(0, 10) : '',
        salary: emp.salary,
        accountNumber: emp.accountNumber,
        bankName: emp.bankName,
        designation: emp.designation
      });
      setSelectedEmployee(emp);
    } else {
      setEmployeeForm({ Name: '', Email: '', address: '', cnic: '', joiningDate: '', salary: '', accountNumber: '', bankName: '', designation: '' });
      setSelectedEmployee(null);
    }
    setEmployeeModalOpen(true);
    setEmployeeError('');
  };
  // Close modal
  const closeEmployeeModal = () => {
    setEmployeeModalOpen(false);
    setSelectedEmployee(null);
    setEmployeeError('');
  };
  // Handle form change
  const handleEmployeeFormChange = (e) => {
    const { name, value } = e.target;
    setEmployeeForm(f => ({ ...f, [name]: value }));
  };
  // Save (add/edit)
  const handleEmployeeSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEmployeeError('');
    try {
      if (selectedEmployee) {
        await axios.put(`${API_URL}/api/employees/${selectedEmployee._id}`, employeeForm);
      } else {
        await axios.post(`${API_URL}/api/employees`, employeeForm);
      }
      setEmployeeModalOpen(false);
      fetchEmployees();
    } catch (err) {
      setEmployeeError(err.response?.data?.message || 'Error saving employee');
    } finally {
      setLoading(false);
    }
  };
  // Delete
  const handleEmployeeDelete = async (emp) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    setLoading(true);
    setEmployeeError('');
    try {
      await axios.delete(`${API_URL}/api/employees/${emp._id}`);
      fetchEmployees();
    } catch {
      setEmployeeError('Error deleting employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.lg,
        background: colors.white,
        padding: theme.spacing.md,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        boxShadow: theme.shadows.sm,
      }}>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSizes.lg,
            fontWeight: 'bold',
            color: colors.textPrimary,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Human Resources Management
          </h2>
          <p style={{
            fontSize: '10px',
            color: colors.textTertiary,
            margin: 0,
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            Internal Staff Records & Payroll Identification Matrix
          </p>
        </div>
        <button
          onClick={() => openEmployeeModal(null)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm,
            padding: `8px 20px`,
            background: colors.sidebarBg,
            color: colors.white,
            border: 'none',
            borderRadius: theme.radius.md,
            fontWeight: 'bold',
            fontSize: '9px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: theme.shadows.sm,
          }}
        >
          <FaPlus />
          Provision Staff
        </button>
      </div>
      <div style={{ display: 'flex', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            background: colors.white,
            color: colors.textPrimary,
            minWidth: 200,
            outline: 'none'
          }}
        />
        <select
          value={filterDesignation}
          onChange={e => setFilterDesignation(e.target.value)}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.md,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            background: colors.white,
            color: colors.textPrimary,
            minWidth: 200,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value="">All Designations</option>
          {[...new Set(employees.map(emp => emp.designation).filter(Boolean))].map(des => (
            <option key={des} value={des}>{des}</option>
          ))}
        </select>
      </div>
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: colors.tableHeaderBg }}>
                <tr>
                  {['Name', 'Email', 'Identification', 'Joining', 'Salary', 'Account', 'Bank', 'Designation', 'Actions'].map((header, idx) => (
                    <th key={header} style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '9px',
                      color: colors.textPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: `2px solid ${colors.border}`,
                      borderRight: idx < 8 ? `1px solid ${colors.border}` : 'none'
                    }}>{header}</th>
                  ))}
                </tr>
              </thead>
            <tbody>
            {employees.map(emp => (
              <tr key={emp._id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.sm, fontWeight: 'bold', color: colors.textPrimary }}>{emp.Name}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary }}>{emp.Email}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textTertiary, fontFamily: 'monospace' }}>{emp.cnic}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary }}>{emp.joiningDate?.slice(0, 10)}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold', color: colors.success }}>{emp.salary}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, fontFamily: 'monospace' }}>{emp.accountNumber}</td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary }}>{emp.bankName}</td>
                <td style={{ padding: theme.spacing.md }}>
                  <span style={{
                    padding: '2px 8px',
                    background: colors.primaryBg,
                    color: colors.primary,
                    borderRadius: theme.radius.full,
                    fontSize: theme.typography.fontSizes['2xs'],
                    fontWeight: 'bold',
                    textTransform: 'uppercase'
                  }}>{emp.designation}</span>
                </td>
                <td style={{ padding: 16, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === emp._id ? null : emp._id);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: 0,
                        fontSize: '16px',
                        color: colors.textPrimary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primaryBg || colors.accentLight || 'rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <FaEllipsisV />
                    </button>
                    {openMenuId === emp._id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: colors.white,
                          border: `2px solid ${colors.sidebarBg}`,
                          borderRadius: 0,
                          boxShadow: theme.shadows.md,
                          zIndex: 1000,
                          minWidth: '160px',
                          marginTop: '4px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openEmployeeModal(emp);
                            setOpenMenuId(null);
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
                          <span style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold' }}>Edit Record</span>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeDelete(emp);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            color: colors.error,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.errorBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaTrash style={{ fontSize: '14px' }} />
                          <span style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold' }}>Delete Record</span>
                        </div>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {/* Employee Modal */}
      {employeeModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.xl, width: 550, boxShadow: theme.shadows.xl, border: `1px solid ${colors.border}`, overflow: 'hidden' }}>
            <div style={{ background: colors.tableHeaderBg, padding: `15px 20px`, color: colors.textPrimary, fontWeight: theme.typography.fontWeights.bold, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.border}`, borderRadius: `${theme.radius.xl} ${theme.radius.xl} 0 0` }}>
              {selectedEmployee ? 'Security Profile: Update Staff Member' : 'Security Profile: Register New Staff'}
            </div>
            <form onSubmit={handleEmployeeSave} style={{ padding: theme.spacing.xl, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Full Name</label>
                <input name="Name" value={employeeForm.Name} onChange={handleEmployeeFormChange} placeholder="Name" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Email Address</label>
                <input name="Email" value={employeeForm.Email} onChange={handleEmployeeFormChange} placeholder="Email" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Residency Address</label>
                <input name="address" value={employeeForm.address} onChange={handleEmployeeFormChange} placeholder="Address" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>CNIC Number</label>
                <input name="cnic" value={employeeForm.cnic} onChange={handleEmployeeFormChange} placeholder="CNIC" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Joining Date</label>
                <input name="joiningDate" type="date" value={employeeForm.joiningDate} onChange={handleEmployeeFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Basic Salary</label>
                <input name="salary" type="number" value={employeeForm.salary} onChange={handleEmployeeFormChange} placeholder="Salary" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Designation</label>
                <input name="designation" value={employeeForm.designation} onChange={handleEmployeeFormChange} placeholder="Designation" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Bank Account</label>
                <input name="accountNumber" value={employeeForm.accountNumber} onChange={handleEmployeeFormChange} placeholder="Account Number" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Bank Name</label>
                <input name="bankName" value={employeeForm.bankName} onChange={handleEmployeeFormChange} placeholder="Bank Name" style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} required />
              </div>
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                <button type="button" onClick={closeEmployeeModal} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: '#fff', border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>{selectedEmployee ? 'Update' : 'Confirm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeesPage; 