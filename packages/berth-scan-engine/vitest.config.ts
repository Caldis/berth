import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

// Isolated config so the package does not inherit the repo-root renderer setup
// (jsdom + tests/setup.ts). The engine is pure Node. The `@shared` alias lets
// integration tests exercise the in-place engine bridge.
const sharedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src/shared')

export default defineConfig({
  resolve: {
    alias: { '@shared': sharedDir }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
