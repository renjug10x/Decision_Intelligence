# `SCI-07` — Scenario Authoring Domain & Governed GenAI Drafting

**Status:** DELIVERED. **Wave 3, Cursor lane.** Cut from the head of
`feature/cognix-sci-wave2-convergence`, which carries **SHA-C**.
**Branch:** `feature/cognix-sci-07-scenario-authoring`.
**Governs:** ADR-083 (implemented here), ADR-044 Amendment B, ADR-067, ADR-082, ADR-073 Amendment A,
ADR-080.
**Packet record:**
[`COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md`](../governance/COGNIX_SCENARIO_INTELLIGENCE_WORK_PACKETS.md) §`SCI-07`.

**Gate D is NOT claimed by this record.** `SCI-09` is the concurrent Antigravity lane and the Wave-3
convergence is a separate, deliberate act by one operator. Nothing here authorises `SCI-08`.

---

## 1. Base verification, performed before anything was changed

| Condition | Verdict |
|---|---|
| Base is the head of `feature/cognix-sci-wave2-convergence` | **PASS** — `9036330ec4c65cb894b6b3bf42a000e71ceed5cb` |
| That base contains SHA-C `c7c9f64fd15cb9b767cf585f960a7018141a55cf` | **PASS** — `git merge-base --is-ancestor` |
| Gate C PASSED | **PASS** — recorded 2026-09-18, work-packet record §9 |
| All three scenarios `CERTIFIED` | **PASS** — re-measured here, 12/12 dimensions and 84 checks each |
| `SCI-07` and `SCI-09` authorised concurrently | **PASS** — §4 concurrency matrix permits exactly this pairing |
| The Scenario Draft contract is owned by `SCI-07` | **PASS** — §3, declared at Gate B, implemented in Wave 3 |
| Clean working tree at the base | **PASS** |

**One discrepancy in the instruction, stated rather than silently resolved.** The work order named the
required base as the literal placeholder `<WAVE_3_BASE_FULL_SHA>`, which was never substituted. The
base was therefore established from the two conditions the order also gave — the head of
`feature/cognix-sci-wave2-convergence`, containing SHA-C — and both were verified against the
repository before the branch was cut. Recorded here because a packet cut from a SHA the register does
not name is exactly the drift ADR-084 part 2 exists to prevent.

---

## 2. What was built

### 2.1 The Scenario Draft contract — `packages/contracts/src/scenario-draft-model.ts`

The contract `SCI-07` owns, declared at Gate B and implemented here. It holds the BUSINESS INPUTS a
person may author and nothing else. `CanonicalScenario` remains the single scenario model; a draft
**resolves into one**.

**The design decision the rest of the packet rests on: two tiers per quantitative dimension.**

ADR-083 part 1 rules that GenAI *"may propose that supplier flex is limited … It may not propose that
flex is 12%"*, and that *"every quantitative field is set by the user or defaulted by a declared
scenario model"*. That is two tiers, so the contract carries two:

| Tier | Example | Who may set it | Provenance when used |
|---|---|---|---|
| **Posture** — a closed qualitative token | `supplier_flex_posture: 'limited'` | a person, **or governed GenAI** | `modelled` |
| **Value** — the explicit quantity | `supplier_flex_rate_pct: 12` | a person only | `stated` |
| **Master** — read from governed data | `list_price_gbp`, `gross_margin_rate_pct` | nobody; CogniX reads it | `derived` |

Precedence is declared once, in the contract, so no consumer invents its own: explicit value →
`stated`; posture only → `modelled`; neither → the situation's declared default, `modelled`; master
data → `derived`.

**46 authorable fields** across ten governed dimensions: identity and business framing, product,
estate and scope, scenario calendar and horizon, demand situation, commercial intent, supply and
constraint context, inventory context, economics, and qualitative assumptions. Twenty-two of them
GenAI may propose; the other twenty-four it may never author. Every field carries a
business-language label, its kind (`POSTURE` / `QUANTITY` / `STRUCTURE` / `NARRATIVE`), its closed
value set where it has one, and a single boolean: `genai_authorable`.

