#!/usr/bin/env node
/* 한글 웹 글꼴을 npm 에서 받아 킷의 public/fonts/<id>/ 에 모읍니다. 인터넷이 되는 곳에서만 실행합니다.
 *
 *   node scripts/collect-fonts.cjs kits/mi-portal                       → kits/mi-portal/public/fonts/ 에 전부
 *   node scripts/collect-fonts.cjs --out shared/fonts --only pretendard → 지정 폴더에 고른 글꼴만
 *
 * 글꼴 파일은 배포처가 준 그대로 복사합니다. 직접 서브셋하거나 형식을 바꾸지 않습니다.
 * OFL 의 "Reserved Font Name" 이 걸린 글꼴(Pretendard, SUIT, 나눔, Spoqa, Plex)은 고치면
 * 원래 이름을 쓸 수 없기 때문입니다. 용량이 큰 글꼴은 배포처가 글자 범위별로 나눠 둔 파일(unicode-range)을
 * 쓰므로, 화면에 나온 글자가 든 파일만 읽힙니다.
 *
 * 결과
 *   public/fonts/<id>/font.css    @font-face 모음 (경로는 같은 폴더 기준)
 *   public/fonts/<id>/*.woff2     글꼴 파일
 *   public/fonts/<id>/LICENSE.txt 배포처 라이선스 원문
 *   public/fonts/fonts.json       글꼴별 패키지, 버전, 파일 수, 용량 (MANIFEST 작성용, 전부 받을 때만)
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

// family 는 font.css 안의 이름과 같아야 합니다. src/config/fonts.ts 의 family 도 같게 둡니다.
const FONTS = [
  { id: 'pretendard', pkg: 'pretendard@1.3.9', family: 'Pretendard Variable',
    css: ['dist/web/variable/pretendardvariable-dynamic-subset.css'], license: 'dist/LICENSE.txt' },
  { id: 'noto-sans-kr', pkg: '@fontsource-variable/noto-sans-kr@5.3.0', family: 'Noto Sans KR Variable',
    css: ['index.css'], license: 'LICENSE' },
  { id: 'nanum-gothic', pkg: '@fontsource/nanum-gothic@5.3.0', family: 'Nanum Gothic',
    css: ['400.css', '700.css'], license: 'LICENSE' },
  { id: 'gowun-dodum', pkg: '@fontsource/gowun-dodum@5.3.0', family: 'Gowun Dodum',
    css: ['400.css'], license: 'LICENSE' },
  { id: 'noto-serif-kr', pkg: '@fontsource-variable/noto-serif-kr@5.3.0', family: 'Noto Serif KR Variable',
    css: ['index.css'], license: 'LICENSE' },
  { id: 'suit', pkg: '@sun-typeface/suit@2.0.5', family: 'SUIT Variable', license: 'LICENSE',
    files: [{ src: 'fonts/variable/woff2/SUIT-Variable.woff2', weight: '100 900', format: 'woff2-variations' }] },
  { id: 'wanted-sans', pkg: 'wanted-sans@1.0.3', family: 'Wanted Sans Variable', license: 'fonts/OFL.txt',
    files: [{ src: 'fonts/webfonts/variable/complete/woff2/WantedSansVariable.woff2', weight: '400 1000', format: 'woff2-variations' }] },
  { id: 'ibm-plex-sans-kr', pkg: '@ibm/plex-sans-kr@1.1.0', family: 'IBM Plex Sans KR', license: 'LICENSE.txt',
    files: [400, 500, 600, 700].map((w) => ({
      src: `fonts/complete/woff2/hinted/IBMPlexSansKR-${{ 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold' }[w]}.woff2`,
      weight: String(w), format: 'woff2',
    })) },
  { id: 'spoqa-han-sans-neo', pkg: 'spoqa-han-sans@3.3.0', family: 'Spoqa Han Sans Neo', license: 'LICENSE',
    files: [[400, 'Regular'], [500, 'Medium'], [700, 'Bold']].map(([w, n]) => ({
      src: `Subset/SpoqaHanSansNeo/SpoqaHanSansNeo-${n}.otf`, weight: String(w), format: 'opentype',
    })) },
];

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args.splice(i, 2)[1] : undefined;
};
const outArg = opt('--out');
const only = (opt('--only') || '').split(',').filter(Boolean);
let outRoot;
if (outArg) {
  outRoot = path.resolve(outArg);
} else {
  const kitDir = path.resolve(args[0] || '');
  if (!fs.existsSync(path.join(kitDir, 'package.json'))) {
    console.error('사용법: node scripts/collect-fonts.cjs kits/<킷이름>  또는  --out <폴더> [--only id,id]');
    process.exit(1);
  }
  outRoot = path.join(kitDir, 'public', 'fonts');
}
const unknown = only.filter((id) => !FONTS.some((f) => f.id === id));
if (unknown.length) {
  console.error('모르는 글꼴: ' + unknown.join(', '));
  process.exit(1);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fonts-'));
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const summary = [];

try {
  for (const f of FONTS.filter((x) => !only.length || only.includes(x.id))) {
    const tgz = execFileSync(npm, ['pack', f.pkg, '--silent'], { cwd: tmp, shell: process.platform === 'win32' })
      .toString().trim().split('\n').pop();
    const pkgDir = path.join(tmp, f.id);
    fs.mkdirSync(pkgDir);
    execFileSync('tar', ['-xzf', path.join(tmp, tgz), '-C', pkgDir]);
    const root = path.join(pkgDir, 'package');

    const out = path.join(outRoot, f.id);
    fs.rmSync(out, { recursive: true, force: true });
    fs.mkdirSync(out, { recursive: true });

    let css = `/* ${f.pkg} 의 원본 파일. 수정하지 않았습니다. 라이선스는 LICENSE.txt */\n`;
    if (f.css) {
      for (const rel of f.css) {
        const cssPath = path.join(root, rel);
        let text = fs.readFileSync(cssPath, 'utf8');
        // woff 대체 경로는 버리고 woff2 만 남깁니다. 지원 브라우저(Chrome, Edge 111 이상)는 모두 woff2 를 읽습니다.
        text = text.replace(/,\s*url\([^)]*\.woff\)\s*format\(['"]woff['"]\)/g, '');
        text = text.replace(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g, (m, u) => {
          const src = path.resolve(path.dirname(cssPath), u);
          const name = path.basename(src);
          fs.copyFileSync(src, path.join(out, name));
          return `url('./${name}')`;
        });
        const fam = /font-family:\s*['"]([^'"]+)['"]/.exec(text);
        if (!fam || fam[1] !== f.family) throw new Error(`${f.id}: css 의 font-family(${fam && fam[1]})가 ${f.family} 와 다릅니다.`);
        css += text + '\n';
      }
    } else {
      for (const file of f.files) {
        const name = path.basename(file.src);
        fs.copyFileSync(path.join(root, file.src), path.join(out, name));
        css += `@font-face {\n  font-family: '${f.family}';\n  font-style: normal;\n  font-display: swap;\n` +
          `  font-weight: ${file.weight};\n  src: url('./${name}') format('${file.format}');\n}\n`;
      }
    }
    fs.writeFileSync(path.join(out, 'font.css'), css);
    fs.copyFileSync(path.join(root, f.license), path.join(out, 'LICENSE.txt'));

    const files = fs.readdirSync(out).filter((n) => /\.(woff2|otf)$/.test(n));
    const bytes = files.reduce((s, n) => s + fs.statSync(path.join(out, n)).size, 0);
    const longest = Math.max(...fs.readdirSync(out).map((n) => `${f.id}/${n}`.length));
    summary.push({ id: f.id, family: f.family, package: f.pkg, files: files.length, bytes, longestPath: longest });
    console.log(`${f.id.padEnd(20)} 파일 ${String(files.length).padStart(3)}개  ${(bytes / 1048576).toFixed(1)}MB  글꼴 폴더 기준 가장 긴 경로 ${longest}자`);
  }
  if (!only.length) fs.writeFileSync(path.join(outRoot, 'fonts.json'), JSON.stringify(summary, null, 2) + '\n');
  const total = summary.reduce((s, f) => s + f.bytes, 0);
  console.log(`합계 ${(total / 1048576).toFixed(1)}MB`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
