'use client';

/**
 * Prepare me for a client conversation (ATL-06D) — the preparation workspace.
 *
 * ── Why this is not one generated document ─────────────────────────────────
 * §30 forbids the obvious build: one long AI-written page the user scrolls. That shape fails for a
 * specific reason rather than an aesthetic one — a person preparing for a meeting does not read
 * linearly. They arrive knowing they need the demo sequence, or the objection they are dreading, or
 * the one thing they must not claim. A wall of prose makes all three equally hard to reach and puts
 * the limitations at the bottom, where they will not be read at all.
 *
 * So the pack is EXPLORABLE: named sections, one open at a time, each independently addressable.
 * The two sections that protect the client — Limitations and What not to claim — are counted in
 * their own tabs, so their weight is visible before they are opened.
 *
 * ── Every capability string here comes from the API ────────────────────────
 * This file holds layout, labels and interaction state. It holds no capability knowledge, no
 * warning text and no recommendation reasoning: all of that arrives from `/api/v1/atlas/prepare`
 * already assembled and already validated against the pack integrity rules (ADR-046).
 */

import { useState } from 'react';
import {
  ArrowLeft, Loader2, Search, AlertTriangle, ShieldAlert, ListOrdered,
  MessageCircleQuestion, HelpCircle, Compass, Globe, Sparkles
} from 'lucide-react';
import { preparePack } from '@/lib/atlas-client';
import { LENS_NAME } from '@/lib/atlas/lens';
import type { AudienceLens } from '@/packages/contracts/src/capability-atlas-model';
import type {
  PreparationPack, CapabilityRecommendation, ConversationSequence
} from '@/packages/contracts/src/atlas-preparation-model';

const EXAMPLE_BRIEFS = [
  "I'm meeting the Head of Demand Planning at a UK grocery retailer. They struggle with promotional volatility, stock forecasting and reacting quickly to external demand signals. I have 30 minutes.",
  "I'm meeting an enterprise architect who wants to understand how CogniX integrates with an existing planning platform.",
  "I'm meeting an innovation director who wants to understand what is genuinely different about CogniX.",
  'I have 10 minutes with a demand planning director.'
];

const REFINEMENTS = [
  'Make this more technical.',
  'I only have 15 minutes.',
  'Focus on promotions.',
  'Remove inventory and focus on demand.'
];

type SectionId =
  | 'overview' | 'capabilities' | 'sequence' | 'questions'
  | 'objections' | 'limitations' | 'avoid' | 'market';