**No derived quantity is authorable.** Decision Gap, revenue and margin exposure, the elasticity
curve, cover days in units, the flex allowance, realised price, contribution and every pound figure on
the journey are absent from the contract by construction. `A5` asserts that over fifteen named
quantities; `A7` proves an unknown field is refused by name rather than dropped.

### 2.2 Governed situations — the closed set, and what is NOT offered

A scenario is authored against one of three situations:

| Situation | Family | What the evidence opens on |
|---|---|---|
| `PROMOTION_DEMAND_SURGE` | `promotion_surge` | search velocity, basket behaviour, supplier capacity pressure |
| `SUPPLIER_LEAD_TIME_RISK` | `supplier_breach` | lead-time drift, on-time delivery, allocation headroom |
| `SHORT_LIFE_WASTE_EXPOSURE` | `fresh_perishable_waste` | surplus ageing, bake-plan headroom, margin compression |

**Three, not six, and the reason is measured rather than chosen.** The synthetic signal fabric
implements exactly three families, and certification dimension `C-4.1` requires a signal timeline to
exist. A fourth situation would author a scenario that cannot certify, so the honest answer is to
publish what the estate supports. `B7` proves all three produce a certifiable scenario.

The route also publishes `situations_not_supported` — online fulfilment pressure, competitor price
response and multi-SKU reallocation — each with the reason. `COGNIX_SCENARIO_INTELLIGENCE.md` §5.1
already declares online fulfilment roadmap-only; naming it in the chooser is that ruling honoured
rather than quoted.

### 2.3 Deterministic resolution — `lib/scenario-authoring/draft-resolution.ts`

Authoring inputs in, `CanonicalScenario` out. Pure, total and deterministic. It reads the draft, the
declared scenario model and the product and supplier masters, **and nothing else**.

**The product master is the authority for product, supplier and price.** Certification dimensions
`C-1.6`, `C-1.7`, `C-1.8` and `C-2.10` reconcile a scenario against `data/products.json` and
`data/suppliers.json` — data the scenario did not author. So authoring does not offer those fields:
a person chooses a product, and the product answers for its name, its supplier, its list price and its
cost. An editable list price would create a second price basis for a SKU the master already answers,
which is ADR-073 rule 1 with the numbers changed.

The gross margin rate is **derived from the master's own cost**, not assumed — the same discipline
`C-2.10` applies to price, applied to cost one level down.

### 2.4 The declared scenario model — `lib/scenario-authoring/scenario-model-defaults.ts`

The one place a posture becomes a number, with a stated reason for every value. Calibrated against the
certified catalogue where an analogue exists, so a scenario built on the defaults lands in commercial
territory the estate has already looked at: `high_volume_staple` is Fresh Dairy's 241 units a store a
week, `mid_volume_line` is Chilled Salmon's 48, `inelastic` is Premium Bakery's 0.8pp a point.

A number in a prompt is a number the model can change; a number inline in the resolver is a number
nobody can review; a number in two places is two numbers. All three are defects this estate has paid
for once — ADR-044, ADR-079 and `R-36` respectively.

### 2.5 Decision-case coherence — `lib/scenario-authoring/draft-coherence.ts`

Not a second certification gate. The gate says `C-5.5 FAIL — 0 exposed of 700000 base`; this says
*"the operation can already serve everything you expect, so there is nothing to decide."* Six rules,
each a property of the resolved record: a positive Decision Gap, a flex clause that closes part of it,
a fundable promotion, a promoted price above cost, a credible margin at list, and two warnings where a
scenario is coherent but probably not what the author meant.

### 2.6 Capability readiness — `lib/scenario-authoring/draft-readiness.ts`

