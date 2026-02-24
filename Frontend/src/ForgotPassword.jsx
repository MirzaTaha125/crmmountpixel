import React, { useState } from 'react';
import axios from 'axios';
import getApiBaseUrl from './apiBase';
import { theme } from './theme';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { OTPInput } from './components/OTPInput';
import { FaLock, FaEnvelope, FaArrowLeft, FaCheckCircle, FaKey } from 'react-icons/fa';

const API_URL = getApiBaseUrl();

function ForgotPassword({ onBack }) {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password, 4: Success
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/password-reset/request`, { email });
      setStep(2);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/password-reset/verify-otp`, { email, otp });
      setStep(3);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid OTP. Please try again.');
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      await axios.post(`${API_URL}/api/password-reset/reset`, {
        email,
        otp,
        newPassword
      });
      setStep(4);
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      width: '100vw', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: `linear-gradient(135deg, ${theme.colors.primaryBg} 0%, ${theme.colors.background} 100%)`,
      fontFamily: theme.typography.fontFamily,
      padding: theme.spacing.lg
    }}>
      <div style={{ 
        background: theme.colors.white, 
        padding: theme.spacing['3xl'], 
        borderRadius: theme.radius['2xl'], 
        boxShadow: theme.shadows.xl, 
        width: '100%',
        maxWidth: '440px',
        border: `1px solid ${theme.colors.borderLight}`
      }}>
        {/* Header */}
        <div style={{ 
          textAlign: 'center', 
          marginBottom: theme.spacing['2xl'] 
        }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '64px',
            height: '64px',
            borderRadius: theme.radius.xl,
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.primaryDark} 100%)`,
            marginBottom: theme.spacing.lg,
            boxShadow: theme.shadows.md
          }}>
            <FaLock style={{ fontSize: '32px', color: theme.colors.white }} />
          </div>
          <h2 style={{ 
            margin: 0,
            fontSize: theme.typography.fontSizes['3xl'], 
            fontWeight: theme.typography.fontWeights.bold, 
            color: theme.colors.textPrimary,
            marginBottom: theme.spacing.xs
          }}>
            {step === 4 ? 'Password Reset!' : 'Forgot Password'}
          </h2>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSizes.base,
            color: theme.colors.textSecondary,
            fontWeight: theme.typography.fontWeights.normal
          }}>
            {step === 1 && "Enter your email to receive an OTP"}
            {step === 2 && "Enter the OTP sent to your email"}
            {step === 3 && "Create a new password"}
            {step === 4 && "Your password has been reset successfully"}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <form onSubmit={handleRequestOTP}>
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              icon={<FaEnvelope />}
              style={{ marginBottom: theme.spacing.lg }}
            />

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
                fontWeight: theme.typography.fontWeights.semibold,
                marginBottom: theme.spacing.md
              }}
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>

            <button
              type="button"
              onClick={onBack}
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
        {step === 2 && (
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
                {email}
              </p>
            </div>

            <OTPInput
              length={6}
              value={otp}
              onChange={(value) => {
                setOtp(value);
                setError('');
              }}
              label="Enter OTP"
              error={error ? 'Invalid OTP' : false}
              disabled={loading}
            />

            {error && (
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
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              disabled={loading || otp.length !== 6}
              style={{ 
                width: '100%',
                padding: `${theme.spacing.md} ${theme.spacing.lg}`,
                fontSize: theme.typography.fontSizes.base,
                fontWeight: theme.typography.fontWeights.semibold,
                marginTop: theme.spacing.lg,
                marginBottom: theme.spacing.md
              }}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep(1);
                setOtp('');
                setError('');
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
        {step === 3 && (
          <form onSubmit={handleResetPassword}>
            <Input
              label="New Password"
              type="password"
              name="newPassword"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              placeholder="Enter new password"
              icon={<FaLock />}
              style={{ marginBottom: theme.spacing.lg }}
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm new password"
              icon={<FaLock />}
              style={{ marginBottom: theme.spacing.lg }}
            />

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
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </Button>
          </form>
        )}

        {/* Step 4: Success */}
        {step === 4 && (
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
              onClick={onBack}
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
      </div>
    </div>
  );
}

export default ForgotPassword;
