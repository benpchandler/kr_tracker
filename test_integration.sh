#!/bin/bash

echo "🧪 Testing Backend + Frontend Integration"
echo "========================================="

# Start backend
echo "1️⃣ Starting backend on port 3001..."
node server/index.cjs &
BACKEND_PID=$!
sleep 2

# Check if backend is running
if curl -s http://localhost:3001/api/state > /dev/null 2>&1; then
    echo "✅ Backend is running!"
else
    echo "❌ Backend failed to start"
    exit 1
fi

# Start frontend
echo "2️⃣ Starting frontend with Vite..."
npm run dev &
FRONTEND_PID=$!
sleep 5

# Test the proxy connection
echo "3️⃣ Testing proxy connection..."
if curl -s http://localhost:5173/api/state | grep -q "organizations"; then
    echo "✅ Proxy is working! Frontend can reach backend through /api"
else
    echo "❌ Proxy not working"
fi

echo ""
echo "🎉 Integration test complete!"
echo "Frontend: http://localhost:5173"
echo "Backend API: http://localhost:3001"
echo ""
echo "Press Ctrl+C to stop both servers"

# Keep running
wait