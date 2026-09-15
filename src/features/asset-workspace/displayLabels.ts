export function normalizeLabel(value: string): string {
  return value.trim().toLowerCase();
}

export function isSameDisplayAndExternalId(
  displayName: string | undefined,
  externalId: string,
): boolean {
  if (!displayName) return true;
  return normalizeLabel(displayName) === normalizeLabel(externalId);
}

export function getPrimaryLabel(displayName: string | undefined, externalId: string): string {
  return displayName ?? externalId;
}

export function getSecondaryExternalId(
  displayName: string | undefined,
  externalId: string,
): string | undefined {
  if (isSameDisplayAndExternalId(displayName, externalId)) return undefined;
  return externalId;
}
