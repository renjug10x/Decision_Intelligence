# COGNIX — CDI-05 DECISION TIMELINE & DEMAND DECOMPOSITION EXECUTION REPORT

**Work Package:** CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition  
**Authorised Baseline (pre-implementation):** `4b4552983e2207a7a6958be1e90831a33308fc41`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Authoritative design:** `docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_DESIGN_GATE.md`  
**Execution Date:** 2026-08-15  
**Independent reconciliation:** 2026-08-15 — six defects corrected, permanent regression tests added  
**Status:** CLOSED — implementation reconciled against the frozen design gate

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `4b4552983e2207a7a6958be1e90831a33308fc41` |
| Remotes | `gitlab` + `origin` — both present |
| Working tree at gate | Clean; stash empty |
| CDI-01 / CDI-02 / CDI-03 / CDI-04 evidence | Present (design gates + execution reports; ADR-028–031) |
| Design gate | Present & FROZEN (U1–U4 closed) |
| Scope | CDI-05 only — no unrelated file touched |
| Unexplained divergence | **None** — gate PASSED |

---

## 2. Implementation Summary

CDI-05 delivers a **temporal rendering of one closed CDI-02 evaluation** — not a forecast product:

- Exactly two trajectories (`COUNTERFACTUAL`, `INTERVENTION`) and four lenses
- Campaign-period allocation frozen to **`FLAT_RATE_IDENTITY` only** (U1) — no model- or renderer-side curvature
- `PRE_CAMPAIGN` flat at `index_pct === 100` with “modelled run-rate, not observed history” disclosure
- Non-zero ambient appears **identically** on both campaign-period trajectories; only intervention differs
- `POST_CAMPAIGN` structurally present, components `null` + `not_modelled_reason` (U3) — never zero, and
  **no envelope band extends over it**
- Revenue lens `NOT_AVAILABLE` with `required_authoritative_input` for `realised_unit_selling_price_gbp` (U2)
- Confidence reuses the CDI-04 taxonomy verbatim; primary surface is **band-only** (U4)
- `DemandDecomposition` partitioned by `driver_class`; no merged ambient/intervention waterfall
- Tier 1 shows `attributable_uplift_pp` only — never `total_predicted_uplift_pp`
- Reconciliation failure ⇒ no timeline / no decomposition
- Canvas Layer 5: What? → Why? → Evidence → What If?, with a straight-segment chart carrying both envelopes

No CDI-01/02/03/04 contract files were modified. No Half-Life, Pre-Mortem, Learning, ESF-4/5, ML/LLM ranking, or service extraction.

---

## 3. Files / Contracts / APIs

| Area | Path |
|---|---|
| Contract | `packages/contracts/src/campaign-timeline-model.ts` **(new)** |
| Export | `packages/contracts/src/index.ts` (additive export only) |
| Engine | `lib/campaign-timeline-engine.ts` **(new)** — `projectDecisionTimeline()` |
| API | `POST /api/v1/campaigns/timeline` — orchestration only |
| OpenAPI | `docs/openapi/campaign-decision-v1.yaml` v1.4.0 |
| Client | `lib/campaign-intent-client.ts` — `projectDecisionTimelineClient` |
| Canvas | `components/CampaignDecisionCanvas.tsx` — Layer 5 + `TimelineChart` |
| Tests | `tests/unit/run-cdi05-tests.ts` **(new)** — 68 tests, attacks and regressions |
| Governance | ADR-032, MASTER_PLAN CDI-05 COMPLETED + naming correction, planning-report §8.2 reconciliation, this report |

---

## 4. Timeline / Decomposition Semantics

