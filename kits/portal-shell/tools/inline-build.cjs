#!/usr/bin/env node
/* 빌드 결과물(dist)을 HTML 파일 하나로 합칩니다. Node 표준 모듈만 씁니다.
 *
 * 왜 필요한가
 *   Vite, Webpack 5 ESM 등으로 만든 앱은 <script type="module" crossorigin src="..."> 로
 *   JS 를 불러옵니다. file:// 로 열면 브라우저가 이걸 CORS 로 막아 빈 화면이 됩니다.
 *   base: './' 로 경로만 바꿔도 해결되지 않습니다(crossorigin 때문에 CSS 까지 막힘).
 *   JS 와 CSS 를 HTML 안에 직접 넣으면 가져올 파일이 없으니 막힐 것도 없습니다.
 *
 * 사용법
 *   node inline-build.cjs <dist 폴더> <출력 폴더>
 *   예) node C:\portal\tools\inline-build.cjs dist C:\portal\apps\psi
 *
 * 출력 폴더에 index.html 하나가 생깁니다. 인라인하지 못한 파일(public 폴더의 이미지 등)은
 * 같은 상대 경로로 복사합니다.
 *
 * 앱의 빌드 설정에 아래가 들어 있어야 한 파일로 떨어집니다. 없으면 이 도구가 알려 줍니다.
 *   Vite:  build.assetsInlineLimit 을 크게, build.cssCodeSplit false,
 *          동적 import 를 한 파일로 합치는 옵션(inlineDynamicImports)
 *   자세한 것은 docs/app-integration.md
 */
'use strict';

const fs = require('fs');
const path = require('path');

const MIME = {
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.avif': 'image/avif',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.json': 'application/json',
};

function fail(msg) {
  console.error('\n실패: ' + msg + '\n');
  process.exit(1);
}

const distDir = process.argv[2];
const outDir = process.argv[3];
if (!distDir || !outDir) {
  console.log('사용법: node inline-build.cjs <dist 폴더> <출력 폴더>');
  process.exit(1);
}
const indexPath = path.join(distDir, 'index.html');
if (!fs.existsSync(indexPath)) fail(indexPath + ' 가 없습니다. 앱을 먼저 빌드하세요 (npm run build).');

const consumed = new Set([path.resolve(indexPath)]);
const warnings = [];