`Ready` / `Limited` / `Modelled` / `Unavailable`, exactly as `COGNIX_SCENARIO_INTELLIGENCE.md` §6.1
declares them, derived from the provenance of the inputs each capability needs and from nothing else.

**Why `stated` is not automatically `Ready`, and why it sometimes is.** The vocabulary reserves
`Ready` for observed or attested evidence. Applied literally an authored scenario could never be
`Ready` for anything until `SCI-10` admits a file — true of MEASUREMENTS and plainly wrong for
DECLARATIONS. A person saying *"we committed to 20% nationally for a fortnight"* is not estimating a
reading; they are stating a decision, and the decision is the evidence. So each input declares its
kind, and only a MEASUREMENT supplied by assertion is demoted to `Limited`. That is also the honest
answer to *"what would make this Ready?"* — an admitted file, which is `SCI-10`'s work, named as such.

Severity order is declared once: `Unavailable` > `Modelled` > `Limited` > `Ready`. `Modelled` ranks
BELOW `Limited` deliberately — `Limited` has partial evidence, `Modelled` has none.

Measured behaviour, from the suite:

| Draft | Readiness |
|---|---|
| Nothing supplied | every capability `Unavailable`, each with a reason |
| Situation + product only | `Modelled`, naming which inputs rest on an assumption |
| Every input stated | `Limited` for measured inputs, `Ready` for declared ones |

### 2.7 Provenance — the ADR-082 vocabulary, used rather than extended

Every resolved field carries `origin` / `method` / `authority` plus one reader-facing sentence. Four
origins appear in one draft: `stated`, `modelled`, `derived` and `drafted`. A value a person KEEPS
from a GenAI proposal is stamped `drafted_by_model`, so the draft stays identifiable as one.

The statement ADR-082 part 3 asks for is composed from what the resolution actually did:

> *the situation, product and depth off list were stated by you; the scenario name was drafted by AI
> and kept by you; the contractual flex allowance and supplier funding are modelled; the gross margin
> rate is derived by CogniX; every published quantity — demand, exposure, revenue and margin — is
> calculated by CogniX engines.*

No fourth dimension was added (ADR-082 part 4). A note is not a dimension, and without it "modelled"
cannot answer *modelled how?*

### 2.8 Governed Google GenAI drafting

`lib/scenario-authoring/genai-draft-provider.ts` and `.../genai-draft-validation.ts`, plus
`POST /api/v1/scenarios/drafts/[id]/assist`.

| Governance | How it is met |
|---|---|
| Credential (ADR-083 part 3) | `process.env.GEMINI_API_KEY`, server-side, read at call time, in **one** module. No request-body key path exists to be misused |
| Model (ADR-067) | Resolved from `config/gemini-models.ts` at call time. No model identifier is written in the authoring estate |
| `lib/gemini.ts` | **Not modified and not imported.** The legacy client-key transport is not reached |
| `R-15` | **Not extended.** Asserted by source guard `I3`/`I4` rather than promised |
| Absent provider | `503` naming the variable, generating nothing, and saying the scenario can still be authored by hand |
| Provider failure | `502`. No canned fallback on any path — `F16` asserts the route holds no proposal content of its own |
| Unusable output | `502`. Prose is never salvaged out of broken JSON |
| Throttling | Per declared tenant and per process, the `CDI-01` posture, because this route spends a metered credential |

### 2.9 The AI authority boundary, enforced in two lines

**Line 1 — structural.** A proposal names a FIELD. If that field is not on the GenAI allowlist — which
is *derived from the register*, where every `QUANTITY` is prohibited — it is refused before a
character of its value is read. This is what makes the prohibition on demand totals, revenue, margin,
elasticity, promotion contribution, Decision Gap, Decision Window, Decision Regret, forecast values and
reconciliation results true **by construction**: there is no field on the allowlist through which any
of them could arrive.

