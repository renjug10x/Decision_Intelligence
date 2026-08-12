'use client';
import { useState } from 'react';
import { 
  HelpCircle, 
  ChevronRight,
  Box,
  FlaskConical
} from 'lucide-react';

interface CuriosityQuestion {
  id: string;
  question: string;
  category: string;
  whyAsking: string;
  targetExperimentId: string;
  targetExperimentName: string;
  targetSolutionId: string;
  targetSolutionName: string;
  summaryNarrative: string;
  evidencePoints: string[];
}

const CURIOSITY_QUESTIONS: CuriosityQuestion[] = [
  {
    id: 'Q001',
    question: 'What if the enterprise could detect a broken promise 14 days before the customer experiences it?',
    category: 'Commitment & Operations',
    whyAsking: 'Promotional demand is accelerating +22%, but supplier lead times limit fulfillment to +10%. Without intervention, 1,400 cases will miss delivery SLAs in week 3.',
    targetExperimentId: 'EXP-COMMITMENT-01',
    targetExperimentName: 'Commitment Intelligence',
    targetSolutionId: 'SOL-PROMO-01',
    targetSolutionName: 'Promotion Intelligence',
    summaryNarrative: 'Marketing campaign demand forecasts (+22%) accurately predict shopper volume, but supplier capacity caps (+10%) create an un-reconciled 1,400-unit deficit in week 3.',
    evidencePoints: [
      'Demand Forecast: +22% (14,200 cases predicted)',
      'Supplier SLA Cap: +10% (12,800 cases maximum)',
      'Projected Out-of-Stock Deficit: 1,400 cases'
    ]
  },
  {
    id: 'Q002',
    question: 'What happens everywhere else when Commercial increases promotional spend by 15%?',
    category: 'Decision Ripples',
    whyAsking: 'Promotional surges generate direct top-line growth but create 2nd-order warehouse overtime and 3rd-order net margin compression via emergency freight fees.',
    targetExperimentId: 'EXP-RIPPLE-02',
    targetExperimentName: 'Decision Ripple Intelligence',
    targetSolutionId: 'SOL-DEMAND-02',
    targetSolutionName: 'Demand & Forecast Intelligence',
    summaryNarrative: 'Boosting promo spend by 15% generates a 1st-order sales surge (+18%), but triggers a 2nd-order DC labor bottleneck (+35% overtime) and a 3rd-order margin compression (-2.2%).',
    evidencePoints: [
      '1st Order: £480K Gross Revenue Lift',
      '2nd Order: £32K DC Labor Overtime Expense',
      '3rd Order: -2.2% Net Margin Compression'
    ]
  },
  {
    id: 'Q003',
    question: 'Have we encountered this supplier lead-time constraint in past campaigns?',
    category: 'Enterprise Memory',
    whyAsking: 'Historical campaign patterns contain verified flex rules. In Q2 2025 (Campaign 18), flexing secondary supplier SLA Rule #4 resolved the exact same 12% gap.',
    targetExperimentId: 'EXP-MEMORY-03',
    targetExperimentName: 'Enterprise Memory Foundation',
    targetSolutionId: 'SOL-INV-03',
    targetSolutionName: 'Predictive Inventory Intelligence',
    summaryNarrative: 'During Campaign 18 in Q2 2025, a similar supplier lead-time drift occurred. Activating Secondary Supplier SLA Flex Rule #4 protected store availability while containing waste variance to 4.8%.',
    evidencePoints: [
      'Historical Pattern Match: 91% Similarity to Campaign 18',
      'Verified Intervention: Supplier Flex Rule #4',
      'Historical Result: Store Availability Maintained at 98.4%'
    ]
  },
  {
    id: 'Q004',
    question: 'Where is the enterprise confident for the wrong reason?',
    category: 'Opportunity Intelligence',
    whyAsking: 'POS forecasting confidence is high (92%), but un-monitored packaging lead times threaten supplier dispatch commitments.',
    targetExperimentId: 'EXP-OPPORTUNITY-04',
    targetExperimentName: 'Opportunity Intelligence',
    targetSolutionId: 'SOL-CAT-04',
    targetSolutionName: 'Category Intelligence',
    summaryNarrative: 'Demand planners report 92% confidence based on accurate point-of-sale data, but fail to account for supplier packaging lead-time constraints.',
    evidencePoints: [
      'POS Forecast Confidence: 92%',
      'Supplier Packaging Lead Time Risk: High'
    ]
  }
];

interface QuestionsWorthAskingProps {
  onSelectExperiment: (experimentId: string) => void;
  onSelectSolution: (solutionId: string) => void;
}

export default function QuestionsWorthAsking({
  onSelectExperiment,
  onSelectSolution
}: QuestionsWorthAskingProps) {
  const [activeQuestion, setActiveQuestion] = useState<CuriosityQuestion>(CURIOSITY_QUESTIONS[0]);

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
            const isSelected = activeQuestion.id === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setActiveQuestion(q)}
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
              {activeQuestion.whyAsking}
            </p>
          </div>

          <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Key Evidence Telemetry
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 20 }}>
            {activeQuestion.evidencePoints.map((ev, idx) => (
              <div key={idx} style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', padding: '6px 10px', background: '#FFFFFF', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                • {ev}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => onSelectSolution(activeQuestion.targetSolutionId)}
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
              onClick={() => onSelectExperiment(activeQuestion.targetExperimentId)}
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
