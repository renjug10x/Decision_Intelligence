# COGNIX `ATL-06A` — EXTERNAL GROUNDING & PROVENANCE ARCHITECTURE

**Work Package:** `ATL-06A` — External Grounding & Provenance Architecture
**Status:** COMPLETED
**Date:** 2026-08-21
**Owner:** G10X Enterprise Innovation Lab Architecture Board
**Governing decisions:** ADR-048 (three evidence classes), ADR-049 (server-side, refuse rather than
fabricate), **ADR-053** (contradiction precedence — new), **ADR-054** (source admission — new)
**Branch:** `claude/cognix-capability-atlas-v2`

---

## 1. What was asked, and what was built

`ATL-06` was split into four on owner decision. `ATL-06A` was authorised alone:

> *Establish the external-grounding and provenance architecture, test it exhaustively, update
> governance, commit/push, and report back.*

The phase ships **the rules by which external knowledge may reach a reader, and nothing that
exercises them**. There is no provider adapter, no network call, no market content and no client
pack. That absence is the design, not a shortfall: the first adapter built becomes the de facto
specification for everything after it, so the admission gate, the three-class separation, the
contradiction rule and the refusal path had to be provable **before** any provider existed to shape
them. Everything below was tested with no key, no quota and no network.

**Delivered:**

| Area | Artefact |
|------|----------|
| Contract | `packages/contracts/src/atlas-grounding-model.ts` — evidence classes, source provenance, admission reasons, freshness, intent, contradiction, the grounded envelope |
| Policy | `lib/atlas/grounding/policy.ts` — question classification, fail-safe rule, per-topic currency bounds |
| Admission | `lib/atlas/grounding/provenance.ts` — allowlist, tiers, provenance completeness, date plausibility, CogniX-assertion rejection, freshness |
| Contradiction | `lib/atlas/grounding/contradiction.ts` — governed constraints × claim assertions, three-way separation |
| Provider seam | `lib/atlas/grounding/provider.ts` — `ExternalGroundingProvider`, registry **empty by design** |
| Engine | `lib/atlas/grounding/engine.ts` — envelope assembly, absence reasons, refusal, `GroundedAskAnswer` |
| API | `GET /api/v1/atlas/grounding` — the declared policy, published |
| Surface | `components/atlas/EvidenceClasses.tsx` + `app/globals.css` evidence-class block |
| Tests | `tests/unit/run-atl06a-tests.ts` — **115 assertions, 115 passing** |
| Governance | ADR-053, ADR-054; charter §0/§3/§4 split into `ATL-06A`…`ATL-06D`; `MASTER_PLAN.md`; `CAPABILITY_ATLAS_ARCHITECTURE.md` §10 rewritten |

---

## 2. The four rules, and how each is enforced

### 2.1 When external knowledge is allowed at all

Classification runs **before** any adapter is consulted, and fails safe downward.

| Question | Intent | External retrieval |
|----------|--------|--------------------|
| *how does Decision Gap work* | `internal-only` | not permitted |
| *zzz nothing at all* | `internal-only` | not permitted — an unclassifiable question does not reach for the web |
| *how does CogniX compare to Blue Yonder on promotion planning* | `external-permitted` (`failed_safe: true`) | context only; the CogniX part stays governed |
| *is CAP-DECISION-GAP more mature than the market alternatives* | `external-permitted` | naming a `CAP-*` identifier is itself a CogniX-identity signal |
| *what do competitors offer for promotional forecasting* | `external-required` | permitted, and **refused** if nothing admissible is found |

The gate sits above the adapter, not inside it. With a willing fake provider registered, an
`internal-only` question **never called it** — asserted by a spy on the retrieval interface (`E9`).
That is what makes `AC-ATL-06A-3` hold regardless of what an adapter would have volunteered.

An unrecognised topic inherits the **strictest** currency bound, not the most permissive, so novelty
buys no leniency (`B8`).

### 2.2 Provenance is an admission condition, not an ornament

Nine declared rejection reasons, every one exercised:

| Reason | Trigger |
|--------|---------|
| `external-not-permitted` | policy says internal-only — a perfectly sourced claim is still not shown |
| `empty-claim` | no claim text |
| `missing-provenance` | any of url, publisher, title, retrieval date absent |
| `undated-source` | no parseable publication date — **a date is never inferred** |
| `insecure-source` | not resolvable `https` |
| `source-not-allowlisted` | publisher host not on the declared list |
| `inadmissible-tier` | vendor marketing, community, unknown |
| `implausible-date` | future-dated, or retrieved before published |
| `stale-source` | beyond the topic's currency bound |
| `asserts-cognix-fact` | the claim states what CogniX does |

