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
  DecisionChangeTrigger,
  SignalHypothesis,
  estimateInterventionEconomics,
  REGION_STORE_COUNTS
} from '@/lib/campaign-archetypes';

interface InverseAnalysisLensProps {
  archetype: CampaignArchetype;
  onProposeIntervention: (action: {
    title: string;
    type: string;
    description: string;
    proposed_discount: number;
    proposed_scope: number;
    proposed_duration: number;
    proposed_region: string;
    expected_demand: number;
    expected_contribution: number;
  }) => void;
}

export default function InverseAnalysisLens({
  archetype,
  onProposeIntervention
}: InverseAnalysisLensProps) {
  const [testedHypothesis, setTestedHypothesis] = useState<Record<string, boolean>>({});

  const handleModelCondition = (cond: InverseCondition) => {
    const defaultScope = REGION_STORE_COUNTS[archetype.default_region] ?? 50;
    let disc = archetype.default_discount_pct;
    let scope = defaultScope;
    const dur = archetype.default_duration_days;

    if (cond.target_parameter === 'DISCOUNT_DEPTH') {
      disc = cond.target_value;
    } else if (cond.target_parameter === 'STORE_SCOPE') {
      scope = cond.target_value;
    }

    // Economics derived from the archetype's own seeded elasticity curve at the
    // modelled discount/scope/duration; SUPPLIER_FUNDING conditions improve the
    // contribution outlook by the funded amount declared in the condition itself.
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
      description: cond.explanation,
      proposed_discount: disc,
      proposed_scope: scope,
      proposed_duration: dur,
      proposed_region: scope < defaultScope ? `${archetype.default_region} Core` : archetype.default_region,
      expected_demand: economics.expected_demand_uplift_pct,
      expected_contribution: fundedContribution
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
      expected_contribution: economics.net_contribution_delta_gbp
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
            Inverse decision analysis identifying the exact conditions under which this campaign becomes unconditionally accretive.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {archetype.inverse_conditions.map((cond, idx) => (
            <div
              key={cond.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 16px',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ maxWidth: 680 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: '#2563EB',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}
                  >
                    CONDITION {idx + 1}
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                    {cond.condition_text}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.4 }}>
                  {cond.explanation}
                </div>
              </div>

              <button
                onClick={() => handleModelCondition(cond)}
                style={{
                  background: '#FFFFFF',
                  color: '#2563EB',
                  border: '1px solid #BFDBFE',
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
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#EFF6FF';
                  e.currentTarget.style.borderColor = '#2563EB';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#FFFFFF';
                  e.currentTarget.style.borderColor = '#BFDBFE';
                }}
              >
                <span>{cond.modelling_action_label}</span>
              </button>
            </div>
          ))}
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
