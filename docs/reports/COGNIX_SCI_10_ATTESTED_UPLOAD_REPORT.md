# `SCI-10` — Attested Upload: CSV Scenario Enrichment

**Governs:** ADR-086 (implemented here), ADR-085 (one scenario authority), ADR-083, ADR-082, ADR-080,
ADR-084. **Contract:** [`COGNIX_ATTESTED_UPLOAD_CONTRACT.md`](../governance/COGNIX_ATTESTED_UPLOAD_CONTRACT.md).
**Design gate:** [`COGNIX_SCI_10_RECONCILIATION_DESIGN_GATE.md`](COGNIX_SCI_10_RECONCILIATION_DESIGN_GATE.md).
**Wave-4 gate:** [`COGNIX_WAVE4_CONVERGENCE_GATE_E_ASSESSMENT.md`](COGNIX_WAVE4_CONVERGENCE_GATE_E_ASSESSMENT.md).
**Branch:** `feature/cognix-sci-10-csv-admission` — the name the packet record gives — cut from exactly
`6151960307051c7c8d455e7c04e22e5cb34f54f5` (certified `SCI-08` + ADR-086 + the declared contract).

---

## 1. Baseline, verified before any change

| Fact | Verdict |
|---|---|
| `6151960` | present; descends from `SCI-08` `aad33e90`, the design gate and the declaration; contains `SCI-09` `77cfe535` |
| Working tree | clean |
| `main` / `production` | `origin/main` = `gitlab/main` = `dea39ba`; `gitlab/production` = `fffe3b3` — **untouched** |
| `SCI-10` branch before this packet | none locally, on `origin` or on `gitlab` |
| Remote for `SCI` lanes | `origin` — every `SCI` lane and convergence branch lives there (Gates A–D: "both on `origin`"); `gitlab` carries `main` and `production` only |
| `R-SCI09-2` | the stale lower-case `SCI-09` branch is **gone from `origin`** (owner deletion, verified by `ls-remote`) — **CLOSED** |
| ADR-085, ADR-086, the declared contract | present |
| Estate at the baseline, measured in a separate worktree | 57 runners, **4,291 passed, 1 failed** — `R-25` `A6b` (132/1) |

## 2. What was built — in five commits

| Commit | What |
|---|---|
| `60b526ac` | **Slice 1 — the governed unset** (`R-SCI08-2`) |
| `91230c24` | The declared contract committed verbatim; one additive ESF-6 receipt kind |
| `13638359` | The upload domain and its four governed routes |
| `561c860f` | "Use your own data" inside the `SCI-08` studio |
| `c5fce33c` | Governed suite, Wave-4 convergence suite, browser and restart acceptance |

| File | Role |
|---|---|
| `packages/contracts/src/attested-upload-model.ts` | contract §6, byte for byte |
| `lib/scenario-authoring/attested-upload-validation.ts` | pure: limits, UTF-8, RFC 4180, personal data, grain, profile, mapping, the two reductions, reserved-field and attestation checks |
| `lib/scenario-authoring/attested-upload-store.ts` | in-process, `tenant::upload`, draft-lifetime, bounded, 30-minute column retention |
| `lib/scenario-authoring/attested-upload-service.ts` | receive · list · admit · withdraw, with closed refusals |
| `app/api/v1/scenarios/drafts/[id]/uploads/…` | the four routes of contract §7 (`nodejs`) |
| `lib/scenario-authoring/authoring-service.ts` | the unset; `attested` provenance derived in `assessDraft` |
| `components/scenario-authoring/AttestedUploadPanel.tsx` | the experience, inside the studio's Review step |

## 3. The governed unset (`R-SCI08-2` — **CLOSED**)

`updateDraft` gains `unset_fields`. A named field's key is **removed**, which is how the frozen Scenario
Draft contract already represents "not supplied", so resolution, readiness and provenance fall back on
their own: a quantity to the situation's declared posture (`modelled`), the gross margin rate to CogniX's
derivation from the product master (`derived`). No stale value survives in the inputs, the resolved
record or the provenance sentence; the content hash moves; a stored `null` can no longer exist; a
`drafted_by_model` stamp on the field is removed with it. Setting and unsetting one field in one change,
or unsetting a field outside the register, is refused and changes nothing. The studio sends an emptied
box as an unset. It is a domain operation, not a UI workaround, and it is what withdrawal is built on.

