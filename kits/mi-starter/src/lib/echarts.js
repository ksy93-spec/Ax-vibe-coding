// ECharts 설정. 필요한 차트만 등록해서 용량을 줄였습니다.
// 다른 차트 종류가 필요하면 아래 use([...]) 에 추가하세요.
//
// 계열 색 8개는 색맹 시뮬레이션과 배경 대비 검사를 통과한 순서입니다.
// 순서를 바꾸거나 색을 더하지 마세요. 9개 이상이면 "기타"로 묶거나 차트를 나눕니다.

import * as echarts from 'echarts/core';
import {
  LineChart, BarChart, PieChart, ScatterChart, EffectScatterChart, HeatmapChart, MapChart,
} from 'echarts/charts';
import {
  GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent,
  MarkAreaComponent, MarkPointComponent, VisualMapComponent, GeoComponent, TitleComponent,
  DatasetComponent, TransformComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';

echarts.use([
  LineChart, BarChart, PieChart, ScatterChart, EffectScatterChart, HeatmapChart, MapChart,
  GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent,
  MarkAreaComponent, MarkPointComponent, VisualMapComponent, GeoComponent, TitleComponent,
  DatasetComponent, TransformComponent, CanvasRenderer,
]);

// 세계 지도. 나라 이름은 영어입니다 (예: 'South Korea', 'United States of America').
// world-atlas 원본에서 러시아, 피지, 남극은 날짜변경선(180도)을 가로지르는 폴리곤이라
// 그대로 그리면 화면을 가로지르는 줄무늬가 생깁니다. 남극은 빼고, 나머지 둘은 서경 좌표를
// 360도 옮겨 동쪽으로 이어 붙입니다.
function worldGeoJson() {
  const geo = feature(world, world.objects.countries);
  geo.features = geo.features.filter((f) => !/Antarctic/.test(f.properties.name));
  for (const f of geo.features) {
    if (f.properties.name !== 'Russia' && f.properties.name !== 'Fiji') continue;
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
    for (const poly of polys) for (const ring of poly) for (const pt of ring) if (pt[0] < 0) pt[0] += 360;
  }
  return geo;
}
echarts.registerMap('world', worldGeoJson());

export const SERIES_COLORS = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
};

const INK = {
  light: { text: '#16191d', muted: '#5c6672', subtle: '#8a94a0', grid: '#e1e0d9', axis: '#c3c2b7', surface: '#ffffff', land: '#eef0f3', border: '#c3cad3' },
  dark: { text: '#e6e9ed', muted: '#9aa4b1', subtle: '#6d7784', grid: '#2c2c2a', axis: '#383835', surface: '#1c2026', land: '#242931', border: '#3d4550' },
};

function makeTheme(mode) {
  const ink = INK[mode];
  const axis = {
    axisLine: { lineStyle: { color: ink.axis } },
    axisTick: { show: false },
    axisLabel: { color: ink.subtle, fontSize: 11 },
    splitLine: { lineStyle: { color: ink.grid, type: 'solid' } },
    nameTextStyle: { color: ink.muted },
  };
  return {
    color: SERIES_COLORS[mode],
    backgroundColor: 'transparent',
    textStyle: { fontFamily: "'Pretendard Variable', 'Malgun Gothic', sans-serif", color: ink.text },
    title: { textStyle: { color: ink.text, fontWeight: 600, fontSize: 15 }, subtextStyle: { color: ink.muted } },
    legend: { textStyle: { color: ink.muted }, icon: 'roundRect', itemWidth: 14, itemHeight: 3 },
    tooltip: {
      backgroundColor: ink.surface, borderColor: ink.border, borderWidth: 1,
      textStyle: { color: ink.text, fontSize: 12 },
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
      label: { color: ink.muted },
    },
    dataZoom: { textStyle: { color: ink.muted }, borderColor: ink.border },
  };
}

echarts.registerTheme('portal-light', makeTheme('light'));
echarts.registerTheme('portal-dark', makeTheme('dark'));

export { echarts };
