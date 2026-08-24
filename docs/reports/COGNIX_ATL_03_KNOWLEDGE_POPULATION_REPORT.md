# COGNIX ATL-03 — CAPABILITY KNOWLEDGE POPULATION — IMPLEMENTATION REPORT

**Work Package:** `ATL-03` — Retail & Grocery Knowledge Population
**Status:** COMPLETED 2026-08-20
**Baseline:** Atlas workstream branch, descended from `origin/Feature/MatchingContract-AutoActivate` @ `5dfba74`
**Governed by:** [`COGNIX_CAPABILITY_ATLAS.md`](../governance/COGNIX_CAPABILITY_ATLAS.md) · [`CAPABILITY_KNOWLEDGE_MODEL.md`](../governance/CAPABILITY_KNOWLEDGE_MODEL.md) · ADR-045 (as amended) · ADR-046 · ADR-047 · ADR-050 · ADR-052

---

## 1. What was populated

**38 capabilities registered, 38 knowledge modules authored.** Every capability carries identity,
relationships, all three ADR-047 maturity dimensions, and a knowledge module with usage, testing,
architecture, evidence, demo path, limitations, cross-domain applicability, related capabilities and
cited source, code and test references.

| Dimension | Distribution |
|-----------|--------------|
| Implementation status | 29 `implemented` · 6 `partially-implemented` · 3 `simulated` |
| Innovation lifecycle | 23 `Prototype` · 2 `Concept` · 1 `Retired` · 12 not owned by an experiment (`null`) |
| Capability type | 11 domain · 9 enabling-service · 7 platform · 6 governance-control · 5 experience |
| Platform reusable | 28 of 38, each justified by ≥2 assessed domains (V10) |

**Zero capabilities are `concept` or `roadmap`.** Every registered capability is evidenced in code.
Nothing was admitted on documentation alone (ADR-052).

---

## 2. Reconciliation with the ATL-01 inventory

`ATL-01` reported **33** capabilities. The registry holds **38**. The difference is reconciliation,
not invention, and it decomposes exactly:

| Source | Count | Note |
|--------|-------|------|
| Registered solutions (`SOL-*`) | 4 | §3 of the inventory |
| Registered experiments (`EXP-*`) | 5 | §4 |
| Unregistered but governed (`U-01`…`U-22`) | 20 | §5, excluding `U-09` |
| Experience / platform (`E-01`…`E-11`) | 9 | §6, excluding `E-06`/`E-07` |
| **Total** | **38** | |

Two deliberate resolutions, both recorded rather than assumed:

- **`U-09` (DDF-01 umbrella) is not a capability.** It is the work package that delivered `U-10`…`U-13`.
  Registering it would have created a fifth capability that is merely the sum of four others, which is
  precisely the conflation ADR-052 exists to prevent. It appears as `delivered_by: ['DDF-01']` on four
  records instead.
- **`E-06` and `E-07` are surfaces, not capabilities.** The Help shell's Journey Telemetry and
  Enterprise Signals tabs render `WP10-B` and `ESF-1`. They are presentation of capabilities already
  registered as `CAP-JOURNEY-TELEMETRY` and `CAP-ENTERPRISE-SIGNAL`, and registering them separately
  would double-count.

`ATL-01`'s handoff line — "20 unregistered but governed, 4 experience/platform beyond those counted in
§6" — undercounted §6, which lists eleven rows. The arithmetic above supersedes that line. The
inventory's capability tables are unchanged and remain correct.

### 2.1 Two split candidates raised, not taken

ADR-052's cardinality rule would arguably justify splitting two further records, and `ATL-03` did
**not** split them unilaterally:

- **`CDI-07A`** delivered *Decision Contract* and *Decision Half-Life*. The governance treats
  Half-Life as a distinct concept with its own owner ruling (W2) and its own prohibition against
  sharing an indicator with the Decision Window (ADR-042).
- **`CDI-07B`** delivered *three separate artefacts* — `CampaignPreMortem`,
  `PredictionOutcomeComparison` and `LearningCandidate` — in the Master Plan's own words.

Both meet the `DDF-01` test on their face. Both are registered as **one capability each**, matching the
granularity `ATL-01` evidenced, with the split recorded here as an owner decision. Splitting them would
take the registry to 41 and is a governance choice, not an authoring one.

