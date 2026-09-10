import type { CogniteClient, NodeDefinition } from '@cognite/sdk';


import {
  assetRefKey,
  mapNodeToAssetSummary,
  rankAssetSearchResults,
} from '../assetProperties';
import {
  ASSET_TEXT_SEARCH_PROPERTIES,
  COGNITE_ASSET_VIEW,
  SEARCH_RESULT_LIMIT,
} from '../constants';
import type { AssetDetail, AssetRef, AssetSummary } from '../types';

import type { AssetService } from './AssetService';

import { cdfTaskRunner } from '@/lib/cdfTaskRunner';

type SearchOperator = 'AND' | 'OR';

type InstanceSearchParams = Parameters<CogniteClient['instances']['search']>[0] & {
  operator?: SearchOperator;
};

function isNodeDefinition(item: unknown): item is NodeDefinition {
  if (typeof item !== 'object' || item === null) return false;
  const record = item as Record<string, unknown>;
  return record.instanceType === 'node';
}

export class CdfAssetService implements AssetService {
  constructor(private readonly client: CogniteClient) {}

  async searchAssets(query: string): Promise<AssetSummary[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) return [];

    const [textSearchNodes, externalIdNodes] = await Promise.all([
      this.searchByText(trimmedQuery),
      this.searchByExternalIdPrefix(trimmedQuery),
    ]);

    const textSummaries = textSearchNodes.map(mapNodeToAssetSummary);
    const externalIdSummaries = externalIdNodes.map(mapNodeToAssetSummary);

    return rankAssetSearchResults(
      textSummaries,
      externalIdSummaries,
      trimmedQuery,
      SEARCH_RESULT_LIMIT,
    );
  }

  async getAsset(ref: AssetRef): Promise<AssetDetail | null> {
    const response = await cdfTaskRunner.schedule(() =>
      this.client.instances.retrieve({
        items: [
          {
            instanceType: 'node',
            externalId: ref.externalId,
            space: ref.space,
          },
        ],
        sources: [{ source: COGNITE_ASSET_VIEW }],
      }),
    );

    const node = response.items.find(isNodeDefinition);
    if (!node) return null;

    return mapNodeToAssetSummary(node);
  }

  private async searchByText(query: string): Promise<NodeDefinition[]> {
    const params: InstanceSearchParams = {
      view: COGNITE_ASSET_VIEW,
      instanceType: 'node',
      query,
      properties: [...ASSET_TEXT_SEARCH_PROPERTIES],
      operator: 'OR',
      limit: SEARCH_RESULT_LIMIT,
    };

    const response = await cdfTaskRunner.schedule(() => this.client.instances.search(params));
    return response.items.filter(isNodeDefinition);
  }

  private async searchByExternalIdPrefix(query: string): Promise<NodeDefinition[]> {
    const params: InstanceSearchParams = {
      view: COGNITE_ASSET_VIEW,
      instanceType: 'node',
      filter: {
        prefix: {
          property: ['node', 'externalId'],
          value: query,
        },
      },
      limit: SEARCH_RESULT_LIMIT,
    };

    const response = await cdfTaskRunner.schedule(() => this.client.instances.search(params));
    return response.items.filter(isNodeDefinition);
  }
}

export function createAssetRefMap(summaries: AssetSummary[]): Map<string, AssetSummary> {
  const map = new Map<string, AssetSummary>();
  for (const summary of summaries) {
    map.set(assetRefKey(summary), summary);
  }
  return map;
}
