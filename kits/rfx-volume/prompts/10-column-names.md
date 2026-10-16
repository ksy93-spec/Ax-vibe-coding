# 실제 파일의 열 이름 맞추기

코드를 고치지 않습니다. `config/columns.ini` 만 바꿉니다.

1. 실제 엑셀을 열어 머리글 행을 복사합니다 (숫자 행은 필요 없음).
2. 아래를 ChatGPT 에 붙여넣습니다.

```
아래는 config/columns.ini 전체와, 우리 생산 전망 엑셀의 머리글 행이다.
머리글 행에 맞게 columns.ini 의 후보 이름만 고쳐서 파일 전체를 돌려줘.

규칙
- [columns] 의 키 이름(brand, nameplate, sop, region, strategic_group, eop, platform, program, country, plant)은 바꾸지 않는다.
- 후보는 | 로 나눠 여러 개 둘 수 있다. 기존 후보는 지우지 말고 실제 이름을 맨 앞에 넣는다.
- region 은 생산 지역(유럽, 북미, 중국 단위) 열이다. 판매 지역 열을 고르지 않는다.
- nameplate 는 차종 이름 열이다 (예: A5, Q5). 프로그램 코드 열이 아니다.
- 연도별 생산량 열 이름이 "CY 2027" 이나 "2027" 형태가 아니면 [volume] 의 year_ 정규식을 하나 추가한다. 괄호 안이 연도다.
- 머리글이 아래로 30행보다 더 내려가 있으면 [header] scan_rows 를 늘린다.

[columns.ini 붙여넣기]

[머리글 행 붙여넣기]
```

3. 받은 내용으로 `config/columns.ini` 를 저장하고 브라우저를 새로 고칩니다 (서버를 다시 켤 필요 없음).
4. 화면 위쪽에 "차종 세대 N개" 가 나오면 성공입니다. 지역이 영어로 나오면 `config/regions.csv` 에 한 줄씩 추가합니다.
