# COGNIX ATL-02 — CAPABILITY KNOWLEDGE BACKEND — IMPLEMENTATION REPORT

**Work Package:** `ATL-02` — Capability Knowledge Backend
**Status:** COMPLETED 2026-08-20
**Baseline:** Atlas workstream branch, descended from `origin/Feature/MatchingContract-AutoActivate` @ `5dfba74`
**Governed by:** [`COGNIX_CAPABILITY_ATLAS.md`](../governance/COGNIX_CAPABILITY_ATLAS.md) · [`CAPABILITY_KNOWLEDGE_MODEL.md`](../governance/CAPABILITY_KNOWLEDGE_MODEL.md) · [`CAPABILITY_ATLAS_ARCHITECTURE.md`](../architecture/CAPABILITY_ATLAS_ARCHITECTURE.md) · ADR-045 (as amended) · ADR-046 · ADR-047 · ADR-050 · ADR-052

---

## 1. What was built

| Layer | Artefact | Purpose |
|-------|----------|---------|
| Contract | `packages/contracts/src/capability-atlas-model.ts` | Transport-neutral types for identity, knowledge, relationships, retrieval and validation. Exported from the package index. |
| Identity registry | `config/capabilities.ts` | The canonical compact `CAP-*` registry. 8 seed capabilities. |
| Knowledge content | `content/atlas/capabilities/*.ts` (3 modules) | Per-capability rich knowledge, loaded on demand. |
| Migrated content | `content/atlas/curiosity-questions.ts` | The four `CuriosityQuestion` records lifted out of the component (ADR-046). |
| Repository | `services/atlas/src/capability-registry.ts` | The single access path. Resolves relationships against their own registries. |
| Knowledge store | `services/atlas/src/capability-knowledge-store.ts` | Lazy module loading with a cache. |
| Validator | `lib/atlas/capability-validator.ts` | Rules V1–V14. |
| Search | `lib/atlas/capability-search.ts` | Level 1 deterministic structured search. |
| APIs | `app/api/v1/atlas/{capabilities,capabilities/[id],domains,tags,relationships,evidence,search}` | 7 route handlers. |
| Tests | `tests/unit/run-atl02-tests.ts` | 82 assertions. |

---

## 2. The identity / knowledge boundary

The central constraint on this work package was that the canonical registry stay compact and be
separable from potentially large Atlas knowledge content, so that `ATL-03` can populate deeply without
architectural redesign.

**The split as built:**

```text
config/capabilities.ts                 content/atlas/capabilities/<ref>.ts
─────────────────────                  ────────────────────────────────────
always resident                        loaded on demand, cached
~30 lines per capability               unbounded per capability
identity, relationships, placement,    description, thesis, architecture,
the two STORED maturity dimensions,    evidence, demo paths, limitations,
bounded 240-char summary               market context, cross-domain reuse
what a card / filter / result needs    what a capability page needs
```

The boundary is enforced, not merely documented:

- **V2** rejects any registry summary over 240 characters, so the registry cannot silently become a
  documentation store one long field at a time.
- **Test M2** asserts that no long-form knowledge field name (`description`, `innovation_thesis`,
  `architecture_narrative`, `usage_instructions`) appears anywhere in `config/capabilities.ts`.
- **Test K7** asserts that `?knowledge=false` returns `knowledge: null` — the identity path does not
  pay for content it was not asked for.
- Knowledge modules are reached through a literal lazy-`import()` map, so the bundler resolves every
  target at build time and an unknown ref fails at the store rather than inside a route.

Current shape: **241 registry lines for 8 capabilities, 3 knowledge modules**. `ATL-03` adds modules
and flips `knowledge_ref` from `null`; it changes no schema, no route and no registry field.

---

## 3. Acceptance criteria

