import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('packages/berth-scan-engine/src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'asset-worker': resolve('src/main/engine/assets/worker.ts')
        }
      }
    }
  },
  preload: {
    // GH-119: sandboxed preload can only require Electron's polyfilled module
    // subset — @electron-toolkit/preload must be bundled into the output.
    plugins: [externalizeDepsPlugin({ exclude: ['@electron-toolkit/preload'] })],
    resolve: {
      alias: {
        '@shared': resolve('packages/berth-scan-engine/src/shared')
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('packages/berth-scan-engine/src/shared')
      }
    },
    plugins: [react()]
  }
})
