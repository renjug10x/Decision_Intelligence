# COGNIX — CDI-02 COUNTERFACTUAL BASELINE & CAUSAL CAMPAIGN ENGINE EXECUTION REPORT

**Work Package:** CDI-02 — Counterfactual Baseline & Causal Campaign Engine  
**Primary Agent:** Cursor Auto Balance  
**Independent Reviewer:** Claude Opus 5 (architecture, modelling, integration & closure)  
**Authorised Baseline (pre-implementation):** `fd5846638c2a647b4c931c55998df1d1ab9c2d69`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Execution Date:** 2026-08-15  
**Status:** COMPLETED — independently reviewed, six modelling/integration defects corrected, committed

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `fd5846638c2a647b4c931c55998df1d1ab9c2d69` |
| Remotes | `gitlab` + `origin` |
| Working tree at gate | Clean; stash empty |
| CDI-01 / WP10-C / IFI-01 / ESF-2 / ESF-3 evidence | Present |
| Unexplained divergence | **None** — gate PASSED |

---

## 2. Implementation Summary

CDI-02 delivers deterministic Campaign Decision Intelligence separating:

**Current Baseline → Expected Without Intervention → Predicted With Intervention**

plus a reconciled `CausalDemandContribution` decomposition. Promotional mechanic attribution requires canvas-stated provenance; `cdi01_placeholder_default` fields are never treated as stated commercial intent or causal inputs. Do Nothing / Undecided postures collapse predicted = without-intervention.

---

## 3. Files / Contracts / APIs Changed

### Contracts
- `packages/contracts/src/campaign-counterfactual-model.ts` **(new)**
- `packages/contracts/src/index.ts` + `dist/*`

### Engine
- `lib/campaign-causal-engine.ts` **(new)** — `resolveStatedMechanic`, `evaluateCausalDemandContribution`, `evaluateCounterfactualBaseline`, `evaluateCampaignDecision`

### API / OpenAPI
- `POST /api/v1/campaigns/counterfactual`
- `POST /api/v1/campaigns/evaluate-causal`
- `POST /api/v1/campaigns/evaluate` (combined)
- `docs/openapi/campaign-decision-v1.yaml` (v1.1.0)

### Experience
- `components/CampaignDecisionCanvas.tsx` — Layer 2 Campaign Delta + causal drivers
- `lib/campaign-intent-client.ts` — evaluate client helper

### Tests / Governance
- `tests/unit/run-cdi02-tests.ts` **(new)**
- `docs/governance/MASTER_PLAN.md` — CDI-02 COMPLETED
- `docs/architecture/ARCHITECTURE_DECISIONS.md` — ADR-029
- this report

**CDI-01 frozen fields / lifecycle:** not mutated.

---

## 4. Causal Model Design

### Counterfactual
Every driver declares a `driver_class`:

- **`ambient`** — `intrinsic_demand`, `external_signal_response` (ESF-2). Act on the world whether or not we intervene.
- **`intervention`** — `mechanic_response`, `non_promotion_response`, `audience_response`, `place_response`, `temporal_response`, `portfolio_effects`, `interaction_residual`. Occur only because we act.

| Trajectory | Definition |
|---|---|
| Current Baseline | Observed run-rate index = 100 |
| Expected Without Intervention | Current + **all ambient drivers** (intrinsic drift *and* observed external signals) |
| Predicted With Intervention | Without + intervention drivers (= Without when no intervention is attributed) |

**Campaign Delta = Predicted − Without.** Because ambient drivers sit on both paths, they cancel out and the campaign is credited only with what it causes:

`campaign_delta.attributable_uplift_pp === causal.intervention_uplift_pp`

and `total_predicted_uplift_pp = ambient_uplift_pp + intervention_uplift_pp` describes total movement vs the current baseline — explicitly *not* the campaign's effect.

**Do Nothing / Undecided** suppress intervention drivers only. Doing nothing means *taking no action*; it never means *the world stops moving*. Both postures collapse Predicted onto Without while ambient movement continues; they remain distinguishable by prediction confidence (Undecided 72 vs Do Nothing 88).

### Promotional economics
Promoted volume carries an eroded unit contribution (0.7% of unit contribution per point of discount depth), gated on the **same** `canvas_stated` provenance rule as demand attribution. Breakeven falls near 13–15% depth, so the engine can return a genuinely negative campaign case rather than rewarding ever-deeper discounting.

