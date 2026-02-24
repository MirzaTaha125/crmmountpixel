import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import jsPDF from 'jspdf';
import getApiBaseUrl from '../apiBase';
import bgImage from '../assets/png-01.png'; // Ensure it's a base64 or bundled correctly
import { FaTrash, FaFilePdf, FaEllipsisV } from 'react-icons/fa';
import { theme } from '../theme';

const API_URL = getApiBaseUrl();

function SalaryPage({ salaries, employees, colors, refreshSalaries }) {
  // Filters
  const [filterEmployeeName, setFilterEmployeeName] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [salaryLoading, setSalaryLoading] = useState(false);
  const [salaryError, setSalaryError] = useState('');
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
  const currentMonth = new Date().getMonth() + 1;
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
      const primaryColor = [239, 39, 90]; // Mount Pixels pink/red
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
        } catch (e) {
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
    const primaryColor = [239, 39, 90]; // Mount Pixels pink/red
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
      } catch (e) {
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
    } catch (err) {
      alert('Error deleting salary');
    } finally {
      setDeleteLoading('');
    }
  };

  return (
    <div className="main-container" style={{ border: `1px solid ${colors.border}`, borderRadius: 18, background: colors.cardBg, boxShadow: colors.cardShadow, padding: 36, width: '95%', height: '100%', maxWidth: 'none', margin: 0, minHeight: 'calc(100vh - 100px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h2 style={{ fontSize: 32, fontWeight: 900, color: colors.text, letterSpacing: 1 }}>Salary</h2>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Search by employee name..."
            value={filterEmployeeName}
            onChange={handleEmployeeFilter}
            style={{ padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minWidth: 180 }}
          />
          <select value={filterMonth} onChange={handleMonthFilter} style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
            <option value=''>All Months</option>
            {monthNames.slice(1).map((m, idx) => <option key={idx+1} value={idx+1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={handleYearFilter} style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
            <option value=''>All Years</option>
            {Array.from(new Set(salaries.map(s => s.year))).sort((a, b) => a - b).map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setShowCreateModal(true)} style={{ marginLeft: 'auto', background: colors.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Create Salary</button>
          <button onClick={() => setShowBulkModal(true)} style={{ background: colors.accentLight, color: colors.accent, border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, cursor: 'pointer' }}>Bulk Salary</button>
        </div>
      </div>
      {/* Export All as PDF button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <button onClick={handleExportAllBulkPDFs} disabled={filteredSalaries.length === 0 || bulkPdfLoading} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '8px 18px', fontWeight: 700, cursor: filteredSalaries.length === 0 ? 'not-allowed' : 'pointer', opacity: bulkPdfLoading ? 0.7 : 1 }}>
          {bulkPdfLoading ? 'Exporting...' : 'Export All as PDF'}
        </button>
      </div>
      {/* Salary Table */}
      <div className="responsive-table" style={{ borderRadius: 12, background: colors.accentLight, boxShadow: colors.cardShadow }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900, background: colors.cardBg }}>
          <thead>
            <tr style={{ background: colors.accentLight }}>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Employee</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Month</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Year</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Working Days</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Total Days</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Salary</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Additional</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Reason</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Total</th>
              <th style={{ padding: 12, borderBottom: `1px solid ${colors.border}` }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {salaryLoading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: colors.muted }}>Loading...</td></tr>
            ) : filteredSalaries.length === 0 ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 24, color: colors.muted }}>No salary records found.</td></tr>
            ) : filteredSalaries.map(sal => (
              <tr key={sal._id}>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}`, cursor: 'pointer', color: colors.accent, fontWeight: 600 }} onClick={() => handleShowHistory(sal.employee)}>{sal.employee?.Name}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{monthNames[sal.month]}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{sal.year}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{sal.presentDays}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>30</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{sal.salaryAmount}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{sal.additionalAmount || 0}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{sal.additionalAmountReason || ''}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}` }}>{Math.round((sal.salaryAmount || 0) + (sal.additionalAmount || 0))}</td>
                <td style={{ padding: 10, borderBottom: `1px solid ${colors.border}`, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
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
                    {openMenuId === sal._id && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: colors.white || '#fff',
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
                            handleExportPDF(sal);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: `${theme.spacing.sm || '8px'} ${theme.spacing.md || '16px'}`,
                            cursor: pdfLoading === sal._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm || '8px',
                            color: colors.accent || colors.primary || '#333',
                            borderBottom: `1px solid ${colors.borderLight || colors.border || '#eee'}`,
                            opacity: pdfLoading === sal._id ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (pdfLoading !== sal._id) {
                              e.currentTarget.style.backgroundColor = colors.primaryBg || colors.accentLight || 'rgba(0,0,0,0.05)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaFilePdf style={{ fontSize: '14px' }} />
                          <span>Export PDF</span>
                        </div>
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSalary(sal);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: `${theme.spacing.sm || '8px'} ${theme.spacing.md || '16px'}`,
                            cursor: deleteLoading === sal._id ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: theme.spacing.sm || '8px',
                            color: colors.error || colors.dangerDark || '#dc2626',
                            opacity: deleteLoading === sal._id ? 0.7 : 1,
                          }}
                          onMouseEnter={(e) => {
                            if (deleteLoading !== sal._id) {
                              e.currentTarget.style.backgroundColor = colors.errorLight || 'rgba(220, 38, 38, 0.1)';
                            }
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
      {/* Modals (to be implemented next) */}
      {/* Create Salary Modal */}
      {showCreateModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleCreateSalary} style={{ background: '#fff', borderRadius: 14, padding: 32, minWidth: 340, boxShadow: '0 2px 24px #23294633', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text }}>Create Salary</h3>
            <label style={{ fontWeight: 600 }}>Employee
              <select name="employee" value={createForm.employee} onChange={handleCreateFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                <option value=''>Select Employee</option>
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.Name}</option>
                ))}
              </select>
            </label>
            <label style={{ fontWeight: 600 }}>Working Days
              <input name="workingDays" type="number" min="0" max="30" value={createForm.workingDays} onChange={handleCreateFormChange} required style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }} />
            </label>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Total Days: <span style={{ fontWeight: 800 }}>30</span></div>
            <label style={{ fontWeight: 600 }}>Additional Amount (optional)
              <input name="additionalAmount" type="number" min="0" value={createForm.additionalAmount} onChange={handleCreateFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }} />
            </label>
            <label style={{ fontWeight: 600 }}>Reason
              <select name="additionalAmountReason" value={createForm.additionalAmountReason} onChange={handleCreateFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                <option value=''>Select Reason</option>
                <option value='Commission'>Commission</option>
                <option value='Overtime'>Overtime</option>
                <option value='Other'>Other</option>
              </select>
            </label>
            {createForm.additionalAmountReason === 'Other' && (
              <label style={{ fontWeight: 600 }}>Custom Reason
                <input name="customAdditionalReason" value={createForm.customAdditionalReason} onChange={handleCreateFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }} />
              </label>
            )}
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600 }}>Month
                  <select name="month" value={createForm.month} onChange={handleCreateFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    {monthNames.slice(1).map((m, idx) => <option key={idx+1} value={idx+1}>{m}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600 }}>Year
                  <select name="year" value={createForm.year} onChange={handleCreateFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </div>
            </div>
            {createError && <div style={{ color: colors.dangerDark, fontWeight: 600 }}>{createError}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={closeModals} style={{ flex: 1, background: colors.muted, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={createLoading} style={{ flex: 1, background: colors.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, cursor: 'pointer', opacity: createLoading ? 0.7 : 1 }}>{createLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </form>
        </div>
      )}
      {/* Bulk Salary Modal */}
      {showBulkModal && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <form onSubmit={handleBulkSalary} style={{ background: '#fff', borderRadius: 14, padding: 32, minWidth: 400, maxWidth: 600, boxShadow: '0 2px 24px #23294633', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text }}>Bulk Salary Creation</h3>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>Total Days: <span style={{ fontWeight: 800 }}>30</span></div>
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600 }}>Month
                  <select name="month" value={bulkForm.month} onChange={handleBulkFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    {monthNames.slice(1).map((m, idx) => <option key={idx+1} value={idx+1}>{m}</option>)}
                  </select>
                </label>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 600 }}>Year
                  <select name="year" value={bulkForm.year} onChange={handleBulkFormChange} style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </label>
              </div>
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', border: `1px solid ${colors.border}`, borderRadius: 8, padding: 8, background: '#f4f6fb' }}>
              <div style={{ fontWeight: 700, marginBottom: 6 }}>Working Days for Each Employee</div>
              {employees.map(emp => (
                <div key={emp._id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ minWidth: 120 }}>{emp.Name}</span>
                  <input type="number" min="0" max="30" value={bulkForm.workingDays[emp._id] || ''} onChange={e => handleBulkPresentDaysChange(emp._id, e.target.value)} style={{ width: 80, padding: 6, borderRadius: 6, border: `1px solid ${colors.border}` }} placeholder="Working Days" required />
                </div>
              ))}
            </div>
            {bulkError && <div style={{ color: colors.dangerDark, fontWeight: 600 }}>{bulkError}</div>}
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button type="button" onClick={closeModals} style={{ flex: 1, background: colors.muted, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" disabled={bulkLoading} style={{ flex: 1, background: colors.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, cursor: 'pointer', opacity: bulkLoading ? 0.7 : 1 }}>{bulkLoading ? 'Creating...' : 'Create All'}</button>
            </div>
          </form>
        </div>
      )}
      {/* Salary History Modal */}
      {showHistoryModal && selectedEmployee && (
        <div className="modal" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 14, padding: 32, minWidth: 340, maxWidth: 600, boxShadow: '0 2px 24px #23294633', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text }}>Salary History: {selectedEmployee.Name}</h3>
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', background: colors.cardBg }}>
                <thead>
                  <tr style={{ background: colors.accentLight }}>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Month</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Year</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Working</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Total</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Salary</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Additional</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Reason</th>
                    <th style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {employeeSalaryHistory.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: 18, color: colors.muted }}>No records.</td></tr>
                  ) : employeeSalaryHistory.map(sal => (
                    <tr key={sal._id}>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{monthNames[sal.month]}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{sal.year}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{sal.presentDays}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>30</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{sal.salaryAmount}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{sal.additionalAmount || 0}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{sal.additionalAmountReason || ''}</td>
                      <td style={{ padding: 8, borderBottom: `1px solid ${colors.border}` }}>{Math.round((sal.salaryAmount || 0) + (sal.additionalAmount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={closeModals} style={{ background: colors.accent, color: '#fff', border: 'none', borderRadius: 6, padding: '10px 0', fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SalaryPage; 