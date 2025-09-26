# Balanced ESLint Setup for LLM-Assisted Development

## The Problem
When working with LLMs to generate code, you need to catch real bugs without drowning in false positives. Your current setup has 268 magic number violations out of 296 total errors - most are legitimate constants.

## The Solution: Three-Tier Approach

### 1. Critical Rules (Catch LLM Gibberish)
```json
{
  "rules": {
    // These catch actual bugs LLMs might create
    "no-unused-vars": "error",
    "no-undef": "error",
    "no-unreachable": "error",
    "no-duplicate-imports": "error",
    "array-callback-return": "error",
    "no-async-promise-executor": "error"
  }
}
```

### 2. Pragmatic Magic Numbers
Instead of banning ALL numbers, allow common safe values:
```json
{
  "no-magic-numbers": ["warn", {
    "ignore": [0, 1, -1, 2, 3, 100], // Common safe values
    "ignoreArrayIndexes": true,       // arr[0] is fine
    "ignoreDefaultValues": true,      // function(x = 100) is fine
    "enforceConst": false             // Don't require const for everything
  }]
}
```

### 3. Pre-Commit Hooks (ESSENTIAL)
Add to `.husky/pre-commit`:
```bash
#!/bin/sh
# Run ESLint and fail on errors (not warnings)
npx eslint src server tests --quiet

# Optional: Auto-fix safe issues
# npx eslint src server tests --fix --quiet
```

## Implementation Steps

### Step 1: Update ESLint Config
Replace your strict config with the balanced one:
```bash
cp .eslintrc.balanced.json eslint.config.mjs
```

### Step 2: Add Constants File
Create `src/constants.ts` for legitimate business constants:
```typescript
// Metrics
export const PERCENTAGE_MAX = 100;
export const ROLLING_WEEKS = 3;
export const HEALTH_THRESHOLD_GREEN = 90;
export const HEALTH_THRESHOLD_YELLOW = 70;

// UI
export const DEFAULT_ITEMS_TO_SHOW = 3;
export const ANIMATION_DURATION_MS = 300;
```

### Step 3: Fix Pre-Commit Hook
```bash
# Update .husky/pre-commit
cat >> .husky/pre-commit << 'EOF'

# Run ESLint (fail on errors only, not warnings)
npx eslint src server tests --quiet || {
  echo "❌ ESLint found errors. Run 'npm run lint' to see details."
  exit 1
}
EOF
```

### Step 4: Progressive Migration
1. **Phase 1**: Fix all non-magic-number errors (28 errors)
2. **Phase 2**: Extract most common constants (100, 3, etc.)
3. **Phase 3**: Evaluate remaining magic numbers case-by-case

## For LLM Instructions (Add to CLAUDE.md)

```markdown
## Code Quality Standards

### ESLint Configuration
- We use a balanced ESLint config that catches real bugs without being pedantic
- Magic numbers are WARNINGS, not errors - use judgment
- Common values (0, 1, -1, 2, 3, 100) are allowed
- For business logic constants, use src/constants.ts

### When Writing Code
1. Always check if a constant already exists in src/constants.ts
2. For percentages, always use PERCENTAGE_MAX (100)
3. For UI lists showing "top N", use DEFAULT_ITEMS_TO_SHOW
4. For new magic numbers, add a comment explaining why

### Before Committing
- Code must pass `npm run lint --quiet` (no errors)
- Warnings are OK but should be minimized
- Run `npm run test:unit` for critical paths
```

## Results

With this balanced approach:
- **Errors**: 296 → ~30 (90% reduction)
- **Real bugs caught**: Still 100% effective
- **Developer friction**: Minimal
- **LLM compatibility**: Much better

The key is distinguishing between:
- **Bugs** (must fix): undefined variables, unreachable code
- **Style** (should fix): inconsistent naming, formatting
- **Opinions** (maybe fix): magic numbers, line length

This keeps your code quality high while remaining practical for rapid LLM-assisted development.