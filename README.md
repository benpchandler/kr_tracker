KR Tracker MVP

What’s here
- React + Vite + TypeScript single-page app
- Entry template in `index.html`
- LocalStorage-backed store (no backend)
- Period and KR setup
- Teams: create teams; assign one team per KR; assign multiple teams per Objective
- Spreadsheet-like weekly plan grid
- Lock plan to create a baseline (read-only)

Getting started
1) Install deps: npm install
2) Run dev server: npm run dev
3) Open the URL shown in the terminal

Usage
- Set a period (start and end dates)
- Add one or more Objectives (optional)
- Add Teams, then assign teams to Objectives (optional) and to each KR
- Add Key Results (name, unit, aggregation, optional objective)
- Enter weekly plan values in the Plan Builder grid
- Click "Lock Plan" to freeze the plan as baseline

Notes
- Data persists to localStorage under key `kr-tracker-state-v4`
- Weeks are Monday-start ISO weeks. Internal keys use `YYYY-Www` (e.g., `2025-W09`).
- Grid headers show both the ISO week and date range (e.g., `2025-W09` and `Mar 03–Mar 09`).
- After lock, plan inputs are read-only (baseline view).
- Next steps: Actuals entry grid + metrics (WoW deltas, rolling trends, pacing vs plan)

Debugging & observability
- A global error boundary now wraps the app root, reporting uncaught render errors and exposing a reset action. In development it
  prints error details and stack traces while buffering structured entries in `window.__KR_TRACKER_LOGS__`.
- Use the shared `logger` helper from `src/utils/logger.ts` for structured console + in-memory logging. In production it limits
  output to warnings/errors while still capturing entries for future telemetry sinks.
- App state dispatches are instrumented when `VITE_DEBUG_STORE=true` (or automatically in development). Recent actions and the
  keys they touched are available on `window.__KR_TRACKER_ACTIONS__`.
- Persistence sanitization emits diagnostics accessible through `window.__KR_TRACKER_HYDRATION__`; the hydration routine also
  surfaces warning summaries in the console to highlight malformed saved data.
