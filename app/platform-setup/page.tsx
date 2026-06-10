'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useApp } from '@/lib/context';
import { appRoutes } from '@/config/routes';
import PlatformSetupPage from '@/components/PlatformSetupPage';

export default function PlatformSetupRoute() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { platformSetupComplete } = useApp();

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace(appRoutes.login);
      return;
    }
    if (platformSetupComplete) {
      router.replace(appRoutes.home);
    }
  }, [authLoading, user, platformSetupComplete, router]);

  if (authLoading || !user || platformSetupComplete) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading…
        </div>
      </div>
    );
  }

  return <PlatformSetupPage />;
}
