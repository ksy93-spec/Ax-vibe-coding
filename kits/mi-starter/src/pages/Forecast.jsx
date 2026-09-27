// 수요예측. lib/forecast.js 의 autoForecast 와 lib/calendar.js 사용 예시입니다.
import { useMemo, useState } from 'react';
import Chart from '../components/Chart.jsx';
import Kpi from '../components/Kpi.jsx';
import Panel from '../components/Panel.jsx';
import { autoForecast, MODEL_SHORT } from '../lib/forecast.js';
import { businessDaysInMonth } from '../lib/calendar.js';
import { MONTHS, SALES_BY_MODEL } from '../sample/data.js';
import { compact, num, pct } from '../lib/format.js';

function nextMonths(last, n) {
  let [y, m] = last.split('-').map(Number);
  return Array.from({ length: n }, () => {
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    return y + '-' + String(m).padStart(2, '0');
  });
}

function workdays(ym) {
  try {
    return businessDaysInMonth(Number(ym.slice(0, 4)), Number(ym.slice(5)));
  } catch {
    return null; // 공휴일 데이터가 없는 연도
  }
}

export default function Forecast() {
  const [model, setModel] = useState(SALES_BY_MODEL[0].model);
  const [horizon, setHorizon] = useState(12);
  const history = SALES_BY_MODEL.find((s) => s.model === model).values;

  const result = useMemo(() => autoForecast(history, horizon, { season: 12 }), [history, horizon]);
  const future = nextMonths(MONTHS[MONTHS.length - 1], horizon);
  const allX = [...MONTHS, ...future];
  const lastIdx = MONTHS.length - 1;

  const option = {
    tooltip: { trigger: 'axis', valueFormatter: (v) => (v == null ? '-' : num(Math.round(v)) + '대') },
    legend: { top: 0 },
    grid: { left: 56, right: 24, top: 36, bottom: 32 },
    xAxis: { type: 'category', data: allX },
    yAxis: { type: 'value', axisLabel: { formatter: (v) => compact(v) } },
    series: [
      { name: '실적', type: 'line', data: [...history, ...future.map(() => null)], showSymbol: false },
      {
        // 예측은 점선입니다. 점선은 "추정"으로 읽히므로 실적과 구분하는 데만 씁니다.
        name: '예측', type: 'line', showSymbol: false,
        lineStyle: { type: 'dashed' },
        data: [...history.map((v, i) => (i === lastIdx ? v : null)), ...result.forecast.map((v) => Math.round(v))],
        markArea: { silent: true, itemStyle: { opacity: 0.06 }, data: [[{ xAxis: future[0] }, { xAxis: future[future.length - 1] }]] },
      },
    ],
  };

  const nextYearSum = result.forecast.slice(0, 12).reduce((s, v) => s + v, 0);
  const lastYearSum = history.slice(-12).reduce((s, v) => s + v, 0);
  const change = (nextYearSum / lastYearSum - 1) * 100;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label htmlFor="fc-model" className="text-sm text-muted">차종</label>
        <select id="fc-model" value={model} onChange={(e) => setModel(e.target.value)}
                className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm">
          {SALES_BY_MODEL.map((s) => <option key={s.model}>{s.model}</option>)}
        </select>
        <label htmlFor="fc-h" className="ml-2 text-sm text-muted">예측 기간</label>
        <select id="fc-h" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}
                className="rounded-md border border-line-strong bg-surface px-2 py-1.5 text-sm">
          {[6, 12].map((h) => <option key={h} value={h}>{h}개월</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="고른 방법" value={MODEL_SHORT[result.model]} note={result.label + ', 검증 오차가 가장 작은 방법'} />
        <Kpi label="검증 오차 (sMAPE)" value={pct(result.error)} note={'마지막 ' + result.holdout + '개월로 검증'} />
        {horizon >= 12 && (
          <Kpi label="향후 12개월 합계" value={compact(nextYearSum)} unit="대"
               delta={(change >= 0 ? '+' : '') + change.toFixed(1) + '% 직전 12개월 대비'}
               direction={change >= 0 ? 'up' : 'down'} tone={change >= 0 ? 'good' : 'bad'} />
        )}
        <Kpi label="학습 기간" value={history.length + '개월'} note={MONTHS[0] + ' ~ ' + MONTHS[lastIdx]} />
      </div>

      <Panel title={model + ' 판매 예측'} hint="음영 구간이 예측입니다. 과거 패턴을 연장한 값이라 신차 출시나 정책 변화는 반영되지 않습니다.">
        <Chart option={option} height={340} />
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="방법별 검증 오차">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-muted"><th className="py-1.5 font-normal">방법</th><th className="py-1.5 text-right font-normal">sMAPE</th></tr></thead>
            <tbody>
              {result.candidates.map((c) => (
                <tr key={c.model} className="border-b border-line last:border-0">
                  <td className="py-1.5">{c.label}{c.model === result.model && <span className="ml-2 rounded-full bg-accent-soft px-2 text-xs text-accent">채택</span>}</td>
                  <td className="py-1.5 text-right tabular-nums">{pct(c.error)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel title="월별 예측과 영업일" hint="영업일은 한국 공휴일과 대체공휴일을 뺀 값입니다.">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-line text-left text-muted"><th className="py-1.5 font-normal">월</th><th className="py-1.5 text-right font-normal">예측</th><th className="py-1.5 text-right font-normal">영업일</th><th className="py-1.5 text-right font-normal">일평균</th></tr></thead>
            <tbody>
              {future.map((ym, i) => {
                const wd = workdays(ym);
                return (
                  <tr key={ym} className="border-b border-line last:border-0">
                    <td className="py-1 tabular-nums">{ym}</td>
                    <td className="py-1 text-right tabular-nums">{num(Math.round(result.forecast[i]))}</td>
                    <td className="py-1 text-right tabular-nums">{wd ?? '-'}</td>
                    <td className="py-1 text-right tabular-nums">{wd ? num(Math.round(result.forecast[i] / wd)) : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
      </div>
    </div>
  );
}
