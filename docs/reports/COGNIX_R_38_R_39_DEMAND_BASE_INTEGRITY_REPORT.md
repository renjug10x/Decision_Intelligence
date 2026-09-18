# CogniX — `R-38` + `R-39` Demand Base and Trend Attribution Integrity

**Document Status:** Delivery report
**Date:** 17 September 2026
**Class:** Pre-Gate-C repair
**Base:** `d2959e59368b5d9a37613de4545c83ddc8201284` (`R-37` head)
**Branch:** `feature/cognix-r38-r39-demand-base-integrity` — **not merged**
**Gate C:** **NOT passed. Not evaluated.** `SCI-06` untouched and unmerged.

---

## 1. What the repair had to achieve

> one scenario → one economic baseline → one declared attribution decomposition,
> independent of how much historical data the interface chooses to display.

Two seams stood between the estate and that sentence.

---

## 2. `R-38` — the economic base was a second basis, not a window bug

`deriveDemandBase` implemented ADR-041 Amendment A's *"the observed run rate scaled to the horizon"*
literally: the mean of whatever history the caller passed in. The caller is the Demand surface, and what
it passes is `history_display_days` — **a presentation control**. For any scenario whose history carries
drift, the window mean sits behind the end of the series by half the window, so the base moved with the
chart.

| reference scenario, same decision | 14 days shown | 21 days shown | 30 days shown |
|---|---|---|---|
| economic base | 687,167 | 699,996 | 702,626 |
| exposed demand | 67,652 units | 53,540 units | 50,647 units |

The deeper finding is not the window. **The estate already held the right answer in two other places.**
`scenarioBaseDemandUnits` is the record's declared base; it is what the Scenario Certification Gate
reconciles `C-3.7` against and what Living Evidence publishes every quantity on. The frontier was
deriving a SECOND economic basis for a quantity the record already answers — ADR-073 Amendment A — and
the two agreed for the reference scenario **only because its real 21-day mean happened to land within
four units of its declared base**. That coincidence is why the seam survived three packets of review:
it was invisible until a second scenario arrived, where it read +1.16% and +1.69%.

**The repair.** The denominator is the record's. The observed run rate is still measured and is
published beside it as evidence, with `run_rate_variance_pct` naming how far apart they are, so nothing
was removed — what changed is that one of them no longer silently stands in for the other. ADR-041
Amendment A's actual ruling is unchanged and still holds by construction: one denominator, every
quantity resolved against it, `emerging_pct − executable_pct ≡ exposed ÷ base`. The censored-history
rule is untouched.

The certification gate had **already declared this invariant** — `C-3.7` asserts that the demand
engine's base equals the record's declared base. It passed before the repair only because it fed the
engine a flat 28-day history, where a window mean and a declared base cannot disagree. It now holds for
any history at all.

---

## 3. `R-39` — a declared attribution cannot survive a round trip through an estimated model

`SCI-03R` injected the declared `UNDERLYING_TREND` backwards into the modelled history as a linear
drift so the statistical model would *pick it up*. Measured, two independent mechanisms destroy it:

| | |
|---|---|
| **the borrowed shape carries its own drift** | the `Chilled` category series retains **−0.17%/day** of local drift over the salmon pack's window after `SCI-05`'s global de-trend, against a declared **−0.179%/day**. The history carried roughly twice its declared trend, and how much depended on what the borrowed category happened to be doing |
| **an estimated model damps what it is given** | extrapolating that history linearly gives **−4.98pp**; the fitted Holt-Winters returns **−1.60pp**. Damping is a property of the fit, not of the record |

The two partly cancelled, which is why the published trend was neither the declaration nor anything
predictable: −1.60pp against a declared −2.5pp for salmon, −1.69pp against −1.6pp for bakery.

**The contract settles where the trend belongs.** The record's own arithmetic spine is
`expected_demand_units = base_demand_units × (1 + total_demand_movement_pct/100)`, and
`movement_attribution` decomposes that total. So the underlying trend is a **forward movement of the
base across the horizon**, in the same sense and on the same basis as the commercial intent beside it —
not a historical slope. `SCI-03R`'s instinct was reasonable; the layer was wrong.

