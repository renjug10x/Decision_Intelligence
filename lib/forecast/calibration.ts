/**
 * FM-01 — empirical interval calibration.
 *
 * `CTW-03` measured what its intervals actually covered and published the answer: 46% and 63%
 * against a nominal 80%. Both numbers were correct and both were unusable. A planner reading a
 * range that contains the truth half the time is worse off than one reading no range at all,
 * because the range looks like information.
 *
 * The temptation is to relabel — call it a 50% interval and the arithmetic is suddenly honest. That
 * would be honest about the label and silent about the question, which is *how wide does this
 * forecast's range actually have to be*. So this module measures it.
 *
 * ── Method: split conformal prediction with a normalised nonconformity score ─────────────────
 *
 * For every point of every rolling-origin backtest fold — periods the model never saw while fitting
 * — take the nonconformity score
 *
 *     s = |actual − forecast| ÷ (model-implied half-width at that step)
 *
 * and let λ be its empirical (1−α) quantile with the finite-sample correction
 * `⌈(n+1)(1−α)⌉ / n`. Then `λ × (model half-width)` is a range whose realised coverage on held-out
 * evidence is approximately the target.
 *
 * Dividing by the model's own half-width is what keeps the *shape* of the horizon the model's own —
 * an interval that widens with horizon because the model says it should still widens with horizon,
 * and only its overall scale is corrected. A flat additive correction would have flattened exactly
 * the horizon degradation the chart exists to show.
 *
 * ── The number that is allowed to be disappointing ───────────────────────────────────────────
 *
 * λ estimated on all folds and then scored on all folds is in-sample for the calibration step, and
 * will land near target by construction. That number is published, and it is not the answer. The
 * answer is `held_out_coverage`: each fold is scored by a λ estimated from the *other* folds, so no
 * point contributes to the width that judges it. It is allowed to miss, and where it does the
 * surface says so rather than repeating the flattering figure.
 */

import {
  CALIBRATION_BASIS_STATEMENT,
  CALIBRATION_LIMITATIONS,
  CALIBRATION_MIN_FOLDS,
  CALIBRATION_MIN_SAMPLE,
  CALIBRATION_MULTIPLIER_MAX,
  CALIBRATION_MULTIPLIER_MIN,
  IntervalCalibration
} from '../../packages/contracts/src/forecast-model-model';
import { BacktestResidual } from './backtest';

/**
 * The conformal quantile of a sample, with the finite-sample correction.
 *
 * `⌈(n+1)q⌉ / n` rather than the plain empirical quantile: the correction is what makes the
 * guarantee hold for a *finite* calibration set rather than asymptotically. Where the index runs
 * past the sample the quantile is undefined and the caller is told, never silently handed the
 * maximum.
 */
export function conformalQuantile(scores: number[], q: number): number | null {
  const n = scores.length;
  if (n === 0) return null;
  const k = Math.ceil((n + 1) * q);
  if (k > n) return null;
  const sorted = [...scores].sort((a, b) => a - b);
  return sorted[k - 1];
}

function coverageOf(residuals: BacktestResidual[], multiplier: number): number {
  let covered = 0;
  for (const r of residuals) {
    if (Math.abs(r.error) <= multiplier * r.model_half_width) covered++;
  }
  return residuals.length > 0 ? covered / residuals.length : 0;
}

function clampMultiplier(raw: number): number {
  return Math.min(CALIBRATION_MULTIPLIER_MAX, Math.max(CALIBRATION_MULTIPLIER_MIN, raw));
}

/**
 * Calibrate the model-implied interval against held-out backtest residuals.
 *
 * Returns `null` when no residual carries a usable model half-width — a model that publishes no
 * interval has nothing to rescale, and inventing one here would be exactly the fabrication the
 * forecast boundary exists to refuse.
 */
export function calibrateInterval(
  residuals: BacktestResidual[],
  targetCoverage: number
): IntervalCalibration | null {
  const usable = residuals.filter(
    r => Number.isFinite(r.error) && Number.isFinite(r.model_half_width) && r.model_half_width > 0
  );
  if (usable.length === 0) return null;

  const folds = new Set(usable.map(r => r.fold)).size;
  const scores = usable.map(r => Math.abs(r.error) / r.model_half_width);
  const rawLambda = conformalQuantile(scores, targetCoverage);

  const reliable =
    rawLambda !== null &&
    usable.length >= CALIBRATION_MIN_SAMPLE &&
    folds >= CALIBRATION_MIN_FOLDS;

  const multiplier = rawLambda === null ? 1 : Number(clampMultiplier(rawLambda).toFixed(6));

  // Leave-one-fold-out. λ is re-estimated on every fold but the one being scored, so a point never
  // contributes to the width that judges it. This is the number the surface leads with.
  const foldIds = [...new Set(usable.map(r => r.fold))].sort((a, b) => a - b);
  let heldOutCovered = 0;
  let heldOutScored = 0;
  if (foldIds.length >= 2) {
    for (const held of foldIds) {
      // Folds overlap when the calibration stride is shorter than the horizon, so "another fold" is
      // not automatically "a different day". Any residual landing on a period the held-out fold also
      // scores is excluded from training, or the width would partly have been set by the very days
      // it is about to be judged on.
      const heldPeriods = new Set(usable.filter(r => r.fold === held).map(r => r.period));
      const trainScores = usable
        .filter(r => r.fold !== held && !heldPeriods.has(r.period))
        .map(r => Math.abs(r.error) / r.model_half_width);
      const lambda = conformalQuantile(trainScores, targetCoverage);
      if (lambda === null) continue;
      const scored = usable.filter(r => r.fold === held);
      heldOutCovered += scored.filter(r => Math.abs(r.error) <= clampMultiplier(lambda) * r.model_half_width).length;
      heldOutScored += scored.length;
    }
  }

  const limitations = [...CALIBRATION_LIMITATIONS];
  if (rawLambda !== null && clampMultiplier(rawLambda) !== rawLambda) {
    limitations.push(
      `The measured factor was ${rawLambda.toFixed(3)} and is clamped to ${multiplier}. The range shown is ` +
        'therefore narrower than the measurement asked for, and the measurement itself is the honest figure.'
    );
  }
  if (!reliable) {
    limitations.push(
      `Not enough held-out evidence to calibrate on: ${usable.length} point(s) over ${folds} fold(s), ` +
        `against a floor of ${CALIBRATION_MIN_SAMPLE} points and ${CALIBRATION_MIN_FOLDS} folds. ` +
        'No calibrated range is published; the model-implied range stands, with its measured coverage.'
    );
  }
  if (heldOutScored === 0) {
    limitations.push(
      'Held-out coverage could not be computed — fewer than two folds, so there was no fold to leave out.'
    );
  }

  return {
    method: 'SCALED_CONFORMAL_BACKTEST_RESIDUALS',
    basis: CALIBRATION_BASIS_STATEMENT,
    target_coverage: targetCoverage,
    multiplier,
    folds,
    sample_size: usable.length,
    model_implied_coverage: Number(coverageOf(usable, 1).toFixed(4)),
    calibrated_coverage_in_sample: Number(coverageOf(usable, multiplier).toFixed(4)),
    held_out_coverage: heldOutScored > 0 ? Number((heldOutCovered / heldOutScored).toFixed(4)) : null,
    reliable,
    limitations
  };
}
