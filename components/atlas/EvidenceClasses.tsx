'use client';

/**
 * The three evidence classes, rendered so they cannot be read as one thing (ATL-06A, ADR-048).
 *
 * ADR-048 requires the classes to be distinguishable **structurally in the payload and visually on
 * the surface**. The payload half is the `GroundedEnvelope` contract; this component is the visual
 * half, and it takes the requirement literally:
 *
 *   - Each class is a separately bordered block with its own accent and its own standing label. A
 *     reader scanning quickly can see which class a sentence belongs to without reading the sentence.
 *   - An absent class is RENDERED AS ABSENT with the reason it is absent. Silence would let a
 *     missing market section read as a market section that found nothing of concern.
 *   - A contradiction is rendered as three stacked, separately labelled rows. There is no fourth row
 *     reconciling them, because there is no fourth field on the contract to hold one (ADR-053).
 *
 * Every market claim renders its publisher, url, publication date, retrieval date and currency
 * verdict. A claim without those never reaches this component: it was dropped at admission, and the
 * count of what was dropped is shown so the omission is visible rather than invisible.
 *
 * ATL-06B adds the two things a reader needs in order to distrust this section intelligently: how it
 * was searched, and what was thrown away. The queries actually run are shown; so is the number of
 * model sentences discarded for carrying no grounding support, which is the difference between
 * evidence and recall. Where the provider returns Google's Search Suggestions markup, it is rendered
 * as supplied — that is a condition of using Grounding with Google Search, and a hand-rolled
 * substitute is not permitted (ADR-055).
 */

import { ExternalLink, ShieldCheck, Globe, Lightbulb, AlertTriangle, Search, Filter } from 'lucide-react';
import type {
  ContradictionRecord, EvidenceClass, GroundedEnvelope
} from '@/packages/contracts/src/atlas-grounding-model';

const CLASS_META: Record<EvidenceClass, { label: string; blurb: string; icon: typeof ShieldCheck }> = {
  'from-cognix': {
    label: 'From CogniX',
    blurb: 'Governed CogniX records. Authoritative for what CogniX does.',
    icon: ShieldCheck
  },
  'market-context': {
    label: 'Market Context',
    blurb: 'Externally sourced. Explains the space; never redefines a capability.',
    icon: Globe
  },
  'ai-interpretation': {
    label: 'AI Interpretation',
    blurb: 'Reading of the two classes above. Rests on a cited CogniX statement.',
    icon: Lightbulb
  }
};

/**
 * Exported so the From CogniX block can carry the same standing label as the other two classes.
 * The governed block is rendered by `AskCogniX` because it is the ATL-05 answer itself, unchanged.
 */
export function EvidenceClassHead({ cls }: { cls: EvidenceClass }) {
  const meta = CLASS_META[cls];
  const Icon = meta.icon;
  return (
    <div className="atlas-ev-head">
      <span className="atlas-ev-label"><Icon size={12} strokeWidth={2} /> {meta.label}</span>
      <span className="atlas-ev-blurb">{meta.blurb}</span>
    </div>
  );
}

function Contradiction({ c }: { c: ContradictionRecord }) {
  return (
    <div className="atlas-contradiction">
      <div className="atlas-contradiction-head">
        <AlertTriangle size={12} strokeWidth={2} />
        <span>
          External evidence disagrees with the governed record for {c.capability_name} on{' '}
          {c.dimension.replace(/-/g, ' ')}. The governed record is authoritative and the two are kept apart.
        </span>
      </div>
      <div className="atlas-contradiction-row atlas-contradiction-row--cognix">
        <span className="atlas-ev-rowlabel">From CogniX</span>
        <p>{c.from_cognix}</p>
        <span className="atlas-ev-cite">{c.cognix_citation}</span>
      </div>
      <div className="atlas-contradiction-row atlas-contradiction-row--market">
        <span className="atlas-ev-rowlabel">Market Context</span>
        <p>{c.market_context}</p>
        <span className="atlas-ev-cite">
          {c.market_source.publisher} · published {c.market_source.published_at} · retrieved {c.market_source.retrieved_at}
        </span>
      </div>
      <div className="atlas-contradiction-row atlas-contradiction-row--interpretation">
        <span className="atlas-ev-rowlabel">AI Interpretation</span>
        <p>{c.ai_interpretation}</p>
      </div>
    </div>
  );
}

