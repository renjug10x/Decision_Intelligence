'use client';

/**
 * Create Your Own Scenario (`SCI-08`)
 * ───────────────────────────────────────────────────────────────────────────────
 * One journey: Create → Review → Confirm → Run → Understand.
 *
 * What this component is NOT, stated because each is a way it could quietly become a second authority:
 *   - not a scenario store — the draft lives in the `SCI-07` domain on the server;
 *   - not a certifier — readiness, coherence and certification are the server's verdicts, rendered;
 *   - not a calculator — every quantity shown in Understand is the authoritative evaluator's, formatted
 *     through the estate's currency formatter and never derived here;
 *   - not an activation path — "Run" uses the same selection path as a curated pack
 *     (`activateScenarioOnServer`, the registry projection, the decision-state refresh; ADR-085);
 *   - not a GenAI authority — suggestions are shown as proposals the author keeps or ignores, the
 *     server refuses any quantity, and the whole journey works with no provider configured.
 *
 * Rendered through a portal to `document.body`, so no ancestor (the navigation drawer included) can
 * constrain it.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X, Sparkles, ShieldCheck, AlertTriangle, Loader2, Download, Upload, Play, CheckCircle2 } from 'lucide-react';
import type { ScenarioDraftInputs, ScenarioDraftIssue, ScenarioDraftProposal } from '@/packages/contracts/src/scenario-draft-model';
import {
  AuthoringRequestError,
  confirmScenarioDraft,
  createScenarioDraft,
  exportScenarioDraft,
  fetchAuthoringOptions,
  fetchEvaluatedDecision,
  importScenarioDraft,
  requestDraftAssistance,
  updateScenarioDraft,
  type AuthoringField,
  type AuthoringOptions,
  type ConfirmedScenario,
  type DraftAssessment,
  type EvaluatedDecision
} from '@/lib/scenario-authoring-client';
import { activateScenarioOnServer } from '@/lib/world-client';
import { projectScenarioFromServer, syncActiveScenario } from '@/lib/scenario-client-registry';
import { getOrCreateSessionId } from '@/lib/journey-client';
import { useDecisionState } from '@/context/DecisionStateContext';
import { useCurrency } from '@/context/CurrencyContext';

type Stage = 'create' | 'review' | 'confirm' | 'confirmed' | 'understand';

const STEPS: { stage: Stage; label: string }[] = [
  { stage: 'create', label: 'Create' },
  { stage: 'review', label: 'Review' },
  { stage: 'confirm', label: 'Confirm' },
  { stage: 'confirmed', label: 'Run' },
  { stage: 'understand', label: 'Understand' }
];

/** Business headings for the contract's field dimensions. */
const DIMENSION_HEADINGS: Record<string, string> = {
  framing: 'The decision',
  scope: 'Where it applies',
  demand: 'Demand',
  calendar: 'Timing',
  commercial_intent: 'Promotion',
  supply: 'Supply',
  inventory: 'Stock position',
  economics: 'Commercial terms',
  qualitative: 'Context'
};
const DIMENSION_ORDER = ['framing', 'scope', 'demand', 'calendar', 'commercial_intent', 'supply', 'inventory', 'economics', 'qualitative'];

/** Narrative fields a person edits here. The rest are structure the product and situation already set. */
const EDITABLE_NARRATIVE = new Set(['scenario_name', 'decision_question', 'business_situation', 'differentiation_statement']);
/** Fields this experience deliberately does not offer (set by the situation, or not a single value). */
const NOT_OFFERED = new Set(['sku_id', 'situation', 'family_rationale', 'qualitative_assumptions', 'demand_movement_drivers', 'observed_history_end_date']);

const humanise = (value: string) => {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};

/**
 * Server messages are evidence and are shown, but a reader does not need the gate's dimension codes or an
 * internal scenario id, so both are removed here. Presentation only: the verdict itself is untouched.
 */
