import { describe, expect, it, vi } from 'vitest';

import {
  createLazyRecentAssetsStorage,
  createRecentAssetsStorage,
  RECENT_ASSETS_MAX_COUNT,
  RECENT_ASSETS_SCHEMA_VERSION,
  defaultRecentAssetsStorage,
  type RecentAssetEntry,
} from './recentAssetsStorage';

function buildStorageKey(environment: { project: string; baseUrl: string }): string {
  return `asset-360.recent-assets.v1:${environment.project}:${environment.baseUrl}`;
}

const environmentA = { project: 'publicdatacdm', baseUrl: 'https://api.cognitedata.com' };
const environmentB = { project: 'sebastian-srikanth', baseUrl: 'https://bluefield.cognitedata.com' };

const assetOne: RecentAssetEntry = {
  space: 'cdf_cdm',
  externalId: 'P-301A',
  name: 'Pump 301A',
};

const assetTwo: RecentAssetEntry = {
  space: 'cdf_cdm',
  externalId: 'P-302A',
  name: 'Pump 302A',
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

describe('recentAssetsStorage', () => {
  it('persists and reloads recent assets for the same environment', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    recentAssetsStorage.record(environmentA, assetOne);
    const reloaded = createRecentAssetsStorage(storage).read(environmentA);

    expect(reloaded).toEqual([assetOne]);
  });

  it('orders newest assets first and de-duplicates revisits', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    recentAssetsStorage.record(environmentA, assetOne);
    recentAssetsStorage.record(environmentA, assetTwo);
    recentAssetsStorage.record(environmentA, assetOne);

    expect(recentAssetsStorage.read(environmentA)).toEqual([assetOne, assetTwo]);
  });

  it('caps the list at ten assets and evicts the oldest entry', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    for (let index = 0; index < 11; index += 1) {
      recentAssetsStorage.record(environmentA, {
        space: 'cdf_cdm',
        externalId: `ASSET-${index}`,
        name: `Asset ${index}`,
      });
    }

    const recent = recentAssetsStorage.read(environmentA);
    expect(recent).toHaveLength(RECENT_ASSETS_MAX_COUNT);
    expect(recent[0]?.externalId).toBe('ASSET-10');
    expect(recent.some((asset) => asset.externalId === 'ASSET-0')).toBe(false);
  });

  it('isolates history by project and baseUrl', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    recentAssetsStorage.record(environmentA, assetOne);
    recentAssetsStorage.record(environmentB, assetTwo);

    expect(recentAssetsStorage.read(environmentA)).toEqual([assetOne]);
    expect(recentAssetsStorage.read(environmentB)).toEqual([assetTwo]);
  });

  it('fails safely for malformed storage', () => {
    const storage = createMemoryStorage();
    storage.setItem(buildStorageKey(environmentA), '{not-json');
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    expect(recentAssetsStorage.read(environmentA)).toEqual([]);
  });

  it('fails safely when storage throws', () => {
    const storage = createMemoryStorage();
    vi.spyOn(storage, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    expect(recentAssetsStorage.read(environmentA)).toEqual([]);
    expect(() => recentAssetsStorage.record(environmentA, assetOne)).not.toThrow();
  });

  it('still returns the new list when writing to storage is rejected', () => {
    const storage = createMemoryStorage();
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    expect(recentAssetsStorage.record(environmentA, assetOne)).toEqual([assetOne]);
  });

  it('rejects stored records that do not match the current schema', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);
    const key = buildStorageKey(environmentA);

    const rejected: unknown[] = [
      null,
      'a string payload',
      { version: RECENT_ASSETS_SCHEMA_VERSION + 1, ...environmentA, assets: [] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, project: 7, baseUrl: environmentA.baseUrl, assets: [] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, project: environmentA.project, baseUrl: 7, assets: [] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, ...environmentA, assets: 'not-an-array' },
      { version: RECENT_ASSETS_SCHEMA_VERSION, ...environmentA, assets: [null] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, ...environmentA, assets: [{ externalId: 'X' }] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, ...environmentA, assets: [{ space: '', externalId: 'X' }] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, ...environmentA, assets: [{ space: 'cdf_cdm' }] },
      { version: RECENT_ASSETS_SCHEMA_VERSION, ...environmentA, assets: [{ space: 'cdf_cdm', externalId: '' }] },
      {
        version: RECENT_ASSETS_SCHEMA_VERSION,
        ...environmentA,
        assets: [{ space: 'cdf_cdm', externalId: 'X', name: 42 }],
      },
    ];

    for (const payload of rejected) {
      storage.setItem(key, JSON.stringify(payload));
      expect(recentAssetsStorage.read(environmentA)).toEqual([]);
    }
  });

  it('discards a record written for a different project or base URL under the same key', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);
    const key = buildStorageKey(environmentA);

    storage.setItem(
      key,
      JSON.stringify({
        version: RECENT_ASSETS_SCHEMA_VERSION,
        project: environmentB.project,
        baseUrl: environmentA.baseUrl,
        assets: [assetOne],
      }),
    );
    expect(recentAssetsStorage.read(environmentA)).toEqual([]);

    storage.setItem(
      key,
      JSON.stringify({
        version: RECENT_ASSETS_SCHEMA_VERSION,
        project: environmentA.project,
        baseUrl: environmentB.baseUrl,
        assets: [assetOne],
      }),
    );
    expect(recentAssetsStorage.read(environmentA)).toEqual([]);
  });

  it('omits an absent name rather than storing undefined', () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);

    const recorded = recentAssetsStorage.record(environmentA, {
      space: 'cdf_cdm',
      externalId: 'P-999',
    });

    expect(recorded).toEqual([{ space: 'cdf_cdm', externalId: 'P-999' }]);
    expect(Object.keys(recorded[0]!)).not.toContain('name');
  });
});

describe(createLazyRecentAssetsStorage.name, () => {
  it('degrades to an in-memory-free no-op when storage cannot be resolved', () => {
    // Reproduces a storage-blocked Fusion iframe: `window.localStorage` throws on access.
    const resolveStorage = vi.fn(() => null);
    const lazyStorage = createLazyRecentAssetsStorage(resolveStorage);

    expect(lazyStorage.read(environmentA)).toEqual([]);
    // Recording still reports the just-visited asset so the UI has something to render.
    expect(lazyStorage.record(environmentA, assetOne)).toEqual([assetOne]);
    expect(resolveStorage).toHaveBeenCalledTimes(2);
  });

  it('resolves storage on every call rather than once at module load', () => {
    const storage = createMemoryStorage();
    let available = false;
    const lazyStorage = createLazyRecentAssetsStorage(() => (available ? storage : null));

    expect(lazyStorage.read(environmentA)).toEqual([]);

    available = true;
    lazyStorage.record(environmentA, assetOne);
    expect(lazyStorage.read(environmentA)).toEqual([assetOne]);
  });

  it('exposes a default storage that never throws on access', () => {
    expect(() => defaultRecentAssetsStorage.read(environmentA)).not.toThrow();
    expect(() => defaultRecentAssetsStorage.record(environmentA, assetOne)).not.toThrow();
  });
});
