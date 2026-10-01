/* 진입점: 머리글, 탭, 화면 그리기. 전역 App.render. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var st = App.state;
  var act = App.actions;

  var TABS = [
    { key: 'data', label: '데이터' },
    { key: 'overview', label: '대시보드' },
    { key: 'scenario', label: '외생변수' },
    { key: 'result', label: '상세 분석' },
    { key: 'report', label: '임원 보고서' },
  ];

  var GLOSSARY = [
    ['TAM', '시장 전체 규모. 차량 TAM 은 차량 판매 대수, 디스플레이 TAM 은 차량 판매 x 대당 디스플레이(EA).'],
    ['M/S', '점유율. OEM M/S 는 지역 차량 판매 중 그 OEM 비중, 자사 M/S 는 디스플레이 TAM 중 자사 물량 비중.'],
    ['브랜드 내 자사 M/S', '그 OEM 이 쓰는 디스플레이 중 자사 공급 비중. 데이터 탭 6번에서 넣습니다.'],
    ['Powertrain', 'BEV, PHEV, HEV, ICE. 분기 자료를 월로 나눠 씁니다.'],
    ['주요 지역 / 기타 지역', '주요 지역은 따로 M/S trend 를 보고, 나머지는 기타 지역 하나로 합칩니다. 글로벌 TAM 에는 모두 들어갑니다.'],
    ['Trend', '외생변수 없이 월별 M/S trend 만 이어 간 전망.'],
    ['Worst / Base / Best', 'Base 는 외생변수 예상값, Worst 는 부정 요인 크게 · 긍정 요인 작게, Best 는 그 반대. 자동 계산.'],
    ['A / E / F', '2025A 실적, 2026E 실적+전망, 2027F 전망.'],
    ['전략고객 / 유지고객', 'OEM 고객 구분. 데이터 탭 6번에서 지정하고 임원 보고서 3·4번에 나옵니다.'],
    ['Pull-forward', '보조금 종료 전 막차 수요처럼 시작 전에 앞당겨 사는 수요. 시작 뒤 같은 물량이 빠집니다.'],
  ];

  function showHelp() {
    var body = h('div', { class: 'helpdoc' }, [
      h('h3', { class: 'sub-title', text: '쓰는 순서' }),
      h('ol', { class: 'helpdoc__steps' }, [
        h('li', { text: '데이터: 월별 판매 CSV(처음이면 예시 데이터), 주요 지역, 관측 OEM, 디스플레이 가정과 고객 구분.' }),
        h('li', { text: '대시보드: 연도와 시나리오를 골라 지역별 TAM, OEM M/S, 자사 M/S 를 봅니다.' }),
        h('li', { text: '외생변수: EV 보조금, 규제, 관세 같은 요인을 범위와 함께 넣으면 Worst / Base / Best 가 자동으로 나옵니다.' }),
        h('li', { text: '상세 분석: 지역 x OEM 의 월별 M/S trend 와 연도별 판매.' }),
        h('li', { text: '임원 보고서: TAM → 주요 지역 → 자사 M/S → 전략·유지고객 → 수요 전망 한 장. 인쇄, PDF, CSV.' }),
      ]),
      h('h3', { class: 'sub-title', text: '용어' }),
      h('dl', { class: 'helpdoc__terms' }, GLOSSARY.reduce(function (acc, g) {
        acc.push(h('dt', { text: g[0] }));
        acc.push(h('dd', { text: g[1] }));
        return acc;
      }, [])),
    ]);
    App.ui.modal({ title: '도움말', body: body, actions: [{ label: '닫기', kind: 'primary' }] });
  }

  function themeToggle() {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) { /* 막힐 수 있음 */ }
    if (saved) root.setAttribute('data-theme', saved);
    return h('button', {
      class: 'btn btn--sm', type: 'button', text: '화면 전환',
      onclick: function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* 무시 */ }
        App.render();
      },
    });
  }

  function loadProject(file) {
    App.io.readJsonFile(file, function (err, data) {
      if (err) { App.ui.toast(err.message, 'danger'); return; }
      try {
        if (!st.sales) {
          st.pendingProject = data;
          act.applyProject(data);
          App.ui.toast('작업을 불러왔습니다. 데이터를 넣으면 이어서 적용됩니다.', 'ok', 6000);
        } else {
          var notes = act.applyProject(data);
          App.ui.toast('작업을 불러왔습니다. 외생변수 ' + st.cards.length + '개', 'ok');
          notes.forEach(function (n) { App.ui.toast(n, 'warn', 8000); });
        }
        act.persist();
        App.render();
      } catch (e) {
        App.ui.toast(e.message, 'danger');
      }
    });
  }

  var theme = themeToggle();
  var body = h('main', { id: 'view' });

  function header() {
    var tabs = h('nav', { class: 'tabs no-print', role: 'tablist' }, TABS.map(function (t, i) {
      var disabled = t.key !== 'data' && !st.ds;
      return h('button', {
        class: 'tab' + (st.tab === t.key ? ' is-on' : ''), type: 'button', role: 'tab',
        'aria-selected': st.tab === t.key ? 'true' : 'false', disabled: disabled,
        onclick: function () { st.tab = t.key; App.render(); window.scrollTo(0, 0); },
      }, [h('span', { class: 'tab__num', text: String(i + 1) }), t.label]);
    }));
    return h('header', { class: 'app__head no-print' }, [
      h('div', { class: 'brandmark' }, [
        h('span', { class: 'brandmark__logo', 'aria-hidden': 'true' }),
        h('div', null, [
          h('h1', { class: 'app__title', text: '디스플레이 수요 시뮬레이터' }),
          h('div', { class: 'app__sub', text: '지역 x OEM M/S trend 와 외생변수 시나리오로 보는 차량 디스플레이 TAM' }),
        ]),
      ]),
      h('div', { class: 'app__spacer' }),
      tabs,
      h('div', { class: 'app__spacer' }),
      h('button', { class: 'btn btn--sm btn--ghost', type: 'button', text: '도움말', onclick: showHelp }),
      h('button', { class: 'btn btn--sm', type: 'button', text: '작업 저장', title: '시나리오와 설정을 파일(.json)로 내려받습니다. 판매 실적은 담지 않습니다.', onclick: function () {
        var name = App.io.saveProject();
        App.ui.toast(name + ' 로 저장했습니다. 판매 실적은 들어 있지 않습니다.', 'ok');
      } }),
      App.w.fileButton('작업 불러오기', '.json', loadProject),
      theme,
    ]);
  }

  var headEl = null;

  function render() {
    var root = App.dom.qs('#app');
    var y = window.scrollY;
    if (headEl) headEl.remove();
    headEl = header();
    root.insertBefore(headEl, body);
    App.dom.clear(body);
    var view = App.views[st.tab] || App.views.data;
    view(body);
    window.scrollTo(0, y);
  }

  function start() {
    var root = App.dom.qs('#app');
    root.appendChild(body);
    // 지난번 작업(시나리오, 설정)이 브라우저에 남아 있으면 데이터를 넣을 때 이어서 적용합니다.
    var saved = act.restorable();
    if (saved && ((saved.cards && saved.cards.length) || (saved.scenarios && saved.scenarios.some(function (s) { return s.cards && s.cards.length; })))) {
      st.pendingProject = saved;
      act.applyProject(saved);
    }
    render();
    if (st.pendingProject) {
      App.ui.toast('지난 작업(외생변수 ' + st.cards.length + '개)을 이어서 씁니다. 데이터를 다시 불러오세요.', 'info', 6000);
    }
  }

  App.render = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
