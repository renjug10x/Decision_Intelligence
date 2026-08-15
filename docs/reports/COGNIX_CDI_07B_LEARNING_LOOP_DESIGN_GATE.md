# COGNIX — CDI-07B PRE-MORTEM, PREDICTION VS REALITY & CLOSED LEARNING LOOP — INTELLIGENCE DESIGN GATE

| Field | Value |
| --- | --- |
| Work package | `CDI-07B` — Campaign Pre-Mortem, Prediction vs Reality & Closed Learning Loop |
| Authorised baseline | `56b266aaf083ecb4ff572cdf5b89b53f391a2db5` — CDI-07A decision contract, committed and converged |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Status | **DESIGN FROZEN — CONTRACT FROZEN — APPROVED — IMPLEMENTATION-READY** (owner rulings X1, X2, X3 and X4 approved and closed 2026-08-15; §13.1) |
| Hard dependencies | `CDI-07A` `DecisionContract`, `WP10-D` `cognix-learning` |
| Integration dependency | `ESF-3` External Signal Connectors |
| Scope | Design and contract freeze only. No CDI-07B product implementation. |
| Date | 2026-08-15 |

**Governing principle for this work package.**

> A Pre-Mortem asks what could fail before we act. Prediction vs Reality asks what actually differed
> after we acted. Learning asks what of that is reusable. None of the three re-decides, and none of
> the three may touch the contract that recorded the decision.

**Second governing principle, and the one this gate spends most of its length defending.**

> A comparison is only evidence if the two things compared are the same kind of thing, at the same
> grain, measured on the same basis. Where they are not, the honest output is `INDETERMINATE` with
> the mismatch named — never a number that looks like an answer.

---

## 1. Continuity

### 1.1 Baseline verification

| Check | Result |
| --- | --- |
| Branch | `Feature/MatchingContract-AutoActivate` |
| `HEAD` | `56b266aaf083ecb4ff572cdf5b89b53f391a2db5` — matches the authorised baseline |
| Remote `gitlab` | `56b266aa…` — converged |
| Remote `origin` | `56b266aa…` — converged |
| Working tree | Clean |
| Stash | Empty |

No unexplained divergence.

### 1.2 Closed upstream evidence

| Package | Contract | Engine | Suite | Result |
| --- | --- | --- | --- | --- |
| `CDI-01` | `campaign-intent-model.ts` | `campaign-intent-store.ts` | `run-cdi01-tests.ts` | 21 passed |
| `CDI-02` | `campaign-counterfactual-model.ts` | `campaign-causal-engine.ts` | `run-cdi02-tests.ts` | 36 passed |
| `CDI-03` | `campaign-opportunity-model.ts` | `campaign-opportunity-engine.ts` | `run-cdi03-tests.ts` | 31 passed |
| `CDI-04` | `campaign-readiness-model.ts` | `campaign-readiness-engine.ts` | `run-cdi04-tests.ts` | 49 passed |
| `CDI-05` | `campaign-timeline-model.ts` | `campaign-timeline-engine.ts` | `run-cdi05-tests.ts` | 70 passed |
| `CDI-06` | `campaign-frontier-model.ts` | `campaign-frontier-engine.ts` | `run-cdi06-tests.ts` | 93 passed |
| `CDI-07A` | `campaign-decision-contract-model.ts` | `campaign-decision-contract-engine.ts` | `run-cdi07a-tests.ts` | 155 passed |

`WP10-D` (`services/learning`), `WP10-C` (`decision-state-store.ts`) and `ESF-3`
(`external-signal-connector-model.ts`, `services/world/src/external-signal-connector.ts`) are present
and green. The declared CDI-07B dependency chain — `CDI-07A` and `WP10-D` HARD, `ESF-3` INTEGRATION —
is intact.

### 1.3 Continuity findings carried into the design

Eleven findings were measured against the baseline estate before this design was written. Each is
load-bearing, and five are decisive.

**B1 — There is no non-synthetic observation source in the estate. Decisive.**

Measured against the ESF-3 registry (`services/world/src/external-signal-connector.ts`):

| Connectors registered | `synthetic_demo: true` | Non-synthetic |
| --- | --- | --- |
| 7 | **7** | **0** |

`conn_planning_ref_01`, `conn_commerce_ref_01`, `conn_weather_ref_01`, `conn_events_ref_01`,
`conn_competitive_ref_01`, `conn_ops_telemetry_ref_01`, `conn_demographic_ref_01` — every one is a
reference adapter, every one is `AVAILABLE`, and every one is flagged synthetic at source. The file
says so in its own header: *all reference adapters emit identifiable synthetic feeds, no production
credentials*.

The consequence is structural and it is the single most important fact in this gate. **CDI-07B can
be built, exercised and regression-tested end to end, but it cannot produce a real-world outcome
claim at this baseline.** Every `OutcomeObservation` this estate can currently supply is
`SYNTHETIC_DEMONSTRATION` (§4.3). This drives **L-INV-3** and the Half-Life ruling in §9.

**B2 — An ESF-3 observation does not currently satisfy CDI-07A's world-attribution test. Decisive.**

`mapCategoryToSourceType` (`external-signal-connector-model.ts:113`) maps connector categories to
canonical source types as follows:

| ESF-3 category | `SignalSourceType` | Satisfies CDI-07A `WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE` (`'EXTERNAL_CONNECTOR'`) |
| --- | --- | --- |
| `WEATHER` | `EXTERNAL_CONNECTOR` | Yes |
| `EVENTS` | `EXTERNAL_CONNECTOR` | Yes |
| `COMPETITIVE_INTEL` | `EXTERNAL_CONNECTOR` | Yes |
| `DEMOGRAPHIC_CONTEXT` | `EXTERNAL_CONNECTOR` | Yes |
| `PLANNING` | `PLANNING_SYSTEM` | **No** |
| `COMMERCE` | `COMMERCE_TELEMETRY` | **No** |
| `OPERATIONAL_TELEMETRY` | `FULFILMENT_SYSTEM` | **No** |

Measured: ingesting a `PLANNING` envelope produced
`sig_ext_probe_plan … source_type=PLANNING_SYSTEM`. CDI-07A's reconciliation introduced
`WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE = 'EXTERNAL_CONNECTOR'` as the sole admissible provenance for a
`WORLD_DRIVEN` claim, so three of the seven genuinely-external ESF-3 categories — including the two
most relevant to a retail campaign outcome — would be refused world attribution despite being fully
independent of Shared Decision State.

This is a **seam defect, not a contract defect**. CDI-07A's semantics are right (world attribution
requires provenance independent of Shared Decision State); its *predicate* is too narrow. §8.3 rules
on it: CDI-07B declares the authoritative set and CDI-07A's constant is widened to consume it. That is
an additive constant change inside CDI-07A's own file, not a change to any frozen type, and is the
**only** upstream touch this gate authorises (§11.4).

**B3 — The decision grain and the observation grain do not coincide. Decisive.**

The contracted decision grain, read from `basis.comparison_invariants` on a live contract:

```
category = "Fresh Dairy"        region = "North West"       sku_scope = ["P004"]
customer_segment = "Family Shoppers"                        timing_mode = "KNOWN_DATES"
planned_start = 2026-08-20      planned_end = 2026-08-27
objective_type = "REVENUE_ACCELERATION"  primary_metric = "CONTRIBUTION"
```

An ESF-3 observation is addressed by a single `(entity_type, entity_id)` pair — `CATEGORY` /
`cat_fresh_dairy`, or `REGION` / `reg_north_west`, or `SKU` / `P004`. **No ESF-3 entity expresses the
composite.** Observing the Fresh Dairy category nationally is not observing Fresh Dairy × North West ×
P004 × Family Shoppers over 20–27 August.

A comparison that quietly treats a category-wide observation as the outcome of a region-and-segment
campaign attributes to the campaign everything that happened to the category. This drives the
`GRAIN_MISMATCH` verdict (§5.4) and **L-INV-5**.

**B4 — The contracted prediction and the available observation are measured on different bases.
Decisive.**

Measured on the reference contract:

| Quantity | Value | Basis |
| --- | --- | --- |
| `counterfactual.campaign_delta.attributable_uplift_pp` | `6.41` pp | **Counterfactual-differenced.** CDI-02 defines it as demand attributable to the intervention itself, *excluding* ambient drivers that occur with or without the campaign |
| `counterfactual.campaign_delta.contribution_delta_gbp` | `488.19` | Modelled, using an eroded per-unit contribution |
| ESF-3 `EnterpriseSignal.delta_pct` | `8.5` | **Gross.** `(observed_value − baseline_value) / baseline_value`, which *includes* ambient movement |

Comparing `8.5` against `6.41` and reporting a `+2.09pp` error would charge the campaign with every
ambient driver in the period. They are not the same quantity. An attributable prediction can only be
compared against an **observed counterfactual**, and a counterfactual is by construction not
observable — it must come from a control group, a holdout, or a pre-declared observation design.

There is a constructive path, and CDI-05 already supplies it. `DemandDecomposition.reconciliation`
publishes `reconciled_sum_pp` — the ambient subtotal plus the intervention subtotal plus the residual.
Measured on the reference anchor: `ambient_group.subtotal_pp = 1.42`,
`intervention_group.subtotal_pp = 6.41` on the contracted play. **The gross predicted movement is
therefore already published, and gross-observed against gross-predicted is a genuine like-for-like
comparison.** This is the basis of `QuantityBasis` in §5.3.

**B5 — ESF-3 fabricates confidence and quality when the adapter omits them.**

`normaliseEnvelopeToEnterpriseSignal` (`external-signal-connector-model.ts:280`) applies
`confidence: 80` and `quality: 85` when the envelope supplies neither. Measured: an envelope with no
confidence or quality produced `conf=80 qual=85`.

These are lab defaults wearing the shape of a measurement. CDI-07B must never gate observation
authority on them, and must never carry them into a `LearningCase` as evidence of quality
(**L-INV-7**). An observation whose confidence and quality were *supplied* is materially different
from one where they were *defaulted*, and the envelope does not currently distinguish the two —
so CDI-07B records the distinction itself, in `EvidenceProvenance.metrics_supplied`.

**B6 — The contract's own evidence floor is the weakest in the taxonomy.**

Measured on the reference contract: `evidence_strength_floor = PLACEHOLDER_EXCLUDED`,
`confidence_band = MODERATE`, with `decomposition_snapshot` values carrying
`strength: PLACEHOLDER_EXCLUDED`.

A decision recorded on a placeholder-excluded floor is a legitimate decision record — CDI-07A is
correct to publish it — but it is **not reusable evidence about the world**. Learning eligibility must
gate on the floor, not merely on the presence of a comparison (§6.3, **L-INV-8**).

**B7 — WP10-D cannot create a learning pattern. Decisive.**

`ILearningPatternRepository` (`services/learning/src/repository.ts:21`) declares exactly four methods:
`getLearningPatternById`, `queryLearningPatterns`, `matchLearningPatterns`, `getSupportingMemories`,
plus `clear`. **There is no write method.** Patterns are a read-only seeded set of six.

`IMemoryRepository` by contrast declares `registerMemoryCase`, which validates and persists.

So the estate can record a new *case* and cannot create a new *pattern*. This is not an obstacle to be
worked around — it is the correct shape, and CDI-07B adopts it: learning produces cases, references
patterns, and never writes one (§6.5, §7.2). Pattern promotion is contracted `NOT_AVAILABLE`.

**B8 — WP10-D pattern telemetry is not backed by its own citations.**

Measured across the seeded patterns:

| Pattern | `historical_occurrences` | `supporting_memory_ids` | `pattern_confidence` | Calibration status |
| --- | --- | --- | --- | --- |
| `PAT-RISK-…` (first seed) | `11` | `['MEM-2025-Q2-018']` — **one** | `89` | none — the field does not exist |
| second seed | `7` | `['MEM-2025-Q2-018']` — **one** | `84` | none |
| third seed | `6` | — | `84` | none |

Every seed carries `source_classification: 'G10X Synthetic Demonstration Precedent'`, so the numbers
are honestly labelled as demonstration data. But the shape has no place to record *how* a confidence
was derived, and a pattern asserting eleven occurrences while citing one memory is exactly the
inference CDI-07B is forbidden to make (*do not promote one observed case into a universal pattern*).

CDI-07B therefore reads `EnterpriseLearningPattern` for *reference and situational context only*, never
as evidence strength, and never writes into that shape. `pattern_confidence`,
`situation_similarity` and `intervention_success_rate` are **not** admissible inputs to any CDI-07B
eligibility decision (**L-INV-9**).

**B9 — `EnterpriseMemoryCase` has no contract linkage and stores outcomes as prose.**

Its reference fields are `commercial_intent_ref`, `decision_state_ref`, `signal_refs` and
`simulation_ref`. There is no `contract_ref`, and `expected_outcome` / `actual_outcome` /
`business_result` / `lessons_learned` are free-text strings.

This is why CDI-07B **owns the structured comparison** and WP10-D **owns the narrative precedent**.
The `LearningCase` carries the structured, digest-bound evidence; the registered
`EnterpriseMemoryCase` carries the human-readable precedent and points back by id. One additive
optional field on `EnterpriseMemoryCase` — `decision_contract_ref?: string`, mirroring the
`commercial_intent_ref` precedent exactly — is approved as owner ruling **X2** (§13.1) and is
reference-only: no contract content crosses into WP10-D (§7.4).

**B10 — Consequence ordering already exists in WP10-C, and it is about a different object.**

`calculateDerivedImpacts` (`decision-state-model.ts:100`) is a deterministic lab formula that already
labels its own ordering in source: `commitment_gap_units` is first-order, `dc_overtime_hours` is
annotated *"Ripple 2nd order"*, `margin_erosion_pct` *"3rd order"*. The constants are lab values —
`BASE_DEMAND = 10000`, `£120` per out-of-stock unit, a scope multiplier of `1.0 / 0.75 / 0.6`.

