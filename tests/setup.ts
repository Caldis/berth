import '@testing-library/jest-dom'

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
    summary: async () => ({ totalCost: 0, totalTokens: 0, dailyCosts: [], byModel: [], byProject: [], rateLimits: [] })
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
