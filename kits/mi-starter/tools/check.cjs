#!/usr/bin/env node
/* ChatGPT 등이 만든 코드를 빌드 전에 검사합니다. Node 표준 모듈만 씁니다.
 *
 *   npm run check
 *
 * 오류(빌드가 깨지거나 폐쇄망에서 안 도는 것)가 있으면 종료 코드 1 로 끝납니다.
 * 경고는 동작은 하지만 규칙에 어긋나는 것입니다.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const installed = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
const NODE_BUILTINS = new Set(['fs', 'path', 'url', 'node:test', 'node:assert', 'node:assert/strict', 'node:fs', 'node:path']);

// 설치는 되어 있지만 쓰면 안 되는 경로. 이유를 같이 알려 줍니다.
const BANNED = [
  [/^echarts$/, "'echarts' 전체를 불러오면 용량이 세 배가 됩니다. components/Chart.jsx 를 쓰세요."],
  [/^echarts-for-react(\/lib\/core)?$/, "echarts-for-react 는 components/Chart.jsx 안에서만 씁니다 (lib/core 는 빌드 후 화면이 비는 원인)."],
  [/^ag-grid-community\/styles/, 'AG Grid 33 이후 CSS 파일 방식은 쓰지 않습니다. components/DataGrid.jsx 를 쓰세요.'],
  [/^@hyunbinseo\/holidays-kr$/, "기본 경로의 isHoliday 는 Promise 를 돌려줘 항상 참이 됩니다. lib/calendar.js 를 쓰세요."],
];

const TW_PALETTE = 'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose';
const TW_DEFAULT_COLOR = new RegExp('\\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|divide|decoration|shadow|accent|caret|placeholder)-(?:(?:' + TW_PALETTE + ')-\\d{2,3}|white|black)\\b', 'g');
const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff\u00a0]/g;
const IMPORT = /(?:^|[\s;])(?:import\s+(?:[^'"`;]*?\s+from\s+)?|import\s*\(\s*|require\s*\(\s*|export\s+[^'"`;]*?\s+from\s+)(['"])([^'"]+)\1/g;
const REMOTE = /["'`](https?:\/\/(?!localhost|127\.0\.0\.1)[^"'`\s]+)/g;
const HEX = /#[0-9a-fA-F]{3,8}\b/g;
const COLOR_FILES = new Set(['src/index.css', 'src/lib/echarts.js']);

const errors = [];
const warns = [];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? walk(full) : /\.(jsx?|mjs|css)$/.test(e.name) ? [full] : [];
  });
}

function lineOf(text, index) {
  return text.slice(0, index).split('\n').length;
}

function stripComments(text) {
  // 주석 안의 예시 코드는 검사하지 않습니다. 줄 번호를 지키려고 줄바꿈은 남깁니다.
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, pre) => pre + ' '.repeat(m.length - pre.length));
}

for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file).split(path.sep).join('/');
  const raw = fs.readFileSync(file, 'utf8');
  const text = stripComments(raw);
  let m;

  INVISIBLE.lastIndex = 0;
  while ((m = INVISIBLE.exec(raw))) {
    errors.push(rel + ':' + lineOf(raw, m.index) + '  보이지 않는 문자 U+' + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, '0') +
      '. 복사 중 깨집니다. 문자열 안이면 \\u 이스케이프로 쓰세요.');
  }

  if (/\.(jsx?|mjs)$/.test(file)) {
    IMPORT.lastIndex = 0;
    while ((m = IMPORT.exec(text))) {
      const spec = m[2];
      // 정규식 앞부분이 이전 줄의 줄바꿈까지 물 수 있어서, 실제 글자 위치로 줄을 셉니다.
      const at = rel + ':' + lineOf(text, m.index + m[0].search(/\S/));
      if (spec.startsWith('.') || spec.startsWith('/')) continue;
      const name = spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0];
      if (NODE_BUILTINS.has(spec) || NODE_BUILTINS.has(name)) continue;
      if (!installed.has(name)) {
        errors.push(at + "  설치되지 않은 패키지 '" + name + "'. 폐쇄망이라 새로 설치할 수 없습니다. PROMPT.md 의 패키지 목록 안에서 바꾸세요.");
        continue;
      }
      if (rel === 'src/components/Chart.jsx' || rel === 'src/lib/echarts.js' || rel === 'src/lib/calendar.js') continue;
      for (const [re, why] of BANNED) if (re.test(spec)) errors.push(at + "  '" + spec + "': " + why);
    }
    REMOTE.lastIndex = 0;
    while ((m = REMOTE.exec(text))) {
      errors.push(rel + ':' + lineOf(text, m.index) + '  외부 주소 ' + m[1] + ' . 폐쇄망에서는 불러올 수 없습니다.');
    }
  }

  TW_DEFAULT_COLOR.lastIndex = 0;
  while ((m = TW_DEFAULT_COLOR.exec(text))) {
    errors.push(rel + ':' + lineOf(text, m.index) + "  Tailwind 기본 색 '" + m[0] + "' 은 꺼져 있어 아무 색도 안 나옵니다. bg-surface, text-muted 같은 토큰 이름을 쓰세요.");
  }

  if (!COLOR_FILES.has(rel)) {
    HEX.lastIndex = 0;
    while ((m = HEX.exec(text))) {
      const line = text.split('\n')[lineOf(text, m.index) - 1] || '';
      if (/['"`]#[0-9a-fA-F]/.test(line) || /:\s*#/.test(line)) {
        warns.push(rel + ':' + lineOf(text, m.index) + '  색상값 ' + m[0] + ' 을 직접 썼습니다. 다크 모드에서 어긋납니다. 토큰이나 테마 색을 쓰세요.');
      }
    }
  }
}

for (const w of warns) console.log('경고  ' + w);
for (const e of errors) console.log('오류  ' + e);
console.log('');
if (errors.length) {
  console.log('오류 ' + errors.length + '건, 경고 ' + warns.length + '건. 오류를 고친 뒤 빌드하세요.');
  process.exit(1);
}
console.log('통과. 경고 ' + warns.length + '건.');
