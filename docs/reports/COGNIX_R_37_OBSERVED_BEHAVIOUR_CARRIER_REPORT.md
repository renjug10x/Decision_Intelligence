# COGNIX — `R-37` Curated Scenario Observed-Behaviour Evidence Carrier

**Document Status:** Delivery report
**Date:** 17 September 2026
**Class:** Wave-2 pre-convergence repair
**Base:** `5450fecf1a88da3431f2ca551a924fc717273adb` (`SCI-05` head, which carries SHA-B)
**Branch:** `feature/cognix-r37-observed-behaviour-carrier` — **not merged**
**Gate C:** **NOT passed. Not evaluated. Convergence has not started.**

---

## 1. What was wrong

Every certified scenario declares a `movement_attribution`, and every one of them attributes part of
its demand movement to observed customer behaviour. Only the reference scenario had evidence for it.

| scenario | declares `OBSERVED_BEHAVIOUR` | evidence it published | admitted by `DDF-01` |
|---|---|---|---|
| `SCN-FRESH-DAIRY-CHEDDAR-001` | 10.9pp | search velocity, basket adds, slot pressure, capacity, cover | **2** |
| `SCN-CHILLED-SALMON-002` | 8.0pp | lead-time drift, capacity pressure, stock cover | **0** |
| `SCN-BAKERY-SOURDOUGH-003` | 5.1pp | competitor launch, ageing, capacity, cover, margin | **0** |

`DDF_STABILITY_SIGNAL_TYPES` (ADR-040) admits demand-side divergence only, and excludes supply,
inventory, logistics and cost deliberately — their magnitudes would otherwise swamp a demand-stability
score, and a supplier's lateness would silently edit a demand forecast. So both curated packs reached
`evaluateForecastStability` with nothing to evaluate, it returned `INDETERMINATE`, and their Demand
surfaces published a movement with the observed-behaviour component simply **missing**.

The bakery pack showed the shape of the gap precisely. It already published its declared observed
behaviour — as `COMPETITOR_CAMPAIGN_LAUNCH`, a `COMMERCIAL` signal. A competitor featuring the
category is a **cause**; what customers then do is the **evidence**. Admitting the trigger would have
made the number appear and would have meant a competitor's marketing calendar editing a demand
forecast. That is the widening ADR-040 exists to refuse.

**The contract was found semantically correct and was not changed.**

---

## 2. What was built

One module, `services/world/src/observed-behaviour-carriers.ts`, read by two publishers.

| scenario | carriers | scope, from the record | observed on its own clock |
|---|---|---|---|
| Chilled Salmon | `CATEGORY_DEMAND_ACCELERATION` +18% | category `Chilled` | T-7 |
| | `ORDER_VELOCITY_ACCELERATION` +20% | `P048 Atlantic Salmon Fillet 300g` | T-3 |
| Premium Bakery | `CATEGORY_DEMAND_ACCELERATION` +8% | category `Bakery` | T-5 |
| | `REGIONAL_DEMAND_SHIFT` +18% | region `London` | T-3 |

All four types are ones ADR-040 already admits. The narratives are the packs' own: a constrained
chilled import shows the category running ahead of plan and stores re-ordering faster than the
replenishment cycle assumes, and the two agree closely, which is why that evidence reads as confident.
A same-day bake under a competitor's in-store feature in one region shows London moving hard while the
national category barely does — and the **gap between the two observations is itself the evidence**,
because `evaluateForecastStability` treats dispersion between signals as instability. A localised
response is not a market-wide one, and a regionally scoped decision needs to be able to tell.

**One source, two publishers.** `R-36`'s lesson was that a quantity reconstructed in two places will
agree until a second scenario arrives. The snapshot generator (what the Demand surface reads now) and
the timeline simulator (what Living Evidence replays across T-90 … T+30) are exactly such a pair. Both
read this module. The pressure profile is 1.00 at `Today`, which makes the snapshot and the timeline's
own now the same observation rather than two that happen to look alike — asserted, not assumed.

---

## 3. Why the amplitudes are declared, and what is not

ADR-073 rule 4 — *behaviour may be seeded, economics must be derived*. How far a category moved ahead
of a promotion is an **observation about the modelled world**. It is not derivable from a scenario's
economics, and inventing a derivation for it would assert a customer-response model this platform does
not have. The amplitudes are therefore declared, exactly as the reference scenario's 18% and 24%
always have been, and every identity and quantity beside them is read from the record.

