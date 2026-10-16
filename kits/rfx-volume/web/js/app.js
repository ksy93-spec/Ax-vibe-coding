// 차량 물동 적정성 평가 화면. 계산은 서버(/api/calc)가 하고 여기서는 입력과 그리기만 합니다.
import * as C from './charts.js';

const $ = id => document.getElementById(id);
const STEPS = [
  { no: 1, title: '고객', icon: 'building-2' },
  { no: 2, title: '차종, SOP', icon: 'car' },
  { no: 3, title: '공급 지역', icon: 'globe-2' },
  { no: 4, title: '옵션율, 이원화', icon: 'sliders-horizontal' },
  { no: 5, title: '고객 물동', icon: 'table-2' },
  { no: 6, title: '결과', icon: 'gauge' },
];
const VERDICT = { risk: 'Risk', opportunity: 'Opportunity', ok: '적정' };
const VERDICT_ICON = { risk: 'trending-down', opportunity: 'trending-up', ok: 'circle-check' };
const ICONS = ['building-2', 'car', 'globe-2', 'sliders-horizontal', 'table-2', 'gauge', 'triangle-alert', 'trending-up', 'trending-down',
  'circle-check', 'download', 'save', 'printer', 'copy', 'folder-open', 'plus', 'moon', 'sun', 'search', 'layers', 'info', 'arrow-left',
  'arrow-right', 'file-spreadsheet', 'chart-column', 'factory', 'sparkles', 'calculator', 'x', 'check', 'rotate-ccw', 'clipboard-paste'];

const S = {
  meta: null,
  step: 1,
  customer: null,          // {type, name}
  vehicles: [],            // 서버에서 받은 차종 세대 목록
  selected: new Set(),     // 고른 세대 id
  sopYears: new Set(),
  regionMode: 'all',
  regions: new Set(),
  option: 100, dual: false, share: 50, ppv: 1,
  overrides: {},           // id -> {option, share, ppv}
  unit: 1,
  qty: {}, price: {},      // 연도 -> 입력 문자열
  expected: null,          // 5단계 미리 보기용 예상 물동
  result: null,
};

// ---------------------------------------------------------------- 아이콘 (lucide-static 원본 SVG 를 그대로 읽어 넣음)

const iconCache = {};
async function loadIcons() {
  await Promise.all(ICONS.map(async n => {
    try {
      const r = await fetch(`vendor/lucide/${n}.svg`);
      iconCache[n] = (await r.text()).replace(/<!--[\s\S]*?-->/, '');
    } catch (e) { iconCache[n] = ''; }
  }));
}
function paintIcons(root = document) {
  root.querySelectorAll('i[data-icon]').forEach(i => {
    const n = i.dataset.icon;
    if (i.dataset.painted === n) return;
    i.innerHTML = iconCache[n] || '';
    i.dataset.painted = n;
    i.setAttribute('aria-hidden', 'true');
  });
}
const icon = n => h('i', { 'data-icon': n });

// ---------------------------------------------------------------- 공통

async function api(path, body) {
  const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  const r = await fetch(path, opt);
  const ct = r.headers.get('Content-Type') || '';
  if (!r.ok) {
    const err = ct.includes('json') ? (await r.json()).error : r.statusText;
    throw new Error(err || ('오류 ' + r.status));
  }
  return ct.includes('json') ? r.json() : r.blob();
}

const nf0 = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const { fmtK, fmtKs, fmtAxis } = C;
const fmtM = v => nf2.format(v / 1e6);
const fmtPct = v => v == null ? '-' : nf0.format(v * 100) + '%';
const ym = v => v ? `${v[0]}.${String(v[1]).padStart(2, '0')}` : '?';

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

function h(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (k === 'text') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat()) if (c != null && c !== false) n.append(c.nodeType ? c : String(c));
  return n;
}

function parseNum(s) {
  if (s == null) return null;
  const t = String(s).replace(/[,\s$₩€]/g, '').trim();
  if (t === '' || t === '-') return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}

