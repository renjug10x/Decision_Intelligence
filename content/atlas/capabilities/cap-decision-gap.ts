/**
 * Capability knowledge — CAP-DECISION-GAP (DDF-01 / P0-B).
 * ATL-02 seed content: sufficient to prove the contract, not an ATL-03 population.
 */
import type { CapabilityKnowledge } from '../../../packages/contracts/src/capability-atlas-model';

export const knowledge: CapabilityKnowledge = {
  capability_id: 'CAP-DECISION-GAP',
  description:
    'Decision Gap Intelligence distinguishes baseline forecast, contextualised demand, emerging demand frontier, executable demand frontier and exposed demand, and reports the monetary opportunity at risk with named, ranked binding constraints. It is explicitly not "forecast minus supplier capacity".',
  innovation_thesis:
    'Most planning systems can say what demand is coming. Few can say what the organisation is actually able to capture, and fewer still can name what is stopping it. The gap between those two numbers is where the commercial decision lives.',
  usage_instructions:
    'Open the Demand & Forecast surface and move the promotion depth control. The gap, the exposed demand and the binding constraints all recompute. Expand the gap card to see which constraint is binding and why.',
  testing_instructions:
    'Run `npx tsx tests/unit/run-ddf01-tests.ts`. The arithmetic-spine assertions verify that every unit, percentage point and pound resolves to one denominator, so the gap identity holds by construction.',
  field_status: [],
  architecture_narrative:
    'The engine consumes the IFI-01 contextualised outlook and reads supplier capacity from WP10-C derived impacts as a scale-free ratio. That ratio is what lets a read-only rule survive a population-boundary crossing without introducing a fourth capacity number.',
  architecture_flow: [
    'ContextualisedDecisionOutlook (IFI-01)',
    'DecisionDerivedImpacts capacity ratio (WP10-C, read-only)',
    'Emerging demand frontier',
    'Executable demand frontier',
    'Exposed demand and opportunity at risk',
    'Ranked binding constraints'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/demand-frontier/evaluate', purpose: 'Evaluate the Demand Decision Frontier including the decision gap' }
  ],
  contracts: [
    { name: 'DecisionGapAssessment', path: 'packages/contracts/src/demand-decision-frontier-model.ts', direction: 'out' },
    { name: 'ContextualisedDecisionOutlook', path: 'packages/contracts/src/intent-fusion-model.ts', direction: 'in' },
    { name: 'DecisionDerivedImpacts', path: 'packages/contracts/src/decision-state-model.ts', direction: 'in' }
  ],
  data_sources: [
    { name: 'Shared decision state', kind: 'synthetic', path: 'lib/decision-state-store.ts' }
  ],
  implementation_references: [
    { path: 'lib/demand-decision-frontier/demand-frontier-engine.ts', symbol: 'evaluateDecisionGap' },
    { path: 'packages/contracts/src/demand-decision-frontier-model.ts' },
    { path: 'app/api/v1/demand-frontier/evaluate/route.ts' },
    { path: 'components/Forecasting.tsx' }
  ],
  validation_evidence: [
    {
      kind: 'test',
      ref: 'tests/unit/run-ddf01-tests.ts',
      outcome: 'The gap identity holds by construction across the shared denominator; the promotion control genuinely moves the projection the frontier is built on.',
      observed_at: '2026-08-16',
      observed_by: 'DDF-01 integration pass'
    }
  ],
  test_runners: ['tests/unit/run-ddf01-tests.ts'],
  acceptance_criteria_refs: [],
  known_limitations: [
    {
      limitation: 'Absolute monetary figures are uncalibrated modelled values. The internal consistency of the comparison is the defensible claim, not the absolute pounds.',
      severity: 'medium'
    }
  ],
  open_defects: [],
  assumptions: ['Unit economics are declared rather than observed in the current estate.'],
  use_cases: [
    {
      title: 'Seeing what the organisation cannot capture',
      context: 'Demand is accelerating and the commercial team assumes the plan will absorb it.',
      outcome: 'The gap names the binding constraint and quantifies the exposure before the commitment is made.'
    }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'Problem → gap → constraint → consequence',
      audience: 'exec',
      duration_mins: 10,
      steps: [
        {
          action: 'Show the emerging versus executable trajectories',
          what_to_say: 'The distance between these two lines is the part of the opportunity we currently cannot serve.',
          what_to_show: 'The frontier chart with the gap area',
          expected_observation: 'A visible gap area, not two similar lines'
        },
        {
          action: 'Move the promotion depth control',
          what_to_say: 'The gap is computed, not drawn. Watch it respond.',
          what_to_show: 'Recomputation of gap and constraints',
          expected_observation: 'Gap, exposure and ranked constraints all change'
        }
      ],
      prerequisites: ['Retail & Grocery domain active'],
      warnings: ['Absolute monetary values are modelled and uncalibrated; present the ordering, not the pounds.'],
      follow_ups: ['CAP-DECISION-WINDOW', 'CAP-DECISION-REGRET']
    }
  ],
  questions_worth_asking: [],
  client_questions: [
    { question: 'Is this just forecast minus capacity?', audience: 'data_intelligence', difficulty: 'high' },
    { question: 'What is stopping us capturing the rest?', audience: 'exec', difficulty: 'low' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Constraint-bounded demand capture is a general commercial pattern.' },
    { domain_id: 'transport_logistics', applicability: 'hypothetical', rationale: 'Plausible under capacity constraints; not assessed.' }
  ],
  external_evidence: [],
  related_capabilities: [
    { ref: 'CAP-DECISION-REGRET', relation: 'complements' },
    { ref: 'CAP-DECISION-WINDOW', relation: 'complements' },
    { ref: 'CAP-DEMAND-FORECAST', relation: 'enables' },
    { ref: 'CAP-FORECAST-STABILITY', relation: 'depends-on' },
    { ref: 'CAP-SHARED-DECISION-STATE', relation: 'depends-on' }
  ],
  related_decisions: ['ADR-041'],
  related_governance: ['docs/governance/DEMAND_OBSERVABILITY_MODEL.md']
};
