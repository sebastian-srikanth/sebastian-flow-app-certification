import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CogniteFileViewer } from './CogniteFileViewer';

vi.mock('react-pdf', () => ({
  Document: ({ children, loading }: { children: React.ReactNode; loading: React.ReactNode }) => (
    <div data-testid="pdf-document">
      {loading}
      {children}
    </div>
  ),
  Page: () => <div data-testid="pdf-page">PDF page</div>,
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
}));

describe(CogniteFileViewer.name, () => {
  it('renders loading state for URL sources', () => {
    render(
      <CogniteFileViewer
        source={{ type: 'url', url: 'https://static.test/manual.pdf' }}
        renderLoading={() => <div>Custom loading</div>}
      />,
    );

    expect(screen.getByText('Custom loading')).toBeInTheDocument();
  });

  it('renders resolved PDF content for URL sources', async () => {
    render(
      <CogniteFileViewer source={{ type: 'url', url: 'https://static.test/manual.pdf' }} />,
    );

    await waitFor(() => expect(screen.getByTestId('pdf-document')).toBeInTheDocument());
    expect(screen.getByTestId('pdf-page')).toBeInTheDocument();
  });

  it('renders image content for image URLs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      blob: async () => new Blob(['image'], { type: 'image/png' }),
    } as Response);

    render(
      <CogniteFileViewer source={{ type: 'url', url: 'https://static.test/diagram.png' }} />,
    );

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    fetchMock.mockRestore();
  });

  it('renders text content for text URLs', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      text: async () => 'Hello notes',
    } as Response);

    render(
      <CogniteFileViewer
        source={{ type: 'url', url: 'https://static.test/notes.txt', mimeType: 'text/plain' }}
      />,
    );

    await waitFor(() => expect(screen.getByText('Hello notes')).toBeInTheDocument());
    fetchMock.mockRestore();
  });

  it('renders unsupported state for unknown MIME types', async () => {
    render(
      <CogniteFileViewer
        source={{ type: 'url', url: 'https://static.test/archive.zip', mimeType: 'application/zip' }}
        renderUnsupported={(mimeType) => <div>Unsupported: {mimeType}</div>}
      />,
    );

    await waitFor(() =>
      expect(screen.getByText('Unsupported: application/zip')).toBeInTheDocument(),
    );
  });

  it('renders error state when CDF source lacks a client', async () => {
    render(
      <CogniteFileViewer
        source={{ type: 'internalId', id: 42 }}
        renderError={(error) => <div>Error: {error.message}</div>}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByText('Error: CogniteClient is required for instanceId and internalId sources'),
      ).toBeInTheDocument(),
    );
  });
});
