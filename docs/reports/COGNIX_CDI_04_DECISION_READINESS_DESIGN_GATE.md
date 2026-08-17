# COGNIX — CDI-04 CAMPAIGN DECISION READINESS & RESILIENCE — INTELLIGENCE DESIGN GATE

| Field | Value |
|---|---|
| Work Package | CDI-04 — Campaign Decision Readiness & Resilience |
| Gate type | Design & contract freeze — **no product implementation** |
| Authorised baseline | `54a25258c13722bdc1dcbddf73c53ad7a720f405` |
| Branch | `Feature/MatchingContract-AutoActivate` |
| Gate date | 2026-08-15 |
| Owner rulings applied | 2026-08-15 — U1 (operational thresholds), U2 (negative contribution), architecture runtime-truth correction |
| Status | **DESIGN FROZEN — CONTRACT FROZEN — CLEARED FOR IMPLEMENTATION** |

---

## 1. Continuity

| Check | Result |
|---|---|
| Branch | `Feature/MatchingContract-AutoActivate` |
| HEAD vs authorised baseline | **MATCH** — `54a25258c13722bdc1dcbddf73c53ad7a720f405` |
| Remotes | `gitlab` (`repo.glassx.ai/development/decision-intelligence`) + `origin` (`github.com/renjug10x/Decision_Intelligence`) |
| Working tree | Clean |
| Stash | Empty |
| CDI-01 evidence | `docs/reports/COGNIX_CDI_01_CAMPAIGN_DECISION_CANVAS_REPORT.md` — CLOSED; contract frozen at `packages/contracts/src/campaign-intent-model.ts` |
| CDI-02 evidence | `docs/reports/COGNIX_CDI_02_COUNTERFACTUAL_CAUSAL_REPORT.md` — CLOSED / independently verified; `campaign-counterfactual-model.ts`, `lib/campaign-causal-engine.ts` |
| CDI-03 evidence | `docs/reports/COGNIX_CDI_03_OPPORTUNITY_WINDOW_MICROMARKET_REPORT.md` — CLOSED after six in-scope corrections; `campaign-opportunity-model.ts`, `lib/campaign-opportunity-engine.ts` |
| Governance | MASTER_PLAN §CDI stream lists CDI-01/02/03 `[COMPLETED]`, next package `CDI-04`; ADR-026/028/029/030 present, next free ADR is **ADR-031** |
| Unexplained divergence | **None — gate PASSED** |

### 1.1 Material continuity finding — **CORRECTED** (affects §5)

`docs/architecture/ARCHITECTURE.md` §3.3 referred to a **`lib/ripple-engine.ts`** that **does not exist**. Verification at this gate found the sibling reference in the same section — **`lib/commitment-engine.ts`** — is equally false: neither file exists in the repository. What actually exists is:

- `calculateDerivedImpacts()` in `packages/contracts/src/decision-state-model.ts:97` — the **only deterministic cross-functional propagation in the repository**, owned by WP10-C, emitting `dc_overtime_hours` (2nd order) and `margin_erosion_pct` (3rd order) alongside `commitment_gap_units`, `delivery_risk_pct`, `financial_exposure_gbp` and `stockout_probability_pct`.
- `components/DecisionRippleIntelligence.tsx` — a presentation component whose 1st/2nd/3rd-order figures are **inline literals** (`components/DecisionRippleIntelligence.tsx:63-67`), not a callable engine.
- `components/CommitmentIntelligence.tsx` — a presentation component computing the commitment chain **inline** (`components/CommitmentIntelligence.tsx:93-101`) over Shared Decision State parameters; no commitment engine module exists either.

**Governance action taken (owner-directed).** `docs/architecture/ARCHITECTURE.md` §3.3 has been corrected to runtime truth and republished at **v1.1.1**: the section is renamed *Core Domain Propagation*, both false engine paths are withdrawn with an explicit correction note, `calculateDerivedImpacts()` is named as the single authoritative propagation, and a binding **consumption rule** is added — downstream capabilities read `DecisionDerivedImpacts` read-only, never presentation-layer literals, never recomputing ripple arithmetic, never writing to Decision State.

This is consistent with the planning report's own classification of Decision Ripple as a **PROPOSED INTEGRATION**, not an existing engine (`COGNIX_CAMPAIGN_DECISION_INTELLIGENCE_PLANNING_REPORT.md:97`, `:237`). CDI-04's Decision Ripple boundary is therefore defined against `DecisionDerivedImpacts`, not against a non-existent engine. See §5.

**No standalone Decision Ripple engine exists, and CDI-04 does not create one.**

---

## 2. Six-Dimension Readiness Model

### 2.1 Design position

Readiness is **not** a score. It is six independent, separately-evidenced assessments plus a deterministic aggregation with no compensation between dimensions. There is no cross-dimension arithmetic anywhere in the model: a strong Commercial result cannot raise, offset, average away, or outvote a constrained Operational result. Aggregation is a **floor over a lattice**, never a sum (§3.3).

Each dimension answers one question, declares its own required inputs, and publishes its own evidence strength and findings.

### 2.2 Dimension definitions

| Dimension | Question it answers | It must NOT answer |
|---|---|---|
| **Commercial** | Does this intervention create more value than doing nothing, on the metric the campaign actually stated? | Whether a *different* intervention would be better (CDI-06) |
| **Demand** | Is the predicted demand causally credible, reconciled, and attributable to the intervention rather than to ambient movement? | What the demand will be over time (CDI-05) |
| **Operational** | Can the estate physically serve the predicted demand, and what does serving it cost elsewhere? | Enumerated failure modes with likelihood × impact (CDI-07B.1) |
| **Context** | Is the surrounding world supportive or hostile in the chosen window, and how well is that actually evidenced? | How long the recommendation stays valid (CDI-07A) |
| **Customer** | Is there a coherent, reachable audience and place for this intervention? | Store-level re-tiering (owned by CDI-03) |
| **Strategic** | Does this intervention serve the stated objective and posture, and is intervening the right posture at all? | Generating alternative plays (CDI-06) |

### 2.3 Commercial

**Required inputs (all CDI-02, HARD):**

- `counterfactual.campaign_delta.contribution_delta_gbp`
- `counterfactual.campaign_delta.volume_delta_units`, `volume_delta_pct`
- `counterfactual.campaign_delta.attributable_uplift_pp`
- `counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing`
- `counterfactual.predicted_with_intervention.unit_contribution_gbp` vs `current_baseline.unit_contribution_gbp`
- `counterfactual.campaign_delta.waste_delta_units`

**Required inputs (CDI-01, frozen):** `campaign_intent.objective_type`, `baseline_objective.primary_metric`, `target_direction`, `target_value`, `target_unit`.

**Optional CDI-04 request input:** `economic_tolerance` (see below). Never inferred, never defaulted, never derived.

#### 2.3.1 Objective-awareness (owner ruling U2)

Negative contribution is **not a universal veto**. Commercial is evaluated against the objective the campaign actually stated. CDI-04 first derives a `commercial_objective_class` deterministically from frozen CDI-01 fields:

| Class | Derivation | Meaning |
|---|---|---|
| `VALUE_CREATION` | `primary_metric ∈ {CONTRIBUTION, REVENUE}` and `target_direction ∈ {INCREASE, PROTECT}`; **or** `objective_type = REVENUE_ACCELERATION` | The campaign exists to grow or defend the value metric itself |
| `VALUE_TRADE` | `primary_metric ∈ {WASTE_REDUCTION, AVAILABILITY, VOLUME}`, **or** `objective_type ∈ {INVENTORY_CLEARANCE, MARKET_DEFENSE, LAUNCH}` | The campaign may legitimately spend value to buy a non-value outcome — waste reduction, customer acquisition, market defence, strategic launch |
| `UNCLASSIFIED` | `objective_type = OTHER` with a non-value metric and no other signal | Treated as `VALUE_TRADE` **with no tolerance** — the strictest non-veto path |

**Precedence rule.** Where `objective_type` and `primary_metric` disagree, the **stated metric wins**. A campaign that declares `primary_metric = CONTRIBUTION, target_direction = INCREASE` is `VALUE_CREATION` regardless of its objective label; the campaign is judged on the metric it actually committed to.

> **Customer acquisition** has no dedicated `CampaignObjectiveType` at CDI-01 today; it is expressed as `LAUNCH` or `OTHER` and classifies `VALUE_TRADE`. This is recorded as a CDI-01 vocabulary gap, **not** a CDI-04 correction — no frozen contract is modified.

#### 2.3.2 Economic tolerance

An **economic tolerance** is an explicit, owner-declared limit on how much contribution the business is willing to sacrifice to buy the stated non-value outcome.

```ts
economic_tolerance?: {
  max_contribution_sacrifice_gbp: number;  // ≥ 0, absolute £
  rationale: string;                       // why the sacrifice is justified
  declared_by: string;
  objective_basis: CampaignObjectiveType;
}
```

Binding rules:

1. Tolerance is supplied on the CDI-04 request only. It is **never inferred from data, never defaulted, never derived from a percentage**. Absence is absence.
2. Tolerance applies **only** to `VALUE_TRADE` / `UNCLASSIFIED`. Declaring a tolerance alongside a `VALUE_CREATION` objective is a **rejection (R5)**, not a state — a campaign cannot pre-authorise destroying the very metric it committed to increase. This closes the "tune away the veto" hole.
3. Tolerance is published as evidence at strength `DECLARED_INPUT` with its rationale and remaining headroom, and recorded in `provenance`. It may never render as `OBSERVED`.
4. **Tolerance never buys a `CLEAR`.** Operating inside a tolerance is a stated trade, so Commercial is at best `CONSTRAINED`.

#### 2.3.3 Deterministic rules

| Rule | Condition | Effect |
|---|---|---|
| C1 | `commercial_objective_class = VALUE_CREATION` and `contribution_delta_gbp < 0` | **BLOCKING** (veto V3a) — material **by construction**: the intervention moves the stated value metric against its stated direction. No percentage cut-off is involved |
| C2 | `class ∈ {VALUE_TRADE, UNCLASSIFIED}`, `contribution_delta_gbp < 0`, **no** tolerance declared | **CONSTRAINED** — the trade is real but unauthorised. Commercial can never be `CLEAR`. Discharge test: declare an economic tolerance that covers the sacrifice, or restore `contribution_delta_gbp ≥ 0` |
| C3 | `class ∈ {VALUE_TRADE, UNCLASSIFIED}`, tolerance declared, `abs(contribution_delta_gbp) ≤ max_contribution_sacrifice_gbp` | **CONSTRAINED** — viable within tolerance. The sacrifice, the limit and the remaining headroom are stated in £; never absorbed, never netted away |
| C4 | `class ∈ {VALUE_TRADE, UNCLASSIFIED}`, tolerance declared, `abs(contribution_delta_gbp) > max_contribution_sacrifice_gbp` | **BLOCKING** (veto V3b) — the explicitly declared economic limit is breached ⇒ `DO_NOT_PROCEED` |
| C5 | `intervention_indistinguishable_from_do_nothing = true` while posture ∈ {`CONSIDER_PROMOTION`, `CONSIDER_NON_PROMOTION`} | **CONSTRAINED** — the campaign claims an intervention that the model cannot distinguish from inaction |
| C6 | `unit_contribution_gbp` eroded ≥ **TH-C1** vs baseline while `contribution_delta_gbp > 0` | **WATCH** — value survives only on volume; record the erosion explicitly |
| C7 | `target_value` stated and predicted movement on `primary_metric` falls short | **WATCH** (shortfall < **TH-C2**) / **CONSTRAINED** (≥ **TH-C2**) |
| C8 | All above clear and `contribution_delta_gbp > 0` | **CLEAR** |

