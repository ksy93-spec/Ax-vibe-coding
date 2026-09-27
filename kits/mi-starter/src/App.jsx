import { useState } from 'react';
import { ChartLine, Factory, ClipboardList, TrendingUp } from 'lucide-react';
import Sales from './pages/Sales.jsx';
import Forecast from './pages/Forecast.jsx';
import Fabs from './pages/Fabs.jsx';
import Orders from './pages/Orders.jsx';

// 탭 하나가 화면 하나입니다. 새 화면은 pages/ 에 만들고 여기에 한 줄 추가합니다.
const TABS = [
  { id: 'sales', label: '판매/생산', icon: ChartLine, page: Sales },
  { id: 'forecast', label: '수요예측', icon: TrendingUp, page: Forecast },
  { id: 'fabs', label: '경쟁사 거점', icon: Factory, page: Fabs },
  { id: 'orders', label: '수주 관리', icon: ClipboardList, page: Orders },
];

export default function App() {
  const [tab, setTab] = useState(TABS[0].id);
  const Page = TABS.find((t) => t.id === tab).page;
  return (
    <div className="mx-auto max-w-6xl px-4 py-5">
      <header className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <h1 className="text-xl font-semibold">Market Intelligence 예시</h1>
          <p className="text-sm text-muted">MI 스타터 템플릿. 숫자와 회사명은 전부 예시입니다.</p>
        </div>
      </header>
      <nav className="mb-4 flex flex-wrap gap-1 border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
                  className={'-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm ' +
                    (tab === t.id ? 'border-accent font-medium text-accent' : 'border-transparent text-muted hover:text-fg')}>
            <t.icon size={15} />{t.label}
          </button>
        ))}
      </nav>
      <Page />
    </div>
  );
}
