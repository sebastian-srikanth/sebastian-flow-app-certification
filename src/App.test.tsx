import type { HostAppAPI } from '@cognite/app-sdk';
import { CogniteClient } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import App, { type AppDeps } from './App';
import { AssetWorkspace } from './features/asset-workspace/components/AssetWorkspace';
import { CDF_CDM_SPACE } from './features/asset-workspace/constants';
import { parseAppState } from './features/asset-workspace/parseAppState';
import type { ActivityService } from './features/asset-workspace/services/ActivityService';
import type { AssetService } from './features/asset-workspace/services/AssetService';
import type { DocumentService } from './features/asset-workspace/services/DocumentService';
import type { TimeSeriesService } from './features/asset-workspace/services/TimeSeriesService';
import { ActivityServiceProvider } from './features/asset-workspace/state/ActivityServiceProvider';
import { AppStateProvider } from './features/asset-workspace/state/AppStateProvider';
import { AssetServiceProvider } from './features/asset-workspace/state/AssetServiceProvider';
import { DocumentServiceProvider } from './features/asset-workspace/state/DocumentServiceProvider';
import { TimeSeriesServiceProvider } from './features/asset-workspace/state/TimeSeriesServiceProvider';
import { testFusionHostDeps } from './features/asset-workspace/testHostDeps';
import { TestFusionProviders } from './features/asset-workspace/testProviders';
import { type FusionHostProviderDeps } from './host/FusionHostProvider';

type AppApi = Pick<HostAppAPI, 'syncInternalState'>;

const mockPump = {
  space: CDF_CDM_SPACE,
  externalId: 'PUMP-101',
  name: 'Feed pump',
  description: 'Primary feed pump',
  typeExternalId: 'PumpType',
  parentExternalId: 'AREA-1',
};

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
}

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = createTestQueryClient();
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

function makeApi(): AppApi {
  return {
    syncInternalState: vi.fn<HostAppAPI['syncInternalState']>(() => Promise.resolve(true)),
  };
}

function makeDeps(): AppDeps {
  return {
    connectToHostApp: testFusionHostDeps.connectToHostApp,
    createClient: testFusionHostDeps.createClient,
  };
}

function makeFailingDeps(): AppDeps {
  return {
    connectToHostApp: vi.fn<FusionHostProviderDeps['connectToHostApp']>(() =>
      Promise.reject(new Error('Host connection failed')),
    ),
    createClient: vi.fn<FusionHostProviderDeps['createClient']>((config) => new CogniteClient(config)),
  };
}

function makeAssetService(overrides?: Partial<AssetService>): AssetService {
  return {
    searchAssets: vi.fn<AssetService['searchAssets']>(() => Promise.resolve([])),
    getAsset: vi.fn<AssetService['getAsset']>(() => Promise.resolve(mockPump)),
    ...overrides,
  };
}

function makeActivityService(): ActivityService {
  return {
    listRelatedActivities: vi.fn(() => Promise.resolve({ activities: [] })),
  };
}

function makeTimeSeriesService(): TimeSeriesService {
  return {
    listLinkedTimeSeries: vi.fn(() => Promise.resolve({ series: [], truncated: false })),
    retrieveLatestDatapoints: vi.fn(() => Promise.resolve([])),
    retrieveChartDatapoints: vi.fn(() => Promise.resolve([])),
  };
}

function makeDocumentService(): DocumentService {
  return {
    listRelatedDocuments: vi.fn(() => Promise.resolve({ documents: [] })),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://download.test/file')),
  };
}

type WorkspaceHarnessProps = {
  api?: AppApi;
  initialState?: string;
  assetService?: AssetService;
  timeSeriesService?: TimeSeriesService;
  activityService?: ActivityService;
  documentService?: DocumentService;
};

function WorkspaceHarness({
  api = makeApi(),
  initialState,
  assetService = makeAssetService(),
  timeSeriesService = makeTimeSeriesService(),
  activityService = makeActivityService(),
  documentService = makeDocumentService(),
}: WorkspaceHarnessProps) {
  return (
    <TestFusionProviders>
      <AppStateProvider api={api} initialState={initialState}>
        <AssetServiceProvider assetService={assetService}>
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

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state while connecting to Fusion', () => {
    renderWithQueryClient(
      <App
        deps={{
          connectToHostApp: () => new Promise(() => undefined),
          createClient: (config) => new CogniteClient(config),
        }}
      />,
    );
    expect(screen.getByText('Connecting to Cognite Data Fusion…')).toBeInTheDocument();
  });

  it('renders startup error when host connection fails', async () => {
    renderWithQueryClient(<App deps={makeFailingDeps()} />);
    await waitFor(() =>
      expect(
        screen.getByText(/Failed to connect to the Fusion host/i),
      ).toBeInTheDocument(),
    );
  });

  it('uses a single host connection for workspace bootstrap', async () => {
    const connectToHostApp = vi.fn<FusionHostProviderDeps['connectToHostApp']>(
      testFusionHostDeps.connectToHostApp,
    );

    renderWithQueryClient(
      <App
        deps={{
          connectToHostApp,
          createClient: testFusionHostDeps.createClient,
        }}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText('Asset 360 Investigation Workspace')).toBeInTheDocument(),
    );
    expect(connectToHostApp).toHaveBeenCalledTimes(1);
  });

  it('renders the Asset 360 workspace home search screen', async () => {
    renderWithQueryClient(<App deps={makeDeps()} />);
    await waitFor(() =>
      expect(screen.getByText('Asset 360 Investigation Workspace')).toBeInTheDocument(),
    );
    expect(screen.getByLabelText('Search assets')).toBeInTheDocument();
  });
});

