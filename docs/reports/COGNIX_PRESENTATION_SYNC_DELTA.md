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

**Second pass, 2026-09-15 (closure).** The Promotion model seam, archetype continuity, structured
money, supplier-funding transparency and journey continuity were closed. **No slide value changed
in that pass** — §1, §2 and §3 stand exactly as recorded. What changed is what the Promotion surface
now *says about* its numbers; §6 records the additions a presenter should be ready for.

**Third pass, 2026-09-16 (`SCI-01`).** **§1 and §2 are unchanged to the digit** and were re-measured
against the running application to confirm it. The Promotion elasticity tiers in §3.1 DID move, and
§3.1 now carries both the figure and why it moved. The cause is ADR-079: the causal engine applied
`skuContextFactor`, a +/-6% band derived from a hash of the SKU list and the region name, and the
seeded elasticity curve had been calibrated against the engine WITH that band applied at the one
scope whose name hashed to 1.06. Retiring the hash made the curve derive from the record's declared
2.4pp per point of depth and 8% cannibalisation rate for the first time. **A presenter should know
that the committed 20% plan now reads as value-destroying rather than mildly accretive, and that the
14% recommendation is unchanged and its advantage is larger.**

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
| Expected demand uplift **+48.0%** | **+44.16%** | Derived from the record: 20 points of depth at the declared 2.4pp per point, net of the declared 8% cannibalisation rate. Read **+46.8%** between `DEMO-HARD-02` and `SCI-01`; the 6% difference was `skuContextFactor`, a hash of the SKU list and the region name, and ADR-079 retired it. |
| Net contribution at 20% **−£3.3K** | **−£5.2K** | Priced from the real contribution at depth, across the real estate, with supplier funding declared, on the corrected volume. Read **+£8.1K** while the hash was inflating the volume by 6%. |
| CogniX sweet spot **14%** | **14%** | *Unchanged through both passes* — the recommended depth is the same, and it is now the recommendation by a wider margin. |
| Sweet spot value **+£4.1K** | **+£33.0K** | Same cause. Read **+£43.5K** under the hash. |
| Elasticity tiers **+£1.8K / +£3.4K / +£4.1K / −£3.3K / −£7.9K / −£12.6K** (5/10/14/20/25/30%) | **+£17.5K / +£22.5K / +£33.0K / −£5.2K / −£37.7K / −£82.7K** | Same cause. The shape is preserved: accretive shallow, peak at 14%, destructive deep. |
| Demand uplift tiers (5/10/14/20/25/30%) | **+11.04% / +22.08% / +33.65% / +44.16% / +55.2% / +66.24%** | Every tier is now `depth x 2.4pp x (1 − 8%)`, plus the declared +2.74pp threshold effect at 14% which carries its reason on the scenario record. |
| Live assessment contribution **−£150K** then **−£79.8K** | **+£9.6K** | The causal engine shares the planning curve's prices, so the two figures on the same screen agree in sign and magnitude instead of differing by two orders. The screen now also shows the price-cut and campaign-design components adding to the total: **+47.9pp = +44.2pp from the price cut + 3.7pp from who / where / when**. |
| *"71% of incremental volume across **18 high-yield stores**"* | *"71% … from **365 stores** — around a quarter of the estate"* | The 18 belonged to a 50-store estate. |
| **"National (50 Stores)"** in the scope selector | **"National — whole estate"** / **"North West — regional cluster"** | Scope semantics rather than an asserted estate size. |

**The narrative, as it stands after `SCI-01`.** The story is now *"the committed 20% cut destroys
£5.2K of contribution, 14% adds £33.0K — a £38.2K swing — AND the committed depth creates 130,129
units of demand the estate cannot serve."* Both halves of the commercial argument are available: the
plan is value-destroying on its own terms, and it strands demand. Slides may use either or both.

A presenter should be ready for one question, because it is the obvious one: *why did this number
change?* The answer is short and is a strength rather than an apology — **the platform found that its
own promotion economics were being modified by a hash of a product code and a region name, and
retired it.** Every figure on the Promotion surface now traces to a value declared on the scenario
record. That is the proposition the product is selling, demonstrated on itself.

**One value a presenter should not be surprised by.** Between `DEMO-HARD-02` and `SCI-01` this
surface read *"20% adds £8.1K"*. Any slide built in that window carries the hash-inflated figure and
must be updated to −£5.2K.

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

---

## 6. Second pass — additions, not changes (2026-09-15)

Nothing in §1–§3 moved. These are new statements on surfaces the presentation already covers.

