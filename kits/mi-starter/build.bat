@echo off
chcp 65001 >nul
REM 검사, 테스트, 빌드를 차례로 하고 dist-single\index.html 한 파일을 만듭니다.
cd /d "%~dp0"
if not exist node_modules (
  echo 먼저 install.bat 을 실행하세요.
  pause
  exit /b 1
)
call npm run verify
if errorlevel 1 (
  echo 위 오류를 고친 뒤 다시 실행하세요.
  pause
  exit /b 1
)
echo.
echo 완료: dist-single\index.html
echo 포탈에 붙이려면 이 파일을 포탈의 apps\^<이름^>\index.html 로 복사하세요.
pause
