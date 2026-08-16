# COGNIX — ESF-6 / Y3a IMPLEMENTATION & INDEPENDENT RECONCILIATION REPORT
## Attested Observation Admission

**Type:** Implementation report + mandatory independent adversarial reconciliation (gate §9, binding condition 5).
**Baseline reconciled from:** `3af67ba6cbefe0734c29087fc1a7812c87e3a663`
**Branch:** `Feature/MatchingContract-AutoActivate`
**Date:** 2026-08-16
**Design gate:** `docs/reports/COGNIX_ESF_6_ATTESTED_OBSERVATION_ADMISSION_DESIGN_GATE.md` (FROZEN, E1–E7 resolved)
**Status:** **RECONCILED — three authority defects found and corrected, one of them critical.**

---

## 1. Verdict

The delivered implementation was structurally faithful to the gate — registry, receipts, the A0–A9
admission predicate, the W1–W5 witness, `C-INV-ENV-6`, and the D-2/D-3/D-4 corrections were all
present and correct in shape. It also shipped **63 passing assertions that did not detect a path
by which a caller could manufacture `WITHIN_DECLARED_ENVELOPE` over an observation the server never
admitted.**

That is the defect class the gate names as this work package's primary risk — "an estate that says
'real' about evidence it never received" — and it was reachable end to end through the public
comparison path. It is corrected, and the correction is guarded by permanent regressions.

**The pattern from CDI-02 through CDI-08 held again: every work package shipped defects found by
review rather than by its own suite.** Binding condition 5 earned its place.

---

## 2. Defects found and corrected

### R-1 — CRITICAL: the admission receipt was never bound to the observation it witnessed

**Sites:** `lib/campaign-learning-loop-engine.ts` `observationContext()` and the W3 witness condition.

Both resolved the receipt with `getReceipt(observation.admission_receipt_id, tenant)` and accepted
it on two facts only: that it resolved, and that its tenant matched. Neither checked:

- that the receipt's `kind` was `OBSERVATION_ADMISSION`, nor
- that its `subject_id` was **this** observation.

Any receipt the tenant had ever been issued therefore satisfied W3 and
`admission_receipt_resolves`. Because `determineObservationAuthority` gates the ESF-6 branch
entirely on `admission_receipt_resolves`, a body-supplied observation carrying an unrelated receipt
id reached `AUTHORITATIVE_EXTERNAL`.

**Reproduced end to end, not inferred.** A caller who registers one source (permitted), registers a
contract (sequence *n*), and then registers a **second, decoy source** (sequence *m > n*) holds a
`SOURCE_REGISTRATION` receipt whose sequence defeats W4's strict precedence test. Presenting that
receipt on a wholly fabricated observation cleared W1–W5 and published:

```
verdict = WITHIN_DECLARED_ENVELOPE      (observed_value = 999999, never admitted)
```

This directly contradicts gate §12 — "Body-supplied `observations[]` … resolves to no admission
receipt and can never be authoritative." It was reachable through
`POST …/prediction-comparison`, which does not run the A0 reserved-field guard over
`body.observations[]`.

**Correction.** `attestedObservationStore.resolveAdmissionReceiptFor(observation, tenantId)` is now
the single resolution path. It returns a receipt only when tenant, `kind === 'OBSERVATION_ADMISSION'`
and `subject_id === observation.observation_id` all hold. Both call sites use it.

**Post-correction:** the identical attack yields `INDETERMINATE`; the legitimate fixture still
yields `WITHIN_DECLARED_ENVELOPE`. Strictly narrowing, as binding condition 2 requires.

### R-2 — The ESF-6 authority branch failed *open* on the synthetic disjunction

`observationContext()` used `connector_synthetic_demo: source?.synthetic_demo ?? false`. When a
claimed attested source did not resolve, this asserted **not synthetic** — the opposite of the
ESF-3 branch three lines below, which correctly uses `?? true`.

