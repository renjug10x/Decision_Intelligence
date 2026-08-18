# COGNIX MASTER IMPLEMENTATION PLAN & ROADMAP (PHASES 0 – 11)

**Document Status:** Approved & Authoritative
**Version:** 1.0.0
**Effective Date:** August 2026
**Owner:** CogniX Transformation Steering Group

---

## Executive Summary & Program Structure

This document defines the comprehensive master roadmap for transforming the retail Decision Intelligence POC into **CogniX**, G10X's Enterprise Innovation Lab.

The roadmap is structured across 12 sequential phases (Phases 0 through 11). Implementation is grouped into an **Immediate Implementation Wave** (Phases 0–6 / Work Packages WP1–WP6) followed by advanced lab capabilities (Phases 7–11).

```text
[ Phase 0: Concept Freeze ] ──> [ Phase 1: Identity Neutralisation ] ──> [ Phase 2: Portfolio ]
                                                                             ↓
[ Phase 5: Decision Ripple ] <── [ Phase 4: Commitment Intel ] <── [ Phase 3: Canvas ]
             ↓
[ Phase 6: Curiosity Engine ] ──> [ Phases 7-11: Advanced Memory, IP, Packs & Ops ]
```

---

# PHASE 0 — CONCEPT FREEZE & GOVERNANCE FOUNDATION

- **Objective:** Re-position the codebase as G10X Enterprise Innovation Lab. Freeze legacy retail POC scope.
- **Rationale:** Establish clear governance, charter, and operating principles before writing code.
- **Dependencies:** None.
- **Scope:** Governance docs (`COGNIX_CHARTER.md`, `COGNIX_PRINCIPLES.md`, `EXPERIMENT_MODEL.md`, `EXPERIMENT_LIFECYCLE.md`, `IP_GOVERNANCE.md`, `UX_DESIGN_PRINCIPLES.md`, `DEMO_OPERATING_MODEL.md`, `ARCHITECTURE_DECISIONS.md`, `ARCHITECTURE.md`, `MASTER_PLAN.md`).
- **Non-Scope:** Production UI modifications.
- **Technical Work Packages:** WP0-Gov — Document Creation & Git Continuity.
- **UX Work:** Definition of G10X visual design system tokens.
- **Acceptance Criteria:** All 10 governance documents created and internally consistent.
- **Test Requirements:** None (Documentation phase).
- **Exit Gate:** CogniX purpose explained unambiguously without mentioning Lidl or selling BI software.
- **Downstream Dependencies:** Unlocks Phase 1.

---

# PHASE 1 — IDENTITY AND NEUTRALISATION (WORK PACKAGE WP1)

- **Objective:** Remove all customer-specific (Lidl) logos, colors, wording, and hard-coded retail dependencies. Introduce CogniX identity, G10X brand alignment, and runtime industry/client context configuration.
- **Rationale:** Ensure the application is client-neutral and ready for any C-suite executive demonstration.
- **Dependencies:** Phase 0.
- **Scope:**
  - `package.json`: Rename project to `@g10x/cognix-innovation-lab`.
  - `app/layout.tsx`: Update page title to `CogniX — G10X Enterprise Innovation Lab`.
  - `app/globals.css`: Replace `--lidl-blue/yellow/red` with G10X Slate neutrals & Precision Blue palette.
  - `components/Sidebar.tsx` & `app/page.tsx`: Replace headers and logos with clean G10X branding.
  - Neutralise all hardcoded strings in components (`ArchitectureExplorer.tsx`, `BriefingCentre.tsx`, etc.).
  - Introduce `config/industry-packs.ts` & runtime client context switcher.
- **Non-Scope:** Building new experiment engines (Phases 4–5).
- **User Stories:**
  - *G10X Innovation Consultant:* As a consultant, I want CogniX to be client-neutral so that I can present it to any enterprise client without seeing another retailer's logo.
- **Technical Work Packages:** WP1.1 (CSS Theme), WP1.2 (Brand Neutralisation), WP1.3 (Client Context Config).
- **UX Work:** Clean slate palette, spacious layout, G10X logo integration.
- **Acceptance Criteria:** Zero occurrences of Lidl logos/colors/text; clean G10X branding across all screens.
- **Test Requirements:** `npm run build` must compile clean; visual audit of all routes.
- **Exit Gate:** Application successfully rebranded as CogniX with zero client dependencies.
- **Downstream Dependencies:** Unlocks Phase 2.

---

# PHASE 2 — INNOVATION PORTFOLIO (WORK PACKAGE WP2)

- **Objective:** Create the primary landing experience for CogniX: the **Innovation Portfolio**.
- **Rationale:** Introduce CogniX as an innovation environment within the first 30 seconds of an executive demo.
- **Dependencies:** Phase 1.
- **Scope:**
  - Build `components/InnovationPortfolio.tsx`.
  - Display experiment cards for:
    - **Commitment Intelligence** (Prototype)
    - **Decision Ripple Intelligence** (Prototype)
    - **Enterprise Memory** (Concept)
    - **Opportunity Intelligence** (Concept)
  - Card metadata: Name, Provocative Question, Business Problem, Maturity Badge, IP Badge, Applicable Industries, Open Action CTA.
- **Non-Scope:** Deep scenario execution inside cards (handled in Phase 3–5).
- **User Stories:**
  - *Innovation Executive:* As an executive, I want to see active lab experiments immediately so that I understand what novel ideas are being prototyped.
- **Technical Work Packages:** WP2.1 (Portfolio Grid Component), WP2.2 (Experiment Registry Binding).
- **UX Work:** Card grid layout, maturity badge styling, hover state micro-animations.
- **Acceptance Criteria:** Landing on CogniX immediately presents the Innovation Portfolio grid.
- **Test Requirements:** Functional testing of card navigation and responsive grid layout.
- **Exit Gate:** A first-time executive can grasp CogniX's purpose in under 30 seconds.
- **Downstream Dependencies:** Unlocks Phase 3.

---

# PHASE 3 — REUSABLE INNOVATION CANVAS (WORK PACKAGE WP3)

- **Objective:** Build a standardized, reusable **Innovation Canvas** component (`components/ExperimentCanvas.tsx`).
- **Rationale:** Provide a consistent structural framework for explaining every CogniX experiment.
- **Dependencies:** Phase 2.
- **Scope:**
  - Standardized sections: The Question, Business Problem, Industry Today, CogniX Experiment, Interactive Demonstration Area, Business Value, Intelligence Used, Evidence & Confidence, What We Learned, Maturity & IP Metadata.
  - Integration with Experiment Registry.
- **Non-Scope:** Hardcoding individual experiment pages; canvas must be dynamically driven.
- **User Stories:**
  - *G10X Innovation Owner:* As an owner, I want a consistent canvas for all experiments so that new prototypes can be added via configuration.
- **Technical Work Packages:** WP3.1 (Canvas Layout Component), WP3.2 (Evidence & Confidence Drawer).
- **UX Work:** Accordion tabs, evidence panel, confidence score indicators.
- **Acceptance Criteria:** Any registered experiment renders seamlessly within the Canvas.
- **Test Requirements:** Render test for all experiment types.
- **Exit Gate:** Canvas successfully hosts Commitment & Ripple experiments.
- **Downstream Dependencies:** Unlocks Phase 4.

---

# PHASE 4 — COMMITMENT INTELLIGENCE (WORK PACKAGE WP4)

- **Objective:** Implement the first flagship interactive experiment: **Commitment Intelligence**.
- **Rationale:** Demonstrate how interconnected enterprise commitments fail even when forecasts are accurate.
- **Dependencies:** Phase 3.
- **Core Question:** *"What if the enterprise could detect a broken promise before the customer experiences it?"*
- **Scope:**
  - Interactive Commitment Chain visualization:
    `Marketing Promotion → Demand → Supplier Capacity → Inventory → Fulfilment → Delivery → Customer Promise`
  - Scenario simulation: Marketing plans +22% demand surge; supplier capacity constrained at +10%; delivery risk spikes to 42%.
  - Flagship Insight Generator: *"The forecast hasn't failed (+22% accurate). The business commitments surrounding it are incompatible."*
  - Recommended interventions & financial risk calculation.
- **Non-Scope:** Real-time SAP/ERP live integration (demo uses causal synthetic dataset).
- **User Stories:**
  - *Operations & Marketing Leaders:* As leaders, we want to see where our commitment chains break so that we can intervene before delivery failure.
- **Technical Work Packages:** WP4.1 (Commitment Graph Engine), WP4.2 (Interactive Chain UI), WP4.3 (Drift & Exposure Calculator).
- **UX Work:** Node graph with status indicators (Green/Amber/Red drift), slider controls, evidence drawer.
- **Acceptance Criteria:** Executing the promo scenario dynamically updates drift, financial exposure, and broken commitment highlight.
- **Test Requirements:** Verification of mathematical consistency in financial exposure & drift values.
- **Exit Gate:** Polished 3-minute executive walkthrough ready.
- **Downstream Dependencies:** Unlocks Phase 5.

---

# PHASE 5 — DECISION RIPPLE INTELLIGENCE (WORK PACKAGE WP5)

- **Objective:** Implement the second flagship experiment: **Decision Ripple Intelligence**.
- **Rationale:** Allow executives to simulate strategic business choices and observe 1st, 2nd, and 3rd order impacts across functions.
- **Dependencies:** Phase 4.
- **Core Question:** *"What happens everywhere else when we make this decision?"*
- **Scope:**
  - Action Selector: E.g., *"Increase Promotional Spend by +15%"*, *"Delay Supplier Payment by 14 Days"*, *"Reduce Regional DC Buffer Stock by 20%"*.
  - Multi-order Ripple Propagation Grid:
    - *1st Order:* Direct Revenue Surge (+18%)
    - *2nd Order:* DC Overtime Spike (+35%), Stockouts in Regional Stores
    - *3rd Order:* Supplier Penalty Fees, Margin Compression (-2.4%)
  - Alternate Scenarios: Full Campaign vs. Regional Campaign vs. Reduced Duration.
- **Non-Scope:** Full multi-variable Monte Carlo simulation engine.
- **User Stories:**
  - *Business Executive:* As a CEO/COO, I want to rehearse strategic decisions so that I understand cross-functional side effects before committing budget.
- **Technical Work Packages:** WP5.1 (Ripple Engine Core), WP5.2 (Multi-Order Propagation Visualiser), WP5.3 (Scenario Comparison Matrix).
- **UX Work:** Interactive decision sliders, order depth indicators (1st, 2nd, 3rd), financial impact breakdown.
- **Acceptance Criteria:** Adjusting decision sliders updates multi-order impacts deterministically.
- **Test Requirements:** Multi-scenario regression test.
- **Exit Gate:** Interactive decision rehearsal demo fully operational.
- **Downstream Dependencies:** Unlocks Phase 6.

---

# PHASE 6 — CURIOSITY EXPERIENCE (WORK PACKAGE WP6)

- **Objective:** Build **Questions Worth Asking** proactive curiosity engine.
- **Rationale:** Transition UX from passive monitoring to active executive curiosity.
- **Dependencies:** Phase 5.
- **Scope:**
  - Build `components/QuestionsWorthAsking.tsx`.
  - Prominent prompt cards (e.g. *"Why is demand increasing while marketing spend declines?"*, *"Which commitments contradict each other?"*).
  - Clicking a prompt opens relevant experiment, evidence, and Gemini executive narrative synthesis.
