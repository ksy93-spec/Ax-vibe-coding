/* 예측 차트 (인라인 SVG). 전역 App.fcChart.
 *
 * 실적은 실선, 기준선은 점선, 시나리오는 굵은 실선, 불확실성 구간은 옅은 띠입니다.
 * 점선은 "예측" 으로 읽히므로 기준선에만 씁니다. 눈금선은 실선 헤어라인입니다.
 * 라이트 모드에서 일부 계열 색은 배경 대비가 낮아 표 보기 버튼을 항상 같이 둡니다. 지우지 마세요.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var NS = 'http://www.w3.org/2000/svg';

  var W = 760;
  var PAD = { l: 56, r: 92, t: 12, b: 28 };

  var STYLE = {
    actual: { color: 'var(--viz-1)', width: 2, dash: null },
    baseline: { color: 'var(--c-fg-muted)', width: 1.5, dash: '5 4' },
    scenario: { color: 'var(--viz-2)', width: 2, dash: null },
    line: { color: 'var(--viz-7)', width: 2, dash: null },
    // 보고서에서 시나리오를 둘, 셋 비교할 때. 계열 색 순서(--viz-2, 3, 7)를 지킵니다.
    line2: { color: 'var(--viz-3)', width: 2, dash: null },
    line3: { color: 'var(--viz-7)', width: 2, dash: null },
  };

  function svg(tag, attrs, children) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    });
    (children || []).forEach(function (c) { if (c) el.appendChild(c); });
    return el;
  }

  function niceScale(min, max, count) {
    if (min === max) {
      var pad = Math.abs(min) * 0.1 || 1;
      min -= pad;
      max += pad;
    }
    var raw = (max - min) / (count || 4);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var n = raw / mag;
    var step = (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag;
    return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step: step };
  }

  function fmtVal(v, format) {
    return format === 'percent' ? App.fmt.pct(v) : App.fmt.units(v);
  }
  function fmtTick(v, format) {
    return format === 'percent' ? App.fmt.pct(v, 1) : App.fmt.compact(v);
  }

  /**
   * @param {HTMLElement} mount
   * @param {{title?: string, x: string[], splitAt?: number, format?: 'units'|'percent', height?: number,
   *          series: Array<{name: string, values: Array<number|null>, kind?: 'actual'|'baseline'|'scenario'|'line'|'line2'|'line3'}>,
   *          band?: {name: string, lo: Array<number|null>, hi: Array<number|null>}}} spec
   */
  function fcChart(mount, spec) {
    var H = spec.height || 220;
    var n = spec.x.length;
    var format = spec.format || 'units';
    var plotW = W - PAD.l - PAD.r;
    var all = [];
    spec.series.forEach(function (s) { s.values.forEach(function (v) { if (v !== null && isFinite(v)) all.push(v); }); });
    if (spec.band) {
      spec.band.lo.forEach(function (v) { if (v !== null && isFinite(v)) all.push(v); });
      spec.band.hi.forEach(function (v) { if (v !== null && isFinite(v)) all.push(v); });
    }
    var wrap = h('figure', { class: 'fc' });
    if (spec.title) wrap.appendChild(h('figcaption', { class: 'fc__title', text: spec.title }));
    if (!all.length || n < 2) {
      wrap.appendChild(h('p', { class: 'fc__empty', text: '표시할 값이 없습니다.' }));
      mount.appendChild(wrap);
      return { destroy: function () { wrap.remove(); } };
    }
    var lo = Math.min.apply(null, all);
    var hi = Math.max.apply(null, all);
    if (format === 'units' && lo > 0) lo = 0;
    var sc = niceScale(lo, hi, 4);
    function X(i) { return PAD.l + (plotW * i) / (n - 1); }
    function Y(v) { return PAD.t + H - ((v - sc.min) / (sc.max - sc.min)) * H; }

    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + (H + PAD.t + PAD.b), class: 'fc__svg', role: 'img', 'aria-label': spec.title || '차트' });

    // 눈금
    for (var v = sc.min; v <= sc.max + sc.step / 2; v += sc.step) {
      root.appendChild(svg('line', { x1: PAD.l, x2: W - PAD.r, y1: Y(v), y2: Y(v), class: 'fc__grid' }));
      var t = svg('text', { x: PAD.l - 8, y: Y(v) + 4, 'text-anchor': 'end', class: 'fc__tick' });
      t.textContent = fmtTick(v, format);
      root.appendChild(t);
    }
    var every = Math.max(1, Math.ceil(n / 12));
    spec.x.forEach(function (lab, i) {
      if (i % every !== 0 && i !== n - 1) return;
      var tx = svg('text', { x: X(i), y: PAD.t + H + 18, 'text-anchor': 'middle', class: 'fc__tick' });
      tx.textContent = lab.slice(2).replace('-', '.');
      root.appendChild(tx);
    });

    // 예측 시작선
    if (spec.splitAt > 0 && spec.splitAt < n) {
      var sx = (X(spec.splitAt - 1) + X(spec.splitAt)) / 2;
      root.appendChild(svg('rect', { x: sx, y: PAD.t, width: W - PAD.r - sx, height: H, class: 'fc__future' }));
      var ft = svg('text', { x: sx + 6, y: PAD.t + 12, class: 'fc__tick' });
      ft.textContent = '예측';
      root.appendChild(ft);
    }

    // 구간
    if (spec.band) {
      var top = [];
      var bot = [];
      for (var i = 0; i < n; i++) {
        if (spec.band.lo[i] === null || spec.band.hi[i] === null || spec.band.lo[i] === undefined) continue;
        top.push(X(i) + ',' + Y(spec.band.hi[i]));
        bot.unshift(X(i) + ',' + Y(spec.band.lo[i]));
      }
      if (top.length) root.appendChild(svg('polygon', { points: top.concat(bot).join(' '), class: 'fc__band' }));
    }

    // 선
    var ends = [];
    spec.series.forEach(function (s) {
      var st = STYLE[s.kind || 'line'];
      var d = '';
      var pen = false;
      var lastI = -1;
      s.values.forEach(function (val, i) {
        if (val === null || val === undefined || !isFinite(val)) { pen = false; return; }
        d += (pen ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(val).toFixed(1);
        pen = true;
        lastI = i;
      });
      if (!d) return;
      root.appendChild(svg('path', { d: d, fill: 'none', stroke: st.color, 'stroke-width': st.width, 'stroke-dasharray': st.dash, 'stroke-linejoin': 'round' }));
      if (lastI === n - 1) ends.push({ y: Y(s.values[lastI]), text: s.name, color: st.color });
    });
    // 끝 라벨 (겹치지 않게 아래로 밀기)
    ends.sort(function (a, b) { return a.y - b.y; });
    var lastY = -Infinity;
    ends.forEach(function (e) {
      var y = Math.max(e.y, lastY + 13);
      lastY = y;
      var tl = svg('text', { x: W - PAD.r + 6, y: y + 4, class: 'fc__endlabel' });
      tl.textContent = e.text;
      root.appendChild(tl);
    });

    // 호버와 키보드
    var guide = svg('line', { y1: PAD.t, y2: PAD.t + H, class: 'fc__guide', visibility: 'hidden' });
    root.appendChild(guide);
    var hit = svg('rect', { x: PAD.l, y: PAD.t, width: plotW, height: H, fill: 'transparent', tabindex: '0', role: 'application', 'aria-label': '좌우 방향키로 값 읽기' });
    root.appendChild(hit);
    var tip = h('div', { class: 'fc__tip', role: 'status' });
    var body = h('div', { class: 'fc__body' }, [root, tip]);
    var cur = -1;

    function show(i) {
      cur = Math.max(0, Math.min(n - 1, i));
      guide.setAttribute('x1', X(cur));
      guide.setAttribute('x2', X(cur));
      guide.setAttribute('visibility', 'visible');
      App.dom.clear(tip);
      tip.appendChild(h('div', { class: 'fc__tip-x', text: spec.x[cur] + (spec.splitAt !== undefined && cur >= spec.splitAt ? ' (예측)' : '') }));
      spec.series.forEach(function (s) {
        var val = s.values[cur];
        if (val === null || val === undefined) return;
        tip.appendChild(h('div', { class: 'fc__tip-row' }, [
          h('span', { class: 'fc__key fc__key--' + (s.kind || 'line') }),
          h('span', { class: 'fc__tip-name', text: s.name }),
          h('span', { class: 'fc__tip-val', text: fmtVal(val, format) }),
        ]));
      });
      if (spec.band && spec.band.lo[cur] !== null && spec.band.lo[cur] !== undefined) {
        tip.appendChild(h('div', { class: 'fc__tip-row' }, [
          h('span', { class: 'fc__key fc__key--band' }),
          h('span', { class: 'fc__tip-name', text: spec.band.name }),
          h('span', { class: 'fc__tip-val', text: fmtVal(spec.band.lo[cur], format) + ' ~ ' + fmtVal(spec.band.hi[cur], format) }),
        ]));
      }
      var rect = root.getBoundingClientRect();
      var px = (X(cur) / W) * rect.width;
      tip.style.left = Math.min(px + 12, rect.width - 220) + 'px';
      tip.classList.add('is-on');
    }
    function hide() {
      guide.setAttribute('visibility', 'hidden');
      tip.classList.remove('is-on');
    }
    hit.addEventListener('mousemove', function (e) {
      var rect = root.getBoundingClientRect();
      var x = ((e.clientX - rect.left) / rect.width) * W;
      show(Math.round(((x - PAD.l) / plotW) * (n - 1)));
    });
    hit.addEventListener('mouseleave', hide);
    hit.addEventListener('blur', hide);
    hit.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); show(cur < 0 ? spec.splitAt || 0 : cur + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(cur < 0 ? spec.splitAt || 0 : cur - 1); }
    });

    // 범례와 표 보기
    var legend = h('div', { class: 'fc__legend' });
    spec.series.forEach(function (s) {
      legend.appendChild(h('span', { class: 'fc__legend-item' }, [h('span', { class: 'fc__key fc__key--' + (s.kind || 'line') }), s.name]));
    });
    if (spec.band) legend.appendChild(h('span', { class: 'fc__legend-item' }, [h('span', { class: 'fc__key fc__key--band' }), spec.band.name]));
    var tableBox = h('div', { class: 'fc__table', hidden: true });
    var toggle = h('button', {
      class: 'btn btn--sm btn--ghost no-print', type: 'button', text: '표 보기',
      onclick: function () {
        var open = tableBox.hasAttribute('hidden');
        if (open) {
          App.dom.clear(tableBox);
          tableBox.appendChild(buildTable(spec, format));
          tableBox.removeAttribute('hidden');
        } else {
          tableBox.setAttribute('hidden', '');
        }
        toggle.textContent = open ? '표 닫기' : '표 보기';
      },
    });
    wrap.appendChild(h('div', { class: 'fc__head' }, [legend, h('div', { class: 'app__spacer' }), toggle]));
    wrap.appendChild(body);
    wrap.appendChild(tableBox);
    mount.appendChild(wrap);
    return { destroy: function () { wrap.remove(); } };
  }

  function buildTable(spec, format) {
    var cols = ['월'].concat(spec.series.map(function (s) { return s.name; }));
    if (spec.band) cols.push(spec.band.name);
    var thead = h('thead', null, h('tr', null, cols.map(function (c) { return h('th', { class: 'th', scope: 'col', text: c }); })));
    var tbody = h('tbody');
    spec.x.forEach(function (lab, i) {
      var cells = [h('th', { scope: 'row', text: lab + (spec.splitAt !== undefined && i >= spec.splitAt ? ' *' : '') })];
      spec.series.forEach(function (s) { cells.push(h('td', { class: 'num', text: s.values[i] === null || s.values[i] === undefined ? '' : fmtVal(s.values[i], format) })); });
      if (spec.band) {
        var l = spec.band.lo[i];
        cells.push(h('td', { class: 'num', text: l === null || l === undefined ? '' : fmtVal(l, format) + ' ~ ' + fmtVal(spec.band.hi[i], format) }));
      }
      tbody.appendChild(h('tr', null, cells));
    });
    return h('div', { class: 'table__scroll' }, h('table', { class: 'table' }, [thead, tbody]));
  }

  App.fcChart = fcChart;
})(window);
