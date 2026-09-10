export function isAccessDeniedError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  const candidate = error as Error & { status?: number; code?: number; errorCode?: number };
  const status = candidate.status ?? candidate.code ?? candidate.errorCode;
  if (status === 401 || status === 403) return true;

  const message = candidate.message.toLowerCase();
  return (
    message.includes('401') ||
    message.includes('403') ||
    message.includes('forbidden') ||
    message.includes('access denied') ||
    message.includes('not authorized') ||
    message.includes('unauthorized')
  );
}
