# COGNIX CDI-08 — OBSERVATION CORRESPONDENCE & PREDICTION ENVELOPE IMPLEMENTATION REPORT

**Date:** 2026-08-16  
**Status:** Implemented, independently reconciled, verified  
**Branch:** `Feature/MatchingContract-AutoActivate`  
**Baseline Commit:** `41bef56f48f2c1f614a188eba1cd1b4d1261b724`  
**Authoritative Design Gate:** `docs/reports/COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_DESIGN_GATE.md`  
**ADRs:** ADR-036, ADR-037 (`docs/architecture/ARCHITECTURE_DECISIONS.md`)

---

## 1. Executive Summary

CDI-08 (*Observation Correspondence & Prediction Envelope Foundation*) has been fully implemented exactly per the frozen design gate rulings **Z1–Z5**, without deviation or scope expansion.

The implementation establishes the deterministic predicate:
$$\text{contract} \times \text{observation} \to \text{comparability}$$

Alongside the contract-native declaration of acceptance tolerances (`prediction_envelopes`), CDI-08 completes the mathematical and governance boundary required before external observation admission (`ESF-6 / Y3a`).

In addition, a curiosity-led executive refinement was delivered to `components/PromotionPlanner.tsx`. The surface now consults the live CDI-02/03/04/05 clients and states honestly, on the surface itself, which values came from a CDI result and which are seeded demo evidence. **The two headline figures — expected demand and net contribution — are produced by the seeded planning simulator on that screen, not by CDI-02**, and the surface says so rather than presenting them as adjudicated intelligence.

---

## 2. Rulings & Invariants Implemented

### 2.1 Z1 — Contract-Native Prediction Envelope
- `prediction_envelopes: DeclaredPredictionEnvelope[]` is attached top-level to `DecisionContract` and `ContractCreationRequest`.
- Automatically covered by `computeContractDigest` (SHA-256 over immutable contract body).
- Strictly excluded from `decision_basis_digest` (which evaluates named fields of `basis` only).
- Validation invariants `C-INV-ENV-1…5` enforced at contract creation:
  - `C-INV-ENV-1`: `applies_to_field_path` resolves to a published basis snapshot.
  - `C-INV-ENV-2`: Envelope `unit` and `basis` match the snapshot.
  - `C-INV-ENV-3`: Bounds are finite, non-zero, and `lower <= upper`.
  - `C-INV-ENV-4`: `declared_by` and `declaration_statement` are non-empty strings.
  - `C-INV-ENV-5`: At most one envelope per `applies_to_field_path`.

### 2.2 Z2 — Envelope Asymmetry
- Without a server-side registration receipt (`pre_declaration_witness: 'NONE'`), `WITHIN_DECLARED_ENVELOPE` is withheld:
  - `within_declared_envelope` is left `undefined`.
  - `within_withheld_reason` is published explaining unwitnessed pre-declaration.
  - Comparison verdict remains `INDETERMINATE`.
- When signed error falls outside envelope bounds:
  - `within_declared_envelope = false`.
  - Comparison verdict unlocks `OUTSIDE_DECLARED_ENVELOPE`.

### 2.3 Z4 — Composite Grain Resolution
- Exact dimension set equality and exact token identity per dimension enforced via `assertGrainResolves` and `ObservationGrainKey`.
- Jointly-covering sets of marginal observations (e.g. separate Category + Region observations) are refused fail-closed.
- Single SKU member observation does not resolve a multi-SKU scope.
- Broader or prefixed tokens fail exact token identity.