export default function ClientPreparation({
  lens,
  onBack,
  onOpenCapability,
  seedBrief
}: {
  lens: AudienceLens | null;
  onBack: () => void;
  onOpenCapability: (id: string) => void;
  seedBrief?: string | null;
}) {
  const [brief, setBrief] = useState(seedBrief ?? '');
  const [research, setResearch] = useState(false);
  const [pack, setPack] = useState<PreparationPack | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [section, setSection] = useState<SectionId>('overview');
  const [refinement, setRefinement] = useState('');

  async function run(input: { brief?: string; refinement?: string; choices?: string[] }) {
    setBusy(true); setError(null);
    try {
      const next = await preparePack({
        ...input,
        lens,
        // Carrying the established context forward is what makes a refinement refine (§31).
        context: pack?.context,
        research
      });
      setPack(next);
      setSection('overview');
      setRefinement('');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  // ── Intake ────────────────────────────────────────────────────────────────
  if (!pack) {
    return (
      <div className="atlas">
        <button type="button" className="atlas-back" onClick={onBack}>
          <ArrowLeft size={14} strokeWidth={1.75} /> Back to the Atlas
        </button>
        <header className="atlas-hero">
          <h1>Prepare me for a client conversation</h1>
          <p>
            Describe the meeting in your own words. CogniX prepares from its governed capability
            records — what is implemented, what can be demonstrated, what must not be claimed — and
            tells you where its own evidence runs out.
          </p>
          <div className="atlas-prep-intake">
            <textarea
              value={brief}
              onChange={e => setBrief(e.target.value)}
              rows={4}
              placeholder="Who are you meeting, what is going wrong for them, and how long do you have?"
              aria-label="Describe the client conversation you are preparing for"
            />
            <div className="atlas-prep-actions">
              <ResearchToggle on={research} onChange={setResearch} />
              <button
                type="button" className="atlas-prep-go"
                disabled={busy || !brief.trim()}
                onClick={() => void run({ brief })}
              >
                {busy ? <Loader2 size={15} className="atlas-spin" /> : <Compass size={15} strokeWidth={1.75} />}
                Prepare
              </button>
            </div>
          </div>
          <div className="atlas-examples">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try:</span>
            {EXAMPLE_BRIEFS.map(b => (
              <button key={b} type="button" className="atlas-example" onClick={() => { setBrief(b); void run({ brief: b }); }}>
                {b.length > 64 ? `${b.slice(0, 61)}…` : b}
              </button>
            ))}
          </div>
          {error && <p className="atlas-prep-error">{error}</p>}
        </header>
      </div>
    );
  }

  // ── Clarification ─────────────────────────────────────────────────────────
  if (pack.state === 'needs-clarification' && pack.clarification) {
    return (
      <div className="atlas">
        <button type="button" className="atlas-back" onClick={() => setPack(null)}>
          <ArrowLeft size={14} strokeWidth={1.75} /> Start again
        </button>
        <header className="atlas-hero">
          <h1>{pack.clarification.question}</h1>
          <p>
            One question, because the brief so far does not say enough to choose capabilities
            honestly. Pick one, or say it in your own words.
          </p>
          <div className="atlas-prep-choices" role="group" aria-live="polite">
            {pack.clarification.choices.map(c => (
              <button
                key={c.choice_id} type="button" className="atlas-prep-choice"
                disabled={busy}
                onClick={() => void run({ choices: [c.value] })}
              >
                {c.label}
              </button>
            ))}
          </div>
          <div className="atlas-searchbar" style={{ marginTop: 14 }}>
            <Search size={18} strokeWidth={1.75} color="var(--text-muted)" />
            <input
              value={refinement}
              onChange={e => setRefinement(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && refinement.trim()) void run({ refinement }); }}
              placeholder="Or tell me more…"
              aria-label="Add more context in your own words"
            />
          </div>
          <ReadSoFar pack={pack} />
        </header>
      </div>
    );
  }

  // ── No relevant capabilities ──────────────────────────────────────────────
  if (pack.state === 'no-relevant-capabilities') {
    return (
      <div className="atlas">
        <button type="button" className="atlas-back" onClick={() => setPack(null)}>
          <ArrowLeft size={14} strokeWidth={1.75} /> Start again
        </button>
        <header className="atlas-hero">
          <h1>Nothing in the registry connects to this conversation</h1>
          <p>
            No capability is recommended, because none of them reaches this brief through a governed
            business problem, domain, objective or matched term. A list assembled on a keyword
            collision would be worse than none.
          </p>
        </header>
        <Interpretation pack={pack} />
        <FollowUps pack={pack} />
      </div>
    );
  }

  // ── The pack ──────────────────────────────────────────────────────────────
  const leads = pack.recommendations.filter(r => r.tier === 'lead');
  const supporting = pack.recommendations.filter(r => r.tier === 'supporting');
  const market = pack.envelope.market_context;

  const TABS: { id: SectionId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: <Compass size={14} strokeWidth={1.75} /> },
    { id: 'capabilities', label: 'Capabilities', icon: <Sparkles size={14} strokeWidth={1.75} />, count: pack.recommendations.length },
    { id: 'sequence', label: 'Sequence', icon: <ListOrdered size={14} strokeWidth={1.75} />, count: pack.sequences.length },
    { id: 'questions', label: 'Questions to ask', icon: <HelpCircle size={14} strokeWidth={1.75} />, count: pack.questions_to_ask.length },
    { id: 'objections', label: 'They will ask', icon: <MessageCircleQuestion size={14} strokeWidth={1.75} />, count: pack.likely_client_questions.length },
    { id: 'limitations', label: 'Demo warnings', icon: <AlertTriangle size={14} strokeWidth={1.75} />, count: pack.demo_warnings.length },
    { id: 'avoid', label: 'Do not claim', icon: <ShieldAlert size={14} strokeWidth={1.75} />, count: pack.avoid_claiming.length },
    { id: 'market', label: 'Market context', icon: <Globe size={14} strokeWidth={1.75} />, count: market.statements.length }
  ];

  return (
    <div className="atlas">
      <button type="button" className="atlas-back" onClick={() => setPack(null)}>
        <ArrowLeft size={14} strokeWidth={1.75} /> New preparation
      </button>

      <header className="atlas-detail-head">
        <h1>{pack.context.organisation?.value ?? 'Client conversation'} — preparation</h1>
        <p className="atlas-detail-summary">
          {[
            pack.context.client_role ? `Meeting ${pack.context.client_role.value}` : null,
            pack.context.duration_mins ? `${pack.context.duration_mins.value} minutes` : null,
            lens ? `prepared as ${LENS_NAME[lens]}` : null
          ].filter(Boolean).join(' · ')}
        </p>
        {/*
          The two dimensions, side by side and named, because they are constantly confused (§9).
          The lens is who is reading; the client role is who is across the table.
        */}
        <div className="atlas-prep-dims">
          <span className="atlas-prep-dim">
            <span className="atlas-prep-dim-label">Atlas lens</span>
            {lens ? LENS_NAME[lens] : 'none selected'}
          </span>
          <span className="atlas-prep-dim">
            <span className="atlas-prep-dim-label">Client role</span>
            {pack.context.client_role?.value ?? 'not stated'}
          </span>
        </div>
      </header>

      <nav className="atlas-prep-tabs" aria-label="Preparation sections">
        {TABS.map(t => (
          <button
            key={t.id} type="button" className="atlas-prep-tab"
            aria-pressed={section === t.id}
            onClick={() => setSection(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
            {typeof t.count === 'number' && <span className="atlas-prep-count">{t.count}</span>}
          </button>
        ))}
      </nav>

      <div className="atlas-prep-body">
        {section === 'overview' && (
          <>
            <Interpretation pack={pack} />
            <FollowUps pack={pack} />
          </>
        )}

        {section === 'capabilities' && (
          <>
            <SectionIntro>
              Lead with these {leads.length}. Every recommendation carries the reason it is here, and
              a capability that could not produce one is not in this list.
            </SectionIntro>
            {leads.map(r => <Recommendation key={r.capability_id} rec={r} onOpen={onOpenCapability} />)}
            {supporting.length > 0 && (
              <>
                <div className="atlas-section-group atlas-section-group--rest">
                  Supporting — if the conversation goes deeper
                </div>
                {supporting.map(r => <Recommendation key={r.capability_id} rec={r} onOpen={onOpenCapability} />)}
              </>
            )}
          </>
        )}

        {section === 'sequence' && (
          pack.sequences.length
            ? pack.sequences.map(s => <Sequence key={s.kind} sequence={s} />)
            : <Empty>No conversation sequence could be built from governed demonstration knowledge. The pack does not invent one.</Empty>
        )}

        {section === 'questions' && (
          pack.questions_to_ask.length
            ? pack.questions_to_ask.map(q => (
                <div className="atlas-prep-card" key={q.question_id}>
                  <p className="atlas-prep-quote">“{q.question}”</p>
                  <p className="atlas-prep-meta">{q.why_asking}</p>
                  <p className="atlas-prep-why"><strong>Why here:</strong> {q.why_here}</p>
                </div>
              ))
            : <Empty>No governed Question Worth Asking links to the recommended capabilities. Rather than generate filler, the pack offers none.</Empty>
        )}

        {section === 'objections' && (
          pack.likely_client_questions.map((q, i) => (
            <div className={`atlas-prep-card${q.concedes ? ' atlas-prep-card--concede' : ''}`} key={i}>
              <p className="atlas-prep-quote">“{q.question}”</p>
              <span className="atlas-prep-tag">{q.category} · {q.difficulty}</span>
              <p>{q.response}</p>
              {q.grounded_in.length > 0 && (
                <p className="atlas-prep-meta">
                  Grounded in{' '}
                  {q.grounded_in.map(id => (
                    <button key={id} type="button" className="atlas-prep-link" onClick={() => onOpenCapability(id)}>{id}</button>
                  ))}
                </p>
              )}
              {q.concedes && <p className="atlas-prep-meta">This answer concedes something. Say it anyway — being corrected later costs more.</p>}
            </div>
          ))
        )}

        {section === 'limitations' && (
          pack.demo_warnings.length
            ? pack.demo_warnings.map((w, i) => (
                <div className="atlas-warn" key={i}>
                  <div className="atlas-warn-title">{w.capability_name} · {w.kind.replace(/-/g, ' ')}</div>
                  <p>{w.warning}</p>
                  <p className="atlas-prep-meta">from <span className="atlas-mono">{w.derived_from}</span></p>
                </div>
              ))
            : <Empty>No demonstration warning applies to the recommended capabilities. That is derived from their governed records, not an omission.</Empty>
        )}

        {section === 'avoid' && (
          pack.avoid_claiming.length
            ? pack.avoid_claiming.map((a, i) => (
                <div className="atlas-prep-card atlas-prep-card--avoid" key={i}>
                  <p className="atlas-prep-avoid">{a.avoid}</p>
                  <p className="atlas-prep-instead"><strong>Say instead:</strong> {a.instead}</p>
                  <p className="atlas-prep-meta">{a.capability_name} · from <span className="atlas-mono">{a.derived_from}</span></p>
                </div>
              ))
            : <Empty>Nothing in the recommended set carries a governed limitation severe enough to become a prohibition.</Empty>
        )}

        {section === 'market' && (
          <>
            <SectionIntro>
              External evidence is separate from CogniX evidence and from interpretation, and always
              will be. Nothing here is a CogniX capability claim.
            </SectionIntro>
            {market.available && market.statements.length > 0
              ? market.statements.map((m, i) => (
                  <div className="atlas-prep-card" key={i}>
                    <p>{m.claim}</p>
                    <p className="atlas-prep-meta">
                      {m.source.publisher} · {m.source.published_at} · {m.freshness.verdict}
                    </p>
                  </div>
                ))
              : <Empty>{market.absence_reason ?? 'No market context.'}</Empty>}
            {pack.envelope.rejected_claims.length > 0 && (
              <>
                <div className="atlas-section-group atlas-section-group--rest">
                  Retrieved and refused — {pack.envelope.rejected_claims.length}
                </div>
                {pack.envelope.rejected_claims.map((r, i) => (
                  <p className="atlas-prep-meta" key={i}>{r.reason.replace(/-/g, ' ')} — {r.claim.slice(0, 120)}…</p>
                ))}
              </>
            )}
          </>
        )}
      </div>

      {/* Refinement stays visible on every section: the pack is a conversation, not a report (§31). */}
      <div className="atlas-prep-refine">
        <div className="atlas-searchbar">
          <Search size={16} strokeWidth={1.75} color="var(--text-muted)" />
          <input
            value={refinement}
            onChange={e => setRefinement(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && refinement.trim()) void run({ refinement }); }}
            placeholder="Refine — “make this more technical”, “I only have 15 minutes”…"
            aria-label="Refine this preparation"
          />
          {busy && <Loader2 size={16} className="atlas-spin" />}
        </div>
        <div className="atlas-examples">
          {REFINEMENTS.map(r => (
            <button key={r} type="button" className="atlas-example" onClick={() => void run({ refinement: r })}>{r}</button>
          ))}
          <ResearchToggle on={research} onChange={v => { setResearch(v); }} />
        </div>
        {error && <p className="atlas-prep-error">{error}</p>}
      </div>
    </div>
  );
}

// ── Pieces ───────────────────────────────────────────────────────────────────

/**
 * The external-research control (§17).
 *
 * Default OFF and stated as OFF. The label says what the two states DO rather than naming a
 * feature, because "Include current market research" without the consequence attached does not tell
 * a user that turning it on sends their topic to a search engine.
 */
function ResearchToggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button" className="atlas-prep-research" aria-pressed={on}
      onClick={() => onChange(!on)}
    >
      <Globe size={13} strokeWidth={1.75} />
      {on
        ? 'Market research on — searches outward, admits only sourced evidence'
        : 'Include current market research'}
    </button>
  );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return <p className="atlas-prep-intro">{children}</p>;
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="atlas-prep-empty">{children}</p>;
}

