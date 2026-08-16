# ENTERPRISE SIGNAL FABRIC & CANONICAL SIGNAL MODEL

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Group

---

## 1. Executive Purpose

The **Enterprise Signal Fabric (ESF)** provides a canonical, source-independent mechanism for representing business, customer, operational, supply chain, and market signals across CogniX.

The fundamental objective of the Signal Fabric is to answer:
> **"What is beginning to happen in the enterprise, customer environment, operations, or market?"**

---

## 2. Fundamental Separation: Telemetry vs Signals

CogniX strictly separates two distinct information domains:

| Information Domain | Core Question Answered | Canonical Model | Primary Event / Data Examples |
|---|---|---|---|
| **User Journey Telemetry** | *"What did the CogniX user do?"* | `packages/contracts/src/journey-model.ts` | `SESSION_STARTED`, `SCENARIO_CHANGED`, `PATTERN_EXPLORED`, `INTERVENTION_SELECTED` |
| **Enterprise Signals** | *"What is happening in the enterprise or operational environment?"* | `packages/contracts/src/enterprise-signal-model.ts` | `SEARCH_VELOCITY_ACCELERATION`, `SUPPLIER_LEAD_TIME_DRIFT`, `STOCK_COVER_DECLINE` |

---

## 3. Canonical Signal Contract Schema

```typescript
export interface EnterpriseSignal {
  signal_id: string;              // sig_<uuid>
  signal_type: CanonicalSignalType;
  category: SignalCategory;
  tenant_id: string;              // e.g. tenant_uk_retail_01
  domain_id?: string;             // e.g. retail_grocery
  scenario_id?: string;           // e.g. SCN-PROMO-01
  entity_type: SignalEntityType;  // SKU | REGION | SUPPLIER | DC | CATEGORY etc.
  entity_id: string;              // e.g. P004, FreshDirect UK, North West
  observed_at: string;            // ISO 8601 UTC
  effective_at: string;           // ISO 8601 UTC
  baseline_value: number;
  observed_value: number;
  delta: number;
  delta_pct: number;
  unit: string;                   // e.g. 'percent', 'units', 'hours', 'days'
  source_type: SignalSourceType;  // SYNTHETIC_WORLD | EXTERNAL_CONNECTOR | PLANNING_SYSTEM
  source_system: string;          // e.g. 'cognix_world_generator', 'blue_yonder_demand_planning'
  confidence: number;             // 0 to 100
  quality: number;                // 0 to 100
  provenance: Record<string, string>;
  synthetic_demo: boolean;        // true
  schema_version: string;         // "1.0"
}
```

---

## 4. Controlled Signal Taxonomy

### Customer & Commercial
- `SEARCH_VELOCITY_ACCELERATION`
- `PRODUCT_ENGAGEMENT_ACCELERATION`
- `BASKET_ADD_ACCELERATION`
- `CAMPAIGN_RESPONSE_ACCELERATION`
- `SLOT_BOOKING_PRESSURE`

### Demand
- `ORDER_VELOCITY_ACCELERATION`
- `REGIONAL_DEMAND_SHIFT`
- `CATEGORY_DEMAND_ACCELERATION`
- `FORECAST_DIVERGENCE`

### Supply
- `SUPPLIER_LEAD_TIME_DRIFT`
- `SUPPLIER_CAPACITY_PRESSURE`
- `ASN_VARIANCE`
- `REPLENISHMENT_DELAY`

### Inventory
- `STOCK_COVER_DECLINE`
- `REGIONAL_INVENTORY_SURPLUS`
- `PROJECTED_STOCKOUT_RISK`
- `PERISHABLE_AGEING_PRESSURE`

### Fulfilment & Logistics
- `CFC_THROUGHPUT_PRESSURE`
- `LABOUR_UTILISATION_PRESSURE`
- `PICK_RATE_DEGRADATION`
- `FULFILMENT_QUEUE_GROWTH`
- `DELIVERY_SLOT_SATURATION`
- `TRANSPORT_CAPACITY_PRESSURE`

