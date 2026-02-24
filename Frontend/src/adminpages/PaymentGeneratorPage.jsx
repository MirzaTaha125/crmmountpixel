import React, { useEffect, useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { FaEnvelope, FaTrash, FaEllipsisV, FaEdit, FaFileExcel } from 'react-icons/fa';
import { sendEmail } from '../services/emailService';
import * as XLSX from 'xlsx';
import { usePermissions } from '../contexts/PermissionContext';

function PaymentGeneratorPage({ colors }) {
  const { canDo } = usePermissions();
  const [packages, setPackages] = useState([]);
  const [customPackages, setCustomPackages] = useState([]);
  const [selectedType, setSelectedType] = useState('standard');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [packagePrice, setPackagePrice] = useState(''); // Editable package price
  const [additionalAmount, setAdditionalAmount] = useState('');
  const [additionalDescription, setAdditionalDescription] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [paymentLinks, setPaymentLinks] = useState([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customForm, setCustomForm] = useState({ name: '', price: '', description: '', category: '' });
  const [customFormError, setCustomFormError] = useState('');
  const [customFormLoading, setCustomFormLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [clientId, setClientId] = useState('');
  const [clientOptions, setClientOptions] = useState([]);
  const [clientSearchLoading, setClientSearchLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPaymentConfirmationModal, setShowPaymentConfirmationModal] = useState(false);
  const [emailForm, setEmailForm] = useState({ 
    name: '', 
    package: '', 
    total: '', 
    link: '', 
    to_email: '', 
    message: '',
    htmlMessage: '',
    invoiceNumber: '',
    packageDescription: '',
    packagePrice: '',
    additionalAmount: '',
    additionalDescription: '',
    brand: ''
  });
  const [paymentConfirmationForm, setPaymentConfirmationForm] = useState({
    name: '',
    to_email: '',
    amount: '',
    invoiceNumber: '',
    paymentMethod: '',
    description: '',
    brand: '',
    htmlMessage: '',
    message: '',
    linkId: ''
  });
  const [emailStatus, setEmailStatus] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [paymentConfirmationLoading, setPaymentConfirmationLoading] = useState(false);
  const [paymentConfirmationStatus, setPaymentConfirmationStatus] = useState('');
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [filterType, setFilterType] = useState('month'); // 'month' or 'date'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [exportLoading, setExportLoading] = useState(false);

  const API_URL = getApiBaseUrl();

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchPackages();
    fetchCustomPackages();
  }, []);

  useEffect(() => {
    fetchPaymentLinks();
  }, [selectedMonth, selectedYear, filterType, startDate, endDate]);

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

  const fetchPackages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/packages`);
      setPackages(res.data);
    } catch (err) {
      console.error('Error fetching packages:', err);
    }
  };
  const fetchCustomPackages = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/custom-packages`);
      setCustomPackages(res.data);
    } catch (err) {
      console.error('Error fetching custom packages:', err);
    }
  };
  const fetchPaymentLinks = async () => {
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/api/payment-links?`;
      const params = [];
      
      if (filterType === 'month') {
        params.push(`month=${selectedMonth}`, `year=${selectedYear}`);
      } else if (filterType === 'date' && startDate && endDate) {
        params.push(`startDate=${startDate}`, `endDate=${endDate}`);
      }
      
      if (params.length > 0) {
        url += params.join('&');
      } else {
        url = `${API_URL}/api/payment-links`;
      }
      
      const res = await axios.get(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setPaymentLinks(res.data);
    } catch (err) {
      console.error('Error fetching payment links:', err);
    }
  };

  const handleGenerateLink = async (e) => {
    e.preventDefault();
    if (!canDo('use_payment_generator')) {
      setError('You do not have permission to generate payment links');
      return;
    }
    setLinkLoading(true);
    setError('');
    try {
      const pkg = selectedType === 'standard'
        ? packages.find(p => p._id === selectedPackageId)
        : customPackages.find(p => p._id === selectedPackageId);
      if (!pkg) throw new Error('Please select a package');
      if (!clientName) throw new Error('Name is required');
      
      // Use editable package price if provided, otherwise fall back to package price
      const editablePrice = packagePrice ? Number(packagePrice) : Number(pkg.price);
      const additional = Number(additionalAmount || 0);
      const total = editablePrice + additional;
      
      if (isNaN(packagePrice) || isNaN(additional) || isNaN(total)) {
        throw new Error('Invalid price values');
      }
      const payload = {
        clientName,
        clientId: clientId || undefined,
        clientEmail: clientEmail || undefined,
        packageName: pkg.name,
        packageDescription: pkg.description,
        packagePrice: editablePrice,
        additionalAmount: additional,
        additionalDescription,
        total
      };
      const token = localStorage.getItem('token');
      
      if (editingLink) {
        // Update existing link
        await axios.put(`${API_URL}/api/payment-links/${editingLink.linkId}`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      } else {
        // Create new link
        await axios.post(`${API_URL}/api/payment-links`, payload, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
      }
      
      setShowPaymentModal(false);
      setEditingLink(null);
      setSelectedType('standard');
      setSelectedPackageId('');
      setPackagePrice('');
      setAdditionalAmount('');
      setAdditionalDescription('');
      setClientName('');
      setClientEmail('');
      setClientId('');
      fetchPaymentLinks();
    } catch (err) {
      console.error('Error generating payment link:', err);
      const errorMessage = err.response?.data?.message || err.message || 'Error generating link';
      setError(errorMessage);
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCustomFormChange = (e) => {
    const { name, value } = e.target;
    setCustomForm(f => ({ ...f, [name]: value }));
  };
  const handleCustomFormSubmit = async (e) => {
    e.preventDefault();
    setCustomFormLoading(true);
    setCustomFormError('');
    try {
      if (!customForm.name || !customForm.price || !customForm.category) throw new Error('Name, price, and category are required');
      await axios.post(`${API_URL}/api/custom-packages`, customForm, {
        headers: { Authorization: localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : '' }
      });
      setShowCustomModal(false);
      setCustomForm({ name: '', price: '', description: '', category: '' });
      fetchCustomPackages();
    } catch (err) {
      setCustomFormError(err.response?.data?.message || err.message || 'Error creating custom package');
    } finally {
      setCustomFormLoading(false);
    }
  };

  const handleClientNameChange = async (e) => {
    const value = e.target.value;
    setClientName(value);
    setClientId('');
    setClientEmail('');
    if (value.length < 2) {
      setClientOptions([]);
      setClientDropdownOpen(false);
      return;
    }
    setClientSearchLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_URL}/api/clients?name=${encodeURIComponent(value)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setClientOptions(res.data.clients || []);
      setClientDropdownOpen(true);
    } catch {
      setClientOptions([]);
      setClientDropdownOpen(false);
    } finally {
      setClientSearchLoading(false);
    }
  };
  const handleClientSelect = (client) => {
    setClientName(client.name);
    setClientId(client._id);
    setClientEmail(client.email || '');
    setClientOptions([]);
    setClientDropdownOpen(false);
  };

  const handleOpenEmailModal = async (link) => {
    let email = link.clientEmail || '';
    if (!email && link.clientName) {
      // Try to fetch client by name for email
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/clients?name=${encodeURIComponent(link.clientName)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.clients && res.data.clients.length > 0) {
          email = res.data.clients[0].email || '';
        }
      } catch {}
    }
    // Create professional HTML invoice email
    const invoiceHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 30px; text-align: center;">
              <div style="width: 80px; height: 80px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 40px; color: #ffffff;">📄</span>
    </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">Invoice</h1>
              <p style="margin: 15px 0 0; color: rgba(255, 255, 255, 0.9); font-size: 16px;">Invoice #${link.invoiceNumber || 'N/A'}</p>
              <p style="margin: 8px 0 0; color: rgba(255, 255, 255, 0.8); font-size: 14px;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Dear ${link.clientName || 'Valued Client'},</p>
              <p style="margin: 0 0 30px; font-size: 15px; color: #666666; line-height: 1.8;">
                Thank you for your business! Please find the invoice details below. You can make your payment using the secure payment link provided.
              </p>
              
              <!-- Invoice Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin: 30px 0; border: 1px solid #e9ecef;">
                <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #333333; border-bottom: 2px solid #667eea; padding-bottom: 12px;">Invoice Details</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Client Name:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333; font-weight: 600;">${link.clientName || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Package:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${link.packageName || 'N/A'}</td>
                  </tr>
      ${link.packageDescription ? `
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500; vertical-align: top;">Description:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${link.packageDescription}</td>
                  </tr>
      ` : ''}
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Package Price:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">$${parseFloat(link.packagePrice || 0).toFixed(2)}</td>
                  </tr>
      ${link.additionalAmount && parseFloat(link.additionalAmount) > 0 ? `
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">${link.additionalDescription || 'Additional Amount'}:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">$${parseFloat(link.additionalAmount).toFixed(2)}</td>
                  </tr>
      ` : ''}
                </table>
                
                <!-- Total Amount -->
                <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; padding: 20px; margin-top: 20px; border: 1px solid #10b981;">
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 0; font-size: 18px; font-weight: 700; color: #065f46;">Total Amount:</td>
                      <td style="padding: 0; text-align: right; font-size: 24px; font-weight: 700; color: #047857;">$${parseFloat(link.total || 0).toFixed(2)}</td>
                    </tr>
                  </table>
        </div>
      </div>
              
              <!-- Payment Button -->
              <div style="text-align: center; margin: 35px 0;">
                <a href="${window.location.origin}/pay/${link.linkId}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); transition: all 0.3s ease;">
                  Pay Now
                </a>
                <p style="margin: 20px 0 0; font-size: 13px; color: #999999;">
                  Or copy this link:<br>
                  <a href="${window.location.origin}/pay/${link.linkId}" style="color: #667eea; text-decoration: none; word-break: break-all;">${window.location.origin}/pay/${link.linkId}</a>
                </p>
    </div>
    
              <!-- Footer Message -->
              <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #e9ecef;">
                <p style="margin: 0 0 15px; font-size: 15px; color: #666666; line-height: 1.7;">
                  If you have any questions about this invoice or need assistance with payment, please don't hesitate to contact us.
                </p>
                <p style="margin: 20px 0 0; font-size: 15px; color: #333333;">
                  Thank you for your business!<br>
                  <strong style="color: #667eea;">${link.brand || 'Our Team'}</strong>
      </p>
    </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
        This is an automated invoice. Please do not reply to this email.
      </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain text version for email clients that don't support HTML
    const defaultMessage = `Hello ${link.clientName},

Hope you are doing well. Here's your invoice for the package you purchased from us.

INVOICE DETAILS:
----------------
Invoice Number: ${link.invoiceNumber || 'N/A'}
Date: ${new Date().toLocaleDateString()}
Client Name: ${link.clientName || 'N/A'}
Package: ${link.packageName || 'N/A'}
${link.packageDescription ? `Description: ${link.packageDescription}\n` : ''}Package Price: $${parseFloat(link.packagePrice || 0).toFixed(2)}
${link.additionalAmount && parseFloat(link.additionalAmount) > 0 ? `${link.additionalDescription || 'Additional Amount'}: $${parseFloat(link.additionalAmount).toFixed(2)}\n` : ''}
TOTAL AMOUNT: $${parseFloat(link.total || 0).toFixed(2)}

PAYMENT LINK:
${window.location.origin}/pay/${link.linkId}

Thank you for your business!

Best regards,
${link.brand || 'Our Team'}`;
    setEmailForm({
      name: link.clientName,
      package: link.packageName,
      total: link.total,
      link: window.location.origin + `/pay/${link.linkId}`,
      to_email: email,
      message: defaultMessage,
      htmlMessage: invoiceHtml,
      invoiceNumber: link.invoiceNumber,
      packageDescription: link.packageDescription,
      packagePrice: link.packagePrice,
      additionalAmount: link.additionalAmount,
      additionalDescription: link.additionalDescription,
      brand: link.brand
    });
    setEmailStatus('');
    setShowEmailModal(true);
  };
  const handleEmailFormChange = (e) => {
    setEmailForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };
  const handleSendEmail = async (e) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailStatus('');
    try {
      // Use HTML invoice if available, otherwise use plain text
      const htmlContent = emailForm.htmlMessage || emailForm.message.replace(/\n/g, '<br>');
      const textContent = emailForm.message;
      
      await sendEmail({
        to: emailForm.to_email,
        toName: emailForm.name,
        subject: emailForm.brand ? `${emailForm.brand} | Invoice | ${emailForm.package}` : `Invoice | ${emailForm.package}`,
        html: htmlContent,
        text: textContent
      });
      setEmailStatus('Invoice email sent successfully!');
      setTimeout(() => {
        setShowEmailModal(false);
        setEmailForm({ 
          name: '', 
          package: '', 
          total: '', 
          link: '', 
          to_email: '', 
          message: '',
          htmlMessage: '',
          invoiceNumber: '',
          packageDescription: '',
          packagePrice: '',
          additionalAmount: '',
          additionalDescription: '',
          brand: ''
        });
      }, 1500);
    } catch (err) {
      setEmailStatus(err.message || 'Failed to send email. Please check your work email configuration.');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleOpenPaymentConfirmationModal = async (link) => {
    let email = link.clientEmail || '';
    if (!email && link.clientName) {
      // Try to fetch client by name for email
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/clients?name=${encodeURIComponent(link.clientName)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.data.clients && res.data.clients.length > 0) {
          email = res.data.clients[0].email || '';
        }
      } catch {}
    }

    // Default payment method (backend will fetch actual method from payment history)
    const paymentMethod = 'Credit Card';

    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(link.total || 0));

    const brandName = link.brand || 'Our Team';
    const description = link.packageName + (link.additionalAmount > 0 ? ` + Additional: $${link.additionalAmount}` : '');

    // Create payment confirmation HTML email
    const confirmationHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f7fa; line-height: 1.6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f5f7fa; padding: 20px 0;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); overflow: hidden;">
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; font-size: 16px; color: #333333;">Dear ${link.clientName || 'Valued Client'},</p>
              <p style="margin: 0 0 30px; font-size: 15px; color: #666666; line-height: 1.8;">
                Thank you for your payment! This email serves as confirmation that we have successfully received and processed your payment.
              </p>
              
              <!-- Payment Details Card -->
              <div style="background-color: #f8f9fa; border-radius: 10px; padding: 25px; margin: 30px 0; border: 1px solid #e9ecef;">
                <h2 style="margin: 0 0 20px; font-size: 18px; font-weight: 600; color: #333333; border-bottom: 2px solid #667eea; padding-bottom: 12px;">Payment Details</h2>
                <table role="presentation" style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Amount Paid:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 22px; font-weight: 700; color: #10b981;">${formattedAmount}</td>
                  </tr>
                  ${link.invoiceNumber ? `
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Invoice Number:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333; font-weight: 600;">${link.invoiceNumber}</td>
                  </tr>
                  ` : ''}
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Payment Method:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${paymentMethod}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500; vertical-align: top;">Description:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${description}</td>
                  </tr>
                  <tr>
                    <td style="padding: 12px 0; font-size: 15px; color: #666666; font-weight: 500;">Payment Date:</td>
                    <td style="padding: 12px 0; text-align: right; font-size: 15px; color: #333333;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                  </tr>
                </table>
              </div>
              
              <!-- Status Badge -->
              <div style="background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-radius: 8px; padding: 16px 20px; margin: 25px 0; text-align: center; border: 1px solid #10b981;">
                <p style="margin: 0; font-size: 16px; font-weight: 600; color: #065f46;">
                  <span style="font-size: 20px; margin-right: 8px;">✓</span>
                  Payment Status: <span style="color: #047857;">Completed</span>
                </p>
              </div>
              
              <!-- Footer Message -->
              <div style="margin-top: 35px; padding-top: 25px; border-top: 1px solid #e9ecef;">
                <p style="margin: 0 0 15px; font-size: 15px; color: #666666; line-height: 1.7;">
                  We appreciate your business! If you have any questions about this payment or need assistance, please don't hesitate to reach out to us.
                </p>
                <p style="margin: 20px 0 0; font-size: 15px; color: #333333;">
                  Best regards,<br>
                  <strong style="color: #667eea;">${brandName}</strong>
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f8f9fa; padding: 20px 30px; text-align: center; border-top: 1px solid #e9ecef;">
              <p style="margin: 0; font-size: 12px; color: #999999;">
                This is an automated confirmation email. Please do not reply to this message.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // Plain text version
    const confirmationMessage = `Payment Confirmation

Dear ${link.clientName || 'Valued Client'},

This email confirms that we have successfully received your payment.

Payment Details:
- Amount: ${formattedAmount}
${link.invoiceNumber ? `- Invoice Number: ${link.invoiceNumber}\n` : ''}- Payment Method: ${paymentMethod}
- Description: ${description}
- Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}

