/**
 * CogniX Capability Registry — canonical `CAP-*` identity and relationships (ADR-052).
 *
 * ── What belongs in this file, and what does not ────────────────────────────
 * This registry is DELIBERATELY COMPACT. An entry carries identity, placement,
 * relationships, the two stored maturity dimensions, and a bounded summary — everything
 * a capability card, a filter or a search result needs, and nothing else.
 *
 * It is NOT a documentation store. Descriptions, architecture, evidence, demo paths,
 * market context and the rest of the ATL-03 payload live in per-capability knowledge
 * modules under `content/atlas/capabilities/`, loaded on demand and referenced here only
 * by `knowledge_ref`. That boundary is what lets ATL-03 author deep knowledge for every
 * capability without this file growing without bound or its schema changing.
 *
 * Adding prose fields here is a defect, not a convenience.
 *
 * ── Population status ───────────────────────────────────────────────────────
 * ATL-02 seeds only the MINIMUM REPRESENTATIVE SET needed to prove the contracts, APIs,
 * relationship resolution, retrieval, provenance and tests. It is NOT the full inventory.
 * ATL-01 identified 33 capabilities; 8 are registered here, chosen to exercise every
 * structural case the model must survive:
 *
 *   • CAP-FORECAST-STABILITY / -DECISION-GAP / -DECISION-WINDOW / -DECISION-REGRET
 *     One work package (DDF-01) delivering FOUR independently addressable capabilities.
 *     This is the cardinality case that decided ADR-052 (AC-ATL-02-9).
 *   • CAP-OBSERVATION-CORRESPONDENCE
 *     The inverse: ONE capability delivered across TWO work packages (CDI-08 + ESF-6).
 *   • CAP-COMMITMENT-INTELLIGENCE
 *     All three registry relationship types at once (SOL-*, EXP-*, PAT-*).
 *   • CAP-SHARED-DECISION-STATE
 *     An unregistered capability — real, contracted, tested, and in no SOL/EXP registry.
 *     ATL-01 found twenty of these; ADR-045 Amendment A exists because of them.
 *   • CAP-CURIOSITY-QUESTIONS
 *     An `experience` capability whose own content is the ADR-046 migration target.
 *
 * ATL-03 populates the remaining 25 and authors knowledge modules. Do not treat the
 * absence of a capability here as evidence it does not exist — see the ATL-01 inventory.
 *
 * ── Platform capabilities carry NO domain ───────────────────────────────────
 * `config/domains.ts` is a catalogue of INDUSTRY domains. It has no cross-domain or
 * platform entry, and adding a pseudo-domain to it to house platform capabilities would
 * pollute an industry catalogue to satisfy the Atlas. A platform capability therefore
 * carries `domains: []`, and its reach is expressed by `platform_reusable` plus the
 * `cross_domain_applicability` assessment in its knowledge module. "Which capabilities are
 * reusable?" is a `platform_reusable=true` filter, not a domain lookup.
 *
 * Governed by: CAPABILITY_KNOWLEDGE_MODEL.md · ADR-045 (as amended) · ADR-046 · ADR-047 · ADR-052
 */

import type { CapabilityIdentity } from '../packages/contracts/src/capability-atlas-model';

