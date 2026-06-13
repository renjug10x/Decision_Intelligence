import {
  LayoutDashboard, MessageSquare, BarChart3, Truck,
  Tag, TrendingUp, LogOut, Activity, ChevronRight,
  Briefcase, Package, Store, Lock, Settings as SettingsIcon,
  FileText, Trash2, ShoppingCart, HelpCircle, Layers
} from 'lucide-react';
import { ICON_PROPS, ICON_PROPS_SM, ICON_MUTED, ICON_ACCENT } from '@/lib/icons';
import { useApp } from '@/lib/context';

const NAV_ITEMS = [
  { id: 'dashboard',      Icon: LayoutDashboard, label: "Today's Priorities", badge: null, execOnly: false, storeManagerLocked: false, categoryManagerLocked: false },
  { id: 'store-copilot',  Icon: MessageSquare,   label: 'Store Ops Command',  badge: null, execOnly: false, storeManagerLocked: false, categoryManagerLocked: false },
  { id: 'category',       Icon: BarChart3,       label: 'Category Intel',     badge: null, execOnly: false, storeManagerLocked: true,  categoryManagerLocked: false },
  { id: 'supply-chain',   Icon: Truck,           label: 'Supply Chain Radar', badge: '2',  execOnly: false, storeManagerLocked: true,  categoryManagerLocked: true  },
];

