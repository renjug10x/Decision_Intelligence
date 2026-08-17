# COGNIX — CDI-06 MULTI-OBJECTIVE OUTCOME FRONTIER & COMPETING STRATEGIES — INTELLIGENCE DESIGN GATE

| Field | Value |
| --- | --- |
| Work package | `CDI-06` — Multi-Objective Outcome Frontier & Competing Strategies |
| Design-assessment baseline | `64111eeab14d4542963e393c9d2f00dea81c53e8` |
| Authorised implementation baseline | `6afc44cdda57a29151006fa122a4f1bf6ff47214` — interim causal-integrity correction (§1.5), committed and pushed |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Status | **DESIGN FROZEN — CONTRACT FROZEN — CLEARED FOR IMPLEMENTATION** (owner rulings U1 & U4 approved and closed 2026-08-15) |
| Hard dependencies | `CDI-02` `CausalDemandContribution`, `CDI-05` `DemandDecomposition` |
| Integration dependency | `CDI-04` `DecisionReadinessAssessment` |
| Scope | Design and contract freeze only. No CDI-06 product implementation. |
| Date | 2026-08-15 |

**Governing principle (carried forward, unchanged).**

> The system exposes meaningful business trade-offs; it must not collapse them into an
> opaque weighted score or pretend there is one universally optimal campaign.

---

## 1. Continuity

### 1.1 Baseline verification

| Check | Result |
| --- | --- |
| `HEAD` at design time | `64111eeab14d4542963e393c9d2f00dea81c53e8` — matched the design-assessment baseline |
| `HEAD` at freeze | `6afc44cdda57a29151006fa122a4f1bf6ff47214` — the interim causal-integrity correction (§1.5), committed and converged on `gitlab` and `origin` |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Working tree | Clean at design time; clean at freeze apart from this document, which commits on top of the correction |
| `CDI-01` evidence | `packages/contracts/src/campaign-intent-model.ts`, `lib/campaign-intent-store.ts` |
| `CDI-02` evidence | `packages/contracts/src/campaign-counterfactual-model.ts`, `lib/campaign-causal-engine.ts` |
| `CDI-03` evidence | `packages/contracts/src/campaign-opportunity-model.ts`, `lib/campaign-opportunity-engine.ts` |
| `CDI-04` evidence | `packages/contracts/src/campaign-readiness-model.ts`, `lib/campaign-readiness-engine.ts` |
| `CDI-05` evidence | `packages/contracts/src/campaign-timeline-model.ts`, `lib/campaign-timeline-engine.ts` |

No unexplained divergence. The declared dependency chain is present and intact.

### 1.2 Upstream semantics this gate is bound by

- **CDI-02 ambient / intervention partition.** `CausalDriverClass` partitions every driver into
  `ambient` (occurs with or without the campaign) and `intervention` (occurs only because we act).
  Ambient drivers belong to *both* trajectories and cancel out of `campaign_delta`.
  `attributable_uplift_pp === intervention_uplift_pp` is the campaign's effect;
  `total_predicted_uplift_pp` is not, and may never be presented as such.
- **CDI-05 decomposition.** `DemandDecomposition` partitions by `driver_class` with subtotals
  echoed from CDI-02, the interaction residual shown in place, and excluded drivers displayed
  rather than dropped. CDI-06 reuses this artefact and defines no second decomposition.
- **CDI-04 evidence and confidence taxonomies.** `EvidenceStrength`, `EVIDENCE_STRENGTH_ORDER`,
  `weakestEvidenceStrength`, `ConfidenceBand` and `ReadinessEvidenceRef` are the single authority.
  CDI-05 §5.1 established the precedent of importing rather than redefining; CDI-06 follows it.
- **CDI-05 unavailability pattern.** `RequiredAuthoritativeInput` — the field, its grain, why it is
  required, the inadmissible substitutes, and what it enables — is the frozen way to express a
  capability that is contracted but cannot yet be truthfully produced. CDI-06 reuses it verbatim.

### 1.3 Continuity findings carried into the design

Four findings were established empirically against the baseline engines before this design was
written. Each is load-bearing; each constrains the contract below. **None requires an upstream
contract change to deliver CDI-06**, but two require an owner ruling (§12).

**C1 — Ambient movement is not invariant across strategies when signals are consumed.**

`extractSignalUpliftPp` seeds the ESF-2 simulation with `promotion_lift = statedPromoDepth`
(`lib/campaign-causal-engine.ts:297`, `:208`), and the simulator computes its `Today` observations
from that value (`services/world/src/dynamic-signal-simulator.ts:45`, `:79`, `:127`). The
`external_signal_response` driver is classed `ambient`, so a field that is meant to describe *the
world regardless of our action* is in fact a function of *our chosen discount depth*.

Measured across a seven-play set on an identical anchor intent, **after** the D1 correction (§1.5):

| Play | `ambient_uplift_pp` (signals on) | `ambient_uplift_pp` (signals off) |
| --- | --- | --- |
| Do Nothing | 1.42 | 1.42 |
| Non-promotion | 1.42 | 1.42 |
| Promotion @5% | 1.45 | 1.42 |
| Promotion @10% | 1.50 | 1.42 |
| Promotion @15% | 1.56 | 1.42 |
| Promotion @20% | 1.57 | 1.42 |
| Promotion @30% | 1.65 | 1.42 |

With signals consumed, each play is evaluated against a **different counterfactual world**
(`expected_without_intervention` ranges 101.42 → 101.65). Comparing outcomes measured against
different baselines is not a comparison. With signals excluded, every play shares one
counterfactual (101.42) exactly. This drives invariant **F-INV-1** (§5.3).

The D1 correction **widened** this spread from 0.20pp to 0.23pp and moved Do Nothing from the middle
of the range to its floor — the zero-depth plays now correctly draw a zero-lift signal world. C1 is
therefore a property of the design, not of the defect: it survives the fix intact, and the case for
F-INV-1 and ARF-A is strengthened rather than weakened.

**C2 — Zero depth was silently read as 20% depth. CORRECTED (§1.5).** `const promoLift =
context.promotion_lift || 20` was a falsy-zero fallback. A Do Nothing or non-promotion evaluation
passes `promotion_lift: 0` and therefore consumed a signal world seeded by a **20% promotional
lift** — which is why Do Nothing and non-promotion originally both drew `1.57`. The defect predated
CDI-06 and affected CDI-02 and CDI-05 truthfulness, not only frontier comparability. Recorded as
**D1**, raised as owner item **U2**, and **discharged** by the interim correction (`||` → `??`).
Post-fix both zero-depth plays draw `1.42`.

**C3 — `waste_units` cannot bear a Pareto axis.** Originally for two independent reasons. The second
has since been **corrected (§1.5)**; the first stands and is now the sole basis.

1. *No resolution — **stands**.* `waste_units` is `406` for every intervening play from 5% to 30%
   depth. It cannot discriminate between promotion strategies at all.
2. *A label artefact — **corrected**.* `buildTrajectory` previously selected the clearance factor by
   `label === 'PREDICTED_WITH_INTERVENTION'`. Under `CONSIDER_DO_NOTHING` the predicted and
   without-intervention indices are **identical** (both 101.42), yet waste read 386 against 420 — so
   Do Nothing reported a **34-unit waste improvement for taking no action** while
   `intervention_indistinguishable_from_do_nothing` was simultaneously `true`. Clearance is now gated
   on `intervention_uplift_pp > 0`, and Do Nothing measures `420` with a waste delta of **`0`**.

Recorded as **D2**, raised as owner item **U3**, and discharged. Post-fix waste is *truthful* but
*binary*: `0` for no intervention, `−14` for every intervention regardless of depth. The revised
consequence for this gate is in §4.3 — the artefact objection is withdrawn, the degeneracy objection
is decisive on its own.

**C4 — Non-promotion has modelled demand and unmodelled cost.** `CONSIDER_NON_PROMOTION` is a real
deterministic evaluation: `non_promotion_response` contributes `+4.07pp`, total intervention
`+8.99pp`, contribution delta **`+£1,663.15`** — the best outcome of any play by a factor of 3.4
over the best promotion. But it carries no contribution erosion (`unitContributionFor` returns the
full `£1.85` when no mechanic is attributed), no portfolio drag (promotion carries `−1.2pp`), and
**no execution cost of any kind — CDI-02 models no cost term whatsoever**. Stock reallocation and
assortment change have real labour, logistics, capital and markdown-risk costs. Ruling in §7.

### 1.4 Divergence from the planning record (docs-only, resolved here)

`docs/reports/COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md` line 192 anticipates CDI-06
outcome dimensions of *"Revenue, contribution, waste, availability"* across *"4 strategy plays"*.
Three of those four dimensions cannot be truthfully produced at this baseline: revenue is barred by
the CDI-05 U2 ruling (no realised selling price), waste is barred by **C3**, and availability has no
CDI-02 quantity at all. The planning report entry is marked `PROPOSED` and is aspirational; this
gate is the authoritative record. §4 contracts all four dimensions and marks three unavailable
rather than manufacturing them. The planning row should be reconciled at implementation, following
the CDI-05 §8.2 precedent — not by narrowing CDI-06's contract.

