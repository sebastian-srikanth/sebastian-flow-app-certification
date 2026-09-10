import type { ConnectToHostAppResult, HostAppAPI } from '@cognite/app-sdk';
import { CogniteClient, type ClientOptions } from '@cognite/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAllFileCache } from '../../cognite-file-viewer/fileResolution';
import { AppErrorBoundary } from '../../components/AppErrorBoundary';
import { FusionHostProvider } from '../../host/FusionHostProvider';
import type { FusionHostProviderDeps } from '../../host/FusionHostProvider';
import { makeTestHostApi } from '../../host/testHostApi';

import { AssetWorkspace } from './components/AssetWorkspace';
import { CDF_CDM_SPACE } from './constants';
import type { DocumentSummary } from './documents/types';
import type { ActivityService } from './services/ActivityService';
import type { DocumentService } from './services/DocumentService';
import type { TimeSeriesService } from './services/TimeSeriesService';
import { ActivityServiceProvider } from './state/ActivityServiceProvider';
import { AppStateProvider } from './state/AppStateProvider';
import { AssetServiceProvider } from './state/AssetServiceProvider';
import { DocumentServiceProvider } from './state/DocumentServiceProvider';
import { RecentAssetsProvider } from './state/RecentAssetsProvider';
import { TimeSeriesServiceProvider } from './state/TimeSeriesServiceProvider';

/**
 * `react-pdf` is mocked because rendering a real PDF needs a pdf.js web worker and a
 * canvas 2D context, neither of which exists in happy-dom. This is a third-party
 * rendering boundary only — every first-party module under test (the dialog, the file
 * viewer, `useFileResolver`, and the whole host provider chain) runs for real.
 */
vi.mock('react-pdf', () => ({
  Document: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pdf-document">{children}</div>
  ),
  Page: () => <div data-testid="pdf-page">PDF page</div>,
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

const asset = { space: CDF_CDM_SPACE, externalId: 'P-301A', name: 'Feed pump' };

const pdfDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-PDF',
  name: 'Pump manual.pdf',
  mimeType: 'application/pdf',
  isUploaded: true,
  sourceUpdatedTime: 1_700_000_000_000,
};

const imageDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-PNG',
  name: 'Diagram.png',
  mimeType: 'image/png',
  isUploaded: true,
  uploadedTime: 1_699_000_000_000,
};

const unavailableDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-MISSING',
  name: 'Pending upload.pdf',
  mimeType: 'application/pdf',
  isUploaded: false,
};

type FileRetrieveResult = {
  id: number;
  name: string;
  mimeType: string;
  instanceId: { space: string; externalId: string };
};

type CdfStubs = {
  retrieveFile: (identifier: unknown) => Promise<FileRetrieveResult>;
  downloadLink: () => Promise<string>;
};

type HostHarness = {
  deps: FusionHostProviderDeps;
  getCreatedClient: () => CogniteClient | null;
};

/**
 * Builds the real `CogniteClient` the production `FusionHostProvider` would build, then
 * replaces only its network-facing resource methods. The client *instance* is genuine and
 * travels the production path — `FusionHostProvider` -> `FusionHostContext` ->
 * `useCogniteSdk()` -> `DocumentPreviewDialog` -> `CogniteFileViewer` — so a missing or
 * mismatched SDK provider fails this test instead of being mocked away.
 */
function makeHostDeps(stubs: CdfStubs): HostHarness {
  let createdClient: CogniteClient | null = null;

  const createClient = (config: ClientOptions): CogniteClient => {
    const client = new CogniteClient(config);

    client.files.retrieve = vi.fn((items: unknown[]) =>
      Promise.all(items.map((item) => stubs.retrieveFile(item))),
    ) as unknown as CogniteClient['files']['retrieve'];

    client.post = vi.fn(() =>
      stubs
        .downloadLink()
        .then((downloadUrl) => ({ status: 200, data: { items: [{ downloadUrl }] } })),
    ) as unknown as CogniteClient['post'];

    client.instances.query = vi.fn(() =>
      Promise.resolve({ items: {}, nextCursor: {} }),
    ) as unknown as CogniteClient['instances']['query'];

    createdClient = client;
    return client;
  };

  const api: HostAppAPI = makeTestHostApi();

  return {
    deps: {
      connectToHostApp: () => Promise.resolve({ api } as ConnectToHostAppResult),
      createClient,
    },
    getCreatedClient: () => createdClient,
  };
}

function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, refetchInterval: false },
    },
  });
}

function makeDocumentService(documents: DocumentSummary[]): DocumentService {
  return {
    listRelatedDocuments: vi.fn(() => Promise.resolve({ documents })),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://download.test/file')),
  };
}

function makeTimeSeriesService(): TimeSeriesService {
  return {
    listLinkedTimeSeries: vi.fn(() => Promise.resolve({ series: [], truncated: false })),
    retrieveLatestDatapoints: vi.fn(() => Promise.resolve([])),
    retrieveChartDatapoints: vi.fn(() => Promise.resolve([])),
  };
}

function makeActivityService(): ActivityService {
  return { listRelatedActivities: vi.fn(() => Promise.resolve({ activities: [] })) };
}

/**
 * Mirrors the production provider topology in `App.tsx`: a single `FusionHostProvider`
 * handshake, `AppErrorBoundary` wrapping the workspace, and no second SDK provider.
 */
