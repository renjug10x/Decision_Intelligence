# CogniX `ATL-04R` — Unified Capability Exploration Experience

**Work Package:** `ATL-04R` — Unified Capability Exploration Experience
**Status:** **[COMPLETED]**
**Date:** 2026-08-21
**Governed by:** [`COGNIX_CAPABILITY_ATLAS.md`](../governance/COGNIX_CAPABILITY_ATLAS.md) §0, §4, §5 · [`CAPABILITY_KNOWLEDGE_MODEL.md`](../governance/CAPABILITY_KNOWLEDGE_MODEL.md) · [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md)
**Governing decisions:** ADR-045, ADR-046, ADR-047, ADR-050, ADR-051, ADR-059 (consumed) · **ADR-060, ADR-061, ADR-062, ADR-063** (introduced)
**Branch:** `claude/cognix-capability-atlas-v2`

---

## 1. Why this work package exists

`ATL-04` successfully proved the backend-driven Atlas, the structured discovery model and the first
UI. Evaluation of the working interface showed that the information architecture was sound, but the
interaction architecture exposed too many controls, fragmented Capability Atlas, Portfolio and
Questions into separate experiences, and behaved more like a searchable catalogue than an innovation
exploration environment.

`ATL-04R` is a refinement of `ATL-04`. It does not reopen it: `ATL-04`'s acceptance criteria remain
met and its suite passes unchanged at 54/54. The Atlas backend, capability registry, knowledge
corpus, deterministic search, Questions Worth Asking model, Ask CogniX trust boundaries, grounding
architecture and AI governance are intact, with one exception — a genuine Level 1 defect this work
proved and fixed (§9).

---

## 2. Navigation

| Change | Before | After |
|---|---|---|
| `Explore` sidebar grouping | A heading over Capability Atlas, Portfolio, Questions | **Removed.** A heading over one item is a category, not navigation |
| Portfolio | Sidebar destination, and the app's landing page | **A view inside the Atlas.** `Portfolio` mode |
| Questions | Sidebar destination | **A view inside the Atlas.** `Questions` mode |
| Domain Context selector | Global header `<select>`, 22 domains | **Removed.** Domain chips inside the Atlas |
| Persona selector | Global header `<select>`, 19 personas | **Removed.** Four audience lenses inside the Atlas |
| About | Sidebar footer → 5-tab module, default tab the storyboard | **Retired as a destination.** Header control opening a metadata surface |
| Governance | Sidebar footer → six cards of settings | **Observability & Governance**, reorganised around user questions |
| Landing page | `InnovationPortfolio` | Capability Atlas |

`portfolio` and `curiosity` survive as switch aliases resolving to the Atlas, so a stale reference
lands somewhere real rather than falling through to an empty default.

**Deleted:** `components/Help.tsx` (522L), `components/Settings.tsx` (615L),
`components/InnovationPortfolio.tsx` (269L), `components/QuestionsWorthAsking.tsx` (175L). Every
governed record that cited them was updated in the same change, so no capability now points at code
that does not exist (rule V8 enforces this).

---

## 3. The unified Atlas

One surface, three modes, one governed estate.

```
What would you like to understand?
  [ Ask about a problem, capability, client scenario, architecture or idea… ]
  Try: <governed example questions>

  ─ clarification, when the question is genuinely open ─
  ─ exploration context ribbon, when anything is inferred or chosen ─

  Explore              Portfolio             Questions
  What can CogniX do?  What has it built?    What is worth asking?

  VIEW THROUGH THE LENS OF  [Innovation Executive] [Sales] [Architect] [Developer]
  IN  [Retail & Grocery 12] [Reusable beyond one domain]
  [ Filters ⌄ ]                      ← progressive disclosure
  [ Ask CogniX about these capabilities ]   ← closed by default

  ── the capability landscape: 7 governed areas ──
  ── capability results ──
```

**Explore and Ask CogniX remain distinct.** Explore finds and organises deterministically; Ask
CogniX explains and reasons under the `ATL-05`/`ATL-06` evidence rules and stays collapsed until
asked for. The reader is never told which retrieval level they are using; the boundary between *what
the registry contains* and *a reasoned answer with its evidence attached* is never blurred.

---

## 4. Persona lens without user identity

Four lenses, no identity (ADR-060). A user does not become a persona; they read one governed record
through a lens and can change it as often as they like.

