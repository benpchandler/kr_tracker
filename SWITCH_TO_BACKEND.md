# How to Switch from LocalStorage to Backend

## The Current Situation
- The app loads from localStorage first
- Then it tries to fetch from `/api/state`
- If localStorage has data, you'll see that instead of backend data

## To Use Backend Data

### Option 1: Clear LocalStorage (Quick Test)
1. Open browser console at http://localhost:5173
2. Run: `localStorage.clear()`
3. Refresh the page
4. Now it should load from the backend API

### Option 2: Force Backend Mode (Permanent)
Edit `src/state/store.tsx` line 592:

```typescript
// Change from:
export function loadState(): AppState {
  const cleanRequested = isCleanRequested()
  try {
    // ... localStorage loading code
  }

// To:
export function loadState(): AppState {
  // Always start with clean state, let API hydrate
  return createCleanState()
}
```

### Option 3: Add Backend-First Flag
Add this to `src/state/store.tsx` at line 1169:

```typescript
// Add before the useEffect
const USE_BACKEND = true; // Toggle this

React.useEffect(() => {
  (async () => {
    try {
      const res = await fetch('/api/state')
      if (res.ok) {
        const full = await res.json()
        dispatch({ type: 'HYDRATE', full })

        // Clear localStorage if using backend
        if (USE_BACKEND) {
          localStorage.clear()
        }
      }
    } catch {}
  })()
}, [])
```

## Testing Steps
1. Start both servers:
   ```bash
   ./START_APP.sh
   ```

2. Clear localStorage in browser console:
   ```javascript
   localStorage.clear()
   ```

3. Refresh the page

4. You should now see:
   - Data loaded from SQLite backend
   - Changes persist to database, not localStorage
   - API calls for all operations

## How to Verify It's Working
Open browser DevTools Network tab and look for:
- `/api/state` - Initial load
- `/api/team` - When adding teams
- `/api/kr` - When adding KRs
- `/api/plan` - When updating plans
- `/api/actual` - When updating actuals

All these should return 200 OK and the data should persist across refreshes.