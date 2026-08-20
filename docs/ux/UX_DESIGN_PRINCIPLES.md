# COGNIX UX & VISUAL DESIGN PRINCIPLES

**Document Status:** Approved & Authoritative
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Experience & Design Systems Group

---

## 1. Visual Identity & Aesthetic Vision

CogniX reflects **G10X's visual identity**: sleek, premium, spacious, intellectual, and enterprise-ready. It communicates innovation through composition, typography, whitespace, and intelligent storytelling rather than visual gimmicks.

### What CogniX FEELS Like:
- **Intelligent & Calm:** Crisp typography, generous whitespace, balanced visual rhythm.
- **Spacious & Executive:** Clean light/neutral background primary palette with subtle dark elevation accents.
- **Curious & Exploratory:** Prominent curiosity prompts, evidence drawers, interactive scenario controls.
- **Credible & Authoritative:** High data density when inspecting evidence, zero placeholder metrics.

### What CogniX NEVER Looks Like:
- ❌ NOT a dark-mode cybersecurity matrix or neon AI demo
- ❌ NOT a generic admin template full of repetitive cards
- ❌ NOT a cluttered BI dashboard with 20 competing charts
- ❌ NOT branded for any single customer (e.g. Lidl retail identity completely removed)

---

### 1.1 Brand Wordmark & Visual Identity
CogniX is branded cleanly through typography rather than heavy decorative icons or waveforms:
- **C** = G10X Orange (`#FF6B00`)
- **ogni** = Near-Black Charcoal (`#0F172A`)
- **X** = G10X Red (`#E11D48`)
- **Secondary Descriptor:** `G10X INNOVATION STUDIO` (10px, weight 500, uppercase).

### 1.2 G10X Semantic Color Model
Color in CogniX is strictly semantic and functional:
- **Canvas & Surfaces:** White (`#FFFFFF`) / Light neutral (`#F8FAFC`).
- **Navigation (Sidebar & Top Bar):** Light neutral surfaces (`#F8FAFC` / `#FFFFFF` with `#E2E8F0` border).
- **Curiosity, Opportunity & Exploration:** G10X Orange (`#FF6B00`).
- **Risk, Tension, Constraint & Commitment Gap:** G10X Red (`#E11D48`).
- **Success & Protection:** Semantic Green (`#059669`).
- **Primary Typography:** Near-Black Charcoal (`#0F172A`).
- **Secondary Typography:** Muted Slate (`#475569` / `#64748B`).

---

## 3. Shell Architecture & One-Title UX Rules

### 3.1 One Authoritative Page Title Rule
- **The body owns page identity:** Every CogniX experience has one primary visible page title rendered inside the page body content.
- **Header simplification:** The global top bar header does NOT duplicate or repeat the current page name.
- **Top bar role:** The top bar functions strictly as a quiet **context and control bar** (Domain Context + Persona + Notifications).

### 3.2 Global Shell Controls & Navigation
- **CogniX Wordmark = Home:** Clicking the CogniX wordmark returns the user to the Innovation Portfolio while preserving active Domain Context and Persona.
- **Domain Context Selector:** Specifies the active enterprise environment (e.g. `Retail & Grocery` [Active]). Unavailable domains are listed with `(Coming Soon)` and present honest teaser preview feedback without switching to empty/fake states.
- **Persona / Decision Lens Selector:** Specifies the user's decision perspective (e.g. `Innovation Executive`, `Chief Operating Officer`, `Category Lead`).
- **Notification Feedback:** Interactive notification controls provide clear "Notifications coming soon" feedback when clicked and avoid displaying fake unread counts.
- **Exit Demo Control:** In demo mode, the sidebar footer provides an explicit `Exit Demo` action that clears session state and returns to the platform setup entry screen.

---

## 4. Refined Typography Scale & Hierarchy

