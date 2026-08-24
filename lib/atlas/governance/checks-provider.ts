/**
 * Live-provider drift checks (ATL-07, ADR-068).
 *
 * **This is the first-class part of ATL-07, not an appendix to it.** Every other check in this
 * directory reads files the estate controls. These read the gap between what the estate believes
 * about an external service and what has happened since it last checked — the gap that the `ATL-06`
 * sequence proved nothing was watching.
 *
 * The evidence for that is specific rather than rhetorical. Three defects reached a credentialed run
 * before anything failed: a credential path no deployment provisioned, model aliases Google had
 * retired, and a segment `startIndex` elided at its default value. Every fixture-backed suite stayed
 * green through all three — correctly, because a recorded response cannot notice that the world
 * moved. Fixtures prove refusal behaviour a live search cannot be made to produce on demand; they
 * cannot prove the contract still holds. Both are needed, and only one of them existed.
 *
 * Three checks, in the order the defects actually arrived:
 *
 *   `GOV-PROV-1` **staleness by code change** — the provider layer moved ahead of the commit the live
 *   round trip passed on. This is the general form of all three defects: the verification now
 *   describes code that no longer exists.
 *
 *   `GOV-PROV-2` **staleness by age** — nothing moved, but a live dependency was last confirmed long
 *   enough ago that "we tested this" has quietly become "we tested this once".
 *
 *   `GOV-PROV-3` **model configuration** — the configured model is no longer the one that was
 *   verified. The retired-alias defect in one line.
 *
 * None of these needs a credential, which is what makes them CI checks rather than a ritual. They
 * compare recorded belief against repository state; the credentialed run is what refreshes the
 * belief.
 */

import type {
  GovernanceCheckDefinition, GovernanceFinding, ProviderVerificationRecord
} from '../../../packages/contracts/src/atlas-governance-model';
import { GEMINI_MODEL_ENV_VAR, resolveGeminiModelConfig } from '../../../config/gemini-models';

export const PROVIDER_CHECKS: GovernanceCheckDefinition[] = [
  {
    check_id: 'GOV-PROV-1',
    subject: 'provider',
    severity: 'advisory',
    assertion: 'No file the live verification depends on has changed since the commit it passed on.',
    governs: 'ADR-068 — a live verification describes a version of the code, not the code forever'
  },
  {
    check_id: 'GOV-PROV-2',
    subject: 'provider',
    severity: 'advisory',
    assertion: 'The live verification is within its currency window.',
    governs: 'ADR-068 — an external dependency confirmed once is not confirmed'
  },
  {
    check_id: 'GOV-PROV-3',
    subject: 'provider',
    severity: 'blocking',
    assertion: 'The configured model is the one the live verification actually passed on, or an override is explicit.',
    governs: 'ADR-067 — one governed model configuration, no silent substitution'
  },
  {
    check_id: 'GOV-PROV-4',
    subject: 'provider',
    severity: 'blocking',
    assertion: 'Every file the verification names as load-bearing still exists.',
    governs: 'ADR-068 — a verification that cites a deleted file verifies nothing'
  }
];

export interface ProviderCheckContext {
  record: ProviderVerificationRecord;
  /** Last commit date for a path, ISO. `null` when git cannot answer — reported, never assumed clean. */
  lastChangedAt: (path: string) => string | null;
  /** Commit date of the verified commit, ISO, or `null` when it cannot be resolved. */
  verifiedCommitDate: string | null;
  fileExists: (path: string) => boolean;
  now: Date;
}

const DAY_MS = 86_400_000;

