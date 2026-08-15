# COGNIX — CDI-01 CAMPAIGN DECISION CANVAS & INTENT MODEL EXECUTION REPORT

**Work Package:** CDI-01 — Campaign Decision Canvas & Intent Model  
**Primary Agent:** Cursor Auto Balance  
**Authorised Baseline (pre-implementation):** `bd8a1782a2096ecffdcd5ecfb12a4adc2ccf3a5e`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Execution Date:** 2026-08-15  
**Status:** COMPLETED (uncommitted — Owner commit/push not requested)

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `bd8a1782a2096ecffdcd5ecfb12a4adc2ccf3a5e` |
| Remotes | `gitlab` + `origin` |
| Working tree at gate | Clean; stash empty |
| WP10-C evidence | Present |
| IFI-01 evidence | Present |
| ESF-3 evidence | Present (baseline commit) |
| Unexplained divergence | **None** — gate PASSED |

---

## 2. Contracts Introduced / Evolved

### New: `packages/contracts/src/campaign-intent-model.ts`
Authoritative four-area `CampaignIntent`:
1. **Campaign Intent** — objective type, intervention posture, framing question, category/SKU scope, optional provisional mechanic
2. **Baseline & Objective** — primary metric, direction, optional target + soft constraint notes
3. **Audience & Market** — region, optional audience/channel, timing mode (`KNOWN_DATES` | `FIND_BEST_WINDOW`)
4. **Decision Context** — optional contextual notes/open questions/assumptions + refs (no mandatory toggle grid)

Supporting types: `CampaignCanvasProgress`, validators, `deriveCanvasProgress()`, `projectCampaignIntentToCommercialIntent()`, `assertNoFutureCdiCalculations()`.

### Additive evolutions (non-breaking)
- `DecisionCommandType`: `REGISTER_CAMPAIGN_INTENT`
- `DecisionState.campaign_intent_ref?: string`
- Journey event: `CAMPAIGN_INTENT_REGISTERED`

Commercial Intent schema unchanged; projection is additive and posture-gated.

---

## 3. Files Changed

**Contracts / runtime**
- `packages/contracts/src/campaign-intent-model.ts` (new)
- `packages/contracts/src/index.ts`, `decision-state-model.ts`, `journey-model.ts`
- `packages/contracts/dist/*` (rebuilt)
- `lib/campaign-intent-store.ts`, `lib/campaign-intent-client.ts` (new)
- `lib/decision-state-store.ts` (REGISTER_CAMPAIGN_INTENT handling)

**API / OpenAPI**
- `app/api/v1/campaigns/intent/route.ts` (GET/PUT/POST)
- `app/api/v1/campaigns/intent/current/route.ts`
- `app/api/v1/campaigns/intent/[id]/route.ts`
- `docs/openapi/campaign-decision-v1.yaml` (new)

**Experience**
- `components/CampaignDecisionCanvas.tsx` (new)
- `app/page.tsx`, `components/Sidebar.tsx`, `config/experiments.ts` (EXP-CDI-01)

**Tests / governance**
- `tests/unit/run-cdi01-tests.ts` (new)
- `docs/governance/MASTER_PLAN.md`
- `docs/architecture/ARCHITECTURE_DECISIONS.md` (ADR-028)
- `docs/reports/COGNIX_CDI_01_CAMPAIGN_DECISION_CANVAS_REPORT.md` (this file)

---

## 4. Decisions Made

1. Domain contract owns the long-lived interface; React Canvas is a consumer only.
2. Default intervention posture is `UNDECIDED` — promotion is never assumed.
3. IFI-01 projection occurs only for `CONSIDER_PROMOTION`.
4. CDI-02+ surfaces appear only as locked teasers — no fake calculations.
5. Contextual factors are free-form optional notes, not mandatory toggles.
6. Synthetic demo identity remains explicit on all seeded intents.

---

## 5. Test / Build Evidence

| Check | Result |
|---|---|
| CDI-01 unit suite | **16/16 PASSED** |
| IFI-01 regression | **12/12 PASSED** |
| WP10-C decision-state | **ALL PASSED** |
| ESF-3 regression | **22/22 PASSED** |
| `packages/contracts` tsc | **exit 0** |
| `npm run build` | **exit 0** (includes `/api/v1/campaigns/intent*`) |
| `git diff --check` | **clean** |

---

## 6. Deviations

| Item | Notes |
|---|---|
| IA Layer 2–5 | Intentionally not implemented (owned by CDI-02+); locked teaser section only |
| In-memory store | Lab-grade tenant/session store; durable campaign store deferred |
| Provisional mechanic fields | Optional and only shown when posture considers promotion |

---

## 7. Residual Risks

1. Draft/register store is process-local (resets on restart).
2. `CampaignIntent` freeze must be respected by CDI-02/CDI-03 — additive evolution only.
3. Non-promotion postures do not create Commercial Intent; Intent Fusion consumers must tolerate missing commercial refs.
4. UI progressive disclosure depends on client draft saves; concurrent multi-tab editing is not coordinated.

