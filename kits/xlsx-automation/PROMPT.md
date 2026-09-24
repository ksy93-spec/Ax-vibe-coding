# 사내 모델용 프롬프트

## 먼저 할 것

`.clinerules` 가 킷 루트에 있습니다. VS Code 로 이 폴더를 열면 Cline 이 자동으로 읽습니다.
ChatGPT Enterprise 에는 `src/ktable.py` 와 `MANIFEST.md` 를 프로젝트 지식 파일로 올려 두세요.

## Qwen 3.5-Cline

```
파일: src/main.py
목표: <처리 한 단계>

이미 있는 것 (새로 만들지 말 것, src/ktable.py 에 있음):
- ktable.read_table(path) -> list[dict]   확장자 보고 csv/xlsx 자동 처리, CP949 판별 포함
- ktable.write_xlsx(path, {시트명: records}, columns_by_sheet=..., number_formats=...)
- ktable.write_csv(path, columns, records)   UTF-8 BOM 붙음
- ktable.to_number(v) -> float|None   "1,234", "(1,200)", "3400원" 처리
- ktable.to_date(v) -> date|None      "2024.03.05", "20240305", "2024년 3월 5일" 처리
- ktable.display_width(s) -> int      한글 2칸
- ktable.safe_sheet_name(s) -> str    31자, 금지문자 처리

할 일:
- <한 가지만>

금지:
- pip install, pandas, numpy, xlsxwriter 등 새 라이브러리
- src/ktable.py 수정
- CSV 를 open() 으로 직접 읽거나 쓰는 것

완료 기준:
- python src/test_ktable.py 가 통과한다
- <눈으로 확인 가능한 조건>
```

### 예시

```
파일: src/main.py
목표: 부서별로 시트를 나눠서 저장

이미 있는 것:
- build_report(records, out_path, group_by) 가 현재 "요약"과 "데이터" 두 시트를 만든다
- ktable.write_xlsx 는 {시트명: 레코드목록} 을 받아 여러 시트를 쓴다
- ktable.safe_sheet_name 으로 시트 이름을 정리한다

할 일:
- build_report 에서 "데이터" 시트 대신 부서별 시트를 만든다
- 시트 이름은 부서 값을 safe_sheet_name 에 통과시킨다
- 요약 시트는 그대로 둔다

금지:
- pandas 등 새 라이브러리, src/ktable.py 수정

완료 기준:
- samples 를 input 에 넣고 run 하면 "요약" + 부서 수만큼의 시트가 생긴다
- python src/test_ktable.py 통과
```

## ChatGPT Enterprise

```
아래는 폐쇄망에서 실행되는 파이썬 스크립트입니다.
표준 라이브러리와 openpyxl 3.1.5 만 쓸 수 있습니다. pandas 는 설치할 수 없습니다.

사용 가능한 보조 모듈 (수정 불가):
[src/ktable.py 의 함수 시그니처와 docstring 붙여넣기]

현재 파일:
[src/main.py 전체 붙여넣기]

요청: <변경 사항 하나>
제약:
- 새 import 를 추가하지 말 것 (표준 라이브러리는 허용)
- ktable 의 함수를 다시 구현하지 말고 호출할 것
- 타입 힌트와 docstring 을 유지할 것
출력: 수정된 src/main.py 전체. 설명은 코드 뒤에 세 줄 이내.
```

## 자주 나오는 실패

사내 모델은 엑셀 작업을 시키면 거의 반사적으로 pandas 를 씁니다.
`.clinerules` 에 적어 두어도 가끔 넘어가므로, 프롬프트에 "pandas 는 설치할 수 없다"를
한 줄 더 적어 두는 쪽이 확실합니다.

CSV 인코딩도 마찬가지입니다. `encoding='utf-8'` 로 하드코딩하는 코드를 만들면
CP949 파일에서 바로 터집니다. `ktable.read_table` 을 쓰라고 명시하세요.
