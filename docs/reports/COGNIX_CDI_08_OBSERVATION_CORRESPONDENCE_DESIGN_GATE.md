# COGNIX — CDI-08 DESIGN GATE (FROZEN)
## Observation Correspondence & Prediction Envelope Foundation

**Type:** Design gate. No product code changed in this pass.
**Baseline:** `5b92dae25f3db0994b64d6fca98010558df2a49f`
**Branch:** `Feature/MatchingContract-AutoActivate`
**Date:** 2026-08-16
**Status:** **FROZEN — Z1–Z5 RESOLVED. Ready for implementation.**
**Architecture basis:** `docs/reports/COGNIX_PROGRAMME_10_POST_CDI_CONSOLIDATION_ASSESSMENT.md`
(not restated here — this gate is the delta only)

---

## 1. Owner rulings Z1–Z5 — RESOLVED

All five were resolvable from code at this baseline. **No blocking owner decision is escalated.**

### Z1 — Prediction envelope is a contract-native declaration on CDI-07A `DecisionContract`
**RESOLVED: APPROVED as proposed.** Not a judgement call — a mechanical consequence of two
implementations verified in code:

- [`computeDecisionBasisDigest`](packages/contracts/src/campaign-decision-contract-model.ts:599)
  builds a fixed sixteen-element tuple by reading named fields of `basis`. A new **top-level**
  contract field cannot enter it. `DECISION_BASIS_DIGEST_INPUTS` needs no change.
- [`computeContractDigest`](packages/contracts/src/campaign-decision-contract-model.ts:628)
  destructures out exactly `status`, `superseded_by`, `withdrawal` and hashes the remainder. A new
  top-level field **is** covered automatically.

The digest boundary therefore lands where §5.3(c) of the assessment ruled it, with no algorithm
change. `assumptions` and `triggers` are the existing precedent for contract-native declarations
that are not transcriptions of an upstream artefact.

### Z2 — `WITHIN` / `OUTSIDE` admissibility asymmetry
**RESOLVED: APPROVED, with its CDI-08 consequence made explicit.**

`OUTSIDE_DECLARED_ENVELOPE` is admissible on `contract_digest` binding alone: it can only ever be
adverse to the declarer, so post-hoc authorship carries no incentive. `WITHIN_DECLARED_ENVELOPE`
requires an instant the caller does not author.

**Consequence, stated so implementation does not drift into it:** no server-side registration
receipt exists at this baseline — that is ESF-6 scope. Therefore **`WITHIN_DECLARED_ENVELOPE`
remains structurally unreachable after CDI-08.** The only verdict this work package newly makes
reachable is `OUTSIDE_DECLARED_ENVELOPE`. This is what keeps CDI-08 strictly narrowing while still
removing LE-7's *undeclared* status.

### Z3 — Attested first-party actuals as an admissible non-synthetic source
**RESOLVED: APPROVED on the record, recorded against ESF-6, not CDI-08.**

Authoritative means *attested and independent of the system that made the prediction* — not
*procured*. Nothing in the authority conjunction
([`determineObservationAuthority`](packages/contracts/src/campaign-learning-loop-model.ts:659))
tests commercial provenance; it tests synthetic flags, scenario lineage,
`isObservationIndependentSourceType`, and connector resolution. First-party attested actuals fail
none of those by construction. **No CDI-08 deliverable depends on Z3.** It is approved now so ESF-6
is unblocked at its own gate.

### Z4 — Composite grain resolution mechanism
**RESOLVED: APPROVED, NARROWED. The "jointly-covering observation set" is REFUSED.**

This is the one place this gate departs from the assessment's phrasing, and the reason is
arithmetic, not preference.

A set of marginal observations does not determine the joint cell. An observation of
`CATEGORY = Fresh Dairy` and an observation of `REGION = North West` do not, together, yield the
`Fresh Dairy × North West` movement. Combining them requires an independence or proportionality
assumption — which **is apportionment**, under a different name, and is prohibited by the same
constraint that produced RB-4. Admitting a jointly-covering set would reintroduce the exact defect
CDI-07B corrected.

> **Ruling.** A contracted composite grain resolves **only** by a single observation carrying an
> explicit **composite grain key** whose dimension set is *equal* to the contracted required
> dimension set — no missing dimension, no extra dimension — with exact token identity on every
> dimension. No set. No apportionment. No broader entity narrowed. No marginal combined.

