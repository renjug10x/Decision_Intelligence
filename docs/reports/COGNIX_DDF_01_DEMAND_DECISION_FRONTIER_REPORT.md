# COGNIX — `DDF-01` DEMAND DECISION FRONTIER IMPLEMENTATION & INTEGRATION EVIDENCE

**Document Status:** Approved & Authoritative (implementation evidence)
**Version:** 1.0.0
**Date:** 16 August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Group
**IP Classification:** G10X Proprietary
**Work Package:** `DDF-01 — Demand Decision Frontier (P0)` — **IMPLEMENTED**

> This report records the implementation as it was **delivered and independently reconciled**, including
> the defects the integration pass found and corrected. It does not restate the planning history, and it
> does not present the first implementation as having been correct.
> Governance and acceptance criteria: [`COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md`](COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md).

---

## 1. What was delivered

| Element | Location |
| :--- | :--- |
| Domain contracts | `packages/contracts/src/demand-decision-frontier-model.ts` |
| Engine | `lib/demand-decision-frontier/demand-frontier-engine.ts` |
| Route | `app/api/v1/demand-frontier/evaluate/route.ts` |
| Surface | `components/Forecasting.tsx` (`SOL-DEMAND-02`) |
| Tests | `tests/unit/run-ddf01-tests.ts` — 56 assertions |
| Rulings | `ARCHITECTURE_DECISIONS.md` ADR-040…ADR-043 + amendments |

---

## 2. The runtime chain, as it actually executes

```
Scenario control (metric · method · horizon · event · promotion depth · cannibalisation)
  → Shared Decision State command  (SET_PROMOTION_LIFT / SET_FORECAST_HORIZON /
                                    SET_CANNIBALISATION_FACTOR / SET_EVENT_BOOST)
  → calculateDerivedImpacts()      [WP10-C, read-only]
  → GET  /api/data?type=forecast   (units series — the demand spine)
    GET  /api/data?type=forecast   (revenue series — derives revenue per unit)
    GET  /api/v1/signals/current   (real EnterpriseSignal evidence)
    POST /api/v1/intent-fusion/evaluate   [IFI-01, engine-bound — AC-DDF-10]
  → evaluateForecastStability()    signal divergence → score, revision probability,
                                   direction, magnitude, expected revision
  → evaluateDemandFrontier()       baseline · contextualised · emerging · executable,
                                   all on one demand base
  → evaluateDecisionGap()          exposed units · pp · revenue at risk · margin at risk ·
                                   ranked constraints
  → evaluateDecisionWindow()       scenario clock → declared cut-off → remaining hours
  → evaluateInterventionRecommendation()   computed from the REAL gap
  → evaluateDecisionRegret()       ACT_NOW / WAIT / DO_NOTHING from one shared input set
  → recommendation                 or CHOICE_REQUIRED where they do not separate
  → Simulate intervention          local copy of derived impacts → full recomputation
  → recomputed gap · regret · frontier · chart · outcome statement
```

Shared Decision State is **never written** by the engine or by simulation; asserted by test `P4`.

---

## 3. The arithmetic spine

Every unit, percentage point and pound resolves to one denominator:

```
base_demand_units = mean(observed history units/day) × horizon_days
```

| Quantity | Derivation | Provenance |
| :--- | :--- | :--- |
| Baseline forecast | projection with commercial promotion removed | derived |
| Contextualised demand | the live projection (carries promo, cannibalisation, event, method) | derived |
| Emerging frontier | contextualised × (1 + probability-weighted expected revision) | modelled (ADR-040) |
| Executable frontier | `base_demand_units × capacity_index` | read-only Shared Decision State |
| Exposed demand | emerging − executable | derived |

`capacity_index = supplier_capacity_units ÷ un-promoted weekly demand`. It is consumed as a **ratio**, not
a quantity, which is how the WP10-C constraint crosses a population boundary without creating a fourth
supplier-capacity number (ADR-041 Amendment A).

**The identity that makes the surface reconcilable:**

