# Wave-1 Convergence and Gate-B Assessment

**Date:** 2026-09-17.
**Result:** **GATE B IS OPEN. Wave 2 is NOT authorised.**
**Convergence branch:** `feature/cognix-sci-wave1-convergence`.
**Converged from:** `SCI-03` `eff9bec0f515ae6c7d585a376b09d490515a2a24` · `SCI-04`
`01f2130a027ec97607fc8fb2e9ec1356ebf06446`, both cut from the declared Wave-1 base
`13ce376e19239a4081e6c68764e470733ffc52b5`.
**Decisions applied:** ADR-084 (parts 1–5) · ADR-080 · ADR-079 · ADR-077 · ADR-073.

Nine of the ten governed conditions pass on evidence. One fails, and it fails for a reason a
merge cannot decide: the two lanes encode **incompatible assumptions about where a decision
surface gets its economics**. §8 states the conflict rather than choosing a side, which is what
the convergence directive requires.

---

## 1. Inputs verified before anything was changed

| | Declared | Measured | |
|---|---|---|---|
| Wave-1 base | `13ce376e19239a4081e6c68764e470733ffc52b5` | exists; `docs(cognix): record SHA-A for the Wave-0 convergence` | **OK** |
| `SCI-03` | `eff9bec0f515ae6c7d585a376b09d490515a2a24` | head of `feature/cognix-sci-03-curated-scenarios` | **OK** |
| `SCI-04` | `01f2130a027ec97607fc8fb2e9ec1356ebf06446` | head of `feature/cognix-sci-04-scenario-selection` | **OK** |

**Ancestry.** `merge-base --is-ancestor` holds for both. `merge-base(SCI-03, SCI-04)` is the
Wave-1 base exactly. Each lane is a **single commit whose parent is the base** — verified with
`git log -1 --format=%P`, not inferred. No drift, no rebase needed.

**Gate A** is recorded **PASSED** in `COGNIX_WAVE0_CONVERGENCE_GATE_A_CLOSURE.md`, all ten
conditions evidenced, SHA-A `8d6d960cd7d1a24ea41737da2d04bd4e47765a86`. The Wave-1 base is one
commit ahead of SHA-A — the record of the SHA itself, which changes no code.

**One governance naming drift, stated rather than silently accepted.** §5 of the work-packet
register names `feature/cognix-sci-03-scenario-packs`; the delivered branch is
`feature/cognix-sci-03-curated-scenarios`. `SCI-03` recorded the correction itself. Both lanes
were cut from the declared base SHA, which is what ADR-084 part 2 actually governs.

---

## 2. Changed-file overlap, calculated before merging

`SCI-03` changed **36 files**, `SCI-04` changed **8**. The intersection is **exactly two**, and
`git merge-tree` predicted a conflict in both before any merge was attempted:

```
app/api/v1/scenarios/route.ts
docs/governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md
```

**Nothing else is shared.** `SCI-03`'s changes to `PromotionPlanner.tsx`,
`InterventionWorkspace.tsx` and `InverseAnalysisLens.tsx` are confirmed mechanical —
`REGION_STORE_COUNTS` → `regionStoreCounts()` call sites and nothing else — and `SCI-04` touches
none of those files, so there was no interaction to reconcile. They are preserved as authored.

---

## 3. Semantic conflicts found, and how each was resolved

### 3.1 `app/api/v1/scenarios/route.ts` — both lanes rewrote one function, for opposite reasons

| lane | what it did | why |
|---|---|---|
| `SCI-03` | **removed** `temporal_evidence` | R-30: with three certified packs, two of the three legacy family series contradict their scenario's own record in DIRECTION, not scale |
| `SCI-04` | **added** `certification_state` and `certification_summary` **on top of that same field** | a client-facing selector must not offer an uncertified scenario |

**Resolved by keeping both intents:** the certification enrichment survives, the retired field is
not reinstated. The converged Wave-1 experience prefers absence to contradictory evidence, and
R-30 remains `SCI-05`'s under its declared Refresh contract. **`temporal_evidence` was not
recreated or synthesised anywhere.**

