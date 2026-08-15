'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  Layers,
  Lock,
  Sparkles
} from 'lucide-react';
import {
  AudienceMarket,
  BaselineObjective,
  CAMPAIGN_CANVAS_AREA_ORDER,
  CampaignCanvasArea,
  CampaignIntent,
  CampaignIntentCore,
  DecisionContextArea,
  deriveCanvasProgress
} from '@/packages/contracts/src/campaign-intent-model';
import {
  fetchCurrentCampaignIntent,
  registerCampaignIntentClient,
  saveCampaignIntentDraftClient,
  evaluateCampaignDecisionClient,
  discoverCampaignOpportunityClient,
  evaluateCampaignReadinessClient
} from '@/lib/campaign-intent-client';
import { trackJourneyEvent } from '@/lib/journey-client';

interface CampaignDecisionCanvasProps {
  onNavigateToExperiment?: (experimentId: string) => void;
}

const AREA_META: Record<
  CampaignCanvasArea,
  { step: number; title: string; question: string; blurb: string }
> = {
  CAMPAIGN_INTENT: {
    step: 1,
    title: 'Campaign Intent',
    question: 'What are we considering?',
    blurb: 'Frame the decision without assuming promotion is the answer.'
  },
  BASELINE_OBJECTIVE: {
    step: 2,
    title: 'Baseline & Objective',
    question: 'What outcome matters?',
    blurb: 'Capture the objective and soft constraints — not a counterfactual forecast.'
  },
  AUDIENCE_MARKET: {
    step: 3,
    title: 'Audience & Market',
    question: 'Where and when?',
    blurb: 'Scope region, audience, and timing mode. Date discovery stays open.'
  },
  DECISION_CONTEXT: {
    step: 4,
    title: 'Decision Context',
    question: 'What context should we keep in view?',
    blurb: 'Optional notes only — later intelligence decides what is material.'
  }
};

const FUTURE_LAYERS = [
  { id: 'CDI-05+', label: 'Timeline, Frontier, Half-Life & Learning' }
];

