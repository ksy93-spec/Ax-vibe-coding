// 포탈 모듈 계약과 API 타입. 사내 모델에게 이 파일을 먼저 읽히세요.
// 런타임 코드가 아니라 참조용입니다. 빌드 단계가 없어 실행에는 쓰이지 않습니다.

declare namespace Portal {
  /** 값 표기 방식. won 은 만/억 단위로 줄여 씁니다. */
  type Format = 'number' | 'won' | 'percent';

  /** 화살표 방향. 생략하면 delta 문자열 앞의 부호에서 읽습니다. */
  type Direction = 'up' | 'down' | 'flat';

  /** 색으로 나타낼 의미. 화살표 방향과 별개입니다.
   *  가격이 올랐지만(up) 나쁜 일(bad)일 수 있습니다. */
  type Tone = 'good' | 'bad' | 'warn' | 'flat';

  interface Kpi {
    label: string;
    value: string | number;
    unit?: string;
    delta?: string;
    direction?: Direction;
    tone?: Tone;
    note?: string;
  }

  interface Series {
    name: string;
    /** x 와 길이가 같아야 합니다. 빈 칸은 null 로 둡니다. */
    values: Array<number | null>;
  }

  interface Chart {
    type: 'line' | 'bar';
    title?: string;
    x: string[];
    /** 최대 8개. 더 필요하면 "기타"로 묶거나 차트를 나눕니다. */
    series: Series[];
    format?: Format;
    /** 플롯 높이(px). 가로축 라벨 자리는 여기에 더해집니다. 기본 240. */
    height?: number;
  }

  interface Table {
    title?: string;
    columns: string[];
    /** 각 행의 칸 수가 columns 와 같아야 합니다. */
    rows: Array<Array<string | number | null>>;
  }

  /** data/<id>/data.js 가 window.__PORTAL__[id] 에 넣는 객체. */
  interface Module {
    title: string;
    owner?: string;
    /** "YYYY-MM-DD HH:MM". 7일이 지나면 화면에 표시됩니다. */
    updated_at?: string;
    description?: string;
    format?: Format;
    kpis?: Kpi[];
    charts?: Chart[];
    table?: Table;
    notes?: string;
  }
}

declare interface Window {
  /** data/modules.js 가 정하는 표시 순서. */
  __MODULES__: string[];
  /** 각 data.js 가 자기 몫을 채웁니다. */
  __PORTAL__: Record<string, Portal.Module>;
}

declare namespace App {
  interface ChartHandle {
    render(): void;
    setData(x: string[], series: Portal.Series[]): void;
    destroy(): void;
  }

  interface ChartOptions {
    type?: 'line' | 'bar';
    title?: string;
    x: string[];
    series: Portal.Series[];
    format?: Portal.Format;
    height?: number;
  }

  interface RegistryResult {
    modules: Array<{ id: string; data: Portal.Module; problems: string[] }>;
    missing: string[];
  }
}

declare const App: {
  dom: {
    h(tag: string, props?: Record<string, unknown> | null, children?: unknown): HTMLElement;
    qs<T extends Element = HTMLElement>(sel: string, root?: ParentNode): T | null;
    qsa<T extends Element = HTMLElement>(sel: string, root?: ParentNode): T[];
    clear(el: HTMLElement): HTMLElement;
    on(el: EventTarget, type: string, fn: EventListener, opts?: AddEventListenerOptions): () => void;
  };
  /** 인라인 SVG 차트. 호버, 키보드 읽기, 표 보기가 들어 있습니다. */
  createChart(mount: HTMLElement, options: App.ChartOptions): App.ChartHandle;
  /** 지표 카드 묶음을 그립니다. */
  renderKpis(mount: HTMLElement, items: Portal.Kpi[], format?: Portal.Format): void;
  /** 숫자를 한국식 표기로. won 이면 만/억 단위로 줄입니다. */
  formatValue(v: number, format?: Portal.Format): string;
  /** i 번째 계열 색의 CSS 변수 문자열. 순서가 색맹 안전성을 만듭니다. */
  seriesVar(i: number): string;
  registry: {
    load(): Promise<App.RegistryResult>;
    validate(id: string, mod: Portal.Module): string[];
  };
  createTable(mount: HTMLElement, options: {
    columns: string[];
    records: Array<Record<string, unknown>>;
    pageSize?: number;
    onRowClick?: (record: Record<string, unknown>, index: number) => void;
  }): { setData(c: string[], r: Array<Record<string, unknown>>): void; render(): void };
  ui: {
    toast(message: string, kind?: 'info' | 'ok' | 'warn' | 'danger', ms?: number): () => void;
    modal(opts: { title: string; body: Node | string; actions?: Array<{ label: string; kind?: string; onClick?: (close: () => void) => void }> }): { close: () => void };
    confirm(message: string, cb: (ok: boolean) => void, opts?: Record<string, unknown>): void;
  };
};
