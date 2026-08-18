# COGNIX — PROGRAMME 10 / CDI POST-STREAM CONSOLIDATION ASSESSMENT

**Assessment type:** Replanning and architectural ruling. No product code changed.
**Baseline:** `5b92dae25f3db0994b64d6fca98010558df2a49f`
**Branch:** `Feature/MatchingContract-AutoActivate`
**Date:** 2026-08-16
**Primary agent:** CogniX implementation team
**Status:** ASSESSMENT COMPLETE — **Z1–Z5 RESOLVED 2026-08-16.** See
`docs/reports/COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_DESIGN_GATE.md` §1.
Z1, Z2, Z3, Z5 approved as proposed. **Z4 approved but NARROWED:** the jointly-covering observation
set is refused — marginal observations do not determine the joint cell, and combining them is
apportionment. Composite grain resolves only by a single observation carrying a declared composite
grain key equal to the contracted required dimension set.

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD | `5b92dae2` — CDI-07B |
| `origin` (github) | `5b92dae2` — converged |
| `gitlab` | `5b92dae2` — converged |
| Working tree | Clean |
| Stash | Empty |
| Unexplained divergence | **None** |

### 1.1 CDI-01→07B closure evidence — re-executed at this baseline

| Suite | Result | Suite | Result |
|---|---|---|---|
| CDI-01 | 21 / 0 | CDI-07A | 155 / 0 |
| CDI-02 | 36 / 0 | CDI-07B | 232 / 0 |
| CDI-03 | 31 / 0 | ESF-2 | 19 / 0 |
| CDI-04 | 49 / 0 | ESF-3 | 22 / 0 |
| CDI-05 | 70 / 0 | WP10-C | PASS |
| CDI-06 | 93 / 0 | WP10-D | 13 / 0 |
| | | IFI-01 | 12 / 0 |

All declared closure evidence reproduces. **CDI-01→07B are treated as CLOSED.** No contradiction was
found that would justify reopening their semantics. Two corrections to *descriptions of* those
packages are proposed in §12; neither changes a closed semantic.

---

## 2. CDI / Programme 10 completion state

**Delivered and closed:** WP10-A/B/C/D, ESF-1/2/3, IFI-01, CDI-01→07B.

CogniX can now, deterministically and with declared evidence: express a campaign intent; separate
baseline from counterfactual from predicted; find windows and micro-markets; assess readiness with
vetoes; render a timeline with decomposition; construct a Pareto frontier over real evaluations;
freeze an immutable, digest-bound `DecisionContract`; assess its continuing validity as states rather
than durations; enumerate a pre-mortem; compare prediction to reality behind a six-test comparability
gate; and refuse to learn from evidence that does not qualify.

**The stream terminates in a deliberate refusal.** At this baseline the estate produces:

- zero eligible `LearningCase`
- zero `EnterpriseMemoryCase` on the learning path
- zero `LearningPattern` writes (no write path exists)
- `verdict = INDETERMINATE` on every comparison, structurally

This is correct behaviour, not an implementation gap. What it means is that **Programme 10's
deterministic decision spine is complete and its evidence intake is not**. Everything CogniX can
*reason* about is built; nothing it can *observe* is real.

### 2.1 The three quantities that matter

| Quantity | Path | Basis | Observable today |
|---|---|---|---|
| Headline prediction | `counterfactual.campaign_delta.attributable_uplift_pp` | ATTRIBUTABLE | No — no observed counterfactual |
| Gross prediction | `play.decomposition.reconciliation.reconciled_sum_pp` | GROSS | Often absent from the snapshot |
| Any observation | `OutcomeObservation.delta_pct` | Asserted GROSS | Synthetic only |

---

## 3. Remaining capability gaps

### 3.1 The three declared blockers, verified in code

**LE-3 — composite contracted grain vs single-entity observation. STRUCTURAL.**

`assertGrainResolves` ([campaign-learning-loop-model.ts:731](packages/contracts/src/campaign-learning-loop-model.ts:731))
computes the required grain dimensions from the contract's `ComparisonSetInvariants`, then:

```
if (required.length === 0) return true;
if (required.length > 1) return false;
```

Any realistic contract declares at least category **and** region, so `required.length > 1` and the
test returns `false` unconditionally. An `OutcomeObservation` carries exactly one `entity_type` /
`entity_id` pair. **A composite contracted grain can never be resolved by the observation shape that
exists.** This is not a threshold to tune; it is a missing concept — an observation that addresses a
tuple, or an observation *set* that jointly covers the required dimensions.

**LE-4 — every ESF-3 connector is synthetic. STRUCTURAL, AND NOT MERELY COMMERCIAL.**

The design gate characterised Y3 as "a commercial and integration question, not a design one"
(§13.2). That characterisation is **incorrect at this baseline**. Three independent code sites make
a non-synthetic observation unrepresentable:

1. [`services/world/src/external-signal-connector.ts`](services/world/src/external-signal-connector.ts) —
   the connector registry is a **static const array of seven reference adapters, every one
   `synthetic_demo: true`**. There is no registration path.
2. Same file, ingestion — the produced signal hardcodes `synthetic_demo: true` regardless of input.
3. [`campaign-learning-loop-engine.ts:1097`](lib/campaign-learning-loop-engine.ts:1097) —
   `const synthetic = input.signal.synthetic_demo || connector?.synthetic_demo || true;`
   The trailing `|| true` makes the expression a constant.

Procuring a vendor feed tomorrow would not close LE-4. **Engineering is required, and it is
buildable now.**

**LE-7 — no declared prediction envelope. STRUCTURAL, AND UNOWNED.**

