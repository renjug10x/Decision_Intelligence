# COGNIX ARCHITECTURE DECISION RECORDS (ADR)

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Principal Architecture Group

---

## ADR Index

- **ADR-001:** CogniX Positioning as Enterprise Innovation Lab (Not SaaS Product)
- **ADR-002:** Client-Neutral Core Architecture with Configurable Industry Packs
- **ADR-003:** Canonical Experiment Schema & Dynamic Registry
- **ADR-004:** Curiosity-Driven UX & Progressive Disclosure Pattern
- **ADR-005:** Causal Ripple & Commitment Propagation Graph Engine
- **ADR-006:** Gemini AI Integration via Generative Narrative & Evidence Synthesis Layer
- **ADR-007:** Strict IP Classification & Asset Provenance Metadata

---

### ADR-001: CogniX Positioning as Enterprise Innovation Lab
- **Status:** Accepted
- **Context:** The codebase originated as a customer-specific retail POC. We need to define the architectural boundary.
- **Decision:** Position CogniX as a lightweight, flexible Innovation Lab environment used to prototype ideas, rather than a monolithic SaaS platform. Core logic remains decoupled from specific client deployments.
- **Consequences:** Eliminates premature platform over-engineering. Prioritizes rapid experiment prototyping, clean configuration abstractions, and interactive demo fidelity.

---

### ADR-002: Client-Neutral Core Architecture with Configurable Industry Packs
- **Status:** Accepted
- **Context:** Hard-coded customer brand references (e.g. Lidl UK) prevent demonstration to other enterprise clients.
- **Decision:** Implement a strict separation between:
  1. `CogniX Core Shell` (Navigation, Experiment Registry, Curiosity Engine)
  2. `Experiment Engines` (Commitment Logic, Ripple Simulator)
  3. `Industry Packs` (Retail, Grocery, CPG, Logistics terminology & scenario datasets)
  4. `Client Demo Context` (Runtime overlay for client-specific terminology and currency).
- **Consequences:** Multi-client demo readiness without codebase branching or custom builds.

---

### ADR-003: Canonical Experiment Schema & Dynamic Registry
- **Status:** Accepted
- **Context:** Adding new experiments previously required editing monolithic sidebar component and page router switches.
- **Decision:** Define a typed `CognixExperiment` model and central `ExperimentRegistry`. UI navigation and workspace rendering are driven dynamically by registry metadata.
- **Consequences:** Modular experiment onboarding; retired experiments can be un-flagged without code deletion.

---

### ADR-004: Curiosity-Driven UX & Progressive Disclosure Pattern
- **Status:** Accepted
- **Context:** Standard BI dashboards flood executives with 20 charts without answering *why* or *what next*.
- **Decision:** Adopt a 3-tier progressive disclosure flow:
  1. Provocative Executive Question
  2. Interactive Experiment Canvas & Scenario Simulator
  3. Deep Evidence & Causal Telemetry Drawer
- **Consequences:** Dramatic improvement in executive engagement; reduces visual clutter.

---

### ADR-005: Causal Ripple & Commitment Propagation Graph Engine
- **Status:** Accepted
- **Context:** Commitment Intelligence and Decision Ripple require modeling interconnected enterprise stages.
- **Decision:** Build lightweight in-memory directed graph structures representing commitment chains (Marketing → Demand → Supplier → Inventory → Fulfilment → Delivery → Customer) and ripple effects (1st, 2nd, 3rd order impacts).
- **Consequences:** Deterministic, reproducible, instant-response scenario propagation without complex backend database requirements during lab demos.

---

### ADR-006: Gemini AI Integration via Generative Narrative & Evidence Synthesis Layer
- **Status:** Accepted
- **Context:** Generative AI should not hallucinate core metrics or decision outcomes during live executive demos.
- **Decision:** Use deterministic graph models and linear math for calculations, financial impact, and confidence scores. Pass structured causal state to Google Gemini API (`gemini-2.0-flash` / `gemini-1.5-flash`) strictly for executive summary synthesis, natural language explanation, and curiosity question generation.
- **Consequences:** Zero risk of metric hallucination while leveraging state-of-the-art LLM narrative capabilities.

---

### ADR-007: Strict IP Classification & Asset Provenance Metadata
- **Status:** Accepted
- **Context:** Lab assets must be protected and classified before sharing with prospective clients.
- **Decision:** Enforce IP classification tags (`Open Innovation`, `G10X Proprietary`, `Client Confidential`, `Joint Innovation`, `Client Exclusive`) across all experiment registries and document headers.
- **Consequences:** Clear asset legal boundaries and explicit G10X accelerator tracking.

---

### ADR-008: Controlled Local Demo Authentication Mode Bypass
- **Status:** Accepted
- **Context:** Local and internal CogniX demonstrations require immediate access to the Innovation Portfolio without depending on external OAuth/backend identity microservices that may be unavailable offline or in local dev environments.
- **Decision:** Introduce a controlled, environment-flagged authentication bypass (`NEXT_PUBLIC_COGNIX_DEMO_MODE=true`). When enabled, `AuthContext` initializes a synthetic `COGNIX_DEMO_USER` session (Name: Demo User, Role: Innovation Executive, Org: G10X) and bypasses network token validation and backend login/logout requests.
- **Security Boundary & Removal Strategy:** When `NEXT_PUBLIC_COGNIX_DEMO_MODE` is unset or `false`, the application enforces full production authentication (token validation, route guards, identity endpoints). No production authentication code or API handlers are removed or weakened.

---

### ADR-009: Two-Tier Asset Model (Innovation Experiments vs Demonstration Solutions)
- **Status:** Accepted
- **Context:** CogniX requires both emerging operational ideas (Asset Type A) and reusable working business capabilities (Asset Type B) to demonstrate real-world analytics and AI.
- **Decision:** Formally define the `CognixSolution` schema and `DEMONSTRATION_SOLUTIONS` registry in `config/solutions.ts` separate from `EXPERIMENT_REGISTRY`.
- **Consequences:** Provides explicit taxonomy separation while enabling seamless contextual handoffs between working solutions and G10X innovation experiments.

---

### ADR-010: Phase 7 Enterprise Memory & Phase 8 Opportunity Intelligence Integration
- **Status:** Accepted
- **Context:** Executives require historical case pattern matching (*"Have we seen this before?"*) and proactive upside opportunity detection.
- **Decision:** Implement `EnterpriseMemory` case store (Phase 7) and `OpportunityIntelligence` solver (Phase 8), directly integrated into the curiosity navigation flow.
- **Consequences:** Completes the end-to-end executive discovery storyline from question to opportunity action.

---

### ADR-011: CogniX Wordmark & G10X Semantic Color Visual System
- **Status:** Accepted
- **Context:** CogniX required a refined, lightweight enterprise visual identity aligned with G10X brand values without heavy decorative waveforms or dark command-center top bars.
- **Decision:** Establish typography wordmark `CogniX` (`C` in G10X Orange `#FF6B00`, `ogni` in near-black charcoal `#0F172A`, `X` in G10X Red `#E11D48`), G10X semantic color system (Curiosity/Opportunity → Orange, Risk/Gap → Red), reduced typography scale, and light neutral navigation surface.
- **Consequences:** Provides a quiet, architectural executive visual identity where data and curiosity take precedence over UI chrome.

---

### ADR-012: Organisational Learning Intelligence & Capability Reintegration
- **Status:** Accepted
- **Context:** Enterprise decisions require systematic learning from previous interventions while leveraging historical contract verification and execution planning without creating bloated top-level navigation items.
- **Decision:** Establish `EnterpriseLearningPattern` model and registry (`Observe → Learn → Match → Reuse`), embedding pervasive pattern cards across all solutions and experiments. Reintegrate `ExecutionBriefing` and `ContractVerification` as embedded contextual proof and execution sub-capabilities.
- **Consequences:** Completes the closed-loop learning cycle: `Signals → Precedent (Memory) → Pattern Match → Contract Verification → Execution Briefing → Action → Outcome → New Pattern`.

---

### ADR-013: API-First Architecture & Service-Oriented Evolution
- **Status:** Proposed & Approved
- **Context:** Business logic, decision state, and simulation logic are currently coupled inside Next.js presentation components, preventing multi-service scaling.
- **Decision:** Adopt an API-first progression (`Domain Model → API Contract → Event Schema → Implementation`). All future capabilities must expose versioned REST APIs (`/api/v1/...`) and OpenAPI specifications before implementation begins.
- **Consequences:** Decouples UI presentation from backend intelligence, enabling independent service scaling and API-driven enterprise integrations.

---

### ADR-014: Initial Seven-Deployable Containerized Topology
- **Status:** Proposed & Approved
- **Context:** Transitioning to microservices risks over-decomposition and operational complexity if dozens of tiny services are created prematurely.
- **Decision:** Decompose CogniX into an initial topology of seven deployables: `cognix-web`, `cognix-core`, `cognix-world`, `cognix-decision`, `cognix-learning`, `cognix-intelligence`, and `cognix-governance`.
- **Consequences:** Maintains manageable operational complexity via Docker Compose locally, while establishing clean domain boundaries for future physical microservice splits.

---

### ADR-015: Observable Event Telemetry Stream (`journey.event.emitted`)
- **Status:** Proposed & Approved
- **Context:** Adaptive learning and personalisation require an empirical log of user interactions and decision scenario shifts.
- **Decision:** Mandate that every meaningful user interaction (`SESSION_STARTED`, `SCENARIO_CHANGED`, `PATTERN_MATCHED`, `RECOMMENDATION_ACCEPTED`, `DECISION_EXECUTED`, `OUTCOME_OBSERVED`) emit a structured JSON telemetry event carrying standard header metadata (`tenant_id`, `user_id`, `session_id`, `correlation_id`).
- **Consequences:** Unlocks real-time journey observability, Intelligence Moment triggers, and ML feature ingestion.

---

### ADR-016: Shared Temporal Enterprise World Engine (`T-90` to `T+30`)
- **Status:** Proposed & Approved
- **Context:** CogniX solutions currently operate against isolated mock datasets rather than a unified temporal enterprise reality.
- **Decision:** Establish `cognix-world` as a shared synthetic simulation engine modeling temporal supply chain, demand, and inventory telemetry across `T-90` (historical baseline) to `T+30` (projected trajectory) for 12 causal scenario families.
- **Consequences:** Provides a single, causally coherent enterprise reality across all CogniX experiments and demonstration solutions.

---

### ADR-017: Shared Cross-Solution Decision State Orchestration
- **Status:** Proposed & Approved
- **Context:** Interventions selected in one demonstration solution (e.g. backup supplier activation in Promotion Intelligence) do not currently propagate to affect other solutions.
- **Decision:** Build `cognix-decision` as a centralized Decision State orchestrator. State changes in one experience publish events that immediately update cross-cutting enterprise decision parameters.
- **Consequences:** Enables CogniX to behave like one unified, responsive enterprise system across all decision views.

---

### ADR-018: Machine Learning & Generative AI Layer Separation
- **Status:** Proposed & Approved
- **Context:** Generative AI (Gemini) must not be relied upon for deterministic calculations or quantitative decision rules due to hallucination risks.
- **Decision:** Enforce strict separation into 4 layers: Deterministic (rules, SLA thresholds, financial math), ML/Statistical (similarity scoring, outcome prediction, intervention ranking), Optimisation (trade-off solvers under constraints), and GenAI (synthesis, narrative storytelling, and curiosity generation).
- **Consequences:** Guarantees factual, audit-ready decision scoring while leveraging Gemini for executive storytelling.

---

### ADR-019: Service-Owned Schema Isolation & PostgreSQL Strategy
- **Status:** Proposed & Approved
- **Context:** Direct cross-service database access creates brittle coupling and breaks microservice boundaries.
- **Decision:** Provision a managed PostgreSQL instance with isolated per-service schemas (`identity.*`, `world.*`, `decision.*`, `memory.*`, `learning.*`, `contracts.*`). Services own their schemas exclusively and may only communicate via REST APIs or Event Streams.
- **Consequences:** Ensures database-level decoupling and prepares CogniX for future physical database partitioning without immediate operational overhead.

---

### ADR-020: Multi-Tenant Data & Learning Isolation Scopes
- **Status:** Proposed & Approved
- **Context:** Enterprise clients require strict data confidentiality to prevent proprietary operational data or learning patterns from leaking across tenant boundaries.
- **Decision:** Enforce three distinct learning scopes: Tenant-Private Learning (100% isolated by `tenant_id`), Cross-Tenant Generalised Learning (anonymised G10X IP), and Global Synthetic Learning (out-of-the-box demo baseline).
- **Consequences:** Guarantees zero tenant data leakage while preserving G10X's ability to build reusable enterprise learning patterns.

---

### ADR-021: Counterfactual Learning & Pattern Confidence Decay
- **Status:** Proposed & Approved
- **Context:** Static learning pattern confidence scores risk presenting obsolete operational assumptions as permanent truth.
- **Decision:** Implement counterfactual outcome tracking (`Predicted` vs `Actual`) and automatic pattern confidence decay. If actual outcomes contradict a pattern across 3+ consecutive occurrences, the pattern confidence score is automatically downgraded.
- **Consequences:** Maintains organizational learning integrity by ensuring CogniX patterns adapt dynamically to changing enterprise environments.

---

### ADR-022: Eight-Stage Strangler Migration Strategy
- **Status:** Proposed & Approved
- **Context:** Rewriting CogniX from scratch risks breaking working executive demonstration capabilities.
- **Decision:** Adopt an 8-stage strangler migration strategy (`Stage 1: API Contracts` $\rightarrow$ `Stage 8: Thinned Presentation Application`), progressively extracting backend services while keeping the Next.js presentation UI fully operational at every stage.
- **Consequences:** Guarantees 100% demo continuity and zero downtime throughout the multi-service transformation.

---

### ADR-023: Strict Architectural Separation of Journey Telemetry and Enterprise Signals
- **Status:** Approved
- **Context:** User interface interactions and enterprise/market operational signals carry fundamentally different semantics and operational lifecycles. Conflating them risks corrupting user analytics and machine learning models.
- **Decision:** CogniX explicitly separates:
  1. `Journey Telemetry` (`journey-model.ts`): Captures what the CogniX user does (`SESSION_STARTED`, `SCENARIO_CHANGED`, `EXECUTION_BRIEFING_OPENED`).
  2. `Enterprise Signals` (`EnterpriseSignal` contract): Captures what is happening in the enterprise, customer environment, or logistics network (`basket_add_acceleration`, `supplier_lead_time_drift`).
- **Consequences:** Prevents telemetry schema pollution and maintains clean domain boundaries for future ML pattern learning.

---

### ADR-024: Synthetic-First, Connector-Compatible Enterprise Signal Contract
- **Status:** Approved
- **Context:** CogniX requires demonstrable early customer and supply chain signals before physical connectors to enterprise planning platforms (Blue Yonder, SAP IBP) are active.
- **Decision:** Define a single canonical `EnterpriseSignal` contract schema. Synthetic signal generators in `cognix-world` emit signals using the exact transport contract expected from future production connectors.
- **Consequences:** Guarantees zero code rewrite when transitioning from synthetic innovation demonstrations to production enterprise deployment.

---

### ADR-025: Intent Fusion Intelligence as a Reusable Cross-Functional Mechanism
- **Status:** Approved
- **Context:** Executive innovation propositions (e.g. Intent Fusion) risk proliferating top-level sidebar navigation items and competing with established customer forecasting tools.
- **Decision:** Intent Fusion is implemented as a reusable cross-functional intelligence mechanism reconciling Commercial Intent, baseline enterprise forecasts, observed Enterprise Signals, and downstream commitments into `Shared Decision State`. CogniX does not replace the enterprise forecast; it contextualises decision consequences around it.
- **Consequences:** Maximises component reuse across `Promotion`, `Forecasting`, `Commitment`, `Ripple`, and `Briefing` without adding UI clutter.

---

### ADR-026: Campaign Decision Intelligence Architecture & 14-Capability Framework
- **Status:** Approved & Authoritative
- **Context:** Standard retail promotion tools focus narrowly on SKU discount depth optimization, ignoring counterfactual baselines, micro-market targeting, multi-objective trade-offs, pre-mortems, decision half-lives, and closed-loop learning.
- **Decision:** CogniX adopts the **Campaign Decision Intelligence** architecture, establishing a 14-capability framework connected across the domain chain:
$$\text{Opportunity Intel} \longrightarrow \text{Campaign Decision Intel} \longrightarrow \text{Decision Contract} \longrightarrow \text{Intent Fusion} \longrightarrow \text{Demand/Forecast} \longrightarrow \text{Signals} \longrightarrow \text{Decision State} \longrightarrow \text{Ripple} \longrightarrow \text{Memory} \longrightarrow \text{Learning}$$
- **14 Core Capabilities:**
  1. Campaign Decision Canvas
  2. Counterfactual Baseline
  3. Causal Campaign Model
  4. Opportunity Window Discovery
  5. Micro-Market Opportunity Graph
  6. Campaign Decision Readiness
  7. Decision Timeline
  8. Curiosity-Driven Demand Decomposition (`What? → Why? → Evidence → What If?`)
  9. Multi-Objective Outcome Frontier
  10. AI-Generated Competing Strategies
  11. Decision Contract & Intent Fusion
  12. Decision Half-Life
  13. Campaign Pre-Mortem
  14. Closed Learning Loop
- **Consequences:** Differentiates CogniX from legacy promotion tools by discovering whether intervention is needed, determining what intervention should be made, discovering where and when it should happen, understanding cross-functional consequences, monitoring recommendation half-life, and learning from reality afterwards.

---

### ADR-027: Provider-Neutral External Signal Connector Contract (ESF-3)
- **Status:** Approved & Implemented
- **Context:** Production and contextual feeds (planning, commerce, weather, events, competitive intel, operational telemetry, demographic context) must enter CogniX without coupling the architecture to any single vendor platform.
- **Decision:** Introduce a provider-neutral connector contract (`ExternalSignalConnectorDescriptor`, `ExternalSignalEnvelope`) and a deterministic normalisation path into the existing canonical `EnterpriseSignal` model. Vendor systems may appear only as optional reference adapter aliases. Raw provider payloads are forbidden on the canonical path; only opaque `provider_payload_ref` provenance is retained. Synthetic/demo adapters always set `synthetic_demo=true`.
- **Consequences:** Preserves ESF-1/ESF-2 interchangeability, enables CDI-07B production binding later, and keeps CogniX free of vendor-specific architectural dependencies.

---

### ADR-028: Campaign Decision Canvas & Authoritative CampaignIntent Contract (CDI-01)
- **Status:** Approved & Implemented
- **Context:** Downstream CDI packages require a stable, long-lived intent contract and a progressive non-cockpit canvas that establishes what is under consideration before prediction or readiness intelligence exists.
- **Decision:** Introduce a four-area `CampaignIntent` contract (`Campaign Intent`, `Baseline & Objective`, `Audience & Market`, `Decision Context`) with explicit `InterventionPosture` values that treat promotion as one optional lever (`UNDECIDED` | `CONSIDER_PROMOTION` | `CONSIDER_NON_PROMOTION` | `CONSIDER_DO_NOTHING`). Persist drafts/registrations via BFF APIs, transition Shared Decision State with `REGISTER_CAMPAIGN_INTENT`, and project to IFI-01 `CommercialIntent` only when promotion is explicitly considered. Forbid embedding CDI-02+ calculation fields in CDI-01 payloads.
- **Consequences:** Freezes the authoritative intent interface for CDI-02–CDI-07B while preserving Commercial Intent compatibility and preventing premature causal/readiness UI.
- **Isolation semantics (independent review, 2026-08-15):** `campaign_intent_id` is derived from tenant/session and is therefore *enumerable* — it is an identifier, never an authorisation token. Ids carry a deterministic digest of the exact `tenant::session` pair so that ambiguous pairs cannot collide; id resolution is tenant-scoped and reports a tenant mismatch as `404`; and writes reject any id already owned by a different tenant/session.
- **Provenance semantics (independent review, 2026-08-15):** IFI-01 `CommercialIntent` mandates `promotion_type` and `discount_depth`. When the canvas has not stated a mechanic, CDI-01 supplies a placeholder to keep the contract valid and labels it via `promotion_type_source` / `discount_depth_source` / `timing_source` (`canvas_stated` | `cdi01_placeholder_default`). Downstream CDI packages **must** read these before treating a mechanic as committed intent, so that "promotion is not assumed" holds through the projection boundary.
- **Deferred additive evolution:** Intent Fusion consumers key off `CommercialIntent`, so non-promotion postures reach Shared Decision State (via posture-independent `campaign_intent_ref`) but not Intent Fusion. Admitting them later requires a posture-neutral intervention abstraction — additive to this frozen contract, and explicitly out of CDI-01 scope.
- **Decision dimensions are bounded, and each carries its own evidence class (amendment, 2026-08-17):** `category`, `customer_segment` and `channel` were free-text strings. Free text cannot be reasoned over, so `channel` was read by no engine at all, `customer_segment` acted only through a substring test for the literal token `family`, and `category` acted only through an opaque name hash that produced a ±6% band with no modelled meaning — enough, on economics that sit near a contribution breakeven, to flip a verdict when a category was merely respelled. `campaign-decision-taxonomy-model` replaces them with bounded taxonomies whose entries carry the planning properties an engine can use. The fields stay typed as `string` so intents recorded before the taxonomy keep loading; an unrecognised value resolves to `null` and is treated as an unclassified free-text declaration, never coerced to a near match. Each entry declares its `evidence_basis`: `CATALOGUE_BACKED` (the eight categories, whose SKU counts, supplier concentration and subcategories are asserted against `data/products.json` and `data/suppliers.json` by test), `DOMAIN_CONSTANT`, or `DEMO_ASSUMPTION` (every segment and channel reach figure — this estate holds no customer or channel data, and readiness reports that verbatim rather than presenting a planning assumption as measurement).
- **Sales channel and activation channel are separate fields (amendment, 2026-08-17):** "Channel" in retail planning conflates where the customer transacts with how the campaign reaches them. They fail separately — in-store point-of-sale reaches nobody buying online, and a shelf-edge price cut cannot be confined to a targeted customer however it is advertised — so `audience_market.channel` now means the sales channel and `audience_market.activation_channels` carries the media routes. The alternative, one oversized dropdown, hides the incompatibility rather than surfacing it. Store format (Metro / Standard / Superstore) is deliberately not a channel: it is estate segmentation and belongs to CDI-03 micro-markets.
- **Targeting is an intent, and an unconfinable offer is a constraint (amendment, 2026-08-17):** Declaring a segment states who the campaign is *for*; it does not make the discount reach only them. Where the chosen route cannot address an individual customer, CDI-04 raises `U6_offer_not_confinable` and CDI-02 charges the promotional erosion against the whole base. This is the mechanism by which a narrower configuration can return more contribution on less volume — the trade-off the comparison surface exists to show — and it is derived from the declared route, never asserted. A declared segment also makes CDI-07B outcome observation non-binding, because no segment-grained observation exists in this estate; that remains correct-by-design and is not worked around.

