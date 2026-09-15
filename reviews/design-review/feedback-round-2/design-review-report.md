# Design Review — Asset 360 Investigation Workspace — round 2

## User and tasks

- **Primary user:** Operations Analyst / Reliability Engineer at an industrial facility; desktop/laptop with large monitor; investigates flagged equipment after alarms or shift reports.
- **Tasks evaluated:**
  1. Search for a specific piece of equipment and open its unified investigation view
  2. Review connected time series, activities, and documents for that asset
  3. Reopen a recently viewed asset after reload
- **Context:** Read-only Asset 360 viewer; live CDF data on publicdatacdm and personal project; desktop-first per App-Brief.

## Task walkthrough findings

Manual Fusion smoke evidence supplied for this review (not agent-observed pixels):

- **Task 1 — Search and open asset (PUBLICDATA / 23-KA-9101-M01):** Asset loaded; 43 linked numeric time series displayed with real datapoints in chart; 24h range visibly rendered; activity list loaded; Activity detail dialog opened successfully.
- **Task 2 — Unified investigation (PERSONAL PROJECT / P-301A):** Asset loaded; linked time series showed truthful no-datapoints state; activities loaded; documents loaded; real PDF opened inside Document Preview; PDF rendered successfully; zoom worked at 150%; no Asset 360 provider/error-boundary crash.
- **Task 3 — Recently viewed after reload:** Recently Viewed displayed 23-KA-9101-M01 and 23-TT-92537 after reload/search.

No navigation dead-ends or provider crashes reported. Empty/no-datapoints states displayed truthfully.

## Scores

| Question | Score | Rationale | Improvement note |
| --- | --- | --- | --- |
| Q1 Aura consistency | 4 | `@cognite/aura` in 12 app files; 1 vendored hex fallback in CogniteFileViewer | Migrate viewer fallbacks to Aura tokens when upstream allows |
| Q2 Navigation & hierarchy | 5 | Shallow search ↔ detail SPA; walkthrough confirms clear asset context and back-to-search; Fusion host chrome | — |
| Q3 Labels & language | 5 | Action-oriented copy; search input has aria-label; no vague Submit/OK buttons | — |
| Q4 Feedback & validation | 5 | Loading/error/empty on all panels; manual smoke confirms truthful no-datapoints and truncation states | — |
| Q5 Clickability | 5 | Zero `<div onClick>`; semantic Aura buttons; hover via Aura defaults | — |
| Q6 Error prevention | 5 | Read-only app; no destructive actions (N/A default 5) | — |
| Q7 Responsive | 5 | Desktop-first per App-Brief; viewport meta present; responsive utilities in layout | — |
| Q8 Empty states | 5 | All data panels handle empty branches; P-301A no-datapoints state confirmed live | — |
| Q9 Performance | 4 | Vite manual chunks keep emitted chunks under advisory; bounded list reads; chart renders live data | Consider route-level lazy loading for pdfjs |
| Q10 Accessibility | 4 | 27 aria-label usages; decorative img alt=""; no axe/contrast scan performed this round | Run axe in Fusion before final recording |

## Summary

- Average score: 4.7
- Quality level: Excellent — ready to launch

## Must Fix (any score < 3)

_(none)_

## Should Fix (any score 3 – 3.7)

_(none)_

## Nice to Fix (any score 3.8 – 4.4)

- Q1: Replace vendored file-viewer hex fallbacks with Aura tokens when feasible
- Q9: Lazy-load pdfjs-dist chunk on first document preview
- Q10: Run axe-core contrast scan in deployed Fusion session before M-13 recording
