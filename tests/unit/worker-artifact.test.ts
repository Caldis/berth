import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

// GH-115 T0: worker 入口产物路径是 01-ANALYSIS 风险 7 点名的单测射程外盲区。
// 三方一致性: electron.vite 构建入口名 ↔ worker-host 运行时解析名 ↔ 入口源文件存在。
// 任何一方重命名而其余未跟上, 打包应用的扫描 worker 会在运行时 404。

const ROOT = resolve(__dirname, '../..')

describe('asset worker artifact wiring', () => {
  const viteConfig = readFileSync(resolve(ROOT, 'electron.vite.config.ts'), 'utf8')
  const workerHost = readFileSync(
    resolve(ROOT, 'packages/berth-scan-engine/src/engine/assets/worker-host.ts'),
    'utf8'
  )

  it('build config declares the asset-worker entry pointing at an existing source file', () => {
    const entry = viteConfig.match(/'asset-worker':\s*resolve\('([^']+)'\)/)
    expect(entry, 'electron.vite.config.ts 必须声明 asset-worker 入口').toBeTruthy()
    expect(existsSync(resolve(ROOT, entry![1]))).toBe(true)
  })

  it('worker-host resolves the same output filename as the build entry name', () => {
    // 构建入口名 'asset-worker' 产出 out/main/asset-worker.js; 运行时按该名解析。
    expect(workerHost).toMatch(/asset-worker\.js/)
    expect(viteConfig).toMatch(/'asset-worker':/)
  })

  it('built artifact exists after pnpm build (skipped when out/ absent)', () => {
    const artifact = resolve(ROOT, 'out/main/asset-worker.js')
    if (!existsSync(resolve(ROOT, 'out/main'))) return // 未构建环境 (CI test 先于 build)
    expect(existsSync(artifact)).toBe(true)
  })
})
