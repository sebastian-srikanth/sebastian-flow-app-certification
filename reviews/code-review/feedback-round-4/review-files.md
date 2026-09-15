## File inventory: Asset 360 Investigation Workspace

| File | Structure | Quality | Patterns | Tests | Notes |
| ---- | --------- | ------- | -------- | ----- | ----- |
| src/main.tsx | 5 | 5 | N/A | N/A | Entry point; bounded React Query defaults |
| src/App.tsx | 5 | 5 | 5 | ✓ | Host wiring, service providers, startup states, error boundary |
| src/components/AppErrorBoundary.tsx | 5 | 5 | N/A | ✓ | Top-level render error fallback |
| src/lib/accessErrors.ts | 5 | 5 | N/A | ✓ | Shared authorization-error detection |
| src/lib/cdfTaskRunner.ts | 5 | 5 | 5 | ✓ | Shared CDF concurrency limiter |
| src/host/FusionHostProvider.tsx | 5 | 5 | 5 | ✓ | Injectable Apps API host connection |
| src/host/fusionHostContext.ts | 5 | 5 | 5 | N/A | Connection state types |
| src/host/useFusionHost.ts | 5 | 5 | 5 | ✓ | Narrow host API and SDK accessors |
| src/host/testHostApi.ts | 4 | 5 | 5 | N/A | Test-only host mock factory |
| src/cognite-file-viewer/CogniteFileViewer.tsx | 4 | 5 | 5 | ✓ | Rendering separated from blob loading and viewport behavior |
| src/cognite-file-viewer/DocumentAnnotationOverlay.tsx | 5 | 5 | N/A | ✓ | Normalized diagram annotation overlay |
| src/cognite-file-viewer/annotationColors.ts | 5 | 5 | N/A | ✓ | Pure annotation color mapping |
| src/cognite-file-viewer/fileResolution.ts | 5 | 5 | 5 | ✓ | SDK-authenticated download-link resolution |
| src/cognite-file-viewer/mimeTypes.ts | 5 | 5 | N/A | ✓ | Exhaustive inline-preview MIME policy |
| src/cognite-file-viewer/useBlobUrl.ts | 5 | 5 | 5 | ✓ | Injectable fetch, abort, and object-URL lifecycle |
| src/cognite-file-viewer/useDocumentAnnotations.ts | 5 | 5 | 5 | ✓ | Cursor paging capped at five 1,000-edge pages |
| src/cognite-file-viewer/useFileResolver.ts | 5 | 5 | 5 | ✓ | Cancellable SDK file resolution |
| src/cognite-file-viewer/useViewport.ts | 5 | 5 | N/A | ✓ | Bounded zoom; mouse, wheel, and touch pan controls |
| src/cognite-file-viewer/index.ts | 5 | 5 | N/A | N/A | Public barrel |
| src/cognite-file-viewer/types.ts | 5 | 5 | N/A | N/A | Public viewer types |
| src/features/asset-workspace/components/* | 4–5 | 5 | 5 | ✓ | Aura panels driven by shared-state ViewModels |
| src/features/asset-workspace/hooks/*ViewModel.ts | 5 | 5 | 5 | ✓ | Injectable queries, commands, and derived state |
| src/features/asset-workspace/services/Cdf*.ts | 5 | 5 | 5 | ✓ | SDK-only access with explicit limits and task scheduling |
| src/features/asset-workspace/state/* | 5 | 5 | 5 | ✓/N/A | Shared state and narrow service contexts |
| src/features/asset-workspace/activities/* | 5 | 5 | N/A | ✓ | Server-ordered activity mapping and safe display fallbacks |
| src/features/asset-workspace/documents/* | 5 | 5 | N/A | ✓ | Preview policy, metadata mapping, and error classification |
| src/features/asset-workspace/time-series/tooltipTimestamp.ts | 5 | 5 | N/A | ✓ | Tooltip reads hovered row timestamp with safe fallback |
| src/features/asset-workspace/time-series/* | 5 | 5 | N/A | ✓ | Chart merge, anchoring, ranges, labels, and bounded discovery |
| src/features/asset-workspace/recent-assets/* | 5 | 5 | N/A | ✓ | Project-scoped, bounded local storage |

**Summary:** 84 production `.ts`/`.tsx` files and 39 test files under `src/`. All non-trivial modules are covered directly or through a focused integration test. Round 4 specifically verified the react-pdf v10 migration, bounded annotation loading, blob URL cleanup, primary-button document panning, and valid chart tooltip timestamps.
