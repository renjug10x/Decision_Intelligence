'use client';

/**
 * CogniX Capability Atlas — the governed discovery surface (ATL-04).
 *
 * Search is the primary interaction, not a toolbar control: it sits above everything and the
 * landing state is a search field with real questions beside it, never a wall of cards.
 *
 * Every capability string on this screen arrives from /api/v1/atlas/* (ADR-046). The component
 * holds labels and layout only. Level 1 search is deterministic and works with no AI configured;
 * semantic retrieval and Ask CogniX are ATL-05 and are deliberately absent.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, Compass, Loader2 } from 'lucide-react';
import CapabilityCard, { type CardCapability } from './CapabilityCard';
import CapabilityDetail from './CapabilityDetail';
import AskCogniX from './AskCogniX';
import {
  fetchCapabilities, fetchCapability, fetchDomains, searchAtlas, buildFilterQuery,
  type CapabilityListItem, type AtlasDomain, type AtlasSearchResponse
} from '@/lib/atlas-client';
import type { ResolvedCapability, AudienceLens, CapabilityType } from '@/packages/contracts/src/capability-atlas-model';

const LENSES: { id: AudienceLens; label: string }[] = [
  { id: 'innovation-executive', label: 'Innovation Executive' },
  { id: 'sales', label: 'Sales' },
  { id: 'architect', label: 'Architect' },
  { id: 'developer', label: 'Developer' }
];

/** Real questions, not keywords. These are the ATL-04 search acceptance queries. */
const EXAMPLE_QUERIES = [
  'forecast uncertainty',
  'why did the decision change',
  'promotion risk',
  'external signals',
  'what can I reuse outside retail',
  'how do I test Decision Gap',
  'capabilities for an architect'
];

const CAPABILITY_TYPES: CapabilityType[] = [
  'domain-capability', 'platform-capability', 'enabling-service', 'governance-control', 'experience'
];

interface Filters {
  domain: string[];
  business_problem: string[];
  persona: string[];
  capability_type: CapabilityType[];
  demo_maturity: string[];
  platform_reusable?: boolean;
}

const EMPTY: Filters = { domain: [], business_problem: [], persona: [], capability_type: [], demo_maturity: [] };

