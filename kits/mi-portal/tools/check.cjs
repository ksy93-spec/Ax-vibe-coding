#!/usr/bin/env node
/* 사내 모델이 만든 코드를 빌드 전에 검사합니다. Node 표준 모듈만 씁니다.
 *
 *   npm run check
 *
 * 오류(빌드가 깨지거나 폐쇄망, 더블클릭 실행에서 안 도는 것)가 있으면 종료 코드 1 로 끝납니다.
 * 경고는 동작은 하지만 이 포탈의 규칙에 어긋나는 것입니다.
 * 타입 오류는 여기서 보지 않습니다. npm run typecheck 로 확인하세요.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const installed = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
const NODE_BUILTINS = /^(node:|fs$|path$|url$)/;

// 설치는 되어 있지만 정해진 파일 밖에서는 쓰지 않는 경로. [패턴, 허용 파일, 이유]
const RESTRICTED = [
  [/^echarts(\/.*)?$/, ['src/lib/mi/echarts.ts'], "echarts 는 '@/components/mi/chart' 의 <Chart> 로만 그립니다. 직접 불러오면 용량이 세 배가 됩니다."],
  [/^echarts-for-react/, ['src/components/mi/chart.tsx'], "'@/components/mi/chart' 의 <Chart> 를 쓰세요. echarts-for-react/lib/core 는 빌드 후 화면이 비는 원인입니다."],
  [/^@hyunbinseo\/holidays-kr/, ['src/lib/mi/calendar.js'], "'@/lib/mi/calendar' 의 isHoliday 를 쓰세요. 원본 기본 경로는 Promise 를 돌려줘 항상 참이 됩니다."],
  [/^(world-atlas|topojson-client)/, ['src/lib/mi/echarts.ts'], "세계 지도는 이미 'world' 로 등록되어 있습니다. <Chart> 의 geo: { map: 'world' } 를 쓰세요."],
];

const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00a0]/g;
const IMPORT = /(?:^|[\s;])(import\s+type\s+|import\s+(?:[^'"`;]*?\s+from\s+)?|import\s*\(\s*|require\s*\(\s*|export\s+[^'"`;]*?\s+from\s+)(['"])([^'"]+)\2/g;
const REMOTE = /["'`(](https?:\/\/(?!localhost|127\.0\.0\.1|www\.w3\.org\/)[^"'`\s)]+)/g;
const HEX = /['"`]#[0-9a-fA-F]{3,8}\b|\[#[0-9a-fA-F]{3,8}\]/g;
const FETCH = /\bfetch\s*\(/g;
const PX_TEXT = /\btext-\[\d+(?:\.\d+)?px\]/g;
const FONT_FAMILY = /\bfontFamily\s*:|font-family\s*:/g;
// 글꼴을 정하는 곳. 다른 파일에서 글꼴 이름을 박으면 사용자가 고른 글꼴이 먹지 않습니다.
const FONT_OK = new Set([
  'src/config/fonts.ts',
  'src/components/mi/chart.tsx',
  'src/features/settings/appearance/appearance-form.tsx',
]);
const ABS_HREF = /\bhref=\{?['"]\/(?!\/)/g;
// 차트 테마, 브라우저 테마색 meta, 설정 화면의 밝은/어두운 미리보기 그림은 일부러 색을 박아 둡니다.
const HEX_OK = new Set([
  'src/lib/mi/echarts.ts',
  'src/components/theme-switch.tsx',
  'src/features/settings/appearance/appearance-form.tsx',
]);

const errors = [];
const warns = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : /\.(tsx?|jsx?|mjs|css)$/.test(e.name) ? [full] : [];
  });
}

const lineOf = (text, index) => text.slice(0, index).split('\n').length;

function stripComments(text) {
  // 주석 안의 예시 코드는 검사하지 않습니다. 줄 번호를 지키려고 줄바꿈은 남깁니다.
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
}

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  if (rel === 'src/routeTree.gen.ts') continue;
  const raw = fs.readFileSync(file, 'utf8');
  const text = stripComments(raw);
  let m;

  INVISIBLE.lastIndex = 0;
  while ((m = INVISIBLE.exec(raw))) {
    errors.push(`${rel}:${lineOf(raw, m.index)}  보이지 않는 문자 U+${m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}. 복사 중 깨집니다. 문자열 안이면 \\u 이스케이프로 쓰세요.`);
  }

  if (/\.css$/.test(file)) {
    REMOTE.lastIndex = 0;
    while ((m = REMOTE.exec(text))) errors.push(`${rel}:${lineOf(text, m.index)}  외부 주소 ${m[1]} . 폐쇄망에서는 불러올 수 없습니다.`);
    continue;
  }

  IMPORT.lastIndex = 0;
  while ((m = IMPORT.exec(text))) {
    const typeOnly = /^import\s+type/.test(m[1]);
    const spec = m[3];
    const at = `${rel}:${lineOf(text, m.index + m[0].search(/\S/))}`;
    if (spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('@/') || NODE_BUILTINS.test(spec)) continue;
    const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
    if (!installed.has(name)) {
      errors.push(`${at}  설치되지 않은 패키지 '${name}'. 폐쇄망이라 새로 설치할 수 없습니다. PROMPT.md 의 패키지 목록 안에서 바꾸세요.`);
      continue;
    }
    if (typeOnly) continue;
    for (const [re, allowed, why] of RESTRICTED) {
      if (re.test(spec) && !allowed.includes(rel)) errors.push(`${at}  '${spec}': ${why}`);
    }
  }

  REMOTE.lastIndex = 0;
  while ((m = REMOTE.exec(text))) errors.push(`${rel}:${lineOf(text, m.index)}  외부 주소 ${m[1]} . 폐쇄망에서는 불러올 수 없습니다.`);

  FETCH.lastIndex = 0;
  while ((m = FETCH.exec(text))) {
    warns.push(`${rel}:${lineOf(text, m.index)}  fetch(). 더블클릭으로 연 포탈(file://)에서는 로컬 파일을 fetch 로 읽을 수 없습니다. 엑셀은 readTableFile, 고정 데이터는 src/data 의 모듈로 두세요.`);
  }

  ABS_HREF.lastIndex = 0;
  while ((m = ABS_HREF.exec(text))) {
    warns.push(`${rel}:${lineOf(text, m.index)}  '/' 로 시작하는 href. 포탈은 #/orders 같은 해시 주소를 씁니다. <Link to='/orders'> 를 쓰세요.`);
  }

  PX_TEXT.lastIndex = 0;
  while ((m = PX_TEXT.exec(text))) {
    warns.push(`${rel}:${lineOf(text, m.index)}  ${m[0]}. px 로 정한 글자는 글자 크기 설정을 따라가지 않습니다. text-sm, text-base 같은 이름을 쓰세요.`);
  }
  if (!FONT_OK.has(rel) && !rel.endsWith('.css')) {
    FONT_FAMILY.lastIndex = 0;
    while ((m = FONT_FAMILY.exec(text))) {
      warns.push(`${rel}:${lineOf(text, m.index)}  글꼴을 직접 정했습니다. 사용자가 고른 글꼴이 적용되지 않습니다. 지우고 기본 글꼴을 따르세요.`);
    }
  }

  if (!HEX_OK.has(rel) && !rel.startsWith('src/assets/')) {
    HEX.lastIndex = 0;
    while ((m = HEX.exec(text))) {
      warns.push(`${rel}:${lineOf(text, m.index)}  색상값 ${m[0].replace(/^['"`[]|]$/g, '')} 을 직접 썼습니다. 다크 모드에서 어긋납니다. text-primary, bg-muted 같은 테마 이름을 쓰세요.`);
    }
  }
}

// 글꼴 목록(src/config/fonts.ts)의 글꼴마다 public/fonts/<id>/font.css 가 있고 이름이 맞는지 봅니다.
const fontsTs = fs.readFileSync(path.join(SRC, 'config/fonts.ts'), 'utf8');
for (const [, id, family] of fontsTs.matchAll(/\{\s*id:\s*'([^']+)',[^}]*?family:\s*'([^']+)'/g)) {
  const css = path.join(ROOT, 'public/fonts', id, 'font.css');
  if (!fs.existsSync(css)) {
    errors.push(`src/config/fonts.ts  글꼴 '${id}' 의 파일이 없습니다: public/fonts/${id}/font.css. scripts/collect-fonts.cjs 로 받으세요.`);
  } else if (!fs.readFileSync(css, 'utf8').includes(`'${family}'`)) {
    errors.push(`src/config/fonts.ts  글꼴 '${id}' 의 family '${family}' 가 public/fonts/${id}/font.css 의 이름과 다릅니다.`);
  }
}

// exe 앱의 launchId 가 실행기 목록(public/launcher/apps.ini)에 있는지 봅니다.
const appsTs = fs.readFileSync(path.join(SRC, 'config/apps.ts'), 'utf8');
const iniPath = path.join(ROOT, 'public/launcher/apps.ini');
const iniIds = fs.existsSync(iniPath)
  ? fs.readFileSync(iniPath, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !/^[#;]/.test(l) && l.includes('='))
      .map((l) => l.slice(0, l.indexOf('=')).trim().toLowerCase())
  : [];
for (const [, id] of stripComments(appsTs).matchAll(/launchId:\s*'([^']+)'/g)) {
  if (!/^[a-z0-9][a-z0-9-]{0,40}$/.test(id)) {
    errors.push(`src/config/apps.ts  launchId '${id}' 는 영문 소문자, 숫자, - 만 쓸 수 있습니다 (실행기가 거부합니다).`);
  } else if (!iniIds.includes(id)) {
    warns.push(`src/config/apps.ts  launchId '${id}' 가 public/launcher/apps.ini 에 없습니다. 실행 단추를 눌러도 "목록에 없습니다" 가 뜹니다.`);
  }
}

// 사이드바 메뉴의 주소마다 화면 파일이 있는지 봅니다.
const sidebar = fs.readFileSync(path.join(SRC, 'components/layout/data/sidebar-data.ts'), 'utf8');
for (const [, url] of sidebar.matchAll(/url:\s*'([^']+)'/g)) {
  const dir = path.join(SRC, 'routes/_app', url === '/' ? '' : url);
  const candidates = url === '/' ? [path.join(dir, 'index.tsx')] : [path.join(dir, 'index.tsx'), dir + '.tsx', path.join(dir, 'route.tsx')];
  if (!candidates.some((f) => fs.existsSync(f))) {
    errors.push(`src/components/layout/data/sidebar-data.ts  메뉴 주소 '${url}' 에 해당하는 화면 파일이 없습니다. src/routes/_app${url}/index.tsx 를 만드세요.`);
  }
}

for (const w of warns) console.log('경고  ' + w);
for (const e of errors) console.log('오류  ' + e);
console.log('');
if (errors.length) {
  console.log(`오류 ${errors.length}건, 경고 ${warns.length}건. 오류를 고친 뒤 빌드하세요.`);
  process.exit(1);
}
console.log(`통과. 경고 ${warns.length}건.`);
