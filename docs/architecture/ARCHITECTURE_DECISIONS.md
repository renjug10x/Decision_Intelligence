# COGNIX ARCHITECTURE DECISION RECORDS (ADR)

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
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