**Commercial invariant (owner ruling U2).** `contribution_delta_gbp < 0` can **never** produce a `CLEAR` Commercial dimension under any objective class, with or without a tolerance — and therefore can never produce `GO`. This is additionally enforced structurally by cap **K7** (§3.4), so the guarantee does not depend on the Commercial rule table alone.

**Waste constraint (discharges CDI-02 residual risk 6).** CDI-02 records that waste modelling is asymmetric and discontinuous (a 0.92 clearance factor with a step at index 105). CDI-04 **must not** correct that model — it is closed CDI-02 semantics. Instead, `waste_delta_units` is admitted at evidence strength `DERIVED_KNOWN_DISCONTINUITY` and **may never be the sole decisive finding** for a `CLEAR` Commercial or Operational assessment. Implementation must carry a permanent guard for this.

### 2.4 Demand

**Required inputs (all CDI-02, HARD):**

- `causal.reconciliation_ok`, `causal.reconciled_sum_pp`
- `causal.ambient_uplift_pp`, `causal.intervention_uplift_pp`, `causal.total_predicted_uplift_pp`
- `causal.drivers[]` — `driver_id`, `driver_class`, `contribution_pp`, `attributed`, `rationale`, `evidence_refs`
- `causal.placeholder_fields_excluded[]`
- `causal.signal_simulation_id` (present only when `include_signals = true`)
- Both CDI-02 validators re-run: `validateCounterfactualBaseline`, `validateCausalDemandContribution`

**Deterministic rules:**

| Rule | Condition | Effect |
|---|---|---|
| D1 | `reconciliation_ok = false`, or either CDI-02 validator returns errors | **BLOCKING** (veto V1/V2) — the evidence itself is untrustworthy; no readiness state may be asserted over it |
| D2 | `intervention_uplift_pp <= 0` while posture claims an intervention | **CONSTRAINED** — all movement is ambient |
| D3 | `ambient_uplift_pp > intervention_uplift_pp` | **WATCH** — the campaign is riding the world, not moving it; must be stated in Tier 1, never buried |
| D4 | `interaction_residual` \|contribution_pp\| > **TH-D1** of `intervention_uplift_pp` | **CONSTRAINED** — the decomposition does not explain its own result |
| D5 | Single intervention driver ≥ **TH-D2** of `intervention_uplift_pp` | **WATCH** — concentration risk; name the driver |
| D6 | `placeholder_fields_excluded` non-empty | **WATCH**, and the excluded fields are listed verbatim. Placeholders never raise a dimension (§8) |
| D7 | `include_signals = false` | Evidence strength for ambient drivers degrades to `DERIVED`; Demand cannot be `CLEAR` at `OBSERVED` strength |
| D8 | All above clear, reconciled, and `intervention_uplift_pp > 0` | **CLEAR** |

### 2.5 Operational

**Required inputs:**

- **WP10-C Shared Decision State** (`packages/contracts/src/decision-state-model.ts`) — `derived_impacts.commitment_gap_units`, `supplier_capacity_units`, `delivery_risk_pct`, `stockout_probability_pct`, `dc_overtime_hours`, `margin_erosion_pct`, `financial_exposure_gbp`; plus `scenario_parameters.promotion_lift`, `supplier_capacity_cap`, `campaign_scope`, `selected_interventions`.
- **CDI-02** — `counterfactual.predicted_with_intervention.volume_units` (authoritative demand side).
- **ESF-2 signals**, when `include_signals = true` — `SUPPLIER_CAPACITY_PRESSURE`, `SUPPLIER_LEAD_TIME_DRIFT`, `STOCK_COVER_DECLINE`.
- **WP10-A** — `EnterpriseWorldScenario.baselineMetrics` (`supplierCapacityUnits`, `onTimeDeliveryPct`, `wasteRatePct`).

**Capacity basis rule (mandatory).** CDI-02 and WP10-C run **two independent demand models** that happen to share a 10,000-unit base (`lib/campaign-causal-engine.ts:33` `BASE_WEEKLY_UNITS`; `decision-state-model.ts:101` `BASE_DEMAND`). Their *lifts* have different sources — a Decision State `promotion_lift` parameter versus a CDI-02 causal decomposition. CDI-04 must therefore:

1. Take the **demand side exclusively from CDI-02** (`predicted_with_intervention.volume_units`). CDI-02 is the HARD dependency and the authoritative demand statement.
2. Take the **capacity side from WP10-C** `derived_impacts.supplier_capacity_units`.
3. Publish `capacity_basis` naming both sources and their base assumptions.
4. Emit an explicit `model_divergence` finding — never a silent reconcile — when `decision_state.scenario_parameters.promotion_lift` differs from `causal.total_predicted_uplift_pp` by more than **TH-O5** (5 pp). Divergence is a **WATCH** at minimum and caps confidence at `MODERATE`.
5. **Never recompute demand** from Decision State parameters, and never write to Decision State.

**Feasibility rule (owner ruling U1) — a veto means physically unservable, not a percentage.**

The Operational veto is a **structural infeasibility predicate**, not a threshold breach. Demand is infeasible only when it cannot be served *even with every available recovery lever applied*:

```
recoverable_headroom_units = Σ headroom of WP10-C interventions not currently applied
infeasible                 = commitment_gap_units > recoverable_headroom_units
```

WP10-C recovery levers, mirrored read-only from `packages/contracts/src/decision-state-model.ts:107-109`:

| Lever | Headroom | Source |
|---|---|---|
| `SLA_FLEX_RULE_4` | +1,200 units | `calculateDerivedImpacts()` |
| `BUFFER_OPTIMISATION_R002` | +500 units | `calculateDerivedImpacts()` |

CDI-04 declares this catalogue in its **own** contract as a mirror with explicit provenance — it does not modify WP10-C — and carries a **parity guard test** asserting the mirrored values equal the WP10-C constants, so any upstream drift breaks the build rather than silently mis-stating feasibility.

Everything short of infeasibility is **recoverable** and degrades to `CONDITIONAL_GO` (when a lever can be expressed as a discharge test) or `REVIEW` (when it cannot) — never to a veto.

**Deterministic rules:**

| Rule | Condition | Effect |
|---|---|---|
| O1 | `commitment_gap_units > recoverable_headroom_units` | **BLOCKING** (veto V4) — structurally unservable: no combination of available levers closes the gap |
| O2 | `0 < commitment_gap_units ≤ recoverable_headroom_units` | **CONSTRAINED** — recoverable. State the gap in units, the exposure in £, and name the lever(s) that close it as a discharge test ⇒ `CONDITIONAL_GO`. If no lever is expressible as a testable condition, degrade to `REVIEW` |
| O3 | `stockout_probability_pct ≥` **TH-O1**, or `delivery_risk_pct ≥` **TH-O2** with `commitment_gap_units > 0` | **CONSTRAINED** — service-risk pressure. Explicitly **never a veto**: these are synthetic demonstration policy thresholds (§2.9), not feasibility |
| O4 | CDI-02 predicted volume > `supplier_capacity_units` while `commitment_gap_units = 0` | **CONSTRAINED** + `model_divergence` — the two models disagree about feasibility |
| O5 | `dc_overtime_hours` above baseline (12 h) by ≥ **TH-O3**, or `margin_erosion_pct ≥` **TH-O4** | **WATCH** — second/third-order cost is real but not disqualifying |
| O6 | ESF-2 `SUPPLIER_CAPACITY_PRESSURE` or `SUPPLIER_LEAD_TIME_DRIFT` observed with adverse `delta_pct` | **WATCH**; may escalate O2's severity and reduce assumed lever headroom, but **never fires V4 by itself** and never converts a recoverable gap into an infeasible one on signal alone |
| O7 | Decision State absent for the tenant/session | Operational = **`NOT_EVALUATED`** with reason; overall state capped at `CONDITIONAL_GO` (§3.4) |
| O8 | All above clear, `commitment_gap_units = 0`, no adverse supply signal | **CLEAR** |

**Demo-path consequence (recorded deliberately).** At default parameters (lift 20%, cap 10%) `commitment_gap_units = 1,000` against `recoverable_headroom_units = 1,700` ⇒ **recoverable**: Operational is `CONSTRAINED` with `SLA_FLEX_RULE_4` named as the discharge test, and the overall state is `CONDITIONAL_GO`. Under the previous draft the same scenario produced stockout 50% / delivery risk 21% and also avoided a veto — but by falling *below an arbitrary cut-off* rather than by being *demonstrably recoverable*. The distinction is the ruling.

### 2.6 Context

**Required inputs (CDI-03, INTEGRATION):**

- `opportunity_windows.recommended_window` — `tier`, `yield_score`, `factors[]`, `inclusion_reasons`, `exclusion_risks`, `is_stated_dates`
- `opportunity_windows.discovery_anchor` — `anchor_date`, `anchor_mode`, `disclosure`
- `opportunity_windows.timing_mode`, `resolved_temporal_uplift_pp`

**Required inputs (CDI-01):** `audience_market.timing_mode`, `planned_start`, `planned_end`; `decision_context.contextual_factor_notes[]`, `assumptions[]`.

**Optional (ESF-2/ESF-3):** contextual canonical signals (`WEATHER_*`, `COMPETITOR_CAMPAIGN_LAUNCH`, `LOCAL_EVENT_DEMAND_SURGE`, `PAYDAY_CALENDAR_EFFECT`).

**Anchor rule (mandatory).** CDI-03's `discovery_anchor` is `fixed_demo_anchor` at `2026-08-17` and is explicitly **not live calendar evidence** (CDI-03 correction D3, residual risk 7). Every Context finding derived from window candidates is therefore classified `SEEDED_ASSUMPTION`. A Context assessment whose decisive finding rests on `SEEDED_ASSUMPTION` **cannot be `CLEAR` at `OBSERVED` strength** and caps the overall state at `CONDITIONAL_GO`. The anchor and its disclosure text must be reproduced verbatim in the readiness output.

