#!/bin/bash

echo "🚀 Starting KR Tracker Application"
echo "=================================="
echo ""

# Kill any existing instances
pkill -f "node server/index.cjs" 2>/dev/null
pkill -f "vite" 2>/dev/null

# Start backend
echo "📦 Starting backend server on port 3001..."
node server/index.cjs &
BACKEND_PID=$!

# Wait for backend
sleep 2

# Start frontend
echo "🎨 Starting frontend on port 5173..."
npm run dev &
FRONTEND_PID=$!

# Wait for frontend
sleep 3

echo ""
echo "✅ Application is running!"
echo ""
echo "🌐 Frontend: http://localhost:5173"
echo "🔧 Backend API: http://localhost:3001/api/state"
echo ""
echo "The frontend proxies /api/* requests to the backend automatically."
echo ""
echo "Press Ctrl+C to stop both servers"

# Handle cleanup on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; pkill -f 'node server/index.cjs' 2>/dev/null; pkill -f vite 2>/dev/null" EXIT

# Keep running
wait