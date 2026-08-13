# COGNIX — ESF-1 ENTERPRISE SIGNAL CONTRACT & SYNTHETIC SIGNAL FOUNDATION REPORT

**Document Status:** Complete & Authoritative Implementation Report  
**Date:** August 2026  
**Starting SHA Baseline:** `8ed1f9f55b2f7e7593f69dcf6e60fa3b4448aadc`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Author:** G10X Antigravity AI Engine  

---

## 1. Executive Summary

Work package **ESF-1 (Enterprise Signal Contract & Synthetic Signal Foundation)** has been successfully executed, tested, and validated across local, microservice, and containerised Docker Compose environments.

This cross-cutting capability establishes the canonical, source-independent foundation for **Enterprise Signals** in CogniX, strictly separated from user **Journey Telemetry**.

---

## 2. Implementation Truth & Key Artifacts

1. **Canonical Transport Contract ([`packages/contracts/src/enterprise-signal-model.ts`](file:///Users/renjunair/projects/Decision_Intelligence/packages/contracts/src/enterprise-signal-model.ts)):**
   - Exported `EnterpriseSignal` interface, `SignalCategory`, `SignalEntityType`, `SignalSourceType`, and `CanonicalSignalType` enum.
   - Built `validateEnterpriseSignal()` schema validator with strict security guardrails against token/credential leakage.
2. **OpenAPI 3.1 Specification ([`docs/openapi/enterprise-signals-v1.yaml`](file:///Users/renjunair/projects/Decision_Intelligence/docs/openapi/enterprise-signals-v1.yaml)):**
   - Documented endpoints: `/api/v1/signals/health`, `/api/v1/signals`, `/api/v1/signals/current`, and `/api/v1/signals/{id}`.
3. **Enterprise World Generator ([`services/world/src/enterprise-signal-generator.ts`](file:///Users/renjunair/projects/Decision_Intelligence/services/world/src/enterprise-signal-generator.ts)):**
   - Pure deterministic synthetic signal snapshot generator owned exclusively by the Enterprise World domain (`services/world`), producing scenario-coherent payloads for `promotion_surge`, `supplier_breach`, and general scenarios. `packages/contracts` remains strictly transport-neutral.
4. **Enterprise World Domain Service ([`services/world/src/server.ts`](file:///Users/renjunair/projects/Decision_Intelligence/services/world/src/server.ts)):**
   - Extended `cognix-world` microservice (port 8081) with signal routes (`/api/v1/signals`, `/api/v1/signals/health`, `/api/v1/signals/current`, `/api/v1/signals/{id}`).
5. **BFF Proxy Gateway ([`app/api/v1/signals/`](file:///Users/renjunair/projects/Decision_Intelligence/app/api/v1/signals/)):**
   - Same-origin proxy endpoints in `cognix-web` (port 3000) routing to `cognix-world` in `COGNIX_WORLD_MODE=service`, with zero silent fallbacks on error.
6. **Typed Client Abstraction ([`lib/enterprise-signal-client.ts`](file:///Users/renjunair/projects/Decision_Intelligence/lib/enterprise-signal-client.ts)):**
   - Browser client API providing `fetchEnterpriseSignals()`, `fetchCurrentScenarioSignals()`, and `fetchSignalById()`.
7. **Shared Decision State Reference ([`lib/decision-state-store.ts`](file:///Users/renjunair/projects/Decision_Intelligence/lib/decision-state-store.ts)):**
   - Bounded initial `enterprise_signals` reference array in `DecisionState` storing canonical signal IDs (`sig_ps_001` through `sig_ps_005`), preserving explicit reference semantics without duplicating authoritative signal records.
8. **Developer Diagnostic View ([`components/Help.tsx`](file:///Users/renjunair/projects/Decision_Intelligence/components/Help.tsx)):**
   - Added Enterprise Signals (ESF-1) diagnostic panel displaying live synthetic signals, category, entity, baseline vs observed delta, source, confidence, quality, and provenance.
9. **Governance Blueprint ([`docs/governance/ENTERPRISE_SIGNAL_MODEL.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/ENTERPRISE_SIGNAL_MODEL.md)):**
   - Authored authoritative governance model documenting signal taxonomy, source classification, and roadmap progression.

---

## 3. Verification & Test Results

- **Unit Tests ([`tests/unit/run-signal-tests.ts`](file:///Users/renjunair/projects/Decision_Intelligence/tests/unit/run-signal-tests.ts)):**
  - Passed **6/6 unit tests** covering schema validation, malformed payload rejection, determinism, scenario differentiation (`promotion_surge` vs `supplier_breach`), tenant isolation, and security guardrail checks.
- **Production Build:**
  - `npm run build` completed clean with **exit code 0** across all 25 static/dynamic routes.
- **Docker Compose Container Validation:**
  - Rebuilt with `docker compose build --no-cache && docker compose up -d`.
  - Both `cognix-web` (port 3000) and `cognix-world` (port 8081) healthy. Zero container sprawl.
- **Runtime HTTP Probes:**
  - `GET http://localhost:8081/api/v1/signals/health` $\rightarrow$ HTTP 200 OK (`cognix-world`)
  - `GET http://localhost:3000/api/v1/signals/health` $\rightarrow$ HTTP 200 OK (`cognix-web proxy`)
  - `GET http://localhost:3000/api/v1/signals?tenant_id=tenant_uk_retail_01&scenario_id=SCN-PROMO-01` $\rightarrow$ HTTP 200 OK (5 canonical signals)
  - `GET http://localhost:3000/api/v1/signals/sig_ps_001` $\rightarrow$ HTTP 200 OK (`SEARCH_VELOCITY_ACCELERATION`)
- **Regression Suite:**
  - WP10-A Scenarios (`/api/v1/scenarios`) $\rightarrow$ HTTP 200 OK
  - WP10-B Journey Telemetry (`/api/v1/journey/health`) $\rightarrow$ HTTP 200 OK
  - WP10-C Shared Decision State (`/api/v1/decision-state/health`) $\rightarrow$ HTTP 200 OK

---

## 4. Current vs Future Capability Truth

### Implemented Baseline (ESF-1):
- Canonical `EnterpriseSignal` TypeScript and OpenAPI 3.1 schemas.
- Controlled 27-signal taxonomy across 8 categories.
- Deterministic synthetic signal snapshot generation.
- `cognix-world` signal ownership and same-origin BFF proxy.
- Shared Decision State signal ID references.

### Deferred to Future Phases (ESF-2 to ESF-5 & IFI-01):
- **ESF-2:** Dynamic time-advancing signal simulation responding to user slider inputs.
- **ESF-3:** External connectors for Blue Yonder, SAP IBP, and commerce clickstream.
- **ESF-4:** Signal freshness scoring and automated anomaly detection.
- **ESF-5:** Machine Learning precursor sequence matching against historical memory precedents.
- **IFI-01:** Cross-solution Intent Fusion walkthrough across Promotion, Forecast, Commitment, Ripple, and Briefing.

---

## 5. Governance Reconciliation & Recommended Next Package

Reviewing authoritative governance ([`docs/governance/MASTER_PLAN.md`](file:///Users/renjunair/projects/Decision_Intelligence/docs/governance/MASTER_PLAN.md)):
- ESF-1 is **COMPLETED**.
- All dependencies for **ESF-2 (Dynamic Signal Simulation)** are satisfied (`WP10-A`, `WP10-C`, `ESF-1`).
- Recommended successor package: **ESF-2 — Dynamic Signal Simulation**.

---

## 6. PROPOSED NEXT WORK PACKAGE — AWAITING OWNER APPROVAL

Below is the dedicated, complete, copy-ready execution prompt for **ESF-2 — Dynamic Signal Simulation**:

```text
# COGNIX — ESF-2 DYNAMIC SIGNAL SIMULATION

## OWNER AUTHORISATION

Proceed with the next authorised CogniX implementation package:

# ESF-2 — Dynamic Signal Simulation

This is an additive cross-cutting capability under the existing CogniX Master Plan following the completed ESF-1 Enterprise Signal Foundation.

Do not start IFI-01, WP10-D, or any other successor automatically.

---

# 1. VERIFIED STARTING BASELINE

Expected branch:
Feature/MatchingContract-AutoActivate

Expected starting baseline:
HEAD f89ef39511e49b653718711a8fd3e4bba5016d82 (with local ESF-1 architectural closure completed)

Requirements before starting:
- branch = Feature/MatchingContract-AutoActivate
- both remotes aligned
- working tree contains validated ESF-1 local implementation
- no unexpected stash

If anything materially differs, STOP and report.
Do not commit, push, rebase, merge, or reset.

---

# 2. ESF-2 OBJECTIVE

Allow Enterprise Signals to evolve deterministically over time based on active scenario parameters, Commercial Intent, Shared Decision State transitions, and selected interventions.

ESF-1 established static snapshot signals. ESF-2 turns those signals into a **causally coherent dynamic timeline**:

Conceptual simulation timeline:
- T-7: Commercial Intent registered (Promotion discount set to 20%)
- T-5: SEARCH_VELOCITY_ACCELERATION (+18%)
- T-3: BASKET_ADD_ACCELERATION (+24%)
- T-2: SLOT_BOOKING_PRESSURE (+19.4%)
- T-1: DEMAND_ACCELERATION (+28%)
- T0: Campaign Launches
- T+1: SUPPLIER_CAPACITY_PRESSURE (55,000 units vs 48,000 cap)
- T+3: STOCK_COVER_DECLINE (3.2 days)

---

# 3. DOMAIN BOUNDARIES & OWNERSHIP

- **Domain Ownership:** Dynamic synthetic signal simulation belongs exclusively to the Enterprise World domain (`services/world/src/dynamic-signal-simulator.ts`).
- **Transport Contracts:** All signals consume the transport-neutral `EnterpriseSignal` model exported from `packages/contracts/src/index`. `packages/contracts` must remain transport-neutral and own zero scenario simulation rules.
- **BFF Gateway Proxy:** Browser calls same-origin `/api/v1/signals/timeline` or `/api/v1/signals` on `cognix-web` (port 3000), which proxies to `cognix-world` (port 8081) in `COGNIX_WORLD_MODE=service`.
- **Shared Decision State Integration:** Shared Decision State (`v1 → v2`) dynamically alters signal deltas (e.g. increasing promotion lift from 20% to 30% dynamically accelerates basket add and capacity pressure signals). Decision State stores signal reference IDs (`sig_<id>`), not duplicate full signal objects.
- **Journey Telemetry Separation:** Telemetry logs user UI interactions (`SCENARIO_CHANGED`). Signals represent enterprise operational shifts. Zero schema cross-pollution.
- **Topology Boundary:** No new microservice container. Container topology remains strictly `cognix-web + cognix-world`.

---

# 4. DETERMINISTIC SIMULATION SEMANTICS

- Simulation logic must be 100% deterministic, explainable, and reproducible.
- No Machine Learning or unexplainable random noise (`Math.random()`) in signal calculations.
- Given identical parameters (`tenant_id`, `scenario_id`, `state_version`, `promotion_lift`), generated signal deltas must be identical across invocations.

---

# 5. REQUIRED TESTS & VERIFICATION

1. **Contract & Service Builds:**
   - `npx tsc --project packages/contracts/tsconfig.json`
   - `npx tsc --project services/world/tsconfig.json`
2. **Unit Tests:**
   - Create `tests/unit/run-esf2-tests.ts` verifying timeline signal progression (`T-7` to `T+30`), state version reactivity (`v1 → v2` parameter changes), determinism, and tenant isolation.
3. **Application Build:**
   - `npm run build` (Exit code 0 across all routes).
4. **Docker Compose Validation:**
   - `docker compose build --no-cache && docker compose up -d`
   - Both `cognix-web` and `cognix-world` healthy.
5. **Runtime HTTP Probes & Regression:**
   - `curl -s "http://localhost:3000/api/v1/signals/health"` $\rightarrow$ HTTP 200 OK
   - `curl -s "http://localhost:3000/api/v1/signals/timeline?scenario_id=SCN-PROMO-01"` $\rightarrow$ HTTP 200 OK (Timeline signals)
   - Regression: WP10-A (`/api/v1/scenarios`), WP10-B (`/api/v1/journey/health`), WP10-C (`/api/v1/decision-state/health`), ESF-1 (`/api/v1/signals`).

---

# 6. STRICT NON-GOALS

- Do not implement ML models or neural nets.
- Do not implement external signal connectors (reserved for ESF-3).
- No new top-level sidebar UI navigation module.
- Do not start IFI-01 or WP10-D automatically.

---

# 7. GOVERNANCE RECONCILIATION REQUIREMENT

At completion of ESF-2:
1. Re-read authoritative governance (`docs/governance/MASTER_PLAN.md`, `ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md`, `ORGANISATIONAL_LEARNING_INTELLIGENCE.md`, `ENTERPRISE_SIGNAL_MODEL.md`).
2. Reconcile implementation truth with the Master Plan.
3. Generate a dedicated, complete, copy-ready Owner Authorisation prompt for the recommended successor work package (`ESF-3` or `IFI-01`).
4. STOP and await Owner review.

---

# 8. GIT GOVERNANCE & STOP CONDITION

Do not commit or push.
Keep all changes local for owner review.

After implementation, validation, governance reconciliation, and successor prompt generation:
STOP and report back.
```

---

## 7. Stop Condition Statement

- **ESF-1 architectural closure correction is COMPLETE and VERIFIED.**
- **No successor work package (ESF-2, IFI-01, or WP10-D) has been executed.**
- **No git commit or push has been performed.**
- **Awaiting Owner approval for ESF-2.**

