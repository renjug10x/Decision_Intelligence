import { ok } from '../_shared';
import { capabilityRepository } from '@/services/atlas/src/capability-registry';
import { PROVIDER_VERIFICATION } from '@/config/atlas-provider-verification';
import { resolveGeminiModelConfig } from '@/config/gemini-models';
import { runGovernance } from '@/lib/atlas/governance/engine';
import {
  STORYBOARD_GATE, STORYBOARD_GATES_MET, STORYBOARD_GATE_TOTAL, STORYBOARD_DISPOSITION
} from '@/config/atlas-storyboard-gate';
import { activeGroundingProvider } from '@/lib/atlas/grounding/provider';
import { ensureGroundingProviderRegistered } from '@/lib/atlas/grounding/providers/register';

/**
 * Atlas health (ATL-FINAL).
 *
 * The `ATL-07` governance engine, served to the Observability & Governance surface so the estate's
 * own honesty is visible in the product rather than only in a terminal. Same engine, same checks,
 * same findings — this route computes, it does not restate.
 *
 * ── Why this route touches no filesystem ────────────────────────────────────
 * Two of the thirteen checks are repository questions: `GOV-REC-2` asks whether a record's cited
 * paths still exist, and `GOV-REC-3` asks whether they have moved since a human read them. Answering
 * them here would mean reading `process.cwd()` at request time, and a first attempt did exactly that.
 * It cost two things. The bundler traced the **whole project** into the deployment output, warning as
 * much; and in a standalone deployment — which ships the built server, not the repository — every
 * cited path would resolve to nothing and the surface would invent thirty-eight blocking findings out
 * of its own deployment shape.
 *
 * So those two checks are not run here at all. They belong to
 * `npx tsx scripts/atlas-governance-check.ts`, which runs against a checkout, runs in CI, and is the
 * only place that can answer them truthfully. The payload names them as **not measured here** rather
 * than reporting a zero it did not earn — the same rule the rest of this surface follows.
 *
 * ── Counts overlap and the payload says so ──────────────────────────────────
 * One record can be short of its lifecycle tier *and* carry no lifecycle state; adding the numbers
 * would produce a total larger than the corpus. The surface renders `counts_overlap` rather than
 * leaving a reader to assume otherwise.
 */

/**
 * `GOV-REC-2` and `GOV-REC-3` need a working tree. Reporting `true` here suppresses the finding
 * rather than passing it: the payload declares both checks unmeasured, and the surface says where to
 * run them. Reporting `false` would be worse — it would fabricate a broken citation for every record.
 */
const NOT_MEASURED_HERE = ['GOV-REC-2', 'GOV-REC-2H', 'GOV-REC-3'] as const;