**The repair, in two parts.**

1. The borrowed shape is normalised **week by week** instead of by one global least-squares line, so it
   contributes the weekday rhythm and the day-to-day texture it was borrowed for and no direction at
   all. A modelled history is trimmed to whole weeks, which also aligns it with the cycles the
   Holt-Winters initialisation reads. Every week of a modelled history now carries the record's declared
   weekly level, asserted.
2. The declared trend is applied forward of the clock against the base by
   `scenarioUnderlyingTrendFactor` — the exact mirror of the `scenarioCommercialIntentFactor` that
   `R-36` introduced, in the same governed module. The two compose to the record's additive
   decomposition to the digit, because the commercial-intent factor already divides by the same trend
   basis:

   `base × (1 + trend/100) × (1 + (intent/100)/(1 + trend/100)) = base × (1 + trend/100 + intent/100)`

**No calibration multiplier, and no declared output literal.** Every number is read from
`movement_attribution`. The forecast is still the fitted model's output carrying declared factors — the
mechanism `R-36` established — still fitted to a history with real weekday texture, still publishing
empirically calibrated intervals.

**Where the factor applies.** A trend is declared only where nothing observed one. Where the estate
holds a scenario's own history the trend is IN that evidence, the fitted model measures it, and the
record describes what was measured: the reference scenario realises −1.96pp against a declared −2.0pp
on its own observed series, and applying a declared factor there would count one movement twice. The
predicate is the dataset's own provenance basis — **evidence coverage, never scenario identity** — and
§9 of the suite asserts that no file this repair touched names a scenario at all.

---

## 4. Three-scenario reconciliation, measured on the running topology

| | underlying trend | commercial intent | observed behaviour | total | record |
|---|---|---|---|---|---|
| Fresh Dairy | **−1.96pp** *(−2.0 declared, measured from its own observed history)* | **+19.61pp** *(19.6)* | **+10.94pp** *(10.9)* | **+28.59%** | 28.59% |
| Chilled Salmon | **−2.50pp** *(−2.5)* | **+20.90pp** *(20.9)* | **+8.05pp** *(8.0)* | **+26.45%** | 26.4% |
| Premium Bakery | **−1.60pp** *(−1.6)* | **+7.70pp** *(7.7)* | **+5.20pp** *(5.1)* | **+11.30%** | 11.2% |

The trend and commercial-intent legs reconcile to the digit on every scenario. The residual is the
observed-behaviour leg: `R-37`'s carrier amplitudes were calibrated against the basis this repair
corrected, and they were **deliberately not re-tuned**. Both remain inside the ±0.25pp tolerance `R-37`
asserts. `R-41` records the optional re-derivation, with the measurement that salmon cannot be improved
at all — ADR-040's expected revision lands on a coarse integer lattice whose nearest reachable totals
are 26.45% and 26.33% — and that only bakery could move. Chasing one displayed total by a tenth of a
point, by editing an evidence amplitude, inside a packet scoped to the base and the trend, is the
behaviour this workstream exists to remove.

---

## 5. History-window invariance

Measured through the governed API on the running production topology, for every scenario at every width.

| quantity | 14 days shown | 21 days shown | 30 days shown |
|---|---|---|---|
| economic base | 700,000 | 700,000 | 700,000 |
| expected demand | 900,125 | 900,125 | 900,125 |
| executable frontier | 770,000 | 770,000 | 770,000 |
| exposed demand | 130,125 | 130,125 | 130,125 |
| Decision Gap | 18.6pp | 18.6pp | 18.6pp |
| revenue exposure | identical | identical | identical |

`run-r38-r39-demand-base-tests.ts` §2 runs the whole pipeline three times per scenario and asserts
base, expected demand, executable frontier, exposed units, Decision Gap pp, revenue exposure, margin
exposure, all three attribution legs **and Decision Regret** are identical, after first asserting the
three runs really did display different amounts of history.

---

## 6. The reference scenario

