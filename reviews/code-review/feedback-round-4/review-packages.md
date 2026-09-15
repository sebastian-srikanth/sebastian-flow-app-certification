## Package audit: Asset 360 Investigation Workspace

### Dependencies

| Package | Used version | Latest compatible / current | Deprecated | CVEs | Health |
| ------- | ------------ | --------------------------- | ---------- | ---- | ------ |
| @cognite/app-sdk | 0.9.0 | 0.10.0 | No | 0 | Pass |
| @cognite/aura | 0.3.5 | Current | No | 0 | Pass |
| @cognite/sdk | 10.13.0 | 10.14.0 | No | 0 | Pass |
| @tabler/icons-react | 3.46.0 | Current | No | 0 | Pass |
| @tanstack/react-query | 5.102.8 | Current | No | 0 | Pass |
| react | 18.3.1 | 18.3.1 for the current React major | No | 0 | Pass |
| react-dom | 18.3.1 | 18.3.1 for the current React major | No | 0 | Pass |
| react-pdf | 10.5.0 | 10.5.0 for React 18; v11 requires React 19 | No | 0 | Pass |
| recharts | 3.10.1 | Current | No | 0 | Pass |
| zod (override) | 4.4.3 | 4.5.4 | No | 0 | Pass |

### Security audit

| Severity | Full tree | Production tree |
| -------- | --------- | --------------- |
| Critical | 0 | 0 |
| High | 0 | 0 |
| Moderate | 0 | 0 |
| Low | 0 | 0 |

#### Vulnerabilities

_(none)_

### Review notes

- Exact installation with `npm ci` completed successfully.
- The app has 9 runtime dependencies and 25 development dependencies.
- Production licenses are predominantly MIT, ISC, Apache-2.0, BSD, and other permissive licenses. The report showed no direct production dependency requiring replacement.
- Major-version differences for React, React DOM, their type packages, Vitest, and Vite are coordinated ecosystem migrations and are not dependency-health failures.
- The Zod override remains intentional: it satisfies direct consumers and prevents the previously reproduced Rollup annotation warnings without changing the emitted runtime bundle.
