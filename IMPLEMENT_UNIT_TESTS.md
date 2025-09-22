# Agent Prompt: Implement Phase A Unit Tests for KR Tracker

## Context
This is Phase A of the testing roadmap for KR Tracker - implementing table-driven unit tests for core business logic in the metrics engine and week utilities. The project currently has zero unit tests but comprehensive testing infrastructure is already configured.

## Your Mission
Implement comprehensive, table-driven unit tests for:
1. **Metrics Engine** (`src/metrics/engine.ts`) - Core KR calculations
2. **Week Utilities** (`src/utils/weeks.ts`) - ISO week handling

## Pre-Implementation Steps

### 1. Discovery & API Alignment
- **Review** `src/metrics/engine.ts` and `src/utils/weeks.ts` to confirm exported functions and their contracts
- **Check** for any decreasing-goal logic or inverted health thresholds 
- **Verify** health threshold representation (0.99 vs 99 - current code shows 99/95)
- **Read** `docs/AGENTS.md` and `WARP.md` for coding conventions

**Key Functions to Test:**
- `engine.ts`: `determineHealth`, `calculatePaceToDate`, `calculateForecast`, `calculateWoWChange`, `calculateRolling3`, `computeMetrics`, `DEFAULT_HEALTH_THRESHOLDS`
- `weeks.ts`: `generateWeeks`, `weekOf`, `toISODate`, `parseISO` (if they exist)

### 2. Setup Testing Tools
```bash
npm install -D fast-check  # For property-based testing
npm run test:unit          # Verify Vitest runs (currently finds no tests)
```

## Implementation Plan

### 1. Create Test Files
Create these new files:
- `src/metrics/engine.test.ts`
- `src/utils/weeks.test.ts`

**Coding Standards:**
- ES module imports only (no `require`)
- TypeScript strict mode
- 2-space indentation
- Descriptive test names

### 2. Test Structure Pattern

Use this table-driven testing pattern:

```typescript
import { describe, test, expect } from 'vitest'

type TestCase<T> = {
  name: string
  input: T
  expected: any
}

describe('functionName', () => {
  const testCases: TestCase<InputType>[] = [
    { name: 'descriptive case', input: {...}, expected: ... },
    // more cases
  ]

  test.each(testCases)('$name', ({ input, expected }) => {
    const result = functionName(input)
    expect(result).toBe(expected) // or toBeCloseTo for floats
  })
})
```

### 3. Priority Test Suites

#### A. Health Determination (`determineHealth`)
```typescript
const healthCases = [
  { name: 'perfect performance (100%)', pct: 100, expected: 'green' },
  { name: 'at green threshold (99%)', pct: 99, expected: 'green' },
  { name: 'just below green (98.9%)', pct: 98.9, expected: 'yellow' },
  { name: 'at yellow threshold (95%)', pct: 95, expected: 'yellow' },
  { name: 'just below yellow (94.9%)', pct: 94.9, expected: 'red' },
  { name: 'significantly under (50%)', pct: 50, expected: 'red' },
  { name: 'no progress (0%)', pct: 0, expected: 'red' },
  // Test edge cases and above 100%
]
```

#### B. Pace Calculation by Aggregation Type (`calculatePaceToDate`)
**Critical:** Test all three aggregation types with table-driven approach:

```typescript
const paceTestCases = [
  {
    name: 'cumulative: perfect pace',
    aggregation: 'cumulative',
    weekIndex: 2,
    baseline: { data: { 'kr-1': { '2025-W01': 100, '2025-W02': 100, '2025-W03': 100 } } },
    actuals: { 'kr-1': { '2025-W01': 100, '2025-W02': 100, '2025-W03': 100 } },
    expected: 100 // (300/300) * 100
  },
  {
    name: 'snapshot: uses only current week',
    aggregation: 'snapshot',
    weekIndex: 2,
    baseline: { data: { 'kr-1': { '2025-W01': 100, '2025-W02': 100, '2025-W03': 50 } } },
    actuals: { 'kr-1': { '2025-W01': 200, '2025-W02': 200, '2025-W03': 60 } },
    expected: 120 // only week 3: (60/50) * 100
  },
  // Add average aggregation cases, zero division guards, missing data
]
```

#### C. Week Generation (`generateWeeks`)
```typescript
const weekGenCases = [
  {
    name: 'simple 3-week range',
    startISO: '2025-01-06', // Monday
    endISO: '2025-01-20',   // Monday 2 weeks later
    expected: ['2025-W02', '2025-W03', '2025-W04']
  },
  {
    name: 'cross-year transition',
    startISO: '2024-12-30', // Week 1 of 2025 starts here
    endISO: '2025-01-13',
    expected: ['2025-W01', '2025-W02', '2025-W03']
  },
  // Test Week 53 years (2015, 2020, etc.)
]
```

### 4. Advanced Testing Requirements

#### Property-Based Testing (fast-check)
Add these property tests to catch edge cases:

```typescript
import fc from 'fast-check'

test('paceToDatePct is always finite and bounded', () => {
  fc.assert(fc.property(
    fc.record({
      plan: fc.float({ min: 0, max: 1000 }),
      actual: fc.float({ min: 0, max: 1000 })
    }),
    ({ plan, actual }) => {
      const pct = plan !== 0 ? (actual / plan) * 100 : 0
      expect(Number.isFinite(pct)).toBe(true)
      expect(pct).toBeGreaterThanOrEqual(0)
      expect(pct).toBeLessThan(500) // reasonable upper bound
    }
  ))
})
```

#### Error/Edge Cases to Test:
- Division by zero (plan = 0)
- Missing/undefined data in actuals
- Empty week arrays
- Rolling average with < 3 data points
- Week generation with invalid dates
- Boundary conditions (exactly at thresholds)

### 5. Quality Assurance Steps

After implementation:
```bash
npm run test:unit          # All tests should pass
npm run test:coverage      # Verify coverage of tested functions
npm run checks            # Lint + literal checks + tests
```

### 6. Success Criteria

**Your tests should:**
- ✅ Cover all exported functions from engine.ts and weeks.ts
- ✅ Use table-driven patterns for readability and maintainability  
- ✅ Include property-based tests for critical numeric calculations
- ✅ Handle edge cases (division by zero, missing data, boundary conditions)
- ✅ Have descriptive test names that serve as documentation
- ✅ Run deterministically (no time/date dependencies)
- ✅ Follow repo conventions (2-space, ESM imports, TypeScript)

### 7. Commit Guidelines
```bash
# Use work identity as specified in rules
git config user.name "benpchandlerDD"
git config user.email "ben.chandler@doordash.com"

# Commit message following conventional commits
git commit -m "test(metrics,weeks): Phase A table-driven + property tests for engine and ISO weeks"
```

## Expected Outcome
After completing this work, the KR Tracker will have:
- Solid foundation for refactoring core business logic
- Safety net for future UI/architecture changes  
- Clear documentation of expected behavior via tests
- Foundation for Phase B (state management) and Phase C (component) testing

This establishes the testing foundation needed before tackling the failing E2E tests or implementing new features.