/**
 * CTW-01 client. Returns the unwrapped projection on success, or null on any failure — the
 * surface then shows nothing rather than a previous configuration's flight.
 */

import {
  CampaignFlightProjection,
  ElapsedTelemetryReading,
  FlightProjectionRequest
} from '../packages/contracts/src/campaign-continuous-timeline-model';
import { DecisionTimelineProjection } from '../packages/contracts/src/campaign-timeline-model';
import { CampaignArchetype } from './campaign-archetypes';

export async function projectCampaignFlightClient(params: {
  tenant_id: string;
  session_id: string;
  contract_id: string;
  timeline: DecisionTimelineProjection;
  elapsed_telemetry: ElapsedTelemetryReading[];
}): Promise<{ projection: CampaignFlightProjection | null; error?: string; rejection_id?: string }> {
  try {
    const body: FlightProjectionRequest = params;
    const res = await fetch('/api/v1/campaigns/flight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) {
      return { projection: null, error: data.message || 'Flight projection failed', rejection_id: data.rejection_id };
    }
    return { projection: data.data || null };
  } catch (e: any) {
    return { projection: null, error: e.message };
  }
}

/**
 * Adapter from the demonstration world model to the engine's telemetry input.
 *
 * It reads the seeded stream's expected and observed values as a matched pair, because their
 * ratio is the only thing the engine takes from them. The seeded expected value never reaches
 * the engine as a baseline — the baseline is the activated contract.
 *
 * `current_day` bounds the elapsed window, and the stream is truncated to it: the seeded
 * archetypes hold exactly `current_day` readings today, and this makes that an input rather
 * than an assumption.
 */
export function buildElapsedTelemetryFromArchetype(archetype: CampaignArchetype): ElapsedTelemetryReading[] {
  const twin = archetype.decision_twin;
  return twin.telemetry_streams
    .filter(s => s.day_index >= 1 && s.day_index <= twin.current_day)
    .map(s => ({
      flight_day: s.day_index,
      demand_expected: s.expected_demand_index,
      demand_observed: s.observed_demand_index,
      contribution_expected: s.expected_margin_gbp,
      contribution_observed: s.observed_margin_gbp
    }));
}
