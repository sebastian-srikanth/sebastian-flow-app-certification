import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BlobUrlDependencies } from './useBlobUrl';
import { useBlobUrl } from './useBlobUrl';

function makeDependencies(response: Response): {
  dependencies: BlobUrlDependencies;
  createObjectUrl: ReturnType<typeof vi.fn>;
  revokeObjectUrl: ReturnType<typeof vi.fn>;
} {
  const createObjectUrl = vi.fn(() => 'blob:https://viewer.test/file');
  const revokeObjectUrl = vi.fn();

  return {
    dependencies: {
      fetch: vi.fn(() => Promise.resolve(response)),
      createAbortController: () => new AbortController(),
      createObjectUrl,
      revokeObjectUrl,
    },
    createObjectUrl,
    revokeObjectUrl,
  };
}

describe(useBlobUrl.name, () => {
  it('creates an object URL for a successful response', async () => {
    const response = new Response(new Blob(['image'], { type: 'image/png' }));
    const { dependencies, createObjectUrl } = makeDependencies(response);

    const { result } = renderHook(() =>
      useBlobUrl('https://files.test/diagram.png', dependencies),
    );

    await waitFor(() =>
      expect(result.current.blobUrl).toBe('blob:https://viewer.test/file'),
    );
    expect(result.current.error).toBeNull();
    expect(createObjectUrl).toHaveBeenCalledOnce();
    expect(dependencies.fetch).toHaveBeenCalledWith(
      'https://files.test/diagram.png',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('reports a non-successful response without creating an object URL', async () => {
    const { dependencies, createObjectUrl } = makeDependencies(
      new Response(null, { status: 503 }),
    );

    const { result } = renderHook(() =>
      useBlobUrl('https://files.test/unavailable.png', dependencies),
    );

    await waitFor(() => expect(result.current.error?.message).toBe('HTTP 503'));
    expect(result.current.blobUrl).toBeNull();
    expect(createObjectUrl).not.toHaveBeenCalled();
  });

  it('aborts the request and revokes the object URL on cleanup', async () => {
    const { dependencies, revokeObjectUrl } = makeDependencies(
      new Response(new Blob(['image'], { type: 'image/png' })),
    );
    const abort = vi.fn();
    dependencies.createAbortController = () => ({
      abort,
      signal: new AbortController().signal,
    });

    const { result, unmount } = renderHook(() =>
      useBlobUrl('https://files.test/diagram.png', dependencies),
    );
    await waitFor(() => expect(result.current.blobUrl).not.toBeNull());

    unmount();

    expect(abort).toHaveBeenCalledOnce();
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:https://viewer.test/file');
  });
});
