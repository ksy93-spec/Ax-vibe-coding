/* 큰 글씨 메모장 화면. 계산은 src/core.js(App.core) 에 있고, 여기는 화면, 저장, 받아쓰기, 알림을 다룹니다. */
(function () {
  'use strict';

  var APP_VERSION = '2026.10.08.2';
  var core = window.App.core;
  var KEY = 'big-memo.v1';
  var TAB_KEY = 'big-memo.tab';

  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function now() { return new Date(); }
  var narrowMq = window.matchMedia('(max-width: 899px)');
  function isNarrow() { return narrowMq.matches; }
  // 손가락으로 쓰는 기기에서는 저절로 자판이 올라오지 않게 초점을 옮기지 않습니다.
  var touch = window.matchMedia('(pointer: coarse)').matches;
  function focusSoft(e) { if (!touch) e.focus(); }

  var state;
  var storeOk = true;
  var lastSaved = null;
  var saveTimer = null;

  /* ---------- 저장 ---------- */

  function load() {
    var raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) { storeOk = false; }
    if (!raw) {
      var s = core.emptyState(now(), Math.random());
      if (window.innerWidth < 600) s.settings.size = 1; // 휴대폰은 처음 글씨를 한 단계 작게(32px)
      return s;
    }
    try {
      return core.normalize(JSON.parse(raw), now(), Math.random());
    } catch (e) {
      // 읽을 수 없는 저장값은 지우지 않고 옆에 남겨 둡니다.
      try { localStorage.setItem(KEY + '.broken-' + core.fileStamp(now()), raw); } catch (e2) { /* 무시 */ }
      setTimeout(function () { toast('저장된 메모를 읽지 못해 새로 시작합니다.'); }, 500);
      return core.emptyState(now(), Math.random());
    }
  }

  function saveNow() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      storeOk = true;
      lastSaved = now();
    } catch (e) {
      storeOk = false;
    }
    renderSaveState();
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 300);
  }

  function renderSaveState() {
    var s = $('save-state');
    $('store-warn').hidden = storeOk;
    if (!storeOk) { s.textContent = '저장 안 됨'; s.className = 'save-state bad'; return; }
    s.className = 'save-state';
    s.textContent = lastSaved ? '저장됨 ' + core.timeText(lastSaved) : '';
  }

  /* ---------- 공통 ---------- */

  var toastTimer = null;
  function toast(text, actionLabel, action) {
    var t = $('toast');
    t.textContent = '';
    t.appendChild(el('span', null, text));
    if (actionLabel) {
      var b = el('button', 'btn', actionLabel);
      b.type = 'button';
      b.onclick = function () { t.hidden = true; action(); };
      t.appendChild(b);
    }
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, actionLabel ? 9000 : 4500);
  }

  /** 확인 창. 예를 누르면 true. 기본 초점은 "그만두기" 입니다. */
  function ask(text, yesLabel) {
    return new Promise(function (resolve) {
      var d = $('confirm');
      $('confirm-text').textContent = text;
      $('confirm-yes').textContent = yesLabel;
      d.returnValue = '';
      d.onclose = function () { d.onclose = null; resolve(d.returnValue === 'yes'); };
      d.showModal();
      $('confirm-no').focus();
    });
  }

  function download(name, text, type) {
    var blob = new Blob([text], { type: type });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  /** box 안을 꽉 채우는 가장 큰 글씨 크기를 찾습니다. */
  function fit(box, textEl, max) {
    var cs = getComputedStyle(box);
    var availH = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (availH <= 0) return;
    var lo = 16, hi = max || 320, best = lo;
    // 낱말 중간에서 줄이 바뀌지 않는 가장 큰 크기를 찾고, 그래도 안 들어가는 아주 긴 낱말만 쪼갭니다.
    textEl.style.overflowWrap = 'normal';
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      textEl.style.fontSize = mid + 'px';
      if (textEl.offsetHeight <= availH && textEl.scrollWidth <= textEl.clientWidth + 1) { best = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    textEl.style.fontSize = best + 'px';
    if (textEl.scrollWidth > textEl.clientWidth + 1) textEl.style.overflowWrap = 'anywhere';
  }

  /* 휴대폰의 "뒤로" 단추. 겹쳐 연 화면(크게 보여주기, 메모 쓰는 칸, 자주 쓰는 말 판)을 하나씩 닫습니다. */
  var layers = [];
  function pushLayer(name, close) {
    layers.push({ name: name, close: close });
    history.pushState({ bigMemo: layers.length }, '');
  }
  function topLayer() { return layers.length ? layers[layers.length - 1].name : null; }
  function closeLayer(name) { if (topLayer() === name) history.back(); }
  window.addEventListener('popstate', function () {
    var l = layers.pop();
    if (l) l.close();
  });

  /* ---------- 보기 설정 ---------- */

  function applySettings() {
    var s = state.settings;
    var root = document.documentElement;
    root.setAttribute('data-theme', s.theme);
    root.style.setProperty('--memo', core.SIZES[s.size] + 'px');
    root.style.setProperty('--weight', s.bold ? '700' : '500');
    $('size-down').disabled = s.size <= 0;
    $('size-up').disabled = s.size >= core.SIZES.length - 1;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = getComputedStyle(root).getPropertyValue('--bg').trim() || '#ffffff';
    document.querySelectorAll('#set-theme .btn').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.theme === s.theme));
    });
    document.querySelectorAll('[data-awake]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.awake === s.keepAwake));
    });
    $('set-bold-on').setAttribute('aria-pressed', String(s.bold));
    $('set-bold-off').setAttribute('aria-pressed', String(!s.bold));
    $('set-sound-on').setAttribute('aria-pressed', String(s.sound));
    $('set-sound-off').setAttribute('aria-pressed', String(!s.sound));
    refit();
    updateWake();
  }

  function setSize(delta) {
    var n = state.settings.size + delta;
    if (n < 0 || n >= core.SIZES.length) return;
    state.settings.size = n;
    applySettings();
    save();
    toast('글씨 크기 ' + (n + 1) + ' / ' + core.SIZES.length);
  }

  /* ---------- 화면 켜 두기 ---------- */

  var wakeLock = null;
  var wakeBusy = false;
  function updateWake() {
    if (!navigator.wakeLock || wakeBusy) return;
    var k = state.settings.keepAwake;
    var want = document.visibilityState === 'visible' && (k === 'always' || (k === 'talk' && tab === 'talk'));
    if (want && !wakeLock) {
      wakeBusy = true;
      navigator.wakeLock.request('screen').then(function (l) {
        wakeLock = l;
        l.addEventListener('release', function () { if (wakeLock === l) wakeLock = null; });
      }).catch(function () { /* 배터리 절약 모드 등으로 거절되면 그냥 둡니다 */ })
        .then(function () { wakeBusy = false; });
    } else if (!want && wakeLock) {
      var l = wakeLock;
      wakeLock = null;
      l.release().catch(function () {});
    }
  }

  /* ---------- 탭 ---------- */

  var tab = 'memo';
  function showTab(name) {
    if (tab !== name) stopListening();
    tab = name;
    document.querySelectorAll('.tab').forEach(function (b) {
      b.setAttribute('aria-selected', String(b.dataset.tab === name));
    });
    document.querySelectorAll('.view').forEach(function (v) { v.hidden = v.dataset.view !== name; });
    try { localStorage.setItem(TAB_KEY, name); } catch (e) { /* 무시 */ }
    if (name === 'memo') focusSoft($('memo-text'));
    if (name === 'talk') { renderTalkNow(); focusSoft($('talk-input')); }
    if (name === 'alarm') renderAlarms();
    updateWake();
  }

  /* ---------- 받아쓰기 ---------- */

  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  // 안드로이드 Chrome 은 연속 모드에서 같은 말을 겹쳐 돌려주는 일이 있어, 한 마디씩 듣고 다시 시작합니다.
  var ANDROID = /Android/i.test(navigator.userAgent);
  var listener = null; // { where: 'memo'|'talk', rec, active }

  var SPEECH_ERRORS = {
    unsupported: '이 브라우저에서는 받아쓰기가 되지 않습니다. 안드로이드는 Chrome, 아이폰과 아이패드는 Safari 로 여세요.',
    insecure: '받아쓰기는 https 로 시작하는 주소로 열어야 됩니다.',
    denied: '마이크 사용이 막혀 있습니다. 주소창 옆 자물쇠(또는 설정)에서 마이크를 허용해 주세요.',
    nomic: '마이크를 찾을 수 없습니다.',
    network: '받아쓰기는 인터넷이 연결되어 있어야 합니다.',
    fail: '받아쓰기가 멈췄습니다. 다시 눌러 주세요.'
  };

  /** where 에서 받아쓰기를 시작합니다. onFinal(글), onInterim(듣는 중인 글) */
  function startListening(where, onFinal, onInterim) {
    stopListening();
    if (!window.isSecureContext) { toast(SPEECH_ERRORS.insecure); return false; }
    if (!SR) { toast(SPEECH_ERRORS.unsupported); return false; }
    var L = { where: where, rec: null, active: true, quickEnds: 0, startedAt: 0, timer: null, onFinal: onFinal, onInterim: onInterim };
    listener = L;
    begin(L);
    renderListening();
    return true;
  }

  function begin(L) {
    var rec = new SR();
    rec.lang = 'ko-KR';
    rec.continuous = !ANDROID;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.onresult = function (e) {
      var arr = [];
      for (var i = 0; i < e.results.length; i++) arr.push({ final: e.results[i].isFinal, text: e.results[i][0].transcript });
      var r = core.splitSpeech(arr, e.resultIndex);
      r.finals.forEach(function (t) { L.onFinal(t); });
      L.onInterim(r.interim);
      L.quickEnds = 0;
    };
    rec.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') stopListening('denied');
      else if (e.error === 'audio-capture') stopListening('nomic');
      else if (e.error === 'network') stopListening('network');
      // no-speech, aborted 는 onend 에서 다시 시작합니다.
    };
    rec.onend = function () {
      L.onInterim('');
      if (!L.active || listener !== L) return;
      // 시작하자마자 끝나기를 되풀이하면 멈춥니다(마이크를 다른 앱이 쓰는 경우 등).
      if (Date.now() - L.startedAt < 1500) L.quickEnds++;
      if (L.quickEnds > 4) { stopListening('fail'); return; }
      L.timer = setTimeout(function () { if (L.active) begin(L); }, 200);
    };
    L.rec = rec;
    L.startedAt = Date.now();
    try { rec.start(); } catch (e) { stopListening('fail'); }
  }

  function stopListening(reason) {
    var L = listener;
    if (!L) return;
    L.active = false;
    listener = null;
    clearTimeout(L.timer);
    if (L.rec) {
      L.rec.onend = null;
      try { L.rec.stop(); } catch (e) { /* 무시 */ }
    }
    L.onInterim('');
    renderListening();
    if (reason && SPEECH_ERRORS[reason]) toast(SPEECH_ERRORS[reason]);
  }

  function renderListening() {
    var w = listener && listener.where;
    $('memo-mic').setAttribute('aria-pressed', String(w === 'memo'));
    $('memo-mic').textContent = w === 'memo' ? '그만 듣기' : '말로 쓰기';
    $('memo-listen').hidden = w !== 'memo';
    $('talk-mic').setAttribute('aria-pressed', String(w === 'talk'));
    $('talk-mic').textContent = w === 'talk' ? '그만 듣기' : '말 듣기 시작';
    $('talk-listen').hidden = w !== 'talk';
  }

  /* ---------- 메모장 ---------- */

  function liveMemos() { return state.memos.filter(function (m) { return !m.deletedAt; }); }

  function currentMemo() {
    var list = liveMemos();
    var m = list.filter(function (x) { return x.id === state.currentId; })[0];
    if (m) return m;
    m = core.sortMemos(list)[0];
    if (!m) m = createMemo('');
    state.currentId = m.id;
    return m;
  }

  function createMemo(text) {
    var t = Date.now();
    var m = { id: core.uid(t, Math.random()), text: text, created: t, updated: t, pinned: false, deletedAt: null };
    state.memos.push(m);
    return m;
  }

  /** 좁은 화면에서 목록과 쓰는 칸을 바꿉니다. 쓰는 칸은 "뒤로" 로 닫히는 겹친 화면입니다. */
  function setPane(pane) {
    var v = $('view-memo');
    if (v.dataset.pane === pane) return;
    v.dataset.pane = pane;
    if (pane === 'editor' && isNarrow()) pushLayer('editor', function () { stopListening(); v.dataset.pane = 'list'; renderList(); });
  }

  var listTimer = null;
  function renderListSoon() {
    clearTimeout(listTimer);
    listTimer = setTimeout(renderList, 250);
  }

  function renderList() {
    clearTimeout(listTimer);
    var cur = currentMemo();
    var q = $('memo-search').value;
    var list = core.searchMemos(core.sortMemos(state.memos), q);
    var ul = $('memo-list');
    ul.textContent = '';
    var n = now();
    list.forEach(function (m) {
      var li = el('li');
      var b = el('button', 'memo-item');
      b.type = 'button';
      if (m.id === cur.id) b.setAttribute('aria-current', 'true');
      var title = el('span', 'memo-title');
      if (m.pinned) title.appendChild(el('span', 'pin-mark', '[고정] '));
      title.appendChild(document.createTextNode(core.titleOf(m.text)));
      b.appendChild(title);
      b.appendChild(el('span', 'memo-meta', core.stampText(m.updated, n)));
      b.onclick = function () { selectMemo(m.id); };
      li.appendChild(b);
      ul.appendChild(li);
    });
    if (!list.length) ul.appendChild(el('li', 'empty-note', q ? '"' + q + '" 이(가) 들어간 메모가 없습니다.' : '메모가 없습니다.'));
    $('trash-count').textContent = String(state.memos.length - liveMemos().length);
    $('memo-pin').textContent = cur.pinned ? '고정 풀기' : '위에 고정';
  }

  function renderEditor() {
    var m = currentMemo();
    var ta = $('memo-text');
    if (ta.value !== m.text) ta.value = m.text;
  }

  function selectMemo(id, focus) {
    if (state.currentId !== id) stopListening();
    state.currentId = id;
    renderEditor();
    renderList();
    save();
    setPane('editor');
    var ta = $('memo-text');
    ta.scrollTop = 0;
    if (focus) {
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    }
  }

  function newMemo() {
    $('memo-search').value = '';
    var cur = currentMemo();
    if (!cur.text.trim() && !cur.pinned) { selectMemo(cur.id, true); return; } // 빈 메모를 여러 장 만들지 않습니다.
    selectMemo(createMemo('').id, true);
  }

  function onMemoInput() {
    var m = currentMemo();
    m.text = $('memo-text').value;
    m.updated = Date.now();
    save();
    renderListSoon();
  }

  function toggleMemoMic() {
    if (listener && listener.where === 'memo') { stopListening(); return; }
    var ok = startListening('memo', function (text) {
      var ta = $('memo-text');
      var pos = document.activeElement === ta ? ta.selectionStart : ta.value.length;
      var r = core.insertAt(ta.value, pos, text);
      ta.value = r.text;
      if (document.activeElement === ta) ta.setSelectionRange(r.cursor, r.cursor);
      else ta.scrollTop = ta.scrollHeight;
      onMemoInput();
    }, function (interim) {
      $('memo-listen-text').textContent = interim ? '듣는 중: ' + interim : '듣고 있습니다. 말씀하세요.';
    });
    if (ok) $('memo-listen-text').textContent = '듣고 있습니다. 말씀하세요.';
  }

  async function deleteMemo() {
    var m = currentMemo();
    if (m.text.trim()) {
      var ok = await ask('"' + core.titleOf(m.text, 20) + '" 메모를 지울까요?\n지운 메모는 30일 안에 되살릴 수 있습니다.', '지우기');
      if (!ok) return;
    }
    stopListening();
    m.deletedAt = Date.now();
    state.currentId = null;
    if (!m.text.trim()) state.memos = state.memos.filter(function (x) { return x !== m; }); // 빈 메모는 휴지통에 넣지 않습니다.
    renderEditor();
    renderList();
    saveNow();
    closeLayer('editor');
    if (m.text.trim()) toast('메모를 지웠습니다.', '되살리기', function () { restoreMemo(m.id); });
  }

  function restoreMemo(id) {
    var m = state.memos.filter(function (x) { return x.id === id; })[0];
    if (!m) return;
    m.deletedAt = null;
    m.updated = Date.now();
    selectMemo(id);
    saveNow();
    toast('메모를 되살렸습니다.');
  }

  function togglePin() {
    var m = currentMemo();
    m.pinned = !m.pinned;
    renderList();
    save();
    toast(m.pinned ? '이 메모를 목록 맨 위에 고정했습니다.' : '고정을 풀었습니다.');
  }

  /** 카카오톡, 문자 등으로 보냅니다. 보내기 창이 없는 브라우저에서는 글을 복사합니다. */
  async function shareText(text) {
    if (!text.trim()) { toast('보낼 글이 없습니다.'); return; }
    if (navigator.share) {
      try { await navigator.share({ text: text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast('글을 복사했습니다. 카카오톡이나 문자 칸을 길게 눌러 붙여 넣으세요.');
    } catch (e) {
      toast('이 브라우저에서는 보내기를 할 수 없습니다.');
    }
  }

  function renderTrash() {
    var ul = $('trash-list');
    ul.textContent = '';
    var gone = state.memos.filter(function (m) { return m.deletedAt; })
      .sort(function (a, b) { return b.deletedAt - a.deletedAt; });
    var n = now();
    gone.forEach(function (m) {
      var li = el('li');
      var t = el('span', 'memo-title', core.titleOf(m.text));
      t.appendChild(el('span', 'memo-meta', core.stampText(m.deletedAt, n) + ' 에 지움'));
      li.appendChild(t);
      var b = el('button', 'btn', '되살리기');
      b.type = 'button';
      b.onclick = function () { $('trash').close(); restoreMemo(m.id); };
      li.appendChild(b);
      ul.appendChild(li);
    });
    if (!gone.length) ul.appendChild(el('li', 'empty-note', '지운 메모가 없습니다.'));
    $('trash-empty').disabled = !gone.length;
  }

  async function emptyTrash() {
    $('trash').close();
    var ok = await ask('지운 메모를 모두 없앨까요?\n없앤 메모는 되살릴 수 없습니다.', '모두 없애기');
    if (!ok) return;
    state.memos = state.memos.filter(function (m) { return !m.deletedAt; });
    renderList();
    saveNow();
    toast('지운 메모를 모두 없앴습니다.');
  }

  /* ---------- 화면 가득 보여주기 ---------- */

  function openShow(text) {
    var t = $('show-text');
    t.textContent = text && text.trim() ? text.trim() : '(쓴 글이 없습니다)';
    var wasOpen = !$('show').hidden;
    $('show').hidden = false;
    $('show-box').classList.remove('flipped');
    $('show-flip').setAttribute('aria-pressed', 'false');
    if (!wasOpen) pushLayer('show', hideShow);
    // 전체 화면은 문서 전체에 겁니다. #show 에 걸면 그 위에 알림 화면이 보이지 않습니다.
    var de = document.documentElement;
    if (de.requestFullscreen && !document.fullscreenElement) {
      de.requestFullscreen().catch(function () { /* 안 되는 기기에서는 창 안에서만 */ });
    }
    requestAnimationFrame(function () { fit($('show-box'), t, 400); });
  }

  function hideShow() {
    if ($('show').hidden) return;
    $('show').hidden = true;
    if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(function () {});
    refit();
  }

  function closeShow() {
    if (topLayer() === 'show') history.back();
    else hideShow();
  }

  /** 메모장에서는 고른 글(없으면 메모 전체), 대화하기에서는 지금 큰 글. */
  function showCurrent() {
    if (tab === 'talk') { openShow(talkNowText()); return; }
    var ta = $('memo-text');
    var sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    openShow(sel.trim() ? sel : ta.value);
  }

  /* ---------- 대화하기 ---------- */

  var interimTalk = '';

  function talkNowText() {
    var v = $('talk-input').value;
    if (v.trim()) return v;
    var last = state.talk[state.talk.length - 1];
    return last ? last.text : '';
  }

  function renderTalkNow() {
    var t = $('talk-now');
    var typed = $('talk-input').value.trim();
    var text, cls = '';
    if (!typed && interimTalk) { text = interimTalk; cls = 'interim'; }
    else {
      text = talkNowText();
      if (!text.trim()) { text = '"말 듣기 시작" 을 누르면 상대가 하는 말이 여기에 크게 나옵니다.'; cls = 'placeholder'; }
    }
    t.textContent = text;
    t.className = 'fit-text' + (cls ? ' ' + cls : '');
    if (tab === 'talk') fit($('talk-now-box'), t, cls === 'placeholder' ? 40 : 220);
  }

  function renderPhrases() {
    var box = $('phrase-list');
    box.textContent = '';
    state.phrases.forEach(function (p) {
      var b = el('button', 'phrase', p);
      b.type = 'button';
      b.onclick = function () { sendTalk(p); closeLayer('panel'); };
      box.appendChild(b);
    });
    if (!state.phrases.length) box.appendChild(el('p', 'hint', '설정에서 자주 쓰는 말을 넣을 수 있습니다.'));
  }

  function renderTalkHistory() {
    var ol = $('talk-history');
    ol.textContent = '';
    state.talk.slice().reverse().forEach(function (x) {
      var li = el('li');
      li.appendChild(el('span', 'talk-time', core.timeText(new Date(x.at)) + (x.voice ? ' · 말' : '')));
      li.appendChild(document.createTextNode(x.text));
      li.onclick = function () { openShow(x.text); };
      ol.appendChild(li);
    });
    if (!state.talk.length) ol.appendChild(el('li', 'empty-note', '아직 대화가 없습니다.'));
  }

  function sendTalk(text, voice) {
    text = String(text || '').trim();
    if (!text) return;
    var line = { at: Date.now(), text: text };
    if (voice) line.voice = true;
    state.talk.push(line);
    if (state.talk.length > core.TALK_KEEP) state.talk = state.talk.slice(-core.TALK_KEEP);
    if (!voice) { $('talk-input').value = ''; growInput(); }
    renderTalkNow();
    renderTalkHistory();
    save();
  }

  function sendTyped() {
    sendTalk($('talk-input').value);
    focusSoft($('talk-input'));
  }

  function onTalkKey(e) {
    // 한글 입력 중(조합 중)의 Enter 는 글자를 확정하는 것이라 보내지 않습니다.
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
      e.preventDefault();
      sendTyped();
    }
  }

  // 휴대폰 자판은 Enter 를 keydown 대신 입력 이벤트로만 알려 주는 경우가 있습니다.
  var shiftDown = false;
  function onTalkBeforeInput(e) {
    if (e.inputType === 'insertLineBreak' && !e.isComposing && !shiftDown) {
      e.preventDefault();
      sendTyped();
    }
  }

  function growInput() {
    var t = $('talk-input');
    t.style.height = 'auto';
    t.style.height = t.scrollHeight + 6 + 'px';
  }

  function toggleTalkMic() {
    if (listener && listener.where === 'talk') { stopListening(); return; }
    startListening('talk', function (text) { interimTalk = ''; sendTalk(text, true); }, function (interim) {
      interimTalk = interim;
      renderTalkNow();
    });
  }

  function openPanel(which) {
    var side = $('talk-side');
    side.dataset.panel = which;
    if (!side.classList.contains('open')) {
      side.classList.add('open');
      pushLayer('panel', function () { side.classList.remove('open'); refit(); });
    }
  }

  function addPhrase() {
    var text = talkNowText().trim();
    if (!text) { toast('먼저 글을 쓰세요.'); return; }
    if (state.phrases.indexOf(text) >= 0) { toast('이미 자주 쓰는 말에 있습니다.'); return; }
    state.phrases.push(text);
    renderPhrases();
    save();
    toast('자주 쓰는 말에 넣었습니다.');
  }

  function talkToMemo() {
    if (!state.talk.length) { toast('남길 대화가 없습니다.'); return; }
    var m = createMemo(core.talkToText(state.talk, now()));
    state.currentId = m.id;
    renderEditor();
    renderList();
    saveNow();
    toast('대화를 메모장에 남겼습니다.', '메모장 보기', function () { showTab('memo'); setPane('editor'); });
  }

  async function clearTalk() {
    if (!state.talk.length && !$('talk-input').value) return;
    var ok = await ask('지난 대화를 모두 지울까요?', '지우기');
    if (!ok) return;
    state.talk = [];
    $('talk-input').value = '';
    growInput();
    renderTalkNow();
    renderTalkHistory();
    saveNow();
  }

  /* ---------- 알림 ---------- */

  function fillTimeSelects() {
    var h = $('alarm-hour'), m = $('alarm-min');
    for (var i = 1; i <= 12; i++) h.appendChild(new Option(String(i), String(i)));
    for (var j = 0; j < 60; j += 5) m.appendChild(new Option((j < 10 ? '0' : '') + j, String(j)));
    // 기본값: 지금부터 5분 단위로 올린 시각
    var d = new Date(Date.now() + 5 * 60 * 1000);
    var mm = Math.ceil(d.getMinutes() / 5) * 5;
    if (mm === 60) { d.setHours(d.getHours() + 1); mm = 0; }
    var hh = d.getHours();
    $('alarm-ampm').value = hh < 12 ? 'am' : 'pm';
    h.value = String(hh % 12 === 0 ? 12 : hh % 12);
    m.value = String(mm);
  }

  function addAlarm() {
    var text = $('alarm-text').value.trim() || '정한 시각이 되었습니다.';
    var time = core.toHHMM($('alarm-ampm').value, $('alarm-hour').value, $('alarm-min').value);
    var r = {
      id: core.uid(Date.now(), Math.random()), time: time, text: text,
      daily: $('alarm-daily').checked, on: true, next: core.nextOccurrence(time, now())
    };
    state.reminders.push(r);
    $('alarm-text').value = '';
    renderAlarms();
    saveNow();
    toast(whenText(r) + ' 에 알려 드립니다.');
  }

  function addAfter(min) {
    var a = core.afterMinutes(min, now());
    var text = $('alarm-text').value.trim() || (min >= 60 ? (min / 60) + '시간' : min + '분') + '이 지났습니다.';
    var r = { id: core.uid(Date.now(), Math.random()), time: a.time, text: text, daily: false, on: true, next: a.next };
    state.reminders.push(r);
    $('alarm-text').value = '';
    renderAlarms();
    saveNow();
    toast(whenText(r) + ' 에 알려 드립니다.');
  }

  /** 알림 시각 글. 한 번 알림이 내일이면 "내일" 을 붙입니다. */
  function whenText(r) {
    var t = core.timeText(new Date(r.next));
    if (!r.daily && core.dateKey(new Date(r.next)) !== core.dateKey(now())) t = '내일 ' + t;
    return t;
  }

  function renderAlarms() {
    var ul = $('alarm-list');
    ul.textContent = '';
    var list = state.reminders.slice().sort(function (a, b) {
      if (a.on !== b.on) return a.on ? -1 : 1;
      return a.next - b.next;
    });
    list.forEach(function (r) {
      var li = el('li', 'alarm-item' + (r.on ? '' : ' off'));
      var when = el('div', 'alarm-when');
      when.appendChild(el('div', 'alarm-time', r.daily ? core.hhmmText(r.time) : whenText(r)));
      when.appendChild(el('div', 'alarm-kind', r.daily ? '매일' : '한 번'));
      li.appendChild(when);
      var tog = el('button', 'btn', r.on ? '켜짐' : '꺼짐');
      tog.type = 'button';
      tog.setAttribute('aria-pressed', String(r.on));
      tog.onclick = function () {
        r.on = !r.on;
        if (r.on) r.next = core.nextOccurrence(r.time, now());
        renderAlarms();
        saveNow();
      };
      li.appendChild(tog);
      var del = el('button', 'btn btn-danger', '지우기');
      del.type = 'button';
      del.onclick = async function () {
        var ok = await ask('"' + r.text + '" 알림을 지울까요?', '지우기');
        if (!ok) return;
        state.reminders = state.reminders.filter(function (x) { return x.id !== r.id; });
        renderAlarms();
        saveNow();
      };
      li.appendChild(del);
      li.appendChild(el('div', 'alarm-what', r.text));
      ul.appendChild(li);
    });
    if (!list.length) ul.appendChild(el('li', 'empty-note', '만든 알림이 없습니다.'));
    var onN = state.reminders.filter(function (r) { return r.on; }).length;
    var badge = $('alarm-count');
    badge.hidden = !onN;
    badge.textContent = String(onN);
  }

  /* 알림이 울리는 화면 */
  var ringQueue = [];
  var ringing = null;
  var titleTimer = null;
  var soundTimer = null;
  var audio = null;
  var baseTitle = document.title;

  function checkAlarms() {
    var due = core.dueReminders(state.reminders, now());
    due.forEach(function (r) {
      if (ringing && ringing.id === r.id) return;
      if (ringQueue.some(function (q) { return q.id === r.id; })) return;
      ringQueue.push(r);
    });
    if (!ringing && ringQueue.length) ring(ringQueue.shift());
  }

  function ring(r) {
    ringing = r;
    document.querySelectorAll('dialog[open]').forEach(function (d) { d.close(); }); // 창이 알림을 가리지 않게
    var late = r.preview ? false : core.isLate(r, now());
    $('ring-time').textContent = (r.preview ? '미리 보기 · ' : late ? '놓친 알림 · ' : '') + core.timeText(new Date(r.next));
    var t = $('ring-text');
    t.textContent = r.text;
    $('ring-snooze').hidden = !!r.preview;
    $('ring').hidden = false;
    requestAnimationFrame(function () { fit($('ring-box'), t, 300); });
    $('ring-ok').focus();
    var flip = false;
    clearInterval(titleTimer);
    titleTimer = setInterval(function () {
      flip = !flip;
      document.title = flip ? '[알림] ' + r.text : baseTitle;
    }, 1000);
    if (state.settings.sound) startSound();
  }

  function stopRing() {
    $('ring').hidden = true;
    clearInterval(titleTimer);
    document.title = baseTitle;
    stopSound();
    ringing = null;
    setTimeout(checkAlarms, 300);
  }

  function ringOk() {
    var r = ringing;
    if (!r) return;
    if (!r.preview) {
      var next = core.afterFired(r, now());
      state.reminders = state.reminders
        .map(function (x) { return x.id === r.id ? next : x; })
        .filter(Boolean);
      renderAlarms();
      saveNow();
    }
    stopRing();
  }

  function ringSnooze() {
    var r = ringing;
    if (!r) return;
    var a = core.afterMinutes(5, now());
    var next = core.afterFired(r, now());
    state.reminders = state.reminders
      .map(function (x) { return x.id === r.id ? next : x; })
      .filter(Boolean);
    state.reminders.push({ id: core.uid(Date.now(), Math.random()), time: a.time, text: r.text, daily: false, on: true, next: a.next });
    renderAlarms();
    saveNow();
    stopRing();
    toast('5분 뒤에 다시 알려 드립니다.');
  }

  /* 소리와 떨림. 소리는 잔존 청력이 있는 분이 듣기 쉬운 낮은 음(약 500Hz)으로,
     화면을 확인할 때까지 3초마다 울립니다(최대 2분). 떨림은 안드로이드에서만 됩니다. */
  function ensureAudio() {
    if (audio) return audio;
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    try { audio = new Ctx(); } catch (e) { audio = null; }
    return audio;
  }

  function beep() {
    if (navigator.vibrate) navigator.vibrate([700, 300, 700, 300, 700]);
    var ctx = ensureAudio();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    var t0 = ctx.currentTime;
    for (var i = 0; i < 3; i++) {
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = 'square';
      o.frequency.value = 500;
      g.gain.setValueAtTime(0, t0 + i * 0.6);
      g.gain.linearRampToValueAtTime(0.35, t0 + i * 0.6 + 0.02);
      g.gain.setValueAtTime(0.35, t0 + i * 0.6 + 0.38);
      g.gain.linearRampToValueAtTime(0, t0 + i * 0.6 + 0.42);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + i * 0.6);
      o.stop(t0 + i * 0.6 + 0.45);
    }
  }

  function startSound() {
    stopSound();
    var count = 0;
    beep();
    soundTimer = setInterval(function () {
      if (++count >= 40) { stopSound(); return; }
      beep();
    }, 3000);
  }

  function stopSound() {
    clearInterval(soundTimer);
    soundTimer = null;
    if (navigator.vibrate) navigator.vibrate(0);
  }

  /* ---------- 설정 ---------- */

  function openSettings() {
    $('set-phrases').value = state.phrases.join('\n');
    $('settings').showModal();
  }

  function closeSettings() {
    var lines = $('set-phrases').value.split('\n')
      .map(function (s) { return s.trim(); })
      .filter(Boolean);
    var seen = {};
    state.phrases = lines.filter(function (s) { return seen[s] ? false : (seen[s] = true); });
    renderPhrases();
    save();
  }

  function backup() {
    saveNow();
    download('big-memo-backup-' + core.fileStamp(now()) + '.json', JSON.stringify(state, null, 1), 'application/json');
    toast('백업 파일을 "다운로드" 에 저장했습니다.');
  }

  function restore(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result).replace(/^﻿/, '');
        var b = core.normalize(JSON.parse(text), now(), Math.random());
        var r = core.mergeBackup(state, b);
        renderList();
        renderEditor();
        saveNow();
        $('settings').close();
        toast('백업에서 메모 ' + r.added + '개를 더하고 ' + r.replaced + '개를 새 내용으로 바꿨습니다.');
      } catch (e) {
        toast('불러오지 못했습니다. ' + (e && e.message && /백업/.test(e.message) ? e.message : '파일이 맞는지 확인하세요.'));
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  /* ---------- 시계, 다시 맞추기 ---------- */

  function tickClock() {
    var c = core.clockText(now());
    if ($('clock-date').textContent !== c.date) $('clock-date').textContent = c.date;
    if ($('clock-time').textContent !== c.time) $('clock-time').textContent = c.time;
  }

  function refit() {
    if (tab === 'talk') renderTalkNow();
    if (!$('show').hidden) fit($('show-box'), $('show-text'), 400);
    if (!$('ring').hidden) fit($('ring-box'), $('ring-text'), 300);
  }

  function renderAll() {
    applySettings();
    renderEditor();
    renderList();
    renderPhrases();
    renderTalkHistory();
    renderTalkNow();
    renderAlarms();
    renderSaveState();
  }

  /* ---------- 시작 ---------- */

  function bind() {
    document.querySelectorAll('.tab').forEach(function (b) {
      b.onclick = function () { showTab(b.dataset.tab); };
    });
    $('size-down').onclick = function () { setSize(-1); };
    $('size-up').onclick = function () { setSize(1); };
    $('settings-btn').onclick = openSettings;

    $('memo-new').onclick = newMemo;
    $('memo-search').oninput = renderList;
    $('memo-text').oninput = onMemoInput;
    $('memo-back').onclick = function () { closeLayer('editor'); };
    $('memo-show').onclick = showCurrent;
    $('memo-mic').onclick = toggleMemoMic;
    $('memo-pin').onclick = togglePin;
    $('memo-share').onclick = function () { shareText(currentMemo().text); };
    $('memo-del').onclick = deleteMemo;
    $('trash-btn').onclick = function () { renderTrash(); $('trash').showModal(); };
    $('trash-close').onclick = function () { $('trash').close(); };
    $('trash-empty').onclick = emptyTrash;

    var ti = $('talk-input');
    ti.oninput = function () { growInput(); renderTalkNow(); };
    ti.onkeydown = function (e) { shiftDown = e.shiftKey; onTalkKey(e); };
    ti.onkeyup = function (e) { shiftDown = e.shiftKey; };
    ti.addEventListener('beforeinput', onTalkBeforeInput);
    $('talk-send').onclick = sendTyped;
    $('talk-mic').onclick = toggleTalkMic;
    $('talk-show').onclick = function () { openShow(talkNowText()); };
    $('phrases-open').onclick = function () { openPanel('phrases'); };
    $('history-open').onclick = function () { openPanel('history'); };
    document.querySelectorAll('.panel-close').forEach(function (b) { b.onclick = function () { closeLayer('panel'); }; });
    $('talk-add-phrase').onclick = addPhrase;
    $('talk-to-memo').onclick = talkToMemo;
    $('talk-clear').onclick = clearTalk;

    $('alarm-add').onclick = addAlarm;
    document.querySelectorAll('[data-after]').forEach(function (b) {
      b.onclick = function () { addAfter(+b.dataset.after); };
    });
    $('alarm-test').onclick = function () {
      ring({ id: 'preview', preview: true, text: '알림이 오면 이렇게 보입니다.', next: Date.now() });
    };
    $('ring-ok').onclick = ringOk;
    $('ring-snooze').onclick = ringSnooze;

    $('show-close').onclick = closeShow;
    $('show-flip').onclick = function () {
      var on = $('show-box').classList.toggle('flipped');
      this.setAttribute('aria-pressed', String(on));
    };
    $('confirm-yes').onclick = function () { $('confirm').close('yes'); };
    $('confirm-no').onclick = function () { $('confirm').close('no'); };

    var themes = $('set-theme');
    core.THEMES.forEach(function (th) {
      var b = el('button', 'btn', th.name);
      b.type = 'button';
      b.dataset.theme = th.id;
      b.onclick = function () { state.settings.theme = th.id; applySettings(); save(); };
      themes.appendChild(b);
    });
    document.querySelectorAll('[data-awake]').forEach(function (b) {
      b.onclick = function () { state.settings.keepAwake = b.dataset.awake; applySettings(); save(); };
    });
    $('set-bold-on').onclick = function () { state.settings.bold = true; applySettings(); save(); };
    $('set-bold-off').onclick = function () { state.settings.bold = false; applySettings(); save(); };
    $('set-sound-on').onclick = function () { state.settings.sound = true; applySettings(); save(); beep(); };
    $('set-sound-off').onclick = function () { state.settings.sound = false; applySettings(); save(); };
    $('set-backup').onclick = backup;
    $('set-restore').onclick = function () { $('file-in').value = ''; $('file-in').click(); };
    $('file-in').onchange = function () { if (this.files[0]) restore(this.files[0]); };
    $('settings-close').onclick = function () { $('settings').close(); };
    $('settings').addEventListener('close', closeSettings);
    $('app-version').textContent = '판 ' + APP_VERSION;

    document.addEventListener('keydown', function (e) {
      if (!$('ring').hidden) return; // 알림은 단추로만 닫습니다.
      if (e.key === 'F2') { e.preventDefault(); if ($('show').hidden) showCurrent(); else closeShow(); }
      else if (e.key === 'Escape' && !$('show').hidden) { e.preventDefault(); closeShow(); }
    });
    document.addEventListener('fullscreenchange', function () {
      // 전체 화면이 풀리면(Esc, 뒤로) 보여주기 화면도 닫습니다.
      if (!document.fullscreenElement && !$('show').hidden) closeShow();
      setTimeout(refit, 100);
    });
    // 첫 누름 때 소리 장치를 준비합니다. 브라우저는 사용자가 누르기 전에는 소리를 막습니다.
    document.addEventListener('pointerdown', function () {
      var ctx = ensureAudio();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    }, { once: true });
    // 글을 쓰는 동안 좁은 화면에서는 아래 탭을 숨겨 자판 자리를 넓힙니다.
    document.addEventListener('focusin', function (e) {
      if (/^(TEXTAREA|INPUT)$/.test(e.target.tagName) && e.target.type !== 'checkbox') document.body.classList.add('typing');
    });
    document.addEventListener('focusout', function () {
      setTimeout(function () {
        var a = document.activeElement;
        if (!a || !/^(TEXTAREA|INPUT)$/.test(a.tagName)) document.body.classList.remove('typing');
      }, 50);
    });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refit, 150);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') {
        if (saveTimer) saveNow();
        stopListening();
      } else {
        checkAlarms();
        renderList();
      }
      updateWake();
    });
    window.addEventListener('pagehide', function () { if (saveTimer) saveNow(); });
    // 같은 메모장을 창 두 개로 열었을 때 서로 맞춥니다.
    window.addEventListener('storage', function (e) {
      if (e.key !== KEY || !e.newValue) return;
      try {
        state = core.normalize(JSON.parse(e.newValue), now(), Math.random());
        renderAll();
      } catch (err) { /* 무시 */ }
    });
  }

  function start() {
    state = load();
    state.memos = core.purgeTrash(state.memos, now());
    bind();
    fillTimeSelects();
    renderAll();
    var saved = null;
    try { saved = localStorage.getItem(TAB_KEY); } catch (e) { /* 무시 */ }
    showTab(saved === 'talk' || saved === 'alarm' ? saved : 'memo');
    // 좁은 화면은 목록에서 시작하고, 마지막 메모를 열어 둡니다("뒤로" 를 누르면 목록).
    $('view-memo').dataset.pane = 'list';
    setPane('editor');
    renderListening();
    saveNow();
    tickClock();
    setInterval(tickClock, 1000);
    setInterval(checkAlarms, 5000);
    checkAlarms();
    // 날짜가 바뀌면 목록의 "오늘/어제" 를 다시 씁니다.
    setInterval(renderList, 60 * 1000);

    // 홈 화면에 설치하고, 한 번 연 뒤에는 인터넷 없이도 열리게 합니다(https 에서만).
    if ('serviceWorker' in navigator && window.isSecureContext && location.protocol !== 'file:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* 무시 */ });
    }
  }

  start();
})();
