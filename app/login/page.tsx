'use client';

import { useState, useEffect, startTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Activity, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/lib/context';
import { getAuthApiService, createAuthService } from '@/services';
import type { LoginCredentials, OTPValidation } from '@/types/auth';
import { i18n, replacePlaceholders } from '@/config/i18n';
import { appRoutes } from '@/config/routes';
import { safeFocusElement } from '@/utils/domUtils';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (res?.message) return String(res.message);
    if (res?.error) return String(res.error);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export default function LoginRoutePage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const { platformSetupComplete, setPlatformSetupComplete } = useApp();

  const apiService = useMemo(() => getAuthApiService(), []);
  const authService = useMemo(() => createAuthService(apiService), [apiService]);

  const [formData, setFormData] = useState<LoginCredentials>({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '', general: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasskeyForm, setShowPasskeyForm] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [passkeyError, setPasskeyError] = useState('');
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeyValues, setPasskeyValues] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(180);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  const [isForgotPasswordLoading, setIsForgotPasswordLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    if (platformSetupComplete) {
      router.replace(appRoutes.home);
    } else {
      router.replace(appRoutes.platformSetup);
    }
  }, [isAuthenticated, authLoading, platformSetupComplete, router]);

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = { email: '', password: '', general: '' };
    if (!formData.email?.trim()) newErrors.email = i18n.login.errors.emailRequired;
    if (!formData.password?.trim()) newErrors.password = i18n.login.errors.passwordRequired;
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    try {
      const response = await authService.login(formData);
      showToast({
        message: response.message || i18n.login.success.otpSent,
        type: 'success',
        duration: 3000,
      });
      setShowPasskeyForm(true);
      setTimeLeft(180);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, i18n.login.errors.otpSendFailed);
      showToast({ message: errorMessage, type: 'error', duration: 4000 });
      setErrors((prev) => ({ ...prev, general: errorMessage }));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasskeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const passkey = passkeyValues.join('');
    if (passkey.length !== 6) {
      setPasskeyError(i18n.login.passkey.errors.invalidLength);
      return;
    }
    setIsPasskeyLoading(true);
    setPasskeyError('');
    try {
      const otpData: OTPValidation = { email: formData.email, otp_code: passkey };
      const authResponse = await authService.validateOTP(otpData);
      const token = authResponse.access_token;
      if (!token) {
        throw new Error('Missing access token from server');
      }
      login(authResponse, token);
      setPlatformSetupComplete(false);

      const firstName = authResponse.user?.first_name || '';
      const lastName = authResponse.user?.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim();
      showToast({
        message: replacePlaceholders(i18n.login.success.welcomeBack, {
          name: fullName || authResponse.user?.email || authResponse.email || authResponse.username || 'there',
        }),
        type: 'success',
        duration: 3000,
      });
      startTransition(() => {
        router.replace(appRoutes.platformSetup);
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, i18n.login.errors.invalidOtp);
      setPasskeyError(errorMessage);
      showToast({ message: errorMessage, type: 'error', duration: 4000 });
      setPasskeyValues(['', '', '', '', '', '']);
    } finally {
      setIsPasskeyLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowPasskeyForm(false);
    setPasskeyError('');
    setPasskeyValues(['', '', '', '', '', '']);
    setTimeLeft(180);
  };

  const handlePasskeyInputChange = (index: number, value: string) => {
    const alphanumericValue = value.replace(/[^a-zA-Z0-9]/g, '');
    const newValues = [...passkeyValues];
    newValues[index] = alphanumericValue.slice(0, 1).toUpperCase();
    setPasskeyValues(newValues);
    if (alphanumericValue && index < 5) {
      safeFocusElement(`passkey-${index + 1}`);
    }
    setPasskeyError('');
  };

  const handlePasskeyPaste = (e: React.ClipboardEvent<HTMLInputElement>, index: number) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const alphanumericValue = pastedText.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (alphanumericValue.length > 0) {
      const newValues = [...passkeyValues];
      const charsToPaste = alphanumericValue.slice(0, 6 - index).split('');
      charsToPaste.forEach((char, i) => {
        if (index + i < 6) newValues[index + i] = char;
      });
      setPasskeyValues(newValues);
      setPasskeyError('');
      const nextIndex = Math.min(index + charsToPaste.length, 5);
      safeFocusElement(`passkey-${nextIndex}`);
    }
  };

  const handlePasskeyKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !passkeyValues[index] && index > 0) {
      safeFocusElement(`passkey-${index - 1}`);
    }
  };

  useEffect(() => {
    if (!showPasskeyForm) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showPasskeyForm]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResendPasskey = async () => {
    setIsResending(true);
    setPasskeyError('');
    try {
      const response = await authService.login(formData);
      showToast({
        message: response.message || i18n.login.success.otpSent,
        type: 'success',
        duration: 3000,
      });
      setTimeLeft(180);
      setPasskeyValues(['', '', '', '', '', '']);
      safeFocusElement('passkey-0');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, i18n.login.errors.otpSendFailed);
      showToast({ message: errorMessage, type: 'error', duration: 4000 });
      setPasskeyError(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordError('');
    if (!forgotPasswordEmail?.trim()) {
      setForgotPasswordError(i18n.login.forgotPassword.errors.emailRequired);
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotPasswordEmail)) {
      setForgotPasswordError(i18n.login.forgotPassword.errors.invalidEmail);
      return;
    }
    setIsForgotPasswordLoading(true);
    try {
      await authService.forgotPassword(forgotPasswordEmail);
      showToast({ message: i18n.login.forgotPassword.success, type: 'success', duration: 3000 });
      setShowForgotPassword(false);
      setForgotPasswordEmail('');
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, i18n.login.forgotPassword.errors.sendFailed);
      setForgotPasswordError(errorMessage);
      showToast({ message: errorMessage, type: 'error', duration: 4000 });
    } finally {
      setIsForgotPasswordLoading(false);
    }
  };

  if (authLoading || isAuthenticated) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--gradient-brand)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 28px rgba(0,120,255,0.25)',
            }}
          >
            <Activity size={26} strokeWidth={1.75} color="white" />
          </div>
        </div>

        {showForgotPassword ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowForgotPassword(false)}
                style={{ gap: 6 }}
              >
                <ArrowLeft size={16} />
                {i18n.login.forgotPassword.backButton}
              </button>
            </div>
            <h2 className="mb-4" style={{ fontSize: '1.25rem' }}>
              {i18n.login.forgotPassword.title}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 24 }}>
              {i18n.login.forgotPassword.subtitle}
            </p>
            <form className="login-form-stack" onSubmit={handleForgotPassword}>
              <div className="flex-col gap-2">
                <label className="text-sm" style={{ fontWeight: 600 }} htmlFor="forgot_email">
                  {i18n.login.forgotPassword.emailLabel}
                </label>
                <input
                  id="forgot_email"
                  className="input"
                  type="email"
                  placeholder={i18n.login.forgotPassword.emailPlaceholder}
                  value={forgotPasswordEmail}
                  onChange={(e) => {
                    setForgotPasswordEmail(e.target.value);
                    setForgotPasswordError('');
                  }}
                  disabled={isForgotPasswordLoading}
                />
                {forgotPasswordError ? <div className="login-error-banner">{forgotPasswordError}</div> : null}
              </div>
              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={isForgotPasswordLoading}
                style={{ justifyContent: 'center' }}
              >
                {isForgotPasswordLoading ? i18n.login.otp.verifying : i18n.login.forgotPassword.sendButton}
              </button>
            </form>
          </>
        ) : showPasskeyForm ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleBackToLogin} style={{ gap: 6 }}>
                <ArrowLeft size={16} />
                {i18n.login.passkey.backButton}
              </button>
            </div>
            <h2 className="mb-4" style={{ fontSize: '1.25rem', textAlign: 'center' }}>
              {replacePlaceholders(i18n.login.passkey.title, { appName: i18n.common.appName })}
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                marginBottom: 24,
                textAlign: 'center',
              }}
            >
              {i18n.login.passkey.subtitle}
            </p>
            <form className="login-form-stack" onSubmit={handlePasskeySubmit}>
              <div className="flex-col gap-2">
                <span className="text-sm" style={{ fontWeight: 600 }}>
                  {i18n.login.passkey.label}
                </span>
                <div className="login-passkey-row">
                  {passkeyValues.map((value, index) => (
                    <input
                      key={index}
                      id={`passkey-${index}`}
                      className="login-passkey-cell"
                      type="text"
                      inputMode="text"
                      maxLength={1}
                      value={value}
                      onChange={(e) => handlePasskeyInputChange(index, e.target.value)}
                      onPaste={(e) => handlePasskeyPaste(e, index)}
                      onKeyDown={(e) => handlePasskeyKeyDown(index, e)}
                      disabled={isPasskeyLoading || timeLeft === 0}
                      autoFocus={index === 0}
                    />
                  ))}
                </div>
                {passkeyError ? <div className="login-error-banner">{passkeyError}</div> : null}
              </div>
              {timeLeft > 0 ? (
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  {i18n.login.passkey.resendPrefix} {formatTime(timeLeft)}
                </p>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    className="login-link-btn"
                    onClick={handleResendPasskey}
                    disabled={isResending || isPasskeyLoading}
                  >
                    {isResending ? i18n.login.sendingOtp : i18n.login.passkey.resend}
                  </button>
                </div>
              )}
              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={isPasskeyLoading || timeLeft === 0 || passkeyValues.join('').length !== 6}
                style={{ justifyContent: 'center' }}
              >
                {isPasskeyLoading ? i18n.login.otp.verifying : i18n.login.passkey.loginButton}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: '1.25rem', marginBottom: 8, textAlign: 'center' }}>
              {replacePlaceholders(i18n.login.title, { appName: i18n.common.appName })}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 24, textAlign: 'center' }}>
              {i18n.login.subtitle}
            </p>
            <form className="login-form-stack" onSubmit={handleSubmit}>
              <div className="flex-col gap-2">
                <label className="text-sm" style={{ fontWeight: 600 }} htmlFor="email">
                  {i18n.common.labels.email}
                </label>
                <input
                  id="email"
                  className="input"
                  type="email"
                  placeholder={i18n.common.placeholders.enterEmail}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading || authLoading}
                />
                {errors.email ? <div className="login-error-banner">{errors.email}</div> : null}
              </div>
              <div className="flex-col gap-2">
                <label className="text-sm" style={{ fontWeight: 600 }} htmlFor="password">
                  {i18n.common.labels.password}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="password"
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={i18n.common.placeholders.enterPassword}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    disabled={isLoading || authLoading}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading || authLoading}
                    aria-label={showPassword ? i18n.login.aria.hidePassword : i18n.login.aria.showPassword}
                    style={{
                      position: 'absolute',
                      right: 10,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: 4,
                      display: 'flex',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password ? <div className="login-error-banner">{errors.password}</div> : null}
                <button
                  type="button"
                  className="login-link-btn"
                  style={{ alignSelf: 'flex-end', marginTop: 4 }}
                  onClick={() => setShowForgotPassword(true)}
                >
                  {i18n.login.forgotPasswordLink}
                </button>
              </div>
              {errors.general ? <div className="login-error-banner">{errors.general}</div> : null}
              <button
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={isLoading || authLoading}
                style={{ justifyContent: 'center' }}
              >
                {isLoading ? i18n.login.sendingOtp : i18n.login.loginButton}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
