'use client';

/**
 * Atlas health (ATL-FINAL) — the `ATL-07` governance engine, made visible where it matters.
 *
 * `ATL-07` built the checks and left them in a terminal. That is the wrong place for them: the estate
 * spent seven phases insisting a capability record state its own limitations, and then kept the
 * record of how honest those records actually are in a CLI nobody outside engineering runs.
 *
 * Two rules shape this surface.
 *
 *   **Counts overlap, and it says so.** One record can be short of its lifecycle tier *and* cite a
 *   file that has moved. Adding the measures would produce a number larger than the corpus, so the
 *   surface states the overlap rather than leaving a reader to infer a total.
 *
 *   **Unmeasured is not zero.** Where git history is unavailable, reference drift renders as *not
 *   measured* rather than as a reassuring nought. A health surface that reads silence as health is
 *   worse than no health surface.
 *
 * The four lenses change **depth and ordering, never facts** (ADR-045). An executive sees estate risk;
 * a seller sees what they may and may not claim; an architect sees provenance and provider drift; a
 * developer sees the findings themselves, with check identifiers and remedies. The same governance
 * report is behind all four.
 */

import { useEffect, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, Loader2, ShieldCheck, Globe, Layers, Code2
} from 'lucide-react';

import type { GovernanceFinding, GovernanceSeverity } from '@/packages/contracts/src/atlas-governance-model';
import type { StoryboardGateCondition } from '@/config/atlas-storyboard-gate';

type Lens = 'innovation-executive' | 'sales' | 'architect' | 'developer';

const LENSES: { id: Lens; label: string; Icon: typeof ShieldCheck; reads: string }[] = [
  { id: 'innovation-executive', label: 'Innovation Executive', Icon: Activity, reads: 'Estate health and where the risk sits' },
  { id: 'sales', label: 'Sales', Icon: Globe, reads: 'What is demonstrable, and what must not be claimed' },
  { id: 'architect', label: 'Architect', Icon: Layers, reads: 'Provenance, provider contract and reference integrity' },
  { id: 'developer', label: 'Developer', Icon: Code2, reads: 'Every finding, with its check, field and remedy' }
];

/** The `/api/v1/atlas/health` payload. Kept structural rather than `any` so a route change breaks here. */
interface ProviderHealth {
  name: string;
  model: string;
  configured_models: string[] | null;
  model_source: string | null;
  credential_configured: boolean;
  last_validated_at: string;
  last_validated_commit: string;
  contract_assumptions: number;
  drift_findings: number;
  healthy: boolean;
  findings: { check_id: string; severity: GovernanceSeverity; detail: string; remedy: string }[];
}

interface StoryboardHealth {
  gates_met: number;
  gates_total: number;
  retirement_permitted: boolean;
  disposition: string;
  conditions: StoryboardGateCondition[];
}

interface LifecycleGapByType { capability_type: string; count: number; of_type: number }

interface Coverage {
  capabilities: number;
  with_knowledge: number;
  with_lifecycle_state: number;
  without_lifecycle_state: number;
  with_test_evidence: number;
  with_data_sources: number;
  with_external_evidence: number;
  without_lifecycle_by_type: LifecycleGapByType[];
}

interface NotMeasuredHere { checks: string[]; reason: string; run: string }

interface Health {
  generated_at: string;
  counts_overlap: string;
  not_measured_here: NotMeasuredHere;
  coverage: Coverage;
  governance: Record<string, number | boolean | null>;
  provider: ProviderHealth;
  storyboard: StoryboardHealth;
  findings: GovernanceFinding[];
}

function Tile({ value, label, tone = 'neutral' }: { value: string | number; label: string; tone?: 'neutral' | 'good' | 'warn' }) {
  return (
    <div className={`ah-tile ah-tile--${tone}`}>
      <span className="ah-tile-value">{value}</span>
      <span className="ah-tile-label">{label}</span>
    </div>
  );
}

