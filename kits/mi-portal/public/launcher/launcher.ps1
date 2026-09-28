# MI 포탈 실행기. 포탈의 "실행" 단추(miportal:launch/<id> 주소)를 받아 exe 를 띄웁니다.
#
# 이 파일은 register.bat 이 %LOCALAPPDATA%\mi-portal-launcher\ 로 복사하고,
# 윈도가 miportal: 주소를 열 때 아래처럼 부르도록 등록합니다.
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File launcher.ps1 "miportal:launch/nesting-calc"
#
# 안전장치
#   - 주소에는 프로그램 id 만 담깁니다. 경로나 명령은 받지 않습니다.
#   - id 는 같은 폴더 apps.ini 에 적힌 것만 실행합니다. 목록에 없으면 아무것도 하지 않습니다.
#   - 실행 파일 종류는 .exe .lnk .bat .cmd 만 허용합니다.
#
# Windows PowerShell 5.1 에서 돌아야 합니다. 한글 문구 때문에 이 파일은 UTF-8 BOM 으로 저장합니다
# (BOM 이 없으면 5.1 이 CP949 로 읽어 글자가 깨집니다).

param(
  [Parameter(Position = 0)] [string] $Url = '',
  # 실제로 실행하지 않고 찾은 경로만 출력합니다. 시험용.
  [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$iniPath = Join-Path $here 'apps.ini'
$allowedExt = @('.exe', '.lnk', '.bat', '.cmd')

$logDir = $env:LOCALAPPDATA
if (-not $logDir) { $logDir = [System.IO.Path]::GetTempPath() }
$logPath = Join-Path $logDir 'mi-portal-launcher.log'

function Write-Log([string] $msg) {
  try {
    $line = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + '  ' + $msg
    Add-Content -Path $logPath -Value $line -Encoding UTF8
  } catch { }
}

function Show-Message([string] $msg) {
  Write-Log ('안내: ' + $msg)
  if ($DryRun -or -not $IsWindowsLike) { Write-Output ('MESSAGE: ' + $msg); return }
  try {
    Add-Type -AssemblyName System.Windows.Forms
    [void][System.Windows.Forms.MessageBox]::Show($msg, 'MI 포탈 실행기')
  } catch {
    Write-Output $msg
  }
}

# Windows PowerShell 5.1 에는 $IsWindows 가 없어서 직접 판단합니다.
$IsWindowsLike = ($env:OS -eq 'Windows_NT')

Write-Log ('요청: ' + $Url)

# 1. 주소에서 id 꺼내기. miportal:launch/<id> 와 miportal://launch/<id>/ 둘 다 받습니다.
$decoded = [System.Uri]::UnescapeDataString($Url.Trim())
$m = [regex]::Match($decoded, '^miportal:(?://)?launch/([a-z0-9][a-z0-9-]{0,40})/?$', 'IgnoreCase')
if (-not $m.Success) {
  Show-Message ('알 수 없는 요청입니다: ' + $Url)
  exit 2
}
$id = $m.Groups[1].Value.ToLowerInvariant()

# 2. apps.ini 에서 id 찾기. "id = 경로" 형식, # 로 시작하는 줄은 설명입니다.
if (-not (Test-Path -LiteralPath $iniPath)) {
  Show-Message ('실행 목록 파일이 없습니다: ' + $iniPath + "`r`n포탈의 launcher 폴더에서 register.bat 을 다시 실행하세요.")
  exit 3
}
$target = $null
foreach ($raw in (Get-Content -LiteralPath $iniPath -Encoding UTF8)) {
  $line = $raw.Trim()
  if ($line -eq '' -or $line.StartsWith('#') -or $line.StartsWith(';')) { continue }
  $eq = $line.IndexOf('=')
  if ($eq -lt 1) { continue }
  $key = $line.Substring(0, $eq).Trim().ToLowerInvariant()
  if ($key -ne $id) { continue }
  $target = $line.Substring($eq + 1).Trim().Trim('"')
  break
}
if (-not $target) {
  Show-Message ("'" + $id + "' 는 실행 목록(apps.ini)에 없습니다.`r`n담당자에게 apps.ini 에 이 프로그램을 추가해 달라고 하세요.")
  exit 4
}

# 3. 경로 확인. %USERPROFILE% 같은 환경 변수를 풀고, 허용한 파일 종류인지 봅니다.
$path = [Environment]::ExpandEnvironmentVariables($target)
$ext = [System.IO.Path]::GetExtension($path).ToLowerInvariant()
if ($allowedExt -notcontains $ext) {
  Show-Message ('실행할 수 없는 파일 종류입니다(' + $ext + '). .exe .lnk .bat .cmd 만 됩니다: ' + $path)
  exit 5
}
if (-not (Test-Path -LiteralPath $path -PathType Leaf)) {
  Show-Message ('프로그램 파일을 찾을 수 없습니다:' + "`r`n" + $path + "`r`n" + '설치 위치가 바뀌었다면 apps.ini 를 고친 뒤 register.bat 을 다시 실행하세요.')
  exit 6
}

# 4. 실행
if ($DryRun) {
  Write-Output ('RUN: ' + $path)
  exit 0
}
try {
  Start-Process -FilePath $path -WorkingDirectory (Split-Path -Parent $path)
  Write-Log ('실행: ' + $path)
} catch {
  Show-Message ('실행하지 못했습니다: ' + $path + "`r`n" + $_.Exception.Message)
  exit 7
}
