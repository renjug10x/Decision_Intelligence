/**
 * CogniX CDI-05 — Decision Timeline & Demand Decomposition Engine
 *
 * Pure, deterministic temporal rendering of a closed CDI-02 evaluation.
 * FLAT_RATE_IDENTITY only — allocation redistributes, never creates.
 * No fabricated curvature, no Half-Life, no cumulative quantities.
 */

import {
  CampaignIntent,
  CampaignEvaluationResponse,
  DecisionTimelineProjection,
  TimelineProjectionRequest,
  TimelineProjectionResponse,
  TimelineSeriesPoint,
  TimelineTrajectory,
  TimelineLensProjection,
  TimelineMarker,
  TimelineConfidenceEnvelope,
  DemandDecomposition,
  DecompositionRow,
  CDI02_BASE_WEEKLY_UNITS,
  REVENUE_REQUIRED_INPUT,
  POST_CAMPAIGN_NOT_MODELLED,
  PRE_CAMPAIGN_DISCLOSURE,
  validateDecisionTimelineProjection,
  validateTimelineProjectionRequest,
  assertAmbientParity,
  assertAmbientMovementPresent,
  assertAttributableIsDifferenceOnly,
  assertAllocationConserves,
  assertNoObservedHistory,
  assertPostCampaignEmpty,
  assertEnvelopeMonotone,
  assertEnvelopeWithinModelledPhases,
  assertContextSignalsNotDoubleCounted,
  assertUnavailableLensNamesInput,
  weakestStrength,
  validateCounterfactualBaseline,
  validateCausalDemandContribution,
  ConfidenceBand,
  EvidenceStrength,
  ORDERED_SIMULATION_PERIODS,
  SimulationPeriod
} from '../packages/contracts/src/index';
import { getCampaignIntentById } from './campaign-intent-store';
import { evaluateCampaignDecision } from './campaign-causal-engine';

const SCHEMA_VERSION = '1.0.0';
const ENGINE_VERSION = 'cdi05_timeline_v1';
const PRE_DAYS = 14;
const POST_DAYS = 14;

function parseUtcDay(iso: string): Date {
  return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
}

function toUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getTime());
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

function daysInclusive(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
}

function mapSimulationPeriod(offsetFromCampaignStart: number): SimulationPeriod | undefined {
  // Map day offset roughly onto ORDERED_SIMULATION_PERIODS around Today
  const todayIdx = ORDERED_SIMULATION_PERIODS.indexOf('Today');
  if (todayIdx < 0) return undefined;
  const idx = todayIdx + offsetFromCampaignStart;
  if (idx < 0 || idx >= ORDERED_SIMULATION_PERIODS.length) return undefined;
  return ORDERED_SIMULATION_PERIODS[idx];
}

function resolveCampaignWindow(
  campaign: CampaignIntent,
  discovery?: TimelineProjectionRequest['opportunity_discovery']
): { start: Date; end: Date; grid_basis: string } {
  const win = discovery?.opportunity_windows?.recommended_window;
  if (win?.start_date && win?.end_date) {
    return {
      start: parseUtcDay(win.start_date),
      end: parseUtcDay(win.end_date),
      grid_basis: 'cdi03_recommended_window'
    };
  }
  if (campaign.audience_market.planned_start && campaign.audience_market.planned_end) {
    return {
      start: parseUtcDay(campaign.audience_market.planned_start),
      end: parseUtcDay(campaign.audience_market.planned_end),
      grid_basis: 'cdi01_stated_dates'
    };
  }
  throw Object.assign(
    new Error('RJ2: KNOWN_DATES / timeline requires a valid stated range or CDI-03 window'),
    { rejection_id: 'RJ2' }
  );
}

function buildEnvelope(
  points: TimelineSeriesPoint[],
  centralByIndex: Map<number, number>,
  band: ConfidenceBand,
  floor: EvidenceStrength,
  modelIntegrity: TimelineConfidenceEnvelope['model_integrity'],
  cdi02Confidence: number,
  widthScale: number
): TimelineConfidenceEnvelope {
  const envPoints = points.map((pt, i) => {
    const central = centralByIndex.get(pt.period_index) ?? 100;
    const horizonOut = Math.max(0, pt.period_index);
    // Declared lab uncertainty: widens with horizon; floor from CDI-02 confidence
    const baseHalfWidth = ((100 - cdi02Confidence) / 100) * 8 * widthScale;
    const halfWidth = baseHalfWidth + horizonOut * 0.15 * widthScale;
    return {
      period_index: pt.period_index,
      horizon_days_out: horizonOut,
      lower_index_pct: Number((central - halfWidth).toFixed(4)),
      upper_index_pct: Number((central + halfWidth).toFixed(4))
    };
  });
  return {
    band,
    evidence_strength_floor: floor,
    model_integrity: modelIntegrity,
    horizon_basis: 'declared_horizon_uncertainty_profile',
    synthetic_demo: true,
    points: envPoints,
    calibration_target: 'Realised forecast-error dispersion by horizon'
  };
}

