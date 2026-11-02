// 자료 구조와 모델 API. 읽기 전용 참조입니다. 사내에서 이 시그니처를 바꾸지 마세요.

type Period = string; // '2026Q3' 달력 분기 (분기 끝 달 기준, 7~9월 = Q3)
// 금액 4개는 발표 통화 백만 단위, debtRatio 는 % 숫자(원문에 비율만 있을 때). 화면 지표는 매출, 영업이익, 영업이익률, 부채비율
type MetricKey = 'revenue' | 'operatingIncome' | 'totalLiabilities' | 'totalEquity' | 'debtRatio' | 'deliveries'; // deliveries 는 천 대
type Topic = '실적' | '가이던스' | '전동화' | '관세·정책' | 'SDV·전장' | '지역' | '공급망·원가' | '주주환원' | '기타';

interface Company {
  id: string;            // 영문 소문자. data/reports/<id>.js 파일 이름
  name: string;          // 영문 이름
  nameKo: string;
  group: 'OEM' | 'Tier1';
  ticker: string;        // Yahoo Finance 표기 (GM, 005380.KS, 7203.T)
  currency: string;      // 발표 통화
  fyEnd: number;         // 회계연도 끝 달 (12, 3)
  color: string;         // 로고가 없을 때 글자 마크 색
  logo: string;          // 'assets/logos/gm.svg' 또는 data: URL 또는 ''
  metricNotes: { operatingIncome?: string; deliveries?: string }; // 회사가 쓰는 지표 이름 (Group EBIT, 도매 판매 등)
  aliases: string[];
}

interface Highlight { topic: Topic; text: string; }
interface QA { asker: string; firm: string; question: string; answerer: string; answer: string; topic: Topic; }

interface Call {
  date: string;          // YYYY-MM-DD
  summary: string;
  highlights: Highlight[];
  guidance: string;
  qa: QA[];
  sources: string[];
  transcript?: { source: string; url: string; stored: boolean }; // stored 면 data/transcripts/<id>.js 에 원문
}

interface Quarter {
  period: Period;
  fiscalLabel: string;   // 회사 표기 (FY2027 Q1)
  reportDate: string;
  currency: string;
  values: Partial<Record<MetricKey, number>>; // 금액: 발표 통화 백만, debtRatio: %
  raw: Partial<Record<MetricKey, string>>;    // 원문 표기
  fxOverride?: number;   // 이 분기만 쓸 환율 (1 USD 당)
  source: string;
  status: '검증 필요' | '확인';
  note: string;
  call: Call | null;
  origin: 'inside' | 'outside'; // 사내에서 고쳤는지, 바깥 묶음에서 왔는지
  sentiment?: Sentiment;
  updatedAt: string;
}

type FactorKey = 'volume' | 'revenue' | 'profit' | 'capex' | 'supply' | 'materialsFx' | 'demandPrice' | 'tariffPolicy';
interface FactorScore { score: number | null; direction: '상향' | '유지' | '하향' | '언급 없음'; reason: string; quote: string; }
interface Sentiment {
  model: Record<FactorKey, FactorScore>;          // 사내 모델 점수 (0~10 정수 또는 null)
  manual: Partial<Record<FactorKey, number>>;     // 사람이 고친 점수. 있으면 화면에서 우선
  summary: string;
  scoredAt: string;
  editedAt?: string;                              // 수정 모드에서 사람이 고친 때
}

/** data/settings.js. 비운 칸은 처음 값 */
interface SettingsData { rev: number; sentiment: { factors?: Partial<Record<FactorKey, { label?: string; hint?: string }>>; weights?: Partial<Record<FactorKey, number>> }; }

interface ReportData { company: string; rev: number; savedAt?: string; quarters: Quarter[]; }
interface FxData { rev: number; basis: string; source: string; rates: Record<string, Record<Period, number>>; }
interface CompaniesData { rev: number; companies: Company[]; }
interface TranscriptsData { company: string; rev: number; items: Record<Period, { source: string; url: string; addedAt: string; text: string }>; }

/** 바깥에서 사내로 보내는 자료 묶음 (ea-pack-YYYYMMDD.json) */
interface Pack {
  type: 'ea-pack';
  createdAt: string;
  fx?: { rates: FxData['rates'] };
  reports: Array<{ company: string; quarters: Quarter[] }>;
}

interface Derived {
  period: Period; currency: string;
  musd: { revenue: number | null; operatingIncome: number | null };   // 백만 달러
  local: { revenue: number | null; operatingIncome: number | null };  // 발표 통화 백만
  opMargin: number | null;                                            // 영업이익 / 매출 x 100
  debtRatio: number | null;                                           // 부채총계 / 자본총계 x 100, 없으면 원문 비율
  debtRatioSource: 'calc' | 'reported' | null;
  fx: { rate: number | null; source: 'usd' | 'table' | 'override' | 'missing' };
  missingFx: boolean;
  yoy?: { revenue: number | null; operatingIncome: number | null };  // 발표 통화 기준 %
  opMarginPrev?: number | null;                                       // 전년 동기
  debtRatioPrev?: number | null;                                      // 전년 동기
  quarter?: Quarter;
}

