# COGNIX ATL-01 — ARCHITECTURAL STORYBOARD MIGRATION ASSESSMENT

**Work Package:** `ATL-01` — Capability Discovery, Governance & Information Model
**Governing decision:** ADR-051 — *Preserve architectural knowledge, not obsolete storyboard implementation*
**Document Status:** Approved & Authoritative for the Atlas programme
**Version:** 1.0.0
**Date:** 2026-08-20
**Method:** read-only inspection of both versions. The historical version was read via
`git show origin/main:<path>`. **No file was merged, cherry-picked, ported or modified.**

---

## 1. The two versions

| | Current (CogniX line) | Historical (`origin/main`) |
|---|---|---|
| File | `components/ArchitectureExplorer.tsx` | `origin/main:components/ArchitectureExplorer.tsx` |
| Size | 1,546 lines | 2,303 lines |
| Slides | **12** | **14** |
| Host | `components/Help.tsx` (522L) | `origin/main:components/Help.tsx` (509L) |
| Help tabs | Architecture Storyboard · Decision Lifecycle · **Journey Telemetry** · **Enterprise Signals (ESF-1)** | Architecture Storyboard · Decision Lifecycle · **Organisational Learning Network** |
| Data binding | 0 `fetch`, 0 engine imports — fully static | fully static |
| Legacy-stack references | 74 (Looker / AppSheet / BigQuery / Lidl) | higher, plus explicit client branding |

Both use the same `SlideData` shape: `title`, `trigger`, `keyMessage`, `businessValue`,
`technicalDetails`, `businessNarrative`, `architectureNarrative`, `technicalNarrative`,
`presenterNotes`, `outcomeMetric`, `outcomeLabel`, `persona`, `personaTitle`, `personaIcon`.

---

## 2. Slide-by-slide audit

`✔ = present`. Destination applies to knowledge retained, not to the implementation.

| # | Slide | Cur | Hist | Decision | Destination |
|---|-------|-----|------|----------|-------------|
| 1 | Why This Exists | ✔ | ✔ | **Retain (reframe)** | Platform-level innovation thesis. Its claim (*decision latency: hours → seconds*) is a Lidl-era framing; the CogniX equivalent is the `COGNIX_CHARTER.md` purpose. Atlas: platform `innovationThesis` |
| 2 | Before vs After Decision Making | ✔ | ✔ | **Retain (reframe)** | The 7-steps → 3-steps process contrast. Superseded in substance by `CDI-02` counterfactual semantics (*Do Nothing vs Proposed Intervention*). Atlas: platform narrative + `SOL-PROMO-01` `useCases` |
| 3 | Interactive Enterprise Blueprint | ✔ | ✔ | **Retain** | The 7-layer platform map. Destination: `ARCHITECTURE.md` §2 (already holds a layered target architecture) + the Atlas **Platform Capability Map** (`CAPABILITY_ATLAS_ARCHITECTURE.md` §6) |
| 4 | Store Manager Journey | ✔ | ✔ | **Retain (persona only)** | Journey shape and the *waste alert → resolution* arc. Destination: capability `useCases` and Demo Path `ten-minute` steps. Outcome figure (`-14%`) is an unsupported demo constant — **not** carried across |
| 5 | Category Manager Journey | ✔ | ✔ | **Retain (persona only)** | As above; `+4.2%` not carried |
| 6 | Supply Chain Journey | ✔ | ✔ | **Retain (persona only)** | As above; `£24K` not carried. **Note:** the supply capability itself is orphaned (inventory §7) — no successor surface exists today |
| 7 | Executive Journey | ✔ | ✔ | **Retain (persona only)** | As above; briefing surface is orphaned (inventory §7) |
| 8 | **The Business Value Engine** | ✖ | ✔ | **Retain — unique to historical** | Four value quadrants (Revenue, Margin, Waste, Productivity) as a repeatable value framework rather than a feature list. **No equivalent exists on the CogniX line.** Destination: Atlas `businessBenefits` taxonomy + platform value framing. See §3.1 |
| 9 | AppSheet AI Enablement Blueprint | ✔ | ✔ | **Discard** | Citizen-developer narrative built entirely on AppSheet, a stack the CogniX estate does not implement. No successor required |
| 10 | How A Recommendation Is Generated | ✔ | ✔ | **Retain** | The query lifecycle. Superseded in substance and in rigour by `CDI-01`…`CDI-08` and ADR-044. Destination: capability `architecture.flow` for the campaign decision family + `ARCHITECTURE.md` §6 |
| 11 | Why Gemini Cannot Hallucinate Here | ✔ | ✔ | **Retain (restate)** | The constrained-reasoning narrative. Its Looker-semantic-layer mechanism is obsolete; the current mechanism is ADR-044 (refusal over fabrication), ADR-018 and Principle 13. Destination: ADR cross-reference from the Atlas + capability `assumptions`/`limitations`. **The `0% Hallucination Rate` outcome figure is an unsupported claim and is not carried across** |
| 12 | Governance & Trust | ✔ | ✔ | **Retain (restate)** | IAM / RLS / human-in-the-loop. Current equivalents: `IP_GOVERNANCE.md`, `ARCHITECTURE.md` §4, `CDI-04` readiness gating. Destination: governance-control capability records |
| 13 | **Why This Matters to LiDL** | ✖ | ✔ | **Retain (neutralise)** | Hub-and-spoke expansion model — one governed decision layer reused across operating domains without custom rebuilds. This is precisely the Platform Capability Map argument. Client identity must be stripped. See §3.2 |
| 14 | Future-State 2028 | ✔ (*Future-State Enterprise 2028*) | ✔ (*Future-State LiDL 2028*) | **Retain (already neutralised)** | Current version already renamed. Destination: roadmap-status capability records. `£12.4M National ROI` is an unsupported demo constant — not carried |

