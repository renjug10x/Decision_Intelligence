# COGNIX TARGET ARCHITECTURE SPECIFICATION

**Document Status:** Approved & Authoritative
**Version:** 1.1.1
**Effective Date:** August 2026
**Owner:** G10X Architecture Review Board

---

## 1. Architectural Overview & Philosophy

The CogniX Target Architecture is designed for **flexibility, rapid experiment iteration, client-neutral core isolation, and deterministic demo fidelity**.

It transitions the codebase from a single-brand retail POC into a layered, modular Enterprise Innovation Lab platform.

---

## 2. Layered Target Architecture

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                          COGNIX PRESENTATION LAYER                       │
│  [ Innovation Portfolio ] [ Curiosity Engine ] [ Experiment Canvas ]    │
│  [ Executive Journey ]    [ Questions Worth Asking ] [ Evidence Drawer]  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                         COGNIX EXPERIMENT REGISTRY                      │
│   Commitment Intelligence  │ Decision Ripple  │ Enterprise Memory       │
│   Opportunity Intelligence │ Category (Pack)  │ Supply Chain (Pack)     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                        COGNIX CORE DOMAIN SERVICES                      │
│   [ Commitment Propagation Engine ] [ Decision Ripple Simulator ]       │
│   [ Curiosity Question Generator ]  [ Evidence & Confidence Scorer ]    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                        ABSTRACTION & ADAPTER LAYER                      │
│   [ Industry Pack Adapter ]   [ Client Demo Context Config ]             │
│   [ AI Provider Abstraction ] [ Semantic Data Layer Adapter ]           │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                       EXTERNAL INTEGRATION PROVIDERS                    │
│   [ Google Gemini AI (2.0/1.5)]  [ Looker Semantic Layer Mock ]         │
│   [ Synthetic Causal Datasets ]  [ G10X Accelerator Blueprints ]        │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Layer Definitions

### 3.1 Presentation Layer (`app/*`, `components/*`)
- **App Shell (`app/page.tsx`):** Light, spacious frame hosting topbar, logo, global client context switcher, and tab view renderer.
- **Sidebar (`components/Sidebar.tsx`):** Clean navigation grouped into:
  - *Innovation Lab* (Portfolio, Explorer, Questions Worth Asking)
  - *Active Experiments* (Commitment Intelligence, Decision Ripple Intelligence, Enterprise Memory)
  - *Industry Demonstration Packs* (Retail & Supply Chain Pack)
  - *Governance & Architecture* (IP Registry, Platform Architecture)
- **Design System Tokens (`app/globals.css`):** Replaced legacy Lidl colors with G10X Enterprise palette (Slate neutrals, Precision Blue `#0066FF`, Violet curiosity `#8B5CF6`).

### 3.2 Experiment Registry & Canvas (`lib/experiment-registry.ts`, `components/ExperimentCanvas.tsx`)
- Centralized registration mechanism loading canonical experiment definitions.
- Dynamic rendering of problem statements, provocative questions, business value, confidence metrics, and interactive scenario controls.

### 3.3 Core Domain Propagation (`packages/contracts/src/decision-state-model.ts`, `components/CommitmentIntelligence.tsx`, `components/DecisionRippleIntelligence.tsx`)

> **Runtime-truth correction — 2026-08-15.** Earlier revisions of this section named `lib/commitment-engine.ts` and `lib/ripple-engine.ts`. **Neither file exists in this repository.** Commitment Propagation and Decision Ripple are *demonstration capabilities rendered in the presentation layer*, not standalone domain engines. The only deterministic cross-functional propagation in the codebase is `calculateDerivedImpacts()`. Downstream governance — including CDI-04 Campaign Decision Readiness & Resilience — is defined against that function and against `DecisionDerivedImpacts`, never against a Decision Ripple engine.

