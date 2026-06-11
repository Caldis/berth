import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'url'
import path from 'path'

// Isolated config so the package does not inherit the repo-root renderer setup
// (jsdom + tests/setup.ts). The engine is pure Node. `@shared` resolves
// in-package (GH-121: shared moved into the package).
const sharedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'src/shared')

export default defineConfig({
  resolve: {
    alias: { '@shared': sharedDir }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
