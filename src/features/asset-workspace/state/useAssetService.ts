import { useContext } from 'react';

import { AssetServiceContext } from './assetServiceContext';

export function useAssetService() {
  const context = useContext(AssetServiceContext);
  if (!context) {
    throw new Error('useAssetService must be used within AssetServiceProvider');
  }
  return context.assetService;
}
