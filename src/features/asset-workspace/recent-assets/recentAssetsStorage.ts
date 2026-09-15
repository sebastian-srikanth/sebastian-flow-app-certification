import type { AssetRef } from '../types';

export const RECENT_ASSETS_STORAGE_KEY_PREFIX = 'asset-360.recent-assets.v1';
export const RECENT_ASSETS_MAX_COUNT = 10;
export const RECENT_ASSETS_SCHEMA_VERSION = 1;

export type RecentAssetEntry = AssetRef & {
  name?: string;
};

export type RecentAssetsStorageRecord = {
  version: number;
  project: string;
  baseUrl: string;
  assets: RecentAssetEntry[];
};

export type RecentAssetsEnvironment = {
  project: string;
  baseUrl: string;
};

export type RecentAssetsStorage = {
  read: (environment: RecentAssetsEnvironment) => RecentAssetEntry[];
  record: (environment: RecentAssetsEnvironment, asset: RecentAssetEntry) => RecentAssetEntry[];
};

function buildStorageKey(environment: RecentAssetsEnvironment): string {
  return `${RECENT_ASSETS_STORAGE_KEY_PREFIX}:${environment.project}:${environment.baseUrl}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isRecentAssetEntry(value: unknown): value is RecentAssetEntry {
  if (!isRecord(value)) return false;
  return (
    typeof value.space === 'string' &&
    value.space.length > 0 &&
    typeof value.externalId === 'string' &&
    value.externalId.length > 0 &&
    (value.name === undefined || typeof value.name === 'string')
  );
}

function isRecentAssetsStorageRecord(value: unknown): value is RecentAssetsStorageRecord {
  if (!isRecord(value)) return false;
  if (value.version !== RECENT_ASSETS_SCHEMA_VERSION) return false;
  if (typeof value.project !== 'string' || typeof value.baseUrl !== 'string') return false;
  if (!Array.isArray(value.assets)) return false;
  return value.assets.every(isRecentAssetEntry);
}

function readRaw(storage: Storage, environment: RecentAssetsEnvironment): string | null {
  try {
    return storage.getItem(buildStorageKey(environment));
  } catch {
    return null;
  }
}

function writeRaw(storage: Storage, environment: RecentAssetsEnvironment, value: string): boolean {
  try {
    storage.setItem(buildStorageKey(environment), value);
    return true;
  } catch {
    return false;
  }
}

function parseStorageRecord(raw: string | null): RecentAssetsStorageRecord | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecentAssetsStorageRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function assetIdentityKey(asset: AssetRef): string {
  return `${asset.space}:${asset.externalId}`;
}

function dedupeAndCap(assets: RecentAssetEntry[]): RecentAssetEntry[] {
  const seen = new Set<string>();
  const next: RecentAssetEntry[] = [];

  for (const asset of assets) {
    const key = assetIdentityKey(asset);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push({
      space: asset.space,
      externalId: asset.externalId,
      ...(asset.name ? { name: asset.name } : {}),
    });
    if (next.length >= RECENT_ASSETS_MAX_COUNT) break;
  }

  return next;
}

export function createRecentAssetsStorage(storage: Storage): RecentAssetsStorage {
  return {
    read(environment: RecentAssetsEnvironment): RecentAssetEntry[] {
      const record = parseStorageRecord(readRaw(storage, environment));
      if (!record) return [];
      if (
        record.project !== environment.project ||
        record.baseUrl !== environment.baseUrl
      ) {
        return [];
      }
      return dedupeAndCap(record.assets);
    },

    record(environment: RecentAssetsEnvironment, asset: RecentAssetEntry): RecentAssetEntry[] {
      const existing = createRecentAssetsStorage(storage).read(environment);
      const entry: RecentAssetEntry = {
        space: asset.space,
        externalId: asset.externalId,
        ...(asset.name ? { name: asset.name } : {}),
      };

      const withoutCurrent = existing.filter(
        (item) => assetIdentityKey(item) !== assetIdentityKey(entry),
      );
      const next = dedupeAndCap([entry, ...withoutCurrent]);

      const payload: RecentAssetsStorageRecord = {
        version: RECENT_ASSETS_SCHEMA_VERSION,
        project: environment.project,
        baseUrl: environment.baseUrl,
        assets: next,
      };

      writeRaw(storage, environment, JSON.stringify(payload));
      return next;
    },
  };
}

/**
 * Reading `window.localStorage` throws `SecurityError` outright when storage is blocked —
 * a realistic configuration for an app running in a cross-origin Fusion iframe. Resolving
 * it lazily per call keeps that failure inside the existing try/catch paths instead of
 * aborting module evaluation before any error boundary exists.
 */
function resolveLocalStorage(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

const UNAVAILABLE_STORAGE: RecentAssetsStorage = {
  read: () => [],
  record: (_environment, asset) => dedupeAndCap([asset]),
};

export function createLazyRecentAssetsStorage(
  resolveStorage: () => Storage | null = resolveLocalStorage,
): RecentAssetsStorage {
  return {
    read(environment) {
      const storage = resolveStorage();
      if (!storage) return UNAVAILABLE_STORAGE.read(environment);
      return createRecentAssetsStorage(storage).read(environment);
    },

    record(environment, asset) {
      const storage = resolveStorage();
      if (!storage) return UNAVAILABLE_STORAGE.record(environment, asset);
      return createRecentAssetsStorage(storage).record(environment, asset);
    },
  };
}

export const defaultRecentAssetsStorage = createLazyRecentAssetsStorage();
