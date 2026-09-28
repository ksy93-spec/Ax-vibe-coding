// Pretendard 글꼴을 불러옵니다. 파일은 public/fonts/pretendard/ 에 있고 빌드하면 index.html 옆 fonts/ 로 나갑니다.
//
// 배포처의 공식 분할 파일 92개를 고치지 않고 씁니다. 화면에 나온 글자가 든 파일만 읽힙니다.
// 직접 서브셋한 파일을 쓰지 않는 이유는 shared/fonts/README.md 에 있습니다 (OFL 예약 글꼴 이름).
//
// 찾는 순서
//   fonts/        이 앱을 따로 열었을 때 (dist-single/index.html 옆)
//   ../../fonts/  포탈의 apps/<이름>/index.html 로 붙었을 때 (포탈의 fonts 폴더)
//   ../public/fonts/  킷의 demo/index.html 로 열었을 때
// 어디에도 없으면 맑은 고딕으로 보입니다.

const BASES = ['fonts/', '../../fonts/', '../public/fonts/'];

export function loadPretendard() {
  const tryBase = (i) => {
    if (i >= BASES.length) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = BASES[i] + 'pretendard/font.css';
    link.onerror = () => {
      link.remove();
      tryBase(i + 1);
    };
    document.head.appendChild(link);
  };
  tryBase(0);
}
