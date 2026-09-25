@echo off
REM 현재 폴더를 조사합니다. 다른 폴더를 보려면 뒤에 경로를 붙이세요.
REM   run_inventory.bat C:\작업폴더
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python 을 찾을 수 없습니다. 사내 표준 Python 3.8 이상이 필요합니다.
  pause
  exit /b 1
)
if "%~1"=="" (
  python inventory.py --root .
) else (
  python inventory.py --root "%~1"
)
echo.
echo 내보내기 전에 inventory_out\inventory.md 를 직접 열어서 확인하세요.
pause
