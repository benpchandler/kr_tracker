# Repository Guidelines

## Project Structure & Module Organization
- App: `src/` (Vite + React + TypeScript SPA)
- State: `src/state/store.tsx` (single reducer, persisted to `localStorage` key `kr-tracker-state-v3`).
- Domain types: `src/models/types.ts` (Objectives, KRs, Teams, Initiatives, Periods, Baselines).
- Metrics: `src/metrics/engine.ts` (pure functions for deltas, rolling averages, pace, forecast).
- UI: `src/components/*` and `src/pages/*` (e.g., `PlanGrid.tsx`, `ActualsGrid.tsx`, `InitiativesGrid.tsx`, `Setup.tsx`).
- Utilities: `src/utils/weeks.ts` (ISO weeks), `src/hooks/*` (responsive week window).

## Build, Test, and Development Commands
- Install deps: `npm install`
- Dev client: `npm run dev` (open printed localhost URL)
- Build: `npm run build` (TypeScript build + Vite bundle)
- Preview build: `npm run preview`
- Optional server: `npm run server` (or `npm run dev:server` during development)
- Reset local data: in DevTools run `localStorage.removeItem('kr-tracker-state-v3')`

## Coding Style & Naming Conventions
- TypeScript strict; ESM imports only (no `require`).
- Indentation: 2 spaces; React functional components.
- Naming: Components `PascalCase.tsx`, utilities `camelCase.ts`, ISO weeks `YYYY-Www`, KR IDs `kr-YYYYQn-<ts>`.
- Keep logic pure in `metrics` and `utils`; side effects live in components/state.

## Testing Guidelines
- No formal tests yet. Validate manually:
  - Lock a baseline → edit actuals → verify KPIs and initiatives coverage.
  - Refresh to confirm persistence; resize and page weeks to check responsiveness.

## Commit & Pull Request Guidelines
- Prefer small, focused commits. Suggested style: Conventional Commits (e.g., `feat: add risk‑adjusted forecast`).
- PRs should include: clear description, linked issues, screenshots/GIFs for UI, and notes on state changes (bump storage key if breaking).
- Keep patches free of stray diff markers (`+` at line start) and avoid dynamic `require`.

## Architecture Notes (for contributors and agents)
- Grids operate within `visibleWeeks`; clip paste/write operations to the current window.
- Baselines: “Lock Plan” freezes the draft into `state.baselines`; metrics read from the active baseline and degrade gracefully if none exists.
