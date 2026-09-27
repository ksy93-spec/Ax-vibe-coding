// 경쟁사 생산거점 지도. ECharts geo(세계 지도)와 DataGrid 사용 예시입니다.
import { useMemo, useState } from 'react';
import Chart from '../components/Chart.jsx';
import Panel from '../components/Panel.jsx';
import DataGrid from '../components/DataGrid.jsx';
import Kpi from '../components/Kpi.jsx';
import Button from '../components/Button.jsx';
import { FABS } from '../sample/data.js';
import { num } from '../lib/format.js';

const STATUSES = ['전체', '가동', '증설', '계획'];

export default function Fabs() {
  const [status, setStatus] = useState('전체');
  const rows = useMemo(() => (status === '전체' ? FABS : FABS.filter((f) => f.status === status)), [status]);
  const companies = [...new Set(FABS.map((f) => f.company))];

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (p) => p.data
        ? p.data.company + ' ' + p.data.site + '<br/>월 ' + num(p.data.capacity) + 'K, ' + p.data.status + ' (' + p.data.start + ')'
        : p.name,
    },
    // 범례 기호는 마크 모양을 따릅니다. 점이면 점, 막대면 네모, 선이면 짧은 선.
    legend: { top: 0, data: companies, icon: 'circle', itemWidth: 10, itemHeight: 10 },
    // 지도는 패널 너비를 꽉 채우고, 처음에는 거점이 몰린 아시아 쪽을 보여 줍니다.
    geo: { map: 'world', roam: true, left: 0, right: 0, top: 36, bottom: 0, zoom: 1.7, center: [115, 30] },
    // 회사마다 한 계열입니다. 계열 색은 테마가 순서대로 줍니다.
    series: companies.map((c) => ({
      name: c, type: 'scatter', coordinateSystem: 'geo',
      symbolSize: (v, p) => 8 + Math.sqrt(p.data.capacity) * 1.6,
      itemStyle: { borderColor: 'rgba(255,255,255,0.9)', borderWidth: 1.5 },
      data: rows.filter((f) => f.company === c).map((f) => ({ ...f, name: f.site, value: [f.lon, f.lat, f.capacity] })),
    })),
  };

  const cap = (s) => FABS.filter((f) => s === '전체' || f.status === s).reduce((a, f) => a + f.capacity, 0);

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="추적 거점" value={FABS.length} unit="곳" note={companies.length + '개사'} />
        <Kpi label="가동 능력" value={num(cap('가동'))} unit="K/월" />
        <Kpi label="증설 중" value={num(cap('증설'))} unit="K/월" tone="warn" />
        <Kpi label="계획" value={num(cap('계획'))} unit="K/월" />
      </div>

      <Panel title="경쟁사 생산거점" hint="원 크기가 월 생산능력입니다. 휠로 확대하고 끌어서 옮깁니다."
             actions={<div className="flex gap-1">{STATUSES.map((s) => (
               <Button key={s} primary={s === status} onClick={() => setStatus(s)}>{s}</Button>
             ))}</div>}>
        <Chart option={option} height={420} />
      </Panel>

      <Panel title="거점 목록">
        <DataGrid height={320} rows={rows} columns={[
          { field: 'company', headerName: '회사' },
          { field: 'site', headerName: '거점' },
          { field: 'country', headerName: '국가' },
          { field: 'capacity', headerName: '월 능력(K)', type: 'numericColumn' },
          { field: 'status', headerName: '상태' },
          { field: 'start', headerName: '가동(예정)' },
        ]} />
      </Panel>
    </div>
  );
}
