# earnings-archive 업데이트

## 처음 반입: 통째로 받기

[earnings-archive-latest.zip](earnings-archive-latest.zip) 은 항상 최신 판 전체입니다 (지금 2026.11.02.3). 깃헙에서 이 파일을 열고 다운로드 단추(Download raw file)로 받습니다.

1. `C:\work` 처럼 한글과 공백이 없는 짧은 경로에 풉니다. `earnings-archive` 폴더가 생깁니다.
2. 그 안의 `index.html` 을 Chrome 이나 Edge 로 엽니다. 설치할 것은 없습니다.
3. 처음 할 일은 폴더 안 `OFFLINE.md` 3번에 있습니다 (환율 넣기, 로고 넣기, data 폴더 연결).
   과거 실적(17곳)과 환율이 `data` 에 들어 있어 열자마자 한눈에 보기 대시보드가 나옵니다.

이미 쓰고 있는 킷을 통째로 바꿀 때는 기존 `data` 폴더를 먼저 따로 복사해 두고, 새 폴더를 푼 뒤 그 `data` 폴더를 다시 덮어씁니다.
사내에서 쌓은 실적, 환율, 설정이 모두 `data` 폴더에 있습니다.

## 변경분만 받기 (이미 반입한 뒤)

주의: 2026.11.02.3 변경분은 바깥에서 모은 과거 실적과 환율로 `data/reports`, `data/fx.js`, `data/companies.js` 를 바꿉니다. 사내에서 이미 자료를 넣었다면 적용 전에 `data` 폴더를 복사해 두세요.

킷을 한 번 통째로 옮긴 뒤에는 여기 zip 만 받아서 적용합니다. 위에서부터 순서대로 적용합니다.
GitHub 에서 zip 파일을 누르고 다운로드 단추(Download raw file)로 받으면 저장소 전체를 받지 않아도 됩니다.

적용 방법: zip 을 아무 곳에나 풀고 안의 `apply.bat` 을 실행합니다. 킷 폴더를 찾지 못하면
탐색기에서 킷 폴더를 창으로 끌어다 놓으라고 묻습니다. 판이 맞지 않으면 아무것도 바꾸지 않고 멈춥니다.

지금 가진 판은 킷 폴더의 `VERSION` 파일에 적혀 있습니다. 파일이 없으면 처음 판입니다.

| 적용 전 판 | 적용 후 판 | 파일 | 크기 | install.bat 다시 | SHA256 |
| --- | --- | --- | --- | --- | --- |
| 없음 (처음 판) | 2026.10.23.1 | [earnings-archive-2026.10.23.1.zip](earnings-archive-2026.10.23.1.zip) | 3.0MB | - | `b294210657d5ba15` |
| 2026.10.23.1 | 2026.10.23.2 | [earnings-archive-2026.10.23.2.zip](earnings-archive-2026.10.23.2.zip) | 88KB | - | `d07ae988eb9a48bc` |
| 2026.10.23.2 | 2026.10.26.1 | [earnings-archive-2026.10.26.1.zip](earnings-archive-2026.10.26.1.zip) | 21KB | - | `5422e7dc2ce525e8` |
| 2026.10.26.1 | 2026.11.02.1 | [earnings-archive-2026.11.02.1.zip](earnings-archive-2026.11.02.1.zip) | 99KB | - | `adb4bf51c70eebb2` |
| 2026.11.02.1 | 2026.11.02.2 | [earnings-archive-2026.11.02.2.zip](earnings-archive-2026.11.02.2.zip) | 107KB | - | `020289ab7eef9ab3` |
| 2026.11.02.2 | 2026.11.02.3 | [earnings-archive-2026.11.02.3.zip](earnings-archive-2026.11.02.3.zip) | 114KB | - | `6e5bc14a4c92e382` |
