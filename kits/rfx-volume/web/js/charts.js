// SVG 차트. 외부 라이브러리 없이 막대, 꺾은선, 기간 막대만 그립니다.
// 색은 tokens.css 의 --viz-* 변수를 순서대로 씁니다. 순서를 바꾸지 마세요.

const NS = 'http://www.w3.org/2000/svg';
export const SERIES = ['var(--viz-1)', 'var(--viz-2)', 'var(--viz-3)', 'var(--viz-4)', 'var(--viz-5)', 'var(--viz-6)', 'var(--viz-7)', 'var(--viz-8)'];
export const RISK = 'var(--viz-critical)';
export const OPP = 'var(--viz-1)';
export const MUTED = 'var(--c-fg-subtle)';

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    if (k === 'style') n.setAttribute('style', v);
    else if (k === 'text') n.textContent = v;
    else n.setAttribute(k, v);
  }
  if (parent) parent.appendChild(n);
  return n;
}

function niceStep(range, count) {
  const raw = range / Math.max(1, count);
  const mag = Math.pow(10, Math.floor(Math.log10(raw || 1)));
  const n = raw / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

function scaleDomain(min, max, ticks = 5) {
  if (min === max) { max = min + 1; }
  const step = niceStep(max - min, ticks);
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const out = [];
  for (let v = lo; v <= hi + step / 2; v += step) out.push(Math.round(v / step) * step);
  return { lo, hi, ticks: out };
}

// ---------------------------------------------------------------- 툴팁

const tip = () => document.getElementById('tooltip');

export function showTip(evt, title, rows) {
  const t = tip();
  t.innerHTML = '';
  const h = document.createElement('div');
  h.className = 'tt-title';
  h.textContent = title;
  t.appendChild(h);
  for (const r of rows) {
    const d = document.createElement('div');
    d.className = 'tt-row';
    const sw = document.createElement('i');
    if (r.color) sw.style.background = r.color; else sw.style.visibility = 'hidden';
    const a = document.createElement('span');
    a.textContent = r.name;
    const b = document.createElement('span');
    b.textContent = r.value;
    d.append(sw, a, b);
    t.appendChild(d);
  }
  t.hidden = false;
  const pad = 14;
  const w = t.offsetWidth, hh = t.offsetHeight;
  let x = evt.clientX + pad, y = evt.clientY + pad;
  if (x + w > window.innerWidth - 8) x = evt.clientX - w - pad;
  if (y + hh > window.innerHeight - 8) y = evt.clientY - hh - pad;
  t.style.left = x + 'px';
  t.style.top = y + 'px';
}
export function hideTip() { tip().hidden = true; }

export function legend(items) {
  const box = document.createElement('div');
  box.className = 'legend';
  for (const it of items) {
    const s = document.createElement('span');
    const i = document.createElement('i');
    i.style.background = it.color;
    if (it.line) i.className = 'line';
    s.append(i, document.createTextNode(it.name));
    box.appendChild(s);
  }
  return box;
}

// ---------------------------------------------------------------- 축 공통

function frame(container, { width, height = 260, left = 56, right = 16, top = 12, bottom = 28 } = {}) {
  // 실제 폭으로 그려야 글자 크기가 늘어나지 않습니다
  width = width || Math.max(320, Math.round(container.clientWidth - 32) || 640);
  const svg = el('svg', { class: 'chart', viewBox: `0 0 ${width} ${height}`, role: 'img' });
  container.appendChild(svg);
  return { svg, width, height, x0: left, x1: width - right, y0: top, y1: height - bottom };
}

function yAxis(f, dom, fmt) {
  const g = el('g', { class: 'grid' }, f.svg);
  const y = v => f.y1 - (v - dom.lo) / (dom.hi - dom.lo) * (f.y1 - f.y0);
  for (const t of dom.ticks) {
    el('line', { x1: f.x0, x2: f.x1, y1: y(t), y2: y(t) }, g);
    el('text', { x: f.x0 - 8, y: y(t) + 4, 'text-anchor': 'end', text: fmt(t) }, f.svg);
  }
  if (dom.lo < 0 && dom.hi > 0) el('line', { class: 'zero', x1: f.x0, x2: f.x1, y1: y(0), y2: y(0) }, f.svg);
  return y;
}

function xBands(f, cats) {
  const bw = (f.x1 - f.x0) / cats.length;
  cats.forEach((c, i) => el('text', { x: f.x0 + bw * (i + .5), y: f.y1 + 18, 'text-anchor': 'middle', text: String(c) }, f.svg));
  el('line', { class: 'zero', x1: f.x0, x2: f.x1, y1: f.y1, y2: f.y1 }, f.svg);
  return { bw, cx: i => f.x0 + bw * (i + .5) };
}

// 아래쪽이 기준선인 막대. 끝만 둥글게 (4px).
function barPath(x, w, yBase, yTop) {
  const h = yBase - yTop;
  const up = h >= 0;
  const r = Math.min(4, Math.abs(h), w / 2);
  if (Math.abs(h) < .5) return `M${x},${yBase}h${w}`;
  if (up) return `M${x},${yBase}V${yTop + r}q0,-${r} ${r},-${r}h${w - 2 * r}q${r},0 ${r},${r}V${yBase}Z`;
  return `M${x},${yBase}V${yTop - r}q0,${r} ${r},${r}h${w - 2 * r}q${r},0 ${r},-${r}V${yBase}Z`;
}

function hitAreas(f, cats, bands, onTip) {
  cats.forEach((c, i) => {
    const r = el('rect', { class: 'hit', x: f.x0 + bands.bw * i, y: f.y0, width: bands.bw, height: f.y1 - f.y0 }, f.svg);
    r.addEventListener('mousemove', e => onTip(e, i));
    r.addEventListener('mouseleave', hideTip);
  });
}

// ---------------------------------------------------------------- 막대

/**
 * series: [{name, color, values:[숫자|null]}]
 * mode: 'group' 나란히, 'stack' 쌓기, 'stack100' 100% 쌓기
 * line: {name, color, values} 같은 단위의 꺾은선 겹치기 (선택)
 * colorOf: (값, 계열 번호) => 색. 양수/음수 색을 다르게 할 때.
 * labels: 막대 위에 숫자를 붙일 인덱스 목록 (선택)
 */
export function barChart(container, { categories, series, mode = 'group', fmt, tipFmt, line, colorOf, labels, height, tipExtra }) {
  const f = frame(container, { height });
  tipFmt = tipFmt || fmt;
  let lo = 0, hi = 0;
  const n = categories.length;
  const totals = categories.map((_, i) => series.reduce((s, se) => s + Math.max(0, se.values[i] || 0), 0));
  if (mode === 'stack100') { lo = 0; hi = 1; }
  else if (mode === 'stack') { hi = Math.max(...totals, 0); }
  else for (const se of series) for (const v of se.values) { if (v == null) continue; hi = Math.max(hi, v); lo = Math.min(lo, v); }
  if (line) for (const v of line.values) if (v != null) { hi = Math.max(hi, v); lo = Math.min(lo, v); }
  if (hi === 0 && lo === 0) hi = 1;
  const dom = scaleDomain(lo, hi);
  const y = yAxis(f, dom, mode === 'stack100' ? v => Math.round(v * 100) + '%' : fmt);
  const bands = xBands(f, categories);
  const gap = 2;
  const inner = bands.bw * .72;
  for (let i = 0; i < n; i++) {
    const left = f.x0 + bands.bw * i + (bands.bw - inner) / 2;
    if (mode === 'group') {
      const w = (inner - gap * (series.length - 1)) / series.length;
      series.forEach((se, k) => {
        const v = se.values[i];
        if (v == null) return;
        const x = left + k * (w + gap);
        el('path', { d: barPath(x, w, y(0), y(v)), style: `fill:${colorOf ? colorOf(v, k) : se.color}` }, f.svg);
        if (labels && labels.includes(i) && series.length === 1) {
          el('text', { class: 'label', x: x + w / 2, y: v >= 0 ? y(v) - 5 : y(v) + 14, 'text-anchor': 'middle', text: fmt(v) }, f.svg);
        }
      });
    } else {
      let acc = 0;
      const tot = mode === 'stack100' ? totals[i] || 1 : 1;
      series.forEach((se, k) => {
        const v = Math.max(0, se.values[i] || 0) / tot;
        if (!v) return;
        const yb = y(acc), yt = y(acc + v);
        const last = series.slice(k + 1).every(s => !(s.values[i] > 0));
        const h = yb - yt - (last ? 0 : gap);
        if (h > 0) {
          const d = last ? barPath(left, inner, yb, yb - h) : `M${left},${yb}h${inner}v${-h}h${-inner}Z`;
          el('path', { d, style: `fill:${se.color}` }, f.svg);
        }
        acc += v;
      });
    }
  }
  if (line) {
    const pts = line.values.map((v, i) => v == null ? null : [bands.cx(i), y(v)]);
    let d = '';
    pts.forEach((p, i) => { if (!p) return; d += (d && pts[i - 1] ? 'L' : 'M') + p[0] + ',' + p[1]; });
    el('path', { d, style: `fill:none;stroke:${line.color};stroke-width:2` }, f.svg);
    pts.forEach(p => p && el('circle', { cx: p[0], cy: p[1], r: 4, style: `fill:${line.color};stroke:var(--c-bg);stroke-width:2` }, f.svg));
  }
  hitAreas(f, categories, bands, (e, i) => {
    const rows = series.map(se => ({ name: se.name, color: se.color, value: se.values[i] == null ? '-' : tipFmt(se.values[i]) }));
    if (mode === 'stack100') {
      rows.forEach((r, k) => { const v = series[k].values[i] || 0; r.value = totals[i] ? Math.round(v / totals[i] * 1000) / 10 + '%' : '-'; });
    }
    if (line) rows.push({ name: line.name, color: line.color, value: line.values[i] == null ? '-' : tipFmt(line.values[i]) });
    if (tipExtra) rows.push(...tipExtra(i));
    showTip(e, String(categories[i]), rows.filter(r => r.value !== '-' || series.length < 4));
  });
  return f.svg;
}

// ---------------------------------------------------------------- 꺾은선

/** refs: [{value, label}] 가로 기준선 */
export function lineChart(container, { categories, series, fmt, tipFmt, refs = [], height, minZero = true }) {
  const f = frame(container, { height });
  tipFmt = tipFmt || fmt;
  let lo = minZero ? 0 : Infinity, hi = -Infinity;
  for (const se of series) for (const v of se.values) if (v != null) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
  for (const r of refs) { lo = Math.min(lo, r.value); hi = Math.max(hi, r.value); }
  if (!isFinite(hi)) { lo = 0; hi = 1; }
  const dom = scaleDomain(lo, hi);
  const y = yAxis(f, dom, fmt);
  const bands = xBands(f, categories);
  for (const r of refs) {
    el('line', { x1: f.x0, x2: f.x1, y1: y(r.value), y2: y(r.value), style: 'stroke:var(--c-fg-muted);stroke-width:1;stroke-dasharray:4 3' }, f.svg);
    el('text', { x: f.x1, y: y(r.value) - 5, 'text-anchor': 'end', text: r.label }, f.svg);
  }
  for (const se of series) {
    const pts = se.values.map((v, i) => v == null ? null : [bands.cx(i), y(v)]);
    let d = '';
    pts.forEach((p, i) => { if (!p) return; d += (d && pts[i - 1] ? 'L' : 'M') + p[0] + ',' + p[1]; });
    el('path', { d, style: `fill:none;stroke:${se.color};stroke-width:2` }, f.svg);
    pts.forEach((p, i) => p && el('circle', { cx: p[0], cy: p[1], r: 4, style: `fill:${se.pointColor ? se.pointColor(se.values[i]) : se.color};stroke:var(--c-bg);stroke-width:2` }, f.svg));
    // 마지막 점에 값 표시
    const lastIdx = pts.map((p, i) => p ? i : -1).filter(i => i >= 0).pop();
    if (lastIdx != null && se.labelLast) {
      el('text', { class: 'label', x: pts[lastIdx][0], y: pts[lastIdx][1] - 9, 'text-anchor': 'middle', text: fmt(se.values[lastIdx]) }, f.svg);
    }
  }
  hitAreas(f, categories, bands, (e, i) => {
    showTip(e, String(categories[i]), series.map(se => ({ name: se.name, color: se.color, value: se.values[i] == null ? '-' : tipFmt(se.values[i]) })));
  });
  return f.svg;
}

// ---------------------------------------------------------------- 기간 막대 (차종 수명)

/** items: [{label, start:[연,월], end:[연,월]}], years: 보이는 연도 범위, demand: 고객 물동이 있는 연도 */
export function lifecycle(container, { items, years, demand = [] }) {
  const rowH = 26;
  const height = 30 + items.length * rowH + 10;
  const f = frame(container, { height, left: 190, top: 4, bottom: 26 });
  const y0 = years[0], y1 = years[years.length - 1] + 1;
  const x = t => f.x0 + (t - y0) / (y1 - y0) * (f.x1 - f.x0);
  const bw = (f.x1 - f.x0) / (y1 - y0);
  years.forEach(yr => {
    if (demand.includes(yr)) el('rect', { x: x(yr), y: f.y0, width: bw, height: f.y1 - f.y0, style: 'fill:var(--c-accent-bg)' }, f.svg);
    el('line', { x1: x(yr), x2: x(yr), y1: f.y0, y2: f.y1, style: 'stroke:var(--viz-grid)' }, f.svg);
    el('text', { x: x(yr) + bw / 2, y: f.y1 + 18, 'text-anchor': 'middle', text: String(yr) }, f.svg);
  });
  items.forEach((it, i) => {
    const cy = f.y0 + 8 + i * rowH;
    el('text', { x: f.x0 - 10, y: cy + 12, 'text-anchor': 'end', class: 'label', text: it.label.length > 28 ? it.label.slice(0, 27) + '…' : it.label }, f.svg);
    const s = it.start ? it.start[0] + (it.start[1] - 1) / 12 : y0;
    const e = it.end ? it.end[0] + it.end[1] / 12 : y1;
    const xs = Math.max(f.x0, x(s)), xe = Math.min(f.x1, x(e));
    if (xe > xs) {
      el('rect', { x: xs, y: cy + 2, width: xe - xs, height: 14, rx: 4, style: 'fill:var(--viz-1)' }, f.svg);
    }
    const hit = el('rect', { class: 'hit', x: f.x0, y: cy, width: f.x1 - f.x0, height: rowH - 4 }, f.svg);
    const ym = v => v ? `${v[0]}.${String(v[1]).padStart(2, '0')}` : '정보 없음';
    hit.addEventListener('mousemove', ev => showTip(ev, it.label, [{ name: 'SOP', value: ym(it.start) }, { name: 'EOP', value: ym(it.end) }]));
    hit.addEventListener('mouseleave', hideTip);
  });
  return f.svg;
}
