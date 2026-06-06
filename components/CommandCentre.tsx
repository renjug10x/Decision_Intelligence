'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  PoundSterling, Package, Percent, Trash2, Truck,
  AlertTriangle, AlertCircle, CheckCircle2, Info,
  Lightbulb, ShieldAlert, TrendingUp, TrendingDown,
  Sparkles, Loader2,
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { ICON_PROPS, ICON_PROPS_SM, ICON_SUCCESS, ICON_DANGER, ICON_WARNING, ICON_MUTED } from '@/lib/icons';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler);

const fmt = {
  currency: (v: number) => `£${v >= 1000 ? (v/1000).toFixed(1)+'K' : v.toFixed(0)}`,
  pct:      (v: number) => `${(v*100).toFixed(1)}%`,
  int:      (v: number) => v.toLocaleString(),
};

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor: '#1A2235', titleColor: '#F0F4FF', bodyColor: '#8B9DC3', borderColor: '#2A3550', borderWidth: 1 },
  },
};

const KPI_CONFIG = [
  { key: 'revenue',    label: 'Total Revenue',      Icon: PoundSterling, format: 'currency', invertPositive: false },
  { key: 'units',      label: 'Units Sold',          Icon: Package,       format: 'int',      invertPositive: false },
  { key: 'margin_pct', label: 'Avg Margin %',        Icon: Percent,       format: 'pct',      invertPositive: false },
  { key: 'waste_units',label: 'Waste Units',         Icon: Trash2,        format: 'int',      invertPositive: true  },
  { key: 'on_time_pct',label: 'On-Time Delivery',   Icon: Truck,         format: 'pct',      invertPositive: false },
];

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

const CATEGORIES = ['Chilled','Dairy','Produce','Bakery','Frozen','Ambient','BWS','Non-food'];

const ANOMALY_DETAILS: Record<string, {
  rootCause: string;
  recommendation: string;
  actionLabel: string;
  resolvedMessage: string;
}> = {
  A001: {
    rootCause: "Late ready meal deliveries from Greencore Ready Meals on Friday/Saturday led to stockouts on 3 high-volume ready meal lines during peak evening trade, losing £4.2K in potential sales.",
    recommendation: "Deploy emergency safety stock buffer from the Trafford distribution hub to Piccadilly store via express logistics.",
    actionLabel: "Reroute Trafford Buffer Stock",
    resolvedMessage: "Trafford DC buffer stock successfully rerouted. Piccadilly ready meal inventory replenished."
  },
  A002: {
    rootCause: "Logistics bottlenecks at FreshDirect's London sorting DC delayed fresh Produce arrivals, resulting in a 45% delivery failure rate across 8 Southern stores.",
    recommendation: "Activate the backup sourcing contract with Total Produce to temporarily reroute 35% of regional Produce volume.",
    actionLabel: "Reroute to Total Produce",
    resolvedMessage: "Backup contract active. 35% of Southern produce supply rerouted to Total Produce."
  },
  A003: {
    rootCause: "Competitive price-matching on Cheddar cheese and 2L milk in the North West compressed average dairy margins to 30.2% (vs 33.5% plan).",
    recommendation: "Deploy in-store cross-promotions linking high-margin bakery items with milk purchases to recover regional margin deficits.",
    actionLabel: "Deploy Cross-Promotion",
    resolvedMessage: "Bakery & Milk cross-promotions active across 5 North West stores."
  },
  A004: {
    rootCause: "Delivery delays compressed store shelf-life rotation times, resulting in a +24% spike in pre-shelf spoilage of fresh salad and vegetables.",
    recommendation: "Adjust automatic store markdown thresholds from 15% to 30% for Produce expiring within 24 hours.",
    actionLabel: "Adjust Markdown Thresholds",
    resolvedMessage: "Automatic markdown threshold adjusted to 30% for Produce expiring within 24 hours."
  }
};

