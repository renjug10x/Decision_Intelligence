# COGNIX ADAPTIVE INTELLIGENCE & SERVICE ARCHITECTURE BLUEPRINT

**Document Status:** Authoritative Architectural Blueprint & Roadmap
**Version:** 1.0.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Steering Group

---

## 1. Executive Strategic Vision

CogniX is evolving from a collection of deterministic demonstrations into a **living, adaptive enterprise environment**. In this next generation architecture:

- Tenants operate against distinct, causally coherent enterprise worlds.
- Every meaningful user interaction generates an observable event.
- Decisions made in one solution alter a shared, cross-cutting enterprise decision state.
- Enterprise memory and learning patterns are retrieved and ranked using machine learning models rather than static rules.
- Intelligence is surfaced proactively through **Intelligence Moments** when enterprise state changes materially.
- The system continuously measures whether recommendations worked and decays pattern confidence when outcomes contradict past precedents.
- Capabilities are decomposed into independently scalable domain services behind clear API and event contracts.

---

## 2. Core Architectural Principles

### Principle A — Screens Do Not Own Intelligence
> **"CogniX screens consume intelligence. Domain services own intelligence."**
UI components are presentation containers. Business logic, learning models, decision state, contract rules, and execution engines reside strictly inside backend domain services.

### Principle B — Every Meaningful Interaction Is Observable
> **"Every meaningful user action generates an observable event capable of influencing current and future decision state."**
Actions such as scenario adjustments, evidence inspections, recommendation accepts/rejects, pattern explorations, contract checks, and decision executions are emitted as structured telemetry events.

### Principle C — API-First Architecture
Capabilities follow a strict contract-first progression:
$$\text{Domain Model} \longrightarrow \text{API Contract (OpenAPI)} \longrightarrow \text{Event Schema} \longrightarrow \text{Service Implementation}$$

### Principle D — Decompose by Business Capability
Services are bounded by domain ownership, data isolation, scaling characteristics, security requirements, and computational behavior—not by screen or UI component boundaries.

### Principle E — Shared Enterprise Reality
All experiments and demonstration solutions operate against one coherent, temporal **Enterprise World + Decision State**, eliminating isolated, disconnected mock datasets.

### Principle F — Strict Intelligence Layer Separation
CogniX explicitly separates four intelligence responsibilities:
1. **Deterministic Layer:** Hard rules, financial calculations, contract clauses, SLA thresholds.
2. **ML & Statistical Layer:** Pattern matching, anomaly detection, outcome prediction, intervention ranking, and behavioral adaptation.
3. **Optimisation Layer:** Multi-variable trade-off selection under commercial constraints.
4. **Generative AI Layer (Gemini):** Synthesis, narrative explanation, root-cause storytelling, and curiosity prompt generation. Gemini is **never** used as the sole decision engine.

---

## 3. Initial 7-Deployable Service Topology

To prevent premature microservice complexity, CogniX establishes an initial topology of **seven deployable services** running via Docker Compose locally and managed containers in production:

```text
                               ┌───────────────────────────┐
                               │        cognix-web         │
                               │   (Next.js Presentation)  │
                               └─────────────┬─────────────┘
                                             │ HTTP / REST (/api/v1)
                               ┌─────────────┴─────────────┐
                               │        cognix-core        │
                               │   (BFF / Portfolio Meta)  │
                               └─────────────┬─────────────┘
                                             │ Event Bus (Redis Streams / NATS)
        ┌──────────────────┬─────────────────┼──────────────────┬──────────────────┐
        │                  │                 │                  │                  │
┌───────┴──────┐   ┌───────┴──────┐  ┌───────┴──────┐   ┌───────┴──────┐   ┌───────┴──────┐
│ cognix-world │   │cognix-decision│ │cognix-learning│   │  cognix-intel│   │cognix-govern │
│ (Enterprise) │   │ (SharedState)│  │(Memory/Patt) │   │ (ML/Gemini)  │   │(Contract/Exec│
└──────────────┘   └──────────────┘  └──────────────┘   └──────────────┘   └──────────────┘
```

