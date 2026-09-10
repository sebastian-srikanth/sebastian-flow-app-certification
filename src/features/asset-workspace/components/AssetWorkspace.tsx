import { Button } from '@cognite/aura/components/button';
import { IconArrowLeft } from '@tabler/icons-react';

import { useAppState } from '../state/useAppState';

import { ActivitiesPanel } from './ActivitiesPanel';
import { AssetHeaderPanel } from './AssetHeaderPanel';
import { AssetSearchPanel } from './AssetSearchPanel';
import { DocumentsPanel } from './DocumentsPanel';
import { TimeSeriesPanel } from './TimeSeriesPanel';
import { WorkspaceContainer, WorkspaceShell, WorkspaceSurface } from './WorkspaceLayout';

function AssetDetailView() {
  const { state, clearSelectedAsset } = useAppState();

  if (!state.selectedAsset) return null;

  return (
    <WorkspaceShell>
      <WorkspaceContainer>
        <div className="mb-4">
          <Button type="button" variant="ghost" onClick={clearSelectedAsset}>
            <IconArrowLeft aria-hidden className="size-4" />
            Back to search
          </Button>
        </div>

        <WorkspaceSurface aria-label="Asset 360 investigation workspace">
          <AssetHeaderPanel />
          <TimeSeriesPanel
            key={`${state.selectedAsset.space}:${state.selectedAsset.externalId}`}
          />
          <ActivitiesPanel
            key={`activities:${state.selectedAsset.space}:${state.selectedAsset.externalId}`}
          />
          <DocumentsPanel
            key={`documents:${state.selectedAsset.space}:${state.selectedAsset.externalId}`}
            isLast
          />
        </WorkspaceSurface>
      </WorkspaceContainer>
    </WorkspaceShell>
  );
}

export function AssetWorkspace() {
  const { state } = useAppState();

  if (state.view === 'asset' && state.selectedAsset) {
    return <AssetDetailView />;
  }

  return <AssetSearchPanel />;
}
