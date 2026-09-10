import type { CogniteClient, NodeDefinition } from '@cognite/sdk';
import { describe, expect, it, vi } from 'vitest';

import { CDF_CDM_SPACE } from '../constants';
import {
  COGNITE_TIME_SERIES_VIEW,
  TIME_SERIES_ASSETS_FILTER_PROPERTY,
  TIME_SERIES_MAX_RESULTS,
  TIME_SERIES_PAGE_SIZE,
} from '../time-series/constants';

import { CdfTimeSeriesService, enrichChartSeriesLabels } from './CdfTimeSeriesService';

function makeTimeSeriesNode(externalId: string, type: string = 'numeric'): NodeDefinition {
  return {
    createdTime: 0,
    externalId,
    instanceType: 'node',
    lastUpdatedTime: 0,
    space: CDF_CDM_SPACE,
    version: 1,
    properties: {
      [CDF_CDM_SPACE]: {
        'CogniteTimeSeries/v1': {
          name: `Series ${externalId}`,
          type,
          sourceUnit: 'bar',
        },
      },
    },
  };
}

type InstancesClient = Pick<CogniteClient['instances'], 'list'>;
type DatapointsClient = Pick<CogniteClient['datapoints'], 'retrieveLatest' | 'retrieve'>;

function makeClient(
  instances: InstancesClient,
  datapoints: DatapointsClient,
): CogniteClient {
  return { instances, datapoints } as Partial<CogniteClient> as CogniteClient;
}

