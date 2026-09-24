/* 아주 작은 상태 저장소. 전역 App.createStore. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  /**
   * createStore(초기상태) -> { get, set, update, subscribe }
   * set 은 얕은 병합입니다. 바뀐 키가 없으면 구독자를 부르지 않습니다.
   */
  function createStore(initial) {
    var state = Object.assign({}, initial);
    var subs = [];

    function get() {
      return state;
    }

    function set(patch) {
      var changed = false;
      Object.keys(patch).forEach(function (k) {
        if (state[k] !== patch[k]) changed = true;
      });
      if (!changed) return state;
      var prev = state;
      state = Object.assign({}, state, patch);
      subs.forEach(function (fn) {
        fn(state, prev);
      });
      return state;
    }

    /** update('rows', fn) 처럼 한 키만 함수로 갱신 */
    function update(key, fn) {
      var patch = {};
      patch[key] = fn(state[key]);
      return set(patch);
    }

    function subscribe(fn) {
      subs.push(fn);
      return function () {
        var i = subs.indexOf(fn);
        if (i >= 0) subs.splice(i, 1);
      };
    }

    return { get: get, set: set, update: update, subscribe: subscribe };
  }

  App.createStore = createStore;
})(window);
