import { describe, expect, it } from 'vitest';

import { parseAppState, serializeAppState } from './parseAppState';
import { DEFAULT_APP_STATE } from './types';

describe(parseAppState.name, () => {
  it('returns default state when serialized value is missing', () => {
    expect(parseAppState(undefined)).toEqual(DEFAULT_APP_STATE);
  });

  it('parses search view with query', () => {
    const serialized = serializeAppState({
      view: 'search',
      searchQuery: 'pump',
    });

    expect(parseAppState(serialized)).toEqual({
      view: 'search',
      searchQuery: 'pump',
    });
  });

  it('parses asset view with selected asset identity', () => {
    const serialized = serializeAppState({
      view: 'asset',
      selectedAsset: { space: 'cdf_cdm', externalId: 'PUMP-101' },
      searchQuery: 'pump',
    });

    expect(parseAppState(serialized)).toEqual({
      view: 'asset',
      selectedAsset: { space: 'cdf_cdm', externalId: 'PUMP-101' },
      searchQuery: 'pump',
    });
  });

  it('falls back to search when asset view has no selected asset', () => {
    const serialized = JSON.stringify({ view: 'asset', searchQuery: 'valve' });

    expect(parseAppState(serialized)).toEqual({
      view: 'search',
      searchQuery: 'valve',
    });
  });

  it('returns default state for malformed JSON', () => {
    expect(parseAppState('{not-json')).toEqual(DEFAULT_APP_STATE);
  });
});