| AC | Result | Evidence |
|----|--------|----------|
| `AC-ATL-02-1` **[HARD]** No capability prose in components | **MET** | Test G1/G2. `components/QuestionsWorthAsking.tsx` fell from 250 to 170 lines and now imports the registry. |
| `AC-ATL-02-2` **[HARD]** Validator rejects missing mandatory field and names it | **MET** | Tests D1–D5, F9, F10 — every failure carries `rule`, `capability_id` and `field`. |
| `AC-ATL-02-3` **[HARD]** `CAP-*` unique and well-formed; relationships resolve | **MET** | Tests A2, D1–D4. |
| `AC-ATL-02-4` **[HARD]** Filtering across all required dimensions | **MET** | Tests H1–H12, including AND-across / OR-within semantics. |
| `AC-ATL-02-5` **[HARD]** `QuestionsWorthAsking` renders identically; no regression | **MET** | Tests G3–G5; content moved verbatim; build and full regression green. |
| `AC-ATL-02-6` Registry fields referenced, not copied | **MET** | Tests C1–C4. |
| `AC-ATL-02-7` `tsc` clean; regression green; build clean | **MET** | §5. |
| `AC-ATL-02-8` **[HARD]** No solution/experiment/pattern/lifecycle value copied | **MET** | Test C3 mutates `SOL-DEMAND-02.demoMaturity` at runtime and asserts the resolved value follows. A copy could not pass this. |
| `AC-ATL-02-9` **[HARD]** Four `DDF-01` capabilities, distinct, independently retrievable | **MET** | Tests B1–B4 and K13. |
| `AC-ATL-02-10` Identifiers matched in full, never by numeric suffix | **MET** | Tests E1–E2 against the `PAT-BEH-05` / `PAT-INT-05` collision (`ATL-01` gap `G6`). |

**Additional invariants asserted:** V5 symmetry across the graph (F7–F8), V7 limitations (F4), V8 path
existence (F5), V9 provenance (F6), V12 demo warnings (F3), lens-does-not-fork-content (K9–K10),
domain independence against a fictitious domain (I1–I2), search determinism and explainability
(J1–J9), and the absence of any AI or network dependency in the backend (L1–L2).

---

## 4. Three defects this work package found in its own governance

Recorded rather than quietly fixed, because each changes a governance assumption.

### 4.1 `cross_domain_platform` is not a domain

The `ATL-01` taxonomy proposed a `cross-domain-platform` placement, and the seed registry initially
used it. **Validation rule V3 rejected it**: `config/domains.ts` is a catalogue of *industry* domains
(`retail_grocery`, `cpg`, `manufacturing`, …) with no cross-domain entry.

Adding a pseudo-domain to an industry catalogue to house platform capabilities would pollute a registry
the Atlas does not own. **Resolution:** a platform capability carries `domains: []`, and its reach is
expressed by `platform_reusable` plus the `cross_domain_applicability` assessment in its knowledge
module. *"Which capabilities are reusable?"* is a `platform_reusable=true` filter, not a domain lookup.
Three of the eight seed capabilities are modelled this way.

### 4.2 Atlas audience lenses are not product personas

`CAPABILITY_KNOWLEDGE_MODEL.md` §8 stated lenses are "driven by `config/personas.ts`". Building it
showed the two are different sets:

- `config/personas.ts` holds **19 decision lenses for the client's own decision-makers** — Innovation
  Executive, COO, Category Lead, Demand Planner, Enterprise Architect and so on.
- The four Atlas lenses describe **who is reading the Atlas** — Innovation Executive, Sales, Architect,
  Developer.

`exec` maps cleanly onto Innovation Executive and `enterprise_architect` onto Architect, but **the
Sales lens has no counterpart**: CogniX models the client's decision-makers, not its own sellers.
Collapsing the two sets would either invent a sales persona in the product or lose the lens.

**Resolution:** `CapabilityIdentity.personas` (who the capability serves) is validated against
`config/personas.ts`; `AudienceLens` (who is reading) is a separate declared four-value vocabulary.
`ATL-04` reconciles their presentation.

### 4.3 Three invented persona ids and one invented domain id in the seed

The first seed registry used `commercial_planning`, `data_intelligence`, `technology` and
`cross_domain_platform` — none of which exist. **V3 caught all four before commit.** They were replaced
with real identifiers (`demand_planner`, `cdao`, `decision_scientist`, `supply_chain_planner`,
`enterprise_architect`). This is the closed-vocabulary rule performing exactly the function it was
written for, and it is worth recording that it caught a real error on its first use.

---

