# 사내 모델에 넘기는 프롬프트

사내 모델(ChatGPT Enterprise, Cline + Qwen)은 이 템플릿의 구조와 폐쇄망 제약을 모릅니다.
그대로 "수주 화면 만들어 줘" 라고 하면 없는 패키지를 쓰거나 템플릿을 무시한 새 코드를 짭니다.
여기 프롬프트는 무엇이 이미 정해져 있는지와 합격 기준을 알려 줍니다.

| 파일 | 언제 |
| --- | --- |
| `00-project-instructions.md` | 처음 한 번. ChatGPT 프로젝트 지침에 붙여 넣습니다 |
| `10-new-page.md` | 새 메뉴 화면을 만들 때 (시장환경분석, OEM별 전략, 매출 관리 등) |
| `20-excel-data.md` | 예시 데이터 대신 엑셀 파일을 읽게 바꿀 때 |
| `30-connect-app.md` | 다른 사람이 만든 앱을 연결된 앱에 붙일 때 |
| `40-fix-error.md` | 검사, 빌드, 브라우저 콘솔에서 오류가 났을 때 |

## ChatGPT Enterprise

1. 프로젝트를 하나 만들고, 프로젝트 지침(Instructions)에 `00-project-instructions.md` 의 코드 블록을 통째로 붙여 넣습니다.
2. 프로젝트 파일로 아래를 올립니다. 모델이 이 파일을 보고 같은 방식으로 씁니다.
   - `package.json`
   - `src/components/mi/` 의 네 파일 (chart, kpi-card, page-shell, planned-page)
   - `src/lib/mi/format.js`, `src/lib/mi/excel.js`
   - `src/components/layout/data/sidebar-data.ts`
   - 만들 화면과 가장 비슷한 예시 화면 하나 (`src/features/sales/index.tsx` 등)
3. 대화마다 10~40 중 하나를 골라 빈칸을 채워 붙여 넣습니다.

## Cline

킷 폴더의 `.clinerules` 를 Cline 이 자동으로 읽습니다. 작업을 시킬 때 10~40 의 본문을 그대로 붙여 넣으면 됩니다.
Cline 이 터미널 명령을 제안하면 `npm run check`, `npm test`, `npm run build:single` 만 허용하세요.

## 공통 요령

- 한 번에 파일 하나. 여러 파일을 한꺼번에 시키면 앞 파일 내용을 잊고 서로 안 맞는 코드를 줍니다.
- 받은 코드는 파일에 넣고 `npm run check` 부터 돌립니다. 통과하면 `npm run dev` 로 화면을 봅니다.
- 오류가 나면 오류 문구를 그대로 `40-fix-error.md` 에 넣어 다시 요청합니다. 설명을 덧붙이지 않는 편이 낫습니다.
- 사내 실제 데이터는 사내 모델에게만 줍니다. 이 저장소와 외부 서비스에는 올리지 않습니다.
