import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

const projectRoot = __dirname
const publicDir = path.resolve(projectRoot, 'public')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const useBackend = env.VITE_USE_BACKEND === 'true'
  const apiTarget = env.VITE_API_TARGET || 'http://localhost:3001'

  return {
    plugins: [react()],
    publicDir,
    resolve: {
      alias: {
        '@': path.resolve(projectRoot, './src'),
      },
    },
    server: {
      host: '127.0.0.1',
      hmr: false,
      proxy: useBackend
        ? {
            '/api': {
              target: apiTarget,
              changeOrigin: true,
            }
          }
        : undefined,
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
      exclude: ['tests/e2e/**/*'],
      restoreMocks: true,
      clearMocks: true,
    }
  }
})
