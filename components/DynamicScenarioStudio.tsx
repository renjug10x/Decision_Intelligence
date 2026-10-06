'use client';

import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Crosshair,
  Hammer,
  Compass,
  Radio,
  GitBranch,
  ArrowLeftRight,
  RotateCcw,
  Check,
  Loader2,
  ShieldCheck,
  Play,
  ArrowUpRight
} from 'lucide-react';
import {
  getActiveScenario,
  resolveScenario,
  isScenarioRegistered,
  projectScenarioFromServer,
  syncActiveScenario
} from '@/lib/scenario-client-registry';
import {
  fetchScenarioCatalogue,
  activateScenarioOnServer,
  deleteScenarioOnServer,
  isGovernedReferenceScenario,
  type ScenarioCatalogueEntry
} from '@/lib/world-client';
import {
  fetchAuthoritativeScenarioDecision,
  type AuthoritativeScenarioDecision
} from '@/lib/canonical-decision-reconciliation';
import { useDecisionState } from '@/context/DecisionStateContext';
import { useCurrency } from '@/context/CurrencyContext';
import { getOrCreateSessionId } from '@/lib/journey-client';
import ScenarioSelectorModal from '@/components/ScenarioSelectorModal';
import ScenarioAuthoringStudio, {
  type ScenarioRevisionTarget
} from '@/components/scenario-authoring/ScenarioAuthoringStudio';
import { STUDIO_COMPETITIVE_WHAT_IF_HANDOFF_KEY } from '@/lib/competitive-price-response';

export type StudioAreaId = 'build' | 'explore' | 'observe' | 'discover';

export type ScenarioProvenanceKind =
  | 'curated_pack'
  | 'created_by_you'
  | 'uploaded_evidence'
  | 'suggested_from_observations'
  | 'derived_from_pattern';

export interface ScenarioProvenanceDescriptor {
  kind: ScenarioProvenanceKind;
  label: string;
  description: string;
  implemented: boolean;
}

/**
 * Extensible provenance presentation model for Dynamic Scenario Studio.
 * Only `curated_pack`, `created_by_you`, and `uploaded_evidence` are assigned to live scenarios today.
 * `suggested_from_observations` and `derived_from_pattern` define the structural extension contract
 * for future Observe and Discover capabilities without fabricating active intelligence.
 */
export const SCENARIO_PROVENANCE_FOUNDATION: Record<
  ScenarioProvenanceKind,
  ScenarioProvenanceDescriptor
> = {
  curated_pack: {
    kind: 'curated_pack',
    label: 'Governed reference pack',
    description: 'Pre-certified retail decision scenario from the CogniX reference catalogue.',
    implemented: true
  },
  created_by_you: {
    kind: 'created_by_you',
    label: 'Created by you',
    description: 'Authored from business conditions and confirmed through the certification gate.',
    implemented: true
  },
  uploaded_evidence: {
    kind: 'uploaded_evidence',
    label: 'Built from uploaded evidence',
    description: 'Admitted from attested CSV figures mapped into a governed scenario draft.',
    implemented: true
  },
  suggested_from_observations: {
    kind: 'suggested_from_observations',
    label: 'Suggested from observations',
    description:
      'Architectural extension for scenarios initiated from operational or market signal movements.',
    implemented: false
  },
  derived_from_pattern: {
    kind: 'derived_from_pattern',
    label: 'Derived from an emerging pattern',
    description:
      'Architectural extension for scenarios framed from cross-signal relationships or variance patterns.',
    implemented: false
  }
};

