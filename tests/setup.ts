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
    refresh: async () => idleAssetRuntimeStatus,
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
