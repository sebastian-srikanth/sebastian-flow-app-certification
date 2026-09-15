export { isAccessDeniedError } from '../../../lib/accessErrors';

export function getActivityErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return 'Unable to load work orders for this asset.';
}
