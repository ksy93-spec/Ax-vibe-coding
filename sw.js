/* 한 번 연 뒤에는 인터넷 없이도 열리게 파일을 기기에 담아 둡니다.
   화면 파일(html, js, css)은 인터넷이 되면 새 판을 받고, 안 되면 담아 둔 것을 씁니다.
   글꼴과 그림은 담아 둔 것을 먼저 씁니다. 판을 올리면 CACHE 이름을 바꿉니다. */
var CACHE = 'big-memo-2026.10.09.4';
var CORE = [
  './',
  'index.html',
  'manifest.webmanifest',
  'src/core.js',
  'src/app.js',
  'assets/css/memo.css',
  'assets/fonts/pretendard/font.css',
  'assets/icon-192.png',
  'assets/icon-180.png',
  'assets/icon-talk.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  var stable = /\.(woff2|png)$/.test(new URL(req.url).pathname);
  if (stable) {
    e.respondWith(caches.match(req).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
        return res;
      });
    }));
    return;
  }
  e.respondWith(fetch(req).then(function (res) {
    if (res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
  }));
});
