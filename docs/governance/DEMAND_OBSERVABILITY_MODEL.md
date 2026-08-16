# COGNIX — DEMAND OBSERVABILITY & DEMAND TRUTH ARCHITECTURE & GOVERNANCE

**Document Status:** Approved & Authoritative
**Version:** 1.0.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Group
**IP Classification:** G10X Proprietary

---

## 1. Executive Purpose

CogniX Demand & Forecast (`SOL-DEMAND-02`) today contextualises a conventional forecast with commercial
intent, observed signals and supply capacity — the `IFI-01` Contextualised Decision Outlook. It answers
*"what demand do we forecast?"*

This document governs the evolution towards a different question:

> **Is the demand outlook changing, can the organisation capture it, how long does it have to respond,
> what is the economic consequence of acting or waiting, and what intervention creates the best outcome?**

It defines two things and keeps them strictly apart:

1. **`DDF` — Demand Decision Frontier.** The immediate P0 capability. Registered as work package
   `DDF-01` in [`MASTER_PLAN.md`](../governance/MASTER_PLAN.md).
2. **`DOT` — Demand Observability & Demand Truth.** The umbrella roadmap family (`DOT-1` … `DOT-12`).
   **None of it is in `DDF-01` scope.** It exists here so that the discovery work behind it is not lost,
   and so that `DDF-01` cannot quietly absorb it.

---

## 2. The governing architectural principle

> **CogniX does not manufacture unobserved demand. It reconstructs demand from evidence, quantifies
> uncertainty, and preserves provenance from signal through inference to decision.**

This is the demand-domain expression of the boundary the estate already enforces elsewhere: `ESF-6`
decides whether an observation is evidence about the real world at all (`source × context → authority`),
and `CDI-08` decides whether it addresses the decision that was contracted
(`contract × observation → comparability`). Demand Observability inherits both predicates. It never
routes around them, and it never introduces a second, weaker notion of "observed".

---

## 3. Canonical demand vocabulary

Every capability in this family — immediate or roadmap — uses these terms and only these terms. They are
not synonyms and must never be rendered interchangeably.

| Term | Definition | May be labelled `OBSERVED`? |
| :--- | :--- | :--- |
| **Observed sales** | Transactions that completed. | Yes, where `ESF-6` attested. |
| **Observed demand signal** | Evidence *about* demand (search, enquiry, availability lookup). Not a demand unit. | Yes, as a *signal*, never as demand. |
| **Substituted demand** | Demand satisfied by a different item than the one preferred. | No — inferred. |
| **Suppressed / latent demand** | Demand that existed and was not satisfied, because of availability or operational failure. | No — reconstructed. |
| **Unresolved demand** | Evidence of intent that cannot be attributed to a satisfied, substituted or suppressed outcome. | No — explicitly indeterminate. |
| **Estimated true demand** | Reconstruction of demand had no constraint applied, with stated uncertainty. | **Never.** |
| **Baseline forecast** | The upstream statistical expectation (`ENTERPRISE_WORLD` / external planning system). | N/A — declared source. |
| **Contextualised outlook** | `IFI-01` fusion of baseline + commercial intent + observed signals. | N/A — derived. |
| **Emerging demand frontier** | The outlook the current evidence is trending toward, if present divergence persists. | No — modelled projection. |
| **Executable demand frontier** | The portion of demand the organisation can actually serve under existing commitments and operational constraints. | No — derived from constraints. |
| **Exposed demand** | `emerging frontier − executable frontier`. The commercial opportunity currently out of reach. | No — derived. |
| **Economically desirable demand** | The portion of executable demand worth serving after margin, waste and operational cost. | No — derived. |

**Four demand quantities, never collapsed:** forecast demand ≠ true/latent demand ≠ executable demand ≠
economically desirable demand. Any surface that shows one and captions it as another is a defect.

---

## 4. Demand domain principles

These extend, and do not replace, `COGNIX_PRINCIPLES.md` Principle 13.

1. **Evidence before inference.** Inferred demand is never represented as observed fact. Provenance class
   is carried on the datum, not on the page.
2. **Provenance.** Every material conclusion is traceable to the contributing evidence, by reference.
3. **Explicit uncertainty.** Estimated demand and decision outcomes expose their uncertainty. Absence of
   uncertainty evidence is shown as absence, never as certainty.
4. **No fake intelligence.** No invented ML prediction, causal relationship, real-time integration or
   operational evidence. A deterministic calculation is described as a deterministic calculation.
