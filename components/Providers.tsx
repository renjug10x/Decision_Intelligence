'use client';

import { AppProvider } from '@/lib/context';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { DecisionStateProvider } from '@/context/DecisionStateContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <AuthProvider>
          <DecisionStateProvider>
            {children}
          </DecisionStateProvider>
        </AuthProvider>
      </ToastProvider>
    </AppProvider>
  );
}
