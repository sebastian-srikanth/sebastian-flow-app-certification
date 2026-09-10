import type { ViewReference } from '@cognite/sdk';

import { CDF_CDM_SPACE } from '../constants';

export const COGNITE_ACTIVITY_VIEW: ViewReference = {
  type: 'view',
  space: CDF_CDM_SPACE,
  externalId: 'CogniteActivity',
  version: 'v1',
};

export const COGNITE_ACTIVITY_VIEW_KEY = `${COGNITE_ACTIVITY_VIEW.externalId}/${COGNITE_ACTIVITY_VIEW.version}`;

export const ACTIVITY_ASSETS_FILTER_PROPERTY = [
  CDF_CDM_SPACE,
  COGNITE_ACTIVITY_VIEW_KEY,
  'assets',
] as const;

/**
 * Server-side recency sort property for the work orders panel (SPEC DM-04, FR-007).
 *
 * `CogniteSchedulable` declares a cursorable B-tree index on `endTime`, which is what makes a
 * custom sort combinable with pagination cursors. DMS sort is lexicographic and has no COALESCE,
 * so the six-level relevant-date fallback chain is not expressible server-side. Rather than
 * re-ranking each fetched page with a comparator the server never applied — which reorders rows
 * the analyst has already seen as soon as the next page arrives — recency is defined as this one
 * server ordering and the panel renders CDF's order unchanged.
 */
export const ACTIVITY_RECENCY_SORT_PROPERTY = [
  CDF_CDM_SPACE,
  COGNITE_ACTIVITY_VIEW_KEY,
  'endTime',
] as const;

/**
 * Direction of the recency sort. Descending must be paired with `nullsFirst: true`: those are the
 * two combinations Cognite documents as cursorable (ascending/nulls last, descending/nulls first),
 * and pairing descending with nulls last would drop pagination off the index.
 */
export const ACTIVITY_RECENCY_SORT_DIRECTION = 'descending';

/** Nulls-first is required for a cursorable descending sort; see the direction constant. */
export const ACTIVITY_RECENCY_SORT_NULLS_FIRST = true;

/** Page size for each `client.instances.list` request. */
export const ACTIVITY_PAGE_SIZE = 100;

/** Number of rows revealed each time the user clicks Load more. */
export const ACTIVITY_VISIBLE_INCREMENT = 20;
