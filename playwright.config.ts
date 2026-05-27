import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  retries: 1,
  use: {
    trace: 'on-first-retry'
  },
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.e2e.ts'
    }
  ]
})
