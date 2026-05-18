@echo off
echo Starting Pet Clinic ERP Frontend...
cd /d "%~dp0frontend"
call npm install
echo.
echo Frontend starting at http://localhost:5173
echo.
call npm run dev
pause
