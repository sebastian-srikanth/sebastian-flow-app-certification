import { useEffect, useRef, useState } from 'react';

type AbortHandle = {
  abort: () => void;
  signal: AbortSignal;
};

export type BlobUrlDependencies = {
  fetch: (url: string, init: RequestInit) => Promise<Response>;
  createAbortController: () => AbortHandle;
  createObjectUrl: (blob: Blob) => string;
  revokeObjectUrl: (url: string) => void;
};

const defaultDependencies: BlobUrlDependencies = {
  fetch: (url: string, init: RequestInit) => globalThis.fetch(url, init),
  createAbortController: () => new AbortController(),
  createObjectUrl: (blob: Blob) => URL.createObjectURL(blob),
  revokeObjectUrl: (url: string) => URL.revokeObjectURL(url),
};

type BlobUrlState = {
  sourceUrl: string;
  blobUrl: string | null;
  error: Error | null;
};

export type UseBlobUrlResult = {
  blobUrl: string | null;
  error: Error | null;
};

export function useBlobUrl(
  url: string,
  dependencies: BlobUrlDependencies = defaultDependencies,
): UseBlobUrlResult {
  const [state, setState] = useState<BlobUrlState>({
    sourceUrl: url,
    blobUrl: null,
    error: null,
  });
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = dependencies.createAbortController();
    let isCancelled = false;

    dependencies
      .fetch(url, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.blob();
      })
      .then((blob) => {
        if (isCancelled) return;
        const blobUrl = dependencies.createObjectUrl(blob);
        objectUrlRef.current = blobUrl;
        setState({ sourceUrl: url, blobUrl, error: null });
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setState({
          sourceUrl: url,
          blobUrl: null,
          error: error instanceof Error ? error : new Error(String(error)),
        });
      });

    return () => {
      isCancelled = true;
      controller.abort();
      if (objectUrlRef.current) {
        dependencies.revokeObjectUrl(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [dependencies, url]);

  if (state.sourceUrl !== url) {
    return { blobUrl: null, error: null };
  }

  return { blobUrl: state.blobUrl, error: state.error };
}
