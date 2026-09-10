import type { NodeDefinition } from '@cognite/sdk';
import { describe, expect, it } from 'vitest';

import {
  assetRefKey,
  mapNodeToAssetSummary,
  mergeAssetSummaries,
  rankAssetSearchResults,
} from './assetProperties';
import { CDF_CDM_SPACE, COGNITE_ASSET_VIEW_KEY, SEARCH_RESULT_LIMIT } from './constants';
import type { AssetSummary } from './types';

function makeSummary(externalId: string, name?: string): AssetSummary {
  return { space: CDF_CDM_SPACE, externalId, name };
}

function makeNode(overrides: Partial<NodeDefinition> = {}): NodeDefinition {
  return {
    createdTime: 0,
    externalId: 'PUMP-101',
    instanceType: 'node',
    lastUpdatedTime: 0,
    space: CDF_CDM_SPACE,
    version: 1,
    properties: {
      [CDF_CDM_SPACE]: {
        [COGNITE_ASSET_VIEW_KEY]: {
          name: 'Feed pump',
          description: 'Primary feed pump',
          type: { space: CDF_CDM_SPACE, externalId: 'PumpType' },
          parent: { space: CDF_CDM_SPACE, externalId: 'AREA-1' },
        },
      },
    },
    ...overrides,
  };
}

describe(mapNodeToAssetSummary.name, () => {
  it('maps CogniteAsset view properties from node instances', () => {
    const summary = mapNodeToAssetSummary(makeNode());

    expect(summary).toEqual({
      space: CDF_CDM_SPACE,
      externalId: 'PUMP-101',
      name: 'Feed pump',
      description: 'Primary feed pump',
      typeExternalId: 'PumpType',
      parentExternalId: 'AREA-1',
    });
  });
});

describe(mergeAssetSummaries.name, () => {
  it('deduplicates assets by space and externalId', () => {
    const primary = [
      {
        space: CDF_CDM_SPACE,
        externalId: 'A-1',
        name: 'Asset A',
      },
    ];
    const secondary = [
      {
        space: CDF_CDM_SPACE,
        externalId: 'A-1',
        name: 'Duplicate',
      },
      {
        space: CDF_CDM_SPACE,
        externalId: 'B-1',
        name: 'Asset B',
      },
    ];

    const merged = mergeAssetSummaries(primary, secondary);

    expect(merged).toHaveLength(2);
    expect(assetRefKey(merged[0])).toBe(`${CDF_CDM_SPACE}:A-1`);
    expect(merged[0].name).toBe('Asset A');
    expect(assetRefKey(merged[1])).toBe(`${CDF_CDM_SPACE}:B-1`);
  });
});

describe(rankAssetSearchResults.name, () => {
  it('keeps externalId-prefix matches when text matches already fill the result limit', () => {
    const textMatches = Array.from({ length: SEARCH_RESULT_LIMIT }, (_item, index) =>
      makeSummary(`TEXT-${index}`, 'Pump house lighting'),
    );
    const externalIdMatches = [makeSummary('PUMP-101', 'Feed pump')];

    const ranked = rankAssetSearchResults(
      textMatches,
      externalIdMatches,
      'PUMP-101',
      SEARCH_RESULT_LIMIT,
    );

    expect(ranked).toHaveLength(SEARCH_RESULT_LIMIT);
    expect(ranked.map((item) => item.externalId)).toContain('PUMP-101');
  });

  it('ranks an exact tag match first', () => {
    const ranked = rankAssetSearchResults(
      [makeSummary('LIGHT-1', 'Pump-101 area lighting')],
      [makeSummary('PUMP-1011'), makeSummary('PUMP-101')],
      'pump-101',
      SEARCH_RESULT_LIMIT,
    );

    expect(ranked[0]?.externalId).toBe('PUMP-101');
  });

  it('finds an exact tag match that only the text query returned', () => {
    const ranked = rankAssetSearchResults(
      [makeSummary('OTHER-1'), makeSummary('PUMP-101', 'Feed pump')],
      [],
      'PUMP-101',
      SEARCH_RESULT_LIMIT,
    );

    expect(ranked[0]?.externalId).toBe('PUMP-101');
  });

  it('interleaves so neither result set can evict the other', () => {
    const textMatches = Array.from({ length: 6 }, (_item, index) => makeSummary(`TEXT-${index}`));
    const externalIdMatches = Array.from({ length: 6 }, (_item, index) =>
      makeSummary(`TAG-${index}`),
    );

    const ranked = rankAssetSearchResults(textMatches, externalIdMatches, 'no-exact-match', 4);

    expect(ranked.map((item) => item.externalId)).toEqual(['TAG-0', 'TEXT-0', 'TAG-1', 'TEXT-1']);
  });

  it('deduplicates assets returned by both queries', () => {
    const shared = makeSummary('PUMP-200', 'Booster pump');

    const ranked = rankAssetSearchResults([shared], [shared], 'pump', SEARCH_RESULT_LIMIT);

    expect(ranked).toHaveLength(1);
  });

  it('returns the text matches unchanged when there are no externalId matches', () => {
    const textMatches = [makeSummary('A-1'), makeSummary('A-2')];

    const ranked = rankAssetSearchResults(textMatches, [], 'feed', SEARCH_RESULT_LIMIT);

    expect(ranked.map((item) => item.externalId)).toEqual(['A-1', 'A-2']);
  });
});