function renderWorkspace({
  documents = [pdfDocument, imageDocument, unavailableDocument],
  stubs,
}: {
  documents?: DocumentSummary[];
  stubs: CdfStubs;
}): HostHarness {
  const host = makeHostDeps(stubs);

  render(
    <QueryClientProvider client={createTestQueryClient()}>
      <FusionHostProvider deps={host.deps}>
        <AppStateProvider
          api={makeTestHostApi()}
          initialState={JSON.stringify({ view: 'asset', selectedAsset: asset })}
        >
          <RecentAssetsProvider>
            <AssetServiceProvider
              assetService={{
                searchAssets: vi.fn(),
                getAsset: vi.fn(() => Promise.resolve(asset)),
              }}
            >
              <TimeSeriesServiceProvider timeSeriesService={makeTimeSeriesService()}>
                <ActivityServiceProvider activityService={makeActivityService()}>
                  <DocumentServiceProvider documentService={makeDocumentService(documents)}>
                    <AppErrorBoundary>
                      <AssetWorkspace />
                    </AppErrorBoundary>
                  </DocumentServiceProvider>
                </ActivityServiceProvider>
              </TimeSeriesServiceProvider>
            </AssetServiceProvider>
          </RecentAssetsProvider>
        </AppStateProvider>
      </FusionHostProvider>
    </QueryClientProvider>,
  );

  return host;
}

function expectNoErrorBoundaryFallback(): void {
  expect(screen.queryByLabelText('Application error')).not.toBeInTheDocument();
  expect(screen.queryByText(/Asset 360 couldn't load/i)).not.toBeInTheDocument();
}

function okStubs(overrides?: Partial<CdfStubs>): CdfStubs {
  return {
    retrieveFile: (identifier) => {
      const externalId =
        (identifier as { instanceId?: { externalId?: string } }).instanceId?.externalId ?? '';
      const isImage = externalId === 'FILE-PNG';
      return Promise.resolve({
        id: isImage ? 2002 : 2001,
        name: isImage ? 'Diagram.png' : 'Pump manual.pdf',
        mimeType: isImage ? 'image/png' : 'application/pdf',
        instanceId: { space: CDF_CDM_SPACE, externalId },
      });
    },
    downloadLink: () => Promise.resolve('https://files.test/signed-download'),
    ...overrides,
  };
}

describe('Document preview — real provider composition', () => {
  beforeEach(() => {
    clearAllFileCache();
    vi.stubGlobal('open', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders a PDF preview using the client from the mounted Fusion host provider', async () => {
    const host = renderWorkspace({ stubs: okStubs() });

    await waitFor(() => expect(screen.getByText('Pump manual.pdf')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Preview Pump manual.pdf' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() => expect(within(dialog).getByTestId('pdf-document')).toBeInTheDocument());
    expect(within(dialog).getByTestId('pdf-page')).toBeInTheDocument();

    const client = host.getCreatedClient();
    expect(client).not.toBeNull();
    expect(client?.files.retrieve).toHaveBeenCalledWith([
      { instanceId: { space: CDF_CDM_SPACE, externalId: 'FILE-PDF' } },
    ]);
    expectNoErrorBoundaryFallback();
  });

  it('does not fall through to the application error boundary when Preview is clicked', async () => {
    renderWorkspace({ stubs: okStubs() });

    await waitFor(() => expect(screen.getByText('Pump manual.pdf')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Preview Pump manual.pdf' }));

    await screen.findByRole('dialog');
    expectNoErrorBoundaryFallback();
    expect(screen.getByLabelText('Documents panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Time series panel')).toBeInTheDocument();
  });

  it('renders an image preview through the same provider composition', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['png-bytes'], { type: 'image/png' })),
    } as Response);

    renderWorkspace({ stubs: okStubs() });

    await waitFor(() => expect(screen.getByText('Diagram.png')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Preview Diagram.png' }));

    await screen.findByRole('dialog');
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('https://files.test/signed-download'),
    );
    expectNoErrorBoundaryFallback();
  });

  it('offers no inline preview when the file content is not uploaded', async () => {
    renderWorkspace({ stubs: okStubs() });

    await waitFor(() => expect(screen.getByText('Pending upload.pdf')).toBeInTheDocument());

    expect(screen.getByText('Content not uploaded')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Preview Pending upload.pdf' }),
    ).not.toBeInTheDocument();
    expectNoErrorBoundaryFallback();
  });

  it('shows an in-dialog error when the file metadata lookup is denied', async () => {
    renderWorkspace({
      stubs: okStubs({
        retrieveFile: () => Promise.reject(new Error('403 Forbidden: files:read required')),
      }),
    });

    await waitFor(() => expect(screen.getByText('Pump manual.pdf')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Preview Pump manual.pdf' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByText(/403 Forbidden: files:read required/i)).toBeInTheDocument(),
    );
    expectNoErrorBoundaryFallback();
    expect(screen.getByLabelText('Documents panel')).toBeInTheDocument();
  });

  it('shows an in-dialog error when the download link cannot be resolved', async () => {
    renderWorkspace({
      stubs: okStubs({
        downloadLink: () => Promise.reject(new Error('Download link unavailable')),
      }),
    });

    await waitFor(() => expect(screen.getByText('Pump manual.pdf')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Preview Pump manual.pdf' }));

    const dialog = await screen.findByRole('dialog');
    await waitFor(() =>
      expect(within(dialog).getByText(/Download link unavailable/i)).toBeInTheDocument(),
    );
    expectNoErrorBoundaryFallback();
  });
});
