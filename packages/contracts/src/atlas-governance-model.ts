/**
 * Capability governance contract (ATL-07, ADR-068).
 *
 * The Atlas records what CogniX can do. This contract records what is true about those records: which
 * are complete for their lifecycle state, which cite files that no longer exist, which have drifted
 * from the code they describe, which are overdue for review — and whether the estate's assumptions
 * about the live AI provider still hold.
 *
 * Two shapes carry the whole design.
 *
 * `GovernanceFinding` has **no field capable of changing anything**. It carries an identifier, a
 * severity, what it is about, what is wrong and what to do — and nothing else. That is ADR-047 and
 * `AC-ATL-07-3` made structural: automation flags and blocks, it never promotes a maturity state. A
 * governance engine that could write to a record would eventually be asked to tidy one up.
 *
 * `severity` is deliberately two values, not a spectrum. `blocking` prevents publication; `advisory`
 * asks a human to look. A third value in the middle is where a check goes to be ignored.
 */

import type { CapabilityId } from './capability-atlas-model';

export const GOVERNANCE_SEVERITIES = ['blocking', 'advisory'] as const;
export type GovernanceSeverity = typeof GOVERNANCE_SEVERITIES[number];

/**
 * What a finding is about. `provider` findings are not attached to a capability — they concern the
 * estate's live dependency, which no single record owns and which the `ATL-06` sequence proved
 * nothing else was watching.
 */
export const GOVERNANCE_SUBJECTS = ['capability', 'provider', 'corpus'] as const;
export type GovernanceSubject = typeof GOVERNANCE_SUBJECTS[number];

export interface GovernanceCheckDefinition {
  /** `GOV-<FAMILY>-<N>`. Stable, cited in reports and in CI output. */
  check_id: string;
  subject: GovernanceSubject;
  severity: GovernanceSeverity;
  /** What the check asserts, in one sentence a contributor can act on. */
  assertion: string;
  /** The acceptance criterion or rule it serves. */
  governs: string;
}

export interface GovernanceFinding {
  check_id: string;
  subject: GovernanceSubject;
  severity: GovernanceSeverity;
  /** `CAP-*` for a capability finding; a module path or `provider` otherwise. */
  about: CapabilityId | string;
  /** What is wrong. Never a suggestion to change a maturity state. */
  detail: string;
  /** What a human should do. Advice, never an action this engine takes. */
  remedy: string;
}

export interface GovernanceReport {
  generated_at: string;
  checked_capabilities: number;
  checks_run: string[];
  findings: GovernanceFinding[];
  blocking: number;
  advisory: number;
  /** Capabilities that fail a publication gate (`AC-ATL-07-2`). */
  unpublishable: CapabilityId[];
  /** True when nothing blocking was found. Advisory findings do not clear or set this. */
  publishable: boolean;
}

/**
 * The estate's recorded belief about the live AI provider (ATL-07, ADR-068).
 *
 * This exists because the `ATL-06` sequence established, expensively, that a fixture-backed suite
 * cannot notice a provider contract changing underneath it. Three defects reached a credentialed run
 * before anything failed: a credential path nothing provisioned, model aliases that had been retired,
 * and a segment offset elided at its default value. Every suite stayed green through all three.
 *
 * So the belief is written down, with the commit it was verified on and the files whose change
 * invalidates it. When those files move ahead of that commit, the verification is **stale** and says
 * so — which is the difference between "we tested this" and "we tested this, once, against a version
 * of the world that has since moved on".
 */
export interface ProviderVerificationRecord {
  provider: string;
  model: string;
  /** Commit the live round trip actually passed on. */
  verified_commit: string;
  verified_at: string;
  /** Sanitised result summary. Never a provider payload. */
  scenarios: { id: string; description: string; outcome: string }[];
  /** Changing any of these invalidates the verification above. */
  verified_paths: string[];
  /** Assumptions about the wire contract, each with the code that depends on it. */
  contract_assumptions: {
    assumption_id: string;
    statement: string;
    depends_on: string;
    verified_by: string;
  }[];
  /** How long a live verification is considered current. */
  max_age_days: number;
}
