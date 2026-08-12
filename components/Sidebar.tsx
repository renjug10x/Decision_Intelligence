'use client';
import {
  Compass, HelpCircle, Layers, GitBranch, Database,
  Tag, TrendingUp, Package, Box, Settings as SettingsIcon, HelpCircle as HelpIcon,
  LogOut, Briefcase, Store
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/context/AuthContext';
import { CognixWordmark } from '@/components/CognixWordmark';

const ROLE_META: Record<string, { Icon: any; label: string }> = {
  exec:             { Icon: Briefcase, label: 'Innovation Exec'  },
  category_manager: { Icon: Package,   label: 'Category Lead'    },
  store_manager:    { Icon: Store,     label: 'Operations Lead'  },
};

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { role, setIsAuthenticated, setPlatformSetupComplete } = useApp();
  const { logout } = useAuth();
  const roleMeta = ROLE_META[role] || ROLE_META.exec;

  return (
    <div className="sidebar" style={{ background: '#F8FAFC', borderRight: '1px solid var(--border)' }}>
      {/* Brand Header */}
      <div className="sidebar-logo" style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
        <CognixWordmark showDescriptor={true} size="md" onClick={() => onNavigate('portfolio')} />
      </div>

      {/* Role Indicator */}
      <div style={{ padding: '10px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '6px 10px',
          fontSize: '0.75rem',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <roleMeta.Icon size={13} strokeWidth={1.75} color="var(--g10x-orange)" />
          {roleMeta.label}
        </div>
      </div>

      {/* Navigation Groups */}
      <nav className="sidebar-nav" style={{ padding: '14px 10px' }}>
        
        {/* Explore Section */}
        <div className="nav-section-label" style={{ color: 'var(--text-muted)', fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '0 8px 6px' }}>
          Explore
        </div>

        <button
          className={`nav-item ${currentPage === 'portfolio' ? 'active' : ''}`}
          onClick={() => onNavigate('portfolio')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <Compass size={14} color={currentPage === 'portfolio' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Portfolio</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'curiosity' ? 'active' : ''}`}
          onClick={() => onNavigate('curiosity')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <HelpCircle size={14} color={currentPage === 'curiosity' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Questions</span>
        </button>

        {/* Experiments Section */}
        <div className="nav-section-label" style={{ color: 'var(--text-muted)', fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 8px 6px' }}>
          Experiments
        </div>

        <button
          className={`nav-item ${currentPage === 'commitment-intelligence' ? 'active' : ''}`}
          onClick={() => onNavigate('commitment-intelligence')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <Layers size={14} color={currentPage === 'commitment-intelligence' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Commitment</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'decision-ripple' ? 'active' : ''}`}
          onClick={() => onNavigate('decision-ripple')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <GitBranch size={14} color={currentPage === 'decision-ripple' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Decision Ripple</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'enterprise-memory' ? 'active' : ''}`}
          onClick={() => onNavigate('enterprise-memory')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <Database size={14} color={currentPage === 'enterprise-memory' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Enterprise Memory</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'opportunity-intelligence' ? 'active' : ''}`}
          onClick={() => onNavigate('opportunity-intelligence')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <TrendingUp size={14} color={currentPage === 'opportunity-intelligence' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Opportunity</span>
        </button>

        {/* Solutions Section */}
        <div className="nav-section-label" style={{ color: 'var(--text-muted)', fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '14px 8px 6px' }}>
          Solutions
        </div>

        <button
          className={`nav-item ${currentPage === 'solution-promo' ? 'active' : ''}`}
          onClick={() => onNavigate('solution-promo')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <Tag size={14} color={currentPage === 'solution-promo' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Promotion</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'solution-demand' ? 'active' : ''}`}
          onClick={() => onNavigate('solution-demand')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <TrendingUp size={14} color={currentPage === 'solution-demand' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Demand & Forecast</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'solution-inventory' ? 'active' : ''}`}
          onClick={() => onNavigate('solution-inventory')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <Box size={14} color={currentPage === 'solution-inventory' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Inventory</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'solution-category' ? 'active' : ''}`}
          onClick={() => onNavigate('solution-category')}
          style={{ cursor: 'pointer', margin: '2px 0', fontSize: '0.8125rem' }}
        >
          <Package size={14} color={currentPage === 'solution-category' ? 'var(--g10x-orange)' : 'var(--text-muted)'} />
          <span>Category</span>
        </button>

      </nav>

      {/* Footer: De-emphasized Admin & Exit Demo */}
      <div className="sidebar-footer" style={{ padding: '12px 14px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
          <button
            onClick={() => onNavigate('settings')}
            title="IP & Governance Settings"
            style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', borderRadius: 4, background: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <SettingsIcon size={12} /> Governance
          </button>
          <button
            onClick={() => onNavigate('help')}
            title="About CogniX Studio"
            style={{ flex: 1, padding: '5px 8px', fontSize: '0.75rem', borderRadius: 4, background: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <HelpIcon size={12} /> About
          </button>
        </div>

        <button
          className="btn btn-ghost btn-sm w-full"
          title="Exit current CogniX demo session"
          onClick={() => {
            void (async () => {
              try { await logout(); } catch {}
              setIsAuthenticated(false);
              setPlatformSetupComplete(false);
              if (typeof window !== 'undefined') {
                localStorage.removeItem('cognix_demo_session');
                localStorage.removeItem('cognix_setup_complete');
              }
              window.location.href = '/platform-setup';
            })();
          }}
          style={{ justifyContent: 'center', color: 'var(--text-muted)', gap: 6, fontSize: '0.75rem', padding: '4px' }}
        >
          <LogOut size={13} strokeWidth={1.75} color="currentColor" />
          Exit Demo
        </button>
      </div>
    </div>
  );
}
