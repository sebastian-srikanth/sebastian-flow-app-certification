import { timeSeriesRefKey } from './timeSeriesProperties';
import type { ChartDatapointSeries } from './types';

export type MergedChartRow = {
  timestamp: number;
  [seriesKey: string]: number;
};

/**
 * Row key for a series. Charting libraries need CSS-identifier-safe data keys, so the
 * consumer supplies its own; the default is the instance ref key.
 */
export type ChartSeriesKeyFn = (series: ChartDatapointSeries, index: number) => string;

const defaultKeyFn: ChartSeriesKeyFn = (series) => timeSeriesRefKey(series.ref);

export function mergeChartSeries(
  seriesList: ChartDatapointSeries[],
  keyFor: ChartSeriesKeyFn = defaultKeyFn,
): MergedChartRow[] {
  const timestampSet = new Set<number>();

  for (const series of seriesList) {
    for (const point of series.datapoints) {
      timestampSet.add(point.timestamp);
    }
  }

  const timestamps = [...timestampSet].sort((a, b) => a - b);
  const keys = seriesList.map(keyFor);
  const valueBySeries = new Map<string, Map<number, number>>();

  seriesList.forEach((series, index) => {
    const values = new Map<number, number>();
    for (const point of series.datapoints) {
      values.set(point.timestamp, point.value);
    }
    valueBySeries.set(keys[index], values);
  });

  return timestamps.map((timestamp) => {
    const row: MergedChartRow = { timestamp };
    for (const key of keys) {
      const value = valueBySeries.get(key)?.get(timestamp);
      if (value !== undefined) {
        row[key] = value;
      }
    }
    return row;
  });
}
