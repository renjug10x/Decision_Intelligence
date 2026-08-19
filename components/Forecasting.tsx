'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown,
  ShieldAlert, Lightbulb, Clock, Check, Sliders, Compass, Zap, RotateCcw
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ExecutionBriefing from '@/components/ExecutionBriefing';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Legend, Filler
} from 'chart.js';

import storesData from '@/data/stores.json';
import { useDecisionState } from '@/context/DecisionStateContext';
import { fetchCurrentScenarioSignals } from '@/lib/enterprise-signal-client';
import { getOrCreateSessionId } from '@/lib/journey-client';
import { evaluateDemandDecisionFrontier } from '@/lib/demand-decision-frontier/demand-frontier-engine';
import DemandDecisionNarrative from '@/components/demand/DemandDecisionNarrative';
import {
  demandLabel, demandBadge, demandPhrase, describeSignalMovement, CONFIDENCE_VS_STABILITY
} from '@/lib/demand-decision-language';
import {
  DemandDecisionFrontierEvaluation,
  ContextualisedDecisionOutlook,
  EnterpriseSignal
} from '@/packages/contracts/src/index';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const TENANT_ID = 'tenant_uk_retail_01';

const fmt = {
  money: (v: number) => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000) return `£${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1000) return `£${(v / 1000).toFixed(1)}K`;
    return `£${Math.round(v).toLocaleString()}`;
  },
  wow: (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`,
  int: (v: number) => Math.round(v).toLocaleString(),
  pp: (v: number) => `${v.toFixed(1)}pp`,
};

interface ForecastResult {
  history: { date: string; value: number }[];
  forecast: { date: string; value: number }[];
  kpi: { projectedValue: number; growthRate: number; riskLevel: 'low' | 'medium' | 'high' };
}

interface ForecastingProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

// ── Shared visual tokens (CogniX professional light system) ──────────────────
const C = {
  ink: '#0F172A', body: '#334155', muted: '#64748B', faint: '#94A3B8',
  line: '#E2E8F0', hairline: '#F1F5F9', surface: '#FFFFFF', sunken: '#F8FAFC',
  demand: '#0284C7', capacity: '#D97706', risk: '#DC2626',
  good: '#059669', accent: '#FF6B00', neutral: '#475569'
};

const card: React.CSSProperties = {
  background: C.surface, border: `1px solid ${C.line}`, borderRadius: 10,
  boxShadow: '0 1px 2px rgba(15,23,42,0.03)'
};
const eyebrow: React.CSSProperties = {
  fontSize: '0.6875rem', color: C.muted, fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.05em'
};
const provenanceChip = (text: string, tone: 'neutral' | 'warn' = 'neutral') => (
  <span style={{
    fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.02em',
    color: tone === 'warn' ? '#92400E' : C.muted,
    background: tone === 'warn' ? '#FFFBEB' : C.hairline,
    border: `1px solid ${tone === 'warn' ? '#FDE68A' : C.line}`,
    padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap'
  }}>{text}</span>
);

