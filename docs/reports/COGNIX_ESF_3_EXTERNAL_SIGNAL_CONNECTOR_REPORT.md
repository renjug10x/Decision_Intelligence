# COGNIX — ESF-3 EXTERNAL SIGNAL CONNECTOR CONTRACT EXECUTION REPORT

- **Work Package:** ESF-3 — External Signal Connector Contract
- **Implementing Agent:** Cursor Auto Balance
- **Independent Reviewer & Integration Authority:** Claude Opus 5
- **Authoritative Baseline (pre-implementation):** `5911f1491e89d194cf728dde2471713043590189`
- **Branch:** `Feature/MatchingContract-AutoActivate`
- **Execution Date:** 2026-08-15
- **Status:** COMPLETED — independently reviewed, reconciled, and committed

---

## 1. Continuity Gate Result

| Check | Result |
|---|---|
| Repository | `/Users/renjunair/projects/Decision_Intelligence` |
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `5911f1491e89d194cf728dde2471713043590189` |
| Remotes | `gitlab` (primary tracking), `origin` (GitHub mirror) |
| Working tree at gate | Clean |
| Stash | Empty |
| ESF-1 evidence | Present — `docs/reports/COGNIX_ESF_1_ENTERPRISE_SIGNAL_FOUNDATION_REPORT.md` |
| ESF-2 evidence | Present — `docs/reports/COGNIX_ESF_2_DYNAMIC_SIGNAL_SIMULATION_REPORT.md` |
| IFI-01 evidence | Present — `docs/reports/COGNIX_IFI_01_INTENT_FUSION_REPORT.md` |
| Unexplained divergence | **None** — gate PASSED |

### 1.1 Independent Review Continuity Gate (Claude Opus 5)

Re-verified before any reconciliation was applied:

| Check | Result |
|---|---|
| Repository root | `/Users/renjunair/projects/Decision_Intelligence` |
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD | `5911f1491e89d194cf728dde2471713043590189` — **matches authorised baseline** |
| `gitlab/Feature/MatchingContract-AutoActivate` | `5911f149…` — **converged** |
| `origin/Feature/MatchingContract-AutoActivate` | `5911f149…` — **converged** |
| Stash | Empty |
| Working tree | Uncommitted ESF-3 work only (12 modified, 9 untracked) — **expected state** |
| Changes since baseline | ESF-3 contract, runtime, BFF, OpenAPI, tests, governance — no unrelated files |
| Unexplained divergence | **None** — gate PASSED |

---

## 2. Executive Summary

ESF-3 delivers a **provider-neutral External Signal Connector Contract** that normalises inbound external feeds into the existing canonical `EnterpriseSignal` model without coupling CogniX to any vendor platform.

Pipeline enforced:

```text
External Source → Provider Adapter → Normalisation → Canonical EnterpriseSignal → Signal Fabric
```

Vendor platforms (e.g. Blue Yonder, SAP IBP) appear only as optional **reference aliases** resolving to provider-neutral planning connectors. Raw provider payloads are rejected on the envelope path; only opaque `provider_payload_ref` provenance is retained. All reference adapters emit `synthetic_demo=true`.

ESF-1 snapshot generation, ESF-2 dynamic simulation, and IFI-01 Commercial Intent contracts remain unchanged in behaviour.

---

## 3. Files Changed

### Contracts
- `packages/contracts/src/external-signal-connector-model.ts` **(new)**
- `packages/contracts/src/enterprise-signal-model.ts` — contextual factor signal types (§7.1)
- `packages/contracts/src/index.ts` — export connector model
- `packages/contracts/dist/*` — rebuilt declarations/JS for new + updated models

### Runtime / Service
- `services/world/src/external-signal-connector.ts` **(new)** — registry, reference adapters, ingest, tenant store
- `services/world/src/server.ts` — connector discovery / ingest / ingested routes

### BFF / Client
- `app/api/v1/signals/connectors/route.ts` **(new)**
- `app/api/v1/signals/connectors/ingest/route.ts` **(new)**
- `app/api/v1/signals/connectors/ingested/route.ts` **(new)**
- `lib/enterprise-signal-client.ts` — discovery + ingest helpers

