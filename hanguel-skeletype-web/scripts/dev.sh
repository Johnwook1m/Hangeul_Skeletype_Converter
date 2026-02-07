#!/bin/bash
# Development server startup script
# Runs both backend and frontend concurrently

cd "$(dirname "$0")/.."

echo "Starting Hanguel Skeletype Web..."
echo ""

# Start backend
echo "🚀 Starting backend (port 8000)..."
cd backend
source ../venv/bin/activate
python -m uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 2

# Start frontend
echo "🚀 Starting frontend (port 5173)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers started!"
echo "   Backend:  http://localhost:8000"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers."

# Handle shutdown
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

# Wait for processes
wait
