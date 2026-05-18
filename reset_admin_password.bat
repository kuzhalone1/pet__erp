@echo off
echo =====================================================
echo  Pet Clinic ERP -- Reset Admin Password
echo =====================================================
echo.
cd /d "%~dp0backend"
python reset_admin.py
echo.
pause