---

## 8. Exact Handoff State

- **Branch:** `Feature/MatchingContract-AutoActivate`
- **Baseline commit (pre-CDI-01):** `bd8a1782a2096ecffdcd5ecfb12a4adc2ccf3a5e`
- **Working tree:** Contains uncommitted CDI-01 implementation + evidence
- **CDI-01 verdict:** **COMPLETED / VERIFIED**
- **Do not start next WP automatically**

---

## 9. Recommended Next Work Package

**Primary:** `CDI-02 — Counterfactual Baseline & Causal Campaign Engine`  
**Recommended agent:** Cursor Auto Balance  

**Parallel-eligible after contract freeze:** `CDI-03 — Opportunity Window & Micro-Market Opportunity Graph`

---

# ANNEX A — INDEPENDENT ARCHITECTURE & CLOSURE REVIEW

**Reviewer:** Claude Opus 5 (independent of implementing agent)
**Review Date:** 2026-08-15
**Reviewed Baseline:** `bd8a1782a2096ecffdcd5ecfb12a4adc2ccf3a5e`
**Scope:** Contract-freeze gate before CDI-02 / CDI-03

## A1. Continuity Verification

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD | `bd8a1782` — matches authorised baseline |
| Commits since baseline | None |
| `gitlab` / `origin` refs at review start | Both at `bd8a1782` — fully converged |
| Stash | Empty |
| Working tree | Baseline + uncommitted CDI-01 work only |
| Unexplained divergence | **None — continuity gate PASSED** |

## A2. Independent Findings

The implementation report's structural claims were confirmed. Reviewer-authored adversarial
probes (state, isolation and posture cases, written independently of the CDI-01 suite)
surfaced defects the original suite did not cover. Existing CDI-01 Test 6 verified isolation
only via the `byKey` path and therefore could not detect the `byId` defects below.