### Commercial & Financial
- `MARGIN_COMPRESSION`
- `PROMOTION_CANNIBALISATION`
- `LOGISTICS_COST_ESCALATION`
- `INCREMENTAL_REVENUE_OPPORTUNITY`

---

## 5. Source Classification & Provenance

Every Enterprise Signal carries explicit source provenance:
- **Synthetic Signals (Current Innovation Lab):** `source_type = 'SYNTHETIC_WORLD'`, generated deterministically by the Enterprise World domain service (`services/world/src/enterprise-signal-generator.ts`). The `packages/contracts` repository remains strictly transport-neutral and owns zero scenario-generation logic.
- **Production Connectors (ESF-3):** `source_type` mapped from provider-neutral connector category (`PLANNING_SYSTEM`, `COMMERCE_TELEMETRY`, `FULFILMENT_SYSTEM`, or `EXTERNAL_CONNECTOR`). Inbound feeds enter as `ExternalSignalEnvelope` objects, are normalised by the ESF-3 normaliser, and emit canonical `EnterpriseSignal` records with explicit connector provenance. Vendor platforms are reference adapters only. **Every connector in the reference registry is `synthetic_demo: true` and is therefore non-authoritative as organisational evidence.**
- **Attested Sources (ESF-6 / Y3a) — the sole origin of `synthetic_demo = false`:** a server-side `AttestedObservationSource` registry, separate from the ESF-3 registry, holding tenant ownership, permitted observation categories, supported signal types, supported composite grain capabilities, supported measurement bases, and a named `SourceAttestation`. `source_type` is derived from the registered source's category through the existing ESF-3 mapping — **no new `SignalSourceType`, no new `ExternalSignalCategory`, no widening of `CanonicalSignalType`.**

**Authority is a property of the registry, never of the payload.** A request body cannot declare itself authoritative. The effective synthetic flag is `payload.synthetic_demo || payload.provenance.synthetic_demo || source.synthetic_demo` — **monotone toward synthetic**: a payload may declare itself synthetic and be believed, and may declare itself real and be ignored. `confidence` and `quality` (including the 80 / 85 adapter defaults) are classified `SUPPLIED` vs `ADAPTER_DEFAULT` and are **permanently barred from the authority conjunction** — a high score never creates authority.

**Synthetic provenance is immutable for the observation.** There is no migration path and none may be added: admission mints a new observation with server-issued identity and never re-flags, rewrites or re-classifies an existing one. ESF-1 / ESF-2 / ESF-3 observations remain non-authoritative permanently.

The underlying signal contract is 100% identical between synthetic and production sources. Shared Decision State references canonical signal IDs (`sig_<id>`), storing zero duplicate signal objects.

---

## 6. Enterprise Signal Fabric Roadmap Progression

- **`ESF-1` — Enterprise Signal Contract & Synthetic Signal Foundation [COMPLETED]:** Canonical contract schema, taxonomy, `cognix-world` generator, BFF proxy, and developer diagnostics.
- **`ESF-2` — Dynamic Signal Simulation & Temporal Timeline Models (ESF-2)**