Single-entity observations (`entity_type` / `entity_id`, no composite key) remain admissible for
exactly the one-dimension case they serve today, unchanged.

A jointly-covering set is not merely deferred — it is declared **inadmissible**, and named as such
in `PREDICTION_ENVELOPE_REQUIRED_INPUT`'s sibling declaration (§5.3).

### Z5 — Y4-gov as an immediate governance action outside any work package
**RESOLVED: APPROVED.** The governance half lands with this freeze
(`ORGANISATIONAL_LEARNING_INTELLIGENCE.md`, `MASTER_PLAN.md`). The code half
(`services/learning/src/learning-pattern-store.ts` — six seeded records) is a separate
documentation-independent commit and is **not** in this docs-only pass. It is recorded as
outstanding in `MASTER_PLAN.md`.

---

## 2. What this work package closes

| Item | Current defect | Closed by |
|---|---|---|
| **LE-3** composite observation correspondence | `assertGrainResolves` returns `false` whenever `required.length > 1` ([:731](packages/contracts/src/campaign-learning-loop-model.ts:731)) | §4 — composite grain key, test C4 |
| **LE-7** declared prediction envelope | Nothing populates `declared_envelope`; `INDETERMINATE` structurally guaranteed | §5 — envelope on `DecisionContract` |
| **metric ↔ signal_type** (R2) | `evaluateComparability` never tests `signal_type` against `primary_metric` | §4 — test C6, closed correspondence table |
| **quantity-basis** (R1) | `observed_basis = 'GROSS'` is a literal at [engine:528](lib/campaign-learning-loop-engine.ts:528) | §4 — test C8, derived-or-refuse |
| **observation-window** | `planned_start` / `planned_end` nullable and skipped when null | §4 — tests C3, C5 |
| **tenant/session isolation** | `comparePredictionToReality` never compares observation tenancy against the contract's (R6) | §4 — test C0, applied at binding |
| **empty-grain fail-open** | `required.length === 0 → true` | §4 — test C2, fail-closed |
| **missing-window fail-open** | null window skips the test entirely | §4 — test C3, fail-closed |

**Out of scope:** connectors, attestation, non-synthetic admission, ingestion receipts (ESF-6);
quality scoring (ESF-4); pattern telemetry (Y4); observed counterfactuals (Y1); per-assumption
observation (Y2); any ML.

---

## 3. Reclassification of R6 (tenant/session isolation)

The consolidation assessment §6.1 filed isolation under Admission (`source × context → authority`).
That classification is correct for **ingestion-side** isolation — does this source belong to this
tenant at all. It is not the whole of R6.

R6's live failure is that `comparePredictionToReality` binds an observation to a contract without
comparing `observation.tenant_id` / `session_id` against the contract's, and then republishes it
under the contract's tenancy. That is a `contract × observation` predicate — **correspondence**.

> **Split, recorded permanently.** Contract↔observation isolation is CDI-08 (test C0).
> Source↔context isolation at ingestion remains ESF-6. Both are required; neither substitutes for
> the other.

`assertTenantSessionCoherent`
([:818](packages/contracts/src/campaign-decision-contract-model.ts:818)) already exists and is
already used for `RJ-C4`. C0 reuses it — no new helper.

---

## 4. The correspondence predicate — ordered test sequence

One predicate, `contract × observation → comparability`. **First failure wins; no test is skipped;
no test may return `true` on absent input.**

Order is deliberate: `OBSERVATION_NOT_AUTHORITATIVE` and `GRAIN_MISMATCH` keep their current
positions relative to `UNIT_MISMATCH` so every existing CDI-07B assertion that expects a specific
verdict string still receives it.

