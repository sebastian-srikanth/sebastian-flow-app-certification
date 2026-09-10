import type { HostAppAPI } from '@cognite/app-sdk';
import type { CogniteClient } from '@cognite/sdk';
import { renderHook } from '@testing-library/react';
import { createElement, type PropsWithChildren } from 'react';
import { describe, expect, it } from 'vitest';

import { FusionHostContext, type FusionHostConnection } from './fusionHostContext';
import {
  useCogniteSdk,
  useFusionEnvironment,
  useFusionInitialState,
  useHostAppApi,
} from './useFusionHost';

const api = {} as HostAppAPI;
const client = {} as CogniteClient;
const environment = { project: 'publicdatacdm', baseUrl: 'https://api.cognitedata.com' };

function withConnection(connection: FusionHostConnection) {
  return function Wrapper({ children }: PropsWithChildren) {
    return createElement(FusionHostContext.Provider, { value: connection }, children);
  };
}

describe('useFusionHost hooks', () => {
  it('throws when used outside FusionHostProvider', () => {
    expect(() => renderHook(() => useHostAppApi())).toThrow(
      'useFusionHostConnection must be used within FusionHostProvider',
    );
    expect(() => renderHook(() => useFusionEnvironment())).toThrow(
      'useFusionHostConnection must be used within FusionHostProvider',
    );
    expect(() => renderHook(() => useCogniteSdk())).toThrow(
      'useFusionHostConnection must be used within FusionHostProvider',
    );
    expect(() => renderHook(() => useFusionInitialState())).toThrow(
      'useFusionHostConnection must be used within FusionHostProvider',
    );
  });

  it('returns the host api, environment and client once the handshake is ready', () => {
    const wrapper = withConnection({
      status: 'ready',
      api,
      client,
      environment,
      initialState: '{"view":"asset"}',
    });

    expect(renderHook(() => useHostAppApi(), { wrapper }).result.current).toBe(api);
    expect(renderHook(() => useCogniteSdk(), { wrapper }).result.current).toBe(client);
    expect(renderHook(() => useFusionEnvironment(), { wrapper }).result.current).toEqual(environment);
    expect(renderHook(() => useFusionInitialState(), { wrapper }).result.current).toBe(
      '{"view":"asset"}',
    );
  });

  it.each(['loading', 'error'] as const)(
    'refuses to hand out host resources while the handshake is %s',
    (status) => {
      const wrapper = withConnection({ status });

      expect(() => renderHook(() => useHostAppApi(), { wrapper })).toThrow(
        'Fusion host is not connected',
      );
      expect(() => renderHook(() => useCogniteSdk(), { wrapper })).toThrow(
        'Fusion host is not connected',
      );
      expect(() => renderHook(() => useFusionEnvironment(), { wrapper })).toThrow(
        'Fusion host is not connected',
      );
      // Initial state is optional, so it degrades instead of throwing.
      expect(renderHook(() => useFusionInitialState(), { wrapper }).result.current).toBeUndefined();
    },
  );
});