---

## 3. Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| `AC-ATL-03-1` **[HARD]** Every record passes the ATL-02 validator | **MET** | `run-atl03-tests.ts` B1, C1 — identity and knowledge validation across all 38 |
| `AC-ATL-03-2` **[HARD]** Every behavioural claim traces to a path, test, or is labelled | **MET** | D1–D5: every capability cites ≥1 implementation reference and ≥1 evidence ref; every cited path, runner, report and governance document is asserted to exist |
| `AC-ATL-03-3` **[HARD]** Field-level status where parts differ | **MET** | E4–E5 — field-level status on 8+ capabilities, each with an explanatory note |
| `AC-ATL-03-4` **[HARD]** Market claims carry provenance or are absent | **MET** | V9 enforced; `external_evidence` is empty across the corpus because **no market study has been performed**. Absence is stated, not filled |
| `AC-ATL-03-5` **[HARD]** Demo warnings non-empty for anything not fully implemented | **MET** | E2 — asserted across all 9 not-fully-implemented capabilities |
| `AC-ATL-03-6` Cross-domain applicability stated, including `not-assessed` | **MET** | F1–F4 |
| `AC-ATL-03-7` Prior defect findings reflected in limitations | **MET** | `D-DDF-1`/`D-DDF-2`/`D-DDF-3`, `Y4-gov`, `G5`, `G6`, `F2`, `F5` all carried into the limitations of the capabilities they affect |

**29 ATL-03 assertions, all passing.** The ATL-02 suite grew from 82 to 119 assertions against the
populated corpus and passes in full.

---

## 4. Honesty carried into the records

The population's main risk was over-claiming. Prior findings were carried forward verbatim rather than
quietly dropped:

| Finding | Carried into |
|---------|--------------|
| `D-DDF-2` — the "91% forecast confidence" figure was an unsupported backtest claim | `CAP-DEMAND-FORECAST` limitation, and a demo warning instructing the presenter not to repeat the registry's own five-second proposition |
| `D-DDF-1` — a literal standing in for a calculation | `CAP-PREDICTIVE-INVENTORY` and `CAP-CATEGORY-INTELLIGENCE`, whose static arrays are recorded at field level with mandatory demo warnings |
| `F2` — `EXP-CDI-01` understates its own family by seven work packages | `CAP-CAMPAIGN-DECISION` limitation |
| `F5` — `Production Ready` demo maturity over `simulated` implementation | `CAP-PREDICTIVE-INVENTORY`: the two dimensions are shown together, which is the combination ADR-047 exists to expose |
| `G2` — `EXP-MEMORY-03` registered `Concept` while a store and API exist | `CAP-ENTERPRISE-MEMORY` limitation; promotion is left as a human decision |
| `G5` — industry-pack identifiers diverge from the domain catalogue | `CAP-DOMAIN-PERSONA-CONTEXT` limitation |
| `G6` — `PAT-BEH-05` / `PAT-INT-05` suffix collision | `CAP-LEARNING-PATTERN-REGISTRY` limitation — and see §5 |
| `Y4-gov` — seeded telemetry is uncalibrated demonstration constants | `CAP-ENTERPRISE-MEMORY` and `CAP-LEARNING-PATTERN-REGISTRY` field status |
| `ESF-3` — all seven connectors marked synthetic, no registration path | `CAP-SIGNAL-CONNECTOR` limitation and field status |

Six capabilities carry **no dedicated test runner**, and each says so in its own limitations rather
than leaving the gap silent: `CAP-PREDICTIVE-INVENTORY`, `CAP-CATEGORY-INTELLIGENCE`,
`CAP-OPPORTUNITY-INTELLIGENCE`, `CAP-INNOVATION-PORTFOLIO`, `CAP-EXPERIMENT-CANVAS`,
`CAP-AUTH-PLATFORM-SETUP`, `CAP-GOVERNANCE-SETTINGS`, `CAP-DOMAIN-PERSONA-CONTEXT`.

---

## 5. One genuine defect found and fixed

**Level 1 search conflated governed identifiers by numeric suffix.**

`AC-ATL-02-10` requires identifiers to be matched in full, never by numeric suffix — the rule that
exists because `PAT-BEH-05` and `PAT-INT-05` are different patterns. `ATL-02`'s validator honoured it;
its **search did not**, and with only eight capabilities seeded nothing collided so nothing failed.