**Deterministic rules:**

| Rule | Condition | Effect |
|---|---|---|
| X1 | `recommended_window.tier = AVOID` and `is_stated_dates = true` | **CONSTRAINED** — the campaign's own dates are hostile. Deliberately *not* a veto: an executive may hold a valid commercial reason the model cannot see; the constraint must be answered, not silently overridden |
| X2 | `recommended_window.tier = AVOID` and `is_stated_dates = false` | **CONSTRAINED** — the best discoverable window is still poor |
| X3 | `tier = SUBOPTIMAL` | **WATCH** |
| X4 | `timing_mode = FIND_BEST_WINDOW` and CDI-02 was evaluated **without** `resolved_temporal_uplift_pp` | **WATCH** + `unresolved_timing` finding — the causal result still carries the flat placeholder dampener |
| X5 | Adverse contextual signal observed inside the window (competitor launch, adverse weather) | **WATCH**; **TH-X1** or more concurrent adverse contextual signals ⇒ **CONSTRAINED** |
| X6 | `tier ∈ {PREFERRED, ACCEPTABLE}`, no adverse contextual signal | **CLEAR** — at `SEEDED_ASSUMPTION` strength, per the anchor rule |

### 2.7 Customer

**Required inputs (CDI-03, INTEGRATION):** `micro_markets.stores_evaluated`, `stores_included`, `recommended_store_ids[]`, `stores[].tier`, `stores[].inclusion_reasons`, `stores[].exclusion_reasons`, `cohorts[]`, `region_scope`.

**Required inputs (CDI-01):** `audience_market.region`, `customer_segment`, `channel`, `store_cohort_hint`.

**Optional ESF-2:** `SEARCH_VELOCITY_ACCELERATION`, `BASKET_ADD_ACCELERATION`, `PRODUCT_ENGAGEMENT_ACCELERATION` for the category.

**Tier-inheritance rule (mandatory).** CDI-04 **inherits** CDI-03 store tiers verbatim and must not re-tier, re-weight, or re-threshold them. Re-tiering would fork CDI-03 semantics and create a second, competing where-engine. CDI-03 residual risk 6 (41 of 50 stores classify `HIGH` at national scope) is handled as a **concentration/selectivity finding**, not a correction.

| Rule | Condition | Effect |
|---|---|---|
| U1 | `stores_included = 0` | **BLOCKING** (veto V5) — there is nowhere to run this |
| U2 | `stores_included ≤ 2` | **CONSTRAINED** — the addressable estate is too thin to carry the predicted volume |
| U3 | `stores_included / stores_evaluated ≥` **TH-U1** | **WATCH** + `low_selectivity` finding, naming CDI-03 residual risk 6. A "micro-market" that includes 82% of the estate is a national campaign wearing a targeting label |
| U4 | `customer_segment` stated but no supporting customer signal available | **WATCH** — the segment is an assumption, not evidence |
| U5 | ≥ **TH-U2** of evaluated stores excluded for availability reasons | **CONSTRAINED** — CDI-03 availability is a deterministic hash proxy (residual risk 3), so this is `PROXY` strength and must be labelled |
| U6 | Selectivity in range, non-trivial included estate, no adverse finding | **CLEAR** |

### 2.8 Strategic

**Required inputs (CDI-01):** `campaign_intent.objective_type`, `intervention_posture`, `framing_question`, `provisional_mechanic`, `provisional_discount_depth`; `baseline_objective.primary_metric`, `target_direction`; `decision_context.open_questions[]`, `assumptions[]`; `status`.

**Required inputs (CDI-02):** `intervention_posture` echoed on both counterfactual and causal, `campaign_delta.attributable_uplift_pp`, resolved mechanic attribution.

| Rule | Condition | Effect |
|---|---|---|
| S1 | `objective_type = INVENTORY_CLEARANCE` and `waste_delta_units ≥ 0` | **CONSTRAINED** — the intervention does not serve the stated objective |
| S2 | `primary_metric` and the metric where value actually lands disagree (e.g. metric `CONTRIBUTION`, value delivered only as volume) | **CONSTRAINED** — objective drift |
| S3 | `intervention_posture = UNDECIDED` | **CONSTRAINED** — readiness for *what*? An undecided posture has no intervention to be ready for |
| S4 | `intervention_posture = CONSIDER_DO_NOTHING` | Strategic **CLEAR** is permissible; the whole assessment is then a readiness statement about *inaction*, and every dimension must be labelled accordingly |
| S5 | `CONSIDER_PROMOTION` with no canvas-stated mechanic or depth (`placeholder_fields_excluded` non-empty) | **CONSTRAINED** — the campaign is asking whether it is ready to execute a promotion it has not specified |
| S6 | `open_questions[]` non-empty | **WATCH**, questions reproduced verbatim as conditions-in-waiting |
| S7 | Objective, metric, posture and mechanic mutually coherent | **CLEAR** |

### 2.9 Centralised threshold policy (owner ruling U1)

All non-feasibility thresholds are **explicit, centralised, published and labelled as synthetic demonstration policy**. They are declared once, in one exported policy object, and referenced by `threshold_id` from the rule tables — no rule may inline a numeric constant.

| ID | Applies to | Rule(s) | Value | Effect ceiling | Basis | Calibration target |
|---|---|---|---|---|---|---|
| TH-C1 | Commercial | C6 | 20% unit-contribution erosion | `WATCH` | Demo convention: value surviving only on volume | Realised margin history |
| TH-C2 | Commercial | C7 | 25% shortfall vs `target_value` | `CONSTRAINED` | Demo convention | Historical target attainment variance |
| TH-D1 | Demand | D4 | 25% of `intervention_uplift_pp` | `CONSTRAINED` | Decomposition self-explanation limit | Observed residual distribution |
| TH-D2 | Demand | D5 | 70% single-driver share | `WATCH` | Concentration convention | Driver-share distribution |
| TH-O1 | Operational | O3 | `stockout_probability_pct` 70 | `CONSTRAINED` | Demo constant — **demoted from veto by ruling U1** | Real stockout outcomes |
| TH-O2 | Operational | O3 | `delivery_risk_pct` 50 | `CONSTRAINED` | Demo constant — **demoted from veto by ruling U1** | Real OTIF breach data |
| TH-O3 | Operational | O5 | +50% over 12 h DC overtime baseline | `WATCH` | WP10-A baseline convention | DC labour actuals |
| TH-O4 | Operational | O5 | `margin_erosion_pct` 3.0 | `WATCH` | Demo constant | Realised margin erosion |
| TH-O5 | Operational / confidence | §2.5 divergence | 5 pp CDI-02 vs Decision State lift | `WATCH` + confidence cap | Model-agreement convention | Model reconciliation history |
| TH-U1 | Customer | U3 | 0.80 selectivity ratio | `WATCH` | CDI-03 residual risk 6 | Estate-targeting norms |
| TH-U2 | Customer | U5 | 0.30 availability-exclusion share | `CONSTRAINED` | CDI-03 proxy convention | Real availability data |
| TH-X1 | Context | X5 | 2 concurrent adverse contextual signals | `CONSTRAINED` | Demo convention | Signal co-occurrence base rates |

**Policy invariants (structurally enforceable):**

1. **No threshold may fire a veto.** Every `ReadinessThreshold.effect_ceiling` is `WATCH` or `CONSTRAINED`; `BLOCKING` is not a permitted value. A validator proves it, so no future edit can promote a percentage into a veto.
2. **Vetoes are infeasibility or integrity predicates only** — contract violation (V1, V2), stated-objective contradiction or breached declared tolerance (V3a, V3b), structural unservability (V4), no addressable estate (V5).
3. **Provenance is published.** The whole policy is emitted on every response as `threshold_policy` with `provenance: 'synthetic_demonstration_policy'`, `synthetic_demo: true`, `calibration_status: 'UNCALIBRATED_LAB_DEFAULT'` per threshold, and a named `calibration_target`.
4. **Not caller-configurable.** The policy is a build-time constant. No request field may override a threshold — configurability would let a caller tune away a constraint.
5. **Every threshold is a declared future calibration target**, carried as an explicit residual for the calibration work package.

---

## 3. State Transition & Veto Semantics

### 3.1 Dimension states

`CLEAR` → `WATCH` → `CONSTRAINED` → `BLOCKING`, plus two non-ordinal states: `INSUFFICIENT_EVIDENCE` (a required input is missing) and `NOT_EVALUATED` (an optional integration is absent, with a stated reason).

### 3.2 Overall states

| State | Meaning |
|---|---|
| `GO` | Proceed with the intervention as specified. Every dimension `CLEAR`, evidence `DERIVED` or better throughout, confidence ≥ `MODERATE`, zero open conditions. |
| `CONDITIONAL_GO` | Proceed **subject to enumerated, testable conditions**. Not a softer `GO`. |
| `REVIEW` | The model cannot responsibly distinguish `GO` from a veto. Human adjudication required. |
| `DO_NOT_PROCEED` | At least one hard veto fired. Scoped to **this intervention as specified** — never a verdict on the underlying commercial question. |

### 3.3 Aggregation — floor, never sum

```
overall_floor = worst(dimension_state) over all six dimensions

BLOCKING present                              → DO_NOT_PROCEED
INSUFFICIENT_EVIDENCE present                 → REVIEW   (minimum; may be DO_NOT_PROCEED if a veto also fired)
CONSTRAINED present, no discharge test exists → REVIEW
CONSTRAINED present, all expressible as conditions → CONDITIONAL_GO
WATCH present only                            → CONDITIONAL_GO
All CLEAR                                     → GO       (subject to caps, §3.4)
```

**Non-compensation is a hard invariant.** No dimension result may raise another dimension's state, and no aggregate may exceed the floor. Implementation must carry a regression guard proving that a `CLEAR` Commercial with a `BLOCKING` Operational still returns `DO_NOT_PROCEED`, and that six `CLEAR`s plus one `CONSTRAINED` never returns `GO`.

### 3.4 Caps

A cap lowers the ceiling; it never raises a state.

| Cap | Trigger | Ceiling |
|---|---|---|
| K1 | Any decisive finding at `SEEDED_ASSUMPTION` or `PROXY` strength | `CONDITIONAL_GO` |
| K2 | CDI-03 not supplied (Context and Customer `NOT_EVALUATED`) | `CONDITIONAL_GO` |
| K3 | Decision State absent (Operational `NOT_EVALUATED`) | `CONDITIONAL_GO` |
| K4 | `include_signals = false` | `CONDITIONAL_GO` |
| K5 | Confidence band = `LOW` | `REVIEW` |
| K6 | Confidence band = `INSUFFICIENT` | `REVIEW` |
| **K7** | `contribution_delta_gbp < 0` under **any** objective class, with or without a declared economic tolerance (owner ruling U2) | `CONDITIONAL_GO` |
| **K8** | Operational gap recoverable only by applying an unapplied WP10-C lever (O2), i.e. feasibility is conditional on an action not yet taken | `CONDITIONAL_GO` |

