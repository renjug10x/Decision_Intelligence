'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, Sparkles, Lock, Loader2, CheckCircle2,
  AlertTriangle, Play, ChevronRight, Info, Calendar,
  DollarSign, Percent, BarChart3, AlertCircle, ShieldAlert,
  Lightbulb, RefreshCw
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ExecutionBriefing from '@/components/ExecutionBriefing';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Tooltip, Legend, Filler
} from 'chart.js';

import productsData from '@/data/products.json';
import storesData from '@/data/stores.json';
import { fetchWorldScenario } from '@/lib/world-client';

import { useDecisionState } from '@/context/DecisionStateContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v*100).toFixed(1)}%`,
  wow:      (v: number) => `${v >= 0 ? '+' : ''}${(v*100).toFixed(1)}%`,
  int:      (v: number) => Math.round(v).toLocaleString(),
};

interface ForecastResult {
  history: { date: string; value: number }[];
  forecast: { date: string; value: number }[];
  kpi: {
    projectedValue: number;
    growthRate: number;
    riskLevel: 'low' | 'medium' | 'high';
  };
}

interface ForecastingProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

export default function Forecasting({ onNavigateToExperiment }: ForecastingProps = {}) {
  const { role, apiKey, selectedStore, setSelectedStore } = useApp();
  const { decisionState, executeCommand } = useDecisionState();

  // ── Governance Scoping ─────────────────────────────────────────────────────
  const [storeName, setStoreName] = useState('Manchester Piccadilly');
  const [focusCategory, setFocusCategory] = useState('Chilled');

  useEffect(() => {
    if (role === 'store_manager') {
      const matchedStore = (storesData as any[]).find(s => s.store_id === selectedStore);
      if (matchedStore) {
        setStoreName(matchedStore.name);
      }
    }
  }, [role, selectedStore]);

  // ── Enterprise World Scenario Binding ──────────────────────────────────────
  const [worldScenario, setWorldScenario] = useState<any>(null);
  const [worldError, setWorldError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorldScenario('promotion_surge')
      .then((scenarios) => {
        if (scenarios && scenarios.length > 0) {
          setWorldScenario(scenarios[0]);
        }
      })
      .catch((err) => {
        console.warn('[Forecasting] Could not fetch Enterprise World scenario:', err.message);
        setWorldError(err.message);
      });
  }, []);

  // ── State Variables ────────────────────────────────────────────────────────
  const [metric, setMetric] = useState<'revenue' | 'units' | 'waste'>('revenue');
  const [horizon, setHorizon] = useState<7 | 14 | 30>((decisionState?.scenario_parameters.forecast_horizon_days as any) || 14);
  const [model, setModel] = useState<'arima' | 'prophet' | 'genai'>('genai');
  const [showBriefing, setShowBriefing] = useState(false);
  
  // Scenarios Sandbox adjusters synced with Shared Decision State
  const [promoLift, setPromoLift] = useState(decisionState?.scenario_parameters.promotion_lift || 20);
  const [cannibalization, setCannibalization] = useState(decisionState?.scenario_parameters.cannibalisation_factor || 0);
  const [eventBoost, setEventBoost] = useState(decisionState?.scenario_parameters.event_boost || 'none');

  useEffect(() => {
    if (decisionState?.scenario_parameters) {
      setPromoLift(decisionState.scenario_parameters.promotion_lift);
      setHorizon((decisionState.scenario_parameters.forecast_horizon_days as any) || 14);
      setCannibalization(decisionState.scenario_parameters.cannibalisation_factor || 0);
      setEventBoost(decisionState.scenario_parameters.event_boost || 'none');
    }
  }, [decisionState?.scenario_parameters]);

  const handlePromoLiftChange = (val: number) => {
    setPromoLift(val);
    executeCommand('SET_PROMOTION_LIFT', { promotion_lift: val }, 'Forecasting.tsx');
  };

  const handleHorizonChange = (val: 7 | 14 | 30) => {
    setHorizon(val);
    executeCommand('SET_FORECAST_HORIZON', { forecast_horizon_days: val }, 'Forecasting.tsx');
  };

  // Execution states
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastResult | null>(null);
  const [aiBrief, setAiBrief] = useState('');

  // Buffer Optimization execution state
  const [optimizingBuffer, setOptimizingBuffer] = useState<string | null>(null);
  const [optimizedBuffers, setOptimizedBuffers] = useState<Record<string, boolean>>({});

  // ── Fetch Forecast Projections ─────────────────────────────────────────────
  const runForecastSimulation = useCallback(async (isBufferOptimization = false, bufferId?: string) => {
    setLoading(true);
    
    // Scopes according to Role-based constraints
    const query = new URLSearchParams();
    query.set('type', 'forecast');
    query.set('metric', metric);
    query.set('horizon', String(horizon));
    query.set('model', model);
    
    // Apply promo lift and event parameters
    // If optimized buffer is run, override parameters to show safe stock/improved outlook
    let activePromoLift = promoLift;
    let activeEventBoost = eventBoost;
    
    if (isBufferOptimization && bufferId) {
      if (bufferId === 'R001') {
        // Optimize logistics to offset heatwave waste
        activeEventBoost = 'none'; // Mitigate heatwave effect on waste
      } else if (bufferId === 'R002') {
        // Stock buffer to support promo demand
        activePromoLift = Math.max(0, promoLift - 10); // Smooth demand peak
      }
    }

    query.set('promoLift', String(activePromoLift));
    query.set('cannibalization', String(cannibalization));
    query.set('eventBoost', activeEventBoost);

    if (role === 'store_manager') {
      query.set('role', 'store_manager');
      query.set('store', selectedStore);
    } else if (role === 'category_manager') {
      query.set('role', 'category_manager');
      query.set('category', focusCategory);
    }

    try {
      const res = await fetch(`/api/data?${query.toString()}`);
      const data: ForecastResult = await res.json();
      setResult(data);

      // Generate narrative (Hybrid AI)
      let brief = '';
      if (apiKey) {
        try {
          const aiRes = await fetch('/api/ask', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: `Analyze this demand forecast projection: Scope: ${role === 'exec' ? 'National' : role === 'store_manager' ? storeName : focusCategory}, Metric: ${metric}, Horizon: ${horizon} days, Model: ${model.toUpperCase()}, Projected Total: ${data.kpi.projectedValue}, Growth Rate: ${(data.kpi.growthRate*100).toFixed(1)}%, Risk Level: ${data.kpi.riskLevel.toUpperCase()}. Explain the seasonal trend, potential OOS or waste risks, and operational feasibility in 2 sentences.`,
              role: 'exec',
              apiKey,
            }),
          });
          const r = await aiRes.json();
          brief = r.answer;
        } catch {}
      }

      if (!brief) {
        // Deterministic highly-accurate fallback briefings
        const scopeStr = role === 'exec' ? 'National' : role === 'store_manager' ? storeName : `${focusCategory} category`;
        const metricStr = metric === 'revenue' ? 'Revenue' : metric === 'units' ? 'Units sold' : 'Waste units';
        const modelName = model === 'genai' ? 'GenAI Demand Predictor' : model === 'prophet' ? 'Prophet Seasonality Model' : 'ARIMA Baseline';

        if (metric === 'waste') {
          if (data.kpi.growthRate > 0.05) {
            brief = `${modelName} projects ${scopeStr} ${metricStr} to rise by ${fmt.wow(data.kpi.growthRate)} over the next ${horizon} days. Spoilage risk is flagged as ${data.kpi.riskLevel.toUpperCase()} due to event-driven markdown lag; recommend adjusting regional automatic discount rates.`;
          } else {
            brief = `Waste forecasts remain stable across ${scopeStr} (+${(data.kpi.growthRate * 100).toFixed(1)}% variance). Store markdown rotations are performing as planned with minimal logistics disruptions expected.`;
          }
        } else {
          if (data.kpi.growthRate > 0.15) {
            brief = `A significant demand expansion (+${(data.kpi.growthRate * 100).toFixed(1)}% in ${metricStr}) is forecast for ${scopeStr} driven by ${eventBoost !== 'none' ? eventBoost : 'promotional lift'}. Stockout risk is ${data.kpi.riskLevel.toUpperCase()} across 8 key lines; establish a 15% safety stock buffer at logistics hubs immediately.`;
          } else {
            brief = `${modelName} projects stable ${metricStr} patterns (+${(data.kpi.growthRate * 100).toFixed(1)}%) for the next ${horizon} days. Existing distribution buffers are sufficient to satisfy forecasted consumption rates.`;
          }
        }
      }
      setAiBrief(brief);
    } catch (e) {
      console.error("Failed to load forecast", e);
    }
    setLoading(false);
  }, [role, selectedStore, focusCategory, metric, horizon, model, promoLift, cannibalization, eventBoost, apiKey, storeName]);

  // Trigger forecast on parameters change
  useEffect(() => {
    runForecastSimulation();
  }, [metric, horizon, model, promoLift, cannibalization, eventBoost, runForecastSimulation]);

  // ── Buffer Optimization Trigger ───────────────────────────────────────────
  const executeBufferOptimization = async (id: string) => {
    setOptimizingBuffer(id);
    // Simulate Looker write-back execution delay
    await new Promise(resolve => setTimeout(resolve, 1400));
    setOptimizedBuffers(prev => ({ ...prev, [id]: true }));
    // Re-run simulation with mitigated variables
    await runForecastSimulation(true, id);
    setOptimizingBuffer(null);
  };

  // ── Chart Assembly ─────────────────────────────────────────────────────────
  const getChartData = () => {
    if (!result) return null;

    const histLabels = result.history.map(h => h.date.slice(5));
    const foreLabels = result.forecast.map(f => f.date.slice(5));
    const allLabels = [...histLabels, ...foreLabels];

    const lastHistValue = result.history[result.history.length - 1]?.value || 0;

    // History dataset (ends at index 13, padded with nulls)
    const historySeries = [...result.history.map(h => h.value)];
    const padNulls = Array(result.forecast.length).fill(null);
    const historyDataset = [...historySeries, ...padNulls];

    // Forecast dataset (starts at index 13, padded with nulls before)
    const startNulls = Array(result.history.length - 1).fill(null);
    const forecastDataset = [...startNulls, lastHistValue, ...result.forecast.map(f => f.value)];

    return {
      labels: allLabels,
      datasets: [
        {
          label: 'Historical Actual',
          data: historyDataset,
          borderColor: '#4A5A7A',
          backgroundColor: 'rgba(74, 90, 122, 0.05)',
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          borderWidth: 2,
        },
        {
          label: 'Projected Forecast',
          data: forecastDataset,
          borderColor: '#0078FF',
          backgroundColor: 'rgba(0, 120, 255, 0.06)',
          fill: true,
          tension: 0.4,
          borderDash: [5, 5],
          pointRadius: 2,
          borderWidth: 2,
        }
      ]
    };
  };

  // ── Scoped Opportunity Warnings ────────────────────────────────────────────
  const FORECAST_RISKS = [
    {
      id: 'R001',
      title: 'High Spoilage Forecast',
      scope: 'North West',
      category: 'Chilled',
      metric: 'waste',
      triggerCondition: () => eventBoost === 'heatwave' && metric === 'waste',
      reason: 'Predicted heatwave triggers a +24% spoilage spike on dairy & chilled lines. Waste levels are forecast to exceed safety thresholds in 5 North West stores.',
      actionLabel: 'Deploy Spoilage Markdown Buffer',
      mitigatedMessage: 'Automatic markdown threshold increased to 30% for short shelf-life items. Waste projection minimized.'
    },
    {
      id: 'R002',
      title: 'Stockout Risk Alert',
      scope: 'London',
      category: 'Produce',
      metric: 'units',
      triggerCondition: () => promoLift >= 25 && metric === 'units',
      reason: 'High promotional lift simulation exceeds existing London warehouse stock buffers. Estimated stockout probability is 42% on key SKUs.',
      actionLabel: 'Optimize Regional Safety Stock',
      mitigatedMessage: 'Safety stock buffers increased by 15% at London distribution hub. Stockout risk mitigated.'
    },
    {
      id: 'R003',
      title: 'Category Margin Leakage',
      scope: 'All',
      category: 'Dairy',
      metric: 'revenue',
      triggerCondition: () => cannibalization >= 10,
      reason: 'Cannibalization index exceeding 10% is forecast to compress adjacent product margins by £4.5K. Recommend adjusting cross-promotions.',
      actionLabel: 'Rebalance Category Pricing',
      mitigatedMessage: 'Category cross-promotions rebalanced. Projected margin leakage stabilized.'
    }
  ];

  const activeRisks = FORECAST_RISKS.filter(risk => {
    // Role filtering scopes
    if (role === 'category_manager' && risk.category !== focusCategory) return false;
    if (role === 'store_manager' && risk.scope !== 'All' && risk.scope !== 'North West') return false; // Manchester Picadilly S001 is North West
    return risk.triggerCondition();
  });

  const isRoleLocked = (type: 'store' | 'category', value: string) => {
    if (role === 'store_manager' && type === 'store' && value !== selectedStore) return true;
    if (role === 'category_manager' && type === 'category' && value !== focusCategory) return true;
    return false;
  };

  const handleRoleLockAlert = (type: string, label: string) => {
    alert(`Access Restricted: Looker row-level access filters (restricted_to: own_${type}) restrict your account from viewing forecasts outside your scope.`);
  };

  const chartObj = getChartData();

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 48 }}>

      {/* Five-Second Proposition Header Banner */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '20px',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Demand & Forecast Intelligence
            </h1>
          </div>

          {onNavigateToExperiment && (
            <button
              onClick={() => onNavigateToExperiment('EXP-RIPPLE-02')}
              style={{
                padding: '5px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--g10x-orange)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              Explore Decision Ripple <ChevronRight size={14} />
            </button>
          )}
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          background: 'var(--bg-base)',
          padding: '14px 18px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border)'
        }}>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Forecast Confidence
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)' }}>
              91% Model Accuracy
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Fresh Demand Trajectory
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--g10x-blue)' }}>
              +13% Accelerating
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Multi-Horizon Window
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              14 to 90 Days
            </div>
          </div>
        </div>

        {/* Scoped RLS Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {role === 'category_manager' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Focus Category:</span>
              <select 
                className="select" 
                value={focusCategory} 
                onChange={e => setFocusCategory(e.target.value)}
                style={{ width: 140, height: 36 }}
              >
                {['Chilled','Dairy','Produce','Bakery','Frozen','Ambient','BWS','Non-food'].map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          )}

          {role === 'store_manager' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>My Store:</span>
              <select 
                className="select" 
                value={selectedStore} 
                onChange={e => setSelectedStore(e.target.value)}
                style={{ width: 180, height: 36 }}
              >
                {storesData.map(s => (
                  <option key={s.store_id} value={s.store_id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Calendar size={11} strokeWidth={2} color="currentColor" />
            ML Forecast Active
          </span>
        </div>
      </div>

      {/* RLS Scope Indicators for Non-Exec Roles */}
      {role !== 'exec' && (
        <div className="card mb-6" style={{ borderColor: 'rgba(0, 120, 255, 0.25)', background: 'var(--accent-light)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Info size={16} strokeWidth={1.75} color="var(--accent)" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
              <strong>Looker RLS Governance Policy Applied:</strong> Forecast metrics, actuals, and AI briefings are automatically restricted to your authorized scope ({role === 'store_manager' ? `Piccadilly Store` : `${focusCategory} Category`}). Cross-scope views are locked.
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Adjuster Sandbox (Left) & Chart Visualizer (Right) */}
      <div className="grid-2-1 mb-6">
        
        {/* Adjusters Sandbox (Simulator Form) */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RefreshCw size={15} strokeWidth={1.75} color="#0078FF" style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
              Scenario Control Sandbox
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            
            {/* Metric & Horizon & Model selection */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  FORECAST METRIC
                </label>
                <select 
                  className="select w-full" 
                  value={metric} 
                  onChange={e => setMetric(e.target.value as any)}
                  style={{ height: 38, fontSize: '0.875rem' }}
                >
                  <option value="revenue">Gross Revenue (£)</option>
                  <option value="units">Units Demanded (Qty)</option>
                  <option value="waste">Expected Waste (Qty)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  PREDICTIVE MODEL
                </label>
                <select 
                  className="select w-full" 
                  value={model} 
                  onChange={e => setModel(e.target.value as any)}
                  style={{ height: 38, fontSize: '0.875rem' }}
                >
                  <option value="genai">GenAI Demand Predictor (Adaptive)</option>
                  <option value="prophet">Prophet Seasonality (ML)</option>
                  <option value="arima">ARIMA Baseline (Statistical)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  FORECAST HORIZON
                </label>
                <select 
                  className="select w-full" 
                  value={horizon} 
                  onChange={e => setHorizon(Number(e.target.value) as any)}
                  style={{ height: 38, fontSize: '0.875rem' }}
                >
                  <option value="7">7 Days Out</option>
                  <option value="14">14 Days Out</option>
                  <option value="30">30 Days Out</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                  EVENT / HOLIDAY BOOST
                </label>
                <select 
                  className="select w-full" 
                  value={eventBoost} 
                  onChange={e => setEventBoost(e.target.value)}
                  style={{ height: 38, fontSize: '0.875rem' }}
                >
                  <option value="none">No Events Expected</option>
                  <option value="heatwave">Heatwave / Summer Spike (+25%)</option>
                  <option value="holiday">Bank Holiday Weekend (+15%)</option>
                  <option value="christmas">Christmas Holiday Spike (+35%)</option>
                </select>
              </div>
            </div>

            <div className="divider" style={{ margin: '4px 0' }} />

            {/* Sliders */}
            <div>
              <div className="flex justify-between" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  PROMOTION LIFT FACTOR
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: 700 }}>+{promoLift}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="5"
                value={promoLift}
                onChange={e => handlePromoLiftChange(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Simulate sales volume expansion due to marketing campaign depths</span>
            </div>

            <div>
              <div className="flex justify-between" style={{ marginBottom: 6 }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  CANNIBALIZATION FACTOR
                </label>
                <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 700 }}>-{cannibalization}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="2"
                value={cannibalization}
                onChange={e => setCannibalization(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--warning)', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>Simulate category margin drag on adjacent items</span>
            </div>

          </div>
        </div>

        {/* Double-Series Visualizer Chart */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <span className="card-title">Governed Demand Outlook (History & Future)</span>
          </div>

          <div style={{ flex: 1, position: 'relative', minHeight: 220 }}>
            {loading && (
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(26,34,53,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 'var(--radius-lg)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                  <Loader2 size={24} strokeWidth={2} className="spinner" style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Calculating ML Projection...</span>
                </div>
              </div>
            )}

            {chartObj && (
              <Line
                data={chartObj}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: { color: '#8B9DC3', boxWidth: 12, boxHeight: 3, font: { size: 10 } }
                    },
                    tooltip: {
                      backgroundColor: '#1A2235',
                      titleColor: '#F0F4FF',
                      bodyColor: '#8B9DC3',
                      borderColor: '#2A3550',
                      borderWidth: 1,
                      callbacks: {
                        label: (ctx) => {
                          const val = ctx.raw as number;
                          if (val === null) return '';
                          const label = ctx.dataset.label || '';
                          const fmtVal = metric === 'revenue' ? fmt.currency(val) : fmt.int(val);
                          return ` ${label}: ${fmtVal}`;
                        }
                      }
                    }
                  },
                  scales: {
                    x: { 
                      grid: { color: 'rgba(255,255,255,0.03)' }, 
                      ticks: { color: '#8B9DC3', font: { size: 9 } } 
                    },
                    y: { 
                      grid: { color: 'rgba(255,255,255,0.03)' }, 
                      ticks: { 
                        color: '#8B9DC3', 
                        font: { size: 9 },
                        callback: (v: any) => metric === 'revenue' ? fmt.currency(v) : fmt.int(v)
                      } 
                    }
                  }
                }}
              />
            )}
          </div>

          <div style={{ display: 'flex', gap: 12, fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 12 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 2, background: '#4A5A7A' }} /> Historical Actuals
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 10, height: 2, background: '#0078FF', borderStyle: 'dashed', borderWidth: '1px' }} /> Projected Forecast
            </span>
          </div>
        </div>
      </div>

      {/* Enterprise Learning Pattern Card */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderLeft: '4px solid var(--g10x-orange)',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: 24,
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', background: 'rgba(255,107,0,0.08)', padding: '2px 8px', borderRadius: 4 }}>
              Enterprise Learning Pattern Recognized
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Regional Demand Surge & Supplier Headroom (PAT-OPP-02)
            </span>
          </div>

          <button
            onClick={() => setShowBriefing(true)}
            style={{
              padding: '4px 10px',
              borderRadius: 'var(--radius-sm)',
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              color: 'var(--g10x-orange)',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Generate Execution Briefing <ChevronRight size={13} />
          </button>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 10 }}>
          Concurrent demand acceleration (+18%) with Muller Dairy supply headroom (+25%) and Trafford DC inventory surplus produces average +6.8% margin lift.
        </p>

        <div style={{ display: 'flex', gap: 16, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>Situation Similarity: <strong style={{ color: 'var(--text-primary)' }}>89%</strong></span>
          <span>Pattern Confidence: <strong style={{ color: 'var(--text-primary)' }}>84%</strong></span>
          <span>Intervention Success Rate: <strong style={{ color: 'var(--success)' }}>86% (7 occurrences)</strong></span>
        </div>
      </div>

      <ExecutionBriefing
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        briefing={{
          title: 'Demand Planning Execution Briefing — Dairy & Chilled',
          situation: 'Dairy demand trajectory is accelerating +18% into week 24 while Muller Dairy capacity headroom remains unutilized (+25%).',
          whyNow: 'Trafford DC holds 1,400 surplus units approaching optimal shelf-life window.',
          recommendedAction: 'Deploy 15% regional promotional feature across 12 North West stores supported by Muller Dairy headroom.',
          owner: 'Demand Planning & Commercial Lead',
          dependencies: ['Muller Dairy Promotional Rebate', 'Trafford DC Allocation Schedule'],
          timeHorizon: 'Next 7 Days',
          expectedOutcome: '+£24,500 incremental revenue with +6.8% margin contribution.',
          confidence: 86,
          patternId: 'PAT-OPP-02',
          contractStatus: 'VERIFIED',
          evidence: [
            'GenAI forecast ensemble accuracy 91% over 14-day horizon',
            'Supplier capacity headroom confirmed via live API feed',
            '7 historical occurrences evaluated; 86% achieved expected margin lift'
          ]
        }}
      />

      {/* Projections KPI Summary Cards */}
      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 24 }}>
          
          <div className="card" style={{ padding: '16px 20px', background: 'var(--gradient-card)', border: '1px solid var(--border-strong)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Projected Total ({horizon} Days)
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, letterSpacing: '-0.02em' }}>
              {metric === 'revenue' ? fmt.currency(result.kpi.projectedValue) : fmt.int(result.kpi.projectedValue)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Sum of values in forecast horizon
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--gradient-card)', border: '1px solid var(--border-strong)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Period Growth Rate
            </div>
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              color: result.kpi.growthRate >= 0 ? 'var(--success)' : 'var(--danger)', 
              marginTop: 6,
              letterSpacing: '-0.02em',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}>
              {fmt.wow(result.kpi.growthRate)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Projected avg vs historical avg (14d)
            </div>
          </div>

          <div className="card" style={{ padding: '16px 20px', background: 'var(--gradient-card)', border: '1px solid var(--border-strong)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Forecast Risk Index
            </div>
            <div style={{ 
              fontSize: '1.75rem', 
              fontWeight: 800, 
              color: result.kpi.riskLevel === 'high' ? 'var(--danger)' : result.kpi.riskLevel === 'medium' ? 'var(--warning)' : 'var(--success)', 
              marginTop: 6,
              letterSpacing: '-0.02em',
              textTransform: 'uppercase'
            }}>
              {result.kpi.riskLevel}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
              Based on variance and volume limits
            </div>
          </div>

        </div>
      )}

      {/* AI Briefing & Risks Section */}
      <div className="grid-2-1 mb-6">
        
        {/* AI Briefing Card */}
        {result && (
          <div className="card" style={{ borderColor: 'var(--border-accent)' }}>
            <div className="card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ai-orb">
                  <Sparkles size={13} strokeWidth={1.75} color="white" />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>AI Forecast Diagnostics</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Gemini Predictor · Horizon: {horizon}d · Target: {role === 'exec' ? 'National' : storeName}
                  </div>
                </div>
              </div>
              <span className="badge badge-accent">Governed</span>
            </div>

            <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>
              {aiBrief}
            </p>
          </div>
        )}

        {/* Forecast Proactive Warnings (Buffer Optimizers) */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={15} strokeWidth={1.75} color="var(--danger)" />
              Proactive Forecast Risks
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {activeRisks.length === 0 ? (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '16px', background: 'var(--success-light)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
                <CheckCircle2 size={16} strokeWidth={2} color="#10B981" />
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  No high-risk forecast anomalies found in current scenario parameters.
                </span>
              </div>
            ) : (
              activeRisks.map(risk => {
                const isOptimized = optimizedBuffers[risk.id];
                return (
                  <div 
                    key={risk.id}
                    className="card"
                    style={{
                      padding: 14,
                      background: isOptimized ? 'var(--success-light)' : 'var(--bg-elevated)',
                      border: '1px solid',
                      borderColor: isOptimized ? 'rgba(16, 185, 129, 0.25)' : 'var(--border)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{risk.title}</span>
                      <span className={`badge ${isOptimized ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.625rem' }}>
                        {isOptimized ? 'Optimized' : 'High Risk'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
                      {isOptimized ? risk.mitigatedMessage : risk.reason}
                    </p>

                    {!isOptimized && (
                      <div className="flex justify-end">
                        <button
                          className="btn btn-primary btn-sm animate-scale"
                          onClick={() => executeBufferOptimization(risk.id)}
                          disabled={optimizingBuffer === risk.id}
                          style={{ height: 28, fontSize: '0.6875rem', gap: 4 }}
                        >
                          {optimizingBuffer === risk.id ? (
                            <>
                              <Loader2 size={10} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
                              <span>Optimizing buffer...</span>
                            </>
                          ) : (
                            <>
                              <Lightbulb size={11} strokeWidth={2} color="white" />
                              <span>{risk.actionLabel}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
