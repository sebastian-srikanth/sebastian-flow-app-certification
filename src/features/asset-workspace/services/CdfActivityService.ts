import type { CogniteClient, NodeDefinition } from '@cognite/sdk';


import { mapNodeToActivitySummary } from '../activities/activityProperties';
import {
  ACTIVITY_ASSETS_FILTER_PROPERTY,
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_RECENCY_SORT_DIRECTION,
  ACTIVITY_RECENCY_SORT_NULLS_FIRST,
  ACTIVITY_RECENCY_SORT_PROPERTY,
  COGNITE_ACTIVITY_VIEW,
} from '../activities/constants';
import type { ActivityListPage } from '../activities/types';
import type { AssetRef } from '../types';

import type { ActivityService } from './ActivityService';

import { cdfTaskRunner } from '@/lib/cdfTaskRunner';

function isNodeDefinition(item: unknown): item is NodeDefinition {
  if (typeof item !== 'object' || item === null) return false;
  const record = item as Record<string, unknown>;
  return record.instanceType === 'node';
}

export class CdfActivityService implements ActivityService {
  constructor(private readonly client: CogniteClient) {}

  async listRelatedActivities(asset: AssetRef, cursor?: string): Promise<ActivityListPage> {
    const response = await cdfTaskRunner.schedule(() =>
      this.client.instances.list({
        instanceType: 'node',
        sources: [{ source: COGNITE_ACTIVITY_VIEW }],
        filter: {
          containsAny: {
            property: [...ACTIVITY_ASSETS_FILTER_PROPERTY],
            values: [{ space: asset.space, externalId: asset.externalId }],
          },
        },
        // A single indexed sort key. Adding a second, unindexed key would take pagination off the
        // cursorable index, so this ordering is the whole recency contract the panel renders.
        sort: [
          {
            property: [...ACTIVITY_RECENCY_SORT_PROPERTY],
            direction: ACTIVITY_RECENCY_SORT_DIRECTION,
            nullsFirst: ACTIVITY_RECENCY_SORT_NULLS_FIRST,
          },
        ],
        limit: ACTIVITY_PAGE_SIZE,
        cursor,
      }),
    );

    // Mapping preserves CDF's order; the page is never re-ranked here or downstream.
    const activities = response.items
      .filter(isNodeDefinition)
      .map(mapNodeToActivitySummary);

    return {
      activities,
      nextCursor: response.nextCursor,
    };
  }
}
