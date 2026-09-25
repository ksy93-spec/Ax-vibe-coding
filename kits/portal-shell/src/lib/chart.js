/* 인라인 SVG 차트. 외부 라이브러리 없음. 전역 App.createChart.
 *
 * 규칙 몇 가지가 코드에 박혀 있습니다. 바꾸기 전에 왜 그런지 읽어 보세요.
 * - 계열 색은 --viz-1..8 을 순서대로 씁니다. 9번째가 필요하면 색을 만들지 말고
 *   "기타"로 묶거나 차트를 나눕니다. 슬롯 순서가 색맹 안전성을 만드는 장치입니다.
 * - 라이트 모드에서 일부 계열 색은 흰 배경 대비 3:1 미만입니다. 그래서 직접 라벨과
 *   표 보기를 항상 같이 제공합니다. 표 보기 버튼을 지우지 마세요.
 * - 글자에는 계열 색을 쓰지 않습니다. 색은 마크가 들고, 글자는 본문 색을 씁니다.
 * - 축 눈금선은 실선 헤어라인입니다. 점선은 "예측"이나 "임계값"으로 읽혀서 씁니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var clear = App.dom.clear;

  var NS = 'http://www.w3.org/2000/svg';
  var SERIES_SLOTS = 8;

  function svg(tag, attrs, children) {
    var el = document.createElementNS(NS, tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        el.setAttribute(k, v);
      });
    }
    if (children) {
      (Array.isArray(children) ? children : [children]).forEach(function (c) {
        if (c === null || c === undefined || c === false) return;
        el.appendChild(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)));
      });
    }
    return el;
  }

  function seriesVar(i) {
    return 'var(--viz-' + ((i % SERIES_SLOTS) + 1) + ')';
  }

  /** 숫자를 사람이 읽는 형태로. 한국 업무에서 쓰는 만/억 단위를 씁니다. */
  function formatValue(v, format) {
    if (v === null || v === undefined || isNaN(v)) return '';
    if (format === 'percent') return (Math.round(v * 10) / 10).toLocaleString('ko-KR') + '%';
    if (format === 'won' || format === 'compact') {
      var abs = Math.abs(v);
      if (abs >= 1e8) return trimZero(v / 1e8) + '억';
      if (abs >= 1e4) return trimZero(v / 1e4) + '만';
      return Math.round(v).toLocaleString('ko-KR');
    }
    return (Math.round(v * 100) / 100).toLocaleString('ko-KR');
  }

  function trimZero(n) {
    var s = (Math.round(n * 10) / 10).toFixed(1);
    return s.replace(/\.0$/, '');
  }

  /** 축 눈금을 깔끔한 숫자로 만듭니다. 1, 2, 2.5, 5, 10 배수만 씁니다. */
  function niceScale(min, max, target) {
    target = target || 4;
    if (min === max) {
      if (min === 0) return { min: 0, max: 1, step: 0.25 };
      var pad = Math.abs(min) * 0.1;
      min -= pad;
      max += pad;
    }
    var raw = (max - min) / target;
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
    return {
      min: Math.floor(min / step) * step,
      max: Math.ceil(max / step) * step,
      step: step,
    };
  }

  function ticksOf(scale) {
    var out = [];
    // 부동소수 누적 오차를 피하려고 곱셈으로 만듭니다.
    var n = Math.round((scale.max - scale.min) / scale.step);
    for (var i = 0; i <= n; i++) out.push(scale.min + scale.step * i);
    return out;
  }

  function textWidth(text, px) {
    // 한글은 라틴보다 넓습니다. 측정 대신 근사치를 씁니다.
    var w = 0;
    for (var i = 0; i < text.length; i++) {
      w += text.charCodeAt(i) > 0x2e80 ? px : px * 0.56;
    }
    return w;
  }

  /**
   * createChart(mount, options)
   *
   * options:
   *   type      'line' | 'bar'
   *   title     차트 제목 (선택)
   *   x         string[]  가로축 라벨
   *   series    [{ name, values: number[] }]
   *   format    'number' | 'won' | 'percent'
   *   height    플롯 높이 (기본 240). 축 라벨 자리는 여기에 더해집니다.
   *   zeroBase  막대는 항상 true. 선은 기본 false.
   */
  function createChart(mount, options) {
    var opt = Object.assign({ type: 'line', x: [], series: [], format: 'number', height: 240 },
                            options || {});
    if (opt.type === 'bar') opt.zeroBase = true;

    var showTable = false;
    var activeIndex = -1;

    // render() 가 채우는 참조들. 값이 바뀌어도 SVG 를 다시 만들지 않고
    // 이 조각들만 갱신합니다. 통째로 다시 그리면 키보드 포커스가 날아갑니다.
    var geo = null;

    var elPlot = h('div', { class: 'chart__plot' });
    var elTip = h('div', { class: 'chart__tip', role: 'status', 'aria-live': 'polite' });
    var elTableBox = h('div', { class: 'chart__table' });

    var btnTable = h('button', {
      class: 'btn btn--sm',
      type: 'button',
      'aria-pressed': 'false',
      text: '표로 보기',
      onclick: function () {
        showTable = !showTable;
        btnTable.textContent = showTable ? '차트로 보기' : '표로 보기';
        btnTable.setAttribute('aria-pressed', showTable ? 'true' : 'false');
        render();
      },
    });

    var elLegend = h('div', { class: 'chart__legend' });
    var elHead = h('div', { class: 'chart__head' }, [
      opt.title ? h('h3', { class: 'chart__title', text: opt.title }) : null,
      h('div', { class: 'app__spacer' }),
      btnTable,
    ]);

    var root = h('div', { class: 'chart' }, [
      elHead,
      elLegend,
      h('div', { class: 'chart__body' }, [elPlot, elTip]),
      elTableBox,
    ]);
    clear(mount).appendChild(root);

    function renderLegend() {
      clear(elLegend);
      // 계열이 하나면 제목이 이미 무엇인지 말하고 있습니다. 범례 상자는 자리만 먹습니다.
      if (opt.series.length < 2) return;
      opt.series.forEach(function (s, i) {
        var key = opt.type === 'bar'
          ? h('span', { class: 'chart__swatch', style: { background: seriesVar(i) } })
          : h('span', { class: 'chart__key', style: { background: seriesVar(i) } });
        elLegend.appendChild(h('span', { class: 'chart__legend-item' }, [key, h('span', { text: s.name })]));
      });
    }

    function buildTable() {
      var thead = h('thead', null,
        h('tr', null, [h('th', { scope: 'col', text: '구분' })].concat(
          opt.series.map(function (s) { return h('th', { scope: 'col', text: s.name }); })
        )));
      var tbody = h('tbody');
      opt.x.forEach(function (label, i) {
        tbody.appendChild(h('tr', null, [h('th', { scope: 'row', text: label })].concat(
          opt.series.map(function (s) {
            return h('td', { text: formatValue(s.values[i], opt.format) });
          })
        )));
      });
      return h('table', { class: 'table table--compact' }, [thead, tbody]);
    }

    function showTip(index, clientX) {
      if (index < 0 || index >= opt.x.length) {
        elTip.classList.remove('is-on');
        return;
      }
      clear(elTip);
      elTip.appendChild(h('div', { class: 'chart__tip-x', text: opt.x[index] }));
      opt.series.forEach(function (s, i) {
        elTip.appendChild(h('div', { class: 'chart__tip-row' }, [
          h('span', { class: 'chart__key', style: { background: seriesVar(i) } }),
          h('span', { class: 'chart__tip-val', text: formatValue(s.values[index], opt.format) }),
          h('span', { class: 'chart__tip-name', text: s.name }),
        ]));
      });
      elTip.classList.add('is-on');

      var bodyRect = elPlot.getBoundingClientRect();
      var w = elTip.offsetWidth || 160;
      var left = (clientX === undefined ? bodyRect.left + bodyRect.width / 2 : clientX) - bodyRect.left;
      left = Math.max(4, Math.min(left - w / 2, bodyRect.width - w - 4));
      elTip.style.left = left + 'px';
    }

    /** 강조 위치를 바꿉니다. SVG 를 다시 만들지 않고 겹침 레이어만 갱신합니다. */
    function setActive(index, clientX) {
      activeIndex = index;
      if (!geo) return;
      clear(geo.crosshair);
      clear(geo.markers);

      if (opt.type === 'bar') {
        geo.barPaths.forEach(function (row) {
          row.forEach(function (el, i) {
            if (el) el.setAttribute('opacity', index >= 0 && index !== i ? 0.45 : 1);
          });
        });
      }

      if (index < 0) {
        elTip.classList.remove('is-on');
        return;
      }

      if (opt.type === 'line') {
        geo.crosshair.appendChild(svg('line', {
          x1: geo.xAt(index), x2: geo.xAt(index), y1: geo.padTop, y2: geo.padTop + geo.innerH,
          stroke: 'var(--viz-axis)', 'stroke-width': 1, 'shape-rendering': 'crispEdges',
        }));
        opt.series.forEach(function (s, si) {
          var v = s.values[index];
          if (typeof v !== 'number' || isNaN(v)) return;
          geo.markers.appendChild(svg('circle', {
            cx: geo.xAt(index), cy: geo.yOf(v), r: 4,
            fill: seriesVar(si), stroke: 'var(--c-bg-raised)', 'stroke-width': 2,
          }));
        });
      }
      showTip(index, clientX);
    }

    function render() {
      clear(elTableBox);
      clear(elPlot);
      geo = null;
      renderLegend();

      if (showTable) {
        elTip.classList.remove('is-on');
        elTableBox.appendChild(buildTable());
        return;
      }

      var width = Math.max(elPlot.clientWidth || mount.clientWidth || 640, 240);
      var plotH = opt.height;

      var all = [];
      opt.series.forEach(function (s) {
        s.values.forEach(function (v) { if (typeof v === 'number' && !isNaN(v)) all.push(v); });
      });
      if (!all.length) {
        elPlot.appendChild(h('p', { class: 'chart__empty', text: '표시할 값이 없습니다.' }));
        return;
      }
      var lo = Math.min.apply(null, all);
      var hi = Math.max.apply(null, all);
      if (opt.zeroBase) lo = Math.min(0, lo);
      var scale = niceScale(lo, hi, 4);
      var ticks = ticksOf(scale);
      var tickLabels = ticks.map(function (t) { return formatValue(t, opt.format); });

      var padLeft = Math.ceil(Math.max.apply(null, tickLabels.map(function (t) {
        return textWidth(t, 11);
      }))) + 12;

      // 선 차트는 오른쪽 끝에 값을 직접 붙입니다. 그 자리를 미리 비워 둡니다.
      var padRight = 12;
      if (opt.type === 'line') {
        var endLabels = opt.series.map(function (s) {
          return formatValue(s.values[s.values.length - 1], opt.format);
        });
        padRight = Math.ceil(Math.max.apply(null, endLabels.map(function (t) {
          return textWidth(t, 11);
        }))) + 18;
      }
      var padTop = 12;
      var xBand = 26;                       // 가로축 라벨이 들어가는 띠
      var totalH = plotH + xBand;
      var innerW = Math.max(40, width - padLeft - padRight);
      var innerH = plotH - padTop;
      var n = opt.x.length;

      function yOf(v) {
        return padTop + innerH - ((v - scale.min) / (scale.max - scale.min)) * innerH;
      }
      var xAt = opt.type === 'bar'
        ? function (i) { return padLeft + (innerW / n) * (i + 0.5); }
        : (n === 1
            ? function () { return padLeft + innerW / 2; }
            : function (i) { return padLeft + (innerW / (n - 1)) * i; });

      var svgEl = svg('svg', {
        class: 'chart__svg',
        width: width, height: totalH,
        viewBox: '0 0 ' + width + ' ' + totalH,
        role: 'img',
        'aria-label': (opt.title || '차트') + '. 값은 표로 보기 버튼으로 확인할 수 있습니다.',
      });

      // 눈금선. 실선 헤어라인, 배경에서 한 단계만 떨어진 색.
      ticks.forEach(function (t, i) {
        var y = yOf(t);
        svgEl.appendChild(svg('line', {
          x1: padLeft, x2: padLeft + innerW, y1: y, y2: y,
          stroke: t === 0 && scale.min < 0 ? 'var(--viz-axis)' : 'var(--viz-grid)',
          'stroke-width': 1, 'shape-rendering': 'crispEdges',
        }));
        svgEl.appendChild(svg('text', {
          x: padLeft - 8, y: y + 4, 'text-anchor': 'end', class: 'chart__tick',
        }, tickLabels[i]));
      });
      svgEl.appendChild(svg('line', {
        x1: padLeft, x2: padLeft + innerW, y1: yOf(scale.min), y2: yOf(scale.min),
        stroke: 'var(--viz-axis)', 'stroke-width': 1, 'shape-rendering': 'crispEdges',
      }));

      // 가로축 라벨. 자리가 모자라면 건너뜁니다.
      var labelEvery = 1;
      var maxLabelW = Math.max.apply(null, opt.x.map(function (s) { return textWidth(String(s), 11); }));
      var slot = innerW / Math.max(n, 1);
      while (maxLabelW + 8 > slot * labelEvery && labelEvery < n) labelEvery += 1;
      opt.x.forEach(function (labelText, i) {
        if (i % labelEvery !== 0 && i !== n - 1) return;
        svgEl.appendChild(svg('text', {
          x: xAt(i), y: plotH + 17, 'text-anchor': 'middle', class: 'chart__tick',
        }, String(labelText)));
      });

      // 기준선은 마크 아래, 강조 점은 마크 위에 옵니다.
      var crosshair = svg('g', { class: 'chart__crosshair' });
      svgEl.appendChild(crosshair);

      var barPaths = [];
      if (opt.type === 'bar') {
        barPaths = drawBars(svgEl, xAt, yOf, scale, innerW, n);
      } else {
        drawLines(svgEl, xAt, yOf);
      }

      var markers = svg('g', { class: 'chart__markers' });
      svgEl.appendChild(markers);

      // 마우스와 키보드 모두에서 같은 값을 읽을 수 있게 합니다.
      var hit = svg('rect', {
        x: padLeft - 4, y: 0, width: innerW + 8, height: plotH,
        fill: 'transparent', tabindex: '0', role: 'application',
        'aria-label': (opt.title || '차트') + ' 값 읽기. 좌우 방향키를 쓰세요.',
      });
      svgEl.appendChild(hit);

      geo = { xAt: xAt, yOf: yOf, padTop: padTop, innerH: innerH, innerW: innerW,
              padLeft: padLeft, n: n, crosshair: crosshair, markers: markers,
              barPaths: barPaths, svgEl: svgEl, hit: hit };

      function indexFromClientX(clientX) {
        var rect = svgEl.getBoundingClientRect();
        // viewBox 와 실제 픽셀 폭이 다를 수 있어 비율로 환산합니다.
        var ratio = width / rect.width;
        var px = (clientX - rect.left) * ratio - padLeft;
        if (opt.type === 'bar') return Math.max(0, Math.min(n - 1, Math.floor(px / (innerW / n))));
        if (n === 1) return 0;
        return Math.max(0, Math.min(n - 1, Math.round(px / (innerW / (n - 1)))));
      }

      hit.addEventListener('pointermove', function (e) {
        setActive(indexFromClientX(e.clientX), e.clientX);
      });
      hit.addEventListener('pointerleave', function () { setActive(-1); });
      hit.addEventListener('blur', function () { setActive(-1); });
      hit.addEventListener('focus', function () {
        var idx = activeIndex < 0 ? 0 : activeIndex;
        var rect = svgEl.getBoundingClientRect();
        setActive(idx, rect.left + xAt(idx) * (rect.width / width));
      });
      hit.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        e.preventDefault();
        var idx = Math.max(0, Math.min(n - 1,
          (activeIndex < 0 ? 0 : activeIndex) + (e.key === 'ArrowRight' ? 1 : -1)));
        var rect = svgEl.getBoundingClientRect();
        setActive(idx, rect.left + xAt(idx) * (rect.width / width));
      });

      elPlot.appendChild(svgEl);
      if (activeIndex >= 0) setActive(Math.min(activeIndex, n - 1));
    }

    function drawLines(svgEl, xAt, yOf) {
      opt.series.forEach(function (s, si) {
        var color = seriesVar(si);
        var d = '';
        var lastPoint = null;
        s.values.forEach(function (v, i) {
          if (typeof v !== 'number' || isNaN(v)) return;
          var x = xAt(i), y = yOf(v);
          d += (d ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
          lastPoint = { x: x, y: y, v: v };
        });
        if (!d) return;
        svgEl.appendChild(svg('path', {
          d: d, fill: 'none', stroke: color, 'stroke-width': 2,
          'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        }));
        if (lastPoint) {
          // 배경색 링 2px 를 둘러 선끼리 겹쳐도 끝점이 구분됩니다.
          svgEl.appendChild(svg('circle', {
            cx: lastPoint.x, cy: lastPoint.y, r: 4,
            fill: color, stroke: 'var(--c-bg-raised)', 'stroke-width': 2,
          }));
          // 직접 라벨. 라이트 모드에서 대비가 낮은 계열 색을 보완하는 장치라 지우지 마세요.
          svgEl.appendChild(svg('text', {
            x: lastPoint.x + 9, y: lastPoint.y + 4, class: 'chart__endlabel',
          }, formatValue(lastPoint.v, opt.format)));
        }
      });
    }

    function drawBars(svgEl, xAt, yOf, scale, innerW, n) {
      var groups = opt.series.length;
      var slot = innerW / n;
      var gap = 2;                                  // 붙은 막대 사이는 배경색 2px 로 띄웁니다
      var barW = Math.max(3, Math.min(24, (slot * 0.72 - gap * (groups - 1)) / groups));
      var groupW = barW * groups + gap * (groups - 1);
      var base = yOf(Math.max(scale.min, 0));
      var paths = [];

      opt.series.forEach(function (s, si) {
        var color = seriesVar(si);
        var row = [];
        s.values.forEach(function (v, i) {
          if (typeof v !== 'number' || isNaN(v)) { row.push(null); return; }
          var x = xAt(i) - groupW / 2 + si * (barW + gap);
          var y = yOf(v);
          var top = Math.min(y, base);
          var hgt = Math.abs(base - y);
          if (hgt < 0.5) { row.push(null); return; }
          var r = Math.min(4, barW / 2, hgt);
          // 데이터 끝만 둥글고 바닥은 각집니다.
          var d = v >= 0
            ? 'M' + x + ' ' + (top + hgt) + ' L' + x + ' ' + (top + r) +
              ' Q' + x + ' ' + top + ' ' + (x + r) + ' ' + top +
              ' L' + (x + barW - r) + ' ' + top +
              ' Q' + (x + barW) + ' ' + top + ' ' + (x + barW) + ' ' + (top + r) +
              ' L' + (x + barW) + ' ' + (top + hgt) + ' Z'
            : 'M' + x + ' ' + top + ' L' + x + ' ' + (top + hgt - r) +
              ' Q' + x + ' ' + (top + hgt) + ' ' + (x + r) + ' ' + (top + hgt) +
              ' L' + (x + barW - r) + ' ' + (top + hgt) +
              ' Q' + (x + barW) + ' ' + (top + hgt) + ' ' + (x + barW) + ' ' + (top + hgt - r) +
              ' L' + (x + barW) + ' ' + top + ' Z';
          var el = svg('path', { d: d, fill: color });
          svgEl.appendChild(el);
          row.push(el);
        });
        paths.push(row);
      });

      // 계열이 하나일 때만 값을 막대 위에 붙입니다. 여러 계열이면 글자가 엉킵니다.
      if (groups === 1 && slot > 34) {
        opt.series[0].values.forEach(function (v, i) {
          if (typeof v !== 'number' || isNaN(v)) return;
          var text = formatValue(v, opt.format);
          if (textWidth(text, 11) > slot - 6) return;
          svgEl.appendChild(svg('text', {
            x: xAt(i), y: Math.min(yOf(v), base) - 6, 'text-anchor': 'middle',
            class: 'chart__endlabel',
          }, text));
        });
      }
      return paths;
    }

    var resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(render, 120);
    }
    window.addEventListener('resize', onResize);

    render();

    return {
      render: render,
      setData: function (x, series) {
        opt.x = x;
        opt.series = series;
        activeIndex = -1;
        render();
      },
      destroy: function () {
        window.removeEventListener('resize', onResize);
        clear(mount);
      },
    };
  }

  App.createChart = createChart;
  App.formatValue = formatValue;
  App.seriesVar = seriesVar;
})(window);
