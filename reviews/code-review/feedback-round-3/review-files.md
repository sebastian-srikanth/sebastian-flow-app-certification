## File inventory: Asset 360 Investigation Workspace

| File | Structure | Quality | Patterns | Tests | Notes |
| ---- | --------- | ------- | -------- | ----- | ----- |
| src/main.tsx | 5 | 5 | N/A | N/A | Entry point; QueryClient defaults |
| src/App.tsx | 5 | 5 | 5 | ✓ | Host wiring, service providers, error boundary |
| src/components/AppErrorBoundary.tsx | 5 | 5 | N/A | ✓ | Top-level render error fallback |
| src/lib/accessErrors.ts | 5 | 5 | N/A | ✓ | Shared 403 detection |
| src/lib/cdfTaskRunner.ts | 5 | 5 | 5 | ✓ | CDF concurrency limiter (max 4) |
| src/host/FusionHostProvider.tsx | 5 | 5 | 5 | ✓ | Single connectToHostApp init |
| src/host/fusionHostContext.ts | 5 | 5 | 5 | N/A | Connection state types |
| src/host/useFusionHost.ts | 5 | 5 | 5 | ✓ | Host API / SDK accessors |
| src/host/testHostApi.ts | 4 | 5 | 5 | N/A | Test-only host mock factory |
| src/cognite-file-viewer/* | 4 | 5 | 5 | ✓ | PDF viewer; CDF calls via cdfTaskRunner |
| src/features/asset-workspace/components/* | 4–5 | 5 | 5 | ✓ | Aura panels; ViewModel-driven |
| src/features/asset-workspace/hooks/*ViewModel.ts | 5 | 5 | 5 | ✓ | Injectable ViewModels |
| src/features/asset-workspace/services/Cdf*.ts | 5 | 5 | 5 | ✓ | SDK-only; cdfTaskRunner; bounded reads |
| src/features/asset-workspace/state/* | 5 | 5 | 5 | ✓/N/A | DI providers and contexts |
| src/features/asset-workspace/activities/* | 5 | 5 | N/A | ✓ | Server-ordered activity mapping |
| src/features/asset-workspace/documents/* | 5 | 5 | N/A | ✓ | Preview policy, error mapping |
| src/features/asset-workspace/time-series/* | 5 | 5 | N/A | ✓ | Chart data, 500-series cap |
| src/features/asset-workspace/recent-assets/* | 5 | 5 | N/A | ✓ | Project-scoped localStorage |

**Summary:** 82 production `.ts`/`.tsx` files under `src/` (excluding tests). All non-trivial modules have corresponding tests. Dead utility code was removed, and remediation coverage is included in the release snapshot.
