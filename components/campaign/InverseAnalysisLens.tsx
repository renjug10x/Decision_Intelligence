'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Play
} from 'lucide-react';
import {
  CampaignArchetype,
  InverseCondition,
  SignalHypothesis,
  estimateInterventionEconomics
} from '@/lib/campaign-archetypes';
import {
  elasticitySensitivityProposal,
  highestYieldOpportunityRegion,
  describeInverseConditionDecision,
  ActiveIntervention
} from '@/lib/campaign-candidate-intervention';
import { inScopeStoreCount } from '@/packages/contracts/src/scenario-scope';
import { useCurrency } from '@/context/CurrencyContext';

interface InverseAnalysisLensProps {
  archetype: CampaignArchetype;
  currentDiscount?: number;
  currentRegion?: string;
  currentDurationDays?: number;
  onProposeIntervention: (action: ActiveIntervention) => void;
  onOpenDemandLens?: () => void;
}

export default function InverseAnalysisLens({
  archetype,
  currentDiscount,
  currentRegion,
  currentDurationDays,
  onProposeIntervention,
  onOpenDemandLens
}: InverseAnalysisLensProps) {
  const { money, localise } = useCurrency();
  const [testedHypothesis, setTestedHypothesis] = useState<Record<string, boolean>>({});
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);

  const handleModelCondition = (cond: InverseCondition) => {
    setSelectedConditionId(cond.id);
    const defaultScope = inScopeStoreCount(currentRegion ?? archetype.default_region);
    let disc = currentDiscount ?? archetype.default_discount_pct;
    let scope = defaultScope;
    const dur = currentDurationDays ?? archetype.default_duration_days;
    const notes: string[] = [];
    let fundingOverlay: number | undefined;
    let flipPct: number | undefined;
    let recommendedPct: number | undefined;
    let region = currentRegion ?? archetype.default_region;

    const decisionSummary = describeInverseConditionDecision({
      archetype,
      condition: cond,
      currentDiscountPct: currentDiscount,
      currentRegion,
      currentDurationDays
    });

    if (cond.target_parameter === 'DISCOUNT_DEPTH') {
      disc = cond.target_value;
      notes.push(
        `Tested condition: ${decisionSummary.tested_condition} vs current ${decisionSummary.current_assumption}.`,
        `Applies ${cond.target_value}% discount depth to the planner on Accept.`
      );
    } else if (cond.target_parameter === 'STORE_SCOPE') {
      scope = cond.target_value;
      region = highestYieldOpportunityRegion(archetype);
      notes.push(
        `Tested condition: ${decisionSummary.tested_condition} vs current ${decisionSummary.current_assumption}.`,
        `Scopes the campaign to ${scope} stores in ${region} (highest seeded regional opportunity index).`
      );
    } else if (cond.target_parameter === 'DEMAND_UPLIFT') {
      const sensitivity = elasticitySensitivityProposal(
        archetype,
        currentDiscount ?? archetype.default_discount_pct
      );
      disc = sensitivity.discount_pct;
      flipPct = sensitivity.flip_discount_pct;
      recommendedPct = sensitivity.recommended_discount_pct;
      notes.push(...sensitivity.notes);
    } else if (cond.target_parameter === 'SUPPLIER_FUNDING') {
      fundingOverlay = cond.target_value;
      notes.push(
        cond.target_value === 0
          ? 'Evaluation overlay: trade funding is not required for this configuration.'
          : `Evaluation overlay (${cond.target_display}): bridges the contribution gap between ${disc}% depth and the ${decisionSummary.decision_boundary}. Accept keeps ${disc}% depth in planner controls because supplier funding is an evaluation condition, not a planner slider.`
      );
    }

    const economics = estimateInterventionEconomics(archetype, {
      discount_pct: disc,
      stores: scope,
      duration_days: dur
    });
    const fundedContribution =
      cond.target_parameter === 'SUPPLIER_FUNDING'
        ? economics.net_contribution_delta_gbp + cond.target_value
        : economics.net_contribution_delta_gbp;

    onProposeIntervention({
      title: `Model Condition: ${cond.condition_text}`,
      type: 'INVERSE_CONDITION_MODEL',
      description: `${decisionSummary.decision_question} — ${decisionSummary.recommendation_implication}`,
      proposed_discount: disc,
      proposed_scope: scope,
      proposed_duration: dur,
      proposed_region: region,
      expected_demand: economics.expected_demand_uplift_pct,
      expected_contribution: fundedContribution,
      provenance: {
        source_lens: 'INVERSE',
        source_id: cond.id,
        source_label: cond.condition_text,
        funding_overlay_gbp: fundingOverlay,
        elasticity_flip_discount_pct: flipPct,
        recommended_discount_pct: recommendedPct,
        notes
      }
    });
  };

  const handleTestHypothesis = (hypo: SignalHypothesis) => {
    setTestedHypothesis(prev => ({ ...prev, [hypo.signal_id]: true }));
    const p = hypo.test_result.proposed_intervention;
    const economics = estimateInterventionEconomics(archetype, {
      discount_pct: p.discount,
      stores: p.scope,
      duration_days: p.duration
    });
    onProposeIntervention({
      title: `Test Hypothesis: ${hypo.hypothesis_statement}`,
      type: 'TEST_HYPOTHESIS',
      description: hypo.test_result.explanation,
      proposed_discount: p.discount,
      proposed_scope: p.scope,
      proposed_duration: p.duration,
      proposed_region: p.region,
      expected_demand: economics.expected_demand_uplift_pct,
      expected_contribution: economics.net_contribution_delta_gbp,
      provenance: {
        source_lens: 'SIGNAL_HYPOTHESIS',
        source_id: hypo.signal_id,
        source_label: hypo.signal_headline,
        notes: [
          `Seeded world-model hypothesis verdict: ${hypo.test_result.verdict.replace(/_/g, ' ')} — evaluated against scenario elasticity when accepted.`
        ]
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Section 1: "What would have to be true?" ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <HelpCircle size={18} color="#2563EB" />
            What Would Have To Be True?
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Decision-condition analysis across discount depth, regional store scope, supplier funding overlay, and elasticity sensitivity. Testing a condition stages a candidate intervention for review before any planner control changes.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {archetype.inverse_conditions.map((cond, idx) => {
            const summary = describeInverseConditionDecision({
              archetype,
              condition: cond,
              currentDiscountPct: currentDiscount,
              currentRegion,
              currentDurationDays
            });
            const isSelected = selectedConditionId === cond.id;

            return (
              <div
                key={cond.id}
                style={{
                  background: isSelected ? '#EFF6FF' : '#F8FAFC',
                  border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#2563EB',
                          background: '#DBEAFE',
                          border: '1px solid #BFDBFE',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        CONDITION {idx + 1} · {cond.target_parameter.replace(/_/g, ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: summary.recommendation_changes ? '#065F46' : '#92400E',
                          background: summary.recommendation_changes ? '#ECFDF5' : '#FFFBEB',
                          border: `1px solid ${summary.recommendation_changes ? '#A7F3D0' : '#FDE68A'}`,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        {summary.recommendation_changes
                          ? 'RECOMMENDATION CHANGES ON ACCEPT'
                          : 'EVALUATION OVERLAY · PLANNER DEPTH UNCHANGED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                      {cond.condition_text}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>
                      Decision question: {localise(summary.decision_question)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                      {localise(cond.explanation)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <button
                      onClick={() => handleModelCondition(cond)}
                      style={{
                        background: isSelected ? '#2563EB' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#2563EB',
                        border: '1px solid #2563EB',
                        padding: '7px 14px',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{cond.modelling_action_label}</span>
                    </button>
                    {cond.target_parameter === 'DEMAND_UPLIFT' && onOpenDemandLens && (
                      <button
                        type="button"
                        onClick={() => onOpenDemandLens()}
                        style={{
                          background: 'transparent',
                          color: '#475569',
                          border: 'none',
                          padding: '2px 4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Inspect Demand &amp; Elasticity Curve →
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured Decision Condition Breakdown */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 8,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: '0.74rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Current Assumption
                    </div>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                      {localise(summary.current_assumption)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Tested Condition
                    </div>
                    <div style={{ fontWeight: 700, color: '#2563EB', marginTop: 2 }}>
                      {localise(summary.tested_condition)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Economic / Decision Effect
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: summary.economic_effect_gbp >= 0 ? '#059669' : '#DC2626',
                        marginTop: 2,
                        fontFamily: 'monospace'
                      }}
                    >
                      {summary.economic_effect_gbp >= 0 ? '+' : ''}
                      {money(summary.economic_effect_gbp)} net (
                      {summary.economic_delta_vs_current_gbp >= 0 ? '+' : ''}
                      {money(summary.economic_delta_vs_current_gbp)} vs current)
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 1 }}>
                      {localise(summary.decision_boundary)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Recommendation Implication
                    </div>
                    <div style={{ color: '#334155', marginTop: 2, lineHeight: 1.35 }}>
                      {localise(summary.recommendation_implication)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: "What could change this decision?" & Boundary Triggers ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={18} color="#D97706" />
            What Could Change This Decision?
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Declared boundary conditions that would alter the recommendation; in this demo they are monitored by the simulated Decision Twin.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {archetype.change_triggers.map(trig => (
            <div
              key={trig.trigger_id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(240px, 1.5fr) minmax(180px, 1fr) 180px',
                alignItems: 'center',
                gap: 16,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '10px 14px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0F172A' }}>
                  {trig.boundary_condition}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                  Monitored Signal: {trig.monitored_signal}
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: trig.severity === 'VETO' ? '#DC2626' : trig.severity === 'WARNING' ? '#D97706' : '#059669',
                    background: trig.severity === 'VETO' ? '#FEF2F2' : trig.severity === 'WARNING' ? '#FFFBEB' : '#ECFDF5',
                    border: `1px solid ${trig.severity === 'VETO' ? '#FECACA' : trig.severity === 'WARNING' ? '#FDE68A' : '#A7F3D0'}`,
                    padding: '3px 8px',
                    borderRadius: 4
                  }}
                >
                  {trig.decision_shift}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {trig.severity} TRIGGER
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Signal → Hypothesis → Action Feed ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Activity size={18} color="#2563EB" />
            Signal → Hypothesis → Action Feed
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Seeded demonstration signals generate hypotheses and actionable scenarios — all signal values are demo world model data, not production feeds.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {archetype.signal_hypotheses.map(hypo => {
            const hasTested = testedHypothesis[hypo.signal_id];

            return (
              <div
                key={hypo.signal_id}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    SIGNAL · {hypo.signal_source}
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#2563EB',
                      background: '#EFF6FF',
                      padding: '2px 8px',
                      borderRadius: 4
                    }}
                  >
                    Seeded signal: {hypo.observed_metric}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                  {hypo.signal_headline}
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    color: '#334155',
                    marginBottom: 10
                  }}
                >
                  <strong style={{ color: '#2563EB' }}>Hypothesis:</strong> {hypo.hypothesis_statement}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {hasTested ? (
                      <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} />
                        Seeded assessment: {hypo.test_result.verdict.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      'Model this hypothesis as a proposed scenario'
                    )}
                  </div>

                  <button
                    onClick={() => handleTestHypothesis(hypo)}
                    style={{
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>{hypo.test_action_label}</span>
                    <Play size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
