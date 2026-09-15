import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import { Badge } from '@cognite/aura/components/badge';
import { Button } from '@cognite/aura/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@cognite/aura/components/card';
import { Input } from '@cognite/aura/components/input';
import { Loader } from '@cognite/aura/components/loader';
import { IconSearch } from '@tabler/icons-react';

import { MIN_SEARCH_QUERY_LENGTH } from '../constants';
import {
  getPrimaryLabel,
  getSecondaryExternalId,
} from '../displayLabels';
import { useAssetSearchViewModel } from '../hooks/useAssetSearchViewModel';
import { useRecentAssetsViewModel } from '../hooks/useRecentAssetsViewModel';
import type { AssetSummary } from '../types';

import { WorkspaceContainer, WorkspaceShell } from './WorkspaceLayout';

function formatResultContext(asset: AssetSummary): string {
  const parts: string[] = [];
  if (asset.description) parts.push(asset.description);
  if (asset.parentExternalId) parts.push(`Parent: ${asset.parentExternalId}`);
  if (asset.typeExternalId) parts.push(`Type: ${asset.typeExternalId}`);
  return parts.join(' · ');
}

function SearchResultRow({
  asset,
  onSelect,
  primaryLabel,
}: {
  asset: AssetSummary;
  onSelect: (asset: AssetSummary) => void;
  primaryLabel?: string;
}) {
  const label = primaryLabel ?? getPrimaryLabel(asset.name, asset.externalId);
  const secondaryId = getSecondaryExternalId(asset.name, asset.externalId);
  const context = formatResultContext(asset);

  return (
    <li>
      <Button
        type="button"
        variant="outline"
        className="h-auto w-full justify-start px-4 py-3 text-left"
        onClick={() => onSelect(asset)}
        aria-label={`Open asset ${label}`}
      >
        <div className="flex w-full min-w-0 flex-col gap-1">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="truncate font-medium">{label}</span>
            {secondaryId ? (
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{secondaryId}</span>
            ) : null}
          </div>
          {context ? (
            <span className="line-clamp-2 text-sm text-muted-foreground">{context}</span>
          ) : null}
        </div>
      </Button>
    </li>
  );
}

export function AssetSearchPanel() {
  const { query, setQuery, status, results, errorMessage, selectResult } = useAssetSearchViewModel();
  const { recentAssets, openRecentAsset, getRecentAssetLabel } = useRecentAssetsViewModel();

  return (
    <WorkspaceShell>
      <WorkspaceContainer>
        <Card>
          <CardHeader>
            <CardTitle as="h1">Asset 360 Investigation Workspace</CardTitle>
            <CardDescription>
              Search equipment by tag, name, or description to open a unified investigation view.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="relative">
              <IconSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search assets"
                className="pl-9"
                placeholder="Search by tag, name, or description…"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>

            {query.trim().length > 0 && query.trim().length < MIN_SEARCH_QUERY_LENGTH && (
              <p className="text-sm text-muted-foreground">
                Type at least {MIN_SEARCH_QUERY_LENGTH} characters to search.
              </p>
            )}

            {status === 'loading' && (
              <div className="inline-flex items-center gap-2 text-muted-foreground" aria-live="polite">
                <Loader size={20} />
                <span>Searching assets…</span>
              </div>
            )}

            {status === 'error' && (
              <Alert variant="error">
                <AlertDescription>
                  {errorMessage ?? 'Unable to search assets. Try again in a moment.'}
                </AlertDescription>
              </Alert>
            )}

            {status === 'empty' && (
              <Alert variant="secondary">
                <AlertDescription>
                  No assets matched your search. Try a different tag, name fragment, or description
                  keyword.
                </AlertDescription>
              </Alert>
            )}

            {status === 'success' && results.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Matching assets
                  <Badge variant="nordic" className="ml-2">
                    {results.length}
                  </Badge>
                </p>
                <ul className="flex flex-col gap-2" aria-label="Asset search results">
                  {results.map((asset) => (
                    <SearchResultRow
                      key={`${asset.space}:${asset.externalId}`}
                      asset={asset}
                      onSelect={selectResult}
                    />
                  ))}
                </ul>
              </div>
            )}

            {recentAssets.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">Recently viewed</p>
                <ul className="flex flex-col gap-2" aria-label="Recently viewed assets">
                  {recentAssets.map((asset) => (
                    <SearchResultRow
                      key={`recent:${asset.space}:${asset.externalId}`}
                      asset={asset}
                      onSelect={openRecentAsset}
                      primaryLabel={getRecentAssetLabel(asset)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </WorkspaceContainer>
    </WorkspaceShell>
  );
}
