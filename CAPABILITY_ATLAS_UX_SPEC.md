# CogniX Capability Atlas — UX Design Specification

**Document type:** Atlas governance — experience design
**Owned by:** CogniX Capability Atlas programme (`COGNIX_CAPABILITY_ATLAS.md`)
**Binding on:** CAT-04 (primary), CAT-05/CAT-06 (AI surfaces)

---

## 1. Design intent

The Atlas is an **exploration surface for curious professionals**, not a documentation site. A visitor
should be able to arrive with a question, find a capability, understand it at the depth they need, and
leave knowing how to demonstrate it — without reading everything.

Required characteristics:

- executive-grade and professional
- light visual system
- restrained use of containers
- strong whitespace
- meaningful visual hierarchy
- progressive disclosure
- curiosity-led exploration
- minimal cognitive overload
- data and relationships as the visual heroes
- concise summaries, with deeper evidence available on demand

### 1.1 Open decision: visual system vs. the existing product

`PLAN.md` §7 (Design Manifest) specifies the current application's aesthetic: near-black base
`#080B12`, panels `#101624`/`#141B2D`, dense compact tables, thin scrollbars — a deliberately dark
"FinOptX" system, implemented in `app/globals.css`.

The Atlas design direction above calls for a **light** visual system. These are in genuine tension and
the tension is **not resolved by this document**. CAT-04 must decide and record one of:

1. **Atlas adopts the existing dark system**, keeping visual continuity with the product, and achieves
   "light" through restraint, whitespace and hierarchy rather than luminance.
2. **Atlas introduces a light surface** distinct from the operational cockpit, on the basis that the
   Atlas is a knowledge surface with a different audience and reading mode.
3. **Both, via a theme token layer**, with the Atlas defaulting to one.

Whichever is chosen, `PLAN.md` §7 is **not** to be rewritten by Atlas work; the decision is recorded
as an Atlas ADR and, if it changes the product-wide manifest, that is raised as separate non-Atlas
work. This is listed in `COGNIX_CAPABILITY_ATLAS.md` §9 as an outstanding CAT-04 decision.

---

## 2. Anti-patterns (explicitly rejected)

| Avoid | Why |
|-------|-----|
| Wiki-like walls of text | The Atlas holds a great deal of content; showing it all at once destroys it |
| Developer-documentation aesthetics | The primary audiences are executive and client-facing |
| Excessive card density | Cards are the default failure mode of catalogues; use them for capabilities, not for every field |
| Nested accordions everywhere | Two levels of disclosure maximum on any one screen |
| Generic chatbot-first design | Ask CogniX is one entry point among several, not the whole product |
| Static HTML as primary knowledge storage | Forbidden by ADR-0002; the UI renders API responses |
| Ungrounded AI explanations | Every AI claim carries a citation or is not shown |

---

## 3. Capability detail: progressive disclosure order

The target structure for a capability page. The order is the **information priority**, not a demand
that all 21 sections be visible at once — most are collapsed, lens-prioritised, or absent when the
record has no content for them.

1. What it is
2. Why it exists
3. What problem it solves
4. Why it matters
5. See it in CogniX
6. Try it yourself
7. Example scenarios
8. Business value
9. How it works
10. Architecture
11. Data and signals
12. Testing and validation
13. Why it is different
14. Market context
15. Cross-domain applications
16. Questions Worth Asking
17. Demo Path
18. Related capabilities
19. Artefacts and evidence
20. Known limitations
21. Roadmap / next experiments

### 3.1 Disclosure rules

- **Above the fold:** name, `summary`, maturity badge, implementation-status badge, demo-readiness
  badge, domain and platform-reuse indicator, and the lens switcher. Nothing else.
- **First scroll:** sections 1–5 for any lens, reordered by the active lens
  (`CAPABILITY_KNOWLEDGE_MODEL.md` §8).
- **On demand:** sections 9–15 and 19 expand; they are never rendered as pre-opened accordions.
- **Never suppressed by any lens:** `name`, `summary`, `maturity`, `implementationStatus`,
  `demoReadiness`, and section 20 (Known limitations). A Sales lens must never hide that a capability
  is simulated.
