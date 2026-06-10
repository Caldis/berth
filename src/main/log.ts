import * as fs from 'fs'
import * as path from 'path'

// GH-115 T5: 主进程日志地基。此前 src/main 零 console、零进程钩子 — 打包应用 (无终端)
// 下启动失败 / watcher 故障 / 未捕获异常完全无痕迹, stack 在 runtime 一跳即丢。
// 硬边界: 只写本地滚动文件 (userData/logs), 永不出网 (无遥测)。
// 形态: createLogWriter 为纯 fs 工厂 (单测注入临时目录); electron 宿主在 index.ts
// 用 app.getPath('userData') 装配单例并经 setMainLogWriter 暴露给各 catch 点。

export interface LogWriter {
  log: (scope: string, err: unknown) => void
  info: (scope: string, message: string) => void
}

interface LogWriterOptions {
  maxBytes?: number
}

const DEFAULT_MAX_BYTES = 1_000_000 // ~1MB, 滚动保留一代

export function createLogWriter(dir: string, options: LogWriterOptions = {}): LogWriter {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const file = path.join(dir, 'main.log')
  const rolled = path.join(dir, 'main.1.log')

  const append = (line: string): void => {
    // 日志自身永不让宿主崩溃: 任何 fs 失败静默放弃本条。
    try {
      fs.mkdirSync(dir, { recursive: true })
      try {
        if (fs.statSync(file).size > maxBytes) fs.renameSync(file, rolled)
      } catch {
        /* 文件不存在等: 直接写 */
      }
      fs.appendFileSync(file, line + '\n', 'utf8')
    } catch {
      /* noop */
    }
  }

  const stamp = (): string => new Date().toISOString()

  return {
    log: (scope, err) => {
      const detail = err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : String(err)
      append(`${stamp()} [${scope}] ${detail}`)
    },
    info: (scope, message) => {
      append(`${stamp()} [${scope}] ${message}`)
    }
  }
}

const noopWriter: LogWriter = { log: () => {}, info: () => {} }

let mainWriter: LogWriter = noopWriter

/** electron 组合根 (index.ts) 装配真实 writer; 未装配时各 catch 点安全降级为 noop。 */
export function setMainLogWriter(writer: LogWriter): void {
  mainWriter = writer
}

export function getMainLog(): LogWriter {
  return mainWriter
}
