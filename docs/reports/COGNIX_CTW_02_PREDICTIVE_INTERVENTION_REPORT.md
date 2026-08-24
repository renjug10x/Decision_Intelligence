# COGNIX `CTW-02` — PREDICTIVE INTERVENTION PLANNING — IMPLEMENTATION REPORT

**Work package:** `CTW-02`, the final WP of the owner's CTW programme
**Delivered:** 2026-08-23 · branch `claude/cognix-capability-atlas-v2` · **not merged**
**Unblocked by:** `CTW-03`, which made the campaign horizon genuinely vary day to day
**Governing rulings:** ADR-070 (unamended)

---

## 1. The constraint that shaped everything

CTW-02 was blocked until CTW-03 landed, for a reason worth restating: a Decision Moment is a day that
differs materially from the other days, and under `FLAT_RATE_IDENTITY` no predicted day differed from
any other. With the horizon now shaped by a governed forecast, moments are derivable from evidence.

The binding rule, made structural rather than promised:

> A moment may cite exactly three sources — the CTW-03 forecast's per-period output, the observed
> deviation, and the declared uncertainty. Nothing else exists to cite.

`DecisionMomentEvidenceSource` has three members and the suite asserts every citation is one of them
(A-07). **With no forecast bound, no predicted moment exists at all** (A-01), and the surface explains
the absence rather than leaving a blank.

Nothing in CTW-02 forecasts. A sustained departure from plan is *stated* — it happened — and
explicitly **not projected forward**; refusing to extrapolate is published as one of the moment's
reasons (D-04), because projecting a deviation rate would be a forecast CTW-02 does not own.

---

## 2. What an analyst sees

**Campaign outlook** — headline, next decision, decision window, current action. Then at most three
moments, material first. Three is a decision; ten is a dashboard.

The demonstration campaign produces exactly the mix that shows the discipline working:

> **Contribution has run above plan for 3 days** · MATERIAL
> £3,614 more contribution than expected has accrued so far. **CogniX does not project that rate
> forward.** … *Contribution is running ahead of the activated plan. CogniX proposes no action against
> good news.*

> **Days 6–9 — contribution pressure expected** · WATCH
> Contribution is forecast 5% below the campaign average across these days. About £3,899 less
> contribution than an average period of the same length, before any intervention.
> *Days 6 to 9 — this period has already begun, so acting affects what is left of it. Acting now
> affects all 4 days of the period; each day of delay affects one fewer.*

> **Days 10–11 — demand expected at its highest** · WATCH
> *CogniX has no governed action for a demand peak. Stock cover would be the question to ask, and no
> stock trajectory is modelled — proposing one here would be a guess.*

That last refusal is the one worth noticing. The obvious demo move is a stock-risk warning; there is
no depletion model, so there is no warning.

---

## 3. Windows are arithmetic

A window runs from tomorrow to the **last day of the period it targets**. Acting on day 6 of a days
6–9 period changes days 6–9; acting on day 9 changes only day 9. The cost of delay is stated because
it is countable, never because it adds urgency. Where no window exists the surface says
*"No reliable intervention window available."*

This was **corrected during browser validation** — see §6.

---

## 4. Preview, planning, reassessment, reforecast

**Preview** compares do-nothing against intervene over the **remaining horizon only**, because elapsed
days are identical either way and including them would flatter whichever option was measured against
a bigger number. Both sides are CDI-02 at two promotional depths, reshaped by the *same* CTW-03
forecast. Measured on the demonstration campaign: 113,715 units / £180,921 against 110,242 units /
£183,960 — contribution +£3,040, demand −3,473 units, under the heading
*Margin protection ↔ Maximum demand growth*.

**Planning** records intent and changes nothing. `PREPARE_FOR_APPROVAL` is the governed default;
`REMIND_ME` is available; **`AUTOMATIC_EXECUTION` is declared unavailable and refused at the route** —
CogniX has no governed execution integration and will not simulate one.

**Reassessment** re-derives the plan's standing and returns `KEEP`, `BRING_FORWARD`, `DELAY`,
`RESCHEDULE`, `CANCEL`, `NO_LONGER_NECESSARY` or `MAY_BE_TOO_LATE` — always with options, never a
single instruction. **Every reassessment is appended, never replaced**: a plan kept, moved and then
cancelled reads back as exactly that sequence of judgements.

**Confirmation** preserves everything. The activated expectation and every observation are byte-for-byte
unchanged (E-05, E-06); the intervention is recorded with its reason; and a `REFORECAST` trajectory
covering only days from the effective day is published *beside* them, through the same governed model
(E-07). An intervention effective on an elapsed day is refused (`RJ-W9`, E-08). On the timeline the
reforecast is a fourth line, toggleable, because four trajectories at once is more than a reader can
hold (§17).

---

## 5. Campaign story

Built from recorded events and declared predictions only, with predictions marked *not yet happened*:
activation, each material observed departure, today, predicted moments, plans, reassessments and
confirmations. Nothing is written after the fact.

---

## 6. Three defects found by browser validation, each fixed with a regression test

The suite passed before any of these were found. Each was visible only by driving the real journey.

| # | Defect | Fix |
|---|---|---|
| 1 | **A window closed a day too early.** Days 6–9 reported *"No reliable intervention window available"* although acting on day 6 still changes days 6–9. The window ended at `focal − 1` | It now ends at the **last day of the period**, with the delay cost expressed as days-of-the-period affected. `I-INV-4` and B-02 updated to match |
| 2 | **A plan from a previous decision attached itself to a fresh campaign.** Moment ids are derived from the campaign day, so they repeat across activations, and the lookup matched on moment id alone | Plans are scoped to the contract they were made against — in the panel, the outlook and the story. Regression tests F-14a/b/c |
| 3 | **A rejected confirmation was already written.** The store committed `CONFIRMED` and validation ran afterwards, so a refused confirm returned 400 while the plan read as confirmed on screen | Validation now runs against the confirmation the plan *would* have, before any write. Regression tests F-18/19/20 |

`I-INV-6` was also **corrected rather than worked around**: it required a prior reassessment before any
status change, which rejected a direct confirmation — a decision an analyst is entitled to make
without waiting to be prompted. It now requires a trail for the statuses reached by re-evaluation
(`SUPERSEDED`, `AWAITING_APPROVAL`) and requires a `CONFIRMED` plan to carry its confirmation record,
which is its own documentation.

---

## 7. Governed diagnostics, unconcealed

The CTW-03 findings stand and are still on screen: the benchmark's better measured MASE and the
below-nominal interval coverage remain published on the timeline's technical disclosure. Nothing in
CTW-02 hides, restates or tunes them.

---

## 8. Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | Clean |
| Unit suites | **39 of 39 runners green.** `CTW-02` **82/82**. `CTW-01` 65, `CTW-01R` 60, `CTW-03` 77, `CDI-05` 70, `CDI-07A` 155, `CDI-07B` 235, `CDI-08` 44, `ESF-6` 81, `DDF-01` 56 — all unchanged |
| Production build | Clean. Four intervention routes registered |
| Governance (`ATL-07`) | `--enforce` → **GOVERNANCE CLEAN, exit 0** |
| Browser | 1024 / 1280 / 1440 — no overflow, no console errors on a clean server. Full journey exercised: activate → outlook → three moments → preview → plan → reassess → confirm → reforecast → story |

---

## 9. What was not done

No revenue, no stock prediction, no external automatic execution, no ML or learning claim, no second
forecasting engine, no post-flight reconciliation, no legacy Demand & Forecast migration. `ESF-4`
remains parked, not superseded.