const withoutCode = (message: string) => message
  .replace(/^(C-\d+(\.\d+)?:\s*)+/, '')
  .replace(/SCN-[A-Z0-9-]+/g, 'this scenario');

/** The gate's cascade check ("no earlier dimension failed") restates the others; it tells a reader nothing. */
const CASCADE_ONLY = /No earlier dimension failed/i;

const CERTIFICATION_REFUSAL =
  'This scenario does not pass CogniX certification, so it was not confirmed and nothing was added to your catalogue. '
  + 'Change the inputs below and try again:';

type FormValue = string | string[] | number | undefined;

export default function ScenarioAuthoringStudio({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { refreshState } = useDecisionState();
  const { money } = useCurrency();

  const [mounted, setMounted] = useState(false);
  const [options, setOptions] = useState<AuthoringOptions | null>(null);
  const [stage, setStage] = useState<Stage>('create');
  const [situation, setSituation] = useState('');
  const [skuId, setSkuId] = useState('');
  const [assessment, setAssessment] = useState<DraftAssessment | null>(null);
  const [form, setForm] = useState<Record<string, FormValue>>({});
  const [dirty, setDirty] = useState(false);
  const [description, setDescription] = useState('');
  const [proposals, setProposals] = useState<ScenarioDraftProposal[]>([]);
  const [proposalModel, setProposalModel] = useState<string | undefined>(undefined);
  const [kept, setKept] = useState<ScenarioDraftProposal[]>([]);
  const [confirmedBy, setConfirmedBy] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [confirmed, setConfirmed] = useState<ConfirmedScenario | null>(null);
  const [decision, setDecision] = useState<EvaluatedDecision | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ message: string; issues: ScenarioDraftIssue[] } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => setMounted(true), []);

  const reset = useCallback(() => {
    setStage('create'); setSituation(''); setSkuId(''); setAssessment(null); setForm({}); setDirty(false);
    setDescription(''); setProposals([]); setKept([]); setConfirmedBy(''); setReviewed(false);
    setConfirmed(null); setDecision(null); setProblem(null); setNotice(null);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    reset();
    fetchAuthoringOptions()
      .then(setOptions)
      .catch((e: Error) => setProblem({ message: e.message, issues: [] }));
  }, [isOpen, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, busy, onClose]);

  const fields = useMemo(() => (options?.fields ?? []).filter(f => !NOT_OFFERED.has(f.id)), [options]);
  const fieldLabel = useCallback(
    (id: string) => options?.fields.find(f => f.id === id)?.label ?? humanise(id),
    [options]
  );
  const product = options?.products.find(p => p.sku_id === (assessment?.draft.inputs.sku_id ?? skuId));
  const situationSpec = options?.situations.find(s => s.id === (assessment?.draft.inputs.situation ?? situation));
  const blocking = (assessment?.issues ?? []).filter(i => i.severity === 'ERROR');
  const scenarioName = (assessment?.draft.inputs.scenario_name as string | undefined)
    || confirmed?.scenario.scenario_name
    || 'Your scenario';

  const run = async <T,>(label: string, work: () => Promise<T>): Promise<T | undefined> => {
    setBusy(label); setProblem(null); setNotice(null);
    try {
      return await work();
    } catch (e) {
      const err = e as AuthoringRequestError;
      const issues = (err.issues ?? []).filter(i => !CASCADE_ONLY.test(i.message));
      const certification = issues.some(i => i.field === 'certification');
      setProblem({ message: certification ? CERTIFICATION_REFUSAL : withoutCode(err.message), issues });
      return undefined;
    } finally {
      setBusy(null);
    }
  };

  const adopt = (next: DraftAssessment) => {
    setAssessment(next);
    setForm({ ...(next.draft.inputs as Record<string, FormValue>) });
    setDirty(false);
    setKept([]);
  };

  // ── Create ──────────────────────────────────────────────────────────────────
  const start = () => run('start', async () => {
    const created = await createScenarioDraft(situation, { sku_id: skuId });
    adopt(created);
    setStage('review');
  });

  const openSaved = (file: File) => run('import', async () => {
    const text = await file.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch {
      throw new AuthoringRequestError('This file is not a saved CogniX scenario.', 400);
    }
    const imported = await importScenarioDraft(parsed);
    adopt(imported);
    setSituation(String(imported.draft.inputs.situation ?? ''));
    setSkuId(String(imported.draft.inputs.sku_id ?? ''));
    setStage('review');
  });

  // ── Review ──────────────────────────────────────────────────────────────────
  const setField = (id: string, value: FormValue) => {
    setForm(prev => ({ ...prev, [id]: value }));
    setDirty(true);
  };

  /** Only what the author has set is sent; an empty box means "use CogniX's declared assumption". */
  const inputsFromForm = (): ScenarioDraftInputs => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      const v = form[f.id];
      if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
      if (f.kind === 'QUANTITY') {
        const n = typeof v === 'number' ? v : Number(v);
        if (Number.isFinite(n)) out[f.id] = n;
      } else {
        out[f.id] = v;
      }
    }
    return out as ScenarioDraftInputs;
  };

  const save = () => run('save', async () => {
    if (!assessment) return;
    const next = await updateScenarioDraft(assessment.draft.draft_id, inputsFromForm(), kept, kept.length ? proposalModel : undefined);
    adopt(next);
    setProposals(prev => prev.filter(p => !kept.some(k => k.field === p.field)));
  });

  const suggest = () => run('assist', async () => {
    if (!assessment) return;
    const result = await requestDraftAssistance(assessment.draft.draft_id, description);
    setProposals(result.envelope.proposals);
    setProposalModel(result.envelope.model);
    setNotice(result.next_step);
  });

  const keepProposal = (p: ScenarioDraftProposal) => {
    setField(p.field as string, p.field === 'channels' ? p.value.split(',').map(v => v.trim()).filter(Boolean) : p.value);
    setKept(prev => [...prev.filter(k => k.field !== p.field), p]);
  };
  const ignoreProposal = (p: ScenarioDraftProposal) => setProposals(prev => prev.filter(x => x !== p));

  const saveCopy = () => run('export', async () => {
    if (!assessment) return;
    const file = await exportScenarioDraft(assessment.draft.draft_id);
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cognix-scenario-${scenarioName.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'draft'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setNotice('A copy of your inputs was saved. CogniX recalculates every figure from them when the file is opened again.');
  });

  // ── Confirm ─────────────────────────────────────────────────────────────────
  const confirm = () => run('confirm', async () => {
    if (!assessment) return;
    const result = await confirmScenarioDraft(assessment.draft.draft_id, confirmedBy.trim(), assessment.draft.content_hash);
    setConfirmed(result);
    setStage('confirmed');
  });

  // ── Run: the same selection path a curated scenario takes ───────────────────
  const runScenario = () => run('run', async () => {
    if (!confirmed) return;
    const id = confirmed.scenario.scenario_id;
    const activation = await activateScenarioOnServer(id, getOrCreateSessionId());
    if (!activation.success) throw new AuthoringRequestError(activation.error || 'CogniX could not run this scenario.', 422);
    await projectScenarioFromServer(id);
    syncActiveScenario(id);
    await refreshState();
    setDecision(await fetchEvaluatedDecision(id));
    setStage('understand');
  });

  if (!isOpen || !mounted) return null;

  const stageIndex = STEPS.findIndex(s => s.stage === stage);

  const body = (
    <div className="sci08-overlay" role="presentation" onClick={() => { if (!busy) onClose(); }}>
      <div
        className="sci08-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sci08-title"
        onClick={e => e.stopPropagation()}
      >
        <header className="sci08-header">
          <div>
            <div className="sci08-eyebrow">CogniX Scenario Laboratory</div>
            <h2 id="sci08-title" className="sci08-title">Create your own scenario</h2>
          </div>
          <button type="button" className="sci08-icon-button" aria-label="Close" onClick={onClose} disabled={!!busy}>
            <X size={16} />
          </button>
        </header>

        <ol className="sci08-steps" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s.stage} className={i === stageIndex ? 'is-current' : i < stageIndex ? 'is-done' : ''}>
              <span className="sci08-step-dot">{i < stageIndex ? <CheckCircle2 size={12} /> : i + 1}</span>
              {s.label}
            </li>
          ))}
        </ol>

        <div className="sci08-body">
          {problem && (
            <div className="sci08-alert is-error" role="alert">
              <AlertTriangle size={14} />
              <div>
                <div className="sci08-alert-title">{problem.message}</div>
                {problem.issues.length > 0 && (
                  <ul>{problem.issues.map((i, n) => <li key={n}>{withoutCode(i.message)}</li>)}</ul>
                )}
              </div>
            </div>
          )}
          {notice && <div className="sci08-alert is-info">{notice}</div>}

          {!options && !problem && <div className="sci08-muted"><Loader2 size={14} className="spin" /> Loading…</div>}

          {options && stage === 'create' && (
            <section>
              <h3 className="sci08-section-title">What decision are you facing?</h3>
              <div className="sci08-choice-grid" role="radiogroup" aria-label="Situation">
                {options.situations.map(s => (
                  <button
                    type="button"
                    key={s.id}
                    role="radio"
                    aria-checked={situation === s.id}
                    className={`sci08-choice ${situation === s.id ? 'is-selected' : ''}`}
                    onClick={() => setSituation(s.id)}
                  >
                    <span className="sci08-choice-title">{s.label}</span>
                    <span className="sci08-choice-text">{s.decision_shape}</span>
                  </button>
                ))}
              </div>
              <details className="sci08-details">
                <summary>Situations CogniX does not model yet</summary>
                <ul>{options.situations_not_supported.map(s => <li key={s.label}><strong>{s.label}</strong> — {s.reason}</li>)}</ul>
              </details>

              <label className="sci08-label" htmlFor="sci08-product">Which product?</label>
              <select id="sci08-product" className="sci08-input" value={skuId} onChange={e => setSkuId(e.target.value)}>
                <option value="">Choose a product…</option>
                {[...new Set(options.products.map(p => p.category))].map(category => (
                  <optgroup key={category} label={category}>
                    {options.products.filter(p => p.category === category).map(p => (
                      <option key={p.sku_id} value={p.sku_id}>{p.sku_name} — {p.supplier_name}</option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className="sci08-actions">
                <label className="sci08-button is-secondary">
                  <Upload size={13} /> Open a saved scenario
                  <input
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={e => { const f = e.target.files?.[0]; if (f) void openSaved(f); e.target.value = ''; }}
                  />
                </label>
                <button type="button" className="sci08-button" disabled={!situation || !skuId || !!busy} onClick={() => void start()}>
                  {busy === 'start' ? <Loader2 size={13} className="spin" /> : null} Start
                </button>
              </div>
            </section>
          )}

          {options && assessment && stage === 'review' && (
            <div className="sci08-review">
              <section className="sci08-review-main">
                <p className="sci08-summary">
                  <strong>{product?.sku_name}</strong> · {situationSpec?.label}
                </p>

                <div className="sci08-assist">
                  <div className="sci08-assist-head"><Sparkles size={14} /> Describe it in your own words</div>
                  <textarea
                    className="sci08-input"
                    rows={3}
                    maxLength={1200}
                    placeholder="For example: we cut cheddar by a fifth nationally and demand is running hot."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                  />
                  {options.genai_drafting_available ? (
                    <div className="sci08-actions is-left">
                      <button type="button" className="sci08-button is-secondary" disabled={!description.trim() || !!busy} onClick={() => void suggest()}>
                        {busy === 'assist' ? <Loader2 size={13} className="spin" /> : <Sparkles size={13} />} Suggest a structure
                      </button>
                      <span className="sci08-muted">AI can suggest structure and wording only. It never sets a figure, and nothing changes until you keep it.</span>
                    </div>
                  ) : (
                    <p className="sci08-muted">AI suggestions are not available here. Everything below works without them.</p>
                  )}
                  {proposals.length > 0 && (
                    <ul className="sci08-proposals" aria-label="Suggestions">
                      {proposals.map(p => (
                        <li key={`${p.field}:${p.value}`}>
                          <div>
                            <span className="sci08-tag is-ai">Suggested by AI</span>
                            <strong>{fieldLabel(p.field as string)}:</strong> {humanise(p.value)}
                            <div className="sci08-muted">{p.rationale}</div>
                          </div>
                          <div className="sci08-proposal-actions">
                            <button type="button" className="sci08-button is-small" onClick={() => keepProposal(p)}>Use</button>
                            <button type="button" className="sci08-button is-small is-secondary" onClick={() => ignoreProposal(p)}>Ignore</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {DIMENSION_ORDER.map(dimension => {
                  const dimFields = fields.filter(f => f.dimension === dimension && f.kind !== 'QUANTITY'
                    && (f.kind !== 'NARRATIVE' || EDITABLE_NARRATIVE.has(f.id)));
                  if (dimFields.length === 0) return null;
                  return (
                    <fieldset key={dimension} className="sci08-fieldset">
                      <legend>{DIMENSION_HEADINGS[dimension] ?? humanise(dimension)}</legend>
                      <div className="sci08-field-grid">
                        {dimFields.map(f => (
                          <FieldInput
                            key={f.id}
                            field={f}
                            value={form[f.id]}
                            proposed={kept.some(k => k.field === f.id)
                              || assessment.field_provenance.some(p => p.field === f.id && !!p.drafted_by_model)}
                            onChange={v => setField(f.id, v)}
                          />
                        ))}
                      </div>
                    </fieldset>
                  );
                })}

                <details className="sci08-details">
                  <summary>Your own figures (optional)</summary>
                  <p className="sci08-muted">
                    Leave a box empty and CogniX uses a declared assumption for it, shown as “modelled” in readiness.
                    Anything you enter is treated as stated by you.
                  </p>
                  <div className="sci08-field-grid">
                    {fields.filter(f => f.kind === 'QUANTITY').map(f => (
                      <FieldInput key={f.id} field={f} value={form[f.id]} proposed={false} onChange={v => setField(f.id, v)} />
                    ))}
                  </div>
                </details>

                <div className="sci08-actions">
                  <button type="button" className="sci08-button is-secondary" disabled={!!busy || dirty} onClick={() => void saveCopy()}>
                    <Download size={13} /> Save a copy
                  </button>
                  <button type="button" className="sci08-button is-secondary" disabled={!dirty || !!busy} onClick={() => void save()}>
                    {busy === 'save' ? <Loader2 size={13} className="spin" /> : null} Update assessment
                  </button>
                  <button
                    type="button"
                    className="sci08-button"
                    disabled={dirty || !!busy || !assessment.resolves || blocking.length > 0}
                    onClick={() => { setProblem(null); setNotice(null); setStage('confirm'); }}
                  >
                    Review and confirm
                  </button>
                </div>
                {dirty && <p className="sci08-muted">You have changes. Update the assessment to see what they mean before confirming.</p>}
              </section>

              <aside className="sci08-review-side" aria-label="Readiness">
                <h3 className="sci08-section-title">What CogniX can answer</h3>
                <ul className="sci08-readiness">
                  {assessment.readiness.map(r => (
                    <li key={r.capability}>
                      <div className="sci08-readiness-head">
                        <span>{r.label}</span>
                        <span className={`sci08-state is-${r.state.toLowerCase()}`}>{r.state}</span>
                      </div>
                      <div className="sci08-muted">{r.reason}</div>
                    </li>
                  ))}
                </ul>
                {assessment.issues.length > 0 && (
                  <ul className="sci08-issues">
                    {assessment.issues.map((i, n) => (
                      <li key={n} className={i.severity === 'ERROR' ? 'is-error' : 'is-warning'}>{withoutCode(i.message)}</li>
                    ))}
                  </ul>
                )}
                <h3 className="sci08-section-title">Where the numbers come from</h3>
                <p className="sci08-muted">{assessment.provenance_statement}</p>
              </aside>
            </div>
          )}

          {assessment && stage === 'confirm' && (
            <section className="sci08-confirm">
              <h3 className="sci08-section-title">Confirm “{scenarioName}”</h3>
              <dl className="sci08-facts">
                <div><dt>Product</dt><dd>{product?.sku_name} — {product?.supplier_name}</dd></div>
                <div><dt>Situation</dt><dd>{situationSpec?.label}</dd></div>
                {assessment.draft.inputs.decision_question && (
                  <div><dt>Decision question</dt><dd>{String(assessment.draft.inputs.decision_question)}</dd></div>
                )}
              </dl>
              <p className="sci08-muted">{assessment.provenance_statement}</p>
              <p className="sci08-muted">
                Confirming asks CogniX to build this scenario from your inputs and certify it. Only a scenario that passes
                certification is added to your catalogue. Confirming does not change what CogniX is running.
              </p>
              <label className="sci08-label" htmlFor="sci08-confirmed-by">Your name</label>
              <input
                id="sci08-confirmed-by"
                className="sci08-input"
                maxLength={120}
                value={confirmedBy}
                onChange={e => setConfirmedBy(e.target.value)}
                placeholder="The person accountable for this scenario"
              />
              <label className="sci08-check">
                <input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />
                I have reviewed these inputs. I understand CogniX calculates every figure, and AI calculates none of them.
              </label>
              <div className="sci08-actions">
                <button type="button" className="sci08-button is-secondary" disabled={!!busy} onClick={() => { setProblem(null); setStage('review'); }}>
                  Back to review
                </button>
                <button type="button" className="sci08-button" disabled={!confirmedBy.trim() || !reviewed || !!busy} onClick={() => void confirm()}>
                  {busy === 'confirm' ? <Loader2 size={13} className="spin" /> : <ShieldCheck size={13} />} Confirm and certify
                </button>
              </div>
            </section>
          )}

          {confirmed && stage === 'confirmed' && (
            <section className="sci08-confirm">
              <div className="sci08-alert is-success">
                <ShieldCheck size={16} />
                <div>
                  <div className="sci08-alert-title">“{confirmed.scenario.scenario_name}” is certified and in your scenario catalogue.</div>
                  <div>{confirmed.certification_summary.split(confirmed.scenario.scenario_id).join(`“${confirmed.scenario.scenario_name}”`)}</div>
                </div>
              </div>
              <p className="sci08-muted">
                It does not change what CogniX is running until you choose to run it. You can also run it later from
                <em> Change scenario</em>.
              </p>
              <div className="sci08-actions">
                <button type="button" className="sci08-button is-secondary" disabled={!!busy} onClick={onClose}>Keep the current scenario</button>
                <button type="button" className="sci08-button" disabled={!!busy} onClick={() => void runScenario()}>
                  {busy === 'run' ? <Loader2 size={13} className="spin" /> : <Play size={13} />} Run this scenario
                </button>
              </div>
            </section>
          )}

          {confirmed && decision && stage === 'understand' && (
            <section className="sci08-understand">
              <h3 className="sci08-section-title">Now running: {confirmed.scenario.scenario_name}</h3>
              <div className="sci08-metrics">
                <Metric label="Expected demand" value={`${decision.expectedDemand.toLocaleString('en-GB')} units`}
                  note={`${decision.servableDemand.toLocaleString('en-GB')} units can be served`} />
                <Metric label="Decision Gap" value={`${decision.exposedGap.toLocaleString('en-GB')} units`}
                  note={`${decision.gapPct}% of base demand is exposed`} />
                <Metric label="Revenue at risk" value={money(decision.revenueExposureGbp)} />
                <Metric label="Margin at risk" value={money(decision.marginExposureGbp)} />
                <Metric label="Promotion depth" value={`${decision.recommendedDepth}% recommended`}
                  note={`${decision.committedDepth}% committed`} />
                <Metric label="Decision Window" value={`${decision.windowRemainingHours} hours`} note={humanise(decision.windowState)} />
              </div>
              <p className="sci08-muted">
                Every figure is calculated by CogniX engines from your confirmed inputs — the same engines that run the
                curated scenarios. AI produced none of them. Demand &amp; Forecast, Promotion, Campaign Decision and the
                Architecture view now show this scenario.
              </p>
              <div className="sci08-actions">
                <button type="button" className="sci08-button" onClick={onClose}>Done</button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="sci08-metric">
      <div className="sci08-metric-label">{label}</div>
      <div className="sci08-metric-value">{value}</div>
      {note && <div className="sci08-muted">{note}</div>}
    </div>
  );
}

function FieldInput({ field, value, proposed, onChange }: {
  field: AuthoringField;
  value: FormValue;
  proposed: boolean;
  onChange: (value: FormValue) => void;
}): ReactNode {
  const id = `sci08-field-${field.id}`;
  const tag = proposed ? <span className="sci08-tag is-ai">AI-proposed, kept by you</span> : null;

  if (field.id === 'channels' && field.allowed_values) {
    const current = Array.isArray(value) ? value : [];
    return (
      <div className="sci08-field">
        <span className="sci08-label">{field.label} {tag}</span>
        <div className="sci08-checks">
          {field.allowed_values.map(v => (
            <label key={v} className="sci08-check">
              <input
                type="checkbox"
                checked={current.includes(v)}
                onChange={e => onChange(e.target.checked ? [...current, v] : current.filter(x => x !== v))}
              />
              {v}
            </label>
          ))}
        </div>
      </div>
    );
  }

  if (field.allowed_values) {
    return (
      <div className="sci08-field">
        <label className="sci08-label" htmlFor={id}>{field.label} {tag}</label>
        <select id={id} className="sci08-input" value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value || undefined)}>
          <option value="">CogniX assumption</option>
          {field.allowed_values.map(v => <option key={v} value={v}>{humanise(v)}</option>)}
        </select>
      </div>
    );
  }

  if (field.kind === 'QUANTITY') {
    return (
      <div className="sci08-field">
        <label className="sci08-label" htmlFor={id}>{field.label}{field.unit ? ` (${field.unit})` : ''}</label>
        <input
          id={id}
          className="sci08-input"
          type="number"
          inputMode="decimal"
          placeholder="CogniX assumption"
          value={value === undefined ? '' : String(value)}
          onChange={e => onChange(e.target.value === '' ? undefined : e.target.value)}
        />
      </div>
    );
  }

  const long = field.id === 'business_situation' || field.id === 'differentiation_statement' || field.id === 'decision_question';
  return (
    <div className={`sci08-field ${long ? 'is-wide' : ''}`}>
      <label className="sci08-label" htmlFor={id}>{field.label} {tag}</label>
      {long ? (
        <textarea id={id} className="sci08-input" rows={2} maxLength={600} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />
      ) : (
        <input id={id} className="sci08-input" maxLength={160} value={typeof value === 'string' ? value : ''} onChange={e => onChange(e.target.value)} />
      )}
    </div>
  );
}
