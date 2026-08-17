/**
 * CogniX CDI-03 — Opportunity Window & Micro-Market Opportunity Engine
 *
 * Deterministic, explainable when/where evaluation over Enterprise World store data.
 * Synthetic scoring coefficients are labelled synthetic_demo — not production econometrics.
 */

import storesData from '@/data/stores.json';
import {
  CampaignIntent,
  OpportunityDiscoveryRequest,
  OpportunityDiscoveryResponse,
  OpportunityWindowCandidate,
  OpportunityWindowEvaluation,
  OpportunityWindowFactor,
  OpportunityWindowTier,
  MicroMarketCohort,
  MicroMarketFactor,
  MicroMarketOpportunity,
  MicroMarketStoreScore,
  MicroMarketTier,
  validateOpportunityDiscoveryRequest,
  validateOpportunityWindowEvaluation,
  validateMicroMarketOpportunity
} from '../packages/contracts/src/index';
import { getCampaignIntentById } from './campaign-intent-store';

const SCHEMA_VERSION = '1.0.0';

interface StoreRecord {
  store_id: string;
  name: string;
  region: string;
  city: string;
  format: string;
  manager: string;
  lat: number;
  lng: number;
  staff: number;
}

const STORES = storesData as StoreRecord[];

/** Stable hash → [0, 1) from string keys (deterministic across runs). */
function hash01(...parts: Array<string | number>): number {
  const s = parts.join('|');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function toUtcDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseUtcDay(iso: string): Date {
  const day = iso.slice(0, 10);
  return new Date(`${day}T00:00:00.000Z`);
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86400000);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Fixed demo anchor for FIND_BEST_WINDOW candidate generation.
 *
 * Deliberately seeded (not `new Date()`) so demo runs are reproducible. It is a
 * seeded planning assumption, NOT live calendar evidence — every evaluation
 * therefore publishes the anchor and its mode in `provenance` and in the
 * `discovery_anchor` block so no consumer can mistake it for "today".
 */
const DISCOVERY_ANCHOR_DATE = '2026-08-17';

/** Minimum candidate starts generated regardless of requested horizon. */
const MIN_CANDIDATE_STEPS = 4;

/**
 * Theoretical bounds of the additive window factor model. Scores are normalised
 * onto 0–100 against these bounds rather than clipped: clipping saturated the
 * ceiling, produced exact ties at the top of the ranking, and pinned the
 * CDI-02 temporal uplift to its maximum for effectively every campaign.
 * Normalisation is strictly monotone, so ranking semantics are unchanged.
 */
const WEEKDAY_MIX_MAX = 16;
const WINDOW_RAW_MIN = -10 /* seasonality */ + 0 /* weekday */ + 0 /* payday */ + 4 /* event */ + 2 /* weather */ + 0 /* month */ - 4; /* objective */
const WINDOW_RAW_MAX = 34 + WEEKDAY_MIX_MAX + 12 + 28 + 24 + 8 + 8;

function normaliseWindowScore(raw: number): number {
  const scaled = ((raw - WINDOW_RAW_MIN) / (WINDOW_RAW_MAX - WINDOW_RAW_MIN)) * 100;
  return Number(clamp(scaled, 0, 100).toFixed(2));
}

function tierFromYield(score: number): OpportunityWindowTier {
  if (score >= 72) return 'PREFERRED';
  if (score >= 55) return 'ACCEPTABLE';
  if (score >= 40) return 'SUBOPTIMAL';
  return 'AVOID';
}

function tierFromStoreScore(score: number): MicroMarketTier {
  if (score >= 70) return 'HIGH';
  if (score >= 55) return 'MEDIUM';
  if (score >= 40) return 'WATCH';
  return 'EXCLUDE';
}

function scoreWindowFactors(
  start: Date,
  end: Date,
  campaign: CampaignIntent
): { factors: OpportunityWindowFactor[]; yield_score: number; inclusion: string[]; risks: string[] } {
  const mid = new Date((start.getTime() + end.getTime()) / 2);
  const doy = dayOfYear(mid);
  // Synthetic seasonality: late summer / early autumn peak for grocery demo — stronger amplitude
  // so distant calendar starts diverge materially (CDI-03 requirement).
  const seasonality = 12 + 22 * Math.sin(((doy - 200) / 365) * 2 * Math.PI);
  const weekdayCount = (() => {
    let c = 0;
    for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
      const dow = new Date(t).getUTCDay();
      if (dow >= 1 && dow <= 5) c++;
    }
    return c;
  })();
  // Duration-invariant weekday share so windows of different stated lengths stay comparable.
  const totalDays = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  const weekdayMix = (weekdayCount / totalDays) * WEEKDAY_MIX_MAX;
  // Payday proximity: windows covering 1st or 15th
  let payday = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
    const day = new Date(t).getUTCDate();
    if (day === 1 || day === 15) payday = 12;
  }
  // Synthetic event calendar pressure (bank-holiday / school-holiday proxy)
  const eventPressure = 4 + 24 * hash01('event', toUtcDateString(start), campaign.tenant_id);
  // Weather anomaly proxy — different start dates diverge materially
  const weather = 2 + 22 * hash01('weather', toUtcDateString(mid), campaign.audience_market.region || 'national');
  // Month-position tilt: early vs late month trading (amplifies date differentiation)
  const monthTilt = 8 * Math.sin((mid.getUTCDate() / 31) * Math.PI);
  // Objective tilt
  const objective = campaign.campaign_intent.objective_type;
  const objectiveTilt =
    objective === 'INVENTORY_CLEARANCE' ? (doy > 240 && doy < 310 ? 8 : -4) :
    objective === 'LAUNCH' ? (weekdayCount >= 5 ? 6 : 0) :
    2;

  const factors: OpportunityWindowFactor[] = [
    {
      factor_id: 'seasonality',
      label: 'Seasonal demand curve',
      contribution: Number(seasonality.toFixed(2)),
      synthetic_demo: true,
      rationale: `Synthetic grocery seasonality at day-of-year ${doy}.`
    },
    {
      factor_id: 'weekday_mix',
      label: 'Weekday trading mix',
      contribution: Number(weekdayMix.toFixed(2)),
      synthetic_demo: true,
      rationale: `${weekdayCount} weekdays in window favour store footfall patterns.`
    },
    {
      factor_id: 'payday_proximity',
      label: 'Payday calendar proximity',
      contribution: payday,
      synthetic_demo: true,
      rationale: payday > 0
        ? 'Window covers a payday (1st or 15th) — higher discretionary spend proxy.'
        : 'No payday in window — neutral cashflow pressure.'
    },
    {
      factor_id: 'event_calendar',
      label: 'Event / calendar pressure',
      contribution: Number(eventPressure.toFixed(2)),
      synthetic_demo: true,
      rationale: 'Deterministic synthetic event calendar intensity for this start date.'
    },
    {
      factor_id: 'weather_anomaly',
      label: 'Weather anomaly proxy',
      contribution: Number(weather.toFixed(2)),
      synthetic_demo: true,
      rationale: 'Synthetic weather anomaly keyed by mid-window date and region (not live weather).'
    },
    {
      factor_id: 'month_position',
      label: 'Month-position trading tilt',
      contribution: Number(monthTilt.toFixed(2)),
      synthetic_demo: true,
      rationale: `Synthetic mid-month trading tilt for day ${mid.getUTCDate()}.`
    },
    {
      factor_id: 'objective_tilt',
      label: 'Objective calendar fitness',
      contribution: objectiveTilt,
      synthetic_demo: true,
      rationale: `Objective ${objective} calendar fitness adjustment.`
    }
  ];

  const yield_score = normaliseWindowScore(factors.reduce((s, f) => s + f.contribution, 0));

  const inclusion: string[] = [];
  const risks: string[] = [];
  if (seasonality >= 20) inclusion.push('Seasonal demand curve is favourable in this window');
  else risks.push('Seasonal demand curve is below peak for this window');
  if (payday > 0) inclusion.push('Window overlaps payday cashflow uplift');
  if (weekdayCount < 4) risks.push('Weekend-heavy mix reduces midweek trading leverage');
  if (weather < 12) risks.push('Weather anomaly proxy is soft for this mid-window');
  if (eventPressure >= 18) inclusion.push('Elevated event/calendar pressure supports footfall');
  if (inclusion.length === 0) inclusion.push('Window remains evaluable against stated timing constraints');

  return { factors, yield_score, inclusion, risks };
}

