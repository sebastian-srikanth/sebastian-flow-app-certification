import type { CogniteClient, NodeDefinition } from '@cognite/sdk';
import { describe, expect, it, vi } from 'vitest';

import {
  ACTIVITY_ASSETS_FILTER_PROPERTY,
  ACTIVITY_PAGE_SIZE,
  ACTIVITY_RECENCY_SORT_PROPERTY,
  COGNITE_ACTIVITY_VIEW,
} from '../activities/constants';
import { CDF_CDM_SPACE } from '../constants';

import { CdfActivityService } from './CdfActivityService';

function makeActivityNode(
  externalId: string,
  properties: {
    name?: string;
    sourceId?: string;
    description?: string;
    endTime?: number;
    scheduledEndTime?: number;
  } = {},
): NodeDefinition {
  return {
    createdTime: 0,
    externalId,
    instanceType: 'node',
    lastUpdatedTime: 0,
    space: CDF_CDM_SPACE,
    version: 1,
    properties: {
      [CDF_CDM_SPACE]: {
        'CogniteActivity/v1': properties,
      },
    },
  };
}

type InstancesClient = Pick<CogniteClient['instances'], 'list'>;

function makeClient(instances: InstancesClient): CogniteClient {
  return { instances } as Partial<CogniteClient> as CogniteClient;
}

describe(CdfActivityService.name, () => {
  it('lists related activities using CogniteActivity.assets containsAny filter with pagination', async () => {
    const list = vi
      .fn<CogniteClient['instances']['list']>()
      .mockResolvedValueOnce({
        items: [makeActivityNode('ACT-1', { name: 'Inspection', sourceId: 'WO-1' })],
        nextCursor: 'page-2',
      })
      .mockResolvedValueOnce({
        items: [makeActivityNode('ACT-2', { name: 'Repair' })],
        nextCursor: undefined,
      });

    const service = new CdfActivityService(makeClient({ list }));

    const firstPage = await service.listRelatedActivities({
      space: CDF_CDM_SPACE,
      externalId: 'PUMP-101',
    });

    expect(list).toHaveBeenCalledWith({
      instanceType: 'node',
      sources: [{ source: COGNITE_ACTIVITY_VIEW }],
      filter: {
        containsAny: {
          property: [...ACTIVITY_ASSETS_FILTER_PROPERTY],
          values: [{ space: CDF_CDM_SPACE, externalId: 'PUMP-101' }],
        },
      },
      sort: [
        {
          property: [...ACTIVITY_RECENCY_SORT_PROPERTY],
          direction: 'descending',
          nullsFirst: true,
        },
      ],
      limit: ACTIVITY_PAGE_SIZE,
      cursor: undefined,
    });
    expect(firstPage.activities.map((item) => item.externalId)).toEqual(['ACT-1']);
    expect(firstPage.nextCursor).toBe('page-2');

    const secondPage = await service.listRelatedActivities(
      { space: CDF_CDM_SPACE, externalId: 'PUMP-101' },
      'page-2',
    );

    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'page-2', limit: ACTIVITY_PAGE_SIZE }),
    );
    expect(secondPage.activities.map((item) => item.externalId)).toEqual(['ACT-2']);
  });

  it('sorts server-side on a cursorable CogniteSchedulable property so paging stays index-backed', async () => {
    const list = vi.fn<CogniteClient['instances']['list']>().mockResolvedValue({
      items: [makeActivityNode('ACT-1')],
      nextCursor: 'page-2',
    });

    const service = new CdfActivityService(makeClient({ list }));
    await service.listRelatedActivities({ space: CDF_CDM_SPACE, externalId: 'PUMP-101' });

    const [params] = list.mock.calls[0] ?? [];

    // `endTime` is the property CogniteSchedulable declares a cursorable B-tree index on, which is
    // what makes a custom sort combinable with pagination cursors. Descending pairs with
    // nulls-first because that is one of the two orderings Cognite documents as cursorable.
    expect(params?.sort).toEqual([
      {
        property: [CDF_CDM_SPACE, 'CogniteActivity/v1', 'endTime'],
        direction: 'descending',
        nullsFirst: true,
      },
    ]);
    // A second sort key would take pagination off the index, so recency stays single-key.
    expect(params?.sort).toHaveLength(1);
    // Cursoring alongside the sort must be preserved, otherwise Load more restarts the sequence.
    expect(params).toHaveProperty('cursor');
  });

  it('returns each page in the order CDF supplied, including null-endTime activities', async () => {
    // Nulls-first means in-progress work arrives before completed work. The service must not
    // re-rank the page — the server ordering is the only globally valid one across cursors.
    const list = vi.fn<CogniteClient['instances']['list']>().mockResolvedValue({
      items: [
        makeActivityNode('ACT-NULL-OLD-START'),
        makeActivityNode('ACT-NULL-NEW-START'),
        makeActivityNode('ACT-DONE', { endTime: 1_700_000_000_000 }),
      ],
      nextCursor: undefined,
    });

    const service = new CdfActivityService(makeClient({ list }));
    const page = await service.listRelatedActivities({
      space: CDF_CDM_SPACE,
      externalId: 'PUMP-101',
    });

    expect(page.activities.map((activity) => activity.externalId)).toEqual([
      'ACT-NULL-OLD-START',
      'ACT-NULL-NEW-START',
      'ACT-DONE',
    ]);
  });

  it('sends the same sort on every page so Load more continues the same ordering', async () => {
    const list = vi.fn<CogniteClient['instances']['list']>().mockResolvedValue({
      items: [makeActivityNode('ACT-9')],
      nextCursor: undefined,
    });

    const service = new CdfActivityService(makeClient({ list }));
    const asset = { space: CDF_CDM_SPACE, externalId: 'PUMP-101' };

    await service.listRelatedActivities(asset);
    await service.listRelatedActivities(asset, 'page-2');

    const [firstParams] = list.mock.calls[0] ?? [];
    const [secondParams] = list.mock.calls[1] ?? [];
    expect(secondParams?.sort).toEqual(firstParams?.sort);
    expect(secondParams?.cursor).toBe('page-2');
  });
});
