import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import { Loader } from '@cognite/aura/components/loader';
import {
  IconFile,
  IconFileTypePdf,
  IconPhoto,
} from '@tabler/icons-react';

import { getSecondaryExternalId } from '../displayLabels';
import {
  formatDocumentTimestamp,
  getDocumentDisplayName,
  getDocumentTimestamp,
  getDocumentTypeLabel,
  isDocumentContentAvailable,
} from '../documents/documentProperties';
import { isInlinePreviewAllowed } from '../documents/previewPolicy';
import type { DocumentSummary } from '../documents/types';
import {
  getDocumentRowKey,
  useDocumentsPanelViewModel,
} from '../hooks/useDocumentsPanelViewModel';

import { DocumentPreviewDialog } from './DocumentPreviewDialog';
import { WorkspaceSection } from './WorkspaceSection';

function DocumentTypeIcon({ typeLabel }: { typeLabel: string }) {
  if (typeLabel === 'PDF') {
    return <IconFileTypePdf aria-hidden className="size-5 shrink-0 text-muted-foreground" />;
  }
  if (typeLabel === 'PNG' || typeLabel === 'JPEG' || typeLabel === 'GIF' || typeLabel === 'WEBP') {
    return <IconPhoto aria-hidden className="size-5 shrink-0 text-muted-foreground" />;
  }
  return <IconFile aria-hidden className="size-5 shrink-0 text-muted-foreground" />;
}

function DocumentRow({
  document,
  isDownloading,
  downloadError,
  onPreview,
  onDownload,
}: {
  document: DocumentSummary;
  isDownloading: boolean;
  downloadError: string | undefined;
  onPreview: (document: DocumentSummary) => void;
  onDownload: (document: DocumentSummary) => void;
}) {
  const displayName = getDocumentDisplayName(document);
  const typeLabel = getDocumentTypeLabel(document);
  const timestamp = getDocumentTimestamp(document);
  const contentAvailable = isDocumentContentAvailable(document);
  const canPreview =
    contentAvailable && isInlinePreviewAllowed(document.mimeType, displayName);
  const secondaryId = getSecondaryExternalId(document.name, document.externalId);

  return (
    <li className="min-w-0 rounded-md border">
      <div className="grid min-w-0 gap-3 p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4">
        <DocumentTypeIcon typeLabel={typeLabel} />

        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="break-words font-medium leading-snug">{displayName}</span>
            <Badge variant="nordic" className="shrink-0">
              {typeLabel}
            </Badge>
          </div>

          {document.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{document.description}</p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            {timestamp ? (
              <span>
                {timestamp.label} {formatDocumentTimestamp(timestamp.timestampMs)}
              </span>
            ) : (
              <span>No timestamp available</span>
            )}
            {secondaryId ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate font-mono">{secondaryId}</span>
              </>
            ) : null}
            {document.sourceContext ? (
              <>
                <span aria-hidden>·</span>
                <span className="truncate">{document.sourceContext}</span>
              </>
            ) : null}
          </div>

          {!contentAvailable ? (
            <p className="mt-1 text-xs text-muted-foreground">Content not uploaded</p>
          ) : null}

          {!canPreview && contentAvailable ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Preview not available for this file type — use Open to download.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
          {canPreview ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onPreview(document)}
              aria-label={`Preview ${displayName}`}
            >
              Preview
            </Button>
          ) : null}

          {contentAvailable ? (
            <Button
              type="button"
              variant={canPreview ? 'ghost' : 'outline'}
              size="sm"
              onClick={() => onDownload(document)}
              disabled={isDownloading}
              aria-label={`Open ${displayName}`}
            >
              {isDownloading ? 'Opening…' : 'Open'}
            </Button>
          ) : null}
        </div>
      </div>

      {downloadError !== undefined ? (
        <div className="border-t px-3 py-2">
          <Alert variant="error">
            <AlertDescription>{downloadError}</AlertDescription>
          </Alert>
        </div>
      ) : null}
    </li>
  );
}

type DocumentsPanelProps = {
  isLast?: boolean;
};

export function DocumentsPanel({ isLast = false }: DocumentsPanelProps) {
  const viewModel = useDocumentsPanelViewModel();
  const {
    status,
    visibleDocuments,
    previewDocument,
    errorMessage,
    canLoadMore,
    isFetchingMore,
    downloadingKey,
    downloadErrorByKey,
    selectPreviewDocument,
    downloadDocument,
    loadMore,
    retry,
  } = viewModel;

  return (
    <>
      <WorkspaceSection
        title="Documents"
        description="Manuals, P&IDs, inspection reports, and other files linked to this asset."
        aria-label="Documents panel"
        isLast={isLast}
      >
        {status === 'loading' && (
          <div className="inline-flex items-center gap-2 text-muted-foreground" aria-live="polite">
            <Loader size={20} />
            <span>Loading related documents…</span>
          </div>
        )}

        {status === 'no-access' && (
          <Alert variant="secondary">
            <AlertDescription>
              You do not have access to document data for this asset. Contact your CDF
              administrator if you believe this is incorrect.
            </AlertDescription>
          </Alert>
        )}

        {status === 'error' && (
          <div className="flex flex-col gap-3">
            <Alert variant="error">
              <AlertDescription>
                {errorMessage ?? 'Unable to load documents for this asset.'}
              </AlertDescription>
            </Alert>
            <Button type="button" variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        )}

        {status === 'empty' && (
          <Alert variant="secondary">
            <AlertDescription>No documents are linked to this asset.</AlertDescription>
          </Alert>
        )}

        {visibleDocuments.length > 0 && status !== 'loading' && (
          <ul className="flex min-w-0 flex-col gap-2 overflow-hidden">
            {visibleDocuments.map((document) => {
              const rowKey = getDocumentRowKey(document);
              return (
                <DocumentRow
                  key={rowKey}
                  document={document}
                  isDownloading={downloadingKey === rowKey}
                  downloadError={downloadErrorByKey[rowKey]}
                  onPreview={selectPreviewDocument}
                  onDownload={downloadDocument}
                />
              );
            })}
          </ul>
        )}

        {canLoadMore && status === 'ready' && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={isFetchingMore}
            className="mt-2"
          >
            {isFetchingMore ? 'Loading more…' : 'Load more'}
          </Button>
        )}
      </WorkspaceSection>

      <DocumentPreviewDialog
        document={previewDocument}
        open={previewDocument !== null}
        onOpenChange={(open) => {
          if (!open) selectPreviewDocument(null);
        }}
      />
    </>
  );
}
