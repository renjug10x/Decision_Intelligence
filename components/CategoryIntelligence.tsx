'use client';
import React, { useEffect, useState } from 'react';
import {
  Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Lock, XCircle,
  PoundSterling, Percent, Trash2, ShoppingCart, Store as StoreIcon, ShieldCheck
} from 'lucide-react';
import { useApp } from '@/lib/context';

const CATEGORIES = ['All','Chilled','Dairy','Produce','Bakery','Frozen','Ambient','BWS','Non-food'];

const STORES = [
  { id: 'S001', name: 'Manchester Piccadilly' },
  { id: 'S002', name: 'Manchester Trafford' },
  { id: 'S003', name: 'Manchester Ancoats' },
  { id: 'S004', name: 'Liverpool Central' },
  { id: 'S005', name: 'Liverpool Wavertree' },
  { id: 'S006', name: 'Leeds City Centre' },
  { id: 'S007', name: 'Leeds Headingley' },
  { id: 'S008', name: 'Sheffield Hillsborough' },
  { id: 'S009', name: 'Sheffield City' },
  { id: 'S010', name: 'Birmingham Bullring' },
  { id: 'S015', name: 'London Shoreditch' },
  { id: 'S017', name: 'London Stratford' },
  { id: 'S019', name: 'London Croydon' },
  { id: 'S031', name: 'Edinburgh Princes' },
  { id: 'S033', name: 'Glasgow Sauchiehall' },
  { id: 'S036', name: 'Cardiff Bay' },
  { id: 'S039', name: 'Newcastle Eldon' },
];

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v*100).toFixed(1)}%`,
  wow:      (v: number) => `${v >= 0 ? '+' : ''}${(v*100).toFixed(1)}%`,
  confidence: (v: number) => `${Math.round(v * 100)}%`,
  units:    (v: number) => `${Math.round(v).toLocaleString()} units`,
  stores:   (v: number) => `${Math.round(v).toLocaleString()} stores`,
};

const CATEGORY_PERFORMANCE_LABELS: Record<string, string> = {
  All: 'ALL CATEGORIES PERFORMANCE',
  Chilled: 'CHILLED PERFORMANCE',
  Dairy: 'DAIRY PERFORMANCE',
  Produce: 'PRODUCE PERFORMANCE',
  Bakery: 'BAKERY PERFORMANCE',
  Frozen: 'FROZEN PERFORMANCE',
  Ambient: 'AMBIENT PERFORMANCE',
  BWS: 'BWS PERFORMANCE',
  'Non-food': 'NON-FOOD PERFORMANCE',
};

const CATEGORY_MARGIN_BENCHMARKS: Record<string, number> = {
  All: 0.335,
  Chilled: 0.335,
  Dairy: 0.335,
  Produce: 0.34,
  Bakery: 0.36,
  Frozen: 0.32,
  Ambient: 0.31,
  BWS: 0.34,
  'Non-food': 0.34,
};

const CATEGORY_AVAILABILITY_PRESSURE: Record<string, number> = {
  All: 0.018,
  Chilled: 0.026,
  Dairy: 0.018,
  Produce: 0.035,
  Bakery: 0.024,
  Frozen: 0.017,
  Ambient: 0.012,
  BWS: 0.014,
  'Non-food': 0.011,
};

const CATEGORY_STORE_BASE: Record<string, number> = {
  All: 127,
  Chilled: 86,
  Dairy: 74,
  Produce: 93,
  Bakery: 61,
  Frozen: 58,
  Ambient: 49,
  BWS: 53,
  'Non-food': 44,
};

const CATEGORY_CONFIDENCE: Record<string, number> = {
  All: 0.84,
  Chilled: 0.88,
  Dairy: 0.86,
  Produce: 0.87,
  Bakery: 0.83,
  Frozen: 0.82,
  Ambient: 0.81,
  BWS: 0.82,
  'Non-food': 0.80,
};

const ROOT_CAUSE_OPTIONS: Record<string, string[]> = {
  Produce: [
    'FreshDirect UK delivery failures reducing availability',
    'Temperature compliance risk at DC',
    'Quality rejection causing reduced shelf availability',
    'Weather-driven demand shift affecting replenishment',
  ],
  Dairy: [
    'Margin compression from competitor benchmark pricing',
    'Increased markdown pressure from short shelf-life exposure',
    'Promotion mix reducing profitability',
    'Demand shift toward value SKUs',
  ],
  Chilled: [
    'Supplier delay reducing shelf rotation',
    'Ready meal promotion cannibalisation',
    'Cold-chain replenishment variance',
    'Availability pressure across peak trading windows',
  ],
  Bakery: [
    'Forecast variance after morning demand spike',
    'Short shelf-life markdown pressure',
    'Late replenishment affecting availability',
  ],
  Frozen: [
    'DC replenishment delay affecting range availability',
    'Price promotion leakage against forecast',
    'Storage capacity constraint driving assortment gaps',
  ],
  Ambient: [
    'Slow-moving inventory build-up',
    'Promotional demand lower than expected',
    'Regional stock imbalance',
  ],
  BWS: [
    'Campaign underperformance against forecast',
    'Local demand variance',
    'Range mix below expected margin',
  ],
  'Non-food': [
    'Seasonal sell-through below forecast',
    'Range allocation mismatch',
    'Store-level display compliance variance',
  ],
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const safeNumber = (value: any, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const getCategoryPerformanceLabel = (category: string, fallback?: string) => {
  if (CATEGORY_PERFORMANCE_LABELS[category]) return CATEGORY_PERFORMANCE_LABELS[category];
  if (fallback && CATEGORY_PERFORMANCE_LABELS[fallback]) return CATEGORY_PERFORMANCE_LABELS[fallback];
  return 'CATEGORY PERFORMANCE';
};

const getRootCause = (sku: any, rowIndex: number) => {
  const options = ROOT_CAUSE_OPTIONS[sku?.category] || ['Category performance variance under review'];
  const numericId = Number(String(sku?.sku_id || '').replace(/\D/g, '')) || rowIndex;
  return options[numericId % options.length];
};

const buildCategoryKpiStory = (activeCategory: string, catPerf: any[], skus: any[]) => {
  const rows = catPerf.filter(Boolean);
  const revenueAtRisk = rows.reduce((sum, row) => sum + safeNumber(row.revenue), 0);
  const totalUnits = rows.reduce((sum, row) => sum + safeNumber(row.units), 0);
  const wasteExposure = rows.reduce((sum, row) => sum + safeNumber(row.waste_units), 0);
  const weightedMargin = revenueAtRisk > 0
    ? rows.reduce((sum, row) => sum + safeNumber(row.margin_pct) * safeNumber(row.revenue), 0) / revenueAtRisk
    : 0;
  const weightedWow = revenueAtRisk > 0
    ? rows.reduce((sum, row) => sum + safeNumber(row.revenue_wow) * safeNumber(row.revenue), 0) / revenueAtRisk
    : 0;
  const benchmark = CATEGORY_MARGIN_BENCHMARKS[activeCategory] ?? CATEGORY_MARGIN_BENCHMARKS.All;
  const marginErosion = weightedMargin - benchmark;
  const wasteRate = totalUnits > 0 ? wasteExposure / totalUnits : 0;
  const availabilityPressure = CATEGORY_AVAILABILITY_PRESSURE[activeCategory] ?? CATEGORY_AVAILABILITY_PRESSURE.All;
  const availabilityImpact = clamp(
    0.968 - (wasteRate * 1.2) - (Math.max(0, -weightedWow) * 0.12) - availabilityPressure,
    0.84,
    0.985
  );
  const storeBase = CATEGORY_STORE_BASE[activeCategory] ?? 52;
  const storesImpacted = activeCategory === 'All'
    ? storeBase + Math.min(18, skus.length)
    : storeBase + Math.max(0, skus.length - 5) * 4;
  const aiConfidence = clamp(
    (CATEGORY_CONFIDENCE[activeCategory] ?? CATEGORY_CONFIDENCE.All) +
      Math.min(0.04, Math.max(0, -weightedWow) * 0.16) -
      (skus.length > 12 ? 0.02 : 0),
    0.76,
    0.93
  );

  return {
    label: getCategoryPerformanceLabel(activeCategory),
    revenueAtRisk,
    marginErosion,
    wasteExposure,
    availabilityImpact,
    storesImpacted,
    aiConfidence,
    weightedWow,
  };
};

export default function CategoryIntelligence() {
  const { role, apiKey, selectedStore } = useApp();
  const [activeCategory, setActiveCategory] = useState(role === 'category_manager' ? 'Chilled' : 'All');
  const [data, setData]         = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [aiInsight, setAiInsight] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [expandedSku, setExpandedSku] = useState<string | null>(null);
  
  // Access Denied simulation state
  const [showAccessDenied, setShowAccessDenied] = useState(false);
  const [deniedCategory, setDeniedCategory] = useState('');

  const isTabLocked = (cat: string) => {
    return role === 'category_manager' && cat !== 'Chilled';
  };

  const handleTabClick = (cat: string) => {
    if (isTabLocked(cat)) {
      setShowAccessDenied(true);
      setDeniedCategory(cat);
    } else {
      setActiveCategory(cat);
      setShowAccessDenied(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const cat = activeCategory === 'All' ? '' : activeCategory;
    const query = new URLSearchParams();
    query.set('type', 'category');
    if (cat) query.set('category', cat);
    
    if (role === 'store_manager') {
      query.set('role', 'store_manager');
      query.set('store', selectedStore);
    } else if (role === 'category_manager') {
      query.set('role', 'category_manager');
      query.set('category', activeCategory);
    }

    fetch(`/api/data?${query.toString()}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
    setAiInsight('');
  }, [activeCategory, role, selectedStore]);

  const getAiInsight = async () => {
    if (aiLoading || !data?.skus?.length) return;
    setAiLoading(true);
    const topSku = data.skus[0];
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question: `Why is ${topSku.name} underperforming? Revenue is down ${fmt.wow(topSku.revenue_wow)} this week. What should we do?`,
        role: role || 'category_manager',
        storeId: role === 'store_manager' ? selectedStore : undefined,
        apiKey,
        dataContext: { skus: data.skus.slice(0, 5), categoryPerf: data.categoryPerf },
      }),
    });
    const r = await res.json();
    setAiInsight(r.answer + '\n\n' + (r.recommendation ? `Recommended action: ${r.recommendation}` : ''));
    setAiLoading(false);
  };

  const skus    = data?.skus    || [];
  const catPerf = data?.categoryPerf || [];
  const storeObj = STORES.find(s => s.id === selectedStore);
  const categoryKpiStory = buildCategoryKpiStory(activeCategory, catPerf, skus);
  const categoryKpiCards = [
    {
      label: 'Revenue at Risk',
      value: fmt.currency(categoryKpiStory.revenueAtRisk),
      detail: categoryKpiStory.label,
      Icon: PoundSterling,
      color: '#F97316',
      bg: 'rgba(249,115,22,0.08)',
      border: 'rgba(249,115,22,0.24)',
    },
    {
      label: 'Margin Erosion',
      value: fmt.wow(categoryKpiStory.marginErosion),
      detail: 'vs category benchmark',
      Icon: Percent,
      color: categoryKpiStory.marginErosion >= 0 ? '#10B981' : '#EF4444',
      bg: categoryKpiStory.marginErosion >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
      border: categoryKpiStory.marginErosion >= 0 ? 'rgba(16,185,129,0.24)' : 'rgba(239,68,68,0.24)',
    },
    {
      label: 'Waste Exposure',
      value: fmt.units(categoryKpiStory.wasteExposure),
      detail: 'impacted waste units',
      Icon: Trash2,
      color: '#F59E0B',
      bg: 'rgba(245,158,11,0.08)',
      border: 'rgba(245,158,11,0.24)',
    },
    {
      label: 'Availability Impact',
      value: fmt.pct(categoryKpiStory.availabilityImpact),
      detail: 'service-level pressure',
      Icon: ShoppingCart,
      color: categoryKpiStory.availabilityImpact >= 0.96 ? '#10B981' : '#F59E0B',
      bg: categoryKpiStory.availabilityImpact >= 0.96 ? 'rgba(16,185,129,0.08)' : 'rgba(245,158,11,0.08)',
      border: categoryKpiStory.availabilityImpact >= 0.96 ? 'rgba(16,185,129,0.24)' : 'rgba(245,158,11,0.24)',
    },
    {
      label: 'Stores Impacted',
      value: fmt.stores(categoryKpiStory.storesImpacted),
      detail: `${skus.length} underperforming SKUs`,
      Icon: StoreIcon,
      color: '#06B6D4',
      bg: 'rgba(6,182,212,0.08)',
      border: 'rgba(6,182,212,0.24)',
    },
    {
      label: 'AI Confidence',
      value: fmt.confidence(categoryKpiStory.aiConfidence),
      detail: 'root-cause confidence',
      Icon: ShieldCheck,
      color: '#0078FF',
      bg: 'rgba(0,120,255,0.08)',
      border: 'rgba(0,120,255,0.24)',
    },
  ];

  return (
    <div className="page-content">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2>Category Intelligence</h2>
          <p style={{ marginTop: 4 }}>
            {role === 'store_manager'
              ? `Underperforming SKUs in store ${storeObj?.name || selectedStore} — last 7 days`
              : 'Underperforming SKUs across UK stores — last 7 days vs prior week'
            }
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={getAiInsight}
          disabled={aiLoading || !skus.length}
          style={{ gap: 8 }}
        >
          {aiLoading
            ? <Loader2 size={16} strokeWidth={1.75} color="white" style={{ animation: 'spin 0.8s linear infinite' }} />
            : <Sparkles size={16} strokeWidth={1.75} color="white" />
          }
          {aiLoading ? 'Analysing…' : 'AI Root Cause'}
        </button>
      </div>

      {/* Role Restriction Banner for Category Managers */}
      {showAccessDenied && (
        <div className="alert-strip mb-6 animate-slide" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', padding: 16 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <XCircle size={20} strokeWidth={1.75} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.875rem' }}>Looker Row-Level Security Active (access_filter)</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 4, lineHeight: 1.5 }}>
                Access Denied to category <strong>{deniedCategory}</strong>. Your Looker user profile is governed by the <code>restricted_to: own_category</code> policy, scoping your access exclusively to <strong>Chilled</strong>.
              </p>
              <button className="btn btn-ghost btn-sm" style={{ marginTop: 10, padding: '4px 8px', fontSize: '0.75rem', height: 28 }} onClick={() => alert('Access request submitted to LiDL BI Admin team. Request ID: REQ-99201')}>
                Request Category Access Extension
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category filter tabs */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {CATEGORIES.map(cat => {
          const locked = isTabLocked(cat);
          return (
            <button
              key={cat}
              className={`tab ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => handleTabClick(cat)}
              style={{ flex: 'none', padding: '7px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {locked && <Lock size={12} strokeWidth={1.75} color="#6B7A8D" />}
              {cat}
            </button>
          );
        })}
      </div>

      {/* AI insight */}
      {aiInsight && (
        <div className="ai-response mb-6 animate-slide">
          <div className="ai-response-header">
            <div className="ai-orb">
              <Sparkles size={12} strokeWidth={1.75} color="white" />
            </div>
            <div className="ai-label">AI Root Cause Analysis · {activeCategory}</div>
          </div>
          <div className="ai-response-body">
            <div className="ai-answer" style={{ whiteSpace: 'pre-line' }}>{aiInsight}</div>
          </div>
        </div>
      )}

      {/* Category KPI story */}
      {catPerf.length > 0 && (
        <div className="mb-6" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#F59E0B', marginBottom: 3 }}>
                {categoryKpiStory.label}
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Category operational KPI story
              </div>
            </div>
            <span className={`badge ${categoryKpiStory.weightedWow >= 0 ? 'badge-success' : 'badge-danger'}`}
              style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              {categoryKpiStory.weightedWow >= 0
                ? <TrendingUp  size={11} strokeWidth={2} color="currentColor" />
                : <TrendingDown size={11} strokeWidth={2} color="currentColor" />
              }
              {fmt.wow(categoryKpiStory.weightedWow)} revenue WoW
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10 }}>
            {categoryKpiCards.map(({ label, value, detail, Icon, color, bg, border }) => (
              <div
                key={label}
                style={{
                  minWidth: 0,
                  padding: '12px 13px',
                  borderRadius: 8,
                  background: 'rgba(13,19,33,0.72)',
                  border: `1px solid ${border}`,
                  boxShadow: '0 10px 24px rgba(0,0,0,0.16)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <span style={{ fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--text-muted)', textTransform: 'uppercase', lineHeight: 1.2 }}>
                    {label}
                  </span>
                  <span style={{ width: 26, height: 26, borderRadius: 7, background: bg, border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={13} strokeWidth={1.9} color={color} />
                  </span>
                </div>
                <div style={{ fontSize: '1.12rem', lineHeight: 1, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6, whiteSpace: 'nowrap' }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.69rem', lineHeight: 1.3, color: 'var(--text-secondary)', overflowWrap: 'normal', wordBreak: 'normal' }}>
                  {detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SKU table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Underperforming SKUs {activeCategory !== 'All' ? `— ${activeCategory}` : ''} ({skus.length})
          </span>
          <span className="badge badge-danger" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TrendingDown size={11} strokeWidth={2} color="currentColor" /> Revenue vs prior week
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 24, display: 'flex', gap: 10, alignItems: 'center' }}>
            <Loader2 size={16} strokeWidth={1.75} color="#0078FF" style={{ animation: 'spin 0.8s linear infinite' }} />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading SKU data…</span>
          </div>
        ) : skus.length === 0 ? (
          <div className="empty-state">
            <CheckCircle2 size={40} strokeWidth={1.25} color="#10B981" style={{ opacity: 0.5 }} />
            <h4>No underperforming SKUs</h4>
            <p>All SKUs in {activeCategory} are at or above prior week levels.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>SKU Name</th>
                  <th>Category</th>
                  <th>Revenue</th>
                  <th>Margin %</th>
                  <th>WoW Change</th>
                  <th>Root Cause</th>
                  <th style={{ width: 32 }}></th>
                </tr>
              </thead>
              <tbody>
                {skus.map((sku: any, index: number) => {
                  const rootCause = getRootCause(sku, index);
                  return (
                    <React.Fragment key={sku.sku_id}>
                      <tr
                        onClick={() => setExpandedSku(expandedSku === sku.sku_id ? null : sku.sku_id)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td className="text-primary">{sku.name}</td>
                        <td><span className="badge badge-accent">{sku.category}</span></td>
                        <td>{fmt.currency(sku.revenue)}</td>
                        <td>{fmt.pct(sku.margin_pct)}</td>
                        <td className="negative" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <TrendingDown size={13} strokeWidth={1.75} color="currentColor" />
                          {fmt.wow(sku.revenue_wow)}
                        </td>
                        <td style={{ maxWidth: 240, color: 'var(--text-muted)', fontSize: '0.8125rem', lineHeight: 1.35 }}>
                          {rootCause}
                        </td>
                        <td>
                          {expandedSku === sku.sku_id
                            ? <ChevronUp   size={14} strokeWidth={1.75} color="#4A5A7A" />
                            : <ChevronDown size={14} strokeWidth={1.75} color="#4A5A7A" />
                          }
                        </td>
                      </tr>
                      {expandedSku === sku.sku_id && (
                        <tr>
                          <td colSpan={7} style={{ background: 'var(--bg-elevated)', padding: 16 }}>
                            <div style={{ display: 'flex', gap: 24 }}>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>UNITS SOLD</div>
                                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{sku.units.toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>SKU ID</div>
                                <div style={{ fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'monospace' }}>{sku.sku_id}</div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>ROOT CAUSE</div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{rootCause}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
