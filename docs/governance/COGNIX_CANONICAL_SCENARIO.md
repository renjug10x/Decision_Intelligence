# CogniX Canonical Decision Case

**Status:** Authoritative. Governs the connected demonstration journey — Demand & Forecast,
Promotion, Campaign Decision, Decision Ripple and Inventory.
**Implementation:** `packages/contracts/src/canonical-scenario-model.ts`
**Enforcement:** `tests/unit/run-canonical-scenario-tests.ts`
**Decisions:** ADR-073 (one canonical decision case) · ADR-073 Amendment A (one MODEL, instantiated per
scenario) · ADR-074 (one currency layer) · ADR-077 (one scenario identity) · ADR-078 (the scenario
clock) · ADR-079 (declared differentiation) · ADR-082 (one provenance vocabulary)

**Read as a model since `SCI-01` (2026-09-16).** `CanonicalScenario` is the model;
`SCN-FRESH-DAIRY-CHEDDAR-001` is its first instance and remains the protected reference. Every rule in
§2 survives per scenario unchanged — they were always properties of a scenario rather than properties
of there being exactly one. The derivations are `scenario*(scenario, …)`; the `canonical*(…)`
accessors bind the reference instance by name at one place per quantity.

---

## 1. Why this record exists

The connected surfaces used to tell a consistent story on incompatible arithmetic. Demand published
a £269.4K exposure derived from an estate-wide projection; Promotion and Campaign Decision worked
from an abstract 10,000-unit week and a £1.85 unit contribution that no catalogue price supported;
Decision Ripple published a £595,200 revenue lift against a £480,000 baseline that existed nowhere
else. Each surface was internally consistent, so none of them looked wrong on its own.

This record is the single place those surfaces agree. **Everything the connected journey needs to
agree on is declared here once. Everything else is derived from it.**

## 2. The rules

1. **No connected surface may restate a declared value as its own literal.** If the surface needs
   the list price, the estate size, the horizon or the margin rate, it reads it.
2. **No surface may derive a second basis for a quantity this record already answers.** There is one
   realised price per unit, one margin rate, one supplier, one estate and one calendar.
3. **Supply is declared as ratios, never as counts.** The supplier allocation is an index; the flex
   clause is a rate. A count belonging to one population is how the same lever came to recover 1,200
   units on one surface and 84,000 on another.
4. **Behaviour may be seeded; economics must be derived.** How demand responds to a price cut is a
   property of the category and can be a seeded observation. What that response is *worth* is
   arithmetic and must come from price, cost and funding.
5. **Money is modelled in GBP and converted once, at the point of display.** See §7.

## 3. The decision case

| | |
|---|---|
| **Scenario** | `SCN-FRESH-DAIRY-CHEDDAR-001` — Fresh Dairy, committed national promotion under a supply ceiling |
| **Question** | Demand has moved above the plan the committed promotion was built on. Is 20% off nationally still the right intervention, and can we serve what it creates? |
| **Product** | `P004` Cheddar Mature 400g (Fresh Dairy · Cheese) |
| **Scope** | **National** — where the committed promotion runs. **North West in focus** — where the movement concentrates and where a targeted alternative would apply |
| **Horizon** | 14 days |
| **Supplier** | `SUP002` Cheshire Cheese Co — the SKU's supplier in the product master, and the counterparty to the flex clause |
| **Committed intervention** | 20% off, national, running the full horizon |

**On scope.** The application states the case as *national with the North West in focus* rather than
as a North West scenario. 900,125 units over fourteen days is credible nationally for a leading
own-label cheddar (about 44 units per store per day) and is not credible for one region. It is also
what makes the journey's question — *is 20% nationally still right?* — a question at all.

## 4. Declared values

Scale, estate and calendar:

