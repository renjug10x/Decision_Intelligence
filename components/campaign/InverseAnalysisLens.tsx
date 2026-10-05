'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  HelpCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Play,
  RotateCcw,
  Sliders,
  TrendingUp
} from 'lucide-react';
import {
  CampaignArchetype,
  InverseCondition,
  SignalHypothesis,
  estimateInterventionEconomics
} from '@/lib/campaign-archetypes';
import {
  elasticitySensitivityProposal,
  highestYieldOpportunityRegion,
  describeInverseConditionDecision,
  buildCompetitiveResponseCandidateIntervention,
  ActiveIntervention
} from '@/lib/campaign-candidate-intervention';
import type { CanonicalScenario } from '@/packages/contracts/src/canonical-scenario-model';
import { inScopeStoreCount, scenarioInScope } from '@/packages/contracts/src/scenario-scope';
import {
  COMPETITIVE_PREFERRED_RESPONSE_BADGE,
  COMPETITIVE_USER_FACING_PROVENANCE_BADGE,
  COMPETITIVE_USER_FACING_PROVENANCE_LABEL,
  COMPETITIVE_USER_FACING_PROVENANCE_NOTE,
  type CompetitivePriceAssumption,
  type CompetitiveResponseOption,
  type CompetitiveResponseOptionType,
  type CompetitiveWhatIfIntelligenceResult,
  createCompetitivePriceAssumption,
  evaluateCompetitiveWhatIfIntelligence,
  scenarioPromotedPriceAtDepthGbp
} from '@/lib/competitive-price-response';
import { useCurrency } from '@/context/CurrencyContext';

interface InverseAnalysisLensProps {
  scenario?: CanonicalScenario;
  archetype: CampaignArchetype;
  currentDiscount?: number;
  currentRegion?: string;
  currentDurationDays?: number;
  onProposeIntervention: (action: ActiveIntervention) => void;
  onOpenDemandLens?: () => void;
  initialCompetitiveWhatIf?: CompetitiveWhatIfIntelligenceResult | null;
  initialSelectedOptionType?: CompetitiveResponseOptionType | null;
  onCompetitiveWhatIfChange?: (
    whatIf: CompetitiveWhatIfIntelligenceResult | null,
    selectedOptionType: CompetitiveResponseOptionType | null
  ) => void;
}

