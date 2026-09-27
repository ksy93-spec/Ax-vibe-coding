import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// 포탈에 붙이려면 빌드 결과가 한 덩어리여야 합니다. build 아래 세 줄이 그 설정입니다.
// 지우면 빌드는 되지만 더블클릭으로 열리지 않습니다.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 6000,
    rolldownOptions: { output: { codeSplitting: false } },
  },
});
