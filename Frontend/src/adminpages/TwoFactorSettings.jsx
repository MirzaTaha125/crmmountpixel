import React, { useState, useEffect } from 'react';
import axios from 'axios';
import getApiBaseUrl from '../apiBase';
import { theme, getColors } from '../theme';
import { FaShieldAlt, FaQrcode, FaKey, FaCheckCircle, FaTimesCircle, FaDownload, FaCopy, FaExclamationTriangle, FaInfoCircle, FaLock, FaUnlock, FaRedo, FaArrowLeft, FaEye, FaEyeSlash } from 'react-icons/fa';

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
  const [disablePassword, setDisablePassword] = useState('');
  const [_regeneratePassword, _setRegeneratePassword] = useState('');

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => { fetch2FAStatus(); }, []);

  const fetch2FAStatus = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/2fa/status`, { headers: getAuthHeaders() });
      setTwoFactorStatus(res.data);
    } catch { setError('Identity status sync failed'); }
  };

  const handleSetup2FA = async () => {
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API_URL}/api/2fa/setup`, {}, { headers: getAuthHeaders() });
      setQrCode(res.data.qrCode);
      setManualSecret(res.data.manualEntryKey);
      setSetupStep('verify');
    } catch { setError('Security initialization rejected'); }
    finally { setLoading(false); }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await axios.post(`${API_URL}/api/2fa/verify-setup`, { code: verificationCode }, { headers: getAuthHeaders() });
      setBackupCodes(res.data.backupCodes);
      setPermanentBackupCode(res.data.permanentBackupCode || '');
      setSetupStep('backup-codes');
      await fetch2FAStatus();
    } catch { setError('Verification matrix mismatch'); }
    finally { setLoading(false); }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await axios.post(`${API_URL}/api/2fa/disable`, { password: disablePassword }, { headers: getAuthHeaders() });
      setSuccess('MFA LAYER DEACTIVATED');
      setDisablePassword('');
      setSetupStep('status');
      await fetch2FAStatus();
    } catch { setError('Authorization credentials invalid'); }
    finally { setLoading(false); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setSuccess('COPIED TO BUFFER');
    setTimeout(() => setSuccess(''), 2000);
  };

  const downloadBackupCodes = () => {
    const content = `MFA BACKUP RECOVERY\n\nGenerated: ${new Date().toISOString()}\n\nPERMANENT CODE: ${permanentBackupCode}\n\nONE-TIME CODES:\n${backupCodes.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'security-vault-codes.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ width: '100%', fontFamily: 'inherit' }}>
      {/* HEADER ROW */}
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
          <h2 style={{ fontSize: theme.typography.fontSizes.lg, fontWeight: 'bold', color: colors.textPrimary, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Cryptographic Authentication
          </h2>
          <p style={{ fontSize: '10px', color: colors.textTertiary, margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>
            Multi-Factor Security Layer & Identity Verification Protocols
          </p>
        </div>
        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          {setupStep !== 'status' && (
            <button onClick={() => setSetupStep('status')} style={{ background: 'none', border: `1px solid ${colors.border}`, borderRadius: theme.radius.md, padding: '6px 15px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: theme.spacing.sm, boxShadow: theme.shadows.sm }}>
             <FaArrowLeft /> Abort Operation
            </button>
          )}
        </div>
      </div>

      {/* STATUS OVERVIEW */}
      {setupStep === 'status' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 600px)', gap: theme.spacing.lg }}>
          <div style={{ 
            background: colors.white, 
            border: `1px solid ${colors.borderLight}`, 
            borderRadius: theme.radius.lg,
            boxShadow: theme.shadows.sm,
            padding: theme.spacing.xl 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.md, marginBottom: theme.spacing.xl }}>
              <div style={{ 
                width: '40px', 
                height: '40px', 
                background: twoFactorStatus.twoFactorEnabled ? '#10b981' : colors.error, 
                borderRadius: theme.radius.md,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: colors.white,
                boxShadow: theme.shadows.sm
              }}>
                {twoFactorStatus.twoFactorEnabled ? <FaLock /> : <FaUnlock />}
              </div>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: colors.textPrimary }}>VAULT STATUS: {twoFactorStatus.twoFactorEnabled ? 'PROTECTED' : 'VULNERABLE'}</div>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary }}>{twoFactorStatus.twoFactorEnabled ? 'ENHANCED MFA ACTIVE' : 'BASIC AUTHENTICATION ONLY'}</div>
              </div>
            </div>

            {twoFactorStatus.twoFactorEnabled ? (
              <div>
                <div style={{ 
                  background: colors.tableHeaderBg, 
                  padding: theme.spacing.md, 
                  borderRadius: theme.radius.md,
                  borderLeft: `4px solid ${colors.sidebarActive}`, 
                  borderBottom: `1px solid ${colors.border}`, 
                  marginBottom: theme.spacing.xl, 
                  boxShadow: theme.shadows.sm
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 'bold', color: colors.textTertiary, textTransform: 'uppercase' }}>Recovery Vectors</div>
                  <div style={{ fontSize: '14px', fontWeight: 'bold', color: colors.textPrimary }}>{twoFactorStatus.unusedBackupCodes} CODES IN RESERVE</div>
                </div>
                
                <div style={{ border: `1px solid ${colors.borderLight}`, borderRadius: theme.radius.md, padding: theme.spacing.lg }}>
                  <div style={{ fontSize: '10px', fontWeight: '800', marginBottom: '10px', textTransform: 'uppercase' }}>Deactivate Security Layer</div>
                  <form onSubmit={handleDisable2FA}>
                    <input type="password" placeholder="Confirm master password" value={disablePassword} onChange={e => setDisablePassword(e.target.value)} style={{ width: '100%', padding: '10px', border: `1px solid ${colors.border}`, borderRadius: theme.radius.sm, marginBottom: '10px', fontSize: '11px', outline: 'none' }} />
                    <button type="submit" disabled={loading} style={{ background: colors.error, color: colors.white, border: 'none', borderRadius: theme.radius.sm, width: '100%', padding: '10px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.sm }}>
                      {loading ? 'Processing...' : 'Decommission MFA'}
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <div>
                <div style={{ 
                  background: colors.tableHeaderBg, 
                  padding: theme.spacing.xl, 
                  borderRadius: theme.radius.md,
                  border: `1px solid ${colors.border}`, 
                  marginBottom: theme.spacing.xl, 
                  boxShadow: theme.shadows.sm 
                }}>
                  <div style={{ fontSize: '11px', lineHeight: '1.6', color: colors.textSecondary }}>
                    Security hardening is recommended. Activating Multi-Factor Authentication (MFA) introduces a secondary validation layer, significantly mitigating unauthorized access risks.
                  </div>
                </div>
                <button onClick={handleSetup2FA} disabled={loading} style={{ background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, width: '100%', padding: '15px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.md }}>
                  {loading ? 'Initializing Interface...' : 'Setup Multi-Factor Layer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VERIFICATION FLOW */}
      {setupStep === 'verify' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(300px, 1fr)', gap: theme.spacing.xl }}>
          <div style={{ background: colors.white, border: `1px solid ${colors.borderLight}`, borderRadius: theme.radius.lg, boxShadow: theme.shadows.md, padding: theme.spacing.xl, display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>1. Sync Authenticator</div>
            <div style={{ textAlign: 'center', padding: '20px', borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, background: colors.tableHeaderBg, marginBottom: '20px', boxShadow: theme.shadows.sm }}>
              <img src={qrCode} alt="Security Matrix" style={{ width: '200px', height: '200px', outline: `4px solid ${colors.white}`, borderRadius: theme.radius.sm }} />
            </div>
            <div style={{ background: colors.white, padding: '12px', borderRadius: theme.radius.md, border: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: theme.shadows.sm }}>
              <code style={{ fontSize: '11px', fontWeight: 'bold', color: colors.sidebarActive, letterSpacing: '1px' }}>{manualSecret}</code>
              <button onClick={() => copyToClipboard(manualSecret)} style={{ background: 'none', border: theme.radius.sm, cursor: 'pointer', color: colors.textTertiary, padding: '4px' }}><FaCopy /></button>
            </div>
          </div>
          
          <div style={{ background: colors.white, border: `1px solid ${colors.borderLight}`, borderRadius: theme.radius.lg, boxShadow: theme.shadows.md, padding: theme.spacing.xl }}>
            <div style={{ fontSize: '10px', fontWeight: '800', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '1px' }}>2. Validate Token</div>
            <form onSubmit={handleVerifySetup}>
              <div style={{ fontSize: '11px', color: colors.textSecondary, marginBottom: '20px', lineHeight: 1.5 }}>
                Enter the 6-digit synchronization token generated by your identity provider app to finalize linking.
              </div>
              <input 
                type="text" 
                placeholder="000 000" 
                value={verificationCode} 
                onChange={e => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                style={{ width: '100%', padding: '15px', border: `2px solid ${colors.sidebarBg}`, borderRadius: theme.radius.lg, fontSize: '24px', textAlign: 'center', letterSpacing: '8px', fontWeight: '900', marginBottom: '20px', outline: 'none', boxShadow: theme.shadows.sm }} 
                autoFocus 
              />
              <button type="submit" disabled={loading} style={{ background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, width: '100%', padding: '15px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.md }}>
                {loading ? 'Verifying Sync...' : 'Confirm Security Link'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BACKUP CODES DISCOVERY */}
      {setupStep === 'backup-codes' && (
        <div style={{ background: colors.white, border: `2px solid #10b981`, borderRadius: theme.radius.lg, boxShadow: theme.shadows.xl, padding: '40px' }}>
           <div style={{ textAlign: 'center', marginBottom: '40px' }}>
             <FaCheckCircle style={{ fontSize: '48px', color: '#10b981', marginBottom: '20px' }} />
             <div style={{ fontSize: '18px', fontWeight: 'bold', textTransform: 'uppercase', color: colors.textPrimary }}>Security Layer Synchronized</div>
             <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.textTertiary, marginTop: '5px' }}>STORE RECOVERY VECTORS IMMEDIATELY</div>
           </div>

           <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(250px, 1fr)', gap: '40px' }}>
             <div>
               <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', color: colors.textSecondary }}>Master Recovery Key</div>
               <div style={{ 
                 background: colors.tableHeaderBg, 
                 padding: '24px', 
                 borderRadius: theme.radius.md,
                 border: `2px dashed #10b981`, 
                 textAlign: 'center', 
                 fontSize: '18px', 
                 fontWeight: '900', 
                 letterSpacing: '2px', 
                 boxShadow: theme.shadows.sm,
                 color: colors.textPrimary
               }}>{permanentBackupCode}</div>
               <div style={{ fontSize: '8px', color: colors.textTertiary, marginTop: '8px', fontWeight: 'bold' }}>PERMANENT RECOVERY KEY. DO NOT SHARE.</div>
             </div>
             <div>
               <div style={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', marginBottom: '10px', color: colors.textSecondary }}>One-Time Vault Codes</div>
               <div style={{ 
                 display: 'grid', 
                 gridTemplateColumns: '1fr 1fr', 
                 gap: '8px', 
                 background: colors.borderLight, 
                 padding: '2px',
                 borderRadius: theme.radius.md,
                 overflow: 'hidden'
               }}>
                 {backupCodes.map(c => <div key={c} style={{ background: colors.white, padding: '12px', textAlign: 'center', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', color: colors.textPrimary }}>{c}</div>)}
               </div>
             </div>
           </div>

           <div style={{ marginTop: '40px', display: 'flex', gap: theme.spacing.md }}>
             <button onClick={downloadBackupCodes} style={{ flex: 1, padding: '15px', background: '#059669', color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.md }}>Download Vault</button>
             <button onClick={() => setSetupStep('status')} style={{ flex: 1, padding: '15px', background: colors.sidebarBg, color: colors.white, border: 'none', borderRadius: theme.radius.md, fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase', cursor: 'pointer', boxShadow: theme.shadows.md }}>Finalize Setup</button>
           </div>
        </div>
      )}

      {/* GLOBAL ALERTS */}
      <div style={{ position: 'fixed', bottom: '40px', right: '40px', display: 'flex', flexDirection: 'column', gap: '12px', zIndex: 2000 }}>
        {error && (
          <div style={{ 
            background: colors.error, 
            color: colors.white, 
            padding: '16px 32px', 
            borderRadius: theme.radius.md,
            fontWeight: 'bold', 
            fontSize: '10px', 
            textTransform: 'uppercase', 
            boxShadow: theme.shadows.xl,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FaExclamationTriangle /> CRITICAL: {error}
          </div>
        )}
        {success && (
          <div style={{ 
            background: '#10b981', 
            color: colors.white, 
            padding: '16px 32px', 
            borderRadius: theme.radius.md,
            fontWeight: 'bold', 
            fontSize: '10px', 
            textTransform: 'uppercase', 
            boxShadow: theme.shadows.xl,
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <FaCheckCircle /> {success}
          </div>
        )}
      </div>
    </div>
  );
}

export default TwoFactorSettings;
