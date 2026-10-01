// 수요 시뮬레이터의 타입. 사내 모델에게 이 파일을 먼저 읽히세요.
// 참조용입니다. 빌드 단계가 없으므로 실행에는 쓰이지 않습니다.
// 여기 적힌 시그니처는 바꾸지 않습니다. 바꿔야 하면 바깥 저장소에서 명세부터 고칩니다.

declare namespace Sim {
  /** 'YYYY-MM' */
  type Month = string;
  /** 'YYYY-Q1' ~ 'YYYY-Q4' */
  type Quarter = string;
  /** 지역별 값. 결과 객체에는 지역 목록 외에 TOTAL('전체') 키가 더해집니다. */
  type ByRegion<T> = Record<string, T>;
  type ByBrand<T> = Record<string, T>;
  type ByPowertrain<T> = Record<string, T>;

  // ---------- 입력 ----------

  /** 월별 판매 CSV 한 줄을 정리한 것. */
  interface SalesRow {
    month: Month;
    region: string;
    /** CSV 에 국가 열이 없으면 region 과 같은 값 */
    country: string;
    brand: string;
    units: number;
  }

  /** 분기별 파워트레인 CSV 한 줄. 월 단위 자료를 넣어도 분기로 합쳐 씁니다. */
  interface PowertrainRow {
    quarter: Quarter;
    region: string;
    brand: string;
    /** 대문자로 정리한 값. 예: BEV, PHEV, HEV, ICE */
    powertrain: string;
    units: number;
  }

  interface ColumnMapping {
    /** 표준 필드 이름 -> CSV 열 이름. 못 찾으면 null */
    mapping: Record<string, string | null>;
    /** 필수인데 못 찾은 표준 필드 */
    missing: string[];
  }

  interface Note {
    level: 'info' | 'warn' | 'error';
    message: string;
  }

  // ---------- 정리된 실적 ----------

  interface Dataset {
    /** 실적 월. 빈 달 없이 연속 */
    months: Month[];
    regions: string[];
    /** 관측 브랜드 + 맨 끝에 OTHER('기타') */
    brands: string[];
    /** 파워트레인 자료가 없으면 ['ALL'] 하나 */
    powertrains: string[];
    /** 지역 -> 그 지역의 국가 목록 */
    countries: ByRegion<string[]>;
    /** 실적 판매량. months 와 길이가 같습니다. 월별 브랜드 합계를 분기 파워트레인 비중으로 나눈 값 */
    units: ByRegion<ByBrand<ByPowertrain<number[]>>>;
    /** 국가 단위 월별 브랜드 판매량. 국가 한정 카드의 가중치 계산에만 씁니다 */
    countryUnits: ByRegion<Record<string, ByBrand<number[]>>>;
    /** 파워트레인 비중을 추정으로 채운 달 (해당 분기 자료 없음) */
    ptEstimated: ByRegion<ByBrand<boolean[]>>;
    notes: Note[];
  }

  // ---------- 기준선 ----------

  interface BaselineOptions {
    /** 예측 개월 수. 기본 24, 12~36 */
    horizon: number;
    /** 점유율 추세를 잡는 최근 개월 수. 기본 12 */
    trendWindow: number;
    /** 점유율 추세 감쇠율(월). 0 이면 추세 없이 최근 수준 유지, 1 이면 추세 그대로. 기본 0.85 */
    phi: number;
    /** 지역별 연간 총수요 성장률 덮어쓰기 (0.02 = +2%). 없거나 null 이면 자동값 */
    growth?: ByRegion<number | null>;
  }