```
emerging_frontier_pct − executable_frontier_pct  ≡  exposed_demand_units ÷ base_demand_units
```

Asserted by tests `G1` and `G2`. Money follows the units it prices, and the two monetary quantities are
named for what they are and never interchanged:

- **Revenue exposed** = `exposed_units × revenue_per_unit` — revenue per unit is *derived* from the
  projection (projected revenue ÷ projected units), so it reconciles with the revenue KPI beside it.
- **Margin recoverable** = `recovered_units × gross_margin_per_unit` at a **declared 30%** margin rate.

An executive asking *"why does £187K exposed become £51K recovered?"* can read the answer off the surface:
different quantities (revenue vs margin), different unit counts (exposed vs recoverable within the window),
both stated with their basis.

---

## 4. Defects found and corrected by the integration pass

The first implementation resolved `D-DDF-1`…`D-DDF-8` at the level of presentation. Independent
reconciliation found that several were **relocated rather than closed**, plus new defects. All are fixed.

| ID | Defect | Correction |
| :--- | :--- | :--- |
| `D-INT-1` | **`D-DDF-1` not closed in substance.** `evaluateIntentFusion` was called client-side with only `baseline_forecast_lift_pct`; the memo listed `scenarioParameters` as a dependency but never passed them, and the client-side call read a browser-local module store no command ever updates. The `+12/+7/+3/+22/+10/12pp` values were still constant — literals moved into an engine call with frozen inputs. | Bound to `POST /api/v1/intent-fusion/evaluate` with the live session id (AC-DDF-10), re-evaluated on Decision State version change. |
| `D-INT-2` | **Headline figures dimensionally incoherent.** `exposed_demand_pp` was `22 − supplier_cap` (constant); `exposed_demand_units` summed the projection **in the display metric** (revenue by default) minus `mean(history) × (1+cap)`; `opportunity_at_risk_gbp` multiplied that £ figure by £120/unit. The reported `12pp / 2,600 units / £312.0K` were three unrelated quantities — `2,600` was pounds of revenue mislabelled as units, and `£312K` was £ × £/unit. | Single demand base; frontier evaluated in units regardless of display metric; revenue and margin separated and labelled. |
| `D-INT-3` | **Simulated outcome was a hardcoded string.** `'Recomputed: Gap down to 1.5pp. Captured: +£21.4K'`, `'SLA Flex captures +1,200 units'` and `'closes 85% of Decision Gap'` were JSX literals. The reported simulation results were text. | Outcome statement generated by the engine from the recomputed gap; before/after asserted by tests `X2`, `X3`. |
| `D-INT-4` | **Fourth capacity number created.** `evaluateDemandFrontier` and `evaluateDecisionGap` both received `derivedImpacts` and never read it; executable demand was invented as `mean(history) × (1+cap)`. AC-DDF-13 was nominal. | Executable frontier derives from `supplier_capacity_units` via `capacity_index`. |
| `D-INT-5` | **Stability fabricated its own evidence.** With no signals supplied the engine synthesised three `EnterpriseSignal` objects inline, cited their IDs as contributing evidence and reported `status: 'VALID'`. `INDETERMINATE` was unreachable. | Fabrication removed; real signals fetched from `/api/v1/signals/current`; absent evidence yields `INDETERMINATE` with the reason named (tests `S6`, `S7`). |
| `D-INT-6` | **Decision Window unanchored.** `remaining_hours: 38` was a literal, unrelated to its own `deadline_iso` and to any clock; a missing constraint fabricated one instead of returning `INDETERMINATE`. | Explicit scenario clock; `remaining_hours` computed as `deadline − scenario_now`; `INDETERMINATE`, `CLOSING_SOON` and `RESTRICTED` all reachable; UTC stated with the BST offset noted (tests `W1`–`W7`). |
| `D-INT-7` | **Regret was not regret.** Each alternative used its own ad-hoc coefficients; `WAIT` captured 38% at half value and could never win; `ACT_NOW` won for any gap above ~200 units. | Relative regret against the best alternative; erosion derived from the window; over-commitment cost added. All three outcomes reachable (tests `R1`–`R8`). |
| `D-INT-8` | **New unsupported claims replacing old ones.** `Statistical Fit: 88%` (a bare literal replacing "91% Model Accuracy"), `Gemini Intelligence` on a card rendering a deterministic fallback, `+18% / +25% / +6.8% margin lift`, `89% / 84% / 86%`, `+£21,400 incremental revenue` (margin mislabelled as revenue), chart legend `+22% / +10% / +25%`, and engine evidence strings claiming cross-elasticity curves, weather-correlation models, shelf-life telemetry and 94% supplier reliability. | All removed. Every figure is engine-derived; every evidence string states its modelled basis. Asserted by test `X9`. |
| `D-INT-9` | **Stale-literal fallbacks.** `capturedGbp \|\| 21400`, `capturedUnits \|\| 1200`, `residualRegret \|\| 2400` — a zero gap would have claimed £21.4K captured. A hardcoded `derivedImpacts` fallback contradicted `calculateDerivedImpacts` by 5×. | Fallbacks removed; no Decision State means an explicit unavailable state, never a substituted number. |
| `D-INT-10` | **Recommendation computed from a fabricated gap.** The top-level evaluator built a stub `DemandDecisionGap` with hardcoded `emerging_demand_pct: 22`, passed `null as any` for regret, and computed the real gap afterwards — so the displayed recommendation came from different numbers than the displayed gap. | Ordering corrected: gap → recommendation → regret, each from the previous. |
| `D-INT-11` | **Stability edge cases.** Signed mean meant negative divergence *raised* the score; `DOWNWARD` was reachable only via a cannibalisation clause; `maxMagnitude` could fall below `minMagnitude` and go negative; `trend_direction: 'IMPROVING'` was asserted with no prior observation. | Magnitude drives the score, sign drives direction; magnitudes unsigned and ordered; trend reports `INDETERMINATE` absent a prior (tests `S3`, `S4`). |
| `D-INT-12` | **Intervention semantics.** A heatwave "intervention" set `event_boost: 'none'` — cancelling the weather. Badges read `OPTIMIZED` and `✓ Intervention Simulated`. | Fabricated levers removed; simulation labelled *Modelled outcome · Simulation only — nothing ordered*, with the engine stating no order was placed (test `X4`). |
| `D-INT-13` | **Terminology.** "Statistical Baseline" named both a projection method and a chart series; the chart carried two legends; the disclosure control read *"Explore Decision Frontier"*, which ADR-043 forbids shortening. | Names disambiguated, one legend, control reads *"How CogniX reached this"*. |
| `D-INT-14` | **Metric coupling.** With the display metric on revenue or waste, the chain still called the results "units" and priced them per unit. | The frontier is always evaluated in demand units; the metric selector governs the projection summary only, and says so. |
| `D-INT-15` | **Censored history counted as zero demand.** The final history day carries no record in the source; averaging it in as a zero depressed the run-rate base and inflated every percentage — the observed gap read `22.5pp` where the corrected base gives `13.1pp`. | Days with no record are excluded from the base and drawn as a gap, not a collapse to zero (`DEMAND_OBSERVABILITY_MODEL.md` §4.7, §4.9). |

