import type { HostAppAPI } from '@cognite/app-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { AssetWorkspace } from './components/AssetWorkspace';
import { CDF_CDM_SPACE } from './constants';
import type { ActivityService } from './services/ActivityService';
import type { DocumentService } from './services/DocumentService';
import type { TimeSeriesService } from './services/TimeSeriesService';
import { ActivityServiceProvider } from './state/ActivityServiceProvider';
import { AppStateProvider } from './state/AppStateProvider';
import { AssetServiceProvider } from './state/AssetServiceProvider';
import { DocumentServiceProvider } from './state/DocumentServiceProvider';
import { TimeSeriesServiceProvider } from './state/TimeSeriesServiceProvider';
import { TestFusionProviders } from './testProviders';
import { TIME_SERIES_MAX_RESULTS } from './time-series/constants';
import type { TimeSeriesRef, TimeSeriesSummary } from './time-series/types';

const ANCHOR_MS = 1_700_000_000_000;

const mockAsset = {
  space: CDF_CDM_SPACE,
  externalId: 'PUMP-101',
  name: 'Feed pump',
};

const numericSeries: TimeSeriesSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'TS-NUM-1',
  name: 'Discharge pressure',
  type: 'numeric',
  sourceUnit: 'bar',
};

const numericSeriesTwo: TimeSeriesSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'TS-NUM-2',
  name: 'Flow rate',
  type: 'numeric',
  sourceUnit: 'm3/h',
};

const stringSeries: TimeSeriesSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'TS-STR-1',
  name: 'Operator note',
  type: 'string',
};

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchInterval: false,
      },
    },
  });
}

