@echo off
chcp 65001 >nul
REM 인터넷 없이 npm-cache 폴더에서 설치합니다.
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js 를 찾을 수 없습니다. Node 20.19 이상 또는 22.12 이상이 필요합니다.
  pause
  exit /b 1
)

node -e "const [a,b]=process.versions.node.split('.').map(Number);process.exit(a>=23||(a===22&&b>=12)||(a===20&&b>=19)?0:1)"
if errorlevel 1 (
  echo 지금 Node 버전으로는 Vite 8 이 돌지 않습니다.
  node -v
  echo Node 20.19 이상 또는 22.12 이상이 필요합니다. OFFLINE.md 의 "Node 버전이 낮을 때" 를 보세요.
  pause
  exit /b 1
)

echo 설치 중입니다. 인터넷에 접속하지 않습니다.
call npm ci --offline --no-audit --no-fund --cache "%~dp0npm-cache"
if errorlevel 1 (
  echo 설치에 실패했습니다. npm-cache 폴더가 통째로 들어왔는지 확인하세요.
  pause
  exit /b 1
)

echo.
echo 설치가 끝났습니다. 검사, 테스트, 빌드를 한 번 돌려 봅니다.
call npm run verify
pause
