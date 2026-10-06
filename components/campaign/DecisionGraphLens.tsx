'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  GitCommit,
  Activity,
  TrendingUp,
  FlaskConical,
  MapPin,
  BarChart3,
  Scale,
  Zap,
  ChevronDown
} from 'lucide-react';
import { CampaignArchetype, estimateInterventionEconomics } from '@/lib/campaign-archetypes';
import {
  inspectDecisionGraphNode,
  buildCompetitiveAssumptionGraphNode,
  COMPETITIVE_ASSUMPTION_NODE_ID,
  GraphSemanticVisual,
  ActiveIntervention
} from '@/lib/campaign-candidate-intervention';
import type {
  CompetitiveResponseOptionType,
  CompetitiveWhatIfIntelligenceResult
} from '@/lib/competitive-price-response';
import { useCurrency } from '@/context/CurrencyContext';

interface DecisionGraphLensProps {
  archetype: CampaignArchetype;
  liveContributionGbp?: number | null;
  liveDemandUpliftPct?: number | null;
  currentDiscountPct?: number;
  currentRegion?: string;
  currentDurationDays?: number;
  onProposeIntervention?: (action: ActiveIntervention) => void;
  competitiveWhatIf?: CompetitiveWhatIfIntelligenceResult | null;
  selectedCompetitiveOptionType?: CompetitiveResponseOptionType | null;
}