## 4. Upload → validation → attestation → admission → withdrawal

| Operation | Behaviour |
|---|---|
| **Upload** (`POST …/uploads`, multipart, one file) | body read with a cap before parsing (a declared `Content-Length` over 5 MB + envelope is refused unread; a streamed body is abandoned at the cap); SHA-256 over the exact bytes; server-issued `upl_` id bound to one tenant and one draft |
| **Validation** | `.csv` + `text/csv` (or `application/vnd.ms-excel`); ≤ 5 MB, ≤ 50,000 rows, ≤ 60 columns; strict UTF-8, BOM stripped; strict RFC 4180; header row; no duplicate/empty header; cells are text, never evaluated, formula-shaped cells never re-exported; personal-data columns refused; `period_end` + `sku_id`, the draft's product on every row, weekly, nothing after the draft's Today, ≥ 4 weeks → `PROFILED`, or `REFUSED` (terminal, holds nothing of the file but its fingerprint) |
| **Map** | deterministic header matching proposes only the eight admissible fields; a person confirms. **No GenAI mapping path exists** (optional in the contract; not built — §12) |
| **Attest** | ESF-6 `SourceAttestation` unchanged: a named person, a statement, `FIRST_PARTY_OPERATOR_ATTESTATION`; "AI", "system" and similar are refused. It is a declaration, never a proof, and never rendered as a verification |
| **Admit** (`…/admit`) | names the reviewed fingerprint (`CONTENT_CHANGED` otherwise); re-checks product and Today; reduces by `MEAN_OF_PERIODS` (rounded) or `LATEST_PERIOD` — the only arithmetic; bounds by the Scenario Draft validator; **one** write through `updateDraft`; server-issued `att_`; one ESF-6 receipt `SCENARIO_UPLOAD_ADMISSION`; `synthetic_demo` server-derived `false`; parsed columns discarded |
| **Withdraw** (`…/withdraw`) | on a `DRAFT` only; every still-attested field returns to CogniX's assumption through the governed unset; a field the person changed after admission is theirs and is left alone; a `CONFIRMED` draft refuses (`DRAFT_NOT_EDITABLE`) |
| **List** (`GET …/uploads`) | profiles, mappings, attestations, receipts — never a cell value |

**Refusals** are the 26 closed reasons of contract §4.9, each exercised and returned by the governed
suite; an admission refusal leaves the upload `PROFILED`, the draft byte-identical and the receipt
sequence unchanged. **No partial admission**: one blank week in one mapped column refuses all eight.

**Retention.** Parsed columns exist only between `PROFILED` and admission, for at most 30 minutes, and
are discarded at admission, expiry, withdrawal and refusal. Logs carry counts, header names and mapping
decisions. Across the whole governed run, **no fixture cell value appeared in any console line or any
refusal message** (asserted).

## 5. Provenance and readiness

`attested` is **derived**, in the authoring domain, while the draft value equals the value a live
admission wrote (contract §5): `{attested, rule, authoritative}` for a mean, `{attested, measured,
authoritative}` for a level. Readiness is the existing `SCI-07` rule — attested → `Ready`. Measured on
the demonstration extract (British Chicken Breast 640g, 12 weeks): eight fields attested,
**Inventory position `Ready`** (all three cover inputs attested); Demand outlook stays `Modelled`
because demand movement is not admissible — the file supplies only what it measured. Edit an attested
value → `stated` (Inventory position `Limited`); restore it → `attested`; withdraw → `modelled`/`derived`
and the provenance sentence no longer mentions attested data. The confirmed draft carries the attested
provenance; the canonical record's own provenance is input-independent and unchanged (the attestation
belongs to the draft, not to a second record). An exported attested draft re-imports as `stated` —
a copied number is not an attested one (contract §4.11).

## 6. Duplicate vs reproduction

