import { createContext, useCallback, useContext } from 'react';

import { getPrimaryLabel } from '../displayLabels';
import { useAppState } from '../state/useAppState';
import { useRecentAssets } from '../state/useRecentAssets';
import type { AssetSummary } from '../types';

type RecentAssetsViewModelDeps = {
  useAppState: typeof useAppState;
  useRecentAssets: typeof useRecentAssets;
};

const defaultDeps: RecentAssetsViewModelDeps = {
  useAppState,
  useRecentAssets,
};

export const RecentAssetsViewModelContext =
  createContext<RecentAssetsViewModelDeps>(defaultDeps);

export function useRecentAssetsViewModel() {
  const { useAppState: useAppStateDep, useRecentAssets: useRecentAssetsDep } = useContext(
    RecentAssetsViewModelContext,
  );
  const { selectAsset } = useAppStateDep();
  const { recentAssets, recordRecentAsset } = useRecentAssetsDep();

  const openRecentAsset = useCallback(
    (asset: AssetSummary) => {
      recordRecentAsset({
        space: asset.space,
        externalId: asset.externalId,
        ...(asset.name ? { name: asset.name } : {}),
      });
      selectAsset(asset);
    },
    [recordRecentAsset, selectAsset],
  );

  return {
    recentAssets,
    openRecentAsset,
    getRecentAssetLabel: (asset: AssetSummary) =>
      getPrimaryLabel(asset.name, asset.externalId),
  };
}