function yieldToTemporalPp(yieldScore: number): number {
  // Map 0–100 yield → ~0.35–2.4 pp temporal uplift (replaces flat 0.7 FIND_BEST_WINDOW dampener)
  return Number((0.35 + (yieldScore / 100) * 2.05).toFixed(2));
}

function buildCandidate(
  start: Date,
  durationDays: number,
  campaign: CampaignIntent,
  isStated: boolean
): OpportunityWindowCandidate {
  const end = addDays(start, durationDays - 1);
  const scored = scoreWindowFactors(start, end, campaign);
  const window_id = `ow_${toUtcDateString(start)}_${durationDays}d`;
  return {
    window_id,
    start_date: toUtcDateString(start),
    end_date: toUtcDateString(end),
    duration_days: durationDays,
    yield_score: scored.yield_score,
    estimated_temporal_uplift_pp: yieldToTemporalPp(scored.yield_score),
    tier: tierFromYield(scored.yield_score),
    factors: scored.factors,
    inclusion_reasons: scored.inclusion,
    exclusion_risks: scored.risks,
    is_stated_dates: isStated,
    synthetic_demo: true
  };
}

function generateCandidates(
  campaign: CampaignIntent,
  horizonDays: number,
  durationDays: number
): OpportunityWindowCandidate[] {
  const candidates: OpportunityWindowCandidate[] = [];
  const seen = new Set<string>();

  if (campaign.audience_market.timing_mode === 'KNOWN_DATES') {
    // CDI-01 invariant: KNOWN_DATES means the dates are stated. Never silently
    // substitute an anchor-grid window and present it as the campaign's own dates.
    if (!campaign.audience_market.planned_start || !campaign.audience_market.planned_end) {
      throw new Error(
        'InvalidTimingIntent: timing_mode KNOWN_DATES requires both planned_start and planned_end'
      );
    }
    const statedStart = parseUtcDay(campaign.audience_market.planned_start);
    const statedEnd = parseUtcDay(campaign.audience_market.planned_end);
    const statedDuration = Math.round((statedEnd.getTime() - statedStart.getTime()) / 86400000) + 1;
    if (!Number.isFinite(statedDuration) || statedDuration < 1) {
      throw new Error(
        'InvalidTimingIntent: planned_end must be on or after planned_start for KNOWN_DATES'
      );
    }
    // The stated duration is honoured verbatim — the engine never rewrites the
    // window a user actually stated.
    const stated = buildCandidate(statedStart, statedDuration, campaign, true);
    candidates.push(stated);
    seen.add(stated.window_id);
  }

  // Discovery grid: weekly starts from a fixed, disclosed demo anchor for reproducibility.
  const anchor = parseUtcDay(DISCOVERY_ANCHOR_DATE);
  const steps = Math.max(MIN_CANDIDATE_STEPS, Math.floor(horizonDays / 7));
  for (let i = 0; i < steps; i++) {
    const start = addDays(anchor, i * 7);
    const c = buildCandidate(start, durationDays, campaign, false);
    if (!seen.has(c.window_id)) {
      candidates.push(c);
      seen.add(c.window_id);
    }
  }

  return candidates.sort((a, b) => b.yield_score - a.yield_score);
}