- **Non-Scope:** Unbounded open-domain general search.
- **User Stories:**
  - *Innovation Executive:* As an executive, I want CogniX to highlight unexpected questions so that I discover blind spots effortlessly.
- **Technical Work Packages:** WP6.1 (Curiosity Prompt Registry), WP6.2 (Gemini Evidence Narrative Integration).
- **UX Work:** Prompt cards, violet accent styling, seamless transition to experiment evidence.
- **Acceptance Criteria:** Clicking any curiosity card smoothly navigates to the underlying evidence & experiment canvas.
- **Test Requirements:** API integration test for Gemini synthesis.
- **Exit Gate:** CogniX initiates executive conversation without user typing a query.
- **Downstream Dependencies:** Unlocks Phases 7–11.

---

# PHASE 7 — ENTERPRISE MEMORY FOUNDATION (COMPLETED)
- **Status:** Implemented & Validated
- **Objective:** Implement organizational memory logging prior decision situations, interventions, and actual outcomes.
- **Scope:** Structured `EnterpriseMemoryCase` schema (`Situation`, `Decision`, `Expected Outcome`, `Actual Outcome`, `Confidence`, `Intervention`, `Business Result`, `Lessons Learned`, `Provenance`), interactive case search, and contextual link (*"Have we seen this before?"*) from Demonstration Solutions.

---

# PHASE 8 — OPPORTUNITY INTELLIGENCE (COMPLETED)
- **Status:** Implemented & Validated
- **Objective:** Proactively discover value-creation opportunities (upside) by fusing demand acceleration, inventory headroom, and supplier capacity signals.
- **Scope:** Opportunity detection solver (`Signals → Constraints → Opportunity → Estimated Value → Recommended Action → Confidence`), net margin calculator, and direct execution handoff to Demonstration Solutions.

---

# PHASE 9 — ORGANISATIONAL LEARNING INTELLIGENCE & CAPABILITY REINTEGRATION (COMPLETED)
- **Status:** Implemented & Validated
- **Objective:** Elevate the Resolution Pattern Library into pervasive **Organisational Learning Intelligence** powered by **Enterprise Learning Patterns** (`Observe → Learn → Match → Reuse`). Reintegrate **Execution Briefing** and **Contract Verification** capabilities.
- **Scope:**
  - `EnterpriseLearningPattern` canonical model & registry (`config/patterns.ts`).
  - Explicit telemetry distinction: **Situation Similarity**, **Pattern Confidence**, **Intervention Success Rate**.
  - Pervasive contextual pattern embedding across all solutions and experiments.
  - Reintegrated `ExecutionBriefing` modal/drawer (`Situation`, `Why Now`, `Action`, `Owner`, `Dependencies`, `Time Horizon`, `Outcome`, `Confidence`, `Pattern`).
  - Reintegrated `ContractVerification` proof layer (`CTR-FD-2024-001` SLA breach threshold check, `CTR-TP-2023-008` Backup Activation).

---

# PROGRAMME 10 — ADAPTIVE INTELLIGENCE & SCALABLE SERVICE ARCHITECTURE (PLANNED)

- **Status:** Planned & Governance Approved (Not Implemented)
- **Objective:** Transform CogniX into an API-first, event-aware, multi-tenant adaptive intelligence platform composed of independently evolvable business capabilities.
- **Strategic Principles:**
  - *Screens Do Not Own Intelligence. Domain Services Own Intelligence.*
  - *Every Meaningful Interaction Is Observable.*
  - *API-First Contracts (`Domain Model → API Contract → Event Schema → Implementation`).*
  - *Decompose by Business Capability (Domain, Data, Security, Scaling).*
  - *Shared Enterprise Reality (One Enterprise World + Shared Decision State).*
  - *Strict Intelligence Separation (Deterministic Rules vs ML/Statistical vs Optimisation vs GenAI).*

### Planned Phases / Workstreams (Phases 10A – 10M)

#### Phase 10A — Service Architecture Foundation
Establish initial 7 deployables: `cognix-web`, `cognix-core`, `cognix-world`, `cognix-decision`, `cognix-learning`, `cognix-intelligence`, `cognix-governance`. PostgreSQL service schemas, Redis Streams/NATS event transport.

#### Phase 10B — Synthetic Enterprise World
Temporal scenario engine modeling state across `T-90` to `T+30` for 12 causal scenario families (Promotion Surge, Weather Demand, Supplier Breach, Competitor Matching, Perishable Waste, Category Cannibalisation, DC Overtime, Regional Imbalance, etc.).

#### Phase 10C — Tenant-Specific Enterprise Worlds
Multi-tenant isolation support ensuring distinct operating environments, risk appetites, waste tolerances, and ranked interventions per tenant context.

#### Phase 10D — Journey Telemetry
Observable client event stream emitting canonical telemetry events (`SESSION_STARTED`, `SCENARIO_CHANGED`, `PATTERN_MATCHED`, `RECOMMENDATION_ACCEPTED`, `DECISION_EXECUTED`, `OUTCOME_OBSERVED`) with standard headers (`tenant_id`, `user_id`, `session_id`, `correlation_id`).

#### Phase 10E — Shared Decision State
Cross-solution state orchestrator ensuring decisions in one CogniX experience (e.g. backup supplier activation) propagate state changes across Inventory, Commitment, Decision Ripple, and Opportunity views.

#### Phase 10F — Pattern Matching ML
Machine learning serving layer performing statistical similarity scoring across situation signatures to retrieve Top-K Enterprise Learning Patterns.

#### Phase 10G — Outcome Prediction
Predictive ML models calculating probable service-level, margin, waste, and availability consequences for candidate interventions.

#### Phase 10H — Intervention Ranking
Dynamic utility ranker scoring candidate interventions against tenant objectives, commercial constraints, and historical precedent outcomes.

#### Phase 10I — Intelligence Moments
Contextual notification engine surfacing un-prompted intelligence when scenario adjustments alter risk/opportunity by $\ge 15\%$ or trigger new pattern matches ($\ge 85\%$).

#### Phase 10J — Adaptive Decision Profile
Behavioral learning engine modeling user evaluation preferences (margin vs customer availability). Enforces strict guardrail: personalization alters ranking/presentation, never source facts or evidence.

#### Phase 10A — Service Architecture & API-First Foundation [COMPLETED]
API-first OpenAPI 3.1 contract (`docs/openapi/world-v1.yaml`), seed/scenario extraction, and `cognix-world` Docker microservice.

#### Phase 10B — Journey Telemetry Foundation [COMPLETED]
Canonical OpenAPI 3.1 contract (`docs/openapi/journey-v1.yaml`), event schema validation, `packages/contracts` event catalogue, non-blocking `lib/journey-client.ts`, REST ingestion/query endpoints (`/api/v1/journey/*`), diagnostic ring-buffer store, and comprehensive UI instrumentation across Shell, Portfolio, Questions, Commitment, Ripple, Memory, Opportunity, and Solutions.

#### Phase 10C — Shared Decision State Foundation [COMPLETED]
Canonical OpenAPI 3.1 contract (`docs/openapi/decision-state-v1.yaml`), transport-neutral contract model (`packages/contracts/src/decision-state-model.ts`), replaceable store abstraction (`lib/decision-state-store.ts`), optimistic concurrency versioning (`v1 → v2`), tenant/session isolation, and cross-solution deterministic propagation across Promotion, Demand & Forecast, Commitment, Inventory, Decision Ripple, Opportunity, Category, Contract Verification, and Execution Briefing.

#### Phase 10D — Memory & Learning API Extraction [COMPLETED]
Canonical OpenAPI 3.1 contract (`docs/openapi/memory-learning-v1.yaml`), transport-neutral contract schemas (`packages/contracts/src/memory-model.ts`, `packages/contracts/src/learning-pattern-model.ts`), replaceable repository abstractions (`IMemoryRepository`, `ILearningPatternRepository`), standalone `cognix-learning` Docker microservice (port 8082), same-origin BFF proxy gateway (`/api/v1/memory/*`, `/api/v1/learning-patterns/*`), 3-metric preservation (`situation_similarity`, `pattern_confidence`, `intervention_success_rate`), bidirectional relationship lookups (`Memory ↔ Pattern`), static import elimination, and visual component integration.

---

### Cross-Cutting Capability — Enterprise Signal Fabric (ESF)
A canonical, source-independent mechanism for representing business, customer, operational, and market signals, strictly separated from user Journey Telemetry.

- **ESF-1 — Enterprise Signal Contract & Synthetic Signal Foundation [COMPLETED]:** Canonical `EnterpriseSignal` OpenAPI 3.1 & TypeScript contract schema, taxonomy, source classification, deterministic generator in `cognix-world`, same-origin BFF proxy (`/api/v1/signals/*`), developer diagnostic view, and Shared Decision State integration. *Dependencies: WP10-A, WP10-C.*
- **ESF-2 — Dynamic Signal Simulation [COMPLETED]:** Deterministic simulation engine evolving enterprise signals dynamically over time based on active scenario, Commercial Intent, Shared Decision State, and selected interventions (`Intent Registered → Engagement Accelerates → Slot Pressure Emerges → Demand Acceleration Materialises`). *Dependencies: ESF-1.*
- **ESF-3 — External Signal Connector Contract [COMPLETED]:** Provider-neutral connector abstraction enabling planning, commerce, weather, events, competitive intelligence, operational telemetry, and demographic feeds to publish into the canonical `EnterpriseSignal` contract via envelope normalisation. Vendor platforms remain reference adapters only. *Dependencies: ESF-1.*
- **ESF-4 — Signal Quality, Confidence & Provenance:** Signal reliability metrics, freshness tracking, completeness scoring, and source classification (`synthetic_world`, `commerce_telemetry`, `planning_system`, `supplier_feed`). *Dependencies: ESF-6, ESF-2, ESF-3 — admission precedes grading (G4).*
- **ESF-5 — Learned Signal Behaviour:** ML phase scoring signal sequences, precursor patterns, and signal-to-outcome correlations against historical memory precedents. *Dependencies: WP10-D, ESF-4, Phase 10F.*
- **ESF-6 / Y3a — Attested Observation Admission [DESIGN FROZEN 2026-08-16]:** Server-side attested source registry, deterministic server-issued receipts, and the admission predicate `source × context → authority`. The only origin of `synthetic_demo = false` in the estate. Supersedes `Y3`; specified in full in the CDI section below. *Dependencies: ESF-3, CDI-08.*

---

# COGNIX MASTER IMPLEMENTATION PLAN & ROADMAP (PHASES 0 – 11)

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** CogniX Transformation Steering Group

---

### Core Innovation Capability — Campaign Decision Intelligence (CDI)
A transformational decision capability discovering whether, what, where, when, and how to intervene, understanding cross-functional consequences, monitoring decision half-life, and closing the operational learning loop.

#### Work Package Dependency Classification Semantics:
- **HARD:** Implementation cannot proceed without this prerequisite.
- **INTEGRATION:** Capability develops independently, but requires this dependency for end-to-end cross-system flow.
- **ENHANCEMENT:** Dependency enriches intelligence/telemetry but does not block initial delivery or validation.

