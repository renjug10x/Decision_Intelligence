#!/usr/bin/env bash
#
# Credential isolation check (ATL-06C).
#
# Proves that GEMINI_API_KEY cannot reach the browser. The static assertions in
# tests/unit/run-atl06c-tests.ts cover source shape, API responses and logs; this covers the one
# thing source inspection cannot: what a real production build actually emits.
#
# Method: build with a unique sentinel as the key, then search the emitted client bundle for it.
# Next.js inlines NEXT_PUBLIC_* variables and anything listed in next.config.ts `env` into the
# client chunks at build time, so if the Atlas credential were ever exposed that way — by a rename,
# a stray config entry, or a client component reading it — the sentinel would appear in
# .next/static and this check would fail. Nothing about the sentinel is a real credential.
#
# Run:  bash scripts/atlas-credential-isolation-check.sh
# Exit: 0 when the client bundle is clean.

set -uo pipefail

SENTINEL="ATLASCREDENTIALSENTINEL$(date +%s)$$"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT}"

echo "=== Atlas credential isolation ==="
echo "Building with a sentinel value in GEMINI_API_KEY (never a real credential)…"

rm -rf .next
if ! GEMINI_API_KEY="${SENTINEL}" npx next build > /tmp/atlas-isolation-build.log 2>&1; then
  echo "FAIL  the build did not complete; see /tmp/atlas-isolation-build.log"
  exit 1
fi
echo "      build complete"

fail=0

client_hits=$(grep -rl "${SENTINEL}" .next/static 2>/dev/null | head -5)
if [[ -n "${client_hits}" ]]; then
  echo "FAIL  the sentinel appears in the CLIENT bundle:"
  echo "${client_hits}" | sed 's/^/        /'
  fail=1
else
  echo "PASS  the sentinel appears nowhere in .next/static — the credential cannot reach the browser"
fi

# The build log is what CI captures. A key echoed during build would be published to every pipeline.
if grep -q "${SENTINEL}" /tmp/atlas-isolation-build.log 2>/dev/null; then
  echo "FAIL  the sentinel appears in the build log"
  fail=1
else
  echo "PASS  the sentinel appears nowhere in the build output"
fi

# Server chunks legitimately reference process.env.GEMINI_API_KEY, but must not inline its VALUE:
# an inlined value would be baked into the image rather than read at call time.
if grep -rl "${SENTINEL}" .next/server 2>/dev/null | head -1 | grep -q .; then
  echo "FAIL  the sentinel is INLINED into the server build — the key must be read at call time, not baked in"
  fail=1
else
  echo "PASS  the sentinel is not inlined into the server build either — it is read from the environment at call time"
fi

# A committed environment file would defeat all of the above.
if git -C "${ROOT}" ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "FAIL  a .env file is tracked in git"
  fail=1
else
  echo "PASS  no .env file is tracked in git"
fi

echo
if [[ ${fail} -eq 0 ]]; then
  echo "CREDENTIAL ISOLATION HOLDS."
else
  echo "CREDENTIAL ISOLATION FAILED."
fi
exit ${fail}