### 2.4 Predicate Sequence C0→C8
Evaluated in sequence, first failure wins, no test skipped, no test returning `true` on absent input:
1. **C0 Isolation:** Tenant & session coherent (`TENANT_SESSION_MISMATCH`). Foreign tenant observations never bind.
2. **C1 Authority:** Re-derived authority is `AUTHORITATIVE_EXTERNAL` (`OBSERVATION_NOT_AUTHORITATIVE`).
3. **C2 Grain Declared:** `ComparisonSetInvariants` has non-empty grain (`GRAIN_UNDECLARED`).
4. **C3 Window Declared:** `ComparisonSetInvariants` has valid planned window (`WINDOW_UNDECLARED`).
5. **C4 Grain Match:** `assertGrainResolves(observation, invariants)` (`GRAIN_MISMATCH`).
6. **C5 Window Match:** Exact coverage of `[planned_start, planned_end]` (`WINDOW_MISMATCH`).
7. **C6 Metric Match:** Closed mapping via `METRIC_CORRESPONDENT_SIGNAL_TYPES` (`METRIC_MISMATCH` / `METRIC_CORRESPONDENCE_UNDECLARED`).
8. **C7 Unit Match:** Normalised unit equivalence (`UNIT_MISMATCH`).
9. **C8 Quantity Basis:** Derived observed basis matches predicted basis (`QUANTITY_BASIS_UNDECLARED` / `NO_OBSERVED_COUNTERFACTUAL` / `QUANTITY_BASIS_MISMATCH`).

**Declared deviation — ATTRIBUTABLE-basis rows.** In `buildQuantityComparison`, a row whose
`predicted_basis` is `ATTRIBUTABLE` short-circuits to `NO_OBSERVED_COUNTERFACTUAL` ahead of C0–C7
rather than reaching it at C8. This is deliberate and refusal-preserving: the verdict is never more
permissive than the ordered sequence would give, gate §4 requires every existing CDI-07B assertion
to keep receiving its specific verdict string, and A-18 fixes `NO_OBSERVED_COUNTERFACTUAL` as the
required outcome for that row. Tenant/session isolation is **not** bypassed by the short-circuit —
`comparePredictionToReality` filters foreign-tenant observations before any row is built, and
`bindObservation` filters again, so a foreign observation is never a binding candidate for any row
regardless of basis.

**Window semantics.** `observed_at` is no longer read as the window test (gate §4.2); C5 evaluates
the declared measurement window by exact coverage. The `observed_at >= planned_start` staleness
floor inside `observationAuthorityBlocksLikeForLike` is retained unchanged. One consequence is
named explicitly: an observation stamped after `planned_end` was refused by the baseline
`assertGrainResolves` and is no longer refused on that ground alone. This is gate-authorised and is
the honest position — an observation of a completed campaign window is necessarily recorded after
the window closes — and it is strictly bounded by C5's exact-coverage requirement.

### 2.5 Required Input Declarations
- `PREDICTION_ENVELOPE_REQUIRED_INPUT`: Declares the capability gap enabling `PRE_DECLARATION_WITNESSED_ENVELOPE` and explicitly names inadmissible substitutes.
- `COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT`: Declares composite grain observation requirements.

---

## 3. Adversarial Test Execution Results (CDI-08 Suite)

All 30 attacks (A-01 through A-30) and auxiliary assertions were executed in `tests/unit/run-cdi08-tests.ts`.