CogniX enforces a smaller, lighter, spacious typographic scale:
- **Primary Hero:** `28–32px`, Weight `600`
- **Page Title:** `20–22px`, Weight `600`
- **Section Heading:** `16–18px`, Weight `600`
- **Card / Item Title:** `14–16px`, Weight `500–600`
- **Body Text:** `13–14px`, Weight `400`
- **Secondary Body:** `12–13px`, Weight `400`
- **Metadata:** `10–12px`, Weight `400–500`
- **Buttons & Actions:** `12–13px`, Weight `500–600`

---

## 3. Three-Tier Action Button Hierarchy

1. **Primary Action:** Used sparingly (e.g. `Execute Action`).
2. **Secondary Action:** Subtly bordered surface (`#FFFFFF` with `#E2E8F0`).
3. **Exploratory Action:** Text-first links (`Explore →`, `Inspect Evidence →`, `Open Solution →`).

---

## 3. The Five-Second Rule & Word Ceiling Criteria

Every primary CogniX screen and Demonstration Solution MUST answer within approximately **five seconds**:
1. **What am I looking at?**
2. **Why is something interesting?**
3. **What can I explore or do next?**

### Word Ceiling Design Guardrail:
> No primary CogniX screen should normally require an executive to read more than **40–60 words** before reaching meaningful interaction, visual signals, or causal evidence.

### Progressive Disclosure Flow:
```text
Situation → Signal → Curiosity → Interaction → Consequence → Evidence → Explanation
```
Long-form narratives belong behind explicit *"Why?"*, *"Evidence"*, and *"Deep Analysis"* drawers, never blocking the initial discovery.

---

## 4. Executive Journey & Progressive Disclosure

### The First 30 Seconds ("The Hook")
When an executive opens CogniX, they are greeted by the **Curiosity Engine**:
1. **Header Statement:** Clear positioning as G10X Enterprise Innovation Lab.
2. **Questions Worth Asking:** High-impact provocative question cards triggering immediate interest.
3. **Active Experiment Showcase:** Highlighting active lab experiments (Commitment Intelligence, Decision Ripple Intelligence).

### Progressive Disclosure Flow:
```text
  [ Provocative Question ]
             ↓
  [ Innovation Canvas ]  ──> Problem statement, hypothesis, business value.
             ↓
 [ Interactive Demo ]    ──> Scenario controls, live simulation, causal node graphs.
             ↓
  [ Evidence & Reasoning ] ──> Data telemetry, confidence breakdown, Gemini synthesis.
```

---

## 4. Design System Component Tokens

- **Border Radius:** Subtly rounded (`var(--radius-sm)` = 6px, `var(--radius-md)` = 8px, `var(--radius-lg)` = 12px)
- **Elevation Shadows:** Very light, crisp directional shadows (`box-shadow: 0 1px 3px rgba(0,0,0,0.05), 0 1px 2px rgba(0,0,0,0.03)`).
- **Glassmorphism:** Prohibited except for floating modal backdrop filters where readability demands it.

---

## 5. Campaign Decision Intelligence UX & Progressive Disclosure Patterns

### 5.1 Non-Cockpit Decision Surface
Campaign Decision Intelligence surfaces MUST NOT create dense, cluttered dashboard cockpits. Primary views present progressive disclosure, answering five executive questions in order:
1. **What are we considering?** (Campaign Intent & Objective)
2. **What does CogniX predict?** (Decision Timeline & Counterfactual Baseline)
3. **Should we proceed?** (Campaign Decision Readiness: GO / CONDITIONAL GO / REVIEW / DO NOT PROCEED)
4. **Is there a better intervention?** (Multi-Objective Outcome Frontier & AI Competing Strategies)
5. **What should I investigate?** (Curiosity-Driven Demand Decomposition & Pre-Mortem)