Caps K7 and K8 are **structural backstops**: K7 makes "negative contribution never produces `GO`" true independently of the Commercial rule table, and K8 makes "a recoverable operational gap never produces `GO`" true independently of the Operational rule table. Both hold even if a future rule edit were wrong.

`GO` is therefore unreachable on synthetic-only evidence by construction. That is intended: the demo estate cannot honestly emit an unconditional `GO`, and pretending otherwise is precisely the failure mode this gate exists to prevent.

### 3.5 Hard vetoes

Each veto is deterministic, cites the exact field that fired it, and is reproduced in the output as a `ReadinessVeto`.

| ID | Dimension | Condition | Rationale |
|---|---|---|---|
| **V1** | Demand | `causal.reconciliation_ok = false` | The decomposition does not add up. Nothing downstream is assertable. |
| **V2** | Demand | `validateCounterfactualBaseline` or `validateCausalDemandContribution` returns errors | Same: the input contract is violated. |
| **V3a** | Commercial | `commercial_objective_class = VALUE_CREATION` and `contribution_delta_gbp < 0` | The intervention destroys the value metric the campaign committed to increase or protect. Material **by construction**, not by percentage. |
| **V3b** | Commercial | `class ∈ {VALUE_TRADE, UNCLASSIFIED}`, an economic tolerance is **declared**, and `abs(contribution_delta_gbp) > max_contribution_sacrifice_gbp` | The explicitly authorised economic sacrifice is exceeded. Owner ruling U2: exceeding a stated tolerance ⇒ `DO_NOT_PROCEED`. |
| **V4** | Operational | `commitment_gap_units > recoverable_headroom_units` | Predicted demand is unservable **even with every available WP10-C recovery lever applied** — genuine operational infeasibility, not a threshold breach (owner ruling U1). |
| **V5** | Customer | `micro_markets.stores_included = 0` | No addressable estate. |

**Veto discipline (owner ruling U1).** No veto references a `ReadinessThreshold`. Every veto predicate is either a contract/model-integrity failure (V1, V2), a contradiction of the campaign's own stated economic position (V3a, V3b), or physical infeasibility (V4, V5). Where a constraint is recoverable, it degrades to `CONDITIONAL_GO` — or to `REVIEW` when recovery cannot be expressed as a discharge test — and never to `DO_NOT_PROCEED`.

### 3.6 Rejections (errors, not states)

These return a validation error. Emitting a readiness *state* over an invalid request would launder a contract violation into an intelligence output.

| ID | Condition |
|---|---|
| R1 | `CampaignIntent.status ≠ REGISTERED` |
| R2 | `timing_mode = KNOWN_DATES` without a valid stated range (upholds CDI-01/CDI-03 D4 at the readiness boundary) |
| R3 | Tenant/session mismatch between request and any supplied CDI-02/CDI-03 evaluation |
| R4 | Supplied CDI-02 evaluation references a different `campaign_intent_id` |
| **R5** | `economic_tolerance` supplied while `commercial_objective_class = VALUE_CREATION` — a campaign cannot pre-authorise destroying the metric it committed to increase or protect (owner ruling U2) |
| **R6** | Request attempts to override any `ReadinessThreshold` — the threshold policy is a build-time constant and is not caller-configurable (owner ruling U1) |

### 3.7 Conditional-go conditions

`CONDITIONAL_GO` is only legitimate when every open item is a **testable condition**. Each `ReadinessCondition` carries:

- `condition_id`, `dimension`, `statement` (what must be true)
- `discharge_test` — a deterministic, re-runnable predicate over named contract fields
- `evidence_gap` — what is missing today
- `blocking_if_unmet` — whether failure to discharge degrades to `REVIEW` or `DO_NOT_PROCEED`

**If a finding cannot be expressed as a discharge test, it is not a condition — the state degrades to `REVIEW`.** This is what stops `CONDITIONAL_GO` from becoming a wastebasket for unresolved doubt.

### 3.8 What could change the recommendation

`ReadinessChangeTrigger[]` is a **projection of the same rule set that produced the state** — not narrative, not speculation. Each entry names: `field_path`, `current_value`, `threshold`, `direction`, `would_change_state_to`, `dimension`.

Example shape: *`derived_impacts.commitment_gap_units` is 1,000; at 0 the Operational dimension moves `CONSTRAINED → CLEAR` and the overall state moves `CONDITIONAL_GO → GO`.*

Triggers must be generated from the rule table and the §2.9 threshold policy, not hand-authored, so they cannot drift from the logic. A trigger whose `threshold` comes from the policy carries its `threshold_id`, so the reader can see it is a synthetic demonstration constant and not a measured limit. Feasibility triggers carry `recoverable_headroom_units` rather than a percentage. **No time-decay, no half-life estimate, no validity countdown** — that is CDI-07A and is out of scope.

---

## 4. Confidence & Evidence Model

### 4.1 Evidence strength

| Strength | Meaning | Example |
|---|---|---|
| `OBSERVED` | Measured from a signal or system of record | ESF-2 observation with `source_type = ENTERPRISE_SYSTEM` |
| `DERIVED` | Deterministically computed from observed or contracted inputs | CDI-02 `attributable_uplift_pp` |
| `DERIVED_KNOWN_DISCONTINUITY` | Derived, with a documented modelling defect | CDI-02 `waste_delta_units` (residual risk 6) |
| `DECLARED_INPUT` | Asserted by the requesting decision-maker, not measured or derived | `economic_tolerance.max_contribution_sacrifice_gbp` (§2.3.2) |
| `SEEDED_ASSUMPTION` | Produced from a fixed demo seed, not from the world | CDI-03 `discovery_anchor` (`2026-08-17`) |
| `PROXY` | A stand-in for an unavailable measurement | CDI-03 hash-based availability; geometric catchment density |
| `PLACEHOLDER_EXCLUDED` | A CDI-01 compatibility placeholder, excluded from attribution | `promotion_type_source = cdi01_placeholder_default` |
| `MISSING` | Required input absent |

**Invariants:**

1. `SEEDED_ASSUMPTION`, `PROXY` and `PLACEHOLDER_EXCLUDED` evidence may **never** be rendered, serialised, or narrated as `OBSERVED`. Every finding carries its strength; the UI must not be able to display a finding without it.
2. `PLACEHOLDER_EXCLUDED` evidence may **never raise** a dimension state. It may only lower it or leave it unchanged.
3. `synthetic_demo = true` on any contributing input forces `synthetic_demo = true` on the assessment.
4. A dimension's strength is the **weakest strength among its decisive findings** — not the average, not the best.
5. **Strength ordering** (strongest → weakest), fixed and exported so "weakest" is never ambiguous:
   `OBSERVED > DERIVED > DERIVED_KNOWN_DISCONTINUITY > DECLARED_INPUT > SEEDED_ASSUMPTION > PROXY > PLACEHOLDER_EXCLUDED > MISSING`.
6. A declared `economic_tolerance` is evidence at `DECLARED_INPUT`, published with its rationale, the sacrifice against it, and the remaining headroom in £. It may never render as `OBSERVED`, and it may never raise a dimension state.

### 4.2 Confidence

Confidence is **not** a decorative percentage. It is a band, derived deterministically from three named, separately-published components:

| Component | Definition |
|---|---|
| `evidence_coverage` | Which required inputs per §2 were actually present, enumerated by name — not a ratio alone |
| `evidence_strength_floor` | The weakest strength among all decisive findings across all six dimensions |
| `model_integrity` | Outcome of CDI-02 reconciliation and both validators, plus the §2.5 `model_divergence` check |

| Band | Rule |
|---|---|
| `HIGH` | Full coverage of required inputs, strength floor ≥ `DERIVED`, model integrity clean |
| `MODERATE` | Full coverage of required inputs, strength floor ≥ `SEEDED_ASSUMPTION`, model integrity clean |
| `LOW` | Any required input missing, or strength floor = `PROXY`, or `model_divergence` present |
| `INSUFFICIENT` | Model integrity failed (reconciliation or a validator), or ≥ 2 dimensions `INSUFFICIENT_EVIDENCE` |

> **Reconciliation — independent implementation review, 2026-08-15 (authoritative).** The `LOW` row above contradicted §2.5 rule 4 and acceptance criterion 18, both of which state that `model_divergence` **caps confidence at `MODERATE`**. Because `LOW` trips cap K5, the §4.2 wording would have forced `REVIEW` on every divergent assessment — including recoverable operational situations that the gate elsewhere requires to resolve to `CONDITIONAL_GO` (§2.5 demo-path consequence). Two of the three gate statements, and the owner direction that divergence "must remain visible and consequential, but should not automatically turn a recoverable operational situation into `REVIEW`", resolve the conflict in favour of the `MODERATE` cap. **The authoritative rule is therefore:**
>
> | Trigger | Band effect |
> |---|---|
> | A **required** input (CDI-01 intent, CDI-02 counterfactual/causal) missing | `LOW` |
> | Strength floor `PROXY` or `MISSING` | `LOW` |
> | `model_divergence` present | ceiling `MODERATE` — published, never `HIGH`, never `LOW` on divergence alone |
> | An **optional** integration absent (CDI-03, Decision State, signals) | ceiling `MODERATE`, plus caps K2/K3/K4 — never `LOW` (owner ruling U6: absence is a cap, not a forced `REVIEW`) |
> | Strength floor `PLACEHOLDER_EXCLUDED` | ceiling `MODERATE` — a placeholder is evidence deliberately *excluded* from attribution, not weak evidence relied upon; it remains unable to raise any dimension state (§4.1 invariant 2) |
>
> The `evidence_coverage` published on the response is exactly the set the band was derived from, so the band can always be audited against its own components. Regression guards: CDI-04 tests 44–48.

A numeric `confidence_index` (0–100) **may** be emitted solely as a display projection for UX §5.5 Tier 1 ordering, and only under three constraints: it is derived from the band and the three components; it is **excluded from all state determination**; and it may not be rendered without its band and components alongside it. If those cannot be guaranteed at the surface, the numeric must be dropped — owner ruling U5 (§10).

### 4.3 Missing data

**A missing input never becomes a neutral pass.**

