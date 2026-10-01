/* 화면 조각. 전역 App.w. 색과 간격은 CSS 클래스로만 정합니다. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;

  function field(label, control, hint) {
    return h('label', { class: 'field' }, [
      h('span', { class: 'field__label', text: label }),
      control,
      hint ? h('span', { class: 'field__hint', text: hint }) : null,
    ]);
  }

  /** options: Array<string | {value, label}> */
  function select(options, value, onchange, attrs) {
    var el = h('select', Object.assign({ class: 'input input--sm' }, attrs || {}));
    options.forEach(function (o) {
      var v = typeof o === 'object' ? o.value : o;
      var l = typeof o === 'object' ? o.label : o;
      var opt = h('option', { value: v, text: l });
      if (String(v) === String(value)) opt.selected = true;
      el.appendChild(opt);
    });
    el.addEventListener('change', function () { onchange(el.value); });
    return el;
  }

  function number(value, onchange, attrs) {
    var el = h('input', Object.assign({ class: 'input input--sm input--num', type: 'number', value: value === null || value === undefined ? '' : value }, attrs || {}));
    el.addEventListener('change', function () { onchange(el.value === '' ? null : Number(el.value)); });
    return el;
  }

  function dropZone(main, sub, accept, onFile) {
    var input = h('input', {
      type: 'file', accept: accept, style: { display: 'none' },
      onchange: function (e) {
        if (e.target.files && e.target.files[0]) onFile(e.target.files[0]);
        e.target.value = '';
      },
    });
    var zone = h('div', {
      class: 'drop drop--sm', tabindex: '0', role: 'button',
      onclick: function () { input.click(); },
      onkeydown: function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); } },
      ondragover: function (e) { e.preventDefault(); zone.classList.add('is-over'); },
      ondragleave: function () { zone.classList.remove('is-over'); },
      ondrop: function (e) {
        e.preventDefault();
        zone.classList.remove('is-over');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) onFile(e.dataTransfer.files[0]);
      },
    }, [h('div', { class: 'drop__main', text: main }), h('div', { class: 'drop__sub', text: sub }), input]);
    return zone;
  }

  /** 파일 선택 창만 여는 단추 */
  function fileButton(label, accept, onFile, cls) {
    var input = h('input', {
      type: 'file', accept: accept, style: { display: 'none' },
      onchange: function (e) {
        if (e.target.files && e.target.files[0]) onFile(e.target.files[0]);
        e.target.value = '';
      },
    });
    return h('span', null, [h('button', { class: cls || 'btn btn--sm', type: 'button', text: label, onclick: function () { input.click(); } }), input]);
  }

  function notes(list) {
    if (!list || !list.length) return null;
    return h('ul', { class: 'notes' }, list.map(function (n) {
      var level = typeof n === 'string' ? 'warn' : n.level;
      var msg = typeof n === 'string' ? n : n.message;
      var tag = level === 'error' ? '오류' : level === 'warn' ? '확인' : '정보';
      return h('li', { class: 'note note--' + level }, [h('span', { class: 'note__tag', text: tag }), h('span', { text: msg })]);
    }));
  }

  function kpi(label, value, sub, tone) {
    return h('div', { class: 'kpi' }, [
      h('div', { class: 'kpi__label', text: label }),
      h('div', { class: 'kpi__value', text: value }),
      sub ? h('div', { class: 'kpi__sub' + (tone ? ' kpi__sub--' + tone : ''), text: sub }) : null,
    ]);
  }

  /** 부호에 따라 up/down. 색만으로 뜻을 전하지 않도록 글자에 부호가 항상 붙어 있습니다. */
  function tone(v) {
    return v > 0 ? 'up' : v < 0 ? 'down' : '';
  }

  function table(columns, rows, opts) {
    var o = opts || {};
    var thead = h('thead', null, h('tr', null, columns.map(function (c) {
      var label = typeof c === 'object' ? c.label : c;
      var num = typeof c === 'object' && c.num;
      return h('th', { class: 'th' + (num ? ' num' : ''), scope: 'col', text: label });
    })));
    var tbody = h('tbody');
    rows.forEach(function (r, i) {
      var tr = h('tr', { class: (o.onRowClick ? 'is-clickable' : '') + (o.selected && o.selected(i) ? ' is-selected' : '') });
      r.forEach(function (cell, j) {
        var c = columns[j];
        var num = typeof c === 'object' && c.num;
        if (cell && cell.nodeType) tr.appendChild(h('td', { class: num ? 'num' : '' }, cell));
        else tr.appendChild(h('td', { class: num ? 'num' : '', text: cell === null || cell === undefined ? '' : String(cell) }));
      });
      if (o.onRowClick) tr.addEventListener('click', function () { o.onRowClick(i); });
      tbody.appendChild(tr);
    });
    return h('div', { class: 'table__scroll table__scroll--auto' }, h('table', { class: 'table' }, [thead, tbody]));
  }

  /** 몇 개 중 하나를 고르는 단추 묶음. options: [{value, label}] */
  function segmented(options, value, onchange, label) {
    return h('div', { class: 'seg', role: 'radiogroup', 'aria-label': label || '' }, options.map(function (o) {
      var on = String(o.value) === String(value);
      return h('button', {
        class: 'seg__btn' + (on ? ' is-on' : ''), type: 'button', role: 'radio', 'aria-checked': on ? 'true' : 'false',
        text: o.label, title: o.title || null,
        onclick: function () { if (!on) onchange(o.value); },
      });
    }));
  }

  /** 브랜드 고유 색. 판매량 순위 8위까지 --viz-1..8, 그 아래는 회색, 기타는 옅은 회색.
      브랜드 순서는 데이터 탭의 관측 브랜드 순서(전 지역 판매량 순)라 지역을 바꿔도 같은 브랜드는 같은 색입니다. */
  function brandColor(ds, brand) {
    if (brand === App.sim.OTHER) return 'var(--c-border-strong)';
    var i = ds.brands.indexOf(brand);
    return i >= 0 && i < 8 ? 'var(--viz-' + (i + 1) + ')' : 'var(--c-fg-subtle)';
  }

  /** 제목 옆 작은 물음표. 누르면 설명이 열립니다. */
  function help(title, text) {
    return h('button', {
      class: 'help', type: 'button', text: '?', 'aria-label': title + ' 설명',
      onclick: function (e) {
        e.preventDefault();
        App.ui.modal({ title: title, body: text, actions: [{ label: '닫기', kind: 'primary' }] });
      },
    });
  }

  /** 패널 머리: 제목, 설명 한 줄, 오른쪽 도구 */
  function head(title, sub, tools) {
    return h('div', { class: 'phead' }, [
      h('div', { class: 'phead__text' }, [
        h('h2', { class: 'panel__title', text: title }),
        sub ? h('p', { class: 'panel__hint', text: sub }) : null,
      ]),
      tools ? h('div', { class: 'phead__tools' }, tools) : null,
    ]);
  }

  App.w = {
    segmented: segmented,
    brandColor: brandColor,
    help: help,
    head: head, field: field, select: select, number: number, dropZone: dropZone, fileButton: fileButton, notes: notes, kpi: kpi, tone: tone, table: table };
})(window);