## 5. Validation

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 diagnostics** |
| `npx tsx tests/unit/run-atl02-tests.ts` | **82 passed, 0 failed** |
| Full existing regression (25 runners) | **23 exit-0**; `run-cdi07a` and `run-cdi07b` fail identically **on the untouched baseline** — see §5.1 |
| `npm run build` | **Compiled successfully**; all 7 Atlas routes registered |
| `git diff --check` | clean |

Recorded baselines held exactly: `CDI-01` 21, `CDI-02` 36, `CDI-03` 31, `CDI-04` 49, `CDI-05` 70,
`CDI-06` 93, `CDI-08` 44, `ESF-2` 19, `ESF-3` 22, `ESF-6` 81, `IFI-01` 12, `DDF-01` 56,
campaign-intelligence 133, campaign-decision-journey 96, decision-dimensions 173.

### 5.1 Two pre-existing failures, proven not to be this work package's

`run-cdi07a-tests.ts` and `run-cdi07b-tests.ts` exit non-zero. Both spawn **child processes** that
re-run sibling suites, and the child cannot resolve `tsx` — `tsx` is not in `package.json`, so `npx`
fetches it transiently and the transient copy is not visible to the child.

Verified against a pristine `git worktree` of `origin/Feature/MatchingContract-AutoActivate`:

| Suite | Baseline | This branch |
|-------|----------|-------------|
| `run-cdi07a-tests.ts` | 154 passed, **1 failed** | 154 passed, **1 failed** |
| `run-cdi07b-tests.ts` | 228 passed, **7 failed** | 228 passed, **7 failed** |

Identical. Not caused by, and not fixed by, `ATL-02` — adding `tsx` to `devDependencies` would repair
it but is outside this work package's scope and is left as a recorded observation.

---

## 6. Seed set, and what it deliberately is not

Eight capabilities are registered. This is **not** an `ATL-03` population and must not be read as one:
`ATL-01` inventoried **33** capabilities. The eight were chosen because each exercises a structural
case the model must survive.

| Capability | Structural case |
|---|---|
| `CAP-FORECAST-STABILITY`, `CAP-DECISION-GAP`, `CAP-DECISION-WINDOW`, `CAP-DECISION-REGRET` | One work package → four capabilities (the ADR-052 cardinality case) |
| `CAP-OBSERVATION-CORRESPONDENCE` | One capability → two work packages (`CDI-08` + `ESF-6`) |
| `CAP-COMMITMENT-INTELLIGENCE` | All three registry relationship types at once (`SOL-*`, `EXP-*`, `PAT-*`) |
| `CAP-SHARED-DECISION-STATE` | An unregistered capability — real, contracted, tested, in no registry |
| `CAP-CURIOSITY-QUESTIONS` | An `experience` capability whose content is the ADR-046 migration target |

Three carry knowledge modules; five carry `knowledge_ref: null`, which is the honest pre-`ATL-03`
state and is not a validation failure. `CAP-DECISION-WINDOW` deliberately carries
`partially-implemented` status with field-level detail and mandatory demo warnings, so the V7/V12 path
is exercised by real content rather than only by a synthetic fixture.

---

## 7. Handoff to ATL-03

**Adding a capability's knowledge is:** author `content/atlas/capabilities/<ref>.ts` exporting
`knowledge: CapabilityKnowledge`; register the ref in the `KNOWLEDGE_MODULES` map in
`services/atlas/src/capability-knowledge-store.ts`; set `knowledge_ref` on the identity. No schema
change, no route change, no registry growth beyond one field.

**Adding a capability is:** one `CapabilityIdentity` entry with a `CAP-*` id and its relationships.

**Validate with:** `npx tsx tests/unit/run-atl02-tests.ts`, then `npx tsc --noEmit` and `npm run build`.

**Open items carried into ATL-03 / ATL-04:**

1. `CAP-*` identifier allocation is by hand today. A collision is caught by V1 only at validation time.
2. The remaining 25 inventoried capabilities are unregistered.
3. V8 path existence needs an injected `fileExists`; it runs under the test runner, not inside a route.
   Wiring it into a governance script is `ATL-07` work.
4. Atlas lens ↔ product persona presentation reconciliation is `ATL-04` (§4.2).
5. `tsx` is not a declared dependency (§5.1).
