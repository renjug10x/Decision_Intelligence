# COGNIX — INTERIM CAUSAL INTEGRITY BUGFIX REPORT

**Work item:** Pre-CDI-06 causal integrity corrections (D1 ambient zero semantics; D2 Do Nothing waste)  
**Authorised Baseline:** `64111eeab14d4542963e393c9d2f00dea81c53e8`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Discovered by:** CDI-06 design assessment (`COGNIX_CDI_06_OUTCOME_FRONTIER_DESIGN_GATE.md` C2/C3, U2/U3)  
**Execution Date:** 2026-08-15  
**Status:** CORRECTIONS COMPLETE — evidence green; independently reconciled and authorised for commit  
**Scope:** Restore truthful upstream ESF-2 / CDI-02 semantics only. No CDI-06, no ARF-B.

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `64111eeab14d4542963e393c9d2f00dea81c53e8` |
| Remotes | `gitlab` + `origin` |
| Stash | Empty |
| Working tree at start | Clean except uncommitted CDI-06 design-gate document (left untouched semantically) |
| CDI-02 / CDI-05 evidence | Present |
| Unexplained divergence | **None** |

---

## 2. Root-cause confirmation

### D1 — Ambient signal zero semantics
`services/world/src/dynamic-signal-simulator.ts` used `context.promotion_lift || 20`.  
JavaScript falsy coercion treated **explicit `0`** as missing and substituted **20% promotional lift**.  
CDI-02 Do Nothing / non-promotion paths correctly pass `promotion_lift: 0` (no stated depth), then consumed a **20% promo signal world** as ambient ESF-2 pressure. Ambient and intervention mechanics were therefore entangled.

### D2 — Do Nothing waste integrity
`lib/campaign-causal-engine.ts` `buildTrajectory` selected the 0.92 clearance factor via  
`label === 'PREDICTED_WITH_INTERVENTION'`.  
Under Do Nothing, predicted and without indices are identical, but the predicted *label* still triggered clearance → fabricated waste improvement (e.g. 386 vs 420) while `intervention_indistinguishable_from_do_nothing === true`. Economic behaviour was driven by a string label, not the causal model.

---

## 3. Corrections

| Defect | Correction |
|---|---|
| D1 | `promotion_lift ?? 20` — explicit `0` stays 0; only nullish absence defaults to 20. Validation accepts omitted `promotion_lift` (additive optional). |
| D2 | Clearance gated on `causalResult.intervention_uplift_pp > 0`, passed as `applyInterventionClearance` into `buildTrajectory`. No label/string comparison for waste economics. |

Preserved: ambient/intervention driver split; Do Nothing = no deliberate intervention (intrinsic ambient remains); CDI-05 timeline attribution as consumer of corrected CDI-02 waste; provenance unchanged; CDI-01–05 domain contracts otherwise untouched (ESF `promotion_lift` made optional for absent-default only).

Not done: CDI-06, ARF-B, ESF-4/5, ML/LLM, waste-model redesign beyond clearance gating.

---

## 4. Files changed

| Path | Change |
|---|---|
| `services/world/src/dynamic-signal-simulator.ts` | `\|\|` → `??` |
| `services/world/dist/.../dynamic-signal-simulator.js` | Mirror |
| `packages/contracts/src/enterprise-signal-model.ts` | Optional `promotion_lift`; validation allows omit |
| `packages/contracts/dist/enterprise-signal-model.js` | Mirror |
| `services/world/dist/.../enterprise-signal-model.js` | Mirror |
| `lib/campaign-causal-engine.ts` | Intervention-uplift waste clearance gate |
| `tests/unit/run-esf2-tests.ts` | Tests 18–19 |
| `tests/unit/run-cdi02-tests.ts` | Test 21 rewritten; Tests 31–36 |
| `tests/unit/run-cdi05-tests.ts` | Tests 45–46 Inventory lens |
| `docs/reports/COGNIX_CDI_02_COUNTERFACTUAL_CAUSAL_REPORT.md` | Interim note |
| `docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_REPORT.md` | Interim note |
| This report | Evidence |

Unchanged semantically: `docs/reports/COGNIX_CDI_06_OUTCOME_FRONTIER_DESIGN_GATE.md`

---

## 5. Regression evidence

