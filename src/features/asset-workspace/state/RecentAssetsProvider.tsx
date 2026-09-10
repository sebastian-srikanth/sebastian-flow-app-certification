import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { useFusionEnvironment } from '../../../host/useFusionHost';
import {
  defaultRecentAssetsStorage,
  type RecentAssetEntry,
  type RecentAssetsStorage,
} from '../recent-assets/recentAssetsStorage';

import { RecentAssetsContext } from './recentAssetsContext';

type RecentAssetsProviderProps = {
  children: ReactNode;
  storage?: RecentAssetsStorage;
};

export function RecentAssetsProvider({
  children,
  storage = defaultRecentAssetsStorage,
}: RecentAssetsProviderProps) {
  const environment = useFusionEnvironment();
  const [recentAssets, setRecentAssets] = useState<RecentAssetEntry[]>(() =>
    storage.read(environment),
  );

  const recordRecentAsset = useCallback(
    (asset: RecentAssetEntry) => {
      const next = storage.record(environment, asset);
      setRecentAssets(next);
    },
    [environment, storage],
  );

  const value = useMemo(
    () => ({
      recentAssets,
      recordRecentAsset,
    }),
    [recentAssets, recordRecentAsset],
  );

  return <RecentAssetsContext.Provider value={value}>{children}</RecentAssetsContext.Provider>;
}