export default function CommandCentre() {
  const {
    role, apiKey, selectedStore, setSelectedStore,
    wowDeclineThreshold, wasteSpikeThreshold,
    aiAutopilot, aiConfidenceThreshold,
    userAttributeStoreScope, userAttributeCategoryScope
  } = useApp();
  const [activeCategory, setActiveCategory] = useState('Chilled');
  const [data, setData]             = useState<any>(null);
  const [briefing, setBriefing]     = useState<any>(null);
  const [loadingData, setLd]        = useState(true);
  const [loadingBriefing, setLb]    = useState(false);
  const [briefingGenerated, setBG]  = useState(false);

  const [selectedAnomaly, setSelectedAnomaly] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolvedAnomalies, setResolvedAnomalies] = useState<Record<string, boolean>>({});

  const executeResolution = async (id: string) => {
    setResolvingId(id);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setResolvedAnomalies(prev => ({ ...prev, [id]: true }));
    setSelectedAnomaly(null);
    setResolvingId(null);
  };

  useEffect(() => {
    setLd(true);
    const query = new URLSearchParams();
    query.set('type', 'dashboard');
    if (role === 'store_manager') {
      query.set('role', 'store_manager');
      query.set('store', selectedStore);
    } else if (role === 'category_manager') {
      query.set('role', 'category_manager');
      query.set('category', activeCategory);
    }
    
    // Add settings variables
    query.set('wowDeclineThreshold', wowDeclineThreshold.toString());
    query.set('wasteSpikeThreshold', wasteSpikeThreshold.toString());
    query.set('attributeStoreScope', userAttributeStoreScope);
    query.set('attributeCategoryScope', userAttributeCategoryScope);

    fetch(`/api/data?${query.toString()}`)
      .then(r => r.json())
      .then(d => { 
        setData(d); 
        setLd(false); 
        
        // Autopilot: auto-resolve anomalies exceeding the confidence threshold
        if (d.anomalies) {
          const autoResolutions: Record<string, boolean> = {};
          d.anomalies.forEach((a: any) => {
            if (aiAutopilot && a.confidence && a.confidence >= aiConfidenceThreshold) {
              autoResolutions[a.id] = true;
            }
          });
          setResolvedAnomalies(prev => ({ ...prev, ...autoResolutions }));
        }
      })
      .catch(() => setLd(false));
    
    setBriefing(null);
    setBG(false);
  }, [
    role, selectedStore, activeCategory, 
    wowDeclineThreshold, wasteSpikeThreshold, 
    aiAutopilot, aiConfidenceThreshold, 
    userAttributeStoreScope, userAttributeCategoryScope
  ]);

  const generateBriefing = useCallback(async () => {
    if (!data || briefingGenerated) return;
    setLb(true);
    setBG(true);
    try {
      const res = await fetch('/api/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey,
          role,
          storeId: role === 'store_manager' ? selectedStore : undefined,
          category: role === 'category_manager' ? activeCategory : undefined,
        }),
      });
      setBriefing(await res.json());
    } catch {}
    setLb(false);
  }, [data, apiKey, briefingGenerated, role, selectedStore, activeCategory]);

  if (loadingData) return (
    <div className="page-content">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
      </div>
    </div>
  );

  const kpi            = data?.kpi            || {};
  const trend          = data?.trend          || [];
  const regionRevenue   = data?.regionRevenue || [];
  const categoryPerf    = data?.categoryPerf  || [];
  const anomalies       = data?.anomalies     || [];

  const lineData = {
    labels: trend.map((t: any) => t.date.slice(5)),
    datasets: [{
      data: trend.map((t: any) => t.revenue),
      borderColor: '#0078FF', backgroundColor: 'rgba(0,120,255,0.07)',
      fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: '#0078FF',
    }],
  };

  const showRegionChart = role !== 'store_manager';
  
  const secondChartTitle = showRegionChart ? 'Revenue by Region' : 'Top Categories';
  const secondChartData = showRegionChart ? {
    labels: regionRevenue.map((r: any) => r.region),
    datasets: [{
      data: regionRevenue.map((r: any) => r.revenue),
      backgroundColor: ['#0078FF','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6','#EC4899'],
      borderRadius: 6, borderWidth: 0,
    }],
  } : {
    labels: categoryPerf.slice(0, 6).map((c: any) => c.category),
    datasets: [{
      data: categoryPerf.slice(0, 6).map((c: any) => c.revenue),
      backgroundColor: ['#0078FF','#10B981','#F59E0B','#EF4444','#06B6D4','#8B5CF6'],
      borderRadius: 6, borderWidth: 0,
    }],
  };

  const catData = {
    labels: categoryPerf.slice(0, 6).map((c: any) => c.category),
    datasets: [{
      data: categoryPerf.slice(0, 6).map((c: any) => c.revenue),
      backgroundColor: 'rgba(0,120,255,0.65)',
      hoverBackgroundColor: '#0078FF',
      borderRadius: 6, borderWidth: 0,
    }],
  };

  const storeObj = STORES.find(s => s.id === selectedStore);
  
  const getHeaderTitle = () => {
    if (role === 'store_manager') return `Command Centre — ${storeObj?.name || selectedStore}`;
    if (role === 'category_manager') return `Command Centre — ${activeCategory} Category`;
    return 'Command Centre';
  };

  const getHeaderSub = () => {
    if (role === 'store_manager') return `Store performance data · Store ID: ${selectedStore}`;
    if (role === 'category_manager') return `Category level performance across all UK stores`;
    return 'Lidl UK national business overview';
  };

  return (
    <div className="page-content">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2>{getHeaderTitle()}</h2>
          <p style={{ marginTop: 4 }}>{getHeaderSub()} · 4 Jun 2026</p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          {role === 'category_manager' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Focus:</span>
              <select className="select" value={activeCategory} onChange={e => setActiveCategory(e.target.value)} style={{ width: 140, height: 36 }}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          )}
          {role === 'store_manager' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>My Store:</span>
              <select className="select" value={selectedStore} onChange={e => setSelectedStore(e.target.value)} style={{ width: 180, height: 36 }}>
                {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <button className="btn btn-primary" onClick={generateBriefing} disabled={loadingBriefing || briefingGenerated} style={{ gap: 8 }}>
            {loadingBriefing ? <Loader2 size={16} strokeWidth={1.75} color="white" style={{ animation: 'spin 0.8s linear infinite' }} /> : <Sparkles size={16} strokeWidth={1.75} color="white" />}
            {loadingBriefing ? 'Generating…' : briefingGenerated ? 'Briefing Ready' : `Generate AI ${role === 'exec' ? 'Executive' : role === 'store_manager' ? 'Store' : 'Category'} Briefing`}
          </button>
        </div>
      </div>
      {anomalies.length > 0 ? (
        <div className="alert-strip mb-6">
          {anomalies.map((a: any) => {
            const isResolved = resolvedAnomalies[a.id];
            return (
              <div
                key={a.id}
                className={`alert-item`}
                onClick={() => {
                  if (!isResolved) {
                    setSelectedAnomaly(selectedAnomaly === a.id ? null : a.id);
                  }
                }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  background: isResolved ? 'var(--success-light)' : a.severity === 'high' ? 'var(--danger-light)' : 'var(--warning-light)',
                  borderColor: isResolved ? 'rgba(16, 185, 129, 0.25)' : a.severity === 'high' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(245, 158, 11, 0.25)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px',
                  transition: 'var(--transition)',
                  cursor: isResolved ? 'default' : 'pointer'
                }}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 w-full" style={{ minHeight: 36 }}>
                  {/* Icon Container */}
                  <div style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: isResolved ? 'rgba(16, 185, 129, 0.12)' : a.severity === 'high' ? 'rgba(239, 68, 68, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isResolved ? (
                      <CheckCircle2 {...ICON_SUCCESS} />
                    ) : a.severity === 'high' ? (
                      <AlertCircle {...ICON_DANGER} />
                    ) : (
                      <AlertTriangle {...ICON_WARNING} />
                    )}
                  </div>

                  {/* Severity Badge */}
                  <span className={`badge ${isResolved ? 'badge-success' : a.severity === 'high' ? 'badge-danger' : 'badge-warning'}`} style={{
                    minWidth: 76,
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isResolved ? 'Resolved' : a.severity}
                  </span>

                  {/* Title & Description */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, paddingLeft: 4 }}>
                    <div className="alert-title" style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {isResolved ? `${a.title} (Resolved)` : a.title}
                    </div>
                    <div className="alert-desc" style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {isResolved ? (ANOMALY_DETAILS[a.id]?.resolvedMessage || a.description) : a.description}
                    </div>
                  </div>

                  {/* Financial Impact */}
                  {a.impact_value > 0 && (
                    <div className="alert-impact" style={{ 
                      textAlign: 'right', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 2,
                      textDecoration: isResolved ? 'line-through' : undefined, 
                      opacity: isResolved ? 0.5 : 1,
                      flexShrink: 0
                    }}>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {isResolved ? 'Mitigated' : a.impact_label}
                      </div>
                      <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {fmt.currency(a.impact_value)}
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded Action Panel */}
                {selectedAnomaly === a.id && !isResolved && (
                  <div
                    className="w-full mt-1 animate-slide"
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid',
                      borderColor: a.severity === 'high' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 16
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="anomaly-drawer-grid">
                      <div>
                        <div style={{ 
                          fontSize: '0.6875rem', 
                          color: a.severity === 'high' ? 'var(--danger)' : 'var(--warning)', 
                          fontWeight: 700, 
                          textTransform: 'uppercase', 
                          letterSpacing: '0.06em', 
                          marginBottom: 6,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6
                        }}>
                          <Info size={12} strokeWidth={2} />
                          AI Root Cause Diagnostic
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                          {ANOMALY_DETAILS[a.id]?.rootCause}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 12 }}>
                        <div>
                          <div style={{ 
                            fontSize: '0.6875rem', 
                            color: 'var(--success)', 
                            fontWeight: 700, 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.06em', 
                            marginBottom: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6
                          }}>
                            <Lightbulb size={12} strokeWidth={2} />
                            AI Recommended Action
                          </div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.6 }}>
                            {ANOMALY_DETAILS[a.id]?.recommendation}
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                          <button
                            className="btn btn-primary btn-sm animate-scale"
                            onClick={(e) => { e.stopPropagation(); executeResolution(a.id); }}
                            disabled={resolvingId === a.id}
                            style={{ 
                              height: 34, 
                              fontSize: '0.75rem', 
                              gap: 6, 
                              boxShadow: '0 0 10px rgba(0, 120, 255, 0.2)' 
                            }}
                          >
                            {resolvingId === a.id ? (
                              <>
                                <Loader2 size={12} strokeWidth={2} style={{ animation: 'spin 0.8s linear infinite' }} />
                                <span>Executing decision...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={12} strokeWidth={1.75} color="currentColor" />
                                <span>{ANOMALY_DETAILS[a.id]?.actionLabel}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="alert-strip mb-6" style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', color: 'var(--text-secondary)' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.875rem' }}>
            <CheckCircle2 size={16} strokeWidth={1.75} color="#10B981" />
            <span>No active anomalies detected in this scope. Operations running as scheduled.</span>
          </div>
        </div>
      )}
      {kpi && Object.keys(kpi).length > 0 && (
        <div className="kpi-grid mb-6">
          {KPI_CONFIG.map(({ key, label, Icon, format, invertPositive }) => {
            const metric = kpi[key];
            if (!metric) return null;
            let finalLabel = label;
            if (role === 'category_manager') {
              if (key === 'revenue') finalLabel = `${activeCategory} Rev`;
              if (key === 'waste_units') finalLabel = `${activeCategory} Waste`;
            }
            return <KPICard key={key} label={finalLabel} value={metric.value} wow={metric.wow} format={format} Icon={Icon} invertPositive={invertPositive} />;
          })}
        </div>
      )}
      {briefing && !briefing.error && (
        <div className="card mb-6 animate-slide" style={{ borderColor: 'var(--border-accent)' }}>
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="ai-orb"><Sparkles size={13} strokeWidth={1.75} color="white" /></div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>AI {role === 'exec' ? 'Executive' : role === 'store_manager' ? 'Store' : 'Category'} Briefing</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Gemini · Scope: {role === 'exec' ? 'National' : role === 'store_manager' ? storeObj?.name : activeCategory}</div>
              </div>
            </div>
            <span className="badge badge-accent">Live</span>
          </div>
          <p style={{ marginBottom: 20, fontSize: '0.9375rem', lineHeight: 1.7, color: 'var(--text-secondary)' }}>{briefing.summary}</p>
          <div className="grid-3" style={{ gap: 16 }}>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8 }}>Key Insights</p>
              {briefing.insights?.map((ins: any, idx: number) => {
                const Icon = INSIGHT_ICON[ins.type] || Info;
                const color = INSIGHT_COLOR[ins.type] || '#8B9DC3';
                return (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <Icon size={15} strokeWidth={1.75} color={color} style={{ flexShrink: 0, marginTop: 1 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{ins.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{ins.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: 8 }}>Risks</p>
              {briefing.risks?.map((r: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                  <ShieldAlert size={15} strokeWidth={1.75} color="#EF4444" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{r.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>
            <div>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)', marginBottom: 8 }}>Opportunities</p>
              {briefing.opportunities?.map((o: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--success-light)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                  <Lightbulb size={15} strokeWidth={1.75} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{o.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{o.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="grid-2-1 mb-6">
        <div className="card">
          <div className="card-header"><span className="card-title">Revenue Trend — Last 14 Days</span></div>
          <div className="chart-container" style={{ height: 200 }}>
            <Line data={lineData} options={{ ...CHART_DEFAULTS, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 }, callback: (v: any) => `£${(v/1000).toFixed(0)}K` } } } }} />
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">{secondChartTitle}</span></div>
          <div className="chart-container" style={{ height: 200 }}>
            <Bar data={secondChartData} options={{ ...CHART_DEFAULTS, indexAxis: 'y' as const, scales: { x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 }, callback: (v: any) => `£${(v/1000).toFixed(0)}K` } }, y: { grid: { display: false }, ticks: { color: '#8B9DC3', font: { size: 10 } } } } }} />
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            {role === 'category_manager' ? `Subcategory Performance — ${activeCategory} Revenue (Last 7 Days)` : 'Category Performance — Revenue (Last 7 Days)'}
          </span>
        </div>
        <div className="chart-container" style={{ height: 180 }}>
          <Bar data={catData} options={{ ...CHART_DEFAULTS, scales: { x: { grid: { display: false }, ticks: { color: '#8B9DC3', font: { size: 11 } } }, y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#4A5A7A', font: { size: 10 }, callback: (v: any) => `£${(v/1000).toFixed(0)}K` } } } }} />
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, wow, format, Icon, invertPositive }: any) {
  const rawPositive = wow >= 0;
  const positive    = invertPositive ? !rawPositive : rawPositive;
  return (
    <div className="kpi-card animate-slide">
      <div className="kpi-icon" style={{ background: positive ? 'var(--success-light)' : 'var(--danger-light)' }}>
        <Icon size={18} strokeWidth={1.75} color={positive ? '#10B981' : '#EF4444'} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {format === 'currency' ? fmt.currency(value)
          : format === 'pct'  ? fmt.pct(value)
          : fmt.int(value)}
      </div>
      <div className={`kpi-change ${positive ? 'positive' : 'negative'}`}
        style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {positive
          ? <TrendingUp  size={13} strokeWidth={2} color="currentColor" />
          : <TrendingDown size={13} strokeWidth={2} color="currentColor" />
        }
        {Math.abs(wow * 100).toFixed(1)}% vs prior week
      </div>
    </div>
  );
}

const INSIGHT_ICON: Record<string, any> = {
  positive: CheckCircle2,
  negative: AlertTriangle,
  neutral:  Info,
};
const INSIGHT_COLOR: Record<string, string> = {
  positive: '#10B981',
  negative: '#F59E0B',
  neutral:  '#06B6D4',
};


