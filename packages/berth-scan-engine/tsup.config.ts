import { defineConfig } from 'tsup'
import { fileURLToPath } from 'url'
import path from 'path'

// `@shared/*` is used transitively by the in-place engine (src/main/engine/*)
// that the CLI bridges to. Alias it to the repo's shared dir so esbuild can
// bundle the engine cleanly (it is Electron-free and native-free).
const packageDir = path.dirname(fileURLToPath(import.meta.url))
const sharedDir = path.resolve(packageDir, '../../src/shared')

export default defineConfig({
  entry: { index: 'src/index.ts', cli: 'src/cli-bin.ts' },
  format: ['esm', 'cjs'],
  // Types only for the public entry; the CLI bin has no published types and
  // its bridge imports repo source (typed at the repo, migrated in P2).
  dts: { entry: 'src/index.ts' },
  clean: true,
  sourcemap: true,
  shims: true,
  target: 'es2022',
  esbuildOptions(options) {
    options.alias = { ...(options.alias ?? {}), '@shared': sharedDir }
  }
})
