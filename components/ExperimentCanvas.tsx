'use client';
import { useState } from 'react';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Sparkles, 
  Layers, 
  TrendingUp, 
  Cpu, 
  FileText, 
  HelpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { CognixExperiment } from '@/config/experiments';
import CommitmentIntelligence from '@/components/CommitmentIntelligence';
import DecisionRippleIntelligence from '@/components/DecisionRippleIntelligence';

interface ExperimentCanvasProps {
  experiment: CognixExperiment;
  onBackToPortfolio: () => void;
}

export default function ExperimentCanvas({
  experiment,
  onBackToPortfolio
}: ExperimentCanvasProps) {
  const [activeTab, setActiveTab] = useState<'demo' | 'narrative' | 'evidence' | 'learnings'>('demo');

  const renderInteractiveDemo = () => {
    switch (experiment.id) {
      case 'EXP-COMMITMENT-01':
        return <CommitmentIntelligence />;
      case 'EXP-RIPPLE-02':
        return <DecisionRippleIntelligence />;
      default:
        return (
          <div className="empty-state" style={{ minHeight: 380 }}>
            <Sparkles size={40} color="var(--cognix-violet)" style={{ opacity: 0.8 }} />
            <h3 style={{ marginTop: 16 }}>{experiment.name} Concept Canvas</h3>
            <p style={{ maxWidth: 500, margin: '8px auto 0' }}>
              This experiment is currently at <strong>{experiment.maturity}</strong> maturity. The blueprint architecture and causal data models are defined below.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="page-content animate-fade" style={{ paddingBottom: 40 }}>
      {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          onClick={onBackToPortfolio}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={14} /> Back to Innovation Portfolio
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
            {experiment.maturity}
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-card)', padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
            {experiment.ipClassification}
          </span>
        </div>
      </div>

      {/* ── Experiment Header Card ───────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px 32px',
        marginBottom: 24
      }}>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 6 }}>
          EXPERIMENT ID: {experiment.id} · VERSION {experiment.version}
        </div>
        
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
          {experiment.name}
        </h1>

        {/* Provocative Question Banner */}
        <div style={{
          background: 'rgba(139,92,246,0.08)',
          borderLeft: '4px solid var(--cognix-violet)',
          padding: '14px 18px',
          borderRadius: '0 var(--radius-md) var(--radius-md) 0',
          marginBottom: 20
        }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--cognix-violet)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
            Provocative Executive Question
          </div>
          <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            "{experiment.provocativeQuestion}"
          </div>
        </div>

        {/* Canvas Navigation Tabs */}
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
          <button
            onClick={() => setActiveTab('demo')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: activeTab === 'demo' ? '1px solid var(--g10x-blue)' : '1px solid transparent',
              background: activeTab === 'demo' ? 'rgba(0,102,255,0.12)' : 'none',
              color: activeTab === 'demo' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Layers size={14} /> Interactive Demonstration
          </button>

          <button
            onClick={() => setActiveTab('narrative')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: activeTab === 'narrative' ? '1px solid var(--g10x-blue)' : '1px solid transparent',
              background: activeTab === 'narrative' ? 'rgba(0,102,255,0.12)' : 'none',
              color: activeTab === 'narrative' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <FileText size={14} /> Concept & Business Blueprint
          </button>

          <button
            onClick={() => setActiveTab('evidence')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: activeTab === 'evidence' ? '1px solid var(--g10x-blue)' : '1px solid transparent',
              background: activeTab === 'evidence' ? 'rgba(0,102,255,0.12)' : 'none',
              color: activeTab === 'evidence' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Cpu size={14} /> Telemetry & Evidence ({experiment.confidenceScore}%)
          </button>

          <button
            onClick={() => setActiveTab('learnings')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              border: activeTab === 'learnings' ? '1px solid var(--g10x-blue)' : '1px solid transparent',
              background: activeTab === 'learnings' ? 'rgba(0,102,255,0.12)' : 'none',
              color: activeTab === 'learnings' ? 'var(--g10x-blue)' : 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <Clock size={14} /> Innovation Knowledge
          </button>
        </div>
      </div>

      {/* ── Tab Views ─────────────────────────────────────────────────────── */}
      {activeTab === 'demo' && (
        <div>{renderInteractiveDemo()}</div>
      )}

      {activeTab === 'narrative' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left Column: Problem & Paradigm */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              1. The Problem Statement
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 20 }}>
              {experiment.problemStatement}
            </p>

            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
              2. How Industry Operates Today
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {experiment.industryToday}
            </p>
          </div>

          {/* Right Column: CogniX Innovation & ROI */}
          <div className="card">
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--g10x-blue)', marginBottom: 14 }}>
              3. The CogniX Innovation Hypothesis
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {experiment.cognixInnovation}
            </p>

            <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Quantified Commercial ROI
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Financial Upside</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--cognix-emerald)' }}>{experiment.businessValue.financialUpside}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Operational Gain</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--g10x-blue)' }}>{experiment.businessValue.operationalMetric}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'evidence' && (
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Underlying Telemetry & AI Intelligence
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
                Data Telemetry Sources
              </h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {experiment.evidenceSources.map(src => (
                  <li key={src} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', padding: '6px 0', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CheckCircle2 size={14} color="var(--cognix-emerald)" /> {src}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10 }}>
                AI & Analytical Engines
              </h4>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {experiment.intelligenceUsed.map(tech => (
                  <span key={tech} className="badge badge-blue" style={{ fontSize: '0.75rem', padding: '6px 12px' }}>
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'learnings' && (
        <div className="card">
          <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
            Executive Feedback & Demonstration History
          </h3>
          {experiment.learnings.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
              No executive demo feedback recorded for this concept yet.
            </div>
          ) : (
            experiment.learnings.map((ln, idx) => (
              <div key={idx} style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Date: {ln.date}</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>"{ln.clientFeedbackSummary}"</div>
                {ln.keyInsights.map((ins, i) => (
                  <div key={i} style={{ fontSize: '0.8125rem', color: 'var(--g10x-blue)' }}>· {ins}</div>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