function buildPoints(
  gridDates: string[],
  campaignStartIdx: number,
  campaignEndIdx: number,
  ambientPp: number,
  interventionPp: number,
  kind: 'COUNTERFACTUAL' | 'INTERVENTION'
): TimelineSeriesPoint[] {
  return gridDates.map((date, i) => {
    let phase: TimelineSeriesPoint['phase'];
    if (i < campaignStartIdx) phase = 'PRE_CAMPAIGN';
    else if (i <= campaignEndIdx) phase = 'CAMPAIGN';
    else phase = 'POST_CAMPAIGN';

    const offsetFromCampaign = i - campaignStartIdx;
    const sim = mapSimulationPeriod(offsetFromCampaign);

    if (phase === 'PRE_CAMPAIGN') {
      return {
        period_index: i,
        period_date: date,
        simulation_period: sim,
        phase,
        ambient_component_pp: 0,
        intervention_component_pp: 0,
        index_pct: 100,
        basis: 'CDI02_CURRENT_BASELINE_RUN_RATE',
        strength: 'DERIVED',
        synthetic_demo: true,
        disclosure: PRE_CAMPAIGN_DISCLOSURE
      };
    }

    if (phase === 'POST_CAMPAIGN') {
      return {
        period_index: i,
        period_date: date,
        simulation_period: sim,
        phase,
        ambient_component_pp: null,
        intervention_component_pp: null,
        index_pct: null,
        basis: 'NOT_MODELLED_BY_CDI02',
        strength: 'MISSING',
        synthetic_demo: true,
        not_modelled_reason: POST_CAMPAIGN_NOT_MODELLED
      };
    }

    // CAMPAIGN — flat identity level shift
    const ambient = ambientPp;
    const intervention = kind === 'INTERVENTION' ? interventionPp : 0;
    return {
      period_index: i,
      period_date: date,
      simulation_period: sim,
      phase,
      ambient_component_pp: ambient,
      intervention_component_pp: intervention,
      index_pct: Number((100 + ambient + intervention).toFixed(4)),
      basis: 'CDI02_ENDPOINT_ALLOCATED',
      strength: 'DERIVED',
      synthetic_demo: true
    };
  });
}

/** CDI-05 decomposition builder — exported for CDI-06 reuse (no second taxonomy). */
export function buildDemandDecompositionFromEvaluation(
  evaluation: CampaignEvaluationResponse
): DemandDecomposition {
  return buildDecomposition(evaluation);
}

function buildDecomposition(evaluation: CampaignEvaluationResponse): DemandDecomposition {
  const causal = evaluation.causal;
  const rows: DecompositionRow[] = causal.drivers.map(d => ({
    driver_id: d.driver_id,
    driver_class: d.driver_class,
    label: d.label,
    contribution_pp: d.contribution_pp,
    attributed: d.attributed,
    exclusion_reason: d.attributed ? undefined : 'Excluded from attribution — shown in place (P4)',
    rationale: d.rationale,
    evidence_refs: d.evidence_refs
  }));

  const ambientRows = rows.filter(r => r.driver_class === 'ambient');
  const interventionRows = rows.filter(r => r.driver_class === 'intervention' && r.driver_id !== 'interaction_residual');
  const residual = rows.find(r => r.driver_id === 'interaction_residual') || {
    driver_id: 'interaction_residual' as const,
    driver_class: 'intervention' as const,
    label: 'Interaction residual',
    contribution_pp: 0,
    attributed: true,
    rationale: 'Reserved residual',
    evidence_refs: []
  };

  return {
    ambient_group: {
      driver_class: 'ambient',
      label: 'Ambient (world)',
      meaning: 'happens with or without this campaign',
      subtotal_pp: causal.ambient_uplift_pp,
      rows: ambientRows
    },
    intervention_group: {
      driver_class: 'intervention',
      label: 'Intervention (campaign)',
      meaning: 'attributable to intervening',
      subtotal_pp: causal.intervention_uplift_pp,
      rows: interventionRows
    },
    residual_row: residual,
    reconciliation: {
      reconciled_sum_pp: causal.reconciled_sum_pp,
      reconciliation_ok: causal.reconciliation_ok,
      validator_errors: []
    },
    excluded_drivers: rows.filter(r => !r.attributed)
  };
}

