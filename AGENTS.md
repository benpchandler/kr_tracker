# Repository Guidelines

Contributors building features or automation agents should start with this quick orientation tailored to kr_tracker.

## Project Structure & Module Organization
- `src/` hosts the React + TypeScript client; place UI primitives in `src/components/`, shared stores in `src/state/`, and utilities in `src/utils/`.
- `server/` contains the Express + SQLite backend plus the data sync pipeline; JSON seeds in `server/seeds/json/` provide snapshot data for manual import/export.
- End-to-end helpers live in `tests/`; Playwright specs belong under `tests/e2e/` while Vitest unit specs stay beside their modules (e.g., `src/metrics/engine.test.ts`).
- Automation scripts sit in `scripts/`, and build artifacts land in `dist/`.

## Build, Test, and Development Commands
- `npm run dev` launches client and server concurrently.
- `npm run dev:client` / `npm run dev:server` target individual surfaces.
- `npm run build` runs `tsc -b` and produces the Vite bundle.
- `npm run checks` chains linting, literals validation, and unit tests; run it before any PR.
- Use `npm run data:export` and `npm run data:import` to sync SQLite seeds.

## Coding Style & Naming Conventions
- Follow ESLint (`eslint.config.js`) and Tailwind defaults: 2-space indentation, double quotes, trailing commas, explicit TypeScript imports.
- Use PascalCase for React components, contexts, and hooks (e.g., `TeamFilter.tsx`), and camelCase for utilities/services (e.g., `computeMetrics.ts`).
- Prefer Tailwind utility classes over custom CSS and update shared tokens through `tailwind.config.js`.

## Testing Guidelines
- Vitest with Testing Library powers unit tests; Playwright drives browser flows.
- Name unit specs `<module>.test.ts[x]` and colocate them with the implementation.
- Run `npm run test:unit` for fast feedback and `npm run test:coverage` to verify V8 coverage before merge.

## Commit & Pull Request Guidelines
- Use Conventional Commit prefixes (`feat:`, `fix:`, `chore:`, `test:`); reserve `WIP` for local work.
- Keep PRs scoped, link Linear tickets or issues, and include screenshots or seed diffs for UI or data changes.
- Require a clean `npm run checks`; call out any updates to `server/seeds/json/` and document new env flags in the PR.

## Data & Configuration Tips
- The SQLite database (`server/kr.sqlite`) now persists across restarts; use the JSON seeds in `server/seeds/json/` as versioned fixtures rather than the source of truth.
- Run `npm run data:export` after meaningful data edits to refresh the seeds, and `npm run data:import` only when you intentionally want to reset to the committed snapshot.
- Store default env values in `nodemon.json`; keep `.env*` files untracked.
