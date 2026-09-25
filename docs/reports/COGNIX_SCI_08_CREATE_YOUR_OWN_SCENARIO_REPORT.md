# `SCI-08` — Create Your Own Scenario Experience

**Governs:** ADR-085 (one scenario authority), ADR-083 (GenAI proposes, never decides), ADR-080,
ADR-077 part 4, ADR-084. **Depends on:** `SCI-07` (the authoring domain) and `SCI-07R` (the scenario
authority it runs through).
**Branch:** `feature/cognix-sci-08-create-your-own` — the name this packet's record gives — cut from
`SCI-07R` `2362fa4026ff4d8094a3c097086add69c2a35e25`, as `SCI-07R` directed.

**Scope note, stated rather than assumed.** The packet record places `SCI-08` in Wave 4 beside
`SCI-10`. It was executed **alone, sequentially, on the owner's instruction**, with Wave 4 **not cut**:
`SCI-10` is not started, no Wave-4 convergence branch exists and no Wave-4 gate has run. ADR-084 part 3
already treats a single-lane step as a correct outcome where the dependency graph allows it.

---

## 1. Baseline and branch normalisation

| Fact | Verdict |
|---|---|
| `SCI-07R` final SHA `2362fa40` | present; descends from Wave-3 governance head `331b3ed1` |
| `origin/main` | at `dea39ba` — contains **no** `SCI-07R` commit |
| `feature/cognix-sci-07r-scenario-registry-authority` | **published at exactly `2362fa40`**; local = remote |
| `Feature/cognix-sci-09-architecture-surface` | `77cfe535` — authoritative, untouched |
| `feature/cognix-sci-09-architecture-surface` | `caec4ea0` — **conclusively stale**: zero unique commits, an ancestor of the authoritative branch and of the Wave-3 convergence history. Deletion was attempted; **this environment refuses remote branch deletion**, so it remains. Owner command: `git push origin --delete feature/cognix-sci-09-architecture-surface` (`R-SCI09-2`) |
| `SCI-08` / `SCI-10` before this packet | not started |

## 2. Reconciliation before implementation

| | |
|---|---|
| **Purpose** | The experience over the `SCI-07` domain: a person constructs a scenario and runs it. The missing capability was the experience itself — the domain, routes and authority existed and nothing rendered them |
| **Reuses** | `SCI-07` routes (options, drafts, update, assist, confirm, export/import) · `SCI-07R` activation, registry projection and tenant scoping · `SCI-04` selector · the authoritative decision route · the estate's currency formatter · `DecisionStateContext` |
| **In scope** | One dialog, opened from the scenario selector: Create → Review → Confirm → Run → Understand; export/import; business-language readiness and provenance; AI suggestions as marked, editable proposals |
| **Non-goals** | No separate wizard product area, no contract change, no CSV (`SCI-10`), no persistence, no new registry, engine or calculation, no visual redesign |
| **Authority** | BFF runtime: register, certify, activate, catalogue. `cognix-world`: stateless signal computation. Browser: read projection. GenAI: proposals only |
| **Conflict with ADR-085?** | **None.** The packet's "activation into the normal journey" is exactly the `SCI-07R` path |

## 3. What was built

| Change | File |
|---|---|
| Browser transport to the governed routes — no state, no logic, no credential | `lib/scenario-authoring-client.ts` (new) |
| The experience | `components/scenario-authoring/ScenarioAuthoringStudio.tsx` (new) |
| Entry point: **Create your own** in the scenario selector | `ScenarioSelectorModal.tsx`, `ScenarioContextStrip.tsx` |
| Selector rendered through a portal — no longer constrained by the navigation drawer at 720 | `ScenarioSelectorModal.tsx` |
| Architecture scenario card: rules its meta row, select row and select never had | `app/globals.css` |
| Promotion planner offers the active scenario's own product | `components/PromotionPlanner.tsx` |
| Experience styles | `app/globals.css` (`sci08-*`) |
| `SCI-07` guard `I2a` restated for the consumer it was reserving the domain for | `run-sci07-scenario-authoring-tests.ts` |

### The journey

1. **Create** — choose the decision you face (the three governed situations, with the ones CogniX does
   not model listed and explained) and the product; or open a saved scenario file.
2. **Review** — the situation's postures as editable business choices; optional *your own figures*
   (empty means a declared assumption, shown as *modelled*); an optional *describe it* box whose AI
   suggestions appear as **proposals marked "Suggested by AI"**, applied only when the author chooses
   *Use* and then marked **"AI-proposed, kept by you"**. Readiness per capability, issues and the
   provenance sentence are the **server's**. *Save a copy* exports the inputs.
3. **Confirm** — a named person and an explicit acknowledgement that CogniX, not AI, calculates every
   figure. The server certifies; a refusal is shown with its reasons in business language, without
   dimension codes, ids or the gate's cascade line. A review that went stale is refused.
