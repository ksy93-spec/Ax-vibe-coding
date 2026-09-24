# 설치와 실행

## 0. 먼저 확인

명령 프롬프트에서:

```
python -V
```

3.8 이상이 나오면 됩니다. `python` 을 찾을 수 없다고 나오면 사내 표준 파이썬을 먼저 설치하세요.
`py -V` 로 나오는 환경이면 아래 명령의 `python` 을 `py` 로 바꿔 쓰세요.

## 1. 압축 해제

한글과 공백이 없는 경로에 풉니다. 예: `C:\work\xlsx-automation`

## 2. 설치

`install.bat` 을 더블클릭합니다. 인터넷에 접속하지 않습니다.

직접 하려면:

```
python -m venv .venv
.venv\Scripts\python -m pip install --no-index --find-links vendor -r requirements.txt
```

`--no-index` 를 빠뜨리면 pip 가 외부 저장소에 접속하려다 멈춥니다.

## 3. 확인

```
.venv\Scripts\python src\test_ktable.py
```

33건이 전부 통과하면 정상입니다.

## 4. 실행

`samples\` 안의 파일을 `input\` 으로 복사한 뒤 `run.bat` 을 실행합니다.
`output\` 에 `report_날짜_시각.xlsx` 가 생깁니다.

옵션을 주려면:

```
run.bat --input 내자료 --group 직급
```

## 확인 항목

- [ ] `output\` 에 xlsx 가 생긴다
- [ ] "요약" 시트에 부서별 건수와 비율이 있고, 비율이 퍼센트 서식으로 보인다
- [ ] "데이터" 시트 첫 행이 고정되고 자동 필터가 걸려 있다
- [ ] 한글 열 제목이 잘리지 않는다
- [ ] 연봉 열이 문자가 아니라 숫자다 (셀을 선택하면 합계가 상태 표시줄에 뜬다)

## 문제가 생기면

**`pip` 가 멈추거나 타임아웃**
`--no-index` 를 빠뜨렸습니다. 외부 저장소에 접속하려는 중입니다.

**`ModuleNotFoundError: No module named 'openpyxl'`**
가상환경이 아니라 시스템 파이썬으로 실행했습니다. `.venv\Scripts\python` 을 쓰세요.

**한글이 깨져서 읽힌다**
원본 인코딩이 CP949 도 UTF-8 도 아닌 경우입니다. 엑셀에서 열어 `CSV UTF-8` 로 다시 저장하세요.

**내보낸 CSV 를 엑셀에서 열었더니 한글이 깨진다**
`open()` 으로 직접 쓴 코드가 있습니다. `ktable.write_csv` 를 쓰면 BOM 이 붙습니다.

**xlsx 를 읽는데 값이 전부 None 이거나 수식 문자열이다**
`load_workbook(..., data_only=True)` 가 필요합니다. `ktable.read_xlsx` 는 이미 그렇게 합니다.
단, 엑셀에서 한 번도 열어 계산한 적 없는 파일은 계산값이 저장되어 있지 않아 None 이 나옵니다.

**`PermissionError`**
결과 파일이 엑셀에서 열려 있습니다. 닫고 다시 실행하세요.
