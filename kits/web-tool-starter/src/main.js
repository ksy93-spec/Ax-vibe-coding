/* 앱 진입점. 여기부터 사내에서 고칩니다. */
(function (global) {
  'use strict';
  var App = global.App;
  var h = App.dom.h;
  var clear = App.dom.clear;
  var toast = App.ui.toast;

  var store = App.createStore({
    columns: [],
    records: [],
    fileName: '',
    encoding: '',
  });

  var table = null;

  function themeToggle() {
    var root = document.documentElement;
    var saved = null;
    try { saved = localStorage.getItem('theme'); } catch (e) { /* 사내 정책으로 막힐 수 있습니다 */ }
    if (saved) root.setAttribute('data-theme', saved);

    return h('button', {
      class: 'btn btn--sm',
      type: 'button',
      text: '화면 전환',
      onclick: function () {
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        root.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) { /* 무시 */ }
      },
    });
  }

  function dropZone(onFiles) {
    var input = h('input', {
      type: 'file',
      accept: '.csv,.txt,.tsv',
      style: { display: 'none' },
      onchange: function (e) {
        if (e.target.files && e.target.files.length) onFiles(e.target.files);
        e.target.value = '';
      },
    });

    var zone = h('div', {
      class: 'drop',
      tabindex: '0',
      role: 'button',
      onclick: function () { input.click(); },
      onkeydown: function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
      },
      ondragover: function (e) { e.preventDefault(); zone.classList.add('is-over'); },
      ondragleave: function () { zone.classList.remove('is-over'); },
      ondrop: function (e) {
        e.preventDefault();
        zone.classList.remove('is-over');
        if (e.dataTransfer.files && e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
      },
    }, [
      h('div', { class: 'drop__main', text: 'CSV 파일을 끌어다 놓거나 눌러서 선택하세요' }),
      h('div', { class: 'drop__sub', text: 'UTF-8 과 CP949(엑셀 기본) 둘 다 읽습니다. 파일은 브라우저 밖으로 나가지 않습니다.' }),
      input,
    ]);
    return zone;
  }

  function handleFiles(files) {
    var file = files[0];
    App.csv.readFile(file, function (err, result) {
      if (err) {
        toast(err.message, 'danger');
        return;
      }
      store.set({
        columns: result.columns,
        records: result.records,
        fileName: file.name,
        encoding: result.encoding,
      });
      toast(
        file.name + ' 을 읽었습니다. ' +
        result.records.length.toLocaleString('ko-KR') + '행, 인코딩 ' +
        (result.encoding === 'cp949' ? 'CP949' : 'UTF-8'),
        'ok'
      );
      renderData();
    });
  }

  function exportVisible() {
    var s = store.get();
    if (!table || !s.records.length) {
      toast('내보낼 데이터가 없습니다.', 'warn');
      return;
    }
    var rows = table.getVisibleRecords();
    var csvText = App.csv.stringify(table.getColumns(), rows);
    var base = s.fileName.replace(/\.[^.]+$/, '') || 'export';
    var stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    // 파일명은 csv.download 이 ASCII 로 정리합니다. 한글 이름은 크로미움에서 통째로 버려집니다.
    var saved = App.csv.download(base + '_' + stamp + '.csv', csvText);
    toast(rows.length.toLocaleString('ko-KR') + '행을 ' + saved + ' 로 내려받았습니다.', 'ok');
  }

  var elDataPanel = h('div');

  function renderData() {
    var s = store.get();
    clear(elDataPanel);
    if (!s.records.length) return;

    elDataPanel.appendChild(
      h('div', { class: 'panel' }, [
        h('div', { class: 'row', style: { marginBottom: 'var(--sp-4)' } }, [
          h('h2', { class: 'panel__title', text: s.fileName }),
          h('span', { class: 'badge badge--ok', text: s.encoding === 'cp949' ? 'CP949' : 'UTF-8' }),
          h('span', { class: 'badge', text: s.columns.length + '개 열' }),
          h('div', { class: 'app__spacer' }),
          h('button', { class: 'btn btn--sm', type: 'button', text: '내보내기 (CSV)', onclick: exportVisible }),
          h('button', {
            class: 'btn btn--sm', type: 'button', text: '비우기',
            onclick: function () {
              App.ui.confirm('불러온 데이터를 모두 지웁니다.', function (ok) {
                if (!ok) return;
                store.set({ columns: [], records: [], fileName: '', encoding: '' });
                table = null;
                renderData();
              }, { danger: true, okLabel: '지우기' });
            },
          }),
        ]),
        (function () {
          var mount = h('div');
          setTimeout(function () {
            table = App.createTable(mount, {
              columns: s.columns,
              records: s.records,
              pageSize: 50,
              onRowClick: function (rec) { showRow(rec); },
            });
          }, 0);
          return mount;
        })(),
      ])
    );
  }

  function showRow(rec) {
    var body = h('div');
    Object.keys(rec).forEach(function (k) {
      body.appendChild(
        h('div', { style: { marginBottom: 'var(--sp-3)' } }, [
          h('div', { style: { color: 'var(--c-fg-muted)', fontSize: 'var(--text-xs)' }, text: k }),
          h('div', { text: rec[k] === '' ? '(빈 값)' : String(rec[k]) }),
        ])
      );
    });
    App.ui.modal({ title: '행 상세', body: body, actions: [{ label: '닫기', kind: 'primary' }] });
  }

  function render() {
    var root = App.dom.qs('#app');
    clear(root);
    root.appendChild(
      h('header', { class: 'app__head' }, [
        h('div', null, [
          h('h1', { class: 'app__title', text: '사내 도구 스타터' }),
          h('div', { class: 'app__sub', text: '이 화면을 지우고 실제 도구를 만드세요. 표, 파일 읽기, 알림은 그대로 씁니다.' }),
        ]),
        h('div', { class: 'app__spacer' }),
        themeToggle(),
      ])
    );

    root.appendChild(
      h('div', { class: 'panel' }, [
        h('h2', { class: 'panel__title', text: '데이터 불러오기' }),
        h('p', { class: 'panel__hint', text: '브라우저 안에서만 처리합니다. 서버로 전송하는 코드는 들어 있지 않습니다.' }),
        dropZone(handleFiles),
      ])
    );

    root.appendChild(elDataPanel);

    // TODO(사내): 실제 기능은 여기에 붙입니다.
    // 붙이기 전에 specs/ 의 명세를 먼저 확정하세요.
    root.appendChild(
      h('div', { class: 'panel' }, [
        h('h2', { class: 'panel__title', text: '여기에 기능을 추가합니다' }),
        h('p', { class: 'panel__hint', text: 'src/main.js 의 TODO(사내) 주석 위치입니다. 라이브러리 파일(src/lib/)은 건드리지 마세요.' }),
      ])
    );

    renderData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }

  App.store = store;
})(window);
