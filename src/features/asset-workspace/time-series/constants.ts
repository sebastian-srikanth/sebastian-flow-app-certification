import type { ViewReference } from '@cognite/sdk';

import { CDF_CDM_SPACE } from '../constants';

import type { DurationPresetId } from './types';

export const COGNITE_TIME_SERIES_VIEW: ViewReference = {
  type: 'view',
  space: CDF_CDM_SPACE,
  externalId: 'CogniteTimeSeries',
  version: 'v1',
};

export const COGNITE_TIME_SERIES_VIEW_KEY = `${COGNITE_TIME_SERIES_VIEW.externalId}/${COGNITE_TIME_SERIES_VIEW.version}`;

export const TIME_SERIES_ASSETS_FILTER_PROPERTY = [
  CDF_CDM_SPACE,
  COGNITE_TIME_SERIES_VIEW_KEY,
  'assets',
] as const;

/**
 * Page size for each linked-time-series discovery request. The data modeling docs recommend not
 * going below 100 to avoid excessive API calls.
 */
export const TIME_SERIES_PAGE_SIZE = 200;

/**
 * Hard ceiling on how many linked series discovery will load for a single asset.
 *
 * Reverse direct-relation cardinality has no platform ceiling, so an unbounded cursor drain lets a
 * plant-level asset issue an unbounded number of sequential round trips. Bounding both the total
 * and (implicitly) the page count keeps the worst case at three requests, and the panel discloses
 * when the bound was hit rather than silently presenting a partial list as complete.
 */
export const TIME_SERIES_MAX_RESULTS = 500;

export const MAX_SELECTED_TIME_SERIES = 5;

export const DEFAULT_DURATION_PRESET: DurationPresetId = '24h';

export const DURATION_PRESETS: ReadonlyArray<{
  id: DurationPresetId;
  label: string;
  durationMs: number;
}> = [
  { id: '1h', label: '1h', durationMs: 60 * 60 * 1000 },
  { id: '6h', label: '6h', durationMs: 6 * 60 * 60 * 1000 },
  { id: '24h', label: '24h', durationMs: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7d', durationMs: 7 * 24 * 60 * 60 * 1000 },
];
