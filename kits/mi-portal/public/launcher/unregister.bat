@echo off
chcp 65001 >nul
REM MI 포탈 실행기 등록 해제. miportal: 주소 등록과 복사해 둔 실행기 파일을 지웁니다.
reg delete "HKCU\Software\Classes\miportal" /f >nul 2>nul
if exist "%LOCALAPPDATA%\mi-portal-launcher" rd /s /q "%LOCALAPPDATA%\mi-portal-launcher"
echo 등록을 해제했습니다.
pause
