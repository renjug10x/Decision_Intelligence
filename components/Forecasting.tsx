'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle, ChevronRight, ChevronDown,
  ShieldAlert, Lightbulb, Clock, Sliders, Compass, Zap, RotateCcw, Layers
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ExecutionBriefing from '@/components/ExecutionBriefing';

import storesData from '@/data/stores.json';
import { useDecisionState } from '@/context/DecisionStateContext';
import { fetchCurrentScenarioSignals } from '@/lib/enterprise-signal-client';
import { getOrCreateSessionId } from '@/lib/journey-client';
import { evaluateDemandDecisionFrontier } from '@/lib/demand-decision-frontier/demand-frontier-engine';
import DemandDecisionNarrative from '@/components/demand/DemandDecisionNarrative';
import DemandForecastChart from '@/components/demand/DemandForecastChart';
import ForecastModelPanel from '@/components/demand/ForecastModelPanel';
import {
  demandLabel, demandBadge, describeSignalMovement, CONFIDENCE_VS_STABILITY
} from '@/lib/demand-decision-language';
import {
  DemandDecisionFrontierEvaluation,
  ContextualisedDecisionOutlook,
  EnterpriseSignal
} from '@/packages/contracts/src/index';
import {
  ForecastModelDeclaration,
  ForecastRefusal,
  ModelComparison
} from '@/packages/contracts/src/forecast-model-model';
import type { DemandProjection } from '@/lib/demand-forecast';

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

interface ForecastingProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

interface Recommendation {
  recommended: string;
  measured: boolean;
  comparison: ModelComparison;
  statement: string;
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

/** The governed default the surface starts on, replaced by the registry's own default once loaded. */
const INITIAL_MODEL_ID = 'HOLT_WINTERS_ADDITIVE';

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
  const [modelId, setModelId] = useState<string>(INITIAL_MODEL_ID);
  const [promoLift, setPromoLift] = useState(decisionState?.scenario_parameters.promotion_lift ?? 20);
  const [cannibalization, setCannibalization] = useState(decisionState?.scenario_parameters.cannibalisation_factor ?? 0);
  const [eventBoost, setEventBoost] = useState(decisionState?.scenario_parameters.event_boost ?? 'none');

  const [showBriefing, setShowBriefing] = useState(false);
  const [showDeepReasoning, setShowDeepReasoning] = useState(false);
  const [reasoningTab, setReasoningTab] = useState<'changed' | 'constrains' | 'choices'>('changed');
  const [showTechnicalEvidence, setShowTechnicalEvidence] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [showDecisionLayer, setShowDecisionLayer] = useState(true);
  const [activeDate, setActiveDate] = useState<string | null>(null);

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
  useEffect(() => { setIsSimulating(false); }, [promoLift, cannibalization, eventBoost, horizon, modelId]);

