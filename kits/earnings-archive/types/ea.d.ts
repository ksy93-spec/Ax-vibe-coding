// 자료 구조와 모델 API. 읽기 전용 참조입니다. 사내에서 이 시그니처를 바꾸지 마세요.

type Period = string; // '2026Q3' 달력 분기 (분기 끝 달 기준, 7~9월 = Q3)
type MetricKey = 'revenue' | 'operatingIncome' | 'adjOperatingIncome' | 'netIncome' | 'deliveries';
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
  metricNotes: Partial<Record<MetricKey, string>>; // 회사가 쓰는 지표 이름 (EBIT-adjusted 등)
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
  values: Partial<Record<MetricKey, number>>; // 금액: 발표 통화 백만, deliveries: 천 대
  raw: Partial<Record<MetricKey, string>>;    // 원문 표기
  fxOverride?: number;   // 이 분기만 쓸 환율 (1 USD 당)
  source: string;
  status: '검증 필요' | '확인';
  note: string;
  call: Call | null;
  origin: 'inside' | 'outside'; // 사내에서 고쳤는지, 바깥 묶음에서 왔는지
  updatedAt: string;
}

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
  musd: Partial<Record<Exclude<MetricKey, 'deliveries'>, number | null>>;
  local: Partial<Record<Exclude<MetricKey, 'deliveries'>, number | null>>;
  deliveries: number | null;
  opMargin: number | null; adjMargin: number | null; netMargin: number | null;
  fx: { rate: number | null; source: 'usd' | 'table' | 'override' | 'missing' };
  missingFx: boolean;
  yoy?: { revenue: number | null; operatingIncome: number | null; deliveries: number | null };
  opMarginPrev?: number | null;
  quarter?: Quarter;
}

declare namespace App.ea.core {
  const METRICS: Array<{ key: MetricKey; label: string; kind: 'money' | 'count' }>;
  const TOPICS: Topic[];
  function toStoreUnit(value: number | string, unit: string, kind: 'money' | 'count'): number | null;
  function normPeriod(s: string): Period | null;
  function periodAdd(p: Period, n: number): Period;
  function fiscalLabel(p: Period, fyEnd: number): string;
  function rateFor(fx: FxData, currency: string, p: Period): number | null;
  function toMusd(millions: number, currency: string, p: Period, fx: FxData, override?: number): { value: number | null; rate: number | null; source: string };
  function derive(q: Quarter, c: Company, fx: FxData): Derived;
  function table(r: ReportData, c: Company, fx: FxData): Derived[]; // 최근 분기부터, YoY 는 발표 통화 기준
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
  function planPack(pack: Pack, reports: Record<string, ReportData>, companies: Company[]): Array<{ company: string; period: Period; action: 'add' | 'replace' | 'keep' | 'same' | 'skip'; reason: string; quarter: Quarter }>;
}
declare namespace App.ea.prompt {
  function buildCallPrompts(c: Company, p: Period, transcript: string, maxChars?: number): { split: { found: boolean }; prompts: Array<{ title: string; part: 'all' | 'prepared' | 'qa'; chars: number; text: string }> };
  function buildNumbersPrompt(c: Company, p: Period, text: string): string;
}
