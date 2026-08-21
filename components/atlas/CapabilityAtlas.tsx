'use client';

/**
 * CogniX Capability Atlas — the single discovery destination (ATL-04, refined by ATL-04R).
 *
 * `ATL-04` proved the backend-driven Atlas and the structured discovery model. What evaluation of
 * the working interface showed was that the INFORMATION architecture was sound and the INTERACTION
 * architecture was not: every control was on screen at once, Capability Atlas, Portfolio and
 * Questions were three separate experiences over one estate, and the landing behaved like a
 * searchable catalogue rather than a place to explore innovation.
 *
 * `ATL-04R` makes three changes and keeps everything else.
 *
 *   1. ONE ATLAS. Portfolio and Questions are views of this surface, not destinations beside it.
 *      They always read the same governed estate; making them separate pages made them disagree —
 *      the Portfolio showed nine records of an estate of thirty-eight and its own knowledge module
 *      recorded that understatement as a limitation.
 *
 *   2. A LANDSCAPE, NOT A LIST. The landing answers "what are you trying to improve?" with seven
 *      governed capability areas that partition the registry, and a query RE-ARRANGES that
 *      landscape rather than replacing it with a result list.
 *
 *   3. PERSONA AND DOMAIN ARE EXPLORATION DIMENSIONS. Both moved out of the global header and into
 *      this surface. A user does not become a persona; they read the same governed record through
 *      a lens, and they can change lens as often as they like without their identity changing.
 *      A lens REORDERS and never hides — that constraint is `ADR-045` and it survives unamended.
 *
 * ── Explore and Ask CogniX remain distinct ─────────────────────────────────
 * One input, two things it can do: Explore finds and organises deterministically; Ask CogniX
 * explains and reasons under the ATL-05/ATL-06 evidence rules. The reader is never asked to
 * understand which retrieval level they are using, but the boundary between "this is what the
 * registry contains" and "this is a reasoned answer with its evidence attached" is never blurred,
 * and Ask CogniX stays closed until it is asked for.
 *
 * Every capability string on this screen still arrives from `/api/v1/atlas/*` (ADR-046). This file
 * holds labels, layout and interaction state, and no capability knowledge whatsoever.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, X, Compass, Loader2, SlidersHorizontal, ChevronDown } from 'lucide-react';
import CapabilityCard, { type CardCapability } from './CapabilityCard';
import CapabilityDetail from './CapabilityDetail';
import AskCogniX from './AskCogniX';
import CapabilityLandscape from './CapabilityLandscape';
import ClarificationPanel from './ClarificationPanel';
import ExplorationContextBar, { type ContextRemoval } from './ExplorationContext';
import ClientPreparation from './ClientPreparation';
import PortfolioView from './PortfolioView';
import QuestionsWorthExploring from './QuestionsWorthExploring';
import {
  fetchCapabilities, fetchCapability, fetchDomains, fetchLandscape, searchAtlas,
  clarifyQuery, buildFilterQuery,
  type CapabilityListItem, type AtlasDomain, type AtlasSearchResponse, type AtlasLandscape
} from '@/lib/atlas-client';
import type {
  ResolvedCapability, AudienceLens, CapabilityType,
  ClarificationChoice, ClarificationResponse, ExplorationContext
} from '@/packages/contracts/src/capability-atlas-model';
import { LENS_PROFILES, LENS_NAME } from '@/lib/atlas/lens';

/**
 * The four Atlas reading modes. Deliberately a smaller vocabulary than the nineteen-entry product
 * persona catalogue: a persona is who the capability SERVES, a lens is who is READING. Collapsing
 * them would either invent a sales persona in the product or lose the Sales lens entirely.
 */
const LENSES: { id: AudienceLens; label: string }[] = [
  { id: 'innovation-executive', label: 'Innovation Executive' },
  { id: 'sales', label: 'Sales' },
  { id: 'architect', label: 'Architect' },
  { id: 'developer', label: 'Developer' }
];


/** Real questions, not keywords. These are the ATL-04 search acceptance queries. */
const EXAMPLE_QUERIES = [
  'What does CogniX have for promotions?',
  'why did the decision change',
  'What helps explain forecast uncertainty?',
  'what can I reuse outside retail',
  'how do I test Decision Gap',
  'capabilities for an architect'
];

