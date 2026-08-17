# COGNIX — CDI-05 DECISION TIMELINE & CURIOSITY-DRIVEN DEMAND DECOMPOSITION — INTELLIGENCE DESIGN GATE

| Field | Value |
|---|---|
| Work Package | CDI-05 — Decision Timeline & Curiosity-Driven Demand Decomposition |
| Gate type | Design & contract freeze — **no product implementation** |
| Authorised baseline | `f765598f28f31c07e2eeffb06a8a6ce81390b345` |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Gate date | 2026-08-15 |
| Owner rulings applied | 2026-08-15 — U1 (flat-rate identity allocation), U2 (Revenue lens unavailable), U3 (post-campaign contracted-and-empty), U4 (band-only on the primary timeline surface), plus the ambient-movement acceptance clarification (§9 AC-5) |
| Status | **DESIGN FROZEN — CONTRACT FROZEN — CLEARED FOR IMPLEMENTATION** |

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `f765598f28f31c07e2eeffb06a8a6ce81390b345` |
| Remotes | `gitlab` (`repo.glassx.ai/development/decision-intelligence`) + `origin` (`github.com/renjug10x/Decision_Intelligence`) — both present |
| Working tree | Clean |
| Stash | Empty |
| CDI-01 evidence | `docs/reports/COGNIX_CDI_01_CAMPAIGN_DECISION_CANVAS_REPORT.md` — CLOSED; `packages/contracts/src/campaign-intent-model.ts` frozen |
| CDI-02 evidence | `docs/reports/COGNIX_CDI_02_COUNTERFACTUAL_CAUSAL_REPORT.md` — CLOSED / independently verified; `campaign-counterfactual-model.ts`, `lib/campaign-causal-engine.ts` |
| CDI-03 evidence | `docs/reports/COGNIX_CDI_03_OPPORTUNITY_WINDOW_MICROMARKET_REPORT.md` — CLOSED after six corrections; `campaign-opportunity-model.ts`, `lib/campaign-opportunity-engine.ts` |
| CDI-04 evidence | `docs/reports/COGNIX_CDI_04_DECISION_READINESS_DESIGN_GATE.md` + `COGNIX_CDI_04_DECISION_READINESS_REPORT.md` — CLOSED; `campaign-readiness-model.ts`, `lib/campaign-readiness-engine.ts`; ADR-031 recorded |
| Governance | MASTER_PLAN §CDI lists CDI-01–CDI-04 `[COMPLETED]`, next package `CDI-05` (HARD on CDI-02, INTEGRATION on CDI-04, ENHANCEMENT on CDI-03). Highest recorded ADR is **ADR-031**; next free is **ADR-032** (reserved, recorded at implementation per CDI-04 precedent U7) |
| Unexplained divergence | **None — gate PASSED** |

### 1.1 Continuity findings carried into the design (no contract change)

Three facts about the frozen upstream shape the whole of CDI-05 and are recorded here so no downstream reader assumes otherwise.

1. **CDI-02 has no time series.** `CounterfactualBaseline` publishes exactly three scalar `DemandTrajectoryPoint`s (`CURRENT_BASELINE`, `EXPECTED_WITHOUT_INTERVENTION`, `PREDICTED_WITH_INTERVENTION`) and a single `horizon_days: 14`. There is no per-period demand anywhere in the estate. CDI-05 therefore does not *read* a timeline — it *constructs* one, and every degree of freedom it adds is a place where a second demand model could be smuggled in. §2 exists to close each of them.

2. **CDI-02 volumes are a weekly rate, not a horizon total.** `buildTrajectory()` computes `volume_units = BASE_WEEKLY_UNITS (10,000) × index_pct / 100` (`lib/campaign-causal-engine.ts:34,254`) while the same baseline declares `horizon_days: 14` (`:533`). The unit is a **weekly run-rate carried over a 14-day horizon**. Any timeline that spreads `volume_units` across periods and sums them produces a number CDI-02 never asserted. CDI-05 therefore reconciles in **index space (pp)** and treats volume, contribution and inventory as *renderings* of that index at CDI-02's own constants (§2.6). This is an inherited CDI-02 ambiguity, disclosed — **not corrected**.

3. **There is no unit price or revenue quantity in the estate.** `UNIT_CONTRIBUTION_GBP = 1.85` (`lib/campaign-causal-engine.ts:35`) is a *contribution* per unit. No `unit_price`, `asp` or revenue field exists in `campaign-counterfactual-model.ts`, `enterprise-world-model.ts` or `decision-state-model.ts`. The **Revenue lens has no source** and cannot be derived without inventing a price or a margin rate. This is handled as a declared unavailable lens (§2.6.2, U2), not by fabricating one and not by editing a frozen contract.

### 1.2 Naming divergence between governance records (docs-only, resolved)

`docs/governance/MASTER_PLAN.md:312` names the artefact **`DemandTimelineProjection`**; the planning report capability table (`COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md:190`) and this work package name it **`DecisionTimelineProjection`**.

**Ruling: `DecisionTimelineProjection` is authoritative.** The artefact carries four lenses — Demand, Revenue, Contribution, Inventory — plus readiness framing and contextual markers; naming it after one lens misdescribes it. `DemandDecomposition` keeps its name unchanged because CDI-06's dependency row (`MASTER_PLAN.md:382`) binds to that exact identifier. The MASTER_PLAN line is corrected at implementation as a documentation reconciliation. **No contract is modified.**

---

## 2. Timeline Model

### 2.1 Design position

The Decision Timeline is **not a forecast product**. It is a *temporal rendering of a decision that has already been computed elsewhere*. CDI-02 owns what the numbers are; CDI-05 owns only when they are said to apply, and must be provably incapable of changing them.

Three structural commitments follow, and everything in §2 is a consequence of one of them:

- **One series, four lenses.** There is exactly one underlying index series per trajectory. Demand, Revenue, Contribution and Inventory are projections of it, never independently computed series that could disagree.
- **Two trajectories, one shared ambient component.** Ambient movement is a *property of the world*, so it is carried identically on both trajectories by construction, not by convention.
- **Allocation redistributes; it never creates.** Whatever CDI-05 does across time must sum back to the exact CDI-02 endpoint. This is checkable, and §9 requires it to be checked.

### 2.2 Period grid

| Property | Rule |
|---|---|
| Grain | One point per **UTC day**. No sub-day points; no aggregated weeks. A single grain removes the need for any resampling arithmetic. |
| Campaign extent | From the **resolved window**: CDI-03 `recommended_window.{start_date, end_date}` when supplied, otherwise CDI-01 `audience_market.{planned_start, planned_end}`. Never invented. |
| Resolution rejection | `timing_mode = KNOWN_DATES` without a valid stated range and without a CDI-03 window ⇒ **rejection RJ2** (§3.6), never a defaulted grid. This upholds CDI-01/CDI-03 D4 at the timeline boundary. |
| Pre-campaign extent | Fixed at **14 days** before campaign start (matching CDI-02 `horizon_days`), so the extent is derived from a frozen field rather than chosen. |
| Post-campaign extent | Fixed at **14 days** after campaign end, on the same basis. |
| ESF-2 alignment | Each point additionally carries `simulation_period?: SimulationPeriod` where the offset from campaign start maps onto the frozen `ORDERED_SIMULATION_PERIODS` grid (`T-90`…`T+30`), so signal markers align to points without CDI-05 defining a second time vocabulary. |

### 2.3 Phases — and what each is permitted to assert

| Phase | What CDI-05 may assert | What it may never assert |
|---|---|---|
| `PRE_CAMPAIGN` | The CDI-02 **current-baseline run rate**, held flat at `index_pct = 100`, at strength `DERIVED`, carrying the disclosure *"modelled run-rate, not observed history"* | Any variation whatsoever. A pre-campaign line that moves is fabricated history — there is no demand history in this estate |
| `CAMPAIGN` | Both trajectories, decomposed into ambient and intervention components, reconciling exactly to CDI-02 at the terminal point | Any within-campaign shape beyond the identity allocation (§2.5) |
| `POST_CAMPAIGN` | **Nothing numeric.** Both components are `null` with `not_modelled_reason` | Persistence, decay, payback, pull-forward, or a zero difference. CDI-02 models no post-campaign behaviour; each of those is a distinct causal claim CDI-05 has no basis for |

**Pre-campaign flatness is a structural invariant, not a rendering choice:** `∀ p ∈ PRE_CAMPAIGN : p.index_pct === 100 ∧ p.intervention_component_pp === 0`. A validator proves it, so no future edit can animate the pre-period into something that reads as observed history.

#### 2.3.1 Ambient movement across the phase boundary (owner clarification, binding)

`FLAT_RATE_IDENTITY` (§2.5) removes *within-campaign* shape. It does **not** remove ambient movement, and the two must never be confused: a design that reads "flat" as "pinned at 100 everywhere" would silently delete the world from the counterfactual and hand the campaign credit for it. The criterion is therefore stated exactly:

| Phase | Counterfactual | Intervention |
|---|---|---|
| `PRE_CAMPAIGN` | `index_pct === 100` at every point — identity, flat | `index_pct === 100` at every point; `intervention_component_pp === 0` |
| `CAMPAIGN` | `index_pct === 100 + ambient_component_pp` at every point | `index_pct === 100 + ambient_component_pp + intervention_component_pp` at every point |
| `POST_CAMPAIGN` | components `null` | components `null` |

Three consequences, each separately checkable:

