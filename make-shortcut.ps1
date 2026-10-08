# 바탕화면에 "큰 글씨 메모장" 바로가기를 만듭니다. 누르면 주소창 없는 창으로 열립니다.
# 메모는 이 바로가기가 아니라 브라우저 안에 저장되므로, 바로가기를 지웠다 다시 만들어도 메모는 그대로입니다.
$ErrorActionPreference = 'Stop'
$kit = $PSScriptRoot
$page = Join-Path $kit 'index.html'
$icon = Join-Path $kit 'assets\icon.ico'
$url = 'file:///' + (($page -replace '\\', '/') -replace ' ', '%20')
$candidates = @(
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
)
$browser = $candidates | Where-Object { $_ -and (Test-Path -LiteralPath $_) } | Select-Object -First 1

$desktop = [Environment]::GetFolderPath('Desktop')
$lnk = Join-Path $desktop '큰 글씨 메모장.lnk'
$shell = New-Object -ComObject WScript.Shell
$sc = $shell.CreateShortcut($lnk)
if ($browser) {
  $sc.TargetPath = $browser
  $sc.Arguments = "--app=`"$url`" --start-maximized"
} else {
  Write-Host 'Edge 와 Chrome 을 찾지 못해 기본 브라우저로 여는 바로가기를 만듭니다.'
  $sc.TargetPath = $page
}
$sc.WorkingDirectory = $kit
$sc.IconLocation = "$icon,0"
$sc.Description = '큰 글씨 메모장'
$sc.Save()
Write-Host "바탕화면에 바로가기를 만들었습니다: $lnk"