export const CAPABILITY_REGISTRY: CapabilityIdentity[] = [
  {
    capability_id: 'CAP-FORECAST-STABILITY',
    name: 'Forecast Stability Intelligence',
    summary: 'States whether the demand outlook is likely to remain materially unchanged, as distinct from whether the model is reliable.',
    capability_type: 'domain-capability',
    domains: ['retail_grocery'],
    personas: ['exec', 'demand_planner'],
    business_problems: ['bp-forecast-uncertainty'],
    tags: ['detection', 'forecasting', 'explanation'],
    demonstrated_by: ['SOL-DEMAND-02'],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['DDF-01'],
    lifecycle_state: 'Prototype',
    implementation_status: 'implemented',
    platform_reusable: true,
    knowledge_ref: 'cap-forecast-stability',
    owner: 'Demand Observability & Decision Intelligence',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-DECISION-GAP',
    name: 'Decision Gap Intelligence',
    summary: 'The difference between the commercial opportunity currently emerging and the organisation’s ability to capture it under existing commitments and constraints.',
    capability_type: 'domain-capability',
    domains: ['retail_grocery'],
    personas: ['exec', 'demand_planner', 'coo'],
    business_problems: ['bp-forecast-uncertainty', 'bp-supplier-reliability'],
    tags: ['detection', 'diagnosis', 'recommendation'],
    demonstrated_by: ['SOL-DEMAND-02'],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['DDF-01'],
    lifecycle_state: 'Prototype',
    implementation_status: 'implemented',
    platform_reusable: true,
    knowledge_ref: 'cap-decision-gap',
    owner: 'Demand Observability & Decision Intelligence',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-DECISION-WINDOW',
    name: 'Decision Window',
    summary: 'The period during which an intervention can still materially capture or protect the emerging opportunity, derived from a declared operational constraint.',
    capability_type: 'domain-capability',
    domains: ['retail_grocery'],
    personas: ['exec', 'coo'],
    business_problems: ['bp-decision-latency'],
    tags: ['detection', 'recommendation'],
    demonstrated_by: ['SOL-DEMAND-02'],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['DDF-01'],
    lifecycle_state: 'Prototype',
    /**
     * Partially implemented, not implemented: every constraint in the estate is a
     * MODELLED_DEMO_ASSUMPTION rather than an observed operational cut-off (ADR-042).
     * The field-level detail is in the knowledge module.
     */
    implementation_status: 'partially-implemented',
    platform_reusable: true,
    knowledge_ref: 'cap-decision-window',
    owner: 'Demand Observability & Decision Intelligence',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-DECISION-REGRET',
    name: 'Decision Regret Intelligence',
    summary: 'The expected economic consequence of choosing an inferior action, comparing Act Now, Wait and Do Nothing from shared inputs. Not forecast-error cost.',
    capability_type: 'domain-capability',
    domains: ['retail_grocery'],
    personas: ['exec', 'demand_planner'],
    business_problems: ['bp-decision-latency', 'bp-forecast-uncertainty'],
    tags: ['recommendation', 'simulation', 'explanation'],
    demonstrated_by: ['SOL-DEMAND-02'],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['DDF-01'],
    lifecycle_state: 'Prototype',
    implementation_status: 'implemented',
    platform_reusable: true,
    knowledge_ref: null,
    owner: 'Demand Observability & Decision Intelligence',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-OBSERVATION-CORRESPONDENCE',
    name: 'Observation Correspondence & Attested Admission',
    summary: 'Determines whether an observation addresses the decision that was contracted, against what tolerance, and whether its source carries authority.',
    capability_type: 'governance-control',
    domains: [],
    personas: ['cdao', 'decision_scientist'],
    business_problems: ['bp-ai-trust'],
    tags: ['audit-trail', 'human-in-the-loop', 'detection'],
    demonstrated_by: [],
    originated_as: [],
    evidenced_by: [],
    /** One capability, two work packages — the inverse cardinality case (ADR-052). */
    delivered_by: ['CDI-08', 'ESF-6'],
    lifecycle_state: 'Prototype',
    implementation_status: 'implemented',
    platform_reusable: true,
    knowledge_ref: null,
    owner: 'Enterprise Signal & Decision Contract',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-COMMITMENT-INTELLIGENCE',
    name: 'Commitment Intelligence',
    summary: 'Detects where a promise the enterprise has made will break before the customer experiences it, by propagating commitments across the operating chain.',
    capability_type: 'platform-capability',
    domains: ['retail_grocery'],
    personas: ['exec', 'coo', 'supply_chain_planner'],
    business_problems: ['bp-supplier-reliability', 'bp-decision-latency'],
    tags: ['detection', 'diagnosis', 'recommendation'],
    /** All three registry relationship types at once. */
    demonstrated_by: ['SOL-PROMO-01'],
    originated_as: ['EXP-COMMITMENT-01'],
    evidenced_by: ['PAT-COMM-01'],
    delivered_by: [],
    lifecycle_state: 'Prototype',
    implementation_status: 'partially-implemented',
    platform_reusable: true,
    knowledge_ref: null,
    owner: 'G10X Enterprise Innovation Lab',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-SHARED-DECISION-STATE',
    name: 'Shared Decision State',
    summary: 'One decision state shared across every CogniX surface, so a scenario changed in one place is the same decision everywhere else.',
    capability_type: 'enabling-service',
    domains: [],
    personas: ['enterprise_architect', 'cdao'],
    business_problems: ['bp-decision-latency'],
    tags: ['nextjs-api', 'audit-trail'],
    /** Unregistered: real, contracted and tested, and in no SOL or EXP registry (ADR-045 Amendment A). */
    demonstrated_by: [],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['WP10-C'],
    lifecycle_state: null,
    implementation_status: 'implemented',
    platform_reusable: true,
    knowledge_ref: null,
    owner: 'Adaptive Intelligence & Service Architecture',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  },
  {
    capability_id: 'CAP-CURIOSITY-QUESTIONS',
    name: 'Questions Worth Asking',
    summary: 'Curiosity-led entry into the estate: provocative enterprise questions that route to the experiment or solution able to answer them.',
    capability_type: 'experience',
    domains: [],
    personas: ['exec'],
    business_problems: ['bp-capability-discovery'],
    tags: ['enablement', 'explanation'],
    demonstrated_by: [],
    originated_as: [],
    evidenced_by: [],
    delivered_by: ['WP6'],
    lifecycle_state: 'Prototype',
    implementation_status: 'implemented',
    platform_reusable: true,
    knowledge_ref: null,
    owner: 'G10X Enterprise Innovation Lab',
    created_at: '2026-08-16',
    updated_at: '2026-08-20',
    reviewed_at: '2026-08-20',
    version: '1.0.0'
  }
];

/** Registry size guard. The registry is a registry; growth belongs in knowledge modules. */
export const REGISTRY_SUMMARY_MAX_LENGTH = 240;
