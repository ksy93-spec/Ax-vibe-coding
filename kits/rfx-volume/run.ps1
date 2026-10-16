# 차량 물동 적정성 평가 서버를 켭니다. 설치 단계가 없습니다 (Python 표준 라이브러리만 씀).
Set-Location -Path $PSScriptRoot
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "Python 을 찾을 수 없습니다. Python 3.8 이상을 설치하거나, build-exe.ps1 로 만든 exe 를 쓰세요."
  exit 1
}
python main.py @args
