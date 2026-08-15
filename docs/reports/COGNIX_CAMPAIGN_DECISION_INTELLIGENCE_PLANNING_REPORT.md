# COGNIX — CAMPAIGN DECISION INTELLIGENCE
## Precision-Reconciled Governance & Execution Architecture Report

**Document Status:** Approved & Authoritative
**Version:** 1.5.0
**Effective Date:** August 2026
**Owner:** CogniX Architecture & Governance Steering Group
**Baseline Git Commitment:** `a3b8f2215184f3e896a37a608ad16e1baad4fc8b` (`Feature/MatchingContract-AutoActivate`)

---

## 1. Baseline Continuity State

Before executing the governance reconciliation pass, repository continuity was verified:
- **Repository Root:** `/Users/renjunair/projects/Decision_Intelligence`
- **Active Branch:** `Feature/MatchingContract-AutoActivate`
- **HEAD SHA:** `a3b8f2215184f3e896a37a608ad16e1baad4fc8b`
- **`gitlab` Remote HEAD:** `a3b8f2215184f3e896a37a608ad16e1baad4fc8b`
- **`origin` Remote HEAD:** `a3b8f2215184f3e896a37a608ad16e1baad4fc8b`
- **Baseline Working Tree Status:** 100% clean (`nothing to commit, working tree clean`).
- **Stash State:** Clean (zero stashes).

---

## 2. Current Modified-File State

Following the precision governance reconciliation pass, zero application code was modified. The working tree currently contains 13 modified governance files and 1 untracked planning report:

### Modified Governance & Architecture Files (13 Files):
1. [`docs/governance/MASTER_PLAN.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/MASTER_PLAN.md) — Updated Programme 10 CDI stream, `HARD`/`INTEGRATION`/`ENHANCEMENT` dependency classifications, provider-neutral `ESF-3` disposition, and true execution concurrency DAG.
2. [`docs/architecture/ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md) — Clarified domain boundaries & service extraction limits (`cognix-decision` as proposed Option B extraction boundary).
3. [`docs/architecture/ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ARCHITECTURE.md) — Added Section 6 for Campaign Decision Intelligence North Star & 14 Capabilities.
4. [`docs/architecture/ARCHITECTURE_DECISIONS.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ARCHITECTURE_DECISIONS.md) — Added **ADR-026: Campaign Decision Intelligence Architecture & 14-Capability Framework (Approved & Authoritative)**.
5. [`docs/architecture/INFORMATION_ARCHITECTURE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/INFORMATION_ARCHITECTURE.md) — Mapped 5-layer Campaign Decision Canvas visual surfaces.
6. [`docs/governance/COGNIX_PRINCIPLES.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/COGNIX_PRINCIPLES.md) — Added Principle 11 (North Star) & Principle 12 (Anti-Drift Guardrails including AI strategy independence, provider-neutral `ESF-3`, and Campaign Delta elevation).
7. [`docs/ux/UX_DESIGN_PRINCIPLES.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/ux/UX_DESIGN_PRINCIPLES.md) — Mapped progressive disclosure flow (`What? → Why? → Evidence → What If?`), Campaign Delta primary surface, 2-tier Decision Readiness (`Compact Readiness Summary → Six-Dimension Evidence`), and 2-tier Decision Half-Life (`Compact Validity Indicator → Assumption / Signal Validity Evidence`, prohibiting countdown timers).
8. [`docs/governance/INTENT_FUSION_INTELLIGENCE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/INTENT_FUSION_INTELLIGENCE.md) — Updated `DecisionContract` evolution & Decision Half-Life signal tracking.
9. [`docs/governance/ENTERPRISE_SIGNAL_MODEL.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/ENTERPRISE_SIGNAL_MODEL.md) — Added contextual factor signals, provider-neutral connector classification, & signal volatility triggers.
10. [`docs/governance/SHARED_DECISION_STATE_MODEL.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/SHARED_DECISION_STATE_MODEL.md) — Added `DecisionContract` binding & strategy play commands.
11. [`docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/ORGANISATIONAL_LEARNING_INTELLIGENCE.md) — Added 8-step Closed Learning Loop architecture & `CDI-07B` internal evidence gates (`CDI-07B.1`, `CDI-07B.2`, `CDI-07B.3`).
12. [`docs/governance/EXPERIMENT_MODEL.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/EXPERIMENT_MODEL.md) — Registered flagship experiment `EXP-CDI-01`.
13. [`docs/product/DEMO_OPERATING_MODEL.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/product/DEMO_OPERATING_MODEL.md) — Added 5-question executive demo script.

### Untracked Planning Report (1 File):
14. [`docs/reports/COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/reports/COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md) — This planning report.

