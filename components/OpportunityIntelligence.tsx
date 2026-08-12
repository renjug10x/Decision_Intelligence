'use client';
import { useState } from 'react';
import ExecutionBriefing from '@/components/ExecutionBriefing';
import { 
  CheckCircle2, 
  ChevronRight,
  Zap,
  ArrowRight
} from 'lucide-react';

export interface OpportunityItem {
  id: string;
  title: string;
  domain: string;
  signalsCombined: string[];
  constraintsChecked: string[];
  estimatedValue: string;
  confidenceScore: number;
  recommendedAction: string;
  rationale: string;
  targetSolutionId: string;
  targetSolutionName: string;
}

export const OPPORTUNITY_ITEMS: OpportunityItem[] = [
  {
    id: 'OPP-001',
    title: 'Regional Fresh Dairy Volume Acceleration',
    domain: 'Commercial & Supply Chain',
    signalsCombined: [
      'Demand acceleration +18% in North West region',
      'Supplier packaging lead time buffer healthy (3.4 days)',
      'DC Trafford holding 1,200 excess safety units'
    ],
    constraintsChecked: [
      'Store shelf capacity: Verified (+14% headroom)',
      'Transport fleet capacity: Verified (2 daily slots open)'
    ],
    estimatedValue: '+£84,000 Net Margin Opportunity',
    confidenceScore: 92,
    recommendedAction: 'Expand promotional discount by +5% in North West region for 7-day flash campaign.',
    rationale: 'Unused supplier headroom and excess RDC safety stock allow capturing regional demand acceleration without risking delivery SLA breach.',
    targetSolutionId: 'SOL-PROMO-01',
    targetSolutionName: 'Promotion Intelligence'
  },
  {
    id: 'OPP-002',
    title: 'Produce Assortment Rebalancing & Waste Reduction',
    domain: 'Category Management',
    signalsCombined: [
      'Organic Salad velocity accelerating +14%',
      'Conventional Salad shrinkage rising +2.8%',
      'Supplier FreshDirect offering volume tier discount'
    ],
    constraintsChecked: [
      'RDC cold chain temperature compliance: 100%',
      'Store display space: 2 facing slots reallocatable'
    ],
    estimatedValue: '+£36,000 Margin & Waste Savings',
    confidenceScore: 88,
    recommendedAction: 'Reallocate 2 display facings from Conventional to Organic Salad across 12 high-velocity stores.',
    rationale: 'Aligning display facings with organic velocity reduces waste shrinkage on slow-moving SKUs while capturing tier supplier discounts.',
    targetSolutionId: 'SOL-CAT-04',
    targetSolutionName: 'Category Intelligence'
  }
];

interface OpportunityIntelligenceProps {
  onNavigateToSolution?: (solutionId: string) => void;
  onNavigateToExperiment?: (experimentId: string) => void;
}

export default function OpportunityIntelligence({ onNavigateToSolution }: OpportunityIntelligenceProps = {}) {
  const [selectedOpportunity, setSelectedOpportunity] = useState<OpportunityItem>(OPPORTUNITY_ITEMS[0]);
  const [actionExecuted, setActionExecuted] = useState<boolean>(false);
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: 48 }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Opportunity Intelligence
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Discover value-creation opportunities by combining demand acceleration, inventory headroom, and supplier capacity signals.
          </p>
        </div>
      </div>

      {/* Enterprise Learning Pattern Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--g10x-orange)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: 20,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', background: 'rgba(255,107,0,0.08)', padding: '2px 8px', borderRadius: 4 }}>
              Evidence-Led Opportunity Pattern Detected
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Regional Demand Surge & Supplier Headroom (PAT-OPP-02)
            </span>
          </div>

          <button
            onClick={() => setShowBriefing(true)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              color: 'var(--g10x-orange)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Generate Execution Briefing <ChevronRight size={13} />
          </button>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Demand acceleration (+18%) + Muller Dairy capacity headroom (+25%) + Trafford DC excess inventory. Average historical margin uplift: +6.8%.
        </p>

        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Situation Similarity: <strong style={{ color: 'var(--text-primary)' }}>89%</strong></span>
          <span>Pattern Confidence: <strong style={{ color: 'var(--text-primary)' }}>84%</strong></span>
          <span>Intervention Success Rate: <strong style={{ color: 'var(--success)' }}>86% (7 occurrences)</strong></span>
        </div>
      </div>

      {/* Main Grid: Opportunities List + Causal Opportunity Solver Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 20 }}>
        
        {/* Left Column: Opportunity Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {OPPORTUNITY_ITEMS.map(op => {
            const isSelected = selectedOpportunity.id === op.id;
            return (
              <div
                key={op.id}
                onClick={() => { setSelectedOpportunity(op); setActionExecuted(false); }}
                style={{
                  background: '#FFFFFF',
                  border: isSelected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                  borderLeft: isSelected ? '4px solid var(--g10x-orange)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {op.domain}
                </div>

                <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                  {op.title}
                </div>

                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--g10x-orange)', marginBottom: 8 }}>
                  {op.estimatedValue}
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {op.confidenceScore}% Telemetry Confidence
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Opportunity Solver Detail Panel */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 24
        }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Signal Convergence
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            {selectedOpportunity.title}
          </h3>

          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--g10x-orange)', marginBottom: 16 }}>
            {selectedOpportunity.estimatedValue}
          </div>

          {/* Signals Fusion Section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Signals Converging
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedOpportunity.signalsCombined.map((sig, idx) => (
                <div key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={13} color="var(--g10x-orange)" /> {sig}
                </div>
              ))}
            </div>
          </div>

          {/* Constraints Checked Section */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
              Feasibility Verified
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedOpportunity.constraintsChecked.map((con, idx) => (
                <div key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <CheckCircle2 size={13} color="var(--success)" /> {con}
                </div>
              ))}
            </div>
          </div>

          {/* Rationale */}
          <div style={{ background: 'var(--curiosity-light)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-accent)', marginBottom: 20 }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', marginBottom: 4 }}>
              Why This Opportunity Exists
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {selectedOpportunity.rationale}
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setActionExecuted(true)}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: actionExecuted ? 'var(--success)' : 'var(--g10x-orange)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              {actionExecuted ? (
                <>Opportunity Action Dispatched <CheckCircle2 size={13} /></>
              ) : (
                <>Execute Action <Zap size={13} /></>
              )}
            </button>

            {onNavigateToSolution && (
              <button
                onClick={() => onNavigateToSolution(selectedOpportunity.targetSolutionId)}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: '#FFFFFF',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border)',
                  fontWeight: 500,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}
              >
                Open Solution <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>

      </div>

      <ExecutionBriefing
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        briefing={{
          title: `Opportunity Execution Briefing — ${selectedOpportunity.title}`,
          situation: selectedOpportunity.rationale,
          whyNow: 'Multi-signal fusion confirms supplier headroom and excess DC stock available now.',
          recommendedAction: selectedOpportunity.recommendedAction,
          owner: 'Commercial Merchandising Lead',
          dependencies: ['Muller Dairy Headroom Confirmation', 'EPOS Price Override Schedule'],
          timeHorizon: 'Next 7 Days',
          expectedOutcome: `Captures estimated ${selectedOpportunity.estimatedValue} gross margin lift.`,
          confidence: selectedOpportunity.confidenceScore,
          patternId: 'PAT-OPP-02',
          contractStatus: 'VERIFIED',
          evidence: selectedOpportunity.signalsCombined.concat(selectedOpportunity.constraintsChecked)
        }}
      />
    </div>
  );
}