### 1.5 Interim causal-integrity correction (explained divergence)

After this design was drafted, defects **D1** and **D2** — both first identified by this gate's
continuity assessment — were corrected in a separate interim work item against the design-assessment
baseline, recorded in `docs/reports/COGNIX_INTERIM_CAUSAL_INTEGRITY_BUGFIX_REPORT.md` and landed
independently as commit **`6afc44cdda57a29151006fa122a4f1bf6ff47214`** ahead of this freeze. That
commit — not `64111eea` — is the upstream estate CDI-06 implements against.

| Defect | Correction | File |
| --- | --- | --- |
| D1 | `context.promotion_lift \|\| 20` → `?? 20`; explicit `0` stays `0`, only nullish absence defaults. `SignalSimulationContext.promotion_lift` made optional; validation no longer rejects an omitted value | `services/world/src/dynamic-signal-simulator.ts`, `packages/contracts/src/enterprise-signal-model.ts` |
| D2 | Waste clearance gated on `causalResult.intervention_uplift_pp > 0` and passed as `applyInterventionClearance`; no string-label comparison drives waste economics | `lib/campaign-causal-engine.ts` |

**The divergence is explained and resolved.** This gate's citations of the defective lines describe
the design-assessment baseline; the measured values in §1.3, §4.1 and §4.3 have been **re-measured
against the corrected estate** and are current as of `6afc44cd`.

**Effect on this design: none of the rulings move.** All seven plays were re-evaluated after the
correction:

- The two admitted axes are **numerically unchanged** under ARF-A. Every figure in §4.1 and every
  worked example in §9.4 holds exactly.
- Readiness behaviour is **unchanged** — the same `CONDITIONAL_GO` states, the same `K7` caps on
  negative-contribution plays, the same `V3a` and `V3b` veto behaviour with the same published
  headrooms. §8 and §9 are unaffected.
- **C1 survives and strengthens** — the ambient spread under signals widened from 0.20pp to 0.23pp.
  F-INV-1 and the U1 ruling stand on the corrected estate.
- **C3 narrows to one reason** — waste is now truthful but degenerate. §4.3 is revised accordingly,
  and the ruling is unchanged.

CDI-06 implementation must proceed against the corrected estate — `6afc44cd` or later. If the
correction is ever reverted, the §1.3 C2/C3 baseline behaviour returns, and acceptance criteria
**AC-11** and **AC-32** are the tests that will detect it.

---

## 2. Strategy / Play Domain Model

### 2.1 Design position

A strategy play is **not** a projection, a template or a description. It is a *different campaign
that was actually evaluated*. Every play in CDI-06 is a real `CampaignIntent` variant put through
`evaluateCampaignDecision` and carrying the resulting `counterfactual_id` and `causal_id`. There is
no other admissible route to an outcome number.

### 2.2 The anchor and the play delta

Every frontier is computed relative to one **anchor**: the user's own `CampaignIntent`. A play is
the anchor plus a **play delta** — a closed, explicitly enumerated diff over exactly the fields that
CDI-02 consumes as intervention inputs:

| Mutable by a play delta | Why |
| --- | --- |
| `campaign_intent.intervention_posture` | Selects which intervention class is being considered |
| `campaign_intent.provisional_mechanic` | The promotional mechanic under test |
| `campaign_intent.provisional_discount_depth` | The depth under test |
| `resolved_temporal_uplift_pp` + `opportunity_window_id` | CDI-03 window resolution, when supplied |

**Everything else is frozen from the anchor and is a comparison-set invariant**: `category`,
`sku_scope`, `region`, `customer_segment`, `timing_mode`, `planned_start`, `planned_end`,
`objective_type`, `baseline_objective`, `tenant_id`, `session_id`.

The reason is not tidiness. Those fields change *what is being decided*, not *how to decide it*. A
play that quietly widens `sku_scope` or moves the region is not a competing strategy for the same
question — it is a different question wearing the same card. Varying them would also break the
shared counterfactual, since `skuContextFactor` is seeded from `category`, `sku_scope` and `region`
(`lib/campaign-causal-engine.ts:131`).

### 2.3 `StrategyPlay`

```ts
export type PlayKind = 'DO_NOTHING' | 'PROMOTION' | 'NON_PROMOTION';

export type PlayAdmissibility =
  | 'ADMISSIBLE'
  | 'INADMISSIBLE_UNSTATED_MECHANIC'
  | 'INADMISSIBLE_MODEL_INTEGRITY'
  | 'INADMISSIBLE_AMBIENT_FRAME'
  | 'INADMISSIBLE_VETOED'
  | 'EXCLUDED_ECONOMICS_INCOMPLETE';

export interface PlayIntentDelta {
  field_path: string;
  anchor_value: string | number | null;
  play_value: string | number | null;
}

export interface StrategyPlay {
  play_id: string;                    // deterministic content hash — never time-derived
  label: string;                      // from the declared vocabulary (§9.5)
  play_kind: PlayKind;
  generator_rule_id: string;          // G0 | G1 | G2 | G3
  is_anchor: boolean;                 // true for the user's own stated intent
  intent_delta: PlayIntentDelta[];    // [] only for the anchor play

  // Binding to a real evaluation — mandatory, never synthesised
  evaluation_id: string;
  counterfactual_id: string;
  causal_id: string;

  outcomes: PlayOutcomeVector;        // §4
  decomposition: DemandDecomposition; // CDI-05, this play's own
  ambient_frame: AmbientFrameStamp;   // §5.3

  admissibility: PlayAdmissibility;
  exclusion_reason?: string;
  readiness_reference?: PlayReadinessReference;   // §8.1
  economics_completeness: EconomicsCompleteness;  // §7.3

  confidence_band: ConfidenceBand;                // CDI-04 taxonomy
  evidence_strength_floor: EvidenceStrength;      // CDI-04 taxonomy
  evidence_refs: ReadinessEvidenceRef[];
  synthetic_demo: boolean;
  provenance: Record<string, string>;
}
```

### 2.4 `play_id` determinism

`play_id` is a content hash of `(anchor campaign_intent_id, generator_rule_id, canonicalised
intent_delta)`. It must not incorporate a timestamp, a counter, or `evaluation_id`.

This is a hard rule with a specific cause: `evaluateCampaignDecision` builds `evaluation_id` from
`Date.now()` (`lib/campaign-causal-engine.ts:599`) and stamps `timestamp` from `new Date()`. Those
values are legitimately non-deterministic. **No id, ordering, dominance test or selection may depend
on them.** The same anchor under the same policy version must yield byte-identical `play_id`s across
runs, processes and machines.

### 2.5 Plays are never persisted as campaign intents

Play variants are evaluated through the **inline `campaign_intent`** path of
`CampaignEvaluationRequest`, which is present and supported
(`lib/campaign-causal-engine.ts:559`). CDI-06 **must not** call `registerCampaignIntent` for a
generated variant. The CDI-01 intent store is the record of what the *user* decided to consider;
writing machine-invented campaigns into it would corrupt that record and would make the user's
decision history unreadable.

---

## 3. Admissibility Model

Admissibility is evaluated in two stages, and **an inadmissible play is never hidden**. It is
carried with its true outcomes and its exclusion reason, and is excluded only from the *dominance
computation*. Suppressing a play would conceal precisely the trade-off the product exists to expose.

### 3.1 Stage A — structural admissibility (before evaluation)

| Rule | Test | Failure |
| --- | --- | --- |
| **A1** | Every comparison-set invariant (§2.2) is identical to the anchor | Play not generated |
| **A2** | The delta touches only the mutable set (§2.2) | Play not generated |
| **A3** | A `PROMOTION` play states **both** mechanic and depth as `canvas_stated` | `INADMISSIBLE_UNSTATED_MECHANIC` |
| **A4** | Depth lies within the declared generation grid (§10.2) | Play not generated |

**A3 is not a formality.** `resolveStatedMechanic` attributes a mechanic only when both the type and
the depth carry `canvas_stated` provenance, and excludes anything marked
`cdi01_placeholder_default` (`lib/campaign-causal-engine.ts:97`–`:111`). A generated promotion play
that fails this collapses to `mechanic_response = 0` and becomes numerically identical to Do
Nothing — while still being labelled and displayed as a promotion. That is a fabricated strategy,
and A3 exists to make it impossible rather than merely unlikely.

### 3.2 Stage B — evaluated admissibility (after evaluation)

| Rule | Test | Failure |
| --- | --- | --- |
| **B1** | `validateCounterfactualBaseline` and `validateCausalDemandContribution` both pass, and `reconciliation_ok` is `true` | `INADMISSIBLE_MODEL_INTEGRITY` |
| **B2** | The play's ambient frame matches the comparison-set frame exactly (§5.3) | `INADMISSIBLE_AMBIENT_FRAME` |
| **B3** | CDI-04 readiness is not `DO_NOT_PROCEED` | `INADMISSIBLE_VETOED` |
| **B4** | The play's economics are complete on every admitted axis (§7.3) | `EXCLUDED_ECONOMICS_INCOMPLETE` |

A **B1** failure is never repaired, rounded away, or retried with different inputs. If the *anchor*
fails B1, no frontier is emitted at all.