**No percentage point of demand movement is written down anywhere on the path.** The carrier publishes
an observed divergence; ADR-040's transfer function converts it to an expected revision; the frontier
carries the contextualised outlook forward by that revision; and what the surface attributes to
observed behaviour is whatever that governed path returns.

The amplitudes were **calibrated** so that the governed path returns the contribution the record
already declares — the record is the authority and the evidence is the carrier, which is the
relationship the reference scenario has always had. That is stated plainly rather than implied, and it
is checked rather than trusted:

- §8 of the suite runs the live stability engine and fails if the published contribution drifts from
  the record's declaration, so a change to ADR-040's transfer function goes **red** instead of quietly
  continuing to agree.
- §8 also **withdraws the carriers** and asserts the outlook returns `INDETERMINATE` with a zero
  revision. Nothing else supplies the number.
- §9 asserts no carrier amplitude *is* the declared contribution, that the amplitudes do not sum to
  it, that every amplitude is a plain declared observation rather than a computed one, that the module
  reads the declared contribution exactly once — to decide whether to publish at all — and that no
  `.tsx` surface in `components/` or `app/` writes a contribution down.

---

## 4. What the running surface publishes

Production topology: `next build --output standalone` with `NEXT_PUBLIC_COGNIX_DEMO_MODE=true`, served
by `.next/standalone/server.js`, against the real `cognix-world` service on port 8081 with
`COGNIX_WORLD_MODE=service`. Read from the rendered Demand surface, not from the engine.

| | declared | published | carriers |
|---|---|---|---|
| Fresh Dairy — observed behaviour | 10.9pp | **+10.9pp** | search 18%, basket 24% *(untouched)* |
| Chilled Salmon — observed behaviour | 8.0pp | **+8.0pp** | category 18%, order velocity 20% |
| Premium Bakery — observed behaviour | 5.1pp | **+5.1pp** | category 8%, regional 18% |

Identical at 1440, 1024 and 720. 51 browser checks, zero failures, no 5xx, no page errors, no
horizontal overflow on Demand or Observability at any width.

Measured through the engine, to two decimals: **+10.94pp / +8.03pp / +5.11pp** against declared
10.9 / 8.0 / 5.1.

**The evidence changes the decision, and is not decorative.** The Decision Gap on the running surface
moves with it: Chilled Salmon 15,352 → **22,997 units** exposed, Premium Bakery **0 → 889 units** — a
scenario that previously showed no exposure at all now poses one.

**Fresh Dairy is bit-identical.** Base 699,996, expected 900,125, servable 769,996, exposed 130,129,
Decision Gap 18.6pp, total movement +28.59%, and its two carriers still publish 18% and 24%. The
carrier module returns nothing for `promotion_surge`, asserted.

---

## 5. Living Evidence participation

Verified through the `SCI-05` API path (`GET /api/v1/evidence`), not through `SCI-06` fixtures.

| | before | after |
|---|---|---|
| Salmon evidence at `Today` | 24 observations, **0 admitted**, stability `INDETERMINATE` | 40 observations, **16 admitted**, revision +4.9% |
| Bakery evidence at `Today` | 40 observations, **0 admitted**, stability `INDETERMINATE` | 56 observations, **16 admitted**, revision +2.6% |

Materiality is derived by leave-one-out over the published quantities, and the answers are specific
rather than uniform: Salmon's two carriers read `NOTABLE`; Bakery's category carrier reads `MATERIAL`
and its regional carrier `DECISIVE`; its `COMPETITOR_CAMPAIGN_LAUNCH`, `PERISHABLE_AGEING_PRESSURE`,
`SUPPLIER_CAPACITY_PRESSURE`, `STOCK_COVER_DECLINE` and `MARGIN_COMPRESSION` all read `IMMATERIAL`,
because they move no published quantity. Immaterial is a measured answer here, not an absence of one.

**No Refresh consequence was manufactured.** Advancing either scenario produces real movement and
states honestly that *"the evidence moved the numbers without changing the decision: the recommended
intervention and the state of the Decision Window are the same as before the advance."*

