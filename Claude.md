# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

KR Tracker - A single-page application for tracking Key Results (KRs) with weekly planning, actuals tracking, and metrics computation. Built as a React + TypeScript + Vite frontend with optional Express/SQLite backend server.

## Commands

```bash
# Install dependencies
npm install

# Development
npm run dev              # Run both API server and Vite (with backend enabled)
npm run dev:client      # Run Vite only (frontend-only mode with localStorage)
npm run dev:server      # Run Express backend server only

# Build & Preview
npm run build           # TypeScript check + Vite production build
npm run preview         # Preview production build locally

# Testing
npm run test            # Run Vitest tests in watch mode
npm run test:unit       # Run unit tests once
npm run test:e2e        # Run Playwright E2E tests
npm run test:coverage   # Run tests with coverage report
npm run test:ui         # Open Vitest UI for interactive testing

# Code Quality
npm run lint            # ESLint check
npm run checks          # Run all checks: lint + literal checks + unit tests

# Database Sync (when using backend)
npm run data:export     # Export SQLite to JSON seeds
npm run data:import     # Import JSON seeds to SQLite
npm run data:check      # Validate and export if needed
```

## Architecture

### Dual-Mode Operation
- **Frontend-only mode** (`npm run dev:client`): Uses localStorage persistence
- **Full-stack mode** (`npm run dev`): Express backend with SQLite database
- Environment variable `VITE_USE_BACKEND` controls mode

### State Management (`src/state/store.tsx`)
- **Pattern**: React useReducer with Context API
- **Persistence**:
  - localStorage key: `kr-tracker-state-v1` (frontend-only mode)
  - SQLite database: `server/kr.sqlite` (backend mode)
- **Actions**: Typed reducers for all state mutations
- **Seeded data**: Sample organization, teams, pods, individuals, objectives, and KRs

### Database Synchronization (Backend Mode)
- **JSON as source of truth**: `server/seeds/json/` directory
- **Auto-sync**: SQLite changes export to JSON within 1-2 seconds
- **Git integration**: Pre-commit hook ensures JSON files are staged
- **Import on startup**: Server imports JSON seeds, overwriting SQLite

### Domain Model (`src/models/types.ts`)
```typescript
// Core entities
Period { startISO, endISO }
Organization { id, name }
Team { id, name, color }
Pod { id, teamId, name, memberIds, mission? }
Person { id, name, email?, function, level, managerId? }
Objective { id, name, podId?, teamIds?, periodId? }
KeyResult {
  id, name, unit, aggregation, status?
  objectiveId?, teamId?, podId?, driId?
  goalStart?, goalEnd?, currentValue?
}
Initiative { id, krId, name, impact, confidence, isPlaceholder }

// Aggregation types
'cumulative' | 'snapshot' | 'average'
```

### Week System (`src/utils/weeks.ts`)
- **ISO 8601 weeks**: Monday-start, format `YYYY-Www`
- **Responsive columns**: `useWeekWindow()` calculates visible weeks
- **Navigation**: Paging through week windows with Prev/Next/Latest

### Grid Components
- **PlanGrid**: Weekly plan target entry (locked after baseline)
- **ActualsGrid**: Actual values entry with multi-cell paste support
- **InitiativesGrid**: Initiative tracking with impact/confidence scoring

### Metrics Engine (`src/metrics/engine.ts`)
- **Health thresholds**: `DEFAULT_HEALTH_THRESHOLDS` (≥99% green, ≥95% yellow, <95% red)
- **Aggregation-specific calculations**: Different logic for cumulative/snapshot/average
- **Rolling averages**: 3-week rolling window for forecasting
- **Computed metrics**: pace, forecast, health status, week-over-week changes

## Key Implementation Patterns

### Multi-cell Paste (ActualsGrid)
- Parse clipboard as TSV/CSV format
- Anchor paste at focused cell position
- Sanitize input: remove $, %, commas
- Clip to visible week boundaries

### State Updates
```typescript
// Always use dispatch, never mutate
dispatch({ type: 'UPDATE_KR', id: krId, updates: { name: newName } })

// Bulk operations have dedicated actions
dispatch({ type: 'BULK_UPDATE_ACTUALS', updates: weeklyData })
```

### Week Navigation
```typescript
const { visibleWeeks, canPagePrev, canPageNext, pagePrev, pageNext } = weekWindow
// Always operate within visibleWeeks bounds
```

## Code Quality Standards

### ESLint Configuration
- **No console.log**: Only warn/error allowed
- **No magic numbers**: Extract to constants
- **No duplicate strings**: Max 2 occurrences
- **Custom literal checker**: `scripts/check-literals.mjs` enforces:
  - No raw URLs (move to config)
  - No hardcoded storage keys
  - No hardcoded health thresholds

### Testing Setup
- **Vitest**: Unit tests with jsdom, coverage via v8
- **Playwright**: E2E tests for Chrome/Firefox/Safari
- **Axe-core**: Accessibility testing integration
- **Test utilities**: `tests/setup/vitest.setup.ts` provides helpers

### Import Data Format
The ImportWizard (`src/components/ImportWizard.tsx`) accepts CSV data for:
- Organizations, Teams, Pods
- Individuals (with function/level/manager relationships)
- Objectives and Key Results
- Weekly plan values
- Initiatives with impact/confidence scores

## Common Pitfalls to Avoid

1. **Week boundaries**: Always respect `visibleWeeks` from `useWeekWindow`
2. **Baseline locking**: Check `state.currentBaselineId` before allowing actuals
3. **State persistence**: Update storage key version when changing state shape
4. **Health thresholds**: Import from `metrics/engine.ts`, don't hardcode
5. **Database sync**: Remember JSON seeds are source of truth in backend mode