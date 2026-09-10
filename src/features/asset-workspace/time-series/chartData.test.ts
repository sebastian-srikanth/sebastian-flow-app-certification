import { describe, expect, it } from 'vitest';

import { mergeChartSeries } from './chartData';
import type { ChartDatapointSeries } from './types';

const seriesA: ChartDatapointSeries = {
  ref: { space: 'cdf_cdm', externalId: 'A' },
  label: 'A',
  datapoints: [
    { timestamp: 100, value: 1 },
    { timestamp: 200, value: 2 },
  ],
};

const seriesB: ChartDatapointSeries = {
  ref: { space: 'cdf_cdm', externalId: 'B' },
  label: 'B',
  datapoints: [{ timestamp: 200, value: 9 }],
};

describe('mergeChartSeries', () => {
  it('merges multiple series onto a shared timeline keyed by instance ref', () => {
    expect(mergeChartSeries([seriesA, seriesB])).toEqual([
      { timestamp: 100, 'cdf_cdm:A': 1 },
      { timestamp: 200, 'cdf_cdm:A': 2, 'cdf_cdm:B': 9 },
    ]);
  });

  it('uses the caller-supplied key so chart data keys stay CSS-identifier-safe', () => {
    expect(mergeChartSeries([seriesA, seriesB], (_series, index) => `series${index}`)).toEqual([
      { timestamp: 100, series0: 1 },
      { timestamp: 200, series0: 2, series1: 9 },
    ]);
  });

  it('sorts timestamps ascending regardless of datapoint order', () => {
    const unordered: ChartDatapointSeries = {
      ref: { space: 'cdf_cdm', externalId: 'C' },
      label: 'C',
      datapoints: [
        { timestamp: 300, value: 3 },
        { timestamp: 100, value: 1 },
        { timestamp: 200, value: 2 },
      ],
    };

    expect(mergeChartSeries([unordered]).map((row) => row.timestamp)).toEqual([100, 200, 300]);
  });

  it('omits the key entirely for timestamps a series has no value for', () => {
    const rows = mergeChartSeries([seriesA, seriesB]);

    expect(Object.keys(rows[0])).toEqual(['timestamp', 'cdf_cdm:A']);
    expect(rows[0]['cdf_cdm:B']).toBeUndefined();
  });

  it('returns no rows when every series is empty', () => {
    expect(
      mergeChartSeries([{ ref: { space: 'cdf_cdm', externalId: 'D' }, label: 'D', datapoints: [] }]),
    ).toEqual([]);
  });

  it('returns no rows for an empty series list', () => {
    expect(mergeChartSeries([])).toEqual([]);
  });
});
