'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { appRoutes } from '@/config/routes';

/**
 * Legacy entry: the app now authenticates at `/login`.
 * Keeps imports of `@/components/LoginPage` from breaking if any remain.
 */
export default function LegacyLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace(appRoutes.login);
  }, [router]);
  return (
    <div className="login-bg">
      <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
        Redirecting to sign in…
      </div>
    </div>
  );
}
