# Asset 360 Investigation Workspace — Flows code review (round 4)

This document is the platform review for Asset 360 Investigation Workspace, conducted as part of the Cognite Flows app certification process.

## What this review covers

- **Protect the user and the customer** — no known bugs, correct SDK usage, healthy dependencies, adequate test coverage, and a clean codebase.
- **Protect Cognite services** — appropriate DMS queries, server-side filtering, bounded pagination, controlled call rate, and rate-limit resilience.
- **Protect the brand** — UI consistency with the Aura design system.

Scores are 1–5. A score of 1–2 on any criterion blocks approval. Score 3 is acceptable with tracked follow-up. Scores 4–5 are good.

## Path to approval

This review found **0 must-fix items**. The file viewer now has bounded annotation paging, react-pdf v10, isolated blob lifecycle handling, lint coverage, primary-button panning, and expanded PDF tests. The chart tooltip regression found during the final walkthrough is also closed. Version 0.0.3 is ready to proceed to the refreshed design review.

---

## Review details

### Summary

Round 4 reviewed the committed certification remediation and final manual-walkthrough fixes. Clean installation, lint, TypeScript, all tests, coverage, production build, full dependency audit, and production-only audit pass. CDF access remains SDK-authenticated and scheduled, annotation paging is capped at 5,000 edges, and no known core-flow defects remain.

### Reviewed commit

`6aa6276add9740495c4d72f35126db84050cd7df`

### Test coverage

- **Framework:** Vitest 4.1.11 with V8 coverage
- **Tests run:** 263 passed, 0 failed, 0 skipped (39 files)
- **Coverage:** Statements: 92.97% | Branches: 84.44% | Functions: 94.80% | **Lines: 95.31%**
- **Notable gaps:** Deep browser-only react-pdf rendering paths and a few provider fallback branches; covered behavior remains above the 80% hard gate.

### Package & security summary

- **Direct packages:** 9 dependencies, 25 devDependencies
- **Health:** 10 pass, 0 warn, 0 fail (including the Zod override)
- **Vulnerabilities:** 0 critical, 0 high, 0 moderate, 0 low in full and production-only audits
- Full details: see `review-packages.md`

### Scores

| Area | Criterion | Score | Notes |
| ---- | --------- | ----- | ----- |
| User & customer | 1.1 Known bugs | 5/5 | Final walkthrough defects in document dragging and chart tooltip dates have regression tests and are fixed |
| User & customer | 1.2 CDF via SDK | 5/5 | CDF traffic uses Cognite SDK clients; signed download URLs are fetched only after SDK-authenticated resolution |
| User & customer | 1.3 Packages | 5/5 | react-pdf upgraded to the React-18-compatible v10.5.0; exact clean install and zero-CVE audits pass |
| User & customer | 1.4 Tests & coverage | 5/5 | 263 passing tests; 95.31% line and 84.44% branch coverage |
| User & customer | 1.5 Dead code | 5/5 | Blob and annotation color logic are separated into focused, tested modules; no critical TODO or dead path found |
| User & customer | 1.6 Patterns & testability | 5/5 | Service/context injection and ViewModels remain intact; new blob dependencies are explicitly injectable |
| Cognite services | 2.1 DMS query patterns | 5/5 | Search uses `instances.search`; exact and relation reads use bounded SDK list/query/retrieve operations |
| Cognite services | 2.2 Server-side filter | 5/5 | Asset relationships and annotation constraints are expressed in CDF requests |
| Cognite services | 2.3 Limits & pages | 5/5 | Time-series discovery caps at 500 and annotation discovery caps at 5 pages / 5,000 edges with disclosure |
| Cognite services | 2.4 Call rate | 5/5 | Shared task runner caps concurrent CDF requests; no polling or speculative request fan-out |
| Cognite services | 2.5 429 backoff | 4/5 | Concurrency control limits bursts; explicit jittered Retry-After-aware retries remain a resilience enhancement |
| Brand | 3.1 Aura | 4/5 | Aura components and semantic tokens drive the app; the vendored document renderer necessarily retains focused custom rendering |

### Must fix before deploy

_(none)_

### Should fix before deploy

- [ ] Add bounded exponential backoff with jitter and `Retry-After` support to the shared CDF task runner — `src/lib/cdfTaskRunner.ts` — criterion 2.5
- [ ] Replace the documented module mock in `DocumentsPanel.test.tsx` with an injected viewer component when that test boundary is next refactored — criterion 1.6

### Nice to fix before deploy

- [ ] Validate and adopt `@cognite/app-sdk` 0.10.x in a separate dependency migration — `package.json` — criterion 1.3

## Summary

- Must Fix open: 0
- Should Fix open: 2
- Nice Fix open: 1
