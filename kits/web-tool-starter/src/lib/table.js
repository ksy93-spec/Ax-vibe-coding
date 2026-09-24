/* 정렬, 검색, 페이지 넘김이 되는 표. 전역 App.createTable.
 * 외부 라이브러리 없이 동작하고, 수만 행에서도 DOM 은 한 페이지 분량만 만듭니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var h = App.dom.h;
  var clear = App.dom.clear;

  /** 숫자처럼 보이면 숫자로, 아니면 문자열로 비교합니다. */
  function compare(a, b) {
    var na = parseFloat(String(a).replace(/,/g, ''));
    var nb = parseFloat(String(b).replace(/,/g, ''));
    var aNum = !isNaN(na) && /^[\s\d.,+-]+$/.test(String(a));
    var bNum = !isNaN(nb) && /^[\s\d.,+-]+$/.test(String(b));
    if (aNum && bNum) return na - nb;
    return String(a).localeCompare(String(b), 'ko');
  }

  /**
   * createTable(mountEl, options)
   * options: { columns: string[], records: object[], pageSize?: number,
   *            onRowClick?: (record, index) => void }
   */
  function createTable(mount, options) {
    var state = {
      columns: options.columns || [],
      records: options.records || [],
      pageSize: options.pageSize || 50,
      page: 0,
      sortKey: null,
      sortDir: 1,
      query: '',
    };

    var elTable = h('table', { class: 'table' });
    var elHead = h('thead');
    var elBody = h('tbody');
    elTable.appendChild(elHead);
    elTable.appendChild(elBody);

    var elCount = h('span', { class: 'table__count' });
    var elPager = h('div', { class: 'table__pager' });
    var elSearch = h('input', {
      class: 'input',
      type: 'search',
      placeholder: '전체 검색',
      oninput: function (e) {
        state.query = e.target.value;
        state.page = 0;
        render();
      },
    });

    var elWrap = h('div', { class: 'table-wrap' }, [
      h('div', { class: 'table__bar' }, [elSearch, elCount]),
      h('div', { class: 'table__scroll' }, elTable),
      elPager,
    ]);
    clear(mount).appendChild(elWrap);

    function filtered() {
      var q = state.query.trim().toLowerCase();
      var rows = state.records;
      if (q) {
        rows = rows.filter(function (r) {
          for (var i = 0; i < state.columns.length; i++) {
            var v = r[state.columns[i]];
            if (v !== null && v !== undefined && String(v).toLowerCase().indexOf(q) >= 0) return true;
          }
          return false;
        });
      }
      if (state.sortKey) {
        var key = state.sortKey;
        var dir = state.sortDir;
        rows = rows.slice().sort(function (a, b) {
          return compare(a[key], b[key]) * dir;
        });
      }
      return rows;
    }

    function renderHead() {
      clear(elHead);
      var tr = h('tr');
      state.columns.forEach(function (col) {
        var active = state.sortKey === col;
        tr.appendChild(
          h('th', {
            scope: 'col',
            class: 'th' + (active ? ' is-sorted' : ''),
            'aria-sort': active ? (state.sortDir === 1 ? 'ascending' : 'descending') : 'none',
            tabindex: '0',
            onclick: function () { sortBy(col); },
            onkeydown: function (e) {
              if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); sortBy(col); }
            },
          }, [
            h('span', { text: col }),
            h('span', { class: 'th__arrow', text: active ? (state.sortDir === 1 ? '↑' : '↓') : '' }),
          ])
        );
      });
      elHead.appendChild(tr);
    }

    function sortBy(col) {
      if (state.sortKey === col) state.sortDir = state.sortDir * -1;
      else { state.sortKey = col; state.sortDir = 1; }
      state.page = 0;
      render();
    }

    function renderBody(rows) {
      clear(elBody);
      var start = state.page * state.pageSize;
      var slice = rows.slice(start, start + state.pageSize);
      if (!slice.length) {
        elBody.appendChild(
          h('tr', null, h('td', {
            class: 'table__empty',
            colspan: String(Math.max(state.columns.length, 1)),
            text: state.records.length ? '조건에 맞는 행이 없습니다.' : '데이터가 없습니다.',
          }))
        );
        return;
      }
      slice.forEach(function (rec, i) {
        var tr = h('tr', {
          onclick: options.onRowClick ? function () { options.onRowClick(rec, start + i); } : null,
          class: options.onRowClick ? 'is-clickable' : null,
        });
        state.columns.forEach(function (col) {
          var v = rec[col];
          tr.appendChild(h('td', { title: v == null ? '' : String(v) }, v == null ? '' : String(v)));
        });
        elBody.appendChild(tr);
      });
    }

    function renderPager(total) {
      clear(elPager);
      var pages = Math.max(1, Math.ceil(total / state.pageSize));
      if (state.page > pages - 1) state.page = pages - 1;
      if (pages <= 1) return;
      function btn(label, targetPage, disabled) {
        return h('button', {
          class: 'btn btn--sm',
          type: 'button',
          disabled: disabled ? true : null,
          text: label,
          onclick: function () { state.page = targetPage; render(); },
        });
      }
      elPager.appendChild(btn('‹ 이전', state.page - 1, state.page === 0));
      elPager.appendChild(h('span', { class: 'table__pageinfo', text: state.page + 1 + ' / ' + pages }));
      elPager.appendChild(btn('다음 ›', state.page + 1, state.page >= pages - 1));
    }

    function render() {
      var rows = filtered();
      renderHead();
      renderBody(rows);
      renderPager(rows.length);
      elCount.textContent =
        rows.length === state.records.length
          ? state.records.length.toLocaleString('ko-KR') + '행'
          : rows.length.toLocaleString('ko-KR') + ' / ' + state.records.length.toLocaleString('ko-KR') + '행';
    }

    render();

    return {
      /** 데이터 교체 */
      setData: function (columns, records) {
        state.columns = columns;
        state.records = records;
        state.page = 0;
        state.sortKey = null;
        render();
      },
      /** 현재 검색/정렬이 적용된 행. 내보내기에 씁니다. */
      getVisibleRecords: filtered,
      getColumns: function () { return state.columns.slice(); },
      render: render,
    };
  }

  App.createTable = createTable;
})(window);
