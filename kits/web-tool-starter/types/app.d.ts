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

  interface TableHandle {
    setData(columns: string[], records: CsvRecord[]): void;
    /** 검색과 정렬이 적용된 현재 행 목록 */
    getVisibleRecords(): CsvRecord[];
    getColumns(): string[];
    render(): void;
  }

  interface TableOptions {
    columns: string[];
    records: CsvRecord[];
    pageSize?: number;
    onRowClick?: (record: CsvRecord, index: number) => void;
  }
}

declare const App: {
  dom: App.DomHelpers;
  csv: App.Csv;
  ui: App.Ui;
  createStore<S>(initial: S): App.Store<S>;
  createTable(mount: HTMLElement, options: App.TableOptions): App.TableHandle;
};
