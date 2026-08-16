'use client';

import React, { useState } from 'react';
import {
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  TrendingUp,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CampaignArchetype, OpportunityCell, estimateInterventionEconomics } from '@/lib/campaign-archetypes';

interface OpportunitySurfaceLensProps {
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

export default function OpportunitySurfaceLens({
  archetype,
  onProposeIntervention
}: OpportunitySurfaceLensProps) {
  const matrix = archetype.opportunity_matrix;
  const [selectedCell, setSelectedCell] = useState<OpportunityCell>(matrix[0] || null);

  const getTierColor = (score: number) => {
    if (score >= 80) return { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46', badge: '#10B981' };
    if (score >= 65) return { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF', badge: '#3B82F6' };
    if (score >= 50) return { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E', badge: '#F59E0B' };
    return { bg: '#FEF2F2', border: '#FECACA', text: '#991B1B', badge: '#EF4444' };
  };

  const handleTriggerAction = (cell: OpportunityCell) => {
    const act = cell.recommended_action;
    // Economics derived from the archetype's seeded elasticity curve at the action's
    // own discount/scope/duration — never flat constants shared across archetypes.
    const economics = estimateInterventionEconomics(archetype, {
      discount_pct: act.target_discount,
      stores: act.target_stores,
      duration_days: act.target_duration
    });
    onProposeIntervention({
      title: `${act.label} (${cell.region})`,
      type: act.type,
      description: act.description,
      proposed_discount: act.target_discount,
      proposed_scope: act.target_stores,
      proposed_duration: act.target_duration,
      proposed_region: cell.region,
      expected_demand: economics.expected_demand_uplift_pct,
      expected_contribution: economics.net_contribution_delta_gbp
    });
  };

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: 10,
        padding: '20px 24px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 8
        }}
      >
        <div>
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
            <MapPin size={18} color="#2563EB" />
            Campaign Opportunity Surface
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Interactive 2D Opportunity Index (0–100) mapping micro-market demand propensity, warehouse headroom, and competitor density.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
            <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: 2 }} />
            Preferred (80–100)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
            <span style={{ width: 10, height: 10, background: '#3B82F6', borderRadius: 2 }} />
            Acceptable (65–79)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
            <span style={{ width: 10, height: 10, background: '#F59E0B', borderRadius: 2 }} />
            Suboptimal (50–64)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
            <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2 }} />
            Avoid (&lt;50)
          </span>
        </div>
      </div>

      {/* 2-Column Surface Layout: Heatmap Grid on Left + Explanatory Inspector on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(320px, 1.4fr) minmax(280px, 1fr)',
          gap: 20
        }}
      >
        {/* Heatmap Cell Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {matrix.map(cell => {
            const isSelected =
              selectedCell?.region === cell.region && selectedCell?.window_label === cell.window_label;
            const colors = getTierColor(cell.opportunity_index);

            return (
              <div
                key={`${cell.region}_${cell.window_label}`}
                onClick={() => setSelectedCell(cell)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderRadius: 8,
                  border: isSelected ? '2px solid #2563EB' : `1px solid ${colors.border}`,
                  background: isSelected ? '#EFF6FF' : colors.bg,
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 8,
                      background: colors.badge,
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '1.15rem'
                    }}
                  >
                    {cell.opportunity_index}
                  </div>

                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                      {cell.region}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{cell.store_count} Superstores</span>
                      <span>·</span>
                      <span>{cell.window_label}</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: colors.text,
                      background: '#FFFFFF',
                      border: `1px solid ${colors.border}`,
                      padding: '3px 8px',
                      borderRadius: 4,
                      textTransform: 'uppercase'
                    }}
                  >
                    {cell.tier}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Opportunity Inspector & Contextual Action Drawer */}
        {selectedCell && (
          <div
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 8,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    Opportunity Breakdown
                  </div>
                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', margin: '2px 0 0 0' }}>
                    {selectedCell.region} · Index {selectedCell.opportunity_index}
                  </h4>
                </div>

                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: getTierColor(selectedCell.opportunity_index).text,
                    background: getTierColor(selectedCell.opportunity_index).bg,
                    padding: '3px 8px',
                    borderRadius: 4,
                    border: `1px solid ${getTierColor(selectedCell.opportunity_index).border}`
                  }}
                >
                  {selectedCell.tier}
                </span>
              </div>

              {/* Factors Decomposition */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#475569', marginBottom: 6 }}>
                  Why is this opportunity scoring {selectedCell.opportunity_index}?
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedCell.factors.map(factor => (
                    <div
                      key={factor.factor_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        padding: '6px 10px',
                        borderRadius: 4,
                        fontSize: '0.78rem'
                      }}
                    >
                      <span style={{ color: '#334155' }}>{factor.label}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: factor.points >= 0 ? '#059669' : '#DC2626',
                          fontFamily: 'monospace'
                        }}
                      >
                        {factor.points >= 0 ? `+${factor.points}` : factor.points}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Description */}
              <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4, marginBottom: 14 }}>
                <strong>CogniX Proposal:</strong> {selectedCell.recommended_action.description}
              </div>
            </div>

            {/* Contextual Action Button */}
            <div>
              <button
                onClick={() => handleTriggerAction(selectedCell)}
                style={{
                  width: '100%',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '9px 14px',
                  borderRadius: 6,
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  transition: 'background 0.15s ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#1D4ED8')}
                onMouseLeave={e => (e.currentTarget.style.background = '#2563EB')}
              >
                <span>{selectedCell.recommended_action.label}</span>
                <ArrowRight size={14} />
              </button>
              <div style={{ textAlign: 'center', fontSize: '0.68rem', color: '#94A3B8', marginTop: 4 }}>
                Creates a candidate intervention without modifying active campaign
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