### 5.2 Progressive Disclosure Pattern: `What? → Why? → Evidence → What If?`
Executives are never forced to inspect dense numbers or complex multi-variable breakdown charts upfront:
- **`What?`** High-level headline prediction (e.g. `Campaign Demand +28% · 84% Confidence`).
- **`Why?`** Clicking *Why?* surfaces progressive driver contributions (Mechanic +18.2pp, Audience +6.4pp, Weather +4.1pp, Competitor -2.1pp).
- **`Evidence`** Clicking *Show Evidence* exposes underlying data telemetry, historical analogues, and confidence bounds.
- **`What If?`** Clicking *What If?* opens scenario adjustment controls and alternative trade-off frontiers.

### 5.3 Multi-Objective Outcome Frontier UX
Trade-offs between Revenue, Profit Contribution, Waste Reduction, and Customer Availability are presented as clear strategy cards (*Maximum Growth*, *Maximum Contribution*, *Maximum Waste Reduction*, *Balanced*) with visible, explainable trade-offs—never as opaque single-number optimizations.

### 5.4 Primary Campaign Delta Decision Surface ("Should We Intervene?")
The "Do Nothing vs Proposed Intervention" comparison (Campaign Delta) is elevated as a mandatory primary decision surface. It exposes true incremental net monetary value (£ contribution delta, net volume delta, waste reduction delta), answering: *"Does intervention create more value than doing nothing?"*

### 5.5 Decision Readiness UX: Compact Summary → 6-Dimension Evidence
Decision Readiness is never reduced to a static badge or generic AI text. It follows a 2-tier structure:
- **Tier 1 (Compact Summary):** Overall state (`GO` | `CONDITIONAL GO` | `REVIEW` | `DO NOT PROCEED`) with confidence score.
- **Tier 2 (Progressively Disclosed Evidence):** Interactive drawer exposing 6-dimension evaluation breakdown (*Commercial*, *Demand*, *Operational*, *Context*, *Customer*, *Strategic*) with evidence provenance.

### 5.6 Decision Half-Life UX: Compact Validity Indicator → Validity Evidence
Decision Half-Life is never implemented as a countdown timer, expiry estimate or duration. It follows an evidence-driven pattern:
- **Tier 1 (Compact Indicator):** Validity state only — `STABLE` | `WATCH` | `DEGRADED` | `REASSESS_REQUIRED` | `INDETERMINATE`. No hours, no percentage remaining, no progress bar, no clock, no decay animation. `INDETERMINATE` means insufficient evidence and is rendered distinctly, never as a fifth severity step and never collapsed into `STABLE`.
- **Tier 2 (Progressively Disclosed Evidence):** Assumption and trigger drawer showing each declared assumption, the value it held when the decision was resolved, and which triggers fired, did not fire, or could not be assessed — with the specific signal drifts behind any fired trigger (e.g. weather shift +3.2°C, competitor price change −5%) and whether that movement was scenario-driven or world-driven.

Quantitative duration is unavailable until calibrated temporal evidence exists, and its absence is shown rather than filled. Authoritative semantics: `docs/reports/COGNIX_CDI_07A_DECISION_CONTRACT_DESIGN_GATE.md` §5.

---

## 6. Demand Decision Frontier UX (`DDF-01`)

Demand & Forecast must **not** become a dense planning dashboard. It remains executive-grade: light, professional, curiosity-led, progressively disclosed, evidence-driven, low in card and container density, and understandable without ML knowledge.

### 6.1 The reasoning must be visible in the visual hierarchy
```text
change  →  gap  →  urgency  →  consequence  →  intervention  →  outcome
```
Read as: *something is changing* (Forecast Stability) → *our commitments may not capture it* (Decision Gap) → *there is limited time* (Decision Window) → *waiting or choosing wrongly has a cost* (Decision Regret) → *CogniX evaluates an intervention* → *the frontier is recomputed*.

The three capabilities are **one experience**, never three unrelated widgets. The five-second rule and the 40–60 word ceiling (§3) apply unchanged.