// 이름에서 고정 색을 고릅니다 (아바타용). 같은 이름은 늘 같은 색.
function avatarColor(name) {
  let x = 0;
  for (const ch of name) x = (x * 31 + ch.charCodeAt(0)) >>> 0;
  return `var(--viz-${(x % 7) + 1})`;
}
const initials = name => name.replace(/[^A-Za-z0-9가-힣 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?';

// ---------------------------------------------------------------- 단계 이동

function canEnter(no) {
  if (no >= 2 && !S.customer) return false;
  if (no >= 3 && S.selected.size === 0) return false;
  return true;
}

function goto(no) {
  if (!canEnter(no)) return;
  S.step = no;
  document.querySelectorAll('.step').forEach(sec => { sec.hidden = Number(sec.dataset.step) !== no; });
  if (no === 2) renderVehicles();
  if (no === 3) renderRegions();
  if (no === 4) renderFactors();
  if (no === 5) renderQtyTable(true);
  if (no === 6) runCalc();
  renderSteps();
  window.scrollTo({ top: 0 });
}

function stepSub(no) {
  switch (no) {
    case 1: return S.customer ? `${S.customer.name} · ${S.customer.type === 'group' ? '그룹' : '브랜드'}` : '';
    case 2: return S.selected.size ? `${S.selected.size}개 세대` : '';
    case 3: return S.regionMode === 'all' || !S.regions.size ? '전체 (글로벌)' : [...S.regions].join(', ');
    case 4: return `옵션 ${S.option}%` + (S.dual ? ` · 자사 ${S.share}%` : '') + ` · ${S.ppv}pcs/대`;
    case 5: { const n = Object.values(S.qty).filter(v => parseNum(v) != null).length; return n ? `${n}개 연도` : '입력 전'; }
    case 6: return S.result && S.result.verdict ? VERDICT[S.result.verdict] : '';
  }
  return '';
}

function renderSteps() {
  const ol = $('stepList');
  ol.innerHTML = '';
  let done = 0;
  for (const st of STEPS) {
    const isDone = st.no < S.step || (st.no !== S.step && stepSub(st.no) && canEnter(st.no) && st.no < 6);
    if (isDone || st.no === S.step) done++;
    ol.append(h('li', { class: (st.no === S.step ? 'active ' : '') + (isDone ? 'done' : '') },
      h('button', { type: 'button', disabled: !canEnter(st.no), onclick: () => goto(st.no) },
        h('span', { class: 'no' }, isDone && st.no !== S.step ? icon('check') : icon(st.icon)),
        h('span', { class: 't', text: st.title }),
        h('span', { class: 'sub', text: stepSub(st.no) || ' ' }))));
  }
  $('progressBar').style.width = `${Math.round((S.step - 1) / (STEPS.length - 1) * 100)}%`;
  $('btnPrev').disabled = S.step === 1;
  const next = $('btnNext');
  next.hidden = S.step === 6;
  next.innerHTML = '';
  next.append(S.step === 5 ? icon('calculator') : '', S.step === 5 ? '계산하기' : '다음', S.step === 5 ? '' : icon('arrow-right'));
  next.disabled = !canEnter(S.step + 1);
  $('navHint').textContent = S.step === 1 && !S.customer ? '고객을 먼저 골라 주세요.'
    : S.step === 2 && !S.selected.size ? '차종을 하나 이상 골라 주세요.'
      : S.step === 5 && !Object.values(S.qty).some(v => parseNum(v) != null) ? '고객 물동이 없으면 조사기관 기준 예상 물동만 보여 줍니다.' : '';
  if (S.meta) $('stepSummary').textContent = `${S.meta.file} · 기준 ${S.meta.vintage} · ${nf0.format(S.meta.rows)}행 · v${S.meta.version}`;
  paintIcons();
}

// ---------------------------------------------------------------- 1. 고객

let custTimer = null;
function onCustomerInput() {
  clearTimeout(custTimer);
  custTimer = setTimeout(async () => {
    const q = $('customerInput').value.trim();
    const box = $('customerCandidates');
    if (!q) { box.innerHTML = ''; return; }
    try {
      const { candidates } = await api('/api/customers?q=' + encodeURIComponent(q));
      box.innerHTML = '';
      if (!candidates.length) {
        box.append(h('div', { class: 'alert info' }, icon('info'),
          h('span', { text: `'${q}' 에 맞는 고객이 없습니다. 아래 목록에서 고르거나, 자주 쓰는 이름이면 config/aliases.csv 에 별칭을 추가하세요.` })));
      }
      for (const c of candidates) box.append(candButton(c));
      paintIcons(box);
    } catch (e) { showDataError(e); }
  }, 160);
}

function candButton(c) {
  const sel = S.customer && S.customer.type === c.type && S.customer.name === c.name;
  return h('button', { type: 'button', class: 'cand' + (sel ? ' selected' : ''), onclick: () => pickCustomer(c) },
    h('span', { class: 'avatar', style: `background:${avatarColor(c.name)}`, text: initials(c.name) }),
    h('span', { class: 'name' }, c.name, h('span', { class: 'tag ' + (c.type === 'group' ? '' : 'accent'), text: c.type === 'group' ? 'Strategic Group' : 'Production Brand' })),
    h('span', { class: 'meta' },
      c.type === 'brand' && c.group ? h('span', { text: c.group }) : null,
      c.type === 'group' ? h('span', { text: c.brands.join(', ') }) : null,
      h('span', { text: `· 차종 세대 ${c.count}개` }),
      c.why ? h('span', { class: 'tag', text: c.why }) : null));
}

async function pickCustomer(c, keepSelection = false) {
  const changed = !S.customer || S.customer.type !== c.type || S.customer.name !== c.name;
  S.customer = { type: c.type, name: c.name };
  if (changed && !keepSelection) { S.selected.clear(); S.sopYears.clear(); S.overrides = {}; S.regions.clear(); S.regionMode = 'all'; }
  try {
    const { vehicles } = await api(`/api/vehicles?type=${c.type}&name=${encodeURIComponent(c.name)}`);
    S.vehicles = vehicles;
  } catch (e) { showDataError(e); return; }
  if (!keepSelection) goto(2); else renderSteps();
}

function renderBrowse() {
  const box = $('brandBrowse');
  box.innerHTML = '';
  const row = (title, names, type) => h('div', { class: 'browse-group' }, h('h3', { text: title }),
    h('div', { class: 'chips' }, names.map(name => h('button', { type: 'button', class: 'chip', text: name, onclick: () => pickCustomer({ type, name }) }))));
  box.append(row('Production Brand', S.meta.brands, 'brand'), row('Strategic Group', S.meta.groups, 'group'));
}

// ---------------------------------------------------------------- 2. 차종, SOP

function sopWindow() {
  const set = new Set();
  const pm = $('sopPlusMinus').checked;
  for (const y of S.sopYears) { set.add(y); if (pm) { set.add(y - 1); set.add(y + 1); } }
  return set;
}

function visibleVehicles() {
  const q = $('vehSearch').value.trim().toLowerCase();
  const win = sopWindow();
  const only = $('onlySelected').checked;
  return S.vehicles.filter(v => {
    if (only && !S.selected.has(v.id)) return false;
    if (win.size && !win.has(v.sop_year)) return false;
    if (q) {
      const hay = [v.label, v.nameplate, v.brand, ...v.platforms, ...v.programs].join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function renderVehicles() {
  const years = [...new Set(S.vehicles.map(v => v.sop_year).filter(Boolean))].sort();
  const win = sopWindow();
  const sc = $('sopChips');
  sc.innerHTML = '';
  for (const y of years) {
    const on = S.sopYears.has(y);
    sc.append(h('button', {
      type: 'button', class: 'chip' + (on ? ' on' : win.has(y) ? ' near' : ''), text: y, 'aria-pressed': on ? 'true' : 'false',
      onclick: () => { on ? S.sopYears.delete(y) : S.sopYears.add(y); renderVehicles(); },
    }));
  }
  if (S.sopYears.size) sc.append(h('button', { type: 'button', class: 'chip', onclick: () => { S.sopYears.clear(); renderVehicles(); } }, icon('x'), ' 해제'));

  const vis = visibleVehicles();
  const plat = {};
  for (const v of vis) for (const p of v.platforms) (plat[p] = plat[p] || []).push(v.id);
  const pc = $('platformChips');
  pc.innerHTML = '';
  for (const [p, ids] of Object.entries(plat).sort()) {
    const all = ids.every(id => S.selected.has(id));
    pc.append(h('button', {
      type: 'button', class: 'chip' + (all ? ' on' : ''), text: `${p} · ${ids.length}`,
      onclick: () => { ids.forEach(id => all ? S.selected.delete(id) : S.selected.add(id)); renderVehicles(); },
    }));
  }
  if (!Object.keys(plat).length) pc.append(h('span', { class: 'muted small', text: '플랫폼 정보 없음' }));

  const by = new Map();
  for (const v of vis) {
    const key = v.brand + '|' + v.nameplate;
    if (!by.has(key)) by.set(key, []);
    by.get(key).push(v);
  }
  const cards = [...by.values()].sort((a, b) => b.reduce((s, v) => s + v.total, 0) - a.reduce((s, v) => s + v.total, 0));
  const box = $('vehicleCards');
  box.innerHTML = '';
  if (!cards.length) box.append(h('div', { class: 'empty', text: '조건에 맞는 차종이 없습니다. SOP 연도나 검색어를 바꿔 보세요.' }));
  const yrs = S.meta.years;
  for (const gens of cards) {
    const v0 = gens[0];
    const anySel = gens.some(g => S.selected.has(g.id));
    box.append(h('div', { class: 'card' + (anySel ? ' has-sel' : '') },
      h('div', { class: 'card-head' },
        h('span', { class: 'ic' }, icon('car')),
        h('span', { class: 'name', text: v0.nameplate }),
        h('span', { class: 'brand', text: v0.brand }),
        ...[...new Set(gens.flatMap(g => g.platforms))].map(p => h('span', { class: 'tag', text: p }))),
      h('div', { class: 'gens' }, gens.sort((a, b) => (a.sop_year || 0) - (b.sop_year || 0)).map(g => {
        const on = S.selected.has(g.id);
        const regs = Object.entries(g.by_region).filter(([, x]) => x > 0).sort((a, b) => b[1] - a[1]).map(([r]) => r).slice(0, 3).join(' · ');
        return h('button', {
          type: 'button', class: 'gen' + (on ? ' on' : '') + (g.total === 0 ? ' dim' : ''), 'aria-pressed': on ? 'true' : 'false',
          title: g.plants.join('\n'),
          onclick: () => { on ? S.selected.delete(g.id) : S.selected.add(g.id); renderVehicles(); },
        },
        h('span', {}, h('div', { class: 'gen-main' }, on ? icon('check') : null, `SOP ${ym(g.sop)}`), h('div', { class: 'gen-sub', text: `EOP ${ym(g.eop)}${regs ? ' · ' + regs : ''}` })),
        h('span', { html: C.sparkline(yrs.map(y => g.by_year[y] || 0)) }),
        h('span', { class: 'gen-vol' }, h('div', { text: fmtAxis(g.total) + '대' }), h('div', { class: 'gen-sub', text: `${yrs[0]}~${String(yrs[yrs.length - 1]).slice(2)}` })));
      }))));
  }
  const hidden = [...S.selected].filter(id => !vis.some(v => v.id === id)).length;
  $('vehCount').textContent = S.selected.size ? `${S.selected.size}개 선택` + (hidden ? ` · ${hidden}개는 필터로 가려짐` : '') : '';
  renderSteps();
}

// ---------------------------------------------------------------- 3. 공급 지역

function selectedVehicles() { return S.vehicles.filter(v => S.selected.has(v.id)); }

function regionTotals() {
  const tot = {};
  for (const v of selectedVehicles()) for (const [r, val] of Object.entries(v.by_region)) tot[r] = (tot[r] || 0) + val;
  const order = S.meta.regions;
  return Object.keys(tot).sort((a, b) => order.indexOf(a) - order.indexOf(b)).map(r => ({ name: r, value: tot[r] }));
}

function renderRegions() {
  document.querySelectorAll('input[name=regionMode]').forEach(r => { r.checked = r.value === S.regionMode; });
  const regs = regionTotals();
  const sum = regs.reduce((a, b) => a + b.value, 0) || 1;
  const box = $('regionList');
  box.innerHTML = '';
  const some = S.regionMode === 'some';
  regs.forEach((r, i) => {
    const on = !some || S.regions.has(r.name);
    const cb = h('input', { type: 'checkbox', checked: on, disabled: !some, 'aria-label': r.name });
    cb.addEventListener('change', () => { cb.checked ? S.regions.add(r.name) : S.regions.delete(r.name); renderRegions(); });
    box.append(h('label', { class: 'region-row' + (on ? '' : ' off') }, cb,
      h('strong', { text: r.name }),
      h('div', { class: 'bar-track' }, h('div', { class: 'bar-fill', style: `width:${(r.value / sum * 100).toFixed(1)}%;background:var(--viz-${i + 1})` })),
      h('span', { class: 'num-cell', text: `${nf1.format(r.value / sum * 100)}% · ${fmtAxis(r.value)}대` })));
  });
  if (some && !S.regions.size) box.append(h('div', { class: 'alert warning' }, icon('triangle-alert'), h('span', { text: '지역을 하나 이상 고르세요. 고르지 않으면 전체로 계산합니다.' })));
  const picked = some && S.regions.size ? regs.filter(r => S.regions.has(r.name)).reduce((s, r) => s + r.value, 0) : sum;
  C.donut($('regionDonut'), {
    items: regs.map((r, i) => ({ name: r.name, value: r.value, color: C.theme().series[i], dim: some && !S.regions.has(r.name) })),
    center: [some && S.regions.size ? nf0.format(picked / sum * 100) + '%' : fmtAxis(sum), some && S.regions.size ? '공급 대상 비중' : `${S.meta.years[0]}~${S.meta.years[S.meta.years.length - 1]} 생산`],
  });
  paintIcons(box);
  renderSteps();
}

// ---------------------------------------------------------------- 4. 옵션율, 이원화, 대당 사용량

function bindPair(rangeId, numId, key) {
  const r = $(rangeId), n = $(numId);
  const set = v => {
    const x = Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
    S[key] = x; r.value = x; n.value = x; renderFactorText();
  };
  r.addEventListener('input', () => set(r.value));
  n.addEventListener('change', () => set(n.value));
}

function setPpv(v) {
  S.ppv = v == null || !(v >= 0) ? 1 : Math.round(v * 100) / 100;
  $('ppvNum').value = S.ppv;
  renderFactorText();
}

function renderFactors() {
  $('optRange').value = S.option; $('optNum').value = S.option;
  $('shareRange').value = S.share; $('shareNum').value = S.share;
  $('dualOn').checked = S.dual;
  $('ppvNum').value = S.ppv;
  $('shareBox').classList.toggle('off', !S.dual);
  renderFactorText();
  const t = $('overrideTable');
  t.innerHTML = '';
  t.append(h('tr', {}, h('th', { text: '차종' }), h('th', { text: 'SOP' }), h('th', { class: 'n', text: '옵션율 %' }),
    h('th', { class: 'n', text: '자사 비중 %' }), h('th', { class: 'n', text: '대당 사용량' })));
  for (const v of selectedVehicles()) {
    const o = S.overrides[v.id] || {};
    const inp = (k, ph, dis) => {
      const i = h('input', { type: 'number', class: 'input num', min: 0, max: k === 'ppv' ? null : 100, step: 'any', placeholder: ph, value: o[k] ?? '', disabled: dis });
      i.addEventListener('change', () => {
        const x = parseNum(i.value);
        S.overrides[v.id] = S.overrides[v.id] || {};
        if (x == null) delete S.overrides[v.id][k]; else S.overrides[v.id][k] = x;
        renderSteps();
      });
      return h('td', { class: 'n' }, i);
    };
    t.append(h('tr', {}, h('td', { text: v.label }), h('td', { text: ym(v.sop) }),
      inp('option', S.option), inp('share', S.dual ? S.share : '이원화 꺼짐', !S.dual), inp('ppv', S.ppv)));
  }
  if (Object.values(S.overrides).some(o => Object.keys(o).length)) $('overrideBox').open = true;
}

function renderFactorText() {
  const f = S.option / 100 * (S.dual ? S.share / 100 : 1) * S.ppv;
  const box = $('factorText');
  box.innerHTML = '';
  box.append(h('strong', { text: `${nf0.format(f * 1000)} pcs` }),
    `차량 1대당 ${nf2.format(f)} pcs 를 가져오는 프로젝트입니다.`,
    S.dual || S.option < 100 ? h('br') : '',
    S.dual || S.option < 100 ? `차량 대수의 ${nf1.format(S.option * (S.dual ? S.share / 100 : 1))}% 에 해당합니다.` : '');
  if (S.step === 4) C.factorFunnel($('factorChart'), { option: S.option, share: S.share, dual: S.dual, ppv: S.ppv });
  renderSteps();
}

// ---------------------------------------------------------------- 5. 고객 물동

async function renderQtyTable(refreshExpected) {
  const years = S.meta.years;
  const t = $('qtyTable');
  t.innerHTML = '';
  t.append(h('tr', {}, h('th', { text: '연도' }), years.map(y => h('th', { class: 'n', text: y })), h('th', { class: 'n', text: '합계' })));
  const unitLabel = S.unit === 1000 ? 'Kpcs' : 'pcs';
  const row = (key, label) => {
    const tr = h('tr', {}, h('th', { text: label }));
    years.forEach((y, idx) => {
      const i = h('input', { type: 'text', inputmode: 'decimal', class: 'input', value: S[key][y] ?? '', 'data-key': key, 'data-idx': idx, 'aria-label': `${y} ${label}` });
      i.addEventListener('input', () => { S[key][y] = i.value; updateSums(); });
      i.addEventListener('paste', e => onPaste(e, key, idx));
      i.addEventListener('keydown', e => moveFocus(e, key, idx));
      tr.append(h('td', {}, i));
    });
    tr.append(h('td', { class: 'n', 'data-sum': key }));
    return tr;
  };
  t.append(row('qty', `고객 물동 (${unitLabel})`));
  t.append(row('price', `판가 (${S.meta.currency}/pcs)`));
  document.querySelectorAll('input[name=qtyUnit]').forEach(r => { r.checked = Number(r.value) === S.unit; });
  updateSums();
  if (refreshExpected) {
    // 미리 보기용: 고객 물동 없이 계산하면 예상 물동만 나옵니다
    try {
      const body = requestBody();
      body.customer_qty = {};
      const r = await api('/api/calc', body);
      S.expected = r.rows.map(x => x.expected);
    } catch (e) { S.expected = null; }
    drawPreview();
  }
}

function drawPreview() {
  if (S.step !== 5 || !S.expected) return;
  const years = S.meta.years;
  C.preview($('previewChart'), { years, expected: S.expected, customer: years.map(y => { const q = parseNum(S.qty[y]); return q == null ? null : q * S.unit; }) });
}

function updateSums() {
  const years = S.meta.years;
  const q = years.reduce((s, y) => s + (parseNum(S.qty[y]) || 0), 0);
  const a = years.reduce((s, y) => s + (parseNum(S.qty[y]) || 0) * S.unit * (parseNum(S.price[y]) || 0), 0);
  const qc = document.querySelector('[data-sum=qty]');
  const pc = document.querySelector('[data-sum=price]');
  if (qc) qc.textContent = nf0.format(q);
  if (pc) pc.textContent = a ? `매출 ${fmtM(a)} M${S.meta.currency}` : '';
  drawPreview();
  renderSteps();
}

function onPaste(e, key, idx) {
  const text = (e.clipboardData || window.clipboardData).getData('text');
  if (!/\s/.test(text.trim())) return; // 한 칸짜리는 기본 동작
  e.preventDefault();
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim() !== '');
  const years = S.meta.years;
  const keys = key === 'qty' ? ['qty', 'price'] : ['price'];
  lines.slice(0, keys.length).forEach((line, li) => {
    const cells = line.includes('\t') ? line.split('\t') : line.trim().split(/\s+/);
    cells.forEach((c, ci) => {
      const y = years[idx + ci];
      if (y != null) S[keys[li]][y] = c.trim();
    });
  });
  renderQtyTable(false);
  toast('붙여 넣었습니다.');
}

function moveFocus(e, key, idx) {
  if (e.key !== 'Enter' && e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
  const inp = e.target;
  if (e.key === 'ArrowRight' && inp.selectionStart !== inp.value.length) return;
  if (e.key === 'ArrowLeft' && inp.selectionStart !== 0) return;
  const d = e.key === 'ArrowLeft' ? -1 : 1;
  const nxt = document.querySelector(`input[data-key=${key}][data-idx="${idx + d}"]`);
  if (nxt) { e.preventDefault(); nxt.focus(); nxt.select(); }
}

function fillPrice() {
  const first = parseNum($('priceFirst').value);
  const cr = parseNum($('priceCr').value) || 0;
  if (first == null) { toast('첫해 판가를 넣어 주세요.'); return; }
  const years = S.meta.years;
  const start = years.findIndex(y => parseNum(S.qty[y]) != null);
  let p = first;
  years.forEach((y, i) => {
    if (i < Math.max(0, start)) return;
    S.price[y] = String(Math.round(p * 100) / 100);
    p = p * (1 - cr / 100);
  });
  renderQtyTable(false);
}

// ---------------------------------------------------------------- 6. 결과

function requestBody() {
  const qty = {}, price = {};
  for (const y of S.meta.years) {
    const q = parseNum(S.qty[y]);
    if (q != null) qty[y] = q * S.unit;
    const p = parseNum(S.price[y]);
    if (p != null) price[y] = p;
  }
  return {
    customer: S.customer,
    vehicles: [...S.selected].map(id => ({ id, ...(S.overrides[id] || {}) })),
    regions: S.regionMode === 'some' ? [...S.regions] : [],
    option: S.option, dual: S.dual, share: S.share, ppv: S.ppv,
    customer_qty: qty, price,
  };
}

async function runCalc() {
  const box = $('result');
  C.disposeIn(box);
  box.innerHTML = '<p class="muted">계산 중…</p>';
  try {
    S.result = await api('/api/calc', requestBody());
    renderResult();
  } catch (e) {
    box.innerHTML = '';
    box.append(h('div', { class: 'alert serious' }, icon('triangle-alert'), h('span', { text: e.message })));
    paintIcons(box);
  }
  renderSteps();
}

function chartCard(parent, ic, title, desc, opts = {}) {
  const ec = h('div', { class: 'ec', style: `height:${opts.height || 300}px` });
  parent.append(h('div', { class: 'chart-card' + (opts.wide ? ' wide' : '') }, h('h3', {}, icon(ic), title), desc ? h('p', { class: 'desc', text: desc }) : null, ec));
  return ec;
}

// 숫자가 0 부터 올라가는 효과
function countUp(el, to, fmt) {
  const start = performance.now(), dur = 700;
  const step = now => {
    const k = Math.min(1, (now - start) / dur);
    el.textContent = fmt(to * (1 - Math.pow(1 - k, 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function boardHtml(text) {
  // 숫자 덩어리(지역 비중, Kpcs, M$)를 굵게
  const esc = text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  return esc.replace(/([가-힣/]+ \d+%)/g, '<b>$1</b>').replace(/(\d[\d,.]* Kpcs|\d[\d,.]* M\S)/g, '<b>$1</b>').replace(/(Risk|Opportunity)가/g, '<b>$1</b>가');
}

function renderResult() {
  const R = S.result;
  const cur = R.meta.currency;
  const box = $('result');
  C.disposeIn(box);
  box.innerHTML = '';
  const years = R.years;
  const entered = R.rows.filter(r => r.customer != null);
  const v = R.verdict;

  box.append(h('div', { class: 'hero ' + (v || '') },
    h('div', { class: 'hero-head' },
      h('span', { class: 'hero-title', text: '결과 보드' }),
      v ? h('span', { class: 'verdict' }, icon(VERDICT_ICON[v]), VERDICT[v]) : null,
      h('span', { class: 'spacer' }),
      h('button', { type: 'button', class: 'btn small', onclick: () => copyText(R.board.text) }, icon('copy'), '문장 복사')),
    h('p', { class: 'hero-text', html: boardHtml(R.board.text) }),
    h('div', { class: 'hero-meta', text: `데이터 ${R.meta.file} (기준 ${R.meta.vintage}) · 허용 범위 ±${Math.round(R.tolerance * 100)}% · 고객 물동이 조사기관 숫자보다 크면 Risk, 작으면 Opportunity` })));

  const t = R.totals;
  const tone = x => x == null || x === 0 ? '' : x < 0 ? 'risk' : 'opp';
  const maxImplied = Math.max(...entered.map(r => r.implied_option ?? 0), 0);
  const kpis = h('div', { class: 'kpis' });
  const kpi = (ic, tn, label, value, fmt, unit, sub, cls) => {
    const val = h('span', { text: value == null ? '-' : fmt(0) });
    kpis.append(h('div', { class: 'kpi' },
      h('span', { class: 'k-ic ' + tn }, icon(ic)),
      h('div', { class: 'k-label', text: label }),
      h('div', { class: 'k-value ' + (cls || '') }, val, h('span', { class: 'k-unit', text: unit })),
      h('div', { class: 'k-sub', text: sub })));
    if (value != null) countUp(val, value, fmt);
  };
  kpi(t.gap < 0 ? 'trending-down' : 'trending-up', tone(t.gap), '누적 수량 Gap', entered.length ? t.gap : null, fmtKs, 'Kpcs',
    entered.length ? `예상 ${fmtK(t.expected)} / 고객 ${fmtK(t.customer)} Kpcs` : '고객 물동 없음', t.gap < 0 ? 'r-risk' : 'r-opp');
  kpi('calculator', tone(t.gap_amt), '누적 금액 Gap', t.gap_amt, x => (x > 0 ? '+' : '') + fmtM(x), 'M' + cur,
    t.gap_amt == null ? '판가 없음' : `${t.priced_years.length}개 연도 판가 기준`, t.gap_amt < 0 ? 'r-risk' : 'r-opp');
  kpi('sliders-horizontal', maxImplied > 1 ? 'risk' : '', '필요 옵션율 (최대)', entered.length ? maxImplied * 100 : null, x => nf0.format(x), '%',
    `현재 입력 ${S.option}% · 고객 물동을 맞추려면`, maxImplied > 1 ? 'r-risk' : '');
  kpi('layers', '', '고객 / 예상 비율', t.expected && entered.length ? t.customer / t.expected * 100 : null, x => nf0.format(x), '%', '100% 보다 크면 고객 숫자가 큼');
  box.append(kpis);

  if (R.warnings.length) {
    const ic = { serious: 'triangle-alert', warning: 'triangle-alert', info: 'info' };
    box.append(h('div', { class: 'alerts' }, R.warnings.map(w => h('div', { class: 'alert ' + w.level }, icon(ic[w.level] || 'info'), h('span', { text: w.text })))));
  }

  box.append(h('div', { class: 'actions' },
    h('button', { type: 'button', class: 'btn primary', onclick: exportXlsx }, icon('file-spreadsheet'), '엑셀로 내보내기'),
    h('button', { type: 'button', class: 'btn', onclick: saveCase }, icon('save'), '검토 건 저장'),
    h('button', { type: 'button', class: 'btn', onclick: () => window.print() }, icon('printer'), '인쇄'),
    h('span', { class: 'spacer' }),
    h('button', { type: 'button', class: 'btn ghost', onclick: () => goto(5) }, '물동 고치기'),
    h('button', { type: 'button', class: 'btn ghost', onclick: () => goto(4) }, '옵션율 고치기')));

  const charts = h('div', { class: 'charts' });
  box.append(charts);
  paintIcons(box);
  const draw = [];

  // 물동 브리지 (입력 연도 합계)
  {
    const useYears = entered.length ? entered.map(r => r.year) : years;
    const sumBy = f => R.vehicles.reduce((s, x) => s + useYears.reduce((a, y) => a + (x.vehicles_by_year[y] || 0) * f(x), 0), 0);
    const V = sumBy(() => 1), A = sumBy(x => x.option), B = sumBy(x => x.option * x.share), E = sumBy(x => x.option * x.share * x.ppv);
    const steps = [{ name: '생산 대수', value: V, kind: 'total', unit: '대', note: S.regionMode === 'some' && S.regions.size ? `공급 지역: ${[...S.regions].join(', ')}` : '전체 지역' }];
    if (Math.abs(V - A) > 0.5) steps.push({ name: '옵션 미장착', value: A - V, kind: 'delta', unit: '대' });
    if (Math.abs(A - B) > 0.5) steps.push({ name: '이원화 타사 몫', value: B - A, kind: 'delta', unit: '대' });
    if (Math.abs(E - B) > 0.5) steps.push({ name: '대당 사용량', value: E - B, kind: 'delta', note: '대 → pcs 환산' });
    steps.push({ name: '예상 물동', value: E, kind: 'total', color: C.theme().series[0] });
    if (entered.length) steps.push({ name: '고객 물동', value: t.customer, kind: 'total', color: C.theme().series[1] });
    const span = entered.length ? `${useYears[0]}~${useYears[useYears.length - 1]}년` : `${years[0]}~${years[years.length - 1]}년`;
    const el = chartCard(charts, 'layers', `물동 브리지 (${span} 합계)`, '조사기관 생산 대수에서 옵션율, 이원화, 대당 사용량을 차례로 반영한 예상 물동과 고객 물동 비교', { wide: true, height: 300 });
    draw.push(() => C.bridge(el, { steps }));
  }
  {
    const el = chartCard(charts, 'chart-column', '연도별 고객 물동과 예상 물동', '예상 물동 = 생산 대수 × 옵션율 × 자사 비중 × 대당 사용량');
    draw.push(() => C.volumeCompare(el, { years, expected: R.rows.map(r => r.expected), customer: R.rows.map(r => r.customer) }));
  }
  if (entered.length) {
    const el = chartCard(charts, 'trending-down', '연도별 수량 Gap', '예상 - 고객. 아래로 내려가면 Risk, 위로 올라가면 Opportunity');
    draw.push(() => C.gapBars(el, { years, gap: R.rows.map(r => r.gap), ratio: R.rows.map(r => r.gap_ratio ?? null), amount: R.rows.map(r => r.gap_amt), currency: cur }));
    const el2 = chartCard(charts, 'layers', '누적 수량 Gap', '수명 전체로 보면 Gap 이 어디까지 쌓이는지');
    draw.push(() => C.cumulative(el2, { years, cum: R.rows.map(r => r.cum_gap) }));
    const el3 = chartCard(charts, 'sliders-horizontal', '고객 물동을 맞추려면 필요한 옵션율', '자사 비중, 대당 사용량은 그대로 두고 옵션율만 바꿨을 때. 빨간 영역에 들어가면 조사기관 기준으로는 불가능한 물동');
    draw.push(() => C.impliedOption(el3, { years, implied: R.rows.map(r => r.implied_option), input: S.option / 100 }));
  }
  {
    const vs = [...R.vehicles].sort((a, b) => sumObj(b.by_year) - sumObj(a.by_year));
    const series = vs.slice(0, 7).map(x => ({ name: `${x.label} (SOP ${x.sop_year ?? '?'})`, values: years.map(y => x.by_year[y] || 0) }));
    if (vs.length > 7) {
      const rest = vs.slice(7);
      series.push({ name: `기타 ${rest.length}개`, values: years.map(y => rest.reduce((s, x) => s + (x.by_year[y] || 0), 0)) });
    }
    const el = chartCard(charts, 'car', '차종별 예상 물동', '예상 물동이 어느 차종에서 나오는지. 선은 고객 물동', { wide: entered.length > 0 || true, height: 320 });
    draw.push(() => C.vehicleStack(el, { years, series, customer: entered.length ? R.rows.map(r => r.customer) : null }));
  }
  {
    const el = chartCard(charts, 'factory', '차종 수명 (SOP ~ EOP)', '파란 음영은 고객 물동을 입력한 연도. 막대가 끝난 뒤에도 음영이 있으면 EOP 이후 물동입니다.', { wide: true, height: 160 });
    draw.push(() => C.lifecycle(el, {
      items: R.vehicles.map(x => ({ label: `${x.label} (SOP ${x.sop_year ?? '?'})`, start: x.sop, end: x.eop })),
      years, demand: entered.filter(r => r.customer > 0).map(r => r.year),
    }));
  }
  {
    const order = S.meta.regions;
    const regs = R.region_mix.map(m => m.region).sort((a, b) => order.indexOf(a) - order.indexOf(b)).slice(0, 8);
    const values = {};
    for (const r of regs) values[r] = years.map(y => (R.region_by_year[r] || {})[y] || 0);
    const el = chartCard(charts, 'globe-2', '생산 지역 비중 추이', '고른 차종 전체 생산 기준 (공급 지역 선택과 무관). 생산이 다른 지역으로 옮겨 가는지 봅니다.');
    draw.push(() => C.regionShare(el, { years, regions: regs, values }));
    const el2 = chartCard(charts, 'globe-2', '생산 지역 비중', entered.length ? '고객 물동을 입력한 연도의 예상 물동 기준' : '전체 연도 기준');
    const theme = C.theme();
    draw.push(() => C.donut(el2, {
      items: R.region_mix.slice(0, 8).sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region)).map(m => ({ name: m.region, value: m.volume, color: theme.series[regs.indexOf(m.region)] })),
      center: [R.region_mix[0] ? Math.round(R.region_mix[0].share * 100) + '%' : '-', R.region_mix[0] ? R.region_mix[0].region : ''],
    }));
  }

  // 연도별 표
  box.append(h('h3', { class: 'section-title' }, icon('table-2'), '연도별 숫자'));
  const tbl = h('table', { class: 'tbl' });
  const cls = x => x == null ? '' : x < 0 ? 'r-risk' : x > 0 ? 'r-opp' : '';
  const rowsDef = [
    ['DB 생산 대수', r => fmtK(r.vehicles), 'K대'],
    ['예상 물동', r => fmtK(r.expected), 'Kpcs'],
    ['고객 물동', r => r.customer == null ? '-' : fmtK(r.customer), 'Kpcs'],
    ['수량 Gap', r => r.gap == null ? '-' : fmtKs(r.gap), 'Kpcs', r => cls(r.gap)],
    ['Gap 비율', r => r.gap_ratio == null ? '-' : (r.gap_ratio > 0 ? '+' : '') + nf1.format(r.gap_ratio * 100) + '%', ''],
    ['판가', r => r.price == null ? '-' : nf2.format(r.price), cur + '/pcs'],
    ['금액 Gap', r => r.gap_amt == null ? '-' : fmtM(r.gap_amt), 'M' + cur, r => cls(r.gap_amt)],
    ['필요 옵션율', r => fmtPct(r.implied_option), ''],
  ];
  tbl.append(h('thead', {}, h('tr', {}, h('th', { text: '항목' }), h('th', { text: '단위' }), years.map(y => h('th', { class: 'n', text: y })))));
  const tb = h('tbody');
  for (const [label, f, unit, c] of rowsDef) {
    tb.append(h('tr', {}, h('td', { text: label }), h('td', { class: 'muted', text: unit }), R.rows.map(r => h('td', { class: 'n ' + (c ? c(r) : ''), text: f(r) }))));
  }
  tb.append(h('tr', {}, h('td', { text: '판정' }), h('td'), R.rows.map(r => h('td', { class: 'n' }, r.status ? h('span', { class: 'status-pill ' + r.status, text: VERDICT[r.status] }) : '-'))));
  tbl.append(tb);
  box.append(h('div', { class: 'tbl-wrap' }, tbl));

  if (R.sensitivity) {
    const sens = R.sensitivity;
    box.append(h('h3', { class: 'section-title' }, icon('sliders-horizontal'), '민감도: 누적 수량 Gap (Kpcs)'));
    box.append(h('p', { class: 'hint', text: sens.dual ? '옵션율(가로)과 자사 비중(세로)이 바뀌면 누적 Gap 이 어떻게 달라지는지. 테두리 칸이 현재 입력값입니다.' : '옵션율이 바뀌면 누적 Gap 이 어떻게 달라지는지. 이원화를 켜면 자사 비중 축도 나옵니다.' }));
    const el = h('div', { class: 'ec' });
    box.append(h('div', { class: 'chart-card' }, el));
    draw.push(() => C.sensitivity(el, { steps: sens.steps, grid: sens.grid, option: S.option, share: S.share, dual: sens.dual }));
  }
  paintIcons(box);
  // 요소가 화면에 붙은 뒤 그려야 폭을 잴 수 있습니다
  requestAnimationFrame(() => draw.forEach(f => f()));
}

function sumObj(o) { return Object.values(o).reduce((a, b) => a + b, 0); }

function copyText(text) {
  // http 주소(사내 IP)에서는 navigator.clipboard 가 막히므로 예전 방식도 같이 씁니다.
  const fallback = () => {
    const ta = h('textarea', { style: 'position:fixed;left:-9999px' });
    ta.value = text;
    document.body.append(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove();
    toast(ok ? '복사했습니다.' : '복사하지 못했습니다. 문장을 직접 드래그해 복사하세요.');
  };
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(() => toast('복사했습니다.'), fallback);
  else fallback();
}

function download(blob, name) {
  const a = h('a', { href: URL.createObjectURL(blob), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function stamp() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

async function exportXlsx() {
  try {
    const blob = await api('/api/export', requestBody());
    download(blob, `물동검토_${S.customer.name}_${stamp()}.xlsx`);
  } catch (e) { toast(e.message); }
}

// ---------------------------------------------------------------- 검토 건 저장/불러오기

function saveCase() {
  const data = {
    kind: 'rfx-volume-case', version: 1, saved_at: new Date().toISOString(),
    data_vintage: S.meta.vintage, data_file: S.meta.file,
    customer: S.customer,
    selected: selectedVehicles().map(v => ({ id: v.id, label: v.label, sop_year: v.sop_year })),
    sopYears: [...S.sopYears], regionMode: S.regionMode, regions: [...S.regions],
    option: S.option, dual: S.dual, share: S.share, ppv: S.ppv, overrides: S.overrides,
    unit: S.unit, qty: S.qty, price: S.price,
    result_board: S.result ? S.result.board.text : null,
  };
  download(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), `물동검토_${S.customer.name}_${stamp()}.json`);
}

async function loadCase(file) {
  let d;
  try { d = JSON.parse(await file.text()); } catch (e) { toast('JSON 파일이 아닙니다.'); return; }
  if (d.kind !== 'rfx-volume-case') { toast('이 프로그램에서 저장한 검토 건이 아닙니다.'); return; }
  Object.assign(S, {
    option: d.option ?? 100, dual: !!d.dual, share: d.share ?? 50, ppv: d.ppv ?? 1, overrides: d.overrides || {},
    unit: d.unit || 1, qty: d.qty || {}, price: d.price || {}, regionMode: d.regionMode || 'all',
  });
  S.regions = new Set(d.regions || []);
  S.sopYears = new Set(d.sopYears || []);
  await pickCustomer(d.customer, true);
  const ids = new Set(S.vehicles.map(v => v.id));
  S.selected = new Set((d.selected || []).map(x => x.id).filter(id => ids.has(id)));
  const lost = (d.selected || []).filter(x => !ids.has(x.id));
  if (lost.length) toast(`지금 데이터에 없는 차종 ${lost.length}개는 빠졌습니다: ${lost.map(x => x.label).join(', ')}`);
  else if (d.data_vintage && d.data_vintage !== S.meta.vintage) toast(`저장 당시 데이터 기준 ${d.data_vintage} → 지금 ${S.meta.vintage}. 숫자가 다를 수 있습니다.`);
  goto(S.selected.size ? 6 : 2);
}

// ---------------------------------------------------------------- 시작

function showDataError(e) {
  const box = $('dataError');
  box.hidden = false;
  box.textContent = '데이터 오류: ' + e.message;
}

function resetAll() {
  Object.assign(S, { customer: null, vehicles: [], option: 100, dual: false, share: 50, ppv: 1, overrides: {}, unit: 1, qty: {}, price: {}, result: null, expected: null, regionMode: 'all' });
  S.selected = new Set(); S.sopYears = new Set(); S.regions = new Set();
  $('customerInput').value = '';
  $('customerCandidates').innerHTML = '';
  goto(1);
  $('customerInput').focus();
}

function isDark() {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
}

function initTheme() {
  const btn = $('btnTheme');
  let saved = null;
  try { saved = localStorage.getItem('rfx-theme'); } catch (e) { /* 저장 안 돼도 됨 */ }
  const apply = t => {
    if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
    const i = btn.querySelector('i');
    i.dataset.icon = isDark() ? 'sun' : 'moon';
    paintIcons(btn);
  };
  apply(saved);
  btn.addEventListener('click', () => {
    const t = isDark() ? 'light' : 'dark';
    try { localStorage.setItem('rfx-theme', t); } catch (e) { /* 무시 */ }
    apply(t);
    // 차트 색은 CSS 변수를 읽어 그리므로 다시 그립니다
    if (S.step === 6 && S.result) renderResult();
    if (S.step === 3) renderRegions();
    if (S.step === 4) renderFactorText();
    if (S.step === 5) drawPreview();
  });
}

async function init() {
  await loadIcons();
  paintIcons();
  initTheme();
  $('customerInput').addEventListener('input', onCustomerInput);
  $('customerInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') { const first = document.querySelector('#customerCandidates .cand'); if (first) first.click(); }
  });
  $('vehSearch').addEventListener('input', renderVehicles);
  $('onlySelected').addEventListener('change', renderVehicles);
  $('sopPlusMinus').addEventListener('change', renderVehicles);
  $('btnClearVeh').addEventListener('click', () => { S.selected.clear(); renderVehicles(); });
  document.querySelectorAll('input[name=regionMode]').forEach(r => r.addEventListener('change', () => {
    S.regionMode = r.value;
    if (S.regionMode === 'some' && !S.regions.size) {
      const top = regionTotals().sort((a, b) => b.value - a.value)[0];
      if (top) S.regions.add(top.name);
    }
    renderRegions();
  }));
  bindPair('optRange', 'optNum', 'option');
  bindPair('shareRange', 'shareNum', 'share');
  $('dualOn').addEventListener('change', () => { S.dual = $('dualOn').checked; renderFactors(); });
  $('ppvNum').addEventListener('change', () => setPpv(parseNum($('ppvNum').value)));
  $('ppvMinus').addEventListener('click', () => setPpv(Math.max(0, S.ppv - 1)));
  $('ppvPlus').addEventListener('click', () => setPpv(S.ppv + 1));
  document.querySelectorAll('input[name=qtyUnit]').forEach(r => r.addEventListener('change', () => { S.unit = Number(r.value); renderQtyTable(false); }));
  $('btnPriceFill').addEventListener('click', fillPrice);
  $('btnClearQty').addEventListener('click', () => { S.qty = {}; S.price = {}; renderQtyTable(false); });
  $('btnPrev').addEventListener('click', () => goto(S.step - 1));
  $('btnNext').addEventListener('click', () => goto(S.step + 1));
  $('btnNew').addEventListener('click', resetAll);
  $('fileLoad').addEventListener('change', e => { const f = e.target.files[0]; if (f) loadCase(f); e.target.value = ''; });

  try {
    S.meta = await api('/api/meta');
    const info = $('dataInfo');
    info.querySelector('span').textContent = `${S.meta.file} · 기준 ${S.meta.vintage} · 차종 세대 ${nf0.format(S.meta.generations)}개`;
    renderBrowse();
  } catch (e) {
    $('dataInfo').querySelector('span').textContent = '데이터를 읽지 못했습니다';
    showDataError(e);
  }
  goto(1);
  $('customerInput').focus();
}

init();
