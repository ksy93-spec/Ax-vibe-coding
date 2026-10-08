/* 화면과 상관없는 계산. 브라우저에서는 App.core, Node 테스트에서는 require 로 씁니다.
   이 파일은 DOM, localStorage, Date.now() 를 직접 쓰지 않습니다. 현재 시각은 항상 인자로 받습니다. */
(function (root) {
  'use strict';

  var DAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var DAY_MS = 24 * 60 * 60 * 1000;
  var TRASH_KEEP_DAYS = 30;
  var TALK_KEEP = 300; // 대화 기록은 최근 이만큼만 둡니다.

  // 글자 크기 단계(px). 기본은 3단계(40px).
  var SIZES = [24, 32, 40, 48, 60, 72];
  var DEFAULT_SIZE = 2;

  var THEMES = [
    { id: 'light', name: '흰 바탕' },
    { id: 'dark', name: '검은 바탕' },
    { id: 'cream', name: '누런 바탕' }
  ];

  var DEFAULT_PHRASES = [
    '귀가 잘 안 들립니다. 여기에 글로 써 주세요.',
    '천천히 크게 써 주세요.',
    '네',
    '아니요',
    '잠깐만 기다려 주세요.',
    '다시 한 번 써 주세요.',
    '고맙습니다.',
    '식사하세요.',
    '약 드실 시간이에요.',
    '전화 왔어요.',
    '손님 오셨어요.',
    '잠깐 나갔다 올게요.'
  ];

  var WELCOME_TEXT = [
    '큰 글씨 메모장',
    '',
    '여기에 바로 쓰면 됩니다. 쓰는 대로 저절로 저장됩니다.',
    '',
    '왼쪽 "새 메모" 를 누르면 새 종이가 생깁니다.',
    '위쪽 "가 크게" 를 누르면 글씨가 더 커집니다.',
    '"크게 보여주기" 를 누르면 화면 가득 보여줍니다.',
    '',
    '다른 사람과 이야기할 때는 위쪽 "대화하기" 를 누르세요.'
  ].join('\n');

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  function uid(now, rand) {
    return now.toString(36) + '-' + Math.floor(rand * 1e9).toString(36);
  }

  /** 'YYYY-MM-DD' (현지 시각) */
  function dateKey(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
  }

  /** 오전/오후 h:mm */
  function timeText(d) {
    var h = d.getHours();
    var ampm = h < 12 ? '오전' : '오후';
    var h12 = h % 12 === 0 ? 12 : h % 12;
    return ampm + ' ' + h12 + ':' + pad2(d.getMinutes());
  }

  /** 'HH:MM' -> 오전/오후 h:mm */
  function hhmmText(hhmm) {
    var p = parseHHMM(hhmm);
    if (!p) return '';
    var d = new Date(2000, 0, 1, p.h, p.m);
    return timeText(d);
  }

  /** 머리글 시계: { date: '10월 8일 목요일', time: '오후 3:24' } */
  function clockText(d) {
    return {
      date: (d.getMonth() + 1) + '월 ' + d.getDate() + '일 ' + DAYS[d.getDay()] + '요일',
      time: timeText(d)
    };
  }

  /** 메모 목록에 붙는 날짜. 오늘/어제는 시각, 올해는 월일, 그 전은 연월일. */
  function stampText(ts, now) {
    var d = new Date(ts);
    var today = dateKey(now);
    var yest = dateKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    var k = dateKey(d);
    if (k === today) return '오늘 ' + timeText(d);
    if (k === yest) return '어제 ' + timeText(d);
    var md = (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    if (d.getFullYear() === now.getFullYear()) return md;
    return d.getFullYear() + '년 ' + md;
  }

  /** 첫 줄(빈 줄 제외)을 제목으로. 길면 자릅니다. */
  function titleOf(text, max) {
    max = max || 30;
    var lines = String(text || '').split('\n');
    for (var i = 0; i < lines.length; i++) {
      var t = lines[i].trim();
      if (t) return t.length > max ? t.slice(0, max) + '…' : t;
    }
    return '(빈 메모)';
  }

  /** 지우지 않은 메모를 고정 먼저, 그다음 최근 고친 순으로. */
  function sortMemos(memos) {
    return memos.filter(function (m) { return !m.deletedAt; }).sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      return b.updated - a.updated;
    });
  }

  /** 띄어쓰기로 나눈 낱말이 모두 들어 있는 메모. 대소문자 무시. */
  function searchMemos(memos, query) {
    var words = String(query || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return memos.slice();
    return memos.filter(function (m) {
      var t = String(m.text || '').toLowerCase();
      return words.every(function (w) { return t.indexOf(w) >= 0; });
    });
  }

  /** 휴지통에서 오래된 메모를 뺀 목록. */
  function purgeTrash(memos, now) {
    var limit = now.getTime() - TRASH_KEEP_DAYS * DAY_MS;
    return memos.filter(function (m) { return !m.deletedAt || m.deletedAt >= limit; });
  }

  function parseHHMM(s) {
    var m = /^(\d{1,2}):(\d{2})$/.exec(String(s || ''));
    if (!m) return null;
    var h = +m[1], mi = +m[2];
    if (h > 23 || mi > 59) return null;
    return { h: h, m: mi };
  }

  /** 'HH:MM' 이 다음에 오는 시각(ms). 지금과 같은 분이거나 지났으면 내일. */
  function nextOccurrence(hhmm, now) {
    var p = parseHHMM(hhmm);
    if (!p) return null;
    var t = new Date(now.getFullYear(), now.getMonth(), now.getDate(), p.h, p.m, 0, 0);
    if (t.getTime() <= now.getTime()) t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, p.h, p.m, 0, 0);
    return t.getTime();
  }

  /** 켜져 있고 시각이 된 알림. 앱이 꺼져 있던 동안 지난 알림도 여기에 들어갑니다. */
  function dueReminders(reminders, now) {
    var t = now.getTime();
    return reminders.filter(function (r) { return r.on && typeof r.next === 'number' && r.next <= t; })
      .sort(function (a, b) { return a.next - b.next; });
  }

  /** 확인한 알림의 다음 상태. 매일 알림은 지금 이후 첫 시각으로 옮기고, 한 번 알림은 null(목록에서 뺌). */
  function afterFired(r, now) {
    if (!r.daily) return null;
    var out = Object.assign({}, r);
    out.next = nextOccurrence(r.time, now);
    return out;
  }

  /** 정해진 시각보다 이만큼 늦게 울렸으면 "놓친 알림" 으로 표시합니다. */
  var LATE_MS = 10 * 60 * 1000;
  function isLate(r, now) { return now.getTime() - r.next > LATE_MS; }

  /** 오전/오후, 1~12시, 분 -> 'HH:MM' */
  function toHHMM(ampm, h12, minute) {
    var h = (+h12) % 12 + (ampm === 'pm' ? 12 : 0);
    return pad2(h) + ':' + pad2(+minute);
  }

  /** 지금부터 min 분 뒤의 'HH:MM' 과 정확한 시각(ms). */
  function afterMinutes(min, now) {
    var t = now.getTime() + min * 60 * 1000;
    var d = new Date(t);
    return { time: pad2(d.getHours()) + ':' + pad2(d.getMinutes()), next: t };
  }

  function emptyState(now, rand) {
    var t = now.getTime();
    return {
      version: 1,
      memos: [{ id: uid(t, rand), text: WELCOME_TEXT, created: t, updated: t, pinned: false, deletedAt: null }],
      currentId: null,
      settings: { size: DEFAULT_SIZE, theme: 'light', bold: true, sound: true },
      phrases: DEFAULT_PHRASES.slice(),
      reminders: [],
      talk: []
    };
  }

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function num(x, d) { return typeof x === 'number' && isFinite(x) ? x : d; }

  /** 저장된 값이나 백업 파일을 안전한 모양으로 맞춥니다. 모양이 아예 다르면 오류. */
  function normalize(raw, now, rand) {
    if (!isObj(raw) || !Array.isArray(raw.memos)) throw new Error('메모장 백업 파일이 아닙니다.');
    var base = emptyState(now, rand);
    var t = now.getTime();
    var memos = raw.memos.filter(isObj).map(function (m, i) {
      return {
        id: typeof m.id === 'string' && m.id ? m.id : uid(t + i, rand),
        text: typeof m.text === 'string' ? m.text : '',
        created: num(m.created, t),
        updated: num(m.updated, num(m.created, t)),
        pinned: !!m.pinned,
        deletedAt: typeof m.deletedAt === 'number' ? m.deletedAt : null
      };
    });
    var s = isObj(raw.settings) ? raw.settings : {};
    var themeOk = THEMES.some(function (th) { return th.id === s.theme; });
    var size = num(s.size, DEFAULT_SIZE);
    return {
      version: 1,
      memos: memos,
      currentId: typeof raw.currentId === 'string' ? raw.currentId : null,
      settings: {
        size: Math.max(0, Math.min(SIZES.length - 1, Math.round(size))),
        theme: themeOk ? s.theme : 'light',
        bold: s.bold !== false,
        sound: s.sound !== false
      },
      phrases: Array.isArray(raw.phrases)
        ? raw.phrases.filter(function (p) { return typeof p === 'string' && p.trim(); })
        : base.phrases,
      reminders: Array.isArray(raw.reminders) ? raw.reminders.filter(function (r) {
        return isObj(r) && parseHHMM(r.time);
      }).map(function (r, i) {
        return {
          id: typeof r.id === 'string' && r.id ? r.id : uid(t + i, rand),
          time: r.time,
          text: typeof r.text === 'string' ? r.text : '',
          daily: !!r.daily,
          on: r.on !== false,
          next: num(r.next, nextOccurrence(r.time, now))
        };
      }) : [],
      talk: Array.isArray(raw.talk) ? raw.talk.filter(function (x) {
        return isObj(x) && typeof x.text === 'string';
      }).map(function (x) { return { at: num(x.at, t), text: x.text }; }).slice(-TALK_KEEP) : []
    };
  }

  /** 백업을 지금 상태에 합칩니다. 메모는 id 가 같으면 더 최근에 고친 쪽을 남기고, 나머지는 더합니다.
      설정, 자주 쓰는 말, 알림은 지금 것을 그대로 둡니다. 더해진 메모 수를 돌려줍니다. */
  function mergeBackup(state, backup) {
    var byId = {};
    state.memos.forEach(function (m, i) { byId[m.id] = i; });
    var added = 0, replaced = 0;
    backup.memos.forEach(function (m) {
      if (byId.hasOwnProperty(m.id)) {
        var cur = state.memos[byId[m.id]];
        if (m.updated > cur.updated) { state.memos[byId[m.id]] = m; replaced++; }
      } else {
        state.memos.push(m); added++;
      }
    });
    return { added: added, replaced: replaced };
  }

  /** 대화 기록을 메모 글로. */
  function talkToText(talk, now) {
    var head = clockText(now).date + ' 대화';
    return head + '\n\n' + talk.map(function (x) {
      return '[' + timeText(new Date(x.at)) + '] ' + x.text;
    }).join('\n');
  }

  /** 다운로드 파일 이름. 한글을 넣지 않습니다(사내 PC 에서 이름이 깨지는 경우가 있어서). */
  function fileStamp(d) {
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  }

  var core = {
    SIZES: SIZES, DEFAULT_SIZE: DEFAULT_SIZE, THEMES: THEMES, DEFAULT_PHRASES: DEFAULT_PHRASES,
    TRASH_KEEP_DAYS: TRASH_KEEP_DAYS, TALK_KEEP: TALK_KEEP,
    uid: uid, dateKey: dateKey, timeText: timeText, hhmmText: hhmmText, clockText: clockText,
    stampText: stampText, titleOf: titleOf, sortMemos: sortMemos, searchMemos: searchMemos,
    purgeTrash: purgeTrash, parseHHMM: parseHHMM, nextOccurrence: nextOccurrence,
    dueReminders: dueReminders, afterFired: afterFired, isLate: isLate, toHHMM: toHHMM,
    afterMinutes: afterMinutes, emptyState: emptyState, normalize: normalize, mergeBackup: mergeBackup,
    talkToText: talkToText, fileStamp: fileStamp
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  else { root.App = root.App || {}; root.App.core = core; }
})(this);