Two properties matter more than the list. First, a rejected claim is **recorded and surfaced as a
count with its reason**, so a thin market section and a censored one are distinguishable to a reader
(`C11`, `K6`). Second, the checks are ordered so a claim wrong in several ways reports the **first
structural failure**, not an incidental later one — an auditor reading `missing-provenance` does not
have to wonder whether it was also stale (`C12`).

Host matching is dot-bounded: `www.gartner.com` and `gartner.com` pass; `gartner.com.example.net` and
`notgartner.com` do not (`D6`).

### 2.3 Freshness is per topic and has three verdicts

`fresh` / `aging` / `stale`, against a bound declared per topic class — 180 days for pricing, 365 for
market landscape and third-party platform capability, 540 for analyst commentary, 730 for research. A
200-day-old price is stale where a 200-day-old study is not (`D5`). An expired source is **not shown
with a warning; it is not shown** (`D4`).

### 2.4 Contradiction precedence — the owner's worked example

Detection is deterministic. A governed record yields **constraints** — what it already declares about
synthetic inputs, non-real implementation status, demonstration-grade maturity or early lifecycle. An
external claim yields **assertions** — declared phrases attributing liveness, production use, scale or
settled maturity. A constraint and an assertion on the same dimension, about the same capability, is a
contradiction.

The owner set the example with a "Decision Twin". This estate has no capability of that name, so the
test uses its real analogue — `CAP-PROMOTION-INTELLIGENCE`, whose governed record carries the
high-severity limitation *"Supplier capacity and elasticity come from the synthetic enterprise world,
not a client planning system."* Against the claim *"Real-time promotion monitoring against live
supplier feeds is expected of production-grade retail planning platforms"* the engine produces:

```
From CogniX        Promotion Intelligence records the limitation: Supplier capacity and
                   elasticity come from the synthetic enterprise world, not a client
                   planning system.                        [CAP-PROMOTION-INTELLIGENCE]

Market Context     Real-time promotion monitoring against live supplier feeds is expected
                   of production-grade retail planning platforms.
                   [Gartner · analyst · published 2026-06-22 · retrieved 2026-08-20 · fresh]

AI Interpretation  The market expectation described here rests on live operational inputs.
                   The governed record above states which inputs are actually in play, so
                   the gap between them reads as a possible productisation direction rather
                   than a current capability.               [rests on CAP-PROMOTION-INTELLIGENCE]
```

Three distinct strings, three separately styled rows, `resolution: 'cognix-authoritative'`, and **no
fourth row** — because `ContradictionRecord` has no field capable of holding a merged, reconciled or
synthesised statement, and its `resolution` is a literal type with one value. The test asserts the
absence of such a field by reading the contract source, not by trusting the prose (`A3`, `A4`, `F10`,
`K3`).

The market claim is carried **unaltered**; it is not edited to agree with the record (`F6`). The
interpretation names a direction and asserts no CogniX fact — proven by running it back through the
CogniX-assertion detector, which does not flag it (`F9`).

Two negative cases matter as much as the positive one. The same claim also asserts
`implementation` — *"production-grade"* — but `CAP-PROMOTION-INTELLIGENCE` is recorded `implemented`,
so it declares no implementation constraint and **no contradiction is raised** on that dimension
(`F11`). And `CAP-CONTRACT-VERIFICATION`, which declares no constraint at all, cannot manufacture a
contradiction out of the same claim (`F12`). The mechanism does not degrade into noise.

It also generalises without special-casing: `CAP-SIGNAL-CONNECTOR` records *"All seven adapters are
reference implementations marked synthetic"*, so it is defended by the identical code path (`F12b`).
Any record that declares what its inputs actually are is protected automatically, without anyone
remembering to protect it.

---

## 3. No provider can overwrite a governed capability fact

This was tested with a **hostile adapter**, not a cooperative one. It returns a claim with flawless
provenance from an allowlisted analyst host, dated correctly, that says:

> *"CogniX provides fully implemented real-time promotion monitoring against live client supplier feeds."*

