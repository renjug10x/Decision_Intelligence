# COGNIX ATL-01 — CAPABILITY INVENTORY REPORT

**Work Package:** `ATL-01` — Capability Discovery, Governance & Information Model
**Document Status:** Approved & Authoritative for the Atlas programme
**Version:** 1.0.0
**Date:** 2026-08-20
**Baseline:** `claude/cognix-capability-atlas-v2` @ `177fca0`, descended from `origin/Feature/MatchingContract-AutoActivate` @ `5dfba74`
**Owner:** G10X Enterprise Innovation Lab Architecture Board

---

## 1. Method and scope

Every row below is reconciled against implementation, not documentation. Each cites at least one file
path. Where a claim could not be settled from the tree it is marked and the basis is named.

**Surfaces examined:** 6 Next.js pages · 69 API route handlers · 44 components · 44 `lib/` modules ·
23 contract models in `packages/contracts/src` · 12 `services/` modules · 25 test runners in
`tests/unit/` · 5 registries in `config/` · 39 work-package reports in `docs/reports/` ·
`docs/governance/MASTER_PLAN.md` · `docs/architecture/ARCHITECTURE_DECISIONS.md` (ADR-001…ADR-051).

**Classification** follows ADR-047 — three orthogonal dimensions, never collapsed:

- **Lifecycle** — `EXPERIMENT_LIFECYCLE.md` states. Recorded only where a registry carries it.
- **Demo maturity** — `CognixSolution.demoMaturity`. Recorded only where a registry carries it.
- **Implementation status** — `CAPABILITY_KNOWLEDGE_MODEL.md` §3, assigned here from code evidence.

**Counts:** 33 capabilities inventoried — 9 registered, 20 unregistered, 4 experience/platform.
By implementation status: 21 `implemented`, 5 `partially-implemented`, 5 `simulated`,
2 `concept`. Orphaned components: 8. Unbacked registry entries: 0.

---

## 2. Headline findings

**F1 — The registries describe a fraction of the estate.** `config/solutions.ts` holds 4 solutions and
`config/experiments.ts` holds 5 experiments. The implemented estate contains at least **20 further
governed capabilities** — `CDI-02`…`CDI-08`, `DDF-01`, `IFI-01`, `ESF-1`/`-2`/`-3`/`-6`,
`WP10-B`/`-C`/`-D` and the learning-pattern registry — each with a contract, an engine, API routes,
a test runner and a completion report, and **none discoverable from any registry**. This is the single
largest finding and the strongest justification for the Atlas: the discovery surface has not kept pace
with delivery.

**F2 — `EXP-CDI-01` understates its own family by seven work packages.** Its `commercialStatus` reads
`'Active CDI Foundation (CDI-01)'` and `maturity: 'Prototype'`, while `MASTER_PLAN.md` records
`CDI-01`…`CDI-08` all `[COMPLETED]` with 4,985 lines of `CampaignDecisionCanvas.tsx`, ten contract
models and ten test runners behind them (`config/experiments.ts:168-180`).

**F3 — No capability in the estate carries all three maturity dimensions.** Experiments carry
lifecycle only; solutions carry demo maturity only; nothing carries implementation status. The
combination ADR-047 exists to expose — `Production Ready` demo maturity over `simulated`
implementation — is currently unrepresentable, and it occurs (see `SOL-INV-03`, row C-03).

**F4 — Eight orphaned components remain in the tree**, six of them Lidl-era surfaces that Phase 1
identity neutralisation left behind. They are unreachable from routing and referenced by nothing.

**F5 — Two capability surfaces are `Production Ready` in the registry but static in implementation.**
`SOL-INV-03` (`AvailabilityIntelligence.tsx`) and, partly, `SOL-CAT-04` render in-component literal
arrays. This is the `D-DDF-1` pattern — a literal standing in for a calculation — in a surface that has
not had a reconciliation pass.

**F6 — The Architectural Storyboard is fully static and carries 74 legacy-stack references.** It makes
no API or engine call (`components/ArchitectureExplorer.tsx`, 0 `fetch`, 0 engine imports) and narrates
a Looker/AppSheet/BigQuery architecture that the CogniX estate no longer implements. Details and the
`SB-GATE` checklist are in the companion assessment.

