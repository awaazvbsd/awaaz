@echo off
echo ========================================
echo  Voice Stress Analysis with Praat
echo ========================================
echo.

echo Starting Praat Backend Server...
start "Praat Backend" cmd /k "cd backend && python start.py"

echo.
echo Waiting for backend to initialize...
timeout /t 5 /nobreak > nul

echo.
echo Starting Frontend Development Server...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo  Application Started Successfully!
echo ========================================
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:5173
echo.
echo Press any key to close this window...
pause > nul






