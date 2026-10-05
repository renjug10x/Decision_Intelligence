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
import { CampaignArchetype, estimateInterventionEconomics } from '@/lib/campaign-archetypes';
import {
  ActiveIntervention,
  PlannerCampaignConfig,
  applyAcceptedIntervention
} from '@/lib/campaign-candidate-intervention';
/* SCI-03R (`R-35`): the ACTIVE scenario, not the reference instance bound by name. A surface that reads `CANONICAL_*` publishes Fresh Dairy's terms under whatever scenario is selected. */
import { inScopeStoreCount } from '@/packages/contracts/src/scenario-scope';
import { useCurrency } from '@/context/CurrencyContext';

export type { ActiveIntervention };

interface InterventionWorkspaceProps {
  archetype: CampaignArchetype;
  currentDiscount: number;
  currentRegion: string;
  currentDuration: number;
  intervention: ActiveIntervention | null;
  committedConfiguration?: PlannerCampaignConfig | null;
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
  committedConfiguration = null,
  onAcceptIntervention,
  onRejectIntervention,
  onNavigateToCommitment
}: InterventionWorkspaceProps) {
  const { money, localise } = useCurrency();
  const [acceptedBrief, setAcceptedBrief] = useState<boolean>(false);
  const [commitmentPrepared, setCommitmentPrepared] = useState<boolean>(false);

  const interventionKey = intervention
    ? `${intervention.title}|${intervention.proposed_discount}|${intervention.proposed_region}|${intervention.proposed_duration}|${intervention.provenance?.source_id || ''}`
    : '';

  React.useEffect(() => {
    setAcceptedBrief(false);
    setCommitmentPrepared(false);
  }, [interventionKey]);

  if (!intervention) return null;

  // Baseline configuration always honours the original committed baseline when present
  // so Committed A -> Candidate B -> Accept B -> Candidate C preserves Committed A.
  const baselineDiscount = committedConfiguration?.discount_pct ?? currentDiscount;
  const baselineRegion = committedConfiguration?.region ?? currentRegion;
  const baselineDuration = committedConfiguration?.duration_days ?? currentDuration;
  const baselineStores = inScopeStoreCount(baselineRegion);

  const hasPriorAcceptedDiff =
    committedConfiguration !== null &&
    (committedConfiguration.discount_pct !== currentDiscount ||
      committedConfiguration.region !== currentRegion ||
      committedConfiguration.duration_days !== currentDuration);

  const compCtx = intervention.provenance?.competitive_context ?? null;

  const baselineEconomics = compCtx
    ? {
        expected_demand_uplift_pct: compCtx.baseline_expected_demand_uplift_pct,
        net_contribution_delta_gbp: compCtx.baseline_net_contribution_delta_gbp
      }
    : estimateInterventionEconomics(archetype, {
        discount_pct: baselineDiscount,
        stores: baselineStores,
        duration_days: baselineDuration
      });

  // Applied planner configuration
  const appliedConfig = applyAcceptedIntervention({
    current: {
      discount_pct: currentDiscount,
      region: currentRegion,
      duration_days: currentDuration
    },
    committed: committedConfiguration,
    candidate: intervention,
    availableRegions: [currentRegion, intervention.proposed_region]
  }).next;

  // Execution conditions come from the archetype's own declared boundary triggers.
  const executionTrigger =
    archetype.change_triggers.find(t => t.severity === 'VETO') || archetype.change_triggers[0];

  /* Signed money in the reader's currency, converted once from the modelled GBP amount. */
  const formatGbp = (v: number) => money(v, { signed: true });

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

  const renderCompetitiveProvenanceBlock = (testId: string) => {
    if (!compCtx) return null;
    return (
      <div
        data-testid={testId}
        style={{
          background: '#F8FAFC',
          border: '1px solid #CBD5E1',
          borderRadius: 8,
          padding: '12px 14px',
          marginBottom: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: '0.76rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: 800,
                color: '#1E293B',
                background: '#FFFFFF',
                border: '1px solid #94A3B8',
                padding: '2px 7px',
                borderRadius: 4
              }}
            >
              {compCtx.provenance_badge}
            </span>
            <strong style={{ color: '#0F172A' }}>{compCtx.provenance_label}</strong>
          </div>
          <span
            style={{
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#1E40AF',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              padding: '2px 7px',
              borderRadius: 4
            }}
          >
            SELECTED RESPONSE: {compCtx.selected_response_label}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
            gap: 8,
            paddingTop: 4,
            borderTop: '1px solid #E2E8F0'
          }}
        >
          <div>
            <span style={{ color: '#64748B' }}>Competitive benchmark:</span>{' '}
            <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
              {money(compCtx.assumed_competitive_price_gbp, { decimals: 2, compact: false })}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Demand sensitivity (γ):</span>{' '}
            <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
              {compCtx.competitive_response_pp_per_disadvantage_point}pp/pp
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Relative position:</span>{' '}
            <strong style={{ color: '#0F172A' }}>
              {localise(compCtx.relative_price_position_label)}
            </strong>
          </div>
          <div>
            <span style={{ color: '#64748B' }}>Decision boundary:</span>{' '}
            <strong style={{ color: '#0F172A' }}>
              {localise(compCtx.decision_boundary_headline)}
            </strong>
          </div>
        </div>

        <div
          data-testid={`${testId}-governance-statement`}
          style={{
            fontSize: '0.74rem',
            fontWeight: 600,
            color: '#334155',
            paddingTop: 4,
            borderTop: '1px dashed #CBD5E1'
          }}
        >
          {compCtx.governance_statement}
        </div>
      </div>
    );
  };

  return (
    <div
      data-testid="intervention-workspace"
      style={{
        background: '#FFFFFF',
        border: acceptedBrief ? '2px solid #059669' : '2px solid #2563EB',
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
              background: acceptedBrief ? '#059669' : '#2563EB'
            }}
          />
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
            {acceptedBrief ? 'Accepted Configuration: Candidate Applied to Planner' : 'Candidate Intervention Under Review'}
          </h3>
        </div>

        <span
          style={{
            fontSize: '0.72rem',
            color: acceptedBrief ? '#065F46' : '#1E40AF',
            background: acceptedBrief ? '#ECFDF5' : '#EFF6FF',
            border: `1px solid ${acceptedBrief ? '#A7F3D0' : '#BFDBFE'}`,
            padding: '3px 8px',
            borderRadius: 4,
            fontWeight: 700
          }}
        >
          {acceptedBrief ? 'ACCEPTED CONFIGURATION · LIVE CDI RECALCULATED' : 'CANDIDATE INTERVENTION · UNCOMMITTED'}
        </span>
      </div>

      {!acceptedBrief && intervention && (
        <>
          <p style={{ fontSize: '0.875rem', color: '#475569', margin: '0 0 18px 0', lineHeight: 1.45 }}>
            <strong>{intervention.title}:</strong> {localise(intervention.description)}
          </p>
          {intervention.provenance && (
            <div style={{ fontSize: '0.75rem', color: '#1E40AF', margin: '-10px 0 16px 0' }}>
              Source: {intervention.provenance.source_lens.replace(/_/g, ' ')}
              {intervention.provenance.source_id ? ` (${intervention.provenance.source_id})` : ''}
              {intervention.provenance.source_label ? ` · ${intervention.provenance.source_label}` : ''}
              {intervention.provenance.comparison_basis === 'SCENARIO_ELASTICITY_CURVE'
                ? ' · scenario elasticity curve (not the CDI-06 activation frontier)'
                : ''}
              {typeof intervention.provenance.funding_overlay_gbp === 'number'
                ? ` · supplier funding overlay ${formatGbp(intervention.provenance.funding_overlay_gbp)}`
                : ''}
            </div>
          )}

          {renderCompetitiveProvenanceBlock('candidate-competitive-context')}

          {/* Committed vs Candidate Side-by-Side Comparison */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 16,
              marginBottom: 20
            }}
          >
            {/* Committed Baseline Card */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                Committed Configuration (Baseline)
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Discount Depth:</span>
                  <strong>{baselineDiscount}% Cut</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Store Scope:</span>
                  <strong>{baselineStores} Stores ({baselineRegion})</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Duration:</span>
                  <strong>{baselineDuration} Days</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
                  <span style={{ color: '#64748B' }}>Expected Uplift:</span>
                  <strong style={{ color: baselineEconomics.expected_demand_uplift_pct >= 0 ? '#059669' : '#DC2626' }}>
                    {baselineEconomics.expected_demand_uplift_pct >= 0 ? '+' : ''}
                    {baselineEconomics.expected_demand_uplift_pct.toFixed(1)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B' }}>Net Contribution:</span>
                  <strong style={{ color: baselineEconomics.net_contribution_delta_gbp >= 0 ? '#059669' : '#DC2626' }}>
                    {formatGbp(baselineEconomics.net_contribution_delta_gbp)}
                  </strong>
                </div>
              </div>

              {hasPriorAcceptedDiff && (
                <div
                  style={{
                    marginTop: 10,
                    paddingTop: 8,
                    borderTop: '1px dashed #CBD5E1',
                    fontSize: '0.74rem',
                    color: '#065F46'
                  }}
                >
                  Currently applied on planner controls:{' '}
                  <strong>
                    {currentDiscount}% · {currentRegion} · {currentDuration} days
                  </strong>
                </div>
              )}
            </div>

            {/* Candidate Intervention Card */}
            <div
              style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: '16px'
              }}
            >
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: 8 }}>
                Candidate Intervention
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
                  <strong style={{ color: '#2563EB' }}>
                    {intervention.proposed_duration} Days
                    {appliedConfig.duration_days !== intervention.proposed_duration
                      ? ` (applies as ${appliedConfig.duration_days}d planner control)`
                      : ''}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid #BFDBFE' }}>
                  <span style={{ color: '#475569' }}>Expected Uplift:</span>
                  <strong style={{ color: intervention.expected_demand >= 0 ? '#059669' : '#DC2626' }}>
                    {intervention.expected_demand >= 0 ? '+' : ''}
                    {intervention.expected_demand.toFixed(1)}%
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#475569' }}>Net Contribution:</span>
                  <strong style={{ color: intervention.expected_contribution >= 0 ? '#059669' : '#DC2626' }}>
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
              Accept Intervention — apply to campaign configuration
            </button>
          </div>
        </>
      )}

      {/* Accepted Execution Brief & Restrained Transition Summary */}
      {acceptedBrief && intervention && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Restrained Candidate Applied Transition Summary */}
          <div
            data-testid="candidate-applied-summary"
            style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 8,
              padding: '14px 18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 6 }}>
                Candidate applied
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto auto', columnGap: 18, rowGap: 4, fontSize: '0.82rem', color: '#0F172A' }}>
                <span style={{ color: '#475569', fontWeight: 600 }}>Discount</span>
                <strong style={{ fontFamily: 'monospace' }}>
                  {baselineDiscount}% → {currentDiscount}%
                </strong>
                <span style={{ color: '#475569', fontWeight: 600 }}>Region</span>
                <strong>
                  {baselineRegion} → {currentRegion}
                </strong>
                <span style={{ color: '#475569', fontWeight: 600 }}>Duration</span>
                <strong>
                  {baselineDuration} → {currentDuration} days
                </strong>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  color: '#065F46',
                  background: '#FFFFFF',
                  border: '1px solid #A7F3D0',
                  padding: '5px 10px',
                  borderRadius: 6
                }}
              >
                <CheckCircle2 size={14} color="#059669" />
                Live assessment recalculated
              </span>
              {intervention.provenance && (
                <div style={{ fontSize: '0.7rem', color: '#047857', marginTop: 4, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                  Provenance: {intervention.provenance.source_lens.replace(/_/g, ' ')} · {intervention.provenance.source_id}
                </div>
              )}
            </div>
          </div>

          {renderCompetitiveProvenanceBlock('accepted-competitive-context')}

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
            <p style={{ fontSize: '0.8rem', color: '#334155', margin: '0 0 12px 0', lineHeight: 1.45 }}>
              This candidate is now the active planner configuration. Live CDI-02/03/04/05 have re-evaluated
              it, and Approve &amp; Activate will register this configuration into CDI-06 / CDI-07A.
            </p>
            {committedConfiguration && (
              <div style={{ fontSize: '0.78rem', color: '#64748B', marginBottom: 12 }}>
                Committed baseline retained for comparison:{' '}
                <strong>
                  {committedConfiguration.discount_pct}% · {committedConfiguration.region} ·{' '}
                  {committedConfiguration.duration_days} days
                </strong>
              </div>
            )}
            {intervention.provenance?.factors && intervention.provenance.factors.length > 0 && (
              <div style={{ fontSize: '0.78rem', color: '#475569', marginBottom: 12 }}>
                <strong>Inherited evidence:</strong>{' '}
                {intervention.provenance.factors
                  .map(f => `${f.label}${typeof f.points === 'number' ? ` ${f.points >= 0 ? '+' : ''}${f.points}` : ''}`)
                  .join(' · ')}
              </div>
            )}

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
                <span style={{ color: '#64748B' }}>Applied Discount:</span>{' '}
                <strong>{currentDiscount}% Cut</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Target Store Scope:</span>{' '}
                <strong>{inScopeStoreCount(currentRegion)} Superstores ({currentRegion})</strong>
              </div>
              <div>
                <span style={{ color: '#64748B' }}>Applied Duration:</span>{' '}
                <strong>{currentDuration} Days</strong>
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
              Intervention accepted. Ready for Approve &amp; Activate or Commitment handoff.
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