An unresolvable source is not evidence of a real-world measurement. Corrected to `?? true`, so a
phantom source now collapses to `SYNTHETIC_DEMONSTRATION` rather than surviving into the authority
conjunction. (RJ-R2 lineage rejection is a second, independent guard on the same attack; both are
now asserted.)

### R-3 — The CDI-08 fixture migration minted receipts that bound nothing

The E5 migration issued each observation's admission receipt with a hard-coded
`subject_id: 'obs_subject'` while the observation itself took `obs_${Math.random()...}`. The receipt
never named the observation it accompanied. This is what let R-1 pass unnoticed: **the migrated
suite was itself exercising the unbound path.**

Corrected — the fixture now resolves the observation id first (respecting overrides) and issues the
receipt for that subject. Fixture ids are also now a deterministic counter rather than
`Math.random()`.

**All 44 CDI-08 assertions survive unchanged in meaning** (binding condition 3). Not one was
weakened to compile; ten failed on the corrected binding and passed again once the fixture was made
honest.

### R-4 — Dead attestation index in `issueReceipt`

The `SOURCE_REGISTRATION` branch recomputed an `att_` key from a different content tuple than
`registerSource` uses, producing an index entry that could never be looked up. Removed; the real
index is written by `registerSource`, the only path that knows the issued `attestation_id`.

### R-5 — Admission fabricated contract semantics it did not have

`admitObservation` built its authority context with hard-coded `admission_receipt_resolves: true`,
`connector_resolves: true`, `connector_status: 'AVAILABLE'`, and a synthesised
`comparison_invariants` carrying invented `objective_type: 'VOLUME'`, `primary_metric: 'VOLUME'`,
`timing_mode: 'KNOWN_DATES'` and the measurement window as planned dates.

`determineObservationAuthority` reads none of them, so nothing was mis-decided — verified by
reading the full conjunction, not assumed. But inventing contract semantics at a point that has no
contract invites exactly the misuse E6 forbids. All three booleans are now derived from registry
state, and the contract-owned invariants are left empty with the reason recorded in comment.

---

## 3. Vacuous and self-confirming assertions in the delivered suite

Reviewed all 63. Two were materially self-confirming:

| Assertion | Why it proved nothing | Replacement |
|---|---|---|
| **E-35** | Asserted only that the literal strings `'sequence = Date.now()'` and `'sequence = timestamp'` are absent from the store. No implementation would ever write either. | **E-35a/b/c** — every wall-clock reading in the store must be on an `issued_at_display:` line and nowhere else; the witness block is located and asserted free of any timestamp reference. Backed behaviourally by **R-40** below. |
| **E-34.5** | Asserted `eligibility.conditions.length === 8` — a count, which cannot distinguish a correct verdict from a wrong one. | **R-42** — each of LE-1…LE-8 asserted individually, including that LE-6 is reported **unmet** and that no eligible `LearningCase` is produced. |

**E-05** asserts a disjunction (`UNKNOWN_SOURCE || SOURCE_TENANT_MISMATCH`) — weak, but honest, and
it is documented in §6 why the stronger implemented behaviour is retained.

## 4. Regression guards added

Six permanent guards, each anchored to a defect above:

| # | Guard |
|---|---|
| **R-37** | A `SOURCE_REGISTRATION` receipt with a defeating sequence cannot stand in for an admission receipt. *The critical attack.* |
| **R-38** | A genuine `OBSERVATION_ADMISSION` receipt issued for a **different** observation does not witness this one. |
| **R-39** | ESF-6 origin with an unresolvable source fails closed (RJ-R2 lineage refusal, and the synthetic disjunction behind it). |
| **R-40** | Rewriting `issued_at_display` on every receipt to the epoch changes no verdict — wall clock is provably inert (E4). |
| **R-41** | An observation admitted **before** the contract was registered never reaches `WITHIN` (W4 strict precedence). |
| **R-42** | LE-1…LE-8 each asserted individually, including LE-6 unmet and no `LearningCase` produced. |