Payment Status: Completed ✓

Thank you for your payment. If you have any questions or concerns, please don't hesitate to contact us.

Best regards,
${brandName}`;

    setPaymentConfirmationForm({
      name: link.clientName,
      to_email: email,
      amount: link.total,
      invoiceNumber: link.invoiceNumber,
      paymentMethod: paymentMethod,
      description: description,
      brand: link.brand,
      htmlMessage: confirmationHtml,
      message: confirmationMessage,
      linkId: link.linkId // Store linkId for sending confirmation
    });
    setPaymentConfirmationStatus('');
    setShowPaymentConfirmationModal(true);
  };

  const handlePaymentConfirmationFormChange = (e) => {
    setPaymentConfirmationForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSendPaymentConfirmation = async (e) => {
    e.preventDefault();
    setPaymentConfirmationLoading(true);
    setPaymentConfirmationStatus('');
    try {
      const token = localStorage.getItem('token');
      
      if (!paymentConfirmationForm.linkId) {
        throw new Error('Payment link ID not found');
      }

      await axios.post(`${API_URL}/api/payment-links/${paymentConfirmationForm.linkId}/send-confirmation`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      setPaymentConfirmationStatus('Payment confirmation email sent successfully!');
      setTimeout(() => {
        setShowPaymentConfirmationModal(false);
        setPaymentConfirmationForm({
          name: '',
          to_email: '',
          amount: '',
          invoiceNumber: '',
          paymentMethod: '',
          description: '',
          brand: '',
          htmlMessage: '',
          message: '',
          linkId: ''
        });
      }, 1500);
    } catch (err) {
      setPaymentConfirmationStatus(err.response?.data?.message || err.message || 'Failed to send payment confirmation email. Please check your work email configuration.');
    } finally {
      setPaymentConfirmationLoading(false);
    }
  };

  const handleEditLink = (link) => {
    setEditingLink(link);
    setClientName(link.clientName || '');
    setClientId(link.clientId || '');
    setClientEmail(link.clientEmail || '');
    setAdditionalAmount(link.additionalAmount?.toString() || '');
    setAdditionalDescription(link.additionalDescription || '');
    setPackagePrice(link.packagePrice?.toString() || ''); // Set editable price from link
    
    // Find the package
    const pkg = packages.find(p => p.name === link.packageName) || 
                customPackages.find(p => p.name === link.packageName);
    
    if (pkg) {
      const isCustom = customPackages.some(cp => cp._id === pkg._id);
      setSelectedType(isCustom ? 'custom' : 'standard');
      setSelectedPackageId(pkg._id);
    } else {
      setSelectedType('standard');
      setSelectedPackageId('');
    }
    
    setShowPaymentModal(true);
    setOpenMenuId(null);
  };

  const handleDeletePaymentLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to delete this payment link?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/api/payment-links/${linkId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      fetchPaymentLinks();
    } catch (err) {
      console.error('Error deleting payment link:', err);
      alert('Failed to delete payment link.');
    }
  };

  const handleExportToExcel = () => {
    if (paymentLinks.length === 0) {
      alert('No payment links to export');
      return;
    }

    setExportLoading(true);

    try {
      // Prepare data with proper formatting
      const worksheetData = paymentLinks.map(link => ({
        'Client Name': link.clientName,
        'Client Email': link.clientEmail || '-',
        'Package Name': link.packageName,
        'Package Description': link.packageDescription || '-',
        'Package Price': parseFloat(link.packagePrice || 0).toFixed(2),
        'Additional Amount': parseFloat(link.additionalAmount || 0).toFixed(2),
        'Additional Description': link.additionalDescription || '-',
        'Total Amount': parseFloat(link.total || 0).toFixed(2),
        'Status': link.status,
        'Paid At': link.paidAt ? new Date(link.paidAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-',
        'Created At': link.createdAt ? new Date(link.createdAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '',
        'Expires At': link.expiresAt ? new Date(link.expiresAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-',
        'Link ID': link.linkId
      }));

      // Add summary row
      const totalAmount = paymentLinks.reduce((sum, link) => sum + parseFloat(link.total || 0), 0);
      const totalCount = paymentLinks.length;
      const paidCount = paymentLinks.filter(link => link.status === 'Paid').length;
      const pendingCount = paymentLinks.filter(link => link.status === 'Pending').length;
      const expiredCount = paymentLinks.filter(link => link.status === 'Expired').length;

      const summaryRow = {
        'Client Name': '',
        'Client Email': '',
        'Package Name': 'SUMMARY',
        'Package Description': '',
        'Package Price': '',
        'Additional Amount': '',
        'Additional Description': '',
        'Total Amount': totalAmount.toFixed(2),
        'Status': `Total: ${totalCount} | Paid: ${paidCount} | Pending: ${pendingCount} | Expired: ${expiredCount}`,
        'Paid At': '',
        'Created At': '',
        'Expires At': '',
        'Link ID': ''
      };
      worksheetData.push(summaryRow);

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Auto-size columns
      const maxWidth = 50;
      const colWidths = [];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        let maxLength = 10;
        for (let R = range.s.r; R <= range.e.r; ++R) {
          const cellAddress = XLSX.utils.encode_cell({ c: C, r: R });
          const cell = worksheet[cellAddress];
          if (cell && cell.v) {
            const cellLength = cell.v.toString().length;
            if (cellLength > maxLength) {
              maxLength = cellLength;
            }
          }
        }
        colWidths.push({ wch: Math.min(maxLength + 2, maxWidth) });
      }
      worksheet['!cols'] = colWidths;

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Links');

      // Generate filename with filter info
      let filename = 'Payment_Links';
      if (filterType === 'month') {
        const monthName = months.find(m => m.value === selectedMonth)?.label || selectedMonth;
        filename += `_${monthName}_${selectedYear}`;
      } else if (filterType === 'date' && startDate && endDate) {
        filename += `_${startDate}_to_${endDate}`;
      }
      filename += '.xlsx';

      XLSX.writeFile(workbook, filename);
    } catch (err) {
      console.error('Error exporting to Excel:', err);
      alert('Failed to export to Excel');
    } finally {
      setExportLoading(false);
    }
  };

  const CATEGORY_OPTIONS = [
    'Website Development',
    'E-commerce',
    'Logo Design',
    'Branding',
    'Motion Graphics',
    'Copy Writing',
    'App Development',
    'Illustration'
  ];

  return (
    <div style={{ padding: 24 }}>
      <h2 style={{ color: colors.text }}>Payment Generator</h2>

      {/* Payment Generator Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.cardBg, borderRadius: 20, padding: '48px 56px', minWidth: 480, maxWidth: 700, boxShadow: colors.cardShadow }}>
            <h2 style={{ marginBottom: 32, fontWeight: 800, color: colors.text, fontSize: 28 }}>{editingLink ? 'Edit Payment Link' : 'Create Payment Link'}</h2>
            <form onSubmit={handleGenerateLink}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, color: colors.text }}>Package Type</label><br />
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}>
                  <option value="standard">Standard Package</option>
                  <option value="custom">Custom Package</option>
                </select>
              </div>
              {selectedType === 'standard' ? (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 700, color: colors.text }}>Select Package</label><br />
                  <select 
                    value={selectedPackageId} 
                    onChange={e => {
                      setSelectedPackageId(e.target.value);
                      // Auto-fill price when package is selected
                      if (e.target.value) {
                        const pkg = packages.find(p => p._id === e.target.value);
                        if (pkg) {
                          setPackagePrice(pkg.price.toString());
                        }
                      } else {
                        setPackagePrice('');
                      }
                    }} 
                    style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}
                  >
                    <option value="">-- Select --</option>
                    {CATEGORY_OPTIONS.map(cat => (
                      <optgroup key={cat} label={cat}>
                        {packages.filter(p => p.category === cat).map(pkg => (
                          <option key={pkg._id} value={pkg._id}>{pkg.name} (${pkg.price})</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 700, color: colors.text }}>Select Custom Package</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select 
                      value={selectedPackageId} 
                      onChange={e => {
                        setSelectedPackageId(e.target.value);
                        // Auto-fill price when package is selected
                        if (e.target.value) {
                          const pkg = customPackages.find(p => p._id === e.target.value);
                          if (pkg) {
                            setPackagePrice(pkg.price.toString());
                          }
                        } else {
                          setPackagePrice('');
                        }
                      }} 
                      style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}
                    >
                      <option value="">-- Select --</option>
                      {customPackages.map(pkg => (
                        <option key={pkg._id} value={pkg._id}>{pkg.name} (${pkg.price})</option>
                      ))}
                    </select>
                    <button type="button" onClick={() => setShowCustomModal(true)} style={{ padding: '8px 16px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700 }}>+ New</button>
                  </div>
                </div>
              )}
              {selectedPackageId && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontWeight: 700, color: colors.text }}>Package Price (Editable)</label><br />
                  <input 
                    type="number" 
                    value={packagePrice} 
                    onChange={e => setPackagePrice(e.target.value)} 
                    style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}`, width: '100%' }} 
                    min="0" 
                    step="0.01"
                    placeholder="Enter package price"
                  />
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, color: colors.text }}>Additional Amount</label><br />
                <input type="number" value={additionalAmount} onChange={e => setAdditionalAmount(e.target.value)} style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }} min="0" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, color: colors.text }}>Description for Additional Amount</label><br />
                <input type="text" value={additionalDescription} onChange={e => setAdditionalDescription(e.target.value)} style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }} />
              </div>
              <div style={{ marginBottom: 16, position: 'relative' }}>
                <label style={{ fontWeight: 700, color: colors.text }}>Client Name</label><br />
                <input
                  type="text"
                  value={clientName}
                  onChange={handleClientNameChange}
                  style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }}
                  required
                  autoComplete="off"
                  onFocus={() => { if (clientOptions.length > 0) setClientDropdownOpen(true); }}
                  onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
                  placeholder="Search and select client..."
                  readOnly={false}
                />
                {clientSearchLoading && <div style={{ position: 'absolute', top: 38, left: 0, color: colors.muted, fontSize: 14 }}>Searching...</div>}
                {clientDropdownOpen && clientOptions.length > 0 && (
                  <div style={{ position: 'absolute', top: 38, left: 0, right: 0, background: colors.cardBg, border: `1px solid ${colors.border}`, borderRadius: 6, zIndex: 10, maxHeight: 180, overflowY: 'auto' }}>
                    {clientOptions.map(client => (
                      <div
                        key={client._id}
                        onMouseDown={() => handleClientSelect(client)}
                        style={{ padding: 8, cursor: 'pointer', borderBottom: `1px solid ${colors.border}` }}
                      >
                        {client.name} ({client.email})
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* <div style={{ marginBottom: 16 }}>
                <label style={{ fontWeight: 700, color: colors.text }}>Client Email</label><br />
                <input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={{ padding: 8, borderRadius: 6, border: `1px solid ${colors.border}` }} required />
              </div> */}
              {error && <div style={{ color: colors.dangerDark, marginBottom: 12 }}>{error}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => {
                  setShowPaymentModal(false);
                  setEditingLink(null);
                  setSelectedType('standard');
                  setSelectedPackageId('');
                  setPackagePrice('');
                  setAdditionalAmount('');
                  setAdditionalDescription('');
                  setClientName('');
                  setClientEmail('');
                  setClientId('');
                }} style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16, marginRight: 6 }}>Cancel</button>
                <button type="submit" disabled={linkLoading} style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}>{linkLoading ? (editingLink ? 'Updating...' : 'Generating...') : (editingLink ? 'Update' : 'Create')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Package Modal */}
      {showCustomModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: colors.cardBg, borderRadius: 16, padding: 38, minWidth: 360, boxShadow: colors.cardShadow }}>
            <h2 style={{ marginBottom: 24, fontWeight: 800, color: colors.text }}>Add Custom Package</h2>
            <form onSubmit={handleCustomFormSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Name</label>
                <input name="name" value={customForm.name} onChange={handleCustomFormChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Price</label>
                <input name="price" type="number" value={customForm.price} onChange={handleCustomFormChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Category</label>
                <select name="category" value={customForm.category} onChange={handleCustomFormChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }} required>
                  <option value="">-- Select --</option>
                  {CATEGORY_OPTIONS.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom: 22 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Description</label>
                <textarea name="description" value={customForm.description} onChange={handleCustomFormChange} style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight, minHeight: 60 }} />
              </div>
              {customFormError && <div style={{ color: colors.dangerDark, marginBottom: 14, fontWeight: 700 }}>{customFormError}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setShowCustomModal(false)} style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16, marginRight: 6 }}>Cancel</button>
                <button type="submit" disabled={customFormLoading} style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}>{customFormLoading ? 'Saving...' : 'Add'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter Section */}
      <div style={{
        background: colors.cardBg,
        borderRadius: 12,
        padding: '16px 24px',
        marginTop: 24,
        marginBottom: 24,
        border: `1px solid ${colors.border}`,
        boxShadow: colors.cardShadow,
      }}>
        <div style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          width: '100%',
          justifyContent: 'space-between',
        }}>
          {/* Filter Type Buttons */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <label style={{
              fontSize: 14,
              fontWeight: 600,
              color: colors.text,
              whiteSpace: 'nowrap',
              marginRight: 8,
            }}>
              Filter:
            </label>
            <button
              onClick={() => {
                setFilterType('month');
                setStartDate('');
                setEndDate('');
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: filterType === 'month' ? colors.accent : colors.cardBg,
                color: filterType === 'month' ? '#fff' : colors.text,
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Month
            </button>
            <button
              onClick={() => {
                setFilterType('date');
                setSelectedMonth(new Date().getMonth() + 1);
                setSelectedYear(new Date().getFullYear());
              }}
              style={{
                padding: '6px 16px',
                borderRadius: 8,
                border: `1px solid ${colors.border}`,
                fontSize: 14,
                background: filterType === 'date' ? colors.accent : colors.cardBg,
                color: filterType === 'date' ? '#fff' : colors.text,
                cursor: 'pointer',
                fontWeight: 500,
                whiteSpace: 'nowrap',
              }}
            >
              Date Range
            </button>
          </div>

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '32px',
            background: colors.border,
            margin: '0 8px',
          }} />

          {/* Month/Year or Date Range */}
          {filterType === 'month' ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  Month:
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
                    cursor: 'pointer',
                    minWidth: '120px',
                  }}
                >
                  {months.map(month => (
                    <option key={month.value} value={month.value}>{month.label}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  Year:
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
                    cursor: 'pointer',
                    minWidth: '100px',
                  }}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  Start:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
                    cursor: 'pointer',
                    minWidth: '140px',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <label style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: colors.text,
                  whiteSpace: 'nowrap',
                }}>
                  End:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    fontSize: 14,
                    background: colors.cardBg,
                    cursor: 'pointer',
                    minWidth: '140px',
                  }}
                />
              </div>
            </>
          )}

          {/* Divider */}
          <div style={{
            width: '1px',
            height: '32px',
            background: colors.border,
            margin: '0 8px',
          }} />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 12, marginLeft: 'auto', alignItems: 'center' }}>
            <button 
              onClick={handleExportToExcel}
              disabled={exportLoading || paymentLinks.length === 0}
              style={{ 
                padding: '8px 20px', 
                background: exportLoading || paymentLinks.length === 0 ? colors.accentLight : '#10b981', 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 600, 
                fontSize: 14,
                cursor: exportLoading || paymentLinks.length === 0 ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                opacity: exportLoading || paymentLinks.length === 0 ? 0.6 : 1,
              }}
            >
              <FaFileExcel />
              {exportLoading ? 'Exporting...' : 'Export to Excel'}
            </button>
            <button 
              onClick={() => setShowPaymentModal(true)} 
              style={{ 
                padding: '10px 28px', 
                background: colors.accent, 
                color: '#fff', 
                border: 'none', 
                borderRadius: 8, 
                fontWeight: 800, 
                fontSize: 18,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              Create New
            </button>
          </div>
        </div>
      </div>

      {/* Payment Links Table */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ color: colors.text, fontWeight: 700, fontSize: 22, marginBottom: 16 }}>Generated Payment Links</h3>
        <table style={{ width: '100%', background: colors.cardBg, borderRadius: 10, boxShadow: colors.cardShadow }}>
          <thead>
            <tr>
              <th style={{ padding: 10 }}>Client</th>
              <th style={{ padding: 10 }}>Package</th>
              <th style={{ padding: 10 }}>Additional</th>
              <th style={{ padding: 10 }}>Total</th>
              <th style={{ padding: 10 }}>Status</th>
              <th style={{ padding: 10 }}>Paid At</th>
              <th style={{ padding: 10 }}>Expires</th>
              <th style={{ padding: 10 }}>Link</th>
            </tr>
          </thead>
          <tbody>
            {paymentLinks.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', color: colors.muted }}>No payment links generated yet.</td></tr>
            ) : paymentLinks.map(link => (
              <tr 
                key={link.linkId}
                onClick={(e) => {
                  // Don't open link if clicking on action buttons or menu
                  if (e.target.closest('a, span[title], button, [data-menu-container]')) {
                    return;
                  }
                  // Only open link if status is not Paid
                  if (link.status !== 'Paid') {
                    window.open(`/pay/${link.linkId}`, '_blank');
                  }
                }}
                style={{ 
                  cursor: link.status !== 'Paid' ? 'pointer' : 'default',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (link.status !== 'Paid') {
                    e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{ padding: 10 }}>{link.clientName}</td>
                <td style={{ padding: 10 }}>{link.packageName}</td>
                <td style={{ padding: 10 }}>{link.additionalAmount} {link.additionalDescription && `(${link.additionalDescription})`}</td>
                <td style={{ padding: 10 }}><b>${link.total}</b></td>
                <td style={{ padding: 10 }}>{link.status}</td>
                <td style={{ padding: 10 }}>{link.paidAt ? new Date(link.paidAt).toLocaleString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                <td style={{ padding: 10 }}>{link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : '-'}</td>
                <td style={{ padding: 10, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                  <div style={{ position: 'relative', display: 'inline-block' }} data-menu-container>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === link.linkId ? null : link.linkId);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '18px',
                        color: colors.text || '#333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <FaEllipsisV />
                    </button>
                    {openMenuId === link.linkId && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          background: colors.cardBg || '#fff',
                          border: `1px solid ${colors.border || '#ddd'}`,
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          minWidth: '150px',
                          marginTop: '4px',
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {link.status !== 'Paid' && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditLink(link);
                            }}
                            style={{
                              padding: '10px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: colors.text || '#333',
                              borderBottom: `1px solid ${colors.border || '#eee'}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FaEdit style={{ fontSize: '14px' }} />
                            <span>Edit</span>
                          </div>
                        )}
                        {link.status === 'Pending' && (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEmailModal(link);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: colors.text || '#333',
                            borderBottom: link.status === 'Paid' ? 'none' : `1px solid ${colors.border || '#eee'}`,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          <FaEnvelope style={{ fontSize: '14px' }} />
                            <span>Invoice</span>
                        </div>
                        )}
                        {link.status === 'Paid' && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenPaymentConfirmationModal(link);
                              setOpenMenuId(null);
                            }}
                            style={{
                              padding: '10px 16px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              color: colors.text || '#333',
                              borderBottom: `1px solid ${colors.border || '#eee'}`,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <FaEnvelope style={{ fontSize: '14px' }} />
                            <span>Payment Confirmation</span>
                          </div>
                        )}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePaymentLink(link.linkId);
                            setOpenMenuId(null);
                          }}
                          style={{
                            padding: '10px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: colors.dangerDark || '#dc2626',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.accentLight || 'rgba(0,0,0,0.05)';
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

      {/* Email Modal */}
      {showEmailModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: 16,
            padding: windowWidth < 768 ? '24px' : '38px',
            minWidth: windowWidth < 768 ? '90%' : windowWidth < 1024 ? '600px' : '800px',
            maxWidth: windowWidth < 768 ? '100%' : '1000px',
            width: windowWidth < 768 ? '100%' : 'auto',
            boxShadow: colors.cardShadow,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: 24, fontWeight: 800, color: colors.text }}>Send Payment Link</h2>
            <form onSubmit={handleSendEmail}>
              <input type="hidden" name="name" value={emailForm.name} />
              <input type="hidden" name="package" value={emailForm.package} />
              <input type="hidden" name="total" value={emailForm.total} />
              <input type="hidden" name="link" value={emailForm.link} />
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Recipient Email</label>
                <input
                  name="to_email"
                  type="email"
                  value={emailForm.to_email}
                  onChange={handleEmailFormChange}
                  style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                  required
                />
              </div>
              {/* HTML Invoice Preview */}
              {emailForm.htmlMessage && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Email Preview (This is what the client will see)</label>
                  <div
                    style={{
                      width: '100%',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 7,
                      overflow: 'hidden',
                      background: '#f5f5f5',
                      padding: '20px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '600px',
                        background: '#fff',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <iframe
                        srcDoc={emailForm.htmlMessage}
                        style={{
                          width: '100%',
                          border: 'none',
                          minHeight: '600px',
                          background: '#fff',
                          display: 'block'
                        }}
                        title="Email Preview"
                        onLoad={(e) => {
                          // Try to adjust iframe height to content
                          try {
                            const iframe = e.target;
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            if (iframeDoc && iframeDoc.body) {
                              iframe.style.height = iframeDoc.body.scrollHeight + 'px';
                            }
                          } catch (err) {
                            // Cross-origin or other error, use default height
                            console.log('Could not adjust iframe height:', err);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Message (Plain Text - Fallback for email clients that don't support HTML)</label>
                <textarea
                  name="message"
                  value={emailForm.message}
                  onChange={handleEmailFormChange}
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 7,
                    border: `1px solid ${colors.border}`,
                    fontSize: 16,
                    background: colors.accentLight,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                />
              </div>
              {emailStatus && <div style={{ color: emailStatus.includes('success') ? colors.sidebarActive : colors.dangerDark, marginBottom: 14, fontWeight: 700 }}>{emailStatus}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setShowEmailModal(false)} style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16, marginRight: 6 }}>Cancel</button>
                <button type="submit" disabled={emailLoading} style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}>{emailLoading ? 'Sending...' : 'Send Email'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Payment Confirmation Email Modal */}
      {showPaymentConfirmationModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{
            background: colors.cardBg,
            borderRadius: 16,
            padding: windowWidth < 768 ? '24px' : '38px',
            minWidth: windowWidth < 768 ? '90%' : windowWidth < 1024 ? '600px' : '800px',
            maxWidth: windowWidth < 768 ? '100%' : '1000px',
            width: windowWidth < 768 ? '100%' : 'auto',
            boxShadow: colors.cardShadow,
            maxHeight: '90vh',
            overflowY: 'auto'
          }}>
            <h2 style={{ marginBottom: 24, fontWeight: 800, color: colors.text }}>Send Payment Confirmation</h2>
            <form onSubmit={handleSendPaymentConfirmation}>
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Recipient Email</label>
                <input
                  name="to_email"
                  type="email"
                  value={paymentConfirmationForm.to_email}
                  onChange={handlePaymentConfirmationFormChange}
                  style={{ width: '100%', padding: 10, borderRadius: 7, border: `1px solid ${colors.border}`, fontSize: 16, background: colors.accentLight }}
                  required
                />
              </div>
              {/* HTML Payment Confirmation Preview */}
              {paymentConfirmationForm.htmlMessage && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Email Preview (This is what the client will see)</label>
                  <div
                    style={{
                      width: '100%',
                      border: `1px solid ${colors.border}`,
                      borderRadius: 7,
                      overflow: 'hidden',
                      background: '#f5f5f5',
                      padding: '20px',
                      boxSizing: 'border-box',
                      display: 'flex',
                      justifyContent: 'center'
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '600px',
                        background: '#fff',
                        borderRadius: '5px',
                        overflow: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    >
                      <iframe
                        srcDoc={paymentConfirmationForm.htmlMessage}
                        style={{
                          width: '100%',
                          border: 'none',
                          minHeight: '600px',
                          background: '#fff',
                          display: 'block'
                        }}
                        title="Payment Confirmation Email Preview"
                        onLoad={(e) => {
                          // Try to adjust iframe height to content
                          try {
                            const iframe = e.target;
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            if (iframeDoc && iframeDoc.body) {
                              iframe.style.height = iframeDoc.body.scrollHeight + 'px';
                            }
                          } catch (err) {
                            // Cross-origin or other error, use default height
                            console.log('Could not adjust iframe height:', err);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', fontWeight: 700, marginBottom: 6, color: colors.text }}>Message (Plain Text - Fallback for email clients that don't support HTML)</label>
                <textarea
                  name="message"
                  value={paymentConfirmationForm.message}
                  onChange={handlePaymentConfirmationFormChange}
                  rows={12}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 7,
                    border: `1px solid ${colors.border}`,
                    fontSize: 16,
                    background: colors.accentLight,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    boxSizing: 'border-box',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}
                />
              </div>
              {paymentConfirmationStatus && <div style={{ color: paymentConfirmationStatus.includes('success') ? colors.sidebarActive : colors.dangerDark, marginBottom: 14, fontWeight: 700 }}>{paymentConfirmationStatus}</div>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                <button type="button" onClick={() => setShowPaymentConfirmationModal(false)} style={{ padding: '10px 22px', background: colors.accentLight, color: colors.text, border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16, marginRight: 6 }}>Cancel</button>
                <button type="submit" disabled={paymentConfirmationLoading} style={{ padding: '10px 22px', background: colors.accent, color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 16 }}>{paymentConfirmationLoading ? 'Sending...' : 'Send Confirmation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentGeneratorPage; 