function buildLenses(
  cf: TimelineTrajectory,
  iv: TimelineTrajectory,
  evaluation: CampaignEvaluationResponse
): TimelineLensProjection[] {
  const baseline = evaluation.counterfactual.current_baseline;
  const cfUnit = evaluation.counterfactual.expected_without_intervention.unit_contribution_gbp;
  const ivUnit = evaluation.counterfactual.predicted_with_intervention.unit_contribution_gbp;
  const cfWaste = evaluation.counterfactual.expected_without_intervention.waste_units;
  const ivWaste = evaluation.counterfactual.predicted_with_intervention.waste_units;

  const volumeAt = (indexPct: number | null): number | null =>
    indexPct == null ? null : Math.round(CDI02_BASE_WEEKLY_UNITS * (indexPct / 100));

  const demandValues = cf.points.map((pt, i) => ({
    period_index: pt.period_index,
    counterfactual: volumeAt(pt.index_pct),
    intervention: volumeAt(iv.points[i].index_pct)
  }));

  /**
   * Pre-campaign is the CDI-02 current-baseline run rate held flat, so BOTH trajectories
   * render it at the baseline unit contribution. Applying the intervention's promotional
   * erosion before the campaign exists would draw the campaign destroying contribution
   * fourteen days before it starts — a fabricated pre-campaign intervention effect (I2/I3).
   */
  const contributionValues = cf.points.map((pt, i) => {
    const cfVol = volumeAt(pt.index_pct);
    const ivVol = volumeAt(iv.points[i].index_pct);
    const cfRate = pt.phase === 'PRE_CAMPAIGN' ? baseline.unit_contribution_gbp : cfUnit;
    const ivRate = iv.points[i].phase === 'PRE_CAMPAIGN' ? baseline.unit_contribution_gbp : ivUnit;
    return {
      period_index: pt.period_index,
      counterfactual: cfVol == null ? null : Number((cfVol * cfRate).toFixed(2)),
      intervention: ivVol == null ? null : Number((ivVol * ivRate).toFixed(2))
    };
  });

  /**
   * Inventory: the CDI-02 waste level held flat per phase, with the index-105 step left
   * unsmoothed. Pre-campaign carries the CDI-02 current-baseline waste, never zero —
   * zero would fabricate a step at the campaign boundary that CDI-02 does not model and
   * would read as the campaign creating waste out of nothing.
   */
  const wasteFor = (phase: string, campaignValue: number): number | null =>
    phase === 'CAMPAIGN' ? campaignValue : phase === 'PRE_CAMPAIGN' ? baseline.waste_units : null;

  const inventoryValues = cf.points.map((pt, i) => ({
    period_index: pt.period_index,
    counterfactual: wasteFor(pt.phase, cfWaste),
    intervention: wasteFor(iv.points[i].phase, ivWaste)
  }));

  return [
    {
      lens: 'DEMAND',
      availability: 'AVAILABLE',
      quantity_basis: 'cdi02_weekly_rate',
      values: demandValues,
      strength: 'DERIVED',
      missing_inputs: [],
      disclosure: 'Per-period weekly rate (cdi02_weekly_rate) — must not be summed across periods'
    },
    {
      lens: 'REVENUE',
      availability: 'NOT_AVAILABLE',
      quantity_basis: 'none',
      values: cf.points.map(pt => ({
        period_index: pt.period_index,
        counterfactual: null,
        intervention: null
      })),
      strength: 'MISSING',
      missing_inputs: ['unit_price_gbp — no source in CDI-01/CDI-02/WP10-A/WP10-C'],
      required_authoritative_input: REVENUE_REQUIRED_INPUT,
      disclosure: 'Revenue lens present and unavailable until realised selling price is supplied'
    },
    {
      lens: 'CONTRIBUTION',
      availability: 'AVAILABLE',
      quantity_basis: 'cdi02_unit_contribution',
      values: contributionValues,
      strength: 'DERIVED',
      missing_inputs: [],
      disclosure: 'Uses CDI-02 trajectory unit_contribution_gbp (promotional erosion preserved)'
    },
    {
      lens: 'INVENTORY',
      availability: 'AVAILABLE',
      quantity_basis: 'cdi02_waste_units',
      values: inventoryValues,
      strength: 'DERIVED_KNOWN_DISCONTINUITY',
      missing_inputs: [],
      disclosure:
        'CDI-02 waste residual risk 6 — asymmetric/discontinuous; rendered as level shift, never smoothed'
    }
  ];
}

