@echo off
chcp 65001 >nul
REM 바탕화면에 "큰 글씨 메모장" 바로가기를 만듭니다. 한 번만 실행하면 됩니다.
REM 실제 일은 make-shortcut.ps1 이 합니다.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0make-shortcut.ps1"
if errorlevel 1 (
  echo.
  echo 바로가기를 만들지 못했습니다. open-app.bat 을 오른쪽 단추로 눌러
  echo "보내기 - 바탕 화면에 바로 가기 만들기" 를 써도 됩니다.
)
pause