`QuantityComparison.error.declared_envelope` and `within_declared_envelope` exist in the contract
([campaign-learning-loop-model.ts:203](packages/contracts/src/campaign-learning-loop-model.ts:203))
and **nothing in the estate ever populates them**. `buildQuantityComparison` constructs
`error = { signed_delta, unit, statement }` only. Therefore `deriveComparisonVerdict` can reach
neither `OUTSIDE_` nor `WITHIN_DECLARED_ENVELOPE`, and `INDETERMINATE` is structurally guaranteed.

Unlike the estate's three other named gaps, LE-7 has **no `LearningRequiredAuthoritativeInput`
declaration**. `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT`, `PATTERN_PROMOTION_REQUIRED_INPUT` and
`QUANTITATIVE_DECISION_HALF_LIFE_REQUIRED_INPUT` all exist; the envelope's absence is described only
in LE-7's prose `unmet_reason`. **The estate does not formally declare what it is missing here.**

### 3.2 Residual integrity issues — assessed

| # | Issue | Verdict | Severity | Home |
|---|---|---|---|---|
| R1 | `observed_basis` asserted `GROSS` | **Confirmed** — [engine:528](lib/campaign-learning-loop-engine.ts:528) is a literal assignment, never derived from the observation | Latent-high | Correspondence |
| R2 | Predicted metric vs observed `signal_type` not validated | **Confirmed** — `evaluateComparability` tests authority, grain, unit, basis. It never tests that the observation's `signal_type` addresses `comparison_invariants.primary_metric` | **Latent-critical** | Correspondence |
| R3 | `assertGrainResolves` passes on empty grain | **Confirmed** — `required.length === 0 → true`. Also: `planned_start` / `planned_end` are nullable and skipped when null, so a contract with no declared window admits any instant | **Latent-critical** | Correspondence |
| R4 | `metrics_supplied` defaults true | **Confirmed and worse** — [engine:1104](lib/campaign-learning-loop-engine.ts:1104) defaults it, and the adapter additionally hardcodes `completeness.complete: true`, `window_start_observed: true`, `window_end_observed: true`, `adapter_capability_gap: false`. The adapter asserts a completeness it never measured, and LE-5 and LE-8 read it | Latent-high | Admission |
| R5 | ESF-3 confidence/quality defaults are not authority | **Confirmed, correctly non-load-bearing today** — `confidence: 80` / `quality: 85` at [external-signal-connector-model.ts:292](packages/contracts/src/external-signal-connector-model.ts:292). The authority conjunction does not read them, so they grant nothing. But they are copied into `observation.provenance` **indistinguishably from supplied values** | Medium | Admission |
| **R6** | **No tenant/session isolation between contract and observations** | **Newly found.** `comparePredictionToReality` never compares `observation.tenant_id` / `session_id` against the contract's. `comparison.tenant_id` is copied *from the contract*, so a foreign-tenant observation that matches grain and window binds and is republished under the contract's tenancy | **Latent-critical** | Admission |

**The severity ranking that matters.** R2, R3 and R6 are *fail-open*. They are inert today only
because no observation can reach `AUTHORITATIVE_EXTERNAL`, so no comparison reaches `LIKE_FOR_LIKE`
and no error value is ever computed. **They arm the instant the first non-synthetic connector lands.**

Concretely, with R2 + R3 live: a contract with blank `comparison_invariants` and a real weather
connector emitting a `pp` delta would produce `LIKE_FOR_LIKE` and a signed prediction error comparing
a temperature movement against a promotional volume uplift. That is a confident wrong number arriving
after the fact with a digest attached — precisely the *misleading hindsight* failure the CDI-07B gate
named as its primary risk, on a path its 55 acceptance criteria did not test.

**This is the decisive sequencing fact in this assessment.** Landing authoritative observation
admission first, alone, moves the estate from "produces nothing" to "produces a confident wrong
number" in a single step.

---

## 4. Candidate comparison — ESF-4 / Y3 / Y4 / Observation Correspondence

### 4.1 A. ESF-4 — Signal Quality, Confidence & Provenance

| Dimension | Assessment |
|---|---|
| 1. Business capability | Executives can see how much to trust a signal: freshness, completeness, reliability, graded source classification |
| 2. Technical blocker removed | The undifferentiated 80/85 default (R5) — partially |
| 3. Dependencies | ESF-2, ESF-3 (both closed) |
| 4. Removes LE-3/4/7? | **None.** Authority does not read confidence or quality |
| 5. Contracts affected | `enterprise-signal-model`, `external-signal-connector-model`. Additive |
| 6. CDI contamination risk | **Very low** — separate file ownership, no CDI contract touched |
| 7. Deterministic sufficient? | Yes, entirely |
| 8. ML genuinely useful? | No. Freshness and completeness are arithmetic over timestamps and field presence |
| 9. Demo value | Moderate — a quality panel is legible but adds no new question |
| 10. Production value | High *eventually*; low now, because it grades signals nothing yet trusts |
| 11. Complexity | Low–medium |
| 12. Sequencing | **After admission.** See the ruling in §7 |

**Verdict: valuable, wrongly positioned as next.** ESF-4 grades signals that have already been
admitted. It cannot make an inadmissible signal admissible. Running it now produces a confidence
score over seven connectors that are all, by construction, demonstration data.

### 4.2 B. Y3 — Authoritative / Non-Synthetic Observation Admission

