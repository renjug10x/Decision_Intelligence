'use client';

import React from 'react';
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  ShieldCheck,
  Activity,
  Layers,
  HelpCircle,
  Clock
} from 'lucide-react';
import { CampaignArchetype } from '@/lib/campaign-archetypes';
import { label as executiveLabel } from '@/lib/campaign-decision-language';

interface CampaignDiscoveryHeroProps {
  archetype: CampaignArchetype;
  /** Unwrapped CDI-02 evaluation response, or null when the engine call failed. */
  liveEvaluation?: any;
  /** Unwrapped CDI-04 readiness response, or null when the engine call failed. */
  liveReadiness?: any;
  /** Unwrapped CDI-03 opportunity discovery response, or null when the engine call failed. */
  liveOpportunity?: any;
  isEvaluating?: boolean;
  evaluationError?: string | null;
  currentDiscount: number;
  currentRegion: string;
  currentDuration: number;
  activeMode: 'PLANNING' | 'DECISION_TWIN';
  /** CTW-01 — there is no in-flight campaign until a decision is activated. */
  flightAvailable?: boolean;
  onSwitchMode: (mode: 'PLANNING' | 'DECISION_TWIN') => void;
  onExploreDecision: () => void;
  onSelectLens?: (lensId: string) => void;
}

