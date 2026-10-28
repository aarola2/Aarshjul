import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { contentSecurityPolicy } from './src/csp.ts'

// GitHub Pages serves the app under /<repo>/
export default defineConfig({
  base: '/Aarshjul/',
  plugins: [react(), contentSecurityPolicy()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test-setup.ts', 'src/main.tsx'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
})