---

## 5. `[HARD]` acceptance criteria

| Criterion | Status | Evidence |
| :--- | :--- | :--- |
| `AC-DDF-01` Existing behaviour preserved | **PASS** | Metric/horizon/method/event selectors, projection chart, three KPI cards, proactive-risk list, buffer optimisation, Execution Briefing and RLS role scoping all present and exercised in browser walkthrough. |
| `AC-DDF-02` Full regression green | **PASS** | 22/22 runners. CDI-01…07B 21/36/31/49/70/93/155/235, CDI-08 44, ESF-6 81, ESF-2 19, ESF-3 22, IFI-01 12, WP10-D 15, WP10-B ✓, WP10-C ✓, campaign-intelligence 133, campaign-decision-journey 96, bugfix 4/4 — every baseline matched exactly. |
| `AC-DDF-03` No governed contract changes meaning | **PASS** | `IFI-01` engine and contract unchanged in behaviour; WP10-C consumed read-only (test `P4`); no `CDI`/`ESF` semantics touched. |
| `AC-DDF-05` Stability not from the confidence constant | **PASS** | Test `S9`; `evaluateForecastStability` reads only signal divergence. |
| `AC-DDF-07` Real signal refs, no new type, `INDETERMINATE` when insufficient | **PASS** | Tests `S6`, `S7`, `S8`. Scoping filter over existing `CanonicalSignalType` values only. |
| `AC-DDF-09` Gap computed at runtime, not a label over a literal | **PASS** | Tests `G1`–`G3`, `G7`–`G9`; browser walkthrough moved the gap 13.1pp → 43.8pp on an event change. |
| `AC-DDF-10` `IFI-01` engine-bound via the route | **PASS** | `POST /api/v1/intent-fusion/evaluate` → 200 observed in the network trace. |
| `AC-DDF-13` Executable frontier read-only from `DecisionDerivedImpacts` | **PASS** | Tests `G6`, `P4`. |
| `AC-DDF-15` Window renders only from a declared constraint | **PASS** | Tests `W4`, `W6`; `INDETERMINATE` renders no countdown. |
| `AC-DDF-16` Demo constraints labelled | **PASS** | `MODELLED_DEMO_ASSUMPTION` on the window; *"Modelled scenario clock, not live time"* on the card. |
| `AC-DDF-17` Never shares an indicator with `CDI-07A` Half-Life | **PASS** | No Half-Life indicator on this surface; window never described as the decision expiring. |
| `AC-DDF-21` Alternatives from the same inputs | **PASS** | Test `R10`; shared input set published on the surface. |
| `AC-DDF-22` No winner where they do not separate | **PASS** | Tests `R6`, `R7`. |
| `AC-DDF-23` Gated options never recommended | **PASS** | Test `R8`. |
| `AC-DDF-24` Regret labelled as modelled expected value | **PASS** | Test `R9`; *"Modelled expected values, not calibrated probabilities"* on the card. |
| `AC-DDF-25` Every figure attributed | **PASS** | Test `X11`; assumption inventory with provenance class and source per input. |
| `AC-DDF-26` No unsupported ML/live-integration claims | **PASS** | Test `X9`; all such strings removed from surface and engine. |
| `AC-DDF-27` Primary figures internally consistent | **PASS** | Tests `G1`–`G4`, `X3`. Identity holds by construction. |
| `AC-DDF-28` Any relevant input recomputes everything | **PASS** | Tests `G7`–`G9`, `P1`–`P3`; browser walkthrough confirmed. |
| `AC-DDF-29` Simulation visibly changes outcomes; failure shows unavailable | **PASS** | Tests `X1`–`X5`; explicit unavailable panel replaces stale results. |
| `AC-DDF-31` No bare `OBSERVED`; no `confidence_pct` | **PASS** | Tests `X10`, `X12`. |
| `AC-DDF-36` `tsc` + build clean | **PASS** | Root, contracts, learning, world all clean; `npm run build` exit 0; no 4xx/5xx on the demand route. |
| `AC-DDF-37` Tests semantic, not structural | **PASS** | 56 assertions test invariants (reconciliation, bounds, reachability, non-negativity, determinism, absence of fabricated evidence). |