export default function EvidenceClasses({
  grounding,
  onOpenCapability
}: {
  grounding: GroundedEnvelope;
  onOpenCapability: (id: string) => void;
}) {
  const { market_context: market, ai_interpretation: interpretation, contradictions, refusal } = grounding;

  // A contradicting claim legitimately belongs in both places: the block above separates it against
  // the governed record, this one is the complete external record. Repeating it unannounced reads as
  // duplication, so the second appearance says why it is there rather than leaving the reader to
  // work it out.
  const contradicting = new Set(contradictions.map(c => c.market_context));
  const transparency = grounding.search_transparency ?? null;

  return (
    <div className="atlas-ev">
      <p className="atlas-ev-routing">
        <span className="atlas-ev-intent">{grounding.decision.intent.replace(/-/g, ' ')}</span>
        {grounding.decision.reason}
      </p>

      {refusal && (
        <p className="atlas-ask-notice atlas-ask-notice--external">{refusal.message}</p>
      )}

      {contradictions.length > 0 && (
        <div className="atlas-ev-block atlas-ev-block--contradiction">
          {contradictions.map((c, i) => <Contradiction key={i} c={c} />)}
        </div>
      )}

      <div className="atlas-ev-block atlas-ev-block--market">
        <EvidenceClassHead cls="market-context" />
        {market.available ? (
          market.statements.map((s, i) => (
            <div key={i} className="atlas-ev-claim">
              <p>{s.claim}</p>
              <div className="atlas-ev-source">
                <a href={s.source.url} target="_blank" rel="noreferrer noopener">
                  {s.source.title} <ExternalLink size={10} strokeWidth={2} />
                </a>
                <span>{s.source.publisher}</span>
                <span>{s.source.tier.replace(/-/g, ' ')}</span>
                <span>published {s.source.published_at}</span>
                <span>retrieved {s.source.retrieved_at}</span>
                <span className={`atlas-ev-fresh atlas-ev-fresh--${s.freshness.verdict}`}>{s.freshness.verdict}</span>
              </div>
              {contradicting.has(s.claim) && (
                <p className="atlas-ev-crosslink">
                  This claim disagrees with a governed record. The separated reading is above.
                </p>
              )}
              {s.relates_to.length > 0 && (
                <div className="atlas-ask-cites">
                  {s.relates_to.map(id => (
                    <button key={id} type="button" className="atlas-cite" onClick={() => onOpenCapability(id)}>
                      <span className="atlas-cite-kind">relates to</span>{id}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="atlas-ev-absent">{market.absence_reason}</p>
        )}
        {grounding.rejected_claims.length > 0 && (
          <div className="atlas-ev-ledger">
            <span className="atlas-ev-rowlabel">
              <Filter size={10} strokeWidth={2} /> Retrieved and not shown — {grounding.rejected_claims.length}
            </span>
            {grounding.rejected_claims.map((r, i) => (
              <div key={i} className="atlas-ev-ledger-row">
                <span className={`atlas-ev-reason atlas-ev-reason--${r.reason}`}>{r.reason.replace(/-/g, ' ')}</span>
                <span className="atlas-ev-ledger-claim">“{r.claim.length > 160 ? `${r.claim.slice(0, 160)}…` : r.claim}”</span>
                <span className="atlas-ev-ledger-detail">{r.detail}</span>
              </div>
            ))}
          </div>
        )}

        {transparency && (
          <div className="atlas-ev-search">
            <span className="atlas-ev-rowlabel"><Search size={10} strokeWidth={2} /> How this was searched</span>
            {transparency.queries.length > 0 && (
              <p className="atlas-ev-searchqueries">
                {transparency.queries.map((q, i) => <span key={i} className="atlas-ev-query">{q}</span>)}
              </p>
            )}
            <p className="atlas-ev-absent">
              {transparency.discarded_ungrounded_segments > 0
                ? `${transparency.discarded_ungrounded_segments} model sentence(s) carried no grounding support and were discarded rather than shown as market evidence.`
                : 'Every sentence shown above is traced to a retrieved source; nothing was carried over from model memory.'}
              {transparency.unresolved_sources > 0 &&
                ` ${transparency.unresolved_sources} source(s) could not be resolved to a publisher and were dropped.`}
              {transparency.cache === 'hit' && ' Served from the research cache rather than a new search.'}
            </p>
            {transparency.search_entry_point_html && (
              // Google's own Search Suggestions markup, rendered as supplied because displaying it
              // unaltered is a condition of using Grounding with Google Search (ADR-055).
              <div
                className="atlas-ev-suggestions"
                dangerouslySetInnerHTML={{ __html: transparency.search_entry_point_html }}
              />
            )}
          </div>
        )}
      </div>

      <div className="atlas-ev-block atlas-ev-block--interpretation">
        <EvidenceClassHead cls="ai-interpretation" />
        {interpretation.available ? (
          interpretation.statements.map((s, i) => (
            <div key={i} className="atlas-ev-claim">
              <p>{s.text}</p>
              <div className="atlas-ask-cites">
                {s.rests_on.map(id => (
                  <button key={id} type="button" className="atlas-cite" onClick={() => onOpenCapability(id)}>
                    <span className="atlas-cite-kind">rests on</span>{id}
                  </button>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="atlas-ev-absent">{interpretation.absence_reason}</p>
        )}
      </div>
    </div>
  );
}
