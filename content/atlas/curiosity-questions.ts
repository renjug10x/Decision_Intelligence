/**
 * Curiosity question registry - first-class governed knowledge objects.
 *
 * Owner decision, 2026-08-20: a Question Worth Asking is governed knowledge in its own right,
 * carrying many-to-many relationships to solutions, experiments AND capabilities.
 *
 * Two rules govern the relationships, and the second is the load-bearing one:
 *
 *   - `related_solutions` and `related_experiments` PRESERVE the provenance these questions have
 *     always carried. Nothing was dropped or re-derived.
 *
 *   - `related_capabilities` are EXPLICIT ONLY. A capability link is never inferred from a shared
 *     solution or experiment: SOL-PROMO-01 is demonstrated by several capabilities, so deriving
 *     links transitively would attach a question to capabilities it does not ask about. Every link
 *     carries a written rationale grounded in the question's own semantics or stated evidence.
 *
 * Content is unchanged from the ADR-046 migration; only the model around it has been upgraded.
 */

import type { CuriosityQuestion } from '../../packages/contracts/src/capability-atlas-model';

export type { CuriosityQuestion };

export const CURIOSITY_QUESTIONS: CuriosityQuestion[] = [
  {
    question_id: 'Q001',
    question:
      'What if the enterprise could detect a broken promise 14 days before the customer experiences it?',
    category: 'Commitment & Operations',
    why_asking:
      'Promotional demand is accelerating +22%, but supplier lead times limit fulfillment to +10%. Without intervention, 1,400 cases will miss delivery SLAs in week 3.',
    summary_narrative:
      'Marketing campaign demand forecasts (+22%) accurately predict shopper volume, but supplier capacity caps (+10%) create an un-reconciled 1,400-unit deficit in week 3.',
    evidence_points: [
      'Demand Forecast: +22% (14,200 cases predicted)',
      'Supplier SLA Cap: +10% (12,800 cases maximum)',
      'Projected Out-of-Stock Deficit: 1,400 cases'
    ],
    related_solutions: ['SOL-PROMO-01'],
    related_experiments: ['EXP-COMMITMENT-01'],
    related_capabilities: [
      {
        ref: 'CAP-COMMITMENT-INTELLIGENCE',
        rationale:
          'The question asks to detect a broken promise before the customer experiences it, which is the stated purpose of this capability.'
      },
      {
        ref: 'CAP-PROMOTION-INTELLIGENCE',
        rationale:
          'The stated evidence is promotional uplift against supplier capacity, which is the reconciliation this capability performs.'
      }
    ],
    owner: 'G10X Enterprise Innovation Lab',
    reviewed_at: '2026-08-20'
  },
  {
    question_id: 'Q002',
    question:
      'What happens everywhere else when Commercial increases promotional spend by 15%?',
    category: 'Decision Ripples',
    why_asking:
      'Promotional surges generate direct top-line growth but create 2nd-order warehouse overtime and 3rd-order net margin compression via emergency freight fees.',
    summary_narrative:
      'Boosting promo spend by 15% generates a 1st-order sales surge (+18%), but triggers a 2nd-order DC labor bottleneck (+35% overtime) and a 3rd-order margin compression (-2.2%).',
    evidence_points: [
      '1st-Order Lift: +18% Sales Surge',
      '2nd-Order DC Bottleneck: +35% Overtime',
      '3rd-Order Margin Impact: -2.2% Margin Compression'
    ],
    related_solutions: ['SOL-DEMAND-02'],
    related_experiments: ['EXP-RIPPLE-02'],
    related_capabilities: [
      {
        ref: 'CAP-DECISION-RIPPLE',
        rationale:
          'The question asks what happens everywhere else after a commercial decision, which is second- and third-order consequence propagation.'
      }
    ],
    owner: 'G10X Enterprise Innovation Lab',
    reviewed_at: '2026-08-20'
  },
  {
    question_id: 'Q003',
    question:
      'Why did the exact same promotion fail in Manchester while succeeding in London?',
    category: 'Institutional Memory',
    why_asking:
      'Local store managers applied regional markdowns manually without consulting historical precedent from the Q3 promotion campaign.',
    summary_narrative:
      'Manchester store ops lacked regional warehouse lead-time visibility during fresh product launches, causing local stockout events.',
    evidence_points: [
      'Manchester Stockout: Day 2 of Campaign',
      'London Stockout Rate: 0%',
      'Root Cause: DC Lead-Time Variance'
    ],
    related_solutions: ['SOL-INV-03'],
    related_experiments: ['EXP-MEMORY-03'],
    related_capabilities: [
      {
        ref: 'CAP-ENTERPRISE-MEMORY',
        rationale:
          'The stated cause is acting without consulting historical precedent, which is the recall this capability provides.'
      },
      {
        ref: 'CAP-LEARNING-PATTERN-REGISTRY',
        rationale:
          'Recognising that two regions ran the same promotion to different outcomes is situation-signature matching.'
      }
    ],
    owner: 'G10X Enterprise Innovation Lab',
    reviewed_at: '2026-08-20'
  },
  {
    question_id: 'Q004',
    question:
      'Where is uncaptured margin hiding between high forecast accuracy and actual store sales?',
    category: 'Opportunity Discovery',
    why_asking:
      'Demand planners report 92% confidence based on accurate point-of-sale data, but fail to account for supplier packaging lead-time constraints.',
    summary_narrative:
      'Demand planners report 92% confidence based on accurate point-of-sale data, but fail to account for supplier packaging lead-time constraints.',
    evidence_points: [
      'POS Forecast Confidence: 92%',
      'Supplier Packaging Lead Time Risk: High'
    ],
    related_solutions: ['SOL-CAT-04'],
    related_experiments: ['EXP-OPPORTUNITY-04'],
    related_capabilities: [
      {
        ref: 'CAP-OPPORTUNITY-INTELLIGENCE',
        rationale:
          'The question asks where uncaptured upside is hiding, which is favourable-variance detection.'
      },
      {
        ref: 'CAP-DECISION-GAP',
        rationale:
          'The stated evidence is a constraint preventing capture of forecast demand, which is the gap between emerging and executable opportunity.'
      }
    ],
    owner: 'G10X Enterprise Innovation Lab',
    reviewed_at: '2026-08-20'
  }
];

export function getCuriosityQuestions(): CuriosityQuestion[] {
  return CURIOSITY_QUESTIONS;
}

export function getCuriosityQuestionById(id: string): CuriosityQuestion | null {
  return CURIOSITY_QUESTIONS.find(q => q.question_id === id) ?? null;
}

/** Questions EXPLICITLY linked to a capability. Never resolved through SOL or EXP. */
export function getQuestionsForCapability(capabilityId: string): CuriosityQuestion[] {
  return CURIOSITY_QUESTIONS.filter(q => q.related_capabilities.some(r => r.ref === capabilityId));
}