---

### ADR-029: Deterministic Counterfactual Baseline & Causal Demand Engine (CDI-02)
- **Status:** Approved & Implemented
- **Context:** Campaign Decision Intelligence must separate current run-rate, expected without intervention, and predicted with intervention, while never treating CDI-01 compatibility placeholders as stated commercial intent.
- **Decision:** Introduce `CounterfactualBaseline` and `CausalDemandContribution` contracts with a pure deterministic engine that (1) reconciles causal drivers to predicted uplift, (2) collapses Do Nothing / Undecided predictions to the without-intervention path, (3) attributes promotional mechanic response only when both mechanic and depth are `canvas_stated`, and (4) consumes ESF-2 signal pressure without feeding placeholder discount depths as `promotion_lift`.
- **Consequences:** Unlocks CDI-04/CDI-05 HARD dependencies, elevates Campaign Delta as the primary should-we-intervene surface, and preserves the CDI-01 provenance contract freeze.
- **Ambient vs intervention classification (independent review, 2026-08-15):** Every causal driver declares a `driver_class`. `ambient` drivers (intrinsic run-rate drift, observed ESF-2 signals) act on the world whether or not we intervene, so they are applied to the **without-intervention path as well as** the predicted path and cancel out of the Campaign Delta. `intervention` drivers are the only ones the campaign is credited with. Consequently `CONSIDER_DO_NOTHING` suppresses intervention drivers only — doing nothing means *taking no action*, never *the world stops moving* — and `campaign_delta.attributable_uplift_pp` measures what the campaign causes, distinct from `total_predicted_uplift_pp`, which measures total movement against the current baseline.
- **Reconciliation is an invariant, not a label (independent review, 2026-08-15):** `reconciled_sum_pp` sums **all** drivers, not only attributed ones, so a driver that is simultaneously non-zero and unattributed fails validation instead of vanishing from both sides of the check. `validateCounterfactualBaseline` independently re-derives `predicted − without` and rejects any baseline whose trajectory does not match its declared attributable uplift.
- **Promotional economics (independent review, 2026-08-15):** Promoted volume carries an eroded unit contribution (`PROMO_CONTRIBUTION_EROSION_PER_DEPTH_POINT`), gated on the same `canvas_stated` provenance rule as demand attribution. Without it, contribution was a pure function of volume, so deeper discounting always appeared more valuable and the engine could not express a negative campaign case. The constant is a deterministic demo assumption and an explicit calibration target for later ML work — it is not a learned elasticity.
- **By-id resolution (independent review, 2026-08-15):** A request naming a `campaign_intent_id` is answered with that campaign or with `404`. Falling back to the caller's current intent would answer a question about campaign X with an evaluation of campaign Y and would mask an isolation failure as a successful `200`.

---

### ADR-030: Opportunity Window Discovery & Micro-Market Opportunity Graph (CDI-03)
- **Status:** Approved & Implemented
- **Context:** Campaign Decision Intelligence must answer *when* and *where* to intervene using explainable, deterministic evaluation over Enterprise World store data — without opaque AI rankings and without inventing a promotion mechanic from `CONSIDER_PROMOTION` alone.
- **Decision:** Introduce `OpportunityWindowEvaluation` and `MicroMarketOpportunity` contracts with a deterministic engine that (1) ranks candidate date windows under `KNOWN_DATES` (stated window recommended) vs `FIND_BEST_WINDOW` (highest yield recommended), (2) scores all 50 WP10-A stores into HIGH/MEDIUM/WATCH/EXCLUDE tiers with inclusion/exclusion reasons, (3) labels synthetic coefficients as `synthetic_demo`, and (4) feeds an additive optional `resolved_temporal_uplift_pp` into CDI-02 so FIND_BEST_WINDOW timing placeholders are replaced only when a window is actually resolved.
- **Consequences:** Unlocks CDI-04 INTEGRATION on micro-markets and CDI-05 ENHANCEMENT on opportunity windows. CDI-01/CDI-02 contracts remain frozen except for the additive temporal hook fields on `CampaignEvaluationRequest`. LLM-dependent ranking is explicitly out of scope.
- **Store/micro-market assumptions:** Catchment density, staff capacity, format fitness, and availability proxies are deterministic demo heuristics keyed from `data/stores.json` attributes — not learned elasticities. Region scope match and cohort-hint alignment use canvas-stated Audience & Market fields truthfully.
- **Bounded scores are normalised, never clipped (independent review, 2026-08-15):** Window yield is mapped onto 0–100 by normalising against the factor model's theoretical bounds. Clipping saturated the ceiling, so multiple candidates scored exactly 100, the recommended window was decided by sort order rather than merit, and the temporal uplift handed to CDI-02 pinned to its maximum for effectively every campaign. A ranking that cannot separate its own top candidates cannot justify a recommendation.
- **Seeded time is disclosed time (independent review, 2026-08-15):** Candidate generation is anchored to a fixed date for reproducibility, so every evaluation publishes `discovery_anchor` in the contract, in `provenance`, in OpenAPI, and on the Canvas. Determinism is a legitimate demo property; presenting a seeded calendar as live evidence is not, and the disclosure travels with the data rather than living in documentation.
- **Stated dates are reported verbatim (independent review, 2026-08-15):** `KNOWN_DATES` without a valid stated range is rejected with `InvalidTimingIntent` rather than silently anchored to a discovery-grid window, and stated ranges of any length are honoured as given. Substituting a default duration made the canvas report an end date the user never stated. Weekday mix is a duration-invariant share so long windows remain comparable.
- **Country qualifiers do not widen scope (independent review, 2026-08-15):** Only genuine estate-wide tokens broaden region scope. Substring-matching `uk` made `"UK South East"` include all 50 stores while telling each one it matched the campaign scope — a scoping failure that also emitted an untruthful inclusion reason.
- **One tenant/session boundary (independent review, 2026-08-15):** All CDI-03 entry points resolve campaigns through a single exported resolver. Three parallel copies of an isolation check are three chances for it to drift.

---

### ADR-031: Campaign Decision Readiness Lattice & Resilience Boundary (CDI-04)
- **Status:** Approved & Implemented
- **Context:** Campaign Decision Intelligence must answer whether the organisation is ready to proceed with a specified intervention, without collapsing six independent concerns into a weighted score, without inventing a parallel risk/ripple engine, and without letting synthetic demonstration thresholds manufacture hard vetoes.
- **Decision:** Introduce `DecisionReadinessAssessment` with six dimensions (Commercial, Demand, Operational, Context, Customer, Strategic). Aggregation is a **floor over a lattice** (`GO` / `CONDITIONAL_GO` / `REVIEW` / `DO_NOT_PROCEED`) with caps K1–K8. All non-feasibility cut-offs live in one exported `ReadinessThresholdPolicy` labelled `synthetic_demonstration_policy`; `effect_ceiling` is structurally limited to `WATCH`/`CONSTRAINED`. Hard vetoes are integrity, stated-objective contradiction, declared-tolerance breach, structural operational infeasibility (`commitment_gap_units > recoverable_headroom_units`), or no addressable estate. Commercial is objective-aware (U2) with optional `economic_tolerance` (illegal on `VALUE_CREATION`). Resilience evidence is read-only references into WP10-C `DecisionDerivedImpacts` — no `lib/ripple-engine.ts`, no likelihood×impact matrix.
- **Consequences:** Unlocks CDI-05 INTEGRATION on readiness. Synthetic-only demo evidence cannot produce unconditional `GO`. CDI-01/02/03 contracts unchanged. Threshold calibration remains a declared residual (RR-1).
- **Confidence under model divergence (ruling, independent review 2026-08-15):** The design gate contradicted itself — §2.5 rule 4 and acceptance criterion 18 cap confidence at `MODERATE`, while the §4.2 band table listed divergence as a `LOW` trigger. `LOW` trips cap K5 and forces `REVIEW`, which would have turned every recoverable operational gap into human adjudication on the strength of two independent demo models disagreeing about lift — a disagreement CDI-04 already neutralises by taking demand exclusively from CDI-02. The `MODERATE` cap is authoritative. Divergence stays consequential: it is published as `model_divergence` and `capacity_basis.model_divergence_pp`, raises a WATCH finding on Operational, and can never reach `HIGH` confidence or `GO`. Design gate §4.2 has been reconciled to this rule.
- **Absence is a cap, never a forced REVIEW (independent review 2026-08-15):** An absent optional integration (CDI-03, Shared Decision State, signals) lowers confidence to `MODERATE` and applies caps K2/K3/K4. Routing optional absence through the `LOW` band would trip K5 and contradict owner ruling U6. Absence is still never neutral: it is published in `evidence_coverage.missing`, the dimension is `NOT_EVALUATED` with a reason, and the band is capped.
- **CDI-04 is a read-only consumer of WP10-C (independent review 2026-08-15):** Readiness resolves Shared Decision State through `peekCurrentStateBySession`, which never initialises state. The auto-creating `getCurrentStateBySession` would have made a read-only consumer a writer and made rule O7 / cap K3 unreachable. `IDecisionStateStore` gains the non-mutating accessor; no existing WP10-C behaviour changes.
- **A parity guard must be able to fail (independent review 2026-08-15):** WP10-C lever headrooms are inline literals inside `calculateDerivedImpacts()`, so the CDI-04 mirror cannot be compared by reference. Comparing it against a duplicated literal is a tautology no upstream drift could break. `assertRecoveryLeverParity()` now measures the capacity delta each lever actually produces and asserts the mirror equals it.
- **A discharge test must be re-runnable, not a restatement (independent review 2026-08-15):** Synthesising `DIMENSION.state === 'CLEAR'` for any unconditioned constraint made every constraint dischargeable and left the §3.7 `REVIEW` degradation structurally unreachable. Conditions for `CONSTRAINED` dimensions must be authored by the rule that produced them; a constraint with no real discharge test degrades to `REVIEW`. Operational `O2` names the minimal lever *set* whose combined headroom actually closes the gap, so the published test is satisfiable.

---

### ADR-032: Decision Timeline Temporal Rendering & Partitioned Demand Decomposition (CDI-05)
- **Status:** Approved & Implemented (independently reconciled 2026-08-15)
- **Context:** Campaign Decision Intelligence must answer *what happens over time* and *why this outcome is predicted* without inventing a second demand model, without fabricating temporal response curvature, and without presenting synthetic modelled run-rate as observed history.
- **Decision:** Introduce `DecisionTimelineProjection` and `DemandDecomposition` as a **temporal rendering of one closed CDI-02 evaluation**. Allocation is frozen to the single member `FLAT_RATE_IDENTITY` (U1). Exactly two trajectories (`COUNTERFACTUAL`, `INTERVENTION`) and four lenses (`DEMAND`, `REVENUE`, `CONTRIBUTION`, `INVENTORY`). `PRE_CAMPAIGN` is flat at `index_pct === 100` with disclosure “modelled run-rate, not observed history”. During `CAMPAIGN`, ambient movement appears **identically** on both trajectories; only the intervention component differs. `POST_CAMPAIGN` is structurally present and numerically empty (`null` components + `not_modelled_reason`) — never zero or convergent (U3). Revenue is `NOT_AVAILABLE` with `required_authoritative_input` naming `realised_unit_selling_price_gbp` and inadmissible substitutes (U2). Confidence reuses the CDI-04 taxonomy; the primary surface is **band-only** (U4). Decomposition is partitioned by `driver_class` with no merged ambient/intervention waterfall. One endpoint `POST /api/v1/campaigns/timeline` returns both artefacts; reconciliation failure emits neither.
- **Consequences:** Unlocks CDI-06 HARD on `DemandDecomposition`. CDI-01/02/03/04 contracts unchanged. Naming correction: MASTER_PLAN artefact is `DecisionTimelineProjection` (not `DemandTimelineProjection`). Planning-report row 8 no longer maps decomposition to Intent Fusion — both artefacts share `/timeline`.
- **Ambient parity is an emit gate (U1 / I1 / I1a):** A campaign-period counterfactual pinned to 100 while `ambient_uplift_pp ≠ 0` fails validation and emits no projection. Ambient may never reach Tier 1, the effect envelope, or lens differences.
- **Allocation redistributes, never creates:** Campaign-period index endpoints must reconcile to CDI-02 within tolerance; no cumulative / horizon-total quantities; no Decision Half-Life semantics (CDI-07A).
- **Carried residuals (not CDI-05 defects):** weekly-rate/horizon ambiguity (RR-1), absent realised unit price (RR-2), inventory waste step (RR-3), seeded CDI-03 discovery anchor (RR-4), declared envelope profile (RR-5), coarse ESF-2 period grain (RR-6), single-value `calculation_mode` (RR-7), CDI-04-absent band cap (RR-8).
- **A null series can still be asserted by the band drawn over it (independent review 2026-08-15):** `POST_CAMPAIGN` points were correctly `null`, yet both trajectory envelopes were centred on the identity across that region and the attributable-effect envelope was centred on zero — drawing reversion and convergence over a phase CDI-02 does not model. U3 binds the envelope layer as well as the series: `assertEnvelopeWithinModelledPhases` bounds every band to the modelled phases, and the effect band to the `CAMPAIGN` phase alone.
- **A lens may not carry an intervention effect before the intervention exists (independent review 2026-08-15):** the Contribution lens applied promotional unit-contribution erosion to the pre-campaign period, drawing the campaign destroying contribution fourteen days before it began; the Inventory lens published zero waste pre-campaign against a CDI-02 baseline of 420. Pre-campaign is the CDI-02 **current-baseline** run rate, so both lenses render it at baseline rates on both trajectories. I2/I3 hold at the lens layer, not only on the index series.
- **RJ3 binds every supplied upstream artefact, not only CDI-02 (independent review 2026-08-15):** an `opportunity_discovery` resolves the grid and a `readiness` supplies the confidence band and Tier 1 state, so either bound to a different campaign — or a readiness built over a different CDI-02 evaluation — renders one coherent picture over two decisions. One evaluation, one timeline, enforced.
- **Chart obligations are contract obligations (independent review 2026-08-15):** §6 requires both envelopes drawn, phases visually distinct, gaps rendered as gaps and the unmodelled region explicit. The Layer 5 surface draws straight-segment polylines only — no curve type, spline, easing, smoothing or tension — and the CDI-05 suite asserts the rendered SVG, not only the payload behind it.

---

### ADR-033: Multi-Objective Outcome Frontier & Competing Strategies (CDI-06)
- **Status:** Approved & Implemented — independently reconciled 2026-08-15
- **Context:** Campaign Decision Intelligence must expose meaningful strategy trade-offs without collapsing them into an opaque weighted score, without comparing plays under different ambient worlds, and without inventing economics the estate does not model.
- **Decision:** Introduce `OutcomeFrontier` / `StrategyPlay` with deterministic generation policy G0–G3. Every play is a real inline CDI-02 evaluation (never registered). Exactly two Pareto axes: `attributable_volume_uplift_pp` and `contribution_delta_gbp`. ARF-A `SIGNALS_EXCLUDED` is the only emitting ambient frame (U1); ARF-B `SIGNALS_SHARED` is contracted `UNAVAILABLE`. Scenario 0 is mandatory, sits at (0, £0) by construction, remains visible when dominated, and is never framed as “no change”. Non-promotion is generated and shown unaltered but `PRESENTED_NOT_RANKED` / `EXCLUDED_ECONOMICS_INCOMPLETE` until authoritative execution economics exist (U4). Selection is a pure function of declared constraints that only remove plays; more than one survivor ⇒ `CHOICE_REQUIRED`. `Balanced` only under a unique Pareto-efficient survivor with ≥2 **human-declared** opposing-axis constraints. Readiness annotates/constrains and never rewrites economics. No LLM in generation, evaluation, membership or selection.
- **Consequences:** Unlocks CDI-07A HARD on `OutcomeFrontier`. CDI-01–05 contracts are **unmodified**: CDI-06 declares its own `FrontierRequiredAuthoritativeInput` for capability tokens rather than widening the CDI-05 `RequiredAuthoritativeInput.enables` union, and reuses `REVENUE_REQUIRED_INPUT` by reference. Planning-report rows 9–10 reconciled to two admitted axes and a single `/outcome-frontier` endpoint.
- **F-INV-1:** Ambient frame verified, never assumed — divergence ⇒ `NOT_EMITTED` / `AMBIENT_FRAME_DIVERGENCE`. Frame equality is necessary but **not sufficient**: `assertComparisonSetIntegrity` additionally confines every play delta to the declared mutable set and publishes the frozen comparison invariants.
- **No hidden aggregate:** Enforced by **allowlisting** every permitted numeric key path on a play, not by a denylist of suggestive names — an innocuously-named ordering scalar evades a denylist and is caught by the allowlist.
- **Raw Pareto ≠ admissibility ≠ selection:** `DominanceRelation.participation` distinguishes `ASSESSED` from `EXCLUDED_NOT_ASSESSED`, so an empty `dominated_by` on a vetoed or unranked play is never readable as "survived the comparison". A readiness veto is not Pareto domination.
- **Equivalent plays are deduplicated before evaluation:** strategies are reduced to a canonical effective intent (with `UNDECIDED` and `CONSIDER_DO_NOTHING` normalised to one no-intervention state); the user's own plan is retained over a generated equivalent, the suppression is published, and the campaign is evaluated once.
- **Independent reconciliation (2026-08-15):** eleven defects corrected — an upstream CDI-05 contract widening, non-discriminating play artefact binding, two equivalent-play duplication paths, a fabricated human attribution on a derived constraint, epsilon-nearness tie grouping, a missing comparison-set guard, denylist-only aggregate detection, an admissibility overwrite masking model-integrity failures, a duplicate anchor evaluation, an unfounded constant confidence band, and a resolving hint that did not resolve. Each carries a permanent regression test (RR-1…RR-11).

