/**
 * Capability knowledge — CAP-DOMAIN-PERSONA-CONTEXT.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-DOMAIN-PERSONA-CONTEXT',
  description:
    'Runtime selection of industry domain and decision lens, so the same estate is demonstrated in a client vocabulary without a code change. Domain and persona selection work; the industry-pack terminology layer does not fully.',
  innovation_thesis:
    'Client-neutrality is only real if switching context costs nothing. A demo that needs a code change to speak a client vocabulary is not neutral.',
  usage_instructions:
    'Choose a domain and a decision lens from the shell or at platform setup. Retail and Grocery is the only active domain; the rest are marked coming soon.',
  testing_instructions:
    'No dedicated runner exists. Recorded coverage gap.',
  field_status: [
    { field: 'industry_pack_terminology', implementation_status: 'partially-implemented', note: 'Pack identifiers diverge from the domain catalogue; terminology substitution is incomplete.' }
  ],
  architecture_narrative:
    'Domain and persona catalogues are configuration consumed by the shell. A separate industry-pack file uses a different, smaller identifier set.',
  architecture_flow: [
    'Domain catalogue',
    'Persona catalogue',
    'Shell context selection',
    'Vocabulary applied where wired'
  ],
  implementation_references: [
    { path: 'config/domains.ts', symbol: 'DOMAIN_CATALOGUE', note: 'Domain catalogue, twenty-three entries, one active' },
    { path: 'config/personas.ts', symbol: 'PERSONA_CATALOGUE', note: 'Nineteen decision lenses' },
    { path: 'config/industry-packs.ts', note: 'Runtime demo-context switch with a different identifier set' },
    { path: 'components/PlatformSetupPage.tsx', note: 'Selection surface' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'config/domains.ts', outcome: 'Twenty-three domains, only retail_grocery active.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-11 and gap G5.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'config/industry-packs.ts uses identifiers that do not match config/domains.ts. ATL-01 recorded this as gap G5; the domain catalogue is the authority and the mismatch is not resolved.', severity: 'high' },
    { limitation: 'Only retail_grocery is active. Selecting another domain does not populate capabilities, because none are placed there.', severity: 'high' },
    { limitation: 'No dedicated test runner covers it.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Demonstrating in a client vocabulary', context: 'A client does not recognise grocery terminology.', outcome: 'Domain and lens are switched at runtime without a code change.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Switch the vocabulary, not the code',
      audience: 'cco',
      duration_mins: 3,
      steps: [
        { action: 'Change domain and decision lens', what_to_say: 'Client-neutrality is a runtime property here, not a rebuild.', what_to_show: 'The context switch', expected_observation: 'Immediate change without deployment' }
      ],
      prerequisites: [],
      warnings: [
        'MANDATORY: only Retail and Grocery is populated. Other domains are marked coming soon and will show nothing.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Can you show this in our industry?', audience: 'cco', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'The context mechanism is domain-neutral by construction, though only retail is populated.' },
    { domain_id: 'manufacturing', applicability: 'hypothetical', rationale: 'Mechanism applies; no capability content exists for it.' }
  ],
  related_capabilities: [
    { ref: 'CAP-AUTH-PLATFORM-SETUP', relation: 'depends-on' }
  ],
  related_decisions: [
    'ADR-002'
  ],
  related_governance: [
    'docs/architecture/INFORMATION_ARCHITECTURE.md'
  ],
});