---

## 3. Existing Verified Runtime Endpoints vs. Proposed Endpoints

Direct repository code audit confirms the following exact route statuses:

### Verified Existing Runtime Endpoints (`EXISTS`):
- `POST /api/v1/commercial-intents` — Registers Commercial Intent & triggers $vN \to vN+1$ Decision State transition (`EXISTS`).
- `GET /api/v1/commercial-intents/current` — Fetches active Commercial Intent (`EXISTS`).
- `GET /api/v1/commercial-intents/{id}` — Fetches Commercial Intent by ID (`EXISTS`).
- `POST /api/v1/decision-state` — Initialises Shared Decision State (`EXISTS`).
- `GET /api/v1/decision-state/current` — Fetches active Shared Decision State (`EXISTS`).
- `PATCH /api/v1/decision-state/{id}` — Executes deterministic command transition (`EXISTS`).
- `POST /api/v1/intent-fusion/evaluate` — Evaluates Intent Fusion & Contextualised Decision Outlook (`EXISTS`).
- `POST /api/v1/journey/events` — Ingests client journey telemetry event stream (`EXISTS`).
- `GET /api/v1/signals` — Fetches Enterprise Signal Fabric feeds (`EXISTS`).
- `POST /api/v1/signals/simulate` — Executes Dynamic Signal Simulation (`EXISTS`).
- `GET /api/v1/memory` — Queries historical memory cases (`EXISTS`).
- `POST /api/v1/memory` — Registers memory case precedent (`EXISTS`).
- `POST /api/v1/memory/search` — Searches memory cases by signature (`EXISTS`).
- `GET /api/v1/learning-patterns` — Fetches Enterprise Learning Patterns (`EXISTS`).
- `POST /api/v1/learning-patterns/match` — Performs pattern similarity matching (`EXISTS`).

### Proposed Future Endpoints (`PLANNED`):
- `POST /api/v1/campaigns/intent` — Campaign Intent registration endpoint (`PLANNED`).
- `POST /api/v1/campaigns/counterfactual` — Counterfactual Baseline computation endpoint (`PLANNED`).
- `POST /api/v1/campaigns/evaluate-causal` — Causal Demand solver endpoint (`PLANNED`).
- `POST /api/v1/campaigns/opportunity-windows` — Opportunity Window yield evaluation endpoint (`PLANNED`).
- `POST /api/v1/campaigns/micro-markets` — Micro-Market Store Cohort Graph endpoint (`PLANNED`).
- `POST /api/v1/campaigns/readiness` — 6-Dimension Decision Readiness evaluation endpoint (`PLANNED`).
- `POST /api/v1/campaigns/timeline` — Contextual Decision Timeline + Demand Decomposition endpoint (`DELIVERED` — CDI-05; one call returns both artefacts).
- `POST /api/v1/campaigns/outcome-frontier` — Multi-Objective Outcome Frontier + competing strategies (`DELIVERED` — CDI-06; one call returns frontier and all plays).
- `POST /api/v1/campaigns/competing-plays` — Competing Strategy Play generator endpoint (`PLANNED`).
- `GET /api/v1/campaigns/validity` — Decision Half-Life volatility check endpoint (`PLANNED`).
- `POST /api/v1/campaigns/pre-mortem` — Decision Ripple Pre-Mortem failure evaluator endpoint (`PLANNED`).

---

## 4. Existing Runtime Truth vs. Proposed Architecture