| | before | now |
|---|---|---|
| economic base | 699,996 | **700,000** |
| expected demand | 900,125 | 900,125 |
| servable demand | 769,996 | **770,000** |
| exposed demand | 130,129 | **130,125** |
| exposed after the intervention | 46,130 | **46,125** |
| total movement | +28.6% | +28.6% |
| Decision Gap | 18.6pp → 6.6pp | 18.6pp → 6.6pp |
| Decision Window | 62h | 62h |
| Forecast Stability | 64 | 64 |
| revenue / margin exposed | £269.4K / £80.7K | £269.4K / £80.7K |

Three unit quantities move by four or five units — 0.003% — and every percentage, hour, score and money
figure is unchanged at the precision a slide states it. **699,996 was never the canonical baseline.**
The record declares 350,000 units a week, which is 700,000 over a 14-day horizon; 699,996 was the mean
of the scenario's real 21-day observed history multiplied by the horizon, and it agreed with the
declaration to four units by coincidence. The repair puts the published figure onto the record's own
arithmetic. No frozen contract had to change to do it, and no scenario is special-cased.
`COGNIX_PRESENTATION_SYNC_DELTA.md` §1a records the movement; **no slide needs a change.**

---

## 7. Verification

| | |
|---|---|
| Typecheck | `npx tsc --noEmit` clean |
| Focused suite | `run-r38-r39-demand-base-tests.ts` — **107 assertions, 0 failures**, 10 sections |
| Full estate | **50 runners, 49 fully green, 3,885 assertions.** `run-atl06b-tests` 132/1 — `R-25`'s `A6b`, byte-identical to the baseline and separated as required |
| Certification | 3/3 `CERTIFIED`, 12/12 dimensions, 84/84 checks, zero `NOT_APPLICABLE`, two runs byte-identical |
| Living Evidence | Materiality, decision relevance, Refresh, the scenario clock and the `R-37` carriers unchanged — Living Evidence already resolved the record's base, which is what made `R-38` a second basis rather than a window bug |
| Frozen contracts | All six byte-identical — `a56c56ab`, `8e68e22c`, `986cf15f`, `74129f5b`, `e58e2cae`, `65e9b7f0` |
| Browser acceptance | 1440 / 1024 / 720 — **150 checks, 0 failures**, including the history-window probe and Promotion / Campaign Decision scenario specificity |
| Docker acceptance | **Attempted and not achieved.** `dockerd` 29.3.1 starts; the registry is unreachable from this environment (`proxyconnect tcp … connection refused` against `registry-1.docker.io`). Not claimed. Acceptance ran on the standalone production build against the real `cognix-world` service |

Two existing assertions were **repointed, not relaxed**:

- `run-ddf01-tests` **G5** read the base off the history the caller supplied — the retired contract,
  stated literally. It now asserts the base is the scenario's declared base AND does not move when the
  history is halved, which is strictly stronger and fails the moment the run rate leaks back into the
  denominator. Its flat fixture is derived from the scenario's declared base rather than pinning a
  second economic scale beside it, which also fixed `G8` and `R6`.
- `run-canonical-scenario-tests` carried `130,129` inside a currency-localiser string fixture. Updated
  to `130,125` so no stale protected value survives in the estate; the test's meaning is unchanged.

---

## 8. `R-40`, reported separately and not touched

`services/world/dist` remains a tracked build artefact three packets stale. This packet's build
procedure does not own generated artefacts, so it was rebuilt locally for acceptance and reverted
before commit, exactly as `SCI-03`, `SCI-05` and `R-37` did. **`R-40` is unchanged and still open.**

---

## 9. Non-scope held

No Gate C evaluation. No `SCI-06` change. No `SCI-07` or any other `SCI` packet started. No frozen
contract touched. No scenario record edited. No scenario-identity branching. No calibration multiplier.
No declared output literal replacing a fitted forecast. `SCI-03R`'s deterministic scenario-history
mechanism retained. No Living Evidence contract changed. No change to the governed GenAI provider
architecture — server-side `GEMINI_API_KEY`, no new provider, no client-side key path. No secret, key or
credential in code, logs, documentation or commits. Nothing merged to production.