| Suite | Result |
|---|---|
| ESF-2 | **19/19 PASS** (incl. explicit-0 and absent-default) |
| CDI-02 | **36/36 PASS** (incl. D1/D2 guards 31–36; Test 21 updated) |
| CDI-05 | **70/70 PASS** (incl. Inventory lens 45–46) |
| CDI-01 | **21/21 PASS** |
| CDI-03 | **31/31 PASS** |
| CDI-04 | **49/49 PASS** |
| IFI-1 | **12/12 PASS** |
| ESF-3 | **22/22 PASS** |
| `tsc -p packages/contracts --noEmit` | **PASS** |
| `npm run build` | **PASS** |
| `git diff --check` | **PASS** |

Mapped to required proofs:
1. Explicit lift 0 → 0 — ESF-2 T18, CDI-02 T31  
2. Absent → default 20 — ESF-2 T19, CDI-02 T32  
3. Do Nothing no promotional ambient — CDI-02 T21/T33  
4. Do Nothing waste delta 0 — CDI-02 T21/T34  
5. Intervention still clears waste when uplift > 0 — CDI-02 T35  
6. Reconciliation intact — CDI-02 T36  
7. CDI-05 Inventory reflects truth — CDI-05 T45/T46  

### Independent reconciliation (pre-commit)

Re-verified against the authorised baseline before this change was committed:

| Probe | Observation |
|---|---|
| `promotion_lift` domain | `0` → validator accepts, Today delta `0`; `20` / `undefined` / `null` / key-absent → Today delta `18`; non-numeric → rejected with `Invalid field: promotion_lift must be a number when provided` |
| Ambient survives outside the promotional family | `supplier_breach` scenario with `promotion_lift: 0` still yields non-zero `SUPPLIER_LEAD_TIME_DRIFT` Today movement — the correction removes fabricated *promotional* pressure only, it does not silence ambient signals |
| Posture matrix (signals on) | `CONSIDER_DO_NOTHING` / `UNDECIDED`: ambient `1.42`, intervention `0`, signal `0`, waste `420` on both paths, `waste_delta_units = 0`, `intervention_indistinguishable_from_do_nothing = true`. `CONSIDER_NON_PROMOTION`: intervention `8.99`, waste `420 → 406`. `CONSIDER_PROMOTION`: intervention `14.25`, signal `0.15`, waste `420 → 406`. Reconciliation `true` in all four |
| Waste gate is causal | Clearance follows `intervention_uplift_pp > 0` across all four postures; no posture reaches clearance through its trajectory label |
| Tenant / session isolation | Two tenants evaluated concurrently retain independent ambient/intervention values; re-evaluation is stable |
| `dist` fidelity | `packages/contracts` and `services/world` recompiled; the committed `dist` artefacts for this change are byte-identical to compiler output (no hand-edited drift) |

---

## 6. Residual risks

1. **Waste model remains uncalibrated / discontinuous** (CDI-02 residual 6) — clearance still uses 0.92 and the index-105 step; only the false Do Nothing attribution is removed. Still unsuitable as a Pareto axis (CDI-06 C3). A theoretical case remains where a *negative* intervention uplift straddles the index-105 step and produces a waste reduction; unreachable with the current deterministic driver set (no posture yields net-negative intervention uplift), and its correction is waste-model redesign, out of scope here.
2. **Promotion-surge ESF-2 family is still promoLift-scaled** — with lift 0, that family produces flat zeros; non-promotional ambient signal richness remains an ESF-4 concern, not restored by inventing pressure.
3. **`promotion_lift` optional** is additive; callers that previously relied on `|| 20` elsewhere (e.g. UI init) were out of scope and may still coerce zeros in display layers unrelated to CDI-02.
4. CDI-06 design gate U2/U3 recorded these as fix-outside-CDI-06; this report discharges that corrective work item.

---

## 7. Completion verdict

**INTERIM CAUSAL INTEGRITY BUGFIX COMPLETE.**  
Upstream truth restored for D1 and D2. Ready for independent reconciliation / commit when authorised. **CDI-06 implementation may proceed after this lands.**

## 8. Next work item

CDI-06 Outcome Frontier implementation against the frozen design gate (ARF-A / `SIGNALS_EXCLUDED` only; do not reopen D1/D2).
