import { CogniteClient } from '@cognite/sdk';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FusionHostProvider } from './FusionHostProvider';
import { makeTestHostApi } from './testHostApi';
import {
  useFusionEnvironment,
  useFusionInitialState,
  useHostAppApi,
} from './useFusionHost';

function EnvironmentProbe() {
  const environment = useFusionEnvironment();
  const api = useHostAppApi();
  const initialState = useFusionInitialState();

  return (
    <div>
      <span>{environment.project}</span>
      <span>{environment.baseUrl}</span>
      <span>{typeof api.syncInternalState}</span>
      <span>{initialState ?? 'no-state'}</span>
    </div>
  );
}

describe('FusionHostProvider', () => {
  it('connects once and exposes api, environment, and initial state', async () => {
    const connectToHostApp = vi.fn(() =>
      Promise.resolve({
        api: makeTestHostApi({
          getProject: () => Promise.resolve('publicdatacdm'),
          getBaseUrl: () => Promise.resolve('https://api.cognitedata.com'),
        }),
        initialState: '{"view":"search"}',
      }),
    );

    render(
      <FusionHostProvider
        deps={{
          connectToHostApp,
          createClient: (config) => new CogniteClient(config),
        }}
      >
        <EnvironmentProbe />
      </FusionHostProvider>,
    );

    await waitFor(() => expect(screen.getByText('publicdatacdm')).toBeInTheDocument());
    expect(screen.getByText('https://api.cognitedata.com')).toBeInTheDocument();
    expect(screen.getByText('function')).toBeInTheDocument();
    expect(screen.getByText('{"view":"search"}')).toBeInTheDocument();
    expect(connectToHostApp).toHaveBeenCalledTimes(1);
  });
});
