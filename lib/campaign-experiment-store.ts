/**
 * CogniX Campaign Decision Experiment Store
 * In-memory tenant/session-isolated store for preserving decision experiments,
 * generating deterministic comparisons, and synthesising executive briefs.
 *
 * Identity model
 * --------------
 * An experiment id (EXP-001, EXP-002, …) is a *display* identity that is sequential
 * within one tenant/session scope. Records are therefore keyed by the composite
 * tenant::session::experiment_id, never by the bare display id: two sessions may each
 * legitimately hold an EXP-001 and neither may see, overwrite or compare the other's.
 *
 * One logical decision owns exactly one experiment record. The scope keeps an "active"
 * experiment pointer so that repeated preservation calls — the canvas preserves after
 * evaluation, opportunity, readiness, frontier and contract registration, and the user
 * may double-click or reload — deepen the same record instead of minting a new id.
 * `closeActiveExperiment` ends that decision, so the next preservation starts a new one.
 * The pointer lives here rather than in component state so a browser refresh mid-decision
 * cannot silently fork one decision into two experiments.
 */

import {
  CampaignDecisionExperiment,
  ExperimentComparison,
  ExperimentComparisonDimension,
  ExperimentStandingDimension,
  ComparisonSynthesis,
  ExecutionBrief,
  ReadinessVerdict,
  MIN_COMPARISON_EXPERIMENTS,
  MAX_COMPARISON_EXPERIMENTS,
  readinessVerdictLabel,
  formatContributionGbp,
  formatDemandPct,
  validateCampaignDecisionExperiment,
  categoryLabel,
  segmentLabel,
  channelLabel,
  activationLabel,
  resolveCategory,
  resolveSegment,
  resolveChannel,
  discountIsConfinableToSegment
} from '../packages/contracts/src/index';
import { label } from './campaign-decision-language';

/** Deltas below these thresholds are presentation noise, not decision-material change. */
const DEMAND_MATERIALITY_PP = 0.05;
const CONTRIBUTION_MATERIALITY_GBP = 10;

class CampaignExperimentStore {
  /** tenant::session::EXP-xxx -> record. Composite so display ids may repeat across scopes. */
  private experimentsByScopedKey: Map<string, CampaignDecisionExperiment> = new Map();
  /** tenant::session -> experiment_id[] in creation order. */
  private experimentIdsBySession: Map<string, string[]> = new Map();
  /** tenant::session -> the experiment id the current in-progress decision owns. */
  private activeExperimentIdBySession: Map<string, string> = new Map();

  private buildSessionKey(tenantId: string, sessionId: string): string {
    return `${tenantId}::${sessionId}`;
  }

  private buildScopedKey(tenantId: string, sessionId: string, experimentId: string): string {
    return `${tenantId}::${sessionId}::${experimentId}`;
  }

  /** Structural clone that tolerates the engine payloads' plain-object shape. */
  private deepCopy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  /**
   * What an evaluation concluded, stripped of the identifiers and timestamps that differ on
   * every call. Two evaluations of an unchanged decision fingerprint identically; a genuine
   * re-evaluation does not.
   */
  private evaluationFingerprint(snapshot: any): string {
    if (!snapshot || typeof snapshot !== 'object') return '';
    const causal = snapshot.causal || {};
    const delta = snapshot.counterfactual?.campaign_delta || {};
    return JSON.stringify({
      uplift: causal.intervention_uplift_pp ?? null,
      ambient: causal.ambient_uplift_pp ?? null,
      total: causal.total_predicted_uplift_pp ?? null,
      attributable: delta.attributable_uplift_pp ?? null,
      contribution: delta.contribution_delta_gbp ?? null,
      volume: delta.volume_delta_units ?? null,
      drivers: (causal.drivers || []).map((d: any) => [d.driver_id, d.contribution_pp, d.attributed])
    });
  }

  /**
   * The next free display id in this scope.
   *
   * Derived from the highest number already allocated, not from how many records exist. A
   * count-based id collides the moment any record was created out of sequence — two records
   * and a highest id of EXP-005 would hand the next decision EXP-003, silently overwriting a
   * preserved one. History has to be append-only even when its numbering has gaps.
   */
  public getNextExperimentId(tenantId: string, sessionId: string): string {
    const key = this.buildSessionKey(tenantId, sessionId);
    const existing = this.experimentIdsBySession.get(key) || [];
    const highest = existing.reduce((max, id) => {
      const n = Number.parseInt(id.replace(/^EXP-/, ''), 10);
      return Number.isFinite(n) && n > max ? n : max;
    }, 0);
    return `EXP-${String(highest + 1).padStart(3, '0')}`;
  }

  /** The experiment id the in-progress decision owns, or null when a new decision is being drafted. */
  public getActiveExperimentId(tenantId: string, sessionId: string): string | null {
    return this.activeExperimentIdBySession.get(this.buildSessionKey(tenantId, sessionId)) || null;
  }

  /**
   * End the current decision without deleting it. Called by session reset / Start New Decision:
   * history is preserved, but the next preservation allocates a fresh experiment identity.
   */
  public closeActiveExperiment(tenantId: string, sessionId: string): void {
    this.activeExperimentIdBySession.delete(this.buildSessionKey(tenantId, sessionId));
  }

