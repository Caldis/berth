// utilityProcess child entry — the scan executor (GH-135).
//
// Runs in a long-lived Electron utility process so scanning gets OS-level
// throttle (C2) + crash/memory isolation + a real `kill()`. Imports the
// electron-free engine scanner and uses `process.parentPort` (utilityProcess
// IPC), never `worker_threads` — that's why this entry lives in src/main, not
// the engine package (which must stay electron-free; its worker.ts stays for the
// CLI). The host (helper-host.ts) forks this and drives it with `scan` commands.
import { AssetScanner } from '@berth/scan-engine/engine/scanner'
import { AssetFileCache } from '@berth/scan-engine/engine/assets/file-cache'
import type { AssetWorkerData, AssetWorkerMessage } from '@berth/scan-engine/engine/assets/worker-host'

// Electron injects `process.parentPort` into a utilityProcess child; @types/node
// doesn't model it, so narrow to the minimal surface we use.
const parentPort = (process as unknown as {
  parentPort: {
    on(event: 'message', cb: (message: { data: unknown }) => void): void
    postMessage(message: unknown): void
  }
}).parentPort

function post(message: AssetWorkerMessage): void {
  parentPort.postMessage(message)
}

async function runScan(data: AssetWorkerData): Promise<void> {
  try {
    const scanner = new AssetScanner(data.projectDir, {
      sessionCache: AssetFileCache.fromSnapshot(data.sessionCache),
      projectScanCache: AssetFileCache.fromSnapshot(data.projectScanCache)
    })

    // Per-adapter progress + cumulative partials drive the live scan UI (P4.6).
    const scanResult = await scanner.scanAll({
      onProgress: (progress) => post({ type: 'progress', progress }),
      onPartial: (partial) => post({ type: 'partial', partial })
    })

    post({ type: 'progress', progress: { phase: 'indexing', current: 0, total: 1, label: 'sources' } })
    const sources = await scanner.getScanSourceGroups()

    post({ type: 'progress', progress: { phase: 'deriving', current: 0, total: 1, label: 'project candidates' } })
    const projectCandidates = scanner.getProjectScopeCandidates()

    post({
      type: 'done',
      result: {
        projectDir: scanner.getProjectDir(),
        scanResult,
        sources,
        projectCandidates,
        sessionCache: scanner.getSessionCacheSnapshot(),
        projectScanCache: scanner.getProjectScanCacheSnapshot()
      }
    })
  } catch (error) {
    post({
      type: 'error',
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      }
    })
  }
}

// Long-lived: the host posts one `{ type: 'scan', data }` per scan; this process
// stays alive between scans (unlike the one-shot worker_threads model), so the
// next scan reuses the warm process instead of paying a fresh fork each time.
parentPort.on('message', (event) => {
  const message = event.data as { type?: string; data?: AssetWorkerData }
  if (message?.type === 'scan' && message.data) {
    void runScan(message.data)
  }
})