| Dimension | Assessment |
|---|---|
| 1. Business capability | The estate can accept an observation about the real world at all. Without it, every downstream claim is about a simulator |
| 2. Technical blocker removed | The three hardcoded synthetic sites; the absent connector registration and attestation path; R4, R5, R6 |
| 3. Dependencies | ESF-3 (closed). **No CDI dependency** |
| 4. Removes LE-3/4/7? | **Removes LE-4.** Does not touch LE-3 or LE-7 |
| 5. Contracts affected | `external-signal-connector-model`, `enterprise-signal-model`, `OutcomeObservation` provenance and completeness, connector registry, adapter |
| 6. CDI contamination risk | **Low–medium.** It changes what `determineObservationAuthority` can return, but not the conjunction's shape. The synthetic-first ordering (X1/RB-3) must remain intact |
| 7. Deterministic sufficient? | **Yes.** Attestation is a signed declaration, not an inference |
| 8. ML genuinely useful? | No, and actively harmful — a model deciding whether a source is real is the exact inversion of an attestation |
| 9. Demo value | **Very high.** "This number came from outside CogniX, and here is who attested to it" is the single most credible thing the platform could say |
| 10. Production value | **Highest of the four.** Everything real is downstream of it |
| 11. Complexity | Medium–high. Registration, attestation, isolation, derived completeness |
| 12. Sequencing | **Second.** After correspondence, for the R2/R3/R6 fail-open reason in §3.2 |

**The unlock that makes this affordable.** *Non-synthetic does not mean third-party vendor.* It means
**not generated by the system that made the prediction**. A CSV of realised actuals uploaded by a
named operator, attested at upload, at the contracted grain, is genuinely independent evidence about
the world by exactly the standard CDI-07B applies. It closes LE-4 with **no procurement, no vendor
contract, and no credential handling**. The gate's framing of Y3 as a commercial question quietly
imported an assumption that authoritative means *purchased*. It does not; it means *attested and
independent*.

### 4.3 C. Y4 — Learning & Pattern Telemetry Calibration

| Dimension | Assessment |
|---|---|
| 1. Business capability | Published pattern telemetry that its own citations support |
| 2. Technical blocker removed | The B8 defect, measured and confirmed below |
| 3. Dependencies | WP10-D (closed) |
| 4. Removes LE-3/4/7? | **None** |
| 5. Contracts affected | `learning-pattern-model`, `learning-pattern-store` |
| 6. CDI contamination risk | **None** — CDI-07B already excludes WP10-D telemetry from eligibility and mandates `PATTERN_TELEMETRY_DISCLOSURE` |
| 7. Deterministic sufficient? | Yes |
| 8. ML genuinely useful? | No — the problem is unsupported arithmetic, not an unlearned function |
| 9. Demo value | Negative to fix, positive to have fixed — it removes numbers from the screen |
| 10. Production value | High, but only when patterns can be written, which requires N ≥ 3 eligible cases |
| 11. Complexity | Low as a governance correction; medium as a full calibration WP |
| 12. Sequencing | **Split.** Governance correction now; calibration WP far downstream |

**Measured.** The six seeded patterns in
[`services/learning/src/learning-pattern-store.ts`](services/learning/src/learning-pattern-store.ts)
claim `historical_occurrences` of 11, 7, 6, 8, 5 and 9 — **46 occurrences** — and publish an
`intervention_success_rate` of 73%, 86%, 67%, 82%, 80% and 78%. Between them they cite **exactly
three distinct `supporting_memory_ids`** (`MEM-2025-Q2-018`, `MEM-2025-Q4-042`, `MEM-2025-Q3-029`),
one per pattern. Every published rate is unsupported by its own citations, and `PAT-COMM-01`'s
description states "73% of untreated cases" as though it were a finding.

This is a **credibility defect on screen today**, and it is separable from the learning loop.
Correcting it does not require a work package; it requires withdrawing or relabelling six numbers.

### 4.4 D. Observation Correspondence Foundation

| Dimension | Assessment |
|---|---|
| 1. Business capability | A comparison that *means* something: the estate can state precisely why an observation does or does not address the decision that was contracted, and against what declared tolerance |
| 2. Technical blocker removed | LE-3 structurally; LE-7 entirely; R1, R2, R3 |
| 3. Dependencies | CDI-07A, CDI-07B (both closed). **No external dependency whatsoever** |
| 4. Removes LE-3/4/7? | **Removes LE-3 and LE-7.** Leaves LE-4 to admission |
| 5. Contracts affected | `campaign-learning-loop-model` (`OutcomeObservation` grain, comparability tests), `campaign-decision-contract-model` (envelope declaration — additive, `contract_digest`-covered, `decision_basis_digest` untouched) |
| 6. CDI contamination risk | **Medium — the highest of the four**, and manageable. It extends CDI-07A's contract shape and tightens CDI-07B's comparability gate. Both are closed packages. Mitigation: purely additive on CDI-07A, strictly narrowing on CDI-07B (no comparison that fails today may pass tomorrow), plus full re-execution of 155 + 232 |
| 7. Deterministic sufficient? | **Yes, and it must be.** Correspondence is a predicate, not an estimate |
| 8. ML genuinely useful? | Only as a *suggestion* layer, and only later at signal volume that does not exist yet |
| 9. Demo value | **High, and distinctively CogniX.** "Your observation covers North West; your decision was contracted at North West × Fresh Dairy. Here is exactly what is missing." Rigour as a feature |
| 10. Production value | **High.** It is the difference between a number and evidence |
| 11. Complexity | Medium. Bounded, fixture-testable, no infrastructure |
| 12. Sequencing | **First** |

### 4.5 Comparison summary

