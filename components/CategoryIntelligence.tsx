'use client';
import React, { useEffect, useState } from 'react';
import { Sparkles, Loader2, CheckCircle2, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Lock, XCircle } from 'lucide-react';
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
};

const ROOT_CAUSES: Record<string, string> = {
  Chilled:    'Supply delays from FreshDirect UK reducing shelf rotation — OOS on 4 SKUs',
  Produce:    'FreshDirect UK delivery failures — 45% delay rate, reducing availability',
  Dairy:      'Margin compression in North West; pricing below competitor benchmark',
  Bakery:     'In-store production shortfall; AM staffing gap on Tue/Wed',
  Frozen:     'Freezer aisle capacity constraints limiting range availability',
  Ambient:    'Strong performance — promo cannibalism on adjacent SKUs detected',
  BWS:        'Post-bank-holiday demand normalisation; expected seasonal pattern',
  'Non-food': 'Planned range reduction; clearance activity ongoing',
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

      {/* Category overview cards */}
      {catPerf.length > 0 && (
        <div className="grid-3 mb-6" style={{ gap: 12 }}>
          {catPerf.slice(0, 6).map((c: any) => (
            <div key={c.category} className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{c.category}</span>
                <span className={`badge ${c.revenue_wow >= 0 ? 'badge-success' : 'badge-danger'}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  {c.revenue_wow >= 0
                    ? <TrendingUp  size={10} strokeWidth={2} color="currentColor" />
                    : <TrendingDown size={10} strokeWidth={2} color="currentColor" />
                  }
                  {fmt.wow(c.revenue_wow)}
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                {fmt.currency(c.revenue)}
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{
                  width: `${Math.min(100, (c.revenue / (catPerf[0]?.revenue || 1)) * 100)}%`,
                  background: c.revenue_wow < 0 ? 'var(--danger)' : 'var(--accent)',
                }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                Margin: {fmt.pct(c.margin_pct)} · Waste: {c.waste_units.toLocaleString()} units
              </div>
            </div>
          ))}
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
                {skus.map((sku: any) => (
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
                      <td style={{ maxWidth: 220, color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                        {ROOT_CAUSES[sku.category] || 'Analysing…'}
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
                              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{ROOT_CAUSES[sku.category] || ROOT_CAUSES[activeCategory]}</div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