### OpenAPI / Tests / Governance
- `docs/openapi/enterprise-signals-v1.yaml` — connector paths + schemas
- `tests/unit/run-esf3-tests.ts` **(new)** — 22 targeted + regression assertions
- `docs/governance/MASTER_PLAN.md` — ESF-3 marked COMPLETED
- `docs/governance/ENTERPRISE_SIGNAL_MODEL.md` — ESF-3 completion + source classification
- `docs/architecture/ARCHITECTURE_DECISIONS.md` — ADR-027
- `docs/architecture/ADAPTIVE_INTELLIGENCE_SERVICE_ARCHITECTURE.md` — ESF-3 status
- `docs/reports/COGNIX_ESF_3_EXTERNAL_SIGNAL_CONNECTOR_REPORT.md` **(this file)**

**Not touched (prohibited / out of scope):** CDI packages, Campaign Decision Canvas, causal campaign modelling, physical `cognix-decision` extraction, production credentials, real vendor integrations.

---

## 4. Contracts / API Introduced

### TypeScript contracts (`@cognix/enterprise-world-contracts`)
| Contract | Purpose |
|---|---|
| `ExternalSignalCategory` | PLANNING, COMMERCE, WEATHER, EVENTS, COMPETITIVE_INTEL, OPERATIONAL_TELEMETRY, DEMOGRAPHIC_CONTEXT |
| `ExternalSignalConnectorDescriptor` | Registry/discovery descriptor (provider-neutral) |
| `ExternalSignalEnvelope` | Inbound adapter output prior to normalisation |
| `ExternalSignalIngestRequest` / `ExternalSignalIngestResponse` | Batch ingest + rejection report |
| `normaliseEnvelopeToEnterpriseSignal()` | Pure envelope → `EnterpriseSignal` |
| `mapCategoryToSourceType()` / `mapCategoryToSignalCategory()` | Provider-neutral mappings |

### Canonical taxonomy extension (documented in ENTERPRISE_SIGNAL_MODEL §7.1)
`WEATHER_TEMPERATURE_ANOMALY`, `WEATHER_PRECIPITATION_SHIFT`, `COMPETITOR_CAMPAIGN_LAUNCH`, `LOCAL_EVENT_DEMAND_SURGE`, `PAYDAY_CALENDAR_EFFECT`, `DEMOGRAPHIC_MISSION_SHIFT`