4. **Run** — *the curated selection path*: gated activation, the certified-record projection, the
   mirror, the decision-state refresh.
5. **Understand** — the **authoritative evaluator's** expected and servable demand, Decision Gap,
   revenue and margin at risk, recommended against committed depth, and Decision Window, formatted
   through the estate's currency formatter.

## 4. Authority integrity

- **No registry, engine or calculation was added.** The experience registers, activates, certifies and
  resolves nothing (`run-sci08` C1), performs no arithmetic on the evaluator's figures (C3) and routes
  money through the governed formatter (C4).
- **Understand equals the evaluator, figure for figure** — in-process (A8) and in the browser at every
  width.
- **GenAI stays advisory.** Suggestions are proposals the author keeps or ignores (C8); the server
  refuses any quantity; confirmation needs a named person; the model can neither confirm, certify nor
  activate. With no provider the manual path is complete (A2, A5, and the browser run).
- **No credential reaches a browser.** No key field, credential name or `NEXT_PUBLIC_*` in the
  experience (C5); the built client bundles contain no key-shaped value and no reference to
  `process.env.GEMINI*`.
- **Frozen contracts: byte-identical to SHA-D** — the six Gate-D contracts and Scenario Draft (D1).
  No `data/`, `packages/` or `config/` file changed.

## 5. Cross-surface scenario truth (browser, production build, every width)

After running an authored scenario, the harness recorded **every scenario-scoped request** the
surfaces made while visiting Demand & Forecast, Promotion, Campaign Decision and Architecture, and
every response:

**selected scenario = server active scenario = browser projection = evaluator scenario = signal
scenario = rendered context** — every request named the authored id and every response served it;
signals came from `cognix-world` for that id; the context strip named its product; the Architecture
switcher held it by name; the Architecture and Understand published the evaluator's exposed gap; no
surface carried a Fresh Dairy figure (900,125 / 130,125 / 770,000) or, on Demand, Campaign Decision and
Architecture, its product. Switching back to Chilled Salmon and Fresh Dairy restored them; the
Architecture then published Fresh Dairy's 130,125 and nothing of the authored scenario.

**One defect found and repaired here.** The Promotion planner's product select listed only the seven
archetype products. For an authored scenario whose product is not among them, the planner computed on
the authored product while the select **displayed Cheddar**. The active scenario's product is now always
offered, and the harness asserts the selected product.

## 6. Tests and build