Three further reconciliations the merge could not make on its own:

- **Certification is measured, never inferred.** `SCI-04` reported `CERTIFIED` for any
  `demo_active` entry the gate returned no result for. The converged route reports `UNCERTIFIED`
  and says why. A route that infers a verdict it did not run is the formality the gate exists to
  prevent — this is a strengthening, not a weakening.
- **The proxied catalogue is certified too.** `cognix-world` does not install the gate (R-28), so
  in service mode the catalogue arrived with no verdict and the selector would have shown every
  certified pack as *Unavailable*. The badge is applied in the BFF, which does install the gate.
  Domain catalogue upstream, client-facing certification here, no duplicated domain logic.
- `catalogueWithEvidence` was renamed `catalogueWithCertification`, because it no longer carries
  evidence.

### 3.2 The work-packet record — each lane marked only its own row

`SCI-03` set its row `[COMPLETED]` and left `SCI-04` *Not started*; `SCI-04` did the reverse.
Both rows are now `[COMPLETED]` and **both delivery records are preserved intact**.

### 3.3 Two type errors in `SCI-04`'s own test file

The base and `SCI-03` both pass `tsc --noEmit`; `SCI-04` does not. Fixed at convergence:

- the test activation policy returned `{ admitted: true }` without the `reason` the
  `ScenarioActivationPolicy` contract requires;
- the uncertified fixture set `base_demand_units_per_week` on `economics`, where it is not
  declared, instead of on `demand`. As an excess property it broke nothing — so the fixture was
  being refused for some reason other than the one it stated. Moved to `demand`, where it
  genuinely breaks `C-2`.

---

## 4. Four convergence defects found by running the converged product

Each is the same class: a value correct while ONE scenario was registered, wrong now that three
are, in a layer neither lane owned. None could have been found by either lane alone.

### R-33a — the curated packs never reached the browser *(fixed)*

Registration happens at module load of `packages/contracts/src/scenario-packs`. Every SERVER path
reaches it through the contracts barrel; **no client path did.** Measured on the production
bundle before the fix:

| identity | client chunks containing it |
|---|---|
| `SCN-FRESH-DAIRY-CHEDDAR-001` | 1 |
| `SCN-CHILLED-SALMON-002` | **0** |
| `SCN-BAKERY-SOURDOUGH-003` | **0** |

So `isScenarioRegistered('SCN-CHILLED-SALMON-002')` answered false in the browser and
`ScenarioContextStrip` fell through to the reference scenario after every switch.
`lib/scenario-client-registry.ts` is the browser counterpart to `lib/scenario-runtime.ts`;
registration stays declared in exactly one place. All three identities now reach the bundle.

### R-31 — the session opened on the reference scenario's plan *(fixed)*

`DEFAULT_SCENARIO_PARAMS` declared Fresh Dairy's committed terms. Measured before the fix, all
three scenarios opened identically at `20% / 14 days / national`, and **Restart restored those
values under a bakery decision**. Measured after:

| | promotion_lift | horizon | scope | method | cap |
|---|---|---|---|---|---|
| Fresh Dairy | 20 | 14 | national | `20_percent_off` | 10 |
| Chilled Salmon | 10 | 14 | national | `10_percent_off` | 2 |
| Premium Bakery | 10 | **7** | **regional** | `10_percent_off` | 6 |

Every field derives from the record. **Fresh Dairy's derived opening position is bit-identical to
the retired constant.** Restart reads the state's OWN `scenario_id`, and derived impacts are
recalculated with that scenario bound.

### R-32 — two registries answering "which scenario is active?" *(fixed)*

In service mode `POST` activates in the Next process while `GET` proxies the catalogue from
`cognix-world`, which has no activation endpoint. Measured: activate Premium Bakery → `200`, then
`GET` reported `SCN-FRESH-DAIRY-CHEDDAR-001`. The BFF now answers `active_scenario_id` itself.

### R-33b — the browser resolved a different scenario from the server *(fixed)*