| | ESF-4 | Y3 (Admission) | Y4 | **D (Correspondence)** |
|---|---|---|---|---|
| Removes LE-3 | — | — | — | **Yes** |
| Removes LE-4 | — | **Yes** | — | — |
| Removes LE-7 | — | — | — | **Yes** |
| Closes fail-open defects | R5 (part) | R4, R5, R6 | — | **R1, R2, R3** |
| External dependency | None | None (see §4.2) | None | **None** |
| Buildable and fully testable at this baseline | Yes | Yes | Yes | **Yes** |
| Safe to land alone | Yes | **No — arms R2/R3** | Yes | **Yes** |
| Blocks the next WP if skipped | No | No | No | **Yes** |

---

## 5. Prediction-envelope architectural ruling

### 5.1 The question

An envelope must be declared before outcomes are observed and must never be inferred or calibrated
from the observed result being evaluated. Where does it originate?

### 5.2 Candidates rejected

**CDI-02 (causal prediction) — REJECTED.** The counterfactual and causal models publish **no interval
of any kind** on `attributable_uplift_pp`; there is no `lower`/`upper`/band field to transcribe.
Manufacturing one would require calibration evidence CDI-02 does not have, and would reopen a closed
package to invent a number. Rejected on both counts.

**CDI-05 (timeline/evidence) — REJECTED, and instructively so.** CDI-05 *does* publish a
`TimelineConfidenceEnvelope` ([campaign-timeline-model.ts:61](packages/contracts/src/campaign-timeline-model.ts:61)).
It is the closest thing in the estate, and it is the wrong thing, for four independent reasons:

1. **Wrong quantity** — its points are `lower_index_pct` / `upper_index_pct` over a *timeline index*,
   not over the contracted headline `attributable_uplift_pp`.
2. **Wrong basis** — it bands a trajectory that includes ambient movement; the headline prediction is
   counterfactual-differenced.
3. **Self-declared uncalibrated** — `synthetic_demo: true`,
   `horizon_basis: 'declared_horizon_uncertainty_profile'`, and
   `calibration_target: 'Realised forecast-error dispersion by horizon'`. CDI-05 states in its own
   contract that it is awaiting the very evidence that would make it a tolerance.
4. **Circular if promoted** — the realised forecast-error dispersion that would calibrate it is
   produced by the comparison the envelope is meant to adjudicate.

Transcribing it would be a lab constant presented as a measurement — the exact inadmissible
substitute pattern the estate already refuses for Decision Half-Life.

**A new detached artefact (envelope bound to `contract_id` + `contract_digest`, mirroring the CDI-07B
pattern) — REJECTED.** Superficially attractive, but it fails on the one property that matters. A
detached artefact's `declared_at` is **caller-supplied**, and a caller-supplied instant is a claim,
not evidence — the identical trust-boundary failure that RB-1 and RB-2 were written to close. A
detached envelope can be authored after the outcome and stamped with any instant.

### 5.3 RULING

> **The prediction envelope is a declared acceptance tolerance belonging to CDI-07A's
> `DecisionContract`, as a contract-native declaration sibling to `assumptions` and `triggers` —
> covered by `contract_digest`, and excluded from `decision_basis_digest`.**

Four reasons, each load-bearing:

**(a) It is a declaration, not a derivation.** There is nothing upstream to transcribe. A tolerance
answers "how wrong may this be before we would want to know?" — a question only a named accountable
human can answer, at the moment of decision. It is not a statistical prediction interval and must
never be presented as one.

**(b) `basis` cannot hold it, and correctly so.** `SnapshotValue` carries `restated: false` and a
`source_package` constrained to CDI-01/02/04/05/06 — the basis is transcription-only under C-INV-4.
The envelope has no source package. It therefore sits alongside `assumptions` and `triggers`, which
are already contract-native declarations authored at contract time rather than transcriptions of an
upstream artefact. The precedent exists; the shape is unchanged.

**(c) The digest boundary lands exactly right, with no ruling needed to place it.**
`computeDecisionBasisDigest` reads only the sixteen `basis` inputs — a new top-level field does not
enter it. `computeContractDigest` hashes the whole immutable body minus lifecycle fields — a new
top-level field **is** covered. And CDI-07B binds every artefact on `contract_digest`, not
`decision_basis_digest`. Therefore:

- The **decision basis is untouched.** A tolerance is not part of the evidence on which the decision
  was made, and the sixteen-input tuple and `DECISION_BASIS_DIGEST_INPUTS` need no change. CDI-02 and
  CDI-06 semantics are entirely unaffected.
- The **envelope is immutable and tamper-evident.** Any post-hoc insertion or edit changes
  `contract_digest`, and every CDI-07B artefact rejects a digest mismatch fail-closed. That machinery
  already exists and already has regression coverage.

**(d) It restores the honest refusal.** With an envelope declared, `INDETERMINATE` stops meaning
"CogniX cannot express a verdict" and starts meaning "this decision was contracted without a declared
tolerance" — a statement about the decision-maker, which is the correct place for that
accountability.

### 5.4 The necessary corollary — pre-declaration needs a witness the caller does not author

**Digest immutability proves the envelope was not edited. It does not prove it was declared before the
outcome.** A caller can observe an outcome, *then* create a contract with a conveniently chosen
tolerance, and every digest will verify. `created_as_of` is explicitly caller-supplied (C-INV-9) and
cannot serve.

Temporal precedence therefore requires an instant the caller does not control: a **server-side
contract registration receipt** compared against a **server-side observation ingestion receipt**.
Both are ingestion-side concerns.

