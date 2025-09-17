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
npm run dev:server      # Start Express backend server (experimental)
npm run dev:client      # Alternative: Start Vite dev server only

# Build & Preview
npm run build           # TypeScript check + Vite production build
npm run preview         # Preview production build locally

# Testing
npm run test            # Run Vitest tests
npm run test:unit       # Run unit tests once
npm run test:e2e        # Run Playwright E2E tests
npm run test:coverage   # Run tests with coverage report
npm run test:ui         # Open Vitest UI for interactive testing

# Code Quality
npm run lint            # ESLint with max-warnings=0
npm run checks          # Run all checks: lint + literal checks + unit tests

# Data Management (in browser console)
localStorage.removeItem('kr-tracker-state-v1')  # Reset all data
```

## Architecture

### State Management (`src/state/store.tsx`)
- **Pattern**: React useReducer with Context API for global state
- **Persistence**: Auto-saves to localStorage (`kr-tracker-state-v1`), with support for legacy key migration
- **Seeded data**: Includes sample organization (Merchant), 3 teams, 7 pods, individuals with roles/levels, objectives, and KRs with realistic targets
- **Actions**: All state mutations through typed actions:
  - Entity CRUD: `ADD_*`, `UPDATE_*`, `DELETE_*`
  - Bulk operations: `BULK_UPDATE_PLAN`, `BULK_UPDATE_ACTUALS`
  - Phase management: `LOCK_PLAN`, `UNLOCK_PLAN`
  - System: `SET_PERIOD`, `SET_FILTER`, `SET_THEME`

### Domain Model (`src/models/types.ts`)
```typescript
// Core entities
Period { startISO, endISO }
Organization { id, name }
Team { id, name, color }
Pod { id, teamId, name, memberIds, mission? }
Person { id, name, email?, function, level, managerId? } // Replaces Individual
Objective { id, name, podId?, teamIds?, periodId? }

// KR system
KeyResult { 
  id, name, unit, aggregation, status?
  objectiveId?, teamId?, podId?, driId?
  goalStart?, goalEnd?, currentValue?
  description?, sqlQuery?
}

// Supporting types
Initiative { id, krId, name, impact, confidence, isPlaceholder }
PlanBaseline { id, version, lockedAt, lockedBy, data }
WaterfallState { configs, scenarios } // For waterfall charts

