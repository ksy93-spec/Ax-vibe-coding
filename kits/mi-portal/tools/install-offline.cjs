#!/usr/bin/env node
/* 인터넷 없이 vendor/ 의 tarball 로 설치합니다. Node 표준 모듈만 씁니다.
 *
 *   node tools/install-offline.cjs
 *
 * 1. vendor/*.tgz 를 이 PC 의 npm 캐시(아래 CACHE)에 넣습니다. 이미 들어 있는 것은 건너뜁니다.
 * 2. package-lock.json 의 패키지가 모두 캐시에 있는지 확인합니다. 빠진 게 있으면 이름을 알려 주고 멈춥니다.
 * 3. npm ci --offline 으로 설치합니다.
 *
 * 캐시는 킷 폴더 밖에 둡니다. 캐시 파일 이름이 길어서 킷 폴더 안에 있으면
 * 나중에 킷 폴더를 탐색기로 복사하거나 압축할 때 경로 길이 오류가 납니다.
 * 위치를 바꾸려면 환경 변수 NPM_OFFLINE_CACHE 에 폴더를 지정하세요.
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const VENDOR = path.join(ROOT, 'vendor');
const CACHE =
  process.env.NPM_OFFLINE_CACHE ||
  path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), '.cache'), 'npm-offline-cache');

const [major, minor] = process.versions.node.split('.').map(Number);
if (!(major >= 23 || (major === 22 && minor >= 12) || (major === 20 && minor >= 19))) {
  console.error(`Node ${process.versions.node} 으로는 Vite 8 이 돌지 않습니다. 20.19 이상 또는 22.12 이상이 필요합니다.`);
  process.exit(1);
}
if (!fs.existsSync(VENDOR)) {
  console.error('vendor 폴더가 없습니다. 킷 폴더를 통째로 옮겼는지 확인하세요.');
  process.exit(1);
}

const contentPath = (integrity) => {
  const [alg, b64] = integrity.split('-');
  const hex = Buffer.from(b64, 'base64').toString('hex');
  return path.join(CACHE, '_cacache', 'content-v2', alg, hex.slice(0, 2), hex.slice(2, 4), hex.slice(4));
};
const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: 'inherit' });

console.log('캐시 위치: ' + CACHE);

// 1. 캐시에 없는 tarball 만 넣습니다.
const files = fs.readdirSync(VENDOR).filter((f) => f.endsWith('.tgz'));
const todo = files.filter((f) => {
  const digest = crypto.createHash('sha512').update(fs.readFileSync(path.join(VENDOR, f))).digest('base64');
  return !fs.existsSync(contentPath('sha512-' + digest));
});
console.log(`vendor 패키지 ${files.length}개 중 캐시에 넣을 것 ${todo.length}개`);
// 명령줄 길이 제한(윈도 8191자) 때문에 나눠서 넣습니다. './' 를 붙여야 GitHub 주소로 오해하지 않습니다.
for (let i = 0; i < todo.length; i += 40) {
  const batch = todo.slice(i, i + 40).map((f) => `"./vendor/${f}"`).join(' ');
  run(`npm cache add --cache "${CACHE}" ${batch}`);
}

// 2. lock 의 패키지가 다 있는지 봅니다. 다른 OS 용 선택 패키지(맥, ARM 등)는 없어도 됩니다.
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
const forThisPc = (meta) =>
  (!meta.os || meta.os.includes(process.platform)) &&
  (!meta.cpu || meta.cpu.includes(process.arch)) &&
  (!meta.libc || !meta.libc.includes('musl'));
const missing = Object.entries(lock.packages)
  .filter(([key, meta]) => key && meta.integrity && (!meta.optional || forThisPc(meta)))
  .filter(([, meta]) => !fs.existsSync(contentPath(meta.integrity)))
  .map(([key, meta]) => key.replace(/^.*node_modules\//, '') + '@' + meta.version);
if (missing.length) {
  console.error('\nvendor 에 없는 패키지가 있습니다. vendor 폴더가 일부만 들어왔거나 package-lock.json 이 바뀌었습니다.');
  console.error(missing.slice(0, 20).join('\n') + (missing.length > 20 ? `\n외 ${missing.length - 20}개` : ''));
  process.exit(1);
}

// 3. 설치
console.log('\n설치 중입니다. 인터넷에 접속하지 않습니다.');
run(`npm ci --offline --no-audit --no-fund --cache "${CACHE}"`);
