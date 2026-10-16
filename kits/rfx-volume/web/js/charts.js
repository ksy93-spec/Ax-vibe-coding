// ECharts 6.1.0 로 그리는 차트 모음. echarts 는 index.html 에서 vendor/echarts/echarts.min.js 로 읽습니다 (전역 변수).
// 색은 tokens.css 의 --viz-* 를 실행 중에 읽어 씁니다. 계열 색 순서는 바꾸거나 돌려 쓰지 마세요.
/* global echarts */

const live = new Map(); // 요소 -> 차트

function css(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function theme() {
  return {
    series: [1, 2, 3, 4, 5, 6, 7, 8].map(i => css('--viz-' + i)),
    risk: css('--viz-critical'),
    opp: css('--viz-1'),
    good: css('--viz-good'),
    fg: css('--c-fg'),
    muted: css('--c-fg-muted'),
    subtle: css('--c-fg-subtle'),
    grid: css('--viz-grid'),
    axis: css('--viz-axis'),
    bg: css('--c-bg'),
    raised: css('--c-bg-raised'),
    border: css('--c-border'),
    accentBg: css('--c-accent-bg'),
    dangerBg: css('--c-danger-bg'),
    font: css('--font-sans') || 'sans-serif',
  };
}

const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtK = v => nf1.format(v / 1000);
export const fmtKs = v => (v > 0 ? '+' : '') + nf1.format(v / 1000);
export const fmtAxis = v => {
  const a = Math.abs(v);
  if (a >= 1e6) return nf1.format(v / 1e6) + 'M';
  if (a >= 1000) return nf0.format(v / 1000) + 'K';
  return nf0.format(v);
};
const pct = v => v == null ? '-' : nf0.format(v * 100) + '%';

function base(t, { toolbox = true } = {}) {
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: t.font, color: t.muted },
    animationDuration: 700,
    animationEasing: 'cubicOut',
    grid: { left: 8, right: 20, top: 44, bottom: 4, containLabel: true },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 8, itemGap: 16, textStyle: { color: t.muted, fontSize: 12 } },
    tooltip: {
      trigger: 'axis', confine: true, backgroundColor: t.raised, borderColor: t.border, borderWidth: 1, padding: [8, 12],
      textStyle: { color: t.fg, fontSize: 12, fontFamily: t.font },
      extraCssText: 'border-radius:10px;box-shadow:0 8px 24px rgba(16,24,40,.16);',
      axisPointer: { type: 'shadow', shadowStyle: { color: t.grid, opacity: .45 } },
    },
    toolbox: toolbox ? {
      right: 0, top: -4, itemSize: 14, iconStyle: { borderColor: t.subtle },
      feature: { saveAsImage: { title: '그림 저장', pixelRatio: 2, backgroundColor: t.bg, name: 'rfx-volume' } },
    } : undefined,
  };
}

function catAxis(t, data, extra = {}) {
  return { type: 'category', data, axisTick: { show: false }, axisLine: { lineStyle: { color: t.axis } }, axisLabel: { color: t.muted }, ...extra };
}
function valAxis(t, fmt = fmtAxis, extra = {}) {
  return { type: 'value', splitLine: { lineStyle: { color: t.grid, type: [4, 4] } }, axisLabel: { color: t.muted, formatter: fmt }, ...extra };
}

function tipRows(params, fmt) {
  const list = Array.isArray(params) ? params : [params];
  const head = `<div style="font-weight:700;margin-bottom:4px">${list[0].axisValueLabel ?? list[0].name}</div>`;
  return head + list.filter(p => p.value != null && p.seriesName && !p.seriesName.startsWith('_')).map(p =>
    `<div style="display:flex;gap:12px;align-items:center"><span>${p.marker}${p.seriesName}</span><b style="margin-left:auto">${fmt(Array.isArray(p.value) ? p.value[1] : p.value, p)}</b></div>`).join('');
}

export function mount(el, option) {
  let chart = live.get(el);
  if (chart && chart.isDisposed()) chart = null;
  if (!chart) {
    chart = echarts.init(el, null, { renderer: 'svg' });
    live.set(el, chart);
    new ResizeObserver(() => chart.isDisposed() || chart.resize()).observe(el);
  }
  chart.setOption(option, true);
  return chart;
}

