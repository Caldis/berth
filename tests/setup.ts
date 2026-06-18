import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'
import type { BerthAPI } from '../src/preload/index'

// jsdom does not implement scrollIntoView; stub it so focus/jump code under test runs.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {}
}

// jsdom's HTMLCanvasElement.getContext logs a noisy "Not implemented" jsdomError.
// Return null instead — canvas components (replay timeline) take the null-ctx
// skip-drawing path; pixel output is covered by pure-function tests + manual QA.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(): null {
    return null
  } as typeof HTMLCanvasElement.prototype.getContext
}

const emptyTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0,
  reasoningOutputTokens: 0,
  unknownTokens: 0,
  totalTokens: 0,
  hasBreakdown: false
}

const emptyStats = {
  skills: 0,
  mcpServers: 0,
  sessions: 0,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
}

const idleAssetRuntimeStatus = {
  state: 'ready' as const,
  stale: false
}

const createMockScanEngineInfo = () => ({
  engine: {
    name: '@berth/scan-engine',
    packageName: '@berth/scan-engine',
    version: '0.1.0'
  },
  status: idleAssetRuntimeStatus,
  snapshot: {
    id: 'test-snapshot',
    indexedAssets: 0,
    indexedFiles: 0,
    errors: 0,
    sourceGroups: 0,
    sourceRows: 0
  },
  scheduler: {
    scanning: false,
    paused: false,
    scheduledRefresh: { active: false },
    queuedRefresh: { active: false },
    periodicScan: { enabled: true, intervalMs: 86_400_000 }
  },
  controls: [
    { id: 'manual-refresh' as const, value: 'available', editable: false, supported: true },
    {
      id: 'watcher-debounce-ms' as const,
      value: 1000,
      unit: 'ms' as const,
      editable: true,
      supported: true,
      settingKey: 'watcherDebounceMs' as const,
      min: 0,
      max: 10000,
      step: 100
    },
    {
      id: 'watcher-min-interval-ms' as const,
      value: 30000,
      unit: 'ms' as const,
      editable: true,
      supported: true,
      settingKey: 'watcherMinIntervalMs' as const,
      min: 0,
      max: 300000,
      step: 1000
    },
    { id: 'scheduled-refresh' as const, value: 'none', unit: 'state' as const, editable: false, supported: true },
    { id: 'queued-refresh' as const, value: 'none', unit: 'state' as const, editable: false, supported: true },
    { id: 'pause' as const, value: 'unsupported', unit: 'state' as const, editable: false, supported: false }
  ],
  capabilities: {
    workerMode: 'one-shot' as const,
    schedulerMode: 'single-flight-queued-project-scope' as const,
    scopeMode: 'scan-on-miss' as const,
    cacheMode: 'sqlite-swr' as const,
    incrementalFileChanges: true,
    pauseSupported: false,
    cancelSupported: false,
    writableSettingsSupported: true,
    osThrottleSupported: false
  },
  limits: [
    { id: 'metadata-only-sensitive-files' as const, level: 'info' as const, enabled: true },
    { id: 'third-party-code-not-executed' as const, level: 'info' as const, enabled: true }
  ],
  scanHistory: [] as Array<{
    at: string
    reason: 'startup' | 'manual' | 'watcher' | 'project-scope' | 'legacy-scan-all'
    durationMs: number
    assetCount: number
    fileCount: number
    errorCount: number
    ok: boolean
    projectDir?: string
    sourceCount: number
  }>
})

