import type { CogniteClient, EdgeDefinition } from '@cognite/sdk';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { clearAnnotationCache, useDocumentAnnotations } from './useDocumentAnnotations';

function makeAnnotationEdge(
  externalId: string,
  properties: Record<string, string | number>,
  endNode?: { space: string; externalId: string },
): EdgeDefinition {
  return {
    createdTime: 0,
    externalId,
    instanceType: 'edge',
    lastUpdatedTime: 0,
    space: 'cdf_cdm',
    version: 1,
    type: { space: 'cdf_cdm', externalId: 'diagrams.AssetLink' },
    startNode: { space: 'cdf_cdm', externalId: 'FILE-1' },
    endNode: endNode ?? { space: 'cdf_cdm', externalId: 'LINK-1' },
    properties: {
      cdf_cdm: {
        'CogniteDiagramAnnotation/v1': properties,
      },
    },
  } as EdgeDefinition;
}

function makeClient(edges: EdgeDefinition[]): CogniteClient {
  return {
    project: 'test-project',
    instances: {
      query: vi.fn<CogniteClient['instances']['query']>().mockResolvedValue({
        items: { annotations: edges },
        nextCursor: {},
      }),
    },
  } as unknown as CogniteClient;
}

describe(useDocumentAnnotations.name, () => {
  afterEach(() => {
    clearAnnotationCache();
  });

  it('returns empty state when disabled', () => {
    const client = makeClient([]);

    const { result } = renderHook(() =>
      useDocumentAnnotations(client, { space: 'cdf_cdm', externalId: 'FILE-1' }, 1, {
        enabled: false,
      }),
    );

    expect(result.current.annotations).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('fetches and filters annotations by page', async () => {
    const client = makeClient([
      makeAnnotationEdge(
        'ANN-1',
        {
          startNodeXMin: 0.1,
          startNodeXMax: 0.3,
          startNodeYMin: 0.2,
          startNodeYMax: 0.4,
          startNodePageNumber: 1,
          startNodeText: 'Pump',
        },
        { space: 'cdf_cdm', externalId: 'PUMP-1' },
      ),
      makeAnnotationEdge('ANN-2', {
        startNodeXMin: 0.5,
        startNodeXMax: 0.6,
        startNodeYMin: 0.5,
        startNodeYMax: 0.7,
        startNodePageNumber: 2,
      }),
    ]);

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) =>
        useDocumentAnnotations(client, { space: 'cdf_cdm', externalId: 'FILE-1' }, page),
      { initialProps: { page: 1 } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0]?.text).toBe('Pump');
    expect(result.current.annotations[0]?.linkedResource).toEqual({
      space: 'cdf_cdm',
      externalId: 'PUMP-1',
    });

    rerender({ page: 2 });
    expect(result.current.annotations).toHaveLength(1);
    expect(result.current.annotations[0]?.page).toBe(2);
  });

  it('uses cached annotations on subsequent renders', async () => {
    const query = vi.fn<CogniteClient['instances']['query']>().mockResolvedValue({
      items: {
        annotations: [
          makeAnnotationEdge('ANN-1', {
            startNodeXMin: 0,
            startNodeXMax: 0.1,
            startNodeYMin: 0,
            startNodeYMax: 0.1,
            startNodePageNumber: 1,
          }),
        ],
      },
      nextCursor: {},
    });
    const client = {
      project: 'test-project',
      instances: { query },
    } as unknown as CogniteClient;

    const { result, unmount } = renderHook(() =>
      useDocumentAnnotations(client, { space: 'cdf_cdm', externalId: 'FILE-1' }, 1),
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    unmount();

    renderHook(() =>
      useDocumentAnnotations(client, { space: 'cdf_cdm', externalId: 'FILE-1' }, 1),
    );

    expect(query).toHaveBeenCalledTimes(1);
  });

  it('reports fetch errors', async () => {
    const client = {
      project: 'test-project',
      instances: {
        query: vi.fn<CogniteClient['instances']['query']>().mockRejectedValue(new Error('DMS failed')),
      },
    } as unknown as CogniteClient;

    const { result } = renderHook(() =>
      useDocumentAnnotations(client, { space: 'cdf_cdm', externalId: 'FILE-1' }, 1),
    );

    await waitFor(() => expect(result.current.error?.message).toBe('DMS failed'));
    expect(result.current.annotations).toEqual([]);
  });
});