export default function CapabilityAtlas() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [lens, setLens] = useState<AudienceLens | null>(null);

  const [all, setAll] = useState<CapabilityListItem[]>([]);
  const [domains, setDomains] = useState<AtlasDomain[]>([]);
  const [results, setResults] = useState<AtlasSearchResponse | null>(null);
  const [selected, setSelected] = useState<ResolvedCapability | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCapabilities(), fetchDomains()])
      .then(([caps, doms]) => { setAll(caps); setDomains(doms); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filterQuery = useMemo(() => buildFilterQuery({
    domain: filters.domain,
    business_problem: filters.business_problem,
    persona: filters.persona,
    capability_type: filters.capability_type,
    demo_maturity: filters.demo_maturity,
    platform_reusable: filters.platform_reusable
  }), [filters]);

  const runSearch = useCallback(async (q: string, fq: string) => {
    setLoading(true); setError(null);
    try { setResults(await searchAtlas(q, fq)); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (submitted || filterQuery) runSearch(submitted, filterQuery);
    else setResults(null);
  }, [submitted, filterQuery, runSearch]);

  const open = useCallback(async (id: string) => {
    setLoading(true);
    try { setSelected(await fetchCapability(id, lens ?? undefined)); window.scrollTo(0, 0); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, [lens]);

  // Re-resolve on lens change so the ordering hint follows the reader.
  useEffect(() => {
    if (selected) {
      fetchCapability(selected.identity.capability_id, lens ?? undefined).then(setSelected).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lens]);

  const businessProblems = useMemo(
    () => [...new Set(all.flatMap(c => c.business_problems))].sort(), [all]);
  const personas = useMemo(
    () => [...new Set(all.flatMap(c => c.personas))].sort(), [all]);

  if (selected) {
    return (
      <CapabilityDetail
        capability={selected}
        lens={lens}
        onBack={() => setSelected(null)}
        onOpenCapability={open}
      />
    );
  }

  const shown: CardCapability[] = results
    ? results.results.map(r => {
        const identity = all.find(c => c.capability_id === r.capability_id);
        return { ...r, platform_reusable: identity?.platform_reusable, domains: identity?.domains };
      })
    : all.map(c => ({
        capability_id: c.capability_id, name: c.name, summary: c.summary, score: 0, matches: [],
        lifecycle_state: c.lifecycle_state, demo_maturity: c.demo_maturity,
        implementation_status: c.implementation_status, level: 'structured' as const,
        platform_reusable: c.platform_reusable, domains: c.domains
      }));

  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.domain.length) activeChips.push({ label: `Domain: ${filters.domain.join(', ')}`, clear: () => setFilters(f => ({ ...f, domain: [] })) });
  if (filters.business_problem.length) activeChips.push({ label: `Problem: ${filters.business_problem[0].replace(/^bp-/, '').replace(/-/g, ' ')}`, clear: () => setFilters(f => ({ ...f, business_problem: [] })) });
  if (filters.persona.length) activeChips.push({ label: `Audience: ${filters.persona.join(', ')}`, clear: () => setFilters(f => ({ ...f, persona: [] })) });
  if (filters.capability_type.length) activeChips.push({ label: `Type: ${filters.capability_type[0].replace(/-/g, ' ')}`, clear: () => setFilters(f => ({ ...f, capability_type: [] })) });
  if (filters.demo_maturity.length) activeChips.push({ label: `Demo: ${filters.demo_maturity[0]}`, clear: () => setFilters(f => ({ ...f, demo_maturity: [] })) });
  if (filters.platform_reusable) activeChips.push({ label: 'Reusable across domains', clear: () => setFilters(f => ({ ...f, platform_reusable: undefined })) });

  return (
    <div className="atlas">
      <div className="atlas-hero">
        <h1>CogniX Capability Atlas</h1>
        <p>
          Explore what CogniX can do, how capabilities work, where they apply and how to demonstrate them.
        </p>

        <div className="atlas-searchbar">
          <Search size={18} strokeWidth={1.75} color="var(--text-muted)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') setSubmitted(query); }}
            placeholder="Ask a question — a business problem, a use case, an architecture, a work package…"
            aria-label="Search capabilities"
          />
          {(query || submitted) && (
            <button
              type="button"
              onClick={() => { setQuery(''); setSubmitted(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
              aria-label="Clear search"
            >
              <X size={16} strokeWidth={1.75} color="var(--text-muted)" />
            </button>
          )}
        </div>

        <div className="atlas-examples">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Try:</span>
          {EXAMPLE_QUERIES.map(q => (
            <button key={q} type="button" className="atlas-example"
              onClick={() => { setQuery(q); setSubmitted(q); }}>
              {q}
            </button>
          ))}
        </div>

        <div className="atlas-lensbar" role="group" aria-label="Explore as">
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: 2 }}>Explore as</span>
          {LENSES.map(l => (
            <button key={l.id} type="button" className="atlas-lens"
              aria-pressed={lens === l.id}
              onClick={() => setLens(lens === l.id ? null : l.id)}>
              {l.label}
            </button>
          ))}
        </div>

        <div className="atlas-filters">
          <div className="atlas-filter">
            <label htmlFor="f-domain">Domain</label>
            <select id="f-domain" value={filters.domain[0] ?? ''}
              onChange={e => setFilters(f => ({ ...f, domain: e.target.value ? [e.target.value] : [] }))}>
              <option value="">Any domain</option>
              {domains.flatMap(d => d.items).filter(i => i.capability_count > 0).map(i => (
                <option key={i.id} value={i.id}>{i.name} ({i.capability_count})</option>
              ))}
            </select>
          </div>
          <div className="atlas-filter">
            <label htmlFor="f-problem">Business problem</label>
            <select id="f-problem" value={filters.business_problem[0] ?? ''}
              onChange={e => setFilters(f => ({ ...f, business_problem: e.target.value ? [e.target.value] : [] }))}>
              <option value="">Any problem</option>
              {businessProblems.map(b => (
                <option key={b} value={b}>{b.replace(/^bp-/, '').replace(/-/g, ' ')}</option>
              ))}
            </select>
          </div>
          <div className="atlas-filter">
            <label htmlFor="f-persona">Audience</label>
            <select id="f-persona" value={filters.persona[0] ?? ''}
              onChange={e => setFilters(f => ({ ...f, persona: e.target.value ? [e.target.value] : [] }))}>
              <option value="">Any audience</option>
              {personas.map(p => <option key={p} value={p}>{p.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div className="atlas-filter">
            <label htmlFor="f-type">Capability type</label>
            <select id="f-type" value={filters.capability_type[0] ?? ''}
              onChange={e => setFilters(f => ({ ...f, capability_type: e.target.value ? [e.target.value as CapabilityType] : [] }))}>
              <option value="">Any type</option>
              {CAPABILITY_TYPES.map(t => <option key={t} value={t}>{t.replace(/-/g, ' ')}</option>)}
            </select>
          </div>
          <div className="atlas-filter">
            <label htmlFor="f-demo">Demo readiness</label>
            <select id="f-demo" value={filters.demo_maturity[0] ?? ''}
              onChange={e => setFilters(f => ({ ...f, demo_maturity: e.target.value ? [e.target.value] : [] }))}>
              <option value="">Any readiness</option>
              <option value="Production Ready">Production Ready</option>
              <option value="Interactive Prototype">Interactive Prototype</option>
              <option value="Reference Pattern">Reference Pattern</option>
            </select>
          </div>
          <div className="atlas-filter">
            <label htmlFor="f-reuse">Platform reusable</label>
            <select id="f-reuse" value={filters.platform_reusable === undefined ? '' : String(filters.platform_reusable)}
              onChange={e => setFilters(f => ({ ...f, platform_reusable: e.target.value === '' ? undefined : e.target.value === 'true' }))}>
              <option value="">Any</option>
              <option value="true">Reusable across domains</option>
              <option value="false">Domain specific</option>
            </select>
          </div>
        </div>

        {(results?.expansions?.length ?? 0) > 0 && (
          <p className="atlas-expansions">
            <span className="atlas-expansions-label">Also searched</span>
            {results!.expansions!.map(e => (
              <span key={e.alias_id} className="atlas-expansion" title={e.rationale}>
                {e.governed_terms.join(', ')}
                <span className="atlas-expansion-from">from “{e.phrase}”</span>
              </span>
            ))}
          </p>
        )}

        {(activeChips.length > 0 || (results?.hints.length ?? 0) > 0) && (
          <div className="atlas-activefilters">
            {results?.hints.map((h, i) => (
              <button
                key={`h${i}`}
                type="button"
                className="atlas-chip atlas-chip--hint"
                title={`Suggested because your question contained “${h.trigger}”`}
                onClick={() => {
                  if (h.kind === 'lens' && h.lens) setLens(h.lens);
                  if (h.filter?.platform_reusable !== undefined) setFilters(f => ({ ...f, platform_reusable: h.filter!.platform_reusable }));
                  if (h.filter?.demo_maturity) setFilters(f => ({ ...f, demo_maturity: h.filter!.demo_maturity as string[] }));
                  if (h.filter?.capability_type) setFilters(f => ({ ...f, capability_type: h.filter!.capability_type as CapabilityType[] }));
                }}
              >
                Apply: {h.label}
              </button>
            ))}
            {activeChips.map((c, i) => (
              <button key={i} type="button" className="atlas-chip" onClick={c.clear}>
                {c.label} <X size={11} strokeWidth={2.5} />
              </button>
            ))}
            {activeChips.length > 0 && (
              <button type="button" className="atlas-clear" onClick={() => setFilters(EMPTY)}>Clear all</button>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: 22 }}>
        <AskCogniX lens={lens} onOpenCapability={open} />
      </div>

      <div className="atlas-resultbar">
        <span className="atlas-resultcount">
          {loading
            ? 'Searching…'
            : <><strong>{shown.length}</strong> {shown.length === 1 ? 'capability' : 'capabilities'}
                {submitted && <> for “{submitted}”</>}</>}
        </span>
        {!submitted && !activeChips.length && (
          <span className="atlas-resultcount" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Compass size={13} strokeWidth={1.75} /> Ranked by name — search or filter to narrow
          </span>
        )}
      </div>

      {error && (
        <div className="atlas-empty"><p>The Atlas could not be reached.</p><span>{error}</span></div>
      )}

      {loading && !shown.length && (
        <div className="atlas-empty">
          <Loader2 size={20} strokeWidth={1.75} color="var(--text-muted)" />
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="atlas-empty">
          <p>Nothing matched.</p>
          <span>{results?.suggestion ?? 'Try a broader question, or clear the filters.'}</span>
        </div>
      )}

      <div className="atlas-results">
        {shown.map(c => (
          <CapabilityCard key={c.capability_id} capability={c} onOpen={open} showWhy={Boolean(submitted)} />
        ))}
      </div>
    </div>
  );
}
