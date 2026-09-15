import { CogniteClient } from '@cognite/sdk';

import type { FusionHostProviderDeps } from '../../host/FusionHostProvider';
import { makeTestHostApi } from '../../host/testHostApi';

export const testFusionHostDeps: FusionHostProviderDeps = {
  connectToHostApp: () =>
    Promise.resolve({
      api: makeTestHostApi(),
    }),
  createClient: (config) => new CogniteClient(config),
};