export default function AtlasHealth() {
  const [lens, setLens] = useState<Lens>('innovation-executive');
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/v1/atlas/health', { headers: { Accept: 'application/json' } })
      .then(r => r.json())
      .then(p => setHealth(p.data))
      .catch(() => setError('Atlas health could not be read.'));
  }, []);

  if (error) return <p className="og-note">{error}</p>;
  if (!health) return <p className="og-note"><Loader2 size={13} /> Reading governance…</p>;

  const c = health.coverage;
  const g = health.governance;
  const p = health.provider;
  const sb = health.storyboard;

  return (
    <div className="ah">
      <div className="ah-lenses" role="group" aria-label="Read this as">
        {LENSES.map(l => (
          <button
            key={l.id}
            type="button"
            className="ah-lens"
            aria-pressed={lens === l.id}
            onClick={() => setLens(l.id)}
          >
            <l.Icon size={13} strokeWidth={1.9} />
            <span>
              <strong>{l.label}</strong>
              <span className="ah-lens-reads">{l.reads}</span>
            </span>
          </button>
        ))}
      </div>

      <p className="ah-overlap">{health.counts_overlap}</p>

      {/* ── Innovation Executive — estate health and risk ─────────────────── */}
      {lens === 'innovation-executive' && (
        <>
          <div className="ah-tiles">
            <Tile value={c.capabilities} label="governed capabilities" />
            <Tile value={`${c.with_lifecycle_state}/${c.capabilities}`} label="carry a lifecycle state" />
            <Tile value={g.unpublishable as number} label="not publishable today" tone={(g.unpublishable as number) > 0 ? 'warn' : 'good'} />
            <Tile value={p.healthy ? 'Healthy' : 'Drift'} label="live AI provider" tone={p.healthy ? 'good' : 'warn'} />
          </div>
          <p className="ah-read">
            {(g.unpublishable as number) > 0 ? (
              <>
                <strong>{g.unpublishable as number} of {c.capabilities} records cannot be published</strong> because they claim a
                lifecycle stage they do not yet evidence. This is a documentation gap, not a claim that
                the capabilities are absent — every one is real and demonstrable. The risk is that a
                record asserts more maturity than its evidence supports, which is the failure this
                estate is built to prevent.
              </>
            ) : (
              <>Every record meets the completeness standard for the lifecycle stage it claims.</>
            )}
          </p>
          <p className="ah-read">
            <strong>{c.without_lifecycle_state} records carry no innovation lifecycle stage.</strong> That
            is not scattered inattention: it falls almost entirely on one kind of capability.{' '}
            {c.without_lifecycle_by_type.map(t => `${t.count} of the ${t.of_type} ${t.capability_type.replace(/-/g, ' ')} records`).join(', ')}.
            The innovation lifecycle describes how an idea matures through the lab, and the platform
            substrate underneath was built rather than incubated. The null is preserved rather than
            given a plausible value, and it means those records are exempt from the completeness
            check that would otherwise govern them.
          </p>
          <p className="ah-read">
            The live AI provider was last validated on <strong>{p.last_validated_at}</strong> against{' '}
            <strong>{p.model}</strong>, with {p.drift_findings === 0 ? 'no drift since' : `${p.drift_findings} drift finding(s)`}.
            {' '}Market evidence coverage is <strong>{c.with_external_evidence} of {c.capabilities}</strong>:
            the Atlas can currently cite no external market claim, which is a gap rather than a defect.
          </p>
        </>
      )}

      {/* ── Sales — demo truth and positioning risk ───────────────────────── */}
      {lens === 'sales' && (
        <>
          <div className="ah-tiles">
            <Tile value={c.with_knowledge} label="capabilities you can explain" />
            <Tile value={c.with_test_evidence} label="backed by test evidence" />
            <Tile value={c.with_external_evidence} label="with market evidence" tone={c.with_external_evidence === 0 ? 'warn' : 'good'} />
            <Tile value={g.undeclared_limitations as number} label="missing a stated limitation" tone={(g.undeclared_limitations as number) > 0 ? 'warn' : 'good'} />
          </div>
          <p className="ah-read">
            <strong>What you may claim.</strong> Every one of the {c.with_knowledge} capabilities carries a
            governed description, its three maturity dimensions and its recorded limitations. Preparation
            packs quote those; they never write new ones.
          </p>
          <p className="ah-read">
            <strong>What you must not claim.</strong> Market evidence coverage is{' '}
            <strong>{c.with_external_evidence} of {c.capabilities}</strong>. There is no sourced competitor
            or analyst claim in the Atlas, so any comparative statement in a client conversation is
            yours rather than the platform's. External research is available on request and is governed;
            it is off by default and refuses rather than approximates.
          </p>
          <p className="ah-read">
            <strong>Positioning risk.</strong> {(g.stale_market_evidence as number) > 0
              ? `${g.stale_market_evidence as number} recorded market claim(s) are past their currency window.`
              : 'No recorded market claim is past its currency window.'}{' '}
            {(g.undeclared_limitations as number) > 0
              ? `${g.undeclared_limitations as number} capability record(s) are not fully implemented and state no limitation — check the record before demonstrating one of those.`
              : 'Every not-fully-implemented capability states what is missing.'}
          </p>
        </>
      )}

      {/* ── Architect — provenance, provider contract, reference integrity ── */}
      {lens === 'architect' && (
        <>
          <div className="ah-tiles">
            <Tile value={p.contract_assumptions} label="provider contract assumptions" />
            <Tile value={p.drift_findings} label="provider drift findings" tone={p.drift_findings === 0 ? 'good' : 'warn'} />
            <Tile value={g.missing_provenance as number} label="records with no owner or review date" tone={(g.missing_provenance as number) > 0 ? 'warn' : 'good'} />
            <Tile value="—" label="reference checks not measured here" tone="neutral" />
          </div>
          <p className="ah-read">
            <strong>Live provider.</strong> {p.name} on <strong>{p.model}</strong>, resolved from the{' '}
            {p.model_source} configuration. Last validated <strong>{p.last_validated_at}</strong> on commit{' '}
            <code>{p.last_validated_commit}</code>, with {p.contract_assumptions} wire-contract assumptions
            recorded individually against the code that depends on each. A credential is{' '}
            {p.credential_configured ? 'configured' : 'not configured in this environment'}.
          </p>
          {p.findings.length > 0 ? (
            <ul className="ah-list">
              {p.findings.map((f, i) => (
                <li key={i}><span className={`ah-sev ah-sev--${f.severity}`}>{f.severity}</span> {f.detail}</li>
              ))}
            </ul>
          ) : (
            <p className="ah-read ah-read--good">
              <CheckCircle2 size={13} strokeWidth={2} /> No provider drift: no file the validation depends
              on has moved ahead of the commit it passed on, the verification is within its currency
              window, and the configured model is the one that was actually verified.
            </p>
          )}
          <p className="ah-read">
            <strong>Reference integrity is not measured here.</strong> Whether a record&rsquo;s cited
            paths still exist, and whether they have moved since a human read them, are questions about
            a working tree — and this route serves a built application, not a checkout. Reporting a
            zero it could not earn would be worse than reporting nothing, and reading an absent
            repository as thirty-eight broken citations would be worse still. Run{' '}
            <code>{health.not_measured_here.run}</code> against a checkout, which is also what CI runs.
          </p>
          <div className="ah-gate">
            <span className="ah-gate-head">
              Architectural Storyboard — {sb.gates_met} of {sb.gates_total} retirement conditions met
            </span>
            <p className="ah-read">{sb.disposition}</p>
            <ul className="ah-list">
              {sb.conditions.map(cond => (
                <li key={cond.gate_id}>
                  <span className={`ah-sev ah-sev--${cond.state === 'met' ? 'ok' : 'advisory'}`}>{cond.state.replace('-', ' ')}</span>
                  <strong>{cond.gate_id}</strong> — {cond.condition}
                  {cond.outstanding && <span className="ah-outstanding">{cond.outstanding}</span>}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      {/* ── Developer — the findings themselves ───────────────────────────── */}
      {lens === 'developer' && (
        <>
          <div className="ah-tiles">
            <Tile value={g.blocking as number} label="blocking findings" tone={(g.blocking as number) > 0 ? 'warn' : 'good'} />
            <Tile value={g.advisory as number} label="advisory findings" />
            <Tile value={health.findings.length} label="total findings" />
            <Tile value={c.with_data_sources} label="records with data_sources" tone={c.with_data_sources < c.capabilities ? 'warn' : 'good'} />
          </div>
          <p className="ah-read">
            Generated {new Date(health.generated_at).toISOString().slice(0, 16).replace('T', ' ')}Z from the
            same engine as <code>{health.not_measured_here.run}</code>. Advisory by default;
            <code> --enforce</code> exits non-zero on blocking findings.
          </p>
          <p className="ah-read">
            <strong>Not measured here:</strong> {health.not_measured_here.checks.join(', ')}.{' '}
            {health.not_measured_here.reason}
          </p>
          <div className="ah-findings">
            {health.findings.map((f, i) => (
              <div key={i} className="ah-finding">
                <span className={`ah-sev ah-sev--${f.severity}`}>{f.severity}</span>
                <code className="ah-check">{f.check_id}</code>
                <code className="ah-about">{f.about}</code>
                <span className="ah-detail">{f.detail}</span>
                <span className="ah-remedy">→ {f.remedy}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
