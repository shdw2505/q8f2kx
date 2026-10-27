import { DayAheadResponse, MetricsBreakdownResponse } from '../types';

// In production served by FastAPI, the base is relative ''; in Vite dev it proxies /api
const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function fetchDayAheadForecasts(
  cutoffHour: number = 9,
  cutoffMinute: number = 50,
  startDate?: string,
  endDate?: string,
  forceRefresh: boolean = false
): Promise<DayAheadResponse> {
  const params = new URLSearchParams();
  params.append('cutoff_hour', cutoffHour.toString());
  params.append('cutoff_minute', cutoffMinute.toString());
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (forceRefresh) params.append('force_refresh', 'true');

  const res = await fetch(`${API_BASE}/api/v1/forecasts/day-ahead?${params.toString()}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to load forecast data (${res.status}): ${errorText}`);
  }
  return res.json();
}

export async function fetchMetricsBreakdown(
  cutoffHour: number = 9,
  cutoffMinute: number = 50,
  startDate?: string,
  endDate?: string
): Promise<MetricsBreakdownResponse> {
  const params = new URLSearchParams();
  params.append('cutoff_hour', cutoffHour.toString());
  params.append('cutoff_minute', cutoffMinute.toString());
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const res = await fetch(`${API_BASE}/api/v1/metrics/breakdown?${params.toString()}`);
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to load metrics breakdown (${res.status}): ${errorText}`);
  }
  return res.json();
}
