@echo off
REM 로컬 서버로 열기. Python 이 설치되어 있을 때만 됩니다.
REM file:// 로 충분하면 이 파일은 쓰지 않아도 됩니다.
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python 을 찾을 수 없습니다. index.html 을 그냥 더블클릭해서 여세요.
  pause
  exit /b 1
)
echo http://localhost:8000 을 브라우저에서 여세요. 종료하려면 Ctrl+C.
python -m http.server 8000