**Net:** 12 retained (7 reframed or restated), 1 discarded, 2 unique to the historical version.

---

## 3. Knowledge unique to the historical version

### 3.1 The Business Value Engine (historical slide 8)

Verbatim substance: decisions organised into four quadrants — **Revenue, Margin, Waste, Productivity** —
so that every alert and action ties to business value; described as *"a repeatable value framework, not
just a set of features"*, with a central loop logging outcomes for continuous learning.

**Assessment:** genuinely absent from the CogniX line. The estate has richer machinery — `CDI-06`
multi-objective outcome frontier spans revenue, contribution, waste and availability — but **no
top-level value taxonomy** binding capability outcomes to a small set of named pillars. That is exactly
what the Atlas `businessBenefits` field needs to classify against.

**Destination:** `ATL-02` adopts a value-pillar vocabulary in the knowledge extension;
`ATL-03` classifies each capability's `businessBenefits` against it. The four quadrants are a
**candidate** starting vocabulary to be reconciled with the `CDI-06` objective set — not adopted
uncritically, since `CDI-06` already names four objectives and two competing taxonomies would be worse
than none.

### 3.2 Why This Matters (historical slide 13)

Verbatim substance: a hub-and-spoke model in which a central governed decision layer is reused across
operating domains — waste, availability, labour, energy, promotions, store operations — so new
front-ends consume the same backend rather than triggering custom IT rebuilds.

**Assessment:** the architectural argument is sound and current; only its framing is client-specific.
It is the same claim ADR-002 makes (client-neutral core with configurable industry packs) and the same
claim the Atlas Platform Capability Map is designed to make visible.

**Destination:** Platform Capability Map (`CAPABILITY_ATLAS_ARCHITECTURE.md` §6), with client identity
removed and the domain list replaced by `config/domains.ts` entries.

### 3.3 Organisational Learning Network tab — already preserved

The historical `Help.tsx` carried a pattern library of four records (`PAT001`…`PAT004`: trigger, cause,
action, result, confidence, stores impacted) under headline metrics *28 Active Patterns · 91% Success
Rate · £2.4M Est. Value · 127 Pattern Reuses*.

**Assessment — preservation already complete, and improved:**

| Historical | Current CogniX line |
|---|---|
| 4 component-resident `PAT001`…`PAT004` literals | 5 registry entries `PAT-COMM-01`…`PAT-BEH-05` in `config/patterns.ts` |
| No contract | `packages/contracts/src/learning-pattern-model.ts` |
| No API | `app/api/v1/learning-patterns`, `.../match`, `.../[id]/memories` |
| No store | `services/learning/src/learning-pattern-store.ts` |
| No surface beyond the tab | `components/EnterpriseMemory.tsx` (`EXP-MEMORY-03`) |
| *"28 Active Patterns"* over 4 records; *£2.4M*; *127 reuses* | **Not present anywhere on the CogniX line** |