### ADR-034: Decision Contract & Decision Half-Life (CDI-07A)
- **Status:** Approved & Implemented — independently reconciled 2026-08-15
- **Context:** After an Outcome Frontier resolves (or a human explicitly resolves among survivors), the estate needs an immutable record of *what was decided and on what basis*, plus an evidence-backed answer to *whether that basis still holds* — without inventing how long the decision remains valid.
- **Decision:** Introduce immutable `DecisionContract` (content-derived `contract_id` / `decision_basis_digest` / `contract_digest`) that **records** an already-resolved decision and never re-decides. Basis snapshots are exact quotations of supplied CDI artefacts (no recompute, round, aggregate, or unit conversion). Creation only via `CONSTRAINT_RESOLVED` or attributed `HUMAN_RESOLVED`; `CHOICE_REQUIRED` never silently contracts; Scenario 0 is contractable only via explicit human resolution; non-promotion remains non-contractable while economics are incomplete. Decision Half-Life is the ordered validity state `REASSESS_REQUIRED > DEGRADED > WATCH > INDETERMINATE > STABLE` with `STABLE` requiring positive supporting evidence; quantitative duration is `NOT_AVAILABLE` via `QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT`. Validity never mutates the contract, selects alternatives, rewrites economics, or auto-withdraws. WP10-C stores only `decision_contract_ref?: string` with idempotent `REGISTER_DECISION_CONTRACT` (same-ref = no version/history/impact churn). Caller/reference timestamps only — no `Date.now()` in decision/validity semantics. Cross-tenant reads fail closed as NOT FOUND.
- **Consequences:** Unlocks CDI-07B HARD on `DecisionContract`. CDI-01–06 contracts are **unmodified**. OpenAPI `campaign-decision-v1` → 1.6.0. Canvas Layer 7 exposes Contract Summary + two-tier validity (state word; evidence drawer). Planning-report rows 11–12 and the aspirational `GET /api/v1/campaigns/validity` path reconcile to `POST …/decision-contract/[id]/validity`.
- **C-INV highlights:** Digest binds and does not replace source refs; `evaluation_id` is a run marker only; SCENARIO_DRIVEN signal movement may raise at most `WATCH`; fabricated STABLE and duration/countdown creep are permanent regressions (AC-21…25, AC-61…63).
- **Independent reconciliation (2026-08-15):** eight defects corrected before commit. (1) **Fabricated STABLE** — assumptions declared with a `not_evaluable_reason` were omitted from `unassessable_assumptions`, so every contract reported `STABLE` while its load-bearing `AMBIENT_FRAME` assumption had never been assessable; they are now published and `INDETERMINATE` outranks `STABLE` mechanically. (2) **Fabricated `WORLD_DRIVEN` attribution** — an unchanged `decision_state_version` was read as world movement although the contract publishes `WORLD_DRIVEN_SIGNAL_ATTRIBUTION` as `AWAITING_AUTHORITATIVE_SOURCE`; `WORLD_DRIVEN` now requires an observation source independent of Shared Decision State, and the honest answer is otherwise `ATTRIBUTION_UNAVAILABLE` with its disclosure. (3) **T-SIGNAL escalation** ignored `load_bearing`, letting an annotation-only signal reach `DEGRADED`; it is now capped at `WATCH`. (4) **`presented_alternatives`** omitted a human-resolved Scenario 0, recording a resolver choosing a play absent from its own choice set. (5) **WP10-C side-channel** — any command payload could bind `decision_contract_ref` with `changed_fields` empty; only `REGISTER_DECISION_CONTRACT` binds it. (6) **`resolution_statement`** was optional, so a `HUMAN_RESOLVED` contract could record who and what but not why; it is now mandatory. (7) **Shallow store freeze** left the nested `basis`, `assumptions` and `triggers` writable through the returned reference; the stored copy is deep-frozen. (8) **Canvas** could not resolve Scenario 0 and never bound `decision_contract_ref` into Shared Decision State, leaving the W1 command dead in the product path. Each carries a permanent regression test (RV-1…RV-8); the suite is 155 assertions.
- **Consequence of correction (1):** at this baseline a freshly created contract assesses as `INDETERMINATE`, not `STABLE`, because no `T-SIGNAL` binding exists and the `AMBIENT_FRAME` assumption is therefore unassessable. This is the intended reading of owner ruling W2 — absence of contrary evidence is not evidence of stability. `STABLE` becomes reachable when every declared assumption is evaluable.

### ADR-035: Pre-Mortem, Prediction vs Reality & Closed Learning Loop (CDI-07B)
- **Status:** Approved & Implemented — independently reconciled 2026-08-15
- **Context:** After a DecisionContract records what was decided, the estate needs three separate answers that must not re-decide: what could fail (pre-mortem), what differed (prediction vs reality), and what is reusable (learning) — without inventing precision, conflating attributable with gross, or auto-promoting patterns.
- **Decision:** Introduce `CampaignPreMortem`, on-demand `PredictionOutcomeComparison`, and retained `LearningCandidate`/`LearningCase`, each bound by `contract_id` **and** `contract_digest`. Pre-mortem enumerates failure modes from declared/structural evidence only — no likelihood/probability/severity scoring; consequence order maps WP10-C derived-impact annotations without a new Ripple engine. Comparison uses a six-test comparability gate; error only on `LIKE_FOR_LIKE`; attributable vs gross refused; verdicts are `WITHIN_DECLARED_ENVELOPE` | `OUTSIDE_DECLARED_ENVELOPE` | `INDETERMINATE` with positive-evidence rule for WITHIN — never `SUCCESS`/`FAILURE`. Observation authority is a seven-condition conjunction; all current ESF-3 connectors are synthetic → `SYNTHETIC_DEMONSTRATION`. Learning eligibility is an eight-condition conjunction; ineligible candidates retained with `blocked_by` (X4); pattern promotion `NOT_AVAILABLE`; `N > 1` semantic with labelled `N = 3` demo policy (X3). WP10-D `registerMemoryCase` only; optional `decision_contract_ref` (X2). X1 widens CDI-07A world-driven source admissibility to `OBSERVATION_INDEPENDENT_SOURCE_TYPES` with synthetic permanently barred from `WORLD_DRIVEN`.
- **Consequences:** Completes the CDI-01…07B campaign decision stream. Quantitative Decision Half-Life remains `AWAITING_AUTHORITATIVE_SOURCE`. OpenAPI campaign-decision-v1 → 1.7.0. Canvas Layer 8.
- **Independent reconciliation (2026-08-15):** eight defects corrected before commit, led by a laundering path into organisational memory. (1) **Caller-decided learning eligibility** — `buildLearningCandidate` accepted a `PredictionOutcomeComparison` as supplied, and LE-3, LE-4, LE-5, LE-7 and LE-8 were all read off that object; a caller could assert `LIKE_FOR_LIKE`, `AUTHORITATIVE_EXTERNAL`, `complete: true` and a non-`INDETERMINATE` verdict and obtain a `LearningCase` and, with `register_memory`, a WP10-D `EnterpriseMemoryCase` marked `is_synthetic_demo: false` over evidence the estate never observed. The comparison is now re-derived from the contract and its observations and refused (RJ-L1) unless it reproduces. (2) **Echoed observation authority** — a caller-declared `authority` was published unchanged, so an asserted `AUTHORITATIVE_EXTERNAL` over a synthetic reference connector was repeated back by the estate and read by LE-4; authority is now re-derived before publication and a re-derived synthetic authority marks the comparison synthetic. (3) **Synthetic test not independent** — `determineObservationAuthority` ignored `provenance.synthetic_demo`, so a provenance-only synthetic marker survived into `AUTHORITATIVE_EXTERNAL`, contrary to owner ruling X1. (4) **Broader grain admitted** — grain resolution used substring containment, so `Fresh Dairy and Frozen` and `National Fresh Dairy` resolved a contracted grain of `Fresh Dairy`; that is apportionment of a broader observation, and resolution is now exact token identity. (5) **Binding bypass** — any `CATEGORY` observation bound regardless of grain or window, shadowing a genuinely resolving observation later in the array. (6) **Unexplained LE-7 block** — the verdict is `INDETERMINATE` whenever no `LIKE_FOR_LIKE` quantity carries a declared prediction envelope, and none is declared at this baseline; `blocked_by` now names the absent envelope instead of restating the verdict word. (7) **Fixture context divergence** — the acceptance fixtures evaluated observation authority against a hardcoded non-synthetic connector, an authority state no connector in the estate can produce; they now read the ESF-3 registry. (8) **Vacuous LE-4** — LE-4 ranged only over bound observations and so was vacuously met whenever nothing bound, leaving a comparison built entirely from synthetic evidence blocked by LE-3 alone without naming its evidence problem. Each carries a permanent regression test (RB-1…RB-8); the suite is 232 assertions.
- **Consequence of correction (1) and (2):** at this baseline **no eligible `LearningCase` is producible**, and therefore no WP10-D memory case is registered on the learning path. Every ESF-3 connector is synthetic (LE-4), the contracted grain is composite so no single-entity observation resolves it (LE-3), and no prediction envelope is declared (LE-7). This is the honest reading of the gate's two refusals: an eligible case requires evidence the estate does not yet have, and the closed loop closes when an authoritative non-synthetic observation at the contracted grain exists — not before. `N` is consequently never approached, and the `N = 3` policy value remains an unexercised uncalibrated demonstration constant.

---

### ADR-036: Prediction Envelope as a Contract-Native Declared Acceptance Tolerance (CDI-08)
- **Status:** Implemented (CDI-08, 2026-08-16)
- **Context:** `QuantityComparison.error.declared_envelope` and `within_declared_envelope` have existed since CDI-07B and nothing in the estate ever populates them, so `deriveComparisonVerdict` can reach neither `WITHIN_` nor `OUTSIDE_DECLARED_ENVELOPE` and `INDETERMINATE` is structurally guaranteed (LE-7). The question is where a tolerance originates without being inferred from the outcome it adjudicates.
- **Decision (owner ruling Z1):** The prediction envelope is a **declared acceptance tolerance belonging to the CDI-07A `DecisionContract`**, as a contract-native declaration sibling to `assumptions` and `triggers` — `prediction_envelopes: DeclaredPredictionEnvelope[]`, top-level, never absent, may be empty. It is **covered by `contract_digest`** and **excluded from `decision_basis_digest`**. It is `HUMAN_DECLARED` with a mandatory named `declared_by` and `declaration_statement`, carries the closed single member `tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE'`, and **must never be presented as a statistical prediction interval**.
- **Rejected origins:** **CDI-02** publishes no interval of any kind on `attributable_uplift_pp` — manufacturing one would require calibration evidence it does not have. **CDI-05's `TimelineConfidenceEnvelope`** is the closest artefact in the estate and the wrong one on four independent counts: wrong quantity (timeline index, not the contracted headline), wrong basis (bands a trajectory including ambient movement), self-declared uncalibrated (`synthetic_demo: true`, `calibration_target: 'Realised forecast-error dispersion by horizon'`), and circular if promoted — the dispersion that would calibrate it is produced by the very comparison the envelope adjudicates. **A detached artefact bound to `contract_id` + `contract_digest`** fails on the one property that matters: its `declared_at` would be caller-supplied, and a caller-supplied instant is a claim, not evidence.
- **Why the digest boundary needs no algorithm change:** `computeDecisionBasisDigest` builds a fixed sixteen-element tuple by reading named fields of `basis`, so a new top-level field cannot enter it and `DECISION_BASIS_DIGEST_INPUTS` is untouched. `computeContractDigest` destructures out exactly `status`/`superseded_by`/`withdrawal` and hashes the remainder, so a new top-level field is covered automatically. CDI-07B binds every artefact on `contract_digest`, not `decision_basis_digest`. **A tolerance is not part of the evidence on which the decision was made** — CDI-02 and CDI-06 semantics are entirely unaffected — while any post-hoc insertion or edit changes `contract_digest` and is rejected fail-closed by machinery that already exists.
- **The corollary that makes it honest (owner ruling Z2):** digest immutability proves the envelope was not *edited*; it does not prove it was *declared before the outcome*. `created_as_of` is explicitly caller-supplied (C-INV-9) and cannot serve. Therefore: **`OUTSIDE_DECLARED_ENVELOPE` is admissible on digest binding alone** — it can only ever be adverse to the declarer, so post-hoc authorship carries no incentive — and **`WITHIN_DECLARED_ENVELOPE` is withheld** until pre-declaration is witnessed by an instant the caller does not author, otherwise it is self-congratulation with a hash on it. When the signed error falls inside an unwitnessed envelope, `within_declared_envelope` is left **unset** and `within_withheld_reason` is published.
- **Consequences:** `WITHIN_DECLARED_ENVELOPE` remains structurally unreachable after CDI-08, because the server-side registration receipt that would witness pre-declaration is ESF-6 scope. The only verdict CDI-08 newly makes reachable is `OUTSIDE_DECLARED_ENVELOPE` — which is what keeps CDI-08 strictly narrowing. `PREDICTION_ENVELOPE_REQUIRED_INPUT` is declared alongside the existing three, naming its inadmissible substitutes explicitly: the observed value itself, a CDI-05 timeline band, a CDI-04 `ConfidenceBand` converted to a percentage, a symmetric ±X% lab default, any envelope fitted to the series it adjudicates, and `contract_digest` verification read as proof of temporal precedence. Every contract's `contract_digest` changes when the field lands; the builder must always emit `[]` rather than omitting it.
- **It restores the honest refusal:** with an envelope declared, `INDETERMINATE` stops meaning "CogniX cannot express a verdict" and starts meaning "this decision was contracted without a declared tolerance" — a statement about the decision-maker, which is where that accountability belongs.

---

### ADR-037: The Admission / Correspondence Predicate Split as a Permanent Architectural Boundary (CDI-08 / ESF-6)
- **Status:** Implemented (CDI-08, 2026-08-16)
- **Context:** Nine concerns were proposed for a single broadened "Authoritative Observation & Correspondence" work package. They do not share a subject, and merging them would produce one work package with two truth models whose invariants collide exactly where correctness lives.
- **Decision:** **Admission** and **correspondence** are permanently separate predicates with different signatures.
  - **Admission — `source × context → authority`.** Asks *"is this evidence about the real world at all?"* Needs no contract. Owns connector registration and attestation, synthetic vs non-synthetic authority, provenance classification (`SUPPLIED` vs `ADAPTER_DEFAULT`), derived observation completeness, source↔context isolation at ingestion, and server-side ingestion receipts. Home: **`ESF-6 / Y3a`**.
  - **Correspondence — `contract × observation → comparability`.** Asks *"does this evidence address the thing that was contracted?"* Needs no connector. Owns composite contracted grain, metric ↔ `signal_type` correspondence, quantity-basis correspondence, observation-window correspondence, contract↔observation tenant/session isolation, and the declared prediction envelope it judges against. Home: **`CDI-08`**.
  They are independently testable — correspondence against a fixture observation stamped `AUTHORITATIVE_EXTERNAL`, admission against no contract at all.