export function evaluateOpportunityWindows(
  campaign: CampaignIntent,
  options?: { discovery_horizon_days?: number; window_duration_days?: number }
): OpportunityWindowEvaluation {
  const horizon = options?.discovery_horizon_days ?? 56;
  const duration = options?.window_duration_days ?? 7;
  const candidates = generateCandidates(campaign, horizon, duration);
  const effectiveSteps = Math.max(MIN_CANDIDATE_STEPS, Math.floor(horizon / 7));

  let recommended: OpportunityWindowCandidate;
  if (campaign.audience_market.timing_mode === 'KNOWN_DATES') {
    recommended = candidates.find(c => c.is_stated_dates) || candidates[0];
  } else {
    recommended = candidates[0];
  }

  const evaluation: OpportunityWindowEvaluation = {
    evaluation_id: `owe_${campaign.campaign_intent_id}_${Date.now()}`,
    campaign_intent_id: campaign.campaign_intent_id,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    timing_mode: campaign.audience_market.timing_mode,
    candidates,
    recommended_window_id: recommended.window_id,
    recommended_window: recommended,
    resolved_temporal_uplift_pp: recommended.estimated_temporal_uplift_pp,
    discovery_anchor: {
      anchor_date: DISCOVERY_ANCHOR_DATE,
      anchor_mode: 'fixed_demo_anchor',
      horizon_days: horizon,
      candidate_starts_generated: effectiveSteps,
      disclosure:
        `Candidate windows are generated from a fixed demo anchor of ${DISCOVERY_ANCHOR_DATE} for reproducibility. ` +
        'This is a seeded planning assumption, not live calendar evidence, and does not track the current date.'
    },
    calculation_mode: 'deterministic_demo_opportunity_window',
    synthetic_demo: true,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: 'cdi03_opportunity_window_v1',
      store_seed: 'data/stores.json',
      timing_mode: campaign.audience_market.timing_mode,
      discovery_anchor_date: DISCOVERY_ANCHOR_DATE,
      discovery_anchor_mode: 'fixed_demo_anchor',
      discovery_anchor_is_live_date: 'false',
      synthetic: 'true'
    },
    timestamp: new Date().toISOString()
  };

  const validation = validateOpportunityWindowEvaluation(evaluation);
  if (!validation.valid) {
    throw new Error(`Invalid OpportunityWindowEvaluation: ${validation.errors.join('; ')}`);
  }
  return evaluation;
}

