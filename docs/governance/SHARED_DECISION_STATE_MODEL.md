# COGNIX SHARED DECISION STATE MODEL & GOVERNANCE

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** CogniX Architecture Steering Group

---

## 1. Purpose & Strategic Vision

The **CogniX Shared Decision State Model** unifies all CogniX experiments and demonstration solutions under one coherent enterprise decision context.

The fundamental operational directive is:

> **A meaningful scenario change or decision made in one CogniX experience must be capable of changing the relevant state observed by another CogniX experience.**

Shared Decision State makes CogniX behave as **one living enterprise environment** rather than a collection of disconnected interactive screens.

---

## 2. Fundamental Architectural Principles

1. **State Ownership:** The **Decision State Domain** owns decision state, state transitions, versioning, optimistic concurrency, and derived calculations. UI components do **not** independently own enterprise state.
2. **Strict Determinism:** WP10-C state transitions are **100% deterministic, explainable, and reproducible**. Machine learning models, predictions, adaptive heuristics, and Gemini AI state mutations are strictly non-goals for WP10-C.
3. **Explicit Versioning & Traceability:** Every state modification increments `state_version` (`v1 → v2 → v3`) and records a version snapshot in `history` with timestamp, command type, changed fields, and previous version.
4. **Optimistic Concurrency Control:** Commands must supply `expected_version`. If `expected_version !== current_version`, the API rejects the transition with HTTP 409 `VersionConflict`.
5. **Separation from Journey Telemetry:** Journey Telemetry observes *what happened*. Shared Decision State maintains *what the enterprise decision context currently is*.

---

## 3. Canonical Decision State Schema

The Decision State schema is defined in [`packages/contracts/src/decision-state-model.ts`](file:///Users/renjunair/projects/Decision_Intelligence/packages/contracts/src/decision-state-model.ts) and [`docs/openapi/decision-state-v1.yaml`](file:///Users/renjunair/projects/Decision_Intelligence/docs/openapi/decision-state-v1.yaml).

```typescript
export interface DecisionState {
  decision_state_id: string;      // ds_<uuid>
  tenant_id: string;              // tenant_uk_retail_01
  session_id: string;             // ses_<uuid>
  domain_id: string;              // retail_grocery
  persona_id: string;             // exec | coo | category_manager | store_manager
  scenario_id: string;            // SCN-PROMO-01
  scenario_family: string;        // promotion_surge
  state_version: number;          // 1, 2, 3...
  created_at: string;
  updated_at: string;
  scenario_parameters: {
    promotion_lift: number;
    supplier_capacity_cap: number;
    forecast_horizon_days: number;
    promotion_method: string;
    campaign_scope: 'national' | 'regional' | 'phased';
    cannibalisation_factor: number;
    event_boost: string;
  };
  enterprise_signals: string[];
  constraints: string[];
  selected_interventions: string[];
  derived_impacts: {
    weekly_demand_units: number;
    supplier_capacity_units: number;
    commitment_gap_units: number;
    delivery_risk_pct: number;
    financial_exposure_gbp: number;
    dc_overtime_hours: number;
    margin_erosion_pct: number;
    stockout_probability_pct: number;
  };
  history: DecisionStateVersionRecord[];
  provenance: Record<string, string>;
  synthetic_demo: boolean;
}
```

---

## 4. Deterministic Command Registry

State modifications execute strictly through registered command types:

| Command Type | Payload Fields | State Effect |
|---|---|---|
| `SET_PROMOTION_LIFT` | `promotion_lift: number` | Updates lift parameter, recalculates demand & gap |
| `SET_SUPPLIER_CAPACITY_CAP` | `supplier_capacity_cap: number` | Updates supplier cap, recalculates capacity & risk |
| `SET_FORECAST_HORIZON` | `forecast_horizon_days: number` | Updates forecast horizon window |
| `SET_PROMOTION_METHOD` | `promotion_method: string` | Updates commercial offer mechanism |
| `SET_CAMPAIGN_SCOPE` | `campaign_scope: string` | Updates geographic scope, recalculates DC overtime |
| `SET_CANNIBALISATION_FACTOR` | `cannibalisation_factor: number` | Updates category cannibalisation rate |
| `SET_EVENT_BOOST` | `event_boost: string` | Updates seasonal event multiplier |
| `SELECT_INTERVENTION` | `intervention_id: string` | Adds intervention (e.g. `SLA_FLEX_RULE_4`), applies capacity flex |
| `DESELECT_INTERVENTION` | `intervention_id: string` | Removes intervention, removes flex |
| `RESET_SCENARIO` | `{}` | Restores parameters & interventions to Enterprise World baseline |

---

## 5. Cross-Solution Deterministic Propagation Flow

```text
Promotion Intelligence (Lift +20% → +28%)
        ↓
Shared Decision State Updated (v1 → v2)
        ├── Demand & Forecast: Demand 12,800 units (+28%)
        ├── Commitment: Supplier Gap 1,800 units
        ├── Inventory: Availability Exposure +58%
        ├── Decision Ripple: 2nd Order Overtime 23h, 3rd Order Erosion 3.1%
        └── Opportunity: Evaluates available intervention context
        ↓
Journey Telemetry Records SCENARIO_CHANGED Event
```

---

## 6. Storage Strategy & Demonstration Limitations

- **Store Abstraction:** Built on `IDecisionStateStore` (`lib/decision-state-store.ts`), allowing pluggable storage backend.
- **Initial Implementation:** Session-indexed in-memory ring-buffer store.
- **Demonstration Limitation:** Container restarts (`docker restart cognix-web`) clear in-memory state. This is an explicit, documented WP10-C demonstration limitation. Future production deployment will plug `PostgresDecisionStateStore` into the store abstraction without changing API contracts or client logic.

---

## 7. API Endpoints

- `GET  /api/v1/decision-state/health` — Domain Health Probe
- `POST /api/v1/decision-state` — Create/Initialise State
- `GET  /api/v1/decision-state/current?session_id={id}` — Fetch Active State
- `GET  /api/v1/decision-state/{id}` — Fetch State by ID
- `PATCH /api/v1/decision-state/{id}` — Execute Deterministic Command State Transition
- `POST /api/v1/decision-state/{id}/reset` — Reset State to Baseline
- `GET  /api/v1/decision-state/{id}/history` — Fetch Version History

---

## 8. Campaign Decision Contract & Outcome Frontier Integration

### 8.1 Active Decision Contract Binding
Shared Decision State binds to the active `DecisionContract`:
- `contract_ref`: Unique reference ID (`ctr_<uuid>`).
- `selected_strategy_play`: Active frontier strategy (`growth`, `contribution`, `waste_reduction`, `balanced`).
- `counterfactual_run_rate`: Unadjusted baseline run-rate.
- `targeted_micro_markets`: Array of targeted store cohort IDs (`coh_nw_01`, `coh_urban_suburban`).
- `decision_half_life`: Remaining validity duration (hours).

### 8.2 Extended Commands
- `SET_STRATEGY_PLAY`: Switches Pareto frontier selection.
- `UPDATE_COUNTERFACTUAL_BASELINE`: Recalculates true incremental uplift compared to counterfactual trajectory.
- `TRIGGER_CAMPAIGN_PREMORTEM`: Evaluates campaign resilience against failure modes in Decision Ripple.
