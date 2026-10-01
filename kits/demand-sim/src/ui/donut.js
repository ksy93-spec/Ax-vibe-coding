/* 도넛 (인라인 SVG). 전역 App.donut.
 * 전체 중 몫을 한눈에 보는 용도라 조각은 6개까지만 받습니다. 나머지는 부르는 쪽에서 "그 외" 로 묶습니다.
 * 조각 사이 2px 틈, 옆에 이름과 비율을 같이 적어 색만으로 구분하지 않게 합니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    return el;
  }

  function arc(cx, cy, r0, r1, a0, a1) {
    var large = a1 - a0 > Math.PI ? 1 : 0;
    function pt(r, a) { return [cx + r * Math.sin(a), cy - r * Math.cos(a)]; }
    var p0 = pt(r1, a0), p1 = pt(r1, a1), p2 = pt(r0, a1), p3 = pt(r0, a0);
    return 'M' + p0[0] + ',' + p0[1] + 'A' + r1 + ',' + r1 + ' 0 ' + large + ' 1 ' + p1[0] + ',' + p1[1] +
      'L' + p2[0] + ',' + p2[1] + 'A' + r0 + ',' + r0 + ' 0 ' + large + ' 0 ' + p3[0] + ',' + p3[1] + 'Z';
  }

  /**
   * @param {HTMLElement} mount
   * @param {{items: Array<{label: string, value: number, color: string, note?: string}>, centerTitle: string, centerValue: string,
   *          format?: function(number): string}} opts
   */
  function donut(mount, opts) {
    var S = 200;
    var c = S / 2;
    var r1 = 92;
    var r0 = 64;
    var total = opts.items.reduce(function (s, it) { return s + Math.max(0, it.value); }, 0);
    var root = svg('svg', { viewBox: '0 0 ' + S + ' ' + S, class: 'donut__svg', role: 'img', 'aria-label': opts.centerTitle });
    var tip = h('div', { class: 'fc__tip donut__tip', role: 'status' });
    var a = 0;
    var gap = 0.012; // 조각 사이 틈 (라디안 기준 근사)
    opts.items.forEach(function (it) {
      if (!(it.value > 0) || !total) return;
      var span = (it.value / total) * Math.PI * 2;
      var a0 = a + (opts.items.length > 1 ? gap : 0);
      var a1 = a + span - (opts.items.length > 1 ? gap : 0);
      if (a1 <= a0) a1 = a0 + 0.001;
      if (span >= Math.PI * 2 - 1e-6) { a0 = 0; a1 = Math.PI * 2 - 1e-4; }
      var p = svg('path', { d: arc(c, c, r0, r1, a0, a1), fill: it.color, class: 'donut__seg' });
      p.addEventListener('mouseenter', function () {
        App.dom.clear(tip);
        tip.appendChild(h('div', { class: 'fc__tip-x', text: it.label }));
        tip.appendChild(h('div', { class: 'fc__tip-row' }, [h('span', { class: 'fc__tip-name', text: '비율' }), h('span', { class: 'fc__tip-val', text: App.fmt.pct(it.value / total) })]));
        if (opts.format) tip.appendChild(h('div', { class: 'fc__tip-row' }, [h('span', { class: 'fc__tip-name', text: '값' }), h('span', { class: 'fc__tip-val', text: opts.format(it.value) })]));
        tip.classList.add('is-on');
      });
      p.addEventListener('mouseleave', function () { tip.classList.remove('is-on'); });
      root.appendChild(p);
      a += span;
    });
    var t1 = svg('text', { x: c, y: c - 4, 'text-anchor': 'middle', class: 'donut__center-title' });
    t1.textContent = opts.centerTitle;
    var t2 = svg('text', { x: c, y: c + 18, 'text-anchor': 'middle', class: 'donut__center-value' });
    t2.textContent = opts.centerValue;
    root.appendChild(t1);
    root.appendChild(t2);

    var legend = h('ul', { class: 'donut__legend' }, opts.items.map(function (it) {
      return h('li', { class: 'donut__row' }, [
        h('span', { class: 'donut__swatch', style: { background: it.color } }),
        h('span', { class: 'donut__name', text: it.label }),
        h('span', { class: 'donut__pct', text: total ? App.fmt.pct(it.value / total) : '' }),
        it.note ? h('span', { class: 'donut__note', text: it.note }) : null,
      ]);
    }));
    mount.appendChild(h('div', { class: 'donut' }, [h('div', { class: 'donut__chart' }, [root, tip]), legend]));
  }

  App.donut = donut;
})(window);
