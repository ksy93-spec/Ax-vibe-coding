# 설치와 실행

포탈 자체는 설치할 것이 없습니다. 모듈 데이터를 내보낼 때만 파이썬이 필요합니다.

## 1. 압축 해제

한글과 공백이 없는 경로에 풉니다. 공유 폴더에 두면 여러 사람이 같이 봅니다.
예: `\\사내공유\\portal` 또는 `C:\\portal`

## 2. 실행

`index.html` 을 더블클릭합니다. 끝입니다.

## 3. 확인

- [ ] 왼쪽에 개요, 원자재 가격 모니터, 경쟁사 동향이 보인다
- [ ] 글꼴이 시스템 기본 고딕이 아니라 Pretendard 로 보인다
- [ ] 차트 위에 마우스를 올리면 세로선과 값 상자가 따라온다
- [ ] 차트를 클릭해 포커스를 준 뒤 좌우 방향키로 값이 바뀐다
- [ ] "표로 보기" 를 누르면 같은 값이 표로 나온다
- [ ] "화면 전환" 으로 어두운 화면이 된다
- [ ] 브라우저 콘솔(F12)에 빨간 에러가 없다

## 4. 모듈 추가하기

담당자마다 자기 모듈 하나를 맡습니다. 기존 수집/가공 코드는 그대로 두고,
마지막에 결과만 내보내면 됩니다.

```python
import sys
sys.path.insert(0, r"C:\portal\tools")
from portal_export import export_module

# ... 여기까지는 지금 쓰던 코드 그대로 ...

export_module(
    portal_dir=r"C:\portal",
    module_id="my_module",           # 영소문자, 숫자, 밑줄만
    title="내 기능 이름",
    owner="홍길동",
    format="number",                 # number | won | percent
    description="한 줄 설명",
    kpis=[
        {"label": "이번 달", "value": 128, "unit": "건",
         "delta": "+12건 전월 대비", "tone": "warn"},
    ],
    charts=[
        {"type": "line", "title": "월별 추이", "x": months,
         "series": [{"name": "A", "values": values}]},
    ],
    table={"columns": ["월", "값"], "rows": rows},
)
```

`data/my_module/data.js` 가 만들어지고 `data/modules.js` 에 자동 등록됩니다.
브라우저를 새로 고치면 화면에 뜹니다. 포탈 코드는 건드리지 않습니다.

계약을 어기면 파일을 쓰지 않고 무엇이 잘못됐는지 알려 줍니다.
그대로 고치면 됩니다.

### 파이썬 없이 만들 때

엑셀이나 다른 도구로 작업한다면 `data/<id>/data.js` 를 직접 써도 됩니다.
형식은 이것뿐입니다.

```js
window.__PORTAL__ = window.__PORTAL__ || {};
window.__PORTAL__["my_module"] = { "title": "...", "kpis": [], "charts": [] };
```

그리고 `data/modules.js` 의 목록에 `"my_module"` 을 넣습니다.

## 5. 자체 점검

```
python tools\test_portal_export.py
```

16건이 전부 통과하면 내보내기 도구가 정상입니다.

## 문제가 생기면

**모듈이 화면에 안 나온다**
`data/modules.js` 에 이름이 있는지, `data/<이름>/data.js` 가 있는지 확인하세요.
왼쪽 아래에 "불러오지 못한 모듈" 로 표시됩니다.

**모듈 이름 옆에 느낌표가 뜬다**
계약을 어겼습니다. 그 모듈을 누르면 무엇이 잘못됐는지 나옵니다.

**화면이 통째로 비어 있다**
콘솔(F12)을 여세요. `data.js` 안의 따옴표가 깨졌을 가능성이 큽니다.
직접 손으로 고치지 말고 `export_module` 로 다시 만드세요.

**차트의 선이 전부 평평하다**
자릿수가 다른 값을 한 차트에 넣었습니다. 축을 두 개 쓰지 말고
같은 기준으로 지수화하거나 차트를 나누세요. MANIFEST.md 를 보세요.

**글꼴이 기본 고딕으로 보인다**
`assets/fonts/PretendardVariable.subset.woff2` 가 있는지 확인하세요.
전송 중 바이너리가 깨졌을 수 있습니다.

**`Cross origin requests are only supported for HTTP` 에러**
누군가 `<script type="module">` 을 넣었거나 `fetch` 로 로컬 파일을 읽으려 했습니다.
`file://` 에서는 둘 다 안 됩니다. `data.js` 방식을 그대로 쓰세요.
