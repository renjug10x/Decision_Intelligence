# COGNIX `AC-ATL-06C-9` — LIVE GROUNDING VALIDATION SUMMARY

**Criterion:** `AC-ATL-06C-9` — at least one real credentialed Gemini/Search grounding round trip
**Outcome:** **PASSED — criterion CLOSED**
**Validated commit:** `f1c390bc`
**Date:** 2026-08-21
**Method:** `GEMINI_API_KEY=… npx tsx scripts/atlas-live-grounding-check.ts --out live-evidence.json`
**Model:** `gemini-3.6-flash` (ADR-067 governed default)

---

## 1. What this document is, and what it deliberately is not

This is the **sanitised** record of the live validation. The run wrote `live-evidence.json`, which
contains raw grounded-response detail — publisher URLs, retrieved claim text, the search queries the
provider actually issued and its unfiltered output. That file is **diagnostic material, not a governed
record**, and it is not committed: `.gitignore` excludes it, and this summary carries the findings
instead. A governed corpus that quietly accumulated raw third-party payloads in its history would
undermine the separation ADR-048 exists to maintain.

**Provenance of the figures below.** The validation was executed in the environment holding the
credential, and the results in §2 and §3 are **as reported by that run**. The evidence file was not
present in the build workspace where this summary was written, so those figures are recorded as
reported rather than re-derived here. Everything in §4 and §5 — the code path, the suites, the
type-check and the build — **was** verified directly on this commit.

---

## 2. Result

```
LIVE VALIDATION PASSED — AC-ATL-06C-9 can be closed.
```

| Check | Result |
|---|---|
| `groundingMetadata` present on the live response | yes |
| Grounding supports returned | **25** |
| Byte-offset reconstruction against `segment.text` | **25 / 25 exact** |
| `S1` current grocery demand-forecasting market question | provider invoked correctly |
| `S2` current forecast-uncertainty / decision-support market question | provider invoked correctly |
| `S3` internal *"how does Decision Gap work"*, **research requested** | **provider NOT invoked** |
| Failure behaviour | credential-safe — status reported, credential never echoed |

## 3. What the three scenarios establish

**`S1` and `S2`** prove the grounded path end to end against the real service: a request the API
accepts, a response this estate parses, segments traced to retrieved sources, and every admitted claim
carrying the provenance ADR-054 requires. The pipeline is no longer proven only against recordings.

**`S3` is the one that matters most**, and it is a negative result. The question is internal —
*how does Decision Gap work* — and research was **explicitly requested**. The provider was still not
called. That is ADR-056 holding under live conditions: policy outranks the request, and the Atlas does
not reach outward for a question its own records answer. It is instrumented rather than inferred — the
adapter is wrapped in a counting proxy, so this is a measured call count of zero, not a reading of the
output.

**25 / 25 byte-offset reconstruction** closes the defect corrected on this commit. The live contract
elides `startIndex` at its default value; every segment, including the ones whose start was implied,
reconstructed exactly from its declared offsets.

**Credential-safe failure** was observed rather than assumed: a deliberate call to a non-existent model
reported its status and did not echo the credential.

## 4. What did not change, and was checked

The live validation **corrected nothing**, which is the point. Admission, provenance, freshness,
contradiction, allowlist and rejection policy are byte-identical to `ATL-06A`/`ATL-06B`:
`lib/atlas/grounding/policy.ts`, `provenance.ts`, `contradiction.ts` and `engine.ts` are untouched by
this closure. No admission rule was relaxed to accommodate the provider at any point in the
`ATL-06B` → `ATL-06C` sequence; where the live contract differed from the fixtures, the implementation
changed and the fixtures grew a regression case.

## 5. Verification on this commit

| Check | Result |
|---|---|
| `npx tsc --noEmit` | 0 diagnostics |
| `run-atl06a-tests.ts` | 115 / 115 |
| `run-atl06b-tests.ts` | 133 / 133 |
| `run-atl06c-tests.ts` | 127 / 127 |
| `run-atl06d-tests.ts` | 96 / 96 |
| `npm run build` | clean |
| Estate regression | 31 of 33 runners exit 0; `run-cdi07a` (154/1) and `run-cdi07b` (228/7) at their long-standing pre-existing baseline |
| Credential isolation | `scripts/atlas-credential-isolation-check.sh` passes on a real build |

## 6. Consequences

- **`AC-ATL-06C-9` is CLOSED.** `ATL-06C` moves to `[COMPLETED]`.
- **`AC-ATL-06D-6` is CLOSED** — it existed solely to carry `AC-ATL-06C-9` forward. With the grounded
  path proven live, `ATL-06D`'s market-evidence layer rests on a validated provider path and
  `ATL-06D` moves to `[COMPLETED]`.
- The `ATL-06` family is complete: `06A` grounding and provenance architecture, `06B` grounded market
  intelligence, `06C` AI explanation and hybrid reasoning, `06D` the client conversation pack.
- **Re-running the check is one command.** It is a script rather than a test by design: a validation
  that needs a credential and spends quota does not belong in a suite that runs on every change, and
  it reports a skipped round trip as *skipped*, never as passed.

## 7. What this does not prove

Worth stating so the closure is not read as more than it is. One passing round trip proves the
contract, the parsing and the routing. It does not prove the market-evidence corpus is populated — it
is not; `external_evidence` remains empty estate-wide and unassigned. It does not fix source quality:
ADR-055 means fewer claims survive admission than a naive integration would show, and the discarded
and rejected counts remain the honest measure of that. And a provider contract can change again — which
is why the drift checks, the regression fixtures and the exported validator assertions exist.
