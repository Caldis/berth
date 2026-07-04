import { afterEach, describe, expect, it, vi } from 'vitest'
import * as path from 'path'
import type { Asset } from '@shared/types/asset'
import type { ScanError } from '@shared/types/ipc'
import {
  BackgroundIndexQueue,
  type BackgroundIndexQueueDeps,
  type BackgroundIndexScanner
} from '@berth/scan-engine/engine/assets/background-index-queue'
import { createProjectScopeCandidate, type ProjectScopeCandidate } from '@shared/scope'

type DeepResult = { assets: Asset[]; errors: ScanError[] }

function cand(candidatePath: string, lastSeenAt?: string): ProjectScopeCandidate {
  return createProjectScopeCandidate({ path: candidatePath, source: 'session', lastSeenAt })!
}

function harness(
  overrides: Partial<BackgroundIndexQueueDeps> = {},
  scanner?: BackgroundIndexScanner
): {
  queue: BackgroundIndexQueue
  scanProjectDeep: ReturnType<typeof vi.fn>
  cancel: ReturnType<typeof vi.fn>
  commits: string[]
  deps: BackgroundIndexQueueDeps
} {
  const commits: string[] = []
  const scanProjectDeep = vi.fn(async (): Promise<DeepResult> => ({ assets: [], errors: [] }))
  const cancel = vi.fn()
  const resolvedScanner = scanner ?? { scanProjectDeep, cancel }
  const deps: BackgroundIndexQueueDeps = {
    getScanner: () => resolvedScanner,
    isForegroundBusy: () => false,
    isPaused: () => false,
    gatesOpen: () => true,
    scanOptions: () => ({ interProjectPauseMs: 0 }),
    commit: (root) => commits.push(root),
    onChange: vi.fn(),
    retryDelayMs: 1000,
    ...overrides
  }
  return { queue: new BackgroundIndexQueue(deps), scanProjectDeep, cancel, commits, deps }
}

const tail = (p: string): string => p.split(/[\\/]/).slice(-2).join('/')

afterEach(() => {
  vi.useRealTimers()
})

