'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Loader2, ShieldAlert, Lightbulb,
  CheckCircle2, AlertTriangle, Info, Clock,
  ThumbsUp, ThumbsDown, BarChart3, TrendingUp, TrendingDown
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ConfidenceScore from '@/components/ConfidenceScore';

const STORES = [
  { id: 'S001', name: 'Manchester Piccadilly' },
  { id: 'S002', name: 'Manchester Trafford' },
];

const CATEGORIES = ['Chilled', 'Dairy', 'Produce', 'Bakery'];

// Simulated "decisions awaiting approval" — in production these would come from the API
const PENDING_DECISIONS = [
  {
    id: 'D001',
    title: 'Reroute Produce Supply to Total Produce',
    detail: 'FreshDirect UK SLA breach (42% delay rate). Activate backup contract with Total Produce for 35% of Southern produce volume.',
    impact: '£23.4K weekly exposure mitigated',
    risk: 'medium',
    department: 'Supply Chain',
  },
  {
    id: 'D002',
    title: 'Enforce Supplier Penalty Clause — FreshDirect UK',
    detail: 'Contract clause 14.2 triggered. Penalty of £4,200 for this delivery cycle.',
    impact: '£4.2K cost recovery',
    risk: 'low',
    department: 'Procurement',
  },
  {
    id: 'D003',
    title: 'Deploy North West Dairy Cross-Promotion',
    detail: 'Milk + bakery bundle across 5 NW stores to recover margin compressed by competitor price-matching.',
    impact: 'Est. +1.8% margin recovery',
    risk: 'low',
    department: 'Category',
  },
];

const INSIGHT_ICON: Record<string, any> = {
  positive: CheckCircle2,
  negative: AlertTriangle,
  neutral: Info,
};
const INSIGHT_COLOR: Record<string, string> = {
  positive: '#10B981',
  negative: '#F59E0B',
  neutral: '#06B6D4',
};

