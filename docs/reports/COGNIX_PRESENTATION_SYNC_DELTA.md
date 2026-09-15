# CogniX Presentation Sync Delta

**Purpose.** A parallel process is building continuity slides against the pre-hardening
demonstration values. This record states, value by value, what the live application now shows and
whether the slide needs to change.

**Scope.** The connected decision journey: Demand & Forecast, Promotion, Campaign Decision,
Decision Ripple and Inventory.

**Basis.** Values read from the running application at `http://localhost:3000` after a scenario
restart, display currency GBP. Where a figure is derived rather than declared, the derivation is
named so a slide can cite it.

**Headline.** **Every demand-side value in the slide baseline is preserved exactly**, including the
post-intervention conclusion. The values that moved are on the Promotion, Campaign Decision,
Decision Ripple and Inventory surfaces, which previously ran on an economic scale the demand
journey had never shared. Those are listed in §2 and §3 and **do** need slide changes.

---

## 1. Opening scenario — NO CHANGE REQUIRED

| Slide value | Live application | Status |
|---|---|---|
| 900,125 expected units | 900,125 | **Unchanged** |
| 769,996 servable units | 769,996 | **Unchanged** |
| 130,129 units exposed | 130,129 | **Unchanged** |
| +28.6% above the un-promoted base | +28.6% | **Unchanged** |
| 699,996 base units | 699,996 | **Unchanged** |
| £269.4K revenue exposed | £269.4K | **Unchanged** |
| £80.7K gross margin exposed | £80.7K | **Unchanged** |
| Forecast Stability 64 | 64 | **Unchanged** |
| 62 hour Decision Window | 62h | **Unchanged** |
| 18.6pp Decision Gap | 18.6pp | **Unchanged** |
| Fresh Dairy · Cheddar Mature 400g · 14 days | Fresh Dairy · Cheddar Mature 400g · 14 days | **Unchanged** |

**One clarification a presenter should be ready for.** The slide says *North West*. The application
now states the decision explicitly as **national, with the North West in focus**: the committed 20%
promotion runs across the estate, which is what makes *"is 20% nationally still the right
intervention?"* the question the journey asks, and the North West is where the movement
concentrates and where the targeted alternative would apply. 900,125 units over fourteen days is a
credible national figure for a leading own-label cheddar (about 44 units per store per day) and is
not credible for one region. The slide does not need a number changed — it needs the words
*national, North West in focus* rather than *North West* alone.

## 2. Conclusion — NO CHANGE REQUIRED

Read from the application after simulating the recommended intervention.

| Slide value | Live application | Status |
|---|---|---|
| Decision Gap 18.6pp → 6.6pp | 18.6pp → 6.6pp | **Unchanged** |
| Units exposed 130,129 → 46,130 | 130,129 → 46,130 | **Unchanged** |
| Gross margin exposed £80.7K → £28.6K | £80.7K → £28.6K | **Unchanged** |
| Revenue exposed £269.4K → £95.5K | £269.4K → £95.5K | **Unchanged** |
| Cost of waiting £21.8K → £12.0K | £21.8K → £12.0K | **Unchanged** |
| 83,999 units recovered | 83,999 | **Unchanged** |
| £52,079 gross margin recovered | £52,079 | **Unchanged** |
| £20.9K premium | £20.9K | **Unchanged** |

**One wording change.** The recommendation card rounds the recovery to **84,000 units** in its
headline and states **83,999** in the simulation narrative — the same quantity (83,999.52) rounded
for a headline and stated exactly in the working. A slide quoting 83,999 is correct; a slide
quoting 84,000 is also correct. They should not appear on the same slide without the rounding
being obvious.

## 3. Values that CHANGED — slides must be updated

### 3.1 Promotion economics

The promotion surface previously worked from an abstract 10,000-unit week and a £1.85 unit
contribution that no price supported, with contribution falling only 0.7% per point of discount
depth. A 20% price cut therefore cost 14% of margin. It now costs what it actually costs, derived
from the scenario's list price, implied unit cost and supplier funding agreement.

| Slide value (pre-hardening) | Live application | Why |
|---|---|---|
| Expected demand uplift **+48.0%** | **+46.8%** | The demand response is now the same figure the causal engine attributes, net of cannibalisation. The two surfaces read a point of depth as 2.4pp and 0.55pp respectively before this. |
| Net contribution at 20% **−£3.3K** | **+£8.1K** | Priced from the real contribution at depth, across the real estate, with supplier funding declared. |
| CogniX sweet spot **14%** | **14%** | *Unchanged* — the recommended depth is the same. |
| Sweet spot value **+£4.1K** | **+£43.5K** | Same cause. |
| Elasticity tiers **+£1.8K / +£3.4K / +£4.1K / −£3.3K / −£7.9K / −£12.6K** (5/10/14/20/25/30%) | **+£21.9K / +£30.6K / +£43.5K / +£8.1K / −£23.0K / −£67.4K** | Same cause. The shape is preserved: accretive shallow, peak at 14%, destructive deep. |
| Live assessment contribution **−£150K** then **−£79.8K** | **+£11.4K** | The causal engine now shares the planning curve's prices, so the two figures on the same screen agree in sign and magnitude instead of differing by two orders. |
| *"71% of incremental volume across **18 high-yield stores**"* | *"71% … from **365 stores** — around a quarter of the estate"* | The 18 belonged to a 50-store estate. |
| **"National (50 Stores)"** in the scope selector | **"National — whole estate"** / **"North West — regional cluster"** | Scope semantics rather than an asserted estate size. |

