'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { CognixBrandLockup } from '@/components/CognixBrandLockup';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useApp } from '@/lib/context';
import { getAuthApiService, createAuthService } from '@/services';
import type { ResetPasswordData } from '@/types/auth';
import { i18n } from '@/config/i18n';
import { appRoutes } from '@/config/routes';

function getErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const res = (error as { response?: { data?: { message?: string; error?: string } } }).response?.data;
    if (res?.message) return String(res.message);
    if (res?.error) return String(res.error);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function validatePassword(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 8) errors.push(i18n.login.resetPassword.errors.passwordTooShort);
  if (!/[A-Z]/.test(password)) errors.push(i18n.login.resetPassword.errors.passwordNoUppercase);
  if (!/[a-z]/.test(password)) errors.push(i18n.login.resetPassword.errors.passwordNoLowercase);
  if (!/\d/.test(password)) errors.push(i18n.login.resetPassword.errors.passwordNoDigit);
  return errors;
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { setPlatformSetupComplete } = useApp();

  const apiService = useMemo(() => getAuthApiService(), []);
  const authService = useMemo(() => createAuthService(apiService), [apiService]);

  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [isValidatingParams, setIsValidatingParams] = useState(true);
  const [resetPasswordData, setResetPasswordData] = useState<ResetPasswordData>({
    token: '',
    email: '',
    new_password: '',
    confirm_password: '',
  });
  const [resetPasswordErrors, setResetPasswordErrors] = useState({
    new_password: '',
    confirm_password: '',
    general: '',
  });
  const [isResetPasswordLoading, setIsResetPasswordLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let tokenParam = searchParams.get('token');
    let emailParam = searchParams.get('email');

    if (typeof window !== 'undefined' && (!tokenParam || !emailParam)) {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        tokenParam = tokenParam || urlParams.get('token');
        emailParam = emailParam || urlParams.get('email');
      } catch {
        /* ignore */
      }
    }

    if (tokenParam && emailParam) {
      setToken(tokenParam);
      setEmail(emailParam);
      setResetPasswordData((prev) => ({
        ...prev,
        token: tokenParam!,
        email: decodeURIComponent(emailParam!),
      }));
      setIsValidatingParams(false);
      return;
    }

    if (typeof window !== 'undefined') {
      showToast({
        message: i18n.login.resetPassword.invalidLink,
        type: 'error',
        duration: 5000,
      });
      const t = window.setTimeout(() => {
        router.push(appRoutes.login);
      }, 2000);
      setIsValidatingParams(false);
      return () => window.clearTimeout(t);
    }

    setIsValidatingParams(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when URL search params are available
  }, [searchParams]);

  const handleResetPasswordInputChange = (field: keyof ResetPasswordData, value: string) => {
    setResetPasswordData((prev) => ({ ...prev, [field]: value }));
    if (resetPasswordErrors[field as keyof typeof resetPasswordErrors]) {
      setResetPasswordErrors((prev) => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors = {
      new_password: '',
      confirm_password: '',
      general: '',
    };

    if (!resetPasswordData.new_password?.trim()) {
      newErrors.new_password = i18n.login.resetPassword.errors.passwordRequired;
    } else {
      const passwordErrors = validatePassword(resetPasswordData.new_password);
      if (passwordErrors.length > 0) {
        newErrors.new_password = passwordErrors[0];
      }
    }

    if (!resetPasswordData.confirm_password?.trim()) {
      newErrors.confirm_password = i18n.login.resetPassword.errors.confirmPasswordRequired;
    } else if (resetPasswordData.new_password !== resetPasswordData.confirm_password) {
      newErrors.confirm_password = i18n.login.resetPassword.errors.passwordMismatch;
    }

    setResetPasswordErrors(newErrors);
    if (newErrors.new_password || newErrors.confirm_password) return;

    setIsResetPasswordLoading(true);
    try {
      const authResponse = await authService.resetPasswordWithToken(resetPasswordData);
      showToast({
        message: i18n.login.resetPassword.success,
        type: 'success',
        duration: 3000,
      });

      if (authResponse.access_token) {
        login(authResponse, authResponse.access_token);
        setPlatformSetupComplete(false);
        router.push(appRoutes.platformSetup);
      } else {
        router.push(appRoutes.login);
      }
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error, i18n.login.resetPassword.errors.resetFailed);
      setResetPasswordErrors((prev) => ({ ...prev, general: errorMessage }));
      showToast({ message: errorMessage, type: 'error', duration: 4000 });
    } finally {
      setIsResetPasswordLoading(false);
    }
  };

  if (isValidatingParams) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  if (!token || !email) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Redirecting to sign in…
        </div>
      </div>
    );
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link href={appRoutes.home} aria-label="Go to home" style={{ display: 'inline-block', width: '100%' }}>
            <CognixBrandLockup showWordmark={false} size="lg" />
          </Link>
          <h2 style={{ fontSize: '1.375rem', marginTop: 16, marginBottom: 8 }}>{i18n.login.resetPassword.title}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {i18n.login.resetPassword.subtitle}
          </p>
        </div>

        <ul className="login-password-reqs">
          <li>{i18n.login.resetPassword.requirements.minLength}</li>
          <li>{i18n.login.resetPassword.requirements.uppercase}</li>
          <li>{i18n.login.resetPassword.requirements.lowercase}</li>
          <li>{i18n.login.resetPassword.requirements.digit}</li>
        </ul>

        <form className="login-form-stack" onSubmit={handleResetPassword}>
          <div className="flex-col gap-2">
            <label className="text-sm" style={{ fontWeight: 600 }} htmlFor="new_password">
              {i18n.login.resetPassword.newPasswordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="new_password"
                className="input"
                type={showNewPassword ? 'text' : 'password'}
                placeholder={i18n.common.placeholders.enterPassword}
                value={resetPasswordData.new_password}
                onChange={(e) => handleResetPasswordInputChange('new_password', e.target.value)}
                disabled={isResetPasswordLoading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                disabled={isResetPasswordLoading}
                aria-label={showNewPassword ? i18n.login.aria.hidePassword : i18n.login.aria.showPassword}
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
                {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {resetPasswordErrors.new_password ? (
              <div className="login-error-banner">{resetPasswordErrors.new_password}</div>
            ) : null}
          </div>

          <div className="flex-col gap-2">
            <label className="text-sm" style={{ fontWeight: 600 }} htmlFor="confirm_password">
              {i18n.login.resetPassword.confirmPasswordLabel}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="confirm_password"
                className="input"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder={i18n.common.placeholders.enterPassword}
                value={resetPasswordData.confirm_password}
                onChange={(e) => handleResetPasswordInputChange('confirm_password', e.target.value)}
                disabled={isResetPasswordLoading}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isResetPasswordLoading}
                aria-label={showConfirmPassword ? i18n.login.aria.hidePassword : i18n.login.aria.showPassword}
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
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {resetPasswordErrors.confirm_password ? (
              <div className="login-error-banner">{resetPasswordErrors.confirm_password}</div>
            ) : null}
          </div>

          {resetPasswordErrors.general ? (
            <div className="login-error-banner">{resetPasswordErrors.general}</div>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={isResetPasswordLoading}
            style={{ justifyContent: 'center' }}
          >
            {isResetPasswordLoading ? i18n.login.otp.verifying : i18n.login.resetPassword.resetButton}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="login-bg">
          <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            Loading…
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