export function runProviderChecks(ctx: ProviderCheckContext): GovernanceFinding[] {
  const findings: GovernanceFinding[] = [];
  const { record } = ctx;

  // GOV-PROV-4 first: a verification citing a file that no longer exists is not merely stale.
  const missing = record.verified_paths.filter(p => !ctx.fileExists(p));
  for (const path of missing) {
    findings.push({
      check_id: 'GOV-PROV-4',
      subject: 'provider',
      severity: 'blocking',
      about: path,
      detail: `The live verification names '${path}' as load-bearing, and that file no longer exists.`,
      remedy: 'Update config/atlas-provider-verification.ts to name the file that replaced it, and re-run the live check before relying on the recorded result.'
    });
  }

  // GOV-PROV-1: the provider layer moved ahead of the verified commit.
  if (ctx.verifiedCommitDate === null) {
    findings.push({
      check_id: 'GOV-PROV-1',
      subject: 'provider',
      severity: 'advisory',
      about: 'provider',
      detail: `Commit '${record.verified_commit}' could not be resolved, so drift since the live verification cannot be measured. A shallow clone will do this.`,
      remedy: 'Run with full git history, or re-run the live check and record the new commit.'
    });
  } else {
    const verified = new Date(ctx.verifiedCommitDate).getTime();
    const drifted: string[] = [];
    const unknown: string[] = [];
    for (const path of record.verified_paths.filter(p => ctx.fileExists(p))) {
      const changed = ctx.lastChangedAt(path);
      if (changed === null) { unknown.push(path); continue; }
      if (new Date(changed).getTime() > verified) drifted.push(path);
    }
    if (drifted.length > 0) {
      findings.push({
        check_id: 'GOV-PROV-1',
        subject: 'provider',
        severity: 'advisory',
        about: 'provider',
        detail: `${drifted.length} file(s) the live verification depends on have changed since ${record.verified_commit}: ${drifted.join(', ')}. The recorded round trip describes code that has since moved.`,
        remedy: 'Re-run scripts/atlas-live-grounding-check.ts with a credential and update config/atlas-provider-verification.ts, or confirm the change cannot affect the provider contract and say so in the record.'
      });
    }
    if (unknown.length > 0) {
      findings.push({
        check_id: 'GOV-PROV-1',
        subject: 'provider',
        severity: 'advisory',
        about: 'provider',
        detail: `Change history is unavailable for ${unknown.length} verified path(s): ${unknown.join(', ')}.`,
        remedy: 'Run this check where git history is available. An unanswerable drift question is reported, never treated as a pass.'
      });
    }
  }

  // GOV-PROV-2: age.
  const ageDays = Math.floor((ctx.now.getTime() - new Date(record.verified_at).getTime()) / DAY_MS);
  if (ageDays > record.max_age_days) {
    findings.push({
      check_id: 'GOV-PROV-2',
      subject: 'provider',
      severity: 'advisory',
      about: 'provider',
      detail: `The live verification is ${ageDays} days old, beyond its ${record.max_age_days}-day currency window. Nothing in the repository has to change for an external contract to.`,
      remedy: 'Re-run the live check with a credential and update the recorded verification date.'
    });
  }

  // GOV-PROV-3: the configured model is what was actually verified.
  let configured: string[] = [];
  let configSource: string | null = null;
  try {
    const resolved = resolveGeminiModelConfig();
    configured = resolved.models;
    configSource = resolved.source;
  } catch (e: unknown) {
    findings.push({
      check_id: 'GOV-PROV-3',
      subject: 'provider',
      severity: 'blocking',
      about: 'provider',
      detail: `The model configuration is unusable: ${e instanceof Error ? e.message : 'unknown error'}`,
      remedy: `Correct ${GEMINI_MODEL_ENV_VAR} or unset it to fall back to the governed default.`
    });
    return findings;
  }

  if (!configured.includes(record.model)) {
    findings.push({
      check_id: 'GOV-PROV-3',
      subject: 'provider',
      severity: 'blocking',
      about: 'provider',
      detail: `The configured model list (${configured.join(', ')}, from the ${configSource}) does not contain '${record.model}', which is the model the live round trip actually passed on. This is the retired-alias defect in its general form: the estate would be calling a model nothing has verified.`,
      remedy: `Either configure '${record.model}', or run the live check against the new model and update config/atlas-provider-verification.ts.`
    });
  }

  return findings;
}