| Attack ID | Target Scenario | Expected Behaviour | Result |
|---|---|---|---|
| **A-01** | Weather `pp` delta against `VOLUME` primary metric | `METRIC_MISMATCH`, error undefined | **PASS** |
| **A-01b** | `METRIC_MISMATCH` produces no error value | No `PredictionError` attached | **PASS** |
| **A-02** | Blank `comparison_invariants` | `GRAIN_UNDECLARED` | **PASS** |
| **A-03** | `planned_start = null` | `WINDOW_UNDECLARED` | **PASS** |
| **A-04** | `planned_end = null` | `WINDOW_UNDECLARED` | **PASS** |
| **A-05** | Foreign tenant observation | `TENANT_SESSION_MISMATCH`, tenant preserved | **PASS** |
| **A-05b** | Foreign tenant observation does not bind | Never bound to comparison | **PASS** |
| **A-05c** | Direct `evaluateComparability` on foreign tenant | `TENANT_SESSION_MISMATCH` | **PASS** |
| **A-06** | Same tenant, different session | `TENANT_SESSION_MISMATCH` | **PASS** |
| **A-07** | Marginal observations combining over joint grain | Refused (`GRAIN_MISMATCH`) | **PASS** |
| **A-08** | Composite key matching exact set and tokens | Resolves `LIKE_FOR_LIKE` | **PASS** |
| **A-08b** | Composite observation bound to row | Bound successfully | **PASS** |
| **A-09** | Extra grain dimension in observation | `GRAIN_MISMATCH` | **PASS** |
| **A-10** | Missing grain dimension in observation | `GRAIN_MISMATCH` | **PASS** |
| **A-11** | Single SKU member vs multi-SKU scope | `GRAIN_MISMATCH` | **PASS** |
| **A-12** | Broader category token | `GRAIN_MISMATCH` | **PASS** |
| **A-13** | 3-day observation inside 14-day window | `WINDOW_MISMATCH` | **PASS** |
| **A-14** | 15-day observation over 14-day window | `WINDOW_MISMATCH` | **PASS** |
| **A-15** | Instant observation inside window | `WINDOW_MISMATCH` | **PASS** |
| **A-16** | Absent `measurement_design` | `QUANTITY_BASIS_UNDECLARED`, basis unwritten | **PASS** |
| **A-16b** | `observed_basis` unwritten on unstated design | Left undefined | **PASS** |
| **A-17** | `CONTROLLED_DIFFERENCE` measurement design | Rejected, `NO_OBSERVED_COUNTERFACTUAL` | **PASS** |
| **A-17b** | No attributable comparison manufactured | Attributable remains incomparable | **PASS** |
| **A-18** | `ATTRIBUTABLE` prediction against `GROSS` observation | `NO_OBSERVED_COUNTERFACTUAL` | **PASS** |
| **A-19** | Empty `prediction_envelopes: []` | Verdict `INDETERMINATE`, LE-7 unmet | **PASS** |
| **A-19b** | LE-7 condition explicitly false | Condition reports unmet | **PASS** |
| **A-20** | Signed error outside declared envelope | `within_declared_envelope: false`, `OUTSIDE_DECLARED_ENVELOPE` | **PASS** |
| **A-20b** | Verdict unlocks `OUTSIDE_DECLARED_ENVELOPE` | Verdict is `OUTSIDE_DECLARED_ENVELOPE` | **PASS** |
| **A-21** | Signed error inside envelope, witness `NONE` | `within_declared_envelope` unset, reason populated | **PASS** |
| **A-21b** | `within_withheld_reason` populated | Reason string published | **PASS** |
| **A-21c** | Verdict remains `INDETERMINATE` | Within structurally unreachable | **PASS** |
| **A-22** | Envelope edited post-creation | `contract_digest` mismatch | **PASS** |
| **A-23** | Envelope added to contract | `decision_basis_digest` unchanged | **PASS** |
| **A-23b** | `contract_digest` automatically covers envelope | Digest changes | **PASS** |
| **A-24** | Unpublished snapshot path in envelope | Rejected at creation (`C-INV-ENV-1`) | **PASS** |
| **A-25** | Mismatched envelope unit/basis | Rejected at creation (`C-INV-ENV-2`) | **PASS** |
| **A-26** | Empty `declared_by` in envelope | Rejected at creation (`C-INV-ENV-4`) | **PASS** |
| **A-27** | Duplicate envelope on same field path | Rejected at creation (`C-INV-ENV-5`) | **PASS** |
| **A-28** | `PREDICTION_ENVELOPE_REQUIRED_INPUT` inadmissible substitutes | 6+ substitutes named | **PASS** |
| **A-28b** | Enables `PRE_DECLARATION_WITNESSED_ENVELOPE` | Exact capability name | **PASS** |
| **A-29** | `METRIC_CORRESPONDENT_SIGNAL_TYPES` mapping | `VOLUME` populated, others empty | **PASS** |
| **A-29b** | Non-volume metrics empty | Strictly refused | **PASS** |
| **A-30** | Required inputs published on comparison | `PREDICTION_ENVELOPE_REQUIRED_INPUT` present | **PASS** |
| **A-30b** | Composite grain required input published | `COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT` present | **PASS** |

**Total CDI-08 Test Count:** 44 passed, 0 failed (100% pass rate).

---

## 4. Full Repository Regression Suite Verification

Every existing test suite across all CogniX layers was executed with zero regressions:

