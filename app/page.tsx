'use client';
import { useState } from 'react';
import { Construction, Calendar, FlaskConical, Bell, Lock, Zap } from 'lucide-react';
import { useApp } from '@/lib/context';
import LoginPage from '@/components/LoginPage';
import Sidebar from '@/components/Sidebar';
import TodayPriorities from '@/components/TodayPriorities';
import StoreCopilot from '@/components/StoreCopilot';
import CategoryIntelligence from '@/components/CategoryIntelligence';
import SupplyChainRadar from '@/components/SupplyChainRadar';
import PromotionPlanner from '@/components/PromotionPlanner';
import Forecasting from '@/components/Forecasting';
import Settings from '@/components/Settings';
import BriefingCentre from '@/components/BriefingCentre';
import WasteIntelligence from '@/components/WasteIntelligence';
import AvailabilityIntelligence from '@/components/AvailabilityIntelligence';
import Help from '@/components/Help';

const PAGE_TITLES: Record<string, string> = {
  dashboard:        "Today's Priorities",
  briefing:         'Executive Briefing',
  'store-copilot':  'Store Ops Copilot',
  category:         'Category Intelligence',
  'supply-chain':   'Supply Chain Radar',
  waste:            'Waste Intelligence',
  availability:     'Availability Intelligence',
  promotions:       'Promotion Planner',
  forecasting:      'Forecasting',
  settings:         'Governance',
  help:             'Help & Platform Architecture',
};

const NOTIFICATIONS_DATA = [
  {
    id: 'N001',
    title: 'Ready Meal Deliveries Delayed',
    desc: 'Piccadilly ready meals OOS risk. Click to view in Command Centre.',
    severity: 'high',
    targetPage: 'dashboard',
    categoryFilter: 'Chilled',
    storeFilter: 'S001',
    read: false
  },
  {
    id: 'N002',
    title: 'FreshDirect Delivery Failures',
    desc: '61% of Produce deliveries delayed/cancelled. Click to view Supply Chain Radar.',
    severity: 'high',
    targetPage: 'supply-chain',
    categoryFilter: 'Produce',
    read: false
  },
  {
    id: 'N003',
    title: 'Dairy Margin Compression NW',
    desc: 'Dairy margin compressed to 26.9% in the NW. Click to view Category Intelligence.',
    severity: 'medium',
    targetPage: 'category',
    categoryFilter: 'Dairy',
    storeFilter: 'S001',
    read: false
  },
  {
    id: 'N004',
    title: 'Produce Spoilage Risk',
    desc: 'Waste units spiked +24% WoW. Click to view Forecasting.',
    severity: 'medium',
    targetPage: 'forecasting',
    categoryFilter: 'Produce',
    read: false
  }
];

function PlaceholderScreen({ title }: { title: string }) {
  return (
    <div className="page-content">
      <div className="empty-state" style={{ minHeight: '60vh' }}>
        <Construction size={48} strokeWidth={1.25} color="#4A5A7A" style={{ opacity: 0.6 }} />
        <h3 style={{ marginTop: 16 }}>{title}</h3>
        <p>Coming in the next sprint. Explore the five live modules first.</p>
      </div>
    </div>
  );
}

