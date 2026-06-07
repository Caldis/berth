import '@testing-library/jest-dom'
import { beforeEach } from 'vitest'

// jsdom does not implement scrollIntoView; stub it so focus/jump code under test runs.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView(): void {}
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

// Mock window.api for renderer tests
const mockApi = {
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
      version: '0.1.0',
      claudeDir: 'C:\\Users\\test\\.claude'
    })
  },
  theme: {
    get: async () => 'system',
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
    scan: async () => [],
    scanAll: async () => ({ assets: [], stats: emptyStats, errors: [] }),
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
    })
  },
  sessions: {
    list: async () => ({ sessions: [], totalCount: 0 }),
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
    status: async (agentId: 'claude-code' | 'codex') => ({
      agentId,
      agentName: agentId === 'codex' ? 'Codex' : 'Claude Code',
      scope: 'user' as const,
      enabled: true,
      sourcePath: agentId === 'codex'
        ? 'C:\\Users\\test\\.codex\\config.toml'
        : 'C:\\Users\\test\\.claude\\settings.json',
      sourceExists: true,
      supported: true,
      writable: true
    }),
    statuses: async (agentId: 'claude-code' | 'codex') => [
      {
        agentId,
        agentName: agentId === 'codex' ? 'Codex' : 'Claude Code',
        scope: 'user' as const,
        enabled: true,
        sourcePath: agentId === 'codex'
          ? 'C:\\Users\\test\\.codex\\config.toml'
          : 'C:\\Users\\test\\.claude\\settings.json',
        sourceExists: true,
        supported: true,
        writable: true
      }
    ],
    setEnabled: async (request: { agentId: 'claude-code' | 'codex'; scope: 'user'; enabled: boolean }) => ({
      status: {
        agentId: request.agentId,
        agentName: request.agentId === 'codex' ? 'Codex' : 'Claude Code',
        scope: request.scope,
        enabled: request.enabled,
        sourcePath: request.agentId === 'codex'
          ? 'C:\\Users\\test\\.codex\\config.toml'
          : 'C:\\Users\\test\\.claude\\settings.json',
        sourceExists: true,
        supported: true,
        writable: true
      },
      changed: true
    }),
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
