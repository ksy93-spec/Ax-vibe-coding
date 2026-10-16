@echo off
chcp 65001 >nul
REM exe 를 만듭니다. 인터넷에 접속하지 않습니다 (vendor 폴더의 휠만 씀).
REM 결과: dist\rfx-volume\rfx-volume.exe  (이 폴더를 통째로 서버 PC 에 두고 exe 를 실행)
cd /d "%~dp0"

where python >nul 2>nul
if errorlevel 1 (
  echo Python 을 찾을 수 없습니다. exe 를 만들려면 Python 3.10 ~ 3.14 가 필요합니다.
  pause
  exit /b 1
)

if not exist .venv-build\Scripts\python.exe (
  echo 빌드용 가상환경을 만듭니다...
  python -m venv .venv-build
  if errorlevel 1 goto fail
  echo vendor 폴더의 휠로 PyInstaller 를 설치합니다...
  .venv-build\Scripts\python -m pip install --no-index --find-links vendor --require-hashes -r requirements-build.txt
  if errorlevel 1 goto fail
)

echo 자체 점검...
.venv-build\Scripts\python -m unittest discover -s tests
if errorlevel 1 goto fail

echo exe 를 만듭니다...
.venv-build\Scripts\python -m PyInstaller --noconfirm --clean --onedir --console --name rfx-volume main.py
if errorlevel 1 goto fail

echo 화면, 설정, 데이터 파일을 exe 옆에 복사합니다...
xcopy web dist\rfx-volume\web\ /E /I /Y /Q >nul
xcopy config dist\rfx-volume\config\ /E /I /Y /Q >nul
if not exist dist\rfx-volume\data mkdir dist\rfx-volume\data
copy /Y data\*.xlsx dist\rfx-volume\data\ >nul
copy /Y VERSION dist\rfx-volume\ >nul

echo.
echo 완료: dist\rfx-volume\rfx-volume.exe
echo dist\rfx-volume 폴더를 통째로 서버 PC 에 두고 exe 를 실행하세요.
pause
exit /b 0

:fail
echo.
echo 실패했습니다. 위의 메시지를 확인하세요.
pause
exit /b 1
