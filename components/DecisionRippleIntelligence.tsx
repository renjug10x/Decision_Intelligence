'use client';
import { useState } from 'react';
import { 
  ChevronRight,
  Sparkles
} from 'lucide-react';

import ExecutionBriefing from '@/components/ExecutionBriefing';

interface DecisionRippleProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

export default function DecisionRippleIntelligence({ onNavigateToExperiment }: DecisionRippleProps = {}) {
  const [selectedAction, setSelectedAction] = useState<string>('promo_boost');
  const [budgetBoost, setBudgetBoost] = useState<number>(15);
  const [campaignScope, setCampaignScope] = useState<'national' | 'regional' | 'phased'>('national');
  const [showBriefing, setShowBriefing] = useState<boolean>(false);

  const scopeMultiplier = campaignScope === 'national' ? 1.0 : campaignScope === 'regional' ? 0.6 : 0.75;
  const directRevenue = Math.round(480000 * (1 + (budgetBoost * 0.012) * scopeMultiplier));
  const laborOvertimeCost = Math.round(32000 * (1 + (budgetBoost * 0.025) * scopeMultiplier));
  const marginErosionPercent = (2.2 * (budgetBoost / 15) * scopeMultiplier).toFixed(1);
  const netMarginDelta = Math.round(directRevenue * 0.28 - laborOvertimeCost - 45000);

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1140, margin: '0 auto', paddingBottom: 48 }}>
      
      {/* Header Banner */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Decision Ripple Intelligence
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Simulate how commercial decisions propagate into 2nd-order warehouse overtime and 3rd-order margin erosion.
          </p>
        </div>

        {onNavigateToExperiment && (
          <button
            onClick={() => onNavigateToExperiment('EXP-MEMORY-03')}
            style={{
              padding: '6px 12px',
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
            Check Enterprise Memory <ChevronRight size={13} />
          </button>
        )}
      </div>

      {/* Enterprise Learning Pattern Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--g10x-orange)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', background: 'rgba(255,107,0,0.08)', padding: '2px 8px', borderRadius: 4 }}>
              Enterprise Learning Pattern Recognized
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Distribution Center Overtime Propagation (PAT-RIPPLE-04)
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
          Unplanned promotional volume surges exceeding 25% daily DC throughput trigger 2nd-order warehouse overtime costs and 3rd-order store delivery delays.
        </p>

        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Situation Similarity: <strong style={{ color: 'var(--text-primary)' }}>88%</strong></span>
          <span>Pattern Confidence: <strong style={{ color: 'var(--text-primary)' }}>81%</strong></span>
          <span>Intervention Success Rate: <strong style={{ color: 'var(--success)' }}>82% (8 occurrences)</strong></span>
        </div>
      </div>

      <ExecutionBriefing
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        briefing={{
          title: 'Decision Ripple Execution Briefing — Promotional Logistics',
          situation: 'National 15% promotional boost generates a +28% daily volume surge at Trafford DC without pre-arranged labor flex.',
          whyNow: 'Unmitigated order release will force 18 hours of weekend warehouse overtime and delay Monday morning store replenishment.',
          recommendedAction: 'Stagger store delivery schedule across a 72-hour window prior to promotional launch.',
          owner: 'Head of Logistics & Operations',
          dependencies: ['Trafford DC Shift Roster Adjustment', 'Store Manager Staggered Order Release'],
          timeHorizon: 'Next 72 Hours',
          expectedOutcome: 'Eliminates £4,200 warehouse overtime penalty and guarantees 08:00 store availability.',
          confidence: 81,
          patternId: 'PAT-RIPPLE-04',
          contractStatus: 'VERIFIED',
          evidence: [
            '1st Order: Promotional volume surge +28%',
            '2nd Order: Trafford DC weekend overtime +18 hours',
            '3rd Order: Monday morning store delivery delay 1.8 hours (Historical 8 occurrences evaluated)'
          ]
        }}
      />

      {/* Decision Selector & Sliders */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 10, marginBottom: 16 }}>
          <button
            onClick={() => setSelectedAction('promo_boost')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: selectedAction === 'promo_boost' ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
              background: selectedAction === 'promo_boost' ? 'var(--curiosity-light)' : '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              1. Boost Promotional Spend (+{budgetBoost}%)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Commercial action to drive volume lift.
            </div>
          </button>

          <button
            onClick={() => setSelectedAction('payment_terms')}
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-sm)',
              border: selectedAction === 'payment_terms' ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
              background: selectedAction === 'payment_terms' ? 'var(--curiosity-light)' : '#FFFFFF',
              textAlign: 'left',
              cursor: 'pointer'
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              2. Extend Payment Terms (+14 Days)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Treasury action for working capital.
            </div>
          </button>
        </div>

        {/* Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary)' }}>Promotional Boost:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>+{budgetBoost}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="35"
              value={budgetBoost}
              onChange={e => setBudgetBoost(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
              Deployment Scope:
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['national', 'regional', 'phased'] as const).map(sc => (
                <button
                  key={sc}
                  onClick={() => setCampaignScope(sc)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    border: campaignScope === sc ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                    background: campaignScope === sc ? 'var(--curiosity-light)' : '#FFFFFF',
                    color: campaignScope === sc ? 'var(--g10x-orange)' : 'var(--text-secondary)',
                    cursor: 'pointer'
                  }}
                >
                  {sc.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Ripple Propagation Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        
        {/* 1st Order Effect */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--success)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>
            1st Order · Direct Outcome
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
            Commercial Revenue Surge
          </h3>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 10 }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Gross Revenue Lift</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>
              £{directRevenue.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--success)', marginTop: 2 }}>
              +{(budgetBoost * 1.2).toFixed(1)}% Sales Volume
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Direct marketing uplift achieves top-line target cleanly.
          </p>
        </div>

        {/* 2nd Order Effect */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--warning)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--warning)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>
            2nd Order · Operational Side-Effect
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
            DC & Logistics Overtime
          </h3>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 10 }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Overtime Labor Expense</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)', marginTop: 2 }}>
              £{laborOvertimeCost.toLocaleString()}
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--warning)', marginTop: 2 }}>
              +{(budgetBoost * 2.5).toFixed(0)}% Warehouse Congestion
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Rapid volume throughput forces emergency weekend labor shifts.
          </p>
        </div>

        {/* 3rd Order Effect */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderTop: '3px solid var(--g10x-red)',
          borderRadius: 'var(--radius-md)',
          padding: '20px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ fontSize: '0.625rem', fontWeight: 600, color: 'var(--g10x-red)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: '0.04em' }}>
            3rd Order · Net Financial Impact
          </div>
          <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10 }}>
            Net Margin Erosion
          </h3>
          <div style={{ background: 'var(--bg-subtle)', padding: '12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 10 }}>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Margin Compression</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--g10x-red)', marginTop: 2 }}>
              -{marginErosionPercent}%
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-secondary)', marginTop: 2 }}>
              Net Profit Delta: <strong style={{ color: netMarginDelta > 0 ? 'var(--success)' : 'var(--g10x-red)' }}>+£{netMarginDelta.toLocaleString()}</strong>
            </div>
          </div>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
            Overtime fees and expedited freight compress net margin by {marginErosionPercent}%.
          </p>
        </div>

      </div>
    </div>
  );
}
