@echo off
echo Starting Pet Clinic ERP Backend...
cd /d "%~dp0backend"
pip install -r requirements.txt -q
echo.
echo Backend starting at http://localhost:8000
echo API Docs at      http://localhost:8000/docs
echo.
python -m uvicorn main:app --reload --port 8000
pause
