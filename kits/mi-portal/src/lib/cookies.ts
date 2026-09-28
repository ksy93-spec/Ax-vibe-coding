/**
 * 화면 설정(테마, 글꼴, 사이드바 접힘 등)을 저장합니다.
 *
 * 원본 템플릿은 쿠키를 썼는데, file:// 로 연 페이지에서는 크롬이 쿠키를 저장하지 않습니다.
 * 함수 이름은 그대로 두고 localStorage 로 바꿨습니다. 사내 정책으로 막혀 있으면
 * 저장만 안 되고 화면은 기본값으로 정상 동작합니다.
 */

const PREFIX = 'mi-portal:'

export function getCookie(name: string): string | undefined {
  try {
    return window.localStorage.getItem(PREFIX + name) ?? undefined
  } catch {
    return undefined
  }
}

export function setCookie(name: string, value: string, _maxAge?: number): void {
  try {
    window.localStorage.setItem(PREFIX + name, value)
  } catch {
    /* 저장이 막혀 있으면 무시합니다 */
  }
}

export function removeCookie(name: string): void {
  try {
    window.localStorage.removeItem(PREFIX + name)
  } catch {
    /* 무시 */
  }
}
