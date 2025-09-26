# Backend/Mock Data Handling

## Overview

The KR Tracker now has improved backend/mock data handling with clear failure indicators and opt-in mock data mode.

## Configuration

Set these environment variables in your `.env` file:

```bash
# Enable backend mode (true) or frontend-only mode (false)
VITE_USE_BACKEND=true

# Allow switching to mock data in development (only works when VITE_USE_BACKEND=true)
VITE_ALLOW_MOCK_FALLBACK=false
```

## Features

### 1. Backend Status Banner
- **Red banner** when using mock data - clearly indicates "Mock Data Mode"
- **Yellow banner** when backend is unreachable - shows error with retry button
- **Red banner** when backend connects but data fails - shows specific error

### 2. Health Indicator
Shows real-time connection and data status in top-right corner:
- **Green** - Backend connected, data loaded
- **Red** - Backend disconnected or data unavailable
- **Yellow** - Checking connection or loading data
- **Red (Mock)** - Using mock data

### 3. Data Source Tracking
The app tracks where data came from:
- Persisted state includes `source: 'backend' | 'mock'`
- Mock data is rejected when backend mode is enabled
- Prevents accidentally using stale mock data

### 4. Dev Mode Toggle (Development Only)
When `VITE_ALLOW_MOCK_FALLBACK=true` in development:
- Shows toggle button to switch between backend and mock data
- Useful for testing without backend server

## User Experience

### When Backend Fails (VITE_USE_BACKEND=true)

1. **Without mock fallback** (VITE_ALLOW_MOCK_FALLBACK=false):
   - Shows prominent error banner
   - Keeps any existing in-memory state
   - Provides retry button
   - Does NOT load mock data

2. **With mock fallback** (VITE_ALLOW_MOCK_FALLBACK=true):
   - Falls back to mock data automatically
   - Shows red "Mock Data Mode" banner
   - Allows manual switching in dev mode

### When Using Frontend-Only Mode (VITE_USE_BACKEND=false)
- Always uses mock data
- Shows red "Mock Data Mode" banner
- No backend connection attempts

## Testing

Run the backend state tests:
```bash
npm run test:unit -- tests/unit/backend-state.test.ts
```

## Implementation Details

### Key Components
- `BackendStatusBanner` - Displays error and mock mode warnings
- `BackendHealthIndicator` - Shows connection/data status
- `DevModeToggle` - Development-only toggle for data source

### State Management
- `DataSource` type tracks data origin
- `persistState()` includes source information
- `loadPersistedState()` validates source on load

### Retry Logic
- Manual retry via banner button
- Checks health endpoint first
- Then attempts to fetch state
- Updates all status indicators