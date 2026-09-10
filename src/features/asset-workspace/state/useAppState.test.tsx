import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AppStateContext } from './appStateContext';
import { useAppState, useAppStateOptional } from './useAppState';

describe(useAppState.name, () => {
  it('throws when used outside AppStateProvider', () => {
    expect(() => renderHook(() => useAppState())).toThrow(
      'useAppState must be used within AppStateProvider',
    );
  });

  it('returns context when provider is present', () => {
    const value = {
      state: { view: 'search' as const, searchQuery: '' },
      setSearchQuery: vi.fn(),
      selectAsset: vi.fn(),
      clearSelectedAsset: vi.fn(),
    };

    const wrapper = ({ children }: { children: ReactNode }) => (
      <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
    );

    const { result } = renderHook(() => useAppState(), { wrapper });
    expect(result.current.state.view).toBe('search');
  });
});

describe(useAppStateOptional.name, () => {
  it('returns null outside provider', () => {
    const { result } = renderHook(() => useAppStateOptional());
    expect(result.current).toBeNull();
  });
});
