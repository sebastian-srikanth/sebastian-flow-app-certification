import { describe, expect, it } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';

import {
  buildChartableSelectionKey,
  computeChartAnchorMs,
  latestDatapointsMatchSelection,
} from './chartAnchor';

const seriesA = { space: CDF_CDM_SPACE, externalId: 'TS-A' };
const seriesB = { space: CDF_CDM_SPACE, externalId: 'TS-B' };

describe('chartAnchor', () => {
  it('builds a stable selection key regardless of order', () => {
    expect(buildChartableSelectionKey([seriesA, seriesB])).toBe(
      buildChartableSelectionKey([seriesB, seriesA]),
    );
  });

  it('matches latest datapoint responses to the current selection', () => {
    expect(
      latestDatapointsMatchSelection([seriesA, seriesB], [
        { ref: seriesA },
        { ref: seriesB },
      ]),
    ).toBe(true);

    expect(latestDatapointsMatchSelection([seriesA], [{ ref: seriesA }, { ref: seriesB }])).toBe(
      false,
    );
    expect(latestDatapointsMatchSelection([seriesA, seriesB], [{ ref: seriesA }])).toBe(false);
  });

  it('re-anchors to the max latest timestamp for the current selection', () => {
    const olderAnchor = 1_700_000_000_000 - 24 * 60 * 60 * 1000;
    const newerAnchor = 1_700_000_000_000;

    const dataForA = [{ ref: seriesA, latestTimestamp: olderAnchor }];
    const dataForAB = [
      { ref: seriesA, latestTimestamp: olderAnchor },
      { ref: seriesB, latestTimestamp: newerAnchor },
    ];

    expect(computeChartAnchorMs([seriesA], dataForA)).toBe(olderAnchor);
    expect(computeChartAnchorMs([seriesA, seriesB], dataForAB)).toBe(newerAnchor);
    expect(computeChartAnchorMs([seriesA], dataForAB)).toBeNull();
    expect(computeChartAnchorMs([seriesA], dataForA, { isPlaceholderData: true })).toBeNull();
  });
});
