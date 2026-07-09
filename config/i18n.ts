/** Minimal login copy for the POC (extend as needed). */

export const i18n = {
  common: {
    appName: 'Decision Intelligence',
    labels: {
      email: 'Email',
      password: 'Password',
    },
    placeholders: {
      enterEmail: 'you@company.com',
      enterPassword: 'Enter password',
    },
  },
  login: {
    title: 'Sign in to {appName}',
    subtitle: 'Use your work email and password. We will email you a one-time code.',
    loginButton: 'Continue',
    sendingOtp: 'Sending code…',
    otp: { verifying: 'Verifying…' },
    success: {
      otpSent: 'Verification code sent.',
      welcomeBack: 'Welcome back, {name}.',
    },
    errors: {
      emailRequired: 'Email is required.',
      passwordRequired: 'Password is required.',
      otpSendFailed: 'Could not send verification code.',
      invalidOtp: 'Invalid or expired code.',
    },
    passkey: {
      backButton: 'Back',
      title: 'Enter verification code',
      subtitle: 'Check your email for a 6-character code.',
      label: 'Code',
      resendPrefix: 'Resend available in',
      resend: 'Resend code',
      loginButton: 'Sign in',
      errors: { invalidLength: 'Enter all 6 characters.' },
    },
    forgotPasswordLink: 'Forgot password?',
    forgotPassword: {
      backButton: 'Back',
      title: 'Reset password',
      subtitle: 'We will email you a reset link if the account exists.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@company.com',
      sendButton: 'Send reset link',
      success: 'If an account exists, you will receive an email shortly.',
      errors: {
        emailRequired: 'Email is required.',
        invalidEmail: 'Enter a valid email address.',
        sendFailed: 'Could not send reset email.',
      },
    },
    aria: { showPassword: 'Show password', hidePassword: 'Hide password' },
    resetPassword: {
      title: 'Set a new password',
      subtitle: 'Choose a strong password for your account.',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm password',
      resetButton: 'Reset password',
      success: 'Your password has been reset.',
      invalidLink: 'This password reset link is invalid or has expired.',
      requirements: {
        minLength: 'At least 8 characters',
        uppercase: 'One uppercase letter',
        lowercase: 'One lowercase letter',
        digit: 'One number',
      },
      errors: {
        passwordRequired: 'New password is required.',
        confirmPasswordRequired: 'Please confirm your password.',
        passwordMismatch: 'Passwords do not match.',
        passwordTooShort: 'Password must be at least 8 characters.',
        passwordNoUppercase: 'Password must include an uppercase letter.',
        passwordNoLowercase: 'Password must include a lowercase letter.',
        passwordNoDigit: 'Password must include a number.',
        resetFailed: 'Could not reset password. The link may have expired.',
      },
    },
    completeRegistration: {
      title: 'Create new password',
      subtitle: 'Check your email for your temporary password.',
      tempPasswordLabel: 'Temporary password',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm password',
      tempPasswordPlaceholder: 'Enter temporary password',
      newPasswordPlaceholder: 'Enter new password',
      confirmPasswordPlaceholder: 'Confirm new password',
      registerButton: 'Register',
      registering: 'Registering…',
      success: 'Registration completed successfully.',
      invalidLink: 'This registration link is invalid or has expired.',
      requirements: {
        minLength: 'At least 8 characters',
        uppercase: 'One uppercase letter',
        lowercase: 'One lowercase letter',
        digit: 'One number',
      },
      errors: {
        tempPasswordRequired: 'Temporary password is required.',
        passwordRequired: 'New password is required.',
        confirmPasswordRequired: 'Please confirm your password.',
        passwordMismatch: 'Passwords do not match.',
        passwordTooShort: 'Password must be at least 8 characters.',
        passwordNoUppercase: 'Password must include an uppercase letter.',
        passwordNoLowercase: 'Password must include a lowercase letter.',
        passwordNoDigit: 'Password must include a number.',
        registrationFailed: 'Registration failed. Please try again.',
      },
    },
  },
} as const;

export function replacePlaceholders(str: string, vars: Record<string, string>): string {
  return str.replace(/\{(\w+)\}/g, (_, key: string) => vars[key] ?? `{${key}}`);
}
