'use client';

import React, { useState, useEffect } from 'react';
import {
  Tag,
  Sparkles,
  Layers,
  Activity,
  Compass,
  MapPin,
  HelpCircle,
  TrendingUp,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sliders,
  ChevronRight,
  ShieldCheck,
  Zap,
  Info,
  Calendar,
  DollarSign
} from 'lucide-react';
import { useApp } from '@/lib/context';
import { useDecisionState } from '@/context/DecisionStateContext';
import {
  CAMPAIGN_ARCHETYPES,
  getArchetypeById,
  buildCampaignIntentFromArchetype,
  CampaignArchetype,
  CAMPAIGN_DEMO_TENANT_ID,
  CAMPAIGN_DEMO_SESSION_ID,
  REGION_STORE_COUNTS
} from '@/lib/campaign-archetypes';
import {
  evaluateCampaignDecisionClient,
  discoverCampaignOpportunityClient,
  evaluateCampaignReadinessClient,
  projectDecisionTimelineClient,
  registerCampaignIntentClient,
  evaluateOutcomeFrontierClient,
  createDecisionContractClient,
  getCurrentDecisionContractClient
} from '@/lib/campaign-intent-client';
import {
  projectCampaignFlightClient,
  buildElapsedTelemetryFromArchetype
} from '@/lib/campaign-flight-client';
import {
  DecisionContract,
  DecisionContractReference,
  DecisionResolution,
  computeContractDigest
} from '@/packages/contracts/src/campaign-decision-contract-model';
import {
  CampaignFlightProjection,
  buildResolutionStatement,
  decisionOwnerLabel,
  derivePromotionExperimentStage
} from '@/packages/contracts/src/campaign-continuous-timeline-model';
import { CampaignDecisionExperiment } from '@/packages/contracts/src/campaign-experiment-model';
import {
  listCampaignExperimentsClient,
  saveCampaignExperimentClient,
  closeActiveCampaignExperimentClient
} from '@/lib/campaign-experiment-client';

// Modular Campaign Intelligence Components
import CampaignDiscoveryHero from '@/components/campaign/CampaignDiscoveryHero';
import DemandIntelligenceLens from '@/components/campaign/DemandIntelligenceLens';
import OpportunitySurfaceLens from '@/components/campaign/OpportunitySurfaceLens';
import DecisionFrontierLens from '@/components/campaign/DecisionFrontierLens';
import InverseAnalysisLens from '@/components/campaign/InverseAnalysisLens';
import DecisionGraphLens from '@/components/campaign/DecisionGraphLens';
import InterventionWorkspace, { ActiveIntervention } from '@/components/campaign/InterventionWorkspace';
import LiveDecisionTwinLens from '@/components/campaign/LiveDecisionTwinLens';
import FlightActivationPanel, { ActivationChoice } from '@/components/campaign/FlightActivationPanel';
import { ExperimentHistoryDrawer } from '@/components/campaign/ExperimentHistoryDrawer';

interface PromotionPlannerProps {
  onNavigateToExperiment?: (experimentId: string) => void;
  onNavigateToCanvas?: () => void;
}

export type AnalyticalLensId =
  | 'DEMAND'
  | 'OPPORTUNITY'
  | 'FRONTIER'
  | 'INVERSE'
  | 'GRAPH';

