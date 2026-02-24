import React, { useState, useRef, useEffect } from 'react';
import { theme } from '../theme';

export const OTPInput = ({ 
  length = 6, 
  value = '', 
  onChange, 
  onComplete,
  error = false,
  disabled = false,
  label = '',
  isBackupCode = false
}) => {
  const [digits, setDigits] = useState(Array(length).fill(''));
  const inputRefs = useRef([]);

  useEffect(() => {
    // Initialize digits from value
    if (value) {
      const valueArray = value.split('').slice(0, length);
      const newDigits = Array(length).fill('').map((_, i) => valueArray[i] || '');
      setDigits(newDigits);
    } else {
      setDigits(Array(length).fill(''));
    }
  }, [value, length]);

  useEffect(() => {
    // Focus first empty input
    const firstEmptyIndex = digits.findIndex(d => !d);
    if (firstEmptyIndex !== -1 && inputRefs.current[firstEmptyIndex]) {
      inputRefs.current[firstEmptyIndex].focus();
    } else if (digits.every(d => d) && inputRefs.current[length - 1]) {
      inputRefs.current[length - 1].focus();
    }
  }, [digits, length]);

  const handleChange = (index, newValue) => {
    if (disabled) return;

    // For backup codes: allow alphanumeric, for 2FA: only digits
    let cleanedValue = isBackupCode 
      ? newValue.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      : newValue.replace(/\D/g, '');

    // Only allow single character per box
    if (cleanedValue.length > 1) {
      cleanedValue = cleanedValue.slice(-1);
    }

    const newDigits = [...digits];
    newDigits[index] = cleanedValue;
    setDigits(newDigits);

    // Combine all digits
    const combinedValue = newDigits.join('');
    onChange(combinedValue);

    // Auto-focus next input if value entered
    if (cleanedValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if all digits are filled
    if (newDigits.every(d => d) && onComplete) {
      onComplete(combinedValue);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const cleanedData = isBackupCode
      ? pastedData.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, length)
      : pastedData.replace(/\D/g, '').slice(0, length);

    if (cleanedData) {
      const newDigits = Array(length).fill('').map((_, i) => cleanedData[i] || '');
      setDigits(newDigits);
      onChange(cleanedData);
      
      // Focus the next empty input or last input
      const nextEmptyIndex = newDigits.findIndex((d, i) => !d && i >= cleanedData.length);
      const focusIndex = nextEmptyIndex !== -1 ? nextEmptyIndex : Math.min(cleanedData.length, length - 1);
      inputRefs.current[focusIndex]?.focus();
      
      if (cleanedData.length === length && onComplete) {
        onComplete(cleanedData);
      }
    }
  };

  const filledCount = digits.filter(d => d).length;
  const remainingCount = length - filledCount;

  return (
    <div style={{ marginBottom: theme.spacing.lg }}>
      {label && (
        <label style={{
          display: 'block',
          marginBottom: theme.spacing.md,
          fontSize: theme.typography.fontSizes.sm,
          fontWeight: theme.typography.fontWeights.semibold,
          color: theme.colors.textPrimary,
          textAlign: 'center'
        }}>
          {label}
        </label>
      )}
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: length > 8 ? theme.spacing.xs : theme.spacing.sm,
        marginBottom: theme.spacing.md,
        flexWrap: length > 10 ? 'wrap' : 'nowrap',
        maxWidth: '100%'
      }}>
        {digits.map((digit, index) => {
          const isActive = index === digits.findIndex(d => !d) || (digits.every(d => d) && index === length - 1);
          const hasValue = !!digit;
          
          // Adjust size based on length
          const inputWidth = length > 10 ? '40px' : length > 8 ? '44px' : '56px';
          const inputHeight = length > 10 ? '48px' : length > 8 ? '52px' : '64px';
          const fontSize = length > 10 ? theme.typography.fontSizes.lg : length > 8 ? theme.typography.fontSizes.xl : theme.typography.fontSizes['2xl'];
          
          return (
            <input
              key={index}
              ref={el => inputRefs.current[index] = el}
              type="text"
              inputMode={isBackupCode ? "text" : "numeric"}
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={disabled}
              style={{
                width: inputWidth,
                height: inputHeight,
                minWidth: inputWidth,
                textAlign: 'center',
                fontSize: fontSize,
                fontWeight: theme.typography.fontWeights.bold,
                fontFamily: 'monospace',
                borderRadius: theme.radius.md,
                border: `2px solid ${isActive 
                  ? theme.colors.primary 
                  : hasValue 
                    ? theme.colors.primary 
                    : error 
                      ? theme.colors.error 
                      : theme.colors.border}`,
                background: hasValue 
                  ? theme.colors.primaryBg 
                  : theme.colors.white,
                color: theme.colors.textPrimary,
                outline: 'none',
                transition: `all ${theme.transitions.normal}`,
                boxShadow: isActive 
                  ? `0 0 0 3px ${theme.colors.primaryBg}` 
                  : 'none',
                cursor: disabled ? 'not-allowed' : 'text',
                opacity: disabled ? 0.6 : 1,
                flexShrink: 0
              }}
              onFocus={(e) => {
                e.target.select();
              }}
            />
          );
        })}
      </div>

      {/* Status message */}
      <div style={{
        background: theme.colors.primaryBg || '#f0f4ff',
        borderRadius: theme.radius.md,
        padding: `${theme.spacing.sm} ${theme.spacing.md}`,
        textAlign: 'center',
        marginTop: theme.spacing.sm
      }}>
        <p style={{
          margin: 0,
          fontSize: theme.typography.fontSizes.sm,
          color: theme.colors.textSecondary,
          fontWeight: theme.typography.fontWeights.medium
        }}>
          {remainingCount > 0 
            ? `${remainingCount} ${isBackupCode ? 'character' : remainingCount === 1 ? 'digit' : 'digits'} left`
            : 'Complete'}
        </p>
      </div>

      {error && (
        <p style={{
          margin: `${theme.spacing.xs} 0 0 0`,
          fontSize: theme.typography.fontSizes.xs,
          color: theme.colors.error,
          textAlign: 'center'
        }}>
          {error}
        </p>
      )}
    </div>
  );
};

