/**
 * ECharts 설정. 필요한 차트만 등록해서 용량을 줄였습니다.
 * 다른 차트 종류(Sankey, Radar 등)가 필요하면 'echarts/charts' 에서 가져와 use([...]) 에 추가하세요.
 *
 * 계열 색 8개는 색맹 시뮬레이션과 배경 대비 검사를 통과한 순서입니다(이 템플릿의 흰 카드와
 * 어두운 카드 #020919 기준). 순서를 바꾸거나 색을 더하지 마세요. 9개 이상이면 "기타"로 묶습니다.
 * 글자와 격자선 색은 템플릿 테마(slate)에 맞췄습니다.
 */
import * as echarts from 'echarts/core'
import {
  BarChart,
  EffectScatterChart,
  HeatmapChart,
  LineChart,
  MapChart,
  PieChart,
  ScatterChart,
} from 'echarts/charts'
import {
  DataZoomComponent,
  DatasetComponent,
  GeoComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  MarkPointComponent,
  TitleComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { feature } from 'topojson-client'
import world from 'world-atlas/countries-110m.json'

echarts.use([
  LineChart, BarChart, PieChart, ScatterChart, EffectScatterChart, HeatmapChart, MapChart,
  GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent,
  MarkAreaComponent, MarkPointComponent, VisualMapComponent, GeoComponent, TitleComponent,
  DatasetComponent, TransformComponent, CanvasRenderer,
])

/**
 * 세계 지도. 나라 이름은 영어입니다(예: 'South Korea').
 * world-atlas 원본의 러시아, 피지, 남극은 날짜변경선을 가로질러 화면에 줄무늬를 만듭니다.
 * 남극은 빼고, 나머지 둘은 서경 좌표를 360도 옮겨 이어 붙입니다.
 */
type Ring = number[][]
type CountryFeature = {
  properties: { name: string }
  geometry: { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] }
}

function worldGeoJson() {
  const geo = feature(world, world.objects.countries) as { features: CountryFeature[] }
  geo.features = geo.features.filter((f) => !/Antarctic/.test(f.properties.name))
  for (const f of geo.features) {
    if (f.properties.name !== 'Russia' && f.properties.name !== 'Fiji') continue
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    for (const poly of polys) for (const ring of poly) for (const pt of ring) if (pt[0] < 0) pt[0] += 360
  }
  return geo
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
echarts.registerMap('world', worldGeoJson() as any)

export const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

const INK = {
  light: { text: '#020618', muted: '#62748e', grid: '#e2e8f0', axis: '#cbd5e1', surface: '#ffffff', land: '#f1f5f9', border: '#e2e8f0' },
  dark: { text: '#f8fafc', muted: '#90a1b9', grid: '#1d293d', axis: '#314158', surface: '#0f172b', land: '#1d293d', border: '#314158' },
}

function makeTheme(mode: 'light' | 'dark', scale: number) {
  const ink = INK[mode]
  const px = (n: number) => Math.round(n * scale)
  const axis = {
    axisLine: { lineStyle: { color: ink.axis } },
    axisTick: { show: false },
    axisLabel: { color: ink.muted, fontSize: px(11) },
    splitLine: { lineStyle: { color: ink.grid, type: 'solid' } },
    nameTextStyle: { color: ink.muted, fontSize: px(11) },
  }
  return {
    color: SERIES_COLORS[mode],
    backgroundColor: 'transparent',
    textStyle: { color: ink.text, fontSize: px(12) },
    title: { textStyle: { color: ink.text, fontWeight: 600, fontSize: px(14) }, subtextStyle: { color: ink.muted, fontSize: px(12) } },
    legend: { textStyle: { color: ink.muted, fontSize: px(12) }, icon: 'roundRect', itemWidth: px(14), itemHeight: 3 },
    tooltip: {
      backgroundColor: ink.surface,
      borderColor: ink.border,
      borderWidth: 1,
      textStyle: { color: ink.text, fontSize: px(12) },
      axisPointer: { lineStyle: { color: ink.axis }, crossStyle: { color: ink.axis } },
    },
    categoryAxis: { ...axis, splitLine: { show: false } },
    valueAxis: axis,
    timeAxis: axis,
    line: { symbol: 'circle', symbolSize: 6, lineStyle: { width: 2 }, smooth: false },
    bar: { barMaxWidth: 24, itemStyle: { borderRadius: [4, 4, 0, 0] } },
    geo: {
      itemStyle: { areaColor: ink.land, borderColor: ink.surface, borderWidth: 0.5 },
      emphasis: { itemStyle: { areaColor: ink.grid }, label: { show: false } },
      label: { color: ink.muted, fontSize: px(11) },
    },
    dataZoom: { textStyle: { color: ink.muted, fontSize: px(11) }, borderColor: ink.border },
  }
}

const registered = new Set<string>()

/** 밝게/어둡게와 글자 크기에 맞는 차트 테마 이름. 처음 쓰는 조합이면 그때 등록합니다. */
export function chartTheme(mode: 'light' | 'dark', scale = 1): string {
  const name = `mi-${mode}-${scale}`
  if (!registered.has(name)) {
    echarts.registerTheme(name, makeTheme(mode, scale))
    registered.add(name)
  }
  return name
}

export { echarts }
