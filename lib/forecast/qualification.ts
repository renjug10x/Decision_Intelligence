/**
 * CTW-03 — dataset qualification.
 *
 * Asked before a model runs, never after. The future data-ingestion workflow is meant to be able to
 * ask *"is this dataset suitable for this model?"* rather than only *"is this CSV valid?"*, which is
 * why the checks are per-model and published on the declaration rather than hard-coded here.
 */

import {
  DatasetQualification,
  ForecastDataset,
  ForecastModelDeclaration,
  ForecastRefusalReason,
  QualificationCheck
} from '../../packages/contracts/src/forecast-model-model';
import { addUtcDays } from './adapters/adapter';

export function qualifyDataset(
  dataset: ForecastDataset,
  declaration: ForecastModelDeclaration
): DatasetQualification {
  const obs = dataset.observations;
  const checks: QualificationCheck[] = [];
  const remediation: string[] = [];
  let refusal: ForecastRefusalReason | undefined;

  const req = (id: string) => declaration.data_requirements.find(r => r.requirement_id === id);

  // — history —
  const historyReq = declaration.data_requirements.find(r => r.refusal === 'INSUFFICIENT_HISTORY');
  const enough = obs.length >= declaration.minimum_observations;
  if (historyReq) {
    checks.push({
      requirement_id: historyReq.requirement_id,
      statement: historyReq.statement,
      passed: enough,
      detail: `${obs.length} observations supplied, ${declaration.minimum_observations} required.`
    });
    if (!enough) {
      refusal = refusal ?? 'INSUFFICIENT_HISTORY';
      remediation.push(
        `Supply at least ${declaration.minimum_observations} daily observations (${declaration.minimum_observations - obs.length} more).`
      );
    }
  }

  // — regular daily frequency, no gaps, no duplicates —
  const freqReq = declaration.data_requirements.find(r => r.refusal === 'IRREGULAR_FREQUENCY');
  let gaps = 0;
  let duplicates = 0;
  for (let i = 1; i < obs.length; i++) {
    if (obs[i].period === obs[i - 1].period) duplicates++;
    else if (obs[i].period !== addUtcDays(obs[i - 1].period, 1)) gaps++;
  }
  if (freqReq) {
    const regular = gaps === 0 && duplicates === 0;
    checks.push({
      requirement_id: freqReq.requirement_id,
      statement: freqReq.statement,
      passed: regular,
      detail: regular
        ? 'Every period is the calendar day after the one before it.'
        : `${gaps} gap(s) and ${duplicates} duplicate period(s) found.`
    });
    if (!regular) {
      refusal = refusal ?? (duplicates > 0 ? 'DUPLICATE_PERIODS' : 'IRREGULAR_FREQUENCY');
      remediation.push(
        duplicates > 0
          ? 'Remove duplicate periods so each calendar day appears once.'
          : 'Fill or exclude the missing days. A gap is not a zero.'
      );
    }
  }

  // — finite values —
  const finiteReq = declaration.data_requirements.find(r => r.refusal === 'MISSING_VALUES');
  const nonFinite = obs.filter(o => !Number.isFinite(o.value)).length;
  if (finiteReq) {
    checks.push({
      requirement_id: finiteReq.requirement_id,
      statement: finiteReq.statement,
      passed: nonFinite === 0,
      detail: nonFinite === 0 ? 'All values are finite.' : `${nonFinite} non-finite value(s).`
    });
    if (nonFinite > 0) {
      refusal = refusal ?? 'NON_FINITE_VALUES';
      remediation.push('Remove or impute non-finite values before fitting; they are not treated as zero.');
    }
  }

  void req;

  return {
    model_id: declaration.model_id,
    dataset_id: dataset.provenance.dataset_id,
    suitable: checks.every(c => c.passed),
    checks,
    refusal_reason: refusal,
    remediation
  };
}