ESF-2 introduces deterministic temporal signal simulation (`services/world/src/dynamic-signal-simulator.ts`):
- **Temporal Sequence:** `T-90`, `T-30`, `T-7`, `T-5`, `T-3`, `T-2`, `T-1`, `Today`, `T+1`, `T+3`, `T+7`, `T+30`, where `Today` is the canonical zero/current period.
- **Bounded Simulation Context:** `SignalSimulationContext` projects bounded decision state parameters (`session_id`, `decision_state_id`, `decision_state_version`, `promotion_lift`, `supplier_capacity_cap`, `selected_interventions`) into `cognix-world` via `POST /api/v1/signals/simulate`.
- **Intervention Temporal Immutability:** Interventions become effective at a specific `effective_period` (e.g. `T-2`). Historical observations at or before `effective_period` remain strictly unchanged (`period <= effective_period`), while future observations (`period > effective_period`) deterministically reflect intervention consequences.
- **Pure Function Simulation:** Dynamic simulation is 100% calculative and on-demand. It mutates zero state in Enterprise World, Decision State, or Telemetry.
- **`ESF-3` — External Signal Connector Contract [COMPLETED]:** Provider-neutral `ExternalSignalEnvelope` → normalisation → canonical `EnterpriseSignal` pipeline; connector registry/discovery; reference adapters across planning, commerce, weather, events, competitive intel, operational telemetry, and demographic context. Vendor labels (e.g. Blue Yonder / SAP IBP) are reference aliases only.
- **`ESF-6 / Y3a` — Attested Observation Admission [DESIGN FROZEN 2026-08-16]:** The predicate `source × context → authority` — whether an observation is evidence about the real world at all, asked before CDI-08 asks whether it addresses the contracted decision. Attested source registry, deterministic server-issued receipts (`SOURCE_REGISTRATION`, `CONTRACT_REGISTRATION`, `OBSERVATION_ADMISSION`) ordered by a per-tenant strictly monotonic `sequence` rather than any wall-clock reading, and a fail-closed admission predicate. Supersedes `Y3`. Gate: `docs/reports/COGNIX_ESF_6_ATTESTED_OBSERVATION_ADMISSION_DESIGN_GATE.md`; ADR-038, ADR-039.
- **`ESF-4` — Signal Quality, Confidence & Provenance [PENDING — parallel-eligible after ESF-6]:** Signal freshness metrics, reliability scoring, and source anomaly detection. **Admission precedes grading:** quality grades signals already admitted and can never make an inadmissible signal admissible.
- **`ESF-5` — Learned Signal Behaviour [PENDING]:** Machine Learning scoring signal precursor sequences against historical memory precedents. ML may rank, cluster, shortlist and suggest; it may never establish authority, eligibility, correspondence, comparability or a verdict.

---

## 7. Contextual Signals & Decision Half-Life Signal Tracking

### 7.1 Contextual Factor Signals
Campaign Decision Intelligence extends the taxonomy to capture contextual signals:
- `WEATHER_TEMPERATURE_ANOMALY`
- `WEATHER_PRECIPITATION_SHIFT`
- `COMPETITOR_CAMPAIGN_LAUNCH`
- `LOCAL_EVENT_DEMAND_SURGE`
- `PAYDAY_CALENDAR_EFFECT`
- `DEMOGRAPHIC_MISSION_SHIFT`

### 7.2 Decision Validity & Volatility — no signal types are added

Three signal types were previously reserved here for `CDI-07A`: `RECOMMENDATION_HALF_LIFE_DECAY`,
`ASSUMPTION_SENSITIVITY_BREACH` and `SIGNAL_VOLATILITY_SURGE`. `ESF-3` correctly declined to absorb
them, and `CDI-07A` has now ruled that **none of the three is added**. `CanonicalSignalType` is not
widened.

| Reserved type | Ruling |
| --- | --- |
| `RECOMMENDATION_HALF_LIFE_DECAY` | Not added. It names a decay quantity that does not exist — quantitative duration is unavailable until calibrated temporal evidence exists. Adding the type would create a slot demanding to be filled |
| `ASSUMPTION_SENSITIVITY_BREACH` | Not added. Fully expressed by a fired `CDI-07A` decision trigger on a load-bearing assumption. A second representation would be a competing taxonomy |
| `SIGNAL_VOLATILITY_SURGE` | Not added. Volatility is expressed as a fired trigger with its movement attribution. A surge type would carry an implied magnitude with no calibration |

Signal movement is instead evaluated against the assumptions an active `DecisionContract` declared,
producing a validity state and, where warranted, a request that a person reassess. **No signal
publishes a re-simulation instruction, and no signal supersedes or withdraws a contract
automatically** — only a named person does that. Movement caused by a Shared Decision State
parameter change is scenario-driven rather than world-driven and is reported as such.

Authoritative semantics: `docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md` §5–§7.