---

## 3. Registered Demonstration Solutions (`SOL-*`)

| Ref | Capability | Surface | Engine / data evidence | Lifecycle | Demo maturity | Implementation |
|-----|-----------|---------|------------------------|-----------|---------------|----------------|
| **SOL-PROMO-01** | Promotion Intelligence | `components/PromotionPlanner.tsx` (595L) + 7 lenses under `components/campaign/` | `lib/campaign-causal-engine.ts`, `lib/campaign-opportunity-engine.ts`, `lib/campaign-frontier-engine.ts`; `app/api/v1/campaigns/evaluate*` | *not recorded* | `Production Ready` (`config/solutions.ts:36`) | `implemented` |
| **SOL-DEMAND-02** | Demand & Forecast Intelligence | `components/Forecasting.tsx` (1,314L) + `components/demand/DemandDecisionNarrative.tsx` | `lib/demand-decision-frontier/demand-frontier-engine.ts` imported directly at `Forecasting.tsx:19`; `app/api/v1/demand-frontier/evaluate` | *not recorded* | `Production Ready` (`:51`) | `implemented` |
| **SOL-INV-03** | Predictive Inventory Intelligence | `components/AvailabilityIntelligence.tsx` (472L) | `lib/world-client.ts` `fetchWorldScenario`, **plus in-component literals** `STOCKOUT_EVENTS` (`:16`), `AFFECTED_STORES` (`:79`) | *not recorded* | `Production Ready` (`:66`) | **`partially-implemented`** — see F5 |
| **SOL-CAT-04** | Category Intelligence | `components/CategoryIntelligence.tsx` (448L) | `/api/data` (2 calls); 3 in-component literal arrays | *not recorded* | `Production Ready` (`:81`) | **`partially-implemented`** |

*Field-level status (ADR-047)*: `SOL-INV-03` — scenario context is engine-bound; stock-out events and
affected-store lists are `simulated`. `SOL-CAT-04` — category performance is `implemented` via
`/api/data`; root-cause colouring and supporting lists are `simulated`.

**All four lack a lifecycle state**, because `CognixSolution` carries no lifecycle field. Recorded as
gap **G1**.

---

## 4. Registered Innovation Experiments (`EXP-*`)

| Ref | Capability | Surface | Evidence | Lifecycle | Demo maturity | Implementation |
|-----|-----------|---------|----------|-----------|---------------|----------------|
| **EXP-COMMITMENT-01** | Commitment Intelligence | `components/CommitmentIntelligence.tsx` (526L) | `lib/decision-engine.ts`; `config/experiments.ts:52-60` | `Prototype` | *not recorded* | `implemented` |
| **EXP-RIPPLE-02** | Decision Ripple Intelligence | `components/DecisionRippleIntelligence.tsx` (366L) | `lib/decision-engine.ts`; `:84-92` | `Prototype` | *not recorded* | `implemented` |
| **EXP-MEMORY-03** | Enterprise Memory Foundation | `components/EnterpriseMemory.tsx` (299L) | `lib/memory-client.ts`, `services/learning/src/memory-store.ts`, `app/api/v1/memory*`; `:116-124` | `Concept` | *not recorded* | `implemented` — **lifecycle understates the code** (gap **G2**) |
| **EXP-OPPORTUNITY-04** | Opportunity Intelligence | `components/OpportunityIntelligence.tsx` (318L) | No engine or API import; in-component data | `Concept` | *not recorded* | `simulated` |
| **EXP-CDI-01** | Campaign Decision Intelligence | `components/CampaignDecisionCanvas.tsx` (4,985L) + 3 modals | 15 `lib/campaign-*` engines, 10 contract models, 10 test runners; `:168-180` | `Prototype` | *not recorded* | `implemented` — **registry describes only CDI-01** (F2) |

**All five lack demo maturity**, because the experiment schema carries none. Recorded as gap **G1**.

---

## 5. Unregistered capabilities — implemented, tested, governed, invisible

