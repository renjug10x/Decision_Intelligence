# COGNIX — CDI-06 OUTCOME FRONTIER & COMPETING STRATEGIES EXECUTION REPORT

**Work Package:** CDI-06 — Multi-Objective Outcome Frontier & Competing Strategies  
**Authorised Baseline (pre-implementation):** `4eab03a1922d04dac5d7a24dac47a2fa510b5637`  
**Causal-integrity ancestor:** `6afc44cdda57a29151006fa122a4f1bf6ff47214` (present)  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Authoritative design:** `docs/reports/COGNIX_CDI_06_OUTCOME_FRONTIER_DESIGN_GATE.md`  
**Execution Date:** 2026-08-15  
**Status:** COMPLETE — independently reconciled 2026-08-15; eleven defects corrected, each regression-guarded

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `4eab03a1922d04dac5d7a24dac47a2fa510b5637` |
| Remotes | `gitlab` + `origin` |
| Stash | Empty |
| Working tree at gate | Clean |
| Causal fix `6afc44cd` | Ancestor of HEAD |
| CDI-01→05 evidence | Present |
| Design gate | FROZEN (U1, U4 closed) |
| Unexplained divergence | **None** |

---

## 2. Implementation Summary

CDI-06 delivers a deterministic **Outcome Frontier**:

- Generation policy G0–G3 (Do Nothing, depth-grid promotions, non-promotion, anchor)
- Every play = real inline `evaluateCampaignDecision` under **ARF-A** (`include_signals: false`)
- Exactly two Pareto axes (attributable volume uplift pp, contribution delta GBP)
- Scenario 0 mandatory at (0, £0), visible when dominated, ambient framing
- Non-promotion shown unaltered, excluded from dominance both ways
- Selection via declared constraints only; `CHOICE_REQUIRED` when ambiguous
- `Balanced` only under frozen uniqueness rules
- CDI-04 readiness per play (annotates/constrains; never rewrites economics)
- CDI-05 `DemandDecomposition` reused via exported builder
- Canvas Layer 6 comparison drawer; no LLM

---

## 3. Files / Contracts / APIs

| Area | Path |
|---|---|
| Contract | `packages/contracts/src/campaign-frontier-model.ts` **(new)** |
| CDI-05 contracts | **Unmodified.** CDI-06 declares its own `FrontierRequiredAuthoritativeInput`; `REVENUE_REQUIRED_INPUT` reused by reference |
| Export | `packages/contracts/src/index.ts` |
| Decomposition helper | `lib/campaign-timeline-engine.ts` — `buildDemandDecompositionFromEvaluation` |
| Engine | `lib/campaign-frontier-engine.ts` **(new)** |
| API | `POST /api/v1/campaigns/outcome-frontier` |
| OpenAPI | `docs/openapi/campaign-decision-v1.yaml` v1.5.0 |
| Client | `evaluateOutcomeFrontierClient` |
| Canvas | Layer 6 in `components/CampaignDecisionCanvas.tsx` |
| Tests | `tests/unit/run-cdi06-tests.ts` — 93 assertions (AC-1…AC-33 + RR-1…RR-11 reconciliation regressions) |
| Governance | ADR-033, MASTER_PLAN COMPLETED, planning rows 9–10, this report |

---

## 4–7. Semantics (condensed)

**Strategy generation:** Closed policy; depth grid `[5,10,15,20,30]`; content-hash `play_id`; no intent-store writes.  
**Pareto:** Dominance with declared ε; no weights/utilities; display order ≠ ranking.  
**Scenario 0 / non-promotion:** G0 mandatory origin; G2 `PRESENTED_NOT_RANKED`.  
**Readiness/selection:** Per-play CDI-04; constraints remove only; Balanced under §9.4 **as amended by R4** (≥2 human-declared, opposing axes).

**Separation of concerns (binding).** Three distinct layers, never conflated in the payload:

| Layer | Question | Field |
|---|---|---|
| Raw Pareto mathematics | Which rankable plays are economically dominated? | `dominance[].dominated_by` where `participation === 'ASSESSED'` |
| Readiness / admissibility | May this play proceed at all? | `StrategyPlay.admissibility`, `readiness_reference` |
| Selection | Which viable frontier choice survives declared constraints? | `selection.status`, `eliminations` |

A readiness veto is not Pareto domination — a vetoed play leaves the dominance computation and is marked `EXCLUDED_NOT_ASSESSED`, never published as undominated. A dominated play is not merely inadmissible — it is economically beaten, stays fully admissible, and is shown with the plays that beat it.

---

## 8. Test Evidence

