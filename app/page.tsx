'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/context/AuthContext';
import { appRoutes } from '@/config/routes';
import Sidebar from '@/components/Sidebar';
import CapabilityAtlas from '@/components/atlas/CapabilityAtlas';
import InnovationPortfolio from '@/components/InnovationPortfolio';
import QuestionsWorthAsking from '@/components/QuestionsWorthAsking';
import ExperimentCanvas from '@/components/ExperimentCanvas';
import CategoryIntelligence from '@/components/CategoryIntelligence';
import PromotionPlanner from '@/components/PromotionPlanner';
import Forecasting from '@/components/Forecasting';
import Settings from '@/components/Settings';
import AvailabilityIntelligence from '@/components/AvailabilityIntelligence';
import Help from '@/components/Help';
import CommitmentIntelligence from '@/components/CommitmentIntelligence';
import DecisionRippleIntelligence from '@/components/DecisionRippleIntelligence';
import EnterpriseMemory from '@/components/EnterpriseMemory';
import OpportunityIntelligence from '@/components/OpportunityIntelligence';
import CampaignDecisionCanvas from '@/components/CampaignDecisionCanvas';
import { EXPERIMENT_REGISTRY } from '@/config/experiments';
import { env } from '@/config/environment';
import { DOMAIN_CATALOGUE, getDomainById, DEFAULT_DOMAIN_ID } from '@/config/domains';
import { PERSONA_CATALOGUE, getPersonaById } from '@/config/personas';
import ShellToast, { ToastMessage } from '@/components/ShellToast';
import { trackJourneyEvent, updateTelemetryContext } from '@/lib/journey-client';

export default function App() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { role, setRole, platformSetupComplete } = useApp();
  
  const [currentPage, setCurrentPage] = useState<string>('portfolio');
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('EXP-COMMITMENT-01');
  const [activeDomainId, setActiveDomainId] = useState<string>(DEFAULT_DOMAIN_ID);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Telemetry Session Start
  useEffect(() => {
    trackJourneyEvent({
      event_type: 'SESSION_STARTED',
      source: 'app_init',
      page: 'portfolio',
      metadata: { environment: 'demo_lab' }
    });
  }, []);

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
    else if (expId === 'EXP-CDI-01') setCurrentPage('campaign-decision');
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

  const handleDomainChange = (domainId: string) => {
    const domain = getDomainById(domainId);
    const activeTarget = domain && domain.status === 'coming_soon' ? 'retail_grocery' : domainId;
    
    updateTelemetryContext({ domain_id: domainId });
    trackJourneyEvent({
      event_type: 'DOMAIN_SELECTED',
      source: 'topbar_domain_select',
      page: currentPage,
      metadata: {
        requested_domain: domainId,
        active_domain: activeTarget,
        availability_status: domain ? domain.status : 'active'
      }
    });

    if (domain && domain.status === 'coming_soon') {
      setToast({
        id: `domain_${domain.id}_${Date.now()}`,
        title: `${domain.name}`,
        message: `Domain experience coming soon. CogniX experiments and demonstration solutions for ${domain.name} are planned for a future innovation pack.`,
        teaser: domain.teaser,
        type: 'coming_soon',
        actionText: 'Stay in Retail & Grocery',
        onAction: () => setActiveDomainId('retail_grocery')
      });
      // Do not switch active domain away from working retail_grocery
    } else {
      setActiveDomainId(domainId);
    }
  };

  const handlePersonaChange = (personaId: string) => {
    const persona = getPersonaById(personaId);
    const prevPersona = role;

    updateTelemetryContext({ persona_id: personaId });
    trackJourneyEvent({
      event_type: 'PERSONA_SELECTED',
      source: 'topbar_persona_select',
      page: currentPage,
      previous_state: { persona_id: prevPersona },
      new_state: { persona_id: personaId },
      metadata: {
        adaptive_behaviour_enabled: false,
        persona_status: persona ? persona.status : 'active'
      }
    });

    setRole(personaId as any);
    if (persona && persona.status === 'coming_soon') {
      setToast({
        id: `persona_${persona.id}_${Date.now()}`,
        title: `Persona Selected: ${persona.name}`,
        message: `Adaptive decision behaviour for ${persona.name} will be enabled in a future intelligence phase.`,
        teaser: persona.decisionLens,
        type: 'coming_soon'
      });
    }
  };

  const handleNotificationClick = () => {
    setToast({
      id: `notif_${Date.now()}`,
      title: 'Notifications coming soon',
      message: 'CogniX will surface Intelligence Moments, emerging risks, opportunities and learning events here.',
      type: 'info'
    });
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'atlas':
        return <CapabilityAtlas />;
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
      case 'campaign-decision':
        return <CampaignDecisionCanvas onNavigateToExperiment={handleNavigateToExperiment} />;
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

  return (
    <div className="app-shell">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      
      <div className="main-content">
        {/* Topbar: Quiet Context/Control Bar (No Page Title) */}
        <div className="topbar" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border)', height: 54, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CogniX Laboratory
            </span>
          </div>

          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Domain Context Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Domain Context:</span>
              <select
                className="select"
                value={activeDomainId}
                onChange={e => handleDomainChange(e.target.value)}
                title="Choose innovation domain"
                style={{ width: 175, height: 28, padding: '2px 6px', fontSize: '0.75rem', background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
              >
                {DOMAIN_CATALOGUE.map(cat => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.status === 'coming_soon' ? '(Coming Soon)' : '[Active]'}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Persona / Decision Perspective Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>Persona:</span>
              <select
                className="select"
                value={role}
                onChange={e => handlePersonaChange(e.target.value)}
                title="Choose decision perspective"
                style={{ width: 165, height: 28, padding: '2px 6px', fontSize: '0.75rem', background: '#F8FAFC', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 4 }}
              >
                {PERSONA_CATALOGUE.map(cat => (
                  <optgroup key={cat.category} label={cat.category}>
                    {cat.items.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name} {item.status === 'coming_soon' ? '(Coming Soon)' : ''}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Notifications Button (No fake red dot) */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleNotificationClick}
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
                title="Notifications"
                aria-label="Notifications"
              >
                <Bell size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Reusable Shell Toast Feedback */}
        <ShellToast toast={toast} onClose={() => setToast(null)} />

        {/* Page Content View */}
        <div key={currentPage} className="animate-fade">
          {renderPage()}
        </div>
      </div>
    </div>
  );
}
