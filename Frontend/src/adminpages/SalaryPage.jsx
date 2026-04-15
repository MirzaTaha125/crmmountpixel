import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import getApiBaseUrl from '../apiBase';
// bgImage import removed (unused)
import { FaTrash, FaFilePdf, FaEllipsisV, FaPlus, FaTimes, FaSearch, FaFilter } from 'react-icons/fa';
import { theme } from '../theme';

const API_URL = getApiBaseUrl();

function SalaryPage({ salaries, employees, colors, refreshSalaries }) {
  // Filters
  const [filterEmployeeName, setFilterEmployeeName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [salaryLoading, _setSalaryLoading] = useState(false);
  const [_salaryError, _setSalaryError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  

  // --- Create Salary Modal State ---
  const [createForm, setCreateForm] = useState({
    employee: '',
    workingDays: '',
    additionalAmount: '',
    additionalAmountReason: '',
    customAdditionalReason: '',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
  });
  const [createError, setCreateError] = useState('');
  const [createLoading, setCreateLoading] = useState(false);

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

  // Handle form changes
  const handleCreateFormChange = e => {
    const { name, value } = e.target;
    let processedValue = value;
    if (name === 'workingDays' && value !== '') {
      const numValue = Number(value);
      if (numValue > 30) {
        processedValue = '30';
      }
    }
    setCreateForm(f => ({ ...f, [name]: processedValue }));
  };

  // Handle create salary submit (API call)
  const handleCreateSalary = async e => {
    e.preventDefault();
    setCreateError('');
    setCreateLoading(true);
    try {
      const emp = employees.find(e => e._id === createForm.employee);
      if (!emp) throw new Error('Employee not found');
  
      const monthNum = new Date(`${createForm.month} 1, ${createForm.year}`).getMonth() + 1;
  
      const baseSalary = emp.salary || 0;
      const presentDays = Number(createForm.workingDays || 0);
      if (presentDays > 30) {
        throw new Error('Working days cannot exceed 30');
      }
      const totalWorkingDays = 30;
      const perDaySalary = baseSalary / totalWorkingDays;
      const salaryAmount = Math.round(perDaySalary * presentDays);
  
      const additionalAmount = Number(createForm.additionalAmount || 0);
      const reason = createForm.additionalAmountReason === 'Other'
        ? createForm.customAdditionalReason
        : createForm.additionalAmountReason;
  
      await axios.post(`${API_URL}/api/salaries`, {
        employee: createForm.employee,
        totalWorkingDays,
        presentDays,
        salaryAmount,
        additionalAmount,
        additionalAmountReason: reason || '',
        month: monthNum,
        year: createForm.year,
      });
  
      // Reset and refresh
      setShowCreateModal(false);
      setCreateForm({
        employee: '',
        workingDays: '',
        additionalAmount: '',
        additionalAmountReason: '',
        customAdditionalReason: '',
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
      });
      if (refreshSalaries) refreshSalaries();
    } catch (err) {
      setCreateError(err.response?.data?.message || err.message || 'Error creating salary');
    } finally {
      setCreateLoading(false);
    }
  };
  

  // --- Bulk Salary Modal State ---
  const [bulkForm, setBulkForm] = useState({
    workingDays: {},
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
  });
  const [bulkError, setBulkError] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);

  // Handle bulk form changes
  const handleBulkFormChange = e => {
    const { name, value } = e.target;
    setBulkForm(f => ({ ...f, [name]: value }));
  };
  // Handle present days per employee
  const handleBulkPresentDaysChange = (empId, value) => {
    let processedValue = value;
    if (value !== '') {
      const numValue = Number(value);
      if (numValue > 30) {
        processedValue = '30';
      }
    }
    setBulkForm(f => ({ ...f, workingDays: { ...f.workingDays, [empId]: processedValue } }));
  };

  // Handle bulk salary submit (placeholder)
  const handleBulkSalary = async e => {
    e.preventDefault();
    setBulkError('');
    setBulkLoading(true);
    try {
      const totalWorkingDays = 30;
      const monthNum = new Date(`${bulkForm.month} 1, ${bulkForm.year}`).getMonth() + 1;
      const year = bulkForm.year;
  
      const salaryArray = employees.map(emp => {
        const presentDays = Number(bulkForm.workingDays[emp._id] || 0);
        const baseSalary = emp.salary || 0;
        const perDaySalary = baseSalary / totalWorkingDays;
        const salaryAmount = Math.round(perDaySalary * presentDays);
  
        return {
          employee: emp._id,
          totalWorkingDays,
          presentDays,
          salaryAmount,
          additionalAmount: 0,
          additionalAmountReason: '',
          month: monthNum,
          year,
        };
      });
  
      // Validate input
      for (const s of salaryArray) {
        if (!s.presentDays && s.presentDays !== 0) {
          throw new Error('Please enter working days for all employees.');
        }
        if (s.presentDays > 30) {
          throw new Error('Working days cannot exceed 30 for any employee.');
        }
      }
  
      await axios.post(`${API_URL}/api/salaries/bulk`, salaryArray);
      setShowBulkModal(false);
      setBulkForm({
        workingDays: {},
        month: new Date().toLocaleString('default', { month: 'long' }),
        year: new Date().getFullYear(),
      });
      if (refreshSalaries) refreshSalaries();
    } catch (err) {
      setBulkError(err.response?.data?.message || err.message || 'Error creating bulk salaries');
    } finally {
      setBulkLoading(false);
    }
  };
  

  // Helper for month names
  const monthNames = [
    '', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const currentYear = new Date().getFullYear();
  const _currentMonth = new Date().getMonth() + 1;
  const yearOptions = Array.from({length: 11}, (_, i) => currentYear - 5 + i);

  // Helper function to get previous month
  const getPreviousMonth = (month, year) => {
    let prevMonth = month - 1;
    let prevYear = year;
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }
    return { month: prevMonth, year: prevYear };
  };

  // Filtered salaries using the salaries prop from parent
  const filteredSalaries = useMemo(() => {
    return salaries.filter(sal => {
      const matchEmp = filterEmployeeName ? 
        sal.employee?.Name?.toLowerCase().includes(filterEmployeeName.toLowerCase()) : true;
      const matchMonth = filterMonth ? Number(sal.month) === Number(filterMonth) : true;
      const matchYear = filterYear ? Number(sal.year) === Number(filterYear) : true;
      return matchEmp && matchMonth && matchYear;
    });
  }, [salaries, filterEmployeeName, filterMonth, filterYear]);

  // Handlers for filters
  const handleEmployeeFilter = e => setFilterEmployeeName(e.target.value);
  const handleMonthFilter = e => setFilterMonth(e.target.value ? Number(e.target.value) : '');
  const handleYearFilter = e => setFilterYear(e.target.value ? Number(e.target.value) : '');

  // Handler for showing salary history
  const handleShowHistory = (employee) => {
    setSelectedEmployee(employee);
    setShowHistoryModal(true);
  };

  // Handler for closing modals
  const closeModals = () => {
    setShowCreateModal(false);
    setShowBulkModal(false);
    setShowHistoryModal(false);
    setSelectedEmployee(null);
  };

  // Salary history for selected employee
  const employeeSalaryHistory = useMemo(() => {
    if (!selectedEmployee) return [];
    return salaries.filter(sal => sal.employee?._id === selectedEmployee._id);
  }, [selectedEmployee, salaries]);

  // PDF Export state and handlers (placeholders)
  const [pdfLoading, setPdfLoading] = useState(false);
  const [bulkPdfLoading, setBulkPdfLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState('');

  // Helper function to load logo as base64
  const loadLogoAsBase64 = async () => {
    try {
      const response = await fetch('/mountpixels.webp');
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error loading logo:', error);
      return null;
    }
  };

  // Single PDF export
  const handleExportPDF = async (salary) => {
    setPdfLoading(salary._id);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth(); // A4 width: 210mm
      const pageHeight = doc.internal.pageSize.getHeight(); // A4 height: 297mm
      
      // Company colors
      const _primaryColor = [239, 39, 90]; // Mount Pixels pink/red
      const accentColor = [239, 39, 90];
      const textColor = [33, 33, 33];
      const textSecondary = [102, 102, 102];
      const lightGray = [248, 249, 250];
      const borderGray = [229, 231, 235];
      const successGreen = [16, 185, 129];
      
      // Load logo
      const logoBase64 = await loadLogoAsBase64();
      
      // Modern Header Section with gradient effect
      const headerHeight = 70;
      doc.setFillColor(255, 255, 255);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      
      // Accent bar at top
      doc.setFillColor(...accentColor);
      doc.rect(0, 0, pageWidth, 4, 'F');
      
      // Logo (Left side)
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'WEBP', 20, 12, 35, 32);
        } catch {
          // Fallback if image fails
      doc.setFontSize(18);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...accentColor);
          doc.text('MOUNTPIXELS', 20, 20);
        }
      } else {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accentColor);
        doc.text('MOUNTPIXELS', 20, 20);
      }
      
      // Company tagline
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textSecondary);
      doc.text('CREATIVE | MARKETING | SOLUTIONS', 20, 48);
      
      // Salary Slip Title (Right side)
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('SALARY SLIP', pageWidth - 20, 25, { align: 'right' });
      
      // Period info (Right side, below title) - Show previous month
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textSecondary);
      const prevMonthInfo = getPreviousMonth(salary.month, salary.year);
      const periodText = `${monthNames[prevMonthInfo.month] || ''} ${prevMonthInfo.year || ''}`;
      doc.text(periodText, pageWidth - 20, 35, { align: 'right' });
      
      // Document number/ID (Right side)
      doc.setFontSize(9);
      doc.setTextColor(...textSecondary);
      doc.text(`ID: ${salary._id?.slice(-8) || 'N/A'}`, pageWidth - 20, 42, { align: 'right' });
      
      // Divider line
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.5);
      doc.line(20, headerHeight + 5, pageWidth - 20, headerHeight + 5);
      
      // Main Content Area
      const startY = headerHeight + 15;
      const contentWidth = pageWidth - 40;
      const leftMargin = 20;
      const rightMargin = pageWidth - 20;
      
      // Employee Information Section - Modern two-column layout
      const employeeSectionY = startY;
      doc.setFillColor(...lightGray);
      doc.rect(leftMargin, employeeSectionY, contentWidth, 50, 'F');
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.5);
      doc.rect(leftMargin, employeeSectionY, contentWidth, 50, 'S');
      
      // Section title
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('EMPLOYEE INFORMATION', leftMargin + 5, employeeSectionY + 8);
      
      // Left column
      const leftColX = leftMargin + 5;
      const rightColX = leftMargin + contentWidth / 2 + 5;
      let currentY = employeeSectionY + 18;
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textSecondary);
      doc.text('Name:', leftColX, currentY);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text(salary.employee?.Name || 'N/A', leftColX + 20, currentY);
      
      currentY += 7;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textSecondary);
      doc.text('Designation:', leftColX, currentY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text(salary.employee?.designation || '-', leftColX + 25, currentY);
      
      currentY += 7;
      doc.setTextColor(...textSecondary);
      doc.text('Account Number:', leftColX, currentY);
      doc.setTextColor(...textColor);
      doc.text(salary.employee?.accountNumber || '-', leftColX + 30, currentY);
      
      // Right column
      currentY = employeeSectionY + 18;
      doc.setTextColor(...textSecondary);
      doc.text('Bank Name:', rightColX, currentY);
      doc.setTextColor(...textColor);
      doc.text(salary.employee?.bankName || '-', rightColX + 22, currentY);
      
      currentY += 7;
      doc.setTextColor(...textSecondary);
      doc.text('Working Days:', rightColX, currentY);
      doc.setTextColor(...textColor);
      doc.text(`${salary.presentDays?.toString() || '0'} / 30`, rightColX + 25, currentY);
      
      currentY += 7;
      doc.setTextColor(...textSecondary);
      doc.text('Payment Period:', rightColX, currentY);
      doc.setTextColor(...textColor);
      const prevMonthInfo2 = getPreviousMonth(salary.month, salary.year);
      doc.text(`${monthNames[prevMonthInfo2.month] || ''} ${prevMonthInfo2.year || ''}`, rightColX + 30, currentY);
      
      // Earnings Section - Modern table layout
      const earningsY = employeeSectionY + 60;
      const sectionTitleHeight = 12;
      
      // Section header with accent background
      doc.setFillColor(...accentColor);
      doc.rect(leftMargin, earningsY, contentWidth, sectionTitleHeight, 'F');
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(255, 255, 255);
      doc.text('EARNINGS', leftMargin + 5, earningsY + 8);
      
      const tableStartY = earningsY + sectionTitleHeight;
      const rowHeight = 10;
      let tableY = tableStartY;
      
      // Table header
      doc.setFillColor(...lightGray);
      doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'F');
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.3);
      doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'S');
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...textColor);
      doc.text('Description', leftMargin + 5, tableY + 7);
      doc.text('Amount (PKR)', rightMargin - 5, tableY + 7, { align: 'right' });
      
      tableY += rowHeight;
      
      // Salary row
      doc.setFillColor(255, 255, 255);
      doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'F');
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.2);
      doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'S');
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      doc.text('Base Salary', leftMargin + 5, tableY + 7);
      const salaryAmount = parseFloat(salary.salaryAmount || 0);
      doc.text(salaryAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMargin - 5, tableY + 7, { align: 'right' });
      
      tableY += rowHeight;
      
      // Additional Amount row (if exists)
      const additionalAmount = parseFloat(salary.additionalAmount || 0);
      if (additionalAmount > 0) {
        doc.setFillColor(255, 255, 255);
        doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'F');
        doc.setDrawColor(...borderGray);
        doc.setLineWidth(0.2);
        doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'S');
        
        doc.text('Additional Amount', leftMargin + 5, tableY + 7);
        if (salary.additionalAmountReason && salary.additionalAmountReason !== '-') {
          doc.setFontSize(7);
          doc.setTextColor(...textSecondary);
          doc.text(`(${salary.additionalAmountReason})`, leftMargin + 50, tableY + 7);
          doc.setFontSize(9);
          doc.setTextColor(...textColor);
        }
        doc.text(additionalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMargin - 5, tableY + 7, { align: 'right' });
        
        tableY += rowHeight;
      }
      
      // Total Earnings - Highlighted
      const totalAmount = Math.round(salaryAmount + additionalAmount);
      const totalY = tableY + 2;
      
      doc.setFillColor(240, 253, 250); // Light green tint
      doc.rect(leftMargin + 2, totalY, contentWidth - 4, rowHeight + 2, 'F');
      doc.setDrawColor(...successGreen);
      doc.setLineWidth(0.8);
      doc.rect(leftMargin + 2, totalY, contentWidth - 4, rowHeight + 2, 'S');
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...successGreen);
      doc.text('NET PAY', leftMargin + 5, totalY + 8);
      doc.text(totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMargin - 5, totalY + 8, { align: 'right' });
      
      // Signature Section
      const signatureY = totalY + rowHeight + 30;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...textColor);
      
      // Left signature
      doc.text('Employee Signature', leftMargin, signatureY);
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, signatureY + 3, leftMargin + 60, signatureY + 3);
      
      // Right signature
      doc.text('Authorized Signature', rightMargin - 60, signatureY, { align: 'right' });
      doc.line(rightMargin - 60, signatureY + 3, rightMargin, signatureY + 3);
      
      // Footer Section - Modern and clean
      const footerY = pageHeight - 35;
      doc.setFillColor(248, 249, 250);
      doc.rect(0, footerY, pageWidth, 35, 'F');
      
      // Footer border
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.5);
      doc.line(0, footerY, pageWidth, footerY);
      
      // Footer content
      doc.setFontSize(8);
      doc.setTextColor(...textSecondary);
      
      // Left side - Website
      doc.text('www.mountpixels.com', leftMargin, footerY + 8);
      
      // Right side - Contact Info
      const contactInfo = [
        'Phone: +92 21 34544556 | +92 21 34539767',
        'Email: contact@mountpixels.com',
        'Office: No. 206, Marine Faisal, Block 6, Nursery, Shahra-e-Faisal, Karachi, Pakistan'
      ];
      
      contactInfo.forEach((info, idx) => {
        doc.text(info, rightMargin, footerY + 5 + (idx * 7), { align: 'right' });
      });
      
      
      const prevMonthInfo3 = getPreviousMonth(salary.month, salary.year);
      doc.save(`SalarySlip_${salary.employee?.Name || 'Employee'}_${monthNames[prevMonthInfo3.month]}_${prevMonthInfo3.year}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };
  
  // Helper function to generate a single salary slip page (for bulk export)
  const generateSalarySlipPage = async (doc, salary, pageWidth, pageHeight) => {
    // Company colors
    const _primaryColor = [239, 39, 90]; // Mount Pixels pink/red
    const accentColor = [239, 39, 90];
    const textColor = [33, 33, 33];
    const textSecondary = [102, 102, 102];
    const lightGray = [248, 249, 250];
    const borderGray = [229, 231, 235];
    const successGreen = [16, 185, 129];
    
    // Load logo
    const logoBase64 = await loadLogoAsBase64();
    
    // Modern Header Section with gradient effect
    const headerHeight = 70;
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');
    
    // Accent bar at top
    doc.setFillColor(...accentColor);
    doc.rect(0, 0, pageWidth, 4, 'F');
    
    // Logo (Left side)
    if (logoBase64) {
      try {
        doc.addImage(logoBase64, 'WEBP', 20, 12, 35, 32);
      } catch {
        // Fallback if image fails
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accentColor);
        doc.text('MOUNTPIXELS', 20, 20);
      }
    } else {
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...accentColor);
      doc.text('MOUNTPIXELS', 20, 20);
    }
    
    // Company tagline
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textSecondary);
    doc.text('CREATIVE | MARKETING | SOLUTIONS', 20, 48);
    
    // Salary Slip Title (Right side)
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('SALARY SLIP', pageWidth - 20, 25, { align: 'right' });
    
    // Period info (Right side, below title) - Show previous month
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textSecondary);
    const prevMonthInfo = getPreviousMonth(salary.month, salary.year);
    const periodText = `${monthNames[prevMonthInfo.month] || ''} ${prevMonthInfo.year || ''}`;
    doc.text(periodText, pageWidth - 20, 35, { align: 'right' });
    
    // Document number/ID (Right side)
    doc.setFontSize(9);
    doc.setTextColor(...textSecondary);
    doc.text(`ID: ${salary._id?.slice(-8) || 'N/A'}`, pageWidth - 20, 42, { align: 'right' });
    
    // Divider line
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.5);
    doc.line(20, headerHeight + 5, pageWidth - 20, headerHeight + 5);
    
    // Main Content Area
    const startY = headerHeight + 15;
    const contentWidth = pageWidth - 40;
    const leftMargin = 20;
    const rightMargin = pageWidth - 20;
    
    // Employee Information Section - Modern two-column layout
    const employeeSectionY = startY;
    doc.setFillColor(...lightGray);
    doc.rect(leftMargin, employeeSectionY, contentWidth, 50, 'F');
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.5);
    doc.rect(leftMargin, employeeSectionY, contentWidth, 50, 'S');
    
    // Section title
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('EMPLOYEE INFORMATION', leftMargin + 5, employeeSectionY + 8);
    
    // Left column
    const leftColX = leftMargin + 5;
    const rightColX = leftMargin + contentWidth / 2 + 5;
    let currentY = employeeSectionY + 18;
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textSecondary);
    doc.text('Name:', leftColX, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text(salary.employee?.Name || 'N/A', leftColX + 20, currentY);
    
    currentY += 7;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textSecondary);
    doc.text('Designation:', leftColX, currentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text(salary.employee?.designation || '-', leftColX + 25, currentY);
    
    currentY += 7;
    doc.setTextColor(...textSecondary);
    doc.text('Account Number:', leftColX, currentY);
    doc.setTextColor(...textColor);
    doc.text(salary.employee?.accountNumber || '-', leftColX + 30, currentY);
    
    // Right column
    currentY = employeeSectionY + 18;
    doc.setTextColor(...textSecondary);
    doc.text('Bank Name:', rightColX, currentY);
    doc.setTextColor(...textColor);
    doc.text(salary.employee?.bankName || '-', rightColX + 22, currentY);
    
    currentY += 7;
    doc.setTextColor(...textSecondary);
    doc.text('Working Days:', rightColX, currentY);
    doc.setTextColor(...textColor);
    doc.text(`${salary.presentDays?.toString() || '0'} / 30`, rightColX + 25, currentY);
    
    currentY += 7;
    doc.setTextColor(...textSecondary);
    doc.text('Payment Period:', rightColX, currentY);
    doc.setTextColor(...textColor);
    const prevMonthInfo2 = getPreviousMonth(salary.month, salary.year);
    doc.text(`${monthNames[prevMonthInfo2.month] || ''} ${prevMonthInfo2.year || ''}`, rightColX + 30, currentY);
    
    // Earnings Section - Modern table layout
    const earningsY = employeeSectionY + 60;
    const sectionTitleHeight = 12;
    
    // Section header with accent background
    doc.setFillColor(...accentColor);
    doc.rect(leftMargin, earningsY, contentWidth, sectionTitleHeight, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text('EARNINGS', leftMargin + 5, earningsY + 8);
    
    const tableStartY = earningsY + sectionTitleHeight;
    const rowHeight = 10;
    let tableY = tableStartY;
    
    // Table header
    doc.setFillColor(...lightGray);
    doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.3);
    doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'S');
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textColor);
    doc.text('Description', leftMargin + 5, tableY + 7);
    doc.text('Amount (PKR)', rightMargin - 5, tableY + 7, { align: 'right' });
    
    tableY += rowHeight;
    
    // Salary row
    doc.setFillColor(255, 255, 255);
    doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'F');
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.2);
    doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'S');
    
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    doc.text('Base Salary', leftMargin + 5, tableY + 7);
    const salaryAmount = parseFloat(salary.salaryAmount || 0);
    doc.text(salaryAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMargin - 5, tableY + 7, { align: 'right' });
    
    tableY += rowHeight;
    
    // Additional Amount row (if exists)
    const additionalAmount = parseFloat(salary.additionalAmount || 0);
    if (additionalAmount > 0) {
      doc.setFillColor(255, 255, 255);
      doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'F');
      doc.setDrawColor(...borderGray);
      doc.setLineWidth(0.2);
      doc.rect(leftMargin, tableY, contentWidth, rowHeight, 'S');
      
      doc.text('Additional Amount', leftMargin + 5, tableY + 7);
      if (salary.additionalAmountReason && salary.additionalAmountReason !== '-') {
        doc.setFontSize(7);
        doc.setTextColor(...textSecondary);
        doc.text(`(${salary.additionalAmountReason})`, leftMargin + 50, tableY + 7);
        doc.setFontSize(9);
        doc.setTextColor(...textColor);
      }
      doc.text(additionalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMargin - 5, tableY + 7, { align: 'right' });
      
      tableY += rowHeight;
    }
    
    // Total Earnings - Highlighted
    const totalAmount = Math.round(salaryAmount + additionalAmount);
    const totalY = tableY + 2;
    
    doc.setFillColor(240, 253, 250); // Light green tint
    doc.rect(leftMargin + 2, totalY, contentWidth - 4, rowHeight + 2, 'F');
    doc.setDrawColor(...successGreen);
    doc.setLineWidth(0.8);
    doc.rect(leftMargin + 2, totalY, contentWidth - 4, rowHeight + 2, 'S');
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...successGreen);
    doc.text('NET PAY', leftMargin + 5, totalY + 8);
    doc.text(totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), rightMargin - 5, totalY + 8, { align: 'right' });
    
    // Signature Section
    const signatureY = totalY + rowHeight + 30;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textColor);
    
    // Left signature
    doc.text('Employee Signature', leftMargin, signatureY);
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.5);
    doc.line(leftMargin, signatureY + 3, leftMargin + 60, signatureY + 3);
    
    // Right signature
    doc.text('Authorized Signature', rightMargin - 60, signatureY, { align: 'right' });
    doc.line(rightMargin - 60, signatureY + 3, rightMargin, signatureY + 3);
    
    // Footer Section - Modern and clean
    const footerY = pageHeight - 35;
    doc.setFillColor(248, 249, 250);
    doc.rect(0, footerY, pageWidth, 35, 'F');
    
    // Footer border
    doc.setDrawColor(...borderGray);
    doc.setLineWidth(0.5);
    doc.line(0, footerY, pageWidth, footerY);
    
    // Footer content
    doc.setFontSize(8);
    doc.setTextColor(...textSecondary);
    
    // Left side - Website
    doc.text('www.mountpixels.com', leftMargin, footerY + 8);
    
    // Right side - Contact Info
    const contactInfo = [
      'Phone: +92 21 34544556 | +92 21 34539767',
      'Email: contact@mountpixels.com',
      'Office: No. 206, Marine Faisal, Block 6, Nursery, Shahra-e-Faisal, Karachi, Pakistan'
    ];
    
    contactInfo.forEach((info, idx) => {
      doc.text(info, rightMargin, footerY + 5 + (idx * 7), { align: 'right' });
    });
    
  };
  
  // Bulk PDF export
  const handleExportAllBulkPDFs = async () => {
    setBulkPdfLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
  
      for (let idx = 0; idx < filteredSalaries.length; idx++) {
        if (idx > 0) doc.addPage();
        await generateSalarySlipPage(doc, filteredSalaries[idx], pageWidth, pageHeight);
      }
  
      doc.save('Bulk_Salary_Slips.pdf');
    } finally {
      setBulkPdfLoading(false);
    }
  };
  

  const handleDeleteSalary = async (salary) => {
    if (!window.confirm('Are you sure you want to delete this salary record?')) return;
    setDeleteLoading(salary._id);
    try {
      await axios.delete(`${API_URL}/api/salaries/${salary._id}`);
      // Refresh salaries from parent
      if (refreshSalaries) refreshSalaries();
    } catch {
      alert('Error deleting salary');
    } finally {
      setDeleteLoading('');
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
        flexWrap: 'wrap',
        gap: theme.spacing.md
      }} className="salary-header">
        <style>{`
          @media (max-width: 600px) {
            .salary-header {
              flex-direction: column !important;
              align-items: flex-start !important;
            }
            .salary-header > div:last-child {
              width: 100% !important;
              flex-direction: column !important;
              gap: ${theme.spacing.sm} !important;
            }
            .salary-header button {
              width: 100% !important;
              justify-content: center !important;
              border-radius: ${theme.radius.md} !important;
            }
            .salary-filter-row {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .salary-filter-row > * {
              width: 100% !important;
              min-width: 100% !important;
              margin-left: 0 !important;
            }
          }
        `}</style>
        <div>
          <h2 style={{
            fontSize: theme.typography.fontSizes.lg,
            fontWeight: 'bold',
            color: colors.textPrimary,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Payroll Intelligence Matrix
          </h2>
          <p style={{
            fontSize: '10px',
            color: colors.textTertiary,
            margin: 0,
            fontWeight: 'bold',
            textTransform: 'uppercase'
          }}>
            Financial Remuneration Disbursements & Statutory Compliance
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowBulkModal(true)}
            style={{
              padding: `8px 20px`,
              background: colors.white,
              color: colors.textPrimary,
              border: `1px solid ${colors.border}`,
              borderRadius: theme.radius.sm,
              fontWeight: 'bold',
              fontSize: '9px',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            Bulk Generation
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: `8px 20px`,
              background: colors.sidebarBg,
              color: colors.white,
              border: 'none',
              borderRadius: theme.radius.sm,
              fontWeight: 'bold',
              fontSize: '9px',
              textTransform: 'uppercase',
              cursor: 'pointer'
            }}
          >
            Individual Disbursement
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: theme.spacing.md, marginBottom: theme.spacing.xl, alignItems: 'center', flexWrap: 'wrap' }} className="salary-filter-row">
        <div style={{ position: 'relative', flex: '1', minWidth: '200px' }}>
          <FaSearch style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '10px', color: colors.textTertiary }} />
          <input
            type="text"
            placeholder="Search staff..."
            value={filterEmployeeName}
            onChange={handleEmployeeFilter}
            style={{
              padding: '8px 10px 8px 30px',
              borderRadius: theme.radius.sm,
              border: `1px solid ${colors.border}`,
              fontSize: theme.typography.fontSizes.xs,
              background: colors.white,
              color: colors.textPrimary,
              width: '100%',
              outline: 'none'
            }}
          />
        </div>
        <select
          value={filterMonth}
          onChange={handleMonthFilter}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.sm,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            background: colors.white,
            color: colors.textPrimary,
            minWidth: 120,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value=''>All Months</option>
          {monthNames.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
        </select>
        <select
          value={filterYear}
          onChange={handleYearFilter}
          style={{
            padding: theme.spacing.sm,
            borderRadius: theme.radius.sm,
            border: `1px solid ${colors.border}`,
            fontSize: theme.typography.fontSizes.xs,
            background: colors.white,
            color: colors.textPrimary,
            minWidth: 100,
            outline: 'none',
            cursor: 'pointer'
          }}
        >
          <option value=''>All Years</option>
          {Array.from(new Set(salaries.map(s => s.year))).sort((a, b) => a - b).map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <button
          onClick={handleExportAllBulkPDFs}
          disabled={filteredSalaries.length === 0 || bulkPdfLoading}
          style={{
            marginLeft: 'auto',
            padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
            background: '#059669',
            color: colors.white,
            border: 'none',
            borderRadius: theme.radius.sm,
            fontWeight: theme.typography.fontWeights.bold,
            fontSize: theme.typography.fontSizes.xs,
            textTransform: 'uppercase',
            cursor: filteredSalaries.length === 0 ? 'not-allowed' : 'pointer',
            opacity: bulkPdfLoading ? 0.7 : 1
          }}
        >
          {bulkPdfLoading ? 'Processing...' : 'Export PDF Manifest'}
        </button>
      </div>
      {/* Salary Table */}
      <div style={{
        background: colors.white,
        borderRadius: theme.radius.lg,
        border: `1px solid ${colors.borderLight}`,
        overflow: 'hidden',
        boxShadow: theme.shadows.md,
      }}>
        <div style={{ 
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead style={{ background: colors.tableHeaderBg }}>
                <tr>
                  {['Staff Member', 'Period', 'Days', 'Salary', 'Additional', 'Reason', 'Total Net', 'Actions'].map((header, idx) => (
                    <th key={header} style={{
                      padding: `${theme.spacing.sm} ${theme.spacing.lg}`,
                      textAlign: 'left',
                      fontWeight: 'bold',
                      fontSize: '9px',
                      color: colors.textPrimary,
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      borderBottom: `2px solid ${colors.border}`,
                      borderRight: idx < 7 ? `1px solid ${colors.border}` : 'none'
                    }}>{header}</th>
                  ))}
                </tr>
              </thead>
            <tbody>
            {salaryLoading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>Loading payroll records...</td></tr>
            ) : filteredSalaries.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No records matching current filters.</td></tr>
            ) : filteredSalaries.map(sal => (
              <tr key={sal._id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.sm, fontWeight: 'bold', color: colors.textPrimary, cursor: 'pointer' }} onClick={() => handleShowHistory(sal.employee)}>
                  {sal.employee?.Name}
                </td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary }}>
                  {monthNames[sal.month]} {sal.year}
                </td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, fontWeight: 'bold' }}>
                  {sal.presentDays} / 30
                </td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, fontFamily: 'monospace' }}>
                  {sal.salaryAmount.toLocaleString()}
                </td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textSecondary, fontFamily: 'monospace' }}>
                  {sal.additionalAmount || 0}
                </td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, color: colors.textTertiary }}>
                  {sal.additionalAmountReason || '-'}
                </td>
                <td style={{ padding: theme.spacing.md, fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold', color: colors.success, fontFamily: 'monospace' }}>
                  {Math.round((sal.salaryAmount || 0) + (sal.additionalAmount || 0)).toLocaleString()}
                </td>
                <td style={{ padding: theme.spacing.md, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === sal._id ? null : sal._id);
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
                    >
                      <FaEllipsisV />
                    </button>
                    {openMenuId === sal._id && (
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
                            handleExportPDF(sal);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            cursor: pdfLoading === sal._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            color: colors.textPrimary,
                            borderBottom: `1px solid ${colors.borderLight}`,
                            opacity: pdfLoading === sal._id ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (pdfLoading !== sal._id) e.currentTarget.style.backgroundColor = colors.primaryBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaFilePdf style={{ fontSize: '14px' }} />
                          <span style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold' }}>Export Slip</span>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSalary(sal);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                            cursor: deleteLoading === sal._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm,
                            color: colors.error,
                            opacity: deleteLoading === sal._id ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (deleteLoading !== sal._id) e.currentTarget.style.backgroundColor = colors.errorBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaTrash style={{ fontSize: '14px' }} />
                          <span style={{ fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold' }}>Delete Entry</span>
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
      {/* Modals (to be implemented next) */}
      {/* Create Salary Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.lg, width: '95%', maxWidth: 450, boxShadow: theme.shadows.xl, border: `2px solid ${colors.sidebarBg}`, overflow: 'hidden', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: colors.sidebarBg, padding: `${theme.spacing.sm} ${theme.spacing.lg}`, color: colors.white, fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.sidebarActive}` }}>
              Register Payroll Record
            </div>
            <form onSubmit={handleCreateSalary} style={{ padding: theme.spacing.xl, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.md, overflowY: 'auto' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Employee Target</label>
                <select name="employee" value={createForm.employee} onChange={handleCreateFormChange} required style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', cursor: 'pointer' }}>
                  <option value=''>Select staff member...</option>
                  {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.Name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Active Days (Max 30)</label>
                <input name="workingDays" type="number" min="0" max="30" value={createForm.workingDays} onChange={handleCreateFormChange} required style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Additional (PKR)</label>
                <input name="additionalAmount" type="number" min="0" value={createForm.additionalAmount} onChange={handleCreateFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Reason for Increment</label>
                <select name="additionalAmountReason" value={createForm.additionalAmountReason} onChange={handleCreateFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none', cursor: 'pointer' }}>
                  <option value=''>Standard Salary Only</option>
                  <option value='Commission'>Sales Commission</option>
                  <option value='Overtime'>Overtime Compensation</option>
                  <option value='Bonus'>Performance Bonus</option>
                  <option value='Other'>Other Reason</option>
                </select>
              </div>
              {createForm.additionalAmountReason === 'Other' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Custom Description</label>
                  <input name="customAdditionalReason" value={createForm.customAdditionalReason} onChange={handleCreateFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }} />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Report Month</label>
                <select name="month" value={createForm.month} onChange={handleCreateFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                  {monthNames.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Report Year</label>
                <select name="year" value={createForm.year} onChange={handleCreateFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                  {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              {createError && <div style={{ gridColumn: 'span 2', padding: theme.spacing.sm, background: colors.errorBg, color: colors.error, fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}>{createError}</div>}
              <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.md }}>
                <button type="button" onClick={closeModals} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Cancel</button>
                <button type="submit" disabled={createLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: createLoading ? 'not-allowed' : 'pointer' }}>{createLoading ? 'Confirming...' : 'Authorize'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Bulk Salary Modal */}
      {showBulkModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.lg, width: '95%', maxWidth: 500, boxShadow: theme.shadows.xl, border: `2px solid ${colors.sidebarBg}`, overflow: 'hidden', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: colors.sidebarBg, padding: `${theme.spacing.sm} ${theme.spacing.lg}`, color: colors.white, fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.sidebarActive}` }}>
              Bulk Payroll Dispatch
            </div>
            <form onSubmit={handleBulkSalary} style={{ padding: theme.spacing.xl, overflowY: 'auto' }}>
              <div style={{ display: 'flex', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Target Month</label>
                  <select name="month" value={bulkForm.month} onChange={handleBulkFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                    {monthNames.slice(1).map((m, idx) => <option key={idx + 1} value={idx + 1}>{m}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '10px', fontWeight: 'bold', color: colors.textSecondary, marginBottom: '4px', textTransform: 'uppercase' }}>Target Year</label>
                  <select name="year" value={bulkForm.year} onChange={handleBulkFormChange} style={{ width: '100%', padding: theme.spacing.sm, borderRadius: 0, border: `1px solid ${colors.border}`, fontSize: theme.typography.fontSizes.xs, background: colors.white, outline: 'none' }}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto', border: `1px solid ${colors.borderLight}`, background: colors.sidebarBg, padding: theme.spacing.sm, display: 'grid', gridTemplateColumns: '1fr 80px', gap: '4px' }}>
                <div style={{ padding: '4px', color: colors.white, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}>Staff Member</div>
                <div style={{ padding: '4px', color: colors.white, fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', textAlign: 'center' }}>Days</div>
                {employees.map(emp => (
                  <React.Fragment key={emp._id}>
                    <div style={{ padding: '8px', background: colors.white, color: colors.textPrimary, fontSize: theme.typography.fontSizes.xs }}>{emp.Name}</div>
                    <input type="number" min="0" max="30" value={bulkForm.workingDays[emp._id] || ''} onChange={e => handleBulkPresentDaysChange(emp._id, e.target.value)} style={{ padding: '4px', textAlign: 'center', border: 'none', background: colors.white, fontSize: theme.typography.fontSizes.xs, outline: 'none' }} required />
                  </React.Fragment>
                ))}
              </div>
              {bulkError && <div style={{ marginTop: theme.spacing.md, padding: theme.spacing.sm, background: colors.errorBg, color: colors.error, fontSize: '10px', fontWeight: 'bold' }}>{bulkError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing.md, marginTop: theme.spacing.xl }}>
                <button type="button" onClick={closeModals} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.white, color: colors.textSecondary, border: `1px solid ${colors.border}`, borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Discard</button>
                <button type="submit" disabled={bulkLoading} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: bulkLoading ? 'not-allowed' : 'pointer' }}>{bulkLoading ? 'Processing...' : 'Authorize All'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Salary History Modal */}
      {showHistoryModal && selectedEmployee && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: theme.spacing.md }}>
          <div style={{ background: colors.white, borderRadius: theme.radius.lg, width: '95%', maxWidth: 700, boxShadow: theme.shadows.xl, border: `2px solid ${colors.sidebarBg}`, overflow: 'hidden', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ background: colors.sidebarBg, padding: `${theme.spacing.sm} ${theme.spacing.lg}`, color: colors.white, fontWeight: 'bold', fontSize: theme.typography.fontSizes.xs, textTransform: 'uppercase', letterSpacing: '1px', borderBottom: `2px solid ${colors.sidebarActive}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Historical Log: {selectedEmployee.Name}</span>
              <button onClick={closeModals} style={{ background: 'transparent', border: 'none', color: colors.white, cursor: 'pointer', fontSize: '18px' }}><FaTimes /></button>
            </div>
            <div style={{ padding: theme.spacing.xl }}>
              <div style={{ maxHeight: 400, overflowY: 'auto', border: `1px solid ${colors.borderLight}` }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ background: colors.primaryBg }}>
                    <tr>
                      {['Period', 'Base', 'Extra', 'Reason', 'Net'].map(h => (
                        <th key={h} style={{ padding: theme.spacing.sm, textAlign: 'left', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', color: colors.textSecondary }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {employeeSalaryHistory.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: theme.spacing.xl, color: colors.textTertiary, fontSize: theme.typography.fontSizes.xs }}>No records on file.</td></tr>
                    ) : employeeSalaryHistory.map(sal => (
                      <tr key={sal._id} style={{ borderBottom: `1px solid ${colors.borderLight}` }}>
                        <td style={{ padding: theme.spacing.sm, fontSize: theme.typography.fontSizes.xs }}>{monthNames[sal.month]} {sal.year}</td>
                        <td style={{ padding: theme.spacing.sm, fontSize: theme.typography.fontSizes.xs, fontFamily: 'monospace' }}>{sal.salaryAmount.toLocaleString()}</td>
                        <td style={{ padding: theme.spacing.sm, fontSize: theme.typography.fontSizes.xs, fontFamily: 'monospace' }}>{sal.additionalAmount || 0}</td>
                        <td style={{ padding: theme.spacing.sm, fontSize: theme.typography.fontSizes.xs, color: colors.textTertiary }}>{sal.additionalAmountReason || '-'}</td>
                        <td style={{ padding: theme.spacing.sm, fontSize: theme.typography.fontSizes.xs, fontWeight: 'bold', color: colors.success, fontFamily: 'monospace' }}>{(sal.salaryAmount + (sal.additionalAmount || 0)).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: theme.spacing.xl }}>
                <button onClick={closeModals} style={{ padding: `${theme.spacing.sm} ${theme.spacing.xl}`, background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: 0, fontWeight: 'bold', fontSize: theme.typography.fontSizes['2xs'], textTransform: 'uppercase', cursor: 'pointer' }}>Close Record</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaryPage; 