| Case | Result |
|---|---|
| Same bytes, same draft, while `PROFILED` or `ADMITTED` | **`DUPLICATE_UPLOAD`**, nothing recorded; the refusal returns the caller's own live upload so the studio resumes it |
| Same bytes, same draft, after `EXPIRED`, `WITHDRAWN` or `REFUSED` | accepted as a new upload (not a live duplicate) |
| Same bytes, mapping, product and Today on a **new or recreated** draft | **byte-identical admitted values**, identical resolved record, identical certification check for check, identical evaluator decision figure for figure |
| Same figures typed by hand | `stated`, and the **same decision** — the evaluator reads admitted values exactly as it reads stated ones |
| A UTF-8 BOM variant | different fingerprint, identical admitted values |

## 7. Tenant isolation and security

Uploads are keyed `tenant::upload` and reached only through the authoring domain's tenant-scoped store.
Another tenant cannot list, admit, withdraw or resolve an upload; every refusal is `404
DRAFT_NOT_FOUND`/`UPLOAD_NOT_FOUND`, identical in status, reason and message to a nonexistent draft. An
upload id carried to another draft of the same tenant is not found. Server-issued and server-derived
fields (`attestation_id`, `admission_receipt_id`, `receipt_id`, `sequence`, `synthetic_demo`, `state`,
`content_sha256`, …) and reserved prefixes (`asrc_`, `att_`, `rcpt_`, `upl_`) are refused as
`SERVER_FIELD_ASSERTED`, in the upload form and the admission request. Receipts share ESF-6's strictly
monotonic per-tenant sequence and interleave with ESF-6's own. `tenant_id` remains self-declared —
scoping, not authentication (`R-SCI07R-2`), which is also why an attestation cannot prove identity.

## 8. Contract integrity

`attested-upload-model.ts` **equals contract §6 byte for byte** (extracted mechanically; asserted). The
six Gate-D contracts and the Scenario Draft contract are **byte-identical to SHA-D**. The only other
contract change is the authorised additive `ReceiptKind` member in ESF-6's `attested-observation-model.ts`
(not a Gate-D contract), with `validateServerReceipt` accepting it and every existing kind validating
exactly as before. **ADR-086 and the declared contract were not changed** — no architectural conflict
arose. Implementation choices the contract leaves open, recorded here: refusal HTTP statuses (404 not
found, 409 duplicate/conflict/state, 410 expired, 413 size, 415 media, 422 otherwise); an admission
refusal leaves the upload `PROFILED`; a `WITHDRAWN` upload cannot be re-admitted (its columns are gone).

## 9. Separation from ESF-6 realised outcomes

Nothing is admitted as an `OutcomeObservation`; the upload path names no outcome category and touches no
observation store (asserted structurally). The admission receipt is `SCENARIO_UPLOAD_ADMISSION`, never
`OBSERVATION_ADMISSION`; `resolveAdmissionReceiptFor` binds observations only to the latter. Proven
through the **actual prediction-comparison route with a real decision contract**: handed the upload's
receipt id, the comparison is byte-identical to the comparison without it. The tenant has zero
observations afterwards.

## 10. Scenario and economic authority

| Authority | Held by | Evidence |
|---|---|---|
| Scenario | the BFF runtime | an upload registers, certifies, confirms and activates nothing (the draft stays `DRAFT`, even when a request carries `confirm`/`certified`/`demo_active`) |
| Stateless execution | `cognix-world` | signals for an attested scenario come from the world process over the record, identical to the generator over that record |
| Projection | the browser | the panel validates, reduces and computes nothing; it renders the server's values |
| Admission gate | certification | an attested draft confirms only through the unchanged gate |
| Decision / economics | the evaluator | Understand, the decision route and the Architecture surface render the evaluator's figures |
| Advisory | GenAI | not on the upload path at all |

No upload module imports certification, the registry or runtime, an engine, the evaluator, a provider or
`cognix-world`, and none reads the network or the environment (asserted).

## 11. Evidence

