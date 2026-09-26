# Wave-4 Convergence — Gate E Assessment

**Wave 4 packets:** `SCI-08` (delivered single-lane ahead of the wave, converged at `aad33e90`) and
`SCI-10` (this wave's only remaining packet). **Converged with:** `SCI-07`, `SCI-07R`, `SCI-09` — the
authoring domain, the scenario authority and the Architecture surface Wave 4 builds on.
**Record of `SCI-10`:** [`COGNIX_SCI_10_ATTESTED_UPLOAD_REPORT.md`](COGNIX_SCI_10_ATTESTED_UPLOAD_REPORT.md).

## 1. Shape of the convergence

The design gate (§7) anticipated it: with `SCI-08` already delivered, Wave 4 has **one lane**, so Gate E
is evaluated from `SCI-10`'s head — `SCI-10`'s own acceptance, the full estate, the frozen-contract
check and browser acceptance — rather than from a merge of two lane branches. **No
`feature/cognix-sci-wave4-convergence` branch is cut**; there is nothing to merge. The register's Wave-4
row named one in 2026-09 and is annotated rather than silently rewritten.

**SHA-E = `c5fce33c35185c0c0dd3cd41b326f52037f4128a`** on `feature/cognix-sci-10-csv-admission` — the
converged code and evidence state. The governance commit that records it is one commit ahead and
changes no code (the same honest two-step as SHA-A … SHA-D).

## 2. One attested scenario, every authority — the equality chain

Proven twice: in-process in `service` mode against a **real `cognix-world` process**
(`run-wave4-convergence-tests`, 31/31) and in the browser on the production topology
(`sci10-browser-acceptance`, 171/171 at 1440 / 1024 / 720).

| Link | Id | Quantities | Provenance |
|---|---|---|---|
| **Draft / admitted truth** | the draft's `SCN-AUTHORED-*` fixed at creation | eight admitted values (weekly demand 61,574 = mean of 12 weeks; stores 1,437, cover 3.25 / 5.5 / 7.75 days … = latest week) | `attested` (rule / measured) |
| = **Confirmed scenario** | same id; certified by the unchanged gate; not active | confirmed inputs = admitted values | confirmed draft carries the eight attested descriptors, descriptor for descriptor |
| = **Registered record** | same id | every admitted value; cover days converted to units by the resolver | the record's own provenance is input-independent (unchanged contract) |
| = **Selector catalogue** | listed, `CERTIFIED` | — | — |
| = **Server active scenario** | after selection, runtime and catalogue agree | — | — |
| = **Browser projection** | `GET /scenarios/record` publishes the registered record exactly; the context strip names its product | record values | — |
| = **Signals** | `cognix-world` process, `scenario_id` = id | identical to the generator over the attested record | — |
| = **Evaluator** | decision route `scenarioId` = id | route = `evaluateAuthoritativeScenarioDecision`, figure for figure | — |
| = **Rendered business context** | Architecture switcher on it by name | Architecture renders the evaluator's exposed gap, expected and base demand (SCI-09); Understand renders the evaluator's figures | Understand names the attested inputs — "declared by a named person, not verified by CogniX" |

In the browser every scenario-scoped request made by Demand & Forecast, Promotion, Campaign Decision
and Architecture named the attested id and every response served it; no surface carried a Fresh Dairy
figure or a raw cell from the file.

**Beside it, the manual path converges the same way**: the same eight figures typed by hand read
`stated`, confirm, select and run, and give the **same decision** — provenance is where a figure came
from, not what it is.

## 3. Pre-decision inputs are not realised outcomes

The admission leaves an ESF-6 receipt of kind `SCENARIO_UPLOAD_ADMISSION`. Handed to the **actual
prediction-comparison route** with a real decision contract (campaign intent → outcome frontier →
decision contract), it resolves no observation: the comparison is byte-identical to one without it, and
the tenant has zero `OutcomeObservation`s. `CDI-08`'s evidence is not contaminated (ADR-086 part 2).

## 4. Gate criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Contracts: Gate-D six + Scenario Draft byte-identical to SHA-D; Attested Upload = contract §6 byte for byte; only other contract diff the authorised additive receipt kind | **PASS** |
| 2 | ADR-086 implemented as declared; ADR-086 and the declared contract unchanged | **PASS** |
| 3 | Equality chain by id, quantity and provenance (§2) | **PASS** — in-process and in the browser |
| 4 | Manual `SCI-08` path intact | **PASS** — browser 102/102; in-process parity |
| 5 | ESF-6 separation (§3) | **PASS** — through the real route |
| 6 | Authority: BFF scenario authority, stateless `cognix-world`, browser projection, certification gate, evaluator, advisory GenAI | **PASS** |
| 7 | Full estate — every runner accounted | **PASS** — 59 runners, **4,488 passed, 1 failed**: `R-25` `A6b` 132/1, unchanged; every baseline runner's count unchanged; +166 `SCI-10`, +31 Wave-4 |
| 8 | `tsc --noEmit`, production build | **PASS** — clean; 82/82 pages |
| 9 | Browser 1440 / 1024 / 720, production topology, `service` mode, provider off | **PASS** — 171/171 upload journey; 102/102 manual journey; 29/29 SCI-07R service lifecycle; zero console/React errors, zero 5xx, only deliberate 4xx, no internal id, no stale scenario truth |
| 10 | `cognix-world` restart | **PASS** — 19/19, coherent |
| 11 | BFF restart | **PASS** — 10/10, non-durable authored and uploaded state gone together and cleanly; curated state intact |
| 12 | Provider-off acceptance; live provider | **PASS** — all acceptance provider-off; live Gemini verified once server-side (SCI-10 record §12) |

**Docker was not used** — native processes, as at Gates A–D.

## 5. Residuals carried out of Wave 4

`R-SCI07R-1` (non-durable authored state — now including uploads) and `R-SCI07R-2` (self-declared
tenant) are the architectural ones, unchanged by design. `R-SCI08-1` (Promotion archetype label),
`R-SCI08-3` (live browser suggestion flow, narrowed), `R-25`, and the new `R-SCI10-1…3` are recorded in
the `SCI-10` record §13. None blocks Gate E.

## 5a. Post-Gate-E security repair — `R-SCI10-3` (recorded after the gate; the evidence above is unchanged)

`next build` copied the local `.env`, holding a live `GEMINI_API_KEY`, into `.next/standalone/` — Next.js
16.2.7's unconditional standalone env copy. Repaired at **post-Gate-E SHA `cadd29ba`**: `npm run build` now
seals the artefact (copied env files removed; whole output verified free of env files, credential values
and `NEXT_PUBLIC_*` credential names; the build fails otherwise). Fresh build: key in 0 of 4,041 files;
provider unavailable safely without runtime injection, one controlled live request succeeded with it;
browser smoke 14/14 provider-off and 14/14 provider-on with no secret in anything served. **`R-SCI10-3`
CLOSED.** Detail: `SCI-10` record §12a.

## 6. Verdict

**WAVE-4 GATE E: PASSED** at SHA-E `c5fce33c`. Wave 4 is the last wave in the `SCI` register, so every
`SCI` packet has now converged. Nothing was merged to `main` or `production`.
