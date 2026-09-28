/**
 * 화면 설정 > 글꼴과 글자 크기 에서 고를 수 있는 글꼴과 크기.
 *
 * 글꼴 파일은 public/fonts/<id>/ 에 있고, 빌드하면 index.html 옆 fonts/ 폴더로 나갑니다.
 * 고른 글꼴의 font.css 만 불러오고, 그 안에서도 화면에 나온 글자가 든 파일만 읽습니다.
 * fonts 폴더가 없으면 맑은 고딕으로 보입니다.
 *
 * 글꼴을 추가하려면 scripts/collect-fonts.cjs 에 한 줄 넣고 실행한 뒤 여기에 한 줄 추가합니다.
 * family 는 public/fonts/<id>/font.css 의 font-family 와 같아야 합니다 (npm run check 가 확인).
 */
export type FontInfo = {
  id: string
  label: string
  family: string | null
  kind: '고딕' | '명조' | '시스템'
  note: string
}

const SANS_FALLBACK = "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif"
const SERIF_FALLBACK = "'Batang', 'AppleMyungjo', serif"

export const fontList = [
  { id: 'pretendard', label: '프리텐다드', family: 'Pretendard Variable', kind: '고딕', note: '기본 글꼴. 숫자와 영문이 고르게 보입니다' },
  { id: 'noto-sans-kr', label: '본고딕 (Noto Sans KR)', family: 'Noto Sans KR Variable', kind: '고딕', note: '구글과 어도비가 만든 표준 고딕' },
  { id: 'nanum-gothic', label: '나눔고딕', family: 'Nanum Gothic', kind: '고딕', note: '익숙한 모양. 굵기는 보통과 굵게 두 가지' },
  { id: 'spoqa-han-sans-neo', label: '스포카 한 산스 Neo', family: 'Spoqa Han Sans Neo', kind: '고딕', note: '숫자가 또렷해 표에 좋습니다' },
  { id: 'ibm-plex-sans-kr', label: 'IBM Plex Sans KR', family: 'IBM Plex Sans KR', kind: '고딕', note: '글자 폭이 넓고 단정합니다' },
  { id: 'suit', label: 'SUIT', family: 'SUIT Variable', kind: '고딕', note: '글자 사이가 촘촘해 한 줄에 많이 들어갑니다' },
  { id: 'wanted-sans', label: '원티드 산스', family: 'Wanted Sans Variable', kind: '고딕', note: '획이 둥글고 부드럽습니다' },
  { id: 'gowun-dodum', label: '고운돋움', family: 'Gowun Dodum', kind: '고딕', note: '손글씨 느낌이 조금 있는 돋움. 굵기는 한 가지' },
  { id: 'noto-serif-kr', label: '본명조 (Noto Serif KR)', family: 'Noto Serif KR Variable', kind: '명조', note: '보고서 같은 명조체' },
  { id: 'system', label: '맑은 고딕 (윈도 기본)', family: null, kind: '시스템', note: '파일을 읽지 않아 가장 빠릅니다' },
] as const satisfies readonly FontInfo[]

export const fonts = fontList.map((f) => f.id) as unknown as readonly [
  (typeof fontList)[number]['id'],
  ...(typeof fontList)[number]['id'][],
]
export type FontId = (typeof fontList)[number]['id']

/** CSS font-family 값. 고른 글꼴이 없는 글자는 맑은 고딕으로 채웁니다. */
export function fontStack(id: FontId): string {
  const f = fontList.find((x) => x.id === id) ?? fontList[0]
  const fallback = f.kind === '명조' ? SERIF_FALLBACK : SANS_FALLBACK
  return f.family ? `'${f.family}', ${fallback}` : fallback
}

/**
 * 글자 크기. 화면 전체(표, 메뉴, 버튼, 차트 글자)가 같은 비율로 커집니다.
 * scale 은 브라우저 기본 글자 크기(보통 16px)에 곱합니다.
 */
export const fontSizes = [
  { id: 'sm', label: '작게', scale: 0.9 },
  { id: 'md', label: '보통', scale: 1 },
  { id: 'lg', label: '크게', scale: 1.1 },
  { id: 'xl', label: '더 크게', scale: 1.25 },
  { id: 'xxl', label: '아주 크게', scale: 1.5 },
] as const
export type FontSizeId = (typeof fontSizes)[number]['id']