export default function PromotionPlanner({
  onNavigateToExperiment,
  onNavigateToCanvas
}: PromotionPlannerProps) {
  const app = useApp();
  const { decisionState } = useDecisionState();

  // Mode Switcher: Pre-Flight Planning vs Live Decision Twin
  const [activeMode, setActiveMode] = useState<'PLANNING' | 'DECISION_TWIN'>('PLANNING');

  // Selected Archetype
  const [selectedArchetypeId, setSelectedArchetypeId] = useState<string>('ARCH-CHILLED-ELASTIC');
  const [archetype, setArchetype] = useState<CampaignArchetype>(
    getArchetypeById('ARCH-CHILLED-ELASTIC') || CAMPAIGN_ARCHETYPES[0]
  );

  // Active Scenario Configuration Controls
  const [skuId, setSkuId] = useState<string>(archetype.default_sku);
  const [mechanic, setMechanic] = useState<string>(archetype.default_mechanic);
  const [discountDepth, setDiscountDepth] = useState<number>(archetype.default_discount_pct);
  const [targetRegion, setTargetRegion] = useState<string>(archetype.default_region);
  const [durationDays, setDurationDays] = useState<number>(archetype.default_duration_days);
  const [objective, setObjective] = useState<'GROWTH' | 'MARGIN' | 'CLEARANCE'>('GROWTH');

  // Active Analytical Lens Tab
  const [activeLens, setActiveLens] = useState<AnalyticalLensId>('DEMAND');

  // Active Proposed Intervention
  const [proposedIntervention, setProposedIntervention] = useState<ActiveIntervention | null>(null);

  // Live Governed-Engine Evaluation State (CDI-02/03/04/06)
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [liveEvaluation, setLiveEvaluation] = useState<any>(null);
  const [liveOpportunity, setLiveOpportunity] = useState<any>(null);
  const [liveReadiness, setLiveReadiness] = useState<any>(null);
  const [liveTimeline, setLiveTimeline] = useState<any>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  // ── CTW-01 Activation & Continuous Flight ────────────────────────────────────────────
  // The activated CDI-07A contract IS the governed baseline. Nothing here holds an
  // expectation of its own, and the configuration signature is recorded so a decision
  // activated for one configuration can never be rendered against another (ADR-070).
  const [decisionContract, setDecisionContract] = useState<DecisionContract | null>(null);
  const [activatedSignature, setActivatedSignature] = useState<string | null>(null);
  const [activating, setActivating] = useState<boolean>(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationChoices, setActivationChoices] = useState<ActivationChoice[]>([]);
  const [selectedPlayId, setSelectedPlayId] = useState<string>('');
  // CTW-01R — governed decision confirmation. These map onto CDI-07A `resolved_by` and
  // `resolution_statement`; the provenance is unchanged, only how it is collected.
  const [ownerRoleId, setOwnerRoleId] = useState<string>('');
  const [ownerCustom, setOwnerCustom] = useState<string>('');
  const [rationaleId, setRationaleId] = useState<string>('');
  const [rationaleContext, setRationaleContext] = useState<string>('');
  // CTW-01R — promotion experiment lifecycle, on the existing governed experiment architecture.
  const [experiments, setExperiments] = useState<CampaignDecisionExperiment[]>([]);
  const [historyOpen, setHistoryOpen] = useState<boolean>(false);
  const activeExperimentIdRef = React.useRef<string | null>(null);
  const [flight, setFlight] = useState<CampaignFlightProjection | null>(null);
  const [flightError, setFlightError] = useState<string | null>(null);

  /** Everything that changes what was decided. Any change invalidates an existing activation. */
  const configurationSignature = [
    archetype.id,
    skuId,
    mechanic,
    String(discountDepth),
    targetRegion,
    String(durationDays)
  ].join('|');

  const staleActivation = decisionContract !== null && activatedSignature !== configurationSignature;
  const flightReady =
    decisionContract !== null && decisionContract.status === 'ACTIVE' && !staleActivation;

  // When selected archetype changes, reset default configuration parameters
  const handleSelectArchetype = (archId: string) => {
    const arch = getArchetypeById(archId);
    if (!arch) return;
    setSelectedArchetypeId(archId);
    setArchetype(arch);
    setSkuId(arch.default_sku);
    setMechanic(arch.default_mechanic);
    setDiscountDepth(arch.default_discount_pct);
    setTargetRegion(arch.default_region);
    setDurationDays(arch.default_duration_days);
    setProposedIntervention(null);
  };

  /**
   * Activation: register the intent, evaluate the outcome frontier, and create an ACTIVE
   * decision contract. This is the same governed path the Campaign Decision Canvas uses —
   * CTW-01 adds no contract type and no second baseline.
   */
  const handleActivate = async () => {
    setActivating(true);
    setActivationError(null);
    setFlightError(null);

    try {
      const intent = buildCampaignIntentFromArchetype(archetype, {
        sku_id: skuId,
        mechanic: mechanic as any,
        discount_depth_pct: discountDepth,
        target_region: targetRegion,
        duration_days: durationDays,
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID
      });

      const registered = await registerCampaignIntentClient(intent as any);
      if (!registered?.intent) {
        setActivationError(
          registered?.error ||
            'CogniX could not register this campaign intent, so there is nothing to activate.'
        );
        return;
      }

      // CDI-06 returns the response envelope; the frontier itself is one level in.
      const frontierResponse: any = await evaluateOutcomeFrontierClient({
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID,
        campaign_intent_id: (intent as any).intent_id
      });
      const frontier: any = frontierResponse?.frontier;
      if (!frontier || frontier.frontier_status !== 'EMITTED') {
        setActivationError(
          'CogniX did not emit an outcome frontier for this configuration, so no decision can be activated against it.'
        );
        return;
      }

      const selection = frontier.selection;
      let resolution: DecisionResolution;

      if (selection?.status === 'SELECTED' && selection.selected_play_id) {
        setActivationChoices([]);
        resolution = {
          route: 'CONSTRAINT_RESOLVED',
          selected_play_id: selection.selected_play_id,
          selection_status: 'SELECTED',
          selection_basis: selection.selection_basis
        };
      } else if (selection?.status === 'CHOICE_REQUIRED') {
        // More than one option survives the declared constraints, so a person decides and
        // the contract records who and why. The choice is never made silently.
        const survivors: string[] = [...(frontier.frontier_play_ids || [])];
        for (const play of frontier.plays || []) {
          if (play.admissibility === 'ADMISSIBLE' && play.play_kind === 'DO_NOTHING' && !survivors.includes(play.play_id)) {
            survivors.push(play.play_id);
          }
        }
        const choices: ActivationChoice[] = survivors
          .map(id => {
            const play = (frontier.plays || []).find((p: any) => p.play_id === id);
            return { play_id: id, label: play?.label ? `${play.label}` : id };
          })
          .sort((a, b) => a.label.localeCompare(b.label));
        setActivationChoices(choices);

        // Name what is missing rather than restating the rule — a reader who has filled two
        // of the three fields should not have to guess which one is still empty.
        const owner = decisionOwnerLabel(ownerRoleId, ownerCustom);
        const statement = buildResolutionStatement(rationaleId, rationaleContext);

        const missing: string[] = [];
        if (!selectedPlayId) missing.push('the option being activated');
        else if (!survivors.includes(selectedPlayId)) missing.push('an option that is still admissible for this configuration');
        if (!owner.trim()) missing.push('the decision owner');
        if (!statement.trim()) missing.push('the decision rationale');
        if (missing.length > 0) {
          setActivationError(
            `This decision needs a person's confirmation before it can be activated. Still needed: ${missing.join(', ')}.`
          );
          return;
        }
        resolution = {
          route: 'HUMAN_RESOLVED',
          selected_play_id: selectedPlayId,
          resolved_by: owner.trim(),
          resolution_statement: statement.trim(),
          presented_alternatives: survivors
        };
      } else {
        setActivationError(
          'No admissible option survives the declared constraints for this configuration, so there is no decision to activate.'
        );
        return;
      }

      /**
       * Re-activating after a configuration change does not replace the previous decision —
       * it supersedes it, and both stay readable. CDI-07A refuses a second ACTIVE contract
       * that does not name the one it displaces (RJ-C8), which is the rule that stops a
       * session quietly acquiring two baselines.
       */
      const existingActive = await getCurrentDecisionContractClient(
        CAMPAIGN_DEMO_TENANT_ID,
        CAMPAIGN_DEMO_SESSION_ID
      );
      const supersedes: DecisionContractReference | undefined =
        existingActive && existingActive.status === 'ACTIVE'
          ? {
              contract_id: existingActive.contract_id,
              contract_version: existingActive.contract_version,
              contract_digest: computeContractDigest(existingActive),
              decision_basis_digest: existingActive.decision_basis_digest,
              tenant_id: existingActive.tenant_id,
              session_id: existingActive.session_id,
              status: existingActive.status
            }
          : undefined;

      const created = await createDecisionContractClient({
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID,
        frontier,
        campaign_intent: intent as any,
        resolution,
        created_as_of: new Date().toISOString(),
        ...(supersedes ? { supersedes } : {})
      } as any);

      if (!created.contract) {
        setActivationError(created.error || 'CogniX could not record this decision as a contract.');
        return;
      }

      setDecisionContract(created.contract);
      setActivatedSignature(configurationSignature);
      setActivationChoices([]);
      setActivationError(null);
      await preservePromotionExperiment(intent, created.contract);
    } catch (e: any) {
      setActivationError(e?.message || 'CogniX could not activate this decision.');
    } finally {
      setActivating(false);
    }
  };

  /**
   * Preserve this promotion decision on the existing governed experiment architecture.
   *
   * One decision owns one record: the first preservation asks the server for an identity and
   * every later one sends it back, exactly as the Campaign Decision Canvas does. No competing
   * history model is created — `CampaignDecisionExperiment` already is promotion history.
   */
  const preservePromotionExperiment = async (
    intent: any,
    contract: DecisionContract | null
  ) => {
    if (!intent || !liveEvaluation) return;
    const campaignDelta = liveEvaluation?.counterfactual?.campaign_delta;
    const saved = await saveCampaignExperimentClient({
      ...(activeExperimentIdRef.current ? { experiment_id: activeExperimentIdRef.current } : {}),
      campaign_intent_id: intent.campaign_intent_id,
      framing_question: intent.campaign_intent.framing_question,
      objective_type: intent.campaign_intent.objective_type,
      objective_label: intent.campaign_intent.objective_type,
      category: intent.campaign_intent.category,
      sku_scope: intent.campaign_intent.sku_scope,
      region: intent.audience_market.region,
      audience_segment: intent.audience_market.customer_segment,
      sales_channel: intent.audience_market.channel,
      timing_mode: intent.audience_market.timing_mode,
      planned_window:
        intent.audience_market.planned_start && intent.audience_market.planned_end
          ? `${intent.audience_market.planned_start} to ${intent.audience_market.planned_end}`
          : 'Optimal discovery window',
      intervention_posture: intent.campaign_intent.intervention_posture,
      posture_label: intent.campaign_intent.intervention_posture,
      primary_metric: intent.baseline_objective.primary_metric,
      target_direction: intent.baseline_objective.target_direction,
      major_constraints: intent.baseline_objective.capacity_cap_note
        ? [intent.baseline_objective.capacity_cap_note]
        : [],
      decision_recommendation: contract
        ? 'Activated promotion decision'
        : 'Promotion decision not yet activated',
      incremental_demand_pct: campaignDelta?.attributable_uplift_pp ?? 0,
      contribution_impact_gbp: campaignDelta?.contribution_delta_gbp ?? 0,
      readiness_status: (liveReadiness?.readiness?.state as any) ?? 'NOT_ASSESSED',
      readiness_summary:
        liveReadiness?.readiness?.headline ?? 'Operational readiness has not been assessed.',
      primary_trade_off: archetype.discovery.primary_tension_title,
      evidence_posture: 'Demonstration evidence basis: uncalibrated simulation data',
      technical_provenance: {
        surface: 'PromotionPlanner',
        package: 'CTW-01R',
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID
      },
      intent_snapshot: intent,
      evaluation_snapshot: liveEvaluation,
      readiness_snapshot: liveReadiness,
      timeline_snapshot: liveTimeline,
      contract_snapshot: contract
    } as any);
    if (saved) {
      activeExperimentIdRef.current = saved.experiment_id;
      const listed = await listCampaignExperimentsClient({
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID
      });
      if (listed) setExperiments(listed.experiments);
    }
  };

  /**
   * Start a fresh promotion experiment. The one in progress is *closed*, not deleted: it stays
   * readable in history and the next preservation allocates a new identity. Deliberately not a
   * session reset — the Campaign Decision Canvas shares this session and must not lose a draft.
   */
  const handleNewExperiment = async () => {
    await closeActiveCampaignExperimentClient({
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID
    });
    activeExperimentIdRef.current = null;
    setDecisionContract(null);
    setActivatedSignature(null);
    setFlight(null);
    setFlightError(null);
    setActivationError(null);
    setActivationChoices([]);
    setSelectedPlayId('');
    setOwnerRoleId('');
    setOwnerCustom('');
    setRationaleId('');
    setRationaleContext('');
    setProposedIntervention(null);
    setActiveMode('PLANNING');
    const listed = await listCampaignExperimentsClient({
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID
    });
    if (listed) setExperiments(listed.experiments);
  };

  /** Load promotion history once, so the drawer has something to show before any activation. */
  useEffect(() => {
    let cancelled = false;
    listCampaignExperimentsClient({
      tenant_id: CAMPAIGN_DEMO_TENANT_ID,
      session_id: CAMPAIGN_DEMO_SESSION_ID
    }).then(listed => {
      if (!cancelled && listed) setExperiments(listed.experiments);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The continuous flight, projected only when a decision is activated for *this*
   * configuration. A stale activation clears the flight rather than rendering the running
   * campaign against a decision nobody took.
   */
  useEffect(() => {
    let cancelled = false;

    async function runFlight() {
      if (!flightReady || !decisionContract || !liveTimeline) {
        setFlight(null);
        return;
      }
      const result = await projectCampaignFlightClient({
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID,
        contract_id: decisionContract.contract_id,
        timeline: liveTimeline.projection || liveTimeline,
        elapsed_telemetry: buildElapsedTelemetryFromArchetype(archetype)
      });
      if (cancelled) return;
      setFlight(result.projection);
      setFlightError(
        result.projection ? null : result.error || 'CogniX could not project this campaign in flight.'
      );
    }

    runFlight();
    return () => {
      cancelled = true;
    };
  }, [flightReady, decisionContract, liveTimeline, archetype]);

  /** An unactivated or stale configuration has no flight to show, so the mode falls back. */
  useEffect(() => {
    if (activeMode === 'DECISION_TWIN' && !flightReady) setActiveMode('PLANNING');
  }, [activeMode, flightReady]);

  // Re-evaluate through the governed engines whenever the scenario configuration changes.
  // The request tenant/session MUST match the inline intent's tenant/session — the engines
  // enforce this boundary and reject mismatches with 400.
  useEffect(() => {
    let isCancelled = false;

    async function runLiveEvaluation() {
      setIsSimulating(true);
      setApiError(null);

      const intent = buildCampaignIntentFromArchetype(archetype, {
        sku_id: skuId,
        mechanic: mechanic as any,
        discount_depth_pct: discountDepth,
        target_region: targetRegion,
        duration_days: durationDays,
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID
      });
      const requestIdentity = {
        tenant_id: CAMPAIGN_DEMO_TENANT_ID,
        session_id: CAMPAIGN_DEMO_SESSION_ID,
        campaign_intent_id: intent.intent_id,
        campaign_intent: intent
      };

      try {
        // Clients return the unwrapped engine payload on success, or null on any failure.
        // The timeline engine renders its own CDI-02 bundle and rejects a readiness
        // produced by a different evaluation run (RJ3), so it derives its nested
        // discovery/readiness itself from the inline intent.
        const [evalRes, oppRes, readRes, timelineRes] = await Promise.all([
          evaluateCampaignDecisionClient(requestIdentity),
          discoverCampaignOpportunityClient(requestIdentity),
          evaluateCampaignReadinessClient(requestIdentity),
          projectDecisionTimelineClient(requestIdentity)
        ]);

        if (isCancelled) return;

        const failed: string[] = [];
        if (!evalRes) failed.push('decision assessment');
        if (!oppRes) failed.push('opportunity discovery');
        if (!readRes) failed.push('readiness');
        if (!timelineRes) failed.push('timeline');

        // Never leave a previous configuration's results on screen as if they were
        // current: each engine slot is either this configuration's result or empty.
        setLiveEvaluation(evalRes);
        setLiveOpportunity(oppRes);
        setLiveReadiness(readRes);
        setLiveTimeline(timelineRes);
        setApiError(
          failed.length > 0
            ? `CogniX could not complete ${failed.join(', ')} for this configuration.`
            : null
        );
      } catch (err: any) {
        if (!isCancelled) {
          setLiveEvaluation(null);
          setLiveOpportunity(null);
          setLiveReadiness(null);
          setLiveTimeline(null);
          setApiError('CogniX could not assess this configuration.');
        }
      } finally {
        if (!isCancelled) {
          setIsSimulating(false);
        }
      }
    }

    runLiveEvaluation();

    return () => {
      isCancelled = true;
    };
  }, [archetype, skuId, mechanic, discountDepth, targetRegion, durationDays]);

  const handleProposeIntervention = (action: any) => {
    setProposedIntervention(action);
    // Scroll smoothly to intervention workspace if needed
  };

  const handleAcceptIntervention = (intervention: ActiveIntervention) => {
    // Interventions generate an execution brief
  };

  const handleRejectIntervention = () => {
    setProposedIntervention(null);
  };

  const handleApplyDiscountFromCurve = (discount: number) => {
    setDiscountDepth(discount);
  };

  const handleApplyInFlightAction = (action: any) => {
    // In-flight action accepted
  };

  const handleNavigateToCommitments = () => {
    // Navigates to commitment workflow if handler provided
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('NAVIGATE_TAB', { detail: 'commitments' }));
    }
  };

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '24px 20px 60px 20px' }}>
      {/* ── Top Discovery Hero Layer ── */}
      <CampaignDiscoveryHero
        archetype={archetype}
        liveEvaluation={liveEvaluation}
        liveReadiness={liveReadiness}
        liveOpportunity={liveOpportunity}
        isEvaluating={isSimulating}
        evaluationError={apiError}
        currentDiscount={discountDepth}
        currentRegion={targetRegion}
        currentDuration={durationDays}
        activeMode={activeMode}
        flightAvailable={flightReady}
        onSwitchMode={mode => {
          if (mode === 'DECISION_TWIN' && !flightReady) {
            const el = document.getElementById('flight-activation-section');
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
          }
          setActiveMode(mode);
        }}
        onExploreDecision={() => {
          const el = document.getElementById('analytical-lenses-section');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        onSelectLens={lensId => setActiveLens(lensId as AnalyticalLensId)}
      />

      {/* ── Live Engine Status Banner — failures must never look like success ── */}
      {apiError && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#FFFBEB',
            border: '1px solid #F59E0B',
            borderRadius: 8,
            padding: '10px 16px',
            marginBottom: 20,
            fontSize: '0.85rem',
            color: '#92400E'
          }}
        >
          <AlertTriangle size={17} color="#D97706" style={{ flexShrink: 0 }} />
          <span>
            <strong>Live assessment unavailable.</strong> {apiError} The analysis below is the
            simulated scenario only — CogniX has no current verdict for this configuration.
          </span>
        </div>
      )}

      {/* ── Mode 1: Pre-Flight Planning Experience ── */}
      {activeMode === 'PLANNING' && (
        <>
          {/* ── Scenario Configuration & Archetype Bar ── */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #E2E8F0',
              borderRadius: 10,
              padding: '18px 24px',
              marginBottom: 24,
              boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
            }}
          >
            {/* Archetype Selector Chips */}
            <div style={{ marginBottom: 16 }}>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <Sparkles size={14} color="#2563EB" />
                Select Campaign Archetype ({CAMPAIGN_ARCHETYPES.length} simulated scenarios)
              </div>

              {/* `overflowX: auto` alone does not stop seven nowrap chips forcing a ~1240px
                  minimum width on the page, which pushed the whole planning view into horizontal
                  overflow below that. Wrapping is what actually lets the row shrink. */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', overflowX: 'auto', paddingBottom: 4 }}>
                {CAMPAIGN_ARCHETYPES.map(arch => {
                  const isSelected = selectedArchetypeId === arch.id;

                  return (
                    <button
                      key={arch.id}
                      onClick={() => handleSelectArchetype(arch.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 6,
                        border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                        background: isSelected ? '#EFF6FF' : '#F8FAFC',
                        color: isSelected ? '#1E40AF' : '#334155',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {arch.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Live Scenario Configuration Controls */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: 14,
                paddingTop: 14,
                borderTop: '1px solid #F1F5F9'
              }}
            >
              {/* Control 1: SKU — each SKU is the anchor product of one seeded archetype, so
                  selecting a SKU switches to that archetype's full analytical story. This keeps
                  scenario state, engine requests and seeded visuals describing the same product. */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                  PRODUCT / SKU
                </label>
                <select
                  value={skuId}
                  onChange={e => {
                    const nextSku = e.target.value;
                    const owning = CAMPAIGN_ARCHETYPES.find(a => a.default_sku === nextSku);
                    if (owning && owning.id !== archetype.id) {
                      handleSelectArchetype(owning.id);
                    } else {
                      setSkuId(nextSku);
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.825rem',
                    color: '#0F172A',
                    background: '#FFFFFF'
                  }}
                >
                  {CAMPAIGN_ARCHETYPES.map(a => (
                    <option key={a.default_sku} value={a.default_sku}>
                      {a.sku_name} ({a.default_sku})
                    </option>
                  ))}
                </select>
              </div>

              {/* Control 2: Mechanic */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                  MECHANIC
                </label>
                <select
                  value={mechanic}
                  onChange={e => setMechanic(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.825rem',
                    color: '#0F172A',
                    background: '#FFFFFF'
                  }}
                >
                  <option value="TPR_PERCENT">Temporary Price Reduction (%)</option>
                  <option value="MULTIBUY">Multibuy (2 for X)</option>
                  <option value="BUNDLE">Cross-Category Bundle</option>
                  <option value="CLEARANCE">Clearance Markdown</option>
                </select>
              </div>

              {/* Control 3: Discount Depth */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B' }}>
                    DISCOUNT DEPTH
                  </label>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563EB' }}>
                    {discountDepth}% Cut
                  </span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={1}
                  value={discountDepth}
                  onChange={e => setDiscountDepth(Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#2563EB' }}
                />
              </div>

              {/* Control 4: Target Region */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                  TARGET REGION
                </label>
                <select
                  value={targetRegion}
                  onChange={e => setTargetRegion(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.825rem',
                    color: '#0F172A',
                    background: '#FFFFFF'
                  }}
                >
                  {Object.entries(REGION_STORE_COUNTS).map(([region, stores]) => (
                    <option key={region} value={region}>
                      {region} ({stores} Stores)
                    </option>
                  ))}
                </select>
              </div>

              {/* Control 5: Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#64748B', marginBottom: 4 }}>
                  DURATION
                </label>
                <select
                  value={durationDays}
                  onChange={e => setDurationDays(Number(e.target.value))}
                  style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: 6,
                    border: '1px solid #CBD5E1',
                    fontSize: '0.825rem',
                    color: '#0F172A',
                    background: '#FFFFFF'
                  }}
                >
                  <option value={7}>7 Days (Short Burst)</option>
                  <option value={14}>14 Days (Standard Window)</option>
                  <option value={21}>21 Days (Extended Run)</option>
                  <option value={28}>28 Days (Full Cycle)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Active Proposed Intervention Workspace (if any proposed) ── */}
          <InterventionWorkspace
            key={archetype.id}
            archetype={archetype}
            currentDiscount={discountDepth}
            currentRegion={targetRegion}
            currentDuration={durationDays}
            intervention={proposedIntervention}
            onAcceptIntervention={handleAcceptIntervention}
            onRejectIntervention={handleRejectIntervention}
            onNavigateToCommitment={handleNavigateToCommitments}
          />

          {/* ── CTW-01 Review & Activate — the pre-flight to in-flight transition ── */}
          <div id="flight-activation-section">
            <FlightActivationPanel
              contract={decisionContract}
              staleActivation={staleActivation}
              activating={activating}
              error={activationError}
              readinessState={liveReadiness?.readiness?.state || liveReadiness?.state}
              stage={derivePromotionExperimentStage({
                hasActiveContract: flightReady,
                elapsedDays: flight ? flight.horizon.elapsed_days : 0
              })}
              choices={activationChoices}
              selectedPlayId={selectedPlayId}
              ownerRoleId={ownerRoleId}
              ownerCustom={ownerCustom}
              rationaleId={rationaleId}
              rationaleContext={rationaleContext}
              onSelectPlay={setSelectedPlayId}
              onOwnerRoleChange={setOwnerRoleId}
              onOwnerCustomChange={setOwnerCustom}
              onRationaleChange={setRationaleId}
              onRationaleContextChange={setRationaleContext}
              onActivate={handleActivate}
              onOpenFlight={() => setActiveMode('DECISION_TWIN')}
              onNewExperiment={handleNewExperiment}
              onOpenHistory={() => setHistoryOpen(true)}
            />
          </div>

          {/* ── Progressive Disclosure Analytical Lenses Section ── */}
          <div id="analytical-lenses-section" style={{ marginBottom: 24 }}>
            {/* Lenses Tab Bar */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                flexWrap: 'wrap',
                borderBottom: '1px solid #E2E8F0',
                marginBottom: 20,
                overflowX: 'auto'
              }}
            >
              {[
                { id: 'DEMAND', label: 'Demand & Elasticity', icon: TrendingUp },
                { id: 'OPPORTUNITY', label: 'Opportunity Surface', icon: MapPin },
                { id: 'FRONTIER', label: 'Decision Frontier & Tension', icon: Compass },
                { id: 'INVERSE', label: 'What If & Signal Feed', icon: HelpCircle },
                { id: 'GRAPH', label: 'Evidence & Decision Graph', icon: Layers }
              ].map(tab => {
                const isTabActive = activeLens === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveLens(tab.id as AnalyticalLensId)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '10px 16px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: isTabActive ? '2px solid #2563EB' : '2px solid transparent',
                      color: isTabActive ? '#2563EB' : '#64748B',
                      fontSize: '0.85rem',
                      fontWeight: isTabActive ? 700 : 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Icon size={16} color={isTabActive ? '#2563EB' : '#64748B'} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Lens Content Dispatcher */}
            {/* key={archetype.id} remounts each lens on archetype change so cell/play/node
                selection state can never survive from a previous archetype's data. */}
            {activeLens === 'DEMAND' && (
              <DemandIntelligenceLens
                key={archetype.id}
                archetype={archetype}
                currentDiscount={discountDepth}
                onApplyDiscount={handleApplyDiscountFromCurve}
                onApplyIntervention={handleProposeIntervention}
              />
            )}

            {activeLens === 'OPPORTUNITY' && (
              <OpportunitySurfaceLens
                key={archetype.id}
                archetype={archetype}
                onProposeIntervention={handleProposeIntervention}
              />
            )}

            {activeLens === 'FRONTIER' && (
              <DecisionFrontierLens
                key={archetype.id}
                archetype={archetype}
                onProposeIntervention={handleProposeIntervention}
              />
            )}

            {activeLens === 'INVERSE' && (
              <InverseAnalysisLens
                key={archetype.id}
                archetype={archetype}
                onProposeIntervention={handleProposeIntervention}
              />
            )}

            {activeLens === 'GRAPH' && (
              <DecisionGraphLens
                key={archetype.id}
                archetype={archetype}
              />
            )}
          </div>
        </>
      )}

      {/* ── Promotion experiment history — the existing governed drawer, not a second model ── */}
      <ExperimentHistoryDrawer
        isOpen={historyOpen}
        experiments={experiments}
        onClose={() => setHistoryOpen(false)}
        onReviewExperiment={() => setHistoryOpen(false)}
        onViewBrief={() => setHistoryOpen(false)}
        onCompareExperiments={() => setHistoryOpen(false)}
      />

      {/* ── Mode 2: Live Decision Twin Experience (Campaign-In-Flight, simulated) ── */}
      {activeMode === 'DECISION_TWIN' && (
        <LiveDecisionTwinLens
          key={archetype.id}
          archetype={archetype}
          flight={flight}
          flightError={flightError}
          onReturnToPlanning={() => setActiveMode('PLANNING')}
          onApplyInFlightAction={handleApplyInFlightAction}
        />
      )}
    </div>
  );
}
