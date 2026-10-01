// 선택: Node 가 있으면 브라우저 없이 같은 테스트를 돌립니다. node tests/run.cjs
// 사내 PC 에 Node 가 없으면 tests/index.html 을 브라우저로 여세요. 결과는 같습니다.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = ['util', 'prep', 'baseline', 'shocks', 'engine', 'presets', 'sample'].map((f) => path.join(root, 'src', 'model', f + '.js'));
files.push(path.join(__dirname, 'model.test.js'));

const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });

let fail = 0;
for (const t of ctx.App.tests) {
  const t0 = Date.now();
  try {
    t.fn();
    console.log('통과  ' + t.name + ' (' + (Date.now() - t0) + 'ms)');
  } catch (e) {
    fail++;
    console.log('실패  ' + t.name + '\n      ' + e.message);
  }
}
console.log('\n' + (ctx.App.tests.length - fail) + '/' + ctx.App.tests.length + ' 통과');
process.exit(fail ? 1 : 0);
