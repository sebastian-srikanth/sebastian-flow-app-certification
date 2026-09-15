export { isAccessDeniedError } from '../../../lib/accessErrors';

export function getDocumentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Unable to load documents for this asset.';
}

export function getDocumentDownloadErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Unable to open this file.';
}