// Enums
Aggregation: 'cumulative' | 'snapshot' | 'average'
Unit: 'count' | 'percent' | 'currency'
FunctionalArea: Engineering, Product, Analytics, Design, Operations, Strategy
PersonLevel: IC, Senior, Staff, Manager, Director, VP, Executive
```

### Week System (`src/utils/weeks.ts`)
- **ISO 8601 weeks**: Monday-start weeks, format `YYYY-Www` (e.g., `2025-W09`)
- **Core functions**:
  - `generateWeeks(startISO, endISO)`: Generate week array for period
  - `toISODate(date)`: Convert Date to `YYYY-MM-DD` format
  - `parseISO(isoDate)`: Parse ISO string to Date
  - `weekOf(dateISO)`: Get week info for a date
- **Responsive hooks**:
  - `useWeekWindow()`: Calculate visible weeks based on viewport width
  - `useElementWidth()`: Track element width for responsive calculations
- **Paging**: Prev/Next/Latest buttons navigate through week windows

### Grid Components & Responsive Design
- **PlanGrid** (`src/components/PlanGrid.tsx`): 
  - Enter weekly plan targets
  - Read-only after baseline lock
  - Supports bulk paste operations
  - Color-coded by team
  
- **ActualsGrid** (`src/components/ActualsGrid.tsx`): 
  - Enter actual values post-baseline
  - Multi-cell paste from Excel/Sheets (TSV/CSV parsing)
  - Sanitizes input (removes $, %, commas)
  - Anchors paste at focused cell
  
- **InitiativesGrid** (`src/components/InitiativesGrid.tsx`): 
  - Track initiatives per KR
  - Impact/confidence scoring
  - Coverage calculation vs KR target
  - Placeholder vs real initiatives

- **Responsive Design**:
  - `useElementWidth` + `useWeekWindow` for dynamic columns
  - Sticky first column (KR name)
  - Horizontal scroll with week paging
  - Minimum 320px week columns

### Metrics Engine (`src/metrics/engine.ts`)

**Aggregation Types**:
- **Cumulative**: Running totals (e.g., total revenue)
  - Pace = cumulative actual / cumulative plan
  - Forecast = current total + (rolling3 × remaining weeks)
  
- **Snapshot**: Point-in-time values (e.g., conversion rate)
  - Pace = latest actual / latest plan
  - Forecast = rolling3 or latest actual
  
- **Average**: Rolling averages (e.g., weekly tickets)
  - Pace = rolling actual avg / rolling plan avg
  - Forecast = rolling3 average

**Computed Metrics** (`KrWeekMetrics`):
- `deltaWoW`, `deltaWoWPct`: Week-over-week changes
- `rolling3`: 3-week rolling average of actuals
- `paceToDatePct`: Progress vs plan (aggregation-specific)
- `forecastEOP`: End-of-period projection
- `health`: green (≥99%), yellow (≥95%), red (<95%)
- `varianceWeekly`: Actual - Plan for the week

**Waterfall Analysis** (`src/metrics/waterfall.ts`):
- Decompose period-over-period changes
- Support for multiple scenarios and comparisons

### Phase System & Workflow

**Planning Phase** (Unlocked):
- Configure period, teams, pods, individuals
- Define objectives and KRs with targets
- Enter weekly plan values
- Set up initiatives with impact/confidence
- Import data via CSV (ImportWizard)

**Execution Phase** (Locked baseline):
- Plan becomes read-only baseline
- Enter weekly actuals
- Track metrics and health status
- Monitor initiative progress
- View waterfall analysis

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

## Code Quality & Standards

### ESLint Configuration
- **No magic numbers**: Use constants from `src/config.ts`
- **No duplicate strings**: Threshold of 3 occurrences triggers error
- **No raw literals**: URLs and storage keys must use config constants
- **Custom literal checker**: `scripts/check-literals.mjs` enforces literal usage
- **No console.log**: Only console.warn and console.error allowed

### Testing Setup
- **Vitest**: Unit testing with jsdom environment
- **Playwright**: E2E testing across Chrome, Firefox, Safari
- **Coverage**: Via `@vitest/coverage-v8`
- **Test utilities**: `tests/setup/vitest.setup.ts` provides timing helpers and console guards
- **Accessibility**: Axe-core integration for a11y testing

### Common Pitfalls to Avoid

1. **ESM-only imports**: Use ES6 imports, no `require()` in components
2. **Visible weeks boundary**: Always respect `visibleWeeks` from `useWeekWindow`
3. **State persistence**: Consider key versioning when changing state shape
4. **Baseline dependency**: Check `state.currentBaselineId` before allowing actuals
5. **Health thresholds**: Use `HEALTH_THRESHOLDS` from config, not hardcoded values
6. **URL literals**: Move all URLs to `src/config.ts`

## Key Implementation Patterns

### Multi-cell Paste (ActualsGrid)
```typescript
// Parse clipboard as TSV/CSV
// Anchor at focused cell position  
// Fill across columns (weeks) and down rows (KRs)
// Clip to visible week window bounds
// Sanitize: remove $, %, commas, trim whitespace
```

### State Update Pattern
```typescript
// Always use dispatch, never mutate
dispatch({ type: 'UPDATE_KR', id, updates })

// Bulk operations have dedicated actions
dispatch({ type: 'BULK_UPDATE_ACTUALS', updates: weeklyData })
```

### Week Navigation
```typescript
const { visibleWeeks, canPagePrev, canPageNext, pagePrev, pageNext, pageToLatest } = weekWindow
// Always operate within visibleWeeks bounds
```

## Project Structure

```
src/
├── components/       # UI components (grids, charts, forms)
├── hooks/           # Custom React hooks
├── lib/             # Utilities (import, test scenarios)
├── metrics/         # Metrics computation engine
├── models/          # TypeScript types and domain models
├── pages/           # Top-level page components
├── state/           # Global state management
└── utils/           # Helper functions (weeks, filtering)