| # | Test | Rule | Failure verdict |
|---|---|---|---|
| **C0** | **Isolation** | `assertTenantSessionCoherent(contract, observation)`. Applied **at binding**, before authority — a foreign-tenant observation is never a binding candidate | `TENANT_SESSION_MISMATCH` *(new)* |
| **C1** | Authority | `determineObservationAuthority(...) === 'AUTHORITATIVE_EXTERNAL'`. **Unchanged** | `OBSERVATION_NOT_AUTHORITATIVE` |
| **C2** | Grain declared | `requiredGrainDimensions(invariants).length >= 1`. **Empty grain fails closed** | `GRAIN_UNDECLARED` *(new)* |
| **C3** | Window declared | `planned_start` and `planned_end` both non-null, both `Date.parse`-able, `start <= end`. **Null fails closed** | `WINDOW_UNDECLARED` *(new)* |
| **C4** | Grain correspondence | See §4.1 | `GRAIN_MISMATCH` |
| **C5** | Window correspondence | See §4.2 | `WINDOW_MISMATCH` *(new)* |
| **C6** | Metric correspondence | See §4.3 | `METRIC_MISMATCH` / `METRIC_CORRESPONDENCE_UNDECLARED` *(new)* |
| **C7** | Unit | Normalised identity (`percent` → `pp`). **Unchanged** | `UNIT_MISMATCH` |
| **C8** | Quantity basis | See §4.4 | `QUANTITY_BASIS_UNDECLARED` *(new)* / `NO_OBSERVED_COUNTERFACTUAL` / `QUANTITY_BASIS_MISMATCH` |
| → | | all pass | `LIKE_FOR_LIKE` |

### 4.1 C4 — grain correspondence (Z4)

```
required  = requiredGrainDimensions(comparison_invariants)      // category | region | sku | customer_segment
observed  = observation.grain_key                                // ObservationGrainKey | undefined
```

1. If `observed` is **absent**: admissible only when `required.length === 1`. Evaluate exactly
   today's `entityCoversSingleDimension`. Unchanged behaviour, unchanged code path.
2. If `observed` is **present**: `set(observed.dimensions) === set(required)` — **set equality**.
   A missing dimension fails. An **extra** dimension also fails: an observation carrying more
   dimensions than the contract declared addresses a narrower thing than was decided, and admitting
   it would be apportionment inverted.
3. Per-dimension token identity via the existing `normalizeGrainToken`. No substring, no prefix, no
   fuzzy match, no case-insensitive containment.
4. `sku` is one dimension whose token is the **whole contracted `sku_scope`**: sorted, normalised,
   joined by `|`. Membership of a single SKU in a multi-SKU scope **does not** resolve it.
5. `customer_segment` currently returns `false` unconditionally in
   `entityCoversSingleDimension`. It becomes resolvable **only** through a composite key naming it
   with exact token identity. The single-entity path stays `false`.

**No apportionment. No fallback. A missing dimension can never pass.**

### 4.2 C5 — window correspondence

The contracted window is `[planned_start, planned_end]` (guaranteed non-null by C3).

The observation declares a measurement window: `measurement_window_start` /
`measurement_window_end`. When both are absent, `effective_at` is read as a degenerate instant
window `[effective_at, effective_at]`.

**Rule — exact coverage, not containment:**
`normalizeInstant(m_start) === normalizeInstant(planned_start)` **and**
`normalizeInstant(m_end) === normalizeInstant(planned_end)`.

Rationale: a three-day observation of a fourteen-day campaign is not that campaign's outcome, and
scaling it to the contracted window is apportionment on the time axis. A degenerate instant window
therefore **cannot** satisfy C5 for any real campaign — which is correct, and is the honest reason
today's fixtures will not reach `LIKE_FOR_LIKE`.

`observed_at` remains the *ingestion/measurement* instant and is no longer read as the window test.
The existing `observed_at >= planned_start` guard inside
`observationAuthorityBlocksLikeForLike` is retained as-is (it is a staleness floor, not a
correspondence test) — never relaxed.

### 4.3 C6 — metric ↔ signal_type correspondence

A **closed, exported, declared** table. Not inferred, not string-matched, not extensible at runtime.

```ts
export const METRIC_CORRESPONDENT_SIGNAL_TYPES:
  Readonly<Record<PrimaryObjectiveMetric, readonly CanonicalSignalType[]>> = {
  VOLUME:          ['ORDER_VELOCITY_ACCELERATION', 'CATEGORY_DEMAND_ACCELERATION'],
  REVENUE:         [],
  CONTRIBUTION:    [],
  WASTE_REDUCTION: [],
  AVAILABILITY:    []
};
```

