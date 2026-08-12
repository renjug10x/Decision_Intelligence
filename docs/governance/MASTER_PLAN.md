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

# PHASE 9 — IP AND INNOVATION GOVERNANCE
- **Objective:** Integrate IP classification metadata badges and provenance tracking directly into UI and exports.
- **Scope:** IP badge indicators, exportable experiment blueprint sheets, legal disclaimers.

---

# PHASE 10 — INDUSTRY DEMONSTRATION PACKS
- **Objective:** Provide pre-packaged domain ontologies for Retail (Online Grocery, Omnichannel, Discount Retail) and CPG.
- **Scope:** `config/industry-packs.ts`, scenario dataset expansion, context switcher UI.

---

# PHASE 11 — INNOVATION OPERATING MODEL & KNOWLEDGE CAPTURE
- **Objective:** Capture executive demo feedback, client curiosity reactions, and experiment evolution history.
- **Scope:** Demo feedback logging form, experiment maturity lifecycle tracker, retirement archive viewer.