| Suite | Focus Area | Tests Executed | Passed | Failed |
|---|---|---|---|---|
| `run-cdi08-tests.ts` | CDI-08 Observation Correspondence & Envelopes | 44 | 44 | 0 |
| `run-cdi07b-tests.ts` | CDI-07B Closed Learning Loop & Pre-Mortem | 235 | 235 | 0 |
| `run-cdi07a-tests.ts` | CDI-07A Decision Contract & Validity | 155 | 155 | 0 |
| `run-cdi06-tests.ts` | CDI-06 Outcome Frontier Engine | 93 | 93 | 0 |
| `run-cdi05-tests.ts` | CDI-05 Decision Timeline & Trajectory | 70 | 70 | 0 |
| `run-cdi04-tests.ts` | CDI-04 Readiness & Feasibility Engine | 49 | 49 | 0 |
| `run-cdi03-tests.ts` | CDI-03 Opportunity Windows & Micro-Markets | 31 | 31 | 0 |
| `run-cdi02-tests.ts` | CDI-02 Counterfactual & Causal Attribution | 36 | 36 | 0 |
| `run-cdi01-tests.ts` | CDI-01 Campaign Intent Canvas | 21 | 21 | 0 |
| `run-wp10d-tests.ts` | WP10-D Enterprise Memory & Pattern Store | 13 | 13 | 0 |
| `run-esf2-tests.ts` | ESF-2 Dynamic Signal Simulation | 19 | 19 | 0 |
| `run-esf3-tests.ts` | ESF-3 External Signal Connectors | 22 | 22 | 0 |
| `run-ifi1-tests.ts` | IFI-01 Commercial Intent Fusion | 12 | 12 | 0 |
| **TOTAL (counted suites)** | **Full Estate Regression** | **800** | **800** | **0** |

Additionally executed, all clean: `run-decision-state-tests.ts` (WP10-C shared decision state,
including session isolation), `run-journey-tests.ts` (WP10-B journey telemetry),
`run-signal-tests.ts` (6/6), `run-bugfix-integrity-tests.ts` (4/4).

**CDI-07B moved 232 → 235 and the delta is explained, not absorbed.** The suite file is unchanged.
Three of its assertions are emitted inside `for (const row of cmp.comparisons)` loops, and every
comparison now carries one additional row: the `GROSS` row keyed on
`play.decomposition.reconciliation.reconciled_sum_pp`, which the engine has always been coded to
build (`GROSS_FIELD`, guarded by `snapshotByPath`) but which could never materialise because no
contract transcribed that path. Baseline `232/232` was re-executed in a detached worktree at
`41bef56f` to confirm the count and the cause.

---

## 5. Build, Packaging & Compilation Evidence

- **Packages Contracts:**
  ```bash
  npm run build --prefix packages/contracts
  # Output: @cognix/enterprise-world-contracts@1.0.0 build -> tsc (0 errors)
  ```
- **Next.js Production Application:**
  ```bash
  npm run build
  # Output: Compiled successfully, TypeScript verified in 16.1s, 50/50 static/dynamic pages generated (0 errors)
  ```
- **Git Hygiene:**
  ```bash
  git diff --check
  # Output: Clean (0 whitespace/formatting errors)
  ```

---

## 6. Executive UI Refinement (`components/PromotionPlanner.tsx`)

### 6.1 Curiosity-Led Structure (as shipped)

Pre-simulation is one restrained line, not a checklist — the original large blank area is gone.

Post-simulation the default view carries exactly:
- **Two primary numeric outcomes** — Expected Demand (`+N% Volume`) and Net Contribution Impact.
- **One decision/readiness state** — `GO` / `CONDITIONAL GO` / `ATTENTION REQUIRED`.
- **One short business-language synthesis.**
- **One contextual clue.**
- **One muted provenance line.**
- **One primary action** — *Explore why*.

Nothing else. This is deliberately not a KPI grid: cannibalisation risk, margin compression,
revenue and unit counts are reachable through the lenses and the governed history table, never
promoted into the headline.

Progressive disclosure opens a single lens at a time, one primary visual each: **Why (Demand
Drivers)** → **Where & When (Opportunity)** → **Trajectory (Timeline)** → **Evidence &
Feasibility** → **Better Strategy?** (rendered only when a Decision Canvas route is supplied).
Deeper CDI functionality is reached by navigation, never duplicated inline.

