import type { CogniteClient, EdgeDefinition } from '@cognite/sdk';
import { useState, useEffect, useRef, useMemo } from 'react';

import type {
  DocumentAnnotation,
  AnnotationResourceType,
  UseDocumentAnnotationsResult,
} from './types';

import { cdfTaskRunner } from '@/lib/cdfTaskRunner';

// ============================================================================
// CDM constants
// ============================================================================

const CDM_SPACE = 'cdf_cdm';
const CDM_VERSION = 'v1';
const DIAGRAM_ANNOTATION_VIEW = 'CogniteDiagramAnnotation';
const QUERY_PAGE_SIZE = 1_000;
const MAX_QUERY_PAGES = 5;
const MAX_ANNOTATIONS = QUERY_PAGE_SIZE * MAX_QUERY_PAGES;

// ============================================================================
// Cache — stores ALL annotations for a file, filtered by page at read time
// ============================================================================

const STALE_TIME = 5 * 60 * 1000; // 5 minutes
const MAX_CACHE_SIZE = 50;

interface CacheEntry {
  data: DocumentAnnotation[];
  truncated: boolean;
  timestamp: number;
}

const annotationCache = new Map<string, CacheEntry>();

/** Cache key scoped by project + file instance. */
function fileCacheKey(project: string, space: string, externalId: string): string {
  return JSON.stringify([project, space, externalId]);
}

function evictStaleAnnotations(): void {
  const now = Date.now();
  for (const [key, entry] of annotationCache) {
    if (now - entry.timestamp > STALE_TIME) annotationCache.delete(key);
  }
  if (annotationCache.size > MAX_CACHE_SIZE) {
    for (const key of Array.from(annotationCache.keys()).slice(0, annotationCache.size - MAX_CACHE_SIZE)) {
      annotationCache.delete(key);
    }
  }
}

export function clearAnnotationCache(): void {
  annotationCache.clear();
}

// ============================================================================
// Helpers
// ============================================================================

interface CdmAnnotationProps {
  status?: string;
  startNodeText?: string;
  startNodeYMax?: number;
  startNodeYMin?: number;
  startNodeXMax?: number;
  startNodeXMin?: number;
  startNodePageNumber?: number;
}

function getResourceType(annotationType: string): AnnotationResourceType {
  const lower = annotationType.toLowerCase();
  if (lower.includes('asset')) return 'asset';
  if (lower.includes('file')) return 'file';
  if (lower.includes('timeseries') || lower.includes('time_series'))
    return 'timeSeries';
  if (lower.includes('sequence')) return 'sequence';
  if (lower.includes('event')) return 'event';
  if (lower.includes('diagram')) return 'diagram';
  return 'unknown';
}

// ============================================================================
// Fetcher — fetches ALL annotations for a file (not per-page)
// ============================================================================

interface AnnotationFetchResult {
  annotations: DocumentAnnotation[];
  truncated: boolean;
}

