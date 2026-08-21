/**
 * Capability knowledge — CAP-SIGNAL-CONNECTOR.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-SIGNAL-CONNECTOR',
  description:
    'A provider-neutral connector abstraction letting planning, commerce, weather, events, competitive intelligence, operational telemetry and demographic feeds publish into the canonical signal contract by envelope normalisation.',
  innovation_thesis:
    'Naming a vendor in the architecture makes the vendor the architecture. Defining the contract and treating vendor platforms as reference adapters keeps the estate portable.',
  usage_instructions:
    'Register a connector and ingest an envelope. The connector normalises it into the canonical signal contract.',
  testing_instructions:
    'Run npx tsx tests/unit/run-esf3-tests.ts (22 assertions).',
  field_status: [
    { field: 'synthetic_demo', implementation_status: 'simulated', note: 'Hardcoded true at ingestion; a non-synthetic observation is not currently representable through this path.' }
  ],
  architecture_narrative:
    'Seven reference adapters across the declared source categories, each marked synthetic. Vendor platforms are reference implementations, never hardcoded dependencies.',
  architecture_flow: [
    'Provider envelope',
    'Connector normalisation',
    'Canonical signal contract',
    'Admission'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/signals/connectors', purpose: 'List connectors' },
    { method: 'POST', path: '/api/v1/signals/connectors/ingest', purpose: 'Ingest an envelope' }
  ],
  contracts: [
    { name: 'ExternalSignalConnector', path: 'packages/contracts/src/external-signal-connector-model.ts', direction: 'in' }
  ],
  implementation_references: [
    { path: 'services/world/src/external-signal-connector.ts', note: 'Connector service' },
    { path: 'packages/contracts/src/external-signal-connector-model.ts', note: 'Contract' },
    { path: 'app/api/v1/signals/connectors/route.ts', note: 'API' }
  ],
  validation_evidence: [
    { kind: 'test', ref: 'tests/unit/run-esf3-tests.ts', outcome: '22 assertions on envelope normalisation.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ESF_3_EXTERNAL_SIGNAL_CONNECTOR_REPORT.md', outcome: 'Completion report.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  test_runners: [
    'tests/unit/run-esf3-tests.ts'
  ],
  known_limitations: [
    { limitation: 'All seven adapters are reference implementations marked synthetic. No real external integration exists.', severity: 'high' },
    { limitation: 'The connector registry is a static array with no runtime registration path, which is one of the three code sites that make a non-synthetic observation unrepresentable today.', severity: 'high' }
  ],
  use_cases: [
    { title: 'Staying portable across vendor platforms', context: 'An architecture is drawn around a named planning vendor.', outcome: 'The contract is the architecture; the vendor is an adapter.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'The vendor is an adapter',
      audience: 'enterprise_architect',
      duration_mins: 3,
      steps: [
        { action: 'Show the connector categories', what_to_say: 'Seven source categories, one contract. No vendor is load-bearing.', what_to_show: 'The connector list', expected_observation: 'Categories, not product names' }
      ],
      prerequisites: [],
      warnings: [
        'MANDATORY: all adapters are reference implementations marked synthetic. There is no live integration.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Do you integrate with our planning system?', audience: 'cio', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'manufacturing', applicability: 'likely', rationale: 'Provider-neutral ingestion is deliberately industry-neutral.' },
    { domain_id: 'telecom', applicability: 'hypothetical', rationale: 'Plausible for telemetry ingestion; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-ENTERPRISE-SIGNAL', relation: 'depends-on' }
  ],
  related_governance: [
    'docs/governance/ENTERPRISE_SIGNAL_MODEL.md'
  ],
});