describe(CdfTimeSeriesService.name, () => {
  it('lists linked time series using assets containsAny filter with pagination', async () => {
    const list = vi
      .fn<CogniteClient['instances']['list']>()
      .mockResolvedValueOnce({
        items: [makeTimeSeriesNode('TS-1')],
        nextCursor: 'page-2',
      })
      .mockResolvedValueOnce({
        items: [makeTimeSeriesNode('TS-2')],
        nextCursor: undefined,
      });

    const service = new CdfTimeSeriesService(
      makeClient({ list }, { retrieveLatest: vi.fn(), retrieve: vi.fn() }),
    );

    const results = await service.listLinkedTimeSeries({
      space: CDF_CDM_SPACE,
      externalId: 'PUMP-101',
    });

    expect(list).toHaveBeenCalledTimes(2);
    expect(list).toHaveBeenNthCalledWith(1, {
      instanceType: 'node',
      sources: [{ source: COGNITE_TIME_SERIES_VIEW }],
      filter: {
        containsAny: {
          property: [...TIME_SERIES_ASSETS_FILTER_PROPERTY],
          values: [{ space: CDF_CDM_SPACE, externalId: 'PUMP-101' }],
        },
      },
      limit: TIME_SERIES_PAGE_SIZE,
      cursor: undefined,
    });
    expect(list).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: 'page-2' }));
    expect(results.series.map((item) => item.externalId)).toEqual(['TS-1', 'TS-2']);
    expect(results.series[0]?.type).toBe('numeric');
    expect(results.truncated).toBe(false);
  });

  it('stops draining cursors at the discovery bound and reports truncation', async () => {
    const pageCount = Math.ceil(TIME_SERIES_MAX_RESULTS / TIME_SERIES_PAGE_SIZE);
    let issued = 0;

    // Always returns a full page and a further cursor: without a bound this would never terminate.
    const list = vi.fn<CogniteClient['instances']['list']>().mockImplementation((params) => {
      const requestedLimit = params?.limit ?? TIME_SERIES_PAGE_SIZE;
      const items = Array.from({ length: requestedLimit }, () =>
        makeTimeSeriesNode(`TS-${(issued += 1)}`),
      );
      return Promise.resolve({ items, nextCursor: `page-${issued}` });
    });

    const service = new CdfTimeSeriesService(
      makeClient({ list }, { retrieveLatest: vi.fn(), retrieve: vi.fn() }),
    );

    const results = await service.listLinkedTimeSeries({
      space: CDF_CDM_SPACE,
      externalId: 'PLANT-1',
    });

    expect(list).toHaveBeenCalledTimes(pageCount);
    expect(results.series).toHaveLength(TIME_SERIES_MAX_RESULTS);
    expect(results.truncated).toBe(true);
  });

  it('never requests more rows than the remaining discovery budget', async () => {
    const list = vi.fn<CogniteClient['instances']['list']>().mockImplementation((params) =>
      Promise.resolve({
        items: Array.from({ length: params?.limit ?? 0 }, (_item, index) =>
          makeTimeSeriesNode(`TS-${index}`),
        ),
        nextCursor: 'more',
      }),
    );

    const service = new CdfTimeSeriesService(
      makeClient({ list }, { retrieveLatest: vi.fn(), retrieve: vi.fn() }),
    );

    await service.listLinkedTimeSeries({ space: CDF_CDM_SPACE, externalId: 'PLANT-1' });

    const requestedLimits = list.mock.calls.map(([params]) => params?.limit);
    expect(requestedLimits.reduce((total, limit) => (total ?? 0) + (limit ?? 0), 0)).toBe(
      TIME_SERIES_MAX_RESULTS,
    );
    expect(requestedLimits.every((limit) => (limit ?? 0) <= TIME_SERIES_PAGE_SIZE)).toBe(true);
  });

  it('retrieves latest datapoints in a single batch using instanceId', async () => {
    const retrieveLatest = vi.fn<CogniteClient['datapoints']['retrieveLatest']>().mockResolvedValue([
      {
        id: 1,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-1' },
        isString: false,
        datapoints: [{ timestamp: new Date(1_700_000_000_000), value: 12 }],
      },
      {
        id: 2,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-2' },
        isString: false,
        datapoints: [],
      },
    ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest, retrieve: vi.fn() }),
    );

    const results = await service.retrieveLatestDatapoints([
      { space: CDF_CDM_SPACE, externalId: 'TS-1' },
      { space: CDF_CDM_SPACE, externalId: 'TS-2' },
    ]);

    expect(retrieveLatest).toHaveBeenCalledWith(
      [
        { instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-1' } },
        { instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-2' } },
      ],
      { ignoreUnknownIds: true },
    );
    expect(results[0]?.hasData).toBe(true);
    expect(results[0]?.latestTimestamp).toBe(1_700_000_000_000);
    expect(results[1]?.hasData).toBe(false);
  });

  it('retrieves aggregated chart datapoints for a time window', async () => {
    const retrieve = vi.fn<CogniteClient['datapoints']['retrieve']>().mockResolvedValue([
      {
        id: 1,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-1' },
        isString: false,
        isStep: false,
        datapoints: [{ timestamp: new Date(1_700_000_000_000), average: 42 }],
      },
    ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest: vi.fn(), retrieve }),
    );

    const start = new Date(1_699_913_600_000);
    const end = new Date(1_700_000_000_000);
    const results = await service.retrieveChartDatapoints(
      [{ space: CDF_CDM_SPACE, externalId: 'TS-1' }],
      start,
      end,
      '1h',
    );

    expect(retrieve).toHaveBeenCalledWith({
      start,
      end,
      granularity: '1h',
      aggregates: ['average'],
      items: [{ instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-1' } }],
    });
    expect(results[0]?.datapoints[0]?.value).toBe(42);
  });

  it('skips CDF round trips entirely when no series are selected', async () => {
    const retrieveLatest = vi.fn<CogniteClient['datapoints']['retrieveLatest']>();
    const retrieve = vi.fn<CogniteClient['datapoints']['retrieve']>();
    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest, retrieve }),
    );

    await expect(service.retrieveLatestDatapoints([])).resolves.toEqual([]);
    await expect(
      service.retrieveChartDatapoints([], new Date(0), new Date(1), '1h'),
    ).resolves.toEqual([]);
    expect(retrieveLatest).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it('reports no data for series the datapoints API omits from the response', async () => {
    const retrieveLatest = vi
      .fn<CogniteClient['datapoints']['retrieveLatest']>()
      .mockResolvedValue([
        // No instanceId: a legacy-shaped item that cannot be matched back to a requested ref.
        { id: 9, isString: false, datapoints: [{ timestamp: new Date(1), value: 1 }] },
      ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest, retrieve: vi.fn() }),
    );

    const results = await service.retrieveLatestDatapoints([
      { space: CDF_CDM_SPACE, externalId: 'TS-MISSING' },
    ]);

    expect(results).toEqual([
      { ref: { space: CDF_CDM_SPACE, externalId: 'TS-MISSING' }, latestTimestamp: undefined, hasData: false },
    ]);
  });

  it('accepts epoch-number datapoint timestamps as well as Date instances', async () => {
    const retrieveLatest = vi.fn<CogniteClient['datapoints']['retrieveLatest']>().mockResolvedValue([
      {
        id: 1,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-1' },
        isString: false,
        datapoints: [{ timestamp: 1_700_000_000_000 as unknown as Date, value: 12 }],
      },
    ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest, retrieve: vi.fn() }),
    );

    const results = await service.retrieveLatestDatapoints([
      { space: CDF_CDM_SPACE, externalId: 'TS-1' },
    ]);

    expect(results[0]?.latestTimestamp).toBe(1_700_000_000_000);
  });

  it('drops aggregate gaps and non-finite averages instead of charting them as zero', async () => {
    const retrieve = vi.fn<CogniteClient['datapoints']['retrieve']>().mockResolvedValue([
      {
        id: 1,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-NUM' },
        externalId: 'legacy-ts-num',
        isString: false,
        isStep: false,
        unit: 'bar',
        datapoints: [
          { timestamp: new Date(2), average: 10 },
          // Gaps in an aggregate window arrive with no `average` and must not become 0.
          { timestamp: new Date(3) },
          { timestamp: new Date(4), average: Number.NaN },
        ],
      },
      { id: 3, isString: false, isStep: false, datapoints: [] },
    ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest: vi.fn(), retrieve }),
    );

    const results = await service.retrieveChartDatapoints(
      [
        { space: CDF_CDM_SPACE, externalId: 'TS-NUM' },
        { space: CDF_CDM_SPACE, externalId: 'TS-ABSENT' },
      ],
      new Date(1),
      new Date(9),
      '1h',
    );

    expect(results[0]?.datapoints).toEqual([{ timestamp: 2, value: 10 }]);
    expect(results[0]?.label).toBe('legacy-ts-num');
    expect(results[0]?.unit).toBe('bar');
    // A ref the API returned nothing for still yields an empty series, so the panel can show a
    // per-series empty state rather than dropping the row.
    expect(results[1]?.datapoints).toEqual([]);
  });

  it('drops string series, which cannot be charted, without dropping the row', async () => {
    const retrieve = vi.fn<CogniteClient['datapoints']['retrieve']>().mockResolvedValue([
      {
        id: 2,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-STR' },
        isString: true,
        // Carries a datapoint so this proves the series is skipped for being a string series,
        // not merely for being empty.
        datapoints: [{ timestamp: new Date(2), value: 'RUNNING' }],
      },
    ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest: vi.fn(), retrieve }),
    );

    const results = await service.retrieveChartDatapoints(
      [{ space: CDF_CDM_SPACE, externalId: 'TS-STR' }],
      new Date(1),
      new Date(9),
      '1h',
    );

    expect(results).toEqual([
      { ref: { space: CDF_CDM_SPACE, externalId: 'TS-STR' }, label: 'TS-STR', datapoints: [] },
    ]);
  });

  it('falls back to the instanceId externalId and unitExternalId when labels are absent', async () => {
    const retrieve = vi.fn<CogniteClient['datapoints']['retrieve']>().mockResolvedValue([
      {
        id: 1,
        instanceId: { space: CDF_CDM_SPACE, externalId: 'TS-1' },
        isString: false,
        isStep: false,
        unitExternalId: 'pressure:bar',
        datapoints: [{ timestamp: new Date(2), average: 5 }],
      },
    ]);

    const service = new CdfTimeSeriesService(
      makeClient({ list: vi.fn() }, { retrieveLatest: vi.fn(), retrieve }),
    );

    const results = await service.retrieveChartDatapoints(
      [{ space: CDF_CDM_SPACE, externalId: 'TS-1' }],
      new Date(1),
      new Date(9),
      '1h',
    );

    expect(results[0]?.label).toBe('TS-1');
    expect(results[0]?.unit).toBe('pressure:bar');
  });
});

