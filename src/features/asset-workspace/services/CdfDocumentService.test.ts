import type { CogniteClient, NodeDefinition } from '@cognite/sdk';
import { describe, expect, it, vi } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';
import {
  COGNITE_FILE_VIEW,
  FILE_ASSETS_FILTER_PROPERTY,
  FILE_PAGE_SIZE,
} from '../documents/constants';

import { CdfDocumentService } from './CdfDocumentService';

function makeFileNode(
  externalId: string,
  properties: {
    name?: string;
    mimeType?: string;
    isUploaded?: boolean;
    sourceUpdatedTime?: number;
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
        'CogniteFile/v1': properties,
      },
    },
  };
}

type InstancesClient = Pick<CogniteClient['instances'], 'list'>;
type FilesClient = Pick<CogniteClient['files'], 'getDownloadUrls'>;

function makeClient(
  instances: InstancesClient,
  files: FilesClient,
): CogniteClient {
  return { instances, files } as Partial<CogniteClient> as CogniteClient;
}

describe(CdfDocumentService.name, () => {
  it('lists related documents using CogniteFile.assets containsAny filter with pagination', async () => {
    const list = vi
      .fn<CogniteClient['instances']['list']>()
      .mockResolvedValueOnce({
        items: [makeFileNode('FILE-1', { name: 'Manual', mimeType: 'application/pdf' })],
        nextCursor: 'page-2',
      })
      .mockResolvedValueOnce({
        items: [makeFileNode('FILE-2', { name: 'Diagram', mimeType: 'image/png' })],
        nextCursor: undefined,
      });

    const getDownloadUrls = vi.fn<CogniteClient['files']['getDownloadUrls']>();
    const service = new CdfDocumentService(makeClient({ list }, { getDownloadUrls }));

    const firstPage = await service.listRelatedDocuments({
      space: CDF_CDM_SPACE,
      externalId: 'PUMP-101',
    });

    expect(list).toHaveBeenCalledWith({
      instanceType: 'node',
      sources: [{ source: COGNITE_FILE_VIEW }],
      filter: {
        containsAny: {
          property: [...FILE_ASSETS_FILTER_PROPERTY],
          values: [{ space: CDF_CDM_SPACE, externalId: 'PUMP-101' }],
        },
      },
      limit: FILE_PAGE_SIZE,
      cursor: undefined,
    });
    expect(firstPage.documents.map((item) => item.externalId)).toEqual(['FILE-1']);
    expect(firstPage.nextCursor).toBe('page-2');

    const secondPage = await service.listRelatedDocuments(
      { space: CDF_CDM_SPACE, externalId: 'PUMP-101' },
      'page-2',
    );

    expect(list).toHaveBeenLastCalledWith(
      expect.objectContaining({ cursor: 'page-2', limit: FILE_PAGE_SIZE }),
    );
    expect(secondPage.documents.map((item) => item.externalId)).toEqual(['FILE-2']);
  });

  it('requests download URLs by instanceId', async () => {
    const list = vi.fn<CogniteClient['instances']['list']>();
    const getDownloadUrls = vi
      .fn<CogniteClient['files']['getDownloadUrls']>()
      .mockResolvedValue([
        {
          downloadUrl: 'https://download.test/file',
          instanceId: { space: CDF_CDM_SPACE, externalId: 'FILE-1' },
        },
      ]);

    const service = new CdfDocumentService(makeClient({ list }, { getDownloadUrls }));

    const url = await service.getDownloadUrl({
      space: CDF_CDM_SPACE,
      externalId: 'FILE-1',
    });

    expect(getDownloadUrls).toHaveBeenCalledWith([
      { instanceId: { space: CDF_CDM_SPACE, externalId: 'FILE-1' } },
    ]);
    expect(url).toBe('https://download.test/file');
  });
});
