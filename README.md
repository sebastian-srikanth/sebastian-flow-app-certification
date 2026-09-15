# Asset 360 Investigation Workspace

Read-only equipment investigation app for the Cognite Flows guided builder certification. Search a CogniteAsset, inspect its linked time series and activities, and preview related documents. The product requirements and data-model assumptions are in [SPEC.md](SPEC.md); the supplied certification brief is [App-Brief.md](App-Brief.md).

## Run with Docker Desktop

Start Docker Desktop, then run from this repository:

```sh
./bin/dev npm ci
./bin/dev npm run dev
```

The launcher checks the Dockerfile using cached builds on every invocation and uses Node 22.23.1 / npm 11.10.0. Linux dependencies live in the `sebastian-flow-app-certification-node-modules` Docker volume, separate from macOS `node_modules`. Run `npm ci` through the launcher again after package-lock.json changes. Reinstalling container dependencies does not change host dependencies.

Open the app inside Fusion:

https://publicdata.fusion.cognite.com/publicdatacdm/custom-apps/development/workspace/3001?cluster=api.cognitedata.com&workspace=flows

Opening localhost alone cannot authenticate: the app requires a Fusion parent for the project, cluster, and token. If the local HTTPS certificate is untrusted, complete the supported `npm run setup-https` setup on the host, then restart the development server. Do not disable browser certificate validation globally.

Only loopback port 3001 is published. `FLOWS_DEV_PORT=3002 ./bin/dev ...` can use a different host port, including for validation while another server uses 3001. When serving on that port, also use `/3002` in the Fusion development URL. `FLOWS_DEV_IMAGE` optionally selects a different local image name.

## Validate

```sh
./bin/dev npm run lint
./bin/dev npm run test:coverage
./bin/dev npm run build
./bin/dev npm audit
```

Build includes TypeScript compilation. Coverage enforces at least 80% on lines, branches, statements, and functions. Host development is also supported with the Node/npm versions allowed by package.json; run `npm ci` on the host separately.

## Representative live checks

- publicdatacdm: `23-TT-92537` has a numeric time series and related activities. Select the series explicitly; choose a range and manually refresh. Historic datapoints anchor the time window to available data.
- publicdatacdm: `23-KA-9101-M01` exercises a larger linked-series/activity list.
- Documents may correctly be empty in publicdatacdm. Preview validation also needs an accessible asset with an uploaded linked PDF/image, such as the previously used personal-project asset `P-301A`.
- Reload an asset URL, return to search, and reopen a recently viewed asset. Recent assets are scoped to project and cluster.

The app reads the base Cognite Core Data Model. It does not invent work-order status when the source model lacks that property. Linked-series discovery is bounded at 500 and chart selection at five numeric series. No CDF data writes or automatic polling are part of this application.

## Certification materials

The latest certification evidence is retained in
[the code review](reviews/code-review/feedback-round-4/code-review-report.md) and
[the design review](reviews/design-review/feedback-round-3/design-review-report.md).
The measured result is 263 passing tests, 95.31% line coverage, 84.44% branch
coverage, no audit vulnerabilities, no code-review Must Fix items, and a 4.7
design score.

The supplied internal process uses the [Flows Application Certification portal](https://cog-dune.fusion.cognite.com/dune-apps/custom-apps/app/dune-certifications?cluster=api.cognitedata.com&workspace=flows). Follow its current requirements for the application, version, engineering/design checklists, and demo evidence. The source `sources/` directory is internal course material and must remain excluded from distribution.

The GitHub workflow runs lint, threshold-enforced coverage, and the production build for pushes and pull requests.
