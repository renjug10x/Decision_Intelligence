'use client';
import { useState, useEffect } from 'react';
import {
  Tag, Sparkles, Lock, Loader2, CheckCircle2,
  AlertTriangle, Play, ChevronRight, TrendingUp,
  DollarSign, Percent, BarChart3, AlertCircle
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';

import promotionsData from '@/data/promotions.json';
import productsData from '@/data/products.json';
import storesData from '@/data/stores.json';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v*100).toFixed(1)}%`,
  wow:      (v: number) => `${v >= 0 ? '+' : ''}${(v*100).toFixed(1)}%`,
};

// Types
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

export default function PromotionPlanner() {
  const { role, apiKey, selectedStore } = useApp();

  // ── Governance & Row-Level Filtering Scopes ───────────────────────────────
  // Store Manager region mapping (Manchester S001-S003 is North West)
  const [storeRegion, setStoreRegion] = useState('North West');
  const [focusCategory, setFocusCategory] = useState('Chilled');

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
  const [discountPct, setDiscountPct] = useState(20);
  const [region, setRegion] = useState('All');
  const [duration, setDuration] = useState(14); // 7 | 14 | 30

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
      reason: 'Produce waste spiked by 12.4% in the North West. Run a clearance cut to empty regional warehouse buffers.'
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
      reason: 'Sourdough volumes are stable. Bundling Sourdough with Butter at a 15% package discount captures morning cross-sell margin.'
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
      reason: 'Defend ready meals against competitor price-matching. Volume elasticity is highly positive (+38%).'
    }
  ];

  const handleApplyOpportunity = (op: any) => {
    if (role !== 'exec') return; // Locked for managers
    setSelectedSku(op.sku_id);
    setDiscountPct(op.discount);
    setPromoType(op.type);
    setRegion(op.region);
    setDuration(op.duration);
  };

  const getFilteredOpportunities = () => {
    return AI_OPPORTUNITIES.filter(op => {
      if (role === 'category_manager') return op.category === focusCategory;
      if (role === 'store_manager') return op.region === 'All' || op.region === storeRegion;
      return true;
    });
  };

  // ── Simulator Core Logic (Hybrid Mock/Gemini) ──────────────────────────────
  const handleRunSimulation = async () => {
    if (role !== 'exec') return; // Locked for managers
    setSimulating(true);
    setSimResult(null);

    // 1. Resolve SKU details
    const product = (productsData as Product[]).find(p => p.sku_id === selectedSku) || {
      sku_id: selectedSku,
      name: 'Unknown SKU',
      category: 'General',
      cost_price: 1.0,
      rrp: 1.5
    };

    // 2. Perform deterministic math
    const discountDecimal = discountPct / 100;
    const promoPrice = product.rrp * (1 - discountDecimal);
    
    // Assume baseline units depending on stores count
    let storesCount = 50;
    if (region !== 'All') {
      storesCount = (storesData as any[]).filter(s => s.region === region).length || 8;
    }
    const baselineDailyPerStore = 12;
    const totalBaselineUnits = baselineDailyPerStore * storesCount * duration;

    // Volume Elasticity curve based on Discount depth and Promo type
    let elasticityFactor = 2.4; 
    if (promoType === 'bogof') elasticityFactor = 3.6; // High volume, high cost
    if (promoType === 'bundle') elasticityFactor = 1.9; // Lower elasticity
    
    const upliftPct = discountDecimal * elasticityFactor;
    const predictedUnits = Math.round(totalBaselineUnits * (1 + upliftPct));
    
    const baselineRevenue = totalBaselineUnits * product.rrp;
    const predictedRevenue = predictedUnits * promoPrice;
    
    const baselineMarginPct = (product.rrp - product.cost_price) / product.rrp;
    const predictedMarginPct = (promoPrice - product.cost_price) / promoPrice;
    const marginCompressionPct = predictedMarginPct - baselineMarginPct; // percentage point difference
    
    // Estimate cannibalization rate on adjacent products
    const cannibalizationRisk = Math.min(Math.round(discountDecimal * 28 * 10) / 10, 15);
    
    // Net profit change
    const baselineProfit = totalBaselineUnits * (product.rrp - product.cost_price);
    const promoProfit = predictedUnits * (promoPrice - product.cost_price);
    const netProfitChange = promoProfit - baselineProfit;

    // 3. Generate narrative (Hybrid: API if key exists, else high-fidelity local templates)
    let aiBrief = '';
    if (apiKey) {
      try {
        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: `Simulate a proposed promotion: Product ${product.name} (SKU ${product.sku_id}), Category ${product.category}, Promo Type ${promoType}, Discount ${discountPct}%, Region ${region}, Duration ${duration} days. Explain the viability, margin risk, and cannibalization concerns in exactly 2 sentences.`,
            role: 'exec',
            apiKey,
          }),
        });
        const r = await res.json();
        aiBrief = r.answer;
      } catch (e) {
        console.error("Gemini failed, using local brief", e);
      }
    }

    if (!aiBrief) {
      // Fallback highly-accurate templates
      if (product.category === 'Dairy' && discountPct >= 20) {
        aiBrief = `Proposed Mature Cheddar promo squeezes margins by ${(Math.abs(marginCompressionPct)*100).toFixed(1)}% (to ${(predictedMarginPct*100).toFixed(1)}%). While volume rises +${(upliftPct*100).toFixed(0)}%, the deep discount degrades category profit by ${fmt.currency(Math.abs(netProfitChange))} unless structured as a multi-buy bundle.`;
      } else if (product.category === 'Produce') {
        aiBrief = `Clearance activity on ${product.name} (+${(upliftPct*100).toFixed(0)}% volume) is highly recommended for the ${region} region to alleviate logistics backlog. Net profit increases by ${fmt.currency(netProfitChange)} with negligible cannibalization risk (${cannibalizationRisk}%).`;
      } else if (product.category === 'Bakery') {
        aiBrief = `${product.name} promotion drives strong store footfall and bakery attachment rates. The gross margin compression is easily offset by secondary margin gains on spreads and dairy in adjacent aisles.`;
      } else {
        aiBrief = `The proposed ${(discountPct)}% promotion on ${product.name} yields a positive volume response (+${(upliftPct*100).toFixed(0)}% units), leading to a net profit variance of ${netProfitChange >= 0 ? '+' : ''}${fmt.currency(netProfitChange)}. Ensure supply buffers at ${region} distribution hubs to support replenishment.`;
      }
    }

    setTimeout(() => {
      setSimResult({
        skuName: product.name,
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
        aiBrief
      });
      setSimSimulating(false);
    }, 1200); // UI feel delay
  };

  const setSimSimulating = (val: boolean) => {
    setSimulating(val);
  };

  // ── Render Chart Data ──────────────────────────────────────────────────────
  const chartData = simResult ? {
    labels: ['Baseline Volume', 'Simulated Promo Volume'],
    datasets: [
      {
        label: 'Sales Volume (Units)',
        data: [simResult.baselineUnits, simResult.promoUnits],
        backgroundColor: ['rgba(74, 90, 122, 0.4)', 'rgba(0, 120, 255, 0.75)'],
        borderColor: ['#4A5A7A', '#0078FF'],
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  } : null;

  // ── Governed Table Filtering ───────────────────────────────────────────────
  // Executive: Full access
  // Category Manager: Only category matching focusCategory (default Chilled)
  // Store Manager: Only regions matching storeRegion (default North West) or "All"
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
      return true; // Executive
    });
  };

  const filteredPromos = getFilteredPromotions();
  const prodMap = Object.fromEntries((productsData as Product[]).map(p => [p.sku_id, p]));

  // Compute stats for the historical list
  const totalHistoricalRevenue = filteredPromos.reduce((acc, p) => {
    const prod = prodMap[p.sku_id];
    const price = prod ? prod.rrp * (1 - p.discount_pct) : 0;
    return acc + (p.promo_units * price);
  }, 0);
  
  const avgHistoricalUplift = filteredPromos.length
    ? filteredPromos.reduce((acc, p) => acc + p.uplift_pct, 0) / filteredPromos.length
    : 0;

  const isLocked = role !== 'exec';

  return (
    <div className="page-content">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2>Promotion Planner</h2>
          <p style={{ marginTop: 4 }}>
            {role === 'exec' 
              ? 'Campaign modeling sandbox & lookback analytics panel' 
              : `Looker Scoped Portfolio: ${role === 'store_manager' ? `Region - ${storeRegion}` : `Category - ${focusCategory}`} (Read-only)`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className="badge badge-accent" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingUp size={11} strokeWidth={2} color="currentColor" />
            Elasticity Active
          </span>
        </div>
      </div>

      {/* Restrict Notice */}
      {isLocked && (
        <div className="card mb-6" style={{ borderColor: 'var(--danger-light)', background: 'var(--danger-light)' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Lock size={18} strokeWidth={1.75} color="#EF4444" style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>
              <strong>Looker IAM Protection Active:</strong> Campaign simulation and parameter planning are restricted to Executive accounts. Below is the historical performance and recommendations scoped to your role.
            </div>
          </div>
        </div>
      )}

      {/* Grid 2-1: Simulator and recommendations */}
      <div className="grid-2-1 mb-6">

        {/* Simulator Card */}
        <div className="card" style={{ opacity: isLocked ? 0.7 : 1 }}>
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Tag size={15} strokeWidth={1.75} color="#0078FF" />
              AI Campaign Simulator
            </span>
            {isLocked && <span className="badge badge-danger">Read-only</span>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                SELECT SKU
              </label>
              <select
                className="select w-full"
                value={selectedSku}
                onChange={e => setSelectedSku(e.target.value)}
                disabled={isLocked}
                style={{ height: 38, fontSize: '0.875rem' }}
              >
                {(productsData as Product[]).map(p => (
                  <option key={p.sku_id} value={p.sku_id}>
                    {p.name} ({p.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                PROMOTIONAL METHOD
              </label>
              <select
                className="select w-full"
                value={promoType}
                onChange={e => setPromoType(e.target.value)}
                disabled={isLocked}
                style={{ height: 38, fontSize: '0.875rem' }}
              >
                <option value="price_cut">Price Cut (Direct Discount)</option>
                <option value="bogof">Buy One Get One Free (BOGOF)</option>
                <option value="bundle">Category Bundle Deal</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                DISCOUNT DEPTH: {discountPct}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={discountPct}
                onChange={e => setDiscountPct(Number(e.target.value))}
                disabled={isLocked}
                style={{ width: '100%', accentColor: 'var(--accent)', cursor: isLocked ? 'not-allowed' : 'pointer' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                TARGET REGION
              </label>
              <select
                className="select w-full"
                value={region}
                onChange={e => setRegion(e.target.value)}
                disabled={isLocked}
                style={{ height: 38, fontSize: '0.875rem' }}
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
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                CAMPAIGN DURATION
              </label>
              <select
                className="select w-full"
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                disabled={isLocked}
                style={{ height: 38, fontSize: '0.875rem' }}
              >
                <option value="7">7 Days</option>
                <option value="14">14 Days</option>
                <option value="30">30 Days</option>
              </select>
            </div>
          </div>

          <button
            className="btn btn-primary w-full"
            onClick={handleRunSimulation}
            disabled={isLocked || simulating}
            style={{ justifyContent: 'center', height: 42 }}
          >
            {simulating ? (
              <>
                <Loader2 size={16} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
                <span>Running Looker Analytics Predictor…</span>
              </>
            ) : (
              <>
                <Play size={15} strokeWidth={2} fill="currentColor" />
                <span>Simulate AI Predict</span>
              </>
            )}
          </button>
        </div>

        {/* AI Recommendations Card */}
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={15} strokeWidth={1.75} color="var(--yellow)" />
              AI Opportunities Feed
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {getFilteredOpportunities().map(op => {
              const isOpLocked = role !== 'exec';
              return (
                <div
                  key={op.id}
                  className="card"
                  style={{
                    padding: 12,
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    opacity: isOpLocked ? 0.6 : 1,
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{op.title}</span>
                    <span className="badge badge-accent" style={{ fontSize: '0.5625rem', padding: '1px 6px' }}>{op.category}</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {op.reason}
                  </div>
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Suggested: {op.discount}% Cut · {op.region}
                    </span>
                    {!isLocked && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => handleApplyOpportunity(op)}
                        style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--accent)', gap: 4 }}
                      >
                        Apply
                        <ChevronRight size={12} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Simulator Results */}
      {simResult && (
        <div className="grid-2-1 mb-6 animate-slide">
          {/* Metrics breakdown */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">SIMULATED FORECAST METRICS — {simResult.skuName}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 10, position: 'relative' }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Volume Uplift</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success)', marginTop: 4 }}>+{Math.round(simResult.upliftPct * 100)}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>{simResult.promoUnits.toLocaleString()} total units</div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Profit Change</div>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: simResult.netProfitChange >= 0 ? 'var(--success)' : 'var(--danger)',
                  marginTop: 4
                }}>
                  {simResult.netProfitChange >= 0 ? '+' : ''}{fmt.currency(simResult.netProfitChange)}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>vs baseline forecast</div>
              </div>

              <div style={{ background: 'var(--bg-elevated)', padding: 14, borderRadius: 10 }}>
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Cannibalization Risk</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--warning)', marginTop: 4 }}>{simResult.cannibalizationRisk}%</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>on adjacent lines</div>
              </div>
            </div>

            <div className="divider" style={{ margin: '14px 0' }} />

            <div className="ai-response" style={{ border: 'none', background: 'var(--accent-light)', padding: 16, borderRadius: 10 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                <Sparkles size={14} color="#0078FF" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase' }}>AI Feasibility Assessment</span>
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                {simResult.aiBrief}
              </div>
            </div>
          </div>

          {/* Forecast Volume Chart */}
          <div className="card">
            <div className="card-header">
              <span className="card-title">Volume Response Forecast</span>
            </div>
            <div className="chart-container" style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {chartData && (
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: { backgroundColor: '#1A2235', titleColor: '#F0F4FF', bodyColor: '#8B9DC3', borderColor: '#2A3550', borderWidth: 1 }
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: '#8B9DC3', font: { size: 10 } } },
                      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#8B9DC3', font: { size: 10 } } }
                    }
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historical Promotions Section */}
      <div className="card">
        <div className="card-header flex items-center justify-between" style={{ flexWrap: 'wrap', gap: 16 }}>
          <div>
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={15} strokeWidth={1.75} color="#0078FF" />
              Governed Campaign History
            </span>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Active and completed promotional campaigns fetched under current IAM policies.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {role === 'category_manager' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Focus Category:</span>
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
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROMO REVENUE</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{fmt.currency(totalHistoricalRevenue)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>AVG UPLIFT %</div>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--success)' }}>+{Math.round(avgHistoricalUplift * 100)}%</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto', marginTop: 16 }}>
          {filteredPromos.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <AlertCircle size={24} strokeWidth={1.5} color="#4A5A7A" />
              <p style={{ fontSize: '0.8125rem' }}>No promotions found matching the active Looker filtering policy.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign Name</th>
                  <th>SKU / Product</th>
                  <th>Region Scope</th>
                  <th>Discount %</th>
                  <th>Duration</th>
                  <th>Baseline Units</th>
                  <th>Promo Units</th>
                  <th>Uplift %</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredPromos.map(promo => {
                  const prod = prodMap[promo.sku_id];
                  const skuName = prod ? prod.name : promo.sku_id;
                  
                  // Compute duration days
                  const d1 = new Date(promo.start_date);
                  const d2 = new Date(promo.end_date);
                  const days = Math.round((d2.getTime() - d1.getTime()) / (1000 * 3600 * 24)) || 7;

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
                        <span className={`badge ${isPromoActive ? 'badge-success' : 'badge-info'}`}>
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