| Case | Behaviour |
|---|---|
| Required input for a dimension absent | Dimension = `INSUFFICIENT_EVIDENCE`, named in `missing_inputs[]`. It can never be `CLEAR`. Overall floor ≥ `REVIEW` |
| Optional integration absent (CDI-03, Decision State, ESF-2) | Affected dimensions = `NOT_EVALUATED` with a stated reason. Overall capped per §3.4. Never silently treated as satisfied |
| Field present but null/zero where a value is meaningful | Treated as missing, not as zero |
| Whole dimension unevaluable | Published as such in Tier 2 evidence. The six dimensions are always all present in the output; absence is a visible state, never an omitted row |

---

## 5. Decision Ripple Integration Boundary

### 5.1 What Decision Ripple actually is here

Per §1.1: there is no ripple engine. The deterministic propagation exists in WP10-C `calculateDerivedImpacts()`; `DecisionRippleIntelligence.tsx` is a presentation surface over hardcoded literals. Decision Ripple is therefore treated as a **presentation capability over WP10-C-owned numbers**, and CDI-04's resilience evidence is sourced from `DecisionDerivedImpacts`.

### 5.2 What CDI-04 MAY do

- **Read** `DecisionState.derived_impacts` for the tenant/session and cite specific fields as Operational-dimension evidence.
- Publish `resilience_evidence[]` entries that are **references** — `{ order: 1|2|3, field_path, value, unit, source: 'wp10c_derived_impacts' }` — carrying no CDI-04-computed number.
- Map orders to existing fields only: 1st = `commitment_gap_units` / `delivery_risk_pct`; 2nd = `dc_overtime_hours`; 3rd = `margin_erosion_pct`.
- Emit the §2.5 `model_divergence` finding when CDI-02 and Decision State disagree.

### 5.3 What CDI-04 MUST NOT do

- Compute its own 1st/2nd/3rd-order propagation, or any new ripple arithmetic.
- Create a risk engine: no likelihood × impact matrix, no failure-mode taxonomy, no risk register, no mitigation generator. Those are **CDI-07B.1 Campaign Pre-Mortem** and are explicitly out of scope (COGNIX_PRINCIPLES: *resilience over parallel risk engines*).
- Write to, mutate, or version Shared Decision State. CDI-04 is a **read-only consumer**.
- Read from `DecisionRippleIntelligence.tsx`, or depend on any presentation-layer literal.
- Introduce probability, likelihood, or severity scoring of any kind.

### 5.4 Boundary test

Resilience contributes evidence to the Operational dimension and **nowhere else**. If a proposed CDI-04 behaviour requires a number that `calculateDerivedImpacts()` does not already return, it is out of scope by definition.

---

## 6. Proposed CDI-04 Domain Contracts

**New file (single):** `packages/contracts/src/campaign-readiness-model.ts`, exported from `packages/contracts/src/index.ts`. No CDI-01/02/03 contract file is modified.

```ts
export type ReadinessDimensionId =
  | 'COMMERCIAL' | 'DEMAND' | 'OPERATIONAL' | 'CONTEXT' | 'CUSTOMER' | 'STRATEGIC';

export type DimensionState =
  | 'CLEAR' | 'WATCH' | 'CONSTRAINED' | 'BLOCKING'
  | 'INSUFFICIENT_EVIDENCE' | 'NOT_EVALUATED';

export type ReadinessState = 'GO' | 'CONDITIONAL_GO' | 'REVIEW' | 'DO_NOT_PROCEED';

export type EvidenceStrength =
  | 'OBSERVED' | 'DERIVED' | 'DERIVED_KNOWN_DISCONTINUITY' | 'DECLARED_INPUT'
  | 'SEEDED_ASSUMPTION' | 'PROXY' | 'PLACEHOLDER_EXCLUDED' | 'MISSING';

/** Fixed ordering, strongest first. Exported so "weakest strength" is never ambiguous. */
export const EVIDENCE_STRENGTH_ORDER: EvidenceStrength[] = [
  'OBSERVED', 'DERIVED', 'DERIVED_KNOWN_DISCONTINUITY', 'DECLARED_INPUT',
  'SEEDED_ASSUMPTION', 'PROXY', 'PLACEHOLDER_EXCLUDED', 'MISSING',
];

/** Owner ruling U2 — Commercial is objective-aware. Derived from frozen CDI-01 fields only. */
export type CommercialObjectiveClass = 'VALUE_CREATION' | 'VALUE_TRADE' | 'UNCLASSIFIED';

/**
 * Owner ruling U2 — explicit, owner-declared limit on contribution the business will
 * sacrifice to buy a non-value objective. Never inferred, never defaulted, never derived.
 * Illegal on VALUE_CREATION objectives (rejection R5).
 */
export interface EconomicTolerance {
  max_contribution_sacrifice_gbp: number;   // >= 0, absolute GBP
  rationale: string;
  declared_by: string;
  objective_basis: CampaignObjectiveType;
}

export interface CommercialToleranceAssessment {
  objective_class: CommercialObjectiveClass;
  contribution_delta_gbp: number;
  tolerance_declared: boolean;
  tolerance?: EconomicTolerance;
  /** Positive when inside tolerance; negative when breached. Always published in GBP. */
  headroom_gbp?: number;
  within_tolerance?: boolean;
}

/** Owner ruling U1 — centralised synthetic demonstration policy thresholds. */
export type ThresholdCalibrationStatus = 'UNCALIBRATED_LAB_DEFAULT' | 'CALIBRATED';

export interface ReadinessThreshold {
  threshold_id: string;                 // 'TH-O1'
  applies_to: ReadinessDimensionId;
  rule_ids: string[];                   // rules that reference it
  value: number;
  unit: string;
  /** A threshold may NEVER fire a veto. 'BLOCKING' is not a permitted value. */
  effect_ceiling: 'WATCH' | 'CONSTRAINED';
  basis: string;
  calibration_status: ThresholdCalibrationStatus;
  calibration_target: string;
}

export interface ReadinessThresholdPolicy {
  policy_id: string;
  policy_version: string;
  provenance: 'synthetic_demonstration_policy';
  synthetic_demo: true;
  thresholds: ReadinessThreshold[];
}

/** Read-only mirror of WP10-C recovery levers; parity-guarded against decision-state-model.ts. */
export interface RecoveryLever {
  intervention_id: string;              // 'SLA_FLEX_RULE_4'
  headroom_units: number;               // 1200
  applied: boolean;
  source: 'wp10c_calculate_derived_impacts';
}

/** Owner ruling U1 — a veto means physically unservable, not a threshold breach. */
export interface OperationalFeasibility {
  commitment_gap_units: number;
  recovery_levers: RecoveryLever[];
  recoverable_headroom_units: number;
  /** true only when the gap exceeds every available lever combined (veto V4). */
  structurally_infeasible: boolean;
  /** Levers that, if applied, close the gap — the basis of the O2 discharge test. */
  closing_levers: string[];
}

export type ConfidenceBand = 'HIGH' | 'MODERATE' | 'LOW' | 'INSUFFICIENT';

export type FindingSeverity = 'INFO' | 'WATCH' | 'CONSTRAINT' | 'VETO';

export interface ReadinessEvidenceRef {
  source_package: 'CDI-01' | 'CDI-02' | 'CDI-03' | 'WP10-A' | 'WP10-C' | 'ESF-1' | 'ESF-2';
  field_path: string;              // e.g. 'causal.intervention_uplift_pp'
  value: string | number | boolean;
  strength: EvidenceStrength;
  synthetic_demo: boolean;
  /** Present when strength is SEEDED_ASSUMPTION / PROXY — the disclosure shown to users. */
  disclosure?: string;
}

export interface ReadinessFinding {
  finding_id: string;              // stable, rule-derived (e.g. 'O2_capacity_gap')
  rule_id: string;                 // 'C1'..'S7' — traceable to the design gate rule table
  dimension: ReadinessDimensionId;
  severity: FindingSeverity;
  statement: string;
  decisive: boolean;               // drove this dimension's state
  evidence: ReadinessEvidenceRef[];
}

export interface DimensionAssessment {
  dimension: ReadinessDimensionId;
  state: DimensionState;
  /** Weakest strength across decisive findings. Never averaged. */
  evidence_strength_floor: EvidenceStrength;
  findings: ReadinessFinding[];
  required_inputs_present: string[];
  missing_inputs: string[];
  not_evaluated_reason?: string;
}

export interface ReadinessCondition {
  condition_id: string;
  dimension: ReadinessDimensionId;
  statement: string;
  discharge_test: string;          // deterministic predicate over named fields
  evidence_gap: string;
  blocking_if_unmet: 'REVIEW' | 'DO_NOT_PROCEED';
}

export interface ReadinessVeto {
  veto_id: 'V1' | 'V2' | 'V3a' | 'V3b' | 'V4' | 'V5';
  dimension: ReadinessDimensionId;
  statement: string;
  triggering_field: string;
  triggering_value: string | number | boolean;
  /** Why this is a veto and not a threshold. Vetoes never reference a ReadinessThreshold. */
  veto_basis: 'CONTRACT_INTEGRITY' | 'STATED_OBJECTIVE_CONTRADICTION'
            | 'DECLARED_TOLERANCE_EXCEEDED' | 'OPERATIONAL_INFEASIBILITY'
            | 'NO_ADDRESSABLE_ESTATE';
}

export interface ReadinessChangeTrigger {
  dimension: ReadinessDimensionId;
  field_path: string;
  current_value: string | number;
  threshold: string | number;
  direction: 'INCREASE' | 'DECREASE' | 'BECOMES_TRUE' | 'BECOMES_FALSE';
  would_change_dimension_to: DimensionState;
  would_change_state_to: ReadinessState;
  /** Present when the threshold came from the §2.9 policy — makes synthetic limits visible. */
  threshold_id?: string;
}

export interface ResilienceEvidenceRef {
  order: 1 | 2 | 3;
  field_path: string;              // within DecisionDerivedImpacts
  value: number;
  unit: string;
  source: 'wp10c_derived_impacts';
}

export interface ReadinessConfidence {
  band: ConfidenceBand;
  evidence_coverage: { required: string[]; present: string[]; missing: string[] };
  evidence_strength_floor: EvidenceStrength;
  model_integrity: {
    counterfactual_valid: boolean;
    causal_valid: boolean;
    reconciliation_ok: boolean;
    model_divergence: boolean;
  };
  /** Display projection only. MUST NOT participate in state determination. */
  confidence_index?: number;
}

export interface CapacityBasis {
  demand_source: 'cdi02_predicted_with_intervention';
  demand_units: number;
  capacity_source: 'wp10c_derived_impacts';
  capacity_units: number;
  model_divergence_pp?: number;
  note: string;
}

export interface DecisionReadinessAssessment {
  readiness_id: string;
  campaign_intent_id: string;
  tenant_id: string;
  session_id: string;
  state: ReadinessState;
  headline: string;
  dimensions: DimensionAssessment[];   // exactly six, always all present
  vetoes: ReadinessVeto[];
  conditions: ReadinessCondition[];
  change_triggers: ReadinessChangeTrigger[];
  resilience_evidence: ResilienceEvidenceRef[];
  confidence: ReadinessConfidence;
  capacity_basis: CapacityBasis;
  /** Owner ruling U1 — published on every response, with provenance and calibration status. */
  threshold_policy: ReadinessThresholdPolicy;
  /** Owner ruling U1 — feasibility basis for V4 / O2. */
  operational_feasibility?: OperationalFeasibility;
  /** Owner ruling U2 — objective class, tolerance and headroom, always published. */
  commercial_tolerance: CommercialToleranceAssessment;
  state_caps_applied: string[];        // 'K1'..'K8'
  counterfactual_id: string;
  causal_id: string;
  opportunity_evaluation_id?: string;
  micro_market_evaluation_id?: string;
  decision_state_id?: string;
  decision_state_version?: number;
  calculation_mode: 'deterministic_demo_readiness';
  synthetic_demo: boolean;
  schema_version: string;
  provenance: Record<string, string>;
  timestamp: string;
}

export interface ReadinessEvaluationRequest {
  tenant_id: string;
  session_id: string;
  campaign_intent_id?: string;
  campaign_intent?: CampaignIntent;
  include_signals?: boolean;
  /**
   * Owner ruling U2 — explicit economic tolerance for VALUE_TRADE objectives only.
   * Illegal alongside a VALUE_CREATION objective (rejection R5). Never defaulted.
   */
  economic_tolerance?: EconomicTolerance;
  /** Optional pre-computed CDI-02 result; otherwise CDI-04 invokes the closed engine. */
  campaign_evaluation?: CampaignEvaluationResponse;
  /** Optional CDI-03 discovery; absence triggers cap K2, never a silent pass. */
  opportunity_discovery?: OpportunityDiscoveryResponse;
}

export interface ReadinessEvaluationResponse {
  evaluation_id: string;
  tenant_id: string;
  session_id: string;
  campaign_intent_id: string;
  readiness: DecisionReadinessAssessment;
  timestamp: string;
  schema_version: string;
}

export function validateDecisionReadinessAssessment(
  a: Partial<DecisionReadinessAssessment>
): { valid: boolean; errors: string[] };

export function validateReadinessEvaluationRequest(
  r: Partial<ReadinessEvaluationRequest>
): { valid: boolean; errors: string[] };

/** Guard: proves the aggregate never exceeds the dimension floor. */
export function assertNoCompensation(
  a: DecisionReadinessAssessment
): { ok: boolean; violations: string[] };

/** Owner ruling U1 — proves no veto was produced by a policy threshold. */
export function assertNoThresholdDerivedVeto(
  a: DecisionReadinessAssessment
): { ok: boolean; violations: string[] };

/** Owner ruling U2 — proves negative contribution never yielded CLEAR Commercial or GO. */
export function assertNegativeContributionNeverGo(
  a: DecisionReadinessAssessment
): { ok: boolean; violations: string[] };
```