- **Absent means absent:** a section with no record content is omitted, not rendered empty. Where
  absence is meaningful ("no market study performed"), it is shown as an explicit statement per the
  content standard's rule T4.
- Maximum two levels of disclosure on the page.

---

## 4. Search-first landing

The landing experience treats search as primary. Illustrative intent:

```text
CogniX Capability Atlas

Explore what CogniX can do, how capabilities work,
where they apply and how to demonstrate them.

[ Search capabilities, business problems, use cases,
  architectures, technologies or client questions... ]

Explore as:
[ Innovation Executive ] [ Sales ] [ Architect ] [ Developer ]

Domain:
Retail & Grocery
Cross-Domain Platform
Future Domains
```

Rules:

- Search sits **above** any capability list. A grid of cards must not be the first thing a visitor
  meets.
- The lens choice is offered on the landing screen and persists across navigation. It is a view
  preference, never a content fork.
- Domain entry points are rendered from taxonomy data, including a "Future Domains" affordance that
  honestly communicates that only Retail & Grocery is populated today.
- The search field's placeholder teaches what can be searched — problems, use cases, architectures,
  technologies, client questions — not just names.
- Search works with no AI configured (Level 1, `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §2).

This is design direction. Implementation belongs to CAT-04, not CAT-01.

---

## 5. Other required surfaces

| Surface | Purpose | Phase |
|---------|---------|-------|
| Capability cards | Scannable results: name, summary, maturity, implementation status, demo readiness, domain, platform-reuse indicator | CAT-04 |
| Filters | The filter set in `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §2.2, with visible active-filter state and one-click clear | CAT-04 |
| Relationship view | The capability graph — depends-on, enables, complements, alternatives. Relationships are a visual hero, not a bullet list | CAT-04 |
| Platform Capability Map | Reusable capabilities and their domain applications, derived from record fields (`CAPABILITY_ATLAS_ARCHITECTURE.md` §7) | CAT-04 |
| Demo Path | The four paths, selectable by duration and audience, with prerequisites and warnings shown before the steps | CAT-04 |
| Questions Worth Asking | Presented as an invitation to explore, adjacent to the relevant content, not as a trailing FAQ block | CAT-04 |
| Ask CogniX | A conversational entry point with citations rendered inline and the three evidence classes visually distinct | CAT-05 |
| Client preparation | The pack of `CAPABILITY_ATLAS_SEARCH_AND_AI_MODEL.md` §8.3, printable/shareable, with warnings prominent | CAT-06 |

---

## 6. Evidence and status presentation

- **Maturity, implementation status and demo readiness are always visible together.** They answer
  different questions and one without the others misleads.
- Simulated, experimental and roadmap markers use a consistent, non-decorative visual treatment that
  survives every lens.
- Citations are inline and resolvable: clicking a citation navigates to the cited record or evidence.
- External evidence renders with source, publisher and date visible without interaction — provenance
  hidden behind a tooltip does not satisfy ADR-0007.
- The three evidence classes (**From CogniX** / **Market Context** / **AI Interpretation**) are
  distinguishable by structure and label, not by colour alone.

---

## 7. Accessibility and responsiveness

- Search, filters, lens switching and disclosure controls are fully keyboard operable.
- Status and evidence-class distinctions do not rely on colour alone.
- Expandable regions announce their state to assistive technology.
- The capability detail page is usable on a tablet in a client meeting; the Demo Path view in
  particular must be legible at presentation distance.
- Relationship and map visualisations provide a textual equivalent.

---

## 8. Relationship to existing UI conventions

The Atlas is built inside the existing Next.js App Router application and should reuse what already
works there: the icon system (`lucide-react`, `lib/icons.ts`), existing typography and spacing tokens
in `app/globals.css`, and the established navigation patterns in `components/Sidebar.tsx` /
`components/Help.tsx`.

Where the Atlas needs new tokens (notably if CAT-04 chooses a light surface, §1.1), they are added
additively. Atlas work must not restyle existing operational screens.
