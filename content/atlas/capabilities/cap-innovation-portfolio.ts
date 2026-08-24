/**
 * Capability knowledge — CAP-INNOVATION-PORTFOLIO.
 * Authored by ATL-03. Every claim traces to a cited path, test or report;
 * anything not fully real is stated at field level and warned in the demo path.
 */
import { defineKnowledge } from '../authoring';

export const knowledge = defineKnowledge({
  capability_id: 'CAP-INNOVATION-PORTFOLIO',
  description:
    'The portfolio view of the Capability Atlas: what CogniX has built, counted across implementation status, innovation lifecycle, demonstration maturity and platform reuse as four separate distributions. Until ATL-04R it was a standalone surface over two registries showing nine assets; it now reports the whole governed estate.',
  innovation_thesis:
    'A lab that cannot show its own portfolio cannot be reviewed. The portfolio was the first attempt at the question the Atlas now answers properly.',
  usage_instructions:
    'Open the Capability Atlas and choose the Portfolio view. It reports the estate across implementation, lifecycle, demonstration maturity and reach as four separate distributions, and names every capability that is not fully implemented.',
  testing_instructions:
    'Run `npx tsx tests/unit/run-atl04r-tests.ts`. Assertions G8 and G9 hold the surface to reporting the three maturity dimensions as three distributions rather than one combined score, and to naming what is not fully built rather than showing only finished work.',
  architecture_narrative:
    'A presentation surface over the governed capability landscape. It receives the areas and their members from the Atlas container and counts records; it computes nothing and fetches nothing of its own, which is what keeps its figures identical to the Atlas beside it.',
  architecture_flow: [
    'Governed capability landscape (/api/v1/atlas/domains)',
    'Counts by area, implementation status, lifecycle state, demonstration maturity and reuse',
    'Four distributions, rendered separately',
    'Selection routes into the capability, or into the area on the Atlas'
  ],
  implementation_references: [
    { path: 'components/atlas/PortfolioView.tsx', note: 'Surface, inside the Atlas since ATL-04R; counts the full governed estate rather than reading two registries' },
    { path: 'components/atlas/CapabilityAtlas.tsx', symbol: 'PortfolioView', note: 'Supplies the landscape; the portfolio is a view of the Atlas, not a destination' },
    { path: 'app/api/v1/atlas/domains/route.ts', note: 'The landscape the counts are taken from' }
  ],
  validation_evidence: [
    { kind: 'code', ref: 'components/atlas/PortfolioView.tsx', outcome: 'Portfolio view over all 38 governed capabilities, replacing the 269-line surface that showed 9.', observed_at: '2026-08-21', observed_by: 'ATL-04R migration' },
    { kind: 'report', ref: 'docs/reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md', outcome: 'Recorded as E-01.', observed_at: '2026-08-20', observed_by: 'ATL-03 reconciliation' }
  ],
  known_limitations: [
    { limitation: 'Every figure is a count of governed capability records. It reports what the estate has registered, which is not the same as what the estate can do; a capability nobody registered is absent here without any sign that it is missing.', severity: 'medium' },
    { limitation: 'Counts across the four distributions overlap, because implementation status, lifecycle state and demonstration maturity are independent dimensions (ADR-047). They must not be read as slices of one total.', severity: 'medium' }
  ],
  assumptions: [
    'The governed capability registry is assumed to be the definition of what CogniX has built. A capability that exists in the estate but carries no record is invisible here by construction rather than by omission.'
  ],
  use_cases: [
    { title: 'Seeing the lab portfolio', context: 'A visitor asks what exists.', outcome: 'The governed estate is counted by area and by all three maturity dimensions, with every capability that is not fully implemented named.' }
  ],
  demo_scenarios: [
    {
      path_type: 'three-minute',
      title: 'What the lab holds',
      audience: 'exec',
      duration_mins: 3,
      steps: [
        { action: 'Open the Portfolio view of the Atlas', what_to_say: 'This is the whole governed estate, counted. Nothing here is modelled or projected — every number is how many records carry that value.', what_to_show: 'The four distributions and the area breakdown', expected_observation: 'Counts by area, and three maturity dimensions kept apart rather than averaged' },
        { action: 'Scroll to what is not fully built', what_to_say: 'The portfolio names what is incomplete rather than showing only the finished work.', what_to_show: 'The named list of capabilities that are not fully implemented', expected_observation: 'Each one opens into its capability record' }
      ],
      prerequisites: [],
      warnings: [
        'The distributions overlap. A capability can be Production Ready to demonstrate and only partially implemented, so the four sets of counts must not be added together or read as slices of one total.',
        'These are counts of governed records, not a claim about client deployments.'
      ],
      follow_ups: []
    }
  ],
  client_questions: [
    { question: 'Is this everything?', audience: 'exec', difficulty: 'medium' }
  ],
  cross_domain_applicability: [
    { domain_id: 'professional_services', applicability: 'likely', rationale: 'Portfolio discovery is industry-neutral.' },
    { domain_id: 'it_services', applicability: 'hypothetical', rationale: 'Plausible; not assessed.' }
  ],
  related_capabilities: [
    { ref: 'CAP-CURIOSITY-QUESTIONS', relation: 'complements' },
    { ref: 'CAP-EXPERIMENT-CANVAS', relation: 'enables' }
  ],
  test_runners: ['tests/unit/run-atl04r-tests.ts'],
  related_decisions: [
    'ADR-045', 'ADR-047'
  ],
  related_governance: [
    'docs/governance/DEMONSTRATION_SOLUTION_MODEL.md'
  ],
});
