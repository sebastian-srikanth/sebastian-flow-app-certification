export type AssetRef = {
  space: string;
  externalId: string;
};

export type AssetSummary = AssetRef & {
  name?: string;
  description?: string;
  typeExternalId?: string;
  parentExternalId?: string;
};

export type AssetDetail = AssetSummary;

export type WorkspaceView = 'search' | 'asset';

export type AppInternalState = {
  view: WorkspaceView;
  selectedAsset?: AssetRef;
  searchQuery?: string;
};

export const DEFAULT_APP_STATE: AppInternalState = {
  view: 'search',
};
