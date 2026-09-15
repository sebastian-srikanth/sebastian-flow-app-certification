import { maxTimestamp } from './timeRange';
import { timeSeriesRefKey } from './timeSeriesProperties';
import type { TimeSeriesRef } from './types';

export function buildChartableSelectionKey(refs: TimeSeriesRef[]): string {
  return refs.map(timeSeriesRefKey).sort().join('|');
}

export function latestDatapointsMatchSelection(
  refs: TimeSeriesRef[],
  latestItems: Array<{ ref: TimeSeriesRef }>,
): boolean {
  if (refs.length === 0) return latestItems.length === 0;
  const expected = new Set(refs.map(timeSeriesRefKey));
  const actual = latestItems.map((item) => timeSeriesRefKey(item.ref));
  return actual.length === expected.size && actual.every((key) => expected.has(key));
}

export function computeChartAnchorMs(
  refs: TimeSeriesRef[],
  latestItems: Array<{ ref: TimeSeriesRef; latestTimestamp?: number }>,
  options?: { isPlaceholderData?: boolean },
): number | null {
  if (refs.length === 0) return null;
  if (options?.isPlaceholderData) return null;
  if (!latestDatapointsMatchSelection(refs, latestItems)) return null;

  const timestamps = latestItems.map((item) => item.latestTimestamp);
  const anchor = maxTimestamp(timestamps);
  return anchor ?? null;
}