### 3.3 What admissibility may not do

Admissibility filters *participation in dominance*. It **never** alters an outcome value. A vetoed
play displays exactly the numbers CDI-02 produced for it. This is the CDI-06 restatement of the
invariant that readiness must not silently rewrite economics, and it is machine-checked by
`assertReadinessDidNotRewriteEconomics` (§8.2).

---

## 4. Outcome Dimensions

### 4.1 Admitted Pareto axes — exactly two

| Axis | Source field | Unit | Preferred direction |
| --- | --- | --- | --- |
| `attributable_volume_uplift_pp` | `counterfactual.campaign_delta.attributable_uplift_pp` | pp of demand index | Declared (§4.4) |
| `contribution_delta_gbp` | `counterfactual.campaign_delta.contribution_delta_gbp` | GBP | Declared (§4.4) |

Both axes are **deltas against the play's own counterfactual**, never absolute levels. This is not a
presentational preference:

- Absolute `contribution_gbp` carries the full ambient contamination of **C1** — Do Nothing alone
  moves £27.75 between signal modes purely from the ambient draw.
- The delta form is contaminated by at most £8.93 across the measured set, and becomes **exactly**
  comparable once F-INV-1 (§5.3) holds, because every play then shares one counterfactual.

Axis 1 is ambient-invariant by construction (`intervention_uplift_pp` sums intervention-class
drivers only, and none of them consumes signals). Axis 2 is not, which is precisely why F-INV-1 is
mandatory rather than advisory.

The measured frontier on these two axes is genuinely non-degenerate — uplift rises strictly and
contribution falls strictly with depth, so the trade-off is real at every point:

| Play | `attributable_volume_uplift_pp` | `contribution_delta_gbp` |
| --- | --- | --- |
| Do Nothing | 0.00 | 0.00 |
| Promotion @5% | 6.41 | +488.19 |
| Promotion @10% | 9.02 | +238.50 |
| Promotion @15% | 11.64 | −42.23 |
| Promotion @20% | 14.25 | −359.60 |
| Promotion @30% | 19.47 | −1,094.63 |

*(ARF-A frame; anchor: Grocery / North West / `KNOWN_DATES`.)*

### 4.2 Contracted and **NOT AVAILABLE**

| Dimension | Status | Required authoritative input |
| --- | --- | --- |
| `revenue_delta_gbp` | `NOT_AVAILABLE` | `realised_unit_selling_price_gbp`, per SKU per period, net of promotional discount |
| `availability_delta` | `NOT_AVAILABLE` | An availability or service-level quantity on the CDI-02 trajectory; none exists |

`revenue_delta_gbp` inherits the CDI-05 U2 ruling unchanged and **reuses `REVENUE_REQUIRED_INPUT`
verbatim** — it must not be re-declared, and the inadmissible substitutes (RRP, list price,
contribution × assumed margin, any default margin rate) remain inadmissible here.
`availability_delta` publishes its own `RequiredAuthoritativeInput`. CDI-04's
`OperationalFeasibility.commitment_gap_units` is *not* a substitute: it was measured as absent
across all seven plays in the lab context, so it discriminates nothing, and it is a capacity
quantity rather than an outcome.

### 4.3 Contracted, present, and **NOT ADMISSIBLE as an axis**

| Dimension | Carried as | Why not an axis |
| --- | --- | --- |
| `waste_delta_units` | `waste_annotation` with a mandatory disclosure | **C3** — no resolution across depths (post-correction, the sole basis) |
| `predicted_confidence` | `confidence_band` (CDI-04 `ConfidenceBand`) | Constant at 88 across every intervening play; posture-derived, not strategy-derived |

**Revised after the §1.5 correction.** Waste is no longer an artefact: clearance is now causally
gated, and Do Nothing correctly measures a waste delta of `0`. The artefact objection is withdrawn.
The degeneracy objection is decisive on its own, and the ruling does not change.

Post-correction, `waste_delta_units` takes exactly two values across the entire play space: `0` for
no intervention and `−14` for *every* intervention, at *every* depth from 5% to 30%. Admitting it as
an axis would be **truthful but inert**, and inertness here is not neutral:

- It can never separate two promotion plays, because it is constant across all of them.
- It can never change frontier membership. The only play it distinguishes is Scenario 0, and it
  distinguishes it in the direction that makes it *more* dominated — Do Nothing is already dominated
  by Promotion @5% on both admitted axes (§6.4).
- Presented as an objective axis, it would imply a trade-off that does not exist: a reader
  reasonably infers from a waste axis that going deeper wastes more, and the model says nothing of
  the kind.

The one true fact waste carries — that intervening reduces modelled waste by 14 units and not
intervening does not — is surfaced as an annotation, including on Scenario 0, rather than as a
dimension of choice. `waste_delta_units` becomes admissible as an axis the moment the waste model
gains depth resolution; until then it decides nothing.

Required disclosure on `waste_annotation`:

> Waste is reported from the CDI-02 trajectory. It distinguishes intervening from not intervening,
> but does not vary with promotional depth in the current model. It is not used to determine
> frontier membership.

### 4.4 Axis direction is declared, never assumed

Each axis publishes a `preferred_direction` of `MAXIMISE` or `MINIMISE`, sourced from the CDI-01
`baseline_objective` (`primary_metric`, `target_direction`), with `MAXIMISE` as the declared default
for both admitted axes. The direction is published in the frontier payload and in provenance so that
every dominance result can be re-derived by a reader. CDI-06 never infers a direction from an
objective label alone.

### 4.5 `PlayOutcomeVector`

```ts
export type AxisAvailability = 'AVAILABLE' | 'NOT_AVAILABLE' | 'NOT_ADMISSIBLE_AS_AXIS';
export type AxisDirection = 'MAXIMISE' | 'MINIMISE';

export interface OutcomeAxisValue {
  axis_id: 'attributable_volume_uplift_pp' | 'contribution_delta_gbp';
  value: number;
  source_field_path: string;          // e.g. 'counterfactual.campaign_delta.attributable_uplift_pp'
  preferred_direction: AxisDirection;
  strength: EvidenceStrength;
}

export interface UnavailableOutcomeDimension {
  dimension_id: 'revenue_delta_gbp' | 'availability_delta';
  availability: 'NOT_AVAILABLE';
  required_authoritative_input: RequiredAuthoritativeInput;   // CDI-05 contract, reused
}

export interface NonAxisOutcomeAnnotation {
  dimension_id: 'waste_delta_units' | 'predicted_confidence';
  availability: 'NOT_ADMISSIBLE_AS_AXIS';
  value: number | string;
  disclosure: string;                 // mandatory
  reason_code: 'DEGENERATE_ACROSS_PLAYS' | 'POSTURE_DERIVED';
  /** Names what would make this dimension admissible as an axis. */
  admissible_when?: string;
}

export interface PlayOutcomeVector {
  axes: OutcomeAxisValue[];           // exactly the admitted axes, in declared order
  unavailable: UnavailableOutcomeDimension[];
  annotations: NonAxisOutcomeAnnotation[];
}
```

---

## 5. Pareto & Frontier Semantics

### 5.1 Dominance

For admissible plays `A` and `B` over the admitted axis set `X`, with each axis's declared
`preferred_direction` normalised so that greater is better:

> `A` **dominates** `B` ⟺ for every axis `x ∈ X`, `A.x ≥ B.x − ε(x)`, **and** for at least one axis
> `x`, `A.x > B.x + ε(x)`.

The **frontier** is the set of admissible plays dominated by no other admissible play.

### 5.2 Epsilon is declared, not implicit

| Axis | `ε` | Basis |
| --- | --- | --- |
| `attributable_volume_uplift_pp` | `0.01` | CDI-02 rounds driver contributions to 2 dp |
| `contribution_delta_gbp` | `0.01` | CDI-02 rounds contribution to 2 dp |

`dominance_epsilon` is published in the frontier payload and in provenance. An undeclared or
run-time-derived tolerance is a rejection.

Plays equal on every axis within `ε` form a **`tied_group`**. All members are on the frontier, none
dominates another, and the tie is reported as a tie. A tie is never broken by ordering, by insertion
sequence, by `play_id`, or by any other incidental property.

### 5.3 F-INV-1 — the Ambient Reference Frame (load-bearing)

> **Every member of one frontier must be evaluated under an identical ambient reference frame.**

Conformance is **verified, never assumed**. Every member evaluation must report an identical
`causal.ambient_uplift_pp` **and** an identical
`counterfactual.expected_without_intervention.volume_index_pct`. On any divergence the frontier is
**not emitted**: the response carries `frontier_status: 'NOT_EMITTED'`,
`not_emitted_reason: 'AMBIENT_FRAME_DIVERGENCE'`, and the divergent values per play, so the failure
is diagnosable rather than silent.

```ts
export type AmbientFrameMode = 'SIGNALS_EXCLUDED' | 'SIGNALS_SHARED';

export interface AmbientFrameStamp {
  mode: AmbientFrameMode;
  ambient_uplift_pp: number;
  expected_without_intervention_index_pct: number;
  signal_simulation_id?: string;
}
```

