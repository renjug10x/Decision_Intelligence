# COGNIX JOURNEY TELEMETRY MODEL & EVENT GOVERNANCE

**Document Status:** Approved & Authoritative  
**Version:** 1.0.0  
**Effective Date:** August 2026  
**Owner:** CogniX Architecture & Telemetry Group  

---

## 1. Purpose & Strategic Vision

The **CogniX Journey Telemetry Model** establishes a canonical, structured, tenant-aware observation framework across all CogniX experiments and demonstration solutions.

The fundamental operational directive of Journey Telemetry is:

> **Every meaningful interaction is observable, but observation does not yet change the user's decision experience.**

Journey Telemetry provides the empirical evidence foundation for future downstream capabilities:
- Shared Decision State (WP10-C)
- Adaptive Recommendations & Decision Profiles (WP10-J)
- Intelligence Moments (WP10-G)
- Counterfactual Learning & Outcome Analysis (WP10-K)
- Continuous Pattern Learning (WP10-M)

---

## 2. Fundamental Event Quality Principles

To prevent telemetry noise from degrading downstream machine learning models, CogniX enforces three mandatory event quality principles:

1. **Decision Intent over UI Noise:** Telemetry records meaningful business choices (scenario parameters, intervention selections, precedent lookups, contract checks), never raw mouse movements, hover states, re-renders, or decorative clicks.
2. **Debounced Continuous Controls:** Slider controls (e.g. promotional lift, supplier capacity, margin boost) are debounced (500ms) to ensure continuous user adjustments emit a single settled event rather than event floods.
3. **Non-Blocking Client Ingestion:** Telemetry recording runs asynchronously in the background. Ingestion failures or network drops log warnings silently and **never** block, delay, or disrupt the primary user workflow.

---

## 3. Canonical Event Model & Schema

All events adhere to the OpenAPI 3.1 contract defined in [`docs/openapi/journey-v1.yaml`](file:///Users/renjunair/projects/Decision_Intelligence/docs/openapi/journey-v1.yaml).

```typescript
export interface JourneyEvent {
  event_id: string;             // evt_<uuid>
  event_type: CanonicalEventType;
  tenant_id: string;            // tenant_uk_retail_01
  user_id: string;              // demo_user
  persona_id?: string;          // exec | coo | category_manager | store_manager
  session_id: string;           // ses_<uuid>
  domain_id?: string;           // retail_grocery
  experiment_id?: string;       // EXP-COMMITMENT-01
  solution_id?: string;         // SOL-DEMAND-02
  scenario_id?: string;         // SCN-PROMO-01
  decision_id?: string;
  timestamp: string;            // ISO 8601 UTC
  sequence_number?: number;     // 1, 2, 3...
  source?: string;              // UI component / page
  previous_state?: Record<string, any>;
  new_state?: Record<string, any>;
  metadata?: Record<string, any>;
  correlation_id?: string;
  causation_id?: string;
  schema_version: string;       // "1.0"
  data_classification?: string; // "synthetic_demo"
  synthetic_demo?: boolean;
}
```

---

## 4. Canonical Event Catalogue

The platform enforces a controlled, schema-driven event catalogue:

| Category | Canonical Event Type | Trigger Description |
|---|---|---|
| **Session Lifecycle** | `SESSION_STARTED` | User enters CogniX Lab session |
| | `SESSION_ENDED` | User exits demo session (`Exit Demo`) |
| **Navigation & Context** | `PORTFOLIO_OPENED` | Innovation Portfolio loaded or wordmark clicked |
| | `QUESTION_EXPLORED` | Curiosity prompt selected or inspected |
| | `EXPERIMENT_OPENED` | Flagship experiment workspace entered |
| | `SOLUTION_OPENED` | Demonstration solution entered |
| | `DOMAIN_SELECTED` | Domain Context changed in top bar |
| | `PERSONA_SELECTED` | Persona / Decision Lens changed in top bar |
| **Scenario Telemetry** | `SCENARIO_CHANGED` | Scenario parameters settled (lift, cap, horizon) |
| | `SCENARIO_REHEARSED` | Alternative deployment scope rehearsed |
| **Intelligence & Proof** | `FORECAST_INSPECTED` | Forecast projection evaluated |
| | `PATTERN_MATCHED` | Learning pattern matched against case |
| | `PATTERN_EXPLORED` | Enterprise Learning Pattern inspected |
| | `EVIDENCE_INSPECTED` | Underlying causal signal drawer opened |
| | `CONTRACT_CHECK_REQUESTED` | Contract SLA verification initiated |
| | `CONTRACT_CHECK_COMPLETED` | Contract SLA verification completed |
| | `EXECUTION_BRIEFING_OPENED` | Executive Briefing overlay generated |
| | `INTERVENTION_SELECTED` | Actionable intervention toggled/selected |
| **Future Reserved** | `RECOMMENDATION_VIEWED` | *Reserved for WP10-J Adaptive Recommendations* |
| | `RECOMMENDATION_ACCEPTED` | *Reserved for WP10-J Adaptive Recommendations* |
| | `RECOMMENDATION_REJECTED` | *Reserved for WP10-J Adaptive Recommendations* |
| | `DECISION_EXECUTED` | *Reserved for genuine decision confirmation* |
| | `OUTCOME_OBSERVED` | *Reserved for WP10-K Counterfactual Learning* |

---

## 5. Privacy & Security Rules

1. **Zero Credential Capture:** API keys, passwords, bearer tokens, or personal identifiers are strictly forbidden in metadata payloads. Telemetry validation (`validateJourneyEvent`) rejects any payload containing sensitive strings.
2. **Synthetic Demonstration Isolation:** All demo events carry `synthetic_demo: true` and `data_classification: "synthetic_demo"` to prevent confusion with customer production data.

---

## 6. API Endpoints

- `POST /api/v1/journey/events` — Event Ingestion Endpoint (`HTTP 202 Accepted`)
- `GET  /api/v1/journey/events` — Diagnostic Query Endpoint (`HTTP 200 OK`)
- `GET  /api/v1/journey/sessions/{session_id}` — Session Sequence Endpoint (`HTTP 200 OK`)
- `GET  /api/v1/journey/health` — Liveness Probe Endpoint (`HTTP 200 OK`)

---

## 7. Downstream Consumers

```text
Journey Telemetry (WP10-B)
       ↓
Shared Decision State (WP10-C)
       ↓
Adaptive Intelligence & Decision Profiles (WP10-J)
       ↓
Counterfactual Learning (WP10-K)
```
