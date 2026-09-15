import type { NodeDefinition } from '@cognite/sdk';

import { CDF_CDM_SPACE } from '../constants';

import { COGNITE_ACTIVITY_VIEW_KEY } from './constants';
import type { ActivityRef, ActivitySummary } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  return items.length > 0 ? items : undefined;
}

function readTimestampMs(value: unknown): number | undefined {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length > 0) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : undefined;
  }
  return undefined;
}

function readCogniteActivityProperties(node: NodeDefinition): Record<string, unknown> | undefined {
  const spaceProperties = node.properties?.[CDF_CDM_SPACE];
  if (!isRecord(spaceProperties)) return undefined;
  const viewProperties = spaceProperties[COGNITE_ACTIVITY_VIEW_KEY];
  if (!isRecord(viewProperties)) return undefined;
  return viewProperties;
}

export function activityRefKey(ref: ActivityRef): string {
  return `${ref.space}:${ref.externalId}`;
}

export function mapNodeToActivitySummary(node: NodeDefinition): ActivitySummary {
  const viewProperties = readCogniteActivityProperties(node);

  return {
    space: node.space,
    externalId: node.externalId,
    name: readString(viewProperties?.name),
    description: readString(viewProperties?.description),
    tags: readStringArray(viewProperties?.tags),
    aliases: readStringArray(viewProperties?.aliases),
    sourceId: readString(viewProperties?.sourceId),
    sourceContext: readString(viewProperties?.sourceContext),
    source: readString(viewProperties?.source),
    sourceCreatedTime: readTimestampMs(viewProperties?.sourceCreatedTime),
    sourceUpdatedTime: readTimestampMs(viewProperties?.sourceUpdatedTime),
    sourceCreatedUser: readString(viewProperties?.sourceCreatedUser),
    sourceUpdatedUser: readString(viewProperties?.sourceUpdatedUser),
    startTime: readTimestampMs(viewProperties?.startTime),
    endTime: readTimestampMs(viewProperties?.endTime),
    scheduledStartTime: readTimestampMs(viewProperties?.scheduledStartTime),
    scheduledEndTime: readTimestampMs(viewProperties?.scheduledEndTime),
    lastUpdatedTime: node.lastUpdatedTime,
  };
}

export function getActivityIdentifier(activity: ActivitySummary): string {
  return activity.sourceId ?? activity.externalId;
}

export function getActivityTitle(activity: ActivitySummary): string {
  return activity.name ?? activity.description ?? activity.externalId;
}

export type RelevantDateKind =
  | 'end'
  | 'scheduledEnd'
  | 'start'
  | 'scheduledStart'
  | 'sourceUpdated'
  | 'lastUpdated';

export type RelevantDate = {
  timestampMs: number;
  kind: RelevantDateKind;
  label: string;
};

const RELEVANT_DATE_FIELDS: ReadonlyArray<{
  kind: RelevantDateKind;
  label: string;
  read: (activity: ActivitySummary) => number | undefined;
}> = [
  { kind: 'end', label: 'Completed', read: (activity) => activity.endTime },
  { kind: 'scheduledEnd', label: 'Scheduled end', read: (activity) => activity.scheduledEndTime },
  { kind: 'start', label: 'Started', read: (activity) => activity.startTime },
  {
    kind: 'scheduledStart',
    label: 'Scheduled start',
    read: (activity) => activity.scheduledStartTime,
  },
  {
    kind: 'sourceUpdated',
    label: 'Source updated',
    read: (activity) => activity.sourceUpdatedTime,
  },
  {
    kind: 'lastUpdated',
    label: 'Last updated',
    read: (activity) => activity.lastUpdatedTime,
  },
];

/**
 * The date to *show* on a row. This is a labelling concern only: row order comes from the server's
 * indexed `endTime` sort (see `ACTIVITY_RECENCY_SORT_PROPERTY`), never from this fallback chain.
 */
export function getRelevantDate(activity: ActivitySummary): RelevantDate | undefined {
  for (const field of RELEVANT_DATE_FIELDS) {
    const timestampMs = field.read(activity);
    if (timestampMs !== undefined) {
      return { timestampMs, kind: field.kind, label: field.label };
    }
  }
  return undefined;
}

export function formatActivityTimestamp(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestampMs));
}
