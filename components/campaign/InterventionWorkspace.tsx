'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  FileText,
  Clock,
  Layers,
  Percent,
  Check
} from 'lucide-react';
import { CampaignArchetype, estimateInterventionEconomics, REGION_STORE_COUNTS } from '@/lib/campaign-archetypes';

export interface ActiveIntervention {
  title: string;
  type: string;
  description: string;
  proposed_discount: number;
  proposed_scope: number;
  proposed_duration: number;
  proposed_region: string;
  expected_demand: number;
  expected_contribution: number;
}

interface InterventionWorkspaceProps {
  archetype: CampaignArchetype;
  currentDiscount: number;
  currentRegion: string;
  currentDuration: number;
  intervention: ActiveIntervention | null;
  onAcceptIntervention: (intervention: ActiveIntervention) => void;
  onRejectIntervention: () => void;
  onNavigateToCommitment?: () => void;
}

export default function InterventionWorkspace({
  archetype,
  currentDiscount,
  currentRegion,
  currentDuration,
  intervention,
  onAcceptIntervention,
  onRejectIntervention,
  onNavigateToCommitment
}: InterventionWorkspaceProps) {
  const [acceptedBrief, setAcceptedBrief] = useState<boolean>(false);
  const [commitmentPrepared, setCommitmentPrepared] = useState<boolean>(false);

  if (!intervention) return null;

  // Current-configuration economics derived from the archetype's seeded elasticity curve
  // at the ACTUAL selected discount/region/duration — never the archetype's default story.
  const currentStores = REGION_STORE_COUNTS[currentRegion] ?? 50;
  const currentEconomics = estimateInterventionEconomics(archetype, {
    discount_pct: currentDiscount,
    stores: currentStores,
    duration_days: currentDuration
  });

  // Execution conditions come from the archetype's own declared boundary triggers.
  const executionTrigger =
    archetype.change_triggers.find(t => t.severity === 'VETO') || archetype.change_triggers[0];

  const formatGbp = (v: number) => {
    const abs = Math.abs(v);
    const str = abs >= 1000 ? `£${(abs / 1000).toFixed(1)}K` : `£${abs.toFixed(0)}`;
    return v >= 0 ? `+${str}` : `-${str}`;
  };

  const handleAccept = () => {
    if (intervention) {
      onAcceptIntervention(intervention);
      setAcceptedBrief(true);
    }
  };

  const handlePrepareCommitment = () => {
    setCommitmentPrepared(true);
    if (onNavigateToCommitment) {
      setTimeout(() => {
        onNavigateToCommitment();
      }, 1200);
    }
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '2px solid #2563EB',
        borderRadius: 12,
        padding: '24px 28px',
        boxShadow: '0 4px 12px rgba(37,99,235,0.08)',
        marginBottom: 24
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#2563EB'
            }}
          />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {acceptedBrief ? 'Execution Brief: Rebalanced Campaign Decision' : 'Proposed Campaign Intervention'}
          </h3>
        </div>

        {!acceptedBrief && (
          <span
            style={{
              fontSize: '0.75rem',
              color: '#1E40AF',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '3px 8px',
              borderRadius: 4,
              fontWeight: 600
            }}
          >
            ACTIONABLE PROPOSAL · UNCOMMITTED
          </span>
        )}
      </div>

      {!acceptedBrief && intervention && (
        <>
          <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 18px 0', lineHeight: 1.45 }}>
            <strong>{intervention.title}:</strong> {intervention.description}
          </p>

          {/* Current vs Proposed Side-by-Side Comparison */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 20
            }}
          >
            {/* Current Baseline Card */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                Current Configuration
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Discount Depth:</span>
                  <strong>{currentDiscount}% Cut</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Store Scope:</span>
                  <strong>{currentStores} Stores ({currentRegion})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Duration:</span>
                  <strong>{currentDuration} Days</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Expected Uplift:</span>
                  <strong style={{ color: currentEconomics.expected_demand_uplift_pct >= 0 ? '#059669' : '#DC2626' }}>
                    {currentEconomics.expected_demand_uplift_pct >= 0 ? '+' : ''}
                    {currentEconomics.expected_demand_uplift_pct.toFixed(1)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Net Contribution:</span>
                  <strong style={{ color: currentEconomics.net_contribution_delta_gbp >= 0 ? '#059669' : '#DC2626' }}>
                    {formatGbp(currentEconomics.net_contribution_delta_gbp)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Proposed Intervention Card */}
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 8 }}>
                Proposed CogniX Intervention
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Discount Depth:</span>
                  <strong style={{ color: '#2563EB' }}>{intervention.proposed_discount}% Cut</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Store Scope:</span>
                  <strong style={{ color: '#2563EB' }}>{intervention.proposed_scope} Stores ({intervention.proposed_region})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Duration:</span>
                  <strong style={{ color: '#2563EB' }}>{intervention.proposed_duration} Days</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #BFDBFE' }}>
                  <span style={{ color: '#475569' }}>Expected Uplift:</span>
                  <strong style={{ color: '#059669' }}>+{intervention.expected_demand.toFixed(1)}%</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Net Contribution:</span>
                  <strong style={{ color: '#059669' }}>
                    {formatGbp(intervention.expected_contribution)}
                  </strong>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 }}>
            <button
              onClick={onRejectIntervention}
              style={{
                background: '#FFFFFF',
                color: '#64748B',
                border: '1px solid #CBD5E1',
                padding: '8px 16px',
                borderRadius: 6,
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Dismiss Proposal
            </button>

            <button
              onClick={handleAccept}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '8px 20px',
                borderRadius: 6,
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <CheckCircle2 size={15} />
              Accept Intervention & Generate Execution Brief
            </button>
          </div>
        </>
      )}

      {/* Accepted Execution Brief */}
      {acceptedBrief && intervention && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '16px 20px'
            }}
          >
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', margin: '0 0 10px 0' }}>
              Execution Brief Summary (SKU: {archetype.default_sku} · {archetype.sku_name})
            </h4>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                fontSize: '0.825rem',
                marginBottom: 14
              }}
            >
              <div>
                <span style={{ color: '#64748B' }}>Approved Discount:</span>{' '}
                <strong>{intervention.proposed_discount}% Cut</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Target Store Scope:</span>{' '}
                <strong>{intervention.proposed_scope} Superstores</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Duration:</span>{' '}
                <strong>{intervention.proposed_duration} Days</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Projected Net Margin:</span>{' '}
                <strong style={{ color: intervention.expected_contribution >= 0 ? '#059669' : '#DC2626' }}>
                  {formatGbp(intervention.expected_contribution)}
                </strong>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#334155', lineHeight: 1.4, borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
              <strong>Execution Conditions:</strong>{' '}
              {executionTrigger
                ? `Valid while the declared boundary holds: ${executionTrigger.boundary_condition} (monitored signal: ${executionTrigger.monitored_signal}).`
                : 'No boundary triggers declared for this scenario.'}{' '}
              Monitoring in this environment is the simulated Decision Twin (demo).
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={16} />
              Intervention accepted. Ready for enterprise commitment handoff.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handlePrepareCommitment}
                disabled={commitmentPrepared}
                style={{
                  background: commitmentPrepared ? '#059669' : '#0F172A',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 20px',
                  borderRadius: 6,
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: commitmentPrepared ? 'default' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
                title="Prepares the brief and opens the Commitment Intelligence workspace — no commitment record is created automatically"
              >
                {commitmentPrepared ? (
                  <>
                    <Check size={14} />
                    Handoff Prepared — Opening Commitment Intelligence
                  </>
                ) : (
                  <>
                    <FileText size={14} />
                    Prepare Commitment Handoff
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
