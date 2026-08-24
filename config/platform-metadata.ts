/**
 * The single governed source of platform identification (ATL-04R).
 *
 * `ATL-04R` retired the About module as a navigation destination and replaced it with a lightweight
 * header surface. That surface identifies the platform; it does not explain it. Everything it shows
 * comes from here, so no component ever hard-codes a version, an environment or a compliance claim.
 *
 * ── A missing value is preferable to a fabricated one ───────────────────────
 * Every field except the identity trio is nullable, and that asymmetry is the whole design. `build`
 * and `release` are `null` unless the deployment supplies them, and the About surface says the value
 * is not recorded rather than inventing one.
 *
 * `certifications` is deliberately an EMPTY array. An audit across `app`, `components`, `config`,
 * `lib` and `content` found no SOC 2, ISO 27001 or equivalent record anywhere in the estate — the
 * only compliance-flavoured strings were the storyboard's unsupported "100% Policy Enforced" and
 * "Access Compliance" constants, which `ATL-01` had already marked Discard. There is nothing to
 * cite, so nothing is cited. A badge here would be a fabricated attestation, which is a more serious
 * failure than an unsupported metric: it makes a claim about the organisation, not the software.
 *
 * `version` is asserted against `package.json` by the `ATL-04R` suite rather than imported, so the
 * two cannot drift and no bundler has to inline a manifest into the browser to keep them honest.
 *
 * Governed by: COGNIX_PRINCIPLES.md Principle 12 · ADR-046 · ADR-063
 */

import type { PlatformMetadata } from '../packages/contracts/src/capability-atlas-model';

/** Must equal `package.json` `version`. Asserted by `run-atl04r-tests.ts`. */
export const PLATFORM_VERSION = '1.0.0';

function fromEnv(name: string): string | null {
  if (typeof process === 'undefined') return null;
  const value = process.env[name];
  return value && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Resolved server-side, where the deployment environment is actually visible. The browser receives
 * this through `/api/v1/platform`, which is why no `NEXT_PUBLIC_` variable is read: build identity
 * is not something a client should be able to assert about itself.
 */
export function resolvePlatformMetadata(): PlatformMetadata {
  return {
    productName: 'CogniX',
    organisation: 'G10X',
    descriptor: 'Enterprise Innovation Lab',
    version: PLATFORM_VERSION,
    build: fromEnv('COGNIX_BUILD_ID') ?? fromEnv('CI_COMMIT_SHORT_SHA'),
    environment: fromEnv('COGNIX_ENVIRONMENT') ?? fromEnv('NODE_ENV'),
    release: fromEnv('COGNIX_RELEASE'),
    certifications: [],
    lastUpdated: '2026-08-22'
  };
}
