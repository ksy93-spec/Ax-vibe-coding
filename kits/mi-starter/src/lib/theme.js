// 지금 화면이 라이트인지 다크인지. 캔버스에 그리는 차트는 CSS 변수를 못 읽어서
// 이 값을 보고 테마를 고릅니다.
//
// 포탈 안(iframe)에서 열리면 포탈이 postMessage 로 테마와 글자 크기를 알려 줍니다.

import { useSyncExternalStore } from 'react';

const listeners = new Set();
const media = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null;

export function currentTheme() {
  const forced = document.documentElement.getAttribute('data-theme');
  if (forced === 'dark' || forced === 'light') return forced;
  return media && media.matches ? 'dark' : 'light';
}

function notify() { listeners.forEach((fn) => fn()); }

if (typeof window !== 'undefined') {
  media && media.addEventListener && media.addEventListener('change', notify);
  new MutationObserver(notify).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (d && d.type === 'portal-theme' && (d.theme === 'dark' || d.theme === 'light')) {
      document.documentElement.setAttribute('data-theme', d.theme);
    }
    // 포탈에서 글자 크기를 바꾸면 앱 전체를 같은 비율로 키웁니다 (1 이 보통).
    if (d && d.type === 'portal-font-scale' && d.scale >= 0.5 && d.scale <= 3) {
      document.documentElement.style.zoom = String(d.scale);
    }
  });
}

/** React 훅. 테마가 바뀌면 다시 그립니다. */
export function useTheme() {
  return useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    currentTheme,
    () => 'light',
  );
}