| Value | Declared | Note |
|---|---|---|
| Un-promoted weekly demand | 350,000 units | **The scale anchor.** Everything is this, a horizon multiple of it, or a declared ratio of it |
| National estate | 1,450 stores | Illustrative. The journey speaks in scopes; counts exist so targeting arithmetic has a denominator |
| North West | 195 stores | |
| High-opportunity cluster | 365 stores, carrying 71% of incremental volume | What "targeted" means on the Promotion surface |
| Core superstores | 175 stores | |
| Online share of demand | 14% | |
| Forecast horizon | 14 days | |
| Promotion window | 14 days | The same fourteen days |
| Supplier order cut-off | Friday 14:00 UTC | |
| Supplier lead time | 3 days | |
| Observed history ends | 2026-06-03 | The scenario clock is midnight UTC on this date |

Demand movement:

| Value | Declared |
|---|---|
| Total movement above the un-promoted base | +28.59% |
| — committed promotion at 20% depth | +19.6pp |
| — observed customer behaviour | +10.9pp |
| — underlying demand trend | −2.0pp |

The parts compose multiplicatively, so they read as 28.5pp when added. The difference between the
sum and the total is composition, not a missing driver.

Supply and inventory:

| Value | Declared |
|---|---|
| Supplier capacity index | 1.10 of un-promoted weekly demand |
| Supplier flex rate | 12% of un-promoted weekly demand |
| Flex premium | 12% of unit revenue on flexed volume |
| Store inventory | 200,000 units (4.0 days of cover) |
| Distribution centre inventory | 300,000 units |
| On order, inside lead time | 385,000 units |

Economics:

| Value | Declared |
|---|---|
| List price | £2.49 — the product master price for `P004` |
| Promotion depth | 20% |
| Promotion participation | 85% of horizon volume transacts on promotion |
| Gross margin rate | 30% of realised revenue |
| Supplier promotional funding | 35% of the price investment |
| Demand response to price | 2.4pp per point of discount depth — **gross**; net of cannibalisation this is 2.208pp, and the elasticity curve plots the net figure |
| Cannibalisation | 8% of incremental volume |
| Waste | 14,700 units per week at the un-promoted run rate |
| Substitution recovery | 35% of unserved demand |

Declared differentiation (ADR-079):

| Value | Declared |
|---|---|
| Scope response multipliers | **None.** Nothing about the North West makes a point of depth buy more or less volume there than nationally, beyond what the estate's own size already accounts for |
| Depth-response anomalies | **+2.74pp at 14% depth.** A threshold price point wins feature space and signage that a 12% cut does not, and volume follows the display as much as the price. A seeded behavioural property of the category, admissible under rule 4 |

Taxonomy (ADR-077 part 2):

| Value | Declared |
|---|---|
| World family | `promotion_surge` — classification only. It carries no economics |
| Commercial archetype | `ARCH-CHILLED-ELASTIC` — supplies elasticity, cannibalisation, plays and narrative. It supplies no second population, price basis or estate, and it originates no scenario identity |

Provenance (ADR-082):

| Value | Declared |
|---|---|
| origin · method · authority | `modelled` · `rule` · `authoritative` |

## 5. Derived values

Nothing below is declared. These are the only ways a surface should obtain these quantities.

```
base demand (14d)       = 350,000 × 2                        = 700,000 units
expected demand         = base × (1 + 28.59%)                = 900,130 units
servable demand         = base × 1.10                        = 770,000 units
exposed demand          = expected − servable                = 130,130 units
supplier flex capacity  = base × 12%                         = 84,000 units

realised revenue/unit   = £2.49 × (1 − 20% × 85%)            = £2.07
gross margin/unit       = £2.07 × 30%                        = £0.62
implied unit cost       = £2.07 − £0.62                      = £1.45   (41.9% margin at list)
promoted price          = £2.49 × 0.80                       = £1.99
contribution at list    = £2.49 − £1.45                      = £1.04
contribution at depth d = £2.49 − (£2.49 × d% × 65%) − £1.45
erosion per depth point = £2.49 × 1% × 65% ÷ £1.04           = 1.56% of contribution

revenue exposure        = exposed × £2.07
margin exposure         = exposed × £0.62

depth response (net)    = depth × 2.4pp × (1 − 8%)          = 2.208pp per point
                          + declared anomaly at that depth
  at 20%                = 20 × 2.208                        = 44.16%
  at 14%                = 14 × 2.208 + 2.74                 = 33.65%
```

