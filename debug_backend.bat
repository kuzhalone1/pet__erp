@echo off
echo ==========================================
echo   Pet Clinic ERP - Backend Debug Tool
echo ==========================================
echo.

echo [1/3] Clearing pip cache to fix deserialization warnings...
pip cache purge
echo.

echo [2/3] Re-installing dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt
echo.

echo [3/3] Checking Database Connection...
python check_db.py
echo.

echo ==========================================
echo If the connection test above failed:
echo 1. Ensure PostgreSQL is installed and running.
echo 2. Run 'psql -U postgres' and then 'CREATE DATABASE pet_erp;'
echo 3. Run 'psql -U postgres -d pet_erp -f ../database/init.sql'
echo 4. Check your .env file password.
echo ==========================================
pause