5. **Progressive sophistication.** The POC may begin with transparent deterministic and explicitly
   modelled calculations and evolve into learned models **without breaking contracts**. The contract shape
   is designed for the learned version; the implementation is honest about being the deterministic one.
6. **Signal ≠ demand.** A signal is evidence about demand, not a demand unit. Converting signals to units
   requires a declared, inspectable conversion — never an implicit one.
7. **Sales ≠ true demand.** Observed sales are censored by availability and operational constraint.
8. **Forecast accuracy ≠ decision quality.** The family optimises for economic and operational decision
   outcomes. A forecast-error metric never stands in for a decision verdict. (This restates the `CDI-07B`
   rule that prediction error describes model divergence, never whether the decision was good.)
9. **Constraints can influence future demand.** Supply and availability failure alters customer behaviour
   and therefore future demand. A forecast that learns operational failure as demand decline is wrong.
10. **Human-understandable reasoning.** An executive or planner can always reach *why*. Opaque conclusions
    are prohibited regardless of how they were produced.

---

## 5. Demand Observability Maturity Model

The staged adoption model, adjusted from the discovery draft to match what this repository can actually
substantiate. **A Level 0 is added, because that is where the estate is**, and levels 2–5 are gated on
`ESF-6` attestation rather than on integration alone.

| Level | Name | Evidence base | Estate position |
| :--- | :--- | :--- | :--- |
| **0** | **Synthetic / modelled demonstration** | `cognix-world` synthetic scenarios, `ESF-1`/`ESF-2` simulated signals, seeded archetypes. Every datum is `synthetic_demo = true`. | **Current state.** All of `DDF-01` operates here. |
| **1** | Existing transactional data | POS, inventory, stockout duration, historical demand, promotion data. | Requires attested first-party sources (`ESF-6`). |
| **2** | Digital intent | Search, availability checks, ecommerce behaviour, failed fulfilment, substitution. | Requires `DOT-9` ledger + `DOT-10` resolution to avoid double-counting. |
| **3** | Human / store signals | Colleague enquiries, customer-service requests, manual availability observation. | Attestation is a named human declaration, per `ESF-6` stated limit. |
| **4** | Physical signals | RFID, ESL, shelf sensors, computer vision, footfall, shelf interaction — where appropriate and governed. | Governance (privacy, works-council, DPIA) precedes instrumentation. |
| **5** | Unified Demand Observability | Evidence fusion producing estimated true demand with uncertainty, provenance and feedback learning. | Requires `DOT-1`, `DOT-9`, `DOT-10`, `DOT-11` and calibrated outcome history. |

**Binding rules on the model.**
- Levels are **capability levels, not purchase levels.** A level is reached when the evidence is *admitted
  and resolved*, not when a feed is connected.
- **A higher level never silently upgrades a lower-level datum.** Adding shelf sensors does not make last
  year's censored sales history uncensored.
- **The architecture must allow progressive maturity.** No capability in this family may require Level 4
  physical instrumentation as a precondition for delivering value at Levels 0–2.
- CogniX must never present its current level as a higher one. The demonstration surface states its level.

---

## 6. `DOT` roadmap — capability families

Priorities are relative to each other and to `DDF-01` (which is P0 and precedes all of them). **No `DOT`
item is authorised for implementation by the `DDF-01` work package.**

### 6.1 Family `DOT-A` — Demand Truth Reconstruction
*Recovering demand that occurred but was never transacted.*

- **`DOT-1` — Latent Demand Reconstruction [P1].** Recover demand hidden by stockouts, shelf
  unavailability, inventory inaccuracy, failed fulfilment and censored sales history. Publishes the
  §3 separation — observed / substituted / suppressed / unresolved / estimated true — each with
  confidence and uncertainty. *Depends on:* `DOT-9` (evidence ledger) for anything beyond Level 0.
- **`DOT-2` — Demand Leakage Intelligence [P1].** Determine where expected demand was lost or
  redirected: substitution, another store, another channel, delayed purchase, abandoned purchase,
  competitor loss, availability failure, capacity failure, pricing/promotion effect. Quantifies
  *addressable* and *recoverable* opportunity separately, and only where evidence permits.
  *Depends on:* `DOT-1`, `DOT-3`.
- **`DOT-3` — Customer Substitution Graph [P2].** Learn how demand moves between SKUs, brands, pack
  sizes, categories, stores and channels when the preferred item is unavailable or commercial conditions
  change. *Depends on:* `DOT-9`, `DOT-10`.