### 6.2 Progressive disclosure — two entry actions
- **`Explore Decision Frontier`** — progressively discloses what changed, why CogniX believes it changed, what evidence contributed, emerging demand, executable capacity, Decision Gap, Decision Window, economic consequences, the recommended intervention, the expected outcome, and confidence/evidence.
- **`Simulate Intervention`** — recomputes Decision Gap, Decision Regret, capturable opportunity, residual exposure and risk state. **A failed recomputation renders an explicit unavailable state; a previous result is never left on screen as current.**

Both follow the established `What? → Why? → Evidence → What If?` pattern (§5.2) rather than introducing a new interaction grammar.

### 6.3 Demand Decision Frontier visualisation
The forecast chart evolves from a passive historical/forecast line into a **decision visual**, showing where supported:
1. current / base forecast trajectory
2. emerging demand trajectory
3. executable / committed trajectory
4. a visual area representing the **Decision Gap**
5. the **decision-frontier marker** where the Decision Window closes
6. the post-intervention trajectory while simulation is active

Rules: the graph must make the commercial situation legible **in seconds** and without a legend lookup. Only trajectories the estate can actually support are drawn — an unsupported trajectory is omitted, never dashed in as an implication. The chart obeys the §1.2 light semantic palette (Red for gap/exposure, Orange for opportunity, Green for protection); the current dark-theme chart styling on this light surface is a defect to correct. **No charting library decision is mandated** — Chart.js via `react-chartjs-2` is already the repository's established choice and remains it.

### 6.4 Two-tier honesty patterns
- **Forecast Confidence vs Forecast Stability (Tier 1):** presented as two distinct readings with distinct labels, never merged into one "trust" number and never captioned as *model accuracy* absent a backtest. `INDETERMINATE` stability is rendered distinctly and never collapsed into a favourable score.
- **Decision Window (Tier 1):** a duration renders **only** where a constraint is declared, and the declared constraint is named on disclosure. With none declared the state is `INDETERMINATE` and **no countdown, clock, progress bar or decay animation is drawn**. Modelled demo deadlines are visibly labelled as modelled. The Decision Window must **never** share an indicator with, be labelled as, or substitute for `CDI-07A` Decision Half-Life validity (§5.6) — that prohibition is unchanged and is not relaxed by this section.
- **Decision Regret (Tier 1 → Tier 2):** `ACT_NOW` / `WAIT` / `DO_NOTHING` as comparable alternatives with visible trade-offs — never an opaque single-number optimisation. Where they do not separate materially, CogniX says so and **names no winner**; where readiness evidence would gate an option, it is shown as *not currently actionable* rather than recommended.

---

## 7. Capability Atlas UX (`ATL-04`)

Design direction for the Capability Atlas. Governance: [`COGNIX_CAPABILITY_ATLAS.md`](../governance/COGNIX_CAPABILITY_ATLAS.md).
Not implemented — `ATL-04`.

### 7.1 Design intent
The Atlas is an **exploration surface for curious professionals**, not a documentation site. A visitor
arrives with a question, finds a capability, understands it to the depth they need, and leaves knowing
how to demonstrate it — without reading everything.

It inherits §1 unchanged: light, spacious, executive, calm, zero placeholder metrics. It is explicitly
**not** a dark surface, not a wiki, not a developer documentation site, and not a chatbot-first product.
Ask CogniX is one entry point among several, never the whole experience.

### 7.2 Search-first landing
Search is the primary affordance and sits **above** any capability list. A grid of cards is never the
first thing a visitor meets.

```text
CogniX Capability Atlas

Explore what CogniX can do, how capabilities work,
where they apply and how to demonstrate them.

[ Search capabilities, business problems, use cases,
  architectures, technologies or client questions... ]

Explore as:  [ Innovation Executive ] [ COO ] [ Category Lead ] [ Operations Lead ]

Domain:  Retail & Grocery [ACTIVE]     Future Domain Packs [COMING SOON]
```

The lens row is rendered from `config/personas.ts` and the domain row from `config/domains.ts` — neither
is hard-coded, and `coming_soon` domains are shown honestly as such. The placeholder teaches what can be
searched: problems, use cases, architectures, technologies, client questions — not just names. Search
works with no AI configured (ADR-050 Level 1).

