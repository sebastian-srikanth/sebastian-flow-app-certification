import { createContext } from 'react';

import type { RecentAssetEntry } from '../recent-assets/recentAssetsStorage';

export type RecentAssetsContextValue = {
  recentAssets: RecentAssetEntry[];
  recordRecentAsset: (asset: RecentAssetEntry) => void;
};

export const RecentAssetsContext = createContext<RecentAssetsContextValue | null>(null);
