import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaEdit, FaTrash, FaEllipsisV } from 'react-icons/fa';
import { theme } from '../theme';

function EmployeesPage({ colors }) {
  const [employees, setEmployees] = useState([]);
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({ Name: '', Email: '', Pass: '', address: '', cnic: '', joiningDate: '', salary: '', accountNumber: '', bankName: '', designation: '' });
  const [employeeError, setEmployeeError] = useState('');
  const [loading, setLoading] = useState(false);
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
    } catch (err) {
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
    } catch (err) {
      setEmployeeError('Error deleting employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="main-container" style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.cardBg, boxShadow: colors.cardShadow, padding: 36, width: '95%', height: '100%', maxWidth: 'none', margin: 0, minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: colors.text, letterSpacing: 1 }}>Employees</h2>
        <div style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => openEmployeeModal(null)} style={{ padding: '12px 28px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: 18, boxShadow: colors.cardShadow, cursor: 'pointer', transition: 'background 0.2s' }}>+ Add Employee</button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={filterName}
          onChange={e => setFilterName(e.target.value)}
          style={{ padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minWidth: 180 }}
        />
        <select
          value={filterDesignation}
          onChange={e => setFilterDesignation(e.target.value)}
          style={{ padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minWidth: 180 }}
        >
          <option value="">All Designations</option>
          {[...new Set(employees.map(emp => emp.designation).filter(Boolean))].map(des => (
            <option key={des} value={des}>{des}</option>
          ))}
        </select>
      </div>
      <div className="responsive-table" style={{ borderRadius: 12, background: colors.accentLight, boxShadow: colors.cardShadow }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: colors.cardBg }}>
          <thead style={{ background: colors.accentLight }}>
            <tr>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Name</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Email</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>CNIC</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Joining Date</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Salary</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Account Number</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Bank Name</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Designation</th>
              <th style={{ padding: 16, color: colors.text, fontWeight: 800, fontSize: 17 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp._id} style={{ borderBottom: `1px solid ${colors.border}` }}>
                <td style={{ padding: 16 }}>{emp.Name}</td>
                <td style={{ padding: 16 }}>{emp.Email}</td>
                <td style={{ padding: 16 }}>{emp.cnic}</td>
                <td style={{ padding: 16 }}>{emp.joiningDate?.slice(0,10)}</td>
                <td style={{ padding: 16 }}>{emp.salary}</td>
                <td style={{ padding: 16 }}>{emp.accountNumber}</td>
                <td style={{ padding: 16 }}>{emp.bankName}</td>
                <td style={{ padding: 16 }}>{emp.designation}</td>
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
                        borderRadius: theme.radius.sm,
                        fontSize: '18px',
                        color: colors.text || colors.textPrimary || '#333',
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
                          background: colors.white || colors.cardBg || '#fff',
                          border: `1px solid ${colors.border || '#ddd'}`,
                          borderRadius: theme.radius.md || '8px',
                          boxShadow: theme.shadows.md || '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          minWidth: '150px',
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
                            padding: `${theme.spacing.sm || '8px'} ${theme.spacing.md || '16px'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm || '8px',
                            color: colors.textPrimary || colors.text || '#333',
                            borderBottom: `1px solid ${colors.borderLight || colors.border || '#eee'}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.primaryBg || colors.accentLight || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaEdit style={{ fontSize: '14px' }} />
                          <span>Edit</span>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEmployeeDelete(emp);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: `${theme.spacing.sm || '8px'} ${theme.spacing.md || '16px'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm || '8px',
                            color: colors.error || colors.dangerDark || '#dc2626',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.errorLight || 'rgba(220, 38, 38, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaTrash style={{ fontSize: '14px' }} />
                          <span>Delete</span>
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
      {/* Employee Modal */}
      {employeeModalOpen && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content" style={{ background: colors.cardBg, borderRadius: 18, padding: 38, minWidth: 400, boxShadow: colors.cardShadow, width: 420 }}>
            <h2 style={{ marginBottom: 24, fontWeight: 900, color: colors.text }}>{selectedEmployee ? 'Edit Employee' : 'Add Employee'}</h2>
            <form onSubmit={handleEmployeeSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <input name="Name" value={employeeForm.Name} onChange={handleEmployeeFormChange} placeholder="Name" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="Email" value={employeeForm.Email} onChange={handleEmployeeFormChange} placeholder="Email" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="address" value={employeeForm.address} onChange={handleEmployeeFormChange} placeholder="Address" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="cnic" value={employeeForm.cnic} onChange={handleEmployeeFormChange} placeholder="CNIC" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="joiningDate" type="date" value={employeeForm.joiningDate} onChange={handleEmployeeFormChange} style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="salary" type="number" value={employeeForm.salary} onChange={handleEmployeeFormChange} placeholder="Salary" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="accountNumber" value={employeeForm.accountNumber} onChange={handleEmployeeFormChange} placeholder="Account Number" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="bankName" value={employeeForm.bankName} onChange={handleEmployeeFormChange} placeholder="Bank Name" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <input name="designation" value={employeeForm.designation} onChange={handleEmployeeFormChange} placeholder="Designation" style={{ padding: 12, borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button type="button" onClick={closeEmployeeModal} style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16 }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 16 }}>{selectedEmployee ? 'Save' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeesPage; 