Each row is `[COMPLETED]` in `docs/governance/MASTER_PLAN.md`, has a contract, an engine, API routes, a
test runner and a completion report in `docs/reports/`, and appears in **no** registry. Assertion-call
counts are from the runners; the authoritative baselines are in the Master Plan.

| # | Capability | Contract | Engine | API | Test runner (assert calls) | Impl. |
|---|-----------|----------|--------|-----|---------------------------|-------|
| U-01 | **CDI-02** Counterfactual Baseline & Causal Engine | `campaign-counterfactual-model.ts` | `lib/campaign-causal-engine.ts` | `v1/campaigns/evaluate-causal`, `.../counterfactual` | `run-cdi02-tests.ts` (37) | `implemented` |
| U-02 | **CDI-03** Opportunity Window & Micro-Market Graph | `campaign-opportunity-model.ts` | `lib/campaign-opportunity-engine.ts` | `v1/campaigns/opportunity-windows`, `.../micro-markets`, `.../opportunity-discover` | `run-cdi03-tests.ts` (32) | `implemented` |
| U-03 | **CDI-04** Decision Readiness & Resilience | `campaign-readiness-model.ts` | `lib/campaign-readiness-engine.ts` | `v1/campaigns/readiness` | `run-cdi04-tests.ts` (52) | `implemented` |
| U-04 | **CDI-05** Decision Timeline & Demand Decomposition | `campaign-timeline-model.ts` | `lib/campaign-timeline-engine.ts` | `v1/campaigns/timeline` | `run-cdi05-tests.ts` (71) | `implemented` |
| U-05 | **CDI-06** Multi-Objective Outcome Frontier | `campaign-frontier-model.ts` | `lib/campaign-frontier-engine.ts` | `v1/campaigns/outcome-frontier` | `run-cdi06-tests.ts` (93) | `implemented` |
| U-06 | **CDI-07A** Decision Contract & Decision Half-Life | `campaign-decision-contract-model.ts` | `lib/campaign-decision-contract-engine.ts`, `lib/decision-contract-store.ts` | `v1/campaigns/decision-contract/*` (9 handlers) | `run-cdi07a-tests.ts` (157) | `implemented` |
| U-07 | **CDI-07B** Pre-Mortem, Prediction vs Reality & Learning Loop | `campaign-learning-loop-model.ts` | `lib/campaign-learning-loop-engine.ts`, `lib/pre-mortem-store.ts`, `lib/learning-candidate-store.ts` | `.../pre-mortem`, `.../prediction-comparison`, `.../learning-candidate` | `run-cdi07b-tests.ts` (156) + smoke | `implemented` |
| U-08 | **CDI-08** Observation Correspondence & Prediction Envelope | `attested-observation-model.ts` | `lib/attested-observation-store.ts` | `v1/campaigns/observations/admit` | `run-cdi08-tests.ts` (45) | `implemented` |
| U-09 | **DDF-01** Demand Decision Frontier | `demand-decision-frontier-model.ts` | `lib/demand-decision-frontier/demand-frontier-engine.ts` | `v1/demand-frontier/evaluate` | `run-ddf01-tests.ts` (57) | `implemented` |
| U-10 | **DDF-01 P0-A** Forecast Stability Intelligence | as U-09, ADR-040 | as U-09 | as U-09 | within `run-ddf01-tests.ts` | `implemented` |
| U-11 | **DDF-01 P0-B** Decision Gap Intelligence | as U-09, ADR-041 | as U-09 | as U-09 | within `run-ddf01-tests.ts` | `implemented` |
| U-12 | **DDF-01** Decision Window (supporting) | as U-09, ADR-042 | as U-09 | as U-09 | within `run-ddf01-tests.ts` | `implemented` — `INDETERMINATE` where no constraint is declared |
| U-13 | **DDF-01 P0-C** Decision Regret Intelligence | as U-09, ADR-043 + Amendment A | as U-09 | as U-09 | within `run-ddf01-tests.ts` | `implemented` — absolute £ values are uncalibrated modelled expected values, labelled as such |
| U-14 | **IFI-01** Intent Fusion / Contextualised Decision Outlook | `intent-fusion-model.ts` | `lib/intent-fusion/intent-fusion-engine.ts` | `v1/intent-fusion/evaluate`, `v1/commercial-intents/*` | `run-ifi1-tests.ts` (13) | `implemented` |
| U-15 | **ESF-1** Enterprise Signal Contract & Foundation | `enterprise-signal-model.ts` | `services/world/src/enterprise-signal-generator.ts`, `lib/enterprise-signal-client.ts` | `v1/signals/*` (9 handlers) | `run-signal-tests.ts` (7) | `implemented` |
| U-16 | **ESF-2** Dynamic Signal Simulation | as U-15 | `services/world/src/dynamic-signal-simulator.ts` | `v1/signals/simulate` | `run-esf2-tests.ts` (20) | `implemented` |
| U-17 | **ESF-3** External Signal Connector Contract | `external-signal-connector-model.ts` | `services/world/src/external-signal-connector.ts` | `v1/signals/connectors*` | `run-esf3-tests.ts` (23) | `implemented` — all 7 adapters are reference implementations marked `synthetic_demo: true` |
| U-18 | **ESF-6 / Y3a** Attested Observation Admission | `attested-observation-model.ts` | `services/world/src/attested-observation-store.ts` | `v1/signals/attested-sources*` | `run-esf6-tests.ts` (76) | `implemented` |
| U-19 | **WP10-B** Journey Telemetry | `journey-model.ts` | `lib/journey-store.ts`, `lib/journey-client.ts` | `v1/journey/*` | `run-journey-tests.ts` (13), `journey-telemetry.test.ts` | `implemented` |
| U-20 | **WP10-C** Shared Decision State | `decision-state-model.ts` | `lib/decision-state-store.ts`, `context/DecisionStateContext.tsx` | `v1/decision-state/*` (6 handlers) | `run-decision-state-tests.ts` (26) | `implemented` |
| U-21 | **WP10-D** Memory & Learning API | `memory-model.ts`, `learning-pattern-model.ts` | `services/learning/src/*` | `v1/memory/*`, `v1/learning-patterns/*` | `run-wp10d-tests.ts` (36) | `implemented` |
| U-22 | **Enterprise Learning Pattern registry** | `learning-pattern-model.ts` | `services/learning/src/learning-pattern-store.ts` `CANONICAL_LEARNING_PATTERNS` (**6** entries) | `v1/learning-patterns`, `.../match`, `.../[id]/memories` | within `run-wp10d-tests.ts` | `implemented` — telemetry classified as uncalibrated demonstration constants per `Y4-gov`. **`config/patterns.ts` is a superseded duplicate** — see §7.1 |