**Validator obligations** (mirroring the CDI-02/CDI-03 pattern of validators that can actually fail):

- Exactly six dimensions, one per `ReadinessDimensionId`, no duplicates.
- `state` matches the floor computed from `dimensions` under §3.3 and §3.4 — recomputed independently inside the validator, never trusted from the payload.
- Every `BLOCKING` dimension has a matching `ReadinessVeto`, and vice versa.
- `state = CONDITIONAL_GO` ⇒ every `CONSTRAINED`/`WATCH` dimension has at least one `ReadinessCondition` with a non-empty `discharge_test`.
- `state = GO` ⇒ zero conditions, zero vetoes, zero caps, confidence band ≥ `MODERATE`.
- No `PLACEHOLDER_EXCLUDED` evidence appears on a finding whose severity is `INFO` and whose dimension is `CLEAR`.
- No evidence ref carries `strength: 'OBSERVED'` together with `synthetic_demo: true`.
- `confidence_index`, when present, is consistent with `band` and is not referenced by any state rule.
- Every `ReadinessThreshold.effect_ceiling` is `WATCH` or `CONSTRAINED`; no threshold appears in any veto's derivation (`assertNoThresholdDerivedVeto`).
- `threshold_policy` is present on every response, with `provenance: 'synthetic_demonstration_policy'` and a `calibration_target` on every threshold.
- `commercial_tolerance.contribution_delta_gbp < 0` ⇒ Commercial state ≠ `CLEAR` and overall state ≠ `GO` (`assertNegativeContributionNeverGo`).
- `economic_tolerance` present with `objective_class = VALUE_CREATION` ⇒ rejection R5, never an assessment.
- `structurally_infeasible = true` ⇔ a `V4` veto exists with `veto_basis: 'OPERATIONAL_INFEASIBILITY'`; `structurally_infeasible = false` with `commitment_gap_units > 0` ⇒ state ≤ `CONDITIONAL_GO`, never `DO_NOT_PROCEED` from Operational alone.
- Mirrored `RecoveryLever.headroom_units` equal the WP10-C constants (parity guard).

**Proposed engine & surface (implementation, not this gate):**

- `lib/campaign-readiness-engine.ts` — pure, deterministic, zero React, mirroring CDI-02/CDI-03 engine discipline.
- `POST /api/v1/campaigns/readiness` — the endpoint already planned in the CDI planning report and MASTER_PLAN.
- Canvas Layer 4: Tier 1 compact summary → Tier 2 six-dimension evidence drawer, per UX §5.5.

---

## 7. Required CDI-02 / CDI-03 Inputs

### 7.1 CDI-02 (HARD — absence is a rejection, not a cap)

| Field | Consumed by |
|---|---|
| `counterfactual.campaign_delta.contribution_delta_gbp` | Commercial C1–C4, C8; objective class & tolerance headroom |
| `counterfactual.campaign_delta.volume_delta_units` / `volume_delta_pct` | Commercial, Operational |
| `counterfactual.campaign_delta.attributable_uplift_pp` | Commercial, Strategic |
| `counterfactual.campaign_delta.waste_delta_units` | Commercial C-waste, Strategic S1 |
| `counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing` | Commercial C5 |
| `counterfactual.predicted_with_intervention.volume_units` | Operational capacity basis |
| `counterfactual.*.unit_contribution_gbp` | Commercial C6 (TH-C1) |
| `counterfactual.*.confidence` | Confidence coverage |
| `causal.reconciliation_ok`, `reconciled_sum_pp` | Veto V1, model integrity |
| `causal.ambient_uplift_pp` / `intervention_uplift_pp` / `total_predicted_uplift_pp` | Demand D2, D3; Operational divergence |
| `causal.drivers[]` (all fields incl. `driver_class`, `attributed`) | Demand D4, D5 |
| `causal.placeholder_fields_excluded[]` | Demand D6, Strategic S5, evidence strength |
| `causal.signal_simulation_id` | Demand D7, cap K4 |
| `causal.synthetic_demo`, `provenance` | Provenance propagation |

**No CDI-02 contract change is required.** Every field CDI-04 needs already exists at `54a25258`.

### 7.2 CDI-03 (INTEGRATION — absence triggers cap K2, never a silent pass)

| Field | Consumed by |
|---|---|
| `opportunity_windows.recommended_window.{tier, yield_score, factors, inclusion_reasons, exclusion_risks, is_stated_dates}` | Context X1–X6 |
| `opportunity_windows.discovery_anchor.{anchor_date, anchor_mode, disclosure}` | Context anchor rule, evidence strength, disclosure |
| `opportunity_windows.{timing_mode, resolved_temporal_uplift_pp}` | Context X4 |
| `micro_markets.{stores_evaluated, stores_included, recommended_store_ids}` | Customer U1–U3 |
| `micro_markets.stores[].{tier, inclusion_reasons, exclusion_reasons, included}` | Customer U5, Tier 2 evidence |
| `micro_markets.cohorts[]` | Customer cohort evidence |
| `micro_markets.region_scope` | Customer scope integrity |

**No CDI-03 contract change is required.**

### 7.3 Other integrations

| Source | Fields | Classification |
|---|---|---|
| WP10-C `DecisionState` | `derived_impacts.*`, `scenario_parameters.*`, `state_version`, applied `selected_interventions` | INTEGRATION, read-only; absence ⇒ cap K3 |
| WP10-C intervention constants | `SLA_FLEX_RULE_4` (+1,200 u), `BUFFER_OPTIMISATION_R002` (+500 u) — `decision-state-model.ts:107-109` | Mirrored read-only in the CDI-04 contract with a parity guard; **no WP10-C change** |
| CDI-04 request | `economic_tolerance` (owner-declared) | Optional, `DECLARED_INPUT` strength; illegal on `VALUE_CREATION` (R5); never defaulted |
| WP10-A `EnterpriseWorldScenario` | `baselineMetrics.*` | Supporting evidence |
| ESF-2 | `EnterpriseSignalTimeline` observations for supply/inventory/customer/context types | Optional; absence ⇒ cap K4 |
| CDI-01 | Frozen intent fields per §2 | HARD |

---

## 8. Missing-Data & Provenance Rules

1. **Missing is never neutral.** A required input that is absent produces `INSUFFICIENT_EVIDENCE` and a named entry in `missing_inputs[]`. It cannot yield `CLEAR`, and it sets the overall floor to at least `REVIEW`.
2. **Absent integrations are visible, not omitted.** All six dimensions always appear in the output. An unevaluated dimension is published as `NOT_EVALUATED` with a stated reason and its cap.
3. **Synthetic never masquerades as observed.** `synthetic_demo`, `SEEDED_ASSUMPTION` and `PROXY` classifications propagate to every finding, to the assessment, and to the surface. A validator rejects any evidence ref combining `strength: 'OBSERVED'` with `synthetic_demo: true`.
4. **Seeded assumptions carry their disclosure.** CDI-03's anchor disclosure text travels verbatim into `ReadinessEvidenceRef.disclosure` and must be rendered wherever the derived finding is rendered.
5. **Placeholders are excluded, listed, and directionally constrained.** `cdi01_placeholder_default` fields appear in findings as `PLACEHOLDER_EXCLUDED` and may only lower a dimension state.
6. **Proxies are named.** CDI-03's hash-based availability and geometric catchment density are `PROXY` strength, named as such in the finding statement — never described as inventory or footfall.
7. **Provenance is additive, not summarised.** `provenance` records the upstream ids (`counterfactual_id`, `causal_id`, CDI-03 evaluation ids, `decision_state_id` + version), engine version, rule-set version, and every cap applied.
8. **Rule traceability.** Every finding carries the `rule_id` from §2 that produced it, so any output can be traced to the frozen rule it came from.

---

## 9. Implementation Acceptance Criteria

**Contract & structure**

