<!-- This file mirrors AGENTS.md so Claude-powered agents get the same guidance. -->

# KR Tracker – AGENTS (Claude)

> Note: This is a direct copy of AGENTS.md. Keep content in sync.

$(include ./AGENTS.md)
KR Tracker – AGENTS

Purpose
- This file guides coding agents working in this repo: project layout, conventions, and how major features (plan, actuals, metrics, initiatives) fit together.
- Scope covers the whole repo (root). If another AGENTS.md appears deeper, that one overrides locally.

How to run
- Install: `npm install`
- Dev server: `npm run dev` → open the printed localhost URL.
- Reset data (optional): in DevTools console run `localStorage.removeItem('kr-tracker-state-v1')` and refresh.

Architecture (MVP)
- Frontend-only SPA: Vite + React + TypeScript
- State: Single React reducer stored in `src/state/store.tsx`, persisted to `localStorage` key `kr-tracker-state-v1`.
- Models: `src/models/types.ts` defines all domain types (Objectives, KRs, Teams, Initiatives, Periods, Baselines, etc.).
- Weeks: `src/utils/weeks.ts` generates Monday-start ISO week slices for a period. Internal keys use `YYYY-Www`.
- Metrics: `src/metrics/engine.ts` computes WoW deltas, 3‑week rolling averages, variance, pace (type-aware), forecast, and assigns a health color.
- UI: All components under `src/components` and `src/pages` (see “Key files”).

Key files
- `src/state/store.tsx` – app state, actions, persistence
- `src/models/types.ts` – domain types (Objective, KeyResult, Team, Initiative, PlanBaseline, etc.)
- `src/utils/weeks.ts` – ISO week generation and keys
- `src/metrics/engine.ts` – pure metric computations
- `src/components/PlanGrid.tsx` – plan entry grid; respects responsive week window
- `src/components/ActualsGrid.tsx` – actuals entry grid with multi‑cell paste
- `src/components/KrRowKpis.tsx` – per‑KR KPIs + sparkline
- `src/components/Sparkline.tsx` – tiny SVG chart for plan vs actual
- `src/components/InitiativesGrid.tsx` – initiatives tracker per KR
- `src/pages/Setup.tsx` – period, teams, objectives, and KR creation
- `src/App.tsx` – page composition (Setup, Plan, Actuals, Metrics, Initiatives)

Weeks & responsiveness
- Weeks are Monday‑start ISO weeks. `generateWeeks()` returns both `iso` (key) and `dateLabel` for display.
- Grids use a responsive “week window”: `useElementWidth` + `useWeekWindow` determine how many week columns fit; pager controls (Prev/Next/Latest) shift the visible window.
- Sticky first column (`.kr`) keeps the KR name visible while horizontally scrolling.
- When adding paste logic, always operate within `visibleWeeks` to avoid writing to off‑screen columns inadvertently.

Baselines and plans
- Plan entry happens in `PlanGrid`. Clicking “Lock Plan” freezes the current plan draft into a `PlanBaseline` and makes plan cells read‑only. Baselines are versioned and stored in `state.baselines` with `currentBaselineId` pointing to the active one.
- Metrics use the active baseline for plan values; if no baseline is locked, metrics should gracefully degrade.

Actuals & paste
- Actuals entry in `ActualsGrid`. Cells are disabled until a baseline exists.
- Paste behavior: anchor the focused cell; parsed TSV/CSV fills across columns and down rows, clipped to the visible week window. Sanitizes `, % $` and blanks; unparseable cells are ignored.

Metrics (engine) – summary
- Supported KR aggregation types: `cumulative`, `snapshot` (exit rate), `average` (rolling).
- Core fields per week: `deltaWoW`, `deltaWoWPct`, `rolling3`, `varianceWeekly`, type‑specific `paceToDatePct`, `forecastEOP`, and optional `health`.
- Pace rules in MVP:
  - cumulative: `cumulativeActual / cumulativePlan`
  - snapshot: last week’s `actual / plan` where both exist
  - average: `rollingActual(3) / rollingPlan(3)`
- Forecast rules in MVP:
  - cumulative: `cumActual + rolling3 * remainingWeeks`
  - snapshot/average: `rolling3` (fallback: last actual)

Initiatives tracker (current behavior)
- Data model: `Initiative { id, krId, name, impact, confidence (0–1), isPlaceholder }`.
- State: stored in `state.initiatives` with actions `ADD_INITIATIVE`, `UPDATE_INITIATIVE`, `DELETE_INITIATIVE`.
- UI: `InitiativesGrid` renders initiatives per KR. It computes a rough “coverage”:
  - For cumulative KRs: totalTarget = cumulativePlan(last) − cumulativePlan(first)
  - For snapshot/average KRs: totalTarget = plan(last) − plan(first)
  - Coverage = Σ(initiative.impact) / totalTarget (target guidance: ≥ 95%)
- Confidence: captured and editable but NOT yet used in downstream metrics or health. It is displayed for planning, but pacing/health/forecast are currently unadjusted.

Planned/possible future integration of confidence (guidance)
- Risk‑adjusted forecast/pacing per KR: multiply forecast or rolling rate by a weighted confidence factor derived from linked initiatives (e.g., Σ contribution% × confidence). Keep both raw and risk‑adjusted values visible.
- Rollups: objective/team rollups can weight KR/initiative impact by confidence.
- If implemented, surface the rules in this file and note constants and thresholds.

Conventions & tips
- TypeScript strict; prefer ESM imports everywhere (no `require` in React components).
- UI responsiveness relies on `useElementWidth` + `useWeekWindow` – if you add new grids, reuse these hooks.
- Weeks: always use ISO key (`YYYY-Www`) for persistence; continue to read legacy `startISO` keys where backward compatibility helps.
- When altering state shape, update `DEFAULT_STATE` and consider bumping the localStorage key if breaking.
- Keep visual polish minimal—this is an MVP; prioritize correctness and clarity.

Common pitfalls (seen here)
- Stray diff markers (leading `+`) in code will break Babel. Ensure patches don’t leave markers.
- Dynamic `require` in the browser (React/Vite) will fail; use ESM imports.
- Pasting into Actuals must be clipped to the visible week window; do not write outside it.

Testing & validation
- No formal tests yet. Validate by:
  - Locking a baseline → editing actuals → observing Metrics and Initiatives coverage
  - Refreshing page to confirm persistence
  - Resizing window and paging weeks

Contact points in code for agents
- Add new state/action: `src/state/store.tsx`
- Add domain type: `src/models/types.ts`
- New grid or responsive slice: `src/hooks/useElementWidth.ts`, `src/hooks/useWeekWindow.ts`
- Metric tweak: `src/metrics/engine.ts`
- Initiatives logic/UI: `src/components/InitiativesGrid.tsx`