**ARF-A `SIGNALS_EXCLUDED` — available now, and the only conformant mode at this baseline.**
Every member is evaluated with `include_signals: false`. Ambient reduces to `intrinsic_demand`,
which is seeded from `category`, `sku_scope` and `region` — all comparison-set invariants — so the
frame is identical by construction *and* is asserted. Measured: `1.42` for all seven plays, with
`expected_without_intervention` at `101.42` for all seven.

**ARF-B `SIGNALS_SHARED` — contracted, `UNAVAILABLE`.** All members would share one ESF-2 draw,
resolved once for the comparison set. This requires a CDI-02 capability to accept a
resolved ambient signal uplift — structurally symmetric to the existing
`resolved_temporal_uplift_pp` hook on `CampaignEvaluationRequest`, which is the precedent for
injecting an externally resolved value into a driver. That capability does not exist at this
baseline, so the mode is **declared and marked `UNAVAILABLE` with the required upstream change
named**. It must not be emulated, approximated, or silently substituted.

Defect **D1** (§1.3 C2) was a precondition for ARF-B and is now **discharged** (§1.5): while
`promotion_lift || 20` stood, a zero-depth member drew a 20%-lift signal world and any shared frame
would have been shared in name only. That obstacle is removed, but it was never the whole of the
problem — ARF-B still requires a capability to resolve one ambient draw for the comparison set, which
does not exist. The mode remains `UNAVAILABLE` on its own terms.

### 5.4 No hidden aggregate

Frontier membership is a pure function of the axis vector and the declared epsilon. **No scalar
score, rank, weight, utility, composite or index may exist anywhere in the CDI-06 payload**, not
even as an unused field, a debug value or a sort key.

This is machine-enforced in the same style CDI-05 uses to bar Half-Life and cumulative semantics:
`validateOutcomeFrontier` scans the serialised payload and rejects any key matching
`/score|weight|composite|utility|ranking|rank_index|priority_value/i`. A field that would be
harmless today is the seed of an opaque aggregate tomorrow.

Ordering for display is by the primary declared axis, ascending, with `play_id` as a stable
tie-break **for rendering only**. The display order is not a ranking and must be labelled as an
ordering, never as a recommendation sequence.

### 5.5 No interpolation — every outcome is an evaluation

> Never interpolate between two evaluated scenarios and present the result as evaluated.

Enforced three ways:

1. Every `StrategyPlay` carries `evaluation_id`, `counterfactual_id` and `causal_id` from a real
   `evaluateCampaignDecision` call. A play without all three is a rejection, not a degraded play.
2. `assertNoSyntheticOutcome` re-reads each axis value from the referenced evaluation object and
   requires exact equality. Any transformation — averaging, smoothing, scaling, curve-fitting
   across the depth grid — fails.
3. `validateOutcomeFrontier` rejects any payload key matching
   `/interpolat|derived_from_plays|between_plays|fitted|smoothed|projected_play/i`.

A "what if we went to 12%?" question is answered by **generating and evaluating a 12% play**, or it
is not answered.

### 5.6 `OutcomeFrontier`

```ts
export interface DominanceRelation {
  play_id: string;
  dominated_by: string[];             // play_ids; [] for frontier members
}

export interface OutcomeFrontier {
  frontier_id: string;
  campaign_intent_id: string;         // the anchor
  tenant_id: string;
  session_id: string;

  frontier_status: 'EMITTED' | 'NOT_EMITTED';
  not_emitted_reason?:
    | 'ANCHOR_MODEL_INTEGRITY_FAILURE'
    | 'AMBIENT_FRAME_DIVERGENCE'
    | 'SCENARIO_ZERO_ABSENT';

  ambient_frame: AmbientFrameStamp;   // the comparison-set frame
  axes: OutcomeAxisDeclaration[];     // admitted axes, directions, epsilon
  dominance_epsilon: Record<string, number>;

  plays: StrategyPlay[];              // ALL generated plays, admissible or not
  frontier_play_ids: string[];        // non-dominated ∩ admissible
  dominance: DominanceRelation[];     // complete relation, including for Scenario 0
  tied_groups: string[][];

  scenario_zero: ScenarioZeroReference;   // §6 — mandatory
  selection: FrontierSelection;           // §9
  generation_policy: PlayGenerationPolicy; // §10

  calculation_mode: 'deterministic_demo_frontier';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
}
```

---

## 6. Scenario 0 — Do Nothing

### 6.1 Mandatory and first-class

Exactly one play with `play_kind: 'DO_NOTHING'` and `intervention_posture: 'CONSIDER_DO_NOTHING'`
must be present in every frontier. Its absence is a hard failure —
`not_emitted_reason: 'SCENARIO_ZERO_ABSENT'` — not a degraded output.

### 6.2 Scenario 0 is a real evaluation, not a zero row

Do Nothing is evaluated through `evaluateCampaignDecision` like every other play, and carries a real
`counterfactual_id` and `causal_id`. Its measured ambient movement is `+1.42pp`, index `101.42` —
**the world moves whether or not we act**, and Scenario 0 shows it. Its CDI-05 decomposition has a
populated ambient group and an all-zero, unattributed intervention group, exactly as CDI-02's
`noIntervention` branch produces (`lib/campaign-causal-engine.ts:430`).

### 6.3 Scenario 0 is the origin of the axis space

Because both admitted axes are intervention-attributable deltas measured against each play's own
counterfactual, Do Nothing sits at exactly `(0.00 pp, £0.00)` **by construction, not by convention**.
Every other play's coordinates therefore read directly as *what you gain and what you give up versus
not acting*. This is why the delta form of the axes was chosen: it makes Scenario 0 structurally
first-class rather than rhetorically first-class.

### 6.4 Scenario 0 may be dominated — and must still be shown

Measured: Promotion @5% at `(6.41, +£488.19)` **dominates** Do Nothing at `(0.00, £0.00)` on both
admitted axes. This is a legitimate result and CogniX must report it plainly.

**Dominance is reported, never used to remove Scenario 0.** `dominance` publishes
`{ play_id: <do_nothing>, dominated_by: ['<promo_05>', …] }` and the surface states it in words.

Suppressing a dominated Do Nothing would be the single easiest way to make the product quietly
pro-intervention: the option to not act would vanish exactly in the cases where acting looks good,
which are precisely the cases a reviewer most needs to see it. Scenario 0 is additionally **exempt
from admissibility exclusion** — it is displayed even if CDI-04 vetoes it, and such a veto is itself
surfaced as a notable finding rather than absorbed.

### 6.5 Do Nothing is not "no change"

The surface must never render Scenario 0 as a flat line or as "nothing happens". The mandatory
framing, consistent with the CDI-02 contract comment at `campaign-counterfactual-model.ts:84`:

> Do Nothing means no intervention. It does not mean no change — ambient demand movement continues
> either way, and is shown here.

---

## 7. Non-Promotion Alternatives — Ruling

### 7.1 The question

Can the current deterministic estate truthfully support non-promotion alternatives?

### 7.2 The finding

**Partly — and the incomplete half flatters the play.**

The demand side is genuinely evaluated. `CONSIDER_NON_PROMOTION` drives a real
`non_promotion_response` driver (`+4.07pp` measured), classed `intervention`, reconciled through the
same validator as every other driver, yielding `+8.99pp` total intervention uplift. This is not a
placeholder and not a proxy.

The cost side does not exist. Measured against the same anchor, non-promotion returns
**`+£1,663.15`** contribution delta — 3.4× the best promotion play — because it uniquely receives:

- the full `£1.85` unit contribution with **no promotional erosion**,
- **no portfolio / cannibalisation drag** (promotion carries `−1.2pp`),
- and **no execution cost**, because CDI-02 contains no cost term of any kind.

Stock reallocation and assortment change consume labour, logistics, capital and markdown risk. None
of it is modelled. The consequence is structural, not incidental: **non-promotion is guaranteed to
dominate every promotion play on both admitted axes, for a reason that is an artefact of what is
absent from the model.**

### 7.3 Ruling — `PRESENTED_NOT_RANKED`

Non-promotion is **contracted and generated as a first-class play**, and is **excluded from the
dominance computation in both directions** — it can neither dominate nor be dominated — until
authoritative `intervention_execution_cost_gbp` **or equivalent economics** exists (owner ruling U4,
§12.1). `intervention_execution_cost_gbp` is the named instance of that unlock, not the only
admissible form: any equivalent authoritative cost basis discharges it, and no assumed, defaulted or
proxied substitute does.

| Aspect | Ruling |
| --- | --- |
| Generated | Yes, by rule `G2`, whenever the estate supports the posture |
| Outcomes shown | Yes — the true, unaltered CDI-02 numbers. No cost is invented to make it lose |
| Suppressed | No. Hiding it would be its own falsehood |
| `admissibility` | `EXCLUDED_ECONOMICS_INCOMPLETE` |
| In `frontier_play_ids` | No |
| Eligible as `selected_play` | No |
| Required label | `economics_completeness: 'DEMAND_MODELLED_COST_UNMODELLED'` |