### Deployable Boundaries & Initial Scope
1. **`cognix-web`:** Next.js presentation frontend. Owns UI rendering, client-side state, and visual component orchestration only.
2. **`cognix-core`:** API Gateway / BFF. Handles portfolio metadata, demonstration session state, industry pack configs, user authentication/authorization, and request routing.
3. **`cognix-world`:** Synthetic Enterprise World engine. Generates causally coherent, multi-tenant temporal supply chain, demand, and inventory telemetry across `T-90` to `T+30`.
4. **`cognix-decision`:** Shared Decision State orchestrator. Manages cross-solution decision propagation between Promotion, Demand, Inventory, Category, Commitment, and Ripple views.
5. **`cognix-learning`:** Enterprise Memory & Learning Pattern service. Manages historical case memory (`EnterpriseMemoryCase`), pattern retrieval (`EnterpriseLearningPattern`), and pattern lifecycle.
6. **`cognix-intelligence`:** Intelligence & ML orchestration service. Houses pattern similarity matching, outcome prediction models, intervention rankers, and Gemini reasoning pipelines.
7. **`cognix-governance`:** Commercial Contract Verification & Execution engine. Executes contract SLA checks, clause verification, backup supplier auto-activation, and Execution Briefing dispatches.

### Future De-coupling / Split Points
As load, security, or domain ownership demands grow, initial deployables decompose naturally:
- `cognix-learning` $\longrightarrow$ `memory-service` + `pattern-service`
- `cognix-intelligence` $\longrightarrow$ `model-service` + `reasoning-service`
- `cognix-governance` $\longrightarrow$ `contract-service` + `execution-service`

### 4.3 WP10-C Shared Decision State Foundation Architecture [IMPLEMENTED]
- **Deployment Decision:** Integrated logically within Next.js BFF proxy gateway (`app/api/v1/decision-state/`) under Option A, preserving an explicit service extraction boundary for future `cognix-decision`.
- **API Specification:** OpenAPI 3.1 specification (`docs/openapi/decision-state-v1.yaml`).
- **Domain Model & Contracts:** `packages/contracts/src/decision-state-model.ts` providing transport-neutral types, command registry, deterministic derived impact calculator, and validation logic.
- **Store & Concurrency Engine:** Replaceable store abstraction `IDecisionStateStore` (`lib/decision-state-store.ts`) enforcing optimistic concurrency versioning (`v1 → v2`), version history snapshots, provenance mapping, and session/tenant isolation boundaries.
- **Cross-Functional Propagation Flow:**
```text
Enterprise World (baseline)
      ↓
Shared Decision State (v1)
      ↑
User Command (e.g. Promotion Lift +28%)
      ↓
State Versioning (v2) + Deterministic Impact Recalculation
      ├── Promotion: Lift +28%
      ├── Demand & Forecast: Demand 12,800 units (+28%)
      ├── Commitment: Supplier Gap 1,800 units
      ├── Inventory: Availability Exposure +58%
      ├── Decision Ripple: 2nd Order Overtime 23h, 3rd Order Erosion 3.1%
      └── Opportunity: Evaluates available intervention context

      +

### 4.4 Enterprise Signal Fabric (ESF) Architecture [GOVERNANCE BLUEPRINT]
- **Fundamental Signal Separation Principle:** CogniX strictly distinguishes between **User Journey Telemetry** ("What did the CogniX user do?") and **Enterprise Signals** ("What is happening in the enterprise, customer environment, operations, or market?"). Telemetry events log UI actions (`SESSION_STARTED`, `SCENARIO_CHANGED`); Enterprise Signals represent operational data (`basket_add_acceleration`, `supplier_lead_time_drift`, `slot_booking_pressure`).
- **The Five Information Classes:**
  1. *Enterprise World:* Authoritative baseline reality.
  2. *Enterprise Forecast:* Expected demand trajectory from upstream platforms (Blue Yonder / SAP IBP).
  3. *Commercial Intent:* Planned enterprise campaign actions (e.g., 20% Off, T+7 in North West).
  4. *Observed Enterprise Signals:* Emerging early customer and supply chain behavior.
  5. *Shared Decision State:* Reconciled decision context combining all 4 sources right now.
- **Synthetic-First, Connector-Compatible Architecture:** Synthetic enterprise signals generated by `cognix-world` adhere strictly to the canonical `EnterpriseSignal` schema, rendering synthetic demo feeds interchangeable with future production connectors without changing UI or state handling.
- **Causality & Deterministic Advance:** Synthetic signals evolve dynamically based on active scenario parameters and state transitions (`Intent Registered → Engagement Accelerates → Slot Pressure Emerges → Demand Materialises`). Signals never claim to learn autonomously prior to Phase 10F ML.

### 4.5 Intent Fusion Intelligence (IFI) Architecture [GOVERNANCE BLUEPRINT]
- **Positioning:** Intent Fusion is a **reusable cross-functional intelligence mechanism**, not a top-level solution product or replacement forecasting engine.
- **Executive Value Proposition:** *"What if every operational decision knew what the business was planning before demand reacted?"*
- **Cross-System Information Flow:**
```text
Existing Enterprise Forecast (Upstream)
        +