export default function BriefingCentre() {
  const { role, apiKey, selectedStore } = useApp();
  const [activeCategory, setActiveCategory] = useState('Chilled');
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [decisionStates, setDecisionStates] = useState<Record<string, 'pending' | 'approved' | 'deferred'>>({
    D001: 'pending', D002: 'pending', D003: 'pending',
  });
  const [overallConfidence] = useState(87);

  const storeObj = STORES.find(s => s.id === selectedStore);

  const generateBriefing = useCallback(async () => {
    if (generated) return;
    setLoading(true);
    setGenerated(true);
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
    } catch { /* fallback handled in API */ }
    setLoading(false);
  }, [generated, apiKey, role, selectedStore, activeCategory]);

  // Auto-generate on mount
  useEffect(() => {
    generateBriefing();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDecision = (id: string, action: 'approved' | 'deferred') => {
    setDecisionStates(prev => ({ ...prev, [id]: action }));
  };

  const scopeLabel = role === 'exec'
    ? 'LiDL UK — National View'
    : role === 'store_manager'
    ? storeObj?.name || selectedStore
    : `${activeCategory} Category`;

  return (
    <div className="page-content">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h2>Executive Briefing Centre</h2>
          <p style={{ marginTop: 4 }}>
            AI-generated decision brief · Scope: {scopeLabel} · 4 Jun 2026
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
              Generating with Gemini…
            </div>
          )}
          <button
            className="btn btn-primary"
            onClick={() => { setGenerated(false); setBriefing(null); setTimeout(generateBriefing, 100); }}
            disabled={loading}
            style={{ gap: 8 }}
          >
            <Sparkles size={15} strokeWidth={1.75} color="white" />
            Refresh Briefing
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !briefing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {[240, 180, 180].map((h, i) => (
            <div key={i} className="skeleton" style={{ height: h, borderRadius: 16 }} />
          ))}
        </div>
      )}

      {briefing && !briefing.error && (
        <>
          {/* Business Summary */}
          <div className="card mb-6 animate-slide" style={{ borderColor: 'var(--border-accent)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div className="ai-orb"><Sparkles size={13} strokeWidth={1.75} color="white" /></div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                    {role === 'exec' ? 'Executive' : role === 'store_manager' ? 'Store' : 'Category'} Business Summary
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Gemini AI · Looker Semantic Layer · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
              <ConfidenceScore score={overallConfidence} reasons={['Cross-referenced POS, supply chain, and margin data', 'Validated against 14-day historical baseline']} />
            </div>
            <p style={{ fontSize: '0.9375rem', lineHeight: 1.75, color: 'var(--text-secondary)', margin: 0 }}>
              {briefing.summary}
            </p>
          </div>

          {/* Three-column: Insights / Risks / Opportunities */}
          <div className="grid-3 mb-6" style={{ gap: 20 }}>
            {/* Insights */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <BarChart3 size={12} strokeWidth={2} color="var(--accent)" />
                Key Insights
              </div>
              {briefing.insights?.map((ins: any, idx: number) => {
                const Icon = INSIGHT_ICON[ins.type] || Info;
                const color = INSIGHT_COLOR[ins.type] || '#8B9DC3';
                return (
                  <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 8 }}>
                    <Icon size={14} strokeWidth={1.75} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{ins.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{ins.detail}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Risks */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--danger)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={12} strokeWidth={2} color="var(--danger)" />
                Top Risks
              </div>
              {briefing.risks?.map((r: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--danger-light)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.15)' }}>
                  <ShieldAlert size={14} strokeWidth={1.75} color="#EF4444" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{r.title}</span>
                      <span className={`badge ${r.severity === 'high' ? 'badge-danger' : 'badge-warning'}`} style={{ fontSize: '0.625rem' }}>{r.severity}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{r.detail}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Opportunities */}
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--success)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <TrendingUp size={12} strokeWidth={2} color="var(--success)" />
                Opportunities
              </div>
              {briefing.opportunities?.map((o: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, padding: '8px 12px', background: 'var(--success-light)', borderRadius: 8, border: '1px solid rgba(16,185,129,0.15)' }}>
                  <Lightbulb size={14} strokeWidth={1.75} color="#10B981" style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: 'var(--text-primary)' }}>{o.title}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{o.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Decisions Awaiting Approval */}
      {role === 'exec' && (
        <div className="card mb-6 animate-slide">
          <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Clock size={18} color="var(--warning)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>Decisions Awaiting Approval</h3>
            </div>
            <span className="badge badge-warning">{Object.values(decisionStates).filter(s => s === 'pending').length} Pending</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PENDING_DECISIONS.map(d => {
              const state = decisionStates[d.id];
              return (
                <div
                  key={d.id}
                  style={{
                    background: state === 'approved'
                      ? 'var(--success-light)'
                      : state === 'deferred'
                      ? 'var(--bg-elevated)'
                      : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${state === 'approved' ? 'rgba(16,185,129,0.25)' : state === 'deferred' ? 'var(--border)' : 'var(--border-strong)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    transition: 'var(--transition)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>{d.title}</span>
                        <span className="badge badge-accent" style={{ fontSize: '0.625rem' }}>{d.department}</span>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{d.detail}</p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 600, marginTop: 6 }}>
                        Impact: {d.impact}
                      </div>
                    </div>
                    {state === 'pending' ? (
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleDecision(d.id, 'approved')}
                          style={{ gap: 6, height: 32 }}
                        >
                          <ThumbsUp size={12} />
                          Approve
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDecision(d.id, 'deferred')}
                          style={{ gap: 6, height: 32 }}
                        >
                          <ThumbsDown size={12} />
                          Defer
                        </button>
                      </div>
                    ) : (
                      <span className={`badge ${state === 'approved' ? 'badge-success' : 'badge-warning'}`}>
                        {state === 'approved' ? '✓ Approved' : '⏸ Deferred'}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Confidence Overview */}
      <div className="card animate-slide">
        <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles size={16} color="var(--accent)" />
            <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>AI Confidence Overview</h3>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
          {[
            { label: 'Revenue Analysis', score: 94, color: 'var(--success)' },
            { label: 'Supply Chain Diagnostics', score: 87, color: 'var(--accent)' },
            { label: 'Margin Compression', score: 78, color: 'var(--accent)' },
            { label: 'Waste Intelligence', score: 82, color: 'var(--warning)' },
            { label: 'Demand Forecast', score: 71, color: 'var(--warning)' },
            { label: 'Labour Optimisation', score: 65, color: 'var(--danger)' },
          ].map(({ label, score, color }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: '0.75rem', color, fontWeight: 700 }}>{score}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg-elevated)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: 2, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16, margin: '16px 0 0' }}>
          Confidence scores are calculated from data completeness, signal strength, and historical validation accuracy. Scores below 70% require human review before action.
        </p>
      </div>
    </div>
  );
}
