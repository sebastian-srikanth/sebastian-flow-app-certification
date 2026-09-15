import type { HostAppAPI } from '@cognite/app-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActivitySummary } from './activities/types';
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

const mockAsset = {
  space: CDF_CDM_SPACE,
  externalId: 'PUMP-101',
  name: 'Feed pump',
};

const recentActivity: ActivitySummary = {
  space: CDF_CDM_SPACE,
  externalId: 'ACT-RECENT',
  sourceId: 'WO-9001',
  name: 'Replace seal',
  description: 'Mechanical seal replacement',
  endTime: 1_700_000_000_000,
  sourceContext: 'SAP',
};

const olderActivity: ActivitySummary = {
  space: CDF_CDM_SPACE,
  externalId: 'ACT-OLDER',
  name: 'Inspection',
  scheduledEndTime: 1_699_000_000_000,
};

const sparseActivity: ActivitySummary = {
  space: CDF_CDM_SPACE,
  externalId: 'ACT-MINIMAL',
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

function makeTimeSeriesService(): TimeSeriesService {
  return {
    listLinkedTimeSeries: vi.fn(() => Promise.resolve({ series: [], truncated: false })),
    retrieveLatestDatapoints: vi.fn(() => Promise.resolve([])),
    retrieveChartDatapoints: vi.fn(() => Promise.resolve([])),
  };
}

function makeActivityService(overrides?: Partial<ActivityService>): ActivityService {
  return {
    listRelatedActivities: vi.fn(() =>
      Promise.resolve({
        activities: [recentActivity, olderActivity],
      }),
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

/** Rendered row order, read from the row buttons rather than from view-model internals. */
function readRenderedActivityIds(): string[] {
  return screen
    .getAllByRole('button', { name: /^View details for activity / })
    .map((button) => button.getAttribute('aria-label')?.replace('View details for activity ', ''))
    .filter((identifier): identifier is string => identifier !== undefined);
}

function AssetViewHarness({
  activityService = makeActivityService(),
  timeSeriesService = makeTimeSeriesService(),
  documentService = makeDocumentService(),
}: {
  activityService?: ActivityService;
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
            <ActivityServiceProvider activityService={activityService}>
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

describe('ActivitiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a loading state while related activities are fetched', async () => {
    const listRelatedActivities = vi.fn(
      () =>
        new Promise<{ activities: ActivitySummary[] }>((resolve) => {
          setTimeout(() => resolve({ activities: [recentActivity] }), 50);
        }),
    );

    renderWithProviders(
      <AssetViewHarness activityService={makeActivityService({ listRelatedActivities })} />,
    );

    await waitFor(() => expect(screen.getByText('Loading related work orders…')).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Replace seal')).toBeInTheDocument());
  });

  it('renders related activities in the order CDF returned them', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Replace seal')).toBeInTheDocument());
    expect(screen.getByText('Inspection')).toBeInTheDocument();
    expect(screen.getByText('WO-9001')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Scheduled end')).toBeInTheDocument();
    expect(readRenderedActivityIds()).toEqual(['WO-9001', 'ACT-OLDER']);
  });

  it('states the ordering rule it actually applies', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Replace seal')).toBeInTheDocument());
    expect(
      screen.getByText(
        /ordered by completion date — most recently completed first, with activities that have no completion date listed first/i,
      ),
    ).toBeInTheDocument();
  });

  it('calls the activity service with the selected asset', async () => {
    const listRelatedActivities = vi.fn(() =>
      Promise.resolve({ activities: [recentActivity] }),
    );

    renderWithProviders(
      <AssetViewHarness activityService={makeActivityService({ listRelatedActivities })} />,
    );

    await waitFor(() => expect(listRelatedActivities).toHaveBeenCalledWith(
      expect.objectContaining({
        space: CDF_CDM_SPACE,
        externalId: 'PUMP-101',
      }),
      undefined,
    ));
  });

  it('shows an empty state when no activities are linked', async () => {
    renderWithProviders(
      <AssetViewHarness
        activityService={makeActivityService({
          listRelatedActivities: vi.fn(() => Promise.resolve({ activities: [] })),
        })}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText(/No work orders or maintenance activities are linked/i),
      ).toBeInTheDocument(),
    );
  });

  it('shows an error state with retry', async () => {
    const listRelatedActivities = vi
      .fn()
      .mockRejectedValueOnce(new Error('Activities query failed'))
      .mockResolvedValueOnce({ activities: [recentActivity] });

    renderWithProviders(
      <AssetViewHarness activityService={makeActivityService({ listRelatedActivities })} />,
    );

    await waitFor(() => expect(screen.getByText('Activities query failed')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() => expect(screen.getByText('Replace seal')).toBeInTheDocument());
  });

  it('shows a no-access state for authorization failures', async () => {
    renderWithProviders(
      <AssetViewHarness
        activityService={makeActivityService({
          listRelatedActivities: vi.fn(() =>
            Promise.reject(Object.assign(new Error('Forbidden'), { status: 403 })),
          ),
        })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(/You do not have access to work order data/i)).toBeInTheDocument(),
    );
  });

  it('does not render fabricated status badges', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Replace seal')).toBeInTheDocument());
    expect(screen.queryByText(/^OPEN$/i)).toBeNull();
    expect(screen.queryByText(/^CLOSED$/i)).toBeNull();
    expect(
      screen.getByText(/Status isn't available for these activity records/i),
    ).toBeInTheDocument();
  });

  it('opens activity details in a dialog without leaving Asset 360', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Replace seal')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: /View details for activity WO-9001/i }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Replace seal' })).toBeInTheDocument();
    expect(within(dialog).getByText('WO-9001')).toBeInTheDocument();
    expect(within(dialog).getByText('Mechanical seal replacement')).toBeInTheDocument();
    expect(within(dialog).getByText('SAP')).toBeInTheDocument();
    expect(
      within(dialog).getByText(/Status isn't available for these activity records/i),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/^OPEN$/i)).toBeNull();
    expect(screen.getByRole('heading', { name: 'Feed pump', hidden: true })).toBeInTheDocument();
  });

  it('handles activities with missing optional properties', async () => {
    renderWithProviders(
      <AssetViewHarness
        activityService={makeActivityService({
          listRelatedActivities: vi.fn(() =>
            Promise.resolve({ activities: [sparseActivity] }),
          ),
        })}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /View details for activity ACT-MINIMAL/i }),
      ).toBeInTheDocument(),
    );
    await userEvent.click(
      screen.getByRole('button', { name: /View details for activity ACT-MINIMAL/i }),
    );

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'ACT-MINIMAL' })).toBeInTheDocument();
    expect(within(dialog).queryByText('Description')).toBeNull();
  });

  it('loads more activities from the next server page', async () => {
    const pageTwoActivity: ActivitySummary = {
      space: CDF_CDM_SPACE,
      externalId: 'ACT-PAGE-2',
      name: 'Lubrication',
      endTime: 1_698_000_000_000,
    };

    const listRelatedActivities = vi
      .fn()
      .mockResolvedValueOnce({
        activities: Array.from({ length: 20 }, (_, index) => ({
          space: CDF_CDM_SPACE,
          externalId: `ACT-${index}`,
          name: `Activity ${index}`,
          endTime: 1_700_000_000_000 - index,
        })),
        nextCursor: 'page-2',
      })
      .mockResolvedValueOnce({
        activities: [pageTwoActivity],
      });

    renderWithProviders(
      <AssetViewHarness activityService={makeActivityService({ listRelatedActivities })} />,
    );

    await waitFor(() => expect(screen.getByText('Activity 0')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));

    await waitFor(() => expect(listRelatedActivities).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByText('Lubrication')).toBeInTheDocument());
  });

  // FR-007 regression: recency is CDF's cursorable `endTime` ordering. Both pages below are
  // null-heavy, which is the case where a client-side relevant-date comparator diverges: it would
  // rank page 1 by `startTime`, then reshuffle those already-visible rows once page 2 arrives and
  // contributed a newer fallback date. Loading a page must only append.
  it('keeps the server recency order globally correct across pages of null-endTime activities', async () => {
    // Server order for `endTime` descending / nulls first: every null-endTime activity precedes
    // every completed one, regardless of the other timestamps a client comparator would prefer.
    const pageOne: ActivitySummary[] = [
      {
        space: CDF_CDM_SPACE,
        externalId: 'WO-NULL-1',
        name: 'Overhaul in progress',
        startTime: Date.UTC(2024, 0, 1),
      },
      {
        space: CDF_CDM_SPACE,
        externalId: 'WO-NULL-2',
        name: 'Vibration survey in progress',
        startTime: Date.UTC(2021, 0, 1),
      },
    ];

    const pageTwo: ActivitySummary[] = [
      {
        // Newest `startTime` in the whole result set. A client comparator would hoist this above
        // the page-one rows the analyst is already looking at.
        space: CDF_CDM_SPACE,
        externalId: 'WO-NULL-3',
        name: 'Emergency callout in progress',
        startTime: Date.UTC(2026, 0, 1),
      },
      {
        // No timestamp of any kind — a client comparator would push this to the very end.
        space: CDF_CDM_SPACE,
        externalId: 'WO-NULL-4',
        name: 'Undated activity',
      },
      {
        space: CDF_CDM_SPACE,
        externalId: 'WO-DONE-1',
        name: 'Completed bearing change',
        endTime: Date.UTC(2023, 0, 1),
      },
    ];

    const listRelatedActivities = vi
      .fn()
      .mockResolvedValueOnce({ activities: pageOne, nextCursor: 'page-2' })
      .mockResolvedValueOnce({ activities: pageTwo });

    renderWithProviders(
      <AssetViewHarness activityService={makeActivityService({ listRelatedActivities })} />,
    );

    await waitFor(() => expect(screen.getByText('Overhaul in progress')).toBeInTheDocument());
    expect(readRenderedActivityIds()).toEqual(['WO-NULL-1', 'WO-NULL-2']);

    await userEvent.click(screen.getByRole('button', { name: 'Load more' }));
    await waitFor(() => expect(screen.getByText('Completed bearing change')).toBeInTheDocument());

    const afterLoadMore = readRenderedActivityIds();
    expect(afterLoadMore).toEqual([
      'WO-NULL-1',
      'WO-NULL-2',
      'WO-NULL-3',
      'WO-NULL-4',
      'WO-DONE-1',
    ]);
    // Append-only: the rows visible before paging keep their positions.
    expect(afterLoadMore.slice(0, 2)).toEqual(['WO-NULL-1', 'WO-NULL-2']);
    // The undated row still renders a truthful "no date" label in its server position.
    expect(screen.getByText('No date available')).toBeInTheDocument();
  });
});

describe('ActivitiesPanel isolation', () => {
  it('renders independently below the time series panel', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Time series' })).toBeInTheDocument());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Work orders / activities' })).toBeInTheDocument(),
    );
  });

  it('does not break the asset header when activities fail', async () => {
    renderWithProviders(
      <AssetViewHarness
        activityService={makeActivityService({
          listRelatedActivities: vi.fn(() => Promise.reject(new Error('Activities down'))),
        })}
      />,
    );

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Feed pump' })).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Activities down')).toBeInTheDocument());
  });
});
