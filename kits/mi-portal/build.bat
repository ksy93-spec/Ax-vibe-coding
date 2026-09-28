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
echo 완료: dist-single 폴더
echo index.html 과 apps 폴더를 함께 배포하세요. index.html 을 더블클릭하면 열립니다.
pause