// Mock window.api for renderer tests。
// GH-115 T1: 导出供 tests/unit/ipc-contract.test.ts 做形状对账 (mock ⊇ preload api 方法);
// T2 清理 phantom (assets.scan / hooks.statuses) 后收紧为 satisfies BerthAPI 全等。
export const mockApi = {
  window: {
    minimize: async () => {},
    toggleMaximize: async () => {},
    close: async () => {},
    isMaximized: async () => false,
    setAlwaysOnTop: async () => {},
    isAlwaysOnTop: async () => false,
    onMaximizedChange: () => () => {}
  },
  platform: {
    info: async () => ({
      platform: 'win32' as const,
      arch: 'x64',
      homeDir: 'C:\\Users\\test',
      version: '0.1.0'
    })
  },
  theme: {
    set: async () => {}
  },
  assets: {
    snapshot: async () => ({
      id: 'test-snapshot',
      assets: [],
      stats: emptyStats,
      errors: [],
      sources: [],
      projectCandidates: [],
      status: idleAssetRuntimeStatus
    }),
    status: async () => idleAssetRuntimeStatus,
    engineInfo: async () => createMockScanEngineInfo(),
    setEngineSettings: async () => createMockScanEngineInfo(),
    refresh: async () => idleAssetRuntimeStatus,
    pause: async () => createMockScanEngineInfo(),
    resume: async () => createMockScanEngineInfo(),
    cancel: async () => idleAssetRuntimeStatus,
    rebuild: async () => idleAssetRuntimeStatus,
    scanSources: async () => [],
    get: async () => null,
    search: async () => [],
    healthCheck: async (_opts?: { refresh?: boolean }) => [],
    onChanged: () => () => {},
    onProgress: () => () => {}
  },
  agentPlugins: {
    list: async () => ({ plugins: [], manifests: [] })
  },
  projectScope: {
    candidates: async () => [],
    activate: async () => ({
      scanResult: {
        assets: [],
        stats: { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0 },
        errors: []
      },
      candidates: []
    }),
    setScope: async () => ({ applied: true })
  },
  sessions: {
    list: async () => ({ sessions: [], totalCount: 0 }),
    get: async () => null,
    events: async () => null,
    eventPayload: async () => null
  },
  teams: {
    list: async () => ({ teams: [] })
  },
  memory: {
    list: async () => ({ notes: [], sources: [] }),
    get: async () => null
  },
  usage: {
    summary: async () => ({
      totalCost: 0,
      totalTokens: 0,
      tokenUsage: emptyTokenUsage,
      costSource: 'unknown' as const,
      dailyCosts: [],
      dailyTokenUsage: [],
      byModel: [],
      byProject: [],
      rateLimits: []
    })
  },
  insights: {
    dashboard: async () => ({
      heatmap: { days: [], maxSessions: 0, maxTokens: 0, rangeStart: '', rangeEnd: '' },
      streak: { current: 0, longest: 0, lastActiveDate: null },
      peak: {
        cumulativeTokens: 0,
        peakDailyTokens: 0,
        peakSessionTokens: 0,
        maxSessionDurationSeconds: 0,
        totalSessions: 0
      },
      topSkills: [],
      topMcpServers: [],
      insights: {
        totalSessions: 0,
        skillsExplored: 0,
        pluginsInstalled: 0,
        mcpServersConfigured: 0,
        totalSkillInvocations: 0,
        topModel: null,
        agentSplit: []
      },
      rhythm: {
        grid: Array.from({ length: 7 }, () => new Array(24).fill(0)),
        maxSessions: 0,
        totalSessions: 0,
        peak: null
      },
      durationHistogram: {
        buckets: [
          { id: 'lt5m', count: 0 },
          { id: 'lt15m', count: 0 },
          { id: 'lt1h', count: 0 },
          { id: 'lt4h', count: 0 },
          { id: 'gte4h', count: 0 }
        ],
        total: 0,
        maxCount: 0
      },
      modelEfficiency: { models: [], maxAvg: 0 },
      modelTrend: { days: [], models: [], points: [], maxTotal: 0, rangeStart: '', rangeEnd: '' }
    })
  },
  hooks: {
    setHookEnabled: async (request: { hookKey: string; enabled: boolean }) => ({
      hookKey: request.hookKey,
      enabled: request.enabled,
      changed: true,
      sourcePath: 'C:\\Users\\test\\.codex\\config.toml'
    })
  },
  shell: {
    openPath: async () => {},
    openExternal: async () => {}
  },
  dialog: {
    openDirectory: async () => []
  },
  update: {
    check: async () => {},
    download: async () => {},
    install: async () => {},
    getPreferences: async () => ({ autoDownload: false }),
    setPreferences: async () => {},
    onState: () => () => {}
  }
} satisfies {
  [G in keyof BerthAPI]: { [M in keyof BerthAPI[G]]: unknown }
}

const hasDomEnvironment = typeof window !== 'undefined' && typeof HTMLElement !== 'undefined'

beforeEach(async () => {
  if (!hasDomEnvironment) return
  const {
    resetAgentCapabilityPluginCacheForTests,
    resetHealthCheckCacheForTests,
    resetSessionsCacheForTests
  } = await import('../src/renderer/src/hooks/use-ipc')
  resetAgentCapabilityPluginCacheForTests()
  resetHealthCheckCacheForTests()
  resetSessionsCacheForTests()
  const { resetAgentTeamsCacheForTests } = await import('../src/renderer/src/hooks/use-agent-teams')
  resetAgentTeamsCacheForTests()
  const { resetMemoryCacheForTests } = await import('../src/renderer/src/hooks/use-memory')
  resetMemoryCacheForTests()
})

if (hasDomEnvironment) {
  Object.defineProperty(window, 'api', { value: mockApi, writable: true })

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false
    })
  })

  const TEST_CHART_WIDTH = 800
  const TEST_CHART_HEIGHT = 400
  const RECHARTS_RESPONSIVE_CONTAINER_CLASS = 'recharts-responsive-container'

  const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect

  function readCssPixelValue(value: string): number | null {
    const match = /^(\d+(?:\.\d+)?)px$/.exec(value.trim())
    if (!match) return null
    const parsed = Number(match[1])
    return Number.isFinite(parsed) ? parsed : null
  }

  function isRechartsResponsiveContainer(element: Element): element is HTMLElement {
    return element instanceof HTMLElement && element.classList.contains(RECHARTS_RESPONSIVE_CONTAINER_CLASS)
  }

  function readElementSize(element: Element, axis: 'width' | 'height'): number {
    if (!isRechartsResponsiveContainer(element)) return 0

    const styleValue = axis === 'width' ? element.style.width : element.style.height
    const cssValue = readCssPixelValue(styleValue)
    if (cssValue && cssValue > 0) return cssValue

    return axis === 'width' ? TEST_CHART_WIDTH : TEST_CHART_HEIGHT
  }

  function createRect(element: Element): DOMRect {
    if (!(element instanceof HTMLElement)) return new DOMRect(0, 0, 0, 0)

    const measured = originalGetBoundingClientRect.call(element)
    const width = measured.width > 0 ? measured.width : readElementSize(element, 'width')
    const height = measured.height > 0 ? measured.height : readElementSize(element, 'height')

    return new DOMRect(measured.x, measured.y, width, height)
  }

  Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
    configurable: true,
    value: function getBoundingClientRect(this: HTMLElement): DOMRect {
      const measured = originalGetBoundingClientRect.call(this)
      if (!isRechartsResponsiveContainer(this) || (measured.width > 0 && measured.height > 0)) {
        return measured
      }

      return createRect(this)
    }
  })

  class ResizeObserverMock {
    private callback: ResizeObserverCallback

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }

    observe(target: Element): void {
      this.callback([{ target, contentRect: createRect(target) } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }

    unobserve(): void {}
    disconnect(): void {}
  }

  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock
  })
}