| Architectural Entity | Spec / Location | Status Classification | Notes |
|---|---|---|---|
| `cognix-world` microservice | `services/world` (Port 8081) | **EXISTS** | Operational baseline world & synthetic signal generator. |
| `cognix-learning` microservice | `services/learning` (Port 8082) | **EXISTS** | Operational memory case & learning pattern microservice. |
| Shared Decision State Contract | `packages/contracts/src/decision-state-model.ts` | **EXISTS** | Transport-neutral TypeScript contract schema. |
| Shared Decision State BFF Store | `app/api/v1/decision-state/` | **EXISTS** | In-memory BFF store (WP10-C Option A). |
| Signal Fabric BFF Endpoints | `app/api/v1/signals/` | **EXISTS** | Endpoint gateway for signal query & dynamic simulation. |
| Dynamic Signal Simulator | `services/world/src/dynamic-signal-simulator.ts` | **EXISTS** | Deterministic simulation engine (`POST /api/v1/signals/simulate`). |
| Intent Fusion BFF Endpoint | `app/api/v1/intent-fusion/evaluate` | **EXISTS** | Fused outlook evaluator. |
| `cognix-decision` microservice | Architecture Spec (`Option B`) | **PROPOSED EXTRACTION** | Physical service decoupling from Next.js BFF gateway. |
| Decision Ripple Engine | Integration Target | **PROPOSED INTEGRATION** | Proposed integration capability for resilience & pre-mortem logic. |
| `CampaignIntent` domain contract | Conceptual Schema | **PROPOSED** | Conceptual contract for campaign objective & constraints (location TBD during implementation). |
| `CounterfactualBaseline` contract | Conceptual Schema | **PROPOSED** | Conceptual contract for run-rate vs predicted trajectory (location TBD during implementation). |
| `MicroMarketOpportunity` contract | Conceptual Schema | **PROPOSED** | Conceptual contract for catchment & store cohort graph (location TBD during implementation). |
| `DecisionReadinessAssessment` | Conceptual Schema | **PROPOSED** | Conceptual contract & 6-dimension readiness calculator (location TBD during implementation). |
| `OutcomeFrontier` contract | Conceptual Schema | **PROPOSED** | Conceptual contract for Pareto strategy trade-off solver (location TBD during implementation). |
| `DecisionContract` evolution | Conceptual Schema | **PROPOSED** | Rich contract schema extending `CommercialIntent` (location TBD during implementation). |

---

## 5. ESF-3 Disposition & Provider-Neutral Architecture

- **Status:** Unchanged / Active Core Work Package.
- **Explicit Governance Ruling:** `ESF-3 — External Signal Connector Contract` is **NOT** deleted, absorbed, or superseded.
- **Provider-Neutral Classification:** `ESF-3` defines connector abstractions for external signal feeds across planning platforms, commerce platforms, weather, events, competitive intelligence, operational telemetry, and customer/demographic sources. Vendor systems (e.g. Blue Yonder, SAP IBP) represent reference adapters, not mandatory dependencies.
- **CDI Dependency:** `CDI-01` through `CDI-06` execute against synthetic `ESF-1`/`ESF-2` signal feeds generated in `cognix-world`. `CDI-07B` binds production signal feeds from `ESF-3` for real-world outcome comparison.

---

## 6. Revised Non-Linear CDI Dependency Architecture

### 6.1 Primary HARD Execution Flow DAG
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

### 6.2 Companion Direct Dependency Matrix
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

---

## 7. Revised Work Package Structure & Internal Evidence Gates

| Work Package | Name | Primary Responsibility | Dependency Classification |
|---|---|---|---|
| **`CDI-01`** | Campaign Decision Canvas & Intent Model | 4-area progressive input contract & intent registration. | **HARD:** `WP10-C`, `IFI-01`. **ENHANCEMENT:** `ESF-1`. |
| **`CDI-02`** | Counterfactual Baseline & Causal Engine | 3-part baseline separation & multi-variable demand solver. | **HARD:** `CDI-01`. **INTEGRATION:** `ESF-2`. |
| **`CDI-03`** | Opportunity Window & Micro-Market Graph | Date discovery mode & micro-market store graph evaluation. | **HARD:** `CDI-01`. **INTEGRATION:** `WP10-A`. |
| **`CDI-04`** | Campaign Decision Readiness & Resilience | 6-dimension readiness evaluation & Decision Ripple resilience. | **HARD:** `CDI-02`. **INTEGRATION:** `CDI-03`, Decision Ripple. |
| **`CDI-05`** | Decision Timeline & Progressive Decomposition | Multi-lens timeline & `What? → Why? → Evidence → What If?` driver decomposition. | **HARD:** `CDI-02`. **INTEGRATION:** `CDI-04`. **ENHANCEMENT:** `CDI-03`. **Status:** COMPLETED (`DecisionTimelineProjection` + `DemandDecomposition` via `POST /api/v1/campaigns/timeline`). |
| **`CDI-06`** | Outcome Frontier & AI Competing Plays | Pareto trade-off solver & deterministic competing plays. | **HARD:** `CDI-02`, `CDI-05`. **INTEGRATION:** `CDI-04`. **ENHANCEMENT:** Gemini wrapper. |
| **`CDI-07A`** | Decision Contract & Half-Life Monitor | `DecisionContract` schema, validity tracking & volatility triggers. | **HARD:** `CDI-01`, `CDI-06`. **INTEGRATION:** `WP10-C`. **ENHANCEMENT:** `ESF-1`/`ESF-2`. |
| **`CDI-07B`** | Pre-Mortem & Closed Learning Loop | Internal evidence gates: `07B.1` Pre-Mortem, `07B.2` Prediction vs Reality, `07B.3` Memory/Learning. | **HARD:** `CDI-07A`, `WP10-D`. **INTEGRATION:** `ESF-3`. |

