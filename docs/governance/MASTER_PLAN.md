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
- **ESF-3 — External Signal Connector Contract:** Abstraction layer enabling production signal feeds (commerce telemetry, enterprise planning systems like Blue Yonder/SAP IBP, campaign platforms, logistics telemetry) to publish into the canonical `EnterpriseSignal` contract. *Dependencies: ESF-1.*
- **ESF-4 — Signal Quality, Confidence & Provenance:** Signal reliability metrics, freshness tracking, completeness scoring, and source classification (`synthetic_world`, `commerce_telemetry`, `planning_system`, `supplier_feed`). *Dependencies: ESF-2, ESF-3.*
- **ESF-5 — Learned Signal Behaviour:** ML phase scoring signal sequences, precursor patterns, and signal-to-outcome correlations against historical memory precedents. *Dependencies: WP10-D, ESF-4, Phase 10F.*

---

### Innovation Capability — Intent Fusion Intelligence (IFI)
A reusable cross-functional intelligence mechanism reconciling Commercial Intent, baseline enterprise forecasts, observed Enterprise Signals, and downstream commitments into Shared Decision State.

- **IFI-01 — Intent Fusion Integration [COMPLETED]:** Cross-solution decision context integration linking Commercial Intent (`PromotionPlanner`), Demand Contextualisation (`Forecasting`), Commitment Gap Rehearsal (`CommitmentIntelligence`), Inventory Exposure (`AvailabilityIntelligence`), Multi-Order Consequence Ripple (`DecisionRipple`), Pattern Matching (`EnterpriseMemory`), Contract SLA Check (`ContractVerification`), and Executive Action (`ExecutionBriefing`). *Dependencies: WP10-A, WP10-B, WP10-C, ESF-1, ESF-2. Strengthened by WP10-D.*

---

### Roadmap Dependency Structure
```text
  WP10-A Enterprise World
           ↓
  WP10-B Journey Telemetry
           ↓
  WP10-C Shared Decision State
           │
     ┌─────┴───────────────┐
     ▼                     ▼
   ESF-1                 WP10-D Memory & Learning API Extraction
   (Signal Contract)     (Preserved Intact)
     ↓                     │
   ESF-2                   │
   (Dynamic Simulation)    │
     ↓                     │
   IFI-01 ◄────────────────┘ (Optional Enhancement Path)
   (Intent Fusion)
```

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
