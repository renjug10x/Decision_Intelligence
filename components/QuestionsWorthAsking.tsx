'use client';
import { useState, useEffect } from 'react';
import { 
  HelpCircle, 
  ChevronRight,
  Box,
  FlaskConical
} from 'lucide-react';
import { trackJourneyEvent } from '@/lib/journey-client';

// Capability knowledge moved to the Atlas content registry (ADR-046).
// This component renders the registry; it no longer authors the content.
import { CURIOSITY_QUESTIONS, type CuriosityQuestion } from '@/content/atlas/curiosity-questions';

interface QuestionsWorthAskingProps {
  onSelectExperiment: (experimentId: string) => void;
  onSelectSolution: (solutionId: string) => void;
}

export default function QuestionsWorthAsking({
  onSelectExperiment,
  onSelectSolution
}: QuestionsWorthAskingProps) {
  const [activeQuestion, setActiveQuestion] = useState<CuriosityQuestion>(CURIOSITY_QUESTIONS[0]);

  useEffect(() => {
    trackJourneyEvent({
      event_type: 'QUESTION_EXPLORED',
      source: 'QuestionsWorthAsking.tsx',
      page: 'curiosity',
      metadata: { question_id: activeQuestion.question_id, category: activeQuestion.category }
    });
  }, [activeQuestion]);

  const handleSelectQuestion = (q: CuriosityQuestion) => {
    setActiveQuestion(q);
  };

  return (
    <div className="page-content animate-fade" style={{ paddingBottom: 48, maxWidth: 1140, margin: '0 auto' }}>
      
      {/* Executive Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
          Questions Worth Asking
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', maxWidth: 660 }}>
          Proactive executive questions surfaced by evaluating operational signals across the enterprise.
        </p>
      </div>

      {/* Main Layout: Curiosity Question Cards + Progressive Disclosure Panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20 }}>
        
        {/* Left: Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {CURIOSITY_QUESTIONS.map(q => {
            const isSelected = activeQuestion.question_id === q.question_id;
            return (
              <div
                key={q.question_id}
                onClick={() => handleSelectQuestion(q)}
                style={{
                  background: '#FFFFFF',
                  border: isSelected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                  borderLeft: isSelected ? '4px solid var(--g10x-orange)' : '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  cursor: 'pointer',
                  boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                  transition: 'var(--transition)'
                }}
              >
                <div style={{ fontSize: '0.625rem', fontWeight: 500, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {q.category}
                </div>

                <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 10 }}>
                  "{q.question}"
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 500, color: isSelected ? 'var(--g10x-orange)' : 'var(--text-muted)' }}>
                  Inspect Evidence <ChevronRight size={13} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Progressive Evidence Reveal Panel */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: '24px',
          boxShadow: 'var(--shadow-sm)',
          position: 'sticky',
          top: 24,
          alignSelf: 'start'
        }}>
          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Why CogniX is Asking
          </div>

          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.4 }}>
            "{activeQuestion.question}"
          </h3>

          <div style={{ background: 'var(--bg-subtle)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginBottom: 18 }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {activeQuestion.why_asking}
            </p>
          </div>

          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Key Evidence Telemetry
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {activeQuestion.evidence_points.map((ev, idx) => (
              <div key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', padding: '6px 10px', background: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                • {ev}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onSelectSolution(activeQuestion.related_solutions[0])}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: '#FFFFFF',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontWeight: 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              Open Solution <ChevronRight size={13} />
            </button>

            <button
              onClick={() => onSelectExperiment(activeQuestion.related_experiments[0])}
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--g10x-orange)',
                color: '#FFFFFF',
                border: 'none',
                fontWeight: 500,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              Launch Experiment <ChevronRight size={13} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