**The narrative changes with it, and improves.** The pre-hardening story was *"20% destroys
£3,300"*. The story now is *"20% adds £8.1K, and 14% adds £43.5K — so the committed plan leaves
£35.4K on the table AND creates 130,129 units of demand the estate cannot serve."* The commercial
argument is weaker on its own and the combined argument is far stronger, because the supply
consequence is now the dominant reason to challenge the plan. Slides built on *"the promotion
destroys value"* should be rebuilt on *"the promotion leaves value behind and strands demand"*.

### 3.2 Decision Ripple

| Slide value | Live application | Why |
|---|---|---|
| Gross revenue lift **£595,200** | Incremental revenue **£347,760** | The old figure was the *total* uplifted revenue against a £480,000 baseline that existed nowhere else, mislabelled as a lift. This is the genuine incremental revenue: 168,000 units at the scenario's realised price. |
| Overtime labour expense **£48,000** | Cost to serve the surge **£20,160** | Derived from the volume landing outside the planned shift and delivery pattern, at a declared per-unit surge cost. |
| Margin compression **−2.9%** | Margin rate on incremental volume **24.2%** (−5.8pp against the 30% plan) | Published as the rate actually earned against the rate planned, rather than as an unanchored percentage. |
| Net profit delta **+£73,656** | Gross margin added **+£84,000** | Incremental margin less the surge cost. |
| **"+24.0% Sales Volume"** | **"+24.0% volume · 168,000 units"** | Same percentage, now with the units it refers to. |

### 3.3 Other economic scales named in the audit

| Slide / audit value | Live application | Why |
|---|---|---|
| Campaign Decision **£18,500 baseline** | The scenario's own economics (350,000-unit week at £1.04 contribution at list) | The £18,500 was a 10,000-unit week at £1.85. |
| Opportunity **+£84,000** | Retained as the Decision Ripple margin-added figure | Coincidental agreement, now derived. |
| Inventory **£420K / £120K** | Revenue exposure **£417.5K over 7 days** | Derived from the scenario's own 7-day revenue exposure and a declared multiple for the rest of the exposed set. |
| Supplier **FreshDirect UK** | **Cheshire Cheese Co (SUP002)** | The flex notice is now served on the party that makes the product, per the product master. Any slide naming FreshDirect UK must change. |
| SKU **P041** | **P004** | P041 is Washing Up Liquid. The scenario SKU is and was P004. |

### 3.4 New capabilities a slide may want to claim

- **Currency.** The demonstration runs in GBP, USD or EUR. Monetary values convert; units,
  percentages, scores, hours and store counts do not. Rates are ECB reference rates retrieved once
  per session through the platform's own endpoint, with dated last-known-good fallback.
- **Restart scenario.** The demonstration returns to its opening position deterministically.
- **Supplier promotional funding.** Declared at 35% of the price investment. This is the term that
  makes promotion economics work, and it is now visible as an assumption rather than absent.

---

## 4. Values a presenter should NOT be asked to defend

Two figures on the Promotion surface still come from two models and do not agree exactly:

| Quantity | Planning curve | Causal engine |
|---|---|---|
| Demand uplift at 20% depth | +46.8% | +50.5pp |
| Contribution at 20% depth | +£8.1K | +£11.4K |

They now share prices, costs, funding, cannibalisation basis and elasticity, and agree in sign and
broad magnitude at every depth. The residual difference is the causal engine's ambient drivers and
its per-SKU context factor, which the planning curve does not model. **A slide should quote one or
the other, not both**, and the Promotion surface figure (+46.8% / +£8.1K) is the one to use because
it is the number the decision frontier is drawn from. Closing this remaining seam is recorded as
open work in the Master Plan.

---

## 5. How to re-read these values

```
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d --build
# then, at http://localhost:3000
#   Restart scenario (foot of the navigation rail)
#   Demand & Forecast  → opening values
#   Simulate intervention → conclusion values
#   Promotion          → elasticity tiers and frontier plays
#   Decision Ripple    → consequence values
```

The reconciliation is also asserted in `tests/unit/run-canonical-scenario-tests.ts`, which fails if
any two surfaces of the connected journey stop agreeing on the same quantity.