export function disposeIn(root) {
  for (const [el, chart] of live) {
    if (root.contains(el) || !document.body.contains(el)) { chart.dispose(); live.delete(el); }
  }
}

// ---------------------------------------------------------------- 결과 화면

/** 연도별 예상 물동(조사기관)과 고객 물동 */
export function volumeCompare(el, { years, expected, customer }) {
  const t = theme();
  return mount(el, {
    ...base(t),
    tooltip: { ...base(t).tooltip, formatter: p => tipRows(p, v => fmtK(v) + ' Kpcs') },
    xAxis: catAxis(t, years),
    yAxis: valAxis(t),
    series: [
      { name: '예상 물동 (조사기관)', type: 'bar', data: expected, barGap: '12%', barMaxWidth: 22, itemStyle: { color: t.series[0], borderRadius: [4, 4, 0, 0] } },
      { name: '고객 물동', type: 'bar', data: customer, barMaxWidth: 22, itemStyle: { color: t.series[1], borderRadius: [4, 4, 0, 0] } },
    ],
  });
}

/** 연도별 수량 Gap. 음수 Risk, 양수 Opportunity */
export function gapBars(el, { years, gap, ratio, amount, currency }) {
  const t = theme();
  return mount(el, {
    ...base(t),
    legend: { ...base(t).legend, data: [{ name: 'Risk', itemStyle: { color: t.risk } }, { name: 'Opportunity', itemStyle: { color: t.opp } }] },
    tooltip: {
      ...base(t).tooltip,
      formatter: p => {
        const i = p[0].dataIndex;
        if (gap[i] == null) return `<b>${years[i]}</b><br>고객 물동 없음`;
        const kind = gap[i] < 0 ? 'Risk' : 'Opportunity';
        let s = `<div style="font-weight:700;margin-bottom:4px">${years[i]} · ${kind}</div>수량 Gap <b style="float:right;margin-left:16px">${fmtKs(gap[i])} Kpcs</b>`;
        if (ratio[i] != null) s += `<br>Gap 비율 <b style="float:right">${(ratio[i] > 0 ? '+' : '') + nf1.format(ratio[i] * 100)}%</b>`;
        if (amount[i] != null) s += `<br>금액 Gap <b style="float:right">${nf1.format(amount[i] / 1e6)} M${currency}</b>`;
        return s;
      },
    },
    xAxis: catAxis(t, years, { axisLine: { onZero: true, lineStyle: { color: t.axis } } }),
    yAxis: valAxis(t),
    series: [
      { name: 'Risk', type: 'bar', data: [], itemStyle: { color: t.risk } },
      { name: 'Opportunity', type: 'bar', data: [], itemStyle: { color: t.opp } },
      {
        name: '수량 Gap', type: 'bar', barMaxWidth: 28, barGap: '-100%',
        data: gap.map(v => v == null ? null : { value: v, itemStyle: { color: v < 0 ? t.risk : t.opp, borderRadius: v < 0 ? [0, 0, 4, 4] : [4, 4, 0, 0] } }),
        label: { show: true, position: 'outside', formatter: p => fmtK(p.value), color: t.muted, fontSize: 10 },
        labelLayout: { hideOverlap: true },
      },
    ],
  });
}

/** 누적 수량 Gap. 0 아래는 빨간 면, 위는 파란 면 */
export function cumulative(el, { years, cum }) {
  const t = theme();
  const last = [...cum].reverse().find(v => v != null) ?? 0;
  return mount(el, {
    ...base(t),
    legend: { show: false },
    tooltip: { ...base(t).tooltip, axisPointer: { type: 'line', lineStyle: { color: t.axis } }, formatter: p => tipRows(p, v => fmtKs(v) + ' Kpcs') },
    xAxis: catAxis(t, years, { boundaryGap: false }),
    yAxis: valAxis(t),
    series: [{
      name: '누적 수량 Gap', type: 'line', connectNulls: false, smooth: .25, symbol: 'circle', symbolSize: 8,
      data: cum.map(v => v == null ? null : { value: v, itemStyle: { color: v < 0 ? t.risk : t.opp, borderColor: t.bg, borderWidth: 2 } }),
      lineStyle: { width: 2.5, color: last < 0 ? t.risk : t.opp },
      areaStyle: { color: last < 0 ? t.risk : t.opp, opacity: .12 },
      markLine: { silent: true, symbol: 'none', data: [{ yAxis: 0 }], lineStyle: { color: t.axis, type: 'solid' }, label: { show: false } },
      endLabel: { show: true, formatter: p => fmtKs(p.value) + 'K', color: t.fg, fontWeight: 700 },
    }],
    grid: { ...base(t).grid, top: 24, right: 56 },
  });
}

