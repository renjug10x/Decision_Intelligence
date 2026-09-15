'use client';

import { AppProvider } from '@/lib/context';
import { ToastProvider } from '@/context/ToastContext';
import { AuthProvider } from '@/context/AuthContext';
import { DecisionStateProvider } from '@/context/DecisionStateContext';
import { CurrencyProvider } from '@/context/CurrencyContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ToastProvider>
        <AuthProvider>
          <DecisionStateProvider>
            <CurrencyProvider>
              {children}
            </CurrencyProvider>
          </DecisionStateProvider>
        </AuthProvider>
      </ToastProvider>
    </AppProvider>
  );
}
