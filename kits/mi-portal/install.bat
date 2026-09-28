@echo off
chcp 65001 >nul
REM 인터넷 없이 vendor 폴더의 패키지로 설치합니다.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 를 찾을 수 없습니다. Node 20.19 이상 또는 22.12 이상이 필요합니다.
  pause
  exit /b 1
)

REM vendor 폴더의 패키지로 설치합니다. Node 버전 확인도 이 스크립트가 합니다.
node tools\install-offline.cjs
if errorlevel 1 (
  echo 설치에 실패했습니다. 위 메시지를 확인하세요. vendor 폴더가 통째로 들어왔는지도 보세요.
  pause
  exit /b 1
)

echo.
echo 설치가 끝났습니다. 검사, 테스트, 빌드를 한 번 돌려 봅니다.
call npm run verify
pause