- **Deterministic Derived Impact Engine (`packages/contracts/src/decision-state-model.ts:97` — `calculateDerivedImpacts()`, WP10-C):** the single authoritative, pure cross-functional propagation. From `DecisionScenarioParameters` plus applied interventions it derives `weekly_demand_units`, `supplier_capacity_units`, `commitment_gap_units`, `delivery_risk_pct`, `financial_exposure_gbp` (1st order), `dc_overtime_hours` (2nd order) and `margin_erosion_pct` (3rd order). Consumed through `lib/decision-state-store.ts` / Shared Decision State.
- **Commitment Propagation (`components/CommitmentIntelligence.tsx`):** presentation surface for the chain `Marketing → Demand → Supplier → Inventory → Fulfilment → Delivery → Customer` — drift, financial exposure and broken commitment point. Stage figures are computed **inline in the component** over Shared Decision State parameters; there is no callable commitment engine module.
- **Decision Ripple (`components/DecisionRippleIntelligence.tsx`):** presentation surface for 1st/2nd/3rd-order impact when a decision parameter (e.g. promo spend +15%) is mutated. Its figures are **inline component literals**, not engine output.
- **Consumption rule (binding on downstream packages):** any capability requiring cross-functional propagation reads `DecisionDerivedImpacts` **read-only** via Shared Decision State. It must not read presentation-layer literals, must not recompute ripple arithmetic of its own, and must not write to Decision State.

### 3.4 AI & Provider Abstraction (`lib/gemini.ts`, `lib/ai-provider.ts`)
- Isolates LLM interactions behind an abstract interface: `generateNarrative(context)`, `generateCuriosityQuestions(evidence)`.
- Generates natural language summaries and executive brief synthesis based on deterministic causal engine output.

### 3.5 Industry Pack & Client Context (`config/industry-packs.ts`, `context/ClientContext.tsx`)
- Decouples sector terminology and synthetic data.
- Allows switching runtime context between **Grocery / Retail**, **Omnichannel**, or **Generic Enterprise** during live demos without code changes.

---

## 4. Security, Governance & Observability

- **IAM Role Simulation:** Executive, Category Lead, Store Lead role switcher demonstrating governed access to metrics.
- **IP Metadata Tracking:** Every experiment view displays IP status badge (`G10X Proprietary`, `Open Innovation`).
- **Telemetry & Logging:** Client interaction telemetry logged to facilitate post-demo learning capture.

---

## 5. Target Adaptive Service Architecture (Planned Future State)