*Lens ordering note.* The gate order places "Where / when?" before "Why?". As shipped, *Why* is
first because it is the destination of the single primary action labelled *Explore why*; ordering
the tabs otherwise would land that action on a lens it does not name. "What changed?" and "Is it
worth doing?" are already answered by the two headline figures and the readiness state above the
tabs.

### 6.2 Data Provenance (§3 integrity)

Every displayed number is either read from a CDI result or is labelled seeded demo evidence:
- A `provenance` record is built per simulation from which of the four CDI clients actually
  answered (`causal`, `readiness`, `opportunity`, `timeline`).
- The executive surface carries one muted line — *"Planning simulation · … · no observed outcome
  bound"* — and the Evidence lens's technical panel names each lens's source individually.
- The panel states plainly that expected demand and net contribution come from the seeded planning
  simulator on that screen, not from CDI-02.

Two fabricated executive statements were removed:
- *"31 of 50 stores recommended / highest attachment propensity"* — unsourced, and contradicted by
  the estate's own data (the North West holds 5 of 50 stores). Replaced with the actual in-scope
  store count derived from `stores.json`, plus an explicit statement that micro-market **ranking**
  requires CDI-03 and is not asserted.
- *"Decision Grain: … (Exact correspondence verified)"* — an assertion that CDI-08 correspondence
  had passed, on a surface that never evaluates it. Replaced with the true position: no observed
  outcome has been bound to a decision contract, so no prediction has been adjudicated.

### 6.3 CDI-05 Flat-Rate Identity (§5 integrity)

The rendered DOM was inspected, not just the payload. The trajectory path is
`M 0,36 L 60,36 L 60,10 L 240,10 L 240,36 L 300,36` — `M`/`L` commands only. No `C`, `S`, `Q`, `T`
or `A` segment exists, so there is no spline, smoothing, easing, fabricated historical curve,
manufactured campaign curvature or invented post-campaign convergence.

**Defect found and corrected.** The `<svg>` declared `width="100%"` with no `viewBox`, so the path
was drawn in a 300-unit space inside a ~780px axis: the step terminated at 38% of the width while
the dashed baseline ran the full span, stranding the *Post-Campaign Return* label over empty axis
and misrepresenting the active window's proportion. Corrected with
`viewBox="0 0 300 46" preserveAspectRatio="none"` and `vector-effect="non-scaling-stroke"`.
Straight segments remain straight under affine scaling, so FLAT_RATE_IDENTITY is preserved exactly.
Verified in the live DOM: path and baseline both span `0 → 872px`; the active-window polygon sits
at `174.4 → 697.6px`, i.e. 20%–80% of the axis, directly beneath its label.

### 6.4 Visual Verification

- **Normal desktop (1280×820):** hierarchy resolves in seconds — the two headline figures dominate,
  readiness is legible beside them, *Explore why* is the only primary action. Four lens tabs in an
  872px row, not crowded. No nested-card proliferation.
- **Reduced desktop width (1024×800):** `document.scrollWidth === clientWidth` — no horizontal
  overflow. Grids wrap to single column; no clipping.
- **Pre-simulation:** single restrained prompt; no dead area.
- **Post-simulation, each lens:** one primary visual, readable labels, no duplicated content.

---

## 7. Independent Adversarial Reconciliation

Gate §6 binding condition 4 requires independent reconciliation before commit. Five defects were
found by review rather than by the suite, and corrected. Each was reproduced against the running
engine before and after the fix.

### R-1 — `validatePredictionOutcomeComparison` fail-open (contracts) — **CORRECTED**
Required-input publication was checked by `enables`, but `enables` is a `LearningCapability` and is
**not unique**: `COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT` and
`OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` both declare `OBSERVED_COUNTERFACTUAL_COMPARISON`. A
comparison that dropped `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` entirely still validated `true` —
the composite declaration silently satisfied the counterfactual check. Gate A-30 additionally
requires the composite declaration to be published, and nothing enforced that at all.
**Fix:** publication is keyed on `field`, the declaration's actual identity, and the missing A-30
check for `composite_grain_observation` was added. All three declarations now fail closed
independently.