describe('BackgroundIndexQueue (GH-155 C4)', () => {
  it('scans most-recently-active first (决策④)', async () => {
    const { queue, commits } = harness()
    queue.sync([cand('/bg/old', '2026-01-01'), cand('/bg/new', '2026-06-01'), cand('/bg/mid', '2026-03-01')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(commits).toHaveLength(3))
    expect(commits.map(tail)).toEqual(['bg/new', 'bg/mid', 'bg/old'])
    expect(queue.status()).toMatchObject({ state: 'done', indexedProjects: 3, totalProjects: 3 })
  })

  it('counts the active project as indexed without scanning it', async () => {
    const { queue, commits, scanProjectDeep } = harness()
    queue.sync([cand('/bg/active', '2026-06-01'), cand('/bg/other', '2026-01-01')], '/bg/active')
    queue.kick()
    await vi.waitFor(() => expect(queue.status()?.state).toBe('done'))
    expect(commits.map(tail)).toEqual(['bg/other'])
    expect(scanProjectDeep).toHaveBeenCalledTimes(1)
    expect(queue.status()).toMatchObject({ indexedProjects: 2, totalProjects: 2 })
  })

  it('yields to a busy foreground and retries after the delay (A4)', async () => {
    vi.useFakeTimers()
    let busy = true
    const { queue, scanProjectDeep } = harness({ isForegroundBusy: () => busy })
    queue.sync([cand('/bg/p')], undefined)
    queue.kick()
    await vi.advanceTimersByTimeAsync(0)
    expect(scanProjectDeep).not.toHaveBeenCalled()

    busy = false
    await vi.advanceTimersByTimeAsync(999)
    expect(scanProjectDeep).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(scanProjectDeep).toHaveBeenCalledTimes(1)
  })

  it('respects closed idle/AC gates with the same retry (A5)', async () => {
    vi.useFakeTimers()
    let open = false
    const { queue, scanProjectDeep } = harness({ gatesOpen: () => open })
    queue.sync([cand('/bg/p')], undefined)
    queue.kick()
    await vi.advanceTimersByTimeAsync(0)
    expect(scanProjectDeep).not.toHaveBeenCalled()

    open = true
    await vi.advanceTimersByTimeAsync(1000)
    await vi.advanceTimersByTimeAsync(0)
    expect(scanProjectDeep).toHaveBeenCalledTimes(1)
  })

  it('pause freezes pumping and drops the in-flight result, keeping its spot (A5)', async () => {
    let release!: (value: DeepResult) => void
    const scanProjectDeep = vi.fn(() => new Promise<DeepResult>((resolve) => { release = resolve }))
    const { queue, commits } = harness({}, { scanProjectDeep, cancel: vi.fn() })
    queue.sync([cand('/bg/p')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(scanProjectDeep).toHaveBeenCalledTimes(1))

    queue.notifyPaused()
    release({ assets: [], errors: [] })
    await vi.waitFor(() => expect(queue.status()?.state).toBe('indexing')) // requeued, not committed
    expect(commits).toHaveLength(0)

    queue.kick() // resume: the project scans again (fresh promise)
    await vi.waitFor(() => expect(scanProjectDeep).toHaveBeenCalledTimes(2))
    release({ assets: [], errors: [] })
    await vi.waitFor(() => expect(commits).toHaveLength(1))
    expect(queue.status()?.state).toBe('done')
  })

  it('preemptForForeground cancels the in-flight scan and requeues the project (A4)', async () => {
    let reject!: (error: Error) => void
    const scanProjectDeep = vi.fn(() => new Promise<DeepResult>((_resolve, fail) => { reject = fail }))
    const cancel = vi.fn()
    const { queue, commits } = harness({}, { scanProjectDeep, cancel })
    queue.sync([cand('/bg/p')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(scanProjectDeep).toHaveBeenCalledTimes(1))

    queue.preemptForForeground()
    expect(cancel).toHaveBeenCalledTimes(1)
    reject(new Error('helper killed'))
    await vi.waitFor(() => expect(queue.status()?.state).toBe('indexing')) // requeued, NOT failed
    expect(commits).toHaveLength(0)
  })

  it('a failing project counts as processed (round converges); revalidation retries it', async () => {
    const scanProjectDeep = vi.fn()
      .mockRejectedValueOnce(new Error('project dir vanished'))
      .mockResolvedValue({ assets: [], errors: [] })
    const log = vi.fn()
    const { queue, commits } = harness({ log }, { scanProjectDeep })
    queue.sync([cand('/bg/flaky')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(queue.status()?.state).toBe('done'))
    expect(commits).toHaveLength(0)
    expect(log).toHaveBeenCalled()
    expect(queue.status()).toMatchObject({ indexedProjects: 1, totalProjects: 1 })

    // Settled queue + another commit sync → silent revalidation round retries it.
    queue.sync([cand('/bg/flaky')], undefined)
    expect(queue.status()?.state).toBe('revalidating')
    queue.kick()
    await vi.waitFor(() => expect(commits).toHaveLength(1))
    expect(queue.status()?.state).toBe('done')
  })

  it('a scanner without scanProjectDeep marks the queue unsupported (worker/CLI)', async () => {
    const { queue } = harness({}, {})
    queue.sync([cand('/bg/p')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(queue.status()?.state).toBe('unsupported'))
  })

  it('a new project discovered during revalidation flips the state back to indexing', async () => {
    const { queue, commits } = harness()
    queue.sync([cand('/bg/a')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(queue.status()?.state).toBe('done'))

    queue.sync([cand('/bg/a')], undefined) // revalidation round
    expect(queue.status()?.state).toBe('revalidating')
    queue.sync([cand('/bg/fresh', '2026-06-01')], undefined) // brand-new root
    expect(queue.status()).toMatchObject({ state: 'indexing', indexedProjects: 1, totalProjects: 2 })
    queue.kick()
    await vi.waitFor(() => expect(queue.status()?.state).toBe('done'))
    // Round 1 committed a; the mixed round runs fresh (recent) before a's revalidation.
    expect(commits.map(tail)).toEqual(['bg/a', 'bg/fresh', 'bg/a'])
  })

  it('applies inter-project backpressure between scans (A11)', async () => {
    vi.useFakeTimers()
    const { queue, scanProjectDeep } = harness({
      scanOptions: () => ({ interProjectPauseMs: 500 })
    })
    queue.sync([cand('/bg/a', '2026-06-01'), cand('/bg/b', '2026-01-01')], undefined)
    queue.kick()
    await vi.advanceTimersByTimeAsync(0)
    expect(scanProjectDeep).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(499)
    expect(scanProjectDeep).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(1)
    await vi.advanceTimersByTimeAsync(0)
    expect(scanProjectDeep).toHaveBeenCalledTimes(2)
  })

  it('dedupes candidates sharing one repo root and keeps the newest lastSeenAt', async () => {
    const repo = path.resolve(process.cwd()) // a real repo root with .git
    const { queue, commits } = harness()
    queue.sync([cand(repo, '2026-01-01'), cand(path.join(repo, 'src'), '2026-06-01')], undefined)
    queue.kick()
    await vi.waitFor(() => expect(queue.status()?.state).toBe('done'))
    expect(commits).toHaveLength(1) // one root, one scan
    expect(queue.status()).toMatchObject({ indexedProjects: 1, totalProjects: 1 })
  })
})
