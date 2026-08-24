'use client';

/**
 * Observability & Governance (ATL-04R).
 *
 * The old Governance screen was six cards of settings. The old About module was five tabs, four of
 * which were live diagnostics for three separately-governed capabilities and one of which was the
 * Architectural Storyboard. Neither name described what was behind it, and the operational truth of
 * the platform — what it is actually doing, on what evidence — was scattered across both.
 *
 * This section is organised around the questions a reader actually arrives with rather than around
 * the screens the content used to live on. "Observability" leads the name because that is the
 * larger half: governance is the rules, observability is whether you can see them being followed.
 *
 * ── What was removed, and why that is a correction rather than a loss ───────
 * Three things on the old Governance screen asserted an operational reality that does not exist: a
 * hard-coded "3 Connected" badge over three named webhooks that are connected to nothing, two
 * read-only fields displaying a Looker host and an API client identifier for an instance the estate
 * does not integrate with, and a cache-invalidation button whose implementation was a 1500ms timer.
 * None of that was knowledge, so none of it was migrated. `cap-governance-settings.ts` already
 * records access scoping as simulated and carries a mandatory warning that it must not be presented
 * as enforced authorisation — this surface states that in the interface rather than only in the
 * record.
 *
 * ── The controls that remain are the ones that bind ─────────────────────────
 * Every control below writes to real application state that other surfaces read. A control wired to
 * nothing is worse than a missing control: it teaches the reader that the settings do not matter.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ShieldCheck, Activity, Layers, Network, Radio, SlidersHorizontal,
  Loader2, RefreshCw, AlertTriangle, Gauge
} from 'lucide-react';
import ArchitectureExplorer from '@/components/ArchitectureExplorer';
import AtlasHealth from '@/components/AtlasHealth';
import { useApp } from '@/lib/context';
import { useDecisionState } from '@/context/DecisionStateContext';
import { fetchLandscape, type AtlasLandscape } from '@/lib/atlas-client';

type SectionId = 'governed' | 'evidence' | 'architecture' | 'estate' | 'health' | 'signals' | 'observable';

const SECTIONS: { id: SectionId; label: string; question: string; Icon: typeof ShieldCheck }[] = [
  { id: 'governed', label: 'Platform governance', question: 'How is CogniX governed?', Icon: ShieldCheck },
  { id: 'evidence', label: 'Evidence & provenance', question: 'What evidence supports its intelligence?', Icon: Layers },
  { id: 'architecture', label: 'Architecture', question: 'How is the platform architected?', Icon: Network },
  { id: 'estate', label: 'Capability lifecycle', question: 'What is implemented, simulated or experimental?', Icon: SlidersHorizontal },
  { id: 'health', label: 'Atlas health', question: 'How trustworthy is the record itself?', Icon: Gauge },
  { id: 'signals', label: 'Data & signals', question: 'What data and signals are being used?', Icon: Radio },
  { id: 'observable', label: 'Decision observability', question: 'What is observable right now?', Icon: Activity }
];

/** A capability whose surface is real but whose behaviour is not, stated rather than implied. */
function SimulatedNotice({ children }: { children: React.ReactNode }) {
  return (
    <p className="og-simulated">
      <AlertTriangle size={13} strokeWidth={2} />
      <span>{children}</span>
    </p>
  );
}

function Toggle({
  label, hint, checked, onChange
}: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="og-toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="og-toggle-body">
        <span className="og-toggle-label">{label}</span>
        <span className="og-toggle-hint">{hint}</span>
      </span>
    </label>
  );
}

