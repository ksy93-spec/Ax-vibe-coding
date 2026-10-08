/* src/core.js 합격 기준. Node(tests/run.cjs)와 브라우저(tests/index.html) 양쪽에서 읽힙니다. */
(function (root) {
  'use strict';
  var core = typeof module !== 'undefined' && module.exports ? require('../src/core.js') : root.App.core;

  // Node 의 assert 대신 쓰는 작은 비교 함수. 사내 PC 에 Node 가 없어도 브라우저에서 돌게 합니다.
  var assert = {
    ok: function (v, msg) { if (!v) throw new Error(msg || '참이어야 합니다'); },
    strictEqual: function (a, b, msg) {
      if (a !== b) throw new Error((msg ? msg + ': ' : '') + JSON.stringify(a) + ' !== ' + JSON.stringify(b));
    },
    deepStrictEqual: function (a, b, msg) {
      var x = JSON.stringify(a), y = JSON.stringify(b);
      if (x !== y) throw new Error((msg ? msg + ': ' : '') + x + ' !== ' + y);
    },
    throws: function (fn, re) {
      try { fn(); } catch (e) {
        if (re && !re.test(e.message)) throw new Error('오류 문구가 다릅니다: ' + e.message);
        return;
      }
      throw new Error('오류가 나야 합니다');
    }
  };

  var tests = [];
  function test(name, fn) { tests.push({ name: name, fn: fn }); }

  // 2026-10-08(목) 오후 3:24:30, 현지 시각
  var NOW = new Date(2026, 9, 8, 15, 24, 30);
  var T = NOW.getTime();
  var MIN = 60 * 1000;
  var DAY = 24 * 60 * MIN;

  test('시계 글: 월일 요일, 오전/오후', function () {
    assert.deepStrictEqual(core.clockText(NOW), { date: '10월 8일 목요일', time: '오후 3:24' });
    assert.strictEqual(core.timeText(new Date(2026, 0, 1, 0, 5)), '오전 12:05');
    assert.strictEqual(core.timeText(new Date(2026, 0, 1, 12, 0)), '오후 12:00');
    assert.strictEqual(core.hhmmText('09:30'), '오전 9:30');
    assert.strictEqual(core.hhmmText('엉터리'), '');
  });

  test('메모 날짜: 오늘, 어제, 올해, 지난해', function () {
    assert.strictEqual(core.stampText(T - 5 * MIN, NOW), '오늘 오후 3:19');
    assert.strictEqual(core.stampText(new Date(2026, 9, 7, 9, 0).getTime(), NOW), '어제 오전 9:00');
    assert.strictEqual(core.stampText(new Date(2026, 2, 3, 9, 0).getTime(), NOW), '3월 3일');
    assert.strictEqual(core.stampText(new Date(2025, 2, 3, 9, 0).getTime(), NOW), '2025년 3월 3일');
  });

  test('제목: 빈 줄을 건너뛴 첫 줄, 길면 자름', function () {
    assert.strictEqual(core.titleOf('\n\n  병원 예약  \n화요일'), '병원 예약');
    assert.strictEqual(core.titleOf('   \n  '), '(빈 메모)');
    assert.strictEqual(core.titleOf('가나다라마바사', 3), '가나다…');
  });

  test('목록 순서: 고정 먼저, 그다음 최근 고친 순, 지운 메모 빠짐', function () {
    var ms = [
      { id: 'a', updated: 1, pinned: false },
      { id: 'b', updated: 3, pinned: false },
      { id: 'c', updated: 2, pinned: true },
      { id: 'd', updated: 9, pinned: false, deletedAt: 5 }
    ];
    assert.deepStrictEqual(core.sortMemos(ms).map(function (m) { return m.id; }), ['c', 'b', 'a']);
  });

  test('찾기: 낱말이 모두 들어 있어야 함, 대소문자 무시', function () {
    var ms = [{ text: '병원 예약 화요일' }, { text: '약국 Tylenol' }, { text: '화요일 병원' }];
    assert.strictEqual(core.searchMemos(ms, '병원 화요일').length, 2);
    assert.strictEqual(core.searchMemos(ms, 'tylenol').length, 1);
    assert.strictEqual(core.searchMemos(ms, '   ').length, 3);
  });

  test('휴지통: 30일 지난 메모만 없어짐', function () {
    var ms = [
      { id: 'live', deletedAt: null },
      { id: 'new', deletedAt: T - 29 * DAY },
      { id: 'old', deletedAt: T - 31 * DAY }
    ];
    assert.deepStrictEqual(core.purgeTrash(ms, NOW).map(function (m) { return m.id; }), ['live', 'new']);
  });

  test('다음 알림 시각: 아직 안 지났으면 오늘, 지났거나 같은 분이면 내일', function () {
    assert.strictEqual(core.nextOccurrence('18:00', NOW), new Date(2026, 9, 8, 18, 0).getTime());
    assert.strictEqual(core.nextOccurrence('09:00', NOW), new Date(2026, 9, 9, 9, 0).getTime());
    assert.strictEqual(core.nextOccurrence('15:24', NOW), new Date(2026, 9, 9, 15, 24).getTime());
    assert.strictEqual(core.nextOccurrence('25:00', NOW), null);
  });

  test('알림 시각 고르기: 오전 12시는 0시, 오후 12시는 12시', function () {
    assert.strictEqual(core.toHHMM('am', '12', '5'), '00:05');
    assert.strictEqual(core.toHHMM('pm', '12', '0'), '12:00');
    assert.strictEqual(core.toHHMM('pm', '3', '30'), '15:30');
    assert.strictEqual(core.toHHMM('am', '9', '0'), '09:00');
  });

  test('울릴 알림: 켜져 있고 시각이 된 것만, 이른 순', function () {
    var rs = [
      { id: 'later', on: true, next: T + MIN },
      { id: 'off', on: false, next: T - MIN },
      { id: 'b', on: true, next: T - MIN },
      { id: 'a', on: true, next: T - 2 * DAY }
    ];
    assert.deepStrictEqual(core.dueReminders(rs, NOW).map(function (r) { return r.id; }), ['a', 'b']);
  });

  test('확인한 뒤: 매일 알림은 지금 이후 첫 시각, 한 번 알림은 빠짐', function () {
    // 사흘 동안 앱을 안 켰어도 한 번만 울리고 다음 날로 넘어갑니다.
    var daily = { id: 'd', time: '09:00', daily: true, on: true, next: new Date(2026, 9, 5, 9, 0).getTime() };
    var after = core.afterFired(daily, NOW);
    assert.strictEqual(after.next, new Date(2026, 9, 9, 9, 0).getTime());
    assert.strictEqual(daily.next, new Date(2026, 9, 5, 9, 0).getTime(), '원본은 그대로');
    assert.strictEqual(core.afterFired({ id: 'o', time: '09:00', daily: false, on: true, next: T }, NOW), null);
  });

  test('놓친 알림: 10분 넘게 늦으면', function () {
    assert.strictEqual(core.isLate({ next: T - 9 * MIN }, NOW), false);
    assert.strictEqual(core.isLate({ next: T - 11 * MIN }, NOW), true);
  });

  test('N분 뒤: 초 단위까지 정확한 시각', function () {
    var a = core.afterMinutes(10, NOW);
    assert.strictEqual(a.next, T + 10 * MIN);
    assert.strictEqual(a.time, '15:34');
  });

  test('처음 상태: 메모 없음, 기본 설정', function () {
    var s = core.emptyState(NOW, 0.5);
    assert.strictEqual(s.memos.length, 0);
    assert.deepStrictEqual(s.settings, { size: core.DEFAULT_SIZE, theme: 'light', bold: true, sound: true, keepAwake: 'talk' });
    assert.ok(s.phrases.length >= 10);
  });

  test('저장값 맞추기: 빠진 값 채움, 범위 밖 값 바로잡음', function () {
    var s = core.normalize({
      memos: [{ id: 'x', text: '가' }, 'garbage', { text: 3 }],
      settings: { size: 99, theme: 'neon', bold: false, keepAwake: 'always' },
      reminders: [{ time: '07:30', text: '약' }, { time: 'bad' }],
      talk: [{ at: 1, text: '안녕', voice: true }, { at: 2, text: '네', voice: 'x', extra: 1 }, { text: 5 }]
    }, NOW, 0.5);
    assert.strictEqual(s.memos.length, 2);
    assert.strictEqual(s.memos[0].updated, T);
    assert.strictEqual(s.memos[1].text, '');
    assert.ok(s.memos[1].id);
    assert.deepStrictEqual(s.settings, { size: core.SIZES.length - 1, theme: 'light', bold: false, sound: true, keepAwake: 'always' });
    assert.strictEqual(core.normalize({ memos: [], settings: { keepAwake: 'x' } }, NOW, 0.5).settings.keepAwake, 'talk');
    assert.strictEqual(s.reminders.length, 1);
    assert.strictEqual(s.reminders[0].on, true);
    assert.strictEqual(s.reminders[0].next, new Date(2026, 9, 9, 7, 30).getTime());
    assert.deepStrictEqual(s.talk, [{ at: 1, text: '안녕', voice: true }, { at: 2, text: '네', voice: true }]);
    assert.deepStrictEqual(s.phrases, core.DEFAULT_PHRASES);
  });

  test('저장값 맞추기: 메모장 파일이 아니면 오류', function () {
    assert.throws(function () { return core.normalize({ hello: 1 }, NOW, 0.5); }, /백업 파일이 아닙니다/);
    assert.throws(function () { return core.normalize([1, 2], NOW, 0.5); }, /백업 파일이 아닙니다/);
  });

  test('대화 기록은 최근 것만 남김', function () {
    var talk = [];
    for (var i = 0; i < core.TALK_KEEP + 20; i++) talk.push({ at: i, text: 'm' + i });
    var s = core.normalize({ memos: [], talk }, NOW, 0.5);
    assert.strictEqual(s.talk.length, core.TALK_KEEP);
    assert.strictEqual(s.talk[0].text, 'm20');
  });

  test('백업 합치기: 새 메모는 더하고, 같은 메모는 최근 것으로', function () {
    var state = { memos: [{ id: 'a', text: '옛', updated: 1 }, { id: 'b', text: '지금', updated: 9 }] };
    var backup = { memos: [{ id: 'a', text: '새', updated: 5 }, { id: 'b', text: '옛', updated: 2 }, { id: 'c', text: '더함', updated: 3 }] };
    assert.deepStrictEqual(core.mergeBackup(state, backup), { added: 1, replaced: 1 });
    assert.deepStrictEqual(state.memos.map(function (m) { return m.text; }), ['새', '지금', '더함']);
  });

  test('대화를 메모 글로', function () {
    var text = core.talkToText([
      { at: new Date(2026, 9, 8, 9, 5).getTime(), text: '안녕하세요' },
      { at: new Date(2026, 9, 8, 9, 6).getTime(), text: '진지 드셨어요', voice: true }
    ], NOW);
    assert.strictEqual(text, '10월 8일 목요일 대화\n\n[오전 9:05] 안녕하세요\n[오전 9:06 말] 진지 드셨어요');
  });

  test('파일 이름에 한글이 없음', function () {
    assert.strictEqual(core.fileStamp(NOW), '20261008-1524');
  });

  test('받아쓰기: 확정된 글과 듣는 중인 글 나누기', function () {
    var r = [{ final: true, text: '옛 글' }, { final: true, text: ' 점심 ' }, { final: false, text: '드셨' }, { final: false, text: '어요' }, { final: true, text: '  ' }];
    assert.deepStrictEqual(core.splitSpeech(r, 1), { finals: ['점심'], interim: '드셨 어요' });
    assert.deepStrictEqual(core.splitSpeech([], 0), { finals: [], interim: '' });
  });

  test('받아쓰기: 커서 자리에 넣고 띄어쓰기 맞추기', function () {
    assert.deepStrictEqual(core.insertAt('', 0, '안녕'), { text: '안녕', cursor: 2 });
    assert.deepStrictEqual(core.insertAt('병원', 2, '가요'), { text: '병원 가요', cursor: 5 });
    assert.deepStrictEqual(core.insertAt('병원 \n약', 3, '가요'), { text: '병원 가요\n약', cursor: 5 });
    assert.deepStrictEqual(core.insertAt('내일요', 2, '병원'), { text: '내일 병원 요', cursor: 6 });
  });

  if (typeof module !== 'undefined' && module.exports) module.exports = tests;
  else root.CORE_TESTS = tests;
})(this);
