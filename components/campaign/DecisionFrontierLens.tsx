'use client';

import React, { useState } from 'react';
import {
  Compass,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  Sparkles,
  Layers,
  Scale,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CampaignArchetype, FrontierPlay } from '@/lib/campaign-archetypes';

interface DecisionFrontierLensProps {
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

export default function DecisionFrontierLens({
  archetype,
  onProposeIntervention
}: DecisionFrontierLensProps) {
  const plays = archetype.frontier_plays;
  const [selectedPlay, setSelectedPlay] = useState<FrontierPlay>(
    plays.find(p => p.is_recommended) || plays[0]
  );

  const formatGbp = (v: number) => {
    const abs = Math.abs(v);
    const str = abs >= 1000 ? `£${(abs / 1000).toFixed(1)}K` : `£${abs.toFixed(0)}`;
    return v >= 0 ? `+${str}` : `-${str}`;
  };

  const handleAdoptPlay = (play: FrontierPlay) => {
    onProposeIntervention({
      title: play.name,
      type: 'ADOPT_FRONTIER_PLAY',
      description: play.rationale,
      proposed_discount: play.discount_pct,
      proposed_scope: play.stores_count,
      proposed_duration: play.duration_days,
      proposed_region: 'Targeted Cohort',
      expected_demand: play.expected_demand_uplift_pct,
      expected_contribution: play.net_contribution_delta_gbp
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Section 1: Decision Tension Visual ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Scale size={18} color="#2563EB" />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
              Decision Tension & Commercial Trade-Off
            </h3>
          </div>

          <span
            style={{
              fontSize: '0.75rem',
              color: '#92400E',
              background: '#FFFBEB',
              border: '1px solid #FDE68A',
              padding: '3px 8px',
              borderRadius: 4,
              fontWeight: 600
            }}
          >
            DOMINANT CONFLICT
          </span>
        </div>

        <div
          style={{
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 100%)',
            border: '1px solid #DBEAFE',
            borderRadius: 8,
            padding: '16px 20px',
            marginBottom: 16
          }}
        >
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1E40AF', margin: '0 0 4px 0' }}>
            {archetype.discovery.primary_tension_title}
          </h4>
          <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0, lineHeight: 1.45 }}>
            {archetype.discovery.primary_tension_description}
          </p>
        </div>

        {/* 5-Dimension Comparison Matrix — derived from THIS archetype's seeded data,
            never hard-coded cross-archetype constants. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
            gap: 10
          }}
        >
          {(() => {
            const d = archetype.discovery;
            const currentPlay = plays.find(p => p.is_current) || plays[0];
            const formatShortGbp = (v: number) => {
              const abs = Math.abs(v);
              const str = abs >= 1000 ? `£${(abs / 1000).toFixed(1)}K` : `£${abs.toFixed(0)}`;
              return v >= 0 ? `+${str}` : `-${str}`;
            };
            const supplyColor =
              currentPlay.supply_exposure === 'LOW'
                ? '#10B981'
                : currentPlay.supply_exposure === 'MODERATE'
                ? '#3B82F6'
                : '#EF4444';
            return [
              {
                dim: 'Demand Growth',
                rating: `${d.expected_demand_uplift_pct >= 0 ? '+' : ''}${d.expected_demand_uplift_pct.toFixed(0)}%`,
                color: d.expected_demand_uplift_pct >= 20 ? '#10B981' : '#3B82F6',
                note: 'Expected uplift vs baseline (seeded)'
              },
              {
                dim: 'Margin Position',
                rating: formatShortGbp(d.net_contribution_delta_gbp),
                color: d.net_contribution_delta_gbp >= 0 ? '#10B981' : '#EF4444',
                note: d.net_contribution_delta_gbp >= 0 ? 'Contribution accretive' : 'Discount dilutes profit'
              },
              {
                dim: 'Supply Exposure',
                rating: currentPlay.supply_exposure,
                color: supplyColor,
                note: 'Current play supply posture'
              },
              {
                dim: 'Waste Impact',
                rating: `${currentPlay.waste_impact_pct >= 0 ? '+' : ''}${currentPlay.waste_impact_pct}%`,
                color: currentPlay.waste_impact_pct <= 0 ? '#10B981' : '#F59E0B',
                note: 'Current play waste effect'
              },
              {
                dim: 'Decision Confidence',
                rating: d.confidence,
                color: d.confidence === 'HIGH' ? '#10B981' : d.confidence === 'MODERATE' ? '#3B82F6' : '#F59E0B',
                note: 'Seeded scenario confidence class'
              }
            ];
          })().map(d => (
            <div
              key={d.dim}
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '10px 12px'
              }}
            >
              <div style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>
                {d.dim}
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: d.color, margin: '2px 0' }}>
                {d.rating}
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>{d.note}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 2: Decision Frontier (Pareto Plot Alternatives) ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 16 }}>
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
            <Compass size={18} color="#2563EB" />
            Decision Frontier — Candidate Configuration Comparison
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Multi-objective Pareto comparison of alternative campaign plays. Click any alternative to inspect commercial tradeoffs.
          </p>
        </div>

        {/* Frontier Plays Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
            marginBottom: 18
          }}
        >
          {plays.map(play => {
            const isSelected = selectedPlay?.id === play.id;
            const isRec = play.is_recommended;
            const isCurrent = play.is_current;
            const isAccretive = play.net_contribution_delta_gbp >= 0;

            return (
              <div
                key={play.id}
                onClick={() => setSelectedPlay(play)}
                style={{
                  border: isSelected
                    ? '2px solid #2563EB'
                    : isRec
                    ? '1.5px solid #93C5FD'
                    : '1px solid #E2E8F0',
                  background: isSelected ? '#EFF6FF' : isRec ? '#F8FAFC' : '#FFFFFF',
                  borderRadius: 8,
                  padding: '14px 16px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Badge */}
                {play.badge && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 10,
                      right: 12,
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: isRec ? '#2563EB' : isCurrent ? '#D97706' : '#64748B',
                      background: isRec ? '#DBEAFE' : isCurrent ? '#FEF3C7' : '#F1F5F9',
                      padding: '2px 6px',
                      borderRadius: 4
                    }}
                  >
                    {play.badge}
                  </span>
                )}

                <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', marginBottom: 6 }}>
                  {play.name}
                </div>

                <div style={{ fontSize: '0.75rem', color: '#64748B', marginBottom: 10 }}>
                  {play.discount_pct}% Cut · {play.stores_count} Stores · {play.duration_days} Days
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #E2E8F0' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Demand Uplift</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#059669' }}>
                      +{play.expected_demand_uplift_pct.toFixed(1)}%
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Net Contribution</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: isAccretive ? '#059669' : '#DC2626' }}>
                      {formatGbp(play.net_contribution_delta_gbp)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Frontier Play Inspector & Action Box */}
        {selectedPlay && (
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}
          >
            <div style={{ maxWidth: 650 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                Strategy Alternative Inspection: {selectedPlay.name}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#1E293B', marginTop: 4, lineHeight: 1.4 }}>
                {selectedPlay.rationale}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 4, display: 'flex', gap: 12 }}>
                <span>Supply Exposure: <strong>{selectedPlay.supply_exposure}</strong></span>
                <span>·</span>
                <span>Waste Impact: <strong>{selectedPlay.waste_impact_pct}%</strong></span>
              </div>
            </div>

            <button
              onClick={() => handleAdoptPlay(selectedPlay)}
              style={{
                background: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                padding: '9px 18px',
                borderRadius: 6,
                fontSize: '0.825rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>Adopt as Proposed Intervention</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
