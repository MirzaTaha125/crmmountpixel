import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from './session.jsx';
import axios from 'axios';
import getApiBaseUrl from './apiBase';
import { theme } from './theme';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { LoadingScreen } from './components/LoadingScreen';
import { OTPInput } from './components/OTPInput';
import { FaLock, FaEnvelope, FaShieldAlt, FaKey, FaArrowLeft, FaCheckCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import ForgotPassword from './ForgotPassword';
import signinImage from './assets/signin.webp';

function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState(null);
  const [tempToken, setTempToken] = useState(null);
  const [useBackupCode, setUseBackupCode] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordOtp, setForgotPasswordOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { setUser } = useSession();
  const navigate = useNavigate();
  const API_URL = getApiBaseUrl();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // If 2FA is required, verify the code
      if (requires2FA) {
        if (useBackupCode) {
          // Backup code validation: 8 characters (one-time) or 12 characters (permanent)
          if (!twoFactorCode || (twoFactorCode.length !== 8 && twoFactorCode.length !== 12)) {
            setError('Please enter a valid backup code (8 or 12 characters)');
            setLoading(false);
            return;
          }
        } else {
          // 2FA code validation: 6 digits
          if (!twoFactorCode || twoFactorCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            setLoading(false);
            return;
          }
        }

        try {
          const res = await axios.post(`${API_URL}/api/2fa/verify-login`, {
            userId: userId,
            code: useBackupCode ? null : twoFactorCode,
            backupCode: useBackupCode ? twoFactorCode : null
          });

          if (res.data.user) {
            const user = res.data.user;
            setUser(user);
            
            // Store token in localStorage
            if (user.token) {
              localStorage.setItem('token', user.token);
            }
            
            // Show loading screen and navigate
            setLoading(false);
            setShowLoadingScreen(true);
            
            setTimeout(() => {
              if (user.Role === 'Admin') {
                navigate('/admin');
              } else {
                navigate('/user');
              }
            }, 800);
          }
        } catch (err) {
          console.error('2FA verification error:', err);
          console.error('Error response:', err.response?.data);
          if (err.response && err.response.data && err.response.data.error) {
            setError(err.response.data.error);
          } else if (err.response && err.response.data && err.response.data.message) {
            setError(err.response.data.message);
          } else {
            setError('Invalid verification code. Please make sure you\'re entering the current code from your authenticator app.');
          }
          setLoading(false);
          setTwoFactorCode('');
        }
        return;
      }

      // Normal login flow
      const res = await axios.post(`${API_URL}/api/users/login`, {
        Email: email,
        Password: password
      });
      
      // Check if it's a client or user login
      if (res.data.client) {
        const client = res.data.client;
        setUser(client);
        
        if (client.token) {
          localStorage.setItem('token', client.token);
        }
        
        setLoading(false);
        setShowLoadingScreen(true);
        
        setTimeout(() => {
          navigate('/client');
        }, 800);
      } else if (res.data.user) {
      const user = res.data.user;
      setUser(user);
      
      if (user.token) {
        localStorage.setItem('token', user.token);
      }
      
      setLoading(false);
      setShowLoadingScreen(true);
      
      setTimeout(() => {
        if (user.Role === 'Admin') {
          navigate('/admin');
        } else {
          navigate('/user');
        }
      }, 800);
      } else if (res.data.requires2FA) {
        // 2FA is required
        setRequires2FA(true);
        setUserId(res.data.userId);
        setTempToken(res.data.tempToken);
        setLoading(false);
      } else {
        setError('Invalid response from server');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else if (err.response && err.response.data && err.response.data.message) {
        setError(err.response.data.message);
      } else {
        setError('Login failed. Please check your credentials.');
      }
      setLoading(false);
    }
  };

  const handleBackToPassword = () => {
    setRequires2FA(false);
    setTwoFactorCode('');
    setUseBackupCode(false);
    setError('');
  };

  if (showLoadingScreen) {
    return <LoadingScreen message="Signing you in..." />;
  }

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordLoading(true);

    try {
      await axios.post(`${API_URL}/api/password-reset/request`, { email: forgotPasswordEmail });
      setForgotPasswordStep(2);
      setForgotPasswordLoading(false);
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      setForgotPasswordLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');
    setForgotPasswordLoading(true);

    try {
      await axios.post(`${API_URL}/api/password-reset/verify-otp`, { email: forgotPasswordEmail, otp: forgotPasswordOtp });
      setForgotPasswordStep(3);
      setForgotPasswordLoading(false);
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setForgotPasswordLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotPasswordError('');

    if (newPassword !== confirmPassword) {
      setForgotPasswordError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setForgotPasswordError('Password must be at least 6 characters long');
      return;
    }

    setForgotPasswordLoading(true);

    try {
      await axios.post(`${API_URL}/api/password-reset/reset`, {
        email: forgotPasswordEmail,
        otp: forgotPasswordOtp,
        newPassword
      });
      setForgotPasswordStep(4);
      setForgotPasswordLoading(false);
    } catch (err) {
      setForgotPasswordError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      setForgotPasswordLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    setShowForgotPassword(false);
    setForgotPasswordStep(1);
    setForgotPasswordEmail('');
    setForgotPasswordOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotPasswordError('');
  };


  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100vw', 
      display: 'flex',
      fontFamily: theme.typography.fontFamily,
      overflow: 'hidden'
    }}>
      {/* Left Column - Sign In Form */}
      <div style={{
        flex: '1',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing['2xl'],
        background: theme.colors.white,
        minHeight: '100vh',
        overflowY: 'auto'
      }}>
        <div style={{ 
          width: '100%',
          maxWidth: (requires2FA && useBackupCode) || showForgotPassword ? '600px' : '480px'
        }}>
          {/* Logo/Header */}
          <div style={{ 
            textAlign: 'left', 
            marginBottom: theme.spacing['2xl'] 
          }}>
            <h2 style={{ 
              margin: 0,
              fontSize: theme.typography.fontSizes['3xl'], 
              fontWeight: theme.typography.fontWeights.bold, 
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing.xs
            }}>
              {showForgotPassword 
                ? (forgotPasswordStep === 4 ? 'Password Reset!' : 'Forgot Password')
                : 'Welcome Back'}
            </h2>
            <p style={{
              margin: 0,
              fontSize: theme.typography.fontSizes.base,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeights.normal
            }}>
              {showForgotPassword 
                ? (forgotPasswordStep === 1 && "Enter your email to receive an OTP") ||
                  (forgotPasswordStep === 2 && "Enter the OTP sent to your email") ||
                  (forgotPasswordStep === 3 && "Create a new password") ||
                  (forgotPasswordStep === 4 && "Your password has been reset successfully")
                : 'Sign in to continue to your account'}
            </p>
          </div>

        {!showForgotPassword ? (
        <form onSubmit={handleSubmit}>
          {!requires2FA ? (
            <>
          <Input
            label="Email Address"
            type="email"
            name="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="Enter your email"
            style={{ marginBottom: theme.spacing.lg }}
          />

          <div style={{ marginBottom: theme.spacing.sm }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.semibold,
              color: theme.colors.textPrimary,
            }}>
              Password
              <span style={{ color: theme.colors.error, marginLeft: theme.spacing.xs }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{
                  width: '100%',
                  padding: `${theme.spacing.sm} ${theme.spacing['2xl']} ${theme.spacing.sm} ${theme.spacing.md}`,
                  borderRadius: theme.radius.md,
                  border: `1px solid ${theme.colors.border}`,
                  fontSize: theme.typography.fontSizes.base,
                  fontFamily: theme.typography.fontFamily,
                  outline: 'none',
                  transition: `all ${theme.transitions.normal}`,
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary;
                  e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primaryBg}`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.border;
                  e.target.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: theme.spacing.md,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.textSecondary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: theme.spacing.xs,
                  transition: 'color 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary}
                onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div style={{
            textAlign: 'right',
            marginBottom: theme.spacing.lg
          }}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              style={{
                background: 'none',
                border: 'none',
                color: theme.colors.primary,
                cursor: 'pointer',
                fontSize: theme.typography.fontSizes.sm,
                textDecoration: 'none',
                padding: 0,
                fontWeight: theme.typography.fontWeights.medium
              }}
              onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
              onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
            >
              Forgot Password?
            </button>
          </div>
            </>
          ) : (
            <>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: theme.spacing.sm,
                marginBottom: theme.spacing.lg,
                cursor: 'pointer',
                color: theme.colors.primary
              }}
              onClick={handleBackToPassword}
              >
                <FaArrowLeft />
                <span style={{ fontSize: theme.typography.fontSizes.sm }}>
                  Back to password
                </span>
              </div>

              <div style={{
                background: theme.colors.primaryBg,
                padding: theme.spacing.lg,
                borderRadius: theme.radius.md,
                marginBottom: theme.spacing.lg,
                textAlign: 'center'
              }}>
                <FaShieldAlt style={{ 
                  fontSize: '32px', 
                  color: theme.colors.primary,
                  marginBottom: theme.spacing.sm
                }} />
                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing.xs
                }}>
                  {useBackupCode 
                    ? 'Enter your backup code (8 characters for one-time, 12 for permanent)'
                    : 'Enter the 6-digit code from your authenticator app'}
                </p>
                {!useBackupCode && (
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.xs,
                    color: theme.colors.textSecondary,
                    fontStyle: 'italic'
                  }}>
                    💡 Codes refresh every 30 seconds. Make sure you're entering the current code.
                  </p>
                )}
              </div>

              <OTPInput
                length={useBackupCode ? 12 : 6}
                value={twoFactorCode}
                onChange={(value) => {
                  setTwoFactorCode(value);
                  setError(''); // Clear error when user types
                }}
                onComplete={(value) => {
                  // Auto-submit when complete (optional)
                  // You can remove this if you want manual submit only
                }}
                isBackupCode={useBackupCode}
                label={useBackupCode ? "Backup Code (8 or 12 characters)" : "2FA Code"}
                error={error ? 'Invalid code' : false}
                disabled={loading}
              />

              <div style={{
                textAlign: 'center',
                marginBottom: theme.spacing.lg
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setUseBackupCode(!useBackupCode);
                    setTwoFactorCode('');
                    setError('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: theme.colors.primary,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSizes.sm,
                    textDecoration: 'underline',
                    padding: 0
                  }}
                >
                  {useBackupCode ? 'Use authenticator code instead' : 'Use backup code instead'}
                </button>
              </div>
            </>
          )}

          {error && (
            <div style={{ 
              background: theme.colors.errorLight,
              color: theme.colors.error,
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              borderRadius: theme.radius.md,
              marginBottom: theme.spacing.lg,
              fontSize: theme.typography.fontSizes.sm,
              fontWeight: theme.typography.fontWeights.medium,
              border: `1px solid ${theme.colors.error}`
            }}>
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            disabled={loading}
            style={{ 
              width: '100%',
              padding: `${theme.spacing.md} ${theme.spacing.lg}`,
              fontSize: theme.typography.fontSizes.base,
              fontWeight: theme.typography.fontWeights.semibold
            }}
          >
            {loading 
              ? (requires2FA ? 'Verifying...' : 'Signing in...') 
              : (requires2FA ? 'Verify Code' : 'Sign In')
            }
          </Button>
        </form>
        ) : (
          <>
            {/* Step 1: Email Input */}
            {forgotPasswordStep === 1 && (
              <form onSubmit={handleRequestOTP}>
                <Input
                  label="Email Address"
                  type="email"
                  name="email"
                  value={forgotPasswordEmail}
                  onChange={e => setForgotPasswordEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  style={{ marginBottom: theme.spacing.lg }}
                />

                {forgotPasswordError && (
                  <div style={{ 
                    background: theme.colors.errorLight,
                    color: theme.colors.error,
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.radius.md,
                    marginBottom: theme.spacing.lg,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.medium,
                    border: `1px solid ${theme.colors.error}`
                  }}>
                    {forgotPasswordError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={forgotPasswordLoading}
                  style={{ 
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    fontSize: theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.semibold,
                    marginBottom: theme.spacing.md
                  }}
                >
                  {forgotPasswordLoading ? 'Sending OTP...' : 'Send OTP'}
                </Button>

                <button
                  type="button"
                  onClick={handleBackToSignIn}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: theme.colors.primary,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSizes.sm,
                    padding: theme.spacing.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  <FaArrowLeft />
                  Back to Sign In
                </button>
              </form>
            )}

            {/* Step 2: OTP Verification */}
            {forgotPasswordStep === 2 && (
              <form onSubmit={handleVerifyOTP}>
                <div style={{
                  background: theme.colors.primaryBg,
                  padding: theme.spacing.lg,
                  borderRadius: theme.radius.md,
                  marginBottom: theme.spacing.lg,
                  textAlign: 'center'
                }}>
                  <FaKey style={{ 
                    fontSize: '32px', 
                    color: theme.colors.primary,
                    marginBottom: theme.spacing.sm
                  }} />
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.sm,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing.xs
                  }}>
                    We've sent a 6-digit OTP to
                  </p>
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSizes.sm,
                    color: theme.colors.textPrimary,
                    fontWeight: theme.typography.fontWeights.semibold
                  }}>
                    {forgotPasswordEmail}
                  </p>
                </div>

                <OTPInput
                  length={6}
                  value={forgotPasswordOtp}
                  onChange={(value) => {
                    setForgotPasswordOtp(value);
                    setForgotPasswordError('');
                  }}
                  label="Enter OTP"
                  error={forgotPasswordError ? 'Invalid OTP' : false}
                  disabled={forgotPasswordLoading}
                />

                {forgotPasswordError && (
                  <div style={{ 
                    background: theme.colors.errorLight,
                    color: theme.colors.error,
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.radius.md,
                    marginBottom: theme.spacing.lg,
                    marginTop: theme.spacing.lg,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.medium,
                    border: `1px solid ${theme.colors.error}`
                  }}>
                    {forgotPasswordError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={forgotPasswordLoading || forgotPasswordOtp.length !== 6}
                  style={{ 
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    fontSize: theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.semibold,
                    marginTop: theme.spacing.lg,
                    marginBottom: theme.spacing.md
                  }}
                >
                  {forgotPasswordLoading ? 'Verifying...' : 'Verify OTP'}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotPasswordStep(1);
                    setForgotPasswordOtp('');
                    setForgotPasswordError('');
                  }}
                  style={{
                    width: '100%',
                    background: 'none',
                    border: 'none',
                    color: theme.colors.primary,
                    cursor: 'pointer',
                    fontSize: theme.typography.fontSizes.sm,
                    padding: theme.spacing.sm,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: theme.spacing.xs
                  }}
                >
                  <FaArrowLeft />
                  Change Email
                </button>
              </form>
            )}

            {/* Step 3: New Password */}
            {forgotPasswordStep === 3 && (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.textPrimary,
                  }}>
                    New Password
                    <span style={{ color: theme.colors.error, marginLeft: theme.spacing.xs }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="newPassword"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      required
                      placeholder="Enter new password"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing['2xl']} ${theme.spacing.sm} ${theme.spacing.md}`,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${theme.colors.border}`,
                        fontSize: theme.typography.fontSizes.base,
                        fontFamily: theme.typography.fontFamily,
                        outline: 'none',
                        transition: `all ${theme.transitions.normal}`,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = theme.colors.primary;
                        e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primaryBg}`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: theme.spacing.md,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: theme.colors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: theme.spacing.xs,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary}
                      onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
                    >
                      {showNewPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                <div style={{ marginBottom: theme.spacing.lg }}>
                  <label style={{
                    display: 'block',
                    marginBottom: theme.spacing.xs,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.semibold,
                    color: theme.colors.textPrimary,
                  }}>
                    Confirm Password
                    <span style={{ color: theme.colors.error, marginLeft: theme.spacing.xs }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="confirmPassword"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      placeholder="Confirm new password"
                      style={{
                        width: '100%',
                        padding: `${theme.spacing.sm} ${theme.spacing['2xl']} ${theme.spacing.sm} ${theme.spacing.md}`,
                        borderRadius: theme.radius.md,
                        border: `1px solid ${theme.colors.border}`,
                        fontSize: theme.typography.fontSizes.base,
                        fontFamily: theme.typography.fontFamily,
                        outline: 'none',
                        transition: `all ${theme.transitions.normal}`,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = theme.colors.primary;
                        e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primaryBg}`;
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = theme.colors.border;
                        e.target.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={{
                        position: 'absolute',
                        right: theme.spacing.md,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: theme.colors.textSecondary,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: theme.spacing.xs,
                        transition: 'color 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = theme.colors.primary}
                      onMouseLeave={(e) => e.currentTarget.style.color = theme.colors.textSecondary}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {forgotPasswordError && (
                  <div style={{ 
                    background: theme.colors.errorLight,
                    color: theme.colors.error,
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    borderRadius: theme.radius.md,
                    marginBottom: theme.spacing.lg,
                    fontSize: theme.typography.fontSizes.sm,
                    fontWeight: theme.typography.fontWeights.medium,
                    border: `1px solid ${theme.colors.error}`
                  }}>
                    {forgotPasswordError}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  disabled={forgotPasswordLoading}
                  style={{ 
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    fontSize: theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.semibold
                  }}
                >
                  {forgotPasswordLoading ? 'Resetting Password...' : 'Reset Password'}
                </Button>
              </form>
            )}

            {/* Step 4: Success */}
            {forgotPasswordStep === 4 && (
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: theme.colors.successLight,
                  marginBottom: theme.spacing.lg
                }}>
                  <FaCheckCircle style={{ fontSize: '48px', color: theme.colors.success }} />
                </div>

                <p style={{
                  margin: 0,
                  fontSize: theme.typography.fontSizes.base,
                  color: theme.colors.textSecondary,
                  marginBottom: theme.spacing['2xl'],
                  lineHeight: 1.6
                }}>
                  Your password has been reset successfully. You can now sign in with your new password.
                </p>

                <Button
                  variant="primary"
                  onClick={handleBackToSignIn}
                  style={{ 
                    width: '100%',
                    padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                    fontSize: theme.typography.fontSizes.base,
                    fontWeight: theme.typography.fontWeights.semibold
                  }}
                >
                  Back to Sign In
                </Button>
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {/* Right Column - Image with Gradient Background */}
      <div 
        className="signin-right-column"
        style={{
          flex: '1',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          overflow: 'hidden'
        }}
      >
        <style>{`
          @keyframes gradientMove {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }
          @media (max-width: 768px) {
            .signin-right-column {
              display: none !important;
            }
          }
        `}</style>
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(135deg, #818cf8 0%, #6366f1 20%, #4f46e5 40%, #6366f1 60%, #818cf8 80%, #a5b4fc 100%)`,
          backgroundSize: '200% 200%',
          animation: 'gradientMove 8s ease infinite',
          zIndex: 0
        }} />
        
        {/* Image Container */}
        <div style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: theme.spacing['2xl']
        }}>
          <img 
            src={signinImage} 
            alt="Sign In" 
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              borderRadius: theme.radius.xl
            }}
          />
        </div>

        {/* Decorative overlay elements */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 50%, rgba(255, 255, 255, 0.15) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%)',
          zIndex: 1
        }} />
      </div>
    </div>
  );
}

export default SignIn; 