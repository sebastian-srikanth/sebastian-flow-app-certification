// Component
export { CogniteFileViewer } from './CogniteFileViewer';

// Annotation overlay (for custom compositions)
export { getAnnotationColor, getAllAnnotationColors } from './annotationColors';
export { DocumentAnnotationOverlay } from './DocumentAnnotationOverlay';
export type { DocumentAnnotationOverlayProps } from './DocumentAnnotationOverlay';

// Hooks (for advanced / custom usage)
export { useBlobUrl } from './useBlobUrl';
export type { BlobUrlDependencies, UseBlobUrlResult } from './useBlobUrl';
export { useFileResolver } from './useFileResolver';
export { useDocumentAnnotations, clearAnnotationCache } from './useDocumentAnnotations';

// File resolution utilities
export { resolveFileDownloadConfig, clearFileCache, clearAllFileCache } from './fileResolution';

// MIME type utilities
export {
  getViewerType,
  getComputedMimeType,
  inferMimeTypeFromUrl,
  isNativelySupportedMimeType,
  doesDocumentPreviewApiSupportFile,
} from './mimeTypes';

// Types
export type {
  FileSource,
  FileViewerType,
  DocumentAnnotation,
  AnnotationResourceType,
  BoundingRect,
  OverlayRenderInfo,
  ResolvedFile,
  UseFileResolverResult,
  UseDocumentAnnotationsResult,
  CogniteFileViewerProps,
} from './types';