/** HTML/CSS 안의 참조를 실제 파일 경로로. 외부 URL 이나 data: 는 null. */
function resolveRef(ref, baseDir) {
  if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref)) return null;
  const clean = decodeURIComponent(ref.split(/[?#]/)[0]);
  const abs = clean.startsWith('/') ? path.join(distDir, clean) : path.join(baseDir, clean);
  return fs.existsSync(abs) && fs.statSync(abs).isFile() ? abs : null;
}

function dataUri(file) {
  const mime = MIME[path.extname(file).toLowerCase()];
  if (!mime) return null;
  consumed.add(path.resolve(file));
  return 'data:' + mime + ';base64,' + fs.readFileSync(file).toString('base64');
}

function inlineCssUrls(css, baseDir) {
  return css.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, function (whole, quote, ref) {
    const file = resolveRef(ref.trim(), baseDir);
    if (!file) return whole;
    const uri = dataUri(file);
    return uri ? 'url("' + uri + '")' : whole;
  });
}

function attr(tag, name) {
  const m = new RegExp('\\b' + name + '\\s*=\\s*(["\'])(.*?)\\1', 'i').exec(tag);
  return m ? m[2] : null;
}

let html = fs.readFileSync(indexPath, 'utf8');

// 1. 외부 스크립트를 본문으로. replace 에 함수를 넘겨야 코드 안의 $& 같은 패턴이 치환되지 않습니다.
html = html.replace(/<script\b([^>]*)\bsrc\s*=\s*(["'])([^"']+)\2([^>]*)>\s*<\/script>/gi,
  function (whole, pre, q, src, post) {
    const file = resolveRef(src, distDir);
    if (!file) {
      if (/^(?:https?:)?\/\//i.test(src)) warnings.push('외부 스크립트는 폐쇄망에서 실패합니다: ' + src);
      return whole;
    }
    consumed.add(path.resolve(file));
    const isModule = /type\s*=\s*["']module["']/i.test(pre + post);
    // </script 가 코드 안에 있으면 HTML 파서가 스크립트를 거기서 끊습니다.
    const code = fs.readFileSync(file, 'utf8').replace(/<\/script/gi, '<\\/script');
    return '<script' + (isModule ? ' type="module"' : '') + '>' + code + '</script>';
  });

// 2. 스타일시트를 본문으로, modulepreload 는 지웁니다.
const preloads = [];
html = html.replace(/<link\b[^>]*>/gi, function (tag) {
  const rel = (attr(tag, 'rel') || '').toLowerCase();
  const href = attr(tag, 'href');
  if (rel === 'modulepreload') {
    preloads.push(href);
    return '';
  }
  if (rel === 'stylesheet') {
    const file = resolveRef(href, distDir);
    if (!file) {
      if (href && /^(?:https?:)?\/\//i.test(href)) warnings.push('외부 스타일시트는 폐쇄망에서 실패합니다: ' + href);
      return tag;
    }
    consumed.add(path.resolve(file));
    const css = inlineCssUrls(fs.readFileSync(file, 'utf8'), path.dirname(file)).replace(/<\/style/gi, '<\\/style');
    return '<style>' + css + '</style>';
  }
  if (rel === 'icon' || rel === 'shortcut icon' || rel === 'apple-touch-icon') {
    const file = resolveRef(href, distDir);
    const uri = file && dataUri(file);
    return uri ? tag.replace(href, uri) : tag;
  }
  return tag;
});

// 3. 남은 코드 분할 흔적을 찾습니다. 있으면 file:// 에서 그 조각을 못 불러옵니다.
const splitRef = /(?:\bimport\s*\(\s*|\bfrom\s*|\bimport\s*)(["'`])(\.{0,2}\/[^"'`]+?\.m?js)\1/g;
const leftovers = new Set();
html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, function (whole, code) {
  let m;
  splitRef.lastIndex = 0;
  while ((m = splitRef.exec(code))) leftovers.add(m[2]);
  return whole;
});
preloads.forEach(function (p) {
  const f = resolveRef(p, distDir);
  if (f && !consumed.has(path.resolve(f))) leftovers.add(p);
});
if (leftovers.size) {
  fail('JS 가 여러 조각으로 나뉘어 있습니다: ' + Array.from(leftovers).join(', ') + '\n' +
       '      file:// 에서는 나머지 조각을 불러올 수 없습니다.\n' +
       '      빌드 설정에 동적 import 를 한 파일로 합치는 옵션을 넣고 다시 빌드하세요.\n' +
       '      docs/app-integration.md 의 "빌드 설정" 을 보세요.');
}

// 4. 절대 경로(/...)는 file:// 에서 드라이브 루트를 가리킵니다. 상대 경로로 바꿉니다.
html = html.replace(/(\s(?:src|href)\s*=\s*["'])\/(?!\/)/gi, '$1./');

// 5. 인라인하지 않은 파일은 그대로 복사합니다.
fs.mkdirSync(outDir, { recursive: true });
const copied = [];
(function walk(dir) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (ent) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) return walk(full);
    if (consumed.has(path.resolve(full))) return;
    const rel = path.relative(distDir, full);
    const dest = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(full, dest);
    copied.push(rel);
  });
})(distDir);

const outFile = path.join(outDir, 'index.html');
fs.writeFileSync(outFile, html, 'utf8');

// 6. 결과 요약
const kb = Math.round(fs.statSync(outFile).size / 1024);
console.log('완료: ' + outFile + ' (' + kb + 'KB)');
if (copied.length) console.log('함께 복사한 파일 ' + copied.length + '개: ' + copied.slice(0, 8).join(', ') + (copied.length > 8 ? ' ...' : ''));
if (/["'`]\/assets\//.test(html)) {
  warnings.push('JS 안에 /assets/ 로 시작하는 절대 경로가 남아 있습니다. 이미지나 폰트가 안 보이면 ' +
                'build.assetsInlineLimit 을 크게 잡고 다시 빌드하세요.');
}
if (/https?:\/\/(?:cdn|unpkg|fonts\.googleapis|cdnjs)/i.test(html)) {
  warnings.push('CDN 주소가 남아 있습니다. 폐쇄망에서는 그 부분이 로드되지 않습니다.');
}
warnings.forEach(function (w) { console.log('주의: ' + w); });
