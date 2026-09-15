# Asset 360 Investigation Workspace — Flows code review (round 3)

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## What this review covers

- **Protect the user and the customer** — no known bugs, correct SDK usage, healthy dependencies, adequate test coverage, and a clean codebase.
- **Protect Cognite services** — DMS query patterns, server-side filtering, bounded pagination, 429 backoff, and controlled request rates.
- **Protect the brand** — UI consistency with the Aura design system.

Scores are 1–5. A score of 1–2 on any criterion blocks approval. Score 3 is acceptable with tracked follow-up. Scores 4–5 are good.

## Path to approval

This review found **0 must-fix items** after the hard-gate remediation commit. Proceed to `flows-design-review`.

---

## Review details

### Summary

Round 3 is a fresh review of the version 0.0.2 release snapshot. Coverage exceeds both line and branch gates (94.28% / 82.92%), production build emits zero warnings with the Zod 4.4.3 override, and CDF calls are wrapped in a shared concurrency limiter. Activity ordering, time-series discovery bounds, document-preview provider wiring, and integration tests for preview/chart paths are all closed. No `any` casts, no raw CDF HTTP, and npm audit reports zero vulnerabilities.

### Reviewed release

`0.0.2`

### Test coverage

- **Framework:** Vitest
- **Tests run:** 249 passed, 0 failed, 0 skipped (36 files)
- **Coverage:** Statements: 91.71% | Branches: 82.92% | Functions: 91.50% | **Lines: 94.28%**
- **Notable gaps:** Deep react-pdf render paths, some provider error branches at 75–80% line coverage

### Package & security summary

- **Total packages:** 11 dependencies, 24 devDependencies (839 total resolved)
- **Health:** 11 pass, 0 warn, 0 fail (production deps)
- **Vulnerabilities:** 0 critical, 0 high, 0 moderate, 0 low
- Full details: see `review-packages.md`

### Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 5/5 | Remediation closed activity ordering, preview provider, and truncation defects; manual Fusion smoke passed |
| User & customer | 1.2 CDF via SDK | 5/5 | All CDF traffic via `@cognite/sdk`; `client.post` for extended-expiry download links is SDK-intentional |
| User & customer | 1.3 Packages | 5/5 | Zod 4.4.3 override verified; zero CVEs; dead deps removed |
| User & customer | 1.4 Tests & coverage | 5/5 | **94.28% line / 82.92% branch**; 249 tests; integration coverage for document preview |
| User & customer | 1.5 Dead code | 5/5 | `src/lib/utils.ts` removed; lean codebase |
| User & customer | 1.6 Patterns & testability | 5/5 | DI via context, interface services, ViewModels; `cdfTaskRunner` testable |
| Cognite services | 2.1 DMS query patterns | 5/5 | `instances.search` / `query` for reads; indexed activity sort |
| Cognite services | 2.2 Server-side filter | 5/5 | Filters, limits, and projections in API requests |
| Cognite services | 2.3 Limits & pages | 5/5 | Time-series discovery capped at 500 with truncation disclosure; paginated panels |
| Cognite services | 2.4 Call rate | 5/5 | `QueuedTaskRunner` limits concurrent CDF calls to 4; no polling or request fan-out |
| Cognite services | 2.5 429 backoff | 4/5 | Concurrency limiter reduces burst 429 risk; React Query defaults; no explicit jittered retry |
| Brand | 3.1 Aura | 4/5 | Aura throughout app shell; vendored file-viewer retains minimal inline hex fallbacks |

### Must fix before deploy

_(none)_

### Should fix before deploy

- [ ] Add explicit exponential backoff with jitter on 429 responses in the CDF task runner — `src/lib/cdfTaskRunner.ts` — criterion 2.5
- [ ] Replace `vi.mock('@/cognite-file-viewer')` in `DocumentsPanel.test.tsx` with injected preview doubles — criterion 1.6

### Nice to fix before deploy

- [ ] Upgrade `@cognite/app-sdk` from 0.9.0 to 0.10.0 when validated — `package.json` — criterion 1.3
- [ ] Bump Dockerfile Node base from 22.12 to ≥22.13 so `npm ci` succeeds inside `./bin/dev` — criterion 1.3

## Summary

- Must Fix open: 0
- Should Fix open: 2
- Nice Fix open: 2