const ROLE_META: Record<string, { Icon: any; label: string }> = {
  exec:             { Icon: Briefcase, label: 'Executive'        },
  category_manager: { Icon: Package,   label: 'Category Manager' },
  store_manager:    { Icon: Store,     label: 'Store Manager'    },
};

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { role, lookerMode, setLookerMode, setIsAuthenticated } = useApp();
  const roleMeta = ROLE_META[role] || ROLE_META.exec;

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-badge">
          <Activity size={18} strokeWidth={1.75} color="white" />
        </div>
        <div>
          <div className="logo-text">Decision Intelligence</div>
          <div className="logo-sub">LiDL UK · Beta</div>
        </div>
      </div>

      {/* Role indicator */}
      <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{
          background: 'var(--accent-light)',
          border: '1px solid var(--border-accent)',
          borderRadius: 'var(--radius-md)',
          padding: '8px 12px',
          fontSize: '0.8125rem',
          fontWeight: 600,
          color: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <roleMeta.Icon size={14} strokeWidth={1.75} color="currentColor" />
          {roleMeta.label}
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="nav-section-label">Analytics</div>
        {NAV_ITEMS.map(({ id, Icon, label, badge, storeManagerLocked, categoryManagerLocked }) => {
          const active = currentPage === id;
          const locked = (role === 'category_manager' && categoryManagerLocked) ||
                         (role === 'store_manager' && storeManagerLocked);
          return (
            <button
              key={id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => {
                if (locked) {
                  alert(`Access Restricted: Under Looker access policies, the '${label}' module is restricted for the ${role === 'store_manager' ? 'Store Manager' : 'Category Manager'} role.`);
                } else {
                  onNavigate(id);
                }
              }}
              style={{ opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
            >
              {locked ? (
                <Lock {...ICON_PROPS_SM} color="#6B7A8D" style={{ flexShrink: 0 }} />
              ) : (
                <Icon {...ICON_PROPS_SM} color={active ? '#0078FF' : '#6B7A8D'} style={{ flexShrink: 0 }} />
              )}
              <span>{label}</span>
              {locked ? (
                <span className="badge badge-danger" style={{ fontSize: '0.625rem', padding: '1px 4px', textTransform: 'uppercase', scale: '0.9', marginLeft: 'auto' }}>Locked</span>
              ) : badge ? (
                <span className="nav-badge">{badge}</span>
              ) : null}
            </button>
          );
        })}

        {/* Intelligence modules — context-specific */}
        <div className="nav-section-label" style={{ marginTop: 8 }}>Intelligence</div>
        {[
          { id: 'waste',        Icon: Trash2,       label: 'Waste Intelligence',     execLocked: false, storeManagerLocked: false, categoryManagerLocked: false },
          { id: 'availability', Icon: ShoppingCart, label: 'Availability Intel',     execLocked: false, storeManagerLocked: false, categoryManagerLocked: false },
          { id: 'briefing',     Icon: FileText,     label: 'Executive Briefing',     execLocked: false, storeManagerLocked: true,  categoryManagerLocked: true  },
        ].map(({ id, Icon, label, storeManagerLocked, categoryManagerLocked }) => {
          const active = currentPage === id;
          const locked = (role === 'category_manager' && categoryManagerLocked) ||
                         (role === 'store_manager' && storeManagerLocked);
          return (
            <button
              key={id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => {
                if (locked) {
                  alert(`Access Restricted: '${label}' is restricted for the ${role === 'store_manager' ? 'Store Manager' : 'Category Manager'} role.`);
                } else {
                  onNavigate(id);
                }
              }}
              style={{ opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
            >
              {locked ? (
                <Lock {...ICON_PROPS_SM} color="#6B7A8D" style={{ flexShrink: 0 }} />
              ) : (
                <Icon {...ICON_PROPS_SM} color={active ? '#0078FF' : '#6B7A8D'} style={{ flexShrink: 0 }} />
              )}
              <span>{label}</span>
              {locked && (
                <span className="badge badge-danger" style={{ fontSize: '0.625rem', padding: '1px 4px', textTransform: 'uppercase', scale: '0.9', marginLeft: 'auto' }}>Locked</span>
              )}
            </button>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Planning</div>
        {[
          { id: 'promotions', Icon: Tag,        label: 'Promotion Planner', locked: role === 'store_manager' },
          { id: 'forecasting', Icon: TrendingUp, label: 'Forecasting',       locked: role === 'store_manager' },
        ].map(({ id, Icon, label, locked }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => {
                if (locked) {
                  alert(`Access Restricted: '${label}' module is restricted to Executive and Category Manager roles.`);
                } else {
                  onNavigate(id);
                }
              }}
              style={{ opacity: locked ? 0.45 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}
            >
              {locked ? (
                <Lock {...ICON_PROPS_SM} color="#6B7A8D" style={{ flexShrink: 0 }} />
              ) : (
                <Icon {...ICON_PROPS_SM} color={active ? '#0078FF' : '#6B7A8D'} style={{ flexShrink: 0 }} />
              )}
              <span>{label}</span>
              {locked && (
                <span className="badge badge-danger" style={{ fontSize: '0.625rem', padding: '1px 4px', textTransform: 'uppercase', scale: '0.9', marginLeft: 'auto' }}>Locked</span>
              )}
            </button>
          );
        })}

        <div className="nav-section-label" style={{ marginTop: 8 }}>Settings</div>
        <button
          className={`nav-item ${currentPage === 'settings' ? 'active' : ''}`}
          onClick={() => onNavigate('settings')}
          style={{ cursor: 'pointer' }}
        >
          <SettingsIcon
            {...ICON_PROPS_SM}
            color={currentPage === 'settings' ? '#0078FF' : '#6B7A8D'}
            style={{ flexShrink: 0 }}
          />
          <span>Governance</span>
        </button>

        <button
          className={`nav-item ${currentPage === 'help' ? 'active' : ''}`}
          onClick={() => onNavigate('help')}
          style={{ cursor: 'pointer', marginTop: 4 }}
        >
          <HelpCircle
            {...ICON_PROPS_SM}
            color={currentPage === 'help' ? '#0078FF' : '#6B7A8D'}
            style={{ flexShrink: 0 }}
          />
          <span>Help</span>
        </button>


      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        {/* Looker toggle */}
        <div
          className="looker-badge"
          onClick={() => setLookerMode(lookerMode === 'mock' ? 'live' : 'mock')}
          title={lookerMode === 'mock' ? 'Switch to Looker live mode' : 'Connected to Looker'}
          style={{ marginBottom: 8 }}
        >
          <div className={`looker-dot ${lookerMode === 'live' ? 'connected' : 'mock'}`} />
          <div style={{ flex: 1 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: '0.75rem', fontWeight: 600 }}>
              {lookerMode === 'live' ? 'Looker Connected' : 'Mock Data Mode'}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
              {lookerMode === 'live' ? 'Semantic Layer Active' : 'Click to toggle'}
            </div>
          </div>
          <ChevronRight {...ICON_PROPS_SM} color="#4A5A7A" />
        </div>

        <button
          className="btn btn-ghost btn-sm w-full"
          onClick={() => { setIsAuthenticated(false); sessionStorage.clear(); }}
          style={{ justifyContent: 'center', color: 'var(--text-muted)', gap: 6 }}
        >
          <LogOut size={14} strokeWidth={1.75} color="currentColor" />
          Sign out
        </button>
      </div>
    </div>
  );
}