ESF-6 suite: **63 → 81 assertions, 81 passing.**

---

## 5. Positive fixture result — the §11 reference demo flow

Executed end to end, deterministic, no external credentials:

```
register attested source            → SOURCE_REGISTRATION   receipt, sequence 1
register DecisionContract (GROSS)   → CONTRACT_REGISTRATION receipt, sequence 2, digest recorded
admit realised observation          → OBSERVATION_ADMISSION receipt, sequence 3
                                      synthetic_demo = false, written from the source
        ↓
authority       determineObservationAuthority → AUTHORITATIVE_EXTERNAL
correspondence  evaluateComparability C0–C8   → LIKE_FOR_LIKE   (GROSS path)
witness         W1–W5 all hold                → SERVER_REGISTRATION_RECEIPT
        ↓
verdict = WITHIN_DECLARED_ENVELOPE
```

`ATTRIBUTABLE` remains `NO_OBSERVED_COUNTERFACTUAL`, exactly as CDI-08 §8 recorded.

## 6. Learning eligibility — precisely what passes and what remains blocked

Measured on the reference fixture, not asserted:

| Condition | Result | Basis |
|---|---|---|
| LE-1 contract_digest matches | **PASS** | digest binding |
| LE-2 status ACTIVE or SUPERSEDED | **PASS** | contract-declared |
| LE-3 ≥1 LIKE_FOR_LIKE comparison | **PASS** | composite grain key, CDI-08 A-08 |
| LE-4 every backing observation AUTHORITATIVE_EXTERNAL | **PASS** | **the ESF-6 unlock** |
| LE-5 completeness.complete | **PASS** | GROSS snapshot path binds |
| **LE-6 evidence_strength_floor > PLACEHOLDER_EXCLUDED** | **BLOCKED** | `evidence_strength_floor is PLACEHOLDER_EXCLUDED` |
| LE-7 verdict not INDETERMINATE | **PASS** | CDI-08 envelope + §6 witness |
| LE-8 no adapter_capability_gap | **PASS** | no OBSERVATION_ABSENT row |

**`eligible = false`. No `LearningCase` is produced, and none should be.**

The gate's §8 walkthrough marked LE-6 "✓ contract-declared". It *is* contract-declared — but it is
declared from `play.evidence_strength_floor`, and every play in the reference estate carries
`PLACEHOLDER_EXCLUDED` because the estate's own frontier evidence is seeded demo data. **Seven of
eight conditions now pass on genuinely attested evidence; the eighth is blocked by the honest
weakness of the surrounding estate, not by ESF-6.**

This is the correct outcome and is now asserted permanently (R-42) so that any future change which
starts manufacturing an eligible case is caught rather than believed. `LEARNING_PATTERN_PROMOTION`
remains `AWAITING_AUTHORITATIVE_SOURCE`; `N = 3` remains an uncalibrated demonstration policy;
nothing is promoted.

---

## 7. Attack matrix — independent re-execution

All of E-01…E-36 were re-run, and each of the following was additionally reproduced adversarially
rather than read from the delivered suite.

