# COGNIX — CDI-04 DECISION READINESS & RESILIENCE EXECUTION REPORT

**Work Package:** CDI-04 — Campaign Decision Readiness & Resilience  
**Authorised Baseline (pre-implementation):** `904e488c678b53ddd2a6b5564562986469bac429`  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Authoritative design:** `docs/reports/COGNIX_CDI_04_DECISION_READINESS_DESIGN_GATE.md`  
**Independent Review:** architecture, policy-semantics, integration & closure  
**Execution Date:** 2026-08-15  
**Independent Review Date:** 2026-08-15  
**Status:** COMPLETED — independently reviewed; six defects corrected with permanent regression guards; cleared for commit

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `904e488c678b53ddd2a6b5564562986469bac429` |
| Remotes | `gitlab` + `origin` |
| Working tree at gate | Clean; stash empty |
| CDI-01 / CDI-02 / CDI-03 evidence | Present |
| Design gate | Present & FROZEN |
| Unexplained divergence | **None** — gate PASSED |

---

## 2. Implementation Summary

CDI-04 delivers a six-dimension **non-compensatory readiness lattice**:

- Dimensions: Commercial, Demand, Operational, Context, Customer, Strategic  
- States: `GO` | `CONDITIONAL_GO` | `REVIEW` | `DO_NOT_PROCEED`  
- Aggregation: floor over dimension states + caps K1–K8 (never a weighted score)  
- Centralised `ReadinessThresholdPolicy` (`synthetic_demonstration_policy`) — thresholds cannot fire vetoes  
- Vetoes V1/V2/V3a/V3b/V4/V5 with explicit `veto_basis`  
- Rejections R1–R6 (errors, not states)  
- Objective-aware Commercial + optional `economic_tolerance`  
- Operational feasibility = structural infeasibility vs WP10-C recovery levers (mirrored, parity-guarded)  
- Resilience = read-only `DecisionDerivedImpacts` references  
- Canvas Layer 4: compact summary → progressive six-dimension evidence  

No CDI-01/02/03 contract files were modified. No standalone ripple/risk engine was created.

---

## 3. Files / Contracts / APIs

| Area | Path |
|---|---|
| Contract | `packages/contracts/src/campaign-readiness-model.ts` **(new)** |
| Export | `packages/contracts/src/index.ts` |
| Engine | `lib/campaign-readiness-engine.ts` **(new)** |
| API | `POST /api/v1/campaigns/readiness` |
| OpenAPI | `docs/openapi/campaign-decision-v1.yaml` v1.3.0 |
| Client | `lib/campaign-intent-client.ts` — `evaluateCampaignReadinessClient` |
| Canvas | `components/CampaignDecisionCanvas.tsx` — Layer 4 |
| Tests | `tests/unit/run-cdi04-tests.ts` **(new)** — 49 tests (38 delivered + 11 independent-review guards) |
| WP10-C accessor | `lib/decision-state-store.ts` — additive read-only `peekCurrentStateBySession` |
| Governance | ADR-031, MASTER_PLAN CDI-04 COMPLETED, this report |

---

## 4. Readiness-Rule Implementation

| Block | Implementation |
|---|---|
| C1–C8 Commercial | Objective class derivation (metric wins); V3a/V3b; tolerance never buys CLEAR; waste at `DERIVED_KNOWN_DISCONTINUITY` |
| D1–D8 Demand | Re-runs CDI-02 validators; V1/V2; ambient vs intervention; residual/concentration via TH-D1/TH-D2 |
| O1–O8 Operational | Demand from CDI-02 volume; capacity from WP10-C; V4 only if gap > recoverable headroom (1200+500); O3 thresholds never veto; `model_divergence` published |
| X1–X6 Context | CDI-03 window tiers; anchor as `SEEDED_ASSUMPTION` + verbatim disclosure; cap K1 |
| U1–U6 Customer | Inherit CDI-03 tiers; V5 if `stores_included=0`; selectivity TH-U1; availability PROXY |
| S1–S7 Strategic | Objective coherence; UNDECIDED/placeholder constraints; open questions as WATCH |
| Aggregation | Floor lattice §3.3 + caps K1–K8; conditions require `discharge_test` |
| Confidence | Band from coverage + strength floor + model integrity; divergence caps at MODERATE (§2.5) |

---

## 5. Validation Evidence

