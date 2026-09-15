import type { ReactNode } from 'react';

import type { AssetService } from '../services/AssetService';

import { AssetServiceContext } from './assetServiceContext';

type AssetServiceProviderProps = {
  assetService: AssetService;
  children: ReactNode;
};

export function AssetServiceProvider({ assetService, children }: AssetServiceProviderProps) {
  return (
    <AssetServiceContext.Provider value={{ assetService }}>
      {children}
    </AssetServiceContext.Provider>
  );
}
