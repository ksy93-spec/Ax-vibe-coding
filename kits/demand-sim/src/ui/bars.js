/* 임원 보고서용 막대 (인라인 SVG/HTML). 전역 App.bars.
 * stack: 전체 중 몫을 한 줄 막대로 (지역별 TAM, 고객 구분)
 * hbars: 항목별 가로 막대 (지역별 자사 M/S)
 * columns: 연도별 Base 기둥 + Worst~Best 범위 (고객 수요 전망)
 * 숫자는 막대 옆에 글자로 같이 적습니다. 색만으로 읽지 않게 하려는 것입니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) { if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]); });
    return el;
  }
  function text(x, y, str, cls, anchor) {
    var t = svg('text', { x: x, y: y, class: cls, 'text-anchor': anchor || 'start' });
    t.textContent = str;
    return t;
  }

  /** items: [{label, value, color, emphasis?}] -> 한 줄 100% 막대 + 아래 범례 */
  function stack(mount, opts) {
    var total = opts.items.reduce(function (s, it) { return s + Math.max(0, it.value); }, 0);
    var bar = h('div', { class: 'xstack', role: 'img', 'aria-label': opts.label || '' }, opts.items.map(function (it) {
      var pct = total ? (it.value / total) * 100 : 0;
      return h('span', { class: 'xstack__seg', style: { width: pct + '%', background: it.color }, title: it.label + ' ' + App.fmt.pct(it.value / total) },
        pct >= 7 ? h('span', { class: 'xstack__in', text: App.fmt.pct(it.value / total, 0) }) : null);
    }));
    var legend = h('div', { class: 'xstack__legend' }, opts.items.map(function (it) {
      return h('div', { class: 'xstack__item' }, [
        h('span', { class: 'swatch', style: { background: it.color } }),
        h('span', { class: 'xstack__name', text: it.label }),
        h('span', { class: 'xstack__val', text: (opts.format || App.fmt.compact)(it.value) + ' · ' + App.fmt.pct(total ? it.value / total : 0) }),
      ]);
    }));
    mount.appendChild(h('div', { class: 'xstack-wrap' }, [bar, legend]));
  }

  /** rows: [{label, value, note?, color?}] -> 가로 막대. max 를 주면 그 값이 끝 */
  function hbars(mount, opts) {
    var max = opts.max || Math.max.apply(null, opts.rows.map(function (r) { return r.value; }).concat([0]));
    mount.appendChild(h('div', { class: 'xbars' }, opts.rows.map(function (r) {
      return h('div', { class: 'xbars__row' + (r.strong ? ' is-strong' : '') }, [
        h('span', { class: 'xbars__label', text: r.label }),
        h('span', { class: 'xbars__track' }, h('span', { class: 'xbars__fill', style: { width: (max ? (r.value / max) * 100 : 0) + '%', background: r.color || 'var(--viz-1)' } })),
        h('span', { class: 'xbars__val', text: (opts.format || App.fmt.pct)(r.value) }),
        r.note ? h('span', { class: 'xbars__note', text: r.note }) : null,
      ]);
    })));
  }

  /**
   * 연도별 Base 기둥과 Worst~Best 범위.
   * @param {{labels: string[], base: number[], low: number[], high: number[], actual?: boolean[], format?: function, height?: number}} opts
   *   actual[i] 이 참이면 그 해는 실적이라 범위를 그리지 않습니다.
   */
  function columns(mount, opts) {
    var W = 420;
    var H = opts.height || 170;
    var pad = { l: 8, r: 8, t: 22, b: 26 };
    var n = opts.labels.length;
    var max = 0;
    for (var i = 0; i < n; i++) max = Math.max(max, opts.base[i], opts.high[i] || 0);
    max = max * 1.12 || 1;
    var slot = (W - pad.l - pad.r) / n;
    var bw = Math.min(46, slot * 0.5);
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + (H + pad.t + pad.b), class: 'xcol__svg', role: 'img', 'aria-label': opts.label || '' });
    function Y(v) { return pad.t + H - (v / max) * H; }
    root.appendChild(svg('line', { x1: pad.l, x2: W - pad.r, y1: pad.t + H, y2: pad.t + H, class: 'xcol__axis' }));
    var fmt = opts.format || App.fmt.compact;
    for (var k = 0; k < n; k++) {
      var cx = pad.l + slot * k + slot / 2;
      var v = opts.base[k];
      var isA = opts.actual && opts.actual[k];
      var top = Y(v);
      var y0 = pad.t + H;
      // 아래는 각지고 위만 둥근 기둥
      var r = 4;
      var x0 = cx - bw / 2;
      var hgt = Math.max(0, y0 - top);
      var d = hgt > r
        ? 'M' + x0 + ',' + y0 + 'V' + (top + r) + 'Q' + x0 + ',' + top + ' ' + (x0 + r) + ',' + top + 'H' + (x0 + bw - r) + 'Q' + (x0 + bw) + ',' + top + ' ' + (x0 + bw) + ',' + (top + r) + 'V' + y0 + 'Z'
        : 'M' + x0 + ',' + y0 + 'V' + top + 'H' + (x0 + bw) + 'V' + y0 + 'Z';
      root.appendChild(svg('path', { d: d, class: 'xcol__bar' + (isA ? ' is-actual' : '') }));
      if (!isA && opts.low[k] != null && opts.high[k] != null && opts.high[k] !== opts.low[k]) {
        var yl = Y(opts.low[k]);
        var yh = Y(opts.high[k]);
        root.appendChild(svg('line', { x1: cx, x2: cx, y1: yl, y2: yh, class: 'xcol__range' }));
        root.appendChild(svg('line', { x1: cx - 7, x2: cx + 7, y1: yh, y2: yh, class: 'xcol__range' }));
        root.appendChild(svg('line', { x1: cx - 7, x2: cx + 7, y1: yl, y2: yl, class: 'xcol__range' }));
      }
      root.appendChild(text(cx, Math.min(top, opts.high[k] != null && !isA ? Y(opts.high[k]) : top) - 6, fmt(v), 'xcol__val', 'middle'));
      root.appendChild(text(cx, pad.t + H + 17, opts.labels[k], 'xcol__lab', 'middle'));
    }
    mount.appendChild(h('div', { class: 'xcol' }, root));
  }

  App.bars = { stack: stack, hbars: hbars, columns: columns };
})(window);