Cross-cutting runners not attributable to one capability: `run-campaign-decision-journey-tests.ts` (97),
`run-campaign-intelligence-tests.ts` (37), `run-decision-dimensions-tests.ts` (160),
`run-demand-language-tests.ts` (22), `run-bugfix-integrity-tests.ts`.

---

## 6. Experience, platform and governance capabilities

| # | Capability | Evidence | Implementation |
|---|-----------|----------|----------------|
| E-01 | Innovation Portfolio (experiment + solution discovery) | `components/InnovationPortfolio.tsx` (269L), reads `config/experiments.ts` and `config/solutions.ts` | `implemented` |
| E-02 | Questions Worth Asking (curiosity entry) | `components/QuestionsWorthAsking.tsx` (250L); `CuriosityQuestion[]` is an **in-component literal** | `implemented` surface, **`simulated` content store** — ADR-046 migration target for `ATL-02` |
| E-03 | Experiment Canvas | `components/ExperimentCanvas.tsx` (297L), reads `config/experiments.ts` | `implemented` |
| E-04 | Architectural Storyboard | `components/ArchitectureExplorer.tsx` (1,546L, 12 slides), 0 `fetch`, 0 engine imports | `simulated` — static narrative; see F6 and the companion assessment |
| E-05 | Help shell: Decision Lifecycle tab | `components/Help.tsx` | `simulated` — static stage list |
| E-06 | Help shell: Journey Telemetry tab | `components/Help.tsx:24` → `/api/v1/journey/events` | `implemented` — live |
| E-07 | Help shell: Enterprise Signals tab | `components/Help.tsx:36` → `/api/v1/signals` | `implemented` — live |
| E-08 | Contract Verification | `components/ContractVerification.tsx` (271L), `lib/contract-library.ts`, `lib/contract-narrative.ts` | `implemented` |
| E-09 | Authentication & platform setup | `app/login`, `app/reset-password`, `app/complete-registration`, `app/platform-setup`, `services/auth.service.ts`, `config/routes.ts` | `implemented` |
| E-10 | Governance / Settings surface | `components/Settings.tsx` (615L) | `partially-implemented` |
| E-11 | Domain & persona context switching | `config/domains.ts` (consumed by `app/page.tsx`), `config/personas.ts` (`app/page.tsx`, `components/PlatformSetupPage.tsx`) | `partially-implemented` — domain and persona selection work; the industry-pack layer does not (see §7.1) |