Client-side engines resolve through `scenarioInScope()`, which reads the browser's registry.
`SCI-04` mirrored the server's activation only at selection time, inside a swallowing `catch`, so
a page load or refresh left the browser on the reference scenario. `syncActiveScenario` mirrors
the server's already-gated answer, applied synchronously in `DecisionStateProvider` before the
state that triggers the re-render. Confirmed on the running product: Promotion's region options
now follow the active scenario (North West first for Fresh Dairy, London first for Premium
Bakery).

---

## 5. The converged catalogue, and certification

Three scenarios, supplied through the canonical registry, none hard-coded in any UI.

| | `SCN-FRESH-DAIRY-CHEDDAR-001` | `SCN-CHILLED-SALMON-002` | `SCN-BAKERY-SOURDOUGH-003` |
|---|---|---|---|
| SKU / supplier | Cheddar Mature 400g / Cheshire Cheese Co | Atlantic Salmon Fillet 300g / Foodvest Fish | White Sourdough 800g / Allied Bakeries |
| family / archetype | `promotion_surge` / `ARCH-CHILLED-ELASTIC` | `supplier_breach` / `ARCH-SUPPLY-CONSTRAINED` | `fresh_perishable_waste` / `ARCH-PREMIUM-ARTISAN` |
| clock / horizon | 2026-06-03 / 14d | 2026-07-15 / 14d | 2026-09-09 / 7d |
| **certification** | **CERTIFIED** 12/12, 84 checks | **CERTIFIED** 12/12, 84 checks | **CERTIFIED** 12/12, 84 checks |

Re-run from the converged state through the same gate. **Zero `NOT_APPLICABLE` checks across all
three**, every result admissible under `validateCertificationResult`, and certification is
deterministic — two runs of the salmon pack are byte-identical. **No check was relaxed, removed or
made conditional to reach this.**

### The three decision shapes are genuinely different **in the domain**

Read from the engines, not from labels:

| | committed | derived recommendation | why |
|---|---|---|---|
| Fresh Dairy | 20% | **14%** (£32,976) | 20% returns −£5,167; margin binds |
| Chilled Salmon | 10% | **10%** (£4,432) | the committed depth already wins; **supply** binds — 22,956 of 118,917 units cannot be served |
| Premium Bakery | 10% | **0% — do not promote** | every plotted depth destroys contribution at 0.8pp/point against 10% supplier funding |

Bit-identical to the same probe run at `SCI-03`'s own head: convergence moved no derived economics.

---

## 6. The protected reference scenario

Read from the engines and confirmed on the running surface:

| depth | demand | contribution |
|---|---|---|
| 20% | **+44.16%** | **−£5,167** |
| 14% | **+33.65%** | **+£32,976** |

Demand presentation values unchanged: base 699,996 · expected 900,125 · servable 769,996 ·
exposed 130,129 · £269,369 revenue · £80,681 margin · Cheshire Cheese Co. The Promotion surface
publishes *"A 20% cut across the whole estate lifts demand 44.16% and adds −£5.2K of contribution.
The same curve returns £33.0K at 14%"*. **No hash-era value (46.8%, £8.1K, £43.5K) appears on any
surface** — the earlier `8.1K` sighting was the substring of `£38.1K more` and is not one.

---

## 7. Gate-B conditions, evaluated individually