#### CDI Work Package Specifications:
- **CDI-01 — Campaign Decision Canvas & Intent Model [COMPLETED]:** Progressive 4-area input framework (`CampaignIntent`, `BaselineObjective`, `AudienceMarket`, `DecisionContext`).
  - *Hard Dependencies:* `WP10-C` (Shared Decision State), `IFI-01` (Commercial Intent Store).
  - *Integration Dependencies:* None.
  - *Enhancement Dependencies:* `ESF-1`.
- **CDI-02 — Counterfactual Baseline & Causal Campaign Engine [COMPLETED]:** Domain separation of Current Baseline vs Expected Without Intervention vs Predicted With Intervention. Causal demand engine.
  - *Hard Dependencies:* `CDI-01` (`CampaignIntent` contract).
  - *Integration Dependencies:* `ESF-2` (Dynamic Signal Simulation).
  - *Enhancement Dependencies:* None.
- **CDI-03 — Opportunity Window & Micro-Market Opportunity Graph [COMPLETED]:** Date discovery mode ("Find the best window") and micro-market store graph evaluation. Can proceed in parallel with CDI-02 once CDI-01 contract is frozen.
  - *Hard Dependencies:* `CDI-01` (`CampaignIntent` contract).
  - *Integration Dependencies:* `WP10-A` (Enterprise World Store Data).
  - *Enhancement Dependencies:* None.
  - *Additive CDI-02 hook:* optional `resolved_temporal_uplift_pp` on causal evaluation replaces FIND_BEST_WINDOW timing-placeholder dampener when a window is resolved.
- **CDI-04 — Campaign Decision Readiness & Resilience [COMPLETED]:** 6-dimension evaluation producing explainable readiness states (`GO`, `CONDITIONAL GO`, `REVIEW`, `DO NOT PROCEED`). Integrates pre-mortem resilience with Decision Ripple rather than creating a parallel risk engine.
  - *Hard Dependencies:* `CDI-02` (`CounterfactualBaseline` & `CausalDemandContribution`).
  - *Integration Dependencies:* `CDI-03` (`MicroMarketOpportunity`), `Decision Ripple Engine` (read-only `DecisionDerivedImpacts` / `calculateDerivedImpacts()` — no standalone ripple engine).
  - *Enhancement Dependencies:* None.
  - *Owner rulings:* U1 (thresholds centralised; V4 = structural infeasibility); U2 (Commercial objective-aware; economic tolerance).
- **CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition [COMPLETED]:** Contextual multi-lens timeline (`DecisionTimelineProjection`) with progressive driver decomposition (`What? → Why? → Evidence → What If?`). Temporal rendering of one closed CDI-02 evaluation under `FLAT_RATE_IDENTITY` only; ambient parity on both trajectories; Revenue `NOT_AVAILABLE`; `POST_CAMPAIGN` structurally present and numerically empty.
  - *Hard Dependencies:* `CDI-02` (`CounterfactualBaseline` & `CausalDemandContribution`).
  - *Integration Dependencies:* `CDI-04` (`DecisionReadinessAssessment`).
  - *Enhancement Dependencies:* `CDI-03` (`OpportunityWindowEvaluation`).
  - *Owner rulings:* U1 (`FLAT_RATE_IDENTITY`); U2 (Revenue unavailable until realised unit price); U3 (`POST_CAMPAIGN` empty); U4 (band-only confidence on primary surface).
  - *Evidence:* `docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_DESIGN_GATE.md` + `COGNIX_CDI_05_DECISION_TIMELINE_REPORT.md`; ADR-032; CDI-05 68/68 with CDI-04 49/49, CDI-03 31/31, CDI-02 30/30, CDI-01 21/21 unchanged. Independently reconciled 2026-08-15 — six defects corrected (post-campaign envelope assertion, two pre-campaign lens fabrications, RJ3 artefact binding, an unfalsifiable guard, undrawn chart obligations), each with a permanent regression test.
  - *Naming note:* Artefact is `DecisionTimelineProjection` (planning/MASTER_PLAN earlier draft name `DemandTimelineProjection` superseded — docs reconciliation only).
- **CDI-06 — Multi-Objective Outcome Frontier & Competing Strategies [COMPLETED]:** Two-axis Pareto frontier over real CDI-02 evaluations (`OutcomeFrontier`). ARF-A `SIGNALS_EXCLUDED` only; ARF-B contracted `UNAVAILABLE`. Scenario 0 mandatory at (0, £0). Non-promotion `PRESENTED_NOT_RANKED`. Selection via declared constraints only — more than one survivor ⇒ `CHOICE_REQUIRED`. No weights, utilities, or LLM ranking.
  - *Hard Dependencies:* `CDI-02` (`CausalDemandContribution`), `CDI-05` (`DemandDecomposition`).
  - *Integration Dependencies:* `CDI-04` (`DecisionReadinessAssessment`).
  - *Enhancement Dependencies:* Gemini AI narrative synthesis wrapper (out of scope for core frontier; none used).
  - *Owner rulings:* U1 (ARF-A only); U4 (non-promotion presented not ranked).
- **CDI-07A — Decision Contract & Decision Half-Life [COMPLETED]:** Immutable `DecisionContract` binding the exact decision basis by reference, digest and verbatim snapshot; explicit assumptions and reconsideration triggers; and validity assessment against `ESF-1`/`ESF-2` signals. Decision Half-Life describes how the evidential basis of a decision weakens or remains valid as assumptions and signals evolve, represented through validity states (`STABLE`, `WATCH`, `DEGRADED`, `REASSESS_REQUIRED`, `INDETERMINATE`) and evidence-triggered reassessment. Quantitative duration is unavailable until calibrated temporal evidence exists — no countdown, expiry or decay curve.
  - *Hard Dependencies:* `CDI-01` (`CampaignIntent`), `CDI-06` (`OutcomeFrontier`).
  - *Integration Dependencies:* `WP10-C` (Shared Decision State) — reference only, via `decision_contract_ref` and an idempotent `REGISTER_DECISION_CONTRACT`.
  - *Enhancement Dependencies:* `ESF-1`/`ESF-2` signal feeds.
  - *Owner rulings:* W1 (minimal additive WP10-C reference binding); W2 (validity states, no quantitative duration); decision-basis integrity (immutable content-derived `decision_basis_digest`); both creation routes preserved, `CHOICE_REQUIRED` never silently contracts.
  - *Evidence:* `docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md` + `COGNIX_CDI_07A_DECISION_CONTRACT_REPORT.md`; ADR-034; CDI-07A 155/155 (63 ACs plus RV-1…RV-8 reconciliation regressions) with CDI-01…06 unchanged (21/36/31/49/70/93). Independently reconciled 2026-08-15 — eight defects corrected, led by a fabricated-`STABLE` path and a fabricated `WORLD_DRIVEN` signal attribution.
  - *API note:* Validity is `POST /api/v1/campaigns/decision-contract/[id]/validity` (computation over caller context) — not a resource `GET /api/v1/campaigns/validity`.
- **CDI-07B — Campaign Pre-Mortem, Prediction vs Reality & Closed Learning Loop [COMPLETED]:** Three separate artefacts (`CampaignPreMortem`, `PredictionOutcomeComparison`, `LearningCandidate`), each bound to a `DecisionContract` by `contract_id` **and** `contract_digest`, none of which mutates the contract. Pre-mortem enumerates failure modes from declared evidence with no likelihood/probability/impact scoring. Prediction vs Reality reports error only on `LIKE_FOR_LIKE` grain+basis matches; attributable vs gross is refused (AC-20); no `SUCCESS`/`FAILURE` verdict. Learning eligibility is an eight-condition conjunction; ineligible candidates retained (X4); `N > 1` semantic with `N = 3` uncalibrated demo policy only (X3); no automatic pattern promotion; WP10-D remains the only memory store.
  - *Hard Dependencies:* `CDI-07A` (`DecisionContract`), `WP10-D` (`cognix-learning`).
  - *Integration Dependencies:* `ESF-3` (External Signal Connectors).
  - *Owner rulings:* X1 (CDI-07A world-driven source admissibility corrected as a predicate change; synthetic provenance never establishes `WORLD_DRIVEN`); X2 (`decision_contract_ref` on `EnterpriseMemoryCase`, reference only); X3 (contract semantic `N > 1`, initial `N = 3` as an uncalibrated configurable demonstration policy, not statistical significance); X4 (ineligible learning candidates retained, never promoted).
  - *Evidence:* `docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_DESIGN_GATE.md` + `COGNIX_CDI_07B_LEARNING_LOOP_REPORT.md`; ADR-035; CDI-07B 232/232 (55 ACs plus RB-1…RB-8 reconciliation regressions) with CDI-01…07A unchanged (21/36/31/49/70/93/155). Independently reconciled 2026-08-15 — eight defects corrected, led by a path that let a caller-supplied comparison decide its own learning eligibility and register synthetic evidence into WP10-D as a real-world precedent.
  - *Baseline truth:* no eligible `LearningCase` is producible at this baseline and no memory case is registered on the learning path. LE-3 (composite contracted grain vs single-entity observation), LE-4 (every ESF-3 connector is synthetic) and LE-7 (no declared prediction envelope) all block. The loop closes when an authoritative non-synthetic observation at the contracted grain exists; `N` is never approached and `N = 3` remains an unexercised uncalibrated demonstration policy.
- **CDI-08 — Observation Correspondence & Prediction Envelope Foundation [COMPLETED]:** The deterministic predicate `contract × observation → comparability`. Answers whether an observation addresses the decision that was contracted, and against what tolerance. Composite contracted grain resolved by a single observation carrying a declared composite grain key with exact token identity on every contracted dimension (LE-3); a declared prediction envelope on the CDI-07A `DecisionContract` (LE-7); metric ↔ `signal_type` correspondence against a closed declared table (R2); derived-or-refused quantity basis (R1); observation-window correspondence by exact coverage; empty grain, null window and foreign tenant/session all fail closed (R3, R6). No apportionment, no fuzzy matching, no fallback from attributable to gross, no silently missing dimension.
  - *Hard Dependencies:* `CDI-07A` (`DecisionContract`), `CDI-07B` (`PredictionOutcomeComparison`).
  - *Integration Dependencies:* None. **No external dependency whatsoever.**
  - *Enhancement Dependencies:* None.
  - *Owner rulings:* **Z1** (prediction envelope is a contract-native declaration on `DecisionContract`, additive, covered by `contract_digest`, `decision_basis_digest` untouched — verified mechanically against `computeContractDigest` / `computeDecisionBasisDigest`); **Z2** (`OUTSIDE_DECLARED_ENVELOPE` admissible on digest binding alone; `WITHIN_DECLARED_ENVELOPE` withheld until pre-declaration is witnessed by an instant the caller does not author — therefore structurally unreachable until ESF-6); **Z4** (composite grain resolves **only** by a single observation whose declared grain key equals the contracted required dimension set; a jointly-covering set of marginal observations is **refused** — marginals do not determine the joint cell, and combining them is apportionment).
  - *Deliverables:* `PREDICTION_ENVELOPE_REQUIRED_INPUT` and `COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT`, closing the estate's only undeclared capability gap.
  - *Binding constraint:* purely additive on CDI-07A; strictly narrowing on CDI-07B. No comparison that fails at `5b92dae2` may pass afterwards except the two intended unlocks (composite grain, declared envelope), each demonstrated on a case that provably could not pass before. Full re-execution of 21/36/31/49/70/93/155/235 is clean.
  - *Evidence:* `docs/reports/COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_DESIGN_GATE.md` + `COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_REPORT.md`; architecture basis `docs/reports/COGNIX_PROGRAMME_10_POST_CDI_CONSOLIDATION_ASSESSMENT.md`; ADR-036, ADR-037; CDI-08 44/44 (30 attacks A-01…A-30 plus variants), full regression clean across CDI-01…07B (21/36/31/49/70/93/155/235).
