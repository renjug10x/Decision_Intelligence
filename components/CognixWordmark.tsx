'use client';

interface CognixWordmarkProps {
  showDescriptor?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export function CognixWordmark({ showDescriptor = true, size = 'md', onClick }: CognixWordmarkProps) {
  const fontSize = size === 'sm' ? '1.15rem' : size === 'lg' ? '1.65rem' : '1.35rem';
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      onClick={onClick}
      onKeyDown={handleKeyDown}
      tabIndex={onClick ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      aria-label={onClick ? 'Go to CogniX Portfolio' : undefined}
      title={onClick ? 'Go to Portfolio' : undefined}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        lineHeight: 1,
        cursor: onClick ? 'pointer' : 'default',
        outline: 'none',
        borderRadius: 4,
        padding: onClick ? '2px 4px' : 0,
        margin: onClick ? '-2px -4px' : 0,
        transition: 'opacity 0.15s ease'
      }}
      className={onClick ? 'hover:opacity-85 focus-visible:ring-2 focus-visible:ring-amber-500' : ''}
    >
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
