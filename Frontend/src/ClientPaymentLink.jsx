import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import getApiBaseUrl from './apiBase';
import { theme } from './theme';
import {
  FaCheckCircle, FaExclamationCircle, FaSpinner,
  FaCreditCard, FaDollarSign, FaFileInvoice,
  FaClock, FaCalendarAlt, FaExternalLinkAlt
} from 'react-icons/fa';

function ClientPaymentLink() {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile    = windowWidth <= 768;
  const isTablet    = windowWidth > 768 && windowWidth <= 1024;
  const isSmallMobile = windowWidth <= 480;

  const getBrandConfig = (brand) => {
    const configs = {
      'Webdevelopers Inc': {
        name: 'Webdevelopers Inc', logo: '/webdevelopersinc.webp',
        primaryColor: '#073536', textColor: '#E3FF91', bgGradient: '#FFF',
        cardBg: 'rgba(7, 53, 54, 0.95)', accentColor: '#E3FF91',
        borderColor: 'rgba(227, 255, 145, 0.2)',
      },
      'American Design Eagle': {
        name: 'American Design Eagle', logo: '/main_logo.webp',
        primaryColor: '#CA0F38', textColor: '#FFFFFF', bgGradient: '#FFF',
        cardBg: '#CA0F38', accentColor: '#FFFFFF',
        borderColor: 'rgba(202, 15, 56, 0.2)',
      },
      'Mount Pixels': {
        name: 'Mount Pixels', logo: '/mountpixels.webp',
        primaryColor: '#EF275A', textColor: '#FFFFFF', bgGradient: '#FFF',
        cardBg: 'rgba(239, 39, 90, 0.95)', accentColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.2)',
      },
    };
    return configs[brand] || {
      name: 'Invoice Portal', logo: '/main_logo.webp',
      primaryColor: theme.colors.primary, textColor: theme.colors.primaryLight,
      bgGradient: '#0f172a',
      cardBg: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(51,65,85,0.98) 100%)',
      accentColor: theme.colors.primaryLight,
      borderColor: 'rgba(255,255,255,0.1)',
    };
  };

  const brandConfig = payment ? getBrandConfig(payment.brand) : null;

  useEffect(() => { fetchPaymentDetails(); }, [paymentId]); // eslint-disable-line

  const fetchPaymentDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/payment-links/${paymentId}`);
      setPayment(res.data);
    } catch {
      setError('Invoice not found or link has expired.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => d
    ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

  const paypalStatusLabel = (s) => ({
    SENT:              'Invoice Sent',
    DRAFT:             'Draft',
    PAID:              'Paid via PayPal',
    CANCELLED:         'Cancelled',
    REFUNDED:          'Refunded',
    PARTIALLY_PAID:    'Partially Paid',
    PAYMENT_PENDING:   'Payment Pending',
    MARKED_AS_PAID:    'Marked as Paid',
  }[s] || s || 'Processing');

  const paypalStatusColor = (s) => ({
    PAID: '#10b981', MARKED_AS_PAID: '#10b981',
    SENT: '#3b82f6', PAYMENT_PENDING: '#f59e0b', PARTIALLY_PAID: '#f59e0b',
    DRAFT: '#6b7280', CANCELLED: '#ef4444', REFUNDED: '#ef4444',
  }[s] || '#6b7280');

  const crmStatusColor = (s) => ({
    Paid: '#10b981', Pending: '#f59e0b', Expired: '#ef4444', Failed: '#ef4444',
  }[s] || '#6b7280');

  const crmStatusBg = (s) => ({
    Paid: 'rgba(16,185,129,0.15)', Pending: 'rgba(245,158,11,0.15)',
    Expired: 'rgba(239,68,68,0.15)', Failed: 'rgba(239,68,68,0.15)',
  }[s] || 'rgba(107,114,128,0.15)');

  /* ── shared styles ── */
  const cardPad = isSmallMobile ? theme.spacing.md : isMobile ? theme.spacing.lg : theme.spacing.xl;
  const rgbOf = (hex) => {
    if (hex === '#073536') return '7,53,54';
    if (hex === '#CA0F38') return '202,15,56';
    if (hex === '#EF275A') return '239,39,90';
    return '15,23,42';
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: brandConfig?.bgGradient || '#0f172a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: theme.typography.fontFamily,
      padding: isSmallMobile ? theme.spacing.sm : isMobile ? theme.spacing.md : theme.spacing.lg,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* ambient glow */}
      <div style={{
        position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%',
        background: brandConfig
          ? `radial-gradient(circle, ${brandConfig.primaryColor}20 0%, transparent 70%)`
          : 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)',
        animation: 'pulse 8s ease-in-out infinite',
      }} />

      <div style={{
        background: brandConfig?.cardBg || 'rgba(30,41,59,0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: isMobile ? theme.radius.xl : theme.radius['2xl'],
        padding: isSmallMobile ? theme.spacing.md : isMobile ? theme.spacing.lg : theme.spacing['3xl'],
        width: '100%',
        minWidth: isMobile ? undefined : isTablet ? '600px' : '800px',
        maxWidth: isMobile ? undefined : '1100px',
        boxShadow: `0 20px 60px rgba(0,0,0,0.5)`,
        border: `1px solid ${brandConfig?.borderColor || 'rgba(255,255,255,0.1)'}`,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? theme.spacing.lg : theme.spacing['2xl'],
        position: 'relative', zIndex: 1,
      }}>

        {/* ── LOADING ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.lg, padding: theme.spacing['2xl'], width: '100%' }}>
            <FaSpinner style={{ fontSize: '48px', color: theme.colors.primary, animation: 'spin 1s linear infinite' }} />
            <p style={{ fontSize: theme.typography.fontSizes.lg, color: theme.colors.textInverse, margin: 0 }}>Loading invoice…</p>
          </div>
        )}

        {/* ── ERROR ── */}
        {!loading && error && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: theme.spacing.md, padding: theme.spacing.xl, width: '100%', textAlign: 'center' }}>
            <FaExclamationCircle style={{ fontSize: '40px', color: theme.colors.error }} />
            <p style={{ color: theme.colors.error, fontSize: theme.typography.fontSizes.xl, fontWeight: 700, margin: 0 }}>{error}</p>
            <p style={{ color: theme.colors.textTertiary, fontSize: theme.typography.fontSizes.sm, margin: 0 }}>Please check your invoice link or contact support.</p>
          </div>
        )}

        {/* ── PAID SCREEN ── */}
        {!loading && !error && payment?.status === 'Paid' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.lg, padding: theme.spacing['2xl'], width: '100%', minHeight: '60vh', textAlign: 'center' }}>
            <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 40px rgba(16,185,129,0.4)', animation: 'scaleIn 0.5s ease-out' }}>
              <FaCheckCircle style={{ fontSize: '60px', color: '#10b981' }} />
            </div>
            <h2 style={{ color: '#10b981', fontWeight: 700, fontSize: isMobile ? theme.typography.fontSizes['2xl'] : theme.typography.fontSizes['3xl'], margin: 0 }}>Payment Received</h2>
            <p style={{ color: theme.colors.textInverse, fontSize: theme.typography.fontSizes.lg, margin: 0, opacity: 0.9 }}>This invoice has already been paid. Thank you!</p>
            {payment.invoiceNumber && (
              <p style={{ color: theme.colors.textInverse, fontSize: theme.typography.fontSizes.sm, opacity: 0.6, margin: 0 }}>Invoice #{payment.invoiceNumber}</p>
            )}
            {payment.paidAt && (
              <p style={{ color: theme.colors.textInverse, fontSize: theme.typography.fontSizes.sm, opacity: 0.6, margin: 0 }}>Paid on {formatDate(payment.paidAt)}</p>
            )}
          </div>
        )}

        {/* ── MAIN CONTENT ── */}
        {!loading && !error && payment && payment.status !== 'Paid' && (
          <>
            {/* Left — invoice detail */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              {/* Header */}
              <div style={{ marginBottom: theme.spacing['2xl'] }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.lg }}>
                  {brandConfig ? (
                    <img src={brandConfig.logo} alt={brandConfig.name}
                      style={{ width: isMobile ? '56px' : '130px', height: isMobile ? '56px' : '130px', borderRadius: theme.radius.xl, objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '72px', height: '72px', borderRadius: theme.radius.xl, background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FaCreditCard style={{ fontSize: '36px', color: '#fff' }} />
                    </div>
                  )}
                </div>
                <h1 style={{ color: brandConfig?.textColor || '#fff', fontWeight: 700, fontSize: isMobile ? theme.typography.fontSizes['2xl'] : theme.typography.fontSizes['4xl'], margin: '0 0 8px 0', lineHeight: 1.2 }}>
                  {brandConfig?.name || 'Invoice'}
                </h1>
                <div style={{ color: brandConfig?.textColor || '#fff', fontWeight: 600, fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.xl, wordBreak: 'break-word' }}>
                  {payment.packageName}
                </div>
                {payment.packageDescription && (
                  <div style={{ marginTop: theme.spacing.sm }}>
                    <div style={{ color: brandConfig?.textColor || '#fff', fontSize: theme.typography.fontSizes.sm, lineHeight: 1.7, wordBreak: 'break-word', opacity: 0.85 }}>
                      {showFullDescription || payment.packageDescription.length <= 120
                        ? payment.packageDescription
                        : `${payment.packageDescription.substring(0, 120)}…`}
                    </div>
                    {payment.packageDescription.length > 120 && (
                      <button onClick={() => setShowFullDescription(!showFullDescription)}
                        style={{ background: 'transparent', border: 'none', color: brandConfig?.accentColor || theme.colors.primaryLight, fontSize: theme.typography.fontSizes.xs, fontWeight: 600, cursor: 'pointer', padding: '4px 0', textDecoration: 'underline' }}>
                        {showFullDescription ? 'Show Less' : 'Show More'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Price breakdown (white card) */}
              <div style={{ background: '#fff', borderRadius: theme.radius.xl, padding: cardPad, boxShadow: '0 4px 20px rgba(0,0,0,0.1)', border: `1px solid ${brandConfig?.primaryColor || '#e5e7eb'}20`, display: 'flex', flexDirection: 'column', gap: theme.spacing.md, flex: 1 }}>
                {/* Client */}
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, paddingBottom: theme.spacing.md, borderBottom: `1px solid ${brandConfig?.primaryColor || '#e5e7eb'}20` }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: theme.radius.md, background: `${brandConfig?.primaryColor || theme.colors.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FaDollarSign style={{ color: brandConfig?.primaryColor || theme.colors.primary, fontSize: '18px' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: theme.typography.fontSizes.xs, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Client</div>
                    <div style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 600, color: '#000' }}>{payment.clientName}</div>
                  </div>
                </div>

                {/* Package price */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                  <span style={{ color: '#666', fontSize: theme.typography.fontSizes.base }}>Package Price</span>
                  <span style={{ color: '#000', fontWeight: 600 }}>${parseFloat(payment.packagePrice).toFixed(2)}</span>
                </div>

                {/* Additional */}
                {payment.additionalAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4 }}>
                    <div>
                      <span style={{ color: '#666', fontSize: theme.typography.fontSizes.base }}>Additional</span>
                      {payment.additionalDescription && (
                        <span style={{ color: '#aaa', fontSize: theme.typography.fontSizes.xs, fontStyle: 'italic', display: 'block' }}>({payment.additionalDescription})</span>
                      )}
                    </div>
                    <span style={{ color: '#000', fontWeight: 600 }}>${parseFloat(payment.additionalAmount).toFixed(2)}</span>
                  </div>
                )}

                {/* Total */}
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, paddingTop: theme.spacing.md, marginTop: theme.spacing.sm, borderTop: `2px solid ${brandConfig?.primaryColor || theme.colors.primary}30` }}>
                  <span style={{ color: brandConfig?.primaryColor || theme.colors.primary, fontSize: theme.typography.fontSizes.lg, fontWeight: 700 }}>Total Amount</span>
                  <span style={{ color: brandConfig?.primaryColor || theme.colors.primary, fontSize: theme.typography.fontSizes['2xl'], fontWeight: 700 }}>${parseFloat(payment.total).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Right — PayPal invoice status */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
              <div style={{
                background: `rgba(${rgbOf(brandConfig?.primaryColor)}, 0.6)`,
                backdropFilter: 'blur(10px)',
                borderRadius: theme.radius.xl,
                padding: isSmallMobile ? theme.spacing.md : isMobile ? theme.spacing.lg : theme.spacing['2xl'],
                border: `1px solid ${brandConfig?.borderColor || 'rgba(255,255,255,0.1)'}`,
                display: 'flex', flexDirection: 'column', gap: theme.spacing.lg,
              }}>
                {/* Heading */}
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm, paddingBottom: theme.spacing.md, borderBottom: `1px solid ${brandConfig?.borderColor || 'rgba(255,255,255,0.12)'}` }}>
                  <FaFileInvoice style={{ fontSize: '22px', color: brandConfig?.textColor || '#fff' }} />
                  <h2 style={{ color: brandConfig?.textColor || '#fff', fontWeight: 700, fontSize: theme.typography.fontSizes.xl, margin: 0 }}>Invoice Details</h2>
                </div>

                {/* Invoice # */}
                {payment.invoiceNumber && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: theme.typography.fontSizes.xs, color: `${brandConfig?.textColor || '#fff'}88`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice Number</span>
                    <span style={{ color: brandConfig?.textColor || '#fff', fontWeight: 700, fontSize: theme.typography.fontSizes.base, wordBreak: 'break-all' }}>#{payment.invoiceNumber}</span>
                  </div>
                )}

                {/* CRM Status */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: theme.typography.fontSizes.xs, color: `${brandConfig?.textColor || '#fff'}88`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invoice Status</span>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: crmStatusBg(payment.status), borderRadius: 999, padding: '4px 14px', alignSelf: 'flex-start' }}>
                    {payment.status === 'Pending'
                      ? <FaClock style={{ color: crmStatusColor(payment.status), fontSize: '13px' }} />
                      : <FaExclamationCircle style={{ color: crmStatusColor(payment.status), fontSize: '13px' }} />}
                    <span style={{ color: crmStatusColor(payment.status), fontWeight: 700, fontSize: theme.typography.fontSizes.sm }}>{payment.status}</span>
                  </div>
                </div>

                {/* PayPal Invoice Status */}
                {payment.paypalInvoiceStatus && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: theme.typography.fontSizes.xs, color: `${brandConfig?.textColor || '#fff'}88`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PayPal Status</span>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${paypalStatusColor(payment.paypalInvoiceStatus)}22`, borderRadius: 999, padding: '4px 14px', alignSelf: 'flex-start' }}>
                      <span style={{ color: paypalStatusColor(payment.paypalInvoiceStatus), fontWeight: 700, fontSize: theme.typography.fontSizes.sm }}>{paypalStatusLabel(payment.paypalInvoiceStatus)}</span>
                    </div>
                  </div>
                )}

                {/* Dates */}
                {payment.createdAt && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: theme.typography.fontSizes.xs, color: `${brandConfig?.textColor || '#fff'}88`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Issue Date</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FaCalendarAlt style={{ color: brandConfig?.textColor || '#fff', fontSize: '13px', opacity: 0.7 }} />
                      <span style={{ color: brandConfig?.textColor || '#fff', fontSize: theme.typography.fontSizes.base }}>{formatDate(payment.createdAt)}</span>
                    </div>
                  </div>
                )}
                {payment.expiresAt && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: theme.typography.fontSizes.xs, color: `${brandConfig?.textColor || '#fff'}88`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Due Date</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FaCalendarAlt style={{ color: payment.status === 'Expired' ? '#ef4444' : (brandConfig?.textColor || '#fff'), fontSize: '13px', opacity: 0.7 }} />
                      <span style={{ color: payment.status === 'Expired' ? '#ef4444' : (brandConfig?.textColor || '#fff'), fontSize: theme.typography.fontSizes.base }}>{formatDate(payment.expiresAt)}</span>
                    </div>
                  </div>
                )}

                {/* PayPal "Pay Invoice" button */}
                {payment.paypalInvoiceUrl && payment.status !== 'Expired' && (
                  <a href={payment.paypalInvoiceUrl} target="_blank" rel="noopener noreferrer"
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      background: '#0070ba', color: '#fff',
                      borderRadius: theme.radius.lg, padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                      fontWeight: 700, fontSize: theme.typography.fontSizes.base,
                      textDecoration: 'none', marginTop: theme.spacing.sm,
                      boxShadow: '0 4px 14px rgba(0,112,186,0.4)',
                    }}>
                    <FaExternalLinkAlt style={{ fontSize: '14px' }} />
                    Pay via PayPal Invoice
                  </a>
                )}

                {/* Expired / no PayPal note */}
                {payment.status === 'Expired' ? (
                  <p style={{ color: '#fca5a5', fontSize: theme.typography.fontSizes.sm, margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                    This invoice has expired. Contact your account manager to get a new one issued.
                  </p>
                ) : !payment.paypalInvoiceUrl && (
                  <p style={{ color: `${brandConfig?.textColor || '#fff'}99`, fontSize: theme.typography.fontSizes.sm, margin: 0, textAlign: 'center', lineHeight: 1.6 }}>
                    A PayPal invoice has been sent to your email. Please check your inbox to complete payment.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin    { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse   { 0%,100% { opacity:.4; transform:scale(1); } 50% { opacity:.6; transform:scale(1.05); } }
        @keyframes scaleIn { from { transform:scale(0); opacity:0; } to { transform:scale(1); opacity:1; } }
      `}</style>
    </div>
  );
}

export default ClientPaymentLink;
