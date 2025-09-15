# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KR Tracker - A single-page application for tracking Key Results (KRs) with weekly planning, actuals tracking, and metrics computation. Built as a frontend-only React + TypeScript + Vite app with localStorage persistence.

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Start Vite dev server (main command)
npm run dev:client      # Alternative: Start Vite dev server only
npm run dev:server      # Start Express backend server (experimental)

# Build
npm run build           # TypeScript check + Vite production build

# Preview production build
npm run preview

# Data Management (in browser console)
localStorage.removeItem('kr-tracker-state-v1')  # Reset all data
```

## Architecture

### State Management
- **Single source of truth**: All state in `src/state/store.tsx` using React useReducer pattern
- **Persistence**: Auto-saves to localStorage key `kr-tracker-state-v1`
- **Seeded data**: Store includes sample organization (Merchant), teams, pods, individuals, objectives, and KRs
- **Actions**: All state mutations through defined actions (ADD_*, UPDATE_*, DELETE_*, SET_*, LOCK_PLAN, etc.)

### Domain Model (`src/models/types.ts`)
```typescript
Period { startISO, endISO }
Organization { id, name }
Team { id, name, color }
Pod { id, teamId, name, memberIds }
Individual { id, name, email?, teamId, podId?, role, discipline? }
Objective { id, name, teamIds? }
KeyResult { id, name, unit, aggregation, objectiveId?, teamId?, podId?, driId? }
Initiative { id, krId, name, impact, confidence, isPlaceholder }
PlanBaseline { id, version, lockedAt, lockedBy, data }
```

### Week System
- **ISO 8601 weeks**: Monday-start weeks, format `YYYY-Www` (e.g., `2025-W09`)
- **Week generation**: `src/utils/weeks.ts` provides `generateWeeks()` for period slicing
- **Responsive window**: Grids show only weeks that fit viewport width via `useWeekWindow` hook
- **Paging**: Prev/Next/Latest buttons navigate through week windows

### Grid Components & Responsive Design
- **Plan Grid** (`PlanGrid.tsx`): Enter weekly targets; becomes read-only after locking baseline
- **Actuals Grid** (`ActualsGrid.tsx`): Enter actual values; supports multi-cell paste from spreadsheets
- **Initiatives Grid** (`InitiativesGrid.tsx`): Track initiatives per KR with impact/confidence
- **Responsive hooks**: `useElementWidth` + `useWeekWindow` calculate visible columns
- **Sticky columns**: First column (KR name) remains visible during horizontal scroll

### Metrics Engine (`src/metrics/engine.ts`)
Computes per-week metrics based on KR aggregation type:
- **Cumulative**: Running totals (e.g., total sales)
- **Snapshot**: Point-in-time values (e.g., conversion rate)
- **Average**: Rolling averages (e.g., weekly support tickets)

Computed fields:
- `deltaWoW`, `deltaWoWPct`: Week-over-week changes
- `rolling3`: 3-week rolling average
- `paceToDatePct`: Progress vs plan (type-specific calculation)
- `forecastEOP`: End-of-period forecast
- `health`: Color-coded health status

### Phase System
- **Planning phase**: Unlocked plans, editable setup
- **Execution phase**: Locked baseline, focus on actuals entry and metrics

## Key Implementation Patterns

### Multi-cell Paste (ActualsGrid)
```typescript
// Parse clipboard data as TSV/CSV
// Anchor at focused cell
// Fill across columns and down rows
// Clip to visible week window
// Sanitize input (remove $, %, commas)
```

### State Updates
```typescript
// Always dispatch actions, never mutate directly
dispatch({ type: 'UPDATE_KR', id: krId, updates: { name: newName } })

// Bulk operations use dedicated actions
dispatch({ type: 'BULK_UPDATE_ACTUALS', updates: weeklyData })
```

### Week Navigation
```typescript
// Use visibleWeeks from useWeekWindow hook
const { visibleWeeks, canPagePrev, canPageNext, pagePrev, pageNext, pageToLatest } = weekWindow

// Always operate within visibleWeeks bounds
visibleWeeks.forEach(week => {
  // Process only visible columns
})
```

## Common Pitfalls to Avoid

1. **ESM-only imports**: No `require()` in React components - use ES6 imports
2. **Visible weeks boundary**: When implementing grid features, always respect `visibleWeeks` bounds
3. **State persistence**: After state shape changes, consider localStorage key versioning
4. **Diff markers**: Remove any `+` or `-` diff markers from code before committing
5. **Baseline dependency**: Actuals entry requires locked baseline - check `state.currentBaselineId`

## Testing & Validation

Currently no automated tests. Manual validation process:
1. Create period, teams, objectives, and KRs in Setup
2. Enter plan values in Plan Builder
3. Lock plan to create baseline
4. Enter actuals and verify metrics computation
5. Test multi-cell paste in ActualsGrid
6. Verify localStorage persistence on page refresh
7. Test responsive week window by resizing browser

## Future Extensions (Not Yet Implemented)

- **Confidence integration**: Use initiative confidence scores in risk-adjusted forecasts
- **Team/Objective rollups**: Aggregate KR metrics to parent levels
- **Backend integration**: Express server scaffolding exists but not connected
- **Export functionality**: Generate reports from metrics data
- **Historical baselines**: View/compare multiple baseline versions