### Placeholder guard
`resolveStatedMechanic()` reads CDI-01 projection provenance. Mechanic response is attributed **only** when both `promotion_type_source` and `discount_depth_source` are `canvas_stated`. Placeholders are listed in `placeholder_fields_excluded` and contribute 0 pp. ESF-2 `promotion_lift` receives stated depth only (else 0).

---

## 5. Test Evidence

| Suite | Result |
|---|---|
| CDI-02 | **30/30 PASSED** (20 delivered + 10 review regressions) |
| CDI-01 | **21/21 PASSED** |
| IFI-01 | **12/12 PASSED** |
| WP10-C | **ALL PASSED** |
| ESF-2 | **17/17 PASSED** |
| ESF-3 | **22/22 PASSED** |
| WP10-B journey | **ALL PASSED** |
| Signal / data integrity | **6/6 + 4/4 PASSED** |
| contracts tsc | **exit 0** |
| `npm run build` | **exit 0** (routes include counterfactual/evaluate/evaluate-causal) |
| Live API adversarial probes | **PASSED** (by-id isolation → 404, malformed → 400, tenant mismatch → 400) |
| `git diff --check` | **clean** |

Covered: baseline separation, Do Nothing, stated promotion delta, causal reconciliation, placeholder exclusion, SKU/context differentiation, non-promotion lever, tenant/session adversarial isolation, ESF-2 determinism, regressions.

Review regressions (Tests 21–30) each pin a corrected defect: ambient signal survival under Do Nothing, ambient exclusion from Campaign Delta, full three-way reconciliation, zero-contribution guarantee for unattributed drivers, validator rejection of a leaking driver, by-id isolation, unknown-id handling, two-directional campaign economics, provenance-gated margin erosion, and validator rejection of a non-reconciling trajectory.

---

## 6. Deviations

| Item | Notes |
|---|---|
| ~~Ambient ESF-2 signals on Do Nothing zeroed~~ | **Reversed on review** — this modelled "no external change" rather than "no intervention". Ambient drivers now persist through Do Nothing / Undecided. See §6a D1. |
| CDI-05 full timeline UI | Not implemented — Layer 2 shows compact delta + driver list only (CDI-05 owns multi-lens timeline) |
| Opportunity window scoring | Not implemented (CDI-03) |

---

## 6a. Independent Review — Defects Found & Corrected

All six were found by adversarial probing, not by rerunning the delivered suite: the delivered 20/20 passed both before and after correction, because almost every test ran with `include_signals: false` and the reconciliation check was tautological.

| # | Severity | Defect | Correction |
|---|---|---|---|
| D1 | **Critical** | `CONSIDER_DO_NOTHING` / `UNDECIDED` zeroed **every** non-intrinsic driver, including ambient ESF-2 signals. Do Nothing modelled *no external change* rather than *no intervention* — the counterfactual asserted the market freezes when we abstain. | Added `driver_class`. Postures suppress `intervention` drivers only; `ambient` drivers persist. |
| D2 | **Critical** | `expected_without_intervention` was `100 + intrinsic` and never included external signals, while `predicted` did — so **all** ambient signal movement landed in Campaign Delta. The campaign was credited for competitor/weather/market movement it did not cause. | Without-path now carries all ambient drivers; they cancel out of the delta. |
| D3 | High | `total_predicted_uplift_pp` (vs current baseline) was presented in the UI as the campaign's contribution, though the delta was a different, smaller number. Driver rows including intrinsic drift read as campaign-caused. | Split into `ambient_uplift_pp` / `intervention_uplift_pp`; added `campaign_delta.attributable_uplift_pp`; UI labels each driver row and separates the two figures. |
| D4 | High | Reconciliation was tautological: `total` and `reconciled_sum` were the *same expression* over attributed drivers, so `reconciliation_ok` was true by construction, and a non-zero **unattributed** driver would vanish from both sides — masking exactly the formula defect the check exists to catch. | `reconciled_sum_pp` spans all drivers; unattributed drivers are forced to zero and the validator rejects any that are not; `validateCounterfactualBaseline` independently re-derives `predicted − without`. |
| D5 | High | A by-id request for another tenant's (or a non-existent) `campaign_intent_id` silently fell back to the caller's own current intent and returned `200`. No data leak, but a question about campaign X was answered with an evaluation of campaign Y, masking isolation failures as success. | By-id resolution returns `CampaignIntentNotFound` → HTTP `404`. The unreachable fallback is now an explicit throw so it cannot be reintroduced. |
| D6 | High | `UNIT_CONTRIBUTION_GBP` was constant regardless of discount depth, so contribution rose monotonically with depth — 90% off returned **+£9,404**. For an engine whose primary metric is CONTRIBUTION, "discount harder, earn more" is incoherent and made a negative campaign case unrepresentable. | Promoted units carry depth-scaled margin erosion, gated on the same provenance rule. 90% off now returns **−£8,341**; 5% off returns **+£488**. |
| D7 | Low | ADR-029 was inserted mid-list in `ARCHITECTURE_DECISIONS.md`, orphaning three ADR-028 (CDI-01) bullets under it. | ADR-029 moved below ADR-028's trailing bullets; review addenda recorded. |

