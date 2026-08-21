/**
 * Capability knowledge — CAP-DEMAND-FORECAST.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DEMAND-FORECAST',
  description:
    'Demand and Forecast Intelligence is the surface on which the four Demand Decision Frontier capabilities are presented: stability, gap, window and regret, over a multi-horizon projection.',
  innovation_thesis:
    'A forecast screen that only shows a forecast leaves the decision to the reader. The interesting surface shows whether the number is moving, what cannot be captured, how long there is, and what choosing wrongly costs.',
  usage_instructions:
    'Open Demand and Forecast. Four cards lead the surface. Move the scenario controls and all four recompute together from one evaluation.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ddf01-tests.ts (56 assertions) and npx tsx tests/unit/run-demand-language-tests.ts (21 assertions).',
  architecture_narrative:
    'The surface calls the demand frontier engine directly and renders one evaluation through four cards plus a trajectory chart, rather than issuing four independent queries.',
  architecture_flow: [
    'Scenario parameters',
    'One frontier evaluation',
    'Stability, gap, window, regret',
    'Trajectory chart with decision-frontier marker',
    'Intervention simulation'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/demand-frontier/evaluate', purpose: 'Evaluate the Demand Decision Frontier' }
  ],
  contracts: [
    { name: 'DemandDecisionFrontierEvaluation', path: 'packages/contracts/src/demand-decision-frontier-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'components/Forecasting.tsx', note: 'Surface' },
    { path: 'components/demand/DemandDecisionNarrative.tsx', note: 'Narrative panel' },
    { path: 'lib/demand-decision-frontier/demand-frontier-engine.ts', note: 'Engine' },
    { path: 'config/solutions.ts', note: 'SOL-DEMAND-02 registry entry' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ddf01-tests.ts', outcome: '56 assertions including the arithmetic spine and recomputation.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md', outcome: 'Independent reconciliation closed 15 integration defects before release.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-ddf01-tests.ts',
    'tests/unit/run-demand-language-tests.ts'
  ],
  acceptance_criteria_refs: [
    'AC-DDF-01'
  ],
  known_limitations: [
    { limitation: 'The registry five-second proposition cites 91 percent forecast confidence. Defect D-DDF-2 established that this was an unsupported backtest claim; do not present it as model accuracy.', severity: 'high' },
    { limitation: 'Demand Observability Level 0: the estate operates on synthetic and modelled demand throughout.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Reading a moving outlook as a decision', context: 'A planner has a forecast but no basis for acting on it.', outcome: 'Four decision cards replace a passive projection.' }
  ],
  demo_scenarios: [
    {
      path_type: 'ten-minute',
      title: 'Signal to decision in one surface',
      audience: 'exec',
      duration_mins: 10,
      steps: [
        { action: 'Read the four cards', what_to_say: 'Is it moving, what cannot we capture, how long have we got, what does choosing wrongly cost.', what_to_show: 'The four leading cards', expected_observation: 'Four distinct questions, one evaluation' },
        { action: 'Simulate an intervention', what_to_say: 'Everything recomputes. A failed recomputation shows unavailable, never a stale number.', what_to_show: 'Recomputation', expected_observation: 'All four cards move together' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'Do not repeat the 91 percent confidence figure from the registry: defect D-DDF-2 established it as unsupported.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'How accurate is the forecast?', audience: 'demand_planner', difficulty: 'high' },
    { question: 'Does this replace our forecasting platform?', audience: 'exec', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'proven', rationale: 'Registered applicable industry on SOL-DEMAND-02.' },
    { domain_id: 'restaurants_food', applicability: 'likely', rationale: 'Perishable demand with short decision windows fits the same frontier shape.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CATEGORY-INTELLIGENCE', relation: 'complements' },
    { ref: 'CAP-DECISION-GAP', relation: 'depends-on' },
    { ref: 'CAP-DECISION-TIMELINE', relation: 'complements' },
    { ref: 'CAP-FORECAST-STABILITY', relation: 'depends-on' }
  ],
  related_decisions: [
    'ADR-040',
    'ADR-041',
    'ADR-042',
    'ADR-043'
  ],
  related_governance: [
    'docs/governance/DEMAND_OBSERVABILITY_MODEL.md'
  ],
});
