/**
 * Capability knowledge — CAP-INTENT-FUSION.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-INTENT-FUSION',
  description:
    'Fuses declared commercial intent with the enterprise signal stream into a contextualised decision outlook, so a plan is read against what the environment is actually doing rather than in isolation.',
  innovation_thesis:
    'A plan and a signal stream held apart force a human to do the fusion in their head, inconsistently. Doing it in a contract makes the result inspectable.',
  usage_instructions:
    'Register a commercial intent, then request the contextualised outlook. The decomposition shows which signals moved the outlook and by how much.',
  testing_instructions:
    'Run npx tsx tests/unit/run-ifi1-tests.ts (12 assertions).',
  field_status: [
    { field: 'confidence', implementation_status: 'simulated', note: 'An engine constant, not a calibrated confidence measure.' }
  ],
  architecture_narrative:
    'Commercial intent is stored and combined with the signal stream into a ContextualisedDecisionOutlook consumed downstream by the demand frontier engine.',
  architecture_flow: [
    'Commercial intent registered',
    'Enterprise signal stream',
    'Fusion into contextualised outlook',
    'Decomposition by contributing signal'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/intent-fusion/evaluate', purpose: 'Evaluate the contextualised outlook' },
    { method: 'GET', path: '/api/v1/commercial-intents/current', purpose: 'Current commercial intent' }
  ],
  contracts: [
    { name: 'ContextualisedDecisionOutlook', path: 'packages/contracts/src/intent-fusion-model.ts', direction: 'out' },
    { name: 'CommercialIntent', path: 'packages/contracts/src/commercial-intent-model.ts', direction: 'in' }
  ],
  implementation_references: [
    { path: 'lib/intent-fusion/intent-fusion-engine.ts', note: 'Engine' },
    { path: 'packages/contracts/src/intent-fusion-model.ts', note: 'Contract' },
    { path: 'app/api/v1/intent-fusion/evaluate/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-ifi1-tests.ts', outcome: '12 assertions on fusion and decomposition.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_IFI_01_INTENT_FUSION_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-ifi1-tests.ts'
  ],
  known_limitations: [
    { limitation: 'The outlook confidence value is an engine constant and must not be presented as forecast stability; defect D-DDF-2 arose from exactly that conflation.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Reading a plan against the environment', context: 'A plan is reviewed without reference to what signals are doing.', outcome: 'The outlook fuses both and shows which signal moved it.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Plan meets environment',
      audience: 'demand_planner',
      duration_mins: 3,
      steps: [
        { action: 'Open the contextualised outlook', what_to_say: 'This is the plan read against what the environment is actually doing.', what_to_show: 'The decomposition', expected_observation: 'Named contributing signals' }
      ],
      prerequisites: [],
      warnings: [
        'The confidence value is an engine constant. Do not present it as forecast stability or accuracy.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'What is confidence measuring?', audience: 'demand_planner', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Intent-to-signal fusion is domain-neutral.' },
    { domain_id: 'logistics_distribution', applicability: 'hypothetical', rationale: 'Plausible for capacity planning; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-ENTERPRISE-SIGNAL', relation: 'depends-on' },
    { ref: 'CAP-FORECAST-STABILITY', relation: 'enables' },
    { ref: 'CAP-SHARED-DECISION-STATE', relation: 'complements' }
  ],
  related_decisions: [
    'ADR-040'
  ],
  related_governance: [
    'docs/governance/INTENT_FUSION_INTELLIGENCE.md'
  ],

  /**
   * Intent and signal arrive from different places and neither means much alone, so prose has to
   * carry both to the same point before the outlook makes sense. Drawing them meeting shows the
   * fusion is done in the contract rather than in a planner's head. The two sources are the only
   * ones this capability's knowledge names; no signal category is invented to make the fan look
   * wider, and the decomposition is deliberately not drawn as a third source — it is a property of
   * the fused outlook, so it is carried on the outlook rather than shown feeding into it.
   */
  visualisation: {
    kind: 'convergence',
    concept: 'Contextualised Decision Outlook',
    nodes: [
      { label: 'Commercial intent registered', detail: 'The plan as the organisation has declared it', role: 'evidence' },
      { label: 'Enterprise signal stream', detail: 'What the environment is actually doing', role: 'evidence' },
      { label: 'Contextualised outlook', detail: 'Held in a contract, and decomposable to the signals that moved it', role: 'outcome' }
    ],
    description:
      'Two sources of evidence meet in one judgement. A registered commercial intent and the enterprise signal stream converge into a contextualised decision outlook, so the plan is read against what the environment is actually doing rather than in isolation. Because the fusion happens in a contract rather than in a planner\'s head, the outlook decomposes into the contributing signals that moved it, and the reading can be inspected afterwards.'
  },
});
