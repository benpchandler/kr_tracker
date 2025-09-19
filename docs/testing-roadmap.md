# KR Tracker Testing Roadmap

_Status: draft. Updated after guardrail scaffolding landed._

## Visible Week Contract
- `useWeekWindow` already returns `{ visibleWeeks, prev, next, toLatest, rangeLabel }` and calculates responsive column counts.
- Current grids (`PlanGrid`, `ActualsGrid`) render all weeks and manually scroll. Tests should target the hook contract so UI refactors can adopt it without breaking expectations.
- Action items:
  - [ ] Add a lightweight wrapper utility in tests to render the hook with deterministic `width` and assert window slicing + navigation helpers.
  - [ ] Component tests will mount grids with a mocked `useWeekWindow` return to assert clipping, navigation buttons, and scroll behaviour.
  - [ ] Longer-term follow-up: refactor grids to call the hook directly (tracked separately; tests will already enforce the window semantics).

## Phase Plan Overview

### Phase A – Pure Logic (vitest)
Focus: `src/metrics/engine.ts`, `src/utils/weeks.ts`, supporting number formatting.
- [ ] Table-driven metrics tests per aggregation type (cumulative/snapshot/average) verifying pace, forecast, and health thresholds (99/95 bands, inverted for decreasing goals).
- [ ] Property tests (fast-check) ensuring `summarizeMetrics` outputs bounded percentages (`0 ≤ pace ≤ 5`, no `NaN`), and `generateWeeks` caps at 200 entries, handles week 53 + cross-year transitions in UTC.
- [ ] Tests for formatter helpers (`formatNumeric`) covering thousand separators, fallback display, 1-decimal rounding (half-up), negative values.
- [ ] Legacy baseline absence: ensure `computeMetrics` returns empty map when baseline missing; `summarizeMetrics` degrades gracefully (undefined fields).
- [ ] Edge cases: rolling window length < 3, mixed undefined values, division by zero protection.

### Phase B – State & Reducer
Focus: `src/state/store.tsx`.
- [ ] Deep-freeze default state and assert reducer immutability across transitions (LOCK_PLAN, UPDATE_ACTUALS/PASTE_ACTUALS, UPDATE_INITIATIVE_WEEKLY).
- [ ] Migration helpers: `parseGoalsFromName`, `stripGoalsFromName`, `coalesceState` (legacy keys, missing arrays, goal backfill, malformed storage JSON).
- [ ] Persistence/logging: spy on logger (to add) or console error stub to ensure unexpected inputs trigger explicit logs (no silent drops).
- [ ] Storage key migrations: ensure legacy keys seeded via `LEGACY_STORAGE_KEYS` promote to v3 without data loss.
- [ ] Negative paths: invalid paste payload, missing KR ids—state remains stable, log emitted.

### Phase C – Component Interaction (Testing Library + axe)
Focus components: `PlanGrid`, `ActualsGrid`, `KrRowKpis`, `InitiativesGrid`, `Setup` flows.
- [ ] Grid editing: assert inputs disabled when plan locked (PlanGrid), always editable for actuals, highlight reporting week, numeric formatting display (1 decimal + thousands).
- [x] Paste behaviour: anchor selection, TSV/CSV sanitization (blank cells, currency/percent stripping), clipping to visible window (mocked hook), meta recency chips.
- [x] KPIs: `KrRowKpis` derives pace/variance from summarized metrics; sparkline lengths match visible weeks and expose labelled badges/axe assertions.
- [x] Initiatives coverage: 95% threshold hints use shared config; weekly save updates meta (timestamp/byline) and preserves focus.
- [x] Setup data management: import/export/reset flows covered at unit level (confirm sequences, FileReader failure path, storage clearing).
- [~] Accessibility: role/label checks + axe smoke now in place for grids/KPIs; keyboard nav + focus persistence still TODO.

### Phase D – End-to-End (Playwright)
Critical journeys with `tests/e2e/fixtures.ts` guardrails.
- [~] Flow 1: seed plan → lock baseline → paste/edit actuals → verify KPI badges → reload (**persistence covered; lock banner still TODO via UI once baseline gating refactored**).
- [x] Flow 2: window navigation/resizing (set viewport widths) → attempt out-of-window edits/pastes to confirm clipping.
- [ ] Flow 3: missing baseline scenario → metrics degrade gracefully, prompt to lock plan, no console errors (tracked as Playwright `fixme`).
- [ ] Import/Export/Reset: load malformed JSON, ensure error surfaced and state intact; reset clears storage and reloads default baseline (Playwright `fixme` until Setup tab reliably exposed).
- [x] Performance guardrail: measure keypress→cell update latency for moderate KR×weeks, assert P95 < 100ms (via navigation timing for now; finer-grained instrumentation pending).
- [~] Cross-browser matrix (Chromium/WebKit/Firefox) executed nightly; Chromium/Firefox green, WebKit baseline flow skipped pending input locator fix; traces/screenshots retained for triage.

## Tooling & Commands
- `npm run lint` → ESLint with guardrails.
- `node scripts/check-literals.mjs` → literal audit (invoked via `npm run checks`).
- `npm run test:unit` → Vitest suites (Phase A/B/C).
- `npm run test:e2e` → Playwright suites (Phase D). Configure `PLAYWRIGHT_BASE_URL` when running against preview server.

## Risk Register
- **Missing dependencies**: ensure `npm install` executed locally; otherwise `vitest` binary missing.
- **macOS Xcode license**: `git status` blocked until `sudo xcodebuild -license` accepted (developer action).
- **Windowing refactor coupling**: Until grids adopt `useWeekWindow`, tests rely on mocked contract; coordinate with UI refactor owner.
- **I/O heavy Playwright flows**: consider test data reset per test to avoid localStorage bleed; `beforeEach` should clear keys via `STORAGE_KEY`/legacy list.

## Reporting Cadence
- `npm run checks` before every PR.
- Nightly CI: run full unit + Playwright cross-browser matrix, upload HTML report and literal-scan log.
- Mutation testing (Stryker) optional follow-up once baseline coverage in place.