  // ── Execution state ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<ForecastModelDeclaration[]>([]);
  const [result, setResult] = useState<DemandProjection | null>(null);
  const [demandSeries, setDemandSeries] = useState<DemandProjection | null>(null);
  const [refusal, setRefusal] = useState<ForecastRefusal | null>(null);
  const [revenuePerUnit, setRevenuePerUnit] = useState<number | null>(null);
  const [signals, setSignals] = useState<EnterpriseSignal[]>([]);
  const [outlook, setOutlook] = useState<ContextualisedDecisionOutlook | null>(null);
  const [outlookError, setOutlookError] = useState<string | null>(null);
  const [aiBrief, setAiBrief] = useState('');
  const [optimizingBuffer, setOptimizingBuffer] = useState<string | null>(null);
  const [optimizedBuffers, setOptimizedBuffers] = useState<Record<string, boolean>>({});
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  /**
   * The registry is the only list of models this surface may offer. It admits a model only where an
   * adapter genuinely fits and predicts it, which is why there is nothing to hard-code here.
   */
  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/forecast/models')
      .then(r => r.json())
      .then(json => {
        if (cancelled || json?.status !== 'success') return;
        const list: ForecastModelDeclaration[] = json.data.models ?? [];
        setModels(list);
        if (!list.some(m => m.model_id === modelId)) setModelId(json.data.default_model_id);
      })
      .catch(() => { /* the projection call reports its own failure */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const projectionBody = useCallback((
    targetMetric: string, overrides?: { promoLift?: number; eventBoost?: string }
  ) => ({
    metric: targetMetric,
    horizon,
    model_id: modelId,
    promotion_lift: overrides?.promoLift ?? promoLift,
    cannibalisation: cannibalization,
    event: overrides?.eventBoost ?? eventBoost,
    store_id: role === 'store_manager' ? selectedStore : undefined,
    category: role === 'category_manager' ? focusCategory : undefined,
    history_display_days: horizon === 30 ? 30 : 21
  }), [horizon, modelId, promoLift, cannibalization, eventBoost, role, selectedStore, focusCategory]);

  const postProjection = useCallback(async (metricName: string, overrides?: { promoLift?: number; eventBoost?: string }) => {
    const res = await fetch('/api/v1/demand/forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectionBody(metricName, overrides))
    });
    return res.json();
  }, [projectionBody]);

  // ── Governed projection + demand-frontier series ───────────────────────────
  const runForecastSimulation = useCallback(async (isBufferOptimization = false, bufferId?: string) => {
    setLoading(true);
    const overrides = isBufferOptimization && bufferId === 'R001' ? { eventBoost: 'none' }
      : isBufferOptimization && bufferId === 'R002' ? { promoLift: Math.max(0, promoLift - 10) }
      : undefined;

    try {
      // The display metric drives the projection summary. The Demand Decision Frontier is a demand
      // artefact and is always evaluated in units, whatever the display metric is.
      const [display, units, revenue] = await Promise.all([
        postProjection(metric, overrides),
        metric === 'units' ? null : postProjection('units', overrides),
        metric === 'revenue' ? null : postProjection('revenue', overrides)
      ]);

      if (display?.status === 'refused') {
        setRefusal(display.data as ForecastRefusal);
        setResult(null); setDemandSeries(null); setAiBrief('');
        setLoading(false);
        return;
      }
      if (display?.status !== 'success') {
        throw new Error(display?.message || 'The demand projection could not be produced.');
      }
      setRefusal(null);

      const displayProjection: DemandProjection = display.data.projection;
      const unitsProjection: DemandProjection =
        units?.status === 'success' ? units.data.projection : displayProjection;
      const revenueProjection: DemandProjection =
        revenue?.status === 'success' ? revenue.data.projection : displayProjection;

      setResult(displayProjection);
      setDemandSeries(unitsProjection);

      const unitTotal = unitsProjection.kpi.projected_total;
      const revenueTotal = revenueProjection.kpi.projected_total;
      setRevenuePerUnit(unitTotal > 0 ? revenueTotal / unitTotal : null);

      const exec = displayProjection.execution;
      let brief = '';
      if (apiKey) {
        try {
          const aiRes = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `Analyze this demand forecast projection: Scope: ${role === 'exec' ? 'National' : role === 'store_manager' ? storeName : focusCategory}, Metric: ${metric}, Horizon: ${horizon} days, Model: ${exec.model_display_name}, Projected Total: ${displayProjection.kpi.projected_total}, Expected change vs observed run rate: ${(displayProjection.kpi.expected_change_pct * 100).toFixed(1)}%. Explain what the seasonal pattern and the forecast range mean operationally in 2 sentences. Do not claim any accuracy figure.`,
              role: 'exec', apiKey,
            }),
          });
          brief = (await aiRes.json()).answer;
        } catch { /* deterministic fallback below */ }
      }