function formatFitness(format: string, objective: string): { points: number; rationale: string } {
  const f = format.toLowerCase();
  if (objective === 'INVENTORY_CLEARANCE') {
    if (f === 'superstore') return { points: 28, rationale: 'Superstore format maximises clearance volume capacity.' };
    if (f === 'standard') return { points: 18, rationale: 'Standard format supports clearance with moderate capacity.' };
    return { points: 8, rationale: 'Metro format has limited clearance capacity.' };
  }
  if (objective === 'LAUNCH') {
    if (f === 'metro') return { points: 22, rationale: 'Metro format supports high-visibility launch density.' };
    if (f === 'superstore') return { points: 20, rationale: 'Superstore supports launch with broad range space.' };
    return { points: 16, rationale: 'Standard format adequate for launch distribution.' };
  }
  if (f === 'superstore') return { points: 24, rationale: 'Superstore format offers strongest catchment throughput.' };
  if (f === 'standard') return { points: 16, rationale: 'Standard format is balanced for regional campaigns.' };
  return { points: 12, rationale: 'Metro format favours urban convenience missions.' };
}

/** Scope tokens that genuinely mean "whole estate" — not merely a country qualifier. */
const NATIONAL_SCOPE_TOKENS = new Set([
  'national',
  'nationwide',
  'uk',
  'uk wide',
  'united kingdom',
  'all',
  'all regions',
  'all stores'
]);

/**
 * Strip country qualifiers so "UK South East" scopes to South East rather than
 * collapsing to national. A bare country token still means national.
 */