- **ESF-6 / Y3a — Attested Observation Admission [COMPLETED 2026-08-16]:** The deterministic predicate `source × context → authority`. Answers whether an observation is evidence about the real world at all, before CDI-08 asks whether it addresses the contracted decision. A server-side `AttestedObservationSource` registry — separate from the ESF-3 reference registry, which stays provider-neutral and synthetic — is the **only** origin of `synthetic_demo = false`. Authority derives from registered source capability and attestation, never from a request payload: a body may declare itself synthetic and be believed, and may declare itself real and be ignored. Deterministic server-issued receipts (`SOURCE_REGISTRATION`, `CONTRACT_REGISTRATION`, `OBSERVATION_ADMISSION`) carry a per-tenant strictly monotonic `sequence`, never a wall-clock reading, and their ordering supplies the CDI-08 Z2 pre-declaration witness. Fail-closed on foreign tenant, foreign session, unknown/disabled/revoked source, category, metric, grain or measurement-basis mismatch, malformed provenance, and any attempt to assert `synthetic_demo=false` without attestation.
  - *Hard Dependencies:* `ESF-3` (Connector Contract), `CDI-08` (correspondence predicate — sequencing, see ESF-3 Disposition).
  - *Integration Dependencies:* `WP10-D` (`cognix-learning`).
  - *Enhancement Dependencies:* None.
  - *Owner rulings:* **E1** (attested sources live in a separate ESF-6 registry; ESF-3 descriptors cannot express tenant ownership, attestation, observation category, grain capability or measurement basis, and widening them would make `synthetic_demo` a mutable property of a synthetic reference adapter); **E2** (authority derives from the registered source; the payload disjunction is monotone toward synthetic and stays that way); **E3** (`pre_declaration_witness` is a server-derived **output**, pinned to `'NONE'` on any caller-supplied contract by new invariant `C-INV-ENV-6` — writing a receipt into an envelope covered by `contract_digest` is circular); **E4** (precedence is proved by a per-tenant strictly monotonic integer sequence, never a timestamp; counter and receipt store share one lifetime, so a lost receipt fails closed); **E5** (`registerExternalSignalConnector` is deleted and the CDI-08 fixtures migrate to the attested path); **E6** (source capability is an admission test and never substitutes for, pre-satisfies or short-circuits CDI-08 C0–C8); **E7** (confidence and quality are classified `SUPPLIED` vs `ADAPTER_DEFAULT` and are permanently barred from the authority conjunction — restates G4, made enforceable).
  - *Defects the gate records at `4e659eed`:* **D-1** no registration path for a non-synthetic source; **D-2** the `registerExternalSignalConnector` lab backdoor; **D-3** the constant `|| true` at `campaign-learning-loop-engine.ts:1285`; **D-4** caller-supplied `source_type` and presence-only provenance checks inside `determineObservationAuthority`; **D-5** `pre_declaration_witness` accepted from the caller at `campaign-decision-contract-model.ts:1081` — **a fourth fail-open of the class the CDI-08 sequencing rule named, armed by this very work package.** D-5 is corrected before authority becomes reachable (implementation step 4 precedes steps 5–6).
  - *Binding constraint:* purely additive on CDI-07A / CDI-07B / CDI-08 shape; strictly narrowing on authority. No observation that fails to reach `AUTHORITATIVE_EXTERNAL` at `4e659eed` may reach it afterwards except through the attested path, and the only verdict newly reachable is `WITHIN_DECLARED_ENVELOPE`. All 44 CDI-08 assertions must survive the E5 fixture migration **unchanged in meaning**; any assertion weakened to compile is a defect in ESF-6.
  - *Independent reconciliation (2026-08-16):* five defects corrected, led by one critical: **the admission receipt was never bound to the observation it witnessed.** `observationContext()` and witness condition W3 accepted any receipt that resolved under the tenant, checking neither `kind === 'OBSERVATION_ADMISSION'` nor `subject_id === observation.observation_id`. A caller holding a decoy `SOURCE_REGISTRATION` receipt with a sequence exceeding the contract's could present it on a wholly fabricated observation and publish `WITHIN_DECLARED_ENVELOPE` — reproduced end to end, contradicting gate §12. Also corrected: the ESF-6 authority branch failing *open* on the synthetic disjunction (`?? false` where the ESF-3 branch uses `?? true`); the E5 CDI-08 fixture migration minting receipts with a hard-coded `subject_id` that bound nothing — **the migrated suite was itself exercising the unbound path**, which is why 63 assertions passed over it; a dead attestation index; and invented `comparison_invariants` at admission. Two delivered assertions were self-confirming (E-35 string-matched a literal no implementation would write; E-34.5 counted conditions rather than checking them) and were replaced. Six permanent regressions added (R-37…R-42).
  - *Learning eligibility, measured not asserted:* LE-1…LE-5, LE-7, LE-8 **pass** on genuinely attested evidence — LE-4 is the ESF-6 unlock. **LE-6 remains blocked** because every play in the reference estate carries `evidence_strength_floor = PLACEHOLDER_EXCLUDED`. **No eligible `LearningCase` is produced**, and R-42 asserts this permanently so that a future change which starts manufacturing one is caught rather than believed. `LEARNING_PATTERN_PROMOTION` stays `AWAITING_AUTHORITATIVE_SOURCE`; `N = 3` remains uncalibrated; nothing is promoted.
  - *Evidence:* `docs/reports/COGNIX_ESF_6_ATTESTED_OBSERVATION_ADMISSION_DESIGN_GATE.md` + `COGNIX_ESF_6_ATTESTED_OBSERVATION_ADMISSION_REPORT.md`; ADR-038, ADR-039; ESF-6 81/81 (E-01…E-36 plus R-37…R-42 reconciliation regressions), CDI-08 44/44 with **all assertions unchanged in meaning** through the E5 fixture migration, full regression clean across CDI-01…07B (21/36/31/49/70/93/155/235), ESF-2 19, ESF-3 22, IFI-01 12, WP10-D 15, WP10-B, WP10-C.
- **Executive UX Alignment — Promotion Decision Intelligence [COMPLETED 2026-08-16]:** A refinement of an existing surface, not an intelligence work package. The Signals Feed / Campaign Configuration equal-height problem was solved structurally rather than by pixel coupling: the delivered `maxHeight: 385 / 490` constants were both **smaller than the rendered Campaign Configuration height** (408 collapsed, 520 expanded), so the cap engaged in both states and produced exactly the whitespace it was meant to remove. The Signals card is now absolutely positioned inside a relative grid cell, contributing no height to the `auto` row, so the row is sized solely by Campaign Configuration and the feed scrolls within it — verified under a 12-signal stress test that the card holds its height and the scroller engages. Decision Context controls were traced to their payload fields: Audience/Segment and Channel Context are **BINDING** (`CommercialIntent.customer_segment`, `.channel`); Objective is **CONTEXTUAL** (a prose `campaign_objective` label, not an executable objective type); Timing, Market Strategy and **Margin Floor are PRESENTATION_ONLY** — none reaches any request body, and Margin Floor is **not** consumed by CDI-04 or CDI-06 economics as previously reported. No backend enum was invented to justify a control; the surface was instead made to state plainly what it does and does not execute.
- **Campaign Intelligence Demonstration Surface & Simulated Decision Twin [COMPLETED 2026-08-16]:** A presentation work package, not an intelligence work package — no governed contract, engine or authority rule changes semantics. The Promotion journey is rebuilt around seven seeded campaign archetypes (`lib/campaign-archetypes.ts`) rendered through modular lenses (`components/campaign/`), with the governed engines invoked live on every configuration change. Status is recorded per capability, not as a blanket "complete":
  - *IMPLEMENTED (live governed runtime):* every scenario configuration builds an inline `CampaignIntent` and evaluates CDI-02 (causal + counterfactual), CDI-03 (opportunity discovery), CDI-04 (readiness) and CDI-05 (timeline) through the real routes/engines under the estate's tenant/session boundary; engine results render in a dedicated "Live Engine Evaluation" strip, and any failed call renders as an explicit unavailable state — a failed configuration can never display a previous configuration's result as current.
  - *DEMO/SIMULATED (declared seeded calibration):* the archetype narratives, demand waterfalls, elasticity curves, opportunity surfaces, frontier plays, decision graphs and the entire Live Decision Twin are seeded, uncalibrated demonstration data. The twin declares `telemetry_basis: 'SIMULATED_DEMO'` structurally and in the UI; no archetype datum may carry the governed bare `OBSERVED` class (the surface vocabulary is `SEEDED_OBSERVATION`/`DERIVED`/`SIMULATED`/`SEEDED`), claim a live/production feed, or reintroduce prohibited vocabulary (`confidence_pct`) — all three prohibitions are asserted permanently in the test suite.
  - *PARTIALLY INTEGRATED:* opportunity-surface, frontier and inverse-analysis actions create proposed interventions with economics derived from the archetype's own elasticity curve (`estimateInterventionEconomics`), never from engine output; CDI-06 outcome frontier remains registered-intent-only by design and is not invoked from this ephemeral-intent surface.
  - *NOT YET EXECUTABLE:* "Prepare Commitment Handoff" prepares a brief and navigates to Commitment Intelligence; it creates no commitment record and says so. Accepting a twin course correction is a simulated acknowledgement, labeled as such.
  - *Independent reconciliation (2026-08-16):* the delivered implementation reproduced the manufactured-success pathology under green tests — every browser call failed 400 on a tenant/session boundary mismatch between the request identity (`'default'`/`'campaign-session'`) and the built intent (`tenant_uk_retail_01`/`sess_001`), the client's payload-or-null return was read as an `{ok,data}` envelope so success could never be stored, and the error state was never rendered, leaving seeded analytics indistinguishable from live results. Also corrected: seeded constants labeled `OBSERVED` with fabricated live-feed rationales ("Real-time telemetry…", "Met Office weather data", web-scrape claims); a "Commitment Created in Commitment Intelligence" claim with no backing call; hard-coded chilled-dairy economics rendered for all seven archetypes (the 4120/1850/2400 constants and a static five-dimension tension matrix); invalid `PrimaryObjectiveMetric` values smuggled via `as any`; four SKU ids in the selector that do not exist in the product catalog under those names; opportunity cells whose factor breakdown did not sum to the displayed index; waterfall net rows folding ambient drivers into "attributable" claims; three archetypes whose recommended frontier play strictly dominated every alternative; opportunity-cell tier labels disagreeing with the legend's index ranges; lens selection state surviving archetype switches; and a timeline integration defect found in browser verification (forwarding a separately-produced readiness into CDI-05 trips its RJ3 same-evaluation consistency check — the timeline derives its own nested bundle from the inline intent instead). The 90-assertion suite (84% structural checks on static fixtures, one tautology, zero coverage of the ten mandated invariants) is replaced by a 133-assertion semantic suite proving engine acceptance for all archetypes under the browser-shaped request, configuration responsiveness at engine runtime (including the 10%→20% contribution sign boundary), client failure honesty, scenario immutability, seeded-model coherence and the provenance prohibitions.
  - *Evidence:* campaign-intelligence 133/133; full regression clean across CDI-01…07B (21/36/31/49/70/93/155/235), CDI-08 44, ESF-6 81, ESF-2 19, ESF-3 22, IFI-01 12, WP10-D 15, WP10-B, WP10-C, bugfix 4/4; `tsc` clean across root, contracts, learning and world projects; production build clean.