| Lens | Prioritised |
|---|---|
| Innovation Executive | innovation thesis, business problems, cross-domain applicability, external evidence, validation evidence, limitations |
| Sales | use cases, demo scenarios, client questions, limitations, related capabilities |
| Architect | architecture narrative, architecture flow, APIs, contracts, data sources, governing decisions |
| Developer | implementation references, APIs, contracts, testing, test runners, limitations, open defects |

A lens **reorders**. `NEVER_SUPPRESSED` keeps name, summary, the three maturity dimensions and known
limitations present under every lens, and the surface says so: *"Ordering only — nothing is hidden,
and the facts do not change."* No capability knowledge is duplicated per persona.

The four-value `AudienceLens` vocabulary stays separate from the nineteen-entry product persona
catalogue, which remains available as an *Audience* filter. A persona is who a capability serves; a
lens is who is reading.

---

## 5. Domain as an exploration dimension

Domain chips inside the Atlas, built from `fetchDomains()` with live capability counts. Retail &
Grocery carries 12; the remaining 22 catalogued domains carry none and are reported honestly as
*"22 further domains are catalogued with no capabilities assessed yet."* No domain was invented, and
no `cross_domain_platform` pseudo-domain was created — platform capabilities carry `domains: []` and
express reach through `platform_reusable` plus their `cross_domain_applicability` assessment, which
the *Reusable beyond one domain* chip exposes directly.

---

## 6. Clarification — three real traces

Produced by `lib/atlas/clarification.ts`, deterministic, no provider.

### 6.1 Ambiguous

```
QUERY  What capabilities does CogniX have on Promotions?
state  multiple-interpretations
areas  Campaign & Promotion(44.1) · Exploring CogniX(22.5) · Demand & Forecasting(9.6)
ASK    "That question spans 3 capability areas. Which are you most interested in?"
       [Campaign & Promotion 6] [Exploring CogniX 5] [Demand & Forecasting 4] [Show me everything]
       + free text: "Something else…"

USER picks Campaign & Promotion
state  needs-clarification
ASK    "Which aspect of Campaign & Promotion are you most interested in?"
       [Planning and simulation] [Demand impact] [Campaign decisions] [Commercial outcomes]
       [Architecture and integration] [Show me everything]

USER picks Campaign decisions
state  clear · context: Campaign & Promotion[chosen] · Campaign decisions[chosen]
```

### 6.2 Clear — the question declares its own perspective

```
QUERY  Show me Promotion capabilities from an architect perspective.
state  clear                      ← no question asked
ctx    Architect lens [inferred]  ← visible, removable
areas  Campaign & Promotion(47.8) leading
```

The persona is **not** asked for, because the query already declared it (§14 of the work package
brief). The inference is shown as inferred, not applied silently.

### 6.3 Multi-area — several readings kept, not collapsed

```
QUERY  Promotions, demand, signals and inventory
state  multiple-interpretations
areas  Demand & Forecasting(63) · Signals & Intent(55.6) · Campaign & Promotion(39.3) · Evidence & Governance(11.4)
ASK    "That question spans 4 capability areas. Which are you most interested in?"  [multi-select]
       [Demand & Forecasting] [Signals & Intent] [Campaign & Promotion] [Evidence & Governance] [Show me everything]
```

The reader may select several, or decline to narrow. Nothing forces one category.

### 6.4 The other governed states

| Query | State | Behaviour |
|---|---|---|
| `What is CogniX?` | clear | Recognised as a platform question; not forced through area clarification |
| `How do I demo promotion intelligence to a client?` | clear | Sales lens inferred, demo intent read; no unnecessary question |
| `CAP-DECISION-GAP` | clear | A governed identifier has already said what it means |
| `zzzz quantum tokenomics` | insufficient-evidence | Stated as ungrounded, with alternatives offered — never guessed |

