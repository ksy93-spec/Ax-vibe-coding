/* 진입점: 머리글, 탭, 화면 그리기. 전역 App.render. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var st = App.state;
  var act = App.actions;

  var TABS = [
    { key: 'data', label: '데이터' },
    { key: 'overview', label: '한눈에 보기' },
    { key: 'scenario', label: '시나리오' },
    { key: 'result', label: '상세 결과' },
    { key: 'report', label: '보고서' },
  ];

  var GLOSSARY = [
    ['시장 전체 판매', '그 지역에서 한 달에 팔리는 차 전체 대수. 흔히 TIV 나 TAM 이라고 부릅니다.'],
    ['동력원', '전기차(BEV), 플러그인 하이브리드(PHEV), 하이브리드(HEV), 내연기관(ICE) 같은 차의 구동 방식. 파워트레인이라고도 합니다.'],
    ['기본 전망', '변수 카드 없이 지금 흐름이 그대로 이어질 때의 예측. 모든 시나리오는 이것과 비교합니다.'],
    ['시나리오', '"이런 일이 생기면?" 하나. 변수 카드 여러 장을 묶은 것입니다.'],
    ['변수 카드', '판매를 움직이는 일 하나(보조금 종료, 규제, 관세, 신차 등). 무엇이, 어디서, 얼마나, 언제 바뀌는지를 넣습니다.'],
    ['%p (퍼센트포인트)', '비율끼리의 차이. 전기차 비중 40% 가 37% 가 되면 -3%p 입니다. -3% 와는 다릅니다.'],
    ['막차 수요', '보조금이 끝나기 전처럼, 시작 전에 미리 사 두는 수요. 시작 뒤에는 그만큼 판매가 줄어듭니다.'],
    ['가능 범위', '카드의 가능성과 영향 범위를 무작위로 뽑아 여러 번 계산한 결과 중 가운데 80%. 차트의 옅은 띠입니다.'],
    ['디스플레이 수요', '차량 판매 x 대당 디스플레이 수. 여기에 브랜드별 우리 공급 비중을 곱하면 우리 몫이 됩니다.'],
  ];

  function showHelp() {
    var body = h('div', { class: 'helpdoc' }, [
      h('h3', { class: 'sub-title', text: '쓰는 순서' }),
      h('ol', { class: 'helpdoc__steps' }, [
        h('li', { text: '데이터: 월별 판매 CSV 를 넣고(처음이면 예시 데이터), 지켜볼 브랜드와 디스플레이 가정을 정합니다.' }),
        h('li', { text: '한눈에 보기: 지도에서 지역을 눌러 브랜드 구성과 우리 디스플레이 점유율을 봅니다.' }),
        h('li', { text: '시나리오: "보조금 종료" 같은 변수 카드를 넣습니다.' }),
        h('li', { text: '상세 결과: 브랜드, 지역별로 기본 전망과 시나리오를 비교합니다.' }),
        h('li', { text: '보고서: 인쇄하거나 PDF, CSV 로 내보냅니다.' }),
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
          App.ui.toast('작업을 불러왔습니다. 시나리오 ' + st.scenarios.length + '개', 'ok');
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
          h('h1', { class: 'app__title', text: '권역별 수요 시뮬레이터' }),
          h('div', { class: 'app__sub', text: '지역별 브랜드 판매 전망과 "이런 일이 생기면?" 시나리오' }),
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
    if (saved && saved.scenarios && saved.scenarios.some(function (s) { return s.cards && s.cards.length; })) {
      st.pendingProject = saved;
      act.applyProject(saved);
    }
    render();
    if (st.pendingProject) {
      App.ui.toast('지난 작업(시나리오 ' + st.scenarios.length + '개)을 이어서 씁니다. 데이터를 다시 불러오세요.', 'info', 6000);
    }
  }

  App.render = render;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})(window);