declare namespace App.ea.core {
  const METRICS: Array<{ key: MetricKey; label: string; kind: 'money' | 'pct'; flow: boolean }>;
  const TOPICS: Topic[];
  function toStoreUnit(value: number | string, unit: string, kind: 'money' | 'pct'): number | null;
  function normPeriod(s: string): Period | null;
  function periodAdd(p: Period, n: number): Period;
  function fiscalLabel(p: Period, fyEnd: number): string;
  function rateFor(fx: FxData, currency: string, p: Period): number | null;
  function toMusd(millions: number, currency: string, p: Period, fx: FxData, override?: number): { value: number | null; rate: number | null; source: string };
  function derive(q: Quarter, c: Company, fx: FxData): Derived;
  function table(r: ReportData, c: Company, fx: FxData): Derived[]; // 최근 분기부터, yoy/qoq 는 발표 통화 기준. opMarginPrev(Q), debtRatioPrev(Q) 도 붙음
  /** 달력 연도 합계, 최근 연도부터. yoy 는 두 해 모두 4개 분기가 있을 때만 */
  function annual(r: ReportData, c: Company, fx: FxData): Array<{ year: number; quarters: number; local: { revenue: number | null; operatingIncome: number | null }; musd: { revenue: number | null; operatingIncome: number | null }; deliveries: number | null; delQuarters: number; opMargin: number | null; debtRatio: number | null; yoy: { revenue: number | null; operatingIncome: number | null; deliveries: number | null }; opMarginPrev: number | null; debtRatioPrev: number | null }>;
  function findCompany(list: Company[], key: string): Company | null;
}
declare namespace App.ea.parse {
  function lenientJson(text: string): { ok: true; value: any; fixed: string[] } | { ok: false; error: string };
  function readCall(obj: any, ctx: { companies: Company[]; company?: string; period?: Period }): { ok: boolean; errors: string[]; warnings: string[]; company: Company | null; period: Period | null; call: Call | null };
  function readNumbers(obj: any, ctx: { companies: Company[]; company?: string; period?: Period }): { ok: boolean; errors: string[]; warnings: string[]; numbers: { currency: string; fiscalLabel: string; reportDate: string; source: string; values: Record<string, number>; ytd: Record<string, number>; raw: Record<string, string> } | null };
}
declare namespace App.ea.merge {
  function joinCalls(parts: Call[]): Call;
  function applyCall(r: ReportData, c: Company, p: Period, call: Call, opts?: { transcript?: Call['transcript'] }): ReportData;
  function applyNumbers(r: ReportData, c: Company, p: Period, n: any): { report: ReportData; warnings: string[] };
  /** 여러 분기 일괄 입력. 값 null 은 지우기, values 에 없는 지표는 그대로. 바뀐 분기만 changed 에 */
  function applyGrid(r: ReportData, c: Company, rows: Array<{ period: Period; fiscalLabel?: string; values: Partial<Record<MetricKey, number | null>> }>): { report: ReportData; changed: Period[] };
  function planPack(pack: Pack, reports: Record<string, ReportData>, companies: Company[]): Array<{ company: string; period: Period; action: 'add' | 'replace' | 'keep' | 'same' | 'skip'; reason: string; quarter: Quarter }>;
}
declare namespace App.ea.sentiment {
  const FACTORS: Array<{ key: FactorKey; label: string; hint: string }>;
  const WEIGHTS: Record<FactorKey, number>;
  function read(obj: any, ctx: { companies: Company[]; company?: string; period?: Period }): { ok: boolean; errors: string[]; warnings: string[]; sentiment: Sentiment | null };
  function effective(s: Sentiment): Record<FactorKey, { score: number | null; source: 'manual' | 'model' | null }>;
  function index(s: Sentiment, weights?: Record<FactorKey, number>): number | null;  // 가중 평균, 소수 1자리
  function band(score: number | null): 'neg2' | 'neg1' | 'mid' | 'pos1' | 'pos2' | 'none';
  function configure(cfg: SettingsData['sentiment'] | null): void; // 관리 탭 설정 적용
}
declare namespace App.ea.prompt {
  function buildSentimentPrompt(c: Company, p: Period, call: Call, prev: Sentiment | null): string;
  function buildCallPrompts(c: Company, p: Period, transcript: string, maxChars?: number): { split: { found: boolean }; prompts: Array<{ title: string; part: 'all' | 'prepared' | 'qa'; chars: number; text: string }> };
  function buildNumbersPrompt(c: Company, p: Period, text: string): string;
}
