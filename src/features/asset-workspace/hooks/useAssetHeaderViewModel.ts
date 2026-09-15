import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
} from 'react';

import { useAppState } from '../state/useAppState';
import { useAssetService } from '../state/useAssetService';
import { useRecentAssets } from '../state/useRecentAssets';
import type { AssetDetail } from '../types';

export type AssetHeaderStatus = 'idle' | 'loading' | 'success' | 'not-found' | 'error';

export type AssetHeaderViewModel = {
  status: AssetHeaderStatus;
  asset: AssetDetail | null;
  errorMessage: string | null;
  backToSearch: () => void;
};

type AssetHeaderViewModelDeps = {
  useAppState: typeof useAppState;
  useAssetService: typeof useAssetService;
  useRecentAssets: typeof useRecentAssets;
};

const defaultDeps: AssetHeaderViewModelDeps = {
  useAppState,
  useAssetService,
  useRecentAssets,
};

export const AssetHeaderViewModelContext = createContext<AssetHeaderViewModelDeps>(defaultDeps);

export function useAssetHeaderViewModel(): AssetHeaderViewModel {
  const {
    useAppState: useAppStateDep,
    useAssetService: useAssetServiceDep,
    useRecentAssets: useRecentAssetsDep,
  } = useContext(AssetHeaderViewModelContext);
  const { state, clearSelectedAsset } = useAppStateDep();
  const assetService = useAssetServiceDep();
  const { recordRecentAsset } = useRecentAssetsDep();

  const selectedAsset = state.selectedAsset;

  const assetQuery = useQuery({
    queryKey: ['asset-detail', selectedAsset?.space, selectedAsset?.externalId],
    queryFn: () => assetService.getAsset(selectedAsset!),
    enabled: Boolean(selectedAsset),
  });

  const status: AssetHeaderStatus = useMemo(() => {
    if (!selectedAsset) return 'idle';
    if (assetQuery.isLoading || assetQuery.isFetching) return 'loading';
    if (assetQuery.isError) return 'error';
    if (assetQuery.data === null) return 'not-found';
    return 'success';
  }, [selectedAsset, assetQuery.isLoading, assetQuery.isFetching, assetQuery.isError, assetQuery.data]);

  const asset: AssetDetail | null = assetQuery.data ?? null;

  useEffect(() => {
    if (!asset) return;
    recordRecentAsset({
      space: asset.space,
      externalId: asset.externalId,
      ...(asset.name ? { name: asset.name } : {}),
    });
  }, [asset, recordRecentAsset]);

  return {
    status,
    asset,
    errorMessage:
      assetQuery.error instanceof Error
        ? assetQuery.error.message
        : assetQuery.isError
          ? 'Unable to load the selected asset. Try again in a moment.'
          : null,
    backToSearch: clearSelectedAsset,
  };
}
