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
  ComparisonSynthesis,
  ExecutionBrief,
  ReadinessVerdict,
  readinessVerdictLabel,
  formatContributionGbp,
  formatDemandPct,
  validateCampaignDecisionExperiment
} from '../packages/contracts/src/index';

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

  public getNextExperimentId(tenantId: string, sessionId: string): string {
    const key = this.buildSessionKey(tenantId, sessionId);
    const existing = this.experimentIdsBySession.get(key) || [];
    return `EXP-${String(existing.length + 1).padStart(3, '0')}`;
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

    // Resolve which experiment this preservation belongs to. An explicit id wins; otherwise the
    // decision currently in progress owns it; otherwise this is a new decision.
    const targetId =
      payload.experiment_id ||
      this.getActiveExperimentId(tenantId, sessionId) ||
      this.getNextExperimentId(tenantId, sessionId);

    const scopedKey = this.buildScopedKey(tenantId, sessionId, targetId);
    const existing = this.experimentsByScopedKey.get(scopedKey);
    const now = new Date().toISOString();

    // Later stages of one decision carry more analysis than earlier ones. Merge rather than
    // replace so a field already established (a frontier result, say) is never blanked by a
    // subsequent preservation that did not carry it.
    const merged: CampaignDecisionExperiment = {
      ...(existing || {}),
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
        payload.decision_recommendation || existing?.decision_recommendation || 'Balanced promotion',
      incremental_demand_pct: payload.incremental_demand_pct ?? existing?.incremental_demand_pct ?? 0,
      contribution_impact_gbp: payload.contribution_impact_gbp ?? existing?.contribution_impact_gbp ?? 0,
      readiness_status: payload.readiness_status || existing?.readiness_status || 'NOT_ASSESSED',
      readiness_summary:
        payload.readiness_summary || existing?.readiness_summary || 'Operational readiness was not assessed.',
      primary_trade_off: payload.primary_trade_off || existing?.primary_trade_off || 'Margin vs volume balance',
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

    this.experimentsByScopedKey.set(scopedKey, { ...merged });

    if (!existing) {
      const list = this.experimentIdsBySession.get(sessionKey) || [];
      if (!list.includes(targetId)) {
        list.push(targetId);
        this.experimentIdsBySession.set(sessionKey, list);
      }
    }
    // This decision now owns the identity until it is explicitly closed.
    this.activeExperimentIdBySession.set(sessionKey, targetId);

    return { ...merged };
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
    return { ...exp };
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

  public compareExperiments(
    tenantId: string,
    sessionId: string,
    experimentAId: string,
    experimentBId: string
  ): ExperimentComparison | null {
    const a = this.getExperimentById(experimentAId, tenantId, sessionId);
    const b = this.getExperimentById(experimentBId, tenantId, sessionId);
    if (!a || !b) return null;

    const demandDelta = b.incremental_demand_pct - a.incremental_demand_pct;
    const contribDelta = b.contribution_impact_gbp - a.contribution_impact_gbp;

    const dimensions: ExperimentComparisonDimension[] = [
      {
        dimension: 'Objective',
        experiment_a_value: a.objective_label,
        experiment_b_value: b.objective_label,
        is_focal_difference: a.objective_type !== b.objective_type
      },
      {
        dimension: 'Category & SKU',
        experiment_a_value: `${a.category} · ${a.sku_scope.join(', ')}`,
        experiment_b_value: `${b.category} · ${b.sku_scope.join(', ')}`,
        is_focal_difference: a.category !== b.category || a.sku_scope.join() !== b.sku_scope.join()
      },
      {
        dimension: 'Region / Market Scope',
        experiment_a_value: a.region,
        experiment_b_value: b.region,
        is_focal_difference: a.region !== b.region
      },
      {
        dimension: 'Intervention Posture',
        experiment_a_value: a.posture_label,
        experiment_b_value: b.posture_label,
        is_focal_difference: a.intervention_posture !== b.intervention_posture
      },
      {
        dimension: 'Incremental Demand',
        experiment_a_value: this.formatDemand(a.incremental_demand_pct),
        experiment_b_value: this.formatDemand(b.incremental_demand_pct),
        difference_summary: `${demandDelta >= 0 ? '+' : ''}${demandDelta.toFixed(1)}pp delta`,
        is_focal_difference: Math.abs(demandDelta) > DEMAND_MATERIALITY_PP
      },
      {
        dimension: 'Contribution Impact',
        experiment_a_value: this.formatMoney(a.contribution_impact_gbp),
        experiment_b_value: this.formatMoney(b.contribution_impact_gbp),
        difference_summary: this.formatMoney(contribDelta),
        is_focal_difference: Math.abs(contribDelta) > CONTRIBUTION_MATERIALITY_GBP
      },
      {
        dimension: 'Operational Readiness',
        experiment_a_value: this.readinessLabel(a.readiness_status),
        experiment_b_value: this.readinessLabel(b.readiness_status),
        is_focal_difference: a.readiness_status !== b.readiness_status
      },
      {
        dimension: 'Primary Trade-Off',
        experiment_a_value: a.primary_trade_off,
        experiment_b_value: b.primary_trade_off,
        is_focal_difference: a.primary_trade_off !== b.primary_trade_off
      },
      {
        dimension: 'Decision Recommendation',
        experiment_a_value: a.decision_recommendation,
        experiment_b_value: b.decision_recommendation,
        is_focal_difference: a.decision_recommendation !== b.decision_recommendation
      }
    ];

    return {
      experiment_a: a,
      experiment_b: b,
      dimensions,
      synthesis: this.generateComparisonSynthesis(a, b, dimensions),
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

  /**
   * Deterministic synthesis over the compared dimensions.
   *
   * Two rules keep this honest: nothing is asserted that the preserved snapshots do not show,
   * and no winner is manufactured where the evidence does not separate the two configurations.
   * Two experiments that differ in nothing material are reported as exactly that — inventing a
   * "distinct trade-off" narrative for identical records would be the most damaging thing this
   * surface could do, because it reads as analysis.
   */
  private generateComparisonSynthesis(
    a: CampaignDecisionExperiment,
    b: CampaignDecisionExperiment,
    dimensions: ExperimentComparisonDimension[]
  ): ComparisonSynthesis {
    if (a.experiment_id === b.experiment_id) {
      return {
        headline: `${a.experiment_id} compared with itself`,
        what_changed: `${a.experiment_id} has been compared against itself, so no configuration or outcome differs.`,
        why_it_matters:
          'No material decision differences detected. Select two different preserved experiments to evaluate a trade-off.'
      };
    }

    const focal = dimensions.filter(d => d.is_focal_difference);
    const demandDelta = b.incremental_demand_pct - a.incremental_demand_pct;
    const contribDelta = b.contribution_impact_gbp - a.contribution_impact_gbp;
    const demandMaterial = Math.abs(demandDelta) > DEMAND_MATERIALITY_PP;
    const contribMaterial = Math.abs(contribDelta) > CONTRIBUTION_MATERIALITY_GBP;

    if (focal.length === 0) {
      return {
        headline: `${b.experiment_id} vs ${a.experiment_id}: no material differences`,
        what_changed: `No material decision differences detected between ${a.experiment_id} and ${b.experiment_id}. Objective, scope, region, posture, readiness, recommendation and commercial outcome are equivalent across both preserved snapshots.`,
        why_it_matters:
          'There is no trade-off to weigh here: the two preserved decisions are equivalent on every compared dimension. Vary scope, posture or objective to produce a decision-relevant comparison.'
      };
    }

    // What changed — configuration first, then the outcome those changes produced.
    const configChanges: string[] = [];
    if (a.objective_type !== b.objective_type) {
      configChanges.push(`the objective is reframed from ${a.objective_label} to ${b.objective_label}`);
    }
    if (a.category !== b.category || a.sku_scope.join() !== b.sku_scope.join()) {
      configChanges.push(
        `scope moves from ${a.category} (${a.sku_scope.join(', ')}) to ${b.category} (${b.sku_scope.join(', ')})`
      );
    }
    if (a.region !== b.region) {
      configChanges.push(`the market scope changes from ${a.region} to ${b.region}`);
    }
    if (a.intervention_posture !== b.intervention_posture) {
      configChanges.push(`the posture switches from ${a.posture_label} to ${b.posture_label}`);
    }

    const outcomeChanges: string[] = [];
    if (demandMaterial) {
      outcomeChanges.push(
        `expected demand moves ${demandDelta >= 0 ? 'up' : 'down'} by ${Math.abs(demandDelta).toFixed(1)}pp (${this.formatDemand(a.incremental_demand_pct)} → ${this.formatDemand(b.incremental_demand_pct)})`
      );
    }
    if (contribMaterial) {
      outcomeChanges.push(
        `contribution ${contribDelta >= 0 ? 'improves' : 'falls'} by £${Math.abs(Math.round(contribDelta)).toLocaleString()} (${this.formatMoney(a.contribution_impact_gbp)} → ${this.formatMoney(b.contribution_impact_gbp)})`
      );
    }
    if (a.readiness_status !== b.readiness_status) {
      outcomeChanges.push(
        `operational readiness changes from ${this.readinessLabel(a.readiness_status)} to ${this.readinessLabel(b.readiness_status)}`
      );
    }
    if (a.decision_recommendation !== b.decision_recommendation) {
      outcomeChanges.push(
        `the recommendation changes from "${a.decision_recommendation}" to "${b.decision_recommendation}"`
      );
    }

    const configClause =
      configChanges.length > 0
        ? `Moving from ${a.experiment_id} to ${b.experiment_id}, ${this.joinClauses(configChanges)}.`
        : `${a.experiment_id} and ${b.experiment_id} share the same objective, scope, region and posture.`;
    const outcomeClause =
      outcomeChanges.length > 0
        ? ` As a result, ${outcomeChanges.join('; ')}.`
        : ' Commercial outcome and readiness are unchanged between the two.';

    // Why it matters — only name a stronger configuration where the evidence separates them.
    const economicsAvailable =
      a.contribution_impact_gbp !== 0 || b.contribution_impact_gbp !== 0 || demandMaterial;
    let whyItMatters: string;
    let strongerId: string | undefined;
    let rationale: string | undefined;

    if (!economicsAvailable) {
      whyItMatters = `Commercial separation is unavailable: neither ${a.experiment_id} nor ${b.experiment_id} carries a modelled contribution or demand effect, so this comparison cannot rank them on outcome. The difference is one of configuration only.`;
    } else if (contribMaterial) {
      const winner = contribDelta > 0 ? b : a;
      const loser = contribDelta > 0 ? a : b;
      // Only a configuration whose readiness the engine actually cleared may be recommended.
      const winnerCleared = winner.readiness_status === 'READY' || winner.readiness_status === 'CONDITIONAL';
      if (!winnerCleared) {
        whyItMatters = `${winner.experiment_id} carries the higher contribution (${this.formatMoney(winner.contribution_impact_gbp)} vs ${this.formatMoney(loser.contribution_impact_gbp)}) but its operational readiness is ${this.readinessLabel(winner.readiness_status)}, so the financial advantage is not currently actionable.`;
      } else {
        const gaveUpVolume =
          (contribDelta > 0 && demandDelta < -DEMAND_MATERIALITY_PP) ||
          (contribDelta < 0 && demandDelta > DEMAND_MATERIALITY_PP);
        strongerId = winner.experiment_id;
        whyItMatters = gaveUpVolume
          ? `${winner.experiment_id} gives up ${Math.abs(demandDelta).toFixed(1)}pp of headline demand but returns £${Math.abs(Math.round(contribDelta)).toLocaleString()} more contribution, so the narrower configuration is the better commercial trade-off despite the smaller top line.`
          : `${winner.experiment_id} delivers £${Math.abs(Math.round(contribDelta)).toLocaleString()} more contribution${demandMaterial ? ` on ${Math.abs(demandDelta).toFixed(1)}pp more demand` : ' at comparable demand'}, and clears readiness at ${this.readinessLabel(winner.readiness_status)}.`;
        rationale = gaveUpVolume
          ? 'Higher net contribution from a tighter scope.'
          : 'Higher contribution without a readiness penalty.';
      }
    } else if (demandMaterial) {
      whyItMatters = `Demand differs by ${Math.abs(demandDelta).toFixed(1)}pp but contribution is materially equivalent, so the two configurations are commercially comparable — choose on operational fit rather than on financial return.`;
    } else {
      whyItMatters = `${a.experiment_id} and ${b.experiment_id} differ in configuration (${focal.map(f => f.dimension.toLowerCase()).join(', ')}) without a material difference in demand or contribution, so neither is commercially preferable on the preserved evidence.`;
    }

    return {
      headline: `${b.experiment_id} vs ${a.experiment_id}: ${focal[0].dimension} differs`,
      what_changed: `${configClause}${outcomeClause}`,
      why_it_matters: whyItMatters,
      stronger_experiment_id: strongerId,
      recommendation_rationale: rationale
    };
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
        title: `${experiment.decision_recommendation} — ${experiment.category} (${experiment.region})`,
        recommendation: `Deploy ${experiment.posture_label.toLowerCase()} configuration for ${experiment.sku_scope.join(', ')} in ${experiment.region}.`,
        category_and_sku: `${experiment.category} · Scope: ${experiment.sku_scope.join(', ')}`,
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
        audience: experiment.audience_segment || 'All targeted shoppers',
        channel: 'Omnichannel'
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