**No new Ripple engine is needed, and none may be built** (§3.5). But the asymmetry must be
disclosed: `calculateDerivedImpacts` reads `DecisionScenarioParameters` and
`selected_interventions` — WP10-C's own scenario — and knows nothing of `campaign_intent_id` or
`play_id`. **It describes the shared scenario, not the contracted play.** A pre-mortem that binds a
failure mode to a derived impact is binding to a different object than the contract's basis, and must
say so. This is the direct analogue of CDI-07A §7.4 Asymmetry 1, and it drives §3.4.

**B11 — Observations persist; predictions do not.**

CDI-07A **K4** established that no CDI-02/CDI-05/CDI-06 artefact is persisted anywhere. ESF-3 is the
exception in the other direction: `ingestedByTenant`
(`services/world/src/external-signal-connector.ts:129`) is a tenant-scoped in-memory store of ingested
signals, exposed through `listIngestedExternalSignals`.

So the estate retains what it *observed* and discards what it *predicted* — and the only durable
record of the prediction is the immutable snapshot inside the `DecisionContract`. That is precisely
what CDI-07A was built for, and it makes the contract the **prediction of record** for all of CDI-07B
(§5.2, **L-INV-2**).

One incidental measurement: ingestion is gated by `supported_signal_types` per connector. A
`CATEGORY_DEMAND_ACCELERATION` envelope submitted through `conn_weather_ref_01` was rejected. Adapter
capability is therefore a real constraint on which quantities can be observed at all, and
`ObservationCompleteness` records it.

### 1.4 Upstream semantics this gate is bound by

- **CDI-07A C-INV-5 / C-INV-7.** A contract's `basis`, `resolution`, `assumptions` and `triggers` are
  immutable, and nothing automatic supersedes or withdraws. CDI-07B extends both to three new
  artefacts without exception (**L-INV-1**, **L-INV-2**).
- **CDI-07A C-INV-2.** Every reference is an identifier *plus* a digest. Every CDI-07B artefact binds
  `contract_id` **and** `contract_digest`, and a mismatch is a fail-closed rejection.
- **CDI-07A §5.7 / C-INV-9.** No duration, countdown, expiry, decay rate or elapsed-time value, in a
  key *or* a string value. CDI-07B inherits the guard unchanged and adds its own offenders (§9.4).
- **CDI-06 §5.4.** No hidden score, weight, composite, utility or ranking — including as an unused
  field. CDI-07B adds `likelihood`, `impact_score`, `severity_score` and `risk_score` to the
  prohibited set (§3.3).
- **CDI-04 taxonomies.** `EvidenceStrength`, `EVIDENCE_STRENGTH_ORDER`, `weakestEvidenceStrength`,
  `ConfidenceBand`, `ThresholdCalibrationStatus`, `ReadinessCondition`, `ReadinessVeto` are imported,
  never redefined. CDI-05, CDI-06 and CDI-07A each set this precedent.
- **CDI-05 / CDI-06 / CDI-07A unavailability pattern.** `RequiredAuthoritativeInput` — field, grain,
  why required, inadmissible substitutes, what it enables — is the frozen way to express a capability
  that is contracted but cannot truthfully be produced. CDI-07B reuses it three times (§6.5, §9.2).
- **CDI-07A §8.2 local-twin precedent.** Where a frozen upstream union is too narrow, declare a local
  structural twin rather than widening upstream. CDI-07B needs it once (§6.5).

### 1.5 Scoped guards CDI-07B must not trip

| Guard | Scope | Effect on CDI-07B |
| --- | --- | --- |
| `assertNoDurationSemantics` key **and** value scans (`campaign-decision-contract-model.ts`) | Any CDI-07A payload | Binding by extension. No CDI-07B artefact may be embedded in a contract or assessment, and CDI-07B declares the same scans over its own payloads |
| `validateDecisionTimelineProjection` rejects `/half_life|valid_until|remaining_hours|_expires/i` | `DecisionTimelineProjection` only | None, provided no CDI-07B field enters a CDI-05 payload |
| `CDI01_FORBIDDEN_CALCULATION_KEYS` | Any `CampaignIntent` | Binding. No pre-mortem, comparison or learning field is ever written into a `CampaignIntent` |
| `assertValidityReadNoEconomics` / `assertValidityProposesNoAlternative` | CDI-07A assessments | CDI-07B must not route its outputs back through a validity assessment to evade them |
| `validateExternalSignalEnvelope` raw-payload and credential scans | ESF-3 envelopes | Binding. A raw provider body must never reach an `OutcomeObservation` |

---

## 2. Design Position — three artefacts, three questions, three lifecycles

| Question | Artefact | When | Lifecycle |
| --- | --- | --- | --- |
| **What could fail** | `CampaignPreMortem` | Before execution | Immutable once created. Superseded, never edited |
| **What actually differed** | `PredictionOutcomeComparison` | After execution | Recomputed on demand from supplied observations at a caller-supplied `as_of`. Never written back |
| **What is reusable** | `LearningCandidate` → `LearningCase` | After comparison | Candidate always produced; case created only when the deterministic eligibility gate passes |

The separation is not organisational tidiness. Each artefact has a different truth condition. A
pre-mortem is a *structural* claim that needs no observation. A comparison is an *empirical* claim
that is worthless without one. A learning case is a *generalisation* claim, and it is the only one of
the three that can quietly become false by being reused somewhere it does not apply.

### 2.1 Binding invariants

| Id | Invariant | Basis |
| --- | --- | --- |
| **L-INV-1** | Every CDI-07B artefact carries `contract_id` **and** `contract_digest`, and creation fails closed when the digest does not match the resolved contract | CDI-07A C-INV-2 |
| **L-INV-2** | No CDI-07B path writes to a contract's `basis`, `resolution`, `assumptions`, `triggers` or `status`, and none supersedes or withdraws. `REASSESS_REQUIRED` remains the strongest thing CogniX says on its own | CDI-07A C-INV-5 / C-INV-7 |
| **L-INV-3** | An observation sourced from a `synthetic_demo` connector is never presented, labelled, exported or summarised as a real-world outcome, at any tier of any surface | **B1** |
| **L-INV-4** | A pre-mortem publishes no likelihood, probability, impact score, severity score or risk score. Failure modes are enumerated from declared evidence and ordered by consequence order, never ranked | Gate instruction; CDI-06 §5.4 |
| **L-INV-5** | A `PredictionError` exists only where `ComparabilityVerdict === 'LIKE_FOR_LIKE'`. Every other verdict yields `INDETERMINATE` with the mismatch named and **no error value computed** | **B3**, **B4** |
| **L-INV-6** | A missing observation is `OBSERVATION_ABSENT`. It is never `NOT_FIRED`, never zero error, and never read as the prediction having held | Gate instruction; CDI-07A §8.3 precedent |
| **L-INV-7** | Adapter-defaulted `confidence` / `quality` are never inputs to observation authority or learning eligibility, and `EvidenceProvenance.metrics_supplied` records whether they were supplied | **B5** |
| **L-INV-8** | Learning eligibility is a deterministic conjunction over named conditions. It is never a score, never a threshold on a total, and never an LLM or model judgement | Gate instruction |
| **L-INV-9** | `pattern_confidence`, `situation_similarity` and `intervention_success_rate` are read-only context. They are never inputs to eligibility and are never written by CDI-07B | **B7**, **B8** |
| **L-INV-10** | One eligible case never becomes a pattern. Pattern promotion is contracted `NOT_AVAILABLE` and requires both a WP10-D write path and multi-case evidence | **B7**, **B8** |
| **L-INV-11** | A `PredictionError` is descriptive evidence about a prediction. It is never rendered, labelled or summarised as a verdict on the decision, the resolver, or the play | Gate instruction |
| **L-INV-12** | No duration, countdown, expiry, decay rate, elapsed-time or remaining-percentage value exists in any CDI-07B payload or surface, in a key or a string value | CDI-07A C-INV-9 |
| **L-INV-13** | All ids, digests, ordering and verdicts are content-derived or caller-supplied. `Date.now()` and argless `new Date()` appear in no CDI-07B decision logic | CDI-07A C-INV-3 |
| **L-INV-14** | Every CDI-07B artefact agrees with its contract on `tenant_id` and `session_id`. Cross-tenant reads report not-found, never forbidden | CDI-07A C-INV-10 / §8.4 |

---

## 3. Campaign Pre-Mortem Domain Model

### 3.1 Design position

A pre-mortem asks *what could fail*, before anything has happened. It has no observations, and it
must not pretend otherwise.

The failure mode nobody catches here is **invented precision**: a table of failure modes with
`likelihood: 0.35` and `impact: HIGH` reads as analysis and is arithmetic over nothing. The estate has
no failure-frequency history, no calibrated impact model, and every CDI-04 threshold is
`UNCALIBRATED_LAB_DEFAULT`. So CDI-07B enumerates failure modes **from evidence the estate already
declared**, and publishes what each one is grounded in.

### 3.2 `CampaignPreMortem`

```ts
export type PreMortemStatus = 'ACTIVE' | 'SUPERSEDED';

export interface CampaignPreMortem {
  pre_mortem_id: string;               // content-derived; never time-derived (L-INV-13)
  pre_mortem_version: number;
  status: PreMortemStatus;

  tenant_id: string;
  session_id: string;

  /** L-INV-1 — identifier AND digest. */
  contract_id: string;
  contract_digest: string;
  decision_basis_digest: string;

  failure_modes: FailureMode[];        // §3.3
  resilience: ResilienceEvidence[];    // §3.6

  /** Dimensions a pre-mortem could not examine, and why. */
  unexamined: PreMortemUnexaminedDimension[];
  unavailable_capabilities: LearningRequiredAuthoritativeInput[];   // §6.5

  /** §3.4 — mandatory when any failure mode cites a WP10-C derived impact. */
  derived_impact_scope_disclosure?: string;

  evidence_strength_floor: EvidenceStrength;   // CDI-04, imported
  confidence_band: ConfidenceBand;             // CDI-04, imported
  calculation_mode: 'deterministic_pre_mortem';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  created_as_of: string;               // caller-supplied reference instant
}
```

### 3.3 `FailureMode` — enumerated from declared evidence, never invented

```ts
export type FailureModeClass =
  | 'READINESS_CONDITION_UNMET'      // CDI-04 ReadinessCondition open at resolution
  | 'READINESS_VETO_LATENT'          // CDI-04 veto on a rejected alternative, not the selected play
  | 'CONSTRAINT_BREACH'              // a CDI-06 DeclaredConstraint bound could be crossed
  | 'ASSUMPTION_FALSIFIED'           // a CDI-07A load-bearing DecisionAssumption stops holding
  | 'CHOICE_SET_INCOMPLETE'          // CDI-06 unavailable_at_decision dimension turns out to matter
  | 'EXECUTION_CAPACITY'             // a WP10-C derived impact crosses its own declared bound
  | 'OBSERVABILITY_GAP';             // the decision cannot be verified after the fact (§5)

/** Reuses the ordering WP10-C already publishes in source. No new Ripple engine (B10). */
export type ConsequenceOrder = 'FIRST_ORDER' | 'SECOND_ORDER' | 'THIRD_ORDER';

/**
 * NOT a probability. It says how the mode was arrived at, so a reader can judge it themselves.
 * There is deliberately no ordering over these three values.
 */
export type FailureModeGrounding =
  /** An open condition, veto, elimination or load-bearing assumption already declared upstream. */
  | 'DECLARED_EVIDENCE'
  /** A structural consequence of the contracted basis (e.g. an unavailable economics dimension). */
  | 'STRUCTURAL'
  /** Named because its absence would be misleading; the estate cannot assess it. */
  | 'UNASSESSED';

export interface FailureMode {
  failure_mode_id: string;
  failure_mode_class: FailureModeClass;
  statement: string;                   // in the reader's terms
  grounding: FailureModeGrounding;
  consequence_order: ConsequenceOrder;

  /** Where this came from. The owning package stays authoritative. */
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-04' | 'CDI-05' | 'CDI-06' | 'CDI-07A' | 'WP10-C';
  source_field_path: string;
  /** Transcribed verbatim from the source. Never recomputed (CDI-07A C-INV-4 precedent). */
  contracted_value: string | number | boolean | null;

  /** CDI-04 / CDI-07A objects this defers to. Never a reimplementation. */
  readiness_condition_ref?: { dimension: ReadinessDimensionId; condition_id: string };
  readiness_veto_ref?: { veto_id: string };
  constraint_ref?: { constraint_id: string };
  assumption_ref?: { assumption_id: string; load_bearing: boolean };
  derived_impact_ref?: { field: keyof DecisionDerivedImpacts; scope_disclosure: string };  // §3.4

  /** Second- and third-order modes name the first-order mode they follow from. */
  follows_from_failure_mode_id?: string;

  strength: EvidenceStrength;          // CDI-04, imported
  /** Mandatory. Names what this mode does and does not assert. */
  disclosure: string;
}
```

**Prohibited on `FailureMode` and on every pre-mortem surface**, enforced by
`assertNoInventedRiskPrecision` as a key *and* value scan:

```text
/likelihood|probability|p_fail|impact_score|severity_score|risk_score|risk_rating|
 expected_loss|confidence_pct|criticality|priority_value/i
```

Two fired failure modes are two failure modes. There is no total, no matrix position, and no ranking.

### 3.4 The WP10-C asymmetry, disclosed rather than resolved

**B10** measured it: `calculateDerivedImpacts` is a function of `DecisionScenarioParameters` and
`selected_interventions`. It has no knowledge of `campaign_intent_id`, `play_id` or the contracted
basis. Its constants are lab values.

An `EXECUTION_CAPACITY` failure mode citing `commitment_gap_units` is therefore saying *the shared
scenario currently implies a capacity gap* — not *this contracted play will breach capacity*. Those
are different claims and the second does not follow from the first.

Every `derived_impact_ref` carries this disclosure verbatim, and the pre-mortem carries it once at the
top:

> This failure mode is grounded in the Shared Decision State scenario parameters, which are not the
> parameters this decision was contracted on. It indicates a condition in the surrounding scenario,
> not a recomputation of the contracted play's economics.

`FailureMode.grounding` for any derived-impact mode is `STRUCTURAL`, never `DECLARED_EVIDENCE`.

### 3.5 Consequence ordering — reuse, do not rebuild

