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
- **Status:** Approved — design frozen (ESF-6, 2026-08-16). Implementation not started.
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
- **Status:** Approved — design frozen (ESF-6, 2026-08-16). Implementation not started.
- **Context:** ADR-036 withheld `WITHIN_DECLARED_ENVELOPE` until pre-declaration is witnessed by "an instant the caller does not author," and CDI-08 recorded it as structurally unreachable pending ESF-6. Reviewing that boundary against code exposed **D-5**: `validateDecisionContract` (`campaign-decision-contract-model.ts:1081`) validates `pre_declaration_witness` only as *one of two literals*, so **a caller may declare `'SERVER_REGISTRATION_RECEIPT'` on its own contract**; `campaign-learning-loop-engine.ts:692` then sets `within_declared_envelope = true` and publishes `WITHIN_DECLARED_ENVELOPE`. This is a fourth fail-open of the class the CDI-08 sequencing rule named (R2, R3, R6) — inert only because nothing reaches `AUTHORITATIVE_EXTERNAL`, and **armed by ESF-6 itself**.
- **Decision (owner ruling E3):** The witness is a **server-derived output, never a contract input**. On any caller-supplied contract `pre_declaration_witness` **must equal `'NONE'`** (new invariant `C-INV-ENV-6`, fail-closed); the union member `'SERVER_REGISTRATION_RECEIPT'` is retained in the type but becomes unconstructible by a caller. The witness is evaluated at comparison time and surfaced on the derived `PredictionError.declared_envelope` — an output field, outside every digest.
- **Why it cannot be a contract field:** the envelope is covered by `contract_digest` (Z1), and a receipt is issued *after* the contract exists and its digest is fixed. Writing the receipt back into the envelope would change the digest the receipt was issued for — circular, and it would break every CDI-07B artefact bound on that digest.
- **Decision (owner ruling E4) — ordering by sequence, not clock:** every receipt carries `sequence`, drawn from a **per-tenant strictly monotonic integer counter**. Precedence is the integer comparison `contract_receipt.sequence < observation_receipt.sequence`. A server wall-clock reading would satisfy Z2's letter while violating the standing rule that wall-clock values are never decision logic or ranking inputs, and would make the witness non-deterministic and untestable. Timestamps are recorded on receipts for audit and display and are **never read** by any predicate; `Date.now()` must not appear in receipt issuance, witness evaluation or admission. **Lifetime invariant:** counter and receipt store share one lifetime — a receipt is never reconstructible after the counter it was drawn from is lost, so a restart empties both, every lookup misses, and the witness fails closed to `NONE`, which is the correct answer rather than a degradation.
- **The witness conjunction, fail-closed:** **W1** a `CONTRACT_REGISTRATION` receipt exists for the contract under this tenant; **W2** `receipt.contract_digest === computeContractDigest(contract)`, proving envelope content was immutable since registration; **W3** every observation backing the row carries a resolving admission receipt; **W4** `contract_receipt.sequence < min(observation_receipt.sequence)`, strict; **W5** the stored envelope's own witness is `'NONE'`. Any failure ⇒ `NONE`, `within_declared_envelope` left **unset**, and `within_withheld_reason` naming **which condition failed** rather than a generic sentence.
- **W4 is the load-bearing one.** W2 alone proves non-edit, not precedence — exactly the point ADR-036 makes about `created_as_of`. W4 is what proves the observed outcome was not used to define the envelope.
- **Z2's asymmetry is preserved exactly:** `OUTSIDE_DECLARED_ENVELOPE` is computed from the signed error against the declared bounds and **no receipt participates**. A revoked source, an emptied receipt store or a failed W4 must still yield `OUTSIDE` on an adverse error. Adverse evidence needs no witness because post-hoc authorship carries no incentive; favourable evidence does, or it is self-congratulation with a hash on it.
- **Consequences:** `deriveComparisonVerdict` needs **no change** — it already gates `WITHIN` on `within_declared_envelope === true`. `WITHIN_DECLARED_ENVELOPE` becomes the one verdict ESF-6 newly makes reachable, which is what keeps ESF-6 strictly narrowing. Implementation sequencing is binding: `C-INV-ENV-6` lands **before** the admission predicate and the authority corrections, because arming authority while the witness is still caller-declared would, for the duration of that gap, let a caller certify its own accuracy over authoritative evidence. Any existing fixture constructing a contract with `'SERVER_REGISTRATION_RECEIPT'` will now be rejected — expected and correct, since that fixture was exercising D-5.