describe('Asset workspace integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders ranked search results and opens the asset header when a result is selected', async () => {
    const api = makeApi();
    const searchAssets = vi.fn<AssetService['searchAssets']>(() => Promise.resolve([mockPump]));
    const getAsset = vi.fn<AssetService['getAsset']>(() => Promise.resolve(mockPump));

    renderWithQueryClient(
      <WorkspaceHarness
        api={api}
        assetService={makeAssetService({ searchAssets, getAsset })}
      />,
    );

    await waitFor(() => expect(screen.getByLabelText('Search assets')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('Search assets'), 'pump');

    await waitFor(() => expect(screen.getByText('Matching assets')).toBeInTheDocument());
    expect(screen.getByText('Feed pump')).toBeInTheDocument();
    expect(screen.getByText('PUMP-101')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /feed pump/i }));

    await waitFor(() => expect(screen.getByRole('heading', { name: 'Feed pump' })).toBeInTheDocument());
    expect(screen.getAllByText('Feed pump').length).toBeGreaterThan(0);
    expect(screen.getByText('Primary feed pump')).toBeInTheDocument();
    expect(api.syncInternalState).toHaveBeenCalledWith(
      JSON.stringify({
        view: 'asset',
        selectedAsset: { space: CDF_CDM_SPACE, externalId: 'PUMP-101' },
        searchQuery: 'pump',
      }),
    );
  });

  it('shows an empty state when search returns no assets', async () => {
    const searchAssets = vi.fn<AssetService['searchAssets']>(() => Promise.resolve([]));

    renderWithQueryClient(<WorkspaceHarness assetService={makeAssetService({ searchAssets })} />);

    await waitFor(() => expect(screen.getByLabelText('Search assets')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('Search assets'), 'unknown-tag');

    await waitFor(() =>
      expect(
        screen.getByText(/No assets matched your search/i),
      ).toBeInTheDocument(),
    );
  });

  it('shows a search error state when CDF search fails', async () => {
    const searchAssets = vi.fn<AssetService['searchAssets']>(() =>
      Promise.reject(new Error('CDF search failed')),
    );

    renderWithQueryClient(<WorkspaceHarness assetService={makeAssetService({ searchAssets })} />);

    await waitFor(() => expect(screen.getByLabelText('Search assets')).toBeInTheDocument());
    await userEvent.type(screen.getByLabelText('Search assets'), 'pump');

    await waitFor(() => expect(screen.getByText('CDF search failed')).toBeInTheDocument());
  });

  it('restores a shared asset selection from host internal state', async () => {
    const getAsset = vi.fn<AssetService['getAsset']>(() => Promise.resolve(mockPump));
    const initialState = JSON.stringify({
      view: 'asset',
      selectedAsset: { space: CDF_CDM_SPACE, externalId: 'PUMP-101' },
      searchQuery: 'pump',
    });

    renderWithQueryClient(
      <WorkspaceHarness
        initialState={initialState}
        assetService={makeAssetService({ getAsset })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Feed pump' })).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getAllByText('Feed pump').length).toBeGreaterThan(0));
    expect(parseAppState(initialState).selectedAsset).toEqual({
      space: CDF_CDM_SPACE,
      externalId: 'PUMP-101',
    });
  });

  it('shows not-found when the selected asset cannot be loaded', async () => {
    const getAsset = vi.fn<AssetService['getAsset']>(() => Promise.resolve(null));
    const initialState = JSON.stringify({
      view: 'asset',
      selectedAsset: { space: CDF_CDM_SPACE, externalId: 'MISSING' },
    });

    renderWithQueryClient(
      <WorkspaceHarness
        initialState={initialState}
        assetService={makeAssetService({ getAsset })}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText(/could not be found or you may not have access/i)).toBeInTheDocument(),
    );
  });
});
