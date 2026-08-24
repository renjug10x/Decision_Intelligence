'use client';

/**
 * Portfolio, as a view of the Atlas rather than a destination of its own (ATL-04R).
 *
 * The standalone Innovation Portfolio answered "what has CogniX built?" with five experiment cards
 * and four solution cards — nine records standing in for an estate of thirty-eight capabilities.
 * `cap-innovation-portfolio.ts` records that understatement as a known limitation of the surface,
 * which is a good reason to fold it into the Atlas rather than to keep two disagreeing answers.
 *
 * ── Every figure here is a count of governed records ────────────────────────
 * Nothing on this surface is modelled, projected or estimated. Each number is how many capability
 * records currently carry a given value, which is a fact about the registry the reader can verify
 * by opening the area. That is the line between this and the retired storyboard's "£12.4M National
 * ROI": counting what exists is evidence, asserting what it achieved is invention.
 *
 * ── Three distributions, deliberately not combined ──────────────────────────
 * Implementation status, innovation lifecycle and demonstration maturity are rendered as three
 * separate distributions because they are three independent dimensions (ADR-047). A capability can
 * legitimately be Production Ready to demonstrate and only partially implemented; averaging those
 * into one portfolio health score would erase precisely the distinction the estate is careful about.
 */

import type { AtlasArea } from '@/lib/atlas-client';
import type { ImplementationStatus } from '@/packages/contracts/src/capability-atlas-model';

interface Props {
  areas: AtlasArea[];
  onOpenCapability: (capabilityId: string) => void;
  onExploreArea: (areaId: string) => void;
}

const IMPLEMENTATION_ORDER: ImplementationStatus[] = [
  'implemented',
  'partially-implemented',
  'simulated',
  'experimental',
  'concept',
  'roadmap'
];

const IMPLEMENTATION_LABEL: Record<ImplementationStatus, string> = {
  implemented: 'Implemented',
  'partially-implemented': 'Partly built',
  simulated: 'Simulated',
  experimental: 'Experimental',
  concept: 'Concept',
  roadmap: 'Roadmap'
};

function Distribution({
  label,
  question,
  rows,
  total
}: {
  label: string;
  question: string;
  rows: { key: string; label: string; count: number; tone?: string }[];
  total: number;
}) {
  const present = rows.filter(r => r.count > 0);
  return (
    <section className="atlas-pf-dist">
      <h4 className="atlas-pf-dist-label">{label}</h4>
      <p className="atlas-pf-dist-question">{question}</p>
      <ul className="atlas-pf-bars">
        {present.map(row => (
          <li key={row.key} className="atlas-pf-bar">
            <span className="atlas-pf-bar-label">{row.label}</span>
            <span className="atlas-pf-bar-track" aria-hidden="true">
              <span
                className={`atlas-pf-bar-fill${row.tone ? ` atlas-pf-bar-fill--${row.tone}` : ''}`}
                style={{ width: `${total > 0 ? (row.count / total) * 100 : 0}%` }}
              />
            </span>
            <span className="atlas-pf-bar-count">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function PortfolioView({ areas, onOpenCapability, onExploreArea }: Props) {
  const members = areas.flatMap(a => a.members);
  const total = members.length;

  const byImplementation = IMPLEMENTATION_ORDER.map(status => ({
    key: status,
    label: IMPLEMENTATION_LABEL[status],
    count: members.filter(m => m.implementation_status === status).length,
    tone:
      status === 'implemented'
        ? 'real'
        : status === 'partially-implemented'
          ? 'partial'
          : 'notreal'
  }));

  const lifecycleValues = [...new Set(members.map(m => m.lifecycle_state).filter(Boolean))] as string[];
  const byLifecycle = [
    ...lifecycleValues.map(state => ({
      key: state,
      label: state,
      count: members.filter(m => m.lifecycle_state === state).length
    })),
    {
      key: 'not-owned',
      label: 'No lifecycle owner',
      count: members.filter(m => m.lifecycle_state === null).length,
      tone: 'absent'
    }
  ];

  const demoValues = ['Production Ready', 'Interactive Prototype', 'Reference Pattern'];
  const byDemo = [
    ...demoValues.map(value => ({
      key: value,
      label: value,
      count: members.filter(m => m.demo_maturity === value).length
    })),
    {
      key: 'no-surface',
      label: 'No demonstrable surface',
      count: members.filter(m => m.demo_maturity === null).length,
      tone: 'absent'
    }
  ];

  const reusable = members.filter(m => m.platform_reusable).length;
  const notReal = members.filter(m => m.implementation_status !== 'implemented');

  return (
    <div className="atlas-portfolio">
      <header className="atlas-pf-head">
        <h2>What CogniX has built</h2>
        <p>
          <strong>{total}</strong> governed capabilities across <strong>{areas.length}</strong> areas.
          Every figure below counts capability records — none is modelled or projected.
        </p>
      </header>

      <div className="atlas-pf-estate">
        {areas.map(area => {
          const implemented = area.implemented_count;
          const rest = area.capability_count - implemented;
          return (
            <button
              key={area.area_id}
              type="button"
              className="atlas-pf-area"
              onClick={() => onExploreArea(area.area_id)}
            >
              <span className="atlas-pf-area-name">{area.name}</span>
              <span className="atlas-pf-area-track" aria-hidden="true">
                <span className="atlas-pf-seg atlas-pf-seg--real" style={{ flexGrow: implemented || 0.001 }} />
                <span className="atlas-pf-seg atlas-pf-seg--rest" style={{ flexGrow: rest || 0.001 }} />
              </span>
              <span className="atlas-pf-area-figure">
                <strong>{area.capability_count}</strong>
                <span className="atlas-pf-area-sub">{implemented} implemented</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="atlas-pf-grid">
        <Distribution
          label="Implementation"
          question="Is the thing behind the screen actually computing?"
          rows={byImplementation}
          total={total}
        />
        <Distribution
          label="Innovation lifecycle"
          question="How far has the idea travelled?"
          rows={byLifecycle}
          total={total}
        />
        <Distribution
          label="Demonstration maturity"
          question="Can it be shown to someone?"
          rows={byDemo}
          total={total}
        />
        <Distribution
          label="Reach"
          question="Does it apply beyond one domain?"
          rows={[
            { key: 'reusable', label: 'Reusable beyond one domain', count: reusable },
            { key: 'domain', label: 'Domain specific', count: total - reusable }
          ]}
          total={total}
        />
      </div>

      <section className="atlas-pf-honest">
        <h4>What is not fully built</h4>
        <p>
          These <strong>{notReal.length}</strong> capabilities are registered and reachable, and none of
          them is fully implemented. They are listed here because a portfolio that showed only the
          finished work would misrepresent the estate.
        </p>
        <ul className="atlas-pf-honest-list">
          {notReal.map(member => (
            <li key={member.capability_id}>
              <button type="button" onClick={() => onOpenCapability(member.capability_id)}>
                <span className="atlas-pf-honest-name">{member.name}</span>
                <span className={`atlas-pf-honest-status atlas-pf-honest-status--${member.implementation_status}`}>
                  {IMPLEMENTATION_LABEL[member.implementation_status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