**On the depth response.** Until `SCI-01` the elasticity curve carried these values as literals —
2.34pp per point — and the causal engine multiplied its own response by `skuContextFactor`, a ±6% band
hashed from the SKU list and the region name. The literals had been calibrated against the engine WITH
that band applied, at the one scope whose name hashed to 1.06, so the two surfaces agreed at exactly
one scope by coincidence. ADR-079 retired the hash and the curve is now derived from the terms above.
See `COGNIX_PRESENTATION_SYNC_DELTA.md` §3.1 for the values that moved.

**Declared scale against measured run rate.** The record declares 350,000 units a week. The Demand
surface independently *measures* 349,998 from the observed history. These are different quantities
and are meant to be; that they agree within 0.001% is the reconciliation, and it is asserted as an
invariant rather than arranged by making one read the other.

**On the margin assumption.** A 30% rate on realised revenue implies a unit cost of £1.45 and a
margin at full price of about 42%. That is where an own-label cheese line sits and it is published
here so the assumption can be checked against the shelf price rather than taken on trust.

**On supplier funding.** Without it, a 20% cut on a line earning 42% at list is value-destroying at
every depth, no depth is recommendable, and the Promotion surface has nothing to say. Price
investment on a staple is part-funded by the supplier, and the funded share is the single largest
determinant of whether a promotion is worth running.

## 6. What consumes this record

| Consumer | What it takes |
|---|---|
| `packages/contracts/src/decision-state-model.ts` | The weekly population, the flex and buffer rates, the realised price for exposure |
| `lib/demand-decision-frontier/demand-frontier-engine.ts` | Unit economics, margin rate, flex allowance, flex premium, supplier identity, cut-off weekday and hour |
| `lib/campaign-causal-engine.ts` | Weekly population, contribution at list, contribution erosion, waste baseline, elasticity, cannibalisation rate |
| `lib/campaign-archetypes.ts` | Estate scopes, canonical SKU identity, price, cost, volume; the elasticity curve and every frontier play derive from it |
| `packages/contracts/src/campaign-timeline-model.ts` | The weekly population the CDI-02 lenses rebuild units from |
| `packages/contracts/src/campaign-readiness-model.ts` | The mirrored recovery-lever headrooms |
| `packages/contracts/src/campaign-intent-model.ts` | The context a new Campaign Decision opens on, and the promotion window |
| `components/DecisionRippleIntelligence.tsx` | Base demand, realised price, margin per unit, margin rate |
| `components/AvailabilityIntelligence.tsx` | The scenario's own 7-day revenue exposure |

## 7. Currency

GBP is the canonical base and every modelled value is held in it. `lib/currency/format.ts` converts
once, at the point of display; its entry point takes an amount *in the base currency*, which is what
makes double conversion structurally impossible rather than merely avoided. Units, percentages,
points, scores, hours, days and store counts are never converted.

Rates are ECB reference rates served through Frankfurter, read by the browser from the platform's
own cached endpoint (`GET /api/v1/fx`) rather than from the rate host. The provider needs no API
key, so there is no credential that could reach a client bundle. A failed lookup degrades to
last-known-good and then to a dated seeded reference set, and says which it is using.

## 8. Changing this record

Changing a declared value changes the whole connected journey, which is the point. Before changing
one:

1. Run `npx tsx tests/unit/run-canonical-scenario-tests.ts`. It compares surfaces against each other
   and will tell you what stopped agreeing.
2. Run the full suite. Several acceptance suites assert relationships against this record.
3. Re-read [`COGNIX_PRESENTATION_SYNC_DELTA.md`](../reports/COGNIX_PRESENTATION_SYNC_DELTA.md) and
   update it. A demonstration whose slides and application disagree is the defect this whole
   workstream existed to close.
