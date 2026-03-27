@echo off
echo ============================================
echo   HelpdeskAI -- NASSCOM Hackathon Startup
echo ============================================
echo.

REM Check if Python environment exists
if not exist "backend\venv" (
    echo [1/4] Creating Python virtual environment...
    python -m venv backend\venv
)

echo [2/4] Installing Python dependencies...
call backend\venv\Scripts\activate.bat
pip install -r backend\requirements.txt --quiet

echo [3/4] Generating synthetic dataset (1000 tickets)...
cd backend
python generate_data.py
cd ..

echo [4/4] Starting FastAPI backend...
start "FastAPI Backend" cmd /k "cd backend && venv\Scripts\activate && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo Backend starting at: http://localhost:8000
echo API Docs available at: http://localhost:8000/docs
echo.
echo Press any key to start the frontend...
pause

echo Starting React Frontend...
cd frontend
call npm install --silent
start "React Frontend" cmd /k "npm run dev"
cd ..

echo.
echo ============================================
echo   Both servers are starting!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo ============================================