Commercial Intent (Promotion Intelligence)
        +
Observed Enterprise Signals (Signal Fabric)
        ↓
Shared Decision State (Reconciled Context)
        ↓
Commitment Gap & Inventory Exposure Rehearsal
```

---

```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CogniX Logical Domains                                 │
├─────────────────┬─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│ 1. Gateway/BFF  │ 2. Identity     │ 3. Portfolio    │ 4. World        │ 5. Decision      │
├─────────────────┼─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ 6. Journey      │ 7. Memory       │ 8. Learning     │ 9. Model (ML)   │ 10. Intelligence │
├─────────────────┴─────────────────┼─────────────────┴─────────────────┼──────────────────┤
│ 11. Contracts                     │ 12. Execution                     │ 13. Connectors   │
└───────────────────────────────────┴───────────────────────────────────┴──────────────────┘
```

1. **API Gateway / BFF Domain:** Ingress, auth tokens, tenant scope injection, rate limiting, request correlation IDs (`x-correlation-id`), response aggregation.
2. **Identity & Tenant Domain:** Tenant profiles, user personas, roles, data access scope (Looker RLS), session contexts.
3. **Portfolio Domain:** Experiment metadata, demonstration solution catalog, maturity stages, IP classification badges, cross-solution navigation blueprints.
4. **Enterprise World Domain:** Causal data generation across demand, inventory, supply chain, store networks, financial economics, and competitor signals.
5. **Decision State Domain:** Cross-solution state manager. Ensures a supplier backup activation in Promotion Intelligence updates inventory headroom in Inventory Intelligence.
6. **Journey Domain:** Ingestion and analytics for user telemetry event streams (`SESSION_STARTED`, `SCENARIO_CHANGED`, `PATTERN_MATCHED`, `DECISION_EXECUTED`).
7. **Memory Domain:** Operational memory database answering *"Have we seen this precedent before?"* (`EnterpriseMemoryCase`).
8. **Learning Domain:** Organisational pattern engine answering *"What consistently happened and what consistently worked?"* (`EnterpriseLearningPattern`).
9. **Model (ML) Domain:** Machine learning serving layer hosting pattern similarity algorithms, statistical outcome predictors, and intervention rankers.
10. **Intelligence Domain:** Synthesizes Intelligence Moments, assembles evidence packages, and prompts Gemini for narrative storytelling.
11. **Contracts Domain:** Evaluates commercial contract clauses, SLA breach thresholds (`CTR-FD-2024-001`), and auto-activation rules (`CTR-TP-2023-008`).
12. **Execution Domain:** Generates Execution Briefings (`components/ExecutionBriefing.tsx`), tracks ownership, timing, dependencies, and dispatches external ERP/AppSheet webhooks.
13. **Connector Domain:** Normalises incoming data and outgoing write-backs to Google BigQuery, Looker SDK, ERP, and CRM platforms.

---

## 5. Temporal Seed & Enterprise World Model

To provide realistic trajectory analysis, the Enterprise World Domain models state across a temporal timeline:

$$\text{Timeline}: [T-90 \longrightarrow T-30 \longrightarrow T-7 \longrightarrow \mathbf{\text{Today}} \longrightarrow T+7 \longrightarrow T+30]$$

- **History ($T-90$ to $T-1$):** Provides empirical baseline trends, past seasonal promotions, baseline waste rates, and historical supplier delivery performance.
- **Present ($\text{Today}$):** Active operational telemetry, current inventory levels, live weather/demand anomalies, and pending supplier SLA breaches.
- **Projection ($T+1$ to $T+30$):** Simulated forward trajectories under baseline versus modified scenario parameters (e.g. promo depth, supplier shift).

### Scenario Families
1. **Promotion Surge & Capacity Mismatch**
2. **Weather-Driven Demand Shift**
3. **Supplier Deterioration & SLA Breach**
4. **Competitor Aggressive Price Matching**
5. **Fresh Category Perishable Waste Acceleration**
6. **Category Cannibalisation (Premium vs Standard)**
7. **Distribution Center Labour & Overtime Propagation**
8. **Regional Inventory Imbalance**

---

## 6. Multi-Tenancy & Data Isolation

Multi-tenancy is a foundational requirement enforced at API, persistence, event, and ML model layers:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Multi-Tenant Learning Scopes                        │
├──────────────────────────────┬──────────────────────────────┬───────────────┤
│ Tenant-Private Learning      │ Cross-Tenant Generalised     │ Global Synth. │
│ (Proprietary Data & Memory)  │ (Anonymised Reusable Patterns)│ (CogniX Demo) │
└──────────────────────────────┴──────────────────────────────┴───────────────┘
```

