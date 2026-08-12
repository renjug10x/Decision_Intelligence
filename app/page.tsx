'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, FlaskConical, Bell, Lock, Zap, Layers } from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/context/AuthContext';
import { appRoutes, externalLinks } from '@/config/routes';
import Sidebar from '@/components/Sidebar';
import InnovationPortfolio from '@/components/InnovationPortfolio';
import QuestionsWorthAsking from '@/components/QuestionsWorthAsking';
import ExperimentCanvas from '@/components/ExperimentCanvas';
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
import CommitmentIntelligence from '@/components/CommitmentIntelligence';
import DecisionRippleIntelligence from '@/components/DecisionRippleIntelligence';
import EnterpriseMemory from '@/components/EnterpriseMemory';
import OpportunityIntelligence from '@/components/OpportunityIntelligence';
import { G10XLogo } from '@/components/G10XLogo';
import { EXPERIMENT_REGISTRY } from '@/config/experiments';
import { INDUSTRY_PACKS } from '@/config/industry-packs';
import { env } from '@/config/environment';

const PAGE_TITLES: Record<string, string> = {
  portfolio:                  'Innovation Portfolio',
  curiosity:                  'Questions Worth Asking',
  canvas:                     'Experiment Canvas',
  'commitment-intelligence':  'Commitment Intelligence',
  'decision-ripple':          'Decision Ripple Intelligence',
  'enterprise-memory':        'Enterprise Memory Foundation',
  'opportunity-intelligence': 'Opportunity Intelligence',
  'solution-promo':           'Promotion Intelligence',
  'solution-demand':          'Demand & Forecast Intelligence',
  'solution-inventory':       'Predictive Inventory Intelligence',
  'solution-category':        'Category Intelligence',
  settings:                   'IP & Governance Settings',
  help:                       'About CogniX Studio',
};

const NOTIFICATIONS_DATA = [
  {
    id: 'N001',
    title: 'Commitment Drift Detected',
    desc: 'Marketing demand surge (+22%) exceeds supplier capacity cap (+10%). Click to view Commitment Intelligence.',
    severity: 'high',
    targetPage: 'commitment-intelligence',
    read: false
  },
  {
    id: 'N002',
    title: 'Decision Ripple Warning',
    desc: 'Promo spend boost (+15%) creates 2nd-order DC labor bottleneck (+35% overtime). Click to view Decision Ripple.',
    severity: 'high',
    targetPage: 'decision-ripple',
    read: false
  },
  {
    id: 'N003',
    title: 'Curiosity Signal Available',
    desc: 'New provocative question surfaced: "Which campaign creates operational cost faster than value?".',
    severity: 'medium',
    targetPage: 'curiosity',
    read: false
  }
];

