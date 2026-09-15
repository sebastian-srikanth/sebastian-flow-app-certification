import type { CogniteClient, DatapointAggregate, Datapoints, NodeDefinition } from '@cognite/sdk';


import {
  COGNITE_TIME_SERIES_VIEW,
  TIME_SERIES_ASSETS_FILTER_PROPERTY,
  TIME_SERIES_MAX_RESULTS,
  TIME_SERIES_PAGE_SIZE,
} from '../time-series/constants';
import {
  formatTimeSeriesLabel,
  mapNodeToTimeSeriesSummary,
  timeSeriesRefKey,
} from '../time-series/timeSeriesProperties';
import type {
  ChartDatapointSeries,
  LatestDatapointResult,
  LinkedTimeSeriesResult,
  TimeSeriesRef,
  TimeSeriesSummary,
} from '../time-series/types';
import type { AssetRef } from '../types';

import type { TimeSeriesService } from './TimeSeriesService';

import { cdfTaskRunner } from '@/lib/cdfTaskRunner';

function isNodeDefinition(item: unknown): item is NodeDefinition {
  if (typeof item !== 'object' || item === null) return false;
  const record = item as Record<string, unknown>;
  return record.instanceType === 'node';
}

function toEpochMs(timestamp: Date | number): number {
  return timestamp instanceof Date ? timestamp.getTime() : timestamp;
}

function readAggregateValue(point: DatapointAggregate): number | undefined {
  if (typeof point.average === 'number' && Number.isFinite(point.average)) {
    return point.average;
  }
  return undefined;
}

export class CdfTimeSeriesService implements TimeSeriesService {
  constructor(private readonly client: CogniteClient) {}

  async listLinkedTimeSeries(asset: AssetRef): Promise<LinkedTimeSeriesResult> {
    const series: TimeSeriesSummary[] = [];
    let cursor: string | undefined;

    do {
      const remaining = TIME_SERIES_MAX_RESULTS - series.length;
      const response = await cdfTaskRunner.schedule(() =>
        this.client.instances.list({
          instanceType: 'node',
          sources: [{ source: COGNITE_TIME_SERIES_VIEW }],
          filter: {
            containsAny: {
              property: [...TIME_SERIES_ASSETS_FILTER_PROPERTY],
              values: [{ space: asset.space, externalId: asset.externalId }],
            },
          },
          limit: Math.min(TIME_SERIES_PAGE_SIZE, remaining),
          cursor,
        }),
      );

      for (const item of response.items) {
        if (isNodeDefinition(item)) {
          series.push(mapNodeToTimeSeriesSummary(item));
        }
      }

      cursor = response.nextCursor;
    } while (cursor && series.length < TIME_SERIES_MAX_RESULTS);

    return {
      series: series.slice(0, TIME_SERIES_MAX_RESULTS),
      truncated: Boolean(cursor) || series.length > TIME_SERIES_MAX_RESULTS,
    };
  }

  async retrieveLatestDatapoints(refs: TimeSeriesRef[]): Promise<LatestDatapointResult[]> {
    if (refs.length === 0) return [];

    const response = await cdfTaskRunner.schedule(() =>
      this.client.datapoints.retrieveLatest(
        refs.map((ref) => ({
          instanceId: { space: ref.space, externalId: ref.externalId },
        })),
        { ignoreUnknownIds: true },
      ),
    );

    const latestByKey = new Map<string, Datapoints>();
    for (const item of response) {
      if (item.instanceId) {
        latestByKey.set(timeSeriesRefKey(item.instanceId), item);
      }
    }

    return refs.map((ref) => {
      const item = latestByKey.get(timeSeriesRefKey(ref));
      const datapoint = item?.datapoints[0];
      const latestTimestamp = datapoint ? toEpochMs(datapoint.timestamp) : undefined;

      return {
        ref,
        latestTimestamp,
        hasData: Boolean(datapoint),
      };
    });
  }

  async retrieveChartDatapoints(
    refs: TimeSeriesRef[],
    start: Date,
    end: Date,
    granularity: string,
  ): Promise<ChartDatapointSeries[]> {
    if (refs.length === 0) return [];

    const response = await cdfTaskRunner.schedule(() =>
      this.client.datapoints.retrieve({
        start,
        end,
        granularity,
        aggregates: ['average'],
        items: refs.map((ref) => ({
          instanceId: { space: ref.space, externalId: ref.externalId },
        })),
      }),
    );

    const seriesByKey = new Map<string, ChartDatapointSeries>();

    for (const item of response) {
      if (!item.instanceId || item.isString) continue;

      const datapoints = item.datapoints
        .map((point) => {
          const value = readAggregateValue(point as DatapointAggregate);
          if (value === undefined) return null;
          return {
            timestamp: toEpochMs(point.timestamp),
            value,
          };
        })
        .filter((point): point is { timestamp: number; value: number } => point !== null);

      seriesByKey.set(timeSeriesRefKey(item.instanceId), {
        ref: item.instanceId,
        label: item.externalId ?? item.instanceId.externalId,
        unit: item.unit ?? item.unitExternalId,
        datapoints,
      });
    }

    return refs.map((ref) => {
      const existing = seriesByKey.get(timeSeriesRefKey(ref));
      if (existing) return existing;

      return {
        ref,
        label: ref.externalId,
        datapoints: [],
      };
    });
  }
}

export function enrichChartSeriesLabels(
  seriesList: ChartDatapointSeries[],
  summaries: TimeSeriesSummary[],
): ChartDatapointSeries[] {
  const summaryByKey = new Map(summaries.map((item) => [timeSeriesRefKey(item), item]));

  return seriesList.map((series) => {
    const summary = summaryByKey.get(timeSeriesRefKey(series.ref));
    return {
      ...series,
      label: summary ? formatTimeSeriesLabel(summary) : series.label,
      unit: series.unit ?? summary?.sourceUnit ?? summary?.unitExternalId,
    };
  });
}
