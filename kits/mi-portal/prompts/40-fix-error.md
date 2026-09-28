# 오류 고치기

오류 문구를 설명 없이 그대로 붙여 넣는 편이 결과가 좋습니다.

```
아래 오류를 고친다. 프로젝트 지침의 규칙을 따른다.
새 패키지를 설치하거나 package.json 을 고치는 방법은 쓰지 않는다.
원인을 한두 문장으로 말하고, 고친 파일 하나를 전체로 준다. 파일이 둘 이상 필요하면 첫 파일만 주고 나머지는 이름만 말한다.

[어디서]
〈npm run check / npm test / npm run build:single / 브라우저 F12 콘솔 / 화면이 이상함〉

[오류 문구]
〈그대로 붙여 넣기〉

[관련 파일]
〈오류에 나온 파일 경로와 그 파일 내용〉
```

## 자주 나오는 것

| 오류 | 원인 | 고치는 방향 |
| --- | --- | --- |
| `설치되지 않은 패키지 'xxx'` | 모델이 없는 패키지를 씀 | 지침의 패키지 목록 안에서 바꿔 달라고 함 |
| `'echarts': ... <Chart> 로만` | echarts 직접 import | `@/components/mi/chart` 의 Chart 로 |
| `외부 주소 https://...` | CDN, 외부 API | 파일을 저장소 안에 두거나 엑셀 가져오기로 |
| `Property 'xxx' does not exist on type` | 타입이 안 맞음 | 오류 줄의 데이터 모양(type)을 같이 붙여 넣기 |
| 콘솔 `React error #130` | `echarts-for-react/lib/core` | `npm run check` 가 잡음 |
| 메뉴를 눌러도 화면이 그대로 | `<a href="/...">` | `<Link to='/...'>` |
| 어두운 테마에서 글자가 안 보임 | 색을 직접 씀(`#333`, `text-black`) | `text-foreground`, `text-muted-foreground` |