const CAPABILITY_TYPES: CapabilityType[] = [
  'domain-capability', 'platform-capability', 'enabling-service', 'governance-control', 'experience'
];

type AtlasMode = 'explore' | 'portfolio' | 'questions';

const MODES: { id: AtlasMode; label: string; hint: string }[] = [
  { id: 'explore', label: 'Explore', hint: 'What can CogniX do?' },
  { id: 'portfolio', label: 'Portfolio', hint: 'What has CogniX built?' },
  { id: 'questions', label: 'Questions', hint: 'What is worth asking?' }
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

interface Props {
  onOpenSolution?: (solutionId: string) => void;
  onOpenExperiment?: (experimentId: string) => void;
}

export default function CapabilityAtlas({ onOpenSolution, onOpenExperiment }: Props = {}) {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [lens, setLens] = useState<AudienceLens | null>(null);
  const [mode, setMode] = useState<AtlasMode>('explore');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [all, setAll] = useState<CapabilityListItem[]>([]);
  const [domains, setDomains] = useState<AtlasDomain[]>([]);
  const [landscape, setLandscape] = useState<AtlasLandscape | null>(null);
  const [results, setResults] = useState<AtlasSearchResponse | null>(null);
  const [clarification, setClarification] = useState<ClarificationResponse | null>(null);
  const [clarifyStep, setClarifyStep] = useState(0);
  const [askSeed, setAskSeed] = useState<string | null>(null);
  /*
    Preparation is a FOCUSED WORKSPACE reached from the Atlas, not a fourth destination beside
    Explore, Portfolio and Questions. ATL-04R's central finding was that three destinations over one
    estate made them disagree; adding a fourth would repeat it. It is entered from the Atlas and
    returns to it, carrying the lens and whatever the reader had typed (§6, §35).
  */
  const [preparing, setPreparing] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResolvedCapability | null>(null);
  const [loading, setLoading] = useState(true);
  const [clarifying, setClarifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([fetchCapabilities(), fetchDomains(), fetchLandscape()])
      .then(([caps, doms, land]) => { setAll(caps); setDomains(doms); setLandscape(land); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  /*
    A lens re-orders the estate the reader is looking at, server-side. It is a re-fetch rather than
    a client-side sort because the ranking signals read authored knowledge the list response does
    not carry, and because ADR-045's "reorder, never filter" is enforced at the route (the response
    is a permutation of the same members). The unlensed list is restored when the lens is cleared.
  */
  useEffect(() => {
    const q = buildFilterQuery({ ...(lens ? { lens: [lens] } : {}) });
    fetchCapabilities(q).then(setAll).catch(() => {});
  }, [lens]);

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

  /**
   * One clarification step. Deterministic and provider-free, so this is the same call whether or
   * not a credential exists anywhere in the environment.
   */
  const step = useCallback(async (
    text: string,
    context: ExplorationContext | undefined,
    nextStep: number,
    answer?: { choices?: ClarificationChoice[]; refinement?: string }
  ) => {
    setClarifying(true); setError(null);
    try {
      const response = await clarifyQuery(text, context, nextStep, answer);
      setClarification(response);
      setClarifyStep(nextStep);
      // A lens the Atlas read from the reader's own words is applied, visibly, and is removable.
      if (response.context.lens && response.context.lens.value !== lens) {
        setLens(response.context.lens.value);
      }
      if (response.context.domain && !filters.domain.includes(response.context.domain.value)) {
        setFilters(f => ({ ...f, domain: [response.context.domain!.value] }));
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setClarifying(false);
    }
  }, [lens, filters.domain]);

  const ask = useCallback((text: string) => {
    const trimmed = text.trim();
    setQuery(trimmed);
    setSubmitted(trimmed);
    setMode('explore');
    setClarifyStep(0);
    if (trimmed) void step(trimmed, undefined, 0);
    else setClarification(null);
  }, [step]);

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

  const areaName = useCallback(
    (areaId: string) => landscape?.areas.find(a => a.area_id === areaId)?.name ?? areaId, [landscape]);
  const aspectLabel = useCallback((aspectId: string) => {
    for (const area of landscape?.areas ?? []) {
      const aspect = area.aspects.find(x => x.aspect_id === aspectId);
      if (aspect) return aspect.label;
    }
    return aspectId;
  }, [landscape]);
  const domainName = useCallback(
    (domainId: string) => domains.flatMap(d => d.items).find(i => i.id === domainId)?.name ?? domainId,
    [domains]);
  const problemLabel = useCallback(
    (id: string) => landscape?.business_problems.find(p => p.problem_id === id)?.label
      ?? id.replace(/^bp-/, '').replace(/-/g, ' '),
    [landscape]);

  function resetExploration() {
    setQuery(''); setSubmitted(''); setClarification(null); setClarifyStep(0);
    setFilters(EMPTY); setLens(null); setAskSeed(null);
  }

  function removeContext(removal: ContextRemoval) {
    if (!clarification) return;
    const ctx = clarification.context;
    let next: ExplorationContext = { ...ctx };
    if (removal.kind === 'area') {
      next = { ...next, areas: ctx.areas.filter(a => a.area_id !== removal.value),
               aspects: ctx.aspects.filter(a => a.area_id !== removal.value) };
    } else if (removal.kind === 'aspect') {
      next = { ...next, aspects: ctx.aspects.filter(a => a.aspect_id !== removal.value) };
    } else if (removal.kind === 'lens') {
      next = { ...next, lens: null }; setLens(null);
    } else if (removal.kind === 'domain') {
      next = { ...next, domain: null }; setFilters(f => ({ ...f, domain: [] }));
    } else {
      next = { ...next, refinements: ctx.refinements.filter(r => r !== removal.value) };
    }
    void step(submitted, next, clarifyStep);
  }

  if (preparing !== null) {
    return (
      <ClientPreparation
        lens={lens}
        seedBrief={preparing || null}
        onBack={() => setPreparing(null)}
        onOpenCapability={id => { setPreparing(null); void open(id); }}
      />
    );
  }

  if (selected) {
    return (
      <CapabilityDetail
        capability={selected}
        lens={lens}
        onBack={() => setSelected(null)}
        onOpenCapability={open}
        problemLabel={problemLabel}
        onPrepare={seed => { setSelected(null); setPreparing(seed); }}
      />
    );
  }

  const scope = clarification?.in_scope ?? [];
  const scoped = scope.length > 0 && clarification?.state !== 'insufficient-evidence';

  const shown: CardCapability[] = results
    ? results.results
        .filter(r => !scoped || scope.includes(r.capability_id))
        .map(r => {
          const identity = all.find(c => c.capability_id === r.capability_id);
          return {
            ...r,
            platform_reusable: identity?.platform_reusable,
            domains: identity?.domains,
            lens_signals: identity?.lens_signals
          };
        })
    : all.map(c => ({
        capability_id: c.capability_id, name: c.name, summary: c.summary, score: 0, matches: [],
        lifecycle_state: c.lifecycle_state, demo_maturity: c.demo_maturity,
        implementation_status: c.implementation_status, level: 'structured' as const,
        platform_reusable: c.platform_reusable, domains: c.domains, lens_signals: c.lens_signals
      }));

  const activeChips: { label: string; clear: () => void }[] = [];
  if (filters.domain.length) activeChips.push({ label: `Domain: ${domainName(filters.domain[0])}`, clear: () => setFilters(f => ({ ...f, domain: [] })) });
  if (filters.business_problem.length) activeChips.push({ label: `Problem: ${problemLabel(filters.business_problem[0])}`, clear: () => setFilters(f => ({ ...f, business_problem: [] })) });
  if (filters.persona.length) activeChips.push({ label: `Audience: ${filters.persona.join(', ')}`, clear: () => setFilters(f => ({ ...f, persona: [] })) });
  if (filters.capability_type.length) activeChips.push({ label: `Type: ${filters.capability_type[0].replace(/-/g, ' ')}`, clear: () => setFilters(f => ({ ...f, capability_type: [] })) });
  if (filters.demo_maturity.length) activeChips.push({ label: `Demo: ${filters.demo_maturity[0]}`, clear: () => setFilters(f => ({ ...f, demo_maturity: [] })) });
  if (filters.platform_reusable) activeChips.push({ label: 'Reusable across domains', clear: () => setFilters(f => ({ ...f, platform_reusable: undefined })) });

  const exploreDomains = domains.flatMap(d => d.items).filter(i => i.capability_count > 0);
  const futureDomains = domains.flatMap(d => d.items).filter(i => i.capability_count === 0).length;
  const noMatch = clarification?.state === 'insufficient-evidence';

  return (
    <div className="atlas">
      <header className="atlas-hero">
        <h1>What would you like to understand?</h1>
        <p>
          One place to understand what CogniX can do, what problems it addresses, how its
          capabilities relate, how mature they are and where they can be reused.
        </p>

        <div className="atlas-searchbar">
          <Search size={18} strokeWidth={1.75} color="var(--text-muted)" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') ask(query); }}
            placeholder="Ask about a problem, capability, client scenario, architecture or idea…"
            aria-label="Ask a question about CogniX capabilities"
          />
          {(query || submitted) && (
            <button
              type="button"
              onClick={resetExploration}
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
            <button key={q} type="button" className="atlas-example" onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>

        {clarification?.question && (
          <ClarificationPanel
            question={clarification.question}
            busy={clarifying}
            onChoose={choices => void step(submitted, clarification.context, clarifyStep + 1, { choices })}
            onFreeText={refinement => void step(submitted, clarification.context, clarifyStep + 1, { refinement })}
            onDismiss={() => setClarification({ ...clarification, question: null })}
          />
        )}

        {clarification && (
          <ExplorationContextBar
            context={clarification.context}
            areaName={areaName}
            aspectLabel={aspectLabel}
            domainName={domainName}
            lensName={l => LENS_NAME[l]}
            onRemove={removeContext}
            onReset={resetExploration}
          />
        )}

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
      </header>

      <nav className="atlas-modes" aria-label="Atlas views">
        {MODES.map(m => (
          <button
            key={m.id}
            type="button"
            className="atlas-mode"
            aria-pressed={mode === m.id}
            onClick={() => setMode(m.id)}
          >
            <span className="atlas-mode-label">{m.label}</span>
            <span className="atlas-mode-hint">{m.hint}</span>
          </button>
        ))}
      </nav>

      {mode === 'explore' && (
        <>
          <div className="atlas-dimensions">
            <div className="atlas-lensbar" role="group" aria-label="View through the lens of">
              <span className="atlas-dim-label">View through the lens of</span>
              {LENSES.map(l => (
                <button key={l.id} type="button" className="atlas-lens"
                  aria-pressed={lens === l.id}
                  onClick={() => setLens(lens === l.id ? null : l.id)}>
                  {l.label}
                </button>
              ))}
              {lens && (
                <span className="atlas-lens-note">
                  {LENS_PROFILES[lens].orientation} The facts do not change, and nothing is hidden.
                </span>
              )}
            </div>

            <div className="atlas-domainbar" role="group" aria-label="Domain">
              <span className="atlas-dim-label">In</span>
              {exploreDomains.map(d => (
                <button key={d.id} type="button" className="atlas-domain"
                  aria-pressed={filters.domain.includes(d.id)}
                  onClick={() => setFilters(f => ({ ...f, domain: f.domain.includes(d.id) ? [] : [d.id] }))}>
                  {d.name} <span className="atlas-domain-count">{d.capability_count}</span>
                </button>
              ))}
              <button type="button" className="atlas-domain"
                aria-pressed={filters.platform_reusable === true}
                onClick={() => setFilters(f => ({ ...f, platform_reusable: f.platform_reusable ? undefined : true }))}>
                Reusable beyond one domain
              </button>
              {futureDomains > 0 && (
                <span className="atlas-domain-future">
                  {futureDomains} further domains are catalogued with no capabilities assessed yet.
                </span>
              )}
            </div>
          </div>

          {/*
            ONE entry point on this surface, beside the dimensions rather than repeated across every
            card and every result. §35 warns against cluttering every surface with the same call to
            action, and the second entry lives on the capability detail where a reader has already
            decided a capability matters. Whatever the reader has typed travels with them, so the
            workspace does not ask again for something already on screen.
          */}
          <button type="button" className="atlas-prep-entry" onClick={() => setPreparing(submitted || query || '')}>
            <Compass size={15} strokeWidth={1.75} />
            <span>
              <strong>Prepare me for a client conversation</strong>
              <span className="atlas-prep-entry-hint">
                Governed capabilities, an honest demo sequence, and what you must not claim.
              </span>
            </span>
          </button>

          <div className="atlas-advanced">
            <button
              type="button"
              className="atlas-advanced-toggle"
              aria-expanded={advancedOpen}
              onClick={() => setAdvancedOpen(o => !o)}
            >
              <SlidersHorizontal size={13} strokeWidth={1.75} />
              Filters
              {activeChips.length > 0 && <span className="atlas-advanced-badge">{activeChips.length}</span>}
              <ChevronDown size={13} strokeWidth={2} className={advancedOpen ? 'atlas-advanced-caret atlas-advanced-caret--open' : 'atlas-advanced-caret'} />
            </button>

            {advancedOpen && (
              <div className="atlas-filters">
                <div className="atlas-filter">
                  <label htmlFor="f-domain">Domain</label>
                  <select id="f-domain" value={filters.domain[0] ?? ''}
                    onChange={e => setFilters(f => ({ ...f, domain: e.target.value ? [e.target.value] : [] }))}>
                    <option value="">Any domain</option>
                    {exploreDomains.map(i => (
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
                      <option key={b} value={b}>{problemLabel(b)}</option>
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
            <AskCogniX lens={lens} onOpenCapability={open} seedQuestion={askSeed} />
          </div>

          {landscape && (
            <CapabilityLandscape
              areas={landscape.areas}
              relevance={clarification?.area_relevance ?? []}
              inScope={scope}
              onOpenCapability={open}
              onExploreArea={areaId => {
                const area = landscape.areas.find(a => a.area_id === areaId);
                if (area) ask(area.name);
              }}
            />
          )}

          <div className="atlas-resultbar">
            <span className="atlas-resultcount">
              {loading
                ? 'Searching…'
                : <><strong>{shown.length}</strong> {shown.length === 1 ? 'capability' : 'capabilities'}
                    {submitted && <> for “{submitted}”</>}</>}
            </span>
            {!submitted && !activeChips.length && (
              <span className="atlas-resultcount" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Compass size={13} strokeWidth={1.75} /> Ranked by name — ask a question to organise them
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

          {noMatch && (
            <div className="atlas-empty atlas-empty--nomatch">
              <p>The Atlas could not confidently map that question to anything it holds.</p>
              <span>{results?.suggestion ?? 'Try naming a business problem, or browse the capability areas above.'}</span>
              <div className="atlas-empty-actions">
                <button type="button" onClick={() => setMode('questions')}>See questions worth asking</button>
                <button type="button" onClick={resetExploration}>Browse all capabilities</button>
                <button type="button" onClick={() => setAskSeed(submitted)}>Ask CogniX instead</button>
              </div>
            </div>
          )}

          {!loading && !noMatch && shown.length === 0 && (
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
        </>
      )}

      {mode === 'portfolio' && landscape && (
        <PortfolioView
          areas={landscape.areas}
          onOpenCapability={open}
          onExploreArea={areaId => {
            const area = landscape.areas.find(a => a.area_id === areaId);
            setMode('explore');
            if (area) ask(area.name);
          }}
        />
      )}

      {mode === 'questions' && landscape && (
        <QuestionsWorthExploring
          areas={landscape.areas}
          onOpenCapability={open}
          onExploreArea={areaId => {
            const area = landscape.areas.find(a => a.area_id === areaId);
            setMode('explore');
            if (area) ask(area.name);
          }}
          onAskAbout={question => { setMode('explore'); setAskSeed(question); }}
          onOpenSolution={id => onOpenSolution?.(id)}
          onOpenExperiment={id => onOpenExperiment?.(id)}
        />
      )}
    </div>
  );
}
