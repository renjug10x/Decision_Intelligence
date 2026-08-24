/**
 * Capability knowledge — CAP-CONTRACT-VERIFICATION.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-CONTRACT-VERIFICATION',
  description:
    'Lets a reader inspect the governed contract behind a decision: what was bound, under which digest, and whether the human-readable narrative matches the artefact it claims to describe.',
  innovation_thesis:
    'A narrative that cannot be checked against its artefact is marketing. Putting them side by side is what makes the governance real to a reader.',
  usage_instructions:
    'Open Contract Verification and select a registered contract to compare its bound basis with its narrative.',
  testing_instructions:
    'Exercised indirectly through the CDI-07A suite. No dedicated runner. Recorded coverage gap.',
  architecture_narrative:
    'A contract library and narrative renderer read the stored contract and present the bound basis alongside its description.',
  architecture_flow: [
    'Registered contract',
    'Bound basis and digest',
    'Narrative rendering',
    'Side-by-side comparison'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/campaigns/decision-contract/[id]', purpose: 'Read a decision contract' }
  ],
  contracts: [
    { name: 'DecisionContract', path: 'packages/contracts/src/campaign-decision-contract-model.ts', direction: 'in' }
  ],
  implementation_references: [
    { path: 'components/ContractVerification.tsx', note: 'Surface' },
    { path: 'lib/contract-library.ts', note: 'Contract library' },
    { path: 'lib/contract-narrative.ts', note: 'Narrative renderer' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/ContractVerification.tsx', outcome: '271-line verification surface.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'test', ref: 'tests/unit/run-cdi07a-tests.ts', outcome: 'Contract binding and transcription assertions.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-cdi07a-tests.ts'
  ],
  known_limitations: [
    { limitation: 'No dedicated test runner covers the verification surface itself.', severity: 'medium' },
    { limitation: 'Verification compares narrative to artefact. It does not attest that the artefact describes reality.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Checking that the story matches the record', context: 'A decision narrative is presented and cannot be checked.', outcome: 'The bound basis and the narrative are shown together.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Check the story against the record',
      audience: 'cdao',
      duration_mins: 3,
      steps: [
        { action: 'Open a contract and its narrative', what_to_say: 'The narrative is checkable against the artefact it describes.', what_to_show: 'Side-by-side view', expected_observation: 'Bound basis with digest' }
      ],
      prerequisites: [],
      warnings: [
        'Verification checks narrative against artefact; it does not attest that the artefact matches the world.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Who verifies the verifier?', audience: 'cdao', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'banking_finance', applicability: 'likely', rationale: 'Contract inspection is a general governance pattern.' },
    { domain_id: 'public_sector', applicability: 'hypothetical', rationale: 'Plausible for regulated decisions; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DECISION-CONTRACT', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/IP_GOVERNANCE.md'
  ],
});
