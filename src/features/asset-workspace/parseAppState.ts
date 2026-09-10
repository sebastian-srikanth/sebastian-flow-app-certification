import type { AppInternalState } from './types';
import { DEFAULT_APP_STATE } from './types';

function isAssetRef(value: unknown): value is AppInternalState['selectedAsset'] {
  if (typeof value !== 'object' || value === null) return false;
  if (!('space' in value) || !('externalId' in value)) return false;
  const record = value as Record<string, unknown>;
  return typeof record.space === 'string' && typeof record.externalId === 'string';
}

function isWorkspaceView(value: unknown): value is AppInternalState['view'] {
  return value === 'search' || value === 'asset';
}

export function parseAppState(serialized: string | undefined): AppInternalState {
  if (!serialized) return DEFAULT_APP_STATE;

  try {
    const parsed: unknown = JSON.parse(serialized);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULT_APP_STATE;

    const record = parsed as Record<string, unknown>;
    const view = isWorkspaceView(record.view) ? record.view : DEFAULT_APP_STATE.view;
    const selectedAsset = isAssetRef(record.selectedAsset) ? record.selectedAsset : undefined;
    const searchQuery =
      typeof record.searchQuery === 'string' ? record.searchQuery : undefined;

    if (view === 'asset' && !selectedAsset) {
      return { view: 'search', searchQuery };
    }

    return { view, selectedAsset, searchQuery };
  } catch {
    return DEFAULT_APP_STATE;
  }
}

export function serializeAppState(state: AppInternalState): string {
  return JSON.stringify(state);
}
