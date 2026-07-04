import { getMainLog } from '@berth/scan-engine/log'

// GH-152 T4: rule-8 accounting for the read-only IPC domains (memory /
// agent-teams). Their tolerance semantics stay intact — a corrupt file is still
// skipped/degraded, never thrown — but the failure now leaves a trace in
// userData/logs instead of silently presenting as "not installed / no teams".

const loggedKeys = new Set<string>()

/** ENOENT/ENOTDIR = the probed file or directory simply isn't there — the
 * domains' normal "absent" case (source not installed, note deleted), not a
 * defect worth a log line. */
export function isFileMissingError(err: unknown): boolean {
  const code = (err as NodeJS.ErrnoException | null)?.code
  return code === 'ENOENT' || code === 'ENOTDIR'
}

/** Log a parse/read failure once per `scope:key` for the process lifetime — a
 * corrupt file is re-read on every IPC list and would otherwise spam the log. */
export function logDomainFailureOnce(scope: string, key: string, err: unknown): void {
  const dedupeKey = `${scope}:${key}`
  if (loggedKeys.has(dedupeKey)) return
  loggedKeys.add(dedupeKey)
  const detail = err instanceof Error ? (err.stack ?? `${err.name}: ${err.message}`) : String(err)
  getMainLog().log(scope, `${key} :: ${detail}`)
}

/** Dedupe is process-lifetime by design; tests reset between cases. */
export function resetDomainFailureLogForTests(): void {
  loggedKeys.clear()
}
