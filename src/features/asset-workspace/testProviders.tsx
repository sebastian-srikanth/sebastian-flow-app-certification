import type { ReactElement, ReactNode } from 'react';

import { FusionHostProvider } from '../../host/FusionHostProvider';

import { RecentAssetsProvider } from './state/RecentAssetsProvider';
import { testFusionHostDeps } from './testHostDeps';

export function TestFusionProviders({ children }: { children: ReactNode }): ReactElement {
  return (
    <FusionHostProvider deps={testFusionHostDeps}>
      <RecentAssetsProvider>{children}</RecentAssetsProvider>
    </FusionHostProvider>
  );
}
