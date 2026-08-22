/**
 * Capability knowledge — CAP-PREDICTIVE-INVENTORY.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-PREDICTIVE-INVENTORY',
  description:
    'Predictive Inventory Intelligence identifies where inventory buffers fail first under current lead times and demand velocity, and quantifies the revenue exposure over the coming days.',
  innovation_thesis:
    'Availability failures are usually visible in advance and invisible in aggregate. Naming the first buffer to fail is more actionable than reporting a service-level average.',
  usage_instructions:
    'Open this capability in the Capability Atlas and follow the demonstrating solution named under \u201cWhere it comes from\u201d. Scenario context binds to the enterprise world; the stock-out event list and affected-store view are read alongside it.',
  testing_instructions:
    'No dedicated runner exists. Scenario binding is exercised indirectly through the world client. This is a recorded coverage gap.',
  field_status: [
    { field: 'stockout_events', implementation_status: 'simulated', note: 'In-component literal array at components/AvailabilityIntelligence.tsx; not computed.' },
    { field: 'affected_stores', implementation_status: 'simulated', note: 'In-component literal array; not computed.' },
    { field: 'scenario_context', implementation_status: 'implemented', note: 'Bound to the enterprise world through lib/world-client.ts.' }
  ],
  architecture_narrative:
    'The surface reads scenario context from the world client, and renders stock-out events and affected stores from in-component literal arrays.',
  architecture_flow: [
    'World scenario context',
    'Buffer projection',
    'First failing buffer',
    'Affected stores',
    'Revenue exposure'
  ],
  apis: [
    { method: 'GET', path: '/api/v1/scenarios', purpose: 'Read the active enterprise world scenario' }
  ],
  data_sources: [
    { name: 'Enterprise World scenario, read through the world client', kind: 'synthetic', path: 'lib/world-client.ts' },
    { name: 'Stock-out events and affected-store lists, held as in-component literal arrays', kind: 'static', path: 'components/AvailabilityIntelligence.tsx' }
  ],
  implementation_references: [
    { path: 'components/AvailabilityIntelligence.tsx', note: 'Surface' },
    { path: 'lib/world-client.ts', symbol: 'fetchWorldScenario', note: 'Scenario binding' },
    { path: 'config/solutions.ts', note: 'SOL-INV-03 registry entry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/AvailabilityIntelligence.tsx', outcome: 'Scenario context is engine-bound; STOCKOUT_EVENTS and AFFECTED_STORES are in-component literals.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Finding F5 recorded this as the D-DDF-1 pattern in a surface with no reconciliation pass.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'Stock-out events and affected-store lists are in-component literal arrays. They do not respond to the scenario controls beside them, which is the D-DDF-1 pattern recorded as ATL-01 finding F5.', severity: 'high' },
    { limitation: 'The registry records this capability as Production Ready demo maturity while implementation is partially implemented. Both must be shown together.', severity: 'high' },
    { limitation: 'No dedicated test runner covers this capability.', severity: 'medium' }
  ],
  assumptions: [
    'Buffer failure is assumed to be determined by lead time and demand velocity at the store grain being evaluated. Substitution between stores or between products is not modelled, so exposure is computed as if a stock-out is not absorbed elsewhere.'
  ],
  use_cases: [
    { title: 'Finding the first buffer to fail', context: 'Service levels look acceptable in aggregate.', outcome: 'The specific failing buffer and its exposure are named.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Where availability breaks first',
      audience: 'coo',
      duration_mins: 3,
      steps: [
        { action: 'Open the availability view', what_to_say: 'This names the first buffer to fail rather than reporting an average.', what_to_show: 'The exposure list', expected_observation: 'A named product and store, not a percentage' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'MANDATORY: the stock-out list is static. It will not respond to the controls beside it. Do not present it as a live calculation.',
        'The registry shows Production Ready demo maturity over partially-implemented code. Say both if asked.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this live?', audience: 'coo', difficulty: 'high' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Buffer failure under lead-time pressure is a general supply pattern.' },
    { domain_id: 'logistics_distribution', applicability: 'likely', rationale: 'Directly applicable to distribution buffers.' }
  ],
  related_capabilities: [
    { ref: 'CAP-COMMITMENT-INTELLIGENCE', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/DEMONSTRATION_SOLUTION_MODEL.md'
  ],
});
