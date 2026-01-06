@echo off
echo Starting Voice Stress Analysis Backend...
echo =====================================

cd backend
echo Installing dependencies...
pip install -r requirements.txt

echo.
echo Starting Flask server on port 8000...
echo Backend will be available at: http://localhost:8000
echo API endpoint: http://localhost:8000/extract_features
echo.
echo Press Ctrl+C to stop the server
echo.

python app.py
