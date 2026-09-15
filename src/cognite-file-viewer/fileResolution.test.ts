import type { CogniteClient, FileInfo } from '@cognite/sdk';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  clearAllFileCache,
  clearFileCache,
  resolveFileDownloadConfig,
} from './fileResolution';

function makeFile(overrides: Partial<FileInfo> = {}): FileInfo {
  return {
    id: 42,
    name: 'manual.pdf',
    mimeType: 'application/pdf',
    uploaded: true,
    lastUpdatedTime: new Date(0),
    createdTime: new Date(0),
    ...overrides,
  };
}

function makeClient(postImpl?: ReturnType<typeof vi.fn>): CogniteClient {
  const post =
    postImpl ??
    vi.fn().mockResolvedValue({
      data: { items: [{ downloadUrl: 'https://download.test/file.pdf' }] },
      status: 200,
      headers: {},
    });

  return {
    project: 'test-project',
    post,
    documents: {
      preview: {
        pdfTemporaryLink: vi.fn().mockResolvedValue({
          temporaryLink: 'https://preview.test/file.pdf',
          expirationTime: Date.now(),
        }),
      },
    },
  } as unknown as CogniteClient;
}

describe('fileResolution', () => {
  afterEach(() => {
    clearAllFileCache();
  });

  it('resolves natively supported files via extended download link', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { items: [{ downloadUrl: 'https://download.test/manual.pdf' }] },
      status: 200,
      headers: {},
    });
    const client = makeClient(post);

    const resolved = await resolveFileDownloadConfig(client, makeFile());

    expect(post).toHaveBeenCalledWith(
      '/api/v1/projects/test-project/files/downloadlink',
      {
        data: { items: [{ id: 42 }] },
        params: { extendedExpiration: true },
      },
    );
    expect(resolved).toEqual({
      url: 'https://download.test/manual.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('resolves office documents via Document Preview API', async () => {
    const pdfTemporaryLink = vi.fn().mockResolvedValue({
      temporaryLink: 'https://preview.test/report.pdf',
      expirationTime: Date.now(),
    });
    const client = makeClient();
    client.documents.preview.pdfTemporaryLink = pdfTemporaryLink;

    const resolved = await resolveFileDownloadConfig(
      client,
      makeFile({ name: 'report.docx', mimeType: undefined }),
    );

    expect(pdfTemporaryLink).toHaveBeenCalledWith(42);
    expect(resolved).toEqual({
      url: 'https://preview.test/report.pdf',
      mimeType: 'application/pdf',
    });
  });

  it('returns cached results without re-fetching', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { items: [{ downloadUrl: 'https://download.test/cached.pdf' }] },
      status: 200,
      headers: {},
    });
    const client = makeClient(post);

    await resolveFileDownloadConfig(client, makeFile());
    await resolveFileDownloadConfig(client, makeFile());

    expect(post).toHaveBeenCalledTimes(1);
  });

  it('clears cache entries for a file', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { items: [{ downloadUrl: 'https://download.test/cached.pdf' }] },
      status: 200,
      headers: {},
    });
    const client = makeClient(post);

    await resolveFileDownloadConfig(client, makeFile());
    clearFileCache(42, 'test-project');
    await resolveFileDownloadConfig(client, makeFile());

    expect(post).toHaveBeenCalledTimes(2);
  });

  it('throws for unsupported file types', async () => {
    const client = makeClient();

    await expect(
      resolveFileDownloadConfig(
        client,
        makeFile({ name: 'archive.zip', mimeType: 'application/zip' }),
      ),
    ).rejects.toThrow('Unsupported file type');
  });

  it('throws when download URL is missing', async () => {
    const post = vi.fn().mockResolvedValue({
      data: { items: [] },
      status: 200,
      headers: {},
    });
    const client = makeClient(post);

    await expect(resolveFileDownloadConfig(client, makeFile())).rejects.toThrow(
      'No download URL for file 42',
    );
  });
});
