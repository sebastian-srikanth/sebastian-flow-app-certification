import { describe, expect, it } from 'vitest';

import {
  DocumentMimeType,
  doesDocumentPreviewApiSupportFile,
  getComputedMimeType,
  getViewerType,
  inferMimeTypeFromUrl,
  isNativelySupportedMimeType,
} from './mimeTypes';

describe('mimeTypes', () => {
  it('identifies natively supported MIME types', () => {
    expect(isNativelySupportedMimeType('application/pdf')).toBe(true);
    expect(isNativelySupportedMimeType('image/png')).toBe(true);
    expect(isNativelySupportedMimeType('text/plain')).toBe(true);
    expect(isNativelySupportedMimeType('application/zip')).toBe(false);
    expect(isNativelySupportedMimeType(null)).toBe(false);
    expect(isNativelySupportedMimeType(undefined)).toBe(false);
  });

  it('canonicalises alternate MIME type spellings', () => {
    expect(getComputedMimeType({ mimeType: 'image/jpg' })).toBe('image/jpeg');
    expect(getComputedMimeType({ mimeType: 'image/tif' })).toBe('image/tiff');
    expect(getComputedMimeType({ mimeType: 'image/svg' })).toBe('image/svg+xml');
    expect(getComputedMimeType({ mimeType: 'application/txt' })).toBe('text/plain');
  });

  it('infers MIME type from filename extension', () => {
    expect(inferMimeTypeFromUrl('manual.pdf')).toBe(DocumentMimeType.PDF);
    expect(inferMimeTypeFromUrl('https://files.test/diagram.png?v=1')).toBe('image/png');
    expect(inferMimeTypeFromUrl('no-extension')).toBeUndefined();
  });

  it('computes MIME type from name when mimeType is missing', () => {
    expect(getComputedMimeType({ name: 'report.pdf' })).toBe(DocumentMimeType.PDF);
    expect(getComputedMimeType({})).toBeUndefined();
  });

  it('detects Document Preview API support for office files', () => {
    expect(
      doesDocumentPreviewApiSupportFile({
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    ).toBe(true);
    expect(doesDocumentPreviewApiSupportFile({ name: 'report.docx' })).toBe(true);
    expect(doesDocumentPreviewApiSupportFile({ name: 'notes.txt' })).toBe(false);
  });

  it('maps MIME types to viewer types', () => {
    expect(getViewerType('application/pdf')).toBe('pdf');
    expect(getViewerType('image/png')).toBe('image');
    expect(getViewerType('text/plain')).toBe('text');
    expect(
      getViewerType('application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
    ).toBe('pdf');
    expect(getViewerType('application/zip')).toBe('unsupported');
    expect(getViewerType(undefined)).toBe('unsupported');
  });
});
