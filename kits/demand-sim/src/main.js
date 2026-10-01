/* 진입점: 머리글, 탭, 화면 그리기. 전역 App.render. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var st = App.state;
  var act = App.actions;

  var TABS = [
    { key: 'data', label: '1. 데이터' },
    { key: 'scenario', label: '2. 시나리오' },
    { key: 'result', label: '3. 결과' },
    { key: 'report', label: '4. 보고서' },
  ];

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
    var tabs = h('nav', { class: 'tabs no-print', role: 'tablist' }, TABS.map(function (t) {
      var disabled = t.key !== 'data' && !st.ds;
      return h('button', {
        class: 'tab' + (st.tab === t.key ? ' is-on' : ''), type: 'button', role: 'tab',
        'aria-selected': st.tab === t.key ? 'true' : 'false', disabled: disabled, text: t.label,
        onclick: function () { st.tab = t.key; App.render(); window.scrollTo(0, 0); },
      });
    }));
    return h('header', { class: 'app__head no-print' }, [
      h('div', null, [
        h('h1', { class: 'app__title', text: '권역별 수요 시뮬레이터' }),
        h('div', { class: 'app__sub', text: '지역 x 브랜드 x 파워트레인 24개월 예측과 외생변수 시나리오' }),
      ]),
      h('div', { class: 'app__spacer' }),
      tabs,
      h('div', { class: 'app__spacer' }),
      h('button', { class: 'btn btn--sm', type: 'button', text: '작업 저장', title: '시나리오와 설정을 .json 으로 내려받습니다. 판매 실적은 담지 않습니다.', onclick: function () {
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
