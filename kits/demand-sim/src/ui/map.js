/* 세계 지도 (인라인 SVG). 전역 App.worldMap.
 * 데이터에 있는 지역은 강조색으로 칠하고, 지역마다 판매량 크기의 점이 깜빡입니다.
 * 지역을 누르거나(점, 나라 모두) 점에 포커스를 두고 Enter 를 누르면 onSelect(region) 이 불립니다.
 * 깜빡임은 운영체제 "동작 줄이기" 설정이 켜져 있으면 멈춥니다 (sim.css).
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var NS = 'http://www.w3.org/2000/svg';

  function svg(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (attrs[k] !== null && attrs[k] !== undefined) el.setAttribute(k, attrs[k]);
    });
    return el;
  }

  var byIso = null;
  function countryIndex() {
    if (byIso) return byIso;
    byIso = {};
    App.worldMapData.countries.forEach(function (c) { if (c.iso2) byIso[c.iso2] = c; });
    return byIso;
  }

  /**
   * @param {HTMLElement} mount
   * @param {{regions: Array<{key: string, label: string, value: string, size: number, iso2: string[], weights?: Object<string, number>}>,
   *          selected: string, onSelect: function(string)}} opts
   *   size 는 0~1 (점 크기), weights 는 나라별 가중치 (점 위치를 판매 중심으로 옮길 때)
   * @returns {{unmapped: string[]}}
   */
  function worldMap(mount, opts) {
    var data = App.worldMapData;
    var idx = countryIndex();
    var root = svg('svg', { viewBox: '0 0 ' + data.width + ' ' + data.height, class: 'map__svg', role: 'img', 'aria-label': '세계 지도. 데이터에 있는 지역이 강조되어 있습니다.' });
    var owner = {};
    opts.regions.forEach(function (r) { r.iso2.forEach(function (c) { if (!owner[c]) owner[c] = r.key; }); });

    var countryLayer = svg('g', { class: 'map__countries' });
    data.countries.forEach(function (c) {
      var reg = owner[c.iso2];
      var p = svg('path', {
        d: c.d,
        class: 'map__country' + (reg ? ' is-region' : '') + (reg && reg === opts.selected ? ' is-selected' : ''),
        'data-region': reg || null,
      });
      if (reg) {
        var t = svg('title');
        t.textContent = c.name;
        p.appendChild(t);
        p.addEventListener('click', function () { opts.onSelect(reg); });
        p.addEventListener('mouseenter', function () { hover(reg, true); });
        p.addEventListener('mouseleave', function () { hover(reg, false); });
      }
      countryLayer.appendChild(p);
    });
    root.appendChild(countryLayer);

    function hover(reg, on) {
      Array.prototype.forEach.call(root.querySelectorAll('[data-region="' + cssEscape(reg) + '"]'), function (el) {
        el.classList.toggle('is-hover', on);
      });
    }

    var unmapped = [];
    var markers = svg('g', { class: 'map__markers' });
    var placed = [];
    opts.regions.forEach(function (r) {
      var pts = r.iso2.map(function (c) { return idx[c]; }).filter(Boolean);
      if (!pts.length) {
        unmapped.push(r.key);
        return;
      }
      // 점 위치: 나라별 판매(없으면 면적) 가중 평균
      var sx = 0;
      var sy = 0;
      var sw = 0;
      pts.forEach(function (c) {
        var wgt = r.weights && r.weights[c.iso2] > 0 ? r.weights[c.iso2] : r.weights ? 0 : c.a;
        sx += c.cx * wgt;
        sy += c.cy * wgt;
        sw += wgt;
      });
      if (!sw) pts.forEach(function (c) { sx += c.cx * c.a; sy += c.cy * c.a; sw += c.a; });
      placed.push({ r: r, x: sx / sw, y: sy / sw, rad: 6 + 12 * Math.sqrt(Math.max(0, Math.min(1, r.size))) });
    });

    // 라벨 자리: 큰 점부터 오른쪽, 왼쪽, 위, 아래 순으로 다른 라벨, 점과 안 겹치는 곳을 고릅니다.
    var boxes = placed.map(function (m) { return { x0: m.x - m.rad, y0: m.y - m.rad, x1: m.x + m.rad, y1: m.y + m.rad }; });
    function hits(b) {
      return boxes.some(function (o) { return b.x0 < o.x1 && b.x1 > o.x0 && b.y0 < o.y1 && b.y1 > o.y0; });
    }
    placed.slice().sort(function (a, b) { return b.rad - a.rad; }).forEach(function (m) {
      var lw = Math.max(m.r.label.length * 13, m.r.value.length * 6.6) + 4;
      var lh = 30;
      var cands = [
        { x: m.x + m.rad + 5, y: m.y - 15, anchor: 'start' },
        { x: m.x - m.rad - 5, y: m.y - 15, anchor: 'end' },
        { x: m.x, y: m.y - m.rad - lh - 2, anchor: 'middle' },
        { x: m.x, y: m.y + m.rad + 2, anchor: 'middle' },
        { x: m.x + m.rad + 5, y: m.y + m.rad, anchor: 'start' },
        { x: m.x - m.rad - 5, y: m.y + m.rad, anchor: 'end' },
      ];
      var pick = null;
      for (var i = 0; i < cands.length && !pick; i++) {
        var c = cands[i];
        var x0 = c.anchor === 'start' ? c.x : c.anchor === 'end' ? c.x - lw : c.x - lw / 2;
        var b = { x0: x0, y0: c.y, x1: x0 + lw, y1: c.y + lh };
        if (b.x0 < 0 || b.x1 > data.width || b.y0 < 0 || b.y1 > data.height) continue;
        if (!hits(b)) { pick = c; boxes.push(b); }
      }
      m.label = pick || cands[0];
    });

    placed.forEach(function (m) {
      var r = m.r;
      var sel = r.key === opts.selected;
      var g = svg('g', { class: 'map__marker' + (sel ? ' is-selected' : ''), tabindex: '0', role: 'button', 'aria-label': r.label + ' ' + r.value + ' 선택', 'data-region': r.key });
      g.appendChild(svg('circle', { cx: m.x, cy: m.y, r: m.rad, class: 'map__pulse' }));
      g.appendChild(svg('circle', { cx: m.x, cy: m.y, r: m.rad, class: 'map__dot' }));
      var t1 = svg('text', { x: m.label.x, y: m.label.y + 12, class: 'map__label', 'text-anchor': m.label.anchor });
      t1.textContent = r.label;
      var t2 = svg('text', { x: m.label.x, y: m.label.y + 26, class: 'map__value', 'text-anchor': m.label.anchor });
      t2.textContent = r.value;
      g.appendChild(t1);
      g.appendChild(t2);
      g.addEventListener('click', function () { opts.onSelect(r.key); });
      g.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); opts.onSelect(r.key); }
      });
      g.addEventListener('mouseenter', function () { hover(r.key, true); });
      g.addEventListener('mouseleave', function () { hover(r.key, false); });
      markers.appendChild(g);
    });
    // 선택된 지역의 점을 맨 위로
    var selEl = markers.querySelector('.is-selected');
    if (selEl) markers.appendChild(selEl);
    root.appendChild(markers);
    mount.appendChild(h('div', { class: 'map' }, root));
    return { unmapped: unmapped };
  }

  function cssEscape(s) {
    return String(s).replace(/["\\]/g, '\\$&');
  }

  App.worldMap = worldMap;
})(window);
