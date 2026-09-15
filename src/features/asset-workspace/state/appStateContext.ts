import { createContext } from 'react';

import type { AppInternalState, AssetRef } from '../types';

export type AppStateContextValue = {
  state: AppInternalState;
  setSearchQuery: (searchQuery: string) => void;
  selectAsset: (asset: AssetRef) => void;
  clearSelectedAsset: () => void;
};

export const AppStateContext = createContext<AppStateContextValue | null>(null);