The unsupported headline metrics were correctly dropped, and the `Y4-gov` governance correction
explicitly reclassified seeded learning telemetry as uncalibrated demonstration constants. **No action
required** — this is the model case for what migration should look like.

### 3.4 Knowledge unique to the *current* version

The current `Help.tsx` adds two **live** tabs the historical version lacks: Journey Telemetry
(`/api/v1/journey/events`) and Enterprise Signals (`/api/v1/signals`). These are `WP10-B` and `ESF-1`
surfaces and are **not** storyboard content — they must survive storyboard retirement independently and
are recorded in the inventory as E-06 and E-07.

---

## 4. Cross-cutting content

| Content | Decision | Destination |
|---------|----------|-------------|
| Presenter notes (14 per version) | **Retain** | Demo Path `steps[].whatToSay` (`SB-GATE-5`) |
| Demo timings (10-minute core, 20–30-minute extended) | **Retain** | Demo Path `durationMins` / `prerequisites`, reconciled with `DEMO_OPERATING_MODEL.md` §2 |
| Persona cards (7 narrative personas) | **Retain as free text** | `demoScenarios[].steps` and `sampleScenarios`. **Not** added to the persona taxonomy — they carry no access semantics and no decision lens (`CAPABILITY_TAXONOMY` rationale, inventory §11) |
| `outcomeMetric` / `outcomeLabel` figures | **Discard** | Every one is an unsupported demo constant. Carrying them forward would reproduce the `D-DDF-2` defect class in a new surface |
| 4-layer / 7-layer diagram grammar | **Retain** | `ARCHITECTURE.md` §2 and the Atlas progressive architecture disclosure |
| Looker / AppSheet / BigQuery stack narrative | **Discard** | 74 references in the current file. The CogniX estate implements none of it |

---

## 5. `SB-GATE` checklist

Per ADR-051 and `COGNIX_CAPABILITY_ATLAS.md` §5. All six required before retirement.

| Gate | State | Basis |
|------|-------|-------|
| **SB-GATE-1** — both versions audited slide by slide, retain/discard per unit | **MET** | §2, §3, §4 |
| **SB-GATE-2** — every retained unit verifiably present at its destination | **NOT MET** | Destinations are *assigned*, not populated. Blocked on `ATL-03`. Two units (§3.1, §3.2) exist nowhere yet |
| **SB-GATE-3** — destinations reachable from the Atlas or governance | **NOT MET** | Requires the `ATL-04` Atlas surface |
| **SB-GATE-4** — each major narrative has a named successor surface | **PARTIALLY MET** | Named for 11 of 12 retained slides. **Open:** slides 6 and 7 (supply chain, executive briefing) have no successor because those capabilities are orphaned (inventory §7); the value framework (§3.1) awaits the D1/`CDI-06` reconciliation |
| **SB-GATE-5** — presenter notes and timings preserved as Demo Path content | **NOT MET** | Blocked on `ATL-03` |
| **SB-GATE-6** — retirement proposed in a WP that names the navigation successor | **NOT MET** | `ATL-04` scope |

### Verdict

> **The Architectural Storyboard must not be retired.** One of six gates is met. The storyboard remains
> in place and untouched, and the Atlas will coexist with it until `ATL-03` and `ATL-04` complete.

---

## 6. Rules confirmed by this assessment

1. **The historical implementation is never merged.** No commit, file or slide from `origin/main` or
   `origin/fix/storyboard-presentation-recovery` enters the CogniX line. It remains a read-only audit
   source, reachable via `git show`.
2. **Unsupported demo constants do not migrate.** Every `outcomeMetric` figure, and the historical
   learning-tab headline metrics, are excluded by Principle 12 and the `D-DDF-2` precedent.
3. **A capability without a reachable surface gets no successor by default.** Slides 6 and 7 describe
   capabilities that are orphaned code today; the Atlas will not present them as available.
4. **Live Help tabs are not storyboard content** and survive retirement independently (§3.4).

---

## 7. Handoff

- Slides audited: **14 historical + 12 current**; 12 retained, 1 discarded, 2 unique to historical.
- Unique historical knowledge requiring a new home: **2** (§3.1 value framework, §3.2 hub-and-spoke
  reuse model).
- Already-preserved historical knowledge: **1** (§3.3 learning patterns — no action).
- `SB-GATE`: **1 of 6 met**. Retirement blocked.
- Files modified: **none**. Storyboard code untouched.
- Next dependent work: `ATL-03` (populate destinations), `ATL-04` (reachability and retirement gate).
