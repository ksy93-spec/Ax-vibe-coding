# CI 마크 출처

`scripts/build-logos.cjs` 가 만든 파일입니다. npm `simple-icons@16.35.0` (패키지 라이선스 CC0-1.0) 의 아이콘 경로에
브랜드 색(fill)만 넣었습니다. 모양은 고치지 않았습니다. 모든 파일에 width, height 를 viewBox 크기로 넣어 가로로 긴 글자 로고를 화면이 알아보게 했습니다.

아이콘 데이터는 CC0 이지만 마크 자체는 각 회사의 상표입니다. 사내 자료에서 회사를 알아보는 용도로만 씁니다.
홍보물이나 외부 배포 자료에 쓸 때는 각 회사 브랜드 지침을 따릅니다. 원문: `../licenses/simple-icons-DISCLAIMER.md`

| 파일 | 회사 | simple-icons slug | 색 | 아이콘 라이선스 | 브랜드 지침 |
| --- | --- | --- | --- | --- | --- |
| `gm.svg` | General Motors | `generalmotors` | #0170CE | 표기 없음 | - |
| `tesla.svg` | Tesla | `tesla` | #CC0000 | 표기 없음 | - |
| `hyundai.svg` | Hyundai | `hyundai` | #002C5E | 표기 없음 | - |
| `kia.svg` | Kia | `kia` | #05141F | 표기 없음 | - |
| `honda.svg` | Honda | `honda` | #E40521 | 표기 없음 | - |
| `toyota.svg` | Toyota | `toyota` | #EB0A1E | 표기 없음 | https://www.toyota.com/brandguidelines/ |
| `audi.svg` | Audi | `audi` | #BB0A30 | 표기 없음 | https://www.audi.com/ci/en/intro/basics/rings.html |
| `vw.svg` | Volkswagen | `volkswagen` | #151F5D | 표기 없음 | - |
| `bmw.svg` | BMW | `bmw` | #0066B1 | 표기 없음 | - |
| `porsche.svg` | Porsche | `porsche` | #B12B28 | 표기 없음 | - |
| `volvo.svg` | Volvo | `volvo` | #003057 | 표기 없음 | - |


아래 6개는 2026-11-02 에 더했습니다. 마크는 모두 각 회사 상표이고, 위와 같이 회사를 알아보는 용도로만 씁니다.

| 파일 | 회사 | 출처 | 받은 파일의 저장소 라이선스 | 손댄 곳 |
| --- | --- | --- | --- | --- |
| `mercedes.svg` | Mercedes-Benz | npm `simple-icons@13.21.0` `mercedes` (이후 판에서 빠짐) | CC0-1.0 | 색 #242424 만 넣음 |
| `jlr.svg` | JLR | npm `simple-icons@13.21.0` `landrover` (작은 칸에서 알아보기 쉬운 Land Rover 마크를 씀) | CC0-1.0 | 색 #005A2B 만 넣음 |
| `aumovio.svg` | AUMOVIO | github.com/vinersar31/portfolio `public/images/companies/aumovio.svg` | MIT (저장소 코드) | 글자를 빼고 주황 심볼 경로만 남김 (viewBox 조정) |
| `denso.svg` | DENSO | github.com/detain/svg-logos `svg/d/denso-2.svg` | MIT (저장소 코드) | 흰 배경 사각형을 빼고 viewBox 를 글자에 맞춤 |
| `alps.svg` | ALPS ALPINE | github.com/antmicro/vendor-list `vendor-icons/alps-alpine.svg` | Apache-2.0 (저장소 코드) | viewBox 를 마크에 맞춤 |
| `visteon.svg` | Visteon | github.com/OpenChain-Project/landscape `hosted_logos/visteon.svg` | Apache-2.0, 로고는 회사 저작권이라고 명시 | viewBox 를 글자에 맞춤 |

저장소 라이선스는 저장소 코드에 대한 것이고 마크 자체의 권리를 주지 않습니다. 반입 심사에서 문제가 되면 이 6개 파일을 지우고
`data/companies.js` 의 해당 "logo" 를 빈 문자열로 두면 글자 마크로 돌아갑니다.
사내에서 관리 탭의 "로고 바꾸기" 로 SVG 나 PNG 를 넣으면 `data/companies.js` 에 저장됩니다.
