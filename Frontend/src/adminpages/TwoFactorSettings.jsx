import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaShieldAlt, FaQrcode, FaKey, FaCheckCircle, FaTimesCircle, FaDownload, FaCopy, FaExclamationTriangle, FaInfoCircle, FaLock, FaUnlock, FaRedo } from 'react-icons/fa';
import { Button } from '../components/Button';
import { Input } from '../components/Input';

function TwoFactorSettings({ colors: colorsProp }) {
  const colors = colorsProp || getColors();
  const API_URL = getApiBaseUrl();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    twoFactorEnabled: false,
    twoFactorVerified: false,
    unusedBackupCodes: 0
  });
  const [setupStep, setSetupStep] = useState('status');
  const [qrCode, setQrCode] = useState('');
  const [manualSecret, setManualSecret] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [permanentBackupCode, setPermanentBackupCode] = useState('');
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [regeneratePassword, setRegeneratePassword] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetch2FAStatus();
  }, []);

  const fetch2FAStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/2fa/status`, { headers: getAuthHeaders() });
      setTwoFactorStatus(res.data);
    } catch (err) {
      console.error('Error fetching 2FA status:', err);
    }
  };

  const handleSetup2FA = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await axios.post(`${API_URL}/api/2fa/setup`, {}, { headers: getAuthHeaders() });
      setQrCode(res.data.qrCode);
      setManualSecret(res.data.manualEntryKey);
      setSetupStep('verify');
    } catch (err) {
      console.error('Error setting up 2FA:', err);
      setError(err.response?.data?.error || 'Failed to setup 2FA. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/2fa/verify-setup`,
        { code: verificationCode },
        { headers: getAuthHeaders() }
      );
      
      setBackupCodes(res.data.backupCodes);
      setPermanentBackupCode(res.data.permanentBackupCode || '');
      setSetupStep('backup-codes');
      setSuccess('2FA enabled successfully!');
      await fetch2FAStatus();
    } catch (err) {
      console.error('Error verifying 2FA setup:', err);
      setError(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!disablePassword) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      await axios.post(
        `${API_URL}/api/2fa/disable`,
        { password: disablePassword },
        { headers: getAuthHeaders() }
      );
      
      setSuccess('2FA disabled successfully');
      setDisablePassword('');
      await fetch2FAStatus();
    } catch (err) {
      console.error('Error disabling 2FA:', err);
      setError(err.response?.data?.error || 'Failed to disable 2FA. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateBackupCodes = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    if (!regeneratePassword) {
      setError('Password is required');
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(
        `${API_URL}/api/2fa/regenerate-backup`,
        { password: regeneratePassword },
        { headers: getAuthHeaders() }
      );
      
      setBackupCodes(res.data.backupCodes);
      setPermanentBackupCode(res.data.permanentBackupCode || '');
      setShowBackupCodes(true);
      setRegeneratePassword('');
      setSuccess('Backup codes regenerated successfully');
      await fetch2FAStatus();
    } catch (err) {
      console.error('Error regenerating backup codes:', err);
      setError(err.response?.data?.error || 'Failed to regenerate backup codes. Please check your password.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const downloadBackupCodes = () => {
    let content = `Backup Codes for 2FA\n\nGenerated: ${new Date().toLocaleString()}\n\n`;
    
    if (permanentBackupCode) {
      content += `PERMANENT BACKUP CODE (Can be used multiple times):\n${permanentBackupCode}\n\n`;
      content += `⚠️ IMPORTANT: Keep this permanent code very secure!\n\n`;
    }
    
    content += `ONE-TIME BACKUP CODES (Each can only be used once):\n${backupCodes.join('\n')}\n\n`;
    content += `Note: Save these codes securely. They will not be shown again.`;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Backup Codes Display Screen
  if (setupStep === 'backup-codes') {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: theme.spacing.lg }}>
        {/* Success Banner */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.success}15 0%, ${colors.success}05 100%)`,
          border: `2px solid ${colors.success}`,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing['2xl'],
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 8px 24px ${colors.success}20`
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: colors.success,
            opacity: 0.1,
            borderRadius: '50%'
          }} />
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.md,
            position: 'relative',
            zIndex: 1
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: theme.radius.xl,
              background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.success}dd 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `0 4px 12px ${colors.success}40`
            }}>
              <FaCheckCircle style={{ color: colors.white, fontSize: '28px' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, marginBottom: theme.spacing.xs, color: colors.success, fontSize: theme.typography.fontSizes['2xl'] }}>
                2FA Enabled Successfully!
              </h2>
              <p style={{ margin: 0, color: colors.textSecondary }}>
                Save these backup codes in a secure location
              </p>
            </div>
          </div>
        </div>

        {/* Permanent Backup Code */}
        {permanentBackupCode && (
          <div style={{
            background: `linear-gradient(135deg, ${colors.success}08 0%, ${colors.white} 100%)`,
            border: `2px solid ${colors.success}`,
            borderRadius: theme.radius.xl,
            padding: theme.spacing['2xl'],
            marginBottom: theme.spacing.xl,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: `0 8px 32px ${colors.success}15`
          }}>
            <div style={{
              position: 'absolute',
              top: '-30px',
              right: '-30px',
              width: '120px',
              height: '120px',
              background: colors.success,
              opacity: 0.08,
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              fontSize: '80px',
              opacity: 0.05,
              transform: 'rotate(-15deg)'
            }}>
              🔑
            </div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: theme.spacing.lg
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.sm,
                    marginBottom: theme.spacing.sm
                  }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: theme.radius.md,
                      background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.success}dd 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FaKey style={{ color: colors.white, fontSize: '18px' }} />
                    </div>
                    <h3 style={{ margin: 0, color: colors.success, fontSize: theme.typography.fontSizes.xl }}>
                      Permanent Backup Code
                    </h3>
                  </div>
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.sm,
                    color: colors.textSecondary,
                    lineHeight: 1.6
                  }}>
                    This code can be used multiple times for login. Keep it very secure!
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(permanentBackupCode)}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    background: `linear-gradient(135deg, ${colors.success} 0%, ${colors.success}dd 100%)`,
                    color: colors.white,
                    border: 'none',
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    boxShadow: `0 4px 12px ${colors.success}30`,
                    transition: 'all 0.2s',
                    transform: 'translateY(0)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 16px ${colors.success}40`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.success}30`;
                  }}
                >
                  <FaCopy /> Copy
                </button>
              </div>
              
              <div style={{
                padding: theme.spacing.xl,
                background: colors.white,
                borderRadius: theme.radius.lg,
                border: `2px solid ${colors.success}30`,
                textAlign: 'center',
                boxShadow: `inset 0 2px 8px ${colors.success}10`
              }}>
                <code style={{
                  fontFamily: 'monospace',
                  fontSize: theme.typography.fontSizes['3xl'],
                  fontWeight: theme.typography.fontWeights.bold,
                  color: colors.success,
                  letterSpacing: '4px',
                  display: 'block'
                }}>
                  {permanentBackupCode}
                </code>
              </div>
            </div>
          </div>
        )}

        {/* One-Time Backup Codes */}
        <div style={{
          background: colors.white,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: theme.radius.xl,
          padding: theme.spacing['2xl'],
          marginBottom: theme.spacing.xl,
          boxShadow: theme.shadows.md,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-40px',
            right: '-40px',
            width: '140px',
            height: '140px',
            background: colors.primary,
            opacity: 0.05,
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: theme.spacing.lg
            }}>
              <h3 style={{ margin: 0, fontSize: theme.typography.fontSizes.xl }}>One-Time Backup Codes</h3>
              <div style={{ display: 'flex', gap: theme.spacing.sm }}>
                <button
                  onClick={() => copyToClipboard(backupCodes.join('\n'))}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    background: colors.primaryBg,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.medium,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.primary;
                    e.currentTarget.style.color = colors.white;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.primaryBg;
                    e.currentTarget.style.color = colors.primary;
                  }}
                >
                  <FaCopy /> Copy
                </button>
                <button
                  onClick={downloadBackupCodes}
                  style={{
                    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
                    background: colors.primaryBg,
                    color: colors.primary,
                    border: `1px solid ${colors.primary}`,
                    borderRadius: theme.radius.md,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.medium,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = colors.primary;
                    e.currentTarget.style.color = colors.white;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = colors.primaryBg;
                    e.currentTarget.style.color = colors.primary;
                  }}
                >
                  <FaDownload /> Download
                </button>
              </div>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: theme.spacing.md,
              fontFamily: 'monospace'
            }}>
              {backupCodes.map((code, index) => (
                <div
                  key={index}
                  style={{
                    padding: theme.spacing.lg,
                    background: `linear-gradient(135deg, ${colors.primaryBg} 0%, ${colors.white} 100%)`,
                    borderRadius: theme.radius.lg,
                    textAlign: 'center',
                    color: colors.textPrimary,
                    fontSize: theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.bold,
                    border: `1px solid ${colors.borderLight}`,
                    boxShadow: theme.shadows.xs,
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = theme.shadows.md;
                    e.currentTarget.style.borderColor = colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = theme.shadows.xs;
                    e.currentTarget.style.borderColor = colors.borderLight;
                  }}
                  onClick={() => copyToClipboard(code)}
                >
                  {code}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Warning Box */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.warningBg} 0%, ${colors.white} 100%)`,
          border: `2px solid ${colors.warning}`,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: theme.spacing.md
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.radius.md,
              background: colors.warningBg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FaExclamationTriangle style={{ color: colors.warning, fontSize: '20px' }} />
            </div>
            <div>
              <h4 style={{ margin: 0, marginBottom: theme.spacing.sm, color: colors.warning }}>
                Important Security Notice
              </h4>
              <ul style={{ 
                margin: 0, 
                paddingLeft: theme.spacing.lg, 
                color: colors.textSecondary,
                lineHeight: 1.8
              }}>
                <li>These codes will not be shown again</li>
                <li>One-time codes can only be used once</li>
                <li>Permanent code (12 characters) can be used multiple times</li>
                <li>Store them in a secure location</li>
                <li>You can regenerate codes later if needed</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setSetupStep('status');
            setBackupCodes([]);
            setPermanentBackupCode('');
            setVerificationCode('');
          }}
          variant="primary"
          style={{ width: '100%', padding: theme.spacing.md }}
        >
          Done
        </Button>
      </div>
    );
  }

  // QR Code Verification Screen
  if (setupStep === 'verify') {
    return (
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: theme.spacing.lg }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing['2xl']
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: theme.radius.xl,
            background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 8px 24px ${colors.primary}30`
          }}>
            <FaQrcode style={{ fontSize: '32px', color: colors.white }} />
          </div>
          <div>
            <h1 style={{ margin: 0, marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes['3xl'] }}>
              Scan QR Code
            </h1>
            <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.base }}>
              Use your authenticator app to scan this code
            </p>
          </div>
        </div>

        {/* QR Code Card */}
        <div style={{
          background: colors.white,
          border: `2px solid ${colors.primary}`,
          borderRadius: theme.radius['2xl'],
          padding: theme.spacing['3xl'],
          marginBottom: theme.spacing.xl,
          textAlign: 'center',
          boxShadow: `0 12px 40px ${colors.primary}20`,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-100px',
            right: '-100px',
            width: '300px',
            height: '300px',
            background: colors.primary,
            opacity: 0.05,
            borderRadius: '50%'
          }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{
              background: `linear-gradient(135deg, ${colors.primaryBg} 0%, ${colors.white} 100%)`,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
              marginBottom: theme.spacing.xl,
              border: `1px solid ${colors.primary}20`
            }}>
              <p style={{ 
                margin: 0, 
                color: colors.textPrimary,
                fontWeight: theme.typography.fontWeights.semibold,
                fontSize: theme.typography.fontSizes.lg,
                marginBottom: theme.spacing.xs
              }}>
                📱 Step 1: Open your authenticator app
              </p>
              <p style={{ 
                margin: 0, 
                color: colors.textSecondary,
                fontSize: theme.typography.fontSizes.sm
              }}>
                (Google Authenticator, Microsoft Authenticator, Authy, etc.)
              </p>
            </div>
            
            {qrCode && (
              <div style={{
                background: colors.white,
                padding: theme.spacing.xl,
                borderRadius: theme.radius.xl,
                display: 'inline-block',
                border: `2px solid ${colors.borderLight}`,
                marginBottom: theme.spacing.xl,
                boxShadow: theme.shadows.md
              }}>
                <img 
                  src={qrCode} 
                  alt="2FA QR Code" 
                  style={{
                    maxWidth: '300px',
                    width: '100%',
                    height: 'auto',
                    display: 'block'
                  }}
                />
              </div>
            )}
            
            <div style={{
              background: `linear-gradient(135deg, ${colors.successBg} 0%, ${colors.white} 100%)`,
              borderRadius: theme.radius.xl,
              padding: theme.spacing.lg,
              border: `1px solid ${colors.success}30`
            }}>
              <p style={{ 
                margin: 0, 
                color: colors.textPrimary,
                fontWeight: theme.typography.fontWeights.semibold,
                fontSize: theme.typography.fontSizes.lg,
                marginBottom: theme.spacing.xs
              }}>
                📸 Step 2: Scan the QR code above
              </p>
              <p style={{ 
                margin: 0, 
                color: colors.textSecondary,
                fontSize: theme.typography.fontSizes.sm
              }}>
                Point your phone's camera at the QR code. The app will automatically add your account.
              </p>
            </div>
          </div>
        </div>

        {/* Manual Entry */}
        <div style={{
          background: `linear-gradient(135deg, ${colors.primaryBg} 0%, ${colors.white} 100%)`,
          border: `1px solid ${colors.primary}30`,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl
        }}>
          <p style={{ 
            margin: 0, 
            marginBottom: theme.spacing.md, 
            fontWeight: theme.typography.fontWeights.semibold,
            color: colors.textPrimary
          }}>
            Can't scan? Enter this code manually:
          </p>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing.sm
          }}>
            <code style={{
              flex: 1,
              padding: theme.spacing.md,
              background: colors.white,
              borderRadius: theme.radius.md,
              fontFamily: 'monospace',
              fontSize: theme.typography.fontSizes.sm,
              border: `1px solid ${colors.borderLight}`,
              color: colors.textPrimary
            }}>
              {manualSecret}
            </code>
            <button
              onClick={() => copyToClipboard(manualSecret)}
              style={{
                padding: theme.spacing.md,
                background: colors.primary,
                color: colors.white,
                border: 'none',
                borderRadius: theme.radius.md,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '48px',
                height: '48px',
                transition: 'all 0.2s',
                boxShadow: `0 4px 12px ${colors.primary}30`
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 6px 16px ${colors.primary}40`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}30`;
              }}
            >
              <FaCopy />
            </button>
          </div>
        </div>

        {/* Verification Form */}
        <form onSubmit={handleVerifySetup}>
          <div style={{
            background: colors.infoBg || colors.primaryBg,
            padding: theme.spacing.lg,
            borderRadius: theme.radius.xl,
            marginBottom: theme.spacing.lg,
            border: `1px solid ${colors.primary}20`
          }}>
            <p style={{ 
              margin: 0, 
              color: colors.textSecondary,
              fontSize: theme.typography.fontSizes.sm,
              lineHeight: 1.6
            }}>
              <strong style={{ color: colors.textPrimary }}>💡 Tip:</strong> Make sure you're entering the <strong>current</strong> 6-digit code from your authenticator app. Codes refresh every 30 seconds.
            </p>
          </div>

          <Input
            label="Enter 6-digit code from your app"
            type="text"
            value={verificationCode}
            onChange={e => {
              const value = e.target.value.replace(/\D/g, '').slice(0, 6);
              setVerificationCode(value);
            }}
            required
            placeholder="000000"
            maxLength={6}
            autoFocus
            style={{ marginBottom: theme.spacing.lg }}
          />

          {error && (
            <div style={{
              background: colors.errorLight,
              color: colors.error,
              padding: theme.spacing.md,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              border: `1px solid ${colors.error}`
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: theme.spacing.md }}>
            <Button
              type="button"
              onClick={() => {
                setSetupStep('status');
                setVerificationCode('');
                setQrCode('');
                setManualSecret('');
              }}
              variant="secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={loading || verificationCode.length !== 6}
              style={{ flex: 1 }}
            >
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </Button>
          </div>
        </form>
      </div>
    );
  }

  // Main Status Screen
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: theme.spacing.lg }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing.lg,
        marginBottom: theme.spacing['3xl']
      }}>
        <div style={{
          width: '72px',
          height: '72px',
          borderRadius: theme.radius.xl,
          background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: `0 8px 24px ${colors.primary}30`
        }}>
          <FaShieldAlt style={{ fontSize: '36px', color: colors.white }} />
        </div>
        <div>
          <h1 style={{ margin: 0, marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes['3xl'] }}>
            Two-Factor Authentication
          </h1>
          <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.base }}>
            Add an extra layer of security to your account
          </p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.successBg} 0%, ${colors.white} 100%)`,
          color: colors.success,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.xl,
          marginBottom: theme.spacing.xl,
          border: `2px solid ${colors.success}`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          boxShadow: `0 4px 12px ${colors.success}20`
        }}>
          <FaCheckCircle style={{ fontSize: '20px' }} />
          <span style={{ fontWeight: theme.typography.fontWeights.medium }}>{success}</span>
        </div>
      )}

      {error && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.errorLight} 0%, ${colors.white} 100%)`,
          color: colors.error,
          padding: theme.spacing.lg,
          borderRadius: theme.radius.xl,
          marginBottom: theme.spacing.xl,
          border: `2px solid ${colors.error}`,
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing.md,
          boxShadow: `0 4px 12px ${colors.error}20`
        }}>
          <FaExclamationTriangle style={{ fontSize: '20px' }} />
          <span style={{ fontWeight: theme.typography.fontWeights.medium }}>{error}</span>
        </div>
      )}

      {/* Info Card */}
      {twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified && (
        <div style={{
          background: `linear-gradient(135deg, ${colors.infoBg || colors.primaryBg} 0%, ${colors.white} 100%)`,
          border: `2px solid ${colors.info || colors.primary}`,
          borderRadius: theme.radius.xl,
          padding: theme.spacing.xl,
          marginBottom: theme.spacing.xl,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 4px 16px ${colors.primary}10`
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '100px',
            height: '100px',
            background: colors.primary,
            opacity: 0.05,
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            fontSize: '60px',
            opacity: 0.05
          }}>
            <FaInfoCircle />
          </div>
          
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', gap: theme.spacing.md }}>
            <FaInfoCircle style={{ 
              color: colors.info || colors.primary, 
              fontSize: '24px',
              marginTop: '4px',
              flexShrink: 0
            }} />
            <div>
              <h4 style={{ 
                margin: 0, 
                marginBottom: theme.spacing.sm,
                color: colors.info || colors.primary,
                fontSize: theme.typography.fontSizes.lg
              }}>
                About Permanent Backup Code
              </h4>
              <p style={{ 
                margin: 0, 
                color: colors.textSecondary,
                fontSize: theme.typography.fontSizes.sm,
                lineHeight: 1.7
              }}>
                The permanent backup code (12 characters) can be used multiple times for login. 
                It was shown to you during 2FA setup and when regenerating backup codes. 
                <strong style={{ color: colors.textPrimary }}> For security reasons, it cannot be retrieved once generated.</strong> 
                If you didn't save it, you can regenerate backup codes to get a new permanent code.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Card */}
      <div style={{
        background: colors.white,
        border: `1px solid ${colors.borderLight}`,
        borderRadius: theme.radius['2xl'],
        padding: theme.spacing['2xl'],
        marginBottom: theme.spacing.xl,
        boxShadow: theme.shadows.lg,
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-60px',
          right: '-60px',
          width: '200px',
          height: '200px',
          background: twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified
            ? colors.success
            : colors.warning,
          opacity: 0.05,
          borderRadius: '50%'
        }} />
        
        <div style={{
          position: 'absolute',
          top: '30px',
          right: '30px',
          fontSize: '120px',
          opacity: 0.03,
          transform: 'rotate(-15deg)'
        }}>
          {twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified ? (
            <FaShieldAlt />
          ) : (
            <FaLock />
          )}
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: theme.spacing.xl
          }}>
            <div>
              <h2 style={{ margin: 0, marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes['2xl'] }}>
                2FA Status
              </h2>
              <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.base }}>
                {twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified
                  ? 'Two-factor authentication is enabled and active'
                  : 'Two-factor authentication is not enabled'}
              </p>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing.sm,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderRadius: theme.radius.xl,
              background: twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified
                ? `linear-gradient(135deg, ${colors.successBg} 0%, ${colors.success}15 100%)`
                : `linear-gradient(135deg, ${colors.warningBg} 0%, ${colors.warning}15 100%)`,
              border: `2px solid ${twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified
                ? colors.success
                : colors.warning}`,
              boxShadow: `0 4px 12px ${twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified
                ? colors.success
                : colors.warning}20`
            }}>
              {twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified ? (
                <>
                  <FaCheckCircle style={{ fontSize: '20px' }} />
                  <span style={{ fontWeight: theme.typography.fontWeights.semibold }}>Enabled</span>
                </>
              ) : (
                <>
                  <FaTimesCircle style={{ fontSize: '20px' }} />
                  <span style={{ fontWeight: theme.typography.fontWeights.semibold }}>Disabled</span>
                </>
              )}
            </div>
          </div>

          {twoFactorStatus.twoFactorEnabled && twoFactorStatus.twoFactorVerified && (
            <>
              <div style={{
                padding: theme.spacing.lg,
                background: `linear-gradient(135deg, ${colors.primaryBg} 0%, ${colors.white} 100%)`,
                borderRadius: theme.radius.xl,
                marginBottom: theme.spacing.lg,
                border: `1px solid ${colors.primary}20`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: theme.spacing.md
                }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: theme.radius.md,
                    background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <FaKey style={{ color: colors.white, fontSize: '20px' }} />
                  </div>
                  <div>
                    <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm }}>
                      Unused backup codes
                    </p>
                    <p style={{ margin: 0, color: colors.textPrimary, fontSize: theme.typography.fontSizes['2xl'], fontWeight: theme.typography.fontWeights.bold }}>
                      {twoFactorStatus.unusedBackupCodes} <span style={{ fontSize: theme.typography.fontSizes.base, fontWeight: theme.typography.fontWeights.normal, color: colors.textSecondary }}>of 10</span>
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{
                padding: theme.spacing.lg,
                background: `linear-gradient(135deg, ${colors.warningBg} 0%, ${colors.white} 100%)`,
                border: `2px solid ${colors.warning}`,
                borderRadius: theme.radius.xl,
                marginBottom: theme.spacing.lg
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: theme.spacing.md
                }}>
                  <FaExclamationTriangle style={{ color: colors.warning, marginTop: '4px', fontSize: '20px' }} />
                  <div>
                    <strong style={{ color: colors.warning, display: 'block', marginBottom: theme.spacing.xs }}>
                      Backup Codes Security Notice
                    </strong>
                    <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm, lineHeight: 1.7 }}>
                      Backup codes are only shown once for security reasons. If you didn't save them during setup, you'll need to regenerate new codes. 
                      <strong style={{ color: colors.textPrimary }}> The permanent backup code (12 characters) can be used multiple times and was shown during setup.</strong> If you didn't save it, regenerate codes to get a new one. One-time codes (8 characters) can only be used once.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {!twoFactorStatus.twoFactorEnabled || !twoFactorStatus.twoFactorVerified ? (
        <div style={{
          background: colors.white,
          border: `1px solid ${colors.borderLight}`,
          borderRadius: theme.radius['2xl'],
          padding: theme.spacing['2xl'],
          boxShadow: theme.shadows.lg,
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '150px',
            height: '150px',
            background: colors.primary,
            opacity: 0.05,
            borderRadius: '50%'
          }} />
          <div style={{
            position: 'absolute',
            top: '30px',
            right: '30px',
            fontSize: '100px',
            opacity: 0.03
          }}>
            <FaShieldAlt />
          </div>
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <h3 style={{ marginBottom: theme.spacing.md, fontSize: theme.typography.fontSizes.xl }}>
              Enable 2FA
            </h3>
            <p style={{ color: colors.textSecondary, marginBottom: theme.spacing.xl, lineHeight: 1.7 }}>
              Protect your account with two-factor authentication. You'll need an authenticator app like Google Authenticator or Microsoft Authenticator.
            </p>
            <Button
              onClick={handleSetup2FA}
              disabled={loading}
              variant="primary"
              style={{ width: '100%', padding: theme.spacing.md }}
            >
              {loading ? 'Setting up...' : 'Enable 2FA'}
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Regenerate Backup Codes */}
          <div style={{
            background: colors.white,
            border: `1px solid ${colors.borderLight}`,
            borderRadius: theme.radius['2xl'],
            padding: theme.spacing['2xl'],
            marginBottom: theme.spacing.xl,
            boxShadow: theme.shadows.lg,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-40px',
              right: '-40px',
              width: '120px',
              height: '120px',
              background: colors.primary,
              opacity: 0.05,
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              top: '30px',
              right: '30px',
              fontSize: '80px',
              opacity: 0.03,
              transform: 'rotate(-15deg)'
            }}>
              <FaRedo />
            </div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.lg
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: theme.radius.md,
                  background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryDark} 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaRedo style={{ color: colors.white, fontSize: '20px' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, marginBottom: theme.spacing.xs, fontSize: theme.typography.fontSizes.xl }}>
                    Regenerate Backup Codes
                  </h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm }}>
                    {twoFactorStatus.unusedBackupCodes > 0 
                      ? `You have ${twoFactorStatus.unusedBackupCodes} unused backup codes remaining.`
                      : 'You have no unused backup codes. Regenerate to get new ones.'}
                  </p>
                </div>
              </div>
              
              <div style={{
                padding: theme.spacing.md,
                background: colors.infoBg || colors.primaryBg,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
                border: `1px solid ${colors.primary}20`
              }}>
                <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm, lineHeight: 1.6 }}>
                  <strong style={{ color: colors.textPrimary }}>Note:</strong> Backup codes are only displayed once during setup or regeneration for security. If you need to see your codes again, you must regenerate new ones (this will invalidate your old codes).
                </p>
              </div>

              {showBackupCodes && (
                <div style={{
                  background: `linear-gradient(135deg, ${colors.successBg} 0%, ${colors.white} 100%)`,
                  border: `2px solid ${colors.success}`,
                  borderRadius: theme.radius.xl,
                  padding: theme.spacing.xl,
                  marginBottom: theme.spacing.lg
                }}>
                  <h4 style={{ margin: 0, marginBottom: theme.spacing.md, color: colors.success }}>
                    New Backup Codes Generated
                  </h4>
                  {permanentBackupCode && (
                    <div style={{ marginBottom: theme.spacing.lg }}>
                      <p style={{ margin: 0, marginBottom: theme.spacing.sm, fontSize: theme.typography.fontSizes.sm, color: colors.textSecondary }}>
                        Permanent Backup Code:
                      </p>
                      <code style={{
                        display: 'block',
                        padding: theme.spacing.md,
                        background: colors.white,
                        borderRadius: theme.radius.md,
                        fontFamily: 'monospace',
                        fontSize: theme.typography.fontSizes.lg,
                        fontWeight: theme.typography.fontWeights.bold,
                        color: colors.success,
                        letterSpacing: '2px',
                        border: `1px solid ${colors.success}30`
                      }}>
                        {permanentBackupCode}
                      </code>
                    </div>
                  )}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: theme.spacing.sm
                  }}>
                    {backupCodes.map((code, index) => (
                      <div
                        key={index}
                        style={{
                          padding: theme.spacing.sm,
                          background: colors.white,
                          borderRadius: theme.radius.md,
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          fontSize: theme.typography.fontSizes.sm,
                          fontWeight: theme.typography.fontWeights.bold,
                          border: `1px solid ${colors.success}30`
                        }}
                      >
                        {code}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <form onSubmit={handleRegenerateBackupCodes}>
                <Input
                  label="Enter your password"
                  type="password"
                  value={regeneratePassword}
                  onChange={e => setRegeneratePassword(e.target.value)}
                  required
                  style={{ marginBottom: theme.spacing.lg }}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  variant="primary"
                  style={{ width: '100%', padding: theme.spacing.md }}
                >
                  {loading ? 'Regenerating...' : 'Regenerate Backup Codes'}
                </Button>
              </form>
            </div>
          </div>

          {/* Disable 2FA */}
          <div style={{
            background: colors.white,
            border: `2px solid ${colors.error}30`,
            borderRadius: theme.radius['2xl'],
            padding: theme.spacing['2xl'],
            boxShadow: theme.shadows.lg,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: colors.error,
              opacity: 0.05,
              borderRadius: '50%'
            }} />
            <div style={{
              position: 'absolute',
              top: '30px',
              right: '30px',
              fontSize: '100px',
              opacity: 0.03
            }}>
              <FaUnlock />
            </div>
            
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.md,
                marginBottom: theme.spacing.lg
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: theme.radius.md,
                  background: `linear-gradient(135deg, ${colors.error} 0%, ${colors.error}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FaUnlock style={{ color: colors.white, fontSize: '20px' }} />
                </div>
                <div>
                  <h3 style={{ margin: 0, marginBottom: theme.spacing.xs, color: colors.error, fontSize: theme.typography.fontSizes.xl }}>
                    Disable 2FA
                  </h3>
                  <p style={{ margin: 0, color: colors.textSecondary, fontSize: theme.typography.fontSizes.sm }}>
                    Disabling 2FA will remove the extra security layer from your account
                  </p>
                </div>
              </div>
              
              <form onSubmit={handleDisable2FA}>
                <Input
                  label="Enter your password to confirm"
                  type="password"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  required
                  style={{ marginBottom: theme.spacing.lg }}
                />
                <Button
                  type="submit"
                  disabled={loading}
                  variant="danger"
                  style={{ width: '100%', padding: theme.spacing.md }}
                >
                  {loading ? 'Disabling...' : 'Disable 2FA'}
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TwoFactorSettings;
