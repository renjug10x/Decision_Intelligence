'use client';

/**
 * Ask CogniX (ATL-05) — a secondary affordance, opened deliberately.
 *
 * The Atlas is not a chatbot: search remains the front door and this panel is collapsed until a
 * user asks for it. Answers are assembled from governed CogniX records and every claim carries a
 * visible citation the reader can follow back to the capability that made it.
 *
 * Three things this surface must never do, all enforced by the backend and shown here:
 *   - answer from outside governed knowledge (external topics are declared unanswerable),
 *   - fill a gap (an unsupported question returns a stated gap),
 *   - hide maturity truth (lifecycle, demo and implementation travel with each cited claim).
 */

import { useState } from 'react';
import { MessageSquare, X, CornerDownLeft, Loader2 } from 'lucide-react';
import MaturityTriad from './MaturityTriad';
import type { AudienceLens } from '@/packages/contracts/src/capability-atlas-model';
import type { AskAnswer } from '@/lib/atlas/ai/answer';

const OUTCOME_LABEL: Record<AskAnswer['outcome'], string> = {
  answered: 'Grounded answer',
  ambiguous: 'Several readings',
  partial: 'Partly answerable',
  gap: 'Not in the Atlas'
};

export default function AskCogniX({
  lens,
  onOpenCapability
}: {
  lens: AudienceLens | null;
  onOpenCapability: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<AskAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!question.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/v1/atlas/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, lens: lens ?? undefined })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || 'Ask CogniX failed');
      setAnswer(payload.data as AskAnswer);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  if (!open) {
    return (
      <button type="button" className="atlas-ask-open" onClick={() => setOpen(true)}>
        <MessageSquare size={14} strokeWidth={1.75} /> Ask CogniX about these capabilities
      </button>
    );
  }

  return (
    <div className="atlas-ask">
      <div className="atlas-ask-head">
        <span className="atlas-ask-title">Ask CogniX</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
            Answers come only from governed CogniX records
          </span>
          <button type="button" onClick={() => setOpen(false)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
            aria-label="Close Ask CogniX">
            <X size={15} strokeWidth={1.75} color="var(--text-muted)" />
          </button>
        </span>
      </div>

      <div className="atlas-ask-body">
        <div className="atlas-ask-input">
          <input
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') submit(); }}
            placeholder="e.g. why did the decision change"
            aria-label="Ask a question about CogniX capabilities"
          />
          <button type="button" className="atlas-ask-go" onClick={submit} disabled={loading || !question.trim()}>
            {loading ? <Loader2 size={12} /> : <>Ask <CornerDownLeft size={11} /></>}
          </button>
        </div>

        {error && <p className="atlas-ask-notice atlas-ask-notice--gap">{error}</p>}

        {answer && (
          <>
            <div style={{ marginTop: 16 }}>
              <span className={`atlas-ask-outcome atlas-ask-outcome--${answer.outcome}`}>
                {OUTCOME_LABEL[answer.outcome]}
              </span>
            </div>
            <p className="atlas-ask-framing">{answer.framing}</p>

            {answer.degradationNotice && (
              <p className="atlas-ask-notice">{answer.degradationNotice}</p>
            )}
            {answer.externalKnowledgeNotice && (
              <p className="atlas-ask-notice atlas-ask-notice--external">
                {answer.externalKnowledgeNotice}
              </p>
            )}
            {answer.gapNotice && (
              <p className="atlas-ask-notice atlas-ask-notice--gap">{answer.gapNotice}</p>
            )}

            {answer.sections.map((s, i) => {
              const interpretation = answer.interpretations.find(x => x.capability_id === s.maturity?.capability_id);
              return (
                <div key={i} className="atlas-ask-section">
                  <div className="atlas-ask-section-head">
                    <h4>{s.heading}</h4>
                    {s.maturity && (
                      <MaturityTriad
                        lifecycle={s.maturity.lifecycle_state}
                        demoMaturity={s.maturity.demo_maturity}
                        implementation={s.maturity.implementation_status}
                      />
                    )}
                  </div>
                  {interpretation && (
                    <p className="atlas-ask-reading">Reading: {interpretation.why_this_reading}</p>
                  )}
                  <p>{s.text}</p>
                  <div className="atlas-ask-cites">
                    {s.citations.map((c, j) => (
                      <button
                        key={j}
                        type="button"
                        className="atlas-cite"
                        title={c.label}
                        onClick={() => { if (c.kind === 'capability') onOpenCapability(c.ref); }}
                      >
                        <span className="atlas-cite-kind">{c.kind}</span>{c.ref}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            {answer.questionsWorthAsking.length > 0 && (
              <div className="atlas-ask-section">
                <div className="atlas-ask-section-head"><h4>Questions worth asking</h4></div>
                {answer.questionsWorthAsking.map(q => (
                  <p key={q.question_id}>
                    “{q.question}”
                    {q.capability_refs.length > 0 && (
                      <span style={{ color: 'var(--text-muted)' }}> — {q.capability_refs.join(', ')}</span>
                    )}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