- Non-empty set, `signal_type` a member → pass.
- Non-empty set, `signal_type` not a member → `METRIC_MISMATCH`.
- **Empty set → `METRIC_CORRESPONDENCE_UNDECLARED`.** The estate declares that it does not know
  which observable quantity addresses that metric, and refuses. It does not guess.

Deliberate exclusions, each load-bearing:
- `REGIONAL_DEMAND_SHIFT` — a redistribution between regions, not a level movement.
- `BASKET_ADD_ACCELERATION`, `PRODUCT_ENGAGEMENT_ACCELERATION`, `SEARCH_VELOCITY_ACCELERATION` —
  engagement proxies, not realised volume.
- `PROMOTION_CANNIBALISATION` — a signed component of volume, never volume.
- `MARGIN_COMPRESSION` — a pressure indicator, not a contribution measurement. This is why
  `CONTRIBUTION` is empty rather than plausibly populated.
- Every `WEATHER_*`, `COMPETITOR_*`, `LOCAL_EVENT_*`, `PAYDAY_*`, `DEMOGRAPHIC_*` type — contextual
  drivers. **This is the test that stops a `pp`-denominated weather delta reaching
  `LIKE_FOR_LIKE` against a predicted volume uplift.**

`target_direction` is **not** a correspondence test. Correspondence asks what was measured; the
signed error already carries direction. Testing direction here would convert a correspondence
predicate into a judgement of the decision — forbidden by `NOT_A_DECISION_VERDICT_DISCLOSURE`.

### 4.4 C8 — quantity-basis correspondence (R1)

`observed_basis` is **derived or refused**. The literal `'GROSS'` at
[engine:528](lib/campaign-learning-loop-engine.ts:528) is deleted.

```
deriveObservedBasis(observation):
  if measurement_design absent                     -> undefined
  if measurement_design === 'DIRECT_MEASUREMENT'   -> 'GROSS'
  if measurement_design === 'MODELLED'             -> 'MODELLED_MONETARY'
  if measurement_design === 'CONTROLLED_DIFFERENCE'-> refuse: unreachable at this baseline
```

- `undefined` → `QUANTITY_BASIS_UNDECLARED`. **`observed_basis` is not populated on the row at all**
  — an unstated basis is never written as a stated one.
- `'CONTROLLED_DIFFERENCE'` is rejected at validation, not honoured: it would assert an observed
  counterfactual, which `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` declares unavailable. Accepting it
  would let a caller-declared field manufacture ATTRIBUTABLE evidence.
- `predicted_basis === 'ATTRIBUTABLE'` → `NO_OBSERVED_COUNTERFACTUAL`. **Unchanged.** No fallback
  from attributable to gross, ever.
- derived ≠ predicted → `QUANTITY_BASIS_MISMATCH`.

`measurement_design` is caller-supplied and therefore a *claim*. It is admissible here for exactly
the reason `resolved_by` is admissible on CDI-07A: it is an attributed declaration whose falsity is
a misrepresentation, not an inference the estate is making on the caller's behalf. Its
attestation-side hardening is ESF-6.

---

## 5. Contract deltas — minimum additive extension

### 5.1 `campaign-decision-contract-model.ts` (CDI-07A) — **purely additive**

```ts
/** Local structural twin — CDI-06 R1 / CDI-07A §8.2 precedent. Avoids a module cycle:
 *  campaign-learning-loop-model already imports this file, so QuantityBasis cannot be imported back. */
export type ContractQuantityBasis = 'ATTRIBUTABLE' | 'GROSS' | 'MODELLED_MONETARY';

export interface DeclaredPredictionEnvelope {
  envelope_id: string;
  /** Must equal a source_field_path present in basis.outcome_snapshot or basis.decomposition_snapshot. */
  applies_to_field_path: string;
  /** Signed, in `unit`, relative to the predicted value. lower <= 0 <= upper is NOT required. */
  lower: number;
  upper: number;
  /** Must equal the snapshot's unit at applies_to_field_path. */
  unit: string;
  /** Must equal the predicted basis for that path. */
  basis: ContractQuantityBasis;
  /** Named accountable human. Mandatory, never defaulted, never inferred from session or header. */
  declared_by: string;
  /** Why this tolerance. Mandatory. */
  declaration_statement: string;
  /** Closed single members — these are not statistical intervals and must never render as one. */
  tolerance_kind: 'DECLARED_ACCEPTANCE_TOLERANCE';
  derivation: 'HUMAN_DECLARED';
  /** Z2. Only ESF-6 can raise this above NONE. */
  pre_declaration_witness: 'NONE' | 'SERVER_REGISTRATION_RECEIPT';
}
```