> **Ruling corollary.** The envelope *field* belongs to CDI-07A. The *proof that it preceded
> observation* belongs to the observation-admission capability. An envelope without that proof is
> admissible for `OUTSIDE_DECLARED_ENVELOPE` — which can only ever be adverse to the declarer, so
> post-hoc authorship carries no incentive — and **inadmissible for `WITHIN_DECLARED_ENVELOPE`**,
> which requires positive evidence and would otherwise be self-congratulation with a hash on it.

This asymmetry is implementable immediately in the correspondence WP and needs no receipt
infrastructure. It is also, on its own, a genuinely defensible learning position.

### 5.5 Additional required deliverable

Declare `PREDICTION_ENVELOPE_REQUIRED_INPUT: LearningRequiredAuthoritativeInput` alongside the
existing three, with the inadmissible substitutes named explicitly: the observed value itself; a
CDI-05 timeline band; a CDI-04 `ConfidenceBand` converted to a percentage; a symmetric ±X% lab
default; any envelope fitted to the series it adjudicates.

---

## 6. Authoritative-observation architecture

### 6.1 Should Y3 broaden to "Authoritative Observation & Correspondence Foundation"?

**No. Decompose it into two work packages with two different predicate signatures, plus one
declaration that belongs to neither.**

The nine proposed concerns do not share a subject:

| Concern | Predicate signature | Unit |
|---|---|---|
| Connector/source attestation | `source → authority` | **Admission** |
| Synthetic vs non-synthetic authority | `source → authority` | **Admission** |
| Provenance (incl. defaulted-value classification) | `source → authority` | **Admission** |
| Tenant/session/source isolation | `source × context → authority` | **Admission** |
| Metric correspondence | `contract × observation → comparability` | **Correspondence** |
| Quantity basis correspondence | `contract × observation → comparability` | **Correspondence** |
| Contracted composite observation grain | `contract × observation → comparability` | **Correspondence** |
| Observation-window correspondence | `contract × observation → comparability` | **Correspondence** |
| Prediction envelope declaration | `contract → tolerance`, evaluated **before any observation exists** | **Correspondence (declaration)** |

Admission asks *"is this evidence about the real world at all?"* and needs no contract. Correspondence
asks *"does this evidence address the thing that was contracted?"* and needs no connector. They are
independently testable — correspondence against a fixture observation stamped `AUTHORITATIVE_EXTERNAL`,
admission against no contract at all. Merging them yields one work package with two truth models,
whose invariants collide exactly where correctness lives.

The envelope declaration is neither predicate. It is placed with correspondence not because it belongs
to the same predicate but because it is the *tolerance against which a corresponding quantity is
judged* — the two together are what make a comparison mean something, and they touch the same two
files. It carries its own owner ruling (Z1) because it extends a closed contract.

### 6.2 Proposed decomposition

**CDI-08 — Observation Correspondence & Prediction Envelope Foundation** *(recommended next)*
Predicate: `contract × observation → comparability`. Composite grain resolution (LE-3); metric
correspondence (R2); derived quantity basis (R1); window correspondence and fail-closed empty-grain
handling (R3); declared prediction envelope on `DecisionContract` (LE-7) with the §5.4 asymmetry;
`PREDICTION_ENVELOPE_REQUIRED_INPUT`. No external dependency.

**ESF-6 / Y3a — Attested Observation Admission** *(second)*
Predicate: `source × context → authority`. Connector registration and attestation; a non-synthetic
admission path with the three hardcoded sites removed; first-party attested actuals as the initial
non-synthetic source; derived rather than asserted completeness (R4); `SUPPLIED` vs `ADAPTER_DEFAULT`
provenance classification (R5); tenant/session/source isolation enforced on binding (R6); server-side
ingestion receipts. The X1/RB-3 synthetic-first ordering is preserved verbatim and re-asserted.

**ESF-4 — Signal Quality, Confidence & Provenance** *(third, parallel-eligible after ESF-6)*
Graded quality over admitted signals: freshness, completeness scoring, reliability, source
classification. Scope reduced — the provenance-classification slice moves to ESF-6 because
authority depends on it.

**Y4 — split.** Governance correction now (§12); calibration WP deferred behind N ≥ 3 eligible cases.

### 6.3 Signal quality — must ESF-4 precede authoritative admission?

**No.** Admission precedes grading. Quality is a property of a signal you have already decided to
trust the provenance of; you cannot meaningfully score the freshness of a clock you have not attested.

Answering the sharper question directly — may a signal legitimately become authoritative without each
of the following?

| Property | May authority proceed without it? | Placement |
|---|---|---|
| **Source attestation** | **No.** Attestation is constitutive of authority, not a grade on it | **ESF-6, mandatory** |
| **Confidence provenance** | **No, in the weak sense.** A defaulted value must never be *readable* as evidence. The required fix is a `DEFAULTED` classification, not a computed score | **ESF-6, mandatory (cheap slice)** |
| **Completeness** | **No, for the observation's own completeness** — it is currently asserted `true` and read by LE-5/LE-8 (R4). **Yes, for graded signal-completeness scoring** | Derived: ESF-6. Scored: ESF-4 |
| **Freshness** | **No, for window correspondence** — already partly in `assertGrainResolves`. **Yes, for general staleness grading** | Window: CDI-08. Grading: ESF-4 |
| **Quality** | **Yes.** A signal may be authoritative and poor. Conflating the two is precisely the error of reading 80/85 as authority | ESF-4 |