Result: rejected as `asserts-cognix-fact` — not downgraded, not rendered with a caveat, because a
caveated false statement about this estate is still a false statement about this estate (`E4`, `E5`).
Nothing it said reached the From CogniX class (`E6`), every From CogniX statement remained attributed
to a governed capability (`E7`), and `CAP-PROMOTION-INTELLIGENCE` was **byte-identical before and
after** the hostile provider ran against it (`E8`).

The containment is structural rather than behavioural: the From CogniX block is built **only** from
the `ATL-05` answer, which is itself built only from governed records, so no external input has a path
into it.

---

## 4. `ATL-05` behaviour is preserved exactly

This was the constraint most worth proving, and it is proven by independent recomputation rather than
by inspection. For each of four canonical questions the suite assembles the `ATL-05` answer using the
`ATL-05` modules only — retrieve, resolve, `assembleAnswer` — and compares it to `ask()` with the
`grounding` field stripped:

| Question | `ATL-05` portion identical | Market Context |
|----------|---------------------------|----------------|
| *how does Decision Gap work* | yes | explicitly absent, with reason |
| *why did the decision change* | yes | explicitly absent, with reason |
| *what do competitors offer* | yes | explicitly absent, with reason |
| *zzz nothing at all* | yes | explicitly absent, with reason |

Then the same four run again **with a provider registered and returning claims** — and the `ATL-05`
portion is still byte-identical (`H3`). Turning grounding on changes no governed field of any answer.

A gap is still a gap: grounding did not turn an unanswerable question into an answerable one (`H4`).
The `ATL-05` external notice and the `ATL-06A` refusal coexist rather than replacing one another
(`H5`).

Absence is never silence. Four distinct absence reasons are produced and asserted:

- policy said internal-only, with the routing reason quoted;
- no provider configured — *"empty because nothing was looked up, not because nothing exists"*, naming
  `ATL-06B` and `ATL-06C`;
- provider failed — *"none has been substituted from memory"*;
- evidence retrieved and all of it inadmissible, with the reasons listed.

### Refusal, in three distinguishable forms

For `external-required` questions with nothing admissible, the engine refuses and says which case
applies: `no-grounding-provider` (`G1`), `all-claims-rejected` (`G4`), `insufficient-grounding` — a
provider that exists and found nothing (`G5`). A provider crash degrades to stated absence while the
governed answer survives intact (`G6`, `G7`).

---

## 5. Verification

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | **0 diagnostics** |
| `npx tsx tests/unit/run-atl06a-tests.ts` | **115 passed, 0 failed** |
| `npx tsx tests/unit/run-atl05-tests.ts` | 54 passed — unchanged |
| `npx tsx tests/unit/run-atl04-tests.ts` | 54 passed — unchanged |
| `npx tsx tests/unit/run-atl03-tests.ts` | 29 passed — unchanged |
| `npx tsx tests/unit/run-atl02-tests.ts` | 119 passed — unchanged |
| `npm run build` | clean; `/api/v1/atlas/grounding` registered |
| Estate regression | 27 of 29 runners exit 0; `run-cdi07a` (154/1) and `run-cdi07b` (228/7) unchanged at their pre-existing baseline |

### Live render, validated at two viewports

The Atlas was built and driven in a browser at **1440×1000** and **720×1000**. All three class labels
render, no horizontal overflow occurs at either width, and the only console error is the pre-existing
Google Fonts `ERR_CONNECTION_RESET` that has been present since the foundation commit.

For *"what do competitors offer for promotional forecasting"* the surface shows, in order: the ATL-05
answer inside a green-accented **From CogniX** block; the `external required` routing decision with
its reason; the refusal — *"The question is refused rather than answered from an approximation"*; a
blue-accented **Market Context** block stating *"This section is empty because nothing was looked up,
not because nothing exists"* and naming `ATL-06B` and `ATL-06C`; and an amber-accented
**AI Interpretation** block stating that no interpretation is offered because none could rest on a
governed statement.

The contradiction path cannot be reached through the UI without a provider, so it was rendered
server-side from the real engine output using the real stylesheet. It produces the three separated,
separately coloured rows shown in §2.4 — governed statement with its citation, market claim with
publisher and both dates and a `FRESH` currency chip, interpretation last — and no fourth row.

**No network call, no SDK, no credential.** The grounding layer is scanned in test: no `fetch`,
`axios`, `node-fetch` or `XMLHttpRequest`; no Gemini, Google or OpenAI import; and **no
`process.env`, `API_KEY`, `apiKey`, `Authorization` or `Bearer`** anywhere (`I1`–`I3`). The published
policy contains no string matching `key` or `token` (`J5`). The dependency runs one way only: answer
assembly does not import the grounding layer, so `ATL-05` cannot be altered by anything downstream of
it (`I5`).

