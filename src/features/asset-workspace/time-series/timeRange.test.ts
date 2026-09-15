import { describe, expect, it } from 'vitest';

import { buildTimeRange, getDurationMs, maxTimestamp, selectChartGranularity } from './timeRange';

describe('timeRange', () => {
  it('builds a 24h window ending at the latest datapoint anchor', () => {
    const endMs = 1_700_000_000_000;
    const range = buildTimeRange(endMs, getDurationMs('24h'));

    expect(range.endMs).toBe(endMs);
    expect(range.startMs).toBe(endMs - 24 * 60 * 60 * 1000);
    expect(range.endMs).not.toBe(Date.now());
  });

  it('selects bounded granularity for longer windows', () => {
    expect(selectChartGranularity(getDurationMs('1h'))).toBe('5m');
    expect(selectChartGranularity(getDurationMs('7d'))).toBe('6h');
  });

  it('returns the maximum defined timestamp', () => {
    expect(maxTimestamp([undefined, 100, 250, undefined])).toBe(250);
    expect(maxTimestamp([undefined])).toBeUndefined();
  });
});
