import { defineConfig } from 'vitest/config'

// Isolated config so the package does not inherit the repo-root renderer setup
// (jsdom + tests/setup.ts). The engine is pure Node.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
