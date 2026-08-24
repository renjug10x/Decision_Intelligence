'use client';

/**
 * Capability detail — progressive disclosure over one governed record.
 *
 * Above the fold answers four questions and nothing else: what problem does this solve, why does
 * it matter, can I demonstrate it, can I reuse it elsewhere. Everything deeper is one interaction
 * away and closed by default. Two levels of disclosure, no nested accordions.
 *
 * ── The lens, corrected (ATL-06D, ADR-064) ─────────────────────────────────
 * `ATL-04R` shipped the lens as a reordering of the sections below plus a note reading "ordering
 * only". Owner evaluation found the honest consequence: selecting Developer changed which sections
 * were listed first and nothing a reader could use. That is defect `D-ATL-04R-1`.
 *
 * The lens now decides THE FOUR QUESTIONS ANSWERED ABOVE THE FOLD, which sections lead, which one
 * is open on arrival, and how much supplementary evidence detail is rendered inline. All four
 * question sets are readings of the SAME governed fields, resolved by `lib/atlas/lens.ts`, so a
 * Developer and an executive are shown different questions about one unchanged record.
 *
 * `ADR-045` survives unamended: the lens reorders and never hides. Every section is present under
 * every lens, the name, summary, three maturity dimensions and limitations are never suppressed,
 * and a Sales lens must not conceal that a capability is simulated — which is why "What must I not
 * claim?" is one of the four questions Sales is asked first rather than something it can scroll past.
 */

import { Fragment, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft, Repeat, ExternalLink, ArrowUpRight } from 'lucide-react';
import MaturityTriad from './MaturityTriad';
import CapabilityVisual from './visuals/CapabilityVisual';
import { fetchQuestions } from '@/lib/atlas-client';
import type { CuriosityQuestion } from '@/packages/contracts/src/capability-atlas-model';
import type { ResolvedCapability, AudienceLens } from '@/packages/contracts/src/capability-atlas-model';
import { lensProfile, resolveHeadlines, LENS_NAME } from '@/lib/atlas/lens';


/**
 * Clamp on a word boundary. The first sentence of an innovation thesis is often the problem
 * setup rather than the point, so a sentence split reads as a non sequitur in a four-word answer.
 */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

/**
 * Shown where a lens reads evidence at `referenced` depth. It NAMES the deeper view rather than
 * quietly withholding it: a reader who wants symbols, observers and observation dates is told
 * exactly which lens renders them. Signposting is not hiding, and the distinction is the whole of
 * ADR-045 — an executive is not shown a repository symbol first, and is never prevented from
 * seeing one (ATL-06D §25, §32).
 */
const DEPTH_NOTE =
  'Symbols, observation dates and observers are rendered inline under the Architect and Developer lenses.';

interface SectionSpec { id: string; title: string; meta?: string; render: () => React.ReactNode; }

function Section({ spec, prioritised, defaultOpen }: { spec: SectionSpec; prioritised: boolean; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={`atlas-section${prioritised ? ' atlas-priority' : ''}`}>
      <button type="button" className="atlas-section-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="atlas-section-title">{spec.title}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {spec.meta && <span className="atlas-section-meta">{spec.meta}</span>}
          {open
            ? <ChevronDown size={15} strokeWidth={1.75} color="var(--text-muted)" />
            : <ChevronRight size={15} strokeWidth={1.75} color="var(--text-muted)" />}
        </span>
      </button>
      {open && <div className="atlas-section-body">{spec.render()}</div>}
    </div>
  );
}

