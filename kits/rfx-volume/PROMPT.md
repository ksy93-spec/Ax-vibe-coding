# 사내 모델용 프롬프트

사내 ChatGPT Enterprise 로 이 도구를 고칠 때 씁니다. 붙여넣기용 원문은 `prompts/` 에 있습니다.

| 파일 | 언제 |
| --- | --- |
| `prompts/00-project-instructions.md` | ChatGPT 프로젝트를 처음 만들 때 지침으로 한 번 |
| `prompts/10-column-names.md` | 실제 생산 전망 파일을 못 읽을 때 (코드 수정 없음) |
| `prompts/20-screen-change.md` | 화면 문구, 질문 순서, 차트를 바꿀 때 (`web/` 한 파일) |
| `prompts/30-calc-change.md` | 계산식이나 결과 보드 문장을 바꿀 때 (`app/calc.py`) |
| `prompts/40-fix-error.md` | 오류 메시지가 나올 때 |

원칙

- 한 번에 한 파일만 고치게 합니다. 여러 파일을 같이 맡기면 서로 안 맞게 고칩니다.
- 고친 뒤에는 `python -m unittest discover -s tests` 가 통과해야 합니다. 계산을 바꿨으면 테스트를 먼저 고쳐 기대값을 정합니다.
- 사내 데이터의 실제 숫자는 붙여넣지 않아도 됩니다. 열 이름과 행 2~3개 형태면 충분합니다.