- **`DOT-4` — Phantom Inventory Detection [P2/P3].** Identify `system inventory > 0` ∧ `shelf
  availability = 0` ∧ `demand evidence exists` ∧ `sales = 0`, and prevent forecasting from learning
  operational failure as demand decline. *Depends on:* `DOT-1`, `DOT-9`.

### 6.2 Family `DOT-B` — Demand Causality & Counterfactual Truth
*Explaining why demand moved, in reasoning a human can inspect.*

- **`DOT-5` — Demand Cause Graph [P1].** Explainable causal/evidence relationships between commercial
  intent, campaigns and promotions, observed demand signals, external signals, customer behaviour,
  supply constraints, inventory and the resulting demand outlook. **The graph exposes reasoning; it never
  presents an opaque AI conclusion.** *Relationship:* extends the `CDI-02` causal decomposition and the
  `CDI-05` driver decomposition into the demand domain — it does not fork them.
- **`DOT-6` — Promotion Truth Engine [P1/P2].** Beyond headline uplift: genuinely incremental demand,
  cannibalised demand, halo demand, competitor switching, forward-bought/borrowed demand, margin
  dilution, operational cost, supply feasibility, and true incremental commercial value.
  *Integrates with:* Campaign Simulator / Campaign Intelligence and `CDI-02` counterfactual semantics.
  It must reuse the `CDI-02` Do-Nothing baseline rather than defining a second one.
- **`DOT-7` — Counterfactual Demand Twin [P3].** A maintained parallel demand trajectory representing
  "what demand would have been" under declared alternative conditions, for post-hoc comparison.
  *Blocked on:* `CDI-08` correspondence + attested observation volume. Until then it would be fitted to
  CogniX's own simulator.
- **`DOT-8` — Constraint-Induced Demand & Demand Suppression Loops [P3].** Model the long-term feedback
  loop `stockout → substitution → behaviour change → apparent demand decline → lower forecast → lower
  replenishment → further stockout`, and distinguish **true customer demand decline** from **demand
  suppressed by repeated operational failure**. *Depends on:* `DOT-1`, `DOT-4`, longitudinal history.

### 6.3 Family `DOT-C` — Evidence, Provenance & Resolution
*The infrastructure the reconstruction families require.*

- **`DOT-9` — Demand Evidence Ledger [P2].** An evidence/provenance architecture recording demand
  evidence: product enquiry, app/product search, failed transaction, failed fulfilment, availability
  lookup, stockout, substitution, shelf interaction, colleague observation, inventory discrepancy,
  external demand signal. Each record preserves source, timestamp, scope, SKU/product/category,
  store/region/channel, evidence strength, confidence and provenance.
  **Architectural constraint:** the ledger is an *extension of the `EnterpriseSignal` contract and the
  `ESF-6` admission path*, not a parallel signal system. It adds demand-evidence semantics; it does not
  add a second definition of authority or a second origin of `synthetic_demo = false`.
- **`DOT-10` — Intent Resolution [P2].** Prevent double-counting one underlying customer intent expressed
  through several signals — `app search → shelf interaction → colleague enquiry → substitute purchase`
  must not become four units of latent demand. Supports event correlation, deduplication, confidence
  weighting, intent clustering, and an explicit **unresolved evidence** class.
  **This is a hard prerequisite for any latent-demand *quantity*.** Without it, `DOT-1` may describe
  suppression but must not publish a unit count.
- **`DOT-11` — Signal Half-Life & Signal Reliability [P2].** Learn how strongly a signal should influence
  demand, where it is predictive, how long it remains relevant, its historical reliability, and its
  product/store/context specificity. Ends the treatment of all signals as equally reliable and
  permanently relevant. *Relationship:* this is the demand-side consumer of `ESF-4` (Signal Quality,
  Confidence & Provenance) and is **parallel-eligible only after `ESF-4`** — grading precedes weighting,
  exactly as admission precedes grading.
  **Naming boundary:** *Signal* Half-Life is a property of a signal's predictive relevance. It is not
  *Decision* Half-Life (`CDI-07A`), which is the validity of a resolved decision's evidential basis. The
  two must never be rendered as the same indicator.

### 6.4 Family `DOT-D` — Observability Sourcing
- **`DOT-12` — Physical Store Demand Observability [P3].** Future integration possibilities, registered
  without claiming any of them exists: colleague handheld/POS signals, store-app searches, availability
  checks, electronic shelf labels, RFID, shelf sensors, computer vision, footfall, shelf interaction,
  customer-service interactions. Every one enters through `ESF-6` attestation and `DOT-9`. Progressive
  maturity is mandatory: **no capability may require expensive physical instrumentation on day one.**

