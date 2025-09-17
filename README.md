KR Tracker MVP

What’s here
- React + Vite + TypeScript single-page app
- Static entry template in `public/index.html`
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
- Data persists to localStorage under key `kr-tracker-state-v1`
- Weeks are Monday-start ISO weeks. Internal keys use `YYYY-Www` (e.g., `2025-W09`).
- Grid headers show both the ISO week and date range (e.g., `2025-W09` and `Mar 03–Mar 09`).
- After lock, plan inputs are read-only (baseline view).
- Next steps: Actuals entry grid + metrics (WoW deltas, rolling trends, pacing vs plan)