1. **Ambient movement is a level shift at the phase boundary, not a slope within the campaign.** Where `ambient_uplift_pp ≠ 0`, both trajectories step off 100 at the first `CAMPAIGN` point and then hold flat. That step is the world moving; the flatness after it is the absence of a response-shape claim. Both are required simultaneously, and neither substitutes for the other.
2. **The movement is carried identically on both trajectories** — the ambient component is a property of the world, shared by construction (I1), never re-derived per trajectory.
3. **A campaign-period counterfactual pinned to `index_pct = 100` while `ambient_component_pp ≠ 0` is a validation failure**, not a stylistic simplification. `assertAmbientParity` fails, the build fails, and no projection is emitted. This is the one failure mode that would make every attribution number on the surface overstate the campaign, because the difference between the trajectories would then silently absorb the world.

The mirror-image error is equally a failure: any `PRE_CAMPAIGN` point with `index_pct ≠ 100` fabricates observed history (I6). Flat before, shared level shift during, empty after.

**Post-campaign is contracted, always present, and always empty — owner ruling U3, approved.** The phase is **structurally present but numerically empty** until a genuine persistence, decay or payback model exists. Publishing it with an explicit *"CogniX does not model what happens after this campaign"* is the honest answer and is visible to the reader. Silently ending the chart at campaign end would let the reader supply their own assumption; drawing convergence would let CogniX supply a false one. A post-campaign model is a separate package with its own calibration evidence and its own gate — **never a CDI-05 extension**.

### 2.4 Point model

```
TimelineSeriesPoint
  period_index          int      0-based over the whole grid
  period_date           string   ISO UTC day
  simulation_period?    SimulationPeriod   ESF-2 alignment where it maps
  phase                 PRE_CAMPAIGN | CAMPAIGN | POST_CAMPAIGN
  ambient_component_pp        number | null   drift + external signals
  intervention_component_pp   number | null   0 on the counterfactual trajectory, always
  index_pct                   number | null   100 + ambient + intervention
  basis                 TimelinePointBasis
  strength              EvidenceStrength     CDI-04 taxonomy, reused verbatim
  synthetic_demo        boolean
  not_modelled_reason?  string   required whenever a component is null
```

`TimelinePointBasis` deliberately has **no member meaning "observed"**:

| Basis | Meaning |
|---|---|
| `CDI02_CURRENT_BASELINE_RUN_RATE` | The modelled run-rate held flat (pre-campaign) |
| `CDI02_ENDPOINT_ALLOCATED` | A CDI-02 endpoint distributed by the §2.5 allocation |
| `NOT_MODELLED_BY_CDI02` | No basis exists; components are null |

The absence of an "observed" basis is the primary structural guarantee behind the *"no timeline may imply synthetic data is observed history"* invariant. It is reinforced, not replaced, by CDI-04's existing rule that no evidence ref may combine `strength: 'OBSERVED'` with `synthetic_demo: true`. In the current lab estate every input is synthetic, so **`OBSERVED` is unreachable on every timeline point by construction**, and the gate states that as a fact rather than leaving it to inspection.

### 2.5 Temporal allocation — the identity profile, and why it is the only one admitted

**Owner ruling U1 — APPROVED.** `FLAT_RATE_IDENTITY` is the campaign-period allocation. CDI-02 does not provide a temporal response shape, so CDI-05 **must not manufacture one**. The ruling is binding on this package and is not reopenable at implementation.

CDI-02 asserts one endpoint. Spreading it across days requires an allocation profile, and every non-flat profile encodes a *causal claim about response timing* that CDI-02 does not make — a ramp claims awareness build, a decline claims fatigue. Inventing either would make CDI-05 a second demand model, which is precisely what the CDI stream forbids.

Because CDI-02 volumes are a **rate** (§1.1.2), the flat profile is not merely the safest option — it is the **information-preserving identity**. Applying the endpoint index to every campaign day adds exactly zero information and removes exactly none.

```
TemporalAllocationProfile = 'FLAT_RATE_IDENTITY'
```