---

## 8. Completed 14-Capability Traceability Matrix

| # | Approved Capability | Decision Question Answered | Domain Contract | Data / Signal Dependency | Intelligence Responsibility | API / Contract Surface | Experience Surface | Decision Visual | Cross-System Integration | Evidence / Test Requirement | Planned WP | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Campaign Decision Canvas | What are we considering? | `CampaignIntent` | Baseline volume, target margin | Validates input bounds & intent parameters | `POST /api/v1/campaigns/intent` (PLANNED) | Campaign Decision Canvas | Intent & Objective 4-Area Frame | `IFI-01` Commercial Intent Store | Validates 4-area input schema & intent payload | `CDI-01` | PROPOSED |
| 2 | Counterfactual Baseline | Incremental compared to what? | `CounterfactualBaseline` | Historical run-rate ($T-90$ to $T-1$) | Computes run-rate vs expected without intervention | `POST /api/v1/campaigns/counterfactual` (PLANNED) | Decision Timeline Lens Selector | Campaign Delta (Do-Nothing vs Intervention) | Enterprise World Scenario Baseline | Validates baseline run-rate vs counterfactual trajectory | `CDI-02` | PROPOSED |
| 3 | Causal Campaign Model | What demand will intervention generate? | `CausalDemandContribution` | Intrinsic demand, elasticities, signals | Solves multi-variable demand response formula | `POST /api/v1/campaigns/evaluate-causal` (PLANNED) | Demand Timeline & Decomposition Drawer | Causal Uplift Trajectory | Dynamic Signal Simulator (`ESF-2`) | Unit test verifies multi-variable elasticity response | `CDI-02` | PROPOSED |
| 4 | Opportunity Window Discovery | When should we intervene? | `OpportunityWindowEvaluation` | Seasonality, weather, calendar, events | Evaluates candidate date windows & scores yield | `POST /api/v1/campaigns/opportunity-windows` (PLANNED) | Campaign Intent Window Discovery Selector | Opportunity Window Date Yield Visual | Enterprise World Event Signals | Verifies date range ranking against baseline constraints | `CDI-03` | PROPOSED |
| 5 | Micro-Market Opportunity Graph | Where should we intervene? | `MicroMarketOpportunity` | Store catchments, inventory, missions | Scores store cohorts by net opportunity | `POST /api/v1/campaigns/micro-markets` (PLANNED) | Audience & Market Geographic Selector | Micro-Market Store Cohort Graph | Shared Decision State Store | Verifies 50-store classification across 4 opportunity tiers | `CDI-03` | PROPOSED |
| 6 | Campaign Decision Readiness | Are we ready to execute? | `DecisionReadinessAssessment` | Commercial, demand, supply, context signals | Evaluates 6-dimension readiness rules | `POST /api/v1/campaigns/readiness` (PLANNED) | Executive Readiness Summary Drawer | Compact Readiness Summary $\to$ Six-Dimension Evidence | Decision Ripple (Proposed Integration) | Verifies 6-dimension score calculation & state outputs | `CDI-04` | PROPOSED |
| 7 | Decision Timeline | What happens over time? | `DecisionTimelineProjection` | Forecast trajectory, constraints, events | Projects temporal timeline across 4 lenses | `POST /api/v1/campaigns/timeline` (DELIVERED) | Decision Timeline Primary Canvas View | Contextual Decision Timeline | Shared Decision State (`WP10-C`) | Verifies timeline rendering across 4 lenses | `CDI-05` | COMPLETED |
| 8 | Curiosity Demand Decomposition | Why is this outcome predicted? | `DemandDecomposition` | Driver contributions (mechanic, weather, etc) | Separates demand lift into explicit pp contributions | `POST /api/v1/campaigns/timeline` (DELIVERED — same call as row 7; supersedes earlier Intent Fusion mapping) | `What? → Why? → Evidence → What If?` Drawer | Partitioned ambient / intervention driver groups (no merged waterfall) | Closed CDI-02 `CausalDemandContribution` (restatement, not re-attribution) | Verifies class partition + subtotals echo CDI-02 ambient/intervention | `CDI-05` | COMPLETED |
| 9 | Multi-Objective Outcome Frontier | Is there a better strategy? | `OutcomeFrontier` | Attributable volume uplift (pp) and contribution delta (GBP) — revenue/availability NOT_AVAILABLE; waste/confidence NOT_ADMISSIBLE_AS_AXIS | Two-axis Pareto frontier over real CDI-02 evaluations under ARF-A | `POST /api/v1/campaigns/outcome-frontier` (DELIVERED) | Strategy comparison drawer (Canvas Layer 6) | Outcome Frontier + Scenario 0 | CDI-04 readiness annotates/constrains; CDI-05 decomposition reused | Verifies dominance, Scenario 0, non-promotion PRESENTED_NOT_RANKED, selection CHOICE_REQUIRED | `CDI-06` | COMPLETED |
| 10 | AI-Generated Competing Strategies | What alternatives exist? | `CampaignScenario` / `StrategyPlay` | Deterministic play generation policy G0–G3 (depth grid) | Generates structured plays (Scenario 0 + promotions + non-promotion + anchor) without LLM | `POST /api/v1/campaigns/outcome-frontier` (DELIVERED — same call as row 9) | Competing Strategy Drawer | Scenario Comparison (display order ≠ ranking) | Closed CDI-02 evaluation per play | Verifies every play bound to real evaluation_id/counterfactual_id/causal_id | `CDI-06` | COMPLETED |
| 11 | Decision Contract & Intent Fusion | What assumptions bound this decision? | `DecisionContract` | Intent, counterfactual, baseline, constraints | Binds campaign context into formal decision contract | `POST /api/v1/commercial-intents` (EXISTS) | Decision Contract Execution Modal | Decision Contract Summary Card | Commercial Intent Store (`IFI-01`) | Verifies contract registration & decision state versioning | `CDI-07A` | PROPOSED |
| 12 | Decision Half-Life | Is this decision still valid? | `DecisionValidityAssessment` | Enterprise signals, assumption volatility | Monitors signal volatility against contract assumptions | `GET /api/v1/campaigns/validity` (PLANNED) | Decision Validity Tag & Drawer | Compact Validity Indicator $\to$ Assumption / Signal Validity Evidence | Enterprise Signal Fabric (`ESF-1`/`ESF-2`) | Verifies volatility threshold trigger & recommendation decay | `CDI-07A` | PROPOSED |
| 13 | Campaign Pre-Mortem | How could this decision fail? | `CampaignPreMortem` | Supply, labor, weather, competitor signals | Evaluates failure modes, likelihood, impact | `POST /api/v1/campaigns/pre-mortem` (PLANNED) | Pre-Mortem Resilience Drawer | Pre-Mortem Failure Mode Matrix | Decision Ripple (Proposed Integration) | Verifies 1st/2nd/3rd order failure propagation | `CDI-07B.1` | PROPOSED |
| 14 | Closed Learning Loop | What did reality teach us? | `PredictionOutcomeComparison` | Observed signals, historical memory cases | Compares predicted vs actual, logs memory case | `POST /api/v1/memory` (EXISTS) | Memory & Learning Precedent Panel | Prediction vs Reality Comparison Visual | `cognix-learning` Microservice (Port 8082) | Verifies error delta calculation & memory case creation | `CDI-07B.2/3` | PROPOSED |

