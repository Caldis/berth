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

  post({
    type: 'progress',
    progress: { phase: 'discovering', current: 0, total: 3, label: 'assets' }
  })
  const scanResult = await scanner.scanAll()

  post({
    type: 'progress',
    progress: { phase: 'indexing', current: 2, total: 3, label: 'sources' }
  })
  const sources = await scanner.getScanSourceGroups()

  post({
    type: 'progress',
    progress: { phase: 'deriving', current: 3, total: 3, label: 'project candidates' }
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
