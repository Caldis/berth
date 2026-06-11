import { defineConfig } from 'tsup'
import { fileURLToPath } from 'url'
import path from 'path'

// `@shared/*` resolves inside the package (GH-121: shared moved in-package);
// esbuild bundles it so the published artifact stays self-contained.
const packageDir = path.dirname(fileURLToPath(import.meta.url))
const sharedDir = path.resolve(packageDir, 'src/shared')

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
