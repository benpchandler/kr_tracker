# Repository Guidelines

## Project Structure & Module Organization
`src/` hosts the React + TypeScript client; UI primitives sit in `src/components/`, shared logic in `src/state/` and `src/utils/`. `server/` runs the Express + SQLite backend and auto-sync pipeline, with JSON seeds in `server/seeds/json/` recreating the database on start. End-to-end helpers live in `tests/`, where Playwright specs stay under `tests/e2e/` and Vitest unit specs are colocated beside their modules (e.g., `src/metrics/engine.test.ts`). Automation scripts reside in `scripts/`, and generated bundles land in `dist/`.

## Build, Test, and Development Commands
Use `npm run dev` for the full stack via `concurrently`, or target surfaces with `npm run dev:client` and `npm run dev:server`. `npm run build` type-checks (`tsc -b`) and emits the Vite production bundle. Run `npm run checks` before opening a PR; it chains ESLint, literal validation, and unit tests. Other staples: `npm run test:unit`, `npm run test:e2e`, `npm run test:coverage`, and `npm run lint`. When seeds drift, `npm run data:export` and `npm run data:import` resync SQLite.

## Coding Style & Naming Conventions
ESLint (`eslint.config.js`) and Tailwind enforce formatting—keep 2-space indentation, double quotes, trailing commas, and explicit TypeScript imports. React components, contexts, and hooks use PascalCase filenames (`TeamFilter.tsx`, `AppProvider.tsx`); utilities and services use camelCase (`computeMetrics`, `adaptBackendToFrontend`). Favor Tailwind utilities over bespoke CSS and update shared tokens through `tailwind.config.js`.

## Testing Guidelines
Write unit tests alongside implementation files and name them `<module>.test.ts[x]`. Lean on Vitest with Testing Library for UI assertions and fast-check when property coverage helps. Browser flows belong in `tests/e2e/` using Playwright fixtures. Aim to run `npm run test:coverage` (Vitest V8 coverage) before merge and quarantine flaky specs until stabilized.

## Commit & Pull Request Guidelines
Follow Conventional Commit prefixes (`feat:`, `fix:`, `chore:`, `test:`); reserve `WIP` for local work and squash before merging. Each PR should describe scope, link issues or Linear tickets, and attach screenshots or seed diffs when UI or data changes are visible. Require a clean `npm run checks`, call out modifications to `server/seeds/json/`, and document new env flags in README or PR notes.

## Data Sync & Configuration Tips
Treat the SQLite file as disposable; JSON seeds are the source of truth and must be committed with related code. If sync drifts, restart the dev server or run `npm run data:check`. When introducing foreign keys, update `STATIC_TABLE_ORDER` in `server/dataSync.cjs`. Store environment defaults in `nodemon.json` and keep `.env*` files untracked.