WP10-C already annotates its own chain: demand and capacity produce `commitment_gap_units`
(first order), which produces `dc_overtime_hours` (second order, annotated as such in source), which
produces `margin_erosion_pct` (third order). CDI-07B **maps onto that existing ordering** and declares
no new propagation model.

| Order | Meaning | Existing anchor |
| --- | --- | --- |
| `FIRST_ORDER` | Directly asserted by a declared condition, veto, constraint or assumption | CDI-04 conditions/vetoes, CDI-06 eliminations, CDI-07A assumptions |
| `SECOND_ORDER` | Follows from a first-order mode through a relationship the estate already publishes | `dc_overtime_hours` (WP10-C, annotated "Ripple 2nd order") |
| `THIRD_ORDER` | Follows from a second-order mode through a relationship the estate already publishes | `margin_erosion_pct` (WP10-C, annotated "3rd order") |

A second- or third-order mode **must** populate `follows_from_failure_mode_id`. An order-2 mode with no
antecedent is a rejection (`RJ-P4`), because an unattached second-order claim is a first-order claim
wearing a bigger number.

**No new Ripple service, engine, propagation model or graph traversal is created.** Where the estate
publishes no relationship, the mode is `UNASSESSED` and says so.

### 3.6 `ResilienceEvidence`

```ts
export interface ResilienceEvidence {
  resilience_id: string;
  failure_mode_id: string;
  /** What already exists that would blunt this — a discharge test, a declared constraint, a buffer. */
  statement: string;
  source_package: 'CDI-04' | 'CDI-06' | 'CDI-07A' | 'WP10-C';
  source_field_path: string;
  /** CDI-04 discharge test this defers to, where one exists. */
  discharge_test_ref?: { dimension: ReadinessDimensionId; condition_id: string };
  strength: EvidenceStrength;
  /** True when nothing in the estate mitigates this mode — published, not hidden. */
  no_known_mitigation: boolean;
}
```

Resilience evidence describes what already exists. **It never proposes a different play, a different
depth, a different window, or a change to the contract** — that would be re-deciding, and it is
`assertPreMortemProposesNoAlternative` (§12 AC-P8) that keeps it from happening.

A failure mode with no resilience evidence publishes one row with `no_known_mitigation: true`. Silence
would read as *handled*.

---

## 4. Observation Authority Model

*This section answers key design question 1.*

### 4.1 Design position

An observation is authoritative for Prediction vs Reality when a reader could, in principle, check it
against the world. Everything else is demonstration data — useful for building and testing the
mechanism, inadmissible as an outcome claim.

### 4.2 `OutcomeObservation`

```ts
export interface OutcomeObservation {
  observation_id: string;              // content-derived
  tenant_id: string;
  session_id: string;

  /** ESF-3 lineage. Bound, never re-derived. */
  signal_id: string;
  connector_id: string;
  external_category: ExternalSignalCategory;   // ESF-3, imported
  signal_type: CanonicalSignalType;            // ESF-1, imported
  source_type: SignalSourceType;               // ESF-1, imported — §8.3
  entity_type: SignalEntityType;
  entity_id: string;

  /** Verbatim from the normalised EnterpriseSignal. Never recomputed. */
  baseline_value: number;
  observed_value: number;
  delta_pct: number;
  unit: string;
  observed_at: string;                 // ISO 8601 from the external source
  effective_at: string;

  authority: ObservationAuthority;     // §4.3
  provenance: EvidenceProvenance;      // §4.4
  completeness: ObservationCompleteness; // §4.5

  synthetic_demo: boolean;
  schema_version: string;
}
```

### 4.3 `ObservationAuthority`

```ts
export type ObservationAuthority =
  /** ESF-3-originated, non-synthetic, provenance complete, metrics supplied not defaulted. */
  | 'AUTHORITATIVE_EXTERNAL'
  /** ESF-3-originated but synthetic_demo — the only class this baseline can produce (B1). */
  | 'SYNTHETIC_DEMONSTRATION'
  /** Derived from Shared Decision State parameters — our own scenario, not the world. */
  | 'SCENARIO_DERIVED'
  /** Lineage could not be resolved. Never upgraded on the basis of plausibility. */
  | 'UNATTRIBUTED';
```

`AUTHORITATIVE_EXTERNAL` requires **all** of the following, evaluated as a conjunction:

| # | Condition | Why |
| --- | --- | --- |
| 1 | `synthetic_demo === false` on the signal **and** on its originating connector descriptor | **B1** — a synthetic feed is not the world |
| 2 | `source_type` ∈ `OBSERVATION_INDEPENDENT_SOURCE_TYPES` (§8.3) | Independence from Shared Decision State |
| 3 | `connector_id` resolves in the ESF-3 registry with `status: 'AVAILABLE'` | Lineage must be checkable |
| 4 | `provenance.envelope_id` and `provenance.connector_id` both present | ESF-3 sets both on normalisation |
| 5 | `observed_at` parses and is **not before** the contracted `planned_start` | An observation predating the campaign cannot be its outcome |
| 6 | `metrics_supplied === true` — confidence and quality came from the adapter, not the default | **B5** |
| 7 | The entity resolves to the decision grain under §5.4 | **B3** |

Failing 1 makes it `SYNTHETIC_DEMONSTRATION`. Failing 2 with a Shared-Decision-State-derived lineage
makes it `SCENARIO_DERIVED`. Failing 3 or 4 makes it `UNATTRIBUTED`. Failing 5, 6 or 7 leaves the
authority class intact but is recorded in `ObservationCompleteness` and blocks `LIKE_FOR_LIKE`.

**Measured position at this baseline: every observation the estate can produce is
`SYNTHETIC_DEMONSTRATION`** (**B1**). CDI-07B is therefore fully implementable and fully testable, and
its Prediction-vs-Reality surface runs in an explicitly labelled demonstration mode until a
non-synthetic connector exists. That is a truthful state, not a degraded one.

### 4.4 `EvidenceProvenance`

```ts
export interface EvidenceProvenance {
  origin: 'ESF-3_CONNECTOR' | 'ESF-1_SIMULATION' | 'WP10-C_SCENARIO' | 'UNKNOWN';
  connector_id?: string;
  envelope_id?: string;
  adapter_version?: string;
  source_system?: string;
  /** B5 — false when ESF-3 applied its 80/85 defaults. Never an authority input when false. */
  metrics_supplied: boolean;
  confidence?: number;
  quality?: number;
  /** Opaque ESF-3 reference only. A raw provider body must never appear here. */
  provider_payload_ref?: string;
  synthetic_demo: boolean;
  /** Mandatory when synthetic_demo is true. Rendered wherever the observation is shown. */
  synthetic_disclosure?: string;
}
```

The mandatory synthetic disclosure, verbatim:

> This observation comes from a reference connector that emits demonstration data. It is not a
> real-world outcome and must not be read, cited or exported as one.

### 4.5 `ObservationCompleteness`

```ts
export interface ObservationCompleteness {
  /** Every quantity the contract predicted, and whether an admissible observation exists for it. */
  covered_quantities: string[];        // source_field_paths from the contract basis
  missing_quantities: string[];        // L-INV-6 — published, never defaulted to zero
  /** Contracted window coverage, expressed as observed points, never as a percentage of "success". */
  window_start_observed: boolean;
  window_end_observed: boolean;
  /** True when the connector's supported_signal_types could not carry the needed quantity (B11). */
  adapter_capability_gap: boolean;
  gap_reasons: string[];
  complete: boolean;                   // conjunction; never a score
}
```

`complete` is `true` only when `missing_quantities` is empty, both window flags are `true`, and
`adapter_capability_gap` is `false`. It is a conjunction over named conditions — never a coverage
percentage, and never rounded up.

---

## 5. Prediction vs Reality Model

*This section answers key design questions 2 and 4.*

### 5.1 Design position

The contract is the prediction of record (**B11**). The comparison quotes it, quotes the observation,
and reports the difference **only where the two are the same kind of thing**. Where they are not, it
reports why not, and computes nothing.

### 5.2 `PredictionOutcomeComparison`

```ts
export interface PredictionOutcomeComparison {
  comparison_id: string;               // content-derived from contract, observations and as_of
  tenant_id: string;
  session_id: string;

  contract_id: string;
  contract_digest: string;             // L-INV-1 — fail closed on mismatch
  decision_basis_digest: string;

  /** Caller-supplied reference instant. Never Date.now() (L-INV-13). */
  as_of: string;

  observations: OutcomeObservation[];
  /** One row per contracted quantity, including those that could not be compared. */
  comparisons: QuantityComparison[];   // §5.3
  verdict: ComparisonVerdict;          // §5.5
  attribution: OutcomeAttribution;     // §8.2

  completeness: ObservationCompleteness;
  unavailable_capabilities: LearningRequiredAuthoritativeInput[];

  /** Mandatory. Verbatim from the declared constant. */
  not_a_decision_verdict_disclosure: string;   // §5.6
  /** Mandatory whenever any observation is synthetic. */
  synthetic_disclosure?: string;

  evidence_strength_floor: EvidenceStrength;
  calculation_mode: 'deterministic_prediction_comparison';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
}
```

The comparison is **recomputed on demand and never written back**, exactly as a CDI-07A validity
assessment is. It has no status, no lifecycle and no store of its own.

### 5.3 `QuantityComparison` and `PredictionError`

```ts
/**
 * The measurement basis of a quantity. B4 is the whole reason this type exists: an ATTRIBUTABLE
 * prediction and a GROSS observation are different quantities and may never be differenced.
 */
export type QuantityBasis =
  /** Counterfactual-differenced — excludes ambient drivers. CDI-02 attributable_uplift_pp. */
  | 'ATTRIBUTABLE'
  /** Includes ambient movement. ESF-3 delta_pct; CDI-05 reconciliation.reconciled_sum_pp. */
  | 'GROSS'
  /** Modelled monetary value under a declared unit contribution. */
  | 'MODELLED_MONETARY';

export interface QuantityComparison {
  /** The contract basis path being compared. The owning package stays authoritative. */
  predicted_source_field_path: string;
  predicted_source_package: 'CDI-02' | 'CDI-05' | 'CDI-06';
  predicted_value: number;             // transcribed from the contract snapshot, never recomputed
  predicted_basis: QuantityBasis;
  predicted_unit: string;

  observed_observation_id?: string;
  observed_value?: number;
  observed_basis?: QuantityBasis;
  observed_unit?: string;

  comparability: ComparabilityVerdict; // §5.4
  /** Present ONLY when comparability === 'LIKE_FOR_LIKE' (L-INV-5). */
  error?: PredictionError;
  /** Required when comparability !== 'LIKE_FOR_LIKE'. Names the mismatch, not a generic failure. */
  incomparable_reason?: string;
}

/**
 * Descriptive evidence about a prediction. NOT a verdict on the decision (L-INV-11).
 * Absolute and signed only — no percentage-of-target, no accuracy score, no grade.
 */
export interface PredictionError {
  signed_delta: number;                // observed − predicted, in the shared unit
  unit: string;
  /** CDI-05 attributable_effect_envelope, transcribed. Absent when the contract published none. */
  declared_envelope?: { lower: number; upper: number; source_field_path: string };
  within_declared_envelope?: boolean;  // absent when no envelope was declared
  statement: string;                   // what moved, from what to what, in the reader's terms
}
```

**There is no accuracy score, error percentage, MAPE, grade or hit-rate anywhere.** A signed delta in
the shared unit, and — where CDI-05 declared one — whether it fell inside the envelope the estate
itself published. Nothing is normalised into a number that invites league-tabling.

### 5.4 `ComparabilityVerdict` — the gate before any arithmetic

```ts
export type ComparabilityVerdict =
  | 'LIKE_FOR_LIKE'
  /** B3 — the observation's entity does not resolve to the contracted decision grain. */
  | 'GRAIN_MISMATCH'
  /** B4 — an ATTRIBUTABLE prediction against a GROSS observation, or any basis disagreement. */
  | 'QUANTITY_BASIS_MISMATCH'
  /** B4 — attributable comparison requires an observed counterfactual; none was declared. */
  | 'NO_OBSERVED_COUNTERFACTUAL'
  /** Units differ and no declared, lossless conversion exists. Never silently converted. */
  | 'UNIT_MISMATCH'
  /** L-INV-6 — nothing was observed for this quantity. Never zero error. */
  | 'OBSERVATION_ABSENT'
  /** Observation exists but its authority is not AUTHORITATIVE_EXTERNAL. */
  | 'OBSERVATION_NOT_AUTHORITATIVE';
```

Evaluated in order; the first failure fixes the verdict and **no error is computed**:

| # | Test | Verdict on failure |
| --- | --- | --- |
| 1 | An observation is bound for this quantity | `OBSERVATION_ABSENT` |
| 2 | `authority === 'AUTHORITATIVE_EXTERNAL'` | `OBSERVATION_NOT_AUTHORITATIVE` |
| 3 | The observation entity resolves to the decision grain (§5.4.1) | `GRAIN_MISMATCH` |
| 4 | `predicted_unit === observed_unit`, or a declared lossless conversion exists | `UNIT_MISMATCH` |
| 5 | `predicted_basis === observed_basis` | `QUANTITY_BASIS_MISMATCH` |
| 6 | If `predicted_basis === 'ATTRIBUTABLE'`, a declared observed counterfactual exists | `NO_OBSERVED_COUNTERFACTUAL` |

**5.4.1 Grain resolution.** An observation resolves to the decision grain only when its
`(entity_type, entity_id)` covers **no more** than the contracted grain on every declared dimension of
`comparison_invariants` — category, region, `sku_scope`, `customer_segment` — and its
`observed_at` falls within `[planned_start, planned_end]`.

A `CATEGORY` observation against a decision scoped to `category × region × sku × segment` covers
strictly more than the decision and is `GRAIN_MISMATCH`. **Narrowing a broad observation onto a narrow
decision by apportionment is prohibited without exception** — apportionment is modelling, and the
output would be a modelled number presented as an observation.

**5.4.2 The attributable path, stated plainly.** At this baseline the contract's headline predicted
quantity, `attributable_uplift_pp`, is `ATTRIBUTABLE` (**B4**) and nothing in the estate observes a
counterfactual. Its comparison is therefore `NO_OBSERVED_COUNTERFACTUAL` and no error is produced.