### 6.5 Concept-to-home register
Every concept raised in discovery has exactly one home. Nothing is orphaned:

| Concept | Home |
| :--- | :--- |
| Forecast Stability Intelligence | `DDF-01` P0-A |
| Decision Gap Intelligence | `DDF-01` P0-B |
| Decision Window | `DDF-01` P0-B (supporting) |
| Forecast / Decision Regret | `DDF-01` P0-C |
| Latent Demand Reconstruction | `DOT-1` |
| Demand Leakage | `DOT-2` |
| Customer Substitution Graph | `DOT-3` |
| Phantom Inventory Detection | `DOT-4` |
| Demand Cause Graph | `DOT-5` |
| Promotion Truth Engine | `DOT-6` |
| Counterfactual Demand Twin | `DOT-7` |
| Constraint-Induced Demand / Suppression Loops | `DOT-8` |
| Demand Evidence Ledger | `DOT-9` |
| Intent Resolution | `DOT-10` |
| Signal Half-Life | `DOT-11` |
| Physical store observability | `DOT-12` |
| Demand Observability confidence | §5 maturity model + §3 vocabulary |
| observed / substituted / suppressed / unresolved | §3 vocabulary (binding on all families) |
| forecast vs true vs executable vs economically desirable demand | §3 vocabulary (binding on all families) |

---

## 7. Conceptual entities (future contract surface)

Documented so the `DDF-01` implementation extends existing CogniX contracts evolutionarily rather than
inventing a parallel model. **Only the `DDF-01` entities are authorised for implementation now**; the rest
are recorded to keep the eventual shape coherent.

### 7.1 `DDF-01` entities (authorised)
- **`ForecastStabilityAssessment`** — stability score, direction/trend, probability of material revision,
  likely revision direction, likely revision magnitude range, contributing signal refs, evidence
  provenance, and an explicit separation from model confidence.
- **`DemandFrontier`** — the trajectory set: `baseline_forecast`, `contextualised_outlook`,
  `emerging_frontier`, `executable_frontier`, each with its own basis and provenance class.
- **`DemandDecisionGap`** — `exposed_demand_pp`, `opportunity_at_risk_gbp`, affected
  products/lines/regions, and the ranked primary contributing constraints.
- **`DemandDecisionWindow`** — window state, `closes_at` where a constraint is declared, the declared
  constraint it derives from, and its basis class. `INDETERMINATE` where nothing is declared.
- **`DemandDecisionRegret`** — the `ACT_NOW` / `WAIT` / `DO_NOTHING` alternative set with expected
  decision value, expected regret, and the shared inputs the comparison rests on.
- **`DemandInterventionScenario`** — a simulated intervention and the recomputed gap, regret, capturable
  opportunity, residual exposure and risk state.

### 7.2 Roadmap entities (not authorised)
`DemandEvidenceRecord` (`DOT-9`), `ResolvedIntentCluster` (`DOT-10`), `LatentDemandEstimate` (`DOT-1`),
`DemandLeakageAttribution` (`DOT-2`), `SubstitutionEdge` (`DOT-3`), `DemandCauseEdge` (`DOT-5`),
`SignalReliabilityProfile` (`DOT-11`).

**Extension rule.** These extend `EnterpriseSignal`, `ContextualisedDecisionOutlook`,
`DecisionDerivedImpacts` and the `CDI` artefacts. Where an existing contract can carry the concept, it is
extended. A new contract is created only where the existing one would have to lie to carry it.

---

## 8. Cross-references

- Work package registration and sequencing: [`MASTER_PLAN.md`](MASTER_PLAN.md)
- Governing principles: [`COGNIX_PRINCIPLES.md`](COGNIX_PRINCIPLES.md) Principle 13
- Architecture decisions: [`ARCHITECTURE_DECISIONS.md`](../architecture/ARCHITECTURE_DECISIONS.md)
  ADR-040 … ADR-043
- Target architecture: [`ARCHITECTURE.md`](../architecture/ARCHITECTURE.md) §7
- Information architecture: [`INFORMATION_ARCHITECTURE.md`](../architecture/INFORMATION_ARCHITECTURE.md) §6
- UX governance: [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §6
- Signal contract and taxonomy: [`ENTERPRISE_SIGNAL_MODEL.md`](ENTERPRISE_SIGNAL_MODEL.md)
- Forecast contextualisation: [`INTENT_FUSION_INTELLIGENCE.md`](INTENT_FUSION_INTELLIGENCE.md)
- Reconciliation evidence and acceptance criteria:
  [`COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md`](../reports/COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md)