- **Campaign Decision Experiment History, Comparison & Execution Brief [COMPLETED 2026-08-16]:** A presentation and session-memory work package. No governed contract, engine or authority rule changes semantics; `CampaignDecisionExperiment` is a new review artefact that records what an engine already decided and never becomes an input to one. Status is recorded per capability:
  - *IMPLEMENTED (session-scoped):* a completed decision is preserved as a `CampaignDecisionExperiment` carrying the CDI-01…07A snapshots that produced it, reviewable read-only, comparable against another preserved decision, and expressible as an executive Execution Brief. Experiment identities (`EXP-001`, `EXP-002`, …) are sequential **within one tenant/session scope**; records are keyed by the composite `tenant::session::experiment_id`, so two sessions may each hold an `EXP-001` and neither can read, overwrite or compare the other's.
  - *IDENTITY MODEL:* `EXP-CDI-01` is the **capability/navigation identifier** for this surface (`app/page.tsx` routing key and journey-telemetry `experiment_id`), not an experiment instance. It no longer occupies the decision-identity slot in the canvas header, where it read as "every decision is experiment 1"; it is now stated as `Capability reference CDI-01`. The header reports exactly three states: `New Decision` before preservation, the real `EXP-xxx` once a record exists, and `Reviewing EXP-xxx` in historical review.
  - *PRESERVATION GATE:* a decision earns an identity once it is a **registered intent with an evaluated result**. One logical decision owns exactly one record: the scope holds a server-side active-experiment pointer, so the five preservation points (evaluation, opportunity, readiness, frontier, contract registration), double-clicks and browser reloads deepen that record instead of minting a new id. Start New Decision closes the identity — history is retained, and the next decision earns the next number.
  - *DEMO-SCOPED / SESSION-PERSISTENT / NOT DURABLE:* the experiment store is in-memory. A container or process restart clears Experiment History. This is **not** Enterprise Memory and the surface does not imply durability.
  - *NOT EXECUTABLE, NOT LEARNING:* "Prepare Commitment Handoff" prepares a brief and states that no external campaign system has been executed or modified. Preserving, reviewing or comparing an experiment creates **no** `LearningCandidate` or `LearningCase` and bypasses no CDI-07B eligibility or evidence rule (asserted permanently).
  - *Independent reconciliation (2026-08-16):* the delivered implementation passed 32/32 while preserving fabricated results. **Every preserved experiment recorded `+0.0%`, `+£0`, `Ready` and `Do nothing`** because preservation read engine fields that do not exist — `evaluation.attributable_volume_uplift_pp`, `frontier.recommended_play_name`, `frontier.trade_off_summary` and `readiness.readiness_status` — instead of `counterfactual.campaign_delta`, the CDI-06 `selection`, and the CDI-04 `state`; a decision the readiness engine gated `DO_NOT_PROCEED` was preserved as `Ready`. This is also why the owner's history showed two near-identical experiments: **one decision was minting up to six records**, one per analysis step, since every POST allocated a fresh sequential id. Also corrected: experiment records were keyed by the bare display id while ids were allocated per session, so the *first* experiment of any second session or tenant threw `Refusing cross-tenant write on experiment ID`; a tenant-only read returned another session's record; comparing two identical experiments — or an experiment with itself — asserted "distinct operational postures" and "distinct trade-offs" over records that differed in nothing; the header Execution Brief resolved to `experimentsList[0]`, handing the user the newest historical brief while a different decision was on screen; registration overwrote `completed_areas` with all four stages, so jumping the rail to stage 4 registered and preserved a decision with nothing reviewed; `label()` was called with one argument instead of `(domain, value)`, so preserved history rendered `— · Fresh Dairy`; and a negative contribution rendered green captioned "Net profit recovery". The 32-assertion suite (one literal `assert(true)` tautology, `length > 0` checks standing in for synthesis quality, no API execution, and no coverage of identity, duplication, isolation, snapshot immutability or the identical-experiment case) is replaced by a 96-assertion suite that executes the real route handlers and proves the identity lifecycle, duplicate-POST idempotency, three-way scope isolation, snapshot immutability across a later decision, comparison honesty (identical, self, unavailable economics, and a gated higher-contribution option), and engine-field fidelity.
  - *COMPARISON HONESTY:* synthesis is deterministic over the compared snapshots. Two experiments differing in nothing material report `No material decision differences detected` and name no winner; a winner is named only where contribution separates them **and** the engine cleared that configuration's readiness — a `DO_NOT_PROCEED` option is reported as not currently actionable rather than recommended.
  - *Evidence:* campaign-decision-journey 96/96 (was 32/32); full regression clean across CDI-01…07B (21/36/31/49/70/93/155/235), CDI-08 44, ESF-6 81, ESF-2 19, ESF-3 22, IFI-01 12, WP10-D 15, WP10-B, WP10-C, campaign-intelligence 133, bugfix 4/4; `tsc` clean across root, contracts, learning and world projects; production build clean; Docker rebuilt with web, world and learning healthy; browser-validated journeys A–L at 1024/1180/1280/1440 with no campaign-route 4xx/5xx and no horizontal overflow.