async function fetchAllAnnotations(
  client: CogniteClient,
  space: string,
  externalId: string,
): Promise<AnnotationFetchResult> {
  const containerId = `${space}:${externalId}`;
  const propPath = `${DIAGRAM_ANNOTATION_VIEW}/${CDM_VERSION}`;

  const allEdges: EdgeDefinition[] = [];
  let cursor: string | undefined;
  let queryPages = 0;

  do {
    const remaining = MAX_ANNOTATIONS - allEdges.length;
    const queryLimit = Math.min(QUERY_PAGE_SIZE, remaining);
    const queryPayload: Parameters<CogniteClient['instances']['query']>[0] = {
      with: {
        files: {
          nodes: {
            filter: {
              and: [
                {
                  equals: {
                    property: ['node', 'externalId'],
                    value: externalId,
                  },
                },
                {
                  equals: {
                    property: ['node', 'space'],
                    value: space,
                  },
                },
              ],
            },
          },
        },
        annotations: {
          edges: {
            from: 'files',
            direction: 'outwards',
          },
          limit: queryLimit,
        },
      },
      select: {
        annotations: {
          sources: [
            {
              source: {
                externalId: DIAGRAM_ANNOTATION_VIEW,
                space: CDM_SPACE,
                type: 'view' as const,
                version: CDM_VERSION,
              },
              properties: [
                'status',
                'startNodeText',
                'startNodeYMax',
                'startNodeYMin',
                'startNodeXMax',
                'startNodeXMin',
                'startNodePageNumber',
              ],
            },
          ],
          limit: queryLimit,
        },
      },
      cursors: cursor ? { annotations: cursor } : undefined,
    };

    const response = await cdfTaskRunner.schedule(() => client.instances.query(queryPayload));

    const edges = (response.items?.annotations ?? []).filter(
      (a) => a.instanceType === 'edge',
    );
    allEdges.push(...edges.slice(0, remaining));

    cursor = response.nextCursor?.annotations || undefined;
    queryPages += 1;
  } while (
    cursor &&
    queryPages < MAX_QUERY_PAGES &&
    allEdges.length < MAX_ANNOTATIONS
  );

  const annotations = allEdges.flatMap((edge) => {
    const props: CdmAnnotationProps | undefined =
      edge.properties?.[CDM_SPACE]?.[propPath];
    if (!props) return [];
    if (props.status === 'Rejected') return [];

    const xMin = Number(props.startNodeXMin ?? 0);
    const xMax = Number(props.startNodeXMax ?? 0);
    const yMin = Number(props.startNodeYMin ?? 0);
    const yMax = Number(props.startNodeYMax ?? 0);

    const annotationType =
      edge.type?.externalId ?? 'diagrams.AssetLink';

    const annotation: DocumentAnnotation = {
      id: `${containerId}-${edge.space}-${edge.externalId}`,
      x: Math.min(xMin, xMax),
      y: Math.min(yMin, yMax),
      width: Math.abs(xMax - xMin),
      height: Math.abs(yMax - yMin),
      page: Number(props.startNodePageNumber ?? 1),
      resourceType: getResourceType(annotationType),
      linkedResource: edge.endNode
        ? { space: edge.endNode.space, externalId: edge.endNode.externalId }
        : undefined,
      text: props.startNodeText ?? undefined,
      annotationType,
    };
    return [annotation];
  });

  return { annotations, truncated: cursor !== undefined };
}

// ============================================================================
// Hook
// ============================================================================

interface AnnotationState {
  allAnnotations: DocumentAnnotation[];
  isLoading: boolean;
  error: Error | null;
  truncated: boolean;
}

const INITIAL_STATE: AnnotationState = {
  allAnnotations: [],
  isLoading: false,
  error: null,
  truncated: false,
};

export function useDocumentAnnotations(
  client: CogniteClient | undefined,
  instanceId: { space: string; externalId: string } | undefined,
  currentPage: number = 1,
  options?: { enabled?: boolean },
): UseDocumentAnnotationsResult {
  const enabled = options?.enabled ?? true;
  const [state, setState] = useState<AnnotationState>(INITIAL_STATE);
  const cancelRef = useRef(0);

  const space = instanceId?.space;
  const extId = instanceId?.externalId;
  const project = client?.project;

  // Fetch all annotations for the file (not per-page)
  useEffect(() => {
    const id = ++cancelRef.current;
    if (!enabled || !client || !space || !extId || !project) {
      return;
    }

    const queryClient = client;
    const querySpace = space;
    const queryExternalId = extId;
    const queryProject = project;
    const cancelled = () => id !== cancelRef.current;

    async function loadAnnotations(): Promise<void> {
      const key = fileCacheKey(queryProject, querySpace, queryExternalId);
      const cached = annotationCache.get(key);
      if (cached && Date.now() - cached.timestamp < STALE_TIME) {
        setState({
          allAnnotations: cached.data,
          isLoading: false,
          error: null,
          truncated: cached.truncated,
        });
        return;
      }

      setState({
        allAnnotations: [],
        isLoading: true,
        error: null,
        truncated: false,
      });

      try {
        const { annotations, truncated } = await fetchAllAnnotations(
          queryClient,
          querySpace,
          queryExternalId,
        );
        if (cancelled()) return;
        annotationCache.set(key, {
          data: annotations,
          truncated,
          timestamp: Date.now(),
        });
        evictStaleAnnotations();
        setState({
          allAnnotations: annotations,
          isLoading: false,
          error: null,
          truncated,
        });
      } catch (error: unknown) {
        if (cancelled()) return;
        setState({
          allAnnotations: [],
          isLoading: false,
          error: error instanceof Error ? error : new Error(String(error)),
          truncated: false,
        });
      }
    }

    void loadAnnotations();
  }, [client, project, space, extId, enabled]);

  // Filter by current page (cheap client-side filter on cached data)
  const annotations = useMemo(
    () => state.allAnnotations.filter((a) => a.page === currentPage),
    [state.allAnnotations, currentPage],
  );

  if (!enabled || !client || !space || !extId || !project) {
    return {
      annotations: [],
      isLoading: false,
      error: null,
      truncated: false,
    };
  }

  return {
    annotations,
    isLoading: state.isLoading,
    error: state.error,
    truncated: state.truncated,
  };
}
