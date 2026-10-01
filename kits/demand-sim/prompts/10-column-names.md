# 사내 CSV 열 이름 추가

데이터 탭에서 열을 직접 골라도 되지만, 매번 고르기 번거로우면 자동 인식 목록에 넣습니다.
실제 데이터 값은 붙이지 말고 열 이름(헤더 줄)만 붙입니다.

```
파일: src/model/prep.js
목표: ALIASES 에 사내 CSV 열 이름을 추가해 자동 인식되게 한다.

이미 정해진 것 (바꾸지 말 것):
- ALIASES.sales 의 표준 필드: month, region, country, brand, units
- ALIASES.powertrain 의 표준 필드: quarter, region, brand, powertrain, units
- 비교는 소문자로 바꾸고 공백, 밑줄, 하이픈, 마침표, 괄호를 지운 뒤 한다 (norm 함수).
  그래서 목록에는 그렇게 정리한 형태로 넣는다. 예: 'Sales Volume (EA)' -> 'salesvolumeea'
- 앞에 있는 후보가 먼저 잡힌다.

사내 파일의 헤더 줄:
- 월별 판매: 〈예: 기준월,Sales Region,Sales Country,Sales Brand,Retail Volume〉
- 분기 파워트레인: 〈예: 분기,Sales Region,Sales Brand,xEV 구분,Retail Volume〉

할 일:
- 위 열이 알맞은 표준 필드로 잡히도록 ALIASES 배열 끝에 후보를 더한다.
- 다른 코드는 바꾸지 않는다.

완료 기준:
- tests/index.html 19/19 통과
- 사내 CSV 를 넣으면 "열 지정 필요" 표시 없이 바로 행 수가 나온다
```