| Suite | Result |
|---|---|
| CDI-04 | **49/49 PASS** (38 delivered + 11 review guards) |
| CDI-03 | **31/31 PASS** |
| CDI-02 | **30/30 PASS** |
| CDI-01 | **21/21 PASS** |
| WP10-C Shared Decision State | **PASS** |
| WP10-B Journey Telemetry | **PASS** |
| WP10-D Learning Patterns | **13/13 PASS** |
| ESF-1 / IFI-1 | **12/12 PASS** |
| ESF-2 | **17/17 PASS** |
| ESF-3 | **22/22 PASS** |
| Signal guardrails | **6/6 PASS** |
| Bugfix & data integrity | **4/4 PASS** |
| `tsc --noEmit` | **PASS** — no CDI-04 errors (pre-existing `journey-telemetry.test.ts` jest-type errors unchanged) |
| `next build` | **PASS** — `/api/v1/campaigns/readiness` registered |
| `git diff --check` | **PASS** |

**Parity-guard mutation test.** `decision-state-model.ts` was temporarily mutated (`SLA_FLEX_RULE_4` 1200 → 1300) and CDI-04 tests 1 and 40 both failed; the file was restored unmodified. The guard delivered originally would have passed under the same mutation.

Adversarial guards covered: compensation leakage, threshold-derived veto impossibility, synthetic-only never GO, tolerance never raises to GO/CLEAR, R5/R6, V3a/V3b/V4/V5, stockout≠veto, gap 1000→CONDITIONAL_GO vs gap 3000→V4, absent CDI-03 K2, tenant isolation, OBSERVED+synthetic ban, DECLARED_INPUT provenance, capacity_basis divergence publishing, no ripple-engine references.

---

## 6. Deviations

1. **Confidence under `model_divergence`:** Design gate §4.2 listed divergence as a `LOW` band trigger; §2.5 rule 4 and acceptance criterion 18 cap it at `MODERATE`. Implementation followed **§2.5**. **Independent review ruled the `MODERATE` cap authoritative** and reconciled §4.2 — see §6A ruling.
2. **Decision State “absence”:** WP10-C `getCurrentStateBySession` auto-creates state on first read. **Corrected** — see defect D1.
3. **Combined readiness entry:** API uses `evaluateCampaignReadinessWithDiscovery` so Canvas obtains CDI-03 when available; callers may still omit discovery to exercise K2. Accepted as delivered.

---

## 6A. Independent Review — Model-Divergence Ruling

The frozen gate contained a genuine internal contradiction, not an implementation error:

| Gate statement | Effect |
|---|---|
| §2.5 rule 4 | divergence is a `WATCH` and **caps confidence at `MODERATE`** |
| Acceptance criterion 18 | divergence emits `model_divergence` and **caps confidence at `MODERATE`** |
| §4.2 band table | `model_divergence` present ⇒ **`LOW`** |

`LOW` trips cap K5, which forces `REVIEW`. Under the §4.2 reading, any disagreement greater than 5 pp between two independent demo lift models would send an otherwise recoverable operational situation to human adjudication — even though CDI-04 already takes demand **exclusively** from CDI-02 and uses the Decision State only for capacity, so the divergence does not undermine the demand statement the assessment actually rests on.

**Ruling: the `MODERATE` cap is authoritative; the §4.2 `LOW` row is the defect.** Divergence remains visible and consequential — it is published as `confidence.model_integrity.model_divergence` and `capacity_basis.model_divergence_pp`, raises a WATCH finding on Operational (so the state can never be `GO`), and can never reach `HIGH` confidence. It simply no longer manufactures a `REVIEW`. Design gate §4.2 carries the reconciliation note; ADR-031 records the ruling. Guards: tests 44, 45.

---

## 6B. Independent Review — Defects Found & Corrected

Six defects, none of which the delivered 38 tests could detect. Each carries a permanent regression guard.