function buildMarkers(
  campaign: CampaignIntent,
  gridDates: string[],
  campaignStartIdx: number,
  campaignEndIdx: number,
  evaluation: CampaignEvaluationResponse,
  discovery?: TimelineProjectionRequest['opportunity_discovery'],
  readiness?: TimelineProjectionRequest['readiness']
): TimelineMarker[] {
  const markers: TimelineMarker[] = [];
  markers.push({
    marker_id: 'm_campaign_start',
    marker_type: 'CAMPAIGN_START',
    period_index: campaignStartIdx,
    period_date: gridDates[campaignStartIdx],
    label: 'Campaign start',
    strength: 'DERIVED',
    synthetic_demo: true,
    source_package: 'CDI-01'
  });
  markers.push({
    marker_id: 'm_campaign_end',
    marker_type: 'CAMPAIGN_END',
    period_index: campaignEndIdx,
    period_date: gridDates[campaignEndIdx],
    label: 'Campaign end',
    strength: 'DERIVED',
    synthetic_demo: true,
    source_package: 'CDI-01'
  });

  const win = discovery?.opportunity_windows;
  if (win?.recommended_window) {
    const windowBounds: Array<['WINDOW_START' | 'WINDOW_END', string | undefined]> = [
      ['WINDOW_START', win.recommended_window.start_date],
      ['WINDOW_END', win.recommended_window.end_date]
    ];
    for (const [markerType, date] of windowBounds) {
      if (!date) continue;
      const idx = gridDates.indexOf(date.slice(0, 10));
      if (idx < 0) continue; // outside the grid — published as absent, never relocated
      markers.push({
        marker_id: `m_${markerType.toLowerCase()}`,
        marker_type: markerType,
        period_index: idx,
        period_date: gridDates[idx],
        label: markerType === 'WINDOW_START' ? 'Recommended window start' : 'Recommended window end',
        strength: 'SEEDED_ASSUMPTION',
        synthetic_demo: true,
        disclosure: win.discovery_anchor?.disclosure,
        source_package: 'CDI-03'
      });
    }
    markers.push({
      marker_id: 'm_window_tier',
      marker_type: 'WINDOW_TIER',
      period_index: campaignStartIdx,
      period_date: gridDates[campaignStartIdx],
      label: `Window tier ${win.recommended_window.tier}`,
      strength: 'SEEDED_ASSUMPTION',
      synthetic_demo: true,
      disclosure: win.discovery_anchor?.disclosure,
      source_package: 'CDI-03'
    });
    if (win.discovery_anchor) {
      markers.push({
        marker_id: 'm_discovery_anchor',
        marker_type: 'DISCOVERY_ANCHOR',
        period_index: campaignStartIdx,
        period_date: gridDates[campaignStartIdx],
        label: `Discovery anchor ${win.discovery_anchor.anchor_date}`,
        strength: 'SEEDED_ASSUMPTION',
        synthetic_demo: true,
        disclosure: win.discovery_anchor.disclosure,
        source_package: 'CDI-03'
      });
    }
  }

  /**
   * ESF-2 context markers, sourced only from what CDI-02 already published — CDI-05 never
   * re-simulates signals, which would be a second evaluation. Each marker is an
   * explanation of movement already inside ambient_component_pp, never an additional
   * effect: without already_in_ambient a reader adds the weather to the ambient line and
   * counts the same weather twice (I14).
   */
  const signalDriver = evaluation.causal.drivers.find(
    d => d.driver_id === 'external_signal_response'
  );
  if (signalDriver && signalDriver.attributed && signalDriver.evidence_refs.length > 0) {
    for (const ref of signalDriver.evidence_refs.slice(0, 3)) {
      markers.push({
        marker_id: `m_signal_${ref}`,
        marker_type: 'CONTEXT_SIGNAL',
        period_index: campaignStartIdx,
        period_date: gridDates[campaignStartIdx],
        label: `Context signal ${ref} — already inside ambient movement`,
        strength: 'SEEDED_ASSUMPTION',
        synthetic_demo: true,
        already_in_ambient: true,
        ambient_driver_id: 'external_signal_response',
        disclosure:
          'Simulated observation consumed by CDI-02 as an ambient driver. CDI-02 residual 2 — ' +
          'signal consumption uses Today-period averages, so placement is coarser than the daily grid.',
        source_package: 'ESF-2'
      });
    }
  }

  if (readiness?.conditions?.length) {
    for (const c of readiness.conditions.slice(0, 5)) {
      markers.push({
        marker_id: `m_cond_${c.condition_id}`,
        marker_type: 'READINESS_CONDITION',
        period_index: campaignStartIdx,
        period_date: gridDates[campaignStartIdx],
        label: c.statement,
        strength: 'DERIVED',
        synthetic_demo: true,
        source_package: 'CDI-04'
      });
    }
  }

  return markers;
}