### R-2 — Observed values published against undeclared grain/window (engine) — **CORRECTED**
`bindObservation` returned `coherent[0]` as the bound observation alongside a `GRAIN_UNDECLARED` or
`WINDOW_UNDECLARED` candidate verdict. The row then published `observed_observation_id`,
`observed_value` and `observed_basis` for an observation that never resolved anything — an observed
outcome attached to a quantity whose grain or window the contract never declared. This is precisely
the misleading hindsight gate §6 names as the primary risk, and for `WINDOW_UNDECLARED` it was
**newly reachable**: at baseline `assertGrainResolves` refused to bind at all in that case.
**Fix:** a declaration failure yields no binding candidate. Verified: both verdicts now publish
`observed_observation_id`, `observed_value` and `observed_basis` as `undefined`.

### R-3 — Envelope predicted basis inferred by substring (contracts) — **CORRECTED**
`C-INV-ENV-2` requires the envelope `basis` to equal *the predicted basis for that path*.
`SnapshotValue` carries no basis field, so the implementation inferred one from the path string —
`startsWith('play.decomposition')`, `includes('gross')`, `includes('ambient')`,
`includes('monetary')`. Substring inference is the exact fuzzy correspondence this gate refuses
everywhere else, and it silently manufactured an "expected basis" for paths the estate has never
declared a basis for.
**Fix:** the closed, exported `SNAPSHOT_PATH_PREDICTED_BASIS` table declares the basis of the four
paths that have one. A path absent from it has no declared basis, so an envelope naming it can
never be adjudicated and is rejected at contract creation rather than validated against a guess.

### R-4 — Unguarded connector registration path (services/world) — **CORRECTED**
`registerExternalSignalConnector` was added as a plain exported mutator on the connector registry.
`determineObservationAuthority` reads connector resolution and `synthetic_demo` to decide
`AUTHORITATIVE_EXTERNAL`, so this created exactly the caller-asserted-authority path that ESF-6 /
Y3a exists to close, and that gate §2 places explicitly **out of CDI-08 scope**. It is needed,
because A-08 and A-20 cannot be demonstrated without an observation that clears C1.
**Fix:** a mandatory `'LAB_FIXTURE_NOT_AN_ATTESTATION'` acknowledgement literal. The call cannot be
reached accidentally and every call site declares what it is. Only the CDI-08 suite calls it.
Superseded when ESF-6 lands attested registration.

### R-5 — Governance regression count (docs) — **CORRECTED**
`MASTER_PLAN.md` recorded the post-CDI-08 CDI-07B count as `234` in two places. The measured count
is `235`, and this report's §4 table carried the same error. Both corrected; the 232 → 235 delta is
now explained against a re-executed baseline.

### Verified sound, no change made
- **Z1 digest boundary.** `prediction_envelopes` is covered by `computeContractDigest` and excluded
  from `computeDecisionBasisDigest`, with no algorithm change to either (A-23 / A-23b).
- **Z4 composite grain.** Exact set equality, exact token identity, extra dimension refused,
  missing dimension refused, SKU membership never resolving a multi-SKU scope. No combination of
  marginals is attempted anywhere in the code path. The single-entity SKU path was additionally
  **narrowed** from `sku_scope.some(...)` to a strict single-element scope.
- **Z2 asymmetry.** `WITHIN_DECLARED_ENVELOPE` is unreachable: `within_declared_envelope` is set
  `true` only when `pre_declaration_witness !== 'NONE'`, and nothing at this baseline can raise it
  above `NONE`. `OUTSIDE_DECLARED_ENVELOPE` is reachable and demonstrated.
- **Strictly narrowing.** C0, C2, C3, C5, C6 and C8 each add a refusal; C8 replaced a literal
  `'GROSS'` with derive-or-refuse; the ATTRIBUTABLE → GROSS fallback does not exist. The two
  authorised unlocks are the only new routes to `LIKE_FOR_LIKE`, plus the gate-authorised
  reassignment of `observed_at` recorded in §2.4.

## 8. GROSS Snapshot Verdict — `play.decomposition.reconciliation.reconciled_sum_pp`

**Defensible. No correction required.**

