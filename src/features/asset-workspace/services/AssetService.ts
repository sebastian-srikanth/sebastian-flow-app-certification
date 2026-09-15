import type { AssetDetail, AssetRef, AssetSummary } from '../types';

export interface AssetService {
  searchAssets(query: string): Promise<AssetSummary[]>;
  getAsset(ref: AssetRef): Promise<AssetDetail | null>;
}