/** 고객 물동을 맞추려면 필요한 옵션율 */
export function impliedOption(el, { years, implied, input }) {
  const t = theme();
  const max = Math.max(1.1, ...implied.filter(v => v != null).map(v => v * 1.1));
  return mount(el, {
    ...base(t),
    legend: { show: false },
    tooltip: { ...base(t).tooltip, axisPointer: { type: 'line', lineStyle: { color: t.axis } }, formatter: p => tipRows(p, pct) },
    xAxis: catAxis(t, years, { boundaryGap: false }),
    yAxis: valAxis(t, pct, { max: Math.ceil(max * 10) / 10 }),
    series: [{
      name: '필요 옵션율', type: 'line', data: implied, smooth: .25, symbol: 'circle', symbolSize: 8,
      lineStyle: { width: 2.5, color: t.series[1] }, itemStyle: { color: t.series[1] },
      markArea: { silent: true, itemStyle: { color: t.risk, opacity: .08 }, data: [[{ yAxis: 1 }, { yAxis: Math.ceil(max * 10) / 10 }]],
        label: { show: true, position: 'insideTopRight', formatter: '100% 초과: 불가능한 물동', color: t.risk, fontSize: 11 } },
      markLine: {
        silent: true, symbol: 'none',
        data: [{ yAxis: input, name: '입력' }],
        lineStyle: { color: t.fg, type: [6, 4] }, label: { formatter: `현재 입력 ${pct(input)}`, position: 'insideEndTop', color: t.fg },
      },
    }],
    grid: { ...base(t).grid, top: 24 },
  });
}

/** 차종별 예상 물동 (쌓은 막대) + 고객 물동 꺾은선 */
export function vehicleStack(el, { years, series, customer }) {
  const t = theme();
  const s = series.map((se, i) => ({
    name: se.name, type: 'bar', stack: 'v', data: se.values, barMaxWidth: 40,
    itemStyle: { color: t.series[i], borderColor: t.bg, borderWidth: 1 },
    emphasis: { focus: 'series' },
  }));
  if (s.length) s[s.length - 1].itemStyle.borderRadius = [4, 4, 0, 0];
  if (customer) {
    s.push({ name: '고객 물동', type: 'line', data: customer, symbol: 'circle', symbolSize: 8, z: 5,
      lineStyle: { color: t.fg, width: 2 }, itemStyle: { color: t.fg, borderColor: t.bg, borderWidth: 2 } });
  }
  return mount(el, {
    ...base(t),
    legend: { ...base(t).legend, type: 'scroll', right: 40 },
    tooltip: { ...base(t).tooltip, formatter: p => tipRows(p, v => fmtK(v) + ' Kpcs') },
    xAxis: catAxis(t, years),
    yAxis: valAxis(t),
    series: s,
  });
}