### HTTP API
| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/signals/connectors` | Connector discovery |
| `GET` | `/api/v1/signals/connectors/{connector_id}` | Connector lookup (incl. vendor alias resolution) — **`cognix-world` only**, no BFF passthrough (see §7) |
| `POST` | `/api/v1/signals/connectors/ingest` | Envelope ingest + normalisation |
| `GET` | `/api/v1/signals/connectors/ingested` | Tenant/session scoped ingested signals |

OpenAPI: `docs/openapi/enterprise-signals-v1.yaml`

---

## 5. Architectural Decisions

1. **Provider-neutral first (ADR-027):** Categories and envelopes never encode vendor SDKs as architectural dependencies.
2. **Reference adapters only:** Seven synthetic reference connectors cover all required categories; vendor aliases map to `conn_planning_ref_01`.
3. **No vendor payload leakage:** Envelope validation rejects `raw_payload` / `vendor_payload` / `provider_body` keys; provenance may carry only `provider_payload_ref`.
4. **Preserve ESF-1 identity:** Normalised signals remain full `EnterpriseSignal` objects; synthetic/demo markers remain explicit.
5. **Minimal abstraction:** Registry + adapter + normaliser + ingest store only — no premature connector framework.
6. **Taxonomy boundary held (independent review):** Only the six §7.1 *Contextual Factor Signals* already governed by `ENTERPRISE_SIGNAL_MODEL.md` were added to `CanonicalSignalType`. The §7.2 *Decision Half-Life & Volatility Signals* (`RECOMMENDATION_HALF_LIFE_DECAY`, `ASSUMPTION_SENSITIVITY_BREACH`, `SIGNAL_VOLATILITY_SURGE`) were **not** absorbed and remain owned by CDI-07A. Verified by source scan: no half-life or volatility semantics exist anywhere in ESF-3 code.

---

## 5A. Independent Review & Reconciliation (Claude Opus 5)

The implementation was verified against the repository rather than accepted from the completion report. Two material defects were found in areas explicitly within ESF-3's scope (tenant/session boundaries) and corrected; one contract-alignment gap was closed. No scope was expanded.

### Defects found and corrected

**R1 — Session boundary leak in the connector ingest store** (`services/world/src/external-signal-connector.ts`)

Accepted signals were stored under a key derived from `request.session_id` only, while the normalised signal's effective session came from `envelope.session_id || request.session_id`. When a request omitted `session_id` but its envelopes declared one, the signal landed in the tenant-wide bucket. Because `listIngestedExternalSignals(tenant, session)` merges the tenant-wide bucket into every session read, one session's connector feed became visible to every other session in that tenant.

*Reproduced before the fix:* ingesting a `sess_A` envelope with no request session, then reading as `sess_B`, returned the `sess_A` signal.

*Correction:* each accepted signal is now stored under the session that actually owns it (envelope session takes precedence over request session). Genuinely session-less signals still land tenant-wide and remain visible to all session reads, which is the intended behaviour. Locked in by Tests 21 and 22.

**R2 — Tenant boundary bypass on the world-service ingest route** (`services/world/src/server.ts`)

The 403 `TenantBoundaryViolation` guard was gated on `searchParams.get('tenant_id')`, so it only fired when the tenant was scoped via the **query string**. A caller scoping via the `X-Tenant-ID` header — which is exactly how the BFF forwards tenant scope — could submit a body with a different `tenant_id` and have it accepted and stored under the body's tenant. The guard could not simply be made unconditional, because `tenantId` falls back to the lab default `tenant_uk_retail_01`, which would have rejected every legitimately unscoped request.

*Correction:* an `explicitTenantScope` value (header **or** query, no default fallback) is now derived alongside `tenantId`, and the boundary is enforced whenever the caller scoped the request through either channel.

*Verified over HTTP* against a live `cognix-world` instance: header-scoped mismatch → `403 TenantBoundaryViolation`; unscoped ingest → `200` accepted; cross-session and cross-tenant reads → `count 0`.

### Contract alignment closed

**R3 — `GET /api/v1/signals/connectors/{connector_id}` was implemented and claimed but undocumented.** The route existed in `cognix-world` and was listed in §4 of this report, but had no OpenAPI entry. Added to `docs/openapi/enterprise-signals-v1.yaml`, explicitly marked world-service-only with the deferred BFF passthrough recorded as a deviation (§7). The ingest path also now documents its `X-Tenant-ID` parameter and `403` response, matching R2.

### Verified as correct (no change required)

| Review dimension | Finding |
|---|---|
| Provider-neutral abstraction | Holds. Vendor identity is an opaque `provider_id` label; `VENDOR_REFERENCE_ALIASES` resolve to provider-neutral connectors and create no code dependency. |
| Canonical signal integrity | Normalised output is a full `EnterpriseSignal`, re-validated by `validateEnterpriseSignal()` before acceptance; rejected on failure. |
| Provenance preservation | `connector_id`, `external_category`, `envelope_id`, `provider_id`, `adapter_version`, normaliser version and session all retained. |
| `provider_payload_ref` semantics | Carried as an opaque string into provenance only; no raw vendor body reaches the canonical path. |
| Synthetic/demo classification | All seven reference adapters force `synthetic_demo=true`; the flag propagates to the canonical signal. |
| Raw payload rejection | Envelope and post-normalisation provenance both screened for `raw_payload` / `vendor_payload` / `provider_body` keys (see residual risk 5). |
| Malformed / unsupported input | Missing fields, out-of-range confidence/quality, unknown connector, DISABLED connector, category mismatch and unsupported `signal_type` all produce structured per-envelope rejections rather than failures. |
| Route ordering | World-service routes 5a–5d do not shadow `/api/v1/signals`, `/api/v1/signals/current`, `/api/v1/signals/simulate` or `/api/v1/signals/{id}`; `ingest` and `ingested` are reserved against the `{connector_id}` matcher. |
| BFF integration | Matches the ESF-1/ESF-2 pattern (`COGNIX_WORLD_MODE` service call with in-process demo fallback) and the established `@/services/world/src/*` import convention. |
| ESF-1 / ESF-2 / IFI-01 compatibility | No existing contract field, generator or simulator behaviour altered; taxonomy change is additive and type-only. |
| Generated artefacts (`packages/contracts/dist/`) | Intentionally tracked — 20+ `dist` files are already under version control and the package publishes `main`/`types` from `dist`. A clean `tsc` rebuild reproduced the delivered artefacts **byte-for-byte**, so they are retained. |

---

## 6. Test Evidence

All suites below were re-run by the independent reviewer **after** the R1–R3 corrections.

```bash
npx tsx tests/unit/run-esf3-tests.ts
npx tsx tests/unit/run-signal-tests.ts
npx tsx tests/unit/run-esf2-tests.ts
npx tsx tests/unit/run-ifi1-tests.ts
npx tsx tests/unit/run-decision-state-tests.ts
npx tsx tests/unit/run-journey-tests.ts
npx tsx tests/unit/run-wp10d-tests.ts
npx tsx tests/unit/run-bugfix-integrity-tests.ts
```

| Suite | Result |
|---|---|
| ESF-3 (`run-esf3-tests.ts`) | **22/22 PASSED** |
| ESF-1 (`run-signal-tests.ts`) | **6/6 PASSED** |
| ESF-2 (`run-esf2-tests.ts`) | **17/17 PASSED** |
| IFI-01 (`run-ifi1-tests.ts`) | **12/12 PASSED** |
| WP10-C Shared Decision State (`run-decision-state-tests.ts`) | **ALL PASSED** |
| WP10-B Journey Telemetry (`run-journey-tests.ts`) | **ALL PASSED** |
| WP10-D Learning Patterns (`run-wp10d-tests.ts`) | **13/13 PASSED** |
| Bugfix & platform data integrity (`run-bugfix-integrity-tests.ts`) | **4/4 PASSED** |
| Contracts TypeScript validation (`tsc --noEmit`, `packages/contracts`) | **exit 0** |
| Application TypeScript validation (`tsc --noEmit`, repo root) | **exit 0** |
| Production build (`npm run build`) | **Compiled successfully**; three connector routes registered (`/api/v1/signals/connectors`, `…/ingest`, `…/ingested`) |
| Contracts `dist` reproducibility (fresh `tsc`) | **Byte-identical** to committed artefacts |
| `git diff --check` | **Clean** (no whitespace errors) |

ESF-3 coverage includes: connector contract validation, provider-neutral normalisation, provenance preservation, malformed/unsupported handling, tenant/session boundaries, vendor-alias reference-only behaviour, credential leakage guard, session-scoped storage isolation (Tests 21–22, added during reconciliation), and ESF-1/ESF-2/IFI-01/WP10-A regression.

### Live HTTP verification (`cognix-world`, port 8099)

| Case | Result |
|---|---|
| `POST …/ingest` with `X-Tenant-ID: tenant_A`, body `tenant_id: tenant_B` | `403 TenantBoundaryViolation` (R2 fix) |
| `POST …/ingest` unscoped, valid envelope | `200`, `accepted_count: 1`, `source_type: PLANNING_SYSTEM` |
| `GET …/ingested?tenant_id=tenant_B&session_id=sess_A` | `count 1` |
| `GET …/ingested?tenant_id=tenant_B&session_id=sess_B` | `count 0` (R1 fix) |
| `GET …/ingested?tenant_id=tenant_ZZZ` | `count 0` |
| `GET …/connectors/vendor_blue_yonder_ref` | `200` → `conn_planning_ref_01` / `provider_id: reference_planning` |
| `GET …/connectors/conn_nope` | `404` |
| `GET …/connectors?category=WEATHER` | `count 1` → `conn_weather_ref_01` |

---

## 7. Deviations from Plan

| Item | Notes |
|---|---|
| Contextual signal types | Added §7.1 taxonomy types already documented in `ENTERPRISE_SIGNAL_MODEL.md` so weather/events/competitive/demographic connectors can emit canonical types. Decision Half-Life volatility types deferred to CDI-07A. |
| In-memory ingest store | Lab-grade tenant/session store in `cognix-world`; durable fabric persistence deferred (compatible with future ESF-4 / production binding). |
| No live vendor integrations | Intentional — production credentials and real external integrations remain prohibited for this WP. |
| No BFF passthrough for `GET /api/v1/signals/connectors/{connector_id}` | Recorded during independent review. The world-service route exists and is now documented in OpenAPI; a same-origin BFF route was deliberately **not** added, as connector discovery (`GET /api/v1/signals/connectors`) already covers the web surface and adding routes would widen ESF-3 scope. Deferred to whichever WP first needs single-connector lookup from the browser. |

---

## 8. Residual Risks

1. **In-memory ingest volatility:** Connector-ingested signals reset on world-service restart until a durable store is introduced.
2. **Demo-mode BFF fallback:** When `COGNIX_WORLD_MODE != service`, BFF uses in-process connector runtime (same pattern as ESF-1/ESF-2); service mode remains authoritative.
3. **ESF-4 not yet implemented:** Freshness/completeness/anomaly scoring still pending; ESF-3 emits confidence/quality defaults only (`confidence: 80`, `quality: 85` when the envelope omits them).
4. **Parallel CDI-01 ownership:** CDI-01 remains eligible in parallel but must not modify connector contracts without coordination.
5. **Raw-payload guard is name-based:** Leakage detection matches the key names `raw_payload` / `vendor_payload` / `provider_body`. An adapter that smuggled a vendor body under an unrecognised `provenance` key would pass. Acceptable for the lab (all adapters are first-party and synthetic); a structural guard — value-shape and size limits on `provenance` and `provider_payload_ref` — belongs with ESF-4 provenance scoring.
6. **`signal_id` derives from `envelope_id`:** `sig_ext_<envelope_id>` is deterministic and therefore collides if two tenants reuse the same `envelope_id`. Storage is tenant-keyed so no cross-tenant overwrite occurs today, but a durable store must include tenant in the identity.
7. **No authentication on connector endpoints:** Tenant scope is asserted by header/query, not authenticated — consistent with all existing ESF-1/ESF-2 endpoints in this lab. The boundary checks are integrity guards, not an authorisation model.

---

## 9. Exact Handoff State

- **Branch:** `Feature/MatchingContract-AutoActivate`
- **Baseline commit (pre-ESF-3):** `5911f1491e89d194cf728dde2471713043590189`
- **Working tree:** Clean — ESF-3 implementation, corrections and evidence committed and pushed to `gitlab` and `origin`
- **ESF-3 verdict:** **COMPLETED / INDEPENDENTLY VERIFIED** — implementation reviewed against the repository, two tenant/session boundary defects corrected, one OpenAPI gap closed, full test and build evidence re-run post-correction
- **Do not start next WP automatically**

---

## 10. Recommended Next Work Package

The implementing agent proposed ESF-4 as the default continuation. On independent reassessment of the Master Plan dependency DAG, **that recommendation is revised: `CDI-01` should take execution priority over `ESF-4`.**

**Primary recommendation:** `CDI-01 — Campaign Decision Canvas & Intent Model`

**Recommended agent:** Claude Opus 5 — CDI-01 freezes the `CampaignIntent` contract that seven downstream packages bind to, and it spans contracts, runtime, BFF and a new UI surface. That contract-design-under-constraint work, across an unfamiliar multi-layer surface, is where the stronger reasoning model earns its cost. Cursor Auto Balance remains well suited to ESF-4 afterwards, which is additive scoring over an already-frozen signal contract.

### Why CDI-01 over ESF-4

| Criterion | `CDI-01` | `ESF-4` |
|---|---|---|
| HARD dependencies | `WP10-C`, `IFI-01` — both COMPLETED | `ESF-2`, `ESF-3` — both COMPLETED |
| Executable now | Yes | Yes |
| Downstream packages unblocked | **7** — CDI-02, CDI-03, CDI-04, CDI-05, CDI-06, CDI-07A, CDI-07B | **1** — ESF-5 (which additionally needs `WP10-D` and Phase 10F) |
| Consumer exists today | Yes — Campaign Decision Intelligence architecture was established at the ESF-3 baseline (`5911f149`) | **No** — nothing consumes signal quality scores until a decision surface exists |
| Relationship to ESF-3 | `ESF-1`/`ESF-2` synthetic feeds already satisfy CDI-01–CDI-06; only `CDI-07B` binds ESF-3 | Enriches signals that no decision layer yet reads |

Both packages have satisfied HARD prerequisites, so this is a sequencing judgement rather than a dependency constraint. It rests on two points. CDI-01 is the single HARD gate on the entire Campaign Decision Intelligence DAG, so every day it is deferred defers seven packages; ESF-4 gates only ESF-5, which is itself blocked on other work. And ESF-4 defines what "signal quality" means — freshness, completeness, reliability thresholds — with no consumer to define it against. Building those semantics before the decision surface that acts on them risks specifying quality in the abstract and reworking it once CDI reveals what a decision actually needs from a signal.

ESF-1 through ESF-3 have established a sufficient signal foundation for CDI-01 to proceed. ESF-4 should follow CDI-01, informed by it.

**Deferred alternative:** `ESF-4 — Signal Quality, Confidence & Provenance` — remains executable in parallel under separate file ownership if the Owner wishes to run two tracks, provided it does not modify the ESF-3 connector contracts without coordination.

---

## 11. Proposed Prompt for Next WP (Handoff Recommendation Only)

```text
# COGNIX — EXECUTE CDI-01

**Work Package:** CDI-01 — Campaign Decision Canvas & Intent Model
**Primary Agent:** Claude Opus 5
**Authorised Starting Baseline:** <ESF-3 commit SHA>
**Branch:** Feature/MatchingContract-AutoActivate

Execute CDI-01 only, according to docs/governance/MASTER_PLAN.md and the current
repository state. CDI-01 takes priority over ESF-4: ESF-1 through ESF-3 have
established a sufficient signal foundation, CDI-01's HARD dependencies (WP10-C,
IFI-01) are satisfied, and CDI-01 is the single HARD gate on CDI-02 through CDI-07B.

## Continuity Gate
Before modifying anything, verify repository root, branch, HEAD, both remote branch
SHAs (gitlab and origin), working tree, staged/unstaged/untracked files, stash state,
the authorised baseline, and all changes since it. Expected state: HEAD at the
authorised baseline with a clean working tree. Stop on unexplained divergence.

## Objective
Deliver the progressive 4-area Campaign Decision Canvas input framework and freeze the
CampaignIntent contract that CDI-02 through CDI-07B will bind to:
  - CampaignIntent      — what intervention is being considered
  - BaselineObjective   — what outcome is being targeted
  - AudienceMarket      — who and where
  - DecisionContext     — constraints, timing, and decision framing

Bind to WP10-C Shared Decision State and the IFI-01 Commercial Intent Store. Consume
ESF-1 signals as an ENHANCEMENT only — CDI-01 must remain functional without them.

## Contract Freeze Obligation
CampaignIntent is a HARD dependency for seven downstream packages. Design it for that
role: explicit versioning, explicit optionality, no field whose meaning depends on a
CDI-02+ concept that does not yet exist. Document any field you are deliberately
leaving open for later extension, and say why.

## Ownership
Own only CDI-01: the four canvas contracts and their validators, the canvas runtime and
BFF/API surface, the progressive canvas UI, OpenAPI extensions, tests, and governance
evidence.

## Prohibited
Do not implement CDI-02 through CDI-07B (counterfactual/causal engine, opportunity
windows, readiness, timeline decomposition, outcome frontier, decision contract,
decision half-life, pre-mortem, closed loop). Do not implement ESF-4 or ESF-5. Do not
modify the ESF-3 connector contracts. Do not extract cognix-decision. Do not add vendor
dependencies or production credentials. Do not perform unrelated refactoring.
If a material architectural defect requires work beyond CDI-01, stop and report it
rather than silently expanding scope.

## Validation
Run the CDI-01 suite plus WP10-B, WP10-C, WP10-D, IFI-01, ESF-1, ESF-2 and ESF-3
regression; contracts and application TypeScript validation (tsc --noEmit); production
npm run build; git diff --check. Note that packages/contracts/dist is intentionally
tracked — rebuild it with tsc and commit the regenerated artefacts.

## Evidence & Handoff
Record continuity, implementation, architectural decisions, files changed,
contracts/APIs, test evidence, deviations, residual risks and completion state in a
CDI-01 execution report, and update only directly relevant governance.
Stop after CDI-01. Do not execute the next WP.
```