**Line 2 — content.** Every surviving value and rationale is read for a percentage, a currency symbol,
a decimal quantity or a thousands-separated figure, using **the same detector `CDI-01` uses** — one
definition, two callers, because two copies of "what counts as a fabricated figure" would drift.
A closed-allowlist value is checked against the allowlist instead of being coerced.

Measured: eight prohibited-field proposals rejected, **all eight on the field rather than on the
value** — including values written as words (`'twenty'`, `'two point four'`), which a content check
alone would have admitted. Four quantitative claims smuggled into permitted text fields rejected on
content, including one hidden in the rationale. Three values outside a closed allowlist rejected
rather than coerced. Prompt scaffolding echoed back recognised as scaffolding.

**One finding the suite produced against itself, and the fix.** A credential-shaped token pasted into
a description could survive into a proposal for a free-text field, because `AIzaSy…0000000` carries no
word boundary before its digits and so reads as prose to the figure detector. Nothing puts the
server's key into a prompt, so a model cannot learn it — but a key the PERSON pasted could come back
and be written into a draft that is later exported. `looksLikeACredential` now rejects it, with the
reason `CREDENTIAL_SHAPED_VALUE`.

### 2.10 The lifecycle — `lib/scenario-authoring/authoring-service.ts`

`DRAFT` → a person confirms → `CONFIRMED` → deterministic resolution → certification. Four rules,
each enforced structurally rather than remembered:

1. **A draft never activates.** There is no code path from authoring to `activateScenario`.
   Confirmation registers and certifies; making a scenario demo-active stays behind the ADR-080 gate.
2. **GenAI cannot confirm.** Confirmation requires `confirm: true` AND a named person. A drafting call
   cannot supply one and the drafting route never does.
3. **Confirmation cannot bypass certification.** A draft whose scenario does not certify does **not**
   become `CONFIRMED`; it stays `DRAFT` carrying the failed dimensions. *"Confirmed but not
   certified"* is not a state this lifecycle can reach.
4. **A confirmed scenario reproduces without the provider.** Resolution reads the draft and the
   masters. Drafting envelopes are kept as an AUDIT; nothing in resolution reads them.

Registration happens before certification because `C-1.2` asserts a scenario resolves through the
registry back to the record being certified. Registration is not activation, and re-confirming a
corrected draft replaces the record under the same identity.

### 2.11 Export and import

Inputs plus a content hash, and nothing else. Provenance, envelopes and certification are all derived,
so exporting them would create a second copy a hand-edited file could contradict. The hash is
**recomputed on import** and a tampered file is refused. An import takes a new draft identity, so two
records cannot claim one scenario name.

---

## 3. What `SCI-07` did NOT build, deliberately

| Not built | Owner |
|---|---|
| Authoring wizard, scenario editor, Create Your Own modal, AI chat surface | `SCI-08` |
| CSV / XLSX upload, parsing, semantic column mapping, attested upload admission | `SCI-10` |
| Architecture Surface, storyboard replacement, `SB-GATE` presentation | `SCI-09` |
| A scenario database | deferred; `SCI-08`/`SCI-10` should decide it with the UX in front of them |

No `SCI-08`-owned presentation file was created or modified. No client component consumes the
authoring domain — asserted by guard `I2a`, not assumed. Navigation and shell composition are
untouched.

The draft contract is designed to ACCEPT future enriched evidence through governed seams — readiness
already declares `observed` and `attested` as the states an admitted file would earn, and the
evidence-kind table already says which inputs a file would upgrade — but nothing of `SCI-10` is
implemented.

---

## 4. Test evidence

### 4.1 The `SCI-07` suite — `tests/unit/run-sci07-scenario-authoring-tests.ts`

**123 assertions, 123 passed, 0 failed.**

