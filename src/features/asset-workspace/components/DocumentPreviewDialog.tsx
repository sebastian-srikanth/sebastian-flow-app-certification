import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Button } from '@cognite/aura/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@cognite/aura/components/dialog';
import { Loader } from '@cognite/aura/components/loader';
import {
  IconChevronLeft,
  IconChevronRight,
  IconZoomIn,
  IconZoomOut,
  IconZoomReset,
} from '@tabler/icons-react';
import { Suspense, lazy, useState } from 'react';

import { getDocumentDisplayName } from '../documents/documentProperties';
import type { DocumentSummary } from '../documents/types';

import { useCogniteSdk } from '@/host/useFusionHost';

/*
 * The viewer pulls in react-pdf and pdfjs-dist, which together dominate the bundle. Loading it on
 * demand keeps the initial chunk small; the dialog is the only entry point and it already renders a
 * loading state, so the extra request is not user-visible beyond the existing spinner.
 */
const CogniteFileViewer = lazy(async () => ({
  default: (await import('@/cognite-file-viewer')).CogniteFileViewer,
}));

function PreviewLoading() {
  return (
    <div className="inline-flex items-center gap-2 p-4 text-muted-foreground">
      <Loader size={20} />
      <span>Loading preview…</span>
    </div>
  );
}

type DocumentPreviewDialogProps = {
  document: DocumentSummary | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 5;
const ZOOM_STEP = 0.25;

function clampZoom(value: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value));
}

function DocumentPreviewContent({ document }: { document: DocumentSummary }) {
  const client = useCogniteSdk();
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [rotation] = useState<0 | 90 | 180 | 270>(0);

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Preview controls">
        {/* onDocumentLoad only fires for PDFs, so paging is offered only once numPages is known. */}
        {numPages > 0 ? (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              aria-label="Previous page"
            >
              <IconChevronLeft aria-hidden className="size-4" />
            </Button>
            <span className="min-w-24 text-center text-sm text-muted-foreground" aria-live="polite">
              Page {page} of {numPages}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page >= numPages}
              onClick={() => setPage((current) => Math.min(numPages, current + 1))}
              aria-label="Next page"
            >
              <IconChevronRight aria-hidden className="size-4" />
            </Button>
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((current) => clampZoom(current - ZOOM_STEP))}
            aria-label="Zoom out"
          >
            <IconZoomOut aria-hidden className="size-4" />
          </Button>
          <span className="min-w-14 text-center text-sm text-muted-foreground" aria-live="polite">
            {zoomPercent}%
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((current) => clampZoom(current + ZOOM_STEP))}
            aria-label="Zoom in"
          >
            <IconZoomIn aria-hidden className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={zoom === 1}
            onClick={() => setZoom(1)}
            aria-label="Reset zoom"
          >
            <IconZoomReset aria-hidden className="size-4" />
          </Button>
        </div>
      </div>

      <div className="h-[min(70vh,640px)] w-full overflow-hidden rounded-md border bg-muted/30">
        <Suspense fallback={<PreviewLoading />}>
          <CogniteFileViewer
            source={{
              type: 'instanceId',
              space: document.space,
              externalId: document.externalId,
            }}
            client={client}
            page={page}
            onPageChange={setPage}
            onDocumentLoad={({ numPages: loadedPages }) => setNumPages(loadedPages)}
            zoom={zoom}
            onZoomChange={setZoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            rotation={rotation}
            fitMode="width"
            showAnnotations={true}
            style={{ width: '100%', height: '100%' }}
            renderLoading={() => <PreviewLoading />}
            renderError={(error) => (
              <Alert variant="error" className="m-4">
                <AlertDescription>Failed to load preview: {error.message}</AlertDescription>
              </Alert>
            )}
            renderUnsupported={(mimeType) => (
              <Alert variant="secondary" className="m-4">
                <AlertDescription>
                  Inline preview is not available for this file type
                  {mimeType ? ` (${mimeType})` : ''}.
                </AlertDescription>
              </Alert>
            )}
          />
        </Suspense>
      </div>
    </div>
  );
}

export function DocumentPreviewDialog({
  document,
  open,
  onOpenChange,
}: DocumentPreviewDialogProps) {
  const displayName = document ? getDocumentDisplayName(document) : '';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{displayName}</DialogTitle>
          <DialogDescription>
            Document preview. Close to return to the asset view.
          </DialogDescription>
        </DialogHeader>

        {document && open ? (
          <DocumentPreviewContent
            key={`${document.space}:${document.externalId}`}
            document={document}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
