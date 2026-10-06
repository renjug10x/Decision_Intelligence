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
  /** Studio arrival opens the existing What-If panel. It does not supply a benchmark or demand response assumption. */
  openCompetitivePanel?: boolean;
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
  openCompetitivePanel = false,
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
  const [isCompetitiveOpen, setIsCompetitiveOpen] = useState<boolean>(openCompetitivePanel);
  const [benchmarkPriceInput, setBenchmarkPriceInput] = useState<string>('');
  const [sensitivityGammaInput, setSensitivityGammaInput] = useState<string>('');
  const [evaluatedAssumption, setEvaluatedAssumption] =
    useState<CompetitivePriceAssumption | null>(null);
  const [isEditingAssumptions, setIsEditingAssumptions] = useState<boolean>(true);
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
      setIsEditingAssumptions(false);
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
      setIsEditingAssumptions(true);
      setCompetitiveValidationError(null);
      setSelectedCompetitiveOptionType(null);
    }
  }, [resolvedScenario.identity.scenario_id]);

  const isAssumptionUnchanged = useMemo(() => {
    if (!evaluatedAssumption) return false;
    const trimmedPrice = benchmarkPriceInput.trim();
    const trimmedResp = sensitivityGammaInput.trim();
    if (!trimmedPrice || !trimmedResp) return false;
    const parsedPrice = Number(trimmedPrice);
    const parsedResp = Number(trimmedResp);
    if (!Number.isFinite(parsedPrice) || !Number.isFinite(parsedResp)) return false;
    return (
      Math.abs(parsedPrice - evaluatedAssumption.assumed_competitive_price_gbp) < 1e-6 &&
      Math.abs(
        parsedResp - evaluatedAssumption.competitive_response_pp_per_disadvantage_point
      ) < 1e-6
    );
  }, [evaluatedAssumption, benchmarkPriceInput, sensitivityGammaInput]);

  const isAssumptionStale = evaluatedAssumption !== null && !isAssumptionUnchanged;

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
    if (isAssumptionUnchanged) {
      setIsEditingAssumptions(false);
      return;
    }
    setCompetitiveValidationError(null);

    const trimmedPrice = benchmarkPriceInput.trim();
    const trimmedGamma = sensitivityGammaInput.trim();

    if (!trimmedPrice) {
      setCompetitiveValidationError(
        'Enter a positive competitive benchmark price (e.g. 0.65) to evaluate competitive position.'
      );
      return;
    }
    if (!trimmedGamma) {
      setCompetitiveValidationError(
        'Enter an expected demand response value (0 or higher, e.g. 1.0) to evaluate the decision.'
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
      setIsEditingAssumptions(false);
      setSelectedCompetitiveOptionType(null);
    } catch (err: any) {
      setEvaluatedAssumption(null);
      setSelectedCompetitiveOptionType(null);
      setCompetitiveValidationError(
        err?.message || 'Enter a valid positive competitive benchmark price and non-negative demand response.'
      );
    }
  };

  const handleClearCompetitiveWhatIf = () => {
    setBenchmarkPriceInput('');
    setSensitivityGammaInput('');
    setEvaluatedAssumption(null);
    setIsEditingAssumptions(true);
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
                    COMPETITIVE PRICE RESPONSE
                  </span>
                  <span
                    data-testid="competitive-header-provenance-badge"
                    style={{
                      fontSize: '0.66rem',
                      fontWeight: 600,
                      color: '#475569',
                      background: '#F1F5F9',
                      border: '1px solid #CBD5E1',
                      padding: '2px 7px',
                      borderRadius: 4
                    }}
                  >
                    {COMPETITIVE_USER_FACING_PROVENANCE_LABEL}
                  </span>
                </div>

                <div
                  data-testid="competitive-what-if-question"
                  style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0F172A', marginBottom: 4 }}
                >
                  Would our current promotion decision still hold if competitive pricing changes?
                </div>
                <div style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.45 }}>
                  Test how a competitive shelf price assumption affects your current{' '}
                  <strong>{activeDepthPct}%</strong> promotion on{' '}
                  <strong>{resolvedScenario.identity.sku_name}</strong> (our promotional price:{' '}
                  <strong>{money(activePromotedPriceGbp, { decimals: 2, compact: false })}</strong> vs{' '}
                  {money(resolvedScenario.economics.list_price_gbp, { decimals: 2, compact: false })} list).
                  Evaluating this assumption does not change the campaign until you stage a candidate.
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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

            {/* Step 1 → Collapsible Assumption Summary or Assumptions Input Form */}
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
                {evaluatedAssumption && !isEditingAssumptions ? (
                  <div
                    data-testid="competitive-assumption-summary"
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: 8,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 10
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        flexWrap: 'wrap',
                        fontSize: '0.8rem',
                        color: '#0F172A'
                      }}
                    >
                      <span>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>
                          Competitive benchmark{' '}
                        </span>
                        <strong style={{ fontFamily: 'monospace' }}>
                          {money(evaluatedAssumption.assumed_competitive_price_gbp, {
                            decimals: 2,
                            compact: false
                          })}
                        </strong>
                      </span>
                      <span style={{ color: '#CBD5E1' }}>·</span>
                      <span>
                        <span style={{ color: '#64748B', fontWeight: 600 }}>
                          Expected demand response{' '}
                        </span>
                        <strong style={{ fontFamily: 'monospace' }}>
                          {evaluatedAssumption.competitive_response_pp_per_disadvantage_point.toFixed(1)}
                        </strong>
                      </span>
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color: '#475569',
                          background: '#F1F5F9',
                          border: '1px solid #CBD5E1',
                          padding: '2px 7px',
                          borderRadius: 4
                        }}
                      >
                        {COMPETITIVE_USER_FACING_PROVENANCE_LABEL}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        data-testid="competitive-evaluated-status"
                        style={{
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#065F46',
                          background: '#ECFDF5',
                          border: '1px solid #A7F3D0',
                          padding: '4px 9px',
                          borderRadius: 5
                        }}
                      >
                        Analysis updated ✓
                      </span>
                      <button
                        type="button"
                        data-testid="btn-edit-competitive-assumptions"
                        onClick={() => setIsEditingAssumptions(true)}
                        style={{
                          background: '#FFFFFF',
                          color: '#1E40AF',
                          border: '1px solid #93C5FD',
                          padding: '5px 12px',
                          borderRadius: 5,
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        data-testid="btn-clear-competitive-what-if"
                        onClick={handleClearCompetitiveWhatIf}
                        style={{
                          background: '#F8FAFC',
                          color: '#475569',
                          border: '1px solid #CBD5E1',
                          padding: '5px 10px',
                          borderRadius: 5,
                          fontSize: '0.76rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                ) : (
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
                        Competitive Assumptions
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
                        {COMPETITIVE_USER_FACING_PROVENANCE_LABEL}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: 16
                      }}
                    >
                      {/* Input A: Competitive benchmark price */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <label
                          htmlFor="input-competitive-benchmark-price"
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}
                        >
                          Competitive benchmark price (£)
                        </label>
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
                          The competitive shelf price you want to test.
                        </div>
                      </div>

                      {/* Input B: Expected demand response */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, minWidth: 0 }}>
                        <label
                          htmlFor="input-competitive-sensitivity-gamma"
                          style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0F172A' }}
                        >
                          Expected demand response
                        </label>
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
                        <div style={{ fontSize: '0.72rem', color: '#64748B', lineHeight: 1.35 }}>
                          How strongly we expect customer demand to react when our price differs from the competitive benchmark.
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

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: 10
                      }}
                    >
                      <div style={{ fontSize: '0.73rem', color: '#64748B' }}>
                        {isAssumptionStale ? (
                          <span style={{ color: '#92400E', fontWeight: 600 }}>
                            Assumptions modified — update analysis to refresh results.
                          </span>
                        ) : (
                          <span>
                            Active context: <strong>{resolvedScenario.identity.sku_name}</strong> ·{' '}
                            {activeDepthPct}% depth ({money(activePromotedPriceGbp, { decimals: 2, compact: false })})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {evaluatedAssumption && isAssumptionUnchanged && (
                          <button
                            type="button"
                            data-testid="btn-collapse-competitive-assumptions"
                            onClick={() => setIsEditingAssumptions(false)}
                            style={{
                              background: '#F8FAFC',
                              color: '#334155',
                              border: '1px solid #CBD5E1',
                              padding: '7px 12px',
                              borderRadius: 6,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Done
                          </button>
                        )}
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
                          Clear
                        </button>
                        <button
                          type="submit"
                          data-testid="btn-evaluate-competitive-what-if"
                          disabled={isAssumptionUnchanged}
                          style={{
                            background: isAssumptionUnchanged
                              ? '#ECFDF5'
                              : isAssumptionStale
                                ? '#D97706'
                                : '#2563EB',
                            color: isAssumptionUnchanged ? '#065F46' : '#FFFFFF',
                            border: isAssumptionUnchanged ? '1px solid #A7F3D0' : 'none',
                            padding: '7px 16px',
                            borderRadius: 6,
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: isAssumptionUnchanged ? 'default' : 'pointer'
                          }}
                        >
                          {isAssumptionUnchanged
                            ? 'Analysis updated ✓'
                            : isAssumptionStale
                              ? 'Update analysis'
                              : 'Evaluate'}
                        </button>
                      </div>
                    </div>
                  </form>
                )}

                {/* Step 2 → Restructured Commercial Results (Three Questions) */}
                {competitiveIntelligence && (
                  <div
                    data-testid="competitive-what-if-results"
                    style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
                  >
                    {/* ── 1. WHAT CHANGED? ── */}
                    <div
                      data-testid="competitive-section-what-changed"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
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
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: 8
                        }}
                      >
                        <div>
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#2563EB',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}
                          >
                            1. What Changed?
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                            Competitive position
                          </div>
                        </div>
                        <span
                          data-testid="competitive-what-if-provenance"
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#475569',
                            background: '#F1F5F9',
                            border: '1px solid #CBD5E1',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}
                        >
                          Modelled assumption
                        </span>
                      </div>

                      <div
                        data-testid="competitive-current-position"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                          gap: 10
                        }}
                      >
                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '10px 12px'
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                            Our promotional price
                          </div>
                          <div
                            style={{
                              fontSize: '1.04rem',
                              fontWeight: 700,
                              color: '#0F172A',
                              fontFamily: 'monospace',
                              marginTop: 2
                            }}
                          >
                            {money(
                              competitiveIntelligence.current_position.position
                                .our_promotional_price_gbp,
                              { decimals: 2, compact: false }
                            )}
                          </div>
                          <div style={{ fontSize: '0.69rem', color: '#64748B', marginTop: 2 }}>
                            {competitiveIntelligence.current_position.position.promotion_depth_pct}%
                            discount off{' '}
                            {money(
                              competitiveIntelligence.current_position.position.list_price_gbp,
                              { decimals: 2, compact: false }
                            )}{' '}
                            list
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '10px 12px'
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                            Competitive benchmark
                          </div>
                          <div
                            style={{
                              fontSize: '1.04rem',
                              fontWeight: 700,
                              color: '#1E40AF',
                              fontFamily: 'monospace',
                              marginTop: 2
                            }}
                          >
                            {money(
                              competitiveIntelligence.current_position.position
                                .assumed_competitive_price_gbp,
                              { decimals: 2, compact: false }
                            )}
                          </div>
                          <div style={{ fontSize: '0.69rem', color: '#64748B', marginTop: 2 }}>
                            Tested shelf price
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '10px 12px'
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                            Difference
                          </div>
                          <div
                            style={{
                              fontSize: '1.04rem',
                              fontWeight: 700,
                              color:
                                competitiveIntelligence.current_position.position.standing ===
                                'DISADVANTAGE'
                                  ? '#B45309'
                                  : competitiveIntelligence.current_position.position.standing ===
                                      'ADVANTAGE'
                                    ? '#047857'
                                    : '#0F172A',
                              fontFamily: 'monospace',
                              marginTop: 2
                            }}
                          >
                            {competitiveIntelligence.current_position.position.price_gap_gbp > 0
                              ? `${money(
                                  competitiveIntelligence.current_position.position.price_gap_gbp,
                                  { decimals: 2, compact: false }
                                )} higher`
                              : competitiveIntelligence.current_position.position.price_gap_gbp < 0
                                ? `${money(
                                    Math.abs(
                                      competitiveIntelligence.current_position.position
                                        .price_gap_gbp
                                    ),
                                    { decimals: 2, compact: false }
                                  )} lower`
                                : `${money(0, { decimals: 2, compact: false })} parity`}
                          </div>
                          <div style={{ fontSize: '0.69rem', color: '#64748B', marginTop: 2 }}>
                            vs competitive benchmark
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#F8FAFC',
                            border: '1px solid #E2E8F0',
                            borderRadius: 6,
                            padding: '10px 12px'
                          }}
                        >
                          <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                            Relative position
                          </div>
                          <div
                            style={{
                              fontSize: '1.04rem',
                              fontWeight: 700,
                              color:
                                competitiveIntelligence.current_position.position.standing ===
                                'DISADVANTAGE'
                                  ? '#B45309'
                                  : competitiveIntelligence.current_position.position.standing ===
                                      'ADVANTAGE'
                                    ? '#047857'
                                    : '#0F172A',
                              fontFamily: 'monospace',
                              marginTop: 2
                            }}
                          >
                            {competitiveIntelligence.current_position.position.disadvantage_pp > 0
                              ? `${competitiveIntelligence.current_position.position.disadvantage_pp.toFixed(
                                  1
                                )}% higher`
                              : competitiveIntelligence.current_position.position.disadvantage_pp < 0
                                ? `${Math.abs(
                                    competitiveIntelligence.current_position.position.disadvantage_pp
                                  ).toFixed(1)}% lower`
                                : '0.0% parity'}
                          </div>
                          <div style={{ fontSize: '0.69rem', color: '#64748B', marginTop: 2 }}>
                            {competitiveIntelligence.current_position.position.standing ===
                            'DISADVANTAGE'
                              ? 'Price disadvantage vs benchmark'
                              : competitiveIntelligence.current_position.position.standing ===
                                  'ADVANTAGE'
                                ? 'Price advantage vs benchmark'
                                : 'At shelf-price parity'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ── 2. DOES OUR DECISION STILL HOLD? ── */}
                    <div
                      data-testid="competitive-section-decision-holds"
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
                        data-testid="competitive-decision-statement"
                        style={{
                          background: competitiveIntelligence.response_options.hold_is_preferred
                            ? '#ECFDF5'
                            : '#FFFBEB',
                          border: competitiveIntelligence.response_options.hold_is_preferred
                            ? '1.5px solid #6EE7B7'
                            : '1.5px solid #FCD34D',
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
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                color: '#2563EB',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em'
                              }}
                            >
                              2. Does Our Decision Still Hold?
                            </div>
                            <div
                              data-testid="competitive-decision-verdict"
                              style={{
                                fontSize: '1.02rem',
                                fontWeight: 800,
                                color: competitiveIntelligence.response_options.hold_is_preferred
                                  ? '#065F46'
                                  : '#92400E',
                                marginTop: 2
                              }}
                            >
                              {competitiveIntelligence.response_options.hold_is_preferred
                                ? 'DECISION STILL HOLDS'
                                : 'CHANGE RECOMMENDED'}
                            </div>
                          </div>

                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: competitiveIntelligence.response_options.hold_is_preferred
                                ? '#065F46'
                                : '#92400E',
                              background: '#FFFFFF',
                              border: competitiveIntelligence.response_options.hold_is_preferred
                                ? '1px solid #A7F3D0'
                                : '1px solid #FDE68A',
                              padding: '3px 9px',
                              borderRadius: 4
                            }}
                          >
                            {competitiveIntelligence.response_options.hold_is_preferred
                              ? 'Current plan remains preferred'
                              : `CogniX prefers ${competitiveIntelligence.response_options.preferred_option.label}`}
                          </span>
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: 10
                          }}
                        >
                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '10px 12px'
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                              Current plan
                            </div>
                            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              {competitiveIntelligence.current_decision_impact.active_depth_pct}% discount
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                              {activeRegion} · {activeDurationDays} days (
                              {money(
                                competitiveIntelligence.current_decision_impact.active_point
                                  .net_contribution_delta_gbp,
                                { signed: true }
                              )}{' '}
                              contribution)
                            </div>
                          </div>

                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '10px 12px'
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                              CogniX response
                            </div>
                            <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#1E40AF', marginTop: 2 }}>
                              {competitiveIntelligence.response_options.preferred_option.depth_pct}% discount
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                              {competitiveIntelligence.response_options.preferred_option.scope} ·{' '}
                              {competitiveIntelligence.response_options.preferred_option.duration_days} days (
                              {competitiveIntelligence.response_options.preferred_option.label})
                            </div>
                          </div>

                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '10px 12px'
                            }}
                          >
                            <div style={{ fontSize: '0.7rem', color: '#64748B', fontWeight: 600 }}>
                              Contribution impact
                            </div>
                            <div
                              style={{
                                fontSize: '0.96rem',
                                fontWeight: 700,
                                color:
                                  (competitiveIntelligence.response_options.preferred_option
                                    .net_contribution_delta_gbp ?? 0) >= 0
                                    ? '#047857'
                                    : '#B91C1C',
                                fontFamily: 'monospace',
                                marginTop: 2
                              }}
                            >
                              {money(
                                competitiveIntelligence.response_options.preferred_option
                                  .net_contribution_delta_gbp ?? 0,
                                { signed: true }
                              )}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#64748B', marginTop: 2 }}>
                              {competitiveIntelligence.response_options.hold_is_preferred
                                ? 'Highest expected contribution under benchmark'
                                : `${money(
                                    competitiveIntelligence.response_options.preferred_option
                                      .delta_vs_hold_contribution_gbp ?? 0,
                                    { signed: true }
                                  )} vs holding current plan`}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Simplified Business-Language Decision Boundary ── */}
                      <div
                        data-testid="competitive-decision-boundary-visual"
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 10
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
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <TrendingUp size={15} color="#2563EB" />
                            <span>Decision boundary</span>
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
                              padding: '2px 8px',
                              borderRadius: 4
                            }}
                          >
                            {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                            competitiveIntelligence.boundary_sweep.boundary
                              ? `Decision changes at ~${Math.abs(
                                  competitiveIntelligence.boundary_sweep.boundary.disadvantage_pp
                                ).toFixed(1)}% price difference`
                              : 'Decision holds across tested range'}
                          </span>
                        </div>

                        <div style={{ fontSize: '0.79rem', color: '#334155', lineHeight: 1.45 }}>
                          {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                          competitiveIntelligence.boundary_sweep.boundary ? (
                            <>
                              The decision changes when our price disadvantage reaches approximately{' '}
                              <strong>
                                {Math.abs(
                                  competitiveIntelligence.boundary_sweep.boundary.disadvantage_pp
                                ).toFixed(1)}
                                %
                              </strong>{' '}
                              (competitive benchmark at{' '}
                              <strong>
                                {money(
                                  competitiveIntelligence.boundary_sweep.boundary
                                    .assumed_competitive_price_gbp,
                                  { decimals: 2, compact: false }
                                )}
                              </strong>
                              ), where{' '}
                              <strong>
                                {competitiveIntelligence.boundary_sweep.boundary.new_winning_depth_pct}%
                              </strong>{' '}
                              promotional depth becomes preferred over{' '}
                              <strong>
                                {
                                  competitiveIntelligence.boundary_sweep.boundary
                                    .previous_winning_depth_pct
                                }
                                %
                              </strong>
                              .
                            </>
                          ) : (
                            <>
                              The current preferred depth (
                              <strong>
                                {competitiveIntelligence.boundary_sweep.current_winner.winning_depth_pct}%
                              </strong>
                              ) remains preferred throughout the tested competitive range.
                            </>
                          )}
                        </div>

                        {/* One meaningful visual: Current position, Decision-change boundary, Response beyond boundary */}
                        <div
                          data-testid="competitive-regime-strip"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(175px, 1fr))',
                            gap: 8
                          }}
                        >
                          <div
                            style={{
                              background: '#EFF6FF',
                              border: '1.5px solid #2563EB',
                              borderRadius: 6,
                              padding: '8px 10px',
                              fontSize: '0.74rem'
                            }}
                          >
                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#1E40AF' }}>
                              Current position
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              {competitiveIntelligence.current_position.position.disadvantage_pp > 0
                                ? `${competitiveIntelligence.current_position.position.disadvantage_pp.toFixed(1)}% higher than benchmark`
                                : competitiveIntelligence.current_position.position.disadvantage_pp < 0
                                  ? `${Math.abs(competitiveIntelligence.current_position.position.disadvantage_pp).toFixed(1)}% lower than benchmark`
                                  : 'At price parity'}
                            </div>
                            <div style={{ fontSize: '0.69rem', color: '#475569', marginTop: 2 }}>
                              Benchmark{' '}
                              {money(
                                competitiveIntelligence.current_position.position
                                  .assumed_competitive_price_gbp,
                                { decimals: 2, compact: false }
                              )}{' '}
                              · Best depth:{' '}
                              <strong>
                                {competitiveIntelligence.boundary_sweep.current_winner.winning_depth_pct}%
                              </strong>
                            </div>
                          </div>

                          <div
                            style={{
                              background:
                                competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                                  ? '#FFFBEB'
                                  : '#FFFFFF',
                              border:
                                competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                                  ? '1.5px solid #D97706'
                                  : '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '8px 10px',
                              fontSize: '0.74rem'
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.66rem',
                                fontWeight: 700,
                                color:
                                  competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND'
                                    ? '#B45309'
                                    : '#64748B'
                              }}
                            >
                              Decision-change boundary
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                              competitiveIntelligence.boundary_sweep.boundary
                                ? `~${Math.abs(
                                    competitiveIntelligence.boundary_sweep.boundary.disadvantage_pp
                                  ).toFixed(1)}% price disadvantage`
                                : 'No change in tested range'}
                            </div>
                            <div style={{ fontSize: '0.69rem', color: '#475569', marginTop: 2 }}>
                              {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                              competitiveIntelligence.boundary_sweep.boundary
                                ? `Benchmark ${money(
                                    competitiveIntelligence.boundary_sweep.boundary
                                      .assumed_competitive_price_gbp,
                                    { decimals: 2, compact: false }
                                  )}`
                                : 'Stable across tested shelf prices'}
                            </div>
                          </div>

                          <div
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '8px 10px',
                              fontSize: '0.74rem'
                            }}
                          >
                            <div style={{ fontSize: '0.66rem', fontWeight: 700, color: '#065F46' }}>
                              Response beyond boundary
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                              competitiveIntelligence.boundary_sweep.boundary
                                ? `${competitiveIntelligence.boundary_sweep.boundary.new_winning_depth_pct}% discount depth`
                                : `Keep ${competitiveIntelligence.boundary_sweep.current_winner.winning_depth_pct}% depth`}
                            </div>
                            <div style={{ fontSize: '0.69rem', color: '#475569', marginTop: 2 }}>
                              {competitiveIntelligence.boundary_sweep.outcome === 'FLIP_FOUND' &&
                              competitiveIntelligence.boundary_sweep.boundary
                                ? `${money(
                                    competitiveIntelligence.boundary_sweep.boundary
                                      .new_winning_contribution_gbp,
                                    { signed: true }
                                  )} expected contribution`
                                : 'Highest expected contribution'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ── Simplified Price-Match Reference ── */}
                      <div
                        data-testid="competitive-match-reference"
                        style={{
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          borderRadius: 8,
                          padding: '10px 14px',
                          fontSize: '0.78rem',
                          color: '#334155',
                          lineHeight: 1.45
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 2 }}>
                          Price-match reference
                        </div>
                        <div>
                          {competitiveIntelligence.match_reference.derivation.raw_required_depth_pct <=
                          0 ? (
                            <>
                              Our list price (
                              {money(
                                competitiveIntelligence.match_reference.derivation.list_price_gbp,
                                { decimals: 2, compact: false }
                              )}
                              ) already matches or undercuts the modelled benchmark (
                              {money(
                                competitiveIntelligence.match_reference.derivation
                                  .assumed_competitive_price_gbp,
                                { decimals: 2, compact: false }
                              )}
                              ).
                            </>
                          ) : (
                            <>
                              To match the modelled competitive benchmark, promotional depth would need
                              to be approximately{' '}
                              <strong>
                                {competitiveIntelligence.match_reference.derivation.raw_required_depth_pct.toFixed(
                                  1
                                )}
                                %
                              </strong>
                              {!competitiveIntelligence.match_reference.derivation
                                .is_achievable_within_bounds &&
                                ` (exceeds the ${competitiveIntelligence.match_reference.derivation.max_depth_pct}% governed campaign limit)`}
                              .
                            </>
                          )}{' '}
                          <span style={{ color: '#64748B' }}>
                            This is a reference point, not automatically the recommended response.
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ── 3. WHAT SHOULD WE DO? ── */}
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
                          <div
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#2563EB',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em'
                            }}
                          >
                            3. What Should We Do?
                          </div>
                          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#0F172A' }}>
                            Compare commercial response options
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            color: '#1E40AF',
                            background: '#DBEAFE',
                            border: '1px solid #BFDBFE',
                            padding: '2px 8px',
                            borderRadius: 4
                          }}
                        >
                          Objective: Highest expected contribution
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
                            {COMPETITIVE_PREFERRED_RESPONSE_BADGE}
                          </span>
                          <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#065F46' }}>
                            {competitiveIntelligence.response_options.preferred_option.label} —{' '}
                            {competitiveIntelligence.response_options.preferred_option.depth_pct}% ·{' '}
                            {competitiveIntelligence.response_options.preferred_option.scope} ·{' '}
                            {competitiveIntelligence.response_options.preferred_option.duration_days}{' '}
                            days (
                            {money(
                              competitiveIntelligence.response_options.preferred_option
                                .net_contribution_delta_gbp ?? 0,
                              { signed: true }
                            )}{' '}
                            contribution)
                          </span>
                        </div>
                        <div
                          data-testid="competitive-preferred-response-rationale"
                          style={{ fontSize: '0.78rem', color: '#064E3B', lineHeight: 1.45, fontWeight: 500 }}
                        >
                          Delivers the highest expected contribution (
                          <strong>
                            {money(
                              competitiveIntelligence.response_options.preferred_option
                                .net_contribution_delta_gbp ?? 0,
                              { signed: true }
                            )}
                          </strong>
                          ) under the{' '}
                          {money(competitiveIntelligence.assumption.assumed_competitive_price_gbp, {
                            decimals: 2,
                            compact: false
                          })}{' '}
                          competitive benchmark
                          {competitiveIntelligence.response_options.preferred_option.option_type !==
                          'MATCH'
                            ? ' without over-investing margin in a full price match.'
                            : ' by restoring competitive shelf-price parity.'}
                        </div>
                      </div>

                      {/* 4 Simplified Response Options Grid */}
                      <div
                        data-testid="competitive-response-options-grid"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                          gap: 12
                        }}
                      >
                        {competitiveIntelligence.response_options.options.map(opt => {
                          const isSelected = selectedCompetitiveOptionType === opt.option_type;
                          const oneLineExplanation =
                            opt.option_type === 'HOLD'
                              ? 'Keep the current promotional plan unchanged and absorb the competitive price gap.'
                              : opt.option_type === 'MATCH'
                                ? 'Adjust promotional depth to match the modelled competitive benchmark price.'
                                : opt.option_type === 'TARGET'
                                  ? 'Focus investment where CogniX already sees the strongest opportunity.'
                                  : 'Narrow store exposure or duration to protect margin under competitive pressure.';

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
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
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
                                  <>
                                    {/* Configuration */}
                                    <div
                                      style={{
                                        fontSize: '0.8rem',
                                        fontWeight: 700,
                                        color: '#1E293B',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      {opt.depth_pct}% · {opt.scope} · {opt.duration_days} days
                                    </div>

                                    {/* Primary Economic Result */}
                                    <div
                                      style={{
                                        fontSize: '1.06rem',
                                        fontWeight: 800,
                                        color:
                                          (opt.net_contribution_delta_gbp ?? 0) >= 0
                                            ? '#059669'
                                            : '#DC2626',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      {money(opt.net_contribution_delta_gbp ?? 0, { signed: true })}{' '}
                                      contribution
                                    </div>

                                    {/* One-Line Commercial Explanation */}
                                    <div
                                      style={{
                                        fontSize: '0.74rem',
                                        color: '#475569',
                                        lineHeight: 1.4
                                      }}
                                    >
                                      {oneLineExplanation}
                                    </div>

                                    {/* Progressive Disclosure: View details */}
                                    <details
                                      data-testid={`competitive-option-details-${opt.option_type.toLowerCase()}`}
                                      style={{
                                        fontSize: '0.72rem',
                                        color: '#475569',
                                        background: '#F8FAFC',
                                        border: '1px solid #E2E8F0',
                                        borderRadius: 6,
                                        padding: '6px 8px',
                                        marginTop: 2
                                      }}
                                    >
                                      <summary
                                        style={{
                                          cursor: 'pointer',
                                          fontWeight: 600,
                                          color: '#1E40AF',
                                          userSelect: 'none'
                                        }}
                                      >
                                        View details
                                      </summary>
                                      <div
                                        style={{
                                          marginTop: 6,
                                          display: 'flex',
                                          flexDirection: 'column',
                                          gap: 4
                                        }}
                                      >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ color: '#64748B' }}>Shelf price:</span>
                                          <strong style={{ fontFamily: 'monospace', color: '#0F172A' }}>
                                            {money(opt.promoted_price_gbp ?? 0, {
                                              decimals: 2,
                                              compact: false
                                            })}
                                          </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ color: '#64748B' }}>Stores in scope:</span>
                                          <strong>{opt.stores_count} stores</strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ color: '#64748B' }}>Relative position:</span>
                                          <strong style={{ textAlign: 'right' }}>
                                            {localise(opt.relative_position_label)}
                                          </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ color: '#64748B' }}>Expected demand:</span>
                                          <strong style={{ fontFamily: 'monospace', color: '#2563EB' }}>
                                            +{(opt.expected_demand_uplift_pct ?? 0).toFixed(1)}% (
                                            {(opt.expected_demand_units ?? 0).toLocaleString('en-GB')}{' '}
                                            units)
                                          </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ color: '#64748B' }}>vs HOLD:</span>
                                          <strong style={{ fontFamily: 'monospace' }}>
                                            {opt.option_type === 'HOLD'
                                              ? 'Baseline (0)'
                                              : money(opt.delta_vs_hold_contribution_gbp ?? 0, {
                                                  signed: true
                                                })}
                                          </strong>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                                          <span style={{ color: '#64748B' }}>Margin exposure:</span>
                                          <strong style={{ fontFamily: 'monospace' }}>
                                            {money(opt.margin_exposure_gbp ?? 0)}
                                          </strong>
                                        </div>
                                        <div style={{ marginTop: 3, lineHeight: 1.35 }}>
                                          {localise(opt.rationale)}
                                        </div>
                                      </div>
                                    </details>
                                  </>
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
                                    <span>Stage as candidate</span>
                                    <ArrowRight size={13} />
                                  </>
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Progressive Disclosure: Analysis Details (How CogniX Evaluated This) ── */}
                    <details
                      data-testid="competitive-analysis-details"
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        borderRadius: 8,
                        padding: '10px 14px'
                      }}
                    >
                      <summary
                        style={{
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: '#1E40AF',
                          userSelect: 'none'
                        }}
                      >
                        View analysis details (How CogniX evaluated this)
                      </summary>

                      <div
                        style={{
                          marginTop: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 12,
                          fontSize: '0.75rem',
                          color: '#334155'
                        }}
                      >
                        <div
                          data-testid="competitive-current-decision-impact"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                            gap: 10
                          }}
                        >
                          <div
                            data-testid="competitive-own-promotion-effect"
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '8px 10px'
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                color: '#059669',
                                textTransform: 'uppercase'
                              }}
                            >
                              OWN PROMOTION EFFECT
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              +
                              {competitiveIntelligence.current_decision_impact.active_point.own_price_response_pp.toFixed(
                                2
                              )}
                              pp own-price demand response at{' '}
                              {competitiveIntelligence.current_decision_impact.active_depth_pct}% depth
                            </div>
                          </div>

                          <div
                            data-testid="competitive-assumption-effect"
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '8px 10px'
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                color: '#B45309',
                                textTransform: 'uppercase'
                              }}
                            >
                              COMPETITIVE ASSUMPTION EFFECT
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              {competitiveIntelligence.current_decision_impact.active_point
                                .competitive_response_pp >= 0
                                ? '+'
                                : ''}
                              {competitiveIntelligence.current_decision_impact.active_point.competitive_response_pp.toFixed(
                                2
                              )}
                              pp total competitive response at{' '}
                              {competitiveIntelligence.current_decision_impact.active_depth_pct}% depth
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                              Ambient at 0% list price (not credited to campaign):{' '}
                              <strong>
                                {competitiveIntelligence.current_decision_impact.decomposition
                                  .ambient_competitive_effect_pp >= 0
                                  ? '+'
                                  : ''}
                                {competitiveIntelligence.current_decision_impact.decomposition.ambient_competitive_effect_pp.toFixed(
                                  2
                                )}
                                pp
                              </strong>{' '}
                              · Campaign-attributable (0% →{' '}
                              {competitiveIntelligence.current_decision_impact.active_depth_pct}%):{' '}
                              <strong>
                                {competitiveIntelligence.current_decision_impact.decomposition
                                  .intervention_attributable_competitive_effect_pp >= 0
                                  ? '+'
                                  : ''}
                                {competitiveIntelligence.current_decision_impact.decomposition.intervention_attributable_competitive_effect_pp.toFixed(
                                  2
                                )}
                                pp
                              </strong>
                            </div>
                          </div>

                          <div
                            data-testid="competitive-combined-impact"
                            style={{
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              borderRadius: 6,
                              padding: '8px 10px'
                            }}
                          >
                            <div
                              style={{
                                fontSize: '0.64rem',
                                fontWeight: 700,
                                color: '#1E40AF',
                                textTransform: 'uppercase'
                              }}
                            >
                              Combined Net Impact
                            </div>
                            <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                              {competitiveIntelligence.current_decision_impact.active_point
                                .total_demand_uplift_with_ambient_pct >= 0
                                ? '+'
                                : ''}
                              {competitiveIntelligence.current_decision_impact.active_point.total_demand_uplift_with_ambient_pct.toFixed(
                                2
                              )}
                              pp (
                              {competitiveIntelligence.current_decision_impact.active_point.expected_demand_units.toLocaleString(
                                'en-GB'
                              )}{' '}
                              units)
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#475569', marginTop: 2 }}>
                              Expected demand response assumption:{' '}
                              <strong>
                                {competitiveIntelligence.assumption.competitive_response_pp_per_disadvantage_point.toFixed(
                                  1
                                )}
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Tested Competitive Range Landmarks */}
                        <div
                          data-testid="competitive-boundary-landmarks"
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(165px, 1fr))',
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
                                    : '#F8FAFC',
                                border: lm.is_current_assumption
                                  ? '1.5px solid #2563EB'
                                  : lm.is_boundary
                                    ? '1.5px solid #D97706'
                                    : '1px solid #E2E8F0',
                                borderRadius: 6,
                                padding: '8px 10px',
                                fontSize: '0.71rem'
                              }}
                            >
                              <div
                                style={{
                                  fontSize: '0.62rem',
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
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: '#0F172A',
                                  marginTop: 2,
                                  fontFamily: 'monospace'
                                }}
                              >
                                {lm.disadvantage_pp >= 0 ? '+' : ''}
                                {lm.disadvantage_pp.toFixed(1)}% (
                                {money(lm.assumed_competitive_price_gbp, {
                                  decimals: 2,
                                  compact: false
                                })}
                                )
                              </div>
                              <div style={{ color: '#334155', marginTop: 2 }}>
                                Best depth: <strong>{lm.winning_depth_pct}%</strong> (
                                {money(lm.winning_contribution_gbp, { signed: true })})
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ fontSize: '0.71rem', color: '#64748B' }}>
                          <strong>{COMPETITIVE_USER_FACING_PROVENANCE_LABEL}:</strong>{' '}
                          {COMPETITIVE_USER_FACING_PROVENANCE_NOTE}
                        </div>
                      </div>
                    </details>
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
