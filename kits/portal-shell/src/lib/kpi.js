/* 지표 카드. 전역 App.renderKpis.
 * 상태 색은 아이콘이나 글자와 항상 같이 씁니다. 색 하나로 의미를 나르지 않습니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var clear = App.dom.clear;

  // 화살표는 "값이 어느 쪽으로 움직였나"만 나타냅니다.
  // 그게 좋은 일인지 나쁜 일인지는 tone 이 색으로 말합니다. 둘을 섞으면
  // 가격이 올랐는데 아래 화살표가 붙는 모순이 생깁니다.
  var DIR_MARK = { up: '▲', down: '▼', flat: '–' };
  var TONE_WORD = { good: '좋음', bad: '나쁨', warn: '주의', flat: '변화 없음' };

  /** delta 문자열 앞의 부호를 보고 방향을 정합니다. 부호가 없으면 화살표를 붙이지 않습니다. */
  function directionOf(delta, explicit) {
    if (explicit && DIR_MARK[explicit]) return explicit;
    var s = String(delta).trim();
    if (/^[+▲]/.test(s)) return 'up';
    if (/^[-−▼]/.test(s)) return 'down';
    if (/^0(\.0+)?[%가-힣]?/.test(s)) return 'flat';
    return null;
  }

  /**
   * renderKpis(mount, items)
   * items: [{ label, value, unit?, delta?, direction?: 'up'|'down'|'flat',
   *           tone?: 'good'|'bad'|'warn'|'flat', note? }]
   *
   * direction 은 화살표(값이 오르내린 방향), tone 은 색(그게 좋은지 나쁜지)입니다.
   * direction 을 생략하면 delta 앞의 부호에서 읽습니다.
   *
   * value 는 이미 사람이 읽을 형태여도 되고 숫자여도 됩니다.
   * 숫자면 format 옵션에 따라 포맷합니다.
   */
  function renderKpis(mount, items, format) {
    clear(mount);
    if (!items || !items.length) return;
    (items || []).forEach(function (it) {
      var tone = it.tone && TONE_WORD[it.tone] ? it.tone : null;
      var dir = it.delta ? directionOf(it.delta, it.direction) : null;
      var value = typeof it.value === 'number' ? App.formatValue(it.value, format) : it.value;
      mount.appendChild(
        h('div', { class: 'kpi' }, [
          h('div', { class: 'kpi__label', text: it.label }),
          h('div', { class: 'kpi__value' }, [
            String(value === null || value === undefined ? '-' : value),
            it.unit ? h('span', { class: 'kpi__unit', text: it.unit }) : null,
          ]),
          it.delta
            ? h('div', { class: 'kpi__delta' + (tone ? ' kpi__delta--' + tone : '') }, [
                dir ? h('span', { class: 'kpi__mark', 'aria-hidden': 'true', text: DIR_MARK[dir] }) : null,
                h('span', { text: String(it.delta) }),
                tone ? h('span', { class: 'sr-only', text: ' ' + TONE_WORD[tone] }) : null,
              ])
            : null,
          it.note ? h('div', { class: 'kpi__note', text: it.note }) : null,
        ])
      );
    });
  }

  App.renderKpis = renderKpis;
})(window);