On `DecisionContract`, **top-level, sibling to `assumptions` and `triggers`**:

```ts
  /** CDI-08 / Z1. Covered by contract_digest. NOT an input to decision_basis_digest.
   *  Never inferred from observed outcomes. Never derived from a CDI-04/CDI-05 confidence band. */
  prediction_envelopes: DeclaredPredictionEnvelope[];   // may be empty; never absent
```

**Digest placement — no algorithm change:** `computeContractDigest` covers it automatically;
`computeDecisionBasisDigest` and `DECISION_BASIS_DIGEST_INPUTS` are untouched. CDI-02 and CDI-06
semantics are entirely unaffected.

**Validation (`C-INV-ENV-1…5`), all fail-closed:**
1. `applies_to_field_path` resolves to a published basis snapshot, else reject.
2. `unit` and `basis` equal that snapshot's, else reject.
3. `lower <= upper`; both finite; not both zero.
4. `declared_by` and `declaration_statement` non-empty after trim.
5. At most one envelope per `applies_to_field_path`.

### 5.2 `campaign-learning-loop-model.ts` (CDI-07B) — additive shape, narrowing behaviour

```ts
export type GrainDimension = 'category' | 'region' | 'sku' | 'customer_segment';

export interface ObservationGrainKeyEntry { dimension: GrainDimension; token: string; }
export interface ObservationGrainKey { dimensions: ObservationGrainKeyEntry[]; }

export type ObservationMeasurementDesign =
  | 'DIRECT_MEASUREMENT'
  | 'MODELLED'
  | 'CONTROLLED_DIFFERENCE';   // declared, permanently rejected at this baseline
```

On `OutcomeObservation` (all optional — legacy single-entity observations unchanged):

```ts
  grain_key?: ObservationGrainKey;
  measurement_window_start?: string;
  measurement_window_end?: string;
  measurement_design?: ObservationMeasurementDesign;
```

`ComparabilityVerdict` gains seven members; **no existing member is removed or renamed**:

```
| 'TENANT_SESSION_MISMATCH'
| 'GRAIN_UNDECLARED'
| 'WINDOW_UNDECLARED'
| 'WINDOW_MISMATCH'
| 'METRIC_MISMATCH'
| 'METRIC_CORRESPONDENCE_UNDECLARED'
| 'QUANTITY_BASIS_UNDECLARED'
```

`PredictionError` extension:

```ts
  declared_envelope?: {
    lower: number; upper: number; source_field_path: string;
    envelope_id: string; declared_by: string;
    pre_declaration_witness: 'NONE' | 'SERVER_REGISTRATION_RECEIPT';
  };
  /** Z2: set false when the signed error falls outside. Set true ONLY when witness !== 'NONE'. */
  within_declared_envelope?: boolean;
  /** Mandatory when the error falls inside the envelope but the witness is NONE. */
  within_withheld_reason?: string;
```

`deriveComparisonVerdict` ([engine:657](lib/campaign-learning-loop-engine.ts:657)) needs **no
change** — it already requires `within_declared_envelope === true` for `WITHIN`, and Z2 guarantees
that is never set at this baseline.

### 5.3 New declarations

```ts
export type LearningCapability =
  | 'LEARNING_PATTERN_PROMOTION'
  | 'OBSERVED_COUNTERFACTUAL_COMPARISON'
  | 'QUANTITATIVE_DECISION_HALF_LIFE'
  | 'PRE_DECLARATION_WITNESSED_ENVELOPE';   // new
```

**`PREDICTION_ENVELOPE_REQUIRED_INPUT`** — published on every `PredictionOutcomeComparison`
alongside the existing three. This closes the estate's only *undeclared* capability gap.

- `field`: `server_side_contract_registration_receipt`
- `grain`: per contract, an instant the caller does not author, comparable against a server-side
  observation ingestion receipt
- `why_required`: digest immutability proves the envelope was not edited; it does not prove it was
  declared before the outcome. `created_as_of` is caller-supplied (C-INV-9) and cannot serve.