export default function InverseAnalysisLens({
  scenario,
  archetype,
  currentDiscount,
  currentRegion,
  currentDurationDays,
  onProposeIntervention,
  onOpenDemandLens,
  initialCompetitiveWhatIf,
  initialSelectedOptionType,
  onCompetitiveWhatIfChange
}: InverseAnalysisLensProps) {
  const { money, localise } = useCurrency();
  const [testedHypothesis, setTestedHypothesis] = useState<Record<string, boolean>>({});
  const [selectedConditionId, setSelectedConditionId] = useState<string | null>(null);

  const resolvedScenario = useMemo(() => scenario ?? scenarioInScope(), [scenario]);
  const activeDepthPct = currentDiscount ?? archetype.default_discount_pct;
  const activeRegion = currentRegion ?? archetype.default_region;
  const activeDurationDays = currentDurationDays ?? archetype.default_duration_days;

  const matchingInitialWhatIf =
    initialCompetitiveWhatIf &&
    initialCompetitiveWhatIf.scenario_id === resolvedScenario.identity.scenario_id
      ? initialCompetitiveWhatIf
      : null;

  // Competitive Price Response What-If progressive-disclosure state
  const [isCompetitiveOpen, setIsCompetitiveOpen] = useState<boolean>(false);
  const [benchmarkPriceInput, setBenchmarkPriceInput] = useState<string>('');
  const [sensitivityGammaInput, setSensitivityGammaInput] = useState<string>('');
  const [evaluatedAssumption, setEvaluatedAssumption] =
    useState<CompetitivePriceAssumption | null>(null);
  const [competitiveValidationError, setCompetitiveValidationError] = useState<string | null>(null);
  const [selectedCompetitiveOptionType, setSelectedCompetitiveOptionType] =
    useState<CompetitiveResponseOptionType | null>(null);
  const previousScenarioIdRef = React.useRef<string>(resolvedScenario.identity.scenario_id);

  // Hydrate previously evaluated competitive assumption when switching back to this lens
  useEffect(() => {
    if (matchingInitialWhatIf && !evaluatedAssumption) {
      setIsCompetitiveOpen(true);
      setBenchmarkPriceInput(String(matchingInitialWhatIf.assumption.assumed_competitive_price_gbp));
      setSensitivityGammaInput(
        String(matchingInitialWhatIf.assumption.competitive_response_pp_per_disadvantage_point)
      );
      setEvaluatedAssumption(matchingInitialWhatIf.assumption);
      setSelectedCompetitiveOptionType(initialSelectedOptionType ?? null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset ephemeral competitive assumptions on scenario identity switch
  useEffect(() => {
    if (previousScenarioIdRef.current !== resolvedScenario.identity.scenario_id) {
      previousScenarioIdRef.current = resolvedScenario.identity.scenario_id;
      setIsCompetitiveOpen(false);
      setBenchmarkPriceInput('');
      setSensitivityGammaInput('');
      setEvaluatedAssumption(null);
      setCompetitiveValidationError(null);
      setSelectedCompetitiveOptionType(null);
    }
  }, [resolvedScenario.identity.scenario_id]);

  const activePromotedPriceGbp = useMemo(
    () => scenarioPromotedPriceAtDepthGbp(resolvedScenario, activeDepthPct),
    [resolvedScenario, activeDepthPct]
  );

  const governedTargetScope = useMemo(() => {
    const nonNationalCells = [...archetype.opportunity_matrix]
      .filter(c => c.region !== 'National')
      .sort((a, b) => b.opportunity_index - a.opportunity_index);
    if (nonNationalCells.length > 0) {
      return nonNationalCells[0].region;
    }
    return resolvedScenario.identity.focus_region;
  }, [archetype.opportunity_matrix, resolvedScenario.identity.focus_region]);

  const governedSecondaryScope = useMemo(() => {
    const nonNationalCells = [...archetype.opportunity_matrix]
      .filter(c => c.region !== 'National' && c.region !== activeRegion)
      .sort((a, b) => b.opportunity_index - a.opportunity_index);
    return nonNationalCells[0]?.region;
  }, [archetype.opportunity_matrix, activeRegion]);

  const competitiveIntelligence = useMemo(() => {
    if (!evaluatedAssumption) return null;
    try {
      return evaluateCompetitiveWhatIfIntelligence({
        scenario: resolvedScenario,
        assumption: evaluatedAssumption,
        active_depth_pct: activeDepthPct,
        scope: activeRegion,
        horizon_days: activeDurationDays,
        target_scope: governedTargetScope,
        secondary_scope: governedSecondaryScope
      });
    } catch {
      return null;
    }
  }, [
    resolvedScenario,
    evaluatedAssumption,
    activeDepthPct,
    activeRegion,
    activeDurationDays,
    governedTargetScope,
    governedSecondaryScope
  ]);

  useEffect(() => {
    if (onCompetitiveWhatIfChange) {
      onCompetitiveWhatIfChange(competitiveIntelligence, selectedCompetitiveOptionType);
    }
  }, [competitiveIntelligence, selectedCompetitiveOptionType, onCompetitiveWhatIfChange]);

  const handleEvaluateCompetitiveWhatIf = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCompetitiveValidationError(null);

    const trimmedPrice = benchmarkPriceInput.trim();
    const trimmedGamma = sensitivityGammaInput.trim();

    if (!trimmedPrice) {
      setCompetitiveValidationError(
        'Enter a positive competitive benchmark price (e.g. 1.85) to evaluate relative price position.'
      );
      return;
    }
    if (!trimmedGamma) {
      setCompetitiveValidationError(
        'Enter a competitive demand sensitivity assumption (>= 0, e.g. 1.0) to evaluate the decision boundary.'
      );
      return;
    }

    const parsedPrice = Number(trimmedPrice);
    const parsedGamma = Number(trimmedGamma);

    try {
      const assumption = createCompetitivePriceAssumption({
        assumed_competitive_price_gbp: parsedPrice,
        competitive_response_pp_per_disadvantage_point: parsedGamma
      });
      setEvaluatedAssumption(assumption);
      setSelectedCompetitiveOptionType(null);
    } catch (err: any) {
      setEvaluatedAssumption(null);
      setSelectedCompetitiveOptionType(null);
      setCompetitiveValidationError(
        err?.message || 'Enter a valid positive competitive benchmark price and non-negative sensitivity.'
      );
    }
  };

  const handleClearCompetitiveWhatIf = () => {
    setBenchmarkPriceInput('');
    setSensitivityGammaInput('');
    setEvaluatedAssumption(null);
    setCompetitiveValidationError(null);
    setSelectedCompetitiveOptionType(null);
  };

  const handleModelCondition = (cond: InverseCondition) => {
    setSelectedConditionId(cond.id);
    const defaultScope = inScopeStoreCount(currentRegion ?? archetype.default_region);
    let disc = currentDiscount ?? archetype.default_discount_pct;
    let scope = defaultScope;
    const dur = currentDurationDays ?? archetype.default_duration_days;
    const notes: string[] = [];
    let fundingOverlay: number | undefined;
    let flipPct: number | undefined;
    let recommendedPct: number | undefined;
    let region = currentRegion ?? archetype.default_region;

    const decisionSummary = describeInverseConditionDecision({
      archetype,
      condition: cond,
      currentDiscountPct: currentDiscount,
      currentRegion,
      currentDurationDays
    });

    if (cond.target_parameter === 'DISCOUNT_DEPTH') {
      disc = cond.target_value;
      notes.push(
        `Tested condition: ${decisionSummary.tested_condition} vs current ${decisionSummary.current_assumption}.`,
        `Applies ${cond.target_value}% discount depth to the planner on Accept.`
      );
    } else if (cond.target_parameter === 'STORE_SCOPE') {
      scope = cond.target_value;
      region = highestYieldOpportunityRegion(archetype);
      notes.push(
        `Tested condition: ${decisionSummary.tested_condition} vs current ${decisionSummary.current_assumption}.`,
        `Scopes the campaign to ${scope} stores in ${region} (highest seeded regional opportunity index).`
      );
    } else if (cond.target_parameter === 'DEMAND_UPLIFT') {
      const sensitivity = elasticitySensitivityProposal(
        archetype,
        currentDiscount ?? archetype.default_discount_pct
      );
      disc = sensitivity.discount_pct;
      flipPct = sensitivity.flip_discount_pct;
      recommendedPct = sensitivity.recommended_discount_pct;
      notes.push(...sensitivity.notes);
    } else if (cond.target_parameter === 'SUPPLIER_FUNDING') {
      fundingOverlay = cond.target_value;
      notes.push(
        cond.target_value === 0
          ? 'Evaluation overlay: trade funding is not required for this configuration.'
          : `Evaluation overlay (${cond.target_display}): bridges the contribution gap between ${disc}% depth and the ${decisionSummary.decision_boundary}. Accept keeps ${disc}% depth in planner controls because supplier funding is an evaluation condition, not a planner slider.`
      );
    }

    const economics = estimateInterventionEconomics(archetype, {
      discount_pct: disc,
      stores: scope,
      duration_days: dur
    });
    const fundedContribution =
      cond.target_parameter === 'SUPPLIER_FUNDING'
        ? economics.net_contribution_delta_gbp + cond.target_value
        : economics.net_contribution_delta_gbp;

    onProposeIntervention({
      title: `Model Condition: ${cond.condition_text}`,
      type: 'INVERSE_CONDITION_MODEL',
      description: `${decisionSummary.decision_question} — ${decisionSummary.recommendation_implication}`,
      proposed_discount: disc,
      proposed_scope: scope,
      proposed_duration: dur,
      proposed_region: region,
      expected_demand: economics.expected_demand_uplift_pct,
      expected_contribution: fundedContribution,
      provenance: {
        source_lens: 'INVERSE',
        source_id: cond.id,
        source_label: cond.condition_text,
        funding_overlay_gbp: fundingOverlay,
        elasticity_flip_discount_pct: flipPct,
        recommended_discount_pct: recommendedPct,
        notes
      }
    });
  };

  const handleSelectCompetitiveOption = (opt: CompetitiveResponseOption) => {
    if (!competitiveIntelligence || !opt.available) return;
    const candidate = buildCompetitiveResponseCandidateIntervention({
      whatIfResult: competitiveIntelligence,
      selectedOption: opt
    });
    setSelectedCompetitiveOptionType(opt.option_type);
    setSelectedConditionId(null);
    onProposeIntervention(candidate);
  };

  const handleTestHypothesis = (hypo: SignalHypothesis) => {
    setTestedHypothesis(prev => ({ ...prev, [hypo.signal_id]: true }));
    const p = hypo.test_result.proposed_intervention;
    const economics = estimateInterventionEconomics(archetype, {
      discount_pct: p.discount,
      stores: p.scope,
      duration_days: p.duration
    });
    onProposeIntervention({
      title: `Test Hypothesis: ${hypo.hypothesis_statement}`,
      type: 'TEST_HYPOTHESIS',
      description: hypo.test_result.explanation,
      proposed_discount: p.discount,
      proposed_scope: p.scope,
      proposed_duration: p.duration,
      proposed_region: p.region,
      expected_demand: economics.expected_demand_uplift_pct,
      expected_contribution: economics.net_contribution_delta_gbp,
      provenance: {
        source_lens: 'SIGNAL_HYPOTHESIS',
        source_id: hypo.signal_id,
        source_label: hypo.signal_headline,
        notes: [
          `Seeded world-model hypothesis verdict: ${hypo.test_result.verdict.replace(/_/g, ' ')} — evaluated against scenario elasticity when accepted.`
        ]
      }
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Section 1: "What would have to be true?" ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <HelpCircle size={18} color="#2563EB" />
            What Would Have To Be True?
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Decision-condition analysis across discount depth, regional store scope, supplier funding overlay, elasticity sensitivity, and counterfactual competitive price response.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* ── Competitive Price Response What-If Question (Progressive Disclosure) ── */}
          <div
            data-testid="competitive-what-if-card"
            style={{
              background: isCompetitiveOpen ? '#F8FAFC' : '#FFFFFF',
              border: isCompetitiveOpen ? '1.5px solid #2563EB' : '1px solid #CBD5E1',
              borderRadius: 8,
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ flex: 1, minWidth: 250 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: '#1E40AF',
                      background: '#DBEAFE',
                      border: '1px solid #BFDBFE',
                      padding: '2px 7px',
                      borderRadius: 4,
                      letterSpacing: '0.02em'
                    }}
                  >
                    COMPETITIVE PRICE RESPONSE · WHAT-IF EXPLORATION
                  </span>
                  <span
                    data-testid="competitive-header-provenance-badge"
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#475569',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      padding: '2px 7px',
                      borderRadius: 4
                    }}
                  >
                    {COMPETITIVE_USER_FACING_PROVENANCE_BADGE}
                  </span>
                  <span
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      color: '#065F46',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      padding: '2px 7px',
                      borderRadius: 4
                    }}
                  >
                    COUNTERFACTUAL ONLY · DOES NOT STAGE CANDIDATE
                  </span>
                </div>

                <div
                  data-testid="competitive-what-if-question"
                  style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}
                >
                  Would our current promotion decision still hold if competitive pricing changes?
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                  Test how a generic competitive benchmark shelf price and modelled demand sensitivity affect relative price position, net contribution, and the decision boundary where the preferred promotional depth changes.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {evaluatedAssumption && (
                  <button
                    type="button"
                    data-testid="btn-clear-competitive-what-if-top"
                    onClick={handleClearCompetitiveWhatIf}
                    style={{
                      background: '#FFFFFF',
                      color: '#475569',
                      border: '1px solid #CBD5E1',
                      padding: '7px 12px',
                      borderRadius: 6,
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5
                    }}
                  >
                    <RotateCcw size={13} />
                    <span>Clear Assumptions</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="btn-open-competitive-what-if"
                  aria-expanded={isCompetitiveOpen}
                  onClick={() => setIsCompetitiveOpen(prev => !prev)}
                  style={{
                    background: isCompetitiveOpen ? '#1E40AF' : '#2563EB',
                    color: '#FFFFFF',
                    border: '1px solid #1E40AF',
                    padding: '7px 14px',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Sliders size={13} />
                  <span>
                    {isCompetitiveOpen
                      ? 'Hide Competitive Price Response'
                      : 'Explore Competitive Price Response'}
                  </span>
                </button>
              </div>
            </div>

            {/* Step 1 → Assumptions Input Panel */}
            {isCompetitiveOpen && (
              <div
                data-testid="competitive-what-if-panel"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  paddingTop: 12,
                  borderTop: '1px solid #E2E8F0'
                }}
              >
                {/* Read-Only Active Scenario Context (reused without re-entry) */}
                <div
                  data-testid="competitive-active-scenario-context"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: 10,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '10px 12px',
                    fontSize: '0.75rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Active Product / SKU
                    </div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                      {resolvedScenario.identity.sku_name} ({resolvedScenario.identity.sku_id})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Our List Price
                    </div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
                      {money(resolvedScenario.economics.list_price_gbp, { decimals: 2, compact: false })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Active Promotion Depth
                    </div>
                    <div style={{ fontWeight: 700, color: '#2563EB', marginTop: 2 }}>
                      {activeDepthPct}% ({activeRegion})
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Our Current Promotional Price
                    </div>
                    <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
                      {money(activePromotedPriceGbp, { decimals: 2, compact: false })}
                    </div>
                  </div>
                </div>

                {/* Minimum Missing Assumptions Form */}
                <form
                  data-testid="competitive-assumptions-form"
                  noValidate
                  onSubmit={handleEvaluateCompetitiveWhatIf}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 8,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 14
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 8
                    }}
                  >
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                      Counterfactual Competitive Assumptions
                    </div>
                    <span
                      data-testid="competitive-form-provenance-label"
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: '#475569',
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        padding: '2px 8px',
                        borderRadius: 4
                      }}
                    >
                      {COMPETITIVE_USER_FACING_PROVENANCE_BADGE} · {COMPETITIVE_USER_FACING_PROVENANCE_LABEL}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                      gap: 16
                    }}
                  >
                    {/* Input A: Generic Competitive Benchmark Price */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                        <label
                          htmlFor="input-competitive-benchmark-price"
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}
                        >
                          Competitive benchmark price (£)
                        </label>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            color: '#475569',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            padding: '1px 6px',
                            borderRadius: 4
                          }}
                        >
                          {COMPETITIVE_USER_FACING_PROVENANCE_BADGE}
                        </span>
                      </div>
                      <input
                        id="input-competitive-benchmark-price"
                        data-testid="input-competitive-benchmark-price"
                        type="number"
                        step="0.01"
                        min="0.01"
                        value={benchmarkPriceInput}
                        onChange={e => setBenchmarkPriceInput(e.target.value)}
                        placeholder={`e.g. ${Math.max(0.5, Number((activePromotedPriceGbp * 0.92).toFixed(2))).toFixed(2)}`}
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          color: '#0F172A',
                          background: '#FFFFFF',
                          fontFamily: 'monospace'
                        }}
                      />
                      <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.35 }}>
                        Generic competitive shelf price for counterfactual exploration ({COMPETITIVE_USER_FACING_PROVENANCE_LABEL}).
                      </div>
                    </div>

                    {/* Input B: Demand Sensitivity to Competitive Price Difference */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                        <label
                          htmlFor="input-competitive-sensitivity-gamma"
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}
                        >
                          Demand sensitivity to competitive price difference
                        </label>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            fontWeight: 700,
                            color: '#475569',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            padding: '1px 6px',
                            borderRadius: 4
                          }}
                        >
                          {COMPETITIVE_USER_FACING_PROVENANCE_BADGE}
                        </span>
                      </div>
                      <input
                        id="input-competitive-sensitivity-gamma"
                        data-testid="input-competitive-sensitivity-gamma"
                        type="number"
                        step="0.01"
                        min="0"
                        value={sensitivityGammaInput}
                        onChange={e => setSensitivityGammaInput(e.target.value)}
                        placeholder="e.g. 1.0"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          padding: '8px 10px',
                          borderRadius: 6,
                          border: '1px solid #CBD5E1',
                          fontSize: '0.85rem',
                          color: '#0F172A',
                          background: '#FFFFFF',
                          fontFamily: 'monospace'
                        }}
                      />
                      <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.35 }}>
                        Modelled demand impact for each percentage-point that our price is above or below the competitive benchmark.
                      </div>
                      <div
                        data-testid="competitive-technical-gamma-detail"
                        style={{
                          fontSize: '0.68rem',
                          color: '#64748B',
                          lineHeight: 1.3,
                          overflowWrap: 'anywhere',
                          wordBreak: 'break-word'
                        }}
                      >
                        Technical coefficient γ (
                        <code style={{ overflowWrap: 'anywhere', wordBreak: 'break-all' }}>
                          competitive_response_pp_per_disadvantage_point
                        </code>
                        ): percentage-point base-demand response per 1pp of list-price disadvantage ({COMPETITIVE_USER_FACING_PROVENANCE_LABEL}).
                      </div>
                    </div>
                  </div>

                  {competitiveValidationError && (
                    <div
                      data-testid="competitive-validation-error"
                      style={{
                        background: '#FEF2F2',
                        border: '1px solid #FECACA',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: '0.78rem',
                        color: '#DC2626',
                        fontWeight: 600
                      }}
                    >
                      {competitiveValidationError}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
                      {COMPETITIVE_USER_FACING_PROVENANCE_NOTE}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        data-testid="btn-clear-competitive-what-if"
                        onClick={handleClearCompetitiveWhatIf}
                        style={{
                          background: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          padding: '7px 12px',
                          borderRadius: 6,
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Clear Assumptions
                      </button>
                      <button
                        type="submit"
                        data-testid="btn-evaluate-competitive-what-if"
                        style={{
                          background: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          padding: '7px 16px',
                          borderRadius: 6,
                          fontSize: '0.8rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Evaluate Competitive Position
                      </button>
                    </div>
                  </div>
                </form>

                {/* Step 2 → Evaluated Intelligence Summary & Decision Boundary Visual */}
                {competitiveIntelligence && (
                  <div
                    data-testid="competitive-what-if-results"
                    style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
                  >
                    {/* Provenance Strip */}
                    <div
                      data-testid="competitive-what-if-provenance"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 8,
                        background: '#F1F5F9',
                        border: '1px solid #CBD5E1',
                        borderRadius: 6,
                        padding: '8px 12px',
                        fontSize: '0.74rem',
                        color: '#334155'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: '#1E293B',
                            background: '#FFFFFF',
                            border: '1px solid #94A3B8',
                            padding: '2px 6px',
                            borderRadius: 4
                          }}
                        >
                          {competitiveIntelligence.user_facing_provenance.badge}
                        </span>
                        <strong>{competitiveIntelligence.user_facing_provenance.label}</strong>
                      </div>
                      <span style={{ color: '#475569' }}>
                        {competitiveIntelligence.user_facing_provenance.note}
                      </span>
                    </div>

                    {/* 4-Card Plain-Language Intelligence Summary */}
                    <div
                      data-testid="competitive-what-if-intelligence-summary"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 10
                      }}
                    >
                      <div
                        data-testid="competitive-summary-current-decision"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Current Decision
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                          {localise(competitiveIntelligence.intelligence_summary.current_decision_headline)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
                          {localise(competitiveIntelligence.intelligence_summary.current_decision_detail)}
                        </div>
                      </div>

                      <div
                        data-testid="competitive-summary-position"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Competitive Position
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                          {localise(competitiveIntelligence.intelligence_summary.competitive_position_headline)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
                          {localise(competitiveIntelligence.intelligence_summary.competitive_position_detail)}
                        </div>
                      </div>

                      <div
                        data-testid="competitive-summary-boundary"
                        style={{
                          background: '#FFFFFF',
                          border:
                            competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                              ? '1.5px solid #D97706'
                              : '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Decision Boundary
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                          {localise(competitiveIntelligence.intelligence_summary.decision_boundary_headline)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
                          {localise(competitiveIntelligence.intelligence_summary.decision_boundary_detail)}
                        </div>
                      </div>

                      <div
                        data-testid="competitive-summary-beyond-boundary"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px'
                        }}
                      >
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#065F46', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          Beyond The Boundary
                        </div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#0F172A', marginTop: 4 }}>
                          {localise(competitiveIntelligence.intelligence_summary.beyond_boundary_headline)}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: 4, lineHeight: 1.35 }}>
                          {localise(competitiveIntelligence.intelligence_summary.beyond_boundary_detail)}
                        </div>
                      </div>
                    </div>

                    {/* Current Position & Current Decision Impact Detail Grid */}
                    <div
                      data-testid="competitive-what-if-impact-grid"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: 12
                      }}
                    >
                      {/* Current Position Summary Table */}
                      <div
                        data-testid="competitive-current-position"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F172A' }}>
                          Current Competitive Position Summary
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px solid #F1F5F9', paddingBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>Our list price</span>
                          <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                            {money(competitiveIntelligence.current_position.position.list_price_gbp, { decimals: 2, compact: false })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px solid #F1F5F9', paddingBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>
                            Our promotional price ({competitiveIntelligence.current_position.position.promotion_depth_pct}% depth)
                          </span>
                          <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                            {money(competitiveIntelligence.current_position.position.our_promotional_price_gbp, { decimals: 2, compact: false })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', borderBottom: '1px solid #F1F5F9', paddingBottom: 4 }}>
                          <span style={{ color: '#64748B' }}>
                            Competitive assumption ({COMPETITIVE_USER_FACING_PROVENANCE_LABEL})
                          </span>
                          <strong style={{ color: '#2563EB', fontFamily: 'monospace' }}>
                            {money(competitiveIntelligence.current_position.position.assumed_competitive_price_gbp, { decimals: 2, compact: false })}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem' }}>
                          <span style={{ color: '#64748B' }}>Relative position</span>
                          <strong
                            style={{
                              color:
                                competitiveIntelligence.current_position.position.standing === 'DISADVANTAGE'
                                  ? '#DC2626'
                                  : competitiveIntelligence.current_position.position.standing === 'ADVANTAGE'
                                    ? '#059669'
                                    : '#0F172A'
                            }}
                          >
                            {localise(competitiveIntelligence.current_position.relative_position_label)} (
                            {competitiveIntelligence.current_position.position.disadvantage_pp >= 0 ? '+' : ''}
                            {competitiveIntelligence.current_position.position.disadvantage_pp.toFixed(2)}pp of list)
                          </strong>
                        </div>
                      </div>

                      {/* Current Decision Impact (Own Promotion Effect vs Competitive Assumption Effect) */}
                      <div
                        data-testid="competitive-current-decision-impact"
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8
                        }}
                      >
                        <div style={{ fontSize: '0.76rem', fontWeight: 700, color: '#0F172A' }}>
                          Current Decision Impact (Maximum Net Contribution)
                        </div>

                        <div
                          data-testid="competitive-own-promotion-effect"
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: '0.74rem'
                          }}
                        >
                          <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>
                            OWN PROMOTION EFFECT
                          </div>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                            +{competitiveIntelligence.current_decision_impact.active_point.own_price_response_pp.toFixed(2)}pp own-price demand response at {competitiveIntelligence.current_decision_impact.active_depth_pct}% depth
                          </div>
                        </div>

                        <div
                          data-testid="competitive-assumption-effect"
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '6px 10px',
                            fontSize: '0.74rem'
                          }}
                        >
                          <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#B45309', textTransform: 'uppercase' }}>
                            COMPETITIVE ASSUMPTION EFFECT ({COMPETITIVE_USER_FACING_PROVENANCE_BADGE})
                          </div>
                          <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                            {competitiveIntelligence.current_decision_impact.active_point.competitive_response_pp >= 0 ? '+' : ''}
                            {competitiveIntelligence.current_decision_impact.active_point.competitive_response_pp.toFixed(2)}pp total competitive response at {competitiveIntelligence.current_decision_impact.active_depth_pct}% depth
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                            Ambient at 0% list price (not credited to campaign):{' '}
                            <strong>
                              {competitiveIntelligence.current_decision_impact.decomposition.ambient_competitive_effect_pp >= 0 ? '+' : ''}
                              {competitiveIntelligence.current_decision_impact.decomposition.ambient_competitive_effect_pp.toFixed(2)}pp
                            </strong>{' '}
                            · Intervention-attributable (0% → {competitiveIntelligence.current_decision_impact.active_depth_pct}%):{' '}
                            <strong>
                              {competitiveIntelligence.current_decision_impact.decomposition.intervention_attributable_competitive_effect_pp >= 0 ? '+' : ''}
                              {competitiveIntelligence.current_decision_impact.decomposition.intervention_attributable_competitive_effect_pp.toFixed(2)}pp
                            </strong>
                          </div>
                        </div>

                        <div
                          data-testid="competitive-combined-impact"
                          style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.74rem', paddingTop: 2 }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>Combined demand (with ambient)</span>
                            <strong style={{ color: '#0F172A', fontFamily: 'monospace' }}>
                              {competitiveIntelligence.current_decision_impact.active_point.total_demand_uplift_with_ambient_pct >= 0 ? '+' : ''}
                              {competitiveIntelligence.current_decision_impact.active_point.total_demand_uplift_with_ambient_pct.toFixed(2)}pp ({competitiveIntelligence.current_decision_impact.active_point.expected_demand_units.toLocaleString('en-GB')} units)
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>
                              Active {competitiveIntelligence.current_decision_impact.active_depth_pct}% net contribution
                            </span>
                            <strong
                              style={{
                                color:
                                  competitiveIntelligence.current_decision_impact.active_point.net_contribution_delta_gbp >= 0
                                    ? '#059669'
                                    : '#DC2626',
                                fontFamily: 'monospace'
                              }}
                            >
                              {money(competitiveIntelligence.current_decision_impact.active_point.net_contribution_delta_gbp, { signed: true })}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748B' }}>
                              Contribution-maximising configuration
                            </span>
                            <strong style={{ color: '#2563EB', fontFamily: 'monospace' }}>
                              {competitiveIntelligence.current_decision_impact.competitive_recommended_depth_pct}% depth (
                              {money(competitiveIntelligence.current_decision_impact.competitive_recommended_contribution_gbp, { signed: true })})
                            </strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* MATCH Parity Reference */}
                    <div
                      data-testid="competitive-match-reference"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 220 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span
                            style={{
                              fontSize: '0.64rem',
                              fontWeight: 700,
                              color: '#475569',
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              padding: '1px 6px',
                              borderRadius: 4
                            }}
                          >
                            PRICE PARITY (MATCH) REFERENCE · NOT AUTOMATICALLY RECOMMENDED
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#0F172A' }}>
                          {localise(competitiveIntelligence.match_reference.headline)}
                        </div>
                        <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 2 }}>
                          {localise(competitiveIntelligence.match_reference.detail)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '0.74rem', fontFamily: 'monospace', color: '#334155' }}>
                        <div>
                          Parity ref depth: <strong>{competitiveIntelligence.match_reference.derivation.clamped_depth_pct}%</strong>
                        </div>
                        <div>
                          Net contribution at ref:{' '}
                          <strong
                            style={{
                              color:
                                competitiveIntelligence.match_reference.clamped_evaluation.net_contribution_delta_gbp >= 0
                                  ? '#059669'
                                  : '#DC2626'
                            }}
                          >
                            {money(competitiveIntelligence.match_reference.clamped_evaluation.net_contribution_delta_gbp, { signed: true })}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Decision-Boundary Visual (Competitive Price Disadvantage → Preferred Promotional Depth / Contribution) */}
                    <div
                      data-testid="competitive-decision-boundary-visual"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={15} color="#2563EB" />
                            <span>
                              Decision-Boundary Sensitivity: Competitive Disadvantage → Preferred Promotional Depth &amp; Contribution
                            </span>
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 2 }}>
                            Maps relative competitive price disadvantage (% of list price) to the contribution-maximising promotional depth tier.
                          </div>
                        </div>
                        <span
                          data-testid="competitive-boundary-outcome-badge"
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            color:
                              competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                                ? '#92400E'
                                : '#065F46',
                            background:
                              competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                                ? '#FFFBEB'
                                : '#ECFDF5',
                            border: `1px solid ${
                              competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                                ? '#FDE68A'
                                : '#A7F3D0'
                            }`,
                            padding: '3px 8px',
                            borderRadius: 4
                          }}
                        >
                          {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                          competitiveIntelligence.boundary_sweep.boundary
                            ? `FLIP_FOUND · BOUNDARY AT ${
                                competitiveIntelligence.boundary_sweep.boundary.disadvantage_pp >= 0 ? '+' : ''
                              }${competitiveIntelligence.boundary_sweep.boundary.disadvantage_pp.toFixed(1)}% (${money(
                                competitiveIntelligence.boundary_sweep.boundary.assumed_competitive_price_gbp,
                                { decimals: 2, compact: false }
                              )})`
                            : 'NO_FLIP_WITHIN_TESTED_RANGE'}
                        </span>
                      </div>

                      {/* Contiguous Optimal-Depth Regime Strip */}
                      <div
                        data-testid="competitive-regime-strip"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                          gap: 8
                        }}
                      >
                        {competitiveIntelligence.boundary_sweep.regime_segments.map((seg, idx) => {
                          const isCurrentRegime = seg.contains_current_assumption;
                          const isBeyondRegime = seg.is_beyond_boundary_regime;
                          return (
                            <div
                              key={`${seg.winning_depth_pct}-${idx}`}
                              data-testid={`competitive-regime-segment-${idx}`}
                              style={{
                                background: isCurrentRegime
                                  ? '#EFF6FF'
                                  : isBeyondRegime
                                    ? '#FFFBEB'
                                    : '#F8FAFC',
                                border: isCurrentRegime
                                  ? '1.5px solid #2563EB'
                                  : isBeyondRegime
                                    ? '1.5px solid #D97706'
                                    : '1px solid #E2E8F0',
                                borderRadius: 6,
                                padding: '8px 10px',
                                fontSize: '0.73rem'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 800, color: '#0F172A', fontSize: '0.82rem' }}>
                                  {seg.winning_depth_pct}% Depth Optimal
                                </span>
                                {isCurrentRegime && (
                                  <span
                                    style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      color: '#1E40AF',
                                      background: '#DBEAFE',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}
                                  >
                                    CURRENT WINNER
                                  </span>
                                )}
                                {!isCurrentRegime && isBeyondRegime && (
                                  <span
                                    style={{
                                      fontSize: '0.62rem',
                                      fontWeight: 700,
                                      color: '#92400E',
                                      background: '#FEF3C7',
                                      padding: '1px 5px',
                                      borderRadius: 4
                                    }}
                                  >
                                    BEYOND BOUNDARY
                                  </span>
                                )}
                              </div>
                              <div style={{ color: '#475569', marginTop: 3, fontFamily: 'monospace', fontSize: '0.7rem' }}>
                                Disadvantage: {seg.from_disadvantage_pp >= 0 ? '+' : ''}
                                {seg.from_disadvantage_pp.toFixed(1)}% to {seg.to_disadvantage_pp >= 0 ? '+' : ''}
                                {seg.to_disadvantage_pp.toFixed(1)}%
                              </div>
                              <div style={{ color: '#64748B', marginTop: 2, fontFamily: 'monospace', fontSize: '0.69rem' }}>
                                Benchmark: {money(seg.from_competitive_price_gbp, { decimals: 2, compact: false })} → {money(seg.to_competitive_price_gbp, { decimals: 2, compact: false })}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Compact Key Landmarks (4–6 points — never dozens of raw sweep rows) */}
                      <div
                        data-testid="competitive-boundary-landmarks"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                          gap: 8
                        }}
                      >
                        {competitiveIntelligence.boundary_sweep.visual_landmarks.map(lm => (
                          <div
                            key={lm.id}
                            data-testid={`competitive-landmark-${lm.id.toLowerCase()}`}
                            style={{
                              background: lm.is_current_assumption
                                ? '#EFF6FF'
                                : lm.is_boundary
                                  ? '#FFFBEB'
                                  : '#FFFFFF',
                              border: lm.is_current_assumption
                                ? '1.5px solid #2563EB'
                                : lm.is_boundary
                                  ? '1.5px solid #D97706'
                                  : '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '8px 10px',
                              fontSize: '0.72rem'
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.63rem',
                                fontWeight: 700,
                                color: lm.is_current_assumption
                                  ? '#1E40AF'
                                  : lm.is_boundary
                                    ? '#B45309'
                                    : '#64748B',
                                textTransform: 'uppercase'
                              }}
                            >
                              {lm.label}
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2, fontFamily: 'monospace' }}>
                              {lm.disadvantage_pp >= 0 ? '+' : ''}
                              {lm.disadvantage_pp.toFixed(1)}% ({money(lm.assumed_competitive_price_gbp, { decimals: 2, compact: false })})
                            </div>
                            <div style={{ color: '#334155', marginTop: 2 }}>
                              Preferred: <strong>{lm.winning_depth_pct}% depth</strong>
                            </div>
                            <div
                              style={{
                                color: lm.winning_contribution_gbp >= 0 ? '#059669' : '#DC2626',
                                fontWeight: 700,
                                fontFamily: 'monospace',
                                marginTop: 1
                              }}
                            >
                              {money(lm.winning_contribution_gbp, { signed: true })} net
                            </div>
                          </div>
                        ))}
                      </div>

                      <div style={{ fontSize: '0.69rem', color: '#64748B', lineHeight: 1.35 }}>
                        Evaluated across governed depth tiers (
                        {competitiveIntelligence.boundary_sweep.evaluated_depths_pct.map(d => `${d}%`).join(', ')}) over [
                        {competitiveIntelligence.boundary_sweep.min_disadvantage_pp >= 0 ? '+' : ''}
                        {competitiveIntelligence.boundary_sweep.min_disadvantage_pp.toFixed(1)}%,{' '}
                        {competitiveIntelligence.boundary_sweep.max_disadvantage_pp >= 0 ? '+' : ''}
                        {competitiveIntelligence.boundary_sweep.max_disadvantage_pp.toFixed(1)}%] using a deterministic{' '}
                        {competitiveIntelligence.boundary_sweep.step_pp}pp list-price disadvantage search step (numerical search granularity, not a commercial threshold).
                      </div>
                    </div>

                    {/* Step 3 → Response Options Comparison (HOLD, MATCH, TARGET, REDUCE EXPOSURE) */}
                    <div
                      data-testid="competitive-response-options-section"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#0F172A' }}>
                            Governed Promotional Response Options (HOLD · MATCH · TARGET · REDUCE EXPOSURE)
                          </div>
                          <div style={{ fontSize: '0.73rem', color: '#64748B', marginTop: 2 }}>
                            Every option is evaluated on the single Slice 1–3 competitive-price domain path under the Maximum Net Contribution objective. Selecting an option stages a Candidate Intervention without mutating active planner controls until human Accept.
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.66rem',
                            fontWeight: 700,
                            color: '#1E293B',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}
                        >
                          OBJECTIVE: MAXIMUM NET CONTRIBUTION
                        </span>
                      </div>

                      {/* CogniX Preferred Response Banner */}
                      <div
                        data-testid="competitive-preferred-response-banner"
                        style={{
                          background: '#ECFDF5',
                          border: '1.5px solid #10B981',
                          borderRadius: 8,
                          padding: '10px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <span
                            data-testid="competitive-preferred-response-badge"
                            style={{
                              fontSize: '0.66rem',
                              fontWeight: 800,
                              color: '#065F46',
                              background: '#D1FAE5',
                              border: '1px solid #6EE7B7',
                              padding: '2px 8px',
                              borderRadius: 4,
                              letterSpacing: '0.03em'
                            }}
                          >
                            {COMPETITIVE_PREFERRED_RESPONSE_BADGE}: {competitiveIntelligence.response_options.preferred_option.label}
                          </span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#065F46' }}>
                            {competitiveIntelligence.response_options.preferred_option.depth_pct}% ·{' '}
                            {competitiveIntelligence.response_options.preferred_option.scope} (
                            {competitiveIntelligence.response_options.preferred_option.stores_count} stores) ·{' '}
                            {competitiveIntelligence.response_options.preferred_option.duration_days}d ·{' '}
                            {money(competitiveIntelligence.response_options.preferred_option.net_contribution_delta_gbp ?? 0, { signed: true })}
                          </span>
                        </div>
                        <div
                          data-testid="competitive-preferred-response-rationale"
                          style={{ fontSize: '0.76rem', color: '#064E3B', lineHeight: 1.4, fontWeight: 500 }}
                        >
                          {localise(competitiveIntelligence.response_options.preferred_response_rationale)}
                        </div>
                      </div>

                      {/* 4 Response Options Grid */}
                      <div
                        data-testid="competitive-response-options-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
                          gap: 12
                        }}
                      >
                        {competitiveIntelligence.response_options.options.map(opt => {
                          const isSelected = selectedCompetitiveOptionType === opt.option_type;
                          return (
                            <div
                              key={opt.option_type}
                              data-testid={`competitive-response-option-${opt.option_type.toLowerCase()}`}
                              style={{
                                background: !opt.available
                                  ? '#F8FAFC'
                                  : isSelected
                                    ? '#EFF6FF'
                                    : opt.is_preferred
                                      ? '#F0FDF4'
                                      : '#FFFFFF',
                                border: !opt.available
                                  ? '1px dashed #CBD5E1'
                                  : isSelected
                                    ? '2px solid #2563EB'
                                    : opt.is_preferred
                                      ? '1.5px solid #10B981'
                                      : '1px solid #E2E8F0',
                                borderRadius: 8,
                                padding: '12px 14px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                gap: 10,
                                minWidth: 0
                              }}
                            >
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {/* Option Header & Badges */}
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap' }}>
                                  <span
                                    style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 800,
                                      color: '#0F172A',
                                      background: '#E2E8F0',
                                      padding: '2px 7px',
                                      borderRadius: 4
                                    }}
                                  >
                                    {opt.label}
                                  </span>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                                    {opt.is_preferred && (
                                      <span
                                        data-testid={`competitive-option-preferred-badge-${opt.option_type.toLowerCase()}`}
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          color: '#065F46',
                                          background: '#D1FAE5',
                                          border: '1px solid #6EE7B7',
                                          padding: '2px 6px',
                                          borderRadius: 4
                                        }}
                                      >
                                        {COMPETITIVE_PREFERRED_RESPONSE_BADGE}
                                      </span>
                                    )}
                                    {!opt.available && (
                                      <span
                                        data-testid={`competitive-option-unavailable-${opt.option_type.toLowerCase()}`}
                                        style={{
                                          fontSize: '0.62rem',
                                          fontWeight: 800,
                                          color: '#991B1B',
                                          background: '#FEE2E2',
                                          border: '1px solid #FECACA',
                                          padding: '2px 6px',
                                          borderRadius: 4
                                        }}
                                      >
                                        UNAVAILABLE — OUT OF BOUNDS
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                                  {opt.title}
                                </div>

                                {!opt.available ? (
                                  <div
                                    data-testid={`competitive-option-unavailable-reason-${opt.option_type.toLowerCase()}`}
                                    style={{
                                      background: '#FEF2F2',
                                      border: '1px solid #FECACA',
                                      borderRadius: 6,
                                      padding: '8px 10px',
                                      fontSize: '0.73rem',
                                      color: '#991B1B',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {localise(opt.unavailable_reason || '')}
                                  </div>
                                  ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: '0.73rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 3 }}>
                                      <span style={{ color: '#64748B' }}>Depth &amp; Shelf Price</span>
                                      <strong style={{ color: '#0F172A', fontFamily: 'monospace', textAlign: 'right' }}>
                                        {opt.depth_pct}% ({money(opt.promoted_price_gbp ?? 0, { decimals: 2, compact: false })})
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 3 }}>
                                      <span style={{ color: '#64748B' }}>Scope &amp; Duration</span>
                                      <strong style={{ color: '#0F172A', textAlign: 'right' }}>
                                        {opt.scope} ({opt.stores_count} stores) · {opt.duration_days}d
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: 3, gap: 8 }}>
                                      <span style={{ color: '#64748B' }}>Relative Position</span>
                                      <strong style={{ color: '#334155', textAlign: 'right' }}>
                                        {localise(opt.relative_position_label)}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 3 }}>
                                      <span style={{ color: '#64748B' }}>Own-Price / Competitive</span>
                                      <strong style={{ color: '#0F172A', fontFamily: 'monospace', textAlign: 'right' }}>
                                        +{(opt.own_price_response_pp ?? 0).toFixed(1)}pp / {(opt.competitive_response_pp ?? 0) >= 0 ? '+' : ''}
                                        {(opt.competitive_response_pp ?? 0).toFixed(1)}pp
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 3 }}>
                                      <span style={{ color: '#64748B' }}>Expected Demand</span>
                                      <strong style={{ color: '#2563EB', fontFamily: 'monospace', textAlign: 'right' }}>
                                        +{(opt.expected_demand_uplift_pct ?? 0).toFixed(1)}% ({(opt.expected_demand_units ?? 0).toLocaleString('en-GB')} units)
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 3 }}>
                                      <span style={{ color: '#64748B' }}>Net Contribution</span>
                                      <strong
                                        style={{
                                          color: (opt.net_contribution_delta_gbp ?? 0) >= 0 ? '#059669' : '#DC2626',
                                          fontFamily: 'monospace',
                                          textAlign: 'right'
                                        }}
                                      >
                                        {money(opt.net_contribution_delta_gbp ?? 0, { signed: true })}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, borderBottom: '1px solid #F1F5F9', paddingBottom: 3 }}>
                                      <span style={{ color: '#64748B' }}>Delta vs HOLD</span>
                                      <strong
                                        style={{
                                          color:
                                            opt.option_type === 'HOLD'
                                              ? '#475569'
                                              : (opt.delta_vs_hold_contribution_gbp ?? 0) >= 0
                                                ? '#059669'
                                                : '#DC2626',
                                          fontFamily: 'monospace',
                                          textAlign: 'right'
                                        }}
                                      >
                                        {opt.option_type === 'HOLD'
                                          ? 'Baseline (0)'
                                          : money(opt.delta_vs_hold_contribution_gbp ?? 0, { signed: true })}
                                      </strong>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                                      <span style={{ color: '#64748B' }}>Margin Exposure</span>
                                      <strong style={{ color: '#475569', fontFamily: 'monospace', textAlign: 'right' }}>
                                        {money(opt.margin_exposure_gbp ?? 0)}
                                      </strong>
                                    </div>
                                  </div>
                                )}

                                {opt.available && (
                                  <div style={{ fontSize: '0.72rem', color: '#475569', lineHeight: 1.35 }}>
                                    {localise(opt.rationale)}
                                  </div>
                                )}
                              </div>

                              <button
                                type="button"
                                data-testid={`btn-select-competitive-option-${opt.option_type.toLowerCase()}`}
                                disabled={!opt.available}
                                onClick={() => handleSelectCompetitiveOption(opt)}
                                style={{
                                  width: '100%',
                                  background: !opt.available
                                    ? '#E2E8F0'
                                    : isSelected
                                      ? '#1E40AF'
                                      : opt.is_preferred
                                        ? '#059669'
                                        : '#2563EB',
                                  color: !opt.available ? '#64748B' : '#FFFFFF',
                                  border: 'none',
                                  padding: '8px 12px',
                                  borderRadius: 6,
                                  fontSize: '0.76rem',
                                  fontWeight: 600,
                                  cursor: !opt.available ? 'not-allowed' : 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: 6
                                }}
                              >
                                {!opt.available ? (
                                  <span>Unavailable (Out of Governed Bounds)</span>
                                ) : isSelected ? (
                                  <>
                                    <CheckCircle2 size={13} />
                                    <span>Staged in Candidate Workspace</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Stage {opt.label} as Candidate</span>
                                    <ArrowRight size={13} />
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {archetype.inverse_conditions.map((cond, idx) => {
            const summary = describeInverseConditionDecision({
              archetype,
              condition: cond,
              currentDiscountPct: currentDiscount,
              currentRegion,
              currentDurationDays
            });
            const isSelected = selectedConditionId === cond.id;

            return (
              <div
                key={cond.id}
                style={{
                  background: isSelected ? '#EFF6FF' : '#F8FAFC',
                  border: isSelected ? '1.5px solid #2563EB' : '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ flex: 1, minWidth: 260 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          color: '#2563EB',
                          background: '#DBEAFE',
                          border: '1px solid #BFDBFE',
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        CONDITION {idx + 1} · {cond.target_parameter.replace(/_/g, ' ')}
                      </span>
                      <span
                        style={{
                          fontSize: '0.66rem',
                          fontWeight: 700,
                          color: summary.recommendation_changes ? '#065F46' : '#92400E',
                          background: summary.recommendation_changes ? '#ECFDF5' : '#FFFBEB',
                          border: `1px solid ${summary.recommendation_changes ? '#A7F3D0' : '#FDE68A'}`,
                          padding: '2px 6px',
                          borderRadius: 4
                        }}
                      >
                        {summary.recommendation_changes
                          ? 'RECOMMENDATION CHANGES ON ACCEPT'
                          : 'EVALUATION OVERLAY · PLANNER DEPTH UNCHANGED'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                      {cond.condition_text}
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#1E40AF', marginBottom: 4 }}>
                      Decision question: {localise(summary.decision_question)}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                      {localise(cond.explanation)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <button
                      onClick={() => handleModelCondition(cond)}
                      style={{
                        background: isSelected ? '#2563EB' : '#FFFFFF',
                        color: isSelected ? '#FFFFFF' : '#2563EB',
                        border: '1px solid #2563EB',
                        padding: '7px 14px',
                        borderRadius: 6,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span>{cond.modelling_action_label}</span>
                    </button>
                    {cond.target_parameter === 'DEMAND_UPLIFT' && onOpenDemandLens && (
                      <button
                        type="button"
                        onClick={() => onOpenDemandLens()}
                        style={{
                          background: 'transparent',
                          color: '#475569',
                          border: 'none',
                          padding: '2px 4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        Inspect Demand &amp; Elasticity Curve →
                      </button>
                    )}
                  </div>
                </div>

                {/* Structured Decision Condition Breakdown */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 8,
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '8px 10px',
                    fontSize: '0.74rem'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Current Assumption
                    </div>
                    <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                      {localise(summary.current_assumption)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Tested Condition
                    </div>
                    <div style={{ fontWeight: 700, color: '#2563EB', marginTop: 2 }}>
                      {localise(summary.tested_condition)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Economic / Decision Effect
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        color: summary.economic_effect_gbp >= 0 ? '#059669' : '#DC2626',
                        marginTop: 2,
                        fontFamily: 'monospace'
                      }}
                    >
                      {summary.economic_effect_gbp >= 0 ? '+' : ''}
                      {money(summary.economic_effect_gbp)} net (
                      {summary.economic_delta_vs_current_gbp >= 0 ? '+' : ''}
                      {money(summary.economic_delta_vs_current_gbp)} vs current)
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#475569', marginTop: 1 }}>
                      {localise(summary.decision_boundary)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.64rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase' }}>
                      Recommendation Implication
                    </div>
                    <div style={{ color: '#334155', marginTop: 2, lineHeight: 1.35 }}>
                      {localise(summary.recommendation_implication)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Section 2: "What could change this decision?" & Boundary Triggers ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <AlertTriangle size={18} color="#D97706" />
            What Could Change This Decision?
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Declared boundary conditions that would alter the recommendation; in this demo they are monitored by the simulated Decision Twin.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {archetype.change_triggers.map(trig => (
            <div
              key={trig.trigger_id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                alignItems: 'center',
                gap: 12,
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 6,
                padding: '10px 14px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#0F172A' }}>
                  {trig.boundary_condition}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#94A3B8', marginTop: 2 }}>
                  Monitored Signal: {trig.monitored_signal}
                </div>
              </div>

              <div>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: trig.severity === 'VETO' ? '#DC2626' : trig.severity === 'WARNING' ? '#D97706' : '#059669',
                    background: trig.severity === 'VETO' ? '#FEF2F2' : trig.severity === 'WARNING' ? '#FFFBEB' : '#ECFDF5',
                    border: `1px solid ${trig.severity === 'VETO' ? '#FECACA' : trig.severity === 'WARNING' ? '#FDE68A' : '#A7F3D0'}`,
                    padding: '3px 8px',
                    borderRadius: 4
                  }}
                >
                  {trig.decision_shift}
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    color: '#64748B',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  {trig.severity} TRIGGER
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section 3: Signal → Hypothesis → Action Feed ── */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          borderRadius: 10,
          padding: '20px 24px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <h3
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: '#0F172A',
              margin: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Activity size={18} color="#2563EB" />
            Signal → Hypothesis → Action Feed
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#64748B', margin: '4px 0 0 0' }}>
            Seeded demonstration signals generate hypotheses and actionable scenarios — all signal values are demo world model data, not production feeds.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {archetype.signal_hypotheses.map(hypo => {
            const hasTested = testedHypothesis[hypo.signal_id];

            return (
              <div
                key={hypo.signal_id}
                style={{
                  background: '#F8FAFC',
                  border: '1px solid #E2E8F0',
                  borderRadius: 8,
                  padding: '14px 18px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>
                    SIGNAL · {hypo.signal_source}
                  </div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#2563EB',
                      background: '#EFF6FF',
                      padding: '2px 8px',
                      borderRadius: 4
                    }}
                  >
                    Seeded signal: {hypo.observed_metric}
                  </span>
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#0F172A', marginBottom: 6 }}>
                  {hypo.signal_headline}
                </div>

                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: 6,
                    padding: '8px 12px',
                    fontSize: '0.825rem',
                    color: '#334155',
                    marginBottom: 10
                  }}
                >
                  <strong style={{ color: '#2563EB' }}>Hypothesis:</strong> {hypo.hypothesis_statement}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {hasTested ? (
                      <span style={{ color: '#059669', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle2 size={13} />
                        Seeded assessment: {hypo.test_result.verdict.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      'Model this hypothesis as a proposed scenario'
                    )}
                  </div>

                  <button
                    onClick={() => handleTestHypothesis(hypo)}
                    style={{
                      background: '#2563EB',
                      color: '#FFFFFF',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: 6,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}
                  >
                    <span>{hypo.test_action_label}</span>
                    <Play size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