**The 80/85 defaults are explicitly not treated as authority in this assessment, and are not treated
as authority in the code today** — `determineObservationAuthority` never reads `confidence` or
`quality`. That is correct and must be preserved. The defect is only that they are copied into
`observation.provenance` indistinguishably from values a source actually supplied.

---

## 7. Minimum path to the first defensible LearningCase

The objective is not to make LE-1→LE-8 pass. It is to make the organisational memory that results
defensible when someone asks, two years later, why CogniX believes what it believes.

**Minimum sufficient capability — four items, in order:**

1. **A contracted grain an observation can actually address** (CDI-08). Either an observation that
   carries the full contracted tuple, or an observation set that jointly and exactly covers it —
   never apportionment, and never a broader entity narrowed. Removes LE-3.
2. **A declared tolerance authored before the outcome** (CDI-08), with `WITHIN_DECLARED_ENVELOPE`
   withheld until pre-declaration is witnessed (§5.4). Removes LE-7.
3. **Correspondence between what was predicted and what was measured** (CDI-08). Same metric, same
   basis, same window, derived rather than asserted. Removes R1/R2/R3 *before* they can arm.
4. **One attested non-synthetic observation** (ESF-6), isolated to the correct tenant and session,
   with completeness derived rather than assumed. Removes LE-4, R4, R5, R6.

**What is deliberately *not* on the path:**

- Not an observed counterfactual. The gross path is genuinely like-for-like once
  `reconciled_sum_pp` is present in the snapshot. The attributable path stays refused, and
  `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` stays published. **The first defensible case will be a
  gross-basis case, and it should say so on its face.**
- Not pattern promotion. One case is one case. `SINGLE_CASE_DISCLOSURE` and `N > 1` stand.
- Not a quantitative Half-Life. Outcome history is not assumption-decay evidence, at any corpus size.
- Not WP10-D telemetry. It is excluded from eligibility today and must stay excluded.

**What "defensible" then means concretely.** The resulting case can state: the decision, its immutable
digest-bound basis, the tolerance declared before execution, the attested source of the observation
and who attested it, the exact grain both sides addressed, the basis on which they were compared, the
signed error, and — in the same breath — that this is one observed case at one grain under one set of
declared constraints, and is not evidence of a rate.

**Two work packages. No procurement. No ML.**

---

## 8. Recommended next work package

> ### **CDI-08 — Observation Correspondence & Prediction Envelope Foundation**

**Why this and not admission first.** Correspondence is the only candidate that is simultaneously:
(a) free of external dependency, (b) fully testable at this baseline, (c) a remover of two of the
three declared blockers, and (d) **a precondition for landing admission safely**. R2, R3 and R6 are
fail-open and inert only because nothing is authoritative. Admission is exactly the change that makes
them live. Shipping admission first is shipping the estate's first real number through three
unvalidated correspondence tests — in a programme whose defining discipline is refusing to fabricate.

**Why not ESF-4 first.** It grades what nothing yet trusts and removes no blocker.

**Why not Y4 first.** It is real and it is a governance correction, not a work package (§12).

**Scope.** Composite grain resolution; metric correspondence; derived quantity basis; window
correspondence with fail-closed empty-grain handling; the declared prediction envelope on
`DecisionContract` with the §5.4 admissibility asymmetry; `PREDICTION_ENVELOPE_REQUIRED_INPUT`.

**Non-scope.** Connectors, attestation, non-synthetic admission, quality scoring, pattern telemetry,
apportionment, observed counterfactuals, any ML.

**Binding constraint on CDI semantics.** Purely additive on CDI-07A; strictly narrowing on CDI-07B.
**No comparison that fails today may pass after this work package** except by the two intended
unlocks (composite grain, declared envelope), and each of those must be demonstrated on a case that
provably could not pass before. Full re-execution of 21/36/31/49/70/93/155/232 is a gate condition.

---

## 9. Revised dependency sequence

```text
CDI-07B [CLOSED]
    │
    ├──> Y4-gov  Pattern telemetry citation correction   (governance, immediate, not a WP)
    │
    └──> CDI-08  Observation Correspondence & Prediction Envelope    [NEXT]
              │   removes LE-3, LE-7, R1, R2, R3
              │   no external dependency
              ▼
         ESF-6 / Y3a  Attested Observation Admission
              │   removes LE-4, R4, R5, R6
              │   first-party attested actuals — no procurement
              ▼
         ── FIRST DEFENSIBLE LearningCase POSSIBLE (gross basis) ──
              │
              ├──> ESF-4  Signal Quality, Confidence & Provenance   (parallel-eligible)
              │
              ├──> Y1  Observed counterfactual design → attributable comparison
              │
              ├──> Y2  Per-assumption observation → the real Half-Life precursor
              │
              └──> N ≥ 3 independent eligible cases
                        │
                        ├──> Y4-cal  Pattern telemetry calibration + WP10-D write path
                        │              (X3 gate: both required before any promotion)
                        │
                        └──> ML workstream  [DEFERRED — see §11]
```

**Changes from the existing roadmap.** ESF-4 moves from "parallel-eligible now" to "parallel-eligible
after ESF-6". Y3 splits into ESF-6 (Y3a) and the correspondence half absorbed into CDI-08. Y4 splits
into an immediate governance correction and a deferred calibration WP. Phases 10F/10G/10H/10K/10L/10M
all sit behind the first eligible case and are unchanged in content.

---

## 10. Recommended primary agent per work package

