import type { HostAppAPI } from '@cognite/app-sdk';
import type { CogniteClient } from '@cognite/sdk';
import { createContext } from 'react';

export type FusionEnvironment = {
  project: string;
  baseUrl: string;
};

export type FusionHostConnection =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      api: HostAppAPI;
      initialState?: string;
      client: CogniteClient;
      environment: FusionEnvironment;
    };

export const FusionHostContext = createContext<FusionHostConnection | null>(null);
