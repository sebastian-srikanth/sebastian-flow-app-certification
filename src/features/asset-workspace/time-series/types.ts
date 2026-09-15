import type { AssetRef } from '../types';

export type TimeSeriesRef = AssetRef;

export type TimeSeriesType = 'numeric' | 'string' | 'state' | 'unknown';

export type TimeSeriesSummary = TimeSeriesRef & {
  name?: string;
  description?: string;
  type: TimeSeriesType;
  sourceUnit?: string;
  unitExternalId?: string;
  isStep?: boolean;
};

export type LinkedTimeSeriesResult = {
  series: TimeSeriesSummary[];
  /** True when the asset has more linked series than the discovery bound returns. */
  truncated: boolean;
};

export type LatestDatapointResult = {
  ref: TimeSeriesRef;
  latestTimestamp?: number;
  hasData: boolean;
};

export type ChartDatapoint = {
  timestamp: number;
  value: number;
};

export type ChartDatapointSeries = {
  ref: TimeSeriesRef;
  label: string;
  unit?: string;
  datapoints: ChartDatapoint[];
};

export type DurationPresetId = '1h' | '6h' | '24h' | '7d';

export type TimeRange = {
  startMs: number;
  endMs: number;
};
