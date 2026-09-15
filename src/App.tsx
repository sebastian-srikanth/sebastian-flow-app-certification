import { Alert, AlertDescription } from '@cognite/aura/components/alert';
import {
  Card,
  CardContent,
} from '@cognite/aura/components/card';
import { Loader } from '@cognite/aura/components/loader';
import { useMemo, type ReactElement } from 'react';

import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AssetWorkspace } from './features/asset-workspace/components/AssetWorkspace';
import { CdfActivityService } from './features/asset-workspace/services/CdfActivityService';
import { CdfAssetService } from './features/asset-workspace/services/CdfAssetService';
import { CdfDocumentService } from './features/asset-workspace/services/CdfDocumentService';
import { CdfTimeSeriesService } from './features/asset-workspace/services/CdfTimeSeriesService';
import { ActivityServiceProvider } from './features/asset-workspace/state/ActivityServiceProvider';
import { AppStateProvider } from './features/asset-workspace/state/AppStateProvider';
import { AssetServiceProvider } from './features/asset-workspace/state/AssetServiceProvider';
import { DocumentServiceProvider } from './features/asset-workspace/state/DocumentServiceProvider';
import { RecentAssetsProvider } from './features/asset-workspace/state/RecentAssetsProvider';
import { TimeSeriesServiceProvider } from './features/asset-workspace/state/TimeSeriesServiceProvider';
import {
  FusionHostProvider,
  type FusionHostProviderDeps,
} from './host/FusionHostProvider';
import {
  useCogniteSdk,
  useFusionEnvironment,
  useFusionInitialState,
  useHostAppApi,
} from './host/useFusionHost';

const loadingFallback = (
  <main className="min-h-screen bg-muted/50 text-foreground">
    <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center p-4 sm:p-8">
      <div className="mx-auto w-full max-w-sm">
        <Card aria-label="Loading project" aria-live="polite">
          <CardContent>
            <div className="inline-flex items-center gap-3 text-muted-foreground">
              <Loader size={20} />
              <span>Connecting to Cognite Data Fusion…</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </main>
);

const startupErrorFallback = (
  <main className="min-h-screen bg-muted/50 text-foreground">
    <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col justify-center p-4 sm:p-8">
      <div className="mx-auto w-full max-w-sm">
        <Alert>
          <AlertDescription>
            Failed to connect to the Fusion host. Reload the page or open the app from Cognite
            Data Fusion.
          </AlertDescription>
        </Alert>
      </div>
    </section>
  </main>
);

function ConnectedApp(): ReactElement {
  const client = useCogniteSdk();
  const api = useHostAppApi();
  const initialState = useFusionInitialState();
  const environment = useFusionEnvironment();

  const assetService = useMemo(() => new CdfAssetService(client), [client]);
  const timeSeriesService = useMemo(() => new CdfTimeSeriesService(client), [client]);
  const activityService = useMemo(() => new CdfActivityService(client), [client]);
  const documentService = useMemo(() => new CdfDocumentService(client), [client]);

  return (
    <AppStateProvider api={api} initialState={initialState}>
      <RecentAssetsProvider key={`${environment.project}:${environment.baseUrl}`}>
        <AssetServiceProvider assetService={assetService}>
          <TimeSeriesServiceProvider timeSeriesService={timeSeriesService}>
            <ActivityServiceProvider activityService={activityService}>
              <DocumentServiceProvider documentService={documentService}>
                <AppErrorBoundary>
                  <AssetWorkspace />
                </AppErrorBoundary>
              </DocumentServiceProvider>
            </ActivityServiceProvider>
          </TimeSeriesServiceProvider>
        </AssetServiceProvider>
      </RecentAssetsProvider>
    </AppStateProvider>
  );
}

export type AppDeps = Partial<FusionHostProviderDeps>;

type AppProps = {
  deps?: AppDeps;
};

function App({ deps }: AppProps): ReactElement {
  return (
    <FusionHostProvider
      deps={deps}
      loadingFallback={loadingFallback}
      errorFallback={startupErrorFallback}
    >
      <ConnectedApp />
    </FusionHostProvider>
  );
}

export default App;