export async function GET() {
  ensureGroundingProviderRegistered();

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
    fileExists: () => true,
    lastChangedAt: () => null,
    verifiedCommitDate: null,
    now: new Date()
  });

  /*
   * The engine, given no filesystem and no history, correctly reports that it could not measure —
   * once per record for `GOV-REC-3` and once for the provider commit. That is the right behaviour in
   * the command, where the absence is a surprise worth reporting. Here the absence is by design and
   * is declared once in `not_measured_here`, so repeating it fifty times would bury the eleven
   * findings a reader came for. Filtered by check identifier, never by outcome: nothing that this
   * route DID measure is removed.
   */
  const unmeasured: string[] = [...NOT_MEASURED_HERE];
  const findings = report.findings.filter(f =>
    !unmeasured.includes(f.check_id) &&
    !(f.subject === 'provider' && /could not be resolved|cannot be measured/.test(f.detail))
  );

  const count = (id: string) => new Set(
    findings.filter(f => f.check_id === id).map(f => f.about)
  ).size;

  const withKnowledge = capabilities.filter(c => c.knowledge !== null);
  const withTestEvidence = withKnowledge.filter(c => (c.knowledge!.test_runners ?? []).length > 0).length;
  const withExternalEvidence = withKnowledge.filter(c => (c.knowledge!.external_evidence ?? []).length > 0).length;
  const withDataSources = withKnowledge.filter(c => (c.knowledge!.data_sources ?? []).length > 0).length;

  /*
   * The null lifecycle states are not scattered: every one of the nine `enabling-service`
   * capabilities carries one, and the remainder are three records whose own capability type does
   * carry a state elsewhere. Reporting the shape rather than only the count is the difference
   * between "twelve records are incomplete" and "the innovation lifecycle was never applied to
   * platform substrate, and three records are a genuine owner decision" (ADR-047).
   */
  const withoutLifecycleByType: Record<string, number> = {};
  const typeTotals: Record<string, number> = {};
  for (const identity of identities) {
    typeTotals[identity.capability_type] = (typeTotals[identity.capability_type] ?? 0) + 1;
    if (identity.lifecycle_state !== null) continue;
    withoutLifecycleByType[identity.capability_type] = (withoutLifecycleByType[identity.capability_type] ?? 0) + 1;
  }

  const providerFindings = findings.filter(f => f.subject === 'provider');
  const modelConfig = (() => {
    try { return resolveGeminiModelConfig(); } catch { return null; }
  })();

  return ok('capability-atlas-health', {
    generated_at: report.generated_at,
    counts_overlap: 'A record can appear under more than one measure. These are not slices of the corpus and do not sum to it.',
    /** The checks this route cannot answer, named rather than silently absent. */
    not_measured_here: {
      checks: [...NOT_MEASURED_HERE],
      reason: 'Reference existence and drift are repository questions. This route serves a built application and does not read the working tree.',
      run: 'npx tsx scripts/atlas-governance-check.ts'
    },
    coverage: {
      capabilities: identities.length,
      with_knowledge: withKnowledge.length,
      with_lifecycle_state: identities.filter(i => i.lifecycle_state !== null).length,
      without_lifecycle_state: count('GOV-REC-6'),
      with_test_evidence: withTestEvidence,
      with_data_sources: withDataSources,
      with_external_evidence: withExternalEvidence,
      /** Null lifecycle states, by capability type, against the total of that type. */
      without_lifecycle_by_type: Object.entries(withoutLifecycleByType)
        .map(([capability_type, count]) => ({ capability_type, count, of_type: typeTotals[capability_type] }))
        .sort((a, b) => b.count - a.count)
    },
    governance: {
      blocking: findings.filter(f => f.severity === 'blocking').length,
      advisory: findings.filter(f => f.severity === 'advisory').length,
      unpublishable: report.unpublishable.length,
      lifecycle_tier_gaps: count('GOV-REC-1'),
      missing_provenance: count('GOV-REC-5'),
      overdue_review: count('GOV-REC-4'),
      undemonstrable_at_claimed_maturity: count('GOV-REC-7'),
      stale_market_evidence: count('GOV-REC-8'),
      undeclared_limitations: count('GOV-REC-9'),
      reference_checks_measured: false
    },
    provider: {
      name: PROVIDER_VERIFICATION.provider,
      model: PROVIDER_VERIFICATION.model,
      configured_models: modelConfig?.models ?? null,
      model_source: modelConfig?.source ?? null,
      credential_configured: activeGroundingProvider() !== null,
      last_validated_at: PROVIDER_VERIFICATION.verified_at,
      last_validated_commit: PROVIDER_VERIFICATION.verified_commit,
      contract_assumptions: PROVIDER_VERIFICATION.contract_assumptions.length,
      drift_findings: providerFindings.length,
      healthy: providerFindings.length === 0,
      findings: providerFindings.map(f => ({ check_id: f.check_id, severity: f.severity, detail: f.detail, remedy: f.remedy }))
    },
    storyboard: {
      gates_met: STORYBOARD_GATES_MET,
      gates_total: STORYBOARD_GATE_TOTAL,
      retirement_permitted: STORYBOARD_GATES_MET === STORYBOARD_GATE_TOTAL,
      disposition: STORYBOARD_DISPOSITION,
      conditions: STORYBOARD_GATE
    },
    /** Full findings, for the Developer lens. Deliberately last: it is detail, not headline. */
    findings
  });
}