- **Verbatim, not recomputed.** The snapshot copies `play.decomposition.reconciliation.reconciled_sum_pp`
  directly. `expectedSourceMap` was extended with the same path, so `assertTranscriptionFidelity`
  compares the transcribed value against the source and rejects any divergence. No rounding, no
  reinterpretation, `restated: false`, `strength` inherited from `play.evidence_strength_floor`, unit
  `pp`, `source_package: 'CDI-05'` — identical treatment to its two sibling decomposition snapshots.
- **Correctly labelled GROSS.** The label is not asserted by the snapshot; the engine's pre-existing
  `GROSS_FIELD` constant names this exact path and `buildQuantityComparison` is called with
  `'GROSS'`. The quantity is the reconciled sum of ambient and intervention components — total
  movement, not attributable-only. GROSS is the correct basis.
- **Covered by contract integrity.** It enters `decomposition_snapshot`, which is input 8 of
  `DECISION_BASIS_DIGEST_INPUTS` and is therefore bound by both `decision_basis_digest` and
  `contract_digest`, and is subject to transcription fidelity and the `restated: false` guarantee.
- **Not an unauthorised widening.** This is not a new capability bolted onto CDI-07A; it is the
  transcription of a path the engine was already written to compare and could never reach. Without
  it every comparison is `ATTRIBUTABLE` and terminates at `NO_OBSERVED_COUNTERFACTUAL`, making the
  A-20 unlock structurally undemonstrable. It adds no field, removes none, renames none, and moves
  nothing between `basis` and top level — gate binding condition 3 holds.
- **Consequence, stated.** `decision_basis_digest` changes for every contract that has a
  reconciliation, because the basis genuinely gained a transcribed value. This is distinct from the
  envelope change, which by design leaves `decision_basis_digest` untouched (A-23). No test asserts
  a hard-coded digest literal, and the full estate re-executes clean.

## 9. Governance & Architectural Status

- **ADR-036:** Marked as `Implemented (CDI-08, 2026-08-16)`.
- **ADR-037:** Marked as `Implemented (CDI-08, 2026-08-16)`.
- **MASTER_PLAN.md:** `CDI-08` updated from `[DESIGN FROZEN — NEXT]` to `[COMPLETED]`. Successor confirmed as `ESF-6 / Y3a`.

## 10. Residual Risk

Carried forward, not closed by this work package:

1. **`WITHIN_DECLARED_ENVELOPE` remains structurally unreachable** until ESF-6 supplies a
   server-side registration receipt (Z2). This is the designed position, not a defect.
2. **The lab connector registration path exists** (R-4). Guarded and single-call-site, but it is a
   caller-asserted authority route until ESF-6 replaces it with attested registration.
3. **No defensible `LearningCase` is producible.** LE-4 still blocks on synthetic connectors. The
   first real case remains behind ESF-6 and will be a gross-basis case.
4. **`campaign-learning-loop-engine.ts` retains two `|| 'GROSS'` defaults** when publishing a
   `LearningCase` (`observed[].basis`, `validity_basis.quantity_basis`). Both are unreachable —
   `LIKE_FOR_LIKE` now requires C8 to have derived a basis — but they are pre-existing latent
   fallbacks that contradict derive-or-refuse and should be deleted when ESF-6 next touches this
   file.
5. **Seeded executive figures remain unlabelled outside the preview.** The Promotion header strip
   (`£1.2M Revenue Target`, `+22% Volume Lift`, `+10% Max Headroom`), the *Pattern Recognised* strip
   (`Similarity 91%`, `Confidence 84%`, `Success Rate 67%`) and the `ExecutionBriefing` payload are
   pre-existing hardcoded demo values, untouched by this pass. The pattern statistics are already
   governed as outstanding under **Y4-gov** (`learning-pattern-store.ts`, six seeded records); the
   header strip is not yet governed anywhere and should be.
6. **The Campaign Preview shows seeded evidence in a fresh session.** The four CDI clients return
   `400` until a commercial intent is registered, so a first-run simulation labels every lens
   *seeded demo evidence*. The labelling is correct; the underlying dependency is a demo-flow
   property worth noting.

*Status: Implemented, independently reconciled, five defects corrected, full estate re-executed clean.*
