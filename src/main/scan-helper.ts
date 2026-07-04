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
import { scanProjectDeep } from '@berth/scan-engine/engine/project-deep-scan'
import type { Asset } from '@berth/scan-engine/shared/types/asset'
import {
  scanOptionsFromWorkerData,
  type AssetWorkerData
} from '@berth/scan-engine/engine/assets/worker-host'
// Type-only: the host owns the deep-scan protocol shapes; erased at compile so
// this electron-importing module never lands in the child bundle.
import type { ProjectDeepScanRequest, ScanHelperChildMessage } from './helper-host'

// Electron injects `process.parentPort` into a utilityProcess child; @types/node
// doesn't model it, so narrow to the minimal surface we use.
const parentPort = (process as unknown as {
  parentPort: {
    on(event: 'message', cb: (message: { data: unknown }) => void): void
    postMessage(message: unknown): void
  }
}).parentPort

function post(message: ScanHelperChildMessage): void {
  parentPort.postMessage(message)
}

async function runScan(data: AssetWorkerData): Promise<void> {
  try {
    const scanner = new AssetScanner(data.projectDir, {
      sessionCache: AssetFileCache.fromSnapshot(data.sessionCache),
      projectScanCache: AssetFileCache.fromSnapshot(data.projectScanCache)
    })

    // Per-adapter progress + cumulative partials drive the live scan UI (P4.6).
    const scanResult = await scanner.scanAll(
      scanOptionsFromWorkerData(data, {
        onProgress: (progress) => post({ type: 'progress', progress }),
        onPartial: (partial) => post({ type: 'partial', partial })
      })
    )

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

// GH-141: keep the utilityProcess child alive between scans. In a *packaged* app the
// child exits as soon as the script finishes (Electron #42978) — `parentPort.on`
// alone does NOT ref the event loop there (dev does, which is why this only bit
// production). A long no-op interval refs the loop so the helper is truly long-lived;
// the host's `kill()` (cancel / before-quit) still terminates the process outright.
// Without this, the child exits code 0 right after posting `done`, racing the host's
// done-handler → onExit reject → scan-history ok=0.
setInterval(() => {}, 2_147_483_647)

/** GH-155 C3: deep-scan one non-active project. Synchronous engine call; the
 * host serializes requests so this never interleaves with a full scan. */
function runProjectDeepScan(data: ProjectDeepScanRequest): void {
  try {
    const cache = AssetFileCache.fromSnapshot<Asset[]>(data.projectScanCache)
    const { assets, errors } = scanProjectDeep(data.projectRoot, cache, {
      excludePaths: data.excludePaths,
      respectGitignore: data.respectGitignore
    })
    post({
      type: 'project-deep-done',
      result: { assets, errors, projectScanCache: cache.toSnapshot() }
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
  const message = event.data as { type?: string; data?: unknown }
  if (message?.type === 'scan' && message.data) {
    void runScan(message.data as AssetWorkerData)
    return
  }
  if (message?.type === 'scan-project-deep' && message.data) {
    runProjectDeepScan(message.data as ProjectDeepScanRequest)
  }
})
