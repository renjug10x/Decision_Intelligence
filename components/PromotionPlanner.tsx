'use client';

import { useState, useEffect } from 'react';
import {
  Tag, Sparkles, Lock, Loader2, CheckCircle2,
  Play, ChevronRight, TrendingUp,
  BarChart3, AlertCircle,
  Calendar, ShieldCheck, ShieldAlert, ArrowRight,
  Info, ChevronDown, ChevronUp, Layers, Compass,
  MapPin, Check, HelpCircle
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ExecutionBriefing from '@/components/ExecutionBriefing';
import { useDecisionState } from '@/context/DecisionStateContext';
import {
  evaluateCampaignDecisionClient,
  discoverCampaignOpportunityClient,
  evaluateCampaignReadinessClient,
  projectDecisionTimelineClient
} from '@/lib/campaign-intent-client';
import { TimingMode } from '@/packages/contracts/src/campaign-intent-model';

import promotionsData from '@/data/promotions.json';
import productsData from '@/data/products.json';
import storesData from '@/data/stores.json';

const fmt = {
  currency: (v: number) => `£${Math.abs(v) >= 1000 ? (Math.abs(v) / 1000).toFixed(1) + 'K' : Math.abs(v).toFixed(0)}`,
  pct: (v: number) => `${(v * 100).toFixed(1)}%`,
  wow: (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`
};

interface Product {
  sku_id: string;
  name: string;
  category: string;
  cost_price: number;
  rrp: number;
}

interface Promotion {
  promo_id: string;
  sku_id: string;
  name: string;
  region: string;
  start_date: string;
  end_date: string;
  discount_pct: number;
  baseline_units: number;
  promo_units: number;
  uplift_pct: number;
}

interface PromotionPlannerProps {
  onNavigateToExperiment?: (experimentId: string) => void;
  onNavigateToCanvas?: () => void;
}

type CuriosityLens = 'WHY' | 'WHERE_WHEN' | 'TRAJECTORY' | 'EVIDENCE' | 'BETTER_STRATEGY';

export default function PromotionPlanner({
  onNavigateToExperiment,
  onNavigateToCanvas
}: PromotionPlannerProps = {}) {
  const { role, apiKey, selectedStore } = useApp();
  const { decisionState, executeCommand } = useDecisionState();

  // ── Governance & Row-Level Filtering Scopes ───────────────────────────────
  const [storeRegion, setStoreRegion] = useState('North West');
  const [focusCategory, setFocusCategory] = useState('Chilled');
  const [showBriefing, setShowBriefing] = useState(false);
  const [showEvidenceAudit, setShowEvidenceAudit] = useState(false);

  useEffect(() => {
    if (role === 'store_manager') {
      const matchedStore = (storesData as any[]).find(s => s.store_id === selectedStore);
      if (matchedStore) {
        setStoreRegion(matchedStore.region);
      }
    }
  }, [role, selectedStore]);

  // ── Simulator Form State ───────────────────────────────────────────────────
  const [selectedSku, setSelectedSku] = useState('P004'); // Cheddar Mature 400g
  const [promoType, setPromoType] = useState('price_cut'); // price_cut | bogof | bundle
  const [discountPct, setDiscountPct] = useState(
    decisionState?.scenario_parameters?.promotion_lift || 20
  );
  const [region, setRegion] = useState('All');
  const [duration, setDuration] = useState(14); // 7 | 14 | 30

  // ── Decision Context State (Lightweight 2nd layer) ─────────────────────────
  const [objective, setObjective] = useState('VOLUME');
  const [timingMode, setTimingMode] = useState<TimingMode>('KNOWN_DATES');
  const [marketStrategy, setMarketStrategy] = useState('ALL_STORES');

  // ── Advanced Scenario State (Progressive disclosure) ──────────────────────
  const [showAdvancedScenario, setShowAdvancedScenario] = useState(false);
  const [customerSegment, setCustomerSegment] = useState('Family Shoppers');
  const [channel, setChannel] = useState('Omnichannel');
  const [marginFloor, setMarginFloor] = useState('15');

  // Progressive Curiosity UX State
  const [exploreExpanded, setExploreExpanded] = useState(false);
  const [activeLens, setActiveLens] = useState<CuriosityLens>('WHY');

  // Sync state from shared decision context
  useEffect(() => {
    if (decisionState?.scenario_parameters?.promotion_lift !== undefined) {
      setDiscountPct(decisionState.scenario_parameters.promotion_lift);
    }
  }, [decisionState?.scenario_parameters?.promotion_lift]);

  const handleDiscountChange = (newDiscount: number) => {
    setDiscountPct(newDiscount);
    executeCommand('SET_PROMOTION_LIFT', { promotion_lift: newDiscount }, 'PromotionPlanner.tsx');
  };

  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState<any>(null);

  // ── Recommendations Feed ───────────────────────────────────────────────────
  const AI_OPPORTUNITIES = [
    {
      id: 'OP001',
      title: 'Excess Inventory Clearance',
      sku_id: 'P020',
      skuName: 'Broccoli Head',
      category: 'Produce',
      region: 'North West',
      discount: 25,
      type: 'price_cut',
      duration: 7,
      reason:
        'Produce waste spiked by 12.4% in the North West. Run a clearance cut to empty regional warehouse buffers.'
    },
    {
      id: 'OP002',
      title: 'Breakfast Attachment Drive',
      sku_id: 'P023',
      skuName: 'White Sourdough 800g',
      category: 'Bakery',
      region: 'London',
      discount: 15,
      type: 'bundle',
      duration: 14,
      reason:
        'Sourdough volumes are stable. Bundling Sourdough with Butter at a 15% package discount captures morning cross-sell margin.'
    },
    {
      id: 'OP003',
      title: 'Midweek Dinner Special',
      sku_id: 'P014',
      skuName: 'Ready Meal Lasagne 400g',
      category: 'Chilled',
      region: 'All',
      discount: 20,
      type: 'price_cut',
      duration: 14,
      reason:
        'Defend ready meals against competitor price-matching. Volume elasticity is highly positive (+38%).'
    }
  ];

  const handleApplyOpportunity = (op: any) => {
    if (role !== 'exec') return;
    setSelectedSku(op.sku_id);
    setDiscountPct(op.discount);
    setPromoType(op.type);
    setRegion(op.region);
    setDuration(op.duration);
    if (op.id === 'OP001') {
      setObjective('WASTE_MINIMISATION');
    } else if (op.id === 'OP002') {
      setObjective('BALANCED_GROWTH');
    } else if (op.id === 'OP003') {
      setObjective('MARKET_DEFENCE');
    }
  };

  const getFilteredOpportunities = () => {
    return AI_OPPORTUNITIES.filter(op => {
      if (role === 'category_manager') return op.category === focusCategory;
      if (role === 'store_manager') return op.region === 'All' || op.region === storeRegion;
      return true;
    });
  };

  // ── Simulator Core Logic (Consumes Real CDI Pipeline) ────────────────────────
  const handleRunSimulation = async () => {
    if (role !== 'exec') return;
    setSimulating(true);

    const product = (productsData as Product[]).find(p => p.sku_id === selectedSku) || {
      sku_id: selectedSku,
      name: 'Unknown SKU',
      category: 'General',
      cost_price: 1.0,
      rrp: 1.5
    };

    // Calculate commercial fundamentals
    const discountDecimal = discountPct / 100;
    const promoPrice = product.rrp * (1 - discountDecimal);
    let storesCount = 50;
    if (region !== 'All') {
      storesCount = (storesData as any[]).filter(s => s.region === region).length || 8;
    }
    const baselineDailyPerStore = 12;
    const totalBaselineUnits = baselineDailyPerStore * storesCount * duration;

    let elasticityFactor = 2.4;
    if (promoType === 'bogof') elasticityFactor = 3.6;
    if (promoType === 'bundle') elasticityFactor = 1.9;

    const upliftPct = discountDecimal * elasticityFactor;
    const predictedUnits = Math.round(totalBaselineUnits * (1 + upliftPct));
    const baselineRevenue = totalBaselineUnits * product.rrp;
    const predictedRevenue = predictedUnits * promoPrice;

    const baselineMarginPct = (product.rrp - product.cost_price) / product.rrp;
    const predictedMarginPct = (promoPrice - product.cost_price) / promoPrice;
    const marginCompressionPct = predictedMarginPct - baselineMarginPct;

    const cannibalizationRisk = Math.min(Math.round(discountDecimal * 28 * 10) / 10, 15);
    const baselineProfit = totalBaselineUnits * (product.rrp - product.cost_price);
    const promoProfit = predictedUnits * (promoPrice - product.cost_price);
    const netProfitChange = promoProfit - baselineProfit;

    // Call live CDI client endpoints
    let cdiDecision: any = null;
    let cdiReadiness: any = null;
    let cdiOpportunity: any = null;
    let cdiTimeline: any = null;

    try {
      const [evalRes, readyRes, oppRes, timeRes] = await Promise.allSettled([
        evaluateCampaignDecisionClient({ include_signals: true }),
        evaluateCampaignReadinessClient({ include_signals: true }),
        discoverCampaignOpportunityClient({}),
        projectDecisionTimelineClient({ include_signals: true })
      ]);
      if (evalRes.status === 'fulfilled') cdiDecision = evalRes.value;
      if (readyRes.status === 'fulfilled') cdiReadiness = readyRes.value;
      if (oppRes.status === 'fulfilled') cdiOpportunity = oppRes.value;
      if (timeRes.status === 'fulfilled') cdiTimeline = timeRes.value;
    } catch (e) {
      console.warn('CDI client evaluation non-fatal fallback', e);
    }

    // High-fidelity executive synthesis in retailer language
    let businessSynthesis = '';
    if (netProfitChange >= 0) {
      businessSynthesis = `Demand could rise +${Math.round(upliftPct * 100)}%, generating +${fmt.currency(netProfitChange)} net contribution while maintaining safe DC inventory buffers.`;
    } else {
      businessSynthesis = `Demand could rise +${Math.round(upliftPct * 100)}%, but this deep discount gives away ${fmt.currency(Math.abs(netProfitChange))} net margin unless backed by supplier funding.`;
    }

    // Readiness determination (Decision / Readiness State)
    const rawReadiness = cdiReadiness?.readiness?.state;
    const readinessLabel =
      rawReadiness === 'FEASIBLE' && netProfitChange >= 0
        ? 'GO'
        : rawReadiness === 'UNFEASIBLE' || netProfitChange < -5000
          ? 'ATTENTION REQUIRED'
          : 'CONDITIONAL GO';

    // Provenance — which CDI packages actually answered. Every displayed value is either read from
    // one of these results or is seeded demo evidence, and the surface must say which.
    const provenance = {
      causal: !!cdiDecision?.causal?.drivers,
      readiness: !!cdiReadiness?.readiness?.constraints,
      opportunity: !!cdiOpportunity?.windows?.[0],
      timeline: !!cdiTimeline?.trajectory
    };
    const anyLiveCdi = Object.values(provenance).some(Boolean);

    // Contextual Clue (ONE decision-relevant insight). Read from CDI-03 when it answered;
    // otherwise stated from the seeded store estate, never invented.
    const inScopeStores =
      region === 'All'
        ? (storesData as any[]).length
        : (storesData as any[]).filter(s => s.region === region).length;
    const contextualClue = cdiOpportunity?.windows?.[0]?.window_label
      ? `Strongest window identified: ${cdiOpportunity.windows[0].window_label}.`
      : `${inScopeStores} of ${(storesData as any[]).length} stores fall in scope for ${
          region === 'All' ? 'a national' : `the ${region}`
        } launch.`;

    // CDI Causal Drivers extraction
    const drivers = cdiDecision?.causal?.drivers || [
      {
        driver_name: 'Price Elasticity Response',
        contribution_pp: Math.round(upliftPct * 75 * 10) / 10,
        direction: 'POSITIVE',
        category: 'INTERNAL_INTERVENTION'
      },
      {
        driver_name: 'Media & Channel Push',
        contribution_pp: Math.round(upliftPct * 15 * 10) / 10,
        direction: 'POSITIVE',
        category: 'INTERNAL_INTERVENTION'
      },
      {
        driver_name: 'Ambient Category Momentum',
        contribution_pp: 2.1,
        direction: 'POSITIVE',
        category: 'EXTERNAL_SIGNAL'
      },
      {
        driver_name: 'Adjacent Line Cannibalisation',
        contribution_pp: -Math.round(cannibalizationRisk * 0.4 * 10) / 10,
        direction: 'NEGATIVE',
        category: 'INTERNAL_INTERVENTION'
      }
    ];

    const readinessConstraints = cdiReadiness?.readiness?.constraints || [
      {
        constraint_id: 'CST-DC-01',
        title: 'Trafford Regional DC Cover',
        status: duration > 14 ? 'WARNING' : 'PASS',
        detail: 'Stock cover currently 3.2 days (Safe floor: 3.0 days)'
      },
      {
        constraint_id: 'CST-SUP-02',
        title: 'Supplier Capacity Headroom',
        status: discountPct > 30 ? 'CRITICAL' : 'PASS',
        detail: 'Weekly replenishment capped at 48,000 units'
      },
      {
        constraint_id: 'CST-MAR-03',
        title: 'Unit Gross Margin',
        status: netProfitChange < 0 ? 'WARNING' : 'PASS',
        detail: `Unit margin compressed to ${(predictedMarginPct * 100).toFixed(1)}%`
      }
    ];

    setSimResult({
      skuName: product.name,
      skuCategory: product.category,
      baselineUnits: totalBaselineUnits,
      promoUnits: predictedUnits,
      upliftPct,
      baselineRevenue,
      promoRevenue: predictedRevenue,
      baselineMargin: baselineMarginPct,
      promoMargin: predictedMarginPct,
      marginCompression: marginCompressionPct,
      cannibalizationRisk,
      netProfitChange,
      businessSynthesis,
      readinessLabel,
      contextualClue,
      provenance,
      anyLiveCdi,
      inScopeStores,
      totalStores: (storesData as any[]).length,
      drivers,
      readinessConstraints,
      opportunityTiming: cdiOpportunity?.windows?.[0] || {
        window_label: 'Recommended Timing Window (Next Week)',
        score: 88,
        timing_fit: 'EXCELLENT'
      },
      timelineDelta: cdiTimeline?.trajectory || {
        baseline_rate: baselineDailyPerStore * storesCount,
        intervention_rate: Math.round(baselineDailyPerStore * storesCount * (1 + upliftPct)),
        delta_pp: Math.round(upliftPct * 100)
      }
    });

    setSimulating(false);
  };

  const [registeringIntent, setRegisteringIntent] = useState(false);
  const [intentRegisteredSuccess, setIntentRegisteredSuccess] = useState<string | null>(null);

  const handleRegisterCommercialIntent = async () => {
    setRegisteringIntent(true);
    setIntentRegisteredSuccess(null);

    const product = (productsData as Product[]).find(p => p.sku_id === selectedSku);
    const skuName = product ? product.name : selectedSku;
    const cat = product ? product.category : 'Fresh Dairy';

    const objectiveLabelMap: Record<string, string> = {
      VOLUME: 'Volume Surge & Market Share Growth',
      BALANCED_GROWTH: 'Balanced Revenue & Volume Growth',
      MARGIN_PROTECTION: 'Contribution & Margin Floor Defence',
      WASTE_MINIMISATION: 'Excess Stock & Perishables Clearance',
      CUSTOMER_ACQUISITION: 'Basket Penetration & Trial Drive',
      MARKET_DEFENCE: 'Competitive Price-Match Defence',
      STRATEGIC_LAUNCH: 'New Category & Range Introduction'
    };

    const intentPayload = {
      commercial_intent_id: `intent_${Math.random().toString(36).substr(2, 9)}`,
      tenant_id: 'tenant_uk_retail_01',
      session_id: 'sess_001',
      campaign_id: 'CMP-DAIRY-Q3',
      category: cat,
      sku_scope: [selectedSku],
      region: region === 'All' ? 'North West' : region,
      customer_segment: customerSegment,
      channel: channel,
      promotion_type: promoType,
      discount_depth: discountPct,
      planned_start: new Date(Date.now() + 7 * 86400000).toISOString(),
      planned_end: new Date(Date.now() + (7 + duration) * 86400000).toISOString(),
      expected_uplift: Math.round(discountPct * 1.25),
      campaign_objective: objectiveLabelMap[objective] || 'Volume Surge & Market Share Growth',
      media_support: channel === 'Digital / App Push' ? 'In-App Push & Digital Banners' : 'Digital Banner + In-App Push Notification',
      inventory_assumption: 'Trafford RDC safety stock buffer 3.2 days',
      supplier_assumption: 'FreshDirect UK capped at 48,000 units/week',
      source_system: 'cognix_promotion_planner',
      source_type: 'PROMOTION_PLANNER' as const,
      created_at: new Date().toISOString(),
      provenance: {
        generator: 'cognix_promotion_planner_ui',
        rule: 'user_registered_intent'
      },
      synthetic_demo: true,
      schema_version: '1.0'
    };

    try {
      const res = await fetch('/api/v1/commercial-intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(intentPayload)
      });
      if (res.ok) {
        setIntentRegisteredSuccess(
          `Commercial Intent for ${skuName} (${discountPct}% discount, ${duration}d) registered into active decision context.`
        );
      }
    } catch (e: any) {
      console.error('Failed to register commercial intent', e);
    } finally {
      setRegisteringIntent(false);
    }
  };

  // Governed Table Filtering
  const getFilteredPromotions = (): Promotion[] => {
    const data = promotionsData as Promotion[];
    const prodMap = Object.fromEntries((productsData as Product[]).map(p => [p.sku_id, p]));

    return data.filter(promo => {
      const prod = prodMap[promo.sku_id];
      if (!prod) return false;

      if (role === 'category_manager') {
        return prod.category === focusCategory;
      }
      if (role === 'store_manager') {
        return promo.region === 'All' || promo.region === storeRegion;
      }
      return true;
    });
  };

  const filteredPromos = getFilteredPromotions();
  const prodMap = Object.fromEntries((productsData as Product[]).map(p => [p.sku_id, p]));

  const totalHistoricalRevenue = filteredPromos.reduce((acc, p) => {
    const prod = prodMap[p.sku_id];
    const price = prod ? prod.rrp * (1 - p.discount_pct) : 0;
    return acc + p.promo_units * price;
  }, 0);

  const avgHistoricalUplift = filteredPromos.length
    ? filteredPromos.reduce((acc, p) => acc + p.uplift_pct, 0) / filteredPromos.length
    : 0;

  const isLocked = role !== 'exec';
  const currentProduct = (productsData as Product[]).find(p => p.sku_id === selectedSku);

  return (
    <div
      className="page-content animate-fade"
      style={{ maxWidth: 1160, margin: '0 auto', paddingBottom: 48 }}
    >
      {/* ── 1. Proposition Header Banner ──────────────────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '18px 20px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '1.3rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                letterSpacing: '-0.01em',
                margin: 0
              }}
            >
              Promotion Decision Intelligence
            </h1>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Evaluate demand response, economic trade-offs and operational readiness before committing stock.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {onNavigateToCanvas && (
              <button
                onClick={onNavigateToCanvas}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Layers size={13} color="var(--g10x-blue)" />
                Decision Canvas <ChevronRight size={12} />
              </button>
            )}

            {onNavigateToExperiment && (
              <button
                onClick={() => onNavigateToExperiment('EXP-COMMITMENT-01')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--g10x-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                Commitment Chain <ChevronRight size={12} />
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            background: 'var(--bg-base)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Demo Target (Assumed)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--g10x-blue)' }}>
              £1.2M Revenue Target
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Demo Demand Benchmark (Assumed)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--success)' }}>
              +22% Volume Lift
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Demo Supply SLA Limit (Assumed)
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--warning)' }}>
              +10% Max Headroom
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Enterprise Learning Pattern Recognised ──────────────────────── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderLeft: '4px solid var(--g10x-orange)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: 20,
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 4
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                fontSize: '0.6875rem',
                fontWeight: 600,
                color: 'var(--g10x-orange)',
                background: 'rgba(255,107,0,0.08)',
                padding: '2px 8px',
                borderRadius: 4
              }}
            >
              Pattern Recognised
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Promotional Capacity Mismatch (PAT-RISK-03)
            </span>
          </div>

          <button
            onClick={() => setShowBriefing(true)}
            style={{
              padding: '3px 8px',
              borderRadius: 'var(--radius-sm)',
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              color: 'var(--g10x-orange)',
              fontSize: '0.6875rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            Briefing <ChevronRight size={11} />
          </button>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '0 0 6px 0' }}>
          Deploying high-discount promotions (&gt;15%) when supplier lead-time variance exceeds 12% risks margin erosion from emergency freight penalties.
        </p>

        <div
          style={{
            display: 'flex',
            gap: 14,
            fontSize: '0.6875rem',
            color: 'var(--text-muted)'
          }}
        >
          <span>Demo Similarity: <strong style={{ color: 'var(--text-primary)' }}>91%</strong></span>
          <span>Modelled Confidence: <strong style={{ color: 'var(--text-primary)' }}>84%</strong></span>
          <span>Demo Success Rate: <strong style={{ color: 'var(--success)' }}>67% (Uncalibrated)</strong></span>
        </div>
      </div>

      <ExecutionBriefing
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        briefing={{
          title: 'Promotion Execution Briefing — Chilled Ready Meals',
          situation:
            'Greencore Ready Meals lead-time variance is currently 14.2% (exceeding 12% risk threshold). Trafford DC safety buffer is 3.2 days.',
          whyNow:
            'Proposed 20% promotion launch in 72 hours requires immediate supplier buffer alignment or discount cap adjustment.',
          recommendedAction:
            'Cap promotional discount depth at 12% or require Greencore to pre-deliver a 48h safety buffer to Trafford DC.',
          owner: 'Category Commercial Lead',
          dependencies: ['Greencore Logistics Confirmation', 'Trafford DC Order Release Schedule'],
          timeHorizon: 'Next 48 Hours',
          expectedOutcome: 'Protects £8,400 net margin and prevents emergency transport penalty charges in demonstration simulation.',
          confidence: 84,
          patternId: 'PAT-RISK-03',
          contractStatus: 'VERIFIED',
          evidence: [
            'Greencore delivery delay variance 14.2% over rolling 14 days (demo signal)',
            'Trafford DC stock cover 3.2 days (Threshold: 5 days)',
            'Demo pattern precedent PAT-RISK-03 (seeded uncalibrated telemetry)'
          ]
        }}
      />

      {/* Role Restrict Notice */}
      {isLocked && (
        <div
          className="card mb-6"
          style={{ borderColor: 'var(--danger-light)', background: 'var(--danger-light)' }}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Lock size={16} strokeWidth={1.75} color="#EF4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)' }}>
              <strong>Looker IAM Protection Active:</strong> Campaign simulation and parameter planning are restricted to Executive accounts.
            </div>
          </div>
        </div>
      )}

      {/* ── 3. Configuration & Signals Feed ───────────────────────────────── */}
      <div className="grid-2-1 mb-6" style={{ alignItems: 'stretch' }}>
        {/* Simulator Controls Card */}
        <div
          className="card"
          style={{
            opacity: isLocked ? 0.7 : 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div>
            <div className="card-header" style={{ paddingBottom: 10 }}>
              <span
                className="card-title"
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}
              >
                <Tag size={15} strokeWidth={1.75} color="#0078FF" />
                Campaign Configuration
              </span>
              {isLocked && <span className="badge badge-danger">Read-only</span>}
            </div>

            {/* Primary Controls */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  PRODUCT / SKU
                </label>
                <select
                  className="select w-full"
                  value={selectedSku}
                  onChange={e => setSelectedSku(e.target.value)}
                  disabled={isLocked}
                  style={{ height: 36, fontSize: '0.8125rem' }}
                >
                  {(productsData as Product[]).map(p => (
                    <option key={p.sku_id} value={p.sku_id}>
                      {p.name} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  MECHANIC
                </label>
                <select
                  className="select w-full"
                  value={promoType}
                  onChange={e => setPromoType(e.target.value)}
                  disabled={isLocked}
                  style={{ height: 36, fontSize: '0.8125rem' }}
                >
                  <option value="price_cut">Price Cut (Direct Discount)</option>
                  <option value="bogof">Buy One Get One Free (BOGOF)</option>
                  <option value="bundle">Category Bundle Deal</option>
                </select>
              </div>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  DISCOUNT: {discountPct}%
                </label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={discountPct}
                  onChange={e => handleDiscountChange(Number(e.target.value))}
                  disabled={isLocked}
                  style={{
                    width: '100%',
                    accentColor: 'var(--accent)',
                    cursor: isLocked ? 'not-allowed' : 'pointer',
                    marginTop: 6
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  REGION
                </label>
                <select
                  className="select w-full"
                  value={region}
                  onChange={e => setRegion(e.target.value)}
                  disabled={isLocked}
                  style={{ height: 36, fontSize: '0.8125rem' }}
                >
                  <option value="All">All Regions (National)</option>
                  <option value="North West">North West</option>
                  <option value="South East">South East</option>
                  <option value="Midlands">Midlands</option>
                  <option value="London">London</option>
                  <option value="Scotland">Scotland</option>
                  <option value="Wales">Wales</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  DURATION
                </label>
                <select
                  className="select w-full"
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  disabled={isLocked}
                  style={{ height: 36, fontSize: '0.8125rem' }}
                >
                  <option value="7">7 Days</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>
            </div>

            {/* Decision Context (Lightweight 2nd Layer) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: 10,
                marginBottom: 8,
                paddingTop: 10,
                borderTop: '1px solid var(--border)'
              }}
            >
              <span
                style={{
                  fontSize: '0.6875rem',
                  fontWeight: 700,
                  color: 'var(--text-muted)',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase'
                }}
              >
                Decision Context
              </span>
              <button
                type="button"
                onClick={() => setShowAdvancedScenario(!showAdvancedScenario)}
                disabled={isLocked}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--g10x-blue)',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 3,
                  padding: 0
                }}
              >
                <span>Advanced scenario</span>
                <ChevronRight
                  size={11}
                  style={{
                    transform: showAdvancedScenario ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.15s ease'
                  }}
                />
              </button>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 12,
                marginBottom: 12
              }}
            >
              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  OBJECTIVE
                </label>
                <select
                  className="select w-full"
                  value={objective}
                  onChange={e => setObjective(e.target.value)}
                  disabled={isLocked}
                  style={{ height: 34, fontSize: '0.75rem' }}
                >
                  <option value="VOLUME">Grow Volume</option>
                  <option value="BALANCED_GROWTH">Balanced Growth</option>
                  <option value="MARGIN_PROTECTION">Protect Contribution</option>
                  <option value="WASTE_MINIMISATION">Clear Waste</option>
                  <option value="CUSTOMER_ACQUISITION">Customer Acquisition</option>
                  <option value="MARKET_DEFENCE">Market Defence</option>
                  <option value="STRATEGIC_LAUNCH">Strategic Launch</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  TIMING
                </label>
                <select
                  className="select w-full"
                  value={timingMode}
                  onChange={e => setTimingMode(e.target.value as TimingMode)}
                  disabled={isLocked}
                  style={{ height: 34, fontSize: '0.75rem' }}
                >
                  <option value="KNOWN_DATES">Use planned timing</option>
                  <option value="FIND_BEST_WINDOW">Find best window</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    fontWeight: 600,
                    display: 'block',
                    marginBottom: 4
                  }}
                >
                  MARKET STRATEGY
                </label>
                <select
                  className="select w-full"
                  value={marketStrategy}
                  onChange={e => setMarketStrategy(e.target.value)}
                  disabled={isLocked}
                  style={{ height: 34, fontSize: '0.75rem' }}
                >
                  <option value="ALL_STORES">All eligible stores</option>
                  <option value="DISCOVER_MICRO_MARKETS">Discover micro-markets</option>
                </select>
              </div>
            </div>

            {/*
              Honest provenance. Objective is carried onto the registered Commercial Intent as
              campaign_objective. Timing and Market Strategy have no governed field on
              CommercialIntent and are not read by CDI-03 — the engine resolves timing and
              micro-market scope from the session's own CampaignIntent. Labelling them as
              planning context is the correction: inventing a backend enum to justify the
              control would make the surface claim an execution that never happens.
            */}
            <div
              style={{
                fontSize: '0.625rem',
                color: 'var(--text-muted)',
                marginTop: -4,
                marginBottom: 10
              }}
            >
              Objective is recorded on the registered intent. Timing and Market Strategy are
              planning context — they are not executed by the opportunity engine.
            </div>

            {/* Advanced Scenario Progressive Disclosure */}
            {showAdvancedScenario && (
              <div
                style={{
                  marginTop: 6,
                  marginBottom: 12,
                  padding: '10px 12px',
                  background: 'var(--bg-base)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 10,
                    marginBottom: 8
                  }}
                >
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                      AUDIENCE / SEGMENT
                    </label>
                    <select
                      className="select w-full"
                      value={customerSegment}
                      onChange={e => setCustomerSegment(e.target.value)}
                      disabled={isLocked}
                      style={{ height: 30, fontSize: '0.6875rem' }}
                    >
                      <option value="Family Shoppers">Family Shoppers</option>
                      <option value="Budget Conscious">Budget Conscious</option>
                      <option value="Premium Convenience">Premium Convenience</option>
                      <option value="All Shoppers">All Shoppers</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                      CHANNEL CONTEXT
                    </label>
                    <select
                      className="select w-full"
                      value={channel}
                      onChange={e => setChannel(e.target.value)}
                      disabled={isLocked}
                      style={{ height: 30, fontSize: '0.6875rem' }}
                    >
                      <option value="Omnichannel">Omnichannel</option>
                      <option value="In-Store Only">In-Store Only</option>
                      <option value="Digital / App Push">Digital / App Push</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.625rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 3 }}>
                      MARGIN FLOOR
                    </label>
                    <select
                      className="select w-full"
                      value={marginFloor}
                      onChange={e => setMarginFloor(e.target.value)}
                      disabled={isLocked}
                      style={{ height: 30, fontSize: '0.6875rem' }}
                    >
                      <option value="15">15% Min Gross Margin</option>
                      <option value="10">10% Min Floor</option>
                      <option value="20">20% Target Floor</option>
                      <option value="0">Unconstrained</option>
                    </select>
                  </div>
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 8,
                    fontSize: '0.625rem',
                    color: 'var(--text-muted)',
                    borderTop: '1px dashed var(--border)',
                    paddingTop: 6,
                    flexWrap: 'wrap'
                  }}
                >
                  {/*
                    Audience and Channel bind to CommercialIntent.customer_segment / .channel.
                    Margin Floor has no governed field and is not read by CDI-04 or CDI-06
                    economics, so it is grouped with the operational SLA chips as contextual
                    rather than presented as an enforced constraint.
                  */}
                  <span>Contextual: <strong style={{ color: 'var(--text-secondary)' }}>Margin Floor (not enforced by economics)</strong></span>
                  <span>·</span>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>Supplier SLA: 48k/wk</strong></span>
                  <span>·</span>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>DC Buffer: 3.2d</strong></span>
                  <span>·</span>
                  <span><strong style={{ color: 'var(--text-secondary)' }}>Perishability: 14d max</strong></span>
                </div>
              </div>
            )}
          </div>

          <div>
            {intentRegisteredSuccess && (
              <div
                style={{
                  background: 'var(--success-light)',
                  border: '1px solid var(--success)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '8px 12px',
                  marginBottom: 10,
                  fontSize: '0.75rem',
                  color: 'var(--text-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <CheckCircle2 size={14} color="var(--success)" />
                <span>{intentRegisteredSuccess}</span>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 6 }}>
              <button
                className="btn btn-primary"
                onClick={handleRunSimulation}
                disabled={isLocked || simulating}
                style={{ justifyContent: 'center', height: 38, fontSize: '0.8125rem' }}
              >
                {simulating ? (
                  <>
                    <Loader2
                      size={14}
                      strokeWidth={2}
                      style={{ animation: 'spin 0.8s linear infinite' }}
                    />
                    <span>Evaluating…</span>
                  </>
                ) : (
                  <>
                    <Play size={13} strokeWidth={2} fill="currentColor" />
                    <span>Simulate Decision</span>
                  </>
                )}
              </button>

              <button
                className="btn"
                onClick={handleRegisterCommercialIntent}
                disabled={isLocked || registeringIntent}
                style={{
                  justifyContent: 'center',
                  height: 38,
                  background: 'var(--g10x-orange)',
                  color: '#FFFFFF',
                  border: 'none',
                  fontWeight: 600,
                  fontSize: '0.8125rem'
                }}
              >
                {registeringIntent ? (
                  <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <Tag size={13} />
                )}
                <span>Register Intent</span>
              </button>
            </div>
          </div>
        </div>

        {/* Opportunity Signals Feed */}
        {/*
          Equal-height is structural, not pixel-coupled.

          The row is a `.grid-2-1` with `align-items: stretch`, so the row height is whatever
          Campaign Configuration needs — including when Advanced Scenario expands it. The catch:
          an `auto` grid row sizes to the max-content of EVERY item, so a Signals card left in
          normal flow pushes the row taller as signals accumulate (overflow:hidden does not
          exempt it). Taking the card out of flow with position:absolute inside a
          position:relative cell makes it contribute no height at all: the row is driven solely
          by Campaign Configuration, and `inset: 0` makes the card fill whatever that turns out
          to be. The inner scroller then gets a real bounded height to scroll within.

          This replaces a hard-coded maxHeight of 385/490px, which had to guess the other
          column's rendered height — and guessed low in both states (actual 408 / 520), leaving
          exactly the whitespace it was meant to remove.
        */}
        <div style={{ position: 'relative', minHeight: 0 }}>
        <div
          className="card"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            overflow: 'hidden',
            boxSizing: 'border-box'
          }}
        >
          <div className="card-header" style={{ paddingBottom: 8, flexShrink: 0 }}>
            <span
              className="card-title"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}
            >
              <Sparkles size={14} strokeWidth={1.75} color="var(--yellow)" />
              Signals Feed
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              overflowY: 'auto',
              flex: 1,
              minHeight: 0,
              paddingRight: 4,
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(0, 0, 0, 0.15) transparent'
            }}
          >
            {getFilteredOpportunities().map(op => {
              const isOpLocked = role !== 'exec';
              return (
                <div
                  key={op.id}
                  className="card"
                  style={{
                    padding: '8px 10px',
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    opacity: isOpLocked ? 0.6 : 1,
                    flexShrink: 0
                  }}
                >
                  <div
                    className="flex items-center justify-between"
                    style={{ marginBottom: 3 }}
                  >
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {op.title}
                    </span>
                    <span
                      className="badge badge-accent"
                      style={{ fontSize: '0.5625rem', padding: '1px 5px' }}
                    >
                      {op.category}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '0.6875rem',
                      color: 'var(--text-secondary)',
                      marginBottom: 6,
                      lineHeight: 1.35
                    }}
                  >
                    {op.reason}
                  </div>
                  <div className="flex items-center justify-between">
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        color: 'var(--text-muted)',
                        fontWeight: 600
                      }}
                    >
                      {op.discount}% Cut · {op.region}
                    </span>
                    {!isLocked && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleApplyOpportunity(op)}
                        style={{
                          padding: '1px 6px',
                          fontSize: '0.6875rem',
                          color: 'var(--accent)',
                          gap: 3
                        }}
                      >
                        Apply
                        <ChevronRight size={10} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* ── 4. Curiosity-Led Campaign Intelligence Preview ────────────────── */}
      <div
        className="card mb-6"
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        {/* Pre-Simulation Restrained Empty State */}
        {!simResult ? (
          <div
            style={{
              padding: '24px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Compass size={22} color="var(--g10x-blue)" style={{ opacity: 0.8 }} />
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0, maxWidth: 540 }}>
              Configure a campaign above to explore expected demand, economics, timing and execution readiness.
            </p>
          </div>
        ) : (
          /* Post-Simulation Curiosity-Led Executive Headline */
          <div>
            {/* Top Bar: Headline Outcomes & Decision State */}
            <div
              style={{
                padding: '20px 24px',
                borderBottom: exploreExpanded ? '1px solid var(--border)' : 'none',
                background: 'var(--bg-base)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16,
                  marginBottom: 14
                }}
              >
                {/* Two Primary Numeric Outcomes */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Expected Demand
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.02em' }}>
                      +{Math.round(simResult.upliftPct * 100)}% Volume
                    </div>
                  </div>

                  <div style={{ borderLeft: '1px solid var(--border)', paddingLeft: 24 }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Net Contribution Impact
                    </div>
                    <div
                      style={{
                        fontSize: '1.5rem',
                        fontWeight: 800,
                        color: simResult.netProfitChange >= 0 ? 'var(--success)' : 'var(--danger)',
                        letterSpacing: '-0.02em'
                      }}
                    >
                      {simResult.netProfitChange >= 0 ? '+' : '-'}
                      {fmt.currency(simResult.netProfitChange)}
                    </div>
                  </div>
                </div>

                {/* ONE Decision / Readiness State & Curiosity Action */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '4px 12px',
                      borderRadius: 6,
                      background:
                        simResult.readinessLabel === 'GO'
                          ? 'rgba(34, 197, 94, 0.12)'
                          : simResult.readinessLabel === 'ATTENTION REQUIRED'
                            ? 'rgba(239, 68, 68, 0.12)'
                            : 'rgba(234, 179, 8, 0.14)',
                      color:
                        simResult.readinessLabel === 'GO'
                          ? 'var(--success)'
                          : simResult.readinessLabel === 'ATTENTION REQUIRED'
                            ? 'var(--danger)'
                            : 'var(--warning)',
                      border: `1px solid ${
                        simResult.readinessLabel === 'GO'
                          ? 'rgba(34, 197, 94, 0.3)'
                          : simResult.readinessLabel === 'ATTENTION REQUIRED'
                            ? 'rgba(239, 68, 68, 0.3)'
                            : 'rgba(234, 179, 8, 0.3)'
                      }`
                    }}
                  >
                    {simResult.readinessLabel}
                  </span>

                  <button
                    onClick={() => setExploreExpanded(!exploreExpanded)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: 'var(--radius-sm)',
                      background: exploreExpanded ? 'var(--bg-elevated)' : 'var(--g10x-blue)',
                      color: exploreExpanded ? 'var(--text-primary)' : '#FFFFFF',
                      border: exploreExpanded ? '1px solid var(--border)' : 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      boxShadow: exploreExpanded ? 'none' : 'var(--shadow-sm)'
                    }}
                  >
                    <span>{exploreExpanded ? 'Close overview' : 'Explore why'}</span>
                    <ArrowRight size={13} style={{ transform: exploreExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                </div>
              </div>

              {/* ONE Short Business-Language Synthesis */}
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5, marginBottom: 8 }}>
                {simResult.businessSynthesis}
              </div>

              {/* ONE Lightweight Contextual Clue */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                <MapPin size={12} color="var(--g10x-blue)" />
                <span>{simResult.contextualClue}</span>
              </div>

              {/* Honest provenance — one muted line, never a KPI. The headline figures are a
                  planning simulation, not an adjudicated CDI outcome, and must say so. */}
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 8 }}>
                Planning simulation ·{' '}
                {simResult.anyLiveCdi
                  ? 'supporting lenses read live CDI results where available'
                  : 'supporting lenses show seeded demo evidence'}{' '}
                · no observed outcome bound
              </div>
            </div>

            {/* ── Progressive Disclosure Panel (Curiosity-Led Lenses) ────── */}
            {exploreExpanded && (
              <div style={{ padding: '18px 24px', background: '#FFFFFF' }}>
                {/* Curiosity Lens Tabs */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: 10,
                    marginBottom: 16,
                    overflowX: 'auto'
                  }}
                >
                  <button
                    onClick={() => setActiveLens('WHY')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 4,
                      background: activeLens === 'WHY' ? 'var(--bg-elevated)' : 'transparent',
                      color: activeLens === 'WHY' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
                      fontWeight: activeLens === 'WHY' ? 700 : 500,
                      fontSize: '0.75rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Why (Demand Drivers)
                  </button>

                  <button
                    onClick={() => setActiveLens('WHERE_WHEN')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 4,
                      background: activeLens === 'WHERE_WHEN' ? 'var(--bg-elevated)' : 'transparent',
                      color: activeLens === 'WHERE_WHEN' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
                      fontWeight: activeLens === 'WHERE_WHEN' ? 700 : 500,
                      fontSize: '0.75rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Where & When (Opportunity)
                  </button>

                  <button
                    onClick={() => setActiveLens('TRAJECTORY')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 4,
                      background: activeLens === 'TRAJECTORY' ? 'var(--bg-elevated)' : 'transparent',
                      color: activeLens === 'TRAJECTORY' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
                      fontWeight: activeLens === 'TRAJECTORY' ? 700 : 500,
                      fontSize: '0.75rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Trajectory (Timeline)
                  </button>

                  <button
                    onClick={() => setActiveLens('EVIDENCE')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 4,
                      background: activeLens === 'EVIDENCE' ? 'var(--bg-elevated)' : 'transparent',
                      color: activeLens === 'EVIDENCE' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
                      fontWeight: activeLens === 'EVIDENCE' ? 700 : 500,
                      fontSize: '0.75rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Evidence & Feasibility
                  </button>

                  {onNavigateToCanvas && (
                    <button
                      onClick={() => setActiveLens('BETTER_STRATEGY')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: 4,
                        background: activeLens === 'BETTER_STRATEGY' ? 'var(--bg-elevated)' : 'transparent',
                        color: activeLens === 'BETTER_STRATEGY' ? 'var(--g10x-orange)' : 'var(--text-secondary)',
                        fontWeight: activeLens === 'BETTER_STRATEGY' ? 700 : 500,
                        fontSize: '0.75rem',
                        border: 'none',
                        cursor: 'pointer',
                        marginLeft: 'auto'
                      }}
                    >
                      Better Strategy? →
                    </button>
                  )}
                </div>

                {/* Lens Content: Single Primary Visual at a Time */}

                {/* 1. WHY (Causal Attribution) */}
                {activeLens === 'WHY' && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      What drives the +{Math.round(simResult.upliftPct * 100)}% demand uplift?
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Demand attribution separates intervention effects from baseline momentum and cannibalisation across adjacent lines.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {simResult.drivers.map((d: any, i: number) => {
                        const isPositive = d.contribution_pp >= 0;
                        return (
                          <div key={i}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 2 }}>
                              <span style={{ color: 'var(--text-secondary)' }}>{d.driver_name}</span>
                              <span style={{ fontWeight: 700, color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                                {isPositive ? '+' : ''}{d.contribution_pp}pp
                              </span>
                            </div>
                            <div style={{ height: 6, background: 'var(--bg-base)', borderRadius: 3, overflow: 'hidden' }}>
                              <div
                                style={{
                                  height: '100%',
                                  width: `${Math.min(Math.abs(d.contribution_pp) * 2.5, 100)}%`,
                                  background: isPositive ? 'var(--g10x-blue)' : 'var(--warning)',
                                  borderRadius: 3
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 2. WHERE & WHEN (Opportunity & Micro-Markets) */}
                {activeLens === 'WHERE_WHEN' && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      Where and when does this campaign perform best?
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                        gap: 14
                      }}
                    >
                      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                          Optimal Timing Window
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--g10x-blue)' }}>
                          {simResult.opportunityTiming.window_label}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          Timing fit score: <strong>{simResult.opportunityTiming.score}/100</strong> (Yield potential: {simResult.opportunityTiming.timing_fit})
                        </div>
                      </div>

                      <div style={{ background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 6, padding: '12px 14px' }}>
                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>
                          Regional Micro-Markets
                        </div>
                        <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {simResult.inScopeStores} of {simResult.totalStores} stores in scope
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                          Store scope is the {region === 'All' ? 'national estate' : `${region} estate`}. Micro-market
                          ranking within scope requires CDI-03 opportunity discovery and is not asserted here.
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. TRAJECTORY (CDI-05 Flat Rate Identity) */}
                {activeLens === 'TRAJECTORY' && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                      Step Trajectory (CDI-05 Flat-Rate Identity)
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                      Clear step visualization without manufactured smoothing or fabricated post-campaign convergence.
                    </p>

                    <div
                      style={{
                        height: 120,
                        background: 'var(--bg-base)',
                        borderRadius: 6,
                        border: '1px solid var(--border)',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        <span>Baseline: {simResult.timelineDelta.baseline_rate} units/day</span>
                        <span style={{ color: 'var(--g10x-blue)', fontWeight: 600 }}>Active {duration}-Day Window</span>
                        <span>Post-Campaign Return</span>
                      </div>

                      {/* The step is drawn in a fixed 300x46 user space and scaled to the axis by
                          viewBox. Without it the path stopped at 300px of a ~780px axis, leaving the
                          window label stranded over a bare baseline. Straight segments stay straight
                          under affine scaling, so FLAT_RATE_IDENTITY is preserved exactly — no
                          spline, no smoothing, no manufactured curvature. */}
                      <svg
                        width="100%"
                        height="46"
                        viewBox="0 0 300 46"
                        preserveAspectRatio="none"
                        style={{ overflow: 'visible', display: 'block' }}
                      >
                        <line
                          x1="0"
                          y1="36"
                          x2="300"
                          y2="36"
                          stroke="#4A5A7A"
                          strokeDasharray="4,4"
                          strokeWidth="1.5"
                          vectorEffect="non-scaling-stroke"
                        />
                        <polygon points="60,36 60,10 240,10 240,36" fill="rgba(0, 120, 255, 0.12)" />
                        <path
                          d="M 0,36 L 60,36 L 60,10 L 240,10 L 240,36 L 300,36"
                          fill="none"
                          stroke="#0078FF"
                          strokeWidth="2.5"
                          strokeLinejoin="miter"
                          vectorEffect="non-scaling-stroke"
                        />
                      </svg>

                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6875rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Pre-Campaign Run-rate</span>
                        <span style={{ color: 'var(--success)', fontWeight: 700 }}>
                          Step Lift: +{simResult.timelineDelta.delta_pp}pp ({simResult.timelineDelta.intervention_rate} units/day)
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 4. EVIDENCE & FEASIBILITY */}
                {activeLens === 'EVIDENCE' && (
                  <div>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
                      Supply Chain Feasibility & Operational Constraints
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 10,
                        marginBottom: 12
                      }}
                    >
                      {simResult.readinessConstraints.map((cst: any, i: number) => (
                        <div
                          key={i}
                          style={{
                            background: 'var(--bg-base)',
                            border: '1px solid var(--border)',
                            borderRadius: 6,
                            padding: '8px 12px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {cst.title}
                            </span>
                            <span
                              style={{
                                fontSize: '0.625rem',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: 4,
                                background:
                                  cst.status === 'PASS'
                                    ? 'rgba(34, 197, 94, 0.1)'
                                    : 'rgba(234, 179, 8, 0.1)',
                                color:
                                  cst.status === 'PASS' ? 'var(--success)' : 'var(--warning)'
                              }}
                            >
                              {cst.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                            {cst.detail}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => setShowEvidenceAudit(!showEvidenceAudit)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--accent)',
                        fontSize: '0.6875rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: 0
                      }}
                    >
                      {showEvidenceAudit ? 'Hide technical provenance' : 'Show technical provenance & audit evidence →'}
                    </button>

                    {showEvidenceAudit && (
                      <div
                        style={{
                          marginTop: 10,
                          padding: '10px 14px',
                          background: 'var(--bg-base)',
                          borderRadius: 6,
                          fontSize: '0.6875rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.6
                        }}
                      >
                        <div>
                          • Causal drivers: {simResult.provenance.causal ? 'CDI-02 result' : 'seeded demo evidence'}
                          {' · '}Readiness: {simResult.provenance.readiness ? 'CDI-04 result' : 'seeded demo evidence'}
                        </div>
                        <div>
                          • Timing: {simResult.provenance.opportunity ? 'CDI-03 result' : 'seeded demo evidence'}
                          {' · '}Trajectory: {simResult.provenance.timeline ? 'CDI-05 result' : 'seeded demo evidence'}
                        </div>
                        <div>
                          • Expected demand and net contribution are produced by the seeded planning simulator on this
                          screen, not by CDI-02.
                        </div>
                        <div>
                          • Observation correspondence (CDI-08) is not evaluated here. No observed outcome has been
                          bound to a decision contract, so no prediction has been adjudicated against reality.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. BETTER STRATEGY */}
                {activeLens === 'BETTER_STRATEGY' && onNavigateToCanvas && (
                  <div
                    style={{
                      background: 'var(--accent-light)',
                      border: '1px solid rgba(0, 120, 255, 0.15)',
                      borderRadius: 6,
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>
                        Compare alternative campaign strategies
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-primary)' }}>
                        Explore the full multi-objective frontier (10%, 15%, 20% discount and non-promotional postures) on the Decision Canvas.
                      </div>
                    </div>

                    <button
                      onClick={onNavigateToCanvas}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', gap: 4, flexShrink: 0 }}
                    >
                      Open Canvas <ArrowRight size={12} />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── 5. Governed Historical Promotions Table ────────────────────────── */}
      <div className="card">
        <div
          className="card-header flex items-center justify-between"
          style={{ flexWrap: 'wrap', gap: 14 }}
        >
          <div>
            <span
              className="card-title"
              style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.875rem' }}
            >
              <BarChart3 size={15} strokeWidth={1.75} color="#0078FF" />
              Governed Campaign History
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Active and historical campaigns filtered under current IAM governance.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {role === 'category_manager' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Category:
                </span>
                <select
                  className="select"
                  value={focusCategory}
                  onChange={e => setFocusCategory(e.target.value)}
                  style={{ height: 28, padding: '2px 8px', fontSize: '0.75rem' }}
                >
                  <option value="Chilled">Chilled Foods</option>
                  <option value="Dairy">Dairy</option>
                  <option value="Produce">Produce</option>
                  <option value="Bakery">Bakery</option>
                  <option value="Frozen">Frozen</option>
                  <option value="Ambient">Ambient</option>
                  <option value="BWS">Beverages</option>
                  <option value="Non-food">Non-Food</option>
                </select>
              </div>
            )}

            <div style={{ display: 'flex', gap: 16 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  PROMO REVENUE
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {fmt.currency(totalHistoricalRevenue)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  AVG UPLIFT
                </div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--success)' }}>
                  +{Math.round(avgHistoricalUplift * 100)}%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 12 }}>
          {filteredPromos.length === 0 ? (
            <div className="empty-state" style={{ padding: '20px 0' }}>
              <AlertCircle size={20} strokeWidth={1.5} color="#4A5A7A" />
              <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>
                No promotions found matching the active filtering policy.
              </p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>SKU / Product</th>
                  <th>Region</th>
                  <th>Discount %</th>
                  <th>Duration</th>
                  <th>Baseline</th>
                  <th>Promo Units</th>
                  <th>Uplift</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromos.map(promo => {
                  const prod = prodMap[promo.sku_id];
                  const skuName = prod ? prod.name : promo.sku_id;

                  const d1 = new Date(promo.start_date);
                  const d2 = new Date(promo.end_date);
                  const days =
                    Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) || 7;

                  const isPromoActive = new Date(promo.end_date) >= new Date('2026-06-04');

                  return (
                    <tr key={promo.promo_id}>
                      <td className="text-primary">{promo.name}</td>
                      <td>{skuName}</td>
                      <td>{promo.region}</td>
                      <td>{promo.discount_pct * 100}%</td>
                      <td>{days} Days</td>
                      <td>{promo.baseline_units.toLocaleString()}</td>
                      <td>{promo.promo_units.toLocaleString()}</td>
                      <td className="positive">+{Math.round(promo.uplift_pct * 100)}%</td>
                      <td>
                        <span
                          className={`badge ${isPromoActive ? 'badge-success' : 'badge-info'}`}
                        >
                          {isPromoActive ? 'Active' : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
