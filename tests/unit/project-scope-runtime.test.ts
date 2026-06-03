import { describe, expect, it, vi } from 'vitest'
import type { Asset } from '../../src/shared/types/asset'
import type { ProjectScopeCandidate } from '../../src/shared/scope'
import { createProjectScopeCandidate } from '../../src/shared/scope'
import { activateProjectScope, type ProjectScopeRuntimeDeps } from '../../src/main/project-scope-runtime'

const stats = {
  skills: 0,
  mcpServers: 0,
  sessions: 1,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
  teams: 0
}

function sessionAsset(projectPath: string): Asset {
  return {
    id: `session:${projectPath}`,
    agentId: 'codex',
    category: 'state',
    type: 'session',
    scope: 'session',
    name: projectPath,
    path: 'C:\\Users\\test\\.codex\\sessions\\session.jsonl',
    meta: { projectPath }
  }
}

class FakeScanner {
  refresh = vi.fn(async () => {})
  setProjectDir = vi.fn((projectDir?: string) => {
    this.projectDir = projectDir
    this.assets = [sessionAsset(projectDir ?? 'global')]
  })

  constructor(
    private projectDir: string | undefined,
    private assets: Asset[] = []
  ) {}

  getProjectDir(): string | undefined {
    return this.projectDir
  }

  getProjectScopeCandidates(): ProjectScopeCandidate[] {
    const candidate = this.projectDir
      ? createProjectScopeCandidate({ path: this.projectDir, source: 'current' })
      : null
    return candidate ? [candidate] : []
  }

  async getProjectCandidates(): Promise<ProjectScopeCandidate[]> {
    return this.getProjectScopeCandidates()
  }

  getScanResult() {
    return {
      assets: this.assets,
      stats,
      errors: []
    }
  }
}

function deps(current: FakeScanner): {
  deps: ProjectScopeRuntimeDeps
  restart: ReturnType<typeof vi.fn>
} {
  const restart = vi.fn(async () => {})

  return {
    deps: {
      getRuntime: () => current as never,
      getWatcher: () => ({ restart })
    },
    restart
  }
}

describe('activateProjectScope', () => {
  it('rebuilds scanner, search index, and watcher when switching to a project', async () => {
    const current = new FakeScanner(undefined)
    const runtime = deps(current)

    const result = await activateProjectScope('D:\\Code\\berth', runtime.deps)

    expect(current.setProjectDir).toHaveBeenCalledWith('D:/Code/berth')
    expect(current.refresh).toHaveBeenCalledWith({ reason: 'project-scope', wait: true })
    expect(runtime.restart).toHaveBeenCalledWith('D:/Code/berth')
    expect(result.projectDir).toBe('D:/Code/berth')
    expect(result.candidates[0]?.pathKey).toBe('d:/code/berth')
  })

  it('rescans without rebuilding watcher when the selected project is unchanged', async () => {
    const current = new FakeScanner('D:\\Code\\berth', [sessionAsset('D:\\Code\\berth')])
    const runtime = deps(current)

    await activateProjectScope('d:/code/berth/', runtime.deps)

    expect(current.setProjectDir).not.toHaveBeenCalled()
    expect(current.refresh).toHaveBeenCalledTimes(1)
    expect(runtime.restart).not.toHaveBeenCalled()
  })

  it('clears project scanner context when leaving project scope', async () => {
    const current = new FakeScanner('D:\\Code\\berth', [sessionAsset('D:\\Code\\berth')])
    const runtime = deps(current)

    const result = await activateProjectScope(undefined, runtime.deps)

    expect(current.setProjectDir).toHaveBeenCalledWith(undefined)
    expect(runtime.restart).toHaveBeenCalledWith(undefined)
    expect(result.projectDir).toBeUndefined()
  })
})
