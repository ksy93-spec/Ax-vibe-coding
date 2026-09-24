@echo off
REM input 폴더의 파일을 모아 output 폴더에 보고서를 만듭니다.
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo 먼저 install.bat 을 실행하세요.
  pause
  exit /b 1
)
if not exist input mkdir input
.venv\Scripts\python src\main.py %*
pause
