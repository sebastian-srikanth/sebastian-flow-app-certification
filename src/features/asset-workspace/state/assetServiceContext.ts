import { createContext } from 'react';

import type { AssetService } from '../services/AssetService';

export type AssetServiceContextValue = {
  assetService: AssetService;
};

export const AssetServiceContext = createContext<AssetServiceContextValue | null>(null);
