import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { mockApi } from '../setup'

// GH-115 T1: IPC 四方对账网 (01-ANALYSIS R3 `ipc-contract-unenforced`)。
// 四份契约副本 (handlers 注册 / preload invoke / IpcChannels 表 / 测试 mock) 此前零机制强制一致, 已实际漂移。
// 本测试把"集合一致"变成 CI 红绿: 任何一方增删通道而其余未跟上即红。
//
// knownDead / knownPhantom 白名单 (C 提案嫁接): 先钉住当前脏现状使本测试可落地,
// T2 (IPC 死面整链删除) 的目标断言即两个白名单清零。清零后删除白名单常量本身。

const ROOT = resolve(__dirname, '../..')
const read = (p: string): string => readFileSync(resolve(ROOT, p), 'utf8')

/**
 * handler 已注册但 preload 无 wrapper (renderer 物理不可达) — T2 删 handler 后清零。
 * 另有 4 个"全链存活但 renderer 零调用"的死通道 (theme:get / hooks:status /
 * hooks:set-enabled / assets:scan-all, 01-ANALYSIS 已对抗验证): 它们在本对账的
 * 注册/invoke 两侧同时出现所以不进白名单, T2 整链删除后由两侧同时消失保持绿。
 */
const KNOWN_HANDLER_ONLY = ['assets:import-chain', 'assets:relations', 'mcp:merged'].sort()

/** preload 暴露但主进程无 handler (调用必 reject) — T2 删除后清零 */
const KNOWN_PHANTOM_INVOKED = ['assets:scan'].sort()

const extract = (source: string, pattern: RegExp): string[] => {
  const out = new Set<string>()
  for (const match of source.matchAll(pattern)) out.add(match[1])
  return [...out].sort()
}

const ipcTypesSource = read('src/shared/types/ipc.ts')
const preloadSource = read('src/preload/index.ts')

const registered = extract(read('src/main/ipc/handlers.ts'), /ipcMain\.handle\(\s*'([^']+)'/g)
const invoked = extract(preloadSource, /(?:ipcRenderer\.invoke|invoke)\(\s*'([^']+)'/g)
const declared = extract(ipcTypesSource, /^\s{2}'([a-zA-Z-]+:[a-zA-Z-]+)':\s*\{\s*args:/gm)
const eventsSent = extract(read('src/main/ipc/handlers.ts') + read('src/main/index.ts'), /webContents\.send\(\s*'([^']+)'/g)
const eventsSubscribed = extract(preloadSource, /(?:ipcRenderer\.on|subscribe)\(\s*'([^']+)'/g)
const eventsDeclared = extract(ipcTypesSource.split('export interface IpcEvents')[1] ?? '', /'([a-zA-Z-]+:[a-zA-Z-]+)':/g)

const walkPaths = (obj: Record<string, unknown>, prefix = ''): string[] =>
  Object.entries(obj).flatMap(([key, value]) =>
    value && typeof value === 'object' && !('mock' in (value as object))
      ? walkPaths(value as Record<string, unknown>, prefix + key + '.')
      : [prefix + key]
  )

describe('IPC four-way contract accounting', () => {
  it('IpcChannels 表 == handlers 实际注册集合 (契约表必须照实)', () => {
    expect(declared).toEqual(registered)
  })

  it('preload invoke 集合 ⊆ 注册集合 + 已知 phantom (白名单清零 = T2 完成)', () => {
    const phantoms = invoked.filter((c) => !registered.includes(c))
    expect(phantoms).toEqual(KNOWN_PHANTOM_INVOKED)
  })

  it('注册但 preload 无 wrapper 的通道 == 已知 handler-only 白名单 (白名单清零 = T2 完成)', () => {
    const handlerOnly = registered.filter((c) => !invoked.includes(c))
    expect(handlerOnly).toEqual(KNOWN_HANDLER_ONLY)
  })

  it('推送事件三方一致: 实发 ⊆ 订阅 == 声明', () => {
    expect(eventsSubscribed).toEqual(eventsDeclared)
    for (const sent of eventsSent) expect(eventsSubscribed).toContain(sent)
  })

  it('测试 mock 形状 == preload api 形状 (方法路径逐一对应)', () => {
    const preloadSource = read('src/preload/index.ts')
    const apiMethodPaths = extract(
      preloadSource,
      /^\s{4}([a-zA-Z]+):\s*\(/gm
    )
    const mockPaths = walkPaths(mockApi as unknown as Record<string, unknown>)
      .map((p) => p.split('.').pop()!)
      .sort()
    for (const method of apiMethodPaths) {
      expect(mockPaths, `mock 缺少 preload api 方法: ${method}`).toContain(method)
    }
  })
})