/** What was supplied versus what was inferred — never run together into one paragraph (§10). */
function Interpretation({ pack }: { pack: PreparationPack }) {
  const i = pack.interpretation;
  return (
    <>
      <h2 className="atlas-prep-h2">What CogniX understands</h2>
      {i.supplied.length > 0 && (
        <div className="atlas-prep-card">
          <span className="atlas-prep-tag">You said</span>
          {i.supplied.map((s, n) => <p key={n}>{s}</p>)}
        </div>
      )}
      {i.inferred.length > 0 && (
        <div className="atlas-prep-card atlas-prep-card--inferred">
          <span className="atlas-prep-tag">CogniX inferred — check this</span>
          {i.inferred.map((s, n) => (
            <p key={n}>{s.statement} <span className="atlas-prep-meta">({s.because})</span></p>
          ))}
        </div>
      )}
      {i.contradictions.length > 0 && (
        <div className="atlas-warn">
          <div className="atlas-warn-title">These two do not sit together</div>
          {i.contradictions.map((c, n) => (
            <p key={n}>You said <strong>{c.statement}</strong>, alongside {c.conflicts_with}.</p>
          ))}
        </div>
      )}
      {i.unknowns.length > 0 && (
        <div className="atlas-prep-card">
          <span className="atlas-prep-tag">Would improve this pack</span>
          {i.unknowns.map((u, n) => <p key={n} className="atlas-prep-meta">{u}</p>)}
        </div>
      )}
    </>
  );
}

