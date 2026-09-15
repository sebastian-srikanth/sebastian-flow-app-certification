import type { NodeDefinition } from '@cognite/sdk';

import { CDF_CDM_SPACE } from '../constants';

import { COGNITE_TIME_SERIES_VIEW_KEY } from './constants';
import type { TimeSeriesRef, TimeSeriesSummary, TimeSeriesType } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readDirectRelationExternalId(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return readString(value.externalId);
}

function readTimeSeriesType(value: unknown): TimeSeriesType {
  if (value === 'numeric' || value === 'string' || value === 'state') return value;
  return 'unknown';
}

function readCogniteTimeSeriesProperties(node: NodeDefinition): Record<string, unknown> | undefined {
  const spaceProperties = node.properties?.[CDF_CDM_SPACE];
  if (!isRecord(spaceProperties)) return undefined;
  const viewProperties = spaceProperties[COGNITE_TIME_SERIES_VIEW_KEY];
  if (!isRecord(viewProperties)) return undefined;
  return viewProperties;
}

export function timeSeriesRefKey(ref: TimeSeriesRef): string {
  return `${ref.space}:${ref.externalId}`;
}

export function mapNodeToTimeSeriesSummary(node: NodeDefinition): TimeSeriesSummary {
  const viewProperties = readCogniteTimeSeriesProperties(node);

  return {
    space: node.space,
    externalId: node.externalId,
    name: readString(viewProperties?.name),
    description: readString(viewProperties?.description),
    type: readTimeSeriesType(viewProperties?.type),
    sourceUnit: readString(viewProperties?.sourceUnit),
    unitExternalId: readDirectRelationExternalId(viewProperties?.unit),
    isStep: readBoolean(viewProperties?.isStep),
  };
}

export function isChartableTimeSeries(series: TimeSeriesSummary): boolean {
  return series.type === 'numeric';
}

export function formatTimeSeriesLabel(series: TimeSeriesSummary): string {
  return series.name ?? series.externalId;
}
