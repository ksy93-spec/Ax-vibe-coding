/* 데이터 파일 형식과 판(rev) 비교. DOM 을 쓰지 않습니다. 전역 App.ea.files.
 *
 * 브라우저는 file:// 에서 JSON 을 fetch 하지 못합니다. 그래서 자료를 .js 파일로 두고 <script> 로 읽습니다.
 * 파일 하나는 아래 한 줄짜리 호출이고, 안쪽은 순수 JSON 입니다. 손으로 고칠 때도 JSON 문법만 지키면 됩니다.
 *
 *   (window.EA_FILES = window.EA_FILES || []).push({"kind": "report", "data": {...}});
 *
 * kind 별 data
 *   companies   { rev, companies: Company[] }
 *   fx          { rev, basis, source, rates: { EUR: { '2026Q2': 0.86 } } }
 *   report      { company, rev, quarters: Quarter[] }           data/reports/<회사 id>.js
 *   transcripts { company, rev, items: { '2026Q2': {...} } }   data/transcripts/<회사 id>.js
 *
 * rev 는 저장할 때마다 1씩 오릅니다. 브라우저에 남은 작업본의 rev 가 파일보다 크면 아직 파일로 저장하지 않은 변경입니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var ea = (App.ea = App.ea || {});

  var KINDS = ['companies', 'fx', 'report', 'transcripts'];

  var HEADER = {
    companies: '회사 목록. 관리 탭에서 고치고 저장하면 이 파일을 다시 씁니다.',
    fx: '분기 평균 환율 (1 USD 당 통화 단위). 관리 탭에서 고치고 저장하면 이 파일을 다시 씁니다.',
    report: '회사 하나의 분기 실적과 컨퍼런스콜 요약. 금액은 발표 통화 백만 단위, 판매 대수는 천 대.',
    transcripts: '컨퍼런스콜 원문 보관. 화면에서 "원문 보기" 를 누를 때만 읽습니다.',
  };

  /** kind 와 회사 id 로 data 폴더 기준 경로 */
  function pathOf(kind, id) {
    if (kind === 'companies') return 'companies.js';
    if (kind === 'fx') return 'fx.js';
    if (kind === 'report') return 'reports/' + id + '.js';
    if (kind === 'transcripts') return 'transcripts/' + id + '.js';
    throw new Error('모르는 파일 종류: ' + kind);
  }

  /** 파일 내용 만들기. JSON 은 한 줄에 한 키씩 들여 써서 diff 와 손 편집이 쉽게 합니다. */
  function toText(kind, data) {
    if (KINDS.indexOf(kind) < 0) throw new Error('모르는 파일 종류: ' + kind);
    return '// ' + HEADER[kind] + '\n' +
      '// 자동 생성 파일입니다. 손으로 고칠 때는 JSON 문법(큰따옴표, 마지막 쉼표 없음)을 지키세요.\n' +
      '(window.EA_FILES = window.EA_FILES || []).push(' +
      JSON.stringify({ kind: kind, data: data }, null, 1) + ');\n';
  }

  /** toText 의 반대. 내려받은 파일을 다시 가져올 때 씁니다. */
  function fromText(text) {
    var s = String(text || '');
    var a = s.indexOf('.push(');
    var b = s.lastIndexOf(');');
    if (a < 0 || b < a) throw new Error('EA_FILES 형식이 아닙니다');
    var obj = JSON.parse(s.slice(a + 6, b));
    if (!obj || KINDS.indexOf(obj.kind) < 0 || !obj.data) throw new Error('kind 나 data 가 없습니다');
    return obj;
  }

  /**
   * window.EA_FILES 배열을 종류별로 모읍니다. 같은 파일이 두 번 들어오면 rev 가 큰 쪽을 씁니다.
   * @returns {{companies: object|null, fx: object|null, reports: Object<string, object>, transcripts: Object<string, object>}}
   */
  function collect(list) {
    var out = { companies: null, fx: null, reports: {}, transcripts: {} };
    (list || []).forEach(function (f) {
      if (!f || !f.data) return;
      var d = f.data;
      if (f.kind === 'companies' || f.kind === 'fx') {
        if (!out[f.kind] || revOf(d) >= revOf(out[f.kind])) out[f.kind] = d;
      } else if (f.kind === 'report' || f.kind === 'transcripts') {
        var bucket = f.kind === 'report' ? out.reports : out.transcripts;
        if (!d.company) return;
        if (!bucket[d.company] || revOf(d) >= revOf(bucket[d.company])) bucket[d.company] = d;
      }
    });
    return out;
  }

  function revOf(d) {
    return (d && +d.rev) || 0;
  }

  /**
   * 작업본(브라우저 저장)이 파일보다 새 것인지. 파일이 같은 rev 이상으로 따라왔으면 작업본은 버려도 됩니다.
   */
  function isAhead(work, base) {
    return !!work && revOf(work) > revOf(base);
  }

  /** 저장 직전에 부르는 rev 올리기. 원본을 바꾸지 않고 새 객체를 돌려줍니다. */
  function bump(data, base) {
    var next = Object.assign({}, data);
    next.rev = Math.max(revOf(data), revOf(base)) + 1;
    next.savedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    return next;
  }

  ea.files = {
    KINDS: KINDS,
    pathOf: pathOf,
    toText: toText,
    fromText: fromText,
    collect: collect,
    revOf: revOf,
    isAhead: isAhead,
    bump: bump,
  };
})(typeof window !== 'undefined' ? window : globalThis);
