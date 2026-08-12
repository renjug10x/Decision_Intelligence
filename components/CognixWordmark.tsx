'use client';

interface CognixWordmarkProps {
  showDescriptor?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function CognixWordmark({ showDescriptor = true, size = 'md' }: CognixWordmarkProps) {
  const fontSize = size === 'sm' ? '1.15rem' : size === 'lg' ? '1.65rem' : '1.35rem';
  
  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', lineHeight: 1 }}>
      <div 
        className="cognix-wordmark"
        style={{ fontSize, fontWeight: 700, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center' }}
      >
        <span className="brand-c" style={{ color: 'var(--g10x-orange)' }}>C</span>
        <span className="brand-ogni" style={{ color: 'var(--text-primary)' }}>ogni</span>
        <span className="brand-x" style={{ color: 'var(--g10x-red)' }}>X</span>
      </div>
      {showDescriptor && (
        <div 
          className="cognix-descriptor"
          style={{
            fontSize: '0.625rem',
            fontWeight: 500,
            color: 'var(--text-muted)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 3
          }}
        >
          G10X Innovation Studio
        </div>
      )}
    </div>
  );
}