| § | What it proves | Assertions |
|---|---|---|
| A | The contract, the allowlist and the absence of any derived quantity | 9 |
| B | Manual authoring and certification with `GEMINI_API_KEY` unset, on all three situations | 9 |
| C | The AI authority boundary, enforced on the response | 11 |
| D | `DRAFT` → confirm → resolve, and what cannot happen in between | 13 |
| E | Certification still gates activation | 5 |
| F | Reproduction with the provider unavailable, and refusal over fabrication | 17 |
| G | Readiness derived, and missing inputs honest | 9 |
| H | Provenance distinguishing stated, modelled, derived and drafted | 9 |
| I | Credential isolation, injection fencing, no logging of user text | 14 |
| J | The three certified scenarios unchanged | 6 |
| K | Frozen contracts, no second scenario model, published boundary matches the register | 13 |
| L | Export, import and the confirmation route end to end | 8 |

**The mandatory reproduction test (`F5`–`F7`, `F12`).** A scenario drafted with model assistance and
confirmed by a person is captured; `GEMINI_API_KEY` is then **deleted from the environment** and the
same draft is re-resolved and re-certified. The scenario record is **byte-identical**, the
certification verdict is identical on every dimension, and the Decision Gap, revenue exposure and
margin exposure are the same numbers. The structural half asserts that no module on the resolution
path imports a provider, reads an environment variable, or calls out at all — so the behavioural
result is a property of the design rather than an accident of the test.

**Mocking.** The provider is mocked at the **transport seam**, which is the server boundary. What is
exercised is this estate's prompt, parsing and validation against real provider response shapes. No
test requires Google to be reachable.

### 4.2 Full regression — every runner individually accounted

Measured at the base and again at the `SCI-07` head, each runner executed separately.

| | Base (`9036330`) | `SCI-07` head |
|---|---|---|
| Runners | 52 | **53** (`run-sci07-scenario-authoring-tests` added) |
| Fully green | 51 | **52** |
| Assertions passed | 3,700 | **3,823** |
| Assertions failed | 1 | **1** |
| The one failure | `run-atl06b-tests` · `A6b` | `run-atl06b-tests` · `A6b` |

**`R-25` is separately reported and is unchanged.** `run-atl06b-tests` fails exactly one assertion,
`A6b`, byte-identically to the baseline (132 passed, 1 failed at both measurements). It is the stale
assertion recorded as `R-25` and this packet did not touch the Atlas provider configuration. **No
runner regressed. `R-25` is not a licence for a second failure and there is not one.**

Per-runner accounting is reproducible with:
`for f in tests/unit/run-*.ts; do npx tsx "$f"; done`

### 4.3 Type checking and build

`npx tsc --noEmit` — clean. `npx next build` — clean, with all five authoring routes registered as
dynamic server routes.

### 4.4 HTTP runtime acceptance, against a production build

Exercised with `curl` against `next build` + `next start`, `COGNIX_WORLD_MODE=local`, **no
`GEMINI_API_KEY` in the environment**. Every line below is a measured response.

| Step | Result |
|---|---|
| `GET /api/v1/scenarios/authoring` | `success` · 3 situations · 3 situations NOT supported, with reasons · 50 products · 46 fields · 22 AI-proposable / 24 prohibited · `genai_drafting_available: false` · `manual_authoring_available: true` · no credential anywhere in the payload |
| `POST /api/v1/scenarios/drafts` | `201` · draft opens on the situation's declared postures · resolves · 0 blocking issues · all six capabilities `Modelled` · provenance statement names what was stated, what is modelled and what CogniX derived |
| `POST …/drafts/{id}/assist` with an injection payload and no key | **`503`** · `error: ProviderUnavailable`, `variable: GEMINI_API_KEY` · **no `data` at all** · nothing resembling a key or an environment dump · the message points at the manual path |
| `PATCH …/drafts/{id}` stating the measured inputs | `success` · readiness moves `Modelled` → `Limited` for supply and inventory and `Ready` for evidence — it does **not** jump to `Ready` everywhere |
| `POST …/drafts/{id}/confirm` with no person | **`400`** — *"A scenario is never confirmed on someone's behalf."* |
| `POST …/drafts/{id}/confirm` explicit, named | **`201`** · `certified: true` · `state: CONFIRMED` · **`demo_active: false`** · *certified on all twelve dimensions (84 checks)* · supplier resolved from the master as Cheshire Cheese Co · scenario clock `2026-06-03T00:00:00.000Z`, not civil time |
| `GET /api/v1/scenarios` | 4 scenarios, **all `CERTIFIED`** · the authored one registered and selectable · **`SCN-FRESH-DAIRY-CHEDDAR-001` still the active one** |
| `GET …/drafts/{id}?format=export` | inputs and hash only · carries no derived quantity, no provenance and no envelope |
| re-import of that file | new draft and new scenario identity, same inputs |
| re-import after editing the depth by hand | **`422`** — *"This scenario draft file has been changed since it was exported, so it is refused."* |