  interface Baseline {
    options: BaselineOptions;
    /** 예측 월. 실적 마지막 달 다음 달부터 horizon 개월 */
    months: Month[];
    /** 지역 총수요(TIV) 기준선 */
    tiv: ByRegion<number[]>;
    /** 자동 계산한 연간 성장률과 실제로 쓴 값 */
    growthAuto: ByRegion<number>;
    growthUsed: ByRegion<number>;
    /** 달력 월(0=1월)별 계절 지수. 평균 1 */
    seasonal: ByRegion<number[]>;
    /** 파워트레인 효용 [pt][h] 과 활성 여부. 비활성 항목은 점유율 0 으로 고정 */
    ptU: ByRegion<number[][]>;
    ptActive: ByRegion<boolean[]>;
    /** 파워트레인 안 브랜드 효용 [brand][h] 과 활성 여부 */
    brandU: ByRegion<ByPowertrain<number[][]>>;
    brandActive: ByRegion<ByPowertrain<boolean[]>>;
    /** 위 효용을 softmax 한 기준 점유율 [h][item]. 엔진이 매번 다시 계산하지 않도록 둡니다 */
    ptShare: ByRegion<number[][]>;
    brandShare: ByRegion<ByPowertrain<number[][]>>;
  }

  // ---------- 충격 카드 ----------

  /**
   * TIV: 지역 총수요. magnitude 단위는 % (10 = +10%)
   * POWERTRAIN: 지역 전체에서 target 파워트레인 비중. 단위는 %p (3 = +3%p)
   * BRAND: target 브랜드의 점유율. 단위는 상대 % (10 = 점유율 x1.10). 같은 파워트레인 안에서 나눠 갖습니다
   */
  type Layer = 'TIV' | 'POWERTRAIN' | 'BRAND';
  type RampShape = 'step' | 'linear' | 'scurve';

  interface ShockCard {
    id: string;
    name: string;
    enabled: boolean;
    region: string;
    /** 비어 있으면 지역 전체. 있으면 그 국가들의 최근 12개월 비중만큼 강도를 줄여 적용 */
    countries?: string[];
    layer: Layer;
    /** TIV 는 무시. POWERTRAIN 은 파워트레인 코드, BRAND 는 브랜드 이름 */
    target: string;
    /** BRAND 에서만. 특정 파워트레인 안에서만 적용. 없으면 그 브랜드의 모든 파워트레인 */
    powertrain?: string | null;
    /** 완전 발효 시 강도. min <= mode <= max */
    magnitude: { min: number; mode: number; max: number };
    /** 발생 확률 0~1. 몬테카를로 구간에만 쓰입니다. 시나리오 경로는 발생을 가정합니다 */
    probability: number;
    /** 발효 시작 월 */
    start: Month;
    /** 완전 발효까지 개월 수. step 이면 무시 */
    rampMonths: number;
    rampShape: RampShape;
    /** 완전 발효 유지 개월 수. null 이면 예측 끝까지 유지 */
    holdMonths: number | null;
    /** 유지 기간이 끝난 뒤 반감기(개월). null 이면 바로 0 */
    halfLifeMonths: number | null;
    /** 시작 전 months 개월 동안 대상 물량 +pct%, 시작 후 같은 개월 수에서 같은 물량을 뺍니다 */
    pullForward: { months: number; pct: number } | null;
    /** 근거, 출처, 가정 설명. 보고서에 그대로 나갑니다 */
    note?: string;
  }

  interface Scenario {
    id: string;
    name: string;
    notes: string;
    cards: ShockCard[];
  }

  /** 몬테카를로 한 번에서 카드별로 뽑은 값. 없으면 발생, 최빈값 */
  type Draw = Record<string, { occurs: boolean; magnitude: number }>;

  // ---------- 결과 ----------

  interface SimResult {
    months: Month[];
    /** 지역 목록만. TOTAL 없음 */
    units: ByRegion<ByBrand<ByPowertrain<number[]>>>;
    /** 아래 넷은 TOTAL('전체') 키 포함 */
    brandUnits: ByRegion<ByBrand<number[]>>;
    tiv: ByRegion<number[]>;
    /** 지역 총수요 대비 브랜드 점유율 (0~1) */
    share: ByRegion<ByBrand<number[]>>;
    /** 지역 총수요 대비 파워트레인 비중 (0~1) */
    ptMix: ByRegion<ByPowertrain<number[]>>;
    warnings: string[];
  }

