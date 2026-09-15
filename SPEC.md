# Feature Specification: Asset 360 Investigation Workspace

## User Scenarios & Testing

### User Stories

1. As an Operations Analyst, I want to search for a piece of equipment by its tag, name, or description, so that I can quickly find the asset flagged in a shift report or alarm without logging in to multiple systems.
2. As an Operations Analyst, I want to open a single 360° detail page for the selected asset, so that I can see its identity, time series, work orders, and related documents in one unified view.
3. As an Operations Analyst, I want to plot the time series linked to the selected asset over a recent time window, so that I can judge current behavior versus normal without opening the historian tool.
4. As an Operations Analyst, I want to see the recent work orders / activities related to the selected asset, so that I can answer "has anyone already touched this?" without logging in to SAP.
5. As an Operations Analyst, I want to see and preview the documents (P&IDs, manuals, inspection reports) related to the selected asset, so that I do not have to dig through SharePoint to brief the maintenance team.
6. As an Operations Analyst who investigates the same handful of assets across a shift, I want the app to remember the assets I recently opened, so that I can jump back to them in one click.

### Acceptance Scenarios

- Given the analyst is on the home screen, when they type the first few characters of an equipment tag, then they see a ranked list of matching assets showing tag, name, and enough parent/location context to disambiguate.
- Given matching results are displayed, when the analyst selects one, then they are taken to that asset's 360 detail view — published to the Flows host as shared application state so the host's URL restores the same asset — with the asset's tag, name, description, and type clearly shown at the top.
- Given the analyst submits a search term that matches no assets, when the search completes, then the app shows a clear empty state explaining no assets matched and how to refine the search.
- Given the analyst is on an asset 360 page, when the page loads, then the time series panel lists the series linked to the asset up to the bounded discovery limit defined in FR-005 — and tells the analyst when further linked series exist beyond that bound — but plots none by default; the analyst must explicitly pick which series to chart.
- Given the analyst selects one or more time series, when the chart renders, then the default time window ends at the most recent datapoint among the selected series (not at wall-clock "now"), and the chart updates when the analyst changes the selection or the time range.
- Given the analyst is viewing the time series chart, when they trigger the manual refresh control, then the chart re-fetches data for the currently selected series and time range; the chart never auto-polls or streams.
- Given the analyst is viewing an asset with related work orders, when the page loads, then they see a list of recent work orders in the recency order defined in FR-007, each showing identifier, title, and date, with a note that status is unavailable in the base data model; selecting one reveals its full detail without leaving the 360 page.
- Given an asset has more related work orders than one page holds, when the analyst loads a further page, then the newly fetched work orders are appended below the rows already on screen and no previously displayed row changes position, because the order shown is the server's.
- Given the analyst is viewing an asset with related documents, when the page loads, then they see a list of files with name, type, and last-modified date; selecting a PDF or common image opens it inline; any other file type offers a clear download / open-externally action.
- Given the asset has no linked time series, no work orders, or no documents, when the page loads, then each panel shows its own empty state independently and the rest of the page still renders.
- Given a CDF call for one panel fails or is slow while others succeed, when the page loads, then the failing panel shows an inline error with a retry control and the other panels keep working.
- Given the analyst's CDF token does not grant access to a data type (e.g., files), when the page loads, then the affected panel shows a clear "no access" state instead of a generic error.
- Given the analyst has opened at least one asset on this device, when they return to the home screen, then they see a recently-viewed list (up to 10 entries) and can click any entry to return to that asset's 360 view.
- Given an uncaught render error occurs in routing or shared layout, when the error is thrown, then an application-level error boundary shows a clear recovery affordance (reload) instead of a blank screen.

## Requirements

### Functional Requirements

