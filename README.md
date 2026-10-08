# Ax-vibe-coding

폐쇄망 사내 개발 환경으로 들여보낼 코드와 자산을 외부에서 미리 준비하는 저장소입니다.

## 왜 이 저장소가 필요한가

사내에서 쓸 수 있는 건 사내 인프라 위의 Qwen 3.5-Cline(VS Code)와 ChatGPT Enterprise 두 가지입니다.
둘 다 외부 인터넷에 닿지 않기 때문에 npm 설치, 폰트 다운로드, 라이브러리 문서 조회가 안 됩니다.
모델 성능도 Opus 급보다 낮아서, 요구사항이 길고 모호할수록 결과가 빠르게 무너집니다.

그래서 작업을 둘로 나눕니다.

- 바깥(이 저장소): 네트워크가 필요한 일과, 판단이 필요한 설계를 미리 끝냅니다. 의존성 고정, 폰트/디자인 토큰 확보, 타입과 명세 작성, 실패하는 테스트 작성, 실행되는 스캐폴드 검증.
- 안쪽(사내): 남은 건 채워 넣기와 튜닝입니다. 사내 데이터, 내부 API, 보안 요건이 걸린 부분만 안에서 처리합니다.

핵심은 라이브러리를 옮기는 것보다 **제약을 옮기는 것**입니다. 버전이 고정되고, 타입이 확정되고,
테스트가 합격 기준을 정해두면 사내 모델은 본문만 채우면 됩니다. 이때 출력 품질 차이가 크게 줄어듭니다.

## 디렉터리

| 경로 | 용도 |
| --- | --- |
| `kits/` | 반입 단위. 디렉터리 하나가 곧 압축 파일 하나입니다. |
| `updates/` | 킷별 업데이트 zip. 처음 한 번 킷을 통째로 옮긴 뒤에는 바뀐 파일만 여기서 받습니다. |
| `shared/` | 여러 킷이 공유하는 폰트, 디자인 토큰, 검증된 UI 조각 |
| `prompts/` | 사내 모델(Qwen-Cline, ChatGPT Enterprise)에 그대로 붙여넣는 프롬프트 팩 |
| `specs/` | 기능 명세, 타입 정의, 합격 기준 |
| `docs/` | 작업 절차와 반입 체크리스트 |
| `scripts/` | 킷 패키징, 검증 스크립트 |

## 지금 있는 킷

| 킷 | 형태 | 반입 방식 | 크기 |
| --- | --- | --- | --- |
| `kits/mi-portal` | MI 통합 포탈 템플릿. shadcn-admin 기반 React + TypeScript (1차 프로젝트 권장 시작점) | B. 패키지 tarball 동봉 | 101MB |
| `kits/demand-sim` | 디스플레이 수요 시뮬레이터. 주요 지역 OEM M/S trend, 외생변수 Worst/Base/Best, 디스플레이 TAM과 자사 M/S 임원 보고서 | C. npm 의존성 0개 | 3.7MB |
| `kits/asset-inventory` | 사내 기존 자산의 구조만 뽑아내는 조사 도구 | C. 파이썬 파일 하나 | 30KB |
| `kits/portal-shell` | Market Intelligence 통합 포탈 셸 (1차 프로젝트) | C. npm 의존성 0개 | 640KB |
| `kits/mi-starter` | MI 기능을 ChatGPT 로 만들 때의 시작 템플릿과 오프라인 패키지 | B. 패키지 tarball 동봉 | 87MB |
| `kits/web-tool-starter` | 브라우저 도구. `index.html` 더블클릭으로 실행 | C. npm 의존성 0개 | 616KB |
| `kits/xlsx-automation` | 엑셀/CSV 가공과 보고서 생성 (Python) | B. 휠 동봉, 오프라인 설치 | 280KB |

모두 이 저장소에서 실제로 실행해 확인했습니다. 검증 내용은 각 킷의 `MANIFEST.md` 아래쪽에 있습니다.

포탈 관련 킷이 셋인데 역할이 다릅니다. `mi-portal` 은 사이드바, 표, 폼, 다크 모드를 갖춘 포탈 본체이고
여기에 MI 화면을 채웁니다. `mi-starter` 는 포탈과 별개로 도구 하나를 만들어 연결된 앱으로 붙일 때 씁니다.
`portal-shell` 은 npm 없이 도는 가벼운 포탈로, Node 를 쓸 수 없는 PC 를 위한 대안입니다.

## 시작점

- 저장소 zip 은 `C:\work` 처럼 짧은 경로에 푸세요. 다운로드 폴더에 풀면 폴더가 두 겹으로 생겨 윈도 경로 길이 제한에 가까워집니다.
- 포탈을 바로 시작하려면: `kits/mi-portal/README.md` (`demo/index.html` 을 더블클릭하면 완성된 모습)
- 망 구조와 자료 흐름: `docs/topology.md`
- 1차 프로젝트 설계안: `docs/portal-architecture.md`
- 사내 앱을 포탈에 붙이는 법: `docs/app-integration.md`
- MI 기능용 패키지 목록과 ChatGPT 지침: `kits/mi-starter/MANIFEST.md`, `kits/mi-starter/PROMPT.md`
- 작업 절차: `docs/playbook.md`
- 반입 전 확인: `docs/intake-checklist.md`
- 반입용 압축: `scripts/pack.sh <킷이름>` (처음), `scripts/pack-update.sh <킷이름> <이전 커밋>` (업데이트)
- 새 킷 만들기: `kits/_template/` 복사