| Suite | Result |
|---|---|
| CDI-06 | **93/93 PASS** (54 acceptance + 39 reconciliation regressions) |
| CDI-05 | **70/70 PASS** |
| CDI-04 | **49/49 PASS** |
| CDI-03 | **31/31 PASS** |
| CDI-02 | **36/36 PASS** |
| CDI-01 | **21/21 PASS** |
| ESF-2 | **19/19 PASS** |
| IFI-1 | **12/12 PASS** |
| contracts `tsc` | **PASS** |
| `npm run build` | **PASS** — `/outcome-frontier` registered |
| `git diff --check` | **PASS** |

Attacks covered: hidden aggregation, ambient-frame leakage, Scenario 0 distortion, non-promotion rank creep, selection overreach, invented outcomes, readiness rewrite, Pareto reproducibility, tenant isolation.

---

## 9. Owner Addendum Rulings (R1–R8, binding; supersede conflicting gate text)

| Id | Ruling | Landed as |
|---|---|---|
| **R1** | Do not widen CDI-05 `TimelineLens` / `RequiredAuthoritativeInput`. CDI-06 may define a local additive capability form reusing existing provenance semantics. Revenue continues to reuse the CDI-05 requirement. No unsafe casts. | `FrontierRequiredAuthoritativeInput` + `FrontierCapability` in `campaign-frontier-model.ts`; CDI-05 contract byte-unchanged; `REVENUE_REQUIRED_INPUT` reused **by reference**. RR-11 |
| **R2** | Deduplicate strategies by canonical effective `CampaignIntent` **before** evaluation; retain G3 over G1; record suppression provenance; evaluate once; never let a duplicate create `CHOICE_REQUIRED` or false frontier multiplicity. | `canonicalEffectiveIntent` + precedence G0 > G3 > G1 > G2; `suppressed_duplicates` published; anchor identity transfers to the retained play. RR-2, RR-3 |
| **R3** | Dominance retains declared epsilon; `tied_groups` use deterministic canonical equality of the published two-axis values, not transitive epsilon-nearness. A pair may never be both tied and in a dominance relation. | `canonicalAxisKey` grouping; `assertTieSemantics`. RR-5 |
| **R4** | Derived `CommercialObjectiveClass` is not human-declared and must never receive a fabricated `declared_by`. Only explicit human constraints with authentic provenance count toward `BALANCED_UNDER_DECLARED_CONSTRAINTS`. | `ConstraintSource`; derived constraints carry `derived_from`, never `declared_by`; Balanced requires ≥2 `HUMAN_DECLARED` on opposing axes. RR-4 |
| **R5** | Waste remains `NOT_ADMISSIBLE_AS_AXIS`, justified by **insufficient causal calibration/resolution**, not by a fixed `{0, −14}` or a global inertness assertion. | `reason_code: 'INSUFFICIENT_CAUSAL_RESOLUTION'`; disclosure rewritten; AC-32b replaced by a reason-code and behaviour assertion. AC-32b/c/d |
| **R6** | Every play must publish or permit reconstruction of its mutation set; all comparison inputs outside it stay invariant. Ambient-frame equality is mandatory but not sufficient. | `MUTABLE_PLAY_DELTA_FIELDS`, `comparison_invariants`, `assertComparisonSetIntegrity`. RR-6 |
| **R7** | Use schema/key **allowlisting** and semantic assertions. Do not weaken guards to accommodate legitimate enum/string values. No unauthorised numeric scalar capable of ordering plays. | `ALLOWED_PLAY_NUMERIC_PATHS` + `assertNoUnauthorisedNumericScalar`; the denylist is retained as a secondary check only. RR-7 |
| **R8** | With no generative narrative layer, narrative-specific ACs are `NOT_APPLICABLE`, not vacuously `PASS`. Provider-independent determinism must still be tested. | AC-29 recorded `NOT_APPLICABLE — no narrative layer exists`; determinism proved by repeat-run byte equality with only `timestamp`/`evaluation_id` elided. |

---

## 10. Defects Found by Independent Reconciliation

