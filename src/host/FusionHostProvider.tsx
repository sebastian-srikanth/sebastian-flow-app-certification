import { connectToHostApp as connectToHostAppImpl } from '@cognite/app-sdk';
import type { ConnectToHostAppResult } from '@cognite/app-sdk';
import { CogniteClient, type ClientOptions } from '@cognite/sdk';
import { useEffect, useState, type ReactElement, type ReactNode } from 'react';

import { FusionHostContext, type FusionHostConnection } from './fusionHostContext';

export type { FusionEnvironment, FusionHostConnection } from './fusionHostContext';

export type FusionHostProviderDeps = {
  connectToHostApp: () => Promise<ConnectToHostAppResult>;
  createClient: (config: ClientOptions) => CogniteClient;
};

const defaultDeps: FusionHostProviderDeps = {
  connectToHostApp: connectToHostAppImpl,
  createClient: (config: ClientOptions) => new CogniteClient(config),
};

type FusionHostProviderProps = {
  children: ReactNode;
  loadingFallback?: ReactNode;
  errorFallback?: ReactNode;
  deps?: Partial<FusionHostProviderDeps>;
};

export function FusionHostProvider({
  children,
  loadingFallback = null,
  errorFallback = null,
  deps,
}: FusionHostProviderProps): ReactElement {
  const connectToHostApp = deps?.connectToHostApp ?? defaultDeps.connectToHostApp;
  const createClient = deps?.createClient ?? defaultDeps.createClient;

  const [connection, setConnection] = useState<FusionHostConnection>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;

    async function connect(): Promise<void> {
      try {
        const { api, initialState } = await connectToHostApp();
        const [project, baseUrl, appId] = await Promise.all([
          api.getProject(),
          api.getBaseUrl(),
          api.getAppId(),
        ]);

        if (cancelled) return;

        const client = createClient({
          appId: `flowscustomapp-${project}-${appId}`,
          baseUrl,
          oidcTokenProvider: () => api.getAccessToken(),
          project,
        });

        setConnection({
          status: 'ready',
          api,
          initialState,
          client,
          environment: { project, baseUrl },
        });
      } catch {
        if (!cancelled) {
          setConnection({ status: 'error' });
        }
      }
    }

    void connect();

    return () => {
      cancelled = true;
    };
  }, [connectToHostApp, createClient]);

  if (connection.status === 'loading') {
    return <>{loadingFallback}</>;
  }

  if (connection.status === 'error') {
    return <>{errorFallback}</>;
  }

  return (
    <FusionHostContext.Provider value={connection}>{children}</FusionHostContext.Provider>
  );
}
