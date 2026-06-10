#!/usr/bin/env node
// GH-115 T0: better-sqlite3 Electron-ABI 冒烟 (01-ANALYSIS 风险 7)。
// npmRebuild:false 下 ABI 正确性依赖历史编译产物, Electron 跨 ABI 升级时坏二进制会零报错进包。
// 本脚本用项目 Electron 真实运行时加载 better-sqlite3 并开 :memory: 库, 失败即非零退出。
// 用法: node scripts/abi-smoke.mjs (package 前置或手动)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createRequire } from 'node:module'

const req = createRequire(import.meta.url)
const electron = req('electron') // 主进程外解析为二进制路径字符串

const dir = mkdtempSync(join(tmpdir(), 'berth-abi-'))
const entry = join(dir, 'main.cjs')
writeFileSync(
  entry,
  `const { app } = require('electron')
app.whenReady().then(() => {
  const Database = require('${process.cwd().replace(/\\/g, '/')}/node_modules/better-sqlite3')
  const db = new Database(':memory:')
  db.exec('CREATE TABLE t (id INTEGER)')
  db.close()
  console.log('ABI_SMOKE_OK')
  app.exit(0)
}).catch((err) => { console.error('ABI_SMOKE_FAIL', err); process.exit(1) })
`
)

try {
  const out = execFileSync(electron, [entry], { encoding: 'utf8', timeout: 30000 })
  if (!out.includes('ABI_SMOKE_OK')) {
    console.error('abi-smoke: 未收到 OK 标记\n' + out)
    process.exit(1)
  }
  console.log('abi-smoke: better-sqlite3 在 Electron ABI 下加载正常')
} finally {
  rmSync(dir, { recursive: true, force: true })
}