---

## 5. Frozen-contract drift

ADR-084 part 1: `SCI-07` owns the Scenario Draft contract and **none** of the others. Asserted from
the bytes, git-blob-hashed, in `K1`:

| Contract | File | State |
|---|---|---|
| Scenario Contract | `canonical-scenario-model.ts` | **byte-identical to SHA-C** |
| Scenario Clock | `scenario-clock.ts` | **byte-identical to SHA-C** |
| Scenario Registry & Activation | `scenario-registry.ts` | **byte-identical to SHA-C** |
| Provenance Vocabulary | `provenance-vocabulary.ts` | **byte-identical to SHA-C** |
| Scenario Certification | `scenario-certification-model.ts` | **byte-identical to SHA-C** |
| Signal Materiality / Refresh / Models & Methods | `living-evidence-contracts.ts` | **byte-identical to SHA-C** |
| **Scenario Draft** | `scenario-draft-model.ts` | **NEW — owned by `SCI-07`, implemented here** |

**Two files outside the frozen set were modified, both additively:**

- `packages/contracts/src/index.ts` — one `export * from './scenario-draft-model'`.
- `lib/campaign-decision-suggestion-validation.ts` — `statesAFigure` changed from module-private to
  **exported**. No logic changed. ADR-083 extends this exact rule from Decision Context drafting to
  scenario drafting, and two copies of it would drift — which is `R-36` in miniature. One definition,
  two callers.

---

## 6. Security review

| Control | Evidence |
|---|---|
| Credential read in exactly one server-side module | `I1` |
| Never through a `NEXT_PUBLIC_*` name | `I2` |
| No client component touches the authoring domain | `I2a` |
| No route accepts a key from a request body — `R-15` not extended | `I3` |
| `lib/gemini.ts` not imported anywhere in authoring | `I4` |
| No model identifier written outside the governed configuration | `I5` |
| User text fenced with a per-request unguessable token | `I6`, `I7` |
| Prompt states fenced text may never change rules or request configuration | `I8` |
| A model talked past the prompt is still refused on the field | `I9` |
| Nothing credential-shaped survives into a proposal | `I10` |
| No other environment variable read by any file `SCI-07` owns | `I11` |
| No stack trace or environment dump on any error path | `I12` |
| A person's business situation is never logged in full | `I13` |

**User scenario text is treated as data throughout.** It is bounded, flattened to one line, fenced,
and nothing downstream derives a quantity from it. The throttle logs the tenant, never the
description.

---

## 7. Runtime acceptance

Exercised in-process against the real engines, the real registry and the real certification gate:

**Manual path.** Draft opened on a declared situation → structured inputs → readiness assessed →
confirmed by a named person → resolved deterministically → **certified on all twelve dimensions, 84
checks, zero declared non-applicabilities** → registered, NOT activated. Repeated for all three
governed situations, all three certifying.

**GenAI-assisted path.** Proposals produced at the provider boundary → validated → kept by a person →
confirmed → certified → **reproduced byte-identically with `GEMINI_API_KEY` deleted from the
environment**.

