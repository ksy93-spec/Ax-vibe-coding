/* 막대 차트 두 가지. SVG 를 직접 그립니다 (라이브러리 없음). 전역 App.chart.
 *   columns(opts)  분기별 세로 막대 (회사 화면)
 *   bars(opts)     회사별 가로 막대 (한눈에 보기 비교)
 * 계열은 늘 하나라 범례 대신 제목이 무엇인지 밝힙니다. 축은 하나만 씁니다(두 지표를 한 차트에 겹치지 않음).
 * 마우스를 올리면 값 풍선이 뜨고, 같은 값은 표로도 볼 수 있습니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var NS = 'http://www.w3.org/2000/svg';

  function s(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      el.setAttribute(k, attrs[k]);
    });
    return el;
  }

  /** 보기 좋은 눈금 (0 포함) */
  function ticks(min, max, count) {
    var lo = Math.min(0, min);
    var hi = Math.max(0, max);
    if (lo === hi) hi = lo + 1;
    var raw = (hi - lo) / (count || 4);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var step = [1, 2, 2.5, 5, 10].map(function (m) {
      return m * mag;
    }).filter(function (v) {
      return v >= raw;
    })[0];
    var start = Math.floor(lo / step) * step;
    var end = Math.ceil(hi / step) * step;
    var out = [];
    for (var v = start; v <= end + step / 2; v += step) out.push(+v.toPrecision(12));
    return out;
  }

  /** 막대 끝만 4px 둥글게. 기준선 쪽은 각지게 둡니다. */
  function barPath(x, y, w, hgt, dir) {
    var r = Math.min(4, w / 2, Math.abs(hgt));
    if (hgt <= 0) return '';
    if (dir === 'up') {
      return 'M' + x + ',' + (y + hgt) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y +
        'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + hgt) + 'Z';
    }
    if (dir === 'down') {
      return 'M' + x + ',' + y + 'V' + (y + hgt - r) + 'Q' + x + ',' + (y + hgt) + ' ' + (x + r) + ',' + (y + hgt) +
        'H' + (x + w - r) + 'Q' + (x + w) + ',' + (y + hgt) + ' ' + (x + w) + ',' + (y + hgt - r) + 'V' + y + 'Z';
    }
    // 가로 막대: w 가 길이, hgt 가 두께. dir 'right' / 'left'
    return '';
  }
  function hbarPath(x, y, len, thick, dir) {
    var r = Math.min(4, thick / 2, len);
    if (len <= 0) return '';
    if (dir === 'right') {
      return 'M' + x + ',' + y + 'H' + (x + len - r) + 'Q' + (x + len) + ',' + y + ' ' + (x + len) + ',' + (y + r) +
        'V' + (y + thick - r) + 'Q' + (x + len) + ',' + (y + thick) + ' ' + (x + len - r) + ',' + (y + thick) + 'H' + x + 'Z';
    }
    return 'M' + x + ',' + y + 'H' + (x - len + r) + 'Q' + (x - len) + ',' + y + ' ' + (x - len) + ',' + (y + r) +
      'V' + (y + thick - r) + 'Q' + (x - len) + ',' + (y + thick) + ' ' + (x - len + r) + ',' + (y + thick) + 'H' + x + 'Z';
  }

  function tooltipHost(box) {
    var tip = h('div', { class: 'chart__tip', role: 'tooltip' });
    box.appendChild(tip);
    return {
      show: function (lines, x, y) {
        App.dom.clear(tip);
        lines.forEach(function (l, i) {
          tip.appendChild(h('div', { class: i === 0 ? 'chart__tip-head' : 'chart__tip-row', text: l }));
        });
        tip.classList.add('is-on');
        var bw = box.clientWidth;
        var tw = tip.offsetWidth;
        tip.style.left = Math.max(0, Math.min(bw - tw, x - tw / 2)) + 'px';
        tip.style.top = Math.max(0, y - tip.offsetHeight - 8) + 'px';
      },
      hide: function () {
        tip.classList.remove('is-on');
      },
    };
  }

  /**
   * 세로 막대.
   * @param {{title: string, unit: string, data: Array<{label: string, value: number|null, tip?: string[]}>, format: Function, height?: number}} o
   */
  function columns(o) {
    var W = 520;
    var H = o.height || 220;
    var pad = { l: 56, r: 8, t: 12, b: 28 };
    var vals = o.data.map(function (d) {
      return d.value;
    }).filter(function (v) {
      return v !== null && v !== undefined && isFinite(v);
    });
    var box = h('div', { class: 'chart' }, [
      h('div', { class: 'chart__head' }, [
        h('span', { class: 'chart__title', text: o.title }),
        h('span', { class: 'chart__unit', text: o.unit }),
      ]),
    ]);
    if (!vals.length) {
      box.appendChild(h('div', { class: 'chart__empty', text: '숫자가 없습니다' }));
      return box;
    }
    var tk = ticks(Math.min.apply(null, vals), Math.max.apply(null, vals), 4);
    var lo = tk[0];
    var hi = tk[tk.length - 1];
    var ih = H - pad.t - pad.b;
    var y = function (v) {
      return pad.t + ((hi - v) / (hi - lo)) * ih;
    };
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart__svg', role: 'img', 'aria-label': o.title });
    tk.forEach(function (t) {
      svg.appendChild(s('line', { x1: pad.l, x2: W - pad.r, y1: y(t), y2: y(t), class: t === 0 ? 'chart__zero' : 'chart__grid' }));
      var lab = s('text', { x: pad.l - 6, y: y(t) + 4, class: 'chart__tick', 'text-anchor': 'end' });
      lab.textContent = o.format(t);
      svg.appendChild(lab);
    });
    var n = o.data.length;
    var slot = (W - pad.l - pad.r) / n;
    var bw = Math.min(36, slot * 0.6);
    var tip = tooltipHost(box);
    o.data.forEach(function (d, i) {
      var cx = pad.l + slot * i + slot / 2;
      var lab = s('text', { x: cx, y: H - 8, class: 'chart__tick', 'text-anchor': 'middle' });
      lab.textContent = d.label;
      svg.appendChild(lab);
      var g = s('g', { class: 'chart__col', tabindex: '0' });
      g.appendChild(s('rect', { x: cx - slot / 2, y: pad.t, width: slot, height: ih, class: 'chart__hit' }));
      if (d.value !== null && d.value !== undefined && isFinite(d.value)) {
        var y0 = y(0);
        var yv = y(d.value);
        var path = d.value >= 0 ? barPath(cx - bw / 2, yv, bw, y0 - yv, 'up') : barPath(cx - bw / 2, y0, bw, yv - y0, 'down');
        if (path) g.appendChild(s('path', { d: path, class: 'chart__bar' }));
      } else {
        var na = s('text', { x: cx, y: y(0) - 6, class: 'chart__na', 'text-anchor': 'middle' });
        na.textContent = '없음';
        g.appendChild(na);
      }
      var lines = [d.label, d.value === null || d.value === undefined ? '값 없음' : o.format(d.value) + ' ' + o.unit].concat(d.tip || []);
      var show = function () {
        var r = svg.getBoundingClientRect();
        var k = r.width / W;
        tip.show(lines, cx * k, y(Math.max(0, d.value || 0)) * k + 28);
      };
      g.addEventListener('mouseenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('mouseleave', tip.hide);
      g.addEventListener('blur', tip.hide);
      svg.appendChild(g);
    });
    box.appendChild(svg);
    return box;
  }

  /**
   * 가로 막대 (회사 비교). 0 을 기준으로 음수는 왼쪽으로 그립니다.
   * @param {{title: string, unit: string, data: Array<{label: string, value: number|null, tip?: string[], onClick?: Function}>, format: Function}} o
   */
  function bars(o) {
    var rowH = 26;
    var W = 520;
    var pad = { l: 116, r: 64, t: 8, b: 8 };
    var data = o.data.filter(function (d) {
      return d.value !== null && d.value !== undefined && isFinite(d.value);
    });
    var box = h('div', { class: 'chart' }, [
      h('div', { class: 'chart__head' }, [
        h('span', { class: 'chart__title', text: o.title }),
        h('span', { class: 'chart__unit', text: o.unit }),
      ]),
    ]);
    if (!data.length) {
      box.appendChild(h('div', { class: 'chart__empty', text: '이 분기에 숫자가 있는 회사가 없습니다' }));
      return box;
    }
    var H = pad.t + pad.b + rowH * data.length;
    var mn = Math.min(0, Math.min.apply(null, data.map(function (d) { return d.value; })));
    var mx = Math.max(0, Math.max.apply(null, data.map(function (d) { return d.value; })));
    if (mn === mx) mx = 1;
    var iw = W - pad.l - pad.r;
    var x = function (v) {
      return pad.l + ((v - mn) / (mx - mn)) * iw;
    };
    var svg = s('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'chart__svg', role: 'img', 'aria-label': o.title });
    var x0 = x(0);
    var tip = tooltipHost(box);
    data.forEach(function (d, i) {
      var yy = pad.t + rowH * i;
      var g = s('g', { class: 'chart__col' + (d.onClick ? ' is-link' : ''), tabindex: '0' });
      g.appendChild(s('rect', { x: 0, y: yy, width: W, height: rowH, class: 'chart__hit' }));
      var lab = s('text', { x: pad.l - 8, y: yy + rowH / 2 + 4, class: 'chart__label', 'text-anchor': 'end' });
      lab.textContent = d.label;
      g.appendChild(lab);
      var len = Math.abs(x(d.value) - x0);
      var p = hbarPath(x0, yy + 6, len, rowH - 12, d.value >= 0 ? 'right' : 'left');
      if (p) g.appendChild(s('path', { d: p, class: 'chart__bar' }));
      var val = s('text', {
        x: d.value >= 0 ? x0 + len + 6 : x0 - len - 6,
        y: yy + rowH / 2 + 4,
        class: 'chart__value',
        'text-anchor': d.value >= 0 ? 'start' : 'end',
      });
      val.textContent = o.format(d.value);
      g.appendChild(val);
      var show = function () {
        var r = svg.getBoundingClientRect();
        var k = r.width / W;
        tip.show([d.label, o.format(d.value) + ' ' + o.unit].concat(d.tip || []), (x0 + (d.value >= 0 ? len : -len)) * k, yy * k + 28);
      };
      g.addEventListener('mouseenter', show);
      g.addEventListener('focus', show);
      g.addEventListener('mouseleave', tip.hide);
      g.addEventListener('blur', tip.hide);
      if (d.onClick) {
        g.addEventListener('click', d.onClick);
        g.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') d.onClick();
        });
      }
      svg.appendChild(g);
    });
    svg.appendChild(s('line', { x1: x0, x2: x0, y1: pad.t, y2: H - pad.b, class: 'chart__zero' }));
    box.appendChild(svg);
    return box;
  }

  App.chart = { columns: columns, bars: bars, ticks: ticks };
})(window);
