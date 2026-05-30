import '@testing-library/jest-dom'

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

// Mock window.api for renderer tests
const mockApi = {
  window: {
    minimize: async () => {},
    toggleMaximize: async () => {},
    close: async () => {},
    isMaximized: async () => false,
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
    scan: async () => [],
    scanAll: async () => ({ assets: [], stats: { skills: 0, mcpServers: 0, sessions: 0, plugins: 0, hooks: 0, commands: 0, subagents: 0, teams: 0 }, errors: [] }),
    scanSources: async () => [],
    get: async () => null,
    search: async () => [],
    healthCheck: async () => [],
    onChanged: () => () => {}
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
      supported: true
    }),
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
        supported: true
      },
      changed: true
    })
  },
  shell: {
    openPath: async () => {},
    openExternal: async () => {}
  }
}

Object.defineProperty(window, 'api', { value: mockApi, writable: true })

// Mock matchMedia
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

class ResizeObserverMock {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock
})
