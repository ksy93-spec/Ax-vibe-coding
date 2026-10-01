// robotaxitracker.com 구조 조사용. 화면 글자와 JSON 응답을 로그로 찍는다.
import { chromium } from 'playwright';

const START = process.argv[2] || 'https://robotaxitracker.com/';
const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
const seen = [];
page.on('response', async (r) => {
  const ct = r.headers()['content-type'] || '';
  const u = r.url();
  if (/\.(png|jpe?g|webp|svg|woff2?|css|ico)(\?|$)/.test(u)) return;
  let body = '';
  if (ct.includes('json') || ct.includes('text/x-component') || u.includes('/api/')) {
    try { body = await r.text(); } catch { body = '(읽기 실패)'; }
  }
  seen.push({ u, s: r.status(), ct, n: body.length, body });
});

async function dump(url) {
  seen.length = 0;
  console.log(`\n######## ${url}`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.log('goto', e.message));
  await page.waitForTimeout(6000);
  console.log('TITLE', await page.title(), '|', page.url());
  const text = await page.evaluate(() => document.body.innerText);
  console.log('---- TEXT (' + text.length + ')');
  console.log(text.slice(0, 12000));
  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href))]);
  console.log('---- LINKS'); console.log(links.join('\n'));
  const nd = await page.evaluate(() => !!window.__NEXT_DATA__);
  console.log('---- __NEXT_DATA__', nd);
  console.log('---- RESPONSES');
  for (const x of seen) {
    console.log(`[${x.s}] ${x.ct.split(';')[0]} ${x.n} ${x.u}`);
    if (x.body && !x.u.includes('_next/static')) console.log('   ', x.body.slice(0, 2500).replace(/\s+/g, ' '));
  }
  return links;
}

const links = await dump(START);
const more = links.filter((l) => /robotaxitracker\.com\/(tesla|fleet|vehicles|cities|stats|data)/i.test(l)).slice(0, 4);
for (const l of more) await dump(l);
await browser.close();
