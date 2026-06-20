import { describe, expect, it, vi } from 'vitest'
import type { Asset } from '@shared/types/asset'
import type { ProjectScopeCandidate } from '@shared/scope'
import { createProjectScopeCandidate } from '@shared/scope'
import { activateProjectScope, type ProjectScopeRuntimeDeps } from '../../src/main/project-scope-runtime'

const stats = {
  skills: 0,
  mcpServers: 0,
  sessions: 1,
  plugins: 0,
  hooks: 0,
  commands: 0,
  subagents: 0,
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
  cached = false
  refresh = vi.fn(async (_opts: { reason: 'project-scope'; wait: boolean }) => {})
  hasSnapshotFor = vi.fn((_projectDir?: string) => this.cached)
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
  // GH-117 regression guard: a cache-miss activation MUST refresh in the
  // background (wait: false), never block the IPC on the deep rescan. The blocking
  // `wait: true` path measured a 10047ms spinner on a real ~/.claude (probe C,
  // 2026-06-11); it was removed in 2786c84c. The new project's deep (nested)
  // assets — which the global snapshot only shallow-indexes — land later via the
  // background scan's snapshot push (SWR), so activation can't be a pure
  // narrow-down filter without losing that depth. Do not flip this back to wait:true.
  it('switches to an uncached project and starts a background refresh without waiting', async () => {
    const current = new FakeScanner(undefined)
    const runtime = deps(current)

    const result = await activateProjectScope('D:\\Code\\berth', runtime.deps)

    expect(current.setProjectDir).toHaveBeenCalledWith('D:/Code/berth')
    expect(current.refresh).toHaveBeenCalledWith({ reason: 'project-scope', wait: false })
    expect(runtime.restart).toHaveBeenCalledWith('D:/Code/berth')
    expect(result.projectDir).toBe('D:/Code/berth')
    expect(result.candidates[0]?.pathKey).toBe('d:/code/berth')
  })

  it('does not rescan or rebuild watcher when the selected project is unchanged', async () => {
    const current = new FakeScanner('D:\\Code\\berth', [sessionAsset('D:\\Code\\berth')])
    const runtime = deps(current)

    await activateProjectScope('d:/code/berth/', runtime.deps)

    expect(current.setProjectDir).not.toHaveBeenCalled()
    expect(current.refresh).not.toHaveBeenCalled()
    expect(runtime.restart).not.toHaveBeenCalled()
  })

  it('serves a cached project snapshot instantly without rescanning', async () => {
    const current = new FakeScanner(undefined)
    current.cached = true
    const runtime = deps(current)

    await activateProjectScope('D:\\Code\\berth', runtime.deps)

    expect(current.setProjectDir).toHaveBeenCalledWith('D:/Code/berth')
    expect(current.refresh).not.toHaveBeenCalled() // cache hit → no rescan (sub-second switch)
    expect(runtime.restart).toHaveBeenCalledWith('D:/Code/berth') // watcher still rebinds
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
