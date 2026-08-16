# COGNIX — INTENT FUSION INTELLIGENCE ARCHITECTURE & GOVERNANCE

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Group

## 1. Executive Summary

Intent Fusion Intelligence is a cross-cutting CogniX capability designed to reconcile planned commercial decisions (**Commercial Intent**) with upstream baseline forecasts, observed operational signals (**Enterprise Signal Fabric**), and shared decision contexts (**Shared Decision State**).

The core executive proposition is:

> **"What if every operational decision knew what the business was planning before demand reacted?"**

CogniX does **not** replace or compete with external forecasting engines (e.g., SAP IBP, Blue Yonder). Instead, CogniX contextualises forecasts against commercial intentions and operational realities to calculate a **Contextualised Decision Outlook**.

---

## 2. Core Concepts & Information Class Separation

| Information Class | Ownership Domain | Role / Function |
| :--- | :--- | :--- |
| **Enterprise World** | `cognix-world` microservice (port 8081) | Baseline enterprise reality, canonical scenario parameters, synthetic signal generation. |
| **Enterprise Forecast** | Upstream Planning / `cognix_synthetic_world` | Unadjusted demand expectations from statistical / ML engines. |
| **Commercial Intent** | `lib/commercial-intent-store` | Structured planned business actions (e.g. 20% promotional discount). |
| **Enterprise Signals** | Enterprise Signal Fabric (ESF-1 / ESF-2) | Observed or simulated market and operational trajectory signals. |
| **Shared Decision State** | `lib/decision-state-store` | Current reconciled enterprise decision parameters & interventions ($vN \to vN+1$). |
| **Contextualised Decision Outlook** | `lib/intent-fusion` | Fused result reconciling forecast + intent + signals + state into explicit contribution components. |

---

## 3. Terminology & Positioning Rulings

1. **Naming:** Fused outputs are canonically named **`Contextualised Decision Outlook`**. CogniX never generates a competing "CogniX Forecast".
2. **Decomposition:** The fused outlook uses deterministic contribution separation:
   $$\text{Outlook (+22\%)} = \text{Baseline Forecast (+12\%)} + \text{Commercial Intent (+7\%)} + \text{Observed Signals (+3\%)} + \text{Interaction Adjustment (0\%)}$$
3. **Calculation Mode:** Expressed as `calculation_mode: "deterministic_demo_decomposition"`.
4. **Capacity Gap:** Directly calculates supplier headroom breaches (e.g., 22% demand lift vs 10% capacity cap = **12 pp commitment gap**).

---

## 4. REST API Contract Endpoints

- `POST /api/v1/commercial-intents` — Registers Commercial Intent & triggers $vN \to vN+1$ Decision State transition + `COMMERCIAL_INTENT_REGISTERED` journey event.
- `GET /api/v1/commercial-intents/current` — Retrieves active Commercial Intent for tenant/session.
- `GET /api/v1/commercial-intents/{id}` — Retrieves Commercial Intent by ID.
- `POST /api/v1/intent-fusion/evaluate` — Evaluates Intent Fusion & returns `ContextualisedDecisionOutlook`.

---

## 5. Experience Integration Across CogniX

Intent Fusion operates across the CogniX journey:
1. **Promotion Intelligence (`PromotionPlanner.tsx`):** Captures user promotion settings and registers `CommercialIntent`.
2. **Demand & Forecast Contextualisation (`Forecasting.tsx`):** Displays decomposed Baseline (+12%) + Intent (+7%) + Signals (+3%) = Outlook (+22%) vs Capacity Cap (+10%).
   > **Runtime-truth correction — 2026-08-16 (reconciliation against `7ad9c2df`).** This surface renders those values as **hardcoded JSX literals** (`components/Forecasting.tsx:368–418`). It does **not** call `POST /api/v1/intent-fusion/evaluate` — its only network call is `GET /api/data?type=forecast` (`:158`) — so the displayed 12 pp gap does not respond to the Promotion Lift control beside it. The engine (`lib/intent-fusion/intent-fusion-engine.ts`) is correct and is reachable; the surface is simply not bound to it, and additionally hardcodes `supplierCapacityCapPct = 10` (`:36`) rather than reading the Shared Decision State `supplier_capacity_cap` parameter that `calculateDerivedImpacts()` consumes. Binding this surface to the engine is a **precondition** of `DDF-01` P0-B (ADR-041, defect `D-DDF-1`), because a Decision Gap computed over a static panel is a caption rather than a calculation. Downstream governance is defined against the engine, never against the surface literals.
3. **Commitment Intelligence (`Commitment.tsx`):** Rehearses downstream supplier allocation risks driven by the 12 pp commitment gap.
4. **Predictive Inventory & Decision Ripple (`Inventory.tsx`, `Ripple.tsx`):** Projects 2nd/3rd order consequences into DC overtime and margin erosion.
5. **Execution Briefing (`Briefing.tsx`):** Recommends actionable mitigations backed by learning pattern evidence.

---

## 6. Decision Contract Evolution & Decision Half-Life Integration

### 6.1 Decision Contract Architecture
In Campaign Decision Intelligence, `CommercialIntent` evolves into a rich **`DecisionContract`**:
- **Business Objective:** Specific goal (e.g. `Clearance`, `Revenue Acceleration`, `Margin Protection`).
- **Chosen Intervention:** Selected intervention mechanics (e.g. `Price Cut`, `BOGOF`, `Bundle`, `Reallocation`).
- **Rejected Alternatives:** Record of unselected Pareto-efficient options.
- **Counterfactual Baseline:** Run-rate without intervention vs expected trajectory with intervention.
- **Micro-Market Cohorts:** Targeted store cohorts, micro-markets, and channels.
- **Assumptions & Reconsideration Triggers:** Explicit contextual conditions (e.g. weather stability, supplier SLA headroom).

### 6.2 Decision Half-Life Signal Tracking

**Decision Half-Life describes how the evidential basis of a decision weakens or remains valid as
assumptions and signals evolve. In the current architecture it is represented through validity
states and evidence-triggered reassessment. Quantitative duration is unavailable until calibrated
temporal evidence exists.**

Decisions therefore carry **no** duration, countdown, expiry estimate or decay curve. Validity is
reported as one of `STABLE`, `WATCH`, `DEGRADED`, `REASSESS_REQUIRED` or `INDETERMINATE`, derived
from named assumptions and evidence-based triggers. `STABLE` requires positive supporting evidence;
`INDETERMINATE` represents insufficient evidence and must never collapse into `STABLE`.

Intent Fusion monitors observed Enterprise Signals (`ESF-1`/`ESF-2`) against the assumptions a
contract declared. Signal movement may raise a reassessment state, but must never imply that the
recommendation itself has changed, and must never supersede or withdraw a contract automatically —
only a named person does that. Signal movement caused by a Shared Decision State parameter change is
scenario-driven rather than world-driven and is reported as such.

Authoritative semantics: `docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md` §5–§7.
