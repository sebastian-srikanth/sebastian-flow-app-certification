import { useQuery } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { MIN_SEARCH_QUERY_LENGTH, SEARCH_DEBOUNCE_MS } from '../constants';
import { useAppState } from '../state/useAppState';
import { useAssetService } from '../state/useAssetService';
import { useRecentAssets } from '../state/useRecentAssets';
import type { AssetSummary } from '../types';

export type AssetSearchStatus = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export type AssetSearchViewModel = {
  query: string;
  setQuery: (value: string) => void;
  status: AssetSearchStatus;
  results: AssetSummary[];
  errorMessage: string | null;
  selectResult: (asset: AssetSummary) => void;
};

type AssetSearchViewModelDeps = {
  useAppState: typeof useAppState;
  useAssetService: typeof useAssetService;
  useRecentAssets: typeof useRecentAssets;
};

const defaultDeps: AssetSearchViewModelDeps = {
  useAppState,
  useAssetService,
  useRecentAssets,
};

export const AssetSearchViewModelContext = createContext<AssetSearchViewModelDeps>(defaultDeps);

export function useAssetSearchViewModel(): AssetSearchViewModel {
  const {
    useAppState: useAppStateDep,
    useAssetService: useAssetServiceDep,
    useRecentAssets: useRecentAssetsDep,
  } = useContext(AssetSearchViewModelContext);
  const { state, setSearchQuery, selectAsset } = useAppStateDep();
  const assetService = useAssetServiceDep();
  const { recordRecentAsset } = useRecentAssetsDep();

  const query = state.searchQuery ?? '';
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [query]);

  const trimmedQuery = debouncedQuery.trim();
  const canSearch = trimmedQuery.length >= MIN_SEARCH_QUERY_LENGTH;

  const searchQuery = useQuery({
    queryKey: ['asset-search', trimmedQuery],
    queryFn: () => assetService.searchAssets(trimmedQuery),
    enabled: canSearch,
  });

  const status: AssetSearchStatus = useMemo(() => {
    if (!canSearch) return 'idle';
    if (searchQuery.isLoading || searchQuery.isFetching) return 'loading';
    if (searchQuery.isError) return 'error';
    if (searchQuery.data?.length === 0) return 'empty';
    return 'success';
  }, [canSearch, searchQuery.isLoading, searchQuery.isFetching, searchQuery.isError, searchQuery.data]);

  const setQuery = useCallback(
    (value: string) => {
      setSearchQuery(value);
    },
    [setSearchQuery],
  );

  const selectResult = useCallback(
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
    query,
    setQuery,
    status,
    results: searchQuery.data ?? [],
    errorMessage:
      searchQuery.error instanceof Error
        ? searchQuery.error.message
        : searchQuery.isError
          ? 'Unable to search assets. Try again in a moment.'
          : null,
    selectResult,
  };
}