```ts
export type EconomicsCompleteness = 'COMPLETE_ON_ADMITTED_AXES' | 'DEMAND_MODELLED_COST_UNMODELLED';

export const NON_PROMOTION_REQUIRED_INPUT: RequiredAuthoritativeInput = {
  field: 'intervention_execution_cost_gbp',
  grain: 'per intervention per campaign period, fully loaded',
  why_required:
    'a non-promotion lever earns uplift with no modelled cost, so its contribution delta is ' +
    'incomplete in a direction that flatters it; without this term it cannot be ranked against ' +
    'promotion plays that do carry contribution erosion and portfolio drag',
  inadmissible_substitutes: [
    'assuming zero execution cost',
    'reusing promotional contribution erosion as a proxy',
    'any default or assumed cost rate'
  ],
  enables: 'NON_PROMOTION_RANKING',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
};
```

Mandatory disclosure on the play:

> This alternative's demand response is modelled. Its execution cost is not. Its contribution is
> therefore incomplete in its own favour, and it is shown for comparison rather than ranked against
> the promotion strategies.

### 7.4 Why this is the honest position

The gate instruction has two halves and they pull in opposite directions here: *do not invent
non-promotion economics where no deterministic evaluation exists*, and *promotion must not be
assumed to be the correct intervention*. A demand evaluation **does** exist, so declaring
non-promotion unavailable would understate the estate and would quietly re-privilege promotion. The
cost evaluation **does not** exist, so ranking it would let a modelling gap win the frontier and
would be read by a user as evidence that promotion is unnecessary.

`PRESENTED_NOT_RANKED` is the only position that manufactures nothing in either direction: the
alternative is visible, its numbers are true, and the single reason it cannot yet be ranked is
stated on its face along with the input that would fix it.

---

## 8. Readiness & Evidence Integration

### 8.1 CDI-04 — constrains and annotates, never rewrites

Readiness is evaluated **per play**, against that play's own intent, under the same ambient frame
(`include_signals: false` for ARF-A) and with a caller-supplied `evaluation_timestamp` so scoring is
deterministic.

```ts
export interface PlayReadinessReference {
  readiness_id: string;
  state: ReadinessState;
  headline: string;
  vetoes: ReadinessVeto[];            // carried verbatim from CDI-04
  conditions: ReadinessCondition[];
  state_caps_applied: string[];
  commercial_tolerance: CommercialToleranceAssessment;
}
```

| Readiness state | Effect on the play |
| --- | --- |
| `GO` / `CONDITIONAL_GO` | Admissible; conditions and caps annotated |
| `REVIEW` | Admissible; annotated. Never silently promoted or demoted |
| `DO_NOT_PROCEED` | `INADMISSIBLE_VETOED`; veto id and basis carried verbatim; still displayed |

Absence of a readiness assessment degrades annotation only and never blocks the frontier — the
CDI-05 §7.3 treatment of CDI-04 as an INTEGRATION rather than HARD dependency, applied unchanged.

Measured behaviour confirming this integration discriminates usefully: across the seven-play set all
plays returned `CONDITIONAL_GO` with caps `K2|K3|K4`, and the three negative-contribution plays
additionally carried cap `K7` — so readiness already separates value-destroying plays without any
CDI-06 logic.

### 8.2 The non-negotiable guard

`assertReadinessDidNotRewriteEconomics` re-reads every play's axis values from its referenced CDI-02
evaluation and requires exact equality, **regardless of readiness state**. A vetoed play shows the
same numbers it would have shown unvetoed. Readiness changes what a play is *allowed to be*, never
what it *is*.

### 8.3 CDI-05 — the explanation layer, reused not redefined

Every play carries a `DemandDecomposition` produced for its own evaluation. CDI-06 defines no second
decomposition, no second driver taxonomy and no second reconciliation.

- A play whose decomposition fails `reconciliation_ok` is excluded under **B1**.
- If the *anchor's* decomposition fails, no frontier is emitted.
- **Cross-play comparison is on the intervention group only.** By F-INV-1 the ambient group is
  identical across every play, so presenting an ambient difference between plays would be
  presenting zero as a finding — and any non-zero ambient difference is a frame violation, not a
  strategy insight.

### 8.4 Evidence, confidence and labelling

- `EvidenceStrength`, `EVIDENCE_STRENGTH_ORDER`, `weakestEvidenceStrength`, `ConfidenceBand` and
  `ReadinessEvidenceRef` are imported from `campaign-readiness-model.ts`. No new taxonomy.
- A play's `evidence_strength_floor` is the weakest strength across its axis values, its
  decomposition and its readiness reference, computed with `weakestEvidenceStrength`.
- `synthetic_demo` propagates from the anchor to every play. Synthetic and proxy evidence remains
  truthfully labelled at play level, not only at frontier level — a user comparing cards must not
  have to open the envelope to learn the numbers are synthetic.
- Missing-data behaviour is uniform: a missing input **removes a capability and says so**; it never
  produces a substituted, defaulted or interpolated value. An axis that cannot be computed for a
  play makes that play `INADMISSIBLE_MODEL_INTEGRITY`; a dimension that cannot be computed for any
  play is `NOT_AVAILABLE` with its `RequiredAuthoritativeInput` published.

---

## 9. Recommendation & "Balanced" Semantics

### 9.1 Design position

**CogniX does not compute a recommendation. It computes a selection, and the selection is a pure
function of declared constraints applied to the frontier.**

There is no balanced score, no weighting vector, no midpoint, no default preference. Every play that
leaves the frontier does so because a **named, human-attributable constraint removed it**, and the
constraint that removed it is published.

### 9.2 The filter chain

Constraints **remove** plays. They never add points, never trade off against each other, and never
compensate. The chain is:

1. **Frontier** — admissible, non-dominated. Pure axis geometry (§5).
2. **Declared constraints**, each carrying `declared_by` and a `constraint_id`. All three sources
   already exist in the estate:

   | Constraint | Source | Measured effect |
   | --- | --- | --- |
   | `max_contribution_sacrifice_gbp` | `EconomicTolerance` (CDI-04), declared by a named human | With £500 declared, Promotion @30% vetoed `V3b:DECLARED_TOLERANCE_EXCEEDED`, published headroom −£594.63 |
   | Objective class | `deriveCommercialObjectiveClass` (CDI-04) from CDI-01 `baseline_objective` | With `VALUE_CREATION`, every negative-contribution play vetoed `V3a:STATED_OBJECTIVE_CONTRADICTION` |
   | `minimum_attributable_uplift_pp` | Declared business floor (new, CDI-06 local), requires `declared_by` | Removes plays below the declared floor |

3. **Outcome** — one of exactly three states.

### 9.3 The three selection states

```ts
export type SelectionStatus = 'SELECTED' | 'CHOICE_REQUIRED' | 'NO_ADMISSIBLE_PLAY';

export type SelectionBasis =
  | 'UNIQUELY_ADMISSIBLE_UNDER_DECLARED_CONSTRAINTS'
  | 'BALANCED_UNDER_DECLARED_CONSTRAINTS';

export interface ConstraintElimination {
  play_id: string;
  constraint_id: string;
  declared_by: string;
  statement: string;                  // why this play was removed, in the user's terms
}

export interface FrontierSelection {
  status: SelectionStatus;
  selected_play_id?: string;
  selection_basis?: SelectionBasis;
  constraints_in_force: DeclaredConstraint[];
  eliminations: ConstraintElimination[];      // complete and ordered — every removal, auditable
  open_trade_off?: string;                    // required when status = CHOICE_REQUIRED
  resolving_constraint_hint?: string;         // the smallest declaration that would resolve it
  binding_constraint_id?: string;             // required when status = NO_ADMISSIBLE_PLAY
}
```

**`SELECTED`** — exactly one play survives every declared constraint. Published with the complete
ordered elimination list, so a reader can audit every removal and re-derive the result by hand.

**`CHOICE_REQUIRED`** — more than one survives. CogniX names all survivors, states precisely which
trade-off remains open, and **refuses to pick**. It also publishes
`resolving_constraint_hint`: the smallest additional declaration that would resolve the choice —
turning the refusal into a next step rather than a shrug. Example: *"These four differ only in
volume against contribution. No declared constraint separates them. Declaring a maximum contribution
sacrifice below £360 would leave two; adding a minimum attributable uplift of 8pp would leave one."*

**`NO_ADMISSIBLE_PLAY`** — nothing survives. The binding constraint is named. Scenario 0 remains
displayed, because "no admissible intervention" is a decision, not an error.

### 9.4 What "Balanced" may legitimately mean

`BALANCED_UNDER_DECLARED_CONSTRAINTS` is permitted **only** when all four hold:

1. The selection status is `SELECTED` — the survivor is **unique**.
2. The survivor is itself **Pareto-efficient** — its `play_id` is in `frontier_play_ids`. A unique
   survivor that is not a frontier member may not carry the label.
3. At least two constraints are in force.
4. Those constraints act on **opposing axes** — at least one bounds contribution and at least one
   bounds volume.

Under those conditions "Balanced" is a *uniqueness result*, and the claim CogniX is making is
mathematical rather than aesthetic: *given what you declared, exactly one strategy survives.* The
balance was supplied by the human's declared constraints; CogniX's contribution is proving that the
balance point is unique.