- **Sequencing follows from the split, and is load-bearing:** R2 (metric correspondence never tested), R3 (empty grain returns `true`; a null `planned_start`/`planned_end` skips the window test) and R6 (observation tenancy never compared against the contract's) are **fail-open**. They are inert today only because no observation can reach `AUTHORITATIVE_EXTERNAL`. **Admission is precisely the change that arms them.** Landing admission first would move the estate from "produces nothing" to "produces a confident wrong number" in a single step — a contract with blank `comparison_invariants` and a real weather connector emitting a `pp` delta would yield `LIKE_FOR_LIKE` and a signed error comparing a temperature movement against a promotional volume uplift, with a digest attached. **Correspondence lands first**, not because it is more valuable in isolation, but because it is what makes admission safe to ship.
- **Isolation appears on both sides and is not double-counted:** contract↔observation isolation is a correspondence predicate (CDI-08 test C0, reusing the existing `assertTenantSessionCoherent`); source↔context isolation is an admission predicate (ESF-6). Both are required; neither substitutes for the other.
- **Composite grain resolves by a key, never by a set (owner ruling Z4):** a contracted composite grain resolves **only** through a single observation carrying an explicit composite grain key whose dimension set *equals* the contracted required dimension set — no missing dimension, no extra dimension, exact token identity on each, `sku_scope` matched as a whole rather than by membership. A **jointly-covering set of marginal observations is refused**: an observation of `CATEGORY = Fresh Dairy` and one of `REGION = North West` do not together determine the `Fresh Dairy × North West` cell, and combining them requires an independence or proportionality assumption — which is apportionment under another name, reintroducing the exact defect RB-4 corrected. Declared as `COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT` rather than left as prose.
- **Correspondence is a predicate, never an estimate:** every test is exact identity or declared-table membership. No substring containment, no prefix matching, no fuzzy similarity, no proportional allocation, no fallback from attributable to gross, no time-axis scaling of a partial window, and no dimension that may pass while missing. Empty grain, null window, undeclared metric correspondence and undeclared measurement design all **fail closed**. ML may later rank or shortlist which incoming signals plausibly address a contract; it may never decide correspondence.
- **Consequences:** `ESF-4` moves from "parallel-eligible now" to parallel-eligible after `ESF-6`, since quality grades signals that have already been admitted and cannot make an inadmissible signal admissible. The 80/85 confidence/quality defaults are not authority today — `determineObservationAuthority` never reads them — and must never become authority. The first defensible `LearningCase` is two work packages away and will be a gross-basis case.

---

### ADR-038: Attested Source Registration as the Sole Origin of Observation Authority (ESF-6 / Y3a)
- **Status:** Approved — **implemented and independently reconciled 2026-08-16.**
- **Reconciliation amendment — a receipt witnesses one observation, not a tenant.** The delivered implementation resolved an observation's admission receipt on two facts: that it resolved, and that its tenant matched. That is not sufficient, and it is not what "derives from registry state" means. A receipt is evidence about **the subject it was issued for**; accepting any receipt a tenant holds makes authority a property of *having ever been admitted once* rather than of *this observation having been admitted*. A caller could therefore register a decoy source after the contract — obtaining a `SOURCE_REGISTRATION` receipt whose sequence defeats W4 — and present it on a fabricated observation to publish `WITHIN_DECLARED_ENVELOPE`. **Binding is now threefold and is the single resolution path (`resolveAdmissionReceiptFor`): tenant, `kind === 'OBSERVATION_ADMISSION'`, and `subject_id === observation.observation_id`.** The corollary generalises beyond ESF-6: *a server-issued token proves only the proposition it was issued about.* Relatedly, the ESF-6 authority branch must fail **closed** toward synthetic when a claimed source does not resolve, matching the ESF-3 branch — a phantom source is not evidence of a real-world measurement.
- **Context:** CDI-08 established correspondence but nothing in the estate can produce an authoritative observation. Five sites at `4e659eed` are why. **D-1:** `REFERENCE_CONNECTOR_REGISTRY` is a static array of seven descriptors, every one `synthetic_demo: true`, with no registration path — `synthetic_demo=false` is unrepresentable. **D-2:** `registerExternalSignalConnector` is a self-declared lab backdoor that *can* set it false with no attestation. **D-3:** `campaign-learning-loop-engine.ts:1285` reads `... || connector?.synthetic_demo || true`, whose trailing `|| true` makes the expression a constant. **D-4:** `determineObservationAuthority` reads the caller-supplied `observation.source_type` through `isObservationIndependentSourceType`, and tests `provenance.envelope_id` / `connector_id` for *presence only*, never against a server record. The question is what makes `synthetic_demo = false` truthful rather than asserted.
- **Decision:** Authority originates in a **server-side `AttestedObservationSource` registry**, separate from ESF-3, which remains provider-neutral, synthetic and untouched (owner ruling **E1**). A source declares tenant ownership, permitted observation categories, supported signal types, supported **composite** grain capabilities, supported measurement bases, and a named `SourceAttestation`; the server issues `source_id`, `attestation_id` and a registration receipt under reserved prefixes. `synthetic_demo` is written **from the registered source**, never from a request body (**E2**): the disjunction `payload.synthetic_demo || payload.provenance.synthetic_demo || source.synthetic_demo` is **monotone toward synthetic** and must stay so — a payload may declare itself synthetic and be believed, and may declare itself real and be ignored. A body carrying any server-issued identifier or `sequence` is **rejected, not stripped**. D-2 is deleted and the CDI-08 fixtures migrate to the attested path (**E5**).
- **Rejected alternative — widening `ExternalSignalConnectorDescriptor`:** it cannot express tenant ownership, attestation, observation category, grain capability or measurement basis; adding them would hang attestation fields on seven synthetic reference adapters that will never carry them, and would make `synthetic_demo` a mutable property of an ESF-3 descriptor — which is D-2 institutionalised rather than removed.
- **Admission does not touch correspondence (E6):** capability refusal never marks an observation comparable, and capability acceptance never pre-satisfies any CDI-08 test. An admitted observation is fully re-evaluated by C0–C8 with no test skipped. **Authority never bypasses correspondence.** An attested weather delta against a contracted volume uplift still returns `METRIC_MISMATCH`.
- **Z4 is not re-opened:** a source declares composite grain capability as **dimension sets** matched by set equality, because the capability question is "can you produce the joint cell?", which Z4 makes indivisible. ESF-6 adds no combination, apportionment, independence assumption, proportional allocation, or narrowing of a broader observation. Two marginal attested observations still fail to resolve a composite grain.
- **Synthetic provenance is immutable for the observation:** admission **mints a new observation** with server-issued identity. No migration path exists and none may be added; no endpoint accepts an existing `observation_id` for re-classification. ESF-1 / ESF-2 / ESF-3 observations remain non-authoritative permanently.
- **Confidence and quality never become authority (E7, restating G4):** each is classified `SUPPLIED` vs `ADAPTER_DEFAULT` (the R5 slice), and a permanent regression asserts neither the value nor the classification appears in the authority conjunction. A `confidence: 100` observation that fails any admission test is still refused. ESF-4 grades what ESF-6 has already admitted, and cannot make an inadmissible signal admissible.
- **Consequences:** `CanonicalSignalType`, `ExternalSignalCategory` and `SignalSourceType` are **not widened** — `COMMERCE` already maps to `COMMERCE_TELEMETRY`, which is already in `OBSERVATION_INDEPENDENT_SOURCE_TYPES`, so X1 needs no change. LE-4 is removed, and with LE-3 and LE-7 already closed by CDI-08, the first defensible `LearningCase` becomes producible — a **gross-basis** case. One case is not a pattern: no `LearningPattern` is created, no write path exists, and `N = 3` remains an unexercised uncalibrated demonstration policy.
- **Stated limit, deliberately visible:** `FIRST_PARTY_OPERATOR_ATTESTATION` is a named human declaration recorded server-side, **not a cryptographic proof**. It makes falsity a misrepresentation by an accountable named person — the standard CDI-08 §4.4 already applies to `measurement_design` and CDI-07A to `resolved_by`. It must never be rendered, labelled or narrated as verification or certification. This is integrity architecture, not an authentication platform: no identity provider, OAuth, key management, signed payloads, mTLS or RBAC is in scope, and none is required to make the work package honest.

---

### ADR-039: The Pre-Declaration Witness is a Server-Derived Output Ordered by Sequence, Never a Timestamp (ESF-6 / CDI-08 Z2)
- **Status:** Approved — **implemented and independently reconciled 2026-08-16.**
- **Reconciliation amendment — W3 is a binding test, not a resolution test.** As delivered, W3 asked only whether the observation's `admission_receipt_id` resolved under the tenant. **W4's strict sequence precedence cannot compensate for an unbound W3:** an attacker chooses *which* receipt to present, so they simply choose one issued after the contract. W1, W2 and W5 all concern the contract, so W3 is the conjunction's only tie to the observation — and an unbound W3 leaves the whole witness proving nothing about the outcome it certifies. W3 now requires the receipt's `kind` and `subject_id` to name this observation. **The wall-clock prohibition is also now enforced behaviourally rather than by string match:** the delivered E-35 asserted only that the literals `'sequence = Date.now()'` and `'sequence = timestamp'` were absent — self-confirming, since no implementation would write either. It is replaced by a static check that every wall-clock reading in the store stamps `issued_at_display` and nowhere else, plus a behavioural regression (R-40) that rewrites `issued_at_display` on every receipt to the epoch and asserts no verdict changes.
- **Context:** ADR-036 withheld `WITHIN_DECLARED_ENVELOPE` until pre-declaration is witnessed by "an instant the caller does not author," and CDI-08 recorded it as structurally unreachable pending ESF-6. Reviewing that boundary against code exposed **D-5**: `validateDecisionContract` (`campaign-decision-contract-model.ts:1081`) validates `pre_declaration_witness` only as *one of two literals*, so **a caller may declare `'SERVER_REGISTRATION_RECEIPT'` on its own contract**; `campaign-learning-loop-engine.ts:692` then sets `within_declared_envelope = true` and publishes `WITHIN_DECLARED_ENVELOPE`. This is a fourth fail-open of the class the CDI-08 sequencing rule named (R2, R3, R6) — inert only because nothing reaches `AUTHORITATIVE_EXTERNAL`, and **armed by ESF-6 itself**.
- **Decision (owner ruling E3):** The witness is a **server-derived output, never a contract input**. On any caller-supplied contract `pre_declaration_witness` **must equal `'NONE'`** (new invariant `C-INV-ENV-6`, fail-closed); the union member `'SERVER_REGISTRATION_RECEIPT'` is retained in the type but becomes unconstructible by a caller. The witness is evaluated at comparison time and surfaced on the derived `PredictionError.declared_envelope` — an output field, outside every digest.
- **Why it cannot be a contract field:** the envelope is covered by `contract_digest` (Z1), and a receipt is issued *after* the contract exists and its digest is fixed. Writing the receipt back into the envelope would change the digest the receipt was issued for — circular, and it would break every CDI-07B artefact bound on that digest.
- **Decision (owner ruling E4) — ordering by sequence, not clock:** every receipt carries `sequence`, drawn from a **per-tenant strictly monotonic integer counter**. Precedence is the integer comparison `contract_receipt.sequence < observation_receipt.sequence`. A server wall-clock reading would satisfy Z2's letter while violating the standing rule that wall-clock values are never decision logic or ranking inputs, and would make the witness non-deterministic and untestable. Timestamps are recorded on receipts for audit and display and are **never read** by any predicate; `Date.now()` must not appear in receipt issuance, witness evaluation or admission. **Lifetime invariant:** counter and receipt store share one lifetime — a receipt is never reconstructible after the counter it was drawn from is lost, so a restart empties both, every lookup misses, and the witness fails closed to `NONE`, which is the correct answer rather than a degradation.
- **The witness conjunction, fail-closed:** **W1** a `CONTRACT_REGISTRATION` receipt exists for the contract under this tenant; **W2** `receipt.contract_digest === computeContractDigest(contract)`, proving envelope content was immutable since registration; **W3** every observation backing the row carries a resolving admission receipt; **W4** `contract_receipt.sequence < min(observation_receipt.sequence)`, strict; **W5** the stored envelope's own witness is `'NONE'`. Any failure ⇒ `NONE`, `within_declared_envelope` left **unset**, and `within_withheld_reason` naming **which condition failed** rather than a generic sentence.
- **W4 is the load-bearing one.** W2 alone proves non-edit, not precedence — exactly the point ADR-036 makes about `created_as_of`. W4 is what proves the observed outcome was not used to define the envelope.
- **Z2's asymmetry is preserved exactly:** `OUTSIDE_DECLARED_ENVELOPE` is computed from the signed error against the declared bounds and **no receipt participates**. A revoked source, an emptied receipt store or a failed W4 must still yield `OUTSIDE` on an adverse error. Adverse evidence needs no witness because post-hoc authorship carries no incentive; favourable evidence does, or it is self-congratulation with a hash on it.
- **Consequences:** `deriveComparisonVerdict` needs **no change** — it already gates `WITHIN` on `within_declared_envelope === true`. `WITHIN_DECLARED_ENVELOPE` becomes the one verdict ESF-6 newly makes reachable, which is what keeps ESF-6 strictly narrowing. Implementation sequencing is binding: `C-INV-ENV-6` lands **before** the admission predicate and the authority corrections, because arming authority while the witness is still caller-declared would, for the duration of that gap, let a caller certify its own accuracy over authoritative evidence. Any existing fixture constructing a contract with `'SERVER_REGISTRATION_RECEIPT'` will now be rejected — expected and correct, since that fixture was exercising D-5.

---

### ADR-040: Forecast Stability is a Property of the Evidence Stream, Never of the Model (DDF-01 / P0-A)
- **Status:** Approved — governance registration 2026-08-16. **Implemented 2026-08-16** (`DDF-01`).
- **Context:** `SOL-DEMAND-02` publishes one number for trustworthiness — *"Forecast Confidence 91% Model Accuracy"* (`components/Forecasting.tsx:433`). It is a literal. Its origin is the unqualified constant `confidence: 91` at `lib/intent-fusion/intent-fusion-engine.ts:75`, and the same engine separately publishes `baseline_forecast.confidence: 90`, so the estate already holds two confidence values for one outlook and neither is backed by a backtest, a realised error dispersion or any calibration record. `DDF-01` P0-A must add a *second* trust dimension to this surface, and the obvious cheap implementation — deriving stability from that same constant — would produce two numbers that look independent and are not.
- **Decision:** **Forecast Confidence and Forecast Stability answer different questions and are computed from disjoint inputs.**
  - **Forecast Confidence** — *how reliable is the model or the current estimate?* A property of the **forecasting method**. It requires calibration evidence the estate does not have, and is therefore reported as the declared engine confidence with its basis named — never as "model accuracy".
  - **Forecast Stability** — *how likely is the current forecast to remain materially unchanged?* A property of the **evidence stream**, computed from observed `EnterpriseSignal` divergence: `baseline_value`, `observed_value`, `delta`, `delta_pct` and the `observed_at` / `effective_at` ordering over `FORECAST_DIVERGENCE`, `CATEGORY_DEMAND_ACCELERATION`, `ORDER_VELOCITY_ACCELERATION` and `REGIONAL_DEMAND_SHIFT`.
  A high-confidence forecast may be unstable, and a low-confidence forecast may be stable. The surface must make that possible to observe, not merely assert it.
- **Why the evidence stream and not a model:** the signals already carry a baseline and an observation and a time order. Revision *pressure* is therefore measurable from data the estate genuinely holds, by a calculation a planner can read. Fitting a revision model would require realised revision history, which does not exist — and fitting one to `cognix-world` output would be fitting CogniX to its own simulator, the exact prohibition the ML/deterministic boundary states.
- **No new signal type (binding, restating ADR-038):** `CanonicalSignalType`, `ExternalSignalCategory` and `SignalSourceType` are **not widened**. `FORECAST_DIVERGENCE` already exists and is sufficient. A stability capability that needs a new signal type is mis-designed.
- **Insufficient evidence is `INDETERMINATE`, never a default:** where too few signals bear on the scope, stability publishes `INDETERMINATE` with the missing evidence named. It never falls back to a neutral 50, an inherited confidence value, or the previous period's score. This follows the `CDI-07A` rule that `INDETERMINATE` means insufficient evidence and must never collapse into a favourable state.
- **Signal scoping (integration pass, 2026-08-16):** stability reads only signal types that bear on **demand-outlook divergence** — `FORECAST_DIVERGENCE`, `CATEGORY_DEMAND_ACCELERATION`, `ORDER_VELOCITY_ACCELERATION`, `REGIONAL_DEMAND_SHIFT`, `SEARCH_VELOCITY_ACCELERATION`, `BASKET_ADD_ACCELERATION`, `PRODUCT_ENGAGEMENT_ACCELERATION`, `CAMPAIGN_RESPONSE_ACCELERATION`. Supply, inventory and logistics signals are excluded: they describe the constraint side, they are already represented in the executable frontier, and their magnitudes (a lead-time drift of `+800%`, a projected stockout risk of `+1260%`) would otherwise swamp a demand-stability score with quantities that are not about demand. This is a scoping filter over existing types; **no `CanonicalSignalType` is added**, per ADR-038. A scope with no signal of a listed type reports `INDETERMINATE` rather than borrowing a supply signal.
- **Two distinct evidence measures (integration pass):** divergence *magnitude* drives the stability score and the revision probability; the contributing signals' own `confidence` grading is published separately as `evidence_confidence_pct` and is what the ADR-043 regret model weights outcomes by. Collapsing the two would make a *more* divergent outlook look *less* likely to be realised, which inverts the meaning of both.
- **Consequences:** *"Model Accuracy"* wording is removed. The predictive-model selector (`GenAI Demand Predictor` / `Prophet Seasonality (ML)` / `ARIMA Baseline`), implemented as `Math.sin`/`Math.cos` factors at `lib/query-engine.ts:494–502`, is either honestly relabelled as the deterministic projection shapes it is, or removed — it may not sit beside a stability claim while asserting ML that does not exist. Probability of material revision, revision direction and revision magnitude are **modelled** outputs and are labelled as such; none may be presented as a statistical prediction interval (restating ADR-036's prohibition). Forecast Stability becomes the input to the emerging demand frontier in ADR-041.

---

### ADR-041: Decision Gap is Opportunity Minus Executable Capacity, Computed From Engines, Never From a Surface Literal (DDF-01 / P0-B)
- **Status:** Approved — governance registration 2026-08-16. **Implemented 2026-08-16** (`DDF-01`).
- **Context:** The Demand surface displays `Baseline +12% · Intent +7% · Signals +3% · Outlook +22% · Capacity Cap +10% (12pp Gap)` at `components/Forecasting.tsx:368–418`. **Every one of those values is a hardcoded JSX literal.** The component's only network call is `/api/data` (`:158`); it never calls `POST /api/v1/intent-fusion/evaluate`, and the sole callers of `evaluateIntentFusion` are the route handler and the engine. The "12pp gap" therefore does not move when the Promotion Lift slider moves. Supplier capacity meanwhile exists in **three** places: the real Shared Decision State parameter `supplier_capacity_cap` consumed by `calculateDerivedImpacts()`, a hardcoded `supplierCapacityCapPct = 10` in the fusion engine (`intent-fusion-engine.ts:36`), and the literal on the surface.
- **Decision:** **Decision Gap is defined as the difference between the commercial opportunity currently emerging and the organisation's ability to capture it under existing commitments and operational constraints** — and it is computed at runtime from engine output, never captioned over a literal.
  - `contextualised_outlook` ← `IFI-01` `ContextualisedDecisionOutlook`, engine-bound.
  - `emerging_frontier` ← `contextualised_outlook` adjusted by the ADR-040 revision pressure. Modelled, labelled.
  - `executable_frontier` ← `DecisionDerivedImpacts` (`supplier_capacity_units`, `commitment_gap_units`, `stockout_probability_pct`) read **read-only** through Shared Decision State.
  - `exposed_demand` ← `emerging_frontier − executable_frontier`, with `opportunity_at_risk_gbp`, affected scope, and ranked contributing constraints.
- **`forecast − capacity` is explicitly rejected as the definition.** It is arithmetic over two numbers, it answers no decision question, and it is what `MASTER_PLAN` §Anti-Drift means by reduction to a calculator. The gap must name *which* constraint binds — supplier commitment, inventory/DC headroom, or operational throughput — because the intervention differs by constraint. A gap that cannot say what is binding cannot inform an intervention.
- **No fourth capacity number (binding):** `ARCHITECTURE.md` §3.4 already rules that any capability requiring cross-functional propagation reads `DecisionDerivedImpacts` read-only, must not recompute ripple arithmetic of its own, and must not write to Decision State. `DDF-01` obeys it. The `IFI-01` hardcoded cap and the surface literal are corrected, not joined by a third variant.
- **Rejected alternative — a new Demand Gap engine.** The estate already computes the constraint arithmetic (`calculateDerivedImpacts`) and the demand decomposition (`evaluateIntentFusion`). A new engine would fork both and immediately drift, reproducing the divergence this ADR exists to close. `DDF-01` is **evolutionary extension of existing contracts**, not a parallel domain.
- **Consequences:** binding the surface to the fusion engine is a prerequisite of P0-B, not a follow-up — a Decision Gap over a static panel is a caption. Cannibalisation and Event Boost must propagate to Shared Decision State (they are read from it at `Forecasting.tsx:88–89` but never written at `:581`, `:627`), or the recomputation chain has silent dead inputs. Four demand quantities become separately representable and must never be collapsed: forecast demand, true/latent demand (`DOT-1`, out of scope), executable demand, economically desirable demand.

#### ADR-041 Amendment A — the shared demand base (integration pass, 2026-08-16)

**What the original ruling assumed, and why it was wrong.** ADR-041 specified `emerging_frontier ← contextualised_outlook` where `contextualised_outlook` is the `IFI-01` `contextualised_outlook_pct`, and `executable_frontier ← DecisionDerivedImpacts`. Implementation exposed two errors in that composition:

1. **`IFI-01`'s outlook percentage is not scenario-responsive.** `contextualised_outlook_pct` is `baseline_lift + round(discount_depth × 0.35) + signal_effect`, where `discount_depth` comes from the registered Commercial Intent — **not** from the `promotion_lift` scenario parameter the Demand surface controls. Building the gap's arithmetic spine on it reproduces exactly the static `12pp` D-DDF-1 was raised to eliminate, this time with an engine call in front of it.
2. **The two sides were denominated in different populations.** `DecisionDerivedImpacts` is built on WP10-C's abstract `BASE_DEMAND = 10,000` units/week; the projection series the same surface plots runs at roughly 46,000 units/day. Subtracting one from the other produces a number with no referent — the defect that made `12pp`, `2,600 units` and `£312K` mutually irreconcilable.

**Amended ruling.** The Demand Decision Frontier resolves every quantity against **one denominator — the observed run rate scaled to the horizon** (`base_demand_units`). On that base:
- `contextualised_demand` is the live projection, which already carries promotion depth, cannibalisation, the event boost and the projection method, and therefore responds to every scenario control;
- `emerging_frontier` is that projection carried forward by the ADR-040 probability-weighted expected revision;
- `executable_frontier` is `base_demand_units × capacity_index`, where `capacity_index` is `supplier_capacity_units ÷ un-promoted weekly demand`, read from `DecisionDerivedImpacts`. **Taking the constraint as a ratio rather than a quantity is what keeps the read-only rule intact while crossing a population boundary** — it is scale-free, so no fourth supplier-capacity number is created, which was ADR-041's actual purpose.

The consequence is an algebraic identity rather than a coincidence: `emerging_frontier_pct − executable_frontier_pct ≡ exposed_demand_units ÷ base_demand_units`. AC-DDF-27 is satisfied by construction and asserted in the test suite.

`IFI-01` keeps its role unchanged — it is the **evidence decomposition** that explains *why* demand is moving, engine-bound via `POST /api/v1/intent-fusion/evaluate` per AC-DDF-10. It is no longer the arithmetic spine. No `IFI-01` contract, constant or engine behaviour changed, so AC-DDF-03 holds.

**Censored history is not demand.** A day the source holds no record for is excluded from the run-rate base rather than averaged in as a zero. Counting a coverage gap as zero demand depressed the base and inflated every percentage measured against it — the censored-sales error `DEMAND_OBSERVABILITY_MODEL.md` §4.7 and §4.9 prohibit, and the same pathology `DOT-4` and `DOT-8` exist to address later at scale.

---

### ADR-042: The Decision Window Derives From a Declared Operational Constraint and is Not a Decay Curve (DDF-01)
- **Status:** Approved — governance registration 2026-08-16. **Implemented 2026-08-16** (`DDF-01`).
- **Context:** Decision Gap without time is not actionable, so `DDF-01` introduces a Decision Window with examples like *"31 hours remaining"* and *"supplier intervention viable until Monday 14:00"*. **Those are countdowns, and the estate prohibits countdowns**: `CDI-07A` owner ruling W2 refuses Decision Half-Life any duration, countdown, expiry estimate or decay curve, and `UX_DESIGN_PRINCIPLES` §5.6 forbids hours, percentage remaining, progress bars, clocks and decay animations. Shipping a countdown without resolving this would either violate a frozen ruling or quietly reinterpret it.
- **Decision:** the prohibition and the window are compatible **because they measure different things**, and the difference is enforced structurally rather than assumed.
  - **Decision Half-Life** asks *how long does the evidence behind a resolved decision stay trustworthy?* It was refused a duration because the estate holds **no calibrated evidence about how evidence decays**. Any number there is invented.
  - **Decision Window** asks *when does the operational ability to act expire?* That is not decay. It is arithmetic over a **declared deadline** — a supplier order cut-off, a DC allocation schedule, a campaign launch lead time.
- **The predicate, fail-closed:** a duration is publishable **if and only if** it derives from a `DeclaredInterventionConstraint` carrying `constraint_kind`, a named `declared_by`, and a `basis` of either `DECLARED_OPERATIONAL_CONSTRAINT` or `MODELLED_DEMO_ASSUMPTION`. With no declared constraint the window is **`INDETERMINATE`**, and **no countdown, clock, progress bar or decay animation renders**. The absence is shown, not filled. **In the current estate every such constraint is a `MODELLED_DEMO_ASSUMPTION`** and is labelled as one on the surface — a modelled deadline is never presented as an observed operational fact.
- **The window is never inferred from the opportunity.** Deriving "time remaining" from how fast value is eroding would be a decay curve wearing a deadline's clothes, and would reintroduce exactly what W2 refused. Value erosion may be *described* alongside the window; it may never *produce* the window.
- **Separation from `CDI-07A` and `CDI-03` is structural:** a Decision Window and a Decision Half-Life validity state must never occupy the same indicator, and the window is never described as the decision "expiring". Separately, `DemandDecisionWindow` is **not** the `CDI-03` `OpportunityWindowEvaluation`: `CDI-03` scores candidate future intervals for *when to run a campaign* (`PREFERRED`…`AVOID`); `DemandDecisionWindow` states *until when the current option remains open*. Neither substitutes for the other, and they must not be merged into one artefact.
- **Consequences:** the demonstration must declare its constraint visibly, which is a stronger and more interesting executive claim than a bare timer — the client sees *what* closes the window. A future integration that supplies a genuine cut-off changes only the `basis` class; the contract shape and the UI are unchanged, satisfying progressive sophistication without a contract break.

---

### ADR-043: Decision Regret is a Comparative Expected Value Over Declared Alternatives, and "Frontier" Carries Two Distinct Meanings (DDF-01 / P0-C)
- **Status:** Approved — governance registration 2026-08-16. **Implemented 2026-08-16** (`DDF-01`).
- **Context:** CogniX is a Decision Intelligence platform, so the economic consequence of choosing badly must not be reduced to forecast-error cost. `CDI-07B` already rules that prediction error describes model and outcome divergence and **never** whether the decision was good or bad; a "forecast error cost" metric on the demand surface would contradict that ruling on an adjacent screen. Separately, `DDF-01` introduces a *Demand Decision Frontier* while the Promotion surface already renders `components/campaign/DecisionFrontierLens.tsx` under the tab *"Decision Frontier & Tension"* — a Pareto set of candidate configurations from the `CDI-06` family.
- **Decision (regret):** **Decision Regret is the expected economic consequence of choosing an inferior action given the information and alternatives available at decision time.** It compares three declared alternatives — `ACT_NOW`, `WAIT`, `DO_NOTHING` — each publishing what it captures, what it risks, what it forgoes, its expected decision value and its expected regret.
- **The comparison is defensible where the absolute numbers are not.** All three alternatives are computed from **the same inputs** — the ADR-041 exposed demand, the ADR-040 revision probability, the ADR-042 window, and the declared unit economics. The absolute £ figures are uncalibrated modelled expected values and are labelled as such; the **ordering** between alternatives rests on shared inputs and is therefore inspectable and internally consistent. This is the honest claim, and it is the one the surface makes.
- **Refusal is a first-class outcome (mirroring `CDI-06` and the Campaign comparison honesty rule):** where the alternatives do not separate materially, CogniX reports no clear advantage and **names no winner**. Where readiness evidence of the `CDI-04` class would gate an option, that option is reported as **not currently actionable** rather than recommended — a stronger-looking option that could not proceed is never presented as the recommendation. No fixed weights, no utility function, no LLM ranking, and no optimiser is introduced.
- **Decision (naming):** **"frontier" is permitted two meanings in the estate, and each must always be qualified.**
  - **Outcome Frontier** (`CDI-06`) — a **Pareto set of candidate configurations**. Retains its name in all governed text and UI.
  - **Demand Decision Frontier** (`DDF-01`) — a **set of demand trajectories over time** (base / emerging / executable). **Always written with the "Demand" qualifier and never shortened to "Decision Frontier"** on any surface.
  A trajectory frontier is never plotted as a Pareto frontier, and a Pareto frontier is never plotted as a trajectory. The point in time at which the window closes is the **decision-frontier marker** on the trajectory chart and is not itself "a frontier".
#### ADR-043 Amendment A — the regret formula (integration pass, 2026-08-16)

Regret is `best_expected_value − this_expected_value`. It is **relative**, is zero for the winner by construction, and is never negative. An absolute per-alternative "regret" formula with coefficients unique to each option — which is what a first implementation naturally reaches for — is not a comparison at all; it is three unrelated numbers sharing a column heading, and it cannot satisfy AC-DDF-21.

Three properties make the comparison a real decision rather than a staged one:
- **Lead-time erosion is derived from the Decision Window, not declared.** Waiting is nearly free with time in hand and ruinous as the cut-off approaches. This is what connects ADR-042 causally to the recommendation. The window still never *produces* the erosion figure's authority — the relationship is modelled and labelled.
- **Over-committing has a cost.** Acting captures margin only if the demand holds, pays the flex premium either way, and writes off the cost of goods if it does not. Without that term, acting weakly dominates for every input and `DO_NOTHING` becomes unreachable — faux optimisation with a refusal state that can never fire.
- **Materiality is judged against the size of the decision**, not against total exposure. Most exposure is typically unrecoverable, so a threshold set against it would be unreachable and `CHOICE_REQUIRED` would swallow every case. The floor is a percentage of the largest expected value on the table, with an absolute minimum so trivial sums never name a winner.

Each of `ACT_NOW`, `WAIT` and `DO_NOTHING` is consequently reachable as the best alternative on defensible inputs, and each outcome is asserted in the test suite.

- **Consequences:** Act Now / Wait / Do Nothing are recomputed by intervention simulation, and a failed recomputation renders an explicit unavailable state — a previous result may never remain on screen as current, which is the pathology the Campaign Intelligence reconciliation corrected on 2026-08-16. `DO_NOTHING` is the demand-domain counterpart of the `CDI-02` counterfactual baseline and reuses its semantics rather than defining a second Do-Nothing. No `LearningCandidate`, `LearningCase` or Enterprise Memory record is created by any part of `DDF-01`.

---

### ADR-044: GenAI Drafts Decision Context, and a Draft Is Never Evidence (CDI-01)
- **Status:** Approved & Implemented
- **Context:** The Decision Context stage asks a planner for contextual factors, open questions and assumptions. On a blank field the honest answer is usually "I would have to think about it", so the stage was routinely skipped and the three inputs stayed empty — which starved CDI-04 rule S6 and left the decision record silent about what it rested on. A drafting assistant addresses that. It also introduces the two failure modes this estate exists to refuse: generated text becoming evidence, and a provider outage being papered over with invented content. ADR-018 already separates GenAI (synthesis, narrative) from the deterministic and ML layers; this ruling states what that separation means at an input boundary rather than an output one.
- **Decision:** A server-side route drafts 3–5 contextual factors, 2–4 open questions or 2–4 assumptions from the decision as configured — category, SKU scope, objective, posture, audience, route to customer, region, timing and the items already recorded. Drafts are returned to the client and held in component state. They enter `CampaignIntent` only when the planner selects them and presses Add, and are editable as ordinary text once added. Nothing about the request or the response writes to any store; the route imports none.
- **Authority:** Every response is stamped `source: GENAI_DRAFT`, `authority: NON_AUTHORITATIVE_DRAFT`. A response arriving without that stamp is treated as a failure, because a draft that cannot be identified as a draft is indistinguishable from planner-authored context once it is in the record. A suggestion is never an observation, never readiness evidence, never a `LearningCandidate` or `LearningCase`, and never a decision verdict — it is text the planner chose to write, with a faster first draft.
- **Refusal over fabrication:** With no `GEMINI_API_KEY` configured the route returns `503` naming the variable and generates nothing. On a provider failure it returns `502`. On a response that survives no validation it returns `502`. There is no canned fallback on any path. This is a deliberate departure from `lib/gemini.ts`, whose NLQ and briefing routes fall back to mock analytics: a mock briefing is a demo affordance, whereas mock decision context would be fabricated input to a governed contract. The journey never depends on the assistant being available.
- **The prompt's rules are enforced on the response, not merely requested in the prompt.** A model that was steered, truncated or confused is exactly the case validation exists for. Items carrying a percentage, a currency symbol, a decimal quantity or a thousands-separated figure are rejected outright — this route has no data with which to support a measured claim, so a suggestion that states one is fabricating. Multi-sentence items, over-long items, duplicates of each other or of what is already recorded, echoed prompt scaffolding, and open questions that are not questions are all dropped, and the surviving list is clamped to the type's maximum.
- **Injection surface:** the planner's existing entries are sent as context so drafts do not repeat them, and they are fenced as application data rather than instruction. The provider key is resolved only from `process.env.GEMINI_API_KEY`; a key supplied in a request body is structurally unable to reach the provider call, since the bounded prompt context has no such field. No error path echoes the key, an environment dump or a stack trace.
- **Consequences:** Decision Context becomes materially easier to fill without becoming machine-authored. The provider is a convenience at an input boundary and holds no authority anywhere in the estate, so its absence degrades speed and nothing else. `.dockerignore` excludes host `.env` files from every build context (re-admitting `.env.example`, which carries no secret and is the only written statement of what the stack needs), and `docker-compose.yml` passes `GEMINI_API_KEY` through from the host environment rather than defining it.

---

#### ADR-044 Amendment A — two Gemini credentials, and the divergence is technical debt (Atlas runtime configuration, 2026-08-21)

**What the original ruling covered, and what it left implicit.** ADR-044 recorded a *behavioural*
divergence: the CDI-01 drafting route refuses with `503` where `lib/gemini.ts`'s NLQ and briefing
routes fall back to mock analytics. It did not record the *credential transport* divergence sitting
underneath it, and that omission has now cost real time.

**The estate has two Gemini credential paths, and they are not interchangeable.**

| | Legacy demo path | Governed server-side path |
|---|---|---|
| Routes | `/api/ask`, `/api/briefing`, `/api/decisions/[id]/approve` | `/api/v1/campaigns/decision-context/suggest` (ADR-044), `/api/v1/atlas/ask` research and interpretation (ATL-06B, ATL-06C) |
| Where the key lives | entered by the user in platform setup, held in client state (`lib/context.tsx`) | `process.env.GEMINI_API_KEY`, read server-side at call time |
| How it travels | in the **request body** | it does not travel |
| On absence | mock analytics | refusal, naming what is missing |

**The debt.** A client-held key transported in a request body is incompatible with ADR-049's rule that
the provider key is resolved server-side only and appears in no request, record or log. It is retained
because the demo routes predate that ruling and rewriting them is not this work; it is recorded here so
it is a known divergence rather than an assumption. **Nothing new may use it**: a governed route
accepting a key from a request body is a defect, not a precedent.

**The operational consequence, which is what actually bit.** Because deployment documentation said the
Gemini key "is entered in the app UI", no environment provisioned `GEMINI_API_KEY`, and the governed
routes were inert in every deployed environment — correctly and silently, since refusal is their
designed behaviour. `README.md`, `.env.example`, `docker-compose.ec2.yml`, `.gitlab-ci.yml` and
`ops/ci-deploy-remote.sh` now state which key serves which path, and the deploy script warns when
`GEMINI_API_KEY` is absent. It warns rather than blocks: the routes fail closed by design, so a missing
key is a capability gap, not a broken deployment.

**Setting the platform-setup key does not close `AC-ATL-06C-9`.** The Atlas reads the server variable
and nothing else.


### ADR-045: The Capability Atlas Is the Governed Capability Knowledge Layer, Built On the Existing Registries (ATL)
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-01` … `ATL-07` planned).
- **Context:** Knowledge about what CogniX can do is distributed across `config/solutions.ts` (`SOL-*`), `config/experiments.ts` (`EXP-*`), `config/patterns.ts` (`PAT-*`), `config/domains.ts`, `config/personas.ts`, forty-plus `docs/reports/` work-package reports, the `MASTER_PLAN`, and the code itself. Each artefact serves one audience well. No artefact answers, for one capability, the full set: *what is it, why does it exist, how does it work, where is it implemented, how do I test it, how do I demonstrate it, what proves it works, what are its limits, where else does it apply, and what should I say to a client?* A seller, an architect and a developer currently reconstruct that answer by hand, differently each time, and an autonomous agent cannot reconstruct it at all.
- **Decision:** The **CogniX Capability Atlas** is the governed knowledge, discovery, explanation and enablement layer for CogniX capabilities. It is **not a new parallel model**. It is a knowledge extension over the registries that already exist: `CognixSolution` remains the canonical contract for a Demonstration Solution, `config/experiments.ts` remains canonical for Innovation Experiments, `config/domains.ts` remains the domain catalogue and `config/personas.ts` remains the decision-lens catalogue. The Atlas adds the knowledge those registries deliberately do not carry — architecture, implementation references, test procedures, validation evidence, demo paths, client questions, market evidence, cross-domain reuse, provenance and review lifecycle — bound to the existing identifiers by reference.
- **Consequences:** A capability has exactly one identity (`SOL-*` or `EXP-*`), never a second Atlas-only identity. Registry fields are never duplicated into an Atlas record; the Atlas references them. The Five-Second Rule fields (`fiveSecondProposition`, `businessQuestion`) stay owned by `DEMONSTRATION_SOLUTION_MODEL.md` and are consumed, not restated. Where the Atlas and a registry disagree, the registry is authoritative for its own fields and the Atlas record is a defect. Adding a capability to the Atlas that is absent from every registry is prohibited — it would recreate the fragmentation this ADR closes.

#### ADR-045 Amendment A — capability identity is its own namespace (ATL-01 evidence, 2026-08-20)

**Two clauses above are amended by ADR-052, and the reason is evidence rather than preference.**

ADR-045 was written before the `ATL-01` inventory existed. It assumed every CogniX capability was
already registered as a `SOL-*` or an `EXP-*`, and on that assumption ruled that a capability has
exactly one identity drawn from those namespaces and that admitting a capability absent from every
registry is prohibited. **The inventory falsified the assumption.** Twenty governed capabilities —
`CDI-02`…`CDI-08`, `DDF-01`, `IFI-01`, `ESF-1`/`-2`/`-3`/`-6`, `WP10-B`/`-C`/`-D` — are contracted,
engine-backed, API-exposed, test-covered and reported, and appear in no registry. Held literally, the
prohibition would forbid the Atlas from describing most of what CogniX can actually do, which inverts
the ADR's own purpose.

Amended, therefore:
- *"A capability has exactly one identity (`SOL-*` or `EXP-*`)"* → a capability has exactly one identity
  in the **`CAP-*`** namespace (ADR-052). `SOL-*`, `EXP-*`, `PAT-*` and work-package identifiers remain
  separate governed identities, reached from a capability by typed relationship.
- *"Adding a capability to the Atlas that is absent from every registry is prohibited"* → a capability
  absent from every registry is admitted **only** on implementation evidence, never on documentation
  alone (ADR-052).

**Everything else in ADR-045 stands unchanged**, and is in fact strengthened: registry fields are still
never duplicated into an Atlas record, the registries remain authoritative for their own fields, and
the Atlas still adds only the knowledge they do not carry.

---

### ADR-046: Capability Knowledge Is Served From a Registry, Never Authored In a Component
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-02`).
- **Context:** The estate already demonstrates both the pattern and the anti-pattern. `config/solutions.ts` and `config/domains.ts` hold knowledge as typed, inspectable data. `components/QuestionsWorthAsking.tsx` holds its ten `CuriosityQuestion` records — question, why-asking, target experiment, target solution, narrative and evidence points — as a literal array inside the component. That content is real capability knowledge: it names `EXP-COMMITMENT-01`, `SOL-PROMO-01` and quantified evidence. Being inside a component, it is unsearchable, unreferenceable from any other surface, invisible to the relationship graph, and unreachable by an AI retrieval layer. Principle 12's *No Literal Standing In For A Calculation* rules that a displayed value must come from the engine that owns it; this ADR states the knowledge counterpart.
- **Decision:** Atlas capability knowledge is stored in version-controlled registries under `config/` (or a dedicated content root established by `ATL-02`), accessed exclusively through a repository abstraction, and served to the presentation layer through API contracts. No Atlas surface authors capability prose inside a React component. `components/QuestionsWorthAsking.tsx` is explicitly identified as content to be migrated to the registry by `ATL-02`/`ATL-03`; the component becomes a renderer.
- **No database is mandated.** The estate's registries are TypeScript modules and the demonstration data is synthetic and version-controlled. A capability registry is the same shape of problem and gets the same shape of answer. Because all access is through the repository abstraction, a later move to a service or store is a change behind one interface and requires a new ADR rather than a rewrite.
- **Consequences:** Capability knowledge becomes diffable, reviewable and attributable through ordinary code review. Search, the relationship graph, semantic retrieval and the client-preparation pack all read one source. `ATL-04` acceptance includes a check that Atlas components contain labels and layout only. The migration of `QuestionsWorthAsking` is additive: the existing surface keeps working, its content moves.

---

### ADR-047: Innovation Lifecycle, Demonstration Maturity and Implementation Status Are Three Orthogonal Dimensions and Are Never Collapsed
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-01`).
- **Context:** The estate already carries two maturity vocabularies, and a third concept is implied everywhere but named nowhere. `EXPERIMENT_LIFECYCLE.md` defines innovation lifecycle states — `Concept`, `Research`, `Prototype`, `Pilot Ready`, `Accelerator`, `Industry Pattern`, `Retired` — gating an idea's journey to a reusable asset. `CognixSolution.demoMaturity` defines demonstration readiness — `Production Ready`, `Interactive Prototype`, `Reference Pattern`. Neither answers *is the thing behind this screen actually computing, or is it a literal?* — the question the `DDF-01` defect register had to answer case by case (`D-DDF-1` hardcoded JSX decomposition, `D-DDF-3` ARIMA/Prophet/GenAI implemented as sine and cosine factors, `D-DDF-2` an unsupported accuracy claim). An Atlas that introduced a fourth, independent maturity ladder would contradict two authoritative vocabularies and still not capture that question.
- **Decision:** No new maturity taxonomy is created. Atlas capability records carry three orthogonal dimensions, each owned by an existing authority where one exists:
  - **Innovation lifecycle** — the `EXPERIMENT_LIFECYCLE.md` seven states. Owned by that document. Applies to the capability as an innovation asset.
  - **Demonstration maturity** — the `CognixSolution.demoMaturity` three values. Owned by `DEMONSTRATION_SOLUTION_MODEL.md`. Applies to the capability as a demonstrable surface.
  - **Implementation status** — introduced here because nothing owns it: `implemented`, `partially-implemented`, `simulated`, `experimental`, `concept`, `roadmap`. Applies to the running code behind the capability, and is recordable at field level, not only at capability level.
- **The three do not imply one another, and that is the point.** A capability may be `Production Ready` for demonstration, `Prototype` in the innovation lifecycle, and `simulated` in implementation — a combination that is legitimate, common in a demonstration estate, and dangerous only when hidden. The Atlas shows all three together or none.
- **Consequences:** Implementation status is never inferred from demo maturity, and a `Production Ready` label never implies computed behaviour. `ATL-01` must classify every inventoried capability on all three dimensions with file-level evidence. Prior `DDF-01` defect findings are inventory input, not rediscovery. No Atlas surface may display one dimension alone where the reader would reasonably take it for the others.

---

### ADR-048: Internal Capability Truth and External Market Evidence Are Separate Evidence Classes
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-05`, `ATL-06`).
- **Context:** `ATL-06` introduces external research and current market evidence to support comparative and market-context questions. Principle 13 already rules that inferred demand is never represented as observed fact and that provenance travels on the datum rather than the page. The same failure mode appears one level up: an externally retrieved claim, or a synthesised comparison, read as a statement of what CogniX does. A market study asserting that a technique is standard practice does not make it a CogniX capability, and the distance between those two readings is exactly one undifferentiated paragraph.
- **Decision:** CogniX-owned capability documentation, implementation evidence, architecture and tests are authoritative for statements about what CogniX does. External research may explain, summarise, compare, contextualise and supply market evidence, and may never redefine a capability. Every Atlas response separates content into three classes that are distinguishable **structurally in the payload and visually on the surface**: **From CogniX** (governed internal evidence, cited to a capability identifier), **Market Context** (externally retrieved, carrying source, publisher, publication date and retrieval date), and **AI Interpretation** (synthesis, which may not assert a CogniX capability fact without citing the From-CogniX statement it rests on).
- **Consequences:** A CogniX-only question is answered from governed knowledge and an explicit gap statement, never from the web, however thin retrieval is. An external claim that cannot carry provenance is dropped rather than rendered. Intent misclassification fails safe toward internal-only. Generic market claims — the *"AI improves forecasting"* class — fail the standard for the same reason `D-DDF-2` failed: an unsupported claim is indistinguishable from a supported one to the executive reading it.

