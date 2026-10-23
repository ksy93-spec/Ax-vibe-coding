/* 관리: 파일로 저장, 자료 묶음 주고받기, CSV 내보내기, 환율 표, 회사 목록과 로고. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;
  var C = App.ea.core;
  var F = App.ea.files;
  var M = App.ea.merge;
  var views = (App.views = App.views || {});

  var LOGO_MAX = 200 * 1024;
  var pending = null; // 가져오기 확인 중인 묶음 {name, rows, fx}

  views.admin = function (main) {
    main.appendChild(savePanel());
    main.appendChild(packPanel());
    main.appendChild(fxPanel());
    main.appendChild(companyPanel());
  };

  /* ---------- 파일로 저장 ---------- */

  function savePanel() {
    var items = App.data.dirty();
    var folder = App.data.folderName();
    var kids = [];
    if (!items.length) {
      kids.push(h('p', { class: 'muted', text: '파일로 저장하지 않은 변경이 없습니다. 화면에 보이는 자료가 data 폴더의 파일과 같습니다.' }));
    } else {
      kids.push(h('table', { class: 'table' }, [
        h('thead', null, h('tr', null, ['파일 (data 폴더 기준)', '내용', '판', ''].map(function (t) { return h('th', { class: 'th', text: t }); }))),
        h('tbody', null, items.map(function (it) {
          return h('tr', null, [
            h('td', { class: 'mono', text: 'data/' + it.path }),
            h('td', { text: describe(it) }),
            h('td', { class: 'num', text: String(it.data.rev) }),
            h('td', { class: 'row' }, [
              f.btn('내려받기', function () { App.data.downloadItem(it); }, 'sm'),
              f.btn('되돌리기', function () {
                App.ui.confirm('data/' + it.path + ' 의 저장 안 된 변경을 버리고 파일 상태로 돌아갑니다.', function (yes) { if (yes) App.data.discard(it); }, { danger: true, okLabel: '버리기' });
              }, 'ghost sm'),
            ]),
          ]);
        })),
      ]));
    }
    var actions = [];
    if (App.data.canWriteFolder()) {
      actions.push(f.btn(folder ? 'data 폴더 다시 고르기' : 'data 폴더 연결', function () {
        App.data.connectFolder().then(function (name) {
          App.ui.toast(name + ' 폴더를 연결했습니다.', 'ok');
        }, function (e) {
          if (e && e.name === 'AbortError') return;
          App.ui.toast(e.message || String(e), 'danger', 8000);
        });
      }, folder ? 'sm' : ''));
      if (items.length) {
        actions.push(f.btn('폴더에 모두 저장 (' + items.length + '개)', function () {
          App.data.saveToFolder().then(function (n) {
            App.ui.toast(n + '개 파일을 저장했습니다.', 'ok');
          }, function (e) {
            App.ui.toast('저장하지 못했습니다: ' + (e.message || e) + '. 내려받기로 저장하세요.', 'danger', 8000);
          });
        }, 'primary', { disabled: !folder }));
      }
    }
    if (items.length) {
      actions.push(f.btn('모두 내려받기', function () {
        items.forEach(function (it, i) { setTimeout(function () { App.data.downloadItem(it); }, i * 300); });
        App.ui.modal({
          title: '내려받은 파일을 넣을 곳',
          body: h('div', null, [
            h('p', { text: '내려받기 폴더에 생긴 파일을 킷 폴더 안 아래 위치에 덮어씁니다. 그다음 이 화면을 새로 고치면 저장 안 됨 표시가 사라집니다.' }),
            h('ul', { class: 'mono small' }, items.map(function (it) { return h('li', { text: it.path.split('/').pop() + '  ->  data/' + it.path }); })),
            h('p', { class: 'muted small', text: '브라우저가 "여러 파일 다운로드" 를 물으면 허용합니다.' }),
          ]),
          actions: [{ label: '확인', kind: 'primary' }],
        });
      }, App.data.canWriteFolder() && folder ? 'sm' : 'primary'));
    }
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [h('h2', { class: 'panel__title', text: '파일로 저장' }),
        folder ? f.chip('연결됨: ' + folder, 'ok') : null]),
      h('p', { class: 'panel__hint', text: App.data.canWriteFolder()
        ? '화면에서 고친 내용은 이 브라우저에만 있습니다. 킷의 data 폴더를 한 번 연결하면 파일에 바로 씁니다. 공유 폴더에 둔 킷이면 저장하는 즉시 다른 사람도 새로 고침으로 봅니다.'
        : '이 브라우저는 폴더에 바로 쓰지 못합니다. 내려받은 파일을 data 폴더에 덮어쓰세요.' }),
    ].concat(kids, [h('div', { class: 'row' }, actions)]));
  }

  function describe(it) {
    if (it.kind === 'companies') return '회사 목록 ' + it.data.companies.length + '곳';
    if (it.kind === 'fx') return '환율 표';
    var c = App.data.company(it.id);
    var name = c ? c.nameKo || c.name : it.id;
    if (it.kind === 'report') return name + ' 분기 ' + (it.data.quarters || []).length + '개';
    return name + ' 원문 ' + Object.keys(it.data.items || {}).length + '개';
  }

  /* ---------- 자료 묶음 ---------- */

  function stamp() {
    return new Date().toISOString().slice(0, 10).replace(/-/g, '');
  }

  function packPanel() {
    var fileInput = h('input', {
      type: 'file', accept: '.json,.js', multiple: true, class: 'sr-only',
      onchange: function (e) { readPacks(Array.prototype.slice.call(e.target.files)); e.target.value = ''; },
    });
    var kids = [
      h('p', { class: 'panel__hint', text: '바깥에서 정리해 보낸 자료 묶음(.json)이나 다른 사람이 저장한 data 파일(.js)을 가져옵니다. 사내에서 고친 분기는 덮어쓰지 않는 것이 기본입니다.' }),
      h('div', { class: 'row' }, [
        f.btn('가져올 파일 고르기', function () { fileInput.click(); }, 'primary'),
        fileInput,
        f.btn('지금 자료를 묶음으로 내보내기', function () {
          var ids = App.data.companies().map(function (c) { return c.id; });
          var pack = M.makePack(App.data.reports(), App.data.fx(), ids);
          App.data.downloadText('ea-pack-' + stamp() + '.json', JSON.stringify(pack, null, 1), 'application/json');
        }),
        f.btn('분기 실적 CSV (엑셀)', exportCsv),
      ]),
    ];
    if (pending) kids.push(planTable());
    return h('section', { class: 'panel' }, [h('h2', { class: 'panel__title', text: '자료 묶음 주고받기' })].concat(kids));
  }

  function readPacks(files) {
    var merged = { reports: [], fx: null, companies: null, name: files.map(function (x) { return x.name; }).join(', ') };
    var left = files.length;
    files.forEach(function (file) {
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var text = String(reader.result);
          if (/\.js$/i.test(file.name)) {
            var o = F.fromText(text);
            if (o.kind === 'report') merged.reports.push({ company: o.data.company, quarters: o.data.quarters });
            else if (o.kind === 'fx') merged.fx = o.data;
            else if (o.kind === 'companies') merged.companies = o.data.companies;
            else App.ui.toast(file.name + ': 원문 파일은 가져오지 않습니다. data/transcripts 에 직접 복사하세요.', 'warn', 6000);
          } else {
            var j = App.ea.parse.lenientJson(text);
            if (!j.ok) throw new Error(j.error);
            if (j.value.type !== 'ea-pack') throw new Error('자료 묶음(type: ea-pack)이 아닙니다');
            merged.reports = merged.reports.concat(j.value.reports || []);
            if (j.value.fx) merged.fx = j.value.fx;
          }
        } catch (e) {
          App.ui.toast(file.name + ': ' + e.message, 'danger', 8000);
        }
        if (--left === 0) planFrom(merged);
      };
      reader.readAsText(file, 'utf-8');
    });
  }

  function planFrom(merged) {
    var newCompanies = [];
    if (merged.companies) {
      merged.companies.forEach(function (c) {
        if (!App.data.company(c.id)) newCompanies.push(c);
      });
    }
    var companies = App.data.companies().concat(newCompanies);
    pending = {
      name: merged.name,
      rows: M.planPack({ reports: merged.reports }, App.data.reports(), companies),
      fx: merged.fx,
      newCompanies: newCompanies,
    };
    App.render();
  }

  var ACTION_LABEL = { add: '추가', replace: '바꿈', keep: '남김', same: '같음', skip: '건너뜀' };

  function planTable() {
    var rows = pending.rows;
    var fxInfo = pending.fx ? M.fillFx(App.data.fx(), pending.fx) : null;
    var count = rows.filter(function (r) { return r.action === 'add' || r.action === 'replace'; }).length;
    return h('div', { class: 'plan' }, [
      h('h3', { class: 'sub__title', text: pending.name + ' : 분기 ' + rows.length + '개' + (fxInfo ? ', 빈 환율 ' + fxInfo.added + '칸' : '') +
        (pending.newCompanies.length ? ', 새 회사 ' + pending.newCompanies.length + '곳' : '') }),
      h('div', { class: 'table__scroll' }, h('table', { class: 'table' }, [
        h('thead', null, h('tr', null, ['회사', '분기', '판단', '할 일'].map(function (t) { return h('th', { class: 'th', text: t }); }))),
        h('tbody', null, rows.map(function (r) {
          var c = App.data.company(r.company);
          var sel = r.action === 'skip' || r.action === 'same' ? h('span', { class: 'muted', text: ACTION_LABEL[r.action] }) :
            h('select', { class: 'input input--sm', onchange: function (e) { r.action = e.target.value; App.render(); } },
              (r.action === 'add' ? ['add', 'skip'] : ['replace', 'keep']).map(function (a) {
                return h('option', { value: a, selected: a === r.action, text: ACTION_LABEL[a] });
              }));
          return h('tr', null, [
            h('td', { text: c ? c.nameKo || c.name : r.company }),
            h('td', { text: r.period }),
            h('td', { class: 'muted', text: r.reason }),
            h('td', null, sel),
          ]);
        })),
      ])),
      h('div', { class: 'row' }, [
        f.btn('적용 (분기 ' + count + '개)', function () {
          if (pending.newCompanies.length) App.data.putCompanies(App.data.companies().concat(pending.newCompanies));
          var changed = M.applyPack(rows, App.data.reports());
          Object.keys(changed).forEach(function (id) { App.data.putReport(id, changed[id]); });
          if (fxInfo && fxInfo.added) App.data.putFx(fxInfo.fx);
          pending = null;
          App.ui.toast('가져왔습니다. 위 "파일로 저장" 에서 data 폴더에 반영하세요.', 'ok', 6000);
          App.render();
        }, 'primary', { disabled: !count && !(fxInfo && fxInfo.added) && !pending.newCompanies.length }),
        f.btn('취소', function () { pending = null; App.render(); }),
      ]),
    ]);
  }

  function exportCsv() {
    var fx = App.data.fx();
    var cols = ['company', 'name', 'group', 'period', 'fiscal_label', 'report_date', 'currency', 'fx_per_usd', 'fx_source',
      'revenue_musd', 'operating_income_musd', 'op_margin_pct', 'adj_operating_income_musd', 'net_income_musd', 'deliveries_k',
      'revenue_local_m', 'operating_income_local_m', 'net_income_local_m', 'status', 'source'];
    var recs = [];
    App.data.companies().forEach(function (c) {
      C.table(App.data.report(c.id), c, fx).forEach(function (d) {
        var q = d.quarter;
        var r = function (v, k) { return v === null || v === undefined ? '' : C.round(v, k === undefined ? 1 : k); };
        recs.push({
          company: c.id, name: c.name, group: c.group, period: d.period, fiscal_label: q.fiscalLabel || '', report_date: q.reportDate || '',
          currency: d.currency, fx_per_usd: d.currency === 'USD' ? 1 : r(d.fx.rate, 4), fx_source: d.fx.source,
          revenue_musd: r(d.musd.revenue), operating_income_musd: r(d.musd.operatingIncome), op_margin_pct: r(d.opMargin, 2),
          adj_operating_income_musd: r(d.musd.adjOperatingIncome), net_income_musd: r(d.musd.netIncome), deliveries_k: r(d.deliveries),
          revenue_local_m: r(d.local.revenue), operating_income_local_m: r(d.local.operatingIncome), net_income_local_m: r(d.local.netIncome),
          status: q.status || '', source: q.source || '',
        });
      });
    });
    if (!recs.length) {
      App.ui.toast('내보낼 분기 자료가 없습니다.', 'warn');
      return;
    }
    App.csv.download('earnings-' + stamp() + '.csv', App.csv.stringify(cols, recs));
  }

  /* ---------- 환율 ---------- */

  function fxPanel() {
    var fx = JSON.parse(JSON.stringify(App.data.fx()));
    fx.rates = fx.rates || {};
    var used = {};
    App.data.companies().forEach(function (c) { if (c.currency !== 'USD') used[c.currency] = 1; });
    Object.keys(fx.rates).forEach(function (k) { used[k] = 1; });
    var currencies = Object.keys(used).sort();
    var periods = {};
    f.allPeriods(App.data.reports()).forEach(function (p) { periods[p] = 1; });
    var last = C.lastClosedPeriod();
    C.periodRange(C.periodAdd(last, -7), last).forEach(function (p) { periods[p] = 1; });
    currencies.forEach(function (cur) { Object.keys(fx.rates[cur] || {}).forEach(function (p) { periods[p] = 1; }); });
    var plist = Object.keys(periods).sort().reverse();
    var changed = false;

    var table = h('table', { class: 'table table--fx' }, [
      h('thead', null, h('tr', null, [h('th', { class: 'th', text: '분기' })].concat(currencies.map(function (cur) {
        return h('th', { class: 'th num', text: cur + ' / USD' });
      })))),
      h('tbody', null, plist.map(function (p) {
        return h('tr', null, [h('td', { text: C.periodLabel(p, true) })].concat(currencies.map(function (cur) {
          var v = fx.rates[cur] && fx.rates[cur][p];
          return h('td', null, h('input', {
            class: 'input input--num input--sm' + (v ? '' : ' is-empty'), inputmode: 'decimal', value: v || '', 'aria-label': p + ' ' + cur,
            oninput: function (e) {
              var n = C.toNumber(e.target.value);
              fx.rates[cur] = fx.rates[cur] || {};
              if (n && n > 0) fx.rates[cur][p] = n;
              else delete fx.rates[cur][p];
              changed = true;
              e.target.classList.toggle('is-empty', !n);
            },
          }));
        })));
      })),
    ]);
    var src = h('input', { class: 'input input--grow', value: fx.source || '', placeholder: '예: 한국은행 ECOS 분기 평균, FRED H.10', oninput: function (e) { fx.source = e.target.value; changed = true; } });
    var other = h('input', { class: 'input input--sm', placeholder: '분기 더하기 (예: 2024Q4)' });
    var addCur = h('input', { class: 'input input--sm', placeholder: '통화 더하기 (예: CNY)' });
    return h('section', { class: 'panel' }, [
      h('h2', { class: 'panel__title', text: '환율 (분기 평균, 1 USD 당 통화 단위)' }),
      h('p', { class: 'panel__hint', text: '분기 실적을 그 분기 평균 환율로 달러로 바꿉니다. 예: 2026 Q2 KRW 1,380 이면 원화 1조 3,800억 = 1,000 MUSD. 빈 칸이 있으면 그 분기의 원화, 엔화 금액이 달러로 나오지 않습니다.' }),
      h('div', { class: 'table__scroll table__scroll--short' }, table),
      h('div', { class: 'row' }, [h('span', { class: 'muted', text: '출처' }), src]),
      h('div', { class: 'row' }, [
        f.btn('환율 저장', function () {
          if (!changed) { App.ui.toast('바뀐 값이 없습니다.'); return; }
          App.data.putFx(fx);
          App.ui.toast('환율을 저장했습니다. 파일 반영은 위 "파일로 저장" 에서.', 'ok');
        }, 'primary'),
        other,
        f.btn('분기 더하기', function () {
          var p = C.normPeriod(other.value);
          if (!p) { App.ui.toast('분기를 2024Q4 처럼 적어 주세요.', 'warn'); return; }
          currencies.forEach(function (cur) { fx.rates[cur] = fx.rates[cur] || {}; });
          var first = currencies[0];
          if (first && !fx.rates[first][p]) fx.rates[first][p] = '';
          // 빈 값은 저장하지 않으므로 화면에만 보이게 기간을 늘립니다.
          App.data.putFx(fx);
        }, 'sm'),
        addCur,
        f.btn('통화 더하기', function () {
          var cur = String(addCur.value || '').trim().toUpperCase();
          if (!/^[A-Z]{3}$/.test(cur)) { App.ui.toast('통화 코드를 CNY 처럼 세 글자로 적어 주세요.', 'warn'); return; }
          fx.rates[cur] = fx.rates[cur] || {};
          App.data.putFx(fx);
        }, 'sm'),
      ]),
    ]);
  }

  /* ---------- 회사 목록 ---------- */

  function companyPanel() {
    var list = App.data.companies();
    return h('section', { class: 'panel' }, [
      h('div', { class: 'panel__bar' }, [
        h('h2', { class: 'panel__title', text: '회사 목록' }),
        h('div', { class: 'app__spacer' }),
        f.btn('회사 추가', function () { editCompany(null); }, 'primary sm'),
      ]),
      h('p', { class: 'panel__hint', text: '로고가 없는 회사는 글자 마크로 나옵니다. 로고 바꾸기로 SVG 나 PNG(200KB 이하)를 넣으면 회사 목록 파일에 함께 저장됩니다.' }),
      h('div', { class: 'table__scroll' }, h('table', { class: 'table' }, [
        h('thead', null, h('tr', null, ['', 'id', '이름', '구분', '종목 코드', '통화', '회계연도 끝', ''].map(function (t) { return h('th', { class: 'th', text: t }); }))),
        h('tbody', null, list.map(function (c, i) {
          return h('tr', null, [
            h('td', null, f.logo(c, 'sm')),
            h('td', { class: 'mono', text: c.id }),
            h('td', { text: (c.nameKo || '') + ' / ' + c.name }),
            h('td', { text: c.group === 'Tier1' ? '부품사' : '완성차' }),
            h('td', { class: 'mono', text: c.ticker || '' }),
            h('td', { text: c.currency }),
            h('td', { text: c.fyEnd + '월' }),
            h('td', { class: 'row' }, [
              f.btn('고치기', function () { editCompany(c); }, 'sm'),
              f.btn('위', function () { move(i, -1); }, 'ghost sm', { disabled: i === 0, 'aria-label': '위로' }),
              f.btn('아래', function () { move(i, 1); }, 'ghost sm', { disabled: i === list.length - 1, 'aria-label': '아래로' }),
            ]),
          ]);
        })),
      ])),
    ]);
  }

  function move(i, d) {
    var list = App.data.companies().slice();
    var x = list.splice(i, 1)[0];
    list.splice(i + d, 0, x);
    App.data.putCompanies(list);
  }

  function editCompany(c) {
    var isNew = !c;
    var d = c ? JSON.parse(JSON.stringify(c)) : { id: '', name: '', nameKo: '', group: 'OEM', ticker: '', currency: 'USD', fyEnd: 12, color: '', logo: '', metricNotes: {}, aliases: [] };
    d.metricNotes = d.metricNotes || {};
    var preview = h('span', { class: 'logo-preview' }, f.logo(d, 'lg'));
    function redraw() {
      App.dom.clear(preview);
      preview.appendChild(f.logo(d, 'lg'));
    }
    function inp(key, ph, extra) {
      return h('input', Object.assign({ class: 'input', value: d[key] || '', placeholder: ph || '', oninput: function (e) { d[key] = e.target.value; } }, extra || {}));
    }
    function note(key) {
      return h('input', { class: 'input', value: d.metricNotes[key] || '', oninput: function (e) { d.metricNotes[key] = e.target.value; } });
    }
    var file = h('input', { type: 'file', accept: '.svg,.png,.jpg,.jpeg,.webp', class: 'sr-only', onchange: function (e) {
      var fl = e.target.files[0];
      if (!fl) return;
      if (fl.size > LOGO_MAX) { App.ui.toast('로고 파일이 200KB 를 넘습니다. 더 작은 파일을 쓰세요.', 'warn'); return; }
      var rd = new FileReader();
      rd.onload = function () { d.logo = rd.result; redraw(); };
      rd.readAsDataURL(fl);
    } });
    var body = h('div', { class: 'form-grid form-grid--modal' }, [
      f.field('id (영문 소문자, 파일 이름이 됨)', inp('id', 'gm', { disabled: !isNew })),
      f.field('영문 이름', inp('name', 'General Motors')),
      f.field('한글 이름', inp('nameKo', '제너럴모터스')),
      f.field('구분', h('select', { class: 'input', onchange: function (e) { d.group = e.target.value; } },
        [['OEM', '완성차'], ['Tier1', '부품사']].map(function (g) { return h('option', { value: g[0], selected: d.group === g[0], text: g[1] }); }))),
      f.field('종목 코드 (Yahoo Finance 표기)', inp('ticker', 'GM, 005380.KS, 7203.T')),
      f.field('발표 통화', h('select', { class: 'input', onchange: function (e) { d.currency = e.target.value; } },
        C.CURRENCIES.map(function (x) { return h('option', { value: x, selected: d.currency === x, text: x }); }))),
      f.field('회계연도 끝 달', h('input', { class: 'input', inputmode: 'numeric', value: d.fyEnd, oninput: function (e) { d.fyEnd = C.toNumber(e.target.value) || 12; } }), '12 또는 3'),
      f.field('글자 마크 색', inp('color', '#0170CE')),
      f.field('영업이익 이름', note('operatingIncome'), '예: EBIT, Operating result'),
      f.field('조정 영업이익 이름', note('adjOperatingIncome'), '예: EBIT-adjusted'),
      f.field('판매 대수 정의', note('deliveries'), '예: 도매 판매, Retail sales'),
      f.field('다른 이름 (쉼표로)', h('input', { class: 'input', value: (d.aliases || []).join(', '), oninput: function (e) {
        d.aliases = e.target.value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      } }), '모델 답에 다른 이름이 와도 이 회사로 알아봅니다'),
      h('div', { class: 'field' }, [
        h('span', { class: 'field__label', text: '로고' }),
        h('div', { class: 'row' }, [preview, file,
          f.btn('로고 바꾸기', function () { file.click(); }, 'sm'),
          f.btn('로고 빼기', function () { d.logo = ''; redraw(); }, 'ghost sm')]),
      ]),
    ]);
    App.ui.modal({
      title: isNew ? '회사 추가' : (c.nameKo || c.name) + ' 고치기',
      body: body,
      actions: [
        { label: '취소' },
        { label: '저장', kind: 'primary', onClick: function (close) {
          d.id = String(d.id || '').trim().toLowerCase();
          if (!/^[a-z][a-z0-9-]{1,30}$/.test(d.id)) { App.ui.toast('id 는 영문 소문자로 시작하고 영문, 숫자, - 만 씁니다.', 'warn'); return; }
          if (!d.name) { App.ui.toast('영문 이름을 적어 주세요.', 'warn'); return; }
          var list = App.data.companies().slice();
          if (isNew) {
            if (App.data.company(d.id)) { App.ui.toast('같은 id 가 있습니다.', 'warn'); return; }
            list.push(d);
          } else {
            list = list.map(function (x) { return x.id === d.id ? d : x; });
          }
          close();
          App.data.putCompanies(list);
          if (isNew) App.data.putReport(d.id, M.emptyReport(d.id));
        } },
      ],
    });
    var m = document.querySelector('.modal');
    if (m) m.classList.add('modal--wide');
  }
})(window);