---

## 6. What still does not reconcile, and why it is not this repair's

The observed-behaviour leg reconciles for all three scenarios. The declared **total** does not, for
two packs:

| | declared total | published |
|---|---|---|
| Fresh Dairy | 28.59% | **+28.59%** |
| Chilled Salmon | 26.4% | +26.17% |
| Premium Bakery | 11.2% | +9.35% |

The cause is exact, and it is in neither the evidence nor DDF-01. Two independent defects, recorded as
`R-38` and `R-39`:

- **`R-38`** — `deriveDemandBase` measures the base over the history window **the chart asked for**.
  For a trending history that window mean is not the current run rate, so the base is inflated and
  every contributor percentage is deflated. Fresh Dairy's exposed demand reads 67,652 / 53,540 /
  50,647 units at 14 / 21 / 30 days of displayed history — the same decision, three answers.
- **`R-39`** — a declared `UNDERLYING_TREND` is realised at the forecast mean rather than over its
  declared horizon, so its magnitude depends on the horizon. Bakery (7 days) realises −1.69pp of a
  declared −1.6pp; Salmon (14 days) realises −1.60pp of a declared −2.5pp.

They currently **offset** each other, which is why the salmon pack lands 0.23pp short while carrying
two errors of over a point each:

| Salmon published total | |
|---|---|
| as built | +26.17% |
| `R-38` corrected alone | +27.62% — *further from its record* |
| `R-39` corrected alone | +25.01% |
| **both corrected** | **+26.45%**, decomposing as −2.50 / +20.90 / +8.05pp against a record declaring −2.5 / +20.9 / +8.0 and a total of 26.4% |

Bakery needs only `R-38`: correcting it moves +9.35% to **+11.20%**, its record to the digit.

They were **raised, not absorbed**. Changing the demand base moves the Decision Gap, the exposure, the
regret and the executable frontier on every surface, and Fresh Dairy's protected figures are calibrated
at the 21-day window. That is a packet with its own acceptance and its own owner decision, not a quiet
correction inside an evidence repair — and a packet that takes one of the two without the other will
move a certified scenario away from its record while appearing to fix a defect.

`R-40` additionally records that `services/world/dist` is a tracked build artefact three packets stale.

---

## 7. Verification

| | |
|---|---|
| Typecheck | `npx tsc --noEmit` clean |
| Focused suite | `run-r37-observed-behaviour-tests.ts` — **133 assertions, 0 failures**, 12 sections |
| Full estate | **49 runners, 48 fully green, 3,778 assertions.** `run-atl06b-tests` 132/1 — `R-25`'s `A6b`, byte-identical to the baseline and separated as required |
| Certification | Three scenarios `CERTIFIED`, 12/12 dimensions, 84/84 checks, zero `NOT_APPLICABLE`, two runs byte-identical |
| Frozen contracts | All six byte-identical — `a56c56ab`, `8e68e22c`, `986cf15f`, `74129f5b`, `e58e2cae`, `65e9b7f0` |
| Browser acceptance | 1440 / 1024 / 720, **51 checks, 0 failures** |
| Docker acceptance | **Attempted and not achieved.** `dockerd` 29.3.1 starts; the registry is unreachable from this environment (`proxyconnect tcp … connection refused` against `registry-1.docker.io`). Not claimed |

One existing assertion was **repointed, not relaxed**: `run-esf2-tests` Test 4 read the *first*
timeline's type on each side as an ordering proxy for scenario differentiation, and this repair
legitimately changed the order — a scenario's observed-behaviour carriers are seen before its supply
pressure and are listed where they were seen. It now asserts the differentiation itself: the two
families publish different evidence **sets**, each still carrying the signal its family exists to pose.
That is order-independent and strictly stronger.

---

## 8. Non-scope held

No `SCI-06` UI. No new `CanonicalSignalType`. `DDF_STABILITY_SIGNAL_TYPES` unchanged. No supply or
commercial signal repurposed as demand evidence. No scenario record edited. No frozen contract touched.
No change to the governed GenAI provider architecture — server-side `GEMINI_API_KEY`, no new provider,
no client-side key path. No secret, key or credential in code, logs, documentation or commits. Gate C
not evaluated. `SCI-06` not merged. Nothing merged to production.