| # | Severity | Defect | Correction | Guard |
|---|---|---|---|---|
| **D1** | High | **CDI-04 wrote to Shared Decision State.** The engine resolved state via `getCurrentStateBySession`, which calls `createOrInitialiseState` and inserts a new state when none exists — violating design gate §5.3 ("CDI-04 is a **read-only consumer**") and acceptance criterion 17. It also made rule O7 and cap K3 unreachable, so acceptance criterion 20 was undemonstrable. | Added a non-mutating `peekCurrentStateBySession` to `IDecisionStateStore` (purely additive; no existing WP10-C behaviour altered) and switched the engine to it. | 38, 39 |
| **D2** | High | **Absent optional integrations forced `REVIEW`.** CDI-03 / Decision State absence was passed into the confidence derivation as a *missing required input*, producing `LOW` ⇒ cap K5 ⇒ `REVIEW` — contradicting acceptance criteria 19/20 and owner ruling U6 ("cap, not forced `REVIEW`"). The published `evidence_coverage.missing` simultaneously filtered those entries out, so the band contradicted its own published components. | `LOW` is reserved for missing **required** inputs (CDI-01/CDI-02) and `PROXY`/`MISSING` floors. Optional absence caps the band at `MODERATE` and is published in `evidence_coverage.missing`, which is now exactly the set the band was derived from. | 46, 48 |
| **D3** | Medium | **The parity guard could not fail.** `assertRecoveryLeverParity()` compared the CDI-04 mirror against `1200`/`500` literals declared in the same file. WP10-C's real values are inline literals inside `calculateDerivedImpacts()`, so upstream drift was undetectable — defeating acceptance criterion 10g ("drift fails the build"). | The guard now probes `calculateDerivedImpacts()` behaviourally, measuring the capacity delta each lever actually produces. Verified by mutation test (§5). | 1, 40 |
| **D4** | Medium | **`O2` published an unsatisfiable discharge test.** `closing_levers` listed every unapplied lever, and the condition named only the first. With `commitment_gap_units = 1500` and both levers unapplied, the test read `selected_interventions includes SLA_FLEX_RULE_4 AND commitment_gap_units === 0` — but that lever supplies 1,200 units and cannot close a 1,500-unit gap. §2.5 O2 requires naming "the lever(s) that close it". | `closing_levers` is now the minimal set (largest headroom first, deterministic tiebreak) whose combined headroom actually covers the gap; the discharge test names the whole set and states the arithmetic. | 41 |
| **D5** | Medium | **`CONDITIONAL_GO` was a wastebasket and the `REVIEW` path was dead.** Every unconditioned `CONSTRAINED`/`WATCH` dimension received a synthesised condition whose discharge test was `DIMENSION.state === 'CLEAR'` — a restatement of the finding, not a re-runnable predicate over named fields. Every constraint therefore looked dischargeable, making §3.7's degradation and acceptance criterion 10f structurally unreachable. The single `O2_no_lever` escape hatch was itself unreachable (an empty lever set implies zero headroom, which implies structural infeasibility ⇒ V4). | Conditions for `CONSTRAINED` dimensions must be authored by the rule that produced them; no synthesis. A `CONSTRAINED` dimension with no real discharge test degrades to `REVIEW` generically, and the `o2NoLever` special case was removed. `WATCH` dimensions retain a monitoring condition that names the open rule ids. | 42, 43 |
| **D6** | Low | **Unevaluated rules read as silent passes.** Rules X5 (`TH-X1`, concurrent adverse contextual signals) and O6 (ESF-2 supply-signal escalation) were not implemented, yet `TH-X1` was published in the threshold policy as though a rule consumed it. Absence of adverse-signal evidence was indistinguishable from evidence of a supportive context. | Both rules now emit an explicit non-decisive `MISSING`-strength disclosure stating that CDI-04 consumes no ESF-2 channel and that absence of adverse evidence is not evidence of health. Wiring ESF-2 into CDI-04 is deferred (RR-6), not silently assumed. | 47 |

**Additional corrections (no behaviour change, defence in depth).** The validator's independent floor recompute applied caps K5/K6 only on the all-`CLEAR` branch, so a `WATCH` or `CONSTRAINED` dimension short-circuited cap application; caps are now applied uniformly on every branch. Canvas Tier 2 rendered only the first three decisive findings per dimension and dropped `disclosure` text; it now renders every finding with its seeded/proxy disclosure verbatim, per §8.4.

**Demo-path consequence.** Before correction the default demo path returned `REVIEW` (band `LOW`, driven by a `PLACEHOLDER_EXCLUDED` strength floor that §4.2 never lists as a `LOW` trigger). It now returns `CONDITIONAL_GO` at `MODERATE` confidence with enumerated testable conditions — matching the §2.5 demo-path consequence and §3.2's definition of `REVIEW` as genuine indeterminacy.

