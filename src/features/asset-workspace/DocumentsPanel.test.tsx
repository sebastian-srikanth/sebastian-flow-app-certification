import type { HostAppAPI } from '@cognite/app-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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
import { TimeSeriesServiceProvider } from './state/TimeSeriesServiceProvider';
import { TestFusionProviders } from './testProviders';

/**
 * This suite covers documents *panel* behaviour (list, states, actions), so the file
 * viewer is stubbed to keep PDF rendering out of scope. The real provider composition
 * that supplies the viewer's `CogniteClient` — the wiring that previously crashed — is
 * exercised end to end in `DocumentPreview.integration.test.tsx` with no SDK hook mocked.
 */
vi.mock('@/cognite-file-viewer', () => ({
  CogniteFileViewer: vi.fn(() => <div data-testid="cognite-file-viewer">Mock viewer</div>),
}));

const mockAsset = {
  space: CDF_CDM_SPACE,
  externalId: 'PUMP-101',
  name: 'Feed pump',
};

const pdfDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-PDF',
  name: 'Pump manual',
  mimeType: 'application/pdf',
  isUploaded: true,
  sourceUpdatedTime: 1_700_000_000_000,
};

const imageDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-PNG',
  name: 'P&ID diagram',
  mimeType: 'image/png',
  isUploaded: true,
  uploadedTime: 1_699_000_000_000,
};

const officeDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-DOCX',
  name: 'Inspection report',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  isUploaded: true,
};