1. `packages/contracts/src/campaign-readiness-model.ts` created and exported; no CDI-01/02/03 contract file modified.
2. Exactly six dimensions always present in every response, including on rejection-adjacent paths.
3. `lib/campaign-readiness-engine.ts` is pure and deterministic — identical inputs give byte-identical outputs, zero React, zero `new Date()` inside scoring.

**Non-compensation (the central invariant)**

4. Guard: `CLEAR` Commercial + `BLOCKING` Operational ⇒ `DO_NOT_PROCEED`.
5. Guard: five `CLEAR` + one `CONSTRAINED` ⇒ never `GO`.
6. Guard: no code path computes a weighted or averaged cross-dimension score. `assertNoCompensation` passes on every fixture.

**Vetoes & states**

7. Each of V1, V2, V3a, V3b, V4, V5 has a fixture that fires it and a fixture that does not, asserting the exact `triggering_field` and `veto_basis`.
8. R1–R6 return validation errors, not readiness states.
9. `GO` is unreachable on synthetic-only inputs (caps K1–K4 demonstrated).
10. Every `CONDITIONAL_GO` fixture carries at least one condition with a non-empty, re-runnable `discharge_test`.

**Threshold policy — owner ruling U1**

10a. `threshold_policy` is emitted on every response with `provenance: 'synthetic_demonstration_policy'`, `synthetic_demo: true`, and `calibration_status` + `calibration_target` on every threshold.
10b. Guard: every `ReadinessThreshold.effect_ceiling ∈ {WATCH, CONSTRAINED}`. `assertNoThresholdDerivedVeto` passes on every fixture — **no percentage can ever fire a veto**.
10c. Guard: no rule inlines a numeric constant; every threshold reference resolves through `threshold_id`.
10d. Guard: a request attempting to override a threshold is rejected (R6), not honoured.
10e. Feasibility fixtures: `commitment_gap_units = 1,000` with `recoverable_headroom_units = 1,700` ⇒ Operational `CONSTRAINED`, `SLA_FLEX_RULE_4` named in the discharge test, overall `CONDITIONAL_GO`; `commitment_gap_units = 3,000` with the same headroom ⇒ V4, `DO_NOT_PROCEED`.
10f. Guard: a recoverable gap whose recovery cannot be expressed as a discharge test degrades to `REVIEW`, never to `DO_NOT_PROCEED`.
10g. Parity guard: mirrored `RecoveryLever.headroom_units` equal the WP10-C constants in `decision-state-model.ts`; drift fails the build.
10h. Fixture: `stockout_probability_pct = 92` alone produces `CONSTRAINED`, **not** a veto.

**Objective-aware Commercial — owner ruling U2**

10i. `commercial_objective_class` is derived from frozen CDI-01 fields only, with the metric-wins precedence rule, and is published on every response.
10j. Fixture: `VALUE_CREATION` + `contribution_delta_gbp < 0` ⇒ V3a ⇒ `DO_NOT_PROCEED`.
10k. Fixtures for each `VALUE_TRADE` objective (waste reduction, customer acquisition via `LAUNCH`/`OTHER`, market defence, strategic launch) + negative contribution: **no tolerance** ⇒ Commercial `CONSTRAINED`, never `CLEAR`, overall ≤ `CONDITIONAL_GO`, never `GO`.
10l. Fixture: `VALUE_TRADE` + tolerance declared + sacrifice within tolerance ⇒ Commercial `CONSTRAINED` with `headroom_gbp` published; never `CLEAR`, never `GO`.
10m. Fixture: `VALUE_TRADE` + tolerance declared + sacrifice exceeding tolerance ⇒ V3b ⇒ `DO_NOT_PROCEED`.
10n. Rejection fixture: `economic_tolerance` supplied with a `VALUE_CREATION` objective ⇒ R5.
10o. Guard: `assertNegativeContributionNeverGo` passes on every fixture — negative contribution never yields `CLEAR` Commercial or `GO`, under any class, with or without tolerance.
10p. Guard: caps K7 and K8 are applied independently of the rule tables (verified by a fixture where the rule table is stubbed to `CLEAR`).

**Evidence & confidence**

11. Guard: no evidence ref combines `OBSERVED` with `synthetic_demo: true`.
12. Guard: `PLACEHOLDER_EXCLUDED` evidence never raises a dimension state.
13. Guard: CDI-03 anchor-derived findings are `SEEDED_ASSUMPTION` and carry the CDI-03 disclosure verbatim.
14. Confidence band is derived from the three published components; `confidence_index` (if emitted) is provably absent from all state logic.
15. Guard: `waste_delta_units` is never the sole decisive finding for a `CLEAR`.

**Integration integrity**

16. CDI-02 evaluation runs unchanged: existing CDI-02 suite (30/30) and CDI-03 suite (31/31) pass before and after.
17. Guard: readiness performs no write to Shared Decision State; state version is read-only and echoed.
18. Guard: demand is sourced only from CDI-02; a fixture with `promotion_lift` diverging > 5 pp from `total_predicted_uplift_pp` emits `model_divergence` and caps confidence at `MODERATE`.
19. Absent CDI-03 ⇒ Context/Customer `NOT_EVALUATED`, cap K2 applied, state ≤ `CONDITIONAL_GO`.
20. Absent Decision State ⇒ Operational `NOT_EVALUATED`, cap K3 applied.
20a. No CDI-04 artefact references `lib/ripple-engine.ts` or `lib/commitment-engine.ts`; resilience evidence resolves only to `DecisionDerivedImpacts` field paths (§1.1, ARCHITECTURE.md v1.1.1 §3.3).

**Scope**

21. No pre-mortem, failure-mode, likelihood, severity, half-life, timeline, frontier, ML or LLM logic anywhere in the CDI-04 diff.
22. No new risk engine and no CDI-04-computed ripple arithmetic; `resilience_evidence[]` contains references only.
23. `change_triggers[]` are generated from the rule table, with a guard proving they cannot be authored independently of it.

**Surface**

24. `POST /api/v1/campaigns/readiness` published in OpenAPI with the anchor/synthetic disclosures.
25. Canvas Layer 4 honours UX §5.5 two-tier disclosure; Tier 1 shows state + confidence band; Tier 2 shows all six dimensions with evidence strength visible per finding.

---

## 10. Owner Rulings (formerly Unresolved Decisions)

**All seven decisions are closed.** The gate was approved on 2026-08-15 with explicit rulings on U1 and U2; U3–U7 stand as recommended under that approval. Nothing in §10 remains open.

| # | Decision | Ruling | Where it lands in this design |
|---|---|---|---|
| **U1** | Operational veto thresholds were uncalibrated demo constants (`stockout_probability_pct ≥ 70`, `delivery_risk_pct ≥ 50`) firing a hard veto. | **RESOLVED — thresholds centralised and demoted; vetoes re-based on infeasibility.** Explicit, centralised synthetic demonstration policy thresholds during the lab phase. Hard vetoes must represent genuine operational infeasibility, not arbitrary percentage cut-offs. Recoverable constraints degrade to `CONDITIONAL_GO` or `REVIEW`. Threshold provenance is published; every threshold is a declared future calibration target. | §2.5 feasibility rule + rules O1–O8; §2.9 threshold policy (TH-C1…TH-X1); V4 re-based on `commitment_gap_units > recoverable_headroom_units`; TH-O1/TH-O2 demoted to `CONSTRAINED`; cap K8; rejection R6; `ReadinessThresholdPolicy` / `OperationalFeasibility` / `RecoveryLever` contracts (§6); acceptance criteria 10a–10h |
| **U2** | Was negative contribution a universal veto? | **RESOLVED — not universal; Commercial is objective-aware.** For contribution/margin objectives, material negative contribution may veto. For waste reduction, customer acquisition, market defence and strategic launch, negative contribution may remain viable **only within an explicit economic tolerance**. With no tolerance, negative contribution must never produce `GO`. Exceeding an explicit tolerance produces `DO_NOT_PROCEED`. | §2.3.1 `commercial_objective_class`; §2.3.2 `economic_tolerance`; rules C1–C8; vetoes V3a/V3b; cap K7; rejection R5; `DECLARED_INPUT` evidence strength (§4.1); `EconomicTolerance` / `CommercialToleranceAssessment` contracts (§6); acceptance criteria 10i–10p |
| **U3** | CDI-03 residual risk 6: 41/50 stores classify `HIGH` at national scope. Inherit tiers or re-tier? | **RESOLVED — inherit + flag.** Re-tiering forks CDI-03 semantics and creates a competing where-engine. | §2.7 tier-inheritance rule; rule U3 via TH-U1 |
| **U4** | May readiness be evaluated on a `DRAFT` intent? | **RESOLVED — no.** Readiness over an unregistered intent is readiness over a moving target. | Rejection R1 |
| **U5** | Is a numeric `confidence_index` permitted? | **RESOLVED — band plus constrained numeric**, under the three §4.2 constraints; drop the numeric if the surface cannot guarantee the band and components render alongside it. | §4.2; validator obligation on `confidence_index` |
| **U6** | Decision State absent — cap or force `REVIEW`? | **RESOLVED — cap (K3).** Operational is `NOT_EVALUATED`, not contradicted. | §3.4 cap K3; rule O7 |
| **U7** | ADR-031 and the MASTER_PLAN row now, or at implementation? | **RESOLVED — at implementation.** Recording an architecture decision as accepted before the code exists would misstate the record. ADR-031 remains reserved. | §12 pre-commit steps |

### 10.1 Preserved invariants (explicitly reaffirmed by the owner)

1. The **non-compensatory readiness lattice** stands: aggregation is a floor over six independent dimensions, never a sum, never a weighted score.
2. **Synthetic-only evidence can never produce `GO`.** Caps K1–K4 make this structural; K7 and K8 add independent backstops.
3. The thresholds demoted under U1 and the tolerance introduced under U2 **cannot loosen either invariant** — a threshold can only lower a state, and a tolerance can at best hold Commercial at `CONSTRAINED`.

### 10.2 Carried residual risks (calibration work, not CDI-04 defects)

| # | Residual | Owner-visible consequence |
|---|---|---|
| RR-1 | All §2.9 thresholds are `UNCALIBRATED_LAB_DEFAULT` synthetic demonstration policy | Every response labels them as such and names a calibration target. No threshold can fire a veto, so miscalibration cannot manufacture a `DO_NOT_PROCEED` |
| RR-2 | `recoverable_headroom_units` derives from two WP10-C demo constants (1,200 / 500) | Parity-guarded mirror; feasibility verdicts are only as real as those constants, and this is stated in the output |
| RR-3 | `economic_tolerance` is a declared human input, not measured evidence | Published at `DECLARED_INPUT` with rationale and headroom; can never raise a state, can never produce `CLEAR` |
| RR-4 | "Customer acquisition" has no CDI-01 `objective_type` | Classified `VALUE_TRADE` via `LAUNCH`/`OTHER`; recorded as a CDI-01 vocabulary gap for a future canvas package, not corrected here |
| RR-5 | CDI-02 waste discontinuity (residual risk 6) and CDI-03 anchor/proxy seeding | Unchanged and inherited; handled by evidence strength, never by correction |