**Worked example, from the measured set.** Declare `VALUE_CREATION` (contribution must not be
sacrificed — bounds the contribution axis) and `minimum_attributable_uplift_pp = 8.0` (bounds the
volume axis):

| Play | Uplift | Contribution | Outcome |
| --- | --- | --- | --- |
| Promotion @5% | 6.41 | +£488.19 | Removed — below declared uplift floor |
| Promotion @10% | 9.02 | +£238.50 | **Survives** |
| Promotion @15% | 11.64 | −£42.23 | Removed — `V3a` objective contradiction |
| Promotion @20% | 14.25 | −£359.60 | Removed — `V3a` objective contradiction |
| Promotion @30% | 19.47 | −£1,094.63 | Removed — `V3a` objective contradiction |

Unique survivor, two constraints, opposing axes → `BALANCED_UNDER_DECLARED_CONSTRAINTS`. No weight
was applied at any point, and every elimination names the constraint that caused it.

If the user declared nothing, or if the survivors are not unique, **the word may not appear.**

### 9.5 Controlled vocabulary

The label on a play is drawn from a closed list and describes *what the play is*, never *how good it
is*: `Do Nothing`, `Your Stated Plan`, `Shallow Depth Promotion`, `Moderate Depth Promotion`,
`Deep Discount Promotion`, `Non-Promotion Alternative`.

**Prohibited anywhere in the CDI-06 payload or surface**: `optimal`, `best`, `recommended`, `winner`,
`top choice`, `ideal`, `sweet spot`, and `balanced` except under §9.4. `validateOutcomeFrontier`
rejects a payload where `/balanced/i` appears on any play whose `selection_basis` is not
`BALANCED_UNDER_DECLARED_CONSTRAINTS`, or where fewer than two opposing constraints are in force.

---

## 10. Deterministic Strategy-Generation Boundary

### 10.1 Generation is a declared, versioned, closed policy

Structured after `ReadinessThresholdPolicy`, which is the established house pattern for "these
values are lab defaults, not learned parameters":

```ts
export interface PlayGenerationRule {
  rule_id: 'G0' | 'G1' | 'G2' | 'G3';
  play_kind: PlayKind;
  description: string;
  mandatory: boolean;
}

export interface PlayGenerationPolicy {
  policy_id: string;
  policy_version: string;
  provenance: 'synthetic_demonstration_policy';
  synthetic_demo: true;
  rules: PlayGenerationRule[];
  depth_grid_pct: number[];           // declared build-time constant
  calibration_target: string;
}
```

| Rule | Play | Mandatory |
| --- | --- | --- |
| `G0` | Scenario 0 — Do Nothing | **Yes** |
| `G1` | Promotion plays across the declared depth grid | Yes, when the anchor supports a promotion posture |
| `G2` | Non-promotion alternative | Yes, when the estate supports the posture (`PRESENTED_NOT_RANKED`, §7) |
| `G3` | The anchor as stated — the user's own plan, always a play | **Yes** |

`G3` matters: without it the frontier answers "what could you do" but never "how does *my* plan
compare", which is the question the user actually arrived with.

### 10.2 The depth grid is a build-time constant

`depth_grid_pct` is declared in the policy and is **not caller-configurable**. Any request carrying
`play_grid_override`, `depth_grid_override` or `policy_overrides` is rejected with `RJ-G1`, mirroring
the CDI-05 `RJ4` treatment of allocation-profile overrides. A caller-supplied grid is a caller-
supplied conclusion.

### 10.3 Reproducibility

Same anchor + same `policy_version` + same ambient frame ⇒ **byte-identical frontier**, excluding
only the fields legitimately derived from wall-clock time (`timestamp`, `evaluation_id`). Verified
by re-running generation and comparing the payload with those fields elided.

### 10.4 The LLM boundary

**Core strategy generation, evaluation, admissibility, dominance, frontier membership and selection
are pure deterministic functions with zero LLM involvement.** Removing the narrative layer entirely
must change nothing except prose.

A generative narrative layer, if added later, may only:

- receive an already-computed, already-validated `OutcomeFrontier`;
- produce prose *about* it;
- be labelled non-authoritative and rendered separately from the computed values.

It may **not** introduce a play, alter or restate a number, propose an ordering, influence
admissibility, or generate a selection. A proposed variant from a narrative layer is not a play
until it has been converted into a `PlayIntentDelta`, passed Stage A, and been **actually
evaluated** through CDI-02 — at which point it is a deterministic play like any other.

Acceptance test: the frontier computed with the narrative layer disabled is byte-identical to the
frontier computed with it enabled.

---

## 11. Adversarial Acceptance Criteria

Each criterion is written as an attack. The implementation passes only when the attack fails.

**Frontier integrity**

1. Construct two plays with identical axis values within `ε`. Assert both appear on the frontier, in
   one `tied_group`, and that neither is recorded as dominating the other.
2. Force one member to be evaluated with `include_signals: true` while the rest use `false`. Assert
   `frontier_status: 'NOT_EMITTED'`, `not_emitted_reason: 'AMBIENT_FRAME_DIVERGENCE'`, and that the
   divergent `ambient_uplift_pp` values are published per play.
3. Assert every emitted frontier has one identical `ambient_uplift_pp` and one identical
   `expected_without_intervention.volume_index_pct` across **all** members.
4. Serialise the payload and assert no key matches
   `/score|weight|composite|utility|ranking|rank_index|priority_value/i`.
5. Serialise the payload and assert no key matches
   `/interpolat|derived_from_plays|between_plays|fitted|smoothed|projected_play/i`.
6. Mutate one play's `contribution_delta_gbp` after evaluation. Assert `assertNoSyntheticOutcome`
   fails and no frontier is emitted.
7. Reorder the generated play array and re-run. Assert `frontier_play_ids`, `dominance` and
   `selection` are unchanged.
8. Re-run generation in a fresh process. Assert byte-identical output with `timestamp` and
   `evaluation_id` elided. Assert no `play_id` changed.

**Scenario 0**

9. Remove the Do Nothing play. Assert `not_emitted_reason: 'SCENARIO_ZERO_ABSENT'` and that no
   partial frontier is emitted.
10. Construct a set where Promotion @5% dominates Do Nothing. Assert Do Nothing is **still present**,
    is **not** in `frontier_play_ids`, and that `dominance` records
    `{ play_id: <do_nothing>, dominated_by: ['<promo_05>'] }`.
11. Assert Scenario 0's axis values are exactly `(0.00, 0.00)` and that its decomposition has a
    **non-empty ambient group** — a Do Nothing whose ambient movement is zero while
    `ambient_uplift_pp ≠ 0` is a failure. Assert its `waste_delta_units` is exactly `0`: a non-zero
    waste delta on a play that by construction does nothing is the D2 regression (§1.5), and a
    Scenario 0 ambient of `1.57` rather than `1.42` under signals is the D1 regression.
12. Assert Scenario 0 is present even when its readiness state is `DO_NOT_PROCEED`.
13. Scan the surface for any rendering of Scenario 0 as "no change", a flat line, or an absence.
    Assert the ambient-movement framing (§6.5) is present.

**Non-promotion**

14. Generate a non-promotion play. Assert `admissibility: 'EXCLUDED_ECONOMICS_INCOMPLETE'`, that it
    is absent from `frontier_play_ids`, that it appears in **no** `dominated_by` list and dominates
    nothing, and that it is **not** eligible as `selected_play_id`.
15. Assert its outcome values are the unaltered CDI-02 values (`+8.99pp`, `+£1,663.15` on the
    reference anchor) — no invented cost has been subtracted to make it lose.
16. Assert `NON_PROMOTION_REQUIRED_INPUT` is published on the play and its disclosure is present.

**Readiness**

17. Evaluate a play twice, once with a readiness veto in force and once without. Assert the axis
    values are **identical** in both. Assert `assertReadinessDidNotRewriteEconomics` passes.
18. Declare `EconomicTolerance` of £500. Assert Promotion @30% carries `V3b`, published headroom
    −£594.63, `INADMISSIBLE_VETOED`, is excluded from dominance, and is **still displayed** with its
    true outcomes.
19. Set `primary_metric: 'CONTRIBUTION'`. Assert every negative-contribution play carries `V3a` and
    that the elimination list names `V3a` as the cause for each.

**Selection and "Balanced"**

20. Run with **no** declared constraints. Assert `status: 'CHOICE_REQUIRED'`, that all frontier
    members are named, that `open_trade_off` is populated, and that **no** play is marked selected,
    recommended or balanced.
21. Declare `VALUE_CREATION` + `minimum_attributable_uplift_pp: 8.0`. Assert a unique survivor
    (Promotion @10%), that its `play_id` is in `frontier_play_ids`,
    `selection_basis: 'BALANCED_UNDER_DECLARED_CONSTRAINTS'`, and that the elimination list accounts
    for **every** other frontier member with a named constraint. Then construct a case whose unique
    survivor is **not** a frontier member and assert the balanced label is refused.
22. Declare a single constraint that yields a unique survivor. Assert the basis is
    `UNIQUELY_ADMISSIBLE_UNDER_DECLARED_CONSTRAINTS` and that the word "balanced" does **not** appear.