---

### ADR-049: Atlas AI Runs Server-Side Behind the Existing Provider Abstraction and Refuses Rather Than Fabricates
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-05`, `ATL-06`).
- **Context:** ADR-006 established Gemini as a narrative and evidence-synthesis layer; ADR-018 separates GenAI from the deterministic and ML layers; `ARCHITECTURE.md` §3.4 isolates provider interaction behind `lib/gemini.ts` / `lib/ai-provider.ts`. ADR-044 then drew the sharpest line available: the CDI-01 drafting route returns `503` naming the missing variable and generates nothing, explicitly departing from `lib/gemini.ts`, whose NLQ and briefing routes fall back to mock analytics — *a mock briefing is a demo affordance, whereas mock decision context would be fabricated input to a governed contract*. Atlas answers describe governed capability knowledge, which places them on the governed-contract side of that line.
- **Decision:** All Atlas AI passes through a server-side gateway that owns intent routing, retrieval, prompt assembly, guardrails, provenance assembly and cost control, with providers as adapters behind the existing abstraction. No provider SDK is imported into a client component and no model or grounding endpoint is called from the browser. **With no provider configured, or on provider failure, Atlas AI degrades to deterministic structured search results and says so; it never returns generated capability content from a fallback path.** Degrading to Level 1 is not a canned fallback — structured search returns real registry data, which is why it is permitted where a mock answer is not.
- **Consequences:** Provider substitution changes no retrieval, record or surface behaviour, and `ATL-06` proves this with a second or fake adapter under test. Every answer sentence asserting a CogniX capability fact carries a citation to a capability identifier; an uncitable sentence is not emitted. The provider key is resolved server-side only, is never written into a capability record, fixture or log, and no error path echoes it. The Atlas is fully usable with no AI configured at all.

---

### ADR-050: Atlas Search Evolves In Three Levels and Level 1 Must Stand Alone
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-04`, `ATL-05`).
- **Context:** Search is how every audience — and every future agent — enters the Atlas. Semantic retrieval and AI explanation are the eventual goal but depend on keys, indexes, quotas and providers. Principle 12 already rules that deterministic strategy generation must not depend exclusively on an external LLM being available; discovery deserves the same protection, since a capability catalogue that stops working without a key is not a governed knowledge layer.
- **Decision:** Atlas search is built in three levels, each functioning without the levels above it. **Level 1 — Structured Search:** deterministic, explainable, reproducible retrieval over registry fields with filters for domain, sub-domain, business problem, persona lens, innovation lifecycle state, demonstration maturity, implementation status, cross-domain applicability and tags. **Level 2 — Semantic Search:** embedding retrieval over governed capability knowledge only, with every result traceable to the record and field that matched. **Level 3 — Ask CogniX:** grounded explanation with per-claim citations. Level 3 degrades to Level 2, Level 2 to Level 1, and each degradation is stated to the user.
- **Consequences:** Level 1 ranking is documented and the response names the fields that matched, so a surprising result is inspectable rather than mysterious. The semantic index is additive and does not change the registry format. Zero-result searches return the nearest filter relaxation rather than an empty page. No Atlas surface becomes unusable because an AI dependency is absent.

