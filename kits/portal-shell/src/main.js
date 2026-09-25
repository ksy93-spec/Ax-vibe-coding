/* 포탈 셸. 모듈을 읽어 화면을 만듭니다.
 *
 * 여기서 고칠 일은 많지 않습니다. 기능을 늘리려면 data/ 아래 모듈을 추가하세요.
 * 포탈 코드를 고치지 않아도 화면에 붙습니다.
 */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var clear = App.dom.clear;

  var STALE_DAYS = 7;   // 이 일수보다 오래된 데이터는 화면에 표시합니다

  var state = { modules: [], missing: [], current: '__overview__' };
  var charts = [];

  function daysSince(text) {
    if (!text) return null;
    var t = Date.parse(String(text).replace(' ', 'T'));
    if (isNaN(t)) return null;
    return Math.floor((Date.now() - t) / 86400000);
  }

  function freshnessBadge(mod) {
    var d = daysSince(mod.updated_at);
    if (d === null) return h('span', { class: 'badge badge--warn', text: '갱신일 없음' });
    if (d > STALE_DAYS) return h('span', { class: 'badge badge--warn', text: d + '일 전' });
    return h('span', { class: 'badge', text: d <= 0 ? '오늘' : d + '일 전' });
  }

  function destroyCharts() {
    charts.forEach(function (c) { c.destroy(); });
    charts = [];
  }

  function themeToggle() {
    var root = document.documentElement;
    try {
      var saved = localStorage.getItem('portal-theme');
      if (saved) root.setAttribute('data-theme', saved);
    } catch (e) { /* 사내 정책으로 막힐 수 있습니다 */ }
    return h('button', {
      class: 'btn btn--sm', type: 'button', text: '화면 전환',
      onclick: function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('portal-theme', next); } catch (e) { /* 무시 */ }
        render();
      },
    });
  }

  function sidebar() {
    var nav = h('nav', { class: 'side', 'aria-label': '모듈 목록' });
    nav.appendChild(h('div', { class: 'side__brand' }, [
      h('div', { class: 'side__title', text: 'Market Intelligence' }),
      h('div', { class: 'side__sub', text: '통합 포탈' }),
    ]));

    var list = h('ul', { class: 'side__list' });
    list.appendChild(navItem('__overview__', '개요', null));
    state.modules.forEach(function (m) {
      list.appendChild(navItem(m.id, m.data.title || m.id, m.problems.length));
    });
    nav.appendChild(list);

    if (state.missing.length) {
      nav.appendChild(h('div', { class: 'side__note' }, [
        h('div', { text: '불러오지 못한 모듈' }),
        h('div', { class: 'side__missing', text: state.missing.join(', ') }),
      ]));
    }
    return nav;
  }

  function navItem(id, title, problemCount) {
    var active = state.current === id;
    return h('li', null, h('button', {
      class: 'side__item' + (active ? ' is-active' : ''),
      type: 'button',
      'aria-current': active ? 'page' : null,
      onclick: function () { state.current = id; render(); },
    }, [
      h('span', { text: title }),
      problemCount ? h('span', { class: 'side__warn', title: '계약 위반 ' + problemCount + '건', text: '!' }) : null,
    ]));
  }

  function overview() {
    var wrap = h('div');
    wrap.appendChild(h('header', { class: 'page__head' }, [
      h('div', null, [
        h('h1', { class: 'page__title', text: '개요' }),
        h('p', { class: 'page__sub', text: state.modules.length + '개 모듈' }),
      ]),
      h('div', { class: 'app__spacer' }),
      themeToggle(),
    ]));

    if (!state.modules.length) {
      wrap.appendChild(h('div', { class: 'panel' }, [
        h('h2', { class: 'panel__title', text: '아직 모듈이 없습니다' }),
        h('p', { class: 'panel__hint', text: 'data/modules.js 에 모듈 이름을 넣고, data/<이름>/data.js 를 만들면 여기에 나타납니다. 예시는 OFFLINE.md 를 보세요.' }),
      ]));
      return wrap;
    }

    state.modules.forEach(function (m) {
      var card = h('div', { class: 'panel' });
      card.appendChild(h('div', { class: 'row' }, [
        h('h2', { class: 'panel__title', text: m.data.title || m.id }),
        freshnessBadge(m.data),
        m.data.owner ? h('span', { class: 'badge', text: m.data.owner }) : null,
        h('div', { class: 'app__spacer' }),
        h('button', {
          class: 'btn btn--sm', type: 'button', text: '자세히',
          onclick: function () { state.current = m.id; render(); },
        }),
      ]));
      if (m.data.description) {
        card.appendChild(h('p', { class: 'panel__hint', text: m.data.description }));
      }
      if (m.data.kpis && m.data.kpis.length) {
        var kpiRow = h('div', { class: 'kpi-row' });
        App.renderKpis(kpiRow, m.data.kpis, m.data.format);
        card.appendChild(kpiRow);
      }
      wrap.appendChild(card);
    });
    return wrap;
  }

  function modulePage(m) {
    var d = m.data;
    var wrap = h('div');

    wrap.appendChild(h('header', { class: 'page__head' }, [
      h('div', null, [
        h('h1', { class: 'page__title', text: d.title || m.id }),
        h('p', { class: 'page__sub' }, [
          d.owner ? d.owner + ' · ' : '',
          d.updated_at ? '갱신 ' + d.updated_at : '갱신일 없음',
        ]),
      ]),
      h('div', { class: 'app__spacer' }),
      freshnessBadge(d),
      themeToggle(),
    ]));

    if (m.problems.length) {
      wrap.appendChild(h('div', { class: 'panel panel--warn' }, [
        h('h2', { class: 'panel__title', text: '모듈 계약 위반' }),
        h('p', { class: 'panel__hint', text: '아래 항목 때문에 화면이 비거나 어긋날 수 있습니다. data.js 를 만든 사람에게 전달하세요.' }),
        h('ul', null, m.problems.map(function (p) { return h('li', { text: p }); })),
      ]));
    }

    if (d.description) {
      wrap.appendChild(h('p', { class: 'page__desc', text: d.description }));
    }

    if (d.kpis && d.kpis.length) {
      var kpiRow = h('div', { class: 'kpi-row' });
      App.renderKpis(kpiRow, d.kpis, d.format);
      wrap.appendChild(kpiRow);
    }

    (d.charts || []).forEach(function (c) {
      if (!Array.isArray(c.series) || !c.series.length) return;
      var panel = h('div', { class: 'panel' });
      var mount = h('div');
      panel.appendChild(mount);
      wrap.appendChild(panel);
      // 패널이 DOM 에 붙은 뒤에 그려야 너비를 잴 수 있습니다.
      setTimeout(function () {
        charts.push(App.createChart(mount, {
          type: c.type === 'bar' ? 'bar' : 'line',
          title: c.title,
          x: c.x || [],
          series: c.series,
          format: c.format || d.format || 'number',
          height: c.height || 240,
        }));
      }, 0);
    });

    if (d.table && Array.isArray(d.table.columns) && Array.isArray(d.table.rows)) {
      var panel2 = h('div', { class: 'panel' });
      panel2.appendChild(h('h2', { class: 'panel__title', text: d.table.title || '상세 데이터' }));
      var mount2 = h('div');
      panel2.appendChild(mount2);
      wrap.appendChild(panel2);
      var records = d.table.rows.map(function (row) {
        var rec = {};
        d.table.columns.forEach(function (col, i) { rec[col] = row[i]; });
        return rec;
      });
      setTimeout(function () {
        App.createTable(mount2, { columns: d.table.columns, records: records, pageSize: 25 });
      }, 0);
    }

    if (d.notes) {
      wrap.appendChild(h('div', { class: 'panel' }, [
        h('h2', { class: 'panel__title', text: '메모' }),
        h('p', { class: 'panel__hint', text: d.notes }),
      ]));
    }
    return wrap;
  }

  function render() {
    destroyCharts();
    var root = App.dom.qs('#app');
    clear(root);
    root.appendChild(sidebar());

    var main = h('main', { class: 'main' });
    if (state.current === '__overview__') {
      main.appendChild(overview());
    } else {
      var m = state.modules.filter(function (x) { return x.id === state.current; })[0];
      main.appendChild(m ? modulePage(m) : overview());
    }
    root.appendChild(main);
  }

  function start() {
    App.registry.load().then(function (result) {
      state.modules = result.modules;
      state.missing = result.missing;
      render();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})(window);
