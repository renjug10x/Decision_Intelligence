'use client';

/**
 * Capability detail — progressive disclosure over one governed record.
 *
 * Above the fold answers four questions and nothing else: what problem does this solve, why does
 * it matter, can I demonstrate it, can I reuse it elsewhere. Everything deeper is one interaction
 * away and closed by default. Two levels of disclosure, no nested accordions.
 *
 * The active lens reorders and emphasises. It never changes what is stored, never fetches a
 * different record, and never hides the name, summary, the three maturity dimensions or the
 * limitations — a Sales lens must not conceal that a capability is simulated.
 */

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, ArrowLeft, Repeat, ExternalLink } from 'lucide-react';
import MaturityTriad from './MaturityTriad';
import CapabilityVisual from './visuals/CapabilityVisual';
import { fetchQuestions } from '@/lib/atlas-client';
import type { CuriosityQuestion } from '@/packages/contracts/src/capability-atlas-model';
import type { ResolvedCapability, AudienceLens } from '@/packages/contracts/src/capability-atlas-model';

/** Which sections each lens brings forward. Presentation priority only. */
const LENS_PRIORITY: Record<AudienceLens, string[]> = {
  'innovation-executive': ['thesis', 'curiosity', 'reuse', 'evidence', 'limitations', 'relationships'],
  'sales': ['demo', 'usecases', 'curiosity', 'questions', 'limitations', 'relationships'],
  'architect': ['architecture', 'contracts', 'relationships', 'decisions', 'limitations'],
  'developer': ['implementation', 'testing', 'contracts', 'limitations', 'usage']
};

const LENS_NAME: Record<AudienceLens, string> = {
  'innovation-executive': 'Innovation Executive',
  'sales': 'Sales',
  'architect': 'Architect',
  'developer': 'Developer'
};

/**
 * Clamp on a word boundary. The first sentence of an innovation thesis is often the problem
 * setup rather than the point, so a sentence split reads as a non sequitur in a four-word answer.
 */
function clamp(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

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
  problemLabel
}: {
  capability: ResolvedCapability;
  lens: AudienceLens | null;
  onBack: () => void;
  onOpenCapability: (id: string) => void;
  /** Governed display label for a `bp-*` identifier. Falls back to the identifier when absent. */
  problemLabel?: (id: string) => string;
}) {
  const { identity, knowledge, relationships, demo_maturity } = capability;
  const priority = lens ? LENS_PRIORITY[lens] ?? [] : [];

  // Questions Worth Asking are governed objects with EXPLICIT capability links. They are fetched,
  // never derived here from a shared solution or experiment (owner decision, 2026-08-20).
  const [questions, setQuestions] = useState<CuriosityQuestion[]>([]);
  useEffect(() => {
    fetchQuestions(identity.capability_id).then(setQuestions).catch(() => setQuestions([]));
  }, [identity.capability_id]);

  const demoReady = demo_maturity !== null && (knowledge?.demo_scenarios.length ?? 0) > 0;
  const notFullyReal = identity.implementation_status !== 'implemented';
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
        <ul className="atlas-list">
          {knowledge.implementation_references.map((r, i) => (
            <li key={i}>
              <span className="atlas-mono">{r.path}</span>
              {r.symbol && <> · <span className="atlas-mono">{r.symbol}</span></>}
              {r.note && <> — {r.note}</>}
            </li>
          ))}
        </ul>
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

  const ordered = [
    ...priority.map(id => sections.find(s => s.id === id)).filter((s): s is SectionSpec => Boolean(s)),
    ...sections.filter(s => !priority.includes(s.id))
  ];

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

      {/* The four questions, answered before any disclosure */}
      <div className="atlas-fourup">
        <div className="atlas-q">
          <p className="atlas-q-label">What problem does this solve?</p>
          <div className={identity.business_problems.length ? 'atlas-q-answer' : 'atlas-q-answer atlas-q-answer--muted'}>
            {identity.business_problems.length
              ? identity.business_problems.map(b => (problemLabel ? problemLabel(b) : b.replace(/^bp-/, '').replace(/-/g, ' '))).join(', ')
              : 'no business problem recorded'}
          </div>
        </div>
        <div className="atlas-q">
          <p className="atlas-q-label">Why does it matter?</p>
          <div className={knowledge?.innovation_thesis ? 'atlas-q-answer' : 'atlas-q-answer atlas-q-answer--muted'}>
            {knowledge?.innovation_thesis
              ? clamp(knowledge.innovation_thesis, 170)
              : 'no innovation thesis recorded'}
          </div>
        </div>
        <div className="atlas-q">
          <p className="atlas-q-label">Can I demonstrate it?</p>
          <div className={demoReady ? 'atlas-q-answer' : 'atlas-q-answer atlas-q-answer--muted'}>
            {demoReady
              ? `Yes — ${knowledge!.demo_scenarios.map(d => `${d.duration_mins} min`).join(', ')}${notFullyReal ? '. Warnings apply.' : ''}`
              : (knowledge?.demo_scenarios.length
                  ? `Demo path exists, but no solution surface carries it${notFullyReal ? '. Warnings apply.' : ''}`
                  : 'No demo path recorded')}
          </div>
        </div>
        <div className="atlas-q">
          <p className="atlas-q-label">Can I reuse it elsewhere?</p>
          <div className={identity.platform_reusable ? 'atlas-q-answer' : 'atlas-q-answer atlas-q-answer--muted'}>
            {identity.platform_reusable
              ? `Yes — ${reuseDomains.length} domain${reuseDomains.length === 1 ? '' : 's'} assessed`
              : 'Not classified as reusable'}
          </div>
        </div>
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

      {lens && (
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '10px 0 18px' }}>
          Ordered for the <strong style={{ color: 'var(--text-secondary)' }}>{LENS_NAME[lens]}</strong> lens.
          Nothing is hidden — every section below is available under any lens.
        </p>
      )}

      <div style={{ marginTop: lens ? 0 : 22 }}>
        {ordered.map((s, i) => (
          <Section key={s.id} spec={s} prioritised={priority.includes(s.id)} defaultOpen={i === 0} />
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
                  <span key={s.id} className="atlas-origin">
                    demonstrated by <strong>{s.name}</strong> ({s.demo_maturity})
                  </span>
                ))}
                {relationships.experiments.map(e => (
                  <span key={e.id} className="atlas-origin">originated as <strong>{e.name}</strong> ({e.maturity})</span>
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

      <div className="atlas-future">
        <ExternalLink size={15} strokeWidth={1.75} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <span className="atlas-future-text">
          <strong style={{ color: 'var(--text-secondary)' }}>Prepare me for a client conversation</strong> — an
          evidence-grounded preparation pack combining this capability with market research. Planned for ATL-06D;
          not yet available, and deliberately not simulated here.
        </span>
      </div>
    </div>
  );
}
