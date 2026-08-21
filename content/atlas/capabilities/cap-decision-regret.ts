/**
 * Capability knowledge — CAP-DECISION-REGRET.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DECISION-REGRET',
  description:
    'Decision Regret Intelligence reports the expected economic consequence of choosing an inferior action, by comparing ACT_NOW, WAIT and DO_NOTHING computed from the same inputs. Regret is relative: best expected value minus this expected value, zero for the winner by construction, never negative.',
  innovation_thesis:
    'Forecast error tells you the model was wrong. It does not tell you the decision was wrong. Separating those two is what lets a planner argue about the choice rather than the arithmetic.',
  usage_instructions:
    'Open the Demand and Forecast surface and read the cost-of-choosing-wrongly card. Move the promotion or scenario controls and the three alternatives recompute together. Where they do not separate materially, CogniX names no winner.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ddf01-tests.ts. The regret assertions verify that each of ACT_NOW, WAIT and DO_NOTHING is reachable as the best alternative on defensible inputs, and that regret is zero for the winner and never negative.',
  field_status: [
    { field: 'expected_value_gbp', implementation_status: 'simulated', note: 'Modelled expected values over declared unit economics, labelled as modelled on the surface (ADR-043).' }
  ],
  architecture_narrative:
    'All three alternatives are computed from the same inputs: exposed demand, revision probability, the decision window and declared unit economics. The absolute figures are uncalibrated modelled expected values; the ordering between alternatives rests on shared inputs and is therefore inspectable.',
  architecture_flow: [
    'Exposed demand (ADR-041)',
    'Revision probability (ADR-040)',
    'Decision window (ADR-042)',
    'Declared unit economics',
    'Expected value per alternative',
    'Relative regret and materiality floor'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/demand-frontier/evaluate', purpose: 'Evaluate the frontier including the three alternatives' }
  ],
  contracts: [
    { name: 'DecisionRegretAssessment', path: 'packages/contracts/src/demand-decision-frontier-model.ts', direction: 'out' }
  ],
  implementation_references: [
    { path: 'lib/demand-decision-frontier/demand-frontier-engine.ts', symbol: 'evaluateDecisionRegret', note: 'Owning engine function' },
    { path: 'packages/contracts/src/demand-decision-frontier-model.ts', note: 'Contract' },
    { path: 'components/Forecasting.tsx', note: 'Presentation surface' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ddf01-tests.ts', outcome: 'Each alternative is reachable as the winner; regret is zero for the winner and never negative.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md', outcome: 'ADR-043 Amendment A recorded the relative-regret formula after the integration pass.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-ddf01-tests.ts'
  ],
  acceptance_criteria_refs: [
    'AC-DDF-21'
  ],
  known_limitations: [
    { limitation: 'Absolute monetary values are uncalibrated modelled expected values. The defensible claim is the ordering between alternatives, not the pounds.', severity: 'high' },
    { limitation: 'Regret is not forecast-error cost. Presenting it as such would contradict the CDI-07B ruling that prediction error never stands in for a decision verdict.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Deciding whether waiting is affordable', context: 'A planner can see a gap but does not know the cost of waiting for better evidence.', outcome: 'The three alternatives are priced from shared inputs and the ordering is inspectable.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What does waiting cost?',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Show the three alternatives', what_to_say: 'These are priced from the same inputs, so the comparison is fair even though the absolute numbers are modelled.', what_to_show: 'The Act Now / Wait / Do Nothing panel', expected_observation: 'Three alternatives with visible trade-offs' },
        { action: 'Move the scenario control', what_to_say: 'Watch the ordering change, not just the numbers.', what_to_show: 'Recomputation', expected_observation: 'A different alternative can become the recommendation' }
      ],
      prerequisites: [
        'A declared intervention constraint present in the scenario'
      ],
      warnings: [
        'MANDATORY: the absolute pound values are uncalibrated modelled expected values. Present the ordering, not the magnitude.',
        'Where the alternatives do not separate materially CogniX names no winner. Do not narrate a winner it declined to pick.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this the cost of a bad forecast?', audience: 'decision_scientist', difficulty: 'high' },
    { question: 'How do you know waiting is worse?', audience: 'exec', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Comparative expected value over declared alternatives is not retail-specific.' },
    { domain_id: 'logistics_distribution', applicability: 'hypothetical', rationale: 'Plausible where operational cut-offs price delay, but not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DECISION-GAP', relation: 'complements' },
    { ref: 'CAP-DECISION-WINDOW', relation: 'complements' }
  ],
  related_decisions: [
    'ADR-043'
  ],
  related_governance: [
    'docs/governance/DEMAND_OBSERVABILITY_MODEL.md'
  ],
});
