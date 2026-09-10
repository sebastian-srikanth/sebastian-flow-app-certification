import type { ViewReference } from '@cognite/sdk';

export const CDF_CDM_SPACE = 'cdf_cdm';

export const COGNITE_ASSET_VIEW: ViewReference = {
  type: 'view',
  space: CDF_CDM_SPACE,
  externalId: 'CogniteAsset',
  version: 'v1',
};

export const COGNITE_ASSET_VIEW_KEY = `${COGNITE_ASSET_VIEW.externalId}/${COGNITE_ASSET_VIEW.version}`;

export const ASSET_TEXT_SEARCH_PROPERTIES = ['name', 'description'] as const;

export const SEARCH_RESULT_LIMIT = 20;

export const MIN_SEARCH_QUERY_LENGTH = 2;

export const SEARCH_DEBOUNCE_MS = 300;