export default function App() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { role, setRole, platformSetupComplete } = useApp();
  
  const [currentPage, setCurrentPage] = useState<string>('portfolio');
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('EXP-COMMITMENT-01');
  const [activeIndustryPack, setActiveIndustryPack] = useState<string>('retail_grocery');
  const [notifications, setNotifications] = useState<any[]>(NOTIFICATIONS_DATA);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !user && !env.IS_DEMO_MODE) {
      router.replace(appRoutes.login);
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (authLoading || (!user && !env.IS_DEMO_MODE)) return;
    if (!platformSetupComplete && !env.IS_DEMO_MODE) {
      router.replace(appRoutes.platformSetup);
    }
  }, [authLoading, user, platformSetupComplete, router]);

  if (authLoading) {
    return (
      <div className="login-bg">
        <div className="login-card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
          Loading CogniX Lab…
        </div>
      </div>
    );
  }

  if (!env.IS_DEMO_MODE && (!user || !platformSetupComplete)) {
    return null;
  }

  const selectedExperiment = EXPERIMENT_REGISTRY.find(e => e.id === selectedExperimentId) || EXPERIMENT_REGISTRY[0];

  const handleNavigateToExperiment = (expId: string) => {
    if (expId === 'EXP-COMMITMENT-01') setCurrentPage('commitment-intelligence');
    else if (expId === 'EXP-RIPPLE-02') setCurrentPage('decision-ripple');
    else if (expId === 'EXP-MEMORY-03') setCurrentPage('enterprise-memory');
    else if (expId === 'EXP-OPPORTUNITY-04') setCurrentPage('opportunity-intelligence');
    else {
      setSelectedExperimentId(expId);
      setCurrentPage('canvas');
    }
  };

  const handleNavigateToSolution = (solId: string) => {
    if (solId === 'SOL-PROMO-01') setCurrentPage('solution-promo');
    else if (solId === 'SOL-DEMAND-02') setCurrentPage('solution-demand');
    else if (solId === 'SOL-INV-03') setCurrentPage('solution-inventory');
    else if (solId === 'SOL-CAT-04') setCurrentPage('solution-category');
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'portfolio':
        return (
          <InnovationPortfolio
            onSelectExperiment={handleNavigateToExperiment}
            onSelectSolution={handleNavigateToSolution}
            onNavigateToCuriosity={() => setCurrentPage('curiosity')}
          />
        );
      case 'curiosity':
        return (
          <QuestionsWorthAsking
            onSelectExperiment={handleNavigateToExperiment}
            onSelectSolution={handleNavigateToSolution}
          />
        );
      case 'commitment-intelligence':
        return <CommitmentIntelligence onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'decision-ripple':
        return <DecisionRippleIntelligence onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'enterprise-memory':
        return <EnterpriseMemory onNavigateToSolution={handleNavigateToSolution} onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'opportunity-intelligence':
        return <OpportunityIntelligence onNavigateToSolution={handleNavigateToSolution} onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'solution-promo':
      case 'promotions':
        return <PromotionPlanner onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'solution-demand':
      case 'forecasting':
        return <Forecasting onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'solution-inventory':
      case 'availability':
        return <AvailabilityIntelligence onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'solution-category':
      case 'category':
        return <CategoryIntelligence onNavigateToExperiment={handleNavigateToExperiment} />;
      case 'canvas':
        return (
          <ExperimentCanvas
            experiment={selectedExperiment}
            onBackToPortfolio={() => setCurrentPage('portfolio')}
          />
        );
      case 'settings':       return <Settings />;
      case 'help':           return <Help />;
      default:               
        return (
          <InnovationPortfolio
            onSelectExperiment={handleNavigateToExperiment}
            onSelectSolution={handleNavigateToSolution}
            onNavigateToCuriosity={() => setCurrentPage('curiosity')}
          />
        );
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <div className="main-content">
        {/* Topbar */}
        <div className="topbar" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border)', height: 54, padding: '0 24px' }}>
          <div className="topbar-left">
            <span className="page-title" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {PAGE_TITLES[currentPage] || 'CogniX Studio'}
            </span>
          </div>

          <div className="topbar-right" style={{ gap: 16 }}>
            {/* Industry Pack Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Demo Context:</span>
              <select
                className="select"
                value={activeIndustryPack}
                onChange={e => setActiveIndustryPack(e.target.value)}
                style={{ width: 160, height: 28, padding: '2px 6px', fontSize: '0.75rem', background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
              >
                {Object.values(INDUSTRY_PACKS).map(pack => (
                  <option key={pack.id} value={pack.id}>{pack.name}</option>
                ))}
              </select>
            </div>

            {/* Role Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>Persona:</span>
              <select
                className="select"
                value={role}
                onChange={e => {
                  setRole(e.target.value as any);
                  setCurrentPage('portfolio');
                }}
                style={{ width: 140, height: 28, padding: '2px 6px', fontSize: '0.75rem', background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
              >
                <option value="exec">Innovation Exec</option>
                <option value="category_manager">Category Lead</option>
                <option value="store_manager">Operations Lead</option>
              </select>
            </div>

            {/* Notifications Button */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{
                  position: 'relative',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--radius-sm)',
                  padding: 0,
                  border: '1px solid var(--border)',
                  background: '#F8FAFC',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)'
                }}
                title="CogniX Signals"
              >
                <Bell size={14} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--g10x-red)'
                  }} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Page Content View */}
        <div key={currentPage} className="animate-fade">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
