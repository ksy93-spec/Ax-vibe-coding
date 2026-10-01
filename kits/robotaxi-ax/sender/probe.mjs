// robotaxitracker.com 구조 조사용. 차단 원인(UA인지 IP인지)과 화면 글자, JSON 응답을 로그로 찍는다.
import { chromium } from 'playwright';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
for (const [name, opts] of [['curl-ua', null]]) {
  const r = await fetch('https://robotaxitracker.com/', { headers: { 'user-agent': UA, 'accept': 'text/html', 'accept-language': 'en-US,en;q=0.9' } });
  const t = await r.text();
  console.log('FETCH', name, r.status, r.headers.get('server'), r.headers.get('cf-mitigated'), t.length, t.slice(0, 300).replace(/\s+/g, ' '));
}
const ipr = await fetch('https://api.ipify.org').then((r) => r.text()).catch(() => '?');
console.log('runner ip', ipr.replace(/\d+$/, 'x'));

for (const headless of [true, false]) {
  const browser = await chromium.launch({ channel: 'chrome', headless, args: ['--disable-blink-features=AutomationControlled'] });
  const ctx = await browser.newContext({ userAgent: UA, locale: 'en-US', viewport: { width: 1400, height: 1000 } });
  const page = await ctx.newPage();
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
  console.log(`\n######## headless=${headless}`);
  await page.goto('https://robotaxitracker.com/', { waitUntil: 'networkidle', timeout: 90000 }).catch((e) => console.log('goto', e.message));
  await page.waitForTimeout(8000);
  console.log('TITLE', await page.title());
  const text = await page.evaluate(() => document.body.innerText);
  console.log('---- TEXT (' + text.length + ')');
  console.log(text.slice(0, 15000));
  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href]')].map((a) => a.href))]);
  console.log('---- LINKS'); console.log(links.join('\n'));
  console.log('---- RESPONSES');
  for (const x of seen) {
    console.log(`[${x.s}] ${x.ct.split(';')[0]} ${x.n} ${x.u}`);
    if (x.body && !x.u.includes('_next/static')) console.log('   ', x.body.slice(0, 3000).replace(/\s+/g, ' '));
  }
  await browser.close();
  if (!/Attention Required|blocked/i.test(text.slice(0, 200))) break;
}