---

## 6C. Independent Review — Adversarial Probes Passed

| Probe | Result |
|---|---|
| Non-compensation: `BLOCKING` + five `CLEAR` | `DO_NOT_PROCEED` — no leak |
| Five `CLEAR` + one `CONSTRAINED` | never `GO` |
| Caps raising a state | impossible — cap application is a monotone ceiling (`Math.max` over the state order) |
| Evidence strength raising a state | impossible — strength feeds the floor and the band only |
| Tolerance raising a state | impossible — `CONSTRAINED` ceiling on every tolerance path; K7 backstop |
| Synthetic evidence reaching `GO` | unreachable — K1/K4 plus `WATCH`/`CONSTRAINED` dimensions |
| Missing evidence as a neutral pass | no — `NOT_EVALUATED` + reason + cap + published coverage + `MODERATE` ceiling |
| Threshold firing a veto | impossible — `effect_ceiling` is type-limited to `WATCH`/`CONSTRAINED`; every `veto_basis` is non-threshold |
| Stockout 92% alone | `CONSTRAINED`, not a veto |
| Cross-tenant by id / cross-session by id / mismatched payload tenant | all rejected `R3` |
| Threshold override attempt | rejected `R6` |
| `DRAFT` intent | rejected `R1` |
| Tolerance on `VALUE_CREATION` | rejected `R5` |
| Demand sourced from Decision State | no — demand is CDI-02 `predicted_with_intervention.volume_units` only; capacity WP10-C only; `capacity_basis` published |

---

## 7. Residual Risks

| ID | Risk |
|---|---|
| RR-1 | All thresholds remain `UNCALIBRATED_LAB_DEFAULT` |
| RR-2 | Recovery headroom mirrors WP10-C demo constants (parity-guarded) |
| RR-3 | `economic_tolerance` is declared human input |
| RR-4 | Customer acquisition lacks dedicated CDI-01 objective type |
| RR-5 | Inherited CDI-02 waste discontinuity + CDI-03 seeded/proxy evidence |
| RR-6 | Rules X5 (`TH-X1`) and O6 are declared but not evaluated — CDI-04 consumes no ESF-2 signal channel. Disclosed on every response as non-decisive `MISSING`-strength findings; `TH-X1` remains published but currently unconsumed. Wiring is a follow-up, not a CDI-04 defect |
| RR-7 | `C7` compares predicted movement to `baseline_objective.target_value` without consulting `target_unit`; for `CONTRIBUTION`/`REVENUE` metrics a £ delta is compared to a target whose unit is unconstrained by CDI-01. Affects only the `WATCH`/`CONSTRAINED` shortfall grading, never a veto. Pre-existing CDI-01 vocabulary gap, recorded rather than corrected |
| RR-8 | Cap `K3` / rule `O7` are reachable only when a caller supplies a pre-computed `campaign_evaluation`. In the default path CDI-02's own `getDecisionState` materialises Shared Decision State before readiness reads it, so state genuinely exists. This is CDI-02 behaviour and is deliberately not changed here |

---

## 8. Exact Handoff State

- **Branch:** `Feature/MatchingContract-AutoActivate`  
- **Baseline at start:** `904e488c`  
- **Working tree:** CDI-04 committed after independent review  
- **Next WP:** CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition  

---

## 9. Completion Verdict

**CDI-04 COMPLETE — INDEPENDENTLY VERIFIED.**

Verified against the frozen design gate, ADR-026/028/029/030/031, and preserved CDI-01/02/03/WP10 regressions. Six defects were found by independent adversarial review — none detectable by the delivered 38 tests — and each is corrected with a permanent regression guard. One genuine contradiction inside the frozen gate (§4.2 vs §2.5/AC-18) was ruled in favour of the `MODERATE` divergence cap and reconciled in the gate, ADR-031 and this report.

Preserved invariants confirmed by probe, not by assertion alone: aggregation is a floor over six dimensions with no cross-dimension arithmetic; no threshold can fire a veto; a declared tolerance can never buy a `CLEAR` or a `GO`; negative contribution never yields `GO`; synthetic-only evidence never yields `GO`; missing evidence is never a neutral pass; CDI-04 never writes to Shared Decision State. CDI-01/02/03 contracts and WP10-C semantics are unchanged.
