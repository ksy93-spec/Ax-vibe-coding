# 오프라인 설치 및 실행

인터넷 연결 없이 이 절차만으로 실행됩니다. 여기 적히지 않은 명령은 쓰지 마세요.

## 1. 압축 해제

한글이나 공백이 없는 짧은 경로에 풉니다. 예: `C:\work\rfx-volume`

## 2. 먼저 Python 으로 돌려 보기 (설치 없음)

`run.bat` 을 더블클릭합니다. 검은 창에 이런 줄이 나오고 브라우저가 열립니다.

```
읽은 행: 122, 차종 세대: 50, 연도: 2020~2037
이 PC 에서:   http://127.0.0.1:8765/
다른 PC 에서: http://10.x.x.x:8765/
```

처음에는 `data/sample-lvp.xlsx` (가짜 데이터) 를 읽습니다. 고객에 "아우디" 를 넣고 끝까지 눌러 보세요.

## 3. 실제 데이터로 바꾸기

1. 생산 전망 엑셀을 `data/` 에 복사합니다. 예: `data/lvp-2026q3.xlsx`
2. `config/settings.ini` 를 메모장으로 열어 바꿉니다.
   ```
   [data]
   file = data/lvp-2026q3.xlsx
   vintage = 2026 Q3 전망
   ```
3. `run.bat` 을 다시 실행합니다. 열 이름이 달라 못 읽으면 창과 화면에 어느 열을 못 찾았는지 나옵니다.
   그 열 이름을 `config/columns.ini` 에 적습니다 (`prompts/10-column-names.md`).

데이터 파일을 같은 이름으로 덮어쓰면 프로그램을 다시 켜지 않아도 다음 화면 요청 때 새로 읽습니다.
처음 읽을 때는 행 수에 따라 시간이 걸리고, 그 뒤에는 `data/.cache/` 에 저장해 둔 결과를 씁니다.

## 4. exe 만들기와 서버로 띄우기

1. `build-exe.bat` 을 실행합니다 (Python 3.10 ~ 3.14 필요, 인터넷 불필요).
   `vendor/` 의 휠로 PyInstaller 를 설치하고, 자체 점검을 돌린 뒤 `dist\rfx-volume\rfx-volume.exe` 를 만듭니다.
2. `dist\rfx-volume` 폴더를 통째로 서버 PC (또는 내 PC) 에 둡니다. exe 혼자서는 돌지 않습니다.
   옆의 `web/`, `config/`, `data/` 가 같이 있어야 합니다.
3. 실제 데이터 파일과 고친 설정을 `dist\rfx-volume\data`, `dist\rfx-volume\config` 에 넣습니다.
   서버로 쓸 때는 `settings.ini` 의 `open_browser = no` 로 바꿉니다.
4. `rfx-volume.exe` 를 실행합니다. 창을 닫으면 서버가 꺼집니다.
5. 다른 PC 에서 접속이 안 되면 서버 PC 의 Windows 방화벽에서 8765 포트(TCP 인바운드)를 열어야 합니다. 보통 IT 담당 승인이 필요합니다.

화면이나 설정만 바꿨으면 exe 를 다시 만들 필요 없이 `web/`, `config/` 파일만 바꾸고 브라우저를 새로 고칩니다.
`app/` 의 Python 코드를 바꿨을 때만 `build-exe.bat` 을 다시 실행합니다.

## 5. 포탈에 연결

mi-portal 에 "서버가 필요한 앱" 으로 등록합니다 (`docs/app-integration.md` 의 "서버가 필요한 앱").

```python
export_module(portal_dir=r"C:\portal", module_id="rfx-volume", title="차량 물동 적정성 평가",
              app_entry="http://<서버 IP>:8765/")
```

포탈이 `https://` 로 열리면 브라우저가 `http://` 화면을 포탈 안에 띄우지 않습니다. 그때는 포탈에서 새 창으로 열게 하세요.

## 6. 확인

- `python -m unittest discover -s tests` : 34개 통과
- 화면 오른쪽 위에 데이터 파일 이름과 기준 시점, 차종 세대 수가 나오면 정상

## 문제가 생기면

| 증상 | 원인과 조치 |
| --- | --- |
| "포트 8765 을 열 수 없습니다" | 이미 켜져 있거나 다른 프로그램이 씀. `settings.ini` 의 `port` 를 바꿈 |
| "머리글 행을 찾지 못했습니다" | `config/columns.ini` 의 열 이름이 실제 파일과 다름 |
| 지역이 영어로 나옴 | `config/regions.csv` 에 그 지역 이름이 없음. 한 줄 추가 |
| 고객 이름을 못 찾음 | `config/aliases.csv` 에 별칭 추가 (저장 후 새로 고치면 반영) |
| 다른 PC 에서 접속 안 됨 | 방화벽, 또는 `settings.ini` 의 `host` 가 `127.0.0.1` |
| exe 실행이 막힘 | 보안 솔루션. `run.bat` 으로 같은 서버를 켤 수 있음 |