| Surface | What is new | Why it matters to a slide |
|---|---|---|
| Promotion cards | *"Demand the price cut buys"* / *"Contribution it returns · over 14 days"* | The two headline cards now name what they measure and over what period. The values are unchanged: **+46.8%** and **+£8.1K**. |
| Promotion live line | *"This campaign as configured: +50.5 pp — +46.8pp from the price cut, +3.7pp from who we target, where we run it, when we run it"* | This replaces the bare *"Attributable uplift: +50.5 pp"*. A slide quoting both the curve and the live assessment can now show how they relate rather than leaving them looking contradictory. |
| Promotion live line | *"Contribution over 14 days: +£22.7K"* | **Replaces** *"Contribution impact: +£11.4K"*. The old figure was a WEEKLY rate sitting beside a 14-day curve value with nothing saying so. Same campaign, same economics, correctly stated over the campaign window. **If a slide quotes £11.4K it must change to £22.7K.** |
| Promotion assumption strip | *"…· supplier funds 35% of the price invested (modelled assumption)"* | The funding term is now discoverable on the surface and in the demand assumption inventory. Any slide mentioning promotion economics should be able to answer "who pays for the discount?" the same way. |
| Demand | New handover: *"A committed 20% promotion is the largest single driver of this movement — Challenge the committed promotion →"* | Gives the Demand→Promotion slide transition an on-screen equivalent. |
| Promotion | New handover: *"Or ask whether to intervene at all →"* | Gives the Promotion→Campaign Decision slide transition an on-screen equivalent. |
| Campaign window | Anchored to the scenario clock and inclusive of both endpoints | The promotion window read **15 days** against a 14-day forecast horizon, and drifted with real civil time. It is now 14 days, matching the horizon. No slide quoted 15. |

### Archetypes other than the canonical one

The six alternative archetypes were still priced against the retired 50-store, £1.85-contribution
estate. They are now on the same economic framework, keeping their own elasticity, cannibalisation,
supplier constraint, seasonality and inventory behaviour. **None of them appears in the connected
demonstration narrative**, so no slide value is affected — but a presenter who switches archetype
live will now see enterprise-scale economics rather than the old ones, and five of the seven now
answer *"do not discount"*, which is a legitimate and defensible CogniX recommendation.

### One figure a presenter should not put on a slide

The Promotion surface publishes **+46.8%** (what the price cut buys) and **+50.5pp** (what this
campaign, as configured, causes). Both are correct and they measure different things — the
difference is the audience, placement and timing the curve deliberately holds fixed. **Quote one,
not both**, and prefer +46.8% because it is the number the elasticity curve is drawn from.

---

## 7. Forward notice — programme `SCI` (authorised 2026-09-15, not started)

This section changes **no value in §1–§6**. It records what a presenter should know is coming, and one
defect a presenter should not be ambushed by.

### 7.1 A live contradiction on Observability & Governance

§3.3 of this record states that any slide naming **FreshDirect UK** must change, because the flex
notice is now served on **Cheshire Cheese Co (SUP002)**, the party that makes the product.

**The application has not fully followed.** The Observability & Governance signals panel requests no
scenario, the route defaults to `family_id=promotion_surge` / `scenario_id=SCN-PROMO-01`, and the
surface publishes `SUPPLIER_CAPACITY_PRESSURE` against FreshDirect UK — three surfaces away from a
journey built on Cheshire Cheese Co.

**Until `SCI-01` lands, do not open the Observability signals panel in a client demonstration**, or
open it knowing the supplier shown there is the retired one and be ready to say so. Registered as
residual `R-20`. Nothing on Demand, Promotion, Campaign Decision, Ripple or Inventory is affected.

### 7.2 Signal freshness and Refresh

Signals are stamped with civil wall-clock time rather than the scenario clock, so every signal reads as
zero seconds old and the *Refresh signals* control produces no visible change. This is residual `R-19`
and is why Refresh currently demonstrates poorly. `SCI-05` makes Refresh advance the scenario's
evidence state and publish whether the decision changed.

### 7.3 What will change for slides when `SCI` lands

| Wave | Expected slide impact |
|---|---|
| `SCI-01` / `SCI-02` (Wave 0) | **None to any value in §1–§2.** Acceptance requires the protected journey unchanged to the digit. The Observability supplier corrects itself |
| `SCI-03` / `SCI-04` (Wave 1) | **Additive.** Two further certified scenarios and a selector. The canonical scenario remains the opening position and the reference |
| `SCI-05` / `SCI-06` (Wave 2) | **Additive, and a new demonstrable moment** — Refresh advances evidence and states whether the recommendation changed. Observability reorganises into four sections; no visual redesign |
| `SCI-07` / `SCI-09` (Wave 3) | Architecture surface replaces the storyboard **only if `SB-GATE` reaches 6 of 6**. Until then the storyboard is retained and labelled |

### 7.4 The one residual §4 records, and what happens to it

§4 records two Promotion figures a presenter should not be asked to defend together — the planning
curve's `+46.8%` / `+£8.1K` against the causal engine's `+50.5pp` / `+£22.7K`. The guidance stands:
**quote one, and prefer `+46.8%`.**

`SCI-01` retires `skuContextFactor`, the hash-derived ±6% band that is a material part of that
divergence (ADR-079, residual `R-21`). After it, the remaining difference is audience, placement and
timing only — which is what ADR-075 always said it was. **This record must be re-read and updated at
the Wave 0 convergence gate**, per §8 of `COGNIX_CANONICAL_SCENARIO.md`.