  interface Band {
    p10: number[];
    p50: number[];
    p90: number[];
  }

  interface McResult {
    draws: number;
    seed: number;
    months: Month[];
    brandUnits: ByRegion<ByBrand<Band>>;
    tiv: ByRegion<Band>;
    share: ByRegion<ByBrand<Band>>;
  }

  interface Contribution {
    cardId: string;
    name: string;
    /** 카드 하나만 켰을 때 기준선 대비 브랜드 판매량 차이 [h]. TOTAL 포함 */
    delta: ByRegion<ByBrand<number[]>>;
  }

  interface ContributionResult {
    base: SimResult;
    total: SimResult;
    items: Contribution[];
    /** 전체 차이에서 카드별 차이의 합을 뺀 나머지. 카드끼리 겹치는 효과 */
    interaction: ByRegion<ByBrand<number[]>>;
  }

  // ---------- 디스플레이 ----------

  /** 브랜드(와 지역)별 디스플레이 가정. region 이 '' 이면 모든 지역 */
  interface DisplayRow {
    brand: string;
    region: string;
    /** 대당 디스플레이 수(장). NaN 이면 기본값 */
    panelsPerVehicle: number;
    /** 그 브랜드 디스플레이 중 우리 공급 비중 0~1. NaN 이면 기본값 */
    ourShare: number;
  }

  interface DisplaySettings {
    /** 화면에 쓸 우리 회사 이름. 기본 '우리' */
    companyName: string;
    defaultPanels: number;
    defaultShare: number;
    rows: DisplayRow[];
  }

  interface DisplayCell {
    vehicles: number;
    /** 디스플레이 수요(장) = vehicles x panels */
    tam: number;
    /** 우리 몫(장) = tam x share */
    ours: number;
    share: number;
    panels: number;
    source?: 'region' | 'brand' | 'default';
  }

  /** 지역 목록 + TOTAL */
  type DisplayResult = ByRegion<{ vehicles: number; tam: number; ours: number; share: number; brands: ByBrand<DisplayCell> }>;

  /** 저장 파일(.json). 판매 실적은 담지 않습니다 */
  interface ProjectFile {
    kind: 'demand-sim';
    version: 1;
    savedAt: string;
    brands: string[];
    baseline: BaselineOptions;
    scenarios: Scenario[];
    /** 불러올 때 다른 데이터에 붙이는지 확인하는 용도 */
    dataInfo: { firstMonth: Month; lastMonth: Month; regions: string[] };
    display?: DisplaySettings;
  }
}

