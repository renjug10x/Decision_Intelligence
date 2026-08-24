'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Menu, X } from 'lucide-react';
import { useApp } from '@/lib/context';
import { useAuth } from '@/context/AuthContext';
import { appRoutes } from '@/config/routes';
import Sidebar from '@/components/Sidebar';
import CapabilityAtlas from '@/components/atlas/CapabilityAtlas';
import AboutSurface from '@/components/AboutSurface';
import ExperimentCanvas from '@/components/ExperimentCanvas';
import CategoryIntelligence from '@/components/CategoryIntelligence';
import PromotionPlanner from '@/components/PromotionPlanner';
import Forecasting from '@/components/Forecasting';
import ObservabilityGovernance from '@/components/ObservabilityGovernance';
import AvailabilityIntelligence from '@/components/AvailabilityIntelligence';
import CommitmentIntelligence from '@/components/CommitmentIntelligence';
import DecisionRippleIntelligence from '@/components/DecisionRippleIntelligence';
import EnterpriseMemory from '@/components/EnterpriseMemory';
import OpportunityIntelligence from '@/components/OpportunityIntelligence';
import CampaignDecisionCanvas from '@/components/CampaignDecisionCanvas';
import { EXPERIMENT_REGISTRY } from '@/config/experiments';
import { env } from '@/config/environment';
import ShellToast, { ToastMessage } from '@/components/ShellToast';
import { trackJourneyEvent, updateTelemetryContext } from '@/lib/journey-client';

export default function App() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { platformSetupComplete } = useApp();

  /*
   * ATL-04R: the Atlas is the landing surface. Portfolio and Questions are views inside it rather
   * than pages beside it, so `currentPage` no longer starts on a destination that has been removed.
   */
  const [currentPage, setCurrentPage] = useState<string>('atlas');
  /* ATL-FINAL: the narrow-viewport navigation switch. See the note on `SidebarProps.open`. */
  const [navOpen, setNavOpen] = useState(false);
  const [selectedExperimentId, setSelectedExperimentId] = useState<string>('EXP-COMMITMENT-01');
  const [toast, setToast] = useState<ToastMessage | null>(null);

  // Telemetry Session Start
  useEffect(() => {
    trackJourneyEvent({
      event_type: 'SESSION_STARTED',
      source: 'app_init',
      page: 'atlas',
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

  /*
   * ATL-04R removed `handleDomainChange` and `handlePersonaChange` along with the two global header
   * selectors that drove them.
   *
   * The reason is a product principle, not a tidy-up. A global persona selector states that the user
   * IS a persona for the session; a global domain selector states that the application HAS a domain
   * identity. Neither is true of an innovation atlas, where the same person needs to read the same
   * capability as an executive and then as an architect, and where a capability's reach across
   * domains is one of the things they are trying to understand. Both are now exploration dimensions
   * inside the Capability Atlas, changeable as often as the reader likes and never session-wide.
   *
   * `DOMAIN_SELECTED` and `PERSONA_SELECTED` remain members of the canonical event union and are
   * still emitted — from the Atlas, with their own source values — so the discovery funnel does not
   * go dark. What was retired is the control, not the observation.
   */

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
      // `portfolio` and `curiosity` are kept as aliases rather than deleted: they were the app's
      // landing key and its default branch, and a stale reference to either must land somewhere real
      // instead of falling through to an empty switch.
      case 'atlas':
      case 'portfolio':
      case 'curiosity':
        return (
          <CapabilityAtlas
            onOpenSolution={handleNavigateToSolution}
            onOpenExperiment={handleNavigateToExperiment}
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
            onBackToPortfolio={() => setCurrentPage('atlas')}
          />
        );
      case 'settings':       return <ObservabilityGovernance />;
      default:
        return (
          <CapabilityAtlas
            onOpenSolution={handleNavigateToSolution}
            onOpenExperiment={handleNavigateToExperiment}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <Sidebar
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        open={navOpen}
        onDismiss={() => setNavOpen(false)}
      />
      {navOpen && (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setNavOpen(false)}
        />
      )}
      
      <div className="main-content">
        {/* Topbar: Quiet Context/Control Bar (No Page Title) */}
        <div className="topbar" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--border)', height: 54, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/*
              Shown only below 1024px, where the stylesheet has slid the sidebar off-screen. Above
              that width the panel is always present and a menu button would be a control that
              duplicates what is already on the page.
            */}
            <button
              type="button"
              className="nav-toggle"
              aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
              aria-expanded={navOpen}
              onClick={() => setNavOpen(v => !v)}
            >
              {navOpen ? <X size={17} strokeWidth={1.9} /> : <Menu size={17} strokeWidth={1.9} />}
            </button>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              CogniX Laboratory
            </span>
          </div>

          <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/*
              ATL-04R: the Domain Context and Persona selectors were removed from here. Both are now
              exploration dimensions inside the Capability Atlas. About became this control — platform
              identification is a header affordance, not a navigation destination.
            */}
            <AboutSurface />

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
