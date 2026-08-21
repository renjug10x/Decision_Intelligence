/**
 * Capability knowledge — CAP-OBSERVATION-CORRESPONDENCE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-OBSERVATION-CORRESPONDENCE',
  description:
    'Two bound predicates: whether an observation addresses the decision that was contracted and against what tolerance (contract by observation to comparability), and whether the source of an observation carries authority (source by context to authority). Both fail closed.',
  innovation_thesis:
    'An estate that can admit observations but cannot say whether they correspond to the decision will happily certify its own accuracy. Making admission and correspondence separate, independently testable predicates is what prevents that.',
  usage_instructions:
    'Submit an observation to the admission route with a declared grain and window. The response states whether it corresponds to the contracted decision, and if not, which dimension failed.',
  testing_instructions:
    'Run npx tsx tests/unit/run-cdi08-tests.ts and npx tsx tests/unit/run-esf6-tests.ts. Empty grain, null window and foreign tenant or session all fail closed.',
  architecture_narrative:
    'Correspondence resolves a composite contracted grain only where a single observation carries a declared composite grain key with exact token identity on every contracted dimension. Metric to signal-type correspondence is checked against a closed declared table.',
  architecture_flow: [
    'Observation submitted with declared grain and window',
    'Source authority check (ESF-6)',
    'Metric to signal-type correspondence against a closed table',
    'Grain token identity on every contracted dimension',
    'Observation-window coverage',
    'Comparability verdict, or fail closed'
  ],
  apis: [
    { method: 'POST', path: '/api/v1/campaigns/observations/admit', purpose: 'Admit an attested observation' },
    { method: 'GET', path: '/api/v1/signals/attested-sources', purpose: 'List attested sources' }
  ],
  contracts: [
    { name: 'AttestedObservation', path: 'packages/contracts/src/attested-observation-model.ts', direction: 'in' }
  ],
  implementation_references: [
    { path: 'packages/contracts/src/attested-observation-model.ts', note: 'Contract' },
    { path: 'lib/attested-observation-store.ts', note: 'Correspondence store' },
    { path: 'services/world/src/attested-observation-store.ts', note: 'Admission store' },
    { path: 'app/api/v1/campaigns/observations/admit/route.ts', note: 'Admission route' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-cdi08-tests.ts', outcome: '44 assertions covering composite grain, prediction envelope and fail-closed behaviour.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'test', ref: 'tests/unit/run-esf6-tests.ts', outcome: '81 assertions covering attested source authority and revocation.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi08-tests.ts',
    'tests/unit/run-esf6-tests.ts'
  ],
  known_limitations: [
    { limitation: 'No apportionment, no fuzzy matching and no fallback from attributable to gross. A near-miss observation is refused rather than approximated.', severity: 'medium' },
    { limitation: 'Every connector adapter in the estate is marked synthetic_demo true, so authoritative external observation is reachable but unexercised by real feeds.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Refusing an observation that does not fit', context: 'An actual arrives at a different grain from the one contracted.', outcome: 'The predicate names the failing dimension instead of silently comparing incomparable numbers.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Why this number does not count',
      audience: 'cdao',
      duration_mins: 3,
      steps: [
        { action: 'Submit an observation at the wrong grain', what_to_say: 'The system will not compare these. It says which dimension failed.', what_to_show: 'The refusal and its reason', expected_observation: 'A named failing dimension, not a silent pass' }
      ],
      prerequisites: [
        'A registered decision contract'
      ],
      warnings: [
        'The admission path is exercised with synthetic sources; no real external feed is connected.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'What stops you marking your own homework?', audience: 'cdao', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'banking_finance', applicability: 'likely', rationale: 'Contract-to-observation correspondence is a general audit pattern.' },
    { domain_id: 'healthcare_lifesciences', applicability: 'hypothetical', rationale: 'Plausible for outcome attestation; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DECISION-CONTRACT', relation: 'enables' },
    { ref: 'CAP-ENTERPRISE-SIGNAL', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/ENTERPRISE_SIGNAL_MODEL.md'
  ],
});