function FollowUps({ pack }: { pack: PreparationPack }) {
  if (!pack.follow_up.length) return null;
  return (
    <>
      <h2 className="atlas-prep-h2">Where to take it next</h2>
      {pack.follow_up.map((f, i) => (
        <div className="atlas-prep-card" key={i}>
          <p>{f.suggestion}</p>
          <p className="atlas-prep-meta">{f.because}</p>
        </div>
      ))}
    </>
  );
}

function Recommendation({ rec, onOpen }: { rec: CapabilityRecommendation; onOpen: (id: string) => void }) {
  const notReal = rec.maturity.implementation_status !== 'implemented';
  return (
    <div className="atlas-prep-card">
      <button type="button" className="atlas-prep-name" onClick={() => onOpen(rec.capability_id)}>
        {rec.name}
      </button>
      <p>{rec.summary}</p>
      <p className="atlas-prep-meta">
        {rec.maturity.lifecycle_state ?? 'no lifecycle state'} ·{' '}
        <strong className={notReal ? 'atlas-prep-alert' : undefined}>
          {rec.maturity.implementation_status.replace(/-/g, ' ')}
        </strong>
        {rec.maturity.demo_maturity ? ` · ${rec.maturity.demo_maturity}` : ' · no demo surface'}
        {rec.demonstrable ? ' · can be shown' : ' · discussion only'}
      </p>
      <div className="atlas-prep-rationale">
        <span className="atlas-prep-tag">Why this is here</span>
        <ul className="atlas-list">
          {rec.rationale.map((r, i) => (
            <li key={i}><span className="atlas-prep-basis">{r.basis.replace(/-/g, ' ')}</span> {r.detail}</li>
          ))}
        </ul>
      </div>
      {rec.limitations.length > 0 && (
        <div className="atlas-prep-limits">
          <span className="atlas-prep-tag">Limitations — the same under every lens</span>
          <ul className="atlas-list">
            {rec.limitations.map((l, i) => (
              <li key={i}><span className="atlas-dim">{l.severity}</span> {l.limitation}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Sequence({ sequence }: { sequence: ConversationSequence }) {
  return (
    <div className="atlas-prep-seq">
      <h3 className="atlas-prep-h3">{sequence.title}</h3>
      {sequence.duration_mins !== null && (
        <p className="atlas-prep-meta">Shaped for {sequence.duration_mins} minutes.</p>
      )}
      {sequence.stages.map((s, i) => (
        <div className="atlas-prep-stage" key={i}>
          <div className="atlas-prep-stage-head">
            <span className="atlas-prep-stage-name">{s.stage}</span>
            {s.minutes > 0 && <span className="atlas-prep-meta">{s.minutes} min</span>}
          </div>
          <p>{s.purpose}</p>
          {s.warnings.length > 0 && (
            <div className="atlas-warn">
              <div className="atlas-warn-title">Before you show this</div>
              {s.warnings.map((w, j) => <p key={j}>{w}</p>)}
            </div>
          )}
          {s.demo_steps.length > 0 && (
            <ul className="atlas-list">
              {s.demo_steps.map((step, j) => (
                <li key={j}>
                  <strong style={{ color: 'var(--text-primary)' }}>{step.action}</strong>
                  <br />“{step.what_to_say}”
                  <br /><span style={{ color: 'var(--text-muted)' }}>Look for: {step.expected_observation}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
      {sequence.omission_notice && <p className="atlas-prep-meta">{sequence.omission_notice}</p>}
    </div>
  );
}

/** Shown beside a clarification so the reader sees what was already read from their brief. */
function ReadSoFar({ pack }: { pack: PreparationPack }) {
  const c = pack.context;
  const bits = [
    c.client_role ? `role: ${c.client_role.value}` : null,
    c.domain ? `industry: ${c.domain.value.replace(/_/g, ' ')}` : null,
    c.duration_mins ? `${c.duration_mins.value} minutes` : null,
    c.vendors_mentioned.length ? `mentioned: ${c.vendors_mentioned.join(', ')}` : null
  ].filter(Boolean);
  if (!bits.length) return null;
  return <p className="atlas-prep-meta" style={{ marginTop: 14 }}>Read so far — {bits.join(' · ')}</p>;
}
