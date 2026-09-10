import type { ViewReference } from '@cognite/sdk';

import { CDF_CDM_SPACE } from '../constants';

export const COGNITE_FILE_VIEW: ViewReference = {
  type: 'view',
  space: CDF_CDM_SPACE,
  externalId: 'CogniteFile',
  version: 'v1',
};

export const COGNITE_FILE_VIEW_KEY = `${COGNITE_FILE_VIEW.externalId}/${COGNITE_FILE_VIEW.version}`;

export const FILE_ASSETS_FILTER_PROPERTY = [
  CDF_CDM_SPACE,
  COGNITE_FILE_VIEW_KEY,
  'assets',
] as const;

/** Page size for each `client.instances.list` request. */
export const FILE_PAGE_SIZE = 100;

/** Number of rows revealed each time the user clicks Load more. */
export const FILE_VISIBLE_INCREMENT = 20;