export default function Forecasting({ onNavigateToExperiment }: ForecastingProps = {}) {
  const { role, apiKey, selectedStore, setSelectedStore } = useApp();
  const { decisionState, executeCommand } = useDecisionState();

  // ── Governance Scoping ─────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState('Manchester Piccadilly');
  const [focusCategory, setFocusCategory] = useState('Chilled');

  useEffect(() => {
    if (role === 'store_manager') {
      const matchedStore = (storesData as any[]).find(s => s.store_id === selectedStore);
      if (matchedStore) setStoreName(matchedStore.name);
    }
  }, [role, selectedStore]);

  // ── Scenario controls ──────────────────────────────────────────────────────
  const [metric, setMetric] = useState<'revenue' | 'units' | 'waste'>('revenue');
  const [horizon, setHorizon] = useState<7 | 14 | 30>(
    (decisionState?.scenario_parameters.forecast_horizon_days as any) || 14
  );
  const [model, setModel] = useState<'adaptive' | 'seasonality' | 'baseline'>('adaptive');
  const [promoLift, setPromoLift] = useState(decisionState?.scenario_parameters.promotion_lift ?? 20);
  const [cannibalization, setCannibalization] = useState(decisionState?.scenario_parameters.cannibalisation_factor ?? 0);
  const [eventBoost, setEventBoost] = useState(decisionState?.scenario_parameters.event_boost ?? 'none');

  const [showBriefing, setShowBriefing] = useState(false);
  const [showDeepReasoning, setShowDeepReasoning] = useState(false);
  const [reasoningTab, setReasoningTab] = useState<'changed' | 'constrains' | 'choices'>('changed');
  const [showTechnicalEvidence, setShowTechnicalEvidence] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (decisionState?.scenario_parameters) {
      setPromoLift(decisionState.scenario_parameters.promotion_lift);
      setHorizon((decisionState.scenario_parameters.forecast_horizon_days as any) || 14);
      setCannibalization(decisionState.scenario_parameters.cannibalisation_factor || 0);
      setEventBoost(decisionState.scenario_parameters.event_boost || 'none');
    }
  }, [decisionState?.scenario_parameters]);

  // All four scenario controls write to Shared Decision State (D-DDF-5).
  const handlePromoLiftChange = (val: number) => {
    setPromoLift(val);
    executeCommand('SET_PROMOTION_LIFT', { promotion_lift: val }, 'Forecasting.tsx');
  };
  const handleHorizonChange = (val: 7 | 14 | 30) => {
    setHorizon(val);
    executeCommand('SET_FORECAST_HORIZON', { forecast_horizon_days: val }, 'Forecasting.tsx');
  };
  const handleCannibalizationChange = (val: number) => {
    setCannibalization(val);
    executeCommand('SET_CANNIBALISATION_FACTOR', { cannibalisation_factor: val }, 'Forecasting.tsx');
  };
  const handleEventBoostChange = (val: string) => {
    setEventBoost(val);
    executeCommand('SET_EVENT_BOOST', { event_boost: val }, 'Forecasting.tsx');
  };

  // Changing the scenario invalidates any active simulation.
  useEffect(() => { setIsSimulating(false); }, [promoLift, cannibalization, eventBoost, horizon, model]);

  // ── Execution state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [demandSeries, setDemandSeries] = useState<ForecastResult | null>(null);
  const [revenuePerUnit, setRevenuePerUnit] = useState<number | null>(null);
  const [signals, setSignals] = useState<EnterpriseSignal[]>([]);
  const [outlook, setOutlook] = useState<ContextualisedDecisionOutlook | null>(null);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState('');
  const [optimizingBuffer, setOptimizingBuffer] = useState<string | null>(null);
  const [optimizedBuffers, setOptimizedBuffers] = useState<Record<string, boolean>>({});

  const buildQuery = useCallback((
    targetMetric: string, overrides?: { promoLift?: number; eventBoost?: string }
  ) => {
    const q = new URLSearchParams();
    q.set('type', 'forecast');
    q.set('metric', targetMetric);
    q.set('horizon', String(horizon));
    q.set('model', model === 'adaptive' ? 'genai' : model === 'seasonality' ? 'prophet' : 'arima');
    q.set('promoLift', String(overrides?.promoLift ?? promoLift));
    q.set('cannibalization', String(cannibalization));
    q.set('eventBoost', String(overrides?.eventBoost ?? eventBoost));
    if (role === 'store_manager') { q.set('role', 'store_manager'); q.set('store', selectedStore); }
    else if (role === 'category_manager') { q.set('role', 'category_manager'); q.set('category', focusCategory); }
    return q;
  }, [horizon, model, promoLift, cannibalization, eventBoost, role, selectedStore, focusCategory]);

  // ── Forecast + demand-frontier series ──────────────────────────────────────
  const runForecastSimulation = useCallback(async (isBufferOptimization = false, bufferId?: string) => {
    setLoading(true);
    const overrides = isBufferOptimization && bufferId === 'R001' ? { eventBoost: 'none' }
      : isBufferOptimization && bufferId === 'R002' ? { promoLift: Math.max(0, promoLift - 10) }
      : undefined;

    try {
      // The display metric drives the projection summary. The Demand Decision Frontier is a
      // demand artefact and is always evaluated in units, whatever the display metric is.
      const [display, units, revenue] = await Promise.all([
        fetch(`/api/data?${buildQuery(metric, overrides).toString()}`).then(r => r.json()),
        metric === 'units'
          ? null
          : fetch(`/api/data?${buildQuery('units', overrides).toString()}`).then(r => r.json()),
        metric === 'revenue'
          ? null
          : fetch(`/api/data?${buildQuery('revenue', overrides).toString()}`).then(r => r.json())
      ]);

      const unitsData: ForecastResult = units || display;
      const revenueData: ForecastResult = revenue || display;
      setResult(display);
      setDemandSeries(unitsData);

      const unitTotal = unitsData?.forecast?.reduce((a, f) => a + f.value, 0) ?? 0;
      const revenueTotal = revenueData?.forecast?.reduce((a, f) => a + f.value, 0) ?? 0;
      setRevenuePerUnit(unitTotal > 0 ? revenueTotal / unitTotal : null);

      let brief = '';
      if (apiKey) {
        try {
          const aiRes = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `Analyze this demand forecast projection: Scope: ${role === 'exec' ? 'National' : role === 'store_manager' ? storeName : focusCategory}, Metric: ${metric}, Horizon: ${horizon} days, Projected Total: ${display.kpi.projectedValue}, Growth Rate: ${(display.kpi.growthRate * 100).toFixed(1)}%, Risk Level: ${display.kpi.riskLevel.toUpperCase()}. Explain the seasonal trend, potential OOS or waste risks, and operational feasibility in 2 sentences.`,
              role: 'exec', apiKey,
            }),
          });
          brief = (await aiRes.json()).answer;
        } catch { /* deterministic fallback below */ }
      }

      if (!brief) {
        const scopeStr = role === 'exec' ? 'National' : role === 'store_manager' ? storeName : `${focusCategory} category`;
        const metricStr = metric === 'revenue' ? 'Revenue' : metric === 'units' ? 'Units demanded' : 'Waste units';
        const methodName = model === 'adaptive' ? 'Signal-adjusted outlook'
          : model === 'seasonality' ? 'Trend and seasonality outlook' : 'Trend baseline';
        if (metric === 'waste') {
          brief = display.kpi.growthRate > 0.05
            ? `${methodName} projects ${scopeStr} ${metricStr.toLowerCase()} rising ${fmt.wow(display.kpi.growthRate)} over ${horizon} days. Spoilage risk is ${display.kpi.riskLevel.toUpperCase()}; regional markdown rates are the available lever.`
            : `Waste projections are stable across ${scopeStr} (${fmt.wow(display.kpi.growthRate)}). Markdown rotations are performing as planned.`;
        } else {
          brief = display.kpi.growthRate > 0.15
            ? `${metricStr} is projected ${fmt.wow(display.kpi.growthRate)} for ${scopeStr} over ${horizon} days, driven by ${eventBoost !== 'none' ? eventBoost.replace('_', ' ') : 'promotional depth'}. Forecast risk is ${display.kpi.riskLevel.toUpperCase()}.`
            : `${methodName} projects stable ${metricStr.toLowerCase()} (${fmt.wow(display.kpi.growthRate)}) for ${scopeStr} over the next ${horizon} days.`;
        }
      }
      setAiBrief(brief);
    } catch (e) {
      console.error('[Forecasting] Failed to load projection', e);
      setResult(null);
      setDemandSeries(null);
    }
    setLoading(false);
  }, [buildQuery, metric, apiKey, role, storeName, focusCategory, horizon, model, eventBoost, promoLift]);

  useEffect(() => { runForecastSimulation(); }, [runForecastSimulation]);

  // ── Observed Enterprise Signals (real references, no fabrication) ───────────
  useEffect(() => {
    let cancelled = false;
    fetchCurrentScenarioSignals(decisionState?.scenario_id || 'SCN-PROMO-01', TENANT_ID)
      .then(s => { if (!cancelled) setSignals(s || []); })
      .catch(() => { if (!cancelled) setSignals([]); });
    return () => { cancelled = true; };
  }, [decisionState?.scenario_id]);

  // ── AC-DDF-10: Intent Fusion is bound to the governed route, not computed inline ──
  useEffect(() => {
    let cancelled = false;
    const sessionId = getOrCreateSessionId();
    fetch('/api/v1/intent-fusion/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenant_id: TENANT_ID, session_id: sessionId, baseline_forecast_lift_pct: 12 })
    })
      .then(r => r.json())
      .then(json => {
        if (cancelled) return;
        if (json?.status === 'success' && json.data) { setOutlook(json.data); setOutlookError(null); }
        else { setOutlook(null); setOutlookError(json?.message || 'Intent Fusion evaluation unavailable'); }
      })
      .catch(err => { if (!cancelled) { setOutlook(null); setOutlookError(err.message); } });
    return () => { cancelled = true; };
  }, [decisionState?.state_version]);

  const executeBufferOptimization = async (id: string) => {
    setOptimizingBuffer(id);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setOptimizedBuffers(prev => ({ ...prev, [id]: true }));
    await runForecastSimulation(true, id);
    setOptimizingBuffer(null);
  };

  // ── Demand Decision Frontier evaluation ────────────────────────────────────
  const evaluation: DemandDecisionFrontierEvaluation | null = useMemo(() => {
    if (!demandSeries || !outlook || !decisionState?.derived_impacts) return null;
    try {
      return evaluateDemandDecisionFrontier({
        tenantId: TENANT_ID,
        sessionId: decisionState.session_id,
        scenarioParams: decisionState.scenario_parameters,
        derivedImpacts: decisionState.derived_impacts,
        intentFusionOutlook: outlook,
        enterpriseSignals: signals,
        historySales: demandSeries.history,
        forecastSales: demandSeries.forecast,
        revenuePerUnitGbp: revenuePerUnit,
        metric,
        activeInterventionId: isSimulating ? 'SLA_FLEX_RULE_4' : null
      });
    } catch (e) {
      console.error('[Forecasting] Demand Decision Frontier evaluation failed', e);
      return null;
    }
  }, [demandSeries, outlook, decisionState, signals, revenuePerUnit, metric, isSimulating]);

  const sim = evaluation?.simulated_intervention;
  const simActive = isSimulating && !!sim;
  const stability = evaluation?.forecast_stability;
  const frontier = simActive ? sim.recomputed_frontier : evaluation?.demand_frontier;
  const gap = simActive ? sim.recomputed_gap : evaluation?.decision_gap;
  const regret = simActive ? sim.recomputed_regret : evaluation?.decision_regret;
  const window_ = evaluation?.decision_window;
  const intervention = evaluation?.recommended_intervention;

  // A failed recomputation must never leave a previous result on screen as current (AC-DDF-29).
  const intelligenceUnavailable = !evaluation;
  const unavailableReason = !decisionState?.derived_impacts
    ? 'Scenario state is unavailable, so what we can serve cannot be read.'
    : !outlook
      ? `Intent Fusion evaluation is unavailable${outlookError ? ` (${outlookError})` : ''}.`
      : !demandSeries
        ? 'The demand projection could not be loaded.'
        : 'The Demand Decision Frontier could not be computed from the current inputs.';

  // ── Chart ──────────────────────────────────────────────────────────────────
  const chartObj = useMemo(() => {
    if (!demandSeries || !frontier) return null;
    const histLabels = demandSeries.history.map(h => h.date.slice(5));
    const foreLabels = demandSeries.forecast.map(f => f.date.slice(5));

    // A day the source holds no record for is missing data, not zero demand — it is drawn as a
    // gap so the chart never shows a phantom collapse, and the forecast is joined to the last
    // day actually observed.
    const observed = demandSeries.history.map(h => (h.value > 0 ? h.value : null));
    let lastObservedIdx = -1;
    for (let i = observed.length - 1; i >= 0; i--) {
      if (observed[i] !== null) { lastObservedIdx = i; break; }
    }
    const lastHist = lastObservedIdx >= 0 ? (observed[lastObservedIdx] as number) : 0;
    const lead = Array(Math.max(0, demandSeries.history.length - 1)).fill(null);
    const future = frontier.trajectory.filter(t => t.emerging_demand_frontier !== null);
    const join = (series: (number | null)[]) => [...lead, lastHist, ...series];

    const datasets: any[] = [
      {
        label: 'Actual demand',
        data: [...observed, ...Array(demandSeries.forecast.length).fill(null)],
        borderColor: C.neutral, backgroundColor: 'transparent', fill: false,
        tension: 0.35, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2
      },
      {
        label: 'Current forecast',
        data: join(future.map(t => t.contextualised_demand)),
        borderColor: C.faint, backgroundColor: 'transparent', borderDash: [3, 3],
        fill: false, tension: 0.35, pointRadius: 0, pointHoverRadius: 3, borderWidth: 1.5
      },
      {
        label: 'Emerging demand',
        data: join(future.map(t => t.emerging_demand_frontier)),
        borderColor: C.demand,
        // Shade demand we cannot serve as exposure, and demand we can as headroom. Filling both
        // the same colour would render spare capacity as if it were a gap.
        fill: {
          target: '+1',
          above: 'rgba(220, 38, 38, 0.10)',
          below: 'rgba(5, 150, 105, 0.07)'
        },
        tension: 0.35, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5
      },
      {
        label: 'What we can serve',
        data: join(future.map(t => t.executable_demand_frontier)),
        borderColor: C.capacity, backgroundColor: 'transparent', borderDash: [6, 4],
        fill: false, tension: 0, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2
      }
    ];

    if (simActive) {
      datasets.push({
        label: 'Modelled after intervention',
        data: join(sim.recomputed_frontier.trajectory
          .filter(t => t.simulated_demand_frontier !== null)
          .map(t => t.simulated_demand_frontier as number)),
        borderColor: C.good, backgroundColor: 'transparent', borderDash: [2, 3],
        fill: false, tension: 0, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5
      });
    }
    return { labels: [...histLabels, ...foreLabels], datasets };
  }, [demandSeries, frontier, simActive, sim]);

  // Vertical rule at the point the Decision Window closes.
  const frontierMarkerPlugin = useMemo(() => ({
    id: 'ddfDecisionFrontierMarker',
    afterDatasetsDraw(chart: any) {
      if (!window_?.deadline_iso || window_.is_indeterminate || !demandSeries) return;
      const deadlineDay = window_.deadline_iso.slice(0, 10);
      const idx = demandSeries.forecast.findIndex(f => f.date >= deadlineDay);
      if (idx < 0) return;
      const x = chart.scales.x?.getPixelForValue(demandSeries.history.length + idx);
      if (!Number.isFinite(x)) return;
      const { ctx, chartArea } = chart;
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 1;
      ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#64748B';
      ctx.font = '600 10px system-ui, sans-serif';
      ctx.textAlign = x > chartArea.right - 90 ? 'right' : 'left';
      ctx.fillText('decision window closes', x > chartArea.right - 90 ? x - 5 : x + 5, chartArea.top + 11);
      ctx.restore();
    }
  }), [window_, demandSeries]);

  // ── Proactive risks (preserved) ────────────────────────────────────────────
  const FORECAST_RISKS = [
    {
      id: 'R001', title: 'Elevated spoilage risk', scope: 'North West', category: 'Chilled',
      triggerCondition: () => eventBoost === 'heatwave' && metric === 'waste',
      reason: 'The modelled heatwave raises spoilage velocity on dairy and chilled lines beyond the safety threshold in five North West stores.',
      actionLabel: 'Model a markdown buffer',
      mitigatedMessage: 'Markdown threshold modelled at 30% for short shelf-life items. Waste projection recomputed.'
    },
    {
      id: 'R002', title: 'Stockout risk on key lines', scope: 'London', category: 'Produce',
      triggerCondition: () => promoLift >= 25 && metric === 'units',
      reason: 'Promotional depth at this level exceeds the modelled London warehouse buffer on key SKUs.',
      actionLabel: 'Model a safety stock increase',
      mitigatedMessage: 'Safety stock modelled 15% higher at the London hub. Projection recomputed.'
    },
    {
      id: 'R003', title: 'Category margin leakage', scope: 'All', category: 'Dairy',
      triggerCondition: () => cannibalization >= 10,
      reason: 'Cannibalisation above 10% compresses adjacent line margins in the modelled scenario.',
      actionLabel: 'Model a promotion rebalance',
      mitigatedMessage: 'Cross-promotions rebalanced in the model. Projected margin leakage recomputed.'
    }
  ];
  const activeRisks = FORECAST_RISKS.filter(risk => {
    if (role === 'category_manager' && risk.category !== focusCategory) return false;
    if (role === 'store_manager' && risk.scope !== 'All' && risk.scope !== 'North West') return false;
    return risk.triggerCondition();
  });

  const scopeLabel = role === 'exec' ? 'National' : role === 'store_manager' ? storeName : `${focusCategory} category`;

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1240, margin: '0 auto', paddingBottom: 56 }}>

      {/* ── Header ── */}
      <div style={{ ...card, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 280, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: C.ink, letterSpacing: '-0.015em', margin: 0 }}>
                Demand Decision Frontier
              </h1>
              {provenanceChip('Simulated scenario', 'warn')}
            </div>
            <p style={{ fontSize: '0.8125rem', color: C.muted, margin: 0, lineHeight: 1.5, maxWidth: 620 }}>
              What customers are trending towards, what we can actually serve, and what it costs to wait.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.75rem', color: C.muted }}>
              <strong style={{ color: C.body }}>{scopeLabel}</strong>
            </span>
            {onNavigateToExperiment && (
              <button
                onClick={() => onNavigateToExperiment('EXP-COMMITMENT-01')}
                style={{
                  padding: '6px 14px', borderRadius: 6, background: C.accent, color: '#FFF',
                  border: 'none', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6
                }}
              >
                Commitment impact <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Role scoping controls */}
        {(role === 'category_manager' || role === 'store_manager') && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 14, flexWrap: 'wrap' }}>
            {role === 'category_manager' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: C.muted, fontWeight: 600 }}>Focus category</span>
                <select className="select" value={focusCategory} onChange={e => setFocusCategory(e.target.value)}
                  style={{ width: 140, height: 34, fontSize: '0.8125rem' }}>
                  {['Chilled', 'Dairy', 'Produce', 'Bakery', 'Frozen', 'Ambient', 'BWS', 'Non-food'].map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )}
            {role === 'store_manager' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: C.muted, fontWeight: 600 }}>My store</span>
                <select className="select" value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
                  style={{ width: 180, height: 34, fontSize: '0.8125rem' }}>
                  {storesData.map(s => <option key={s.store_id} value={s.store_id}>{s.name}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Intelligence unavailable ── */}
      {intelligenceUnavailable && (
        <div style={{
          ...card, borderColor: '#FDE68A', background: '#FFFBEB',
          padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <AlertTriangle size={16} color="#B45309" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#92400E' }}>
              Decision intelligence unavailable
            </div>
            <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: 2, lineHeight: 1.5 }}>
              {unavailableReason} No previous result is shown in its place.
            </div>
          </div>
        </div>
      )}

      {/* ── The decision story: stability → gap → window → regret ── */}
      {evaluation && gap && stability && regret && window_ && (
        <>
          {/* The lead: what changed, why, and what it costs. The measures beneath quantify it. */}
          <DemandDecisionNarrative
            evaluation={evaluation}
            gap={gap}
            promotionDepthPct={promoLift}
            horizonDays={horizon}
            simulationActive={simActive}
            scenarioEvent={eventBoost}
          />

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
            gap: 12, marginBottom: 12
          }}>
            {/* 1. Forecast Stability */}
            <div style={{ ...card, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={eyebrow}>Forecast stability</span>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                  color: stability.stability_state === 'DETERIORATING' ? C.risk
                    : stability.stability_state === 'WATCH' ? '#B45309'
                    : stability.stability_state === 'STABLE' ? C.good : C.muted,
                  background: stability.stability_state === 'DETERIORATING' ? '#FEF2F2'
                    : stability.stability_state === 'WATCH' ? '#FFFBEB'
                    : stability.stability_state === 'STABLE' ? '#ECFDF5' : C.hairline
                }}>{demandBadge('stability_state', stability.stability_state)}</span>
              </div>
              {stability.status === 'VALID' ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>
                      {stability.stability_score}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: C.muted }}>
                      revision risk {demandLabel('revision_risk', stability.revision_risk)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                    Evidence points {demandLabel('revision_direction', stability.likely_revision_direction)} by{' '}
                    {stability.likely_revision_magnitude_min_pct}–{stability.likely_revision_magnitude_max_pct}%,
                    at {stability.material_revision_probability_pct}% likelihood.
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.hairline}`, fontSize: '0.625rem', color: C.faint }}>
                    {stability.contributing_signal_refs.length} observed signal
                    {stability.contributing_signal_refs.length === 1 ? '' : 's'} · evidence confidence {stability.evidence_confidence_pct}%
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                  <strong style={{ color: C.body }}>Not enough evidence yet.</strong> {stability.indeterminate_reason}
                </div>
              )}
            </div>

            {/* 2. Decision Gap — the hero */}
            <div style={{
              ...card, padding: '14px 16px',
              borderColor: simActive ? '#A7F3D0' : gap.exposed_demand_units > 0 ? '#FECACA' : C.line,
              background: simActive ? '#F0FDF4' : C.surface
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ ...eyebrow, color: simActive ? '#15803D' : C.muted }}>
                  Decision gap {simActive && '· modelled'}
                </span>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                  color: simActive ? '#15803D' : gap.risk_state === 'LOW' ? C.good : C.risk,
                  background: simActive ? '#DCFCE7' : gap.risk_state === 'LOW' ? '#ECFDF5' : '#FEF2F2'
                }}>{demandBadge('gap_risk_state', gap.risk_state)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <span style={{
                  fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em',
                  color: simActive ? '#15803D' : C.ink
                }}>{fmt.pp(gap.exposed_demand_pp)}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: C.muted }}>
                  {fmt.int(gap.exposed_demand_units)} units
                </span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                {fmt.money(gap.revenue_at_risk_gbp)} of revenue we cannot currently serve,
                carrying {fmt.money(gap.margin_at_risk_gbp)} gross margin.
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.hairline}`, display: 'flex', justifyContent: 'space-between', fontSize: '0.625rem', color: C.faint }}>
                <span>Emerging <strong style={{ color: C.body }}>+{gap.emerging_demand_pct}%</strong></span>
                <span>Servable <strong style={{ color: C.body }}>+{gap.executable_demand_pct}%</strong></span>
              </div>
            </div>

            {/* 3. Decision Window */}
            <div style={{ ...card, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={eyebrow}>Decision window</span>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                  color: window_.window_state === 'OPEN' ? C.demand
                    : window_.window_state === 'CLOSING_SOON' ? '#B45309' : C.muted,
                  background: window_.window_state === 'OPEN' ? '#E0F2FE'
                    : window_.window_state === 'CLOSING_SOON' ? '#FFFBEB' : C.hairline
                }}>{demandBadge('window_state', window_.window_state)}</span>
              </div>
              {window_.is_indeterminate ? (
                <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
                  <strong style={{ color: C.body }}>Not enough evidence yet.</strong> {window_.explanation}
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>
                      {window_.remaining_hours}h
                    </span>
                    <span style={{ fontSize: '0.75rem', color: C.muted }}>of scenario time</span>
                  </div>
                  <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                    {window_.scenario_now_display} → {window_.deadline_display}, set by the{' '}
                    {window_.declared_constraint_name}.
                  </div>
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.hairline}`, fontSize: '0.625rem', color: C.faint, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={10} /> Modelled scenario clock, not live time
                  </div>
                </>
              )}
            </div>

            {/* 4. Decision Regret */}
            <div style={{ ...card, padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={eyebrow}>Cost of choosing wrongly</span>
                <span style={{
                  fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                  color: regret.recommended_action === 'CHOICE_REQUIRED' ? C.muted : '#6D28D9',
                  background: regret.recommended_action === 'CHOICE_REQUIRED' ? C.hairline : '#F5F3FF'
                }}>{demandBadge('recommended_action', regret.recommended_action)}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: C.ink, letterSpacing: '-0.02em' }}>
                  {fmt.money(regret.alternatives.do_nothing.expected_regret_gbp)}
                </span>
                <span style={{ fontSize: '0.75rem', color: C.muted }}>if we hold</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 6, lineHeight: 1.45 }}>
                {regret.recommended_action === 'CHOICE_REQUIRED'
                  ? 'The alternatives do not separate materially on these inputs. CogniX names no winner.'
                  : `Waiting instead forgoes ${fmt.money(regret.alternatives.wait.expected_regret_gbp)}.`}
              </div>
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${C.hairline}`, fontSize: '0.625rem', color: C.faint }}>
                Modelled expected values, not calibrated probabilities
              </div>
            </div>
          </div>

          {/* ── Action bar ── */}
          {intervention && (
            <div style={{
              ...card, padding: '14px 18px', marginBottom: 16,
              background: simActive ? '#ECFDF5' : C.sunken,
              borderColor: simActive ? '#A7F3D0' : C.line,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap'
            }}>
              <div style={{ flex: 1, minWidth: 300 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                  <span style={{ ...eyebrow, color: simActive ? '#047857' : C.muted }}>
                    {simActive ? 'Modelled outcome' : intervention.is_actionable ? 'CogniX recommends' : 'No action required'}
                  </span>
                  {simActive && provenanceChip('Simulation only — nothing ordered', 'warn')}
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem', color: C.ink }}>
                  {simActive ? sim.outcome_statement : intervention.intervention_name}
                </div>
                {!simActive && (
                  <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 3, lineHeight: 1.45 }}>
                    {intervention.is_actionable
                      ? `Recovers ${fmt.int(intervention.expected_units_recovered)} of ${fmt.int(gap.exposed_demand_units)} exposed units — ${fmt.money(intervention.expected_margin_recovered_gbp)} gross margin for ${fmt.money(intervention.intervention_cost_gbp)} of flex premium, leaving ${fmt.pp(intervention.residual_gap_pp)} exposed.`
                      : intervention.gated_reason}
                  </div>
                )}
              </div>

              {intervention.is_actionable && (
                <button
                  onClick={() => setIsSimulating(!isSimulating)}
                  style={{
                    padding: '9px 16px', borderRadius: 6, border: 'none', cursor: 'pointer',
                    background: simActive ? C.surface : C.ink,
                    color: simActive ? C.body : '#FFF',
                    boxShadow: simActive ? `inset 0 0 0 1px ${C.line}` : '0 1px 2px rgba(15,23,42,0.15)',
                    fontSize: '0.8125rem', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap'
                  }}
                >
                  {simActive ? <><RotateCcw size={14} /> Reset simulation</> : <><Zap size={14} /> Simulate intervention</>}
                </button>
              )}
            </div>
          )}

          {/* ── Progressive disclosure ── */}
          <div style={{ marginBottom: 16 }}>
            <button
              onClick={() => setShowDeepReasoning(!showDeepReasoning)}
              style={{
                padding: '7px 14px', borderRadius: 6, cursor: 'pointer',
                background: showDeepReasoning ? C.ink : C.surface,
                color: showDeepReasoning ? '#FFF' : C.body,
                border: `1px solid ${showDeepReasoning ? C.ink : C.line}`,
                fontSize: '0.75rem', fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 7
              }}
            >
              <Compass size={13} />
              {showDeepReasoning ? 'Hide reasoning' : 'How CogniX reached this'}
              {showDeepReasoning ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>
          </div>

          {showDeepReasoning && (
            <div style={{ ...card, padding: '18px 22px', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: `1px solid ${C.line}`, paddingBottom: 12, flexWrap: 'wrap' }}>
                {[
                  { id: 'changed', label: 'The evidence' },
                  { id: 'constrains', label: 'What constrains us' },
                  { id: 'choices', label: 'What the choices cost' }
                ].map(tab => (
                  <button key={tab.id} onClick={() => setReasoningTab(tab.id as any)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: reasoningTab === tab.id ? C.demand : C.hairline,
                      color: reasoningTab === tab.id ? '#FFF' : C.body,
                      fontSize: '0.75rem', fontWeight: 600
                    }}>{tab.label}</button>
                ))}
              </div>

              {reasoningTab === 'changed' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
                    <div style={{ background: C.sunken, padding: 14, borderRadius: 8, border: `1px solid ${C.line}` }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink, marginBottom: 10 }}>
                        What we are observing
                      </div>
                      {stability.status === 'VALID' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {signals
                            .filter(s => stability.contributing_signal_refs.includes(s.signal_id))
                            .map(s => {
                              const observed = describeSignalMovement(s);
                              return (
                                <div key={s.signal_id}>
                                  <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: C.ink }}>
                                    {observed.title}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: C.demand, fontWeight: 600, marginTop: 1 }}>
                                    {observed.movement}
                                  </div>
                                  {observed.entity && (
                                    <div style={{ fontSize: '0.6875rem', color: C.faint, marginTop: 1 }}>
                                      {observed.entity}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.6 }}>
                          {stability.indeterminate_reason}
                        </div>
                      )}
                    </div>

                    <div style={{ background: C.sunken, padding: 14, borderRadius: 8, border: `1px solid ${C.line}` }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink, marginBottom: 8 }}>
                        {CONFIDENCE_VS_STABILITY.heading}
                      </div>
                      <p style={{ fontSize: '0.75rem', color: C.body, lineHeight: 1.6, margin: 0 }}>
                        {CONFIDENCE_VS_STABILITY.body}
                      </p>
                    </div>
                  </div>

                  {/* Engineering provenance stays available, but never competes with the business story. */}
                  <div>
                    <button
                      onClick={() => setShowTechnicalEvidence(!showTechnicalEvidence)}
                      style={{
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        fontSize: '0.6875rem', fontWeight: 600, color: C.muted,
                        display: 'flex', alignItems: 'center', gap: 5
                      }}
                    >
                      <ChevronRight
                        size={12}
                        style={{ transform: showTechnicalEvidence ? 'rotate(90deg)' : undefined, transition: 'transform 0.15s' }}
                      />
                      Technical evidence
                    </button>

                    {showTechnicalEvidence && (
                      <div style={{
                        marginTop: 8, padding: '12px 14px', borderRadius: 8,
                        background: C.sunken, border: `1px solid ${C.line}`,
                        fontSize: '0.6875rem', color: C.muted, lineHeight: 1.65
                      }}>
                        <div>
                          Outlook decomposition — baseline{' '}
                          <strong>+{evaluation.intent_fusion_outlook.baseline_forecast.baseline_lift_pct}%</strong>, commercial intent{' '}
                          <strong>+{evaluation.intent_fusion_outlook.commercial_intent.intent_effect_pct}%</strong> at{' '}
                          {evaluation.intent_fusion_outlook.commercial_intent.discount_depth}% discount depth, observed signals{' '}
                          <strong>+{evaluation.intent_fusion_outlook.observed_signals.observed_signal_effect_pct}%</strong>.
                        </div>
                        <div style={{ marginTop: 6 }}>
                          Intent Fusion (IFI-01) via <code>POST /api/v1/intent-fusion/evaluate</code> · Shared Decision State v
                          {evaluation.intent_fusion_outlook.decision_state_version}
                        </div>
                        {stability.status === 'VALID' && stability.contributing_signal_refs.length > 0 && (
                          <div style={{ marginTop: 6 }}>
                            Contributing signal references:{' '}
                            <code>{stability.contributing_signal_refs.join(', ')}</code>
                          </div>
                        )}
                        <div style={{ marginTop: 6 }}>
                          {stability.confidence_distinction_statement}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {reasoningTab === 'constrains' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ fontSize: '0.75rem', color: C.body, lineHeight: 1.6, background: C.sunken, padding: 12, borderRadius: 8, border: `1px solid ${C.line}` }}>
                    {gap.reconciliation_evidence}
                  </div>
                  {gap.contributing_constraints.map(c => (
                    <div key={c.constraint_id} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14,
                      padding: '10px 14px', background: C.surface, borderRadius: 6, border: `1px solid ${C.line}`
                    }}>
                      <div style={{ minWidth: 200 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink }}>
                          {c.rank}. {c.name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2, lineHeight: 1.45 }}>
                          {c.description}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.capacity }}>
                          {fmt.pp(c.impact_pp)} · {fmt.int(c.impact_units)} units
                        </div>
                        <div style={{ fontSize: '0.625rem', color: C.faint, marginTop: 2 }}>
                          {demandLabel('provenance_class', c.provenance_basis)}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!window_.is_indeterminate && (
                    <div style={{ fontSize: '0.75rem', color: C.body, lineHeight: 1.6, background: C.sunken, padding: 12, borderRadius: 8, border: `1px solid ${C.line}` }}>
                      {window_.explanation} {window_.timezone_note}
                    </div>
                  )}
                </div>
              )}

              {reasoningTab === 'choices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 12 }}>
                    {(['act_now', 'wait', 'do_nothing'] as const).map(key => {
                      const alt = regret.alternatives[key];
                      const isRec = regret.recommended_action === alt.action_type;
                      return (
                        <div key={key} style={{
                          padding: 14, borderRadius: 8,
                          background: isRec ? '#F0FDF4' : C.sunken,
                          border: `1px solid ${isRec ? '#86EFAC' : C.line}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink }}>{alt.action_name}</span>
                            {isRec && <span style={{ fontSize: '0.625rem', fontWeight: 700, color: '#15803D', background: '#DCFCE7', padding: '1px 6px', borderRadius: 4 }}>Recommended</span>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: C.body, lineHeight: 1.6 }}>
                            <div><strong>Captures:</strong> {alt.what_it_captures}</div>
                            <div style={{ marginTop: 4 }}><strong>Risks:</strong> {alt.what_it_risks}</div>
                            <div style={{ marginTop: 4 }}><strong>Forgoes:</strong> {alt.what_it_forgoes}</div>
                          </div>
                          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                            <span style={{ color: C.muted }}>Expected value</span>
                            <strong style={{ color: alt.expected_decision_value_gbp >= 0 ? C.good : C.risk }}>
                              {fmt.money(alt.expected_decision_value_gbp)}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: 4 }}>
                            <span style={{ color: C.muted }}>Regret</span>
                            <strong style={{ color: alt.expected_regret_gbp === 0 ? C.good : '#6D28D9' }}>
                              {fmt.money(alt.expected_regret_gbp)}
                            </strong>
                          </div>
                          {alt.feasibility_status !== 'FEASIBLE' && (
                            <div style={{ fontSize: '0.625rem', color: '#B45309', marginTop: 6 }}>
                              Not currently actionable: {alt.gating_reasons?.[0]}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ background: C.sunken, padding: 14, borderRadius: 8, border: `1px solid ${C.line}` }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink, marginBottom: 6 }}>
                      The inputs all three share
                    </div>
                    <p style={{ fontSize: '0.75rem', color: C.body, lineHeight: 1.6, margin: '0 0 10px 0' }}>
                      {regret.regret_definition}
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '6px 18px', fontSize: '0.75rem', color: C.body }}>
                      <span>Exposed demand: <strong>{fmt.int(regret.shared_inputs_summary.exposed_demand_units)} units</strong></span>
                      <span>Recoverable within window: <strong>{fmt.int(regret.shared_inputs_summary.capturable_units)} units</strong></span>
                      <span>Revenue per unit: <strong>£{regret.shared_inputs_summary.revenue_per_unit_gbp.toFixed(2)}</strong></span>
                      <span>Gross margin per unit: <strong>£{regret.shared_inputs_summary.gross_margin_per_unit_gbp.toFixed(2)}</strong></span>
                      <span>Demand holds at: <strong>{regret.shared_inputs_summary.demand_materialises_probability_pct}%</strong></span>
                      <span>Erosion if we wait: <strong>{regret.shared_inputs_summary.lead_time_erosion_pct}%</strong></span>
                      <span>Flex premium: <strong>{fmt.money(regret.shared_inputs_summary.intervention_cost_gbp)}</strong></span>
                      <span>Separation threshold: <strong>{fmt.money(regret.separation_threshold_gbp)}</strong></span>
                    </div>
                  </div>

                  <div style={{ background: C.sunken, padding: 14, borderRadius: 8, border: `1px solid ${C.line}` }}>
                    <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink, marginBottom: 8 }}>
                      Where every number comes from
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {evaluation.assumptions.map(a => (
                        <div key={a.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.75rem', flexWrap: 'wrap' }}>
                          <span style={{ color: C.body, fontWeight: 600, minWidth: 170 }}>{a.label}</span>
                          <span style={{ color: C.muted, flex: 1, minWidth: 180 }}>{a.value}</span>
                          {provenanceChip(
                            demandLabel('provenance_class', a.provenance_class),
                            a.provenance_class === 'MODELLED_DEMO_ASSUMPTION' ? 'warn' : 'neutral'
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Chart + scenario controls ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.1fr) minmax(260px, 1fr)', gap: 16, marginBottom: 20 }}
        className="ddf-main-grid">
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.ink }}>
                What customers want, against what we can serve
              </div>
              <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 2 }}>
                Demand units over {horizon} days. The shaded band is the Decision Gap.
              </div>
            </div>
            {simActive && (
              <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 12 }}>
                Simulation active
              </span>
            )}
          </div>

          <div style={{ flex: 1, position: 'relative', minHeight: 300, marginTop: 10 }}>
            {loading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.82)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 10
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={22} className="spinner" style={{ color: C.demand }} />
                  <span style={{ fontSize: '0.8125rem', color: C.body, fontWeight: 600 }}>Recomputing projection…</span>
                </div>
              </div>
            )}
            {chartObj ? (
              <Line
                data={chartObj}
                plugins={[frontierMarkerPlugin]}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: { mode: 'index', intersect: false },
                  plugins: {
                    legend: {
                      display: true, position: 'bottom',
                      labels: { color: C.body, boxWidth: 14, boxHeight: 3, padding: 14, font: { size: 11, weight: 600 }, usePointStyle: false }
                    },
                    tooltip: {
                      backgroundColor: C.ink, titleColor: '#F8FAFC', bodyColor: '#E2E8F0',
                      borderColor: '#334155', borderWidth: 1, padding: 10,
                      callbacks: {
                        label: (ctx: any) => {
                          const val = ctx.raw as number;
                          if (val === null || val === undefined) return '';
                          return ` ${ctx.dataset.label}: ${fmt.int(val)} units`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: { grid: { color: C.hairline }, ticks: { color: C.muted, font: { size: 10 }, maxRotation: 0, autoSkipPadding: 16 } },
                    y: {
                      grid: { color: C.hairline },
                      ticks: {
                        color: C.muted, font: { size: 10 },
                        callback: (v: any) => v >= 1000 ? `${(v / 1000).toFixed(0)}K` : String(v)
                      }
                    }
                  }
                }}
              />
            ) : !loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontSize: '0.8125rem' }}>
                No projection available for the current scope.
              </div>
            )}
          </div>
        </div>

        {/* Scenario controls */}
        <div style={{ ...card, padding: '16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 12, borderBottom: `1px solid ${C.hairline}` }}>
            <Sliders size={15} color={C.demand} />
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.ink }}>Scenario</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingTop: 14 }}>
            <div>
              <label style={{ ...eyebrow, display: 'block', marginBottom: 6 }}>Projection summary metric</label>
              <select className="select w-full" value={metric} onChange={e => setMetric(e.target.value as any)}
                style={{ height: 36, fontSize: '0.8125rem' }}>
                <option value="revenue">Gross revenue (£)</option>
                <option value="units">Units demanded</option>
                <option value="waste">Expected waste</option>
              </select>
            </div>

            <div>
              <label style={{ ...eyebrow, display: 'block', marginBottom: 6 }}>Projection method</label>
              <select className="select w-full" value={model} onChange={e => setModel(e.target.value as any)}
                style={{ height: 36, fontSize: '0.8125rem' }}>
                <option value="adaptive">Signal-adjusted outlook</option>
                <option value="seasonality">Trend and seasonality</option>
                <option value="baseline">Trend baseline</option>
              </select>
            </div>

            <div>
              <label style={{ ...eyebrow, display: 'block', marginBottom: 6 }}>Horizon</label>
              <select className="select w-full" value={horizon}
                onChange={e => handleHorizonChange(Number(e.target.value) as any)}
                style={{ height: 36, fontSize: '0.8125rem' }}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>

            <div>
              <label style={{ ...eyebrow, display: 'block', marginBottom: 6 }}>Event or holiday</label>
              <select className="select w-full" value={eventBoost} onChange={e => handleEventBoostChange(e.target.value)}
                style={{ height: 36, fontSize: '0.8125rem' }}>
                <option value="none">None expected</option>
                <option value="heatwave">Heatwave / summer spike</option>
                <option value="holiday">Bank holiday weekend</option>
                <option value="christmas">Christmas spike</option>
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={eyebrow}>Promotion depth</label>
                <span style={{ fontSize: '0.75rem', color: C.demand, fontWeight: 700 }}>+{promoLift}%</span>
              </div>
              <input type="range" min="0" max="50" step="5" value={promoLift}
                onChange={e => handlePromoLiftChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.demand, cursor: 'pointer' }} />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={eyebrow}>Cannibalisation</label>
                <span style={{ fontSize: '0.75rem', color: C.capacity, fontWeight: 700 }}>−{cannibalization}%</span>
              </div>
              <input type="range" min="0" max="20" step="2" value={cannibalization}
                onChange={e => handleCannibalizationChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: C.capacity, cursor: 'pointer' }} />
            </div>

            {decisionState && (
              <div style={{ fontSize: '0.6875rem', color: C.faint, paddingTop: 10, borderTop: `1px solid ${C.hairline}`, lineHeight: 1.6 }}>
                Supplier allocation cap <strong style={{ color: C.body }}>+{decisionState.scenario_parameters.supplier_capacity_cap}%</strong>{' '}
                is read from the current scenario and is not editable here.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Projection summary (preserved KPIs) ── */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={eyebrow}>Projected total ({horizon} days)</div>
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: '-0.02em' }}>
              {metric === 'revenue' ? fmt.money(result.kpi.projectedValue) : fmt.int(result.kpi.projectedValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
              {metric === 'revenue' ? 'Gross revenue' : metric === 'units' ? 'Units demanded' : 'Waste units'} across the horizon
            </div>
          </div>

          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={eyebrow}>Period growth rate</div>
            <div style={{
              fontSize: '1.625rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em',
              color: result.kpi.growthRate >= 0 ? C.good : C.risk
            }}>{fmt.wow(result.kpi.growthRate)}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
              Projected daily average vs the observed run rate
            </div>
          </div>

          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={eyebrow}>Forecast risk index</div>
            <div style={{
              fontSize: '1.625rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em', textTransform: 'uppercase',
              color: result.kpi.riskLevel === 'high' ? C.risk : result.kpi.riskLevel === 'medium' ? C.capacity : C.good
            }}>{result.kpi.riskLevel}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
              Based on projection variance and volume limits
            </div>
          </div>
        </div>
      )}

      {/* ── Learning pattern ── */}
      {evaluation && gap && (
        <div style={{ ...card, borderLeft: `4px solid ${C.accent}`, padding: '16px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {provenanceChip('Demonstration pattern')}
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: C.ink }}>
                Regional demand surge with supplier headroom
              </span>
            </div>
            <button onClick={() => setShowBriefing(true)}
              style={{
                padding: '5px 12px', borderRadius: 6, background: C.surface,
                border: `1px solid ${C.line}`, color: C.accent, fontSize: '0.75rem',
                fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
              }}>
              Execution briefing <ChevronRight size={13} />
            </button>
          </div>
          <p style={{ fontSize: '0.8125rem', color: C.body, margin: 0, lineHeight: 1.55 }}>
            This scenario matches a seeded demonstration precedent: demand accelerating into a capped
            supplier allocation, where a contractual flex notice recovers part of the exposure. It cites
            one demonstration precedent and carries no calibrated success rate.
          </p>
        </div>
      )}

      <ExecutionBriefing
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        briefing={{
          title: 'Demand planning execution briefing',
          situation: gap
            ? `Emerging demand is running ${fmt.pp(gap.exposed_demand_pp)} above what current commitments can serve — ${fmt.int(gap.exposed_demand_units)} units, ${fmt.money(gap.revenue_at_risk_gbp)} of revenue.`
            : 'Decision intelligence is unavailable for the current scope.',
          whyNow: window_ && !window_.is_indeterminate
            ? `The ${window_.declared_constraint_name} closes at ${window_.deadline_display} — ${window_.remaining_hours}h from scenario time ${window_.scenario_now_display}.`
            : 'No declared operational deadline is available, so no window is claimed.',
          recommendedAction: intervention?.is_actionable
            ? intervention.intervention_name
            : 'No capacity intervention is required under the current scenario.',
          owner: 'Demand Planning & Commercial Lead',
          dependencies: ['FreshDirect volume flex notice (modelled)', 'Trafford DC allocation schedule (modelled)'],
          timeHorizon: `Next ${horizon} days`,
          expectedOutcome: intervention?.is_actionable
            ? `Modelled recovery of ${fmt.int(intervention.expected_units_recovered)} units — ${fmt.money(intervention.expected_margin_recovered_gbp)} gross margin for ${fmt.money(intervention.intervention_cost_gbp)} of flex premium.`
            : 'No modelled recovery required.',
          confidence: stability?.evidence_confidence_pct ?? 0,
          patternId: 'PAT-OPP-02',
          contractStatus: 'VERIFIED',
          evidence: [
            ...(intervention?.evidence_basis ?? []),
            'Supplier allocation and capacity read from the current scenario, unchanged by this briefing.'
          ]
        }}
      />

      {/* ── Diagnostics & proactive risks ── */}
      <div className="grid-2-1 mb-6">
        {result && (
          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingBottom: 10, borderBottom: `1px solid ${C.hairline}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ai-orb"><Sparkles size={13} strokeWidth={2} color="white" /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: C.ink }}>Forecast diagnostics</div>
                  <div style={{ fontSize: '0.6875rem', color: C.muted }}>
                    {apiKey ? 'Narrated summary' : 'Deterministic summary'} · {horizon}d · {scopeLabel}
                  </div>
                </div>
              </div>
              {provenanceChip(apiKey ? 'narrated' : 'deterministic')}
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: 1.65, color: C.body, margin: '12px 0 0 0' }}>{aiBrief}</p>
          </div>
        )}

        <div style={{ ...card, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: `1px solid ${C.hairline}` }}>
            <ShieldAlert size={15} color={C.risk} />
            <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.ink }}>Proactive risks</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12 }}>
            {activeRisks.length === 0 ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 14, background: '#ECFDF5', borderRadius: 8, border: '1px solid #A7F3D0' }}>
                <CheckCircle2 size={16} color={C.good} />
                <span style={{ fontSize: '0.8125rem', color: '#065F46' }}>
                  No high-risk anomalies in the current scenario parameters.
                </span>
              </div>
            ) : activeRisks.map(risk => {
              const isOptimized = optimizedBuffers[risk.id];
              return (
                <div key={risk.id} style={{
                  padding: 12, borderRadius: 8,
                  background: isOptimized ? '#ECFDF5' : C.sunken,
                  border: `1px solid ${isOptimized ? '#A7F3D0' : C.line}`
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: C.ink }}>{risk.title}</span>
                    <span style={{
                      fontSize: '0.625rem', fontWeight: 700, padding: '1px 6px', borderRadius: 4, whiteSpace: 'nowrap',
                      color: isOptimized ? '#065F46' : '#991B1B',
                      background: isOptimized ? '#D1FAE5' : '#FEE2E2'
                    }}>{isOptimized ? 'Modelled' : 'At risk'}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: C.body, lineHeight: 1.5, margin: '0 0 10px 0' }}>
                    {isOptimized ? risk.mitigatedMessage : risk.reason}
                  </p>
                  {!isOptimized && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button onClick={() => executeBufferOptimization(risk.id)}
                        disabled={optimizingBuffer === risk.id}
                        style={{
                          height: 28, fontSize: '0.6875rem', gap: 5, background: C.demand, color: '#FFF',
                          border: 'none', borderRadius: 4, padding: '0 10px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', fontWeight: 600
                        }}>
                        {optimizingBuffer === risk.id
                          ? <><Loader2 size={10} style={{ animation: 'spin 0.8s linear infinite' }} /> Recomputing…</>
                          : <><Lightbulb size={11} color="white" /> {risk.actionLabel}</>}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .ddf-main-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
