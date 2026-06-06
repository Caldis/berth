import { defineConfig } from 'tsup'

// P1.1: only the public entry is built. The `cli` entry is added in P1.3.
export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  shims: true,
  target: 'es2022'
})
