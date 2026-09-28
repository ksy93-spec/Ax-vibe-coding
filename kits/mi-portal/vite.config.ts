import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// 각자 PC에서 index.html 을 더블클릭해 여는 포탈입니다.
// base 와 build 아래 설정이 빌드 결과를 한 덩어리로 만듭니다. 지우면 빌드는 되지만 빈 화면이 뜹니다.
export default defineConfig({
  plugins: [
    // src/routes 아래 파일을 보고 src/routeTree.gen.ts 를 자동으로 만듭니다. 그 파일은 손으로 고치지 않습니다.
    tanstackRouter({ target: 'react', autoCodeSplitting: false }),
    react(),
    tailwindcss(),
  ],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 8000,
    rolldownOptions: { output: { codeSplitting: false } },
  },
})