function resolveCampaign(request: TimelineProjectionRequest): CampaignIntent {
  let campaign = request.campaign_intent;
  if (!campaign && request.campaign_intent_id) {
    campaign =
      getCampaignIntentById(request.campaign_intent_id, request.tenant_id, request.session_id) ||
      undefined;
    if (!campaign) {
      throw Object.assign(new Error(`CampaignIntentNotFound: ${request.campaign_intent_id}`), {
        rejection_id: 'RJ3'
      });
    }
  }
  if (!campaign) throw Object.assign(new Error('RJ1: campaign intent required'), { rejection_id: 'RJ1' });
  if (campaign.tenant_id !== request.tenant_id || campaign.session_id !== request.session_id) {
    throw Object.assign(new Error('RJ3: tenant/session mismatch'), { rejection_id: 'RJ3' });
  }
  return campaign;
}

export function projectDecisionTimeline(
  request: TimelineProjectionRequest
): TimelineProjectionResponse {
  const reqVal = validateTimelineProjectionRequest(request);
  if (!reqVal.valid) {
    throw Object.assign(new Error(reqVal.errors.join('; ')), {
      rejection_id: reqVal.rejection_id || 'RJ_VALIDATION'
    });
  }

  const campaign = resolveCampaign(request);
  if (campaign.status !== 'REGISTERED') {
    throw Object.assign(new Error('RJ5: CampaignIntent.status must be REGISTERED'), {
      rejection_id: 'RJ5'
    });
  }

  // RJ2 for KNOWN_DATES without dates and without discovery
  if (
    campaign.audience_market.timing_mode === 'KNOWN_DATES' &&
    (!campaign.audience_market.planned_start || !campaign.audience_market.planned_end) &&
    !request.opportunity_discovery?.opportunity_windows?.recommended_window
  ) {
    throw Object.assign(
      new Error('RJ2: KNOWN_DATES requires valid planned range or CDI-03 window'),
      { rejection_id: 'RJ2' }
    );
  }

  /**
   * RJ3 on every supplied upstream artefact, not only CDI-02. An opportunity discovery
   * belonging to another campaign resolves the grid from someone else's window; a
   * readiness assessment belonging to another campaign supplies the confidence band and
   * the Tier 1 readiness state. Both render a coherent-looking picture over two different
   * decisions.
   */
  const assertArtefactBinds = (
    artefact: { campaign_intent_id?: string; tenant_id?: string; session_id?: string } | undefined,
    label: string
  ) => {
    if (!artefact) return;
    if (artefact.campaign_intent_id && artefact.campaign_intent_id !== campaign.campaign_intent_id) {
      throw Object.assign(new Error(`RJ3: ${label} references a different campaign_intent_id`), {
        rejection_id: 'RJ3'
      });
    }
    if (
      (artefact.tenant_id && artefact.tenant_id !== request.tenant_id) ||
      (artefact.session_id && artefact.session_id !== request.session_id)
    ) {
      throw Object.assign(new Error(`RJ3: ${label} tenant/session mismatch`), {
        rejection_id: 'RJ3'
      });
    }
  };
  assertArtefactBinds(request.opportunity_discovery?.opportunity_windows, 'opportunity_discovery');
  assertArtefactBinds(request.readiness, 'readiness');

  const timestamp = request.evaluation_timestamp || campaign.updated_at;
  const includeSignals = request.include_signals !== false;

  let evaluation = request.campaign_evaluation;
  if (evaluation) {
    if (evaluation.campaign_intent_id !== campaign.campaign_intent_id) {
      throw Object.assign(new Error('RJ3: campaign_evaluation campaign_intent_id mismatch'), {
        rejection_id: 'RJ3'
      });
    }
    if (evaluation.tenant_id !== request.tenant_id || evaluation.session_id !== request.session_id) {
      throw Object.assign(new Error('RJ3: campaign_evaluation tenant/session mismatch'), {
        rejection_id: 'RJ3'
      });
    }
  } else {
    evaluation = evaluateCampaignDecision({
      tenant_id: request.tenant_id,
      session_id: request.session_id,
      campaign_intent: campaign,
      include_signals: includeSignals
    });
  }

  /**
   * One evaluation, one timeline. A readiness assessment built over a different CDI-02
   * evaluation would frame a decomposition it never saw, and §3.3 reconciliation would
   * then be checking the wrong pair.
   */
  if (
    request.readiness &&
    (request.readiness.counterfactual_id !== evaluation.counterfactual.counterfactual_id ||
      request.readiness.causal_id !== evaluation.causal.causal_id)
  ) {
    throw Object.assign(
      new Error('RJ3: readiness references a different CDI-02 evaluation than the one rendered'),
      { rejection_id: 'RJ3' }
    );
  }

  // Re-run CDI-02 validators — failure emits no projection
  const cfVal = validateCounterfactualBaseline(evaluation.counterfactual);
  const causalVal = validateCausalDemandContribution(evaluation.causal);
  const ambientPp = evaluation.causal.ambient_uplift_pp;
  const interventionPp = evaluation.causal.intervention_uplift_pp;

  if (!evaluation.causal.reconciliation_ok || !cfVal.valid || !causalVal.valid) {
    throw Object.assign(
      new Error(
        `Reconciliation/validator failure — no timeline emitted (V1/V2). ` +
          `reconciliation_ok=${evaluation.causal.reconciliation_ok}; ` +
          `cf=${cfVal.errors.join(';')}; causal=${causalVal.errors.join(';')}`
      ),
      { rejection_id: 'V1_V2', reconciliation_failure: true }
    );
  }

  // Cross-check totals
  if (
    Math.abs(ambientPp + interventionPp - evaluation.causal.total_predicted_uplift_pp) > 0.05 ||
    Math.abs(
      evaluation.counterfactual.campaign_delta.attributable_uplift_pp - interventionPp
    ) > 0.05
  ) {
    throw Object.assign(
      new Error('CDI-02 cross-check failed — ambient+intervention ≠ total or delta ≠ intervention'),
      { rejection_id: 'V1_V2', reconciliation_failure: true }
    );
  }

  const { start, end, grid_basis } = resolveCampaignWindow(campaign, request.opportunity_discovery);
  const campaignDays = daysInclusive(start, end);
  const gridStart = addDays(start, -PRE_DAYS);
  const gridEnd = addDays(end, POST_DAYS);
  const totalDays = daysInclusive(gridStart, gridEnd);
  const gridDates: string[] = [];
  for (let i = 0; i < totalDays; i++) {
    gridDates.push(toUtcDate(addDays(gridStart, i)));
  }
  const campaignStartIdx = PRE_DAYS;
  const campaignEndIdx = PRE_DAYS + campaignDays - 1;

  const cfPoints = buildPoints(gridDates, campaignStartIdx, campaignEndIdx, ambientPp, interventionPp, 'COUNTERFACTUAL');
  const ivPoints = buildPoints(gridDates, campaignStartIdx, campaignEndIdx, ambientPp, interventionPp, 'INTERVENTION');

  // Confidence band — reuse CDI-04 if supplied, else derive conservatively
  const modelIntegrity = {
    counterfactual_valid: cfVal.valid,
    causal_valid: causalVal.valid,
    reconciliation_ok: evaluation.causal.reconciliation_ok
  };
  let band: ConfidenceBand = request.readiness?.confidence.band || 'MODERATE';
  const floor: EvidenceStrength =
    request.readiness?.confidence.evidence_strength_floor ||
    weakestStrength(['DERIVED', 'SEEDED_ASSUMPTION', 'DERIVED_KNOWN_DISCONTINUITY']);
  if (floor === 'SEEDED_ASSUMPTION' || floor === 'PROXY') {
    if (band === 'HIGH') band = 'MODERATE';
  }
  if (!modelIntegrity.reconciliation_ok) band = 'INSUFFICIENT';

  if (band === 'INSUFFICIENT') {
    const emptyEnvelope: TimelineConfidenceEnvelope = {
      band: 'INSUFFICIENT',
      evidence_strength_floor: floor,
      model_integrity: modelIntegrity,
      horizon_basis: 'declared_horizon_uncertainty_profile',
      synthetic_demo: true,
      points: [],
      calibration_target: 'Realised forecast-error dispersion by horizon'
    };
    const insufficient: DecisionTimelineProjection = {
      projection_id: `tl_${campaign.campaign_intent_id}_${timestamp.replace(/[:.]/g, '')}`,
      campaign_intent_id: campaign.campaign_intent_id,
      tenant_id: campaign.tenant_id,
      session_id: campaign.session_id,
      grid: {
        points: 0,
        start_date: toUtcDate(gridStart),
        end_date: toUtcDate(gridEnd),
        campaign_start: toUtcDate(start),
        campaign_end: toUtcDate(end),
        grid_basis,
        pre_days: PRE_DAYS,
        campaign_days: campaignDays,
        post_days: POST_DAYS
      },
      trajectories: [],
      /**
       * No trajectory is rendered under INSUFFICIENT (§2.8), but all four lenses stay
       * present with empty values: a lens that disappears on a degraded path takes the
       * Revenue lens's declared unavailability with it, and missing is never neutral.
       */
      lenses: buildLenses(
        { kind: 'COUNTERFACTUAL', points: [], envelope: emptyEnvelope, terminal_index_pct: 100 },
        { kind: 'INTERVENTION', points: [], envelope: emptyEnvelope, terminal_index_pct: 100 },
        evaluation
      ),
      markers: [],
      attributable_effect_envelope: emptyEnvelope,
      decomposition: buildDecomposition(evaluation),
      allocation_profile: 'FLAT_RATE_IDENTITY',
      allocation_provenance: 'information_preserving_identity',
      tier1: {
        attributable_uplift_pp: interventionPp,
        contribution_delta_gbp: evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
        confidence_band: 'INSUFFICIENT',
        headline: 'Insufficient model integrity — no timeline rendered'
      },
      counterfactual_id: evaluation.counterfactual.counterfactual_id,
      causal_id: evaluation.causal.causal_id,
      calculation_mode: 'deterministic_demo_timeline',
      synthetic_demo: true,
      schema_version: SCHEMA_VERSION,
      provenance: {
        engine: ENGINE_VERSION,
        package: 'CDI-05',
        allocation_profile: 'FLAT_RATE_IDENTITY',
        lenses_unavailable: 'REVENUE (awaiting realised_unit_selling_price_gbp)',
        placeholder_fields_excluded:
          evaluation.causal.placeholder_fields_excluded.join(',') || 'none',
        counterfactual_id: evaluation.counterfactual.counterfactual_id,
        causal_id: evaluation.causal.causal_id
      },
      timestamp,
      insufficient_reason: 'Confidence band INSUFFICIENT — model integrity failed; no trajectory rendered'
    };
    return {
      evaluation_id: `tlev_${campaign.campaign_intent_id}_${timestamp.replace(/[:.]/g, '')}`,
      tenant_id: request.tenant_id,
      session_id: request.session_id,
      campaign_intent_id: campaign.campaign_intent_id,
      projection: insufficient,
      timestamp,
      schema_version: SCHEMA_VERSION
    };
  }

  const cfConf = evaluation.counterfactual.expected_without_intervention.confidence;
  const ivConf = evaluation.counterfactual.predicted_with_intervention.confidence;

  /**
   * Envelopes are bounded to the phases CDI-02 actually models. A band drawn over
   * POST_CAMPAIGN asserts what the null points refuse to assert: centred on the identity
   * it draws reversion, and the effect band centred on zero draws convergence (U3, I7).
   * The effect band is narrower still — the attributable effect exists only while the
   * campaign runs.
   */
  const cfModelled = cfPoints.filter(p => p.index_pct !== null);
  const ivModelled = ivPoints.filter(p => p.index_pct !== null);
  const ivCampaign = ivPoints.filter(p => p.phase === 'CAMPAIGN');

  const cfCentral = new Map(cfModelled.map(p => [p.period_index, p.index_pct as number]));
  const ivCentral = new Map(ivModelled.map(p => [p.period_index, p.index_pct as number]));

  const cfEnvelope = buildEnvelope(cfModelled, cfCentral, band, floor, modelIntegrity, cfConf, 1);
  const ivEnvelope = buildEnvelope(ivModelled, ivCentral, band, floor, modelIntegrity, ivConf, 1);

  // Effect envelope from intervention uncertainty ONLY — independent of ambient
  const effectCentral = new Map(ivCampaign.map(p => [p.period_index, interventionPp]));
  const effectEnvelope = buildEnvelope(
    ivCampaign,
    effectCentral,
    band,
    floor,
    modelIntegrity,
    ivConf,
    0.6 // narrower than full trajectory — intervention-driver uncertainty only
  );
  // Re-centre effect envelope around intervention component (not absolute index)
  effectEnvelope.points = effectEnvelope.points.map(ep => {
    const half = (ep.upper_index_pct - ep.lower_index_pct) / 2;
    const central = effectCentral.get(ep.period_index) ?? 0;
    return {
      ...ep,
      lower_index_pct: Number((central - half).toFixed(4)),
      upper_index_pct: Number((central + half).toFixed(4))
    };
  });

  const cfTrajectory: TimelineTrajectory = {
    kind: 'COUNTERFACTUAL',
    points: cfPoints,
    envelope: cfEnvelope,
    terminal_index_pct: 100 + ambientPp
  };
  const ivTrajectory: TimelineTrajectory = {
    kind: 'INTERVENTION',
    points: ivPoints,
    envelope: ivEnvelope,
    terminal_index_pct: 100 + ambientPp + interventionPp
  };

  const decomposition = buildDecomposition(evaluation);
  const lenses = buildLenses(cfTrajectory, ivTrajectory, evaluation);
  const markers = buildMarkers(
    campaign,
    gridDates,
    campaignStartIdx,
    campaignEndIdx,
    evaluation,
    request.opportunity_discovery,
    request.readiness
  );

  const readinessRef = request.readiness
    ? {
        readiness_id: request.readiness.readiness_id,
        state: request.readiness.state,
        headline: request.readiness.headline
      }
    : undefined;

  const projection: DecisionTimelineProjection = {
    projection_id: `tl_${campaign.campaign_intent_id}_${timestamp.replace(/[:.]/g, '')}`,
    campaign_intent_id: campaign.campaign_intent_id,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    grid: {
      points: gridDates.length,
      start_date: toUtcDate(gridStart),
      end_date: toUtcDate(gridEnd),
      campaign_start: toUtcDate(start),
      campaign_end: toUtcDate(end),
      grid_basis,
      pre_days: PRE_DAYS,
      campaign_days: campaignDays,
      post_days: POST_DAYS
    },
    trajectories: [cfTrajectory, ivTrajectory],
    lenses,
    markers,
    attributable_effect_envelope: effectEnvelope,
    decomposition,
    allocation_profile: 'FLAT_RATE_IDENTITY',
    allocation_provenance: 'information_preserving_identity',
    tier1: {
      attributable_uplift_pp: interventionPp,
      contribution_delta_gbp: evaluation.counterfactual.campaign_delta.contribution_delta_gbp,
      confidence_band: band,
      readiness_state: readinessRef?.state,
      headline: `Attributable effect ${interventionPp.toFixed(2)} pp vs doing nothing (${band} confidence)`
    },
    readiness_reference: readinessRef,
    evidence_refs: request.readiness?.dimensions.flatMap(d =>
      d.findings.flatMap(f => f.evidence)
    ),
    counterfactual_id: evaluation.counterfactual.counterfactual_id,
    causal_id: evaluation.causal.causal_id,
    calculation_mode: 'deterministic_demo_timeline',
    synthetic_demo: true,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: ENGINE_VERSION,
      package: 'CDI-05',
      allocation_profile: 'FLAT_RATE_IDENTITY',
      allocation_provenance: 'information_preserving_identity',
      grid_basis,
      envelope_profile: 'declared_horizon_uncertainty_profile',
      envelope_calibration_target: 'Realised forecast-error dispersion by horizon',
      lenses_unavailable: 'REVENUE (awaiting realised_unit_selling_price_gbp)',
      placeholder_fields_excluded:
        evaluation.causal.placeholder_fields_excluded.join(',') || 'none',
      signal_simulation_id: evaluation.causal.signal_simulation_id || 'absent',
      opportunity_evaluation_id:
        request.opportunity_discovery?.opportunity_windows.evaluation_id || 'absent',
      readiness_id: readinessRef?.readiness_id || 'absent',
      counterfactual_id: evaluation.counterfactual.counterfactual_id,
      causal_id: evaluation.causal.causal_id
    },
    timestamp
  };

  // Structural guards — fail closed
  const guards = [
    validateDecisionTimelineProjection(projection),
    assertAmbientParity(projection),
    assertAmbientMovementPresent(projection, ambientPp),
    assertAttributableIsDifferenceOnly(projection),
    assertAllocationConserves(projection, ambientPp, interventionPp),
    assertNoObservedHistory(projection),
    assertPostCampaignEmpty(projection),
    assertEnvelopeMonotone(projection),
    assertEnvelopeWithinModelledPhases(projection),
    assertContextSignalsNotDoubleCounted(projection),
    assertUnavailableLensNamesInput(projection)
  ];
  for (const g of guards) {
    const ok = 'valid' in g ? g.valid : g.ok;
    const errs = 'errors' in g ? g.errors : g.violations;
    if (!ok) {
      throw new Error(`CDI-05 invariant failure: ${errs.join('; ')}`);
    }
  }

  return {
    evaluation_id: `tlev_${campaign.campaign_intent_id}_${timestamp.replace(/[:.]/g, '')}`,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    campaign_intent_id: campaign.campaign_intent_id,
    projection,
    timestamp,
    schema_version: SCHEMA_VERSION
  };
}
