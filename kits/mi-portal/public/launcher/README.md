# MI 포탈 실행기

포탈의 "실행" 단추로 PC 에 설치된 exe 프로그램을 띄우는 장치입니다. PC 마다 한 번 등록합니다.

## 등록 (PC 마다 한 번)

1. 이 폴더의 `apps.ini` 를 메모장으로 열어 프로그램 경로가 맞는지 봅니다.
2. `register.bat` 을 더블클릭합니다. 관리자 권한은 필요 없습니다.
3. 포탈의 연결된 앱에서 실행 단추를 누릅니다. 처음에는 브라우저가 "MI Portal Launcher 를 열까요?" 하고 묻습니다.

등록을 없애려면 `unregister.bat` 을 실행합니다.

## 동작

```
포탈 실행 단추 → miportal:launch/nesting-calc 주소를 엶
             → 윈도가 등록된 실행기를 부름
               powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden
                 -File %LOCALAPPDATA%\mi-portal-launcher\launcher.ps1 "miportal:launch/nesting-calc"
             → launcher.ps1 이 apps.ini 에서 nesting-calc 를 찾아 exe 실행
```

`register.bat` 이 하는 일은 두 가지입니다.

- `launcher.ps1`, `apps.ini` 를 `%LOCALAPPDATA%\mi-portal-launcher\` 로 복사
- 현재 사용자 레지스트리 `HKCU\Software\Classes\miportal` 에 위 명령을 등록

## 안전장치

- 주소에는 프로그램 id 만 담깁니다(영문 소문자, 숫자, -). 경로나 명령을 주소로 넘길 수 없습니다.
- `apps.ini` 에 적힌 id 만 실행합니다. 웹 페이지가 다른 id 로 불러도 "목록에 없습니다" 만 뜹니다.
- 실행 파일 종류는 `.exe .lnk .bat .cmd` 만 허용합니다.
- 요청과 결과는 `%LOCALAPPDATA%\mi-portal-launcher.log` 에 남습니다.

## 프로그램 추가

1. `apps.ini` 에 `id = 경로` 한 줄을 추가합니다. 예: `psi-tool = \\fileserver\tools\PSI\PSI.exe`
2. 포탈 `src/config/apps.ts` 에 `kind: 'exe', launchId: 'psi-tool'` 항목을 추가하고 다시 빌드합니다.
3. 각 PC 에서 `register.bat` 을 다시 실행합니다(새 apps.ini 복사).

## 안 될 때

| 증상 | 원인과 조치 |
| --- | --- |
| 실행 단추를 눌러도 아무 반응이 없다 | 이 PC 에 등록이 안 됐습니다. `register.bat` 을 실행하세요. |
| "레지스트리에 쓰지 못했습니다" | 사내 보안 정책이 HKCU 쓰기를 막고 있습니다. IT 담당자에게 문의하세요. |
| 창이 잠깐 떴다가 아무것도 안 된다 | PowerShell 실행이 정책으로 막혔을 수 있습니다. 로그 파일을 확인하세요. |
| "목록에 없습니다" | `apps.ini` 에 그 id 가 없습니다. 추가하고 `register.bat` 을 다시 실행하세요. |
| "파일을 찾을 수 없습니다" | `apps.ini` 의 경로가 실제 설치 위치와 다릅니다. |
| 매번 "열까요?" 를 묻는다 | "항상 허용" 을 체크하세요. 체크 칸이 없으면 IT 담당자가 크롬/엣지 정책 `AutoLaunchProtocolsFromOrigins` 에 `miportal` 을 등록하면 묻지 않습니다. |

## 파일

- `launcher.ps1`: 실행기. Windows PowerShell 5.1 용이고 한글 문구 때문에 UTF-8 BOM 으로 저장되어 있습니다. 메모장으로 고칠 때도 인코딩을 "UTF-8(BOM)" 으로 두세요.
- `apps.ini`: 실행할 수 있는 프로그램 목록
- `register.bat`, `unregister.bat`: 등록과 해제