**Tests.** `run-sci10-attested-upload-tests` **166 / 166**. `run-wave4-convergence-tests` **31 / 31**.
Full governed estate: **59 runners, 4,488 passed, 1 failed** — `run-atl06b-tests` `A6b`, `R-25`,
**132 / 1, unchanged**. 4,291 + 166 + 31 = 4,488: **no existing count moved** (every one of the 57
baseline runners compared individually). Summary-format runners: campaign-intelligence 135/135,
decision-dimensions 173/173, campaign-decision-journey 96/96, bugfix-integrity 4/4, wp10d 15/15,
decision-state, journey, cdi07b-smoke — all pass. Named: sci07 132, sci08 31, sci07r 63, esf6 81,
sci09 234, sci09-economic-reconciliation 122, canonical 275, sci05 200, sci06 182, wave2 58.

**Build.** `npx tsc --noEmit` **clean**. `npm run build` **clean** — 82 / 82 pages; the three upload
routes registered as dynamic server routes.

**Browser — production topology.** `output: 'standalone'` BFF (built with
`NEXT_PUBLIC_COGNIX_DEMO_MODE=true`), `cognix-world` on 8081 and `cognix-learning` on 8082 compiled from
this branch's source, native processes, `COGNIX_WORLD_MODE=service`, **provider off** (the BFF reported
AI drafting unavailable). **Docker NOT used.** Chromium 143 via Playwright.

| Harness | Result |
|---|---|
| `scripts/sci10-browser-acceptance.cjs` — upload journey, six UI refusals, duplicate resume, override, withdrawal and re-admission, HTTP refusals (fingerprint, forged field, coefficient, cross-tenant), reproduction, confirm → catalogue → select → run → understand, cross-surface truth, no ID leakage, no raw cell | **171 / 171** at 1440 / 1024 / 720 |
| `scripts/sci08-browser-acceptance.cjs` — the manual `SCI-08` journey, unchanged | **102 / 102** at 1440 / 1024 / 720 |
| `scripts/sci07r-service-acceptance.mjs lifecycle` — tenant isolation of authored scenarios | **29 / 29** |
| zero application console errors, zero React key warnings, zero `5xx`; the only 4xx are the deliberate refusals | at every width |

**Restarts.**

| Restart | Result |
|---|---|
| `cognix-world` only (pid 45236 → 46144), an attested scenario active | **19 / 19** — three attested scenarios still listed and certified, confirmed drafts and their eight attested inputs intact, upload records intact, records carry the admitted demand, they evaluate, signals from the new world process, active scenario unchanged |
| BFF only (pid 46029 → 46195) | **10 / 10** — authored drafts, attested provenance and upload records gone **together** (404 everywhere, never half-present); catalogue = the three curated; Fresh Dairy active at 130,125; a browser opened afterwards lands on Fresh Dairy with no console error |

As governed (ADR-085 part 5, ADR-086 part 5, `R-SCI07R-1`). **Restart safety for authored or uploaded
state is NOT claimed** — it is measured to be absent, as decided.

## 12. Gemini

A genuine-looking `GEMINI_API_KEY` is present in the repository's local `.env` / `.env.local` (git-ignored).
**All SCI-10 and Gate-E acceptance ran with the provider off**: the unit suites delete the variable, and
the production BFF ran without it (`next build` copies `.env` into `.next/standalone/.env`; that copy was
moved aside for the runs and the BFF reported AI drafting unavailable).

**One controlled server-side live-provider validation** was then made, in a single process, through the
governed `SCI-07` drafting route (`POST /api/v1/scenarios/drafts/{id}/assist`), the key loaded from
`.env` and **never printed** (every output redacted against it; zero occurrences):

| | |
|---|---|
| HTTP | **200**, `status: success` |
| Model | `gemini-3.6-flash` (from the governed configuration) |
| Envelope | `GENAI_DRAFT` / `NON_AUTHORITATIVE_DRAFT`, `validateScenarioDraftEnvelope` **valid** |
| Proposals | 5, all allowlisted narrative fields (`scenario_name`, `decision_question`, `family_rationale`, `qualitative_assumptions`, `differentiation_statement`); **0 rejected; no digit in any proposal** |
| Draft | inputs unchanged by the call |
| Latency | 12.6 s |

