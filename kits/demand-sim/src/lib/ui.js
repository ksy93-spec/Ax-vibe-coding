/* 토스트와 모달. 전역 App.ui. dom.js 가 먼저 로드되어야 합니다. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;

  var toastHost = null;

  function ensureHost() {
    if (!toastHost) {
      toastHost = h('div', { class: 'toast-host', role: 'status', 'aria-live': 'polite' });
      document.body.appendChild(toastHost);
    }
    return toastHost;
  }

  /**
   * toast('저장했습니다', 'ok')
   * @param {string} message
   * @param {'info'|'ok'|'warn'|'danger'} [kind]
   * @param {number} [ms] 기본 3200
   */
  function toast(message, kind, ms) {
    var host = ensureHost();
    var el = h('div', { class: 'toast toast--' + (kind || 'info'), text: message });
    host.appendChild(el);
    var timer = setTimeout(remove, ms || 3200);
    el.addEventListener('click', remove);
    function remove() {
      clearTimeout(timer);
      if (!el.parentNode) return;
      el.classList.add('is-leaving');
      setTimeout(function () {
        if (el.parentNode) el.parentNode.removeChild(el);
      }, 180);
    }
    return remove;
  }

  /**
   * 모달을 엽니다. 포커스 가둠과 Esc 닫기가 들어 있습니다.
   * @param {{title: string, body: Node|string, actions?: Array<{label:string, kind?:string, onClick?:Function}>}} opts
   * @returns {{close: Function}}
   */
  function modal(opts) {
    var lastFocused = document.activeElement;
    var dialog = h('div', {
      class: 'modal',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title,
    }, [
      h('div', { class: 'modal__head' }, [
        h('h2', { class: 'modal__title', text: opts.title }),
        h('button', {
          class: 'btn btn--ghost btn--icon',
          type: 'button',
          'aria-label': '닫기',
          text: '✕',
          onclick: close,
        }),
      ]),
      h('div', { class: 'modal__body' }, typeof opts.body === 'string'
        ? h('p', { text: opts.body })
        : opts.body),
      h('div', { class: 'modal__foot' }, (opts.actions || []).map(function (a) {
        return h('button', {
          class: 'btn ' + (a.kind === 'primary' ? 'btn--primary' : a.kind === 'danger' ? 'btn--danger' : ''),
          type: 'button',
          text: a.label,
          onclick: function () {
            if (a.onClick) a.onClick(close);
            else close();
          },
        });
      })),
    ]);

    var overlay = h('div', { class: 'overlay', onclick: function (e) {
      if (e.target === overlay) close();
    } }, dialog);

    document.body.appendChild(overlay);
    document.body.classList.add('is-modal-open');

    var focusables = dialog.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusables.length) focusables[focusables.length - 1].focus();

    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener('keydown', onKey);

    function close() {
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.classList.remove('is-modal-open');
      if (lastFocused && lastFocused.focus) lastFocused.focus();
    }

    return { close: close };
  }

  /** 확인 대화상자. cb(true|false) */
  function confirm(message, cb, opts) {
    var o = opts || {};
    modal({
      title: o.title || '확인',
      body: message,
      actions: [
        { label: o.cancelLabel || '취소', onClick: function (close) { close(); cb(false); } },
        {
          label: o.okLabel || '확인',
          kind: o.danger ? 'danger' : 'primary',
          onClick: function (close) { close(); cb(true); },
        },
      ],
    });
  }

  App.ui = { toast: toast, modal: modal, confirm: confirm };
})(window);
