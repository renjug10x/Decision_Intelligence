/** App routes (Next.js paths) */
export const appRoutes = {
  home: '/',
  login: '/login',
  resetPassword: '/reset-password',
  completeRegistration: '/complete-registration',
  /** Post-auth: role + Gemini key before main shell */
  platformSetup: '/platform-setup',
} as const;

/** External marketing / partner links */
export const externalLinks = {
  g10x: 'https://www.g10x.com/',
  privacyPolicy: 'https://www.g10x.com/privacy-policy',
} as const;

/** Backend API paths (auth: appended to `AUTH_API_URL`) */
export const apiRoutes = {
  auth: {
    login: '/api/v2/auth/login',
    validateOtp: '/api/v2/otp/validate_otp',
    validateToken: '/api/v2/auth/validate_token',
    refreshToken: '/api/v2/auth/refresh_token',
    logout: '/api/v2/auth/logout',
    forgotPassword: '/api/v2/auth/forgot_password',
    resetPassword: '/api/v2/auth/reset_password_with_token',
    resetCurrentPassword: '/api/v2/auth/reset_current_password',
    completeRegistration: '/api/v2/auth/complete_registration',
  },
} as const;