| WP | Agent | Rationale |
|---|---|---|
| **Y4-gov** | Any implementation agent | Bounded correction to six seeded records plus a disclosure. No contract change |
| **CDI-08** | **The designated CDI stream implementation agent (senior implementation capability), with mandatory independent adversarial reconciliation before commit** | It extends a closed contract and tightens a closed gate. Every WP from CDI-02 to CDI-07B shipped defects found by review rather than by its own suite — CDI-07A eight, CDI-07B eight. That precedent is unbroken and must not be tested here |
| **ESF-6 / Y3a** | The designated ESF/platform implementation agent, with the same mandatory reconciliation | More separable — its contract surface is ESF-owned. Reconciliation remains mandatory because it is the WP that arms every latent fail-open path |
| **ESF-4** | ESF/platform implementation agent, standard review | Additive, separate file ownership, no CDI contract touched |
| **Y4-cal** | Deferred | — |

**Subtask delegation.** Not justified for CDI-08: grain, metric, basis and window correspondence are
four tests on one predicate over one pair of objects, and the envelope is read by the same predicate.
Splitting them produces divergent conventions on a shared invariant. Recommended internal sequence:
envelope declaration → grain → metric → basis → window, so the contract shape settles before any test
consumes it.

---

## 11. ML workstream — justified now?

> **No. Defer, explicitly and on the record.**

Assessed against the four candidate tasks:

| Candidate | Assessment |
|---|---|
| **Candidate pattern discovery** | Requires eligible `LearningCase`s. There are **zero**, and there will be zero until ESF-6 lands |
| **Anomaly clustering** | Would run over ESF-1/ESF-2 signals, which are deterministic output of the estate's own simulator. It would learn the simulator's generating function and present it as an enterprise finding. Actively harmful |
| **Promotion-response calibration** | Requires the realised forecast-error dispersion series CDI-05 already names as its `calibration_target`. It does not exist and cannot exist before ESF-6 |
| **Observation correspondence suggestion** | The one genuinely sound design — rank which of N incoming signals plausibly address a contract's grain, with the deterministic gate still deciding. But it is only useful at a signal volume that arrives *with* real connectors, and the deterministic predicate it would shortlist for does not yet exist |

**Every candidate is gated on the same missing input: attested non-synthetic observations at volume.**
An ML workstream started now would be fitted to CogniX's own simulator — the precise failure mode that
CDI-07B spent eight defect corrections and 232 assertions preventing on the deterministic path.

**Reassess when:** ESF-6 has landed, at least one eligible `LearningCase` exists, and attested
observation volume is non-trivial. At that point, **observation correspondence suggestion** is the
correct first ML workstream: it is genuinely hard for rules, genuinely useful, and structurally
incapable of becoming a source of truth because a deterministic predicate sits downstream of it.

The ML/deterministic boundary is restated and unchanged: **ML may rank, cluster, shortlist and
suggest. It may never establish authority, eligibility, correspondence, comparability or a verdict.**

---

## 12. Governance / master-plan changes required

| # | Change | File |
|---|---|---|
| G1 | Add **CDI-08 — Observation Correspondence & Prediction Envelope Foundation**, with dependency classification (HARD: CDI-07A, CDI-07B) | `docs/governance/MASTER_PLAN.md` |
| G2 | Split **Y3** into **ESF-6 / Y3a (Attested Observation Admission)** and the correspondence half absorbed into CDI-08 | `MASTER_PLAN.md` |
| G3 | **Correct the Y3 characterisation.** The design gate records Y3 as "a commercial and integration question, not a design one." Three code sites (§3.1) make a non-synthetic observation unrepresentable regardless of any commercial arrangement. Record the correction and the finding that non-synthetic means *attested and independent*, not *purchased* | `MASTER_PLAN.md`, CDI-07B gate §13.2 addendum |
| G4 | Reposition **ESF-4** from "parallel-eligible now" to "parallel-eligible after ESF-6"; move the provenance-classification slice into ESF-6 | `MASTER_PLAN.md` |
| G5 | Split **Y4** into `Y4-gov` (immediate) and `Y4-cal` (deferred behind N ≥ 3) | `MASTER_PLAN.md` |
| G6 | **New ADR** — prediction envelope as a contract-native declared acceptance tolerance: covered by `contract_digest`, excluded from `decision_basis_digest`, never a statistical interval, with the §5.4 `WITHIN`/`OUTSIDE` admissibility asymmetry | `docs/architecture/ARCHITECTURE_DECISIONS.md` |
| G7 | **New ADR** — the admission/correspondence predicate split as a permanent architectural boundary | `ARCHITECTURE_DECISIONS.md` |
| G8 | **Governance correction, immediate.** Six seeded `EnterpriseLearningPattern` records publish 46 claimed `historical_occurrences` and six `intervention_success_rate` figures against three distinct cited memory cases (§4.3). Either withdraw the unsupported figures or relabel them as uncalibrated demonstration constants with the citation count shown alongside. `PAT-COMM-01`'s description restates "73% of untreated cases" as a finding and must be reworded | `services/learning/src/learning-pattern-store.ts`, `ORGANISATIONAL_LEARNING_INTELLIGENCE.md` |
| G9 | Record `PREDICTION_ENVELOPE_REQUIRED_INPUT` as a required contract deliverable of CDI-08, closing the estate's only undeclared capability gap | CDI-08 design gate |
| G10 | Record R6 (tenant/session isolation not enforced between contract and bound observations) as a **found** defect against ESF-6, not against closed CDI-07B semantics — it is latent and unreachable at this baseline | `MASTER_PLAN.md`, ESF-6 design gate |

### 12.1 Owner rulings required before CDI-08 design freeze

- **Z1** — Approve the prediction envelope as a contract-native declaration on CDI-07A's
  `DecisionContract`, additive, `contract_digest`-covered, `decision_basis_digest` untouched.
  *(Extends a closed contract. Precedent: X2.)*