**LIVE PROVIDER ACCEPTANCE: VERIFIED — server-side, one controlled call, `SCI-07` drafting path.**
`SCI-10` itself has no provider path. Not verified live: the browser suggestion flow (`R-SCI08-3`).

## 12a. Post-Gate-E security repair — `R-SCI10-3` (2026-09-26)

Recorded after Gate E and separately from it: §§1–12 and the Gate-E assessment stand as measured at
SHA-E `c5fce33c`. **Post-Gate-E SHA: `cadd29ba434fee315a46679b4ae954fcdc7f85cf`** (the repair), on
`feature/cognix-sci-10-csv-admission` from `9649ff0d`. No application code changed; the server-side
Gemini integration is untouched.

**Reproduced.** From a clean `.next`, `npm run build` with the normal local configuration (`.env` and
`.env.local` both holding `GEMINI_API_KEY`) wrote `.next/standalone/.env`, and that file was the **only**
one of 4,042 in the build output containing the key's value. `.env.local` was not copied. No other
credential-bearing env file or value entered the output; `public/` holds none.

**Root cause — Next.js standalone behaviour, not a CogniX script.** In `next@16.2.7`,
`writeStandaloneDirectory` (`next/dist/build/index.js`) copies every env file `@next/env` loaded whose
name is exactly `.env` or `.env.production` into `.next/standalone/`. It is unconditional: no
`next.config` option and no `next build` flag disables it, and a build adapter's `onBuildComplete` runs
*before* the standalone directory is written. The repository's `npm run build` was plain `next build`, so
nothing stood between that copy and the artefact. Docker builds were already safe — `.dockerignore`
keeps `.env`/`.env.*` out of every build context (only the placeholder `.env.example` enters, and Next
never loads it) and `docker/Dockerfile.web` removes env files from its runner — so the exposure was
native builds of the standalone server.

**Repair.** `package.json` `build` is now `next build && node scripts/seal-standalone-artefact.mjs` —
the entry point native builds and both Dockerfiles use, so there is no manual or separate step. The
sealing step (1) removes the env files Next.js copied into `.next/standalone/` (outside `node_modules`);
(2) verifies the **whole** `.next/` output — standalone server, server chunks, static client bundles —
holds no `.env*` file and no value of any credential-named variable the build could see (from the four
env files Next.js loads and from the build environment); (3) refuses a `NEXT_PUBLIC_*` credential name.
Any finding fails the build; it prints names and paths, never a value.

**Runtime secret model.** The build artefact carries code and configuration structure, never a live
secret. `GEMINI_API_KEY` is injected into the **server process** at run time — the host environment in
`docker-compose.yml` (`GEMINI_API_KEY=${GEMINI_API_KEY:-}`), or the shell that starts `server.js` — and
the governed provider reads it at call time. No credential is renamed, no new secret mechanism is added,
no `NEXT_PUBLIC_*` credential path exists.

**Acceptance** (production build, three native processes, `service` mode; Docker not used):

| Check | Result |
|---|---|
| Fresh build from a clean `.next`, normal local configuration | exit 0, 82/82 pages; `[seal]` removed `.next/standalone/.env`, scanned 4,041 files — **none packaged** |
| Key value in the build output | **0 files** — the sealing step, an independent scan and `grep -r` agree; also 0 in the build log |
| `.env*` files in the build output | **none**; every env value (≥ 12 chars) from all env files checked across `.next/` and `public/` (4,055 files): 0 hits |
| Client bundles (24 chunks) | no key value, no `process.env.GEMINI*` access, no `NEXT_PUBLIC_*` credential name. The literal name `GEMINI_API_KEY` appears in one chunk only as explanatory prose ("a server-side GEMINI_API_KEY … never reaches a browser") |
| **Without** runtime injection | AI drafting reported unavailable; `POST …/assist` → **503 `ProviderUnavailable`**, "Nothing was generated", manual path offered; key in no response, no log, not in the server process environment |
| **With** runtime injection (artefact unchanged, still no env file) | one controlled request: `POST …/assist` → **200** in 11.5 s, `gemini-3.6-flash`, envelope `GENAI_DRAFT`/`NON_AUTHORITATIVE_DRAFT` valid, 5 allowlisted proposals, 0 rejected, no digit, draft inputs unchanged; key in no response or log; after the run the key is still in 0 files of `.next/` |
| Browser smoke `scripts/sci10-secret-boundary-smoke.cjs` at 1440 / 720 | provider **off** 14/14 and provider **on** (offered, not clicked) 14/14 — manual path runs, upload path loads, every response body the browser received free of the key and of `NEXT_PUBLIC_*` credential names, no console error, no 5xx |
| SCI-08 manual journey on the sealed build | 102/102 at 1440 / 1024 / 720 |
| `run-sci10-r3-build-secret-tests` | **20 / 20** |
| Regression | tsc clean; SCI-07 132, SCI-08 31, SCI-10 166, Wave-4 31, ESF-6 81, atl04r 124, atl06a 115, atl06c 127, atl06d 96, atl07 52 — unchanged; `atl06b` 132/1 (`R-25` `A6b`, unchanged) |
| Full governed estate at `cadd29ba` | **60 runners, 4,508 passed, 1 failed** — Gate E's 4,488 + the new 20; every other runner's count identical; `R-25` `A6b` the only failure |