describe(enrichChartSeriesLabels.name, () => {
  const ref = { space: CDF_CDM_SPACE, externalId: 'TS-1' };

  it('replaces service labels with the panel label and fills a missing unit from the summary', () => {
    const [enriched] = enrichChartSeriesLabels(
      [{ ref, label: 'TS-1', datapoints: [] }],
      [{ ...ref, name: 'Discharge pressure', type: 'numeric', sourceUnit: 'bar' }],
    );

    expect(enriched?.label).toBe('Discharge pressure');
    expect(enriched?.unit).toBe('bar');
  });

  it('keeps the unit already on the series and prefers it over the summary', () => {
    const [enriched] = enrichChartSeriesLabels(
      [{ ref, label: 'TS-1', unit: 'kPa', datapoints: [] }],
      [{ ...ref, name: 'Discharge pressure', type: 'numeric', sourceUnit: 'bar' }],
    );

    expect(enriched?.unit).toBe('kPa');
  });

  it('falls back to unitExternalId when the summary has no source unit', () => {
    const [enriched] = enrichChartSeriesLabels(
      [{ ref, label: 'TS-1', datapoints: [] }],
      [{ ...ref, type: 'numeric', unitExternalId: 'pressure:bar' }],
    );

    expect(enriched?.unit).toBe('pressure:bar');
  });

  it('leaves the series untouched when no matching summary exists', () => {
    const [enriched] = enrichChartSeriesLabels([{ ref, label: 'TS-1', datapoints: [] }], []);

    expect(enriched?.label).toBe('TS-1');
    expect(enriched?.unit).toBeUndefined();
  });
});