| Rule | Statement |
|---|---|
| A1 | `FLAT_RATE_IDENTITY` is the only admitted member today. Any shaped profile is a future package with its own calibration evidence, admitted as an **additive union member** — the same evolution pattern CDI-02 reserved for `calculation_mode` (CDI-02 residual 5) |
| A2 | The profile is published on every response with `provenance: 'information_preserving_identity'` and `synthetic_demo: true` |
| A3 | **Allocation may redistribute but never create or destroy uplift.** `Σ` allocated pp over `CAMPAIGN` points, evaluated at the terminal point, equals the CDI-02 endpoint pp exactly (tolerance 0.05 pp, matching CDI-02's own reconciliation tolerance) |
| A4 | The profile is a build-time constant. **No request field may select or parameterise it** — a caller-tunable shape is a caller-tunable forecast (rejection RJ4) |

**Consequence, accepted deliberately.** Within the campaign window the chart is two flat lines separated by the attributable effect, with envelopes widening by horizon. That is a less decorative picture than a swooping forecast curve, and it is the only picture the evidence supports.

**Where visual richness is permitted to come from (owner ruling U1, binding).** The surface may be made rich, but only from things that are true. Richness comes from **evidence, context, confidence, event markers and progressive explanation** — the CDI-04 evidence refs and strengths (§5.1), the CDI-01/CDI-03/ESF-2/CDI-04 markers (§2.7), the horizon envelopes (§2.8), the phase distinction and the unmodelled post-campaign region (§6), and the four-tier disclosure path (§3.4). It may **never** come from fabricated demand curvature: no ramp, no S-curve, no fatigue tail, no easing, no smoothing, no spline and no visual interpolation between allocated points. A rendering-layer curve is the same fabrication as a model-layer one, and is prohibited on the same grounds (AC-10a).

### 2.6 Lenses

#### 2.6.1 One series, four renderings

All four lenses are pure functions of the same `index_pct` and CDI-02's own published constants. **No lens computes its own trajectory**, and a validator recomputes each lens from the index to prove no lens has drifted.

| Lens | Derivation | Strength | Availability |
|---|---|---|---|
| `DEMAND` | `volume_units = BASE_WEEKLY_UNITS × index_pct / 100`, published with `quantity_basis: 'cdi02_weekly_rate'` | `DERIVED` | Available |
| `CONTRIBUTION` | `index-derived volume × unit_contribution_gbp` from the matching CDI-02 trajectory point, preserving promotional erosion | `DERIVED` | Available |
| `INVENTORY` | CDI-02 `waste_units`, plus WP10-C `derived_impacts` as **scalar context annotations only** | `DERIVED_KNOWN_DISCONTINUITY` | Available, disclosed |
| `REVENUE` | *No source exists* (§1.1.3) | `MISSING` | **`NOT_AVAILABLE`** |

**Rate discipline (mandatory).** Every lens value is a **per-period rate**, carries `quantity_basis`, and **may never be summed across periods** into a campaign total. CDI-05 publishes no cumulative series and no horizon total. A cumulative series over rate quantities is a number CDI-02 never asserted, and it is exactly the number an executive would quote. A guard forbids any cumulative field in the contract.

#### 2.6.2 Revenue lens — present, unavailable, and named

**Owner ruling U2 — APPROVED.** The Revenue lens remains `NOT_AVAILABLE`. Realised campaign revenue **may not be derived** from RRP, from contribution, or from an assumed margin rate.

The lens appears in the enum and in every response so its absence is *visible*, following CDI-04's *"missing is never neutral"* rule (§4.3 of that gate). It resolves to `NOT_AVAILABLE` with `missing_inputs: ['unit_price_gbp — no source in CDI-01/CDI-02/WP10-A/WP10-C']`.

Deriving revenue from contribution requires an assumed margin rate. That assumption would be invisible in the rendered number, would be read as revenue, and would be wrong by exactly the amount of the assumption. Deriving it from RRP asserts a realised sell price the estate has never observed. Neither is admitted, and neither becomes admissible because the surface has space for a fourth line.

**The enabling input is published, not merely omitted (owner ruling U2, binding).** So the lens can be enabled later by supplying data rather than by re-deriving it, every response names what is actually required:

```
lens: 'REVENUE'
availability: 'NOT_AVAILABLE'
strength: 'MISSING'
missing_inputs: ['unit_price_gbp — no source in CDI-01/CDI-02/WP10-A/WP10-C']
required_authoritative_input: {
  field: 'realised_unit_selling_price_gbp',
  grain: 'per SKU per period, net of promotional discount',
  why_required: 'realised campaign revenue = realised sell price × units; no other route is admissible',
  inadmissible_substitutes: ['RRP or list price', 'contribution × assumed margin rate',
                             'any assumed or default margin percentage'],
  enables: 'REVENUE lens',
  status: 'AWAITING_AUTHORITATIVE_SOURCE'
}
```

The same requirement is echoed in provenance via `lenses_unavailable[]` (§5.3) so an auditor reading only the provenance block still sees which authoritative input is outstanding. Supplying that input is a **future data-availability change with its own gate** — it is not a CDI-05 implementation task, and it is not satisfied by adding a price constant to a frozen contract.

#### 2.6.3 Inventory lens and the CDI-02 waste discontinuity

CDI-02's waste model is asymmetric and discontinuous — a 0.92 clearance factor with a step at index 105 (CDI-02 residual 6). Rendered over time at a flat index this appears as a **single level shift, not a curve**. CDI-05 **must not smooth, interpolate or dampen it**: that would be correcting closed CDI-02 semantics from a presentation layer. The step is published at `DERIVED_KNOWN_DISCONTINUITY` with the CDI-02 residual cited in the disclosure, exactly as CDI-04 admitted the same field.

WP10-C `derived_impacts` values are **scalars with no temporal extent**. They attach to the lens as annotations carrying `temporal_extent: 'NONE — scalar state, not a time series'`, and may never be rendered as a line. Rendering a scalar as a series is the most direct available route to fabricating history.

### 2.7 Contextual and event markers

Markers are **annotations over the grid. They never alter a point's value.**

| Marker source | Marker types | Strength |
|---|---|---|
| CDI-01 | `CAMPAIGN_START`, `CAMPAIGN_END` (stated dates) | `DERIVED` |
| CDI-03 | `WINDOW_START`, `WINDOW_END`, `WINDOW_TIER`, `DISCOVERY_ANCHOR` | `SEEDED_ASSUMPTION` — anchor disclosure carried **verbatim** |
| ESF-2 | `CONTEXT_SIGNAL` per `EnterpriseSignalObservation`, placed by `period` | `SEEDED_ASSUMPTION` (simulated observation) |
| CDI-04 | `READINESS_CONDITION`, `CHANGE_TRIGGER` placed at the point where the condition bites | Inherited from the CDI-04 finding |

**Double-count guard (mandatory).** An ESF-2 signal that CDI-02 already consumed as an ambient driver is *already inside* `ambient_component_pp`. Every `CONTEXT_SIGNAL` marker therefore carries:

```
already_in_ambient: boolean
ambient_driver_id?: CausalDriverId    // 'external_signal_response' when true
```

When `true`, the marker must be rendered as an **explanation of movement already shown**, never as an additional effect. Without this flag a reader adds the weather marker to the ambient line and counts the same weather twice. A guard asserts every marker whose signal type feeds `external_signal_response` carries `already_in_ambient: true`.

**Markers may never be aggregated into a score, a count-based severity, or an index.** That would be a context engine, which is CDI-03's territory and out of scope here.

### 2.8 Confidence envelope

Confidence must reflect evidence and horizon uncertainty rather than decorate the chart. Four rules make that structural.

**Reused, not redefined.** The band vocabulary, the three components (`evidence_coverage`, `evidence_strength_floor`, `model_integrity`) and the display-only numeric constraint are CDI-04's, imported unchanged. CDI-05 creates **no second confidence taxonomy**.

```
TimelineConfidenceEnvelope
  band                      ConfidenceBand            // CDI-04, reused
  evidence_strength_floor   EvidenceStrength          // CDI-04, reused
  model_integrity           { counterfactual_valid, causal_valid, reconciliation_ok }
  horizon_basis             'declared_horizon_uncertainty_profile'
  synthetic_demo            true
  points[]                  { period_index, horizon_days_out, lower_index_pct, upper_index_pct }
```

| # | Rule | Why it exists |
|---|---|---|
| E1 | **Monotone widening.** `∀ i < j : width(i) ≤ width(j)`. The envelope may never narrow with horizon | A narrowing envelope claims rising certainty about a more distant future |
| E2 | **Both trajectories are enveloped.** The counterfactual is a prediction too | A crisp counterfactual against a fuzzy intervention visually biases the comparison toward "doing nothing is the known quantity" |
| E3 | **CDI-02 confidence is the anchor floor.** At the campaign terminal point the envelope is at least as wide as CDI-02's stated per-point `confidence` implies. `UNDECIDED` (72) must render visibly wider than `DO_NOTHING`/stated postures (88) | The envelope may not be more confident than the model it renders |
| E4 | **The envelope never touches a central value or a state.** It is display-bounded, exactly as CDI-04 bounded `confidence_index` | An envelope that feeds a state is a second scoring path |

**Bands on the surface, never a numeric index as chart precision — owner ruling U4, APPROVED.** Confidence is expressed on the primary timeline surface as **bands** — the `ConfidenceBand` badge and the drawn envelopes. A numeric `confidence_index` **may not appear on the primary timeline surface in any form**: not beside the chart, not on the Tier 1 headline, not in an axis, subtitle, tooltip or legend. Beside a chart a number is read as chart precision, and this projection has none to offer. The numeric remains permissible **internally and as evidence-on-demand only where CDI-04 already contracts it** — that is, in the Tier 3 evidence drawer under CDI-04's three §4.2 constraints (derived from the band and the three components; excluded from all state determination; never rendered without its band and components alongside). CDI-05 **introduces no new numeric confidence quantity** of its own. Where the surface cannot guarantee those constraints, the numeric is dropped — CDI-04's own U5 fallback, unchanged.

**Common-mode cancellation — the non-obvious rule.** The attributable effect is a *difference* between two trajectories that share their ambient component. Ambient uncertainty is therefore **common-mode and cancels in the difference**. Deriving the effect envelope by adding or subtracting the two trajectory envelopes would inflate the uncertainty of the campaign's own effect by an amount that provably does not apply to it.

```
attributable_effect_envelope  ← derived from intervention-driver uncertainty ONLY
                              ≠ f(counterfactual_envelope, intervention_envelope)
```

A guard asserts the effect envelope is never wider than the intervention-trajectory envelope, and that its width is independent of `ambient_uplift_pp`.

**Not a probability statement.** The envelope is a declared uncertainty band at `SEEDED_ASSUMPTION` strength with a named calibration target. It must never be labelled a confidence interval, prediction interval, percentile or probability, and no p-value, sigma or coverage claim may appear anywhere in the contract, the API or the surface.

**Insufficient means no line.** `band = INSUFFICIENT` (CDI-04 semantics: model integrity failed, or required inputs absent) ⇒ **no trajectory is rendered at all**. The response publishes the reason in place of the series. Rendering a trajectory the model cannot stand behind, and annotating it with a low percentage, is exactly the decorative-confidence failure this rule exists to prevent.

### 2.9 Half-Life exclusion (hard boundary)

Envelope widening describes **prediction uncertainty**. Decision Half-Life describes **recommendation validity**. They are different claims, they look similar on a chart, and CDI-05 implements only the first.

Prohibited in the CDI-05 diff without exception: any countdown, remaining-validity estimate, expiry, re-simulation trigger, validity status, decay curve, drift monitor, or field or identifier matching `half_life`, `*_valid_until`, `validity`, `decay`, `expires`, `remaining_hours`. A grep-based guard enforces the identifier list. Decision Half-Life is CDI-07A.

---

## 3. Demand Decomposition Model

### 3.1 Design position

`DemandDecomposition` is a **reconciled restatement of the closed CDI-02 causal model**, ordered for curiosity. It computes no attribution of its own. Everything it shows already exists in `CausalDemandContribution`; CDI-05 decides only what is shown first, what is shown on request, and what may never be merged.

### 3.2 driver_class is a partition, never a total

CDI-02's `CausalDriverClass` (`ambient` | `intervention`) is the reason the counterfactual is honest: ambient drivers sit on *both* paths and cancel out of the Campaign Delta. A decomposition that renders all drivers in one merged waterfall destroys exactly that distinction and reads as though the campaign caused all of it.

| Rule | Statement |
|---|---|
| P1 | The decomposition is **partitioned by `driver_class` at the top level**. Ambient and intervention drivers are separate groups with separate subtotals. There is no merged all-driver waterfall anywhere in the contract or the surface |
| P2 | Ambient drivers are labelled with their meaning — *"happens with or without this campaign"* — on every rendering, not only in a legend or tooltip |
| P3 | `ambient_subtotal_pp === causal.ambient_uplift_pp` and `intervention_subtotal_pp === causal.intervention_uplift_pp`, echoed, never recomputed by CDI-05 |
| P4 | Drivers with `attributed: false` are shown **in place with a stated exclusion reason**, never dropped. A silently dropped driver is a decomposition that appears to add up when it does not |
| P5 | `interaction_residual` is shown as its own row, never absorbed into another driver, never hidden when small. CDI-04 rule D4 already treats a large residual as a constraint; hiding it here would break that evidence chain |

### 3.3 Reconciliation to CDI-02 (mandatory)

CDI-05 **re-runs the frozen CDI-02 validators** — `validateCounterfactualBaseline` and `validateCausalDemandContribution` — and additionally asserts:

```
ambient_uplift_pp + intervention_uplift_pp        === total_predicted_uplift_pp
Σ drivers[].contribution_pp (attributed and not)  === reconciled_sum_pp
campaign_delta.attributable_uplift_pp             === causal.intervention_uplift_pp
timeline terminal intervention_component_pp       === causal.intervention_uplift_pp
timeline terminal ambient_component_pp            === causal.ambient_uplift_pp
```

**Reconciliation failure emits no decomposition and no timeline** — only the failure, its failing field, and the CDI-04 veto reference (V1/V2). This mirrors CDI-04 exactly: an unreconciled model is not assertable, and rendering a beautiful chart over one is the most persuasive way to publish something untrue.

### 3.4 Progressive disclosure contract — `What? → Why? → Evidence → What If?`

Four tiers, each with a hard content boundary. The point of the boundary is that **an executive who stops after Tier 1 has not been misled** — which is the whole design intent of the curiosity model, and the failure mode of every dashboard it replaces.

| Tier | Contains | Must NOT contain |
|---|---|---|
| **What?** | The **attributable** effect only: `attributable_uplift_pp`, contribution delta £, confidence **band** (not a bare number), CDI-04 readiness state | `total_predicted_uplift_pp`; any ambient movement presented as the campaign's result; a bare confidence percentage; more than one headline claim |
| **Why?** | The two-group `driver_class` partition with subtotals, the ambient-vs-intervention statement, and the residual row | A merged waterfall; drivers without their class; the evidence tables (that is Tier 3) |
| **Evidence** | CDI-04 `ReadinessEvidenceRef`s, `EvidenceStrength` per finding, verbatim disclosures (CDI-03 anchor, CDI-02 waste discontinuity), `placeholder_fields_excluded`, provenance ids, the allocation profile, the envelope basis | Any evidence taxonomy other than CDI-04's; any strength shown without its disclosure |
| **What If?** | CDI-04 `change_triggers[]` projected onto the timeline, and optional **re-invocation of the closed CDI-02 engine** with different declared inputs | Alternative plays, Pareto frontiers, ranked options, optimisation, interpolation between results, or any CDI-05-owned counterfactual arithmetic (all CDI-06) |

**Tier 1 headline invariant (the single most consequential rule in this gate).** The Tier 1 number is `attributable_uplift_pp`. `total_predicted_uplift_pp` may not appear at Tier 1 in any form — not as the headline, not as a secondary figure, not in a subtitle. It is the number that flatters the campaign, it is a defensible number in its own right at Tier 2, and presenting it first is the exact dishonesty the ambient/intervention split was built to prevent. A guard asserts `total_predicted_uplift_pp` does not appear in the Tier 1 projection.

**Non-cockpit rule (UX §5.1).** Each tier is reachable only from the one before it. No tier may be expanded by default, and no configuration or request field may pre-expand them — that is how a curiosity surface silently becomes a dashboard. Tier 1 carries **exactly one** headline claim.

**What If? boundary.** Re-invoking the closed CDI-02 engine is permitted because it is deterministic and owned upstream. **Interpolating between two CDI-02 results is not** — a point between two evaluations was never evaluated. CDI-05 may show N discrete evaluated results; it may never draw a curve through them.

---

## 4. Attribution Invariants

These are the invariants the work package declares non-negotiable, restated as machine-checkable predicates. Each maps to an acceptance criterion in §9.

| # | Invariant | Predicate | Guard |
|---|---|---|---|
| **I1** | Ambient movement appears on **both** trajectories | `∀ i : counterfactual.points[i].ambient_component_pp === intervention.points[i].ambient_component_pp` | AC-6 |
| **I1a** | Ambient movement is actually **present** in the campaign period when the world moved — the counterfactual is never pinned to the identity while ambient is non-zero (§2.3.1) | `ambient_uplift_pp ≠ 0 ⇒ ∀ p ∈ CAMPAIGN : counterfactual.index_pct === 100 + p.ambient_component_pp ∧ counterfactual.index_pct ≠ 100` | AC-5a, AC-5b |
| **I2** | The counterfactual carries **no** intervention component | `∀ i : counterfactual.points[i].intervention_component_pp === 0` | AC-7 |
| **I3** | Only the **difference** is intervention-attributable | `∀ i : intervention.points[i].index_pct − counterfactual.points[i].index_pct === intervention.points[i].intervention_component_pp` | AC-8 |
| **I4** | The timeline reconciles to CDI-02 at the terminal point | §3.3 equalities, tolerance 0.05 pp | AC-9 |
| **I5** | Allocation redistributes, never creates | `Σ` allocated pp === CDI-02 endpoint pp | AC-10 |
| **I6** | No point may claim observed history | No `OBSERVED` basis exists; `∀ p ∈ PRE_CAMPAIGN : index_pct === 100`; no `OBSERVED` strength with `synthetic_demo: true` | AC-11, AC-12 |
| **I7** | Post-campaign asserts nothing | `∀ p ∈ POST_CAMPAIGN : components null ∧ not_modelled_reason present` | AC-13 |
| **I8** | Envelope never narrows and never touches a value or a state | E1, E4 | AC-14, AC-15 |
| **I9** | Ambient uncertainty does not inflate the effect envelope | Effect envelope width independent of `ambient_uplift_pp` | AC-16 |
| **I10** | Decomposition is partitioned, never merged | P1–P5 | AC-17 |
| **I11** | Tier 1 never shows total uplift | `total_predicted_uplift_pp ∉ tier1_projection` | AC-18 |
| **I12** | No Half-Life semantics | Prohibited identifier grep clean | AC-19 |
| **I13** | No cumulative or horizon-total quantity | No cumulative field in contract; no cross-period sum in engine | AC-20 |
| **I14** | Context signals already in ambient are not counted twice | `already_in_ambient` set wherever the signal feeds `external_signal_response` | AC-21 |
| **I15** | CDI-05 emits no readiness state and no attribution of its own | No `ReadinessState` computed; readiness echoed by reference only | AC-22 |

---

## 5. Confidence & Provenance Semantics

### 5.1 Evidence taxonomy — reused, not extended

CDI-05 imports `EvidenceStrength`, `EVIDENCE_STRENGTH_ORDER`, `ReadinessEvidenceRef`, `ConfidenceBand` and the CDI-04 evidence invariants **unchanged**. It defines **no new strength value and no second evidence vocabulary**, per the work package's explicit instruction.

Applied to CDI-05's own artefacts:

| CDI-05 artefact | Strength | Note |
|---|---|---|
| Pre-campaign flat run-rate | `DERIVED` | With the "not observed history" disclosure |
| Campaign-period allocated points | `DERIVED` | Identity allocation adds no information |
| Inventory lens | `DERIVED_KNOWN_DISCONTINUITY` | Inherits CDI-02 residual 6 |
| CDI-03-derived markers | `SEEDED_ASSUMPTION` | Anchor disclosure verbatim |
| ESF-2 context markers | `SEEDED_ASSUMPTION` | Simulated observation, never `OBSERVED` |
| Confidence envelope | `SEEDED_ASSUMPTION` | Declared uncertainty profile, named calibration target |
| Revenue lens | `MISSING` | Lens `NOT_AVAILABLE`, input named |
| Post-campaign points | `MISSING` | `NOT_MODELLED_BY_CDI02` |

The `evidence_strength_floor` of the whole projection is the **weakest strength among contributing artefacts** — CDI-04's rule, unchanged. With the CDI-03 anchor and the envelope both at `SEEDED_ASSUMPTION`, the realistic floor for a fully-integrated CDI-05 projection is `SEEDED_ASSUMPTION`, which caps the band at `MODERATE` under CDI-04 §4.2. **`HIGH` confidence is unreachable on the current synthetic estate, by construction** — the direct analogue of CDI-04's unreachable `GO`, and intended for the same reason.

### 5.2 Missing data

CDI-04 §4.3 applies unchanged, plus three timeline-specific rules where a chart makes absence uniquely easy to hide.

| Case | Behaviour |
|---|---|
| Required CDI-02 input absent | No projection. Rejection RJ1 (§3.6), never an empty chart |
| Optional integration absent (CDI-03, CDI-04, ESF-2) | Affected markers/lenses `NOT_AVAILABLE` with a stated reason; the projection still renders. Never a silent pass |
| A grid point has no basis | Published as a **gap**. **Never interpolated across.** Interpolation across a gap manufactures the one thing this design exists to prevent |
| A lens has no source | Lens present in the response, `NOT_AVAILABLE`, missing input **named** (Revenue, §2.6.2) |
| Field present but null/zero where a value is meaningful | Treated as missing, not as zero — CDI-04 rule, unchanged |

### 5.3 Provenance

Additive, never summarised — CDI-04 rule 7, extended with CDI-05's own temporal decisions so the shape of the chart is as auditable as its numbers:

`counterfactual_id`, `causal_id`, `readiness_id` (+ overall state), `opportunity_evaluation_id`, `micro_market_evaluation_id`, `decision_state_id` + version, engine version, `allocation_profile`, `envelope_profile`, `grid_basis` (which source resolved the campaign extent), and `lenses_unavailable[]`.

---

## 6. Progressive-Disclosure Contract (surface obligations)

Canvas **Layer 5 · CDI-05**, following the Layer 2/3/4 pattern established in `components/CampaignDecisionCanvas.tsx`.

| Obligation | Rule |
|---|---|
| Gating | Layer 5 unlocks only on a registered CDI-01 intent and a successful CDI-02 evaluation, matching Layer 2–4 precedent |
| Tier 1 | One headline: attributable effect + confidence **band** + CDI-04 readiness state. **Band-only — owner ruling U4.** No numeric `confidence_index` on the primary timeline surface in any form; where CDI-04 already contracts the numeric it is available at Tier 3 only, under CDI-04's three constraints (band and components rendered alongside; excluded from all state logic) |
| Tier 2 | The `driver_class` partition. Two groups, two subtotals, ambient labelled "happens with or without this campaign" |
| Tier 3 | Evidence drawer — CDI-04 refs, strengths, verbatim disclosures, provenance, allocation profile, envelope basis |
| Tier 4 | What If? — CDI-04 change triggers on the timeline; optional closed-CDI-02 re-invocation |
| Strength visibility | No finding, point or marker may be rendered without its `EvidenceStrength`. CDI-04 invariant, unchanged |
| Chart obligations | Pre-campaign phase visually distinct from campaign phase; post-campaign rendered as an explicit unmodelled region with its statement; gaps rendered as gaps; both envelopes drawn; the discontinuity step never smoothed. **Straight segments between allocated points only** — no curve, spline, easing or smoothing on any timeline series (U1, §2.5). Where ambient movement is non-zero, the phase-boundary level shift is drawn on **both** trajectories (§2.3.1) |
| Where richness comes from | Evidence, context, confidence, event markers and progressive explanation — never fabricated demand curvature (U1, §2.5) |
| Readiness framing | `DO_NOT_PROCEED` ⇒ the intervention trajectory is still shown as evidence but is explicitly labelled vetoed, never as a plan. The timeline may never visually contradict CDI-04 |
| Prohibited | Cockpit density, default-expanded tiers, merged waterfall, cumulative series, countdown or validity indicator, any "observed" label, a numeric confidence percentage beside the chart (U4), any smoothed or shaped trajectory (U1), any numeric post-campaign value (U3), any derived revenue figure (U2) |

---

## 7. CDI-02 / CDI-03 / CDI-04 Dependencies

### 7.1 CDI-02 (HARD — absence is a rejection, not a cap)

| Field | Consumed by |
|---|---|
| `counterfactual.expected_without_intervention.volume_index_pct` | Counterfactual trajectory terminal |
| `counterfactual.predicted_with_intervention.volume_index_pct` | Intervention trajectory terminal |
| `counterfactual.current_baseline.volume_index_pct` | Pre-campaign flat run-rate (=100) |
| `counterfactual.*.unit_contribution_gbp`, `contribution_gbp` | Contribution lens |
| `counterfactual.*.waste_units` | Inventory lens (with discontinuity disclosure) |
| `counterfactual.*.confidence` | Envelope anchor floor (E3) |
| `counterfactual.horizon_days` | Pre/post extents (§2.2) |
| `counterfactual.campaign_delta.attributable_uplift_pp`, `contribution_delta_gbp` | Tier 1 headline |
| `causal.ambient_uplift_pp`, `intervention_uplift_pp`, `total_predicted_uplift_pp` | Component split, I1–I4 |
| `causal.drivers[]` incl. `driver_class`, `attributed`, `rationale`, `evidence_refs` | Decomposition partition P1–P5 |
| `causal.reconciled_sum_pp`, `reconciliation_ok` | §3.3 reconciliation |
| `causal.placeholder_fields_excluded[]` | Evidence tier, `PLACEHOLDER_EXCLUDED` |
| `causal.signal_simulation_id` | ESF-2 marker linkage |
| Both CDI-02 validators | §3.3, re-run not trusted |

**No CDI-02 contract change is required.** Every field exists at `f765598f`.

### 7.2 CDI-03 (ENHANCEMENT — absence degrades the grid basis, never blocks)

| Field | Consumed by |
|---|---|
| `opportunity_windows.recommended_window.{start_date, end_date, duration_days, tier, is_stated_dates}` | Grid resolution (§2.2), window markers |
| `opportunity_windows.discovery_anchor.{anchor_date, anchor_mode, disclosure}` | `SEEDED_ASSUMPTION` classification, verbatim disclosure |
| `opportunity_windows.{timing_mode, resolved_temporal_uplift_pp}` | Grid basis provenance; consistency with the CDI-02 evaluation |
| `micro_markets.region_scope` | Scope label on the projection |

Absent CDI-03 ⇒ grid resolves from CDI-01 stated dates; window markers `NOT_AVAILABLE` with reason. **No CDI-03 contract change is required.**

### 7.3 CDI-04 (INTEGRATION — absence degrades framing, never blocks)

| Field | Consumed by |
|---|---|
| `readiness.state`, `headline` | Tier 1 framing, vetoed-trajectory labelling |
| `readiness.confidence.{band, evidence_coverage, evidence_strength_floor, model_integrity}` | Envelope band, §5.1 floor — **reused, not recomputed** |
| `readiness.change_triggers[]` | Tier 4 What If? projection |
| `readiness.conditions[]` | Condition markers on the grid |
| `readiness.dimensions[].findings[].evidence[]` | Tier 3 evidence drawer |
| `EvidenceStrength`, `EVIDENCE_STRENGTH_ORDER`, `ConfidenceBand`, `ReadinessEvidenceRef` | Imported types |

Absent CDI-04 ⇒ readiness framing, condition markers and Tier 4 triggers `NOT_AVAILABLE` with reason; the timeline and decomposition still render. **CDI-05 never computes a readiness state and never recomputes a confidence band.** **No CDI-04 contract change is required.**

### 7.4 Other integrations

| Source | Fields | Classification |
|---|---|---|
| CDI-01 | `audience_market.{timing_mode, planned_start, planned_end}`, `status`, `objective_type` | HARD (grid + rejections) |
| ESF-2 | `EnterpriseSignalTimeline.observations[]` by `period` | Optional; context markers only, `already_in_ambient` flagged |
| WP10-C | `DecisionState.derived_impacts.*` | Optional, read-only **scalar annotations**; never a series; no write, no version bump |

---

## 8. Proposed API & Experience Boundaries

**New contract file (single):** `packages/contracts/src/campaign-timeline-model.ts`, exported from `packages/contracts/src/index.ts`. **No CDI-01/02/03/04 contract file is modified.**

Proposed shape (semantics frozen here; exact TypeScript is the implementer's transcription):

```ts
export type TimelinePhase = 'PRE_CAMPAIGN' | 'CAMPAIGN' | 'POST_CAMPAIGN';
export type TimelineTrajectoryKind = 'COUNTERFACTUAL' | 'INTERVENTION';
export type TimelineLens = 'DEMAND' | 'REVENUE' | 'CONTRIBUTION' | 'INVENTORY';
export type TimelineLensAvailability = 'AVAILABLE' | 'NOT_AVAILABLE';
export type TimelinePointBasis =
  | 'CDI02_CURRENT_BASELINE_RUN_RATE' | 'CDI02_ENDPOINT_ALLOCATED' | 'NOT_MODELLED_BY_CDI02';
export type TemporalAllocationProfile = 'FLAT_RATE_IDENTITY';

export interface TimelineSeriesPoint { /* §2.4 */ }
export interface TimelineTrajectory {
  kind: TimelineTrajectoryKind;
  points: TimelineSeriesPoint[];
  envelope: TimelineConfidenceEnvelope;
  terminal_index_pct: number;
}
export interface RequiredAuthoritativeInput {   // owner ruling U2 — §2.6.2
  field: string;
  grain: string;
  why_required: string;
  inadmissible_substitutes: string[];
  enables: TimelineLens;
  status: 'AWAITING_AUTHORITATIVE_SOURCE';
}

export interface TimelineLensProjection {
  lens: TimelineLens;
  availability: TimelineLensAvailability;
  quantity_basis: 'cdi02_weekly_rate' | 'cdi02_unit_contribution' | 'cdi02_waste_units';
  values: Array<{ period_index: number; counterfactual: number | null; intervention: number | null }>;
  strength: EvidenceStrength;          // CDI-04, imported
  missing_inputs: string[];
  /** Required whenever availability === 'NOT_AVAILABLE' (U2). */
  required_authoritative_input?: RequiredAuthoritativeInput;
  disclosure?: string;
}
export interface TimelineMarker { /* §2.7, incl. already_in_ambient */ }
export interface TimelineConfidenceEnvelope { /* §2.8 */ }

export interface DemandDecomposition {
  ambient_group: DecompositionGroup;        // subtotal === causal.ambient_uplift_pp
  intervention_group: DecompositionGroup;   // subtotal === causal.intervention_uplift_pp
  reconciliation: { reconciled_sum_pp: number; reconciliation_ok: boolean; validator_errors: string[] };
  excluded_drivers: DecompositionRow[];     // attributed:false, shown in place (P4)
}

export interface DecisionTimelineProjection {
  projection_id: string;
  campaign_intent_id: string; tenant_id: string; session_id: string;
  grid: { points: number; start_date: string; end_date: string; grid_basis: string };
  trajectories: TimelineTrajectory[];       // exactly two, always both
  lenses: TimelineLensProjection[];         // exactly four, always all present
  markers: TimelineMarker[];
  attributable_effect_envelope: TimelineConfidenceEnvelope;   // §2.8 common-mode rule
  decomposition: DemandDecomposition;
  allocation_profile: TemporalAllocationProfile;
  readiness_reference?: { readiness_id: string; state: ReadinessState; headline: string };
  counterfactual_id: string; causal_id: string;
  calculation_mode: 'deterministic_demo_timeline';
  synthetic_demo: boolean; schema_version: string;
  provenance: Record<string, string>; timestamp: string;
}
```

**Validators and guards to export** (mirroring the CDI-02/03/04 pattern of validators that can actually fail):

```ts
validateDecisionTimelineProjection(p): { valid: boolean; errors: string[] }
validateTimelineProjectionRequest(r):  { valid: boolean; errors: string[] }
assertAmbientParity(p):                { ok: boolean; violations: string[] }   // I1, I2
assertAmbientMovementPresent(p, cdi02):{ ok: boolean; violations: string[] }   // I1a — §2.3.1
assertAttributableIsDifferenceOnly(p): { ok: boolean; violations: string[] }   // I3
assertAllocationConserves(p, cdi02):   { ok: boolean; violations: string[] }   // I5
assertNoObservedHistory(p):            { ok: boolean; violations: string[] }   // I6
assertPostCampaignEmpty(p):            { ok: boolean; violations: string[] }   // I7 — U3
assertEnvelopeMonotone(p):             { ok: boolean; violations: string[] }   // I8
assertUnavailableLensNamesInput(p):    { ok: boolean; violations: string[] }   // U2 — §2.6.2
```

`assertAmbientMovementPresent` is the owner-clarified check (§2.3.1) and must fail in **both** directions: a `PRE_CAMPAIGN` point off the identity, and a `CAMPAIGN`-period counterfactual pinned to 100 while `ambient_uplift_pp ≠ 0`. When `ambient_uplift_pp === 0` a campaign-period counterfactual at 100 is correct and passes.

### 8.1 Rejections (errors, not projections)

Emitting a *chart* over an invalid request would launder a contract violation into a picture, which is worse than laundering it into a state.

| ID | Condition |
|---|---|
| RJ1 | Required CDI-01 or CDI-02 input absent |
| RJ2 | `timing_mode = KNOWN_DATES` without a valid stated range and without a CDI-03 window (upholds CDI-01/CDI-03 D4) |
| RJ3 | Tenant/session mismatch, or a supplied CDI-02/CDI-03/CDI-04 artefact referencing a different `campaign_intent_id` |
| RJ4 | Request attempts to select, parameterise or override the allocation profile or the envelope profile (§2.5 A4) |
| RJ5 | `CampaignIntent.status ≠ REGISTERED` (CDI-04 R1 precedent — a timeline over a moving target) |

### 8.2 Surface boundary

- **`POST /api/v1/campaigns/timeline`** — the endpoint named in the planning report and MASTER_PLAN. **Orchestration only; zero projection logic in the route.**
- **One endpoint, both artefacts.** The timeline and the decomposition are returned from a single call over a single CDI-02 evaluation. Splitting them across two calls invites two evaluations that disagree, and §3.3 reconciliation would then be checking the wrong pair. The planning report's mapping of decomposition to `POST /api/v1/intent-fusion/evaluate` (`:191`) is **superseded** — a docs-only reconciliation, no IFI-1 change.
- **`lib/campaign-timeline-engine.ts`** — pure, deterministic, zero React, zero `new Date()` inside projection, mirroring CDI-02/03/04 engine discipline.
- **Canvas Layer 5** per §6. OpenAPI `campaign-decision-v1.yaml` bumped with the anchor, synthetic, allocation-profile and unavailable-lens disclosures.

---

## 9. Adversarial Acceptance Criteria

Written as attacks. Each names the specific dishonesty it prevents, because a criterion that only restates the design cannot fail.

**Contract & structure**

1. `packages/contracts/src/campaign-timeline-model.ts` created and exported; **no CDI-01/02/03/04 contract file modified** (`git diff --stat` proves it).
2. `lib/campaign-timeline-engine.ts` is pure and deterministic — identical inputs give byte-identical outputs; zero React; no `new Date()` in projection.
3. Exactly two trajectories and exactly four lenses in every response, including on degraded paths.

**Attribution — the central invariants**

4. *Attack: credit the world to the campaign.* Fixture with `ambient_uplift_pp = 9`, `intervention_uplift_pp = 3` ⇒ Tier 1 shows **3 pp**; `total_predicted_uplift_pp` (12) is absent from the Tier 1 projection entirely. **[I11]**
5. *Attack: a flat counterfactual.* **(Owner clarification, §2.3.1 / §10.1 — stated as four separable checks so "flat allocation" can never be read as "no ambient movement".)**
   - **5a.** `PRE_CAMPAIGN` is flat at the identity: `∀ p ∈ PRE_CAMPAIGN : index_pct === 100` on **both** trajectories. A fixture with a varying pre-campaign series fails.
   - **5b.** With `ambient_uplift_pp ≠ 0`, **both** trajectories carry that non-zero ambient movement across the `CAMPAIGN` phase, and carry it **equally**: `counterfactual.index_pct === 100 + ambient_component_pp ≠ 100`, and `intervention.ambient_component_pp === counterfactual.ambient_component_pp` at every campaign index. **A campaign-period counterfactual pinned to 100 while ambient movement is non-zero fails validation and emits no projection.**
   - **5c.** The movement is a **level shift at the phase boundary only** — within `CAMPAIGN`, `ambient_component_pp` and `index_pct` are constant across points on each trajectory (`FLAT_RATE_IDENTITY`, U1). A fixture with a within-campaign ambient slope, ramp or taper fails, since that is a response-shape claim CDI-02 does not make.
   - **5d.** With `ambient_uplift_pp === 0`, a campaign-period counterfactual at exactly 100 is correct and must **pass** — 5b tests presence of real movement, never a mandatory departure from the identity.
6. `assertAmbientParity` passes on every fixture: ambient components are identical index-by-index on both trajectories. **[I1]**
7. `∀ i : counterfactual.points[i].intervention_component_pp === 0`. **[I2]**
8. `assertAttributableIsDifferenceOnly` passes: the trajectory difference equals the intervention component at every index. **[I3]**
9. Terminal reconciliation to CDI-02 within 0.05 pp on both trajectories, and `reconciliation_ok = false` ⇒ **no projection**, only the failure and the V1/V2 reference. **[I4]**
10. *Attack: manufacture uplift by shaping it.* `assertAllocationConserves` passes; a fixture with a deliberately tampered allocation that sums to a different endpoint **fails the build**. **[I5]**

10a. *Attack: manufacture the shape in the renderer instead of the model.* `TemporalAllocationProfile` has exactly one member, `FLAT_RATE_IDENTITY`, and the chart draws **straight segments between allocated points only**. Grep + surface guard: no curve interpolation, spline, monotone/basis/cardinal/natural curve type, easing, smoothing or `tension` setting on any timeline series; no derived shaped series anywhere. A fixture rendering a smoothed campaign trajectory fails. **[U1, §2.5]**

**Synthetic never reads as history**

11. Grep guard: no `TimelinePointBasis` member, field, label or literal in the CDI-05 diff means "observed", "actual" or "historical". **[I6]**
12. `∀ p ∈ PRE_CAMPAIGN : index_pct === 100`; a fixture with a varying pre-campaign series fails. No evidence ref combines `OBSERVED` with `synthetic_demo: true`. **[I6]**
13. `assertPostCampaignEmpty` passes: `∀ p ∈ POST_CAMPAIGN : ambient_component_pp === null ∧ intervention_component_pp === null ∧ not_modelled_reason` present, with the phase structurally present in every response (U3). *Attack:* a fixture asserting post-campaign convergence (difference = 0) fails — undefined is not zero; a fixture omitting the phase entirely also fails. **[I7]**
14. *Attack: interpolate a gap.* A fixture with a mid-grid basis gap renders a gap; any interpolated value fails.

**Confidence is not decoration**

15. `assertEnvelopeMonotone` passes; a fixture with a narrowing envelope fails. Both trajectories carry envelopes. **[I8]**
16. Posture `UNDECIDED` (CDI-02 confidence 72) produces a **strictly wider** terminal envelope than a stated-mechanic posture (88). **[E3]**
17. *Attack: inflate the campaign's own uncertainty with the world's.* Two fixtures identical except `ambient_uplift_pp` (2 vs 20) produce **identical** `attributable_effect_envelope` widths. **[I9]**
18. `band = INSUFFICIENT` ⇒ **no trajectory rendered**; the response carries the reason instead. A rendered line with a low band fails.
19. Grep guard: no `confidence interval`, `prediction interval`, `percentile`, `p-value`, `sigma`, `probability` in the contract, engine, OpenAPI or surface.
20. **Band-only on the primary timeline surface (U4).** No numeric `confidence_index` renders on the timeline surface — not beside the chart, on the Tier 1 headline, or in an axis, subtitle, tooltip or legend. A surface fixture placing a percentage next to the chart fails. Where CDI-04 already contracts the numeric it may appear **only** in the Tier 3 evidence drawer, under CDI-04's three §4.2 constraints, and is provably absent from all projection and state logic. CDI-05 defines no numeric confidence quantity of its own.

**Decomposition**

21. *Attack: one persuasive waterfall.* Grep + structural guard: no merged all-driver series exists; ambient and intervention are separate groups with separate subtotals. **[I10]**
22. Subtotals equal `causal.ambient_uplift_pp` / `causal.intervention_uplift_pp` exactly, echoed not recomputed.
23. `attributed: false` drivers appear **in place** with an exclusion reason; a fixture where one is dropped fails. `interaction_residual` always present as its own row.
24. Both CDI-02 validators are re-run inside CDI-05 and their errors surface; stubbing them out fails the build.

**Lenses & quantities**

25. Every lens value is recomputable from `index_pct` and CDI-02 constants; a lens that has drifted from the index fails.
26. Revenue lens present, `NOT_AVAILABLE`, `unit_price_gbp` named in `missing_inputs`, **and `required_authoritative_input` published on the lens and echoed in `provenance.lenses_unavailable[]`** (§2.6.2, U2). *Attack:* a fixture deriving revenue from contribution × an assumed margin fails; a fixture deriving it from RRP or list price fails; a fixture resolving the lens to `AVAILABLE` without a realised selling price fails.
27. *Attack: the number an executive will quote.* Grep + structural guard: no cumulative field, no cross-period sum, no horizon total anywhere. Every lens value carries `quantity_basis`. **[I13]**
28. Inventory lens preserves the CDI-02 index-105 waste step unsmoothed, at `DERIVED_KNOWN_DISCONTINUITY`, with the residual cited. WP10-C scalars carry `temporal_extent: 'NONE'` and never render as a series.

**Markers**

29. Every `CONTEXT_SIGNAL` marker whose signal feeds `external_signal_response` carries `already_in_ambient: true`. *Attack:* a fixture double-counting a weather signal as both an ambient driver and an additional effect fails. **[I14]**
30. CDI-03 anchor disclosure travels **verbatim** into every anchor-derived marker; markers are never aggregated into a score or index.

**Scope & integration**

31. Grep guard, no exceptions: no `half_life`, `*_valid_until`, `validity`, `decay`, `expires`, `remaining_hours`, countdown or re-simulation trigger in the CDI-05 diff. **[I12]**
32. No frontier, Pareto, ranked-alternative, optimisation, ML or LLM logic; What If? invokes only the closed CDI-02 engine and never interpolates between results. **[CDI-06 boundary]**
33. CDI-05 computes no `ReadinessState` and no confidence band of its own; readiness is echoed by reference. **[I15]**
34. No write to Shared Decision State; no state-version bump. Read-only, verified.
35. Existing suites pass unchanged before and after: CDI-04 49/49, CDI-03 31/31, CDI-02 30/30, CDI-01 21/21, ESF-2, ESF-3, IFI-1, WP10-A/B/C/D.

**Surface**

36. Canvas Layer 5 gated on registered intent + successful CDI-02 evaluation; no tier expanded by default; Tier 1 carries exactly one headline claim.
37. `DO_NOT_PROCEED` fixture ⇒ intervention trajectory rendered and explicitly labelled vetoed; a fixture where the timeline reads as a plan under a veto fails.
38. No point, marker or finding renders without its `EvidenceStrength`; pre/campaign/post phases visually distinct; the unmodelled post-campaign region carries its statement.
39. `POST /api/v1/campaigns/timeline` published in OpenAPI with anchor, synthetic, allocation-profile and unavailable-lens disclosures; route contains no projection logic.

---

## 10. Owner Rulings (formerly Unresolved Decisions)

**All four decisions are closed.** The gate was approved on 2026-08-15 with explicit rulings on U1, U2, U3 and U4, each approved as recommended, together with a binding clarification of the ambient-movement acceptance criterion. Nothing in §10 remains open, and the §8 contract freeze is no longer conditional.

| # | Decision | Ruling | Where it lands in this design |
|---|---|---|---|
| **U1** | **Campaign-period shape.** Accept `FLAT_RATE_IDENTITY`, or commission a shaped profile? | **APPROVED — `FLAT_RATE_IDENTITY`.** CDI-02 does not provide a temporal response shape, so CDI-05 **must not manufacture one**. Visual richness must come from evidence, context, confidence, event markers and progressive explanation — **not** from fabricated demand curvature. A calibrated shape is a future package with its own evidence, admitted as an additive union member; it is not a CDI-05 addition | §2.5 (ruling + richness sources); §2.3.1 (flat ≠ pinned); §6 chart obligations and richness row; acceptance criteria 5c and 10a; `TemporalAllocationProfile` remains a one-member union; rejection RJ4 unchanged |
| **U2** | **Revenue lens.** Publish `NOT_AVAILABLE`, or introduce a price? | **APPROVED — `NOT_AVAILABLE`.** Realised campaign revenue may **not** be derived from RRP, from contribution, or from an assumed margin. The **missing authoritative input required to enable the lens later is published**, so the lens is enabled by supplying data rather than by re-deriving it | §2.6.2 `required_authoritative_input` (`realised_unit_selling_price_gbp`, with inadmissible substitutes named); §5.3 provenance echo via `lenses_unavailable[]`; §8 `RequiredAuthoritativeInput` + `assertUnavailableLensNamesInput`; acceptance criterion 26; RR-2 |
| **U3** | **Post-campaign.** Contracted-and-empty, or commission a post-campaign model? | **APPROVED — structurally present, numerically empty** until a genuine persistence/decay/payback model exists. Persistence, decay and payback are three different causal claims and CDI-02 supports none; the empty phase makes the gap visible rather than letting the reader fill it | §2.3 phase table + post-campaign paragraph; I7; `assertPostCampaignEmpty`; acceptance criterion 13; §6 explicit unmodelled region |
| **U4** | **`confidence_index` numeric on the timeline surface.** Permit, or band-only? | **APPROVED — confidence bands on the primary timeline surface.** A numeric confidence index may **not** be presented as chart precision. Numeric evidence may remain available internally / evidence-on-demand **only where CDI-04 already contracts it**, under CDI-04's three §4.2 constraints. CDI-05 introduces no numeric confidence quantity of its own | §2.8 band-only rule; §6 Tier 1 and Prohibited rows; acceptance criterion 20; E4 unchanged |

### 10.1 Ambient-movement acceptance clarification (binding)

Issued with the approval, to remove any reading in which the flat allocation (U1) is mistaken for an absence of ambient movement:

- `PRE_CAMPAIGN` remains **flat at the identity, `index_pct = 100`**, on both trajectories.
- During `CAMPAIGN`, **non-zero ambient movement must appear equally on both the counterfactual and the intervention trajectories**.
- **A campaign-period counterfactual pinned to 100 when ambient movement is non-zero must fail validation.**

Landed at §2.3.1 (phase-boundary level shift, three consequences), invariant **I1a** (§4), validator `assertAmbientMovementPresent` (§8), and acceptance criteria **5a–5d** (§9), which additionally fix the two adjacent errors: a within-campaign ambient slope fails (that is a response-shape claim, U1), and a campaign-period counterfactual at 100 when ambient is genuinely zero passes.

### 10.1 Carried residual risks (inherited or declared; not CDI-05 defects)

| # | Residual | Owner-visible consequence |
|---|---|---|
| RR-1 | CDI-02 `volume_units` is a weekly rate carried on a 14-day horizon (§1.1.2) | Disclosed via `quantity_basis`; CDI-05 reconciles in index space and publishes no cumulative or horizon total. CDI-02 unchanged |
| RR-2 | No revenue quantity exists in the estate | Revenue lens `NOT_AVAILABLE`, with the required authoritative input (`realised_unit_selling_price_gbp`) published on the lens and in provenance, and the inadmissible substitutes named (U2, §2.6.2). Enabling the lens is a future data-availability change with its own gate |
| RR-3 | CDI-02 waste discontinuity (residual 6) becomes a visible step in the Inventory lens | Published at `DERIVED_KNOWN_DISCONTINUITY` with the residual cited. Never smoothed |
| RR-4 | CDI-03 `discovery_anchor` is a fixed demo anchor (`2026-08-17`), so the grid may rest on a seeded date | `SEEDED_ASSUMPTION`; disclosure verbatim; caps the band at `MODERATE` under CDI-04 §4.2 |
| RR-5 | The horizon-uncertainty profile is a declared lab convention, not measured dispersion | Published at `SEEDED_ASSUMPTION` with a named calibration target; never labelled a probability |
| RR-6 | CDI-02 residual 2 — ESF-2 consumption uses Today-period averages, so context markers may be temporally coarser than the daily grid | Marker placement discloses the period grain; CDI-05 does **not** refine the signal→driver mapping (that remains ESF-4) |
| RR-7 | `calculation_mode` remains a single-value literal union (CDI-02 residual 5 pattern) | Admitting a calibrated mode later is an additive union member, not a redesign |

---

## 11. Contract-Freeze Verdict

**DESIGN FROZEN. CONTRACT FROZEN. CLEARED FOR IMPLEMENTATION.**

- The intelligence model (§2–§5), the attribution invariants (§4), the progressive-disclosure contract (§6), the dependency surface (§7) and the acceptance criteria (§9) are frozen and implementable as written.
- **All four owner rulings are closed (§10), each approved as recommended.** `TemporalAllocationProfile` is frozen as the single member `FLAT_RATE_IDENTITY` (U1); the Revenue lens is frozen on the present-and-unavailable path with its required authoritative input published (U2); `POST_CAMPAIGN` is frozen as structurally present and numerically empty (U3); confidence is frozen as band-only on the primary timeline surface (U4). The freeze is **no longer conditional**.
- The ambient-movement acceptance clarification (§10.1) is binding and lands as invariant **I1a**, validator `assertAmbientMovementPresent`, and acceptance criteria **5a–5d**.
- **No CDI-01/02/03/04 contract requires modification.** No proven blocker exists. The two candidates for one — the missing unit price and the weekly-rate/horizon ambiguity — are both resolvable inside CDI-05 by disclosure, and are handled that way rather than by editing frozen upstream contracts.
- Governance actions deferred to implementation, per the CDI-04 U7 precedent: **ADR-032** recorded, MASTER_PLAN §CDI-05 row updated to `[COMPLETED]` with the `DecisionTimelineProjection` naming correction (§1.2), and the planning-report decomposition-endpoint mapping (§8.2) reconciled.

---

## 12. Recommended Implementation Agent

**Cursor Auto Balance — suitable, with a mandatory independent review pass before commit.**

**Why it fits.** The work is contract-first, deterministic, and this gate has already resolved every judgement call: the allocation profile is fixed to the identity, the invariants are written as machine-checkable predicates with named guard functions, the evidence and confidence taxonomies are imported from CDI-04 rather than designed, and the acceptance criteria are phrased as failing attacks. What remains is disciplined transcription plus a large regression suite — the CDI-02/03/04 pattern, and Cursor's demonstrated strength on it.

**Why the review pass is non-negotiable.** CDI-02, CDI-03 and CDI-04 each shipped defects found by *independent adversarial review after implementation*, not by their own delivered suites. CDI-05 carries a materially higher risk than its predecessors for one reason: **its output is a picture.** A defect in a readiness state is a wrong word; a defect in a timeline is a persuasive image, and a plausible-looking chart survives scrutiny that a wrong number would not.

The review must specifically probe, in this order:

1. **Ambient leakage into the campaign's claim** — does any path let ambient movement reach the Tier 1 headline, the effect envelope, or a lens difference? (I1, I3, I9, I11)
   - **Ambient erasure from the counterfactual** — the mirror failure, and the more dangerous one because it looks tidy: is the campaign-period counterfactual ever pinned to 100 while ambient is non-zero, so the trajectory difference silently absorbs the world? (I1a, AC-5a–5d)
   - **Fabricated curvature** — any shaped allocation, or any renderer-side spline, easing or smoothing standing in for one. (U1, AC-10a)
2. **Synthetic rendering as history** — pre-campaign variation, an "observed" label reaching the surface, an interpolated gap, a WP10-C scalar drawn as a line. (I6, AC-11–14, AC-28)
3. **Allocation drift** — any path where the campaign-period sum diverges from the CDI-02 endpoint, including rounding accumulated across the grid. (I5)
4. **Decomposition merge** — any rendering that puts ambient and intervention bars in one visual series. (I10)
5. **Half-Life creep** — envelope widening presented, named, or read as recommendation decay. (I12)
6. **Cumulative quantities** — any total, sum or running series over rate quantities. (I13)

---

## 13. Cursor Execution Prompt — CDI-05

```text
COGNIX — CDI-05 IMPLEMENTATION (Decision Timeline & Curiosity-Driven Demand Decomposition)

Branch: Feature/MatchingContract-AutoActivate
Baseline: f765598f28f31c07e2eeffb06a8a6ce81390b345
Authoritative design: docs/reports/COGNIX_CDI_05_DECISION_TIMELINE_DESIGN_GATE.md
(DESIGN FROZEN - CONTRACT FROZEN - CLEARED FOR IMPLEMENTATION; owner rulings U1-U4
applied 2026-08-15 and CLOSED, plus the §10.1 ambient-movement clarification. The
rulings are binding and not reopenable at implementation.)

OWNER RULINGS IN FORCE
- U1 FLAT_RATE_IDENTITY is the campaign-period allocation. CDI-02 provides no temporal
  response shape, so do NOT manufacture one. Richness comes from evidence, context,
  confidence, event markers and progressive explanation - never from demand curvature.
- U2 Revenue lens stays NOT_AVAILABLE. Never derive realised revenue from RRP, from
  contribution, or from an assumed margin. Publish required_authoritative_input naming
  realised_unit_selling_price_gbp and the inadmissible substitutes.
- U3 POST_CAMPAIGN is structurally present and numerically empty until a genuine
  persistence/decay/payback model exists.
- U4 Confidence bands on the primary timeline surface. No numeric confidence index as
  chart precision anywhere on that surface; numeric evidence only where CDI-04 already
  contracts it, at Tier 3, under CDI-04's three constraints.
- §10.1 PRE_CAMPAIGN flat at index 100. During CAMPAIGN, non-zero ambient movement
  appears EQUALLY on both trajectories. A campaign-period counterfactual pinned to 100
  while ambient movement is non-zero MUST FAIL VALIDATION.

Verify continuity first (branch, baseline, both remotes, clean tree, empty stash,
CDI-01/02/03/04 evidence present). Stop on divergence.

BUILD
1. packages/contracts/src/campaign-timeline-model.ts — types and validators per
   design gate §8: TimelineSeriesPoint, TimelineTrajectory, TimelineLensProjection,
   TimelineMarker, TimelineConfidenceEnvelope, DemandDecomposition,
   DecisionTimelineProjection, TemporalAllocationProfile ('FLAT_RATE_IDENTITY' only),
   RequiredAuthoritativeInput, plus assertAmbientParity, assertAmbientMovementPresent,
   assertAttributableIsDifferenceOnly, assertAllocationConserves,
   assertNoObservedHistory, assertPostCampaignEmpty, assertEnvelopeMonotone,
   assertUnavailableLensNamesInput.
   IMPORT EvidenceStrength, EVIDENCE_STRENGTH_ORDER, ReadinessEvidenceRef and
   ConfidenceBand from campaign-readiness-model.ts. Define NO new evidence or
   confidence taxonomy. Export from packages/contracts/src/index.ts.
2. lib/campaign-timeline-engine.ts — pure, deterministic, zero React, no new Date()
   in projection. Implements §2 (grid, phases, point model, flat identity allocation,
   lenses, markers, envelope), §3 (decomposition partitioned by driver_class,
   reconciliation), §5 (evidence/provenance), rejections RJ1-RJ5.
3. POST /api/v1/campaigns/timeline — orchestration only, zero projection logic in the
   route. Returns timeline AND decomposition from ONE CDI-02 evaluation. Publish in
   OpenAPI (campaign-decision-v1.yaml) with the anchor, synthetic, allocation-profile
   and unavailable-lens disclosures.
4. Canvas Layer 5 — §6 four-tier progressive disclosure: What? (attributable effect +
   confidence band + readiness state, one headline claim) -> Why? (driver_class
   partition, two groups, two subtotals) -> Evidence (CDI-04 refs, strengths, verbatim
   disclosures, provenance) -> What If? (CDI-04 change triggers; optional closed-CDI-02
   re-invocation). No tier expanded by default.

NON-NEGOTIABLE INVARIANTS (design gate §4, I1-I15) — each needs a permanent guard
- Ambient components identical index-by-index on BOTH trajectories; the counterfactual
  carries intervention_component_pp === 0 at every point.
- Ambient movement must be PRESENT as well as shared (§2.3.1, §10.1): PRE_CAMPAIGN flat
  at index 100 on both trajectories; during CAMPAIGN with ambient_uplift_pp != 0 both
  trajectories step off 100 by exactly the ambient component and then hold flat. A
  campaign-period counterfactual pinned to 100 while ambient != 0 fails validation and
  emits NO projection. A within-campaign ambient slope also fails (that is a response-
  shape claim). With ambient_uplift_pp === 0, a campaign-period counterfactual at 100 is
  correct and must pass.
- Only the trajectory DIFFERENCE is intervention-attributable.
- Terminal reconciliation to CDI-02 within 0.05 pp; reconciliation_ok === false emits
  NO projection, only the failure and the V1/V2 reference. Re-run both CDI-02
  validators; do not trust the payload.
- Allocation conserves: campaign-period allocated pp sums exactly to the CDI-02
  endpoint. Watch rounding accumulated across the grid.
- No basis, field, label or literal meaning "observed", "actual" or "historical".
  Pre-campaign is flat at index 100. Post-campaign components are null with
  not_modelled_reason — undefined, NOT zero, NOT converging.
- Envelope widens monotonically, is drawn on both trajectories, touches no central
  value and no state. attributable_effect_envelope derives from intervention-driver
  uncertainty ONLY — its width must be independent of ambient_uplift_pp.
- Tier 1 shows attributable_uplift_pp. total_predicted_uplift_pp must NOT appear at
  Tier 1 in any form.
- Decomposition is partitioned by driver_class. No merged all-driver waterfall
  anywhere. attributed:false drivers shown in place with a reason;
  interaction_residual always its own row.
- No cumulative field, no cross-period sum, no horizon total. Every lens value carries
  quantity_basis and is recomputable from index_pct.
- Revenue lens present but NOT_AVAILABLE with 'unit_price_gbp' named in missing_inputs
  and required_authoritative_input published on the lens and echoed in
  provenance.lenses_unavailable[]. Never derive revenue from contribution, from RRP or
  from an assumed margin.
- Confidence is BAND-ONLY on the primary timeline surface: no numeric confidence index
  beside the chart, on the Tier 1 headline, or in an axis, subtitle, tooltip or legend.
- Chart draws straight segments between allocated points only: no curve type, spline,
  easing, smoothing or tension on any timeline series.
- Inventory lens preserves the CDI-02 index-105 waste step unsmoothed at
  DERIVED_KNOWN_DISCONTINUITY. WP10-C scalars carry temporal_extent 'NONE' and never
  render as a series.
- ESF-2 markers already inside ambient carry already_in_ambient: true.
- NO Half-Life semantics: no half_life, *_valid_until, validity, decay, expires,
  remaining_hours, countdown, or re-simulation trigger.
- CDI-05 computes no ReadinessState and no confidence band; readiness is echoed by
  reference. No write to Shared Decision State.

OUT OF SCOPE — must not appear in the diff
CDI-06 Outcome Frontier / competing plays / Pareto / ranked alternatives /
optimisation; CDI-07A Half-Life; CDI-07B Pre-Mortem or Learning; ESF-4/5; ML or LLM
ranking or narrative; new service extraction; any interpolation between two CDI-02
results.

DO NOT MODIFY CDI-01/02/03/04 contracts. If a proven blocker exists, STOP and report.

VALIDATE
- Full CDI-05 suite covering design gate §9 acceptance criteria 1-39, including 5a-5d
  (ambient movement) and 10a (no fabricated curvature), written as attacks (the fixture
  that SHOULD fail must fail).
- Existing suites unchanged: CDI-04 49/49, CDI-03 31/31, CDI-02 30/30, CDI-01 21/21,
  ESF-2, ESF-3, IFI-1, WP10-A/B/C/D.
- Contracts tsc --noEmit clean; next build clean; git diff --check clean.

THEN STOP for an independent adversarial review before commit, probing in order:
ambient leakage into the campaign's claim; ambient ERASURE from the counterfactual
(pinned to 100 while ambient != 0); fabricated curvature, including renderer-side
splines and easing; synthetic rendering as history; allocation drift including
accumulated rounding; decomposition merge; Half-Life creep; cumulative quantities.

Leave no model or tool identity, watermark, signature, attribution, generated-by
marker, co-author trailer or model reference in repository content or metadata.
```