export default function CampaignDecisionCanvas({
  onNavigateToExperiment
}: CampaignDecisionCanvasProps = {}) {
  const [intent, setIntent] = useState<CampaignIntent | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<any | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [opportunity, setOpportunity] = useState<any | null>(null);
  const [discovering, setDiscovering] = useState(false);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [assessing, setAssessing] = useState(false);
  const [readinessExpanded, setReadinessExpanded] = useState(false);

  useEffect(() => {
    trackJourneyEvent({
      event_type: 'EXPERIMENT_OPENED',
      source: 'campaign_decision_canvas',
      page: 'campaign-decision',
      experiment_id: 'EXP-CDI-01',
      metadata: { package: 'CDI-01' }
    });
    fetchCurrentCampaignIntent().then(async data => {
      if (data) {
        setIntent(data);
        if (data.status === 'REGISTERED') {
          const evalResult = await evaluateCampaignDecisionClient({
            tenant_id: data.tenant_id,
            session_id: data.session_id,
            campaign_intent_id: data.campaign_intent_id
          });
          if (evalResult) setEvaluation(evalResult);
          const opp = await discoverCampaignOpportunityClient({
            tenant_id: data.tenant_id,
            session_id: data.session_id,
            campaign_intent_id: data.campaign_intent_id
          });
          if (opp) setOpportunity(opp);
        }
      }
    });
  }, []);

  if (!intent) {
    return (
      <div className="page-content animate-fade" style={{ maxWidth: 920, margin: '0 auto', padding: '48px 24px', color: 'var(--text-muted)' }}>
        Loading Campaign Decision Canvas…
      </div>
    );
  }

  const progress = deriveCanvasProgress(intent);
  const active = intent.canvas_progress.active_area;
  const isRegistered = intent.status === 'REGISTERED';

  const updateIntent = (next: CampaignIntent) => {
    const withProgress = { ...next, canvas_progress: deriveCanvasProgress(next) };
    withProgress.canvas_progress.active_area = next.canvas_progress.active_area;
    setIntent(withProgress);
  };

  const setActiveArea = (area: CampaignCanvasArea) => {
    if (isRegistered) return;
    updateIntent({
      ...intent,
      canvas_progress: { ...intent.canvas_progress, active_area: area }
    });
  };

  const patchCore = (patch: Partial<CampaignIntentCore>) => {
    updateIntent({
      ...intent,
      campaign_intent: { ...intent.campaign_intent, ...patch }
    });
  };

  const patchBaseline = (patch: Partial<BaselineObjective>) => {
    updateIntent({
      ...intent,
      baseline_objective: { ...intent.baseline_objective, ...patch }
    });
  };

  const patchAudience = (patch: Partial<AudienceMarket>) => {
    updateIntent({
      ...intent,
      audience_market: { ...intent.audience_market, ...patch }
    });
  };

  const patchContext = (patch: Partial<DecisionContextArea>) => {
    updateIntent({
      ...intent,
      decision_context: { ...intent.decision_context, ...patch }
    });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const saved = await saveCampaignIntentDraftClient(intent);
    setSaving(false);
    if (!saved) {
      setError('Could not save draft. Check required framing fields.');
      return;
    }
    setIntent(saved);
    setMessage('Draft saved. Progressive canvas state preserved for this session.');
  };

  const handleRegister = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    const result = await registerCampaignIntentClient(intent);
    setSaving(false);
    if (!result.intent) {
      setError(result.error || 'Registration blocked until all four areas are complete.');
      return;
    }
    setIntent(result.intent);
    setMessage(
      `Campaign Intent registered (decision state v${result.decision_state_version ?? '—'}). Downstream CDI packages can now consume this contract.`
    );
    // Auto-run CDI-02 evaluation after registration
    setEvaluating(true);
    const evalResult = await evaluateCampaignDecisionClient({
      tenant_id: result.intent.tenant_id,
      session_id: result.intent.session_id,
      campaign_intent_id: result.intent.campaign_intent_id
    });
    setEvaluating(false);
    if (evalResult) setEvaluation(evalResult);

    setDiscovering(true);
    const opp = await discoverCampaignOpportunityClient({
      tenant_id: result.intent.tenant_id,
      session_id: result.intent.session_id,
      campaign_intent_id: result.intent.campaign_intent_id
    });
    setDiscovering(false);
    if (opp) {
      setOpportunity(opp);
      // Re-run CDI-02 with resolved temporal uplift when FIND_BEST_WINDOW
      if (
        result.intent.audience_market.timing_mode === 'FIND_BEST_WINDOW' &&
        opp.opportunity_windows?.resolved_temporal_uplift_pp != null
      ) {
        setEvaluating(true);
        const resolvedEval = await evaluateCampaignDecisionClient({
          tenant_id: result.intent.tenant_id,
          session_id: result.intent.session_id,
          campaign_intent_id: result.intent.campaign_intent_id,
          resolved_temporal_uplift_pp: opp.opportunity_windows.resolved_temporal_uplift_pp,
          opportunity_window_id: opp.opportunity_windows.recommended_window_id
        });
        setEvaluating(false);
        if (resolvedEval) setEvaluation(resolvedEval);
      }
    }
  };

  const handleEvaluate = async () => {
    setEvaluating(true);
    setError(null);
    // Only FIND_BEST_WINDOW defers its timing to CDI-03. KNOWN_DATES keeps the
    // closed CDI-02 stated-dates semantics — both evaluate paths must agree.
    const windowResolvable = intent.audience_market.timing_mode === 'FIND_BEST_WINDOW';
    const resolvedPp = windowResolvable
      ? opportunity?.opportunity_windows?.resolved_temporal_uplift_pp
      : undefined;
    const windowId = opportunity?.opportunity_windows?.recommended_window_id;
    const evalResult = await evaluateCampaignDecisionClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id,
      ...(typeof resolvedPp === 'number'
        ? { resolved_temporal_uplift_pp: resolvedPp, opportunity_window_id: windowId }
        : {})
    });
    setEvaluating(false);
    if (!evalResult) {
      setError('CDI-02 evaluation failed.');
      return;
    }
    setEvaluation(evalResult);
  };

  const handleDiscoverOpportunity = async () => {
    setDiscovering(true);
    setError(null);
    const opp = await discoverCampaignOpportunityClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id
    });
    setDiscovering(false);
    if (!opp) {
      setError('CDI-03 opportunity discovery failed.');
      return;
    }
    setOpportunity(opp);
  };

  const handleAssessReadiness = async () => {
    setAssessing(true);
    setError(null);
    const result = await evaluateCampaignReadinessClient({
      tenant_id: intent.tenant_id,
      session_id: intent.session_id,
      campaign_intent_id: intent.campaign_intent_id
    });
    setAssessing(false);
    if (!result) {
      setError('CDI-04 readiness assessment failed.');
      return;
    }
    setReadiness(result);
  };

  const advance = () => {
    const idx = CAMPAIGN_CANVAS_AREA_ORDER.indexOf(active);
    if (idx < CAMPAIGN_CANVAS_AREA_ORDER.length - 1) {
      setActiveArea(CAMPAIGN_CANVAS_AREA_ORDER[idx + 1]);
    }
  };

  const fieldStyle: CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: '#FFFFFF',
    fontSize: '0.875rem',
    color: 'var(--text-primary)'
  };

  const labelStyle: CSSProperties = {
    display: 'block',
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    marginBottom: 6
  };

  return (
    <div className="page-content animate-fade" style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 64 }}>
      {/* Hero framing — curiosity first, not a control dashboard */}
      <header style={{ marginBottom: 28 }}>
        <div style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--g10x-orange)', marginBottom: 8 }}>
          EXP-CDI-01 · Campaign Decision Intelligence
        </div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 650, color: 'var(--text-primary)', margin: '0 0 10px', lineHeight: 1.25 }}>
          What if promotional decisions first asked whether to intervene at all?
        </h1>
        <p style={{ margin: 0, fontSize: '0.9375rem', color: 'var(--text-secondary)', maxWidth: 720, lineHeight: 1.55 }}>
          This canvas establishes intent and constraints. Promotion is one possible lever — alongside non-promotion interventions and doing nothing. Prediction, readiness, and trade-offs arrive in later packages.
        </p>
        {intent.synthetic_demo && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: 'var(--text-muted)', background: '#F8FAFC', border: '1px solid var(--border)', borderRadius: 999, padding: '4px 10px' }}>
            <Sparkles size={12} /> Synthetic demo intent · schema {intent.schema_version}
          </div>
        )}
      </header>

      {/* Progressive area rail */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {CAMPAIGN_CANVAS_AREA_ORDER.map(area => {
          const done = progress.completed_areas.includes(area);
          const selected = active === area;
          return (
            <button
              key={area}
              type="button"
              onClick={() => setActiveArea(area)}
              disabled={isRegistered}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 12px',
                borderRadius: 8,
                border: selected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                background: selected ? 'var(--curiosity-light)' : '#FFFFFF',
                color: selected ? 'var(--g10x-orange)' : 'var(--text-secondary)',
                cursor: isRegistered ? 'default' : 'pointer',
                fontSize: '0.8125rem',
                fontWeight: 550
              }}
            >
              {done ? <CheckCircle2 size={14} color="var(--success, #059669)" /> : <span style={{ opacity: 0.5 }}>{AREA_META[area].step}</span>}
              {AREA_META[area].title}
            </button>
          );
        })}
      </div>

      {/* Active area panel */}
      <section
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: '22px 24px',
          marginBottom: 20
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Area {AREA_META[active].step} of 4
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.25rem', color: 'var(--text-primary)' }}>{AREA_META[active].question}</h2>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{AREA_META[active].blurb}</p>
          </div>
          <Layers size={18} color="var(--text-muted)" />
        </div>

        {active === 'CAMPAIGN_INTENT' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Objective type</label>
              <select
                style={fieldStyle}
                disabled={isRegistered}
                value={intent.campaign_intent.objective_type}
                onChange={e => patchCore({ objective_type: e.target.value as CampaignIntentCore['objective_type'] })}
              >
                <option value="INVENTORY_CLEARANCE">Inventory Clearance</option>
                <option value="REVENUE_ACCELERATION">Revenue Acceleration</option>
                <option value="MARKET_DEFENSE">Market Defense</option>
                <option value="LAUNCH">Launch</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>Intervention posture</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
                {(
                  [
                    ['UNDECIDED', 'Undecided — explore first'],
                    ['CONSIDER_PROMOTION', 'Consider promotion'],
                    ['CONSIDER_NON_PROMOTION', 'Consider non-promotion'],
                    ['CONSIDER_DO_NOTHING', 'Consider doing nothing']
                  ] as const
                ).map(([value, label]) => {
                  const selected = intent.campaign_intent.intervention_posture === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isRegistered}
                      onClick={() => patchCore({ intervention_posture: value })}
                      style={{
                        textAlign: 'left',
                        padding: '12px 14px',
                        borderRadius: 8,
                        border: selected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                        background: selected ? 'var(--curiosity-light)' : '#F8FAFC',
                        color: 'var(--text-primary)',
                        cursor: isRegistered ? 'default' : 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: selected ? 600 : 500
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={labelStyle}>Framing question</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 72, resize: 'vertical' }}
                disabled={isRegistered}
                value={intent.campaign_intent.framing_question}
                onChange={e => patchCore({ framing_question: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.campaign_intent.category}
                  onChange={e => patchCore({ category: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>SKU scope (comma-separated)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.campaign_intent.sku_scope.join(', ')}
                  onChange={e =>
                    patchCore({
                      sku_scope: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })
                  }
                />
              </div>
            </div>

            {intent.campaign_intent.intervention_posture === 'CONSIDER_PROMOTION' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 12, background: '#F8FAFC', borderRadius: 8, border: '1px dashed var(--border)' }}>
                <div>
                  <label style={labelStyle}>Provisional mechanic (optional)</label>
                  <input
                    style={fieldStyle}
                    disabled={isRegistered}
                    placeholder="e.g. 20_percent_off"
                    value={intent.campaign_intent.provisional_mechanic || ''}
                    onChange={e => patchCore({ provisional_mechanic: e.target.value || undefined })}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Provisional discount depth (optional)</label>
                  <input
                    type="number"
                    style={fieldStyle}
                    disabled={isRegistered}
                    value={intent.campaign_intent.provisional_discount_depth ?? ''}
                    onChange={e =>
                      patchCore({
                        provisional_discount_depth: e.target.value === '' ? undefined : Number(e.target.value)
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {active === 'BASELINE_OBJECTIVE' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Primary metric</label>
                <select
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.primary_metric}
                  onChange={e => patchBaseline({ primary_metric: e.target.value as BaselineObjective['primary_metric'] })}
                >
                  <option value="VOLUME">Volume</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="CONTRIBUTION">Contribution</option>
                  <option value="WASTE_REDUCTION">Waste Reduction</option>
                  <option value="AVAILABILITY">Availability</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Target direction</label>
                <select
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.target_direction}
                  onChange={e => patchBaseline({ target_direction: e.target.value as BaselineObjective['target_direction'] })}
                >
                  <option value="INCREASE">Increase</option>
                  <option value="DECREASE">Decrease</option>
                  <option value="PROTECT">Protect</option>
                  <option value="CLEAR">Clear</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Target value (optional)</label>
                <input
                  type="number"
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.target_value ?? ''}
                  onChange={e =>
                    patchBaseline({
                      target_value: e.target.value === '' ? undefined : Number(e.target.value)
                    })
                  }
                />
              </div>
              <div>
                <label style={labelStyle}>Unit (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.baseline_objective.target_unit || ''}
                  onChange={e => patchBaseline({ target_unit: e.target.value || undefined })}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Capacity / constraint note (optional)</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 64 }}
                disabled={isRegistered}
                value={intent.baseline_objective.capacity_cap_note || ''}
                onChange={e => patchBaseline({ capacity_cap_note: e.target.value || undefined })}
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Soft notes only — counterfactual baselines and readiness scoring belong to CDI-02 / CDI-04.
              </p>
            </div>
          </div>
        )}

        {active === 'AUDIENCE_MARKET' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Region</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.audience_market.region}
                  onChange={e => patchAudience({ region: e.target.value })}
                />
              </div>
              <div>
                <label style={labelStyle}>Customer segment (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.audience_market.customer_segment || ''}
                  onChange={e => patchAudience({ customer_segment: e.target.value || undefined })}
                />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Channel (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  value={intent.audience_market.channel || ''}
                  onChange={e => patchAudience({ channel: e.target.value || undefined })}
                />
              </div>
              <div>
                <label style={labelStyle}>Store cohort hint (optional)</label>
                <input
                  style={fieldStyle}
                  disabled={isRegistered}
                  placeholder="Not scored here — CDI-03 owns micro-markets"
                  value={intent.audience_market.store_cohort_hint || ''}
                  onChange={e => patchAudience({ store_cohort_hint: e.target.value || undefined })}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Timing mode</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(
                  [
                    ['FIND_BEST_WINDOW', 'Find the best window'],
                    ['KNOWN_DATES', 'I know my dates']
                  ] as const
                ).map(([value, label]) => {
                  const selected = intent.audience_market.timing_mode === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={isRegistered}
                      onClick={() => patchAudience({ timing_mode: value })}
                      style={{
                        flex: 1,
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: selected ? '1px solid var(--g10x-orange)' : '1px solid var(--border)',
                        background: selected ? 'var(--curiosity-light)' : '#F8FAFC',
                        cursor: isRegistered ? 'default' : 'pointer',
                        fontSize: '0.8125rem',
                        fontWeight: selected ? 600 : 500,
                        color: 'var(--text-primary)'
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
            {intent.audience_market.timing_mode === 'KNOWN_DATES' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Planned start</label>
                  <input
                    type="datetime-local"
                    style={fieldStyle}
                    disabled={isRegistered}
                    value={(intent.audience_market.planned_start || '').slice(0, 16)}
                    onChange={e =>
                      patchAudience({
                        planned_start: e.target.value ? new Date(e.target.value).toISOString() : undefined
                      })
                    }
                  />
                </div>
                <div>
                  <label style={labelStyle}>Planned end</label>
                  <input
                    type="datetime-local"
                    style={fieldStyle}
                    disabled={isRegistered}
                    value={(intent.audience_market.planned_end || '').slice(0, 16)}
                    onChange={e =>
                      patchAudience({
                        planned_end: e.target.value ? new Date(e.target.value).toISOString() : undefined
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {active === 'DECISION_CONTEXT' && (
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label style={labelStyle}>Contextual factor notes (optional, free-form)</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 72 }}
                disabled={isRegistered}
                placeholder="e.g. Possible weather warmth; competitor activity rumoured — relevance TBD"
                value={(intent.decision_context.contextual_factor_notes || []).join('\n')}
                onChange={e =>
                  patchContext({
                    contextual_factor_notes: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
              <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
                <HelpCircle size={12} /> Not a mandatory toggle wall — later packages decide material relevance.
              </p>
            </div>
            <div>
              <label style={labelStyle}>Open questions</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 72 }}
                disabled={isRegistered}
                value={(intent.decision_context.open_questions || []).join('\n')}
                onChange={e =>
                  patchContext({
                    open_questions: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>
            <div>
              <label style={labelStyle}>Assumptions</label>
              <textarea
                style={{ ...fieldStyle, minHeight: 64 }}
                disabled={isRegistered}
                value={(intent.decision_context.assumptions || []).join('\n')}
                onChange={e =>
                  patchContext({
                    assumptions: e.target.value
                      .split('\n')
                      .map(s => s.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>
          </div>
        )}

        {!isRegistered && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
            {active !== 'DECISION_CONTEXT' && (
              <button
                type="button"
                onClick={advance}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--g10x-orange)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '0.8125rem',
                  cursor: 'pointer'
                }}
              >
                Continue <ChevronRight size={14} />
              </button>
            )}
          </div>
        )}
      </section>

      {/* Actions */}
      <section
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          marginBottom: 16
        }}
      >
        {!isRegistered && (
          <>
            <button
              type="button"
              disabled={saving}
              onClick={handleSaveDraft}
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                border: '1px solid var(--border)',
                background: '#FFFFFF',
                color: 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: 'pointer'
              }}
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={saving || !progress.ready_to_register}
              onClick={handleRegister}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 16px',
                borderRadius: 8,
                border: 'none',
                background: progress.ready_to_register ? 'var(--g10x-orange)' : '#CBD5E1',
                color: '#FFFFFF',
                fontWeight: 600,
                fontSize: '0.8125rem',
                cursor: progress.ready_to_register ? 'pointer' : 'not-allowed'
              }}
            >
              Register Campaign Intent <ArrowRight size={14} />
            </button>
          </>
        )}
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          {progress.completed_areas.length}/4 areas structurally complete
          {isRegistered ? ` · Registered ${intent.registered_at}` : ''}
        </span>
      </section>

      {message && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.8125rem' }}>
          {message}
        </div>
      )}
      {error && (
        <div style={{ marginBottom: 12, padding: '10px 12px', borderRadius: 8, background: '#FFF1F2', border: '1px solid #FECDD3', color: '#9F1239', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      {/* Layer 2 — CDI-02 Counterfactual & Causal (unlocked after registration) */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 2 · CDI-02
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              What does CogniX predict versus doing nothing?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Current baseline → expected without intervention → predicted with intervention. Causal drivers reconcile to the predicted uplift. Placeholder mechanics are never attributed.
            </p>
          </div>
          <button
            type="button"
            disabled={evaluating || !isRegistered}
            onClick={handleEvaluate}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {evaluating ? 'Evaluating…' : isRegistered ? 'Run evaluation' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock counterfactual & causal evaluation.
          </div>
        )}

        {evaluation && (
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
              {[
                ['Current baseline', evaluation.counterfactual.current_baseline],
                ['Without intervention', evaluation.counterfactual.expected_without_intervention],
                ['With intervention', evaluation.counterfactual.predicted_with_intervention]
              ].map(([label, point]: any) => (
                <div key={label} style={{ padding: 12, borderRadius: 8, background: '#F8FAFC', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 650, color: 'var(--text-primary)' }}>{point.volume_index_pct.toFixed(1)}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 4 }}>
                    {point.volume_units.toLocaleString()} units · £{point.contribution_gbp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: evaluation.counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing ? '#F8FAFC' : 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Campaign Delta (Do Nothing vs Intervention)
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {evaluation.counterfactual.campaign_delta.volume_delta_units >= 0 ? '+' : ''}
                {evaluation.counterfactual.campaign_delta.volume_delta_units.toLocaleString()} units
                {' · '}
                {evaluation.counterfactual.campaign_delta.contribution_delta_gbp >= 0 ? '+' : ''}
                £{evaluation.counterfactual.campaign_delta.contribution_delta_gbp.toLocaleString()}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {evaluation.counterfactual.campaign_delta.intervention_indistinguishable_from_do_nothing
                  ? 'Predicted path matches do-nothing — no intervention is attributed under this posture. Demand still moves, but not because of us.'
                  : `Attributable to the intervention: ${evaluation.counterfactual.campaign_delta.attributable_uplift_pp.toFixed(2)} pp. Drift and external signals are excluded — they occur either way.`}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Causal demand contributions ({evaluation.causal.total_predicted_uplift_pp.toFixed(2)} pp vs current baseline
                {' · '}
                {evaluation.causal.ambient_uplift_pp.toFixed(2)} pp happens anyway
                {' · '}
                {evaluation.causal.intervention_uplift_pp.toFixed(2)} pp from intervening)
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {evaluation.causal.drivers.filter((d: any) => d.attributed || d.contribution_pp !== 0 || d.driver_id === 'mechanic_response').map((d: any) => (
                  <div key={d.driver_id} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: '0.8125rem', padding: '6px 0', borderBottom: '1px solid #F1F5F9' }}>
                    <div>
                      <span style={{ fontWeight: 600, color: d.attributed ? 'var(--text-primary)' : 'var(--text-muted)' }}>{d.label}</span>
                      <span style={{ marginLeft: 6, fontSize: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: d.driver_class === 'ambient' ? 'var(--text-muted)' : 'var(--g10x-orange)' }}>
                        {d.driver_class === 'ambient' ? 'happens anyway' : 'from intervening'}
                      </span>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>{d.rationale}</div>
                    </div>
                    <span style={{ fontWeight: 650, color: d.contribution_pp < 0 ? '#E11D48' : 'var(--text-primary)' }}>
                      {d.contribution_pp >= 0 ? '+' : ''}{d.contribution_pp.toFixed(2)} pp
                    </span>
                  </div>
                ))}
              </div>
              {evaluation.causal.placeholder_fields_excluded?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Placeholder fields excluded from causal attribution: {evaluation.causal.placeholder_fields_excluded.join(', ')}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Layer 3 — CDI-03 Opportunity Window & Micro-Market */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 3 · CDI-03
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              When and where should we intervene?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Deterministic opportunity windows and explainable store/cohort rankings over Enterprise World store data. Synthetic scoring factors are labelled as demo.
            </p>
          </div>
          <button
            type="button"
            disabled={discovering || !isRegistered}
            onClick={handleDiscoverOpportunity}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {discovering ? 'Discovering…' : isRegistered ? 'Discover windows & markets' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock opportunity window and micro-market discovery.
          </div>
        )}

        {opportunity && (
          <div style={{ display: 'grid', gap: 14, marginTop: 8 }}>
            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Recommended window ({opportunity.opportunity_windows.timing_mode})
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {opportunity.opportunity_windows.recommended_window.start_date}
                {' → '}
                {opportunity.opportunity_windows.recommended_window.end_date}
                {' · '}
                yield {opportunity.opportunity_windows.recommended_window.yield_score.toFixed(1)}
                {' · '}
                {opportunity.opportunity_windows.recommended_window.tier}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Temporal uplift for CDI-02: {opportunity.opportunity_windows.resolved_temporal_uplift_pp.toFixed(2)} pp
                {opportunity.opportunity_windows.recommended_window.inclusion_reasons?.[0]
                  ? ` — ${opportunity.opportunity_windows.recommended_window.inclusion_reasons[0]}`
                  : ''}
              </div>
              {opportunity.opportunity_windows.discovery_anchor && (
                <div
                  style={{
                    marginTop: 8,
                    paddingTop: 8,
                    borderTop: '1px dashed var(--border)',
                    fontSize: '0.6875rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    gap: 6,
                    alignItems: 'flex-start'
                  }}
                >
                  <Lock size={11} style={{ marginTop: 2, flexShrink: 0 }} />
                  <span>
                    Seeded demo calendar — candidate windows are generated from a fixed anchor of{' '}
                    <strong>{opportunity.opportunity_windows.discovery_anchor.anchor_date}</strong> for
                    reproducibility. These dates are a planning assumption, not live or current calendar
                    evidence, and do not track today&apos;s date.
                  </span>
                </div>
              )}
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Candidate windows (top 4)
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {opportunity.opportunity_windows.candidates.slice(0, 4).map((w: any) => (
                  <div
                    key={w.window_id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: w.window_id === opportunity.opportunity_windows.recommended_window_id ? '#FFF7ED' : '#F8FAFC',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                      {w.start_date} → {w.end_date}
                      {w.is_stated_dates ? ' (stated)' : ''}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {w.yield_score.toFixed(1)} · {w.tier}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                Micro-market stores ({opportunity.micro_markets.stores_included} included of {opportunity.micro_markets.stores_evaluated})
              </div>
              <div style={{ display: 'grid', gap: 6 }}>
                {opportunity.micro_markets.stores.filter((s: any) => s.included).slice(0, 6).map((s: any) => (
                  <div
                    key={s.store_id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '72px 1fr auto',
                      gap: 8,
                      padding: '8px 10px',
                      borderRadius: 6,
                      background: '#F8FAFC',
                      border: '1px solid var(--border)',
                      fontSize: '0.75rem'
                    }}
                  >
                    <span style={{ fontWeight: 650, color: 'var(--g10x-orange)' }}>{s.tier}</span>
                    <span style={{ color: 'var(--text-primary)' }}>
                      {s.store_name}
                      <span style={{ color: 'var(--text-muted)' }}> · {s.region} · {s.format}</span>
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>{s.opportunity_score.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              {opportunity.micro_markets.cohorts?.length > 0 && (
                <div style={{ marginTop: 10, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Top cohort: {opportunity.micro_markets.cohorts[0].label} (avg {opportunity.micro_markets.cohorts[0].average_score.toFixed(1)})
                </div>
              )}
              <div style={{ marginTop: 8, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                Scores combine stated campaign scope (region, cohort hint) with synthetic proxies for
                catchment density, staffing capacity and availability. Proxy factors are modelled demo
                estimates, not observed store measurements.
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Layer 4 — CDI-04 Decision Readiness */}
      <section
        style={{
          marginTop: 8,
          marginBottom: 16,
          padding: '18px 20px',
          borderRadius: 12,
          border: '1px solid var(--border)',
          background: '#FFFFFF'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--g10x-orange)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
              Layer 4 · CDI-04
            </div>
            <h2 style={{ margin: '0 0 6px', fontSize: '1.125rem', color: 'var(--text-primary)' }}>
              Are we ready to proceed?
            </h2>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: 640 }}>
              Six independent dimensions; aggregation is a floor, never a score. Thresholds are synthetic demonstration policy and never fire vetoes.
            </p>
          </div>
          <button
            type="button"
            disabled={assessing || !isRegistered}
            onClick={handleAssessReadiness}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: isRegistered ? 'var(--curiosity-light)' : '#F1F5F9',
              color: isRegistered ? 'var(--g10x-orange)' : 'var(--text-muted)',
              fontWeight: 600,
              fontSize: '0.75rem',
              cursor: isRegistered ? 'pointer' : 'not-allowed',
              whiteSpace: 'nowrap'
            }}
          >
            {assessing ? 'Assessing…' : isRegistered ? 'Assess readiness' : 'Register intent first'}
          </button>
        </div>

        {!isRegistered && (
          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={13} /> Register Campaign Intent to unlock readiness assessment.
          </div>
        )}

        {readiness?.readiness && (
          <div style={{ display: 'grid', gap: 12, marginTop: 8 }}>
            <div style={{ padding: 14, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--curiosity-light)' }}>
              <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                Readiness · {readiness.readiness.state}
              </div>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {readiness.readiness.headline}
              </div>
              <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Confidence {readiness.readiness.confidence.band}
                {typeof readiness.readiness.confidence.confidence_index === 'number'
                  ? ` · index ${readiness.readiness.confidence.confidence_index}`
                  : ''}
                {' · '}
                strength floor {readiness.readiness.confidence.evidence_strength_floor}
                {readiness.readiness.state_caps_applied?.length
                  ? ` · caps ${readiness.readiness.state_caps_applied.join(', ')}`
                  : ''}
              </div>
              {readiness.readiness.commercial_tolerance && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Commercial class {readiness.readiness.commercial_tolerance.objective_class}
                  {' · '}
                  Δ£{readiness.readiness.commercial_tolerance.contribution_delta_gbp}
                  {readiness.readiness.commercial_tolerance.tolerance_declared
                    ? ` · tolerance headroom £${readiness.readiness.commercial_tolerance.headroom_gbp}`
                    : ''}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setReadinessExpanded(v => !v)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'transparent',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--g10x-orange)'
              }}
            >
              <ChevronRight size={14} style={{ transform: readinessExpanded ? 'rotate(90deg)' : undefined }} />
              {readinessExpanded ? 'Hide' : 'Show'} six-dimension evidence
            </button>

            {readinessExpanded && (
              <div style={{ display: 'grid', gap: 10 }}>
                {readiness.readiness.dimensions.map((d: any) => (
                  <div key={d.dimension} style={{ padding: 12, borderRadius: 8, border: '1px solid var(--border)', background: '#F8FAFC' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 650, color: 'var(--text-primary)' }}>{d.dimension}</span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {d.state} · {d.evidence_strength_floor}
                      </span>
                    </div>
                    {d.not_evaluated_reason && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>{d.not_evaluated_reason}</div>
                    )}
                    {d.findings.map((f: any) => (
                      <div key={f.finding_id} style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 4 }}>
                        <strong>{f.rule_id}</strong> [{f.evidence.map((e: any) => e.strength).join(', ')}] {f.statement}
                        {/* Seeded/proxy disclosures travel verbatim with the finding they justify (design gate §8.4). */}
                        {f.evidence
                          .filter((e: any) => e.disclosure)
                          .map((e: any, i: number) => (
                            <div
                              key={`${f.finding_id}_disc_${i}`}
                              style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}
                            >
                              {e.field_path} ({e.strength}): {e.disclosure}
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                ))}
                {readiness.readiness.vetoes?.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: '#9F1239' }}>
                    Vetoes: {readiness.readiness.vetoes.map((v: any) => `${v.veto_id} (${v.veto_basis})`).join('; ')}
                  </div>
                )}
                {readiness.readiness.conditions?.length > 0 && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    Conditions: {readiness.readiness.conditions.map((c: any) => c.statement).join(' · ')}
                  </div>
                )}
                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                  Threshold policy: {readiness.readiness.threshold_policy.provenance} (uncalibrated lab defaults).
                  Resilience evidence is read-only WP10-C DecisionDerivedImpacts — no ripple engine.
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* Explicit non-implementation of CDI-05+ — locked teaser only */}
      <section
        style={{
          marginTop: 8,
          padding: '16px 18px',
          borderRadius: 12,
          border: '1px dashed var(--border)',
          background: '#F8FAFC'
        }}
      >
        <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
          Next decision layers (not in CDI-04)
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {FUTURE_LAYERS.map(layer => (
            <div
              key={layer.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: '0.8125rem',
                color: 'var(--text-secondary)'
              }}
            >
              <Lock size={13} color="var(--text-muted)" />
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', width: 64 }}>{layer.id}</span>
              {layer.label}
            </div>
          ))}
        </div>
        {onNavigateToExperiment && (
          <button
            type="button"
            onClick={() => onNavigateToExperiment('EXP-OPPORTUNITY-04')}
            style={{
              marginTop: 14,
              background: 'transparent',
              border: 'none',
              color: 'var(--g10x-orange)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              padding: 0
            }}
          >
            Explore related Opportunity Intelligence →
          </button>
        )}
      </section>
    </div>
  );
}