| # | Finding | Severity | Disposition |
|---|---|---|---|
| R1 | `campaign_intent_id` was built by sanitising `tenant_id`/`session_id` into a single string, so `('acme_eu','north')` and `('acme','eu_north')` produced an identical id and overwrote one another in the id index | High | **Corrected** |
| R2 | `GET /api/v1/campaigns/intent/{id}` resolved ids with no tenant scope. Because CDI-01 ids are derived from tenant/session (unlike IFI-01's `intent_<uuid>`), any campaign intent was readable by deriving the id from a known tenant/session — and both are code-level defaults | High | **Corrected** |
| R3 | `saveCampaignIntentDraft` trusted the payload's `tenant_id`, allowing a record to be silently relocated into another tenant while its id still encoded the original owner | Medium | **Corrected** |
| R4 | Promotion projection substituted `20_percent_off` / `discount_depth: 20` when the canvas stated no mechanic, presenting an invented intervention as authoritative Commercial Intent | Medium | **Corrected** |
| R5 | Re-POSTing a registered intent re-registers it, emitting a duplicate journey event, a new Decision State version and a new Commercial Intent | Low | **Documented** (see A6) |
| R6 | After registration a session cannot begin a new campaign intent | Informational | **By design** — canvas is read-only post-registration; one authoritative intent per session in CDI-01 |

## A3. Corrections Applied

All corrections are minimal, additive and confined to CDI-01 surfaces. No CDI-02+ behaviour,
no new AI/ML logic, no refactors, no scope expansion.

1. **Collision-free ids** — `buildCampaignIntentId()` appends a short deterministic digest of the
   exact, unsanitised `tenant::session` pair, keeping ids readable and stable while removing the
   collision class (R1).
2. **Tenant-scoped id resolution** — `getCampaignIntentById(id, tenantId?, sessionId?)` filters by
   owner; the `{id}` route now requires `tenant_id` and reports a tenant mismatch as `404` rather
   than `403` to avoid an existence oracle. OpenAPI updated to match (R2).
3. **Cross-tenant write guard** — `assertIdOwnership()` rejects any write whose id is already owned
   by a different tenant/session, on create, draft-save and registration (R3).
4. **Honest provenance** — projection records `promotion_type_source`, `discount_depth_source` and
   `timing_source` as `canvas_stated` or `cdi01_placeholder_default`. IFI-01's mandatory
   `promotion_type`/`discount_depth` fields stay populated, so no IFI contract break, but downstream
   CDI packages can no longer mistake a placeholder for a committed commercial decision (R4).
5. **Regression cover** — CDI-01 suite extended with Tests 17–21 covering each correction plus the
   non-promotion Decision State path.

## A4. Critical Architectural Question — Assessment

> *Commercial Intent projection occurs only for `CONSIDER_PROMOTION`.*

**Verdict: architecturally correct. Not a structural dead end.**

`CommercialIntent` mandates `promotion_type` and `discount_depth`, and `validateCommercialIntent`
enforces both. Projecting a non-promotion posture through it would require fabricating promotional
parameters, corrupting IFI-01 fusion decomposition with interventions that do not exist.

The gate is safe **because Decision Contract participation does not run through `CommercialIntent`**.
`REGISTER_CAMPAIGN_INTENT` is posture-independent: it sets `campaign_intent_ref` on Shared Decision
State and records `intervention_posture` in provenance for *every* posture. Verified: a
`CONSIDER_NON_PROMOTION` intent advances state `vN → vN+1`, carries `campaign_intent_ref`, and
leaves no phantom `commercial_intent_ref`.

**Required additive evolution (NOT CDI-01 work):** Intent Fusion consumers key off `CommercialIntent`
today, so a non-promotion intent reaches Shared Decision State but cannot yet participate in *Intent
Fusion*. When non-promotion levers become decision-bearing, the additive change is a posture-neutral
intervention abstraction — either a `source_type` extension or an intent supertype that
`CommercialIntent` specialises. This is purely additive to the frozen CDI-01 contract and is
correctly deferred.

## A5. Contract-Freeze Verdict — **PASS**

Downstream needs assessed against the frozen contract. No immediate redesign required; no
speculative fields added.

| Downstream need | Supported by frozen contract? |
|---|---|
| Counterfactual baseline (CDI-02) | Yes — `BaselineObjective` carries metric/direction/target as structure without baseline math; `scenario_id`/`scenario_family` anchor comparison |
| Causal campaign contributions (CDI-02) | Yes — `campaign_intent_ref` + `intervention_posture` in Decision State provenance give a stable causal subject; placeholder-vs-stated provenance prevents attributing fabricated mechanics |
| Opportunity-window discovery (CDI-03) | Yes — `timing_mode: FIND_BEST_WINDOW` explicitly models "dates unknown, discover them" without embedding window scoring |
| Micro-market targeting (CDI-03) | Yes — `region`, `customer_segment`, `channel`, `store_cohort_hint` scope the market; no scoring embedded |
| Non-promotion interventions | Yes at intent and Decision State level; Intent Fusion participation needs the additive evolution in A4 |
| Contextual factors | Yes — optional `contextual_factor_notes`, deliberately notes rather than a toggle grid, so materiality stays a later-package judgement |
| Decision Contract evolution | Yes — all CDI-01 additions to `DecisionState`/`CanonicalEventType` are optional/additive |

`assertNoFutureCdiCalculations()` is enforced at both PUT and POST, and CDI-01 is confirmed free of
counterfactual, causal, opportunity-window, readiness, frontier, half-life and optimisation logic.

## A6. Residual Risks (reviewer-assessed)

1. **Re-registration is not idempotent (R5).** A repeated POST emits a duplicate
   `CAMPAIGN_INTENT_REGISTERED` event, a further Decision State version and an additional Commercial
   Intent. Left unchanged to avoid altering CDI-01 lifecycle semantics at the freeze gate, but it
   will distort CDI-07 closed-loop learning if not addressed before outcome observation lands.
2. **`getCampaignIntentById` tenant scoping is caller-supplied.** The route enforces it; the store
   parameter is optional for compatibility. A future caller could omit it. A stricter signature is
   recommended when the store becomes durable.
3. **Store is process-local.** Drafts and registrations reset on restart — lab-grade only.
4. **Write paths remain unauthenticated at the BFF layer**, consistent with existing IFI-01/WP10-C
   demo routes. Tenant identity is asserted, not authenticated. Out of CDI-01 scope; must be closed
   before any non-synthetic data.
5. **Concurrent multi-tab editing is uncoordinated** — last write wins on the draft record.
6. **Placeholder promotion defaults still populate real fields.** Provenance now labels them, so
   CDI-02 consumers **must** read `*_source` before treating mechanic/depth as stated intent.

## A7. Validation Evidence

| Suite | Result |
|---|---|
| CDI-01 (`run-cdi01-tests.ts`) | **21/21 PASSED** (16 original + 5 reviewer-added) |
| IFI-01 (`run-ifi1-tests.ts`) | 12/12 PASSED |
| WP10-C Shared Decision State | 7/7 PASSED |
| WP10-B Journey Telemetry | ALL PASSED |
| WP10-D | 13/13 PASSED |
| ESF-2 | 17/17 PASSED |
| ESF-3 | 22/22 PASSED |
| Signal | 6/6 PASSED |
| Bugfix & Platform Integrity | 4/4 PASSED |
| Reviewer adversarial probes | 23/24 — sole non-pass is R6, confirmed intended design |
| Contracts TypeScript (`tsc`) | Clean; `dist` regenerated in sync with `src` |
| Application build (`next build`) | Compiled successfully; all three campaign routes registered |
| `git diff --check` | Clean |

