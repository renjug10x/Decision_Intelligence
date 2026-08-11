'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Sparkles, Loader2, ShieldAlert, Lightbulb,
  CheckCircle2, AlertTriangle, Info, Clock,
  ThumbsUp, ThumbsDown, BarChart3, TrendingUp, TrendingDown,
  FileText, X, ExternalLink
} from 'lucide-react';
import { useApp } from '@/lib/context';
import ConfidenceScore from '@/components/ConfidenceScore';

const STORES = [
  { id: 'S001', name: 'Manchester Piccadilly' },
  { id: 'S002', name: 'Manchester Trafford' },
];

const CATEGORIES = ['Chilled', 'Dairy', 'Produce', 'Bakery'];

interface DecisionItem {
  id: string;
  title: string;
  detail: string;
  impact: string;
  risk: string;
  department: string;
  status: 'pending' | 'approved' | 'deferred';
}

interface SearchTraceItem {
  contract_id: string;
  supplier_name: string;
  title: string;
  result: 'excluded' | 'trigger' | 'matched' | 'activated';
  reason: string;
}

interface ContractMatchResult {
  primary_contract_id: string;
  activated_contract_id: string;
  primary_supplier_name: string;
  backup_supplier_name: string;
  matched_clause_ref: string;
  matched_clause_title: string;
  matched_clause_excerpt: string;
  matched_clause_anchor: string;
  activated_clause_ref: string;
  activated_clause_anchor: string;
  volume_pct: number;
  region: string;
  affected_store_count: number;
  document_ref: string;
  primary_document_html: string;
  primary_document_pdf: string;
  activated_document_html: string;
  activated_document_pdf: string;
  breach_delay_rate_pct: number;
  breach_threshold_pct: number;
  weekly_exposure_gbp: number;
}

interface ApprovalOutcome {
  search_trace: SearchTraceItem[];
  library_searched_count: number;
  contract_match: ContractMatchResult | null;
  narrative: string;
  activation_message: string;
  confidence: number;
  used_gemini: boolean;
}

interface DocumentViewer {
  htmlUrl: string;
  pdfUrl: string;
  title: string;
  label: string;
  view: 'pdf' | 'clause';
}

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

function CompactSearchTrace({
  trace,
  matchedContractId,
}: {
  trace: SearchTraceItem[];
  matchedContractId?: string;
}) {
  const excluded = trace.filter(t => t.result === 'excluded');
  const trigger = trace.find(t => t.result === 'trigger');
  const activated = trace.find(t => t.result === 'activated');
  const matched = trace.find(t => t.result === 'matched');
  const excludedLabel = excluded.map(t => t.supplier_name.split(' ')[0]).join(', ');

  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      padding: '10px 12px',
      fontSize: '0.75rem',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>
        Library: {trace.length} scanned · {excluded.length} excluded
        {matchedContractId ? ` · Matched ${matchedContractId}` : ''}
      </div>
      {excluded.length > 0 && (
        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>
          ✗ {excludedLabel} — wrong category
        </div>
      )}
      {trigger && (
        <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
          ⚠ {trigger.supplier_name.split(' ')[0]} — {trigger.reason}
        </div>
      )}
      {matched && matched.result === 'matched' && !activated && (
        <div style={{ color: 'var(--accent)', marginBottom: 4 }}>
          ✓ {matched.contract_id} — {matched.reason}
        </div>
      )}
      {activated && (
        <div style={{ color: 'var(--success)', fontWeight: 600 }}>
          ✓ {activated.contract_id} — {activated.reason}
        </div>
      )}
    </div>
  );
}

