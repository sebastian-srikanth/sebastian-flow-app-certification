import { useContext } from 'react';

import { RecentAssetsContext, type RecentAssetsContextValue } from './recentAssetsContext';

export function useRecentAssets(): RecentAssetsContextValue {
  const value = useContext(RecentAssetsContext);
  if (!value) {
    throw new Error('useRecentAssets must be used within RecentAssetsProvider');
  }
  return value;
}
