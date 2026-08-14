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
import type { CompleteRegistrationData } from '@/types/auth';
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
  const { errors } = i18n.login.completeRegistration;
  const list: string[] = [];
  if (password.length < 8) list.push(errors.passwordTooShort);
  if (!/[A-Z]/.test(password)) list.push(errors.passwordNoUppercase);
  if (!/[a-z]/.test(password)) list.push(errors.passwordNoLowercase);
  if (!/\d/.test(password)) list.push(errors.passwordNoDigit);
  return list;
}

function PasswordField({
  id,
  label,
  placeholder,
  value,
  error,
  show,
  onToggleShow,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  error: string;
  show: boolean;
  onToggleShow: () => void;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex-col gap-2">
      <label className="text-sm" style={{ fontWeight: 600 }} htmlFor={id}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          className="input"
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{ paddingRight: 44 }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          disabled={disabled}
          aria-label={show ? i18n.login.aria.hidePassword : i18n.login.aria.showPassword}
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
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error ? <div className="login-error-banner">{error}</div> : null}
    </div>
  );
}

function CompleteRegistrationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();
  const { setPlatformSetupComplete } = useApp();

  const apiService = useMemo(() => getAuthApiService(), []);
  const authService = useMemo(() => createAuthService(apiService), [apiService]);

  const [token, setToken] = useState('');
  const [isValidatingParams, setIsValidatingParams] = useState(true);
  const [registrationData, setRegistrationData] = useState<CompleteRegistrationData>({
    token: '',
    temp_password: '',
    password: '',
    confirm_password: '',
  });
  const [registrationErrors, setRegistrationErrors] = useState({
    temp_password: '',
    password: '',
    confirm_password: '',
    general: '',
  });
  const [isRegistrationLoading, setIsRegistrationLoading] = useState(false);
  const [showTempPassword, setShowTempPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    let tokenParam = searchParams.get('token');

    if (typeof window !== 'undefined' && !tokenParam) {
      try {
        tokenParam = new URLSearchParams(window.location.search).get('token');
      } catch {
        /* ignore */
      }
    }

    if (tokenParam) {
      setToken(tokenParam);
      setRegistrationData((prev) => ({ ...prev, token: tokenParam! }));
      setIsValidatingParams(false);
      return;
    }

    if (typeof window !== 'undefined') {
      showToast({
        message: i18n.login.completeRegistration.invalidLink,
        type: 'error',
        duration: 5000,
      });
      const t = window.setTimeout(() => router.push(appRoutes.login), 2000);
      setIsValidatingParams(false);
      return () => window.clearTimeout(t);
    }

    setIsValidatingParams(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run when URL search params are available
  }, [searchParams]);

  const handleInputChange = (field: keyof CompleteRegistrationData, value: string) => {
    setRegistrationData((prev) => ({ ...prev, [field]: value }));
    if (registrationErrors[field as keyof typeof registrationErrors]) {
      setRegistrationErrors((prev) => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    const { errors } = i18n.login.completeRegistration;

    const newErrors = {
      temp_password: '',
      password: '',
      confirm_password: '',
      general: '',
    };

    if (!registrationData.temp_password?.trim()) {
      newErrors.temp_password = errors.tempPasswordRequired;
    }
    if (!registrationData.password?.trim()) {
      newErrors.password = errors.passwordRequired;
    } else {
      const passwordErrors = validatePassword(registrationData.password);
      if (passwordErrors.length > 0) newErrors.password = passwordErrors[0];
    }
    if (!registrationData.confirm_password?.trim()) {
      newErrors.confirm_password = errors.confirmPasswordRequired;
    } else if (registrationData.password !== registrationData.confirm_password) {
      newErrors.confirm_password = errors.passwordMismatch;
    }

    setRegistrationErrors(newErrors);
    if (newErrors.temp_password || newErrors.password || newErrors.confirm_password) return;

    setIsRegistrationLoading(true);
    try {
      const authResponse = await authService.completeRegistration(registrationData);
      showToast({
        message: i18n.login.completeRegistration.success,
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
      const errorMessage = getErrorMessage(error, errors.registrationFailed);
      setRegistrationErrors((prev) => ({ ...prev, general: errorMessage }));
      showToast({ message: errorMessage, type: 'error', duration: 4000 });
    } finally {
      setIsRegistrationLoading(false);
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

  if (!token) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Redirecting to sign in…
        </div>
      </div>
    );
  }

  const copy = i18n.login.completeRegistration;

  return (
    <div className="login-bg">
      <div className="login-card">
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link href={appRoutes.home} aria-label="Go to home" style={{ display: 'inline-block', width: '100%' }}>
            <CognixBrandLockup showWordmark={false} size="lg" />
          </Link>
          <h2 style={{ fontSize: '1.375rem', marginTop: 16, marginBottom: 8 }}>{copy.title}</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{copy.subtitle}</p>
        </div>

        <ul className="login-password-reqs">
          <li>{copy.requirements.minLength}</li>
          <li>{copy.requirements.uppercase}</li>
          <li>{copy.requirements.lowercase}</li>
          <li>{copy.requirements.digit}</li>
        </ul>

        <form className="login-form-stack" onSubmit={handleCompleteRegistration}>
          <PasswordField
            id="temp_password"
            label={copy.tempPasswordLabel}
            placeholder={copy.tempPasswordPlaceholder}
            value={registrationData.temp_password}
            error={registrationErrors.temp_password}
            show={showTempPassword}
            onToggleShow={() => setShowTempPassword((v) => !v)}
            onChange={(v) => handleInputChange('temp_password', v)}
            disabled={isRegistrationLoading}
          />
          <PasswordField
            id="password"
            label={copy.newPasswordLabel}
            placeholder={copy.newPasswordPlaceholder}
            value={registrationData.password}
            error={registrationErrors.password}
            show={showNewPassword}
            onToggleShow={() => setShowNewPassword((v) => !v)}
            onChange={(v) => handleInputChange('password', v)}
            disabled={isRegistrationLoading}
          />
          <PasswordField
            id="confirm_password"
            label={copy.confirmPasswordLabel}
            placeholder={copy.confirmPasswordPlaceholder}
            value={registrationData.confirm_password}
            error={registrationErrors.confirm_password}
            show={showConfirmPassword}
            onToggleShow={() => setShowConfirmPassword((v) => !v)}
            onChange={(v) => handleInputChange('confirm_password', v)}
            disabled={isRegistrationLoading}
          />

          {registrationErrors.general ? (
            <div className="login-error-banner">{registrationErrors.general}</div>
          ) : null}

          <button
            type="submit"
            className="btn btn-primary w-full btn-lg"
            disabled={isRegistrationLoading}
            style={{ justifyContent: 'center' }}
          >
            {isRegistrationLoading ? copy.registering : copy.registerButton}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function CompleteRegistrationPage() {
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
      <CompleteRegistrationContent />
    </Suspense>
  );
}