function normaliseRegionScope(campaignRegion: string): { text: string; national: boolean } {
  const cleaned = campaignRegion.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (NATIONAL_SCOPE_TOKENS.has(cleaned)) return { text: cleaned, national: true };
  const stripped = cleaned
    .replace(/\b(uk|u k|united kingdom|gb|great britain)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return { text: cleaned, national: true };
  if (NATIONAL_SCOPE_TOKENS.has(stripped)) return { text: stripped, national: true };
  return { text: stripped, national: false };
}

function regionMatch(storeRegion: string, campaignRegion?: string): { points: number; rationale: string; matched: boolean } {
  if (!campaignRegion || !campaignRegion.trim()) {
    return { points: 10, rationale: 'No region lock — national store eligible for evaluation.', matched: true };
  }
  const scope = normaliseRegionScope(campaignRegion);
  const sr = storeRegion.toLowerCase();
  if (scope.national) {
    return {
      points: 22,
      rationale: `Campaign scope ${campaignRegion} is estate-wide — store region ${storeRegion} is in scope.`,
      matched: true
    };
  }
  if (sr.includes(scope.text) || scope.text.includes(sr)) {
    return { points: 22, rationale: `Store region ${storeRegion} matches campaign scope ${campaignRegion}.`, matched: true };
  }
  return { points: -25, rationale: `Store region ${storeRegion} outside campaign scope ${campaignRegion}.`, matched: false };
}

function cohortHintMatch(store: StoreRecord, hint?: string): { points: number; rationale: string } {
  if (!hint || !hint.trim()) {
    return { points: 0, rationale: 'No store cohort hint supplied.' };
  }
  const h = hint.toLowerCase();
  if (h.includes(store.format.toLowerCase()) || h.includes(store.city.toLowerCase()) || h.includes(store.region.toLowerCase())) {
    return { points: 14, rationale: `Store matches cohort hint "${hint}".` };
  }
  if (h.includes('high staff') && store.staff >= 40) {
    return { points: 12, rationale: 'Store meets high-staff cohort hint.' };
  }
  return { points: -6, rationale: `Store does not match cohort hint "${hint}".` };
}

function catchmentDensityProxy(store: StoreRecord, peers: StoreRecord[]): { points: number; rationale: string } {
  // Count peers within ~0.35 deg (~25–35km UK mid-lat) — synthetic catchment clustering
  const nearby = peers.filter(p => {
    if (p.store_id === store.store_id) return false;
    const dlat = Math.abs(p.lat - store.lat);
    const dlng = Math.abs(p.lng - store.lng);
    return dlat < 0.35 && dlng < 0.45;
  }).length;
  const points = clamp(4 + nearby * 3.5, 4, 22);
  return {
    points: Number(points.toFixed(2)),
    rationale: `${nearby} peer stores in synthetic catchment cluster — density proxy ${points.toFixed(1)}.`
  };
}

function scoreStore(store: StoreRecord, campaign: CampaignIntent, peers: StoreRecord[]): MicroMarketStoreScore {
  const objective = campaign.campaign_intent.objective_type;
  const format = formatFitness(store.format, objective);
  const region = regionMatch(store.region, campaign.audience_market.region);
  const staffPts = clamp(store.staff * 0.35, 6, 20);
  const catchment = catchmentDensityProxy(store, peers);
  const cohort = cohortHintMatch(store, campaign.audience_market.store_cohort_hint);
  // Synthetic inventory/availability readiness keyed by store + category context
  const sku =
    campaign.campaign_intent.sku_scope[0] ||
    campaign.campaign_intent.category ||
    'unknown';
  const availability = Number((8 + 12 * hash01('avail', store.store_id, sku)).toFixed(2));

  const factors: MicroMarketFactor[] = [
    {
      factor_id: 'format_fitness',
      label: 'Format fitness',
      contribution: format.points,
      synthetic_demo: true,
      rationale: format.rationale
    },
    {
      factor_id: 'region_match',
      label: 'Region scope match',
      contribution: region.points,
      synthetic_demo: false,
      rationale: region.rationale
    },
    {
      factor_id: 'staff_capacity',
      label: 'Staff capacity proxy',
      contribution: Number(staffPts.toFixed(2)),
      synthetic_demo: true,
      rationale: `${store.staff} staff — capacity proxy for execution load.`
    },
    {
      factor_id: 'catchment_density',
      label: 'Catchment density proxy',
      contribution: catchment.points,
      synthetic_demo: true,
      rationale: catchment.rationale
    },
    {
      factor_id: 'cohort_hint',
      label: 'Cohort hint alignment',
      contribution: cohort.points,
      synthetic_demo: false,
      rationale: cohort.rationale
    },
    {
      factor_id: 'availability_proxy',
      label: 'Availability / inventory proxy',
      contribution: availability,
      synthetic_demo: true,
      rationale: `Synthetic availability readiness for ${sku} at ${store.store_id}.`
    }
  ];

  const raw = factors.reduce((s, f) => s + f.contribution, 0);
  const opportunity_score = Number(clamp(raw, 0, 100).toFixed(2));
  const tier = tierFromStoreScore(opportunity_score);
  const included = tier === 'HIGH' || tier === 'MEDIUM';

  const inclusion_reasons: string[] = [];
  const exclusion_reasons: string[] = [];
  for (const f of factors) {
    if (f.contribution > 0) inclusion_reasons.push(f.rationale);
    if (f.contribution < 0) exclusion_reasons.push(f.rationale);
  }
  if (!region.matched) {
    exclusion_reasons.push(`Excluded from recommendation set: outside region scope ${campaign.audience_market.region}`);
  }
  if (tier === 'EXCLUDE' || tier === 'WATCH') {
    exclusion_reasons.push(`Tier ${tier}: opportunity_score ${opportunity_score} below inclusion threshold`);
  }
  if (included && inclusion_reasons.length === 0) {
    inclusion_reasons.push('Meets inclusion score threshold with neutral factors');
  }

  return {
    store_id: store.store_id,
    store_name: store.name,
    region: store.region,
    city: store.city,
    format: store.format,
    opportunity_score,
    tier,
    factors,
    inclusion_reasons,
    exclusion_reasons,
    included: included && region.matched,
    synthetic_demo: true
  };
}

function buildCohorts(stores: MicroMarketStoreScore[]): MicroMarketCohort[] {
  const byRegion = new Map<string, MicroMarketStoreScore[]>();
  for (const s of stores.filter(x => x.included)) {
    const list = byRegion.get(s.region) || [];
    list.push(s);
    byRegion.set(s.region, list);
  }
  const cohorts: MicroMarketCohort[] = [];
  for (const [region, list] of byRegion) {
    const avg = list.reduce((a, b) => a + b.opportunity_score, 0) / list.length;
    cohorts.push({
      cohort_id: `cohort_${region.replace(/\s+/g, '_').toLowerCase()}`,
      label: `${region} included stores`,
      store_ids: list.map(s => s.store_id),
      average_score: Number(avg.toFixed(2)),
      tier: tierFromStoreScore(avg),
      rationale: `${list.length} stores in ${region} with mean opportunity score ${avg.toFixed(1)}.`
    });
  }
  return cohorts.sort((a, b) => b.average_score - a.average_score);
}

export function evaluateMicroMarketOpportunity(campaign: CampaignIntent): MicroMarketOpportunity {
  const scored = STORES.map(s => scoreStore(s, campaign, STORES)).sort(
    (a, b) => b.opportunity_score - a.opportunity_score
  );
  const included = scored.filter(s => s.included);
  const cohorts = buildCohorts(scored);
  const recommended = included.filter(s => s.tier === 'HIGH').map(s => s.store_id);
  // If no HIGH tier, fall back to MEDIUM recommendations
  const recommended_store_ids =
    recommended.length > 0 ? recommended : included.map(s => s.store_id).slice(0, 8);

  const evaluation: MicroMarketOpportunity = {
    evaluation_id: `mmo_${campaign.campaign_intent_id}_${Date.now()}`,
    campaign_intent_id: campaign.campaign_intent_id,
    tenant_id: campaign.tenant_id,
    session_id: campaign.session_id,
    region_scope: campaign.audience_market.region || 'national',
    stores_evaluated: scored.length,
    stores_included: included.length,
    stores: scored,
    cohorts,
    recommended_store_ids,
    calculation_mode: 'deterministic_demo_micro_market',
    synthetic_demo: true,
    schema_version: SCHEMA_VERSION,
    provenance: {
      engine: 'cdi03_micro_market_v1',
      store_seed: 'data/stores.json',
      store_count: String(STORES.length),
      synthetic: 'true'
    },
    timestamp: new Date().toISOString()
  };

  const validation = validateMicroMarketOpportunity(evaluation);
  if (!validation.valid) {
    throw new Error(`Invalid MicroMarketOpportunity: ${validation.errors.join('; ')}`);
  }
  return evaluation;
}

/**
 * Single tenant/session boundary for every CDI-03 entry point. Routes must not
 * re-implement this — one copy keeps the isolation rule from drifting.
 */
export function resolveOpportunityCampaign(request: OpportunityDiscoveryRequest): CampaignIntent {
  let campaign = request.campaign_intent;
  if (!campaign && request.campaign_intent_id) {
    campaign =
      getCampaignIntentById(request.campaign_intent_id, request.tenant_id, request.session_id) ||
      undefined;
    if (!campaign) {
      throw new Error(
        `CampaignIntentNotFound: ${request.campaign_intent_id} is not visible to the supplied tenant/session`
      );
    }
  }
  if (!campaign) {
    throw new Error('Provide campaign_intent_id or campaign_intent');
  }
  if (campaign.tenant_id !== request.tenant_id) {
    throw new Error('Tenant boundary violation: campaign intent tenant_id mismatch');
  }
  if (campaign.session_id !== request.session_id) {
    throw new Error('Session boundary violation: campaign intent session_id mismatch');
  }
  return campaign;
}

export function discoverCampaignOpportunity(
  request: OpportunityDiscoveryRequest
): OpportunityDiscoveryResponse {
  const reqVal = validateOpportunityDiscoveryRequest(request);
  if (!reqVal.valid) {
    throw new Error(reqVal.errors.join('; '));
  }

  const campaign = resolveOpportunityCampaign(request);
  const opportunity_windows = evaluateOpportunityWindows(campaign, {
    discovery_horizon_days: request.discovery_horizon_days,
    window_duration_days: request.window_duration_days
  });
  const micro_markets = evaluateMicroMarketOpportunity(campaign);

  return {
    discovery_id: `opd_${campaign.campaign_intent_id}_${Date.now()}`,
    tenant_id: request.tenant_id,
    session_id: request.session_id,
    campaign_intent_id: campaign.campaign_intent_id,
    opportunity_windows,
    micro_markets,
    timestamp: new Date().toISOString(),
    schema_version: SCHEMA_VERSION
  };
}

/** Exposed for tests — window scoring must diverge across distant start dates. */
export function __test_scoreWindowDate(isoStart: string, campaign: CampaignIntent, durationDays = 7) {
  return buildCandidate(parseUtcDay(isoStart), durationDays, campaign, false);
}
