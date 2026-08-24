# COGNIX ATL-04 — ATLAS UX & STRUCTURED SEARCH — IMPLEMENTATION REPORT

**Work Package:** `ATL-04` — Atlas UX & Structured Search
**Status:** COMPLETED 2026-08-20
**Baseline:** Atlas workstream branch, descended from `origin/Feature/MatchingContract-AutoActivate` @ `5dfba74`
**Governed by:** [`COGNIX_CAPABILITY_ATLAS.md`](../governance/COGNIX_CAPABILITY_ATLAS.md) · [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §7 · ADR-046 · ADR-047 · ADR-050 · ADR-051

---

## 1. What was built

| Layer | Artefact | Purpose |
|-------|----------|---------|
| Search index | `lib/atlas/capability-index.ts` | Deterministic index over identity **and** governed knowledge text |
| Query understanding | `lib/atlas/query-understanding.ts` | Stopwords, phrase extraction, whole-identifier extraction, declared filter/lens lexicon |
| Scoring | `lib/atlas/capability-search.ts` | Rewritten: phrase and identifier weighting, published field weights |
| API client | `lib/atlas-client.ts` | The only path by which the UI obtains capability content |
| UI | `components/atlas/` — `CapabilityAtlas`, `CapabilityDetail`, `CapabilityCard`, `MaturityTriad` | Search-first landing, progressive-disclosure detail, four lenses |
| Styles | `app/globals.css` — `CAPABILITY ATLAS (ATL-04)` block | Light executive surface, two responsive breakpoints |
| Shell | `components/Sidebar.tsx`, `app/page.tsx` | Atlas as the first Explore entry |
| Tests | `tests/unit/run-atl04-tests.ts` | 54 assertions |

---

## 2. Search: the real work of this phase

The instruction was to test with real questions rather than keywords. Doing so immediately falsified
the ATL-02 search, which had passed its own suite because eight seeded capabilities were too few to
collide.

**Before — the seven acceptance questions against the ATL-02 scorer:**

| Question | Result |
|----------|--------|
| `why did the decision change` | **36 of 38** capabilities returned. `why`, `did`, `the` matched everything |
| `how do I test Decision Gap` | **Decision *Window* ranked above Decision *Gap*.** `do`, `I` were tokens; the phrase carried no weight |
| `capabilities for an architect` | **All 38** returned; the top result was unrelated to architecture |
| `what can I reuse outside retail` | 26 results, no recognition that this is a reuse question |

Three mechanical causes, each fixed deterministically — no model, no embedding, no network call:

1. **Function words matched everything.** A declared stopword list removes them.
2. **Multi-word names lost to single-word noise.** Adjacent content words form phrases, weighted ×4.
   `"decision gap"` now outweighs the shared word `decision`.
3. **Knowledge text was not indexed.** ADR-050 requires Level 1 to cover description, thesis, use
   cases, architecture and technology terms. The index now flattens all of them into weighted field
   groups, so `how do I test X` has testing instructions to match against.

A fourth addition: some questions are really filters. `reuse outside retail` is asking for
platform-reusable capabilities; `for an architect` is asking for a lens. These are handled by a
**declared lexicon** — every mapping is written down and auditable — and surfaced as a **dismissible
hint chip that names the phrase that triggered it**, never applied silently. That distinction matters:
the searcher is told what the system inferred and can reject it.

**After:**

| Question | Result |
|----------|--------|
| `forecast uncertainty` | Demand & Forecast, then Forecast Stability |
| `why did the decision change` | 30 of 38, led by Shared Decision State, Decision Contract, Campaign Decision |
| `promotion risk` | Promotion Intelligence, decisively (50 vs 9) |
| `external signals` | External Signal Connector first |
| `what can I reuse outside retail` | Offers **“Apply: Reusable across domains”** |
| `how do I test Decision Gap` | **Decision Gap first at 125 vs 51** — 2.4× the runner-up |
| `capabilities for an architect` | 38 → 14 results, offers **“Apply: Architect lens”** |

**One question remains broad and honestly so.** `why did the decision change` still returns 30 of 38,
because *decision* is the estate's dominant noun — twelve capability names contain it. The top results
are defensible, but no deterministic ranking can fully disambiguate that question. Narrowing it is a
Level 2 semantic problem and belongs to `ATL-05`. It is recorded here rather than tuned away.

---

## 3. Owner constraints

| # | Constraint | How it was met |
|---|-----------|----------------|
| 1 | Do not split `CDI-07A`/`CDI-07B` | Untouched. Still one record each; candidates remain recorded in the ATL-03 report |
| 2 | Bind Questions Worth Asking by relationship, not by copying | **Not bound in ATL-04** — see §6. No question text was copied into any knowledge module |
| 3 | Preserve null lifecycle honestly | `MaturityTriad` renders *“Lifecycle — not owned”* with a tooltip explaining no experiment owns it. Nothing inferred. Asserted by `run-atl04-tests` E2, H2 |
| 4 | No external market evidence | None added. `external_evidence` remains empty corpus-wide |
| 5 | Consume the ATL backend; no JSX literals | Asserted by G2–G5: no component imports the registry or a knowledge module, and no knowledge field is assigned a literal |
| 6 | Search primary, not a toolbar control | Asserted by K1: the search bar renders above both filters and results |
| 7 | Four lenses that reorder, not duplicate | `LENS_PRIORITY` reorders sections; the UI states *“every section below is available under any lens”* |
| 8 | Four questions answered quickly | A four-up panel above all disclosure. Asserted by H4 |
| 9 | Executive-grade, curiosity-led | Rows not cards-in-a-grid; one section open by default; two disclosure levels; no nested accordions |
| 10 | Never collapse the three dimensions | `MaturityTriad` renders LIFECYCLE / DEMO / BUILD as three labelled chips. Asserted by H1 |
| 11 | Distinguish implemented/partial/simulated without a status board | A small dot — solid, half, dashed — plus the **word**. Never colour alone |
| 12 | Relationships visually meaningful and navigable | Related capabilities are clickable pills carrying the relation verb; origins render as *“delivered by DDF-01”*, *“demonstrated by …”* |
| 13 | Preserve the governed filters | Domain, Business problem, Audience, Capability type, Demo readiness, Platform reusable — all six present |
| 14 | No semantic search, Ask CogniX, provider or grounding | Asserted by I1 over comment-stripped source |
| 15 | Do not retire the Storyboard | Untouched — see §5 |
| 16 | Do not repair orphans to make them appear | No orphaned component was touched |
| 17 | Make capability truth visible | A capability can read *Demo: Production Ready* beside *Build: Partly built*, which is exactly the ADR-047 combination |
| 18 | Validate at desktop and reduced widths | §4 |
| 19 | Client-conversation prep as future only | A single dashed note: *“Planned for ATL-06; not yet available, and deliberately not simulated here.”* Asserted by I2 |
| 20 | 38-capability corpus is the rendering input | No capability was introduced. The landing renders exactly 38 |

---

## 4. Responsive validation

Rendered in Chromium against a production build at three widths, exercising landing → search → detail:

| Width | Cards | Top result for *how do I test Decision Gap* | Four-up columns | Maturity dimensions | Horizontal overflow |
|-------|-------|--------------------------------------------|-----------------|---------------------|---------------------|
| 1440 desktop | 38 | Decision Gap Intelligence | 4 | 3 | none |
| 1024 laptop | 38 | Decision Gap Intelligence | 2 | 3 | none |
| 720 tablet | 38 | Decision Gap Intelligence | 1 | 3 | none |

All three maturity dimensions survive to the narrowest width — the collapse rule is not a desktop-only
courtesy. One console error appears at every width: a blocked `fonts.googleapis.com` request. It
originates from line 1 of `app/globals.css`, predates this work package, and is an artefact of the
sandbox having no outbound network.

Live rendering used a transient Playwright install which was **reverted**; `package.json` and
`package-lock.json` are unchanged. The durable check is declarative: `run-atl04-tests` J1–J5 assert the
breakpoints, the 4→2→1 grid, the width bound and visible keyboard focus.

---

## 5. SB-GATE — no gate advanced

ADR-051 permits advancing gates only with evidence. `ATL-04` delivered the successor surface, which is
a **precondition** for retirement but satisfies no gate item on its own:

| Gate | State | Why |
|------|-------|-----|
| SB-GATE-1 … 5 | **Open** | Require the ATL-01 migration assessment's retain/discard decisions to be executed — each unit of storyboard knowledge verifiably present at its destination. `ATL-04` moved no storyboard content |
| SB-GATE-6 | **Open** | Requires a work package proposing retirement and naming the navigation successor. The Atlas now exists as a candidate successor, but no retirement is proposed here |

`components/ArchitectureExplorer.tsx` and `components/Help.tsx` are untouched. The storyboard remains
reachable and is registered in the Atlas as `CAP-ARCHITECTURE-STORYBOARD` with its retirement-candidate
status and static-content limitations visible — the Atlas describes it honestly rather than hiding it.

---

## 6. One constraint deliberately not implemented

**Constraint 2 — binding Questions Worth Asking to capabilities — was not done, and the reason is that
doing it correctly is not an ATL-04 task.**

The four `CuriosityQuestion` records target `EXP-*` and `SOL-*` identifiers, not `CAP-*`. Binding them
by relationship requires either a resolution rule from those identifiers to capabilities (several
capabilities may share one solution, so the mapping is ambiguous) or capability-scoped question
authoring — which is content population, i.e. `ATL-03` work reopened.

Both options were available. Neither could be done without either inventing a mapping the governance
does not define, or copying question text into knowledge modules — which the same constraint forbids.
`questions_worth_asking` therefore remains empty on all 38 records and the Atlas does not render a
Questions section. The existing Questions Worth Asking surface is unchanged and still reachable.

**Recommended resolution for the owner:** define the `EXP-*`/`SOL-*` → `CAP-*` question-resolution rule
as a small governance decision, then bind in a follow-up. Estimated as a contained task once the rule
exists.

---

## 7. Validation

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 diagnostics** |
| `run-atl04-tests.ts` | **54 passed, 0 failed** |
| `run-atl03-tests.ts` | **29 passed, 0 failed** |
| `run-atl02-tests.ts` | **119 passed, 0 failed** |
| Full regression (27 runners) | **25 exit-0**; `run-cdi07a` and `run-cdi07b` reproduce baseline counts exactly (154/1, 228/7) |
| `npm run build` | **Compiled successfully** |
| Live render, 3 widths | No horizontal overflow; correct ranking at every width |
| `git diff --check` | clean |

---

## 8. Handoff to ATL-05

**The surface is live and consumes the backend.** Level 1 search, four lenses, six filters, progressive
disclosure and navigable relationships all work with no AI configured — which is what ADR-050 requires
before Level 2 may be added.

**Open items:**

1. **Questions Worth Asking binding** (§6) — needs a governance decision on identifier resolution.
2. **`why did the decision change` remains broad** (§2) — a Level 2 semantic problem, not a Level 1 one.
   It is the clearest single argument for `ATL-05`.
3. **Hint lexicon is small and declared.** Four filter families and four lens families. It will need
   extending as real usage arrives; each addition should stay declared rather than becoming inference.
4. **SB-GATE remains 0 of 6 advanced** (§5).
5. **The Google Fonts console error** is pre-existing and environmental, not an Atlas defect.
