# COGNIX — INTENT FUSION INTELLIGENCE ARCHITECTURE & GOVERNANCE

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
3. **Commitment Intelligence (`Commitment.tsx`):** Rehearses downstream supplier allocation risks driven by the 12 pp commitment gap.
4. **Predictive Inventory & Decision Ripple (`Inventory.tsx`, `Ripple.tsx`):** Projects 2nd/3rd order consequences into DC overtime and margin erosion.
5. **Execution Briefing (`Briefing.tsx`):** Recommends actionable mitigations backed by learning pattern evidence.