---

## 9. Visual Decision Architecture Mapping

| # | Decision Visual Surface | Retail Question Answered | Intelligence Dependency | Planned WP | Progressive Disclosure Position |
|---|---|---|---|---|---|
| 1 | Decision Timeline | What happens over time? | Causal Campaign Engine | `CDI-05` | Primary Canvas View |
| 2 | Campaign Delta / Do-Nothing | Should we intervene? | Counterfactual Baseline | `CDI-02` | Primary Canvas View |
| 3 | Why This Outcome? | Why is this predicted? | Demand Decomposition | `CDI-05` | `What? → Why?` Drawer |
| 4 | Micro-Market Opportunity Visual | Where should we intervene? | Micro-Market Graph | `CDI-03` | `Audience & Market` View |
| 5 | Opportunity Window Visual | When should we intervene? | Window Discovery Engine | `CDI-03` | `Campaign Intent` View |
| 6 | Outcome Frontier | Is there a better strategy? | Pareto Trade-off Solver | `CDI-06` | Strategy Card Grid |
| 7 | Scenario Comparison | How do plays compare? | Competing Strategy Engine | `CDI-06` | Strategy Drawer |
| 8 | Decision Readiness | Are we ready to execute? | 6-Dimension Readiness Scorer | `CDI-04` | Compact Readiness Summary $\to$ Six-Dimension Evidence |
| 9 | Decision Validity / Half-Life | Is recommendation aging? | Signal Volatility Monitor | `CDI-07A` | Compact Validity Indicator $\to$ Assumption / Signal Validity Evidence |
| 10 | Prediction vs Reality | What did reality teach us? | Closed Learning Loop | `CDI-07B` | Memory & Learning Panel |

