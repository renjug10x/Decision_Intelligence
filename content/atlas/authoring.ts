/**
 * Knowledge authoring helper (ATL-03).
 *
 * `CapabilityKnowledge` has many optional-in-practice collections. Requiring every module to
 * spell out a dozen empty arrays would bury the content that matters and tempt an author to
 * pad them with filler — the opposite of the standard's "absent means absent" rule.
 *
 * `defineKnowledge` fills unstated collections with genuine emptiness. An empty
 * `external_evidence` means no market study has been performed, and reads that way through
 * the API. It does not mean the author forgot.
 *
 * This is a factory over the ATL-02 contract, not a change to it. The stored shape, the
 * validator and the routes are untouched.
 */
import type { CapabilityKnowledge } from '../../packages/contracts/src/capability-atlas-model';

export type KnowledgeInput =
  Pick<CapabilityKnowledge, 'capability_id' | 'description' | 'innovation_thesis'> &
  Partial<Omit<CapabilityKnowledge, 'capability_id' | 'description' | 'innovation_thesis'>>;

export function defineKnowledge(input: KnowledgeInput): CapabilityKnowledge {
  return {
    usage_instructions: '',
    testing_instructions: '',
    field_status: [],
    architecture_narrative: '',
    architecture_flow: [],
    apis: [],
    contracts: [],
    data_sources: [],
    implementation_references: [],
    validation_evidence: [],
    test_runners: [],
    acceptance_criteria_refs: [],
    known_limitations: [],
    open_defects: [],
    assumptions: [],
    use_cases: [],
    demo_scenarios: [],
    questions_worth_asking: [],
    client_questions: [],
    cross_domain_applicability: [],
    external_evidence: [],
    related_capabilities: [],
    related_decisions: [],
    related_governance: [],
    ...input
  };
}