interface StudioAreaSpec {
  id: StudioAreaId;
  title: string;
  description: string;
  statusLabel: string;
  implemented: boolean;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export const STUDIO_AREAS: StudioAreaSpec[] = [
  {
    id: 'build',
    title: 'Build',
    description:
      'Create scenarios using business conditions, assumptions and the existing governed authoring capability.',
    statusLabel: 'Active capability',
    implemented: true,
    Icon: Hammer
  },
  {
    id: 'explore',
    title: 'Explore',
    description: 'Modify conditions and understand how the decision responds.',
    statusLabel: 'Active capability',
    implemented: true,
    Icon: Compass
  },
  {
    id: 'observe',
    title: 'Observe',
    description: 'Foundation for relevant operational, market and industry signals.',
    statusLabel: 'Architectural foundation',
    implemented: false,
    Icon: Radio
  },
  {
    id: 'discover',
    title: 'Discover',
    description:
      'Foundation for future relationships, correlations, ML observations and emerging scenario opportunities.',
    statusLabel: 'Architectural foundation',
    implemented: false,
    Icon: GitBranch
  }
];

interface DynamicScenarioStudioProps {
  onNavigate?: (page: string) => void;
}

export default function DynamicScenarioStudio({ onNavigate }: DynamicScenarioStudioProps) {
  const { decisionState, resetScenario, refreshState } = useDecisionState();
  const { money } = useCurrency();

  const [focusedArea, setFocusedArea] = useState<StudioAreaId>('build');
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [restartPhase, setRestartPhase] = useState<'idle' | 'working' | 'done'>('idle');
  const [catalogue, setCatalogue] = useState<ScenarioCatalogueEntry[]>([]);
  const [decision, setDecision] = useState<AuthoritativeScenarioDecision | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [attestedScenarioIds, setAttestedScenarioIds] = useState<Record<string, boolean>>({});
  const [competitiveScenarioIds, setCompetitiveScenarioIds] = useState<Record<string, true>>({});
  const [revisionTarget, setRevisionTarget] = useState<ScenarioRevisionTarget | null>(null);
  const [deletedTargetId, setDeletedTargetId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<ScenarioCatalogueEntry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const activeScenario = (() => {
    try {
      if (decisionState?.scenario_id && isScenarioRegistered(decisionState.scenario_id)) {
        return resolveScenario(decisionState.scenario_id);
      }
      return getActiveScenario();
    } catch {
      return getActiveScenario();
    }
  })();

  const { identity, calendar, supply } = activeScenario;

  const loadStudioState = useCallback(async (scenarioId: string) => {
    setEvaluating(true);
    try {
      const [catRes, evalRes] = await Promise.all([
        fetchScenarioCatalogue().catch(() => null),
        fetchAuthoritativeScenarioDecision(scenarioId).catch(() => null)
      ]);
      if (catRes?.scenarios) {
        setCatalogue(catRes.scenarios);
      }
      if (evalRes) {
        setDecision(evalRes);
      }
    } finally {
      setEvaluating(false);
    }
  }, []);

  useEffect(() => {
    void loadStudioState(identity.scenario_id);
  }, [identity.scenario_id, loadStudioState]);

  const rememberCompetitiveScenarios = useCallback((scenarioIds: string[]) => {
    if (scenarioIds.length === 0) return;
    setCompetitiveScenarioIds(prev => {
      let changed = false;
      const next = { ...prev };
      for (const id of scenarioIds) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const rememberAttestedScenarios = useCallback((scenarioIds: string[]) => {
    if (scenarioIds.length === 0) return;
    setAttestedScenarioIds(prev => {
      let changed = false;
      const next = { ...prev };
      for (const id of scenarioIds) {
        if (!next[id]) {
          next[id] = true;
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, []);

  const handleRestart = async () => {
    if (restartPhase === 'working') return;
    setRestartPhase('working');
    try {
      await fetch('/api/v1/campaigns/decision-session/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_id: decisionState?.tenant_id || 'tenant_uk_retail_01',
          session_id: getOrCreateSessionId()
        })
      }).catch(() => null);

      await resetScenario();
      await loadStudioState(identity.scenario_id);
      setRestartPhase('done');
      setTimeout(() => setRestartPhase('idle'), 2000);
    } catch {
      setRestartPhase('idle');
    }
  };

  const handleActivateScenario = async (scenarioId: string) => {
    if (activatingId || scenarioId === identity.scenario_id) return;
    setActivatingId(scenarioId);
    try {
      const res = await activateScenarioOnServer(scenarioId, getOrCreateSessionId());
      if (res.success) {
        await projectScenarioFromServer(scenarioId);
        syncActiveScenario(scenarioId);
        await refreshState();
        await loadStudioState(scenarioId);
      }
    } finally {
      setActivatingId(null);
    }
  };

  const handleScenarioConfirmed = (confirmed: {
    scenario: { scenario_id: string };
    superseded_scenario_id?: string | null;
    draft: {
      scenario_id: string;
      inputs: { situation?: string };
      field_provenance?: Array<{ descriptor: { origin: string } }>;
    };
  }) => {
    setRevisionTarget(null);
    const hasAttested = (confirmed.draft.field_provenance ?? []).some(
      p => p.descriptor.origin === 'attested'
    );
    setAttestedScenarioIds(prev => {
      const next = { ...prev };
      if (confirmed.superseded_scenario_id) {
        delete next[confirmed.superseded_scenario_id];
      }
      if (hasAttested) {
        next[confirmed.scenario.scenario_id] = true;
      }
      return next;
    });
    setCompetitiveScenarioIds(prev => {
      const next = { ...prev };
      if (confirmed.superseded_scenario_id) {
        delete next[confirmed.superseded_scenario_id];
      }
      if (confirmed.draft.inputs.situation === 'COMPETITIVE_PRICE_RESPONSE') {
        next[confirmed.scenario.scenario_id] = true;
      }
      return next;
    });
    void loadStudioState(identity.scenario_id);
  };

  const handleEditScenario = (item: ScenarioCatalogueEntry) => {
    if (isGovernedReferenceScenario(item.scenario_id)) return;
    setFocusedArea('build');
    setRevisionTarget({
      targetId: item.scenario_id,
      targetName: item.scenario_name,
      requestedAt: Date.now()
    });
    const el = document.getElementById('dss-area-build');
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleRequestDeleteScenario = (item: ScenarioCatalogueEntry) => {
    if (isGovernedReferenceScenario(item.scenario_id)) return;
    setDeleteError(null);
    setDeleteCandidate(item);
  };

  const handleConfirmDeleteScenario = async () => {
    if (!deleteCandidate || deleting) return;
    const targetId = deleteCandidate.scenario_id;
    const wasCurrent = targetId === identity.scenario_id;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteScenarioOnServer(targetId, getOrCreateSessionId());
      if (!res.success) {
        setDeleteError(res.error || 'CogniX could not remove this scenario.');
        return;
      }
      setDeleteCandidate(null);
      setDeletedTargetId(targetId);
      if (revisionTarget?.targetId === targetId) {
        setRevisionTarget(null);
      }
      setAttestedScenarioIds(prev => {
        if (!prev[targetId]) return prev;
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      setCompetitiveScenarioIds(prev => {
        if (!prev[targetId]) return prev;
        const next = { ...prev };
        delete next[targetId];
        return next;
      });
      const nextActiveId = res.active_scenario_id || identity.scenario_id;
      const shouldSwitchActive = Boolean(
        res.was_active ||
          wasCurrent ||
          (res.active_scenario_id && res.active_scenario_id !== identity.scenario_id)
      );
      if (shouldSwitchActive) {
        try {
          window.sessionStorage.removeItem(STUDIO_COMPETITIVE_WHAT_IF_HANDOFF_KEY);
        } catch {
          // ignore storage errors
        }
        await projectScenarioFromServer(nextActiveId);
        syncActiveScenario(nextActiveId);
        await refreshState();
      }
      await loadStudioState(shouldSwitchActive ? nextActiveId : identity.scenario_id);
    } finally {
      setDeleting(false);
    }
  };

  const openCompetitivePriceResponse = () => {
    window.sessionStorage.setItem(STUDIO_COMPETITIVE_WHAT_IF_HANDOFF_KEY, '1');
    onNavigate?.('solution-promo');
  };

  const resolveProvenance = (item: ScenarioCatalogueEntry): ScenarioProvenanceDescriptor => {
    if (attestedScenarioIds[item.scenario_id]) {
      return SCENARIO_PROVENANCE_FOUNDATION.uploaded_evidence;
    }
    if (!isGovernedReferenceScenario(item.scenario_id)) {
      return SCENARIO_PROVENANCE_FOUNDATION.created_by_you;
    }
    return SCENARIO_PROVENANCE_FOUNDATION.curated_pack;
  };

  const contextFields = [
    { label: 'Product', value: identity?.sku_name },
    { label: 'Category', value: identity?.category },
    { label: 'Geographic scope', value: identity?.market_scope_label },
    { label: 'Focus region', value: identity?.focus_region },
    { label: 'Supplier', value: supply?.supplier_name },
    {
      label: 'Horizon',
      value: calendar?.forecast_horizon_days ? `${calendar.forecast_horizon_days} days` : undefined
    },
    { label: 'Current scenario', value: identity?.scenario_name }
  ].filter((f): f is { label: string; value: string } => Boolean(f.value));

  return (
    <div className="dss-page">
      {/* Studio Header */}
      <header className="dss-header">
        <div className="dss-header-top">
          <div>
            <div className="dss-eyebrow">Scenario Intelligence Workspace</div>
            <h1 className="dss-title">Dynamic Scenario Studio</h1>
            <p className="dss-subtitle">
              Explore how changing conditions could reshape this decision.
            </p>
          </div>

          <div className="dss-header-actions">
            <button
              type="button"
              className="dss-action-btn"
              onClick={() => setSelectorOpen(true)}
            >
              <ArrowLeftRight size={13} strokeWidth={1.85} />
              <span>Change decision</span>
            </button>
            <button
              type="button"
              className="dss-action-btn"
              onClick={handleRestart}
              disabled={restartPhase === 'working'}
            >
              {restartPhase === 'working' && <Loader2 size={13} className="spin" />}
              {restartPhase === 'done' && <Check size={13} color="var(--success, #16A34A)" />}
              {restartPhase === 'idle' && <RotateCcw size={13} strokeWidth={1.85} />}
              <span>{restartPhase === 'done' ? 'Reset complete' : 'Restart scenario'}</span>
            </button>
          </div>
        </div>

        {/* Active Decision Context Bar */}
        <div className="dss-decision-strip" aria-label="Active decision details">
          <div className="dss-decision-primary">
            <Crosshair size={14} strokeWidth={1.85} color="var(--g10x-orange)" />
            <span className="dss-decision-label">This decision:</span>
            <strong className="dss-decision-sku">{identity.sku_name}</strong>
          </div>
          <dl className="dss-decision-facts">
            {contextFields.map(field => (
              <div key={field.label} className="dss-decision-fact">
                <dt>{field.label}</dt>
                <dd>{field.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Four Conceptual Areas */}
      <nav className="dss-pillars" aria-label="Dynamic Scenario Studio areas">
        {STUDIO_AREAS.map(area => {
          const isSelected = focusedArea === area.id;
          return (
            <button
              key={area.id}
              type="button"
              className={`dss-pillar-card${isSelected ? ' is-selected' : ''}${
                !area.implemented ? ' is-foundation' : ''
              }`}
              aria-pressed={isSelected}
              onClick={() => {
                setFocusedArea(area.id);
                const el = document.getElementById(`dss-area-${area.id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
              }}
            >
              <div className="dss-pillar-top">
                <span className="dss-pillar-title">
                  <area.Icon size={14} strokeWidth={1.85} />
                  {area.title}
                </span>
                <span
                  className={`dss-pillar-badge${
                    area.implemented ? ' is-implemented' : ' is-extension'
                  }`}
                >
                  {area.statusLabel}
                </span>
              </div>
              <p className="dss-pillar-desc">{area.description}</p>
            </button>
          );
        })}
      </nav>

      {/* Primary Workspace Grid: BUILD + EXPLORE */}
      <div className="dss-workspace-grid">
        {/* AREA 1: BUILD (Composes SCI-08 Create Your Own + SCI-10 Attested Upload) */}
        <section
          id="dss-area-build"
          className={`dss-section${focusedArea === 'build' ? ' is-focused' : ''}`}
          aria-labelledby="dss-build-heading"
        >
          <div className="dss-section-head">
            <div>
              <span className="dss-section-kicker">Build</span>
              <h2 id="dss-build-heading" className="dss-section-title">
                Author or admit governed scenario inputs
              </h2>
            </div>
            <div className="dss-lifecycle-pill" title="Governed scenario lifecycle">
              Create → Review → Confirm → Select → Run → Understand
            </div>
          </div>

          <ScenarioAuthoringStudio
            isOpen={true}
            mode="inline"
            revisionTarget={revisionTarget}
            onCancelRevision={() => setRevisionTarget(null)}
            deletedTargetId={deletedTargetId}
            onScenarioConfirmed={handleScenarioConfirmed}
            onCompetitiveScenarios={rememberCompetitiveScenarios}
            onAttestedScenarios={rememberAttestedScenarios}
            onExploreCompetitivePriceResponse={onNavigate ? openCompetitivePriceResponse : undefined}
          />
        </section>

        {/* AREA 2: EXPLORE (Decision response & governed scenario catalogue) */}
        <section
          id="dss-area-explore"
          className={`dss-section${focusedArea === 'explore' ? ' is-focused' : ''}`}
          aria-labelledby="dss-explore-heading"
        >
          <div className="dss-section-head">
            <div>
              <span className="dss-section-kicker">Explore</span>
              <h2 id="dss-explore-heading" className="dss-section-title">
                Decision response under active conditions
              </h2>
            </div>
            {evaluating && (
              <span className="dss-inline-status">
                <Loader2 size={13} className="spin" /> Updating…
              </span>
            )}
          </div>

          {decision && (
            <div className="dss-response-card">
              <div className="dss-response-header">
                <div>
                  <div className="dss-response-scenario">{identity.scenario_name}</div>
                  <div className="dss-response-question">
                    {identity?.decision_question ||
                      'How does the active scenario reshape demand exposure, margin, and promotional posture?'}
                  </div>
                </div>
                <span className="dss-certified-pill">
                  <ShieldCheck size={12} /> Certified evaluation
                </span>
              </div>

              <div className="dss-metrics-grid">
                <div className="dss-metric">
                  <span className="dss-metric-label">Expected demand</span>
                  <strong className="dss-metric-value">
                    {decision.expectedDemand.toLocaleString('en-GB')} units
                  </strong>
                  <span className="dss-metric-note">
                    {decision.servableDemand.toLocaleString('en-GB')} units servable
                  </span>
                </div>
                <div className="dss-metric">
                  <span className="dss-metric-label">Decision Gap</span>
                  <strong className="dss-metric-value">
                    {decision.exposedGap.toLocaleString('en-GB')} units
                  </strong>
                  <span className="dss-metric-note">{decision.gapPct}% of demand exposed</span>
                </div>
                <div className="dss-metric">
                  <span className="dss-metric-label">Revenue at risk</span>
                  <strong className="dss-metric-value">{money(decision.revenueExposureGbp)}</strong>
                  <span className="dss-metric-note">Over {calendar.forecast_horizon_days}-day horizon</span>
                </div>
                <div className="dss-metric">
                  <span className="dss-metric-label">Margin at risk</span>
                  <strong className="dss-metric-value">{money(decision.marginExposureGbp)}</strong>
                  <span className="dss-metric-note">Authoritative evaluator</span>
                </div>
                <div className="dss-metric">
                  <span className="dss-metric-label">Promotion depth</span>
                  <strong className="dss-metric-value">
                    {decision.recommendedDepth}% recommended
                  </strong>
                  <span className="dss-metric-note">{decision.committedDepth}% committed</span>
                </div>
                <div className="dss-metric">
                  <span className="dss-metric-label">Decision Window</span>
                  <strong className="dss-metric-value">{decision.windowRemainingHours} hours</strong>
                  <span className="dss-metric-note">
                    {decision.windowState.replace(/_/g, ' ').toLowerCase()}
                  </span>
                </div>
              </div>

              {competitiveScenarioIds[identity.scenario_id] && onNavigate && (
                <div className="dss-competitive-handoff">
                  <button
                    type="button"
                    className="dss-competitive-handoff-btn"
                    data-testid="btn-explore-competitive-price-response"
                    onClick={openCompetitivePriceResponse}
                  >
                    Explore competitive price response <ArrowUpRight size={13} />
                  </button>
                  <span className="dss-competitive-handoff-note">
                    Test how competitive pricing could change this decision.
                  </span>
                </div>
              )}

              {onNavigate && (
                <div className="dss-surface-links">
                  <span className="dss-surface-links-label">Inspect in decision surface:</span>
                  <button
                    type="button"
                    className="dss-link-chip"
                    onClick={() => onNavigate('solution-demand')}
                  >
                    Demand &amp; Forecast <ArrowUpRight size={11} />
                  </button>
                  <button
                    type="button"
                    className="dss-link-chip"
                    onClick={() => onNavigate('solution-promo')}
                  >
                    Promotion <ArrowUpRight size={11} />
                  </button>
                  <button
                    type="button"
                    className="dss-link-chip"
                    onClick={() => onNavigate('campaign-decision')}
                  >
                    Campaign Decision <ArrowUpRight size={11} />
                  </button>
                  <button
                    type="button"
                    className="dss-link-chip"
                    onClick={() => onNavigate('solution-inventory')}
                  >
                    Inventory <ArrowUpRight size={11} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Governed Scenario Catalogue & Provenance */}
          <div className="dss-catalogue-block">
            <div className="dss-catalogue-head">
              <h3 className="dss-sub-heading">Certified scenarios in catalogue</h3>
              <span className="dss-catalogue-count">{catalogue.length} certified</span>
            </div>

            <div className="dss-catalogue-list" role="list">
              {catalogue.map(item => {
                const isCurrent = item.scenario_id === identity.scenario_id;
                const isUserCreated = !isGovernedReferenceScenario(item.scenario_id);
                const prov = resolveProvenance(item);
                const isActivating = activatingId === item.scenario_id;
                return (
                  <div
                    key={item.scenario_id}
                    role="listitem"
                    className={`dss-catalogue-item${isCurrent ? ' is-active' : ''}`}
                  >
                    <div className="dss-catalogue-main">
                      <div className="dss-catalogue-title-row">
                        <span className="dss-catalogue-name">{item.scenario_name}</span>
                        <span className={`dss-provenance-tag is-${prov.kind}`}>{prov.label}</span>
                        {isCurrent && <span className="dss-active-tag">Running</span>}
                      </div>
                      <div className="dss-catalogue-meta">
                        {item.sku_name} · {item.category} · {item.market_scope_label} ·{' '}
                        {item.horizon_days} days
                      </div>
                    </div>

                    <div className="dss-catalogue-action">
                      {isUserCreated && (
                        <>
                          <button
                            type="button"
                            className="dss-row-action-btn"
                            disabled={Boolean(activatingId) || deleting}
                            onClick={() => handleEditScenario(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="dss-row-action-btn is-danger"
                            disabled={Boolean(activatingId) || deleting}
                            onClick={() => handleRequestDeleteScenario(item)}
                          >
                            Delete
                          </button>
                        </>
                      )}
                      {isCurrent ? (
                        <span className="dss-current-indicator">
                          <Check size={12} /> Active
                        </span>
                      ) : (
                        <button
                          type="button"
                          className="dss-run-btn"
                          disabled={Boolean(activatingId) || deleting}
                          onClick={() => void handleActivateScenario(item.scenario_id)}
                        >
                          {isActivating ? (
                            <Loader2 size={12} className="spin" />
                          ) : (
                            <Play size={11} />
                          )}
                          <span>Run</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Architectural Extension Foundations: OBSERVE & DISCOVER */}
      <div className="dss-foundation-grid">
        {/* AREA 3: OBSERVE */}
        <section
          id="dss-area-observe"
          className={`dss-foundation-panel${focusedArea === 'observe' ? ' is-focused' : ''}`}
          aria-labelledby="dss-observe-heading"
        >
          <div className="dss-foundation-head">
            <div className="dss-foundation-title-group">
              <Radio size={14} strokeWidth={1.85} color="var(--text-secondary)" />
              <span className="dss-section-kicker">Observe</span>
            </div>
            <span className="dss-foundation-status">Architectural foundation</span>
          </div>
          <h2 id="dss-observe-heading" className="dss-foundation-title">
            Operational, market and industry signal intake
          </h2>
          <p className="dss-foundation-copy">
            Reserved workspace for connecting continuous operational observations, supplier lead-time
            shifts, and external market movements directly into scenario framing.
          </p>
          <div className="dss-foundation-meta">
            <div>
              <strong>Implemented today:</strong> Governed Living Evidence &amp; Signals for{' '}
              <em>{identity.sku_name}</em> ({identity.category}) are audited in Observability &amp;
              Governance.
            </div>
            {onNavigate && (
              <button
                type="button"
                className="dss-link-chip"
                onClick={() => onNavigate('settings')}
              >
                Open Evidence &amp; Signals <ArrowUpRight size={11} />
              </button>
            )}
          </div>
        </section>

        {/* AREA 4: DISCOVER */}
        <section
          id="dss-area-discover"
          className={`dss-foundation-panel${focusedArea === 'discover' ? ' is-focused' : ''}`}
          aria-labelledby="dss-discover-heading"
        >
          <div className="dss-foundation-head">
            <div className="dss-foundation-title-group">
              <GitBranch size={14} strokeWidth={1.85} color="var(--text-secondary)" />
              <span className="dss-section-kicker">Discover</span>
            </div>
            <span className="dss-foundation-status">Architectural foundation</span>
          </div>
          <h2 id="dss-discover-heading" className="dss-foundation-title">
            Relationships, correlations and scenario opportunities
          </h2>
          <p className="dss-foundation-copy">
            Reserved workspace for surfacing statistical relationships and machine-observed variance
            that can be promoted into governed candidate scenarios for human confirmation.
          </p>

          <div className="dss-provenance-architecture" aria-label="Scenario provenance architecture">
            <div className="dss-provenance-arch-title">Scenario provenance architecture</div>
            <div className="dss-provenance-arch-grid">
              {Object.values(SCENARIO_PROVENANCE_FOUNDATION).map(prov => (
                <div
                  key={prov.kind}
                  className={`dss-provenance-arch-item${
                    prov.implemented ? ' is-live' : ' is-reserved'
                  }`}
                >
                  <div className="dss-provenance-arch-row">
                    <span className="dss-provenance-arch-label">{prov.label}</span>
                    <span className="dss-provenance-arch-state">
                      {prov.implemented ? 'Live' : 'Extension slot'}
                    </span>
                  </div>
                  <p className="dss-provenance-arch-desc">{prov.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      {deleteCandidate && typeof document !== 'undefined' && createPortal(
        <div
          className="dss-delete-backdrop"
          role="presentation"
          onClick={() => {
            if (!deleting) {
              setDeleteCandidate(null);
              setDeleteError(null);
            }
          }}
        >
          <div
            className="dss-delete-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dss-delete-dialog-title"
            onClick={e => e.stopPropagation()}
          >
            <h3 id="dss-delete-dialog-title" className="dss-delete-title">
              Delete “{deleteCandidate.scenario_name}”?
            </h3>
            <p className="dss-delete-copy">
              This scenario created by you will be removed from the current session, along with its session-scoped authoring state.
              {deleteCandidate.scenario_id === identity.scenario_id
                ? ' Because it is currently running, CogniX will return to the default governed reference scenario.'
                : ''}
            </p>
            {deleteError && (
              <div className="dss-delete-error" role="alert">
                {deleteError}
              </div>
            )}
            <div className="dss-delete-actions">
              <button
                type="button"
                className="dss-row-action-btn"
                disabled={deleting}
                onClick={() => {
                  setDeleteCandidate(null);
                  setDeleteError(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="dss-delete-confirm-btn"
                disabled={deleting}
                onClick={() => void handleConfirmDeleteScenario()}
              >
                {deleting ? <Loader2 size={12} className="spin" /> : null}
                <span>Confirm delete</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ScenarioSelectorModal
        isOpen={selectorOpen}
        onClose={() => setSelectorOpen(false)}
        activeScenarioId={identity.scenario_id}
        onScenarioActivated={async () => {
          await refreshState();
          await loadStudioState(identity.scenario_id);
        }}
        onCreateScenario={() => {
          setSelectorOpen(false);
          setFocusedArea('build');
          const el = document.getElementById('dss-area-build');
          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }}
      />
    </div>
  );
}
