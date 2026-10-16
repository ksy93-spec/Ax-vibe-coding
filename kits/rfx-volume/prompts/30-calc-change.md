# 계산식이나 결과 보드 문장 바꾸기

두 번에 나눠 맡깁니다. 먼저 테스트로 기대값을 정하고, 그다음 계산을 고칩니다.

## 1차: 테스트

```
아래는 tests/test_calc.py 전체다. 아래 규칙을 확인하는 테스트 함수를 하나 추가해 줘.
다른 테스트는 고치지 않는다. 숫자는 손으로 계산한 기대값을 넣는다.

규칙: <예: 연도별 옵션율이 다를 수 있다. req["option_by_year"] = {2027: 30, 2028: 50} 이면 그 해만 그 값을 쓴다>

[tests/test_calc.py 붙여넣기]
```

`python -m unittest tests.test_calc` 를 돌려 새 테스트만 실패하는지 확인합니다.

## 2차: 계산

```
아래는 app/calc.py 전체와 방금 추가한 테스트다. 테스트가 통과하도록 calc.py 만 고쳐 줘.

이미 정해진 것 (바꾸지 말 것)
- compute(gens, req, years, tolerance, currency, contact) 시그니처
- 반환 dict 의 기존 키 (화면과 엑셀 내보내기가 읽는다). 새 키는 추가해도 된다.
- Gap = 예상 - 고객, 음수가 Risk
- 표준 라이브러리만

[app/calc.py 붙여넣기]
[추가한 테스트 함수 붙여넣기]
```

확인: `python -m unittest discover -s tests` 전부 통과. 그다음 `build-exe.bat` 으로 exe 를 다시 만듭니다 (app/ 를 고쳤으므로).
