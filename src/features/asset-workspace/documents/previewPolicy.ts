const INLINE_PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
]);

const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
};

function getFileExtension(value: string): string {
  const clean = value.split('#')[0].split('?')[0];
  const filename = clean.split('/').pop() ?? '';
  const lastDot = filename.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === filename.length - 1) return '';
  return filename.slice(lastDot + 1).toLowerCase();
}

function canonicaliseMimeType(mimeType: string): string {
  if (mimeType === 'image/jpg') return 'image/jpeg';
  return mimeType.toLowerCase();
}

function inferMimeFromFilename(filename: string): string | undefined {
  const extension = getFileExtension(filename);
  return extension ? EXTENSION_TO_MIME[extension] : undefined;
}

/**
 * Resolve the effective MIME type for preview policy decisions.
 * Uses mimeType when present; for generic/absent MIME, conservatively infers from filename.
 */
export function resolveEffectiveMimeType(
  mimeType: string | undefined,
  displayName: string,
): string | undefined {
  if (mimeType && mimeType.length > 0) {
    const canonical = canonicaliseMimeType(mimeType);
    if (canonical !== 'application/octet-stream') return canonical;
  }

  return inferMimeFromFilename(displayName);
}

export function isInlinePreviewAllowed(
  mimeType: string | undefined,
  displayName: string,
): boolean {
  const effective = resolveEffectiveMimeType(mimeType, displayName);
  if (!effective) return false;
  return INLINE_PREVIEW_MIME_TYPES.has(canonicaliseMimeType(effective));
}

export const V1_INLINE_PREVIEW_MIME_TYPES = [...INLINE_PREVIEW_MIME_TYPES];