- **Tenant-Private Scope:** Operational cases, decisions, and outcomes derived from a specific enterprise's data. Strictly isolated by `tenant_id`. Never shared or exposed to other tenants.
- **Cross-Tenant Generalised Scope:** Anonymised, structural learning patterns (e.g. general supplier lead-time breach dynamics) scrubbed of proprietary identifiers and converted into reusable G10X IP.
- **Global Synthetic Scope:** Baseline demonstration datasets provided out-of-the-box in CogniX.

---

## 7. Storage Strategy & Schema Ownership

Each service owns its persistence layer. Direct cross-service database queries are **strictly prohibited**. Services interact exclusively via REST APIs or Event Streams.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                        Managed PostgreSQL Instance                          │
├─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬───────┤
│ identity.*  │ portfolio.* │  world.*    │ decision.*  │  memory.*   │ ...   │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴───────┘
```

- **PostgreSQL (Service Schemas):** Single managed PostgreSQL instance initially, utilizing isolated schemas (`identity.*`, `world.*`, `decision.*`, `memory.*`, `learning.*`, `contracts.*`). Utilizes `pgvector` for memory/pattern vector embeddings.
- **Redis:** Used for session caching, ephemeral Decision State synchronization, rate limiting, and initial stream transport.
- **Object Storage:** Stores unstructured contract PDFs/HTML documents, export blueprints, and ML model artifacts.

---

## 8. API-First Specification (`/api/v1/...`)

All future endpoints adhere to OpenAPI 3.1 specifications.

### Canonical Endpoints
- `GET /api/v1/experiments` — List innovation experiments with IP metadata.
- `GET /api/v1/scenarios` — Retrieve temporal Enterprise World scenarios for active tenant.
- `GET /api/v1/decision-state` — Fetch active cross-solution Decision State.
- `POST /api/v1/decision-state/transition` — Apply scenario change or intervention to Decision State.
- `POST /api/v1/journey/events` — Ingest client journey telemetry event stream.
- `GET /api/v1/memory/cases` — Retrieve historical case precedents matching current situation signature.
- `GET /api/v1/patterns` — Retrieve ranked Enterprise Learning Patterns.
- `POST /api/v1/contracts/verify` — Execute SLA threshold check and backup contract matching.
- `POST /api/v1/execution/briefing` — Generate contextual Execution Briefing dispatch.

### Standard Request Headers
```http
X-Tenant-ID: tenant_uk_retail_01
X-User-ID: usr_cat_mgr_04
X-Correlation-ID: corr_8f3a9b2c-11e9
Content-Type: application/json
```

---

## 9. Event-Driven Architecture & Canonical Schema

State changes communicate via lightweight event streams (Redis Streams / NATS / RabbitMQ initially; Kafka evaluated only if scale requires).

### Canonical Event Topics
- `world.scenario.changed`
- `decision.state.updated`
- `journey.event.emitted`
- `pattern.matched`
- `contract.verified`
- `execution.briefing.generated`
- `outcome.measured`

### Canonical Event Envelope Schema
```json
{
  "event_id": "evt_99120482-a4f1",
  "event_type": "decision.state.updated",
  "timestamp": "2026-08-12T17:45:00Z",
  "tenant_id": "tenant_uk_retail_01",
  "user_id": "usr_cat_mgr_04",
  "session_id": "sess_8819203",
  "correlation_id": "corr_8f3a9b2c-11e9",
  "payload": {
    "solution_id": "promotion_intelligence",
    "previous_state_hash": "a1b2c3d4",
    "new_state_hash": "e5f6g7h8",
    "changed_variables": {
      "promotion_depth_pct": 28,
      "supplier_sla_risk": "HIGH"
    }
  }
}
```

---

## 10. Intelligence Moments & Adaptive Learning Engine

### Intelligence Moment Concept
An **Intelligence Moment** is an un-prompted, contextual notification generated when a user action or scenario shift causes a material change in risk, opportunity, or pattern match.

$$\text{Trigger Condition}: \Delta \text{Risk} \ge 15\% \quad \lor \quad \text{Similarity}(\text{New State}, \text{Pattern}_k) \ge 85\%$$

### Adaptive Decision Profile & Guardrails
CogniX models how a decision-maker evaluates choices (e.g. margin-focused vs availability-focused).

> **STRICT GOVERNANCE RULE:** Personalization and behavioral adaptation may alter **ranking, presentation order, and UI emphasis**. It may **NEVER** alter measured source facts, objective evidence, contractual constraints, or suppress valid alternative interventions.

### Counterfactual Learning & Pattern Confidence Decay
When a decision is executed and an outcome is observed:
1. Compare `Predicted Outcome` vs `Actual Outcome`.
2. Compute prediction delta: $\Delta = |\text{Predicted} - \text{Actual}|$.
3. If outcomes consistently contradict a pattern across $N \ge 3$ occurrences, decay pattern confidence:
$$\text{PatternConfidence}_{\text{new}} = \text{PatternConfidence}_{\text{old}} \times (1 - \gamma \cdot \Delta)$$
This guarantees that stale organizational assumptions are automatically downgraded over time.

---

## 11. Containerization & Operational Principles

All services must implement:
- **Dockerfile:** Multi-stage minimal OCI-compliant image build.
- **Health Endpoints:** `/health/live` (liveness) and `/health/ready` (readiness).
- **Configuration:** 100% environment-variable driven (12-Factor App methodology).
- **Structured Logging:** JSON log format with mandatory `correlation_id`, `tenant_id`, and `service_name`.
- **Graceful Shutdown:** Intercept `SIGTERM` / `SIGINT` with a 15-second drain window.

---

## 12. 8-Stage Strangler Migration Plan

CogniX will evolve from its current monolithic structure to the service architecture in eight controlled, non-disruptive stages:

```text
[Stage 1: API Contracts] ──> [Stage 2: World Extract] ──> [Stage 3: Telemetry Stream]
                                                                    ↓
