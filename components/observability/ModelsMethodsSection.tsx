'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Calculator,
  LineChart,
  Sparkles,
  UserCheck,
  FileCode,
  Clock,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import {
  type MethodsRegister,
  type MethodRegisterEntry,
  type MethodMechanism
} from '@/packages/contracts/src/living-evidence-contracts';
import { getMethodsRegister } from '@/lib/observability-client';

interface ModelsMethodsSectionProps {
  scenarioId: string;
}

export default function ModelsMethodsSection({ scenarioId }: ModelsMethodsSectionProps) {
  const [register, setRegister] = useState<MethodsRegister | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mechanismFilter, setMechanismFilter] = useState<string>('ALL');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setMechanismFilter('ALL');
    getMethodsRegister(scenarioId)
      .then(res => {
        if (!mounted) return;
        setRegister(res);
        setLoadError(null);
      })
      .catch((err: any) => {
        /* A register that could not be read is SAID to be unreadable, never shown as an empty one. */
        if (!mounted) return;
        setRegister(null);
        setLoadError(err?.message || 'The Models & Methods register could not be read for this scenario.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => { mounted = false; };
  }, [scenarioId]);

  const getMechanismDetails = (mech: MethodMechanism) => {
    switch (mech) {
      case 'rule':
      case 'measured':
        return {
          label: 'Calculated',
          description: 'Deterministic calculation & declared business constraints',
          badgeClass: 'og-mech--calculated',
          Icon: Calculator
        };
      case 'statistical':
        return {
          label: 'Fitted',
          description: 'Statistical estimation & time-series machine learning',
          badgeClass: 'og-mech--fitted',
          Icon: LineChart
        };
      case 'llm':
        return {
          label: 'Drafted',
          description: 'Governed Google GenAI drafting (strictly non-authoritative)',
          badgeClass: 'og-mech--drafted',
          Icon: Sparkles
        };
      case 'manual':
        return {
          label: 'Human',
          description: 'Human domain judgement & category director authorization',
          badgeClass: 'og-mech--human',
          Icon: UserCheck
        };
      default:
        return {
          label: mech,
          description: 'Governed mechanism',
          badgeClass: 'og-mech--neutral',
          Icon: Cpu
        };
    }
  };

  const entries = register?.entries || [];
  const filteredEntries = entries.filter(e => {
    if (mechanismFilter === 'ALL') return true;
    if (mechanismFilter === 'CALCULATED') return e.mechanism === 'rule' || e.mechanism === 'measured';
    if (mechanismFilter === 'FITTED') return e.mechanism === 'statistical';
    if (mechanismFilter === 'DRAFTED') return e.mechanism === 'llm';
    if (mechanismFilter === 'HUMAN') return e.mechanism === 'manual';
    return true;
  });

  // Group counts
  const calculatedCount = entries.filter(e => e.mechanism === 'rule' || e.mechanism === 'measured').length;
  const fittedCount = entries.filter(e => e.mechanism === 'statistical').length;
  const draftedCount = entries.filter(e => e.mechanism === 'llm').length;
  const humanCount = entries.filter(e => e.mechanism === 'manual').length;

  return (
    <div className="og-models-methods">
      {/* Section Header with Governance Principles */}
      <div className="og-section-lead">
        <h2>Models &amp; Methods Register</h2>
        <p className="og-lead-questions">
          <strong>Key business questions answered:</strong> Which method produced this? Where did statistical ML contribute? Where did Google GenAI? Where is it deterministic calculation, and where is it human judgement?
        </p>
        <p className="og-lead-sub">
          CogniX rejects calling everything "AI". Each published value carries its exact mechanism, purpose, and checkable implementation file. Internal prompts, tokens, temperature, and API keys are strictly excluded from client surfaces under ADR-067.
        </p>
      </div>

      {/* Mechanism Distribution Overview */}
      <div className="og-mechanism-cards">
        <div
          className={`og-mech-summary-card ${mechanismFilter === 'CALCULATED' ? 'og-mech--active' : ''}`}
          onClick={() => setMechanismFilter(mechanismFilter === 'CALCULATED' ? 'ALL' : 'CALCULATED')}
          role="button"
          tabIndex={0}
        >
          <div className="og-mech-card-head">
            <Calculator size={16} />
            <span className="og-mech-card-title">Calculated</span>
            <strong className="og-mech-card-count">{calculatedCount}</strong>
          </div>
          <p className="og-mech-card-text">Deterministic arithmetic, elasticity curves, and contractual rules.</p>
        </div>

        <div
          className={`og-mech-summary-card ${mechanismFilter === 'FITTED' ? 'og-mech--active' : ''}`}
          onClick={() => setMechanismFilter(mechanismFilter === 'FITTED' ? 'ALL' : 'FITTED')}
          role="button"
          tabIndex={0}
        >
          <div className="og-mech-card-head">
            <LineChart size={16} />
            <span className="og-mech-card-title">Fitted</span>
            <strong className="og-mech-card-count">{fittedCount}</strong>
          </div>
          <p className="og-mech-card-text">Statistical forecasting models fitted against verified historical data.</p>
        </div>

        <div
          className={`og-mech-summary-card ${mechanismFilter === 'DRAFTED' ? 'og-mech--active' : ''}`}
          onClick={() => setMechanismFilter(mechanismFilter === 'DRAFTED' ? 'ALL' : 'DRAFTED')}
          role="button"
          tabIndex={0}
        >
          <div className="og-mech-card-head">
            <Sparkles size={16} />
            <span className="og-mech-card-title">Drafted</span>
            <strong className="og-mech-card-count">{draftedCount}</strong>
          </div>
          <p className="og-mech-card-text">
            {draftedCount > 0
              ? 'Governed Google GenAI drafts, response-validated and never authoritative.'
              : 'Google GenAI contributed nothing to this scenario\u2019s published values. It is '
                + 'declared below rather than listed as active — a mechanism that did not run is '
                + 'not reported as one that did.'}
          </p>
        </div>

        <div
          className={`og-mech-summary-card ${mechanismFilter === 'HUMAN' ? 'og-mech--active' : ''}`}
          onClick={() => setMechanismFilter(mechanismFilter === 'HUMAN' ? 'ALL' : 'HUMAN')}
          role="button"
          tabIndex={0}
        >
          <div className="og-mech-card-head">
            <UserCheck size={16} />
            <span className="og-mech-card-title">Human</span>
            <strong className="og-mech-card-count">{humanCount}</strong>
          </div>
          <p className="og-mech-card-text">Merchant override, category trade-offs, and final executive commitment.</p>
        </div>
      </div>

      {/* Filter reset bar if filtered */}
      {mechanismFilter !== 'ALL' && (
        <div className="og-filter-reset-bar">
          <span>Filtered to <strong>{mechanismFilter}</strong> methods ({filteredEntries.length})</span>
          <button type="button" className="og-btn-subtle" onClick={() => setMechanismFilter('ALL')}>
            Show All ({entries.length})
          </button>
        </div>
      )}

      {/* Method Entries List */}
      {loading ? (
        <div className="og-loading-state">
          <p>Reading the register of what genuinely ran for this scenario…</p>
        </div>
      ) : loadError ? (
        <p className="og-refresh-error">
          <ShieldAlert size={14} />
          <span>{loadError}</span>
        </p>
      ) : filteredEntries.length === 0 ? (
        <p className="og-empty">No method entries matching filter.</p>
      ) : (
        <div className="og-method-cards-list">
          {filteredEntries.map(method => {
            const mechInfo = getMechanismDetails(method.mechanism);
            const MechIcon = mechInfo.Icon;

            return (
              <article key={method.method_id} className="og-method-card" id={`method-${method.method_id}`}>
                <div className="og-method-header">
                  <div className="og-method-title-group">
                    <div className="og-method-title-row">
                      <span className={`og-mech-badge ${mechInfo.badgeClass}`}>
                        <MechIcon size={12} />
                        <span>{mechInfo.label}</span>
                      </span>
                      <h3 className="og-method-name">{method.display_name}</h3>
                    </div>
                    <p className="og-method-purpose">{method.purpose}</p>
                  </div>

                  <div className="og-method-impl">
                    <FileCode size={13} />
                    <code className="og-impl-ref">{method.implementation_ref}</code>
                  </div>
                </div>

                <div className="og-method-io-grid">
                  <div className="og-io-block">
                    <span className="og-io-label">Inputs:</span>
                    <ul className="og-io-list">
                      {method.inputs.map((inp, i) => (
                        <li key={i}>{inp}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="og-io-block">
                    <span className="og-io-label">Output:</span>
                    <p className="og-output-desc">{method.output}</p>
                  </div>
                </div>

                <div className="og-method-meta-row">
                  <div className="og-meta-col">
                    <span className="og-meta-label">Scenario Clock Last Run:</span>
                    <span className="og-meta-val">
                      {method.last_run_scenario_iso ? (
                        <>
                          <Clock size={12} />
                          <strong>{method.last_run_scenario_iso.slice(0, 10)}</strong>
                        </>
                      ) : (
                        <em className="og-unmeasured">Unmeasured — has not run for this scenario</em>
                      )}
                    </span>
                  </div>

                  <div className="og-meta-col">
                    <span className="og-meta-label">Measured Error / Backtest:</span>
                    <span className="og-meta-val">
                      {method.measured_error ? (
                        <strong className="og-measured-metric">
                          {method.measured_error.metric}: {method.measured_error.value}{method.measured_error.unit}
                        </strong>
                      ) : (
                        <em className="og-unmeasured">
                          Unmeasured — no backtest is published for this method
                        </em>
                      )}
                    </span>
                  </div>

                  <div className="og-meta-col">
                    <span className="og-meta-label">Applies to:</span>
                    <span className="og-meta-val">
                      {/*
                        The contract is explicit that an empty list means the method applies to NO
                        scenario and says so. Reading it as "global" would invert the statement.
                      */}
                      {method.applies_to_scenario_ids.length === 0 ? (
                        <em className="og-unmeasured">No scenario — declared, not inferred</em>
                      ) : method.applies_to_scenario_ids.includes(scenarioId) ? (
                        <strong>
                          This scenario
                          {method.applies_to_scenario_ids.length > 1
                            ? ` and ${method.applies_to_scenario_ids.length - 1} other`
                              + `${method.applies_to_scenario_ids.length === 2 ? '' : 's'}`
                            : ' only'}
                        </strong>
                      ) : (
                        `${method.applies_to_scenario_ids.length} other `
                        + `scenario${method.applies_to_scenario_ids.length === 1 ? '' : 's'}`
                      )}
                    </span>
                  </div>
                </div>

                {/* Limitations */}
                {method.limitations && method.limitations.length > 0 && (
                  <div className="og-method-limitations">
                    <span className="og-limitations-label">
                      <AlertTriangle size={12} />
                      <span>Stated Limitations:</span>
                    </span>
                    <ul className="og-limitations-list">
                      {method.limitations.map((lim, lIdx) => (
                        <li key={lIdx}>{lim}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {/* Declared Undescribed Methods */}
      {register?.undescribed && register.undescribed.length > 0 && (
        <div className="og-undescribed-block">
          <h4>Declared Undescribed Methods</h4>
          <p className="og-undescribed-lead">
            Methods known to exist in the estate but not applicable to or described for the active scenario, declared rather than omitted:
          </p>
          <ul>
            {register.undescribed.map((u, idx) => (
              <li key={idx}>
                <code>{u.method_id}</code>: {u.reason}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
