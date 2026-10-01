# 결과 탭, 보고서에 항목 더하기

계산은 이미 다 되어 있습니다. 화면 파일 하나에서 결과 객체를 읽어 표나 지표를 더하는 일입니다.

```
파일: 〈src/ui/view-overview.js, src/ui/view-result.js, src/ui/view-report.js 중 하나〉
목표: 〈예: 임원 보고서 ④ 에 전략고객 OEM 별 2028F 자사 물량 열을 더한다〉

이미 있는 것 (새로 만들지 말 것):
- App.actions.scenarioSet() -> { results: {Trend, Worst, Base, Best} (월, Sim.SimResult), annual: {...} (연, Sim.AnnualResult), years, build }
- App.actions.displayFor(시나리오, 연도 인덱스) -> 지역별 디스플레이 TAM, 자사 물량, 고객 구분 합계 (Sim.DisplayResult)
- App.bars.stack / hbars / columns: 임원 보고서 막대
- App.w.kpi(label, value, sub, tone), App.w.table(columns, rows, opts), App.w.notes(list)
- App.fmt.units / pct / signedUnits / signedPct / signedPp
- App.fcChart(mount, spec): 예측 차트. spec 은 types/app.d.ts 의 FcChartSpec
- App.donut(mount, opts): 도넛 (조각 6개까지), App.worldMap(mount, opts): 세계 지도
- App.sim.display.compute(ds, vehicles, App.state.display): 지역별 디스플레이 수요와 우리 몫
- App.w.brandColor(ds, brand): 브랜드 고유 색, App.w.segmented / head / help: 화면 조각
- App.sim.geo.regionLabel(r): '북미 (NA)' 같은 지역 이름
- 지역 키에는 App.sim.TOTAL('전체') 이 포함된다. 브랜드 목록 끝은 App.sim.OTHER('기타')
  전체 시그니처는 types/sim.d.ts, types/app.d.ts

할 일:
- 〈구체적으로 한 가지〉

금지:
- src/model/ 수정 (계산이 더 필요하면 코드를 쓰지 말고 무엇이 필요한지 말할 것)
- 새 hex 색, 외부 라이브러리, 다른 파일 수정

완료 기준:
- index.html 을 열고 "예시 데이터로 시작" 후 해당 탭에서 새 항목이 보인다
- 화면 전환(다크)에서도 글자가 보인다
- 새 문구가 SPEC.md 2절 용어(TAM, M/S, Powertrain, Worst/Base/Best)를 따른다
- 콘솔(F12)에 오류가 없다
```