[Stage 6: ML Boundary]   <── [Stage 5: Memory Service] <── [Stage 4: Shared State]
         ↓
[Stage 7: Contract/Exec] ──> [Stage 8: Thinned Presentation Application]
```

1. **Stage 1 — API Contracts:** Define OpenAPI specs for core resources around current Next.js application.
2. **Stage 2 — Enterprise World Extraction:** Move scenario generation logic into `cognix-world` service.
3. **Stage 3 — Journey Telemetry Stream:** Implement client event emitter and `cognix-journey` handler.
4. **Stage 4 — Shared Decision State Extraction:** Decouple state management into `cognix-decision`.
5. **Stage 5 — Memory & Learning Service Extraction:** Move `config/patterns.ts` and `lib/contract-library.ts` into `cognix-learning`.
6. **Stage 6 — ML Model Boundary:** Introduce statistical similarity scoring and ranking algorithms inside `cognix-intelligence`.
7. **Stage 7 — Commercial Governance Extraction:** Extract SLA verification and Execution Briefing dispatch into `cognix-governance`.
8. **Stage 8 — Thinned Presentation Application:** `cognix-web` thinned to pure Next.js presentation UI consuming backend APIs.

---

## 13. Dependency Discipline & Non-Goals

### Strict Execution Order
$$\text{Architecture/APIs} \rightarrow \text{Enterprise World} \rightarrow \text{Telemetry} \rightarrow \text{Decision State} \rightarrow \text{Memory/Learning} \rightarrow \text{ML Models}$$

**DO NOT** begin ML development before Enterprise World, Telemetry, and Decision State foundations are fully operational.

### Non-Goals for Next Implementation Wave
- Do **NOT** build dozens of microservices immediately (start with 7 deployables).
- Do **NOT** require Kubernetes-first deployment (use Docker Compose initially).
- Do **NOT** introduce Apache Kafka prematurely (prefer Redis Streams / NATS).
- Do **NOT** attempt fully autonomous model retraining without human review gates.
- Do **NOT** build complex multi-agent graphs or raw cross-tenant data sharing.

---

## 14. Architecture Risk Matrix & Mitigations

| Risk | Severity | Mitigation Strategy |
|---|---|---|
| **Over-decomposition** | High | Limit initial deployment to 7 core deployables; defer further splits until required by scale. |
| **Distributed State Desynchronization** | High | Centralize state transitions in `cognix-decision` with explicit event schemas and correlation IDs. |
| **ML Without Sufficient Telemetry** | High | Enforce dependency order: complete Enterprise World & Journey Telemetry before deploying ML rankers. |
| **Tenant Data Leakage** | Critical | Enforce strict `tenant_id` database schema isolation and multi-tenant test suites. |
| **LLM Overreach** | Medium | Isolate Gemini to Generative AI narrative layer; use deterministic rules & ML for decisions. |
| **Migration Disruption** | High | Use strangler migration pattern; maintain backward-compatible Next.js local API fallbacks. |
