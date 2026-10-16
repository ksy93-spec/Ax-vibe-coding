# rfx-volume (차량 물동 적정성 평가)

RFx 로 받은 고객 물동을 조사기관 생산 전망(IHS 형식 엑셀)과 비교해 수량, 금액 Risk/Opportunity 를 계산하는 도구입니다.
서버 PC 에서 exe 프로그램 하나를 켜 두면, 다른 사람은 브라우저로 `http://<서버 IP>:8765/` 에 접속해서 씁니다.
사내 포탈에는 이 주소를 연결 앱으로 등록합니다.

## 실행 환경

- Python: 실행만 하면 3.8 이상, exe 를 만들려면 3.10 ~ 3.14 (Windows 64비트)
- 서버 쪽 패키지: 없음. 표준 라이브러리만 씁니다 (엑셀 읽기/쓰기도 직접 구현)
- 화면 쪽 라이브러리: ECharts 6.1.0 (차트), Lucide 1.48.0 (아이콘). 빌드 없이 `web/vendor/` 의 파일을 그대로 읽습니다
- 브라우저: 사내 Chrome 또는 Edge (ES 모듈, CSS `:has`, `color-mix` 사용. Chrome/Edge 111 이상)
- 빌드 단계: 화면은 없음. exe 를 만들 때만 PyInstaller 를 씀

## 반입 방식

B. 휠 동봉. 실행 자체는 C 처럼 파일만 있으면 되지만, exe 를 사내에서 다시 만들 수 있도록 PyInstaller 휠을 `vendor/` 에 넣었습니다.
화면(`web/`)과 설정(`config/`)은 exe 밖에 두기 때문에, 화면 문구나 열 이름을 고칠 때는 exe 를 다시 만들 필요가 없습니다.
Python 코드(`app/`)를 고쳤을 때만 `build-exe.bat` 을 다시 실행합니다.

## 폴더

| 경로 | 내용 | 사내에서 고치는 일 |
| --- | --- | --- |
| `main.py` | 시작점 | 없음 |
| `app/xlsx.py` | 엑셀 읽기/쓰기 (zipfile + xml) | 거의 없음 |
| `app/data.py` | 조사기관 파일 읽기, 세대 묶기, 고객 이름 찾기 | 파일 형식이 크게 다를 때 |
| `app/calc.py` | 물동 계산, 결과 보드 문장 | 계산식, 문장 바꿀 때 |
| `app/export.py` | 엑셀 내보내기 | 시트 구성 바꿀 때 |
| `app/server.py` | 웹 서버, API | 거의 없음 |
| `web/` | 화면 (HTML, CSS, JS) | 화면 문구, 차트 |
| `web/js/charts.js` | ECharts 차트 설정 모음 (차트 하나 = 함수 하나) | 차트 모양 |
| `web/vendor/` | ECharts, Lucide 아이콘 원본 파일 | 없음 |
| `config/settings.ini` | 포트, 데이터 파일 경로, 연도 범위, 허용 범위, 담당자 | 처음 한 번 |
| `config/columns.ini` | 조사기관 파일의 열 이름 연결 | 처음 한 번 |
| `config/aliases.csv` | 고객 별칭 (아우디 → Audi, 내부 코드) | 수시로 |
| `config/regions.csv` | 조사기관 지역명 → 화면 표시 (유럽, 북미, 중국 …) | 처음 한 번 |
| `data/sample-lvp.xlsx` | 가짜 생산 전망 (숫자는 모두 지어낸 값) | 실제 파일로 바꿈 |
| `tests/` | 합격 기준 (unittest 34개) | 계산을 바꾸면 같이 고침 |
| `tools/make_sample.py` | 가짜 데이터 다시 만들기 | 없음 |
| `prompts/` | 사내 ChatGPT 에 붙여넣는 프롬프트 | 없음 |
| `vendor/` | PyInstaller 와 의존성 휠 7개 | 없음 |

## 포함된 의존성 (화면)

| 패키지 | 버전 | 라이선스(SPDX) | 용도 | 원문 |
| --- | --- | --- | --- | --- |
| echarts | 6.1.0 | Apache-2.0 | 차트 (`dist/echarts.min.js` 한 파일) | `web/vendor/echarts/LICENSE`, `NOTICE` |
| lucide-static | 1.48.0 | ISC | 아이콘 SVG 33개 (원본 그대로) | `web/vendor/lucide/LICENSE` |