23. Declare two constraints on the **same** axis yielding a unique survivor. Assert the basis is
    *not* `BALANCED_UNDER_DECLARED_CONSTRAINTS` — opposing axes are required.
24. Scan the payload and surface for `optimal`, `best`, `recommended`, `winner`, `ideal`,
    `sweet spot`. Assert none appears.
25. Declare constraints that eliminate everything. Assert `NO_ADMISSIBLE_PLAY`,
    `binding_constraint_id` populated, and Scenario 0 still displayed.

**Generation boundary**

26. Submit `play_grid_override`. Assert rejection `RJ-G1` and that no frontier is computed.
27. Generate a promotion play whose mechanic is `cdi01_placeholder_default`. Assert
    `INADMISSIBLE_UNSTATED_MECHANIC`, and specifically assert it is **not** emitted as a promotion
    play whose numbers happen to equal Do Nothing.
28. Assert `registerCampaignIntent` is never called during frontier generation, and that the CDI-01
    store contains exactly the intents it held before the call.
29. Disable the narrative layer. Assert the frontier is byte-identical to the enabled run.
30. Assert no `play_id` contains a timestamp, counter or `evaluation_id` substring; assert
    `play_id`s are stable across processes.

**Truthfulness of unavailability**

31. Assert `revenue_delta_gbp` is present, `NOT_AVAILABLE`, and reuses `REVENUE_REQUIRED_INPUT`
    without redefining it. Assert no revenue figure is derived from list price, contribution or an
    assumed margin anywhere in CDI-06.
32. Assert `waste_delta_units` appears as an annotation with its disclosure and its `admissible_when`
    condition, is absent from `axes`, and does not influence any dominance result. Assert it takes
    exactly two values across the play set (`0` for Scenario 0, `−14` for every intervention), and
    that recomputing the frontier with waste added as a third axis changes **no** frontier
    membership — the inertness claim in §4.3 must hold, not merely be asserted.
33. Assert `synthetic_demo` is present and true on **every play**, not only on the frontier envelope.

---

## 12. Owner Rulings

### 12.1 Closed — approved 2026-08-15, binding and not reopenable at implementation

**U1 — Ambient Reference Frame. APPROVED as recommended.**

> Ship ARF-A / `SIGNALS_EXCLUDED` as the initial admissible frontier reference frame. ARF-B remains
> contracted but unavailable until a shared ambient signal capability can guarantee identical
> counterfactual context across plays.

`AmbientFrameMode` is frozen with `SIGNALS_EXCLUDED` as the only emitting mode. `SIGNALS_SHARED` is
declared, marked `UNAVAILABLE`, and publishes its unlock condition: **a shared ambient signal
capability that guarantees identical counterfactual context across every play in a comparison set.**
It must not be emulated or approximated. Frame conformance remains verified per F-INV-1 (§5.3) rather
than assumed, in both modes.

**U4 — Non-promotion alternatives. APPROVED as recommended.**

> Non-promotion alternatives are `PRESENTED_NOT_RANKED` until authoritative
> `intervention_execution_cost_gbp` or equivalent economics exists. Their evaluated demand/economic
> outputs must remain visible and unaltered, but they participate in dominance in neither direction.

Rule `G2` emits. The unlock condition is **authoritative execution economics**, of which
`intervention_execution_cost_gbp` (§7.3) is the named instance and not the only admissible form; any
equivalent authoritative cost basis discharges it, and no assumed, defaulted or proxied substitute
does. Until then the play is generated, its unaltered CDI-02 outputs are displayed, and it is
excluded from dominance in both directions.

**Restated and binding (owner, 2026-08-15):**

- **Do Nothing remains first-class and visible even when dominated.** Confirms §6.4. Dominance is
  reported; Scenario 0 is never removed, greyed out, collapsed or reordered on the basis of being
  dominated — in the contract or on the surface.
- **`Balanced` may only be surfaced when declared human/business constraints leave a unique
  Pareto-efficient survivor and at least two *opposing* objective constraints participated.**
  Confirms §9.4, and makes explicit that the survivor must itself be a frontier member — a unique
  survivor that is not Pareto-efficient may not carry the label.
- **No hidden weights, utilities or composite optimisation scores.** Confirms §5.4 and is enforced by
  `assertNoHiddenAggregate` and the `validateOutcomeFrontier` key scan, including for unused fields.

### 12.2 Open — non-blocking

| Id | Decision | Recommendation |
| --- | --- | --- |
| **U2** | **Defect D1** — `promotion_lift \|\| 20` read zero depth as 20%. | **DISCHARGED** by the interim correction (§1.5), committed as `6afc44cd`. Fixed outside CDI-06 as recommended. Note it was also a **precondition for the U1 unlock**: no shared ambient capability could have guaranteed identical counterfactual context while a zero-depth member silently drew a 20%-lift world. That precondition is now met, though ARF-B remains unavailable on its own terms. Regression-guarded by **AC-11**. |
| **U3** | **Defect D2** — waste was label-derived, giving Do Nothing a 34-unit waste improvement for taking no action. | **DISCHARGED** by the interim correction (§1.5), committed as `6afc44cd`. §4.3 revised: the artefact basis is withdrawn and the ruling now rests solely on degeneracy. Regression-guarded by **AC-11** and **AC-32**. |
| **U5** | **Depth grid values** for `G1`. | Owner sign-off on the declared constants. Recommend a grid spanning both sides of the contribution breakeven (~13–15% depth per the CDI-02 erosion calibration) so the frontier demonstrates a real trade-off rather than a monotone ramp. Non-blocking: the policy shape is frozen, only the constants are open. |
| **U6** | **Planning-record divergence** (§1.4): the planning report anticipates revenue, waste and availability axes and "4 strategy plays". | Reconcile the planning row **after** implementation, per the CDI-05 §8.2 precedent. Do not narrow CDI-06's contract to match an aspirational row. |

---

## 13. Contract-Freeze Verdict

**DESIGN FROZEN. CONTRACT FROZEN. CLEARED FOR IMPLEMENTATION.**

- The domain model (§2), admissibility model (§3), outcome dimensions (§4), Pareto semantics (§5),
  Scenario 0 semantics (§6), non-promotion ruling (§7), integration surface (§8), selection semantics
  (§9), generation boundary (§10) and acceptance criteria (§11) are frozen and implementable as
  written.
- **Both blocking owner rulings are closed (§12.1), each approved as recommended.** `AmbientFrameMode`
  is frozen with `SIGNALS_EXCLUDED` as the only emitting mode and `SIGNALS_SHARED` contracted-
  unavailable with its unlock condition published (U1); rule `G2` emits the non-promotion play as
  `PRESENTED_NOT_RANKED`, visible and unaltered, excluded from dominance in both directions, unlocked
  only by authoritative execution economics (U4). The freeze is **no longer conditional**.
- The three restated owner positions in §12.1 — Do Nothing first-class even when dominated, the
  `Balanced` uniqueness conditions, and the prohibition on hidden weights, utilities and composite
  scores — are binding and land as §6.4, §9.4 and §5.4, with acceptance criteria AC-10, AC-21, AC-23
  and AC-4 respectively.
- **U2 and U3 are discharged** by the interim causal-integrity correction (§1.5), committed
  independently as `6afc44cdda57a29151006fa122a4f1bf6ff47214` and converged on both remotes ahead of
  this freeze. The gate has been re-measured against the corrected estate: the admitted
  axes, the readiness behaviour and every worked example are unchanged, C1 strengthens, and §4.3 is
  revised to rest on degeneracy alone. **U5 and U6 remain open and non-blocking** — U5 is a constant
  to sign off against a frozen policy shape, U6 a documentation reconciliation deferred to
  implementation.
- **Implementation must proceed against the corrected estate** — `6afc44cd` or later. If the §1.5
  correction is ever reverted, acceptance criteria AC-11 and AC-32 will fail, which is the intended
  detection path.
- **No CDI-01/02/03/04/05 contract requires modification.** No proven blocker exists. The two
  candidates for one — the shared ambient frame and non-promotion cost — are both resolved inside
  CDI-06 by narrowing the frame (ARF-A) and by declaring an unavailability (`PRESENTED_NOT_RANKED`),
  rather than by editing frozen upstream contracts.
- Governance actions deferred to implementation, per the CDI-04 U7 and CDI-05 precedents: ADR
  recorded, `MASTER_PLAN` §CDI-06 row updated, and the planning-report row (§1.4) reconciled.

---

## 14. Implementation Execution Profile

The work is contract-first, deterministic, and every judgement call is resolved in this gate: the
axes are fixed at two with the third and fourth explicitly unavailable, the invariants are written as
machine-checkable predicates with named guard functions, the evidence and confidence taxonomies are
imported from CDI-04 rather than designed, and the acceptance criteria are phrased as failing
attacks. What remains is disciplined transcription plus a large regression suite — the CDI-02
through CDI-05 pattern.

**An independent adversarial review pass before commit is mandatory.** CDI-02, CDI-03, CDI-04 and
CDI-05 each shipped defects found by independent review *after* implementation, not by their own
delivered suites. CDI-06 carries a distinct risk profile from all of them: **its output is a
recommendation.** A defect in a timeline is a misleading picture; a defect in a frontier is a
misleading *decision*, and it arrives wearing the authority of a mathematical result.

