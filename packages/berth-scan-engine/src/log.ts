import * as fs from 'fs'
import * as path from 'path'

// GH-115 T5: 主进程日志地基。此前 src/main 零 console、零进程钩子 — 打包应用 (无终端)
// 下启动失败 / watcher 故障 / 未捕获异常完全无痕迹, stack 在 runtime 一跳即丢。
// 硬边界: 只写本地滚动文件 (userData/logs), 永不出网 (无遥测)。
// 形态: createLogWriter 为纯 fs 工厂 (单测注入临时目录); electron 宿主在 index.ts
// 用 app.getPath('userData') 装配单例并经 setMainLogWriter 暴露给各 catch 点。

export interface LogWriter {
  log: (scope: string, err: unknown) => void
  error: (scope: string, err: unknown) => void
  warning: (scope: string, message: string) => void
  info: (scope: string, message: string) => void
  verbose: (scope: string, message: string) => void
}

export type LogLevel = 'verbose' | 'info' | 'warning' | 'error'

interface LogWriterOptions {
  maxBytes?: number
  minLevel?: LogLevel | string
}

const DEFAULT_MAX_BYTES = 1_000_000 // ~1MB, 滚动保留一代
const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  verbose: 10,
  info: 20,
  warning: 30,
  error: 40
}

export function createLogWriter(dir: string, options: LogWriterOptions = {}): LogWriter {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES
  const minLevel = normalizeLogLevel(options.minLevel) ?? 'info'
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
  const shouldWrite = (level: LogLevel): boolean => LOG_LEVEL_WEIGHT[level] >= LOG_LEVEL_WEIGHT[minLevel]
  const write = (level: LogLevel, scope: string, detail: string): void => {
    if (!shouldWrite(level)) return
    append(`${stamp()} [${level}] [${scope}] ${detail}`)
  }
  const errorDetail = (err: unknown): string =>
    err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : String(err)

  return {
    log: (scope, err) => write('error', scope, errorDetail(err)),
    error: (scope, err) => write('error', scope, errorDetail(err)),
    warning: (scope, message) => write('warning', scope, message),
    info: (scope, message) => write('info', scope, message),
    verbose: (scope, message) => write('verbose', scope, message)
  }
}

export function normalizeLogLevel(value: LogLevel | string | undefined): LogLevel | undefined {
  const normalized = value?.toLowerCase()
  if (normalized === 'verbose' || normalized === 'info' || normalized === 'warning' || normalized === 'error') return normalized
  return undefined
}

const noopWriter: LogWriter = { log: () => {}, error: () => {}, warning: () => {}, info: () => {}, verbose: () => {} }

let mainWriter: LogWriter = noopWriter

/** electron 组合根 (index.ts) 装配真实 writer; 未装配时各 catch 点安全降级为 noop。 */
export function setMainLogWriter(writer: LogWriter): void {
  mainWriter = writer
}

export function getMainLog(): LogWriter {
  return mainWriter
}
