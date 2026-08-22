/**
 * The one governance command (ATL-07, `AC-ATL-07-5`).
 *
 *   npx tsx scripts/atlas-governance-check.ts              # report everything, exit 0
 *   npx tsx scripts/atlas-governance-check.ts --enforce    # exit non-zero on any blocking finding
 *   npx tsx scripts/atlas-governance-check.ts --json       # machine-readable report
 *
 * **Advisory by default, and that is a decision rather than an omission** (ADR-068). Governance
 * automation that blocks on the day it lands teaches contributors to route around it. The check runs
 * in CI reporting only; `--enforce` is how the estate turns each family blocking once its findings
 * have been worked down, and which families become blocking in CI is recorded as outstanding.
 *
 * This command reads. It writes nothing, edits no record and promotes no maturity state.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { capabilityRepository } from '../services/atlas/src/capability-registry';
import { PROVIDER_VERIFICATION } from '../config/atlas-provider-verification';
import { ALL_CHECKS, runGovernance } from '../lib/atlas/governance/engine';
import type { GovernanceFinding } from '../packages/contracts/src/atlas-governance-model';

const ROOT = join(__dirname, '..');

function git(args: string[]): string | null {
  try {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}

/** Last commit date for a path. `null` when git cannot answer — reported, never read as "unchanged". */
function lastChangedAt(path: string): string | null {
  const out = git(['log', '-1', '--format=%cI', '--', path]);
  return out && out.length > 0 ? out : null;
}

function severityMark(f: GovernanceFinding): string {
  return f.severity === 'blocking' ? 'BLOCK ' : 'ADVISE';
}

async function main() {
  const enforce = process.argv.includes('--enforce');
  const asJson = process.argv.includes('--json');

  const identities = capabilityRepository.listIdentities();
  const capabilities = [];
  for (const identity of identities) {
    const resolved = await capabilityRepository.resolve(identity.capability_id, { includeKnowledge: true });
    capabilities.push({
      identity,
      knowledge: resolved?.knowledge ?? null,
      demoMaturity: resolved?.demo_maturity ?? null
    });
  }

  const report = runGovernance({
    capabilities,
    providerRecord: PROVIDER_VERIFICATION,
    fileExists: p => existsSync(join(ROOT, p)),
    lastChangedAt,
    verifiedCommitDate: git(['log', '-1', '--format=%cI', PROVIDER_VERIFICATION.verified_commit]),
    now: new Date()
  });

  if (asJson) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(enforce && report.blocking > 0 ? 1 : 0);
  }

  console.log('\n=== CogniX Capability Atlas — governance ===\n');
  console.log(`  ${report.checked_capabilities} capabilities · ${ALL_CHECKS.length} checks · ${report.findings.length} findings`);
  console.log(`  ${report.blocking} blocking · ${report.advisory} advisory\n`);

  // Provider first. It concerns the estate's live dependency, which no capability owns and which the
  // ATL-06 sequence proved nothing else was watching.
  const provider = report.findings.filter(f => f.subject === 'provider');
  console.log(`  LIVE PROVIDER (${provider.length})`);
  if (provider.length === 0) {
    console.log(`        no drift — verification of ${PROVIDER_VERIFICATION.model} on ${PROVIDER_VERIFICATION.verified_commit} still describes the current provider layer`);
  }
  for (const f of provider) {
    console.log(`  ${severityMark(f)} ${f.check_id}  ${f.detail}`);
    console.log(`         → ${f.remedy}`);
  }

  const byCapability = new Map<string, GovernanceFinding[]>();
  for (const f of report.findings.filter(x => x.subject === 'capability')) {
    byCapability.set(f.about, [...(byCapability.get(f.about) ?? []), f]);
  }
  console.log(`\n  CAPABILITIES (${byCapability.size} with findings, of ${report.checked_capabilities})`);
  for (const [capability, list] of [...byCapability].sort()) {
    console.log(`\n  ${capability}`);
    for (const f of list) {
      console.log(`  ${severityMark(f)} ${f.check_id}  ${f.detail}`);
    }
  }

  if (report.unpublishable.length > 0) {
    console.log(`\n  NOT PUBLISHABLE (${report.unpublishable.length}): ${report.unpublishable.join(', ')}`);
    console.log('        A blocking finding refuses publication for that record only. The rest of the corpus is unaffected.');
  }

  console.log('\n====================================================');
  if (report.blocking === 0) {
    console.log('GOVERNANCE CLEAN — no blocking findings.');
  } else if (enforce) {
    console.log(`GOVERNANCE FAILED — ${report.blocking} blocking finding(s).`);
  } else {
    console.log(`${report.blocking} blocking finding(s) reported. Advisory mode: exiting 0. Run with --enforce to fail.`);
  }
  console.log('====================================================\n');

  process.exit(enforce && report.blocking > 0 ? 1 : 0);
}

const invokedDirectly = (process.argv[1] ?? '').endsWith('atlas-governance-check.ts');
if (invokedDirectly) {
  main().catch(e => { console.error('Governance check failed:', e instanceof Error ? e.message : e); process.exit(1); });
}