The quantity that *can* be compared is the gross one: CDI-05 publishes
`decomposition.reconciliation.reconciled_sum_pp` — ambient plus intervention plus residual — which is
`GROSS`, the same basis as an ESF-3 `delta_pct`. **CDI-07B's implementable Prediction-vs-Reality path
is the gross path**, and the attributable path is contracted `NOT_AVAILABLE` with its unlock named
(§6.5, `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT`).

This is the honest shape of the capability, and it is worth being explicit that it is a smaller claim
than "we check whether the campaign worked". It checks whether total movement landed where the model
said total movement would land. Separating the campaign's share from the weather's share still
requires a holdout.

### 5.5 `ComparisonVerdict` — why `SUCCESS` and `FAILURE` do not appear

*This answers key design question 4 directly.*

```ts
export type ComparisonVerdict =
  /** Every LIKE_FOR_LIKE quantity fell inside its declared CDI-05 envelope. */
  | 'WITHIN_DECLARED_ENVELOPE'
  /** At least one LIKE_FOR_LIKE quantity fell outside its declared envelope. */
  | 'OUTSIDE_DECLARED_ENVELOPE'
  /** No quantity was comparable, or no envelope was declared for those that were. */
  | 'INDETERMINATE';
```

Precedence, mirroring CDI-07A §5.4 — an ordered precedence over named states, never an aggregation:

```text
OUTSIDE_DECLARED_ENVELOPE  >  WITHIN_DECLARED_ENVELOPE  >  INDETERMINATE
```

with the binding rule that **`WITHIN_DECLARED_ENVELOPE` requires positive evidence**: at least one
`LIKE_FOR_LIKE` comparison, with a declared envelope, that fell inside it, and
`completeness.complete === true`. This is the direct descendant of CDI-07A owner ruling W2 and its
`assertStableHasPositiveEvidence`, and it exists because the identical defect — absence of contrary
evidence read as confirmation — was found in CDI-07A by independent review after its own suite ran
green.

`INDETERMINATE` is returned when nothing was comparable, when observations were missing, when the
only comparable quantities had no declared envelope, or when completeness failed. It is not a middle
grade and must never be rendered on the same scale as the other two.

**`SUCCESS` and `FAILURE` are refused as vocabulary**, in the type and on every surface. A prediction
landing outside its envelope means the model was wrong about the world; it does not mean the decision
was wrong. The decision was made on declared evidence, under declared constraints, with declared
unavailable dimensions — and it may have been the right decision on that basis regardless of what the
world then did. Collapsing that into `FAILURE` is the single most damaging thing this work package
could ship, because it would make every retrospective an indictment.

### 5.6 Mandatory disclosure

Rendered wherever a comparison or a prediction error is shown, verbatim:

> This compares what was predicted against what was observed. It is evidence about the prediction,
> not a judgement of the decision. A decision made on the best declared evidence available can still
> be followed by an outcome the model did not anticipate.

---

## 6. Learning Eligibility Model

*This section answers key design questions 3 and 7.*

### 6.1 Design position

Learning is the only one of the three capabilities that can quietly cause harm later, because a
learning case is reused somewhere else, by someone who was not present for the original decision. The
eligibility gate is therefore strict, deterministic, and conjunctive.

### 6.2 `LearningCandidate` — always produced, always retained (owner ruling X4, APPROVED)

Every completed comparison produces a candidate, including one that fails eligibility, and **an
ineligible candidate is retained rather than discarded**. A candidate that fails **is** the useful
output when the failure names a fixable gap — at this baseline it is the *only* output CDI-07B can
produce (**B1**, **B6**), and discarding it would leave the estate silent about why.

```ts
export interface LearningCandidate {
  candidate_id: string;                // content-derived
  tenant_id: string;
  session_id: string;

  contract_id: string;
  contract_digest: string;
  comparison_id: string;

  /** X4 — mandatory on every candidate, eligible or not. */
  eligibility: LearningEligibility;    // §6.3 — the full conjunction, met and unmet alike
  blocked_by: string[];                // named unmet conditions, never generic
  completeness: ObservationCompleteness;  // §4.5
  provenance: EvidenceProvenance[];    // §4.4 — one per bound observation

  /** Present ONLY when eligibility.eligible === true. */
  learning_case?: LearningCase;        // §6.4

  synthetic_demo: boolean;
  schema_version: string;
  created_as_of: string;
}
```

Three constraints on a retained ineligible candidate, all binding:

1. It **never** carries a `learning_case` while ineligible (`RJ-L1`). Retention is not promotion.
2. It **never** contributes to `EnterpriseLearningPattern` confidence, occurrence counts, similarity
   or success rate — CDI-07B writes none of those in any case (**L-INV-9**, **L-INV-10**), and an
   ineligible candidate is additionally excluded from the `N` count in §6.6.
3. It is **never** registered as an `EnterpriseMemoryCase`. Memory registration requires an eligible
   `LearningCase` (§7.3).

An ineligible candidate is surfaced as what it is: evidence that was collected, the named conditions
it failed, and what would unblock it. It is never rendered as a weaker case or a partial success.

### 6.3 `LearningEligibility` — a conjunction over named conditions

```ts
export interface LearningEligibilityCondition {
  condition_id: string;
  statement: string;
  met: boolean;
  /** Required when met is false. Names the missing input, never a generic failure. */
  unmet_reason?: string;
}

export interface LearningEligibility {
  eligible: boolean;                   // conjunction — never a score, never a threshold (L-INV-8)
  conditions: LearningEligibilityCondition[];   // ALL of them, met or not
  determined_by: 'deterministic_conjunction';
}
```

The eight conditions, all of which must be met:

| Id | Condition | Basis |
| --- | --- | --- |
| **LE-1** | The contract resolves under the caller's tenant/session and `contract_digest` matches | L-INV-1, L-INV-14 |
| **LE-2** | The contract's `status` is `ACTIVE` or `SUPERSEDED` — never `WITHDRAWN` | A withdrawn decision is not a precedent |
| **LE-3** | At least one `QuantityComparison` is `LIKE_FOR_LIKE` | **L-INV-5** |
| **LE-4** | Every observation backing a `LIKE_FOR_LIKE` comparison is `AUTHORITATIVE_EXTERNAL` | **B1**, **L-INV-3** |
| **LE-5** | `ObservationCompleteness.complete === true` | §4.5 |
| **LE-6** | The contract's `evidence_strength_floor` is strictly stronger than `PLACEHOLDER_EXCLUDED` | **B6**, **L-INV-8** |
| **LE-7** | `ComparisonVerdict !== 'INDETERMINATE'` | §5.5 |
| **LE-8** | The comparison names no unresolved `adapter_capability_gap` on a compared quantity | **B11** |

**Measured position at this baseline: LE-4 fails for every observation the estate can produce**
(**B1**), and LE-6 fails on the reference contract (**B6**). CDI-07B therefore ships producing
candidates with honest `blocked_by` values, and produces its first `LearningCase` when a non-synthetic
connector and a stronger-floored contract exist. The mechanism is complete; the evidence is not, and
the artefact says which.

### 6.4 `LearningCase` — what was predicted, what occurred, why the comparison was valid

```ts
export interface LearningCase {
  learning_case_id: string;            // content-derived
  tenant_id: string;

  /** L-INV-1 — the decision this was learned from, bound by id AND digest. */
  contract_id: string;
  contract_digest: string;
  decision_basis_digest: string;
  comparison_id: string;

  /** WHAT WAS PREDICTED — transcribed from the contract snapshot. Never recomputed. */
  predicted: QuantityComparison['predicted_value'] extends never ? never : PredictedQuantityRecord[];
  /** WHAT OCCURRED — transcribed from the bound observations. */
  observed: ObservedQuantityRecord[];
  /** WHY THE COMPARISON IS VALID — the eligibility evidence, carried on the case itself. */
  validity_basis: {
    comparability: ComparabilityVerdict;           // always 'LIKE_FOR_LIKE' on a case
    grain_statement: string;                       // how the observation resolved to the grain
    quantity_basis: QuantityBasis;
    observation_authority: ObservationAuthority;   // always 'AUTHORITATIVE_EXTERNAL' on a case
    eligibility: LearningEligibility;              // the full conjunction, verbatim
  };

  /** The decision context, copied from the contract. Never re-derived. */
  comparison_invariants: ComparisonSetInvariants;  // CDI-06, imported
  selected_play_id: string;
  resolution_route: DecisionResolutionRoute;       // CDI-07A, imported

  /** WP10-D linkage. Reference only — CDI-07B writes no pattern (L-INV-10). */
  memory_case_ref?: string;                        // EnterpriseMemoryCase.memory_id
  pattern_refs: LearningPatternReference[];        // §7.2 — read-only context

  /** Boundary conditions. A case that does not say where it does NOT apply is not reusable. */
  applicability_constraints: string[];
  /** Mandatory. Names what a single case is and is not evidence of. */
  single_case_disclosure: string;

  evidence_strength_floor: EvidenceStrength;
  synthetic_demo: boolean;
  schema_version: string;
  created_as_of: string;
}
```

`validity_basis` is the field that makes a learning case safe to reuse. A case that records what was
predicted and what occurred, but not *why the comparison was valid*, is an anecdote with numbers
attached — and it is exactly the shape that gets cited three quarters later by someone who cannot
check it.

The mandatory `single_case_disclosure`, verbatim:

> This is one observed case at one grain, under one set of declared constraints. It is evidence that
> this happened once. It is not evidence of a rate, a general effect, or what will happen next time.

### 6.5 Pattern promotion — contracted and `NOT_AVAILABLE`

*This answers key design question 7.*

**B7** is decisive: `ILearningPatternRepository` has no write method, so the estate cannot create a
pattern. **B8** is corroborating: the seeded patterns already assert occurrence counts their own
citations do not support, and the shape has nowhere to record how a confidence was derived.

CDI-07B therefore **never promotes anything**, and publishes the absence:

```ts
export type LearningCapability =
  | 'LEARNING_PATTERN_PROMOTION'
  | 'OBSERVED_COUNTERFACTUAL_COMPARISON'
  | 'QUANTITATIVE_DECISION_HALF_LIFE';

/** Local structural twin, per the CDI-06 R1 / CDI-07A §8.2 precedent. Nothing upstream is widened. */
export interface LearningRequiredAuthoritativeInput {
  field: string;
  grain: string;
  why_required: string;
  inadmissible_substitutes: string[];
  enables: LearningCapability;
  status: 'AWAITING_AUTHORITATIVE_SOURCE';
}

export const PATTERN_PROMOTION_REQUIRED_INPUT: LearningRequiredAuthoritativeInput = {
  field: 'independent_eligible_learning_case_series',
  grain:
    'per situation signature, at least N independent eligible LearningCases from distinct decisions, ' +
    'distinct contracted windows and distinct authoritative observations, plus a WP10-D pattern write ' +
    'path carrying a calibration status for every published telemetry metric',
  why_required:
    'a pattern asserts that something generalises. WP10-D exposes no pattern write path, and its ' +
    'seeded telemetry already claims occurrence counts its own supporting_memory_ids do not support, ' +
    'so promoting a single case would both fabricate a rate and write into a shape with nowhere to ' +
    'record how that rate was derived',
  inadmissible_substitutes: [
    'one eligible LearningCase promoted directly to a pattern',
    'repeated observations of the same decision counted as independent occurrences',
    'an LLM or embedding similarity judgement that two situations are the same signature',
    'reusing an existing pattern_confidence as though it were calibrated',
    'an intervention_success_rate computed from a single case',
    'synthetic demonstration observations counted toward N'
  ],
  enables: 'LEARNING_PATTERN_PROMOTION',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};

export const OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT: LearningRequiredAuthoritativeInput = {
  field: 'observed_counterfactual_series',
  grain:
    'per contracted decision grain, a control or holdout cohort observed over the same window on the ' +
    'same basis, declared before execution',
  why_required:
    'the contracted headline prediction is attributable — counterfactual-differenced, excluding ' +
    'ambient drivers — while every available observation is gross. Differencing them would charge ' +
    'the campaign with ambient movement it never claimed to cause',
  inadmissible_substitutes: [
    'the gross observed delta treated as attributable',
    'subtracting a modelled ambient subtotal from a gross observation',
    'a prior period used as a counterfactual without a declared design',
    'apportioning a broader-grain observation onto the decision grain'
  ],
  enables: 'OBSERVED_COUNTERFACTUAL_COMPARISON',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
```

### 6.6 The value of `N` — owner ruling X3, APPROVED

**The contract semantic is `N > 1`, and it is frozen.** One case is never a pattern, under any
policy, in any configuration (**L-INV-10**).

The initial value is `N = 3`, and it carries three mandatory labels wherever it is published or
surfaced:

```ts
/**
 * Initial synthetic demonstration learning-policy threshold (owner ruling X3).
 * UNCALIBRATED — not fitted to any observed outcome series.
 * CONFIGURABLE FUTURE POLICY — a governance setting, not a contract semantic.
 * NOT STATISTICAL SIGNIFICANCE — it is not a power calculation, a confidence level or a sample-size
 * rule, and it must never be described, rendered or documented as one.
 * The frozen contract semantic is N > 1; only the specific value is policy.
 */
export const LEARNING_PATTERN_PROMOTION_THRESHOLD_N = 3;
export const LEARNING_PATTERN_PROMOTION_THRESHOLD_CALIBRATION: ThresholdCalibrationStatus =
  'UNCALIBRATED_LAB_DEFAULT';   // CDI-04 taxonomy, imported
export const LEARNING_PATTERN_PROMOTION_THRESHOLD_DISCLOSURE =
  'Three eligible cases is an uncalibrated demonstration policy threshold, configurable in future ' +
  'governance. It is not a statistical significance test and does not establish that a pattern ' +
  'generalises.';
```

`N = 3` must never be presented as a universal learning rule. It is the point at which CogniX will
*offer a grouping to a named human*, and it remains the case that **no automatic
`EnterpriseLearningPattern` creation is authorised**: WP10-D exposes no pattern-write contract
(**B7**) and CDI-07B must not invent one (**L-INV-10**, `RJ-L2`). Reaching `N` changes nothing
automatically — `PATTERN_PROMOTION_REQUIRED_INPUT` stays `AWAITING_AUTHORITATIVE_SOURCE` until a
write path and a calibration-carrying shape exist.

