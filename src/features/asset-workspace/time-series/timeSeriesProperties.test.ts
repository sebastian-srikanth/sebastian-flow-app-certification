import type { NodeDefinition } from '@cognite/sdk';
import { describe, expect, it } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';

import { COGNITE_TIME_SERIES_VIEW_KEY } from './constants';
import {
  formatTimeSeriesLabel,
  isChartableTimeSeries,
  mapNodeToTimeSeriesSummary,
  timeSeriesRefKey,
} from './timeSeriesProperties';
import type { TimeSeriesSummary } from './types';

function makeNode(
  viewProperties: unknown,
  overrides: Partial<NodeDefinition> = {},
): NodeDefinition {
  return {
    createdTime: 0,
    externalId: 'TS-1',
    instanceType: 'node',
    lastUpdatedTime: 0,
    space: CDF_CDM_SPACE,
    version: 1,
    properties: {
      [CDF_CDM_SPACE]: {
        [COGNITE_TIME_SERIES_VIEW_KEY]: viewProperties,
      },
    } as NodeDefinition['properties'],
    ...overrides,
  };
}

function makeSummary(overrides: Partial<TimeSeriesSummary> = {}): TimeSeriesSummary {
  return { space: CDF_CDM_SPACE, externalId: 'TS-1', type: 'numeric', ...overrides };
}

describe(mapNodeToTimeSeriesSummary.name, () => {
  it('maps the CogniteTimeSeries properties the panel consumes', () => {
    const summary = mapNodeToTimeSeriesSummary(
      makeNode({
        name: 'Discharge pressure',
        description: 'Pump discharge',
        type: 'numeric',
        sourceUnit: 'bar',
        unit: { space: CDF_CDM_SPACE, externalId: 'pressure:bar' },
        isStep: false,
      }),
    );

    expect(summary).toEqual({
      space: CDF_CDM_SPACE,
      externalId: 'TS-1',
      name: 'Discharge pressure',
      description: 'Pump discharge',
      type: 'numeric',
      sourceUnit: 'bar',
      unitExternalId: 'pressure:bar',
      isStep: false,
    });
  });

  it('maps each documented series type and falls back to unknown', () => {
    expect(mapNodeToTimeSeriesSummary(makeNode({ type: 'numeric' })).type).toBe('numeric');
    expect(mapNodeToTimeSeriesSummary(makeNode({ type: 'string' })).type).toBe('string');
    expect(mapNodeToTimeSeriesSummary(makeNode({ type: 'state' })).type).toBe('state');
    expect(mapNodeToTimeSeriesSummary(makeNode({ type: 'other' })).type).toBe('unknown');
    expect(mapNodeToTimeSeriesSummary(makeNode({ type: 42 })).type).toBe('unknown');
    expect(mapNodeToTimeSeriesSummary(makeNode({})).type).toBe('unknown');
  });

  it('unwraps the unit direct relation and ignores malformed shapes', () => {
    expect(
      mapNodeToTimeSeriesSummary(makeNode({ unit: { externalId: 'temperature:deg_c' } }))
        .unitExternalId,
    ).toBe('temperature:deg_c');
    expect(mapNodeToTimeSeriesSummary(makeNode({ unit: 'deg_c' })).unitExternalId).toBeUndefined();
    expect(mapNodeToTimeSeriesSummary(makeNode({ unit: {} })).unitExternalId).toBeUndefined();
    expect(
      mapNodeToTimeSeriesSummary(makeNode({ unit: { externalId: '' } })).unitExternalId,
    ).toBeUndefined();
    expect(mapNodeToTimeSeriesSummary(makeNode({ unit: null })).unitExternalId).toBeUndefined();
  });

  it('reads isStep only when it is a real boolean', () => {
    expect(mapNodeToTimeSeriesSummary(makeNode({ isStep: true })).isStep).toBe(true);
    expect(mapNodeToTimeSeriesSummary(makeNode({ isStep: 'true' })).isStep).toBeUndefined();
    expect(mapNodeToTimeSeriesSummary(makeNode({})).isStep).toBeUndefined();
  });

  it('degrades to node identity when the view properties are missing or malformed', () => {
    expect(
      mapNodeToTimeSeriesSummary(makeNode(undefined, { properties: undefined })),
    ).toMatchObject({ space: CDF_CDM_SPACE, externalId: 'TS-1', type: 'unknown' });
    expect(
      mapNodeToTimeSeriesSummary(
        makeNode(undefined, {
          properties: { [CDF_CDM_SPACE]: 'unexpected' } as unknown as NodeDefinition['properties'],
        }),
      ).name,
    ).toBeUndefined();
    expect(mapNodeToTimeSeriesSummary(makeNode('unexpected')).name).toBeUndefined();
    expect(mapNodeToTimeSeriesSummary(makeNode(null)).name).toBeUndefined();
  });
});

describe('time series helpers', () => {
  it('treats only numeric series as chartable', () => {
    expect(isChartableTimeSeries(makeSummary({ type: 'numeric' }))).toBe(true);
    expect(isChartableTimeSeries(makeSummary({ type: 'string' }))).toBe(false);
    expect(isChartableTimeSeries(makeSummary({ type: 'state' }))).toBe(false);
    expect(isChartableTimeSeries(makeSummary({ type: 'unknown' }))).toBe(false);
  });

  it('labels a series by name, falling back to externalId', () => {
    expect(formatTimeSeriesLabel(makeSummary({ name: 'Flow rate' }))).toBe('Flow rate');
    expect(formatTimeSeriesLabel(makeSummary())).toBe('TS-1');
  });

  it('builds a stable series ref key', () => {
    expect(timeSeriesRefKey({ space: CDF_CDM_SPACE, externalId: 'TS-9' })).toBe(
      `${CDF_CDM_SPACE}:TS-9`,
    );
  });
});
