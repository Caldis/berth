import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    environmentMatchGlobs: [['tests/renderer/**', 'jsdom']],
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx', 'packages/berth-scan-engine/src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/renderer/src/env.d.ts']
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'packages/berth-scan-engine/src/shared'),
      '@berth/scan-engine': resolve(__dirname, 'packages/berth-scan-engine/src')
    }
  }
})