---

## 7. WP10-D Integration

### 7.1 Ownership

| Concern | Owner |
| --- | --- |
| Structured, digest-bound comparison and learning evidence | **CDI-07B** |
| Narrative organisational precedent (`EnterpriseMemoryCase`) | **WP10-D** |
| Generalised patterns (`EnterpriseLearningPattern`) | **WP10-D**, read-only to CDI-07B |

**No parallel learning store is created.** CDI-07B holds `CampaignPreMortem` and `LearningCandidate`
in a tenant/session-indexed store following `IDecisionContractStore` exactly — create and
tenant-scoped reads only, no update method — and registers precedents through WP10-D's existing
`registerMemoryCase`.

### 7.2 `LearningPatternReference` — read-only, and never evidence

```ts
export interface LearningPatternReference {
  pattern_id: string;                  // EnterpriseLearningPattern.pattern_id
  pattern_name: string;
  pattern_scope: PatternScope;         // WP10-D, imported
  /** Why this pattern was surfaced next to this case. Never a similarity score. */
  relevance_basis: string;
  /**
   * B8 — mandatory. WP10-D telemetry is uncalibrated demonstration data and is displayed as
   * context, never as evidence strength or eligibility input (L-INV-9).
   */
  telemetry_disclosure: string;
  source_classification: string;       // copied verbatim from the pattern
  synthetic_demo: boolean;
}
```

CDI-07B copies **no** WP10-D telemetry number onto its own artefacts. It references the pattern; a
reader who opens the pattern sees its own numbers with its own `source_classification`.

The mandatory `telemetry_disclosure`, verbatim:

> This pattern's occurrence, similarity, confidence and success-rate figures are uncalibrated
> demonstration telemetry published by the learning service. They did not contribute to this case's
> eligibility and are shown as context only.

### 7.3 Memory registration

When and only when a `LearningCase` exists, CDI-07B may register one `EnterpriseMemoryCase` through
the existing repository, populating the narrative fields from the structured case and pointing back
by reference.

| `EnterpriseMemoryCase` field | Source |
| --- | --- |
| `expected_outcome` | Rendered from `LearningCase.predicted` — the transcribed contract snapshot |
| `actual_outcome` | Rendered from `LearningCase.observed` |
| `decision_taken` | `selected_play_id` and `resolution_route` from the contract |
| `signal_refs` | The bound `OutcomeObservation.signal_id` values |
| `decision_contract_ref` | `contract_id` — owner ruling **X2, APPROVED** (§13.1) |
| `provenance.decision_contract_digest` | `contract_digest`, so the pair stays verifiable (§7.4) |
| `synthetic_demo` / `provenance.is_synthetic_demo` | Propagated from the observations, never overridden |

`pattern_id` on the registered memory case is populated **only** when an existing pattern was
referenced. CDI-07B never mints one.

### 7.4 What `decision_contract_ref` is, and what it is not — owner ruling X2

`decision_contract_ref?: string` is added to `EnterpriseMemoryCase` as **provenance and reference
only**, mirroring the existing `commercial_intent_ref` precedent exactly. It is a plain string
carrying `contract_id`.

**No `DecisionContract` content crosses into WP10-D.** Prohibited on the memory case without
exception: basis snapshots, outcome or decomposition values, `contribution_delta_gbp`,
`attributable_uplift_pp` or any other economic quantity, `assumptions`, `triggers`, validity state,
`decision_basis_digest` as a substitute for the id, rejected alternatives, Scenario 0 records, and
constraint sets. This is the direct analogue of CDI-07A owner ruling W1, under which WP10-C stores a
plain reference and no contract content of any kind.

**Traceability is preserved on the CDI-07B side, not by enriching the memory case.** The authoritative
digest-bound record is the `LearningCase`, which carries `contract_id`, `contract_digest` and
`decision_basis_digest`. The memory case carries `contract_id` as its reference and
`contract_digest` inside its existing untyped `provenance` map, so a reader holding a memory case can
verify the pair without WP10-D acquiring a typed contract-shaped field. Learning evidence therefore
remains traceable to `contract_id` **and** `contract_digest` at every hop, and the free-text
`expected_outcome` / `actual_outcome` narrative remains WP10-D's own (**B9**).

A memory case whose `decision_contract_ref` resolves to a contract whose `contract_digest` does not
match the recorded one is a **fail-closed rejection on read**, never a warning — the CDI-07A `RJ-C4`
pattern applied at the learning boundary.

---

## 8. ESF-3 Integration and Attribution Semantics

*This section answers key design question 2.*

### 8.1 Design position

CDI-07A already settled the attribution taxonomy for *signals*: `SCENARIO_DRIVEN`, `WORLD_DRIVEN`,
`ATTRIBUTION_UNAVAILABLE`, with `SCENARIO_DRIVEN` capped at `WATCH` because ESF-1/ESF-2 movement is
computed deterministically from Shared Decision State. CDI-07B reuses that taxonomy for *outcomes*
rather than declaring a second one.

### 8.2 `OutcomeAttribution`

```ts
export interface OutcomeAttribution {
  /** CDI-07A taxonomy, imported. Not redeclared. */
  attribution: SignalMovementAttribution;
  /** Why the classification is what it is, in the reader's terms. */
  statement: string;
  /** Populated for SCENARIO_DRIVEN and ATTRIBUTION_UNAVAILABLE. Verbatim from CDI-07A constants. */
  disclosure?: string;
  /** The versions compared, so a reader can check the classification themselves. */
  contracted_decision_state_version?: number;
  observed_decision_state_version?: number;
}
```

Classification rules, deterministic:

| Condition | Attribution |
| --- | --- |
| Observation lineage is ESF-3, **non-synthetic**, and `source_type` ∈ `OBSERVATION_INDEPENDENT_SOURCE_TYPES` | `WORLD_DRIVEN` |
| Observation derives from ESF-1/ESF-2 simulation, or `decision_state_version` changed between contract and observation | `SCENARIO_DRIVEN` |
| Lineage unresolvable at either end, **or** any `synthetic_demo` lineage whatever its connector category or source type | `ATTRIBUTION_UNAVAILABLE` |

The third row is the one that matters at this baseline and it is binding under owner ruling **X1**. A
synthetic ESF-3 feed has external *shape* and no external *content*, so it is
`ATTRIBUTION_UNAVAILABLE` — never `WORLD_DRIVEN`. Shape is not provenance, and the synthetic test is
evaluated before and independently of the source-type test so that no admissible `source_type` can
ever rescue a synthetic observation.

A `SCENARIO_DRIVEN` outcome may never produce a `PredictionError`. Comparing a prediction against an
observation our own parameters generated measures the simulator, not the world; the comparability
verdict is `OBSERVATION_NOT_AUTHORITATIVE`.

### 8.3 `OBSERVATION_INDEPENDENT_SOURCE_TYPES` — resolving B2

**B2** measured the seam: CDI-07A's `WORLD_DRIVEN_ADMISSIBLE_SOURCE_TYPE` is the single literal
`'EXTERNAL_CONNECTOR'`, but ESF-3 maps `PLANNING → PLANNING_SYSTEM`,
`COMMERCE → COMMERCE_TELEMETRY` and `OPERATIONAL_TELEMETRY → FULFILMENT_SYSTEM`. Three genuinely
external categories would be refused world attribution.

CDI-07B declares the authoritative set, derived from the ESF-3 category mapping rather than restated:

```ts
/** Every SignalSourceType reachable from an ESF-3 connector category — the set of provenances
 *  that are independent of Shared Decision State. Derived from mapCategoryToSourceType so the two
 *  cannot drift apart. */
export const OBSERVATION_INDEPENDENT_SOURCE_TYPES: readonly SignalSourceType[] = [
  'EXTERNAL_CONNECTOR',
  'PLANNING_SYSTEM',
  'COMMERCE_TELEMETRY',
  'FULFILMENT_SYSTEM'
];
```

**Authorised upstream touch — owner ruling X1, APPROVED and binding (§13.1).** At CDI-07B
implementation, and **not in the design-gate commit**, CDI-07A's world-attribution check consumes this
set in place of the single literal. That correction is:

- a widening of one exported **constant / predicate** inside `campaign-decision-contract-model.ts`;
- **not** a change to any frozen type, union, interface or validator;
- **not** a widening of `CanonicalSignalType`, and **not** a parallel taxonomy — CDI-07B declares no
  second attribution vocabulary and imports `SignalMovementAttribution` from CDI-07A;
- strictly permissive over provenance only — it admits canonical ESF-3 external source types,
  including the planning, commerce and operational-telemetry source types, and continues to refuse
  ESF-1/ESF-2 re-simulation and Shared-Decision-State-derived movement.

**Synthetic provenance can never establish `WORLD_DRIVEN` evidence (X1, binding).** A synthetic ESF-3
observation is `ATTRIBUTION_UNAVAILABLE` **regardless of its external connector shape or its
`source_type`**. The admissible-source set is a necessary condition, never a sufficient one:
`synthetic_demo === false` is evaluated first and independently, and no combination of connector
category, source type or adapter version overrides it. External shape is not external content
(§8.2, **B1**).

Permanent regressions: an ESF-3 `PLANNING` observation that is non-synthetic is admissible for
`WORLD_DRIVEN`; the same observation with `synthetic_demo: true` is `ATTRIBUTION_UNAVAILABLE`; an
ESF-1 simulated observation is `SCENARIO_DRIVEN` (AC-31, AC-30, AC-32). The capability is narrower and nothing becomes untruthful.

### 8.4 What CDI-07B does not add to ESF

`CanonicalSignalType` is **not** widened. `ExternalSignalCategory` is **not** widened. No connector is
added, no adapter is written, and `ESF-4` / `ESF-5` are untouched. The three reserved signal types
CDI-07A declined (`RECOMMENDATION_HALF_LIFE_DECAY`, `ASSUMPTION_SENSITIVITY_BREACH`,
`SIGNAL_VOLATILITY_SURGE`) remain declined, for the reasons CDI-07A gave.

---

## 9. Decision Half-Life Evidence Ruling

*This section answers key design question 8, and it is a refusal.*

### 9.1 The ruling

> **CDI-07B does not produce a quantitative Decision Half-Life, and nothing in CDI-07B's design
> supplies the evidence that would justify one. `QUANTITATIVE_DECISION_HALF_LIFE` remains
> `AWAITING_AUTHORITATIVE_SOURCE`, unchanged from CDI-07A §5.5.**

### 9.2 Why CDI-07B does not supply it

CDI-07A §5.2 named three requirements for any duration claim. CDI-07B changes the position on exactly
one of them, and not enough.

| Requirement | CDI-07A position | CDI-07B position | Sufficient? |
| --- | --- | --- | --- |
| Observed decision-outcome history | Did not exist — prediction-vs-reality was out of scope | **Mechanism now exists**, but every observation the estate can produce is `SYNTHETIC_DEMONSTRATION` (**B1**), and eligibility measured at this baseline yields zero `LearningCase`s | **No** |
| Calibrated assumption-decay model | Did not exist; every CDI-04 threshold `UNCALIBRATED_LAB_DEFAULT` | Unchanged. CDI-07B calibrates nothing and adds no threshold | **No** |
| Independent wall-clock observation stream | Did not exist | ESF-3 envelopes carry a genuine `observed_at`, so the *stream shape* now exists — but its content is synthetic | **No** |

There is a fourth objection, and it survives even if all three rows were satisfied.
`QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT` declares its grain as *"per resolved decision, per assumption,
with the observed instant at which the assumption ceased to hold"*. CDI-07B observes **outcomes**, not
**assumptions ceasing to hold**. A campaign's observed uplift landing outside its envelope does not
tell you when the ambient-frame assumption stopped being true, or when a readiness condition lapsed.

So even a fully populated, non-synthetic Prediction-vs-Reality corpus would give the wrong quantity
at the wrong grain. Fitting a decay curve to it would produce a number with a referent nobody asked
for, rendered with a precision nobody has.

### 9.3 What would actually justify it

Stated so a future work package can aim at it rather than rediscover the problem:

1. Non-synthetic ESF-3 connectors, so observations are `AUTHORITATIVE_EXTERNAL` at all.
2. A per-assumption observation design — instrumenting *when a named contracted assumption ceased to
   hold*, not merely what the outcome was. This is a different observation than CDI-07B collects and
   would be a new work package.
3. Enough independent decisions at a comparable grain for a rate to mean anything, with the same
   independence requirement as `PATTERN_PROMOTION_REQUIRED_INPUT`.
4. A calibration status on any published figure, which neither CDI-04 thresholds nor WP10-D telemetry
   currently carry.

Until all four hold, the answer stays a validity state.

### 9.4 Prohibited vocabulary, inherited and extended

`validateCampaignPreMortem`, `validatePredictionOutcomeComparison` and `validateLearningCase` reject
any payload key matching CDI-07A's §5.7 set, plus the CDI-07B additions:

```text
/half_life_hours|remaining_hours|hours_remaining|valid_until|valid_for|expires|expiry|ttl|
 countdown|decay_rate|decay_curve|validity_pct|validity_score|percent_remaining|age_hours|
 elapsed|time_to_live|
 likelihood|probability|p_fail|impact_score|severity_score|risk_score|risk_rating|expected_loss|
 accuracy_pct|error_pct|hit_rate|success_rate|mape|grade|scorecard/i
```

and the CDI-07A string-value scan is inherited unchanged, because a key scan alone is defeated by a
`headline` field.

`success_rate` is on the list deliberately: WP10-D publishes `intervention_success_rate` and CDI-07B
must never compute or copy one (**L-INV-9**, **L-INV-10**).

---

## 10. Deterministic vs ML-Assisted Boundary

*This section answers key design question 9.*

### 10.1 Deterministic — all of it, at this work package

