import type { HostAppAPI } from '@cognite/app-sdk';

export function makeTestHostApi(
  overrides?: Partial<HostAppAPI>,
): HostAppAPI {
  const api = {
    getProject: () => Promise.resolve('publicdatacdm'),
    getBaseUrl: () => Promise.resolve('https://cognite.test'),
    getAccessToken: () => Promise.resolve('test-token'),
    getAppId: () => Promise.resolve('test-app-id'),
    syncInternalState: () => Promise.resolve(true),
    ...overrides,
  };
  return api as HostAppAPI;
}