Non-`[HARD]` criteria `AC-DDF-04`, `06`, `08`, `11`, `12`, `14`, `18`, `19`, `20`, `30`, `32`, `33`, `34`, `35` are met.
`AC-DDF-35` verified at 1024 / 1280 / 1440 with no horizontal overflow.

---

## 6. Validation performed

```bash
npx tsc --noEmit                                  # root — clean
cd packages/contracts && npx tsc --noEmit         # clean
cd services/learning  && npx tsc --noEmit         # clean
cd services/world     && npx tsc --noEmit         # clean
for t in tests/unit/run-*.ts; do npx tsx "$t"; done   # 22/22 runners pass
npx tsx tests/unit/run-ddf01-tests.ts             # 56 passed, 0 failed
npm run build                                     # exit 0
git diff --check                                  # no whitespace errors
```

Browser walkthrough at 1024 / 1280 / 1440: scenario controls, projection method, horizon, event, promotion
depth, cannibalisation, reasoning disclosure, Simulate intervention and Reset. **No console errors.** All
API calls 200/202, including `POST /api/v1/intent-fusion/evaluate` and `GET /api/v1/signals/current`.

---

## 7. Synthetic and modelled assumptions

Every one is published in the on-surface assumption inventory with its provenance class.

| Input | Class |
| :--- | :--- |
| Demand base (observed run rate) | `SYNTHETIC_OBSERVED` — `cognix-world` history, `synthetic_demo = true` |
| Contributing signals (`sig_ps_*`) | `SYNTHETIC_OBSERVED` — `cognix-world` generator |
| Revenue per unit | derived from the projection (revenue ÷ units) |
| Weekly demand, supplier capacity, capacity index | `DERIVED_FROM_DECISION_STATE` — WP10-C read-only |
| Supplier allocation cap | `DECLARED_OPERATIONAL_CONSTRAINT` |
| Gross margin rate (30%) | `MODELLED_DEMO_ASSUMPTION` — the estate holds no cost data |
| Flex premium (12% of unit revenue) | `MODELLED_DEMO_ASSUMPTION` |
| SLA flex volume (1,200 units/week) | `MODELLED_DEMO_ASSUMPTION` — mirrors WP10-C |
| Scenario clock and supplier cut-off | `MODELLED_DEMO_ASSUMPTION` |
| FreshDirect UK, Trafford DC, SLA Rule 4 | `MODELLED_DEMO_ASSUMPTION` — named demonstration entities, not client data |
| Event effect table | `MODELLED_DEMO_ASSUMPTION` |