  public saveExperiment(
    experimentOrTenant: CampaignDecisionExperiment | string,
    sessionIdParam?: string,
    payloadParam?: Partial<CampaignDecisionExperiment>
  ): CampaignDecisionExperiment {
    const tenantId = typeof experimentOrTenant === 'string' ? experimentOrTenant : experimentOrTenant.tenant_id;
    const sessionId = typeof experimentOrTenant === 'string' ? sessionIdParam! : experimentOrTenant.session_id;
    const payload: Partial<CampaignDecisionExperiment> =
      typeof experimentOrTenant === 'string' ? payloadParam || {} : experimentOrTenant;

    if (!tenantId || !sessionId) {
      throw new Error('Campaign decision experiments are always tenant and session scoped');
    }

    const sessionKey = this.buildSessionKey(tenantId, sessionId);

    const activeId = this.getActiveExperimentId(tenantId, sessionId);

    // Resolve which experiment this preservation belongs to: the decision currently in
    // progress owns it, otherwise this is a new decision.
    //
    // An explicit experiment_id is honoured only when it names the decision already in
    // progress. A closed record is history, and history is not writable: allowing a request
    // to nominate any id would let a stray or replayed request overwrite a preserved
    // decision and silently re-open it as the session's active one, which is the one thing
    // an experiment log must never permit.
    const requestedId = payload.experiment_id;
    if (requestedId && activeId && requestedId !== activeId) {
      throw new Error(
        `Experiment ${requestedId} is not the decision in progress (${activeId}); preserved experiments are immutable`
      );
    }
    if (requestedId && !activeId && this.experimentIdsBySession.get(sessionKey)?.includes(requestedId)) {
      throw new Error(`Experiment ${requestedId} is already preserved and cannot be rewritten`);
    }

    const targetId = requestedId || activeId || this.getNextExperimentId(tenantId, sessionId);

    const scopedKey = this.buildScopedKey(tenantId, sessionId, targetId);
    const existing = this.experimentsByScopedKey.get(scopedKey);
    const now = new Date().toISOString();

    // A fresh evaluation restarts the analysis chain, so results computed against the previous
    // evaluation no longer describe this decision — both the raw downstream snapshots and the
    // derived scalars read off them. Carrying either forward leaves a record whose readiness
    // verdict and recommendation answer a configuration it no longer holds.
    //
    // Sameness is judged on what the evaluation concluded, not on the whole response: every
    // CDI-02 response carries a fresh evaluation_id and timestamps, so a whole-object compare
    // reports every preservation as a re-evaluation and drops analysis on each save.
    const reEvaluated =
      !!payload.evaluation_snapshot &&
      !!existing?.evaluation_snapshot &&
      this.evaluationFingerprint(payload.evaluation_snapshot) !==
        this.evaluationFingerprint(existing.evaluation_snapshot);
    const carried: Partial<CampaignDecisionExperiment> = reEvaluated
      ? {
          ...existing,
          opportunity_snapshot: payload.opportunity_snapshot,
          readiness_snapshot: payload.readiness_snapshot,
          timeline_snapshot: payload.timeline_snapshot,
          frontier_snapshot: payload.frontier_snapshot,
          contract_snapshot: payload.contract_snapshot,
          // Derived from the superseded downstream analysis — re-supplied by this payload or
          // absent, never inherited.
          readiness_status: payload.readiness_status,
          readiness_summary: payload.readiness_summary,
          decision_recommendation: payload.decision_recommendation,
          primary_trade_off: payload.primary_trade_off,
          selected_strategy_id: payload.selected_strategy_id,
          selected_strategy_name: payload.selected_strategy_name
        }
      : existing || {};

    // Later stages of one decision carry more analysis than earlier ones. Merge rather than
    // replace so a field already established (a frontier result, say) is never blanked by a
    // subsequent preservation that did not carry it.
    const merged: CampaignDecisionExperiment = {
      ...carried,
      ...Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined)),
      experiment_id: targetId,
      tenant_id: tenantId,
      session_id: sessionId,
      campaign_intent_id: payload.campaign_intent_id || existing?.campaign_intent_id || `intent-${targetId}`,
      created_at: existing?.created_at || payload.created_at || now,
      completed_at: payload.completed_at || now,
      framing_question: payload.framing_question ?? existing?.framing_question ?? 'Campaign framing question',
      objective_type: payload.objective_type || existing?.objective_type || 'REVENUE_ACCELERATION',
      objective_label: payload.objective_label || existing?.objective_label || 'Revenue Acceleration',
      category: payload.category || existing?.category || 'Default Category',
      sku_scope: payload.sku_scope || existing?.sku_scope || ['P001'],
      region: payload.region || existing?.region || 'National',
      timing_mode: payload.timing_mode || existing?.timing_mode || 'FIND_BEST_WINDOW',
      intervention_posture: payload.intervention_posture || existing?.intervention_posture || 'CONSIDER_PROMOTION',
      posture_label: payload.posture_label || existing?.posture_label || 'Consider Promotion',
      primary_metric: payload.primary_metric || existing?.primary_metric || 'CONTRIBUTION',
      target_direction: payload.target_direction || existing?.target_direction || 'INCREASE',
      major_constraints: payload.major_constraints || existing?.major_constraints || [],
      decision_recommendation:
        payload.decision_recommendation || carried.decision_recommendation || 'Balanced promotion',
      incremental_demand_pct: payload.incremental_demand_pct ?? existing?.incremental_demand_pct ?? 0,
      contribution_impact_gbp: payload.contribution_impact_gbp ?? existing?.contribution_impact_gbp ?? 0,
      readiness_status: payload.readiness_status || carried.readiness_status || 'NOT_ASSESSED',
      readiness_summary:
        payload.readiness_summary || carried.readiness_summary || 'Operational readiness was not assessed.',
      primary_trade_off: payload.primary_trade_off || carried.primary_trade_off || 'Margin vs volume balance',
      evidence_posture:
        payload.evidence_posture ||
        existing?.evidence_posture ||
        'Demonstration evidence basis: uncalibrated simulation data',
      technical_provenance: payload.technical_provenance ||
        existing?.technical_provenance || { source: 'campaign-decision-canvas' },
      schema_version: payload.schema_version || existing?.schema_version || '1.0',
      intent_snapshot: (payload.intent_snapshot ?? existing?.intent_snapshot) as any
    };

    const validation = validateCampaignDecisionExperiment(merged);
    if (!validation.valid) {
      throw new Error(`Invalid CampaignDecisionExperiment: ${validation.errors.join(', ')}`);
    }

    // Deep-copied on the way in. A shallow copy leaves the nested snapshots aliased to the
    // caller's live objects, so a later edit to the working intent would rewrite a decision
    // that has already been preserved — the record would change without anyone saving it.
    this.experimentsByScopedKey.set(scopedKey, this.deepCopy(merged));

    if (!existing) {
      const list = this.experimentIdsBySession.get(sessionKey) || [];
      if (!list.includes(targetId)) {
        list.push(targetId);
        this.experimentIdsBySession.set(sessionKey, list);
      }
    }
    // This decision now owns the identity until it is explicitly closed.
    this.activeExperimentIdBySession.set(sessionKey, targetId);

    return this.deepCopy(merged);
  }

  /**
   * Session scope is mandatory. An experiment id is only meaningful inside the scope that
   * minted it, so a tenant-only read would be an existence oracle across sessions.
   */
  public getExperimentById(
    experimentId: string,
    tenantId: string,
    sessionId: string
  ): CampaignDecisionExperiment | null {
    if (!tenantId || !sessionId) return null;
    const exp = this.experimentsByScopedKey.get(this.buildScopedKey(tenantId, sessionId, experimentId));
    if (!exp) return null;
    if (exp.tenant_id !== tenantId || exp.session_id !== sessionId) return null;
    // Deep-copied on the way out for the same reason: a caller mutating what it read must
    // not be able to reach into preserved history.
    return this.deepCopy(exp);
  }

  public listExperiments(
    tenantId: string,
    sessionId: string,
    filters?: {
      category?: string;
      region?: string;
      objective_type?: string;
      recommendation?: string;
    }
  ): CampaignDecisionExperiment[] {
    const ids = this.experimentIdsBySession.get(this.buildSessionKey(tenantId, sessionId)) || [];
    let results = ids
      .map(id => this.experimentsByScopedKey.get(this.buildScopedKey(tenantId, sessionId, id)))
      .filter((exp): exp is CampaignDecisionExperiment => !!exp);

    if (filters?.category) {
      const cat = filters.category.toLowerCase();
      results = results.filter(e => e.category.toLowerCase().includes(cat));
    }
    if (filters?.region) {
      const reg = filters.region.toLowerCase();
      results = results.filter(e => e.region.toLowerCase().includes(reg));
    }
    if (filters?.objective_type) {
      results = results.filter(e => e.objective_type === filters.objective_type);
    }
    if (filters?.recommendation) {
      const rec = filters.recommendation.toLowerCase();
      results = results.filter(e => e.decision_recommendation.toLowerCase().includes(rec));
    }

    // Newest first, with the sequential id as a stable tie-break: several preservations of one
    // decision share a timestamp granularity, so completed_at alone is not a total order.
    return results.sort((a, b) => {
      const byTime = new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime();
      return byTime !== 0 ? byTime : b.experiment_id.localeCompare(a.experiment_id);
    });
  }

  /**
   * Compare 2–4 preserved experiments.
   *
   * Accepts ids as rest arguments or as a single array. Returns null when any id does not
   * resolve inside this tenant/session scope, or when the count falls outside 2–4 — a
   * comparison the caller cannot render honestly is not returned in a degraded form.
   */
  public compareExperiments(
    tenantId: string,
    sessionId: string,
    ...experimentIdArgs: (string | string[])[]
  ): ExperimentComparison | null {
    // Duplicates are collapsed before the count is checked. Resolving the same record twice
    // would let one experiment appear as two "configurations", win against itself, and inflate
    // the compared count — a comparison of one decision reported as a comparison of three.
    //
    // Naming ONE experiment twice and nothing else is different: that is a request to compare
    // a decision with itself, which the synthesis answers explicitly rather than refusing.
    const requestedIds = experimentIdArgs.flat();
    const uniqueRequested = Array.from(new Set(requestedIds));
    const experimentIds =
      uniqueRequested.length === 1 && requestedIds.length >= MIN_COMPARISON_EXPERIMENTS
        ? [uniqueRequested[0], uniqueRequested[0]]
        : uniqueRequested;
    if (experimentIds.length < MIN_COMPARISON_EXPERIMENTS) return null;
    if (experimentIds.length > MAX_COMPARISON_EXPERIMENTS) return null;

    const resolved = experimentIds.map(id => this.getExperimentById(id, tenantId, sessionId));
    if (resolved.some(e => !e)) return null;
    const experiments = resolved as CampaignDecisionExperiment[];

    const dimensions = this.buildComparisonDimensions(experiments);

    return {
      experiments,
      dimensions,
      synthesis: this.generateComparisonSynthesis(experiments, dimensions),
      compared_at: new Date().toISOString()
    };
  }

  private formatDemand(pct: number): string {
    return formatDemandPct(pct);
  }

  private formatMoney(gbp: number): string {
    return formatContributionGbp(gbp);
  }

  private joinClauses(parts: string[]): string {
    if (parts.length <= 1) return parts.join('');
    return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
  }

  private readinessLabel(status: string): string {
    return readinessVerdictLabel(status as ReadinessVerdict);
  }

  /** A dimension is focal when the compared experiments do not all agree on it. */
  private buildComparisonDimensions(
    experiments: CampaignDecisionExperiment[]
  ): ExperimentComparisonDimension[] {
    const spread = (values: number[]) => Math.max(...values) - Math.min(...values);
    const demandSpread = spread(experiments.map(e => e.incremental_demand_pct));
    const contribSpread = spread(experiments.map(e => e.contribution_impact_gbp));

    const row = (
      dimension: string,
      values: string[],
      isFocal: boolean,
      differenceSummary?: string
    ): ExperimentComparisonDimension => ({
      dimension,
      values,
      difference_summary: differenceSummary,
      is_focal_difference: isFocal
    });

    /**
     * Focality is judged on the values the reader will actually see.
     *
     * Judging it on the underlying field instead produced both halves of the same bug: a row
     * whose rendered values were identical could be highlighted as a key difference, and a row
     * showing two visibly different values could be reported as equivalent because the enum
     * behind them matched. What the table shows and what the narrative claims have to agree.
     */
    const allEqual = (values: string[]) => values.every(v => v === values[0]);
    const differs = (values: string[]) => !allEqual(values);

    // Objective and posture are compared through their governed enum, not through the free-text
    // label stored alongside it. Two records can carry the same objective_type and differently
    // cased prose ("Revenue Acceleration" vs "Revenue acceleration"), and comparing the prose
    // reported a focal difference between two decisions with identical objectives.
    const objective = experiments.map(e =>
      e.objective_type ? label('campaign_objective', e.objective_type) : e.objective_label
    );
    const scope = experiments.map(e => `${categoryLabel(e.category)} · ${e.sku_scope.join(', ')}`);
    const region = experiments.map(e => e.region);
    const audience = experiments.map(e => segmentLabel(e.audience_segment));
    const channel = experiments.map(e => channelLabel(e.sales_channel));
    const posture = experiments.map(e =>
      e.intervention_posture ? label('intervention_posture', e.intervention_posture) : e.posture_label
    );
    const demand = experiments.map(e => this.formatDemand(e.incremental_demand_pct));
    const contribution = experiments.map(e => this.formatMoney(e.contribution_impact_gbp));
    const readiness = experiments.map(e => this.readinessLabel(e.readiness_status));
    const tradeOff = experiments.map(e => e.primary_trade_off);
    const recommendation = experiments.map(e => e.decision_recommendation);

    const activation = experiments.map(e =>
      (e.activation_channels || []).length > 0
        ? e.activation_channels!.map(a => activationLabel(a)).join(', ')
        : 'None'
    );
    const timing = experiments.map(
      e => e.planned_window || (e.timing_mode === 'KNOWN_DATES' ? 'Stated dates' : 'Discovered window')
    );
    const objectiveMetric = experiments.map(e => `${label('primary_metric', e.primary_metric)} · ${e.target_direction.toLowerCase()}`);
    const evidence = experiments.map(e => e.evidence_posture);

    // Demand and contribution keep numeric materiality thresholds — a rounding-level
    // difference in a formatted figure is presentation noise, not a decision. Every other
    // dimension is compared on what is rendered.
    const demandFocal = demandSpread > DEMAND_MATERIALITY_PP && differs(demand);
    const contribFocal = contribSpread > CONTRIBUTION_MATERIALITY_GBP && differs(contribution);

    return [
      row('Objective', objective, differs(objective)),
      row('Category & SKU', scope, differs(scope)),
      row('Region', region, differs(region)),
      row('Audience', audience, differs(audience)),
      row('Route to customer', channel, differs(channel)),
      row('Activation routes', activation, differs(activation)),
      row('Intervention posture', posture, differs(posture)),
      row('Timing', timing, differs(timing)),
      row('Measured on', objectiveMetric, differs(objectiveMetric)),
      row(
        'Incremental demand',
        demand,
        demandFocal,
        demandFocal ? `${demandSpread.toFixed(1)}pp spread` : undefined
      ),
      row(
        'Contribution impact',
        contribution,
        contribFocal,
        contribFocal ? `£${Math.round(contribSpread).toLocaleString()} spread` : undefined
      ),
      row('Operational readiness', readiness, differs(readiness)),
      row('Primary trade-off', tradeOff, differs(tradeOff)),
      row('Evidence basis', evidence, differs(evidence)),
      row('Decision recommendation', recommendation, differs(recommendation))
    ];
  }

  /**
   * Readiness as an order. DO_NOT_PROCEED is worst; an unassessed decision sits above it but
   * below anything the engine actually cleared, and is never allowed to lead the readiness
   * dimension — "not assessed" is an absence of evidence, not a low-risk finding.
   */
  private readinessRank(status: ReadinessVerdict): number {
    switch (status) {
      case 'READY':
        return 4;
      case 'CONDITIONAL':
        return 3;
      case 'REVIEW':
        return 2;
      case 'NOT_ASSESSED':
        return 1;
      default:
        return 0;
    }
  }

  private readinessCleared(status: ReadinessVerdict): boolean {
    return status === 'READY' || status === 'CONDITIONAL';
  }

  /**
   * Whether a preserved experiment rests on demonstration data. Recorded on the snapshot at
   * preservation time, so this reads history rather than the current session's posture.
   */
  private isSyntheticEvidence(exp: CampaignDecisionExperiment): boolean {
    if (typeof exp.intent_snapshot?.synthetic_demo === 'boolean') {
      return exp.intent_snapshot.synthetic_demo;
    }
    return /demonstration|uncalibrated|synthetic|simulat/i.test(exp.evidence_posture || '');
  }

  /**
   * Per-dimension standing across the compared set.
   *
   * `separates: false` is a first-class answer. Where the snapshots do not distinguish the
   * experiments on a dimension, saying so is more useful than naming an arbitrary leader,
   * and it is what stops a four-way comparison from manufacturing a winner.
   */
  private buildStandings(experiments: CampaignDecisionExperiment[]): ExperimentStandingDimension[] {
    const standings: ExperimentStandingDimension[] = [];

    const leadersBy = <T>(
      score: (e: CampaignDecisionExperiment) => T,
      better: (a: T, b: T) => number,
      eligible: (e: CampaignDecisionExperiment) => boolean = () => true
    ): CampaignDecisionExperiment[] => {
      const pool = experiments.filter(eligible);
      if (pool.length === 0) return [];
      const best = pool.reduce((acc, e) => (better(score(e), score(acc)) > 0 ? e : acc), pool[0]);
      return pool.filter(e => better(score(e), score(best)) === 0);
    };

    // Commercial — contribution, on the materiality threshold used everywhere else.
    const contributions = experiments.map(e => e.contribution_impact_gbp);
    const contribSpread = Math.max(...contributions) - Math.min(...contributions);
    const commercialLeaders = leadersBy(
      e => e.contribution_impact_gbp,
      (a, b) => a - b
    );
    standings.push({
      dimension: 'commercial',
      leader_experiment_ids: contribSpread > CONTRIBUTION_MATERIALITY_GBP ? commercialLeaders.map(e => e.experiment_id) : [],
      basis:
        contribSpread > CONTRIBUTION_MATERIALITY_GBP
          ? `Highest modelled contribution (${this.formatMoney(commercialLeaders[0].contribution_impact_gbp)}), on a £${Math.round(contribSpread).toLocaleString()} spread across the set.`
          : 'Contribution is materially equivalent across the compared experiments.',
      separates: contribSpread > CONTRIBUTION_MATERIALITY_GBP
    });

    // Demand — headline volume effect.
    const demands = experiments.map(e => e.incremental_demand_pct);
    const demandSpread = Math.max(...demands) - Math.min(...demands);
    const demandLeaders = leadersBy(
      e => e.incremental_demand_pct,
      (a, b) => a - b
    );
    standings.push({
      dimension: 'demand',
      leader_experiment_ids: demandSpread > DEMAND_MATERIALITY_PP ? demandLeaders.map(e => e.experiment_id) : [],
      basis:
        demandSpread > DEMAND_MATERIALITY_PP
          ? `Largest expected demand effect (${this.formatDemand(demandLeaders[0].incremental_demand_pct)}), on a ${demandSpread.toFixed(1)}pp spread.`
          : 'Expected demand is materially equivalent across the compared experiments.',
      separates: demandSpread > DEMAND_MATERIALITY_PP
    });

    // Readiness — execution risk.
    //
    // Only a configuration the engine actually cleared may lead this dimension. Ranking the
    // whole set and taking the top would name the least-bad option among configurations that
    // were all refused: with a blocked option and an unassessed one, the blocked option would
    // be reported as the lowest execution risk and recommended, because it is the only one
    // with an assessment. "Least refused" is not "safe".
    const cleared = experiments.filter(e => this.readinessCleared(e.readiness_status));
    const assessed = experiments.filter(e => e.readiness_status !== 'NOT_ASSESSED');
    const readinessVaries = new Set(experiments.map(e => e.readiness_status)).size > 1;
    const readinessLeaders =
      cleared.length > 0
        ? leadersBy(
            e => this.readinessRank(e.readiness_status),
            (a, b) => a - b,
            e => this.readinessCleared(e.readiness_status)
          )
        : [];
    const readinessSeparates = readinessVaries && readinessLeaders.length > 0;
    standings.push({
      dimension: 'readiness',
      leader_experiment_ids: readinessSeparates ? readinessLeaders.map(e => e.experiment_id) : [],
      basis:
        assessed.length === 0
          ? 'No compared experiment was assessed for operational readiness.'
          : cleared.length === 0
            ? 'No compared experiment cleared operational readiness, so none carries a lower execution risk than the others.'
            : readinessVaries
              ? `Cleared operational readiness at ${this.readinessLabel(readinessLeaders[0].readiness_status)}.`
              : `All compared experiments hold the same readiness verdict (${this.readinessLabel(experiments[0].readiness_status)}).`,
      separates: readinessSeparates
    });

    // Evidence — whether the numbers rest on demonstration data or attested measurement.
    const syntheticFlags = experiments.map(e => this.isSyntheticEvidence(e));
    const evidenceVaries = new Set(syntheticFlags).size > 1;
    const attested = experiments.filter(e => !this.isSyntheticEvidence(e));
    standings.push({
      dimension: 'evidence',
      leader_experiment_ids: evidenceVaries ? attested.map(e => e.experiment_id) : [],
      basis: evidenceVaries
        ? 'Rests on attested measurement where the others rest on demonstration data.'
        : syntheticFlags[0]
          ? 'Every compared experiment rests on demonstration data, so evidence strength does not separate them.'
          : 'Every compared experiment rests on attested measurement.',
      separates: evidenceVaries
    });

    return standings;
  }

  /**
   * Deterministic synthesis over the compared experiments.
   *
   * Two rules keep this honest, and they hold at two, three and four experiments alike:
   * nothing is asserted that the preserved snapshots do not show, and no winner is
   * manufactured where the evidence does not separate the configurations. A set that
   * differs in nothing material is reported as exactly that — inventing a "distinct
   * trade-off" narrative for equivalent records would be the most damaging thing this
   * surface could do, because it reads as analysis.
   */
  private generateComparisonSynthesis(
    experiments: CampaignDecisionExperiment[],
    dimensions: ExperimentComparisonDimension[]
  ): ComparisonSynthesis {
    const ids = experiments.map(e => e.experiment_id);
    const uniqueIds = Array.from(new Set(ids));
    const idList = this.joinClauses(uniqueIds);

    if (uniqueIds.length < 2) {
      return {
        headline: `${uniqueIds[0]} compared with itself`,
        what_changed: `${uniqueIds[0]} has been compared against itself, so no configuration or outcome differs.`,
        why_it_matters:
          'No material decision differences detected. Select different preserved experiments to evaluate a trade-off.',
        standings: [],
        trade_offs: [],
        watch_items: [],
        next_move: 'Select a second preserved experiment to compare against.'
      };
    }

    const focal = dimensions.filter(d => d.is_focal_difference);

    if (focal.length === 0) {
      return {
        headline: `${idList}: no material differences`,
        what_changed: `No material decision differences detected across ${idList}. Objective, scope, region, audience, route to customer, posture, readiness, recommendation and commercial outcome are equivalent in every preserved snapshot.`,
        why_it_matters:
          'There is no trade-off to weigh here: the compared decisions are equivalent on every dimension. Vary scope, audience, route to customer, posture or objective to produce a decision-relevant comparison.',
        standings: [],
        trade_offs: [],
        watch_items: [],
        next_move:
          'Change one dimension — audience, route to customer, category or posture — and preserve a new experiment to create a real comparison.'
      };
    }

    const standings = this.buildStandings(experiments);
    const byId = new Map(experiments.map(e => [e.experiment_id, e]));
    const standing = (dimension: string) => standings.find(s => s.dimension === dimension);

    const commercial = standing('commercial');
    const demand = standing('demand');
    const readiness = standing('readiness');

    const whatChanged = this.describeWhatChanged(experiments, focal);

    // ── Strongest commercial option ────────────────────────────────────────
    // Only a single configuration whose readiness the engine actually cleared may be
    // recommended. A tie, an uncleared leader, or an unseparated set all yield no winner.
    let strongerId: string | undefined;
    let rationale: string | undefined;
    let whyItMatters: string;

    const commercialLeaderIds = commercial?.leader_experiment_ids || [];
    const soleCommercialLeader =
      commercialLeaderIds.length === 1 ? byId.get(commercialLeaderIds[0]) : undefined;

    if (!commercial?.separates && !demand?.separates) {
      whyItMatters = `Commercial separation is unavailable: the compared experiments do not differ materially in contribution or demand, so this comparison cannot rank them on outcome. The difference is one of configuration only.`;
    } else if (!commercial?.separates) {
      whyItMatters = `Expected demand differs by ${this.setDemandSpread(experiments).toFixed(1)}pp but contribution is materially equivalent, so the configurations are commercially comparable — choose on operational fit rather than on financial return.`;
    } else if (commercialLeaderIds.length > 1) {
      whyItMatters = `${this.joinClauses(commercialLeaderIds)} return the same contribution, so no single configuration is commercially strongest. Separate them on readiness or evidence rather than on financial return.`;
    } else if (soleCommercialLeader && soleCommercialLeader.contribution_impact_gbp <= 0) {
      // Ranking value-destroying options against each other produces a "winner" that loses
      // the least. Recommending it would tell a planner to proceed with a configuration the
      // model says destroys contribution, which is the opposite of what the comparison found.
      whyItMatters = `Every compared configuration destroys contribution, from ${this.formatMoney(
        Math.min(...experiments.map(e => e.contribution_impact_gbp))
      )} to ${this.formatMoney(
        soleCommercialLeader.contribution_impact_gbp
      )}. ${soleCommercialLeader.experiment_id} loses the least, which is not a case for proceeding with it — none of these is commercially viable as configured.`;
    } else if (soleCommercialLeader && !this.readinessCleared(soleCommercialLeader.readiness_status)) {
      whyItMatters = `${soleCommercialLeader.experiment_id} carries the highest contribution (${this.formatMoney(soleCommercialLeader.contribution_impact_gbp)}) but its operational readiness is ${this.readinessLabel(soleCommercialLeader.readiness_status)}, so the financial advantage is not currently actionable.`;
    } else if (soleCommercialLeader) {
      strongerId = soleCommercialLeader.experiment_id;
      const runnerUp = experiments
        .filter(e => e.experiment_id !== strongerId)
        .reduce((acc, e) => (e.contribution_impact_gbp > acc.contribution_impact_gbp ? e : acc));
      const contribGap = soleCommercialLeader.contribution_impact_gbp - runnerUp.contribution_impact_gbp;
      const demandGap = soleCommercialLeader.incremental_demand_pct - runnerUp.incremental_demand_pct;
      const gaveUpVolume = demandGap < -DEMAND_MATERIALITY_PP;
      whyItMatters = gaveUpVolume
        ? `${strongerId} gives up ${Math.abs(demandGap).toFixed(1)}pp of headline demand against ${runnerUp.experiment_id} but returns £${Math.abs(Math.round(contribGap)).toLocaleString()} more contribution, so the narrower configuration is the better commercial trade-off despite the smaller top line.`
        : `${strongerId} delivers £${Math.abs(Math.round(contribGap)).toLocaleString()} more contribution than ${runnerUp.experiment_id}${Math.abs(demandGap) > DEMAND_MATERIALITY_PP ? ` on ${Math.abs(demandGap).toFixed(1)}pp more demand` : ' at comparable demand'}, and clears readiness at ${this.readinessLabel(soleCommercialLeader.readiness_status)}.`;
      rationale = gaveUpVolume
        ? 'Higher net contribution from a tighter scope.'
        : 'Higher contribution without a readiness penalty.';
    } else {
      whyItMatters = `The compared experiments differ in configuration (${focal.map(f => f.dimension.toLowerCase()).join(', ')}) without separating on outcome, so none is commercially preferable on the preserved evidence.`;
    }

    // ── Lowest execution risk ──────────────────────────────────────────────
    // Reported separately from the commercial leader precisely because they are often not
    // the same configuration, and collapsing them would hide the decision.
    const readinessLeaderIds = readiness?.leader_experiment_ids || [];
    const lowestExecutionRiskId =
      readiness?.separates && readinessLeaderIds.length === 1 ? readinessLeaderIds[0] : undefined;

    return {
      headline: this.buildHeadline(experiments, focal),
      what_changed: whatChanged,
      why_it_matters: whyItMatters,
      stronger_experiment_id: strongerId,
      recommendation_rationale: rationale,
      lowest_execution_risk_experiment_id: lowestExecutionRiskId,
      standings,
      trade_offs: this.buildTradeOffs(experiments, strongerId, lowestExecutionRiskId),
      watch_items: this.buildWatchItems(experiments),
      next_move: this.buildNextMove(experiments, strongerId, lowestExecutionRiskId, focal)
    };
  }

  private setDemandSpread(experiments: CampaignDecisionExperiment[]): number {
    const values = experiments.map(e => e.incremental_demand_pct);
    return Math.max(...values) - Math.min(...values);
  }

  private buildHeadline(
    experiments: CampaignDecisionExperiment[],
    focal: ExperimentComparisonDimension[]
  ): string {
    const count = experiments.length;
    const lead = focal[0].dimension.toLowerCase();
    return count === 2
      ? `${experiments[1].experiment_id} vs ${experiments[0].experiment_id}: ${lead} differs`
      : `${count} configurations compared — ${focal.length} dimension${focal.length === 1 ? '' : 's'} differ, led by ${lead}`;
  }

  /**
   * Configuration first, then the outcome those changes produced. Every dimension that the
   * comparison marked focal is described, so a difference the reader can see in the table is
   * never absent from the narrative.
   */
  private describeWhatChanged(
    experiments: CampaignDecisionExperiment[],
    focal: ExperimentComparisonDimension[]
  ): string {
    const distinct = (values: string[]) => Array.from(new Set(values));
    // Every configuration dimension the table can mark focal must be describable here.
    // A dimension missing from this set produced a narrative that claimed equivalence while
    // the row beside it displayed two different values.
    const configDimensions = new Set([
      'Objective',
      'Category & SKU',
      'Region',
      'Audience',
      'Route to customer',
      'Activation routes',
      'Intervention posture',
      'Timing',
      'Measured on',
      'Evidence basis',
      'Primary trade-off'
    ]);

    const configChanges = focal
      .filter(d => configDimensions.has(d.dimension))
      .map(d => `${d.dimension.toLowerCase()} varies across ${this.joinClauses(distinct(d.values))}`);

    const outcomeChanges: string[] = [];
    const demandSpread = this.setDemandSpread(experiments);
    if (demandSpread > DEMAND_MATERIALITY_PP) {
      const best = experiments.reduce((a, e) => (e.incremental_demand_pct > a.incremental_demand_pct ? e : a));
      const worst = experiments.reduce((a, e) => (e.incremental_demand_pct < a.incremental_demand_pct ? e : a));
      outcomeChanges.push(
        `expected demand spans ${demandSpread.toFixed(1)}pp, from ${this.formatDemand(worst.incremental_demand_pct)} on ${worst.experiment_id} to ${this.formatDemand(best.incremental_demand_pct)} on ${best.experiment_id}`
      );
    }
    const contributions = experiments.map(e => e.contribution_impact_gbp);
    const contribSpread = Math.max(...contributions) - Math.min(...contributions);
    if (contribSpread > CONTRIBUTION_MATERIALITY_GBP) {
      const best = experiments.reduce((a, e) => (e.contribution_impact_gbp > a.contribution_impact_gbp ? e : a));
      const worst = experiments.reduce((a, e) => (e.contribution_impact_gbp < a.contribution_impact_gbp ? e : a));
      outcomeChanges.push(
        `contribution spans £${Math.round(contribSpread).toLocaleString()}, from ${this.formatMoney(worst.contribution_impact_gbp)} on ${worst.experiment_id} to ${this.formatMoney(best.contribution_impact_gbp)} on ${best.experiment_id}`
      );
    }
    const readinessFocal = focal.find(d => d.dimension === 'Operational readiness');
    if (readinessFocal) {
      outcomeChanges.push(
        `operational readiness varies across ${this.joinClauses(distinct(readinessFocal.values))}`
      );
    }
    const recommendationFocal = focal.find(d => d.dimension === 'Decision recommendation');
    if (recommendationFocal) {
      outcomeChanges.push(
        `the recommendation varies across ${this.joinClauses(distinct(recommendationFocal.values).map(v => `"${v}"`))}`
      );
    }

    const idList = this.joinClauses(experiments.map(e => e.experiment_id));
    const configClause =
      configChanges.length > 0
        ? // Each clause already contains its own "and" over the values it lists, so joining the
          // clauses with another "and" produces a sentence with three of them and no clear
          // boundaries. Semicolons separate the clauses where there is more than one.
          `Across ${idList}, ${configChanges.length > 1 ? configChanges.join('; ') : configChanges[0]}.`
        : `${idList} share the same objective, scope, region, audience, route to customer and posture.`;
    const outcomeClause =
      outcomeChanges.length > 0
        ? ` As a result, ${outcomeChanges.join('; ')}.`
        : ' Commercial outcome and readiness are unchanged across the set.';

    return `${configClause}${outcomeClause}`;
  }

  /**
   * What each option costs to get what it gives. Stated only where the snapshots show both
   * sides of the trade — a gain with no corresponding sacrifice is not a trade-off.
   */
  private buildTradeOffs(
    experiments: CampaignDecisionExperiment[],
    strongerId?: string,
    lowestRiskId?: string
  ): string[] {
    const tradeOffs: string[] = [];
    const byId = new Map(experiments.map(e => [e.experiment_id, e]));

    const commercialLeader = strongerId ? byId.get(strongerId) : undefined;
    const demandLeader = experiments.reduce((a, e) =>
      e.incremental_demand_pct > a.incremental_demand_pct ? e : a
    );

    if (commercialLeader && demandLeader.experiment_id !== commercialLeader.experiment_id) {
      const demandGap = demandLeader.incremental_demand_pct - commercialLeader.incremental_demand_pct;
      const contribGap = commercialLeader.contribution_impact_gbp - demandLeader.contribution_impact_gbp;
      if (demandGap > DEMAND_MATERIALITY_PP && contribGap > CONTRIBUTION_MATERIALITY_GBP) {
        tradeOffs.push(
          `${commercialLeader.experiment_id} sacrifices ${demandGap.toFixed(1)}pp of expected demand against ${demandLeader.experiment_id} but returns £${Math.round(contribGap).toLocaleString()} more contribution.`
        );
      }
    }

    if (lowestRiskId && strongerId && lowestRiskId !== strongerId) {
      const safest = byId.get(lowestRiskId)!;
      const strongest = byId.get(strongerId)!;
      const contribGap = strongest.contribution_impact_gbp - safest.contribution_impact_gbp;
      tradeOffs.push(
        contribGap > CONTRIBUTION_MATERIALITY_GBP
          ? `${lowestRiskId} clears readiness at ${this.readinessLabel(safest.readiness_status)} against ${this.readinessLabel(strongest.readiness_status)} for ${strongerId}, at £${Math.round(contribGap).toLocaleString()} less contribution.`
          : `${lowestRiskId} carries the lower execution risk (${this.readinessLabel(safest.readiness_status)}) at comparable contribution, so the commercial case does not require the riskier configuration.`
      );
    }

    // A configuration that cannot confine its discount to the audience it targets is paying
    // for volume it would have won anyway. Experiments sharing the same leak are named
    // together: repeating one sentence per experiment reads as three findings when it is one,
    // and a comparison that pads its own output is harder to act on, not more thorough.
    const leaksByRoute = new Map<string, string[]>();
    for (const exp of experiments) {
      const segment = resolveSegment(exp.audience_segment);
      if (!segment || segment.id === 'ALL_CUSTOMERS') continue;
      if (
        discountIsConfinableToSegment(exp.audience_segment, exp.sales_channel, exp.activation_channels)
      ) {
        continue;
      }
      const route = `${segment.display_label} through ${channelLabel(exp.sales_channel)}`;
      const list = leaksByRoute.get(route) || [];
      list.push(exp.experiment_id);
      leaksByRoute.set(route, list);
    }
    for (const [route, expIds] of leaksByRoute) {
      const all = expIds.length === experiments.length;
      tradeOffs.push(
        all
          ? `Every compared configuration targets ${route}, which cannot confine an offer to that audience — the discount is paid on the whole base in each case.`
          : `${this.joinClauses(expIds)} target${expIds.length === 1 ? 's' : ''} ${route}, which cannot confine an offer to that audience — the discount is paid on the whole base.`
      );
    }

    return tradeOffs.slice(0, 4);
  }

  /**
   * Weaknesses that survive whichever configuration is chosen. Every item is read off a
   * preserved snapshot; nothing is added for balance.
   */
  private buildWatchItems(experiments: CampaignDecisionExperiment[]): string[] {
    const watch: string[] = [];

    const blocked = experiments.filter(e => e.readiness_status === 'DO_NOT_PROCEED');
    if (blocked.length > 0) {
      watch.push(
        `${this.joinClauses(blocked.map(e => e.experiment_id))} ${blocked.length === 1 ? 'is' : 'are'} blocked by a readiness constraint and cannot proceed as configured.`
      );
    }

    const unresolved = experiments.filter(e => e.readiness_status === 'REVIEW');
    if (unresolved.length > 0) {
      watch.push(
        `${this.joinClauses(unresolved.map(e => e.experiment_id))} ${unresolved.length === 1 ? 'has' : 'have'} unresolved readiness concerns to settle before commitment.`
      );
    }

    const unassessed = experiments.filter(e => e.readiness_status === 'NOT_ASSESSED');
    if (unassessed.length > 0) {
      watch.push(
        `${this.joinClauses(unassessed.map(e => e.experiment_id))} ${unassessed.length === 1 ? 'was' : 'were'} never assessed for operational readiness, so execution risk is unknown rather than low.`
      );
    }

    const lossMaking = experiments.filter(e => e.contribution_impact_gbp < 0);
    if (lossMaking.length > 0) {
      watch.push(
        `${this.joinClauses(lossMaking.map(e => e.experiment_id))} ${lossMaking.length === 1 ? 'returns' : 'return'} negative contribution — margin compression outweighs the volume gained.`
      );
    }

    // Category-level constraints that bind whatever the commercial case says.
    const constraints = new Map<string, string[]>();
    for (const exp of experiments) {
      const category = resolveCategory(exp.category);
      if (!category) continue;
      const list = constraints.get(category.binding_constraint) || [];
      list.push(exp.experiment_id);
      constraints.set(category.binding_constraint, list);
    }
    for (const [constraint, expIds] of constraints) {
      watch.push(`${this.joinClauses(expIds)}: ${constraint}`);
    }

    // The evidence caveat is appended after truncation, never inside it. It was previously
    // pushed onto the end of the list and then cut by the cap, so the comparisons carrying the
    // most findings — the ones most likely to be acted on — were exactly the ones that lost
    // the statement saying the figures are not forecasts.
    const capped = watch.slice(0, 5);
    if (experiments.every(e => this.isSyntheticEvidence(e))) {
      capped.push(
        'Every compared decision rests on demonstration data, so the contribution and demand figures rank the options against each other but do not forecast outcomes.'
      );
    }

    return capped;
  }

  /** One concrete action. Never "consider your options". */
  private buildNextMove(
    experiments: CampaignDecisionExperiment[],
    strongerId?: string,
    lowestRiskId?: string,
    focal: ExperimentComparisonDimension[] = []
  ): string {
    const byId = new Map(experiments.map(e => [e.experiment_id, e]));

    if (strongerId && lowestRiskId && strongerId !== lowestRiskId) {
      return `Decide whether the extra contribution in ${strongerId} justifies its execution risk; if it does not, proceed with ${lowestRiskId}.`;
    }
    if (strongerId) {
      const winner = byId.get(strongerId)!;
      return winner.readiness_status === 'CONDITIONAL'
        ? `Proceed with the ${strongerId} configuration once its readiness conditions are confirmed.`
        : `Proceed with the ${strongerId} configuration.`;
    }
    if (lowestRiskId) {
      return `No configuration is commercially strongest, so proceed on execution risk: ${lowestRiskId} carries the lowest.`;
    }

    const blocked = experiments.filter(e => !this.readinessCleared(e.readiness_status));
    if (blocked.length === experiments.length) {
      return 'No compared configuration currently clears readiness — resolve the blocking constraints before running a further experiment.';
    }

    const variedDimension = focal.find(d => d.dimension !== 'Decision recommendation');
    return variedDimension
      ? `Run a further experiment varying ${variedDimension.dimension.toLowerCase()} to separate the options on outcome rather than on configuration.`
      : 'Run a further experiment varying one dimension to separate the options on outcome.';
  }


  /**
   * Route to customer as one line: where they transact, and how the campaign reaches them.
   * Activation routes are named because "Store" alone does not say whether the campaign runs
   * on shelf edge, through CRM, or both.
   */
  private describeRouteToCustomer(experiment: CampaignDecisionExperiment): string {
    const channel = channelLabel(experiment.sales_channel);
    const activations = (experiment.activation_channels || []).map(a => activationLabel(a));
    return activations.length > 0 ? `${channel} · via ${activations.join(', ')}` : channel;
  }

  public generateExecutionBrief(
    experimentOrTenant: CampaignDecisionExperiment | string,
    sessionIdParam?: string,
    experimentIdParam?: string
  ): ExecutionBrief | null {
    let experiment: CampaignDecisionExperiment | null;
    if (typeof experimentOrTenant === 'string') {
      experiment = this.getExperimentById(experimentIdParam!, experimentOrTenant, sessionIdParam!);
      if (!experiment) return null;
    } else {
      experiment = experimentOrTenant;
    }

    const demandFormatted = this.formatDemand(experiment.incremental_demand_pct);
    const contribFormatted = this.formatMoney(experiment.contribution_impact_gbp);
    const readinessLabel =
      experiment.readiness_status === 'READY'
        ? 'Ready (Operational gates passed)'
        : experiment.readiness_status === 'CONDITIONAL'
        ? 'Conditional (Requires capacity monitoring)'
        : experiment.readiness_status === 'REVIEW'
        ? 'Review required (Operational assessment unresolved)'
        : experiment.readiness_status === 'DO_NOT_PROCEED'
        ? 'Do Not Proceed (Constraints breached)'
        : 'Not assessed (Readiness was not evaluated for this decision)';

    return {
      brief_id: `BRIEF-${experiment.experiment_id}`,
      experiment_id: experiment.experiment_id,
      tenant_id: experiment.tenant_id,
      session_id: experiment.session_id,
      generated_at: new Date().toISOString(),
      proposal: {
        title: `${experiment.decision_recommendation} — ${categoryLabel(experiment.category)} (${experiment.region})`,
        // Posture labels are noun phrases ("Consider promotion", "Open on approach"), so they
        // read as the subject of the sentence rather than as an adjective inside one. The
        // audience and route come from the preserved snapshot, so the brief states who this
        // decision was for and how it would reach them.
        recommendation: `${experiment.posture_label} for ${experiment.sku_scope.join(', ')} in ${experiment.region}, reaching ${segmentLabel(experiment.audience_segment).toLowerCase()} through ${channelLabel(experiment.sales_channel).toLowerCase()}.`,
        category_and_sku: `${categoryLabel(experiment.category)} · Scope: ${experiment.sku_scope.join(', ')}`,
        region_and_window: `${experiment.region} · ${experiment.planned_window || 'Optimal discovery window'}`
      },
      rationale: {
        summary: `Optimises ${experiment.objective_label.toLowerCase()} by delivering ${demandFormatted} incremental demand and ${contribFormatted} contribution.`,
        key_drivers: [
          `Attributable demand uplift of ${demandFormatted} isolated from baseline counterfactual run-rate.`,
          `Net financial contribution delta of ${contribFormatted} after cost and elasticity dynamics.`,
          `Operational posture: ${experiment.primary_trade_off}.`
        ]
      },
      expected_impact: {
        incremental_demand: demandFormatted,
        contribution_impact: contribFormatted,
        readiness_verdict: readinessLabel,
        trade_off_balance: experiment.primary_trade_off
      },
      operational_scope: {
        region: experiment.region,
        timing: experiment.planned_window || 'Dynamic window discovery',
        audience: segmentLabel(experiment.audience_segment),
        // Read from the preserved snapshot. This was previously the constant 'Omnichannel',
        // which reported a route the planner had not chosen.
        channel: this.describeRouteToCustomer(experiment)
      },
      material_constraints:
        experiment.major_constraints.length > 0
          ? experiment.major_constraints
          : ['Supplier capacity cap to be maintained', 'No unmodelled cannibalisation'],
      decision_triggers: [
        'Supplier capacity fluctuation > 15% invalidates commitment assumptions.',
        'Market competitor price action during promotion window triggers re-evaluation.'
      ],
      evidence_and_trust: {
        posture: experiment.evidence_posture,
        synthetic_disclosure: experiment.intent_snapshot?.synthetic_demo
          ? 'Demonstration evidence basis: uncalibrated simulation data for exploration.'
          : 'Attested enterprise data basis.'
      },
      next_step: {
        action: 'Prepare Commitment Handoff',
        description: 'Package commercial parameters and constraint boundaries for stakeholder alignment.',
        execution_boundary_notice:
          'CogniX has prepared this execution brief as decision guidance. No external campaign systems have been executed or modified.'
      },
      technical_provenance: {
        ...experiment.technical_provenance,
        intent_id: experiment.campaign_intent_id,
        experiment_id: experiment.experiment_id,
        schema_version: experiment.schema_version
      }
    };
  }

  public clearExperiments(tenantId?: string, sessionId?: string): void {
    if (tenantId && sessionId) {
      const sessionKey = this.buildSessionKey(tenantId, sessionId);
      for (const id of this.experimentIdsBySession.get(sessionKey) || []) {
        this.experimentsByScopedKey.delete(this.buildScopedKey(tenantId, sessionId, id));
      }
      this.experimentIdsBySession.delete(sessionKey);
      this.activeExperimentIdBySession.delete(sessionKey);
    } else {
      this.experimentsByScopedKey.clear();
      this.experimentIdsBySession.clear();
      this.activeExperimentIdBySession.clear();
    }
  }

  public clear(tenantId?: string, sessionId?: string): void {
    this.clearExperiments(tenantId, sessionId);
  }
}

export const campaignExperimentStore = new CampaignExperimentStore();
