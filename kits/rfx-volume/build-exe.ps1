# exe 를 만듭니다. 인터넷에 접속하지 않습니다 (vendor 폴더의 휠만 씀).
# 결과: dist\rfx-volume\rfx-volume.exe
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot
if (-not (Get-Command python -ErrorAction SilentlyContinue)) { throw 'Python 3.10 ~ 3.14 가 필요합니다.' }
$py = '.venv-build\Scripts\python.exe'
if (-not (Test-Path $py)) {
  python -m venv .venv-build
  & $py -m pip install --no-index --find-links vendor --require-hashes -r requirements-build.txt
  if ($LASTEXITCODE -ne 0) { throw 'PyInstaller 설치 실패' }
}
& $py -m unittest discover -s tests
if ($LASTEXITCODE -ne 0) { throw '자체 점검 실패' }
& $py -m PyInstaller --noconfirm --clean --onedir --console --name rfx-volume main.py
if ($LASTEXITCODE -ne 0) { throw 'exe 만들기 실패' }
$out = 'dist\rfx-volume'
Copy-Item web, config -Destination $out -Recurse -Force
New-Item -ItemType Directory -Force -Path "$out\data" | Out-Null
Copy-Item data\*.xlsx "$out\data\" -Force
Copy-Item VERSION $out -Force
Write-Host "완료: $out\rfx-volume.exe"
