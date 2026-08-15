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
