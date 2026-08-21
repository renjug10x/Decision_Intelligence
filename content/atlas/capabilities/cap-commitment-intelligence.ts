/**
 * Capability knowledge — CAP-COMMITMENT-INTELLIGENCE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-COMMITMENT-INTELLIGENCE',
  description:
    'Commitment Intelligence detects where a promise the enterprise has made will break before the customer experiences it, by propagating commitments across the operating chain and comparing demand acceleration against the capacity that must serve it.',
  innovation_thesis:
    'Siloed planning produces accurate forecasts and broken promises at the same time. The interesting object is not the forecast; it is the commitment that depends on it.',
  usage_instructions:
    'Open Commitment Intelligence from the Innovation Portfolio. Adjust the promotional scenario and observe where the commitment chain first breaks and how far ahead of the customer that break is visible.',
  testing_instructions:
    'Exercised through the campaign decision journey suite. Run npx tsx tests/unit/run-campaign-decision-journey-tests.ts.',
  field_status: [
    { field: 'lead_time_days', implementation_status: 'simulated', note: 'Derived from scenario parameters in the synthetic world rather than observed operational data.' }
  ],
  architecture_narrative:
    'The decision engine propagates a commitment across chain stages and reports the first stage at which committed demand exceeds served capacity.',
  architecture_flow: [
    'Commercial commitment declared',
    'Demand projection',
    'Capacity per chain stage',
    'First breaking stage',
    'Lead time before customer impact'
  ],
  implementation_references: [
    { path: 'components/CommitmentIntelligence.tsx', note: 'Surface' },
    { path: 'lib/decision-engine.ts', note: 'Propagation engine' },
    { path: 'config/experiments.ts', note: 'EXP-COMMITMENT-01 registry entry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/CommitmentIntelligence.tsx', outcome: '526-line interactive surface bound to the decision engine.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'test', ref: 'tests/unit/run-campaign-decision-journey-tests.ts', outcome: 'Journey assertions cover the commitment handoff.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-campaign-decision-journey-tests.ts'
  ],
  known_limitations: [
    { limitation: 'Chain capacity is supplied by the synthetic enterprise world, not by a client planning system.', severity: 'medium' },
    { limitation: 'The lead-time claim is a demonstration figure derived from scenario parameters, not a measured operational outcome.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Seeing a broken promise early', context: 'Promotional demand is accelerating faster than supplier capacity can serve.', outcome: 'The breaking stage and the time remaining before the customer notices are both visible.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'The promise that will break',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Raise the promotional scenario', what_to_say: 'Demand accelerates faster than the chain can serve. Here is where it breaks first.', what_to_show: 'The commitment chain with the breaking stage highlighted', expected_observation: 'A named breaking stage, not a generic warning' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'Chain capacity comes from the synthetic enterprise world. State that if asked what data it needs.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'What data would you need from us?', audience: 'coo', difficulty: 'medium' },
    { question: 'How far ahead can you really see?', audience: 'exec', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'proven', rationale: 'The same commitment propagation drives the CPG demonstration context.' },
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Capacity-bound commitment chains are the norm in manufacturing planning.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DECISION-RIPPLE', relation: 'complements' },
    { ref: 'CAP-PREDICTIVE-INVENTORY', relation: 'complements' },
    { ref: 'CAP-PROMOTION-INTELLIGENCE', relation: 'enables' }
  ],
  related_governance: [
    'docs/governance/EXPERIMENT_MODEL.md'
  ],
  /**
   * The claim is that a promise breaks somewhere upstream of the customer, and prose can only name
   * the chain stages one at a time. Ordered, the propagation puts the breaking stage exactly where it
   * sits — after the capacity that fails to meet the commitment, before the time still left — which is
   * what makes the lead time an interval a COO can act inside rather than a headline figure.
   */
  visualisation: {
    kind: 'flow',
    concept: 'Where the Promise Breaks First',
    nodes: [
      { label: 'Commercial commitment declared', detail: 'The promise the enterprise has made to the customer', role: 'stage' },
      { label: 'Demand projection', detail: 'What that commitment will ask the operating chain to serve', role: 'stage' },
      { label: 'Capacity per chain stage', detail: 'What each stage can actually serve, from the synthetic enterprise world', role: 'stage' },
      { label: 'First breaking stage', detail: 'The earliest stage where committed demand exceeds served capacity', role: 'stage' },
      { label: 'Lead time before impact', detail: 'How far ahead of the customer the break is visible; derived from scenario parameters', role: 'stage' }
    ],
    description:
      'An ordered propagation along the operating chain: a declared commercial commitment becomes a demand projection, which is set against the capacity each chain stage can serve, so the first stage at which committed demand exceeds served capacity is named rather than a generic warning being raised. The chain ends in the lead time by which that break is visible before the customer experiences it. Chain capacity comes from the synthetic enterprise world and the lead time is derived from scenario parameters, not from measured operational data.'
  },
});