export default function CampaignDiscoveryHero({
  archetype,
  liveEvaluation,
  liveReadiness,
  liveOpportunity,
  isEvaluating,
  evaluationError,
  currentDiscount,
  currentRegion,
  currentDuration,
  activeMode,
  flightAvailable = false,
  onSwitchMode,
  onExploreDecision,
  onSelectLens
}: CampaignDiscoveryHeroProps) {
  const d = archetype.discovery;

  /** The seeded verdict codes, stated as a decision rather than as a status word. */
  const verdictLabel = (verdict: string) => {
    switch (verdict) {
      case 'ACCRETIVE GO': return 'Proceed — value accretive';
      case 'CONDITIONAL GO': return 'Proceed with conditions';
      case 'MARGIN RISK': return 'Margin at risk';
      case 'SUPPLY INFEASIBLE': return 'Not deliverable on current supply';
      case 'RECONSIDER': return 'Reconsider';
      default: return verdict;
    }
  };

  const getVerdictStyle = (verdict: string) => {
    switch (verdict) {
      case 'ACCRETIVE GO':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: CheckCircle2 };
      case 'CONDITIONAL GO':
        return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', icon: AlertTriangle };
      case 'MARGIN RISK':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: XCircle };
      case 'SUPPLY INFEASIBLE':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: XCircle };
      case 'RECONSIDER':
        return { bg: '#FFF1F2', text: '#BE123C', border: '#FECDD3', icon: AlertTriangle };
      default:
        return { bg: '#F8FAFC', text: '#334155', border: '#E2E8F0', icon: ShieldCheck };
    }
  };

  const vStyle = getVerdictStyle(d.decision_verdict);
  const VerdictIcon = vStyle.icon;

  // Format currency display
  const formatGbp = (v: number) => {
    const abs = Math.abs(v);
    const str = abs >= 1000 ? `£${(abs / 1000).toFixed(1)}K` : `£${abs.toFixed(0)}`;
    return v >= 0 ? `+${str}` : `-${str}`;
  };

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
        borderRadius: 12,
        border: '1px solid #E2E8F0',
        padding: '24px 28px',
        marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        position: 'relative'
      }}
    >
      {/* Top Banner Row: CogniX Mode Switcher & Provenance Indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#F1F5F9',
              padding: '4px 10px',
              borderRadius: 6,
              fontSize: '0.75rem',
              fontWeight: 600,
              color: '#475569',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}
          >
            <Sparkles size={13} color="#2563EB" />
            CogniX Decision Intelligence
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              color: '#94A3B8',
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              padding: '3px 8px',
              borderRadius: 4
            }}
            title="All scenario narratives and metrics in this panel are seeded, uncalibrated demonstration data — not production evidence"
          >
            Simulated scenario · not calibrated
          </span>
        </div>

        {/* Mode Switcher: Pre-Flight Planning vs Live Decision Twin */}
        <div
          style={{
            display: 'inline-flex',
            background: '#F1F5F9',
            padding: 3,
            borderRadius: 8,
            border: '1px solid #E2E8F0'
          }}
        >
          <button
            onClick={() => onSwitchMode('PLANNING')}
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: activeMode === 'PLANNING' ? 600 : 500,
              background: activeMode === 'PLANNING' ? '#FFFFFF' : 'transparent',
              color: activeMode === 'PLANNING' ? '#0F172A' : '#64748B',
              border: 'none',
              boxShadow: activeMode === 'PLANNING' ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <Layers size={14} color={activeMode === 'PLANNING' ? '#2563EB' : '#64748B'} />
            Pre-Flight Decision Intelligence
          </button>

          <button
            onClick={() => onSwitchMode('DECISION_TWIN')}
            aria-disabled={!flightAvailable}
            title={
              flightAvailable
                ? 'Campaign in flight, assessed against the activated decision'
                : 'No campaign is in flight yet — review and activate the decision first'
            }
            style={{
              padding: '5px 14px',
              borderRadius: 6,
              fontSize: '0.8rem',
              fontWeight: activeMode === 'DECISION_TWIN' ? 600 : 500,
              background: activeMode === 'DECISION_TWIN' ? '#2563EB' : 'transparent',
              color:
                activeMode === 'DECISION_TWIN' ? '#FFFFFF' : flightAvailable ? '#64748B' : '#94A3B8',
              border: 'none',
              boxShadow: activeMode === 'DECISION_TWIN' ? '0 1px 3px rgba(37,99,235,0.3)' : 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'all 0.15s ease'
            }}
          >
            <Activity
              size={14}
              color={
                activeMode === 'DECISION_TWIN' ? '#FFFFFF' : flightAvailable ? '#64748B' : '#94A3B8'
              }
            />
            Campaign In-Flight
            {/* The dot means a campaign is actually in flight, so it is off until one is. */}
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: !flightAvailable
                  ? '#CBD5E1'
                  : activeMode === 'DECISION_TWIN'
                    ? '#86EFAC'
                    : '#22C55E',
                display: 'inline-block'
              }}
            />
          </button>
        </div>
      </div>

      {/* Main Hero Header */}
      <div style={{ marginBottom: 18 }}>
        <h1
          style={{
            fontSize: '1.45rem',
            fontWeight: 700,
            color: '#0F172A',
            margin: '0 0 6px 0',
            letterSpacing: '-0.02em',
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}
        >
          <span style={{ color: '#2563EB' }}>CogniX found something:</span>
          <span>{d.headline}</span>
        </h1>
        <p
          style={{
            fontSize: '0.95rem',
            color: '#475569',
            margin: 0,
            lineHeight: 1.5,
            maxWidth: 920
          }}
        >
          {d.core_narrative}
        </p>
      </div>

      {/* Headline Metric Cards Grid — seeded scenario narrative */}
      <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
        Simulated scenario narrative
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 14,
          marginBottom: 14
        }}
      >
        {/* Metric 1: Expected Demand */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B', marginBottom: 4 }}>
            Expected Demand Uplift
          </div>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: d.expected_demand_uplift_pct >= 0 ? '#059669' : '#DC2626',
              display: 'flex',
              alignItems: 'baseline',
              gap: 4
            }}
          >
            {d.expected_demand_uplift_pct >= 0 ? '+' : ''}{d.expected_demand_uplift_pct.toFixed(1)}%
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94A3B8' }}>vs baseline</span>
          </div>
        </div>

        {/* Metric 2: Net Contribution */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B', marginBottom: 4 }}>
            Net Contribution Delta
          </div>
          <div
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: d.net_contribution_delta_gbp >= 0 ? '#059669' : '#DC2626',
              display: 'flex',
              alignItems: 'baseline',
              gap: 4
            }}
          >
            {formatGbp(d.net_contribution_delta_gbp)}
            <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#94A3B8' }}>commercial delta</span>
          </div>
        </div>

        {/* Metric 3: Decision Verdict */}
        <div
          style={{
            background: vStyle.bg,
            border: `1px solid ${vStyle.border}`,
            borderRadius: 8,
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: vStyle.text, marginBottom: 4 }}>
            CogniX Decision Verdict
          </div>
          <div
            style={{
              fontSize: '1.15rem',
              fontWeight: 700,
              color: vStyle.text,
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <VerdictIcon size={18} />
            {verdictLabel(d.decision_verdict)}
          </div>
        </div>

        {/* Metric 4: Primary Tension / Conflict */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 8,
            padding: '12px 16px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 500, color: '#64748B', marginBottom: 4 }}>
            Dominant Trade-Off
          </div>
          <div
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              color: '#1E293B',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <span>{d.dominant_conflict[0]}</span>
            <span style={{ color: '#F59E0B' }}>↔</span>
            <span>{d.dominant_conflict[1]}</span>
          </div>
        </div>
      </div>

      {/* Live assessment strip — CDI-02/03/04 computed for the CURRENT configuration.
          Each slot renders only its own engine's result; a failed call renders as unavailable,
          never as a number carried over from a previous configuration. */}
      <div
        style={{
          background: '#F8FAFC',
          border: '1px solid #E2E8F0',
          borderRadius: 8,
          padding: '10px 16px',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          flexWrap: 'wrap'
        }}
      >
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Activity size={13} color={evaluationError ? '#D97706' : '#059669'} />
          Live assessment
        </span>

        {isEvaluating ? (
          <span style={{ fontSize: '0.8rem', color: '#64748B' }}>Evaluating current configuration…</span>
        ) : evaluationError ? (
          <span style={{ fontSize: '0.8rem', color: '#B45309', fontWeight: 600 }}>
            Unavailable — CogniX could not assess this configuration
          </span>
        ) : (
          <>
            <span style={{ fontSize: '0.8rem', color: '#334155' }}>
              Attributable uplift:{' '}
              <strong>
                {typeof liveEvaluation?.causal?.intervention_uplift_pp === 'number'
                  ? `${liveEvaluation.causal.intervention_uplift_pp >= 0 ? '+' : ''}${liveEvaluation.causal.intervention_uplift_pp.toFixed(1)} pp`
                  : 'unavailable'}
              </strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#334155' }}>
              Contribution impact:{' '}
              <strong>
                {typeof liveEvaluation?.counterfactual?.campaign_delta?.contribution_delta_gbp === 'number'
                  ? `${liveEvaluation.counterfactual.campaign_delta.contribution_delta_gbp >= 0 ? '+' : '-'}£${Math.abs(liveEvaluation.counterfactual.campaign_delta.contribution_delta_gbp).toFixed(0)}`
                  : 'unavailable'}
              </strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#334155' }}>
              Readiness:{' '}
              <strong>{liveReadiness?.readiness?.state ? executiveLabel('readiness_state', String(liveReadiness.readiness.state)) : 'unavailable'}</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#334155' }}>
              Opportunity windows:{' '}
              <strong>
                {Array.isArray(liveOpportunity?.opportunity_windows?.candidates)
                  ? liveOpportunity.opportunity_windows.candidates.length
                  : 'unavailable'}
              </strong>
            </span>
          </>
        )}
      </div>

      {/* Discovery Callout & Exploration CTA Footer */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: 14,
          borderTop: '1px solid #F1F5F9',
          flexWrap: 'wrap',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, maxWidth: 700 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#2563EB',
              flexShrink: 0
            }}
          />
          <span style={{ fontSize: '0.875rem', color: '#334155', fontWeight: 500 }}>
            <strong>Key Discovery:</strong> {d.key_finding}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onExploreDecision}
            style={{
              background: '#0F172A',
              color: '#FFFFFF',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 6,
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.15s ease'
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1E293B')}
            onMouseLeave={e => (e.currentTarget.style.background = '#0F172A')}
          >
            Explore Decision Analytics
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
