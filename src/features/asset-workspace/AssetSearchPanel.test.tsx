import { CogniteClient } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FusionHostProvider } from '../../host/FusionHostProvider';
import { makeTestHostApi } from '../../host/testHostApi';

import { AssetWorkspace } from './components/AssetWorkspace';
import { CDF_CDM_SPACE } from './constants';
import { createRecentAssetsStorage } from './recent-assets/recentAssetsStorage';
import type { ActivityService } from './services/ActivityService';
import type { AssetService } from './services/AssetService';
import type { DocumentService } from './services/DocumentService';
import type { TimeSeriesService } from './services/TimeSeriesService';
import { ActivityServiceProvider } from './state/ActivityServiceProvider';
import { AppStateProvider } from './state/AppStateProvider';
import { AssetServiceProvider } from './state/AssetServiceProvider';
import { DocumentServiceProvider } from './state/DocumentServiceProvider';
import { RecentAssetsProvider } from './state/RecentAssetsProvider';
import { TimeSeriesServiceProvider } from './state/TimeSeriesServiceProvider';

const environmentA = { project: 'publicdatacdm', baseUrl: 'https://api.cognitedata.com' };
const environmentB = { project: 'sebastian-srikanth', baseUrl: 'https://bluefield.cognitedata.com' };

const mockPump = {
  space: CDF_CDM_SPACE,
  externalId: 'PUMP-101',
  name: 'Feed pump',
};

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function makeHostDeps(project: string, baseUrl: string) {
  return {
    connectToHostApp: () =>
      Promise.resolve({
        api: makeTestHostApi({
          getProject: () => Promise.resolve(project),
          getBaseUrl: () => Promise.resolve(baseUrl),
        }),
      }),
    createClient: vi.fn((config) => new CogniteClient(config)),
  };
}

function renderWorkspace({
  project,
  baseUrl,
  storage,
  assetService,
}: {
  project: string;
  baseUrl: string;
  storage: Storage;
  assetService: AssetService;
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  const timeSeriesService: TimeSeriesService = {
    listLinkedTimeSeries: vi.fn(() => Promise.resolve({ series: [], truncated: false })),
    retrieveLatestDatapoints: vi.fn(() => Promise.resolve([])),
    retrieveChartDatapoints: vi.fn(() => Promise.resolve([])),
  };
  const activityService: ActivityService = {
    listRelatedActivities: vi.fn(() => Promise.resolve({ activities: [] })),
  };
  const documentService: DocumentService = {
    listRelatedDocuments: vi.fn(() => Promise.resolve({ documents: [] })),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://download.test/file')),
  };

  const ui = (
    <QueryClientProvider client={queryClient}>
      <FusionHostProvider deps={makeHostDeps(project, baseUrl)}>
        <AppStateProvider api={null}>
          <RecentAssetsProvider storage={createRecentAssetsStorage(storage)}>
            <AssetServiceProvider assetService={assetService}>
              <TimeSeriesServiceProvider timeSeriesService={timeSeriesService}>
                <ActivityServiceProvider activityService={activityService}>
                  <DocumentServiceProvider documentService={documentService}>
                    <AssetWorkspace />
                  </DocumentServiceProvider>
                </ActivityServiceProvider>
              </TimeSeriesServiceProvider>
            </AssetServiceProvider>
          </RecentAssetsProvider>
        </AppStateProvider>
      </FusionHostProvider>
    </QueryClientProvider>
  );

  return render(ui);
}

describe('AssetSearchPanel recent assets', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows recently viewed assets and reopens them in one click', async () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);
    recentAssetsStorage.record(environmentA, mockPump);

    const searchAssets = vi.fn<AssetService['searchAssets']>(() => Promise.resolve([]));
    const getAsset = vi.fn<AssetService['getAsset']>(() => Promise.resolve(mockPump));

    renderWorkspace({
      project: environmentA.project,
      baseUrl: environmentA.baseUrl,
      storage,
      assetService: { searchAssets, getAsset },
    });

    await waitFor(() =>
      expect(screen.getByLabelText('Recently viewed assets')).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Open asset Feed pump/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Open asset Feed pump/i }));

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Feed pump' })).toBeInTheDocument(),
    );
  });

  it('isolates recent history between project and baseUrl combinations', async () => {
    const storage = createMemoryStorage();
    const recentAssetsStorage = createRecentAssetsStorage(storage);
    recentAssetsStorage.record(environmentA, mockPump);
    recentAssetsStorage.record(environmentB, {
      space: CDF_CDM_SPACE,
      externalId: 'P-301A',
      name: 'Pump 301A',
    });

    const searchAssets = vi.fn<AssetService['searchAssets']>(() => Promise.resolve([]));
    const getAsset = vi.fn<AssetService['getAsset']>(() => Promise.resolve(mockPump));

    const { unmount } = renderWorkspace({
      project: environmentA.project,
      baseUrl: environmentA.baseUrl,
      storage,
      assetService: { searchAssets, getAsset },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Open asset Feed pump/i })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Open asset Pump 301A/i })).toBeNull();
    unmount();

    renderWorkspace({
      project: environmentB.project,
      baseUrl: environmentB.baseUrl,
      storage,
      assetService: { searchAssets, getAsset },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Open asset Pump 301A/i })).toBeInTheDocument(),
    );
    expect(screen.queryByRole('button', { name: /Open asset Feed pump/i })).toBeNull();
    expect(
      storage.getItem(`asset-360.recent-assets.v1:${environmentB.project}:${environmentB.baseUrl}`),
    ).toContain('P-301A');
  });
});