- `enables`: `PRE_DECLARATION_WITNESSED_ENVELOPE`
- `inadmissible_substitutes` (named explicitly, per §5.5 of the assessment):
  - the observed value itself, or any envelope fitted to the series it adjudicates
  - a CDI-05 `TimelineConfidenceEnvelope` band
  - a CDI-04 `ConfidenceBand` converted to a percentage
  - a symmetric ±X% lab default
  - `created_as_of`, or any caller-supplied instant, read as pre-declaration
  - `contract_digest` verification read as proof of temporal precedence

**`COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT`** — the Z4 refusal, declared rather than left as
prose:

- `field`: `composite_grain_observation`
- `grain`: one observation whose declared grain key equals the contracted required dimension set
- `inadmissible_substitutes`:
  - a jointly-covering set of marginal observations combined into a joint cell
  - a broader-grain observation narrowed to the contracted grain
  - a single SKU treated as resolving a multi-SKU `sku_scope`
  - any proportional, independence or share-based allocation across dimensions

---

## 6. Acceptance criteria — written as attacks

Every criterion is a plausible-but-wrong `LIKE_FOR_LIKE` that must be refused. The primary risk is
misleading hindsight: this work package removes the refusals that currently stop the estate
producing a number.

| # | Attack | Required outcome |
|---|---|---|
| A-01 | Weather `pp` delta, correct grain, correct window, `primary_metric = VOLUME` | `METRIC_MISMATCH`. Never an error value |
| A-02 | Contract with blank `comparison_invariants`; any observation | `GRAIN_UNDECLARED`. Never `LIKE_FOR_LIKE` |
| A-03 | Contract with `planned_start = null`; observation at any instant | `WINDOW_UNDECLARED` |
| A-04 | Contract with `planned_end = null` only | `WINDOW_UNDECLARED` |
| A-05 | Observation from tenant B, session Y; contract tenant A, session X; grain and window match | Never binds. `TENANT_SESSION_MISMATCH`. `comparison.tenant_id` never republishes B's data under A |
| A-06 | Same tenant, **different session**, otherwise perfect | `TENANT_SESSION_MISMATCH` |
| A-07 | Grain `category × region`; two observations, one CATEGORY, one REGION, both token-exact | Neither binds. `GRAIN_MISMATCH`. No combination attempted |
| A-08 | Grain `category × region`; composite key `{category, region}` token-exact | **Binds.** Demonstrates the LE-3 unlock on a case that provably could not pass at baseline |
| A-09 | Grain `category × region`; composite key `{category, region, sku}` | `GRAIN_MISMATCH` — extra dimension |
| A-10 | Grain `category × region`; composite key `{category}` | `GRAIN_MISMATCH` — missing dimension |
| A-11 | `sku_scope = [P004, P007]`; observation SKU key `P004` | `GRAIN_MISMATCH`. Membership never resolves a scope |
| A-12 | Composite key token `Fresh Dairy and Frozen` against contracted `Fresh Dairy` | `GRAIN_MISMATCH`. RB-4 holds under composite keys |
| A-13 | 3-day measurement window inside a 14-day contracted window | `WINDOW_MISMATCH`. No time-axis apportionment |
| A-14 | Measurement window one day wider than contracted | `WINDOW_MISMATCH` |
| A-15 | No measurement window; `effective_at` inside the contracted window | `WINDOW_MISMATCH` (degenerate instant ≠ coverage) |
| A-16 | `measurement_design` absent | `QUANTITY_BASIS_UNDECLARED`; `observed_basis` **not written** on the row |
| A-17 | `measurement_design = 'CONTROLLED_DIFFERENCE'` | Rejected at validation. No ATTRIBUTABLE comparison manufactured |
| A-18 | `predicted_basis = 'ATTRIBUTABLE'`, GROSS observation, everything else perfect | `NO_OBSERVED_COUNTERFACTUAL`. Unchanged |
| A-19 | Contract with `prediction_envelopes: []` | LE-7 unmet, `blocked_by` names the absent envelope. Verdict `INDETERMINATE` |
| A-20 | Envelope declared; signed error outside it; witness `NONE` | `within_declared_envelope: false`; verdict `OUTSIDE_DECLARED_ENVELOPE`. **The intended LE-7 unlock** |
| A-21 | Envelope declared; signed error **inside** it; witness `NONE` | `within_declared_envelope` **unset**; `within_withheld_reason` populated; verdict `INDETERMINATE`. Never `WITHIN` |
| A-22 | Envelope inserted or edited after creation | `contract_digest` mismatch; every CDI-07B artefact rejects fail-closed |
| A-23 | Contract created, then a `prediction_envelopes` entry added | `decision_basis_digest` **unchanged**; `contract_digest` **changed** |
| A-24 | Envelope `applies_to_field_path` naming an unpublished snapshot | Contract creation rejected |
| A-25 | Envelope `unit` or `basis` differing from its snapshot | Contract creation rejected |
| A-26 | Envelope with empty `declared_by` | Contract creation rejected. Never defaulted from a session |
| A-27 | Two envelopes on one `applies_to_field_path` | Contract creation rejected |
| A-28 | A CDI-05 `TimelineConfidenceEnvelope` transcribed into `prediction_envelopes` | No code path exists to do so; `PREDICTION_ENVELOPE_REQUIRED_INPUT` names it inadmissible |
| A-29 | Every CDI-07B fixture that fails today | Still fails, with the same or a more specific verdict |
| A-30 | `PREDICTION_ENVELOPE_REQUIRED_INPUT` and `COMPOSITE_GRAIN_OBSERVATION_REQUIRED_INPUT` | Published on every `PredictionOutcomeComparison` |

