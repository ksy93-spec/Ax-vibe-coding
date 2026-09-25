/* 모듈 로더. 전역 App.registry.
 *
 * data/modules.js 에 적힌 목록을 보고 data/<id>/data.js 를 하나씩 불러옵니다.
 * file:// 에서는 fetch 로 로컬 파일을 읽지 못하므로 <script> 태그 주입을 씁니다.
 * 없는 모듈은 onerror 로 걸러지고 나머지는 정상 표시됩니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  /** 계약에 맞는지 확인합니다. 문제를 숨기지 않고 화면에 보여주려고 목록으로 돌려줍니다. */
  function validate(id, mod) {
    var problems = [];
    if (!mod || typeof mod !== 'object') return ['data.js 가 window.__PORTAL__["' + id + '"] 에 객체를 넣지 않았습니다.'];
    if (!mod.title) problems.push('title 이 없습니다.');
    (mod.charts || []).forEach(function (c, i) {
      var where = 'charts[' + i + ']';
      if (!Array.isArray(c.x)) problems.push(where + '.x 가 배열이 아닙니다.');
      if (!Array.isArray(c.series) || !c.series.length) {
        problems.push(where + '.series 가 비었습니다.');
        return;
      }
      c.series.forEach(function (s, j) {
        if (!s.name) problems.push(where + '.series[' + j + '].name 이 없습니다.');
        if (!Array.isArray(s.values)) {
          problems.push(where + '.series[' + j + '].values 가 배열이 아닙니다.');
        } else if (Array.isArray(c.x) && s.values.length !== c.x.length) {
          problems.push(where + '.series[' + j + '] 의 값 개수(' + s.values.length +
                        ')가 x 개수(' + c.x.length + ')와 다릅니다.');
        }
      });
      if (c.series.length > 8) {
        problems.push(where + ' 의 계열이 8개를 넘습니다. 색을 더 만들지 말고 "기타"로 묶거나 차트를 나누세요.');
      }
    });
    if (mod.table) {
      if (!Array.isArray(mod.table.columns)) problems.push('table.columns 가 배열이 아닙니다.');
      if (!Array.isArray(mod.table.rows)) problems.push('table.rows 가 배열이 아닙니다.');
    }
    return problems;
  }

  /**
   * load() -> Promise<{ modules: [{id, data, problems}], missing: string[] }>
   */
  function load() {
    var ids = global.__MODULES__ || [];
    global.__PORTAL__ = global.__PORTAL__ || {};
    return Promise.all(ids.map(function (id) {
      return loadScript('data/' + id + '/data.js').then(function (ok) {
        return { id: id, ok: ok };
      });
    })).then(function (results) {
      var modules = [];
      var missing = [];
      results.forEach(function (r) {
        var data = global.__PORTAL__[r.id];
        if (!r.ok || !data) {
          missing.push(r.id);
          return;
        }
        modules.push({ id: r.id, data: data, problems: validate(r.id, data) });
      });
      return { modules: modules, missing: missing };
    });
  }

  App.registry = { load: load, validate: validate };
})(window);