| Requirement | Result |
|---|---|
| `synthetic_demo=false` in a request cannot create authority | **HELD** — field is not read on the admission path; written from the source |
| Caller-supplied server identifiers / receipt ids / sequence rejected | **HELD** — A0 rejects, does not strip |
| Receipt sequence server-derived, monotonic per tenant, not caller-controlled | **HELD** |
| Cross-tenant source or receipt use fails closed | **HELD** (see note below) |
| Revoked / disabled sources cannot admit | **HELD** — a prior receipt does not rescue |
| ESF-3 synthetic observations cannot be migrated or relabelled | **HELD** — no such path exists |
| Caller contracts cannot self-declare `SERVER_REGISTRATION_RECEIPT` | **HELD** — `C-INV-ENV-6` |
| `WITHIN_DECLARED_ENVELOPE` requires all of W1–W5 + LIKE_FOR_LIKE | **CORRECTED** — W3 was unbound (R-1) |
| `OUTSIDE_DECLARED_ENVELOPE` retains the Z2 asymmetry | **HELD** — no receipt participates |
| Authority does not bypass CDI-08 C0–C8 | **HELD** — wrong metric / grain / window each refused independently |
| Authority derived from registry state, not echoed from request provenance | **CORRECTED** (R-1, R-2, R-5) |
| No wall-clock in authority, ordering or witness decisions | **HELD** — proven behaviourally (R-40), not by string match |
| Fail-closed on missing capability declarations | **HELD** — empty capability set refuses everything |

**Cross-tenant note (E-05).** The gate specifies `SOURCE_TENANT_MISMATCH`. The implementation
returns `UNKNOWN_SOURCE`, because the source registry is tenant-keyed and a foreign source never
resolves at all. **This is retained deliberately.** Reporting `SOURCE_TENANT_MISMATCH` would require
a cross-tenant lookup, which turns the endpoint into an oracle confirming that a given `source_id`
exists under *some other* tenant. Both outcomes reject and issue no receipt; the implemented one
leaks less. The gate's requirement is met in substance and exceeded in strength.

**Session coherence at admission (E-06).** A2's "session coherence where a session is supplied" is
implemented only as a non-blank check. A source is not session-bound, so there is nothing at
admission to check a foreign session against. The protection is real but lives at CDI-08 **C0**,
which returns `TENANT_SESSION_MISMATCH` — asserted by E-06. Recorded as a residual (§10).

---

## 8. Executive UX reconciliation

### 8.1 Signals Feed — the pixel coupling was replaced, and it was also wrong

The delivered solution capped the Signals Feed at `maxHeight: showAdvancedScenario ? 490 : 385`.
Measured against the rendered application, Campaign Configuration is **408px** collapsed and
**520px** expanded. **Both constants were too small**, so the cap engaged in both states and left
precisely the whitespace it was introduced to remove.

Replaced with a structural solution and no height constant: the Signals card is absolutely
positioned (`inset: 0`) inside a `position: relative` grid cell, so it contributes **no height** to
the `auto` grid row. The row is therefore sized solely by Campaign Configuration, and the card fills
whatever that turns out to be.

An intermediate attempt using `overflow: hidden` + `min-height: 0` produced equal heights but
**failed a stress test** — injecting nine additional signals grew the card to 1284px instead of
scrolling, because `overflow: hidden` does not exempt a grid item from `auto` row sizing. That
attempt was discarded rather than shipped.

Verified in the rebuilt application at 1440×900:

| Property | Collapsed | Advanced expanded |
|---|---|---|
| Campaign Configuration / Signals Feed height | 408 / 408 | 520 / 520 |
| Same top, same bottom | yes | yes |
| Computed `max-height` | `none` | `none` |
| Cards visible | 3.24 | 4.37 |
| 12-signal stress: card grew? | **no** (holds 408) | — |
| 12-signal stress: scroller engaged? | **yes** (321 client / 1197 scroll) | — |
| Last signal reachable | yes | — |

No signal is lost, Apply actions are intact, the Advanced Scenario expansion stays coherent inside
its card, and no artificial padding was added to Campaign Configuration.

### 8.2 Decision Context binding matrix — traced, not taken from the report

| UI field | Contract field | Runtime consumer | Classification |
|---|---|---|---|
| **Objective** | `CommercialIntent.campaign_objective` | Registered intent record | **CONTEXTUAL** — a prose label, not an executable `objective_type` |
| **Timing** | *(none)* | *(none)* | **PRESENTATION_ONLY** |
| **Market Strategy** | *(none)* | *(none)* | **PRESENTATION_ONLY** |
| **Audience / Segment** | `CommercialIntent.customer_segment` | Registered intent + decision-state transition | **BINDING** |
| **Channel Context** | `CommercialIntent.channel`, `.media_support` | Registered intent | **BINDING** |
| **Margin Floor** | *(none)* | *(none)* | **PRESENTATION_ONLY** |

