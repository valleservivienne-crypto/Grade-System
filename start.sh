#!/bin/bash

echo ""
echo "╔════════════════════════════════════════╗"
echo "║  🎓 GradeTrack - Academic Grade System ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install from https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js v16+ required. Current: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"
echo ""

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install --silent
if [ $? -ne 0 ]; then
    echo "❌ Backend install failed"
    exit 1
fi
echo "✅ Backend ready"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install --silent
if [ $? -ne 0 ]; then
    echo "❌ Frontend install failed"
    exit 1
fi
echo "✅ Frontend ready"

cd ..

echo ""
echo "🚀 Starting servers..."
echo ""

# Start backend in background
cd backend
node server.js &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID) → http://localhost:5000"

cd ../frontend

# Give backend a moment to initialize
sleep 2

echo "✅ Starting frontend → http://localhost:3000"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  App will open at: http://localhost:3000"
echo "  Press Ctrl+C to stop both servers"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Trap Ctrl+C to kill both processes
trap "echo ''; echo 'Shutting down...'; kill $BACKEND_PID 2>/dev/null; exit 0" INT

npm start

# Cleanup on exit
kill $BACKEND_PID 2>/dev/null