The estate operates at **Level 0 — Synthetic / modelled demonstration**, stated on the surface.

---

## 8. Residual limitations

1. **No calibration exists.** Forecast Confidence has no backtest; revision probability, expected values and
   regret are modelled, not calibrated. The surface says so; it must not be described otherwise in a demo.
2. **The margin rate and flex premium are assumptions.** Absolute £ figures are indicative. The **ordering**
   between alternatives rests on shared inputs and is the defensible claim — as ADR-043 states.
3. **Constraint attribution across the three named constraints is a modelled 65/25/10 split.** Only the
   supplier allocation cap is genuinely derived; the DC throughput and lead-time constraints are declared
   demonstration assumptions, labelled as such.
4. **Stability has no trend.** No prior assessment is retained, so `trend_direction` reports `INDETERMINATE`
   rather than claiming a direction of travel. Retaining history is a future capability, not a defect.
5. **Signals depend on `cognix-world`.** Where the service is unavailable the surface reports
   `INDETERMINATE` stability rather than substituting evidence — correct, and worth knowing before a demo.
6. **Physical demand observability is absent by design.** All `DOT-1`…`DOT-12` capabilities — latent demand,
   leakage, substitution, phantom inventory, evidence ledger, intent resolution, signal half-life,
   suppression loops — remain **out of scope and unimplemented**. `DDF-01` introduces no architecture that
   blocks them: the frontier consumes signals through the existing `EnterpriseSignal` contract and the
   `ESF-6` admission path, and adds no second notion of observation, authority or `synthetic_demo = false`.

---

## 9. Cross-references

- Governance and acceptance criteria: [`COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md`](COGNIX_DEMAND_DECISION_FRONTIER_PLANNING_REPORT.md)
- Capability family: [`DEMAND_OBSERVABILITY_MODEL.md`](../governance/DEMAND_OBSERVABILITY_MODEL.md)
- Work package registration: [`MASTER_PLAN.md`](../governance/MASTER_PLAN.md)
- Rulings: [`ARCHITECTURE_DECISIONS.md`](../architecture/ARCHITECTURE_DECISIONS.md) ADR-040…ADR-043 and amendments
