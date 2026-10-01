/* DOM 헬퍼. 전역 App.dom 에 붙습니다. 의존성 없음. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  /** 엘리먼트 생성. h('div', {class:'x', onclick:fn}, ['텍스트', child]) */
  function h(tag, props, children) {
    var el = document.createElement(tag);
    if (props) {
      Object.keys(props).forEach(function (k) {
        var v = props[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'class') el.className = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else el.setAttribute(k, v === true ? '' : v);
      });
    }
    append(el, children);
    return el;
  }

  function append(el, children) {
    if (children === null || children === undefined) return el;
    if (!Array.isArray(children)) children = [children];
    children.forEach(function (c) {
      if (c === null || c === undefined || c === false) return;
      el.appendChild(typeof c === 'object' && c.nodeType ? c : document.createTextNode(String(c)));
    });
    return el;
  }

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }
  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }
  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }
  function on(el, type, handler, opts) {
    el.addEventListener(type, handler, opts);
    return function () {
      el.removeEventListener(type, handler, opts);
    };
  }

  App.dom = { h: h, append: append, qs: qs, qsa: qsa, clear: clear, on: on };
})(window);