| # | Condition | Verdict |
|---|---|---|
| 1 | Both lane branches committed and pushed | **PASS** — both SHAs verified, both single commits on the declared base |
| 2 | Independent packet tests green on each branch separately | **PASS** — `SCI-03` 96/96 and `SCI-04` 53/53 at their own heads; `SCI-04` additionally failed `tsc --noEmit` at its head, fixed here (§3.3) |
| 3 | Deliberate convergence against the declared base | **PASS** — branch cut at the base, each lane merged explicitly `--no-ff`, both conflicts resolved by stated semantics, not by taking a side |
| 4 | No unresolved contract drift | **PASS** — all five frozen contracts and the Wave-2 declaration byte-identical across base / `SCI-03` / `SCI-04` / converged; `run-gate-a-tests` 48/48 |
| 5 | Full relevant regression | **PASS** — 46 runners individually accounted, **45 fully green**, 3,303 assertions passed; `R-25` the only failure |
| 6 | Certification gate green for every registered scenario | **PASS** — three scenarios `CERTIFIED`, 12/12, 84 checks, zero `NOT_APPLICABLE`, gate not weakened |
| 7 | Protected journey reconciled | **PASS** — §6, to the digit |
| 8 | Browser acceptance at 1440 / 1024 / 720 | **PASS for the shell and the selector** — 279 checks, 0 failures at all three widths. **Docker NOT claimed.** See §9 |
| 9 | Next wave's contracts declared and frozen | **PASS** — the three `SCI-05` contracts remain declaration-only; ownership singular; enforced by `run-gate-a-tests` §§1–3 |
| 10 | Governance updated on evidence; convergence SHA recorded | **PARTIAL** — this record is the evidence. **No SHA-B is recorded, because Gate B did not pass** |
| — | **Cross-surface invariant: every surface reflects the active scenario** | **FAIL** — §8 |

**Nine pass. One fails. A gate that fails does not become a warning.**

---

## 8. Why Gate B is OPEN — the conflict, stated rather than resolved

`SCI-03`'s cross-surface invariant: *"Switching scenario changes economics, signals and
recommendations — not labels."* `SCI-04`'s: *"Every surface reflects the active scenario after
activation."* Measured on the converged product, after all four fixes in §4:

| surface | Fresh Dairy | Chilled Salmon | Premium Bakery | governed truth |
|---|---|---|---|---|
| **Demand** base | 699,996 | **699,996** | **349,998** | 94,080 / 26,040 |
| **Promotion** | 20% → +44.16% / −£5.2K, recommends **14%** | **identical** | **identical** | Salmon **10%**; Bakery **0%, do not promote** |
| **Campaign Decision** | Cheddar Mature 400g · National, 14 days | **identical** | **identical** | Salmon P048; Bakery P023 · London · 7 days |

The strip, the selector, certification, activation, decision state and reset all follow the active
scenario correctly. **The three decision surfaces do not.** On them, the three scenarios are
currently label variations — the precise thing both packets' invariants forbid.

### The root cause is an incompatible assumption, not a bug

1. **`components/PromotionPlanner.tsx:128` opens on the literal `'ARCH-CHILLED-ELASTIC'`** — a
   hard-coded scenario identity in a component, which `SCI-04`'s own definition of done forbids
   and which no source guard catches, because the guards look for `SCN-` literals and pack names.

2. **Pointing it at the active scenario's archetype would publish contradictory economics.**
   `SCI-03` deliberately bound the archetype catalogue to the reference instance — *"the
   REFERENCE framework's comparative library … priced here deliberately, so it does not silently
   change shape with whatever scenario is in scope"* — and the alternative entries carry **seeded**
   economics:

   | | archetype `ARCH-PREMIUM-ARTISAN` | certified `SCN-BAKERY-SOURDOUGH-003` |
   |---|---|---|
   | depth | 15% | committed 10% |
   | demand uplift | +12.0% | +10.75% at 14%, +7.68% at 10% |
   | contribution | −£1,850 | −£934 at 14%; best is **£0 at 0%** |
   | verdict | "MARGIN RISK" | **do not promote** |

   Two economic models for one scenario is the defect ADR-073 and ADR-080 exist to prevent.

3. **The Demand surface reads a single seeded history** (`data/sales_daily.json`), calibrated to
   the reference scenario's ~50,000 units/day. There is no salmon or bakery demand history, and
   inventing one is the fabrication ADR-079 forbids — the same judgement `SCI-03` made when it
   retired `temporal_evidence` rather than rescale a series it had not modelled.

**Neither lane owned this.** `SCI-03`'s non-scope: *"No selection UI."* `SCI-04`'s non-scope: *"No
scenario content"*, and its declared ownership was the context strip, the controls, the selector
and the shell mount point — not the decision surfaces. The content edge `SCI-03 → SCI-04`
converges at Gate B, and this is what converging it exposed.

