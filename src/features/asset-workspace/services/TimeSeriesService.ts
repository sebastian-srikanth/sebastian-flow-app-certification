import type {
  ChartDatapointSeries,
  LatestDatapointResult,
  LinkedTimeSeriesResult,
  TimeSeriesRef,
} from '../time-series/types';
import type { AssetRef } from '../types';

export interface TimeSeriesService {
  listLinkedTimeSeries(asset: AssetRef): Promise<LinkedTimeSeriesResult>;
  retrieveLatestDatapoints(refs: TimeSeriesRef[]): Promise<LatestDatapointResult[]>;
  retrieveChartDatapoints(
    refs: TimeSeriesRef[],
    start: Date,
    end: Date,
    granularity: string,
  ): Promise<ChartDatapointSeries[]>;
}