### 7.3 Capability detail — progressive disclosure
Information priority, not a demand that all of it be visible at once. Most is collapsed, lens-prioritised
or absent when the record has no content for it.

1. What it is · 2. Why it exists · 3. What problem it solves · 4. Why it matters · 5. See it in CogniX ·
6. Try it yourself · 7. Example scenarios · 8. Business value · 9. How it works · 10. Architecture ·
11. Data and signals · 12. Testing and validation · 13. Why it is different · 14. Market context ·
15. Cross-domain applications · 16. Questions Worth Asking · 17. Demo Path · 18. Related capabilities ·
19. Artefacts and evidence · 20. Known limitations · 21. Roadmap and next experiments

**Rules:**
- **Above the fold:** capability name, the registry's `fiveSecondProposition`, all three maturity
  dimensions, domain and platform-reuse indicator, and the lens switcher. Nothing else. The §3 word
  ceiling (40–60 words before meaningful interaction) applies.
- **First scroll:** items 1–5, reordered by the active lens.
- **On demand:** items 9–15 and 19 expand; never pre-opened accordions; maximum two levels of
  disclosure on the page.
- **Never suppressed by any lens:** capability name, `fiveSecondProposition`, all three maturity
  dimensions, and item 20. A Sales lens must never hide that a capability is simulated.
- **Absent means absent:** a section with no content is omitted, not rendered empty. Where absence is
  itself meaningful — "no market study performed", "reuse not assessed" — it is stated explicitly,
  following the §6.4 pattern of showing the absence rather than filling it.
- Flow follows the established `What? → Why? → Evidence → What If?` grammar (§5.2). No new interaction
  grammar is introduced.

### 7.4 Maturity presentation (binding — ADR-047)
**The three dimensions are always shown together** — innovation lifecycle state, demonstration maturity,
and implementation status. One shown alone would be read as the others, which is precisely the confusion
this rule exists to prevent. A `Production Ready` demonstration badge must never imply computed
behaviour.

Simulated, experimental, concept and roadmap markers use a consistent, non-decorative treatment that
survives every lens, and do not rely on colour alone.

### 7.5 Evidence presentation
- Citations are inline and resolvable: activating one navigates to the cited capability or evidence.
- External evidence shows source, publisher and date **without interaction** — provenance hidden behind
  a tooltip does not satisfy ADR-048.
- The three evidence classes — **From CogniX**, **Market Context**, **AI Interpretation** — are
  distinguishable by structure and label, not by colour alone.

### 7.6 Other Atlas surfaces
Capability cards (name, five-second proposition, three maturity dimensions, domain, reuse indicator) ·
filters with visible active state and one-click clear · relationship view, where relationships are a
visual hero rather than a bullet list · Platform Capability Map derived from record fields ·
Demo Path selectable by duration and audience, with prerequisites and warnings shown **before** the
steps · Questions Worth Asking presented adjacent to relevant content as an invitation to explore,
never as a trailing FAQ block · Ask CogniX with inline citations (`ATL-05`) · the client-preparation
pack, printable and shareable, with warnings prominent (`ATL-06`).

### 7.7 Accessibility and responsiveness
Search, filters, lens switching and disclosure controls fully keyboard operable · status and
evidence-class distinctions never by colour alone · expandable regions announce state to assistive
technology · usable on a tablet in a client meeting, with the Demo Path legible at presentation
distance · relationship and map visualisations provide a textual equivalent.

### 7.8 Reuse
The Atlas is built inside the existing shell and reuses what works: the §1.2 G10X semantic colour model,
the §4 design system component tokens, the §3.1 One Authoritative Page Title rule, the existing icon
system, and Chart.js via `react-chartjs-2` where a visualisation is warranted. New tokens are additive.
**Atlas work must not restyle existing operational or decision surfaces.**