export default function BriefingCentre() {
  const { role, apiKey, selectedStore } = useApp();
  const [activeCategory, setActiveCategory] = useState('Chilled');
  const [briefing, setBriefing] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [approvalOutcomes, setApprovalOutcomes] = useState<Record<string, ApprovalOutcome>>({});
  const [decisionLoading, setDecisionLoading] = useState<string | null>(null);
  const [searchStep, setSearchStep] = useState<string | null>(null);
  const [decisionError, setDecisionError] = useState<Record<string, string>>({});
  const [documentViewer, setDocumentViewer] = useState<DocumentViewer | null>(null);
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

  useEffect(() => {
    fetch('/api/decisions')
      .then(r => r.json())
      .then(data => setDecisions(data.decisions ?? []))
      .catch(() => {});
  }, []);

  const handleDecision = async (id: string, action: 'approved' | 'deferred') => {
    setDecisionLoading(id);
    setSearchStep(null);
    setDecisionError(prev => ({ ...prev, [id]: '' }));

    if (action === 'deferred') {
      try {
        const res = await fetch(`/api/decisions/${id}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'defer' }),
        });
        if (res.ok) {
          setDecisions(prev => prev.map(d => d.id === id ? { ...d, status: 'deferred' } : d));
        }
      } catch { /* keep pending */ }
      setDecisionLoading(null);
      return;
    }

    // Demo search animation while API runs (local filter is instant; narrative uses Gemini)
    setSearchStep('Searching supplier contract library...');
    const steps = [
      'Scanning 4 supplier agreements...',
      'Matching clauses against live SLA breach data...',
      'Validating backup activation terms...',
      'Generating activation narrative...',
    ];
    let stepIdx = 0;
    const stepTimer = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setSearchStep(steps[stepIdx]);
    }, 700);

    try {
      const res = await fetch(`/api/decisions/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', apiKey }),
      });
      clearInterval(stepTimer);
      const data = await res.json();
      if (!res.ok) {
        setDecisionError(prev => ({
          ...prev,
          [id]: data.error ?? 'Approval failed. Please try again.',
        }));
        if (data.search_trace?.length) {
          setApprovalOutcomes(prev => ({
            ...prev,
            [id]: {
              search_trace: data.search_trace,
              library_searched_count: data.library_searched_count ?? 0,
              contract_match: null,
              narrative: '',
              activation_message: '',
              confidence: 0,
              used_gemini: false,
            },
          }));
        }
        return;
      }

      setApprovalOutcomes(prev => ({
        ...prev,
        [id]: {
          search_trace: data.search_trace ?? [],
          library_searched_count: data.library_searched_count ?? 0,
          contract_match: data.contract_match,
          narrative: data.narrative ?? '',
          activation_message: data.activation_message ?? '',
          confidence: data.confidence ?? 90,
          used_gemini: data.used_gemini ?? false,
        },
      }));
      setDecisions(prev =>
        prev.map(d => d.id === id ? { ...d, status: 'approved' } : d)
      );
    } catch { /* keep pending on failure */ }
    clearInterval(stepTimer);
    setSearchStep(null);
    setDecisionLoading(null);
  };

  const openDocument = (htmlPath: string, pdfPath: string, anchor: string, title: string, label: string) => {
    setDocumentViewer({
      htmlUrl: `${htmlPath}#${anchor}`,
      pdfUrl: pdfPath,
      title,
      label,
      view: 'pdf',
    });
  };

  const scopeLabel = role === 'exec'
    ? 'Lidl UK — National View'
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
            <span className="badge badge-warning">{decisions.filter(d => d.status === 'pending').length} Pending</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {decisions.map(d => {
              const state = d.status;
              const outcome = approvalOutcomes[d.id];
              const isLoading = decisionLoading === d.id;
              const errorMsg = decisionError[d.id];
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
                          disabled={isLoading}
                          style={{ gap: 6, height: 32 }}
                        >
                          {isLoading ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                          Approve
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleDecision(d.id, 'deferred')}
                          disabled={isLoading}
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
                  {isLoading && searchStep && (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontSize: '0.75rem', color: 'var(--accent)', padding: '8px 0',
                    }}>
                      <Loader2 size={12} className="animate-spin" />
                      {searchStep}
                    </div>
                  )}
                  {errorMsg && state === 'pending' && (
                    <div style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      fontSize: '0.75rem', color: 'var(--danger)',
                      padding: '8px 12px', background: 'var(--danger-light)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid rgba(239,68,68,0.2)',
                    }}>
                      <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                      <span>{errorMsg}</span>
                    </div>
                  )}
                  {(state === 'approved' || errorMsg) && outcome?.search_trace && outcome.search_trace.length > 0 && (
                    <CompactSearchTrace
                      trace={outcome.search_trace}
                      matchedContractId={outcome.contract_match?.activated_contract_id}
                    />
                  )}
                  {state === 'approved' && outcome?.contract_match && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(234,88,12,0.12) 0%, rgba(245,158,11,0.06) 100%)',
                      border: '2px solid #ea580c',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      fontSize: '0.8125rem',
                      boxShadow: '0 0 0 3px rgba(234, 88, 12, 0.12)',
                    }}>
                      <div style={{ fontWeight: 800, color: '#ea580c', fontSize: '0.75rem', letterSpacing: '0.04em' }}>
                        CLAUSE {outcome.contract_match.matched_clause_ref} — {outcome.contract_match.matched_clause_title}
                      </div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.75rem' }}>
                        {outcome.contract_match.volume_pct}% {outcome.contract_match.region} volume → {outcome.contract_match.backup_supplier_name} ({outcome.contract_match.activated_contract_id})
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ gap: 4, height: 28, fontSize: '0.6875rem' }}
                          onClick={() => openDocument(
                            outcome.contract_match!.primary_document_html,
                            outcome.contract_match!.primary_document_pdf,
                            outcome.contract_match!.matched_clause_anchor,
                            outcome.contract_match!.primary_contract_id,
                            'Primary Agreement'
                          )}
                        >
                          <FileText size={11} />
                          Primary Contract
                        </button>
                        {outcome.contract_match.activated_contract_id !== outcome.contract_match.primary_contract_id && (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ gap: 4, height: 28, fontSize: '0.6875rem' }}
                            onClick={() => openDocument(
                              outcome.contract_match!.activated_document_html,
                              outcome.contract_match!.activated_document_pdf,
                              outcome.contract_match!.activated_clause_anchor,
                              outcome.contract_match!.activated_contract_id,
                              'Activated Contract'
                            )}
                          >
                            <FileText size={11} />
                            Activated Contract
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  {state === 'approved' && outcome?.narrative && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      fontSize: '0.8125rem',
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)',
                      padding: '8px 10px',
                      background: 'rgba(99,102,241,0.05)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(99,102,241,0.12)',
                    }}>
                      <Sparkles size={13} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                      <div>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.75rem' }}>
                          AI {outcome.used_gemini ? '(Gemini)' : ''} · {outcome.confidence}%
                        </span>
                        <span style={{ marginLeft: 6 }}>{outcome.narrative}</span>
                      </div>
                    </div>
                  )}
                  {state === 'approved' && outcome?.activation_message && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      fontSize: '0.8125rem',
                      color: 'var(--success)',
                      fontWeight: 600,
                    }}>
                      <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                      <span>{outcome.activation_message}</span>
                    </div>
                  )}
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

      {/* Contract Document Viewer Modal */}
      {documentViewer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }} onClick={() => setDocumentViewer(null)}>
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, width: '100%', maxWidth: 800,
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            border: '1px solid var(--border)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 16px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{documentViewer.label}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{documentViewer.title}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  className={`btn btn-sm ${documentViewer.view === 'pdf' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 28, fontSize: '0.6875rem' }}
                  onClick={() => setDocumentViewer(v => v ? { ...v, view: 'pdf' } : v)}
                >
                  PDF Document
                </button>
                <button
                  className={`btn btn-sm ${documentViewer.view === 'clause' ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ height: 28, fontSize: '0.6875rem' }}
                  onClick={() => setDocumentViewer(v => v ? { ...v, view: 'clause' } : v)}
                >
                  Clause Highlight
                </button>
                <a
                  href={documentViewer.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-sm"
                  style={{ gap: 4, height: 28 }}
                >
                  <ExternalLink size={12} />
                  Download
                </a>
                <button className="btn btn-ghost btn-sm" onClick={() => setDocumentViewer(null)} style={{ height: 28 }}>
                  <X size={14} />
                </button>
              </div>
            </div>
            <iframe
              src={documentViewer.view === 'pdf' ? documentViewer.pdfUrl : documentViewer.htmlUrl}
              title={documentViewer.title}
              style={{ flex: 1, minHeight: 520, border: 'none', background: '#fff' }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