      if (!brief) {
        /**
         * The deterministic summary earns its place by saying what the cards beside it do not: how
         * much of the movement is the model's and how much is an assumption a person entered, and
         * where in the horizon the forecast stops being confident. Repeating the coverage figure
         * from the model panel and the summary card would be a third copy of one sentence.
         */
        const scopeStr = role === 'exec' ? 'National' : role === 'store_manager' ? storeName : `${focusCategory} category`;
        const metricStr = metric === 'revenue' ? 'Revenue' : metric === 'units' ? 'Units demanded' : 'Waste units';
        const modelMove = displayProjection.kpi.baseline_change_pct;
        const total = displayProjection.kpi.expected_change_pct;
        const assumed = displayProjection.scenario.combined_factor;
        const first = displayProjection.forecast[0];
        const last = displayProjection.forecast[displayProjection.forecast.length - 1];
        const widen = first && last && first.range_lower !== null && last.range_lower !== null &&
          (last.range_upper as number) - (last.range_lower as number) > 0
          ? ((last.range_upper as number) - (last.range_lower as number)) /
            ((first.range_upper as number) - (first.range_lower as number))
          : null;
        const composition = Math.abs(assumed - 1) < 1e-9
          ? `No commercial assumption is applied, so all of it is the model.`
          : `${Math.abs(modelMove) < 0.005 ? 'The model itself expects the run rate to hold' : `The model itself expects ${fmt.wow(modelMove)}`}; the rest is the declared commercial assumption of ×${assumed.toFixed(2)}.`;
        brief =
          `${exec.model_display_name} puts ${metricStr.toLowerCase()} for ${scopeStr} at ` +
          `${Math.abs(total) < 0.005 ? 'the observed run rate' : `${fmt.wow(total)} against the observed run rate`} ` +
          `over the next ${horizon} days. ${composition}` +
          (widen !== null && widen >= 1.15
            ? ` The forecast range is ${widen.toFixed(1)}× wider by day ${horizon} than on day one, so plan the later part of the horizon with more slack.`
            : ' The forecast range holds roughly steady across the horizon.');
      }
      setAiBrief(brief);
    } catch (e) {
      console.error('[Forecasting] Failed to load projection', e);
      setResult(null);
      setDemandSeries(null);
    }
    setLoading(false);
  }, [postProjection, metric, apiKey, role, storeName, focusCategory, horizon, promoLift]);

  useEffect(() => { runForecastSimulation(); }, [runForecastSimulation]);

  // A recommendation is measured, not declared, so it is recomputed only when asked for or when the
  // series it was measured on changes.
  useEffect(() => { setRecommendation(null); }, [metric, horizon, role, selectedStore, focusCategory]);

  const requestComparison = useCallback(async () => {
    setComparisonLoading(true);
    try {
      const res = await fetch('/api/v1/demand/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...projectionBody(metric), include_recommendation: true })
      });
      const json = await res.json();
      if (json?.status === 'success' && json.data.recommendation) setRecommendation(json.data.recommendation);
    } catch { /* the panel simply keeps offering the comparison */ }
    setComparisonLoading(false);
  }, [projectionBody, metric]);

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
        forecastSales: demandSeries.forecast.map(f => ({ date: f.date, value: f.value })),
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

  // ── Chart series ───────────────────────────────────────────────────────────
  const isMoney = metric === 'revenue';
  const axisFormat = useCallback((v: number) => (
    Math.abs(v) >= 1000 ? `${isMoney ? '£' : ''}${(v / 1000).toFixed(0)}k` : `${isMoney ? '£' : ''}${Math.round(v)}`
  ), [isMoney]);

  const chartSeries = useMemo(() => {
    if (!result) return null;
    const future = frontier?.trajectory.filter(t => t.emerging_demand_frontier !== null) ?? [];
    // The frontier is in units. Only overlay it where the display metric is the same quantity,
    // rather than drawing a units ceiling across a revenue axis.
    const layerApplies = metric === 'units' && future.length === result.forecast.length;
    return {
      history: result.history,
      forecast: result.forecast.map(f => ({
        date: f.date, value: f.value, lower: f.range_lower, upper: f.range_upper
      })),
      rangeBasis: result.forecast[0]?.range_basis ?? 'NONE',
      // Only where an assumption actually moves the line. Drawing two identical lines would be
      // clutter that says nothing.
      baseline: result.scenario.neutral ? null : result.forecast.map(f => f.baseline_value),
      emerging: layerApplies ? future.map(t => t.emerging_demand_frontier) : null,
      executable: layerApplies ? future.map(t => t.executable_demand_frontier) : null,
      simulated: layerApplies && simActive
        ? (sim.recomputed_frontier.trajectory
            .filter(t => t.simulated_demand_frontier !== null)
            .map(t => t.simulated_demand_frontier) as (number | null)[])
        : null,
      layerApplies
    };
  }, [result, frontier, metric, simActive, sim]);

  /**
   * The day the reader is inspecting, narrated in plain language from governed figures only.
   * The forecast sentence comes from the engine; the decision sentence is added here from the
   * frontier trajectory, and only where the frontier is on the same quantity as the chart.
   */
  const activeNarration = useMemo(() => {
    if (!result || !activeDate) return null;
    const observed = result.history.find(h => h.date === activeDate);
    if (observed) {
      return {
        date: activeDate,
        kind: 'observed' as const,
        headline: `${activeDate} — observed`,
        statement:
          `${isMoney ? fmt.money(observed.value) : fmt.int(observed.value)} recorded. This day has happened and is ` +
          'not a projection.',
        basis: [`Source ${result.execution.data_provenance.source}`, `Measure ${result.execution.data_provenance.measure}`]
      };
    }
    const idx = result.forecast.findIndex(f => f.date === activeDate);
    if (idx < 0) return null;
    const point = result.forecast[idx];
    const narration = result.narration[idx];
    const basis = [...(narration?.basis ?? [])];
    let decisionSentence = '';
    if (chartSeries?.layerApplies && chartSeries.emerging && chartSeries.executable) {
      const exposure = chartSeries.emerging.map((e, i) => (e ?? 0) - (chartSeries.executable![i] ?? 0));
      const worst = exposure.reduce((best, v, i) => (v > exposure[best] ? i : best), 0);
      if (exposure[idx] > 0 && worst === idx) {
        decisionSentence =
          ' This period contributes most to the current Decision Gap: expected demand and what the ' +
          'plan can serve diverge furthest here.';
        basis.push('Emerging demand frontier against the executable frontier, from the current evaluation');
      }
    }
    return {
      date: activeDate,
      kind: 'forecast' as const,
      headline: `${activeDate} — day ${point.horizon_step} of the forecast`,
      statement:
        `${isMoney ? fmt.money(point.value) : fmt.int(point.value)} expected` +
        (point.range_lower !== null && point.range_upper !== null
          ? `, in a range of ${isMoney ? fmt.money(point.range_lower) : fmt.int(point.range_lower)} to ${isMoney ? fmt.money(point.range_upper) : fmt.int(point.range_upper)}`
          : '') +
        `. ${narration?.statement ?? ''}${decisionSentence}`,
      basis
    };
  }, [result, activeDate, isMoney, chartSeries]);

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
  const calibration = result?.execution.calibration ?? null;
  const rangeCalibrated = calibration?.reliable === true;

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

      {/* ── A refused forecast is a first-class result, never an empty chart ── */}
      {refusal && (
        <div style={{
          ...card, borderColor: '#FDE68A', background: '#FFFBEB',
          padding: '14px 18px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <AlertTriangle size={16} color="#B45309" style={{ marginTop: 1, flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#92400E' }}>
              No forecast was produced — {refusal.reason.replace(/_/g, ' ').toLowerCase()}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#92400E', marginTop: 2, lineHeight: 1.5 }}>
              {refusal.statement}
            </div>
            {(refusal.qualification?.remediation ?? []).length > 0 && (
              <ul style={{ fontSize: '0.75rem', color: '#92400E', margin: '6px 0 0', paddingLeft: 18, lineHeight: 1.5 }}>
                {refusal.qualification!.remediation.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* ── Intelligence unavailable ── */}
      {intelligenceUnavailable && !refusal && (
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
                        {result && (
                          <div style={{ marginTop: 6 }}>
                            Demand projection via <code>POST /api/v1/demand/forecast</code> ·{' '}
                            {result.execution.model_display_name} · execution <code>{result.execution.execution_id}</code>
                          </div>
                        )}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.1fr) minmax(260px, 1fr)', gap: 16, marginBottom: 16 }}
        className="ddf-main-grid">
        <div style={{ ...card, padding: '16px 18px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: C.ink }}>
                What we expect demand to do
              </div>
              <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 2 }}>
                Observed history, then {horizon} forecast days.{' '}
                {rangeCalibrated
                  ? 'The shaded band is the calibrated forecast range.'
                  : 'The shaded band is the model-implied forecast range.'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {simActive && (
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#047857', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 8px', borderRadius: 12 }}>
                  Simulation active
                </span>
              )}
              {chartSeries?.layerApplies && (
                <button
                  onClick={() => setShowDecisionLayer(v => !v)}
                  aria-pressed={showDecisionLayer}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                    border: `1px solid ${showDecisionLayer ? C.demand : C.line}`,
                    background: showDecisionLayer ? '#E0F2FE' : C.surface,
                    color: showDecisionLayer ? '#075985' : C.muted,
                    fontSize: '0.6875rem', fontWeight: 600
                  }}
                >
                  <Layers size={12} /> Decision layer
                </button>
              )}
            </div>
          </div>

          <div style={{ position: 'relative', marginTop: 8 }}>
            {loading && (
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.82)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, zIndex: 10
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={22} className="spinner" style={{ color: C.demand }} />
                  <span style={{ fontSize: '0.8125rem', color: C.body, fontWeight: 600 }}>Fitting the model…</span>
                </div>
              </div>
            )}
            {chartSeries ? (
              <DemandForecastChart
                history={chartSeries.history}
                forecast={chartSeries.forecast}
                baseline={chartSeries.baseline}
                rangeBasis={chartSeries.rangeBasis}
                emerging={showDecisionLayer ? chartSeries.emerging : null}
                executable={showDecisionLayer ? chartSeries.executable : null}
                simulated={showDecisionLayer ? chartSeries.simulated : null}
                showDecisionLayer={showDecisionLayer && chartSeries.layerApplies}
                format={axisFormat}
                decisionWindowDate={window_ && !window_.is_indeterminate ? window_.deadline_iso : null}
                activeDate={activeDate}
                onActiveDate={setActiveDate}
              />
            ) : !loading && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 220, color: C.muted, fontSize: '0.8125rem' }}>
                No projection available for the current scope.
              </div>
            )}
          </div>

          {/* Legend, in the order a reader meets the marks */}
          {chartSeries && (
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.6875rem', color: C.muted, marginTop: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={C.neutral} strokeWidth="2.2" /></svg>
                Observed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={C.demand} strokeWidth="2.4" strokeDasharray="5 4" /></svg>
                Forecast
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <svg width="20" height="8"><rect width="20" height="8" fill={C.demand} fillOpacity="0.13" /></svg>
                Forecast range
              </span>
              {chartSeries.baseline && (
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={C.muted} strokeWidth="1.4" strokeDasharray="2 4" /></svg>
                  Model’s own expectation (before assumptions)
                </span>
              )}
              {showDecisionLayer && chartSeries.layerApplies && (
                <>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={C.demand} strokeWidth="1.4" strokeOpacity="0.55" /></svg>
                    Emerging demand
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <svg width="20" height="6"><line x1="0" y1="3" x2="20" y2="3" stroke={C.capacity} strokeWidth="2" strokeDasharray="6 3" /></svg>
                    What we can serve
                  </span>
                </>
              )}
            </div>
          )}

          {/* The Decision Gap is a demand quantity. Rather than silently dropping the layer on a
              money or waste axis — or converting a units ceiling by an average price, which would
              manufacture a number the frontier never published — the surface says why it is absent. */}
          {chartSeries && !chartSeries.layerApplies && evaluation && (
            <div style={{ fontSize: '0.6875rem', color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              The Decision Gap is measured in demand units, so it is not drawn on this axis.{' '}
              <button
                onClick={() => setMetric('units')}
                style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  color: C.demand, fontWeight: 600, fontSize: '0.6875rem', textDecoration: 'underline'
                }}
              >
                Switch the summary metric to units demanded
              </button>{' '}
              to see what we can serve against what is expected.
            </div>
          )}

          {/* Narration for the day under the pointer */}
          <div style={{
            marginTop: 10, padding: '10px 12px', borderRadius: 8,
            background: C.sunken, border: `1px solid ${C.line}`, minHeight: 62
          }}>
            {activeNarration ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: C.ink }}>{activeNarration.headline}</span>
                  {provenanceChip(activeNarration.kind === 'observed' ? 'observed' : 'not yet happened',
                    activeNarration.kind === 'observed' ? 'neutral' : 'warn')}
                </div>
                <div style={{ fontSize: '0.75rem', color: C.body, marginTop: 3, lineHeight: 1.5 }}>
                  {activeNarration.statement}
                </div>
                <div style={{ fontSize: '0.625rem', color: C.faint, marginTop: 5, lineHeight: 1.5 }}>
                  {activeNarration.basis.join(' · ')}
                </div>
              </>
            ) : (
              <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.5 }}>
                Hover or select a day to read what CogniX expects there, and on what evidence.
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
              <label style={{ ...eyebrow, display: 'block', marginBottom: 6 }}>Horizon</label>
              <select className="select w-full" value={horizon}
                onChange={e => handleHorizonChange(Number(e.target.value) as any)}
                style={{ height: 36, fontSize: '0.8125rem' }}>
                <option value="7">7 days</option>
                <option value="14">14 days</option>
                <option value="30">30 days</option>
              </select>
            </div>

            <div style={{ paddingTop: 4, borderTop: `1px solid ${C.hairline}` }}>
              <div style={{ ...eyebrow, marginTop: 10, marginBottom: 4 }}>Commercial assumptions</div>
              <div style={{ fontSize: '0.6875rem', color: C.faint, lineHeight: 1.5, marginBottom: 12 }}>
                Applied after the model, not estimated by it. The model’s own expectation stays visible in
                the evidence panel.
              </div>

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

      {/* ── Projection summary ── */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 20 }}>
          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={eyebrow}>Projected total ({horizon} days)</div>
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: '-0.02em' }}>
              {isMoney ? fmt.money(result.kpi.projected_total) : fmt.int(result.kpi.projected_total)}
            </div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
              {result.kpi.projected_total_lower !== null && result.kpi.projected_total_upper !== null
                ? `Range ${isMoney ? fmt.money(result.kpi.projected_total_lower) : fmt.int(result.kpi.projected_total_lower)} to ${isMoney ? fmt.money(result.kpi.projected_total_upper) : fmt.int(result.kpi.projected_total_upper)}`
                : 'No range is published for this projection'}
            </div>
          </div>

          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={eyebrow}>Against the observed run rate</div>
            <div style={{
              fontSize: '1.625rem', fontWeight: 800, marginTop: 4, letterSpacing: '-0.02em',
              color: result.kpi.expected_change_pct >= 0 ? C.good : C.risk
            }}>{fmt.wow(result.kpi.expected_change_pct)}</div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
              Expected daily average against the last {result.kpi.observed_days_compared} observed days
              {Math.abs(result.kpi.expected_change_pct - result.kpi.baseline_change_pct) > 0.001 && (
                <> · {fmt.wow(result.kpi.baseline_change_pct)} before commercial assumptions</>
              )}
            </div>
          </div>

          <div style={{ ...card, padding: '16px 20px' }}>
            <div style={eyebrow}>Forecast range at day {horizon}</div>
            <div style={{ fontSize: '1.625rem', fontWeight: 800, color: C.ink, marginTop: 4, letterSpacing: '-0.02em' }}>
              {result.kpi.range_width_pct_at_horizon !== null ? `±${(result.kpi.range_width_pct_at_horizon / 2).toFixed(1)}%` : '—'}
            </div>
            <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
              {rangeCalibrated && calibration!.held_out_coverage !== null
                ? `Calibrated against held-out history — it covered ${(calibration!.held_out_coverage * 100).toFixed(0)}% of it`
                : 'Model-implied, not calibrated against realised errors'}
            </div>
          </div>
        </div>
      )}

      {/* ── Model, range and the evidence behind both ── */}
      {result && models.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <ForecastModelPanel
            execution={result.execution}
            models={models}
            selectedModelId={modelId}
            onSelectModel={setModelId}
            recommendation={recommendation}
            onRequestComparison={requestComparison}
            comparisonLoading={comparisonLoading}
          />
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
            ...(result ? [`Demand forecast produced by ${result.execution.model_display_name} (${result.execution.implementation_ref}).`] : []),
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
