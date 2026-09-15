
import type { HostAppAPI } from '@cognite/app-sdk';
import type { CogniteClient } from '@cognite/sdk';
import { useContext } from 'react';

import {
  FusionHostContext,
  type FusionEnvironment,
  type FusionHostConnection,
} from './fusionHostContext';

function useFusionHostConnection(): FusionHostConnection {
  const value = useContext(FusionHostContext);
  if (!value) {
    throw new Error('useFusionHostConnection must be used within FusionHostProvider');
  }
  return value;
}

export function useHostAppApi(): HostAppAPI {
  const connection = useFusionHostConnection();
  if (connection.status !== 'ready') {
    throw new Error('Fusion host is not connected');
  }
  return connection.api;
}

export function useFusionEnvironment(): FusionEnvironment {
  const connection = useFusionHostConnection();
  if (connection.status !== 'ready') {
    throw new Error('Fusion host is not connected');
  }
  return connection.environment;
}

export function useCogniteSdk(): CogniteClient {
  const connection = useFusionHostConnection();
  if (connection.status !== 'ready') {
    throw new Error('Fusion host is not connected');
  }
  return connection.client;
}

export function useFusionInitialState(): string | undefined {
  const connection = useFusionHostConnection();
  if (connection.status !== 'ready') {
    return undefined;
  }
  return connection.initialState;
}
