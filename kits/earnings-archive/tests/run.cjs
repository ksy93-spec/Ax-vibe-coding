// 선택: Node 가 있으면 브라우저 없이 같은 테스트를 돌립니다. node tests/run.cjs
// 사내 PC 에 Node 가 없으면 tests/index.html 을 브라우저로 여세요. 결과는 같습니다.
// Node 에서만 하나 더 봅니다: 화면이 만드는 프롬프트와 prompts/ 폴더의 문서가 같은 글인지.
'use strict';
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const files = ['core', 'files', 'parse', 'merge', 'prompt'].map((f) => path.join(root, 'src', 'model', f + '.js'));
files.push(path.join(__dirname, 'model.test.js'));

const ctx = vm.createContext({ console });
ctx.globalThis = ctx;
for (const f of files) vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: f });

const P = ctx.App.ea.prompt;
// 문서 안 ```text 블록과 코드의 템플릿이 같은지
function block(file, title) {
  const md = fs.readFileSync(path.join(root, 'prompts', file), 'utf8').replace(/\r\n/g, '\n');
  const at = md.indexOf(title);
  if (at < 0) throw new Error(file + ' 에 "' + title + '" 가 없습니다');
  const m = /```text\n([\s\S]*?)\n```/.exec(md.slice(at));
  if (!m) throw new Error(file + ' 의 "' + title + '" 아래에 ```text 블록이 없습니다');
  return m[1];
}
ctx.App.tests.push({
  name: 'prompts/ 문서와 화면 프롬프트가 같은 글',
  fn() {
    const pairs = [
      ['10-call-summary.md', '## 템플릿', P.CALL_TEMPLATE],
      ['10-call-summary.md', '## {{task}} 전체', P.TASK_ALL],
      ['10-call-summary.md', '## {{task}} 발표 조각', P.TASK_PREPARED],
      ['10-call-summary.md', '## {{task}} 질의응답 조각', P.TASK_QA],
      ['11-numbers.md', '## 템플릿', P.NUMBERS_TEMPLATE],
    ];
    for (const [f, title, code] of pairs) {
      if (block(f, title) !== code) throw new Error(f + ' "' + title + '" 가 src/model/prompt.js 와 다릅니다');
    }
  },
});

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