The review must probe, in this order:

1. **Hidden aggregation.** Any scalar that orders plays — a sort key, a debug field, a tie-break that
   is not `play_id`, a "priority" left over from a draft. (§5.4, AC-4, AC-7)
2. **Ambient frame leakage.** Any path where one member is evaluated under a different signal
   setting, or where the frame is assumed rather than asserted. (F-INV-1, AC-2, AC-3)
3. **Scenario 0 erosion.** Any path that drops, greys out, collapses or reorders Do Nothing when it
   is dominated — including surface-only suppression that the contract tests would not catch.
   (§6.4, AC-9 to AC-13)
4. **Non-promotion rank creep.** Any path where the excluded play reaches `frontier_play_ids`, a
   `dominated_by` list, or the selection. (§7.3, AC-14 to AC-16)
5. **Selection overreach.** Any path that names a survivor when more than one remains, or that emits
   "balanced" without two opposing declared constraints and a unique survivor. (§9.4, AC-20 to AC-24)
6. **Synthesised outcomes.** Any value on a play that is not read directly from a real CDI-02
   evaluation — especially a convenience recomputation that happens to agree today. (§5.5, AC-6)
7. **Readiness rewriting economics.** Any path where a veto, cap or condition changes a displayed
   number rather than a displayed status. (§8.2, AC-17)

---

## 15. Implementation Prompt — CDI-06

```text
COGNIX - CDI-06 IMPLEMENTATION (Multi-Objective Outcome Frontier & Competing Strategies)

Branch: Feature/MatchingContract-AutoActivate
Baseline: 6afc44cdda57a29151006fa122a4f1bf6ff47214 (interim causal-integrity correction)
Design-assessment baseline: 64111eeab14d4542963e393c9d2f00dea81c53e8
Authoritative design: docs/reports/COGNIX_CDI_06_OUTCOME_FRONTIER_DESIGN_GATE.md
(DESIGN FROZEN - CONTRACT FROZEN - CLEARED FOR IMPLEMENTATION. Owner rulings U1 and U4
approved 2026-08-15 and CLOSED, together with the three restated positions in SS12.1.
The rulings are binding and not reopenable at implementation.)

Verify continuity first (branch, baseline, CDI-01/02/03/04/05 evidence present). The
interim causal-integrity correction described in SS1.5 (D1 promotion_lift ?? 20; D2 waste
clearance gated on intervention_uplift_pp > 0) is ALREADY COMMITTED in the baseline above,
together with its report. Confirm BOTH corrections are present in the tree before building
- the design is measured against the corrected estate. Expect a clean working tree at
start. Stop on any unexplained divergence.

OWNER RULINGS IN FORCE
- U1 Ambient Reference Frame. Every member of one frontier MUST be evaluated under an
  identical ambient frame, VERIFIED not assumed: identical causal.ambient_uplift_pp AND
  identical counterfactual.expected_without_intervention.volume_index_pct across all
  members. Ship ARF-A (SIGNALS_EXCLUDED, include_signals: false) as the only emitting
  mode. Contract ARF-B (SIGNALS_SHARED) and mark it UNAVAILABLE, publishing its unlock
  condition: a shared ambient signal capability that guarantees identical counterfactual
  context across plays. Do NOT emulate or approximate ARF-B. On divergence emit
  frontier_status NOT_EMITTED with reason AMBIENT_FRAME_DIVERGENCE and publish the
  divergent values per play.
- U4 Non-promotion is PRESENTED_NOT_RANKED until authoritative
  intervention_execution_cost_gbp OR EQUIVALENT ECONOMICS exists. Rule G2 emits.
  Generate it, show its true unaltered CDI-02 outcomes, label economics_completeness
  DEMAND_MODELLED_COST_UNMODELLED, publish NON_PROMOTION_REQUIRED_INPUT, and EXCLUDE it
  from dominance in BOTH directions. Do NOT invent, assume, default or proxy an execution
  cost. Do NOT suppress it. Never eligible as the selection.
- Scenario 0 remains first-class and visible EVEN WHEN DOMINATED. It is mandatory, is a
  real evaluation, sits at exactly (0.00, 0.00), MAY be dominated, and MUST still be
  displayed with its dominated_by list published - never removed, greyed out, collapsed
  or reordered for being dominated, in the contract or on the surface. Never render it as
  "no change" - ambient movement continues and is shown.
- Exactly TWO Pareto axes: attributable_volume_uplift_pp and contribution_delta_gbp,
  both DELTAS, never absolute levels. revenue_delta_gbp and availability_delta are
  contracted NOT_AVAILABLE. waste_delta_units and predicted_confidence are contracted
  NOT_ADMISSIBLE_AS_AXIS and carried as annotations with disclosures.
- NO hidden weights, utilities or composite optimisation scores. No score, weight,
  composite, utility or ranking field may exist anywhere in the payload, not even unused.
  Frontier membership is a pure function of the axis vector and the declared
  dominance_epsilon.
- NO interpolation. Every outcome value is read directly from a real CDI-02 evaluation
  bound by evaluation_id + counterfactual_id + causal_id.
- CogniX does NOT recommend. It SELECTS via a chain of declared, human-attributed
  constraints that only remove plays. More than one survivor => CHOICE_REQUIRED and
  refuse to pick. "Balanced" is permitted ONLY as BALANCED_UNDER_DECLARED_CONSTRAINTS:
  unique survivor that IS ITSELF PARETO-EFFICIENT (in frontier_play_ids), >= 2 declared
  constraints, acting on OPPOSING objective axes.
- Readiness constrains and annotates. It MUST NOT rewrite any economic value.

BUILD
1. packages/contracts/src/campaign-frontier-model.ts - types and validators per design
   gate SS2-SS10: StrategyPlay, PlayIntentDelta, PlayOutcomeVector, OutcomeAxisValue,
   UnavailableOutcomeDimension, NonAxisOutcomeAnnotation, AmbientFrameStamp,
   DominanceRelation, FrontierSelection, DeclaredConstraint, ConstraintElimination,
   PlayGenerationPolicy, OutcomeFrontier, NON_PROMOTION_REQUIRED_INPUT, plus
   validateOutcomeFrontier, validateFrontierRequest, assertAmbientFrameShared,
   assertNoSyntheticOutcome, assertNoHiddenAggregate, assertScenarioZeroPresent,
   assertDominatedScenarioZeroStillShown, assertNonPromotionNotRanked,
   assertReadinessDidNotRewriteEconomics, assertSelectionRefusesWhenAmbiguous,
   assertBalancedLabelLegitimate.
   IMPORT EvidenceStrength, EVIDENCE_STRENGTH_ORDER, weakestEvidenceStrength,
   ConfidenceBand, ReadinessEvidenceRef, ReadinessVeto, ReadinessCondition,
   ReadinessState, CommercialToleranceAssessment, EconomicTolerance,
   deriveCommercialObjectiveClass from campaign-readiness-model.ts. IMPORT
   RequiredAuthoritativeInput and REVENUE_REQUIRED_INPUT from campaign-timeline-model.ts.
   IMPORT DemandDecomposition from campaign-timeline-model.ts. Define NO new evidence,
   confidence, decomposition or unavailability taxonomy. Export from index.ts.
2. lib/campaign-frontier-engine.ts - pure, deterministic, zero React. Generates plays
   from the declared PlayGenerationPolicy, evaluates each through evaluateCampaignDecision
   using the INLINE campaign_intent path (never registerCampaignIntent), builds the
   decomposition per play from the CDI-05 engine, evaluates CDI-04 readiness per play with
   a caller-supplied evaluation_timestamp, computes admissibility, dominance, frontier
   membership, tied groups and the selection chain. play_id is a content hash of
   (anchor id, rule_id, canonicalised delta) - NEVER time-derived, never containing
   evaluation_id.
3. app/api/v1/campaigns/outcome-frontier/route.ts - orchestration only. All plays from
   one generation pass under one ambient frame. Reject play_grid_override /
   depth_grid_override / policy_overrides with RJ-G1.
4. Surface: strategy comparison grid + comparison drawer. Scenario 0 always present and
   never visually demoted when dominated. Excluded plays shown with their reasons.
   Unavailable dimensions shown as present-and-unavailable with their required inputs.
   No ranking language.
5. tests/unit/run-cdi06-tests.ts - implement ALL 33 adversarial acceptance criteria in
   SS11 as permanent regression tests. Re-run the CDI-01 through CDI-05 suites and the
   ESF/IFI/WP10 guardrails; all must remain green.

DO NOT
- Do not modify any CDI-01/02/03/04/05 contract.
- Do not re-fix or revert defects D1 and D2; they are already corrected in the baseline
  (SS1.5) and CDI-06 depends on that corrected behaviour. Do not extend the waste model
  beyond the clearance gating already applied.
- Do not add CDI-07 Half-Life, Pre-Mortem or Learning semantics.
- Do not add ESF-4/5 or any ML/LLM ranking.
- Do not commit or push until owner review.

Repository output must remain tool-agnostic: no model or tool identity, watermarks,
signatures, attribution, generated-by markers or co-author metadata.
```
