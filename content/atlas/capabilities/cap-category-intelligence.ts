/**
 * Capability knowledge — CAP-CATEGORY-INTELLIGENCE.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-CATEGORY-INTELLIGENCE',
  description:
    'Category Intelligence separates net profit growth from volume growth across category sub-segments and regions, exposing where margin expansion and premium shrinkage move in opposite directions.',
  innovation_thesis:
    'Category reporting that leads with volume hides the cases where growth is being bought with margin. Splitting the two is the whole point.',
  usage_instructions:
    'Open Category Intelligence. Category performance is queried live; the root-cause colouring and supporting lists are presentational.',
  testing_instructions:
    'No dedicated runner exists. This is a recorded coverage gap.',
  field_status: [
    { field: 'category_performance', implementation_status: 'implemented', note: 'Queried live through /api/data.' },
    { field: 'root_cause_colouring', implementation_status: 'simulated', note: 'In-component literal mapping.' }
  ],
  architecture_narrative:
    'The surface issues two live queries for category performance and renders three in-component literal arrays alongside them.',
  architecture_flow: [
    'Category and region selection',
    'Live performance query',
    'Margin versus volume split',
    'Sub-segment detail'
  ],
  apis: [
    { method: 'GET', path: '/api/data', purpose: 'Category performance query' }
  ],
  implementation_references: [
    { path: 'components/CategoryIntelligence.tsx', note: 'Surface' },
    { path: 'config/solutions.ts', note: 'SOL-CAT-04 registry entry' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/CategoryIntelligence.tsx', outcome: 'Two live /api/data calls; three in-component literal arrays.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Field-level status recorded in section 3.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'Root-cause colouring and supporting lists are in-component literals and do not respond to the query beside them.', severity: 'high' },
    { limitation: 'Registry demo maturity is Production Ready over partially-implemented code.', severity: 'high' },
    { limitation: 'No dedicated test runner covers this capability.', severity: 'medium' }
  ],
  use_cases: [
    { title: 'Separating profitable growth from bought growth', context: 'Volume is up and nobody has checked what it cost.', outcome: 'Margin and volume are shown as distinct movements.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'Growth, or growth bought with margin',
      audience: 'category_manager',
      duration_mins: 3,
      steps: [
        { action: 'Open a category', what_to_say: 'Volume and margin are different stories. Here they are separately.', what_to_show: 'The margin versus volume split', expected_observation: 'Two distinct movements, not one growth number' }
      ],
      prerequisites: [
        'Retail and Grocery domain active'
      ],
      warnings: [
        'Supporting lists are static. Only the category performance figures respond to the query.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Can we see this by store?', audience: 'category_manager', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'cpg', applicability: 'likely', rationale: 'Registered applicable industry on SOL-CAT-04.' },
    { domain_id: 'fashion_apparel', applicability: 'hypothetical', rationale: 'Category structures differ; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-DEMAND-FORECAST', relation: 'complements' }
  ],
  related_governance: [
    'docs/governance/DEMONSTRATION_SOLUTION_MODEL.md'
  ],
});
