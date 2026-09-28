#!/usr/bin/env node
/* 킷의 package-lock.json 에 적힌 패키지 tarball 을 vendor/ 에 짧은 이름으로 모읍니다.
 *
 *   node scripts/vendor-npm.cjs kits/<킷이름>
 *
 * npm 캐시 폴더(_cacache)를 그대로 반입하면 파일 이름이 128자 해시라 경로가 260자를 넘고,
 * 윈도 탐색기 압축 풀기에서 오류가 납니다. vendor/ 의 파일 이름은 "react-19.3.0.tgz" 처럼 짧습니다.
 * 사내에서는 킷의 tools/install-offline.cjs 가 이 tarball 로 캐시를 다시 만든 뒤 npm ci --offline 을 합니다.
 *
 * 윈도 x64, 리눅스 x64 용 네이티브 바이너리를 함께 받습니다. 인터넷이 되는 곳에서만 실행합니다.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const kitDir = path.resolve(process.argv[2] || '');
const lockPath = path.join(kitDir, 'package-lock.json');
if (!fs.existsSync(lockPath)) {
  console.error('사용법: node scripts/vendor-npm.cjs kits/<킷이름>  (package-lock.json 이 있는 폴더)');
  process.exit(1);
}

// tools/install-offline.cjs 와 같은 규칙이어야 합니다.
const vendorName = (key, version) =>
  key.replace(/^.*node_modules\//, '').replace(/^@/, '').replace('/', '__') + '-' + version + '.tgz';

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'vendor-npm-'));
const cache = path.join(tmp, 'cache');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  for (const [label, extra] of [
    ['linux x64', ['--os=linux', '--cpu=x64']],
    ['win32 x64', ['--os=win32', '--cpu=x64']],
  ]) {
    const work = path.join(tmp, label.replace(' ', '-'));
    fs.mkdirSync(work);
    for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(kitDir, f), path.join(work, f));
    console.log(`== ${label} 패키지 받기 ==`);
    execFileSync(npm, ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--cache', cache, ...extra], {
      cwd: work,
      stdio: ['ignore', 'ignore', 'inherit'],
      shell: process.platform === 'win32',
    });
  }

  const vendor = path.join(kitDir, 'vendor');
  fs.mkdirSync(vendor, { recursive: true });
  const want = new Set();
  const missing = [];
  let copied = 0;
  for (const [key, meta] of Object.entries(lock.packages)) {
    if (!key || !meta.integrity || meta.link) continue;
    const [alg, b64] = meta.integrity.split('-');
    const hex = Buffer.from(b64, 'base64').toString('hex');
    const src = path.join(cache, '_cacache', 'content-v2', alg, hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
    const name = vendorName(key, meta.version);
    if (!fs.existsSync(src)) {
      // 다른 OS 용 선택 패키지(맥, ARM 등)는 받지 않았으니 건너뜁니다.
      if (!meta.optional) missing.push(name);
      continue;
    }
    want.add(name);
    const dst = path.join(vendor, name);
    if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(src).size) {
      fs.copyFileSync(src, dst);
      copied++;
    }
  }
  const stale = fs.readdirSync(vendor).filter((f) => !want.has(f));
  for (const f of stale) fs.unlinkSync(path.join(vendor, f));

  if (missing.length) {
    console.error('필수 패키지를 받지 못했습니다: ' + missing.join(', '));
    process.exit(1);
  }
  const longest = Math.max(...[...want].map((n) => n.length));
  const bytes = [...want].reduce((s, n) => s + fs.statSync(path.join(vendor, n)).size, 0);
  console.log(`vendor/: ${want.size}개, ${(bytes / 1048576).toFixed(1)}MB, 새로 복사 ${copied}, 지움 ${stale.length}, 가장 긴 이름 ${longest}자`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