- **Z2** — Approve the §5.4 asymmetry: `OUTSIDE_DECLARED_ENVELOPE` admissible on digest binding alone;
  `WITHIN_DECLARED_ENVELOPE` withheld until pre-declaration is witnessed by a server-side receipt.
- **Z3** — Approve **attested first-party actuals** as an admissible non-synthetic source, settling
  that authoritative means attested and independent, not third-party procured.
- **Z4** — Approve the composite-grain resolution mechanism: a jointly-covering observation set with
  exact token identity per dimension, never apportionment and never a broader entity narrowed.
- **Z5** — Approve the Y4-gov correction as an immediate governance action outside any work package.

---

## 13. Concise prompt for the recommended next work package

```text
# COGNIX — CDI-08 DESIGN GATE
# Observation Correspondence & Prediction Envelope Foundation

Branch: Feature/MatchingContract-AutoActivate
Baseline: 5b92dae25f3db0994b64d6fca98010558df2a49f
Authoritative assessment: docs/reports/COGNIX_PROGRAMME_10_POST_CDI_CONSOLIDATION_ASSESSMENT.md

Design gate only. Do not implement. Do not commit or push.

CONTINUITY
Verify branch, HEAD, both remotes converged, clean tree and empty stash. Re-execute and
report CDI-01..07B (21/36/31/49/70/93/155/232), ESF-2/3, WP10-C/D, IFI-01. Stop on any
divergence.

CLOSED AND NOT REOPENABLE
CDI-01..07B semantics. Owner rulings U*, V*, W*, X1-X4. No SUCCESS/FAILURE verdict. No
quantitative Decision Half-Life. No apportionment. No attributable-vs-gross differencing.
No automatic pattern promotion. No ML anywhere in this work package.

OWNER RULINGS ASSUMED IN FORCE — confirm before freezing
Z1 envelope is a contract-native declaration on DecisionContract, additive, covered by
   contract_digest, decision_basis_digest untouched.
Z2 OUTSIDE_DECLARED_ENVELOPE admissible on digest binding alone; WITHIN_DECLARED_ENVELOPE
   withheld until pre-declaration is witnessed by an instant the caller does not author.
Z4 composite grain resolves only by a jointly-covering observation set with exact token
   identity per contracted dimension.

SCOPE
1. Composite contracted grain (LE-3). assertGrainResolves returns false whenever more than
   one grain dimension is required. Design the observation shape that can address a
   contracted tuple. Never apportion. Never narrow a broader entity.
2. Empty grain and null window fail closed (R3). required.length === 0 currently returns
   true, and a null planned_start/planned_end skips the window test entirely.
3. Metric correspondence (R2). evaluateComparability tests authority, grain, unit and basis
   and never tests that the observation's signal_type addresses the contract's
   primary_metric. A pp-denominated weather delta must not reach LIKE_FOR_LIKE against a
   predicted volume uplift.
4. Derived quantity basis (R1). observed_basis is a literal 'GROSS' assignment at
   campaign-learning-loop-engine.ts:528. Derive it, or refuse.
5. Declared prediction envelope (LE-7). Nothing populates declared_envelope or
   within_declared_envelope, so INDETERMINATE is structurally guaranteed. Place the
   declaration per Z1, apply Z2, and declare PREDICTION_ENVELOPE_REQUIRED_INPUT with its
   inadmissible substitutes named: the observed value; a CDI-05 timeline band; a CDI-04
   ConfidenceBand as a percentage; a symmetric lab default; any envelope fitted to the
   series it adjudicates.

NON-SCOPE
Connectors, attestation, non-synthetic admission (ESF-6). Signal quality scoring (ESF-4).
Pattern telemetry (Y4). Observed counterfactuals (Y1). Per-assumption observation (Y2).

BINDING CONSTRAINT
Purely additive on CDI-07A. Strictly narrowing on CDI-07B. No comparison that fails at this
baseline may pass afterwards, except the two intended unlocks — composite grain and declared
envelope — and each must be demonstrated on a case that provably could not pass before.
Full re-execution of all eight CDI suites is a gate condition.

PRIMARY RISK TO DESIGN AGAINST
Misleading hindsight. This work package removes the refusals that currently stop the estate
producing a number. Every acceptance criterion is to be written as an attack on a
plausible-but-wrong LIKE_FOR_LIKE.

OUTPUT
A frozen design gate at docs/reports/COGNIX_CDI_08_OBSERVATION_CORRESPONDENCE_DESIGN_GATE.md
with: contract deltas, the correspondence predicate as an ordered test sequence, the envelope
declaration and its digest placement, acceptance criteria written as attacks, open owner
rulings, and a recommended implementation agent. Repository output tool-agnostic.
```

---

## 14. Assessment verdict

Programme 10's deterministic decision spine is **complete**. Its evidence intake is **not**, and the
gap is smaller and more tractable than the CDI-07B gate's framing implied — two work packages, no
procurement, no ML.

The single most consequential finding is not one of the three declared blockers. It is that **R2, R3
and R6 are fail-open and inert only because nothing is authoritative yet.** Authoritative observation
admission is the change that arms them. Correspondence must therefore land first — not because it is
more valuable in isolation, but because it is what makes the more valuable work package safe to ship.

The second is that **non-synthetic never meant purchased.** It means attested and independent of the
system that made the prediction. That single reframing converts LE-4 from a commercial dependency into
a bounded engineering task, and moves the first defensible `LearningCase` from indefinite to two work
packages away.