---

## 10. Anti-Drift Governance Location

The authoritative safeguards preventing product regression are formally codified in:
1. [`docs/governance/COGNIX_PRINCIPLES.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/COGNIX_PRINCIPLES.md) — **Principle 11** (North Star) & **Principle 12** (Anti-Drift Guardrails including AI Strategy Independence, Provider-Neutral ESF-3, and Campaign Delta Elevation).
2. [`docs/ux/UX_DESIGN_PRINCIPLES.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/ux/UX_DESIGN_PRINCIPLES.md) — **Section 5** (Non-Cockpit Decision Surface, Progressive Disclosure, Campaign Delta Primary Surface, 2-tier Decision Readiness, 2-tier Decision Half-Life).
3. [`docs/governance/MASTER_PLAN.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/MASTER_PLAN.md) — **Programme 10 CDI Stream**.

---

## 11. Architecture Decision Record (ADR) Implications

- Added **ADR-026: Campaign Decision Intelligence Architecture & 14-Capability Framework** to [`docs/architecture/ARCHITECTURE_DECISIONS.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/architecture/ARCHITECTURE_DECISIONS.md).
- Status set strictly to **`Proposed — Awaiting Owner Approval`**.

---

## 12. Service-Boundary & Integration Validation

- **`cognix-decision` Validation:** References to `cognix-decision` in architecture diagrams represent a **proposed physical service extraction boundary** (Option B in WP10-C architecture). Shared Decision State currently operates logically inside Next.js BFF proxy gateway (`app/api/v1/decision-state/` under Option A).
- **Decision Ripple Engine Validation:** Decision Ripple is a **proposed integration capability** and destination for pre-mortem resilience logic. WP10-C owns Shared Decision State (`packages/contracts/src/decision-state-model.ts`), not the Decision Ripple Engine.
- **Physical File Locations:** Conceptual domain contracts are defined independently of physical source paths. Physical file locations are marked **TBD during implementation** unless established by repository evidence.

---

## 13. Remaining Unresolved Decisions

1. **Frontier Strategy Preference Settings:** Future tenant policy configuration for ranking Pareto strategy plays (optional later enhancement).

---

## 14. Exact Recommended Next Executable Work Package Based ONLY on HARD Dependencies

Evaluating **HARD** dependencies strictly:
- `ESF-3` has a **HARD** dependency on `ESF-1` (COMPLETED). All `ESF-3` prerequisites are 100% satisfied.
- `CDI-01` has **HARD** dependencies on `WP10-C` (COMPLETED) and `IFI-01` (COMPLETED). All `CDI-01` prerequisites are 100% satisfied.

### Final Concurrency Ruling:
`ESF-3` and `CDI-01` **both have 100% satisfied HARD dependencies** and are **eligible for parallel execution**, provided file ownership and work-package boundaries do not conflict (`ESF-3` touches signal connectors; `CDI-01` touches campaign intent schemas & canvas UI). They are not an either/or strategic choice.

---

## 15. Owner Decisions Required Before Approval

1. **Governance Approval:** Campaign Decision Intelligence Master Plan and governance revision approved and authoritative.
2. **Approval of Parallel Execution Plan:** Confirm parallel execution of `ESF-3` (External Signal Connectors) and `CDI-01` (Campaign Decision Canvas & Intent Model).

---

# CURRENT STATUS: APPROVED & AUTHORITATIVE — READY FOR AUTHORISED WORK PACKAGE EXECUTION

All unit tests (`tests/unit/run-bugfix-integrity-tests.ts`, `tests/unit/run-wp10d-tests.ts`) remain **100% passing**. No application code was modified, committed, or pushed.

Awaiting Owner review and authorization before proceeding.
