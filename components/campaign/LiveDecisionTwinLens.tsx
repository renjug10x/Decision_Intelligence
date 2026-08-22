'use client';

import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Zap,
  Info,
  Clock,
  Layers,
  Check
} from 'lucide-react';
import { CampaignArchetype } from '@/lib/campaign-archetypes';
import { CampaignFlightProjection } from '@/packages/contracts/src/campaign-continuous-timeline-model';
import ContinuousFlightTimeline from '@/components/campaign/ContinuousFlightTimeline';

interface LiveDecisionTwinLensProps {
  archetype: CampaignArchetype;
  /** CTW-01 — the continuous timeline, assessed against the activated decision contract. */
  flight?: CampaignFlightProjection | null;
  flightError?: string | null;
  onReturnToPlanning?: () => void;
  onApplyInFlightAction?: (action: any) => void;
}

export default function LiveDecisionTwinLens({
  archetype,
  flight = null,
  flightError = null,
  onReturnToPlanning,
  onApplyInFlightAction
}: LiveDecisionTwinLensProps) {
  const twin = archetype.decision_twin;
  const [selectedDeviation, setSelectedDeviation] = useState<any>(twin.deviations[0] || null);
  const [appliedActionId, setAppliedActionId] = useState<string | null>(null);

  const getValidityStyle = (status: string) => {
    switch (status) {
      case 'STILL VALID':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', icon: CheckCircle2 };
      case 'RECONSIDER':
        return { bg: '#FFFBEB', text: '#92400E', border: '#FDE68A', icon: AlertTriangle };
      case 'CONDITION BREACHED':
        return { bg: '#FEF2F2', text: '#991B1B', border: '#FECACA', icon: XCircle };
      default:
        return { bg: '#F8FAFC', text: '#334155', border: '#E2E8F0', icon: Info };
    }
  };

  const vStyle = getValidityStyle(twin.is_decision_still_valid);
  const ValidityIcon = vStyle.icon;

  const handleApplyAction = (dev: any) => {
    setAppliedActionId(dev.id);
    if (onApplyInFlightAction) {
      onApplyInFlightAction(dev.recommended_in_flight_action);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Top Hero: Decision Validity Status ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 12,
          padding: '24px 28px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
        }}
      >
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#0F172A', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                Live Decision Twin · Day{' '}
                {flight ? flight.horizon.today_flight_day : twin.current_day} of{' '}
                {flight ? flight.horizon.flight_days : twin.flight_days}
                <span
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    color: '#6B21A8',
                    background: '#F3E8FF',
                    border: '1px solid #E9D5FF',
                    padding: '2px 8px',
                    borderRadius: 4,
                    letterSpacing: '0.03em'
                  }}
                  title="Every in-flight value in this view is seeded simulation from the demo world model — no production store or depot telemetry is connected"
                >
                  SIMULATED TELEMETRY (DEMO)
                </span>
              </h3>
              <div style={{ fontSize: '0.8rem', color: '#64748B' }}>
                Simulated campaign-in-flight telemetry and deviation reassessment — demonstration world model, not production feeds
              </div>
            </div>
          </div>

          {/* Decision Validity Badge */}
          <div
            style={{
              background: vStyle.bg,
              border: `1px solid ${vStyle.border}`,
              padding: '6px 14px',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <ValidityIcon size={18} color={vStyle.text} />
            <div>
              <div style={{ fontSize: '0.7rem', color: vStyle.text, fontWeight: 600 }}>ORIGINAL DECISION VALIDITY</div>
              <div style={{ fontSize: '0.95rem', color: vStyle.text, fontWeight: 800 }}>
                {twin.is_decision_still_valid}
              </div>
            </div>
          </div>
        </div>

        <p style={{ fontSize: '0.9rem', color: '#334155', margin: '0 0 20px 0', lineHeight: 1.5 }}>
          {twin.executive_summary}
        </p>

        {/* Telemetry Stream Daily Progression Cards */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.55 }}>
            {flight
              ? 'The day-by-day demonstration telemetry that used to sit here is now read on the timeline below — select any elapsed day to see its demand, contribution, depot stock and world-model status together, against the decision that was activated.'
              : 'Day-by-day demonstration telemetry is shown on the campaign timeline once a decision is activated.'}
          </div>
        </div>
      </div>

      {/* ── CTW-01: the continuous campaign timeline ── */}
      {flight ? (
        <ContinuousFlightTimeline flight={flight} />
      ) : (
        <div
          style={{
            background: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 12,
            padding: '18px 20px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start'
          }}
        >
          <AlertTriangle size={18} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400E' }}>
              No governed campaign timeline for this configuration
            </div>
            <p style={{ fontSize: '0.8rem', color: '#92400E', margin: '4px 0 0 0', lineHeight: 1.5 }}>
              {flightError ||
                'This campaign has no activated decision, so there is no baseline to assess it against.'}{' '}
              The demonstration telemetry below is shown as-is and is not a comparison against any
              decision.
            </p>
            {onReturnToPlanning && (
              <button
                type="button"
                onClick={onReturnToPlanning}
                style={{
                  marginTop: 10,
                  padding: '7px 14px',
                  borderRadius: 7,
                  border: '1px solid #FDE68A',
                  background: '#FFFFFF',
                  color: '#92400E',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Return to review and activate
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Section 2: In-Flight Deviations & Adaptive Interventions ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.2fr) minmax(320px, 1.4fr)',
          gap: 20
        }}
      >
        {/* Deviation Detection List */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid #E2E8F0',
            borderRadius: 10,
            padding: '20px 22px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: '0 0 4px 0',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={18} color="#D97706" />
            Detected In-Flight Deviations ({twin.deviations.length})
          </h3>
          <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 14px 0' }}>
            Simulated variance between the expected causal trajectory and seeded in-flight observations (demo world model).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {twin.deviations.map(dev => {
              const isSelected = selectedDeviation?.id === dev.id;

              return (
                <div
                  key={dev.id}
                  onClick={() => setSelectedDeviation(dev)}
                  style={{
                    background: isSelected ? '#EFF6FF' : '#F8FAFC',
                    border: isSelected ? '2px solid #2563EB' : '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '12px 14px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                      {dev.title}
                    </span>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        color: dev.severity === 'CRITICAL' ? '#DC2626' : '#D97706',
                        background: dev.severity === 'CRITICAL' ? '#FEF2F2' : '#FFFBEB',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                    >
                      {dev.severity}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', gap: 12, marginBottom: 4 }}>
                    <span>Metric: <strong>{dev.metric}</strong></span>
                    <span>Actual: <strong style={{ color: '#DC2626' }}>{dev.actual_value}</strong></span>
                    <span>Expected: {dev.expected_value}</span>
                  </div>

                  <div style={{ fontSize: '0.78rem', color: '#334155' }}>
                    {dev.impact_summary}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Adaptive In-Flight Interventions */}
        {selectedDeviation && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '20px 22px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  margin: '0 0 4px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <Zap size={18} color="#2563EB" />
                Adaptive In-Flight Course Correction
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748B', margin: '0 0 14px 0' }}>
                CogniX recommendation to protect margin or recover volume mid-campaign.
              </p>

              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 16px',
                  marginBottom: 14
                }}
              >
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                  {selectedDeviation.recommended_in_flight_action.title}
                </div>

                <p style={{ fontSize: '0.825rem', color: '#475569', margin: '0 0 10px 0', lineHeight: 1.45 }}>
                  {selectedDeviation.recommended_in_flight_action.description}
                </p>

                <div
                  style={{
                    background: '#EFF6FF',
                    border: '1px solid #BFDBFE',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '0.8rem',
                    color: '#1E40AF',
                    fontWeight: 600
                  }}
                >
                  Recovery Projection: {selectedDeviation.recommended_in_flight_action.current_vs_proposed.expected_recovery}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
              <button
                onClick={() => handleApplyAction(selectedDeviation)}
                disabled={appliedActionId === selectedDeviation.id}
                style={{
                  background: appliedActionId === selectedDeviation.id ? '#059669' : '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '8px 18px',
                  borderRadius: 6,
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: appliedActionId === selectedDeviation.id ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                {appliedActionId === selectedDeviation.id ? (
                  <>
                    <Check size={14} />
                    Course Correction Accepted (Simulated)
                  </>
                ) : (
                  <>
                    <span>Accept Course Correction (Simulated)</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Section 3: Post-Campaign Learning Loop ── */}
      <div
        style={{
          background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
          border: '1px solid #DBEAFE',
          borderRadius: 10,
          padding: '18px 24px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', marginBottom: 6 }}>
          <RotateCcw size={14} />
          Post-Campaign Learning Loop — Simulated Outcome ({twin.post_campaign_learning.learning_case_status.replace(/_/g, ' ')})
        </div>
        <p style={{ fontSize: '0.75rem', color: '#64748B', margin: '0 0 10px 0' }}>
          Projected demonstration outcome from the seeded twin simulation. Not a realised production result and not admissible as a learning case.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, fontSize: '0.825rem', color: '#334155' }}>
          <div>
            <strong>Original Hypothesis:</strong> {twin.post_campaign_learning.what_we_believed}
          </div>
          <div>
            <strong>In-Flight Adaptation:</strong> {twin.post_campaign_learning.interventions_applied}
          </div>
          <div>
            <strong>CogniX Learning:</strong> {twin.post_campaign_learning.what_cognix_learned}
          </div>
        </div>
      </div>
    </div>
  );
}
