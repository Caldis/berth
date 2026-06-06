import { parentPort, workerData } from 'worker_threads'
import type { AssetWorkerData, AssetWorkerMessage } from './worker-host'
import { AssetScanner } from '../scanner'
import { AssetFileCache } from './file-cache'

function post(message: AssetWorkerMessage): void {
  parentPort?.postMessage(message)
}

async function run(): Promise<void> {
  const data = workerData as AssetWorkerData
  const scanner = new AssetScanner(data.projectDir, {
    sessionCache: AssetFileCache.fromSnapshot(data.sessionCache)
  })

  // Per-adapter progress + cumulative partials drive the live scan UI (P4.6);
  // sources/candidates derivation reports its own coarse phases afterwards.
  const scanResult = await scanner.scanAll({
    onProgress: (progress) => post({ type: 'progress', progress }),
    onPartial: (partial) => post({ type: 'partial', partial })
  })

  post({
    type: 'progress',
    progress: { phase: 'indexing', current: 0, total: 1, label: 'sources' }
  })
  const sources = await scanner.getScanSourceGroups()

  post({
    type: 'progress',
    progress: { phase: 'deriving', current: 0, total: 1, label: 'project candidates' }
  })
  const projectCandidates = scanner.getProjectScopeCandidates()

  post({
    type: 'done',
    result: {
      projectDir: scanner.getProjectDir(),
      scanResult,
      sources,
      projectCandidates,
      sessionCache: scanner.getSessionCacheSnapshot()
    }
  })
}

void run().catch((error) => {
  post({
    type: 'error',
    error: {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }
  })
})
