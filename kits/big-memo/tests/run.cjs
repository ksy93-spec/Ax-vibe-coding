// src/core.js 합격 기준 실행. node tests/run.cjs  (Node 18 이상, 설치할 것 없음)
// Node 가 없는 PC 에서는 tests/index.html 을 브라우저로 엽니다. 같은 테스트입니다.
'use strict';
const tests = require('./core.test.js');

let pass = 0;
for (const t of tests) {
  try { t.fn(); pass++; console.log('통과  ' + t.name); }
  catch (e) { console.log('실패  ' + t.name + '\n      ' + e.message); }
}
console.log('\n' + pass + '/' + tests.length + ' 통과');
process.exit(pass === tests.length ? 0 : 1);