function renderWithProviders(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function makeApi(): Pick<HostAppAPI, 'syncInternalState'> {
  return {
    syncInternalState: vi.fn(() => Promise.resolve(true)),
  };
}

function makeActivityService(): ActivityService {
  return {
    listRelatedActivities: vi.fn(() => Promise.resolve({ activities: [] })),
  };
}

function makeTimeSeriesService(overrides?: Partial<TimeSeriesService>): TimeSeriesService {
  return {
    listLinkedTimeSeries: vi.fn(() =>
      Promise.resolve({
        series: [numericSeries, numericSeriesTwo, stringSeries],
        truncated: false,
      }),
    ),
    retrieveLatestDatapoints: vi.fn((refs: Array<{ space: string; externalId: string }>) =>
      Promise.resolve(
        refs.map((ref) => ({
          ref,
          latestTimestamp:
            ref.externalId === 'TS-NUM-2' ? ANCHOR_MS - 3_600_000 : ANCHOR_MS,
          hasData: true,
        })),
      ),
    ),
    retrieveChartDatapoints: vi.fn(() =>
      Promise.resolve([
        {
          ref: numericSeries,
          label: numericSeries.name!,
          datapoints: [
            { timestamp: ANCHOR_MS - 3_600_000, value: 10 },
            { timestamp: ANCHOR_MS, value: 12 },
          ],
        },
      ]),
    ),
    ...overrides,
  };
}

function makeDocumentService(): DocumentService {
  return {
    listRelatedDocuments: vi.fn(() => Promise.resolve({ documents: [] })),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://download.test/file')),
  };
}

function AssetViewHarness({
  timeSeriesService = makeTimeSeriesService(),
  documentService = makeDocumentService(),
}: {
  timeSeriesService?: TimeSeriesService;
  documentService?: DocumentService;
}) {
  const initialState = JSON.stringify({
    view: 'asset',
    selectedAsset: mockAsset,
  });

  return (
    <TestFusionProviders>
      <AppStateProvider api={makeApi()} initialState={initialState}>
        <AssetServiceProvider
          assetService={{
            searchAssets: vi.fn(),
            getAsset: vi.fn(() => Promise.resolve(mockAsset)),
          }}
        >
          <TimeSeriesServiceProvider timeSeriesService={timeSeriesService}>
            <ActivityServiceProvider activityService={makeActivityService()}>
              <DocumentServiceProvider documentService={documentService}>
                <AssetWorkspace />
              </DocumentServiceProvider>
            </ActivityServiceProvider>
          </TimeSeriesServiceProvider>
        </AssetServiceProvider>
      </AppStateProvider>
    </TestFusionProviders>
  );
}

describe('TimeSeriesPanel', () => {
  // The panel loads the chart behind React.lazy. Resolving that module up front keeps the
  // transform cost out of the individual `waitFor` windows without mocking the boundary away.
  beforeAll(async () => {
    await import('./components/TimeSeriesChart');
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(globalThis, 'setInterval');
    vi.spyOn(globalThis, 'setTimeout');
  });

  it('loads and renders linked time series', async () => {
    const listLinkedTimeSeries = vi.fn(() =>
      Promise.resolve({ series: [numericSeries], truncated: false }),
    );

    renderWithProviders(
      <AssetViewHarness timeSeriesService={makeTimeSeriesService({ listLinkedTimeSeries })} />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    expect(listLinkedTimeSeries).toHaveBeenCalledWith(
      expect.objectContaining({
        space: CDF_CDM_SPACE,
        externalId: 'PUMP-101',
      }),
    );
  });

  // FR-005: the 500-series discovery bound is a platform-safety contract, so the panel has to say
  // out loud that it is showing a bounded slice rather than the asset's complete set.
  it('counts the linked series honestly when discovery was not truncated', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    expect(screen.getByText('(3)')).toBeInTheDocument();
    expect(screen.queryByText(/linked time series\. The first/i)).toBeNull();
  });

  it('discloses truncation when the asset exceeds the discovery bound', async () => {
    const series = Array.from({ length: TIME_SERIES_MAX_RESULTS }, (_, index) => ({
      space: CDF_CDM_SPACE,
      externalId: `TS-${index}`,
      name: `Series ${index}`,
      type: 'numeric' as const,
    }));

    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          listLinkedTimeSeries: vi.fn(() => Promise.resolve({ series, truncated: true })),
        })}
      />,
    );

    await waitFor(() => expect(screen.getByText('Series 0')).toBeInTheDocument());
    // The heading must not imply the count is the asset's total.
    expect(screen.getByText(`(first ${TIME_SERIES_MAX_RESULTS})`)).toBeInTheDocument();
    expect(screen.queryByText(`(${TIME_SERIES_MAX_RESULTS})`)).toBeNull();
    expect(
      screen.getByText(
        new RegExp(
          `This asset has more than ${TIME_SERIES_MAX_RESULTS} linked time series\\. The first\\s+${TIME_SERIES_MAX_RESULTS} are listed`,
          'i',
        ),
      ),
    ).toBeInTheDocument();
  });

  it('shows an empty state when no linked time series exist', async () => {
    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          listLinkedTimeSeries: vi.fn(() => Promise.resolve({ series: [], truncated: false })),
        })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(/No time series are linked to this asset/i)).toBeInTheDocument(),
    );
  });

  it('shows series error state with retry', async () => {
    const listLinkedTimeSeries = vi
      .fn()
      .mockRejectedValueOnce(new Error('Linked series failed'))
      .mockResolvedValueOnce({ series: [numericSeries], truncated: false });

    renderWithProviders(
      <AssetViewHarness timeSeriesService={makeTimeSeriesService({ listLinkedTimeSeries })} />,
    );

    await waitFor(() => expect(screen.getByText('Linked series failed')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
  });

  it('shows guidance when no series is selected', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() =>
      expect(screen.getByText('Select one or more time series to plot.')).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Time series chart for selected numeric series')).toBeNull();
  });

  it('plots a selected numeric series using latest-datapoint anchoring', async () => {
    const retrieveLatestDatapoints = vi.fn(() =>
      Promise.resolve([{ ref: numericSeries, latestTimestamp: ANCHOR_MS, hasData: true }]),
    );
    const retrieveChartDatapoints = vi.fn(() =>
      Promise.resolve([
        {
          ref: numericSeries,
          label: numericSeries.name!,
          datapoints: [{ timestamp: ANCHOR_MS, value: 12 }],
        },
      ]),
    );

    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          retrieveLatestDatapoints,
          retrieveChartDatapoints,
        })}
      />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Plot Discharge pressure/i));

    await waitFor(() =>
      expect(screen.getByLabelText('Time series chart for selected numeric series')).toBeInTheDocument(),
    );

    expect(retrieveLatestDatapoints).toHaveBeenCalledWith([
      { space: CDF_CDM_SPACE, externalId: 'TS-NUM-1' },
    ]);

    await waitFor(() => expect(retrieveChartDatapoints).toHaveBeenCalled());
    const chartCall = retrieveChartDatapoints.mock.calls[
      retrieveChartDatapoints.mock.calls.length - 1
    ] as unknown as [TimeSeriesRef[], Date, Date, string];
    expect(chartCall[1]).toEqual(new Date(ANCHOR_MS - 24 * 60 * 60 * 1000));
    expect(chartCall[2]).toEqual(new Date(ANCHOR_MS));
    expect(chartCall[2].getTime()).not.toBe(Date.now());
  });

  it('supports selecting multiple numeric series', async () => {
    const retrieveLatestDatapoints = vi.fn(() =>
      Promise.resolve([
        { ref: numericSeries, latestTimestamp: ANCHOR_MS, hasData: true },
        { ref: numericSeriesTwo, latestTimestamp: ANCHOR_MS - 1_000, hasData: true },
      ]),
    );

    renderWithProviders(
      <AssetViewHarness timeSeriesService={makeTimeSeriesService({ retrieveLatestDatapoints })} />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Plot Discharge pressure/i));
    await userEvent.click(screen.getByLabelText(/Plot Flow rate/i));

    await waitFor(() =>
      expect(retrieveLatestDatapoints).toHaveBeenCalledWith([
        { space: CDF_CDM_SPACE, externalId: 'TS-NUM-1' },
        { space: CDF_CDM_SPACE, externalId: 'TS-NUM-2' },
      ]),
    );
  });

  it('shows no datapoints state when all selected series are empty', async () => {
    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          retrieveLatestDatapoints: vi.fn(() =>
            Promise.resolve([{ ref: numericSeries, hasData: false }]),
          ),
        })}
      />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Plot Discharge pressure/i));

    await waitFor(() =>
      expect(screen.getByText(/No datapoints were found for the selected series/i)).toBeInTheDocument(),
    );
    expect(screen.queryByLabelText('Time series chart for selected numeric series')).toBeNull();
  });

  it('marks string series as not chartable', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() =>
      expect(screen.getByText(/Not chartable \(string\)/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/Plot Operator note/i)).toHaveAttribute('aria-disabled', 'true');
  });

  it('changes the visible time range using presets', async () => {
    const retrieveChartDatapoints = vi.fn(() =>
      Promise.resolve([
        {
          ref: numericSeries,
          label: numericSeries.name!,
          datapoints: [{ timestamp: ANCHOR_MS, value: 12 }],
        },
      ]),
    );

    renderWithProviders(
      <AssetViewHarness timeSeriesService={makeTimeSeriesService({ retrieveChartDatapoints })} />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Plot Discharge pressure/i));
    await waitFor(() => expect(retrieveChartDatapoints).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: '6h' }));

    await waitFor(() => {
      const lastCall = retrieveChartDatapoints.mock.calls[
        retrieveChartDatapoints.mock.calls.length - 1
      ] as unknown as [TimeSeriesRef[], Date, Date, string];
      expect(lastCall[1]).toEqual(new Date(ANCHOR_MS - 6 * 60 * 60 * 1000));
      expect(lastCall[2]).toEqual(new Date(ANCHOR_MS));
    });
  });

  it('refreshes chart data manually', async () => {
    const retrieveLatestDatapoints = vi
      .fn()
      .mockResolvedValueOnce([{ ref: numericSeries, latestTimestamp: ANCHOR_MS, hasData: true }])
      .mockResolvedValueOnce([
        { ref: numericSeries, latestTimestamp: ANCHOR_MS + 60_000, hasData: true },
      ]);
    const retrieveChartDatapoints = vi.fn(() =>
      Promise.resolve([
        {
          ref: numericSeries,
          label: numericSeries.name!,
          datapoints: [{ timestamp: ANCHOR_MS, value: 12 }],
        },
      ]),
    );

    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          retrieveLatestDatapoints,
          retrieveChartDatapoints,
        })}
      />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Plot Discharge pressure/i));
    await waitFor(() => expect(retrieveChartDatapoints).toHaveBeenCalledTimes(1));

    await userEvent.click(screen.getByRole('button', { name: /Refresh time series chart/i }));

    await waitFor(() => expect(retrieveLatestDatapoints.mock.calls.length).toBeGreaterThan(1));
    await waitFor(() => expect(retrieveChartDatapoints.mock.calls.length).toBeGreaterThan(1));
  });

  it('does not register polling timers in the panel view model', async () => {
    renderWithProviders(<AssetViewHarness />);
    await waitFor(() => expect(screen.getByText('Linked series')).toBeInTheDocument());

    const intervalCalls = vi.mocked(setInterval).mock.calls.filter(([handler]) => {
      return typeof handler === 'function' && handler.toString().includes('refetch');
    });
    expect(intervalCalls).toHaveLength(0);
  });

  it('re-anchors to a newer second series when added after an older series', async () => {
    const olderAnchor = ANCHOR_MS - 24 * 60 * 60 * 1000;
    const newerAnchor = ANCHOR_MS;

    const retrieveLatestDatapoints = vi.fn((refs: Array<{ externalId: string }>) => {
      if (refs.length === 1 && refs[0]?.externalId === 'TS-NUM-1') {
        return Promise.resolve([{ ref: numericSeries, latestTimestamp: olderAnchor, hasData: true }]);
      }
      return Promise.resolve([
        { ref: numericSeries, latestTimestamp: olderAnchor, hasData: true },
        { ref: numericSeriesTwo, latestTimestamp: newerAnchor, hasData: true },
      ]);
    });
    const retrieveChartDatapoints = vi.fn(() =>
      Promise.resolve([
        {
          ref: numericSeries,
          label: numericSeries.name!,
          datapoints: [{ timestamp: newerAnchor, value: 12 }],
        },
      ]),
    );

    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          retrieveLatestDatapoints,
          retrieveChartDatapoints,
        })}
      />,
    );

    await waitFor(() => expect(screen.getByText('Discharge pressure')).toBeInTheDocument());
    await userEvent.click(screen.getByLabelText(/Plot Discharge pressure/i));
    await waitFor(() => expect(retrieveChartDatapoints).toHaveBeenCalled());

    const firstCall = retrieveChartDatapoints.mock.calls[0] as unknown as [
      unknown,
      Date,
      Date,
      string,
    ];
    expect(firstCall[2]).toEqual(new Date(olderAnchor));

    await userEvent.click(screen.getByLabelText(/Plot Flow rate/i));

    await waitFor(() => {
      const lastCall = retrieveChartDatapoints.mock.calls[
        retrieveChartDatapoints.mock.calls.length - 1
      ] as unknown as [unknown, Date, Date, string];
      expect(lastCall[2]).toEqual(new Date(newerAnchor));
    });
  });

  it('shows a no-access state for authorization failures', async () => {
    renderWithProviders(
      <AssetViewHarness
        timeSeriesService={makeTimeSeriesService({
          listLinkedTimeSeries: vi.fn(() =>
            Promise.reject(Object.assign(new Error('Forbidden'), { status: 403 })),
          ),
        })}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(/You don't have access to time-series data for this asset/i),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('heading', { name: 'Feed pump' })).toBeInTheDocument();
  });
});

describe('TimeSeriesPanel isolation', () => {
  it('renders independently below the asset header', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Feed pump' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Time series' })).toBeInTheDocument());
  });
});