declare namespace App {
  interface SimApi {
    TOTAL: '전체';
    OTHER: '기타';
    util: {
      monthIndex(ym: Sim.Month): number;
      monthLabel(idx: number): Sim.Month;
      addMonths(ym: Sim.Month, n: number): Sim.Month;
      monthRange(from: Sim.Month, to: Sim.Month): Sim.Month[];
      parseMonth(v: unknown): Sim.Month | null;
      parseQuarter(v: unknown): Sim.Quarter | null;
      quarterOf(ym: Sim.Month): Sim.Quarter;
      quarterMonths(q: Sim.Quarter): Sim.Month[];
      parseNumber(v: unknown): number;
      logit(p: number): number;
      softmax(u: number[], active: boolean[]): number[];
      rng(seed: number): () => number;
      triangular(r: () => number, min: number, mode: number, max: number): number;
    };
    prep: {
      detectColumns(columns: string[], kind: 'sales' | 'powertrain' | 'display'): Sim.ColumnMapping;
      normalizeSales(records: Record<string, string>[], mapping: Record<string, string | null>): { rows: Sim.SalesRow[]; notes: Sim.Note[] };
      normalizePowertrain(records: Record<string, string>[], mapping: Record<string, string | null>): { rows: Sim.PowertrainRow[]; notes: Sim.Note[] };
      /** 최근 12개월 전 지역 판매량 순 */
      rankBrands(rows: Sim.SalesRow[]): Array<{ brand: string; units: number }>;
      normalizeDisplay(records: Record<string, string>[], mapping: Record<string, string | null>): { rows: Sim.DisplayRow[]; notes: Sim.Note[] };
      /** '25%', '25', '0.25' -> 0.25 */
      parseShare(v: unknown): number;
      buildDataset(sales: Sim.SalesRow[], powertrain: Sim.PowertrainRow[] | null, opts: { brands: string[] }): Sim.Dataset;
    };
    baseline: {
      defaults(): Sim.BaselineOptions;
      build(ds: Sim.Dataset, opts: Sim.BaselineOptions): Sim.Baseline;
    };
    shocks: {
      /** 월별 발효 강도 0~1 */
      curve(card: Sim.ShockCard, months: Sim.Month[]): number[];
      /** 국가 한정 카드의 강도 배율 0~1. 국가 지정이 없으면 1 */
      countryWeight(card: Sim.ShockCard, ds: Sim.Dataset): number;
      /** 카드 점검. level 'error' 가 하나라도 있으면 엔진이 그 카드를 건너뜁니다 */
      validate(card: Sim.ShockCard, ds: Sim.Dataset, bl: Sim.Baseline): Sim.Note[];
      blank(layer: Sim.Layer, ds: Sim.Dataset): Sim.ShockCard;
      describe(card: Sim.ShockCard): string;
      /** 'BEV' -> '전기차 (BEV)' */
      ptLabel(code: string): string;
      unitOf(layer: Sim.Layer): string;
    };
    engine: {
      simulate(ds: Sim.Dataset, bl: Sim.Baseline, cards: Sim.ShockCard[], draw?: Sim.Draw): Sim.SimResult;
      monteCarlo(ds: Sim.Dataset, bl: Sim.Baseline, cards: Sim.ShockCard[], opts: { draws: number; seed: number }): Sim.McResult;
      contributions(ds: Sim.Dataset, bl: Sim.Baseline, cards: Sim.ShockCard[]): Sim.ContributionResult;
    };
    geo: {
      /** 국가 값 하나(ISO2, ISO3, 영문, 한글) -> ISO2 */
      country(v: string): string | null;
      /** 지역 값과 그 지역의 국가 값들 -> 지도에 칠할 ISO2 목록 */
      regionCountries(region: string, countryValues: string[]): string[];
      /** 'NA' -> '북미 (NA)' */
      regionLabel(region: string): string;
      /** 'NA' -> '북미' */
      regionShort(region: string): string;
    };
    display: {
      defaults(): Sim.DisplaySettings;
      lookup(s: Sim.DisplaySettings, brand: string, region: string): { panels: number; share: number; source: 'region' | 'brand' | 'default' };
      /** vehicles: 지역 -> 브랜드 -> 차량 대수 (TOTAL 없이) */
      compute(ds: Sim.Dataset, vehicles: Record<string, Record<string, number>>, s: Sim.DisplaySettings): Sim.DisplayResult;
      /** 월별 배열의 [from, to) 합 */
      sumVehicles(ds: Sim.Dataset, series: Record<string, Record<string, number[]>>, from: number, to: number): Record<string, Record<string, number>>;
    };
    presets: Array<{ key: string; label: string; make(ds: Sim.Dataset, bl: Sim.Baseline): Sim.ShockCard }>;
    sample: {
      /** 시드 고정 예시 데이터. 실제 브랜드가 아닙니다 */
      make(): { sales: Sim.SalesRow[]; powertrain: Sim.PowertrainRow[] };
      makeDisplay(): Sim.DisplayRow[];
    };
  }
}
