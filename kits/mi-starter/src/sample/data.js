// 예시 데이터. 전부 만들어 낸 숫자이고 실제 회사, 실제 실적과 관계없습니다.
// 사내 데이터로 바꿀 때는 이 파일 대신 readTableFile() 로 엑셀을 읽으세요.

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export const MONTHS = [];
for (let y = 2023; y <= 2026; y++) {
  for (let m = 1; m <= 12; m++) {
    if (y === 2026 && m > 8) break;
    MONTHS.push(y + '-' + String(m).padStart(2, '0'));
  }
}

const SEASON = [0.86, 0.84, 1.05, 1.02, 1.04, 1.03, 0.96, 0.9, 1.0, 1.06, 1.08, 1.06];

function series(base, growthPerMonth, seed, seasonal = true) {
  const r = rng(seed);
  return MONTHS.map((_, t) => Math.round((base + growthPerMonth * t) * (seasonal ? SEASON[t % 12] : 1) * (0.96 + r() * 0.08)));
}

/** 차종별 월 판매 대수 */
export const SALES_BY_MODEL = [
  { model: 'SUV-A', values: series(4200, 18, 11) },
  { model: '세단-B', values: series(3600, -12, 12) },
  { model: 'EV-C', values: series(900, 42, 13) },
  { model: '소형-D', values: series(2100, 2, 14) },
];

/** 월 생산 대수 (전 차종 합) */
export const PRODUCTION = MONTHS.map((_, t) =>
  Math.round(SALES_BY_MODEL.reduce((s, m) => s + m.values[t], 0) * (1.01 + 0.03 * Math.sin(t / 2))));

/** OEM 별 2026년 1~8월 판매 대수 */
export const OEM_SHARE = [
  { oem: 'OEM A', units: 412000 },
  { oem: 'OEM B', units: 298000 },
  { oem: 'OEM C', units: 187000 },
  { oem: 'OEM D', units: 121000 },
  { oem: 'OEM E', units: 76000 },
  { oem: '기타', units: 58000 },
];

/** 경쟁사 생산거점. 좌표는 도시 위치이고 회사와 거점의 연결은 가상입니다. */
export const FABS = [
  { company: '경쟁사 가', site: '오스틴', country: 'United States of America', lon: -97.74, lat: 30.27, capacity: 120, status: '가동', start: 2019 },
  { company: '경쟁사 가', site: '평택', country: 'South Korea', lon: 127.11, lat: 36.99, capacity: 160, status: '증설', start: 2021 },
  { company: '경쟁사 가', site: '시안', country: 'China', lon: 108.94, lat: 34.34, capacity: 90, status: '가동', start: 2016 },
  { company: '경쟁사 나', site: '신주', country: 'Taiwan', lon: 120.97, lat: 24.8, capacity: 200, status: '가동', start: 2012 },
  { company: '경쟁사 나', site: '구마모토', country: 'Japan', lon: 130.71, lat: 32.8, capacity: 55, status: '증설', start: 2024 },
  { company: '경쟁사 나', site: '피닉스', country: 'United States of America', lon: -112.07, lat: 33.45, capacity: 40, status: '계획', start: 2027 },
  { company: '경쟁사 다', site: '드레스덴', country: 'Germany', lon: 13.74, lat: 51.05, capacity: 60, status: '가동', start: 2018 },
  { company: '경쟁사 다', site: '싱가포르', country: 'Singapore', lon: 103.82, lat: 1.35, capacity: 75, status: '증설', start: 2020 },
];

const OEMS = ['OEM A', 'OEM B', 'OEM C', 'OEM D'];
const PARTS = ['브레이크 모듈', '조향 센서', '배터리 케이스', '시트 프레임', '도어 모듈'];
const STATUS = ['확정', '확정', '확정', '협의', '보류'];

/** 수주 목록 */
export const ORDERS = (() => {
  const r = rng(77);
  return Array.from({ length: 36 }, (_, i) => {
    const month = 1 + Math.floor(i / 4.5);
    const day = 1 + Math.floor(r() * 27);
    const qty = 500 + Math.round(r() * 40) * 100;
    const unitPrice = [48000, 132000, 215000, 86000, 154000][i % 5];
    return {
      id: 'SO-2026-' + String(i + 1).padStart(3, '0'),
      date: '2026-' + String(month).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
      oem: OEMS[Math.floor(r() * OEMS.length)],
      part: PARTS[i % PARTS.length],
      qty,
      unitPrice,
      status: STATUS[Math.floor(r() * STATUS.length)],
      due: '2026-' + String(Math.min(12, month + 2)).padStart(2, '0') + '-' + String(day).padStart(2, '0'),
    };
  });
})();