Resolving it requires a governance decision that a merge is not entitled to make:

- **either** the archetype catalogue stops being a reference comparative library and every entry
  derives from its certified scenario — which rewrites `SCI-03`'s deliberate design and requires
  per-scenario demand history to be authored;
- **or** the decision surfaces stop rendering archetype content and read the certified scenario
  directly — a `SCI-04`-class change to surfaces `SCI-04` did not own;
- **or** the selector offers only the reference scenario until a packet owns this, which makes the
  laboratory proposition undemonstrable and defeats `SCI-04`.

This is a **convergence event under ADR-084 part 2**, raised here rather than decided silently.

---

## 9. Browser acceptance

**Docker is NOT claimed.** More was established than at Gate A: the daemon **does** start in this
environment (`Server Version: 29.3.1`), so the blocker is narrowed to egress alone — image blob
fetches are refused with **`403 Forbidden` from `production.cloudfront.docker.com`**, with and
without the agent proxy configured for the daemon (`/etc/docker/daemon.json`). Manifests resolve;
blobs do not.

**What was done instead — the strongest available path, and stronger than Gate A's.** The
**standalone production server** (`.next/standalone/server.js`, the exact artefact the image would
run) with **`COGNIX_WORLD_MODE=service`** against the **real `cognix-world` domain service** over
HTTP. This is the Docker topology without containers, and it exercises the proxy path Gate A could
only reach through the demo fallback. Driven in Chromium at **1440 / 1024 / 720**.

**279 checks, 0 failures.** Per scenario and per width: strip identity, supplier and horizon; no
stale identity or supplier after a switch; server active scenario; catalogue of three; all three
`CERTIFIED`; decision state scenario and its constraint naming the right supplier; navigation
reachable; strip identity on Demand, Promotion, Campaign Decision and Observability & Governance;
no horizontal overflow; no 5xx; no page errors. The full sequence **Fresh Dairy → Chilled Salmon →
Premium Bakery → Fresh Dairy** was driven through the real selector at every width.

**Restart, through the UI, on Premium Bakery:** keeps Premium Bakery active, keeps the decision
state on Premium Bakery, and restores **10% / 7 days / regional** — its own opening position, not
Fresh Dairy's. Verified at all three widths.

These checks cover what the selector and the shell publish. They did **not** assert the decision
surfaces' economics; §8 is what that assertion finds, and it was measured separately.

### Two limitations recorded rather than smoothed over

- **R-34 — the sidebar footer is unreachable below ~900px viewport height.** The sidebar is 896px
  tall with `overflow-y: visible` and never scrolls, so Currency, *Restart scenario*, *Observability
  & Governance* and *Exit Demo* fall below a 768px fold. Isolated as a **viewport-height** condition,
  not a breakpoint one: reachable at 1440×900, 1024×900 and 720×900; unreachable at 1024×768 and
  720×768. **Pre-existing, not caused by convergence** — with `SCI-04`'s added row removed from the
  DOM the sidebar is still 872px, already past a 768px fold.
- Google Fonts is TLS-blocked by this environment's proxy. An environment artefact; no product
  error, no 5xx, and the page renders with fallback typography.

---

## 10. R-30 and the frozen contracts

**R-30 — `temporal_evidence`.** Not served, not recreated, not synthesised. `SCI-04` was verified
not to depend on it: the only references at its head are an OPTIONAL field on a type in
`lib/world-client.ts` and the route line `SCI-03` was removing — **no component reads it**.
`scenarioTemporalEvidence()` stays exported and unchanged, so the evidence for the retirement
survives. **R-30 remains `SCI-05`'s.**

**No frozen-contract drift.** Blob hashes identical across base / `SCI-03` / `SCI-04` / converged:

