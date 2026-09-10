import type { NodeDefinition } from '@cognite/sdk';

import { CDF_CDM_SPACE } from '../constants';

import { COGNITE_FILE_VIEW_KEY } from './constants';
import type { DocumentRef, DocumentSummary } from './types';

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

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
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

function readCogniteFileProperties(node: NodeDefinition): Record<string, unknown> | undefined {
  const spaceProperties = node.properties?.[CDF_CDM_SPACE];
  if (!isRecord(spaceProperties)) return undefined;
  const viewProperties = spaceProperties[COGNITE_FILE_VIEW_KEY];
  if (!isRecord(viewProperties)) return undefined;
  return viewProperties;
}

export function documentRefKey(ref: DocumentRef): string {
  return `${ref.space}:${ref.externalId}`;
}

export function mapNodeToDocumentSummary(node: NodeDefinition): DocumentSummary {
  const viewProperties = readCogniteFileProperties(node);

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
    mimeType: readString(viewProperties?.mimeType),
    directory: readString(viewProperties?.directory),
    isUploaded: readBoolean(viewProperties?.isUploaded),
    uploadedTime: readTimestampMs(viewProperties?.uploadedTime),
    lastUpdatedTime: node.lastUpdatedTime,
  };
}

export function getDocumentDisplayName(document: DocumentSummary): string {
  if (document.name) return document.name;
  if (document.sourceId) return document.sourceId;
  return document.externalId;
}

const MIME_FRIENDLY_LABELS: Record<string, string> = {
  'application/pdf': 'PDF',
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/jpg': 'JPEG',
  'image/gif': 'GIF',
  'image/webp': 'WEBP',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'text/plain': 'Text',
};

export function getDocumentTypeLabel(document: DocumentSummary): string {
  const mimeType = document.mimeType?.toLowerCase();
  if (mimeType && MIME_FRIENDLY_LABELS[mimeType]) {
    return MIME_FRIENDLY_LABELS[mimeType];
  }
  if (mimeType) return mimeType;
  return 'Unknown type';
}

export type DocumentTimestampKind = 'sourceUpdated' | 'uploaded' | 'lastUpdated';

export type DocumentTimestamp = {
  timestampMs: number;
  kind: DocumentTimestampKind;
  label: string;
};

const TIMESTAMP_FIELDS: ReadonlyArray<{
  kind: DocumentTimestampKind;
  label: string;
  read: (document: DocumentSummary) => number | undefined;
}> = [
  { kind: 'sourceUpdated', label: 'Modified', read: (document) => document.sourceUpdatedTime },
  { kind: 'uploaded', label: 'Uploaded', read: (document) => document.uploadedTime },
  { kind: 'lastUpdated', label: 'CDF updated', read: (document) => document.lastUpdatedTime },
];

export function getDocumentTimestamp(document: DocumentSummary): DocumentTimestamp | undefined {
  for (const field of TIMESTAMP_FIELDS) {
    const timestampMs = field.read(document);
    if (timestampMs !== undefined) {
      return { timestampMs, kind: field.kind, label: field.label };
    }
  }
  return undefined;
}

export function getDocumentTimestampMs(document: DocumentSummary): number | undefined {
  return getDocumentTimestamp(document)?.timestampMs;
}

export function formatDocumentTimestamp(timestampMs: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestampMs));
}

export function compareDocumentsByRecency(a: DocumentSummary, b: DocumentSummary): number {
  const dateA = getDocumentTimestampMs(a);
  const dateB = getDocumentTimestampMs(b);

  if (dateA === undefined && dateB === undefined) {
    return a.externalId.localeCompare(b.externalId);
  }
  if (dateA === undefined) return 1;
  if (dateB === undefined) return -1;
  if (dateA !== dateB) return dateB - dateA;

  return a.externalId.localeCompare(b.externalId);
}

export function sortDocumentsByRecency(documents: DocumentSummary[]): DocumentSummary[] {
  return [...documents].sort(compareDocumentsByRecency);
}

export function isDocumentContentAvailable(document: DocumentSummary): boolean {
  return document.isUploaded !== false;
}
