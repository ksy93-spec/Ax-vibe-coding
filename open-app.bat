@echo off
chcp 65001 >nul
REM 큰 글씨 메모장을 주소창 없는 창(앱 창)으로 엽니다.
REM Edge 가 있으면 Edge, 없으면 Chrome, 둘 다 없으면 기본 브라우저로 엽니다.
REM 경로의 빈칸은 브라우저가 %%20 으로 바꿉니다.
REM 괄호 블록 안에 ProgramFiles(x86) 을 쓰면 cmd 가 괄호를 잘못 읽어서 goto 로만 나눕니다.
setlocal
set "PAGE=%~dp0index.html"
set "URL=file:///%PAGE:\=/%"

set "B=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%B%" goto run
set "B=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%B%" goto run
set "B=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if exist "%B%" goto run
set "B=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if exist "%B%" goto run
set "B=%LocalAppData%\Google\Chrome\Application\chrome.exe"
if exist "%B%" goto run

echo Edge 와 Chrome 을 찾지 못해 기본 브라우저로 엽니다.
start "" "%PAGE%"
exit /b 0

:run
start "" "%B%" --app="%URL%" --start-maximized
exit /b 0
