@echo off
chcp 65001 >nul
setlocal
REM MI 포탈 실행기 등록. PC 마다 한 번 실행합니다. 관리자 권한은 필요 없습니다.
REM 1) launcher.ps1 과 apps.ini 를 %LOCALAPPDATA%\mi-portal-launcher 로 복사
REM 2) 이 사용자 계정(HKCU)에 miportal: 주소를 등록
REM apps.ini 를 고쳤을 때도 이 파일을 다시 실행하면 새 목록이 복사됩니다.

set "SRC=%~dp0"
set "DEST=%LOCALAPPDATA%\mi-portal-launcher"
set "PS=%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe"

if not exist "%SRC%launcher.ps1" goto nofile
if not exist "%SRC%apps.ini" goto nofile
if not exist "%PS%" goto nops

if not exist "%DEST%" mkdir "%DEST%"
copy /y "%SRC%launcher.ps1" "%DEST%\launcher.ps1" >nul || goto copyfail
copy /y "%SRC%apps.ini" "%DEST%\apps.ini" >nul || goto copyfail

reg add "HKCU\Software\Classes\miportal" /ve /d "URL:MI Portal Launcher" /f >nul || goto regfail
reg add "HKCU\Software\Classes\miportal" /v "URL Protocol" /d "" /f >nul || goto regfail
reg add "HKCU\Software\Classes\miportal\shell\open\command" /ve /d "\"%PS%\" -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"%DEST%\launcher.ps1\" \"%%1\"" /f >nul || goto regfail

echo 등록했습니다.
echo   실행기 위치: %DEST%
echo   등록된 프로그램:
for /f "usebackq eol=# tokens=1 delims==" %%a in ("%DEST%\apps.ini") do echo     %%a
echo.
echo 포탈의 연결된 앱에서 실행 단추를 눌러 보세요. 처음 한 번은 브라우저가 열지 물어봅니다.
pause
exit /b 0

:nofile
echo launcher.ps1 과 apps.ini 가 이 파일과 같은 폴더에 있어야 합니다.
pause
exit /b 1

:nops
echo Windows PowerShell 을 찾을 수 없습니다: %PS%
pause
exit /b 1

:copyfail
echo 파일을 복사하지 못했습니다: %DEST%
pause
exit /b 1

:regfail
echo 레지스트리에 쓰지 못했습니다. 사내 보안 정책으로 막혀 있을 수 있습니다. IT 담당자에게 문의하세요.
pause
exit /b 1
