import { useEffect, useMemo, useState } from 'react';
import { nest } from './nesting.js';

const FIELDS = [
  ['sheetW', '판 폭', 'mm'],
  ['sheetL', '판 길이', 'mm'],
  ['blankW', '블랭크 폭', 'mm'],
  ['blankL', '블랭크 길이', 'mm'],
  ['edge', '가장자리 여유', 'mm'],
  ['gap', '블랭크 간격', 'mm'],
];

export default function App() {
  const [v, setV] = useState({ sheetW: 1219, sheetL: 2438, blankW: 310, blankL: 420, edge: 10, gap: 5 });
  const r = useMemo(() => nest(v), [v]);
  const [help, setHelp] = useState('');
  useEffect(() => { import('./help.js').then((m) => setHelp(m.HELP)); }, []);

  const scale = 260 / Math.max(v.sheetW, v.sheetL);
  const bw = (r.best.rotated ? v.blankL : v.blankW) * scale;
  const bl = (r.best.rotated ? v.blankW : v.blankL) * scale;
  const cells = [];
  for (let i = 0; i < r.best.across; i++) {
    for (let j = 0; j < r.best.along; j++) {
      cells.push(
        <rect key={i + '-' + j}
          x={(v.edge + i * ((r.best.rotated ? v.blankL : v.blankW) + v.gap)) * scale}
          y={(v.edge + j * ((r.best.rotated ? v.blankW : v.blankL) + v.gap)) * scale}
          width={bw} height={bl} rx="1" className="blank" />
      );
    }
  }

  return (
    <main className="wrap">
      <h1>면취수 계산기</h1>
      <p className="hint">예시 앱입니다. 직사각 블랭크를 격자로 놓는 단순 배치만 계산합니다.</p>
      {help && <p className="hint" id="help">{help}</p>}
      <div className="grid">
        <section className="form">
          {FIELDS.map(([key, label, unit]) => (
            <label key={key} htmlFor={key}>
              <span>{label}</span>
              <span className="field">
                <input id={key} type="number" min="0" value={v[key]}
                  onChange={(e) => setV({ ...v, [key]: Number(e.target.value) || 0 })} />
                <em>{unit}</em>
              </span>
            </label>
          ))}
        </section>
        <section className="result">
          <div className="big">{r.best.count}<small>개/판</small></div>
          <div className="row"><span>수율</span><b>{r.yieldPct.toFixed(1)}%</b></div>
          <div className="row"><span>정방향</span><b>{r.normal.across} × {r.normal.along} = {r.normal.count}</b></div>
          <div className="row"><span>90° 회전</span><b>{r.rotated.across} × {r.rotated.along} = {r.rotated.count}</b></div>
          <div className="row"><span>채택</span><b>{r.best.rotated ? '90° 회전' : '정방향'}</b></div>
          <svg width={v.sheetW * scale} height={v.sheetL * scale} className="sheet"
               role="img" aria-label={'배치도: ' + r.best.count + '개'}>
            <rect x="0" y="0" width={v.sheetW * scale} height={v.sheetL * scale} className="plate" />
            {cells}
          </svg>
        </section>
      </div>
    </main>
  );
}