**Refusals.** No key → `503` naming the variable, nothing generated. Failing provider → raises, no
content. Unusable output → nothing salvaged. Incoherent scenario → refused with a business-language
reason before confirmation. Uncertifiable scenario → refused activation with the dimensions named.

### 7.1 Live Google acceptance is NOT claimed

`GEMINI_API_KEY` is **not set** in this environment, and the sanctioned egress proxy answers
`HTTP 403` for `generativelanguage.googleapis.com`. **No live round trip was attempted and none is
claimed.** The provider contract — endpoint, header, `responseSchema` shape, temperature — follows the
`ATL-06C` interpretation adapter, which *was* validated against the live endpoint; that is
inheritance of a verified shape, not evidence of a live call made here.

This is the residual `ADR-068` names and `AC-ATL-06C-9` keeps open: only a credentialed round trip can
prove a model still exists. Recorded as `R-SCI07-1` below rather than absorbed.

---

## 8. Residuals

| Id | Residual | Disposition |
|---|---|---|
| `R-SCI07-1` | Live Google drafting unverified — no credential and no egress in this environment | Open. Requires one credentialed run; the fixture-backed suite cannot close it, by construction (ADR-067, ADR-068) |
| `R-SCI07-2` | Three governed situations, not the full archetype catalogue | Open by design. A fourth situation needs a fourth family in the signal fabric, which is a capability rather than a pack |
| `R-SCI07-3` | Drafts are in-process and tenant-scoped; they do not survive a restart | Open by design — `SCI-07` non-scope forbids a scenario database. Export/import is the durable path until `SCI-08`/`SCI-10` decide persistence with the UX in front of them |
| `R-SCI07-4` | `ADR-044`'s own CDI-01 route still resolves a caller-supplied key from the request body, contradicting the ADR's own text | **Pre-existing, untouched, and reported.** This is `R-15` / ADR-044 Amendment A. `SCI-07` does not extend it and does not fix it — the file is not this packet's |
| `R-SCI07-5` | A confirmation attempt that FAILS certification leaves the resolved scenario registered and visible in the catalogue as uncertified | Open, and honest rather than hidden: it cannot be activated, and the selector reads `certification_state`. It cannot be removed here — `scenario-registry.ts` has no deregistration seam and it is a FROZEN contract `SCI-01` owns, so adding one is a convergence event under ADR-084 part 2, not a commit in this lane. In practice the coherence checks catch the common causes before confirmation is attempted |
| `R-25` | `run-atl06b-tests` `A6b` stale assertion | Unchanged. Not touched by this packet; the Atlas provider configuration was not modified |

---

## 9. Handoff

**What `SCI-08` consumes, frozen by this packet:**

- `ScenarioDraft`, `ScenarioDraftInputs`, the 46-field register with labels and closed value sets,
  `ScenarioDraftEnvelope`, the rejection reasons, `ScenarioCapabilityReadiness` and the readiness
  vocabulary — all from `packages/contracts/src/scenario-draft-model.ts`.
- `GET /api/v1/scenarios/authoring` — situations, what is not supported, products, the field register,
  capabilities, the published AI authority boundary and whether drafting is configured.
- `GET|POST /api/v1/scenarios/drafts`, `GET|PATCH|DELETE /api/v1/scenarios/drafts/{id}`,
  `POST /api/v1/scenarios/drafts/{id}/assist`, `POST /api/v1/scenarios/drafts/{id}/confirm`.
- `lib/scenario-authoring` — the domain entry point.

**What `SCI-10` consumes:** the same contract, plus the seam readiness already declares — `observed`
and `attested` are the origins an admitted file would earn, and `DRAFT_FIELD_EVIDENCE_KIND` already
states which inputs a file would upgrade from `Limited` to `Ready`.

**Gate D state:** OPEN. `SCI-09` has not converged with this lane. Nothing in this record advances it.