**Margin Floor is not bound to economic feasibility evaluation.** The `marginFloor` state is
rendered and never leaves the component: it appears in no request body, and neither CDI-04 readiness
nor CDI-06 economics receives it. The implementation report's claim to the contrary was not
supported by the code and is corrected here.

**Timing uses the correct governed vocabulary** — the option values are literally `KNOWN_DATES` and
`FIND_BEST_WINDOW`, matching the real `TimingMode` type. But the selected value is never
transmitted. CDI-03 does consume a `timing_mode` — from the session's own `CampaignIntent`, not from
this control. The enum is right; the binding is absent.

**No backend enum was invented to justify any control.** `CommercialIntent` carries no
`timing_mode`, `market_strategy` or `margin_floor` field, and adding one would have been exactly the
fabrication the mission forbids. Instead the surface was made honest:

- A muted line under the Decision Context row: *"Objective is recorded on the registered intent.
  Timing and Market Strategy are planning context — they are not executed by the opportunity
  engine."*
- Margin Floor moved into the existing **Contextual:** chip row, labelled *"Margin Floor (not
  enforced by economics)"*, alongside the Supplier SLA / DC Buffer / Perishability chips that were
  already correctly marked contextual.

### 8.3 Executive hierarchy (C4) — within budget exactly

Measured on the rendered preview after a simulation:

| Budget | Delivered |
|---|---|
| ≤2 primary numeric outcomes | **2** — Expected Demand +48% Volume; Net Contribution Impact −£3.5K |
| 1 readiness state | **1** — CONDITIONAL GO |
| 1 synthesis | **1** |
| 1 contextual clue | **1** — "50 of 50 stores fall in scope for a national launch." |
| 1 provenance line | **1** — "Planning simulation · supporting lenses show seeded demo evidence · no observed outcome bound" |
| 1 Explore why action | **1** |

Advanced Scenario is collapsed by default. Explore Why reveals three lenses with exactly one active
at a time.

### 8.4 Data integrity (C5)

No fabricated store ranking, micro-market recommendation, live signal, observed evidence,
contribution, readiness state or opportunity score was found. Demo / Modelled / Assumed provenance
is preserved, and the preview's provenance line states plainly that the supporting lenses show
seeded demo evidence with no observed outcome bound.

The CDI-05 trajectory remains `FLAT_RATE_IDENTITY`: the SVG path is
`M 0,36 L 60,36 L 60,10 L 240,10 L 240,36 L 300,36` — straight `L` segments with `miter` joins, no
spline, no smoothing, no easing, no manufactured convergence. The `viewBox` scaling is affine, which
preserves straightness exactly.

---

## 9. Docker health — root cause

**Cause B: the healthcheck was stale, not the service.**

`cognix-world` reported `unhealthy` with a failing streak of 58 and log output `/bin/sh: nginx: not
found`. The compose healthcheck was

```
nginx -t && wget --no-verbose --tries=1 --spider http://localhost/api/health
```

— a copy-paste from an nginx-fronted image. `cognix-world` is a Node service on port 8081 with no
nginx binary, and its health route is `/api/v1/health`, not `/api/health` on port 80.

The service itself was healthy throughout: `/api/v1/health` returned `{"status":"ok"}` from both the
host and inside the container while Docker reported the container unhealthy.

Corrected to match the `cognix-learning` pattern exactly:

```
wget -qO- http://127.0.0.1:8081/api/v1/health || exit 1
```

No service infrastructure was redesigned. Final state after rebuild: **`cognix-web` healthy,
`cognix-world` healthy, `cognix-learning` healthy.**