### Binding gate conditions

1. Full re-execution: **CDI-01 21 / CDI-02 36 / CDI-03 31 / CDI-04 49 / CDI-05 70 / CDI-06 93 /
   CDI-07A 155 / CDI-07B 232**, plus ESF-2 19, ESF-3 22, WP10-C, WP10-D 13, IFI-01 12.
2. **Strictly narrowing:** no comparison that fails at `5b92dae2` may pass afterwards, except
   A-08 (composite grain) and A-20 (declared envelope), each demonstrated on a case that provably
   could not pass before.
3. **Purely additive on CDI-07A:** no existing field removed, renamed, retyped, or moved between
   `basis` and top level.
4. Mandatory independent adversarial reconciliation before commit (§10 of the assessment — every
   WP from CDI-02 to CDI-07B shipped defects found by review rather than by its own suite).

### Known implementation risk

`prediction_envelopes` is a mandatory top-level field, so **every contract's `contract_digest`
changes**. Any test asserting a hard-coded digest literal will fail. Expected and correct; the
builder must always emit `[]` rather than omitting the field, so digests stay deterministic.

---

## 7. Implementation sequence

Contract shape settles before any predicate consumes it:

1. `DeclaredPredictionEnvelope` + `prediction_envelopes` + validation (§5.1)
2. `ObservationGrainKey` + composite grain resolution — C2, C4 (§4.1)
3. Window declaration and coverage — C3, C5 (§4.2)
4. `METRIC_CORRESPONDENT_SIGNAL_TYPES` — C6 (§4.3)
5. Derived quantity basis; delete the literal at engine:528 — C8 (§4.4)
6. Isolation at binding — C0 (§3)
7. Envelope evaluation with the Z2 asymmetry; required-input declarations (§5.3)

**No subtask delegation.** Four tests on one predicate over one pair of objects; splitting them
produces divergent conventions on a shared invariant.

**Recommended agent:** the designated CDI stream implementation agent (senior implementation capability), with mandatory
independent adversarial reconciliation before commit.

---

## 8. What remains open after CDI-08

| Item | Owner | Position |
|---|---|---|
| `WITHIN_DECLARED_ENVELOPE` reachability | ESF-6 | Requires a server-side registration receipt (Z2) |
| LE-4 — non-synthetic observation | ESF-6 | Three hardcoded synthetic sites; attested first-party actuals (Z3) |
| R4 derived completeness, R5 provenance classification | ESF-6 | — |
| Source↔context isolation at ingestion | ESF-6 | Distinct from CDI-08's C0 (§3) |
| Composite-grain observation supply | ESF-6 | CDI-08 defines the shape; ESF-6 admits a real one |
| Y4-gov code half | Immediate, outside any WP | `learning-pattern-store.ts` — six seeded records (Z5) |

**The first defensible `LearningCase` remains two work packages away, and will be a gross-basis
case.**
