/**
 * The governance engine (ATL-07, ADR-068).
 *
 * Runs every declared check over the whole corpus and returns a report. It has **no write path** —
 * no fs write, no registry mutation, no knowledge edit — which is `AC-ATL-07-3` made structural:
 * automation flags and blocks, it never promotes a maturity state. A test asserts the absence
 * directly, because "we would not do that" is not a guarantee.
 *
 * Git and the filesystem are injected. That keeps the engine pure and testable, and it means the two
 * environments where governance is most likely to mislead — a shallow CI clone with no history, and a
 * container with a partial checkout — are cases the tests can reproduce rather than discover.
 */

import type {
  GovernanceCheckDefinition, GovernanceFinding, GovernanceReport, ProviderVerificationRecord
} from '../../../packages/contracts/src/atlas-governance-model';
import type { CapabilityIdentity, CapabilityKnowledge } from '../../../packages/contracts/src/capability-atlas-model';
import { RECORD_CHECKS, runRecordChecks } from './checks-record';
import { PROVIDER_CHECKS, runProviderChecks } from './checks-provider';

export const ALL_CHECKS: GovernanceCheckDefinition[] = [...RECORD_CHECKS, ...PROVIDER_CHECKS];

export interface GovernanceInput {
  capabilities: {
    identity: CapabilityIdentity;
    knowledge: CapabilityKnowledge | null;
    demoMaturity: string | null;
  }[];
  providerRecord: ProviderVerificationRecord;
  fileExists: (path: string) => boolean;
  lastChangedAt: (path: string) => string | null;
  verifiedCommitDate: string | null;
  now: Date;
}

export function runGovernance(input: GovernanceInput): GovernanceReport {
  const findings: GovernanceFinding[] = [];

  for (const entry of input.capabilities) {
    findings.push(...runRecordChecks({
      identity: entry.identity,
      knowledge: entry.knowledge,
      demoMaturity: entry.demoMaturity,
      fileExists: input.fileExists,
      lastChangedAt: input.lastChangedAt,
      now: input.now
    }));
  }

  findings.push(...runProviderChecks({
    record: input.providerRecord,
    fileExists: input.fileExists,
    lastChangedAt: input.lastChangedAt,
    verifiedCommitDate: input.verifiedCommitDate,
    now: input.now
  }));

  const blocking = findings.filter(f => f.severity === 'blocking');
  // Publication is refused per capability, not corpus-wide: one incomplete record must not make the
  // other thirty-seven unpublishable.
  const unpublishable = [...new Set(
    blocking.filter(f => f.subject === 'capability').map(f => f.about)
  )];

  return {
    generated_at: input.now.toISOString(),
    checked_capabilities: input.capabilities.length,
    checks_run: ALL_CHECKS.map(c => c.check_id),
    findings,
    blocking: blocking.length,
    advisory: findings.length - blocking.length,
    unpublishable,
    publishable: blocking.length === 0
  };
}

/** Publication gate for one capability (`AC-ATL-07-2`). Reports; never changes a record. */
export function isPublishable(report: GovernanceReport, capabilityId: string): boolean {
  return !report.unpublishable.includes(capabilityId);
}
