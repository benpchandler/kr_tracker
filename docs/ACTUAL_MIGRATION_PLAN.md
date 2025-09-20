# Real Migration Plan (No BS Edition)

## What We Actually Need To Do

### Current Setup
- **Backend**: `server/index.cjs` - Express server with SQLite
- **Frontend**: React app in `/src`
- **Problem**: Need to integrate them without breaking anything

### Simple Migration Strategy

## Option 1: Run Backend as Subfolder (Safest)
```bash
# Just copy the backend into the project
cp -r server/* ./backend/

# Update package.json to run both
"scripts": {
  "dev": "concurrently \"npm run dev:client\" \"npm run dev:server\"",
  "dev:client": "vite",
  "dev:server": "node backend/index.cjs"
}
```

## Option 2: Direct Integration
1. Keep backend in `/server`
2. Update Vite proxy to point to Express
3. Test everything works
4. Deploy

## Actual Steps (30 minutes max)

### 1. Test Current Backend
```bash
cd server
node index.cjs
# Check if it runs on port 3001 or whatever
```

### 2. Copy Backend to New Location
```bash
mkdir -p backend
cp server/index.cjs backend/
cp server/*.sqlite* backend/
```

### 3. Update Frontend API Calls
```javascript
// In your React app, update API base URL
const API_BASE = import.meta.env.DEV
  ? 'http://localhost:3001'  // Development
  : '/api';                   // Production
```

### 4. Add Proxy to Vite Config
```javascript
// vite.config.ts
export default {
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  }
}
```

### 5. Test Everything
```bash
# Terminal 1
cd backend && node index.cjs

# Terminal 2
npm run dev

# Open browser, test that data loads
```

### 6. If Everything Works, Commit
```bash
git add -A
git commit -m "Backend integrated - it works!"
```

## What We're NOT Doing
- ❌ No 137 enterprise migration tasks
- ❌ No P0-P5 phases
- ❌ No "stakeholder alignment"
- ❌ No "feature flags post-GA"
- ❌ No 14-week timeline

## What We ARE Doing
- ✅ Copy backend file
- ✅ Point frontend at backend
- ✅ Test it works
- ✅ Ship it

## Total Time: ~30 minutes

Done. No drama.