- echarts 는 `kits/mi-starter/vendor/echarts-6.1.0.tgz` 와 같은 tarball 에서 꺼냈습니다.
  tarball 무결성 `sha512-q0yaFPggC9FUdsWH4blavRWFmxdrIodbkoKNAjJudAI6CA9gNPxHtV2RcZNEepZVlk4yvBYkOkbk6HIVpIyHZA==` (npm 레지스트리 값과 일치),
  `echarts.min.js` 의 sha256 `b66b25aeb4df84e33199dc21694014d336d222cbd9deb0e5a7c14bd6aa0d0fd0`.
- lucide-static tarball 무결성 `sha512-ZUGgZ4rzlLfVbhN2Zi37TMrTaSpXAbWx6Y/xZxKSDLPiqxtTK7Mw2M+oBJa0gjV8p3+CWBHh48u+IC9+jKlUjA==` (npm 레지스트리 값과 일치).
  `package/icons/` 에서 쓰는 아이콘만 골라 파일을 고치지 않고 복사했습니다.
- 둘 다 mi-starter 에서 이미 고른 라이브러리입니다. 사내 도구끼리 같은 차트, 아이콘을 쓰면 ChatGPT 에 맡길 때 결과가 덜 흔들립니다.

## 포함된 의존성 (exe 만들 때만)

| 패키지 | 버전 | 라이선스(SPDX) | 용도 | 원문 |
| --- | --- | --- | --- | --- |
| pyinstaller | 6.16.0 | GPL-2.0-or-later WITH Bootloader-exception | exe 만들기 | 휠 안 `pyinstaller-6.16.0.dist-info/licenses/COPYING.txt` |
| pyinstaller-hooks-contrib | 2026.8 | GPL-2.0-or-later OR Apache-2.0 | PyInstaller 보조 | 휠 안 `*.dist-info/licenses/LICENSE` |
| altgraph | 0.17.5 | MIT | PyInstaller 의존 | 휠 안 `*.dist-info/LICENSE` |
| packaging | 26.3 | Apache-2.0 OR BSD-2-Clause | PyInstaller 의존 | 휠 안 `*.dist-info/licenses/LICENSE*` |
| pefile | 2023.2.7 | MIT | PyInstaller 의존 (Windows) | 휠 안 `*.dist-info/LICENSE` |
| pywin32-ctypes | 0.2.3 | BSD-3-Clause | PyInstaller 의존 (Windows) | 휠 안 `*.dist-info/LICENSE.txt` |
| setuptools | 84.0.0 | MIT (안에 묶인 `autocommand` 2.2.2 는 LGPL-3.0-only) | PyInstaller 의존 | 휠 안 `*.dist-info/licenses/LICENSE`, `setuptools/_vendor/*/LICENSE*` |

PyInstaller 의 Bootloader exception 덕분에 만든 exe 는 GPL 을 따르지 않아도 됩니다. 해시는 `requirements-build.txt` 에 있고,
`--require-hashes` 로 설치해 휠이 바뀌면 설치가 멈춥니다.
이 휠들은 exe 를 만드는 PC 에만 설치되고, 만든 exe 폴더에는 PyInstaller 부트로더만 들어갑니다.

## 포함된 자산

| 파일 | 출처 | 라이선스 | 비고 |
| --- | --- | --- | --- |
| `web/fonts/pretendard/` | `shared/fonts/pretendard` (pretendard@1.3.9 공식 분할 파일 92개) | OFL-1.1, 원문 `web/fonts/pretendard/LICENSE.txt` | 고치지 않음 |
| `web/css/tokens.css` | `shared/design-tokens/tokens.css` | 저장소 자체 | 차트 색은 색맹 안전 검증된 순서 |
| `data/sample-lvp.xlsx` | `tools/make_sample.py` 로 생성 | 저장소 자체 | 차종 이름만 실제, 숫자와 공장은 지어낸 값 |

## 계산 규칙