/** 차종 수명 (SOP ~ EOP) 기간 막대. 음영은 고객 물동이 있는 연도 */
export function lifecycle(el, { items, years, demand }) {
  const t = theme();
  const y0 = years[0], y1 = years[years.length - 1] + 1;
  const pos = v => v ? v[0] + (v[1] - 1) / 12 : null;
  const starts = items.map(it => Math.max(y0, pos(it.start) ?? y0));
  const ends = items.map(it => Math.min(y1, it.end ? it.end[0] + it.end[1] / 12 : y1));
  // 연속된 연도를 한 구간으로
  const spans = [];
  for (const y of [...demand].sort()) {
    const last = spans[spans.length - 1];
    if (last && last[1] === y) last[1] = y + 1; else spans.push([y, y + 1]);
  }
  const ym = v => v ? `${v[0]}.${String(v[1]).padStart(2, '0')}` : '정보 없음';
  el.style.height = Math.max(150, 70 + items.length * 34) + 'px';
  return mount(el, {
    ...base(t),
    legend: { show: false },
    tooltip: {
      ...base(t).tooltip, trigger: 'item',
      formatter: p => { const it = items[p.dataIndex]; return `<b>${it.label}</b><br>SOP ${ym(it.start)}<br>EOP ${ym(it.end)}`; },
    },
    grid: { left: 8, right: 24, top: 8, bottom: 4, containLabel: true },
    xAxis: { type: 'value', min: y0, max: y1, interval: 1, axisLabel: { color: t.muted, formatter: v => v < y1 ? String(v) : '' },
      splitLine: { lineStyle: { color: t.grid } } },
    yAxis: { type: 'category', data: items.map(it => it.label), inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: t.fg, fontWeight: 600 } },
    series: [
      { name: '_base', type: 'bar', stack: 'l', data: starts, itemStyle: { color: 'transparent' }, silent: true, tooltip: { show: false }, barWidth: 16 },
      {
        name: '수명', type: 'bar', stack: 'l', data: ends.map((e, i) => Math.max(0, e - starts[i])), barWidth: 16,
        itemStyle: { color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [{ offset: 0, color: t.series[0] }, { offset: 1, color: t.series[2] }]), borderRadius: 8 },
        label: { show: true, position: 'insideLeft', color: '#fff', fontSize: 11, fontWeight: 600,
          formatter: p => { const it = items[p.dataIndex]; return `${ym(it.start)} ~ ${ym(it.end)}`; } },
        markArea: { silent: true, itemStyle: { color: t.accentBg, opacity: .9 }, label: { show: false },
          data: spans.map(([a, b]) => [{ xAxis: a }, { xAxis: b }]) },
      },
    ],
  });
}

/** 연도별 생산 지역 비중 (100% 쌓은 면) */
export function regionShare(el, { years, regions, values }) {
  const t = theme();
  const tot = years.map((_, i) => regions.reduce((s, r) => s + (values[r][i] || 0), 0));
  return mount(el, {
    ...base(t),
    tooltip: { ...base(t).tooltip, axisPointer: { type: 'line', lineStyle: { color: t.axis } }, formatter: p => tipRows(p, v => nf1.format(v) + '%') },
    xAxis: catAxis(t, years, { boundaryGap: false }),
    yAxis: valAxis(t, v => v + '%', { max: 100 }),
    series: regions.map((r, k) => ({
      name: r, type: 'line', stack: 'r', smooth: .2, symbol: 'none', lineStyle: { width: 1, color: t.bg },
      areaStyle: { color: t.series[k], opacity: .92 }, itemStyle: { color: t.series[k] },
      data: years.map((_, i) => tot[i] ? Math.round(values[r][i] / tot[i] * 1000) / 10 : null),
    })),
  });
}

/** 지역 비중 도넛 */
export function donut(el, { items, center }) {
  const t = theme();
  const total = items.reduce((s, x) => s + x.value, 0) || 1;
  return mount(el, {
    ...base(t, { toolbox: false }),
    legend: { show: false },
    tooltip: { ...base(t).tooltip, trigger: 'item', formatter: p => `${p.marker}${p.name}<b style="float:right;margin-left:16px">${nf1.format(p.value / total * 100)}%</b>` },
    title: { text: center[0], subtext: center[1], left: 'center', top: '40%', textStyle: { color: t.fg, fontSize: 22, fontWeight: 800 }, subtextStyle: { color: t.muted, fontSize: 12 }, itemGap: 2 },
    series: [{
      type: 'pie', radius: ['58%', '82%'], padAngle: 2, itemStyle: { borderRadius: 6, borderColor: t.bg, borderWidth: 2 },
      label: { show: true, formatter: p => `${p.name}\n${Math.round(p.percent)}%`, color: t.fg, fontSize: 11, lineHeight: 15 },
      labelLine: { length: 8, length2: 6, lineStyle: { color: t.axis } },
      data: items.map((x, i) => ({ name: x.name, value: x.value, itemStyle: { color: x.color || t.series[i], opacity: x.dim ? .25 : 1 } })),
    }],
  });
}

