import type { CogniteClient, NodeDefinition } from '@cognite/sdk';
import { describe, expect, it, vi } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';

import { CdfAssetService } from './CdfAssetService';

function makeNode(externalId: string): NodeDefinition {
  return {
    createdTime: 0,
    externalId,
    instanceType: 'node',
    lastUpdatedTime: 0,
    space: CDF_CDM_SPACE,
    version: 1,
  };
}

type InstancesClient = Pick<CogniteClient['instances'], 'search' | 'retrieve'>;

function makeClient(instances: InstancesClient): CogniteClient {
  return { instances } as Partial<CogniteClient> as CogniteClient;
}

describe(CdfAssetService.name, () => {
  it('combines text search and externalId prefix search without duplicates', async () => {
    const search = vi.fn<CogniteClient['instances']['search']>()
      .mockResolvedValueOnce({ items: [makeNode('PUMP-101')] })
      .mockResolvedValueOnce({ items: [makeNode('PUMP-101'), makeNode('PUMP-102')] });

    const service = new CdfAssetService(makeClient({ search, retrieve: vi.fn() }));

    const results = await service.searchAssets('PUMP');

    expect(search).toHaveBeenCalledTimes(2);
    expect(results.map((item) => item.externalId)).toEqual(['PUMP-101', 'PUMP-102']);
  });

  it('returns empty results for blank queries', async () => {
    const search = vi.fn<CogniteClient['instances']['search']>();
    const service = new CdfAssetService(makeClient({ search, retrieve: vi.fn() }));

    const results = await service.searchAssets('   ');

    expect(results).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  });

  it('retrieves a single asset by space and externalId', async () => {
    const retrieve = vi.fn<CogniteClient['instances']['retrieve']>().mockResolvedValue({
      items: [makeNode('VALVE-9')],
    });
    const service = new CdfAssetService(
      makeClient({ search: vi.fn(), retrieve }),
    );
    const asset = await service.getAsset({ space: CDF_CDM_SPACE, externalId: 'VALVE-9' });

    expect(retrieve).toHaveBeenCalledWith({
      items: [
        {
          instanceType: 'node',
          externalId: 'VALVE-9',
          space: CDF_CDM_SPACE,
        },
      ],
      sources: [{ source: expect.objectContaining({ externalId: 'CogniteAsset' }) }],
    });
    expect(asset?.externalId).toBe('VALVE-9');
  });

  it('returns null when retrieve finds no asset', async () => {
    const retrieve = vi.fn<CogniteClient['instances']['retrieve']>().mockResolvedValue({ items: [] });
    const service = new CdfAssetService(
      makeClient({ search: vi.fn(), retrieve }),
    );
    const asset = await service.getAsset({ space: CDF_CDM_SPACE, externalId: 'MISSING' });

    expect(asset).toBeNull();
  });
});