| Capability | Determinism |
| --- | --- |
| Failure mode enumeration | Pure function of contract, CDI-04 readiness, CDI-06 eliminations, CDI-07A assumptions, WP10-C derived impacts |
| Consequence ordering | Mapping onto WP10-C's published ordering; no traversal, no inference |
| Observation authority | Seven-condition conjunction over ESF-3 lineage (§4.3) |
| Comparability | Six-test ordered gate (§5.4) |
| Prediction error | Subtraction in a shared unit, only after `LIKE_FOR_LIKE` |
| Comparison verdict | Ordered precedence over three named states |
| Attribution | Deterministic classification over lineage and `decision_state_version` |
| Learning eligibility | Eight-condition conjunction (§6.3) |
| Memory registration | Transcription from the structured case |

**No LLM decides truth, outcome correctness, eligibility, comparability, authority or pattern
confidence.** A narrative layer may receive an already-computed, already-validated artefact and
produce prose about it, labelled non-authoritative and rendered separately. Acceptance test: outputs
computed with the narrative layer disabled are byte-identical to those computed with it enabled —
the CDI-07A §9.4 test, applied unchanged.

### 10.2 Legitimate future ML-assist points, and their preconditions

| Candidate | Precondition | What it may never do |
| --- | --- | --- |
| **Situation-signature clustering** — proposing that N eligible cases share a signature | `PATTERN_PROMOTION_REQUIRED_INPUT` satisfied; ≥ N independent eligible cases | Decide eligibility, decide that two situations *are* the same, or set a confidence. It proposes a grouping for a named human to accept |
| **Failure-mode recall** — surfacing modes seen in comparable past decisions | ≥ N eligible cases with authoritative observations | Invent a mode with no declared evidence, or attach a likelihood to one |
| **Observation-to-grain matching** — proposing which observation corresponds to a decision grain | An audit path showing the proposed mapping | Perform the mapping silently. §5.4.1's grain test stays deterministic and remains the gate |

The rule in one line: **ML may propose candidates for a human to accept; it may never operate the
eligibility gate.** Deterministic evidence eligibility is established first, always.

---

## 11. API and Experience Boundaries

### 11.1 API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/v1/campaigns/decision-contract/[id]/pre-mortem` | Create a pre-mortem for a contract. Orchestration only |
| `GET` | `/api/v1/campaigns/decision-contract/[id]/pre-mortem` | Fetch the ACTIVE pre-mortem, tenant-scoped |
| `POST` | `/api/v1/campaigns/decision-contract/[id]/prediction-comparison` | Compare at a caller-supplied `as_of` against supplied observations. Never written back |
| `POST` | `/api/v1/campaigns/decision-contract/[id]/learning-candidate` | Produce a candidate; create a case only when eligible |
| `GET` | `/api/v1/campaigns/learning-candidates` | Tenant/session-scoped candidate list |

Every route is nested under the contract, because every CDI-07B artefact is meaningless without one.
**No `PATCH` exists on any route and none may be added.** The planning report's
`POST /api/v1/campaigns/pre-mortem` (row 13) is reconciled to the nested path after implementation,
per the CDI-05 §8.2 precedent.

Named rejections, following the CDI-07A `RJ-C*` pattern:

| Id | Cause |
| --- | --- |
| `RJ-P1` | Contract not found under the caller's tenant/session |
| `RJ-P2` | `contract_digest` mismatch |
| `RJ-P3` | Contract is `WITHDRAWN` — no pre-mortem, no learning case |
| `RJ-P4` | A second- or third-order failure mode with no `follows_from_failure_mode_id` |
| `RJ-P5` | Invented risk precision detected in a pre-mortem payload |
| `RJ-R1` | `as_of` absent |
| `RJ-R2` | An observation failed ESF-3 lineage resolution |
| `RJ-R3` | A `PredictionError` present on a non-`LIKE_FOR_LIKE` comparison |
| `RJ-R4` | `SUCCESS` / `FAILURE` verdict vocabulary detected |
| `RJ-L1` | A `LearningCase` present on an ineligible candidate |
| `RJ-L2` | Pattern write attempted |
| `RJ-L3` | Duration, countdown or prohibited-scalar vocabulary detected |

### 11.2 Storage

`lib/pre-mortem-store.ts` and `lib/learning-candidate-store.ts`, tenant/session-indexed and in-memory,
built on `IPreMortemStore` / `ILearningCandidateStore` abstractions following `IDecisionContractStore`
exactly — `create`, `markSuperseded` and tenant-scoped reads only, **no update method**, with the
stored copy deep-frozen. The container-restart limitation is documented as a demonstration
limitation, disclosed and not disguised.

`PredictionOutcomeComparison` is **not stored**. It is a computation over caller-supplied
observations, exactly as a CDI-07A validity assessment is.

### 11.3 Experience boundaries

**Pre-Mortem surface.** Failure modes grouped by `consequence_order`, each with its grounding, its
source path and its resilience evidence or an explicit *no known mitigation*. **No risk matrix, no
heat map, no severity colour ramp, no likelihood axis, no sorted-by-risk list** — CDI-07B publishes no
quantity that could order such a list, and a visualisation that implies one is a fabrication in a
different medium.

**Prediction vs Reality surface.** Predicted and observed side by side, with the comparability verdict
**shown before the numbers**, so an `INDETERMINATE` or `GRAIN_MISMATCH` is read first rather than
discovered later. Incomparable quantities are displayed as incomparable, never omitted — omission
would leave a screen of successful comparisons. The §5.6 disclosure is mandatory. Synthetic
observations carry a persistent visible marker at every tier (**L-INV-3**).

**Learning surface.** The eligibility conjunction is shown in full, met and unmet conditions alike. A
blocked candidate shows what would unblock it. `PATTERN_PROMOTION_REQUIRED_INPUT` is published so the
absent capability is visible rather than merely absent.

**Prohibited across all three surfaces**: any countdown, clock, timer, expiry, decay animation or
remaining-time rendering; the words `optimal`, `best`, `recommended`, `winner`, `ideal`, `success`,
`failure`, `accurate`, `inaccurate` as verdicts; any ranking of failure modes, decisions or plays; any
control that edits, withdraws or supersedes a contract from a CDI-07B surface.

### 11.4 Upstream touches

| Package | Touch | Authority |
| --- | --- | --- |
| `CDI-07A` | Widen the world-attribution predicate to consume `OBSERVATION_INDEPENDENT_SOURCE_TYPES` | Owner ruling **X1, APPROVED** (§13.1). Predicate/constant only — no frozen type, union, interface or validator changes, and no `CanonicalSignalType` widening |
| `WP10-D` | Add `decision_contract_ref?: string` to `EnterpriseMemoryCase` | Owner ruling **X2, APPROVED** (§13.1). Additive, optional, reference-only, mirroring `commercial_intent_ref` |
| `CDI-01`–`CDI-06` | **None** | No blocker found |
| `ESF-1`/`ESF-2`/`ESF-3` | **None** | No union widened, no connector added, no parallel taxonomy |
| `WP10-C` | **None** | `calculateDerivedImpacts` is read, never extended |

**Both touches are made at CDI-07B implementation, not in the design-gate commit.** This gate is
documentation only and changes no runtime code.

---

## 12. Adversarial Acceptance Criteria

Each is written as an attack. The implementation passes only when the attack fails.

**Binding and immutability**

1. Create each of the three artefacts, then mutate the source contract object and re-read. Assert every
   artefact is byte-identical and that the contract store is unchanged.
2. Supply a `contract_digest` that disagrees with the resolved contract. Assert `RJ-P2` and that no
   partial artefact is emitted.
3. Attempt every mutation path on a stored pre-mortem: field write, nested `failure_modes` write,
   store update, `PATCH` route. Assert absence of the method and a byte-identical stored artefact
   afterwards. *(CDI-07A RV-7 regression, applied to CDI-07B.)*
4. Run a pre-mortem, a comparison and a learning candidate against a contract. Assert the contract's
   `status`, `basis`, `assumptions`, `triggers` and validity are untouched, and that nothing
   superseded or withdrew it.
5. Create an artefact against a `WITHDRAWN` contract. Assert `RJ-P3`.
6. Assert every artefact carries both `contract_id` and `contract_digest`, and that no code path
   resolves a contract through the digest instead of the id. *(CDI-07A AC-55 pattern.)*

**Pre-Mortem**

7. Serialise every pre-mortem payload. Assert no key or string value matches the §9.4 invented-risk
   pattern, including unused fields.
8. Assert no pre-mortem names an alternative play, a different depth, a different window, or proposes
   any change to the contract. Assert `assertPreMortemProposesNoAlternative` passes.
9. Emit a `SECOND_ORDER` failure mode with no `follows_from_failure_mode_id`. Assert `RJ-P4`.
10. Assert every failure mode citing a `derived_impact_ref` carries `grounding: 'STRUCTURAL'` and the
    §3.4 scope disclosure verbatim.
11. Assert every failure mode's `contracted_value` is transcribed exactly from its
    `source_field_path`, with no rounding, unit conversion or aggregation. *(CDI-07A C-INV-4 pattern.)*
12. Assert a failure mode with no mitigation publishes `no_known_mitigation: true` rather than an
    empty resilience list.
13. Assert no ordering, sorting or grouping of failure modes depends on any quantity — only on
    `consequence_order` and declaration order.

**Observation authority**

14. Supply an observation from a `synthetic_demo` connector. Assert `SYNTHETIC_DEMONSTRATION`, that it
    never reaches `AUTHORITATIVE_EXTERNAL`, and that the disclosure is present at every tier.
15. Supply an observation whose confidence and quality were adapter-defaulted. Assert
    `metrics_supplied: false` and that authority is not granted on their basis. *(**B5** regression.)*
16. Supply an observation with `observed_at` before the contracted `planned_start`. Assert it is
    excluded and the reason named.
17. Supply an observation whose `connector_id` does not resolve in the ESF-3 registry. Assert
    `UNATTRIBUTED`, never a plausibility upgrade.
18. Assert no raw provider payload body ever appears on an `OutcomeObservation`; only
    `provider_payload_ref`.
19. Assert every one of the seven §4.3 conditions is individually load-bearing — negate each in turn
    and assert `AUTHORITATIVE_EXTERNAL` is refused in all seven cases.

**Prediction vs Reality**

20. Compare `attributable_uplift_pp` against an ESF-3 gross `delta_pct`. Assert
    `QUANTITY_BASIS_MISMATCH` or `NO_OBSERVED_COUNTERFACTUAL`, and that **no error value is
    computed**. *(**B4** regression — the defining test of this work package.)*
21. Supply a `CATEGORY`-grain observation against a `category × region × sku × segment` decision.
    Assert `GRAIN_MISMATCH` and that no apportionment occurred. *(**B3** regression.)*
22. Supply no observation for a contracted quantity. Assert `OBSERVATION_ABSENT`, that no error is
    zero, and that the verdict is not `WITHIN_DECLARED_ENVELOPE`. *(**L-INV-6**.)*
23. Construct a comparison where every quantity is incomparable. Assert `INDETERMINATE`, and
    specifically **not** `WITHIN_DECLARED_ENVELOPE`. *(CDI-07A AC-61 pattern — the fabricated-STABLE
    defect, transplanted.)*
24. Construct a comparison where one quantity is `LIKE_FOR_LIKE` and inside its envelope but
    `completeness.complete` is false. Assert the verdict is **not** `WITHIN_DECLARED_ENVELOPE`.
25. Assert `PredictionError` is present on `LIKE_FOR_LIKE` comparisons and absent on every other
    verdict. Attempt to attach one manually and assert `RJ-R3`.
26. Serialise every comparison payload and assert no `SUCCESS`, `FAILURE`, accuracy, error-percentage,
    hit-rate or grade key or string value appears. Assert `RJ-R4` on injection.
27. Run the same comparison twice with the same `as_of` and the same observations. Assert
    byte-identical output, and that no `Date.now()` or argless `new Date()` participates.
28. Assert a comparison never writes to the contract store, the pre-mortem store or the candidate
    store.
29. Assert the §5.6 disclosure is present on every comparison, verbatim.

**Attribution**

30. Supply a synthetic ESF-3 observation. Assert `ATTRIBUTION_UNAVAILABLE`, never `WORLD_DRIVEN`.
    *(**B1** regression — shape is not provenance.)*
31. Supply an ESF-3 `PLANNING` observation, non-synthetic. Assert it is admissible for `WORLD_DRIVEN`
    under `OBSERVATION_INDEPENDENT_SOURCE_TYPES`. *(**B2** regression.)*
32. Supply an ESF-1/ESF-2 simulated observation. Assert `SCENARIO_DRIVEN` and that no
    `PredictionError` is produced.
33. Assert `OBSERVATION_INDEPENDENT_SOURCE_TYPES` covers exactly the image of
    `mapCategoryToSourceType` over `EXTERNAL_SIGNAL_CATEGORIES`, so the two cannot drift apart.

**Learning**

34. Construct a candidate failing each of LE-1…LE-8 in turn. Assert `eligible: false` in all eight
    cases, that no `LearningCase` is produced, and that `blocked_by` names the specific condition.
35. Assert `eligibility.conditions` publishes **all** eight conditions on every candidate, met and
    unmet alike — never a filtered set.
36. Attach a `LearningCase` to an ineligible candidate. Assert `RJ-L1`.
37. Attempt to write an `EnterpriseLearningPattern` by any path. Assert `RJ-L2` and that the WP10-D
    pattern repository exposes no write method. *(**B7** regression.)*
38. Assert no CDI-07B artefact copies `pattern_confidence`, `situation_similarity`,
    `historical_occurrences` or `intervention_success_rate` onto itself, and that none participates in
    eligibility. *(**B8**, **L-INV-9**.)*
39. Produce one eligible case. Assert no pattern is created, no rate is computed, and
    `single_case_disclosure` is present verbatim. *(**L-INV-10**.)*
40. Assert every `LearningCase` carries a complete `validity_basis` — comparability, grain statement,
    quantity basis, observation authority and the full eligibility conjunction.
41. Assert `PATTERN_PROMOTION_REQUIRED_INPUT` and `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` are
    published on every candidate and comparison, with all inadmissible substitutes present.
42. Register a memory case from an eligible learning case. Assert `synthetic_demo` propagates
    unmodified, that `pattern_id` is populated only when an existing pattern was referenced, and that
    no CDI-07B artefact was mutated.
43. Assert a `LearningCase` names `applicability_constraints` and that an empty list is a rejection.