| Id | Defect | Correction |
|---|---|---|
| RR-1 | **Play artefact binding was non-discriminating.** CDI-02 derives `counterfactual_id`/`causal_id` from `campaign_intent_id`; every variant reused the anchor's id, so all seven plays shared one `counterfactual_id`, one `causal_id` and one `readiness_id`. A cross-play artefact swap was undetectable, and upstream RJ3 binding could not catch it either. | Play-scoped, content-derived `campaign_intent_id` (never registered, feeds no numeric seed); `assertPlayArtefactsDistinct`. |
| RR-2 | **Two Scenario 0 plays on the product's default anchor.** With posture `UNDECIDED`, G3 emitted a second Do Nothing at (0, £0) — §6.1 requires exactly one. | R2 dedupe with posture normalisation; `validateOutcomeFrontier` now rejects more than one `DO_NOTHING`. |
| RR-3 | **On-grid anchor duplicated a grid play**, inflating the frontier and making a unique survivor — and therefore the gate's own canonical `Balanced` example — unreachable. | R2 dedupe retaining G3. |
| RR-4 | **Fabricated human attribution.** The derived objective class carried `declared_by: 'baseline_objective'` and counted toward `Balanced`, so the label was emitted on the strength of one genuine human declaration. | R4: `ConstraintSource`, `derived_from`, `assertNoFabricatedDeclaration`, corrected `assertBalancedLabelLegitimate`. |
| RR-5 | **Tie grouping by transitive epsilon-nearness** could place a play in two groups and admit a dominated play into a tie (latent on shipped data, reachable by construction). | R3 canonical equality. |
| RR-6 | **No comparison-set integrity guard.** Frame equality was the only cross-play check. | R6 guard + published invariants. |
| RR-7 | **Denylist-only aggregate detection.** An ordering scalar with an innocuous name passed every guard. | R7 allowlist. |
| RR-8 | **Pareto and admissibility were conflated in the payload.** A vetoed play published `dominated_by: []`, indistinguishable from a genuine frontier member. | `DominanceRelation.participation` + `exclusion_basis`. |
| RR-9 | **The published resolving hint did not resolve.** The elimination predicate removes on `uplift < bound − ε`, so a bound one ε above the runner-up left it standing. | Hint derived from the predicate; regression test declares the published hint and asserts `SELECTED`. |
| RR-10 | **Admissibility overwrite masked model integrity.** Non-promotion was relabelled `EXCLUDED_ECONOMICS_INCOMPLETE` unconditionally, which would hide a reconciliation failure as an economics gap. | Relabel only when otherwise `ADMISSIBLE`. |
| RR-11 | **CDI-05 contract widened** (`RequiredAuthoritativeInput.enables`) — an upstream edit the gate forbids. Also: a duplicate anchor evaluation (8 evaluations for 7 plays) and a hardcoded `confidence_band: 'MODERATE'` asserting a confidence nothing established. | R1 local capability form; anchor evaluated once; confidence band taken from CDI-04, `INSUFFICIENT` when readiness does not resolve. |

**Preparation findings that did not land:** the predicted waste-bucket discontinuity (`−34` below predicted index 105) is real in the CDI-02 arithmetic but **unreachable with the declared depth grid** — the shallowest grid point clears the boundary on every anchor tested, including a deliberately thin one. It is recorded as a latent sensitivity, and R5 removes the contract's dependence on it entirely. Dominance mathematics, `play_id` determinism, ARF-A propagation, tenant isolation, ordering invariance and store hygiene were verified correct as delivered.

---

## 11. Residual Risks

- ARF-B still unavailable (shared ambient signal capability absent); ARF-A is the only emitting frame.
- Non-promotion remains unrankable until authoritative execution economics exist.
- Waste is disclosed, not optimised — the causal model does not resolve it across depths.
- **Latent:** waste would gain two-valued resolution if the depth grid were extended below roughly 3–4% on a thin anchor. Nothing in the contract now depends on this, but a U5 grid change should re-check it.
- Depth-grid constants (U5) remain lab defaults, not calibrated.
- The controlled label vocabulary (§9.5) maps several grid depths onto the same label, so two rail entries can read alike; the depth is carried in `intent_delta` and the axis values differ. Changing the vocabulary would require reopening the frozen gate.
- Elimination attribution is first-constraint-wins in a fixed engine-determined order. Deterministic, but a play removable by two constraints names only the first.

---

## 12. Completion Verdict

**CDI-06 COMPLETE — implementation, independent adversarial reconciliation, and regression evidence.**
All owner addendum rulings R1–R8 landed. CDI-01→05 contracts unmodified.

## 13. Recommended Next WP / Agent

**CDI-07A — Decision Contract & Decision Half-Life** · implementation pass followed by a mandatory independent adversarial review before commit

## 14. Concise Next-WP Prompt

```text
COGNIX — EXECUTE CDI-07A
WP: CDI-07A — Decision Contract & Decision Half-Life
Branch: Feature/MatchingContract-AutoActivate
Baseline: <post-CDI-06 reconciled commit>
HARD: CDI-01 CampaignIntent, CDI-06 OutcomeFrontier
Do not reopen CDI-01…06. No Pre-Mortem/Learning/ESF-4.
Verify continuity; design-gate then implement; evidence + ADR; no commit until review.
```
