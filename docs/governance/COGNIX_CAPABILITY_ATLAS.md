# COGNIX CAPABILITY ATLAS — PROGRAMME CHARTER & EXECUTION PLAN

**Document Status:** Approved & Authoritative (governance only — no phase executed)
**Version:** 1.1.0
**Effective Date:** August 2026
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Workstream namespace:** `ATL-01` … `ATL-07`

---

## 0. Programme Status Board

> **This table is the authoritative answer to "where does the Capability Atlas stand?".**
> An agent or developer completing a work package updates this table with factual results and nothing
> else. A phase is not marked `[COMPLETED]` without the evidence its Exit Gate requires.

| Phase | Name | Status | Completed | Evidence |
|-------|------|--------|-----------|----------|
| — | Programme governance (this document set) | **[COMPLETED]** | 2026-08-20 | This document, [`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md), [`CAPABILITY_ATLAS_ARCHITECTURE.md`](../architecture/CAPABILITY_ATLAS_ARCHITECTURE.md), ADR-045…ADR-051, [`MASTER_PLAN.md`](MASTER_PLAN.md) ATL section, [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §6 |
| `ATL-01` | Capability Discovery, Governance & Information Model | **[COMPLETED]** | 2026-08-20 | [`COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md`](../reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md) (33 capabilities, 9 contradictions, 8 orphans, gaps G1–G6) · [`COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md`](../reports/COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md) (26 slides audited, SB-GATE 1/6) |
| `ATL-02` | Capability Knowledge Backend | **[COMPLETED]** | 2026-08-20 | [`COGNIX_ATL_02_CAPABILITY_KNOWLEDGE_BACKEND_REPORT.md`](../reports/COGNIX_ATL_02_CAPABILITY_KNOWLEDGE_BACKEND_REPORT.md) · `run-atl02-tests.ts` 82/82 · `tsc` 0 · build clean · 7 routes under `/api/v1/atlas/*` |
| `ATL-03` | Retail & Grocery Knowledge Population | **[COMPLETED]** | 2026-08-20 | [`COGNIX_ATL_03_KNOWLEDGE_POPULATION_REPORT.md`](../reports/COGNIX_ATL_03_KNOWLEDGE_POPULATION_REPORT.md) · 38 capabilities, 38 knowledge modules · `run-atl03-tests.ts` 29/29 · `run-atl02-tests.ts` 119/119 · `tsc` 0 · build clean |
| `ATL-04` | Atlas UX & Structured Search | **[COMPLETED]** | 2026-08-20 | [`COGNIX_ATL_04_ATLAS_UX_SEARCH_REPORT.md`](../reports/COGNIX_ATL_04_ATLAS_UX_SEARCH_REPORT.md) · `run-atl04-tests.ts` 54/54 · search-first landing, 4 lenses, 6 filters · validated at 1440/1024/720 · `tsc` 0 · build clean |
| `ATL-04R` | Unified Capability Exploration Experience | **[COMPLETED]** | 2026-08-21 | [`COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md`](../reports/COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md) · `run-atl04r-tests.ts` 116/116 · `run-atl04-tests.ts` 54/54 **unchanged** · ADR-060…ADR-063 · one Atlas (Portfolio and Questions folded in), 7 governed capability areas partitioning the registry, deterministic progressive clarification, persona lens and domain as exploration dimensions, visual explainability on 10 capabilities, About retired to a header surface, Governance renamed Observability & Governance · SB-GATE 1/6 → **3/6**, storyboard retained · validated at 1440/1024/720 · `tsc` 0 · build clean |
| `ATL-05` | Internal AI Retrieval & Ask CogniX | **[COMPLETED]** | 2026-08-20 | [`COGNIX_ATL_05_INTERNAL_AI_ASK_COGNIX_REPORT.md`](../reports/COGNIX_ATL_05_INTERNAL_AI_ASK_COGNIX_REPORT.md) · `run-atl05-tests.ts` 54/54 · internal-only retrieval, no provider adapter · `tsc` 0 · build clean |
| `ATL-06A` | External Grounding & Provenance Architecture | **[COMPLETED]** | 2026-08-21 | [`COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md`](../reports/COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md) · `run-atl06a-tests.ts` 115/115 · ADR-053, ADR-054 · policy published at `/api/v1/atlas/grounding` · no provider, no network call · `tsc` 0 · build clean |
| `ATL-06B` | Grounded Market Intelligence | **[COMPLETED]** | 2026-08-21 | [`COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md`](../reports/COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md) · `run-atl06b-tests.ts` 123/123 · `run-atl06a-tests.ts` 115/115 **unchanged** · ADR-055, ADR-056 · Google Search grounding behind the ATL-06A gate, user-initiated · `tsc` 0 · build clean |
| `ATL-06C` | AI Explanation & Hybrid Reasoning | **[COMPLETED]** | 2026-08-21 | [`COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md`](../reports/COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md) · [`COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md`](../reports/COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md) · `run-atl06c-tests.ts` 127/127 · `run-atl06a` 115 / `run-atl06b` 133 · ADR-057, ADR-058, ADR-059, ADR-067 · **`AC-ATL-06C-9` CLOSED — real credentialed round trip passed on `f1c390bc`: 25 grounding supports, 25/25 byte-offset reconstruction, S1/S2 provider invoked, S3 internal question provider NOT invoked, credential-safe failure** · `tsc` 0 · build clean |
| `ATL-06D` | Client Conversation Pack | **[COMPLETED]** | 2026-08-21 | [`COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md`](../reports/COGNIX_ATL_06D_CLIENT_CONVERSATION_REPORT.md) · `run-atl06d-tests.ts` 96/96 · every earlier suite green (`atl04` 58 and `atl04r` 118 with four assertions **re-pointed, not relaxed**) · ADR-064, ADR-065, ADR-066 · preparation reached from the Atlas, recommendation by accumulated rationale, demo steps quoted never written, warnings structural and lens-invariant, research default OFF through the unmodified ATL-06A gate · **`D-ATL-04R-1` persona residual corrected and browser-verified** · **`AC-ATL-06D-6` CLOSED — the inherited `AC-ATL-06C-9` passed live on `f1c390bc`; the market-evidence layer now rests on a validated provider path** · `run-atl06d-tests.ts` 96/96 revalidated · `tsc` 0 · build clean |
| `ATL-07` | Capability Lifecycle Governance & Automation | **[COMPLETED]** | 2026-08-21 | [`COGNIX_ATL_07_GOVERNANCE_AUTOMATION_REPORT.md`](../reports/COGNIX_ATL_07_GOVERNANCE_AUTOMATION_REPORT.md) · `run-atl07-tests.ts` 51/51 · ADR-068 · 13 checks over 38 records from one command, advisory by default, wired into CI reporting-only · **live-provider drift a first-class subject**, four checks needing no credential · engine has **no write path** — flags and blocks, never promotes · first run found **20 records claiming a lifecycle tier they do not meet**, 12 with no lifecycle state, 11 with source drift since review, 0 provider drift · `tsc` 0 · build clean |
| `ATL-FINAL` | Capability Atlas Closure, Acceptance & Baseline | **[COMPLETED]** | 2026-08-22 | [`COGNIX_ATL_FINAL_CLOSURE_REPORT.md`](../reports/COGNIX_ATL_FINAL_CLOSURE_REPORT.md) · [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md) · `run-atlfinal-tests.ts` 57/57 · **estate 35 of 35 runners green, 2,314 counted assertions, zero failures** · ADR-062 Amendment A · **a closure and acceptance pass, not a feature phase and not `ATL-08`** · **GOVERNANCE CLEAN — 0 blocking, `--enforce` exits 0**: the 20 `GOV-REC-1` tier gaps closed by authoring each capability's own premise, no two records sharing an assumption · 12 lifecycle nulls preserved and measured by capability type (9 of 9 `enabling-service`) · `data_sources` 3 → 14, the other 24 left absent rather than guessed · `external_evidence` still 0 with no rule relaxed · `CDI-07A`/`CDI-07B` split decision **closed on route evidence — do not split**, registry stays at 38 · `tsx` declared, `cdi07a` 155/0 and `cdi07b` 235/0 · Atlas Health added as the 7th Observability & Governance section, four lenses, counts declared overlapping and repository checks declared unmeasured · SB-GATE re-evaluated as governed data, **3/6, storyboard RETAINED, gate not weakened** · runbook rewritten to v2.0.0 carrying no figures of its own · browser acceptance at 1440/1024/720 with no overflow or clipping — **which found what no suite could: navigation unreachable below 1024px, a hyphenated query reaching nothing, and the corpus's own noun scoring as a content word** · `tsc` 0 · build clean · credential isolation passes |

**Current phase:** none — **the programme is complete and baselined.** `ATL-01` … `ATL-07` and `ATL-FINAL` are all `[COMPLETED]`
**Last completed Atlas activity:** `ATL-FINAL` completed 2026-08-22. Governance is clean: 0 blocking findings, `--enforce` exits 0, 35 of 35 runners green
**Next executable work package:** none. Subsequent work is ordinary capability maintenance under this governance
**Outstanding for an owner:** confirm the 20 authored lifecycle assumptions at each record's next scheduled review (register R-13) · decide a lifecycle state, or none, for the three records outside `enabling-service` that carry no state (R-12) · decide which check families become blocking in CI · decide whether to commission the market study that would populate `external_evidence` (R-04)

> **`ATL-FINAL` baselined the programme, 2026-08-22.** A closure and acceptance pass — registered as
> `ATL-FINAL`, deliberately **not** `ATL-08`, because it added no capability. It reconciled eighteen
> residuals into [`COGNIX_ATLAS_RESIDUAL_REGISTER.md`](COGNIX_ATLAS_RESIDUAL_REGISTER.md), classified
> every one, and **closed seven while leaving eleven open with the reason recorded** — the open rows
> being the evidence that nothing was fabricated to reach a clean sheet. Governance is now clean:
> the 20 tier gaps closed by authoring the premise each capability's own architecture rests on, with
> no two records sharing an assumption; the 12 lifecycle nulls preserved and, more usefully, measured
> — **all nine `enabling-service` capabilities, 9 of 9**, because the innovation lifecycle describes
> how an idea matures through the lab and the platform substrate underneath was built rather than
> incubated. `data_sources` rose 3 → 14 and stopped there, because a mechanical sweep of the other 24
> produced provenance claims that were wrong on inspection. `external_evidence` is still 0 and no
> allowlist, provenance or freshness rule was relaxed to change that.
>
> **What a browser found that 2,314 assertions could not.** Below 1024px the entire navigation was
> unreachable — `.sidebar.open` had existed since the original stylesheet and nothing had ever set the
> class. The query `pre-mortem` returned nothing while the corpus contains that spelling eleven times.
> The word `capability` scored as a content word in a corpus of capabilities, so a question naming one
> area reached 27 of 38 records. All three are properties of the running product rather than of any
> module, which is `ADR-068`'s fixture argument one layer up. All three are fixed (ADR-062 Amendment A),
> and `run-atlfinal-tests.ts` now watches each.
>
> **`CDI-07A`/`CDI-07B` closed — do not split.** Every artefact of both is a nested sub-resource of a
> decision contract, so neither passes the *independently reused* limb of the capability test, and
> neither is unaddressable today. The registry stays at 38. **SB-GATE re-evaluated as governed data:
> 3 of 6, storyboard RETAINED, gate not weakened.**

> **`ATL-07` completed the build phases, 2026-08-21 (ADR-068).** Governance runs from one command over
> 38 records and 13 checks, advisory by default and wired into CI reporting-only. **Live-provider
> drift is a first-class subject**: `config/atlas-provider-verification.ts` records what was verified,
> the commit it passed on and the files whose change invalidates it, and four checks run from it
> **without needing a credential** — drift when the provider layer moves ahead of that commit,
> staleness when the verification ages, a blocking failure when the configured model is not the one
> that passed, and a blocking failure when the verification cites a file that has gone. That is the
> `ATL-06` lesson made structural: three defects reached a credentialed run while every fixture-backed
> suite stayed green, because fixtures prove refusal behaviour a live search cannot produce on demand
> and cannot notice a contract moving. **The engine has no write path** — it flags and blocks and never
> promotes a maturity state, asserted rather than promised. Nothing in the corpus was changed to
> improve the first run's numbers.

> **Model-configuration defect found and corrected, 2026-08-21 (ADR-067).** Diagnosis of the failing
> round trip established that the Atlas was requesting **retired model aliases**: `gemini-2.5-flash`
> and friends were hard-coded independently in `lib/gemini.ts`, the grounding adapter, the
> interpretation adapter and the live validation script. All four went stale together and **every
> fixture-backed test kept passing**, because a recorded response cannot notice that the model named
> in the request no longer exists. Model selection is now one governed server-side configuration,
> `config/gemini-models.ts`, resolved at call time by every call site, defaulting to the verified
> **`gemini-3.6-flash`** and overridable through `GEMINI_MODEL`. The default is a **single** model,
> not a chain: a chain is how the defect hid, since a retired primary quietly became a working
> secondary. A model name written anywhere else in the provider layer is now a test failure. This
> also un-breaks the CDI-01 drafting route (ADR-044), which reached Gemini through the same stale
> list. **No admission, provenance, contradiction, freshness or rejection policy changed.**
>
> `AC-ATL-06C-9` is **still open**: with the model corrected, the only remaining prerequisite is a
> credential, which has not reached any build session.

> **Live grounding contract corrected, 2026-08-21 (segment offsets).** The first real Gemini 3.6
> grounded response established that `groundingSupports[].segment.startIndex` is **omitted when it is
> zero** — protobuf elides default values — while `endIndex` is always present. The first of twenty
> supports arrived as `{ endIndex, text }`. The pipeline itself was already correct: byte-offset
> reconstruction succeeded for every checked segment. The failure was in the **validator's schema
> assumption**, which demanded both indices and therefore skipped the opening claim of the answer —
> usually the strongest one in it.
>
> Corrected: `endIndex` is now **required** in the governed types, an absent `startIndex` is read as
> byte 0, an explicit one is still used, and **exact reconstruction against `segment.text` is now
> mandatory rather than assumed** — a segment whose offsets do not reproduce its own quoted text is
> dropped as internally inconsistent, as is one with no usable end. Regression fixtures record the
> real first-segment shape, a missing `endIndex` and an inconsistent pair. Because the defect was in
> the check rather than the pipeline, the validator's own assertions are now regression-tested
> against the recorded live shape. **No ATL-06A/B admission, provenance, freshness, contradiction,
> allowlist or rejection policy changed** — those files are untouched.

> **`ATL-04R` is a refinement of `ATL-04`, inserted after it and completed before `ATL-06D`.** It does
> not reopen `ATL-04`, whose history stands: `ATL-04` proved the backend-driven Atlas, the structured
> discovery model and the first UI, and its acceptance criteria remain met. What evaluation of the
> working interface then showed was that the information architecture was sound but the interaction
> architecture exposed too many controls, fragmented Capability Atlas, Portfolio and Questions into
> separate experiences, and behaved more like a searchable catalogue than an innovation exploration
> environment. `ATL-04R` addresses that and nothing else; the Atlas backend, capability registry,
> knowledge corpus, deterministic search, Questions Worth Asking model, Ask CogniX trust boundaries
> and grounding architecture are unchanged apart from one proven Level 1 defect (ADR-062).

> **`AC-ATL-06C-9` CLOSED, 2026-08-21 — the `ATL-06` family is complete.** A real credentialed
> Gemini/Search grounding round trip passed on commit `f1c390bc` against `gemini-3.6-flash`:
> `groundingMetadata` present, **25 grounding supports, 25/25 exact byte-offset reconstruction**,
> `S1` and `S2` market questions invoking the provider correctly, `S3` — the internal *how does
> Decision Gap work* question **with research explicitly requested** — **not invoking the provider at
> all**, and credential-safe failure behaviour. `S3` is the load-bearing result: ADR-056 holding under
> live conditions, measured as a call count of zero rather than read off the output.
>
> The run **corrected nothing**, which is the point. Admission, provenance, freshness, contradiction,
> allowlist and rejection policy are byte-identical to `ATL-06A`/`ATL-06B`. Sanitised evidence in
> [`COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md`](../reports/COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md);
> the raw `live-evidence.json` is diagnostic material, is git-ignored and is never committed.
>
> Closing this also closed **`AC-ATL-06D-6`**, which existed only to carry it forward: `ATL-06D`'s
> market-evidence layer now rests on a validated provider path, and both phases are `[COMPLETED]`.
> Two blockers preceded it and are recorded below — a missing server-side credential path and a
> retired model alias — because the sequence is the lesson: fixture-backed suites cannot notice
> either, which is exactly why the live gate existed.

> **Model-configuration defect found and corrected, 2026-08-21 (ADR-067).** Diagnosis of the failing
> round trip established that the Atlas was requesting **retired model aliases**: `gemini-2.5-flash`
> and friends were hard-coded independently in `lib/gemini.ts`, the grounding adapter, the
> interpretation adapter and the live validation script. All four went stale together and **every
> fixture-backed test kept passing**, because a recorded response cannot notice that the model named
> in the request no longer exists. Model selection is now one governed server-side configuration,
> `config/gemini-models.ts`, resolved at call time by every call site, defaulting to the verified
> **`gemini-3.6-flash`** and overridable through `GEMINI_MODEL`. The default is a **single** model,
> not a chain: a chain is how the defect hid, since a retired primary quietly became a working
> secondary. A model name written anywhere else in the provider layer is now a test failure. This
> also un-breaks the CDI-01 drafting route (ADR-044), which reached Gemini through the same stale
> list. **No admission, provenance, contradiction, freshness or rejection policy changed.**
>
> `AC-ATL-06C-9` is **still open**: with the model corrected, the only remaining prerequisite is a
> credential, which has not reached any build session.

> **Live grounding contract corrected, 2026-08-21 (segment offsets).** The first real Gemini 3.6
> grounded response established that `groundingSupports[].segment.startIndex` is **omitted when it is
> zero** — protobuf elides default values — while `endIndex` is always present. The first of twenty
> supports arrived as `{ endIndex, text }`. The pipeline itself was already correct: byte-offset
> reconstruction succeeded for every checked segment. The failure was in the **validator's schema
> assumption**, which demanded both indices and therefore skipped the opening claim of the answer —
> usually the strongest one in it.
>
> Corrected: `endIndex` is now **required** in the governed types, an absent `startIndex` is read as
> byte 0, an explicit one is still used, and **exact reconstruction against `segment.text` is now
> mandatory rather than assumed** — a segment whose offsets do not reproduce its own quoted text is
> dropped as internally inconsistent, as is one with no usable end. Regression fixtures record the
> real first-segment shape, a missing `endIndex` and an inconsistent pair. Because the defect was in
> the check rather than the pipeline, the validator's own assertions are now regression-tested
> against the recorded live shape. **No ATL-06A/B admission, provenance, freshness, contradiction,
> allowlist or rejection policy changed** — those files are untouched.

> **`ATL-04R` is a refinement of `ATL-04`, inserted after it and completed before `ATL-06D`.** It does
> not reopen `ATL-04`, whose history stands: `ATL-04` proved the backend-driven Atlas, the structured
> discovery model and the first UI, and its acceptance criteria remain met. What evaluation of the
> working interface then showed was that the information architecture was sound but the interaction
> architecture exposed too many controls, fragmented Capability Atlas, Portfolio and Questions into
> separate experiences, and behaved more like a searchable catalogue than an innovation exploration
> environment. `ATL-04R` addresses that and nothing else; the Atlas backend, capability registry,
> knowledge corpus, deterministic search, Questions Worth Asking model, Ask CogniX trust boundaries
> and grounding architecture are unchanged apart from one proven Level 1 defect (ADR-062).

> **`ATL-06C` is implementation-complete and live-validation-pending.** Every acceptance criterion is
> met against recorded fixtures and against the **live** `generativelanguage.googleapis.com` endpoint
> for the request contract — Google's own schema validator accepts `tools: [{ googleSearch: {} }]` and
> the structured `responseSchema`, rejecting only the credential, while an unknown tool name is
> rejected as an unknown field. What has **not** happened is a credentialed round trip: this
> environment holds no `GEMINI_API_KEY`. Run
> `GEMINI_API_KEY=… npx tsx scripts/atlas-live-grounding-check.ts "<question>"` to close it. The
> phase is not marked `[COMPLETED]` until that is done.
>
> **Attempted 2026-08-21; the runtime configuration gap is closed, the credential is still absent.**
>
> *Configuration — done.* The wiring already existed: `docker-compose.yml` and
> `docker-compose.ec2.yml` pass `GEMINI_API_KEY` through and `.env.example` documented it. What was
> wrong was that `README.md`, `docker-compose.ec2.yml`, `.gitlab-ci.yml` and `ops/ci-deploy-remote.sh`
> all told operators the key "is entered in the app UI", and nothing checked at deploy time — so the
> variable went unset and the governed routes were inert everywhere, correctly and silently. Those
> statements are corrected, `.env.example` now names the Atlas routes and the never-rules, and the
> deploy script warns when the variable is absent (warns, not blocks: the routes fail closed by
> design). **ADR-044 Amendment A** records the underlying divergence — two Gemini credential paths,
> the legacy client-supplied-key mechanism retained as **technical debt** and closed to new use. The
> legacy routes were not touched.
>
> *Isolation — proven.* `scripts/atlas-credential-isolation-check.sh` builds with a sentinel and
> confirms it appears in no client chunk, no build output, and is not inlined into the server build;
> `run-atl06c-tests.ts` group N calls ten Atlas routes with a sentinel credential set and finds it in
> none of the response bytes and nothing logged, plus static checks on client components,
> `next.config.ts`, the two adapter reads, `.env.example` and `.gitignore`.
>
> *Credential — still absent.* No `GEMINI_API_KEY` in the session, no `.env` file, both adapters
> report `isConfigured(): false`, and the runtime's `CLOUDSDK_AUTH_ACCESS_TOKEN` is refused by the
> Gemini API as `ACCESS_TOKEN_TYPE_UNSUPPORTED`. Nothing is left to build; the round trip needs a key.
> The check script encodes all three required scenarios and captures contract drift, byte-offset
> extraction, redirect resolution, publisher/date availability, admission and rejection, discarded
> prose, Search Suggestions, latency and failure behaviour, exiting non-zero unless every check
> passes.

> **`ATL-06` was split into four on owner decision, 2026-08-21.** The single phase carried provider
> integration, external grounding, provenance, three-class evidence separation, a market corpus and
> the client conversation pack. Those are four different risk profiles: the grounding and provenance
> architecture must be provable **before** any provider exists, or the first provider becomes the de
> facto specification. `ATL-06A` therefore establishes and tests the contract with no adapter shipped;
> `ATL-06B` adds the provider behind it; `ATL-06C` supplies market content; `ATL-06D` assembles the
> pack. Sequencing is strict: **`ATL-06A` → `ATL-06B` → `ATL-06C` → `ATL-06D`**.

> **Owner decision, 2026-08-21 — `ATL-06B` and `ATL-06C` redefined.** `ATL-06B` is **Grounded Market
> Intelligence**: the provider, external retrieval, source admission and rejection, freshness and the
> visible **Market Context** evidence class. **AI Interpretation moves to `ATL-06C`**, which now owns
> hybrid reasoning across the three classes rather than market content — market evidence and the
> judgement drawn from it are different risks and are gated separately. Two consequences are recorded
> rather than absorbed: `ATL-06C` no longer means "market corpus", and **Level 2 semantic retrieval,
> chartered under the earlier `ATL-06B`, is descoped and not yet assigned to a phase**. It is
> reported as undelivered at `GET /api/v1/atlas/grounding` so it cannot be lost by renaming.
**Blocked by other CogniX work:** NO

Status vocabulary follows `MASTER_PLAN.md`: `[NOT STARTED]` · `[IN PROGRESS]` · `[BLOCKED]` ·
`[PLANNED]` · `[COMPLETED]`.

### 0.1 Documents referenced but not yet created

Forward references, not broken links. Each is an output of a work package not yet executed.

| Document | Created by | Status |
|----------|-----------|--------|
| [`COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md`](../reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md) | `ATL-01` | **Created 2026-08-20** |
| [`COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md`](../reports/COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md) | `ATL-01` | **Created 2026-08-20** |

No forward references remain outstanding.

`ATL-01` reports are placed in `docs/reports/` following the estate's existing convention
(`COGNIX_<WP>_<SUBJECT>_REPORT.md`).

---

## 1. What the Capability Atlas Is

> **The CogniX Capability Atlas is the governed knowledge, discovery, explanation and enablement layer
> for the CogniX Enterprise Innovation Lab.**

Positioning line for product surfaces:

> *Explore what CogniX can do, how capabilities work, where they apply, how to demonstrate them, and
> how they can be reused.*

It serves, from one governed source: Innovation Executives · Sales and client-facing teams · Solution
Architects · Enterprise Architects · Developers · Test engineers · Product and Innovation teams ·
future AI assistants and autonomous agents.

"Feature Catalogue" is a narrower concept and is used only when contrasting terminology.

### 1.1 The Atlas is an extension, not a second model (binding — ADR-045)

CogniX already holds capability knowledge in typed registries. The Atlas **does not replace them and
does not duplicate their fields**:

| Existing authority | Owns | Atlas relationship |
|--------------------|------|--------------------|
| [`DEMONSTRATION_SOLUTION_MODEL.md`](DEMONSTRATION_SOLUTION_MODEL.md) + `config/solutions.ts` | `CognixSolution` — the canonical Demonstration Solution contract (`SOL-*`) | **Referenced.** The Atlas consumes these fields and never restates them |
| [`EXPERIMENT_MODEL.md`](EXPERIMENT_MODEL.md) + `config/experiments.ts` | Innovation Experiments (`EXP-*`) | **Referenced.** Experiments are Atlas capabilities of a different asset type |
| [`EXPERIMENT_LIFECYCLE.md`](EXPERIMENT_LIFECYCLE.md) | The seven innovation lifecycle states | **Adopted unchanged** (ADR-047) |
| [`IP_GOVERNANCE.md`](IP_GOVERNANCE.md) | IP classification and the value progression hierarchy | **Adopted unchanged** |
| `config/domains.ts` | `DOMAIN_CATALOGUE` — domains, `active` / `coming_soon` | **Adopted as the Atlas domain taxonomy** |
| `config/personas.ts` | `PERSONA_CATALOGUE` with `decisionLens` | **Adopted as the Atlas audience-lens taxonomy** |
| `config/patterns.ts` | Enterprise learning patterns (`PAT-*`) | **Referenced** as evidence |
| [`COGNIX_PRINCIPLES.md`](COGNIX_PRINCIPLES.md) Principle 13 | Evidence, provenance, no fake intelligence | **Adopted unchanged** — the Atlas content standard is Principle 13 applied to capability knowledge |

**A capability has exactly one identity — a stable `CAP-*` identifier** denoting *what CogniX can do*
(ADR-052). `SOL-*`, `EXP-*`, `PAT-*` and work-package identifiers remain separate governed identities,
reached from a capability by typed relationship — *demonstrated-by*, *originated-as*, *evidenced-by*,
*delivered-by*. The relationships are many-to-many in both directions: `DDF-01` delivered four
capabilities; `CDI-08` and `ESF-6` together deliver one.

A `CAP-*` identifier is minted **only on implementation evidence** — a contract, an engine, a route, a
test or a report. A capability that exists only as a plan is admitted at `implementation status`
`roadmap` or `concept` and labelled as such, never as something CogniX can do today.

*(This resolves `ATL-01` decision `D1` and amends ADR-045, whose original clause assumed every
capability was already registered as a `SOL-*` or `EXP-*`. `ATL-01` found twenty that are not. See
ADR-045 Amendment A.)*

The knowledge the Atlas adds — architecture, implementation references, contracts, usage, test
procedures, validation evidence, demo paths, client questions and responses, market evidence,
competitive context, cross-domain reuse, provenance, search and retrieval metadata, the capability
relationship graph, ownership and review lifecycle, known limitations — is specified in
[`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md).

### 1.2 Terminology honesty (binding)

Concepts discussed during Atlas ideation are **not** capabilities until repository evidence exists:

| Term | Repository status at 2026-08-20 | Atlas treatment |
|------|--------------------------------|-----------------|
| **Decision Gap** | Exists — `DDF-01` P0-B, ADR-041 | Real capability, inventory it |
| **Decision Window** | Exists — `DDF-01`, ADR-042 | Real capability, inventory it |
| **Decision Regret** | Exists — `DDF-01` P0-C, ADR-043 | Real capability, inventory it |
| **Forecast Stability** | Exists — `DDF-01` P0-A, ADR-040 | Real capability, inventory it |
| **Demand Decision Frontier** | Exists — `DDF-01` | Real capability; always written with the "Demand" qualifier (ADR-043) |
| **Intent Fusion** | Exists — `IFI-01` | Real capability, inventory it |
| **Demand Fusion** | **Does not exist anywhere** | Never described as implemented. Concept only, or omitted |
| **Forecast Regret** | **Does not exist anywhere** | Never described as implemented. Not a synonym for Decision Regret — ADR-043 rules that decision regret is *not* forecast-error cost, so conflating them would contradict a frozen ruling |

`ATL-01` classifies every concept from repository evidence, never from ideation vocabulary.

---

## 2. Information Architecture

```text
Domain → Business Problem → Capability → Feature / Experiment → Evidence / Artefacts
```

Domains are data (ADR-002 — client-neutral core with configurable industry packs), sourced from
`config/domains.ts`. Retail & Grocery (`retail_grocery`) is the only `active` domain; the remainder are
`coming_soon`. Nothing in the schema, storage, API or UI may hard-code a domain.

A capability may hold several domain placements *and* a cross-domain reuse classification, expressed
through the existing `CognixSolution.applicableIndustries` plus the Atlas reuse assessment.

---

## 3. Programme Phase Map

```text
ATL-01  Capability Discovery, Governance & Information Model     (no runtime code)
   │
   └──► ATL-02  Capability Knowledge Backend
           │
           ├──► ATL-03  Retail & Grocery Knowledge Population
           │        │
           └────────┴──► ATL-04  Atlas UX & Structured Search
                            │
                            └──► ATL-05  Internal AI Retrieval & Ask CogniX
                                     │
                                     └──► ATL-06A External Grounding & Provenance Architecture
                                              │   (contract, policy, admission, contradiction; no provider)
                                              └──► ATL-06B Grounded Market Intelligence
                                                       │   (provider, retrieval, admission, Market Context)
                                                       └──► ATL-06C AI Explanation & Hybrid Reasoning
                                                                │   (premises, verification, refusal ledger)
                                                                │
                                                                └──► ATL-06D Client Conversation Pack
   ATL-02 + ATL-03 ──────────────────────► ATL-07  Lifecycle Governance & Automation
                                                   (may run parallel to ATL-05 / ATL-06*)
```

Dependency classification follows `MASTER_PLAN.md`: **HARD** — cannot proceed without;
**INTEGRATION** — develops independently, needed for end-to-end flow; **ENHANCEMENT** — enriches but
does not block.

---

## 4. Work Package Specifications

Each phase below carries the estate's WP contract fields plus the resumability fields the Atlas
programme requires: *Implementation Allowed*, *Commit/Push Permitted*, *Handoff*, *Next WP*.

---

### `ATL-01` — Capability Discovery, Governance & Information Model [COMPLETED]

- **Objective:** Establish the authoritative Atlas foundation — a forensic, evidence-reconciled
  inventory of what CogniX actually does, reconciled against the existing registries, contracts and
  tests, plus the dual-version storyboard audit required by ADR-051.
- **Rationale:** Every later phase rests on knowing what exists. An inventory built from documentation
  rather than implementation would propagate exactly the class of defect the `DDF-01` register
  caught (`D-DDF-1`, `D-DDF-2`, `D-DDF-3`).
- **Hard Dependencies:** none. `ATL-01` is the programme entry point.
- **Integration Dependencies:** none. **Enhancement Dependencies:** none.
- **Inputs:** `config/solutions.ts`, `config/experiments.ts`, `config/patterns.ts`, `config/domains.ts`,
  `config/personas.ts`, `config/industry-packs.ts`; `app/` routes and `app/api/v1/*`; `components/`;
  `lib/`; `packages/contracts/`; `services/`; `tests/unit/` (25 runners); `docs/governance/`,
  `docs/architecture/`, `docs/reports/` (40+ WP reports); `MASTER_PLAN.md`; git history where a claim
  cannot be settled from the tree.
- **Scope:**
  - Forensic capability inventory. Every row cites file paths and, where applicable, the test runner
    and acceptance criteria that validate it. Every capability classified on all three ADR-047
    dimensions — innovation lifecycle, demonstration maturity, implementation status — at field level
    where they differ.
  - Reconciliation of the inventory against `SOL-*`, `EXP-*` and `PAT-*` registry entries. Capabilities
    present in code but absent from every registry are reported as **unregistered capabilities**;
    registry entries with no implementation evidence are reported as **unbacked registry entries**.
    Neither is silently resolved.
  - Orphaned and disconnected capability detection — components not reachable from routing, registry
    entries not reachable from any surface, contracts with no consumer.
  - Atlas knowledge-extension mapping: for each capability, which knowledge already exists in a
    registry or report, and which Atlas fields are genuinely new.
  - Confirmation or correction of the domain, sub-domain, business-problem, persona and tag
    vocabularies against `config/domains.ts` and `config/personas.ts`. **Extension, not replacement.**
  - **Dual-version storyboard audit (ADR-051):** the 12-slide `components/ArchitectureExplorer.tsx` on
    this line and the 14-slide historical version on `main` / `fix/storyboard-presentation-recovery`,
    inspected **read-only via `git show`**, with a retain/discard decision and a destination for every
    unit of architectural knowledge, and the `SB-GATE` checklist.
- **Non-Scope:** any runtime Atlas functionality; any registry schema change; any storyboard code
  change; any merge, cherry-pick or port from `main`; resolution of pre-existing inconsistencies
  outside the Atlas (report them, do not fix them).
- **User Stories:**
  - *Atlas programme owner:* As the owner, I want an inventory reconciled against implementation and
    tests so that no later Atlas phase publishes a capability CogniX does not have.
  - *Future agent:* As an agent with no conversation history, I want to know which capabilities are
    registered, unregistered and unbacked so that I can populate knowledge without inventing it.
- **Technical Work Packages:** `ATL-01.1` inventory · `ATL-01.2` registry reconciliation ·
  `ATL-01.3` taxonomy confirmation · `ATL-01.4` dual-version storyboard audit.
- **UX Work:** none.
- **Acceptance Criteria:**
  - `AC-ATL-01-1` **[HARD]** Every inventory row cites at least one concrete file path. Rows with no
    code evidence are classified `roadmap` or `concept` and marked *documentation-only claim*.
  - `AC-ATL-01-2` **[HARD]** Every route under `app/`, every handler under `app/api/v1/`, and every
    component reachable from routing appears in the inventory or is explicitly listed as excluded with
    a reason.
  - `AC-ATL-01-3` **[HARD]** Every capability classified on all three ADR-047 dimensions, with
    field-level status where the dimensions disagree.
  - `AC-ATL-01-4` **[HARD]** Every `SOL-*`, `EXP-*` and `PAT-*` registry entry reconciled to
    implementation evidence or reported as unbacked.
  - `AC-ATL-01-5` **[HARD]** Both storyboard versions audited; every unit of knowledge carries a
    retain/discard decision and a destination; `SB-GATE` checklist present with each item's state.
  - `AC-ATL-01-6` Unregistered capabilities and orphaned components reported, not resolved.
  - `AC-ATL-01-7` Taxonomy confirmed as an extension of `config/domains.ts` and `config/personas.ts`;
    no competing vocabulary introduced.
  - `AC-ATL-01-8` Contradictions between governance documents and implementation listed with evidence,
    and explicitly **not** fixed.
- **Test Requirements:** none — `ATL-01` changes no runtime code. Existing suites must remain
  untouched and are not run unless a runtime file changed.
- **Verification Commands:**
  ```bash
  git status --porcelain
  git diff --check
  ls app/api/v1/*/route.ts
  grep -rn "case '" app/page.tsx
  git show origin/main:components/ArchitectureExplorer.tsx | grep -c "title: '"
  grep -c "title: '" components/ArchitectureExplorer.tsx
  ```
- **Exit Gate:** a developer with no conversation history can read the inventory report and state, for
  any CogniX capability, what it is, where it is implemented, what validates it, how mature it is on
  all three dimensions, and whether it is registered — without opening the code.
- **Completion Evidence:** the two `docs/reports/` documents exist; §0 shows `ATL-01 [COMPLETED]` with
  a date; the handoff records inventory counts by classification.
- **Implementation Allowed:** **NO.** Documentation and analysis only. The single permitted code change
  is a trivial non-functional correction demanded by a governance validation (for example a broken
  relative link), which must be called out explicitly.
- **Commit/Push Permitted:** yes, on the Atlas branch, at completion.
- **Risks:** inventory drifting to documentation-led claims — mitigated by `AC-ATL-01-1`; storyboard
  audit cost across two versions — mitigated by auditing at slide granularity via the `SlideData`
  fields rather than line by line.
- **Decisions Outstanding:** whether unregistered capabilities are onboarded to `config/solutions.ts`
  during `ATL-03` or raised as separate non-Atlas work.
- **Downstream Dependencies:** unlocks `ATL-02`. **Next WP:** `ATL-02`.

#### `ATL-01` Handoff (completed 2026-08-20)

- **Delivered:** [`COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md`](../reports/COGNIX_ATL_01_CAPABILITY_INVENTORY_REPORT.md) and [`COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md`](../reports/COGNIX_ATL_01_STORYBOARD_MIGRATION_ASSESSMENT.md).
- **Inventory:** 33 capabilities — 9 registered (4 `SOL-*`, 5 `EXP-*`), 20 governed but **unregistered**, 4 further experience/platform. By implementation status: 21 `implemented`, 5 `partially-implemented`, 5 `simulated`, 2 `concept`.
- **Principal finding:** the registries describe a fraction of the estate. `CDI-02`…`CDI-08`, `DDF-01` (with Forecast Stability, Decision Gap, Decision Window, Decision Regret), `IFI-01`, `ESF-1`/`-2`/`-3`/`-6` and `WP10-B`/`-C`/`-D` are each contracted, engine-backed, API-exposed, test-covered and reported — and discoverable from no registry.
- **Orphaned components:** 8, six of them Lidl-era. Waste and supply-chain intelligence exist as code but are unreachable and are **not** inventoried as available capabilities.
- **Unbacked registry entries:** 0. **Contradictions recorded, none fixed:** 9 (`C-01`…`C-09`).
- **Gaps:** `G1` no capability carries all three ADR-047 dimensions · `G2` stale lifecycle states · `G3` 20 capabilities without registry identity · `G4` `CuriosityQuestion` content is component-resident · `G5` industry packs are not a domain taxonomy · `G6` a `PAT-*` suffix collision in the canonical pattern store.
- **`SB-GATE`: 1 of 6 met.** The Architectural Storyboard **must not be retired**; it remains untouched. Two units of historical knowledge need a new home — the four-quadrant value framework and the hub-and-spoke reuse model.
- **Blocking decision for `ATL-02`:** **D1** — how the 20 unregistered capabilities acquire identity. Recommendation: key Atlas records on work-package identifiers (`CDI-06`, `DDF-01`) as first-class refs, inventing no new registry.
- **Runtime code changed:** none. Storyboard code untouched. No merge from `origin/main`.

---

### `ATL-02` — Capability Knowledge Backend [COMPLETED]

- **Objective:** Extend the existing registries into a governed capability knowledge layer with
  validation, repository access and read APIs, so that Atlas knowledge is served from data and never
  authored in a component.
- **Rationale:** ADR-046. The estate already proves both patterns — typed registries in `config/`, and
  capability knowledge trapped inside `components/QuestionsWorthAsking.tsx`.
- **Hard Dependencies:** `ATL-01` (inventory, taxonomy confirmation).
- **Integration Dependencies:** existing registries (`config/solutions.ts`, `config/experiments.ts`).
- **Enhancement Dependencies:** `packages/contracts` conventions.
- **Scope:** the `CAP-*` capability identity namespace and — where `ATL-02` judges it justified — a
  canonical `config/capabilities.ts` registry, established with the **minimal** schema and migration
  needed to add capability identity **without duplicating** existing `CognixSolution`, experiment,
  pattern or lifecycle metadata (ADR-052); canonical `CapabilityKnowledge` extension type keyed on
  `capabilityId` with typed relationships to `SOL-*` / `EXP-*` / `PAT-*` / work packages;
  validator implementing the mandatory/recommended/optional tiers and validation rules of
  [`CAPABILITY_KNOWLEDGE_MODEL.md`](CAPABILITY_KNOWLEDGE_MODEL.md); repository abstraction over the
  registry; read APIs under `app/api/v1/atlas/*` with filtering; relationship resolution; versioning,
  provenance and review-date handling; migration of `QuestionsWorthAsking` content out of the
  component into the registry; a test runner following the `tests/unit/run-*-tests.ts` convention.
- **Non-Scope:** any Atlas UI; any semantic index; any AI; any change to `CognixSolution` field
  semantics; any database.
- **Acceptance Criteria:**
  - `AC-ATL-02-1` **[HARD]** No capability prose in any component; components read the API.
  - `AC-ATL-02-2` **[HARD]** The validator rejects a record missing a mandatory field and names it.
  - `AC-ATL-02-3` **[HARD]** Every `capabilityId` is a unique, well-formed `CAP-*`; every
    `demonstratedBy` / `originatedAs` / `evidencedBy` / `deliveredBy` entry resolves to an existing
    governed identity; a dangling reference fails validation.
  - `AC-ATL-02-8` **[HARD]** No `CognixSolution`, experiment, pattern or lifecycle value is copied into
    a capability record — each is resolved through its relationship (ADR-045 unamended portion, ADR-052).
  - `AC-ATL-02-9` **[HARD]** The four `DDF-01` capabilities — Forecast Stability, Decision Gap,
    Decision Window, Decision Regret — carry four distinct `CAP-*` identifiers, are independently
    retrievable, and all four resolve `deliveredBy: ['DDF-01']`. This is the cardinality case that
    decided ADR-052 and is the model's acceptance test.
  - `AC-ATL-02-10` Identifiers are matched in full, never by numeric suffix (`ATL-01` gap `G6`).
  - `AC-ATL-02-4` **[HARD]** Filtering works for domain, sub-domain, business problem, persona lens,
    lifecycle state, demo maturity, implementation status, cross-domain applicability and tags.
  - `AC-ATL-02-5` **[HARD]** `QuestionsWorthAsking` renders identically from the registry; no
    behavioural regression.
  - `AC-ATL-02-6` Registry field values are referenced, never copied, into Atlas records.
  - `AC-ATL-02-7` `tsc` clean; full existing regression green; production build clean.
- **Test Requirements:** new `tests/unit/run-atl02-tests.ts` with semantic assertions executing real
  route handlers; every existing runner green at its recorded baseline.
- **Verification Commands:**
  ```bash
  npx tsc --noEmit
  npx tsx tests/unit/run-atl02-tests.ts
  npm run build
  git diff --check
  ```
- **Exit Gate:** a developer can retrieve any capability's full governed knowledge through one API
  call, filtered by any supported dimension, with no AI configured.
- **Implementation Allowed:** YES — backend and contracts only.
- **Commit/Push Permitted:** yes.
- **Risks:** over-engineering persistence — ADR-046 permits the simplest version-controlled registry;
  escalation requires a new ADR. Regression in the existing `QuestionsWorthAsking` surface — mitigated
  by `AC-ATL-02-5`.
- **Decisions Resolved:** `D1` — capability identity is a first-class `CAP-*` namespace (ADR-052,
  approved 2026-08-20).
- **Decisions Outstanding:** whether a canonical `config/capabilities.ts` is justified and its minimal
  schema (`ATL-02` to determine, per ADR-052); the `CAP-*` identifier allocation scheme; whether Atlas
  knowledge lives in `config/` beside the registries or in a dedicated content root; the test-runner
  invocation convention for new suites.
- **Completion Evidence:** [`COGNIX_ATL_02_CAPABILITY_KNOWLEDGE_BACKEND_REPORT.md`](../reports/COGNIX_ATL_02_CAPABILITY_KNOWLEDGE_BACKEND_REPORT.md). `tsc` 0 diagnostics; `run-atl02-tests.ts` 82/82; 23 of 25 existing runners exit-0 with every recorded baseline held exactly, and the two that do not fail **identically on the untouched baseline** (a missing `tsx` dependency in a spawned child process, proven by worktree comparison); `npm run build` clean with all 7 Atlas routes registered.
- **Handoff:** the identity/knowledge boundary is enforced, not merely documented — V2 bounds the registry summary, test M2 asserts no long-form field name appears in `config/capabilities.ts`, and `?knowledge=false` proves the identity path does not load content. The registry is 241 lines for 8 capabilities. Adding knowledge is one module plus one `knowledge_ref`; adding a capability is one identity entry; neither changes a schema or a route. Three governance defects were found and are recorded in report §4: `cross_domain_platform` is not a domain in `config/domains.ts` (platform capabilities carry `domains: []` and express reach through `platform_reusable`), Atlas audience lenses are a separate vocabulary from the `config/personas.ts` decision lenses (the Sales lens has no product persona), and three invented persona ids were caught by rule V3 before commit. Eight of the 33 inventoried capabilities are seeded — deliberately a contract proof, not a population.
- **Downstream Dependencies:** unlocks `ATL-03`, `ATL-04`, `ATL-07`. **Next WP:** `ATL-03`.

---

### `ATL-03` — Retail & Grocery Knowledge Population [COMPLETED]

- **Objective:** Author governed capability knowledge for every capability inventoried in `ATL-01`
  within the `retail_grocery` domain and the cross-domain platform set.
- **Rationale:** The backend is worthless without truthful content, and truthful content is the
  programme's main risk surface.
- **Hard Dependencies:** `ATL-01` (inventory) — **[COMPLETED]**; `ATL-02` (validator, repository) — **[COMPLETED]**.
- **Scope:** description, innovation thesis, usage, testing, architecture, design, use cases, benefits,
  differentiation, demo guidance, market context, evidence, platform reuse, limitations and related
  capabilities — to the completeness tier the capability's maturity requires; Demo Path content for
  every demonstrable capability; Questions Worth Asking extended from the migrated `CuriosityQuestion`
  set; cross-domain reuse assessment for each capability.
- **Non-Scope:** any UI; any capability that does not exist; any registry schema change.
- **Acceptance Criteria:**
  - `AC-ATL-03-1` **[HARD]** Every record passes the `ATL-02` validator.
  - `AC-ATL-03-2` **[HARD]** Every behavioural claim traces to a file path, a test assertion, or is
    explicitly labelled `simulated`, `experimental`, `concept` or `roadmap`. **No record claims a
    capability that does not exist** (§1.2).
  - `AC-ATL-03-3` **[HARD]** Where implementation status differs by field, it is recorded per field,
    not averaged (ADR-047).
  - `AC-ATL-03-4` **[HARD]** Every market claim carries source, publisher, publication date and
    retrieval date, or `marketContext` is absent rather than thin.
  - `AC-ATL-03-5` **[HARD]** Demo Path warnings are non-empty for any capability that is not fully
    implemented.
  - `AC-ATL-03-6` Cross-domain applicability stated for every capability, including `not-assessed`.
  - `AC-ATL-03-7` Prior defect-register findings (`D-DDF-*`, `D-INT-*`) are reflected in `limitations`
    where still applicable, not silently omitted.
- **Test Requirements:** validator run across the full record set; existing regression green.
- **Exit Gate:** a seller can open any Retail & Grocery capability and get an accurate account of what
  it does, what proves it, what it cannot do, and how to show it — with no verbal correction needed.
- **Implementation Allowed:** YES — content authoring only.
- **Commit/Push Permitted:** yes.
- **Risks:** marketing drift and over-claimed maturity — mitigated by `AC-ATL-03-2`/`-3` and automated
  later by `ATL-07`.
- **Decisions Outstanding:** capability ownership assignment (`owner` values).
- **Completion Evidence:** [`COGNIX_ATL_03_KNOWLEDGE_POPULATION_REPORT.md`](../reports/COGNIX_ATL_03_KNOWLEDGE_POPULATION_REPORT.md). 38 capabilities registered and 38 knowledge modules authored; `run-atl03-tests.ts` 29/29; `run-atl02-tests.ts` grew from 82 to 119 assertions and passes in full; `tsc` 0 diagnostics; build clean; the two long-standing runner failures reproduce their baseline counts exactly.
- **Handoff:** the corpus answers, for every capability, what it is, its business problem, all three ADR-047 maturity dimensions, usage, testing, architecture, evidence, demo path, limitations, cross-domain applicability and relationships, with every cited path, runner, report and governance document asserted to exist. Distribution: 29 `implemented`, 6 `partially-implemented`, 3 `simulated`, and **zero** `concept` or `roadmap` — nothing was admitted on documentation alone. The ATL-02 boundary held under population: knowledge content is 5× the registry and no contract, repository, validator or route changed. One genuine defect was found and fixed — Level 1 search conflated governed identifiers by numeric suffix, violating `AC-ATL-02-10`; the tokeniser now matches identifiers whole. Two ADR-052 split candidates (`CDI-07A` → 2, `CDI-07B` → 3) are raised for an owner decision rather than taken unilaterally. `external_evidence` is empty corpus-wide because no market study has been performed; `ATL-06` supplies it.
- **Downstream Dependencies:** unlocks `ATL-04`. **Next WP:** `ATL-04`.

---

### `ATL-04` — Atlas UX & Structured Search [COMPLETED]

- **Objective:** Deliver the Atlas experience — search-first landing, domain browse, capability detail
  with audience lenses, relationships, Demo Path — and, once `SB-GATE` passes, supersede the
  Architectural Storyboard navigation surface.
- **Rationale:** Discovery is how every audience enters. ADR-050 Level 1.
- **Hard Dependencies:** `ATL-02` (APIs) — **[COMPLETED]**; `ATL-03` (content) — **[COMPLETED]**.
- **Integration Dependencies:** `SB-GATE` (ADR-051) — governs storyboard retirement only, not the rest
  of the phase.
- **Scope:** search-first landing; capability cards; capability detail following the progressive
  disclosure order in [`UX_DESIGN_PRINCIPLES.md`](../ux/UX_DESIGN_PRINCIPLES.md) §6; Level 1 structured
  search with the ADR-050 filter set; audience lens switching driven by `config/personas.ts`;
  relationship view; three-dimension maturity badges; platform-reuse indicators; Demo Path; Questions
  Worth Asking; responsive layout.
- **Non-Scope:** semantic retrieval; any AI; merging any storyboard implementation from `main`.
- **Acceptance Criteria:**
  - `AC-ATL-04-1` **[HARD]** All capability text rendered by the UI originates from an Atlas API
    response (ADR-046).
  - `AC-ATL-04-2` **[HARD]** Search returns deterministic results with no AI provider configured.
  - `AC-ATL-04-3` **[HARD]** Lenses change ordering and emphasis only — one stored record per
    capability, no separate content fetch per lens.
  - `AC-ATL-04-4` **[HARD]** All three ADR-047 maturity dimensions are visible together wherever any
    one is shown.
  - `AC-ATL-04-5` **[HARD]** The Five-Second Rule and the 40–60 word ceiling
    (`UX_DESIGN_PRINCIPLES.md` §3) are met on the landing and capability surfaces.
  - `AC-ATL-04-6` **[HARD]** `components/ArchitectureExplorer.tsx` is not deleted or disabled unless
    `SB-GATE` passes in the same work package with the checklist ticked.
  - `AC-ATL-04-7` Light executive surface per `UX_DESIGN_PRINCIPLES.md` §1 — no dark-mode Atlas.
  - `AC-ATL-04-8` Keyboard and assistive-technology access for search, filters, lens switching and
    disclosure.
- **Test Requirements:** `tests/unit/run-atl04-tests.ts`; existing regression green; production build
  clean; browser walkthrough at 1024/1280/1440 with no console errors and no horizontal overflow
  (the `DDF-01` validation precedent).
- **Exit Gate:** an executive reaches a relevant capability from the landing surface within five
  seconds and can tell, without asking, whether it is real.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** storyboard removal before knowledge preservation — mitigated by ADR-051; documentation-wall
  UX — mitigated by the word ceiling and progressive disclosure.
- **Decisions Outstanding:** whether the Atlas becomes a top-level shell entry or lives within the
  existing Help/About surface (`UX_DESIGN_PRINCIPLES.md` §3.2 One-Title rules apply either way).
- **Completion Evidence:** [`COGNIX_ATL_04_ATLAS_UX_SEARCH_REPORT.md`](../reports/COGNIX_ATL_04_ATLAS_UX_SEARCH_REPORT.md). `run-atl04-tests.ts` 54/54; `run-atl03` 29/29 and `run-atl02` 119/119 unchanged; `tsc` 0 diagnostics; build clean; live-rendered at 1440, 1024 and 720 with no horizontal overflow and all three maturity dimensions surviving to the narrowest width.
- **Handoff:** search is index-backed over governed knowledge and answers real questions — the seven acceptance queries are asserted in the suite. Testing with questions rather than keywords falsified the ATL-02 scorer, which the eight-capability seed had been too small to expose: `how do I test Decision Gap` had ranked Decision *Window* first, and `why did the decision change` matched 36 of 38. Fixed with stopwords, phrase weighting and knowledge indexing — all deterministic, no model. Filter and lens hints come from a **declared lexicon** and are surfaced as dismissible chips naming their trigger phrase, never applied silently. Two items are deliberately incomplete and recorded rather than fudged: Questions Worth Asking binding needs a governance rule for resolving `EXP-*`/`SOL-*` to `CAP-*` (report §6), and `why did the decision change` stays broad because *decision* is the estate's dominant noun — a Level 2 problem for `ATL-05`. **SB-GATE remains 0 of 6 advanced**; the Atlas is a candidate successor surface but no storyboard content was migrated.
- **Downstream Dependencies:** unlocks `ATL-05`. **Next WP:** `ATL-05`.

---

### `ATL-04R` — Unified Capability Exploration Experience [COMPLETED]

- **Objective:** Turn the working Atlas from a technically sound search-and-filter catalogue into a
  coherent, visually explanatory, persona-aware, question-led exploration environment, without
  weakening any governed knowledge, retrieval or trust boundary beneath it.
- **Rationale:** `ATL-04` successfully proved the backend-driven Atlas, structured discovery model and
  first UI. Evaluation of the working interface showed that the information architecture was sound,
  but the interaction architecture exposed too many controls, fragmented Capability Atlas, Portfolio
  and Questions into separate experiences, and behaved more like a searchable catalogue than an
  innovation exploration environment.
- **Hard Dependencies:** `ATL-02` — **[COMPLETED]**, `ATL-03` — **[COMPLETED]**,
  `ATL-04` — **[COMPLETED]**.
- **Integration Dependencies:** `SB-GATE` (ADR-051). `ATL-05`/`ATL-06A`/`ATL-06B`/`ATL-06C` trust
  boundaries, which this work package consumes and must not weaken.
- **Scope:** One Capability Atlas absorbing Portfolio and Questions Worth Asking as views; removal of
  the `Explore` sidebar grouping and of the global Domain and Persona header selectors; persona as an
  in-Atlas lens and domain as an in-Atlas exploration dimension; a governed capability-area landscape
  partitioning the registry; deterministic progressive clarification for ambiguous questions; a
  governed business-problem catalogue; a visual explainability framework driven by capability
  knowledge; filters behind progressive disclosure; About retired as a destination and replaced by a
  lightweight header surface over one governed platform-metadata source; Governance renamed and
  reorganised as Observability & Governance.
- **Non-Scope:** `ATL-06D` in any form — no client conversation pack, no meeting preparation, no
  client research, no client persona generation, no sales briefing packs. No new persona service, no
  new domain service, no conversation framework, no visualisation DSL. No storyboard retirement.
- **Acceptance Criteria:**
  - `AC-ATL-04R-1` **[HARD]** Capability Atlas is the single discovery destination. The `Explore`
    grouping and the Portfolio and Questions sidebar entries are gone, and no governed data or useful
    functionality is lost with them.
  - `AC-ATL-04R-2` **[HARD]** The global Domain and Persona selectors are removed. A user does not
    become a persona; they read one governed record through four lenses, freely switchable, and a
    lens reorders without hiding or changing any fact.
  - `AC-ATL-04R-3` **[HARD]** Capability areas are governed content that PARTITIONS the registry —
    every capability in exactly one area — and no area is invented to complete a grid.
  - `AC-ATL-04R-4` **[HARD]** An ambiguous question raises a clarification rather than a large flat
    result set; a clear question does not. Clarification is deterministic, requires no provider or
    credential, is bounded to two steps, offers prepared responses and free text, never manufactures a
    persona or domain, and never narrows to a capability the query did not reach.
  - `AC-ATL-04R-5` **[HARD]** Inferred context is visible, labelled as inferred and removable. Nothing
    is applied silently.
  - `AC-ATL-04R-6` **[HARD]** Visuals are configuration carried by governed capability knowledge, not
    diagrams authored in components; none introduces a metric the estate does not hold; each carries a
    text equivalent.
  - `AC-ATL-04R-7` **[HARD]** Innovation lifecycle, demonstration maturity and implementation status
    remain three separate dimensions on every new surface (ADR-047), and simulated or partial
    capabilities are not presented as operational.
  - `AC-ATL-04R-8` **[HARD]** About is not a navigation destination. The header surface shows only
    governed platform metadata, states absent values as absent, and claims no certification.
  - `AC-ATL-04R-9` **[HARD]** Governance is renamed Observability & Governance and reorganised around
    user questions, absorbing the live diagnostics that were trapped behind About.
  - `AC-ATL-04R-10` **[HARD]** The Architectural Storyboard is not deleted or disabled. `SB-GATE` is
    advanced only where evidence supports it.
  - `AC-ATL-04R-11` **[HARD]** `ATL-06D` is not started, and no placeholder pretends to be operational.
  - `AC-ATL-04R-12` **[HARD]** `ATL-06C` remains `[COMPLETED — LIVE VALIDATION PENDING]` with
    `AC-ATL-06C-9` open. No provider validation is weakened to advance the programme.
- **Test Requirements:** `tests/unit/run-atl04r-tests.ts` following the estate convention, covering the
  landscape partition and its validation rules, the clarification engine against every acceptance
  scenario, visual configuration and its accessible equivalents, navigation removal, truth
  dimensions, About and Observability & Governance, and the ADR-062 lexical fix. Every prior ATL suite
  re-run unchanged.
- **Exit Gate:** `npx tsc --noEmit` clean; `run-atl04r-tests.ts` green; `run-atl02`, `run-atl03`,
  `run-atl04`, `run-atl05`, `run-atl06a`, `run-atl06b`, `run-atl06c` unchanged; `npm run build` clean;
  browser validation at 1440/1024/720.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** A UX refinement that quietly relaxes a knowledge boundary is the principal risk, and it is
  guarded structurally: the ADR-046 component checks now run recursively over `components/atlas/**`,
  and clarification is asserted to contain no provider call. The second risk is a landscape that
  drifts out of partition as the registry grows; rule L3 fails the suite if it does.
- **Decisions Outstanding:** none.
- **Completion Evidence:** [`COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md`](../reports/COGNIX_ATL_04R_UNIFIED_CAPABILITY_EXPLORATION_REPORT.md) ·
  `run-atl04r-tests.ts` 116/116 · ADR-060, ADR-061, ADR-062, ADR-063 · `tsc` 0 · build clean ·
  validated at 1440/1024/720 · `SB-GATE` 1/6 → 3/6 with the storyboard retained.
- **Handoff:** The Atlas is one exploration environment. `ATL-06C` live validation remains the next
  executable work package and is untouched by this refinement; `ATL-06D` remains next for
  implementation and now has an obvious natural entry point in the capability detail, which continues
  to state that it is planned and not yet available rather than simulating it.
- **Downstream Dependencies:** unlocks nothing new; removes the interaction-architecture debt
  `ATL-06D` would otherwise inherit. **Next WP:** `ATL-06C` (close live validation), then `ATL-06D`.

---

### `ATL-05` — Internal AI Retrieval & Ask CogniX [COMPLETED]

- **Objective:** Add AI-assisted explanation over governed internal capability knowledge, with
  citations, and no external web access.
- **Rationale:** ADR-049, ADR-050 Levels 2 and 3.
- **Hard Dependencies:** `ATL-04` (Level 1 search, surfaces) — **[COMPLETED]**; `ATL-03` (content) — **[COMPLETED]**.
- **Scope:** semantic retrieval over Atlas knowledge only; Atlas AI gateway behind the existing
  provider abstraction (`lib/ai-provider.ts`); query routing for CogniX-only and demonstration
  intents; grounded answers with per-claim citations to capability identifiers; audience-sensitive
  explanation; guardrails against unsupported product claims; evaluation suite.
- **Non-Scope:** any external web access; any grounding; any market research.
- **Acceptance Criteria:**
  - `AC-ATL-05-1` **[HARD]** No provider SDK imported into any client component; all provider calls
    server-side.
  - `AC-ATL-05-2` **[HARD]** Every sentence asserting a CogniX capability fact carries a resolvable
    citation; an uncitable sentence is not emitted.
  - `AC-ATL-05-3` **[HARD]** With no provider key, Ask CogniX degrades to Level 1 structured search and
    says so. **No canned generated fallback on any path** (ADR-049).
  - `AC-ATL-05-4` **[HARD]** A question about a non-existent capability yields a declared gap, not an
    invention.
  - `AC-ATL-05-5` **[HARD]** No external network egress from any `ATL-05` path.
- **Test Requirements:** `tests/unit/run-atl05-tests.ts` including citation coverage, guardrail and
  degradation cases; existing regression green.
- **Exit Gate:** an architect asks a capability question in natural language and receives an answer
  whose every factual claim can be clicked through to governed evidence.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** ungrounded generation — mitigated by `AC-ATL-05-2`/`-4`; key handling — the estate's
  server-side-only convention (ADR-044) must not be weakened.
- **Decisions Outstanding:** embedding provider; whether the index is committed or built at startup.
- **Completion Evidence:** [`COGNIX_ATL_05_INTERNAL_AI_ASK_COGNIX_REPORT.md`](../reports/COGNIX_ATL_05_INTERNAL_AI_ASK_COGNIX_REPORT.md). `run-atl05-tests.ts` 54/54; `run-atl04` 54, `run-atl03` 29 and `run-atl02` 119 unchanged; `tsc` 0 diagnostics; build clean with `/api/v1/atlas/ask` and `/api/v1/atlas/questions` registered.
- **Handoff:** Ask CogniX answers only from governed CogniX records — no `fetch`, no URL, no provider SDK and no embedding code exists anywhere in `lib/atlas/ai/`. Its refusals are the load-bearing behaviour: an unsupported question returns a stated gap saying nothing was inferred, and an external-knowledge question states that the internal Atlas cannot substantiate that portion and names `ATL-06`. **Ambiguity is answered rather than resolved arbitrarily** — *why did the decision change* returns four grounded readings side by side, each with its own citation and all three maturity dimensions, while a clear question is still answered directly so ambiguity is never manufactured. No provider adapter ships; every answer states that it is assembled from governed records rather than narrated, and a failing provider degrades the same way. Level 2 semantic retrieval is **not** shipped because an embedding provider is a provider; the interface is provider-shaped and the answer reports `retrievalLevel: 'structured'` rather than claiming otherwise. Two defects were found by testing refusal cases: short words matched inside longer ones (`all` inside "actually"), fixed with word-boundary matching, and a prose-only match could ground an assertion, fixed with a declared discriminating-field requirement. **Owner decision implemented:** curiosity questions are first-class governed objects with explicit, rationale-carrying capability links that are never derived transitively from a shared solution or experiment — proven by test A7. **SB-GATE remains 0 of 6 advanced.**
- **Downstream Dependencies:** unlocks `ATL-06A`. **Next WP:** `ATL-06A`.

---

### `ATL-06A` — External Grounding & Provenance Architecture [COMPLETED]

*Delivered 2026-08-21; evidence in [`COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md`](../reports/COGNIX_ATL_06A_EXTERNAL_GROUNDING_PROVENANCE_REPORT.md). No provider adapter, no network call, no market content.*

- **Objective:** Establish and prove the architecture by which external knowledge may — and may not —
  reach a reader of the Atlas, **before any provider exists to shape it**.
- **Rationale:** ADR-048, ADR-053, ADR-054. The first adapter built becomes the de facto
  specification for everything after it. Building the admission gate, the three-class separation and
  the contradiction rule first means `ATL-06B` inherits a contract it cannot weaken, and means the
  rules are testable with no key, no quota and no network.
- **Hard Dependencies:** `ATL-05` (gateway, answer assembly, refusal behaviour) — **[COMPLETED]**.
- **Scope:** the three ADR-048 evidence classes as a typed contract and a rendered surface; the
  external-grounding contract with full source provenance; the question-classification policy
  governing when external knowledge is permitted at all; source admission — allowlist, tier,
  provenance completeness, date plausibility; freshness and source-quality rules per topic class;
  contradiction precedence; explicit refusal on insufficient grounding; the provider interface with
  **no adapter behind it**; publication of the declared policy at `GET /api/v1/atlas/grounding`.
- **Non-Scope:** any provider adapter; any network call; any market evidence content; semantic
  retrieval; the client conversation pack; any change to `ATL-05` answer assembly.
- **Acceptance Criteria:**
  - `AC-ATL-06A-1` **[HARD]** Responses separate **From CogniX** / **Market Context** /
    **AI Interpretation** structurally in the payload and visually on the surface (ADR-048).
  - `AC-ATL-06A-2` **[HARD]** An external claim without complete provenance — url, publisher, title,
    publication date, retrieval date, tier — is **not rendered at all**, and the rejection is recorded
    with its reason.
  - `AC-ATL-06A-3` **[HARD]** A question classified `internal-only` never reaches a grounding
    provider, and no external claim appears beside its answer however willing an adapter was.
  - `AC-ATL-06A-4` **[HARD]** Intent misclassification fails safe toward internal-only; an
    unclassifiable question is internal-only and an unrecognised topic inherits the strictest
    currency bound.
  - `AC-ATL-06A-5` **[HARD]** Where external evidence contradicts a governed CogniX fact, the
    governed fact is authoritative and the disagreement resolves into **three separated classes**.
    No merged, reconciled or synthesised statement is producible — enforced by the contract, not by
    convention (ADR-053).
  - `AC-ATL-06A-6` **[HARD]** No provider can overwrite, soften or restate a governed capability
    fact. Proven with a hostile adapter that attempts exactly that.
  - `AC-ATL-06A-7` **[HARD]** With grounding unavailable — the estate's current state — every
    `ATL-05` field of an answer is byte-identical to one assembled without the grounding layer, and
    the market section is shown as **explicitly absent with its reason**, never omitted silently.
  - `AC-ATL-06A-8` **[HARD]** A question answerable only from external evidence is **refused** when
    none can be admitted, distinguishing no-provider, all-claims-rejected and nothing-found.
  - `AC-ATL-06A-9` An expired source is not shown with a warning; it is not shown. Currency bounds
    are per topic class and published.
  - `AC-ATL-06A-10` No credential, key, token or endpoint is read, named or logged anywhere in the
    grounding layer (ADR-049).
- **Test Requirements:** `tests/unit/run-atl06a-tests.ts` covering contract shape, intent
  classification and fail-safe, every rejection reason, freshness verdicts, allowlist matching,
  hostile-provider containment, contradiction precedence on the worked example, refusal cases,
  `ATL-05` preservation with the provider both off and on, and absence of network, SDK and
  credentials; existing regression green.
- **Exit Gate:** the rules that decide what a reader is and is not shown are declared, published,
  enforced by types where possible, and proven against an adapter that actively tries to break them —
  with no adapter shipped.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Handoff:** the grounding layer is five modules — policy, provenance, contradiction, provider,
  engine — holding no `fetch`, no SDK import and no credential read. The dependency runs one way:
  answer assembly does not import grounding, so `ATL-05` cannot be altered by anything downstream of
  it. Admission rejects on nine declared reasons and reports the **first** structural failure, so an
  omission is auditable. Contradiction detection is deterministic and generalises: it is driven by
  what a record already declares about synthetic inputs, implementation status, demonstration
  maturity and lifecycle, so `CAP-SIGNAL-CONNECTOR` is defended by the same path as
  `CAP-PROMOTION-INTELLIGENCE` without either being special-cased, while a record declaring no
  constraint cannot manufacture a contradiction. The policy is published from the same constants the
  engine reads. `external_evidence` remains empty corpus-wide — `ATL-06C` owns content, and an
  architecture that admits evidence is not the same thing as evidence.
- **Risks:** an allowlist too short to be useful — accepted deliberately, and `ATL-06C` extends it on
  evidence; contradiction detection producing noise — mitigated by requiring a *declared governed
  constraint* on the same dimension, so a record with nothing to protect raises nothing.
- **Decisions Outstanding:** none for `ATL-06A`. Trusted-domain allowlist extension and
  market-evidence cache TTL pass to `ATL-06C`.
- **Downstream Dependencies:** unlocks **`ATL-06B`** — Grounded Market Intelligence. **Next WP:** `ATL-06B`.

---

### `ATL-06B` — Grounded Market Intelligence [COMPLETED]

*Delivered 2026-08-21; evidence in [`COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md`](../reports/COGNIX_ATL_06B_GROUNDED_MARKET_INTELLIGENCE_REPORT.md). Owner-redefined from "Google AI Provider & Semantic Retrieval" on 2026-08-21; Level 2 semantic retrieval descoped and unassigned.*

- **Objective:** Put a real Google Search grounding provider behind the `ATL-06A` seam, and make the
  **Market Context** evidence class real — retrieved, admitted, dated, sourced and visible.
- **Rationale:** ADR-048, ADR-049, ADR-054, **ADR-055**, **ADR-056**.
- **Hard Dependencies:** `ATL-06A` — **[COMPLETED]**; `ATL-05` — **[COMPLETED]**.
- **Scope:** the server-side Google Search grounding adapter behind `ExternalGroundingProvider`;
  grounded-segment extraction; source resolution and page-derived provenance; per-topic freshness and
  source admission/rejection surfaced to the reader; user-initiated research control; caching and a
  call budget; the visible Market Context class with its rejection ledger and search transparency; a
  recorded evaluation set covering the adversarial cases.
- **Non-Scope:** AI Interpretation and hybrid reasoning (`ATL-06C`); the client conversation pack
  (`ATL-06D`); populating `external_evidence` across the corpus; **Level 2 semantic retrieval**, which
  this redefinition descopes and which remains unassigned; any change to the `ATL-06A` admission gate.
- **Acceptance Criteria:**
  - `AC-ATL-06B-1` **[HARD]** No browser-side call to any Gemini or Google Search endpoint. The key is
    resolved from the server environment at call time, is never accepted from a request body, and
    appears in no claim, envelope, cache entry, notice, log or error message.
  - `AC-ATL-06B-2` **[HARD]** **Every externally presented market claim is traceable to admitted
    grounding evidence.** A response segment becomes a claim only where a grounding support names a
    retrieved source; ungrounded model text is discarded, counted and reported (ADR-055).
  - `AC-ATL-06B-3` **[HARD]** Publisher, title and publication date are read from the resolved source
    page, never supplied by the model. What the page does not state stays empty and is refused.
  - `AC-ATL-06B-4` **[HARD]** External research runs only on explicit per-question user request, and
    only where the `ATL-06A` intent policy already permits it. Internal search and the internal Ask
    CogniX path never invoke a provider (ADR-056).
  - `AC-ATL-06B-5` **[HARD]** **Turning the provider off must not make CogniX less trustworthy or less
    functional than `ATL-05`** — proven by recomputing the governed answer from the `ATL-05` modules
    and comparing byte for byte, with the provider absent and present.
  - `AC-ATL-06B-6` **[HARD]** `run-atl06a-tests.ts` passes **unchanged**; the allowlist, admissible
    tiers, freshness bounds and contradiction rule are not widened to admit this phase's evidence.
  - `AC-ATL-06B-7` **[HARD]** Adversarial retrieval is refused correctly: contradictory-but-credible
    evidence is admitted and separated; agreeable-but-inadmissible evidence is rejected; stale,
    undated, non-allowlisted, duplicate, vendor-marketing and CogniX-asserting claims are each
    rejected by name; provider failure and absent grounding metadata yield stated absence.
  - `AC-ATL-06B-8` Cost is bounded: repeat questions are cached, empty retrievals are not, and live
    call counts are published.
- **Test Requirements:** `tests/unit/run-atl06b-tests.ts` over a recorded evaluation set; existing
  regression green with `run-atl06a-tests.ts` **unchanged**.
- **Exit Gate:** with a key present the Atlas can cite the market; with no key it is the `ATL-05`
  Atlas exactly; and in both states the reader can see what was searched, what was admitted, what was
  rejected and why.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Handoff:** the adapter calls the documented REST contract rather than the installed
  `@google/generative-ai@0.24.1`, whose published grounding types are wrong in four ways that would
  silently yield zero supports — recorded in ADR-055 and asserted in test against the installed
  package. No dependency was added. Segment offsets are sliced as **bytes**, because a string slice
  corrupts any passage containing a non-ASCII character. `GroundingChunkWeb.domain` is not populated
  by the Gemini Developer API, so the publisher is obtained by following the grounding redirect and
  reading the page — which also supplies the publication date, and supplies **nothing** where the page
  is silent. Claims are scoped to the capabilities the governed answer was built from, so a market
  claim cannot raise a contradiction against a capability nobody was discussing. `external_evidence`
  remains empty corpus-wide: this phase proves the pipeline on an evaluation set, it does not populate
  a corpus.
- **Risks:** with a live key, fewer claims survive than a naive integration would show — accepted, and
  the discarded count is displayed so thinness is legible rather than mysterious; third-party markup
  is injected for Google Search Suggestions — confined to that one field and asserted as the only
  such injection.
- **Decisions Outstanding:** which phase owns **Level 2 semantic retrieval**; whether the trusted-source
  allowlist is extended, and by whom, now that `ATL-06C` is no longer the market-content phase.
- **Downstream Dependencies:** unlocks `ATL-06C`. **Next WP:** `ATL-06C`.

---

### `ATL-06C` — AI Explanation & Hybrid Reasoning [COMPLETED]

*Delivered 2026-08-21; evidence in [`COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md`](../reports/COGNIX_ATL_06C_AI_EXPLANATION_REPORT.md) and [`COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md`](../reports/COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md). **`AC-ATL-06C-9` closed on a real credentialed round trip against `gemini-3.6-flash`, commit `f1c390bc`.***

- **Objective:** Make the third ADR-048 evidence class a reading rather than a template, and make it
  trustworthy by what it is forbidden to say.
- **Rationale:** ADR-048, ADR-049, ADR-053, **ADR-057**, **ADR-058**.
- **Hard Dependencies:** `ATL-06A` — **[COMPLETED]**; `ATL-06B` — **[COMPLETED]**.
- **Scope:** the premise set, built only from governed statements and **admitted** market claims; an
  interpretation provider seam separate from the grounding seam, with a Gemini adapter carrying **no
  search tool** and structured output; per-statement verification against declared rules with a
  visible refusal ledger; degradation to the `ATL-06A` templated reading; the Level 2 semantic
  retrieval evaluation (ADR-058); a live validation script; correction of the `ATL-06A` mutable-pointer
  assertion.
- **Non-Scope:** the client conversation pack (`ATL-06D`); any change to the `ATL-06A` admission gate
  or the `ATL-06B` retrieval path; shipping an alias vocabulary or an embedding index; populating
  `external_evidence`.
- **Acceptance Criteria:**
  - `AC-ATL-06C-1` **[HARD]** Every interpretation statement cites at least one governed CogniX
    premise and every market premise it reads. An uncitable reading is not emitted.
  - `AC-ATL-06C-2` **[HARD]** An interpretation may never assert a CogniX capability fact; ADR-053
    contradiction precedence is preserved unchanged.
  - `AC-ATL-06C-3` **[HARD]** With the provider off or failing, interpretation degrades to the
    `ATL-06A` templated form and says so. Nothing is generated from a fallback path.
  - `AC-ATL-06C-4` **[HARD]** **Only admitted external claims may enter reasoning.** Rejected claims
    and discarded ungrounded segments are audit-only and are structurally unreachable from the
    premise set; a reading that reproduces one is refused (ADR-057).
  - `AC-ATL-06C-5` **[HARD]** **From CogniX**, **Market Context** and **AI Interpretation** remain
    structurally and visually separate; interpretation mutates no other class.
  - `AC-ATL-06C-6` **[HARD]** A reading introducing a number, organisation or publisher that no cited
    premise contains is refused, not hedged, and the refusal is shown with the rule it broke.
  - `AC-ATL-06C-7` **[HARD]** `run-atl06a-tests.ts` and `run-atl06b-tests.ts` pass unchanged in
    substance; the `ATL-06A` mutable-pointer assertion is **strengthened to an invariant**, never
    relaxed.
  - `AC-ATL-06C-8` Level 2 semantic retrieval is evaluated on evidence before any embedding index is
    introduced (ADR-058).
  - `AC-ATL-06C-9` **[HARD, MET]** At least one real Gemini/Search grounding round trip performed
    against a live credential. Passed on `f1c390bc`: 25 grounding supports, 25/25 exact byte-offset
    reconstruction, `S1`/`S2` provider invoked, `S3` internal question provider **not** invoked,
    credential-safe failure. Sanitised evidence in
    [`COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md`](../reports/COGNIX_ATL_06C_LIVE_VALIDATION_SUMMARY.md).
- **Test Requirements:** `tests/unit/run-atl06c-tests.ts`; earlier suites green; the live check run
  via `scripts/atlas-live-grounding-check.ts`.
- **Exit Gate:** **met.** An explanation a reader can act on, in which every premise is visible and
  every premise is either governed or sourced — and one real grounded round trip on the record.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Handoff:** the premise set is assembled by construction rather than by instruction — the module
  that builds it never reads `rejected_claims` or `search_transparency`, so no prompt, parameter or
  provider can reach refused evidence. Verification checks eight declared rules in order from
  structural to semantic and **drops** rather than hedges; the two that carry the weight are
  `echoes-rejected-claim`, which catches a provider reproducing refused evidence from its own
  training data, and `unsupported-quantity`, because a reader forgets the sentence and remembers the
  figure. The interpretation adapter is a **separate seam** from the grounding adapter and has no
  search tool: it may read what was admitted and may not go and look. Templated readings are kept
  alongside generated ones because only the templated ones can be re-derived without a provider.
  **Level 2 is deferred on measurement, not preference** (ADR-058): Level 1 finds the intended
  capability in the top three for 10 of 18 business-phrased questions, a 22-entry declared alias
  vocabulary lifts that to 18 of 18, and the alias layer is **recommended and deliberately not
  shipped** because governed vocabulary is not invented inside an unauthorised phase.
- **Risks:** fluent interpretation is the most persuasive way to publish an ungoverned claim —
  mitigated by requiring a citation per premise, refusing rather than hedging, and showing the
  refusal ledger; the un-run live round trip — mitigated by validating the request contract against
  the live endpoint with a negative control, and by declining to mark the phase complete.
- **Owner decision, 2026-08-21 — alias vocabulary authorised and implemented (ADR-059).** The
  measured remedy from ADR-058 is now `content/atlas/vocabulary.ts`: 22 governed aliases, each with
  an owner, review date, written rationale and `evidenced_by` capabilities, validated by rules
  W1–W8. Rule **W6** — every governed term must appear in the governed text of a capability the
  alias names — rejected six terms from the measured prototype (*hindsight*, *urgency*,
  *volatility*, *provenance*, *precedent*, *stale*), none of which exists in this corpus; they were
  replaced with the corpus's own words. Top-three recall on the eighteen business-phrased questions
  moves **10/18 → 18/18** and first place **6/18 → 16/18**. Expansions are returned with every
  search response and rendered, and an alias-driven hit is discounted to a published 0.75 of a
  direct hit, so a capability the searcher named always outranks one the vocabulary reached.
  Published at `GET /api/v1/atlas/vocabulary`.
- **Decisions Outstanding:** which phase owns `external_evidence` corpus population; whether
  interpretation should carry its own user-facing control as external research does — it reaches
  outward for nothing, so it currently runs whenever a provider is configured.
- **Downstream Dependencies:** unlocks `ATL-06D`. **Next WP:** `ATL-07`. `AC-ATL-06C-9` is still open and is
  now inherited by `ATL-06D` as `AC-ATL-06D-6`; closing it remains the board's next executable action.

---

### `ATL-06D` — Client Conversation Pack [COMPLETED]

- **Objective:** Deliver **"Prepare me for a client conversation"** — an evidence-grounded preparation
  pack a seller can use unedited.
- **Rationale:** This is the Atlas's commercial payoff, and it is placed last deliberately: it
  consumes every guarantee the three phases before it establish. A pack assembled before the
  contradiction rule existed would be the most persuasive way to publish an ungoverned claim.
- **Hard Dependencies:** `ATL-06A`, `ATL-06B`, `ATL-06C`, `ATL-03` (demo paths, client questions).
- **Scope:** client-context interpretation; capability recommendation with all three ADR-047 maturity
  dimensions; demonstration sequencing from real Demo Paths; questions to ask; likely client
  questions and grounded suggested responses; market evidence in the Market Context class only;
  mandatory demo warnings; follow-up recommendations.
- **Non-Scope:** any recommendation of a capability that does not exist; any suppression of a
  limitation for persuasiveness.

#### "Prepare me for a client conversation" — required feature

A user supplies client context, for example:

> *I am meeting the Head of Demand Planning at a grocery retailer struggling with promotional
> volatility, forecast accuracy and slow reaction to external signals.*

The Atlas reasons over governed CogniX capability knowledge, business problems, domain context, demo
readiness, cross-capability relationships, audience persona and optional current market evidence, and
returns an evidence-grounded preparation pack containing **all** of:

| Section | Content |
|---------|---------|
| Client problem interpretation | The likely pain points, and which of the user's words led to that reading |
| Recommended CogniX capabilities | With capability identifiers and all three ADR-047 maturity dimensions visible |
| Recommended demonstration sequence | An ordered path assembled from real capabilities and their Demo Paths |
| Why each capability matters | Business-focused explanation per capability |
| Questions to ask the client | From `questionsWorthAsking` plus context-derived questions |
| Likely client questions | From `clientQuestions` |
| Suggested responses | Grounded in governed knowledge, with citations |
| Relevant market evidence | Only where it materially supports the discussion, fully sourced, in the *Market Context* class |
| Demo warnings and limitations | **Mandatory and non-empty** whenever any recommended capability is not fully implemented |
| Recommended follow-up capabilities | What to explore next depending on the client's response |

- **Acceptance Criteria:**
  - `AC-ATL-06D-1` **[HARD]** The pack returns every section above; warnings are non-empty whenever a
    non-implemented capability is recommended.
  - `AC-ATL-06D-2` **[HARD]** With grounding disabled or unavailable, the pack is still produced from
    internal knowledge and the market section is shown as explicitly absent, never omitted silently.
  - `AC-ATL-06D-3` **[HARD]** Every CogniX claim in the pack is governed and cited; every market claim
    is sourced; the three evidence classes remain separated throughout.
  - `AC-ATL-06D-4` **[MET]** A capability recommended for a demonstration carries its real Demo Path
    prerequisites and warnings, not a summarised version of them. Every demonstration step in every
    tested pack is traceable to an authored step on that capability; fabricated steps: **0** (§E4).
  - `AC-ATL-06D-1` **[MET]** Rule `P2` refuses a pack recommending a non-`implemented` capability with
    no demonstration warning, and the route returns 500 rather than a page (ADR-066).
  - `AC-ATL-06D-2` **[MET]** With grounding unavailable or research off, the pack is produced from
    internal knowledge and Market Context is a rendered absence carrying its reason (§F1–F3).
  - `AC-ATL-06D-3` **[MET]** Every capability claim is a governed statement carrying its three ADR-047
    dimensions; market claims reach the pack only through the unmodified ATL-06A gate; the three
    classes are never merged.
  - `AC-ATL-06D-5` **[MET]** *(added by this phase)* Selecting a lens materially changes the
    information hierarchy while every capability fact stays identical. Asserted field-by-field across
    38 capabilities × 4 lenses and browser-verified on `CAP-DECISION-GAP` (ADR-064).
  - `AC-ATL-06D-6` **[INHERITED, MET]** `AC-ATL-06C-9` is not closed. No `GEMINI_API_KEY`
    reached that environment at the time. **Closed 2026-08-21**: the round trip passed on `f1c390bc`
    against `gemini-3.6-flash`, so the Market Context path this pack consumes has now run against a
    real search — 25 grounding supports, 25/25 exact byte-offset reconstruction, and the internal
    question correctly not reaching the provider.
- **Test Requirements:** `tests/unit/run-atl06d-tests.ts` — **96/96**, covering the six §39 scenarios,
  lens materiality, fact invariance under lens, recommendation rationale, sequencing without
  fabrication, sales integrity, opt-in research and failure behaviour. All earlier suites green:
  `atl02` 119 · `atl03` 29 · `atl04` 58 · `atl04r` 118 · `atl05` 54 · `atl06a` 115 · `atl06b` 133 ·
  `atl06c` 127. Revalidated after the live closure: **96/96 unchanged**. `tsc` 0 · build clean.
- **Exit Gate:** **met.** A seller gets a pack in which every CogniX claim is governed, every
  limitation is stated, and every prohibition carries the honest sentence to use instead — and, since
  `AC-ATL-06D-6` closed, its market-evidence path rests on a provider round trip proven live rather
  than only against recordings.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Risks:** persuasiveness pressure to soften a limitation — mitigated structurally rather than
  editorially (ADR-066). The residual risk is that a future change is argued for on the grounds that
  it makes the pack more persuasive; the rules in `atlas-preparation-model.ts` are the record of what
  was decided before anyone was in that room.
- **Decisions Outstanding:** pack export format · whether `data_sources` population is owned by
  `ATL-07` or a content pass — it is populated on 3 of 38 capabilities and directly limits how many
  synthetic-data warnings and §21 prohibitions can fire.
- **Downstream Dependencies:** none. **Next WP:** `ATL-07`, with closing `AC-ATL-06C-9` as the board's
  next executable action.

#### `D-ATL-04R-1` — persona-lens residual [CORRECTED in `ATL-06D`]

Recorded here rather than by reopening `ATL-04R`. Owner evaluation of the live interface found:

> Selecting Sales, Architect or Developer visibly changes the selected lens, but the overall Atlas
> experience does not change materially enough from the default Innovation Executive presentation.

**Cause.** `ATL-04R` implemented `ADR-045` literally: the lens reordered the disclosure sections of
the capability detail and did nothing else. The lens bar said so — *"Ordering only — nothing is
hidden, and the facts do not change."* A reader selecting Developer met the same four executive
questions, the same opened section and the same capability ordering as everyone else.

**Correction (ADR-064).** A lens now decides the four questions answered above the fold, which
sections lead, which one opens on arrival, how much evidence detail renders inline, and the order
capabilities are offered in. `ADR-045` survives unamended: `orderForLens` returns a permutation, and
no lens alters identity, lifecycle, demonstration maturity, implementation status, limitations,
evidence, architecture or demo facts — asserted field-by-field rather than promised.

**Verified in a browser** on `CAP-DECISION-GAP` against the production build (§36): 4/4 distinct
question sets, 4/4 distinct opened sections, 4/4 distinct section orders.

---

### `ATL-07` — Capability Lifecycle Governance & Automation [COMPLETED]

*Delivered 2026-08-21; evidence in [`COGNIX_ATL_07_GOVERNANCE_AUTOMATION_REPORT.md`](../reports/COGNIX_ATL_07_GOVERNANCE_AUTOMATION_REPORT.md). Command: `npx tsx scripts/atlas-governance-check.ts`.*

- **Objective:** Turn the Atlas into a living capability-governance system that keeps itself honest.
- **Rationale:** Knowledge decays silently. The `DDF-01` reconciliation found defects that had been
  *relocated rather than closed*; automation is how that is caught without a human re-reading
  everything.
- **Hard Dependencies:** `ATL-02` (validator, repository), `ATL-03` (records). May run parallel to
  `ATL-05` / the `ATL-06*` phases.
- **Scope:** capability registration during feature development; documentation completeness checks and
  a completeness score; architecture-evidence checks; automated test linkage; demo-readiness checks;
  market-evidence freshness; stale-content detection; source-code drift detection against recorded
  implementation references; review dates; lifecycle transitions; ownership; publication gates.
- **Non-Scope:** automatic promotion of any capability's maturity on any dimension.
- **Acceptance Criteria:**
  - `AC-ATL-07-1` **[HARD, MET]** `GOV-REC-3` flags a record whose cited source files changed since
    `reviewed_at`, measured from git commit dates rather than file mtimes. 11 records currently flagged.
  - `AC-ATL-07-2` **[HARD, MET]** `GOV-REC-1`/`-2`/`-5` refuse publication per record. 20 records
    currently unpublishable, all for the same missing field.
  - `AC-ATL-07-3` **[HARD, MET]** Structural: `GovernanceFinding` has no field capable of changing a
    record, the layer has no write path, and a full corpus run leaves every record byte-identical.
  - `AC-ATL-07-4` **[MET]** `GOV-REC-8` flags stale market evidence on ATL-06A's imported bounds.
  - `AC-ATL-07-5` **[MET]** One command with `--enforce` and `--json`, wired into `.gitlab-ci.yml` as
    an advisory job that fetches full history.
  - `AC-ATL-07-6` **[HARD, MET]** *(added by this phase)* **Live-provider drift is detected without a
    credential.** Four checks compare the recorded verification against repository state; an
    unanswerable drift question is reported, never read as a pass.
- **Test Requirements:** `tests/unit/run-atl07-tests.ts`; governance report over the full record set.
- **Exit Gate:** capability knowledge that has drifted from the code is detected by the pipeline rather
  than by a client in a meeting.
- **Implementation Allowed:** YES. **Commit/Push Permitted:** yes.
- **Handoff:** 13 checks over 38 records. The first run found what seven phases had not: **20 of 38
  records claim a lifecycle tier they do not meet**, every one for the same missing field
  (`assumptions`, required from `Research` upward by §9.1), which is a corpus-population gap rather
  than twenty separate mistakes; **12** carry no lifecycle state and are reported as exempt rather
  than quietly passing; **11** cite source files that moved after a human last read them; and the live
  provider shows **no drift**. Nothing was changed to improve those numbers — the engine cannot. The
  phase also found a defect in itself on that run: a validation observation naming the surface
  `ATL-04R` deliberately retired was flagged as a broken citation, corrected by separating what a
  record claims as **current** from what it records as **observed**, because a check that cries wolf
  on a correct record trains people to ignore it.
- **Risks:** governance automation blocking contributors — mitigated by shipping advisory, with
  `--enforce` as the switch and the CI job set to report only.
- **Decisions Outstanding:** which check families become blocking in CI, now decidable with the
  findings on the table · who closes the 20 `GOV-REC-1` tier gaps · whether findings belong on the
  Observability & Governance surface.
- **Downstream Dependencies:** none. **Next WP:** NONE — the programme completes; subsequent work is
  ordinary capability maintenance under this governance.

> **Longer-term principle:** a CogniX capability is not complete merely because code exists. It must
> also be explainable, testable, demonstrable, architecturally traceable and governed.

---

## 5. Architectural Storyboard — Retirement Gate (`SB-GATE`)

Governed by **ADR-051**. Two implementations exist on different lines of history: the **12-slide**
`components/ArchitectureExplorer.tsx` on this branch, and a **14-slide** version (2,303 lines) on the
abandoned Lidl-era `main`, together with a different `components/Help.tsx`.

> **Preserve architectural knowledge, not obsolete storyboard implementation.**

The historical implementation is **never merged, cherry-picked or ported**. It is a read-only audit
source, inspected via `git show origin/main:<path>`.

The storyboard is not deleted or disabled during `ATL-01`. It may be retired only when every item is
true and ticked in the `ATL-01` storyboard assessment:

- [x] **SB-GATE-1** Both versions audited slide by slide, each unit of knowledge carrying a
      retain/discard decision. — **MET at `ATL-01`**, §2/§3/§4 of the migration assessment.
- [ ] **SB-GATE-2** Every retained unit verifiably present at its destination. — **NOT MET.** `ATL-03`
      populated the capability corpus, but the two units the assessment recorded as homeless (§3.1 the
      four-quadrant value framework, §3.2 the hub-and-spoke reuse model) still exist nowhere.
- [x] **SB-GATE-3** Destinations reachable from the Atlas or from governance, not only from a file. —
      **MET at `ATL-04R`.** Capability knowledge is reachable through seven governed capability areas
      that partition the registry, and platform architecture is reachable under
      Observability & Governance → Architecture. The assessment recorded this as blocked on "the
      `ATL-04` Atlas surface"; that surface now organises the estate rather than listing it.
- [ ] **SB-GATE-4** Persona journeys, the enterprise blueprint, the recommendation lifecycle, the
      governance-and-trust narrative and the constrained-reasoning narrative each have a named
      successor surface. — **PARTIALLY MET, unchanged.** 11 of 12. Slides 6 and 7 (supply chain,
      executive briefing) still have no successor because those capabilities remain orphaned.
- [ ] **SB-GATE-5** Presenter notes and demo timings preserved as Demo Path content. — **NOT MET.**
      The 60 prose units in the storyboard's narrative panel have not been migrated into Demo Paths.
      `ATL-04R` did not attempt this and does not claim it.
- [x] **SB-GATE-6** Retirement proposed in a work package that also names the navigation successor. —
      **MET at `ATL-04R`**, which proposes eventual retirement and names the successor: the Capability
      Atlas for capability architecture, and Observability & Governance → Architecture for the
      platform account. The storyboard is hosted there in the interim.

**State: 3 of 6.** The gate is not met, so the rule below applies and **the Architectural Storyboard
is retained**. `ATL-04R` moved it out of the default tab of a module named "About" and into
Observability & Governance, labelled as retired in the registry and simulated in implementation. That
is a change of placement and honesty, not a retirement.

If the gate cannot be met, the storyboard remains and the Atlas coexists with it.

---

## 6. Separation From Existing CogniX Work

> **The CogniX Capability Atlas is an independently scheduled workstream. It does not supersede, close,
> reorder or implicitly deprioritise existing incomplete CogniX work packages.**

- All existing identifiers — `CDI-*`, `ESF-*`, `IFI-*`, `DDF-*`, `DOT-*`, `WP10-*`, `EXP-*`, `SOL-*`,
  `PAT-*`, Phases 0–13 — keep their identity, ordering and status. Establishing the Atlas changed none
  of them.
- The `ATL` namespace was chosen specifically because `SOL-CAT-04` already exists in the solution
  registry, which would have made a `CAT-*` Atlas namespace ambiguous to both readers and `grep`.
- No `ATL` phase depends on any non-Atlas work package completing, and no non-Atlas work package
  depends on an `ATL` phase. Atlas work may proceed in parallel.
- No existing work item may be moved into the `ATL` namespace, and no `ATL` phase may be marked
  complete because adjacent non-Atlas work completed.
- `ATL-01` **reports** contradictions and pre-existing inconsistencies; it does not fix them.

---

## 7. How to Resume Capability Atlas Work

*This section exists so a developer or AI agent with **no prior conversation history** can determine
the programme's state and continue it safely.*

1. **Read this document** — §0 status board first, then §3 phase map.
2. **Read the Atlas section of the Master Plan** — [`MASTER_PLAN.md`](MASTER_PLAN.md) — to confirm the
   programme is still registered and to see whether other CogniX work has moved.
3. **Determine completed phases** from §0 and verify each claimed completion against its *Completion
   Evidence* and *Exit Gate*. A status line with no evidence is not a completion.
4. **Confirm prerequisites** of the next `[NOT STARTED]` phase from repository state, not from this
   document's optimism.
5. **Verify repository continuity before changing anything:**
   ```bash
   git rev-parse --show-toplevel && git branch --show-current && git rev-parse HEAD
   git status --porcelain && git remote -v
   git fetch origin && git rev-list --left-right --count origin/Feature/MatchingContract-AutoActivate...HEAD
   ```
   The authoritative CogniX baseline is **`origin/Feature/MatchingContract-AutoActivate`**. It is not
   `origin/main` — `main` is an abandoned Lidl-era POC line. Confirm your branch descends from the
   CogniX line before trusting any inventory.
6. **Execute only the requested `ATL` work package.** Respect its *Implementation Allowed* field. Do
   not opportunistically begin the next phase.
7. **Run the phase's Verification Commands** and its Test Requirements.
8. **Update governance with factual results** — §0 status board, completion evidence, handoff. Record
   what failed as well as what passed.
9. **Preserve separation** — never alter another workstream's identifiers or statuses (§6).
10. **Leave a deterministic handoff** — fill the phase's handoff and set §0's next executable WP.

### 7.1 Example instructions a future developer or agent can use verbatim

> Review CogniX governance and tell me the exact current status of the Capability Atlas programme. Do not modify code.

> Identify the next executable Capability Atlas work package and its prerequisites. Do not start implementation.

> Execute ATL-01 only, according to the Master Plan and Atlas governance. Do not perform ATL-02 or unrelated CogniX work.

> Execute the next incomplete work package within ATL-04 only. Preserve all other unfinished CogniX workstreams.

> Audit whether ATL-05 acceptance criteria are fully satisfied and report evidence. Do not advance the programme unless all gates pass.

> Confirm the Architectural Storyboard retirement gate (SB-GATE) status and list which items are still open. Do not merge any storyboard implementation from main.

---

## 8. Definition of Programme Success

On completion a user can answer, from the Atlas alone: what capabilities CogniX has · which are
available in Retail & Grocery · which are reusable across domains · what business problem each solves ·
how to use it · how to test it · how to demonstrate it · how it works technically · which services and
APIs support it · what evidence proves it works · what its limitations are · what comparable approaches
exist · what makes CogniX different · where else it could apply · which capability to show a specific
client · what to say during the demonstration · what to ask the client · what the client may ask ·
what is experimental versus proven · and what the next Atlas work package is.