---

## 11. Recommended Implementation Agent

**Cursor Auto Balance** — consistent with CDI-02 and CDI-03 precedent.

The work is contract-first, deterministic, heavily rule-tabled, and this gate has already frozen the semantics. What remains is disciplined transcription plus a large regression suite — Cursor's strength. The judgement-heavy portion (dimension semantics, veto placement, non-compensation, evidence classification) is resolved here.

**Condition:** CDI-02 and CDI-03 corrections were both found by *independent adversarial review after implementation*, not by the delivered suites. CDI-04 must repeat that: an independent review pass before commit, specifically probing (a) compensation leaks in aggregation, (b) synthetic evidence surfacing as observed, (c) missing data silently passing, (d) the CDI-02/WP10-C demand-model divergence.

---

## 12. Cursor Execution Prompt — CDI-04

```text
COGNIX — CDI-04 IMPLEMENTATION (Campaign Decision Readiness & Resilience)

Branch: Feature/MatchingContract-AutoActivate
Baseline: 54a25258c13722bdc1dcbddf73c53ad7a720f405
Authoritative design: docs/reports/COGNIX_CDI_04_DECISION_READINESS_DESIGN_GATE.md
(contract-frozen, owner rulings U1 and U2 applied 2026-08-15)

Verify continuity first (branch, baseline, clean tree, empty stash, CDI-01/02/03
evidence present). Stop on divergence.

BUILD
1. packages/contracts/src/campaign-readiness-model.ts — types and validators exactly
   as frozen in design gate §6, including ReadinessThresholdPolicy, ReadinessThreshold,
   RecoveryLever, OperationalFeasibility, EconomicTolerance, CommercialObjectiveClass,
   CommercialToleranceAssessment, EVIDENCE_STRENGTH_ORDER, assertNoCompensation,
   assertNoThresholdDerivedVeto, assertNegativeContributionNeverGo.
   Export from packages/contracts/src/index.ts.
2. lib/campaign-readiness-engine.ts — pure, deterministic, zero React. Implements the
   §2 rule tables (C1-C8, D1-D8, O1-O8, X1-X6, U1-U6, S1-S7), the §2.9 threshold
   policy, the §3.3 floor aggregation, caps K1-K8, vetoes V1/V2/V3a/V3b/V4/V5,
   rejections R1-R6, conditions §3.7, change triggers §3.8, confidence §4.2,
   evidence strength §4.1.
3. POST /api/v1/campaigns/readiness — orchestration only, no scoring in the route.
   Publish in OpenAPI with the anchor, synthetic and threshold-policy disclosures.
4. Canvas Layer 4 — UX §5.5 two tiers: compact state + confidence band, then a
   six-dimension evidence drawer showing evidence strength on every finding, the
   threshold provenance, and any declared economic tolerance with its headroom.

HARD RULES
- No weighted or averaged cross-dimension score anywhere. Aggregation is a floor over
  the dimension lattice. A strong Commercial result must never offset a constrained
  Operational one.
- Thresholds (U1): every non-feasibility threshold lives in ONE centralised, exported
  policy object with provenance 'synthetic_demonstration_policy', calibration_status
  and a calibration_target. No rule inlines a numeric constant. No threshold may fire
  a veto — effect_ceiling is only WATCH or CONSTRAINED. Thresholds are build-time
  constants; a request that tries to override one is rejected (R6).
- Operational vetoes (U1) mean genuine infeasibility: V4 fires only when
  commitment_gap_units > recoverable_headroom_units (sum of unapplied WP10-C recovery
  levers, mirrored read-only with a parity guard against decision-state-model.ts).
  A recoverable gap is CONSTRAINED with the closing lever(s) as the discharge test =>
  CONDITIONAL_GO, or REVIEW if no lever is expressible as a test. Never DO_NOT_PROCEED.
- Commercial is objective-aware (U2): derive commercial_objective_class from frozen
  CDI-01 fields, metric wins over objective label. VALUE_CREATION + negative
  contribution => V3a => DO_NOT_PROCEED. VALUE_TRADE (waste reduction, customer
  acquisition, market defence, strategic launch) + negative contribution is viable only
  within an explicitly declared economic_tolerance: within tolerance => CONSTRAINED with
  headroom published; no tolerance => CONSTRAINED and never GO; exceeding tolerance =>
  V3b => DO_NOT_PROCEED. A tolerance supplied on a VALUE_CREATION objective is rejected
  (R5). Negative contribution never yields a CLEAR Commercial dimension.
- All six dimensions always present in every response; unevaluated ones are published
  as NOT_EVALUATED with a reason, never omitted.
- Missing required input => INSUFFICIENT_EVIDENCE, never a neutral pass.
- SEEDED_ASSUMPTION / PROXY / PLACEHOLDER_EXCLUDED / DECLARED_INPUT evidence must never
  render as OBSERVED; PLACEHOLDER_EXCLUDED and DECLARED_INPUT may only lower a state.
- Synthetic-only evidence can never produce GO (caps K1-K4, backstopped by K7 and K8).
- Demand is sourced only from CDI-02 predicted_with_intervention.volume_units;
  capacity only from WP10-C derived_impacts. Publish capacity_basis. Emit
  model_divergence (never a silent reconcile) when Decision State promotion_lift
  differs from causal.total_predicted_uplift_pp by more than TH-O5 (5 pp).
- Decision Ripple: there is NO ripple engine and none is to be created. lib/ripple-engine.ts
  and lib/commitment-engine.ts do not exist; ARCHITECTURE.md v1.1.1 §3.3 now reflects this.
  CDI-04 integrates read-only with DecisionDerivedImpacts / calculateDerivedImpacts().
  resilience_evidence[] holds references only — no new ripple arithmetic, no risk engine,
  no likelihood/severity, no writes to Decision State.
- Do not modify CDI-01, CDI-02 or CDI-03 contracts or semantics unless a proven CDI-04
  blocking defect exists; if one is found, stop and report before changing anything.
  Do not modify WP10-C: mirror its lever constants with a parity guard instead.
- Out of scope: CDI-05+, pre-mortem, decision half-life, ESF-4/5, ML/LLM ranking,
  physical service extraction.

TESTS
Add tests/unit/run-cdi04-tests.ts covering acceptance criteria §9 (1-25 incl. 10a-10p
and 20a), with permanent guards for: non-compensation; each veto firing and not firing
with its veto_basis; no threshold-derived veto; threshold policy published with
provenance; gap 1,000 vs headroom 1,700 => CONDITIONAL_GO with SLA_FLEX_RULE_4 named,
gap 3,000 => V4 DO_NOT_PROCEED; stockout 92% alone => CONSTRAINED not veto; WP10-C lever
parity; each VALUE_TRADE objective with and without tolerance; tolerance exceeded => V3b;
tolerance on VALUE_CREATION => R5; negative contribution never GO; GO unreachable on
synthetic-only inputs; no OBSERVED+synthetic_demo evidence; placeholder and declared
evidence never raising a state; waste never solely decisive; absent CDI-03 and absent
Decision State paths. Existing CDI-02 (30/30) and CDI-03 (31/31) suites must pass
unchanged before and after.

BEFORE COMMIT
Run an independent adversarial review probing: compensation leaks in aggregation;
any path where a policy threshold reaches a veto; any path where a declared tolerance
raises a state or produces GO; synthetic evidence surfacing as observed; missing data
silently passing; and the CDI-02 / WP10-C demand-model divergence. Correct in-scope
defects and add a permanent regression guard for each. Write
docs/reports/COGNIX_CDI_04_DECISION_READINESS_REPORT.md, add ADR-031, and flip the
MASTER_PLAN CDI-04 row to COMPLETED.

Leave no model identity, watermark, attribution, generated-by marker or co-author
trailer in repository content or metadata.
```

---

## 13. Gate Verdict

**CDI-04 DESIGN FROZEN — CONTRACT FROZEN — CLEARED FOR IMPLEMENTATION.**

Six-dimension model, state and veto semantics, threshold policy, confidence and evidence model, Decision Ripple boundary, domain contracts, upstream input requirements, missing-data rules and acceptance criteria are defined against the authorised baseline `54a25258`, with CDI-01/02/03 semantics preserved and **no upstream contract change required**.

**Owner rulings applied (2026-08-15):**

| Ruling | Effect on the frozen design |
|---|---|
| **U1 — operational thresholds** | All non-feasibility thresholds moved into one centralised, published `ReadinessThresholdPolicy` labelled `synthetic_demonstration_policy` / `UNCALIBRATED_LAB_DEFAULT`, each with a named calibration target. `effect_ceiling` is structurally limited to `WATCH`/`CONSTRAINED`, so **no threshold can fire a veto**. V4 re-based on genuine infeasibility — `commitment_gap_units > recoverable_headroom_units`. Recoverable constraints degrade to `CONDITIONAL_GO` (discharge test names the closing lever) or `REVIEW`. Thresholds are build-time constants; override attempts are rejected (R6). |
| **U2 — negative contribution** | Commercial is objective-aware. `VALUE_CREATION` + negative contribution ⇒ V3a ⇒ `DO_NOT_PROCEED`. `VALUE_TRADE` objectives (waste reduction, customer acquisition, market defence, strategic launch) remain viable only inside an explicitly declared `economic_tolerance`; no tolerance ⇒ `CONSTRAINED` and **never `GO`**; tolerance exceeded ⇒ V3b ⇒ `DO_NOT_PROCEED`. Tolerance is `DECLARED_INPUT` evidence, never `OBSERVED`, and can never buy a `CLEAR`. |
| **Architecture correction** | The false `lib/ripple-engine.ts` reference — and the equally false `lib/commitment-engine.ts` alongside it — are withdrawn. `docs/architecture/ARCHITECTURE.md` §3.3 republished at **v1.1.1** as *Core Domain Propagation*, naming `calculateDerivedImpacts()` as the single authoritative propagation and binding downstream packages to read-only `DecisionDerivedImpacts` consumption. **No standalone Decision Ripple engine exists; CDI-04 does not create one.** |

**Preserved:** the non-compensatory readiness lattice (floor over six dimensions, never a sum) and the rule that synthetic-only evidence cannot produce `GO` — now backstopped independently by caps K7 and K8.

**Open items: none.** All seven §10 decisions are closed. Five residual risks (RR-1…RR-5) are carried as declared calibration targets and inherited upstream seeding, not as CDI-04 defects.

No CDI-04 product code was written. Nothing was committed or pushed.
