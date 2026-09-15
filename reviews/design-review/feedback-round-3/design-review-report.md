# Design Review — Asset 360 Investigation Workspace — round 3

## User and tasks

- **Primary user:** Operations Analyst / Reliability Engineer at an industrial facility; investigates flagged equipment from a standard desktop or laptop.
- **Tasks evaluated:**
  1. Search for equipment and open its unified Asset 360 investigation view
  2. Review connected time series and recent work orders / activities
  3. Open, zoom, and pan a related PDF, then return to the asset and recently viewed workflow
- **Context:** Read-only Flows application using live CDF data. The user confirmed the complete walkthrough on September 15, 2026.

## Task walkthrough findings

- **Task 1 — Search and open an asset:** Confirmed working. The asset context, related panels, and return path remained clear, with no navigation dead end.
- **Task 2 — Investigate chart and activities:** Confirmed working. The supplied chart evidence showed three selected numeric series, the 24-hour range, values and units, and a valid hovered timestamp after the tooltip fix. Activities remained visible in the same investigation workspace.
- **Task 3 — Inspect documents and return:** Confirmed working. The supplied PDF evidence showed an inline one-page datasheet rendered at 175% zoom. Primary-button drag panning was fixed and confirmed as part of the completed walkthrough. The user also confirmed the recently viewed workflow.
- **Observed defects closed during walkthrough:** Primary-button document dragging and the chart tooltip's `Invalid Date` label were fixed with regression tests before this review was scored.

## Repository check evidence

- Aura components are imported by 12 application files. Custom colors are confined to the diagram annotation category palette.
- No clickable `div` or `span` anti-patterns, vague action labels, critical TODO markers, or missing icon-button labels were found.
- Search, time-series, activity, document, startup, and application-level failure paths expose loading, empty, error, retry, or no-access feedback as applicable.
- The intended platform is desktop/laptop; browser zoom is not disabled, responsive spacing is present, and the supplied screenshots fit the supported viewport.
- Production build passed with split chart, Aura, SDK, vendor, react-pdf, and pdfjs chunks. CDF reads remain bounded and scheduled.
- Two document `<img>` elements use `alt=""` intentionally because they render the document itself inside an already labelled preview rather than adding a separate content image.

## Scores

| Question | Score | Rationale | Improvement note |
| --- | --- | --- | --- |
| Q1 Aura consistency | 4 | Aura components and semantic tokens drive the workspace; custom RGB values are limited to meaningful annotation categories | Consider an Aura-owned semantic annotation palette if one becomes available |
| Q2 Navigation & hierarchy | 5 | The shallow search-to-asset flow stayed clear in the confirmed walkthrough | — |
| Q3 Labels & language | 5 | Controls and messages are specific; no vague Submit, OK, or unlabeled icon actions were found | — |
| Q4 Feedback & validation | 5 | All data panels provide tested loading, error, retry, empty, and no-access feedback | — |
| Q5 Clickability | 5 | Semantic controls are used throughout; zoom, range controls, chart hover, and primary-button panning were confirmed | — |
| Q6 Error prevention | 5 | The app is read-only and contains no destructive action that could lose customer data | — |
| Q7 Responsive | 5 | The app is intentionally desktop/laptop-first and fits the supported screens; browser text zoom remains enabled | — |
| Q8 Empty states | 5 | Search, series, datapoints, activities, and documents all explain absent data and the next action | — |
| Q9 Performance | 4 | CDF reads are bounded and scheduled, chart code is lazy-loaded, and build chunks are partitioned; PDF support remains substantial | Continue monitoring first-open PDF cost |
| Q10 Accessibility | 4 | Semantic controls, ARIA labels, keyboard-capable buttons, decorative image alts, and zoom support are present | Run an axe/contrast scan as a future enhancement |

## Summary

- Average score: 4.7
- Quality level: Excellent — ready to launch

## Must Fix (any score < 3)

_(none)_

## Should Fix (any score 3 – 3.7)

_(none)_

## Nice to Fix (any score 3.8 – 4.4)

- Q1: Adopt an Aura semantic annotation palette if the design system adds one
- Q9: Continue optimizing or deferring the first-open PDF cost
- Q10: Add a recorded axe/contrast scan to a future release checklist