---

### ADR-051: The Architectural Storyboard Is Superseded Through a Knowledge-Preservation Gate, and the Historical Implementation Is Not Merged
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-01` audit, `ATL-04` gate).
- **Context:** The Capability Atlas is intended to supersede the Architectural Storyboard as the way CogniX explains itself. Two implementations of that storyboard exist on different lines of history. The authoritative CogniX branch carries a **12-slide** `components/ArchitectureExplorer.tsx`. The abandoned Lidl-era `main` line carries a **14-slide** version (2,303 lines) produced by later storyboard-restoration and presentation-framework work that was never brought across, together with a different `components/Help.tsx`. The 14-slide version contains architectural narrative — persona journeys, an enterprise blueprint, a recommendation lifecycle, a governance-and-trust narrative, an explicit account of why the reasoning layer is constrained, presenter notes and demo timings — some of which may not exist anywhere on the CogniX line. Merging that implementation would import Lidl-era branding and a superseded surface into an estate that completed identity neutralisation in Phase 1. Ignoring it would discard architectural knowledge.
- **Decision:** **Preserve architectural knowledge, not obsolete storyboard implementation.** The historical 14-slide implementation, its restoration commits, its `ArchitectureExplorer.tsx` and its `Help.tsx` are **not merged, cherry-picked or ported**. `ATL-01` instead inspects **both** versions read-only — the 12-slide current version on the CogniX line and the 14-slide historical version on `main` — and identifies architectural knowledge unique to either. Every retained unit is assigned a destination: a capability record field, capability architecture, platform architecture, domain architecture, an ADR, or other governance. The current storyboard is not deleted or disabled during `ATL-01`.
- **The retirement gate (`SB-GATE`), all six required:** ① both versions audited slide by slide with a retain/discard decision per unit of knowledge; ② every retained unit verifiably present at its destination; ③ destinations reachable from the Atlas or from governance, not only from a file; ④ persona journeys, the enterprise blueprint, the recommendation lifecycle, the governance-and-trust narrative and the constrained-reasoning narrative each have a named successor surface; ⑤ presenter notes and demo timings preserved as Demo Path content; ⑥ retirement proposed in a work package that also names what replaces the navigation entry.
- **Consequences:** Architecture transparency cannot be lost as a side effect of adding the Atlas. If the gate cannot be met, the storyboard remains and the Atlas coexists with it. The historical branch stays available as a read-only audit source and is never a merge source.

---

### ADR-052: Capability Identity Is a First-Class `CAP-*` Namespace, Distinct From Solutions, Experiments, Patterns and Work Packages
- **Status:** Approved — governance registration 2026-08-20. **Not implemented** (`ATL-02`).
- **Context:** `ATL-01` established that the estate has no namespace meaning *"a thing CogniX can do"*. It has four namespaces meaning other things, each correct for its own purpose: `SOL-*` is a **packaged demonstration surface**, `EXP-*` is an **innovation experiment**, `PAT-*` is an **observed learning pattern**, and `CDI-*` / `ESF-*` / `IFI-*` / `DDF-*` / `WP10-*` are **units of delivery work**. Twenty governed capabilities sit in none of them. The obvious repairs were considered and each fails on evidence:
  - **Work-package identifiers as capability identity** fails on cardinality. `DDF-01` is one work package that delivered four independently discoverable capabilities — Forecast Stability (ADR-040), Decision Gap (ADR-041), Decision Window (ADR-042) and Decision Regret (ADR-043) — each with its own definition, its own governing ruling and its own reason a user would search for it. Collapsing four capabilities into one identifier makes them unaddressable, and the Atlas exists to address them. The inverse also occurs: `CDI-07B` delivered three artefacts, and `ESF-6`/`CDI-08` split one predicate across two packages.
  - **Forcing everything into `config/solutions.ts`** fails on meaning. A Demonstration Solution is a client-facing packaged surface satisfying the Five-Second Rule and carrying `fiveSecondProposition`, `demoMaturity` and `dataClassification`. Shared Decision State is a capability; it is not a demonstration solution and never will be. Admitting it would dilute a contract that currently works.
  - **Leaving capabilities unaddressed** fails on the programme's purpose.
- **Decision:** Capability identity is a **first-class `CAP-*` namespace**. A `CAP-*` identifier denotes *what CogniX can do*, is stable, immutable and never reused, and is the primary key of every Atlas knowledge record. `SOL-*`, `EXP-*`, `PAT-*` and work-package identifiers remain **separate governed identities that are not renamed, absorbed or deprecated**; a capability reaches them through typed relationships — *demonstrated-by* a solution, *originated-as* an experiment, *evidenced-by* a pattern, *delivered-by* one or more work packages.
- **The relationship is many-to-many in both directions, which is the whole point.** One work package may deliver several capabilities (`DDF-01` → four). One capability may be delivered across several work packages (`CDI-08` + `ESF-6`). One solution may surface several capabilities (`SOL-DEMAND-02` surfaces the four `DDF-01` capabilities). A capability may have no solution, no experiment and no pattern, and still be real.
- **Admission is on implementation evidence, never documentation.** A `CAP-*` identifier is minted only where the inventory can cite a contract, an engine, a route, a test or a report. A capability that exists only as a plan is recorded at `implementation status: roadmap` or `concept` and is labelled as such, exactly as `Demand Fusion` and `Forecast Regret` must be (`COGNIX_CAPABILITY_ATLAS.md` §1.2). This preserves the ADR-045 rule that the Atlas never invents capabilities, while removing the registry-membership test that `ATL-01` proved unworkable.
- **No metadata is duplicated.** The `CAP-*` record carries identity, relationships and the knowledge extension of `CAPABILITY_KNOWLEDGE_MODEL.md`. It does **not** restate `CognixSolution` fields, experiment metadata, pattern content or lifecycle states — those are resolved through the relationship, and the source registry stays authoritative for them (ADR-045, unamended portion). Where a capability's lifecycle or demonstration maturity is knowable only through a related `EXP-*` or `SOL-*`, it is read from there, not copied.
- **A registry is permitted, not mandated.** `ATL-02` determines whether a canonical `config/capabilities.ts` is justified, and the minimal schema and migration needed to add it without duplicating existing metadata. The estate's precedent argues for it — `config/solutions.ts`, `config/experiments.ts` and `config/domains.ts` are all typed registry modules — but the shape is `ATL-02`'s to establish, and `tests/unit/run-wp10d-tests.ts:159` shows the estate is willing to assert where a registry may and may not be consumed from.
- **Consequences:** The four `DDF-01` capabilities become independently searchable, citable and demonstrable, which Level 1 search requires and which no other option delivered. Capability identity survives re-delivery: if a capability is rebuilt under a later work package, the `CAP-*` identifier is unchanged and a relationship is added. `ATL-01`'s twenty unregistered capabilities become addressable without inventing a solution or an experiment for each. The cost is one more namespace in an estate that already has several, accepted deliberately because the alternatives lose information the Atlas exists to carry. Identifier allocation, and the `PAT-BEH-05` / `PAT-INT-05` style of suffix collision recorded as `ATL-01` gap `G6`, are `ATL-02`'s to prevent by keying on the full identifier.

---

### ADR-053: A Contradiction Between External Evidence and Governed CogniX Truth Is Separated, Never Resolved
- **Status:** Approved & **Implemented** (`ATL-06A`, 2026-08-21). Enforcement in `lib/atlas/grounding/contradiction.ts`; evidence in [`COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md`](../reports/COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md).
- **Context:** ADR-048 established the three evidence classes and ruled that external research may never redefine a capability. It did not say what happens when the two disagree, and that omission is where the rule would have failed in practice. The hardest case for a grounded Atlas is not a question it cannot answer; it is a question where a credible external source and a governed record contradict each other. The tempting output is one fluent paragraph that reconciles them — the reader gets a clean answer, the seller gets a usable line, and a market expectation has silently become a CogniX capability. That paragraph is unattributable by construction: no citation can be attached to a sentence that is partly a governed fact and partly an external claim, which is exactly the `D-DDF-2` failure mode one level up.
- **Decision:** **Governed CogniX facts take precedence, and a contradiction is rendered as three separated evidence classes rather than resolved into one statement.** The governed statement is quoted from the record and stated first, carrying its capability citation. The external claim is quoted **unaltered** and second, carrying its source, publisher, publication date and retrieval date. An interpretation may then observe what the gap between them suggests, third, and only by citing the From-CogniX statement it rests on. An interpretation may name a direction; it may never assert a CogniX capability fact.
- **The contract enforces this, not the prose.** `ContradictionRecord` carries three separate strings and has **no field capable of holding a merged, reconciled or synthesised statement**; its `resolution` is a literal type with the single value `cognix-authoritative`. A surface cannot render a fourth, blended row because there is nothing to render.
- **Detection is deterministic and declared.** A governed record yields *constraints* — statements it already makes about synthetic inputs, non-real implementation status, demonstration-grade maturity or early lifecycle. An external claim yields *assertions* — declared phrases attributing liveness, production use, scale or settled maturity. A constraint and an assertion on the same dimension, about the same capability, is a contradiction. Nothing is inferred from tone and no model is consulted, so the same inputs always produce the same separation.
- **Consequences:** A capability that declares synthetic inputs is protected by the rule automatically, without anyone remembering to protect it — `CAP-SIGNAL-CONNECTOR` is defended by the same code path as `CAP-PROMOTION-INTELLIGENCE` because both record what their inputs actually are. Conversely, a capability that declares no constraint cannot manufacture a contradiction out of a harmless market claim, so the mechanism does not degrade into noise. A claim asserting a dimension the record does not constrain is simply market context. The cost is that a reader sees three statements where a chatbot would show one; that cost is the product.

---

### ADR-054: External Evidence Is Admitted, Not Merely Attributed — Provenance, Tier and Freshness Are Admission Conditions
- **Status:** Approved & **Implemented** (`ATL-06A`, 2026-08-21). Enforcement in `lib/atlas/grounding/provenance.ts` and `lib/atlas/grounding/policy.ts`; policy published at `GET /api/v1/atlas/grounding`.
- **Context:** ADR-048 requires every external claim to carry source, publisher, publication date and retrieval date, and rules that a claim which cannot carry provenance is dropped rather than rendered. Attribution alone is a weaker guarantee than it appears: a correctly attributed claim from an unknown blog, a correctly attributed claim from a vendor's own marketing page, and a correctly attributed claim from a study that expired three years ago are all *attributed*, and all three would sit beside a governed capability record looking equally authoritative to the executive reading them. Principle 13's rule that provenance travels on the datum is necessary and not sufficient.
- **Decision:** External evidence passes a declared **admission gate** before it can enter the Market Context class, and admission is a pure function of the claim, an allowlist, the clock and the published policy. A claim is admitted only if it (a) carries every provenance field with no optional among them, (b) resolves to an `https` host that is on the trusted-source allowlist by exact or dot-bounded suffix match, (c) carries an admissible source tier — vendor marketing and unclassified sources are excluded by name, (d) carries a parseable, non-future publication date, since **a date is never inferred**, (e) falls within the currency bound declared for its topic class, and (f) does not itself assert a fact about what CogniX does. A rejected claim is **recorded with its reason and shown to the reader as a count and a reason**, so a thin market section and a censored one are distinguishable.
- **Whether external knowledge is consulted at all is a separate, earlier gate.** Questions classify as `internal-only`, `external-permitted` or `external-required`, and the classification **fails safe downward**: any CogniX-identity or internal-question signal keeps the CogniX portion of the answer governed, an unclassifiable question is internal-only, and an unrecognised topic inherits the strictest currency bound rather than the most permissive. An `internal-only` question never reaches a provider at all, so a misbehaving adapter and a well-behaved one produce the same result for a question about this estate: nothing.
- **Insufficiency is a refusal, not a thin answer.** Where a question can only be answered from external evidence and none can be admitted, the response refuses and says which of the three cases applies — no provider configured, evidence retrieved and all of it inadmissible, or nothing found. ADR-049 already established that this estate refuses rather than approximates; a sparse market section is not permitted to stand in for a refusal.
- **Consequences:** The policy is **published** at `GET /api/v1/atlas/grounding` from the same constants the engine reads, for the reason Level 1 publishes its field weights: a rule that decides what a reader is not shown must be challengeable by that reader. Admission is testable with no provider in existence, which is why `ATL-06A` could prove it before `ATL-06B` builds one, and why `ATL-06B` cannot weaken it by supplying one. The allowlist is deliberately short — an allowlist that admits everything is not an allowlist — and extending it is `ATL-06C`'s work, on evidence, not a convenience. The cost is that genuinely useful evidence from an unlisted publisher is dropped; that is the correct direction to fail.

---

### ADR-055: Only Grounded Segments Become Market Claims, and Provenance Is Read From the Source, Not the Model
- **Status:** Approved & **Implemented** (`ATL-06B`, 2026-08-21). Enforcement in `lib/atlas/grounding/providers/grounding-extraction.ts` and `source-resolution.ts`; evidence in [`COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md`](../reports/COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md).
- **Context:** A model grounded with search returns **one continuous passage**. Some of it is supported by retrieved pages; the rest is the model writing plausible connective prose from training data. Both arrive in the same string, in the same register, and the ungrounded half is usually the more fluent. The conventional integration renders the passage and lists the sources beneath it, which publishes model recall as sourced market evidence — the exact failure ADR-048 exists to prevent, now arriving with a citation block attached. A second, quieter version of the same failure: grounding metadata carries a page title and a redirect URL but **no publisher and no publication date**, and `GroundingChunkWeb.domain` is not populated by the Gemini Developer API at all. Asking the model to supply those fields is trivial, works, and makes the provenance model-asserted — provenance theatre that satisfies ADR-054's field checks while defeating its purpose.
- **Decision:** **A response segment becomes a market claim only where a `groundingSupport` covers it and names at least one retrieved source chunk.** Everything else is discarded, counted, and the count is shown to the reader; nothing is downgraded, hedged or retained "for context". **Provenance is obtained by resolving the grounding redirect to the real page and reading that page's own metadata** — publisher from what the site calls itself, publication date from `article:published_time`, JSON-LD `datePublished`, citation metadata or a `<time datetime>` — and never from the model, never from body copy, never from the retrieval date. What a page will not state stays empty, and ADR-054 then refuses the claim. **Failing closed is the intended outcome**: a market claim whose page will not say when it was written has not earned a place beside a governed capability record.
- **The wire contract is transcribed, not imported.** The estate's installed `@google/generative-ai@0.24.1` mistypes grounding — `GroundingSupport.segment` as a `string` when it is an object of byte offsets, the chunk-index field spelled `groundingChunckIndices` against the wire's `groundingChunkIndices`, no `domain` on `GroundingChunkWeb`, and the legacy `googleSearchRetrieval` tool where current models take `googleSearch`. Extraction through those types silently yields zero supports, which would turn "only grounded segments survive" into "nothing survives" or, worse, invite the passage-plus-sources shortcut. `ATL-06B` therefore calls the documented REST contract directly: no new dependency, and the shape is stated in `gemini-grounding-types.ts` where it can be reviewed against the source.
- **Segment offsets are byte offsets.** Slicing the passage as a JavaScript string misaligns every segment after the first non-ASCII character — one curly apostrophe in a quoted headline is enough — so extraction slices a byte buffer. This is recorded as a decision because the failure is silent, plausible-looking, and corrupts evidence rather than losing it.
- **Google Search Suggestions are displayed as supplied.** Where the provider returns `searchEntryPoint.renderedContent`, it is rendered unaltered. Displaying it is a condition of using Grounding with Google Search, and a hand-rolled substitute is not permitted; it is the only place in the Atlas where third-party markup is injected, and it is confined to that field.
- **Consequences:** With a live key, fewer claims are shown than a naive integration would show, and sometimes none — which is the correct reading of a search that found opinion rather than dated research. The reader is told how many model sentences were discarded, which is the number that distinguishes evidence from recall. A provider swap changes none of this: extraction, resolution and admission sit outside the adapter, so a different model behind the same seam is subject to the same arithmetic.

---

### ADR-056: External Research Is User-Initiated, Bounded and Cached; the Atlas Never Reaches Outward On Its Own
- **Status:** Approved & **Implemented** (`ATL-06B`, 2026-08-21). Enforcement in `lib/atlas/grounding/engine.ts`, `providers/grounding-cache.ts` and the Ask CogniX surface.
- **Context:** Once a grounding provider exists, the default posture is the decision. A system that searches whenever retrieval looks thin will search constantly: it will spend quota on questions the governed corpus already answers, send the reader's exact wording to a search engine without being asked, add a network round trip to every answer, and — most damagingly — make external evidence the thing that arrives when internal evidence is weak, which is precisely when a reader is least equipped to discount it. ADR-050 already ruled that no Atlas surface may become unusable because an AI dependency is absent; the same reasoning applies to a dependency that is present.
- **Decision:** **External research runs only when a reader asks for it, on that question.** The Ask CogniX control is off by default and is not remembered as a preference; `ask()` defaults `research` to `false`; the API route treats its absence as false. The request is a request, not a grant: the ADR-054 intent policy still decides whether external evidence is admissible for the question at all, so asking for research on a question about what CogniX does still calls nothing. Internal structured search and the internal Ask CogniX path never invoke a provider under any setting. Where a question could only be answered externally and research was not requested, the response **refuses with a distinct reason** — `research-not-requested` — stating that nothing was looked up, which is a materially different statement from nothing having been found.
- **Cost is bounded structurally.** Retrieval is cached on the normalised question, the permitted topics and the model, so a question repeated inside a demonstration is served without a second call; an **empty** retrieval is never cached, so one transient failure cannot become hours of silent emptiness. A per-process call budget bounds a caller in a loop. Both the cache state and the live call count are published at `GET /api/v1/atlas/grounding`.
- **Consequences:** The Atlas has no ambient outbound behaviour: with nobody asking, it makes no external call, and that is provable rather than asserted. Turning the provider off returns the estate exactly to `ATL-05` — asserted by recomputing the governed answer from the `ATL-05` modules and comparing byte for byte, with the provider both absent and present. The cost is one more thing for a user to click; that click is what makes the difference between an Atlas that answers from its own records and one that quietly consults the internet on their behalf.

---

### ADR-057: An Interpretation May Only Reason From Admitted Evidence, and Every Reading Is Verified Before It Is Shown
- **Status:** Approved & **Implemented** (`ATL-06C`, 2026-08-21). Enforcement in `lib/atlas/interpretation/premises.ts` and `verification.ts`; evidence in [`COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md`](../reports/COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md).
- **Context:** ADR-048 defined **AI Interpretation** as the third evidence class and constrained it: it may not assert a CogniX capability fact without citing the From-CogniX statement it rests on. `ATL-06A` could only satisfy that by templating a reading from a detected contradiction, because anything broader needs a provider. `ATL-06B` supplied the provider and an admitted market corpus, and with them the sharpest risk in the programme: interpretation is the most persuasive surface the Atlas has. It reads as judgement rather than data, it is where a reader stops checking, and it is the one place where a fluent sentence can promote a market expectation into a capability claim without ever making a claim that looks false. `ATL-06B` also created a second, subtler hazard: the envelope now carries **rejected** claims and a count of **discarded** ungrounded model text, deliberately, so that omissions are auditable. Material kept for audit is material sitting one careless parameter away from being reasoned from.
- **Decision:** **The premise set is built by construction, not by instruction.** An interpretation may reason from exactly two things: the governed statements in the From CogniX block, and the **admitted** statements in the Market Context block. Rejected claims and discarded segments are **audit material, never premises** — the module that assembles premises does not read them, so no prompt, parameter or provider can reach them. A prompt can be told to ignore evidence; a function that never receives it cannot be persuaded.
- **Every candidate reading is verified before it is shown**, against declared rules checked in order from structural to semantic so a refusal names the first thing wrong: it carries text, no markup and no more than 500 characters; every cited premise id resolves; at least one cited premise is a governed CogniX record; it asserts no CogniX capability fact; it reproduces no claim that failed source admission; it introduces no number that a cited premise does not contain; and it names no organisation that a cited premise does not mention. **A reading that fails any rule is dropped, not hedged.** A caveated unsupported reading is still unsupported and is the more dangerous of the two, because the caveat reads as diligence. Drops are recorded with the rule they broke and shown to the reader.
- **Two rules carry most of the weight.** `echoes-rejected-claim` exists because structural exclusion prevents the easy failure but not the interesting one: a provider that saw the same page in its own training data and reproduces the substance of a claim this estate refused. `unsupported-quantity` exists because numbers are what survive a meeting — a reader forgets the sentence and remembers *"forty per cent"* — so a figure appearing in no cited premise is the most damaging thing an interpretation can invent.
- **Interpretation is a separate seam from grounding, and the interpretation adapter has no search tool.** They are different authorities: a grounding provider may go and look, an interpretation provider may only read what has already been admitted. One adapter holding both powers could source a claim and pronounce on it, and the separation of powers is the architecture. Output is constrained by `responseSchema`, so the citation is a required field rather than a convention the model is asked to observe.
- **The templated reading is kept alongside the generated one.** It is the deterministic account of a contradiction, reproducible from the records with no provider at all, and trading it for a more fluent paragraph would give up the only reading in the class that can be re-derived. Each statement is labelled with its origin, because the two carry different risk and a reader is entitled to know which they are looking at.
- **Consequences:** With no provider, or on provider failure, the class is exactly what `ATL-06A` produced and the audit states the degradation; nothing is generated from a fallback path (ADR-049). Verification is a pure function of the candidate, the premises and the rejection ledger, so every rule is provable without a provider — and a future adapter cannot weaken any of them. The visible cost is that a reader sometimes sees a refusal ledger where they expected a paragraph; that ledger is the product.

---

### ADR-058: Level 2 Semantic Retrieval Is Deferred — The Measured Failures Are Lexical, Not Semantic
- **Status:** Approved (`ATL-06C` evaluation, 2026-08-21). **Deferred, not rejected.** Evidence and method in [`COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md`](../reports/COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md) §3; reproducible via `tests/unit/run-atl06c-tests.ts` group G.
- **Context:** ADR-050 defined Level 2 as embedding retrieval over governed capability knowledge. It was chartered under the original `ATL-06B`, descoped when that phase was redefined as Grounded Market Intelligence, and left unassigned. Before spending an index on it, the question worth answering is narrower than *"would embeddings help"* — everything helps something. It is: **what is actually failing, and is the failure semantic?**
- **The measurement.** Eighteen questions phrased the way a business person asks them, each deliberately avoiding the target capability's own vocabulary, each with one intended capability. They are not paraphrases of the `ATL-04` acceptance queries, which already pass and therefore cannot answer this question. Level 1 alone puts the intended capability in the top three for **10 of 18**, first for **6 of 18**, and for **three** the capability does not appear in the results at all. That last figure is the diagnosis: absence from a result set is not a ranking failure, it is a **lexical** one — no term matched, so no amount of re-weighting would have helped.
- **The control.** A 22-entry declared alias vocabulary, mapping business phrasing onto governed terms (*"the right call afterwards"* → regret, *"goes off"* → half-life, *"plug our own data feed"* → connector), lifts top-three to **18 of 18** and first-place to **17 of 18**. The gap closes completely without embeddings, without a provider, and without a network call.
- **Decision:** **Level 2 semantic retrieval is deferred.** The measured failures are vocabulary mismatches between business phrasing and governed terminology, and a declared alias layer closes them at a fraction of the cost while preserving the two properties ADR-050 requires and embeddings cannot offer: Level 1 must stand alone, and a surprising result must be **inspectable**. An alias entry is a line a human can read, argue with and revert. An embedding neighbourhood is not, and "the vector said so" is not an explanation an architecture board can act on. Embeddings become the right answer when a failure is shown to be **conceptual** rather than lexical — a question whose intent no reasonable phrase list would capture — and this evaluation found none.
- **The alias layer is recommended, not shipped.** It is content: governed vocabulary mapping business language onto capability terminology, and this estate does not invent governed content inside a work package that was not authorised to create it — the same rule that produced `ATL-01`'s taxonomy correction. The prototype ships as an evaluation fixture, consumed by no runtime module, so the comparison stays reproducible and the decision stays the owner's.
- **Consequences:** No embedding index, no vector dependency and no additional provider enter the estate on the strength of an assumption. The eighteen-question set is committed and re-run on every change, so a regression in Level 1 recall is visible rather than discovered in a demonstration. The recorded cost of deferring is explicit: **top-three recall on business-phrased questions is 56%**, and until the alias layer is authorised it stays there.

---

### ADR-059: The Lexical Retrieval Gap Is Closed With Governed Vocabulary, Declared as Content and Reported on Every Search
- **Status:** Approved & **Implemented** (owner authorisation 2026-08-21, following the ADR-058 evaluation). Content in `content/atlas/vocabulary.ts`; validation in `lib/atlas/vocabulary-validator.ts`; published at `GET /api/v1/atlas/vocabulary`.
- **Context:** ADR-058 measured the gap and deferred embeddings: on eighteen business-phrased questions Level 1 put the intended capability in the top three for 10 of 18, and for three it did not appear at all. Absence is a lexical failure, not a ranking one — no re-weighting reaches a record that matched no term. The obvious fix is a synonym table, and the obvious fix has an obvious failure mode: a synonym table is where retrieval quietly stops being explainable. Entries accumulate because a demo missed, they point at words nobody checked exist, they rewrite the query invisibly, and six months later nobody can say why a search returns what it returns. ADR-050's requirement that a surprising Level 1 result be **inspectable** dies quietly and nothing fails.
- **Decision:** The gap is closed with a **governed vocabulary**, and three properties make it governance rather than configuration.
  - **It is content, shaped like every other governed record.** Each alias carries an identifier in a `VOC-*` namespace, the business phrase, the governed terms it introduces, an **owner**, a **review date**, a **written rationale a reviewer can disagree with**, and `evidenced_by` — the capabilities whose governed text actually contains those terms. Adding one is a reviewable act; removing one is a single line.
  - **Rule W6: a term must exist in the corpus.** Every governed term an alias introduces must appear in the governed text of a capability the alias names. An alias that cannot show its terms in the corpus is **inventing vocabulary**, which is exactly what `ATL-01` caught in the taxonomy and what rule V3 has forbidden since. This is not theoretical: W6 rejected six terms from the prototype ADR-058 measured — *hindsight*, *urgency*, *volatility*, *provenance*, *precedent*, *stale*. None of them is in this corpus. They were replaced with the words the records actually use, and one replacement — *half-life*, taken from the capability's own name — outperformed the invented term it replaced.
  - **Expansion is reported, never silent.** The searcher's own words and the vocabulary's contribution are kept in **separate fields** through query understanding and into the search response, which returns which alias fired, what it added and why. The surface renders it. An alias-driven match is attributed to the alias that reached it.
- **An alias never outranks the searcher.** Expanded terms score at a published factor of **0.75** of a direct hit, so a capability the searcher actually named always beats one the vocabulary reached for them. The vocabulary closes a lexical gap; it does not get to win an argument with the words a person chose. This is asserted head-to-head, not merely documented.
- **Consequences:** Top-three recall on business-phrased questions moves from **10/18 to 18/18**, and first-place from 6/18 to 16/18, with no embedding index, no vector dependency, no provider and no network call — and both figures are re-measured on every test run, with expansion switchable off so the baseline stays reproducible. The estate keeps what embeddings would have cost it: Level 1 stands alone, and every rule that changes what a searcher finds is a line a human can read, argue with and revert. The cost is a maintained list. That cost is deliberate: a list someone has to justify entries in is the mechanism, not an overhead on it.

---

### ADR-060: Persona And Domain Are Exploration Dimensions Of The Atlas, Not Global Application State (`ATL-04R`)

- **Status:** Approved & **Implemented** (`ATL-04R`, 2026-08-21). Enforcement in `app/page.tsx`, `components/atlas/CapabilityAtlas.tsx`, `content/atlas/capability-areas.ts`; evidence in [`COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md`](../reports/COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md).
- **Context:** The shell carried two global header selectors: Domain Context and Persona. Both asserted
  session-wide state. A persona selector says *the user IS this persona for this session*; a domain
  selector says *the application HAS this domain identity*. Neither claim is true of an innovation
  atlas. The people who use it need to read one capability as an executive and then as an architect,
  in the same minute, and a capability's reach ACROSS domains is one of the things they are trying to
  understand — so making domain an application identity hides the answer to a question the Atlas
  exists to answer. The selectors were also disconnected from the Atlas entirely: `CapabilityAtlas`
  never read `role` or `activeDomainId`, so the two most prominent controls in the product did nothing
  on the surface they appeared to govern.
- **Decision:** Both become exploration dimensions inside the Capability Atlas, and neither becomes
  identity. A user does not become a persona; they view governed records **through the lens of** one
  of four audience lenses, switchable freely and at no cost. Domain is a filter over an exploration,
  not a property of the session. The four-value `AudienceLens` vocabulary stays deliberately separate
  from the nineteen-entry product persona catalogue, as ADR-045 requires: a persona is who a
  capability SERVES, a lens is who is READING, and collapsing them would either invent a sales persona
  in the product or lose the Sales lens.
- **A lens reorders and never hides.** `LENS_FIELD_ORDER` changes emphasis; `NEVER_SUPPRESSED` keeps
  name, summary, the three maturity dimensions and known limitations present under every lens. There
  is no per-persona copy of any capability record, and there never will be.
- **No authentication role is introduced.** Exploration is not authorisation. Nothing about the lens
  reaches the identity system, and the removal of the header selector removed a writer of `role`
  rather than a reader of it.
- **Consequences:** `DOMAIN_SELECTED` and `PERSONA_SELECTED` remain members of the canonical journey
  event union and are emitted from the Atlas with new `source` values, so the discovery funnel stays
  measurable — the control was retired, not the observation. Any future surface tempted to ask "which
  persona is the user?" must instead ask "which lens is the reader using right now?", and must accept
  that the answer can change on the next click.

---

### ADR-061: Ambiguous Exploration Is Resolved By Deterministic Progressive Clarification, Not By Guessing And Not By A Model (`ATL-04R`)

- **Status:** Approved & **Implemented** (`ATL-04R`, 2026-08-21). Enforcement in `lib/atlas/clarification.ts`, `app/api/v1/atlas/clarify/route.ts`, `content/atlas/capability-areas.ts`; evidence in [`COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md`](../reports/COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md).
- **Context:** Level 1 answered every query identically: score, sort, render. For a precise query that
  is correct. For *"what capabilities does CogniX have on promotions?"* it returned two dozen
  capabilities spread across several problem spaces with no indication that the question had more than
  one reading — a large flat result set standing in for an answer, which is the behaviour that made
  the Atlas feel like a search engine rather than a place to explore.
- **Decision:** Where a question is genuinely open, the Atlas ASKS. Clarification is assembled entirely
  from governed records — capability areas and their declared aspects, the existing `LENS_LEXICON` and
  `FILTER_LEXICON`, the governed alias vocabulary and the domain catalogue — and is decided by counting
  those structures. No model, no provider, no credential, no network call, no embedding.
- **Five rules bound it, and they are asserted rather than intended:** it never asks for something the
  query already declared; it never asks more than twice; a choice may only narrow to capabilities the
  query already reached, so it cannot widen a result set or introduce a capability from elsewhere;
  every inference is returned marked `inferred` and is removable, so nothing is applied silently; and
  prepared responses are shortcuts rather than restrictions, with free text accepted at every step.
- **Confidence is qualitative and stays that way.** `IntentState` has four values and no percentage.
  Nothing in the estate calibrates a confidence number, and printing an uncalibrated one to make the
  interface look decisive is the unsupported-metric failure Principle 12 forbids.
- **Consequences:** Clarification works when everything else is unavailable, which is the property that
  makes it safe to put in front of the whole Atlas — it is how a reader reaches everything else. The
  cost is that it can only be as good as the governed area aspects behind it: a clarification the
  corpus cannot express is a content gap to be authored, not a prompt to be tuned. That is the intended
  trade.

---

### ADR-062: A Plural Query Reaching Nothing Is A Mechanical Defect And Is Fixed Mechanically (`ATL-04R`)

- **Status:** Approved & **Implemented** (`ATL-04R`, 2026-08-21). Enforcement in `lib/atlas/query-understanding.ts`, `lib/atlas/capability-search.ts`; evidence in [`COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md`](../reports/COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md).
- **Context:** `ATL-04R` measured a defect that had been in Level 1 since `ATL-04` and had never been
  seen because nobody had queried the plural. The corpus is written in the singular and `containsWord`
  anchors to word boundaries, so `promotions` returned **nothing** while `promotion` returned five
  capabilities; `decisions` returned nothing against twenty-six for `decision`; `capabilities`
  returned one against twenty-four. The first acceptance scenario for the clarification engine is
  literally *"What capabilities does CogniX have on Promotions?"*, and it was surfacing the wrong
  capability areas entirely — not because ranking was wrong, but because the words never met.
- **Decision:** Normalise the searcher's own word morphologically, by declared English rules, and only
  ever by ADDING a form. The searcher's word is never removed or rewritten, so nothing that matched
  before stops matching. A form-derived hit carries `FORM_TERM_WEIGHT_FACTOR` (0.9) and is attributed
  through `SearchMatch.via_form`, so the reader sees that `promotions` reached `promotion`.
- **The weighting order is now three-tiered and published:** a word the searcher wrote exactly, then
  the same word in another form (0.9), then a term the governed vocabulary supplied (0.75). A record
  the searcher actually named still outranks one anything else reached for them.
- **`cognix` becomes a stopword** for the reason the other stopwords are: in a corpus where every
  record is a CogniX capability it matches everything and therefore discriminates nothing.
- **This is not a substitute for the governed vocabulary (ADR-059).** Twenty aliases were NOT added for
  words the corpus already contains; conversely, normalisation reaches no capability whose text shares
  no term with the query. The `ATL-06C` measurement holds: three of eighteen business-phrased questions
  are still absent from the unexpanded baseline, which is the lexical gap only governed vocabulary
  closes. The recorded baseline moved on one axis only — top-one from 6 of 18 to 7 — and
  `run-atl06c-tests.ts` G2 records the new figure and why it moved.
- **Consequences:** Level 1 stays one deterministic mechanism with no second phrase syntax. The risk is
  over-normalisation of a word that is not a plural, which the rules decline to touch (`analysis`,
  `bus`, `-ss`, `-us`, `-is`) and which the suite asserts.

#### ADR-062 Amendment A — the corpus's own noun is a stopword too (`ATL-FINAL`, 2026-08-22)

- **Status:** Approved & **Implemented** (`ATL-FINAL`, 2026-08-22). Enforcement in
  `lib/atlas/query-understanding.ts` (`STOPWORDS`), `lib/atlas/clarification.ts`; regression in
  `tests/unit/run-atl04r-tests.ts` C1–C8.
- **What the browser acceptance found.** The original decision made `cognix` a stopword on the
  grounds that a word matching every record discriminates none of them, and then left the word
  `capability` in. It is the same word. Measured on the live estate,
  *"What capabilities does CogniX have on Promotions?"* returned **27 of 38** capabilities and
  ranked **Enterprise Signal second on a promotions question**; the correct answer led, so the
  defect was invisible to anyone reading only the first result. After the amendment the same
  question returns **9**, all of them promotion work.
- **Decision:** `capability` and `capabilities` join `cognix` in `STOPWORDS`. No capability in the
  registry is named with the word, so nothing becomes unfindable, and *"capability atlas"* still
  resolves on `atlas`. This removes a non-discriminating term; it adds no vocabulary, which the
  governed alias register (ADR-059) remains the only route for.
- **The clarification engine had to follow.** The original ADR-062 text observes that the first
  acceptance scenario is literally that query. It was treated as the canonical *area-ambiguous*
  question — but its area spread was the artefact, not a property of the question. With the noise
  removed the question settles on Campaign & Promotion, and the engine then asked *"which aspect of
  Campaign & Promotion?"* of a reader who had just said Promotion. The rule that already lowers the
  area-dominance bar for a declared intent now also **suppresses the aspect question where the area
  was inferred from the reader's own words and an intent was declared with it** — the same rule 2,
  one dimension further in. A reader who picked an area *from a clarification round* is still
  offered the next question: that is the progressive flow, not an interrogation.
- **Consequences:** *"Show me Promotion capabilities from an architect perspective."* now reaches
  results with no further question, which is what `ATL-04R` C8 always asserted and what the artefact
  had been satisfying for the wrong reason. C1 and C5 were re-pointed to a query that is multi-area
  in substance — the owner's own *"Promotions, demand, signals and inventory"* — and two new
  assertions (C2a, C2b) hold the corrected single-area behaviour so the artefact cannot return
  unnoticed. The 18-question `ATL-06C` retrieval baseline is unmoved: none of those questions
  contains the word.
- **A second mechanical defect, found the same way: a hyphenated query reached nothing.**
  `pre-mortem` returned **zero** results while `pre mortem` returned the right capability, and the
  corpus contains the hyphenated spelling eleven times. `IDENTIFIER_PATTERN` is applied to the
  upper-cased query, so `PRE-MORTEM` read as a governed identifier, matched no record, and took the
  whole query out of the residual with it — leaving no content words to match on. `half-life` and
  `decision-gap` failed identically, which is the original ADR-062 finding in a different disguise:
  the words never met. **Only a token the searcher actually wrote in upper case is now consumed as
  an identifier.** `DDF-01` still yields an identifier and no terms; a lower-case hyphenated token
  yields the identifier reading *and* its words, so the result is a superset and nothing that
  matched before stops matching.

---

### ADR-063: Explanatory Visuals Are Configuration Carried By Capability Knowledge, And Carry No Numbers (`ATL-04R`)

- **Status:** Approved & **Implemented** (`ATL-04R`, 2026-08-21). Enforcement in `packages/contracts/src/capability-atlas-model.ts`, `components/atlas/visuals/CapabilityVisual.tsx`, `lib/atlas/landscape-validator.ts`; evidence in [`COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md`](../reports/COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md).
- **Context:** A relationship, a flow, a distance or a comparison is understood faster as structure
  than as a paragraph, and the Atlas explains exactly those things. The estate also has a worked
  example of how visual explanation goes wrong: the Architectural Storyboard's twelve slides were
  hand-written JSX carrying twelve fabricated outcome constants — *"98% Audit Score"*, *"£12.4M
  National ROI"* — every one of which `ATL-01` marked Discard.
- **Decision:** A visual is a `VisualSpec` on a capability's knowledge module, and the component is a
  renderer. That is ADR-046 applied to pictures: a diagram authored inside a component is capability
  knowledge in JSX, which is the thing the Atlas backend exists to prevent.
- **The schema cannot express a number, deliberately.** There is no value, no axis and no scale, so no
  bar can be sized to a figure and no node can carry one. Rule L7 additionally rejects a quantity
  smuggled into a label. Where governed quantitative evidence exists it is cited as evidence, in
  words, beside the visual.
- **A text equivalent is mandatory, not an attribute.** `description` is required by the schema and
  rendered as visible text; the graphic is `aria-hidden`. A reader who cannot see the visual reads
  what it says rather than what it is.
- **The pattern set is closed and shrinks.** Six patterns were designed; four shipped. `half-life` was
  drafted for `CAP-DECISION-CONTRACT` and refused by that capability's own record — *Decision Half-Life
  publishes validity states and refuses any duration, countdown, expiry estimate or decay curve* (owner
  ruling W2) — so the capability took a `flow` and the pattern was deleted rather than left available
  for someone to reach for. `relationship` was deleted because nothing used it. A pattern with no
  caller is a framework, not an explanation.
- **Consequences:** Visuals are authored where they explain and absent elsewhere — ten of thirty-eight
  capabilities carry one, and that distribution is the intended one. Because the specs are governed
  data rather than page markup, `ATL-06D` can embed the same visuals in client-facing output without
  re-authoring them, which was the second reason for the boundary.

---

### ADR-064: A Lens Changes The Questions, Never The Answers (`ATL-06D`)

- **Status:** Approved & **Implemented** (`ATL-06D`, 2026-08-21). Enforcement in `lib/atlas/lens.ts`,
  `components/atlas/CapabilityDetail.tsx`, `app/api/v1/atlas/capabilities/route.ts`; evidence in
  [`COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md`](../reports/COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md).
- **Context:** `ADR-045` established that an audience lens REORDERS AND NEVER HIDES, and `ATL-04R`
  implemented that literally: the lens reordered the disclosure sections of the capability detail and
  did nothing else. Owner evaluation of the live interface found the honest consequence, recorded as
  defect `D-ATL-04R-1`:

  > Selecting Sales, Architect or Developer visibly changes the selected lens, but the overall Atlas
  > experience does not change materially enough from the default Innovation Executive presentation.

  The interface said so itself. The lens bar carried the note *"Ordering only — nothing is hidden, and
  the facts do not change."* That sentence was an accurate description of a control that did almost
  nothing, and a reader who selected **Developer** met the same four executive questions, the same
  opened section and the same ordering of capabilities as everyone else.

  The tempting repair — let a lens filter, so Sales sees less — is the one that must never be made.
  A Sales lens that could suppress a limitation is a mechanism for overselling, and `ATL-06D` §20
  exists precisely to prevent that.
- **Decision:** A lens decides **which questions are asked**, not which answers are available. The
  governed `LensProfile` declares, per lens: the four questions answered above the fold, the sections
  brought forward, the section opened on arrival, how much supplementary evidence detail renders
  inline, and the ranking signals that order a capability list. Every headline answer is resolved
  from fields already on the governed record, and `LensHeadline.reads` names those fields so the
  claim "this is a reading, not a new fact" is auditable rather than asserted.

  Three properties are enforced rather than promised:

  1. `orderForLens` returns a **permutation** — same members, same count. A lens cannot filter,
     checked at the route boundary and over the whole registry in `run-atl06d-tests.ts` §B.
  2. No lens alters identity, lifecycle, demonstration maturity, implementation status, limitations,
     validation evidence, architecture or demo facts — asserted field-by-field, 38 capabilities × 4
     lenses, rather than trusted to a comment.
  3. Evidence depth signposts rather than withholds. A `referenced` lens declines to lead an
     executive with a repository symbol and NAMES the lens that renders it, so nothing is concealed.

  The lens affinity score orders lists and is then discarded. It is not returned by the API, not
  rendered, and not convertible into a confidence percentage — a lens affinity printed as *"87%
  relevant"* would be the fabricated-metric failure `ATL-01` recorded and Principle 12 forbids.
- **Consequences:** `ADR-045` survives unamended and is now materially observable: four lenses
  produce four different question sets, four different opening sections and four different orderings
  over one unchanged corpus, verified in a browser on `CAP-DECISION-GAP` (`ATL-06D` §36). Prior
  assertions that grepped for the replaced strings — `ATL-04` H4/H5 and `ATL-04R` G13 — were
  re-pointed at the same intent against the governed profile, which is a stricter check than the
  string match was. `ATL-06D` consumes the same profile for recommendation ranking, so the lens is
  one governed mechanism rather than two that could disagree.

---

### ADR-065: A Capability Enters A Client Pack By Accumulating Rationale (`ATL-06D`)

- **Status:** Approved & **Implemented** (`ATL-06D`, 2026-08-21). Enforcement in
  `lib/atlas/preparation/recommend.ts`, `packages/contracts/src/atlas-preparation-model.ts`; evidence in
  [`COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md`](../reports/COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md).
- **Context:** A client preparation feature has one obvious implementation: search the corpus for the
  brief's words and list what comes back. `ATL-06D` §11 and §12 forbid both halves of that — the bare
  list (*"Recommended: Decision Gap, Intent Fusion, Forecast Stability"*) and the keyword flood
  (fifteen capabilities because fifteen matched a word). The failure is not cosmetic: a seller who
  cannot say why a capability is in their pack cannot defend it in the room, and will improvise.
- **Decision:** Recommendation is **admission by rationale**, not ranking by score. A capability
  accumulates `RecommendationRationale` entries from governed connections — a declared `bp-*` the
  client's situation matched, a registered domain, an assessed cross-domain applicability, a
  published contract for an integration conversation, a demonstration path for a demonstration
  objective, the reader's lens. A capability that accumulates none is **not recommendable**, so no
  code path produces the bare list and rule `P1` checks a property construction already guarantees.

  A lens signal alone is never sufficient: it says something about the reader and nothing about the
  client, so at least one basis must argue from the conversation itself.

  The lead cut is **separation-tested**. Where the sixth capability scores within
  `LEAD_SEPARATION_RATIO` of the fifth, the field is flat, the cut would be arbitrary, and the pack
  widens the lead set and says the field is close — the `AMBIGUITY_SEPARATION_RATIO` idea from
  `ATL-05` applied to selection instead of interpretation.
- **Consequences:** Scoring reuses the ADR-050 search and the ADR-059 vocabulary rather than
  introducing a second relevance model. The score orders and is discarded; the reader receives the
  rationale in words, which is the thing they can actually check. An early version of the intake
  tokenised `bp-*` labels and matched any word over four characters, which made **platform** — from
  the label *"Knowing what the platform can do"* — a trigger, so *"integrates with an existing
  planning platform"* was read as a capability-discovery problem. Declared, reviewable phrase
  lexicons replaced it; generic words in governed labels are not evidence of a business problem.

---

### ADR-066: Sales Integrity Is A Contract Rule, Not A Copy Review (`ATL-06D`)

- **Status:** Approved & **Implemented** (`ATL-06D`, 2026-08-21). Enforcement in
  `lib/atlas/preparation/integrity.ts`, `packages/contracts/src/atlas-preparation-model.ts`,
  `app/api/v1/atlas/prepare/route.ts`; evidence in
  [`COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md`](../reports/COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md).
- **Context:** Six phases of this programme were spent making limitations visible. `ATL-06D` is the
  first surface where a person has a commercial reason to want them quieter, and it arrives at the
  moment the pack is most useful. A guideline saying "always mention limitations" would not survive
  that pressure, because nothing checks a guideline.
- **Decision:** Overselling is prevented **structurally**.

  1. `DemoWarning[]` and `AvoidClaiming[]` are non-optional arrays on `PreparationPack`. Rule `P2`
     refuses a pack that recommends a non-`implemented` capability carrying no demonstration warning.
     A pack with violations is a **500 from the route**, not a page with a caveat: it is a document
     that could mislead a client, so it is not returned.
  2. Every warning is DERIVED and names the governed field it came from (`derived_from`). A warning
     that cannot name one is not emitted — §21 forbids inventing warnings to populate a section, so a
     capability with nothing to warn about produces nothing and the pack is honest about that too.
  3. Warnings, limitations and maturity are **lens-invariant**, asserted directly: no warning a
     Developer pack carries is absent from the Sales pack for the same capability.
  4. `AvoidClaiming.instead` is required. Telling a seller what not to say without giving them the
     true sentence is advice that gets discarded in the room.

  Scoping by tier is a legibility measure and is bounded by a declared non-negotiable set: status,
  synthetic-data, open-defect and missing-evidence warnings are never scoped away. Demonstration-path
  warnings for a demo not in the sequence are, because a wall of warnings nobody reads is how the one
  that mattered gets missed — measured at 35 warnings across 11 recommendations before scoping.
- **Consequences:** A preparation pack cannot describe a simulated capability as available, cannot
  script a demonstration from a capability with no authored demo path, and cannot answer a client
  question about a non-`implemented` capability without stating its status. Competitive positioning
  (§19) grounds in CogniX evidence and states that a claim about a named vendor requires market
  evidence the pack does not hold — it never describes a competitor's functionality and never asserts
  superiority, both of which would be fabrication about a third party.

---

### ADR-067: Gemini Model Selection Is One Governed Server-Side Configuration, and Nothing Falls Back Silently
- **Status:** Approved & **Implemented** (2026-08-21). Configuration in `config/gemini-models.ts`; enforcement in `tests/unit/run-atl06b-tests.ts` A7–A7e; published at `GET /api/v1/atlas/grounding`.
- **Context:** Model names were hard-coded independently in four places — `lib/gemini.ts`, the Atlas grounding adapter, the Atlas interpretation adapter and the live validation script — each carrying its own copy of `gemini-2.5-flash` and friends. When Google retired those aliases everything that talks to a model broke at once, and **every test kept passing**. The tests passed because they run against recorded fixtures, which is correct and deliberate: a live search cannot be made to return a stale source on demand, so refusal behaviour has to be proven against recordings. What a fixture cannot notice is that the model named in the request no longer exists. The defect was therefore invisible to the suite, invisible to the type checker, invisible to the build, and visible only as a failed round trip nobody could run because the credential was also missing — which is how a one-line configuration error consumed several phases of diagnosis.
- **Decision:** **One governed configuration, read by every call site.** `config/gemini-models.ts` is the single source of the model list. The grounding adapter, the interpretation adapter, the legacy `lib/gemini.ts` client and the live validation script all resolve from it **at call time**, so an operator changing the model does not restart to take effect and no name is written anywhere to drift. A model name appearing anywhere else in the Atlas provider layer is a defect, asserted directly against the source.
- **The default is a single verified model, not a chain.** `gemini-3.6-flash`, verified against the live API for both generation and Google Search grounding. The previous design carried a fallback chain and retried the next entry on a 404 — **that is how the defect hid**: a retired primary quietly became a working secondary until the secondary went too, and the only symptom was a slower first call. An operator may still configure a chain, deliberately and in one place, by setting `GEMINI_MODEL` to a comma-separated list; nothing falls back by default, and when a model is gone the error names the models tried and the variable that changes them, rather than reading as "the provider is down".
- **`GEMINI_MODEL` is server-side and is deliberately not a `NEXT_PUBLIC_*` variable.** A model name is not a secret, but a client that could choose the model could choose a weaker, cheaper or retired one. A malformed override **throws at the call that needs it, naming the variable** — it never resolves to an empty list, because "no model configured" and "no provider configured" must not look the same to a reader.
- **Scope note.** Only the model names moved in `lib/gemini.ts`. Its credential handling is unchanged and remains the legacy client-supplied-key path recorded as technical debt in ADR-044 Amendment A. The change does mean the CDI-01 drafting route (ADR-044), which reaches Gemini through that file, stops pointing at retired aliases — it was broken by the same defect.
- **Consequences:** A model retirement is now a one-line environment change in one place, and the failure that announces it names both. The fixture-backed suites keep their value and gain the check they were structurally unable to make: that the identifier being sent is the one the configuration governs. The residual exposure is unchanged and unavoidable — only a credentialed round trip can prove a model still exists, which is why `AC-ATL-06C-9` remains the gate it is.

---

### ADR-068: Capability Governance Flags and Blocks but Never Promotes, and Live-Provider Drift Is a Governed Subject in Its Own Right
- **Status:** Approved & **Implemented** (`ATL-07`, 2026-08-21). Engine in `lib/atlas/governance/`; command `npx tsx scripts/atlas-governance-check.ts`; verification record in `config/atlas-provider-verification.ts`.
- **Context:** Seven phases produced a corpus that is accurate on the day each record was written. Nothing was checking the day after. Two decay paths matter and they are not the same problem. **Internal decay** is a record describing code that has since moved, citing a file that has since gone, or claiming a lifecycle tier it never met — detectable from the repository. **External decay** is the estate's belief about a live provider going quietly out of date, and the `ATL-06` sequence proved the estate had no defence against it at all: three defects — a credential path no deployment provisioned, model aliases Google had retired, and a segment `startIndex` elided at its default value — all reached a credentialed run before anything failed, and **every fixture-backed suite stayed green through all three**. That is not a testing failure. Fixtures prove refusal behaviour a live search cannot be made to produce on demand, which is why they are the right instrument; they simply cannot notice that the contract they recorded has changed. Both instruments are needed and only one existed.
- **Decision, first half — automation flags and blocks; it never promotes.** The governance engine returns findings and nothing else. `GovernanceFinding` has no field capable of changing a record, the engine has **no write path**, and both are asserted directly rather than promised. This is `AC-ATL-07-3` made structural, and the reason is specific: an engine that could correct a record would eventually be asked to tidy one up, and the three maturity dimensions this programme spent seven phases keeping honest are exactly what a tidy-up smooths over. A record that fails its completeness tier is refused publication; the remedy text says in as many words that the automation will not lower the lifecycle state to make the finding go away.
- **Decision, second half — the live provider is a governed subject.** `config/atlas-provider-verification.ts` records what was verified, the commit it passed on, the **files whose change invalidates it**, and the individual wire-contract assumptions with the code that depends on each. Three checks run from that record, **none of which needs a credential**: drift when the provider layer moves ahead of the verified commit, staleness when the verification ages past its window even though nothing in the repository changed, and a blocking failure when the configured model is not the one that actually passed. The credentialed run is what refreshes the belief; these checks are what notice it has gone stale. An unanswerable drift question — a shallow clone, missing history — is **reported, never read as a pass**, because a governance check that reads silence as health is worse than no check.
- **Advisory before blocking, deliberately.** Every check declares one of two severities and the command is advisory by default, with `--enforce` as the switch and the CI job set to report only. Governance automation that blocks on the day it lands teaches contributors to route around it; which families become blocking is left as an owner decision with the current findings on the table. Two values, not a spectrum — a middle severity is where a check goes to be ignored.
- **Consequences:** The first real run found what seven phases had not: **20 of 38 records claim a lifecycle tier they do not meet**, all for the same missing field, which is a corpus-population gap rather than twenty separate mistakes; **12** carry no lifecycle state and are therefore exempt from the check that would otherwise govern them, reported rather than quietly passing; and cited source files have moved under 11 records since a human last read them. It also found a defect in itself on that run — a validation observation naming a deliberately retired surface was flagged as a broken citation — which is corrected by separating what a record claims as **current** from what it records as **observed**, because a check that cries wolf on a correct record is worse than no check. None of these findings changed a single record, which is the point.

---

### ADR-069: The Innovation Backlog Is a Separate Governed Register — An Idea Is Not a Work Package and Is Never a Capability
- **Status:** Approved (2026-08-22). Register: [`COGNIX_INNOVATION_BACKLOG.md`](../governance/COGNIX_INNOVATION_BACKLOG.md). Registered in [`MASTER_PLAN.md`](../governance/MASTER_PLAN.md). **Governance only — no runtime implementation.**
- **Context:** CogniX accumulated a body of agreed future innovation ideas — observation acquisition, signal trust progression, evidence maturity, market studies, domain packs, data connectivity, AI provider governance, a continuous campaign twin — with nowhere governed to record them. The two available homes were both wrong. Writing them into `MASTER_PLAN.md` would make unauthorised exploration read as committed delivery, which is the exact failure this programme spends most of its discipline preventing on screen. Registering them as `CAP-*` capabilities would put things CogniX cannot do into the registry that answers *what CogniX can do* — and `ATL-03`'s standing rule is that no record may claim a capability that does not exist. Leaving them unrecorded was the third option and the one actually in force, which is why an agreed idea could be raised twice and answered differently each time.
- **Decision:** **A third register, in the `IB-*` namespace, governing the space before authorisation.** The Master Plan governs authorised delivery. `EXPERIMENT_LIFECYCLE.md` governs the maturity of an experiment that exists. The Innovation Backlog governs whether an idea is worth exploring and whether it should be proposed for authorisation. The three do not overlap and none is a view of another.
- **Entry into `MASTER_PLAN.md` is the authorisation event, and nothing else is.** An idea at `Approved` has been approved *to be planned*; it has no work package, no scope and no schedule. The word was chosen deliberately and its limit is stated in the register, because "approved" is the stage most likely to be misread as permission to build.
- **The lifecycle borrows rather than coins.** `Research` is the same state, with the same exit criteria, as `EXPERIMENT_LIFECYCLE.md` §2.2. `Retired` is §3 unchanged. `Candidate Experiment` is the **handoff** into that lifecycle at `Concept`, not a competing maturity state — after which two governed objects legitimately coexist for one subject: a backlog idea on the authorisation track and an `EXP-*` entry on the maturity track. A fourth vocabulary for states that already have names is how a reader ends up unable to say which document is authoritative.
- **An idea is never a capability.** No `IB-*` entry is registered in `config/capabilities.ts`, appears in Atlas capability search, or is counted in the capability landscape. ADR-052's capability identity is unamended. This is also why the register is not surfaced by trivially reusing the Observability & Governance *Capability lifecycle* section: that section is backed by the `CAP-*` landscape, and pointing it at ideas would make the landscape stop being a partition of the registry.
- **Every entry cites existing governed identifiers only.** An entry may state what it builds on, depends on and could unlock using capabilities, contracts, work packages and rulings that already exist. It may not invent a status, a dependency, a capability name or an architecture to make itself read better. An idea whose value can only be stated in invented terms is not yet at `Research`.
- **Consequences:** A developer can now ask what the highest-priority innovation candidate is, what it depends on, whether it is authorised, and what the next work package would be, and get the same answer from the repository every time. The cost is a third register to keep honest, and one standing hazard: an idea that sits at `Approved` indefinitely looks committed to a casual reader. The register answers that structurally — the status board publishes the count of ideas at `Approved`, `Planned` and `In Delivery`, and today all three are zero.

---

### ADR-070: A Continuous Decision Twin Is Three Declared Series Over One Horizon, and Activation Binds the In-Flight Baseline to the Decision Contract
- **Status:** Approved as a **planning ruling** (2026-08-22) for `IB-13` — Continuous Live Decision Twin. **Not implemented. No work package is authorised by this ADR.** Recorded now because it constrains a design that does not exist yet, which is the only point at which such a ruling is cheap.
- **Context:** The Live Decision Twin today reads `archetype.decision_twin` — a static seeded literal — and calls no engine, while the pre-flight view beside it runs four governed engines on every configuration change. `telemetry_streams.length === current_day` in all seven archetypes, so the remaining horizon is not predicted-and-hidden; it is absent. There is no activation, `handleApplyInFlightAction` has an empty body, and the twin never reads the campaign configuration. Making that continuous means, unavoidably, putting predicted future days on the same axis as elapsed ones and letting a user change the campaign mid-flight. Both are exactly the operations that produce a fabricated number presented as a measured one.
- **Decision, part 1 — observed, simulated and predicted are three separately declared series, never one blended line.** They are distinct in the data and distinct on screen. A future prediction may never render or read as an observation, and a series may not be visually continuous across the boundary in a way that implies the same evidentiary status on both sides. `TimelineSeriesPoint` already carries `basis`, `strength` and `synthetic_demo` per point, and `EvidenceStrength` already orders `OBSERVED` above `DERIVED` above `SEEDED_ASSUMPTION` — the model that keeps them apart exists and must be used rather than bypassed with a fourth ad-hoc vocabulary. The existing prohibitions are unamended: no archetype datum may carry the governed bare `OBSERVED` class, claim a live feed, or reintroduce `confidence_pct`. A continuous twin over seeded data is still seeded data and says so.
- **Decision, part 2 — activation binds to `DecisionContract`, and no second baseline is created.** `activeMode` is local React state with two values and no transition semantics; it is not a governed baseline and must not become one by accretion. `DecisionContract` (`CDI-07A`) already is what activation needs: an immutable `decision_basis_digest` over sixteen canonical inputs, a content-derived `contract_digest`, an `ACTIVE`/`SUPERSEDED`/`WITHDRAWN` status, declared assumptions, triggers with `WATCH`/`DEGRADED`/`REASSESS_REQUIRED` effects, and `prediction_envelopes` carrying a tolerance declared **before** the outcome. The in-flight period is assessed against that contract's basis, and the seeded `is_decision_still_valid` string resolves to the governed `DecisionValidityState` rather than remaining a parallel vocabulary. A new "activated campaign" record competing with `DecisionContract` would give the estate two truths about what was decided.
- **Decision, part 3 — an intervention forks the trajectory; it never overwrites it.** The original pre-flight trajectory is bound to the contract digest and does not move. Activating an intervention records the intervention, adds a new trajectory, and reforecasts **only** `current_day + 1 … flight_days`; elapsed observed days are never recomputed. Contract supersession (`supersedes` / `superseded_by`) already models a decision that changed with both versions readable. Four states stay distinguishable — what we expected, what happened, what we now expect, what happens if we intervene — because that quadruple is the decision-intelligence concept the capability exists to demonstrate, and collapsing any two of them removes the reason to build it.
- **Decision, part 4 — a completed campaign produces an observation *candidate*, and no learning.** Capturing an outcome is not learning and may never be described as it. Admission stays governed by `ESF-6` (`source × context → authority`) and correspondence by `CDI-08` (`contract × observation → comparability`). The twin creates **no new origin of `synthetic_demo = false`**, and `learning_case_status` reads `NON_AUTHORITATIVE` for as long as that is true. Post-flight reconciliation **extends** `PredictionOutcomeComparison` and the `CampaignDecisionExperiment` comparison surface; it does not introduce a third history model.
- **Projected quantities are bounded by what the estate can already defend.** Demand and contribution project from `CDI-05` under `FLAT_RATE_IDENTITY`; deviation is against the activated contract's basis; uncertainty renders `TimelineConfidenceEnvelope` **with its `declared_horizon_uncertainty_profile` basis shown**, because a declared profile is not a calibrated interval. **Revenue is not added** — `CDI-05` publishes it as `NOT_AVAILABLE` with a `RequiredAuthoritativeInput`, and that refusal is correct. A stock *series* requires a declared depletion basis; `WP10-C` supplies scalars, and `scalar_annotations` exists precisely so a scalar is not drawn as a trend. Adding a quantity means declaring its basis first, never because a demonstration would look better with it.
- **Consequences:** The continuous twin becomes largely a **second consumer of `DecisionTimelineProjection`** rather than a new projection engine, and `POST_CAMPAIGN` — already structurally present and numerically empty — is the slot post-flight fills. One genuinely new governed concept is required and is deliberately small: `TimelineTrajectoryKind` today has two values (`COUNTERFACTUAL`, `INTERVENTION`) and cannot express an observed series or a mid-flight reforecast. That extension is the first thing the first work package must freeze, and it is why the recommended decomposition puts the timeline and activation work ahead of the intervention work rather than beside it.
