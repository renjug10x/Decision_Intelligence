'use client';

import React, { useState } from 'react';
import {
  TrendingUp,
  BarChart3,
  HelpCircle,
  Sparkles,
  Info,
  ArrowRight,
  ShieldAlert,
  Percent,
  Check
} from 'lucide-react';
import { CampaignArchetype, WaterfallItem, ElasticityPoint } from '@/lib/campaign-archetypes';

interface DemandIntelligenceLensProps {
  archetype: CampaignArchetype;
  currentDiscount: number;
  onApplyDiscount: (discount: number) => void;
  onApplyIntervention?: (intervention: any) => void;
}

export default function DemandIntelligenceLens({
  archetype,
  currentDiscount,
  onApplyDiscount,
  onApplyIntervention
}: DemandIntelligenceLensProps) {
  const [selectedWaterfallItem, setSelectedWaterfallItem] = useState<WaterfallItem | null>(null);
  const [hoveredElasticityPoint, setHoveredElasticityPoint] = useState<ElasticityPoint | null>(null);

  const waterfall = archetype.waterfall;
  const elasticity = archetype.elasticity_curve;

  // Find max contribution for waterfall bar scaling
  const maxPp = Math.max(...waterfall.map(w => Math.abs(w.contribution_pp)), 100);

  const formatGbp = (v: number) => {
    const abs = Math.abs(v);
    const str = abs >= 1000 ? `£${(abs / 1000).toFixed(1)}K` : `£${abs.toFixed(0)}`;
    return v >= 0 ? `+${str}` : `-${str}`;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Visual 1: Demand Contribution Waterfall ── */}
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
            marginBottom: 16,
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
              <BarChart3 size={18} color="#2563EB" />
              Demand Contribution Waterfall
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
              Decomposition of expected campaign demand into ambient market drivers vs direct intervention effects.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
              <span style={{ width: 10, height: 10, background: '#94A3B8', borderRadius: 2 }} />
              Ambient Driver
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
              <span style={{ width: 10, height: 10, background: '#10B981', borderRadius: 2 }} />
              Positive Lift
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
              <span style={{ width: 10, height: 10, background: '#EF4444', borderRadius: 2 }} />
              Cannibalisation Drag
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#64748B' }}>
              <span style={{ width: 10, height: 10, background: '#2563EB', borderRadius: 2 }} />
              Net Incremental
            </span>
          </div>
        </div>

        {/* Waterfall Bars Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {waterfall.map((item, idx) => {
            const isBase = item.id === 'wf_base';
            const isNet = item.id === 'wf_net' || item.id === 'wf_net_prod';
            const isNegative = item.contribution_pp < 0;
            const barPct = Math.min(100, Math.max(8, (Math.abs(item.contribution_pp) / maxPp) * 100));

            let barColor = '#10B981';
            if (isBase) barColor = '#94A3B8';
            else if (isNet) barColor = '#2563EB';
            else if (isNegative) barColor = '#EF4444';
            else if (item.driver_class === 'ambient') barColor = '#F59E0B';

            return (
              <div
                key={item.id}
                onClick={() => setSelectedWaterfallItem(item)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr 90px 100px',
                  alignItems: 'center',
                  gap: 16,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: selectedWaterfallItem?.id === item.id ? '#EFF6FF' : idx % 2 === 0 ? '#F8FAFC' : '#FFFFFF',
                  cursor: 'pointer',
                  border: selectedWaterfallItem?.id === item.id ? '1px solid #BFDBFE' : '1px solid transparent',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Driver Label & Class */}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {item.driver_class} driver
                  </div>
                </div>

                {/* Bar representation */}
                <div style={{ position: 'relative', height: 18, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${barPct}%`,
                      background: barColor,
                      borderRadius: 4,
                      transition: 'width 0.4s ease'
                    }}
                  />
                </div>

                {/* Point Value */}
                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: barColor,
                    textAlign: 'right',
                    fontFamily: 'monospace'
                  }}
                >
                  {item.value_display}
                </div>

                {/* Provenance Badge — neutral styling: no class in this seeded demo
                    model may render as a production-evidence trust marker. */}
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      color: '#64748B',
                      background: '#F1F5F9',
                      padding: '2px 6px',
                      borderRadius: 4,
                      border: '1px solid #E2E8F0'
                    }}
                    title="Seeded demonstration classification — not production evidence"
                  >
                    {item.provenance.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Drill-down Detail Drawer if item clicked */}
        {selectedWaterfallItem && (
          <div
            style={{
              marginTop: 14,
              padding: '12px 16px',
              background: '#F8FAFC',
              borderRadius: 6,
              border: '1px solid #E2E8F0',
              fontSize: '0.825rem',
              color: '#334155',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <strong>{selectedWaterfallItem.label}:</strong> {selectedWaterfallItem.rationale}
              <div style={{ fontSize: '0.75rem', color: '#64748B', marginTop: 2 }}>
                Classification: {selectedWaterfallItem.driver_class.toUpperCase()} driver · Provenance: {selectedWaterfallItem.provenance.replace(/_/g, ' ')} (seeded demo model)
              </div>
            </div>
            <button
              onClick={() => setSelectedWaterfallItem(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748B',
                cursor: 'pointer',
                fontSize: '0.75rem',
                textDecoration: 'underline'
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      {/* ── Visual 2: Elasticity Response Curve & Optimization ── */}
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
            marginBottom: 16,
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
              <TrendingUp size={18} color="#2563EB" />
              Elasticity Response Curve & Margin Sweet Spot
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
              X-Axis: Promotional Discount Depth (%) · Y-Axis: Expected Demand Uplift vs Net Financial Contribution.
            </p>
          </div>

          {elasticity.some(e => e.is_cognix_recommended) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#059669',
                  background: '#ECFDF5',
                  padding: '4px 8px',
                  borderRadius: 4,
                  border: '1px solid #A7F3D0',
                  fontWeight: 600
                }}
              >
                CogniX Sweet Spot: {elasticity.find(e => e.is_cognix_recommended)!.discount_pct}% Discount
              </span>
            </div>
          )}
        </div>

        {/* Elasticity Discrete Points Table / Visual Curve */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: 10,
            marginBottom: 16
          }}
        >
          {elasticity.map(pt => {
            const isCurrent = pt.discount_pct === currentDiscount;
            const isRecommended = pt.is_cognix_recommended;
            const isProfitable = pt.net_contribution_delta_gbp >= 0;

            return (
              <div
                key={pt.discount_pct}
                onClick={() => onApplyDiscount(pt.discount_pct)}
                onMouseEnter={() => setHoveredElasticityPoint(pt)}
                onMouseLeave={() => setHoveredElasticityPoint(null)}
                style={{
                  border: isRecommended
                    ? '2px solid #2563EB'
                    : isCurrent
                    ? '2px solid #F59E0B'
                    : '1px solid #E2E8F0',
                  background: isRecommended ? '#EFF6FF' : isCurrent ? '#FFFBEB' : '#FFFFFF',
                  borderRadius: 8,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Badges */}
                {isRecommended && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    COGNIX PICK
                  </span>
                )}
                {isCurrent && !isRecommended && (
                  <span
                    style={{
                      position: 'absolute',
                      top: -9,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#F59E0B',
                      color: '#FFFFFF',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 10,
                      whiteSpace: 'nowrap'
                    }}
                  >
                    CURRENT
                  </span>
                )}

                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                  {pt.discount_pct}%
                </div>
                <div style={{ fontSize: '0.7rem', color: '#64748B', marginBottom: 6 }}>Discount Depth</div>

                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#059669', marginBottom: 2 }}>
                  +{pt.expected_demand_uplift_pct.toFixed(1)}%
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Demand Lift</div>

                <div
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: isProfitable ? '#059669' : '#DC2626',
                    marginTop: 6,
                    paddingTop: 6,
                    borderTop: '1px dashed #E2E8F0'
                  }}
                >
                  {formatGbp(pt.net_contribution_delta_gbp)}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94A3B8' }}>Net Contribution</div>
              </div>
            );
          })}
        </div>

        {/* Hover / Selected Note */}
        <div
          style={{
            background: '#F8FAFC',
            border: '1px solid #E2E8F0',
            borderRadius: 6,
            padding: '10px 14px',
            fontSize: '0.8rem',
            color: '#475569',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Info size={15} color="#2563EB" />
            <span>
              {hoveredElasticityPoint
                ? `${hoveredElasticityPoint.discount_pct}% Discount Analysis: ${hoveredElasticityPoint.notes || 'Simulated response'}`
                : `Active Configuration: ${currentDiscount}% discount depth. Price elasticity factor ε = ${archetype.price_elasticity}.`}
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#64748B' }}>Click any tier to test discount</div>
        </div>
      </div>
    </div>
  );
}