CogniX is transitioning to an **API-first, event-aware, multi-tenant adaptive platform**. Deep technical specs are defined in [`ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md).

### 5.1 Initial 7-Deployable Container Topology
1. `cognix-web` — Next.js presentation application.
2. `cognix-core` — API Gateway / BFF & Portfolio Metadata.
3. `cognix-world` — Synthetic Enterprise World Engine (`T-90` to `T+30`).
4. `cognix-decision` — Shared Decision State Orchestrator.
5. `cognix-learning` — Enterprise Memory & Learning Pattern Service.
6. `cognix-intelligence` — ML Model Serving & Gemini Reasoning Service.
7. `cognix-governance` — Commercial Contract Verification & Execution Engine.

### 5.2 13 Bounded Logical Domains
- **API Gateway / BFF Domain:** Ingress, auth tokens, tenant scope, correlation IDs.
- **Identity & Tenant Domain:** Multi-tenant scoping, roles, Looker RLS permissions.
- **Portfolio Domain:** Experiment catalog, solution registry, IP metadata.
- **Enterprise World Domain:** Causal data engine across demand, inventory, supply chain.
- **Decision State Domain:** Shared cross-solution state manager.
- **Journey Domain:** Ingestion for client telemetry events (`journey.event.emitted`).
- **Memory Domain:** Historical precedent cases (`EnterpriseMemoryCase`).
- **Learning Domain:** Reusable organizational patterns (`EnterpriseLearningPattern`).
- **Model (ML) Domain:** Pattern similarity, outcome prediction, intervention ranking.
- **Intelligence Domain:** Intelligence Moments & Gemini narrative synthesis.
- **Contracts Domain:** Commercial SLA checks (`CTR-FD-2024-001`) & backup activation.
- **Execution Domain:** Execution Briefing dispatch & AppSheet/ERP webhooks.
- **Connector Domain:** Data normalisation for BigQuery, Looker SDK, ERP, CRM.

### 5.3 Storage & Isolation Architecture
- **PostgreSQL Schemas:** Isolated schemas (`identity.*`, `world.*`, `decision.*`, `memory.*`, `learning.*`, `contracts.*`). No direct cross-schema queries.
- **Redis:** Used for session caching, ephemeral Decision State, and initial event transport.
- **Multi-Tenant Learning Scopes:** Strict separation between Tenant-Private Learning, Cross-Tenant Generalised Learning (G10X IP), and Global Synthetic Learning. No cross-tenant data leakage.

---

## 6. Campaign Decision Intelligence Architecture

CogniX establishes **Campaign Decision Intelligence** as a core domain capability connecting:
$$\text{Opportunity Intel} \longrightarrow \text{Campaign Decision Intel} \longrightarrow \text{Decision Contract} \longrightarrow \text{Intent Fusion} \longrightarrow \text{Demand/Forecast} \longrightarrow \text{Signals} \longrightarrow \text{Decision State} \longrightarrow \text{Ripple} \longrightarrow \text{Memory} \longrightarrow \text{Learning}$$

### 6.1 The Five Decision Questions
Campaign Decision Intelligence answers five fundamental retail decision questions:
1. **Should we intervene?** (Determines if intervention creates more value than doing nothing).
2. **What intervention should we make?** (Evaluates promotions, markdowns, bundling, loyalty activation, assortment changes, inventory reallocations, cross-merchandising, supplier-funded activations, localized campaigns, channel interventions, or doing nothing).
3. **Where and when should we intervene?** (Discovers optimal timing, campaign windows, regions, store cohorts, micro-markets, customer cohorts, and fulfilment channels).
4. **What happens elsewhere if we intervene?** (Models consequences across demand, revenue, contribution, margin, inventory, availability, waste, cannibalisation, substitution, halo, basket effects, demand pull-forward, supply pressure, labor, neighbouring stores, and channels).
5. **What did reality teach us?** (Compares prediction against actual execution, storing evidence with explicit provenance in Enterprise Memory and Learning).

### 6.2 The 14 Core Capabilities
1. **Campaign Decision Canvas:** 4-area input framework (Campaign Intent, Baseline & Objective, Audience & Market, Decision Context).
2. **Counterfactual Baseline:** Distinguishes *What is happening now* vs *What would happen without intervention* vs *What is predicted if intervention occurs*.
3. **Causal Campaign Model:** Evaluates intrinsic demand, promotion response, audience response, place response, temporal response, external signals, and portfolio effects.
4. **Opportunity Window Discovery:** Supports both "I know my dates" and "Find the best window" timing discovery.
5. **Micro-Market Opportunity Graph:** Evaluates Store + Catchment + Customer Missions + Demographics + Competitors + Inventory + Events + Fulfilment Channels + Neighbouring Stores.
6. **Campaign Decision Readiness:** Evaluates 6 dimensions (Commercial, Demand, Operational, Context, Customer, Strategic) producing explainable readiness states (GO, CONDITIONAL GO, REVIEW, DO NOT PROCEED).
7. **Decision Timeline:** Visualizes historical actual + counterfactual + campaign + confidence envelope + constraints + context events across Demand, Revenue, Contribution, and Inventory lenses.
8. **Curiosity-Driven Demand Decomposition:** Progressive disclosure flow (`What? → Why? → Evidence → What If?`).
9. **Multi-Objective Outcome Frontier:** Evaluates Pareto-efficient strategy trade-offs (Maximum Growth, Maximum Contribution, Maximum Waste Reduction, Balanced).
10. **AI-Generated Competing Strategies:** Generates Growth Play, Margin-Protected Play, Waste-Reduction Play, Customer-Acquisition Play, Scenario 0 (Do Nothing), and Non-Promotion Alternatives.
11. **Decision Contract & Intent Fusion:** Reconciles Statistical Forecast + Commercial Intent + Observed Signals + Contextual Factors + Operational Constraints $\rightarrow$ Contextualised Demand Outlook.
12. **Decision Half-Life:** Describes how the evidential basis of a decision weakens or remains valid as assumptions and signals evolve. Represented through validity states (STABLE, WATCH, DEGRADED, REASSESS_REQUIRED, INDETERMINATE) and evidence-triggered reassessment. No duration, countdown, expiry or decay curve — quantitative duration is unavailable until calibrated temporal evidence exists.
13. **Campaign Pre-Mortem:** Enumerates failure modes from evidence the estate has already declared — open readiness conditions, vetoes, constraint eliminations and load-bearing decision assumptions — with their consequence order and resilience evidence, reusing the existing Decision Ripple ordering rather than creating a parallel risk engine. No likelihood, probability, impact score or severity score is produced: the estate holds no failure-frequency history and no calibrated impact model, so a failure mode publishes what it is grounded in rather than a number.
14. **Closed Learning Loop:** Closes the operational loop (`Prediction → Decision → Execution → Observation → Outcome Comparison → Learning → Memory → Future Decision`). A comparison is evidence only where the predicted and observed quantities share a grain and a measurement basis; where they do not, the outcome is indeterminate with the missing authoritative capability named. Prediction error describes model and outcome divergence, never whether the decision itself was good or bad.

---

## 7. Demand Decision Intelligence Architecture (`DDF` / `DOT`)

Governance, canonical demand vocabulary, domain principles, the maturity model and the roadmap families are specified in [`DEMAND_OBSERVABILITY_MODEL.md`](../governance/DEMAND_OBSERVABILITY_MODEL.md). Architectural rulings are ADR-040 … ADR-043. Registration and sequencing are in [`MASTER_PLAN.md`](../governance/MASTER_PLAN.md).

### 7.1 Runtime truth — what the Demand & Forecast surface actually computes today

> **Runtime-truth statement — 2026-08-16, established by reconciliation against `7ad9c2df`.** `INTENT_FUSION_INTELLIGENCE.md` §5.2 records that `Forecasting.tsx` "displays" the `IFI-01` decomposition. It does — **as hardcoded JSX literals** (`components/Forecasting.tsx:368–418`). The component's only network call is `GET /api/data?type=forecast` (`:158`); it **never calls** `POST /api/v1/intent-fusion/evaluate`, and the only callers of `evaluateIntentFusion` are that route handler and the engine itself. The displayed `+12% / +7% / +3% / +22% / +10% / 12pp` values therefore do not move when the Promotion Lift slider moves. Supplier capacity exists in **three** independent places — the Shared Decision State parameter `supplier_capacity_cap` consumed by `calculateDerivedImpacts()`, the constant `supplierCapacityCapPct = 10` at `lib/intent-fusion/intent-fusion-engine.ts:36`, and the surface literal. Downstream governance is defined against the **engine**, never against the surface literals.

The genuinely computed parts of the surface are the projection series (`getForecastProjections()` in `lib/query-engine.ts:453` via `app/api/data/route.ts:61`), the three KPI cards derived from it, the rules-driven proactive-risk list, and the Shared Decision State binding for `promotion_lift` and `forecast_horizon_days`. `DDF-01` builds on those and corrects the rest.

### 7.2 Composition — no new domain engine

`DDF-01` is an **evolutionary extension of existing contracts**, not a parallel demand domain:

```text
  ESF-1 / ESF-2  EnterpriseSignal (baseline, observed, delta, observed_at)
        │  divergence over time
        ▼
  [ Forecast Stability ]  ── revision pressure ──┐        (ADR-040)
                                                 ▼
  IFI-01  ContextualisedDecisionOutlook ──> [ Emerging Demand Frontier ]
        (engine-bound, not literal)                    │
                                                       │      (ADR-041)
  WP10-C  DecisionDerivedImpacts (read-only) ──> [ Executable Demand Frontier ]
        supplier_capacity_units, commitment_gap_units,       │
        stockout_probability_pct, financial_exposure_gbp     ▼
                                              [ Decision Gap + exposed demand ]
                                                       │
  DeclaredInterventionConstraint ──> [ Decision Window ]│    (ADR-042)
                                                       ▼
                                        [ Decision Regret: ACT_NOW | WAIT | DO_NOTHING ]
                                                       │    (ADR-043)
                                                       ▼
                              [ Recommendation ] ──> [ Intervention Simulation ] ──┐
                                                       ▲                            │
                                                       └──── recompute ─────────────┘
```

**Binding composition rules.**
- **No new demand engine.** The constraint arithmetic (`calculateDerivedImpacts`) and the demand decomposition (`evaluateIntentFusion`) already exist. A new engine would fork both and drift.
- **`ARCHITECTURE.md` §3.4 consumption rule applies unchanged:** the executable frontier reads `DecisionDerivedImpacts` **read-only** through Shared Decision State, does not recompute ripple arithmetic, and does not write to Decision State.
- **No new signal type**, no new `ExternalSignalCategory`, no new `SignalSourceType`, and no new origin of `synthetic_demo = false` (ADR-038 stands).
- **`DO_NOTHING` reuses the `CDI-02` counterfactual baseline semantics.** The estate does not get a second Do-Nothing.
- **Deterministic first, learned later, without a contract break.** Contract shapes are designed for the learned version; the implementation states plainly that it is the deterministic one.

### 7.3 Demand Observability boundary

`DOT-1` … `DOT-12` are roadmap. The load-bearing architectural constraints are that the Demand Evidence Ledger (`DOT-9`) extends the `EnterpriseSignal` contract and the `ESF-6` admission path rather than becoming a parallel signal system, and that Intent Resolution (`DOT-10`) is a hard prerequisite for publishing any latent-demand **quantity** — several signals expressing one customer intent must not become several units of demand.
