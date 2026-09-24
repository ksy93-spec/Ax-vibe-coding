@echo off
REM 오프라인 설치. 인터넷에 접속하지 않습니다.
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python 을 찾을 수 없습니다. 사내 표준 Python 3.8 이상을 먼저 설치하세요.
  pause
  exit /b 1
)

echo 가상환경을 만듭니다...
python -m venv .venv
if errorlevel 1 (
  echo 가상환경 생성에 실패했습니다. python -m venv 가 되는지 확인하세요.
  pause
  exit /b 1
)

echo vendor 폴더의 휠로 설치합니다...
.venv\Scripts\python -m pip install --no-index --find-links vendor -r requirements.txt
if errorlevel 1 (
  echo 설치에 실패했습니다. vendor 폴더에 whl 파일 2개가 있는지 확인하세요.
  pause
  exit /b 1
)

echo.
echo 설치가 끝났습니다. 자체 점검을 실행합니다.
.venv\Scripts\python src\test_ktable.py
pause