/** 물동 브리지: 생산 대수 → 옵션 → 이원화 → 대당 사용량 → 예상 물동, 고객 물동과 비교 */
export function bridge(el, { steps }) {
  // steps: [{name, value, kind: 'total'|'delta'}]
  const t = theme();
  const cats = steps.map(s => s.name);
  const baseVals = [], vis = [], colors = [];
  let run = 0;
  for (const s of steps) {
    if (s.kind === 'total') {
      baseVals.push(0); vis.push(s.value); run = s.value;
      colors.push(s.color || t.series[0]);
    } else {
      const next = run + s.value;
      baseVals.push(Math.min(run, next)); vis.push(Math.abs(s.value));
      colors.push(s.value < 0 ? t.subtle : t.series[2]);
      run = next;
    }
  }
  return mount(el, {
    ...base(t),
    legend: { show: false },
    tooltip: {
      ...base(t).tooltip,
      formatter: p => { const i = p[0].dataIndex; const s = steps[i]; return `<b>${s.name}</b><br>${s.kind === 'total' ? fmtK(s.value) : fmtKs(s.value)} K${s.unit || 'pcs'}${s.note ? '<br><span style="opacity:.7">' + s.note + '</span>' : ''}`; },
    },
    grid: { ...base(t).grid, top: 28 },
    xAxis: catAxis(t, cats, { axisLabel: { color: t.fg, fontWeight: 600, interval: 0 } }),
    yAxis: valAxis(t),
    series: [
      { name: '_base', type: 'bar', stack: 'b', data: baseVals, itemStyle: { color: 'transparent' }, silent: true },
      {
        name: '값', type: 'bar', stack: 'b', barMaxWidth: 64,
        data: vis.map((v, i) => ({ value: v, itemStyle: { color: colors[i], borderRadius: 6 } })),
        label: { show: true, position: 'top', color: t.fg, fontWeight: 700, fontSize: 12,
          formatter: p => { const s = steps[p.dataIndex]; return (s.kind === 'total' ? fmtK(s.value) : fmtKs(s.value)) + 'K'; } },
      },
    ],
  });
}

/** 민감도 히트맵: 옵션율 x 자사 비중 -> 누적 수량 Gap */
export function sensitivity(el, { steps, grid, option, share, dual }) {
  const t = theme();
  const xs = steps.map(d => `${Math.max(0, Math.min(100, option + d))}%`);
  const rows = dual ? steps : [0];
  const ys = rows.map(d => dual ? `${Math.max(0, Math.min(100, share + d))}%` : '누적 Gap');
  const data = [];
  const mid = steps.indexOf(0);
  rows.forEach((d, yi) => {
    const line = grid[steps.indexOf(d)];
    line.forEach((v, xi) => data.push([xi, yi, v]));
  });
  const maxAbs = Math.max(1, ...data.map(d => Math.abs(d[2])));
  const cells = data.map(d => {
    const cur = d[0] === mid && rows[d[1]] === 0;
    return { value: d, itemStyle: cur ? { borderColor: t.fg, borderWidth: 3 } : undefined,
      label: { color: Math.abs(d[2]) / maxAbs > .55 ? '#fff' : t.fg, fontWeight: cur ? 800 : 600 } };
  });
  el.style.height = (dual ? 300 : 140) + 'px';
  return mount(el, {
    ...base(t),
    tooltip: { ...base(t).tooltip, trigger: 'item', formatter: p => `옵션율 <b>${xs[p.value[0]]}</b>${dual ? ` · 자사 비중 <b>${ys[p.value[1]]}</b>` : ''}<br>누적 수량 Gap <b>${fmtKs(p.value[2])} Kpcs</b>` },
    grid: { left: 8, right: 8, top: 8, bottom: 56, containLabel: true },
    xAxis: { type: 'category', data: xs, name: '옵션율', nameLocation: 'middle', nameGap: 28, nameTextStyle: { color: t.muted }, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: t.fg }, splitArea: { show: false } },
    yAxis: { type: 'category', data: ys, name: dual ? '자사 비중' : '', nameTextStyle: { color: t.muted }, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: t.fg } },
    visualMap: {
      min: -maxAbs, max: maxAbs, calculable: false, orient: 'horizontal', left: 'center', bottom: 0, itemWidth: 12, itemHeight: 180,
      text: ['Opportunity', 'Risk'], textStyle: { color: t.muted, fontSize: 11 },
      inRange: { color: [t.risk, t.raised, t.opp] },
    },
    series: [{
      type: 'heatmap', data: cells,
      label: { show: true, formatter: p => fmtKs(p.value[2]), fontSize: 12 },
      itemStyle: { borderColor: t.bg, borderWidth: 3, borderRadius: 6 },
    }],
  });
}

