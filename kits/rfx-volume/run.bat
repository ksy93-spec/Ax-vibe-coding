@echo off
chcp 65001 >nul
REM 차량 물동 적정성 평가 서버를 켭니다. 설치 단계가 없습니다 (Python 표준 라이브러리만 씀).
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo Python 을 찾을 수 없습니다. Python 3.8 이상을 설치하거나, build-exe.bat 로 만든 exe 를 쓰세요.
  pause
  exit /b 1
)
python main.py %*
pause