---

## 7. Orphaned components (F4)

Zero inbound references across `app/`, `components/`, `lib/`, `config/`, `context/`, `services/`,
`packages/`, `tests/`. Verified by name and by import specifier.

| Component | Lines | Origin | Note |
|-----------|-------|--------|------|
| `components/CommandCentre.tsx` | 608 | Lidl POC | Superseded by `TodayPriorities`, which is itself now orphaned |
| `components/TodayPriorities.tsx` | 621 | Lidl POC | Unreachable since the CogniX shell replaced the cockpit landing |
| `components/BriefingCentre.tsx` | 338 | Lidl POC | Executive briefing surface; `/api/briefing` still exists |
| `components/StoreCopilot.tsx` | 311 | Lidl POC | NLQ surface; `/api/ask` still exists |
| `components/SupplyChainRadar.tsx` | 250 | Lidl POC | Supply capability now unreachable from any route |
| `components/WasteIntelligence.tsx` | 300 | Lidl POC | Waste capability now unreachable from any route |
| `components/LoginPage.tsx` | 171 | Lidl POC | Superseded by `app/login/page.tsx` |
| `components/G10XLogo.tsx` | — | CogniX | Superseded by `CognixBrandLockup` / `CognixWordmark` |

**Consequence for the Atlas:** waste and supply-chain intelligence exist as code but are not reachable
capabilities. They are **not** inventoried as available capabilities and must not be published as such.
Disposition is **not** Atlas work — reported per `AC-ATL-01-6`, not resolved.

### 7.1 Registry-level disconnection

Component orphaning is not the only kind. Consumption of each `config/` registry was measured across
`app/`, `components/`, `lib/`, `context/` and `services/`:

| Registry | Consumers | Assessment |
|----------|-----------|------------|
| `config/routes.ts` | 9 | Healthy |
| `config/environment.ts` | 6 | Healthy |
| `config/experiments.ts` | 3 | Healthy |
| `config/i18n.ts` | 3 | Healthy |
| `config/personas.ts` | 2 | Healthy |
| `config/domains.ts` | 1 | Healthy |
| `config/solutions.ts` | 1 | Healthy — `components/InnovationPortfolio.tsx` only |
| **`config/patterns.ts`** | **0** | **Superseded, deliberately.** The canonical source is `services/learning/src/learning-pattern-store.ts` `CANONICAL_LEARNING_PATTERNS`, served through `v1/learning-patterns`. `tests/unit/run-wp10d-tests.ts:159` **asserts** that zero UI components import it. This is the `WP10-D` extraction working as designed and is the estate's own precedent for ADR-046 |
| **`config/industry-packs.ts`** | **0** | **Genuinely disconnected.** `ARCHITECTURE.md` §3.5 describes it powering runtime client-context switching via `context/ClientContext.tsx` — **that file does not exist** (contradiction `C-09`). No industry-pack switching is implemented |

Two further observations:

- `config/patterns.ts` holds 5 entries while the canonical store holds **6** (`PAT-COMM-01`,
  `PAT-OPP-02`, `PAT-RISK-03`, `PAT-RIPPLE-04`, `PAT-BEH-05`, `PAT-INT-05`). The duplicate registry is
  stale as well as superseded.
