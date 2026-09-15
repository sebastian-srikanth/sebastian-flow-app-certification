import type { HostAppAPI } from '@cognite/app-sdk';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

import { parseAppState, serializeAppState } from '../parseAppState';
import type { AppInternalState, AssetRef } from '../types';

import { AppStateContext } from './appStateContext';

type HostAppApi = Pick<HostAppAPI, 'syncInternalState'>;

type AppStateProviderProps = {
  api: HostAppApi | null;
  initialState?: string;
  children: ReactNode;
};

export function AppStateProvider({ api, initialState, children }: AppStateProviderProps) {
  const [state, setState] = useState<AppInternalState>(() => parseAppState(initialState));

  const setSearchQuery = useCallback(
    (searchQuery: string) => {
      setState((current) => {
        const next = { ...current, searchQuery };
        void api?.syncInternalState(serializeAppState(next));
        return next;
      });
    },
    [api],
  );

  const selectAsset = useCallback(
    (asset: AssetRef) => {
      setState((current) => {
        const next: AppInternalState = {
          view: 'asset',
          selectedAsset: { space: asset.space, externalId: asset.externalId },
          searchQuery: current.searchQuery,
        };
        void api?.syncInternalState(serializeAppState(next));
        return next;
      });
    },
    [api],
  );

  const clearSelectedAsset = useCallback(() => {
    setState((current) => {
      const next: AppInternalState = {
        view: 'search',
        searchQuery: current.searchQuery ?? '',
      };
      void api?.syncInternalState(serializeAppState(next));
      return next;
    });
  }, [api]);

  const value = useMemo(
    () => ({
      state,
      setSearchQuery,
      selectAsset,
      clearSelectedAsset,
    }),
    [state, setSearchQuery, selectAsset, clearSelectedAsset],
  );

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}