- FR-001: The app MUST provide a single search entry point that accepts a partial or full equipment tag, name, or description and returns a ranked list of matching assets from CDF.
- FR-002: Each search result MUST display the asset's tag/external id, human-readable name, and enough contextual information (e.g., description and parent/location) to disambiguate similarly named assets.
- FR-003: Selecting a search result MUST navigate the analyst to a dedicated 360 detail view for that asset, and that view MUST be deep-linkable — the selected asset is published to the Flows host as shared application state (`syncInternalState`), which is the mechanism the host reflects into the browser URL. The app does not read or write `window.location` itself.
- FR-004: The 360 detail view MUST show an asset header with tag, name, description, and type, sourced from the asset record in CDF.
- FR-005: The 360 detail view MUST include a time series panel that discovers the time series linked to the asset up to a bounded safe limit of **500 series**, and MUST inform the analyst when further linked series exist beyond that bound rather than silently presenting a partial list as complete. The bound is a platform-safety requirement, not a shortfall: reverse direct-relation cardinality has no platform ceiling, so an unbounded cursor drain would let a plant-level asset issue an unbounded number of sequential round trips. Discovery MUST stop paginating once the bound is reached. By default no series is plotted; the analyst explicitly selects which series to chart. When at least one series is selected, the chart's default time window MUST be anchored to the most recent datapoint available for the displayed series (i.e., end of window = latest datapoint timestamp), not to the current wall-clock time, because historian data for these assets may be stale.
- FR-006: Users MUST be able to add or remove plotted series and change the time range shown without leaving the 360 view.
- FR-006a: When no datapoints exist for a selected series at all, the chart MUST show a clear empty state for that series rather than rendering an empty axis or an error.
- FR-006b: The time series chart MUST NOT auto-poll or stream updates. The analyst MUST be able to trigger a manual refresh from the chart panel; the refresh re-fetches data for the currently selected series and time range.
- FR-007: The 360 detail view MUST include a work orders / activities panel that lists items related to the asset, sorted by recency, showing identifier, title/description, and a relevant date. Recency is defined as **`CogniteSchedulable.endTime` descending with nulls first**, requested from the server, so that the ordering holds across the whole result set rather than only within the pages already fetched. That single indexed key is what keeps the sort combinable with pagination cursors; the app MUST NOT re-rank fetched pages with any other comparator, and MUST NOT add a second, unindexed sort key. Nulls first means activities with no completion date (typically still in progress) are listed before completed ones; the panel states this ordering. A row may still *display* a fallback date (scheduled end, start, source updated) when `endTime` is absent — that is a labelling choice and does not affect order. Status is **not** included: base `cdf_cdm.CogniteActivity:v1` carries no `status` property, and the panel discloses this rather than fabricating one — see "Work order status" under Clarifications.
- FR-008: Users MUST be able to view the full detail of a single work order from the panel without leaving the 360 view.
- FR-009: The 360 detail view MUST include a documents panel that lists files related to the asset with file name, type, and last-modified date.
- FR-010: Users MUST be able to preview PDF files and common image formats (PNG, JPEG, GIF, WEBP) inline within the 360 view. When a preview is zoomed above 100%, users MUST be able to pan it by dragging with the primary or middle mouse button or by scrolling a trackpad. All other file types (e.g., Office documents, CAD files, video) MUST present a clear download / open-externally action instead of an inline viewer; no other inline preview formats are in scope for v1.
- FR-011: Each panel (time series, work orders, documents) MUST render its own loading, empty, error, and no-access states independently so a failure or gap in one panel does not block the others.
- FR-012: The app MUST track and display a list of the analyst's recently viewed assets so they can return to a prior asset in one click. The list MUST persist in browser-local storage on the analyst's device (surviving page reloads and browser restarts), MUST be scoped per CDF project and cluster base URL, MUST be capped at the 10 most recent assets (oldest entries dropped first), and is not synchronized across devices in v1.
- FR-013: The app MUST authenticate the analyst against CDF and only display data the analyst is authorized to see.
- FR-014: All asset, time series, work order, and document data displayed MUST be retrieved live from CDF rather than from a separately maintained copy.
- FR-015: The app MUST be usable on a standard desktop/laptop screen size used in an office or control room (large monitor down to a 13" laptop) without requiring horizontal scrolling.
- FR-016: Beyond per-panel error boundaries, routed application content MUST be wrapped in an application-level error boundary so an uncaught render failure in routing or page layout shows a clear recovery affordance (reload) instead of a blank screen.

## Success Criteria

- SC-001: An Operations Analyst can go from "I have an equipment tag" to "I am looking at that asset's tag, time series, work orders, and documents on one page" in under 30 seconds for a typical asset.
- SC-002: For a typical investigation, the analyst completes the task without opening any other tool (no SAP tab, no historian tab, no SharePoint tab) in at least 80% of sessions.
- SC-003: Median end-to-end investigation time (asset flagged → ready to brief maintenance) drops from 1–2 hours using the legacy multi-tool workflow to under 15 minutes using this app.
- SC-004: On a representative asset's 360 page, all four core panels (header, time series, work orders, documents) render usable content (or a correct empty/error state) within 3 seconds on a standard office network.
- SC-005: At least 90% of analyst sessions in a week include at least one search executed and at least one related document opened, indicating the unified flow is being used end-to-end rather than abandoned partway through.
- SC-006: When one data source is unavailable (e.g., documents), at least 95% of sessions still successfully render the remaining panels, demonstrating that panel-level resilience is working.

## Clarifications

- Default time window for the time series chart is anchored to the most recent datapoint of each selected series (not wall-clock "now"), because historian data for these assets may be stale.
- No time series is plotted by default when an asset has many linked series; the analyst explicitly picks which series to chart.
- The time series chart refreshes only on a manual refresh action; the app does not auto-poll or stream updates. The App Brief's supplied phrase "a live time-series chart" is reproduced verbatim from the certification brief and means the chart is backed by live CDF datapoints read on demand — not that it streams. FR-006b is the binding behavioural requirement.
- Work orders are ordered by the server on one cursorable indexed key; see FR-007 and "Work order 'recency'" under implementation considerations.
- Linked time series discovery is bounded at 500 series, and the panel tells the analyst when more exist; see FR-005.
- The recently-viewed list persists in browser-local storage per device and is capped at the last 10 assets.
- Inline document preview is limited to PDFs and common image formats (PNG, JPEG, GIF, WEBP) in v1; all other types fall back to download / open-externally.

## Assumptions

- The target user is an Operations Analyst / Reliability Engineer working primarily on a desktop or laptop in an office or control room; mobile and tablet layouts are out of scope for v1.
- The analyst already has a valid CDF identity and the app authenticates against CDF using the standard Flows authentication pattern; user provisioning is out of scope.
- All required data already exists in CDF as instances of the Cognite Core Data Model: assets, time series, activities, and files are linked to the asset via the standard CDM relationships. This app reads from CDF and does not write to SAP, historians, or SharePoint.
- "Work orders" in v1 are read from `CogniteActivity` instances linked to the asset; this app does not call SAP directly in v1.
- "Documents" in v1 are `CogniteFile` instances linked to the asset; this app does not call SharePoint directly in v1.
- Recently-viewed assets are persisted in browser-local storage per device (last 10), surviving page reloads and browser restarts; cross-device synchronization is out of scope for v1.
- The app is delivered as a Cognite Flows app and follows the workspace's standard auth, design (Aura), and data-modeling practices.

---

## Data Models & CDF Integration *(mandatory)*

### Existing views

All domain data is read live from the Cognite Core Data Model (`cdf_cdm` space). No new views are introduced.

- `cdf_cdm.CogniteAsset:v1` — source of the searchable asset list and the asset header (external id/tag, `name`, `description`, `type`, and `parent` for location context). Also exposes reverse relations `timeSeries`, `activities`, and `files` for related data.
- `cdf_cdm.CogniteTimeSeries:v1` — time series related to the asset. Forward relation: `assets` (list of direct relations to `CogniteAsset`). Datapoints are fetched via the Time Series datapoints API using each series' `instanceId` (data modeling projects).
- `cdf_cdm.CogniteActivity:v1` — work orders / maintenance activities related to the asset. Forward relation: `assets` (list of direct relations to `CogniteAsset`). Sorted server-side by `endTime` (from `CogniteSchedulable`) descending with nulls first for the work orders panel — the single cursorable key required by FR-007.
- `cdf_cdm.CogniteFile:v1` — files related to the asset. Forward relation: `assets` (list of direct relations to `CogniteAsset`). Powers the documents panel and inline PDF/image preview (`mimeType`, `uploadedTime`).

**Shared core features used across views (verified):**

| View | Relevant inherited properties |
| --- | --- |
| `CogniteAsset` | `CogniteDescribable`: `name`, `description`; `parent`, `type` |
| `CogniteTimeSeries` | `CogniteDescribable`: `name`, `description` |
| `CogniteActivity` | `CogniteDescribable`: `name`, `description`; `CogniteSourceable`: `sourceId`; `CogniteSchedulable`: `startTime`, `endTime`, `scheduledStartTime`, `scheduledEndTime` |
| `CogniteFile` | `CogniteDescribable`: `name`, `description`; `mimeType`, `uploadedTime`; `CogniteSourceable`: `sourceUpdatedTime` |

### Implementation considerations *(not product requirements)*

These notes guide implementation without changing certification scope:

- **Related-data query pattern:** CDM links time series, activities, and files to assets through forward `assets` direct-relation lists on the related views. `CogniteAsset` also exposes reverse relations (`timeSeries`, `activities`, `files`). Because direct-relation lists cannot be traversed in reverse at query time, finding activities for an asset typically means filtering `CogniteActivity` (and similarly `CogniteTimeSeries` / `CogniteFile`) where `assets` contains the selected asset — or using the asset's reverse-relation properties where the query API supports them.
- **Work order "status":** Earlier drafts of FR-007 and the acceptance scenarios called for a status field on each work order row; both now state explicitly that status is unavailable. Verified against current Cognite Core Data Model documentation, base `cdf_cdm.CogniteActivity:v1` does **not** define a `status` property (unlike domain-specific views such as `CogniteOperation` in the process industry model). This guided base-CDM implementation therefore does **not** fabricate OPEN/CLOSED or other status values from dates, tags, or source context. It shows identifier, title/description, and schedulable/source dates from `CogniteDescribable`, `CogniteSourceable`, and `CogniteSchedulable`, with a concise panel/detail note that status is unavailable in the base model. A production work-order solution would need a governed status property mapped from SAP or an extended view if the business requires it.
- **Work order "recency":** DMS combines a custom sort with pagination cursors only when the sort matches a cursorable index, and Cognite documents ascending/nulls-last and descending/nulls-first as the two cursorable orderings. DMS sort is also lexicographic with no COALESCE, so a "newest of `endTime`, else `scheduledEndTime`, else `startTime`, …" ranking cannot be expressed server-side. FR-007 therefore defines recency as the one indexed key the platform can order globally (`endTime` descending, nulls first) and the panel renders that order verbatim. The earlier alternative — applying the fallback ranking to each fetched page — was only correct once every page had been fetched: an unfetched page could hold a newer fallback date, so paging reshuffled rows the analyst had already read.
- **Time series discovery bound:** FR-005's 500-series bound is enforced in `TIME_SERIES_MAX_RESULTS`, with a page size of 200, so a worst-case asset costs three requests. Truncation is reported to the panel and surfaced to the analyst; it is never inferred silently.
- **Diagram annotation bound:** Document preview loads at most five pages of 1,000 diagram annotations (5,000 total). If more annotations remain, paging stops and the preview tells the analyst that some annotations are not shown, preventing a heavily annotated document from issuing an unbounded request sequence.
- **Authentication:** Use the standard Flows pattern (`connectToHostApp()` from `@cognite/app-sdk`); all CDF access through the authenticated SDK.

### New views

None. This app does not introduce or modify any views, containers, or data models.

### Spaces

- `cdf_cdm` — the system space that hosts the Cognite Core Data Model views listed above. The app reads from this space only; it does not write to it.
- No project-defined spaces are created or written to by this app. The only client-side persistence is `localStorage` for the recently-viewed list.