- The store contains both `PAT-BEH-05` and `PAT-INT-05` — a **suffix collision** in an identifier
  namespace the Atlas will key on. Recorded as gap `G6`; **not fixed**.

---

## 8. Unbacked registry entries

**None.** All 4 `SOL-*`, all 5 `EXP-*` and all 5 `PAT-*` entries resolve to implementation evidence.
The reconciliation failure runs in the opposite direction (F1).

---

## 9. Contradictions between governance and implementation

Reported per `AC-ATL-01-8`. **None of these was fixed by `ATL-01`.**

| # | Contradiction | Evidence |
|---|--------------|----------|
| C-01 | Root `MASTER_PLAN.md:29` shows `DDF-01 … [PLANNED]`; `docs/governance/MASTER_PLAN.md:402` shows `[COMPLETED]` and implementation exists | both files |
| C-02 | `INFORMATION_ARCHITECTURE.md:63` lists patterns `PAT-COMMIT-01`, `PAT-RIPPLE-04`, `PAT-FRESH-02`, `PAT-WEATHER-06`; actual are `PAT-COMM-01`, `PAT-OPP-02`, `PAT-RISK-03`, `PAT-RIPPLE-04`, `PAT-BEH-05` — only one matches | `config/patterns.ts` |
| C-03 | `INFORMATION_ARCHITECTURE.md:61` says "all 4 flagship experiments"; the registry holds 5 | `config/experiments.ts` |
| C-04 | `ARCHITECTURE_DECISIONS.md` ADR Index lists only ADR-001…ADR-007; the register now holds ADR-001…ADR-051 | `docs/architecture/ARCHITECTURE_DECISIONS.md` |
| C-05 | `CognixSolution.dataClassification` admits `G10X Accelerator`, which is not one of the five `IP_GOVERNANCE.md` §2 classifications | `config/solutions.ts:18` |
| C-06 | `EXP-CDI-01.commercialStatus` reads `'Active CDI Foundation (CDI-01)'` while `CDI-01`…`CDI-08` are all `[COMPLETED]` | `config/experiments.ts:180` |
| C-07 | `ARCHITECTURE.md` §3.4 names `lib/ai-provider.ts` as the provider abstraction; the file does not exist — only `lib/gemini.ts` | `lib/` listing |
| C-08 | `docs/governance/MASTER_PLAN.md` §"Planned Phases 10A–10M" lists Phase 10B as *Synthetic Enterprise World* and 10C as *Tenant-Specific Enterprise Worlds*, while the completed-phase block records 10B as *Journey Telemetry* and 10C as *Shared Decision State* | `MASTER_PLAN.md:224-260` |
| C-09 | `ARCHITECTURE.md` §3.5 names `context/ClientContext.tsx` as the client-context provider; the file does not exist, and `config/industry-packs.ts` has zero consumers | `context/` holds only `AuthContext.tsx`, `DecisionStateContext.tsx`, `ToastContext.tsx` |

---

## 10. Gaps in the existing model

| # | Gap | Consequence for the Atlas |
|---|-----|---------------------------|
| **G1** | No capability carries all three ADR-047 dimensions. Solutions have no lifecycle field; experiments have no demo-maturity field; nothing has implementation status | `ATL-02` supplies the missing dimensions in the knowledge extension without altering either registry schema |
| **G2** | `EXP-MEMORY-03` is registered `Concept` while a store, an API and a test runner exist | Lifecycle states are stale; `ATL-03` must record evidence-based status and raise promotions to a human |
| **G3** | 20 governed capabilities have no registry identity at all (F1) | `ATL-03` cannot author knowledge for them without an identifier. **Decision required** — see §12 |
| **G4** | `CuriosityQuestion` content is component-resident (E-02) | ADR-046 migration confirmed as in-scope for `ATL-02` |
| **G5** | `config/industry-packs.ts` uses ids `retail_grocery`, `cpg_manufacturing`, `generic_enterprise`; `config/domains.ts` uses a different, larger catalogue | Taxonomy must reference `config/domains.ts` as the authority and map packs to it |
| **G6** | The canonical pattern store contains both `PAT-BEH-05` and `PAT-INT-05` — a suffix collision in an identity namespace | `ATL-02` must key on the full `pattern_id`, never on the numeric suffix |

