/**
 * Curiosity question registry — the ADR-046 migration target.
 *
 * These records were literals inside `components/QuestionsWorthAsking.tsx`. They are real
 * capability knowledge: they name experiments, solutions and quantified evidence, and while
 * they lived in a component they were unsearchable, unreferenceable from any other surface,
 * and invisible to Atlas retrieval.
 *
 * Content moved verbatim. The component is now a renderer (AC-ATL-02-5: no behavioural change).
 */

export interface CuriosityQuestion {
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

export const CURIOSITY_QUESTIONS: CuriosityQuestion[] = [] = [
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
      '1st-Order Lift: +18% Sales Surge',
      '2nd-Order DC Bottleneck: +35% Overtime',
      '3rd-Order Margin Impact: -2.2% Margin Compression'
    ]
  },
  {
    id: 'Q003',
    question: 'Why did the exact same promotion fail in Manchester while succeeding in London?',
    category: 'Institutional Memory',
    whyAsking: 'Local store managers applied regional markdowns manually without consulting historical precedent from the Q3 promotion campaign.',
    targetExperimentId: 'EXP-MEMORY-03',
    targetExperimentName: 'Enterprise Memory Foundation',
    targetSolutionId: 'SOL-INV-03',
    targetSolutionName: 'Predictive Inventory Intelligence',
    summaryNarrative: 'Manchester store ops lacked regional warehouse lead-time visibility during fresh product launches, causing local stockout events.',
    evidencePoints: [
      'Manchester Stockout: Day 2 of Campaign',
      'London Stockout Rate: 0%',
      'Root Cause: DC Lead-Time Variance'
    ]
  },
  {
    id: 'Q004',
    question: 'Where is uncaptured margin hiding between high forecast accuracy and actual store sales?',
    category: 'Opportunity Discovery',
    whyAsking: 'Demand planners report 92% confidence based on accurate point-of-sale data, but fail to account for supplier packaging lead-time constraints.',
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

export function getCuriosityQuestions(): CuriosityQuestion[] {
  return CURIOSITY_QUESTIONS;
}

export function getCuriosityQuestionById(id: string): CuriosityQuestion | null {
  return CURIOSITY_QUESTIONS.find(q => q.id === id) ?? null;
}
