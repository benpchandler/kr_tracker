import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const projectRoot = __dirname
const staticDir = path.resolve(projectRoot, 'public/static')

export default defineConfig({
  root: projectRoot,
  publicDir: staticDir,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(projectRoot, './src'),
    },
  },
  server: {
    hmr: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      }
    },
    watch: {
      ignored: [
        '**/server/kr.sqlite',
        '**/server/kr.sqlite-shm',
        '**/server/kr.sqlite-wal',
      ],
    },
  },
  build: {
    outDir: path.resolve(projectRoot, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(projectRoot, 'index.html'),
    },
  },
  test: {
    root: projectRoot,
    environment: 'jsdom',
    setupFiles: [path.resolve(projectRoot, 'tests/setup/vitest.setup.ts')],
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'tests/**/*.{test,spec}.{ts,tsx}',
    ],
    restoreMocks: true,
    clearMocks: true,
  }
})
