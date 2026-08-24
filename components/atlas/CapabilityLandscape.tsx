'use client';

/**
 * The capability landscape (ATL-04R).
 *
 * The answer to "what are you trying to improve?", and the surface that replaced `ATL-04`'s flat
 * thirty-eight-card list. Seven governed areas partition the registry, so a reader who has walked
 * these surfaces has seen the estate — that guarantee is enforced by rule L3, not asserted here.
 *
 * ── What a query does to this surface ───────────────────────────────────────
 * A search does not filter the landscape down to the matching areas. It RE-ARRANGES it: relevant
 * areas lead, carry the reason they are relevant, and open to show what matched; the rest stay
 * present and closed. Hiding them would answer the reader's question and quietly withdraw the map
 * that lets them ask a better one, which is the behaviour that made the old result list feel like
 * a search engine rather than an atlas.
 *
 * ── Three dimensions, never one ─────────────────────────────────────────────
 * An area reports its capability count, how many are reusable beyond one domain, and how many are
 * actually implemented — as three separate figures. Collapsing them into a single readiness score
 * would let demo maturity be read as production implementation, which ADR-047 exists to prevent and
 * which the estate's simulated capabilities would make actively misleading.
 */

import { ArrowRight, Repeat, Layers } from 'lucide-react';
import type { AtlasArea } from '@/lib/atlas-client';
import type { AreaRelevance } from '@/packages/contracts/src/capability-atlas-model';
import MaturityTriad from './MaturityTriad';

interface Props {
  areas: AtlasArea[];
  /** Relevance from the current query, most relevant first. Empty on the bare landing. */
  relevance: AreaRelevance[];
  /** Capability ids currently in scope, used to mark what matched inside an opened area. */
  inScope: string[];
  onOpenCapability: (capabilityId: string) => void;
  onExploreArea: (areaId: string) => void;
}

export default function CapabilityLandscape({
  areas,
  relevance,
  inScope,
  onOpenCapability,
  onExploreArea
}: Props) {
  const relevanceById = new Map(relevance.map(r => [r.area_id, r]));
  const scope = new Set(inScope);
  const searching = relevance.length > 0;

  // Relevant areas lead, in relevance order. Everything else follows in its governed order, so the
  // landscape stays recognisable between queries instead of reshuffling wholesale.
  const ordered = searching
    ? [
        ...relevance
          .map(r => areas.find(a => a.area_id === r.area_id))
          .filter((a): a is AtlasArea => Boolean(a)),
        ...areas.filter(a => !relevanceById.has(a.area_id))
      ]
    : areas;

  return (
    <section className="atlas-landscape" aria-label="Capability areas">
      {searching && relevance.length > 1 && (
        <p className="atlas-landscape-spread">
          Your question spans <strong>{relevance.length}</strong> capability areas.
          {' '}They are shown first below, each with what matched.
        </p>
      )}

      <div className="atlas-areas">
        {ordered.map(area => {
          const rel = relevanceById.get(area.area_id);
          const matched = rel ? area.members.filter(m => rel.matched.includes(m.capability_id)) : [];
          const open = Boolean(rel);

          return (
            <article
              key={area.area_id}
              className={`atlas-area${rel ? ' atlas-area--relevant' : ''}${open ? ' atlas-area--open' : ''}`}
            >
              <header className="atlas-area-head">
                <h3 className="atlas-area-name">{area.name}</h3>
                <p className="atlas-area-problem">{area.problem_space}</p>
                <p className="atlas-area-does">{area.what_cognix_does}</p>
              </header>

              <div className="atlas-area-counts">
                <span className="atlas-area-count">
                  <Layers size={12} strokeWidth={2} />
                  <strong>{area.capability_count}</strong> capabilities
                </span>
                <span className="atlas-area-count">
                  <strong>{area.implemented_count}</strong> implemented
                </span>
                {area.reusable_count > 0 && (
                  <span className="atlas-area-count">
                    <Repeat size={12} strokeWidth={2} />
                    <strong>{area.reusable_count}</strong> reusable beyond one domain
                  </span>
                )}
              </div>

              {rel && (
                <p className="atlas-area-why">
                  <span className="atlas-area-why-label">Why this area</span>
                  {rel.reason}
                </p>
              )}

              {open && matched.length > 0 && (
                <ul className="atlas-area-matches">
                  {matched.map(member => (
                    <li key={member.capability_id}>
                      <button
                        type="button"
                        className={`atlas-area-match${scope.has(member.capability_id) ? ' atlas-area-match--scoped' : ''}`}
                        onClick={() => onOpenCapability(member.capability_id)}
                      >
                        <span className="atlas-area-match-name">{member.name}</span>
                        <MaturityTriad
                          lifecycle={member.lifecycle_state}
                          demoMaturity={member.demo_maturity}
                          implementation={member.implementation_status}
                        />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <button type="button" className="atlas-area-explore" onClick={() => onExploreArea(area.area_id)}>
                {area.invitation}
                <ArrowRight size={13} strokeWidth={2} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
