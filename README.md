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

Database Synchronization

This application uses an automatic database synchronization system that keeps your data in sync across multiple development machines using JSON seed files.

## How It Works

**JSON as Source of Truth**: Your database data is stored in JSON files under `server/seeds/json/` which are committed to Git. The SQLite database itself is gitignored and recreated from JSON on each server startup.

**Automatic Sync Lifecycle**:
1. **Server Start**: Imports JSON seeds into SQLite, overwriting any existing data
2. **During Development**: Database changes are automatically exported to JSON within 1-2 seconds
3. **Git Commit**: Pre-commit hook ensures JSON files are up-to-date and stages them
4. **Other Machines**: `git pull` fetches JSON changes, next server start imports them

## Key Features

- **Zero Manual Work**: Sync happens completely automatically
- **Real-time Export**: Changes are detected via SQLite triggers and exported within seconds
- **Dynamic Table Detection**: System automatically discovers new tables and creates sync triggers
- **Dependency-Safe**: Import/export respects foreign key constraints via ordered table processing
- **Git-Friendly**: JSON files show readable diffs and merge cleanly

## File Structure

```
server/seeds/json/
├── _meta.json          # Export metadata and row counts
├── organizations.json  # Organizations table data
├── teams.json         # Teams table data  
├── pods.json          # Pods table data
├── individuals.json   # Individuals table data
├── krs.json          # Key results data
└── ... (one file per database table)
```

## Schema Changes

When you add new tables to the database:

1. **Automatic Detection**: System discovers new tables on server startup
2. **Warning Message**: Console warns about tables not in the known dependency order
3. **Safe Placement**: New tables are added at the end of the import order (safest for dependencies)
4. **Full Sync**: New tables are automatically included in exports and imports

**Recommended**: If your new table has foreign key dependencies, update the `STATIC_TABLE_ORDER` array in `server/dataSync.cjs` to ensure proper import ordering.

## Manual Commands

Normally you won't need these, but they're available if needed:

```bash
# Export current database to JSON
npm run data:export

# Import JSON to database (overwrites existing data)
npm run data:import

# Validate schema and export if needed
npm run data:check

# Validate database schema
node scripts/validate-schema.cjs
```

## Troubleshooting

**Data not syncing between machines?**
- Ensure you've committed and pushed the JSON seed files
- Check that the other machine has pulled the latest changes
- Restart the server to trigger fresh import

**New table not being monitored?**
- Check console for "New tables detected" warning on server startup
- System will sync the table but triggers may take a restart to install
- Consider adding the table to `STATIC_TABLE_ORDER` if it has dependencies

**Pre-commit hook failing?**
- Run `npm run data:check` manually to see the error
- Ensure database file exists and is accessible
- Check that better-sqlite3 dependencies are installed

Debugging & observability
- A global error boundary now wraps the app root, reporting uncaught render errors and exposing a reset action. In development it
  prints error details and stack traces while buffering structured entries in `window.__KR_TRACKER_LOGS__`.
- Use the shared `logger` helper from `src/utils/logger.ts` for structured console + in-memory logging. In production it limits
  output to warnings/errors while still capturing entries for future telemetry sinks.
- App state dispatches are instrumented when `VITE_DEBUG_STORE=true` (or automatically in development). Recent actions and the
  keys they touched are available on `window.__KR_TRACKER_ACTIONS__`.
- Persistence sanitization emits diagnostics accessible through `window.__KR_TRACKER_HYDRATION__`; the hydration routine also
  surfaces warning summaries in the console to highlight malformed saved data.
