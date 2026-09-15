import type { NodeDefinition } from '@cognite/sdk';

import { CDF_CDM_SPACE, COGNITE_ASSET_VIEW_KEY } from './constants';
import type { AssetRef, AssetSummary } from './types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function readDirectRelationExternalId(value: unknown): string | undefined {
  if (!isRecord(value)) return undefined;
  return readString(value.externalId);
}

function readCogniteAssetProperties(node: NodeDefinition): Record<string, unknown> | undefined {
  const spaceProperties = node.properties?.[CDF_CDM_SPACE];
  if (!isRecord(spaceProperties)) return undefined;
  const viewProperties = spaceProperties[COGNITE_ASSET_VIEW_KEY];
  if (!isRecord(viewProperties)) return undefined;
  return viewProperties;
}

export function mapNodeToAssetSummary(node: NodeDefinition): AssetSummary {
  const viewProperties = readCogniteAssetProperties(node);

  return {
    space: node.space,
    externalId: node.externalId,
    name: readString(viewProperties?.name),
    description: readString(viewProperties?.description),
    typeExternalId: readDirectRelationExternalId(viewProperties?.type),
    parentExternalId: readDirectRelationExternalId(viewProperties?.parent),
  };
}

export function assetRefKey(ref: AssetRef): string {
  return `${ref.space}:${ref.externalId}`;
}

export function mergeAssetSummaries(primary: AssetSummary[], secondary: AssetSummary[]): AssetSummary[] {
  const seen = new Set<string>();
  const merged: AssetSummary[] = [];

  for (const item of [...primary, ...secondary]) {
    const key = assetRefKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged;
}

function isExactExternalIdMatch(summary: AssetSummary, normalizedQuery: string): boolean {
  return summary.externalId.toLowerCase() === normalizedQuery;
}

/**
 * Combines the two asset-search result sets into a single ranked list.
 *
 * The two sets come from different queries (a free-text search over name/description and an
 * `externalId` prefix filter) and each is already capped at the result limit, so simply
 * concatenating before slicing lets one set evict the other entirely. Round-robin interleaving
 * guarantees each set keeps at least half of the available slots, and an exact tag match is
 * always hoisted to the top because that is the highest-confidence result the analyst can get.
 */
export function rankAssetSearchResults(
  textMatches: AssetSummary[],
  externalIdMatches: AssetSummary[],
  query: string,
  limit: number,
): AssetSummary[] {
  const normalizedQuery = query.trim().toLowerCase();

  const exactMatches: AssetSummary[] = [];
  const remainingExternalId: AssetSummary[] = [];
  const remainingText: AssetSummary[] = [];

  for (const summary of externalIdMatches) {
    (isExactExternalIdMatch(summary, normalizedQuery) ? exactMatches : remainingExternalId).push(summary);
  }
  for (const summary of textMatches) {
    (isExactExternalIdMatch(summary, normalizedQuery) ? exactMatches : remainingText).push(summary);
  }

  const interleaved: AssetSummary[] = [];
  const longest = Math.max(remainingExternalId.length, remainingText.length);
  for (let index = 0; index < longest; index += 1) {
    const externalIdMatch = remainingExternalId[index];
    if (externalIdMatch) interleaved.push(externalIdMatch);
    const textMatch = remainingText[index];
    if (textMatch) interleaved.push(textMatch);
  }

  return mergeAssetSummaries(exactMatches, interleaved).slice(0, limit);
}