### Verified sound (no change required)
Intrinsic drift present in the counterfactual · placeholder `cdi01_placeholder_default` fields never reaching causal inputs, ESF-2 `promotion_lift`, or explanations · SKU/category/region differentiation producing distinct outputs · Undecided vs Do Nothing distinguishable by confidence · cross-tenant and cross-session inline payload rejection · ESF-2 determinism · `synthetic_demo` / `calculation_mode` provenance carrying no learned-model claim · CDI-01 contract untouched · no CDI-03+ scope present.

---

## 7. Residual Risks

1. Demo elasticities and the margin-erosion coefficient are deterministic lab constants — not calibrated production demand models. They are explicit calibration targets for later ML work; the contract shape does not change when they become learned.
2. ESF-2 consumption uses Today-period averages; richer signal→driver mapping deferred to ESF-4/CDI-05.
3. Combined evaluate endpoint shares in-process CDI-01 store — process restart clears drafts/registrations.
4. Re-registration idempotency residual from CDI-01 (R5) remains outside CDI-02 scope.
5. `calculation_mode` is a single-value literal union (`deterministic_demo_*`). Admitting a calibrated mode later is an additive union member, not a redesign — but it is a contract edit.
6. Waste modelling is asymmetric (intervention paths get a 0.92 clearance factor with a step at index 105). Directionally intended — promotion clears stock — but uncalibrated and discontinuous. Candidate for CDI-04 readiness work.
7. Audience/place/temporal drivers still contribute under `CONSIDER_PROMOTION` when no mechanic is stated. Defensible (the posture *is* an intervention), and the delta stays well below a stated-mechanic case, but the semantics deserve revisiting when CDI-03 supplies real timing/micro-market resolution.

---

## 8. Exact Handoff State

- **Branch:** `Feature/MatchingContract-AutoActivate`
- **Baseline (pre-CDI-02):** `fd5846638c2a647b4c931c55998df1d1ab9c2d69`
- **Working tree:** Committed (see §10)
- **Verdict:** **COMPLETED / INDEPENDENTLY VERIFIED** — six modelling/integration defects corrected under CDI-02 scope, 10 permanent regressions added
- Do not start next WP automatically

---

## 9. Recommended Next WP

**Primary:** `CDI-03 — Opportunity Window & Micro-Market Opportunity Graph` (parallel-eligible on frozen CDI-01; integrates with CDI-02 outputs)  

**Alternative:** `CDI-04 — Campaign Decision Readiness & Resilience` (HARD on CDI-02; can follow if readiness gate is prioritised)

**Recommended agent:** Cursor Auto Balance

### Reviewer's assessment — CDI-03 vs CDI-04

Both HARD gates are now satisfied (CDI-03 hard-depends on CDI-01, frozen; CDI-04 hard-depends on CDI-02, delivered). The decider is the *integration* layer:

| | CDI-03 | CDI-04 |
|---|---|---|
| Hard deps | `CDI-01` — **satisfied** | `CDI-02` — **satisfied** |
| Integration deps | `WP10-A` (Enterprise World Store Data) — **satisfied** | `CDI-03` (`MicroMarketOpportunity`), Decision Ripple — **CDI-03 NOT satisfied** |
| Net | Fully unblocked | Would be built against a missing integration surface |

**CDI-03 is confirmed as the next package.** It is the only one with every dependency — hard *and* integration — satisfied, and it supplies the `MicroMarketOpportunity` surface CDI-04 integrates with. Taking CDI-04 first would mean stubbing that surface and reworking it later.

CDI-03 also discharges a live CDI-02 deferral: `temporal_response` currently applies a flat uncertainty dampener under `FIND_BEST_WINDOW` because timing discovery is explicitly CDI-03 scope (`lib/campaign-causal-engine.ts:176`). CDI-03 replaces that placeholder with real window resolution.

The one risk of deferring CDI-04 is that the newly corrected ambient/intervention split has no downstream consumer yet. Tests 21–30 are the guard against it being re-broken; CDI-03 work must not weaken them.
