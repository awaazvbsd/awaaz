#!/bin/bash

echo "========================================"
echo " Voice Stress Analysis with Praat"
echo "========================================"
echo

echo "Starting Praat Backend Server..."
cd backend
python3 start.py &
BACKEND_PID=$!
cd ..

echo
echo "Waiting for backend to initialize..."
sleep 5

echo
echo "Starting Frontend Development Server..."
npm run dev &
FRONTEND_PID=$!

echo
echo "========================================"
echo " Application Started Successfully!"
echo "========================================"
echo
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:5173"
echo
echo "Press Ctrl+C to stop both servers..."

# Function to cleanup on exit
cleanup() {
    echo
    echo "Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup SIGINT SIGTERM

# Wait for user to stop
wait