export default function DecisionGraphLens({
  archetype,
  liveContributionGbp = null,
  liveDemandUpliftPct = null,
  currentDiscountPct,
  currentRegion,
  currentDurationDays,
  onProposeIntervention,
  competitiveWhatIf = null,
  selectedCompetitiveOptionType = null
}: DecisionGraphLensProps) {
  const { money, localise } = useCurrency();
  const graph = archetype.decision_graph;
  const displayNodes = React.useMemo(() => {
    if (!competitiveWhatIf) return graph.nodes;
    const compNode = buildCompetitiveAssumptionGraphNode(
      competitiveWhatIf,
      selectedCompetitiveOptionType
    );
    return [...graph.nodes, compNode];
  }, [graph.nodes, competitiveWhatIf, selectedCompetitiveOptionType]);

  const displayLinks = React.useMemo(() => {
    if (!competitiveWhatIf) return graph.links;
    const evidenceNode = graph.nodes.find(n => n.category === 'EVIDENCE') ?? graph.nodes[0];
    const economicsNode = graph.nodes.find(n => n.category === 'ECONOMICS');
    const decisionNode = graph.nodes.find(n => n.category === 'DECISION');
    return [
      ...graph.links,
      ...(evidenceNode ? [{ from: evidenceNode.id, to: COMPETITIVE_ASSUMPTION_NODE_ID }] : []),
      ...(economicsNode ? [{ from: COMPETITIVE_ASSUMPTION_NODE_ID, to: economicsNode.id }] : []),
      ...(decisionNode ? [{ from: COMPETITIVE_ASSUMPTION_NODE_ID, to: decisionNode.id }] : [])
    ];
  }, [graph.links, graph.nodes, competitiveWhatIf]);

  const [selectedNodeId, setSelectedNodeId] = useState<string>(graph.nodes[0]?.id || '');

  const selectedNode =
    displayNodes.find(n => n.id === selectedNodeId) || displayNodes[0] || null;

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'SIGNAL':
        return { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A', accent: '#D97706' };
      case 'EVIDENCE':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE', accent: '#2563EB' };
      case 'HYPOTHESIS':
        return { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF', accent: '#7C3AED' };
      case 'DEMAND':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', accent: '#059669' };
      case 'ECONOMICS':
        return { bg: '#FFF1F2', text: '#9F1239', border: '#FECDD3', accent: '#E11D48' };
      case 'DECISION':
        return { bg: '#0F172A', text: '#FFFFFF', border: '#0F172A', accent: '#0F172A' };
      case 'INTERVENTION':
        return { bg: '#2563EB', text: '#FFFFFF', border: '#2563EB', accent: '#2563EB' };
      default:
        return { bg: '#F1F5F9', text: '#334155', border: '#E2E8F0', accent: '#475569' };
    }
  };

  const getProvenanceBadgeStyle = (tier: 'SEEDED_WORLD_MODEL' | 'DERIVED_SCENARIO_CURVE' | 'LIVE_CDI_ASSESSMENT') => {
    switch (tier) {
      case 'LIVE_CDI_ASSESSMENT':
        return { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0' };
      case 'DERIVED_SCENARIO_CURVE':
        return { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' };
      default:
        return { bg: '#F1F5F9', text: '#475569', border: '#CBD5E1' };
    }
  };

  const renderSemanticVisual = (visual: GraphSemanticVisual) => {
    switch (visual.kind) {
      case 'SIGNAL_COMPARISON': {
        const sevColor =
          visual.severity === 'VETO'
            ? { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', bar: '#EF4444' }
            : visual.severity === 'WARNING'
            ? { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A', bar: '#F59E0B' }
            : { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0', bar: '#10B981' };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }} data-testid="graph-visual-SIGNAL">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Activity size={14} color="#D97706" />
                Signal Reading vs Decision Boundary
              </div>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: sevColor.text,
                  background: sevColor.bg,
                  border: `1px solid ${sevColor.border}`,
                  padding: '2px 7px',
                  borderRadius: 4
                }}
              >
                {visual.severity} BOUNDARY
              </span>
            </div>

            {/* Signal vs Normal / Boundary Visual Bar */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '12px 14px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#64748B', marginBottom: 6 }}>
                <span>Normal Baseline Range</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>Observed: {visual.observed_metric}</span>
                <span style={{ fontWeight: 700, color: sevColor.text }}>Boundary Threshold</span>
              </div>
              <svg width="100%" height="36" viewBox="0 0 400 36" role="img" aria-label="Signal comparison gauge">
                {/* Normal zone */}
                <rect x="0" y="10" width="180" height="14" rx="4" fill="#E2E8F0" />
                {/* Active signal deviation zone */}
                <rect x="180" y="10" width="130" height="14" fill="#FDE68A" />
                {/* Boundary trigger zone */}
                <rect x="310" y="10" width="90" height="14" rx="4" fill={sevColor.border} />
                {/* Boundary line */}
                <line x1="310" y1="4" x2="310" y2="30" stroke={sevColor.bar} strokeWidth="2" strokeDasharray="3 2" />
                {/* Observed reading marker */}
                <circle cx="275" cy="17" r="7" fill="#D97706" stroke="#FFFFFF" strokeWidth="2" />
              </svg>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#475569', marginTop: 4 }}>
                <span>Source: {visual.signal_source}</span>
                <span>Scope: {visual.affected_scope}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Monitored Boundary Condition
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                  {localise(visual.boundary_condition)}
                </div>
              </div>
              <div style={{ background: sevColor.bg, border: `1px solid ${sevColor.border}`, borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: sevColor.text, textTransform: 'uppercase' }}>
                  Required Decision Shift
                </div>
                <div style={{ fontSize: '0.76rem', fontWeight: 700, color: sevColor.text, marginTop: 2 }}>
                  {localise(visual.decision_shift)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'ELASTICITY_CURVE': {
        const pts = visual.points;
        const maxUplift = Math.max(...pts.map(p => Math.abs(p.expected_demand_uplift_pct)), 1);
        const maxContrib = Math.max(...pts.map(p => Math.abs(p.net_contribution_delta_gbp)), 1);
        const width = 420;
        const height = 148;
        const padX = 34;
        const zeroY = 82;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-EVIDENCE">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={14} color="#2563EB" />
                Price Elasticity &amp; Net Contribution Response Curve
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.66rem', color: '#475569' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#10B981' }} /> +Contribution
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: '#EF4444' }} /> -Margin Erosion
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 2, background: '#2563EB' }} /> Uplift %
                </span>
              </div>
            </div>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, padding: '10px 12px' }}>
              <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Elasticity response curve">
                {/* Break-even horizontal axis */}
                <line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke="#94A3B8" strokeWidth="1" strokeDasharray="3 2" />
                <text x={4} y={zeroY + 3} fontSize="9" fill="#64748B">0</text>

                {pts.map((pt, i) => {
                  const x =
                    pts.length === 1
                      ? width / 2
                      : padX + (i / (pts.length - 1)) * (width - padX * 2);
                  const barH = Math.min(46, Math.max(4, (Math.abs(pt.net_contribution_delta_gbp) / maxContrib) * 46));
                  const isPos = pt.net_contribution_delta_gbp >= 0;
                  const barY = isPos ? zeroY - barH : zeroY;
                  const isRec = pt.discount_pct === visual.recommended_discount_pct;
                  const isCur = pt.discount_pct === visual.current_discount_pct;
                  const isFlip = pt.discount_pct === visual.flip_discount_pct;

                  return (
                    <g key={pt.discount_pct}>
                      <rect
                        x={x - 12}
                        y={barY}
                        width={24}
                        height={barH}
                        rx={3}
                        fill={isPos ? '#10B981' : '#EF4444'}
                        opacity={isRec || isCur ? 0.95 : 0.65}
                      />
                      {(isRec || isCur || isFlip) && (
                        <rect
                          x={x - 14}
                          y={barY - 2}
                          width={28}
                          height={barH + 4}
                          rx={4}
                          fill="none"
                          stroke={isRec ? '#059669' : isCur ? '#2563EB' : '#D97706'}
                          strokeWidth="1.5"
                        />
                      )}
                      <text x={x} y={height - 6} fontSize="9.5" fontWeight={isRec || isCur ? '700' : '500'} fill="#0F172A" textAnchor="middle">
                        {pt.discount_pct}%
                      </text>
                    </g>
                  );
                })}

                {/* Demand uplift polyline */}
                <polyline
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="2"
                  points={pts
                    .map((pt, i) => {
                      const x =
                        pts.length === 1
                          ? width / 2
                          : padX + (i / (pts.length - 1)) * (width - padX * 2);
                      const y = zeroY - 8 - (pt.expected_demand_uplift_pct / maxUplift) * 48;
                      return `${x},${y}`;
                    })
                    .join(' ')}
                />
                {pts.map((pt, i) => {
                  const x =
                    pts.length === 1
                      ? width / 2
                      : padX + (i / (pts.length - 1)) * (width - padX * 2);
                  const y = zeroY - 8 - (pt.expected_demand_uplift_pct / maxUplift) * 48;
                  return <circle key={`dot-${pt.discount_pct}`} cx={x} cy={y} r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1" />;
                })}
              </svg>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: '0.72rem' }}>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                  Recommended Depth
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 1 }}>
                  {visual.recommended_discount_pct}% discount
                </div>
              </div>
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                  Current / Committed
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 1 }}>
                  {visual.current_discount_pct}% discount
                </div>
              </div>
              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '6px 8px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                  Contribution Flip Point
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 1 }}>
                  {visual.flip_discount_pct !== null ? `${visual.flip_discount_pct}% break-even` : 'No negative flip'}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'HYPOTHESIS_TEST': {
        const isSupported = visual.verdict.includes('SUPPORTED') || visual.verdict.includes('CONFIRMED');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-HYPOTHESIS">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <FlaskConical size={14} color="#7C3AED" />
                Counterfactual Hypothesis Evaluation Strip
              </div>
              <span
                style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  color: isSupported ? '#065F46' : '#92400E',
                  background: isSupported ? '#ECFDF5' : '#FFFBEB',
                  border: `1px solid ${isSupported ? '#A7F3D0' : '#FDE68A'}`,
                  padding: '2px 8px',
                  borderRadius: 4
                }}
              >
                VERDICT: {visual.verdict}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: 8,
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 8,
                padding: '10px 12px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  1. Observed Signal Input
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {visual.observed_metric}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                  {visual.signal_headline}
                </div>
              </div>
              <ArrowRight size={15} color="#7C3AED" />
              <div>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#6B21A8', textTransform: 'uppercase' }}>
                  2. Counterfactual Test Scope
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {visual.proposed_discount}% · {visual.proposed_region}
                </div>
                <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                  {visual.proposed_scope} stores · {visual.proposed_duration} days
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Counterfactual Demand Uplift
                </div>
                <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#2563EB', marginTop: 2, fontFamily: 'monospace' }}>
                  +{visual.expected_demand_pct.toFixed(1)}%
                </div>
              </div>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Counterfactual Net Contribution
                </div>
                <div
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 800,
                    color: visual.expected_contribution_gbp >= 0 ? '#059669' : '#DC2626',
                    marginTop: 2,
                    fontFamily: 'monospace'
                  }}
                >
                  {visual.expected_contribution_gbp >= 0 ? '+' : ''}
                  {money(visual.expected_contribution_gbp)}
                </div>
              </div>
            </div>
          </div>
        );
      }

      case 'OPPORTUNITY_RANKING': {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-DEMAND">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={14} color="#059669" />
                Regional Opportunity &amp; Demand Propensity Ranking (0–100)
              </div>
              <span style={{ fontSize: '0.66rem', color: '#64748B', fontWeight: 600 }}>
                Top region: {visual.cells[0]?.region || archetype.default_region}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {visual.cells.map(cell => {
                const barColor =
                  cell.opportunity_index >= 80
                    ? '#10B981'
                    : cell.opportunity_index >= 65
                    ? '#3B82F6'
                    : cell.opportunity_index >= 50
                    ? '#F59E0B'
                    : '#EF4444';
                return (
                  <div
                    key={`${cell.region}-${cell.window_label}`}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '7px 10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>
                        {cell.region}{' '}
                        <span style={{ fontWeight: 400, color: '#64748B', fontSize: '0.68rem' }}>
                          ({cell.store_count} stores · {cell.window_label} · {cell.target_discount}% / {cell.target_duration}d)
                        </span>
                      </span>
                      <span style={{ fontWeight: 800, color: '#0F172A', fontFamily: 'monospace' }}>
                        {cell.opportunity_index}/100 · {cell.tier}
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 7, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(100, Math.max(5, cell.opportunity_index))}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {visual.top_region_factors.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {visual.top_region_factors.map(f => (
                  <span
                    key={f.label}
                    style={{
                      fontSize: '0.68rem',
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 4,
                      padding: '3px 7px',
                      color: '#334155'
                    }}
                  >
                    {f.label}:{' '}
                    <strong style={{ color: f.points >= 0 ? '#059669' : '#DC2626' }}>
                      {f.points >= 0 ? `+${f.points}` : f.points} pts
                    </strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      }

      case 'ECONOMICS_WATERFALL': {
        const rows = [
          {
            label: `Committed Plan (${visual.committed_discount_pct}%)`,
            contrib: visual.committed_contribution_gbp,
            uplift: visual.committed_uplift_pct,
            tag: 'COMMITTED'
          },
          {
            label: `Recommended Curve Point (${visual.recommended_discount_pct}%)`,
            contrib: visual.recommended_contribution_gbp,
            uplift: visual.recommended_uplift_pct,
            tag: 'RECOMMENDED'
          },
          ...(visual.live_contribution_gbp !== null
            ? [
                {
                  label: 'Live CDI Assessment (Active Planner)',
                  contrib: visual.live_contribution_gbp,
                  uplift: visual.live_uplift_pct ?? visual.recommended_uplift_pct,
                  tag: 'LIVE CDI'
                }
              ]
            : [])
        ];
        const maxAbs = Math.max(...rows.map(r => Math.abs(r.contrib)), 1);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-ECONOMICS">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={14} color="#E11D48" />
                Net Contribution &amp; Trade-Off Waterfall
              </div>
              {visual.flip_discount_pct !== null && (
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', padding: '2px 7px', borderRadius: 4 }}>
                  Break-even boundary: {visual.flip_discount_pct}% discount
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {rows.map(row => {
                const pct = Math.min(100, Math.max(8, (Math.abs(row.contrib) / maxAbs) * 100));
                const isPos = row.contrib >= 0;
                return (
                  <div
                    key={row.label}
                    style={{
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '8px 10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: '#0F172A' }}>{row.label}</span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: isPos ? '#059669' : '#DC2626',
                          fontFamily: 'monospace'
                        }}
                      >
                        {isPos ? '+' : ''}
                        {money(row.contrib)} · +{row.uplift.toFixed(1)}% vol
                      </span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: isPos ? '#10B981' : '#EF4444',
                          borderRadius: 4
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {visual.funding_gap_gbp !== null && visual.funding_gap_gbp > 0 && (
              <div
                style={{
                  background: '#FFFBEB',
                  border: '1px solid #FDE68A',
                  borderRadius: 6,
                  padding: '7px 10px',
                  fontSize: '0.72rem',
                  color: '#92400E',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span>Supplier Funding Gap (to equalise deeper discount vs curve recommendation):</span>
                <strong style={{ fontFamily: 'monospace' }}>
                  {localise(visual.funding_gap_display || money(visual.funding_gap_gbp))}
                </strong>
              </div>
            )}
          </div>
        );
      }

      case 'FRONTIER_COMPARISON': {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-DECISION">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scale size={14} color="#0F172A" />
                Decision Frontier Option Comparison
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748B', fontWeight: 600 }}>
                Current vs Recommended Trade-Off
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {visual.plays.map(play => {
                const expColor =
                  play.supply_exposure === 'LOW'
                    ? '#059669'
                    : play.supply_exposure === 'MODERATE'
                    ? '#D97706'
                    : '#DC2626';
                return (
                  <div
                    key={play.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.3fr 0.9fr 1fr 1fr auto',
                      alignItems: 'center',
                      gap: 8,
                      background: play.is_recommended ? '#ECFDF5' : play.is_current ? '#EFF6FF' : '#F8FAFC',
                      border: play.is_recommended
                        ? '1.5px solid #10B981'
                        : play.is_current
                        ? '1.5px solid #2563EB'
                        : '1px solid #E2E8F0',
                      borderRadius: 6,
                      padding: '8px 10px',
                      fontSize: '0.73rem'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#0F172A' }}>{play.name}</div>
                      <div style={{ fontSize: '0.64rem', fontWeight: 700, color: play.is_recommended ? '#065F46' : '#475569' }}>
                        {play.badge}
                      </div>
                    </div>
                    <div style={{ color: '#334155', fontWeight: 600 }}>
                      {play.discount_pct}% · {play.stores_count} stores
                    </div>
                    <div style={{ fontFamily: 'monospace', fontWeight: 700, color: '#2563EB' }}>
                      +{play.expected_demand_uplift_pct.toFixed(1)}% vol
                    </div>
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        color: play.net_contribution_delta_gbp >= 0 ? '#059669' : '#DC2626'
                      }}
                    >
                      {play.net_contribution_delta_gbp >= 0 ? '+' : ''}
                      {money(play.net_contribution_delta_gbp)}
                    </div>
                    <span
                      style={{
                        fontSize: '0.64rem',
                        fontWeight: 700,
                        color: expColor,
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        padding: '2px 6px',
                        borderRadius: 4
                      }}
                    >
                      {play.supply_exposure} RISK
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'INTERVENTION_COMPARISON': {
        const contribDelta = visual.target_contribution_gbp - visual.current_contribution_gbp;
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-INTERVENTION">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={14} color="#2563EB" />
                Before → After Intervention Comparison
              </div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: contribDelta >= 0 ? '#065F46' : '#92400E',
                  background: contribDelta >= 0 ? '#ECFDF5' : '#FFFBEB',
                  border: `1px solid ${contribDelta >= 0 ? '#A7F3D0' : '#FDE68A'}`,
                  padding: '2px 7px',
                  borderRadius: 4,
                  fontFamily: 'monospace'
                }}
              >
                Contribution Delta: {contribDelta >= 0 ? '+' : ''}
                {money(contribDelta)}
              </span>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'stretch',
                gap: 10
              }}
            >
              {/* Before Card */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: '0.74rem'
                }}
              >
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>
                  Before (Committed Baseline)
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  {visual.current_discount_pct}% · {visual.current_region} ({visual.current_stores} stores) · {visual.current_duration_days}d
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475569', fontSize: '0.72rem' }}>
                  <span>Uplift: +{visual.current_uplift_pct.toFixed(1)}%</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                    {visual.current_contribution_gbp >= 0 ? '+' : ''}
                    {money(visual.current_contribution_gbp)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ArrowRight size={16} color="#2563EB" />
              </div>

              {/* After Card */}
              <div
                style={{
                  background: '#EFF6FF',
                  border: '1.5px solid #2563EB',
                  borderRadius: 8,
                  padding: '10px 12px',
                  fontSize: '0.74rem'
                }}
              >
                <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', marginBottom: 4 }}>
                  After ({visual.intervention_label})
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  {visual.target_discount_pct}% · {visual.target_region} ({visual.target_stores} stores) · {visual.target_duration_days}d
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#1E40AF', fontSize: '0.72rem' }}>
                  <span style={{ fontWeight: 600 }}>Uplift: +{visual.target_uplift_pct.toFixed(1)}%</span>
                  <span style={{ fontWeight: 800, color: '#059669', fontFamily: 'monospace' }}>
                    {visual.target_contribution_gbp >= 0 ? '+' : ''}
                    {money(visual.target_contribution_gbp)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: '0.7rem', color: '#475569' }}>
                Action path: Stage candidate in Intervention Workspace → Human Accept → Live CDI recalculation
              </span>
              {onProposeIntervention && (
                <button
                  type="button"
                  onClick={() => {
                    const econ = estimateInterventionEconomics(archetype, {
                      discount_pct: visual.target_discount_pct,
                      stores: visual.target_stores,
                      duration_days: visual.target_duration_days
                    });
                    onProposeIntervention({
                      title: `Graph Intervention: ${visual.intervention_label}`,
                      type: 'ADOPT_FRONTIER_PLAY',
                      description: `Governed intervention from Decision Reasoning Graph (${visual.target_discount_pct}% depth across ${visual.target_region}, ${visual.target_duration_days} days).`,
                      proposed_discount: visual.target_discount_pct,
                      proposed_scope: visual.target_stores,
                      proposed_duration: visual.target_duration_days,
                      proposed_region: visual.target_region,
                      expected_demand: econ.expected_demand_uplift_pct,
                      expected_contribution: econ.net_contribution_delta_gbp,
                      provenance: {
                        source_lens: 'FRONTIER',
                        source_id: selectedNode?.id || 'graph_intervention',
                        source_label: `Reasoning Graph · ${visual.intervention_label}`,
                        notes: [
                          `Staged from Evidence Network & Decision Reasoning Graph (${visual.current_discount_pct}% → ${visual.target_discount_pct}%).`
                        ]
                      }
                    });
                  }}
                  style={{
                    background: '#2563EB',
                    color: '#FFFFFF',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5
                  }}
                >
                  <span>Stage Candidate in Workspace</span>
                  <ArrowRight size={12} />
                </button>
              )}
            </div>
          </div>
        );
      }

      case 'COMPETITIVE_ASSUMPTION': {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} data-testid="graph-visual-COMPETITIVE_ASSUMPTION">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Scale size={14} color="#7C3AED" />
                OUR PRICE vs MODELLED COMPETITIVE BENCHMARK vs DECISION BOUNDARY
              </div>
              <span
                style={{
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  padding: '2px 7px',
                  borderRadius: 4
                }}
              >
                {visual.provenance_badge_label} · {visual.provenance_detail_label}
              </span>
            </div>

            {/* 3-Column Comparison: Our Price vs Modelled Competitive Benchmark vs Decision Boundary */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: 8
              }}
            >
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Our Price ({visual.active_depth_pct}% Depth)
                </div>
                <div style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.86rem', marginTop: 2, fontFamily: 'monospace' }}>
                  {money(visual.our_promotional_price_gbp, { decimals: 2, compact: false })}
                </div>
                <div style={{ color: '#475569', marginTop: 2 }}>
                  List price: {money(visual.our_list_price_gbp, { decimals: 2, compact: false })}
                </div>
              </div>

              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase' }}>
                  Modelled Competitive Benchmark
                </div>
                <div style={{ fontWeight: 800, color: '#1E3A8A', fontSize: '0.86rem', marginTop: 2, fontFamily: 'monospace' }}>
                  {money(visual.assumed_competitive_price_gbp, { decimals: 2, compact: false })}
                </div>
                <div style={{ color: '#1E40AF', marginTop: 2 }}>
                  {localise(visual.relative_position_label)} ({visual.disadvantage_pp >= 0 ? '+' : ''}
                  {visual.disadvantage_pp.toFixed(2)}pp)
                </div>
              </div>

              <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 6, padding: '8px 10px', fontSize: '0.72rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#92400E', textTransform: 'uppercase' }}>
                  Decision Boundary (Demand response {visual.gamma})
                </div>
                <div style={{ fontWeight: 800, color: '#92400E', fontSize: '0.82rem', marginTop: 2 }}>
                  {visual.boundary_outcome === 'FLIP_FOUND' &&
                  visual.boundary_price_gbp !== null &&
                  visual.boundary_disadvantage_pp !== null
                    ? `${visual.boundary_disadvantage_pp >= 0 ? '+' : ''}${visual.boundary_disadvantage_pp.toFixed(1)}% (${money(visual.boundary_price_gbp, { decimals: 2, compact: false })})`
                    : 'No Decision Flip'}
                </div>
                <div style={{ color: '#78350F', marginTop: 2 }}>
                  Current winner: {visual.current_winner_depth_pct}% ({money(visual.current_winner_contribution_gbp, { signed: true })})
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.72rem' }}>
              <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                  Own-Price vs Competitive Demand Decomposition
                </div>
                <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
                  Own: +{visual.own_price_response_pp.toFixed(2)}pp · Competitive: {visual.competitive_response_pp >= 0 ? '+' : ''}
                  {visual.competitive_response_pp.toFixed(2)}pp
                </div>
                <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 2 }}>
                  Ambient: {visual.ambient_competitive_effect_pp >= 0 ? '+' : ''}
                  {visual.ambient_competitive_effect_pp.toFixed(2)}pp · Attributable: {visual.intervention_attributable_competitive_effect_pp >= 0 ? '+' : ''}
                  {visual.intervention_attributable_competitive_effect_pp.toFixed(2)}pp
                </div>
              </div>

              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 6, padding: '8px 10px' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase' }}>
                  {visual.selected_response_label ? 'Selected Response Option' : 'CogniX Preferred Response'}
                </div>
                <div style={{ fontWeight: 700, color: '#065F46', marginTop: 2 }}>
                  {visual.selected_response_summary
                    ? visual.selected_response_summary
                    : `${visual.preferred_option_label} (${money(visual.preferred_option_contribution_gbp, { signed: true })})`}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#047857', marginTop: 2 }}>
                  {localise(visual.boundary_headline)}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
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
      <div style={{ marginBottom: 18 }}>
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
          <GitCommit size={18} color="#2563EB" />
          Evidence Network &amp; Decision Reasoning Graph
        </h3>
        <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
          Select any reasoning node to inspect its semantic evidence visual, decision threshold, and upstream/downstream causal links.
        </p>
      </div>

      {/* Decision Flow Pipeline Map */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          overflowX: 'auto',
          paddingBottom: 16,
          marginBottom: 16
        }}
      >
        {displayNodes.map((node, idx) => {
          const isSelected = selectedNode?.id === node.id;
          const colors = getCategoryColor(node.category);
          const isCompetitiveAssumptionNode = node.id === COMPETITIVE_ASSUMPTION_NODE_ID;

          return (
            <React.Fragment key={node.id}>
              <div
                onClick={() => setSelectedNodeId(node.id)}
                data-testid={
                  isCompetitiveAssumptionNode
                    ? 'graph-node-COMPETITIVE_ASSUMPTION'
                    : `graph-node-${node.category}`
                }
                style={{
                  minWidth: 160,
                  flex: '0 0 auto',
                  background: isSelected ? '#EFF6FF' : '#FFFFFF',
                  border: isSelected ? '2px solid #2563EB' : `1px solid ${colors.border}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span
                    style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: colors.text,
                      background: colors.bg,
                      padding: '2px 5px',
                      borderRadius: 4
                    }}
                  >
                    {node.category}
                  </span>

                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: 600,
                      color: '#64748B',
                      background: '#F1F5F9',
                      padding: '1px 4px',
                      borderRadius: 3
                    }}
                  >
                    {isCompetitiveAssumptionNode
                      ? 'MODELLED ASSUMPTION'
                      : node.provenance.replace(/_/g, ' ')}
                  </span>
                </div>

                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}>
                  {node.label}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.3 }}>
                  {localise(node.summary)}
                </div>
              </div>

              {idx < displayNodes.length - 1 && (
                <ArrowRight size={16} color="#94A3B8" style={{ flexShrink: 0 }} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Semantic Visual Intelligence Inspector */}
      {selectedNode && (() => {
        const panel = inspectDecisionGraphNode({
          archetype,
          node: selectedNode,
          liveContributionGbp,
          liveDemandUpliftPct,
          currentDiscountPct,
          currentRegion,
          currentDurationDays,
          competitiveWhatIf,
          selectedCompetitiveOptionType
        });
        const catColors = getCategoryColor(selectedNode.category);
        const provColors = getProvenanceBadgeStyle(panel.provenance_tier);
        const inbound = displayLinks.filter(l => l.to === selectedNode.id);
        const outbound = displayLinks.filter(l => l.from === selectedNode.id);
        const nameOf = (id: string) => displayNodes.find(n => n.id === id)?.label || id;

        return (
          <div
            data-testid="graph-intelligence-inspector"
            style={{
              background: '#F8FAFC',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '18px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 16
            }}
          >
            {/* Header: Category badge, Node title, single Provenance badge, Upstream & Downstream links */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
                paddingBottom: 12,
                borderBottom: '1px solid #E2E8F0'
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: catColors.text,
                      background: catColors.bg,
                      border: `1px solid ${catColors.border}`,
                      padding: '2px 7px',
                      borderRadius: 4,
                      textTransform: 'uppercase'
                    }}
                  >
                    {selectedNode.category}
                  </span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: provColors.text,
                      background: provColors.bg,
                      border: `1px solid ${provColors.border}`,
                      padding: '2px 8px',
                      borderRadius: 4,
                      letterSpacing: '0.03em'
                    }}
                  >
                    {panel.provenance_badge}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  {selectedNode.label}: {localise(selectedNode.summary)}
                </h4>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, fontSize: '0.73rem', color: '#475569' }}>
                <div>
                  <strong style={{ color: '#64748B' }}>Derived from:</strong>{' '}
                  {inbound.length > 0 ? inbound.map(l => nameOf(l.from)).join(', ') : 'Primary scenario signal input'}
                </div>
                <div>
                  <strong style={{ color: '#64748B' }}>Feeds into:</strong>{' '}
                  {outbound.length > 0 ? outbound.map(l => nameOf(l.to)).join(', ') : 'Planner candidate intervention'}
                </div>
              </div>
            </div>

            {/* 2-Column Body: Left Semantic Narrative (What / Why / Threshold) + Right Semantic Visual */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(260px, 1fr) minmax(320px, 1.35fr)',
                gap: 18,
                alignItems: 'start'
              }}
            >
              {/* Left Block: What this tells us, Why it matters, Relevant threshold / comparison */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>
                    What This Tells Us
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#0F172A', lineHeight: 1.45, fontWeight: 500 }}>
                    {localise(panel.what_this_tells_us)}
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0F172A', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>
                    Why It Matters To This Decision
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#334155', lineHeight: 1.45 }}>
                    {localise(panel.why_it_matters)}
                  </div>
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #DBEAFE',
                    borderRadius: 8,
                    padding: '10px 12px'
                  }}
                >
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#1E40AF', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: 3 }}>
                    Relevant Threshold / Comparison
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#1E3A8A', fontWeight: 600, lineHeight: 1.4 }}>
                    {localise(panel.threshold_comparison)}
                  </div>
                </div>
              </div>

              {/* Right Block: Category-Specific Semantic Visual */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 16px'
                }}
              >
                {renderSemanticVisual(panel.visual)}
              </div>
            </div>

            {/* Progressive Disclosure: Technical Provenance & Underlying Metrics */}
            <details
              style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '8px 12px',
                fontSize: '0.75rem'
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  listStyle: 'none'
                }}
              >
                <span>
                  Technical Provenance &amp; Underlying Metrics ({panel.heading} · {panel.source})
                </span>
                <ChevronDown size={14} color="#64748B" />
              </summary>
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontSize: '0.74rem', color: '#475569', marginBottom: 4 }}>
                  {localise(selectedNode.detail)}
                </div>
                {panel.facts.map(fact => (
                  <div
                    key={`${fact.label}-${fact.value}`}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      fontSize: '0.75rem'
                    }}
                  >
                    <span style={{ color: '#64748B' }}>{fact.label}</span>
                    <span style={{ color: '#0F172A', fontWeight: 600, textAlign: 'right' }}>
                      {localise(fact.value)}
                      {fact.note ? (
                        <span style={{ display: 'block', fontSize: '0.66rem', fontWeight: 400, color: '#94A3B8' }}>
                          {localise(fact.note)}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        );
      })()}
    </div>
  );
}
