import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
import { Loader } from '@cognite/aura/components/loader';

import {
  getPrimaryLabel,
  getSecondaryExternalId,
} from '../displayLabels';
import { useAssetHeaderViewModel } from '../hooks/useAssetHeaderViewModel';

export function AssetHeaderPanel() {
  const { status, asset, errorMessage } = useAssetHeaderViewModel();

  return (
    <header
      className="border-b border-border px-4 py-5 sm:px-6 sm:py-6"
      aria-label="Asset overview"
    >
      {status === 'loading' && (
        <div className="inline-flex items-center gap-2 text-muted-foreground" aria-live="polite">
          <Loader size={20} />
          <span>Loading asset…</span>
        </div>
      )}

      {status === 'error' && (
        <Alert variant="error">
          <AlertDescription>
            {errorMessage ?? 'Unable to load this asset. Try again in a moment.'}
          </AlertDescription>
        </Alert>
      )}

      {status === 'not-found' && (
        <Alert variant="secondary">
          <AlertDescription>
            This asset could not be found or you may not have access. Return to search and try
            another equipment tag.
          </AlertDescription>
        </Alert>
      )}

      {status === 'success' && asset && (
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
              {getPrimaryLabel(asset.name, asset.externalId)}
            </h1>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {getSecondaryExternalId(asset.name, asset.externalId) ? (
                <>
                  <span className="font-mono text-xs">
                    <span className="sr-only">Tag: </span>
                    {asset.externalId}
                  </span>
                  <span aria-hidden>·</span>
                </>
              ) : null}
              <span className="text-xs">{asset.space}</span>
              {asset.typeExternalId ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{asset.typeExternalId}</span>
                </>
              ) : null}
            </div>
          </div>

          {asset.description ? (
            <p className="max-w-4xl text-sm leading-relaxed text-foreground/90">
              {asset.description}
            </p>
          ) : null}

          {asset.parentExternalId ? (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground">Parent asset</span>
              <Badge variant="nordic">{asset.parentExternalId}</Badge>
            </div>
          ) : null}
        </div>
      )}
    </header>
  );
}
