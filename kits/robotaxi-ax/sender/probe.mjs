// robotaxitracker.com 구조 조사 3차. API 를 브라우저 없이 받을 수 있는지, 숫자 정의가 무엇인지 확인한다.
import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const H = { 'user-agent': UA, accept: 'application/json,text/html,*/*', 'accept-language': 'en-US,en;q=0.9', referer: 'https://robotaxitracker.com/' };
const get = async (p) => { const r = await fetch('https://robotaxitracker.com' + p, { headers: H }); console.log('GET', p, r.status, r.headers.get('content-type')); return r; };

// 1. 차량 목록 집계
const vr = await get('/v1/api/compat/vehicles?limit=5000');
const vs = await vr.json();
const tesla = vs.filter((v) => v.provider === 'tesla');
console.log('vehicles total', vs.length, 'tesla', tesla.length);
console.log('KEYS', [...new Set(tesla.flatMap((v) => Object.keys(v)))].join(','));
console.log('TR KEYS', [...new Set(tesla.flatMap((v) => Object.keys(v.teslaRobotaxi || {})))].join(','));
console.log('models', JSON.stringify(tesla.reduce((a, v) => ((a[v.vehicleModel] = (a[v.vehicleModel] || 0) + 1), a), {})));
const now = Date.now();
const D = 86400000;
const rows = {};
for (const v of tesla) {
  const k = `${v.serviceArea?.slug}|${v.vehicleModel}`;
  const r = (rows[k] ||= { all: 0, test: 0, unsupFlag: 0, unsupEver: 0, d1: 0, d7: 0, d30: 0, unsup30: 0, listed: 0, vin: 0 });
  r.all++;
  if (v.isTestVehicle) r.test++;
  if (v.isUnsupervisedPassenger) r.unsupFlag++;
  if (v.firstSpottedUnsupervised) r.unsupEver++;
  const age = now - v.lastSpotted;
  if (age < D) r.d1++;
  if (age < 7 * D) r.d7++;
  if (age < 30 * D) r.d30++;
  if (age < 30 * D && v.firstSpottedUnsupervised) r.unsup30++;
  if (v.teslaRobotaxi?.listed) r.listed++;
  if (v.vin) r.vin++;
}
console.table(rows);
for (const k of ['isUnsupervisedPassenger', 'firstSpottedUnsupervised', 'isTestVehicle']) {
  const ex = tesla.find((v) => v[k]);
  if (ex) console.log('EX', k, JSON.stringify(ex).slice(0, 900));
}
console.log('VIN prefixes by model', JSON.stringify(tesla.filter((v) => v.vin).reduce((a, v) => { const k = v.vehicleModel + ':' + v.vin.slice(0, 5); a[k] = (a[k] || 0) + 1; return a; }, {})));

// 2. 텍사스 DMV
const dv = await (await get('/v1/api/texas-dmv/vins')).json();
const vins = Object.entries(dv.vins);
console.log('dmv schema', dv.schema_version, dv.generated_at, 'entries', vins.length, 'sample keys', JSON.stringify(vins[0]));
const cur = vins.filter(([, x]) => x.last_seen === dv.generated_at);
console.log('dmv current', cur.length, JSON.stringify(cur.reduce((a, [vin, x]) => { const k = x.provider + ':' + vin.slice(0, 5); a[k] = (a[k] || 0) + 1; return a; }, {})));
console.log('dmv all', JSON.stringify(vins.reduce((a, [vin, x]) => { const k = x.provider + ':' + vin.slice(0, 5); a[k] = (a[k] || 0) + 1; return a; }, {})));
console.log('dmv extra fields', JSON.stringify([...new Set(vins.flatMap(([, x]) => Object.keys(x)))]));

// 3. 번들에서 정의 찾기
const html = await (await get('/')).text();
const assets = new Set([...html.matchAll(/\/assets\/[\w.-]+\.js/g)].map((m) => m[0]));
const page = await (await chromium.launch({ channel: 'chrome' })).newContext({ userAgent: UA }).then((c) => c.newPage());
const loaded = new Set();
page.on('response', (r) => { if (r.url().includes('/assets/') && r.url().endsWith('.js')) loaded.add(new URL(r.url()).pathname); });
await page.goto('https://robotaxitracker.com/', { waitUntil: 'networkidle', timeout: 90000 });
await page.waitForTimeout(5000);
for (const a of loaded) assets.add(a);
const pats = /tracked all-time|In service|no safety driver|Unsupervised|firstSpottedUnsupervised|isUnsupervisedPassenger|lastSpotted|Matched to tracked|Registered AV fleet|Tesla Cybercab|IN_SERVICE|ACTIVE_WINDOW|DAYS/g;
for (const a of assets) {
  if (!/HomePage|FleetCount|useUsFleetModel|useLiveTexasDmv|registration|cities|index|route/.test(a)) continue;
  const js = await (await fetch('https://robotaxitracker.com' + a, { headers: H })).text();
  const hits = [...js.matchAll(pats)].slice(0, 40);
  console.log(`\n==== ${a} ${js.length} hits ${hits.length}`);
  let last = -9999;
  for (const h of hits) {
    if (h.index - last < 400) continue;
    last = h.index;
    console.log('  …', js.slice(Math.max(0, h.index - 400), h.index + 500).replace(/\s+/g, ' '));
  }
}

// 4. 도시별 화면 숫자
for (const city of ['All cities', 'Austin', 'Bay Area', 'Dallas', 'Houston', 'Miami', 'Orlando', 'Tampa']) {
  const btn = page.getByText(city, { exact: true }).first();
  try { await btn.click({ timeout: 5000 }); } catch (e) { console.log('click fail', city, e.message.split('\n')[0]); continue; }
  await page.waitForTimeout(2500);
  const t = await page.evaluate(() => document.body.innerText);
  const i = t.indexOf('Unsupervised');
  console.log(`\n#### ${city}:`, t.slice(Math.max(0, t.indexOf('All cities') - 10), t.indexOf('Trips logged') + 40).replace(/\n+/g, ' | '));
  console.log(`  …panel:`, t.slice(t.indexOf('Vehicles here') - 5, t.indexOf('Vehicles here') + 120).replace(/\n+/g, ' | '));
}
process.exit(0);
