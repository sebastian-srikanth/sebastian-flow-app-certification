import type { CogniteClient, FileInfo } from '@cognite/sdk';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAllFileCache } from './fileResolution';
import { useFileResolver } from './useFileResolver';

function makeClient(fileInfo: FileInfo): CogniteClient {
  return {
    project: 'test-project',
    files: {
      retrieve: vi.fn<CogniteClient['files']['retrieve']>().mockResolvedValue([fileInfo]),
    },
    post: vi.fn<CogniteClient['post']>().mockResolvedValue({
      data: { items: [{ downloadUrl: 'https://download.test/file.pdf' }] },
      status: 200,
      headers: {},
    } as Awaited<ReturnType<CogniteClient['post']>>),
    documents: {
      preview: {
        pdfTemporaryLink: vi
          .fn<CogniteClient['documents']['preview']['pdfTemporaryLink']>()
          .mockResolvedValue({
            temporaryLink: 'https://preview.test/file.pdf',
            expirationTime: Date.now(),
          }),
      },
    },
  } as unknown as CogniteClient;
}

describe(useFileResolver.name, () => {
  afterEach(() => {
    clearAllFileCache();
  });

  it('resolves URL sources without a client', async () => {
    const { result } = renderHook(() =>
      useFileResolver({ type: 'url', url: 'https://static.test/manual.pdf' }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.url).toBe('https://static.test/manual.pdf');
    expect(result.current.mimeType).toBe('application/pdf');
    expect(result.current.error).toBeNull();
  });

  it('resolves internalId sources via the Cognite client', async () => {
    const fileInfo: FileInfo = {
      id: 7,
      name: 'diagram.png',
      mimeType: 'image/png',
      uploaded: true,
      lastUpdatedTime: new Date(0),
      createdTime: new Date(0),
      instanceId: { space: 'cdf_cdm', externalId: 'FILE-7' },
    };
    const client = makeClient(fileInfo);

    const { result } = renderHook(() =>
      useFileResolver({ type: 'internalId', id: 7 }, client),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.url).toBe('https://download.test/file.pdf');
    expect(result.current.mimeType).toBe('image/png');
    expect(result.current.instanceId).toEqual({ space: 'cdf_cdm', externalId: 'FILE-7' });
  });

  it('reports an error when CDF sources lack a client', async () => {
    const { result } = renderHook(() =>
      useFileResolver({ type: 'internalId', id: 7 }),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error?.message).toBe(
      'CogniteClient is required for instanceId and internalId sources',
    );
  });

  it('resolves instanceId sources and falls back to caller instanceId', async () => {
    const fileInfo: FileInfo = {
      id: 9,
      name: 'manual.pdf',
      mimeType: 'application/pdf',
      uploaded: true,
      lastUpdatedTime: new Date(0),
      createdTime: new Date(0),
    };
    const client = makeClient(fileInfo);

    const { result } = renderHook(() =>
      useFileResolver(
        { type: 'instanceId', space: 'cdf_cdm', externalId: 'FILE-9' },
        client,
      ),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(client.files.retrieve).toHaveBeenCalledWith([
      { instanceId: { space: 'cdf_cdm', externalId: 'FILE-9' } },
    ]);
    expect(result.current.instanceId).toEqual({ space: 'cdf_cdm', externalId: 'FILE-9' });
  });
});
