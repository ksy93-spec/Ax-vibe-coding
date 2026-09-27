import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 포탈에 붙이려면 빌드 결과가 한 덩어리여야 합니다.
// 아래 세 줄이 그 설정입니다. Vite 5~8 에서 동작합니다(8 에서는 폐기 예정 경고만 나옴).
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    assetsInlineLimit: 100_000_000,                                // 이미지와 폰트를 JS/CSS 안에 넣음
    cssCodeSplit: false,                                           // CSS 를 한 파일로
    rollupOptions: { output: { inlineDynamicImports: true } },     // 지연 로딩 조각도 한 파일로
  },
});
