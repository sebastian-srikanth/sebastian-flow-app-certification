import { DURATION_PRESETS } from './constants';
import type { DurationPresetId, TimeRange } from './types';

export function getDurationMs(preset: DurationPresetId): number {
  const match = DURATION_PRESETS.find((item) => item.id === preset);
  return match?.durationMs ?? DURATION_PRESETS.find((item) => item.id === '24h')!.durationMs;
}

export function buildTimeRange(endMs: number, durationMs: number): TimeRange {
  return {
    startMs: endMs - durationMs,
    endMs,
  };
}

export function maxTimestamp(values: Array<number | undefined>): number | undefined {
  const defined = values.filter((value): value is number => typeof value === 'number');
  if (defined.length === 0) return undefined;
  return Math.max(...defined);
}

/**
 * Simple bounded granularity for chart aggregates based on visible window.
 * Uses server-side average aggregates to avoid downloading huge raw datasets.
 */
export function selectChartGranularity(durationMs: number): string {
  if (durationMs <= 60 * 60 * 1000) return '5m';
  if (durationMs <= 6 * 60 * 60 * 1000) return '15m';
  if (durationMs <= 24 * 60 * 60 * 1000) return '1h';
  return '6h';
}
