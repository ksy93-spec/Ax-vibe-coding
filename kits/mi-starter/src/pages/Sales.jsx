// 차종별 판매와 OEM 점유율. Chart, Kpi, Arquero 집계 사용 예시입니다.
import { useMemo } from 'react';
import * as aq from 'arquero';
import Chart from '../components/Chart.jsx';
import Kpi from '../components/Kpi.jsx';
import Panel from '../components/Panel.jsx';
import DataGrid from '../components/DataGrid.jsx';
import { MONTHS, SALES_BY_MODEL, PRODUCTION, OEM_SHARE } from '../sample/data.js';
import { compact, num, signedPct, growth, pct } from '../lib/format.js';

export default function Sales() {
  // 긴 형태(행 = 월 x 차종)로 펴 두면 Arquero 로 어떤 기준이든 묶을 수 있습니다.
  const long = useMemo(() => aq.from(
    SALES_BY_MODEL.flatMap((s) => s.values.map((units, i) => ({
      month: MONTHS[i], year: Number(MONTHS[i].slice(0, 4)), model: s.model, units,
    })))
  ), []);

  const byYear = useMemo(() => long.groupby('model').pivot('year', 'units').objects(), [long]);

  const last = MONTHS.length - 1;
  const total = (i) => SALES_BY_MODEL.reduce((s, m) => s + m.values[i], 0);
  const ytd = (y) => long.filter(aq.escape((d) => d.year === y && Number(d.month.slice(5)) <= 8)).rollup({ u: aq.op.sum('units') }).get('u', 0);
  const ytdGrowth = growth(ytd(2026), ytd(2025));
  const ev = SALES_BY_MODEL.find((s) => s.model === 'EV-C').values[last];
  const monthGrowth = growth(total(last), total(last - 12));
  const oemTotal = OEM_SHARE.reduce((s, o) => s + o.units, 0);

  const trend = {
    tooltip: { trigger: 'axis' },
    legend: { top: 0 },
    grid: { left: 56, right: 24, top: 36, bottom: 64 },
    xAxis: { type: 'category', data: MONTHS },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => compact(v) } },
    dataZoom: [{ type: 'slider', start: 50, end: 100, bottom: 12, height: 20 }],
    series: SALES_BY_MODEL.map((s) => ({ name: s.model, type: 'line', data: s.values, showSymbol: false })),
  };

  const sorted = [...OEM_SHARE].filter((o) => o.oem !== '기타').sort((a, b) => a.units - b.units);
  const share = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' }, valueFormatter: (v) => num(v) + '대' },
    grid: { left: 64, right: 56, top: 8, bottom: 24 },
    xAxis: { type: 'value', axisLabel: { formatter: (v) => compact(v) } },
    yAxis: { type: 'category', data: sorted.map((o) => o.oem) },
    series: [{
      type: 'bar', data: sorted.map((o) => o.units),
      itemStyle: { borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: 'right', formatter: (p) => pct(p.value / oemTotal, { ratio: true }) },
    }],
  };

  const prodVsSales = {
    tooltip: { trigger: 'axis', valueFormatter: (v) => num(v) + '대' },
    legend: { top: 0, icon: 'roundRect', itemWidth: 10, itemHeight: 10 },
    grid: { left: 56, right: 24, top: 36, bottom: 32 },
    xAxis: { type: 'category', data: MONTHS.slice(-12) },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => compact(v) } },
    series: [
      { name: '생산', type: 'bar', data: PRODUCTION.slice(-12) },
      { name: '판매', type: 'bar', data: MONTHS.slice(-12).map((_, i) => total(MONTHS.length - 12 + i)) },
    ],
  };

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="2026년 1~8월 판매" value={compact(ytd(2026))} unit="대"
             delta={signedPct(ytdGrowth) + ' 전년 동기 대비'} direction={ytdGrowth >= 0 ? 'up' : 'down'} tone={ytdGrowth >= 0 ? 'good' : 'bad'} />
        <Kpi label={MONTHS[last] + ' 판매'} value={compact(total(last))} unit="대"
             delta={signedPct(monthGrowth) + ' 전년 동월 대비'} direction={monthGrowth >= 0 ? 'up' : 'down'} tone={monthGrowth >= 0 ? 'good' : 'bad'} />
        <Kpi label="EV 비중" value={pct(ev / total(last) * 100)} note={MONTHS[last] + ' 기준'} />
        <Kpi label="1위 OEM 점유율" value={pct(OEM_SHARE[0].units / oemTotal, { ratio: true })} note={OEM_SHARE[0].oem + ', 2026년 1~8월'} />
      </div>

      <Panel title="차종별 월 판매" hint="아래 막대를 끌면 기간이 바뀝니다.">
        <Chart option={trend} height={340} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="OEM별 판매 점유율" hint="2026년 1~8월, 기타 제외">
          <Chart option={share} height={260} />
        </Panel>
        <Panel title="생산과 판매" hint="최근 12개월">
          <Chart option={prodVsSales} height={260} />
        </Panel>
      </div>

      <Panel title="차종별 연간 판매" hint="Arquero 로 월 자료를 연도별로 펼친 결과입니다. 2026년은 1~8월입니다.">
        <DataGrid height={220} rows={byYear} columns={[
          { field: 'model', headerName: '차종', pinned: 'left' },
          ...['2023', '2024', '2025', '2026'].map((y) => ({ field: y, headerName: y + '년', type: 'numericColumn', valueFormatter: (p) => num(p.value) })),
        ]} />
      </Panel>
    </div>
  );
}