const missingContentDocument: DocumentSummary = {
  space: CDF_CDM_SPACE,
  externalId: 'FILE-MISSING',
  name: 'Pending upload',
  mimeType: 'application/pdf',
  isUploaded: false,
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

function makeActivityService(): ActivityService {
  return {
    listRelatedActivities: vi.fn(() => Promise.resolve({ activities: [] })),
  };
}

function makeDocumentService(overrides?: Partial<DocumentService>): DocumentService {
  return {
    listRelatedDocuments: vi.fn(() =>
      Promise.resolve({
        documents: [pdfDocument, imageDocument, officeDocument, missingContentDocument],
      }),
    ),
    getDownloadUrl: vi.fn(() => Promise.resolve('https://download.test/file')),
    ...overrides,
  };
}

function AssetViewHarness({
  documentService = makeDocumentService(),
  activityService = makeActivityService(),
  timeSeriesService = makeTimeSeriesService(),
}: {
  documentService?: DocumentService;
  activityService?: ActivityService;
  timeSeriesService?: TimeSeriesService;
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

describe('DocumentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('open', vi.fn());
  });

  it('shows loading state while documents are fetched', async () => {
    const documentService = makeDocumentService({
      listRelatedDocuments: vi.fn<DocumentService['listRelatedDocuments']>(
        () => new Promise(() => undefined),
      ),
    });

    renderWithProviders(<AssetViewHarness documentService={documentService} />);

    await waitFor(() => expect(screen.getByText('Loading related documents…')).toBeInTheDocument());
  });

  it('renders linked documents with metadata', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Pump manual')).toBeInTheDocument());
    const documentsPanel = screen.getByLabelText('Documents panel');
    expect(within(documentsPanel).getByText('P&ID diagram')).toBeInTheDocument();
    expect(within(documentsPanel).getByText('Inspection report')).toBeInTheDocument();
    expect(within(documentsPanel).getAllByText('PDF').length).toBeGreaterThanOrEqual(1);
    expect(within(documentsPanel).getByText('PNG')).toBeInTheDocument();
    expect(within(documentsPanel).getByText('Word')).toBeInTheDocument();
  });

  it('shows empty state when no documents are linked', async () => {
    const documentService = makeDocumentService({
      listRelatedDocuments: vi.fn(() => Promise.resolve({ documents: [] })),
    });

    renderWithProviders(<AssetViewHarness documentService={documentService} />);

    await waitFor(() =>
      expect(
        screen.getByText(/No documents are linked to this asset/i),
      ).toBeInTheDocument(),
    );
  });

  it('shows error state with retry', async () => {
    const listRelatedDocuments = vi
      .fn<DocumentService['listRelatedDocuments']>()
      .mockRejectedValueOnce(new Error('Documents query failed'))
      .mockResolvedValueOnce({ documents: [pdfDocument] });

    renderWithProviders(
      <AssetViewHarness documentService={makeDocumentService({ listRelatedDocuments })} />,
    );

    await waitFor(() => expect(screen.getByText('Documents query failed')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await waitFor(() => expect(screen.getByText('Pump manual')).toBeInTheDocument());
  });

  it('shows no-access state for forbidden errors', async () => {
    const documentService = makeDocumentService({
      listRelatedDocuments: vi.fn(() =>
        Promise.reject(new Error('403 Forbidden: access denied')),
      ),
    });

    renderWithProviders(<AssetViewHarness documentService={documentService} />);

    await waitFor(() =>
      expect(
        screen.getByText(/You do not have access to document data for this asset/i),
      ).toBeInTheDocument(),
    );
  });

  it('opens inline preview for PDF and image without leaving Asset 360', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Pump manual')).toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Preview Pump manual' }));

    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByTestId('cognite-file-viewer')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Feed pump', hidden: true })).toBeInTheDocument();

    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('offers open-file fallback for unsupported formats without inline preview', async () => {
    const getDownloadUrl = vi.fn(() => Promise.resolve('https://download.test/docx'));

    renderWithProviders(
      <AssetViewHarness
        documentService={makeDocumentService({ getDownloadUrl })}
      />,
    );

    await waitFor(() => expect(screen.getByText('Inspection report')).toBeInTheDocument());
    expect(
      screen.queryByRole('button', { name: 'Preview Inspection report' }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Open Inspection report' }));

    await waitFor(() =>
      expect(getDownloadUrl).toHaveBeenCalledWith(
        expect.objectContaining({
          space: CDF_CDM_SPACE,
          externalId: 'FILE-DOCX',
        }),
      ),
    );
    expect(window.open).toHaveBeenCalledWith(
      'https://download.test/docx',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('surfaces a download failure against the row that failed and keeps other rows usable', async () => {
    const getDownloadUrl = vi
      .fn<DocumentService['getDownloadUrl']>()
      .mockRejectedValueOnce(new Error('Download link expired'))
      .mockResolvedValue('https://download.test/retry');

    renderWithProviders(
      <AssetViewHarness documentService={makeDocumentService({ getDownloadUrl })} />,
    );

    await waitFor(() => expect(screen.getByText('Inspection report')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Open Inspection report' }));

    await waitFor(() => expect(screen.getByText('Download link expired')).toBeInTheDocument());
    expect(window.open).not.toHaveBeenCalled();

    // Retrying the same row must clear the previous error rather than stack a second one.
    await userEvent.click(screen.getByRole('button', { name: 'Open Inspection report' }));

    await waitFor(() =>
      expect(window.open).toHaveBeenCalledWith(
        'https://download.test/retry',
        '_blank',
        'noopener,noreferrer',
      ),
    );
    expect(screen.queryByText('Download link expired')).not.toBeInTheDocument();
  });

  it('reports an access-denied download without claiming a generic failure', async () => {
    const getDownloadUrl = vi
      .fn<DocumentService['getDownloadUrl']>()
      .mockRejectedValue(
        Object.assign(new Error('Forbidden: files:read is required'), { status: 403 }),
      );

    renderWithProviders(
      <AssetViewHarness documentService={makeDocumentService({ getDownloadUrl })} />,
    );

    await waitFor(() => expect(screen.getByText('Inspection report')).toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Open Inspection report' }));

    await waitFor(() =>
      expect(screen.getByText('Forbidden: files:read is required')).toBeInTheDocument(),
    );
    expect(window.open).not.toHaveBeenCalled();
  });

  it('disables the row action while its download is in flight', async () => {
    let releaseDownload: (url: string) => void = () => undefined;
    const getDownloadUrl = vi.fn<DocumentService['getDownloadUrl']>(
      () =>
        new Promise<string>((resolve) => {
          releaseDownload = resolve;
        }),
    );

    renderWithProviders(
      <AssetViewHarness documentService={makeDocumentService({ getDownloadUrl })} />,
    );

    await waitFor(() => expect(screen.getByText('Inspection report')).toBeInTheDocument());
    const openButton = screen.getByRole('button', { name: 'Open Inspection report' });
    await userEvent.click(openButton);

    await waitFor(() => expect(openButton).toBeDisabled());

    releaseDownload('https://download.test/slow');

    await waitFor(() => expect(openButton).toBeEnabled());
    expect(window.open).toHaveBeenCalledWith(
      'https://download.test/slow',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('shows unavailable content state without preview action', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByText('Pending upload')).toBeInTheDocument());
    expect(screen.getByText('Content not uploaded')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Preview Pending upload' }),
    ).not.toBeInTheDocument();
  });

  it('keeps time series and activities panels healthy alongside documents', async () => {
    renderWithProviders(<AssetViewHarness />);

    await waitFor(() => expect(screen.getByLabelText('Documents panel')).toBeInTheDocument());
    expect(screen.getByLabelText('Time series panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Work orders and activities panel')).toBeInTheDocument();
  });
});
