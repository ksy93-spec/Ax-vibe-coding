// 전역 App 네임스페이스의 타입. 사내 모델에게 이 파일을 먼저 읽히세요.
// 런타임 코드가 아니라 참조용입니다. 빌드 단계가 없으므로 실행에는 쓰이지 않습니다.

declare namespace App {
  interface DomHelpers {
    h(tag: string, props?: Record<string, unknown> | null, children?: unknown): HTMLElement;
    append(el: HTMLElement, children: unknown): HTMLElement;
    qs<T extends Element = HTMLElement>(sel: string, root?: ParentNode): T | null;
    qsa<T extends Element = HTMLElement>(sel: string, root?: ParentNode): T[];
    clear(el: HTMLElement): HTMLElement;
    on(el: EventTarget, type: string, handler: EventListener, opts?: AddEventListenerOptions): () => void;
  }

  interface Store<S> {
    get(): S;
    set(patch: Partial<S>): S;
    update<K extends keyof S>(key: K, fn: (value: S[K]) => S[K]): S;
    subscribe(fn: (state: S, prev: S) => void): () => void;
  }

  type CsvRecord = Record<string, string>;

  interface CsvReadResult {
    columns: string[];
    records: CsvRecord[];
    encoding: 'utf-8' | 'cp949';
    delimiter: string;
  }

  interface Csv {
    decode(buffer: ArrayBuffer): { text: string; encoding: 'utf-8' | 'cp949' };
    parse(text: string, delimiter?: string): string[][];
    sniffDelimiter(text: string): string;
    toObjects(rows: string[][]): { columns: string[]; records: CsvRecord[] };
    stringify(
      columns: string[],
      records: CsvRecord[],
      opts?: { delimiter?: string; newline?: string }
    ): string;
    /** UTF-8 BOM 을 붙여 내려받습니다. 엑셀 한글 깨짐 방지. */
    download(filename: string, csvText: string): void;
    readFile(file: File, cb: (err: Error | null, result?: CsvReadResult) => void): void;
  }

  interface ModalAction {
    label: string;
    kind?: 'primary' | 'danger';
    onClick?: (close: () => void) => void;
  }

  interface Ui {
    toast(message: string, kind?: 'info' | 'ok' | 'warn' | 'danger', ms?: number): () => void;
    modal(opts: { title: string; body: Node | string; actions?: ModalAction[] }): { close: () => void };
    confirm(
      message: string,
      cb: (ok: boolean) => void,
      opts?: { title?: string; okLabel?: string; cancelLabel?: string; danger?: boolean }
    ): void;
  }


}

declare namespace App {
  interface FcChartSpec {
    title?: string;
    x: string[];
    /** 예측이 시작되는 x 인덱스 */
    splitAt?: number;
    format?: 'units' | 'percent';
    height?: number;
    series: Array<{ name: string; values: Array<number | null>; kind?: 'actual' | 'baseline' | 'scenario' | 'line' | 'line2' | 'line3' }>;
    band?: { name: string; lo: Array<number | null>; hi: Array<number | null> };
  }
}

declare const App: {
  dom: App.DomHelpers;
  csv: App.Csv;
  ui: App.Ui;
  createStore<S>(initial: S): App.Store<S>;
  /** 계산 엔진. 시그니처는 types/sim.d.ts */
  sim: App.SimApi;
  /** 예측 차트. 실적 실선, 기준선 점선, 시나리오 굵은 선, P10~P90 띠 */
  fcChart(mount: HTMLElement, spec: App.FcChartSpec): { destroy(): void };
  /** 세계 지도. regions 의 지역을 칠하고 점을 깜빡입니다. 지도에 못 그린 지역 이름을 돌려줍니다 */
  worldMap(mount: HTMLElement, opts: {
    regions: Array<{ key: string; label: string; value: string; size: number; iso2: string[]; weights?: Record<string, number> | null }>;
    selected: string;
    onSelect(region: string): void;
  }): { unmapped: string[] };
  /** 도넛. 조각은 6개까지 (나머지는 '그 외' 로 묶어서 넘김) */
  donut(mount: HTMLElement, opts: {
    items: Array<{ label: string; value: number; color: string; note?: string }>;
    centerTitle: string;
    centerValue: string;
    format?(v: number): string;
  }): void;
  /** 자동 생성 지도 자료 (src/ui/worldmap-data.js). 손으로 고치지 않습니다 */
  worldMapData: { width: number; height: number; countries: Array<{ iso2: string; name: string; d: string; cx: number; cy: number; a: number }> };
  fmt: {
    units(v: number): string;
    compact(v: number): string;
    pct(v: number, digits?: number): string;
    signedUnits(v: number): string;
    signedPct(v: number, digits?: number): string;
    signedPp(v: number, digits?: number): string;
  };
  /** 화면 상태. src/ui/state.js */
  state: any;
  actions: any;
  /** 탭별 그리기 함수. src/ui/view-*.js */
  views: Record<string, (root: HTMLElement) => void>;
  render(): void;
};
