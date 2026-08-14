'use client';

import { Activity } from 'lucide-react';
import { CognixWordmark } from '@/components/CognixWordmark';

interface CognixBrandLockupProps {
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
  showWordmark?: boolean;
  onClick?: () => void;
}

export function CognixBrandLockup({
  subtitle,
  size = 'md',
  centered = true,
  showWordmark = true,
  onClick,
}: Readonly<CognixBrandLockupProps>) {
  const badgeSize = size === 'lg' ? 56 : size === 'sm' ? 44 : 48;

  const badge = (
    <div
      className="logo-badge"
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: 14,
        background: 'linear-gradient(135deg, #003978 0%, #0060CC 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 0 28px rgba(0,120,255,0.25)',
      }}
      aria-hidden="true"
    >
      <Activity size={badgeSize * 0.46} strokeWidth={1.75} color="white" />
    </div>
  );

  if (!showWordmark) {
    return (
      <div
        className="cognix-brand-lockup"
        style={{ display: 'flex', justifyContent: centered ? 'center' : 'flex-start' }}
      >
        {badge}
      </div>
    );
  }

  return (
    <div
      className="cognix-brand-lockup"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      {badge}

      <div style={{ textAlign: 'left' }}>
        <CognixWordmark showDescriptor size={size} onClick={onClick} />
        {subtitle && (
          <p
            style={{
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
              marginTop: 6,
              marginBottom: 0,
            }}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