export default function App() {
  const { role, setRole, isAuthenticated, setIsAuthenticated, muteNotificationNoise, demoMode, setDemoMode } = useApp();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [notifications, setNotifications] = useState<any[]>(NOTIFICATIONS_DATA);
  const [showNotifications, setShowNotifications] = useState(false);

  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':      return <TodayPriorities />;
      case 'briefing':       return <BriefingCentre />;
      case 'store-copilot':  return <StoreCopilot />;
      case 'category':       return <CategoryIntelligence />;
      case 'supply-chain':   return <SupplyChainRadar />;
      case 'waste':          return <WasteIntelligence />;
      case 'availability':   return <AvailabilityIntelligence />;
      case 'promotions':     return <PromotionPlanner />;
      case 'forecasting':    return <Forecasting />;
      case 'settings':       return <Settings />;
      case 'help':           return <Help />;
      default:               return <TodayPriorities />;
    }
  };

  // ── Role-Governed Notification Scoping ────────────────────────────────────
  const filteredNotifications = notifications.filter(n => {
    if (muteNotificationNoise && n.severity !== 'high') {
      return false;
    }
    if (role === 'store_manager') {
      // Store managers scope Piccadilly (S001) in North West region
      return n.storeFilter === 'S001';
    }
    if (role === 'category_manager') {
      // Category managers scope Chilled, Dairy, Produce category alerts
      return n.categoryFilter === 'Chilled' || n.categoryFilter === 'Dairy' || n.categoryFilter === 'Produce';
    }
    return true; // Executive sees all alerts
  });

  const unreadCount = filteredNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: any) => {
    // 1. Mark as read
    setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
    setShowNotifications(false);

    // 2. Dynamic IAM Lock check (consistent with Sidebar navigation block)
    const isLocked = (role === 'category_manager' && n.targetPage === 'supply-chain') ||
                     (role === 'store_manager' && (n.targetPage === 'category' || n.targetPage === 'supply-chain' || n.targetPage === 'forecasting'));
    
    if (isLocked) {
      alert(`Access Restricted: Under Looker access policies, the '${PAGE_TITLES[n.targetPage]}' module is restricted for the ${role === 'store_manager' ? 'Store Manager' : 'Category Manager'} role.`);
    } else {
      setCurrentPage(n.targetPage);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar">
          <div className="topbar-left">
            <span className="page-title">{PAGE_TITLES[currentPage]}</span>
          </div>
          <div className="topbar-right" style={{ gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Demo Role:</span>
              <select
                className="select"
                value={role}
                onChange={e => {
                  setRole(e.target.value as any);
                  setCurrentPage('dashboard');
                }}
                style={{ width: 155, height: 30, padding: '2px 8px', fontSize: '0.8125rem' }}
              >
                <option value="exec">Executive</option>
                <option value="category_manager">Category Manager</option>
                <option value="store_manager">Store Manager</option>
              </select>
            </div>
            
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Calendar size={14} strokeWidth={1.75} color="#4A5A7A" />
              4 Jun 2026 · Last 90 days
            </span>

            {/* Demo Mode Toggle */}
            <button
              onClick={() => setDemoMode(!demoMode)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${demoMode ? 'rgba(245,158,11,0.4)' : 'var(--border)'}`,
                background: demoMode ? 'rgba(245,158,11,0.08)' : 'none',
                color: demoMode ? 'var(--warning)' : 'var(--text-muted)',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'var(--transition)',
              }}
              title={demoMode ? 'Demo Mode Active — Click to disable' : 'Enable Demo Mode for optimal demo scenarios'}
            >
              <Zap size={12} strokeWidth={2} color="currentColor" />
              {demoMode ? 'DEMO ON' : 'Demo'}
            </button>

            <span className="badge badge-yellow" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <FlaskConical size={11} strokeWidth={2} color="currentColor" />
              POC Demo
            </span>

            {/* Notification Bell Icon */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="btn btn-ghost" 
                style={{ 
                  position: 'relative', 
                  width: 32, 
                  height: 32, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  borderRadius: '50%',
                  padding: 0,
                  border: '1px solid var(--border)',
                  background: showNotifications ? 'var(--bg-elevated)' : 'none',
                  cursor: 'pointer'
                }}
                title="System Notifications"
              >
                <Bell size={15} strokeWidth={1.75} color={unreadCount > 0 ? "var(--text-primary)" : "var(--text-secondary)"} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 2,
                    right: 2,
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: 'var(--danger)',
                    boxShadow: '0 0 6px var(--danger)'
                  }} />
                )}
              </button>
              
              {showNotifications && (
                <div style={{
                  position: 'absolute',
                  top: 40,
                  right: 0,
                  width: 300,
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: 'var(--radius-lg)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 100,
                  padding: '12px 0',
                  animation: 'scaleIn 0.2s ease',
                  backdropFilter: 'blur(12px)'
                }}>
                  {/* Dropdown Header */}
                  <div style={{ padding: '0 16px 10px', borderBottom: '1px solid var(--border)' }} className="flex justify-between items-center">
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
                        }}
                        style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '0.6875rem', fontWeight: 600, cursor: 'pointer', padding: 0 }}
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  
                  {/* Dropdown Body */}
                  <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                    {filteredNotifications.length === 0 ? (
                      <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        No notifications for your active scope.
                      </div>
                    ) : (
                      filteredNotifications.map(n => {
                        const isLocked = (role === 'category_manager' && n.targetPage === 'supply-chain') ||
                                         (role === 'store_manager' && (n.targetPage === 'category' || n.targetPage === 'supply-chain' || n.targetPage === 'forecasting'));
                        return (
                          <div 
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            style={{
                              padding: '10px 16px',
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                              display: 'flex',
                              gap: 10,
                              alignItems: 'flex-start',
                              opacity: n.read ? 0.45 : 1,
                              background: n.read ? 'none' : 'rgba(0,120,255,0.02)'
                            }}
                            className="nav-item-notification"
                          >
                            {/* Dot indicating severity */}
                            <span style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: n.severity === 'high' ? 'var(--danger)' : 'var(--warning)',
                              marginTop: 5,
                              flexShrink: 0
                            }} />
                            
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: 6,
                                fontSize: '0.75rem', 
                                fontWeight: 700, 
                                color: 'var(--text-primary)' 
                              }}>
                                {n.title}
                                {isLocked && <Lock size={10} color="#6B7A8D" style={{ flexShrink: 0 }} />}
                              </div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.4 }}>
                                {n.desc}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Page content */}
        <div key={currentPage} className="animate-fade">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