**Half-Life, isolation and narrative**

44. Serialise every CDI-07B payload and assert no key or string value matches the §9.4 duration
    pattern. Set a headline to `"Valid (Est. 36h remaining)"` and assert the **value** scan rejects it.
45. Assert `QUANTITATIVE_DECISION_HALF_LIFE` remains `AWAITING_AUTHORITATIVE_SOURCE` and that no
    CDI-07B path produces a duration, decay rate or expiry.
46. Assert no code path differences `created_as_of`, `as_of`, `observed_at` or any two instants to
    produce a displayed number.
47. Read every artefact under a foreign tenant. Assert **not found**, not forbidden, and that no field
    leaks in the error.
48. Run a comparison where an observation belongs to another session. Assert it is excluded and the
    caller's own is not silently substituted.
49. Disable the narrative layer. Assert all three artefacts are byte-identical to the enabled run.
50. Re-run the CDI-01…CDI-07A suites unchanged. Assert 21, 36, 31, 49, 70, 93, 155 all green, and that
    the CDI-07A `RV-1`…`RV-8` reconciliation regressions still hold.

**Owner rulings X1–X4**

51. *(X2)* Register a memory case from an eligible learning case. Assert `decision_contract_ref`
    carries `contract_id` and that **no** contract content appears anywhere on the memory case — no
    basis snapshot, no economic quantity, no assumption, no trigger, no validity state, no rejected
    alternative, no constraint set. Assert `contract_digest` is retained in `provenance` and that a
    digest mismatch on read is a fail-closed rejection.
52. *(X3)* Assert `LEARNING_PATTERN_PROMOTION_THRESHOLD_N` is published only alongside its three
    labels — uncalibrated, configurable future policy, not statistical significance — and its
    `ThresholdCalibrationStatus`. Assert no payload or surface describes it as significance, a
    confidence level or a sample-size rule.
53. *(X3)* Accumulate `N` eligible cases. Assert **no** pattern is created, no pattern write is
    attempted, `PATTERN_PROMOTION_REQUIRED_INPUT` remains `AWAITING_AUTHORITATIVE_SOURCE`, and that
    reaching `N` changes nothing automatically.
54. *(X4)* Produce an ineligible candidate. Assert it is retained with all four mandatory fields, that
    it carries no `learning_case`, that it is excluded from the `N` count, that it is never registered
    as a memory case, and that it contributes nothing to any pattern telemetry field.
55. *(X1)* Assert the synthetic test is evaluated before and independently of the source-type test:
    negate `synthetic_demo` alone across every ESF-3 category and every admissible `source_type`, and
    assert `WORLD_DRIVEN` is refused in every case.

---

## 13. Owner Rulings and Unresolved Decisions

### 13.1 Closed — approved 2026-08-15, binding and not reopenable at implementation

**X1 — CDI-07A world-driven source admissibility. APPROVED.**

> Correct CDI-07A world-driven source admissibility so canonical ESF-3 external source types are
> recognised, including the relevant planning, commerce and operational telemetry source types. This
> is a predicate/constant correction only. Do not widen `CanonicalSignalType` or create a parallel
> taxonomy. Synthetic ESF-3 observations remain `ATTRIBUTION_UNAVAILABLE` regardless of their external
> connector shape. Synthetic provenance can never establish `WORLD_DRIVEN` evidence.

Landed as §8.3, with the synthetic test evaluated before and independently of the source-type test so
no admissible `source_type` can rescue a synthetic observation, and enforced by AC-30, AC-31, AC-32
and AC-33. The correction is made at **CDI-07B implementation**, not in this design-gate commit.

**X2 — `EnterpriseMemoryCase` contract linkage. APPROVED.**

> Add optional `decision_contract_ref?: string` to `EnterpriseMemoryCase`. It is provenance/reference
> only. Do not copy `DecisionContract` content, economics, assumptions or validity into the memory
> case. Learning evidence must remain traceable to `contract_id` + `contract_digest`.

Landed as §7.4, with the prohibited-content list explicit, the digest retained in the memory case's
existing untyped `provenance` map so the pair stays verifiable, and the authoritative digest-bound
record kept on the `LearningCase`. Enforced by AC-42 and AC-51. This mirrors CDI-07A owner ruling W1,
under which WP10-C stores a plain reference and no contract content of any kind.

**X3 — Pattern promotion threshold. APPROVED.**

> The contract semantic remains `N > 1`. Use `N = 3` as the initial synthetic demonstration
> learning-policy threshold only, explicitly labelled uncalibrated, configurable future policy, and
> not statistical significance. Do not present `N = 3` as a universal learning rule. No automatic
> `LearningPattern` creation is authorised. WP10-D has no pattern-write contract and CDI-07B must not
> invent one.

Landed as §6.6 with all three labels mandatory on publication and a `ThresholdCalibrationStatus` of
`UNCALIBRATED_LAB_DEFAULT` imported from CDI-04. Reaching `N` triggers nothing automatically.
Enforced by AC-39, AC-52 and AC-53.

**X4 — Ineligible candidate retention. APPROVED.**

> Retain ineligible `LearningCandidate`s with eligibility result, `blocked_by`, evidence completeness
> and provenance. They must not become `LearningCase`s while ineligible and must not influence
> `LearningPattern` confidence.

Landed as §6.2, with all four fields mandatory on every candidate and three binding constraints: no
`learning_case` while ineligible, no contribution to pattern telemetry or the `N` count, and no
memory registration. Enforced by AC-34, AC-35, AC-36 and AC-54.

### 13.1.1 Core refusals reaffirmed as binding

No `SUCCESS` / `FAILURE` decision verdict (§5.5). Prediction error describes model and outcome
divergence, never whether the decision was good or bad (**L-INV-11**, §5.6). No attributable
prediction compared against a gross observation (**B4**, §5.4). Where quantity basis or grain does not
match, the comparison is unavailable or indeterminate **with the missing authoritative capability
named** (§5.4, §6.5). No apportionment to manufacture a matching grain (§5.4.1). No quantitative
Decision Half-Life duration from CDI-07B evidence (§9). No new Ripple engine (§3.5). No automatic
pattern promotion (§6.5, §6.6).

### 13.2 Open questions carried forward, non-blocking

- **Y1 — Observed counterfactual design.** `OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT` names what is
  needed; designing a holdout or control cohort is a separate work package, not a CDI-07B deliverable.
- **Y2 — Per-assumption observation.** §9.3 item 2 — instrumenting when a named contracted assumption
  ceased to hold. This, not CDI-07B, is the real precursor to a quantitative Half-Life.
- **Y3 — Non-synthetic connector procurement.** Everything downstream of **B1** is gated on it. This
  is a commercial and integration question, not a design one.
- **Y4 — WP10-D telemetry calibration.** **B8** measured that patterns publish figures their own
  citations do not support. Out of CDI-07B scope, but it will block pattern promotion when X3 is taken
  up.

### 13.3 No blocker found

No CDI-01 through CDI-07A contract requires modification. The four candidates for a blocker were each
resolved inside CDI-07B:

- The attributable-vs-gross basis mismatch (**B4**) — resolved by refusing the comparison and
  contracting the unlock, not by redefining a CDI-02 quantity.
- The grain mismatch (**B3**) — resolved by a deterministic grain test that fails closed, not by
  apportionment and not by widening `SignalEntityType`.
- WP10-D's missing pattern write path (**B7**) — resolved by declining to promote, which is the
  correct behaviour independently of the missing method.
- CDI-07A's narrow world-attribution predicate (**B2**) — resolved by a constant widening inside
  CDI-07A's own file, with a documented fallback if the owner declines.

---

## 14. Contract-Freeze Verdict

**DESIGN FROZEN. CONTRACT FROZEN. APPROVED. IMPLEMENTATION-READY.**

**All four owner rulings are closed and approved (§13.1).** X1 corrects CDI-07A world-driven source
admissibility as a predicate change only, with synthetic provenance permanently barred from
establishing `WORLD_DRIVEN` evidence. X2 adds a reference-only `decision_contract_ref` to
`EnterpriseMemoryCase` with no contract content crossing the boundary. X3 fixes the contract semantic
at `N > 1` with `N = 3` as a labelled uncalibrated demonstration policy and no automatic pattern
creation. X4 retains ineligible candidates with their eligibility result, `blocked_by`, completeness
and provenance. The freeze is **no longer conditional**. Y1–Y4 remain open and non-blocking.

- The three domain models (§3, §5, §6), observation authority (§4), WP10-D integration (§7), ESF-3
  and attribution semantics (§8), the Half-Life ruling (§9), the deterministic/ML boundary (§10) and
  the API and experience boundaries (§11) are frozen and implementable as written.
- **The acceptance suite is 55 criteria**, each written as an attack. AC-20 and AC-21 are the two that
  matter most: they are the basis mismatch and the grain mismatch, and they are the tests that stop
  CDI-07B from producing a confident wrong number. AC-51 to AC-55 make the four owner rulings
  permanent regressions.
- **The single most important design decision is a refusal.** The estate's headline predicted quantity
  is attributable and its only observable is gross (**B4**). CDI-07B refuses to difference them,
  implements the gross path that *is* like-for-like, and publishes what it would need for the rest.
- **The second most important is also a refusal.** `SUCCESS` and `FAILURE` do not exist in this
  contract. A prediction diverging is evidence about a model, not a verdict on a decision, and a
  retrospective that conflates the two teaches an organisation to stop recording its reasoning.
- **The risk profile is distinct and worth naming.** CDI-07A's failure mode was misleading
  reassurance. CDI-07B's is **misleading hindsight** — a retrospective that looks rigorous, is
  arithmetically wrong about what it compared, and is believed precisely because it arrives after the
  fact with numbers attached. An independent adversarial review pass before commit is mandatory, as it
  was for CDI-02 through CDI-07A, each of which shipped defects found by review rather than by their
  own delivered suites. CDI-07A shipped eight, including a fabricated `STABLE` reachable on every
  contract it produced.
- The review must probe, in this order: (1) any error value computed on a non-`LIKE_FOR_LIKE`
  comparison; (2) any apportionment of a broad observation onto a narrow grain; (3) any synthetic
  observation presented as real, or any path where an admissible `source_type` rescues a synthetic
  observation into `WORLD_DRIVEN`; (4) any path where a missing observation reads as the prediction
  having held; (5) any `WITHIN_DECLARED_ENVELOPE` without positive evidence; (6) any pattern write or
  rate computed from one case, and any path where reaching `N` promotes automatically; (7) any WP10-D
  telemetry entering eligibility, and any contract content crossing into `EnterpriseMemoryCase`;
  (8) any pre-mortem quantity that could order a risk list; (9) any duration or `SUCCESS`/`FAILURE`
  vocabulary; (10) any write to a contract from any CDI-07B path; (11) any ineligible candidate
  carrying a `LearningCase`, counting toward `N`, or reaching memory.

---

## 15. Recommended Implementation Agent

**The designated CDI stream implementation agent**, with a mandatory independent adversarial review
pass before commit — the CDI-02 through CDI-07A precedent, unchanged.

The work is contract-first and deterministic, and every judgement call is resolved in this gate: the
comparability gate is a six-test ordered sequence, eligibility is an eight-condition conjunction,
authority is a seven-condition conjunction, the verdict is an ordered precedence over three named
states, and the acceptance criteria are phrased as failing attacks. What remains is disciplined
transcription plus a large regression suite.

Two areas warrant closer attention than CDI-07A's did, because they are where a plausible
implementation goes wrong quietly: the **grain resolution test** (§5.4.1), where the tempting shortcut
is apportionment, and the **eligibility conjunction** (§6.3), where the tempting shortcut is a count of
satisfied conditions.

## 16. Recommended Subtask Delegation

**Not justified.** The three capabilities share one contract file, one binding model, one set of
disclosures and one guard vocabulary, and every one of them binds to the same `DecisionContract`.
Splitting them across parallel agents would produce three divergent transcription conventions and a
merge whose conflicts fall exactly on the shared invariants — which is where correctness lives.

The one genuinely separable unit is the **ESF-3 observation adapter surface** (§4), which depends only
on the ESF-3 contract and could be built against a fixture. Even that is small enough that the
coordination cost exceeds the benefit. Recommend a single implementing agent, sequenced
§4 → §5 → §3 → §6 → §7, so the observation model is settled before anything consumes it.

---

## 17. Implementation Prompt — CDI-07B

