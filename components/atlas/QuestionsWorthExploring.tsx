'use client';

/**
 * Questions Worth Exploring (ATL-04R).
 *
 * The standalone Questions page was a browser: a list on the left, an evidence panel on the right,
 * and two buttons that left the Atlas entirely. Its content was always governed — `CuriosityQuestion`
 * is a first-class contract type and the registry survives this change untouched — but its
 * PLACEMENT made a question a terminus rather than a way in.
 *
 * Here a question is a discovery path. Selecting one highlights the capability areas it reaches and
 * surfaces the capabilities it is genuinely about, so the reader lands in the landscape rather than
 * in a different screen.
 *
 * ── The link rationale is rendered, and that is deliberate ──────────────────
 * `CuriosityQuestionCapabilityLink` carries a written rationale precisely because a capability link
 * is never derived from a shared solution or experiment — `SOL-PROMO-01` is demonstrated by several
 * capabilities, so transitive derivation would attach a question to capabilities it does not ask
 * about. Showing the rationale is what makes each link auditable as deliberate rather than
 * plausible, so it is displayed rather than kept in the record.
 *
 * Questions arrive through `fetchQuestions()`, not by importing the registry module. The old surface
 * imported `content/atlas/curiosity-questions` directly into a client component; reading through the
 * API keeps the ADR-046 boundary true for this content the way it already is for capabilities.
 */

import { useEffect, useState } from 'react';
import { ArrowUpRight, Compass, Loader2 } from 'lucide-react';
import { fetchQuestions } from '@/lib/atlas-client';
import type { CuriosityQuestion } from '@/packages/contracts/src/capability-atlas-model';
import type { AtlasArea } from '@/lib/atlas-client';

interface Props {
  areas: AtlasArea[];
  onOpenCapability: (capabilityId: string) => void;
  onExploreArea: (areaId: string) => void;
  onAskAbout: (question: string) => void;
  onOpenSolution: (solutionId: string) => void;
  onOpenExperiment: (experimentId: string) => void;
}

export default function QuestionsWorthExploring({
  areas,
  onOpenCapability,
  onExploreArea,
  onAskAbout,
  onOpenSolution,
  onOpenExperiment
}: Props) {
  const [questions, setQuestions] = useState<CuriosityQuestion[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetchQuestions()
      .then(list => {
        if (!live) return;
        setQuestions(list);
        setActive(list[0]?.question_id ?? null);
      })
      .catch(() => setQuestions([]))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, []);

  const selected = questions.find(q => q.question_id === active) ?? null;

  const memberIndex = new Map<string, { name: string; areaId: string; areaName: string }>();
  for (const area of areas) {
    for (const member of area.members) {
      memberIndex.set(member.capability_id, {
        name: member.name,
        areaId: area.area_id,
        areaName: area.name
      });
    }
  }

  const reachedAreas = selected
    ? [...new Set(selected.related_capabilities.map(link => memberIndex.get(link.ref)?.areaId).filter(Boolean))]
    : [];

  if (loading) {
    return (
      <div className="atlas-empty">
        <Loader2 size={16} className="atlas-spin" strokeWidth={1.75} /> Loading questions…
      </div>
    );
  }

  if (questions.length === 0) {
    return <div className="atlas-empty">No curiosity questions are registered.</div>;
  }

  return (
    <div className="atlas-qwe">
      <header className="atlas-qwe-head">
        <h2>Questions worth exploring</h2>
        <p>
          Questions CogniX thinks are worth asking, and the capabilities that can answer them. Each
          link below carries the reason the question is genuinely about that capability.
        </p>
      </header>

      <div className="atlas-qwe-body">
        <ul className="atlas-qwe-list">
          {questions.map(question => (
            <li key={question.question_id}>
              <button
                type="button"
                className={`atlas-qwe-item${question.question_id === active ? ' atlas-qwe-item--active' : ''}`}
                aria-pressed={question.question_id === active}
                onClick={() => setActive(question.question_id)}
              >
                <span className="atlas-qwe-category">{question.category}</span>
                <span className="atlas-qwe-text">{question.question}</span>
              </button>
            </li>
          ))}
        </ul>

        {selected && (
          <section className="atlas-qwe-panel" aria-live="polite">
            <p className="atlas-qwe-panel-question">{selected.question}</p>

            <div className="atlas-qwe-why">
              <span className="atlas-qwe-label">Why CogniX is asking</span>
              <p>{selected.why_asking}</p>
            </div>

            {selected.summary_narrative && (
              <div className="atlas-qwe-narrative">
                <span className="atlas-qwe-label">What this comes down to</span>
                <p>{selected.summary_narrative}</p>
              </div>
            )}

            {selected.evidence_points.length > 0 && (
              <div className="atlas-qwe-evidence">
                <span className="atlas-qwe-label">Evidence behind the question</span>
                <ul>
                  {selected.evidence_points.map(point => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {selected.related_capabilities.length > 0 && (
              <div className="atlas-qwe-caps">
                <span className="atlas-qwe-label">Capabilities that answer it</span>
                <ul>
                  {selected.related_capabilities.map(link => {
                    const member = memberIndex.get(link.ref);
                    return (
                      <li key={link.ref}>
                        <button type="button" onClick={() => onOpenCapability(link.ref)}>
                          <span className="atlas-qwe-cap-name">
                            {member ? member.name : link.ref}
                            <ArrowUpRight size={13} strokeWidth={1.75} />
                          </span>
                          {member && <span className="atlas-qwe-cap-area">{member.areaName}</span>}
                          <span className="atlas-qwe-cap-rationale">Linked because: {link.rationale}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {reachedAreas.length > 0 && (
              <div className="atlas-qwe-areas">
                <span className="atlas-qwe-label">Where this leads in the landscape</span>
                <div className="atlas-qwe-arealinks">
                  {reachedAreas.map(areaId => {
                    const area = areas.find(a => a.area_id === areaId);
                    return (
                      <button key={areaId} type="button" onClick={() => onExploreArea(areaId as string)}>
                        <Compass size={12} strokeWidth={2} />
                        {area ? area.name : areaId}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="atlas-qwe-actions">
              <button type="button" className="atlas-qwe-ask" onClick={() => onAskAbout(selected.question)}>
                Ask CogniX this question
              </button>
              {selected.related_solutions.map(solutionId => (
                <button key={solutionId} type="button" onClick={() => onOpenSolution(solutionId)}>
                  Open {solutionId}
                </button>
              ))}
              {selected.related_experiments.map(experimentId => (
                <button key={experimentId} type="button" onClick={() => onOpenExperiment(experimentId)}>
                  Open {experimentId}
                </button>
              ))}
            </div>

            <p className="atlas-qwe-provenance">
              Governed by {selected.owner} · reviewed {selected.reviewed_at}
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