// ---------------------------------------------------------------- 단계 화면의 작은 차트

/** 차량 1,000대가 생산되면 몇 pcs 를 가져오는지 */
export function factorFunnel(el, { option, share, dual, ppv }) {
  const t = theme();
  const v0 = 1000, v1 = v0 * option / 100, v2 = v1 * (dual ? share / 100 : 1), v3 = v2 * ppv;
  const cats = ['생산 대수', '옵션 장착', dual ? '자사 몫' : '단독 공급', '가져오는 물동'];
  const vals = [v0, v1, v2, v3];
  const units = ['대', '대', '대', 'pcs'];
  return mount(el, {
    ...base(t, { toolbox: false }),
    legend: { show: false },
    tooltip: { show: false },
    grid: { left: 8, right: 70, top: 4, bottom: 4, containLabel: true },
    xAxis: { type: 'value', show: false, max: Math.max(v0, v3) },
    yAxis: { type: 'category', data: cats, inverse: true, axisTick: { show: false }, axisLine: { show: false }, axisLabel: { color: t.fg, fontWeight: 600 } },
    series: [{
      type: 'bar', data: vals.map((v, i) => ({ value: v, itemStyle: { color: i === 3 ? t.series[2] : t.series[0], opacity: i === 3 ? 1 : .35 + i * .2, borderRadius: 6 } })),
      barWidth: 18, label: { show: true, position: 'right', color: t.fg, fontWeight: 700, formatter: p => `${nf0.format(p.value)}${units[p.dataIndex]}` },
      showBackground: true, backgroundStyle: { color: t.grid, opacity: .35, borderRadius: 6 },
    }],
  });
}

/** 5단계 미리 보기: 예상 물동(막대)과 고객 입력(선) */
export function preview(el, { years, expected, customer }) {
  const t = theme();
  return mount(el, {
    ...base(t, { toolbox: false }),
    tooltip: { ...base(t).tooltip, formatter: p => tipRows(p, v => fmtK(v) + ' Kpcs') },
    grid: { ...base(t).grid, top: 32 },
    xAxis: catAxis(t, years),
    yAxis: valAxis(t),
    series: [
      { name: '예상 물동 (조사기관)', type: 'bar', data: expected, barMaxWidth: 26, itemStyle: { color: t.series[0], opacity: .85, borderRadius: [4, 4, 0, 0] } },
      { name: '고객 물동 (입력)', type: 'line', data: customer, symbol: 'circle', symbolSize: 8, connectNulls: false, lineStyle: { color: t.series[1], width: 2.5 }, itemStyle: { color: t.series[1], borderColor: t.bg, borderWidth: 2 } },
    ],
  });
}

/** 차종 버튼 안의 작은 추이선 (SVG 문자열) */
export function sparkline(values, w = 84, h = 26) {
  const max = Math.max(...values, 1);
  const step = w / Math.max(1, values.length - 1);
  const pts = values.map((v, i) => `${(i * step).toFixed(1)},${(h - 2 - v / max * (h - 4)).toFixed(1)}`);
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="0,${h} ${pts.join(' ')} ${w},${h}" fill="currentColor" opacity=".14"/><polyline points="${pts.join(' ')}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}