```text
COGNIX - CDI-07B IMPLEMENTATION (Pre-Mortem, Prediction vs Reality & Closed Learning Loop)

Branch: Feature/MatchingContract-AutoActivate
Baseline: 56b266aaf083ecb4ff572cdf5b89b53f391a2db5 (CDI-07A decision contract)
Authoritative design: docs/reports/COGNIX_CDI_07B_LEARNING_LOOP_DESIGN_GATE.md
(DESIGN FROZEN - CONTRACT FROZEN - APPROVED - IMPLEMENTATION-READY. Owner rulings X1, X2,
X3 and X4 were approved 2026-08-15 and are CLOSED in SS13.1. They are binding and not
reopenable at implementation. Y1-Y4 remain open and non-blocking.)

Verify continuity first: branch, baseline, both remotes converged, clean tree, and the
CDI-01 through CDI-07A evidence present and green (21, 36, 31, 49, 70, 93, 155),
including the CDI-07A RV-1..RV-8 reconciliation regressions. Stop on any divergence.

RULINGS IN FORCE
- Three capabilities, three artefacts, three lifecycles, kept structurally apart.
  Pre-Mortem asks what could fail before execution. Prediction vs Reality asks what
  differed after. Learning asks what is reusable. NONE re-decides, and none writes to a
  contract's basis, resolution, assumptions, triggers, status or validity. Nothing
  auto-supersedes or auto-withdraws. Only a named human does that.
- Every artefact binds contract_id AND contract_digest. A digest mismatch is a
  fail-closed rejection, never a warning.
- A COMPARISON IS ONLY EVIDENCE IF THE TWO THINGS COMPARED ARE THE SAME KIND OF THING AT
  THE SAME GRAIN ON THE SAME BASIS. The contracted headline prediction
  attributable_uplift_pp is ATTRIBUTABLE (counterfactual-differenced, excludes ambient);
  every available observation is GROSS. NEVER difference them. The comparability gate is
  six ordered tests and the FIRST failure fixes the verdict with NO error computed:
  observation bound, authority, grain, unit, quantity basis, observed counterfactual.
  The implementable path is the gross one - CDI-05
  decomposition.reconciliation.reconciled_sum_pp against an ESF-3 delta_pct. The
  attributable path is contracted NOT_AVAILABLE via
  OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT.
- GRAIN IS DETERMINISTIC AND FAILS CLOSED. An observation resolves only when its
  (entity_type, entity_id) covers NO MORE than the contracted comparison_invariants on
  every declared dimension and observed_at falls inside the contracted window.
  APPORTIONING a broader observation onto a narrower decision is PROHIBITED WITHOUT
  EXCEPTION - apportionment is modelling, and the output would be a modelled number
  presented as an observation.
- SUCCESS and FAILURE DO NOT EXIST in this contract, in a type, a key, a string value or
  a surface. The verdict is WITHIN_DECLARED_ENVELOPE | OUTSIDE_DECLARED_ENVELOPE |
  INDETERMINATE by ordered precedence, and WITHIN_DECLARED_ENVELOPE REQUIRES POSITIVE
  EVIDENCE: at least one LIKE_FOR_LIKE comparison with a declared CDI-05 envelope that
  fell inside it, and completeness.complete true. This is the direct descendant of
  CDI-07A owner ruling W2 - the identical fabricated-confirmation defect was found in
  CDI-07A by independent review after its own suite ran green. A missing observation is
  OBSERVATION_ABSENT: never zero error, never NOT_FIRED, never read as the prediction
  having held.
- Prediction error is DESCRIPTIVE EVIDENCE ABOUT A PREDICTION, never a verdict on the
  decision, the resolver or the play. Signed delta in the shared unit only. No accuracy
  score, error percentage, hit rate, MAPE or grade anywhere.
- A PRE-MORTEM INVENTS NO PRECISION. No likelihood, probability, impact score, severity
  score, risk score or expected loss - not even unused. Failure modes are ENUMERATED FROM
  DECLARED EVIDENCE (CDI-04 conditions and vetoes, CDI-06 eliminations and constraints,
  CDI-07A assumptions, WP10-C derived impacts) and carry grounding DECLARED_EVIDENCE |
  STRUCTURAL | UNASSESSED, which has no ordering. No risk matrix, heat map or
  sorted-by-risk list on any surface.
- CONSEQUENCE ORDERING REUSES WHAT WP10-C ALREADY PUBLISHES. calculateDerivedImpacts
  already annotates dc_overtime_hours as 2nd order and margin_erosion_pct as 3rd. Map
  onto it. DO NOT BUILD A RIPPLE ENGINE, SERVICE, PROPAGATION MODEL OR GRAPH TRAVERSAL. A
  SECOND_ORDER or THIRD_ORDER mode with no follows_from_failure_mode_id is RJ-P4.
  Disclose the asymmetry: calculateDerivedImpacts reads Shared Decision State scenario
  parameters, NOT the contracted play, so any derived-impact mode is grounding STRUCTURAL
  and carries the SS3.4 scope disclosure verbatim.
- OBSERVATION AUTHORITY IS A SEVEN-CONDITION CONJUNCTION. Measured: all seven ESF-3
  connectors are synthetic_demo true and there are zero non-synthetic sources, so EVERY
  observation this estate can produce is SYNTHETIC_DEMONSTRATION. That is a truthful
  state, not a degraded one - build the mechanism completely and label the mode
  honestly. A synthetic ESF-3 feed has external SHAPE and no external CONTENT: it is
  ATTRIBUTION_UNAVAILABLE, NEVER WORLD_DRIVEN. Shape is not provenance. Adapter-defaulted
  confidence/quality (ESF-3 applies 80/85 when omitted) are NEVER authority or
  eligibility inputs; record metrics_supplied.
- LEARNING ELIGIBILITY IS A DETERMINISTIC EIGHT-CONDITION CONJUNCTION (LE-1..LE-8),
  never a score and never a count of satisfied conditions. Publish ALL eight on every
  candidate, met and unmet alike, with named unmet reasons. A LearningCase carries
  validity_basis - comparability, grain statement, quantity basis, observation authority
  and the full conjunction - because a case that records what was predicted and what
  occurred but not WHY THE COMPARISON WAS VALID is an anecdote with numbers attached.
- ONE CASE NEVER BECOMES A PATTERN. WP10-D's ILearningPatternRepository has NO WRITE
  METHOD and its seeded patterns already claim occurrence counts their own
  supporting_memory_ids do not support. REUSE WP10-D: register precedents through the
  existing registerMemoryCase, reference patterns READ-ONLY, and NEVER create a parallel
  learning store. pattern_confidence, situation_similarity, historical_occurrences and
  intervention_success_rate are context only - never copied onto a CDI-07B artefact and
  never an eligibility input. Pattern promotion is contracted NOT_AVAILABLE via
  PATTERN_PROMOTION_REQUIRED_INPUT.
- X3 (APPROVED): the frozen CONTRACT SEMANTIC is N > 1. The initial value is N = 3 and it
  is published ONLY alongside all three labels - UNCALIBRATED, CONFIGURABLE FUTURE POLICY,
  NOT STATISTICAL SIGNIFICANCE - plus ThresholdCalibrationStatus
  UNCALIBRATED_LAB_DEFAULT imported from CDI-04. Never describe N = 3 as significance, a
  confidence level, a sample-size rule or a universal learning rule. Reaching N triggers
  NOTHING automatically: NO automatic LearningPattern creation is authorised.
- X4 (APPROVED): RETAIN ineligible LearningCandidates, each carrying the eligibility
  result, blocked_by, ObservationCompleteness and EvidenceProvenance. An ineligible
  candidate NEVER carries a learning_case (RJ-L1), NEVER counts toward N, NEVER influences
  any LearningPattern telemetry field, and is NEVER registered as an EnterpriseMemoryCase.
  Surface it as evidence collected plus named unmet conditions - never as a weaker case or
  a partial success.
- NO QUANTITATIVE DECISION HALF-LIFE. CDI-07B observes OUTCOMES, not ASSUMPTIONS CEASING
  TO HOLD, which is the declared grain of QUANTITATIVE_HALF_LIFE_REQUIRED_INPUT - so even
  a complete non-synthetic corpus would be the wrong quantity at the wrong grain.
  AWAITING_AUTHORITATIVE_SOURCE stands. Inherit the CDI-07A duration KEY and VALUE scans
  unchanged and add the CDI-07B offenders in SS9.4.
- NO LLM decides truth, outcome correctness, eligibility, comparability, authority or
  pattern confidence. A narrative layer may only describe an already-computed,
  already-validated artefact, labelled non-authoritative. Acceptance test: outputs with
  the narrative layer disabled are byte-identical to those with it enabled.
- REUSE, DO NOT REDEFINE. IMPORT EvidenceStrength, EVIDENCE_STRENGTH_ORDER,
  weakestEvidenceStrength, ConfidenceBand, ThresholdCalibrationStatus, ReadinessCondition,
  ReadinessVeto, ReadinessDimensionId from campaign-readiness-model.ts.
  IMPORT ComparisonSetInvariants from campaign-frontier-model.ts. IMPORT
  SignalMovementAttribution, DecisionResolutionRoute and the disclosure constants from
  campaign-decision-contract-model.ts - DO NOT declare a second attribution taxonomy.
  IMPORT CanonicalSignalType, SignalEntityType, SignalSourceType from
  enterprise-signal-model.ts and ExternalSignalCategory from
  external-signal-connector-model.ts. Declare only the ONE local structural twin
  LearningRequiredAuthoritativeInput, per the CDI-06 R1 / CDI-07A SS8.2 precedent.
- All ids, digests, ordering and verdicts are content-derived or caller-supplied.
  Date.now() and argless new Date() must not appear in any CDI-07B decision logic.
- Preserve tenant/session boundaries and fail closed. Cross-tenant reads report NOT FOUND,
  never forbidden - no existence oracle.

BUILD
1. packages/contracts/src/campaign-learning-loop-model.ts - types and validators per
   SS3-SS11: CampaignPreMortem, FailureMode, FailureModeClass, FailureModeGrounding,
   ConsequenceOrder, ResilienceEvidence, PreMortemUnexaminedDimension,
   PredictionOutcomeComparison, QuantityComparison, QuantityBasis, ComparabilityVerdict,
   ComparisonVerdict, PredictionError, OutcomeObservation, ObservationAuthority,
   ObservationCompleteness, EvidenceProvenance, OutcomeAttribution, LearningCandidate,
   LearningCase, LearningEligibility, LearningEligibilityCondition,
   LearningPatternReference, LearningCapability, LearningRequiredAuthoritativeInput,
   PATTERN_PROMOTION_REQUIRED_INPUT, OBSERVED_COUNTERFACTUAL_REQUIRED_INPUT,
   OBSERVATION_INDEPENDENT_SOURCE_TYPES, plus validateCampaignPreMortem,
   validatePredictionOutcomeComparison, validateLearningCandidate, validateLearningCase,
   assertNoInventedRiskPrecision, assertNoDurationSemantics (reuse CDI-07A),
   assertPreMortemProposesNoAlternative, assertErrorOnlyWhenLikeForLike,
   assertNoSuccessFailureVerdict, assertObservationAuthorityConjunction,
   assertSyntheticNeverPresentedAsReal, assertEligibilityIsConjunction,
   assertNoPatternWrite, assertNoWp10dTelemetryCopied, assertGrainResolves,
   assertTenantSessionCoherent (reuse CDI-07A). Export from index.ts.
2. lib/pre-mortem-store.ts and lib/learning-candidate-store.ts - IPreMortemStore /
   ILearningCandidateStore abstractions plus tenant/session-indexed in-memory
   implementations following IDecisionContractStore. create / markSuperseded /
   tenant-scoped reads ONLY. NO update method. DEEP-FREEZE the stored copy - CDI-07A
   shipped a shallow freeze that left nested basis writable through the returned
   reference (RV-7). PredictionOutcomeComparison is NOT stored.
3. lib/campaign-learning-loop-engine.ts - pure, deterministic, zero React, zero LLM.
   Failure mode enumeration, the six-test comparability gate, the seven-condition
   authority conjunction, the eight-condition eligibility conjunction, attribution
   classification, and verdict by ordered precedence at a caller-supplied as_of.
4. app/api/v1/campaigns/decision-contract/[id]/pre-mortem/route.ts (POST, GET),
   /[id]/prediction-comparison/route.ts (POST),
   /[id]/learning-candidate/route.ts (POST),
   app/api/v1/campaigns/learning-candidates/route.ts (GET).
   Orchestration only. NO PATCH on any route.
5. WP10-D integration: register precedents through the EXISTING registerMemoryCase.
   Reference EnterpriseLearningPattern read-only. Do NOT add a pattern write path, do NOT
   create a parallel store, do NOT copy WP10-D telemetry.
6. Surface: Pre-Mortem panel (grouped by consequence_order, no matrix/heat map/ranking),
   Prediction vs Reality panel (comparability verdict shown BEFORE the numbers,
   incomparable quantities displayed as incomparable and never omitted, mandatory SS5.6
   disclosure, persistent synthetic marker at every tier), Learning panel (full
   eligibility conjunction, blocked_by, published required-input declarations).
7. tests/unit/run-cdi07b-tests.ts - implement ALL 55 adversarial acceptance criteria in
   SS12 as permanent regression tests, including AC-51..AC-55 which make owner rulings
   X1..X4 permanent. AC-20 (attributable vs gross) and AC-21 (grain mismatch) are the
   defining tests of this work package. Re-run CDI-01 through CDI-07A and the
   WP10/ESF/IFI guardrails; all must remain green (21, 36, 31, 49, 70, 93, 155),
   including the CDI-07A RV-1..RV-8 reconciliation regressions.

UPSTREAM TOUCHES - EXACTLY TWO, BOTH APPROVED, BOTH MADE IN THE IMPLEMENTATION COMMIT
- X1 (APPROVED): correct CDI-07A world-driven source admissibility to consume
  OBSERVATION_INDEPENDENT_SOURCE_TYPES instead of the single 'EXTERNAL_CONNECTOR'
  literal, so canonical ESF-3 planning, commerce and operational-telemetry source types
  are recognised. A PREDICATE/CONSTANT correction inside
  campaign-decision-contract-model.ts - NO frozen type, union, interface or validator
  changes, NO CanonicalSignalType widening, NO parallel taxonomy. Add regressions
  asserting a non-synthetic ESF-3 PLANNING observation is admissible for WORLD_DRIVEN,
  that the SAME observation with synthetic_demo true is ATTRIBUTION_UNAVAILABLE, and that
  an ESF-1 simulated observation is SCENARIO_DRIVEN.
- X2 (APPROVED): add decision_contract_ref?: string to EnterpriseMemoryCase - additive,
  optional, PROVENANCE/REFERENCE ONLY, mirroring commercial_intent_ref. Carry
  contract_digest in the memory case's existing provenance map so the pair stays
  verifiable. DO NOT copy DecisionContract content, economics, assumptions, triggers or
  validity into the memory case. The authoritative digest-bound record stays on the
  LearningCase. A digest mismatch on read is a fail-closed rejection.

DO NOT
- Do not modify any CDI-01/02/03/04/05/06 contract, or any CDI-07A frozen type. If a
  blocker appears, STOP and report it rather than widening a frozen upstream contract.
- Do not build a Ripple engine, service, propagation model or graph traversal.
- Do not create a parallel learning or memory store.
- Do not add a WP10-D pattern write path, and do not create or mint a pattern.
- Do not train, fit or invoke an ML model, and do not add LLM ranking or judgement.
- Do not add ESF-4/5, add a connector, or widen CanonicalSignalType or
  ExternalSignalCategory.
- Do not produce a quantitative Decision Half-Life, duration, countdown, expiry or decay
  curve.
- Do not commit or push until owner review.

Repository output must remain tool-agnostic: no model or tool identity, watermarks,
signatures, attribution, generated-by markers or co-author metadata.
```
