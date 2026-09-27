// 지표 카드. 화살표는 값이 움직인 방향, 색은 그게 좋은 일인지를 나타냅니다.
// 가격 상승처럼 "올랐지만 나쁜" 경우가 있으니 둘을 따로 받습니다.
//   <Kpi label="판매" value="12.3만" delta="+3.2%" direction="up" tone="good" />

const ARROW = { up: '▲', down: '▼', flat: '–' };
const TONE = { good: 'text-good', bad: 'text-bad', warn: 'text-warn' };

export default function Kpi({ label, value, unit, delta, direction, tone, note }) {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold leading-tight">
        {value}
        {unit && <span className="ml-0.5 text-sm font-normal text-muted">{unit}</span>}
      </div>
      {delta && (
        <div className={'mt-1 text-sm ' + (TONE[tone] || 'text-muted')}>
          {direction && <span aria-hidden="true" className="mr-1">{ARROW[direction]}</span>}
          {delta}
        </div>
      )}
      {note && <div className="mt-1 text-xs text-subtle">{note}</div>}
    </div>
  );
}