- **Campaign Decision Dimensions, Multi-Way Comparison & Decision Context Drafting [DELIVERED 2026-08-18 — residual defects recorded below]:** Category, Customer Segment and Route to Customer become real decision dimensions; experiment comparison extends from a pair to 2–4; a bounded GenAI assistant drafts Decision Context. Status is recorded per capability:
  - *DIMENSIONS ARE BOUND, NOT LABELLED:* the three inputs were free text. `channel` was read by **no engine at all** and both execution-brief builders printed the constant `'Omnichannel'` regardless of what the planner chose; `customer_segment` acted only through a case-insensitive substring test for the literal token `family`, so *"Young Families"* scored differently from *"Family Shoppers"*; `category` acted only through an opaque name hash producing a ±6% band with no modelled content — enough, on economics sitting near a contribution breakeven, to flip a verdict when a category was merely respelled. Each now acts through a stated property: category through **promotional elasticity** on the price mechanic (anchored on the seeded Dairy scenario the demo economics were calibrated against, so the calibration is unchanged and every other category is expressed relative to it), segment through **within-cohort responsiveness × addressable reach**, and route to customer through **reach forfeited** by narrowing, partly offset where the route can address an individual. The category name is no longer part of any hash.
  - *THE COMMERCIAL CASE FOR TARGETING IS MODELLED, NOT ASSERTED:* a discount the estate cannot confine to the targeted cohort is paid on the whole base. The same audience routed through Mobile App rather than Store therefore returns **more contribution on less volume** — the trade-off the comparison surface exists to show — and CDI-04 raises `U6_offer_not_confinable` where the route cannot confine it. Two further readiness rules follow from the dimensions: `O7` route execution exposure (lead time and the failure mode that route is exposed to) and `O8` the constraint that binds the chosen category regardless of the commercial case.
  - *MODELLING BOUNDARY CORRECTED:* "channel" conflated where the customer transacts with how the campaign reaches them. `audience_market.channel` is now the sales channel and `audience_market.activation_channels` carries media routes; an activation that cannot reach the chosen sales channel raises `U7`. Store format stays out of both — it is estate segmentation and belongs to CDI-03. See ADR-028 (amended).
  - *EVIDENCE CLASS PER DIMENSION:* the eight categories are `CATALOGUE_BACKED` — their SKU counts, supplier concentration and subcategories are asserted against `data/products.json` and `data/suppliers.json`, so a catalogue change that invalidates the taxonomy fails the suite rather than drifting. Every segment and channel reach figure is a `DEMO_ASSUMPTION`, because this estate holds no customer or channel data, and readiness reports that verbatim rather than presenting a planning assumption as measurement. The seeded draft's `Fresh Dairy` — a category the estate does not stock — is corrected to the catalogue-backed `DAIRY`, and its presumed `Family Shoppers` / `Omnichannel` become the neutral `ALL_CUSTOMERS` / `ALL_CHANNELS`, leaving targeting a choice the analyst makes.
  - *COMPARISON 2–4, NOT A WIDER TABLE:* `ExperimentComparison` carries an `experiments[]` array in place of the `experiment_a`/`experiment_b` pair, bounded 2–4 in the contract and enforced identically in the store, the route and the drawer. A fifth selection is refused with concise feedback rather than silently evicting an earlier pick. The modal leads with compact per-experiment summaries, then **only the dimensions that differ**, then the assessment; the full dimension list is progressive disclosure.
  - *NO COMPOSITE SCORE:* the assessment reports **strongest commercial option** and **lowest execution risk** separately, because they are frequently different configurations and collapsing them would hide the decision. Per-dimension standings (commercial, demand, readiness, evidence) each publish their basis and may report `separates: false`. A tie names no winner; a higher-contribution option the engine did not clear is reported as not currently actionable; trade-offs state both what an option gives up and what it returns; watch items and the next move are read off preserved snapshots.
  - *IDENTICAL EXPERIMENTS, 2/3/4-WAY:* materially equivalent configurations report `No material decision differences detected`, name neither a winner nor a safest option, and invent no trade-offs or risks. Two experiments differing **only** in audience or route are correctly **not** reported as identical — the previous synthesis inspected objective, scope, region and posture only, so a segment or channel change could be silently absorbed.
  - *GENAI DRAFTS, AND A DRAFT IS NEVER EVIDENCE:* a server-side route drafts contextual factors, open questions or assumptions from the decision as configured. Drafts live in component state and reach `CampaignIntent` only on explicit acceptance. Every response is stamped `NON_AUTHORITATIVE_DRAFT`; an unstamped response is treated as a failure. With no key configured the route returns `503` and drafts nothing — **there is no canned fallback on any path**, deliberately unlike the NLQ and briefing routes, because a mock briefing is a demo affordance whereas mock decision context would be fabricated input to a governed contract. The prompt's rules are enforced on the response rather than requested in the prompt: items stating a percentage, currency figure, decimal quantity or thousands-separated number are rejected outright, since this route has no data with which to support a measured claim. See ADR-044.
  - *SECRET BOUNDARY:* `GEMINI_API_KEY` is resolved only from the server environment; a key supplied in a request body is structurally unable to reach the provider call. `.dockerignore` now excludes host `.env` files from every build context while re-admitting `.env.example`, and `docker-compose.yml` passes the variable through from the host rather than defining it.
  - *DEFECTS CORRECTED IN PASSING:* the execution brief's hard-coded `'Omnichannel'`; a POST naming any experiment id could **overwrite a preserved record and silently reopen it** as the session's active decision; re-evaluating a decision carried forward readiness and frontier snapshots computed against the previous evaluation, leaving a record whose analysis answered a configuration it no longer held; `handleEvaluate` was the only analysis handler without a historical-view guard; `isFieldsDisabled` was computed and never used, so every input stayed editable while reviewing history; the four stage input panels read live state rather than the reviewed snapshot (**the CDI-02…07B analysis panels below them still do — see residual defects**); `patchContext` alone did not invalidate downstream analysis, though open questions feed readiness rule S6; the history drawer never reset its selection or filters on close; a preserved **loss rendered in the colour of a gain**; the objective filter offered three of five objective types; and the comparison modal accepted an `onSelectExperiment` handler it never called. A latent floating-point defect in the CDI-05 conservation invariant — exact equality against a value the engine had rounded to four decimal places — is corrected to compare within that rounding; whether it passed depended on the ambient value's binary representation rather than on conservation holding.
  - *RECONCILIATION PASS — DEFECTS FOUND AND CLOSED:* an adversarial pass over the finished diff, then a verification pass against the running application, found and closed five further defects. **The economics and the readiness constraint disagreed about the same decision:** the causal engine gated subsidy confinement on the sales channel alone, while `U6`, the canvas note and the comparison trade-offs also honoured an addressable activation — so adding a personalised route cleared the leak warning while the engine kept charging full-base erosion. Both now resolve through one predicate, `evaluateSubsidyConfinement`, and an addressable activation moves the economics it claims to move (same cohort and depth on Store: −£650 unconfined, +£109 once an addressable route is selected), with the depth/contribution breakeven preserved. **Historical review showed the live session's analysis:** the six `displayed*` aliases were computed and read by no CDI-02…07B panel. The binding is now structural — live values are reachable only under `live*` names that no panel references — so a panel cannot render live analysis against a preserved decision, and a regression test fails if one does. **A raw veto id was the CDI-04 headline**, the most prominent sentence on that surface; it now states the blocking reason, with veto ids retained on each finding and in provenance. **Two casing artefacts manufactured differences that did not exist:** an absent audience rendered as `All customers` against an explicit `All Customers`, and objective and posture were compared on stored free-text labels rather than their governed enums, so identically-configured decisions were reported as differing. **The readiness cap sentence called every cap an "evidence cap"**, which is wrong for the negative-contribution (K7) and capacity-gap (K8) caps; it now names the actual cause.
  - *PRIMARY-SURFACE VOCABULARY CLOSED:* the reconciliation pass removed the remaining engine vocabulary from surfaces a planner reads to decide. The human-resolve control — where the decision is committed — listed each option as `label (play_id)`, printing a generated hash in the visible text of the most consequential control on the page; it now names the option and keeps the id on the option's tooltip. Five readiness conditions and vetoes instructed the planner in engine terms (`restore contribution_delta_gbp ≥ 0`, `so commitment_gap_units becomes 0`, `align with stated primary_metric`) and now state the action in business terms, with the field reachable through each finding's evidence refs. The CDI-06 unmeasurable-dimension note printed the raw required field path and now states what the estate must supply, keeping the path on the tooltip. Each is held by a regression assertion, including a scan that fails if any readiness statement embeds a snake_case engine identifier.
  - *A FLAKY ASSERTION CORRECTED, NOT SUPPRESSED:* CDI-07A `AC-12c` asserted that `contract_id` embeds no timestamp or counter by rejecting any run of ten digits — a test a 64-character hex digest fails by chance. It passed or failed according to the digest's bytes rather than according to whether a timestamp had leaked in, and any content change could flip it. It now asserts the property directly: a fixed-length lowercase hex digest, containing neither a date nor the suite's own timestamp, with determinism already covered by `AC-12`/`AC-12b`.
  - *RESIDUAL DEFECTS CLOSED:* the defects recorded at the previous close are resolved. The fabricated-figure guard held only for the characters it expected — a draft stating "３０％", "٣٠٪" or "＄8450" carried a measurement the ASCII patterns could not see — so text is folded before the patterns run (NFKC for width and compatibility forms, decimal digits mapped from their own script's zero, percent and per-mille signs NFKC leaves alone) and numerals that never fold to ASCII are judged on the raw text. The per-caller throttle keyed on an unvalidated forwarded-for header, letting one caller mint unlimited buckets; forwarding headers are honoured only where a trusted proxy is declared, and otherwise callers share one bucket so the per-process cap remains the stated bound. An accepted draft entered the record as bare text and is now recorded in `decision_context.assistant_drafted_entries`, with an edited line correctly ceasing to claim draft provenance. Readiness cited every taxonomy figure as `DECLARED_INPUT`; the declared dimension and the demonstration figure attached to it are now cited at their own strengths, as are the catalogue-derived supplier facts. `validateCampaignDecisionExperiment` type-checks its array fields, so a malformed `sku_scope` can no longer be preserved into a record that then fails every render. The validity disclosure states the missing measurement in planner terms rather than printing the engine field.
  - *THREE ASSERTIONS THAT COULD NOT FAIL:* segment responsiveness was compared between cohorts whose reach already separated them, so reducing it to a constant passed — reach is now divided out. Nothing asserted the route still ran its own validator, so deleting the call site left every assertion green while raw provider output reached the planner; parsed output must now reach the response only through `validateSuggestions`. The no-fabricated-fallback rule grepped for three legacy identifier names, so a fallback under any other name passed; every block of route-authored prose must now be registered as prompt scaffolding, the set the validator refuses to return. Each was confirmed to fail when its defect is reintroduced, rather than assumed to work.
  - *LOCAL DEMONSTRATION BUILD:* the published image requires sign-in, and `NEXT_PUBLIC_COGNIX_DEMO_MODE` is inlined at build time while host `.env` files are excluded from the build context, so the bypass could not reach a container build. It is now a build argument defaulting to false, with `docker-compose.local.yml` opting a local build into it. Both states are verified: the default image redirects to `/login`, the override serves the full journey without sign-in. The bypass is opt-in so it cannot reach a deployed environment by default.
  - *Evidence:* decision-dimensions 173/173; campaign-decision-journey 96/96; full regression clean across CDI-01…07B (21/36/31/49/70/93/155/235), CDI-08 44, ESF-6 81, ESF-2 19, ESF-3 22, IFI-01 12, WP10-D 15, DDF-01 56, WP10-B, WP10-C, campaign-intelligence 133, bugfix 4/4 — 23 runners, no failures, every pre-existing count preserved. `tsc` clean across root, contracts, learning and world projects; production build clean; Docker rebuilt and all three services verified through their real health endpoints rather than container status alone. Browser-validated at 1024/1180/1280/1440 with no horizontal overflow and no clipped elements in the four-way comparison: dimension responsiveness (addressable reach 100% → 4% of trade, lead time 10 → 3 working days, on a segment and channel change), five preserved experiments with sequential identity, 2/3/4-way comparison, the refused fifth selection with concise feedback, identical-experiment honesty at 2-way and 3-way, reset clearing the decision and the draft state while preserving history, and Promotion unregressed. **The assistant's success path is browser-validated:** the earlier free-tier quota exhaustion cleared, and live provider calls returned drafts naming the selected category, SKU, region, audience and route — open questions in question form, assumptions framed as assumptions, no figures. The failure path was validated live against real upstream `503`s: a concise notice, the planner's existing text untouched, nothing invented. Secret boundary verified against build output and image: the key is absent from the client bundle, absent from the image filesystem and image environment, and injected only at container run time.

---

### Core Innovation Capability — Demand Decision Frontier (DDF)

The evolution of Demand & Forecast (`SOL-DEMAND-02`) from *"what demand do we forecast?"* to *"is the demand outlook changing, can the organisation capture it, how long does it have to respond, what is the economic consequence of acting or waiting, and what intervention creates the best outcome?"*

Capability-family governance, canonical demand vocabulary, domain principles, the maturity model and the future conceptual entities are specified in [`DEMAND_OBSERVABILITY_MODEL.md`](DEMAND_OBSERVABILITY_MODEL.md). Reconciliation evidence, the defect register and the full acceptance criteria are in [`COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md`](../reports/COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md).

#### `DDF-01` — Demand Decision Frontier [COMPLETED]

- **Status:** Governance approved 2026-08-16. **Implemented and independently reconciled 2026-08-16.** Implementation evidence, the `D-INT` integration defect register and the `[HARD]` acceptance verdicts are in [`COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md`](../reports/COGNIX_DDF_01_DEMAND_DECISION_FRONTIER_REPORT.md).
- **Delivered:** `packages/contracts/src/demand-decision-frontier-model.ts`, `lib/demand-decision-frontier/demand-frontier-engine.ts`, `app/api/v1/demand-frontier/evaluate/route.ts`, the rebuilt `components/Forecasting.tsx` surface, and `tests/unit/run-ddf01-tests.ts` (56 assertions).
- **Arithmetic spine:** every unit, percentage point and pound resolves to one denominator — the observed run rate scaled to the horizon — so that `emerging_frontier_pct − executable_frontier_pct ≡ exposed_demand_units ÷ base_demand_units` holds by construction (ADR-041 Amendment A). Supplier capacity is consumed from `DecisionDerivedImpacts` as a scale-free **ratio**, which is how the read-only rule survives a population-boundary crossing without creating a fourth capacity number.
- **Integration pass outcome:** the first implementation closed `D-DDF-1`…`D-DDF-8` at the level of presentation; independent reconciliation found several had been **relocated rather than closed** — most materially, the `IFI-01` decomposition was engine-called with frozen inputs, the headline `pp`/units/£ figures were computed on three unrelated bases, and the simulated outcome was a hardcoded string. Fifteen defects (`D-INT-1`…`D-INT-15`) were corrected before release.
- **Objective:** Deliver one combined decision experience — **not three dashboard widgets** — over the reasoning sequence *change → gap → urgency → consequence → intervention → outcome*.
- **Scope (P0, and nothing else):**
  - **P0-A — Forecast Stability Intelligence.** Whether the forecast is likely to remain materially unchanged, as distinct from whether the model is reliable. Publishes stability score, direction/trend, probability of material revision, likely revision direction and magnitude range, contributing signals and provenance. Computed from observed `EnterpriseSignal` divergence (`FORECAST_DIVERGENCE`, `CATEGORY_DEMAND_ACCELERATION`, `ORDER_VELOCITY_ACCELERATION`, `REGIONAL_DEMAND_SHIFT`), never from the `IFI-01` confidence constant. **No new signal type.** Insufficient evidence yields `INDETERMINATE`.
  - **P0-B — Decision Gap Intelligence.** *The difference between the commercial opportunity currently emerging and the organisation's ability to capture that opportunity under its existing commitments and operational constraints.* Distinguishes baseline forecast, contextualised demand, emerging demand frontier, executable demand frontier and exposed demand, with monetary opportunity at risk, affected scope and **named ranked binding constraints**. Explicitly **not** `forecast − supplier capacity`.
  - **Decision Window (supporting).** *The estimated period during which an intervention can still materially capture or protect the emerging opportunity before its value deteriorates or becomes unrecoverable.* Derived from a declared operational constraint; `INDETERMINATE` with no countdown where none is declared.
  - **P0-C — Decision Regret Intelligence.** *The expected economic consequence of choosing an inferior action given the information and alternatives available at decision time.* Compares `ACT_NOW` / `WAIT` / `DO_NOTHING` from shared inputs. Not forecast-error cost.
  - **Combined Demand Decision Frontier visualisation**, **explainable intervention recommendation**, and **intervention simulation/recomputation** where feasible within the current architecture.
- **Non-Scope:** every `DOT` roadmap capability; any new `CanonicalSignalType` / `ExternalSignalCategory` / `SignalSourceType`; any new origin of `synthetic_demo = false`; any ML model, training or inference; any change to `CDI-01`…`CDI-08`, `ESF-6` or `WP10-C` semantics; any real external integration; any `LearningCandidate` / `LearningCase` creation; any Enterprise Memory write.
- **Hard Dependencies:** `IFI-01` (`ContextualisedDecisionOutlook` — engine binding), `WP10-C` (`DecisionDerivedImpacts`, read-only), `ESF-1` (`EnterpriseSignal` evidence).
- **Integration Dependencies:** `ESF-2` (Dynamic Signal Simulation — supplies the divergence over time that stability reads).
- **Enhancement Dependencies:** `CDI-02` counterfactual semantics (reused for `DO_NOTHING`), `CDI-04` readiness gating semantics, `CDI-05` trajectory rendering precedent, `CDI-06` selection/refusal semantics.
- **Architectural rulings:** ADR-040 (stability is a property of the evidence stream, never the model), ADR-041 (gap is engine-computed opportunity minus executable capacity, no fourth capacity number), ADR-042 (window derives from a declared constraint and is not a decay curve), ADR-043 (regret is comparative expected value over declared alternatives; "frontier" carries two qualified meanings).
- **Binding constraint:** purely additive on `IFI-01`; read-only on `WP10-C`; no governed contract, engine or authority rule changes meaning. Existing Demand & Forecast behaviour and all Campaign/Intent/Signal/Commitment flows remain functional.
- **Defect register the governance task records at `7ad9c2df`:** **D-DDF-1** the `IFI-01` decomposition on the demand surface is hardcoded JSX and the engine is never called — the "12pp gap" does not respond to the promotion slider; **D-DDF-2** *"91% Model Accuracy"* is an unsupported backtest claim over an unqualified engine constant; **D-DDF-3** the ARIMA/Prophet/GenAI model selector is implemented as sine/cosine factors; **D-DDF-4** supplier capacity is defined in three places and only one responds to scenario change; **D-DDF-5** Cannibalisation and Event Boost are read from Shared Decision State but never written to it; **D-DDF-6** an unsupported *"confirmed via live API feed"* evidence claim; **D-DDF-7** a *"14 to 90 Days"* horizon claim on a surface offering 7/14/30; **D-DDF-8** dark-theme chart styling on a light executive surface. D-DDF-1 is corrected **before** Decision Gap is computed, because a gap over a static panel is a caption rather than a calculation.
- **Acceptance Criteria:** `AC-DDF-01` … `AC-DDF-37`, of which the release-blocking `[HARD]` set governs preservation, engine binding, provenance honesty, internal consistency, recomputation and build cleanliness. Full text in the planning report.
- **Test Requirements:** semantic assertions executing real route handlers and engines; full regression green at `CDI-01`…`CDI-07B` 21/36/31/49/70/93/155/235, `CDI-08` 44, `ESF-6` 81, `ESF-2` 19, `ESF-3` 22, `IFI-01` 12, `WP10-D` 15, `WP10-B`, `WP10-C`, campaign-intelligence 133, campaign-decision-journey 96, bugfix 4/4; `tsc` clean across root, contracts, learning and world; production build clean.
- **Exit Gate:** an executive understands, within five seconds, that the outlook is moving, that existing commitments cannot capture it, that time is limited, and what acting versus waiting costs — and can reach the evidence for each claim. **MET.** The surface leads with four cards — stability, gap, window, cost of choosing wrongly — and one recommendation bar; the evidence for every figure is one disclosure away, including the provenance class of each input.
- **Validation at completion:** `tsc` clean across root, contracts, learning and world; 22/22 unit runners green with every recorded baseline matched exactly; `DDF-01` 56/56; production build clean; browser walkthrough at 1024/1280/1440 with no console errors and no horizontal overflow.

---

### Roadmap Capability Family — Demand Observability & Demand Truth (DOT)

**Architectural principle:** *CogniX does not manufacture unobserved demand. It reconstructs demand from evidence, quantifies uncertainty, and preserves provenance from signal through inference to decision.*

**Registered as roadmap. No `DOT` item is authorised for implementation by `DDF-01`.** Definitions, dependencies, the canonical demand vocabulary and the concept-to-home register are in [`DEMAND_OBSERVABILITY_MODEL.md`](DEMAND_OBSERVABILITY_MODEL.md) §6.

- **`DOT-A` — Demand Truth Reconstruction:** `DOT-1` Latent Demand Reconstruction [P1]; `DOT-2` Demand Leakage Intelligence [P1]; `DOT-3` Customer Substitution Graph [P2]; `DOT-4` Phantom Inventory Detection [P2/P3].
- **`DOT-B` — Demand Causality & Counterfactual Truth:** `DOT-5` Demand Cause Graph [P1]; `DOT-6` Promotion Truth Engine [P1/P2]; `DOT-7` Counterfactual Demand Twin [P3]; `DOT-8` Constraint-Induced Demand & Demand Suppression Loops [P3].
- **`DOT-C` — Evidence, Provenance & Resolution:** `DOT-9` Demand Evidence Ledger [P2]; `DOT-10` Intent Resolution [P2]; `DOT-11` Signal Half-Life & Signal Reliability [P2].
- **`DOT-D` — Observability Sourcing:** `DOT-12` Physical Store Demand Observability [P3].

**Binding roadmap rules.**
- `DOT-9` (Evidence Ledger) extends the `EnterpriseSignal` contract and the `ESF-6` admission path. It is **not** a parallel signal system and creates **no second origin of `synthetic_demo = false`**.
- `DOT-10` (Intent Resolution) is a **hard prerequisite for any latent-demand quantity**. Without it, `DOT-1` may describe suppression but must not publish a unit count — `app search → shelf interaction → colleague enquiry → substitute purchase` is one intent, not four units.
- `DOT-11` (Signal Half-Life) is parallel-eligible only **after `ESF-4`** — grading precedes weighting, exactly as admission precedes grading (G4). It is **not** `CDI-07A` Decision Half-Life and must never share an indicator with it.
- `DOT-7` (Counterfactual Demand Twin) is blocked behind `CDI-08` correspondence and non-trivial attested observation volume; started earlier it would be fitted to CogniX's own simulator.
- The **Demand Observability Maturity Model** (`DEMAND_OBSERVABILITY_MODEL.md` §5) adds a **Level 0 — Synthetic / modelled demonstration**, which is where the estate stands today and where all of `DDF-01` operates. Levels are capability levels, not purchase levels: a level is reached when evidence is *admitted and resolved*, not when a feed is connected.

---

### ESF-3 Disposition & Dependency Position
- **Status:** COMPLETED (provider-neutral connector contract delivered).
- **Role:** `ESF-3 — External Signal Connector Contract` remains provider-neutral and is NOT deleted, absorbed, or superseded. It defines connector contracts for planning, commerce, weather, events, competitive intel, operational telemetry, and demographic sources.
- **CDI Dependency:** CDI work packages `CDI-01` through `CDI-07B` use synthetic `ESF-1`/`ESF-2` / ESF-3 reference feeds during lab development.
- **Y3 characterisation — CORRECTED (2026-08-16, consolidation assessment §3.1 / G3):** the CDI-07B design gate §13.2 recorded Y3 as "a commercial and integration question, not a design one." **That characterisation is incorrect at baseline `5b92dae2`.** Three code sites make a non-synthetic observation unrepresentable regardless of any commercial arrangement: the connector registry is a static const array of seven reference adapters all marked `synthetic_demo: true` with no registration path; ingestion hardcodes `synthetic_demo: true`; and `campaign-learning-loop-engine.ts:1097` reads `... || connector?.synthetic_demo || true`, whose trailing `|| true` makes the expression a constant. **Non-synthetic never meant purchased.** It means *attested and independent of the system that made the prediction* — a first-party CSV of realised actuals, attested at upload by a named operator at the contracted grain, is independent evidence by exactly the standard CDI-07B applies (owner ruling **Z3**, approved 2026-08-16). Y3 is therefore a bounded engineering task, not a procurement dependency.
- **Successor:** `CDI-01`–`CDI-08` [COMPLETED] → `ESF-6 / Y3a`.
- **Y3 split (G2):** `Y3` is superseded by **`ESF-6 / Y3a — Attested Observation Admission`** (predicate `source × context → authority`); its correspondence half is absorbed into `CDI-08` (predicate `contract × observation → comparability`). The two predicates have different signatures and are independently testable; merging them yields one work package with two truth models.
- **ESF-4 repositioning (G4):** `ESF-4 — Signal Quality, Confidence & Provenance` moves from "parallel-eligible now" to **parallel-eligible after `ESF-6`**. Admission precedes grading — quality cannot make an inadmissible signal admissible. The provenance-classification slice (`SUPPLIED` vs `ADAPTER_DEFAULT`) moves into `ESF-6`, because authority depends on it. The 80/85 confidence/quality defaults are **not** authority and must never become authority.
- **Y4 split (G5):** `Y4` splits into **`Y4-gov`** (immediate governance correction, outside any work package — owner ruling **Z5**, approved 2026-08-16) and **`Y4-cal`** (calibration work package, deferred behind N ≥ 3 independent eligible `LearningCase`s and the X3 gate). `Y4-gov` documentation and code correction (`services/learning/src/learning-pattern-store.ts` — six seeded records classifying telemetry as uncalibrated demonstration constants with cited memory counts and honest narrative wording) are **COMPLETED**.
- **R6 disposition (G10):** tenant/session isolation is **found**, latent and unreachable at `5b92dae2`, and is recorded against `CDI-08` and `ESF-6` — never against closed CDI-07B semantics. Contract↔observation isolation is a correspondence predicate (`CDI-08`, test C0); source↔context isolation at ingestion is an admission predicate (`ESF-6`). Both are required; neither substitutes for the other.
- **Sequencing rule, load-bearing:** R2 (metric correspondence), R3 (empty grain / null window) and R6 (isolation) are **fail-open and inert only because nothing is authoritative yet**. Authoritative observation admission is precisely the change that arms them. **`CDI-08` must therefore land before `ESF-6`** — not because it is more valuable in isolation, but because it is what makes admission safe to ship. **Satisfied:** `CDI-08` completed 2026-08-16 at `e2848e97`; the `ESF-6` design gate is frozen against `4e659eed`.
- **A fourth fail-open, found at the ESF-6 gate (D-5, 2026-08-16):** `validateDecisionContract` accepts `pre_declaration_witness: 'SERVER_REGISTRATION_RECEIPT'` from the caller, checking only that the value is one of two literals (`campaign-decision-contract-model.ts:1081`). `campaign-learning-loop-engine.ts:692` then sets `within_declared_envelope = true` and the verdict becomes `WITHIN_DECLARED_ENVELOPE`. It is inert today for exactly the reason R2/R3/R6 are — nothing reaches `AUTHORITATIVE_EXTERNAL`, so no `LIKE_FOR_LIKE` row exists to carry it — and **`ESF-6` is the change that arms it**. It is recorded against `ESF-6`, never against closed CDI-08 semantics, and is corrected by owner ruling **E3** / invariant `C-INV-ENV-6` **before** authority becomes reachable within the same work package. The sequencing rule's own logic applies to itself: making authority reachable and leaving the witness caller-declared would move the estate from "produces nothing" to "certifies its own accuracy" in one step.

---

### Roadmap Dependency Structure

#### 1. Primary HARD Execution Flow DAG
```text
  WP10-A Enterprise World
           ↓
  WP10-B Journey Telemetry
           ↓
  WP10-C Shared Decision State ─── HARD ───┐
           │                               │
     ┌─────┴─────────────────────┐         │
     ▼                           ▼         │
   ESF-1 (Signal Contract)     WP10-D      │
     ↓                           │         │
   ESF-2 (Dynamic Simulation)    │         │
     ↓                           │         │
   IFI-01 (Intent Fusion) ───────┼── HARD ─┤
     │                           │         │
     └───────────────────────────┼─────────┴──> CDI-01 (Canvas & Intent)
                                 │               ├── HARD ──> CDI-02 (Counterfactual & Causal)
                                 │               │              ├── HARD ──> CDI-04 (Readiness & Resilience)
                                 │               │              ├── HARD ──> CDI-05 (Timeline & Decomposition)
                                 │               │              │              │
                                 │               │              └────── HARD ──┼──> CDI-06 (Outcome Frontier & Plays)
                                 │               │                             │      │
                                 │               └─── HARD ────────────────────┼─────>┼──> CDI-07A (Decision Contract & Half-Life)
                                 │                                             │      │      │
                                 └──────────────────────── HARD ───────────────┼──────┼─────>┼──> CDI-07B (Pre-Mortem & Closed Loop)
                                                                               │      │      ▲
                                                                               │      │      │
                                                                             ESF-3  Gemini (ENHANCEMENT)
```

#### 2. Companion Direct Dependency Matrix
Every direct dependency declared in the Work Package Specification Table is explicitly recorded and classified below:

| Work Package | HARD Dependencies (Blocks Execution) | INTEGRATION Dependencies (Cross-System Flow) | ENHANCEMENT Dependencies (Enriches Intelligence) |
|---|---|---|---|
| **`CDI-01`** | `WP10-C` (Shared Decision State), `IFI-01` (Commercial Intent Store) | None | `ESF-1` (Signal Contract) |
| **`CDI-02`** | `CDI-01` (`CampaignIntent` contract) | `ESF-2` (Dynamic Signal Simulation) | None |
| **`CDI-03`** | `CDI-01` (`CampaignIntent` contract) | `WP10-A` (Enterprise World Store Data) | None |
| **`CDI-04`** | `CDI-02` (`CounterfactualBaseline` & `CausalDemandContribution`) | `CDI-03` (`MicroMarketOpportunity`), Decision Ripple Capability | None |
| **`CDI-05`** | `CDI-02` (`CounterfactualBaseline` & `CausalDemandContribution`) | `CDI-04` (`DecisionReadinessAssessment`) | `CDI-03` (`OpportunityWindowEvaluation`) |
| **`CDI-06`** | `CDI-02` (`CausalDemandContribution`), `CDI-05` (`DemandDecomposition`) | `CDI-04` (`DecisionReadinessAssessment`) | Generative AI Narrative Capability (Gemini wrapper) |
| **`CDI-07A`** | `CDI-01` (`CampaignIntent`), `CDI-06` (`OutcomeFrontier`) | `WP10-C` (Shared Decision State) | `ESF-1`/`ESF-2` Signal Feeds |
| **`CDI-07B`** | `CDI-07A` (`DecisionContract`), `WP10-D` (`cognix-learning`) | `ESF-3` (External Signal Connectors) | None |
| **`CDI-08`** | `CDI-07A` (`DecisionContract`), `CDI-07B` (`PredictionOutcomeComparison`) | None | None |
| **`ESF-6 / Y3a`** | `ESF-3` (Connector Contract), `CDI-08` (correspondence predicate — sequencing, see ESF-3 Disposition) | `WP10-D` (`cognix-learning`) | None |
| **`ESF-4`** | `ESF-6` (Attested Observation Admission) | `ESF-2` (Dynamic Signal Simulation) | None |
| **`DDF-01`** | `IFI-01` (`ContextualisedDecisionOutlook`), `WP10-C` (`DecisionDerivedImpacts`, read-only), `ESF-1` (`EnterpriseSignal`) | `ESF-2` (Dynamic Signal Simulation) | `CDI-02` (counterfactual semantics), `CDI-04` (readiness gating), `CDI-05` (trajectory rendering), `CDI-06` (selection/refusal semantics) |
| **`DOT-1` … `DOT-12`** | `DDF-01`; per-item prerequisites in `DEMAND_OBSERVABILITY_MODEL.md` §6 (notably `DOT-9` → `DOT-1`, `DOT-10` → any latent-demand quantity, `ESF-4` → `DOT-11`) | `ESF-6` (attested admission — required for any level above Maturity Level 0) | None |

#### 3. Post-CDI-07B Execution Sequence (frozen 2026-08-16)

```text
CDI-07B [COMPLETED]
    │
    ├──> Y4-gov   Pattern telemetry citation correction   [COMPLETED] (governance, immediate, not a WP; Z5)
    │
    └──> CDI-08   Observation Correspondence & Prediction Envelope   [COMPLETED]
              │   removes LE-3, LE-7, R1, R2, R3, R6(correspondence half)
              │   no external dependency
              ▼
         ESF-6 / Y3a   Attested Observation Admission   [COMPLETED]
              │   removes LE-4, R4, R5, R6(admission half), D-5(caller-declared witness)
              │   first-party attested actuals — no procurement (Z3)
              │   attested source registry + server receipts; witness by monotonic sequence (E1–E7)
              ▼
         ── FIRST DEFENSIBLE LearningCase POSSIBLE (gross basis) ──
              │
              ├──> ESF-4  Signal Quality, Confidence & Provenance   (parallel-eligible)
              ├──> Y1     Observed counterfactual design → attributable comparison
              ├──> Y2     Per-assumption observation → the real Half-Life precursor
              └──> N ≥ 3 independent eligible cases
                        ├──> Y4-cal  Pattern telemetry calibration + WP10-D write path (X3 gate)
                        └──> ML workstream  [DEFERRED — observation correspondence suggestion first]
```

#### 4. Demand Execution Sequence (registered 2026-08-16)

```text
IFI-01 [COMPLETED] ── ContextualisedDecisionOutlook ──┐
WP10-C [COMPLETED] ── DecisionDerivedImpacts ─────────┤
ESF-1/ESF-2 [COMPLETED] ── EnterpriseSignal ──────────┤
                                                      ▼
                              DDF-01  Demand Decision Frontier (P0)   [NEXT]
                                 P0-A Forecast Stability
                                 P0-B Decision Gap (+ Decision Window)
                                 P0-C Decision Regret
                                 combined frontier visual + simulation
                                      │
                                      │  corrects D-DDF-1…D-DDF-8 as a precondition,
                                      │  not as a follow-up
                                      ▼
                    ── DEMAND OBSERVABILITY LEVEL 0 HONESTLY STATED ──
                                      │
       ┌──────────────────────────────┼──────────────────────────────┐
       ▼                              ▼                              ▼
  DOT-9 Evidence Ledger [P2]    DOT-5 Cause Graph [P1]      ESF-6-attested sources
       │  (extends ESF-1 + ESF-6, no second authority)              │
       ▼                                                            ▼
  DOT-10 Intent Resolution [P2] ── HARD ──> DOT-1 Latent Demand quantity [P1]
       │                                          │
       ▼                                          ▼
  DOT-3 Substitution Graph [P2]           DOT-2 Demand Leakage [P1]
                                                  │
  ESF-4 ── HARD ──> DOT-11 Signal Half-Life [P2]  ├──> DOT-4 Phantom Inventory [P2/P3]
                                                  ├──> DOT-6 Promotion Truth [P1/P2]
                                                  ├──> DOT-8 Suppression Loops [P3]
                                                  ├──> DOT-7 Counterfactual Twin [P3]
                                                  └──> DOT-12 Physical Observability [P3]
```

**Boundary, restated so it cannot be read ambiguously:** everything above the Level-0 line is `DDF-01` and
is authorised. Everything below it is roadmap and is **not** authorised by `DDF-01`. A demand capability
that requires attested observation, an evidence ledger or intent resolution is by definition below the
line.

**ML/deterministic boundary, restated and unchanged:** ML may rank, cluster, shortlist and suggest.
It may never establish authority, eligibility, correspondence, comparability or a verdict. No ML
workstream is justified until `ESF-6` has landed and attested observation volume is non-trivial —
started earlier it would be fitted to CogniX's own simulator.

#### Phase 10K — Counterfactual Learning
Comparative outcome engine evaluating Chosen Decision vs Alternative Interventions vs Do-Nothing baseline.

#### Phase 10L — Learning Quality & Pattern Decay
Pattern lifecycle engine automatically decaying pattern confidence scores when actual outcomes contradict historical precedents.

#### Phase 10M — Continuous Learning
Closed-loop operational learning loop (`Observe → Decide → Execute → Measure → Remember → Learn → Reuse`) with human review gates and model versioning.

---

### User Stories Added

- **Adaptive User:** As a CogniX user, I want the platform to respond to meaningful choices I make during an experiment so that the intelligence evolves with my scenario rather than remaining static.
- **Cross-Solution User:** As a user, I want decisions made in one CogniX experience to influence related solutions so that the platform behaves like one coherent enterprise.
- **Tenant Owner:** As a tenant owner, I want CogniX learning to reflect my organisation's objectives and historical outcomes while remaining isolated from other tenants.
- **Innovation Executive:** As an executive, I want CogniX to surface an Intelligence Moment when a meaningful new risk, opportunity or pattern emerges so that I do not need to constantly inspect dashboards.
- **Decision Maker:** As a decision maker, I want alternative interventions ranked against expected outcomes and constraints so that I can understand trade-offs rather than receiving one opaque recommendation.
- **Learning Owner:** As an innovation/learning owner, I want CogniX to measure whether learned patterns remain valid over time so that stale organisational assumptions are not treated as permanent truth.
- **Platform Engineer:** As a platform engineer, I want independently owned APIs, events and service boundaries so that CogniX capabilities can scale and evolve without requiring deployment of the entire application.

---

### Execution Dependency Order Discipline
$$\text{Architecture/APIs} \rightarrow \text{Enterprise World} \rightarrow \text{Journey Telemetry} \rightarrow \text{Shared Decision State} \rightarrow \text{Memory/Learning APIs} \rightarrow \text{ML Models}$$

---

### Non-Goals for Initial Execution
- Do **NOT** build dozens of microservices (start with 7 deployables).
- Do **NOT** require Kubernetes-first architecture (use Docker Compose).
- Do **NOT** introduce Apache Kafka prematurely (use Redis Streams / NATS).
- Do **NOT** implement autonomous model retraining without human gates.
- Do **NOT** create raw cross-tenant data sharing or un-governed LLM decision engines.

---

# PHASE 11 — IP AND INNOVATION GOVERNANCE
- **Objective:** Integrate IP classification metadata badges and provenance tracking directly into UI and exports.
- **Scope:** IP badge indicators, exportable experiment blueprint sheets, legal disclaimers.

---

# PHASE 12 — INDUSTRY DEMONSTRATION PACKS
- **Objective:** Provide pre-packaged domain ontologies for Retail (Online Grocery, Omnichannel, Discount Retail) and CPG.
- **Scope:** `config/industry-packs.ts`, scenario dataset expansion, context switcher UI.

---

# PHASE 13 — INNOVATION OPERATING MODEL & KNOWLEDGE CAPTURE
- **Objective:** Capture executive demo feedback, client curiosity reactions, and experiment evolution history.
- **Scope:** Demo feedback logging form, experiment maturity lifecycle tracker, retirement archive viewer.
