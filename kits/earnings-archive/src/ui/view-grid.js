/* 과거 실적 일괄 입력. 한 회사의 여러 분기 숫자를 표 하나에서 넣습니다. 전역 App.editGrid.
 *
 * - 줄은 분기(위가 오래된 분기), 칸은 지표입니다. 엑셀에서 같은 모양으로 복사한 칸을 한 칸에 붙여 넣으면
 *   그 칸부터 오른쪽, 아래로 채워집니다.
 * - 금액은 고른 단위(백만, 억, 십억, 조)로, 판매 대수는 고른 단위(대, 천 대)로 적습니다. 저장할 때 백만, 천 대로 바꿉니다.
 * - 칸을 비우면 그 값을 지웁니다. 저장은 실제로 바뀐 분기만 합니다 (App.ea.merge.applyGrid).
 */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var M = App.ea.merge;

  var MONEY_UNITS = [
    { id: 'million', label: '백만' },
    { id: 'hundred_million', label: '억' },
    { id: 'billion', label: '십억 (billion)' },
    { id: 'trillion', label: '조 (trillion)' },
  ];
  var COUNT_UNITS = [
    { id: 'thousand', label: '천 대' },
    { id: 'one', label: '대' },
  ];

  // 회사별 입력 상태. 범위나 단위를 바꿔 다시 그려도 입력한 값이 남게 저장 단위로 들고 있습니다.
  var G = null;

  function start(c) {
    var rep = App.data.report(c.id);
    var periods = (rep.quarters || []).map(function (q) { return q.period; }).sort();
    var last = C.lastClosedPeriod();
    var from = C.periodAdd(last, -11);
    if (periods.length && periods[0] < from) from = periods[0];
    var vals = {};
    var labels = {};
    (rep.quarters || []).forEach(function (q) {
      vals[q.period] = Object.assign({}, q.values || {});
      labels[q.period] = q.fiscalLabel || '';
    });
    return { company: c.id, from: from, to: last, money: 'million', count: 'thousand', vals: vals, labels: labels, bad: {} };
  }

  function factorOf(kind, unit) {
    if (kind === 'money') return C.MONEY_UNITS[unit];
    if (kind === 'count') return C.COUNT_UNITS[unit];
    return 1;
  }

  /** 저장 값 -> 칸에 보일 글 */
  function shown(v, kind) {
    if (v === null || v === undefined) return '';
    return String(C.round(v / factorOf(kind, kind === 'money' ? G.money : G.count), 6));
  }

  App.editGrid = function (body, c) {
    if (!G || G.company !== c.id) G = start(c);
    var wrap = h('section', { class: 'panel' });
    body.appendChild(wrap);
    draw();

    function cols() {
      return C.METRICS;
    }

    function draw() {
      App.dom.clear(wrap);
      var periods = C.periodRange(G.from, G.to);
      wrap.appendChild(h('div', { class: 'panel__bar' }, [
        h('h3', { class: 'panel__title', text: '과거 실적 한꺼번에 넣기 · ' + (c.nameKo || c.name) }),
        h('div', { class: 'app__spacer' }),
        f.btn('취소', function () { G = null; App.go({ edit: '' }); }),
        f.btn('저장', save, 'primary'),
      ]));
      wrap.appendChild(h('p', { class: 'panel__hint', text: '엑셀에서 복사한 여러 칸을 한 칸에 붙여 넣을 수 있습니다. 위가 오래된 분기, 빈칸은 지웁니다.' }));

      var fromIn = h('input', { class: 'input input--sm', value: G.from, 'aria-label': '시작 분기' });
      var toIn = h('input', { class: 'input input--sm', value: G.to, 'aria-label': '끝 분기' });
      wrap.appendChild(h('div', { class: 'toolbar' }, [
        h('span', { class: 'toolbar__label', text: '분기' }), fromIn, h('span', { text: '~' }), toIn,
        f.btn('범위 바꾸기', function () {
          var a = C.normPeriod(fromIn.value);
          var b = C.normPeriod(toIn.value);
          if (!a || !b || a > b) { App.ui.toast('분기를 2015Q1 ~ 2026Q2 처럼 적어 주세요.', 'warn'); return; }
          if (C.periodRange(a, b).length > 80) { App.ui.toast('한 번에 80개 분기(20년)까지만 펼칩니다.', 'warn'); return; }
          G.from = a;
          G.to = b;
          draw();
        }, 'sm'),
        h('span', { class: 'toolbar__label', text: '금액 단위 (' + c.currency + ')' }),
        h('select', { class: 'input input--sm', 'aria-label': '금액 단위', onchange: function (e) { G.money = e.target.value; draw(); } },
          MONEY_UNITS.map(function (u) { return h('option', { value: u.id, selected: u.id === G.money, text: u.label }); })),
        h('span', { class: 'toolbar__label', text: '판매 대수 단위' }),
        h('select', { class: 'input input--sm', 'aria-label': '판매 대수 단위', onchange: function (e) { G.count = e.target.value; draw(); } },
          COUNT_UNITS.map(function (u) { return h('option', { value: u.id, selected: u.id === G.count, text: u.label }); })),
      ]));

      var cs = cols();
      var head = h('tr', null, [h('th', { class: 'th', text: '분기' }), h('th', { class: 'th', text: '회사 표기' })]
        .concat(cs.map(function (m) {
          var unit = m.kind === 'money' ? MONEY_UNITS.filter(function (u) { return u.id === G.money; })[0].label + ' ' + c.currency
            : m.kind === 'count' ? COUNT_UNITS.filter(function (u) { return u.id === G.count; })[0].label : '%';
          return h('th', { class: 'th num' }, [m.label.replace(' (원문 값)', ' 원문'), h('span', { class: 'th__sub', text: unit })]);
        }))
        .concat([h('th', { class: 'th num', text: '영업이익률' }), h('th', { class: 'th num', text: '부채비율' })]));

      var grid = [];
      var body2 = periods.map(function (p, ri) {
        var row = [];
        var v = G.vals[p] || {};
        var calc1 = h('td', { class: 'calc' });
        var calc2 = h('td', { class: 'calc' });
        function recalc() {
          var d = C.derive({ period: p, values: G.vals[p] || {} }, c, null);
          calc1.textContent = f.pct(d.opMargin);
          calc2.textContent = f.pct(d.debtRatio);
        }
        var label = h('input', {
          class: 'input input--label', value: G.labels[p] || '', placeholder: C.fiscalLabel(p, c.fyEnd), 'aria-label': p + ' 회사 표기',
          oninput: function (e) { G.labels[p] = e.target.value; },
        });
        var tds = cs.map(function (m, ci) {
          var key = p + '|' + m.key;
          var input = h('input', {
            class: 'input' + (G.bad[key] ? ' is-bad' : ''), inputmode: 'decimal', value: G.bad[key] !== undefined ? G.bad[key] : shown(v[m.key], m.kind),
            'aria-label': p + ' ' + m.label,
            dataset: { r: String(ri), c: String(ci) },
            oninput: function (e) { setCell(p, m, e.target.value, e.target); recalc(); },
            onpaste: function (e) { paste(e, ri, ci); },
          });
          row.push(input);
          return h('td', null, input);
        });
        grid.push(row);
        recalc();
        return h('tr', null, [h('td', { class: 'rowh', text: C.periodLabel(p) }), h('td', null, label)].concat(tds).concat([calc1, calc2]));
      });

      function paste(e, r0, c0) {
        var text = (e.clipboardData || global.clipboardData).getData('text');
        if (!/[\t\n]/.test(text.trim())) return; // 한 칸짜리는 기본 동작
        e.preventDefault();
        var lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n');
        lines.forEach(function (line, i) {
          line.split('\t').forEach(function (cell, j) {
            var row = grid[r0 + i];
            var input = row && row[c0 + j];
            if (!input) return;
            input.value = cell.trim();
            input.dispatchEvent(new Event('input'));
          });
        });
        App.ui.toast(lines.length + '줄을 붙여 넣었습니다. 확인 뒤 저장을 누르세요.', 'info');
      }

      wrap.appendChild(h('div', { class: 'table__scroll' }, h('table', { class: 'table grid-tbl' }, [h('thead', null, head), h('tbody', null, body2)])));
      wrap.appendChild(h('div', { class: 'row row--end' }, [
        f.btn('취소', function () { G = null; App.go({ edit: '' }); }),
        f.btn('저장', save, 'primary'),
      ]));
    }

    function setCell(p, m, text, input) {
      var key = p + '|' + m.key;
      G.vals[p] = G.vals[p] || {};
      var raw = String(text || '').trim();
      if (!raw) {
        G.vals[p][m.key] = null;
        delete G.bad[key];
        input.classList.remove('is-bad');
        return;
      }
      var n = C.toNumber(raw.replace(/%$/, ''));
      if (n === null) {
        G.bad[key] = raw;
        input.classList.add('is-bad');
        return;
      }
      delete G.bad[key];
      input.classList.remove('is-bad');
      G.vals[p][m.key] = C.round(n * factorOf(m.kind, m.kind === 'money' ? G.money : G.count), 6);
    }

    function save() {
      var badKeys = Object.keys(G.bad);
      if (badKeys.length) {
        App.ui.toast('숫자로 읽지 못한 칸이 ' + badKeys.length + '개 있습니다 (빨간 칸): ' + badKeys.slice(0, 3).join(', '), 'warn', 6000);
        return;
      }
      var rows = C.periodRange(G.from, G.to).map(function (p) {
        var v = G.vals[p] || {};
        var values = {};
        C.METRICS.forEach(function (m) {
          if (Object.prototype.hasOwnProperty.call(v, m.key)) values[m.key] = v[m.key] === undefined ? null : v[m.key];
        });
        return { period: p, fiscalLabel: G.labels[p], values: values };
      });
      var res = M.applyGrid(App.data.report(c.id), c, rows);
      if (!res.changed.length) {
        App.ui.toast('바뀐 분기가 없습니다.');
        return;
      }
      App.data.putReport(c.id, res.report);
      App.ui.toast(res.changed.length + '개 분기를 저장했습니다. 파일 반영은 관리 탭에서 합니다.', 'ok', 5000);
      G = null;
      App.go({ edit: '' });
    }
  };
})(window);