| Phase / artefact | Semantics |
|---|---|
| PRE_CAMPAIGN | Flat identity 100 on both trajectories; modelled run-rate, explicitly not observed history |
| CAMPAIGN | Flat within phase; ambient level-shift shared by construction; intervention-only difference |
| POST_CAMPAIGN | Structurally present; numerically undefined; no series, no band, no convergence |
| Lenses | DEMAND / CONTRIBUTION / INVENTORY as renderings of the one index series; REVENUE unavailable with its enabling input named |
| Pre-campaign lens values | Both lines carry the CDI-02 **current-baseline** unit contribution and waste — no intervention effect exists before the campaign |
| Decomposition | Ambient group + intervention group; subtotals echo CDI-02; residual and excluded drivers shown in place |
| Envelope | Bounded to the modelled phases; monotone widening; effect envelope from intervention-driver uncertainty only |
| Markers | Annotations over the grid; ESF-2 context signals declare `already_in_ambient` |
| Rate discipline | Per-period rates only; no cumulative series and no horizon total |

Emit guards (all fail closed, all run inside the engine before a projection is returned):
`assertAmbientParity`, `assertAmbientMovementPresent`, `assertAttributableIsDifferenceOnly`,
`assertAllocationConserves`, `assertNoObservedHistory`, `assertPostCampaignEmpty`,
`assertEnvelopeMonotone`, `assertEnvelopeWithinModelledPhases`, `assertContextSignalsNotDoubleCounted`,
`assertUnavailableLensNamesInput`, plus a re-run of both frozen CDI-02 validators.

---

## 5. Independent Reconciliation — Defects Found & Corrected

Six defects were found after the delivered suite reported green. Each is closed with a permanent
regression test that fails if the defect returns.

| # | Defect | Why it mattered | Correction | Regression test |
|---|---|---|---|---|
| D1 | **Confidence envelopes extended across `POST_CAMPAIGN`.** Both trajectory bands were centred on the identity (95.90–104.10 and 95.74–104.26 at the first post-campaign day) and the attributable-effect band was centred on **zero** (−2.556 … +2.556) | The series points were correctly `null`, but the bands drawn over them asserted what the nulls refused to assert: reversion to baseline on the trajectories and convergence to zero effect. This is the exact U3 failure — “undefined is not zero” — expressed through the envelope instead of the series | Envelopes bounded to the modelled phases; the effect envelope covers `CAMPAIGN` points only. New guard `assertEnvelopeWithinModelledPhases` | Attack 6, Attack 6b, Test 14a, Test 38b |
| D2 | **Inventory lens published `0` waste for every pre-campaign day** while CDI-02 `current_baseline.waste_units` is 420 | Fabricated a step at the campaign boundary that is not the CDI-02 index-105 discontinuity, and reads as the campaign creating waste out of nothing. Also not recomputable from `index_pct` and CDI-02 constants (AC-25) | Pre-campaign carries the CDI-02 current-baseline waste on both lines | Test 28a, Test 28b |
| D3 | **Contribution lens applied promotional erosion before the campaign existed.** Pre-campaign showed counterfactual £18,500 against intervention £16,558 — a £1,942/period gap fourteen days before campaign start | A fabricated pre-campaign intervention effect, and the most persuasive class of error available: the chart showed the campaign destroying contribution before it began. Breaches I2/I3 at the lens layer and AC-5a | Pre-campaign uses the CDI-02 current-baseline unit contribution on both lines; erosion applies only within `CAMPAIGN` | Test 25a |
| D4 | **RJ3 was enforced only on the CDI-02 evaluation.** A supplied `opportunity_discovery` or `readiness` belonging to a different campaign — or a readiness built over a different CDI-02 evaluation — was accepted silently | The discovery resolves the **grid**; the readiness supplies the **confidence band** and the Tier 1 readiness state. Either would render one coherent-looking picture over two different decisions, and §3.3 reconciliation would be checking the wrong pair | RJ3 applied to every supplied upstream artefact, plus a readiness↔evaluation identity check | Test 40, Test 41, Test 42 |
| D5 | **The ambient-independence test could not fail.** Its `catch` block set the assertion to `true` and logged a note, so a projection that refused to build still reported PASS. AC-5d was likewise vacuous — the fixture never drove ambient to zero | A guard that cannot fail is a restatement, not a check — the defect pattern already corrected once in CDI-04 | Fixture rebuilt so both projections must genuinely construct, with no `catch`; a companion assertion proves the two fixtures differ in ambient only. AC-5d now forces ambient to exactly zero | Test 17, Test 17a, Test 17b, Test 5d |
| D6 | **The Layer 5 surface drew no timeline.** Three static boxes stood in for the chart, so §6’s binding chart obligations — both envelopes drawn, phases visually distinct, unmodelled region explicit — were unmet, and the delivered Tier 3 drawer omitted CDI-04 evidence refs, verbatim disclosures, `placeholder_fields_excluded` and provenance ids | The work package’s deliverable is a picture; the obligations that keep that picture honest cannot be satisfied by a surface that does not draw one | Straight-segment `TimelineChart` (polylines only, no curve type, spline, easing, smoothing or tension), both envelopes as polygons, tinted campaign phase, hatched “not modelled” post-campaign region, gaps rendered as gaps. Tier 3 completed | Test 10b, Test 10c, Test 38a–38d, Test 19, Test 20 |

