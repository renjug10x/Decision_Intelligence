'use client';

import { CognixWordmark } from '@/components/CognixWordmark';

interface CognixBrandLockupProps {
  subtitle?: string;
  size?: 'sm' | 'md' | 'lg';
  centered?: boolean;
  onClick?: () => void;
}

export function CognixBrandLockup({
  subtitle,
  size = 'md',
  centered = true,
  onClick,
}: Readonly<CognixBrandLockupProps>) {
  return (
    <div
      className="cognix-brand-lockup"
      style={{
        display: 'flex',
        justifyContent: centered ? 'center' : 'flex-start',
      }}
    >
      <div style={{ textAlign: centered ? 'center' : 'left' }}>
        <CognixWordmark showDescriptor size={size} centered={centered} onClick={onClick} />
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