function Slider({
  label, hint, value, min, max, stepBy, format, onChange, disabled = false
}: {
  label: string; hint: string; value: number; min: number; max: number; stepBy: number;
  format: (v: number) => string; onChange: (v: number) => void; disabled?: boolean;
}) {
  const id = `og-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className={`og-slider${disabled ? ' og-slider--off' : ''}`}>
      <div className="og-slider-head">
        <label htmlFor={id}>{label}</label>
        <span className="og-slider-value">{format(value)}</span>
      </div>
      <input
        id={id} type="range" min={min} max={max} step={stepBy} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
      />
      <p className="og-slider-hint">{hint}</p>
    </div>
  );
}

export default function ObservabilityGovernance() {
  const {
    wowDeclineThreshold, setWowDeclineThreshold,
    wasteSpikeThreshold, setWasteSpikeThreshold,
    aiAutopilot, setAiAutopilot,
    aiConfidenceThreshold, setAiConfidenceThreshold,
    geminiTemperature, setGeminiTemperature,
    muteNotificationNoise, setMuteNotificationNoise,
    userAttributeStoreScope, setUserAttributeStoreScope,
    userAttributeCategoryScope, setUserAttributeCategoryScope
  } = useApp();
  const { decisionState, refreshState, resetScenario } = useDecisionState();

  const [section, setSection] = useState<SectionId>('governed');
  const [landscape, setLandscape] = useState<AtlasLandscape | null>(null);
  const [grounding, setGrounding] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    fetchLandscape().then(setLandscape).catch(() => setLandscape(null));
    fetch('/api/v1/atlas/grounding', { headers: { Accept: 'application/json' } })
      .then(r => r.json()).then(p => setGrounding(p.data)).catch(() => setGrounding(null));
  }, []);

  const loadEvents = useCallback(async () => {
    setBusy('events');
    try {
      const res = await fetch('/api/v1/journey/events?limit=30');
      const json = await res.json();
      setEvents(Array.isArray(json.data) ? json.data : []);
    } catch { setEvents([]); } finally { setBusy(null); }
  }, []);

  const loadSignals = useCallback(async () => {
    setBusy('signals');
    try {
      const res = await fetch('/api/v1/signals?tenant_id=tenant_uk_retail_01');
      const json = await res.json();
      setSignals(Array.isArray(json.data) ? json.data : []);
    } catch { setSignals([]); } finally { setBusy(null); }
  }, []);

  useEffect(() => {
    if (section === 'observable' && events.length === 0) void loadEvents();
    if (section === 'signals' && signals.length === 0) void loadSignals();
  }, [section, events.length, signals.length, loadEvents, loadSignals]);

  const members = landscape?.areas.flatMap(a => a.members) ?? [];
  const notReal = members.filter(m => m.implementation_status !== 'implemented');

  return (
    <div className="og">
      <header className="og-head">
        <h1>Observability &amp; Governance</h1>
        <p>
          How CogniX is governed, what evidence stands behind its reasoning, what is genuinely
          implemented, and what the platform is doing right now.
        </p>
      </header>

      <nav className="og-nav" aria-label="Observability and governance sections">
        {SECTIONS.map(s => (
          <button
            key={s.id}
            type="button"
            className="og-navitem"
            aria-pressed={section === s.id}
            onClick={() => setSection(s.id)}
          >
            <s.Icon size={14} strokeWidth={1.75} />
            <span className="og-navitem-body">
              <span className="og-navitem-label">{s.label}</span>
              <span className="og-navitem-question">{s.question}</span>
            </span>
          </button>
        ))}
      </nav>

      {section === 'governed' && (
        <section className="og-section" aria-label="Platform governance">
          <h2>How is CogniX governed?</h2>

          <div className="og-cards">
            <article className="og-card">
              <h3>Detection thresholds</h3>
              <p className="og-card-lead">
                When CogniX treats a movement as worth raising. These bind: the values below are read
                by the anomaly surfaces.
              </p>
              <Slider
                label="Week-on-week sales decline" hint="Raises a decision when regional or store revenue falls past this."
                value={wowDeclineThreshold} min={5} max={20} stepBy={1}
                format={v => `${v}% decline`} onChange={setWowDeclineThreshold}
              />
              <Slider
                label="Fresh spoilage spike" hint="Raises a decision when discard volume rises past this week on week."
                value={wasteSpikeThreshold} min={5} max={25} stepBy={1}
                format={v => `+${v}% waste`} onChange={setWasteSpikeThreshold}
              />
            </article>

            <article className="og-card">
              <h3>Human in the loop</h3>
              <p className="og-card-lead">
                Whether CogniX may resolve anything without a person, and how sure it must be first.
              </p>
              <Toggle
                label="Autonomous resolution"
                hint="Off by default. When off, every recommendation waits for a person."
                checked={aiAutopilot} onChange={setAiAutopilot}
              />
              <Slider
                label="Minimum confidence to auto-resolve"
                hint="Applies only while autonomous resolution is on."
                value={aiConfidenceThreshold} min={50} max={90} stepBy={5}
                format={v => `${v}%`} onChange={setAiConfidenceThreshold} disabled={!aiAutopilot}
              />
              <Slider
                label="Reasoning variability"
                hint="Lower values keep explanation wording closer to the governed record."
                value={geminiTemperature} min={0} max={1} stepBy={0.1}
                format={v => v.toFixed(1)} onChange={setGeminiTemperature}
              />
            </article>

            <article className="og-card">
              <h3>Access scoping</h3>
              <p className="og-card-lead">
                Which slice of the estate a decision surface is scoped to.
              </p>
              <SimulatedNotice>
                This is a <strong>simulation of scoping, not enforced authorisation</strong>. It changes
                what the demonstration surfaces show; it does not restrict what anyone may access. It
                must never be presented as an access control.
              </SimulatedNotice>
              <div className="og-scopes">
                <label>
                  <span>Store scope</span>
                  <select value={userAttributeStoreScope} onChange={e => setUserAttributeStoreScope(e.target.value)}>
                    <option value="All">All stores</option>
                    <option value="S001">S001 — Manchester Piccadilly</option>
                    <option value="S002">S002 — Manchester Trafford</option>
                    <option value="S004">S004 — Liverpool Central</option>
                    <option value="S015">S015 — London Shoreditch</option>
                  </select>
                </label>
                <label>
                  <span>Category scope</span>
                  <select value={userAttributeCategoryScope} onChange={e => setUserAttributeCategoryScope(e.target.value)}>
                    <option value="All">All categories</option>
                    <option value="Chilled Foods">Chilled Foods</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Produce">Produce</option>
                    <option value="Bakery">Bakery</option>
                  </select>
                </label>
              </div>
            </article>

            <article className="og-card">
              <h3>Notification noise</h3>
              <p className="og-card-lead">What reaches a person, and what is held back.</p>
              <Toggle
                label="Silence medium-severity findings"
                hint="Only high-severity findings raise a notification."
                checked={muteNotificationNoise} onChange={setMuteNotificationNoise}
              />
            </article>
          </div>
        </section>
      )}

      {section === 'evidence' && (
        <section className="og-section" aria-label="Evidence and provenance">
          <h2>What evidence supports its intelligence?</h2>
          <p className="og-lead">
            CogniX separates what it holds from what it retrieved and what it reasoned. The rules below
            govern when anything outside the estate may be admitted at all.
          </p>
          {grounding ? (
            <div className="og-evidence">
              <div className="og-kv">
                <span>External grounding</span>
                <strong>{grounding.enabled ? 'Available' : 'Not available in this environment'}</strong>
              </div>
              {grounding.policy && (
                <>
                  <div className="og-kv">
                    <span>Requires explicit opt-in</span>
                    <strong>{String(grounding.policy.user_initiated ?? true)}</strong>
                  </div>
                  <div className="og-kv">
                    <span>Admissible source tiers</span>
                    <strong>{(grounding.policy.admissible_tiers ?? []).join(', ') || 'not recorded'}</strong>
                  </div>
                </>
              )}
              <p className="og-note">
                Full policy, source admission rules and the rejection ledger are published at
                <code>/api/v1/atlas/grounding</code>, and every Ask CogniX answer carries its evidence
                classes with it.
              </p>
            </div>
          ) : (
            <p className="og-note">Grounding policy could not be read.</p>
          )}
        </section>
      )}

      {section === 'architecture' && (
        <section className="og-section" aria-label="Architecture">
          <h2>How is the platform architected?</h2>
          <p className="og-lead">
            The authoritative account of how a CogniX capability works lives with the capability, in the
            Capability Atlas: its architecture narrative, its flow, its contracts and the code that
            implements it are fields of a governed record rather than a drawing of one.
          </p>

          {/*
            The Architectural Storyboard is RETAINED here deliberately, and its retention is a
            governance outcome rather than an oversight. `SB-GATE` requires six preservation
            conditions before the storyboard may be retired, and the `ATL-01` migration assessment
            records that only the first is met. The charter's rule is explicit: if the gate cannot be
            met, the storyboard remains and the Atlas coexists with it.

            What `ATL-04R` changes is where it lives. It was the DEFAULT tab of a module called
            "About", which made a retired, simulated presentation the first thing a reader met. Moving
            it here — reachable from governance, clearly labelled, no longer the front door —
            advances SB-GATE-3 without pretending the remaining gates are closed.
          */}
          <div className="og-storyboard">
            <div className="og-storyboard-notice">
              <AlertTriangle size={13} strokeWidth={2} />
              <span>
                <strong>Retained pending retirement.</strong> This storyboard is recorded as{' '}
                <em>Retired</em> in the capability registry and its implementation is simulated. It is
                kept reachable because the storyboard retirement gate is not yet satisfied — several
                units of its knowledge do not yet exist at their destinations. Figures shown on its
                slides are illustrative and are not supported by measurement.
              </span>
            </div>
            <ArchitectureExplorer />
          </div>
        </section>
      )}

      {section === 'estate' && (
        <section className="og-section" aria-label="Capability lifecycle">
          <h2>What is implemented, simulated or experimental?</h2>
          {landscape ? (
            <>
              <div className="og-estate-summary">
                <div className="og-stat">
                  <strong>{members.length}</strong>
                  <span>governed capabilities</span>
                </div>
                <div className="og-stat">
                  <strong>{members.length - notReal.length}</strong>
                  <span>fully implemented</span>
                </div>
                <div className="og-stat">
                  <strong>{notReal.length}</strong>
                  <span>simulated, partial or experimental</span>
                </div>
                <div className="og-stat">
                  <strong>{landscape.areas.length}</strong>
                  <span>capability areas</span>
                </div>
              </div>

              <div className={`og-validation${landscape.validation.valid ? '' : ' og-validation--bad'}`}>
                <strong>Landscape integrity</strong>
                {landscape.validation.valid
                  ? ' — every registered capability belongs to exactly one area, so nothing is unreachable and nothing is double-counted.'
                  : ` — ${landscape.validation.errors.length} issues. The landscape is not currently a partition of the registry.`}
              </div>

              <table className="og-table">
                <caption>Capabilities not fully implemented</caption>
                <thead>
                  <tr><th>Capability</th><th>Implementation</th><th>Lifecycle</th><th>Demonstrable</th></tr>
                </thead>
                <tbody>
                  {notReal.map(m => (
                    <tr key={m.capability_id}>
                      <td>{m.name}</td>
                      <td><span className={`og-status og-status--${m.implementation_status}`}>{m.implementation_status.replace(/-/g, ' ')}</span></td>
                      <td>{m.lifecycle_state ?? 'not owned'}</td>
                      <td>{m.demo_maturity ?? 'no surface'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="og-note">
                These three dimensions are kept apart deliberately. A capability can be ready to
                demonstrate and only partly built; collapsing them into one badge would let a demo
                surface be read as production implementation.
              </p>
            </>
          ) : (
            <p className="og-note">The capability landscape could not be read.</p>
          )}
        </section>
      )}

      {section === 'health' && (
        <section className="og-section" aria-label="Atlas health">
          <h2>How trustworthy is the record itself?</h2>
          <p className="og-lead">
            Every other section on this page reads the capability records. This one audits them. The
            checks below run server-side on request against the same governance engine as{' '}
            <code>scripts/atlas-governance-check.ts</code>, and they only ever flag — nothing here can
            promote a capability, close a gap or change a lifecycle state.
          </p>
          <AtlasHealth />
        </section>
      )}

      {section === 'signals' && (
        <section className="og-section" aria-label="Data and signals">
          <h2>What data and signals are being used?</h2>
          <p className="og-lead">
            Canonical Enterprise Signal snapshots, produced deterministically by Enterprise World. Each
            carries its own provenance and states whether it is synthetic.
          </p>
          <button type="button" className="og-refresh" onClick={loadSignals} disabled={busy === 'signals'}>
            {busy === 'signals' ? <Loader2 size={13} className="atlas-spin" /> : <RefreshCw size={13} />}
            Refresh signals
          </button>
          {signals.length === 0 ? (
            <p className="og-empty">No enterprise signals retrieved.</p>
          ) : (
            <ul className="og-signals">
              {signals.map((sig: any) => (
                <li key={sig.signal_id}>
                  <div className="og-signal-head">
                    <span className="og-signal-type">[{sig.category}] {sig.signal_type}</span>
                    <span className="og-signal-delta">{sig.delta_pct > 0 ? `+${sig.delta_pct}` : sig.delta_pct}%</span>
                  </div>
                  <div className="og-signal-meta">
                    <span>{sig.entity_type} ({sig.entity_id})</span>
                    <span>baseline {sig.baseline_value} · observed {sig.observed_value} {sig.unit}</span>
                    <span>{sig.source_type} · {sig.source_system}</span>
                  </div>
                  <div className="og-signal-prov">
                    Confidence {sig.confidence} · quality {sig.quality}
                    {sig.synthetic_demo ? ' · synthetic' : ''}
                    {sig.provenance?.rule ? ` · rule ${sig.provenance.rule}` : ''}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {section === 'observable' && (
        <section className="og-section" aria-label="Decision observability">
          <h2>What is observable right now?</h2>

          <div className="og-observe">
            <article className="og-card">
              <h3>Shared decision state</h3>
              <p className="og-card-lead">
                The authoritative, versioned state every decision surface reads, with the transitions
                that produced it.
              </p>
              <div className="og-actions">
                <button type="button" onClick={refreshState}>Refresh state</button>
                <button type="button" onClick={resetScenario}>Reset to baseline</button>
              </div>
              {decisionState ? (
                <>
                  <div className="og-kv"><span>State</span><strong>{decisionState.decision_state_id}</strong></div>
                  <div className="og-kv"><span>Version</span><strong>v{decisionState.state_version}</strong></div>
                  <div className="og-kv"><span>Scenario</span><strong>{decisionState.scenario_id}</strong></div>
                  <div className="og-kv">
                    <span>Transitions</span><strong>{decisionState.history?.length ?? 0}</strong>
                  </div>
                  {(decisionState.history ?? []).slice(-6).map((h: any) => (
                    <div key={`${h.version}-${h.timestamp}`} className="og-transition">
                      <span className="og-transition-v">v{h.version}</span>
                      <span className="og-transition-cmd">{h.command_type}</span>
                      <span className="og-transition-fields">{(h.changed_fields ?? []).join(', ')}</span>
                    </div>
                  ))}
                </>
              ) : (
                <p className="og-empty">No active decision state found.</p>
              )}
            </article>

            <article className="og-card">
              <h3>Journey telemetry</h3>
              <p className="og-card-lead">
                Recent canonical journey events. A diagnostic ring buffer held in memory, not an
                analytics store.
              </p>
              <div className="og-actions">
                <button type="button" onClick={loadEvents} disabled={busy === 'events'}>
                  {busy === 'events' ? 'Refreshing…' : 'Refresh events'}
                </button>
              </div>
              {events.length === 0 ? (
                <p className="og-empty">
                  No telemetry captured yet. Explore CogniX to generate observable decision intent.
                </p>
              ) : (
                <ul className="og-events">
                  {events.map((evt: any, i: number) => (
                    <li key={evt.event_id ?? i}>
                      <span className="og-event-type">
                        #{evt.sequence_number ?? i + 1} {evt.event_type}
                      </span>
                      <span className="og-event-meta">
                        {evt.source} · {evt.page ?? '—'}
                        {evt.timestamp ? ` · ${new Date(evt.timestamp).toLocaleTimeString()}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </section>
      )}
    </div>
  );
}
