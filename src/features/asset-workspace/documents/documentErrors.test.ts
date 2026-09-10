import { describe, expect, it } from 'vitest';

import { getDocumentDownloadErrorMessage, getDocumentErrorMessage } from './documentErrors';

describe('documentErrors', () => {
  it('returns the error message when present', () => {
    expect(getDocumentErrorMessage(new Error('Documents unavailable'))).toBe(
      'Documents unavailable',
    );
  });

  it('returns a fallback message for unknown errors', () => {
    expect(getDocumentErrorMessage('network')).toBe('Unable to load documents for this asset.');
    expect(getDocumentErrorMessage(new Error(''))).toBe('Unable to load documents for this asset.');
  });

  it('reports download failures separately from list failures', () => {
    expect(getDocumentDownloadErrorMessage(new Error('Download link expired'))).toBe(
      'Download link expired',
    );
    expect(getDocumentDownloadErrorMessage(new Error(''))).toBe('Unable to open this file.');
    expect(getDocumentDownloadErrorMessage(undefined)).toBe('Unable to open this file.');
    expect(getDocumentDownloadErrorMessage({ status: 403 })).toBe('Unable to open this file.');
  });
});
