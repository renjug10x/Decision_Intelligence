/**
 * Capability knowledge — CAP-GOVERNANCE-SETTINGS.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-GOVERNANCE-SETTINGS',
  description:
    'The operator surface for detection thresholds, AI options and access scoping. The controls are present and wired to state; several are demonstration affordances rather than enforced policy.',
  innovation_thesis:
    'A governance surface that cannot be honest about which of its switches are real is itself a governance problem.',
  usage_instructions:
    'Open the governance surface to review thresholds, AI options and scope settings.',
  testing_instructions:
    'No dedicated runner exists. Recorded coverage gap.',
  field_status: [
    { field: 'access_scoping', implementation_status: 'simulated', note: 'Presentation-level scoping; authorisation is not enforced server-side from this surface.' }
  ],
  architecture_narrative:
    'A settings surface bound to application state. Some controls influence behaviour; others describe intent.',
  architecture_flow: [
    'Operator opens governance surface',
    'Threshold and option state',
    'Effect on downstream surfaces where wired'
  ],
  implementation_references: [
    { path: 'components/Settings.tsx', note: 'Governance surface' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/Settings.tsx', outcome: '615-line surface.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-10, partially implemented.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'Several controls are demonstration affordances rather than enforced policy. A control that describes intent must not be presented as an enforced setting.', severity: 'high' },
    { limitation: 'Access scoping here is a client-side presentation concern, not server-enforced authorisation.', severity: 'high' },
    { limitation: 'No dedicated test runner covers it.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Reviewing how the estate is configured', context: 'An operator asks what is switched on.', outcome: 'Thresholds and options are visible in one place.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What is switched on',
      audience: 'cdao',
      duration_mins: 3,
      steps: [
        { action: 'Open the governance surface', what_to_say: 'Some of these enforce, some describe intent. I will tell you which as we go.', what_to_show: 'Thresholds and options', expected_observation: 'A single configuration view' }
      ],
      prerequisites: [],
      warnings: [
        'MANDATORY: several controls are demonstration affordances. Do not present access scoping here as enforced authorisation.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is access actually enforced?', audience: 'cio', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'it_services', applicability: 'not-assessed', rationale: 'Partially implemented; no reuse assessment performed.' }
  ],
  related_governance: [
    'docs/governance/IP_GOVERNANCE.md'
  ],
});
