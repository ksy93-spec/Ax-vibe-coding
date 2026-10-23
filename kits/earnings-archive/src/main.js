/* 머리글, 탭, 화면 전환. 화면 상태는 주소 # 뒤에 남겨 새로 고쳐도 같은 화면이 나옵니다. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var f = App.f;

  var TABS = [
    { id: 'overview', label: '한눈에 보기' },
    { id: 'company', label: '회사별' },
    { id: 'import', label: '자료 넣기' },
    { id: 'search', label: '찾기' },
    { id: 'admin', label: '관리' },
  ];

  function readHash() {
    var out = { tab: 'overview' };
    String(global.location.hash || '').replace(/^#/, '').split('&').forEach(function (kv) {
      var p = kv.split('=');
      if (p[0]) out[decodeURIComponent(p[0])] = decodeURIComponent(p[1] || '');
    });
    if (!TABS.some(function (t) { return t.id === out.tab; })) out.tab = 'overview';
    return out;
  }
  function writeHash(r) {
    var keep = ['tab', 'company', 'period', 'edit', 'q', 'group', 'topic', 'view'];
    var s = keep.filter(function (k) {
      return r[k];
    }).map(function (k) {
      return encodeURIComponent(k) + '=' + encodeURIComponent(r[k]);
    }).join('&');
    if (('#' + s) !== global.location.hash) history.replaceState(null, '', '#' + s);
  }

  var current = readHash();
  /** 지금 화면 상태 {tab, company, period, edit, q, group, topic, view} */
  App.where = function () {
    return current;
  };
  /**
   * 화면 이동. go({tab: 'company', company: 'gm'}) 처럼 바꿀 키만 줍니다.
   * 탭이 바뀌면 준 키만 남기고, 값이 빈 키는 지웁니다.
   */
  App.go = function (patch, keepScroll) {
    var next = patch.tab && patch.tab !== current.tab ? Object.assign({}, patch) : Object.assign({}, current, patch);
    Object.keys(next).forEach(function (k) {
      if (next[k] === null || next[k] === undefined || next[k] === '') delete next[k];
    });
    current = next;
    render();
    if (!keepScroll) global.scrollTo(0, 0);
  };

  var root = document.getElementById('app');

  function header() {
    var cs = App.data.companies();
    var oem = cs.filter(function (c) { return c.group === 'OEM'; }).length;
    var dirty = App.data.dirty();
    var dark = document.documentElement.getAttribute('data-theme') === 'dark';
    return h('header', { class: 'app__head' }, [
      h('div', null, [
        h('h1', { class: 'app__title', text: '주요 고객 실적 자료' }),
        h('div', { class: 'app__sub', text: '완성차 ' + oem + '곳, 부품사 ' + (cs.length - oem) + '곳 · 금액 단위 백만 달러(MUSD)' }),
      ]),
      h('div', { class: 'app__spacer' }),
      dirty.length ? h('button', {
        class: 'btn btn--sm dirty-btn',
        type: 'button',
        title: '화면에서 고친 내용이 아직 data 폴더 파일에 없습니다',
        onclick: function () { App.go({ tab: 'admin' }); },
      }, ['파일로 저장 안 됨 ', h('span', { class: 'dirty-btn__n', text: String(dirty.length) })]) : null,
      f.btn(dark ? '밝게' : '어둡게', function () {
        var next = dark ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        try { global.localStorage.setItem('ea.theme', next); } catch (e) { /* 무시 */ }
        render();
      }, 'ghost sm', { 'aria-label': '화면 밝기 바꾸기' }),
    ]);
  }

  function tabs(cur) {
    return h('nav', { class: 'tabs', role: 'tablist' }, TABS.map(function (t) {
      return h('button', {
        class: 'tabs__btn' + (t.id === cur ? ' is-active' : ''),
        type: 'button',
        role: 'tab',
        'aria-selected': t.id === cur ? 'true' : 'false',
        text: t.label,
        onclick: function () { App.go({ tab: t.id }); },
      });
    }));
  }

  // 화면 파일(src/ui/view-*.js)이 App.views.<탭 id> 에 그리기 함수를 붙여 둡니다.
  var VIEWS = App.views || {};

  function render() {
    var r = current;
    writeHash(r);
    App.dom.clear(root);
    root.appendChild(header());
    root.appendChild(tabs(r.tab));
    var main = h('main', { class: 'view view--' + r.tab });
    root.appendChild(main);
    try {
      VIEWS[r.tab](main, r);
    } catch (e) {
      main.appendChild(f.empty('화면을 그리다 오류가 났습니다', String(e && e.message), []));
      if (global.console) console.error(e);
    }
  }
  App.render = render;

  try {
    var theme = global.localStorage.getItem('ea.theme');
    if (theme) document.documentElement.setAttribute('data-theme', theme);
  } catch (e) { /* 무시 */ }

  App.data.onChange(render);
  // 주소창에서 # 뒤를 고치거나 즐겨찾기로 열 때. writeHash 는 replaceState 라 이 이벤트를 부르지 않습니다.
  global.addEventListener('hashchange', function () {
    current = readHash();
    render();
  });
  root.appendChild(h('p', { class: 'loading', text: '자료를 읽는 중...' }));
  App.data.boot().then(render, function (e) {
    App.dom.clear(root);
    root.appendChild(f.empty('자료를 읽지 못했습니다', String(e && e.message)));
  });
})(window);