**What clarification cannot do.** A choice narrows only to capabilities the query already reached
(rule L5 plus the engine's own subset rule); it never manufactures a persona or a domain; it never
asks more than twice; and every inference is labelled and removable. Confidence is qualitative —
four states, no invented percentage.

---

## 7. The capability landscape

Seven governed areas in `content/atlas/capability-areas.ts`, which **partition** the registry: 38
capabilities, 38 memberships, every capability in exactly one area (rule L3, asserted).

| Area | Capabilities | Implemented | Reusable |
|---|---:|---:|---:|
| Demand & Forecasting | 4 | 3 | 1 |
| Campaign & Promotion | 6 | 5 | 2 |
| Signals & Intent | 4 | 4 | 4 |
| Decision Intelligence | 8 | 5 | 8 |
| Learning & Memory | 5 | 5 | 5 |
| Evidence & Governance | 6 | 4 | 4 |
| Exploring CogniX | 5 | 3 | 4 |

Areas are **declared, not derived**. Deriving them from `business_problems` was tried and rejected:
the ten `bp-*` values overlap heavily (`bp-decision-latency` and `bp-ai-trust` carry eight each and
share four) and two carry exactly one capability, so a derived landscape would open with two
singleton boxes and place `CAP-DECISION-REGRET` in three places at once.

**A query re-arranges the landscape; it does not replace it.** Relevant areas lead, carry the reason
they are relevant (*"6 capabilities matched here, led by Promotion Intelligence and Campaign Decision
Intelligence"*), and open to show what matched. Every other area stays present and closed. When more
than one area is relevant the surface says so: *"Your question spans 3 capability areas. They are
shown first below, each with what matched."*

Each area reports capability count, implemented count and reusable count as **three separate
figures**. They are never combined into a readiness score.

---

## 8. Questions and Portfolio, integrated

**Questions Worth Exploring** — the governed `CuriosityQuestion` model is untouched; the four records
and their `SOL-*`/`EXP-*` provenance survive. Selecting a question shows why CogniX is asking, its
evidence, the capabilities that answer it **each with the written rationale for the link**, the areas
it reaches, and its owner and review date. `summary_narrative`, `owner` and `reviewed_at` are now
rendered, having previously existed in the record and appeared nowhere. The surface reads through
`fetchQuestions()` rather than importing `content/atlas/curiosity-questions` into a client component,
which is stricter than the page it replaces.

**Portfolio View** — answers *what has CogniX built?* over all 38 capabilities rather than the 9 the
old surface showed (an understatement its own knowledge module recorded as a limitation). Estate
distribution by area, then **four separate distributions** — implementation, innovation lifecycle,
demonstration maturity, reach — because they are four independent dimensions (ADR-047). Every figure
is a count of governed records; nothing is modelled or projected. A closing section names the 9
capabilities that are not fully implemented, because a portfolio showing only finished work would
misrepresent the estate.

---

## 9. The Level 1 defect this work proved (ADR-062)

| Query | Before | After |
|---|---:|---:|
| `promotions` | **0** | 5 |
| `decisions` | **0** | 26 |
| `capabilities` | 1 | 24 |
| `signals` | 2 | 6 |

The corpus is written in the singular and `containsWord` anchors to word boundaries, so a plural
query matched nothing. This blocked the first acceptance scenario outright: *"What capabilities does
CogniX have on Promotions?"* was surfacing the wrong capability areas entirely.

Fixed by declared morphological normalisation that only ever **adds** a form, weighted at 0.9 and
attributed through `SearchMatch.via_form`. `cognix` became a stopword for the documented reason —
in a corpus where every record is a CogniX capability it discriminates nothing.

**This does not replace the governed vocabulary.** Three of eighteen business-phrased questions
remain absent from the unexpanded baseline, which is the lexical gap only ADR-059 closes. The
`ATL-06C` measurement moved on one axis: top-one from 6 of 18 to 7. `run-atl06c-tests.ts` G2 records
the new figure and why it moved, rather than the fix being made to fit the old one.

---

## 10. Visual explainability

Ten capabilities carry a governed `VisualSpec` (ADR-063). Four patterns shipped.

| Pattern | Capabilities |
|---|---|
| `gap` | **CAP-DECISION-GAP** (reference implementation) |
| `flow` | CAP-DECISION-CONTRACT · CAP-DECISION-WINDOW · CAP-DECISION-RIPPLE · CAP-OBSERVATION-CORRESPONDENCE · CAP-ENTERPRISE-SIGNAL · CAP-COMMITMENT-INTELLIGENCE |
| `comparison` | CAP-DECISION-REGRET · CAP-FORECAST-STABILITY |
| `convergence` | CAP-INTENT-FUSION |

**Two patterns were designed and deleted.** `half-life` was drafted for `CAP-DECISION-CONTRACT` and
refused by that capability's own record — *"Decision Half-Life publishes validity states and refuses
any duration, countdown, expiry estimate or decay curve"* (owner ruling W2). Drawing a decay curve
would have rendered exactly what the governance forbids, so the capability took a `flow` and the
pattern was removed rather than left available. `relationship` was deleted because nothing used it.

The schema **cannot express a number** — no value, no axis, no scale — and rule L7 rejects a quantity
smuggled into a label. Every spec carries a mandatory text equivalent, rendered as visible text with
the graphic `aria-hidden`.

---

## 11. About — content migration

Audited before removal. All 32 discrete items of `components/Help.tsx`.

| Existing About content | Keep? | New destination | Reason |
|---|---|---|---|
| 1–2. Shell heading and strapline ("Help & Platform Architecture") | No | — | Named the module, not the content; the module is gone |
| 3. Five-tab switcher | No | — | Structural; replaced by the Observability & Governance section nav |
| 4. **Tab 1 — Architecture Storyboard** (`<ArchitectureExplorer/>`, 12 slides) | **Yes** | Observability & Governance → **Architecture** | `SB-GATE` is not met, so it must not be retired. It is no longer the default tab of About |
| 5–6. Tab 2 heading + strapline (Decision Verification & Query Lifecycle) | No | — | Restated what the six stages already say |
| 7–12. Tab 2 — the six lifecycle stages | **Yes** | `cap-decision-lifecycle-view.ts` `architecture_flow`, rendered in the Atlas | The stages already exist verbatim in the governed record; the Atlas renders them from there |
| 7–12. Tab 2 — the technology chips (`Looker SDK`, `AppSheet Webhooks`, `gemini-1.5-flash / MCP`, `BigQuery`) | **No** | — | Describe a stack the estate does not implement. The knowledge module already records this as a high-severity limitation |
| 13. Hover "Deep Dive" affordance | No | — | Interaction of a surface that no longer exists |
| 14–18. **Tab 3 — Journey Telemetry** (LIVE: heading, refresh, empty state, event rows) | **Yes** | Observability & Governance → **Decision observability** | Live surface for `CAP-JOURNEY-TELEMETRY`; `ATL-01` §3.4 rules it survives storyboard retirement independently |
| 19–27. **Tab 4 — Shared Decision State Diagnostics** (LIVE: state id, version, session, tenant, scenario, parameters, derived impacts, version history, **Refresh State**, **Reset to Baseline**) | **Yes** | Observability & Governance → **Decision observability** | The only user-facing `refreshState()` and `resetScenario()` in the product, and the only view of decision-state provenance. Losing them would weaken demonstrable provenance |
| 28–32. **Tab 5 — Enterprise Signals** (LIVE: heading, refresh, empty state, signal rows with provenance, confidence, quality, synthetic flag) | **Yes** | Observability & Governance → **Data & signals** | Live surface for `CAP-ENTERPRISE-SIGNAL`; provenance and the synthetic flag are retained verbatim |
| Platform identity (product name, G10X identity) | **Yes** | **About header surface** | This is what "About" should always have meant |

### The old Governance page

| Existing Governance content | Keep? | New destination | Reason |
|---|---|---|---|
| Card A — anomaly detection thresholds | **Yes** | Observability & Governance → Platform governance | Binds to real application state that other surfaces read |
| Card B — AppSheet write-back, "**3 Connected**" badge, three named webhooks | **No** | — | Nothing is connected. A fabricated integration status |
| Card C — Looker host URL, API client id (`client_id_looker_prod_4021`), cost cap, cache invalidation | **No** | — | Read-only credentials for an instance the estate does not integrate with; the cost cap wrote to dead local state; `handleClearCache` was a 1500 ms timer |
| Card D — autopilot, confidence threshold, reasoning temperature | **Yes** | Observability & Governance → Platform governance | Bind to real application state |
| Card D — "Flash 1.5 / Pro 1.5" model tier selector | **No** | — | Wired to dead local state |
| Card E — RLS store/category scope sandbox | **Yes**, relabelled | Observability & Governance → Platform governance | Retained **with an explicit notice** that it simulates scoping and is not enforced authorisation, which `cap-governance-settings.ts` already required |
| Card E — blur overlay "Looker IAM Security Active" | **No** | — | `pointerEvents: 'none'`, not authorisation. Presenting it as security was the honesty defect |
| Card F — notification noise filtering | **Yes** | Observability & Governance → Platform governance | Binds to real application state |

Nothing removed above was knowledge. Each was an assertion of an operational reality that does not
exist, which is why removal is a correction rather than a loss.

---

## 12. About surface and platform metadata

A header control opening a restrained dialog (Escape closes, focus managed). Every field comes from
one governed source, `config/platform-metadata.ts`, resolved server-side and served at
`/api/v1/platform`.

```
CogniX
G10X · Enterprise Innovation Lab
VERSION 1.0.0 · BUILD not recorded · ENVIRONMENT production
RELEASE not recorded · LAST UPDATED 2026-08-21
CERTIFICATION
  No certification or compliance record is held for this platform. None is claimed.
```

`certifications` is an empty array. An audit across `app`, `components`, `config`, `lib` and
`content` found no certification record anywhere; the only compliance-flavoured strings in the estate
were the storyboard's unsupported *"100% Policy Enforced"* and *"Access Compliance"*, which `ATL-01`
had already marked Discard. `PLATFORM_VERSION` is asserted against `package.json` by the suite, so
the two cannot drift.

---

## 13. Observability & Governance

Renamed and reorganised around the questions a reader arrives with, not the screens the content used
to live on.

| Section | Question |
|---|---|
| Platform governance | How is CogniX governed? |
| Evidence & provenance | What evidence supports its intelligence? |
| Architecture | How is the platform architected? |
| Capability lifecycle | What is implemented, simulated or experimental? |
| Data & signals | What data and signals are being used? |
| Decision observability | What is observable right now? |

*Capability lifecycle* reports the estate's honest state including the landscape's own validation
result, and tabulates the 9 capabilities that are not fully implemented across all three dimensions.
*Architecture* hosts the retained storyboard behind an explicit notice.

---

## 14. Architectural Storyboard — `SB-GATE` state

**Retained. The gate is 3 of 6 and retirement remains blocked.**

| Gate | State | Basis |
|---|---|---|
| SB-GATE-1 — both versions audited slide by slide | **MET** (`ATL-01`) | Migration assessment §2, §3, §4 |
| SB-GATE-2 — every retained unit present at its destination | **NOT MET** | The two homeless units (§3.1 value framework, §3.2 hub-and-spoke reuse model) still exist nowhere. `ATL-04R` did not create a home for them |
| SB-GATE-3 — destinations reachable from the Atlas or governance | **MET** (`ATL-04R`) | Capability knowledge reachable through seven areas partitioning the registry; platform architecture reachable under Observability & Governance → Architecture |
| SB-GATE-4 — each major narrative has a named successor | **PARTIALLY MET**, unchanged | 11 of 12. Slides 6 and 7 remain orphaned |
| SB-GATE-5 — presenter notes preserved as Demo Path content | **NOT MET** | The 60 narrative prose units were not migrated. `ATL-04R` did not attempt this and does not claim it |
| SB-GATE-6 — retirement proposed in a WP naming the navigation successor | **MET** (`ATL-04R`) | This work package proposes eventual retirement and names the successor |

`AC-ATL-04-6` is honoured: `components/ArchitectureExplorer.tsx` is neither deleted nor disabled. It
moved out of the default tab of a module called "About" and into Observability & Governance, labelled
*Retained pending retirement* and stating that its figures are illustrative and unsupported by
measurement. That is a change of placement and honesty, not a retirement.

---

## 15. Testing

| Suite | Result |
|---|---|
| `run-atl04r-tests.ts` | **116 / 116** |
| `run-atl02-tests.ts` | 119 / 119 unchanged |
| `run-atl03-tests.ts` | 29 / 29 unchanged |
| `run-atl04-tests.ts` | 54 / 54 unchanged |
| `run-atl05-tests.ts` | 54 / 54 unchanged |
| `run-atl06a-tests.ts` | 115 / 115 unchanged |
| `run-atl06b-tests.ts` | 123 / 123 unchanged |
| `run-atl06c-tests.ts` | 121 / 121 (G2 baseline updated, §9) |
| `npx tsc --noEmit` | clean, exit 0 |
| `npm run build` | clean, exit 0, 70 routes |

**Full estate:** all 32 runners executed. 30 pass. The two that fail are `run-cdi07a-tests`
(154 passed / 1 failed) and `run-cdi07b-tests` (228 passed / 7 failed) — **identical to the recorded
baseline**. The cause was independently reconfirmed this session rather than assumed: both
`spawnSync` a child `node --import tsx …`, and that invocation fails with `ERR_MODULE_NOT_FOUND`
in this environment because `tsx` is not a declared dependency and resolves only through the npx
cache. No `ATL-04R` change touches either suite.

Two `ATL-02` assertions were retargeted rather than deleted: G1/G2 read the Atlas questions renderer
instead of the removed standalone page, and now assert the **stricter** property — the component
reads the registry through the Atlas API rather than importing the content module into a client
component.

---

## 16. Browser validation

Chromium, at 1440 × 900, 1024 × 768 and 720 × 900.

| Checked | Result |
|---|---|
| Atlas landing, 7 areas rendered | Pass at all three widths |
| Horizontal overflow | **None** at any width, on landing, search, detail, portfolio, questions, governance |
| Sidebar — Explore / Portfolio / Questions absent, Atlas and Observability & Governance present | Pass at all three widths |
| Global Domain and Persona selectors absent | Pass at all three widths |
| Ambiguous search → clarification with choices and free text | Pass |
| Clarification answered → context ribbon, landscape re-arranged | Pass |
| Multi-area explanation consistent with the question asked | Pass (see §17) |
| Persona lens switching, "Ordering only" notice | Pass |
| Capability detail, four comprehension questions, three maturity dimensions | Pass |
| Decision Gap visual and its text equivalent | Pass |
| Portfolio — four separate distributions | Pass |
| Questions — 4 questions, link rationale rendered | Pass |
| About header surface, certification absence stated | Pass |
| Observability & Governance, six sections | Pass |
| Storyboard reachable under Architecture with its notice | Pass |
| Console / page errors | One, pre-existing and environmental: the Google Fonts `@import` at `globals.css:1` returns `ERR_CONNECTION_RESET` because this sandbox has no route to `fonts.googleapis.com`. Unrelated to `ATL-04R` |

---

## 17. One defect found by browser validation and fixed

The clarification asked about **3** capability areas while the landscape announced **6**. Both
numbers were arithmetically correct — the question used the floor-filtered set, the landscape used
the raw one — and the pair was incoherent: a reader cannot be told their question spans six areas by
a screen that has just asked them to choose between three.

The relevance floor is now applied once, before the result leaves the engine, so every consumer
counts the same areas. Dominance is still measured over the **full** spread, because how open a
question really is includes the areas it only brushed; discarding those first would make every query
look more focused than it is and would suppress clarifications worth asking.

---

## 18. Scope discipline

**`ATL-06D` was not started.** No client conversation pack, no meeting preparation, no client-specific
research, no client persona generation, no sales briefing packs. The existing `ATL-06D` entry point in
the capability detail is unchanged and still reads *"Planned for ATL-06D; not yet available, and
deliberately not simulated here."* No placeholder was added that appears operational.

**`ATL-06C` remains `[COMPLETED — LIVE VALIDATION PENDING]`.** `AC-ATL-06C-9` is open because no
server-side Gemini credential exists in this environment. No provider validation was weakened, and no
grounding, provenance, rejection-ledger or external-research opt-in behaviour was changed. `ATL-06D`
still requires that gate closed before execution.

**Governance not touched:** no unrelated work-package state was altered. The root `MASTER_PLAN.md` ATL
lines were corrected because they were factually stale for this workstream (they recorded
`ATL-02 … ATL-07` as `[NOT STARTED]` after `ATL-06C` had shipped).

---

## 19. Residual gaps

1. **`SB-GATE-2` and `SB-GATE-5` remain open.** The two homeless knowledge units and the 60 storyboard
   narrative units still need destinations. Closing them is the remaining work before the storyboard
   can be retired.
2. **`SB-GATE-4` remains partial.** Slides 6 and 7 have no successor because the capabilities behind
   them are orphaned in the `ATL-01` inventory. That is a capability-registration question, not a UI one.
3. **`docs/product/INTERNAL_DEMO_RUNBOOK.md` is now inaccurate.** Three of its five segments script the
   removed Portfolio and Questions pages. It is marked *Approved & Authoritative* and was deliberately
   not rewritten here, because doing so silently would change an approved demo script without review.
4. **The `ATL-06C` G2 baseline moved** from 6 to 7 top-one, recorded in the test and in §9.
5. **Areas will need review as the registry grows.** Rule L3 fails the suite the moment the landscape
   stops being a partition, which is the intended failure mode.