Populating the registry made the collision reachable. The tokeniser normalised `DDF-01` into the tokens
`ddf` and `01`, and `01` then matched `CDI-01` on `CAP-CAMPAIGN-DECISION`, which tied into the top four
results for a `DDF-01` search and displaced a genuine `DDF-01` capability.

**Fix:** the tokeniser now extracts identifier-shaped tokens whole (`DDF-01`, `CDI-07A`,
`SOL-PROMO-01`, `PAT-BEH-05`) and matches them by equality rather than substring, with a multiplier so
an identifier hit outranks a free-text hit. Free-text tokenisation is unchanged for everything else.
Asserted by `run-atl02-tests.ts` J5 and J6.

This is a defect fix inside the ATL-02 search module, not an architectural redesign: the contract, the
registry shape, the repository interface and every route are untouched.

---

## 6. The ATL-02 boundary held under population

The constraint on this work package was that populating deeply must not require redesign.

| | ATL-02 (8 capabilities) | ATL-03 (38 capabilities) |
|---|---|---|
| Registry | 241 lines | 31,026 characters |
| Knowledge | 3 modules | 38 modules, 156,274 characters |
| Ratio | — | knowledge is **5×** the registry |

Nothing in the contract, repository, validator or routes changed to accommodate the population. Adding
a capability remained one identity entry; adding knowledge remained one module plus one
`knowledge_ref`. Asserted by `run-atl03-tests.ts` J1–J2.

One authoring convenience was added: `content/atlas/authoring.ts` exports `defineKnowledge`, a factory
that fills unstated collections with genuine emptiness so a module declares only what it has. It is a
factory over the existing contract — the stored shape, the validator and the routes are unchanged.

**The 8-capability seed was treated as a reference pattern, not rewritten.** The three ATL-02 knowledge
modules keep their hand-authored content; only their `related_capabilities` arrays were replaced, with
the symmetric closure computed across the whole graph so V5 holds by construction rather than by hand.

---

## 7. Validation

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 diagnostics** |
| `npx tsx tests/unit/run-atl03-tests.ts` | **29 passed, 0 failed** |
| `npx tsx tests/unit/run-atl02-tests.ts` | **119 passed, 0 failed** (grew from 82) |
| Full regression (26 runners) | **24 exit-0**; `run-cdi07a` and `run-cdi07b` reproduce their baseline counts exactly — 154/1 and 228/7 — from the pre-existing missing `tsx` dependency in spawned child processes |
| `npm run build` | **Compiled successfully**; 7 Atlas routes registered |
| `git diff --check` | clean |

---

## 8. Scope discipline

Explicitly **not** done, per the work package boundary: no UI work, no semantic search, no provider
integration, no web grounding, no lifecycle automation, no repair of the eight orphaned components, no
repair of the legacy `tsx` test-infrastructure issue, and no capability invented without evidence.
`Demand Fusion` and `Forecast Regret` remain unregistered and are asserted absent by `run-atl03-tests.ts` I1.

---

## 9. Handoff to ATL-04

**The corpus is ready to render.** Every capability answers: what it is, the business problem, all
three maturity dimensions, how to use it, how to test it, how it is built, what proves it, how to
demonstrate it, what it cannot do, where else it might apply, and what it relates to.

**Open items:**

1. **Two split candidates** (§2.1) — `CDI-07A` → 2 and `CDI-07B` → 3 — await an owner decision.
2. **`external_evidence` is empty corpus-wide.** No market study has been performed. `ATL-06` supplies
   market context under the provenance rules; until then the absence is honest and visible.
3. **Eight capabilities have no dedicated test runner** (§4). Recorded in their limitations; closing
   the gaps is not Atlas work.
4. **12 capabilities have `lifecycle_state: null`** because no experiment owns them. This is
   ATL-01 gap `G1` showing through: the experiment registry is the only owner of lifecycle, and these
   capabilities were never registered as experiments.
5. **`questions_worth_asking` is empty on all 38.** The four migrated `CuriosityQuestion` records are
   estate-level rather than capability-scoped. Binding them to capabilities, and authoring
   capability-scoped questions, is a small `ATL-04` task best done against a rendered surface.
