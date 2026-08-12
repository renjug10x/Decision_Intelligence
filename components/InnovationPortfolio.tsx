'use client';
import { useState } from 'react';
import { 
  FlaskConical, 
  HelpCircle, 
  ArrowRight, 
  Box,
  ChevronRight
} from 'lucide-react';
import { EXPERIMENT_REGISTRY } from '@/config/experiments';
import { DEMONSTRATION_SOLUTIONS } from '@/config/solutions';

interface InnovationPortfolioProps {
  onSelectExperiment: (experimentId: string) => void;
  onSelectSolution: (solutionId: string) => void;
  onNavigateToCuriosity: () => void;
}

export default function InnovationPortfolio({
  onSelectExperiment,
  onSelectSolution,
  onNavigateToCuriosity
}: InnovationPortfolioProps) {
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'EXPERIMENTS' | 'SOLUTIONS'>('ALL');

  return (
    <div className="page-content animate-fade" style={{ paddingBottom: 48, maxWidth: 1140, margin: '0 auto' }}>
      
      {/* ── ZONE A: Editorial Hero & Featured Curiosity Question ──────────────── */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          What should your business be questioning today?
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 680, marginBottom: 20 }}>
          Rehearse decisions, uncover commitment drift, and explore reusable enterprise capabilities.
        </p>

        {/* Featured Question Card (CogniX Curiosity Signature) */}
        <div 
          onClick={onNavigateToCuriosity}
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderLeft: '4px solid var(--g10x-orange)',
            borderRadius: 'var(--radius-md)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>
              Featured Executive Question
            </div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              "What if the enterprise could detect a broken customer promise 14 days before the delivery fails?"
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--g10x-orange)', fontSize: '0.8125rem', fontWeight: 500, flexShrink: 0, marginLeft: 16 }}>
            Explore <ChevronRight size={14} />
          </div>
        </div>
      </div>

      {/* ── Filter Bar ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        <button
          onClick={() => setSelectedCategory('ALL')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: selectedCategory === 'ALL' ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
            background: selectedCategory === 'ALL' ? 'var(--curiosity-light)' : '#FFFFFF',
            color: selectedCategory === 'ALL' ? 'var(--g10x-orange)' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          All
        </button>
        <button
          onClick={() => setSelectedCategory('EXPERIMENTS')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: selectedCategory === 'EXPERIMENTS' ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
            background: selectedCategory === 'EXPERIMENTS' ? 'var(--curiosity-light)' : '#FFFFFF',
            color: selectedCategory === 'EXPERIMENTS' ? 'var(--g10x-orange)' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          Experiments ({EXPERIMENT_REGISTRY.length})
        </button>
        <button
          onClick={() => setSelectedCategory('SOLUTIONS')}
          style={{
            padding: '5px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: '0.75rem',
            fontWeight: 500,
            border: selectedCategory === 'SOLUTIONS' ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
            background: selectedCategory === 'SOLUTIONS' ? 'var(--curiosity-light)' : '#FFFFFF',
            color: selectedCategory === 'SOLUTIONS' ? 'var(--g10x-orange)' : 'var(--text-secondary)',
            cursor: 'pointer'
          }}
        >
          Solutions ({DEMONSTRATION_SOLUTIONS.length})
        </button>
      </div>

      {/* ── ZONE B: Innovation Experiments Grid ───────────────────────────────── */}
      {(selectedCategory === 'ALL' || selectedCategory === 'EXPERIMENTS') && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <FlaskConical size={16} color="var(--g10x-orange)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Innovation Experiments
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {EXPERIMENT_REGISTRY.map(exp => (
              <div
                key={exp.id}
                onClick={() => onSelectExperiment(exp.id)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ 
                      fontSize: '0.625rem', 
                      fontWeight: 500, 
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}>
                      {exp.maturity}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {exp.name}
                  </h3>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 14 }}>
                    "{exp.provocativeQuestion}"
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--g10x-orange)', fontSize: '0.8125rem', fontWeight: 500 }}>
                  Explore <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ZONE C: Demonstration Solutions Strip ───────────────────────────── */}
      {(selectedCategory === 'ALL' || selectedCategory === 'SOLUTIONS') && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Box size={16} color="var(--text-primary)" />
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              Demonstration Solutions
            </h2>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>— Ready to interact</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {DEMONSTRATION_SOLUTIONS.map(sol => (
              <div
                key={sol.id}
                onClick={() => onSelectSolution(sol.id)}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 8 }}>
                    {sol.businessDomain}
                  </div>

                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {sol.name}
                  </h3>

                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4, marginBottom: 14 }}>
                    {sol.fiveSecondProposition}
                  </p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', fontSize: '0.8125rem', fontWeight: 500 }}>
                  Open Solution <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
