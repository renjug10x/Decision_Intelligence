'use client';

/**
 * Observability & Governance (SCI-06 / Wave-2)
 * ───────────────────────────────────────────────────────────────────────────────
 * Strengthened information architecture organised around the questions an enterprise
 * client asks, preserving the CogniX visual system, typography, colors, and layout.
 *
 * Four primary governed sections:
 *   1. Evidence & Signals — freshness, source, provenance, materiality, and Refresh lifecycle
 *   2. Models & Methods   — Calculated, Fitted, Drafted, Human mechanisms (ADR-082/ADR-067)
 *   3. Platform Health    — measurable estate health, Atlas record audit (ATL-FINAL)
 *   4. Decision Trace     — contextual explanation, reasoning chain, and decision state transitions
 *
 * Retained sections:
 *   - Architecture Storyboard — retained pending retirement under ADR-051 / SB-GATE
 *   - Platform Configuration  — plainly named controls for thresholds, autopilot, and scoping
 */

import React, { useState } from 'react';
import {
  Radio,
  Layers,
  Gauge,
  Activity,
  SlidersHorizontal,
  Network,
  AlertTriangle
} from 'lucide-react';
import ArchitectureExplorer from '@/components/ArchitectureExplorer';
import EvidenceSignalsSection from '@/components/observability/EvidenceSignalsSection';
import ModelsMethodsSection from '@/components/observability/ModelsMethodsSection';
import PlatformHealthSection from '@/components/observability/PlatformHealthSection';
import DecisionTraceView from '@/components/observability/DecisionTraceView';
import { useApp } from '@/lib/context';
import { useDecisionState } from '@/context/DecisionStateContext';
import { scenarioInScopeId } from '@/packages/contracts/src';

type SectionId = 'evidence' | 'methods' | 'health' | 'trace' | 'architecture' | 'configuration';

interface SectionDefinition {
  id: SectionId;
  label: string;
  question: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

const SECTIONS: SectionDefinition[] = [
  {
    id: 'evidence',
    label: 'Evidence & Signals',
    question: 'What evidence supports its intelligence, and what changed?',
    Icon: Radio
  },
  {
    id: 'methods',
    label: 'Models & Methods',
    question: 'Which method produced this, and where does AI contribute?',
    Icon: Layers
  },
  {
    id: 'health',
    label: 'Platform Health',
    question: 'How trustworthy is the record itself, and is the estate sound?',
    Icon: Gauge
  },
  {
    id: 'trace',
    label: 'Decision Trace',
    question: 'Why did CogniX recommend this, and did evidence change the decision?',
    Icon: Activity
  },
  {
    id: 'architecture',
    label: 'Architecture (retained)',
    question: 'How is the platform architected? (Storyboard retained pending SB-GATE)',
    Icon: Network
  },
  {
    id: 'configuration',
    label: 'Platform Configuration',
    question: 'Detection thresholds, human-in-the-loop, and scoping',
    Icon: SlidersHorizontal
  }
];

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
  const [section, setSection] = useState<SectionId>('evidence');

  const activeScenarioId = decisionState?.scenario_id ?? scenarioInScopeId();

  return (
    <div className="og">
      <header className="og-head">
        <h1>Observability &amp; Governance</h1>
        <p>
          Governed evidence, method provenance, platform health, and decision trace for enterprise retail stakeholders.
        </p>
      </header>

      {/* Primary Section Navigation */}
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

      {/* SECTION 1: Evidence & Signals */}
      {section === 'evidence' && (
        <section className="og-section" aria-label="Evidence and signals">
          <EvidenceSignalsSection scenarioId={activeScenarioId} />
        </section>
      )}

      {/* SECTION 2: Models & Methods */}
      {section === 'methods' && (
        <section className="og-section" aria-label="Models and methods">
          <ModelsMethodsSection scenarioId={activeScenarioId} />
        </section>
      )}

      {/* SECTION 3: Platform Health */}
      {section === 'health' && (
        <section className="og-section" aria-label="Platform health">
          {/*
            Atlas Health is a SECTION of Observability & Governance, never a separate destination
            (`ATL-FINAL` B6/B7). It is mounted once, inside Platform Health, and reachable there —
            a second hidden mount would double every health fetch and duplicate its element ids.
          */}
          <PlatformHealthSection />
        </section>
      )}

      {/* SECTION 4: Decision Trace */}
      {section === 'trace' && (
        <section className="og-section" aria-label="Decision trace">
          {/*
            Shared decision state and Journey telemetry — the live diagnostics `ATL-04R` moved out
            of About — are rendered by `DecisionTraceView` below, with the only controls in the
            product that refresh and reset decision state passed to it here.
          */}
          <DecisionTraceView
            scenarioId={activeScenarioId}
            refreshState={refreshState}
            resetScenario={resetScenario}
          />
        </section>
      )}

      {/* RETAINED SECTION: Architectural Storyboard (Under ADR-051 / SB-GATE) */}
      {section === 'architecture' && (
        <section className="og-section" aria-label="Architecture">
          <h2>How is the platform architected?</h2>
          <p className="og-lead">
            The authoritative account of how a CogniX capability works lives with the capability in the
            Capability Atlas. The storyboard below is retained until the SB-GATE retirement gate passes.
          </p>

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

      {/* PLAINLY NAMED SECTION: Platform Configuration */}
      {section === 'configuration' && (
        <section className="og-section" aria-label="Platform configuration">
          <h2>Platform Configuration &amp; Scoping</h2>
          <p className="og-lead">
            Operational detection thresholds, autonomous execution parameters, simulated scopes, and notification noise filters.
          </p>

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
    </div>
  );
}
