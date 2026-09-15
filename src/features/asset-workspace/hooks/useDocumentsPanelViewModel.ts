import { useInfiniteQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import { FILE_VISIBLE_INCREMENT } from '../documents/constants';
import {
  getDocumentDownloadErrorMessage,
  getDocumentErrorMessage,
  isAccessDeniedError,
} from '../documents/documentErrors';
import {
  documentRefKey,
  sortDocumentsByRecency,
} from '../documents/documentProperties';
import type { DocumentSummary } from '../documents/types';
import { useDocumentService } from '../state/documentServiceContext';
import { useAppState } from '../state/useAppState';
import type { AssetRef } from '../types';

export type DocumentsPanelStatus =
  | 'idle'
  | 'loading'
  | 'error'
  | 'no-access'
  | 'empty'
  | 'ready';

export type DocumentsPanelViewModel = {
  status: DocumentsPanelStatus;
  documents: DocumentSummary[];
  visibleDocuments: DocumentSummary[];
  previewDocument: DocumentSummary | null;
  errorMessage: string | null;
  canLoadMore: boolean;
  isFetchingMore: boolean;
  downloadingKey: string | null;
  downloadErrorByKey: Readonly<Record<string, string>>;
  selectPreviewDocument: (document: DocumentSummary | null) => void;
  downloadDocument: (document: DocumentSummary) => void;
  loadMore: () => void;
  retry: () => void;
};

type DocumentsPanelViewModelDeps = {
  useAppState: typeof useAppState;
  useDocumentService: typeof useDocumentService;
  openUrl: (url: string) => void;
};

/**
 * `noopener,noreferrer` keeps the signed CDF download URL out of the opened tab's
 * `window.opener` and `Referer`.
 */
function openInNewTab(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

const defaultDeps: DocumentsPanelViewModelDeps = {
  useAppState,
  useDocumentService,
  openUrl: openInNewTab,
};

export const DocumentsPanelViewModelContext =
  createContext<DocumentsPanelViewModelDeps>(defaultDeps);

const manualQueryOptions = {
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
  refetchInterval: false as const,
  staleTime: Number.POSITIVE_INFINITY,
};

export function useDocumentsPanelViewModel(): DocumentsPanelViewModel {
  const {
    useAppState: useAppStateDep,
    useDocumentService: useDocumentServiceDep,
    openUrl,
  } = useContext(DocumentsPanelViewModelContext);
  const { state } = useAppStateDep();
  const documentService = useDocumentServiceDep();

  const selectedAsset = state.selectedAsset;
  const [visibleCount, setVisibleCount] = useState(FILE_VISIBLE_INCREMENT);
  const [previewDocument, setPreviewDocument] = useState<DocumentSummary | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadErrorByKey, setDownloadErrorByKey] = useState<Record<string, string>>({});

  const documentsQuery = useInfiniteQuery({
    queryKey: ['related-documents', selectedAsset?.space, selectedAsset?.externalId],
    queryFn: ({ pageParam }) =>
      documentService.listRelatedDocuments(selectedAsset as AssetRef, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: Boolean(selectedAsset),
    ...manualQueryOptions,
    staleTime: 0,
  });

  const documents = useMemo(() => {
    const merged = documentsQuery.data?.pages.flatMap((page) => page.documents) ?? [];
    return sortDocumentsByRecency(merged);
  }, [documentsQuery.data?.pages]);

  const visibleDocuments = useMemo(
    () => documents.slice(0, visibleCount),
    [documents, visibleCount],
  );

  const hasHiddenFetchedDocuments = visibleCount < documents.length;
  const hasNextServerPage = Boolean(documentsQuery.hasNextPage);
  const canLoadMore = hasHiddenFetchedDocuments || hasNextServerPage;

  const loadMore = useCallback(() => {
    if (visibleCount < documents.length) {
      setVisibleCount((current) => current + FILE_VISIBLE_INCREMENT);
      return;
    }

    if (documentsQuery.hasNextPage && !documentsQuery.isFetchingNextPage) {
      void documentsQuery.fetchNextPage().then(() => {
        setVisibleCount((current) => current + FILE_VISIBLE_INCREMENT);
      });
    }
  }, [documents.length, documentsQuery, visibleCount]);

  const retry = useCallback(() => {
    setVisibleCount(FILE_VISIBLE_INCREMENT);
    setPreviewDocument(null);
    setDownloadErrorByKey({});
    void documentsQuery.refetch();
  }, [documentsQuery]);

  const selectPreviewDocument = useCallback((document: DocumentSummary | null) => {
    setPreviewDocument(document);
  }, []);

  const downloadDocument = useCallback(
    (document: DocumentSummary) => {
      const key = documentRefKey(document);

      setDownloadErrorByKey((current) => {
        if (!(key in current)) return current;
        const { [key]: _removed, ...rest } = current;
        return rest;
      });
      setDownloadingKey(key);

      void (async () => {
        try {
          const downloadUrl = await documentService.getDownloadUrl({
            space: document.space,
            externalId: document.externalId,
          });
          openUrl(downloadUrl);
        } catch (error) {
          setDownloadErrorByKey((current) => ({
            ...current,
            [key]: getDocumentDownloadErrorMessage(error),
          }));
        } finally {
          setDownloadingKey((current) => (current === key ? null : current));
        }
      })();
    },
    [documentService, openUrl],
  );

  const status: DocumentsPanelStatus = useMemo(() => {
    if (!selectedAsset) return 'idle';
    if (documentsQuery.isLoading) return 'loading';
    if (documentsQuery.isError) {
      return isAccessDeniedError(documentsQuery.error) ? 'no-access' : 'error';
    }
    if (documents.length === 0) return 'empty';
    return 'ready';
  }, [
    selectedAsset,
    documentsQuery.isLoading,
    documentsQuery.isError,
    documentsQuery.error,
    documents.length,
  ]);

  const errorMessage = useMemo(() => {
    if (!documentsQuery.error) return null;
    return getDocumentErrorMessage(documentsQuery.error);
  }, [documentsQuery.error]);

  return {
    status,
    documents,
    visibleDocuments,
    previewDocument,
    errorMessage,
    canLoadMore,
    isFetchingMore: documentsQuery.isFetchingNextPage,
    downloadingKey,
    downloadErrorByKey,
    selectPreviewDocument,
    downloadDocument,
    loadMore,
    retry,
  };
}

export function getDocumentRowKey(document: DocumentSummary): string {
  return documentRefKey(document);
}
