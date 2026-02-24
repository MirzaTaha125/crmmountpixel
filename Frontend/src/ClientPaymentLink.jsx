import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import getApiBaseUrl from './apiBase';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { theme } from './theme';
import { FaCheckCircle, FaExclamationCircle, FaSpinner, FaCreditCard, FaDollarSign } from 'react-icons/fa';

function ClientPaymentLink() {
  const { paymentId } = useParams();
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [paypalError, setPaypalError] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const API_URL = getApiBaseUrl();

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 768;
  const isTablet = windowWidth > 768 && windowWidth <= 1024;
  const isSmallMobile = windowWidth <= 480;

  // Brand configuration with colors
  const getBrandConfig = (brand) => {
    const brandConfigs = {
      'Webdevelopers Inc': {
        name: 'Webdevelopers Inc',
        logo: '/webdevelopersinc.webp',
        primaryColor: '#073536', // Dark teal
        secondaryColor: '#E3FF91', // Light green/yellow
        textColor: '#E3FF91',
      
        bgGradient: '#FFF',
        cardBg: 'rgba(7, 53, 54, 0.95)',
        accentColor: '#E3FF91',
        borderColor: 'rgba(227, 255, 145, 0.2)',
        shadowColor: 'rgba(227, 255, 145, 0.3)'
      },
      'American Design Eagle': {
        name: 'American Design Eagle',
        logo: '/main_logo.webp',
        primaryColor: '#CA0F38', // Red
        secondaryColor: '#FFFFFF', // White
        textColor: '#FFFFFF',
        bgGradient: '#FFF',
        cardBg: '#CA0F38', // White background for the card with slight transparency
        accentColor: '#FFFFFF',
        borderColor: 'rgba(202, 15, 56, 0.2)',
        shadowColor: 'rgba(202, 15, 56, 0.4)'
      },
      'Mount Pixels': {
        name: 'Mount Pixels',
        logo: '/mountpixels.webp',
        primaryColor: '#EF275A', // Pink/Red
        secondaryColor: '#FFFFFF', // White
        textColor: '#FFFFFF',
      
        bgGradient: '#FFF',
        cardBg: 'rgba(239, 39, 90, 0.95)',
        accentColor: '#FFFFFF',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        shadowColor: 'rgba(255, 255, 255, 0.3)'
      }
    };
    return brandConfigs[brand] || {
      name: 'Payment Portal',
      logo: '/main_logo.webp',
      primaryColor: theme.colors.primary,
      secondaryColor: theme.colors.white,
      textColor: theme.colors.primaryLight,
      bgGradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      cardBg: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.98) 100%)',
      accentColor: theme.colors.primaryLight,
      borderColor: 'rgba(255, 255, 255, 0.1)',
      shadowColor: 'rgba(99, 102, 241, 0.3)'
    };
  };

  const brandConfig = payment ? getBrandConfig(payment.brand) : null;

  useEffect(() => {
    fetchPaymentDetails();
    // eslint-disable-next-line
  }, [paymentId]);

  const fetchPaymentDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.get(`${API_URL}/api/payment-links/${paymentId}`);
      setPayment(res.data);
    } catch (err) {
      setError('Payment link not found or expired');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: brandConfig ? brandConfig.bgGradient : 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
      color: brandConfig ? brandConfig.textColor : theme.colors.white,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: theme.typography.fontFamily,
      padding: isSmallMobile ? theme.spacing.sm : isMobile ? theme.spacing.md : theme.spacing.lg,
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Animated background elements */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        background: brandConfig 
          ? `radial-gradient(circle, ${brandConfig.primaryColor}20 0%, transparent 70%)`
          : 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
        animation: 'pulse 8s ease-in-out infinite',
      }} />
      
      <div style={{
        background: brandConfig ? brandConfig.cardBg : 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(51, 65, 85, 0.98) 100%)',
        backdropFilter: 'blur(20px)',
        borderRadius: isMobile ? theme.radius.xl : theme.radius['2xl'],
        padding: isSmallMobile ? theme.spacing.md : isMobile ? theme.spacing.lg : isTablet ? theme.spacing.xl : theme.spacing['3xl'],
        minWidth: isMobile ? '100%' : isTablet ? '600px' : '800px',
        maxWidth: isMobile ? '100%' : isTablet ? '900px' : '1200px',
        width: '100%',
        boxShadow: brandConfig 
          ? `0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px ${brandConfig.borderColor}`
          : '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: isMobile ? 'column' : (payment?.status === 'Paid' ? 'column' : 'row'),
        alignItems: payment?.status === 'Paid' ? 'center' : 'stretch',
        justifyContent: payment?.status === 'Paid' ? 'center' : 'flex-start',
        gap: isMobile ? theme.spacing.lg : theme.spacing['2xl'],
        position: 'relative',
        zIndex: 1,
        border: brandConfig ? `1px solid ${brandConfig.borderColor}` : `1px solid rgba(255, 255, 255, 0.1)`,
        minHeight: payment?.status === 'Paid' ? '60vh' : 'auto',
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.lg,
            padding: theme.spacing['2xl'],
          }}>
            <FaSpinner style={{
              fontSize: isMobile ? '36px' : '48px',
              color: theme.colors.primary,
              animation: 'spin 1s linear infinite',
            }} />
            <p style={{
              fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.xl,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.textInverse,
              margin: 0,
              textAlign: 'center',
            }}>
              Loading payment details...
            </p>
          </div>
        ) : error ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.md,
            padding: theme.spacing.xl,
            textAlign: 'center',
          }}>
            <div style={{
              width: isMobile ? '60px' : '80px',
              height: isMobile ? '60px' : '80px',
              borderRadius: theme.radius.full,
              background: `${theme.colors.error}20`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
            }}>
              <FaExclamationCircle style={{
                fontSize: isMobile ? '30px' : '40px',
                color: theme.colors.error,
              }} />
            </div>
            <p style={{
              color: theme.colors.error,
              fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.xl,
              fontWeight: theme.typography.fontWeights.bold,
              margin: 0,
              textAlign: 'center',
            }}>
              {error}
            </p>
            <p style={{
              color: theme.colors.textTertiary,
              fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
              margin: `${theme.spacing.sm} 0 0 0`,
              textAlign: 'center',
            }}>
              Please check your payment link or contact support.
            </p>
          </div>
        ) : payment?.status === 'Paid' ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: theme.spacing.lg,
            padding: theme.spacing['2xl'],
            textAlign: 'center',
            width: '100%',
            minHeight: '70vh',
            margin: 'auto',
          }}>
            <div style={{
              width: isMobile ? '80px' : '100px',
              height: isMobile ? '80px' : '100px',
              borderRadius: theme.radius.full,
              background: `linear-gradient(135deg, ${theme.colors.success}20, ${theme.colors.success}40)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
              boxShadow: `0 0 40px ${theme.colors.success}40`,
              animation: 'scaleIn 0.5s ease-out',
            }}>
              <FaCheckCircle style={{
                fontSize: isMobile ? '48px' : '60px',
                color: theme.colors.success,
              }} />
            </div>
            <h2 style={{
              color: theme.colors.success,
              fontWeight: theme.typography.fontWeights.bold,
              fontSize: isMobile ? theme.typography.fontSizes.xl : isTablet ? theme.typography.fontSizes['2xl'] : theme.typography.fontSizes['3xl'],
              margin: 0,
              lineHeight: theme.typography.lineHeights.tight,
              textAlign: 'center',
            }}>
              Already Paid
            </h2>
            <p style={{
              color: theme.colors.textInverse,
              fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.lg,
              fontWeight: theme.typography.fontWeights.medium,
              margin: 0,
              opacity: 0.9,
              textAlign: 'center',
            }}>
              This payment has already been completed.
            </p>
            <div style={{
              marginTop: theme.spacing.lg,
              padding: isMobile ? theme.spacing.md : theme.spacing.lg,
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.success}30`,
              width: '100%',
            }}>
              <p style={{
                color: theme.colors.textInverse,
                fontSize: isMobile ? theme.typography.fontSizes.xs : theme.typography.fontSizes.sm,
                margin: 0,
                opacity: 0.8,
                textAlign: 'center',
              }}>
                Thank you for your payment. If you have any questions, please contact support.
              </p>
            </div>
          </div>
        ) : success ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: theme.spacing.lg,
            padding: theme.spacing['2xl'],
            textAlign: 'center',
          }}>
            <div style={{
              width: isMobile ? '80px' : '100px',
              height: isMobile ? '80px' : '100px',
              borderRadius: theme.radius.full,
              background: `linear-gradient(135deg, ${theme.colors.success}20, ${theme.colors.success}40)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: theme.spacing.md,
              boxShadow: `0 0 40px ${theme.colors.success}40`,
              animation: 'scaleIn 0.5s ease-out',
            }}>
              <FaCheckCircle style={{
                fontSize: isMobile ? '48px' : '60px',
                color: theme.colors.success,
              }} />
            </div>
            <h2 style={{
              color: theme.colors.success,
              fontWeight: theme.typography.fontWeights.bold,
              fontSize: isMobile ? theme.typography.fontSizes.xl : isTablet ? theme.typography.fontSizes['2xl'] : theme.typography.fontSizes['3xl'],
              margin: 0,
              lineHeight: theme.typography.lineHeights.tight,
              textAlign: 'center',
            }}>
              Payment Successful!
            </h2>
            <p style={{
              color: theme.colors.textInverse,
              fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.lg,
              fontWeight: theme.typography.fontWeights.medium,
              margin: 0,
              opacity: 0.9,
              textAlign: 'center',
            }}>
              Thank you for your payment.
            </p>
            <div style={{
              marginTop: theme.spacing.lg,
              padding: isMobile ? theme.spacing.md : theme.spacing.lg,
              background: 'rgba(16, 185, 129, 0.1)',
              borderRadius: theme.radius.lg,
              border: `1px solid ${theme.colors.success}30`,
              width: '100%',
            }}>
              <p style={{
                color: theme.colors.textInverse,
                fontSize: isMobile ? theme.typography.fontSizes.xs : theme.typography.fontSizes.sm,
                margin: 0,
                opacity: 0.8,
                textAlign: 'center',
              }}>
                A confirmation email has been sent to your registered email address.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Left Column - Payment Details */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              minWidth: 0,
            }}>
              {/* Header */}
              <div style={{
              marginBottom: theme.spacing['2xl'],
              width: '100%',
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                marginBottom: isMobile ? theme.spacing.md : theme.spacing.lg,
              }}>
                {brandConfig && (
                  <img 
                    src={brandConfig.logo} 
                    alt={brandConfig.name}
                    style={{
                      width: isMobile ? '56px' : '150px',
                      height: isMobile ? '56px' : '150px',
                      borderRadius: theme.radius.xl,
                      objectFit: 'contain',
                      padding: theme.spacing.xs,
                      // background: 'rgba(245, 245, 245, 0.36)',
                    }}
                  />
                )}
                {!brandConfig && (
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: isMobile ? '56px' : '72px',
                    height: isMobile ? '56px' : '72px',
                    borderRadius: theme.radius.xl,
                    background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
                    boxShadow: `0 8px 24px ${theme.colors.primary}30`,
                  }}>
                    <FaCreditCard style={{
                      fontSize: isMobile ? '28px' : '36px',
                      color: theme.colors.white,
                    }} />
                  </div>
                )}
              </div>
              <h1 style={{
                color: brandConfig ? brandConfig.textColor : theme.colors.white,
                fontWeight: theme.typography.fontWeights.bold,
                fontSize: isSmallMobile ? theme.typography.fontSizes['2xl'] : isMobile ? theme.typography.fontSizes['3xl'] : theme.typography.fontSizes['4xl'],
                margin: 0,
                letterSpacing: '-0.02em',
                marginBottom: theme.spacing.sm,
                lineHeight: theme.typography.lineHeights.tight,
              }}>
                {brandConfig ? brandConfig.name : 'Payment Portal'}
              </h1>
              <div style={{
                color: brandConfig ? brandConfig.textColor : '#FFFFFF',
                fontWeight: theme.typography.fontWeights.semibold,
                  fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.xl,
                marginTop: theme.spacing.sm,
                  wordBreak: 'break-word',
              }}>
                {payment.packageName}
              </div>
              {payment.packageDescription && (
                <div style={{
                  marginTop: theme.spacing.sm,
                }}>
                  <div style={{
                    color: brandConfig ? brandConfig.textColor : '#FFFFFF',
                    fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.normal,
                    lineHeight: theme.typography.lineHeights.relaxed,
                    wordBreak: 'break-word',
                  }}>
                    {showFullDescription 
                      ? payment.packageDescription 
                      : payment.packageDescription.length > 100 
                        ? `${payment.packageDescription.substring(0, 100)}...` 
                        : payment.packageDescription
                    }
                  </div>
                  {payment.packageDescription.length > 100 && (
                    <button
                      onClick={() => setShowFullDescription(!showFullDescription)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: brandConfig ? brandConfig.accentColor : theme.colors.primaryLight,
                        fontSize: isMobile ? theme.typography.fontSizes.xs : theme.typography.fontSizes.sm,
                        fontWeight: theme.typography.fontWeights.semibold,
                        cursor: 'pointer',
                        padding: `${theme.spacing.xs} 0`,
                        marginTop: theme.spacing.xs,
                        textDecoration: 'underline',
                        transition: 'opacity 0.2s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      {showFullDescription ? 'Show Less' : 'Show More'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Payment Summary Card */}
            <div style={{
              width: '100%',
              background: '#FFFFFF',
              borderRadius: theme.radius.xl,
                padding: isSmallMobile ? theme.spacing.md : isMobile ? theme.spacing.lg : theme.spacing.xl,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              border: brandConfig ? `1px solid ${brandConfig.primaryColor}20` : `1px solid rgba(0, 0, 0, 0.1)`,
              display: 'flex',
              flexDirection: 'column',
                gap: isMobile ? theme.spacing.sm : theme.spacing.md,
                flex: 1,
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                paddingBottom: theme.spacing.md,
                borderBottom: brandConfig ? `1px solid ${brandConfig.primaryColor}20` : `1px solid rgba(0, 0, 0, 0.1)`,
              }}>
                <div style={{
                    width: isMobile ? '32px' : '40px',
                    height: isMobile ? '32px' : '40px',
                  borderRadius: theme.radius.md,
                  background: brandConfig 
                    ? `linear-gradient(135deg, ${brandConfig.primaryColor}20, ${brandConfig.primaryColor}30)`
                    : `linear-gradient(135deg, ${theme.colors.primary}20, ${theme.colors.primary}30)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                    flexShrink: 0,
                }}>
                  <FaDollarSign style={{
                      fontSize: isMobile ? '16px' : '20px',
                    color: brandConfig ? brandConfig.primaryColor : theme.colors.primary,
                  }} />
                </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                      fontSize: isMobile ? theme.typography.fontSizes['2xs'] || '0.625rem' : theme.typography.fontSizes.xs,
                    color: '#666666',
                    fontWeight: theme.typography.fontWeights.medium,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}>
                    Client Name
                  </div>
                  <div style={{
                      fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.lg,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: '#000000',
                    marginTop: '2px',
                      wordBreak: 'break-word',
                      overflowWrap: 'break-word',
                  }}>
                    {payment.clientName}
                  </div>
                </div>
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${theme.spacing.sm} 0`,
                  flexWrap: 'wrap',
                  gap: theme.spacing.xs,
              }}>
                <span style={{
                  color: '#666666',
                    fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                  fontWeight: theme.typography.fontWeights.medium,
                }}>
                  Package Price:
                </span>
                <span style={{
                  color: '#000000',
                    fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                  fontWeight: theme.typography.fontWeights.semibold,
                }}>
                  ${payment.packagePrice}
                </span>
              </div>

              {payment.additionalAmount > 0 && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: `${theme.spacing.sm} 0`,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      color: '#666666',
                      fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                      fontWeight: theme.typography.fontWeights.medium,
                    }}>
                      Additional:
                    </span>
                    {payment.additionalDescription && (
                      <span style={{
                        color: '#999999',
                        fontSize: isMobile ? theme.typography.fontSizes.xs : theme.typography.fontSizes.sm,
                        marginLeft: theme.spacing.xs,
                        fontStyle: 'italic',
                        display: 'block',
                        wordBreak: 'break-word',
                      }}>
                        ({payment.additionalDescription})
                      </span>
                    )}
                  </div>
                  <span style={{
                    color: '#000000',
                    fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.semibold,
                    flexShrink: 0,
                    marginLeft: theme.spacing.sm,
                  }}>
                    ${payment.additionalAmount}
                  </span>
                </div>
              )}

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${theme.spacing.md} 0 0 0`,
                marginTop: theme.spacing.sm,
                borderTop: brandConfig 
                  ? `2px solid ${brandConfig.primaryColor}30`
                  : `2px solid rgba(99, 102, 241, 0.3)`,
                  flexWrap: 'wrap',
                  gap: theme.spacing.xs,
              }}>
                <span style={{
                  color: brandConfig ? brandConfig.primaryColor : theme.colors.primary,
                    fontSize: isMobile ? theme.typography.fontSizes.base : theme.typography.fontSizes.lg,
                  fontWeight: theme.typography.fontWeights.bold,
                }}>
                  Total Amount:
                </span>
                <span style={{
                    fontSize: isMobile ? theme.typography.fontSizes.xl : theme.typography.fontSizes['2xl'],
                  fontWeight: theme.typography.fontWeights.bold,
                  color: brandConfig ? brandConfig.primaryColor : theme.colors.primary,
                  letterSpacing: '0.02em',
                }}>
                  ${payment.total}
                </span>
                </div>
              </div>
            </div>

            {/* Right Column - PayPal Payment */}
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'stretch',
              minWidth: 0,
            }}>
              <div style={{
                background: brandConfig ? `rgba(${brandConfig.primaryColor === '#073536' ? '7, 53, 54' : brandConfig.primaryColor === '#CA0F38' ? '202, 15, 56' : '239, 39, 90'}, 0.6)` : 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(10px)',
                borderRadius: theme.radius.xl,
                padding: isSmallMobile ? theme.spacing.md : isMobile ? theme.spacing.lg : theme.spacing['2xl'],
                boxShadow: brandConfig 
                  ? `0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 ${brandConfig.borderColor}`
                  : '0 4px 20px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                border: brandConfig ? `1px solid ${brandConfig.borderColor}` : `1px solid rgba(255, 255, 255, 0.1)`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                height: 'fit-content',
              }}>
                <div style={{
                  marginBottom: isMobile ? theme.spacing.lg : theme.spacing.xl,
                  textAlign: 'center',
                }}>
                  <h2 style={{
                    color: brandConfig ? brandConfig.textColor : theme.colors.white,
                    fontWeight: theme.typography.fontWeights.bold,
                    fontSize: isSmallMobile ? theme.typography.fontSizes.base : isMobile ? theme.typography.fontSizes.xl : theme.typography.fontSizes['2xl'],
                    margin: 0,
                    marginBottom: theme.spacing.sm,
                  }}>
                    Complete Payment
                  </h2>
                  <p style={{
                    color: brandConfig ? `${brandConfig.textColor}CC` : 'rgba(255, 255, 255, 0.7)',
                    fontSize: isMobile ? theme.typography.fontSizes.xs : theme.typography.fontSizes.sm,
                fontWeight: theme.typography.fontWeights.medium,
                    margin: 0,
              }}>
                Secure payment powered by PayPal
                  </p>
              </div>
              <div style={{
                borderRadius: theme.radius.lg,
                overflow: 'hidden',
                background: 'rgba(255, 255, 255, 0.05)',
                  padding: isMobile ? theme.spacing.md : theme.spacing.lg,
                  width: '100%',
              }}>
                {paypalError ? (
                  <div style={{
                    padding: theme.spacing.lg,
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: theme.radius.md,
                    border: `1px solid rgba(239, 68, 68, 0.3)`,
                    textAlign: 'center',
                  }}>
                    <FaExclamationCircle style={{
                      fontSize: isMobile ? '24px' : '32px',
                      color: theme.colors.error,
                      marginBottom: theme.spacing.sm,
                    }} />
                    <p style={{
                      color: theme.colors.error,
                      fontSize: isMobile ? theme.typography.fontSizes.sm : theme.typography.fontSizes.base,
                      margin: 0,
                      marginBottom: theme.spacing.xs,
                      fontWeight: theme.typography.fontWeights.semibold,
                    }}>
                      PayPal Payment Unavailable
                    </p>
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: isMobile ? theme.typography.fontSizes.xs : theme.typography.fontSizes.sm,
                      margin: 0,
                      marginBottom: theme.spacing.md,
                    }}>
                      Please use the "Complete Payment (Test)" button below to proceed with your payment.
                    </p>
                  </div>
                ) : (
                  <PayPalScriptProvider 
                    options={{ 
                      'client-id': 'AedpuqKn9fKTF4VBBiQxp_R0eI2ejZUVcuYzLsxRw8KNIXuT960lA82HFIyuaQiXeV75AvtsccDogAqQ',
                      currency: 'USD',
                      intent: 'capture',
                      components: 'buttons',
                    }}
                    onLoadStart={() => setPaypalError(false)}
                    onLoadError={(err) => {
                      console.error('PayPal SDK load error:', err);
                      setPaypalError(true);
                    }}
                  >
                    <PayPalButtons
                      style={{
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'rect',
                        label: 'pay',
                        height: 48
                      }}
                      createOrder={(data, actions) => {
                        return actions.order.create({
                          purchase_units: [
                            {
                              amount: {
                                value: payment.total.toString(),
                              },
                              description: payment.packageName,
                            },
                          ],
                        });
                      }}
                      onApprove={async (data, actions) => {
                        try {
                          const order = await actions.order.capture();
                          // Update payment link status to 'Paid' and PaymentHistory to 'Completed'
                          await axios.post(`${API_URL}/api/payment-links/${paymentId}/complete`);
                          setSuccess(true);
                        } catch (err) {
                          console.error('Payment completion error:', err);
                          setError('Payment processed but failed to update status. Please contact support.');
                        }
                      }}
                      onError={(err) => {
                        console.error('PayPal payment error:', err);
                        setError('Payment failed. Please try again.');
                      }}
                    />
                  </PayPalScriptProvider>
                )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        @keyframes scaleIn {
          from { transform: scale(0); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ClientPaymentLink; 