| contract | hash |
|---|---|
| `canonical-scenario-model.ts` | `a56c56ab` |
| `scenario-clock.ts` | `8e68e22c` |
| `scenario-registry.ts` | `986cf15f` |
| `provenance-vocabulary.ts` | `74129f5b` |
| `scenario-certification-model.ts` | `e58e2cae` |
| `living-evidence-contracts.ts` (Wave-2 declaration) | `65e9b7f0` |

The three `SCI-05` contracts remain **declaration-only**: no function, no arrow implementation, no
return, no class, no exported value, and exactly one defining module each. Neither lane redefined
them, and nothing in this convergence implements any part of Wave 2.

---

## 11. Tests

**46 runners, each accounted for individually. 45 fully green. 3,303 assertions passed.**

`SCI-03` 96/96 · `SCI-04` 53/53 · Gate A 48/48 · `SCI-02` certification 54/54 · canonical 275/275 ·
decision state 7/7 · campaign intelligence 135/135 · CDI-04 49/49 · CDI-05 70/70 · signals 10/10 ·
FM-01 112/112 · DDF-01 57/57 · decision dimensions 173/173. `tsc --noEmit` clean; `next build`
compiles 74/74 routes.

### `R-25`, separated

`run-atl06b-tests`: **132 passed, 1 failed.** The single failure is `A6b`, which expects
`@google/genai` to be absent although the governed Google AI implementation legitimately uses it.
Unchanged from baseline and not touched here. **It is the only `[FAIL]` line in the entire estate** —
`grep -h "^\[FAIL\]"` across all 46 logs returns exactly that one line.

---

## 12. Residuals

| ID | What | Disposition |
|---|---|---|
| `R-25` | Stale `ATL-06B` `A6b`; two Google SDKs | Unchanged, untouched. Still the only failing assertion in the estate |
| `R-26` | CDI-03 scores derive from a name hash | Unchanged. Not in scope |
| `R-27` | Engines resolved against the reference scenario | **CLOSED by `SCI-03`.** Verified still closed |
| `R-28` | `cognix-world` does not install the certification gate | Open, and now better understood — see `R-32` |
| `R-29` | Stale `skuContextFactor` comment | Untouched. Not in scope |
| `R-30` | Family temporal series contradicts certified records | Open, `SCI-05`'s. Not recreated |
| **`R-31`** | Decision state opened on the reference scenario's plan; Restart restored it | **CLOSED by this convergence** |
| **`R-32`** | `cognix-world` never learns of activation; two registries disagreed | **Mitigated** — the BFF answers `active_scenario_id`. The underlying split remains, with `R-28` |
| **`R-33`** | The browser resolved a different scenario from the server | **CLOSED by this convergence** |
| **`R-34`** | Sidebar footer unreachable below ~900px viewport height | **OPEN.** Pre-existing, not convergence-caused. Unassigned |
| **`R-35`** | **Demand, Promotion and Campaign Decision publish the reference scenario's economics for every scenario** | **OPEN — this is what holds Gate B.** §8. Needs a governance decision, not a merge decision |
| — | Docker acceptance | Daemon starts; blob CDN refused by egress policy. Re-attempt when the registry is reachable |
| — | `services/world/dist/server.js` is a stale committed artefact serving the retired six-family world | Noted. The current build output is `dist/services/world/src/server.js`. Unassigned |

---

## 13. Gate B

**OPEN.** Nine conditions pass on evidence; the cross-surface invariant fails, and `R-35` is the
reason.

**No SHA-B is recorded.** A convergence SHA marks a passed gate, and recording one here would
assert a freeze point the evidence does not support.

**Wave 2 is NOT authorised.** `SCI-05` and `SCI-06` must not be cut from this state. What Wave 2
would build on is sound — the contracts are frozen and undrifted, the three scenarios are
certified, and the domain derives three genuinely different decisions — but ADR-084 part 4 does not
grade on a curve, and `SCI-06` in particular composes the Observability surface, which is one of
the surfaces `R-35` concerns.

**What is needed to close Gate B:** a decision on `R-35` §8, assignment of the packet that will
implement it, and re-evaluation of condition 8 and the cross-surface invariant against that
implementation. Nothing else in this record is outstanding.