---

## 6. Two decisions taken, recorded as ADRs

**ADR-053 — a contradiction is separated, never resolved.** ADR-048 said external research may not
redefine a capability; it did not say what happens when the two disagree, and that omission is where
the rule would have failed in practice. The decision makes the governed fact authoritative, renders
the disagreement as three classes, and removes from the contract any field capable of holding a merged
statement.

**ADR-054 — provenance, tier and freshness are admission conditions.** Attribution alone is weaker
than it appears: an attributed blog post, an attributed vendor marketing page and an attributed
three-year-old study all look equally authoritative beside a governed record. Admission is a pure
function of the claim, an allowlist, the clock and the published policy — which is why it could be
proven before a provider existed, and why `ATL-06B` cannot weaken it by supplying one.

---

## 7. Findings and honest limitations

1. **The owner's worked example names a capability this estate does not have.** There is no "Decision
   Twin" in the 38-capability corpus. Rather than invent one, the rule was proven against its real
   analogue, `CAP-PROMOTION-INTELLIGENCE`, whose governed limitation is exactly the shape the example
   describes. The separation is identical; only the capability name differs.
2. **A test premise was wrong and the engine was right.** The suite initially asserted that
   `CAP-SIGNAL-CONNECTOR` could raise no contradiction. It can, and should: its record declares
   *"reference implementations marked synthetic"*. The assertion was corrected and a second one added
   (`F12b`) proving the rule generalises rather than being tuned to one capability.
3. **The allowlist is 24 hosts and deliberately short.** An allowlist that admits everything is not an
   allowlist. Genuinely useful evidence from an unlisted publisher is dropped today; extending the
   list on evidence, with a written justification per publisher, is `ATL-06C`'s work.
4. **`external_evidence` remains empty corpus-wide.** An architecture that admits evidence is not
   evidence. `ATL-06C` owns content.
5. **Three phase pointers were corrected.** The `ATL-05` external notice, and comments in
   `retrieval.ts` / `provider.ts` / `CapabilityDetail.tsx`, named `ATL-06`, which no longer exists as
   a phase. They now name `ATL-06B` and `ATL-06D`. The `ATL-03` and `ATL-05` handoff records in the
   charter still read `ATL-06` as written at the time; they are historical records and were not
   rewritten, and the split notice in §0 resolves them.
6. **A readability defect was found by looking at it, not by testing it.** A contradicting claim
   appears twice — once in the contradiction block, once in the complete external record — and the
   second appearance read as duplication. Both belong there, so the fix was to annotate the second:
   *"This claim disagrees with a governed record. The separated reading is above."* Asserted by `K6b`.
7. **One ATL-04 assertion was narrowed, and it was right to narrow it.** `run-atl04-tests.ts` I1
   guarded ATL-04's scope by scanning every file in `components/atlas/` for grounding or provider
   code. `ATL-06A` legitimately added `EvidenceClasses.tsx` there, which would have turned a scope
   guard into an assertion that later phases never shipped. It now scans the four files ATL-04 owns.
   No other test was changed.
8. **Interpretation is emitted only from contradictions.** In `ATL-06A` a contradiction is the only
   case where a deterministic statement can rest on a cited governed statement. Anything broader
   would be generated prose, which needs a provider — `ATL-06B`.
9. **Carried open items, unchanged:** `CDI-07A`/`CDI-07B` ADR-052 split candidates await an owner
   decision · **SB-GATE remains 0 of 6 advanced** and the storyboard is untouched · `tsx` is not a
   declared dependency, which is the cause of the two pre-existing runner failures · eight
   capabilities have no dedicated test runner · twelve carry `lifecycle_state: null`, preserved
   honestly.

---

## 8. Exit gate

> *The rules that decide what a reader is and is not shown are declared, published, enforced by types
> where possible, and proven against an adapter that actively tries to break them — with no adapter
> shipped.*

Met. All ten `ATL-06A` acceptance criteria pass, the eight hard ones included.

**Next executable work package: `ATL-06B` — Google AI Provider & Semantic Retrieval.** Its hard
acceptance criterion is already written into the charter: *turning the provider off must not make
CogniX less trustworthy than `ATL-05`*. `run-atl06a-tests.ts` must pass **unchanged** after it lands;
if the adapter requires the gate to be loosened, the adapter is wrong.
