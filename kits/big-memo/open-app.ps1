# 큰 글씨 메모장을 주소창 없는 창(앱 창)으로 엽니다. open-app.bat 과 같은 일을 합니다.
# Edge 가 있으면 Edge, 없으면 Chrome, 둘 다 없으면 기본 브라우저로 엽니다.
$page = Join-Path $PSScriptRoot 'index.html'
$url = 'file:///' + (($page -replace '\\', '/') -replace ' ', '%20')
$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1
if ($browser) {
  Start-Process -FilePath $browser -ArgumentList @("--app=`"$url`"", '--start-maximized')
} else {
  Write-Host 'Edge 와 Chrome 을 찾지 못해 기본 브라우저로 엽니다.'
  Start-Process -FilePath $page
}