The credential was never printed: every script compares the value and reports names, paths and counts.

## 13. Residuals

| Id | Disposition |
|---|---|
| **`R-SCI08-2`** | **CLOSED** — §3 |
| **`R-SCI07-1`** | **CLOSED** — live Gemini verified server-side through the governed drafting route (§12) |
| `R-SCI08-3` | **OPEN, narrowed** — the provider is verified server-side; the browser suggestion flow (*Suggested by AI → Use → AI-proposed, kept by you*) is still asserted structurally, not exercised live |
| `R-SCI08-1` | **RETAINED, outside `SCI-10`** — archetype label on Promotion; it did not affect acceptance (every number is the scenario's) |
| `R-SCI07R-1` | **RETAINED** — non-durable authored state; uploads share the draft's lifetime and are lost with it (§11, measured) |
| `R-SCI07R-2` | **RETAINED** — tenant self-declared; an attestation cannot prove identity |
| `R-SCI07R-3`…`5` | unchanged |
| `R-SCI09-2` | **CLOSED** — deleted by the owner; absent from `origin` (§1) |
| `R-25` | **RETAINED — unchanged** (`A6b` 132 / 1) |
| **`R-SCI10-1`** NEW | GenAI-assisted column mapping (contract `proposal_basis: GENAI_PROPOSAL`, optional) is **not built**; mapping is deterministic header matching confirmed by a person. The model boundary therefore holds by absence. Owner: optional future work, with the contract's ≤ 3 redacted samples rule |
| **`R-SCI10-2`** NEW | Personal-name detection in cell content is a declared heuristic (honorifics, "Surname, Given", Title-case names from a closed list of common given names); e-mail, telephone, postcode and personal headers are pattern-exact. Low residual risk: a text column is never admitted, stored past profiling, logged or re-exported |
| **`R-SCI10-3`** | **CLOSED 2026-09-26 — post-Gate-E security repair `cadd29ba`** (§12a). Was: `next build` copied the local `.env` — holding a live `GEMINI_API_KEY` — into `.next/standalone/.env`. Root cause Next.js 16.2.7's unconditional standalone env copy; repaired by sealing the artefact inside `npm run build`; key packaged in 0 files; provider unavailable safely without runtime injection and live with it |
| note | Upload admission receipts live in ESF-6's receipt store (shared sequence, E4 lifetime), so a receipt outlives an evicted draft until the BFF restarts; it resolves nothing and carries no value |

## 14. Gates

**`SCI-10` convergence gate: PASSED** — contract byte-exact; unset, validation, attestation, admission,
withdrawal, duplicate and reproduction as declared; provenance and readiness derived by the existing
rules; tenancy and reserved fields enforced; no partial admission; no cell value retained or logged;
separate from ESF-6 outcomes through the real route; authority unchanged; estate `R-25` only; tsc and
build clean; browser 171/171 and the manual path 102/102 at three widths on the three-process
production topology; restarts as governed.
