import { describe, expect, it } from 'vitest';

import {
  V1_INLINE_PREVIEW_MIME_TYPES,
  isInlinePreviewAllowed,
  resolveEffectiveMimeType,
} from './previewPolicy';

describe('previewPolicy', () => {
  it('allows inline preview for v1 MIME types', () => {
    expect(isInlinePreviewAllowed('application/pdf', 'manual.pdf')).toBe(true);
    expect(isInlinePreviewAllowed('image/png', 'diagram.png')).toBe(true);
    expect(isInlinePreviewAllowed('image/jpeg', 'photo.jpg')).toBe(true);
    expect(isInlinePreviewAllowed('image/jpg', 'photo.jpg')).toBe(true);
    expect(isInlinePreviewAllowed('image/gif', 'animation.gif')).toBe(true);
    expect(isInlinePreviewAllowed('image/webp', 'scan.webp')).toBe(true);
  });

  it('does not allow inline preview for office, CAD, text, or video types', () => {
    expect(
      isInlinePreviewAllowed(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'report.docx',
      ),
    ).toBe(false);
    expect(isInlinePreviewAllowed('application/dwg', 'drawing.dwg')).toBe(false);
    expect(isInlinePreviewAllowed('text/plain', 'notes.txt')).toBe(false);
    expect(isInlinePreviewAllowed('video/mp4', 'clip.mp4')).toBe(false);
  });

  it('uses conservative filename extension fallback for generic MIME types', () => {
    expect(isInlinePreviewAllowed('application/octet-stream', 'manual.pdf')).toBe(true);
    expect(isInlinePreviewAllowed('application/octet-stream', 'notes.txt')).toBe(false);
  });

  it('does not allow unsafe MIME types to bypass the allow-list', () => {
    expect(isInlinePreviewAllowed('image/svg+xml', 'icon.svg')).toBe(false);
    expect(isInlinePreviewAllowed('text/html', 'page.html')).toBe(false);
  });

  it('refuses preview when neither the MIME type nor the filename identifies a format', () => {
    expect(isInlinePreviewAllowed(undefined, 'attachment')).toBe(false);
    expect(isInlinePreviewAllowed('', 'attachment')).toBe(false);
    expect(isInlinePreviewAllowed('application/octet-stream', 'attachment')).toBe(false);
  });

  it('canonicalises and upper-cases MIME types before matching', () => {
    expect(resolveEffectiveMimeType('image/jpg', 'photo.jpg')).toBe('image/jpeg');
    expect(resolveEffectiveMimeType('APPLICATION/PDF', 'manual.pdf')).toBe('application/pdf');
    expect(isInlinePreviewAllowed('IMAGE/PNG', 'diagram.png')).toBe(true);
  });

  it('parses filenames defensively when inferring from the extension', () => {
    expect(resolveEffectiveMimeType(undefined, 'manual.PDF')).toBe('application/pdf');
    expect(resolveEffectiveMimeType(undefined, '/docs/manuals/pump.pdf?v=2#page=3')).toBe(
      'application/pdf',
    );
    // Dotfiles, trailing dots and extensionless names must not be treated as a format.
    expect(resolveEffectiveMimeType(undefined, '.pdf')).toBeUndefined();
    expect(resolveEffectiveMimeType(undefined, 'manual.')).toBeUndefined();
    expect(resolveEffectiveMimeType(undefined, 'manual')).toBeUndefined();
    expect(resolveEffectiveMimeType(undefined, '')).toBeUndefined();
    expect(resolveEffectiveMimeType(undefined, 'archive.zip')).toBeUndefined();
  });

  it('publishes the FR-010 allow-list', () => {
    expect(V1_INLINE_PREVIEW_MIME_TYPES).toEqual([
      'application/pdf',
      'image/png',
      'image/jpeg',
      'image/jpg',
      'image/gif',
      'image/webp',
    ]);
  });
});
