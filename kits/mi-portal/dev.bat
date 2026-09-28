@echo off
chcp 65001 >nul
REM 개발 서버. 코드를 고치면 브라우저가 바로 갱신됩니다. 종료는 Ctrl+C.
cd /d "%~dp0"
call npm run dev