**New:** `run-sci08-scenario-experience-tests.ts` — **31 / 31**: the experience's transport driven
against the real route handlers (create → review → confirm → run → understand; a stale review refused;
a gate refusal with nothing moved; only governed routes called) and the authority guards in §4.
`run-sci07-scenario-authoring-tests` **132 / 132** (131 + 1: `I2a` restated as `I2a`/`I2b` — the domain
is reached only through the governed routes, and only by `SCI-08`'s components).

**Full governed estate — 57 runners, each accounted.** 56 fully green; **4,291 passed, 1 failed** —
`run-atl06b-tests` `A6b`, **`R-25`**, **132 / 1, unchanged**. `SCI-07R`'s 4,259 + 31 + 1 = 4,291: no
existing count moved. Summary-format runners on their own banners: campaign-intelligence 135/135,
decision-dimensions 173/173, campaign-decision-journey 96/96, bugfix-integrity 4/4, wp10d 15/15,
decision-state, journey, cdi07b-smoke — all pass. Named: canonical 275, sci02 54, sci03 96, sci03r 130,
sci04 60, sci05 200, sci06 182, sci07r 63, sci09 234, sci09-economic-reconciliation 122, wave2 58.

`npx tsc --noEmit` **clean**. `npm run build` **clean** — 82 / 82 pages.

## 7. Browser acceptance — **102 / 102** at 1440 / 1024 / 720

**Topology:** the `output: 'standalone'` production build (with `NEXT_PUBLIC_COGNIX_DEMO_MODE=true`, the
demonstration configuration), `cognix-world` on 8081 and `cognix-learning` on 8082, native processes,
`COGNIX_WORLD_MODE=service`, `GEMINI_API_KEY` absent. **Docker NOT used.** Harness:
`scripts/sci08-browser-acceptance.cjs`. At 1024 and 720 the navigation drawer is opened as a person
would open it.

| At every width | Result |
|---|---|
| the selector uses the viewport, not the drawer | PASS |
| Create → Review with no provider: the manual path offered and labelled | PASS |
| readiness per capability from the server; no internal id or system term in review | PASS |
| no horizontal page scroll with the studio open | PASS |
| Confirm → certified, in the catalogue, **not running yet**; reported by name, not id | PASS |
| Run → Understand renders the evaluator's figures exactly (units, money, depth, window) | PASS |
| server active = authored; context strip names its product (projection) | PASS |
| every scenario-scoped request and response across Demand, Promotion, Campaign Decision, Architecture = authored id | PASS |
| signals for it generated by `cognix-world` | PASS |
| Promotion planner's selected product = the authored product | PASS |
| Architecture on it by name, publishing the evaluator's exposed gap; **no horizontal scroll with a long name** | PASS |
| no Fresh Dairy figure on any surface; no GenAI authority claim | PASS |
| invalid scenario refused with reasons, no id or code, catalogue and running scenario unchanged | PASS |
| Chilled Salmon and Fresh Dairy selectable afterwards; Architecture back on 130,125 | PASS |
| zero application console errors, zero projection disagreements, zero React key warnings, no `5xx`; the only 4xx logged is the one deliberate refusal | PASS |

Reported, not asserted away: one console line per width is the sandbox proxy refusing
`fonts.googleapis.com` — environmental.

**`R-SCI07R-6` — CLOSED.** The Architecture select overflow at 1440 (106px on the base) is gone, with a
longer authored name than before; the selector at 720 now uses the viewport.

## 8. Restart behaviour — non-durable by design, not persistence

Production topology, with an authored scenario **active** before each restart:

| Restart | Result |
|---|---|
| `cognix-world` only (pid 2741 → 3453) | **4 / 4** — still listed, decision evaluates, signals from world, still the active scenario |
| BFF only (pid 2745 → 4171) | **3 / 3** — gone; catalogue = the three curated; Fresh Dairy active; record and activation refuse it |
| browser opened after the BFF restart | opens on Fresh Dairy, no console errors — **no stale authored state survives** |

Unchanged from ADR-085 part 5 (`R-SCI07R-1`). `SCI-08` did not need durability: the experience offers
*Save a copy* and *Open a saved scenario*, which re-certify from inputs. A re-opened file is a new
scenario identity.

**Tenant isolation** re-run on this build: `scripts/sci07r-service-acceptance.mjs lifecycle` **29 / 29** —
another tenant cannot see, fetch, activate or execute an authored scenario. The experience itself runs
in the lab's declared tenant, as the selector does.

## 9. Live Gemini

**LIVE PROVIDER ACCEPTANCE: NOT VERIFIED.** `GEMINI_API_KEY` is not present in this environment. No
round trip was attempted and none is simulated. `R-SCI07-1` stays **OPEN**. Manual acceptance above is
unaffected; the **AI-assisted demonstration path remains uncertified**, and the suggestion UI
(*Suggested by AI* → *Use* → *AI-proposed, kept by you*) is asserted structurally, not exercised against
a live provider.

## 10. Residuals

| Id | Disposition |
|---|---|
| `R-SCI07R-6` | **CLOSED** — §7 |
| `R-SCI09-2` | **OPEN — owner action**; conclusively stale, deletion refused by this environment (§1) |
| `R-SCI07-1` | **OPEN** — §9 |
| `R-SCI07R-1` | **RETAINED** — non-durable authored state; single BFF instance (§8) |
| `R-SCI07R-2` | **RETAINED** — activation estate-wide; tenant self-declared |
| `R-SCI07R-3` | **RETAINED** — `cognix-world` cannot verify a posted record |
| `R-SCI07R-4` | **RETAINED** — the Architecture switcher lists the browser projection, so an authored scenario that has been confirmed but not run is not in it until it runs |
| `R-SCI07R-5` | **RETAINED** — authored registrations unbounded per process |
| `R-25` | **RETAINED — unchanged** (`A6b` 132 / 1) |
| **`R-SCI08-1`** NEW | On Promotion, an authored scenario is shown under its archetype's taxonomy name (a chicken supplier-risk scenario highlights *Supplier-Constrained Chilled Fish*). Label only — every number is the scenario's. Owner: the archetype catalogue |
| **`R-SCI08-2`** NEW | A figure once stated cannot be returned to CogniX's assumption from the experience: the draft update merges, so emptying the box restores the stated value on update (visibly, not silently). Needs a domain "unset" — `SCI-07`'s, not a UI workaround |
| **`R-SCI08-3`** NEW | The AI-suggestion flow is unexercised against a live provider (depends on `R-SCI07-1`) |

## 11. Gates

**`SCI-08` convergence gate: PASSED** — journey through the real UI; authority boundaries intact;
contracts byte-identical; cross-surface truth by id and by figure; full estate with `R-25` only; tsc
and build clean; browser 102/102 at three widths on the three-process production topology; restart
behaviour as governed.

**Wave-4 entry: BLOCKED** — `SCI-10` remains deferred by governance and its **Attested Upload contract is
not declared** (Gate-D freeze table). Wave 4 cannot be entered until the owner un-defers `SCI-10` and
that contract is declared. **Wave 4 was not started.**