---

## 11. Taxonomy confirmation

Confirmed as an **extension** of existing configuration; no competing vocabulary was created.

- **Domains** — `config/domains.ts` `DOMAIN_CATALOGUE` is the authority. `retail_grocery` is the only
  `active` domain; all others are `coming_soon`. `DEFAULT_DOMAIN_ID = 'retail_grocery'`.
- **Personas / decision lenses** — `config/personas.ts` `PERSONA_CATALOGUE` is the authority, carrying
  `decisionLens` per persona. The Atlas audience lenses in `CAPABILITY_KNOWLEDGE_MODEL.md` §8 map onto
  these ids; no new persona vocabulary is introduced.
- **Capability identity** — `SOL-*`, `EXP-*`, `PAT-*` remain the only identity namespaces.
- **Business problems** — no registry owns these today. `ATL-02` derives them from the `EXP-*`
  `problemStatement` and `CognixSolution.businessQuestion` fields rather than inventing a list.
- **Industry packs** — `config/industry-packs.ts` is a runtime demo-context switch, not a domain
  taxonomy. Mapped to domains, not merged with them (G5).

---

## 12. Decisions required before `ATL-02`

| # | Decision | Options |
|---|----------|---------|
| **D1** | How the 20 unregistered capabilities acquire identity (G3) | (a) onboard to `config/solutions.ts` / `config/experiments.ts` as part of `ATL-03`; (b) admit a third capability namespace for platform capabilities; (c) let Atlas records key on work-package identifiers (`CDI-06`, `DDF-01`) as first-class refs. **Recommendation: (c)** — it invents no new registry, matches how the estate already names these capabilities in every report and ADR, and keeps `SOL-*`/`EXP-*` meaning what they mean today |
| **D2** | Whether Atlas knowledge lives in `config/` beside the registries or in a dedicated content root | `ATL-02` scope |
| **D3** | Whether orphaned Lidl-era components are deleted, revived or left | **Not Atlas work.** Raise as separate non-Atlas work |

---

## 13. Acceptance criteria verdicts

| AC | Verdict | Evidence |
|----|---------|----------|
| `AC-ATL-01-1` **[HARD]** every row cites a file path | **MET** | §3–§7 |
| `AC-ATL-01-2` **[HARD]** all routes, API handlers and reachable components covered | **MET** | 6 pages, 69 handlers and all 44 components accounted for in §3–§7 |
| `AC-ATL-01-3` **[HARD]** three-dimension classification with field-level status | **MET, with gap G1 recorded** — dimensions absent from the registries are marked *not recorded* rather than invented | §3, §4 |
| `AC-ATL-01-4` **[HARD]** every registry entry reconciled | **MET** — 14 entries reconciled, 0 unbacked | §8 |
| `AC-ATL-01-5` **[HARD]** both storyboard versions audited, `SB-GATE` present | **MET** | companion assessment |
| `AC-ATL-01-6` unregistered and orphaned reported, not resolved | **MET** | §5, §7 |
| `AC-ATL-01-7` taxonomy is an extension | **MET** | §11 |
| `AC-ATL-01-8` contradictions listed and not fixed | **MET** — 9 recorded, 0 fixed | §9 |

---

## 14. Handoff

- **Capabilities inventoried:** 33 — 9 registered (4 `SOL-*`, 5 `EXP-*`), 20 unregistered but governed,
  4 experience/platform beyond those counted in §6.
- **By implementation status:** 21 `implemented`, 5 `partially-implemented`, 5 `simulated`,
  2 `concept`.
- **Orphaned components:** 8. **Unbacked registry entries:** 0. **Contradictions:** 8, none fixed.
- **Gaps:** G1–G6. **Decisions required:** D1–D3, with a recommendation on D1.
- **Runtime code changed by `ATL-01`:** none.
- **Next work package:** `ATL-02` — blocked on **D1** only.
