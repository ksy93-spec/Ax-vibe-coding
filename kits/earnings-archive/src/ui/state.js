/* 자료 읽기, 작업본, 저장. 전역 App.data.
 *
 * 자료는 세 겹입니다.
 *   파일(base)    data/*.js. 모두가 같이 보는 원본
 *   작업본(work)  이 브라우저의 localStorage. 화면에서 고친 것 중 아직 파일로 저장하지 않은 것
 *   화면          작업본이 파일보다 rev 가 크면 작업본, 아니면 파일
 * 저장하면 data 폴더에 파일을 바로 쓰거나(폴더 연결), 파일을 내려받게 합니다(연결 못 할 때).
 * 내려받은 파일을 data 폴더에 덮어쓰고 새로 고치면 파일 rev 가 작업본을 따라와 작업본이 저절로 지워집니다.
 */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  var F = App.ea.files;

  var WORK_KEY = 'ea.work.v1';
  var listeners = [];

  var base = { companies: null, fx: null, reports: {}, transcripts: {} };
  var work = { companies: null, fx: null, reports: {}, transcripts: {} };
  var dirHandle = null;

  function emit() {
    listeners.forEach(function (fn) {
      fn();
    });
  }
  function onChange(fn) {
    listeners.push(fn);
  }

  /* ---------- 읽기 ---------- */

  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () {
        resolve(true);
      };
      s.onerror = function () {
        resolve(false);
      };
      document.head.appendChild(s);
    });
  }

  function refreshBase() {
    var c = F.collect(global.EA_FILES || []);
    base.companies = c.companies || base.companies || { rev: 0, companies: [] };
    base.fx = c.fx || base.fx || { rev: 0, rates: {} };
    Object.assign(base.reports, c.reports);
    Object.assign(base.transcripts, c.transcripts);
  }

  /** 처음 한 번. companies.js 와 fx.js 는 index.html 이 이미 읽었고, 회사별 자료를 여기서 읽습니다. */
  function boot() {
    refreshBase();
    readWork();
    var ids = (base.companies.companies || []).map(function (c) {
      return c.id;
    });
    return Promise.all(ids.map(function (id) {
      return loadScript('data/reports/' + id + '.js');
    })).then(function () {
      refreshBase();
      dropStale();
      return restoreHandle();
    });
  }

  /** 원문은 볼 때만 읽습니다. */
  function loadTranscripts(id) {
    if (base.transcripts[id] || work.transcripts[id]) return Promise.resolve(transcriptsOf(id));
    return loadScript('data/transcripts/' + id + '.js').then(function () {
      refreshBase();
      return transcriptsOf(id);
    });
  }

  /* ---------- 작업본 ---------- */

  function readWork() {
    try {
      var raw = global.localStorage.getItem(WORK_KEY);
      if (raw) {
        var w = JSON.parse(raw);
        work = {
          companies: w.companies || null,
          fx: w.fx || null,
          reports: w.reports || {},
          transcripts: w.transcripts || {},
        };
      }
    } catch (e) {
      /* 저장소를 못 쓰는 환경. 작업본 없이 갑니다. */
    }
  }

  function writeWork() {
    try {
      global.localStorage.setItem(WORK_KEY, JSON.stringify(work));
      return true;
    } catch (e) {
      App.ui.toast('브라우저 저장 공간이 찼습니다. 지금 파일로 저장하세요 (관리 탭).', 'danger', 8000);
      return false;
    }
  }

  /** 파일이 작업본을 따라왔으면 작업본을 지웁니다. */
  function dropStale() {
    var changed = false;
    if (work.companies && !F.isAhead(work.companies, base.companies)) {
      work.companies = null;
      changed = true;
    }
    if (work.fx && !F.isAhead(work.fx, base.fx)) {
      work.fx = null;
      changed = true;
    }
    ['reports', 'transcripts'].forEach(function (k) {
      Object.keys(work[k]).forEach(function (id) {
        if (!F.isAhead(work[k][id], base[k][id])) {
          delete work[k][id];
          changed = true;
        }
      });
    });
    if (changed) writeWork();
  }

  /* ---------- 화면에서 쓰는 값 ---------- */

  function pick(w, b) {
    return F.isAhead(w, b) ? w : b;
  }
  function companiesData() {
    return pick(work.companies, base.companies);
  }
  function companies() {
    return companiesData().companies || [];
  }
  function company(id) {
    var list = companies();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function fx() {
    return pick(work.fx, base.fx);
  }
  function report(id) {
    return pick(work.reports[id], base.reports[id]) || App.ea.merge.emptyReport(id);
  }
  function reports() {
    var out = {};
    companies().forEach(function (c) {
      out[c.id] = report(c.id);
    });
    return out;
  }
  function transcriptsOf(id) {
    return pick(work.transcripts[id], base.transcripts[id]) || { company: id, rev: 0, items: {} };
  }

  /* ---------- 고치기 ---------- */

  function putCompanies(list) {
    var cur = companiesData();
    work.companies = F.bump(Object.assign({}, cur, { companies: list }), base.companies);
    writeWork();
    emit();
  }
  function putFx(data) {
    work.fx = F.bump(data, base.fx);
    writeWork();
    emit();
  }
  function putReport(id, data) {
    var d = Object.assign({}, data, { company: id });
    work.reports[id] = F.bump(d, base.reports[id]);
    writeWork();
    emit();
  }
  function putTranscript(id, period, item) {
    var cur = transcriptsOf(id);
    var items = Object.assign({}, cur.items);
    if (item) items[period] = item;
    else delete items[period];
    work.transcripts[id] = F.bump({ company: id, rev: cur.rev, items: items }, base.transcripts[id]);
    if (!writeWork()) {
      delete work.transcripts[id];
      return false;
    }
    emit();
    return true;
  }

  /** 파일로 저장하지 않은 것 목록 */
  function dirty() {
    var out = [];
    if (F.isAhead(work.companies, base.companies)) out.push({ kind: 'companies', id: '', data: work.companies });
    if (F.isAhead(work.fx, base.fx)) out.push({ kind: 'fx', id: '', data: work.fx });
    Object.keys(work.reports).forEach(function (id) {
      if (F.isAhead(work.reports[id], base.reports[id])) out.push({ kind: 'report', id: id, data: work.reports[id] });
    });
    Object.keys(work.transcripts).forEach(function (id) {
      if (F.isAhead(work.transcripts[id], base.transcripts[id])) out.push({ kind: 'transcripts', id: id, data: work.transcripts[id] });
    });
    out.forEach(function (d) {
      d.path = F.pathOf(d.kind, d.id);
    });
    return out;
  }

  /** 작업본 버리기 (파일 상태로 돌아감) */
  function discard(item) {
    if (item.kind === 'companies' || item.kind === 'fx') work[item.kind] = null;
    else delete work[item.kind === 'report' ? 'reports' : 'transcripts'][item.id];
    writeWork();
    emit();
  }

  /* ---------- 저장: 폴더에 바로 쓰기 ---------- */

  function canWriteFolder() {
    return typeof global.showDirectoryPicker === 'function';
  }

  // 폴더 연결을 IndexedDB 에 기억해 두면 다음에 열 때 권한 확인 한 번으로 다시 씁니다.
  function idb(mode, fn) {
    return new Promise(function (resolve) {
      try {
        var req = global.indexedDB.open('ea-archive', 1);
        req.onupgradeneeded = function () {
          req.result.createObjectStore('kv');
        };
        req.onerror = function () {
          resolve(null);
        };
        req.onsuccess = function () {
          var tx = req.result.transaction('kv', mode);
          var r = fn(tx.objectStore('kv'));
          tx.oncomplete = function () {
            resolve(r && 'result' in r ? r.result : null);
          };
          tx.onerror = function () {
            resolve(null);
          };
        };
      } catch (e) {
        resolve(null);
      }
    });
  }
  function restoreHandle() {
    if (!canWriteFolder() || !global.indexedDB) return Promise.resolve();
    return idb('readonly', function (s) {
      return s.get('dir');
    }).then(function (h) {
      if (h) dirHandle = h;
    });
  }

  function folderName() {
    return dirHandle ? dirHandle.name : '';
  }

  /** 사용자가 data 폴더를 고릅니다. companies.js 가 없으면 다른 폴더로 봅니다. */
  function connectFolder() {
    return global.showDirectoryPicker({ id: 'ea-data', mode: 'readwrite' }).then(function (h) {
      return h.getFileHandle('companies.js').then(function () {
        dirHandle = h;
        idb('readwrite', function (s) {
          return s.put(h, 'dir');
        });
        emit();
        return h.name;
      }, function () {
        throw new Error('고른 폴더에 companies.js 가 없습니다. 킷 안의 data 폴더를 고르세요.');
      });
    });
  }

  function ensurePermission(h) {
    if (!h.queryPermission) return Promise.resolve(true);
    return h.queryPermission({ mode: 'readwrite' }).then(function (p) {
      if (p === 'granted') return true;
      return h.requestPermission({ mode: 'readwrite' }).then(function (q) {
        return q === 'granted';
      });
    });
  }

  function writeFile(root, path, text) {
    var parts = path.split('/');
    var name = parts.pop();
    var p = Promise.resolve(root);
    parts.forEach(function (dir) {
      p = p.then(function (d) {
        return d.getDirectoryHandle(dir, { create: true });
      });
    });
    return p.then(function (d) {
      return d.getFileHandle(name, { create: true });
    }).then(function (fh) {
      return fh.createWritable();
    }).then(function (w) {
      return w.write(text).then(function () {
        return w.close();
      });
    });
  }

  /** 저장 안 된 것을 모두 폴더에 씁니다. 쓴 것은 파일 상태가 되고 작업본에서 빠집니다. */
  function saveToFolder() {
    if (!dirHandle) return Promise.reject(new Error('data 폴더가 연결되어 있지 않습니다.'));
    var items = dirty();
    return ensurePermission(dirHandle).then(function (okay) {
      if (!okay) throw new Error('폴더에 쓸 권한을 받지 못했습니다.');
      return items.reduce(function (p, it) {
        return p.then(function () {
          return writeFile(dirHandle, it.path, F.toText(it.kind, it.data)).then(function () {
            if (it.kind === 'report') base.reports[it.id] = it.data;
            else if (it.kind === 'transcripts') base.transcripts[it.id] = it.data;
            else base[it.kind] = it.data;
          });
        });
      }, Promise.resolve());
    }).then(function () {
      dropStale();
      emit();
      return items.length;
    });
  }

  /* ---------- 저장: 내려받기 ---------- */

  function downloadText(name, text, type) {
    var blob = new Blob([text], { type: (type || 'text/javascript') + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  /** 파일 하나 내려받기. 이름은 경로의 마지막 부분 (gm.js). 어디에 둘지는 화면이 안내합니다. */
  function downloadItem(it) {
    downloadText(it.path.split('/').pop(), F.toText(it.kind, it.data));
  }

  App.data = {
    boot: boot,
    onChange: onChange,
    companies: companies,
    company: company,
    fx: fx,
    report: report,
    reports: reports,
    transcriptsOf: transcriptsOf,
    loadTranscripts: loadTranscripts,
    putCompanies: putCompanies,
    putFx: putFx,
    putReport: putReport,
    putTranscript: putTranscript,
    dirty: dirty,
    discard: discard,
    canWriteFolder: canWriteFolder,
    connectFolder: connectFolder,
    folderName: folderName,
    saveToFolder: saveToFolder,
    downloadItem: downloadItem,
    downloadText: downloadText,
  };
})(window);