Two lesser corrections, same reconciliation pass:

- The `INSUFFICIENT` path returned `lenses: []`, taking the Revenue lens’s declared unavailability with it.
  All four lenses now persist with empty values (Test 18); no trajectory is rendered, per §2.8.
- `weakestStrength` was a second, byte-identical implementation of CDI-04’s `weakestEvidenceStrength`.
  It now delegates to the CDI-04 export, so the strength order cannot silently diverge (Test 43).
- ESF-2 context markers and CDI-03 window bounds were never emitted, leaving the mandatory
  double-count guard (I14 / AC-29) structurally unreachable. Both are now emitted from what CDI-02
  already published — no second signal evaluation — with `already_in_ambient` asserted (Tests 29, 30).

---

## 6. Adversarial Probes — Verdicts

| Probe | Verdict |
|---|---|
| Ambient leakage into intervention attribution | **Clean** — parity asserted index-by-index; leakage fixture fails (Attack 2) |
| Ambient erasure from the counterfactual | **Clean** — pinning the campaign counterfactual to 100 while ambient ≠ 0 fails validation and emits nothing (Attack 1) |
| Counterfactual pinned to 100 during CAMPAIGN | **Clean** — rendered evidence: counterfactual steps to `100 + ambient`, intervention to `100 + ambient + intervention` |
| Fabricated engine- or renderer-side curvature | **Clean** — one-member allocation union; renderer greps clean; series are polylines with no bezier/arc commands |
| Synthetic presented as observed history | **Clean** — no `OBSERVED` basis exists; pre-campaign flat at 100 with disclosure; varying pre-campaign fails (Attack 4) |
| Accumulated rounding / allocation drift | **Clean** — identity allocation holds the endpoint on every campaign day; tampered allocation fails (Attack 8) |
| Decomposition subtotal mismatch | **Clean** — subtotals echoed, never recomputed |
| `attributed:false` drivers disappearing | **Clean** — shown in place with an exclusion reason; drop detectable against CDI-02 (Attack 11) |
| `interaction_residual` merged away | **Clean** — its own contracted row |
| Post-campaign nulls rendered as zero or convergence | **Defect D1 — corrected** |
| Revenue derived from RRP / contribution / margin | **Clean** — resolving the lens without a realised price fails (Attack 9) |
| Confidence numeric as chart precision | **Clean** — rendered surface carries no percentage and no `confidence_index` (Test 20) |
| Half-life / validity / decay / countdown creep | **Clean** — payload and source greps clean |
| Multiple upstream evaluations disagreeing | **Defect D4 — corrected** |
| Tenant / session isolation on the timeline API | **Clean** — store lookup is tenant/session scoped; cross-tenant rejected; artefact binding now enforced |
| Malformed / mismatched intent or evaluation references | **Defect D4 — corrected** |

---

## 7. Validation Evidence