export default function CapabilityDetail({
  capability,
  lens,
  onBack,
  onOpenCapability,
  problemLabel,
  onPrepare,
  onOpenSolution,
  onOpenExperiment
}: {
  capability: ResolvedCapability;
  lens: AudienceLens | null;
  onBack: () => void;
  onOpenCapability: (id: string) => void;
  /** Governed display label for a `bp-*` identifier. Falls back to the identifier when absent. */
  problemLabel?: (id: string) => string;
  /** Opens the ATL-06D preparation workspace seeded with this capability. */
  onPrepare?: (seed: string) => void;
  /*
   * ATL-FINAL. The record named the solution that demonstrates the capability and then left the
   * reader with nowhere to go: the only route into a demonstration surface was through Questions
   * Worth Asking, which is why six records still carried the pre-ATL-04R instruction "open it from
   * the Innovation Portfolio". A capability record that can say what demonstrates it and cannot
   * open it reads as documentation about the product rather than as part of it.
   *
   * Both handlers are optional, and a registry entry with no surface behind it stays a plain label
   * rather than becoming a button that goes nowhere.
   */
  onOpenSolution?: (solutionId: string) => void;
  onOpenExperiment?: (experimentId: string) => void;
}) {
  const { identity, knowledge, relationships, demo_maturity } = capability;

  // The lens decides the questions, the lead sections and the disclosure state. It decides nothing
  // about what the record contains — every section below is built before the lens is consulted.
  const profile = lensProfile(lens);
  const priority = profile?.lead_sections ?? [];
  const headlines = resolveHeadlines(capability, lens);
  const detailedEvidence = profile?.evidence_depth === 'detailed';

  // Questions Worth Asking are governed objects with EXPLICIT capability links. They are fetched,
  // never derived here from a shared solution or experiment (owner decision, 2026-08-20).
  const [questions, setQuestions] = useState<CuriosityQuestion[]>([]);
  useEffect(() => {
    fetchQuestions(identity.capability_id).then(setQuestions).catch(() => setQuestions([]));
  }, [identity.capability_id]);

  const reuseDomains = knowledge?.cross_domain_applicability.filter(a => a.applicability !== 'not-assessed') ?? [];

  const sections: SectionSpec[] = [];

  if (knowledge?.innovation_thesis) {
    sections.push({
      id: 'thesis', title: 'Why this exists',
      render: () => <p>{knowledge.innovation_thesis}</p>
    });
  }
  if (knowledge?.description) {
    sections.push({
      id: 'description', title: 'What it is',
      render: () => <p>{knowledge.description}</p>
    });
  }
  if (knowledge?.use_cases.length) {
    sections.push({
      id: 'usecases', title: 'Where it applies', meta: `${knowledge.use_cases.length}`,
      render: () => (
        <ul className="atlas-list">
          {knowledge.use_cases.map((u, i) => (
            <li key={i}>
              <strong style={{ color: 'var(--text-primary)' }}>{u.title}</strong> — {u.context} <em>{u.outcome}</em>
            </li>
          ))}
        </ul>
      )
    });
  }
  if (knowledge?.demo_scenarios.length) {
    sections.push({
      id: 'demo', title: 'How to demonstrate it',
      meta: knowledge.demo_scenarios.map(d => `${d.duration_mins} min`).join(' · '),
      render: () => (
        <>
          {knowledge.demo_scenarios.map((d, i) => (
            <div key={i} style={{ marginBottom: 18 }}>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>{d.title}</p>
              {d.warnings.length > 0 && (
                <div className="atlas-warn">
                  <div className="atlas-warn-title">Before you show this</div>
                  {d.warnings.map((w, j) => <p key={j}>{w}</p>)}
                </div>
              )}
              <ul className="atlas-list">
                {d.steps.map((s, j) => (
                  <li key={j}>
                    <strong style={{ color: 'var(--text-primary)' }}>{s.action}</strong>
                    <br />“{s.what_to_say}”
                    <br /><span style={{ color: 'var(--text-muted)' }}>Look for: {s.expected_observation}</span>
                  </li>
                ))}
              </ul>
              {d.prerequisites.length > 0 && (
                <p style={{ marginTop: 10, fontSize: '0.75rem' }}>
                  Prerequisites: {d.prerequisites.join('; ')}
                </p>
              )}
            </div>
          ))}
        </>
      )
    });
  }
  if (knowledge?.usage_instructions) {
    sections.push({ id: 'usage', title: 'How to use it', render: () => <p>{knowledge.usage_instructions}</p> });
  }
  if (knowledge?.architecture_narrative || knowledge?.architecture_flow.length) {
    sections.push({
      id: 'architecture', title: 'How it works',
      render: () => (
        <>
          {knowledge!.architecture_narrative && <p>{knowledge!.architecture_narrative}</p>}
          {knowledge!.architecture_flow.length > 0 && (
            <div className="atlas-flow">
              {knowledge!.architecture_flow.map((step, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span className="atlas-flow-step">{step}</span>
                  {i < knowledge!.architecture_flow.length - 1 && <span className="atlas-flow-arrow">→</span>}
                </span>
              ))}
            </div>
          )}
        </>
      )
    });
  }
  if (knowledge?.apis.length || knowledge?.contracts.length) {
    sections.push({
      id: 'contracts', title: 'Services and contracts',
      meta: `${knowledge!.apis.length} API · ${knowledge!.contracts.length} contract`,
      render: () => (
        <ul className="atlas-list">
          {knowledge!.apis.map((a, i) => (
            <li key={`a${i}`}><span className="atlas-mono">{a.method} {a.path}</span> — {a.purpose}</li>
          ))}
          {knowledge!.contracts.map((c, i) => (
            <li key={`c${i}`}><strong>{c.name}</strong> <span className="atlas-mono">{c.path}</span> ({c.direction})</li>
          ))}
        </ul>
      )
    });
  }
  if (knowledge?.implementation_references.length) {
    sections.push({
      id: 'implementation', title: 'Where it is implemented',
      meta: `${knowledge.implementation_references.length} references`,
      render: () => (
        <>
          <ul className="atlas-list">
            {knowledge.implementation_references.map((r, i) => (
              <li key={i}>
                <span className="atlas-mono">{r.path}</span>
                {detailedEvidence && r.symbol && <> · <span className="atlas-mono">{r.symbol}</span></>}
                {detailedEvidence && r.note && <> — {r.note}</>}
              </li>
            ))}
          </ul>
          {!detailedEvidence && <p className="atlas-depth-note">{DEPTH_NOTE}</p>}
        </>
      )
    });
  }
  if (knowledge?.testing_instructions || knowledge?.test_runners.length) {
    sections.push({
      id: 'testing', title: 'How to verify it',
      meta: knowledge!.test_runners.length ? `${knowledge!.test_runners.length} suites` : 'no suite',
      render: () => (
        <>
          {knowledge!.testing_instructions && <p>{knowledge!.testing_instructions}</p>}
          {knowledge!.test_runners.map((t, i) => <p key={i}><span className="atlas-mono">{t}</span></p>)}
        </>
      )
    });
  }
  if (knowledge?.validation_evidence.length) {
    sections.push({
      id: 'evidence', title: 'What proves it works', meta: `${knowledge.validation_evidence.length}`,
      render: () => (
        <ul className="atlas-list">
          {knowledge.validation_evidence.map((e, i) => (
            <li key={i}>
              <span className="atlas-mono">{e.kind}</span> {e.ref}
              <br /><span style={{ color: 'var(--text-secondary)' }}>{e.outcome}</span>
              {detailedEvidence && (
                <><br /><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {e.observed_at} · {e.observed_by}
                </span></>
              )}
            </li>
          ))}
        </ul>
      )
    });
  }
  if (knowledge?.known_limitations.length) {
    sections.push({
      id: 'limitations', title: 'What it cannot do', meta: `${knowledge.known_limitations.length}`,
      render: () => (
        <ul className="atlas-list">
          {knowledge.known_limitations.map((l, i) => (
            <li key={i}>
              <span className="atlas-dim" style={{ marginRight: 8 }}>{l.severity}</span>{l.limitation}
            </li>
          ))}
        </ul>
      )
    });
  }
  if (knowledge?.cross_domain_applicability.length) {
    sections.push({
      id: 'reuse', title: 'Where else it could apply',
      meta: `${reuseDomains.length} assessed`,
      render: () => (
        <ul className="atlas-list">
          {knowledge.cross_domain_applicability.map((a, i) => (
            <li key={i}>
              <strong style={{ color: 'var(--text-primary)' }}>{a.domain_id.replace(/_/g, ' ')}</strong>
              {' '}<span className="atlas-dim">{a.applicability}</span>
              <br />{a.rationale}
            </li>
          ))}
        </ul>
      )
    });
  }
  if (questions.length) {
    sections.push({
      id: 'curiosity', title: 'Questions worth asking', meta: `${questions.length}`,
      render: () => (
        <ul className="atlas-list">
          {questions.map(q => (
            <li key={q.question_id}>
              <strong style={{ color: 'var(--text-primary)' }}>“{q.question}”</strong>
              <br />{q.why_asking}
              <br /><span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Linked to this capability because: {
                  q.related_capabilities.find(r => r.ref === identity.capability_id)?.rationale
                }
              </span>
            </li>
          ))}
        </ul>
      )
    });
  }
  if (knowledge?.client_questions.length) {
    sections.push({
      id: 'questions', title: 'What a client will ask', meta: `${knowledge.client_questions.length}`,
      render: () => (
        <ul className="atlas-list">
          {knowledge.client_questions.map((q, i) => <li key={i}>“{q.question}”</li>)}
        </ul>
      )
    });
  }
  if (knowledge?.related_decisions.length || knowledge?.related_governance.length) {
    sections.push({
      id: 'decisions', title: 'Governing decisions',
      render: () => (
        <ul className="atlas-list">
          {knowledge!.related_decisions.map((d, i) => <li key={`d${i}`}><span className="atlas-mono">{d}</span></li>)}
          {knowledge!.related_governance.map((g, i) => <li key={`g${i}`}><span className="atlas-mono">{g}</span></li>)}
        </ul>
      )
    });
  }

  // Relationships are always last and always open: discovery is the point.
  const hasRelations =
    (knowledge?.related_capabilities.length ?? 0) > 0 ||
    relationships.solutions.length > 0 || relationships.experiments.length > 0 ||
    relationships.patterns.length > 0 || relationships.work_packages.length > 0;

  /*
    Two groups, and neither is a filter. `lead` is what this lens came for; `rest` is everything
    else on the record, present and reachable under every lens. Grouping is what makes the
    reordering legible — an unlabelled reshuffle is the thing ATL-04R shipped and the reason the
    control read as decorative (D-ATL-04R-1).
  */
  const lead = priority
    .map(id => sections.find(s => s.id === id))
    .filter((s): s is SectionSpec => Boolean(s));
  const rest = sections.filter(s => !lead.includes(s));
  const ordered = [...lead, ...rest];

  return (
    <div className="atlas">
      <button type="button" className="atlas-back" onClick={onBack}>
        <ArrowLeft size={14} strokeWidth={1.75} /> All capabilities
      </button>

      <div className="atlas-detail-head">
        <h1>{identity.name}</h1>
        <p className="atlas-detail-summary">{identity.summary}</p>
        <MaturityTriad
          lifecycle={identity.lifecycle_state}
          demoMaturity={demo_maturity}
          implementation={identity.implementation_status}
        />
      </div>

      {/*
        The four questions, answered before any disclosure — and WHICH four is what the lens
        decides. An executive is asked why this is different and how far it has travelled; a
        developer is asked whether it is actually built and how to verify it. Both are readings of
        the same governed record, resolved by `lib/atlas/lens.ts`, which is why neither can state a
        fact the other cannot see (ADR-064).
      */}
      <div className="atlas-fourup">
        {headlines.map(h => (
          <div className="atlas-q" key={h.id}>
            <p className="atlas-q-label">{h.question}</p>
            <div className={h.answered ? 'atlas-q-answer' : 'atlas-q-answer atlas-q-answer--muted'}>
              {clamp(h.answer, 190)}
            </div>
          </div>
        ))}
      </div>

      {/*
        The explanatory visual sits here — above every disclosed section and immediately after the
        four questions — because its job is comprehension, not decoration. A relationship, a flow or
        a distance is understood faster as structure than as a paragraph, so the reader meets it
        while they are still deciding whether this capability is the one they wanted. It is absent
        on most capabilities, which is correct: a visual is authored only where it explains
        something the prose does not explain better (ADR-063).
      */}
      {knowledge?.visualisation && <CapabilityVisual visual={knowledge.visualisation} />}

      {profile && (
        <p className="atlas-lens-reading">
          Read as <strong>{profile.name}</strong> — {profile.reading_for}.
          <span className="atlas-lens-reading-rule">
            The lens chooses the questions and the order. It never changes a fact: every section is
            present under every lens.
          </span>
        </p>
      )}

      <div style={{ marginTop: profile ? 0 : 22 }}>
        {profile && lead.length > 0 && (
          <div className="atlas-section-group">{profile.orientation}</div>
        )}
        {ordered.map((s, i) => (
          <Fragment key={s.id}>
            {profile && rest.length > 0 && i === lead.length && (
              <div className="atlas-section-group atlas-section-group--rest">
                Everything else on this record, unchanged by the lens
              </div>
            )}
            <Section
              spec={s}
              prioritised={priority.includes(s.id)}
              defaultOpen={profile ? profile.open_on_arrival.includes(s.id) : i === 0}
            />
          </Fragment>
        ))}
      </div>

      {hasRelations && (
        <div style={{ marginTop: 34 }}>
          <div className="atlas-relgroup-label" style={{ marginBottom: 14 }}>Connected capabilities</div>
          <div className="atlas-relations">
            {knowledge && knowledge.related_capabilities.length > 0 && (
              <div className="atlas-relgroup">
                <div className="atlas-relrow">
                  {knowledge.related_capabilities.map((r, i) => (
                    <button
                      key={i}
                      type="button"
                      className="atlas-relnode"
                      onClick={() => onOpenCapability(r.ref)}
                    >
                      <span className="atlas-relverb">{r.relation.replace(/-/g, ' ')}</span>
                      {r.ref.replace('CAP-', '').replace(/-/g, ' ').toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="atlas-relgroup">
              <div className="atlas-relgroup-label">Where it comes from</div>
              <div className="atlas-relrow">
                {relationships.work_packages.map(w => (
                  <span key={w} className="atlas-origin">delivered by <strong>{w}</strong></span>
                ))}
                {relationships.solutions.map(s => (
                  onOpenSolution ? (
                    <button
                      key={s.id}
                      type="button"
                      className="atlas-origin atlas-origin--open"
                      onClick={() => onOpenSolution(s.id)}
                    >
                      demonstrated by <strong>{s.name}</strong> ({s.demo_maturity})
                      <ArrowUpRight size={12} strokeWidth={2} />
                    </button>
                  ) : (
                    <span key={s.id} className="atlas-origin">
                      demonstrated by <strong>{s.name}</strong> ({s.demo_maturity})
                    </span>
                  )
                ))}
                {relationships.experiments.map(e => (
                  onOpenExperiment ? (
                    <button
                      key={e.id}
                      type="button"
                      className="atlas-origin atlas-origin--open"
                      onClick={() => onOpenExperiment(e.id)}
                    >
                      originated as <strong>{e.name}</strong> ({e.maturity})
                      <ArrowUpRight size={12} strokeWidth={2} />
                    </button>
                  ) : (
                    <span key={e.id} className="atlas-origin">originated as <strong>{e.name}</strong> ({e.maturity})</span>
                  )
                ))}
                {relationships.patterns.map(p => (
                  <span key={p.id} className="atlas-origin">evidenced by <strong>{p.title}</strong></span>
                ))}
                {relationships.work_packages.length === 0 && relationships.solutions.length === 0 &&
                 relationships.experiments.length === 0 && relationships.patterns.length === 0 && (
                  <span className="atlas-origin" style={{ fontStyle: 'italic' }}>no registry origin recorded</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/*
        The contextual entry (§35). A reader who has read this far has decided the capability
        matters, which is the moment the preparation workspace is useful — and the reason it is
        here rather than on every card in the landscape.
      */}
      {onPrepare && (
        <button type="button" className="atlas-prep-entry" onClick={() => onPrepare(identity.name)}>
          <ExternalLink size={15} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          <span>
            <strong>Prepare me for a client conversation about this</strong>
            <span className="atlas-prep-entry-hint">
              Builds a pack around {identity.name} and whatever else the conversation needs — with
              its limitations and demonstration warnings carried through.
            </span>
          </span>
        </button>
      )}
    </div>
  );
}