```
예상 물동(연도) = Σ 차종 세대별 [생산 대수(연도, 공급 지역) × 옵션율 × 자사 비중 × 대당 사용량]
수량 Gap = 예상 물동 − 고객 물동      음수 = Risk (고객 숫자가 조사기관보다 큼), 양수 = Opportunity
금액 Gap = 수량 Gap × 판가 (판가를 넣은 연도만)
필요 옵션율 = 고객 물동 ÷ (생산 대수 × 자사 비중 × 대당 사용량)
```

- 차종 세대 = 같은 Production Brand, 같은 Production Nameplate, 같은 SOP 연도의 행 묶음 (공장, 지역이 여러 행)
- 자사 비중은 이원화를 켰을 때만 곱합니다
- 연도 열(`CY 2027`)이 이미 SOP, EOP 달 수를 반영한 연간 생산량이라 분기 데이터로 다시 나누지 않습니다. 연도 열이 없는 해만 분기 합으로 채웁니다
- Gap 비율이 허용 범위(기본 ±10%) 안이면 "적정"
- 지역 비중 문장은 공급 지역 선택과 상관없이 고른 차종 전체 생산 기준입니다. 공급 지역을 골랐으면 문장 끝에 따로 적습니다

## 사내에서 할 일

- [ ] 실제 생산 전망 엑셀을 `data/` 에 넣고 `config/settings.ini` 의 `file` 을 바꿈
- [ ] 첫 실행에서 "머리글 행을 찾지 못했습니다" 가 나오면 `config/columns.ini` 에 실제 열 이름을 적음 (`prompts/10-column-names.md`)
- [ ] `config/regions.csv` 에 실제 파일의 지역 이름을 추가 (화면에 영어 지역명이 그대로 나오면 빠진 것)
- [ ] `config/aliases.csv` 의 2글자 내부 코드(AU, HY, KI)는 예시입니다. 실제 코드로 바꿈
- [ ] `config/settings.ini` 의 `contact` 에 담당자 이름
- [ ] 서버 PC 방화벽에서 8765 포트 인바운드 허용 (다른 PC 에서 접속하려면 필요)
- [ ] 포탈에 연결 앱으로 등록 (`OFFLINE.md` 4번)

## 검증 기록

2026-10-16, 리눅스 (Python 3.13.16, Chromium 1194). 판 2026.10.16.2 (화면 개편) 기준

- `python -m unittest discover -s tests` : 34개 통과 (계산 17, 파일 읽기와 고객 찾기 12, 서버 5)
- `python main.py --no-browser` 로 서버를 켜고 Playwright 로 1~6단계를 끝까지 진행:
  아우디 입력 → Audi 선택 → A5, Q5 (SOP 2024) 선택 → 옵션 30%, 이원화 50%, 대당 2개 →
  엑셀에서 두 줄(물동, 판가) 붙여넣기 → 결과 보드, ECharts 차트 9개, 표, 민감도 히트맵 → 엑셀 내보내기, 검토 건 저장 → 새 검토 후 불러오기.
  3~5단계의 작은 차트(지역 도넛, 1,000대 기준 물동, 입력 미리 보기)도 같이 확인.
  브라우저 콘솔 오류 0건. 라이트/다크 화면 둘 다 확인
- 내보낸 엑셀을 `app/xlsx.py` 로 다시 읽어 시트 5개(요약, 연도별, 차종별, 지역별, 민감도) 확인
- PyInstaller 6.16.0 (리눅스 휠) 로 `--onedir` 빌드 후 exe 옆에 `web/ config/ data/` 를 두고 실행, `/api/meta` 와 화면 응답 확인

확인하지 못한 것

- Windows 에서 `build-exe.bat` 실행과 만든 exe. 같은 PyInstaller 판의 Windows 휠을 넣었고 명령은 리눅스에서 시험한 것과 같지만, Windows 에서 돌려 보지는 못했습니다
- 실제 조사기관 파일. 열 이름은 공개된 IHS 형식을 따라 기본값을 잡았고, 다르면 `columns.ini` 만 고치면 됩니다
- 행이 수만 개인 실제 파일의 읽기 시간. 처음 한 번 읽은 뒤에는 `data/.cache/` 에 저장해서 다음 실행부터 빠릅니다
- 사내 보안 솔루션이 서명 없는 exe 를 막는지. 막히면 `run.bat` (Python 직접 실행) 으로 같은 서버를 켤 수 있습니다