---

## 10. Residual risks

1. **Body-supplied observations remain unguarded by A0.** `POST …/prediction-comparison` does not
   run `checkNoReservedServerFields` over `body.observations[]`. This is now harmless — R-1's
   binding means a forged receipt reference cannot resolve — but the reserved-field guard is
   asymmetric between the admission and comparison surfaces, and a future field could reopen the
   asymmetry. Deliberately not widened here: doing so would change accepted request shape on a
   CDI-07B/CDI-08 surface, which binding condition 4 forbids in this work package.

2. **Admission-level session coherence (E-06) is not implementable as specified.** Sources are not
   session-bound; the refusal lives at CDI-08 C0. Closing it properly means session-scoped sources,
   which is a design change, not a correction.

3. **`issued_at_display` is a genuine wall-clock reading.** E4 permits it for audit and display, and
   R-40 proves behaviourally that rewriting it to the epoch changes no verdict. But §11's claim that
   the demo flow involves "no wall clock" is true of every *decision* and false of that one display
   field. Bounded and documented rather than redesigned.

4. **7px horizontal overflow on the Promotion screen at ~1180px width.** Isolated to the app shell:
   `.main-content` cannot shrink below its min-content width, so `230px` sidebar + `951px` content
   exceeds the `1174px` scrollbar-reduced viewport. **Not introduced by this work** — removing the
   Signals Feed, then the entire Configuration row, then all of `.page-content` leaves the overflow
   unchanged, and `.topbar` overflows identically. Fixing it means editing global shell CSS used by
   every screen, which is out of scope for a UX refinement closure.

5. **`FIRST_PARTY_OPERATOR_ATTESTATION` remains a named human declaration, not a cryptographic
   proof** — as §10 of the gate requires, and it must never be rendered as verification.

6. **The reference estate cannot produce an eligible `LearningCase`** while every play carries
   `evidence_strength_floor = PLACEHOLDER_EXCLUDED` (LE-6). This is honest fail-closed behaviour,
   not a defect, and is now asserted.

---

## 11. Validation evidence

| Suite | Result |
|---|---|
| ESF-6 | **81 / 81** (63 delivered + 18 reconciliation assertions across R-37…R-42, E-35a/b/c) |
| CDI-08 | **44 / 44** — all assertions unchanged in meaning after the R-3 fixture correction |
| CDI-07B | 235 / 235 |
| CDI-07A | 155 / 155 |
| CDI-06 | 93 / 93 |
| CDI-05 | 70 / 70 |
| CDI-04 | 49 / 49 |
| CDI-03 | 31 / 31 |
| CDI-02 | 36 / 36 |
| CDI-01 | 21 / 21 |
| ESF-3 | 22 / 22 |
| ESF-2 | 19 / 19 |
| IFI-01 | 12 / 12 |
| WP10-D | 15 / 15 |
| WP10-B journey telemetry | all passed |
| WP10-C shared decision state | all passed |
| signals | 6 / 6 |
| bugfix & platform integrity | 4 / 4 |

```
npx tsc --project packages/contracts/tsconfig.json   → clean
npx tsc --noEmit                                     → clean
npm run build                                        → clean, all ESF-6 routes registered
git diff --check                                     → clean
docker compose                                       → cognix-web / cognix-world / cognix-learning all healthy
```

Browser verification performed against the rebuilt container image, not the dev server.

---

## 12. Recommendation

**ESF-6 / Y3a is complete and the repository is ready for FEATURE FREEZE**, with the residual risks
in §10 recorded and none of them blocking.

The predicate the work package existed to make true — *`synthetic_demo = false` is truthful because
a server-side registered attested source produced the observation through an admitted path, never
because a request payload said so* — now holds, and holds against the specific attack that defeated
it at delivery.

No successor work package was started. ESF-4, ESF-5, Y1, Y2 and Y4-cal remain unopened.
