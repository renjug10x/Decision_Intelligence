/**
 * CTW-02 — do nothing versus intervene.
 *
 * Both sides are engine-derived and cover the **remaining horizon only**, because elapsed days are
 * identical under either choice and including them would flatter whichever option is compared
 * against a bigger number. Nothing here forecasts: the "with intervention" side is CDI-02 re-run at
 * the proposed depth, shaped by the same CTW-03 forecast.
 */

import {
  CampaignFlightProjection,
  FlightLens
} from '../packages/contracts/src/campaign-continuous-timeline-model';
import {
  InterventionCandidate,
  InterventionOutcomeSummary,
  InterventionPreview
} from '../packages/contracts/src/campaign-intervention-model';

const gbp = (v: number) => `£${Math.round(v).toLocaleString('en-GB')}`;
const units = (v: number) => `${Math.round(v).toLocaleString('en-GB')} units`;

function remainingTotals(
  flight: CampaignFlightProjection,
  fromDay: number,
  override?: Map<FlightLens, Map<number, number>>
): InterventionOutcomeSummary {
  const read = (lens: FlightLens) => {
    const series = flight.lenses.find(l => l.lens === lens);
    if (!series) return 0;
    let total = 0;
    for (const p of series.points) {
      if (p.flight_day < fromDay) continue;
      const o = override?.get(lens)?.get(p.flight_day);
      total += o !== undefined ? o : p.expectation_value ?? 0;
    }
    return total;
  };
  const days = flight.lenses[0].points.filter(p => p.flight_day >= fromDay).length;
  return {
    remaining_demand_units: Number(read('DEMAND').toFixed(2)),
    remaining_contribution_gbp: Number(read('CONTRIBUTION').toFixed(2)),
    days_affected: days
  };
}

export function buildInterventionPreview(args: {
  momentId: string;
  candidate: InterventionCandidate;
  effectiveFromFlightDay: number;
  /** The flight as it stands. */
  baseline: CampaignFlightProjection;
  /** The same flight with the intervention applied — its reforecast carries the changed days. */
  intervened: CampaignFlightProjection;
}): InterventionPreview {
  const { candidate, effectiveFromFlightDay, baseline, intervened } = args;

  const override = new Map<FlightLens, Map<number, number>>();
  for (const series of intervened.reforecast || []) {
    const m = new Map<number, number>();
    for (const p of series.points) if (p.expectation_value !== null) m.set(p.flight_day, p.expectation_value);
    override.set(series.lens, m);
  }

  const without = remainingTotals(baseline, effectiveFromFlightDay);
  const withIv = remainingTotals(baseline, effectiveFromFlightDay, override);

  const contributionDelta = withIv.remaining_contribution_gbp - without.remaining_contribution_gbp;
  const demandDelta = withIv.remaining_demand_units - without.remaining_demand_units;

  const improves =
    contributionDelta >= 0
      ? `Contribution over the remaining ${without.days_affected} days improves by about ${gbp(Math.abs(contributionDelta))}.`
      : `Demand over the remaining ${without.days_affected} days improves by about ${units(Math.abs(demandDelta))}.`;
  const sacrificed =
    contributionDelta >= 0
      ? demandDelta < 0
        ? `About ${units(Math.abs(demandDelta))} of demand is given up to get it.`
        : 'Nothing measured is given up on the two metrics CogniX can cost here.'
      : `About ${gbp(Math.abs(contributionDelta))} of contribution is given up to get it.`;

  return {
    moment_id: args.momentId,
    candidate,
    effective_from_flight_day: effectiveFromFlightDay,
    without_intervention: without,
    with_intervention: withIv,
    without_statement:
      `Leaving the campaign as activated, the remaining ${without.days_affected} days are expected to deliver ` +
      `${units(without.remaining_demand_units)} of demand and ${gbp(without.remaining_contribution_gbp)} of contribution.`,
    with_statement:
      `${candidate.label} from day ${effectiveFromFlightDay} changes that to ` +
      `${units(withIv.remaining_demand_units)} of demand and ${gbp(withIv.remaining_contribution_gbp)} of contribution.`,
    trade_off_headline:
      contributionDelta >= 0 ? 'Margin protection ↔ Maximum demand growth' : 'Demand growth ↔ Margin protection',
    what_improves: improves,
    what_is_sacrificed: sacrificed,
    why_recommended:
      contributionDelta >= 0
        ? `CogniX proposes it because it protects ${gbp(Math.abs(contributionDelta))} of contribution over the ` +
          `remaining ${without.days_affected} days, and the only cost it can measure is the demand named above. ` +
          'Whether that trade is worth making is the analyst’s judgement, not CogniX’s.'
        : 'CogniX does not recommend this change: on the two measures it can cost, it gives up more than it gains.',
    basis: [
      'Both sides are CDI-02 evaluations of the same campaign at two promotional depths.',
      baseline.forecast
        ? `Both are distributed across the horizon by ${baseline.forecast.model_display_name}, the same forecast in both cases.`
        : 'No forecast is bound, so both sides are flat across the horizon.',
      'Elapsed days are excluded from both totals — they are identical either way.'
    ]
  };
}