| Suite | Result |
|---|---|
| CDI-05 | **68/68 PASS** |
| CDI-04 | **49/49 PASS** |
| CDI-03 | **31/31 PASS** |
| CDI-02 | **30/30 PASS** |
| CDI-01 | **21/21 PASS** |
| ESF-2 | **17/17 PASS** |
| ESF-3 | **22/22 PASS** |
| IFI-1 | **12/12 PASS** |
| WP10-D Learning Patterns | **13/13 PASS** |
| WP10-C Shared Decision State | **PASS** |
| WP10-B Journey Telemetry | **PASS** |
| Signal guardrails | **6/6 PASS** |
| Bugfix & data integrity | **4/4 PASS** |
| `tsc --noEmit -p packages/contracts` | **PASS** |
| `npm run build` | **PASS** — `/api/v1/campaigns/timeline` registered |
| `git diff --check` | **PASS** |

The CDI-05 suite runs the rendered Layer 5 SVG, not only the payload: it asserts two straight-segment
series, both envelopes present, no segment or band crossing into the unmodelled region, and no numeric
confidence anywhere on the primary surface.

Frozen upstream contracts (`campaign-intent-model`, causal, opportunity, readiness) show **no diff**.

---

## 8. Deviations

1. **`new Date()` for ISO calendar arithmetic only** — used to parse and advance UTC day strings from the
   campaign window. No wall-clock `Date.now()` and no live “today” inside projection; determinism is
   asserted by test. AC-2’s intent (no live clock) holds.
2. **Confidence band when CDI-04 is absent.** With no readiness assessment the envelope needs a band, and
   CDI-05 applies CDI-04’s own published cap from the evidence-strength floor rather than defining a
   second rule. This is the closest available reading of I15 (“no confidence band of its own”) and is
   recorded as residual RR-8 rather than treated as satisfied.
3. **No other semantic deviations** from owner rulings U1–U4 or invariants I1–I15.

---

## 9. Residual Risks (carried; not CDI-05 defects)

| ID | Risk | Handling |
|---|---|---|
| RR-1 | CDI-02 weekly rate vs 14-day horizon ambiguity | Index-space reconcile; no cumulative totals |
| RR-2 | No realised unit selling price | Revenue `NOT_AVAILABLE` + required input named |
| RR-3 | Inventory waste discontinuity | Published unsmoothed at `DERIVED_KNOWN_DISCONTINUITY` |
| RR-4 | Seeded CDI-03 discovery anchor | `SEEDED_ASSUMPTION`; band capped at MODERATE |
| RR-5 | Declared horizon-uncertainty envelope | `SEEDED_ASSUMPTION`; not a probability |
| RR-6 | Coarse ESF-2 period grain for markers | Marker grain disclosed on the marker; no ESF-4 refinement |
| RR-7 | Single-value `calculation_mode` | Future calibrated modes are additive union members |
| RR-8 | Band defaults to CDI-04’s strength-floor cap when no readiness is supplied | Applies CDI-04’s rule, defines none; a CDI-04-absent projection should be read as unframed |

**Picture risk stands.** Four of the six defects were invisible in the payload summary and visible only
when the rendered geometry and the per-period lens values were inspected. Any future change to the
Layer 5 surface warrants the same treatment.

---

## 10. Completion Verdict

**CDI-05 COMPLETE AND RECONCILED.**  
ADR-032 recorded. MASTER_PLAN §CDI-05 marked `[COMPLETED]` with the `DecisionTimelineProjection`
naming correction. Planning-report decomposition endpoint mapping reconciled to `/timeline`.

---

## 11. Recommended Next WP

**CDI-06 — Multi-Objective Outcome Frontier & AI Competing Strategies** (HARD on CDI-02
`CausalDemandContribution` and CDI-05 `DemandDecomposition`; INTEGRATION on CDI-04).

The CDI-05 dependency CDI-06 binds to — `DemandDecomposition`, partitioned by `driver_class` with
subtotals echoed from CDI-02 — is delivered, reconciled and guarded. CDI-06 is ready to gate.
